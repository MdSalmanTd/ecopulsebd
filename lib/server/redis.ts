import "server-only";

/** The connected client (inferred from connect(), which uses the default modules/RESP 3). */
type RedisClient = NonNullable<Awaited<ReturnType<typeof connect>>>;

interface MemEntry {
  count: number;
  /** Window end, ms since epoch. */
  reset: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
}

/*
 * Redis for rate limiting.
 *  - REDIS_URL set   → shared limits across all server instances (Upstash, Redis Cloud, local, …).
 *  - REDIS_URL unset → in-memory fallback (fine for one dev server; resets on restart).
 */

const g = globalThis as typeof globalThis & {
  __ecopulseRedis?: Promise<RedisClient | null>;
  __ecopulseMemLimits?: Map<string, MemEntry>;
};

async function connect() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const { createClient } = await import("redis");
  const client = createClient({
    url,
    socket: { reconnectStrategy: (retries: number) => Math.min(retries * 200, 5000) },
  });
  client.on("error", (e: Error) => console.error("[redis]", e.message));
  await client.connect();
  if (process.env.NODE_ENV !== "production") console.log("[redis] connected");
  return client;
}

function getClient(): Promise<RedisClient | null> {
  if (g.__ecopulseRedis === undefined) {
    g.__ecopulseRedis = connect().catch((e: Error) => {
      console.error("[redis] could not connect, using in-memory limits:", e.message);
      g.__ecopulseRedis = undefined; // retry later
      return null;
    });
  }
  return g.__ecopulseRedis;
}

// ---- in-memory fallback ----
const mem = g.__ecopulseMemLimits ?? (g.__ecopulseMemLimits = new Map());
function memIncr(key: string, windowSec: number): { count: number; ttl: number } {
  const now = Date.now();
  let e = mem.get(key);
  if (!e || e.reset <= now) {
    e = { count: 0, reset: now + windowSec * 1000 };
    mem.set(key, e);
  }
  e.count++;
  if (mem.size > 10000) for (const [k, v] of mem) if (v.reset <= now) mem.delete(k);
  return { count: e.count, ttl: Math.ceil((e.reset - now) / 1000) };
}

/**
 * Fixed-window rate limit. Returns { ok, remaining, retryAfter (seconds) }.
 * Fails open (allows the request) if Redis is temporarily unreachable.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const k = `rl:${key}`;
  let count: number, ttl: number;
  const client = await getClient();
  if (client?.isReady) {
    try {
      count = await client.incr(k);
      if (count === 1) await client.expire(k, windowSec);
      ttl = await client.ttl(k);
      if (ttl < 0) {
        // key somehow lost its expiry — set it again so it can't block forever
        await client.expire(k, windowSec);
        ttl = windowSec;
      }
    } catch (e) {
      console.error("[redis] rate limit failed:", e instanceof Error ? e.message : e);
      return { ok: true, remaining: limit, retryAfter: 0 };
    }
  } else {
    ({ count, ttl } = memIncr(k, windowSec));
  }
  return { ok: count <= limit, remaining: Math.max(0, limit - count), retryAfter: ttl > 0 ? ttl : windowSec };
}

/** Clears a limit (e.g. after a successful sign-in). */
export async function resetLimit(key: string): Promise<void> {
  const k = `rl:${key}`;
  mem.delete(k);
  const client = await getClient();
  if (client?.isReady) await client.del(k).catch(() => {});
}

export async function redisStatus(): Promise<"memory" | "redis" | "unavailable"> {
  if (!process.env.REDIS_URL) return "memory";
  const client = await getClient();
  if (!client?.isReady) return "unavailable";
  try {
    return (await client.ping()) === "PONG" ? "redis" : "unavailable";
  } catch {
    return "unavailable";
  }
}

/** Formats seconds as "5 minutes" / "40 seconds". */
export function waitText(sec: number): string {
  return sec >= 90 ? `${Math.ceil(sec / 60)} minutes` : `${sec} seconds`;
}
