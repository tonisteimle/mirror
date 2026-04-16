/**
 * Property Panel State Machine
 *
 * Pure state machine ohne Side Effects.
 * Definiert alle möglichen States, Events und Transitions.
 *
 * Die State Machine ist vollständig deterministisch und testbar:
 * - Gleicher State + gleiches Event = immer gleiches Ergebnis
 * - Keine DOM-Abhängigkeiten
 * - Keine async Operationen
 */

import type { ExtractedElement } from '../../../compiler'
import type { PropertyChange } from './ports'

// ============================================
// State Types
// ============================================

/**
 * Panel zeigt "Wähle ein Element" - nichts ist selektiert
 */
export interface EmptyState {
  type: 'empty'
}

/**
 * Panel lädt Properties für ein Element
 */
export interface LoadingState {
  type: 'loading'
  nodeId: string
}

/**
 * Element wurde nicht gefunden (z.B. gelöscht)
 */
export interface NotFoundState {
  type: 'not-found'
  nodeId: string
}

/**
 * Panel zeigt Properties eines Elements
 */
export interface ShowingState {
  type: 'showing'
  element: ExtractedElement
  expandedSections: Set<string>
  isInPositionedContainer: boolean
}

/**
 * Panel wartet auf Compile-Ende bevor Update
 */
export interface PendingUpdateState {
  type: 'pending-update'
  pendingNodeId: string
  previousElement: ExtractedElement | null
}

export type PanelState =
  | EmptyState
  | LoadingState
  | NotFoundState
  | ShowingState
  | PendingUpdateState

// ============================================
// Event Types
// ============================================

export type PanelEvent =
  | { type: 'SELECT'; nodeId: string | null }
  | { type: 'ELEMENT_LOADED'; element: ExtractedElement; isInPositionedContainer: boolean }
  | { type: 'ELEMENT_NOT_FOUND'; nodeId: string }
  | { type: 'PROPERTY_CHANGE'; name: string; value: string }
  | { type: 'PROPERTY_REMOVE'; name: string }
  | { type: 'PROPERTY_TOGGLE'; name: string; enabled: boolean }
  | { type: 'SECTION_TOGGLE'; sectionName: string }
  | { type: 'COMPILE_START' }
  | { type: 'COMPILE_END' }
  | { type: 'SELECTION_INVALIDATED'; nodeId: string }
  | { type: 'DEFINITION_SELECTED'; componentName: string }

// ============================================
// Effect Types
// ============================================

/**
 * Effects sind Side Effects die der Controller ausführen muss.
 * Die State Machine erzeugt sie, führt sie aber nicht selbst aus.
 */
export type PanelEffect =
  | { type: 'LOAD_ELEMENT'; nodeId: string }
  | { type: 'LOAD_DEFINITION'; componentName: string }
  | { type: 'APPLY_CHANGE'; nodeId: string; change: PropertyChange }
  | { type: 'RENDER'; state: PanelState }
  | { type: 'NOTIFY_CHANGE'; nodeId: string; change: PropertyChange }

// ============================================
// Transition Result
// ============================================

export interface TransitionResult {
  state: PanelState
  effects: PanelEffect[]
}

// ============================================
// Initial State
// ============================================

export function createInitialState(): PanelState {
  return { type: 'empty' }
}

// ============================================
// State Machine Transitions
// ============================================

/**
 * Pure transition function.
 * Gibt neuen State und auszuführende Effects zurück.
 */
export function transition(state: PanelState, event: PanelEvent): TransitionResult {
  switch (event.type) {
    case 'SELECT':
      return handleSelect(state, event.nodeId)

    case 'ELEMENT_LOADED':
      return handleElementLoaded(state, event.element, event.isInPositionedContainer)

    case 'ELEMENT_NOT_FOUND':
      return handleElementNotFound(state, event.nodeId)

    case 'PROPERTY_CHANGE':
      return handlePropertyChange(state, event.name, event.value)

    case 'PROPERTY_REMOVE':
      return handlePropertyRemove(state, event.name)

    case 'PROPERTY_TOGGLE':
      return handlePropertyToggle(state, event.name, event.enabled)

    case 'SECTION_TOGGLE':
      return handleSectionToggle(state, event.sectionName)

    case 'COMPILE_START':
      return handleCompileStart(state)

    case 'COMPILE_END':
      return handleCompileEnd(state)

    case 'SELECTION_INVALIDATED':
      return handleSelectionInvalidated(state, event.nodeId)

    case 'DEFINITION_SELECTED':
      return handleDefinitionSelected(state, event.componentName)

    default:
      return { state, effects: [] }
  }
}

// ============================================
// Event Handlers
// ============================================

function handleSelect(state: PanelState, nodeId: string | null): TransitionResult {
  // Keine Selektion -> empty
  if (nodeId === null) {
    return {
      state: { type: 'empty' },
      effects: [{ type: 'RENDER', state: { type: 'empty' } }],
    }
  }

  // Wenn compile läuft, pending-update
  // (wird vom Controller geprüft, hier nur State-Wechsel)
  const newState: LoadingState = { type: 'loading', nodeId }

  // Don't render 'loading' state - LOAD_ELEMENT is synchronous
  // and will immediately trigger ELEMENT_LOADED or ELEMENT_NOT_FOUND
  // which will produce the final RENDER effect
  return {
    state: newState,
    effects: [{ type: 'LOAD_ELEMENT', nodeId }],
  }
}

function handleElementLoaded(
  state: PanelState,
  element: ExtractedElement,
  isInPositionedContainer: boolean
): TransitionResult {
  // Only handle ELEMENT_LOADED when in loading state
  if (state.type !== 'loading') {
    return { state, effects: [] }
  }

  const newState: ShowingState = {
    type: 'showing',
    element,
    expandedSections: getDefaultExpandedSections(),
    isInPositionedContainer,
  }

  return {
    state: newState,
    effects: [{ type: 'RENDER', state: newState }],
  }
}

function handleElementNotFound(state: PanelState, nodeId: string): TransitionResult {
  // Only handle ELEMENT_NOT_FOUND when in loading state
  if (state.type !== 'loading') {
    return { state, effects: [] }
  }

  const newState: NotFoundState = { type: 'not-found', nodeId }

  return {
    state: newState,
    effects: [{ type: 'RENDER', state: newState }],
  }
}

function handlePropertyChange(state: PanelState, name: string, value: string): TransitionResult {
  if (state.type !== 'showing') {
    return { state, effects: [] }
  }

  const change: PropertyChange = { name, value, action: 'set' }

  return {
    state, // State bleibt gleich, wird nach Compile neu geladen
    effects: [
      { type: 'APPLY_CHANGE', nodeId: state.element.nodeId, change },
      { type: 'NOTIFY_CHANGE', nodeId: state.element.nodeId, change },
    ],
  }
}

function handlePropertyRemove(state: PanelState, name: string): TransitionResult {
  if (state.type !== 'showing') {
    return { state, effects: [] }
  }

  const change: PropertyChange = { name, value: '', action: 'remove' }

  return {
    state,
    effects: [
      { type: 'APPLY_CHANGE', nodeId: state.element.nodeId, change },
      { type: 'NOTIFY_CHANGE', nodeId: state.element.nodeId, change },
    ],
  }
}

function handlePropertyToggle(state: PanelState, name: string, enabled: boolean): TransitionResult {
  if (state.type !== 'showing') {
    return { state, effects: [] }
  }

  const change: PropertyChange = { name, value: String(enabled), action: 'toggle' }

  return {
    state,
    effects: [
      { type: 'APPLY_CHANGE', nodeId: state.element.nodeId, change },
      { type: 'NOTIFY_CHANGE', nodeId: state.element.nodeId, change },
    ],
  }
}

function handleSectionToggle(state: PanelState, sectionName: string): TransitionResult {
  if (state.type !== 'showing') {
    return { state, effects: [] }
  }

  const newExpanded = new Set(state.expandedSections)
  if (newExpanded.has(sectionName)) {
    newExpanded.delete(sectionName)
  } else {
    newExpanded.add(sectionName)
  }

  const newState: ShowingState = {
    ...state,
    expandedSections: newExpanded,
  }

  return {
    state: newState,
    effects: [{ type: 'RENDER', state: newState }],
  }
}

function handleCompileStart(state: PanelState): TransitionResult {
  // Bei showing -> pending-update mit aktuellem Element
  if (state.type === 'showing') {
    const newState: PendingUpdateState = {
      type: 'pending-update',
      pendingNodeId: state.element.nodeId,
      previousElement: state.element,
    }
    return { state: newState, effects: [] }
  }

  // Bei loading -> pending-update
  if (state.type === 'loading') {
    const newState: PendingUpdateState = {
      type: 'pending-update',
      pendingNodeId: state.nodeId,
      previousElement: null,
    }
    return { state: newState, effects: [] }
  }

  return { state, effects: [] }
}

function handleCompileEnd(state: PanelState): TransitionResult {
  // Handle pending updates first
  if (state.type === 'pending-update') {
    const newState: LoadingState = { type: 'loading', nodeId: state.pendingNodeId }
    return { state: newState, effects: [{ type: 'LOAD_ELEMENT', nodeId: state.pendingNodeId }] }
  }

  // If showing an element, reload it to pick up fresh tokens and properties
  if (state.type === 'showing') {
    const newState: LoadingState = { type: 'loading', nodeId: state.element.nodeId }
    return { state: newState, effects: [{ type: 'LOAD_ELEMENT', nodeId: state.element.nodeId }] }
  }

  return { state, effects: [] }
}

function handleSelectionInvalidated(state: PanelState, nodeId: string): TransitionResult {
  // Nur relevant wenn wir dieses Element anzeigen
  if (state.type === 'showing' && state.element.nodeId === nodeId) {
    const newState: NotFoundState = { type: 'not-found', nodeId }
    return {
      state: newState,
      effects: [{ type: 'RENDER', state: newState }],
    }
  }

  if (state.type === 'pending-update' && state.pendingNodeId === nodeId) {
    const newState: NotFoundState = { type: 'not-found', nodeId }
    return {
      state: newState,
      effects: [{ type: 'RENDER', state: newState }],
    }
  }

  return { state, effects: [] }
}

function handleDefinitionSelected(state: PanelState, componentName: string): TransitionResult {
  const newState: LoadingState = {
    type: 'loading',
    nodeId: `def:${componentName}`, // Marker für Definition
  }

  // Don't render 'loading' state - LOAD_DEFINITION is synchronous
  return {
    state: newState,
    effects: [{ type: 'LOAD_DEFINITION', componentName }],
  }
}

// ============================================
// Helper Functions
// ============================================

function getDefaultExpandedSections(): Set<string> {
  // Alle Sections standardmäßig expanded
  return new Set(['behavior', 'layout', 'sizing', 'spacing', 'border', 'color', 'typography'])
}

// ============================================
// Query Functions
// ============================================

export function isEmpty(state: PanelState): state is EmptyState {
  return state.type === 'empty'
}

export function isLoading(state: PanelState): state is LoadingState {
  return state.type === 'loading'
}

export function isNotFound(state: PanelState): state is NotFoundState {
  return state.type === 'not-found'
}

export function isShowing(state: PanelState): state is ShowingState {
  return state.type === 'showing'
}

export function isPendingUpdate(state: PanelState): state is PendingUpdateState {
  return state.type === 'pending-update'
}

export function getCurrentElement(state: PanelState): ExtractedElement | null {
  if (state.type === 'showing') {
    return state.element
  }
  if (state.type === 'pending-update') {
    return state.previousElement
  }
  return null
}

export function getCurrentNodeId(state: PanelState): string | null {
  switch (state.type) {
    case 'loading':
      return state.nodeId
    case 'not-found':
      return state.nodeId
    case 'showing':
      return state.element.nodeId
    case 'pending-update':
      return state.pendingNodeId
    default:
      return null
  }
}
