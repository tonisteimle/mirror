/**
 * Inline Text Editing Types
 *
 * Figma-style inline text editing for the preview.
 * Double-click on text elements to edit directly in place.
 */

/**
 * Element types that support inline text editing
 */
export const EDITABLE_COMPONENT_TYPES = [
  'Text',
  'Button',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'Label',
  'Link',
  'Option',
] as const

export type EditableComponentType = typeof EDITABLE_COMPONENT_TYPES[number]

/**
 * Check if a component type supports inline editing
 */
export function isEditableType(componentName: string): boolean {
  return EDITABLE_COMPONENT_TYPES.includes(componentName as EditableComponentType)
}

/**
 * Configuration for InlineEditController
 */
export interface InlineEditConfig {
  /** Preview container element */
  container: HTMLElement
  /** Attribute used to identify nodes (default: data-mirror-id) */
  nodeIdAttribute?: string
  /** Callback when edit starts */
  onEditStart?: (nodeId: string, element: HTMLElement) => void
  /** Callback when edit ends */
  onEditEnd?: (nodeId: string, newText: string, saved: boolean) => void
}

/**
 * Result of an inline edit operation
 */
export interface InlineEditResult {
  /** Node that was edited */
  nodeId: string
  /** Original text before editing */
  originalText: string
  /** New text after editing */
  newText: string
  /** Whether the edit was saved (true) or cancelled (false) */
  saved: boolean
}

/**
 * State of the inline edit controller
 */
export interface InlineEditState {
  /** Whether an edit session is currently active */
  active: boolean
  /** Node ID currently being edited */
  nodeId: string | null
  /** Original text content before editing */
  originalText: string | null
}
