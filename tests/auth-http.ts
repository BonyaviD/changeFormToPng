import assert from "node:assert/strict";
import { loadEnvConfig } from "@next/env";
import { createSession, getAuthConfig, SESSION_SECONDS } from "../src/lib/auth/core";

async function main() {
  loadEnvConfig(process.cwd());
  const config = getAuthConfig();
  assert.ok(config, "test requires server credentials");
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  const { password } = JSON.parse(input);
  const base = process.env.AUTH_TEST_URL || "http://localhost:3100";
  const origin = new URL(base).origin;
  const request = (path: string, init: RequestInit = {}) => fetch(base + path, { ...init, redirect: "manual" });
  const login = (username: string, pass: string, next = "/settings", requestOrigin = origin) => request("/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: requestOrigin },
    body: new URLSearchParams({ username, password: pass, next }),
  });
  const page = await request("/login");
  assert.equal(page.status, 200);
  const loginHtml = await page.text();
  assert.ok(!loginHtml.includes("/_next/") && !loginHtml.includes("<script"));
  assert.ok(!loginHtml.includes(password));
  for (const path of ["/", "/bulk", "/settings", "/history", "/verify", "/templates/halal-training/frame.png", "/favicon.ico", "/_next/static/unknown.js", "/api/auth/session"]) {
    assert.equal((await request(path)).status, 401, `unauthenticated ${path}`);
  }
  const redirect = await request("/settings", { headers: { Accept: "text/html" } });
  assert.equal(redirect.status, 307);
  assert.ok(redirect.headers.get("location")?.includes("/login"));
  const forged = await request("/settings", { headers: { Cookie: "__Host-sara-session=true; sara-session=true", "x-middleware-subrequest": "src/proxy:src/proxy:src/proxy:src/proxy:src/proxy" } });
  assert.equal(forged.status, 401);
  assert.equal((await login(config.username, password, "/", "https://other.example")).status, 403);
  const rejected = await login(config.username, "incorrect-test-password");
  assert.equal(rejected.status, 303);
  assert.ok(!rejected.headers.get("set-cookie"));
  assert.ok(rejected.headers.get("location")?.includes("error=invalid"));

  const accepted = await login(config.username, password, "//other.example");
  assert.equal(accepted.status, 303);
  assert.equal(new URL(accepted.headers.get("location")!).origin, origin);
  const setCookie = accepted.headers.get("set-cookie")!;
  assert.ok(setCookie && /HttpOnly/i.test(setCookie) && /SameSite=strict/i.test(setCookie));
  assert.ok(/Max-Age=864000/i.test(setCookie));
  assert.ok(/Secure/i.test(setCookie), "production cookie must be secure");
  const cookie = setCookie.split(";")[0];
  const cookieName = cookie.split("=")[0];
  assert.equal(cookieName, "__Host-sara-session");
  const headers = { Cookie: cookie };
  let home = "";
  for (const path of ["/", "/bulk", "/history", "/settings", "/verify"]) {
    const response = await request(path, { headers });
    assert.equal(response.status, 200, `authenticated ${path}`);
    assert.ok(response.headers.get("cache-control")?.includes("no-store"));
    const text = await response.text();
    assert.ok(!text.includes(password) && !text.includes(config.secret) && !text.includes(config.passwordHash));
    if (path === "/") home = text;
  }
  const paths = [...new Set([...home.matchAll(/(?:src|href)="([^"?]*\/_next\/static\/[^"?]+)(?:\?[^"\s]*)?"/g)].map((m) => m[1]))];
  assert.ok(paths.length > 0, "app assets discovered");
  for (const path of paths) {
    assert.equal((await request(path)).status, 401, `guard asset ${path}`);
    const resource = await request(path, { headers });
    assert.equal(resource.status, 200, `authenticated asset ${path}`);
    if (/\.(js|css)$/.test(path)) {
      const text = await resource.text();
      assert.ok(!text.includes(password) && !text.includes(config.secret) && !text.includes(config.passwordHash), "no secrets in client code");
    }
  }
  assert.equal((await request("/templates/halal-training/frame.png", { headers })).status, 200);
  assert.equal((await request("/templates/halal-training/signature-rastegar.png", { headers })).status, 404);
  const passive = await request("/api/auth/session", { headers });
  assert.equal(passive.status, 200);
  assert.ok(!passive.headers.get("set-cookie"), "passive polling must not renew idle sessions");
  const active = await request("/api/auth/session", { method: "POST", headers: { ...headers, Origin: origin } });
  assert.equal(active.status, 204);
  assert.ok(active.headers.get("set-cookie")?.includes("Max-Age=864000"));
  const expired = createSession(config, Date.now() - SESSION_SECONDS * 1000 - 1000);
  assert.equal((await request("/settings", { headers: { Cookie: `${cookieName}=${expired}` } })).status, 401);
  assert.equal((await request("/api/auth/session", { method: "POST", headers: { Cookie: `${cookieName}=${expired}`, Origin: origin } })).status, 401);
  assert.equal((await request("/api/auth/logout", { method: "POST", headers: { ...headers, Origin: "https://other.example" } })).status, 403);
  const logout = await request("/api/auth/logout", { method: "POST", headers: { ...headers, Origin: origin } });
  assert.equal(logout.status, 303);
  assert.ok(logout.headers.get("set-cookie")?.includes("Max-Age=0"));
  assert.equal((await request("/settings")).status, 401);
  console.log(`PASS: auth, redirects, CSRF, protected pages, ${paths.length} protected assets, no client secrets, 10-day expiry/renewal and logout.`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Auth HTTP test failed"); process.exitCode = 1; });
