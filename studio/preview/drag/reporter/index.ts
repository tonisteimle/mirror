/**
 * Drag Reporter System
 *
 * Self-reporting system for all drag components.
 * Components report their state through a standardized Reportable<T> interface.
 * A central DragReporter collects and distributes data to adapters.
 *
 * Usage:
 *   // In browser console:
 *   window.__enableDragReporting()           // Console logging (normal)
 *   window.__enableDragReporting('verbose')  // Console logging (verbose)
 *   window.__enableDragReporting('recording') // Enable recording
 *   window.__getDragRecordings()             // Get recorded sessions
 *   window.__downloadDragRecordings()        // Download all recordings
 *   window.__disableDragReporting()          // Disable
 *
 *   // Or programmatically:
 *   import { getDragReporter, ConsoleAdapter } from './reporter'
 *   const reporter = getDragReporter()
 *   reporter.addAdapter(new ConsoleAdapter({ level: 'verbose' }))
 *   reporter.enable()
 */

// Types
export type {
  Point,
  Reportable,
  EscapeZoneReport,
  HitReport,
  MidpointComparison,
  InsertionReport,
  IndicatorReport,
  CacheReport,
  ControllerReport,
  DragFrameSummary,
  DragFrame,
  DragSession,
  ReportAdapter,
  ReporterConfig,
} from './types'

// Main reporter class
export { DragReporter, getDragReporter, resetDragReporter } from './drag-reporter'
export type { ReportableComponents } from './drag-reporter'

// Adapters
export { ConsoleAdapter, RecordingAdapter, WebSocketAdapter } from './adapters'
export type {
  ConsoleAdapterConfig,
  LogLevel,
  RecordingAdapterConfig,
  Recording,
  WebSocketAdapterConfig,
  ConnectionState,
} from './adapters'
