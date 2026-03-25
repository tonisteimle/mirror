/**
 * Event Bus for Studio
 */

import type { Command } from './commands'
import type { AST } from '../../src/parser/ast'
import type { IR } from '../../src/ir/types'
import type { SourceMap } from '../../src/ir/source-map'
import type { ComponentDragData } from '../panels/components/types'
import type { DropZone } from '../visual/models/drop-zone'

export interface ParseError {
  message: string
  line: number
  column: number
  hint?: string
}

export interface CodeChange {
  from: number
  to: number
  insert: string
}

export interface StudioEvents {
  'source:changed': { source: string; origin: 'editor' | 'command' | 'external' | 'panel' | 'drag-drop' | 'keyboard'; change?: CodeChange }
  'source:compiled': { success: boolean; errors: ParseError[] }
  'selection:changed': { nodeId: string | null; origin: 'editor' | 'preview' | 'panel' | 'llm' | 'keyboard' | 'drag-drop' }
  /** Emitted when selection becomes invalid (e.g., selected node removed) */
  'selection:invalidated': { nodeId: string }
  /** Emitted when selection falls back to a different node (e.g., after queued selection fails) */
  'selection:fallback': { originalNodeId: string; fallbackNodeId: string }
  /** Emitted when a component definition is selected (e.g., cursor on definition line in .com file) */
  'definition:selected': { componentName: string; origin: 'editor' }
  /** Emitted when an error occurs in state management */
  'state:error': { error: unknown; context: string }
  'command:executed': { command: Command }
  'command:undone': { command: Command }
  'command:redone': { command: Command }
  'editor:cursor-moved': { line: number; column: number }
  'editor:focused': void
  'editor:blurred': void
  'preview:element-clicked': { nodeId: string; element: HTMLElement }
  'preview:element-hovered': { nodeId: string | null; element: HTMLElement | null }
  'preview:element-dblclicked': { nodeId: string; element: HTMLElement }
  'preview:zoom': { zoom: number; scale: number }
  'preview:playmode': { active: boolean }
  'panel:property-changed': { nodeId: string; property: string; value: string }
  'panel:property-removed': { nodeId: string; property: string }
  'panel:update-requested': { nodeId: string }
  'panel:visibility-changed': { panel: 'prompt' | 'files' | 'code' | 'components' | 'preview' | 'property'; visible: boolean }
  'breadcrumb:changed': { breadcrumb: Array<{ nodeId: string; name: string }> }
  'breadcrumb:update-requested': { chain: Array<{ nodeId: string; name: string }> }
  'ui:panel-toggled': { panel: 'left' | 'right'; visible: boolean }
  'ui:file-switched': { file: string }
  'drag:started': { nodeId: string; source: 'preview' | 'library' }
  'drag:ended': { success: boolean }
  'drop:completed': { nodeId: string; targetId: string; position: 'before' | 'after' | 'inside' }
  /** Element move started */
  'move:started': { nodeId: string }
  'move:completed': {
    nodeId: string
    targetId: string
    position: 'before' | 'after' | 'inside'
    layoutTransition?: {
      from: 'flex' | 'absolute'
      to: 'flex' | 'absolute'
      absolutePosition?: { x: number; y: number }
    }
  }
  'move:cancelled': { nodeId: string }
  /** Direct manipulation handle events */
  'handle:drag-start': { nodeId: string; property: string; startValue: number }
  'handle:drag-move': { nodeId: string; property: string; value: number }
  'handle:drag-end': { nodeId: string; property: string; value: number }
  /** Multi-selection events */
  'multiselection:changed': { nodeIds: string[] }
  /** Resize events (Visual Code System) */
  'resize:start': { nodeId: string; handle: string; startWidth: number; startHeight: number }
  'resize:move': { nodeId: string; width: 'fill' | 'hug' | number; height: 'fill' | 'hug' | number }
  'resize:end': { nodeId: string; width: 'fill' | 'hug' | number; height: 'fill' | 'hug' | number; x?: number; y?: number }
  /** Drag from palette events (Visual Code System) */
  'drag:start': { type: 'component' | 'container' | 'layout'; component: string; defaultProps?: string }
  'drop:component': { dragData: ComponentDragData; dropZone: DropZone }
  /** Emitted when compilation is requested */
  'compile:requested': Record<string, never>
  /** Emitted when compilation starts */
  'compile:started': void
  /** Emitted when compilation is idle (not in progress) */
  'compile:idle': void
  /** Emitted when compilation completes successfully */
  'compile:completed': { ast: AST; ir: IR; sourceMap: SourceMap; version?: number; hasErrors?: boolean }
  /** Emitted when compilation fails */
  'compile:failed': { error: string }
  /** User-facing notification events */
  'notification:info': { message: string; duration?: number }
  'notification:success': { message: string; duration?: number }
  'notification:warning': { message: string; duration?: number }
  'notification:error': { message: string; duration?: number }
  /** Component Panel events */
  'component:drag-start': { item: ComponentPanelItem; event: DragEvent }
  'component:drag-end': { item: ComponentPanelItem; event: DragEvent }
  'component:insert-requested': { item: ComponentPanelItem }
  /** Grid settings changed */
  'grid:changed': { enabled: boolean; size: number; showVisual: boolean; color: string }
  /** Smart guides settings changed */
  'smartGuides:changed': { enabled: boolean; threshold: number; color: string; showDistances: boolean }
  /** General settings changed */
  'settings:changed': { moveStep: number; moveStepShift: number; showPositionLabels: boolean }
  /** Settings loaded from server */
  'settings:loaded': { panelVisibility: Record<string, boolean> }
  /** Inline text editing started */
  'inline-edit:started': { nodeId: string; element: HTMLElement }
  /** Inline text editing input changed */
  'inline-edit:input': { nodeId: string; element: HTMLElement }
  /** Inline text editing ended */
  'inline-edit:ended': { nodeId: string; originalText: string; newText: string; saved: boolean }
  /** Explorer view changed */
  'explorer:view-changed': { view: 'files' | 'components' }
  /** Component panel tab changed */
  'components:tab-changed': { tab: 'basic' | 'all' }
  /** Component added to project from All tab */
  'components:added-to-project': { componentName: string }
  /** Component dropped into editor */
  'component:editor-dropped': { data: any; position: { line: number; column: number; offset: number } }
}

/** Component Panel item (simplified for event typing) */
export interface ComponentPanelItem {
  id: string
  name: string
  template: string
  properties?: string
  textContent?: string
}

type EventHandler<T> = (payload: T) => void

/**
 * Event metadata added by middleware
 */
export interface EventMeta {
  timestamp: number
  eventType: string
  blocked?: boolean
}

/**
 * Middleware function type
 * Can transform payload, add metadata, or block event by returning null
 */
export type EventMiddleware<K extends keyof StudioEvents = keyof StudioEvents> = (
  event: K,
  payload: StudioEvents[K],
  meta: EventMeta
) => { payload: StudioEvents[K]; meta: EventMeta } | null

export class EventBus {
  private handlers: Map<string, Set<EventHandler<any>>> = new Map()
  private middleware: EventMiddleware[] = []

  /**
   * Add middleware that runs before event handlers
   * Middleware can transform events or block them (return null)
   * Returns unsubscribe function
   */
  use(middleware: EventMiddleware): () => void {
    this.middleware.push(middleware)
    return () => {
      const index = this.middleware.indexOf(middleware)
      if (index >= 0) this.middleware.splice(index, 1)
    }
  }

  on<K extends keyof StudioEvents>(event: K, handler: EventHandler<StudioEvents[K]>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler)
    return () => this.handlers.get(event)?.delete(handler)
  }

  off<K extends keyof StudioEvents>(event: K, handler: EventHandler<StudioEvents[K]>): void {
    this.handlers.get(event)?.delete(handler)
  }

  once<K extends keyof StudioEvents>(event: K, handler: EventHandler<StudioEvents[K]>): () => void {
    const wrapper = (payload: StudioEvents[K]) => {
      this.off(event, wrapper)
      handler(payload)
    }
    return this.on(event, wrapper)
  }

  emit<K extends keyof StudioEvents>(event: K, payload: StudioEvents[K]): void {
    // Run through middleware chain
    let currentPayload: unknown = payload
    let meta: EventMeta = { timestamp: Date.now(), eventType: event }

    for (const mw of this.middleware) {
      const result = mw(event, currentPayload as StudioEvents[K], meta)
      if (result === null) {
        // Event blocked by middleware
        return
      }
      currentPayload = result.payload
      meta = result.meta
    }

    // Dispatch to handlers
    this.handlers.get(event)?.forEach(handler => {
      try {
        handler(currentPayload)
      } catch (e) {
        console.error(`Error in event handler for ${event}:`, e)
      }
    })
  }

  /**
   * Get count of handlers for an event (useful for debugging)
   */
  handlerCount(event: keyof StudioEvents): number {
    return this.handlers.get(event)?.size ?? 0
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clearAll(): void {
    this.handlers.clear()
    this.middleware = []
  }
}

/**
 * Built-in middleware: Logger
 * Logs all events to console (can be filtered by pattern)
 */
export function createLoggerMiddleware(options: {
  filter?: RegExp | ((event: string) => boolean)
  collapsed?: boolean
} = {}): EventMiddleware {
  const { filter, collapsed = true } = options

  return (event, payload, meta) => {
    const shouldLog = filter
      ? (typeof filter === 'function' ? filter(event) : filter.test(event))
      : true

    if (shouldLog) {
      const logFn = collapsed ? console.groupCollapsed : console.group
      logFn(`[Event] ${event}`)
      console.log('Payload:', payload)
      console.log('Meta:', meta)
      console.groupEnd()
    }

    return { payload, meta }
  }
}

/**
 * Built-in middleware: Analytics tracker
 * Tracks event counts and can report statistics
 */
export function createAnalyticsMiddleware(): EventMiddleware & {
  getStats: () => Record<string, number>
  reset: () => void
} {
  const counts: Record<string, number> = {}

  const middleware: EventMiddleware = (event, payload, meta) => {
    counts[event] = (counts[event] || 0) + 1
    return { payload, meta }
  }

  // Attach utility methods
  (middleware as any).getStats = () => ({ ...counts });
  (middleware as any).reset = () => {
    for (const key of Object.keys(counts)) delete counts[key]
  }

  return middleware as EventMiddleware & {
    getStats: () => Record<string, number>
    reset: () => void
  }
}

export const events = new EventBus()

export function onSourceChanged(handler: EventHandler<StudioEvents['source:changed']>): () => void {
  return events.on('source:changed', handler)
}

export function onSelectionChanged(handler: EventHandler<StudioEvents['selection:changed']>): () => void {
  return events.on('selection:changed', handler)
}

export function onCommandExecuted(handler: EventHandler<StudioEvents['command:executed']>): () => void {
  return events.on('command:executed', handler)
}
