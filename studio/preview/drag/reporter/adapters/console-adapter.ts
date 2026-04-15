/**
 * ConsoleAdapter - Logs drag frames to console
 *
 * Structured logging with configurable verbosity.
 */

import type { ReportAdapter, DragFrame, DragSession } from '../types'

export type LogLevel = 'minimal' | 'normal' | 'verbose'

export interface ConsoleAdapterConfig {
  level: LogLevel
  prefix: string
  useGroups: boolean
}

const DEFAULT_CONFIG: ConsoleAdapterConfig = {
  level: 'normal',
  prefix: '[DragReport]',
  useGroups: true,
}

export class ConsoleAdapter implements ReportAdapter {
  private config: ConsoleAdapterConfig
  private frameCount = 0

  constructor(config: Partial<ConsoleAdapterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  onSessionStart(session: DragSession): void {
    this.frameCount = 0

    if (this.config.useGroups) {
      console.group(`${this.config.prefix} Session ${session.sessionId}`)
    }

    console.log(`${this.config.prefix} Session started`, {
      id: session.sessionId,
      source: session.source,
      time: new Date(session.startTime).toISOString(),
    })
  }

  onFrame(frame: DragFrame): void {
    this.frameCount++

    switch (this.config.level) {
      case 'minimal':
        this.logMinimal(frame)
        break
      case 'normal':
        this.logNormal(frame)
        break
      case 'verbose':
        this.logVerbose(frame)
        break
    }
  }

  onSessionEnd(session: DragSession): void {
    const duration = session.endTime ? session.endTime - session.startTime : 0

    console.log(`${this.config.prefix} Session ended`, {
      id: session.sessionId,
      frames: session.frameCount,
      duration: `${duration}ms`,
      completed: session.completed,
      target: session.finalTarget,
    })

    if (this.config.useGroups) {
      console.groupEnd()
    }
  }

  private logMinimal(frame: DragFrame): void {
    const { summary, cursor } = frame
    if (!summary.hasTarget) return // Only log when over a target

    console.log(
      `${this.config.prefix} #${frame.frameId}`,
      `(${cursor.x.toFixed(0)}, ${cursor.y.toFixed(0)})`,
      summary.insertionDescription || 'no target'
    )
  }

  private logNormal(frame: DragFrame): void {
    const { hit, insertion, summary } = frame

    console.log(`${this.config.prefix} Frame #${frame.frameId}`, {
      cursor: `(${frame.cursor.x.toFixed(0)}, ${frame.cursor.y.toFixed(0)})`,
      container: hit.containerId,
      layout: hit.layout,
      insertion: summary.insertionDescription,
      escapeZone: hit.escapeZone.detected ? hit.escapeZone.parentId : false,
    })
  }

  private logVerbose(frame: DragFrame): void {
    console.log(`${this.config.prefix} Frame #${frame.frameId}`, frame)
  }

  destroy(): void {
    // Nothing to clean up
  }
}
