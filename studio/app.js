import { EditorState, RangeSetBuilder, Prec, Annotation, Transaction } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, Decoration, ViewPlugin } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab, undo, redo, undoDepth, redoDepth } from '@codemirror/commands'
import { autocompletion, completionKeymap, startCompletion, closeCompletion } from '@codemirror/autocomplete'
import { indentUnit } from '@codemirror/language'

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
  // Ghost Renderer for palette drag previews
  getGhostRenderer,
  // DragDropService - must use studio bundle to share GhostRenderer instance
  DragDropService,
  // Layout presets from studio bundle (single source of truth)
  LAYOUT_PRESETS as STUDIO_LAYOUT_PRESETS,
  BASIC_COMPONENTS as STUDIO_BASIC_COMPONENTS,
  // Inline Prompt Extension (AI code generation)
  inlinePromptExtension,
  // Fixer Service (AI multi-file code generation)
  createFixer,
  getFixer,
  // Component Drop Extension (proper CodeMirror integration)
  createComponentDropExtension,
  insertComponentCode,
  insertComponentWithDefinition,
  generateComponentCodeFromDragData,
} from './dist/index.js?v=126'

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
  tokens: ['.tok', '.tokens']
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
    ...MIRROR_EXTENSIONS.tokens
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
const STORAGE_VERSION = 4  // Increment this when storage format changes

const DEBUG_SYNC = false  // Enable verbose sync logging
let currentProject = null
let projects = []
const files = {}
const fileTypes = {} // Stores explicit file types: { 'filename.mirror': 'component' }
let currentFile = 'index.mir'

// ============================================
// YAML Parser for Auto-Loading
// ============================================

/**
 * Simple YAML parser for data files
 * Supports: strings, numbers, booleans, arrays, objects
 */
function parseYAML(text) {
  const lines = text.split('\n')
  const result = {}
  let currentArray = null
  let currentKey = ''
  let currentIndent = 0

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue

    // Array item
    if (trimmed.startsWith('- ')) {
      const value = trimmed.slice(2).trim()

      // Object in array: - key: value
      if (value.includes(': ')) {
        const obj = {}
        // Parse inline object properties
        const parts = value.split(', ')
        for (const part of parts) {
          const colonIdx = part.indexOf(': ')
          if (colonIdx > 0) {
            const k = part.slice(0, colonIdx).trim()
            const v = parseYAMLValue(part.slice(colonIdx + 2).trim())
            obj[k] = v
          }
        }

        if (!currentArray) {
          currentArray = []
          if (currentKey) result[currentKey] = currentArray
        }
        currentArray.push(obj)
      } else {
        // Simple array item
        if (!currentArray) {
          currentArray = []
          if (currentKey) result[currentKey] = currentArray
        }
        currentArray.push(parseYAMLValue(value))
      }
      continue
    }

    // Key-value pair
    const colonIdx = trimmed.indexOf(':')
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim()
      const value = trimmed.slice(colonIdx + 1).trim()

      const indent = line.length - line.trimStart().length

      if (indent === 0) {
        // Top-level key
        currentKey = key
        currentArray = null
        currentIndent = indent

        if (value) {
          result[key] = parseYAMLValue(value)
        }
      } else if (indent > currentIndent && currentArray) {
        // Nested property in array object
        const lastItem = currentArray[currentArray.length - 1]
        if (typeof lastItem === 'object' && lastItem !== null) {
          lastItem[key] = parseYAMLValue(value)
        }
      }
    }
  }

  // If entire file is just an array
  if (currentArray && Object.keys(result).length === 0) {
    return currentArray
  }

  return result
}

/**
 * Parse a YAML value (string, number, boolean, null)
 */
function parseYAMLValue(value) {
  // Remove quotes
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }

  // Boolean
  if (value === 'true') return true
  if (value === 'false') return false

  // Null
  if (value === 'null' || value === '~') return null

  // Number
  const num = Number(value)
  if (!isNaN(num) && value !== '') return num

  return value
}

/**
 * Collect all YAML data files and parse them
 * Returns an object with filename (without extension) as keys
 */
function collectYAMLData() {
  const allFiles = window.desktopFiles?.getFiles?.() || files
  const yamlData = {}

  for (const filename of Object.keys(allFiles)) {
    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase()
    if (ext === '.yaml' || ext === '.yml') {
      const content = allFiles[filename]
      if (content && content.trim()) {
        // Use filename without extension as the data key
        const name = filename.replace(/\.ya?ml$/i, '').replace(/^.*[\/\\]/, '')
        try {
          yamlData[name] = parseYAML(content)
          console.log(`[YAML] Loaded ${name}:`, yamlData[name])
        } catch (e) {
          console.warn(`[YAML] Failed to parse ${filename}:`, e)
        }
      }
    }
  }

  return yamlData
}

/**
 * Generate JavaScript code to inject YAML data into __mirrorData
 */
function generateYAMLDataInjection() {
  const yamlData = collectYAMLData()
  if (Object.keys(yamlData).length === 0) return ''

  // Generate assignment statements to merge into __mirrorData
  let code = '\n// Auto-loaded YAML data\n'
  for (const [name, data] of Object.entries(yamlData)) {
    code += `__mirrorData["${name}"] = ${JSON.stringify(data)};\n`
  }
  return code
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
          changes: { from: 0, to: window.editor.state.doc.length, insert: reactFiles[reactCurrentFile] || '' }
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
          changes: { from: 0, to: window.editor.state.doc.length, insert: files[mirrorCurrentFile] || '' }
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
    changes: { from: 0, to: editor.state.doc.length, insert: reactFiles[filename] || '' }
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
const FILE_TYPES = {
  layout: {
    label: 'Layout',
    placeholder: 'home',
    color: '#5BA8F5',
    extension: '.mir',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18"/>
      <path d="M9 21V9"/>
    </svg>`,
    template: (name) => `// ${name} Layout
// UI Layout Seite

Box pad 24, gap 16, bg #0a0a0f
  Text "${name}", font-size 24, weight bold
  Text "Layout content here..."
`,
    detect: (content) => {
      // Default type - only if nothing else matches
      return false
    }
  },
  component: {
    label: 'Components',
    placeholder: 'buttons',
    color: '#8B5CF6',
    extension: '.com',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>`,
    template: (name) => `// ${name} Components
// Komponenten-Definitionen

// Button Komponente
Button: pad 12 24, bg #5BA8F5, rad 8, cursor pointer
  state hover bg #2271C1

// Card Komponente
Card: pad 16, bg #1a1a23, rad 8
  Title:
  Content:
`,
    detect: (lines) => {
      // Component definitions: Name: (uppercase, ends with colon)
      let hasDefinitions = false
      let hasInstances = false
      for (const line of lines) {
        if (/^[A-Z][a-zA-Z0-9]*\s*(as\s+[a-zA-Z]+\s*)?:/.test(line)) {
          hasDefinitions = true
        } else if (/^[A-Z][a-zA-Z0-9]*(\s|$)/.test(line) && !line.includes(':')) {
          hasInstances = true
        }
      }
      return hasDefinitions && !hasInstances
    }
  },
  tokens: {
    label: 'Tokens',
    placeholder: 'theme',
    color: '#F59E0B',
    extension: '.tok',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="7" r="4"/>
      <circle cx="7" cy="15" r="4"/>
      <circle cx="17" cy="15" r="4"/>
    </svg>`,
    template: (name) => `// ${name} Design Tokens
// Farben, Abstände und Typografie

// Farb-Palette
grey-900.bg: #18181B
grey-800.bg: #27272A
grey-700.bg: #3F3F46

// Background Colors
accent.bg: #5BA8F5
surface.bg: #27272A
canvas.bg: #18181B

// Text Colors
text.col: #ffffff
muted.col: #a1a1aa

// Spacing (s=4, m=8, l=16)
s.pad: 4
m.pad: 8
l.pad: 16
s.gap: 4
m.gap: 8
l.gap: 16

// Radius (s=4, m=8, l=12)
s.rad: 4
m.rad: 8
l.rad: 12
`,
    detect: (lines) => {
      // Token definitions: $name: value or lowercase: value
      // BUT only if there are NO component instances (those make it a layout)
      let hasTokens = false
      let hasInstances = false
      for (const line of lines) {
        if (/^\$?[a-z][a-zA-Z0-9.-]*:\s*(#[0-9A-Fa-f]+|\d+|"[^"]*"|\$)/.test(line)) {
          hasTokens = true
        }
        // Check for component instances (PascalCase without colon = instance)
        if (/^[A-Z][a-zA-Z0-9]*(\s|$)/.test(line) && !line.includes(':')) {
          hasInstances = true
        }
      }
      // Only tokens file if has tokens but NO instances
      return hasTokens && !hasInstances
    }
  },
  data: {
    label: 'Data',
    placeholder: 'users',
    color: '#22C55E',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>
    </svg>`,
    template: (name) => `// ${name} Data
// Daten und Collections

$users:
  - id 1, name "Max", role "admin"
  - id 2, name "Anna", role "user"
  - id 3, name "Tom", role "user"

$tasks:
  - id 1, title "Task 1", done false
  - id 2, title "Task 2", done true
`,
    detect: (lines) => {
      // Data: $name: followed by - items
      for (const line of lines) {
        if (/^\s*-\s+\w+/.test(line)) {
          return true
        }
      }
      return false
    }
  },
  javascript: {
    label: 'JavaScript',
    placeholder: 'utils',
    color: '#EC4899',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M16 18l6-6-6-6"/>
      <path d="M8 6l-6 6 6 6"/>
    </svg>`,
    template: (name) => `// ${name} JavaScript
// Custom JavaScript Code

javascript
  function handle${name.replace(/[^a-zA-Z]/g, '')}() {
console.log('${name} loaded')
  }

  // Export für Mirror
  window.${name.replace(/[^a-zA-Z]/g, '')} = {
init: handle${name.replace(/[^a-zA-Z]/g, '')}
  }
end
`,
    detect: (lines, content) => {
      return content.includes('javascript') && content.includes('end')
    }
  }
}

// Detect file type from content
function detectFileType(nameOrContent, content) {
  // Support both old (content only) and new (name, content) signatures
  let filename = ''
  let code = nameOrContent

  if (content !== undefined) {
    filename = nameOrContent
    code = content
  }

  // Check filename patterns first
  if (filename) {
    const lower = filename.toLowerCase()
    if (lower.includes('token')) return 'tokens'
    if (lower.includes('component')) return 'component'  // Always singular
  }

  if (!code || !code.trim()) return 'layout'

  const lines = code.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('//') && !l.startsWith('import'))

  if (lines.length === 0) return 'layout'

  // Check each type's detect function (order matters: more specific first)
  const checkOrder = ['javascript', 'data', 'tokens', 'component']
  for (const type of checkOrder) {
    if (FILE_TYPES[type].detect(lines, code)) {
      return type  // Always return singular form ('component', not 'components')
    }
  }

  return 'layout'
}

// Get icon SVG for file (with color)
function getFileIcon(filename, withColor = true) {
  const type = getFileType(filename)
  const fileType = FILE_TYPES[type] || FILE_TYPES.layout
  if (withColor) {
    return fileType.icon.replace('stroke="currentColor"', `stroke="${fileType.color}"`)
  }
  return fileType.icon
}

// Get file type color
function getFileTypeColor(filename) {
  const type = getFileType(filename)
  return (FILE_TYPES[type] || FILE_TYPES.layout).color
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

  // Desktop: use desktop-files.js for actual disk save
  if (window.desktopFiles?.saveFile && window.desktopFiles.getCurrentFolder()) {
    try {
      await window.desktopFiles.saveFile(filePath, content)
      console.log('[Save] File saved via desktop-files.js:', filePath)
    } catch (e) {
      console.error('[Save] Failed to save:', e)
    }
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
      setTimeout(() => { status.textContent = 'Ready' }, 1500)
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

  // Dispatch with fileSwitchAnnotation to bypass the App lock filter
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: files[filename] || '' },
    annotations: fileSwitchAnnotation.of(true)
  })

  // Update active state in UI
  document.querySelectorAll('.file').forEach(f => f.classList.remove('active'))
  document.querySelector(`[data-file="${filename}"]`)?.classList.add('active')

  // Compile
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
  { regex: /\b(hover|focus|active|disabled|filled|state|selected|highlighted|on|off)\b/g, class: 'mir-state' },
  { regex: /\b(onclick|onhover|onfocus|onblur|onchange|oninput|onkeydown|onkeyup|keys)\b/g, class: 'mir-event' },
  { regex: /\b(pad|padding|bg|background|col|color|gap|rad|radius|bor|border|width|height|size|font|weight|center|hor|ver|spread|wrap|hidden|visible|opacity|shadow|cursor|grid|scroll|clip|truncate|italic|underline|uppercase|lowercase|left|right|top|bottom|margin|min|max|animate|font-size)\b/g, class: 'mir-property' },
  { regex: /\b(show|hide|toggle|select|highlight|activate|deactivate|call|open|close|page)\b/g, class: 'mir-action' },
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
        class: pattern.class
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
const mirrorHighlight = ViewPlugin.fromClass(class {
  constructor(view) {
    this.decorations = tokenize(view)
  }
  update(update) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = tokenize(update.view)
    }
  }
}, {
  decorations: v => v.decorations
})


// Autocomplete - using modular engine from studio/autocomplete/
// mirrorCompletions is imported from ./dist/index.js

// ==========================================
// Color Picker Setup (before editor)
// ==========================================

// Open Color - cleaner palette with single gray scale
const OPEN_COLORS = [
  { name: 'gray', shades: ['#f8f9fa', '#f1f3f5', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd', '#868e96', '#495057', '#343a40', '#212529'] },
  { name: 'red', shades: ['#fff5f5', '#ffe3e3', '#ffc9c9', '#ffa8a8', '#ff8787', '#ff6b6b', '#fa5252', '#f03e3e', '#e03131', '#c92a2a'] },
  { name: 'pink', shades: ['#fff0f6', '#ffdeeb', '#fcc2d7', '#faa2c1', '#f783ac', '#f06595', '#e64980', '#d6336c', '#c2255c', '#a61e4d'] },
  { name: 'grape', shades: ['#f8f0fc', '#f3d9fa', '#eebefa', '#e599f7', '#da77f2', '#cc5de8', '#be4bdb', '#ae3ec9', '#9c36b5', '#862e9c'] },
  { name: 'violet', shades: ['#f3f0ff', '#e5dbff', '#d0bfff', '#b197fc', '#9775fa', '#845ef7', '#7950f2', '#7048e8', '#6741d9', '#5f3dc4'] },
  { name: 'indigo', shades: ['#edf2ff', '#dbe4ff', '#bac8ff', '#91a7ff', '#748ffc', '#5c7cfa', '#4c6ef5', '#4263eb', '#3b5bdb', '#364fc7'] },
  { name: 'blue', shades: ['#e7f5ff', '#d0ebff', '#a5d8ff', '#74c0fc', '#4dabf7', '#339af0', '#228be6', '#1c7ed6', '#1971c2', '#1864ab'] },
  { name: 'cyan', shades: ['#e3fafc', '#c5f6fa', '#99e9f2', '#66d9e8', '#3bc9db', '#22b8cf', '#15aabf', '#1098ad', '#0c8599', '#0b7285'] },
  { name: 'teal', shades: ['#e6fcf5', '#c3fae8', '#96f2d7', '#63e6be', '#38d9a9', '#20c997', '#12b886', '#0ca678', '#099268', '#087f5b'] },
  { name: 'green', shades: ['#ebfbee', '#d3f9d8', '#b2f2bb', '#8ce99a', '#69db7c', '#51cf66', '#40c057', '#37b24d', '#2f9e44', '#2b8a3e'] },
  { name: 'lime', shades: ['#f4fce3', '#e9fac8', '#d8f5a2', '#c0eb75', '#a9e34b', '#94d82d', '#82c91e', '#74b816', '#66a80f', '#5c940d'] },
  { name: 'yellow', shades: ['#fff9db', '#fff3bf', '#ffec99', '#ffe066', '#ffd43b', '#fcc419', '#fab005', '#f59f00', '#f08c00', '#e67700'] },
  { name: 'orange', shades: ['#fff4e6', '#ffe8cc', '#ffd8a8', '#ffc078', '#ffa94d', '#ff922b', '#fd7e14', '#f76707', '#e8590c', '#d9480f'] },
]

// Tailwind CSS v3 Colors
const TAILWIND_COLORS = [
  { name: 'slate', shades: ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a'] },
  { name: 'gray', shades: ['#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827'] },
  { name: 'zinc', shades: ['#fafafa', '#f4f4f5', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a', '#18181b'] },
  { name: 'red', shades: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'] },
  { name: 'orange', shades: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'] },
  { name: 'amber', shades: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'] },
  { name: 'yellow', shades: ['#fefce8', '#fef9c3', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12'] },
  { name: 'lime', shades: ['#f7fee7', '#ecfccb', '#d9f99d', '#bef264', '#a3e635', '#84cc16', '#65a30d', '#4d7c0f', '#3f6212', '#365314'] },
  { name: 'green', shades: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'] },
  { name: 'emerald', shades: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'] },
  { name: 'teal', shades: ['#f0fdfa', '#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a'] },
  { name: 'cyan', shades: ['#ecfeff', '#cffafe', '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'] },
  { name: 'sky', shades: ['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e'] },
  { name: 'blue', shades: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#5BA8F5', '#2271C1', '#1d4ed8', '#1e40af', '#1e3a8a'] },
  { name: 'indigo', shades: ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'] },
  { name: 'violet', shades: ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'] },
  { name: 'purple', shades: ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87'] },
  { name: 'fuchsia', shades: ['#fdf4ff', '#fae8ff', '#f5d0fe', '#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf', '#86198f', '#701a75'] },
  { name: 'pink', shades: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'] },
  { name: 'rose', shades: ['#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337'] },
]

// Material Design Colors
const MATERIAL_COLORS = [
  { name: 'red', shades: ['#ffebee', '#ffcdd2', '#ef9a9a', '#e57373', '#ef5350', '#f44336', '#e53935', '#d32f2f', '#c62828', '#b71c1c'] },
  { name: 'pink', shades: ['#fce4ec', '#f8bbd0', '#f48fb1', '#f06292', '#ec407a', '#e91e63', '#d81b60', '#c2185b', '#ad1457', '#880e4f'] },
  { name: 'purple', shades: ['#f3e5f5', '#e1bee7', '#ce93d8', '#ba68c8', '#ab47bc', '#9c27b0', '#8e24aa', '#7b1fa2', '#6a1b9a', '#4a148c'] },
  { name: 'deepPurple', shades: ['#ede7f6', '#d1c4e9', '#b39ddb', '#9575cd', '#7e57c2', '#673ab7', '#5e35b1', '#512da8', '#4527a0', '#311b92'] },
  { name: 'indigo', shades: ['#e8eaf6', '#c5cae9', '#9fa8da', '#7986cb', '#5c6bc0', '#3f51b5', '#3949ab', '#303f9f', '#283593', '#1a237e'] },
  { name: 'blue', shades: ['#e3f2fd', '#bbdefb', '#90caf9', '#64b5f6', '#42a5f5', '#2196f3', '#1e88e5', '#1976d2', '#1565c0', '#0d47a1'] },
  { name: 'lightBlue', shades: ['#e1f5fe', '#b3e5fc', '#81d4fa', '#4fc3f7', '#29b6f6', '#03a9f4', '#039be5', '#0288d1', '#0277bd', '#01579b'] },
  { name: 'cyan', shades: ['#e0f7fa', '#b2ebf2', '#80deea', '#4dd0e1', '#26c6da', '#00bcd4', '#00acc1', '#0097a7', '#00838f', '#006064'] },
  { name: 'teal', shades: ['#e0f2f1', '#b2dfdb', '#80cbc4', '#4db6ac', '#26a69a', '#009688', '#00897b', '#00796b', '#00695c', '#004d40'] },
  { name: 'green', shades: ['#e8f5e9', '#c8e6c9', '#a5d6a7', '#81c784', '#66bb6a', '#4caf50', '#43a047', '#388e3c', '#2e7d32', '#1b5e20'] },
  { name: 'lightGreen', shades: ['#f1f8e9', '#dcedc8', '#c5e1a5', '#aed581', '#9ccc65', '#8bc34a', '#7cb342', '#689f38', '#558b2f', '#33691e'] },
  { name: 'lime', shades: ['#f9fbe7', '#f0f4c3', '#e6ee9c', '#dce775', '#d4e157', '#cddc39', '#c0ca33', '#afb42b', '#9e9d24', '#827717'] },
  { name: 'yellow', shades: ['#fffde7', '#fff9c4', '#fff59d', '#fff176', '#ffee58', '#ffeb3b', '#fdd835', '#fbc02d', '#f9a825', '#f57f17'] },
  { name: 'amber', shades: ['#fff8e1', '#ffecb3', '#ffe082', '#ffd54f', '#ffca28', '#ffc107', '#ffb300', '#ffa000', '#ff8f00', '#ff6f00'] },
  { name: 'orange', shades: ['#fff3e0', '#ffe0b2', '#ffcc80', '#ffb74d', '#ffa726', '#ff9800', '#fb8c00', '#f57c00', '#ef6c00', '#e65100'] },
  { name: 'deepOrange', shades: ['#fbe9e7', '#ffccbc', '#ffab91', '#ff8a65', '#ff7043', '#ff5722', '#f4511e', '#e64a19', '#d84315', '#bf360c'] },
  { name: 'brown', shades: ['#efebe9', '#d7ccc8', '#bcaaa4', '#a1887f', '#8d6e63', '#795548', '#6d4c41', '#5d4037', '#4e342e', '#3e2723'] },
  { name: 'grey', shades: ['#fafafa', '#f5f5f5', '#eeeeee', '#e0e0e0', '#bdbdbd', '#9e9e9e', '#757575', '#616161', '#424242', '#212121'] },
  { name: 'blueGrey', shades: ['#eceff1', '#cfd8dc', '#b0bec5', '#90a4ae', '#78909c', '#607d8b', '#546e7a', '#455a64', '#37474f', '#263238'] },
]

const colorPicker = document.getElementById('color-picker')
const colorPickerGrid = document.getElementById('color-picker-grid')
const colorPickerTailwindGrid = document.getElementById('color-picker-tailwind-grid')
const colorPickerMaterialGrid = document.getElementById('color-picker-material-grid')
const colorPickerTokenGrid = document.getElementById('color-picker-token-grid')
const colorPreview = document.getElementById('color-preview')
const colorHex = document.getElementById('color-hex')
let colorPickerVisible = false
let colorPickerInsertPos = null
let colorPickerReplaceRange = null // { from, to } for replacing existing colors
let colorPickerProperty = null // Current property type (bg, col, etc.)
let colorPickerCallback = null // Callback for property panel mode

// Hash trigger state (for typing # to open color picker)
let hashTriggerActive = false
let hashTriggerStartPos = null
let selectedSwatchIndex = 0
let colorSwatchElements = []
const SWATCH_COLUMNS = 13  // Number of color columns in grid (Open Color)
const SWATCH_ROWS = 10    // Number of shades per color

// Color picker tab state
let currentColorTab = 'custom' // 'custom', 'tailwind', 'open', 'material'

// Custom color picker state (HSV)
let customColorState = {
  h: 220,  // Hue (0-360)
  s: 100,  // Saturation (0-100)
  v: 100,  // Value/Brightness (0-100)
  a: 1     // Alpha (0-1)
}

// Build the color grid
function buildColorGrid() {
  colorPickerGrid.innerHTML = ''
  colorSwatchElements = []
  let swatchIndex = 0
  OPEN_COLORS.forEach((scale, colIndex) => {
    const col = document.createElement('div')
    col.className = 'color-picker-column'
    scale.shades.forEach((hex, rowIndex) => {
      const btn = document.createElement('button')
      btn.className = 'color-swatch'
      btn.style.backgroundColor = hex
      btn.dataset.color = hex
      btn.dataset.index = swatchIndex
      btn.dataset.col = colIndex
      btn.dataset.row = rowIndex
      colorSwatchElements.push(btn)
      btn.addEventListener('mouseenter', () => {
        colorPreview.style.backgroundColor = hex
        colorHex.textContent = hex.toUpperCase()
        if (hashTriggerActive) {
          selectedSwatchIndex = parseInt(btn.dataset.index)
          updateSelectedSwatch()
        }
      })
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        selectColor(hex.toUpperCase())
      })
      col.appendChild(btn)
      swatchIndex++
    })
    colorPickerGrid.appendChild(col)
  })
}
buildColorGrid()

// Build Tailwind color grid
function buildTailwindColorGrid() {
  colorPickerTailwindGrid.innerHTML = ''
  TAILWIND_COLORS.forEach((scale) => {
    const col = document.createElement('div')
    col.className = 'color-picker-column'
    scale.shades.forEach((hex) => {
      const btn = document.createElement('button')
      btn.className = 'color-swatch'
      btn.style.backgroundColor = hex
      btn.dataset.color = hex
      btn.addEventListener('mouseenter', () => {
        colorPreview.style.backgroundColor = hex
        colorHex.textContent = hex.toUpperCase()
      })
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        selectColor(hex.toUpperCase())
      })
      col.appendChild(btn)
    })
    colorPickerTailwindGrid.appendChild(col)
  })
}
buildTailwindColorGrid()

// Build Material color grid
function buildMaterialColorGrid() {
  colorPickerMaterialGrid.innerHTML = ''
  MATERIAL_COLORS.forEach((scale) => {
    const col = document.createElement('div')
    col.className = 'color-picker-column'
    scale.shades.forEach((hex) => {
      const btn = document.createElement('button')
      btn.className = 'color-swatch'
      btn.style.backgroundColor = hex
      btn.dataset.color = hex
      btn.addEventListener('mouseenter', () => {
        colorPreview.style.backgroundColor = hex
        colorHex.textContent = hex.toUpperCase()
      })
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        selectColor(hex.toUpperCase())
      })
      col.appendChild(btn)
    })
    colorPickerMaterialGrid.appendChild(col)
  })
}
buildMaterialColorGrid()

// Tab switching
function initColorPickerTabs() {
  const tabs = colorPicker.querySelectorAll('.color-picker-tab')
  const contents = colorPicker.querySelectorAll('.color-picker-content')

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab
      currentColorTab = tabName

      // Update tab active state
      tabs.forEach(t => t.classList.remove('active'))
      tab.classList.add('active')

      // Update content visibility
      contents.forEach(c => c.classList.remove('active'))
      const content = document.getElementById(`color-picker-${tabName}`)
      if (content) content.classList.add('active')

      // Initialize custom picker canvas if needed
      if (tabName === 'custom') {
        drawColorArea()
        updateHueSlider()
        updateAlphaSlider()
      }
    })
  })
}
initColorPickerTabs()

// ==========================================
// Custom Color Picker (Figma-style)
// ==========================================

const colorPickerArea = document.getElementById('color-picker-area')
const colorPickerHue = document.getElementById('color-picker-hue')
const colorPickerHueThumb = document.getElementById('color-picker-hue-thumb')
const colorPickerAlpha = document.getElementById('color-picker-alpha')
const colorPickerAlphaThumb = document.getElementById('color-picker-alpha-thumb')
const colorPickerHexInput = document.getElementById('color-picker-hex-input')
const colorPickerOpacityInput = document.getElementById('color-picker-opacity-input')
const colorPickerEyedropper = document.getElementById('color-picker-eyedropper')

let colorAreaDragging = false
let hueDragging = false
let alphaDragging = false

// HSV to RGB conversion
function hsvToRgb(h, s, v) {
  s /= 100
  v /= 100
  const c = v * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = v - c
  let r, g, b
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  }
}

// RGB to Hex
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()
}

// Hex to RGB
function hexToRgb(hex) {
  hex = hex.replace('#', '')
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('')
  }
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16)
  }
}

// RGB to HSV
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max
  if (max !== min) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: h * 360, s: s * 100, v: v * 100 }
}

// Get current color as hex
function getCurrentColorHex() {
  const rgb = hsvToRgb(customColorState.h, customColorState.s, customColorState.v)
  return rgbToHex(rgb.r, rgb.g, rgb.b)
}

// Draw the color area (saturation/brightness)
function drawColorArea() {
  if (!colorPickerArea) return
  const ctx = colorPickerArea.getContext('2d')
  const width = colorPickerArea.width
  const height = colorPickerArea.height

  // Clear
  ctx.clearRect(0, 0, width, height)

  // Base hue color
  const hueRgb = hsvToRgb(customColorState.h, 100, 100)
  ctx.fillStyle = `rgb(${hueRgb.r}, ${hueRgb.g}, ${hueRgb.b})`
  ctx.fillRect(0, 0, width, height)

  // White gradient (left to right)
  const whiteGrad = ctx.createLinearGradient(0, 0, width, 0)
  whiteGrad.addColorStop(0, 'rgba(255, 255, 255, 1)')
  whiteGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = whiteGrad
  ctx.fillRect(0, 0, width, height)

  // Black gradient (top to bottom)
  const blackGrad = ctx.createLinearGradient(0, 0, 0, height)
  blackGrad.addColorStop(0, 'rgba(0, 0, 0, 0)')
  blackGrad.addColorStop(1, 'rgba(0, 0, 0, 1)')
  ctx.fillStyle = blackGrad
  ctx.fillRect(0, 0, width, height)

  // Draw cursor
  const cursorX = (customColorState.s / 100) * width
  const cursorY = (1 - customColorState.v / 100) * height
  ctx.beginPath()
  ctx.arc(cursorX, cursorY, 6, 0, Math.PI * 2)
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cursorX, cursorY, 7, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'
  ctx.lineWidth = 1
  ctx.stroke()
}

// Update hue slider thumb position
function updateHueSlider() {
  if (!colorPickerHueThumb) return
  const percent = customColorState.h / 360 * 100
  colorPickerHueThumb.style.left = `${percent}%`
}

// Update alpha slider
function updateAlphaSlider() {
  if (!colorPickerAlpha || !colorPickerAlphaThumb) return
  const hex = getCurrentColorHex()
  colorPickerAlpha.style.backgroundImage = `
    linear-gradient(to right, transparent, ${hex}),
    repeating-conic-gradient(#404040 0% 25%, #606060 0% 50%)
  `
  colorPickerAlphaThumb.style.left = `${customColorState.a * 100}%`
}

// Update all color displays
function updateColorDisplays() {
  const hex = getCurrentColorHex()
  colorPreview.style.backgroundColor = hex
  colorHex.textContent = hex
  if (colorPickerHexInput) {
    colorPickerHexInput.value = hex.replace('#', '')
  }
  if (colorPickerOpacityInput) {
    colorPickerOpacityInput.value = Math.round(customColorState.a * 100) + '%'
  }
  updateAlphaSlider()
}

// Color area mouse events
if (colorPickerArea) {
  colorPickerArea.addEventListener('mousedown', (e) => {
    colorAreaDragging = true
    handleColorAreaMove(e)
  })
}

function handleColorAreaMove(e) {
  if (!colorPickerArea) return
  const rect = colorPickerArea.getBoundingClientRect()
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
  customColorState.s = (x / rect.width) * 100
  customColorState.v = (1 - y / rect.height) * 100
  drawColorArea()
  updateColorDisplays()
}

// Hue slider mouse events
if (colorPickerHue) {
  colorPickerHue.addEventListener('mousedown', (e) => {
    hueDragging = true
    handleHueMove(e)
  })
}

function handleHueMove(e) {
  if (!colorPickerHue) return
  const rect = colorPickerHue.getBoundingClientRect()
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  customColorState.h = (x / rect.width) * 360
  updateHueSlider()
  drawColorArea()
  updateColorDisplays()
}

// Alpha slider mouse events
if (colorPickerAlpha) {
  colorPickerAlpha.addEventListener('mousedown', (e) => {
    alphaDragging = true
    handleAlphaMove(e)
  })
}

function handleAlphaMove(e) {
  if (!colorPickerAlpha) return
  const rect = colorPickerAlpha.getBoundingClientRect()
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  customColorState.a = x / rect.width
  updateAlphaSlider()
  updateColorDisplays()
}

// Global mouse move/up for sliders
document.addEventListener('mousemove', (e) => {
  if (colorAreaDragging) handleColorAreaMove(e)
  if (hueDragging) handleHueMove(e)
  if (alphaDragging) handleAlphaMove(e)
})

document.addEventListener('mouseup', () => {
  colorAreaDragging = false
  hueDragging = false
  alphaDragging = false
})

// Hex input
if (colorPickerHexInput) {
  colorPickerHexInput.addEventListener('input', (e) => {
    let hex = e.target.value.replace('#', '')
    if (hex.length === 6 && /^[0-9A-Fa-f]+$/.test(hex)) {
      const rgb = hexToRgb(hex)
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b)
      customColorState.h = hsv.h
      customColorState.s = hsv.s
      customColorState.v = hsv.v
      drawColorArea()
      updateHueSlider()
      updateColorDisplays()
    }
  })

  colorPickerHexInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Use current color from state (not input value) to ensure sync
      const hex = getCurrentColorHex()
      selectColor(hex)
    }
  })
}

// Opacity input
if (colorPickerOpacityInput) {
  colorPickerOpacityInput.addEventListener('input', (e) => {
    let val = parseInt(e.target.value.replace('%', ''))
    if (!isNaN(val)) {
      customColorState.a = Math.max(0, Math.min(100, val)) / 100
      updateAlphaSlider()
    }
  })
}

// Eyedropper (if supported)
if (colorPickerEyedropper && 'EyeDropper' in window) {
  colorPickerEyedropper.addEventListener('click', async () => {
    try {
      const eyeDropper = new EyeDropper()
      const result = await eyeDropper.open()
      const rgb = hexToRgb(result.sRGBHex)
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b)
      customColorState.h = hsv.h
      customColorState.s = hsv.s
      customColorState.v = hsv.v
      drawColorArea()
      updateHueSlider()
      updateColorDisplays()
    } catch (e) {
      // User cancelled or error
    }
  })
} else if (colorPickerEyedropper) {
  colorPickerEyedropper.style.display = 'none'
}

// Set color from hex (used when opening picker with existing color)
function setCustomColorFromHex(hex) {
  if (!hex) return
  const rgb = hexToRgb(hex)
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b)
  customColorState.h = hsv.h
  customColorState.s = hsv.s
  customColorState.v = hsv.v
  drawColorArea()
  updateHueSlider()
  updateColorDisplays()
}

// ==========================================
// Token Colors for Color Picker
// ==========================================

// Property → token suffix mapping for filtering
const COLOR_PROPERTY_SUFFIXES = {
  bg: '.bg',
  background: '.bg',
  col: '.col',
  color: '.col',
  boc: '.boc',
  'border-color': '.boc',
  'hover-bg': '.bg',
  'hover-col': '.col',
  'hover-boc': '.boc',
  ic: '.col',
  'icon-color': '.col',
}

// Extract color tokens from files
function extractColorTokens() {
  const tokens = []

  // Iterate through all files
  for (const [filename, content] of Object.entries(files)) {
    if (!content) continue

    // Match token definitions: $name: #hex or name: #hex
    const lines = content.split('\n')
    for (const line of lines) {
      // Match patterns like: $accent.bg: #5BA8F5 or primary: #5BA8F5
      const tokenMatch = line.match(/^\s*\$?([\w.-]+)\s*:\s*(#[0-9A-Fa-f]{3,8})\s*(?:\/\/.*)?$/)
      if (tokenMatch) {
        const name = tokenMatch[1]
        const value = tokenMatch[2]
        tokens.push({ name: '$' + name, value: value.toUpperCase() })
      }
    }
  }

  return tokens
}

// Build token colors section based on property type
function buildTokenColors(property) {
  if (!colorPickerTokenGrid) return

  colorPickerTokenGrid.innerHTML = ''

  // Get the suffix for this property
  const suffix = property ? COLOR_PROPERTY_SUFFIXES[property] : null

  // Extract all color tokens
  const allTokens = extractColorTokens()

  // Sort tokens: matching suffix first, then by name
  let sortedTokens = [...allTokens]
  if (suffix) {
    sortedTokens.sort((a, b) => {
      const aMatches = a.name.endsWith(suffix) ? 0 : 1
      const bMatches = b.name.endsWith(suffix) ? 0 : 1
      if (aMatches !== bMatches) return aMatches - bMatches
      return a.name.localeCompare(b.name)
    })
  }

  // Update label with count
  const label = colorPicker.querySelector('.color-picker-label')
  if (label) {
    const matchCount = suffix ? allTokens.filter(t => t.name.endsWith(suffix)).length : 0
    if (suffix && matchCount > 0) {
      label.textContent = `Tokens (${matchCount} ${suffix})`
    } else {
      label.textContent = `Tokens (${allTokens.length})`
    }
  }

  // Group tokens by prefix (part before the dot)
  const groups = new Map()
  sortedTokens.forEach(token => {
    // Remove $ prefix and get base name
    const name = token.name.startsWith('$') ? token.name.slice(1) : token.name
    const dotIndex = name.lastIndexOf('.')
    const prefix = dotIndex > 0 ? name.slice(0, dotIndex) : '_ungrouped'
    if (!groups.has(prefix)) {
      groups.set(prefix, [])
    }
    groups.get(prefix).push(token)
  })

  // Create swatches grouped by prefix
  groups.forEach((tokens, prefix) => {
    // Create group container
    const groupEl = document.createElement('div')
    groupEl.className = 'token-group'

    // Group label (clickable to insert base token)
    if (prefix !== '_ungrouped' && tokens.length > 1) {
      const groupLabel = document.createElement('span')
      groupLabel.className = 'token-group-label'
      groupLabel.textContent = prefix
      groupLabel.title = `$${prefix}`
      groupLabel.addEventListener('click', () => {
        selectColor('$' + prefix)
      })
      groupEl.appendChild(groupLabel)
    }

    // Token swatches in this group
    const swatchContainer = document.createElement('div')
    swatchContainer.className = 'token-group-swatches'

    tokens.forEach(token => {
      const btn = document.createElement('button')
      btn.className = 'token-swatch'
      // Highlight matching suffix tokens
      if (suffix && token.name.endsWith(suffix)) {
        btn.classList.add('token-swatch-match')
      }
      btn.style.backgroundColor = token.value
      btn.dataset.token = token.name
      btn.dataset.color = token.value
      btn.title = token.name

      btn.addEventListener('mouseenter', () => {
        colorPreview.style.backgroundColor = token.value
        colorHex.textContent = token.name
      })

      btn.addEventListener('click', (e) => {
        e.preventDefault()
        // Insert token name instead of hex value
        selectColor(token.name)
      })

      swatchContainer.appendChild(btn)
    })

    groupEl.appendChild(swatchContainer)
    colorPickerTokenGrid.appendChild(groupEl)
  })

  // Hide section if no tokens
  const section = document.getElementById('color-picker-tokens')
  if (section) {
    section.style.display = allTokens.length > 0 ? 'block' : 'none'
  }
}

function showColorPicker(x, y, insertPos, replaceRange = null, initialColor = null, isHashTrigger = false, hashStartPos = null, property = null, callback = null) {
  colorPickerInsertPos = insertPos
  colorPickerReplaceRange = replaceRange
  hashTriggerActive = isHashTrigger
  hashTriggerStartPos = hashStartPos
  colorPickerProperty = property
  colorPickerCallback = callback || null

  // Smart positioning: check if picker fits below, otherwise show above
  const pickerHeight = 400 // Approximate height of color picker
  const pickerWidth = 260 // Approximate width of color picker
  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth
  const margin = 8

  // Calculate final position
  let finalX = x
  let finalY = y

  // Check vertical: if not enough space below, position above
  if (y + pickerHeight > viewportHeight - margin) {
    // Position above the trigger (subtract picker height and some offset for the trigger element)
    finalY = Math.max(margin, y - pickerHeight - 36)
  }

  // Check horizontal: if not enough space to the right, position to the left of the trigger
  if (x + pickerWidth > viewportWidth - margin) {
    // Position picker to the left of the trigger point
    finalX = Math.max(margin, x - pickerWidth - 8)
  }

  colorPicker.style.left = finalX + 'px'
  colorPicker.style.top = finalY + 'px'
  colorPicker.classList.add('visible')
  colorPickerVisible = true
  const displayColor = initialColor || '#5BA8F5'
  colorPreview.style.backgroundColor = displayColor
  colorHex.textContent = displayColor.toUpperCase()

  // Initialize custom color picker with current color
  if (displayColor) {
    setCustomColorFromHex(displayColor)
  }

  // Build token colors for this property
  buildTokenColors(property)

  // Reset and show selection for hash trigger mode
  if (isHashTrigger) {
    // Start selection at blue-500 (#5BA8F5) which is column 4 (blue), row 5 (500)
    selectedSwatchIndex = 4 * SWATCH_ROWS + 5
    updateSelectedSwatch()
  } else {
    // Clear selection for non-hash mode
    colorSwatchElements.forEach(el => el.classList.remove('selected'))
  }

  // Initialize custom tab canvas if active
  if (currentColorTab === 'custom') {
    drawColorArea()
    updateHueSlider()
    updateAlphaSlider()
  }

  // Focus hex input when opened from property panel (callback mode)
  // This ensures keyboard input goes to the picker, not the editor
  if (callback && colorPickerHexInput && currentColorTab === 'custom') {
    setTimeout(() => {
      colorPickerHexInput.focus()
      colorPickerHexInput.select()
    }, 50)
  }
}

function hideColorPicker() {
  colorPicker.classList.remove('visible')
  colorPickerVisible = false
  colorPickerInsertPos = null
  colorPickerReplaceRange = null
  colorPickerCallback = null
  hashTriggerActive = false
  hashTriggerStartPos = null
  colorSwatchElements.forEach(el => el.classList.remove('selected'))
}

// Update selected swatch highlight
function updateSelectedSwatch() {
  colorSwatchElements.forEach((el, i) => {
    el.classList.toggle('selected', i === selectedSwatchIndex)
  })

  const selected = colorSwatchElements[selectedSwatchIndex]
  if (selected) {
    const hex = selected.dataset.color
    colorPreview.style.backgroundColor = hex
    colorHex.textContent = hex.toUpperCase()
  }
}

// Navigate through swatches with arrow keys
function navigateSwatches(direction) {
  const currentCol = Math.floor(selectedSwatchIndex / SWATCH_ROWS)
  const currentRow = selectedSwatchIndex % SWATCH_ROWS

  let newCol = currentCol
  let newRow = currentRow

  switch (direction) {
    case 'left':
      newCol = Math.max(0, currentCol - 1)
      break
    case 'right':
      newCol = Math.min(SWATCH_COLUMNS - 1, currentCol + 1)
      break
    case 'up':
      newRow = Math.max(0, currentRow - 1)
      break
    case 'down':
      newRow = Math.min(SWATCH_ROWS - 1, currentRow + 1)
      break
  }

  selectedSwatchIndex = newCol * SWATCH_ROWS + newRow
  updateSelectedSwatch()
}

/**
 * Validate and clamp position to document bounds
 * @param {number} pos - Position to validate
 * @param {number} docLength - Document length
 * @param {string} context - Context for error message
 * @returns {number} Safe position
 */
function validatePosition(pos, docLength, context) {
  if (pos < 0 || pos > docLength) {
    console.warn(`[ColorPicker] ${context}: Position ${pos} out of bounds [0, ${docLength}], clamping`)
    return Math.max(0, Math.min(pos, docLength))
  }
  return pos
}

/**
 * Insert color into editor with robust position handling
 * Uses position tracking + defensive validation for maximum reliability
 */
function selectColor(hex) {
  // Property panel callback mode - direct callback, no editor modification
  if (colorPickerCallback) {
    const callback = colorPickerCallback
    hideColorPicker()
    callback(hex)
    return
  }

  // Editor mode - insert color with validated positions
  if (window.editor) {
    const docLength = window.editor.state.doc.length
    const cursorPos = window.editor.state.selection.main.head

    if (hashTriggerActive && hashTriggerStartPos !== null) {
      // Hash trigger mode: Replace from # to cursor
      // Position tracking keeps hashTriggerStartPos updated via mapPos()
      const safeFrom = validatePosition(hashTriggerStartPos, docLength, 'Hash trigger from')
      const safeTo = validatePosition(cursorPos, docLength, 'Hash trigger to')

      // Verify # still exists at expected position (catches edge cases)
      const charAtFrom = window.editor.state.doc.sliceString(safeFrom, safeFrom + 1)
      if (charAtFrom !== '#') {
        console.warn(`[ColorPicker] Hash trigger: Expected # at position ${safeFrom}, found '${charAtFrom}'. Inserting at cursor instead.`)
        insertColorAtPosition(window.editor, cursorPos, cursorPos, hex)
      } else {
        insertColorAtPosition(window.editor, safeFrom, safeTo, hex)
      }
    } else if (colorPickerReplaceRange) {
      // Replace mode: Replace existing color
      // Position tracking keeps range updated via mapPos()
      let safeFrom = validatePosition(colorPickerReplaceRange.from, docLength, 'Replace from')
      let safeTo = validatePosition(colorPickerReplaceRange.to, docLength, 'Replace to')

      // Sanity check: Range shouldn't be larger than typical color value
      const rangeSize = safeTo - safeFrom
      if (rangeSize > 20 || rangeSize < 0) {
        console.warn(`[ColorPicker] Replace mode: Invalid range size ${rangeSize} (${safeFrom}-${safeTo}). Using cursor position.`)
        safeFrom = cursorPos
        safeTo = cursorPos
      }

      insertColorAtPosition(window.editor, safeFrom, safeTo, hex)
    } else if (colorPickerInsertPos !== null) {
      // Insert mode: Insert new color
      // Position tracking keeps insertPos updated via mapPos()
      let safePos = validatePosition(colorPickerInsertPos, docLength, 'Insert')

      // Drift detection: If position drifted far from cursor, use cursor
      const drift = Math.abs(safePos - cursorPos)
      if (drift > 100) {
        console.warn(`[ColorPicker] Insert mode: Position drifted ${drift} chars from cursor (${safePos} vs ${cursorPos}). Using cursor.`)
        safePos = cursorPos
      }

      insertColorAtPosition(window.editor, safePos, safePos, hex)
    }
    window.editor.focus()
  }
  hideColorPicker()
}

/**
 * Helper: Insert color at validated positions
 */
function insertColorAtPosition(editor, from, to, hex) {
  editor.dispatch({
    changes: { from, to, insert: hex },
    selection: { anchor: from + hex.length },
    annotations: Transaction.userEvent.of('input.color')
  })
}

// Color picker keyboard handling
// Use capturing phase to intercept events before CodeMirror
document.addEventListener('keydown', (e) => {
  if (!colorPickerVisible) return

  // Escape: close picker (except in hash trigger mode which has its own handler)
  if (e.key === 'Escape' && !hashTriggerActive) {
    e.preventDefault()
    e.stopPropagation()
    hideColorPicker()
    if (window.editor) window.editor.focus()
    return
  }

  // Enter: select current color
  if (e.key === 'Enter') {
    e.preventDefault()
    e.stopPropagation()

    let colorToSelect = null

    // On custom tab, use the custom color state
    if (currentColorTab === 'custom') {
      colorToSelect = getCurrentColorHex()
    } else {
      // On swatch tabs, use the selected swatch
      const selected = colorSwatchElements[selectedSwatchIndex]
      if (selected) {
        colorToSelect = selected.dataset.color
      }
    }

    if (colorToSelect) {
      selectColor(colorToSelect.toUpperCase())
    }
    return
  }

  // Arrow keys: navigate swatches (only on swatch tabs)
  if (currentColorTab !== 'custom' && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault()
    e.stopPropagation()
    const direction = e.key.replace('Arrow', '').toLowerCase()
    navigateSwatches(direction)
    return
  }
}, true) // Use capturing phase

document.addEventListener('mousedown', (e) => {
  if (colorPickerVisible && !colorPicker.contains(e.target)) {
    hideColorPicker()
  }
})

// Global API for property panel to use color picker
window.showColorPickerForProperty = function(x, y, property, currentValue, callback) {
  showColorPicker(x, y, null, null, currentValue, false, null, property, callback)
}

// Global API for editor trigger to use color picker
window.showColorPicker = showColorPicker
window.hideColorPicker = hideColorPicker

// ==========================================
// Icon Picker Setup (using new TriggerManager)
// ==========================================

// componentPrimitives is managed by the new trigger system
// Expose for debugging
window.componentPrimitives = getIconTriggerPrimitives()

// Note: Click outside handling is now managed by TriggerManager

// ==========================================
// ANIMATION PICKER (Vanilla JS)
// ==========================================

const EASING_PRESETS = [
  { name: 'linear', value: 'linear' },
  { name: 'ease', value: 'ease' },
  { name: 'ease-in', value: 'ease-in' },
  { name: 'ease-out', value: 'ease-out' },
  { name: 'ease-in-out', value: 'ease-in-out' },
]

const EASING_CURVES = {
  'linear': 'M 0 36 L 36 0',
  'ease': 'M 0 36 C 9 36, 25 0, 36 0',
  'ease-in': 'M 0 36 C 16 36, 30 12, 36 0',
  'ease-out': 'M 0 36 C 0 24, 25 0, 36 0',
  'ease-in-out': 'M 0 36 C 16 36, 20 0, 36 0',
}

const animationPickerContainer = document.getElementById('animation-picker-container')
let animationPickerDialog = null
let animationPickerVisible = false
let animationPickerLineStart = null
let animationPickerData = null
let animationPickerSelectedTrack = 0
let animationPickerIsPlaying = false
let animationPickerCurrentTime = 0
let animationPickerAnimationFrame = null

function createAnimationPickerDialog() {
  const dialog = document.createElement('div')
  dialog.className = 'animation-picker-dialog'
  dialog.innerHTML = `
    <div class="ap-header">
      <div class="ap-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <input type="text" class="ap-name-input" value="">
        <span class="ap-subtitle">as animation</span>
      </div>
      <div class="ap-actions">
        <button class="ap-btn ap-btn-secondary" data-action="cancel">Cancel</button>
        <button class="ap-btn ap-btn-primary" data-action="done">Done</button>
      </div>
    </div>
    <div class="ap-body">
      <div class="ap-playback">
        <button class="ap-play-btn" data-action="play">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="white"/></svg>
        </button>
        <div class="ap-scrubber">
          <div class="ap-scrubber-progress"></div>
          <div class="ap-scrubber-handle"></div>
        </div>
        <div class="ap-time-display">
          <span class="ap-current-time">0.00</span>s
        </div>
      </div>
      <div class="ap-timeline">
        <div class="ap-timeline-ruler">
          <div class="ap-ruler-marks"></div>
        </div>
        <div class="ap-timeline-tracks">
          <div class="ap-playhead"></div>
        </div>
        <button class="ap-add-track" data-action="add-track">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add property
        </button>
      </div>
      <div class="ap-section">
        <div class="ap-section-label">Easing <span class="ap-selected-track"></span></div>
        <div class="ap-easing-row">
          <div class="ap-easing-presets"></div>
          <div class="ap-curve-preview">
            <svg viewBox="0 0 36 36"><path d=""/></svg>
          </div>
        </div>
      </div>
      <div class="ap-section">
        <div class="ap-section-label">Values <span class="ap-selected-track"></span></div>
        <div class="ap-values-grid">
          <span class="ap-value-label">From</span>
          <input type="text" class="ap-value-input" data-field="from" value="">
          <span class="ap-value-label">To</span>
          <input type="text" class="ap-value-input" data-field="to" value="">
        </div>
      </div>
      <div class="ap-options-row">
        <div class="ap-option-group">
          <span class="ap-option-label">Delay</span>
          <input type="text" class="ap-option-input" data-field="delay" value="0">
          <span class="ap-option-label">s</span>
        </div>
        <label class="ap-option-checkbox">
          <input type="checkbox" data-field="loop">
          Loop
        </label>
        <label class="ap-option-checkbox">
          <input type="checkbox" data-field="reverse">
          Reverse
        </label>
      </div>
    </div>
  `
  injectAnimationPickerStyles()
  return dialog
}

function showAnimationPicker(animationData, lineStart) {
  if (!animationPickerContainer) return

  animationPickerLineStart = lineStart
  animationPickerData = animationData || {
    name: 'FadeUp',
    easing: 'ease-out',
    duration: 0.3,
    tracks: [
      { property: 'opacity', startTime: 0, endTime: 0.3, fromValue: 0, toValue: 1 },
    ],
  }

  // Create dialog if not exists
  if (!animationPickerDialog) {
    animationPickerDialog = createAnimationPickerDialog()
    animationPickerContainer.appendChild(animationPickerDialog)
    setupAnimationPickerEvents()
  }

  // Update UI with data
  updateAnimationPickerUI()
  animationPickerDialog.style.display = 'block'
  animationPickerVisible = true
}

function hideAnimationPicker() {
  pauseAnimationPicker()
  if (animationPickerDialog) {
    animationPickerDialog.style.display = 'none'
  }
  animationPickerVisible = false
  animationPickerLineStart = null
  if (window.editor) window.editor.focus()
}

function updateAnimationPickerUI() {
  if (!animationPickerDialog || !animationPickerData) return

  // Update name
  const nameInput = animationPickerDialog.querySelector('.ap-name-input')
  if (nameInput) nameInput.value = animationPickerData.name

  // Update easing presets
  const presetsContainer = animationPickerDialog.querySelector('.ap-easing-presets')
  if (presetsContainer) {
    presetsContainer.innerHTML = EASING_PRESETS.map(e => `
      <button class="ap-easing-btn ${e.value === animationPickerData.easing ? 'active' : ''}" data-easing="${e.value}">${e.name}</button>
    `).join('')
  }

  // Update curve preview
  const curvePath = animationPickerDialog.querySelector('.ap-curve-preview path')
  if (curvePath) {
    curvePath.setAttribute('d', EASING_CURVES[animationPickerData.easing] || EASING_CURVES['ease-out'])
  }

  // Update tracks
  renderAnimationTracks()

  // Update ruler
  updateAnimationRuler()

  // Update values
  updateAnimationValues()

  // Update options
  const delayInput = animationPickerDialog.querySelector('.ap-option-input[data-field="delay"]')
  if (delayInput) delayInput.value = animationPickerData.delay || 0

  const loopCheckbox = animationPickerDialog.querySelector('input[data-field="loop"]')
  if (loopCheckbox) loopCheckbox.checked = animationPickerData.loop || false

  const reverseCheckbox = animationPickerDialog.querySelector('input[data-field="reverse"]')
  if (reverseCheckbox) reverseCheckbox.checked = animationPickerData.reverse || false
}

function renderAnimationTracks() {
  const tracksContainer = animationPickerDialog.querySelector('.ap-timeline-tracks')
  if (!tracksContainer) return

  // Keep playhead, remove old tracks
  const playhead = tracksContainer.querySelector('.ap-playhead')
  tracksContainer.innerHTML = ''
  if (playhead) tracksContainer.appendChild(playhead)

  // Add tracks
  animationPickerData.tracks.forEach((track, index) => {
    const startPercent = (track.startTime / animationPickerData.duration) * 100
    const widthPercent = ((track.endTime - track.startTime) / animationPickerData.duration) * 100

    const trackEl = document.createElement('div')
    trackEl.className = 'ap-timeline-track'
    trackEl.dataset.trackIndex = index
    trackEl.innerHTML = `
      <div class="ap-track-label">${track.property}</div>
      <div class="ap-track-content">
        <div class="ap-keyframe-bar ${index === animationPickerSelectedTrack ? 'selected' : ''}"
             style="left: ${startPercent}%; width: ${widthPercent}%;"
             data-track-index="${index}">
          <div class="ap-keyframe-handle start"></div>
          <div class="ap-keyframe-handle end"></div>
        </div>
      </div>
    `
    tracksContainer.appendChild(trackEl)
  })
}

function updateAnimationRuler() {
  const rulerMarks = animationPickerDialog.querySelector('.ap-ruler-marks')
  if (!rulerMarks) return

  const marks = []
  const steps = 4
  for (let i = 0; i <= steps; i++) {
    const time = (i / steps) * animationPickerData.duration
    const percent = (i / steps) * 100
    marks.push(`<div class="ap-ruler-mark" style="left: ${percent}%"><span>${time.toFixed(2)}</span></div>`)
  }
  rulerMarks.innerHTML = marks.join('')
}

function updateAnimationValues() {
  const track = animationPickerData.tracks[animationPickerSelectedTrack]
  if (!track) return

  const fromInput = animationPickerDialog.querySelector('.ap-value-input[data-field="from"]')
  const toInput = animationPickerDialog.querySelector('.ap-value-input[data-field="to"]')

  if (fromInput) fromInput.value = track.fromValue
  if (toInput) toInput.value = track.toValue

  // Update selected track labels
  animationPickerDialog.querySelectorAll('.ap-selected-track').forEach(el => {
    el.textContent = `(${track.property})`
  })
}

function selectAnimationTrack(index) {
  animationPickerSelectedTrack = index

  // Update bar selection
  animationPickerDialog.querySelectorAll('.ap-keyframe-bar').forEach((bar, i) => {
    bar.classList.toggle('selected', i === index)
  })

  updateAnimationValues()
}

function setupAnimationPickerEvents() {
  if (!animationPickerDialog) return

  // Button actions
  animationPickerDialog.addEventListener('click', (e) => {
    const target = e.target
    const action = target.closest('[data-action]')?.dataset.action

    switch (action) {
      case 'play':
        toggleAnimationPlay()
        break
      case 'cancel':
        hideAnimationPicker()
        break
      case 'done':
        updateAnimationInCode(animationPickerData)
        hideAnimationPicker()
        break
      case 'add-track':
        addAnimationTrack()
        break
    }

    // Easing button
    const easingBtn = target.closest('.ap-easing-btn')
    if (easingBtn) {
      animationPickerData.easing = easingBtn.dataset.easing
      updateAnimationPickerUI()
    }

    // Track selection
    const keyframeBar = target.closest('.ap-keyframe-bar')
    if (keyframeBar) {
      e.stopPropagation()
      selectAnimationTrack(parseInt(keyframeBar.dataset.trackIndex))
    }
  })

  // Scrubber
  const scrubber = animationPickerDialog.querySelector('.ap-scrubber')
  if (scrubber) {
    scrubber.addEventListener('mousedown', (e) => {
      pauseAnimationPicker()
      handleAnimationScrub(e, scrubber)
    })
  }

  // Value inputs
  animationPickerDialog.querySelectorAll('.ap-value-input').forEach(input => {
    input.addEventListener('change', () => {
      const field = input.dataset.field
      const track = animationPickerData.tracks[animationPickerSelectedTrack]
      if (track) {
        const val = parseFloat(input.value)
        if (field === 'from') track.fromValue = isNaN(val) ? input.value : val
        if (field === 'to') track.toValue = isNaN(val) ? input.value : val
      }
    })
  })

  // Option inputs
  animationPickerDialog.querySelector('.ap-option-input[data-field="delay"]')?.addEventListener('change', (e) => {
    animationPickerData.delay = parseFloat(e.target.value) || 0
  })

  animationPickerDialog.querySelector('input[data-field="loop"]')?.addEventListener('change', (e) => {
    animationPickerData.loop = e.target.checked
  })

  animationPickerDialog.querySelector('input[data-field="reverse"]')?.addEventListener('change', (e) => {
    animationPickerData.reverse = e.target.checked
  })

  // Name input
  animationPickerDialog.querySelector('.ap-name-input')?.addEventListener('change', (e) => {
    animationPickerData.name = e.target.value
  })
}

function handleAnimationScrub(e, scrubber) {
  const rect = scrubber.getBoundingClientRect()

  const updateScrub = (e) => {
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    animationPickerCurrentTime = x
    updateAnimationPlayhead(x)
  }

  updateScrub(e)

  const onMove = (e) => updateScrub(e)
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function toggleAnimationPlay() {
  if (animationPickerIsPlaying) {
    pauseAnimationPicker()
  } else {
    playAnimationPicker()
  }
}

function playAnimationPicker() {
  if (animationPickerIsPlaying) return
  animationPickerIsPlaying = true

  const playBtn = animationPickerDialog.querySelector('.ap-play-btn')
  if (playBtn) {
    playBtn.innerHTML = '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" fill="white"/><rect x="14" y="4" width="4" height="16" fill="white"/></svg>'
  }

  const startTime = performance.now() - (animationPickerCurrentTime * animationPickerData.duration * 1000)

  const animate = (now) => {
    if (!animationPickerIsPlaying) return

    animationPickerCurrentTime = ((now - startTime) / 1000) / animationPickerData.duration

    if (animationPickerCurrentTime >= 1) {
      if (animationPickerData.loop) {
        animationPickerCurrentTime = 0
      } else {
        animationPickerCurrentTime = 1
        pauseAnimationPicker()
        return
      }
    }

    updateAnimationPlayhead(animationPickerCurrentTime)
    animationPickerAnimationFrame = requestAnimationFrame(animate)
  }

  animationPickerAnimationFrame = requestAnimationFrame(animate)
}

function pauseAnimationPicker() {
  animationPickerIsPlaying = false

  const playBtn = animationPickerDialog?.querySelector('.ap-play-btn')
  if (playBtn) {
    playBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="white"/></svg>'
  }

  if (animationPickerAnimationFrame) {
    cancelAnimationFrame(animationPickerAnimationFrame)
    animationPickerAnimationFrame = null
  }
}

function updateAnimationPlayhead(progress) {
  const percent = progress * 100

  const scrubberProgress = animationPickerDialog?.querySelector('.ap-scrubber-progress')
  const scrubberHandle = animationPickerDialog?.querySelector('.ap-scrubber-handle')
  if (scrubberProgress) scrubberProgress.style.width = `${percent}%`
  if (scrubberHandle) scrubberHandle.style.left = `${percent}%`

  const playhead = animationPickerDialog?.querySelector('.ap-playhead')
  const trackContent = animationPickerDialog?.querySelector('.ap-track-content')
  if (playhead && trackContent) {
    const trackWidth = trackContent.offsetWidth
    playhead.style.left = `${72 + (percent / 100) * trackWidth}px`
  }

  const currentTimeEl = animationPickerDialog?.querySelector('.ap-current-time')
  if (currentTimeEl) {
    currentTimeEl.textContent = (progress * animationPickerData.duration).toFixed(2)
  }
}

function addAnimationTrack() {
  const newTrack = {
    property: 'scale',
    startTime: 0,
    endTime: animationPickerData.duration,
    fromValue: 1,
    toValue: 1.1,
  }
  animationPickerData.tracks.push(newTrack)
  renderAnimationTracks()
}

function injectAnimationPickerStyles() {
  if (document.getElementById('animation-picker-styles')) return

  const style = document.createElement('style')
  style.id = 'animation-picker-styles'
  style.textContent = `
    .animation-picker-dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1a1a1f;
      border: 1px solid #333;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      width: 520px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #e4e4e7;
      font-size: 12px;
      display: none;
    }
    .ap-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      background: #222228;
      border-bottom: 1px solid #333;
      border-radius: 8px 8px 0 0;
    }
    .ap-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
    }
    .ap-name-input {
      background: transparent;
      border: none;
      color: #e4e4e7;
      font-size: 12px;
      font-weight: 600;
      width: 120px;
      padding: 2px 4px;
    }
    .ap-name-input:focus {
      outline: none;
      background: #27272a;
      border-radius: 3px;
    }
    .ap-subtitle { color: #555; font-weight: 400; }
    .ap-actions { display: flex; gap: 6px; }
    .ap-btn {
      padding: 5px 10px;
      font-size: 11px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      transition: all 0.15s;
    }
    .ap-btn-secondary { background: #333; color: #999; }
    .ap-btn-secondary:hover { background: #444; color: #fff; }
    .ap-btn-primary { background: #5BA8F5; color: #fff; }
    .ap-btn-primary:hover { background: #2271C1; }
    .ap-body { padding: 12px; }
    .ap-playback {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .ap-play-btn {
      width: 28px;
      height: 28px;
      background: #5BA8F5;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
      flex-shrink: 0;
    }
    .ap-play-btn:hover { background: #2271C1; }
    .ap-play-btn svg { width: 14px; height: 14px; }
    .ap-scrubber {
      flex: 1;
      height: 6px;
      background: #27272a;
      border-radius: 3px;
      position: relative;
      cursor: pointer;
    }
    .ap-scrubber-progress {
      height: 100%;
      background: #5BA8F5;
      border-radius: 3px;
      width: 0%;
    }
    .ap-scrubber-handle {
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 12px;
      height: 12px;
      background: #fff;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      cursor: grab;
      left: 0%;
    }
    .ap-time-display {
      font-size: 11px;
      font-family: 'SF Mono', monospace;
      color: #666;
      min-width: 50px;
      text-align: right;
    }
    .ap-timeline {
      background: #111115;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .ap-timeline-ruler {
      height: 20px;
      background: #1a1a1f;
      border-bottom: 1px solid #27272a;
      position: relative;
      display: flex;
      padding-left: 72px;
    }
    .ap-ruler-marks { flex: 1; position: relative; }
    .ap-ruler-mark {
      position: absolute;
      top: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translateX(-50%);
    }
    .ap-ruler-mark span { font-size: 9px; color: #555; margin-top: 3px; }
    .ap-ruler-mark::after {
      content: '';
      width: 1px;
      flex: 1;
      background: #333;
    }
    .ap-timeline-tracks { position: relative; }
    .ap-timeline-track {
      display: flex;
      height: 28px;
      border-bottom: 1px solid #1f1f24;
    }
    .ap-timeline-track:last-child { border-bottom: none; }
    .ap-track-label {
      width: 72px;
      padding: 0 8px;
      font-size: 11px;
      color: #666;
      display: flex;
      align-items: center;
      background: #1a1a1f;
      border-right: 1px solid #27272a;
      flex-shrink: 0;
    }
    .ap-track-content {
      flex: 1;
      position: relative;
      background: #111115;
    }
    .ap-keyframe-bar {
      position: absolute;
      top: 5px;
      height: 18px;
      background: linear-gradient(135deg, #5BA8F5 0%, #2271C1 100%);
      border-radius: 3px;
      cursor: pointer;
      display: flex;
      align-items: center;
      min-width: 16px;
    }
    .ap-keyframe-bar:hover { filter: brightness(1.1); }
    .ap-keyframe-bar.selected { box-shadow: 0 0 0 2px #fff; }
    .ap-keyframe-handle {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 8px;
      height: 8px;
      background: #fff;
      border-radius: 2px;
      cursor: ew-resize;
      opacity: 0;
      transition: opacity 0.15s;
    }
    .ap-keyframe-bar:hover .ap-keyframe-handle,
    .ap-keyframe-bar.selected .ap-keyframe-handle { opacity: 1; }
    .ap-keyframe-handle.start { left: -4px; }
    .ap-keyframe-handle.end { right: -4px; }
    .ap-playhead {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #ef4444;
      z-index: 10;
      pointer-events: none;
      left: 72px;
    }
    .ap-playhead::before {
      content: '';
      position: absolute;
      top: -3px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 6px solid #ef4444;
    }
    .ap-add-track {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      font-size: 11px;
      color: #555;
      background: transparent;
      border: none;
      border-top: 1px solid #27272a;
      cursor: pointer;
      width: 100%;
      transition: all 0.15s;
    }
    .ap-add-track:hover { color: #888; background: rgba(255,255,255,0.02); }
    .ap-add-track svg { width: 12px; height: 12px; }
    .ap-section { margin-bottom: 12px; }
    .ap-section:last-child { margin-bottom: 0; }
    .ap-section-label {
      font-size: 10px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .ap-selected-track { font-weight: normal; text-transform: none; }
    .ap-easing-row { display: flex; align-items: center; gap: 8px; }
    .ap-easing-presets { display: flex; gap: 3px; flex-wrap: wrap; flex: 1; }
    .ap-easing-btn {
      padding: 4px 8px;
      font-size: 10px;
      color: #888;
      background: #27272a;
      border: 1px solid #333;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .ap-easing-btn:hover { color: #fff; border-color: #444; }
    .ap-easing-btn.active { background: #5BA8F5; border-color: #5BA8F5; color: #fff; }
    .ap-curve-preview {
      width: 48px;
      height: 48px;
      background: #27272a;
      border-radius: 4px;
      position: relative;
      flex-shrink: 0;
    }
    .ap-curve-preview svg {
      position: absolute;
      inset: 6px;
      width: calc(100% - 12px);
      height: calc(100% - 12px);
    }
    .ap-curve-preview path { fill: none; stroke: #5BA8F5; stroke-width: 2; }
    .ap-values-grid {
      display: grid;
      grid-template-columns: auto 1fr auto 1fr;
      gap: 6px 8px;
      align-items: center;
    }
    .ap-value-label { font-size: 10px; color: #555; }
    .ap-value-input {
      padding: 4px 6px;
      font-size: 11px;
      font-family: 'SF Mono', monospace;
      background: #27272a;
      border: 1px solid #333;
      border-radius: 4px;
      color: #e4e4e7;
      width: 100%;
    }
    .ap-value-input:focus { outline: none; border-color: #5BA8F5; }
    .ap-options-row {
      display: flex;
      gap: 12px;
      padding-top: 12px;
      border-top: 1px solid #27272a;
    }
    .ap-option-group { display: flex; align-items: center; gap: 6px; }
    .ap-option-label { font-size: 10px; color: #555; }
    .ap-option-input {
      width: 50px;
      padding: 4px 6px;
      font-size: 11px;
      font-family: 'SF Mono', monospace;
      background: #27272a;
      border: 1px solid #333;
      border-radius: 4px;
      color: #e4e4e7;
    }
    .ap-option-input:focus { outline: none; border-color: #5BA8F5; }
    .ap-option-checkbox {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      color: #666;
      cursor: pointer;
    }
    .ap-option-checkbox input { accent-color: #5BA8F5; }
  `
  document.head.appendChild(style)
}

function updateAnimationInCode(data) {
  if (!window.editor || animationPickerLineStart === null) return

  const doc = window.editor.state.doc
  const dsl = generateAnimationDSL(data)

  // Find the animation block boundaries
  const startLine = animationPickerLineStart
  let endLine = startLine

  // Find where the animation block ends (next non-indented line or end of file)
  const totalLines = doc.lines
  for (let i = startLine + 1; i <= totalLines; i++) {
    const line = doc.line(i)
    const text = line.text
    // Stop at empty line, non-indented content, or section header
    if (text.trim() === '' || (!text.startsWith(' ') && !text.startsWith('\t') && text.trim() !== '')) {
      endLine = i - 1
      break
    }
    endLine = i
  }

  // Calculate the range to replace
  const from = doc.line(startLine).from
  const to = doc.line(endLine).to

  // Replace the animation block
  window.editor.dispatch({
    changes: { from, to, insert: dsl },
    annotations: Transaction.userEvent.of('input.animation')
  })
}

function generateAnimationDSL(data) {
  const lines = []
  lines.push(`${data.name} as animation: ${data.easing}`)

  // Group all unique times from tracks
  const times = new Set()
  for (const track of data.tracks) {
    times.add(track.startTime)
    times.add(track.endTime)
  }

  const sortedTimes = Array.from(times).sort((a, b) => a - b)

  for (const time of sortedTimes) {
    const props = []

    for (const track of data.tracks) {
      if (track.startTime === time) {
        props.push(`${track.property} ${track.fromValue}`)
      } else if (track.endTime === time) {
        props.push(`${track.property} ${track.toValue}`)
      }
    }

    if (props.length > 0) {
      lines.push(`  ${time.toFixed(2)} ${props.join(', ')}`)
    }
  }

  return lines.join('\n')
}

function parseAnimationKeyframes(doc, startLine) {
  const tracks = []
  const propertyData = {}

  // Parse keyframe lines after the animation definition
  for (let i = startLine + 1; i <= doc.lines; i++) {
    const line = doc.line(i)
    const text = line.text

    // Stop at non-indented line
    if (!text.startsWith(' ') && !text.startsWith('\t')) break
    if (text.trim() === '') break

    // Parse keyframe: "  0.00 opacity 0, y-offset 20"
    const match = text.trim().match(/^([\d.]+)\s+(.+)/)
    if (match) {
      const time = parseFloat(match[1])
      const propsStr = match[2]

      // Parse properties
      const propParts = propsStr.split(',').map(p => p.trim())
      for (const prop of propParts) {
        const propMatch = prop.match(/^([\w-]+)\s+(.+)/)
        if (propMatch) {
          const propName = propMatch[1]
          const value = propMatch[2]

          if (!propertyData[propName]) {
            propertyData[propName] = []
          }
          propertyData[propName].push({ time, value })
        }
      }
    }
  }

  // Convert to tracks
  for (const [property, keyframes] of Object.entries(propertyData)) {
    if (keyframes.length >= 1) {
      const sorted = keyframes.sort((a, b) => a.time - b.time)
      const fromValue = parseFloat(sorted[0].value) || sorted[0].value
      const toValue = sorted.length > 1
        ? (parseFloat(sorted[sorted.length - 1].value) || sorted[sorted.length - 1].value)
        : fromValue

      tracks.push({
        property,
        startTime: sorted[0].time,
        endTime: sorted.length > 1 ? sorted[sorted.length - 1].time : sorted[0].time + 0.3,
        fromValue,
        toValue
      })
    }
  }

  return tracks
}

// NOTE: Animation picker triggers are now handled by TriggerManager
// See: studio/editor/triggers/animation-trigger.ts

// Keyboard shortcut: Cmd+S to save current file
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's' && !e.shiftKey) {
    e.preventDefault()
    saveCurrentFile()
  }
})

// Keyboard shortcut: Cmd+O to open folder (Desktop only)
document.addEventListener('keydown', async (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'o' && !e.shiftKey) {
    e.preventDefault()
    if (isTauriDesktop() && window.desktopFiles) {
      await window.desktopFiles.openFolder()
    }
  }
})

// Keyboard shortcut: Cmd+Shift+A to open animation picker (legacy, kept for convenience)
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'a') {
    e.preventDefault()

    if (animationPickerVisible) {
      hideAnimationPicker()
    } else if (window.editor) {
      const pos = window.editor.state.selection.main.head
      const line = window.editor.state.doc.lineAt(pos)
      const text = line.text

      // Check if on animation line
      const animationMatch = text.match(/(\w+)\s+as\s+animation:/)
      if (animationMatch) {
        const name = animationMatch[1]
        const lineNum = line.number
        const tracks = parseAnimationKeyframes(window.editor.state.doc, lineNum)

        showAnimationPicker({
          name: name,
          easing: 'ease-out',
          duration: tracks.length > 0 ? Math.max(...tracks.map(t => t.endTime)) : 0.3,
          tracks: tracks.length > 0 ? tracks : [
            { property: 'opacity', startTime: 0, endTime: 0.3, fromValue: 0, toValue: 1 },
          ]
        }, lineNum)
      }
    }
  }
})

// Close animation picker on Escape
document.addEventListener('keydown', (e) => {
  if (animationPickerVisible && e.key === 'Escape') {
    hideAnimationPicker()
    if (window.editor) window.editor.focus()
  }
})

// Close animation picker on click outside
document.addEventListener('mousedown', (e) => {
  if (animationPickerVisible && animationPickerContainer && !animationPickerContainer.contains(e.target)) {
    hideAnimationPicker()
  }
})

// ============================================
// Inline Token Definition Handler
// ============================================

// Regex: $tokenName: value (at end of property)
// Examples: bg $surface: #333, rad $m: 4, pad $spacing.md: 8
const INLINE_TOKEN_REGEX = /\$([a-zA-Z][a-zA-Z0-9._-]*):\s*(.+)$/

/**
 * Extract inline token definition from a line of code
 */
function extractInlineToken(lineText) {
  const match = lineText.match(INLINE_TOKEN_REGEX)
  if (!match) return null

  const tokenName = match[1]
  const tokenValue = match[2].trim()

  // Validate token name and value
  if (!/^[a-zA-Z]/.test(tokenName)) return null
  if (!tokenValue) return null

  return {
    tokenName,
    tokenValue,
    fullMatch: match[0],  // "$surface: #333"
    replacement: `$${tokenName}`,  // "$surface"
  }
}

/**
 * Escape special regex characters
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Ensure tokens file exists, create if not
 */
function ensureTokensFile() {
  const tokensFilename = 'tokens.tok'
  if (!files[tokensFilename]) {
    files[tokensFilename] = '// Design Tokens\n'
    // Desktop app: file tree is managed by desktop-files.js
    saveFile(tokensFilename, files[tokensFilename])
  }
}

/**
 * Add or update a token in the tokens file
 */
function addTokenToFile(tokenName, tokenValue) {
  ensureTokensFile()
  const tokensFilename = 'tokens.tok'
  let content = files[tokensFilename] || '// Design Tokens\n'

  const tokenLine = `$${tokenName}: ${tokenValue}`
  // Regex to match existing token definition
  const tokenRegex = new RegExp(`^\\$${escapeRegex(tokenName)}:\\s*.+$`, 'm')

  if (tokenRegex.test(content)) {
    // Token exists - update it
    content = content.replace(tokenRegex, tokenLine)
  } else {
    // Token doesn't exist - add at end
    content = content.trimEnd() + `\n${tokenLine}\n`
  }

  files[tokensFilename] = content
  saveFile(tokensFilename, content)
}

/**
 * Show feedback when token is created
 */
function showTokenCreatedFeedback(tokenName) {
  const status = document.getElementById('status')
  if (status) {
    status.textContent = `Token '$${tokenName}' created`
    status.className = 'status ok'
    setTimeout(() => {
      status.textContent = 'Ready'
    }, 2000)
  }
}

/**
 * Extension: App Lock - Makes "App" on line 1 undeletable
 * and auto-indents all other lines with 2 spaces
 * Only applies to .mir (layout) files, not .tok or .com files
 */
const APP_PREFIX = 'App'
const CHILD_INDENT = '  ' // 2 spaces

const appLockExtension = EditorState.transactionFilter.of(tr => {
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
        selection: { anchor: cursorPos + 1 + CHILD_INDENT.length }
      })
      event.preventDefault()
      return true
    }

    // For other lines, preserve or ensure indent
    const currentIndent = line.text.match(/^(\s*)/)?.[1] || ''
    const indent = currentIndent.length < 2 ? CHILD_INDENT : currentIndent

    view.dispatch({
      changes: { from: cursorPos, insert: '\n' + indent },
      selection: { anchor: cursorPos + 1 + indent.length }
    })
    event.preventDefault()
    return true
  }
})

/**
 * Extension: Style "App" as locked/readonly appearance
 * Only applies to .mir (layout) files
 */
const appLockDecoration = Decoration.mark({ class: 'cm-app-locked' })
const appLockDecorationPlugin = ViewPlugin.fromClass(class {
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
}, { decorations: v => v.decorations })

/**
 * Extension: Handle Enter key for inline token definitions
 * When user types "Card bg $surface: #333" and presses Enter:
 * 1. Token "$surface: #333" is added to tokens file
 * 2. Line becomes "Card bg $surface" (just the reference)
 */
const inlineTokenExtension = EditorView.domEventHandlers({
  keydown: (event, view) => {
    if (event.key !== 'Enter') return false

    // Don't intercept Enter when any picker is visible (use unified TriggerManager)
    if (getTriggerManager().isOpen()) {
      return false
    }

    // Get current line
    const cursorPos = view.state.selection.main.head
    const line = view.state.doc.lineAt(cursorPos)
    const lineText = line.text

    // Check for inline token pattern
    const match = extractInlineToken(lineText)
    if (!match) return false  // No match → normal Enter behavior

    // Add token to tokens file
    addTokenToFile(match.tokenName, match.tokenValue)

    // Replace the inline definition with just the reference
    const newLineText = lineText.replace(match.fullMatch, match.replacement)
    view.dispatch({
      changes: { from: line.from, to: line.to, insert: newLineText + '\n' },
      selection: { anchor: line.from + newLineText.length + 1 }
    })

    // Show feedback
    showTokenCreatedFeedback(match.tokenName)

    event.preventDefault()
    return true
  }
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
})

// Initialize Fixer Service for AI code generation
let fixerService = null

function initializeFixer() {
  if (fixerService) return fixerService

  fixerService = createFixer({
    getFiles: () => {
      const fileList = []
      for (const [name, content] of Object.entries(files)) {
        const ext = name.split('.').pop()
        let type = 'layout'
        if (ext === 'tok' || name.includes('token')) type = 'tokens'
        else if (ext === 'com' || name.includes('component')) type = 'component'

        // FIX #6: Use 'code' to match FileInfo interface
        fileList.push({ name, type, code: content })
      }
      return fileList
    },
    getCurrentFile: () => currentFile,
    getEditorContent: () => window.editor?.state.doc.toString() || '',
    getCursor: () => {
      if (!window.editor) return { line: 1, column: 1, offset: 0 }
      const offset = window.editor.state.selection.main.head
      const line = window.editor.state.doc.lineAt(offset)
      return { line: line.number, column: offset - line.from + 1, offset }
    },
    getSelection: () => {
      if (!window.editor) return null
      const { from, to } = window.editor.state.selection.main
      if (from === to) return null
      return {
        from,
        to,
        text: window.editor.state.sliceDoc(from, to)
      }
    },
    getFileContent: (filename) => files[filename] || null,
    saveFile: async (filename, content) => {
      files[filename] = content
      if (filename === currentFile) {
        window.editor?.dispatch({
          changes: { from: 0, to: window.editor.state.doc.length, insert: content }
        })
      }
    },
    createFile: async (filename, content) => {
      files[filename] = content
      // Refresh file tree if desktop-files module is available
      if (window.DesktopFiles?.renderFileTree) {
        window.DesktopFiles.renderFileTree()
      }
    },
    updateEditor: (content) => {
      window.editor?.dispatch({
        changes: { from: 0, to: window.editor.state.doc.length, insert: content }
      })
    },
    refreshFileTree: () => {
      if (window.DesktopFiles?.renderFileTree) {
        window.DesktopFiles.renderFileTree()
      }
    },
    switchToFile: (filename) => {
      if (window.DesktopFiles?.selectFile) {
        window.DesktopFiles.selectFile(filename)
      }
    }
  })

  return fixerService
}

// Inline Prompt submit handler
async function handleInlinePromptSubmit(prompt, line, view) {
  console.log('[InlinePrompt] Submit:', prompt, 'at line', line)

  // Check if TauriBridge is available
  const bridge = window.TauriBridge
  if (!bridge || !bridge.isTauri()) {
    console.warn('[InlinePrompt] Only available in desktop app')
    return null
  }

  // Initialize Fixer if needed
  const fixer = initializeFixer()
  if (!fixer) {
    console.error('[InlinePrompt] Failed to initialize fixer')
    return null
  }

  try {
    // Use quick fix for inline prompts
    const response = await fixer.quickFix(prompt)
    return response
  } catch (error) {
    console.error('[InlinePrompt] Error:', error)
    return null
  }
}

// Create inline prompt extension configuration
const inlinePromptConfig = {
  onSubmit: handleInlinePromptSubmit,
  onCancel: () => console.log('[InlinePrompt] Cancelled')
}

// Initialize modular color picker API for property panel

const editor = new EditorView({
  state: EditorState.create({
    doc: initialCode,
    extensions: [
      indentUnit.of("  "), // 2 spaces for Mirror DSL
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      drawSelection(),
      history(),
      mirrorHighlight,
      autocompletion({
        override: [mirrorCompletions],
        activateOnTyping: true,
      }),
      keymap.of([
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

          // Position Tracking: Keep color picker positions synchronized with document changes
          // When user edits while picker is open, positions shift - mapPos() handles this
          // Example: If user types "test " before a color, position 100 becomes 105
          if (colorPickerVisible) {
            if (colorPickerInsertPos !== null) {
              const oldPos = colorPickerInsertPos
              colorPickerInsertPos = update.changes.mapPos(colorPickerInsertPos)
              if (oldPos !== colorPickerInsertPos) {
                console.debug(`[ColorPicker] Insert pos tracked: ${oldPos} → ${colorPickerInsertPos}`)
              }
            }
            if (colorPickerReplaceRange) {
              const oldFrom = colorPickerReplaceRange.from
              const oldTo = colorPickerReplaceRange.to
              colorPickerReplaceRange = {
                from: update.changes.mapPos(colorPickerReplaceRange.from),
                to: update.changes.mapPos(colorPickerReplaceRange.to)
              }
              if (oldFrom !== colorPickerReplaceRange.from || oldTo !== colorPickerReplaceRange.to) {
                console.debug(`[ColorPicker] Replace range tracked: [${oldFrom}, ${oldTo}] → [${colorPickerReplaceRange.from}, ${colorPickerReplaceRange.to}]`)
              }
            }
            if (hashTriggerStartPos !== null) {
              const oldPos = hashTriggerStartPos
              hashTriggerStartPos = update.changes.mapPos(hashTriggerStartPos)
              if (oldPos !== hashTriggerStartPos) {
                console.debug(`[ColorPicker] Hash pos tracked: ${oldPos} → ${hashTriggerStartPos}`)
              }
            }
          }
        }
        // Track cursor/selection changes for Editor → Preview sync
        const prevPos = update.startState.selection.main.head
        const newPos = update.state.selection.main.head
        if (prevPos !== newPos && studio.editor) {
          const line = update.state.doc.lineAt(newPos)
          studio.editor.notifyCursorMove({
            line: line.number,
            column: newPos - line.from + 1,
            offset: newPos
          })
        }
      }),
      // New Unified Trigger System (replaces legacy token, color, icon, animation triggers)
      ...createTriggerExtensions(),
      Prec.high(inlineTokenExtension),
      // Inline Prompt Extension (AI code generation via /prompt)
      ...inlinePromptExtension(inlinePromptConfig),
      // Note: App lock removed - implicit root wrapper is now added in compile()
      // Component Drop: Proper CodeMirror integration for drag & drop from component palette
      // Uses insertComponentWithDefinition to add component definition at top if needed
      Prec.highest(createComponentDropExtension({
        onDrop: (dragData, position, view) => {
          const code = generateComponentCodeFromDragData(dragData, {
            componentId: dragData.componentId,
            filename: currentFile || 'index.mir',
          })
          // Extract component name from template (e.g., "Select", "Checkbox")
          const componentName = dragData.componentName || dragData.template || ''
          // Use insertComponentWithDefinition for Zag components (adds definition if missing)
          insertComponentWithDefinition(view, code, position, componentName)
        }
      })),
      EditorView.theme({
        '&': { height: '100%' },
        '.cm-scroller': { fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace" },
      }),
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
const debouncedSave = debounce((code) => {
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

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetId = tab.dataset.tab
    tabs.forEach(t => t.classList.remove('active'))
    tabContents.forEach(c => c.classList.remove('active'))
    tab.classList.add('active')
    document.getElementById(targetId === 'preview' ? 'preview' : 'generated-code').classList.add('active')
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
    const names = match[1].split(',').map(s => s.trim()).filter(s => s.length > 0)
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

  // Use desktop files if available (Tauri mode), fallback to local files
  const allFiles = window.desktopFiles?.getFiles?.() || files

  // Collect files by type in the correct order: tokens first, then components
  const tokenFiles = []
  const componentFiles = []

  for (const filename of Object.keys(allFiles)) {
    // Skip the current file being compiled
    if (filename === excludeFile) continue

    const fileType = getFileType(filename)
    if (fileType === 'tokens') {
      tokenFiles.push(filename)
    } else if (fileType === 'component') {
      componentFiles.push(filename)
    }
  }

  // Add tokens first (sorted alphabetically for consistency)
  tokenFiles.sort()
  for (const filename of tokenFiles) {
    const content = allFiles[filename]
    if (content && content.trim()) {
      sections.push(`// === ${filename} ===\n${content}`)
    }
  }

  // Then components
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
  // Skip compilation if preview is showing LLM-generated content
  // This preserves the generated HTML app in Spec Studio mode
  const previewEl = document.getElementById('preview')
  if (previewEl?.dataset.generatedMode === 'true') {
    console.log('[Spec Studio] Skipping compile - showing generated content')
    return
  }

  // Update files with current code so renderComponentState can access it
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
    currentPreludeOffset = 0  // Reset prelude offset
    if (fileType === 'layout') {
      const prelude = getPreludeCode(currentFile)

      // Check if code already starts with "App" (legacy files)
      const startsWithApp = code.trimStart().startsWith('App')

      // Check if code contains component definitions at root level (lines ending with ":" at indent 0)
      // These should NOT be wrapped in App, as they would become slot definitions instead
      const hasRootComponentDefs = code.split('\n').some(line => {
        const trimmed = line.trim()
        // Component definition: starts with capital letter, ends with ":"
        // But not a state like "hover:" or "focus:" (lowercase)
        return trimmed.match(/^[A-Z][a-zA-Z0-9]*:/) && !line.startsWith(' ') && !line.startsWith('\t')
      })

      if (startsWithApp || hasRootComponentDefs) {
        // Don't wrap: code already has App wrapper OR contains component definitions
        // Component definitions at root level would become slot definitions if wrapped
        if (prelude) {
          const separator = '\n\n// === ' + currentFile + ' ===\n'
          resolvedCode = prelude + separator + code
          currentPreludeOffset = prelude.length + separator.length
        }
      } else {
        // New mode: wrap user code in implicit App root
        // App is defined in components.com and can be styled there (padding, bg, etc.)
        const rootWrapper = 'App'

        // Indent user code to be children of the implicit root
        const indentedCode = code.split('\n').map(line => line ? '  ' + line : '').join('\n')

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

    // Update state with resolved source and prelude offset for Commands
    if (studio?.state) {
      studio.state.set({ resolvedSource: resolvedCode, preludeOffset: currentPreludeOffset })
    }

    // Parse
    const ast = MirrorLang.parse(resolvedCode)

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
    window.componentPrimitives = componentPrimitives  // Update window reference

    // Update component palette with user-defined components from ALL files
    updateUserComponentsPalette()

    // Build IR with source map for bidirectional editing
    const irResult = MirrorLang.toIR(ast, true)
    let sourceMap = irResult.sourceMap

    // Generate DOM code
    const jsCode = MirrorLang.generateDOM(ast)
    if (generatedCode) generatedCode.textContent = jsCode

    // Clear preview and set appropriate class
    preview.innerHTML = ''
    preview.className = ''

    // Render based on file type
    if (fileType === 'tokens') {
      preview.className = 'tokens-preview'
      renderTokensPreview(ast)
      // Update studio module with AST, IR and source map for tokens too
      updateStudio(ast, irResult.ir, sourceMap, resolvedCode)
    } else if (fileType === 'component') {
      preview.className = 'components-preview'
      renderComponentsPreview(ast)
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

      let ui
      if (hasAutoInit) {
        let execCode = finalJsCode
          .replace('export function createUI', 'function createUI')
          .replace('document.body.appendChild(_ui.root)', '')

        // Inject YAML data after __mirrorData is defined (search for end of object + newline)
        if (yamlInjection) {
          execCode = execCode.replace(
            /(__mirrorData = \{[\s\S]*?\n\})/,
            (match) => match + yamlInjection
          )
        }

        const fn = new Function(execCode + '\nreturn _ui;')
        ui = fn()
      } else {
        let execCode = finalJsCode
          .replace('export function createUI', 'function createUI')

        // Inject YAML data after __mirrorData is defined (search for end of object + newline)
        if (yamlInjection) {
          execCode = execCode.replace(
            /(__mirrorData = \{[\s\S]*?\n\})/,
            (match) => match + yamlInjection
          )
        }

        const fn = new Function(execCode + '\nreturn createUI ? createUI() : null;')
        ui = fn()
      }

      // IMPORTANT: Update studio BEFORE DOM update so SourceMap is ready for clicks
      updateStudio(ast, irResult.ir, sourceMap, resolvedCode)

      if (ui && ui.root) {
        preview.appendChild(ui.root)
        // Make preview elements draggable AFTER DOM update
        makePreviewElementsDraggable()
        // Refresh preview selection after DOM update
        if (studio.preview) {
          studio.preview.refresh()
        }
        // Trigger initial sync after first compile (selects root element)
        if (studio.sync) {
          studio.sync.triggerInitialSync()
        }
      }
    }

    if (status) {
      status.textContent = `OK - ${ast.components.length} components, ${ast.instances.length} instances`
      status.className = 'status ok'
    }

  } catch (err) {
    // Reset compile status on error
    studioActions.setCompiling(false)

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

// Render Tokens Preview
function renderTokensPreview(ast) {
  const tokens = ast.tokens || []
  if (tokens.length === 0) {
    preview.innerHTML = '<div style="color: #71717a; padding: 20px;">Keine Tokens definiert</div>'
    return
  }

  // Build token lookup map for resolution
  const tokenMap = new Map()
  for (const t of tokens) {
    tokenMap.set(t.name, t.value)
  }

  // Helper to check if a token is a color (by name or resolved value)
  const isColorToken = (t) => {
    // Check by name suffix
    if (t.name.includes('.bg') || t.name.includes('.col') || t.name.includes('.color')) {
      return true
    }
    // Check by value
    const resolved = resolveTokenValueWithMap(t.value, tokenMap)
    return isDirectColorValue(resolved)
  }

  // Helper to infer token display type
  const inferTokenType = (t) => {
    if (isColorToken(t)) return 'color'
    if (t.name.includes('.pad') || t.name.includes('.gap') || t.name.includes('.margin') || t.name.includes('.rad')) return 'spacing'
    return 'other'
  }

  let html = ''

  // Check if any tokens have sections defined
  const hasSections = tokens.some(t => t.section)

  if (hasSections) {
    // Group by sections (preserve order from source)
    const sections = new Map()
    const noSection = []

    for (const t of tokens) {
      if (t.section) {
        if (!sections.has(t.section)) {
          sections.set(t.section, [])
        }
        sections.get(t.section).push(t)
      } else {
        noSection.push(t)
      }
    }

    // Render sections in order
    for (const [sectionName, sectionTokens] of sections) {
      html += renderTokenSection(sectionName, sectionTokens, 'mixed', tokenMap, inferTokenType)
    }

    // Render unsectioned tokens at the end
    if (noSection.length > 0) {
      html += renderTokenSection('Weitere', noSection, 'mixed', tokenMap, inferTokenType)
    }
  } else {
    // Fallback: group by automatic categories
    const colorTokens = tokens.filter(t => isColorToken(t))
    const spacingTokens = tokens.filter(t => t.name.includes('.pad') || t.name.includes('.gap') || t.name.includes('.margin'))
    const radiusTokens = tokens.filter(t => t.name.includes('.rad'))
    const otherTokens = tokens.filter(t =>
      !isColorToken(t) &&
      !t.name.includes('.pad') &&
      !t.name.includes('.gap') &&
      !t.name.includes('.margin') &&
      !t.name.includes('.rad')
    )

    if (colorTokens.length > 0) {
      html += renderTokenSection('Farben', colorTokens, 'color', tokenMap)
    }
    if (spacingTokens.length > 0) {
      html += renderTokenSection('Abstände', spacingTokens, 'spacing', tokenMap)
    }
    if (radiusTokens.length > 0) {
      html += renderTokenSection('Radien', radiusTokens, 'spacing', tokenMap)
    }
    if (otherTokens.length > 0) {
      html += renderTokenSection('Weitere', otherTokens, 'other', tokenMap)
    }
  }

  preview.innerHTML = html
}

function renderTokenSection(title, tokens, type, tokenMap, inferTokenType = null) {
  let rows = ''
  for (const token of tokens) {
    const resolvedValue = resolveTokenValueWithMap(token.value, tokenMap)
    let visualCell = ''

    // For mixed sections, infer type per token
    const tokenType = (type === 'mixed' && inferTokenType) ? inferTokenType(token) : type

    if (tokenType === 'color') {
      visualCell = `<div class="tokens-preview-swatch" style="background: ${resolvedValue}"></div>`
    } else if (tokenType === 'spacing') {
      const size = parseInt(resolvedValue) || 8
      visualCell = `<div class="tokens-preview-spacing" style="width: ${Math.min(size, 48)}px; height: ${Math.min(size, 24)}px;"></div>`
    }

    // Determine value type class for syntax highlighting
    const valueTypeClass = getValueTypeClass(token.value)

    rows += `
      <tr class="tokens-preview-row">
        <td class="tokens-preview-cell" style="width: 48px;">${visualCell}</td>
        <td class="tokens-preview-cell"><span class="tokens-preview-name">${token.name}</span></td>
        <td class="tokens-preview-cell"><span class="tokens-preview-value ${valueTypeClass}">${token.value}</span></td>
      </tr>
    `
  }

  return `
    <div class="tokens-preview-section">
      <div class="tokens-preview-section-header">${title}</div>
      <table class="tokens-preview-table">${rows}</table>
    </div>
  `
}

function isColorValue(value) {
  if (typeof value !== 'string') return false
  return value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl') || value.startsWith('$')
}

// Check if value is a direct color (hex, rgb, hsl) - not a token reference
function isDirectColorValue(value) {
  if (typeof value !== 'string') return false
  return value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')
}

// Determine CSS class for value type (matches editor syntax highlighting)
function getValueTypeClass(value) {
  if (typeof value !== 'string') return ''
  if (value.startsWith('#')) return 'hex'
  if (value.startsWith('$')) return 'token-ref'
  if (/^\d/.test(value)) return 'number'
  return ''
}

// Resolve token value using the token map (recursive, with cycle detection)
function resolveTokenValueWithMap(value, tokenMap, visited = new Set()) {
  if (typeof value !== 'string') return value
  if (!value.startsWith('$')) return value

  // Cycle detection
  if (visited.has(value)) return value
  visited.add(value)

  // Look up in token map
  const resolved = tokenMap.get(value)
  if (resolved) {
    return resolveTokenValueWithMap(resolved, tokenMap, visited)
  }

  // Fallback: try regex on source
  return resolveTokenValue(value)
}

function resolveTokenValue(value) {
  if (typeof value !== 'string') return value
  if (!value.startsWith('$')) return value
  // Simple token resolution - look up in all files
  const allSource = getAllProjectSource()
  const tokenName = value
  // Escape special regex characters in token name
  const escapedName = tokenName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`^${escapedName}:\\s*([^\\n]+)`, 'm')
  const match = allSource.match(regex)
  if (match) {
    return resolveTokenValue(match[1].trim())
  }
  return value
}

// Known behavior states
const BEHAVIOR_STATES = ['hover', 'active', 'focus', 'disabled', 'selected', 'highlighted', 'expanded', 'collapsed', 'on', 'off', 'valid', 'invalid']

// Render Components Preview
function renderComponentsPreview(ast) {
  const components = ast.components || []
  if (components.length === 0) {
    preview.innerHTML = `
      <div style="color: #71717a; padding: 32px; text-align: center;">
        <p style="font-size: 16px; margin-bottom: 8px;">Keine Komponenten definiert</p>
        <p style="font-size: 13px; opacity: 0.7;">
          Komponenten definieren mit:<br>
          <code style="background: #18181b; padding: 2px 6px; border-radius: 4px;">Button: pad 12, bg #5BA8F5</code>
        </p>
      </div>
    `
    return
  }

  // Extract sections from source code (--- Name --- syntax)
  const sections = extractComponentSections(ast, components)

  let html = ''
  for (const section of sections) {
    if (section.components.length === 0) continue

    // Only show section header if name is not empty
    const headerHtml = section.name
      ? `<div class="components-preview-section-header">${section.name}</div>`
      : ''

    html += `
      <div class="components-preview-section">
        ${headerHtml}
        <div class="components-preview-list">
          ${section.components.map(comp => renderComponentWithStates(comp, ast)).join('')}
        </div>
      </div>
    `
  }

  // Set HTML first, then render components
  preview.innerHTML = html

  // Now render all components (DOM elements exist now)
  for (const section of sections) {
    for (const comp of section.components) {
      const states = getComponentStates(comp)
      for (const stateName of states) {
        renderComponentState(comp, stateName, ast)
      }
    }
  }
}

function extractComponentSections(ast, components) {
  // Get current file source to find section headers
  const sourceCode = files[currentFile] || ''
  const lines = sourceCode.split('\n')

  // Extract section headers with their line numbers
  const sectionHeaders = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const match = line.match(/^---\s*(.+?)\s*---$/)
    if (match) {
      sectionHeaders.push({
        name: match[1],
        lineStart: i + 1, // 1-based line number
        lineEnd: lines.length
      })
      // Update previous section's end line
      if (sectionHeaders.length > 1) {
        sectionHeaders[sectionHeaders.length - 2].lineEnd = i - 1
      }
    }
  }

  // If no sections defined, return all components without section header
  if (sectionHeaders.length === 0) {
    return [{ name: '', components }]
  }

  // Group components by section based on line numbers
  const sections = sectionHeaders.map(h => ({ name: h.name, components: [], lineStart: h.lineStart, lineEnd: h.lineEnd }))
  const unsortedComponents = []

  for (const comp of components) {
    // Skip components that match section header names
    if (sectionHeaders.some(h => h.name === comp.name)) continue

    const compLine = comp.line || 0
    let found = false

    for (const section of sections) {
      if (compLine >= section.lineStart && compLine <= section.lineEnd) {
        section.components.push(comp)
        found = true
        break
      }
    }

    if (!found) {
      unsortedComponents.push(comp)
    }
  }

  // Add unsorted components to first section or create default section (no header)
  if (unsortedComponents.length > 0) {
    if (sections.length > 0) {
      sections[0].components = [...unsortedComponents, ...sections[0].components]
    } else {
      sections.unshift({ name: '', components: unsortedComponents })
    }
  }

  // Filter out empty sections
  return sections.filter(s => s.components.length > 0)
}

function getComponentStates(comp) {
  const states = new Set()

  // Collect states from the component
  if (comp.states) {
    for (const state of comp.states) {
      if (BEHAVIOR_STATES.includes(state.name)) {
        states.add(state.name)
      }
    }
  }

  // Also collect from children
  const collectFromChildren = (children) => {
    for (const child of children || []) {
      if (child.states) {
        for (const state of child.states) {
          if (BEHAVIOR_STATES.includes(state.name)) {
            states.add(state.name)
          }
        }
      }
      if (child.children) {
        collectFromChildren(child.children)
      }
    }
  }
  collectFromChildren(comp.children || [])

  return ['default', ...Array.from(states)]
}

function renderComponentWithStates(comp, ast) {
  const states = getComponentStates(comp)

  let rows = ''
  for (let i = 0; i < states.length; i++) {
    const stateName = states[i]
    const showName = i === 0 ? comp.name : ''

    rows += `
      <div class="components-preview-row">
        <div class="components-preview-name">${showName}</div>
        <div class="components-preview-state">${stateName}</div>
        <div class="components-preview-render" id="comp-render-${comp.name}-${stateName}"></div>
      </div>
    `
  }

  return `<div class="components-preview-component">${rows}</div>`
}

function getTokensSource() {
  // Only get tokens and data files (not layouts or components)
  let tokensSource = ''
  for (const filename of Object.keys(files)) {
    const type = getFileType(filename)
    if (type === 'tokens' || type === 'data') {
      tokensSource += files[filename] + '\n'
    }
  }
  return tokensSource
}

// Inject component preview CSS variables (refreshes when tokens change)
let lastTokensHash = ''

function injectComponentPreviewStyles(force = false) {
  // Get tokens and create CSS variables
  const tokensSource = getTokensSource()

  // Calculate simple hash to detect changes
  const tokensHash = tokensSource.length + ':' + tokensSource.slice(0, 100)

  // Skip if unchanged (unless forced)
  if (!force && tokensHash === lastTokensHash) return
  lastTokensHash = tokensHash

  if (!tokensSource.trim()) return

  try {
    const ast = MirrorLang.parse(tokensSource)
    if (!ast.tokens || ast.tokens.length === 0) return

    // Build token map for resolving references
    const tokenMap = new Map()
    for (const t of ast.tokens) {
      tokenMap.set(t.name, t.value)
    }

    // Resolve token references (e.g., $surface.bg: $grey-800)
    const resolveValue = (value) => {
      if (typeof value === 'string' && value.startsWith('$')) {
        const resolved = tokenMap.get(value)
        if (resolved) return resolveValue(resolved)
      }
      return value
    }

    // Token suffixes that need px units when numeric
    const pxSuffixes = ['-pad', '-gap', '-rad', '-fs', '-w', '-h', '-minw', '-maxw', '-minh', '-maxh', '-bor']

    // Check if a CSS var name needs px unit
    const needsPxUnit = (varName) => {
      return pxSuffixes.some(suffix => varName.endsWith(suffix))
    }

    let cssVars = ':root {\n'
    for (const token of ast.tokens) {
      // Strip $ prefix and convert dots to hyphens
      const cssVarName = (token.name.startsWith('$') ? token.name.slice(1) : token.name)
        .replace(/\./g, '-')
      let resolvedValue = resolveValue(token.value)

      // Add px unit for numeric spacing/sizing values
      if (typeof resolvedValue === 'number' && needsPxUnit(cssVarName)) {
        resolvedValue = `${resolvedValue}px`
      }

      cssVars += `  --${cssVarName}: ${resolvedValue};\n`
    }
    cssVars += '}\n'

    // Remove old style element if exists
    const oldStyle = document.getElementById('component-preview-tokens')
    if (oldStyle) oldStyle.remove()

    const style = document.createElement('style')
    style.id = 'component-preview-tokens'
    style.textContent = cssVars
    document.head.appendChild(style)
  } catch (e) {
    console.warn('Failed to inject component preview styles:', e)
  }
}

function renderComponentState(comp, stateName, ast) {
  const container = document.getElementById(`comp-render-${comp.name}-${stateName}`)
  if (!container) return

  // Clear previous content
  container.innerHTML = ''

  // Ensure CSS variables are injected
  injectComponentPreviewStyles()

  try {
    // Get only tokens (not layouts)
    const tokensSource = getTokensSource()

    // Get the current component file source (for component definitions)
    const currentFileSource = files[currentFile] || ''

    // Build code: tokens + component file + instance
    let code = tokensSource + '\n' + currentFileSource + '\n' + comp.name

    const miniAst = MirrorLang.parse(code)
    const jsCode = MirrorLang.generateDOM(miniAst)
      .replace('export function createUI', 'function createUI')

    const fn = new Function(jsCode + '\nreturn createUI ? createUI() : null;')
    const ui = fn()

    if (ui && ui.root) {
      // Find and extract just the component we want (last child should be our instance)
      const allChildren = ui.root.children
      if (allChildren.length > 0) {
        const targetElement = allChildren[allChildren.length - 1]

        // For non-default states, add the state class
        if (stateName !== 'default') {
          targetElement.classList.add(`state-${stateName}`)
          targetElement.setAttribute('data-state', stateName)
        }

        // Wrap in artificial parent for w full / h full support
        const wrapper = document.createElement('div')
        wrapper.className = 'components-preview-wrapper'
        wrapper.appendChild(targetElement.cloneNode(true))
        container.appendChild(wrapper)
      }
    }
  } catch (e) {
    container.innerHTML = `<span style="color: #52525b; font-size: 11px;">Error: ${e.message}</span>`
  }
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
let studioRobustModifier = null  // Robust wrapper for atomic updates
let canvasDragCleanups = []  // Cleanup functions for canvas element drag handlers
const initializedDraggables = new WeakSet()  // Track elements with drag handlers to prevent duplicates
// editorHasFocus is now managed by studio state (studio.state.get().editorHasFocus)
// This getter provides backwards compatibility for existing code
function getEditorHasFocus() {
  return studio?.state ? studio.state.get().editorHasFocus : true
}
let currentPreludeOffset = 0  // Character offset of prelude in merged source (for adjusting change positions)

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

  // Group files by type
  for (const filename of Object.keys(files)) {
    const type = getFileType(filename)
    if (!filesByType[type]) {
      filesByType[type] = []
    }
    filesByType[type].push({ filename, content: files[filename] })
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
  const separatorLines = 3  // \n\n (blank line after prelude) + comment line + \n

  return preludeLines + separatorLines - 1  // -1 because editor line 1 should map to first content line
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
  const explorerComponentsContainer = document.getElementById('explorer-components-container')
  const explorerUserComponentsContainer = document.getElementById('explorer-user-components-container')

  // Hide explorer panel in playground mode
  if (isPlaygroundMode && explorerPanelContainer) {
    explorerPanelContainer.style.display = 'none'
  }

  // ============================================
  // NEW ARCHITECTURE: Initialize new studio
  // ============================================
  try {
    // Get chat panel container (content area) and API key
    const chatPanelContainer = document.getElementById('chat-panel-content')
    // API Key for AI agent
    const agentApiKey = getOpenrouterKey()

    initNewStudio({
      editor: editor,
      previewContainer: previewContainer,
      propertyPanelContainer: propertyPanelContainer,
      // Don't pass explorer containers in playground mode
      explorerPanelContainer: isPlaygroundMode ? undefined : explorerPanelContainer,
      fileTreeContainer: isPlaygroundMode ? undefined : fileTreeContainer,
      explorerComponentsContainer: isPlaygroundMode ? undefined : explorerComponentsContainer,
      explorerUserComponentsContainer: isPlaygroundMode ? undefined : explorerUserComponentsContainer,
      chatPanelContainer: chatPanelContainer,
      agentApiKey: agentApiKey,
      initialSource: files[currentFile] || '',
      currentFile: currentFile,
      getAllSource: getAllProjectSource,
      // Project context for AI Agent
      getCurrentFile: () => currentFile,
      getFiles: () => {
        return Object.entries(files).map(([name, code]) => ({
          name,
          type: detectFileType(name, code),
          code
        }))
      },
      updateFile: (filename, content) => {
        files[filename] = content
        // If it's the current file, update editor
        if (filename === currentFile) {
          editor.dispatch({
            changes: { from: 0, to: editor.state.doc.length, insert: content }
          })
        }
        // Save to storage
        saveFile(filename, content)
      },
      switchToFile: (filename) => {
        if (files[filename]) {
          switchFile(filename)
        }
      },
    })
    // Line offset handling is now done in SyncCoordinator via LineOffsetService
    // Offset is set in updateStudio() after each compile
    console.log('Studio: New architecture initialized')

    // Show setup message only if no agent was initialized
    // Agent initialization happens in bootstrap.ts if agentApiKey is provided
    if (!agentApiKey) {
      initChatPanel()
    }
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

  // Set up move event handlers for debugging
  setupMoveEventHandlers()

  // Initialize preview zoom controls
  initPreviewZoom()

  // Initialize play mode button
  initPlayMode()
}

// ============================================
// Play Mode (Component Testing)
// ============================================

function initPlayMode() {
  const playBtn = document.getElementById('play-btn')
  const previewPanel = document.querySelector('.preview-panel')

  if (!playBtn || !previewPanel) {
    console.warn('Play mode: Missing elements')
    return
  }

  // Handle button click
  playBtn.addEventListener('click', () => {
    studioActions.togglePlayMode()
  })

  // Listen for play mode changes
  if (studio?.events) {
    studio.events.on('preview:playmode', ({ active }) => {
      // Update button state
      playBtn.classList.toggle('active', active)

      // Update preview panel styling
      previewPanel.classList.toggle('play-mode', active)

      // Clear selection when entering play mode
      if (active) {
        studioActions.setSelection(null, 'preview')
      }
    })
  }

  // Keyboard shortcut: Escape to exit play mode
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && studioState.get().playMode) {
      studioActions.setPlayMode(false)
    }
  })

  console.log('Play mode: Initialized')
}

// ============================================
// Preview Zoom Controls
// ============================================

const ZOOM_LEVELS = [25, 50, 75, 100, 125, 150, 200]
let currentZoomIndex = 3 // 100%

function initPreviewZoom() {
  const preview = document.getElementById('preview')
  const zoomIn = document.getElementById('zoom-in')
  const zoomOut = document.getElementById('zoom-out')
  const zoomReset = document.getElementById('zoom-reset')
  const zoomLevel = document.getElementById('zoom-level')

  if (!preview || !zoomIn || !zoomOut || !zoomReset || !zoomLevel) {
    console.warn('Preview zoom: Missing elements')
    return
  }

  function applyZoom(level) {
    const scale = level / 100
    const mirrorRoot = preview.querySelector('.mirror-root')
    if (mirrorRoot) {
      mirrorRoot.style.transform = `scale(${scale})`
      // Update state for coordinate calculations
      studioActions.setPreviewZoom(level)
      mirrorRoot.style.transformOrigin = 'top left'
      // Adjust container to show scaled content properly
      if (scale !== 1) {
        mirrorRoot.style.width = `${100 / scale}%`
        mirrorRoot.style.height = `${100 / scale}%`
      } else {
        mirrorRoot.style.width = ''
        mirrorRoot.style.height = ''
      }
    }
    zoomLevel.textContent = `${level}%`
  }

  zoomIn.addEventListener('click', () => {
    if (currentZoomIndex < ZOOM_LEVELS.length - 1) {
      currentZoomIndex++
      applyZoom(ZOOM_LEVELS[currentZoomIndex])
    }
  })

  zoomOut.addEventListener('click', () => {
    if (currentZoomIndex > 0) {
      currentZoomIndex--
      applyZoom(ZOOM_LEVELS[currentZoomIndex])
    }
  })

  zoomReset.addEventListener('click', () => {
    currentZoomIndex = 3 // 100%
    applyZoom(100)
  })

  // Re-apply zoom after recompile (when .mirror-root is recreated)
  if (studio?.events) {
    studio.events.on('compile:completed', () => {
      // Use setTimeout to let DOM update first
      setTimeout(() => {
        applyZoom(ZOOM_LEVELS[currentZoomIndex])
      }, 0)
    })
    // Note: pendingSelection is now handled automatically by SyncCoordinator
    // which subscribes to selection:changed events
  }

  console.log('Preview zoom: Initialized')
}

/**
 * Setup notification event handlers for user feedback
 * Displays messages in the status bar
 */
function setupNotificationHandlers() {
  if (!studio?.events) return

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

/**
 * Setup move event handlers for debugging and coordination
 * Listens to move:completed events from DragDropService
 */
function setupMoveEventHandlers() {
  if (!studio?.events) return

  // Log move:completed events for debugging
  studio.events.on('move:completed', (data) => {
    console.log('[Move] Completed:', {
      nodeId: data.nodeId,
      targetId: data.targetId,
      position: data.position,
      layoutTransition: data.layoutTransition,
    })

    // Future: Could trigger additional actions here, such as:
    // - Updating breadcrumb
    // - Triggering analytics
    // - Refreshing property panel
  })
}

// ============================================
// Chat Panel (permanent left panel)
// ============================================

/**
 * Show setup message in chat panel when no API key is configured
 * Only called when agentApiKey is not set at startup
 */
function initChatPanel() {
  const chatContent = document.getElementById('chat-panel-content')

  if (!chatContent) {
    console.warn('[ChatPanel] Missing content element')
    return
  }

  // Show setup message (this function is only called when no API key exists)
  chatContent.innerHTML = `
    <div class="chat-panel">
      <div class="chat-header">
        <span class="chat-title">AI Chat</span>
      </div>
      <div class="chat-setup">
        <div class="chat-setup-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <div class="chat-setup-text">
          Für den AI-Assistenten wird ein OpenRouter API Key benötigt.
        </div>
        <button class="chat-setup-btn" id="chat-setup-btn">
          API Key einrichten
        </button>
      </div>
    </div>
  `

  // Open settings when button is clicked
  document.getElementById('chat-setup-btn')?.addEventListener('click', () => {
    settingsButton?.click()
  })
}

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
    studioPropertyPanel = new MirrorLang.PropertyPanel(
      propertyPanelContainer,
      studioSelectionManager,
      studioPropertyExtractor,
      studioCodeModifier,
      handleStudioCodeChange,
      {
        getAllSource: getAllProjectSource,
        filesAccess: {
          getFile: (path) => files[path],
          setFile: (path, content) => {
            files[path] = content
            saveFile(path, content)
            // Component file updated - the main file change will trigger recompile
          },
          getCurrentFile: () => currentFile
        }
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
      offset: pos
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

// Handle code changes from property panel
function handleStudioCodeChange(result) {
  if (!result.success) {
    console.warn('Studio: Code modification failed:', result.error)
    return
  }

  // Adjust change positions for prelude offset
  // The CodeModifier operates on the merged source (prelude + current file),
  // but the editor only contains the current file
  const adjustedChange = {
    from: result.change.from - currentPreludeOffset,
    to: result.change.to - currentPreludeOffset,
    insert: result.change.insert
  }

  // Validate adjusted change range before applying (prevents RangeError crashes)
  const docLength = editor.state.doc.length
  if (adjustedChange.from < 0 || adjustedChange.to > docLength || adjustedChange.from > adjustedChange.to) {
    console.warn('Studio: Invalid change range after adjustment', {
      original: result.change,
      adjusted: adjustedChange,
      preludeOffset: currentPreludeOffset,
      docLength
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
    insert: currentSource.substring(adjustedChange.from, adjustedChange.to)
  }

  // Apply the adjusted change to CodeMirror
  editor.dispatch({
    changes: adjustedChange,
    annotations: [
      propertyPanelChangeAnnotation.of(true),
      Transaction.userEvent.of('input.property')
    ]
  })

  // Record the change in CommandExecutor for undo/redo
  const command = new RecordedChangeCommand({
    change: adjustedChange,
    inverseChange: inverseChange,
    description: 'Property change'
  })
  executor.execute(command)

  // Emit event for tracking
  events.emit('source:changed', {
    source: editor.state.doc.toString(),
    origin: 'panel',
    change: adjustedChange
  })

  // Compile immediately (no debounce for property panel changes)
  const code = editor.state.doc.toString()
  compile(code)
  debouncedSave(code)
}

// ============================================
// Zag Component Drop Handler
// ============================================

/**
 * Check if a component is a Zag component (has slot children)
 * @param {Array} children - Component children array
 * @returns {boolean}
 */
function isZagComponent(children) {
  if (!children || children.length === 0) return false
  return children.some(child => child.isSlot === true)
}

/**
 * Get the slots from component children
 * @param {Array} children - Component children array
 * @returns {Array}
 */
function getZagSlots(children) {
  return children.filter(child => child.isSlot === true)
}

/**
 * Get the items from component children (non-slot children or items inside slots)
 * @param {Array} children - Component children array
 * @returns {Array}
 */
function getZagItems(children) {
  const items = []
  for (const child of children) {
    if (child.isItem) {
      items.push(child)
    } else if (child.isSlot && child.children) {
      // Look for items inside slots (e.g., Content: > Item)
      items.push(...child.children.filter(c => c.isItem))
    }
  }
  return items
}

/**
 * Check if a Zag component definition exists in the current AST
 * @param {string} zagComponentName - The Zag component name (e.g., 'Select')
 * @returns {{ exists: boolean, definitionName?: string }}
 */
function findExistingZagDefinition(zagComponentName) {
  // First check current file's AST
  const ast = studio.state?.ast
  if (ast?.components) {
    for (const comp of ast.components) {
      // Check if this component is defined as this Zag type
      // e.g., "MySelect as Select:" or extends Select
      if (comp.primitive === zagComponentName || comp.extends === zagComponentName) {
        return { exists: true, definitionName: comp.name, sourceFile: currentFile }
      }
    }
  }

  // Search ALL project files for the definition
  const allFiles = window.desktopFiles?.getFiles?.() || files
  for (const [filename, content] of Object.entries(allFiles)) {
    // Skip current file (already checked above)
    if (filename === currentFile) continue
    // Only check Mirror files
    if (!isMirrorFile(filename)) continue
    if (!content || !content.trim()) continue

    try {
      const fileAst = MirrorLang.parse(content)
      if (fileAst?.components) {
        for (const comp of fileAst.components) {
          if (comp.primitive === zagComponentName || comp.extends === zagComponentName) {
            return { exists: true, definitionName: comp.name, sourceFile: filename }
          }
        }
      }
    } catch (e) {
      // Skip files that fail to parse
    }
  }

  return { exists: false }
}

/**
 * Generate a unique component name for the Zag definition
 * Searches ALL project files to ensure uniqueness
 * @param {string} zagComponentName - The base Zag component name
 * @returns {string}
 */
function generateZagComponentName(zagComponentName) {
  // Collect all existing component names from all files
  const existingNames = new Set()

  // Current file
  const ast = studio.state?.ast
  if (ast?.components) {
    for (const comp of ast.components) {
      existingNames.add(comp.name)
    }
  }

  // All other files
  const allFiles = window.desktopFiles?.getFiles?.() || files
  for (const [filename, content] of Object.entries(allFiles)) {
    if (filename === currentFile) continue
    if (!isMirrorFile(filename)) continue
    if (!content || !content.trim()) continue

    try {
      const fileAst = MirrorLang.parse(content)
      if (fileAst?.components) {
        for (const comp of fileAst.components) {
          existingNames.add(comp.name)
        }
      }
    } catch (e) {
      // Skip files that fail to parse
    }
  }

  // Start with the Zag component name itself (e.g., "Select")
  if (!existingNames.has(zagComponentName)) {
    return zagComponentName
  }

  // Try prefixes
  const prefixes = ['My', 'Custom', 'App', 'Project']
  for (const prefix of prefixes) {
    const name = `${prefix}${zagComponentName}`
    if (!existingNames.has(name)) {
      return name
    }
  }

  // Fall back to numbered suffix with safety limit
  let counter = 2
  const MAX_COUNTER = 1000
  while (existingNames.has(`${zagComponentName}${counter}`) && counter < MAX_COUNTER) {
    counter++
  }
  return `${zagComponentName}${counter}`
}

/**
 * Find an existing .com file or create a new components.com file
 * @returns {Promise<string|null>} Path to the components file, or null if creation failed
 */
async function findOrCreateComponentsFile() {
  // Get all files
  const allFiles = window.desktopFiles?.getFiles?.() || files

  // Look for existing .com files
  const comFiles = Object.keys(allFiles).filter(f => isComponentsFile(f))

  if (comFiles.length > 0) {
    // Prefer 'components.com' or the first .com file
    const preferred = comFiles.find(f => f.includes('components')) || comFiles[0]
    return preferred
  }

  // No .com file exists - create one
  // Get current directory from currentFile
  if (!currentFile) {
    console.warn('[Zag] No current file, cannot determine directory for components.com')
    return null
  }

  const dir = currentFile.substring(0, currentFile.lastIndexOf('/') + 1)
  const newFilePath = dir + 'components.com'
  const initialContent = '// Component definitions\n'

  if (window.TauriBridge?.isTauri?.()) {
    try {
      await window.TauriBridge.fs.writeFile(newFilePath, initialContent)
      // Update in-memory cache immediately
      if (window.desktopFiles?.getFiles) {
        window.desktopFiles.getFiles()[newFilePath] = initialContent
      }
      // Refresh file list
      window.desktopFiles?.loadFolder?.(dir.slice(0, -1))
      console.log('[Zag] Created new components file:', newFilePath)
      return newFilePath
    } catch (err) {
      console.error('[Zag] Failed to create components.com:', err)
      studio.events.emit('notification:error', {
        message: 'Konnte components.com nicht erstellen',
        duration: 3000
      })
      return null
    }
  } else {
    // Browser mode
    files[newFilePath] = initialContent
    updateFileList()
    console.log('[Zag] Created new components file (browser mode):', newFilePath)
    return newFilePath
  }
}

/**
 * Add a Zag definition to a components file
 * @param {string} definitionCode - The definition code to add
 * @param {string} filePath - Path to the components file
 * @returns {Promise<boolean>} True if successful
 */
async function addZagDefinitionToComponentsFile(definitionCode, filePath) {
  const allFiles = window.desktopFiles?.getFiles?.() || files
  let content = allFiles[filePath] || ''

  // Append definition to file
  content = content.trim() ? content.trimEnd() + '\n\n' + definitionCode + '\n' : definitionCode + '\n'

  if (window.TauriBridge?.isTauri?.()) {
    try {
      await window.TauriBridge.fs.writeFile(filePath, content)
      // Update in-memory cache immediately
      if (window.desktopFiles?.getFiles) {
        window.desktopFiles.getFiles()[filePath] = content
      }
      console.log('[Zag] Added definition to:', filePath)
      studio.events.emit('notification:success', {
        message: `Definition wurde zu ${filePath.split('/').pop()} hinzugefügt`,
        duration: 2000
      })
      return true
    } catch (err) {
      console.error('[Zag] Failed to write to components file:', err)
      studio.events.emit('notification:error', {
        message: `Konnte nicht zu ${filePath.split('/').pop()} speichern`,
        duration: 3000
      })
      return false
    }
  } else {
    // Browser mode
    files[filePath] = content
    console.log('[Zag] Added definition to (browser mode):', filePath)
    studio.events.emit('notification:success', {
      message: `Definition wurde zu ${filePath.split('/').pop()} hinzugefügt`,
      duration: 2000
    })
    return true
  }
}

/**
 * Generate the component definition code for a Zag component
 * Creates the definition with slots and their styling
 *
 * @param {string} definitionName - Name for the component definition
 * @param {string} zagComponentName - The Zag component type (e.g., 'Select')
 * @param {Array} children - Component children with slots
 * @returns {string}
 */
function generateZagDefinitionCode(definitionName, zagComponentName, children) {
  const lines = []

  // Component definition header
  lines.push(`${definitionName} as ${zagComponentName}:`)

  // Add slot definitions (only slots, not items)
  const slots = getZagSlots(children)
  for (const slot of slots) {
    lines.push(`  ${slot.template}:`)

    // Add slot properties
    if (slot.properties) {
      lines.push(`    ${slot.properties}`)
    }

    // Add nested children (if any, but NOT items)
    if (slot.children) {
      for (const nested of slot.children) {
        if (!nested.isItem) {
          // Regular component inside slot
          let nestedLine = `    ${nested.template}`
          if (nested.properties) {
            nestedLine += ` ${nested.properties}`
          }
          if (nested.textContent) {
            nestedLine += ` "${nested.textContent}"`
          }
          lines.push(nestedLine)
        }
      }
    }
  }

  return lines.join('\n')
}

/**
 * Generate the instance code for a Zag component
 * Creates just the instance with items (no slot definitions)
 *
 * @param {string} instanceName - Name of the component to instantiate
 * @param {string|undefined} properties - Properties string
 * @param {Array} children - Component children
 * @param {string} indent - Base indentation
 * @returns {string}
 */
function generateZagInstanceCode(instanceName, properties, children, indent = '') {
  const lines = []

  // Instance line
  let instanceLine = `${indent}${instanceName}`
  if (properties) {
    instanceLine += ` ${properties}`
  }
  lines.push(instanceLine)

  // Add items (only items, no slots)
  const items = getZagItems(children)
  for (const item of items) {
    let itemLine = `${indent}  ${item.template}`
    if (item.properties) {
      itemLine += ` ${item.properties}`
    }
    if (item.textContent) {
      itemLine += ` "${item.textContent}"`
    }
    lines.push(itemLine)
  }

  return lines.join('\n')
}

/**
 * Add a Zag component definition to the code
 * Inserts the definition at the end of the component definitions section
 *
 * @param {string} definitionCode - The component definition code
 * @returns {boolean} - Whether the operation succeeded
 */
function addZagDefinitionToCode(definitionCode) {
  const currentSource = editor.state.doc.toString()

  // Find where to insert the definition
  // Strategy: Insert after the last component definition or at the start if none exist
  const ast = studio.state?.ast
  let insertPosition = 0

  if (ast && ast.components && ast.components.length > 0) {
    // Find the end of the last component definition
    const lastComponent = ast.components[ast.components.length - 1]
    // Get the line after the last component ends
    const lines = currentSource.split('\n')
    let endLine = lastComponent.line

    // Find the actual end by looking for the next non-indented line or end of file
    for (let i = lastComponent.line; i < lines.length; i++) {
      const line = lines[i]
      // If we hit an empty line or a line that's not indented (new top-level item), stop
      if (line.trim() === '' || (line.length > 0 && !line.startsWith(' ') && !line.startsWith('\t'))) {
        endLine = i
        break
      }
      endLine = i + 1
    }

    // Calculate character position
    insertPosition = lines.slice(0, endLine).join('\n').length
  } else if (ast && ast.tokens && ast.tokens.length > 0) {
    // Insert after tokens section
    const lastToken = ast.tokens[ast.tokens.length - 1]
    const lines = currentSource.split('\n')
    insertPosition = lines.slice(0, lastToken.line).join('\n').length
  }

  // Insert with blank line before
  const insertText = '\n\n' + definitionCode

  // Apply the change via CodeMirror
  const change = {
    from: insertPosition,
    to: insertPosition,
    insert: insertText
  }

  editor.dispatch({
    changes: change,
    annotations: Transaction.userEvent.of('input.drop')
  })

  // Record for undo
  const inverseChange = {
    from: insertPosition,
    to: insertPosition + insertText.length,
    insert: ''
  }

  const command = new RecordedChangeCommand({
    change: change,
    inverseChange: inverseChange,
    description: 'Add component definition'
  })
  executor.execute(command)

  // Emit event
  events.emit('source:changed', {
    source: editor.state.doc.toString(),
    origin: 'zag-definition',
    change: change
  })

  return true
}

// Handle drag-drop from DragDropService (uses DropResultInfo format)
async function handleStudioDrop(result) {
  const previewContainer = document.getElementById('preview')

  // Hide drop zone visualization
  studio.preview?.hideDropZone()

  // Remove drop target highlight
  previewContainer.querySelectorAll('.studio-drop-target').forEach(el => {
    el.classList.remove('studio-drop-target')
  })

  // Ensure we have CodeModifier
  if (!studioCodeModifier) {
    console.warn('Studio: CodeModifier not available')
    return
  }

  // DropResultInfo format:
  // { source, targetNodeId, placement, insertionIndex?, absolutePosition?, alignment?, isDuplicate, delta }
  const { source, targetNodeId, placement, insertionIndex, absolutePosition, alignment, isDuplicate } = result

  let modResult = null
  let componentName = ''

  if (source.type === 'element') {
    // Moving/duplicating an existing element
    componentName = 'Element'

    if (isDuplicate) {
      // Duplicate: copy node to target location (Alt-drag)
      modResult = studioCodeModifier.duplicateNode(source.nodeId, targetNodeId, placement)
      componentName = 'Duplicate'
    } else if (placement === 'absolute' && absolutePosition) {
      // Update x/y atomically using RobustModifier
      // This ensures both properties are updated in a single operation
      // with proper offset handling and validation
      if (studioRobustModifier) {
        modResult = studioRobustModifier.updatePosition(
          source.nodeId,
          absolutePosition.x,
          absolutePosition.y
        )
      } else {
        // Fallback to sequential updates (less robust)
        const resultX = studioCodeModifier.updateProperty(source.nodeId, 'x', String(Math.round(absolutePosition.x)))
        if (resultX.success) {
          const resultY = studioCodeModifier.updateProperty(source.nodeId, 'y', String(Math.round(absolutePosition.y)))
          modResult = resultY.success ? {
            success: true,
            newSource: resultY.newSource,
            change: { from: resultX.change.from, to: resultX.change.to, insert: resultY.change.insert }
          } : resultY
        } else {
          modResult = resultX
        }
      }
    } else {
      // Move to new parent/position
      modResult = studioCodeModifier.moveNode(source.nodeId, targetNodeId, placement, insertionIndex)
    }
  } else if (source.type === 'palette') {
    // Adding new component from palette
    componentName = source.componentName || 'Component'

    // Build properties string
    let properties = source.properties || ''

    // Add x/y for absolute positioning
    if (placement === 'absolute' && absolutePosition) {
      // Convert to coordinates relative to target parent (not preview container)
      let relX = absolutePosition.x
      let relY = absolutePosition.y

      const previewContainer = document.getElementById('preview')
      const targetElement = previewContainer?.querySelector(`[data-mirror-id="${targetNodeId}"]`)
      if (targetElement && previewContainer) {
        const parentRect = targetElement.getBoundingClientRect()
        const previewRect = previewContainer.getBoundingClientRect()
        // absolutePosition is relative to preview, convert to relative to parent
        relX = absolutePosition.x - (parentRect.left - previewRect.left)
        relY = absolutePosition.y - (parentRect.top - previewRect.top)
      } else if (!targetElement) {
        // Log warning when target element not found - coordinates won't be transformed
        console.warn(`[Drop] Target element not found for id "${targetNodeId}", using untransformed coordinates`)
      }

      // Adjust for zoom scale - getBoundingClientRect returns zoomed values
      // but x/y properties need unzoomed coordinates
      const zoomLevel = ZOOM_LEVELS[currentZoomIndex] ?? 100
      const zoomScale = zoomLevel / 100
      if (zoomScale && zoomScale !== 1) {
        relX = relX / zoomScale
        relY = relY / zoomScale
      }

      const posProps = `x ${Math.round(relX)}, y ${Math.round(relY)}`
      properties = properties ? `${properties}, ${posProps}` : posProps
    }

    // ============================================
    // ZAG COMPONENT HANDLING - 4 CASES
    // ============================================
    // Case 1: Component exists + .com file → Show info message (nothing to do)
    // Case 2: Component doesn't exist + .com file → Create definition only (no instance)
    // Case 3: Component exists + .mir file → Create instance only
    // Case 4: Component doesn't exist + .mir file → Create definition in .com + instance in .mir
    if (isZagComponent(source.children)) {
      console.log('[Drop] Zag component detected:', componentName)

      // Determine if dropping into a .com (components) file
      const droppingIntoComponentsFile = isComponentsFile(currentFile)
      console.log('[Drop] File type:', droppingIntoComponentsFile ? '.com' : '.mir', 'File:', currentFile)

      // Check if definition exists (searches all project files)
      const existingDef = findExistingZagDefinition(componentName)
      console.log('[Drop] Existing definition:', existingDef)

      if (droppingIntoComponentsFile) {
        // === DROPPING INTO .COM FILE ===
        if (existingDef.exists) {
          // Case 1: Component exists + .com file → Show info message
          console.log('[Drop] Case 1: Component already defined:', existingDef.definitionName)
          studio.events.emit('notification:info', {
            message: `${existingDef.definitionName} ist bereits definiert`,
            duration: 2000
          })
          return // Nothing to do
        } else {
          // Case 2: Component doesn't exist + .com file → Create definition only
          const definitionName = generateZagComponentName(componentName)
          console.log('[Drop] Case 2: Creating definition only:', definitionName)

          const definitionCode = generateZagDefinitionCode(
            definitionName,
            componentName,
            source.children
          )

          // Add definition to current .com file
          addZagDefinitionToCode(definitionCode)

          // Recompile
          const updatedCode = editor.state.doc.toString()
          compile(updatedCode)

          studio.events.emit('notification:success', {
            message: `${definitionName} wurde erstellt`,
            duration: 2000
          })
          return // No instance needed in .com files
        }
      } else {
        // === DROPPING INTO .MIR FILE ===
        let instanceComponentName = componentName

        if (existingDef.exists && existingDef.definitionName) {
          // Case 3: Component exists + .mir file → Create instance only
          console.log('[Drop] Case 3: Using existing definition:', existingDef.definitionName)
          instanceComponentName = existingDef.definitionName
        } else {
          // Case 4: Component doesn't exist + .mir file → Create definition in .com + instance here
          const definitionName = generateZagComponentName(componentName)
          console.log('[Drop] Case 4: Creating definition in .com file:', definitionName)

          const definitionCode = generateZagDefinitionCode(
            definitionName,
            componentName,
            source.children
          )

          // Find or create components file
          try {
            const componentsFile = await findOrCreateComponentsFile()
            if (componentsFile) {
              // Add definition to components file
              const success = await addZagDefinitionToComponentsFile(definitionCode, componentsFile)
              if (!success) {
                console.error('[Drop] Failed to add definition to components file')
                studio.events.emit('notification:error', {
                  message: 'Konnte Definition nicht erstellen',
                  duration: 3000
                })
                return // Abort on failure
              }
              console.log('[Drop] Added definition to:', componentsFile)
            } else {
              // Fallback: add to current file
              console.log('[Drop] No components file, adding to current file')
              addZagDefinitionToCode(definitionCode)
              const updatedCode = editor.state.doc.toString()
              compile(updatedCode)
            }
          } catch (err) {
            console.error('[Drop] Error creating definition:', err)
            studio.events.emit('notification:error', {
              message: 'Fehler beim Erstellen der Definition',
              duration: 3000
            })
            return
          }

          instanceComponentName = definitionName
        }

        // Generate instance code with just items (no slots)
        const instanceCode = generateZagInstanceCode(
          instanceComponentName,
          properties,
          source.children
        )

        // Use addChildWithTemplate for multi-line Zag instances
        modResult = studioCodeModifier.addChildWithTemplate(targetNodeId, instanceCode, {
          position: insertionIndex !== undefined ? insertionIndex : 'last',
        })
      }
    } else {
      // Regular component (not Zag) - use standard addChild
      modResult = studioCodeModifier.addChild(targetNodeId, componentName, {
        position: insertionIndex !== undefined ? insertionIndex : 'last',
        properties: properties || undefined,
        textContent: source.textContent || undefined,
      })
    }

    // Handle alignment for empty containers (set align on parent)
    if (modResult.success && alignment && alignment.zone) {
      // Map alignment zone to Mirror align property
      // Zones: top-left, top-center, top-right, center-left, center, center-right, bottom-left, bottom-center, bottom-right
      const alignMap = {
        'top-left': 'top',
        'top-center': 'top',
        'top-right': 'top',
        'center-left': 'left',
        'center': 'center',
        'center-right': 'right',
        'bottom-left': 'bottom',
        'bottom-center': 'bottom',
        'bottom-right': 'bottom',
      }
      const alignValue = alignMap[alignment.zone]
      if (alignValue) {
        // Apply alignment to parent after the child was added
        // Note: This creates a second change that needs to be applied
        const alignResult = studioCodeModifier.updateProperty(targetNodeId, 'align', alignValue)
        if (alignResult.success) {
          // Chain the alignment change
          applyDropChange(alignResult, 'Alignment')
        }
      }
    }
  }

  if (!modResult || !modResult.success) {
    console.warn('Studio: Drop modification failed:', modResult?.error)
    return
  }

  applyDropChange(modResult, componentName)

  console.log('Studio: Component dropped', targetNodeId, placement, insertionIndex)
}

// Helper to apply a code change from drop operation
function applyDropChange(modResult, componentName = 'Component') {
  const change = modResult.change

  // Adjust change positions for prelude offset (merged source vs single file)
  const adjustedChange = {
    from: change.from - currentPreludeOffset,
    to: change.to - currentPreludeOffset,
    insert: change.insert
  }

  // Validate range
  const docLength = editor.state.doc.length
  if (adjustedChange.from < 0 || adjustedChange.to > docLength || adjustedChange.from > adjustedChange.to) {
    console.warn('Studio: Invalid drop range after offset adjustment')
    return
  }

  // Calculate inverse change for undo
  const currentSource = editor.state.doc.toString()
  const inverseChange = {
    from: adjustedChange.from,
    to: adjustedChange.from + adjustedChange.insert.length,
    insert: currentSource.substring(adjustedChange.from, adjustedChange.to)
  }

  // Apply the change to CodeMirror
  editor.dispatch({
    changes: adjustedChange,
    annotations: Transaction.userEvent.of('input.drop')
  })

  // Record the change in CommandExecutor for undo/redo
  const command = new RecordedChangeCommand({
    change: adjustedChange,
    inverseChange: inverseChange,
    description: 'Drop component'
  })
  executor.execute(command)

  // Emit event for tracking
  events.emit('source:changed', {
    source: editor.state.doc.toString(),
    origin: 'drag-drop',
    change: adjustedChange
  })

  // Set pending selection BEFORE compile
  const insertLine = editor.state.doc.lineAt(adjustedChange.from)
  if (insertLine) {
    studioActions.setPendingSelection({
      line: insertLine.number,
      componentName: componentName,
      origin: 'drag-drop'
    })
  }

  // Compile and save
  const code = editor.state.doc.toString()
  compile(code)
  debouncedSave(code)
}

// Handle element deletion from canvas
function handleElementDelete() {
  if (!studioSelectionManager || !studioCodeModifier) return false

  const selection = studioSelectionManager.getSelection()
  if (!selection) return false

  // Get the node to delete (use templateId for template instances)
  const nodeId = selection.templateId || selection.nodeId
  if (!nodeId) return false

  // Remove the node
  const result = studioCodeModifier.removeNode(nodeId)
  if (!result.success) {
    console.warn('Studio: Failed to delete element:', result.error)
    return false
  }

  // Adjust change positions for prelude offset
  const adjustedChange = {
    from: result.change.from - currentPreludeOffset,
    to: result.change.to - currentPreludeOffset,
    insert: result.change.insert
  }

  // Validate range
  const docLength = editor.state.doc.length
  if (adjustedChange.from < 0 || adjustedChange.to > docLength) {
    console.warn('Studio: Invalid delete range')
    return false
  }

  // Calculate inverse change for undo (the deleted content)
  const currentSource = editor.state.doc.toString()
  const inverseChange = {
    from: adjustedChange.from,
    to: adjustedChange.from + adjustedChange.insert.length,
    insert: currentSource.substring(adjustedChange.from, adjustedChange.to)
  }

  // Apply the change to CodeMirror
  editor.dispatch({
    changes: adjustedChange,
    annotations: Transaction.userEvent.of('delete.element')
  })

  // Record the change in CommandExecutor for undo/redo
  const command = new RecordedChangeCommand({
    change: adjustedChange,
    inverseChange: inverseChange,
    description: `Delete ${nodeId}`
  })
  executor.execute(command)

  // Emit event for tracking
  events.emit('source:changed', {
    source: editor.state.doc.toString(),
    origin: 'keyboard',
    change: adjustedChange
  })

  // Clear selection and recompile
  studioSelectionManager.clearSelection()
  newHandleSelectionChange(null, 'keyboard')
  const code = editor.state.doc.toString()
  compile(code)
  debouncedSave(code)

  console.log('Studio: Element deleted', nodeId)
  return true
}

// Keyboard listener for Delete/Backspace on selected elements
document.addEventListener('keydown', (e) => {
  // Only handle Delete/Backspace when preview has focus (not editor)
  if (getEditorHasFocus()) return

  if (e.key === 'Delete' || e.key === 'Backspace') {
    // Don't interfere with input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

    if (handleElementDelete()) {
      e.preventDefault()
    }
  }
})

// Global undo/redo via CommandExecutor (when preview has focus)
document.addEventListener('keydown', (e) => {
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

// Layout preset icons
// NOTE: These icons must stay in sync with studio/icons/index.ts (LAYOUT_ICONS)
// This file cannot import TypeScript modules directly.
const LAYOUT_ICONS = {
  absolute: '<rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 2"></rect><circle cx="8" cy="8" r="2" fill="currentColor"></circle><circle cx="16" cy="14" r="2" fill="currentColor"></circle>',
  vbox: '<rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M21 9H3"></path><path d="M21 15H3"></path>',
  hbox: '<rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M9 3v18"></path><path d="M15 3v18"></path>',
  zstack: '<rect x="3" y="3" width="14" height="14" rx="2"></rect><rect x="7" y="7" width="14" height="14" rx="2"></rect>',
  grid: '<rect x="3" y="3" width="8" height="8" rx="1"></rect><rect x="13" y="3" width="8" height="8" rx="1"></rect><rect x="3" y="13" width="8" height="8" rx="1"></rect><rect x="13" y="13" width="8" height="8" rx="1"></rect>',
  sidebar: '<rect x="3" y="3" width="18" height="18" rx="1"></rect><rect x="4" y="4" width="4" height="16"></rect>',
  headerfooter: '<rect x="3" y="3" width="18" height="18" rx="1"></rect><rect x="4" y="4" width="16" height="3"></rect>',
}

// Layout presets
const LAYOUT_PRESETS = [
  { name: 'Absolute', category: 'layout', properties: 'w full, h full, absolute', icon: LAYOUT_ICONS.absolute },
  { name: 'V-Box', category: 'layout', properties: 'ver, gap 8', icon: LAYOUT_ICONS.vbox },
  { name: 'H-Box', category: 'layout', properties: 'hor, gap 8', icon: LAYOUT_ICONS.hbox },
  { name: 'ZStack', category: 'layout', properties: 'stacked', icon: LAYOUT_ICONS.zstack },
  { name: 'Grid', category: 'layout', properties: 'grid 2, gap 8', icon: LAYOUT_ICONS.grid },
  { name: 'Sidebar', category: 'layout', properties: 'hor, w full, h full', icon: LAYOUT_ICONS.sidebar },
  { name: 'Header/Footer', category: 'layout', properties: 'ver, w full, h full', icon: LAYOUT_ICONS.headerfooter },
]

// Built-in primitive components
// NOTE: Icons must stay in sync with studio/icons/index.ts (COMPONENT_ICONS)
// NOTE: defaultSize should match the w/h in properties for accurate ghost rendering
const PRIMITIVE_COMPONENTS = [
  { name: 'Box', category: 'Basic', properties: 'w hug, h hug, pad 16, bg #27272a, rad 8', defaultSize: { width: 32, height: 32 }, icon: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>' },
  { name: 'Button', category: 'Basic', properties: 'w hug, h hug, pad 10 20, bg #5BA8F5, rad 6, bor 0', text: 'Button', defaultSize: { width: 80, height: 36 }, icon: '<rect x="3" y="8" width="18" height="8" rx="2" ry="2"></rect>' },
  { name: 'Text', category: 'Basic', properties: 'w hug, h hug', text: 'Text', defaultSize: { width: 80, height: 24 }, icon: '<polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line>' },
  { name: 'Input', category: 'Basic', properties: 'w 200, h hug, pad 10, bg #27272a, rad 6, bor 0', text: 'placeholder...', defaultSize: { width: 200, height: 36 }, icon: '<rect x="3" y="6" width="18" height="12" rx="2" ry="2"></rect><line x1="7" y1="12" x2="11" y2="12"></line>' },
  { name: 'Icon', category: 'Basic', properties: 'w 24, h 24, "star"', defaultSize: { width: 24, height: 24 }, icon: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>' },
  { name: 'Image', category: 'Basic', properties: 'w 200, h 200, "https://picsum.photos/200"', defaultSize: { width: 200, height: 200 }, icon: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>' },
  { name: 'Slot', category: 'Basic', properties: 'w hug, h hug', text: 'Content', defaultSize: { width: 56, height: 24 }, icon: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-dasharray="4 2"></rect><line x1="8" y1="12" x2="16" y2="12"></line>' },
]

// User component icon (cube/component symbol)
const USER_COMPONENT_ICON = '<path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path>'

// Zag component icons (SVG paths)
const ZAG_ICONS = {
  Select: '<path d="M4 7h16M4 12h16M4 17h10"/><path d="M18 13l-2 2 2 2"/>',
  Combobox: '<path d="M4 7h16M4 12h16M4 17h10"/><circle cx="18" cy="17" r="3"/>',
  Listbox: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>',
  Menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  ContextMenu: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="13" y2="16"/>',
  NestedMenu: '<line x1="3" y1="6" x2="15" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><path d="M17 10l4 2-4 2"/>',
  NavigationMenu: '<rect x="2" y="4" width="20" height="4" rx="1"/><rect x="2" y="10" width="8" height="10" rx="1"/><rect x="12" y="10" width="10" height="10" rx="1"/>',
  Checkbox: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/>',
  Switch: '<rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="8" cy="12" r="3"/>',
  Slider: '<line x1="4" y1="12" x2="20" y2="12"/><circle cx="12" cy="12" r="4"/>',
  RangeSlider: '<line x1="4" y1="12" x2="20" y2="12"/><circle cx="8" cy="12" r="3"/><circle cx="16" cy="12" r="3"/>',
  AngleSlider: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="12" x2="18" y2="8"/>',
  RadioGroup: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
  Dialog: '<rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="8" x2="22" y2="8"/><line x1="18" y1="4" x2="18" y2="8"/>',
  Tooltip: '<rect x="4" y="2" width="16" height="12" rx="2"/><path d="M12 14v4"/>',
  Popover: '<rect x="3" y="3" width="18" height="14" rx="2"/><path d="M12 17l-3 4h6l-3-4"/>',
  HoverCard: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><line x1="12" y1="10" x2="18" y2="10"/><line x1="12" y1="14" x2="16" y2="14"/>',
  Tabs: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 6v4"/><path d="M10 6v4"/>',
  Accordion: '<rect x="3" y="3" width="18" height="6" rx="1"/><rect x="3" y="11" width="18" height="6" rx="1"/><path d="M15 6l2 2-2 2"/><path d="M15 14h2"/>',
  Collapsible: '<rect x="3" y="3" width="18" height="6" rx="1"/><rect x="3" y="11" width="18" height="8" rx="1" stroke-dasharray="2 2"/>',
  Steps: '<circle cx="5" cy="12" r="3"/><circle cx="12" cy="12" r="3"/><circle cx="19" cy="12" r="3"/><line x1="8" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="16" y2="12"/>',
  Pagination: '<rect x="2" y="8" width="5" height="8" rx="1"/><rect x="9" y="8" width="6" height="8" rx="1"/><rect x="17" y="8" width="5" height="8" rx="1"/>',
  TreeView: '<line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="8" y1="18" x2="20" y2="18"/><polyline points="4 10 4 18 6 18"/>',
  NumberInput: '<rect x="3" y="6" width="18" height="12" rx="2"/><line x1="9" y1="6" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="18"/><path d="M5 12h2"/><path d="M17 10v4"/>',
  PinInput: '<rect x="2" y="8" width="5" height="8" rx="1"/><rect x="9" y="8" width="5" height="8" rx="1"/><rect x="17" y="8" width="5" height="8" rx="1"/>',
  PasswordInput: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="7" cy="12" r="1"/><circle cx="11" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>',
  TagsInput: '<rect x="2" y="6" width="20" height="12" rx="2"/><rect x="4" y="9" width="6" height="6" rx="1"/><rect x="12" y="9" width="6" height="6" rx="1"/>',
  Editable: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  RatingGroup: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  SegmentedControl: '<rect x="2" y="8" width="20" height="8" rx="2"/><line x1="9" y1="8" x2="9" y2="16"/><line x1="15" y1="8" x2="15" y2="16"/>',
  ToggleGroup: '<rect x="2" y="8" width="8" height="8" rx="2"/><rect x="14" y="8" width="8" height="8" rx="2"/>',
  DatePicker: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  DateInput: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10v4"/><path d="M11 10v4"/><path d="M15 10v4"/>',
  Timer: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  FloatingPanel: '<rect x="4" y="4" width="16" height="12" rx="2"/><line x1="4" y1="8" x2="20" y2="8"/><path d="M17 16l3 4"/><path d="M20 16l-3 4"/>',
  Tour: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><circle cx="12" cy="16" r="1"/>',
  Presence: '<circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/>',
  Avatar: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  FileUpload: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/>',
  ImageCropper: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/><path d="M3 9h18"/><path d="M3 15h18"/>',
  Carousel: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10l-2 2 2 2"/><path d="M18 10l2 2-2 2"/>',
  SignaturePad: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M6 14c2-2 4 2 6 0s4 2 6 0"/>',
  Progress: '<rect x="2" y="10" width="20" height="4" rx="2"/><rect x="2" y="10" width="12" height="4" rx="2"/>',
  CircularProgress: '<circle cx="12" cy="12" r="10" stroke-dasharray="40 100"/>',
  Marquee: '<rect x="2" y="8" width="20" height="8" rx="2"/><path d="M6 12h2M10 12h2M14 12h2"/>',
  Toast: '<rect x="3" y="6" width="18" height="12" rx="2"/><line x1="7" y1="10" x2="17" y2="10"/><line x1="7" y1="14" x2="13" y2="14"/>',
  Clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><rect x="4" y="4" width="16" height="18" rx="2"/>',
  QRCode: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="4" height="4"/>',
  ScrollArea: '<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="18" y="6" width="2" height="8" rx="1"/>',
  Splitter: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/><circle cx="12" cy="12" r="2"/>',
  ColorPicker: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>',
}

// Zag component categories (3-5 items per group)
const ZAG_CATEGORIES = {
  // Input - Text/number entry
  NumberInput: 'Input',
  PinInput: 'Input',
  PasswordInput: 'Input',
  TagsInput: 'Input',
  Editable: 'Input',
  // Toggle - On/off controls
  Checkbox: 'Toggle',
  Switch: 'Toggle',
  RadioGroup: 'Toggle',
  ToggleGroup: 'Toggle',
  // Select - Selection from options
  Select: 'Select',
  Combobox: 'Select',
  Listbox: 'Select',
  SegmentedControl: 'Select',
  ColorPicker: 'Select',
  // Slider - Range controls
  Slider: 'Slider',
  RangeSlider: 'Slider',
  AngleSlider: 'Slider',
  RatingGroup: 'Slider',
  // Menu - Menu systems
  Menu: 'Menu',
  ContextMenu: 'Menu',
  NestedMenu: 'Menu',
  NavigationMenu: 'Menu',
  // Popup - Modal/floating UI
  Dialog: 'Popup',
  Tooltip: 'Popup',
  Popover: 'Popup',
  HoverCard: 'Popup',
  // Notification - Alerts/messages
  Toast: 'Notification',
  Tour: 'Notification',
  FloatingPanel: 'Notification',
  // Disclosure - Show/hide content
  Tabs: 'Disclosure',
  Accordion: 'Disclosure',
  Collapsible: 'Disclosure',
  Presence: 'Disclosure',
  // Navigation - Page navigation
  Steps: 'Navigation',
  Pagination: 'Navigation',
  TreeView: 'Navigation',
  // Date - Date/time controls
  DatePicker: 'Date',
  DateInput: 'Date',
  Timer: 'Date',
  // Media - Images/files
  Avatar: 'Media',
  FileUpload: 'Media',
  ImageCropper: 'Media',
  Carousel: 'Media',
  SignaturePad: 'Media',
  // Feedback - Progress indicators
  Progress: 'Feedback',
  CircularProgress: 'Feedback',
  Marquee: 'Feedback',
  // Utility - Other tools
  Clipboard: 'Utility',
  QRCode: 'Utility',
  ScrollArea: 'Utility',
  Splitter: 'Utility',
}

// Category display order
const CATEGORY_ORDER = [
  'Layouts',
  'Basic',
  'Input',
  'Toggle',
  'Select',
  'Slider',
  'Menu',
  'Popup',
  'Notification',
  'Disclosure',
  'Navigation',
  'Date',
  'Media',
  'Feedback',
  'Utility',
  'User',
]

// Basic tab: ordered categories with specific components
const BASIC_TAB_STRUCTURE = [
  { category: 'Layouts', components: ['Box', 'Frame', 'HStack', 'VStack', 'Grid', 'Spacer', 'Divider'] },
  { category: 'Content', components: ['Text', 'Image', 'Icon', 'Link'] },
  { category: 'Controls', components: ['Button', 'Input', 'Checkbox', 'Switch', 'Select', 'Slider'] },
  { category: 'Containers', components: ['Dialog', 'Tabs', 'Accordion'] },
  { category: 'Feedback', components: ['Tooltip', 'Popover', 'Progress'] },
]

// Set for quick lookup
const BASIC_COMPONENTS = new Set(BASIC_TAB_STRUCTURE.flatMap(g => g.components))

// Active palette tab ('basic' or 'all')
let activePaletteTab = 'basic'

// Generate Zag components from MirrorLang.ZAG_PRIMITIVES
function getZagComponents() {
  if (typeof MirrorLang === 'undefined' || !MirrorLang.ZAG_PRIMITIVES) {
    console.warn('[Palette] MirrorLang.ZAG_PRIMITIVES not available')
    return []
  }

  const zagComponents = []
  for (const [name, def] of Object.entries(MirrorLang.ZAG_PRIMITIVES)) {
    // Skip aliases (same machine name as another component)
    const isAlias = name !== 'Select' && def.machine === 'select' ||
                    name !== 'Menu' && def.machine === 'menu' ||
                    name !== 'Slider' && def.machine === 'slider' ||
                    name !== 'Progress' && def.machine === 'progress'
    if (isAlias) continue

    zagComponents.push({
      name: name,
      category: ZAG_CATEGORIES[name] || 'Components',
      properties: '',  // No default properties - user adds as needed
      defaultSize: { width: 200, height: 40 },
      icon: ZAG_ICONS[name] || USER_COMPONENT_ICON,
      description: def.description || `${name} component`,
    })
  }
  return zagComponents
}

// Render a component palette item (icon left, name right)
function renderPaletteItem(comp) {
  const props = comp.properties ? ` data-properties="${comp.properties.replace(/"/g, '&quot;')}"` : ''
  const text = comp.text ? ` data-text="${comp.text}"` : ''
  return `
    <div class="component-palette-item" data-component="${comp.name}"${props}${text}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${comp.icon || USER_COMPONENT_ICON}
      </svg>
      <span>${comp.name}</span>
    </div>
  `
}

// Cleanup functions for palette drag handlers
let paletteDragCleanups = []

// Attach drag handlers to palette items (using DragDropSystem)
function attachPaletteDragHandlers(container) {
  // Cleanup previous handlers
  paletteDragCleanups.forEach(cleanup => cleanup())
  paletteDragCleanups = []

  if (!studio.dragDrop) return

  // Get all components for defaultSize lookup
  const allComponents = window.allPaletteComponents || []

  container.querySelectorAll('.component-palette-item').forEach(item => {
    const componentName = item.dataset.component
    const properties = item.dataset.properties || ''
    const textContent = item.dataset.text || ''

    // Find defaultSize from all palette components (includes Zag, primitives, layouts)
    const component = allComponents.find(c => c.name === componentName)
    const defaultSize = component?.defaultSize

    // Use DragDropSystem's makePaletteItemDraggable
    const cleanup = studio.dragDrop.makePaletteItemDraggable(item, componentName, {
      properties: properties || undefined,
      textContent: textContent || undefined,
      defaultSize: defaultSize,
    })
    paletteDragCleanups.push(cleanup)
  })
}

// Warm the ghost renderer cache with all palette items
function warmPaletteGhostCache() {
  const ghostRenderer = getGhostRenderer()

  // Convert palette items to ComponentItem format
  // IMPORTANT: IDs must match what DragRenderer.renderPaletteGhost() uses:
  // `palette-${componentName}-${properties || ''}-${textContent || ''}`
  const items = []

  // Create a lookup map for studio layout presets (for defaultSize and children)
  const studioPresetMap = new Map()
  for (const preset of STUDIO_LAYOUT_PRESETS) {
    studioPresetMap.set(preset.name, preset)
  }

  // Add layout presets (they use Box as template with layout properties)
  for (const preset of LAYOUT_PRESETS) {
    // Layout presets in the palette use the preset name as component name
    // but actually render as Box with layout properties
    const componentName = preset.name
    const properties = preset.properties || ''
    // Get additional data from studio presets (defaultSize, children)
    const studioPreset = studioPresetMap.get(preset.name)
    items.push({
      id: `palette-${componentName}-${properties}-`,
      name: preset.name,
      category: 'Layouts',
      template: componentName,
      properties: properties,
      children: studioPreset?.children,
      defaultSize: studioPreset?.defaultSize,
      icon: 'box',
    })
  }

  // Add primitive components
  for (const comp of PRIMITIVE_COMPONENTS) {
    const componentName = comp.name
    const properties = comp.properties || ''
    const textContent = comp.text || ''
    items.push({
      id: `palette-${componentName}-${properties}-${textContent}`,
      name: comp.name,
      category: 'Components',
      template: componentName,
      properties: properties,
      textContent: textContent,
      defaultSize: comp.defaultSize,
      icon: 'box',
    })
  }

  // Add Zag components
  const zagComponents = getZagComponents()
  for (const comp of zagComponents) {
    const componentName = comp.name
    const properties = comp.properties || ''
    items.push({
      id: `palette-${componentName}-${properties}-`,
      name: comp.name,
      category: comp.category,
      template: componentName,
      properties: properties,
      defaultSize: comp.defaultSize,
      icon: comp.icon || 'box',
    })
  }

  // Warm cache in background (low priority)
  const scheduleIdle = typeof requestIdleCallback !== 'undefined'
    ? requestIdleCallback
    : (cb) => setTimeout(cb, 100)

  scheduleIdle(() => {
    ghostRenderer.warmCache(items).then(() => {
      console.log('Studio: Ghost cache warmed for', items.length, 'components')
    }).catch(() => {
      // Ignore errors - fallback will be used
    })
  })
}

// Warm user component ghosts after files are parsed
// Called after updateComponentPalette when user components are detected
function warmUserComponentGhosts(userComponents) {
  if (!userComponents || userComponents.length === 0) return

  const ghostRenderer = getGhostRenderer()
  const items = userComponents.map(comp => ({
    id: `palette-${comp.name}--`,
    name: comp.name,
    category: 'User',
    template: comp.name,
    properties: '',
    // Use extracted size from component definition, or fallback to default
    defaultSize: comp.defaultSize || { width: 200, height: 60 },
    icon: USER_COMPONENT_ICON,
  }))

  // Schedule in background
  const scheduleIdle = typeof requestIdleCallback !== 'undefined'
    ? requestIdleCallback
    : (cb) => setTimeout(cb, 50)

  scheduleIdle(() => {
    ghostRenderer.warmCache(items).then(() => {
      console.log('Studio: User component ghosts warmed for', items.length, 'components')
    }).catch(() => {
      // Ignore errors - fallback will be used
    })
  })
}

// Initialize component palette
function initComponentPalette() {
  updateComponentPalette()
  warmPaletteGhostCache()  // Pre-render all components for instant ghost
  console.log('Studio: Component palette initialized with', PRIMITIVE_COMPONENTS.length, 'primitives')
}

// Global debug function for testing ghosts
// Usage: await window.testGhost('Button') or window.testGhost('V-Box')
window.testGhost = async function(componentName) {
  const { getGhostRenderer } = await import('./dist/index.js')
  const renderer = getGhostRenderer()

  // Find the component in presets or primitives
  const layoutPreset = STUDIO_LAYOUT_PRESETS.find(p => p.name === componentName)
  const primitive = PRIMITIVE_COMPONENTS.find(p => p.name === componentName)

  let item
  if (layoutPreset) {
    item = {
      id: `test-${componentName}`,
      name: layoutPreset.name,
      template: layoutPreset.name,
      properties: layoutPreset.properties || '',
      children: layoutPreset.children,
      defaultSize: layoutPreset.defaultSize,
      category: 'layouts',
      icon: 'box'
    }
  } else if (primitive) {
    item = {
      id: `test-${componentName}`,
      name: primitive.name,
      template: primitive.template,
      properties: primitive.properties || '',
      textContent: primitive.textContent || '',
      defaultSize: primitive.defaultSize,
      category: 'components',
      icon: 'box'
    }
  } else {
    return `Component "${componentName}" not found`
  }

  try {
    const result = await renderer.render(item)

    // Remove any previous test ghost
    const prev = document.getElementById('test-ghost-overlay')
    if (prev) prev.remove()

    // Create overlay
    const overlay = document.createElement('div')
    overlay.id = 'test-ghost-overlay'
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '99999',
      cursor: 'pointer'
    })
    overlay.onclick = () => overlay.remove()

    // Label
    const label = document.createElement('div')
    label.textContent = `${componentName}: ${result.size.width}x${result.size.height}px (click to close)`
    Object.assign(label.style, {
      color: 'white',
      fontSize: '16px',
      marginBottom: '20px',
      fontFamily: 'system-ui'
    })
    overlay.appendChild(label)

    // Ghost element with border
    result.element.style.border = '2px solid lime'
    result.element.style.boxShadow = '0 0 20px rgba(0,255,0,0.5)'
    overlay.appendChild(result.element)

    document.body.appendChild(overlay)

    return `Rendered ${componentName}: ${result.size.width}x${result.size.height}px`
  } catch (e) {
    return `Error: ${e.message}`
  }
}

// Update component palette with primitives + user components
function updateComponentPalette() {
  const container = document.getElementById('components-palette')
  if (!container) return

  // Collect user components from ALL files
  const userComponents = []
  for (const filename of Object.keys(files)) {
    const type = getFileType(filename)
    // Skip token files - they don't contain components
    if (type === 'tokens' || type === 'data') continue

    try {
      const content = files[filename]
      if (!content || !content.trim()) continue

      const ast = MirrorLang.parse(content)
      if (ast.components) {
        for (const comp of ast.components) {
          // Skip primitives
          if (PRIMITIVE_COMPONENTS.some(p => p.name === comp.name)) continue
          // Skip token definitions (names starting with $)
          if (comp.name.startsWith('$')) continue

          // Extract size from component properties if defined
          let defaultSize = null
          if (comp.properties) {
            const widthProp = comp.properties.find(p => p.name === 'w' || p.name === 'width')
            const heightProp = comp.properties.find(p => p.name === 'h' || p.name === 'height')
            if (widthProp || heightProp) {
              defaultSize = {
                width: widthProp?.value ? parseInt(widthProp.value, 10) || 200 : 200,
                height: heightProp?.value ? parseInt(heightProp.value, 10) || 60 : 60
              }
            }
          }

          userComponents.push({
            name: comp.name,
            category: 'User',
            sourceFile: filename,
            defaultSize: defaultSize
          })
        }
      }
    } catch (e) {
      // Skip files that fail to parse
      console.debug('Failed to parse', filename, 'for components:', e.message)
    }
  }

  // Remove duplicates (keep first occurrence)
  const uniqueUserComponents = []
  const seen = new Set()
  for (const comp of userComponents) {
    if (!seen.has(comp.name)) {
      seen.add(comp.name)
      uniqueUserComponents.push(comp)
    }
  }

  // Warm ghost cache for user components (async, low priority)
  warmUserComponentGhosts(uniqueUserComponents)

  // Get Zag components
  const zagComponents = getZagComponents()

  // Combine all components: layouts first, then primitives, then zag, then user (sorted)
  const componentsToSort = [
    ...PRIMITIVE_COMPONENTS,
    ...uniqueUserComponents
  ].sort((a, b) => a.name.localeCompare(b.name))

  const allComponents = [
    ...LAYOUT_PRESETS,  // Layouts stay at top, unsorted
    ...componentsToSort,
    ...zagComponents.sort((a, b) => a.name.localeCompare(b.name))
  ]

  // Store for filtering
  window.allPaletteComponents = allComponents

  // Render all components
  renderFilteredComponents(allComponents)
}

// Track collapsed sections
const collapsedSections = new Set()

// Render filtered components to the palette with collapsible sections
function renderFilteredComponents(components) {
  const container = document.getElementById('components-palette')
  if (!container) return

  // Create lookup map for components
  const compMap = new Map(components.map(c => [c.name, c]))

  // Tabs
  let html = '<div class="component-palette-tabs">'
  html += `<button class="palette-tab${activePaletteTab === 'basic' ? ' active' : ''}" data-tab="basic">Basic</button>`
  html += `<button class="palette-tab${activePaletteTab === 'all' ? ' active' : ''}" data-tab="all">All</button>`
  html += '</div>'

  if (activePaletteTab === 'basic') {
    // Basic tab: use predefined structure and order
    for (const group of BASIC_TAB_STRUCTURE) {
      const items = group.components
        .map(name => compMap.get(name))
        .filter(Boolean)
      if (items.length === 0) continue

      const isCollapsed = collapsedSections.has(group.category)
      html += `<div class="component-palette-section${isCollapsed ? ' collapsed' : ''}" data-category="${group.category}">`
      html += `<div class="component-palette-section-title" data-toggle="${group.category}">`
      html += `<span class="section-name">${group.category}</span>`
      html += `<span class="section-toggle">`
      html += `<svg class="icon icon-collapsed" viewBox="0 0 14 14"><polyline points="5 3 10 7 5 11" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>`
      html += `<svg class="icon icon-expanded" viewBox="0 0 14 14"><polyline points="3 5 7 10 11 5" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>`
      html += `</span>`
      html += '</div>'
      html += `<div class="component-palette-items"${isCollapsed ? ' style="display:none"' : ''}>`
      html += items.map(comp => renderPaletteItem(comp)).join('')
      html += '</div></div>'
    }
  } else {
    // All tab: group by category
    const byCategory = {}
    for (const comp of components) {
      const cat = comp.category || 'Other'
      if (!byCategory[cat]) byCategory[cat] = []
      byCategory[cat].push(comp)
    }

    // Sort categories by CATEGORY_ORDER
    const sortedCategories = Object.keys(byCategory).sort((a, b) => {
      const indexA = CATEGORY_ORDER.indexOf(a)
      const indexB = CATEGORY_ORDER.indexOf(b)
      const orderA = indexA === -1 ? 999 : indexA
      const orderB = indexB === -1 ? 999 : indexB
      return orderA - orderB
    })

    for (const category of sortedCategories) {
      const items = byCategory[category]
      if (items.length === 0) continue

      const displayName = category === 'layout' ? 'Layouts' : category
      const isCollapsed = collapsedSections.has(category)

      html += `<div class="component-palette-section${isCollapsed ? ' collapsed' : ''}" data-category="${category}">`
      html += `<div class="component-palette-section-title" data-toggle="${category}">`
      html += `<span class="section-name">${displayName}</span>`
      html += `<span class="section-toggle">`
      html += `<svg class="icon icon-collapsed" viewBox="0 0 14 14"><polyline points="5 3 10 7 5 11" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>`
      html += `<svg class="icon icon-expanded" viewBox="0 0 14 14"><polyline points="3 5 7 10 11 5" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>`
      html += `</span>`
      html += '</div>'
      html += `<div class="component-palette-items"${isCollapsed ? ' style="display:none"' : ''}>`
      html += items.map(comp => renderPaletteItem(comp)).join('')
      html += '</div></div>'
    }
  }

  container.innerHTML = html
  attachPaletteDragHandlers(container)
  attachSectionToggleHandlers(container)
  attachPaletteTabHandlers(container)
}

// Attach click handlers for palette tabs
function attachPaletteTabHandlers(container) {
  container.querySelectorAll('.palette-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activePaletteTab = tab.dataset.tab
      renderFilteredComponents(window.allPaletteComponents || [])
    })
  })
}

// Attach click handlers for section toggles
function attachSectionToggleHandlers(container) {
  container.querySelectorAll('.component-palette-section-title').forEach(title => {
    title.addEventListener('click', () => {
      const category = title.dataset.toggle
      const section = title.closest('.component-palette-section')
      const items = section.querySelector('.component-palette-items')

      if (collapsedSections.has(category)) {
        collapsedSections.delete(category)
        section.classList.remove('collapsed')
        items.style.display = ''
      } else {
        collapsedSections.add(category)
        section.classList.add('collapsed')
        items.style.display = 'none'
      }
    })
  })
}

// Filter components by search query
function filterComponents(query) {
  const allComponents = window.allPaletteComponents || []
  if (!query.trim()) {
    renderFilteredComponents(allComponents)
    return
  }

  const lowerQuery = query.toLowerCase()
  const filtered = allComponents.filter(comp =>
    comp.name.toLowerCase().includes(lowerQuery)
  )
  renderFilteredComponents(filtered)
}

// Initialize component search
function initComponentSearch() {
  const searchInput = document.getElementById('component-search')
  if (!searchInput) return

  searchInput.addEventListener('input', (e) => {
    filterComponents(e.target.value)
  })
}

// Alias for backwards compatibility
function updateUserComponentsPalette() {
  updateComponentPalette()
}

// Initialize studio
initStudio()
initComponentSearch()

// Initial compile
compile(initialCode)

// ==========================================
// File Management Integration
// Works in both Tauri (real files) and Browser (demo files)
// ==========================================
if (!isPlaygroundMode) {
  import('./dist/index.js').then(module => {
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
            insert: content
          },
          annotations: [fileSwitchAnnotation.of(true)]
        })
        editor.dispatch(transaction)
        // Recompile
        compile(content)
      },
      onFileChange: (filePath, content) => {
        console.log('[DesktopFiles] File changed:', filePath)
      }
    })
    console.log('[App] File management initialized')

  }).catch(err => {
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
    await window.TauriBridge.menu.onMenuClick(async (menuId) => {
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
            await alert('Bitte zuerst einen Ordner öffnen (File → Open Folder oder ⌘O)', { title: 'Kein Projekt' })
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
            await alert('Bitte zuerst einen Ordner öffnen (File → Open Folder oder ⌘O)', { title: 'Kein Projekt' })
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

      // Zoom controls
      case 'zoom_in':
        document.getElementById('zoom-in')?.click()
        break
      case 'zoom_out':
        document.getElementById('zoom-out')?.click()
        break
      case 'zoom_reset':
        document.getElementById('zoom-reset')?.click()
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
window.studio = studio  // New architecture
window.resetCode = async () => {
  // No longer supported - all content comes from server
  console.log('[App] resetCode is deprecated - content managed by server')
}

// ==========================================
// Resizable Editor/Preview Divider
// ==========================================
;(function initPanelResizer() {
  const editorPanel = document.querySelector('.editor-panel')
  const editorDivider = document.getElementById('editor-divider')
  const previewPanel = document.querySelector('.preview-panel')

  if (!editorPanel || !editorDivider || !previewPanel) {
    console.warn('[PanelResizer] Missing elements')
    return
  }

  const MIN_PANEL = 200
  let isDragging = false
  let startX = 0
  let startEditorWidth = 0
  let startPreviewWidth = 0

  editorDivider.addEventListener('mousedown', (e) => {
    isDragging = true
    startX = e.clientX
    startEditorWidth = editorPanel.offsetWidth
    startPreviewWidth = previewPanel.offsetWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    editorDivider.classList.add('dragging')
    e.preventDefault()
  })

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return
    const deltaX = e.clientX - startX
    const newEditorWidth = Math.max(MIN_PANEL, startEditorWidth + deltaX)
    const newPreviewWidth = Math.max(MIN_PANEL, startPreviewWidth - deltaX)
    if (newEditorWidth >= MIN_PANEL && newPreviewWidth >= MIN_PANEL) {
      editorPanel.style.width = `${newEditorWidth}px`
      previewPanel.style.width = `${newPreviewWidth}px`
    }
  })

  document.addEventListener('mouseup', () => {
    if (!isDragging) return
    isDragging = false
    editorDivider.classList.remove('dragging')
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  })

  console.log('[PanelResizer] Editor/Preview divider ready')
})()

// ==========================================
// Settings (Desktop: removed UI, using Claude CLI instead of API keys)
// ==========================================

// Settings are no longer needed in desktop app
// - No API keys required (Claude CLI handles auth)
// - No imgbb upload (images stored locally)

function loadSettings() {
  return {} // No settings needed for desktop
}

function saveSettings(settings) {
  // No-op for desktop
}

function getImgbbKey() {
  return '' // Disabled in desktop
}

function getOpenrouterKey() {
  return '' // Not used - Claude CLI handles AI
}

// ==========================================
// Image Upload Feature
// ==========================================

const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload'
const SUPPORTED_IMAGE_FORMATS = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 32 * 1024 * 1024 // 32 MB

const uploadIndicator = document.getElementById('upload-indicator')
const dropOverlay = document.getElementById('drop-overlay')
const editorPanel = document.querySelector('.editor-panel')

// Upload to imgbb
async function uploadToImgbb(file) {
  // Check for API key
  const apiKey = getImgbbKey()
  if (!apiKey) {
    throw new Error('Kein imgbb API Key. Bitte in Einstellungen hinterlegen.')
  }

  // Validate format
  if (!SUPPORTED_IMAGE_FORMATS.includes(file.type)) {
    throw new Error(`Format nicht unterstützt: ${file.type.split('/')[1].toUpperCase()}. Erlaubt: PNG, JPG, GIF, WebP`)
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1)
    throw new Error(`Datei zu groß: ${sizeMB} MB (Maximum: 32 MB)`)
  }

  // Create form data
  const formData = new FormData()
  formData.append('image', file)

  // Upload
  const response = await fetch(`${IMGBB_UPLOAD_URL}?key=${apiKey}`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    throw new Error(`Upload fehlgeschlagen (${response.status})`)
  }

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error?.message || 'Upload fehlgeschlagen')
  }

  return data.data.url
}

// Insert URL at cursor position
function insertImageUrl(url) {
  if (!window.editor) return

  const state = window.editor.state
  const pos = state.selection.main.head
  const line = state.doc.lineAt(pos)
  const textBefore = line.text.slice(0, pos - line.from)

  // Check if already inside a string (odd number of quotes before cursor)
  const quoteCount = (textBefore.match(/"/g) || []).length
  const inString = quoteCount % 2 === 1

  let insertText
  if (inString) {
    insertText = url
  } else {
    insertText = `"${url}"`
  }

  window.editor.dispatch({
    changes: { from: pos, to: pos, insert: insertText },
    selection: { anchor: pos + insertText.length },
    annotations: Transaction.userEvent.of('input.image')
  })

  window.editor.focus()
}

// Handle image upload
async function handleImageUpload(file) {
  try {
    uploadIndicator.classList.add('visible')

    const url = await uploadToImgbb(file)
    insertImageUrl(url)

  } catch (error) {
    showUploadError(error.message)
  } finally {
    uploadIndicator.classList.remove('visible')
  }
}

// Show error toast
function showUploadError(message) {
  const toast = document.createElement('div')
  toast.className = 'upload-error'
  toast.textContent = message
  document.body.appendChild(toast)

  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateY(10px)'
    toast.style.transition = 'all 0.2s ease-out'
    setTimeout(() => toast.remove(), 200)
  }, 4000)
}

// Check if data transfer has image files
function hasImageFile(dataTransfer) {
  if (!dataTransfer || !dataTransfer.types.includes('Files')) return false

  for (const item of dataTransfer.items) {
    if (item.kind === 'file' && SUPPORTED_IMAGE_FORMATS.includes(item.type)) {
      return true
    }
  }
  return false
}

// Get image files from data transfer
function getImageFiles(dataTransfer) {
  const files = []
  if (!dataTransfer || !dataTransfer.files) return files

  for (const file of dataTransfer.files) {
    if (SUPPORTED_IMAGE_FORMATS.includes(file.type)) {
      files.push(file)
    }
  }
  return files
}

// Drag & Drop handlers
let dragCounter = 0

editorPanel.addEventListener('dragenter', (e) => {
  if (hasImageFile(e.dataTransfer)) {
    e.preventDefault()
    dragCounter++
    dropOverlay.classList.add('visible')
  }
})

editorPanel.addEventListener('dragover', (e) => {
  if (hasImageFile(e.dataTransfer)) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }
})

editorPanel.addEventListener('dragleave', (e) => {
  dragCounter--
  if (dragCounter === 0) {
    dropOverlay.classList.remove('visible')
  }
})

editorPanel.addEventListener('drop', async (e) => {
  dragCounter = 0
  dropOverlay.classList.remove('visible')

  // Component drops are handled by EditorDropHandler (see bootstrap.ts)
  // Skip this handler for component drops
  if (e.dataTransfer.types.includes('application/mirror-component')) {
    return
  }

  const files = getImageFiles(e.dataTransfer)
  if (files.length === 0) return

  e.preventDefault()

  // Set cursor at drop position if possible
  if (window.editor) {
    const cmEditor = document.querySelector('.cm-editor')
    if (cmEditor) {
      const pos = window.editor.posAtCoords({ x: e.clientX, y: e.clientY })
      if (pos !== null) {
        window.editor.dispatch({ selection: { anchor: pos } })
      }
    }
  }

  // Upload all images
  for (const file of files) {
    await handleImageUpload(file)
  }
})

// Paste handler
document.addEventListener('paste', async (e) => {
  // Only handle if editor is focused
  if (!document.activeElement.closest('.cm-editor')) return

  const files = getImageFiles(e.clipboardData)
  if (files.length === 0) return

  e.preventDefault()

  for (const file of files) {
    await handleImageUpload(file)
  }
})

// =========================================================================
// LLM CODE GENERATION
// =========================================================================

function getApiKey() {
  return getOpenrouterKey()
}

async function promptForApiKey() {
  const key = await prompt(
    'Hol dir einen Key bei https://openrouter.ai/keys\n\nDer Key wird in den Einstellungen gespeichert.',
    { title: 'OpenRouter API Key eingeben', placeholder: 'sk-or-...' }
  )
  if (key && key.trim()) {
    const settings = loadSettings()
    settings.openrouterKey = key.trim()
    saveSettings(settings)
    return key.trim()
  }
  return null
}

// ==========================================================================
// LLM Integration - React to Mirror Workflow
// ==========================================================================

// React-to-Mirror Converter (inline version for browser)
const STYLE_TO_MIRROR = {
  'padding': 'pad',
  'paddingTop': 'pad top',
  'paddingBottom': 'pad bottom',
  'paddingLeft': 'pad left',
  'paddingRight': 'pad right',
  'margin': 'm',
  'backgroundColor': 'bg',
  'background': 'bg',
  'color': 'col',
  'borderRadius': 'rad',
  'width': 'w',
  'height': 'h',
  'minWidth': 'minw',
  'maxWidth': 'maxw',
  'minHeight': 'minh',
  'maxHeight': 'maxh',
  'gap': 'gap',
  'fontSize': 'font-size',
  'fontWeight': 'weight',
  'fontFamily': 'font',
  'textAlign': 'text-align',
  'display': '_display',
  'flexDirection': '_flexDirection',
  'alignItems': '_alignItems',
  'justifyContent': '_justifyContent',
  'cursor': 'cursor',
  'opacity': 'opacity',
  'border': 'bor',
  'borderColor': 'boc',
  'boxShadow': 'shadow',
}

const TAG_TO_COMPONENT = {
  'div': 'frame', 'span': 'text', 'button': 'button', 'input': 'input',
  'textarea': 'textarea', 'img': 'image', 'a': 'link', 'nav': 'frame',
  'header': 'frame', 'footer': 'frame', 'main': 'frame', 'section': 'frame',
  'article': 'frame', 'aside': 'frame', 'h1': 'text', 'h2': 'text',
  'h3': 'text', 'h4': 'text', 'p': 'text', 'label': 'text', 'select': 'frame',
}

const TAG_TO_NAME = {
  'div': 'Box', 'span': 'Text', 'button': 'Button', 'input': 'Input',
  'nav': 'Nav', 'header': 'Header', 'footer': 'Footer', 'main': 'Main',
  'section': 'Section', 'h1': 'Heading', 'h2': 'Heading', 'h3': 'Heading',
  'p': 'Text', 'a': 'Link', 'img': 'Image', 'select': 'Select', 'option': 'Option',
}

function convertReactToMirror(reactCode) {
  const componentDefinitions = new Map()

  function parseStyleObject(styleStr) {
    const style = {}
    const pairs = styleStr.split(',').map(s => s.trim()).filter(Boolean)
    for (const pair of pairs) {
      const colonIndex = pair.indexOf(':')
      if (colonIndex === -1) continue
      let key = pair.slice(0, colonIndex).trim().replace(/['\"]/g, '')
      let value = pair.slice(colonIndex + 1).trim().replace(/['\"]/g, '').replace(/,\s*$/, '')
      style[key] = value
    }
    return style
  }

  function styleToMirrorProps(style) {
    const props = []
    let layout = 'ver'

    for (const [key, value] of Object.entries(style)) {
      const mirrorKey = STYLE_TO_MIRROR[key]
      if (!mirrorKey) continue

      if (mirrorKey === '_display' && value === 'flex') continue
      if (mirrorKey === '_flexDirection') {
        layout = value === 'row' ? 'hor' : 'ver'
        continue
      }
      if (mirrorKey === '_alignItems') {
        const map = { 'center': 'ver-center', 'flex-start': 'top', 'flex-end': 'bottom' }
        if (map[value]) props.push(map[value])
        continue
      }
      if (mirrorKey === '_justifyContent') {
        const map = { 'center': 'hor-center', 'space-between': 'spread', 'flex-start': 'left', 'flex-end': 'right' }
        if (map[value]) props.push(map[value])
        continue
      }

      let mirrorValue = String(value).replace(/px/g, '').trim()
      if (mirrorValue.startsWith('var(--')) {
        const tokenName = mirrorValue.match(/var\(--([^\)]+)\)/)?.[1]
        mirrorValue = tokenName ? `$${tokenName}` : mirrorValue
      }

      props.push(`${mirrorKey} ${mirrorValue}`)
    }

    if (layout === 'hor') props.unshift('hor')
    return props
  }

  function findMatchingBrace(str, openPos) {
    if (str[openPos] !== '{') return -1
    let depth = 1, pos = openPos + 1
    while (pos < str.length && depth > 0) {
      const char = str[pos]
      if (char === '{') depth++
      else if (char === '}') depth--
      if (char === '"' || char === "'" || char === '`') {
        const quote = char
        pos++
        while (pos < str.length && str[pos] !== quote) {
          if (str[pos] === '\\') pos++
          pos++
        }
      }
      pos++
    }
    return depth === 0 ? pos - 1 : -1
  }

  function extractReturnJSX(code) {
    const returnIndex = code.indexOf('return')
    if (returnIndex === -1) return code
    let pos = returnIndex + 6
    while (pos < code.length && code[pos] !== '(' && code[pos] !== '<') pos++
    if (code[pos] === '<') {
      const jsxStart = pos
      const tag = code.slice(pos).match(/^<(\w+)/)?.[1]
      if (tag) {
        const closeTag = `</${tag}>`
        const closeIndex = code.lastIndexOf(closeTag)
        if (closeIndex > jsxStart) return code.slice(jsxStart, closeIndex + closeTag.length).trim()
      }
      return code.slice(pos).trim()
    }
    if (code[pos] !== '(') return code
    const openParen = pos
    let depth = 1
    pos++
    while (pos < code.length && depth > 0) {
      const char = code[pos]
      if (char === '"' || char === "'" || char === '`') {
        const quote = char
        pos++
        while (pos < code.length && code[pos] !== quote) {
          if (code[pos] === '\\') pos++
          pos++
        }
      } else if (char === '(') depth++
      else if (char === ')') depth--
      pos++
    }
    return code.slice(openParen + 1, pos - 1).trim()
  }

  function parseJSXElement(jsx) {
    if (!jsx || !jsx.startsWith('<')) return null
    const openTagMatch = jsx.match(/^<(\w+)([^>]*?)(?:\/>|>)/)
    if (!openTagMatch) return null

    const tag = openTagMatch[1].toLowerCase()
    const propsStr = openTagMatch[2]
    const isSelfClosing = jsx.includes('/>')

    // Parse style
    let style = null
    const styleMatch = propsStr.match(/style=\{\{([^}]+)\}\}/)
    if (styleMatch) style = parseStyleObject(styleMatch[1])

    const element = { tag, style, children: [] }

    if (!isSelfClosing) {
      const childrenMatch = jsx.match(new RegExp(`<${openTagMatch[1]}[^>]*>([\\s\\S]*)<\\/${openTagMatch[1]}>`, 'i'))
      if (childrenMatch) {
        element.children = parseChildren(childrenMatch[1])
      }
    }

    return element
  }

  function parseChildren(content) {
    const children = []
    const trimmed = content.trim()
    if (!trimmed) return children

    if (!trimmed.includes('<')) {
      if (trimmed && !trimmed.startsWith('{')) children.push(trimmed)
      return children
    }

    let pos = 0, textStart = 0
    while (pos < trimmed.length) {
      if (trimmed[pos] === '{') {
        const exprEnd = findMatchingBrace(trimmed, pos)
        if (exprEnd > pos) { pos = exprEnd + 1; textStart = pos; continue }
      }

      const openTagStart = trimmed.indexOf('<', pos)
      if (openTagStart === -1) {
        const text = trimmed.slice(textStart).trim()
        if (text && !text.startsWith('{') && !text.startsWith('</')) children.push(text)
        break
      }

      const braceBeforeTag = trimmed.lastIndexOf('{', openTagStart)
      if (braceBeforeTag >= textStart) {
        const braceEnd = findMatchingBrace(trimmed, braceBeforeTag)
        if (braceEnd > openTagStart) { pos = braceEnd + 1; textStart = pos; continue }
      }

      if (trimmed[openTagStart + 1] === '/') {
        pos = trimmed.indexOf('>', openTagStart) + 1
        textStart = pos
        continue
      }

      if (openTagStart > textStart) {
        const text = trimmed.slice(textStart, openTagStart).trim()
        if (text && !text.startsWith('{') && !text.startsWith('</')) children.push(text)
      }

      const tagNameMatch = trimmed.slice(openTagStart).match(/^<(\w+)/)
      if (!tagNameMatch) { pos = openTagStart + 1; continue }

      const tagName = tagNameMatch[1]
      const selfCloseMatch = trimmed.slice(openTagStart).match(new RegExp(`^<${tagName}[^>]*/>`))
      if (selfCloseMatch) {
        const element = parseJSXElement(selfCloseMatch[0])
        if (element) children.push(element)
        pos = openTagStart + selfCloseMatch[0].length
        textStart = pos
        continue
      }

      const closeTag = `</${tagName}>`
      let depth = 1, searchPos = openTagStart + 1
      while (depth > 0 && searchPos < trimmed.length) {
        if (trimmed[searchPos] === '{') {
          const exprEnd = findMatchingBrace(trimmed, searchPos)
          if (exprEnd > searchPos) { searchPos = exprEnd + 1; continue }
        }
        const nextClose = trimmed.indexOf(closeTag, searchPos)
        if (nextClose === -1) { depth = 0; break }
        const nextOpenSearch = trimmed.slice(searchPos).search(new RegExp(`<${tagName}(?:\\s|>|/>)`))
        if (nextOpenSearch !== -1 && searchPos + nextOpenSearch < nextClose) {
          const checkPos = searchPos + nextOpenSearch
          if (!trimmed.slice(checkPos).match(new RegExp(`^<${tagName}[^>]*/>`))) depth++
          searchPos = checkPos + 1
        } else {
          depth--
          if (depth === 0) {
            const fullElement = trimmed.slice(openTagStart, nextClose + closeTag.length)
            const element = parseJSXElement(fullElement)
            if (element) children.push(element)
            pos = nextClose + closeTag.length
            textStart = pos
          } else {
            searchPos = nextClose + closeTag.length
          }
        }
      }
      if (depth !== 0) pos = openTagStart + 1
    }
    return children
  }

  function generateElement(element, depth) {
    const indent = '  '.repeat(depth)
    const name = TAG_TO_NAME[element.tag] || element.tag.charAt(0).toUpperCase() + element.tag.slice(1)
    const parts = [name]

    if (element.style) {
      const props = styleToMirrorProps(element.style)
      if (depth > 0 || !componentDefinitions.has(name)) {
        if (props.length > 0) parts.push(props.join(', '))
      }
    }

    const textChildren = element.children.filter(c => typeof c === 'string')
    if (textChildren.length > 0) {
      const text = textChildren.join(' ').trim()
      if (text && !text.startsWith('{')) parts.push(`"${text}"`)
    }

    let line = indent + parts.join(' ')
    const elementChildren = element.children.filter(c => typeof c !== 'string')
    if (elementChildren.length > 0) {
      const childLines = elementChildren.map(child => generateElement(child, depth + 1))
      line += '\n' + childLines.join('\n')
    }
    return line
  }

  function collectComponentDefinitions(element) {
    const name = TAG_TO_NAME[element.tag] || element.tag.charAt(0).toUpperCase() + element.tag.slice(1)
    if (!componentDefinitions.has(name) && element.style) {
      const baseTag = TAG_TO_COMPONENT[element.tag] || 'frame'
      const props = styleToMirrorProps(element.style)
      if (props.length > 0) {
        componentDefinitions.set(name, `${name} as ${baseTag}:\n  ${props.join(', ')}`)
      }
    }
    for (const child of element.children) {
      if (typeof child !== 'string') collectComponentDefinitions(child)
    }
  }

  try {
    const jsx = extractReturnJSX(reactCode)
    const rootElement = parseJSXElement(jsx.trim())
    if (!rootElement) return { mirror: '', errors: ['Failed to parse JSX'] }

    componentDefinitions.clear()
    collectComponentDefinitions(rootElement)

    const lines = []
    for (const [name, def] of componentDefinitions) {
      lines.push(def)
      lines.push('')
    }
    lines.push(generateElement(rootElement, 0))

    return { mirror: lines.join('\n').trim(), errors: [] }
  } catch (error) {
    return { mirror: '', errors: [error.message] }
  }
}

// Build React generation system prompt
function buildReactSystemPrompt(context) {
  let prompt = `You are a UI developer. Generate React/JSX code for the requested UI.

IMPORTANT RULES:
1. Return ONLY JSX code inside a functional component
2. Use inline styles with camelCase properties
3. Use semantic HTML elements (div, button, span, nav, header, etc.)
4. Keep the code clean and minimal
5. Do NOT include imports or exports
6. Do NOT include explanations - just the code

EXAMPLE OUTPUT:
\`\`\`jsx
function Component() {
  return (
<div style={{ padding: '16px', backgroundColor: '#1A1A23', borderRadius: '8px' }}>
  <span style={{ color: '#E4E4E7' }}>Hello World</span>
</div>
  )
}
\`\`\`

STYLE GUIDELINES:
- Use hex colors (e.g., '#5BA8F5')
- Use pixel values for spacing (e.g., '16px', '12px 24px')
- Common properties: padding, backgroundColor, color, borderRadius, display, flexDirection, gap, alignItems, justifyContent`

  // Add tokens as CSS variables
  if (context.tokens.length > 0) {
    prompt += '\n\nAVAILABLE DESIGN TOKENS (use as CSS variables):\n'
    for (const token of context.tokens.slice(0, 20)) {
      prompt += `- var(--${token.name}): ${token.value}\n`
    }
  }

  // Add existing components for style consistency
  if (context.components.length > 0) {
    prompt += '\n\nEXISTING COMPONENTS (for style consistency):\n'
    for (const comp of context.components.slice(0, 10)) {
      prompt += `- ${comp.name}: ${comp.properties.slice(0, 5).join(', ')}\n`
    }
  }

  // Add editor context
  if (context.editor) {
    const ctx = context.editor
    if (ctx.selectedNodeName) {
      prompt += `\n\nEDITOR CONTEXT:\nSelected element: "${ctx.selectedNodeName}"`
      if (ctx.ancestors && ctx.ancestors.length > 0) {
        prompt += `\nLocation: ${ctx.ancestors.join(' → ')} → ${ctx.selectedNodeName}`
      }
    }
    if (ctx.insideComponent) {
      prompt += `\nCursor is inside: "${ctx.insideComponent}"`
    }
    if (ctx.surroundingCode) {
      prompt += `\n\nSurrounding code context:\n${ctx.surroundingCode.before}\n--- CURSOR ---\n${ctx.surroundingCode.after}`
    }
    prompt += `\n\nIMPORTANT: When user says "here", "this", "add X", they refer to the current position/selection.`
  }

  return prompt
}
