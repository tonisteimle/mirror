import {
  EditorState,
  EditorSelection,
  RangeSetBuilder,
  Prec,
  Annotation,
  Transaction,
  Compartment,
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

// Custom dialogs
import { alert, confirm, prompt } from './dialog.js'

// New architecture imports
import {
  initializeStudio as initNewStudio,
  updateStudioState,
  studio,
  handleSelectionChange as newHandleSelectionChange,
  events,
  executor,
  RecordedChangeCommand,
  actions as studioActions,
  state as studioState,
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
  insertComponentCode,
  insertComponentWithDefinition,
  generateComponentCodeFromDragData,
  // Property Panel
  PropertyPanel,
  // Preview Renderers (Clean Code modules)
  TokenRenderer,
  ComponentRenderer,
  // Drop Service (Clean Code module)
  handleStudioDropNew,
  // Zag Helpers (Clean Code module)
  isZagComponent as isZagComponentModule,
  findExistingZagDefinition as findExistingZagDefinitionModule,
  generateZagComponentName as generateZagComponentNameModule,
  generateZagDefinitionCode as generateZagDefinitionCodeModule,
  generateZagInstanceCode as generateZagInstanceCodeModule,
  addZagDefinitionToCode as addZagDefinitionToCodeModule,
  findOrCreateComponentsFile as findOrCreateComponentsFileModule,
  addZagDefinitionToComponentsFile as addZagDefinitionToComponentsFileModule,
  // File Types (Clean Code module)
  FILE_TYPES as FILE_TYPES_MODULE,
  detectFileType as detectFileTypeModule,
  getFileIcon as getFileIconModule,
  getFileTypeColor as getFileTypeColorModule,
  getFileTemplate,
  getFileExtension,
  // React Converter (Clean Code module)
  convertReactToMirror as convertReactToMirrorModule,
  buildReactSystemPrompt as buildReactSystemPromptModule,
  STYLE_TO_MIRROR,
  TAG_TO_COMPONENT,
  TAG_TO_NAME,
  // YAML Parser (Clean Code module)
  parseYAML as parseYAMLModule,
  parseYAMLValue as parseYAMLValueModule,
  collectYAMLData as collectYAMLDataModule,
  generateYAMLDataInjection as generateYAMLDataInjectionModule,
  // Color Picker Utilities (Clean Code module)
  hsvToRgb as hsvToRgbModule,
  rgbToHsv as rgbToHsvModule,
  hexToRgb as hexToRgbModule,
  rgbToHex as rgbToHexModule,
  hexToHsv as hexToHsvModule,
  hsvToHex as hsvToHexModule,
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
  // Play Mode (toolbar button, reset, device selector)
  initPlayMode,
  // Property Panel — global DOM event listeners
  setupPropertyPanelIconPicker,
  setupPropertyPanelEventListeners,
} from './dist/index.js?v=150'

// Annotation to mark changes from property panel (for skipping debounce)
const propertyPanelChangeAnnotation = Annotation.define()

// Annotation to mark file switch transactions (bypass App lock filter)
const fileSwitchAnnotation = Annotation.define()

// ============================================
// File Extension Utilities
// ============================================

const MIRROR_EXTENSIONS = {
  layout: ['.mir', '.mirror'],
  components: ['.com', '.components'],
  tokens: ['.tok', '.tokens'],
}

/**
 * Check if a filename is a Mirror file (any type)
 * @param {string} filename
 * @returns {boolean}
 */
function isMirrorFile(filename) {
  if (!filename) return false
  const allExtensions = [
    ...MIRROR_EXTENSIONS.layout,
    ...MIRROR_EXTENSIONS.components,
    ...MIRROR_EXTENSIONS.tokens,
  ]
  return allExtensions.some(ext => filename.endsWith(ext))
}

/**
 * Check if a filename is a components file (.com, .components)
 * @param {string} filename
 * @returns {boolean}
 */
function isComponentsFile(filename) {
  if (!filename) return false
  return MIRROR_EXTENSIONS.components.some(ext => filename.endsWith(ext))
}

/**
 * Check if a filename is a layout file (.mir, .mirror)
 * @param {string} filename
 * @returns {boolean}
 */
function isLayoutFile(filename) {
  if (!filename) return false
  return MIRROR_EXTENSIONS.layout.some(ext => filename.endsWith(ext))
}

// ============================================
// App State
// ============================================

const STORAGE_PREFIX = 'mirror-file-'
const PROJECT_KEY = 'mirror-current-project'
const STORAGE_VERSION_KEY = 'mirror-storage-version'
const STORAGE_VERSION = 4 // Increment this when storage format changes

const DEBUG_SYNC = false // Enable verbose sync logging
let currentProject = null
let projects = []
const files = {}
const fileTypes = {} // Stores explicit file types: { 'filename.mirror': 'component' }
let currentFile = 'index.mir'

// ============================================
// YAML Parser (use Clean Code module)
// ============================================

function getYAMLDeps() {
  return { getFiles: () => window.desktopFiles?.getFiles?.() || files }
}

function parseYAML(text) {
  return parseYAMLModule(text)
}

function parseYAMLValue(value) {
  return parseYAMLValueModule(value)
}

function collectYAMLData() {
  return collectYAMLDataModule(getYAMLDeps())
}

function generateYAMLDataInjection() {
  return generateYAMLDataInjectionModule(getYAMLDeps())
}

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
    console.log('[App] Playground mode activated')
  } catch (e) {
    console.error('[App] Failed to decode playground code:', e)
  }
}

// Check if running in Tauri desktop app
function isTauriDesktop() {
  return typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined
}

// Project Functions
async function loadProjects() {
  // Server mode: desktop-files.js handles loading from server
  // Don't load defaults here - wait for server content
  console.log('[App] Waiting for server content (via desktop-files.js)')
  // Don't override currentFile in playground mode
  if (!isPlaygroundMode) {
    currentFile = 'index.mir'
  }
}

// Legacy project functions removed - desktop app uses folder-based file management via desktop-files.js

// File tree structure (legacy, kept for compatibility)
let fileTree = []

// Legacy file list rendering removed - desktop app uses desktop-files.js for file tree

function renderFileList() {
  // Desktop app uses desktop-files.js for file tree - this function is no longer needed
  return
}

// Mode tabs (MIRROR / REACT)
let currentMode = 'mirror'
const reactFiles = {} // Cache for converted React files: { 'index.tsx': '...', ... }

// Helper to update status bar
function setModeStatus(message, type = 'ok') {
  const statusEl = document.getElementById('status')
  if (statusEl) {
    statusEl.textContent = message
    statusEl.className = type === 'error' ? 'status error' : 'status ok'
  }
}

document.querySelectorAll('.mode-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    if (tab.dataset.mode === currentMode) return

    const newMode = tab.dataset.mode

    // Switch from Mirror to React
    if (currentMode === 'mirror' && newMode === 'react') {
      try {
        // Save current editor content to files
        const currentContent = window.editor.state.doc.toString()
        files[currentFile] = currentContent

        // SET MODE FIRST to prevent compiler from running on React code
        currentMode = 'react'

        // Convert ALL mirror files to React
        Object.keys(reactFiles).forEach(k => delete reactFiles[k]) // Clear cache

        for (const [filePath, content] of Object.entries(files)) {
          if (!filePath.endsWith('.mirror')) continue
          try {
            const ast = MirrorLang.parse(content)
            const reactCode = MirrorLang.generateReact(ast)
            const reactPath = filePath.replace('.mirror', '.tsx')
            reactFiles[reactPath] = reactCode
          } catch (e) {
            console.warn(`Error converting ${filePath}:`, e)
            const reactPath = filePath.replace('.mirror', '.tsx')
            reactFiles[reactPath] = `// Conversion error for ${filePath}\n// ${e.message}`
          }
        }

        // Switch current file to .tsx equivalent
        const reactCurrentFile = currentFile.replace('.mirror', '.tsx')
        currentFile = reactCurrentFile

        // Update editor with current React file
        window.editor.dispatch({
          changes: {
            from: 0,
            to: window.editor.state.doc.length,
            insert: reactFiles[reactCurrentFile] || '',
          },
        })

        // Re-render file list with .tsx files
        renderFileListForMode('react')

        setModeStatus('React mode - ' + Object.keys(reactFiles).length + ' files')

        // Update tab UI
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'))
        tab.classList.add('active')
        return // Early return since we already set everything
      } catch (e) {
        console.error('Error switching to React mode:', e)
        currentMode = 'mirror' // Revert on error
        setModeStatus('Conversion error: ' + e.message, 'error')
        return
      }
    }

    // Switch from React to Mirror
    if (currentMode === 'react' && newMode === 'mirror') {
      try {
        // Save current React editor content
        const currentContent = window.editor.state.doc.toString()
        reactFiles[currentFile] = currentContent

        // SET MODE FIRST
        currentMode = 'mirror'

        // Convert ALL React files back to Mirror
        for (const [filePath, content] of Object.entries(reactFiles)) {
          if (!filePath.endsWith('.tsx')) continue
          try {
            const mirrorCode = MirrorLang.convertToMirrorCode(content)
            const mirrorPath = filePath.replace('.tsx', '.mirror')
            files[mirrorPath] = mirrorCode
          } catch (e) {
            console.warn(`Error converting ${filePath} back to Mirror:`, e)
            // Keep original mirror file if conversion fails
          }
        }

        // Switch current file to .mirror equivalent
        const mirrorCurrentFile = currentFile.replace('.tsx', '.mirror')
        currentFile = mirrorCurrentFile

        // Update editor with current Mirror file
        window.editor.dispatch({
          changes: {
            from: 0,
            to: window.editor.state.doc.length,
            insert: files[mirrorCurrentFile] || '',
          },
        })

        // Re-render file list with .mirror files
        renderFileList()

        // Trigger recompile
        compile(files[currentFile] || '')

        setModeStatus('Mirror mode')

        // Update tab UI
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'))
        tab.classList.add('active')
        return
      } catch (e) {
        console.error('Error switching to Mirror mode:', e)
        currentMode = 'react' // Revert on error
        setModeStatus('Conversion error: ' + e.message, 'error')
        return
      }
    }
  })
})

// Legacy function - desktop app uses desktop-files.js for file tree
function renderFileListForMode(mode) {
  // Desktop app uses desktop-files.js - this function is no longer needed
  return
}

// Switch file in React mode
function switchFileReactMode(filename) {
  if (typeof editor === 'undefined') return

  // Save current React file
  const currentContent = editor.state.doc.toString()
  reactFiles[currentFile] = currentContent

  // Switch to new file
  currentFile = filename
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: reactFiles[filename] || '' },
  })

  // Update active state in UI
  document.querySelectorAll('.file').forEach(f => f.classList.remove('active'))
  document.querySelector(`[data-file="${filename}"]`)?.classList.add('active')
}

// File rename functions
// Legacy file rename functions - desktop app uses desktop-files.js
function startRenameFile(filePath) {
  console.warn('[Legacy] startRenameFile not supported in desktop app')
}

async function renameFile(oldPath, newPath) {
  console.warn('[Legacy] renameFile not supported in desktop app')
}

// ===========================================
// FILE TYPES - Single Source of Truth
// ===========================================
// File Types (use Clean Code module)
const FILE_TYPES = FILE_TYPES_MODULE

function detectFileType(nameOrContent, content) {
  return detectFileTypeModule(nameOrContent, content)
}

function getFileIcon(filename, withColor = true) {
  return getFileIconModule(filename, getFileType, withColor)
}

function getFileTypeColor(filename) {
  return getFileTypeColorModule(filename, getFileType)
}

// Legacy create file/folder functions - desktop app uses native menu + desktop-files.js
function createNewFile(type = 'layout') {
  console.warn('[Legacy] createNewFile not supported - use File > New File menu')
}

function createNewFolder() {
  console.warn('[Legacy] createNewFolder not supported - use File > New Folder menu')
}

// Legacy delete functions - desktop app manages files via native file system
async function deleteFile(filePath) {
  console.warn('[Legacy] deleteFile not supported - use Finder to delete files')
}

async function deleteFolder(folderPath) {
  console.warn('[Legacy] deleteFolder not supported - use Finder to delete folders')
}

// Save file - Desktop app uses desktop-files.js for actual disk writes
async function saveFile(filePath, content) {
  // Update local cache
  files[filePath] = content

  // Desktop: use desktop-files.js for actual disk save (Tauri mode).
  if (window.desktopFiles?.saveFile && window.desktopFiles.getCurrentFolder()) {
    try {
      await window.desktopFiles.saveFile(filePath, content)
      console.log('[Save] File saved via desktop-files.js:', filePath)
    } catch (e) {
      console.error('[Save] Failed to save:', e)
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
    // Update status
    const status = document.getElementById('status')
    if (status) {
      status.textContent = 'Saved'
      setTimeout(() => {
        status.textContent = 'Ready'
      }, 1500)
    }
  }
}

// Save file type (explicit user-selected type) - in-memory only
function saveFileType(filename, type) {
  fileTypes[filename] = type
}

// Load file types - no-op (in-memory only)
function loadFileTypes() {
  // File types are stored in-memory only (per session)
}

// Delete file type when file is deleted
function deleteFileType(filename) {
  delete fileTypes[filename]
}

// Get file type (stored or detected)
function getFileType(filename) {
  // First check for explicit stored type
  if (fileTypes[filename]) {
    return fileTypes[filename]
  }

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
function switchFile(filename) {
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

// Initialize: Load projects
async function initApp() {
  await loadProjects()
}

// Start initialization (will complete after editor is set up)
let editorReady = false
const initPromise = initApp()

const initialCode = files[currentFile] || ''

// Token patterns
const patterns = [
  { regex: /\/\/.*$/gm, class: 'mir-comment' },
  { regex: /"[^"]*"/g, class: 'mir-string' },
  { regex: /#[0-9A-Fa-f]{3,8}\b/g, class: 'mir-hex' },
  { regex: /\b\d+(\.\d+)?(%|px|rem|em)?\b/g, class: 'mir-number' },
  { regex: /\b(as|extends|named|each|in|if|else|where|then|data)\b/g, class: 'mir-keyword' },
  {
    regex: /\b(hover|focus|active|disabled|filled|state|selected|highlighted|on|off)\b/g,
    class: 'mir-state',
  },
  {
    regex: /\b(onclick|onhover|onfocus|onblur|onchange|oninput|onkeydown|onkeyup|keys)\b/g,
    class: 'mir-event',
  },
  {
    regex:
      /\b(pad|padding|bg|background|col|color|gap|rad|radius|bor|border|width|height|size|font|weight|center|hor|ver|spread|wrap|hidden|visible|opacity|shadow|cursor|grid|scroll|clip|truncate|italic|underline|uppercase|lowercase|left|right|top|bottom|margin|min|max|animate|font-size)\b/g,
    class: 'mir-property',
  },
  {
    regex: /\b(show|hide|toggle|select|highlight|activate|deactivate|call|open|close|page)\b/g,
    class: 'mir-action',
  },
  { regex: /\b[A-Z][a-zA-Z0-9]*\b/g, class: 'mir-component' },
  { regex: /\$[a-zA-Z][a-zA-Z0-9.-]*/g, class: 'mir-binding' },
]

// Create decoration marks
const decorations = {}
patterns.forEach(p => {
  decorations[p.class] = Decoration.mark({ class: p.class })
})

// Tokenize text and build decorations
function tokenize(view) {
  const builder = new RangeSetBuilder()
  const text = view.state.doc.toString()
  const matches = []

  // Collect all matches with positions
  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0
    let match
    while ((match = pattern.regex.exec(text)) !== null) {
      matches.push({
        from: match.index,
        to: match.index + match[0].length,
        class: pattern.class,
      })
    }
  }

  // Sort by position and filter overlaps (first match wins)
  matches.sort((a, b) => a.from - b.from)
  const filtered = []
  let lastEnd = 0
  for (const m of matches) {
    if (m.from >= lastEnd) {
      filtered.push(m)
      lastEnd = m.to
    }
  }

  // Build range set
  for (const m of filtered) {
    builder.add(m.from, m.to, decorations[m.class])
  }

  return builder.finish()
}

// ViewPlugin for syntax highlighting
const mirrorHighlight = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = tokenize(view)
    }
    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = tokenize(update.view)
      }
    }
  },
  {
    decorations: v => v.decorations,
  }
)

// Autocomplete - using modular engine from studio/autocomplete/
// mirrorCompletions is imported from ./dist/index.js

// =============================================================================
// Color Picker setup (delegated to studio/pickers/color/setup.ts)
// =============================================================================
const colorPickerHandle = initColorPicker({
  getFiles: () => files,
  getEditor: () => window.editor ?? null,
})

// ==========================================
// Icon Picker Setup (using new TriggerManager)
// ==========================================

// componentPrimitives is managed by the new trigger system
// Expose for debugging
window.componentPrimitives = getIconTriggerPrimitives()

// Note: Click outside handling is now managed by TriggerManager

// NOTE: Animation Picker has been removed (2026-04-14)
// The TypeScript version is available at: studio/pickers/animation/
// and studio/editor/triggers/animation-trigger.ts

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
      await window.desktopFiles.openFolder()
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
    decorations
    constructor(view) {
      this.decorations = this.buildDecorations(view)
    }
    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view)
      }
    }
    buildDecorations(view) {
      const builder = new RangeSetBuilder()
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
const editorContainer = document.getElementById('editor-container')

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
      console.warn('Failed to read files from localStorage:', e)
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
  updateFile: (filename, content) => {
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
  updateFile: (filename, content) => {
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
let currentDiagnostics = []

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
    const tokens = {}
    const components = {}
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

let editor

editor = new EditorView({
  state: EditorState.create({
    doc: initialCode,
    extensions: [
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
            // Extract component name from template (e.g., "Select", "Checkbox")
            const componentName = dragData.componentName || dragData.template || ''
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
    ],
  }),
  parent: editorContainer,
})

// Debounce helper with cancel support
function debounce(fn, ms) {
  let timeout
  const debounced = (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), ms)
  }
  debounced.cancel = () => {
    clearTimeout(timeout)
  }
  return debounced
}

// Save current file (debounced) - uses API for logged-in users
const debouncedSave = debounce(code => {
  saveFile(currentFile, code)
  // Update icon if content type changed
  updateFileIcon(currentFile)
}, 500)

const debouncedCompile = debounce(() => {
  // Skip compilation in React mode
  if (currentMode === 'react') {
    // Still save the React code
    const code = editor.state.doc.toString()
    reactFiles[currentFile] = code
    return
  }
  const code = editor.state.doc.toString()
  compile(code)
  debouncedSave(code)
}, 300)

// Undo/Redo buttons
const undoBtn = document.getElementById('undo-btn')
const redoBtn = document.getElementById('redo-btn')

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
editor.__originalDispatch = originalDispatch // Expose for testing
editor.dispatch = (...args) => {
  originalDispatch(...args)
  updateUndoRedoButtons()
}

// Initial state
updateUndoRedoButtons()

// Folder toggle
document.querySelectorAll('.folder-header').forEach(header => {
  header.addEventListener('click', () => {
    header.parentElement.classList.toggle('collapsed')
  })
})

// Tab switching (Preview/Generated)
const preview = document.getElementById('preview')
const generatedCode = document.getElementById('generated-code')
const status = document.getElementById('status')
const tabs = document.querySelectorAll('.tab')
const tabContents = document.querySelectorAll('.tab-content')

// Preview Renderers (Clean Code modules) - lazy initialized
let tokenRenderer = null
let componentRenderer = null

function getTokenRenderer() {
  if (!tokenRenderer) {
    tokenRenderer = new TokenRenderer({
      preview,
      getAllProjectSource,
    })
  }
  return tokenRenderer
}

function getComponentRenderer() {
  if (!componentRenderer) {
    componentRenderer = new ComponentRenderer({
      preview,
      MirrorLang: window.MirrorLang,
      getTokensSource,
      getCurrentFileSource: () => files[currentFile] || '',
    })
  }
  return componentRenderer
}

// Zag dependencies builder for Clean Code module
function getZagDeps() {
  return {
    getAst: () => studio.state?.ast,
    getCurrentFile: () => currentFile,
    getFiles: () => window.desktopFiles?.getFiles?.() || files,
    parseCode: code => MirrorLang.parse(code),
    isMirrorFile,
    isComponentsFile,
    getEditor: () => editor,
    emitNotification: (type, message) => {
      studio.events.emit(`notification:${type}`, { message, duration: 2000 })
    },
    updateFileList: () => renderFileList(),
  }
}

// Zag wrapper functions (use Clean Code module with dependencies)
function isZagComponent(children) {
  return isZagComponentModule(children)
}

function findExistingZagDefinition(zagComponentName) {
  return findExistingZagDefinitionModule(zagComponentName, getZagDeps())
}

function generateZagComponentName(zagComponentName) {
  return generateZagComponentNameModule(zagComponentName, getZagDeps())
}

function generateZagDefinitionCode(definitionName, zagComponentName, children) {
  return generateZagDefinitionCodeModule(definitionName, zagComponentName, children)
}

function generateZagInstanceCode(instanceName, properties, children, indent = '') {
  return generateZagInstanceCodeModule(instanceName, properties, children, indent)
}

function addZagDefinitionToCode(definitionCode) {
  return addZagDefinitionToCodeModule(definitionCode, getZagDeps())
}

async function findOrCreateComponentsFile() {
  return findOrCreateComponentsFileModule(getZagDeps())
}

async function addZagDefinitionToComponentsFile(definitionCode, filePath) {
  return addZagDefinitionToComponentsFileModule(definitionCode, filePath, getZagDeps())
}

function getDropGlobals() {
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
    findExistingZagDefinition,
    generateZagComponentName,
    generateZagDefinitionCode,
    generateZagInstanceCode,
    addZagDefinitionToCode,
    findOrCreateComponentsFile,
    addZagDefinitionToComponentsFile,
    isZagComponent,
  }
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetId = tab.dataset.tab
    tabs.forEach(t => t.classList.remove('active'))
    tabContents.forEach(c => c.classList.remove('active'))
    tab.classList.add('active')
    document
      .getElementById(targetId === 'preview' ? 'preview' : 'generated-code')
      .classList.add('active')
  })
})

// Auto-create missing files when referenced
function autoCreateFile(path) {
  // Normalize path
  let filename = path
  if (!filename.endsWith('.mirror')) {
    filename = filename + '.mirror'
  }

  // Check if already exists
  if (files[filename]) return false

  // Create file with auto-generated comment
  const content = `// ${filename} (auto-created)`
  saveFile(filename, content)

  // Re-render sidebar
  renderFileList()

  console.log(`Auto-created: ${filename}`)
  return true
}

// Update file icon based on current content
function updateFileIcon(filename) {
  const fileEl = document.querySelector(`[data-file="${filename}"]`)
  if (!fileEl) return

  const iconSvg = getFileIcon(filename)

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

// Read file callback for import resolution and page navigation
// Auto-creates missing files
function readFile(path) {
  // Normalize path
  let filename = path
  if (!filename.endsWith('.mirror')) {
    filename = filename + '.mirror'
  }

  // If file doesn't exist, auto-create it
  if (!files[filename]) {
    autoCreateFile(path)
  }

  return files[filename] || null
}

// Make readFile available globally for runtime page navigation
window._mirrorReadFile = readFile

// Scan code for file references (import and route) and auto-create missing files
function autoCreateReferencedFiles(code) {
  // Find import statements: import name or import name1, name2
  const importRegex = /^\s*import\s+(.+)$/gm
  let match
  while ((match = importRegex.exec(code)) !== null) {
    const names = match[1]
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
    for (const name of names) {
      // Skip if it's a string (quoted)
      if (name.startsWith('"') || name.startsWith("'")) continue
      autoCreateFile(name)
    }
  }

  // Find page routes (lowercase): route name or route path/name
  const routeRegex = /\broute\s+([a-z][a-z0-9_\/]*)/g
  while ((match = routeRegex.exec(code)) !== null) {
    const routePath = match[1]
    autoCreateFile(routePath)
  }
}

// Get all token and component files as prelude code
// This ensures tokens and components are available when compiling layouts
function getPreludeCode(excludeFile) {
  const sections = []

  // Two file caches can hold project content: window.desktopFiles
  // (synced to disk in Tauri mode) and the in-memory `files` global
  // (used by the test API and browser-only flows). Merge both so the
  // prelude always reflects the union — without this, files added
  // via panel.files.create that didn't make it into the desktop cache
  // would be invisible to compilation.
  const desktopFiles = window.desktopFiles?.getFiles?.() || {}
  const allFiles = { ...files, ...desktopFiles }

  // Collect files by type. Order matches the CLI's project-mode pass
  // (compiler/cli.ts): data → tokens → components → layout. Data files
  // are inlined as Mirror DSL into the prelude — Mirror's grammar
  // accepts the same `key: value` indentation form as YAML for top-level
  // data declarations, and inlining lets the compiler register the
  // collection in __mirrorData via the same path as inline `tasks: ...`
  // declarations would. (The separate generateYAMLDataInjection() pass
  // also runs but writes to a wrong key when the YAML has an outer
  // wrapper — keeping the inline path makes both single-file scenarios
  // and YAML-file scenarios produce identical runtime data shapes.)
  const dataFiles = []
  const tokenFiles = []
  const componentFiles = []

  for (const filename of Object.keys(allFiles)) {
    if (filename === excludeFile) continue

    const fileType = getFileType(filename)
    if (fileType === 'data') {
      dataFiles.push(filename)
    } else if (fileType === 'tokens') {
      tokenFiles.push(filename)
    } else if (fileType === 'component') {
      componentFiles.push(filename)
    }
  }

  // Data first. Inline the data file content WITHOUT a `// === ${filename} ===`
  // header — the header would break Mirror's data-block parser when an
  // indented data declaration follows directly. Tokens and components
  // get the header (their parsers handle it).
  dataFiles.sort()
  for (const filename of dataFiles) {
    const content = allFiles[filename]
    if (content && content.trim()) {
      sections.push(content)
    }
  }

  // Tokens
  tokenFiles.sort()
  for (const filename of tokenFiles) {
    const content = allFiles[filename]
    if (content && content.trim()) {
      sections.push(`// === ${filename} ===\n${content}`)
    }
  }

  // Components
  componentFiles.sort()
  for (const filename of componentFiles) {
    const content = allFiles[filename]
    if (content && content.trim()) {
      sections.push(`// === ${filename} ===\n${content}`)
    }
  }

  return sections.join('\n\n')
}

// Compile and render
function compile(code) {
  const compileStart = performance.now()
  const timings = {}

  // Skip compilation if preview is showing LLM-generated content
  // This preserves the generated HTML app in Spec Studio mode
  const previewEl = document.getElementById('preview')
  if (previewEl?.dataset.generatedMode === 'true') {
    console.log('[Spec Studio] Skipping compile - showing generated content')
    return
  }

  // Update files with current code so ComponentRenderer can access it
  files[currentFile] = code

  if (!code.trim()) {
    // Render empty App container for drop target support
    preview.innerHTML = `<div class="mirror-root" style="width: 100%; height: 100%;">
      <div data-mirror-id="node-1" data-mirror-root="true" data-mirror-name="App" data-component="App"
           style="display: flex; flex-direction: column; width: 100%; height: 100%; min-height: 200px;">
      </div>
    </div>`
    preview.className = ''
    if (generatedCode) generatedCode.textContent = ''
    if (status) {
      status.textContent = 'Ready'
      status.className = 'status'
    }
    // Clear selection and update studio state for empty code
    if (studioSelectionManager) {
      studioSelectionManager.clearSelection()
      studioSelectionManager.setBreadcrumb([{ id: 'node-1', name: 'App' }])
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

  // Determine file type for preview mode
  const fileType = getFileType(currentFile)

  try {
    // Auto-create any missing referenced files
    autoCreateReferencedFiles(code)

    // For layout files, prepend all tokens and components
    // and wrap user code in an implicit full-screen root container
    let resolvedCode = code
    // In test mode, build the same tokens/components prelude as
    // production so cross-file token + component resolution is
    // available. The App-wrapping is intentionally skipped (tests want
    // node-1 to be the user's first element, not the synthetic App).
    if (testModeActive && fileType === 'layout') {
      const prelude = getPreludeCode(currentFile)
      if (prelude) {
        const separator = '\n\n// === ' + currentFile + ' ===\n'
        resolvedCode = prelude + separator + code
        currentPreludeOffset = prelude.length + separator.length
        currentPreludeLineOffset =
          resolvedCode.substring(0, currentPreludeOffset).split('\n').length - 1
      } else {
        currentPreludeOffset = 0
        currentPreludeLineOffset = 0
      }
    } else if (testModeActive) {
      // Non-layout in test mode (tokens.tok, components.com): compile alone.
      resolvedCode = code
      currentPreludeOffset = 0
      currentPreludeLineOffset = 0
    } else if (fileType === 'layout') {
      currentPreludeOffset = 0 // Reset prelude offset only in normal mode
      const prelude = getPreludeCode(currentFile)

      // Check if code already starts with "App" (legacy files)
      const startsWithApp = code.trimStart().startsWith('App')

      // Check if code contains component definitions at root level (lines ending with ":" at indent 0)
      // These should NOT be wrapped in App, as they would become slot definitions instead
      const hasRootComponentDefs = code.split('\n').some(line => {
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
          const separator = '\n\n// === ' + currentFile + ' ===\n'
          resolvedCode = prelude + separator + code
          currentPreludeOffset = prelude.length + separator.length
        }
      } else {
        // New mode: wrap user code in implicit App root
        // App is defined in components.com and can be styled there (padding, bg, etc.)
        isWrappedWithApp = true
        const rootWrapper = 'App'

        // Indent user code to be children of the implicit root
        const indentedCode = code
          .split('\n')
          .map(line => (line ? '  ' + line : ''))
          .join('\n')

        // Note: We do NOT add indent to currentPreludeOffset because CodeModifier
        // returns line-start positions (including indent). The indent is stripped
        // separately in handleStudioCodeChange when applying changes to the editor.
        if (prelude) {
          const separator = '\n\n// === ' + currentFile + ' ===\n'
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
    window.componentPrimitives = componentPrimitives // Update window reference

    // Build IR with source map for bidirectional editing
    const irResult = MirrorLang.toIR(ast, true)
    let sourceMap = irResult.sourceMap
    timings.irEnd = performance.now()

    // Generate DOM code
    const jsCode = MirrorLang.generateDOM(ast)
    timings.codegenEnd = performance.now()
    if (generatedCode) generatedCode.textContent = jsCode

    // Clear preview and set appropriate class
    preview.innerHTML = ''
    preview.className = ''

    // Render based on file type
    if (fileType === 'tokens') {
      preview.className = 'tokens-preview'
      getTokenRenderer().render(ast)
      // Update studio module with AST, IR and source map for tokens too
      updateStudio(ast, irResult.ir, sourceMap, resolvedCode)
    } else if (fileType === 'component') {
      preview.className = 'components-preview'
      getComponentRenderer().render(ast)
      // Update studio module with AST, IR and source map for component definitions
      updateStudio(ast, irResult.ir, sourceMap, resolvedCode)
    } else {
      // Layout or other: render UI
      // Also render local component definitions (not from prelude)
      let codeToCompile = resolvedCode
      let finalJsCode = jsCode

      // Find components defined in the current file (not prelude)
      const localAst = MirrorLang.parse(code)
      const localComponentNames = (localAst.components || []).map(c => c.name)

      // Check which local components are NOT already instanced
      const instancedNames = new Set((ast.instances || []).map(i => i.component))
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
      const yamlInjection = generateYAMLDataInjection()
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
        makePreviewElementsDraggable()
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

    if (status) {
      status.textContent = `OK - ${ast.components.length} components, ${ast.instances.length} instances`
      status.className = 'status ok'
    }

    // Validate code and update linter diagnostics
    // We validate the user's code (not resolved with prelude) so errors show at correct positions
    // BUT we pass prelude tokens/components so the validator knows what's defined in other files
    const preludeForValidation = getPreludeCode(currentFile)
    let preludeTokens = new Set()
    let preludeComponents = new Set()
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
      console.log('[CompilePerf] ========== SLOW COMPILE ==========')
      console.log(`[CompilePerf] Total: ${totalTime.toFixed(1)}ms`)
      console.log(`[CompilePerf] Prelude: ${(timings.preludeEnd - compileStart).toFixed(1)}ms`)
      console.log(`[CompilePerf] Parse: ${(timings.parseEnd - timings.preludeEnd).toFixed(1)}ms`)
      console.log(`[CompilePerf] IR: ${(timings.irEnd - timings.parseEnd).toFixed(1)}ms`)
      console.log(`[CompilePerf] Codegen: ${(timings.codegenEnd - timings.irEnd).toFixed(1)}ms`)
      if (timings.execEnd) {
        console.log(`[CompilePerf] Exec: ${(timings.execEnd - timings.prepExecStart).toFixed(1)}ms`)
        console.log(
          `[CompilePerf] UpdateStudio: ${(timings.updateStudioEnd - timings.execEnd).toFixed(1)}ms`
        )
        console.log(
          `[CompilePerf] DOM Append: ${(timings.domAppendEnd - timings.updateStudioEnd).toFixed(1)}ms`
        )
        console.log(
          `[CompilePerf] Draggables: ${(timings.draggablesEnd - timings.domAppendEnd).toFixed(1)}ms`
        )
        console.log(
          `[CompilePerf] Refresh: ${(timings.refreshEnd - timings.draggablesEnd).toFixed(1)}ms`
        )
        console.log(`[CompilePerf] Sync: ${(timings.syncEnd - timings.refreshEnd).toFixed(1)}ms`)
      }
      console.log('[CompilePerf] ================================')
    }
  } catch (err) {
    // Reset compile status on error
    studioActions.setCompiling(false)

    // Clear diagnostics on compile error (parser errors are shown in preview)
    currentDiagnostics = []
    if (editor) {
      forceLinting(editor)
    }

    if (status) {
      status.textContent = 'Error'
      status.className = 'status error'
    }
    preview.innerHTML = `
      <div class="error-box">
        <h3>Parse/Compile Error</h3>
        <pre>${err.message}</pre>
      </div>
    `
    if (generatedCode) generatedCode.textContent = `// Error: ${err.message}`
  }
}

// Token and Component preview rendering has been moved to Clean Code modules:
// - TokenRenderer in studio/compile/token-renderer.ts
// - ComponentRenderer in studio/compile/component-renderer.ts
// Access via getTokenRenderer() and getComponentRenderer()

function getTokensSource() {
  // Only get tokens and data files (not layouts or components)
  // Read from both active files cache AND localStorage to ensure all project files are included
  let tokensSource = ''
  const processedFiles = new Set()

  // First, check active files cache
  for (const filename of Object.keys(files)) {
    const type = getFileType(filename)
    if (type === 'tokens' || type === 'data') {
      tokensSource += files[filename] + '\n'
      processedFiles.add(filename)
    }
  }

  // Also check localStorage for files not yet loaded into active cache
  try {
    const storedFiles = localStorage.getItem('mirror-files')
    if (storedFiles) {
      const allFiles = JSON.parse(storedFiles)
      for (const filename of Object.keys(allFiles)) {
        if (processedFiles.has(filename)) continue
        const type = getFileType(filename)
        if (type === 'tokens' || type === 'data') {
          tokensSource += allFiles[filename] + '\n'
        }
      }
    }
  } catch (e) {
    console.warn('[getTokensSource] Failed to read from localStorage:', e)
  }

  return tokensSource
}

// ============================================
// Studio Module - Bidirectional Editing
// ============================================

// State for studio module
// NOTE: AST and SourceMap are now managed by studio/core/state.ts
// Access via: studio.state.get().ast, studio.state.get().sourceMap
let studioSelectionManager = null
let studioPropertyPanel = null
let studioPropertyExtractor = null
let studioCodeModifier = null
let studioRobustModifier = null // Robust wrapper for atomic updates
let canvasDragCleanups = [] // Cleanup functions for canvas element drag handlers
const initializedDraggables = new WeakSet() // Track elements with drag handlers to prevent duplicates
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
    console.log('[Test] Setting prelude offset:', offset, '(was:', currentPreludeOffset, ')')
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
    console.log('[Test] Exiting test mode')
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

    // Build prelude for layout files; tokens/component files compile alone.
    const fileType = getFileType(currentFile)
    let resolvedCode = code
    let preludeOffset = 0
    let preludeLineOffset = 0
    if (fileType === 'layout') {
      const prelude = getPreludeCode(currentFile)
      if (prelude) {
        const separator = '\n\n// === ' + currentFile + ' ===\n'
        resolvedCode = prelude + separator + code
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
        studioCodeModifier = new MirrorLang.CodeModifier(resolvedCode, sourceMap)
      }

      // Update robust modifier
      if (MirrorLang.createRobustModifier) {
        studioRobustModifier = MirrorLang.createRobustModifier(studioCodeModifier)
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
          ir: irResult,
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
        studioPropertyExtractor = new MirrorLang.PropertyExtractor(ast, sourceMap)
      }

      // Update PropertyPanel via updateStudioState (creates panel if not
      // exists, updates dependencies). Pass the resolved code so the
      // panel sees both prelude (tokens/components) and active file.
      if (typeof updateStudioState === 'function') {
        updateStudioState(ast, irResult, sourceMap, resolvedCode)
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
        let execCode = jsCode
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

      console.log('[Test] Test code compiled successfully')
      return true
    } catch (error) {
      console.error('[Test] Test code compile failed:', error)
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
    // Set code with history tracking (for undo tests)
    // Uses isolateHistory to ensure each call creates a separate undo entry
    setCodeWithHistory: code => {
      const transaction = editor.state.update({
        changes: { from: 0, to: editor.state.doc.length, insert: code },
        annotations: [Transaction.userEvent.of('test.setCode'), isolateHistory.of('full')],
      })
      editor.dispatch(transaction)
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

// File type processing order: data -> tokens -> components -> layouts
const FILE_TYPE_ORDER = ['data', 'tokens', 'component', 'layout']

/**
 * Get all project source in processing order (data -> tokens -> components -> layouts)
 * This allows the PropertyPanel to access tokens from all files
 */
function getAllProjectSource() {
  const filesByType = {}

  // Use desktop files cache if available (includes all preloaded files)
  // Falls back to local files object for playground/legacy mode
  const allFiles = window.desktopFiles?.getFiles?.() || files

  // Group files by type
  for (const filename of Object.keys(allFiles)) {
    const type = getFileType(filename)
    if (!filesByType[type]) {
      filesByType[type] = []
    }
    filesByType[type].push({ filename, content: allFiles[filename] })
  }

  // Concatenate in order: data -> tokens -> components -> layouts
  let allSource = ''
  for (const type of FILE_TYPE_ORDER) {
    const typeFiles = filesByType[type] || []
    for (const file of typeFiles) {
      allSource += file.content + '\n'
    }
  }

  return allSource
}

/**
 * Calculate the line offset for the current file in the combined source
 * Returns the number of lines that come before the current file
 *
 * Must match the structure created by getPreludeCode() + separator in compile():
 * prelude + '\n\n// === currentFile ===\n' + code
 */
function getCurrentFileLineOffset() {
  const fileType = getFileType(currentFile)

  // Only layout files have prelude
  if (fileType !== 'layout') {
    return 0
  }

  // Get the actual prelude and count its lines
  const prelude = getPreludeCode(currentFile)
  if (!prelude) {
    return 0
  }

  // Count lines in prelude
  const preludeLines = (prelude.match(/\n/g) || []).length + 1

  // The separator adds: '\n\n// === currentFile ===\n'
  // That's: 2 newlines + 1 comment line + 1 newline = 3 additional lines
  // Actually: the line count is prelude lines + 2 (blank line) + 1 (comment line)
  // The current file content starts on the line AFTER the comment
  const separatorLines = 3 // \n\n (blank line after prelude) + comment line + \n

  return preludeLines + separatorLines - 1 // -1 because editor line 1 should map to first content line
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
    console.warn('Studio: Property panel or preview container not found')
    return
  }

  // Explorer Panel containers
  const explorerPanelContainer = document.getElementById('explorer-panel')
  const fileTreeContainer = document.getElementById('file-tree-container')

  // Components Panel containers (separate from explorer)
  const componentsPanelContainer = document.getElementById('components-panel-container')
  const userComponentsPanelContainer = document.getElementById('user-components-panel-container')

  // Hide explorer panel in playground mode
  if (isPlaygroundMode && explorerPanelContainer) {
    explorerPanelContainer.style.display = 'none'
  }

  // ============================================
  // NEW ARCHITECTURE: Initialize new studio
  // ============================================
  try {
    initNewStudio({
      editor: editor,
      previewContainer: previewContainer,
      propertyPanelContainer: propertyPanelContainer,
      // Don't pass explorer containers in playground mode
      explorerPanelContainer: isPlaygroundMode ? undefined : explorerPanelContainer,
      fileTreeContainer: isPlaygroundMode ? undefined : fileTreeContainer,
      // Components Panel containers (separate from explorer)
      componentPanelContainer: isPlaygroundMode ? undefined : componentsPanelContainer,
      userComponentsPanelContainer: isPlaygroundMode ? undefined : userComponentsPanelContainer,
      initialSource: files[currentFile] || '',
      currentFile: currentFile,
      getAllSource: getAllProjectSource,
      getCurrentFile: () => currentFile,
      getFiles: () => {
        const allFiles = window.desktopFiles?.getFiles?.() || files
        return Object.entries(allFiles).map(([name, code]) => ({
          name,
          type: detectFileType(name, code),
          code,
        }))
      },
      updateFile: (filename, content) => {
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
    console.log('Studio: New architecture initialized')
  } catch (e) {
    console.warn('Studio: New architecture failed to initialize:', e)
  }

  // ============================================
  // SELECTION ADAPTER: Bridge between new state and legacy PropertyPanel
  // Uses StateSelectionAdapter which automatically syncs with core state
  // ============================================
  studioSelectionManager = getStateSelectionAdapter()

  // Focus tracking is now handled by EditorController and PreviewController
  // The state.editorHasFocus is updated automatically by the new architecture

  console.log('Studio: Initialized')
  // Preview click handling is done by PreviewController (new architecture)
  // Editor sync is done by SyncCoordinator via previewController.onSelect() callback

  // Set up notification handlers for user feedback
  setupNotificationHandlers()

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

/**
 * Setup notification event handlers for user feedback
 * Displays messages in the status bar
 */
function setupNotificationHandlers() {
  if (!studio?.events) return

  // Handle drag:dropped from v3 DragController (must be before statusEl check!)
  studio.events.on('drag:dropped', ({ source, target, dragData }) => {
    if (!target) {
      console.warn('[Drag v3] Missing target')
      return
    }
    // Canvas-only state: editor has no Mirror node tree (just an empty
    // editor or a `canvas …` declaration). Mirror still synthesizes an
    // implicit wrapper node for hit-detection, but it has no source-map
    // entry, so handleStudioDropNew can't insert into it. Fall back to
    // "append as new top-level element" — what the user actually means
    // by dropping a palette item there.
    if (source?.type === 'palette') {
      const before = editor?.state?.doc?.toString() ?? ''
      const trimmed = before.trim()
      const isEmptyOrCanvasOnly = trimmed === '' || /^canvas\b[^\n]*$/i.test(trimmed)
      if (isEmptyOrCanvasOnly) {
        const componentName = (dragData && dragData.componentName) || source.componentName
        let elementCode = (dragData && dragData.mirTemplate) || componentName
        if (dragData && !dragData.mirTemplate) {
          if (dragData.textContent) elementCode += ' "' + dragData.textContent + '"'
          if (dragData.properties) {
            elementCode += dragData.textContent
              ? ', ' + dragData.properties
              : ' ' + dragData.properties
          }
        }
        // Drops on canvas-only state always append as plain top-level
        // elements. Tried wrapping with `Frame w full, h full, <zone>`
        // to honor the drop's alignment zone, but it broke Mirror's
        // source-map for subsequent drops into the new tree. A proper
        // alignment-zone-honoring fix needs a Studio-level change in
        // the drop pipeline. Until then, demos that need a centred
        // element should explicitly set `center` via setProperty after
        // the drop.
        const inserted = elementCode
        const appended =
          before.length === 0 ? inserted : before.replace(/\s*$/, '') + '\n\n' + inserted
        const len = editor.state.doc.length
        editor.dispatch({ changes: { from: 0, to: len, insert: appended } })
        // Force an immediate recompile so the SourceMap reflects the
        // newly inserted nodes — without this, subsequent drops into
        // those new nodes get silently rejected because their source-map
        // entries don't exist yet.
        try {
          studio.events.emit('compile:requested')
        } catch (_e) {
          /* ignore */
        }
        return
      }
    }

    // Handle canvas element move (type: 'canvas')
    if (source?.type === 'canvas' && source.nodeId) {
      const dropResult = {
        source: {
          type: 'element',
          nodeId: source.nodeId,
        },
        targetNodeId: target.containerId,
        // Use 'absolute' placement for stacked containers with position
        placement: target.mode === 'absolute' && target.position ? 'absolute' : 'inside',
        insertionIndex: target.insertionIndex,
        // Include position for absolute/stacked drops
        absolutePosition: target.position || undefined,
        // Include alignment for aligned drops (9-point grid)
        alignment: target.mode === 'aligned' ? { zone: target.alignmentProperty } : undefined,
      }
      handleStudioDropNew(dropResult, getDropGlobals())
      return
    }

    // Handle palette component insert (type: 'palette')
    if (!dragData) {
      console.warn('[Drag v3] Missing dragData for palette drop')
      return
    }

    // Convert v3 format to DropResult format
    const dropResult = {
      source: {
        type: 'palette',
        componentId: dragData.componentId,
        componentName: dragData.componentName,
        template: dragData.componentName,
        properties: dragData.properties,
        textContent: dragData.textContent,
        children: dragData.children,
        mirTemplate: dragData.mirTemplate,
        dataBlock: dragData.dataBlock,
      },
      targetNodeId: target.containerId,
      // Use 'absolute' placement for stacked containers with position
      placement: target.mode === 'absolute' && target.position ? 'absolute' : 'inside',
      insertionIndex: target.insertionIndex,
      // Include position for absolute/stacked drops
      absolutePosition: target.position || undefined,
      // Include alignment for aligned drops (9-point grid)
      alignment: target.mode === 'aligned' ? { zone: target.alignmentProperty } : undefined,
    }

    handleStudioDropNew(dropResult, getDropGlobals()).catch(err => {
      console.error('[Drag v3] handleStudioDropNew failed:', err)
    })
  })

  // Immediate compile when requested (bypasses 300ms debounce for drag-drop operations)
  // This significantly improves perceived performance after drops
  // NOTE: Registered here before statusEl check so it's always available
  studio.events.on('compile:requested', () => {
    // Cancel pending debounce to avoid duplicate compiles
    if (typeof debouncedCompile !== 'undefined' && debouncedCompile.cancel) {
      debouncedCompile.cancel()
    }
    // Compile immediately with current editor content
    const code = editor?.state?.doc?.toString()
    if (code !== undefined) {
      compile(code)
      debouncedSave(code)
    }
  })

  const statusEl = document.getElementById('status')
  if (!statusEl) return

  // Store original status for restoring after notification
  let originalStatus = statusEl.textContent
  let originalClass = statusEl.className
  let notificationTimeout = null

  const showNotification = (message, type, duration = 3000) => {
    // Clear any existing timeout
    if (notificationTimeout) {
      clearTimeout(notificationTimeout)
    }

    // Save current status if not already in notification mode
    if (!statusEl.dataset.notifying) {
      originalStatus = statusEl.textContent
      originalClass = statusEl.className
      statusEl.dataset.notifying = 'true'
    }

    // Show notification
    statusEl.textContent = message
    statusEl.className = `status ${type}`

    // Restore original status after duration
    notificationTimeout = setTimeout(() => {
      statusEl.textContent = originalStatus
      statusEl.className = originalClass
      delete statusEl.dataset.notifying
      notificationTimeout = null
    }, duration)
  }

  studio.events.on('notification:info', ({ message, duration }) => {
    showNotification(message, 'info', duration ?? 3000)
  })

  studio.events.on('notification:success', ({ message, duration }) => {
    showNotification(message, 'ok', duration ?? 3000)
  })

  studio.events.on('notification:warning', ({ message, duration }) => {
    showNotification(message, 'warning', duration ?? 4000)
  })

  studio.events.on('notification:error', ({ message, duration }) => {
    showNotification(message, 'error', duration ?? 5000)
  })
}

// Property panel global event listeners are wired below in initStudio()
// via setupPropertyPanelIconPicker / setupPropertyPanelEventListeners
// (see studio/panels/property/event-listeners.ts).

// Update studio after compile
function updateStudio(ast, ir, sourceMap, source) {
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
    console.warn('Studio: New architecture update failed:', e)
  }

  // SourceMap sync handled by new architecture via updateStudioState()
  // NOTE: preview.refresh() is called in compile() AFTER DOM update

  const propertyPanelContainer = document.getElementById('property-panel')
  const previewContainer = document.getElementById('preview')

  // Update or create PropertyExtractor
  if (studioPropertyExtractor) {
    studioPropertyExtractor.updateAST(ast)
    studioPropertyExtractor.updateSourceMap(sourceMap)
  } else {
    studioPropertyExtractor = new MirrorLang.PropertyExtractor(ast, sourceMap)
  }

  // Update or create CodeModifier
  if (studioCodeModifier) {
    studioCodeModifier.updateSource(source)
    studioCodeModifier.updateSourceMap(sourceMap)
  } else {
    studioCodeModifier = new MirrorLang.CodeModifier(source, sourceMap)
  }

  // Create/update RobustModifier wrapper for atomic updates
  if (MirrorLang.createRobustModifier) {
    studioRobustModifier = MirrorLang.createRobustModifier(studioCodeModifier)
  }

  // NOTE: Selection validation is now handled atomically by state.ts setCompileResult()
  // The state emits 'selection:invalidated' event which PropertyPanel listens to

  // Update or create PropertyPanel
  if (studioPropertyPanel) {
    const selection = studioSelectionManager.getSelection()
    if (selection) {
      console.log('Studio: Refreshing property panel, selection:', selection)
    }
    studioPropertyPanel.updateDependencies(studioPropertyExtractor, studioCodeModifier)
  } else {
    studioPropertyPanel = new PropertyPanel(
      propertyPanelContainer,
      studioSelectionManager,
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

/**
 * Makes all preview elements draggable for canvas-internal movement
 *
 * Uses WeakSet to track initialized elements and prevent duplicate event listeners.
 * Cleanup functions are stored for elements that need reinitialization.
 */
function makePreviewElementsDraggable() {
  // Cleanup previous bindings for elements that may have been removed
  canvasDragCleanups.forEach(cleanup => cleanup())
  canvasDragCleanups = []

  if (!studio.dragDrop) return

  const previewContainer = document.getElementById('preview')
  if (!previewContainer) return

  // Find all elements with data-mirror-id
  const elements = previewContainer.querySelectorAll('[data-mirror-id]')

  elements.forEach(el => {
    const nodeId = el.getAttribute('data-mirror-id')
    if (!nodeId) return

    // Skip already initialized elements (prevents duplicate listeners)
    if (initializedDraggables.has(el)) return

    // Skip the actual root element (main component) - it cannot be moved
    // But allow its children to be dragged even if they're direct children of preview
    const isMainRoot = el.dataset.mirrorRoot === 'true'
    if (isMainRoot) return

    // Make element draggable using new DragDropSystem
    const cleanup = studio.dragDrop.makeElementDraggable(el)
    canvasDragCleanups.push(cleanup)
    initializedDraggables.add(el)
  })
}

// Handle code changes from property panel.
// Delegates the resolved-source → editor-source coordinate translation
// to studio/core/wrap-utils.ts so this path and bootstrap.ts's
// PropertyPanel onCodeChange callback can never drift apart.
function handleStudioCodeChange(result) {
  if (!result.success) {
    console.warn('Studio: Code modification failed:', result.error)
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
    console.warn('Studio: Invalid change range after adjustment', {
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

// Global undo/redo via CommandExecutor (when preview has focus)
document.addEventListener('keydown', e => {
  // Don't interfere with editor's own undo/redo
  if (getEditorHasFocus()) return
  // Don't interfere with input fields
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const modifier = isMac ? e.metaKey : e.ctrlKey

  if (modifier && e.key === 'z') {
    if (e.shiftKey) {
      // Redo
      if (executor.canRedo()) {
        e.preventDefault()
        const result = executor.redo()
        if (result.success) {
          compile(editor.state.doc.toString())
          console.log('Studio: Redo via CommandExecutor')
        }
      }
    } else {
      // Undo
      if (executor.canUndo()) {
        e.preventDefault()
        const result = executor.undo()
        if (result.success) {
          compile(editor.state.doc.toString())
          console.log('Studio: Undo via CommandExecutor')
        }
      }
    }
  }
  // Also support Ctrl+Y for redo on Windows
  if (!isMac && e.ctrlKey && e.key === 'y') {
    if (executor.canRedo()) {
      e.preventDefault()
      const result = executor.redo()
      if (result.success) {
        compile(editor.state.doc.toString())
        console.log('Studio: Redo via CommandExecutor')
      }
    }
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
  import('./desktop-files.js')
    .then(module => {
      // Initialize with callback to load files into editor
      module.initDesktopFiles({
        onFileSelect: (filePath, content) => {
          console.log('[DesktopFiles] Loading file into editor:', filePath)
          // Update currentFile for appLockExtension
          currentFile = filePath
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
          console.log('[DesktopFiles] File changed:', filePath)
        },
      })
      console.log('[App] File management initialized')
    })
    .catch(err => {
      console.error('[App] Failed to load studio bundle:', err)
    })
} else {
  console.log('[App] Playground mode - skipping file management')
}

// ==========================================
// Desktop Menu Event Handler (Tauri)
// ==========================================
async function setupDesktopMenuHandler() {
  if (!isTauriDesktop()) return

  // Wait for TauriBridge to be available
  let attempts = 0
  while (!window.TauriBridge?.menu && attempts < 50) {
    await new Promise(r => setTimeout(r, 100))
    attempts++
  }

  if (!window.TauriBridge?.menu) {
    console.error('[Menu] TauriBridge.menu not available after waiting')
    return
  }

  try {
    await window.TauriBridge.menu.onMenuClick(async menuId => {
      console.log('[Menu] Event:', menuId)

      switch (menuId) {
        // File menu
        case 'open_folder':
          if (window.desktopFiles) {
            const path = await window.desktopFiles.openFolder()
            if (path) {
              console.log('[Menu] Opened folder:', path)
            }
          }
          break

        case 'new_file':
          console.log('[Menu] new_file - currentFolder:', window.desktopFiles?.getCurrentFolder())
          if (window.desktopFiles?.getCurrentFolder()) {
            // Generate unique filename
            const existingFiles = Object.keys(window.desktopFiles.getFiles() || {})
            let counter = 1
            let fileName = 'new.mirror'
            while (existingFiles.some(f => f.endsWith(fileName))) {
              fileName = `new-${counter}.mirror`
              counter++
            }
            console.log('[Menu] new_file - creating:', fileName)
            await window.desktopFiles.createFile(fileName)
          } else {
            await alert('Bitte zuerst einen Ordner öffnen (File → Open Folder oder ⌘O)', {
              title: 'Kein Projekt',
            })
          }
          break

        case 'new_folder':
          console.log('[Menu] new_folder - currentFolder:', window.desktopFiles?.getCurrentFolder())
          if (window.desktopFiles?.getCurrentFolder()) {
            // Generate unique folder name
            let counter = 1
            let folderName = 'new-folder'
            // Note: We can't easily check existing folders, so just increment
            console.log('[Menu] new_folder - creating:', folderName)
            await window.desktopFiles.createFolder(folderName)
          } else {
            await alert('Bitte zuerst einen Ordner öffnen (File → Open Folder oder ⌘O)', {
              title: 'Kein Projekt',
            })
          }
          break

        case 'save':
          if (window.desktopFiles?.getCurrentFile()) {
            const content = editor.state.doc.toString()
            await window.desktopFiles.saveFile(window.desktopFiles.getCurrentFile(), content)
          }
          break

        case 'save_all':
          // Save all open files
          const files = window.desktopFiles?.getFiles() || {}
          for (const [path, content] of Object.entries(files)) {
            await window.desktopFiles.saveFile(path, content)
          }
          break

        case 'new_project':
          // Not needed for desktop - just open folder
          break

        // View menu - Panel toggles
        case 'toggle_prompt':
        case 'toggle_files':
        case 'toggle_code':
        case 'toggle_components':
        case 'toggle_preview':
        case 'toggle_property':
          const panelKey = menuId.replace('toggle_', '')
          studioActions.setPanelVisibility(panelKey, !studioActions.getPanelVisibility?.(panelKey))
          break

        default:
          console.log('[Menu] Unhandled:', menuId)
      }
    })
    console.log('[App] Desktop menu handler registered')
  } catch (err) {
    console.error('[Menu] Failed to register handler:', err)
  }
}

// Call the setup function
setupDesktopMenuHandler()

// Expose for debugging
window.editor = editor
window.studioSelectionManager = studioSelectionManager
window.startCompletion = startCompletion
window.closeCompletion = closeCompletion
window.files = files
window.switchFile = switchFile // For test API (panel.files.open) and external scripts
window.getCurrentFile = () => currentFile // For test API (panel.files.getCurrentFile)
window.studio = studio // New architecture
window.generateComponentCodeFromDragData = generateComponentCodeFromDragData // For editor drop tests
window.resetCode = async () => {
  // No longer supported - all content comes from server
  console.log('[App] resetCode is deprecated - content managed by server')
}

// ==========================================
// Resizable Panel Dividers with localStorage persistence
// (delegated to studio/ui/panel-dividers.ts)
// ==========================================
initPanelDividers({
  sidebar: document.getElementById('explorer-panel'),
  sidebarDivider: document.getElementById('sidebar-divider'),
  componentsPanel: document.getElementById('components-panel'),
  componentsDivider: document.getElementById('components-divider'),
  editorPanel: document.querySelector('.editor-panel'),
  editorDivider: document.getElementById('editor-divider'),
  previewPanel: document.querySelector('.preview-panel'),
  getStudio: () => window.MirrorStudio,
})

// ==========================================
// Image Upload Feature
// ==========================================
// Implementation lives in studio/editor/image-drop-handler.ts. The
// desktop app doesn't upload to imgbb (Claude CLI handles auth, no
// API key needed) — pass an empty key so the handler short-circuits.

initImageDropHandler({
  editor: window.editor,
  editorPanel: document.querySelector('.editor-panel'),
  uploadIndicator: document.getElementById('upload-indicator'),
  dropOverlay: document.getElementById('drop-overlay'),
  getImgbbKey: () => '',
})

// ==========================================================================
// LLM Integration - React to Mirror Workflow (use Clean Code module)
// ==========================================================================

function convertReactToMirror(reactCode) {
  return convertReactToMirrorModule(reactCode)
}

function buildReactSystemPrompt(context) {
  return buildReactSystemPromptModule(context)
}
