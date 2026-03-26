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

// Components File Sync
export { ComponentsFileSync, createComponentsFileSync } from './components-file-sync'
export type { ComponentsFileSyncConfig } from './components-file-sync'

// Utilities
export { getComponentIcon, COMPONENT_ICONS } from './icons'
export {
  BASIC_PRIMITIVES,
  BASIC_COMPONENTS,
  // Backwards compatibility alias
  BASIC_PRIMITIVES as LAYOUT_PRESETS,
} from './layout-presets'
export { parseComponentSections, extractComponentInfo } from './section-parser'

// Ghost rendering
export { GhostRenderer, getGhostRenderer, resetGhostRenderer, getDefaultSizeForItem } from './ghost-renderer'
export type { RenderedGhost } from './ghost-renderer'
