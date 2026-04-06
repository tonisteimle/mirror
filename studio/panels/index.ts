/**
 * Studio Panels
 *
 * Re-exports all panel modules.
 */

// Property Panel (Refactored modular version)
export {
  PropertyPanel,
  createPropertyPanel,
  type PropertyPanelOptions,
  type SelectionProvider,
  type OnCodeChangeCallback,
  type GetAllSourceCallback,
} from './property/property-panel-refactored'

// Re-export ExtractedElement from compiler
export type { ExtractedElement } from '../../compiler/studio/property-extractor'

// Tree Panel
export {
  TreePanel,
  createTreePanel,
  type TreePanelConfig,
  type TreePanelCallbacks,
  type TreeNode,
} from './tree'

// File Panel
export {
  FilePanel,
  createFilePanel,
  type FilePanelConfig,
  type FilePanelCallbacks,
} from './files'

// Component Panel
export {
  ComponentPanel,
  createComponentPanel,
  getComponentIcon,
  BASIC_PRIMITIVES,
  BASIC_COMPONENTS,
  LAYOUT_PRESETS,  // Backwards compatibility alias
  GhostRenderer,
  getGhostRenderer,
  resetGhostRenderer,
  type ComponentItem,
  type ComponentSection,
  type ComponentPanelConfig,
  type ComponentPanelCallbacks,
  type ComponentDragData,
  type ComponentIcon,
} from './components'
