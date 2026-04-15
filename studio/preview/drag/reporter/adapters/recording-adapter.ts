/**
 * RecordingAdapter - Records drag sessions to JSON
 *
 * Stores frames in memory and provides export functionality.
 */

import type { ReportAdapter, DragFrame, DragSession } from '../types'

export interface Recording {
  session: DragSession
  frames: DragFrame[]
  exportedAt: number
}

export interface RecordingAdapterConfig {
  maxRecordings: number
  autoDownload: boolean
}

const DEFAULT_CONFIG: RecordingAdapterConfig = {
  maxRecordings: 10,
  autoDownload: false,
}

export class RecordingAdapter implements ReportAdapter {
  private config: RecordingAdapterConfig
  private recordings: Recording[] = []
  private currentFrames: DragFrame[] = []
  private currentSession: DragSession | null = null

  constructor(config: Partial<RecordingAdapterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  onSessionStart(session: DragSession): void {
    this.currentSession = session
    this.currentFrames = []
  }

  onFrame(frame: DragFrame): void {
    this.currentFrames.push(frame)
  }

  onSessionEnd(session: DragSession): void {
    const recording: Recording = {
      session,
      frames: [...this.currentFrames],
      exportedAt: Date.now(),
    }

    this.recordings.push(recording)

    // Limit recordings
    while (this.recordings.length > this.config.maxRecordings) {
      this.recordings.shift()
    }

    if (this.config.autoDownload) {
      this.downloadRecording(recording)
    }

    this.currentSession = null
    this.currentFrames = []
  }

  /**
   * Get all recordings
   */
  getRecordings(): Recording[] {
    return [...this.recordings]
  }

  /**
   * Get the last recording
   */
  getLastRecording(): Recording | null {
    return this.recordings[this.recordings.length - 1] || null
  }

  /**
   * Clear all recordings
   */
  clearRecordings(): void {
    this.recordings = []
  }

  /**
   * Export a recording as JSON string
   */
  exportJSON(recording: Recording): string {
    return JSON.stringify(recording, null, 2)
  }

  /**
   * Download a recording as JSON file
   */
  downloadRecording(recording: Recording): void {
    const json = this.exportJSON(recording)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `drag-session-${recording.session.sessionId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Download all recordings as a single JSON file
   */
  downloadAll(): void {
    const json = JSON.stringify(
      {
        exportedAt: Date.now(),
        recordings: this.recordings,
      },
      null,
      2
    )
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `drag-sessions-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  destroy(): void {
    this.recordings = []
    this.currentFrames = []
    this.currentSession = null
  }
}
