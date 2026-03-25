/**
 * Studio Panels
 *
 * Re-exports all panel modules.
 */

// Property Panel
export {
  PropertyPanel,
  createPropertyPanel,
  type PropertyPanelConfig,
  type PropertyPanelCallbacks,
  type ExtractedElement,
} from './property-panel'

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
  LAYOUT_PRESETS,
  BASIC_COMPONENTS,
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
