# Mirror Studio Module Specifications

Detaillierte Interface-Definitionen für alle Module.

---

## Core Module

### State Store

```typescript
// studio/core/state.ts

type Subscriber<T> = (state: T) => void

interface Store<T> {
  get(): T
  set(partial: Partial<T>): void
  subscribe(subscriber: Subscriber<T>): () => void
  reset(): void
}

function createStore<T>(initialState: T): Store<T>
```

### Event Bus

```typescript
// studio/core/events.ts

type EventHandler<T> = (payload: T) => void

interface EventBus<Events extends Record<string, any>> {
  on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): () => void
  emit<K extends keyof Events>(event: K, payload: Events[K]): void
  off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void
  clear(): void
}

interface StudioEvents {
  'source:changed': { source: string; origin: ChangeOrigin }
  'selection:changed': { nodeId: string | null; origin: SelectionOrigin }
  'breadcrumb:changed': { breadcrumb: BreadcrumbItem[] }
  'editor:cursor-moved': { line: number; column: number }
  'preview:element-clicked': { nodeId: string; element: HTMLElement }
  'panel:property-changed': { nodeId: string; property: string; value: string }
  'panel:property-removed': { nodeId: string; property: string }
  'panel:child-added': { nodeId: string; component: string; position: number }
  'panel:child-removed': { nodeId: string; childId: string }
  'panel:child-reordered': { nodeId: string; fromIndex: number; toIndex: number }
  'compile:requested': {}
  'compile:completed': { ast: AST; ir: IR | null; sourceMap: SourceMap }
  'compile:failed': { errors: ParseError[] }
  'command:executed': { command: Command }
  'command:undone': { command: Command }
  'command:redone': { command: Command }
  'file:created': { filename: string }
  'file:deleted': { filename: string }
  'file:renamed': { oldName: string; newName: string }
  'file:selected': { filename: string }
  'file:saved': { filename: string }
  'project:loaded': { project: Project }
  'project:saved': { project: Project }
}

type ChangeOrigin = 'editor' | 'panel' | 'llm' | 'external'
type SelectionOrigin = 'editor' | 'preview' | 'panel' | 'keyboard' | 'tree'
```

### Command System

```typescript
// studio/core/commands.ts

interface CommandResult {
  success: boolean
  error?: string
  data?: any
}

interface Command {
  readonly type: string
  readonly description: string
  execute(): CommandResult
  undo(): CommandResult
}

interface CommandExecutor {
  execute(command: Command): CommandResult
  undo(): CommandResult | null
  redo(): CommandResult | null
  canUndo(): boolean
  canRedo(): boolean
  getUndoStack(): Command[]
  getRedoStack(): Command[]
  clear(): void
}

// Built-in Commands
interface SetPropertyCommandParams {
  nodeId: string
  property: string
  value: string
}

interface RemovePropertyCommandParams {
  nodeId: string
  property: string
}

interface InsertComponentCommandParams {
  parentId: string
  component: string
  position?: 'first' | 'last' | number
  properties?: string
}

interface DeleteNodeCommandParams {
  nodeId: string
}

interface MoveNodeCommandParams {
  nodeId: string
  targetParentId: string
  position: number
}

interface BatchCommandParams {
  commands: Command[]
  description: string
}
```

---

## File Manager Module

```typescript
// studio/modules/file-manager/index.ts

type FileType = 'tokens' | 'component' | 'layout'

interface FileMetadata {
  name: string
  type: FileType
  created: Date
  modified: Date
  size: number
}

interface Project {
  id: string
  name: string
  files: string[]
  created: Date
  modified: Date
}

interface FileStore {
  files: Record<string, string>           // filename → content
  metadata: Record<string, FileMetadata>  // filename → metadata
  currentFile: string | null
  projects: Project[]
  currentProject: Project | null
  isDirty: Record<string, boolean>        // filename → hasUnsavedChanges
}

interface FileManagerOptions {
  storage: 'local' | 'api'
  apiEndpoint?: string
  autoSave?: boolean
  autoSaveInterval?: number
}

interface FileManager {
  // Store
  store: Store<FileStore>

  // File Operations
  createFile(name: string, type: FileType, content?: string): Promise<void>
  deleteFile(name: string): Promise<void>
  renameFile(oldName: string, newName: string): Promise<void>
  duplicateFile(name: string, newName: string): Promise<void>

  // Content
  getContent(name: string): string | null
  setContent(name: string, content: string): void
  saveFile(name: string): Promise<void>
  saveAllFiles(): Promise<void>

  // Selection
  selectFile(name: string): void
  getCurrentFile(): string | null
  getCurrentContent(): string | null

  // Project
  loadProject(id: string): Promise<void>
  saveProject(): Promise<void>
  createProject(name: string): Promise<Project>
  deleteProject(id: string): Promise<void>
  listProjects(): Promise<Project[]>

  // Queries
  getFileType(name: string): FileType
  getFileMetadata(name: string): FileMetadata | null
  getAllFiles(): string[]
  getFilesByType(type: FileType): string[]
  hasUnsavedChanges(): boolean

  // Events
  onFileChange(callback: (filename: string, content: string) => void): () => void
  onFileSelect(callback: (filename: string) => void): () => void
  onProjectChange(callback: (project: Project) => void): () => void
}

function createFileManager(options: FileManagerOptions): FileManager
```

---

## Compiler Module

```typescript
// studio/modules/compiler/index.ts

interface CompileOptions {
  target: 'dom' | 'react' | 'svelte'
  includeRuntime?: boolean
  sourceMap?: boolean
  minify?: boolean
}

interface CompilationResult {
  success: boolean
  ast: AST | null
  ir: IR | null
  sourceMap: SourceMap | null
  code: string | null
  errors: ParseError[]
  warnings: Warning[]
  timing: {
    parse: number
    transform: number
    generate: number
    total: number
  }
}

interface PreludeResult {
  prelude: string
  offset: number
  tokenCount: number
  componentCount: number
}

interface Compiler {
  // Compilation
  compile(source: string, options?: CompileOptions): CompilationResult
  compileWithPrelude(source: string, prelude: PreludeResult): CompilationResult

  // Prelude
  buildPrelude(
    files: Record<string, string>,
    currentFile: string
  ): PreludeResult

  // Incremental (future)
  invalidate(filename: string): void
  recompile(): CompilationResult

  // State
  getLastResult(): CompilationResult | null
  getErrors(): ParseError[]

  // Events
  onCompileStart(callback: () => void): () => void
  onCompileComplete(callback: (result: CompilationResult) => void): () => void
  onCompileError(callback: (errors: ParseError[]) => void): () => void
}

function createCompiler(options: CompileOptions): Compiler
```

---

## Picker System

### Base Picker

```typescript
// studio/pickers/base/picker.ts

type PickerPosition = 'below' | 'above' | 'left' | 'right' | 'auto'
type PickerTrigger = 'click' | 'keyboard' | 'programmatic'

interface PickerConfig {
  container?: HTMLElement           // Default: document.body
  position: PickerPosition
  offsetX?: number
  offsetY?: number
  closeOnSelect?: boolean           // Default: true
  closeOnClickOutside?: boolean     // Default: true
  closeOnEscape?: boolean           // Default: true
  animate?: boolean                 // Default: true
}

interface PickerCallbacks {
  onOpen?: () => void
  onClose?: () => void
  onSelect: (value: string) => void
  onChange?: (value: string) => void
}

abstract class BasePicker {
  protected config: PickerConfig
  protected callbacks: PickerCallbacks
  protected element: HTMLElement | null
  protected isOpen: boolean
  protected anchor: HTMLElement | null

  constructor(config: PickerConfig, callbacks: PickerCallbacks)

  // Lifecycle
  abstract render(): HTMLElement
  show(anchor: HTMLElement): void
  hide(): void
  toggle(anchor: HTMLElement): void
  destroy(): void

  // Value
  abstract getValue(): string
  abstract setValue(value: string): void

  // Position
  protected calculatePosition(anchor: HTMLElement): { top: number; left: number }
  protected adjustForViewport(pos: { top: number; left: number }): { top: number; left: number }

  // Events
  protected setupEventListeners(): void
  protected teardownEventListeners(): void
  protected handleKeyDown(event: KeyboardEvent): void
  protected handleClickOutside(event: MouseEvent): void
}
```

### Keyboard Navigation

```typescript
// studio/pickers/base/keyboard-nav.ts

interface KeyboardNavConfig {
  items: HTMLElement[]
  orientation: 'horizontal' | 'vertical' | 'grid'
  columns?: number                  // For grid
  wrap?: boolean                    // Wrap at boundaries
  onSelect: (item: HTMLElement, index: number) => void
  onCancel?: () => void
}

class KeyboardNav {
  private config: KeyboardNavConfig
  private selectedIndex: number

  constructor(config: KeyboardNavConfig)

  // Navigation
  moveUp(): void
  moveDown(): void
  moveLeft(): void
  moveRight(): void
  moveToFirst(): void
  moveToLast(): void

  // Selection
  selectCurrent(): void
  selectIndex(index: number): void

  // State
  getSelectedIndex(): number
  getSelectedItem(): HTMLElement | null
  setItems(items: HTMLElement[]): void

  // Event Handler
  handleKeyDown(event: KeyboardEvent): boolean
}
```

### Color Picker

```typescript
// studio/pickers/color/index.ts

interface ColorPalette {
  name: string
  colors: string[][]              // Grid of colors
}

interface ColorPickerConfig extends PickerConfig {
  initialColor?: string
  palettes?: ColorPalette[]
  showCustomTab?: boolean
  showOpacity?: boolean
  showHex?: boolean
  showRGB?: boolean
  recentColors?: string[]
  maxRecentColors?: number
}

interface ColorPickerCallbacks extends PickerCallbacks {
  onColorPreview?: (color: string) => void
}

class ColorPicker extends BasePicker {
  private currentTab: 'palette' | 'custom'
  private currentColor: string
  private recentColors: string[]

  constructor(config: ColorPickerConfig, callbacks: ColorPickerCallbacks)

  // BasePicker
  render(): HTMLElement
  getValue(): string
  setValue(value: string): void

  // Tabs
  switchTab(tab: 'palette' | 'custom'): void
  getCurrentTab(): 'palette' | 'custom'

  // Color
  setColor(color: string): void
  getColor(): string
  addToRecent(color: string): void

  // Custom Tab
  setHex(hex: string): void
  setRGB(r: number, g: number, b: number): void
  setHSL(h: number, s: number, l: number): void
}

function createColorPicker(
  config: ColorPickerConfig,
  callbacks: ColorPickerCallbacks
): ColorPicker
```

### Token Picker

```typescript
// studio/pickers/token/index.ts

interface TokenDefinition {
  name: string                    // e.g., "$accent.bg"
  value: string                   // e.g., "#007bff"
  type: 'color' | 'spacing' | 'size' | 'font' | 'other'
  category?: string               // e.g., "primary", "secondary"
}

interface TokenContext {
  property: string                // Current property being edited
  nodeType?: string               // Component type
  allowedTypes: TokenDefinition['type'][]
}

interface TokenPickerConfig extends PickerConfig {
  tokens: TokenDefinition[]
  context?: TokenContext
  showPreview?: boolean
  groupByCategory?: boolean
  searchable?: boolean
}

class TokenPicker extends BasePicker {
  private tokens: TokenDefinition[]
  private filteredTokens: TokenDefinition[]
  private context: TokenContext | null

  constructor(config: TokenPickerConfig, callbacks: PickerCallbacks)

  render(): HTMLElement
  getValue(): string
  setValue(value: string): void

  // Context
  setContext(context: TokenContext): void
  clearContext(): void

  // Filtering
  filterByType(types: TokenDefinition['type'][]): void
  filterByCategory(category: string): void
  search(query: string): void
  resetFilter(): void

  // Data
  setTokens(tokens: TokenDefinition[]): void
  getFilteredTokens(): TokenDefinition[]
}
```

### Icon Picker

```typescript
// studio/pickers/icon/index.ts

interface IconDefinition {
  name: string
  path: string                    // SVG path data
  category: string
  tags: string[]
}

interface IconPickerConfig extends PickerConfig {
  icons: IconDefinition[]
  categories?: string[]
  searchable?: boolean
  iconSize?: number
  columns?: number
}

class IconPicker extends BasePicker {
  private icons: IconDefinition[]
  private filteredIcons: IconDefinition[]
  private searchQuery: string
  private activeCategory: string | null

  constructor(config: IconPickerConfig, callbacks: PickerCallbacks)

  render(): HTMLElement
  getValue(): string
  setValue(value: string): void

  // Search
  search(query: string): void
  clearSearch(): void

  // Categories
  setCategory(category: string | null): void
  getCategories(): string[]

  // Icons
  setIcons(icons: IconDefinition[]): void
  getIcon(name: string): IconDefinition | null
}
```

### Animation Picker

```typescript
// studio/pickers/animation/index.ts

interface AnimationPreset {
  name: string
  keyframes: string
  duration: string
  easing: string
  preview?: () => void
}

interface AnimationPickerConfig extends PickerConfig {
  presets: AnimationPreset[]
  showPreview?: boolean
  allowCustom?: boolean
}

class AnimationPicker extends BasePicker {
  private presets: AnimationPreset[]
  private selectedPreset: AnimationPreset | null

  constructor(config: AnimationPickerConfig, callbacks: PickerCallbacks)

  render(): HTMLElement
  getValue(): string
  setValue(value: string): void

  // Preview
  previewAnimation(preset: AnimationPreset): void
  stopPreview(): void

  // Selection
  selectPreset(name: string): void
  getSelectedPreset(): AnimationPreset | null
}
```

---

## Panels

### Property Panel

```typescript
// studio/panels/property/index.ts

interface PropertyPanelConfig {
  container: HTMLElement
  showCategories?: boolean
  showChildList?: boolean
  showActions?: boolean
  enableDragDrop?: boolean
}

interface PropertyPanelCallbacks {
  onPropertyChange: (nodeId: string, property: string, value: string) => void
  onPropertyRemove: (nodeId: string, property: string) => void
  onChildAdd: (nodeId: string, component: string) => void
  onChildRemove: (nodeId: string, childId: string) => void
  onChildReorder: (nodeId: string, fromIndex: number, toIndex: number) => void
  onExtractComponent: (nodeId: string, name: string) => void
}

class PropertyPanel {
  private config: PropertyPanelConfig
  private callbacks: PropertyPanelCallbacks
  private currentNodeId: string | null
  private extractor: PropertyExtractor
  private modifier: CodeModifier

  constructor(
    config: PropertyPanelConfig,
    callbacks: PropertyPanelCallbacks
  )

  // Display
  show(nodeId: string): void
  hide(): void
  refresh(): void
  clear(): void

  // Dependencies
  updateDependencies(
    extractor: PropertyExtractor,
    modifier: CodeModifier
  ): void

  // State
  getCurrentNodeId(): string | null
  isVisible(): boolean
}

// studio/panels/property/ui-renderer.ts

interface UIRendererConfig {
  showIcons?: boolean
  collapsibleCategories?: boolean
  inlineEditing?: boolean
}

class UIRenderer {
  constructor(config: UIRendererConfig)

  render(element: ExtractedElement): HTMLElement
  renderCategory(
    category: PropertyCategory,
    properties: ExtractedProperty[]
  ): HTMLElement
  renderProperty(property: ExtractedProperty): HTMLElement
  renderInput(property: ExtractedProperty): HTMLInputElement
  renderChildList(children: ChildElement[]): HTMLElement
  renderActions(nodeId: string): HTMLElement
}

// studio/panels/property/change-handler.ts

class ChangeHandler {
  constructor(
    modifier: CodeModifier,
    executor: CommandExecutor
  )

  handlePropertyChange(
    nodeId: string,
    property: string,
    value: string
  ): CommandResult

  handlePropertyRemove(
    nodeId: string,
    property: string
  ): CommandResult

  handleAddChild(
    parentId: string,
    component: string,
    position?: number
  ): CommandResult

  handleRemoveChild(
    parentId: string,
    childId: string
  ): CommandResult
}
```

### Tree Panel

```typescript
// studio/panels/tree/index.ts

interface TreeNode {
  id: string
  name: string
  type: string
  children: TreeNode[]
  isExpanded: boolean
  isSelected: boolean
  depth: number
}

interface TreePanelConfig {
  container: HTMLElement
  showIcons?: boolean
  indentSize?: number
  expandable?: boolean
}

interface TreePanelCallbacks {
  onSelect: (nodeId: string) => void
  onExpand: (nodeId: string) => void
  onCollapse: (nodeId: string) => void
}

class TreePanel {
  constructor(
    config: TreePanelConfig,
    callbacks: TreePanelCallbacks
  )

  // Rendering
  render(ast: AST): void
  refresh(): void

  // Selection
  selectNode(nodeId: string): void
  getSelectedNode(): string | null

  // Expansion
  expandNode(nodeId: string): void
  collapseNode(nodeId: string): void
  expandAll(): void
  collapseAll(): void
  expandToNode(nodeId: string): void

  // State
  getTreeData(): TreeNode[]
}
```

### File Panel

```typescript
// studio/panels/files/index.ts

interface FilePanelConfig {
  container: HTMLElement
  showIcons?: boolean
  groupByType?: boolean
  sortBy?: 'name' | 'type' | 'modified'
}

interface FilePanelCallbacks {
  onSelect: (filename: string) => void
  onCreate: (type: FileType) => void
  onDelete: (filename: string) => void
  onRename: (oldName: string, newName: string) => void
  onDuplicate: (filename: string) => void
}

class FilePanel {
  constructor(
    config: FilePanelConfig,
    callbacks: FilePanelCallbacks
  )

  // Rendering
  render(files: FileMetadata[], currentFile: string | null): void
  refresh(): void

  // Selection
  selectFile(filename: string): void
  getSelectedFile(): string | null

  // Context Menu
  showContextMenu(filename: string, position: { x: number; y: number }): void
  hideContextMenu(): void
}
```

---

## Preview System

```typescript
// studio/preview/index.ts

interface PreviewConfig {
  container: HTMLElement
  enableSelection?: boolean
  enableHover?: boolean
  showOverlay?: boolean
}

interface PreviewCallbacks {
  onSelect: (nodeId: string) => void
  onHover: (nodeId: string | null) => void
  onClick: (nodeId: string, element: HTMLElement) => void
}

class PreviewController {
  constructor(
    config: PreviewConfig,
    callbacks: PreviewCallbacks
  )

  // Lifecycle
  attach(): void
  detach(): void

  // Rendering
  render(mode: PreviewMode, data: PreviewData): void
  clear(): void

  // Selection
  select(nodeId: string): void
  clearSelection(): void
  getSelectedNode(): string | null

  // Hover
  hover(nodeId: string | null): void

  // Source Map
  setSourceMap(sourceMap: SourceMap): void
}

type PreviewMode = 'tokens' | 'components' | 'layout'

type PreviewData =
  | { mode: 'tokens'; tokens: TokenDefinition[] }
  | { mode: 'components'; components: ComponentDefinition[] }
  | { mode: 'layout'; code: string; runtime: string }

// studio/preview/token-preview.ts

class TokenPreview {
  render(tokens: TokenDefinition[]): HTMLElement
  highlightToken(name: string): void
  clearHighlight(): void
}

// studio/preview/component-preview.ts

class ComponentPreview {
  render(components: ComponentDefinition[]): HTMLElement
  highlightComponent(name: string): void
  clearHighlight(): void
}

// studio/preview/layout-preview.ts

class LayoutPreview {
  render(code: string): void
  injectRuntime(runtime: string): void
  executeCode(): void
  cleanup(): void
}
```

---

## Editor System

```typescript
// studio/editor/index.ts

interface EditorConfig {
  container: HTMLElement
  language?: string
  theme?: string
  lineNumbers?: boolean
  lineWrapping?: boolean
  autocomplete?: boolean
}

interface EditorCallbacks {
  onContentChange: (content: string) => void
  onCursorMove: (position: { line: number; column: number }) => void
  onFocus: () => void
  onBlur: () => void
  onSelectionChange: (selection: EditorSelection) => void
}

interface EditorSelection {
  from: { line: number; column: number }
  to: { line: number; column: number }
  text: string
}

class EditorController {
  constructor(
    config: EditorConfig,
    callbacks: EditorCallbacks
  )

  // Lifecycle
  initialize(codeMirrorView: EditorView): void
  destroy(): void

  // Content
  getContent(): string
  setContent(content: string): void
  insertAt(position: number, text: string): void
  replaceRange(from: number, to: number, text: string): void

  // Cursor
  getCursor(): { line: number; column: number }
  setCursor(line: number, column: number): void

  // Selection
  getSelection(): EditorSelection | null
  setSelection(from: number, to: number): void
  selectLine(line: number): void

  // Scrolling
  scrollToLine(line: number, center?: boolean): void
  scrollToLineAndSelect(line: number): void

  // Focus
  focus(): void
  blur(): void
  hasFocus(): boolean

  // Dispatch
  dispatch(transaction: TransactionSpec): void
}
```

---

## Sync System

```typescript
// studio/sync/index.ts

interface SyncConfig {
  cursorDebounce?: number         // Default: 150ms
  selectionDebounce?: number      // Default: 0ms
}

interface SyncTargets {
  scrollEditorToLine: (line: number) => void
  highlightPreviewElement: (nodeId: string | null) => void
  updatePropertyPanel: (nodeId: string | null) => void
}

class SyncCoordinator {
  constructor(config: SyncConfig)

  // Targets
  setTargets(targets: Partial<SyncTargets>): void

  // Source Map
  setSourceMap(sourceMap: SourceMap): void

  // Sync Operations
  handleSelectionChange(nodeId: string, origin: SelectionOrigin): void
  handleCursorMove(line: number, column: number): void
  clearSelection(origin: SelectionOrigin): void

  // State
  isSyncing(): boolean
  getLastSyncOrigin(): SelectionOrigin | null
}
```

---

## Bootstrap

```typescript
// studio/bootstrap.ts

interface StudioConfig {
  // Required
  editor: HTMLElement
  preview: HTMLElement

  // Optional
  propertyPanel?: HTMLElement
  filePanel?: HTMLElement
  treePanel?: HTMLElement

  // Options
  storage?: 'local' | 'api'
  apiEndpoint?: string
  autoSave?: boolean
  theme?: 'light' | 'dark'
}

interface StudioInstance {
  // Core
  state: Store<StudioState>
  events: EventBus<StudioEvents>
  executor: CommandExecutor

  // Modules
  fileManager: FileManager
  compiler: Compiler

  // Controllers
  editor: EditorController
  preview: PreviewController
  sync: SyncCoordinator

  // Panels
  propertyPanel: PropertyPanel | null
  filePanel: FilePanel | null
  treePanel: TreePanel | null

  // Pickers
  pickers: {
    color: ColorPicker
    token: TokenPicker
    icon: IconPicker
    animation: AnimationPicker
  }

  // Lifecycle
  destroy(): void
}

function initializeStudio(config: StudioConfig): Promise<StudioInstance>
```
