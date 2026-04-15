/**
 * Property Panel Controller
 *
 * Core-Logik des Property Panels ohne DOM-Abhängigkeiten.
 * Koordiniert State Machine und Ports.
 *
 * Der Controller:
 * - Empfängt Events von den Ports
 * - Führt State Machine Transitions aus
 * - Führt Effects via Ports aus
 * - Ist vollständig testbar ohne DOM
 */

import type { ExtractedElement } from '../../../compiler'
import type { PropertyPanelPorts, PropertyChange, CleanupFn } from './ports'
import {
  type PanelState,
  type PanelEvent,
  type PanelEffect,
  type TransitionResult,
  createInitialState,
  transition,
  isShowing,
  isPendingUpdate,
  getCurrentElement,
  getCurrentNodeId,
} from './state-machine'

// ============================================
// Controller Options
// ============================================

export interface PropertyPanelControllerOptions {
  /**
   * Debounce time for property changes (ms).
   * Default: 300
   */
  debounceTime?: number

  /**
   * Called when state changes (for UI rendering).
   */
  onStateChange?: (state: PanelState) => void

  /**
   * Called when a property change is applied.
   */
  onPropertyChange?: (nodeId: string, change: PropertyChange) => void
}

// ============================================
// Controller
// ============================================

export class PropertyPanelController {
  private state: PanelState
  private ports: PropertyPanelPorts
  private options: Required<PropertyPanelControllerOptions>
  private cleanups: CleanupFn[] = []
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private disposed = false

  constructor(ports: PropertyPanelPorts, options: PropertyPanelControllerOptions = {}) {
    this.ports = ports
    this.options = {
      debounceTime: options.debounceTime ?? 300,
      onStateChange: options.onStateChange ?? (() => {}),
      onPropertyChange: options.onPropertyChange ?? (() => {}),
    }
    this.state = createInitialState()
  }

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Initializes the controller and subscribes to ports.
   */
  init(): void {
    if (this.disposed) {
      throw new Error('Controller has been disposed')
    }

    // Subscribe to selection changes
    this.cleanups.push(
      this.ports.selection.subscribe((nodeId, previousNodeId) => {
        this.handleSelect(nodeId)
      })
    )

    // Subscribe to selection invalidation
    this.cleanups.push(
      this.ports.events.onSelectionInvalidated(nodeId => {
        this.dispatch({ type: 'SELECTION_INVALIDATED', nodeId })
      })
    )

    // Subscribe to compile completion
    this.cleanups.push(
      this.ports.events.onCompileCompleted(() => {
        this.dispatch({ type: 'COMPILE_END' })
      })
    )

    // Subscribe to definition selection
    this.cleanups.push(
      this.ports.events.onDefinitionSelected(componentName => {
        this.dispatch({ type: 'DEFINITION_SELECTED', componentName })
      })
    )

    // Load initial selection if any
    const initialSelection = this.ports.selection.getSelection()
    if (initialSelection) {
      this.handleSelect(initialSelection)
    } else {
      this.options.onStateChange(this.state)
    }
  }

  /**
   * Disposes the controller and cleans up subscriptions.
   */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.debounceTimers.forEach(timer => clearTimeout(timer))
    this.debounceTimers.clear()
    this.cleanups.forEach(cleanup => cleanup())
    this.cleanups.length = 0
    this.ports.tokens.invalidateCache()
  }

  // ============================================
  // State Access
  // ============================================

  /**
   * Gets the current state.
   */
  getState(): PanelState {
    return this.state
  }

  /**
   * Gets the currently displayed element.
   */
  getCurrentElement(): ExtractedElement | null {
    return getCurrentElement(this.state)
  }

  /**
   * Gets the current node ID.
   */
  getCurrentNodeId(): string | null {
    return getCurrentNodeId(this.state)
  }

  /**
   * Checks if in positioned container (for x/y inputs).
   */
  isInPositionedContainer(): boolean {
    if (isShowing(this.state)) {
      return this.state.isInPositionedContainer
    }
    return false
  }

  // ============================================
  // Actions
  // ============================================

  /**
   * Changes a property value.
   * Debounced to prevent spam during fast typing.
   */
  changeProperty(name: string, value: string): void {
    this.debouncedDispatch(`prop:${name}`, { type: 'PROPERTY_CHANGE', name, value })
  }

  /**
   * Removes a property.
   */
  removeProperty(name: string): void {
    this.dispatch({ type: 'PROPERTY_REMOVE', name })
  }

  /**
   * Toggles a boolean property.
   */
  toggleProperty(name: string, enabled: boolean): void {
    this.dispatch({ type: 'PROPERTY_TOGGLE', name, enabled })
  }

  /**
   * Toggles a section's expanded state.
   */
  toggleSection(sectionName: string): void {
    this.dispatch({ type: 'SECTION_TOGGLE', sectionName })
  }

  /**
   * Manually triggers a refresh of the current element.
   */
  refresh(): void {
    const nodeId = getCurrentNodeId(this.state)
    if (nodeId) {
      this.handleSelect(nodeId)
    }
  }

  // ============================================
  // Internal Methods
  // ============================================

  /**
   * Handles selection changes.
   */
  private handleSelect(nodeId: string | null): void {
    // If compile is in progress, defer the update
    if (this.ports.events.isCompiling()) {
      this.dispatch({ type: 'COMPILE_START' })
      // The actual select will happen when COMPILE_END is received
      if (nodeId) {
        // Store pending selection in state
        this.state = {
          type: 'pending-update',
          pendingNodeId: nodeId,
          previousElement: getCurrentElement(this.state),
        }
      }
      return
    }

    this.dispatch({ type: 'SELECT', nodeId })
  }

  /**
   * Dispatches an event to the state machine.
   */
  private dispatch(event: PanelEvent): void {
    if (this.disposed) return

    const result = transition(this.state, event)
    this.state = result.state

    // Execute effects
    this.executeEffects(result.effects)
  }

  /**
   * Dispatches an event with debouncing.
   */
  private debouncedDispatch(key: string, event: PanelEvent): void {
    // Don't schedule new timers after disposal
    if (this.disposed) return

    // Clear existing timer for this key
    const existingTimer = this.debounceTimers.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new timer
    const timer = setTimeout(() => {
      // Check disposed again in callback (race condition protection)
      if (this.disposed) return
      this.debounceTimers.delete(key)
      this.dispatch(event)
    }, this.options.debounceTime)

    this.debounceTimers.set(key, timer)
  }

  /**
   * Executes effects produced by state transitions.
   */
  private executeEffects(effects: PanelEffect[]): void {
    for (const effect of effects) {
      this.executeEffect(effect)
    }
  }

  /**
   * Executes a single effect.
   */
  private executeEffect(effect: PanelEffect): void {
    switch (effect.type) {
      case 'LOAD_ELEMENT':
        this.loadElement(effect.nodeId)
        break

      case 'LOAD_DEFINITION':
        this.loadDefinition(effect.componentName)
        break

      case 'APPLY_CHANGE':
        this.applyChange(effect.nodeId, effect.change)
        break

      case 'RENDER':
        this.options.onStateChange(effect.state)
        break

      case 'NOTIFY_CHANGE':
        this.options.onPropertyChange(effect.nodeId, effect.change)
        break
    }
  }

  /**
   * Loads an element's properties.
   */
  private loadElement(nodeId: string): void {
    const element = this.ports.extraction.getProperties(nodeId)
    if (!element) {
      this.dispatch({ type: 'ELEMENT_NOT_FOUND', nodeId })
      return
    }
    this.dispatch({
      type: 'ELEMENT_LOADED',
      element,
      isInPositionedContainer: this.ports.layout.isInPositionedContainer(nodeId),
    })
  }

  /**
   * Loads a component definition's properties.
   */
  private loadDefinition(componentName: string): void {
    const element = this.ports.extraction.getPropertiesForDefinition(componentName)

    if (!element) {
      this.dispatch({ type: 'ELEMENT_NOT_FOUND', nodeId: `def:${componentName}` })
      return
    }

    this.dispatch({
      type: 'ELEMENT_LOADED',
      element,
      isInPositionedContainer: false,
    })
  }

  /**
   * Applies a property change via the modification port.
   */
  private applyChange(nodeId: string, change: PropertyChange): void {
    let result

    switch (change.action) {
      case 'set':
        result = this.ports.modification.setProperty(nodeId, change.name, change.value)
        break

      case 'remove':
        result = this.ports.modification.removeProperty(nodeId, change.name)
        break

      case 'toggle':
        const enabled = change.value === 'true'
        result = this.ports.modification.toggleProperty(nodeId, change.name, enabled)
        break
    }

    // Note: We don't handle the result here because the compile process
    // will trigger a refresh via the events port
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Creates a new PropertyPanelController.
 */
export function createPropertyPanelController(
  ports: PropertyPanelPorts,
  options?: PropertyPanelControllerOptions
): PropertyPanelController {
  return new PropertyPanelController(ports, options)
}
