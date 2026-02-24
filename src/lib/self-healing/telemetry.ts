/**
 * Self-Healing Telemetry
 *
 * Tracks fix applications and their success rates.
 * Useful for debugging and optimizing the self-healing system.
 */

// =============================================================================
// Types
// =============================================================================

export interface FixApplication {
  /** Name of the fix that was applied */
  fixName: string
  /** Whether the fix was successful */
  success: boolean
  /** Timestamp when the fix was applied */
  timestamp: number
  /** Optional error message if failed */
  error?: string
  /** Duration in ms */
  durationMs?: number
  /** Size of input code */
  inputSize?: number
  /** Size of output code */
  outputSize?: number
}

export interface FixStats {
  /** Total number of fix applications */
  totalApplications: number
  /** Number of successful fixes */
  successCount: number
  /** Number of failed fixes */
  failureCount: number
  /** Success rate as percentage (0-100) */
  successRate: number
  /** Per-fix statistics */
  byFix: Record<string, {
    applications: number
    successes: number
    failures: number
    successRate: number
    avgDurationMs: number
  }>
  /** Most common fixes */
  topFixes: Array<{ name: string; count: number }>
  /** Most problematic fixes */
  troubleFixes: Array<{ name: string; failureRate: number; count: number }>
  /** Average duration per fix */
  avgDurationMs: number
  /** Time range of tracked applications */
  timeRange?: {
    start: number
    end: number
  }
}

export interface TelemetryConfig {
  /** Maximum number of applications to keep in history */
  maxHistory?: number
  /** Whether to persist to localStorage */
  persist?: boolean
  /** Storage key for persistence */
  storageKey?: string
}

// =============================================================================
// Telemetry Class
// =============================================================================

export class SelfHealingTelemetry {
  private applications: FixApplication[] = []
  private readonly maxHistory: number
  private readonly persist: boolean
  private readonly storageKey: string

  constructor(config: TelemetryConfig = {}) {
    this.maxHistory = config.maxHistory ?? 1000
    this.persist = config.persist ?? false
    this.storageKey = config.storageKey ?? 'mirror-self-healing-telemetry'

    if (this.persist) {
      this.loadFromStorage()
    }
  }

  /**
   * Track a fix application.
   */
  trackFixApplication(
    fixName: string,
    success: boolean,
    options?: {
      error?: string
      durationMs?: number
      inputSize?: number
      outputSize?: number
    }
  ): void {
    const application: FixApplication = {
      fixName,
      success,
      timestamp: Date.now(),
      ...options,
    }

    this.applications.push(application)

    // Trim history if needed
    if (this.applications.length > this.maxHistory) {
      this.applications = this.applications.slice(-this.maxHistory)
    }

    if (this.persist) {
      this.saveToStorage()
    }
  }

  /**
   * Get statistics about fix applications.
   */
  getStats(): FixStats {
    const byFix: FixStats['byFix'] = {}
    let totalDuration = 0
    let durationCount = 0

    // Aggregate by fix
    for (const app of this.applications) {
      if (!byFix[app.fixName]) {
        byFix[app.fixName] = {
          applications: 0,
          successes: 0,
          failures: 0,
          successRate: 0,
          avgDurationMs: 0,
        }
      }

      byFix[app.fixName].applications++
      if (app.success) {
        byFix[app.fixName].successes++
      } else {
        byFix[app.fixName].failures++
      }

      if (app.durationMs !== undefined) {
        totalDuration += app.durationMs
        durationCount++
      }
    }

    // Calculate per-fix rates
    for (const fixName of Object.keys(byFix)) {
      const fix = byFix[fixName]
      fix.successRate = fix.applications > 0
        ? (fix.successes / fix.applications) * 100
        : 0

      // Calculate avg duration for this fix
      const fixDurations = this.applications
        .filter(a => a.fixName === fixName && a.durationMs !== undefined)
        .map(a => a.durationMs!)

      fix.avgDurationMs = fixDurations.length > 0
        ? fixDurations.reduce((a, b) => a + b, 0) / fixDurations.length
        : 0
    }

    // Calculate totals
    const totalApplications = this.applications.length
    const successCount = this.applications.filter(a => a.success).length
    const failureCount = totalApplications - successCount

    // Top fixes by count
    const topFixes = Object.entries(byFix)
      .map(([name, stats]) => ({ name, count: stats.applications }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Trouble fixes (high failure rate with significant usage)
    const troubleFixes = Object.entries(byFix)
      .filter(([, stats]) => stats.applications >= 5 && stats.failures > 0)
      .map(([name, stats]) => ({
        name,
        failureRate: (stats.failures / stats.applications) * 100,
        count: stats.applications,
      }))
      .sort((a, b) => b.failureRate - a.failureRate)
      .slice(0, 5)

    // Time range
    const timeRange = this.applications.length > 0
      ? {
          start: this.applications[0].timestamp,
          end: this.applications[this.applications.length - 1].timestamp,
        }
      : undefined

    return {
      totalApplications,
      successCount,
      failureCount,
      successRate: totalApplications > 0 ? (successCount / totalApplications) * 100 : 0,
      byFix,
      topFixes,
      troubleFixes,
      avgDurationMs: durationCount > 0 ? totalDuration / durationCount : 0,
      timeRange,
    }
  }

  /**
   * Get recent applications.
   */
  getRecentApplications(limit = 10): FixApplication[] {
    return this.applications.slice(-limit).reverse()
  }

  /**
   * Get applications for a specific fix.
   */
  getApplicationsForFix(fixName: string): FixApplication[] {
    return this.applications.filter(a => a.fixName === fixName)
  }

  /**
   * Clear all tracked applications.
   */
  clear(): void {
    this.applications = []
    if (this.persist) {
      this.saveToStorage()
    }
  }

  /**
   * Export all data (for debugging).
   */
  export(): { applications: FixApplication[]; stats: FixStats } {
    return {
      applications: [...this.applications],
      stats: this.getStats(),
    }
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const data = JSON.parse(stored) as FixApplication[]
        this.applications = data.slice(-this.maxHistory)
      }
    } catch {
      // Storage not available or corrupted
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.applications))
    } catch {
      // Storage not available or quota exceeded
    }
  }
}

// =============================================================================
// Global Instance
// =============================================================================

let globalTelemetry: SelfHealingTelemetry | null = null

/**
 * Get the global telemetry instance.
 */
export function getGlobalTelemetry(): SelfHealingTelemetry {
  if (!globalTelemetry) {
    globalTelemetry = new SelfHealingTelemetry({
      maxHistory: 1000,
      persist: false, // Don't persist by default
    })
  }
  return globalTelemetry
}

/**
 * Reset the global telemetry instance.
 */
export function resetGlobalTelemetry(): void {
  globalTelemetry?.clear()
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Track a fix application on the global instance.
 */
export function trackFixApplication(
  fixName: string,
  success: boolean,
  options?: {
    error?: string
    durationMs?: number
    inputSize?: number
    outputSize?: number
  }
): void {
  getGlobalTelemetry().trackFixApplication(fixName, success, options)
}

/**
 * Get fix stats from the global instance.
 */
export function getFixStats(): FixStats {
  return getGlobalTelemetry().getStats()
}

/**
 * Get recent fix applications from the global instance.
 */
export function getRecentFixes(limit = 10): FixApplication[] {
  return getGlobalTelemetry().getRecentApplications(limit)
}
