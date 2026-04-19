/**
 * AI Assist Prototype - Client
 *
 * Konzept:
 * - User schreibt frei (Draft Mode - grauer Text)
 * - AI beobachtet und wartet auf Pause
 * - Nach Pause (1.5s): AI analysiert GANZEN Block
 * - AI korrigiert und ergänzt intelligent
 * - Text wird farbig (Validated Mode)
 */

const API_URL = 'http://localhost:3456'

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
  // Wie lange warten nach letztem Keystroke bevor AI startet
  pauseThreshold: 1500, // ms

  // Minimum Code-Länge bevor AI aktiv wird
  minCodeLength: 10,

  // Debounce für Line Numbers Update
  lineNumberDebounce: 50,
}

// =============================================================================
// State
// =============================================================================

const state = {
  mode: 'draft', // 'draft' | 'validated'
  isLoading: false,
  lastValidatedCode: '',
  pauseTimer: null,
  lastKeystroke: 0,
}

// =============================================================================
// DOM Elements
// =============================================================================

const editor = document.getElementById('editor')
const lineNumbers = document.getElementById('lineNumbers')
const status = document.getElementById('status')
const modeIndicator = document.getElementById('modeIndicator')
const modeText = document.getElementById('modeText')
const autoComplete = document.getElementById('autoComplete')
const triggerBtn = document.getElementById('triggerComplete')
const latencyEl = document.getElementById('latency')
const logEl = document.getElementById('log')

// =============================================================================
// Logging
// =============================================================================

function log(message, type = 'info') {
  const entry = document.createElement('div')
  entry.className = `log-entry ${type}`
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`
  logEl.appendChild(entry)
  logEl.scrollTop = logEl.scrollHeight

  // Keep only last 50 entries
  while (logEl.children.length > 50) {
    logEl.removeChild(logEl.firstChild)
  }
}

// =============================================================================
// Mode Management
// =============================================================================

function setMode(mode) {
  state.mode = mode
  editor.classList.remove('draft', 'validated')
  editor.classList.add(mode)
  modeIndicator.classList.remove('draft', 'validated')
  modeIndicator.classList.add(mode)
  modeText.textContent = mode === 'draft' ? 'Draft' : 'Validated'
}

function setStatus(text, type = '') {
  status.textContent = text
  status.className = 'status ' + type
}

// =============================================================================
// Syntax Highlighting
// =============================================================================

const KEYWORDS = [
  'Frame',
  'Text',
  'Button',
  'Input',
  'Icon',
  'Image',
  'Link',
  'Box',
  'Spacer',
  'Divider',
  'Label',
  'H1',
  'H2',
  'H3',
  'Header',
  'Nav',
  'Main',
  'Section',
  'Footer',
  'Article',
  'Aside',
  'Textarea',
  'Select',
  'Checkbox',
  'Switch',
  'Slider',
  'Dialog',
  'Tooltip',
  'Tabs',
  'Tab',
]
const PROPERTIES = [
  'bg',
  'col',
  'pad',
  'mar',
  'gap',
  'w',
  'h',
  'rad',
  'bor',
  'boc',
  'fs',
  'weight',
  'hor',
  'ver',
  'center',
  'spread',
  'grow',
  'shrink',
  'wrap',
  'ic',
  'is',
  'shadow',
  'opacity',
  'cursor',
  'hidden',
  'visible',
  'scroll',
  'clip',
  'absolute',
  'relative',
  'fixed',
  'z',
  'x',
  'y',
  'rotate',
  'scale',
  'pad-x',
  'pad-y',
  'pad-t',
  'pad-r',
  'pad-b',
  'pad-l',
  'mar-x',
  'mar-y',
  'minw',
  'maxw',
  'minh',
  'maxh',
  'truncate',
  'uppercase',
  'lowercase',
  'italic',
  'underline',
  'font',
  'line',
  'stacked',
  'grid',
  'placeholder',
]

function highlightCode(code) {
  // Escape HTML
  let html = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Comments
  html = html.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>')

  // Strings
  html = html.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="string">$1</span>')

  // Color values
  html = html.replace(/(#[0-9a-fA-F]{3,8})\b/g, '<span class="color-value">$1</span>')

  // Numbers (but not inside already highlighted spans)
  html = html.replace(/\b(\d+(?:\.\d+)?)\b(?![^<]*>)/g, '<span class="number">$1</span>')

  // Keywords (primitives)
  const keywordPattern = new RegExp(`\\b(${KEYWORDS.join('|')})\\b`, 'g')
  html = html.replace(keywordPattern, '<span class="keyword">$1</span>')

  // Properties
  const propPattern = new RegExp(`\\b(${PROPERTIES.join('|')})\\b(?![^<]*>)`, 'g')
  html = html.replace(propPattern, '<span class="property">$1</span>')

  return html
}

// =============================================================================
// Line Numbers
// =============================================================================

let lineNumberTimeout = null

function updateLineNumbers() {
  clearTimeout(lineNumberTimeout)
  lineNumberTimeout = setTimeout(() => {
    const text = editor.innerText || ''
    const lines = text.split('\n').length || 1
    lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>')
  }, CONFIG.lineNumberDebounce)
}

// =============================================================================
// Editor Content
// =============================================================================

function getPlainText() {
  return editor.innerText || ''
}

function setContent(code) {
  // Save cursor position relative to text
  const sel = window.getSelection()
  const currentText = getPlainText()
  let cursorOffset = 0

  if (sel.rangeCount > 0) {
    const range = sel.getRangeAt(0)
    const preCaretRange = range.cloneRange()
    preCaretRange.selectNodeContents(editor)
    preCaretRange.setEnd(range.endContainer, range.endOffset)
    cursorOffset = preCaretRange.toString().length
  }

  // Update content with highlighting
  const highlighted = highlightCode(code)
  editor.innerHTML = highlighted
  updateLineNumbers()

  // Try to restore cursor position
  try {
    restoreCursor(cursorOffset)
  } catch (e) {
    // Fallback: put cursor at end
    const range = document.createRange()
    range.selectNodeContents(editor)
    range.collapse(false)
    sel.removeAllRanges()
    sel.addRange(range)
  }
}

function restoreCursor(offset) {
  const sel = window.getSelection()
  const range = document.createRange()

  let currentOffset = 0
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false)

  while (walker.nextNode()) {
    const node = walker.currentNode
    const nodeLength = node.textContent.length

    if (currentOffset + nodeLength >= offset) {
      range.setStart(node, offset - currentOffset)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
      return
    }
    currentOffset += nodeLength
  }
}

// =============================================================================
// Pause Detection
// =============================================================================

function schedulePauseCheck() {
  // Clear any existing timer
  if (state.pauseTimer) {
    clearTimeout(state.pauseTimer)
  }

  // Don't schedule if auto-complete is disabled
  if (!autoComplete.checked) {
    return
  }

  // Schedule new check
  state.pauseTimer = setTimeout(() => {
    const code = getPlainText()

    // Only trigger if we have enough code
    if (code.trim().length >= CONFIG.minCodeLength) {
      log(`Pause erkannt (${CONFIG.pauseThreshold}ms) - starte AI...`, 'info')
      validateCode()
    }
  }, CONFIG.pauseThreshold)
}

function cancelPauseCheck() {
  if (state.pauseTimer) {
    clearTimeout(state.pauseTimer)
    state.pauseTimer = null
  }
}

// =============================================================================
// AI API Call
// =============================================================================

async function callAI(code) {
  if (state.isLoading) {
    log('AI läuft bereits...', 'info')
    return null
  }

  state.isLoading = true
  setStatus('AI analysiert...', 'loading')
  triggerBtn.disabled = true

  const startTime = Date.now()

  try {
    const response = await fetch(`${API_URL}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        line: code.split('\n').length - 1,
      }),
    })

    const data = await response.json()
    const elapsed = Date.now() - startTime

    latencyEl.textContent = `${elapsed}ms`

    if (data.success) {
      log(`AI fertig in ${elapsed}ms`, 'success')
      return data.code
    } else {
      log(`Fehler: ${data.error}`, 'error')
      return null
    }
  } catch (error) {
    log(`Netzwerk-Fehler: ${error.message}`, 'error')
    return null
  } finally {
    state.isLoading = false
    triggerBtn.disabled = false
  }
}

// =============================================================================
// Main Validation Flow
// =============================================================================

async function validateCode() {
  const code = getPlainText()

  if (!code.trim()) {
    log('Kein Code vorhanden', 'info')
    return
  }

  // Cancel any pending pause check
  cancelPauseCheck()

  const result = await callAI(code)

  if (result) {
    // Check if AI made changes
    const originalLines = code.split('\n').length
    const resultLines = result.split('\n').length
    const changed = code.trim() !== result.trim()

    if (!changed) {
      log('Code ist valide - keine Änderungen', 'success')
      setStatus('Validiert ✓', 'success')
    } else {
      const lineDiff = resultLines - originalLines
      const msg =
        lineDiff > 0
          ? `+${lineDiff} Zeilen hinzugefügt`
          : lineDiff < 0
            ? `${lineDiff} Zeilen entfernt`
            : 'Code korrigiert'
      log(msg, 'success')
      setStatus(msg, 'success')
    }

    // Update content with highlighting
    setContent(result)
    state.lastValidatedCode = result

    // Switch to validated mode
    setMode('validated')
  } else {
    setStatus('Fehler', 'error')
  }
}

// =============================================================================
// Event Handlers
// =============================================================================

// User types → switch to draft mode, schedule pause check
editor.addEventListener('input', () => {
  state.lastKeystroke = Date.now()

  // Switch to draft mode
  if (state.mode === 'validated') {
    setMode('draft')
    latencyEl.textContent = ''
  }

  setStatus('Schreiben...', '')
  updateLineNumbers()

  // Schedule pause check
  schedulePauseCheck()
})

// Keyboard shortcuts
editor.addEventListener('keydown', e => {
  // Cmd/Ctrl + Enter → force validate NOW
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    cancelPauseCheck()
    validateCode()
    return
  }

  // Tab → insert spaces
  if (e.key === 'Tab') {
    e.preventDefault()
    document.execCommand('insertText', false, '  ')
  }

  // Escape → cancel pending AI
  if (e.key === 'Escape') {
    cancelPauseCheck()
    setStatus('AI abgebrochen', '')
    log('AI-Check abgebrochen', 'info')
  }
})

// Manual trigger button
triggerBtn.addEventListener('click', () => {
  cancelPauseCheck()
  validateCode()
})

// Focus/blur handling
editor.addEventListener('blur', () => {
  // When editor loses focus, cancel pending checks
  cancelPauseCheck()
})

// Initial line numbers
updateLineNumbers()

// =============================================================================
// Startup
// =============================================================================

log('AI Assist Prototype v2', 'info')
log(`Pause-Threshold: ${CONFIG.pauseThreshold}ms`, 'info')
log('Schreibe Code - AI startet nach Pause automatisch', 'info')
setStatus('Bereit', '')

// Focus editor
editor.focus()
