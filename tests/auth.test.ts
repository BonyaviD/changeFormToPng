import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createSession, getAuthConfig, hashPassword, safeReturnPath, SESSION_SECONDS, verifyCredentials, verifySession } from "../src/lib/auth/core";
import { takeLoginAttempt } from "../src/lib/auth/rate-limit";
import { loginPage } from "../src/lib/auth/login-page";

test("passwords are salted, hashed and verified without username disclosure", async () => {
  const password = randomBytes(18).toString("base64url");
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  const config = { username: "Operator", passwordHash: first, secret: randomBytes(32).toString("base64url") };
  assert.equal(await verifyCredentials("Operator", password, config), true);
  assert.equal(await verifyCredentials("Other", password, config), false);
  assert.equal(await verifyCredentials("Operator", "wrong-password", config), false);
});

test("ten-day idle window, renewal and expiry cannot be changed by a client", async () => {
  const now = Date.now();
  const day = 86400000;
  const config = { username: "Operator", passwordHash: await hashPassword("test-password-only"), secret: randomBytes(32).toString("base64url") };
  const token = createSession(config, now);
  assert.equal(SESSION_SECONDS, 864000);
  assert.equal(verifySession(token, config, now + 9 * day), true);
  assert.equal(verifySession(token, config, now + 10 * day), false);
  const renewed = createSession(config, now + 9 * day);
  assert.equal(verifySession(renewed, config, now + 18 * day), true);
  assert.equal(verifySession(renewed, config, now + 19 * day), false);
  const [payload, signature] = token.split(".");
  const modified = JSON.parse(Buffer.from(payload, "base64url").toString());
  modified.exp += day;
  assert.equal(verifySession(Buffer.from(JSON.stringify(modified)).toString("base64url") + "." + signature, config), false);
  assert.equal(verifySession(token, { ...config, secret: "changed" }), false);
  assert.equal(verifySession(token, { ...config, passwordHash: "changed" }), false);
  assert.equal(verifySession(token, { ...config, username: "Other" }), false);
  for (const bad of [undefined, "", "true", "{}", "x.y.z", "a.b", "x".repeat(2048)]) assert.equal(verifySession(bad, config), false);
  assert.equal(verifySession(token, null), false);
});

test("return destinations cannot leave the site or enter internal endpoints", () => {
  for (const path of ["https://evil.example", "//evil.example", "/\\evil.example", "/%2f%2fevil.example", "/api/auth/logout", "/login", "/_next/test", "/settings\r\n"]) {
    assert.equal(safeReturnPath(path), "/");
  }
  assert.equal(safeReturnPath("/history?search=sample"), "/history?search=sample");
});

test("login HTML escapes input and limits the password toggle to a nonce", () => {
  const html = loginPage('/?x="/><script>alert(1)</script>', "invalid", true, "test-nonce");
  assert.equal(html.includes("<script>"), false);
  assert.equal(html.includes('<script nonce="test-nonce">'), true);
  assert.equal(html.includes("/_next/"), false);
  assert.equal(html.includes('type="password"'), true);
  assert.equal(html.includes('id="toggle-password"'), true);
  assert.equal(html.includes('id="toggle-password-label"'), false);
  assert.equal(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), true);
  assert.equal(loginPage("/", "", false, "test-nonce").includes(" disabled"), true);
});

test("failed-attempt limiter rejects bursts and expires", () => {
  const key = randomBytes(8).toString("hex");
  for (let i = 0; i < 10; i++) assert.equal(takeLoginAttempt(key, 1000), true);
  assert.equal(takeLoginAttempt(key, 1001), false);
  assert.equal(takeLoginAttempt(key, 1000 + 900000), true);
});

test("absent server secrets fail closed", () => {
  const old = process.env.SARA_SESSION_SECRET;
  delete process.env.SARA_SESSION_SECRET;
  assert.equal(getAuthConfig(), null);
  if (old) process.env.SARA_SESSION_SECRET = old;
});
