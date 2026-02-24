/**
 * Rate Limiting for LLM Requests
 *
 * Prevents abuse and excessive API usage through token bucket
 * rate limiting with configurable limits.
 */

// =============================================================================
// Types
// =============================================================================

export interface RateLimiterConfig {
  /** Maximum requests allowed in the time window */
  maxRequests: number
  /** Time window in milliseconds */
  windowMs: number
  /** Minimum time between requests in milliseconds */
  minIntervalMs?: number
}

export interface RateLimitStatus {
  /** Whether a request can be made now */
  allowed: boolean
  /** Remaining requests in current window */
  remaining: number
  /** Time until window resets (ms) */
  resetIn: number
  /** Time until next request allowed (ms, considering minInterval) */
  retryAfter: number
}

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default rate limits for different use cases.
 */
export const DEFAULT_LIMITS = {
  /** Standard generation requests */
  GENERATION: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    minIntervalMs: 500,   // 500ms between requests
  },
  /** Line-by-line translation (higher frequency) */
  TRANSLATION: {
    maxRequests: 60,
    windowMs: 60 * 1000,
    minIntervalMs: 200,
  },
  /** Expensive operations (e.g., thinking model) */
  EXPENSIVE: {
    maxRequests: 10,
    windowMs: 60 * 1000,
    minIntervalMs: 2000,
  },
} as const

// =============================================================================
// Rate Limiter Class
// =============================================================================

/**
 * Token bucket rate limiter for LLM requests.
 *
 * Tracks request timestamps and enforces limits to prevent
 * API abuse and excessive costs.
 *
 * @example
 * ```typescript
 * const limiter = new RateLimiter(DEFAULT_LIMITS.GENERATION)
 *
 * if (limiter.canMakeRequest()) {
 *   limiter.recordRequest()
 *   await makeApiCall()
 * } else {
 *   const waitTime = limiter.getTimeUntilNextAllowed()
 *   console.log(`Please wait ${waitTime}ms`)
 * }
 * ```
 */
export class RateLimiter {
  private readonly maxRequests: number
  private readonly windowMs: number
  private readonly minIntervalMs: number
  private timestamps: number[] = []
  private lastRequestTime = 0

  constructor(config: RateLimiterConfig) {
    this.maxRequests = config.maxRequests
    this.windowMs = config.windowMs
    this.minIntervalMs = config.minIntervalMs ?? 0
  }

  /**
   * Remove timestamps outside the current window.
   */
  private pruneOldTimestamps(): void {
    const now = Date.now()
    const windowStart = now - this.windowMs
    this.timestamps = this.timestamps.filter(ts => ts > windowStart)
  }

  /**
   * Check if a request can be made now.
   *
   * @returns true if request is allowed
   */
  canMakeRequest(): boolean {
    this.pruneOldTimestamps()

    const now = Date.now()

    // Check minimum interval
    if (this.minIntervalMs > 0 && now - this.lastRequestTime < this.minIntervalMs) {
      return false
    }

    // Check request count
    return this.timestamps.length < this.maxRequests
  }

  /**
   * Record a request timestamp.
   * Call this after a successful request.
   */
  recordRequest(): void {
    const now = Date.now()
    this.timestamps.push(now)
    this.lastRequestTime = now
  }

  /**
   * Get time until next request is allowed.
   *
   * @returns Milliseconds to wait (0 if request allowed now)
   */
  getTimeUntilNextAllowed(): number {
    this.pruneOldTimestamps()

    const now = Date.now()
    let waitTime = 0

    // Check minimum interval
    if (this.minIntervalMs > 0) {
      const intervalWait = this.minIntervalMs - (now - this.lastRequestTime)
      if (intervalWait > 0) {
        waitTime = intervalWait
      }
    }

    // Check if window is full
    if (this.timestamps.length >= this.maxRequests) {
      // Wait until oldest timestamp expires
      const oldestTimestamp = this.timestamps[0]
      const windowWait = (oldestTimestamp + this.windowMs) - now
      waitTime = Math.max(waitTime, windowWait)
    }

    return Math.max(0, waitTime)
  }

  /**
   * Get current rate limit status.
   *
   * @returns Detailed status information
   */
  getStatus(): RateLimitStatus {
    this.pruneOldTimestamps()

    const now = Date.now()
    const remaining = Math.max(0, this.maxRequests - this.timestamps.length)
    const retryAfter = this.getTimeUntilNextAllowed()

    // Calculate when window resets
    let resetIn = this.windowMs
    if (this.timestamps.length > 0) {
      const oldestTimestamp = this.timestamps[0]
      resetIn = Math.max(0, (oldestTimestamp + this.windowMs) - now)
    }

    return {
      allowed: this.canMakeRequest(),
      remaining,
      resetIn,
      retryAfter,
    }
  }

  /**
   * Reset the rate limiter state.
   * Use for testing or after configuration changes.
   */
  reset(): void {
    this.timestamps = []
    this.lastRequestTime = 0
  }

  /**
   * Get the number of requests made in current window.
   */
  getRequestCount(): number {
    this.pruneOldTimestamps()
    return this.timestamps.length
  }
}

// =============================================================================
// Global Rate Limiters
// =============================================================================

/**
 * Global rate limiters for different request types.
 * These are shared across the application.
 */
const globalLimiters = new Map<string, RateLimiter>()

/**
 * Get or create a rate limiter for a specific key.
 *
 * @param key - Unique identifier for this limiter
 * @param config - Configuration (only used on first creation)
 * @returns The rate limiter instance
 *
 * @example
 * ```typescript
 * const limiter = getGlobalLimiter('generation', DEFAULT_LIMITS.GENERATION)
 * if (limiter.canMakeRequest()) {
 *   limiter.recordRequest()
 *   // ... make request
 * }
 * ```
 */
export function getGlobalLimiter(key: string, config: RateLimiterConfig): RateLimiter {
  if (!globalLimiters.has(key)) {
    globalLimiters.set(key, new RateLimiter(config))
  }
  return globalLimiters.get(key)!
}

/**
 * Reset a global rate limiter.
 *
 * @param key - The limiter key to reset
 */
export function resetGlobalLimiter(key: string): void {
  globalLimiters.get(key)?.reset()
}

/**
 * Reset all global rate limiters.
 */
export function resetAllGlobalLimiters(): void {
  globalLimiters.forEach(limiter => limiter.reset())
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Check if a generation request is allowed.
 */
export function canGenerateNow(): boolean {
  return getGlobalLimiter('generation', DEFAULT_LIMITS.GENERATION).canMakeRequest()
}

/**
 * Record a generation request.
 */
export function recordGenerationRequest(): void {
  getGlobalLimiter('generation', DEFAULT_LIMITS.GENERATION).recordRequest()
}

/**
 * Get status for generation requests.
 */
export function getGenerationStatus(): RateLimitStatus {
  return getGlobalLimiter('generation', DEFAULT_LIMITS.GENERATION).getStatus()
}

/**
 * Check if a translation request is allowed.
 */
export function canTranslateNow(): boolean {
  return getGlobalLimiter('translation', DEFAULT_LIMITS.TRANSLATION).canMakeRequest()
}

/**
 * Record a translation request.
 */
export function recordTranslationRequest(): void {
  getGlobalLimiter('translation', DEFAULT_LIMITS.TRANSLATION).recordRequest()
}

/**
 * Higher-order function to wrap an async function with rate limiting.
 *
 * @param fn - The async function to wrap
 * @param limiterKey - Key for the rate limiter
 * @param config - Rate limiter configuration
 * @returns Wrapped function that respects rate limits
 *
 * @example
 * ```typescript
 * const rateLimitedGenerate = withRateLimit(
 *   generateMirrorCode,
 *   'generation',
 *   DEFAULT_LIMITS.GENERATION
 * )
 *
 * try {
 *   const result = await rateLimitedGenerate(prompt)
 * } catch (e) {
 *   if (e instanceof RateLimitError) {
 *     console.log(`Wait ${e.retryAfter}ms`)
 *   }
 * }
 * ```
 */
export function withRateLimit<T extends (...args: Parameters<T>) => Promise<ReturnType<T>>>(
  fn: T,
  limiterKey: string,
  config: RateLimiterConfig
): T {
  const limiter = getGlobalLimiter(limiterKey, config)

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    if (!limiter.canMakeRequest()) {
      const status = limiter.getStatus()
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${Math.ceil(status.retryAfter / 1000)}s`,
        status.retryAfter
      )
    }

    limiter.recordRequest()
    return fn(...args)
  }) as T
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Error thrown when rate limit is exceeded.
 */
export class RateLimitError extends Error {
  readonly retryAfter: number
  readonly isRateLimitError = true

  constructor(message: string, retryAfter: number) {
    super(message)
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

/**
 * Type guard for RateLimitError.
 */
export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof Error && 'isRateLimitError' in error
}
