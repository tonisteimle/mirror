/**
 * Property Panel Ports
 *
 * Interfaces für alle externen Abhängigkeiten des Property Panels.
 * Diese Ports ermöglichen vollständige Testbarkeit durch Dependency Injection.
 *
 * Das System ist nach dem "Ports & Adapters" (Hexagonal Architecture) Pattern aufgebaut:
 * - Ports = Interfaces (was das System braucht)
 * - Adapters = Implementierungen (wie es konkret gemacht wird)
 *
 * Tests verwenden Mock-Adapters, Produktion verwendet DOM-Adapters.
 */

import type { ExtractedElement, ExtractedProperty, PropertyCategory } from '../../../compiler/studio/property-extractor'
import type { ModificationResult } from '../../../compiler/studio/code-modifier'

// ============================================
// Common Types
// ============================================

export type CleanupFn = () => void

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface SpacingToken {
  name: string      // e.g., "sm", "md", "lg"
  fullName: string  // e.g., "sm.pad", "md.rad"
  value: string     // e.g., "4", "8"
}

export interface ColorToken {
  name: string      // e.g., "primary", "danger"
  fullName?: string // e.g., "primary.bg", "danger.col" (optional for simple tokens)
  value: string     // e.g., "#2271C1", "#ef4444"
}

export interface PropertyChange {
  name: string
  value: string
  action: 'set' | 'remove' | 'toggle'
}

// ============================================
// Selection Port
// ============================================

/**
 * Abstrahiert SelectionManager Interaktion.
 * Verwaltet die aktuelle Element-Selektion.
 */
export interface SelectionPort {
  /**
   * Subscribes to selection changes.
   * @returns Cleanup function to unsubscribe
   */
  subscribe(listener: (nodeId: string | null, previousNodeId: string | null) => void): CleanupFn

  /**
   * Gets the currently selected node ID.
   */
  getSelection(): string | null

  /**
   * Selects a node by ID.
   */
  select(nodeId: string | null): void

  /**
   * Clears the current selection.
   */
  clearSelection(): void
}

// ============================================
// Property Extraction Port
// ============================================

/**
 * Abstrahiert PropertyExtractor.
 * Extrahiert Properties aus dem AST für ein Element.
 */
export interface PropertyExtractionPort {
  /**
   * Gets all properties for an element by node ID.
   * @returns ExtractedElement or null if not found
   */
  getProperties(nodeId: string): ExtractedElement | null

  /**
   * Gets properties for a component definition by name.
   * Used when editing component definitions directly.
   */
  getPropertiesForDefinition(componentName: string): ExtractedElement | null
}

// ============================================
// Property Modification Port
// ============================================

/**
 * Abstrahiert CodeModifier für Property-Änderungen.
 * Wendet Änderungen auf den Source Code an.
 */
export interface PropertyModificationPort {
  /**
   * Sets a property value.
   */
  setProperty(nodeId: string, name: string, value: string): ModificationResult

  /**
   * Removes a property.
   */
  removeProperty(nodeId: string, name: string): ModificationResult

  /**
   * Toggles a boolean property.
   */
  toggleProperty(nodeId: string, name: string, enabled: boolean): ModificationResult

  /**
   * Applies multiple property changes in a batch.
   */
  batchUpdate(nodeId: string, changes: PropertyChange[]): ModificationResult
}

// ============================================
// Token Port
// ============================================

/**
 * Abstrahiert Token-Extraktion aus Source.
 * Liefert verfügbare Design Tokens für Dropdowns.
 */
export interface TokenPort {
  /**
   * Gets spacing tokens for a specific property type.
   * @param propType - 'pad', 'mar', 'gap', or 'rad'
   */
  getSpacingTokens(propType: 'pad' | 'mar' | 'gap' | 'rad'): SpacingToken[]

  /**
   * Gets all color tokens.
   */
  getColorTokens(): ColorToken[]

  /**
   * Resolves a token reference to its actual value.
   * @param tokenRef - e.g., "$primary" or "$sm"
   * @returns The resolved value or null if not found
   */
  resolveTokenValue(tokenRef: string): string | null

  /**
   * Invalidates the token cache.
   * Called when source code changes.
   */
  invalidateCache(): void
}

// ============================================
// Layout Detection Port
// ============================================

/**
 * Abstrahiert Preview-DOM-Abfragen für Layout-Kontext.
 * Ermittelt Layout-Informationen für kontextsensitive UI.
 */
export interface LayoutDetectionPort {
  /**
   * Checks if an element is inside a positioned container (stacked/absolute).
   * Determines whether x/y position inputs should be shown.
   */
  isInPositionedContainer(nodeId: string): boolean

  /**
   * Gets the layout type of the parent container.
   */
  getParentLayoutType(nodeId: string): 'flex' | 'grid' | 'positioned' | 'none'

  /**
   * Gets the bounding rect of an element.
   */
  getElementRect(nodeId: string): Rect | null
}

// ============================================
// Panel Event Port
// ============================================

/**
 * Abstrahiert globalen Event-Bus.
 * Ermöglicht Reaktion auf System-Events.
 */
export interface PanelEventPort {
  /**
   * Called when a selection is invalidated (node removed during compile).
   */
  onSelectionInvalidated(handler: (nodeId: string) => void): CleanupFn

  /**
   * Called when compilation completes.
   */
  onCompileCompleted(handler: () => void): CleanupFn

  /**
   * Called when a component definition is selected in the editor.
   */
  onDefinitionSelected(handler: (componentName: string) => void): CleanupFn

  /**
   * Checks if a compilation is currently in progress.
   */
  isCompiling(): boolean
}

// ============================================
// Combined Property Panel Ports
// ============================================

/**
 * Alle Ports die das PropertyPanel benötigt.
 * Wird bei der Konstruktion des Controllers injiziert.
 */
export interface PropertyPanelPorts {
  selection: SelectionPort
  extraction: PropertyExtractionPort
  modification: PropertyModificationPort
  tokens: TokenPort
  layout: LayoutDetectionPort
  events: PanelEventPort
}
