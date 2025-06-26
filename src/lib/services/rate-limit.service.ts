interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimitService {
  private store: Map<string, RateLimitEntry>;
  private config: RateLimitConfig;
  private lastCleanup: number;

  constructor(config: RateLimitConfig) {
    this.store = new Map();
    this.config = config;
    this.lastCleanup = Date.now();

    // Remove setInterval - Cloudflare Workers don't allow it in global scope
    // Instead, we'll do lazy cleanup during checkRateLimit calls
  }

  async checkRateLimit(userId: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }> {
    const now = Date.now();

    // Lazy cleanup - run cleanup every 5 minutes max
    if (now - this.lastCleanup > 5 * 60 * 1000) {
      this.cleanup();
      this.lastCleanup = now;
    }

    const entry = this.store.get(userId);

    if (!entry || entry.resetAt <= now) {
      // First request or window expired
      this.store.set(userId, {
        count: 1,
        resetAt: now + this.config.windowMs,
      });
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt: now + this.config.windowMs,
      };
    }

    if (entry.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    // Increment counter
    entry.count++;
    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [userId, entry] of this.store.entries()) {
      if (entry.resetAt <= now) {
        this.store.delete(userId);
      }
    }
  }
}

// Create singleton instance with 10 requests per 10 minutes per user
export const rateLimitService = new RateLimitService({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 10,
});
