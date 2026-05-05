import {
  EditorState,
  EditorSelection,
  RangeSetBuilder,
  Prec,
  Annotation,
  Transaction,
} from '@codemirror/state'
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightActiveLine,
  drawSelection,
  Decoration,
  ViewPlugin,
} from '@codemirror/view'
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  indentMore,
  indentLess,
  undo,
  redo,
  undoDepth,
  redoDepth,
  isolateHistory,
} from '@codemirror/commands'
import {
  autocompletion,
  completionKeymap,
  startCompletion,
  closeCompletion,
  completionStatus,
  currentCompletions,
} from '@codemirror/autocomplete'
import { indentUnit } from '@codemirror/language'
import { linter, lintGutter, forceLinting } from '@codemirror/lint'
import type { Diagnostic } from '@codemirror/lint'

// Custom dialogs
import { alert } from './dialog'
import { initNotifications } from './init'
import { debounce } from './core/debounce'

// New architecture imports
import {
  initializeStudio as initNewStudio,
  updateStudioState,
  studio,
  events,
  executor,
  RecordedChangeCommand,
  actions as studioActions,
  mirrorCompletions,
  getStateSelectionAdapter,
  // New Unified Trigger System
  getTriggerManager,
  registerAllTriggers,
  createTriggerExtensions,
  setIconTriggerPrimitives,
  getIconTriggerPrimitives,
  createComponentExtractExtensionFromConfig,
  createTokenExtractExtensionFromConfig,
  // Fixer Service (AI multi-file code generation)
  // Component Drop Extension (proper CodeMirror integration)
  createComponentDropExtension,
  insertComponentWithDefinition,
  generateComponentCodeFromDragData,
  // Property Panel
  PropertyPanel,
  // Preview Renderers (Clean Code modules) — MVP single-file mode no
  // longer constructs these. Imports retained as no-ops to keep barrel
  // shape stable.
  // TokenRenderer,
  // ComponentRenderer,
  // Drop Service: handleStudioDropNew now consumed only by
  // studio/init/init-notifications.ts (Phase D extraction).
  // Zag Helpers (Clean Code module)
  isZagComponent,
  findExistingZagDefinition,
  generateZagComponentName,
  generateZagDefinitionCode,
  generateZagInstanceCode,
  addZagDefinitionToCode,
  findOrCreateComponentsFile,
  addZagDefinitionToComponentsFile,
  // File Types (Clean Code module)
  detectFileType,
  getFileIcon as getFileIconModule,
  // Mirror file-extension predicates
  isMirrorFile,
  isComponentsFile,
  isLayoutFile,
  // YAML Parser (Clean Code module)
  generateYAMLDataInjection,
  // Full Color Picker — studio setup (window globals, keyboard, token grid)
  initColorPicker,
  // LLM-Edit-Flow (Cmd+Enter / Cmd+Shift+Enter)
  ghostDiffExtension,
  llmEditKeymap,
  createEditHandler,
  // Indent Guides Extension (visual indentation guides)
  indentGuidesExtension,
  // Smart Paste Extension (auto-adjust indentation on paste)
  smartPasteExtension,
  // Validator (for code linting)
  validate as validateCode,
  toCodeMirrorDiagnostics,
  // Wrap-aware change adjuster (single source of truth — see studio/core/wrap-utils.ts)
  adjustChangeForWrap,
  // Image drop/paste handler (drops an image into the editor → uploads → inserts URL)
  initImageDropHandler,
  // Inline Token Definition Handler (`bg $surface: #333` + Enter)
  createInlineTokenExtension,
  // Panel dividers (resizable sidebar/components/editor/preview)
  initPanelDividers,
  // Desktop menu handler (Tauri native menu → studio actions)
  setupDesktopMenuHandler,
  // Play Mode (toolbar button, reset, device selector)
  initPlayMode,
  // Property Panel — global DOM event listeners
  setupPropertyPanelIconPicker,
  setupPropertyPanelEventListeners,
  // Mirror DSL syntax highlight ViewPlugin
  mirrorHighlight,
  // Prelude collector (data + tokens + components → joined string)
  collectPrelude,
  // Full project source (data + tokens + components + layouts) for
  // cross-file token/component lookup
  collectAllProjectSource,
  // Tokens-only source collector (tokens + data, with localStorage fallback)
  collectTokensSource,
  // Auto-create-files factory (stubs for `import` / `route` references)
  createAutoCreateFiles,
  // Editor-line offset for prelude (maps merged-source lines back to editor)
  getPreludeLineOffset,
  // Draggable preview elements manager (binds drag handlers to [data-mirror-id])
  createDraggableElementsManager,
  // Code-modifier classes — were previously read off MirrorLang (compiler
  // bundle), but moved to studio/code-modifier in commit ae4f6c41 and no
  // longer re-exported by the compiler. Use the studio-bundle versions.
  CodeModifier,
  PropertyExtractor,
  createRobustModifier,
  // First-visit demo content
  DEFAULT_PROJECT,
} from '.'

// =============================================================================
// Global / Window-augmentation declarations
//
// app.ts is the legacy IIFE — it pokes at several window-level escape
// hatches (Tauri internals, debug toggles, the compiler bundle's global,
// host callbacks). Declaring them centrally here lets the rest of the
// file stay readable without per-callsite casts.
// =============================================================================
//
// `MirrorLang` is the global the compiler bundle (`dist/browser/index.global.js`)
// installs on `window`; we re-declare it as a non-window-prefixed global so
// that bare references compile.
// `__compileTestCode` / `__compileMirror` are test hooks set on window from
// here for the CDP test runner.

// Mirror compiler global is structurally identical to the typed
// `mirror-lang` package surface. Pull the real types from the compiler
// so AST/IR/SourceMap arguments line up with what the studio modules
// expect (they import from the same compiler, just via the studio
// barrel). Without this, every `MirrorLang.parse(…)` callsite would
// drop into `unknown` and conflict with downstream typed APIs.
import type { Program } from '../compiler/parser/ast'
import type { IR } from '../compiler/ir/types'
import type { SourceMap } from '../compiler/ir'
import { createLogger } from '../compiler/utils/logger'

const log = createLogger('App')

interface MirrorLangGlobal {
  parse: (code: string) => Program
  // Overloaded to match `compiler/ir/index.ts`: `withSourceMap=true`
  // returns the full IRResult; the boolean-only call returns plain IR.
  toIR: {
    (ast: Program, withSourceMap: true): { ir: IR; sourceMap: SourceMap; errors?: unknown[] }
    (ast: Program, withSourceMap?: boolean): { ir: IR; sourceMap?: SourceMap; errors?: unknown[] }
  }
  generateDOM: (ast: Program) => string
  generateReact?: (ast: Program) => string
  /**
   * Browser bundle exposes the PropertyExtractor class so test code can
   * inspect element properties without re-implementing the extraction
   * logic. Concrete shape: see studio/code-modifier/property-extractor.ts.
   */
  PropertyExtractor?: new (
    ast: unknown,
    sourceMap: unknown,
    options?: { showAllProperties?: boolean }
  ) => {
    getProperties(nodeId: string): unknown
  }
}

declare global {
  // Compiler bundle global — installed by dist/browser/index.global.js.
  // Re-declared as a free variable here so `MirrorLang.parse(…)` compiles
  // without rewriting every call to `window.MirrorLang.parse(…)`.

  var MirrorLang: MirrorLangGlobal

  interface Window {
    /** Tauri runtime marker — present iff the host is the Tauri shell. */
    __TAURI_INTERNALS__?: unknown
    /** Compiler bundle global (mirrors the free `MirrorLang` declaration). */
    MirrorLang?: MirrorLangGlobal
    /** Debug log of editor transactions (devtools / tests poke this). */
    __txFilterDebug?: unknown[]
    /** Devtools history of update events (push-style debug log). */
    __updateDebugHistory?: unknown[]
    /** Synchronous file-content reader installed by app.ts for misc consumers. */
    _mirrorReadFile?: (path: string) => string | null | undefined
    /** Test/runner hook: compile a Mirror snippet and return the JS source. */
    __compileMirror?: (code: string) => string
    /** Test/runner hook: compile and execute a Mirror snippet in the preview. */
    __compileTestCode?: (code: string) => unknown
    /** Test hook — feed a custom prelude line offset into the sync layer. */
    __setPreludeOffset?: (offset: number) => void
    /** Test hook — read the current prelude offset (chars). */
    __getPreludeOffset?: () => number
    /** Test hook — read the current prelude line offset. */
    __getPreludeLineOffset?: () => number
    /** Test hook — true while a CDP-driven test scenario is running. */
    __isTestMode?: () => boolean
    /** Test hook — exit test mode and restore live compile loop. */
    __exitTestMode?: () => void
    /** Debug helper: read merged source for the running project. */
    getAllProjectSource?: () => string
    /** Devtools hook — exposed CodeMirror namespace bag. */
    __codemirror?: Record<string, unknown>
    /** Sync hook — refresh code-modifier source after external edits. */
    ensureCodeModifierInSync?: () => void
    /** Multi-select state manager (selection.ts). */
    studioSelectionManager?: unknown
    /** CodeMirror autocomplete bridges set by app.ts for the test runner. */
    startCompletion?: typeof startCompletion
    closeCompletion?: typeof closeCompletion
    /** Test/runner hook — switch the editor to another file in the project. */
    switchFile?: (path: string) => Promise<void> | void
    /** Test/runner hook — return the currently-edited file path. */
    getCurrentFile?: () => string
    /** Test/runner / extension reference to the studio instance. */
    studio?: unknown
    /** Test/runner hook — generate Mirror code from a drag-data payload. */
    generateComponentCodeFromDragData?: (
      dragData: unknown,
      options?: { componentId?: string; filename?: string }
    ) => string
    /**
     * Legacy capital-D alias seen at a couple of call sites; no module
     * actually populates it. Kept optional so the dead-code branches
     * compile without per-line casts.
     */
    DesktopFiles?: { renderFileTree?: () => void }
    /**
     * Legacy `window.files` reference — same map as the in-module `files`
     * constant. A few code paths read it via `window.files`; declared here
     * so they compile.
     */
    files?: Record<string, string>
  }
}

interface CompileTimings {
  preludeEnd?: number
  parseEnd?: number
  irEnd?: number
  codegenEnd?: number
  prepExecStart?: number
  execEnd?: number
  updateStudioEnd?: number
  domAppendEnd?: number
  draggablesEnd?: number
  refreshEnd?: number
  syncEnd?: number
}

// Annotation to mark changes from property panel (for skipping debounce)
const propertyPanelChangeAnnotation = Annotation.define()

// Annotation to mark file switch transactions (bypass App lock filter)
const fileSwitchAnnotation = Annotation.define()

// ============================================
// App State
// ============================================

const files: Record<string, string> = {}
let currentFile = 'index.mir'

// ============================================
// Playground Mode (URL parameter ?code=)
// ============================================
let isPlaygroundMode = false
const urlParams = new URLSearchParams(window.location.search)
const playgroundCode = urlParams.get('code')
if (playgroundCode) {
  try {
    const decodedCode = decodeURIComponent(playgroundCode)
    files['playground.mir'] = decodedCode
    currentFile = 'playground.mir'
    isPlaygroundMode = true
    log.debug('[App] Playground mode activated')
  } catch (e) {
    log.error('[App] Failed to decode playground code:', e)
  }
}

// Hydrate `files` from localStorage on fresh boot, fall back to demo project.
// Skipped in playground mode (URL ?code= takes precedence).
//
// Why: After the MVP-Rollback there is no longer a storage-provider boot path
// that populates `files`. Without this, a first-visit user sees an empty
// editor instead of the demo, and `window.files` stays empty (test API
// reads it directly).
if (!isPlaygroundMode) {
  try {
    const stored = localStorage.getItem('mirror-files')
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, string>
      if (parsed && typeof parsed === 'object') {
        Object.assign(files, parsed)
      }
    }
  } catch (e) {
    log.warn('[App] Failed to read mirror-files from localStorage, using demo:', e)
  }
  if (Object.keys(files).length === 0) {
    Object.assign(files, DEFAULT_PROJECT)
  }
}

// Check if running in Tauri desktop app
function isTauriDesktop() {
  return typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined
}

// Save file - Desktop app uses desktop-files.js for actual disk writes
async function saveFile(filePath: string, content: string) {
  // Update local cache
  files[filePath] = content

  // Desktop: use desktop-files.js for actual disk save (Tauri mode).
  // window.desktopFiles is declared with an index signature at studio/test-api.ts
  // so non-listed members type as `unknown`. Local cast to the real shape here.
  const dfApi = window.desktopFiles as
    | {
        saveFile?: (path: string, content: string) => void | Promise<void>
        getCurrentFolder?: () => unknown
      }
    | undefined
  if (dfApi?.saveFile && dfApi.getCurrentFolder?.()) {
    try {
      await dfApi.saveFile(filePath, content)
      log.debug('[Save] File saved via desktop-files.js:', filePath)
    } catch (e) {
      log.error('[Save] Failed to save:', e)
    }
  } else {
    // Browser / test mode: no folder bound, but the desktopFiles cache
    // is still consulted by getPreludeCode() and YAML injection. Keep
    // it in sync so an edit-followed-by-recompile sees the new content
    // (without this, YAML data files only update at panel.create time
    // and stay stale through editor edits).
    window.desktopFiles?.updateFileCache?.(filePath, content)
  }
}

// Save current file shortcut
async function saveCurrentFile() {
  if (currentFile && files[currentFile] !== undefined) {
    await saveFile(currentFile, files[currentFile])
  }
}

// Get file type from extension or content sniffing
function getFileType(filename: string) {
  // Check file extension first (most reliable for Tauri desktop files)
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase()
  if (ext === '.tok') return 'tokens'
  if (ext === '.com') return 'component'
  if (ext === '.yaml' || ext === '.yml') return 'data'
  if (ext === '.mir' || ext === '.mirror') return 'layout'

  // Fall back to detection from content
  const allFiles = window.desktopFiles?.getFiles?.() || files
  const content = allFiles[filename] || ''
  return detectFileType(filename, content)
}

// File switching
function switchFile(filename: string) {
  if (typeof editor === 'undefined') return

  // IMPORTANT: Cancel any pending debounced operations to prevent race conditions
  // where old content gets saved to the new file
  if (typeof debouncedCompile !== 'undefined' && debouncedCompile.cancel) {
    debouncedCompile.cancel()
  }
  if (typeof debouncedSave !== 'undefined' && debouncedSave.cancel) {
    debouncedSave.cancel()
  }

  // Save current file immediately (sync save to files object, async to storage)
  const currentContent = editor.state.doc.toString()
  saveFile(currentFile, currentContent)

  // Switch to new file
  currentFile = filename

  // Update previewFile only when the new file is itself a layout.
  // For tokens / components / data we keep the previously-shown layout
  // visible, so editing those files updates the same preview.
  if (getFileType(filename) === 'layout') {
    studioActions.setPreviewFile(filename)
  }

  // Clear selection and reset sync for new file
  if (studio.sync) {
    studio.sync.clearSelection('editor')
    studio.sync.resetInitialSync()
  }

  // Dispatch with fileSwitchAnnotation to bypass the App lock filter.
  // addToHistory:false keeps file navigation out of CodeMirror's undo
  // history — switching files is navigation, not an edit, and a stale
  // history entry would let undo replace the just-loaded file with the
  // previous file's content.
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: files[filename] || '' },
    annotations: [fileSwitchAnnotation.of(true), Transaction.addToHistory.of(false)],
  })

  // Update active state in UI
  document.querySelectorAll('.file').forEach(f => f.classList.remove('active'))
  document.querySelector(`[data-file="${filename}"]`)?.classList.add('active')

  // Compile. compile() now applies the sibling-files prelude (tokens
  // and components) in test mode too, so cross-file token + component
  // resolution survives a switchFile during a test run.
  compile(files[filename])
}

const initialCode = files[currentFile] || ''

// Mirror DSL syntax highlight ViewPlugin (delegated to
// studio/editor/syntax-highlight.ts).

// Autocomplete - using modular engine from studio/autocomplete/
// mirrorCompletions is imported from ./dist/index.js

// =============================================================================
// Color Picker setup (delegated to studio/pickers/color/setup.ts)
// =============================================================================
const colorPickerHandle = initColorPicker({
  getFiles: () => files,
  getEditor: () => window.editor ?? null,
})

// Keyboard shortcut: Cmd+S to save current file
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's' && !e.shiftKey) {
    e.preventDefault()
    saveCurrentFile()
  }
})

// Keyboard shortcut: Cmd+O to open folder (Desktop only)
document.addEventListener('keydown', async e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'o' && !e.shiftKey) {
    e.preventDefault()
    if (isTauriDesktop() && window.desktopFiles) {
      const openFolder = window.desktopFiles.openFolder as (() => Promise<unknown>) | undefined
      if (openFolder) await openFolder()
    }
  }
})

// ============================================
// Inline Token Definition Handler
// (delegated to studio/editor/inline-token-extension.ts)
// ============================================

/**
 * Extension: App Lock - Makes "App" on line 1 undeletable
 * and auto-indents all other lines with 2 spaces
 * Only applies to .mir (layout) files, not .tok or .com files
 */
const APP_PREFIX = 'App'
const CHILD_INDENT = '  ' // 2 spaces

const appLockExtension = EditorState.transactionFilter.of(tr => {
  // DEBUG: Track all transactions
  if (!window.__txFilterDebug) window.__txFilterDebug = []
  window.__txFilterDebug.push({
    docChanged: tr.docChanged,
    selection: tr.selection ? { from: tr.selection.main.from, to: tr.selection.main.to } : null,
    startSelection: {
      from: tr.startState.selection.main.from,
      to: tr.startState.selection.main.to,
    },
  })

  if (!tr.docChanged) return tr

  // Allow file switch transactions through (they may load non-App files like tokens)
  if (tr.annotation(fileSwitchAnnotation)) {
    return tr
  }

  // Only apply App lock to .mir (layout) files
  // Token (.tok) and component (.com) files don't need to start with "App"
  if (!isLayoutFile(currentFile)) {
    return tr
  }

  // Simulate what the document would look like after this transaction
  const newDoc = tr.newDoc
  const newFirstLine = newDoc.line(1).text

  // Block if line 1 wouldn't start with "App" anymore
  if (!newFirstLine.startsWith(APP_PREFIX)) {
    return []
  }

  return tr
})

/**
 * Extension: Auto-indent new lines with 2 spaces (children of App)
 * Only applies to .mir (layout) files
 */
const autoIndentExtension = EditorView.domEventHandlers({
  keydown: (event, view) => {
    if (event.key !== 'Enter') return false

    // Only apply to .mir layout files
    if (!isLayoutFile(currentFile)) {
      return false
    }

    // Don't intercept if picker is open
    if (getTriggerManager().isOpen()) return false

    const cursorPos = view.state.selection.main.head
    const line = view.state.doc.lineAt(cursorPos)

    // If we're on line 1, insert newline + indent
    if (line.number === 1) {
      view.dispatch({
        changes: { from: cursorPos, insert: '\n' + CHILD_INDENT },
        selection: { anchor: cursorPos + 1 + CHILD_INDENT.length },
      })
      event.preventDefault()
      return true
    }

    // For other lines, preserve or ensure indent
    const currentIndent = line.text.match(/^(\s*)/)?.[1] || ''
    const indent = currentIndent.length < 2 ? CHILD_INDENT : currentIndent

    view.dispatch({
      changes: { from: cursorPos, insert: '\n' + indent },
      selection: { anchor: cursorPos + 1 + indent.length },
    })
    event.preventDefault()
    return true
  },
})

/**
 * Extension: Style "App" as locked/readonly appearance
 * Only applies to .mir (layout) files
 */
const appLockDecoration = Decoration.mark({ class: 'cm-app-locked' })
const appLockDecorationPlugin = ViewPlugin.fromClass(
  class {
    decorations: import('@codemirror/view').DecorationSet
    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view)
    }
    update(update: import('@codemirror/view').ViewUpdate): void {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view)
      }
    }
    buildDecorations(view: EditorView): import('@codemirror/view').DecorationSet {
      const builder = new RangeSetBuilder<Decoration>()
      // Only show "App" decoration for .mir layout files
      if (!isLayoutFile(currentFile)) {
        return builder.finish()
      }
      const firstLine = view.state.doc.line(1)
      if (firstLine.text.startsWith(APP_PREFIX)) {
        builder.add(firstLine.from, firstLine.from + APP_PREFIX.length, appLockDecoration)
      }
      return builder.finish()
    }
  },
  { decorations: v => v.decorations }
)

// Inline-token Enter handler (delegated to studio/editor/inline-token-extension.ts)
const inlineTokenExtension = createInlineTokenExtension({
  getFiles: () => files,
  writeFile: (path, content) => {
    files[path] = content
    return saveFile(path, content)
  },
})

// Create editor
// IIFE so the throw narrows the result to HTMLElement at every callsite,
// not just the lines following the inline `if (!… ) throw …` (closures
// don't carry control-flow narrowing).
const editorContainer = ((): HTMLElement => {
  const el = document.getElementById('editor-container')
  if (!el) throw new Error('[Studio] #editor-container missing — boot order is broken')
  return el
})()

// Register all triggers with the new unified TriggerManager
registerAllTriggers({
  getFiles: () => {
    // Try desktopFiles cache first
    const desktopFilesCache = window.desktopFiles?.getFiles?.()
    if (desktopFilesCache && Object.keys(desktopFilesCache).length > 0) {
      return desktopFilesCache
    }
    // Try global files variable
    if (files && Object.keys(files).length > 1) {
      return files
    }
    // Fall back to localStorage (browser mode)
    try {
      const stored = localStorage.getItem('mirror-files')
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      log.warn('Failed to read files from localStorage:', e)
    }
    return files
  },
  componentPrimitives: getIconTriggerPrimitives(),
  // Component extraction callbacks (for :: syntax)
  getFilesWithType: () => {
    const allFiles = window.desktopFiles?.getFiles?.() || files
    return Object.entries(allFiles).map(([name, code]) => ({
      name,
      type: getFileType(name),
      code,
    }))
  },
  updateFile: (filename: string, content: string) => {
    // Update local cache
    files[filename] = content
    // Save to storage
    saveFile(filename, content)
    // Refresh file tree
    if (window.DesktopFiles?.renderFileTree) {
      window.DesktopFiles.renderFileTree()
    }
    // Recompile
    compile(files[currentFile] || '')
  },
  getCurrentFile: () => currentFile,
})

// Create component extract extension (:: syntax for inline component definition)
const componentExtractConfig = {
  getFiles: () => {
    // Try desktopFiles cache first
    const desktopFilesCache = window.desktopFiles?.getFiles?.()
    if (desktopFilesCache && Object.keys(desktopFilesCache).length > 0) {
      return desktopFilesCache
    }
    // Try global files variable
    if (files && Object.keys(files).length > 1) {
      return files
    }
    return files
  },
  getFilesWithType: () => {
    const allFiles = window.desktopFiles?.getFiles?.() || files
    return Object.entries(allFiles).map(([name, code]) => ({
      name,
      type: getFileType(name),
      code,
    }))
  },
  updateFile: (filename: string, content: string) => {
    // Update local cache
    files[filename] = content
    // Save to storage
    saveFile(filename, content)
    // Refresh file tree
    if (window.DesktopFiles?.renderFileTree) {
      window.DesktopFiles.renderFileTree()
    }
    // Recompile with updated files
    compile(files[currentFile] || '')
  },
  getCurrentFile: () => currentFile,
}
const componentExtractExtension = createComponentExtractExtensionFromConfig(componentExtractConfig)
const tokenExtractExtension = createTokenExtractExtensionFromConfig(componentExtractConfig)

// Linter state - store current diagnostics for the linter extension
let currentDiagnostics: Diagnostic[] = []

// Create linter extension that returns stored diagnostics
const mirrorLinter = linter(view => {
  return currentDiagnostics
})

// LLM-Edit-Flow handler (replaces the legacy ?? draft-mode manager).
// Cmd+Enter      → handleEditFlow (capture context + LLM call + ghost-diff)
// Cmd+Shift+Enter → openPromptField (Mode 3 with user instruction)
// Tab            → acceptGhost (when ghost active)
// Esc            → dismissGhost (when ghost active)
const editHandler = createEditHandler({
  getProjectFiles: () => {
    // Snapshot tokens + components from all OTHER files (current file is in
    // the editor view, not in projectFiles).
    const allFiles = window.desktopFiles?.getFiles?.() || files
    const tokens: Record<string, string> = {}
    const components: Record<string, string> = {}
    for (const [name, content] of Object.entries(allFiles)) {
      if (name === currentFile) continue
      if (typeof content !== 'string') continue
      if (name.endsWith('.tok') || name.endsWith('.tokens')) {
        tokens[name] = content
      } else if (name.endsWith('.com') || name.endsWith('.components')) {
        components[name] = content
      }
    }
    return { tokens, components }
  },
  getCurrentFileName: () => currentFile,
})

let editor: EditorView

const editorExtensions = [
  indentUnit.of('  '), // 2 spaces for Mirror DSL
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightActiveLine(),
  drawSelection(),
  history(),
  // lintGutter() removed - only inline underlines, no gutter markers
  mirrorLinter, // Dynamic diagnostics (updated on compile)
  indentGuidesExtension(), // Visual indent guides (vertical lines)
  smartPasteExtension(), // Auto-adjust indentation on paste
  ghostDiffExtension(), // LLM-Edit-Flow: red/green diff overlay
  editHandler.ghostDiscardOnEditExtension, // Auto-discard ghost on direct edit
  keymap.of(llmEditKeymap(editHandler)), // Cmd+Enter / Cmd+Shift+Enter / Tab / Esc
  mirrorHighlight,
  autocompletion({
    override: [mirrorCompletions],
    activateOnTyping: true,
  }),
  keymap.of([
    // Block indent: Cmd+]/[ for indent/outdent
    { key: 'Mod-]', run: indentMore },
    { key: 'Mod-[', run: indentLess },
    ...completionKeymap,
    ...defaultKeymap,
    ...historyKeymap,
    indentWithTab,
  ]),
  EditorView.updateListener.of(update => {
    if (update.docChanged) {
      // Skip debounced compile if change came from property panel (already compiled immediately)
      const isFromPropertyPanel = update.transactions.some(tr =>
        tr.annotation(propertyPanelChangeAnnotation)
      )
      if (!isFromPropertyPanel) {
        debouncedCompile()
      }

      // Keep color-picker positions synchronized with document changes —
      // implementation lives in studio/pickers/color/setup.ts.
      colorPickerHandle.mapChanges(update.changes)
    }
    // Track cursor/selection changes for Editor → Preview sync
    const selection = update.state.selection.main
    const prevSelection = update.startState.selection.main

    // Check if selection changed (position or range)
    const selectionChanged =
      selection.from !== prevSelection.from ||
      selection.to !== prevSelection.to ||
      selection.head !== prevSelection.head

    if (selectionChanged && studio.editor) {
      // Check if this is a range selection (multiple lines selected)
      const fromLine = update.state.doc.lineAt(selection.from)
      const toLine = update.state.doc.lineAt(selection.to)

      // DEBUG: Track what selection the update listener sees
      if (!window.__updateDebugHistory) window.__updateDebugHistory = []
      window.__updateDebugHistory.push({
        from: selection.from,
        to: selection.to,
        anchor: selection.anchor,
        head: selection.head,
        fromLine: fromLine.number,
        toLine: toLine.number,
        isMultiLine: fromLine.number !== toLine.number,
      })

      if (fromLine.number !== toLine.number && studio.sync?.handleEditorSelection) {
        // Multi-line selection → trigger multiselection in preview
        studio.sync.handleEditorSelection(fromLine.number, toLine.number)
      } else {
        // Single line or cursor only → regular cursor sync
        const line = update.state.doc.lineAt(selection.head)
        studio.editor.notifyCursorMove({
          line: line.number,
          column: selection.head - line.from + 1,
          offset: selection.head,
        })
      }
    }
  }),
  // New Unified Trigger System (replaces legacy token, color, icon, animation triggers)
  ...createTriggerExtensions(),
  Prec.high(inlineTokenExtension),
  // Note: App lock removed - implicit root wrapper is now added in compile()
  // Component Drop: Proper CodeMirror integration for drag & drop from component palette
  // Uses insertComponentWithDefinition to add component definition at top if needed
  Prec.highest(
    createComponentDropExtension({
      onDrop: (dragData, position, view) => {
        const code = generateComponentCodeFromDragData(dragData, {
          componentId: dragData.componentId,
          filename: currentFile || 'index.mir',
        })
        // Extract component name from template (e.g., "Select", "Checkbox").
        // Legacy callers occasionally set a flat `template` field instead of
        // the typed `componentName`/`mirTemplate` shape — preserve that
        // fallback explicitly via cast.
        const legacy = dragData as { template?: string }
        const componentName = dragData.componentName || legacy.template || ''
        // Use insertComponentWithDefinition for Zag components (adds definition if missing)
        insertComponentWithDefinition(view, code, position, componentName)
      },
    })
  ),
  EditorView.theme({
    '&': { height: '100%' },
    '.cm-scroller': { fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace" },
  }),
  // Component extract extension (:: syntax)
  ...(componentExtractExtension ? [componentExtractExtension] : []),
  // Token extract extension (:: syntax for tokens)
  ...(tokenExtractExtension ? [tokenExtractExtension] : []),
]

editor = new EditorView({
  state: EditorState.create({
    doc: initialCode,
    extensions: editorExtensions,
  }),
  parent: editorContainer,
})

// debounce now lives in ./core/debounce — imported above.

// Save current file (debounced) - uses API for logged-in users
const debouncedSave = debounce((code: string) => {
  saveFile(currentFile, code)
  // Update icon if content type changed
  updateFileIcon(currentFile)
}, 500)

const debouncedCompile = debounce(() => {
  const code = editor.state.doc.toString()
  compile(code)
  debouncedSave(code)
}, 300)

// Undo/Redo buttons
const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement | null
const redoBtn = document.getElementById('redo-btn') as HTMLButtonElement | null

undoBtn?.addEventListener('click', () => {
  if (editor) {
    undo(editor)
    editor.focus()
  }
})

redoBtn?.addEventListener('click', () => {
  if (editor) {
    redo(editor)
    editor.focus()
  }
})

// Update undo/redo button states based on history
function updateUndoRedoButtons() {
  if (!editor || !undoBtn || !redoBtn) return

  // Use undoDepth/redoDepth to check history availability
  undoBtn.disabled = undoDepth(editor.state) === 0
  redoBtn.disabled = redoDepth(editor.state) === 0
}

// Call on editor transactions
const originalDispatch = editor.dispatch.bind(editor)
;(editor as unknown as { __originalDispatch: typeof originalDispatch }).__originalDispatch =
  originalDispatch // Expose for testing
editor.dispatch = ((...args: Parameters<EditorView['dispatch']>) => {
  try {
    originalDispatch(...args)
  } catch (e) {
    // CodeMirror throws "Position N is out of range for changeset of
    // length M" when a stale source-map (post test-suite reset, debounced
    // panel commit racing with a fresh setCode) builds change positions
    // against an older doc. Swallowing these here keeps the editor and
    // subsequent test setups alive — without this guard one test's stale
    // dispatch poisons every subsequent test's setup. Real range bugs
    // still surface via console for debugging.
    if (e instanceof RangeError && /Position \d+ is out of range/.test(e.message)) {
      log.warn('[editor.dispatch] dropped stale change:', e.message)
      return
    }
    throw e
  }
  updateUndoRedoButtons()
}) as EditorView['dispatch']

// Initial state
updateUndoRedoButtons()

// Folder toggle
document.querySelectorAll('.folder-header').forEach(header => {
  header.addEventListener('click', () => {
    header.parentElement?.classList.toggle('collapsed')
  })
})

// Tab switching (Preview/Generated)
const preview = ((): HTMLElement => {
  const el = document.getElementById('preview')
  if (!el) throw new Error('[Studio] #preview missing — boot order is broken')
  return el
})()

// MVP single-file mode: TokenRenderer / ComponentRenderer lazy preview
// renderers and the design-system sidebar (getDesignSystemTokenRenderer
// / getDesignSystemComponentRenderer / refreshDesignSystemPanel) are
// removed. Only the layout (.mir) DOM render path runs. Re-introduce
// when multi-file + design-system panel return.

// Zag dependencies builder for Clean Code module
function getZagDeps() {
  return {
    getAst: () => (studio.state as unknown as { ast?: unknown })?.ast,
    getCurrentFile: () => currentFile,
    getFiles: () => window.desktopFiles?.getFiles?.() || files,
    parseCode: (code: string) => MirrorLang.parse(code),
    isMirrorFile,
    isComponentsFile,
    getEditor: () => editor,
    emitNotification: (type: string, message: string) => {
      // The notification:* event names are dynamic, but `studio.events.emit`
      // is typed against `keyof StudioEvents`. Bypass with a structural cast
      // — the runtime emitter has no allow-list.
      ;(studio.events.emit as (e: string, p: unknown) => void)(`notification:${type}`, {
        message,
        duration: 2000,
      })
    },
    updateFileList: () => {
      // Desktop app's file tree is managed by desktop-files.js — no-op here.
    },
  }
}

function getDropGlobals(): import('./drop').AppGlobals {
  const zagDeps = getZagDeps()
  // The studio bootstrap object's `preview` is typed without `hideDropZone`,
  // but the runtime instance does have that method (added by the preview
  // controller). Bridge the structural mismatch via cast.
  return {
    studioCodeModifier,
    studioRobustModifier,
    currentFile,
    editor,
    currentPreludeOffset,
    currentPreludeLineOffset,
    resolvedSource,
    isWrappedWithApp,
    executor,
    events,
    studio,
    studioActions,
    compile,
    debouncedSave,
    isComponentsFile,
    isZagComponent,
    findExistingZagDefinition: (name: string) => findExistingZagDefinition(name, zagDeps),
    generateZagComponentName: (name: string) => generateZagComponentName(name, zagDeps),
    generateZagDefinitionCode,
    generateZagInstanceCode,
    addZagDefinitionToCode: (code: string) => addZagDefinitionToCode(code, zagDeps),
    findOrCreateComponentsFile: () => findOrCreateComponentsFile(zagDeps),
    addZagDefinitionToComponentsFile: (code: string, file: string) =>
      addZagDefinitionToComponentsFile(code, file, zagDeps),
  } as unknown as import('./drop').AppGlobals
}

// Auto-create files for `import` / `route` references — encapsulated
// in studio/compile/auto-create-files.ts. The factory binds our `files`
// map and saveFile() so every callsite (readFile callback, code scan,
// runtime page navigation) hits the same project state.
const autoCreateFiles = createAutoCreateFiles({
  getFiles: () => files,
  saveFile,
})
const { autoCreateFile, readFile, autoCreateReferencedFiles } = autoCreateFiles

// Update file icon based on current content
function updateFileIcon(filename: string) {
  const fileEl = document.querySelector(`[data-file="${filename}"]`)
  if (!fileEl) return

  const iconSvg = getFileIconModule(filename, getFileType)

  // Only replace the icon SVG, preserve buttons
  const oldIcon = fileEl.querySelector('svg')
  if (oldIcon) {
    const temp = document.createElement('div')
    temp.innerHTML = iconSvg
    const newIcon = temp.querySelector('svg')
    if (newIcon) {
      oldIcon.replaceWith(newIcon)
    }
  }
}

// Make readFile available globally for runtime page navigation
window._mirrorReadFile = readFile

// Get all token and component files as prelude code
// This ensures tokens and components are available when compiling layouts
function getPreludeCode(excludeFile = '') {
  return collectPrelude({
    excludeFile,
    getInMemoryFiles: () => files,
    getDesktopFiles: () => window.desktopFiles?.getFiles?.(),
    getFileType,
  })
}

// Compile and render
function compile(code: string) {
  const compileStart = performance.now()
  const timings: CompileTimings = {}

  // Skip compilation if preview is showing LLM-generated content
  // This preserves the generated HTML app in Spec Studio mode
  const previewEl = document.getElementById('preview')
  if (previewEl?.dataset.generatedMode === 'true') {
    log.debug('[Spec Studio] Skipping compile - showing generated content')
    return
  }

  // Update files with current code so ComponentRenderer can access it
  files[currentFile] = code

  // Preview redirection: when the editor is on a non-layout file (tokens,
  // components, data) and we have a separate previewFile, compile the
  // layout instead so its rendered preview reflects the just-edited tokens
  // / components / data via the prelude. The editor's own content was
  // already saved into `files[currentFile]` above, so the prelude built
  // for the layout picks it up.
  let compileFile = currentFile
  let compileCode = code
  const editingFileType = getFileType(currentFile)
  if (editingFileType !== 'layout' && studio?.state) {
    const previewFile = studio.state.get().previewFile
    if (previewFile && previewFile !== currentFile && getFileType(previewFile) === 'layout') {
      compileFile = previewFile
      compileCode = files[previewFile] ?? ''
    }
  }

  if (!compileCode.trim()) {
    // Render empty App container for drop target support
    preview.innerHTML = `<div class="mirror-root" style="width: 100%; height: 100%;">
      <div data-mirror-id="node-1" data-mirror-root="true" data-mirror-name="App" data-component="App"
           style="display: flex; flex-direction: column; width: 100%; height: 100%; min-height: 200px;">
      </div>
    </div>`
    preview.className = ''
    // Clear selection and update studio state for empty code
    if (studioSelectionManager) {
      studioSelectionManager.clearSelection()
      studioSelectionManager.setBreadcrumb([{ nodeId: 'node-1', name: 'App' }])
    }
    // Clear component palette user components
    const userComponentsList = document.querySelector('.user-components-list')
    if (userComponentsList) {
      userComponentsList.innerHTML = ''
    }
    // Refresh preview overlay for drop zone support
    studio.preview?.refresh()
    return
  }

  // Mark compilation as in progress
  studioActions.setCompiling(true)

  // Determine file type for preview mode (uses compileFile, which equals
  // currentFile unless we redirected to a layout above).
  const fileType = getFileType(compileFile)

  try {
    // Auto-create any missing referenced files
    autoCreateReferencedFiles(compileCode)

    // For layout files, prepend all tokens and components
    // and wrap user code in an implicit full-screen root container
    let resolvedCode = compileCode
    // In test mode, build the same tokens/components prelude as
    // production so cross-file token + component resolution is
    // available. The App-wrapping is intentionally skipped (tests want
    // node-1 to be the user's first element, not the synthetic App).
    if (testModeActive && fileType === 'layout') {
      const prelude = getPreludeCode(compileFile)
      if (prelude) {
        const separator = '\n\n// === ' + compileFile + ' ===\n'
        resolvedCode = prelude + separator + compileCode
        currentPreludeOffset = prelude.length + separator.length
        currentPreludeLineOffset =
          resolvedCode.substring(0, currentPreludeOffset).split('\n').length - 1
      } else {
        currentPreludeOffset = 0
        currentPreludeLineOffset = 0
      }
    } else if (testModeActive) {
      // Non-layout in test mode (tokens.tok, components.com): compile alone.
      resolvedCode = compileCode
      currentPreludeOffset = 0
      currentPreludeLineOffset = 0
    } else if (fileType === 'layout') {
      currentPreludeOffset = 0 // Reset prelude offset only in normal mode
      const prelude = getPreludeCode(compileFile)

      // Check if code already starts with "App" (legacy files)
      const startsWithApp = compileCode.trimStart().startsWith('App')

      // Check if code contains component definitions at root level (lines ending with ":" at indent 0)
      // These should NOT be wrapped in App, as they would become slot definitions instead
      const hasRootComponentDefs = compileCode.split('\n').some((line: string) => {
        const trimmed = line.trim()
        // Component definition: starts with capital letter, ends with ":"
        // But not a state like "hover:" or "focus:" (lowercase)
        return (
          trimmed.match(/^[A-Z][a-zA-Z0-9]*:/) && !line.startsWith(' ') && !line.startsWith('\t')
        )
      })

      if (startsWithApp || hasRootComponentDefs) {
        // Don't wrap: code already has App wrapper OR contains component definitions
        // Component definitions at root level would become slot definitions if wrapped
        isWrappedWithApp = false
        if (prelude) {
          const separator = '\n\n// === ' + compileFile + ' ===\n'
          resolvedCode = prelude + separator + compileCode
          currentPreludeOffset = prelude.length + separator.length
        }
      } else {
        // New mode: wrap user code in implicit App root
        // App is defined in components.com and can be styled there (padding, bg, etc.)
        isWrappedWithApp = true
        const rootWrapper = 'App'

        // Indent user code to be children of the implicit root
        const indentedCode = compileCode
          .split('\n')
          .map((line: string) => (line ? '  ' + line : ''))
          .join('\n')

        // Note: We do NOT add indent to currentPreludeOffset because CodeModifier
        // returns line-start positions (including indent). The indent is stripped
        // separately in handleStudioCodeChange when applying changes to the editor.
        if (prelude) {
          const separator = '\n\n// === ' + compileFile + ' ===\n'
          resolvedCode = prelude + separator + rootWrapper + '\n' + indentedCode
          currentPreludeOffset = prelude.length + separator.length + rootWrapper.length + 1
        } else {
          resolvedCode = rootWrapper + '\n' + indentedCode
          currentPreludeOffset = rootWrapper.length + 1
        }
      }
    }

    // Update global variables for DropResultApplier
    resolvedSource = resolvedCode

    // Update state with resolved source and prelude offsets for Commands.
    // - preludeOffset: CHARACTER count (for change position adjustment)
    // - preludeLineOffset: LINE count (for selection resolution)
    // In test mode the offsets were computed in the test-aware branch
    // above, so a unified update applies here too.
    if (studio?.state && !testModeActive) {
      const preludeLineCount =
        currentPreludeOffset > 0
          ? resolvedCode.substring(0, currentPreludeOffset).split('\n').length - 1
          : 0
      // Update global for DropResultApplier
      currentPreludeLineOffset = preludeLineCount
      studio.state.set({
        resolvedSource: resolvedCode,
        preludeOffset: currentPreludeOffset,
        preludeLineOffset: preludeLineCount,
        isWrappedWithApp: isWrappedWithApp,
      })
    } else if (studio?.state) {
      // In test mode, push the just-computed prelude offsets so editor →
      // sourceMap line resolution in tests matches the resolved source.
      studio.state.set({
        resolvedSource: resolvedCode,
        preludeOffset: currentPreludeOffset,
        preludeLineOffset: currentPreludeLineOffset,
        isWrappedWithApp: false,
      })
      if (studio?.sync?.lineOffset) {
        studio.sync.lineOffset.setOffset(currentPreludeLineOffset)
      }
    }

    // Parse
    timings.preludeEnd = performance.now()
    const ast = MirrorLang.parse(resolvedCode)
    timings.parseEnd = performance.now()

    // Check for errors
    if (ast.errors && ast.errors.length > 0) {
      const errorMsg = ast.errors.map(e => `Line ${e.line}: ${e.message}`).join('\n')
      throw new Error(errorMsg)
    }

    // Update component primitives map for icon picker trigger
    const componentPrimitives = getIconTriggerPrimitives()
    componentPrimitives.clear()
    for (const comp of ast.components) {
      const primitive = comp.primitive || comp.name.toLowerCase()
      componentPrimitives.set(comp.name, primitive)
    }
    // Also update TriggerManager's primitives
    setIconTriggerPrimitives(componentPrimitives)

    // Build IR with source map for bidirectional editing
    const irResult = MirrorLang.toIR(ast, true)
    let sourceMap = irResult.sourceMap
    timings.irEnd = performance.now()

    // Generate DOM code
    const jsCode = MirrorLang.generateDOM(ast)
    timings.codegenEnd = performance.now()

    // Clear preview and set appropriate class
    preview.innerHTML = ''
    preview.className = ''

    // MVP single-file mode: design-system sidebar + tokens/component
    // preview branches removed. Only the layout (.mir) DOM render path
    // is active. fileType is always 'layout' in single-file mode; if a
    // legacy multi-file project still loads, .tok / .com files fall
    // through to the same DOM-render path (they will render as empty UI
    // rather than a swatch / component-states grid).
    {
      // Layout or other: render UI
      // Also render local component definitions (not from prelude)
      let codeToCompile = resolvedCode
      let finalJsCode = jsCode

      // Find components defined in the current file (not prelude)
      const localAst = MirrorLang.parse(compileCode)
      const localComponentNames = (localAst.components || []).map(c => c.name)

      // Check which local components are NOT already instanced. The
      // Program.instances union now includes Slot/Each/ConditionalNode/etc.
      // — narrow to the literal `Instance` type (which is the only branch
      // with `component: string`).
      const instancedNames = new Set(
        (ast.instances || [])
          .filter((i): i is import('../compiler/parser/ast').Instance => i.type === 'Instance')
          .map(i => i.component)
      )
      const uninstancedComponents = localComponentNames.filter(name => !instancedNames.has(name))

      // Add implicit instances for uninstanced local components
      if (uninstancedComponents.length > 0) {
        const implicitInstances = uninstancedComponents.join('\n')
        codeToCompile = resolvedCode + '\n\n// Auto-preview local components\n' + implicitInstances

        // Re-parse and re-generate with implicit instances
        const augmentedAst = MirrorLang.parse(codeToCompile)
        finalJsCode = MirrorLang.generateDOM(augmentedAst)

        // IMPORTANT: Regenerate IR and sourceMap from augmented AST
        // This ensures slot node IDs match between preview and sourceMap
        const augmentedIrResult = MirrorLang.toIR(augmentedAst, true)
        irResult.ir = augmentedIrResult.ir
        irResult.sourceMap = augmentedIrResult.sourceMap
        sourceMap = augmentedIrResult.sourceMap
      }

      const hasAutoInit = finalJsCode.includes('// Auto-initialization')

      // Inject YAML data into __mirrorData before UI creation
      const yamlInjection = generateYAMLDataInjection({
        getFiles: () => window.desktopFiles?.getFiles?.() || files,
      })
      timings.prepExecStart = performance.now()

      let ui
      if (hasAutoInit) {
        let execCode = finalJsCode
          .replace('export function createUI', 'function createUI')
          .replace('document.body.appendChild(_ui.root)', '')

        // Inject YAML data after __mirrorData is defined (search for end of object + newline)
        if (yamlInjection) {
          execCode = execCode.replace(
            /(__mirrorData = \{[\s\S]*?\n\})/,
            match => match + yamlInjection
          )
        }

        const fn = new Function(execCode + '\nreturn _ui;')
        ui = fn()
      } else {
        let execCode = finalJsCode.replace('export function createUI', 'function createUI')

        // Inject YAML data after __mirrorData is defined (search for end of object + newline)
        if (yamlInjection) {
          execCode = execCode.replace(
            /(__mirrorData = \{[\s\S]*?\n\})/,
            match => match + yamlInjection
          )
        }

        const fn = new Function(execCode + '\nreturn createUI ? createUI() : null;')
        ui = fn()
      }
      timings.execEnd = performance.now()

      // IMPORTANT: Update studio BEFORE DOM update so SourceMap is ready for clicks
      updateStudio(ast, irResult.ir, sourceMap, resolvedCode)
      timings.updateStudioEnd = performance.now()

      // DOM backend returns element directly, not { root: element }
      const rootEl = ui?.root || (ui instanceof Element ? ui : null)
      if (rootEl) {
        preview.appendChild(rootEl)
        timings.domAppendEnd = performance.now()
        // Make preview elements draggable AFTER DOM update
        draggableElements.refresh()
        timings.draggablesEnd = performance.now()
        // Refresh preview selection after DOM update
        if (studio.preview) {
          studio.preview.refresh()
        }
        timings.refreshEnd = performance.now()
        // Trigger initial sync after first compile (selects root element)
        if (studio.sync) {
          studio.sync.triggerInitialSync()
        }
        timings.syncEnd = performance.now()
      }
    }

    // Validate code and update linter diagnostics
    // We validate the user's code (not resolved with prelude) so errors show at correct positions
    // BUT we pass prelude tokens/components so the validator knows what's defined in other files
    const preludeForValidation = getPreludeCode(currentFile)
    const preludeTokens = new Set<string>()
    const preludeComponents = new Set<string>()
    if (preludeForValidation) {
      const preludeAST = MirrorLang.parse(preludeForValidation)
      for (const token of preludeAST.tokens || []) {
        const baseName = token.name.startsWith('$') ? token.name.slice(1) : token.name
        const rootName = baseName.split('.')[0]
        preludeTokens.add(rootName)
        preludeTokens.add(baseName)
      }
      for (const comp of preludeAST.components || []) {
        preludeComponents.add(comp.name)
      }
    }
    const validationResult = validateCode(code, { preludeTokens, preludeComponents })
    currentDiagnostics = toCodeMirrorDiagnostics(validationResult, code)
    if (editor) {
      forceLinting(editor)
    }

    // Log compile timings
    const compileEnd = performance.now()
    const totalTime = compileEnd - compileStart
    if (totalTime > 50) {
      // Only log slow compiles
      log.debug('[CompilePerf] ========== SLOW COMPILE ==========')
      // All `timings.*` reads use `?? 0` so the perf log degrades gracefully
      // if a phase never ran (e.g. early-return when preview was empty); the
      // outer gate `timings.execEnd` already keeps the exec block coherent.
      const t = (v: number | undefined) => v ?? 0
      log.debug(`[CompilePerf] Total: ${totalTime.toFixed(1)}ms`)
      log.debug(`[CompilePerf] Prelude: ${(t(timings.preludeEnd) - compileStart).toFixed(1)}ms`)
      log.debug(
        `[CompilePerf] Parse: ${(t(timings.parseEnd) - t(timings.preludeEnd)).toFixed(1)}ms`
      )
      log.debug(`[CompilePerf] IR: ${(t(timings.irEnd) - t(timings.parseEnd)).toFixed(1)}ms`)
      log.debug(`[CompilePerf] Codegen: ${(t(timings.codegenEnd) - t(timings.irEnd)).toFixed(1)}ms`)
      if (timings.execEnd) {
        log.debug(
          `[CompilePerf] Exec: ${(t(timings.execEnd) - t(timings.prepExecStart)).toFixed(1)}ms`
        )
        log.debug(
          `[CompilePerf] UpdateStudio: ${(t(timings.updateStudioEnd) - t(timings.execEnd)).toFixed(1)}ms`
        )
        log.debug(
          `[CompilePerf] DOM Append: ${(t(timings.domAppendEnd) - t(timings.updateStudioEnd)).toFixed(1)}ms`
        )
        log.debug(
          `[CompilePerf] Draggables: ${(t(timings.draggablesEnd) - t(timings.domAppendEnd)).toFixed(1)}ms`
        )
        log.debug(
          `[CompilePerf] Refresh: ${(t(timings.refreshEnd) - t(timings.draggablesEnd)).toFixed(1)}ms`
        )
        log.debug(
          `[CompilePerf] Sync: ${(t(timings.syncEnd) - t(timings.refreshEnd)).toFixed(1)}ms`
        )
      }
      log.debug('[CompilePerf] ================================')
    }
  } catch (err) {
    // Reset compile status on error
    studioActions.setCompiling(false)

    // Clear diagnostics on compile error (parser errors are shown in preview)
    currentDiagnostics = []
    if (editor) {
      forceLinting(editor)
    }

    const message = err instanceof Error ? err.message : String(err)
    preview.innerHTML = `
      <div class="error-box">
        <h3>Parse/Compile Error</h3>
        <pre>${message}</pre>
      </div>
    `
  }
}

// Token and Component preview rendering has been moved to Clean Code modules:
// - TokenRenderer in studio/compile/token-renderer.ts
// - ComponentRenderer in studio/compile/component-renderer.ts
// Access via getTokenRenderer() and getComponentRenderer()

function getTokensSource() {
  return collectTokensSource({
    getInMemoryFiles: () => files,
    getFileType,
  })
}

// ============================================
// Studio Module - Bidirectional Editing
// ============================================

// State for studio module
// NOTE: AST and SourceMap are now managed by studio/core/state.ts
// Access via: studio.state.get().ast, studio.state.get().sourceMap
// Mirrors the surface of StateSelectionAdapter that app.ts actually uses;
// keeping it as a small structural interface (rather than importing the
// adapter type directly) lets the few legacy fallback paths still drop
// in mock implementations.
interface AppSelectionManager {
  clearSelection: () => void
  setBreadcrumb: (items: { nodeId: string; name: string }[]) => void
  getSelection?: () => string | null
}
let studioSelectionManager: AppSelectionManager | null = null
let studioPropertyPanel: PropertyPanel | null = null
let studioPropertyExtractor: PropertyExtractor | null = null
let studioCodeModifier: CodeModifier | null = null
let studioRobustModifier: ReturnType<typeof createRobustModifier> | null = null // Robust wrapper for atomic updates
// Drag handler binding for preview elements — encapsulates cleanup + WeakSet
const draggableElements = createDraggableElementsManager({
  // The studio bootstrap object doesn't surface `dragDrop` in its public
  // type — the bridge is patched in by other modules at runtime — so
  // cast through unknown for the narrower interface the manager wants.
  getStudio: () =>
    studio as unknown as { dragDrop?: { makeElementDraggable: (el: Element) => () => void } },
})
// editorHasFocus is now managed by studio state (studio.state.get().editorHasFocus)
// This getter provides backwards compatibility for existing code
function getEditorHasFocus() {
  return studio?.state ? studio.state.get().editorHasFocus : true
}
let currentPreludeOffset = 0 // Character offset of prelude in merged source (for adjusting change positions)
let currentPreludeLineOffset = 0 // Line offset of prelude (for indent correction)
let resolvedSource = '' // Full resolved source (prelude + user code)
let isWrappedWithApp = false // Whether user code was wrapped with App and indented
let testModeActive = false // When true, normal compile() skips prelude offset updates

// Global function to reset prelude offset for testing
// When setting test code directly without going through file loading,
// the prelude offset needs to be reset to 0
if (typeof window !== 'undefined') {
  window.__setPreludeOffset = offset => {
    log.debug('[Test] Setting prelude offset:', offset, '(was:', currentPreludeOffset, ')')
    // Cancel any pending debounced compile first, so it doesn't reset our offset
    if (typeof debouncedCompile !== 'undefined' && debouncedCompile.cancel) {
      debouncedCompile.cancel()
    }
    currentPreludeOffset = offset
    if (studio?.state?.set) {
      studio.state.set({ preludeOffset: offset, preludeLineOffset: 0 })
    }
    // IMPORTANT: Also update the SyncCoordinator's lineOffset
    // This ensures handleEditorSelection uses the correct line mapping
    if (studio?.sync?.lineOffset) {
      studio.sync.lineOffset.setOffset(offset)
    }
  }
  window.__getPreludeOffset = () => currentPreludeOffset
  window.__getPreludeLineOffset = () => currentPreludeLineOffset
  window.__isTestMode = () => testModeActive
  window.__exitTestMode = () => {
    log.debug('[Test] Exiting test mode')
    testModeActive = false
  }

  /**
   * Test Mode: Compile code with sibling tokens/components prelude.
   *
   * The active file's source is concatenated AFTER the prelude so:
   *   - $primary in the active file resolves to its tokens.tok value
   *   - <Card> instances pick up properties from components.com
   *
   * Prelude offsets (character + line) are tracked the same way the
   * regular compile() does, so the editor → sourceMap mapping shifts
   * correctly. Single-file scenarios end up with zero offsets and
   * behave exactly like the pre-prelude implementation.
   */
  window.__compileTestCode = code => {
    // Enable test mode to prevent normal compile from overwriting preludeOffset
    testModeActive = true
    // Cancel any pending compile
    if (debouncedCompile?.cancel) {
      debouncedCompile.cancel()
    }

    // Update files object FIRST so getPreludeCode() / getAllProjectSource()
    // see the latest editor content for the active file.
    if (currentFile && files) {
      files[currentFile] = code
    }

    // Preview redirection (mirror the production compile path): when the
    // editor is on a non-layout file (tokens / components / data) and a
    // separate previewFile is set, compile the layout instead. The just-
    // saved editor content is already in `files`, so the prelude for the
    // layout picks it up automatically.
    let compileFile = currentFile
    let compileCode = code
    const editingFileType = getFileType(currentFile)
    if (editingFileType !== 'layout' && studio?.state) {
      const previewFile = studio.state.get().previewFile
      if (previewFile && previewFile !== currentFile && getFileType(previewFile) === 'layout') {
        compileFile = previewFile
        compileCode = files[previewFile] ?? ''
      }
    }

    // Build prelude for layout files; tokens/component files compile alone.
    const fileType = getFileType(compileFile)
    let resolvedCode = compileCode
    let preludeOffset = 0
    let preludeLineOffset = 0
    if (fileType === 'layout') {
      const prelude = getPreludeCode(compileFile)
      if (prelude) {
        const separator = '\n\n// === ' + compileFile + ' ===\n'
        resolvedCode = prelude + separator + compileCode
        preludeOffset = prelude.length + separator.length
        preludeLineOffset = resolvedCode.substring(0, preludeOffset).split('\n').length - 1
      }
    }

    currentPreludeOffset = preludeOffset
    currentPreludeLineOffset = preludeLineOffset
    resolvedSource = resolvedCode
    isWrappedWithApp = false
    if (studio?.state?.set) {
      // isWrappedWithApp is intentionally reset here. __compileTestCode never
      // wraps with App; if a prior production compile left state.isWrappedWithApp
      // = true, adjustChangeForEditor would later strip non-existent wrap
      // indents from change positions and inserts (off-by-2 corruption,
      // observed when modifying a node on line 3+ of a multi-line scenario).
      studio.state.set({
        preludeOffset,
        preludeLineOffset,
        resolvedSource: resolvedCode,
        isWrappedWithApp: false,
      })
    }
    // CRITICAL: Update SyncCoordinator's lineOffset so editor → sourceMap
    // line resolution accounts for the prepended prelude.
    if (studio?.sync?.lineOffset) {
      studio.sync.lineOffset.setOffset(preludeLineOffset)
    }

    try {
      // Parse the RESOLVED code (prelude + active) so cross-file
      // references resolve. The sourceMap that comes back uses resolved
      // coordinates; consumers subtract preludeLineOffset to map into
      // editor coordinates.
      const ast = MirrorLang.parse(resolvedCode)
      if (ast.errors && ast.errors.length > 0) {
        const errorMsg = ast.errors.map(e => `Line ${e.line}: ${e.message}`).join('\n')
        throw new Error(errorMsg)
      }

      // Build IR with sourceMap
      const irResult = MirrorLang.toIR(ast, true)
      const sourceMap = irResult.sourceMap

      // Generate DOM code
      const jsCode = MirrorLang.generateDOM(ast)

      // CodeModifier needs the resolved source so its positions line up
      // with the sourceMap. Editor-side translation happens via
      // preludeOffset/preludeLineOffset.
      if (studioCodeModifier) {
        studioCodeModifier.updateSource(resolvedCode)
        studioCodeModifier.updateSourceMap(sourceMap)
      } else {
        studioCodeModifier = new CodeModifier(resolvedCode, sourceMap)
      }

      // Update robust modifier
      if (createRobustModifier) {
        studioRobustModifier = createRobustModifier(studioCodeModifier)
      }

      // Update state with the resolved source + the actual prelude
      // offsets so downstream consumers (selection validation, change
      // adjustment) translate editor positions correctly.
      if (studio?.actions?.setCompileResult) {
        studio.state.set({
          source: resolvedCode,
          preludeOffset,
          preludeLineOffset,
        })
        studio.actions.setCompileResult({
          ast,
          ir: irResult.ir,
          sourceMap,
          errors: [],
        })
      } else if (studio?.state?.set) {
        // Fallback for older API
        studio.state.set({
          ast,
          sourceMap,
          source: resolvedCode,
          preludeOffset,
          preludeLineOffset,
        })
      }

      // Update PropertyExtractor with new AST and SourceMap
      if (studioPropertyExtractor) {
        studioPropertyExtractor.updateAST(ast)
        studioPropertyExtractor.updateSourceMap(sourceMap)
      } else {
        studioPropertyExtractor = new PropertyExtractor(ast, sourceMap)
      }

      // Update PropertyPanel via updateStudioState (creates panel if not
      // exists, updates dependencies). Pass the resolved code so the
      // panel sees both prelude (tokens/components) and active file.
      if (typeof updateStudioState === 'function') {
        updateStudioState(ast, irResult.ir, sourceMap, resolvedCode)
      } else if (studio?.propertyPanel?.updateDependencies) {
        // Fallback: Update PropertyPanel dependencies so it can extract tokens from new source
        studio.propertyPanel.updateDependencies(studioPropertyExtractor, studioCodeModifier)
      }

      // Execute and render in preview
      const previewContainer = document.getElementById('preview')
      if (previewContainer) {
        previewContainer.innerHTML = ''
        // Execute the generated code (same logic as main compile)
        const hasAutoInit = jsCode.includes('// Auto-initialization')
        const execCode = jsCode
          .replace('export function createUI', 'function createUI')
          .replace('document.body.appendChild(_ui.root)', '')

        let ui
        if (hasAutoInit) {
          const fn = new Function(execCode + '\nreturn _ui;')
          ui = fn()
        } else {
          const fn = new Function(execCode + '\nreturn createUI ? createUI() : null;')
          ui = fn()
        }

        // DOM backend may return element directly, not { root: element }
        const rootEl = ui?.root || (ui instanceof Element ? ui : null)
        if (rootEl) {
          previewContainer.appendChild(rootEl)
        }
      }

      // CRITICAL: Update SyncCoordinator and Preview with the new SourceMap
      // Without this, handleEditorSelection won't find any nodes!
      studio.sync?.setSourceMap(sourceMap)
      studio.preview?.setSourceMap(sourceMap)

      log.debug('[Test] Test code compiled successfully')
      return true
    } catch (error) {
      log.error('[Test] Test code compile failed:', error)
      return false
    }
  }

  /**
   * Expose getAllProjectSource for test API debugging
   */
  window.getAllProjectSource = getAllProjectSource

  /**
   * Expose CodeMirror commands for test API
   * The test runner needs these but can't use dynamic require in bundled code
   */
  window.__codemirror = {
    // EditorSelection for explicit selection creation
    EditorSelection,
    // Undo/Redo - also trigger recompile after history change
    undo: () => {
      undo(editor)
      // Trigger recompile with new content
      const code = editor.state.doc.toString()
      window.__compileTestCode?.(code)
    },
    redo: () => {
      redo(editor)
      // Trigger recompile with new content
      const code = editor.state.doc.toString()
      window.__compileTestCode?.(code)
    },
    undoDepth: () => undoDepth(editor.state),
    redoDepth: () => redoDepth(editor.state),
    // Autocomplete
    startCompletion: () => startCompletion(editor),
    closeCompletion: () => closeCompletion(editor),
    completionStatus: () => completionStatus(editor.state),
    currentCompletions: () => currentCompletions(editor.state),
    // Editor access
    getEditor: () => editor,
    getState: () => editor.state,
    getDoc: () => editor.state.doc.toString(),
    // Set code AND wipe undo/redo history so tests that exercise Cmd+Z
    // can't reach back into the *previous* test's history. Without this,
    // In-test setCode (preserves undo history). Tests that exercise
    // undo/redo across multiple setCode calls need each call to land in
    // history as its own undoable entry; isolateHistory.of('full') keeps
    // them from merging with adjacent edits.
    setCodeWithHistory: (code: string) => {
      const transaction = editor.state.update({
        changes: { from: 0, to: editor.state.doc.length, insert: code },
        annotations: [Transaction.userEvent.of('test.setCode'), isolateHistory.of('full')],
      })
      editor.dispatch(transaction)
    },
    // Pre-test setup setCode (wipes history). The test runner calls this
    // before each test to guarantee Cmd+Z can't reach back into the
    // previous test's content. Replacing the EditorState from the same
    // extensions gives a fresh undo/redo stack; clearing the
    // CommandExecutor wipes the studio's parallel undo history (used
    // when the editor isn't focused, e.g. preview-driven Cmd+Z).
    setCodeForTestSetup: (code: string) => {
      if (typeof debouncedCompile !== 'undefined' && debouncedCompile.cancel) {
        debouncedCompile.cancel()
      }
      // Wipe the project file cache so DEFAULT_PROJECT siblings (tokens.tok,
      // components.com, data.yaml) can't leak into the test's prelude. Tests
      // that need cross-file scenarios put everything into the editor doc.
      // Sync both stores: the in-memory `files` object AND the desktopFiles
      // cache (getAllProjectSource prefers the cache when it's non-empty).
      for (const key of Object.keys(files)) {
        if (key !== currentFile) delete files[key]
      }
      files[currentFile] = code
      const dfFiles = window.desktopFiles?.getFiles?.()
      if (dfFiles && window.desktopFiles?.updateFileCache) {
        for (const key of Object.keys(dfFiles)) {
          if (key !== currentFile) window.desktopFiles.updateFileCache(key, undefined)
        }
        window.desktopFiles.updateFileCache(currentFile, code)
      }
      editor.setState(EditorState.create({ doc: code, extensions: editorExtensions }))
      executor?.clear?.()
    },
  }
}

/**
 * Ensure codeModifier is in sync with the current editor content.
 * This prevents RangeErrors when the editor has uncommitted changes.
 * Returns true if a recompile was needed (callers should bail out as state changed).
 */
function ensureCodeModifierInSync() {
  if (!studioCodeModifier || !editor) return false

  const currentCode = editor.state.doc.toString()
  const modifierCode = studioCodeModifier.getSource()

  if (currentCode !== modifierCode) {
    // Out of sync - cancel debounce and compile immediately
    debouncedCompile.cancel()
    compile(currentCode)
    return true // Recompiled - caller should bail out
  }
  return false // Already in sync
}

// Expose sync function globally for property panel to use
window.ensureCodeModifierInSync = ensureCodeModifierInSync

/**
 * Get all project source in processing order (data -> tokens -> components -> layouts)
 * Allows the PropertyPanel to access tokens/components from all files.
 * Uses desktop files cache if available, falling back to in-memory files
 * for playground/legacy mode.
 */
function getAllProjectSource() {
  return collectAllProjectSource({
    getFiles: () => window.desktopFiles?.getFiles?.() || files,
    getFileType,
  })
}

function getCurrentFileLineOffset() {
  return getPreludeLineOffset({
    getCurrentFile: () => currentFile,
    getFileType,
    getPreludeCode,
  })
}

// ============================================
// LEGACY SYNC FUNCTIONS REMOVED
// All sync logic is now in SyncCoordinator (studio/sync/sync-coordinator.ts)
// Line offset handling is in LineOffsetService (studio/sync/line-offset-service.ts)
// Component line parsing is in component-line-parser.ts (studio/sync/component-line-parser.ts)
// ============================================

// Initialize studio module
function initStudio() {
  const propertyPanelContainer = document.getElementById('property-panel')
  const previewContainer = document.getElementById('preview')

  if (!propertyPanelContainer || !previewContainer) {
    log.warn('Studio: Property panel or preview container not found')
    return
  }

  // MVP single-file mode: explorerPanelContainer / fileTreeContainer /
  // tokensPanelContainer no longer exist in the DOM. Re-introduce when
  // multi-file + design-system panel return.

  // Components Panel containers (separate from explorer)
  const componentsPanelContainer = document.getElementById('components-panel-container')
  const userComponentsPanelContainer = document.getElementById('user-components-panel-container')

  // ============================================
  // NEW ARCHITECTURE: Initialize new studio
  // ============================================
  try {
    initNewStudio({
      editor: editor,
      previewContainer: previewContainer,
      propertyPanelContainer: propertyPanelContainer ?? undefined,
      // Components Panel containers (separate from explorer)
      componentPanelContainer: isPlaygroundMode
        ? undefined
        : (componentsPanelContainer ?? undefined),
      userComponentsPanelContainer: isPlaygroundMode
        ? undefined
        : (userComponentsPanelContainer ?? undefined),
      initialSource: files[currentFile] || '',
      currentFile: currentFile,
      getAllSource: getAllProjectSource,
      getCurrentFile: () => currentFile,
      getFiles: () => {
        const allFiles = window.desktopFiles?.getFiles?.() || files
        // detectFileType returns FileTypeName (which includes 'javascript')
        // while initNewStudio's getFiles consumes a slightly different
        // string union (includes 'unknown' / 'components'). The Mirror
        // project today never produces a 'javascript' result here, so
        // bridge with a structural cast.
        return Object.entries(allFiles).map(([name, code]) => ({
          name,
          type: detectFileType(name, code) as
            | 'tokens'
            | 'components'
            | 'component'
            | 'layout'
            | 'data'
            | 'unknown',
          code: code as string,
        }))
      },
      updateFile: (filename: string, content: string) => {
        files[filename] = content
        if (filename === currentFile) {
          editor.dispatch({
            changes: { from: 0, to: editor.state.doc.length, insert: content },
          })
        }
        saveFile(filename, content)
      },
      switchToFile: filename => {
        if (files[filename]) {
          switchFile(filename)
        }
      },
    })
    log.debug('Studio: New architecture initialized')
  } catch (e) {
    log.warn('Studio: New architecture failed to initialize:', e)
  }

  // ============================================
  // SELECTION ADAPTER: Bridge between new state and legacy PropertyPanel
  // Uses StateSelectionAdapter which automatically syncs with core state
  // ============================================
  studioSelectionManager = getStateSelectionAdapter()

  // Focus tracking is now handled by EditorController and PreviewController
  // The state.editorHasFocus is updated automatically by the new architecture

  log.debug('Studio: Initialized')
  // Preview click handling is done by PreviewController (new architecture)
  // Editor sync is done by SyncCoordinator via previewController.onSelect() callback

  // Set up notification handlers for user feedback
  // (extracted to studio/init/init-notifications.ts in Phase D refactor)
  initNotifications({
    studio,
    editor,
    compile,
    debouncedCompile,
    debouncedSave,
    getDropGlobals,
  })

  // Set up icon picker for property panel (delegated to studio/panels/property)
  setupPropertyPanelIconPicker()

  // Set up event listeners for property panel — add/delete/edit events
  // (delegated to studio/panels/property/event-listeners.ts)
  setupPropertyPanelEventListeners({
    getCodeModifier: () => studioCodeModifier,
    onCodeChange: result => handleStudioCodeChange(result),
  })

  // Initialize play mode button (delegated to studio/preview/play-mode.ts)
  initPlayMode({
    recompile: code => compile(code),
    getEditorSource: () => window.editor?.state.doc.toString() ?? '',
  })
}

// (setupNotificationHandlers extracted to studio/init/init-notifications.ts —
// invoked from initStudio() above as `initNotifications({...})`.)

// Property panel global event listeners are wired below in initStudio()
// via setupPropertyPanelIconPicker / setupPropertyPanelEventListeners
// (see studio/panels/property/event-listeners.ts).

// Update studio after compile
function updateStudio(ast: Program, ir: IR, sourceMap: SourceMap, source: string) {
  if (!studioSelectionManager) return

  // ============================================
  // NEW ARCHITECTURE: Update state atomically
  // Selection validation is now handled by setCompileResult() in state.ts
  // ============================================
  try {
    // Set line offset FIRST (before setSourceMap triggers initial sync)
    if (studio.sync?.lineOffset) {
      const offset = getCurrentFileLineOffset()
      studio.sync.lineOffset.setOffset(offset)
    }

    // Now update state (this calls setSourceMap which may trigger initial sync)
    updateStudioState(ast, ir, sourceMap, source)
  } catch (e) {
    log.warn('Studio: New architecture update failed:', e)
  }

  // SourceMap sync handled by new architecture via updateStudioState()
  // NOTE: preview.refresh() is called in compile() AFTER DOM update

  const propertyPanelContainer = document.getElementById('property-panel')
  const previewContainer = document.getElementById('preview')
  if (!propertyPanelContainer || !previewContainer) return

  // Update or create PropertyExtractor
  if (studioPropertyExtractor) {
    studioPropertyExtractor.updateAST(ast)
    studioPropertyExtractor.updateSourceMap(sourceMap)
  } else {
    studioPropertyExtractor = new PropertyExtractor(ast, sourceMap)
  }

  // Update or create CodeModifier
  if (studioCodeModifier) {
    studioCodeModifier.updateSource(source)
    studioCodeModifier.updateSourceMap(sourceMap)
  } else {
    studioCodeModifier = new CodeModifier(source, sourceMap)
  }

  // Create/update RobustModifier wrapper for atomic updates
  if (createRobustModifier) {
    studioRobustModifier = createRobustModifier(studioCodeModifier)
  }

  // NOTE: Selection validation is now handled atomically by state.ts setCompileResult()
  // The state emits 'selection:invalidated' event which PropertyPanel listens to

  // Update or create PropertyPanel
  if (studioPropertyPanel) {
    const selection = studioSelectionManager.getSelection?.()
    if (selection) {
      log.debug('Studio: Refreshing property panel, selection:', selection)
    }
    studioPropertyPanel.updateDependencies(studioPropertyExtractor, studioCodeModifier)
  } else {
    // PropertyPanel wants a full SelectionProvider; the AppSelectionManager
    // typedef is a deliberately narrow subset of what StateSelectionAdapter
    // (the actual runtime value) implements. Cross-shape cast through
    // ConstructorParameters so the cast tracks the constructor signature.
    type PropertyPanelArgs = ConstructorParameters<typeof PropertyPanel>
    studioPropertyPanel = new PropertyPanel(
      propertyPanelContainer,
      studioSelectionManager as unknown as PropertyPanelArgs[1],
      studioPropertyExtractor,
      studioCodeModifier,
      handleStudioCodeChange,
      {
        getAllSource: getAllProjectSource,
      }
    )
  }

  // Sync property panel to editor cursor after compile (if editor has focus)
  // Use new architecture: trigger SyncCoordinator via EditorController
  if (getEditorHasFocus() && studio.editor && editor) {
    const pos = editor.state.selection.main.head
    const line = editor.state.doc.lineAt(pos)
    studio.editor.notifyCursorMove({
      line: line.number,
      column: pos - line.from + 1,
      offset: pos,
    })
  }

  // Ensure visual overlay is in DOM after preview update
  // (preview.innerHTML clears it, this re-appends it)
  studio.preview?.refresh()
}

// Handle code changes from property panel.
// Delegates the resolved-source → editor-source coordinate translation
// to studio/core/wrap-utils.ts so this path and bootstrap.ts's
// PropertyPanel onCodeChange callback can never drift apart.
// Mirrors `ModificationResult` from studio/code-modifier (success boolean
// + a CodeChange + optional error/noChange). Local copy keeps app.ts
// independent of the code-modifier import path; the structural match is
// enforced by the cast in the call site.
interface StudioCodeChangeResult {
  success: boolean
  change: { from: number; to: number; insert: string }
  newSource?: string
  error?: string
  noChange?: boolean
}

function handleStudioCodeChange(result: StudioCodeChangeResult) {
  if (!result.success) {
    log.warn('Studio: Code modification failed:', result.error)
    return
  }

  const adjustedChange = adjustChangeForWrap(
    result.change,
    currentPreludeOffset,
    isWrappedWithApp,
    resolvedSource
  )

  // Validate adjusted change range before applying (prevents RangeError crashes)
  const docLength = editor.state.doc.length
  if (
    adjustedChange.from < 0 ||
    adjustedChange.to > docLength ||
    adjustedChange.from > adjustedChange.to
  ) {
    log.warn('Studio: Invalid change range after adjustment', {
      original: result.change,
      adjusted: adjustedChange,
      preludeOffset: currentPreludeOffset,
      docLength,
    })
    // Force recompile to fix the state mismatch
    debouncedCompile.cancel()
    compile(editor.state.doc.toString())
    return
  }

  // Calculate inverse change for undo
  const currentSource = editor.state.doc.toString()
  const inverseChange = {
    from: adjustedChange.from,
    to: adjustedChange.from + adjustedChange.insert.length,
    insert: currentSource.substring(adjustedChange.from, adjustedChange.to),
  }

  // Apply the adjusted change to CodeMirror
  editor.dispatch({
    changes: adjustedChange,
    annotations: [
      propertyPanelChangeAnnotation.of(true),
      Transaction.userEvent.of('input.property'),
    ],
  })

  // Record the change in CommandExecutor for undo/redo
  const command = new RecordedChangeCommand({
    change: adjustedChange,
    inverseChange: inverseChange,
    description: 'Property change',
  })
  executor.execute(command)

  // Emit event for tracking
  events.emit('source:changed', {
    source: editor.state.doc.toString(),
    origin: 'panel',
    change: adjustedChange,
  })

  // Compile immediately (no debounce for property panel changes)
  const code = editor.state.doc.toString()
  compile(code)
  debouncedSave(code)
}

// Zag helpers moved to Clean Code module: studio/zag/
// Wrapper functions are defined above (near getDropGlobals)

// Drop handling moved to Clean Code module: studio/drop/
// Uses handleStudioDropNew() from studio/drop/app-adapter.ts

// NOTE: Delete/Backspace is handled by KeyboardHandler in preview/keyboard-handler.ts
// via executeDelete() in shared-actions.ts - no duplicate handler needed here

// Global undo/redo when focus is outside the editor (e.g. preview, panel
// chrome). We try CommandExecutor first — it owns preview-driven actions
// like wrap/ungroup/delete that never touch CodeMirror history. If the
// executor is empty (e.g. only property-panel edits happened, which write
// straight through ctx.applyChange), fall back to CodeMirror's own
// history so Cmd+Z still walks back through those edits.
document.addEventListener('keydown', e => {
  // Don't interfere with editor's own undo/redo
  if (getEditorHasFocus()) return
  // Don't interfere with input fields
  const target = e.target as HTMLElement | null
  if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const modifier = isMac ? e.metaKey : e.ctrlKey

  const tryUndo = () => {
    if (executor.canUndo()) {
      const result = executor.undo()
      if (result.success) {
        compile(editor.state.doc.toString())
        return true
      }
    }
    if (undoDepth(editor.state) > 0) {
      undo(editor)
      compile(editor.state.doc.toString())
      return true
    }
    return false
  }

  const tryRedo = () => {
    if (executor.canRedo()) {
      const result = executor.redo()
      if (result.success) {
        compile(editor.state.doc.toString())
        return true
      }
    }
    if (redoDepth(editor.state) > 0) {
      redo(editor)
      compile(editor.state.doc.toString())
      return true
    }
    return false
  }

  if (modifier && e.key === 'z') {
    e.preventDefault()
    if (e.shiftKey) tryRedo()
    else tryUndo()
  }
  // Also support Ctrl+Y for redo on Windows
  if (!isMac && e.ctrlKey && e.key === 'y') {
    e.preventDefault()
    tryRedo()
  }
})

// Initialize studio
// Note: Component palette is now handled by TypeScript ComponentPanel in explorer
initStudio()

// Initial compile
compile(initialCode)

// ==========================================
// File Management Integration
// Works in both Tauri (real files) and Browser (demo files)
// ==========================================
if (!isPlaygroundMode) {
  import('./desktop-files')
    .then(module => {
      // Initialize with callback to load files into editor
      module.initDesktopFiles({
        onFileSelect: (filePath, content) => {
          log.debug('[DesktopFiles] Loading file into editor:', filePath)
          // Update currentFile for appLockExtension
          currentFile = filePath
          // Track previewFile separately: only follow the editor when the
          // newly selected file is a layout. For tokens / components / data
          // the previously visible layout stays in the preview pane.
          if (getFileType(filePath) === 'layout') {
            studioActions.setPreviewFile(filePath)
          }
          // Update editor content
          const transaction = editor.state.update({
            changes: {
              from: 0,
              to: editor.state.doc.length,
              insert: content,
            },
            annotations: [fileSwitchAnnotation.of(true)],
          })
          editor.dispatch(transaction)
          // Recompile
          compile(content)
        },
        onFileChange: (filePath, content) => {
          log.debug('[DesktopFiles] File changed:', filePath)
        },
      })
      log.debug('[App] File management initialized')
    })
    .catch(err => {
      log.error('[App] Failed to load studio bundle:', err)
    })
} else {
  log.debug('[App] Playground mode - skipping file management')
}

// ==========================================
// Desktop Menu Event Handler (Tauri)
// (delegated to studio/ui/desktop-menu.ts)
// ==========================================
setupDesktopMenuHandler({
  isTauriDesktop,
  getEditorContent: () => editor.state.doc.toString(),
  studioActions,
  alert,
})

// Expose for debugging
window.editor = editor
window.studioSelectionManager = studioSelectionManager
window.startCompletion = startCompletion
window.closeCompletion = closeCompletion
window.files = files
window.switchFile = switchFile // For test API (panel.files.open) and external scripts
window.getCurrentFile = () => currentFile // For test API (panel.files.getCurrentFile)
window.studio = studio // New architecture
// The typed source accepts ComponentDragData; the test-runner global is
// declared with `dragData: unknown` (callers pass arbitrary JSON). The
// callee tolerates the wider input — bridge with a cast.
window.generateComponentCodeFromDragData = generateComponentCodeFromDragData as (
  dragData: unknown,
  options?: { componentId?: string; filename?: string }
) => string

// ==========================================
// Resizable Panel Dividers with localStorage persistence
// (delegated to studio/ui/panel-dividers.ts)
// ==========================================
// editorPanel / editorDivider / previewPanel are required by
// initPanelDividers's typed config. The DOM element existence is
// enforced by the studio template; non-null assertions document
// that contract while keeping the boot path uncluttered.
initPanelDividers({
  // MVP single-file mode: file-explorer + design-system panels removed.
  // panel-dividers.ts already accepts `null` for these slots.
  sidebar: null,
  sidebarDivider: null,
  componentsPanel: document.getElementById('components-panel'),
  componentsDivider: document.getElementById('components-divider'),
  designSystemPanel: null,
  designSystemDivider: null,
  editorPanel: document.querySelector<HTMLElement>('.editor-panel')!,
  editorDivider: document.getElementById('editor-divider')!,
  previewPanel: document.querySelector<HTMLElement>('.preview-panel')!,
  propertyPanel: document.getElementById('property-panel'),
  propertyDivider: document.getElementById('property-divider'),
  // initPanelDividers wants the public MirrorStudioBridge shape; app.ts
  // sets window.MirrorStudio to the StudioInstance from bootstrap.
  // Both share the state/actions/events fields the dividers actually
  // read — bridge with a cast.
  getStudio: () => window.MirrorStudio as unknown as undefined,
})

// ==========================================
// Image Upload Feature
// ==========================================
// Implementation lives in studio/editor/image-drop-handler.ts. The
// desktop app doesn't upload to imgbb (Claude CLI handles auth, no
// API key needed) — pass an empty key so the handler short-circuits.

initImageDropHandler({
  editor: window.editor!,
  editorPanel: document.querySelector<HTMLElement>('.editor-panel')!,
  uploadIndicator: document.getElementById('upload-indicator')!,
  dropOverlay: document.getElementById('drop-overlay')!,
  getImgbbKey: () => '',
})
