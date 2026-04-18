/**
 * Event Bus for Studio
 */

import type { Command } from './commands'
import type { ChangeIntent } from './change-types'
import type { AST } from '../../compiler/parser/ast'
import type { IR } from '../../compiler/ir/types'
import type { SourceMap } from '../../compiler/ir/source-map'
import type { ComponentDragData, ComponentChild } from '../panels/components/types'
import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('EventBus')

// DropZone type - inline definition (module not yet implemented)
export interface DropZone {
  nodeId: string
  position: 'before' | 'after' | 'inside'
  element?: HTMLElement
}

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
  'source:changed': {
    source: string
    origin: 'editor' | 'command' | 'external' | 'panel' | 'drag-drop' | 'keyboard'
    change?: CodeChange
  }
  'source:compiled': { success: boolean; errors: ParseError[] }
  'selection:changed': {
    nodeId: string | null
    origin: 'editor' | 'preview' | 'panel' | 'llm' | 'keyboard' | 'drag-drop'
  }
  /** Emitted when selection becomes invalid (e.g., selected node removed) */
  'selection:invalidated': { nodeId: string }
  /** Emitted when selection falls back to a different node (e.g., after queued selection fails) */
  'selection:fallback': { requestedId: string; resolvedId: string; reason: string }
  /** Emitted when selection needs to be refreshed (e.g., after padding change) */
  'selection:refresh': { nodeId: string }
  /** Emitted when a change is applied via ChangeService */
  'change:applied': { intent: ChangeIntent; oldSource: string; newSource: string }
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
  'panel:visibility-changed': {
    panel: 'prompt' | 'files' | 'code' | 'components' | 'preview' | 'property'
    visible: boolean
  }
  'panel:sizes-changed': { sizes: { sidebar: number; editor: number; preview: number } }
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
  'resize:end': {
    nodeId: string
    width?: 'fill' | 'hug' | number
    height?: 'fill' | 'hug' | number
    x?: number
    y?: number
  }
  /** Padding handle events */
  'handles:toggle-padding': { nodeId: string }
  'padding:start': { nodeId: string; handle: string; startPadding: number }
  'padding:move': { nodeId: string; handle: string; padding: number }
  'padding:end': { nodeId: string; handle: string; padding: number }
  /** Multi-selection resize events (Feature 4) */
  'multiResize:start': {
    nodeIds: string[]
    handle: string
    boundingBox: { x: number; y: number; width: number; height: number }
  }
  'multiResize:move': {
    nodeIds: string[]
    width: number
    height: number
    scaleX: number
    scaleY: number
  }
  'multiResize:end': {
    nodeIds: string[]
    scaleX: number
    scaleY: number
    anchor: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  }
  /** Drag from palette events (Visual Code System) */
  'drag:start': {
    type: 'component' | 'container' | 'layout'
    component: string
    defaultProps?: string
  }
  'drop:component': { dragData: ComponentDragData; dropZone: DropZone }
  /** Drag v3: Component dropped on canvas */
  'drag:dropped': {
    source: {
      type: 'palette' | 'canvas'
      componentName?: string
      template?: string
      nodeId?: string
    }
    target: {
      containerId: string
      insertionIndex: number
      /** For absolute/stacked containers: position mode */
      mode?: 'flex' | 'absolute'
      /** For absolute/stacked containers: drop position */
      position?: { x: number; y: number }
    }
    dragData: ComponentDragData | null
  }
  /** Emitted when compilation is requested */
  'compile:requested': Record<string, never>
  /** Emitted when compilation starts */
  'compile:started': void
  /** Emitted when compilation is idle (not in progress) */
  'compile:idle': void
  /** Emitted when compilation completes successfully */
  'compile:completed': {
    ast: AST
    ir: IR
    sourceMap: SourceMap
    version?: number
    hasErrors?: boolean
  }
  /** Emitted when compilation fails */
  'compile:failed': { error: string }
  /** Emitted when layout cache is invalidated */
  'layout:invalidated': { reason: 'scroll' | 'zoom' | 'resize' | 'transform' | 'manual' }
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
  'smartGuides:changed': {
    enabled: boolean
    threshold: number
    color: string
    showDistances: boolean
  }
  /** General settings changed */
  'settings:changed': { moveStep: number; moveStepShift: number; showPositionLabels: boolean }
  /** Handle snap settings changed */
  'handleSnap:changed': {
    enabled: boolean
    gridSize: number
    customPoints: number[]
    threshold: number
  }
  /** Inline text editing started */
  'inline-edit:started': { nodeId: string; element: HTMLElement }
  /** Inline text editing input changed */
  'inline-edit:input': { nodeId: string; element: HTMLElement }
  /** Inline text editing ended */
  'inline-edit:ended': { nodeId: string; originalText: string; newText: string; saved: boolean }
  /** Component panel tab changed */
  'components:tab-changed': { tab: 'basic' | 'all' }
  /** Component added to project from All tab */
  'components:added-to-project': { componentName: string }
  /** Component dropped into editor */
  'component:editor-dropped': {
    data: ComponentDragData
    position: { line: number; column: number; offset: number }
  }
  /** User settings loaded */
  'userSettings:loaded': { settings: Record<string, unknown> }
  /** Preview rendered */
  'preview:rendered': { success: boolean }
  /** Layout info extracted (Phase 1 of Preview Architecture) */
  'layout:updated': { version: number; count: number }
  /** Layout inference events */
  'layout-inference:detected': { groups: unknown[] }
  'layout-inference:converted': { group: unknown; newSource?: string }
  'layout-inference:error': { group?: unknown; error?: string }
  /** Draw events */
  'draw:error': { error: string; context?: string }
  /** Picker events (for testing) */
  'picker:opened': {
    pickerId: string
    pickerType: 'token' | 'color' | 'icon' | 'animation' | 'action' | 'unknown'
  }
  'picker:closed': { pickerId: string; reason: 'select' | 'escape' | 'click-outside' | 'unknown' }
  /** Trigger events (for testing) */
  'trigger:activated': { triggerId: string; startPos: number }
  'trigger:deactivated': { triggerId: string }
  /** Rename symbol events */
  'rename:ui-opened': { symbolName: string; symbolType: 'component' | 'token' }
  'rename:ui-closed': Record<string, never>
  'rename:no-symbol': { line: number; column: number }
  'rename:completed': {
    oldName: string
    newName: string
    symbolType: 'component' | 'token'
    fileCount: number
    locationCount: number
  }
  'rename:undone': { oldName: string; newName: string; symbolType: 'component' | 'token' }
  /** File update requested (from rename or other cross-file operations) */
  'file:update-requested': { filename: string; content: string }
}

/** Component Panel item (simplified for event typing) */
export interface ComponentPanelItem {
  id: string
  name: string
  template: string
  properties?: string
  textContent?: string
  /** Category for grouping */
  category?: string
  /** Icon type */
  icon?: string
  /** Child components for layout templates */
  children?: ComponentChild[]
  /** Default size for drag preview */
  defaultSize?: { width: number; height: number }
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

  emit<K extends keyof StudioEvents>(
    event: K,
    ...args: StudioEvents[K] extends void ? [] : [payload: StudioEvents[K]]
  ): void {
    const payload = args[0] as StudioEvents[K]
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
    const handlers = this.handlers.get(event)
    handlers?.forEach(handler => {
      try {
        handler(currentPayload)
      } catch (e) {
        log.error(`Error in event handler for ${event}:`, e)
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
export function createLoggerMiddleware(
  options: { filter?: RegExp | ((event: string) => boolean); collapsed?: boolean } = {}
): EventMiddleware {
  const { filter, collapsed = true } = options
  return (event, payload, meta) => {
    const shouldLog = filter
      ? typeof filter === 'function'
        ? filter(event)
        : filter.test(event)
      : true
    if (shouldLog) {
      ;(collapsed ? console.groupCollapsed : console.group)(`[Event] ${event}`)
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
  ;(middleware as any).getStats = () => ({ ...counts })
  ;(middleware as any).reset = () => {
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

export function onSelectionChanged(
  handler: EventHandler<StudioEvents['selection:changed']>
): () => void {
  return events.on('selection:changed', handler)
}

export function onCommandExecuted(
  handler: EventHandler<StudioEvents['command:executed']>
): () => void {
  return events.on('command:executed', handler)
}
