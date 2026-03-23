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
  // Behavior components (Zag)
  | 'select'
  | 'accordion'
  | 'dialog'
  | 'tabs'
  | 'menu'
  | 'tooltip'
  | 'popover'
  | 'toggle'
  | 'checkbox'
  | 'radio'
  | 'slider'
  // Extended Zag components
  | 'combobox'
  | 'listbox'
  | 'contextMenu'
  | 'nestedMenu'
  | 'navigationMenu'
  | 'rangeSlider'
  | 'angleSlider'
  | 'numberInput'
  | 'pinInput'
  | 'passwordInput'
  | 'tagsInput'
  | 'editable'
  | 'ratingGroup'
  | 'segmentedControl'
  | 'toggleGroup'
  | 'datePicker'
  | 'dateInput'
  | 'timer'
  | 'floatingPanel'
  | 'tour'
  | 'presence'
  | 'steps'
  | 'pagination'
  | 'treeView'
  | 'avatar'
  | 'fileUpload'
  | 'imageCropper'
  | 'carousel'
  | 'signaturePad'
  | 'circularProgress'
  | 'marquee'
  | 'clipboard'
  | 'qrCode'
  | 'scrollArea'
  | 'splitter'
  | 'collapsible'
  | 'hoverCard'
  | 'progress'
  | 'toast'

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
  /** Whether this is a slot definition (uses colon syntax, e.g., "Trigger:") */
  isSlot?: boolean
  /** Whether this is an item (for Select, Menu, etc.) */
  isItem?: boolean
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
 * Component Panel Tab
 */
export type ComponentPanelTab = 'basic' | 'all'

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
  /** Whether to show tab bar (Basic/All tabs) (default: false) */
  showTabBar?: boolean
  /** Default active tab (default: 'basic') */
  defaultTab?: ComponentPanelTab
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
  /** Whether this is from the All tab (needs to be added to project) */
  fromAllTab?: boolean
  /** Child components for layout templates */
  children?: ComponentChild[]
  /** Default size for drag preview */
  defaultSize?: { width: number; height: number }
}
