/**
 * Studio UI Components (Zag.js)
 *
 * Headless UI components built on Zag.js state machines.
 * Designed for compact, dense IDE styling.
 */

// Base
export { ZagComponent, IDE_THEME, type ZagComponentConfig, type IDETheme } from './base'

// TreeView
export {
  ZagTreeView,
  createTreeView,
  type FileNode,
  type TreeViewConfig,
  type TreeViewCallbacks,
} from './tree-view'

// ContextMenu (Zag-based - use ZagContextMenu prefix to avoid conflict with preview/context-menu)
export {
  ZagContextMenu,
  createContextMenu as createZagContextMenu,
  type MenuItem,
  type MenuSeparator,
  type MenuEntry,
  type ContextMenuConfig as ZagContextMenuConfig,
  type ContextMenuCallbacks,
} from './context-menu'

// Project Toolbar
export {
  ProjectToolbar,
  createProjectToolbar,
  type ProjectToolbarConfig,
} from './project-toolbar'

// Splitter (resizable panels)
export {
  ZagSplitter,
  createSplitter,
  createStudioSplitter,
  type PanelConfig,
  type SplitterConfig,
  type SplitterCallbacks,
  type StudioLayoutConfig,
  type StudioLayoutCallbacks,
} from './splitter'
