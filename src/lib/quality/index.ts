/**
 * Quality Module
 *
 * Quality assurance tools for Mirror DSL.
 * Part of Quality Assurance (Phase 7).
 */

export {
  getMonitor,
  createMonitor,
  measure,
  measureAsync,
  benchmark,
  formatReport,
  assertPerformance,
  createProfile,
  getMemoryUsage,
  formatBytes,
  timed,
  type PerformanceMetric,
  type PerformanceReport,
  type MetricSummary,
  type PerformanceWarning,
  type PerformanceThresholds,
} from './performance-monitor'
