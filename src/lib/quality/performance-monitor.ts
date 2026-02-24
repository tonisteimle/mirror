/**
 * Performance Monitor
 *
 * Monitors and tracks performance metrics for the generation pipeline.
 * Part of Quality Assurance (Increment 28).
 */

/**
 * Performance metric
 */
export interface PerformanceMetric {
  name: string
  duration: number
  timestamp: number
  metadata?: Record<string, unknown>
}

/**
 * Performance report
 */
export interface PerformanceReport {
  totalDuration: number
  metrics: PerformanceMetric[]
  summary: MetricSummary
  warnings: PerformanceWarning[]
}

/**
 * Metric summary
 */
export interface MetricSummary {
  operationCount: number
  avgDuration: number
  maxDuration: number
  minDuration: number
  p95Duration: number
  slowOperations: string[]
}

/**
 * Performance warning
 */
export interface PerformanceWarning {
  operation: string
  duration: number
  threshold: number
  message: string
}

/**
 * Performance thresholds
 */
export interface PerformanceThresholds {
  analysis: number
  validation: number
  healing: number
  formatting: number
  parsing: number
  total: number
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  analysis: 100,    // ms
  validation: 50,   // ms
  healing: 200,     // ms
  formatting: 30,   // ms
  parsing: 20,      // ms
  total: 500        // ms
}

/**
 * Performance monitor instance
 */
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private thresholds: PerformanceThresholds = DEFAULT_THRESHOLDS
  private enabled: boolean = true
  private startTime: number = 0

  /**
   * Starts monitoring session
   */
  start(): void {
    this.metrics = []
    this.startTime = Date.now()
  }

  /**
   * Records a metric
   */
  record(name: string, duration: number, metadata?: Record<string, unknown>): void {
    if (!this.enabled) return

    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
      metadata
    })
  }

  /**
   * Times an operation
   */
  time<T>(name: string, fn: () => T): T {
    const start = Date.now()
    try {
      return fn()
    } finally {
      this.record(name, Date.now() - start)
    }
  }

  /**
   * Times an async operation
   */
  async timeAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now()
    try {
      return await fn()
    } finally {
      this.record(name, Date.now() - start)
    }
  }

  /**
   * Gets the performance report
   */
  getReport(): PerformanceReport {
    const totalDuration = Date.now() - this.startTime
    const summary = this.calculateSummary()
    const warnings = this.checkThresholds()

    return {
      totalDuration,
      metrics: [...this.metrics],
      summary,
      warnings
    }
  }

  /**
   * Calculates metric summary
   */
  private calculateSummary(): MetricSummary {
    if (this.metrics.length === 0) {
      return {
        operationCount: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        p95Duration: 0,
        slowOperations: []
      }
    }

    const durations = this.metrics.map(m => m.duration)
    const sorted = [...durations].sort((a, b) => a - b)

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
    const maxDuration = Math.max(...durations)
    const minDuration = Math.min(...durations)
    const p95Index = Math.floor(sorted.length * 0.95)
    const p95Duration = sorted[p95Index] || maxDuration

    // Find slow operations (above p95)
    const slowOperations = this.metrics
      .filter(m => m.duration >= p95Duration)
      .map(m => `${m.name} (${m.duration}ms)`)

    return {
      operationCount: this.metrics.length,
      avgDuration,
      maxDuration,
      minDuration,
      p95Duration,
      slowOperations
    }
  }

  /**
   * Checks metrics against thresholds
   */
  private checkThresholds(): PerformanceWarning[] {
    const warnings: PerformanceWarning[] = []

    for (const metric of this.metrics) {
      const threshold = this.getThreshold(metric.name)
      if (threshold && metric.duration > threshold) {
        warnings.push({
          operation: metric.name,
          duration: metric.duration,
          threshold,
          message: `${metric.name} took ${metric.duration}ms (threshold: ${threshold}ms)`
        })
      }
    }

    return warnings
  }

  /**
   * Gets threshold for operation
   */
  private getThreshold(name: string): number | null {
    const lowerName = name.toLowerCase()

    if (lowerName.includes('analysis') || lowerName.includes('analyze')) {
      return this.thresholds.analysis
    }
    if (lowerName.includes('validation') || lowerName.includes('validate')) {
      return this.thresholds.validation
    }
    if (lowerName.includes('healing') || lowerName.includes('heal')) {
      return this.thresholds.healing
    }
    if (lowerName.includes('format')) {
      return this.thresholds.formatting
    }
    if (lowerName.includes('parse')) {
      return this.thresholds.parsing
    }

    return null
  }

  /**
   * Sets thresholds
   */
  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds }
  }

  /**
   * Enables/disables monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /**
   * Resets the monitor
   */
  reset(): void {
    this.metrics = []
    this.startTime = 0
  }

  /**
   * Gets all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }
}

// Singleton instance
let monitorInstance: PerformanceMonitor | null = null

/**
 * Gets the performance monitor instance
 */
export function getMonitor(): PerformanceMonitor {
  if (!monitorInstance) {
    monitorInstance = new PerformanceMonitor()
  }
  return monitorInstance
}

/**
 * Creates a new monitor instance
 */
export function createMonitor(): PerformanceMonitor {
  return new PerformanceMonitor()
}

/**
 * Quick time measurement
 */
export function measure<T>(name: string, fn: () => T): { result: T; duration: number } {
  const start = Date.now()
  const result = fn()
  const duration = Date.now() - start
  return { result, duration }
}

/**
 * Quick async time measurement
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = Date.now()
  const result = await fn()
  const duration = Date.now() - start
  return { result, duration }
}

/**
 * Performance decorator for class methods
 */
export function timed(target: unknown, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  const originalMethod = descriptor.value

  descriptor.value = function (...args: unknown[]) {
    const monitor = getMonitor()
    return monitor.time(propertyKey, () => originalMethod.apply(this, args))
  }

  return descriptor
}

/**
 * Benchmarks a function
 */
export function benchmark(
  fn: () => void,
  iterations: number = 100
): {
  avgDuration: number
  minDuration: number
  maxDuration: number
  totalDuration: number
  iterations: number
} {
  const durations: number[] = []

  for (let i = 0; i < iterations; i++) {
    const start = Date.now()
    fn()
    durations.push(Date.now() - start)
  }

  return {
    avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    minDuration: Math.min(...durations),
    maxDuration: Math.max(...durations),
    totalDuration: durations.reduce((a, b) => a + b, 0),
    iterations
  }
}

/**
 * Formats a performance report for display
 */
export function formatReport(report: PerformanceReport): string {
  const lines: string[] = []

  lines.push('=== Performance Report ===')
  lines.push(`Total Duration: ${report.totalDuration}ms`)
  lines.push('')

  lines.push('Summary:')
  lines.push(`  Operations: ${report.summary.operationCount}`)
  lines.push(`  Average: ${report.summary.avgDuration.toFixed(2)}ms`)
  lines.push(`  Min: ${report.summary.minDuration}ms`)
  lines.push(`  Max: ${report.summary.maxDuration}ms`)
  lines.push(`  P95: ${report.summary.p95Duration}ms`)
  lines.push('')

  if (report.warnings.length > 0) {
    lines.push('Warnings:')
    for (const warning of report.warnings) {
      lines.push(`  ⚠ ${warning.message}`)
    }
    lines.push('')
  }

  if (report.summary.slowOperations.length > 0) {
    lines.push('Slow Operations:')
    for (const op of report.summary.slowOperations) {
      lines.push(`  - ${op}`)
    }
  }

  return lines.join('\n')
}

/**
 * Performance assertion for tests
 */
export function assertPerformance(
  operation: string,
  duration: number,
  maxDuration: number
): void {
  if (duration > maxDuration) {
    throw new Error(
      `Performance assertion failed: ${operation} took ${duration}ms (max: ${maxDuration}ms)`
    )
  }
}

/**
 * Creates a performance profile
 */
export function createProfile(
  name: string,
  operations: Array<{ name: string; duration: number }>
): {
  name: string
  totalDuration: number
  breakdown: Array<{ name: string; duration: number; percentage: number }>
} {
  const totalDuration = operations.reduce((sum, op) => sum + op.duration, 0)

  return {
    name,
    totalDuration,
    breakdown: operations.map(op => ({
      ...op,
      percentage: totalDuration > 0 ? (op.duration / totalDuration) * 100 : 0
    }))
  }
}

/**
 * Memory usage tracking
 */
export function getMemoryUsage(): {
  heapUsed: number
  heapTotal: number
  external: number
  rss: number
} | null {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const mem = process.memoryUsage()
    return {
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      rss: mem.rss
    }
  }
  return null
}

/**
 * Formats bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
