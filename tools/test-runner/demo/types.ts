/**
 * Demo Mode Types
 *
 * Type definitions for demo scripts used in video recording.
 */

import type { PacingProfile, ActionTimings } from './timing'

// =============================================================================
// Configuration
// =============================================================================

export interface DemoConfig {
  /** Speed preset for animations (legacy - use pacing instead) */
  speed: 'slow' | 'normal' | 'fast'
  /** Pacing profile - determines all action timings */
  pacing: PacingProfile
  /** Show keystroke overlay in corner */
  showKeystrokeOverlay: boolean
  /** Cursor style */
  cursorStyle: 'default' | 'pointer' | 'text'
  /** Multiplier for pause durations (1.0 = normal, 2.0 = double) */
  pauseMultiplier: number
  /** Custom timing overrides (optional) */
  customTimings?: Partial<ActionTimings>
}

export const DEFAULT_CONFIG: DemoConfig = {
  speed: 'normal',
  pacing: 'video',
  showKeystrokeOverlay: true,
  cursorStyle: 'default',
  pauseMultiplier: 1.0,
}

// =============================================================================
// Speed Presets (Legacy - kept for backwards compatibility)
// =============================================================================

export interface SpeedPreset {
  /** Mouse movement duration in ms */
  mouseMs: number
  /** Typing delay per character in ms */
  charMs: number
  /** Pause multiplier */
  pauseMultiplier: number
}

export const SPEED_PRESETS: Record<DemoConfig['speed'], SpeedPreset> = {
  slow: { mouseMs: 1200, charMs: 150, pauseMultiplier: 2.0 },
  normal: { mouseMs: 600, charMs: 100, pauseMultiplier: 1.0 },
  fast: { mouseMs: 300, charMs: 50, pauseMultiplier: 0.5 },
}

// =============================================================================
// Pacing Profile to Speed Preset mapping (for legacy compatibility)
// =============================================================================

export const PACING_TO_SPEED: Record<PacingProfile, DemoConfig['speed']> = {
  video: 'normal',
  presentation: 'slow',
  tutorial: 'normal',
  testing: 'fast',
  instant: 'fast',
}

// =============================================================================
// Demo Actions
// =============================================================================

export type DemoAction =
  | NavigateAction
  | WaitAction
  | MoveToAction
  | ClickAction
  | DoubleClickAction
  | TypeAction
  | PressKeyAction
  | DragAction
  | ScrollAction
  | HighlightAction
  | CommentAction
  | ExecuteAction
  | ClearEditorAction
  | CreateFileAction
  | SwitchFileAction
  | ValidateAction
  | ExpectCodeAction
  | ExpectCodeMatchesAction
  | ExpectDomAction
  | DropFromPaletteAction
  | MoveElementAction
  | DragResizeAction
  | DragPaddingAction
  | DragMarginAction
  | InlineEditAction
  | SelectInPreviewAction
  | SetPropertyAction
  | PickColorAction
  | AiPromptAction

interface NavigateAction {
  action: 'navigate'
  url: string
}

interface WaitAction {
  action: 'wait'
  /** Duration in milliseconds */
  duration: number
  /** Optional comment for video notes */
  comment?: string
}

interface MoveToAction {
  action: 'moveTo'
  /** CSS selector or nodeId */
  target: string
  /** Optional duration override in ms */
  duration?: number
}

interface ClickAction {
  action: 'click'
  /** Optional target - if not provided, clicks at current cursor position */
  target?: string
}

interface DoubleClickAction {
  action: 'doubleClick'
  /** Optional target */
  target?: string
}

interface TypeAction {
  action: 'type'
  /** Text to type */
  text: string
  /** Optional target to focus first */
  target?: string
}

interface PressKeyAction {
  action: 'pressKey'
  /** Key name (e.g., 'Enter', 'Tab', 'Escape') */
  key: string
  /** Optional modifier keys */
  modifiers?: ('Ctrl' | 'Alt' | 'Shift' | 'Meta')[]
}

interface DragAction {
  action: 'drag'
  /** CSS selector for drag start element */
  from: string
  /** CSS selector for drop target */
  to: string
}

interface ScrollAction {
  action: 'scroll'
  /** Optional target element to scroll */
  target?: string
  /** Scroll amount in pixels (positive = down) */
  deltaY: number
}

interface HighlightAction {
  action: 'highlight'
  /** CSS selector to highlight */
  target: string
  /** Duration in ms (default: 1000) */
  duration?: number
}

interface CommentAction {
  action: 'comment'
  /** Comment text for video notes */
  text: string
}

interface ExecuteAction {
  action: 'execute'
  /** JavaScript code to execute in browser */
  code: string
  /** Optional comment for logging */
  comment?: string
}

interface ClearEditorAction {
  action: 'clearEditor'
  /** Optional comment */
  comment?: string
}

interface CreateFileAction {
  action: 'createFile'
  /** File path (e.g., 'tokens.tok', 'components.com') */
  path: string
  /** File content */
  content: string
  /** Optional: switch to file after creation */
  switchTo?: boolean
}

interface SwitchFileAction {
  action: 'switchFile'
  /** File path to switch to */
  path: string
}

interface ValidateAction {
  action: 'validate'
  /** Validation checks to perform */
  checks: ValidationCheck[]
  /** Optional comment for logging */
  comment?: string
}

// =============================================================================
// Selectors (Architektur-Entscheidung E1) — strukturierte Objekte, keine
// String-Shortcuts. byId ist explizit; alle anderen sind semantisch und
// reorder-resistenter als Mirror-Node-IDs.
// =============================================================================

export type Selector =
  | { byId: string }
  | { byText: string | RegExp; nth?: number }
  | { byTag: string; nth?: number }
  | { byPath: string }
  | { byRole: string; nth?: number }
  | { byTestId: string }

// =============================================================================
// Validation actions (E2)
// =============================================================================

/** Inline expectCode runs immediately after a mutating action (sugar for the
 *  common pattern of "do this thing, then check the editor"). */
type InlineExpectCode = string | { code?: string; comment?: string }

/**
 * Strict-compares the editor source against an expected snapshot.
 * - Without `code` → learn mode: dumps the current editor contents.
 * - With `code` → strict-compare after normalization, line-diff on mismatch.
 */
interface ExpectCodeAction {
  action: 'expectCode'
  code?: string
  comment?: string
  normalize?: {
    collapseSpaces?: boolean
    trimEnds?: boolean
  }
}

/** Loose validation — regex on editor source. Useful for AI-generated code. */
interface ExpectCodeMatchesAction {
  action: 'expectCodeMatches'
  pattern: string | RegExp
  flags?: string
  comment?: string
}

/** A numeric expectation: exact value, range, or comparison. */
type NumExpect = number | { min?: number; max?: number }

/** A string expectation: exact, regex, or substring. */
type StrExpect = string | RegExp | { contains: string }

export interface DomCheck {
  selector: Selector
  label?: string
  tag?: StrExpect
  text?: StrExpect
  visible?: boolean
  width?: NumExpect
  height?: NumExpect
  paddingTop?: NumExpect
  paddingRight?: NumExpect
  paddingBottom?: NumExpect
  paddingLeft?: NumExpect
  marginTop?: NumExpect
  marginRight?: NumExpect
  marginBottom?: NumExpect
  marginLeft?: NumExpect
  color?: StrExpect
  background?: StrExpect
  childCount?: NumExpect
  layout?: {
    direction?: 'horizontal' | 'vertical'
    gap?: NumExpect
    align?: StrExpect
  }
  extras?: string[]
  [extra: string]: unknown
}

/**
 * Validate the rendered preview DOM against per-element expectations.
 * Without `checks` → learn mode dumps a snapshot of every Mirror-tagged
 * element. With `checks` → strict per-field comparison.
 */
interface ExpectDomAction {
  action: 'expectDom'
  checks?: DomCheck[]
  /** Optional restriction for learn mode — only dump these selectors. */
  learnSelectors?: Selector[]
  comment?: string
}

// =============================================================================
// High-level Mirror actions
//
// Wrap real Studio interactions. Each handler in runner.ts drives the demo
// cursor in parallel via withCursorSync (in MIRROR_ACTIONS_API).
// =============================================================================

/** Where in a target container a drop / move ends up. */
type DropTarget =
  | { kind: 'index'; index: number }
  | {
      kind: 'zone'
      zone:
        | 'top-left'
        | 'top-center'
        | 'top-right'
        | 'center-left'
        | 'center'
        | 'center-right'
        | 'bottom-left'
        | 'bottom-center'
        | 'bottom-right'
    }

interface DropFromPaletteAction {
  action: 'dropFromPalette'
  component: string
  target: Selector
  at: DropTarget
  comment?: string
  expectCode?: InlineExpectCode
}

interface MoveElementAction {
  action: 'moveElement'
  source: Selector
  target: Selector
  index: number
  comment?: string
  expectCode?: InlineExpectCode
}

interface DragResizeAction {
  action: 'dragResize'
  selector: Selector
  position: 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'
  deltaX: number
  deltaY: number
  bypassSnap?: boolean
  comment?: string
  expectCode?: InlineExpectCode
}

interface DragPaddingAction {
  action: 'dragPadding'
  selector: Selector
  side: 'top' | 'right' | 'bottom' | 'left'
  delta: number
  mode?: 'single' | 'all' | 'axis'
  bypassSnap?: boolean
  comment?: string
  expectCode?: InlineExpectCode
}

interface DragMarginAction {
  action: 'dragMargin'
  selector: Selector
  side: 'top' | 'right' | 'bottom' | 'left'
  delta: number
  mode?: 'single' | 'all' | 'axis'
  bypassSnap?: boolean
  comment?: string
  expectCode?: InlineExpectCode
}

interface InlineEditAction {
  action: 'inlineEdit'
  selector: Selector
  text: string
  charDelay?: number
  comment?: string
  expectCode?: InlineExpectCode
}

// === Property-Panel actions (B1) ===

interface SelectInPreviewAction {
  action: 'selectInPreview'
  selector: Selector
  comment?: string
  expectCode?: InlineExpectCode
}

interface SetPropertyAction {
  action: 'setProperty'
  selector: Selector
  prop: string
  value: string
  comment?: string
  expectCode?: InlineExpectCode
}

interface PickColorAction {
  action: 'pickColor'
  selector: Selector
  prop: string
  color: string
  comment?: string
  expectCode?: InlineExpectCode
}

// === AI / Draft-mode (B2, E3) ===

interface AiPromptAction {
  action: 'aiPrompt'
  prompt: string
  insertAt?: 'end' | { line: number }
  charDelay?: number
  comment?: string
  expectCodeMatches?: string | RegExp | { pattern: string | RegExp; comment?: string }
}

// =============================================================================
// Validation
// =============================================================================

export type ValidationCheck =
  | ExistsCheck
  | TextContainsCheck
  | ElementCountCheck
  | ValueCheck
  | FileExistsCheck
  | EditorContainsCheck
  | PreviewContainsCheck
  | NoLintErrorsCheck
  | ColorPickerClosedCheck

interface ExistsCheck {
  type: 'exists'
  /** CSS selector that must exist */
  selector: string
}

interface TextContainsCheck {
  type: 'textContains'
  /** CSS selector to find element */
  selector: string
  /** Text that element must contain */
  text: string
}

interface ElementCountCheck {
  type: 'elementCount'
  /** CSS selector to count */
  selector: string
  /** Expected count (exact) */
  count?: number
  /** Minimum count */
  min?: number
  /** Maximum count */
  max?: number
}

interface ValueCheck {
  type: 'value'
  /** CSS selector for input/textarea */
  selector: string
  /** Expected value */
  value: string
}

interface FileExistsCheck {
  type: 'fileExists'
  /** File path that must exist */
  path: string
}

interface EditorContainsCheck {
  type: 'editorContains'
  /** Text that editor must contain */
  text: string
}

interface PreviewContainsCheck {
  type: 'previewContains'
  /** CSS selector that must exist in preview */
  selector: string
  /** Optional text content to verify */
  text?: string
}

interface NoLintErrorsCheck {
  type: 'noLintErrors'
  /** Optional: allow warnings but fail on errors (default: fail on both) */
  allowWarnings?: boolean
}

interface ColorPickerClosedCheck {
  type: 'colorPickerClosed'
}

// =============================================================================
// Validation Result
// =============================================================================

export interface ValidationResult {
  success: boolean
  check: ValidationCheck
  message: string
  actual?: string | number
}

// =============================================================================
// Demo Script
// =============================================================================

export interface DemoScript {
  /** Script name */
  name: string
  /** Optional description */
  description?: string
  /** Optional config overrides */
  config?: Partial<DemoConfig>
  /** Script steps */
  steps: DemoAction[]
}

// =============================================================================
// Point Type
// =============================================================================

export interface Point {
  x: number
  y: number
}

// =============================================================================
// Timing
// =============================================================================

export interface StepTiming {
  /** Step index (1-based) */
  stepIndex: number
  /** Action type */
  action: string
  /** Target or description */
  detail?: string
  /** Execution time in milliseconds */
  executionMs: number
  /** Configured wait time (for wait actions) */
  configuredWaitMs?: number
}

export interface TimingReport {
  /** Total demo duration in ms */
  totalMs: number
  /** Individual step timings */
  steps: StepTiming[]
  /** Summary by action type */
  byAction: Record<string, { count: number; totalMs: number; avgMs: number }>
  /** Suggestions for optimization */
  suggestions: TimingSuggestion[]
}

export interface TimingSuggestion {
  /** Step index or action type */
  target: string
  /** Current timing */
  currentMs: number
  /** Suggested timing */
  suggestedMs: number
  /** Reason for suggestion */
  reason: string
}
