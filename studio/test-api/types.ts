/**
 * Mirror Test Framework - Types
 *
 * Core type definitions for the comprehensive test framework.
 */

// =============================================================================
// Element Inspection
// =============================================================================

export interface ElementInfo {
  /** Node ID (data-mirror-id) */
  nodeId: string
  /** Tag name (div, button, span, etc.) */
  tagName: string
  /** Text content (direct text, not children) */
  textContent: string
  /** All text including children */
  fullText: string
  /** Computed styles (subset of relevant ones) */
  styles: ComputedStyles
  /** HTML attributes */
  attributes: Record<string, string>
  /** Data attributes */
  dataAttributes: Record<string, string>
  /** Bounding rect */
  bounds: DOMRect
  /** Child node IDs */
  children: string[]
  /** Parent node ID */
  parent: string | null
  /** Is visible? */
  visible: boolean
  /** Is interactive? (button, input, etc.) */
  interactive: boolean
}

export interface ComputedStyles {
  // Layout
  display: string
  flexDirection: string
  flexWrap: string
  justifyContent: string
  alignItems: string
  gap: string
  // Size
  width: string
  height: string
  minWidth: string
  maxWidth: string
  minHeight: string
  maxHeight: string
  // Spacing
  padding: string
  paddingTop: string
  paddingRight: string
  paddingBottom: string
  paddingLeft: string
  margin: string
  marginTop: string
  marginRight: string
  marginBottom: string
  marginLeft: string
  // Colors
  backgroundColor: string
  color: string
  borderColor: string
  // Border
  borderWidth: string
  borderRadius: string
  // Typography
  fontSize: string
  fontWeight: string
  fontFamily: string
  fontStyle: string
  textAlign: string
  textDecoration: string
  textTransform: string
  // Effects
  opacity: string
  boxShadow: string
  transform: string
  // Visibility
  visibility: string
  overflow: string
  overflowX: string
  overflowY: string
  cursor: string
  pointerEvents: string
}

// =============================================================================
// Assertions
// =============================================================================

export interface AssertionResult {
  passed: boolean
  message: string
  expected?: unknown
  actual?: unknown
  diff?: string
}

export interface AssertionOptions {
  /** Custom error message */
  message?: string
  /** Tolerance for numeric comparisons */
  tolerance?: number
  /** Ignore case for string comparisons */
  ignoreCase?: boolean
}

// =============================================================================
// Test Cases
// =============================================================================

export interface TestCase {
  /** Test name */
  name: string
  /** Test category (for grouping) */
  category?: string
  /** Setup code (Mirror DSL) */
  setup?: string
  /** Test function */
  run: (api: TestAPI) => Promise<void>
  /** Cleanup function */
  cleanup?: (api: TestAPI) => Promise<void>
  /** Skip this test? */
  skip?: boolean
  /** Only run this test? */
  only?: boolean
  /** Tags for filtering */
  tags?: string[]
}

export interface TestResult {
  name: string
  category?: string
  passed: boolean
  duration: number
  assertions: AssertionResult[]
  error?: string
  /** Code before test */
  codeBefore?: string
  /** Code after test */
  codeAfter?: string
  /** Screenshot (base64) if taken */
  screenshot?: string
}

export interface TestSuiteResult {
  name: string
  passed: number
  failed: number
  skipped: number
  duration: number
  results: TestResult[]
}

// =============================================================================
// Test API
// =============================================================================

export interface TestAPI {
  // Editor
  editor: EditorAPI
  // Preview inspection
  preview: PreviewAPI
  // Interactions
  interact: InteractionAPI
  // Assertions
  assert: AssertionAPI
  // State
  state: StateAPI
  // Utilities
  utils: UtilsAPI
}

export interface EditorAPI {
  /** Get current code */
  getCode(): string
  /** Set code and compile */
  setCode(code: string): Promise<void>
  /** Insert code at position */
  insertAt(code: string, line: number, indent?: number): void
  /** Get cursor position */
  getCursor(): { line: number; column: number }
  /** Set cursor position */
  setCursor(line: number, column: number): void
  /** Trigger autocomplete */
  triggerAutocomplete(): void
  /** Get autocomplete suggestions */
  getCompletions(): string[]
  /** Undo */
  undo(): void
  /** Redo */
  redo(): void
}

export interface PreviewAPI {
  /** Get all node IDs */
  getNodeIds(): string[]
  /** Get element info by node ID */
  inspect(nodeId: string): ElementInfo | null
  /** Find elements by selector within preview */
  query(selector: string): ElementInfo[]
  /** Find element by text content */
  findByText(text: string, options?: { exact?: boolean }): ElementInfo | null
  /** Get root element */
  getRoot(): ElementInfo | null
  /** Get children of element */
  getChildren(nodeId: string): ElementInfo[]
  /** Check if element exists */
  exists(nodeId: string): boolean
  /** Wait for element to appear */
  waitFor(nodeId: string, timeout?: number): Promise<ElementInfo>
  /** Take screenshot */
  screenshot(): Promise<string>
}

export interface InteractionAPI {
  /** Click element */
  click(nodeId: string): Promise<void>
  /** Double click */
  doubleClick(nodeId: string): Promise<void>
  /** Hover over element */
  hover(nodeId: string): Promise<void>
  /** Leave hover */
  unhover(nodeId: string): Promise<void>
  /** Focus element */
  focus(nodeId: string): Promise<void>
  /** Blur element */
  blur(nodeId: string): Promise<void>
  /** Type text into input */
  type(nodeId: string, text: string): Promise<void>
  /** Clear input */
  clear(nodeId: string): Promise<void>
  /** Press key */
  pressKey(key: string): Promise<void>
  /** Select element in preview */
  select(nodeId: string): void
  /** Clear selection */
  clearSelection(): void
  /** Drag from palette */
  dragFromPalette(component: string, target: string, index: number): Promise<void>
  /** Drag from palette to absolute position (for stacked containers) */
  dragToPosition(component: string, target: string, x: number, y: number): Promise<void>
  /** Move element */
  moveElement(source: string, target: string, index: number): Promise<void>
}

export interface AssertionAPI {
  /** Assert condition is true */
  ok(condition: boolean, message?: string): void
  /** Assert values are equal */
  equals<T>(actual: T, expected: T, message?: string): void
  /** Assert value matches pattern */
  matches(actual: string, pattern: RegExp, message?: string): void
  /** Assert value contains substring */
  contains(actual: string, substring: string, message?: string): void
  /** Assert element has style */
  hasStyle(nodeId: string, property: keyof ComputedStyles, value: string): void
  /** Assert element has text */
  hasText(nodeId: string, text: string, options?: { exact?: boolean }): void
  /** Assert element exists */
  exists(nodeId: string, message?: string): void
  /** Assert element is visible */
  isVisible(nodeId: string, message?: string): void
  /** Assert element has children count */
  hasChildren(nodeId: string, count: number): void
  /** Assert element has attribute */
  hasAttribute(nodeId: string, attr: string, value?: string): void
  /** Assert code contains pattern */
  codeContains(pattern: string | RegExp): void
  /** Assert code equals */
  codeEquals(expected: string): void
  /** Assert selection */
  isSelected(nodeId: string): void
}

export interface StateAPI {
  /** Get current selection */
  getSelection(): string | null
  /** Get Zag machine state for component */
  getZagState(nodeId: string): unknown
  /** Get custom state (toggle, exclusive) */
  getCustomState(nodeId: string): string | null
  /** Get source map */
  getSourceMap(): unknown
  /** Get prelude offset */
  getPreludeOffset(): number
}

export interface UtilsAPI {
  /** Wait for milliseconds */
  delay(ms: number): Promise<void>
  /** Wait for compilation */
  waitForCompile(timeout?: number): Promise<void>
  /** Wait for condition */
  waitUntil(condition: () => boolean, timeout?: number): Promise<void>
  /** Log message */
  log(message: string): void
  /** Take snapshot of current state */
  snapshot(): { code: string; nodeIds: string[]; selection: string | null }
}
