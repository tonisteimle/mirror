/**
 * Component Panel Module
 *
 * Provides a draggable component palette for the studio.
 */

// Main exports
export { ComponentPanel, createComponentPanel } from './component-panel'
export { UserComponentsPanel, createUserComponentsPanel } from './user-components-panel'
export type {
  UserComponentsPanelConfig,
  UserComponentsPanelCallbacks,
} from './user-components-panel'

// Types
export type {
  ComponentItem,
  ComponentSection,
  ComponentPanelConfig,
  ComponentPanelCallbacks,
  ComponentDragData,
  ComponentChild,
  ComponentIcon,
} from './types'

// Components File Sync
export { ComponentsFileSync, createComponentsFileSync } from './components-file-sync'
export type { ComponentsFileSyncConfig } from './components-file-sync'

// Utilities
export { getComponentIcon, COMPONENT_ICONS } from '../../icons'
export {
  BASIC_PRIMITIVES,
  BASIC_COMPONENTS,
  // Backwards compatibility alias
  BASIC_PRIMITIVES as LAYOUT_PRESETS,
} from './layout-presets'
export { parseComponentSections, extractComponentInfo } from './section-parser'
export { COMPONENT_TEMPLATES, getComponentTemplate, getFileType } from './component-templates'

// Auto-add to .com files
export { isComponentDefined, addComponentToComFile } from './component-auto-add'
