import { redis } from "@/lib/redis";

export interface RateLimitOptions {
  /** Namespace used to build the key (e.g. "admin/settings"). */
  namespace: string;
  /** Max allowed requests per window. */
  limit?: number;
  /** Window length in milliseconds. */
  windowMs?: number;
  /** Explicit identifier (user id). Defaults to client IP. */
  key?: string;
  /** Redis key prefix. */
  prefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

interface MemoryBucket {
  count: number;
  resetAt: number;
}

/** In-memory fallback used when Redis is unavailable. */
const memory = new Map<string, MemoryBucket>();

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 60;

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

function now(): number {
  return Date.now();
}

export async function checkRateLimit(
  req: Request,
  opts: RateLimitOptions
): Promise<RateLimitResult> {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const identity = opts.key ?? getClientIp(req);
  const rk = `${opts.prefix ?? "rate"}:${opts.namespace}:${identity}`;
  const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000));

  try {
    if (redis.status === "ready") {
      const count = await redis.incr(rk);
      const ttl = await redis.ttl(rk);
      if (count === 1 || ttl < 0) {
        await redis.expire(rk, ttlSeconds);
      }
      const resetAt = now() + Math.max(1, ttlSeconds * 1000);
      return {
        allowed: count <= limit,
        limit,
        remaining: Math.max(0, limit - count),
        resetAt,
      };
    }
  } catch {
    // fall through to the in-memory bucket
  }

  const bucket = memory.get(rk);
  const current = now();
  if (!bucket || bucket.resetAt <= current) {
    const fresh: MemoryBucket = { count: 1, resetAt: current + windowMs };
    memory.set(rk, fresh);
    return { allowed: 1 <= limit, limit, remaining: Math.max(0, limit - 1), resetAt: fresh.resetAt };
  }
  bucket.count += 1;
  if (bucket.count > 10000) {
    clearExpiredBuckets();
  }
  return {
    allowed: bucket.count <= limit,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

function clearExpiredBuckets(): void {
  const current = now();
  for (const [key, bucket] of memory) {
    if (bucket.resetAt <= current) memory.delete(key);
  }
}

/** Convenience: admin mutation endpoints default to a stricter budget. */
export const adminRateLimit = (req: Request, limit = 30, windowMs = 60_000) =>
  checkRateLimit(req, { namespace: "admin", limit, windowMs });