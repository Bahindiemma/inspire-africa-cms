/**
 * Tiny in-memory token-bucket rate limiter. The deployment is a single
 * CMS instance, so a process-local map is sufficient; if this ever scales
 * horizontally, swap the store for Redis. Keyed by ipHash so we never key
 * on raw PII.
 */
interface Bucket {
  tokens: number;
  ts: number;
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 20000;

/**
 * @param key      ipHash (or any stable identifier)
 * @param ratePerMin sustained requests/minute allowed
 * @param burst    bucket capacity (max instantaneous burst)
 */
export function allow(key: string, ratePerMin = 120, burst = 60): boolean {
  if (!key) return true; // can't rate-limit without a key; fail open
  const now = Date.now();
  const refillPerMs = ratePerMin / 60000;

  // Cheap eviction to bound memory.
  if (buckets.size > MAX_KEYS) buckets.clear();

  let b = buckets.get(key);
  if (!b) {
    b = { tokens: burst, ts: now };
    buckets.set(key, b);
  }
  b.tokens = Math.min(burst, b.tokens + (now - b.ts) * refillPerMs);
  b.ts = now;

  if (b.tokens < 1) return false;
  b.tokens -= 1;
  return true;
}
