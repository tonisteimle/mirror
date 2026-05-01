/**
 * Studio Panels
 *
 * Re-exports all panel modules.
 */

// Property Panel (New Hexagonal Architecture)
export {
  PropertyPanel,
  createPropertyPanel,
  type PropertyPanelOptions,
  type OnCodeChangeCallback,
  type GetAllSourceCallback,
} from './property'

// Property Panel — global DOM event listeners
export {
  setupPropertyPanelIconPicker,
  setupPropertyPanelEventListeners,
  type PropertyPanelEventListenerDeps,
} from './property/event-listeners'

// Re-export SelectionProvider for backwards compatibility
export type { SelectionProvider } from './property/types'

// Re-export ExtractedElement from compiler
export type { ExtractedElement } from '../code-modifier/property-extractor'

// Tree Panel
export {
  TreePanel,
  createTreePanel,
  type TreePanelConfig,
  type TreePanelCallbacks,
  type TreeNode,
} from './tree'

// File Panel
export { FilePanel, createFilePanel, type FilePanelConfig, type FilePanelCallbacks } from './files'

// Component Panel
export {
  ComponentPanel,
  createComponentPanel,
  getComponentIcon,
  BASIC_PRIMITIVES,
  BASIC_COMPONENTS,
  LAYOUT_PRESETS, // Backwards compatibility alias
  type ComponentItem,
  type ComponentSection,
  type ComponentPanelConfig,
  type ComponentPanelCallbacks,
  type ComponentDragData,
  type ComponentIcon,
} from './components'

// Settings Panel
export {
  SettingsPanel,
  createSettingsPanel,
  type SettingsPanelConfig,
  type SettingsPanelCallbacks,
} from './settings'
