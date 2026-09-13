import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// Sliding inactivity window. The cookie is renewed by a real page visit or an
// activity request, never by passive session checks in an abandoned tab.
export const SESSION_SECONDS = 10 * 24 * 60 * 60;
export const SCRYPT_OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export interface AuthConfig {
  username: string;
  passwordHash: string;
  secret: string;
}

export function getAuthConfig(): AuthConfig | null {
  const username = process.env.SARA_AUTH_USERNAME;
  const passwordHash = process.env.SARA_AUTH_PASSWORD_HASH;
  const secret = process.env.SARA_SESSION_SECRET;
  if (!username || !passwordHash || !secret || secret.length < 43) return null;
  if (!/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(passwordHash)) return null;
  return { username, passwordHash, secret };
}

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, SCRYPT_OPTIONS, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${(await derive(password, salt)).toString("hex")}`;
}

export async function verifyCredentials(
  username: string, password: string, config: AuthConfig,
): Promise<boolean> {
  if (username.length > 128 || password.length > 256) return false;
  const [, salt, expected] = config.passwordHash.split("$");
  const actual = await derive(password, salt);
  // Do the same password work for unknown usernames; never reveal which field
  // was incorrect. The configured hash is validated before this is called.
  const passwordMatches = timingSafeEqual(actual, Buffer.from(expected, "hex"));
  const digest = (value: string) => createHmac("sha256", config.secret).update(value).digest();
  const usernameMatches = timingSafeEqual(digest(username), digest(config.username));
  return usernameMatches && passwordMatches;
}

function mac(payload: string, config: AuthConfig): Buffer {
  // Changing either credential or the session key invalidates all old cookies.
  return createHmac("sha256", config.secret)
    .update(JSON.stringify(["sara-session-v1", config.username, config.passwordHash, payload]))
    .digest();
}

export function createSession(config: AuthConfig, now = Date.now()): string {
  const issued = Math.floor(now / 1000);
  const payload = Buffer.from(JSON.stringify({
    v: 1, sub: config.username, iat: issued, exp: issued + SESSION_SECONDS,
    nonce: randomBytes(16).toString("base64url"),
  })).toString("base64url");
  return `${payload}.${mac(payload, config).toString("base64url")}`;
}

export function verifySession(token: string | undefined, config: AuthConfig | null, now = Date.now()): boolean {
  if (!token || !config || token.length > 1024) return false;
  try {
    const pieces = token.split(".");
    if (pieces.length !== 2 || pieces.some((part) => !/^[\w-]+$/.test(part))) return false;
    const [payload, signature] = pieces;
    const received = Buffer.from(signature, "base64url");
    const expected = mac(payload, config);
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const seconds = Math.floor(now / 1000);
    return session.v === 1 && session.sub === config.username &&
      Number.isInteger(session.iat) && Number.isInteger(session.exp) &&
      session.iat <= seconds && session.exp > seconds &&
      session.exp - session.iat === SESSION_SECONDS &&
      typeof session.nonce === "string";
  } catch { return false; }
}

export function sessionCookieName(): string {
  return process.env.NODE_ENV === "production" ? "__Host-sara-session" : "sara-session";
}

export function safeReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return "/";
  try {
    const url = new URL(value, "https://sara.invalid");
    // Only application pages are return destinations, never auth endpoints,
    // assets, or an external URL (including encoded URL tricks).
    if (url.origin !== "https://sara.invalid" || !["/", "/bulk", "/history", "/settings", "/verify"].includes(url.pathname)) return "/";
    return url.pathname + url.search;
  } catch { return "/"; }
}
