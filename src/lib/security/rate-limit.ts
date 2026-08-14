type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

/**
 * Process-local fixed window. Enough for a single app container; not a
 * substitute for an edge/WAF limit if you scale out.
 */
export function consumeRateLimit(
  key: string,
  max: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
  if (bucket.timestamps.length >= max) {
    buckets.set(key, bucket);
    return false;
  }
  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return true;
}

export function assertRateLimit(key: string, max: number, windowMs: number) {
  if (!consumeRateLimit(key, max, windowMs)) {
    throw new Error("Too many attempts, try again shortly");
  }
}
