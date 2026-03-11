/**
 * State Store for Studio
 */

import type { AST, ParseError } from '../../src/parser/ast'
import type { IR } from '../../src/ir/types'
import type { SourceMap } from '../../src/studio/source-map'
import { events } from './events'

export type SelectionOrigin = 'editor' | 'preview' | 'panel' | 'llm' | 'keyboard'

export interface BreadcrumbItem {
  nodeId: string
  name: string
}

export interface StudioState {
  source: string
  ast: AST | null
  ir: IR | null
  sourceMap: SourceMap | null
  errors: ParseError[]
  selection: { nodeId: string | null; origin: SelectionOrigin }
  breadcrumb: BreadcrumbItem[]
  cursor: { line: number; column: number }
  editorHasFocus: boolean
  currentFile: string
  files: Record<string, string>
  fileTypes: Record<string, string>
  panels: { left: boolean; right: boolean }
  mode: 'mirror' | 'react'
  preludeOffset: number
}

export type Subscriber<T> = (state: T, prevState: T) => void
export type Selector<T, R> = (state: T) => R

class Store<T extends object> {
  private state: T
  private subscribers: Set<Subscriber<T>> = new Set()

  constructor(initialState: T) {
    this.state = initialState
  }

  get(): Readonly<T> {
    return this.state
  }

  set(partial: Partial<T>): void {
    const prevState = this.state
    this.state = { ...this.state, ...partial }
    this.notify(prevState)
  }

  subscribe(subscriber: Subscriber<T>): () => void {
    this.subscribers.add(subscriber)
    return () => this.subscribers.delete(subscriber)
  }

  private notify(prevState: T): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(this.state, prevState)
      } catch (e) {
        console.error('Error in state subscriber:', e)
      }
    }
  }
}

const initialState: StudioState = {
  source: '',
  ast: null,
  ir: null,
  sourceMap: null,
  errors: [],
  selection: { nodeId: null, origin: 'editor' },
  breadcrumb: [],
  cursor: { line: 1, column: 1 },
  editorHasFocus: true,
  currentFile: 'index.mirror',
  files: {},
  fileTypes: {},
  panels: { left: true, right: true },
  mode: 'mirror',
  preludeOffset: 0,
}

export const state = new Store<StudioState>(initialState)

export const actions = {
  setSource(source: string, origin: 'editor' | 'command' | 'external' = 'external'): void {
    state.set({ source })
    events.emit('source:changed', { source, origin })
  },
  setSelection(nodeId: string | null, origin: SelectionOrigin): void {
    state.set({ selection: { nodeId, origin } })
    events.emit('selection:changed', { nodeId, origin })
  },
  setBreadcrumb(breadcrumb: BreadcrumbItem[]): void {
    state.set({ breadcrumb })
    events.emit('breadcrumb:changed', { breadcrumb })
  },
  setCursor(line: number, column: number): void {
    state.set({ cursor: { line, column } })
    events.emit('editor:cursor-moved', { line, column })
  },
  setEditorFocus(hasFocus: boolean): void {
    state.set({ editorHasFocus: hasFocus })
    events.emit(hasFocus ? 'editor:focused' : 'editor:blurred', undefined as any)
  },
}

export const selectors = {
  getSource: () => state.get().source,
  getSelection: () => state.get().selection,
  getCursor: () => state.get().cursor,
}
