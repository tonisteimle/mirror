/**
 * Inline Text Editing Module
 *
 * Figma-style inline text editing for the preview.
 * Double-click on text elements (Button, Text, H1-H6, etc.) to edit directly.
 */

// Types
export {
  EDITABLE_COMPONENT_TYPES,
  isEditableType,
  type EditableComponentType,
  type InlineEditConfig,
  type InlineEditResult,
  type InlineEditState,
} from './types'

// Session
export {
  InlineEditSession,
  createInlineEditSession,
  type InlineEditSessionConfig,
} from './inline-edit-session'

// Controller
export {
  InlineEditController,
  createInlineEditController,
} from './inline-edit-controller'
