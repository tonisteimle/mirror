/**
 * StudioContext - Dependency Injection Container
 *
 * Centralizes all studio dependencies for testability and
 * explicit wiring. Replaces global singletons.
 */

import { state, actions, type StudioState } from './state'
import { events } from './events'
import { executor, CommandExecutor } from './command-executor'
import { StateSelectionAdapter, getStateSelectionAdapter } from './selection-adapter'
import type { EditorController } from '../editor'
import type { PreviewController } from '../preview'
import type { SyncCoordinatorV2 as SyncCoordinator } from '../sync'

export interface StudioContext {
  /** Central state store */
  state: typeof state
  /** Event bus for loose coupling */
  events: typeof events
  /** Action creators */
  actions: typeof actions
  /** Command executor for undo/redo */
  executor: CommandExecutor
  /** Editor controller (optional, set after initialization) */
  editor: EditorController | null
  /** Preview controller (optional, set after initialization) */
  preview: PreviewController | null
  /** Sync coordinator (optional, set after initialization) */
  sync: SyncCoordinator | null
  /** Selection adapter bridging state to SelectionManager interface */
  selectionAdapter: StateSelectionAdapter
}

/**
 * Create a new studio context with optional initial state
 */
export function createStudioContext(config?: Partial<StudioState>): StudioContext {
  // Apply initial config to state if provided
  if (config) {
    state.set(config)
  }

  return {
    state,
    events,
    actions,
    executor,
    editor: null,
    preview: null,
    sync: null,
    selectionAdapter: getStateSelectionAdapter(),
  }
}

/**
 * Create a test context with mock implementations
 * Useful for unit testing components in isolation
 */
export function createTestContext(overrides?: Partial<StudioContext>): StudioContext {
  const baseContext = createStudioContext()
  return {
    ...baseContext,
    ...overrides,
  }
}

// Global context instance for backward compatibility
let globalContext: StudioContext | null = null

/**
 * Get the global studio context
 */
export function getStudioContext(): StudioContext | null {
  return globalContext
}

/**
 * Set the global studio context
 */
export function setStudioContext(context: StudioContext): void {
  globalContext = context
}

/**
 * Reset the global context (for testing)
 */
export function resetStudioContext(): void {
  globalContext = null
}
