/**
 * Bootstrap Module
 *
 * Factory functions for initializing Studio subsystems.
 * Each init function is self-contained and returns a dispose function.
 */

export {
  initDrawManager,
  type DrawManagerInitConfig,
  type DrawManagerInitResult,
} from './init-draw-manager'
export {
  initInlineEdit,
  type InlineEditInitConfig,
  type InlineEditInitResult,
} from './init-inline-edit'
export { initSync, type SyncInitConfig, type SyncInitResult } from './init-sync'
export { initNotifications, type NotificationInitConfig } from './init-notifications'
export {
  initGridOverlay,
  type GridOverlayInitConfig,
  type GridOverlayInitResult,
} from './init-grid-overlay'
export { tabLabel, renderEditorFileTabs, syncEditorFileTabs, type FileTabsDeps } from './file-tabs'
export { installEditorDispatchWrapper } from './init-editor-dispatch'
