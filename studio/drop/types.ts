/**
 * Drop Module Types
 *
 * Clean Code: All types in one place, no implementation details
 */

// === Input Types ===

export interface DropSource {
  type: 'element' | 'palette'
  nodeId?: string
  componentName?: string
  properties?: string
  textContent?: string
  children?: unknown[]
  /** Multi-line template for presets/composites */
  mirTemplate?: string
  /** Data block for charts and data-driven components */
  dataBlock?: { name: string; content: string }
}

export interface AbsolutePosition {
  x: number
  y: number
}

export interface Alignment {
  zone?: string
}

export interface DropResult {
  source: DropSource
  targetNodeId: string
  placement: string
  insertionIndex?: number
  absolutePosition?: AbsolutePosition
  alignment?: Alignment
  isDuplicate?: boolean
}

// === Output Types ===

export interface ModificationResult {
  success: boolean
  newSource?: string
  change?: {
    from: number
    to: number
    insert: string
  }
  error?: string
}

// === Handler Interface ===

export interface DropHandler {
  canHandle(result: DropResult): boolean
  handle(result: DropResult, context: DropContext): Promise<ModificationResult | null>
}

// === Context (Dependencies) ===

export interface DropContext {
  codeModifier: CodeModifier
  robustModifier?: RobustModifier
  previewContainer: HTMLElement
  currentFile: string
  isComponentsFile: (file: string) => boolean
  findExistingZagDefinition: (name: string) => ZagDefinitionResult
  generateZagComponentName: (name: string) => string
  generateZagDefinitionCode: (name: string, component: string, children: unknown[]) => string
  generateZagInstanceCode: (name: string, props: string, children: unknown[]) => string
  addZagDefinitionToCode: (code: string) => void
  findOrCreateComponentsFile: () => Promise<string | null>
  addZagDefinitionToComponentsFile: (code: string, file: string) => Promise<boolean>
  isZagComponent: (children: unknown[]) => boolean
  emitNotification: (type: 'info' | 'success' | 'error', message: string) => void
  /**
   * True if `nodeId` is rendered inside an `each` loop (i.e. its source is a
   * template that gets cloned per data row). Reordering / moving such a node
   * is semantically ambiguous — the source has only the template, not the
   * iterated copies — so the drop service blocks it with a hint.
   */
  isInEachTemplate?: (nodeId: string) => boolean
}

// === External Dependencies (simplified interfaces) ===

export interface CodeModifier {
  duplicateNode(sourceId: string, targetId: string, placement: string): ModificationResult
  moveNode(
    sourceId: string,
    targetId: string,
    placement: string,
    index?: number
  ): ModificationResult
  updateProperty(nodeId: string, property: string, value: string): ModificationResult
  addChild(targetId: string, component: string, options: AddChildOptions): ModificationResult
  addChildWithTemplate(
    targetId: string,
    template: string,
    options: AddChildOptions
  ): ModificationResult
  getSourceLength(): number
  addProperty(
    nodeId: string,
    propName: string,
    value: string,
    options?: { position?: 'first' | 'last'; afterProp?: string }
  ): ModificationResult
}

export interface RobustModifier {
  updatePosition(nodeId: string, x: number, y: number): ModificationResult
}

export interface AddChildOptions {
  position: number | 'last'
  properties?: string
  textContent?: string
  parentProperty?: string
}

import type { ZagDefinitionResult } from '../zag'
export type { ZagDefinitionResult }
