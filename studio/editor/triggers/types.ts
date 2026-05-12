/**
 * Trigger Types for Editor Extensions
 *
 * Defines the common interfaces and types used by all editor triggers.
 */

import type { EditorView, ViewUpdate } from '@codemirror/view'
import type { BasePicker } from '../../pickers'

/**
 * Minimal picker interface for custom pickers that don't extend BasePicker
 */
export interface MinimalPicker {
  showAt(x: number, y: number): void
  hide?(): void
  filter?(text: string): void
  getValue?(): string
  getSelectedValue?(): string | null
  navigate?(direction: 'up' | 'down' | 'left' | 'right'): void
  // Icon-picker subset (used by trigger-manager when commit-by-name).
  // Declared optional here so the `in`-check narrowing in
  // trigger-manager.ts has typed access without `as any`.
  getSelectedIndex?(): number
  getFilteredIcons?(): Array<{ name: string }>
  addToRecent?(name: string): void
}

// ============================================
// Trigger Types
// ============================================

/** Character-based trigger (e.g., typing '#' or '$') */
export interface CharTrigger {
  type: 'char'
  char: string
  /** Optional context pattern that must match before the char */
  contextPattern?: RegExp
}

/** Regex-based trigger for complex patterns */
export interface RegexTrigger {
  type: 'regex'
  pattern: RegExp
}

/** Component name trigger (e.g., 'Icon ' triggers icon picker) */
export interface ComponentTrigger {
  type: 'component'
  /** Component name or pattern */
  names: string[]
  /** Pattern to match component names (alternative to explicit names) */
  pattern?: RegExp
  /** Character that triggers after component name (default: ' ') */
  triggerChar?: string
}

/** Double-click trigger for editing existing values */
export interface DoubleClickTrigger {
  type: 'doubleClick'
  /** Pattern to match in line content */
  pattern: RegExp
}

export type TriggerDefinition = CharTrigger | RegexTrigger | ComponentTrigger | DoubleClickTrigger

// ============================================
// Trigger Context
// ============================================

export interface TriggerContext {
  /** Start position where the trigger was activated */
  startPos: number
  /** Current cursor position */
  cursorPos: number
  /** The line where trigger occurred */
  line: {
    number: number
    from: number
    to: number
    text: string
  }
  /** Text before the trigger position on the line */
  textBefore: string
  /** Text after the trigger position on the line */
  textAfter: string
  /** Property context if available (e.g., 'bg', 'pad') */
  property?: string
  /** Existing value being edited (for replace operations) */
  existingValue?: string
  /** Range to replace if editing existing value */
  replaceRange?: { from: number; to: number }
  /** Any matched component name */
  componentName?: string
}

// ============================================
// Trigger State
// ============================================

export interface TriggerState {
  /** Whether the trigger is active */
  isOpen: boolean
  /** Start position of the trigger */
  startPos: number | null
  /** The picker instance */
  picker: TriggerPicker | null
  /** Additional context data */
  context: TriggerContext | null
  /** The trigger config that activated this state */
  triggerId: string | null
}

// ============================================
// Trigger Configuration
// ============================================

export interface KeyboardConfig {
  /** Navigation orientation */
  orientation: 'vertical' | 'grid'
  /** Number of columns for grid layout */
  columns?: number
}

/** Type for pickers that can be used in triggers */
export type TriggerPicker = BasePicker | MinimalPicker

export interface TriggerConfig {
  /** Unique identifier for the trigger */
  id: string
  /** The trigger definition */
  trigger: TriggerDefinition
  /** Picker instance or factory function (supports full BasePicker or MinimalPicker) */
  picker: TriggerPicker | (() => TriggerPicker)
  /** Callback when a value is selected */
  onSelect: (value: string, context: TriggerContext, view: EditorView) => void
  /** Whether to filter picker items as user types */
  liveFilter?: boolean
  /** Characters that close the picker when typed */
  closeOnChars?: string[]
  /** Keyboard navigation configuration */
  keyboard?: KeyboardConfig
  /** Custom handler for determining if trigger should activate */
  shouldActivate?: (update: ViewUpdate, insertedText: string, context: TriggerContext) => boolean
  /** Custom handler for determining close behavior */
  shouldClose?: (update: ViewUpdate, insertedText: string, context: TriggerContext) => boolean
  /** Priority level (higher = processed first) */
  priority?: number
}

// ============================================
// Utility Types
// ============================================

/** Component primitives map (component name -> primitive type) */
export type ComponentPrimitivesMap = Map<string, string>
