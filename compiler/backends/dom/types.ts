/**
 * DOM Backend Types
 *
 * Shared type definitions for DOM code generation.
 */

import type { DataFile } from '../../parser/data-types'

/**
 * Options for DOM code generation
 */
export interface GenerateDOMOptions {
  /** Parsed .data files to include in output */
  dataFiles?: DataFile[]
}

/**
 * Known Zag component slot names that should get data-slot attribute
 * when used as inline component definitions (e.g., CloseTrigger: Icon "x")
 */
export const ZAG_SLOT_NAMES = new Set([
  'CloseTrigger', 'Trigger', 'Content', 'Backdrop', 'Title', 'Description',
  'Root', 'Label', 'Control', 'Track', 'Thumb', 'Range',
  'Item', 'ItemControl', 'ItemText', 'ItemIndicator', 'ItemContent', 'ItemTrigger',
  'List', 'Indicator', 'Input', 'ValueText', 'HiddenInput',
  'Dropzone', 'ItemGroup', 'Positioner', 'Arrow',
  'PrevTrigger', 'NextTrigger', 'Circle', 'CircleTrack', 'CircleRange',
  'Image', 'Fallback', 'Area', 'Preview', 'VisibilityTrigger',
  'DecrementTrigger', 'IncrementTrigger', 'ActionTrigger',
  'Header', 'Footer', 'Group', 'GroupLabel', 'GroupContent',
])
