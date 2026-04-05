/**
 * MCP State Collector
 *
 * Collects state from Mirror Studio for the MCP Server.
 * Subscribes to events and maintains current state.
 */

import { state as studioState } from '../core/state'
import { events } from '../core/events'
import type { AST, ComponentDefinition } from '../../compiler/parser/ast'

export interface MCPState {
  /** Current file path */
  filePath: string | null
  /** Current file content */
  fileContent: string | null
  /** Selected element info */
  selection: MCPSelection | null
  /** Defined tokens */
  tokens: MCPToken[]
  /** Defined components */
  components: MCPComponent[]
  /** Current errors */
  errors: MCPError[]
  /** Connection timestamp */
  timestamp: number
}

export interface MCPSelection {
  line: number
  column: number
  elementType: string | null
  elementName: string | null
  content: string | null
  properties: Record<string, string>
  states: string[]
}

export interface MCPToken {
  name: string
  value: string
  line: number
}

export interface MCPComponent {
  name: string
  extends: string | null
  slots: string[]
  line: number
}

export interface MCPError {
  line: number
  column: number
  message: string
  severity: 'error' | 'warning'
}

/**
 * State Collector - maintains current state for MCP Server
 */
class StateCollector {
  private currentState: MCPState = {
    filePath: null,
    fileContent: null,
    selection: null,
    tokens: [],
    components: [],
    errors: [],
    timestamp: Date.now(),
  }

  private listeners: Set<(state: MCPState) => void> = new Set()
  private initialized = false

  /**
   * Initialize the collector - subscribe to events
   */
  init(): void {
    if (this.initialized) return
    this.initialized = true

    // Subscribe to state changes
    studioState.subscribe((state, prevState) => {
      let changed = false

      // File content changed
      if (state.source !== prevState.source) {
        this.currentState.fileContent = state.source
        changed = true
      }

      // File path changed
      if (state.currentFile !== prevState.currentFile) {
        this.currentState.filePath = state.currentFile
        changed = true
      }

      // Selection changed
      if (state.selection.nodeId !== prevState.selection.nodeId) {
        this.currentState.selection = this.extractSelection(state)
        changed = true
      }

      // Errors changed
      if (state.errors !== prevState.errors) {
        this.currentState.errors = state.errors.map((e) => ({
          line: e.line,
          column: e.column,
          message: e.message,
          severity: 'error' as const,
        }))
        changed = true
      }

      if (changed) {
        this.currentState.timestamp = Date.now()
        this.notifyListeners()
      }
    })

    // Subscribe to compile completed for tokens/components
    events.on('compile:completed', ({ ast }) => {
      this.currentState.tokens = this.extractTokens(ast)
      this.currentState.components = this.extractComponents(ast)
      this.currentState.timestamp = Date.now()
      this.notifyListeners()
    })

    // Initial state
    const state = studioState.get()
    this.currentState = {
      filePath: state.currentFile,
      fileContent: state.source,
      selection: this.extractSelection(state),
      tokens: state.ast ? this.extractTokens(state.ast) : [],
      components: state.ast ? this.extractComponents(state.ast) : [],
      errors: state.errors.map((e) => ({
        line: e.line,
        column: e.column,
        message: e.message,
        severity: 'error' as const,
      })),
      timestamp: Date.now(),
    }
  }

  /**
   * Get current state
   */
  getState(): MCPState {
    return this.currentState
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: MCPState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Request element selection by line number
   */
  selectElement(line: number): void {
    const state = studioState.get()
    if (!state.sourceMap) return

    // Find node at line
    const entry = state.sourceMap.getNodeAtLine(line)
    if (entry) {
      events.emit('selection:changed', {
        nodeId: entry.nodeId,
        origin: 'panel',
      })
    }
  }

  private extractSelection(state: typeof studioState extends { get(): infer T } ? T : never): MCPSelection | null {
    if (!state.selection.nodeId || !state.sourceMap) {
      return null
    }

    const entry = state.sourceMap.getNodeById(state.selection.nodeId)
    if (!entry) return null

    return {
      line: entry.position.line,
      column: entry.position.column,
      elementType: entry.componentName || null,
      elementName: entry.instanceName || null,
      content: null, // Would need to parse the line
      properties: {},
      states: [],
    }
  }

  private extractTokens(ast: AST): MCPToken[] {
    const tokens: MCPToken[] = []

    for (const token of ast.tokens) {
      tokens.push({
        name: token.name,
        value: String(token.value ?? ''),
        line: token.line,
      })
    }

    return tokens
  }

  private extractComponents(ast: AST): MCPComponent[] {
    const components: MCPComponent[] = []

    const processDefinition = (def: ComponentDefinition) => {
      const slots: string[] = []

      // Extract slots from children (nested component definitions)
      if (def.children) {
        for (const child of def.children) {
          // Type guard: check if this is actually a ComponentDefinition at runtime
          const childAny = child as unknown as { type: string; name?: string }
          if (childAny.type === 'ComponentDefinition' && childAny.name) {
            slots.push(childAny.name)
          }
        }
      }

      components.push({
        name: def.name,
        extends: def.extends || null,
        slots,
        line: def.line,
      })

      // Process nested definitions
      if (def.children) {
        for (const child of def.children) {
          const childAny = child as unknown as { type: string }
          if (childAny.type === 'ComponentDefinition') {
            processDefinition(child as unknown as ComponentDefinition)
          }
        }
      }
    }

    for (const comp of ast.components) {
      processDefinition(comp)
    }

    return components
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentState)
      } catch (e) {
        console.error('[MCP StateCollector] Listener error:', e)
      }
    }
  }
}

export const stateCollector = new StateCollector()
