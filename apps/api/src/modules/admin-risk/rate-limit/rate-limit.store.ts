export const RATE_LIMIT_STORE = 'RATE_LIMIT_STORE';

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export interface RateLimitStore {
  consume(
    key: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<RateLimitResult>;
}

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<
    string,
    { count: number; resetAt: number }
  >();

  consume(
    key: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      const resetAt = now + windowMs;
      this.buckets.set(key, { count: 1, resetAt });
      return Promise.resolve({
        allowed: true,
        remaining: maxRequests - 1,
        resetAt,
      });
    }

    if (bucket.count >= maxRequests) {
      return Promise.resolve({
        allowed: false,
        remaining: 0,
        resetAt: bucket.resetAt,
      });
    }

    bucket.count += 1;
    return Promise.resolve({
      allowed: true,
      remaining: maxRequests - bucket.count,
      resetAt: bucket.resetAt,
    });
  }
}

type RedisClient = {
  eval(script: string, numKeys: number, ...args: string[]): Promise<number>;
  connect(): Promise<void>;
  quit(): Promise<void>;
};

export class RedisRateLimitStore implements RateLimitStore {
  private client: RedisClient | null = null;
  private connecting: Promise<void> | null = null;

  constructor(private readonly redisUrl: string) {}

  private async getClient(): Promise<RedisClient> {
    if (this.client) {
      return this.client;
    }
    if (!this.connecting) {
      this.connecting = (async () => {
        const { createClient } = await import('redis');
        const client = createClient({ url: this.redisUrl });
        await client.connect();
        this.client = client as unknown as RedisClient;
      })();
    }
    await this.connecting;
    return this.client!;
  }

  async consume(
    key: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    const client = await this.getClient();
    const now = Date.now();
    const windowKey = `admin:ratelimit:${key}`;
    const ttlMs = windowMs;

    const script = `
      local current = redis.call('INCR', KEYS[1])
      if current == 1 then
        redis.call('PEXPIRE', KEYS[1], ARGV[2])
      end
      return current
    `;

    const count = await client.eval(
      script,
      1,
      windowKey,
      String(maxRequests),
      String(ttlMs),
    );
    const allowed = count <= maxRequests;
    return {
      allowed,
      remaining: Math.max(0, maxRequests - count),
      resetAt: now + ttlMs,
    };
  }
}

export function createRateLimitStore(redisUrl?: string): RateLimitStore {
  if (redisUrl) {
    return new RedisRateLimitStore(redisUrl);
  }
  return new InMemoryRateLimitStore();
}
