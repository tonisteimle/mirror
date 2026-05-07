/**
 * Drag DevTools — install browser-console reporting helpers.
 *
 * This file is opt-in: nothing here runs unless `setupGlobalDragReporting()`
 * is explicitly called (typically from a developer command). Production
 * paths must not import from this file.
 *
 * Usage in the browser console:
 *   window.__enableDragReporting()             // Console logging (normal)
 *   window.__enableDragReporting('verbose')    // Console logging (verbose)
 *   window.__enableDragReporting('recording')  // Enable recording for JSON export
 *   window.__disableDragReporting()
 *   window.__getDragRecordings()
 *   window.__downloadDragRecordings()
 */

import { createLogger } from '../../../compiler/utils/logger'
import { getDragController } from './drag-controller'
import { getDragReporter } from './reporter/drag-reporter'
import { ConsoleAdapter } from './reporter/adapters/console-adapter'
import { RecordingAdapter } from './reporter/adapters/recording-adapter'

const log = createLogger('DragDevTools')

type ReportingMode = 'minimal' | 'normal' | 'verbose' | 'recording'

interface DragReportingGlobals {
  __enableDragReporting?: (mode?: ReportingMode) => void
  __disableDragReporting?: () => void
  __getDragRecordings?: () => unknown
  __downloadDragRecordings?: () => void
}

const globals = globalThis as typeof globalThis & DragReportingGlobals

export function setupGlobalDragReporting(): void {
  if (globals.__enableDragReporting) return

  let recordingAdapter: RecordingAdapter | null = null

  globals.__enableDragReporting = (mode: ReportingMode = 'normal') => {
    const controller = getDragController()
    const reporter = getDragReporter()

    if (!controller.getReporter()) {
      controller.setReporter(reporter)
    }

    reporter.clearAdapters()

    if (mode === 'recording') {
      recordingAdapter = new RecordingAdapter()
      reporter.addAdapter(recordingAdapter)
      reporter.addAdapter(new ConsoleAdapter({ level: 'minimal' }))
      log.debug('[DragReporting] Recording enabled. Use __getDragRecordings() to access.')
    } else {
      reporter.addAdapter(new ConsoleAdapter({ level: mode }))
      log.debug(`[DragReporting] Console logging enabled (${mode})`)
    }

    reporter.enable()
  }

  globals.__disableDragReporting = () => {
    getDragReporter().disable()
    log.debug('[DragReporting] Disabled')
  }

  globals.__getDragRecordings = () => {
    if (!recordingAdapter) {
      log.debug(
        '[DragReporting] No recording adapter. Call __enableDragReporting("recording") first.'
      )
      return null
    }
    return recordingAdapter.getRecordings()
  }

  globals.__downloadDragRecordings = () => {
    if (!recordingAdapter) {
      log.debug(
        '[DragReporting] No recording adapter. Call __enableDragReporting("recording") first.'
      )
      return
    }
    recordingAdapter.downloadAll()
  }
}
