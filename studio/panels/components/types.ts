/**
 * Component Panel Types
 */

/**
 * Icon type for component items
 */
export type ComponentIcon =
  | 'vertical'
  | 'horizontal'
  | 'grid'
  | 'stack'
  | 'rows-3'
  | 'columns-3'
  | 'layers'
  | 'text'
  | 'button'
  | 'input'
  | 'image'
  | 'icon'
  | 'box'
  | 'card'
  | 'list'
  | 'custom'

/**
 * Child component definition for layout templates
 */
export interface ComponentChild {
  /** Mirror component template name */
  template: string
  /** Properties string */
  properties?: string
  /** Text content */
  textContent?: string
  /** Nested children */
  children?: ComponentChild[]
}

/**
 * Represents a component that can be dragged from the panel
 */
export interface ComponentItem {
  /** Unique identifier */
  id: string
  /** Display name in the panel */
  name: string
  /** Category for grouping */
  category: string
  /** Mirror component template name (e.g., 'Box', 'Text') */
  template: string
  /** Properties to add to the component (e.g., 'ver, gap 8') */
  properties?: string
  /** Text content for the component (e.g., 'Button') */
  textContent?: string
  /** Icon to display */
  icon: ComponentIcon
  /** Whether this is user-defined (from AST sections) */
  isUserDefined?: boolean
  /** Description shown on hover */
  description?: string
  /** Child components for layout templates */
  children?: ComponentChild[]
  /** Default size for drag preview ghost */
  defaultSize?: { width: number; height: number }
}

/**
 * Represents a collapsible section in the component panel
 */
export interface ComponentSection {
  /** Section name */
  name: string
  /** Items in this section */
  items: ComponentItem[]
  /** Whether section is expanded */
  isExpanded: boolean
}

/**
 * Component panel configuration
 */
export interface ComponentPanelConfig {
  /** Container element for the panel */
  container: HTMLElement
  /** Whether to show built-in layout presets (default: true) */
  showLayoutPresets?: boolean
  /** Whether to show basic components (default: true) */
  showBasicComponents?: boolean
}

/**
 * Component panel callbacks
 */
export interface ComponentPanelCallbacks {
  /** Called when drag starts on a component */
  onDragStart?: (item: ComponentItem, event: DragEvent) => void
  /** Called when drag ends */
  onDragEnd?: (item: ComponentItem, event: DragEvent) => void
  /** Called when a component is clicked (for insertion) */
  onClick?: (item: ComponentItem) => void
}

/**
 * Data transferred during drag operations
 */
export interface ComponentDragData {
  /** Mirror component name */
  componentName: string
  /** Properties string */
  properties?: string
  /** Text content */
  textContent?: string
  /** Whether this is from the component panel */
  fromComponentPanel: boolean
  /** Child components for layout templates */
  children?: ComponentChild[]
  /** Default size for drag preview */
  defaultSize?: { width: number; height: number }
}
