/**
 * Event Bus for Studio
 */

import type { Command } from './commands'

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
  'selection:changed': { nodeId: string | null; origin: 'editor' | 'preview' | 'panel' | 'llm' | 'keyboard' }
  'command:executed': { command: Command }
  'command:undone': { command: Command }
  'command:redone': { command: Command }
  'editor:cursor-moved': { line: number; column: number }
  'editor:focused': void
  'editor:blurred': void
  'preview:element-clicked': { nodeId: string; element: HTMLElement }
  'preview:element-hovered': { nodeId: string | null; element: HTMLElement | null }
  'panel:property-changed': { nodeId: string; property: string; value: string }
  'panel:property-removed': { nodeId: string; property: string }
  'panel:update-requested': { nodeId: string }
  'breadcrumb:changed': { breadcrumb: Array<{ nodeId: string; name: string }> }
  'breadcrumb:update-requested': { chain: Array<{ nodeId: string; name: string }> }
  'ui:panel-toggled': { panel: 'left' | 'right'; visible: boolean }
  'ui:file-switched': { file: string }
  'drag:started': { nodeId: string; source: 'preview' | 'library' }
  'drag:ended': { success: boolean }
  'drop:completed': { nodeId: string; targetId: string; position: 'before' | 'after' | 'inside' }
  'compile:requested': Record<string, never>
  'compile:completed': { ast: any; ir: any; sourceMap: any }
  'compile:failed': { error: string }
}

type EventHandler<T> = (payload: T) => void

export class EventBus {
  private handlers: Map<string, Set<EventHandler<any>>> = new Map()

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
    this.handlers.get(event)?.forEach(handler => {
      try {
        handler(payload)
      } catch (e) {
        console.error(`Error in event handler for ${event}:`, e)
      }
    })
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
