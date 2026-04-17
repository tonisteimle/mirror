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
  // Positioning
  position: string
  left: string
  top: string
  right: string
  bottom: string
  zIndex: string
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
  background: string
  backgroundImage: string
  color: string
  borderColor: string
  // Border
  borderWidth: string
  borderTopWidth: string
  borderRightWidth: string
  borderBottomWidth: string
  borderLeftWidth: string
  borderRadius: string
  borderTopLeftRadius: string
  borderTopRightRadius: string
  borderBottomRightRadius: string
  borderBottomLeftRadius: string
  borderStyle: string
  // Typography
  fontSize: string
  fontWeight: string
  fontFamily: string
  fontStyle: string
  textAlign: string
  textDecoration: string
  textTransform: string
  // Flex
  flex: string
  flexGrow: string
  flexShrink: string
  // Effects
  opacity: string
  boxShadow: string
  transform: string
  filter: string
  backdropFilter: string
  transition: string
  animation: string
  // Text overflow
  textOverflow: string
  whiteSpace: string
  lineHeight: string
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
  /** Additional details for debugging */
  details?: string[]
}

/**
 * Structure expectation for tree validation
 */
export interface StructureExpectation {
  /** Expected tag name */
  tag?: string
  /** Node ID or structure expectation for children */
  children?: (string | StructureExpectation)[]
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

/** Array of test cases (used for grouping related tests) */
export type TestSuite = TestCase[]

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
  // DOM Bridge - declarative validation
  dom: DOMAPI
  // State
  state: StateAPI
  // Utilities
  utils: UtilsAPI
  // Panels (Property, Tree, Files)
  panel: PanelAPI
  // Zag Components
  zag: ZagAPI
  // Studio-level operations
  studio: StudioAPI
  // Fixtures (test data)
  fixtures: FixturesAPI
}

export interface FixturesAPI {
  /** List all available fixtures */
  list(): string[]
  /** Get fixture by name */
  get(
    name: string
  ): { name: string; category: string; code: string; description?: string } | undefined
  /** Get fixtures by category */
  getByCategory(
    category: string
  ): { name: string; category: string; code: string; description?: string }[]
  /** Load fixture into editor and compile */
  load(name: string): Promise<void>
  /** Load code directly */
  loadCode(code: string): Promise<void>
  /** Register custom fixture */
  register(fixture: { name: string; category: string; code: string; description?: string }): void
}

export interface DOMAPI {
  /** Verify element matches expectations, throws on failure */
  expect(nodeId: string, expectations: DOMExpectations): void
  /** Verify element matches expectations, returns result */
  verify(nodeId: string, expectations: DOMExpectations): DOMVerifyResult
  /** Verify multiple elements */
  verifyAll(expectations: Record<string, DOMExpectations>): DOMVerifyResult[]
  /** Verify a tree structure */
  verifyTree(rootId: string, tree: DOMTreeExpectation): DOMVerifyResult[]
}

export interface DOMExpectations {
  // Element
  tag?: string
  exists?: boolean
  visible?: boolean
  // Text
  text?: string
  textContains?: string
  // Children
  children?: number | string[]
  childTags?: string[]
  // Layout
  hor?: boolean
  ver?: boolean
  wrap?: boolean
  center?: boolean
  spread?: boolean
  justifyContent?: string
  alignItems?: string
  // Dimensions
  w?: number | 'full' | 'auto'
  h?: number | 'full' | 'auto'
  // Spacing
  pad?: number | [number, number] | [number, number, number, number]
  gap?: number
  // Colors
  bg?: string
  col?: string
  boc?: string
  // Border
  bor?: number
  rad?: number
  // Typography
  fs?: number
  weight?: string | number
  italic?: boolean
  uppercase?: boolean
  // Effects
  shadow?: boolean
  opacity?: number
  // Attributes
  placeholder?: string
  href?: string
  src?: string
}

export interface DOMTreeExpectation extends Omit<DOMExpectations, 'children'> {
  children?: DOMTreeExpectation[]
}

export interface DOMVerifyResult {
  passed: boolean
  nodeId: string
  failures: Array<{
    property: string
    expected: string
    actual: string
    message: string
  }>
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

export interface KeyModifiers {
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
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
  /** Press key with optional modifiers */
  pressKey(key: string, modifiers?: KeyModifiers): Promise<void>
  /** Press key on specific element */
  pressKeyOn(nodeId: string, key: string, modifiers?: KeyModifiers): Promise<void>
  /** Press sequence of keys */
  pressSequence(keys: string[], delayBetween?: number): Promise<void>
  /** Type text character by character */
  typeText(text: string, delayPerChar?: number): Promise<void>
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
  /** Drag component from palette to alignment zone (9-point grid for empty containers) */
  dragToAlignmentZone(
    component: string,
    target: string,
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
  ): Promise<void>
  /** Double-click on resize handle to set dimension to full */
  doubleClickResizeHandle(
    nodeId: string,
    position: 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'
  ): Promise<void>
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
  /** Assert code does NOT contain pattern */
  codeNotContains(pattern: string | RegExp): void
  /** Assert code equals */
  codeEquals(expected: string): void
  /** Assert selection */
  isSelected(nodeId: string): void

  // === Node-specific Code Assertions ===

  /** Assert a specific node has a property in its code line */
  nodeHasProperty(nodeId: string, property: string, value?: string): void
  /** Assert a specific line contains pattern */
  lineContains(lineNumber: number, pattern: string | RegExp): void
  /** Assert a specific line does NOT contain pattern */
  lineNotContains(lineNumber: number, pattern: string | RegExp): void
  /** Assert the exact code line of a node */
  nodeLineEquals(nodeId: string, expected: string): void

  // === Side Effect Checks ===

  /** Snapshot current code for later comparison */
  snapshotCode(): string
  /** Assert only specific lines changed since snapshot */
  onlyLinesChanged(snapshot: string, allowedLines: number[]): void
  /** Assert code unchanged except for specific line */
  codeUnchangedExcept(snapshot: string, changedLine: number): void

  // === Visual Validations ===

  /** Assert element has specific icon */
  hasIcon(nodeId: string, iconName: string): void
  /** Assert icon has specific color */
  hasIconColor(nodeId: string, color: string): void
  /** Assert image has specific src */
  hasImageSrc(nodeId: string, src: string): void

  // === Structure Validations ===

  /** Assert element is child of parent */
  isChildOf(childId: string, parentId: string): void
  /** Assert nodeA comes before nodeB in sibling order */
  isSiblingBefore(nodeA: string, nodeB: string): void
  /** Assert tree structure matches expectation */
  hasStructure(rootId: string, expected: StructureExpectation): void
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
  /** Wait for element to exist */
  waitForElement(nodeId: string, timeout?: number): Promise<HTMLElement>
  /** Wait for element to have specific style */
  waitForStyle(nodeId: string, property: string, value: string, timeout?: number): Promise<void>
  /** Wait for element count */
  waitForCount(selector: string, count: number, timeout?: number): Promise<void>
  /** Wait for CSS animations/transitions to complete */
  waitForAnimation(nodeId?: string, timeout?: number): Promise<void>
  /** Wait for no pending changes */
  waitForIdle(timeout?: number): Promise<void>
  /** Log message */
  log(message: string): void
  /** Take snapshot of current state */
  snapshot(): { code: string; nodeIds: string[]; selection: string | null }
}

// =============================================================================
// Panel API
// =============================================================================

export interface PanelAPI {
  /** Property Panel operations */
  property: PropertyPanelAPI
  /** Tree Panel operations */
  tree: TreePanelAPI
  /** Files Panel operations */
  files: FilesPanelAPI
}

export interface PropertyPanelAPI {
  /** Check if property panel is visible */
  isVisible(): boolean
  /** Get currently selected node ID */
  getSelectedNodeId(): string | null
  /** Get a property value */
  getPropertyValue(name: string): string | null
  /** Get all properties */
  getAllProperties(): Record<string, string>
  /** Set a property value */
  setProperty(name: string, value: string): Promise<boolean>
  /** Remove a property */
  removeProperty(name: string): Promise<boolean>
  /** Toggle a boolean property */
  toggleProperty(name: string, enabled: boolean): Promise<boolean>
  /** Get token options for a property type */
  getTokenOptions(property: string): string[]
  /** Click a token button */
  clickToken(property: string, tokenName: string): Promise<boolean>
  /** Get all section names */
  getSections(): string[]
  /** Check if section is expanded */
  isSectionExpanded(sectionName: string): boolean
  /** Toggle section expanded state */
  toggleSection(sectionName: string): void
  /** Get input value by name */
  getInputValue(inputName: string): string | null
  /** Set input value by name */
  setInputValue(inputName: string, value: string): Promise<boolean>
}

export interface TreePanelAPI {
  /** Get all tree nodes */
  getNodes(): TreeNode[]
  /** Get currently selected node */
  getSelected(): string | null
  /** Select a node */
  select(nodeId: string): void
  /** Expand a node */
  expand(nodeId: string): void
  /** Collapse a node */
  collapse(nodeId: string): void
  /** Expand all nodes */
  expandAll(): void
  /** Collapse all nodes */
  collapseAll(): void
}

export interface TreeNode {
  nodeId: string
  label: string
  depth: number
  expanded: boolean
  selected: boolean
}

export interface FilesPanelAPI {
  /** List all project files */
  list(): string[]
  /** Get file content */
  getContent(filename: string): string | null
  /** Create a new file */
  create(name: string, content?: string): Promise<boolean>
  /** Open a file */
  open(name: string): Promise<boolean>
  /** Delete a file */
  delete(name: string): Promise<boolean>
  /** Rename a file */
  rename(oldName: string, newName: string): Promise<boolean>
  /** Get current file name */
  getCurrentFile(): string | null
  /** Get file type */
  getFileType(filename: string): string
}

// =============================================================================
// Zag API
// =============================================================================

export interface ZagAPI {
  /** Get Zag machine state for element */
  getState(nodeId: string): ZagState | null

  // Overlay components (Dialog, Tooltip, Select)
  /** Check if overlay is open */
  isOpen(nodeId: string): boolean
  /** Open overlay */
  open(nodeId: string): Promise<void>
  /** Close overlay */
  close(nodeId: string): Promise<void>

  // Form controls (Checkbox, Switch)
  /** Check if control is checked */
  isChecked(nodeId: string): boolean
  /** Check the control */
  check(nodeId: string): Promise<void>
  /** Uncheck the control */
  uncheck(nodeId: string): Promise<void>
  /** Toggle check state */
  toggle(nodeId: string): Promise<void>

  // Value components (Slider, Input, Select)
  /** Get current value */
  getValue(nodeId: string): unknown
  /** Set value */
  setValue(nodeId: string, value: unknown): Promise<void>

  // Tabs
  /** Get active tab */
  getActiveTab(nodeId: string): string | null
  /** Select tab by value */
  selectTab(nodeId: string, tabValue: string): Promise<void>
  /** Get all tab values */
  getAllTabs(nodeId: string): string[]

  // Select/Dropdown
  /** Get selected option */
  getSelectedOption(nodeId: string): string | null
  /** Select an option */
  selectOption(nodeId: string, optionValue: string): Promise<void>
  /** Get all options */
  getOptions(nodeId: string): string[]

  // Radio Group
  /** Get selected radio value */
  getSelectedRadio(nodeId: string): string | null
  /** Select a radio option */
  selectRadio(nodeId: string, value: string): Promise<void>

  // Events
  /** Send event to Zag machine */
  send(nodeId: string, event: string, payload?: unknown): Promise<void>
}

export interface ZagState {
  scope: string
  value: string
  context: Record<string, unknown>
}

// =============================================================================
// Studio API
// =============================================================================

export interface StudioStateSnapshot {
  code: string
  selection: string | null
  nodeIds: string[]
  undoStackSize: number
  redoStackSize: number
  compileErrors: string[]
}

export interface StudioAPI {
  /** History operations */
  history: HistoryAPI
  /** Viewport operations */
  viewport: ViewportAPI

  // Test Isolation
  /** Reset studio to clean state for testing */
  reset(): Promise<void>
  /** Reset selection only */
  resetSelection(): void
  /** Get current state snapshot for comparison */
  getStateSnapshot(): StudioStateSnapshot

  // Project management
  /** Create new project */
  newProject(): Promise<void>
  /** Load example by name */
  loadExample(name: string): Promise<boolean>

  // Compilation
  /** Force compile */
  compile(): Promise<void>
  /** Get AST */
  getAST(): unknown
  /** Get IR */
  getIR(): unknown
  /** Get SourceMap */
  getSourceMap(): unknown
  /** Get compile errors */
  getCompileErrors(): string[]
  /** Get generated HTML */
  getGeneratedCode(): string

  // UI State
  /** Get current theme */
  getTheme(): 'light' | 'dark'
  /** Set theme */
  setTheme(theme: 'light' | 'dark'): void
  /** Check panel visibility */
  isPanelVisible(panel: string): boolean
  /** Set panel visibility */
  setPanelVisible(panel: string, visible: boolean): void

  // Selection
  /** Get current selection */
  getSelection(): string | null
  /** Set selection */
  setSelection(nodeId: string | null): Promise<void>
  /** Clear selection */
  clearSelection(): void

  // Notifications
  /** Show toast notification */
  toast(message: string, type?: 'success' | 'error' | 'info'): Promise<void>

  // Wait helpers
  /** Wait for compile to complete */
  waitForCompile(timeout?: number): Promise<void>
  /** Wait for selection */
  waitForSelection(timeout?: number): Promise<string>
}

export interface HistoryAPI {
  /** Check if can undo */
  canUndo(): boolean
  /** Check if can redo */
  canRedo(): boolean
  /** Get undo stack size */
  getUndoStackSize(): number
  /** Get redo stack size */
  getRedoStackSize(): number
  /** Get last command name */
  getLastCommand(): string | null
  /** Perform undo */
  undo(): Promise<boolean>
  /** Perform redo */
  redo(): Promise<boolean>
  /** Clear history */
  clear(): void
}

export interface ViewportAPI {
  /** Get viewport size */
  getSize(): { width: number; height: number }
  /** Set viewport size */
  setSize(width: number, height: number): Promise<void>
  /** Get zoom level */
  getZoom(): number
  /** Set zoom level */
  setZoom(zoom: number): Promise<void>
  /** Scroll to position */
  scrollTo(x: number, y: number): Promise<void>
  /** Get scroll position */
  getScroll(): { x: number; y: number }
}
