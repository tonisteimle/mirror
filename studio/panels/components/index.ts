/**
 * Component Panel Module
 *
 * Provides a draggable component palette for the studio.
 */

// Main exports
export { ComponentPanel, createComponentPanel } from './component-panel'

// Types
export type {
  ComponentItem,
  ComponentSection,
  ComponentPanelConfig,
  ComponentPanelCallbacks,
  ComponentDragData,
  ComponentIcon,
} from './types'

// Utilities
export { getComponentIcon, COMPONENT_ICONS } from './icons'
export {
  LAYOUT_PRESETS,
  BASIC_COMPONENTS,
  getBuiltInComponents,
  getLayoutPresets,
  getBasicComponents,
} from './layout-presets'
export { parseComponentSections, extractComponentInfo } from './section-parser'
