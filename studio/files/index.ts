/**
 * File Management Module
 *
 * Refactored from desktop-files.js following Clean Code principles.
 * All functions < 10 lines.
 */

// Types
export type {
  FileType,
  TreeItem,
  ContextMenuState,
  MenuItem,
  FileCallbacks,
  UIState,
} from './types'

// Main initializer
export { initDesktopFiles, openFolder, loadFolder, getCurrentFolder } from './initializer'

// File operations
export {
  selectFile,
  saveFile,
  createFile,
  createFolder,
  renameItem,
  duplicateFile,
  deleteItem,
  moveItem,
  getCurrentFile,
  getFiles,
  getFileContent,
  updateFileCache,
} from './file-service'

// UI components
export { renderFileTree, toggleFolder } from './tree-renderer'
export { showContextMenu, hideContextMenu } from './context-menu'
export { startInlineRename, startInlineCreate } from './inline-editor'
export { initProjectToolbar } from './toolbar'

// Utilities
export { escapeHtml, escapeAttr, validateFilename, getFileType, findFirstFile } from './utils'

// State (for testing)
export { uiState } from './ui-state'
