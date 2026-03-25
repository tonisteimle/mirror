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

// ContextMenu
export {
  ZagContextMenu,
  createContextMenu,
  type MenuItem,
  type MenuSeparator,
  type MenuEntry,
  type ContextMenuConfig,
  type ContextMenuCallbacks,
} from './context-menu'
