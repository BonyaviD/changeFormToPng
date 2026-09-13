// Defense in depth on each runtime instance. Vercel WAF/rate limiting should be
// used for a shared limit across regions and horizontally scaled instances.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; reset: number }>();

export function takeLoginAttempt(key: string, now = Date.now()): boolean {
  for (const [id, entry] of attempts) if (entry.reset <= now) attempts.delete(id);
  const entry = attempts.get(key);
  if (entry) {
    if (entry.count >= MAX_ATTEMPTS) return false;
    entry.count++;
    return true;
  }
  // Do not let arbitrary IP values grow memory without a bound.
  if (attempts.size >= 10000) return false;
  attempts.set(key, { count: 1, reset: now + WINDOW_MS });
  return true;
}

export function clearLoginAttempts(key: string) { attempts.delete(key); }
