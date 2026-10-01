import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";

import { NextRequest } from "next/server";

import { POST } from "../src/app/api/auth/login/route";
import { hashPassword } from "../src/lib/auth/core";

const origin = "http://localhost:3000";

function attempt(password: string) {
  return POST(new NextRequest(`${origin}/api/auth/login`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: "operator", password, next: "/history" }).toString(),
  }));
}

test("too many attempts return to the login form with an explanation", async () => {
  process.env.SARA_AUTH_USERNAME = "operator";
  process.env.SARA_AUTH_PASSWORD_HASH = await hashPassword("the-right-password");
  process.env.SARA_SESSION_SECRET = randomBytes(32).toString("base64url");

  for (let i = 0; i < 10; i++) {
    const response = await attempt("wrong-password");
    assert.equal(response.status, 303);
    assert.equal(new URL(response.headers.get("location")!).searchParams.get("error"), "invalid");
  }

  // Even the right password waits out the window.
  const limited = await attempt("the-right-password");
  assert.equal(limited.status, 303);
  const location = new URL(limited.headers.get("location")!);
  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("error"), "limited");
  assert.equal(location.searchParams.get("next"), "/history");
  assert.equal(limited.headers.get("retry-after"), "900");
  assert.equal(limited.headers.get("set-cookie"), null);
  assert.match(limited.headers.get("cache-control") ?? "", /no-store/);
});
