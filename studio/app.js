import { EditorState, RangeSetBuilder, Prec, Annotation, Transaction } from '@codemirror/state'
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
  // Full Color Picker (Clean Code module)
  createFullColorPicker,
  // Icon Picker (for property panel integration)
  getGlobalIconPicker,
  setGlobalIconPickerCallback,
} from './dist/index.js?v=138'

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

  // Dispatch with fileSwitchAnnotation to bypass the App lock filter
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: files[filename] || '' },
    annotations: fileSwitchAnnotation.of(true),
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
// Color Picker (Clean Code Module - FullColorPicker)
// =============================================================================

// State for editor integration (kept here, not in module)
let colorPickerVisible = false
let colorPickerInsertPos = null
let colorPickerReplaceRange = null
let colorPickerProperty = null
let colorPickerCallback = null
let hashTriggerActive = false
let hashTriggerStartPos = null

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

// Initialize FullColorPicker with callbacks
const fullColorPicker = createFullColorPicker({
  onSelect: hex => selectColor(hex),
  onPreview: hex => {
    // Preview callback - update preview display
  },
  onClose: () => {
    colorPickerVisible = false
  },
})

// Render the color picker into the container (generates HTML)
fullColorPicker.render('color-picker')

// DOM element references (from generated HTML)
const colorPicker = document.getElementById('color-picker')
const colorPickerTokenGrid = document.getElementById('color-picker-token-grid')
const colorPreview = document.getElementById('color-preview')
const colorHex = document.getElementById('color-hex')

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

      btn.addEventListener('click', e => {
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

function showColorPicker(
  x,
  y,
  insertPos,
  replaceRange = null,
  initialColor = null,
  isHashTrigger = false,
  hashStartPos = null,
  property = null,
  callback = null
) {
  // Store editor integration state
  colorPickerInsertPos = insertPos
  colorPickerReplaceRange = replaceRange
  hashTriggerActive = isHashTrigger
  hashTriggerStartPos = hashStartPos
  colorPickerProperty = property
  colorPickerCallback = callback || null

  // Smart positioning
  const pickerHeight = 400
  const pickerWidth = 260
  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth
  const margin = 8

  let finalX = x
  let finalY = y

  if (y + pickerHeight > viewportHeight - margin) {
    finalY = Math.max(margin, y - pickerHeight - 36)
  }
  if (x + pickerWidth > viewportWidth - margin) {
    finalX = Math.max(margin, x - pickerWidth - 8)
  }

  // Show color picker using FullColorPicker module
  const displayColor = initialColor || '#5BA8F5'
  fullColorPicker.setColor(displayColor)
  fullColorPicker.show(finalX, finalY, displayColor)
  colorPickerVisible = true

  // Build token colors for this property
  buildTokenColors(property)

  // Focus hex input for callback mode
  if (callback) {
    const hexInput = document.getElementById('color-picker-hex-input')
    if (hexInput) {
      setTimeout(() => {
        hexInput.focus()
        hexInput.select()
      }, 50)
    }
  }
}

function hideColorPicker() {
  fullColorPicker.hide()
  colorPickerVisible = false
  colorPickerInsertPos = null
  colorPickerReplaceRange = null
  colorPickerCallback = null
  hashTriggerActive = false
  hashTriggerStartPos = null
}

// Navigate through swatches (delegates to FullColorPicker)
function navigateSwatches(direction) {
  fullColorPicker.navigate(direction)
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
    console.warn(
      `[ColorPicker] ${context}: Position ${pos} out of bounds [0, ${docLength}], clamping`
    )
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
        console.warn(
          `[ColorPicker] Hash trigger: Expected # at position ${safeFrom}, found '${charAtFrom}'. Inserting at cursor instead.`
        )
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
        console.warn(
          `[ColorPicker] Replace mode: Invalid range size ${rangeSize} (${safeFrom}-${safeTo}). Using cursor position.`
        )
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
        console.warn(
          `[ColorPicker] Insert mode: Position drifted ${drift} chars from cursor (${safePos} vs ${cursorPos}). Using cursor.`
        )
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
    annotations: Transaction.userEvent.of('input.color'),
  })
}

// Color picker keyboard handling
// Use capturing phase to intercept events before CodeMirror
document.addEventListener(
  'keydown',
  e => {
    if (!colorPickerVisible) return

    // Escape: close picker
    if (e.key === 'Escape' && !hashTriggerActive) {
      e.preventDefault()
      e.stopPropagation()
      hideColorPicker()
      if (window.editor) window.editor.focus()
      return
    }

    // Enter: select current color from FullColorPicker
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      const colorToSelect = fullColorPicker.getColor()
      if (colorToSelect) {
        selectColor(colorToSelect.toUpperCase())
      }
      return
    }

    // Arrow keys: navigate swatches
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault()
      e.stopPropagation()
      const direction = e.key.replace('Arrow', '').toLowerCase()
      navigateSwatches(direction)
      return
    }
  },
  true
) // Use capturing phase

document.addEventListener('mousedown', e => {
  if (colorPickerVisible && !colorPicker.contains(e.target)) {
    hideColorPicker()
  }
})

// Global API for property panel to use color picker
window.showColorPickerForProperty = function (x, y, property, currentValue, callback) {
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
    fullMatch: match[0], // "$surface: #333"
    replacement: `$${tokenName}`, // "$surface"
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
    if (!match) return false // No match → normal Enter behavior

    // Add token to tokens file
    addTokenToFile(match.tokenName, match.tokenValue)

    // Replace the inline definition with just the reference
    const newLineText = lineText.replace(match.fullMatch, match.replacement)
    view.dispatch({
      changes: { from: line.from, to: line.to, insert: newLineText + '\n' },
      selection: { anchor: line.from + newLineText.length + 1 },
    })

    // Show feedback
    showTokenCreatedFeedback(match.tokenName)

    event.preventDefault()
    return true
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
        text: window.editor.state.sliceDoc(from, to),
      }
    },
    getFileContent: filename => files[filename] || null,
    saveFile: async (filename, content) => {
      files[filename] = content
      if (filename === currentFile) {
        window.editor?.dispatch({
          changes: { from: 0, to: window.editor.state.doc.length, insert: content },
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
    updateEditor: content => {
      window.editor?.dispatch({
        changes: { from: 0, to: window.editor.state.doc.length, insert: content },
      })
    },
    refreshFileTree: () => {
      if (window.DesktopFiles?.renderFileTree) {
        window.DesktopFiles.renderFileTree()
      }
    },
    switchToFile: filename => {
      if (window.DesktopFiles?.selectFile) {
        window.DesktopFiles.selectFile(filename)
      }
    },
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
  onCancel: () => console.log('[InlinePrompt] Cancelled'),
}

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

// Initialize modular color picker API for property panel

const editor = new EditorView({
  state: EditorState.create({
    doc: initialCode,
    extensions: [
      indentUnit.of('  '), // 2 spaces for Mirror DSL
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
      keymap.of([...completionKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
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
                console.debug(
                  `[ColorPicker] Insert pos tracked: ${oldPos} → ${colorPickerInsertPos}`
                )
              }
            }
            if (colorPickerReplaceRange) {
              const oldFrom = colorPickerReplaceRange.from
              const oldTo = colorPickerReplaceRange.to
              colorPickerReplaceRange = {
                from: update.changes.mapPos(colorPickerReplaceRange.from),
                to: update.changes.mapPos(colorPickerReplaceRange.to),
              }
              if (
                oldFrom !== colorPickerReplaceRange.from ||
                oldTo !== colorPickerReplaceRange.to
              ) {
                console.debug(
                  `[ColorPicker] Replace range tracked: [${oldFrom}, ${oldTo}] → [${colorPickerReplaceRange.from}, ${colorPickerReplaceRange.to}]`
                )
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
            offset: newPos,
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

// Drop globals builder for Clean Code drop service
function getZoomScale() {
  const zoomLevel = ZOOM_LEVELS[currentZoomIndex] ?? 100
  return zoomLevel / 100
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
    updateFileList,
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
    getZoomScale,
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
    // In test mode, skip prelude processing to keep preludeOffset at 0
    if (testModeActive) {
      console.log('[Test] Test mode active - skipping prelude, using code directly')
      resolvedCode = code
      // Don't reset currentPreludeOffset - keep it at 0 as set by __compileTestCode
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

    // Update state with resolved source and prelude offsets for Commands
    // - preludeOffset: CHARACTER count (for change position adjustment)
    // - preludeLineOffset: LINE count (for selection resolution)
    // In test mode, skip prelude offset updates to preserve test-set values
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
      })
    } else if (studio?.state) {
      // In test mode, only update resolvedSource (which is just the code itself)
      currentPreludeLineOffset = 0
      studio.state.set({ resolvedSource: resolvedCode })
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
  let tokensSource = ''
  for (const filename of Object.keys(files)) {
    const type = getFileType(filename)
    if (type === 'tokens' || type === 'data') {
      tokensSource += files[filename] + '\n'
    }
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
  }
  window.__getPreludeOffset = () => currentPreludeOffset
  window.__isTestMode = () => testModeActive
  window.__exitTestMode = () => {
    console.log('[Test] Exiting test mode')
    testModeActive = false
  }

  /**
   * Test Mode: Compile code directly without prelude
   * This ensures sourceMap positions match the actual editor content
   */
  window.__compileTestCode = code => {
    console.log('[Test] Compiling test code without prelude, length:', code.length)
    // Enable test mode to prevent normal compile from overwriting preludeOffset
    testModeActive = true
    // Cancel any pending compile
    if (debouncedCompile?.cancel) {
      debouncedCompile.cancel()
    }
    // Set prelude offset to 0 BEFORE compile
    currentPreludeOffset = 0
    currentPreludeLineOffset = 0
    resolvedSource = code
    isWrappedWithApp = false
    if (studio?.state?.set) {
      studio.state.set({ preludeOffset: 0, preludeLineOffset: 0, resolvedSource: code })
    }

    // Update files object so getAllProjectSource() returns the test code
    // This is necessary for PropertyPanel token extraction to work in tests
    if (currentFile && files) {
      files[currentFile] = code
    }

    try {
      // Parse
      const ast = MirrorLang.parse(code)
      if (ast.errors && ast.errors.length > 0) {
        const errorMsg = ast.errors.map(e => `Line ${e.line}: ${e.message}`).join('\n')
        throw new Error(errorMsg)
      }

      // Build IR with sourceMap
      const irResult = MirrorLang.toIR(ast, true)
      const sourceMap = irResult.sourceMap

      // Generate DOM code
      const jsCode = MirrorLang.generateDOM(ast)

      // Update codeModifier with the new source and sourceMap
      if (studioCodeModifier) {
        studioCodeModifier.updateSource(code)
        studioCodeModifier.updateSourceMap(sourceMap)
      } else {
        studioCodeModifier = new MirrorLang.CodeModifier(code, sourceMap)
      }

      // Update robust modifier
      if (MirrorLang.createRobustModifier) {
        studioRobustModifier = MirrorLang.createRobustModifier(studioCodeModifier)
      }

      // Update state using setCompileResult for proper selection validation
      // This ensures selection is cleared when the selected node no longer exists
      if (studio?.actions?.setCompileResult) {
        studio.state.set({
          source: code,
          preludeOffset: 0,
          preludeLineOffset: 0,
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
          source: code,
          preludeOffset: 0,
          preludeLineOffset: 0,
        })
      }

      // Update PropertyExtractor with new AST and SourceMap
      if (studioPropertyExtractor) {
        studioPropertyExtractor.updateAST(ast)
        studioPropertyExtractor.updateSourceMap(sourceMap)
      } else {
        studioPropertyExtractor = new MirrorLang.PropertyExtractor(ast, sourceMap)
      }

      // Update PropertyPanel dependencies so it can extract tokens from new source
      if (studio?.propertyPanel?.updateDependencies) {
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
      // Components Panel containers (separate from explorer)
      componentPanelContainer: isPlaygroundMode ? undefined : componentsPanelContainer,
      userComponentsPanelContainer: isPlaygroundMode ? undefined : userComponentsPanelContainer,
      chatPanelContainer: chatPanelContainer,
      agentApiKey: agentApiKey,
      initialSource: files[currentFile] || '',
      currentFile: currentFile,
      getAllSource: getAllProjectSource,
      // Project context for AI Agent
      getCurrentFile: () => currentFile,
      getFiles: () => {
        // Use desktop files cache if available (includes all preloaded files)
        const allFiles = window.desktopFiles?.getFiles?.() || files
        return Object.entries(allFiles).map(([name, code]) => ({
          name,
          type: detectFileType(name, code),
          code,
        }))
      },
      updateFile: (filename, content) => {
        files[filename] = content
        // If it's the current file, update editor
        if (filename === currentFile) {
          editor.dispatch({
            changes: { from: 0, to: editor.state.doc.length, insert: content },
          })
        }
        // Save to storage
        saveFile(filename, content)
      },
      switchToFile: filename => {
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

  // Set up icon picker for property panel
  setupPropertyPanelIconPicker()

  // Initialize preview zoom controls
  initPreviewZoom()

  // Initialize play mode button
  initPlayMode()
}

// ============================================
// Play Mode (Component Testing)
// ============================================

// Device presets for simulation
// mode: 'fixed' = exact size (centered), 'max' = only max-width/height (panel controls size)
const DEVICE_PRESETS = {
  'iPhone SE': { width: 375, height: 667, mode: 'fixed' },
  'iPhone 14': { width: 390, height: 844, mode: 'fixed' },
  'iPhone 14 Pro Max': { width: 430, height: 932, mode: 'fixed' },
  'iPad Mini': { width: 768, height: 1024, mode: 'fixed' },
  'iPad Pro': { width: 1024, height: 1366, mode: 'max' },
  Desktop: { width: 1440, height: 900, mode: 'max' },
}

function initPlayMode() {
  const playBtn = document.getElementById('play-btn')
  const previewPanel = document.querySelector('.preview-panel')
  const resetBtn = document.getElementById('play-reset-btn')
  const deviceSelect = document.getElementById('device-select')
  const preview = document.getElementById('preview')

  if (!playBtn || !previewPanel) {
    console.warn('Play mode: Missing elements')
    return
  }

  // Handle play button click
  playBtn.addEventListener('click', () => {
    studioActions.togglePlayMode()
  })

  // Handle reset button click - recompile to reset states
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      console.log('Play mode: Resetting states via recompile')
      // Get current code from editor and recompile
      const editor = window.editor
      if (editor) {
        const code = editor.state.doc.toString()
        compile(code)
      }
    })
  }

  // Handle device selector change
  if (deviceSelect && preview) {
    deviceSelect.addEventListener('change', e => {
      const preset = DEVICE_PRESETS[e.target.value]
      if (preset) {
        preview.style.setProperty('--device-width', preset.width + 'px')
        preview.style.setProperty('--device-height', preset.height + 'px')
        // Use 'device-mode' for fixed size, 'device-mode-max' for max-only
        preview.classList.remove('device-mode', 'device-mode-max')
        preview.classList.add(preset.mode === 'max' ? 'device-mode-max' : 'device-mode')
        console.log(
          `Play mode: Device set to ${e.target.value} (${preset.width}×${preset.height}, ${preset.mode})`
        )
      } else {
        preview.classList.remove('device-mode', 'device-mode-max')
        preview.style.removeProperty('--device-width')
        preview.style.removeProperty('--device-height')
        console.log('Play mode: Device set to Responsive')
      }
    })
  }

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

      // Reset device selector when exiting play mode
      if (!active && deviceSelect && preview) {
        deviceSelect.value = ''
        preview.classList.remove('device-mode', 'device-mode-max')
        preview.style.removeProperty('--device-width')
        preview.style.removeProperty('--device-height')
      }
    })
  }

  // Keyboard shortcut: Escape to exit play mode
  document.addEventListener('keydown', e => {
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

  // Handle drag:dropped from v3 DragController (must be before statusEl check!)
  studio.events.on('drag:dropped', ({ source, target, dragData }) => {
    if (!target) {
      console.warn('[Drag v3] Missing target')
      return
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

/**
 * Setup move event handlers for debugging and coordination
 * Listens to move:completed events from DragDropService
 */
function setupMoveEventHandlers() {
  if (!studio?.events) return

  // Log move:completed events for debugging
  studio.events.on('move:completed', data => {
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

/**
 * Setup icon picker for property panel
 * Handles the property-panel:open-icon-picker event
 */
function setupPropertyPanelIconPicker() {
  document.addEventListener('property-panel:open-icon-picker', event => {
    const { onSelect } = event.detail || {}
    if (!onSelect) {
      console.warn('[IconPicker] No onSelect callback provided')
      return
    }

    // Get the icon picker
    const iconPicker = getGlobalIconPicker()

    // Load Lucide icons if not already loaded
    iconPicker.loadLucideIcons()

    // Set the callback for when an icon is selected
    setGlobalIconPickerCallback(iconName => {
      onSelect(iconName)
      iconPicker.hide()
    })

    // Get the button that triggered the event to position the picker
    const triggerButton = event.target?.closest?.('button[data-open-icon-picker]')
    if (triggerButton) {
      const rect = triggerButton.getBoundingClientRect()
      iconPicker.showAt(rect.left, rect.bottom + 4)
    } else {
      // Fallback: show near the property panel
      const propertyPanel = document.getElementById('property-panel')
      if (propertyPanel) {
        const rect = propertyPanel.getBoundingClientRect()
        iconPicker.showAt(rect.left + 20, rect.top + 100)
      }
    }
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

// Handle code changes from property panel
function handleStudioCodeChange(result) {
  if (!result.success) {
    console.warn('Studio: Code modification failed:', result.error)
    return
  }

  // Adjust change positions for prelude offset
  // The CodeModifier operates on the merged source (prelude + current file),
  // but the editor only contains the current file
  let adjustedChange = {
    from: result.change.from - currentPreludeOffset,
    to: result.change.to - currentPreludeOffset,
    insert: result.change.insert,
  }

  // When user code is wrapped with App, each line in the resolved source
  // has a 2-space indent prefix that doesn't exist in the editor.
  // We need to:
  // 1. Remove the indent prefix from the insert text
  // 2. Adjust 'to' position since the resolved line is 2 chars longer
  // Note: Empty lines have no indent, so we only adjust when indent is present.
  if (isWrappedWithApp) {
    const appIndent = 2
    // Remove indent prefix from insert if present (non-empty lines have 2-space indent)
    if (adjustedChange.insert.startsWith('  ')) {
      adjustedChange.insert = adjustedChange.insert.substring(appIndent)
      // Adjust 'to' since resolved line length includes the indent we just stripped
      adjustedChange.to = adjustedChange.to - appIndent
    }
  }

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
window.studio = studio // New architecture
window.resetCode = async () => {
  // No longer supported - all content comes from server
  console.log('[App] resetCode is deprecated - content managed by server')
}

// ==========================================
// Resizable Panel Dividers with localStorage persistence
// ==========================================
;(function initPanelResizers() {
  const sidebar = document.getElementById('explorer-panel')
  const sidebarDivider = document.getElementById('sidebar-divider')
  const componentsPanel = document.getElementById('components-panel')
  const componentsDivider = document.getElementById('components-divider')
  const editorPanel = document.querySelector('.editor-panel')
  const editorDivider = document.getElementById('editor-divider')
  const previewPanel = document.querySelector('.preview-panel')

  if (!editorPanel || !editorDivider || !previewPanel) {
    console.warn('[PanelResizer] Missing editor/preview elements')
    return
  }

  const MIN_PANEL = 200
  const MIN_SIDEBAR = 150
  const MIN_COMPONENTS = 180

  // Load saved sizes from state (which loads from localStorage)
  function loadSavedSizes() {
    try {
      if (window.MirrorStudio?.state) {
        const sizes = window.MirrorStudio.state.get().panelSizes
        if (sizes) {
          // Apply saved widths (stored as pixels)
          if (sidebar && sizes.sidebar) {
            sidebar.style.width = `${sizes.sidebar}px`
          }
          if (componentsPanel && sizes.components) {
            componentsPanel.style.width = `${sizes.components}px`
          }
          if (sizes.editor) {
            editorPanel.style.width = `${sizes.editor}px`
          }
          if (sizes.preview) {
            previewPanel.style.width = `${sizes.preview}px`
          }
          console.log('[PanelResizer] Restored saved sizes:', sizes)
        }
      }
    } catch (e) {
      console.warn('[PanelResizer] Failed to load saved sizes:', e)
    }
  }

  // Save current sizes to state (which persists to localStorage)
  function saveSizes() {
    try {
      if (window.MirrorStudio?.actions) {
        const sizes = {
          sidebar: sidebar ? sidebar.offsetWidth : 200,
          components: componentsPanel ? componentsPanel.offsetWidth : 220,
          editor: editorPanel.offsetWidth,
          preview: previewPanel.offsetWidth,
        }
        window.MirrorStudio.actions.setPanelSizes(sizes)
        console.log('[PanelResizer] Saved sizes:', sizes)
      }
    } catch (e) {
      console.warn('[PanelResizer] Failed to save sizes:', e)
    }
  }

  // Sidebar Resizer
  if (sidebar && sidebarDivider) {
    let isSidebarDragging = false
    let sidebarStartX = 0
    let sidebarStartWidth = 0

    sidebarDivider.addEventListener('mousedown', e => {
      isSidebarDragging = true
      sidebarStartX = e.clientX
      sidebarStartWidth = sidebar.offsetWidth
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      sidebarDivider.classList.add('dragging')
      e.preventDefault()
    })

    document.addEventListener('mousemove', e => {
      if (!isSidebarDragging) return
      const deltaX = e.clientX - sidebarStartX
      const newWidth = Math.max(MIN_SIDEBAR, sidebarStartWidth + deltaX)
      sidebar.style.width = `${newWidth}px`
    })

    document.addEventListener('mouseup', () => {
      if (!isSidebarDragging) return
      isSidebarDragging = false
      sidebarDivider.classList.remove('dragging')
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      saveSizes()
    })

    console.log('[PanelResizer] Sidebar divider ready')
  }

  // Components Panel Resizer
  if (componentsPanel && componentsDivider) {
    let isComponentsDragging = false
    let componentsStartX = 0
    let componentsStartWidth = 0

    componentsDivider.addEventListener('mousedown', e => {
      isComponentsDragging = true
      componentsStartX = e.clientX
      componentsStartWidth = componentsPanel.offsetWidth
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      componentsDivider.classList.add('dragging')
      e.preventDefault()
    })

    document.addEventListener('mousemove', e => {
      if (!isComponentsDragging) return
      const deltaX = e.clientX - componentsStartX
      const newWidth = Math.max(MIN_COMPONENTS, componentsStartWidth + deltaX)
      componentsPanel.style.width = `${newWidth}px`
    })

    document.addEventListener('mouseup', () => {
      if (!isComponentsDragging) return
      isComponentsDragging = false
      componentsDivider.classList.remove('dragging')
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      saveSizes()
    })

    console.log('[PanelResizer] Components divider ready')
  }

  // Editor/Preview Resizer
  let isDragging = false
  let startX = 0
  let startEditorWidth = 0
  let startPreviewWidth = 0

  editorDivider.addEventListener('mousedown', e => {
    isDragging = true
    startX = e.clientX
    startEditorWidth = editorPanel.offsetWidth
    startPreviewWidth = previewPanel.offsetWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    editorDivider.classList.add('dragging')
    e.preventDefault()
  })

  document.addEventListener('mousemove', e => {
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
    saveSizes()
    // Invalidate layout cache and refresh resize handles after panel resize
    if (window.MirrorStudio?.actions?.invalidateLayoutInfo) {
      window.MirrorStudio.actions.invalidateLayoutInfo('resize')
    }
    // Refresh resize handles to match new element positions
    if (window.MirrorStudio?.getPreviewController) {
      const preview = window.MirrorStudio.getPreviewController()
      preview?.getResizeManager()?.refresh()
    }
  })

  // Load saved sizes after a short delay to ensure state is initialized
  setTimeout(loadSavedSizes, 100)

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
    throw new Error(
      `Format nicht unterstützt: ${file.type.split('/')[1].toUpperCase()}. Erlaubt: PNG, JPG, GIF, WebP`
    )
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
    body: formData,
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
    annotations: Transaction.userEvent.of('input.image'),
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

editorPanel.addEventListener('dragenter', e => {
  if (hasImageFile(e.dataTransfer)) {
    e.preventDefault()
    dragCounter++
    dropOverlay.classList.add('visible')
  }
})

editorPanel.addEventListener('dragover', e => {
  if (hasImageFile(e.dataTransfer)) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }
})

editorPanel.addEventListener('dragleave', e => {
  dragCounter--
  if (dragCounter === 0) {
    dropOverlay.classList.remove('visible')
  }
})

editorPanel.addEventListener('drop', async e => {
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
document.addEventListener('paste', async e => {
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
// LLM Integration - React to Mirror Workflow (use Clean Code module)
// ==========================================================================

function convertReactToMirror(reactCode) {
  return convertReactToMirrorModule(reactCode)
}

function buildReactSystemPrompt(context) {
  return buildReactSystemPromptModule(context)
}
