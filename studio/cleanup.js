/**
 * Mirror Studio - Clean up Module
 *
 * Sendet Code an Claude CLI, erhält Patches zurück,
 * wendet sie sequentiell und animiert an.
 */

import { alert } from './dialog.js'

// Wait for app to initialize
setTimeout(() => {
  initCleanup()
}, 1000)

function initCleanup() {
  const cleanupBtn = document.getElementById('cleanup-btn')
  if (!cleanupBtn) {
    console.warn('Cleanup button not found')
    return
  }

  console.log('Mirror Studio: Cleanup module initialized')

  cleanupBtn.addEventListener('click', handleCleanup)

  // Cmd+Shift+C shortcut
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'c') {
      e.preventDefault()
      handleCleanup()
    }
  })

  // Inject CSS for highlighting
  injectStyles()
}

function injectStyles() {
  const style = document.createElement('style')
  style.textContent = `
    .cm-cleanup-highlight {
      background: rgba(34, 197, 94, 0.25) !important;
      transition: background 2s ease-out;
    }
    .cm-cleanup-highlight.fade-out {
      background: transparent !important;
    }
  `
  document.head.appendChild(style)
}

async function handleCleanup() {
  const cleanupBtn = document.getElementById('cleanup-btn')

  // Get code from editor
  const userCode = getEditorCode()
  if (!userCode || userCode.trim().length === 0) {
    console.warn('No code to clean up')
    return
  }

  // Show loading state
  cleanupBtn.classList.add('loading')
  cleanupBtn.disabled = true
  const originalText = cleanupBtn.querySelector('span')?.textContent

  if (cleanupBtn.querySelector('span')) {
    cleanupBtn.querySelector('span').textContent = 'Validiere...'
  }

  try {
    console.log('Requesting cleanup (validate → fix)...')

    const response = await fetch('http://localhost:3333/api/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mirrorCode: userCode })
    })

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      console.error('Cleanup error:', data.error)
      await alert(data.error, { title: 'Cleanup Fehler' })
      return
    }

    // Show validation info
    if (data.validationErrors !== undefined) {
      console.log(`Validator found ${data.validationErrors} issues`)
    }

    if (data.patches && data.patches.length > 0) {
      console.log(`Applying ${data.patches.length} patches...`)

      if (cleanupBtn.querySelector('span')) {
        cleanupBtn.querySelector('span').textContent = `${data.patches.length} Fixes...`
      }

      await applyPatchesAnimated(data.patches)
      console.log('All patches applied')
    } else {
      console.log('No patches needed - code is clean!')
      if (cleanupBtn.querySelector('span')) {
        cleanupBtn.querySelector('span').textContent = 'Sauber!'
        setTimeout(() => {
          if (cleanupBtn.querySelector('span')) {
            cleanupBtn.querySelector('span').textContent = originalText || 'Clean up'
          }
        }, 1500)
      }
    }

  } catch (error) {
    console.error('Cleanup error:', error)
    await alert(error.message + '\n\nStelle sicher, dass der Server läuft (node spec-studio/server.js)', { title: 'Fehler beim Aufräumen' })
  } finally {
    cleanupBtn.classList.remove('loading')
    cleanupBtn.disabled = false
    if (cleanupBtn.querySelector('span')) {
      cleanupBtn.querySelector('span').textContent = originalText || 'Clean up'
    }
  }
}

/**
 * Apply patches one by one with animation
 */
async function applyPatchesAnimated(patches) {
  // Sort patches by line number (descending) to avoid offset issues
  const sortedPatches = [...patches].sort((a, b) => b.line - a.line)

  for (const patch of sortedPatches) {
    await applyPatch(patch)
    // Small delay between patches for visual effect
    await sleep(150)
  }

  // After all patches, fade out highlights
  setTimeout(() => {
    document.querySelectorAll('.cm-cleanup-highlight').forEach(el => {
      el.classList.add('fade-out')
    })
  }, 1000)

  // Remove highlight classes after fade
  setTimeout(() => {
    document.querySelectorAll('.cm-cleanup-highlight').forEach(el => {
      el.classList.remove('cm-cleanup-highlight', 'fade-out')
    })
  }, 3000)
}

/**
 * Apply a single patch to the editor
 */
async function applyPatch(patch) {
  const { line, replace, reason } = patch
  const editor = getEditor()

  if (!editor) {
    console.error('Editor not found')
    return
  }

  const doc = editor.state.doc
  const lineInfo = doc.line(line)

  if (!lineInfo) {
    console.error(`Line ${line} not found`)
    return
  }

  console.log(`Patch line ${line}: "${reason}"`)

  // Replace the line content
  editor.dispatch({
    changes: {
      from: lineInfo.from,
      to: lineInfo.to,
      insert: replace
    }
  })

  // Highlight the changed line
  highlightLine(line)
}

/**
 * Highlight a line in the editor
 */
function highlightLine(lineNumber) {
  // Find the line element in CodeMirror DOM
  const editorContainer = document.getElementById('editor-container')
  if (!editorContainer) return

  const cmContent = editorContainer.querySelector('.cm-content')
  if (!cmContent) return

  // CodeMirror 6 renders lines as .cm-line elements
  const lines = cmContent.querySelectorAll('.cm-line')
  const lineEl = lines[lineNumber - 1]

  if (lineEl) {
    lineEl.classList.add('cm-cleanup-highlight')
  }
}

function getEditor() {
  // Try window.editor (CodeMirror instance)
  if (window.editor) {
    return window.editor
  }

  // Try MirrorStudio
  if (window.MirrorStudio?.editor) {
    return window.MirrorStudio.editor
  }

  return null
}

function getEditorCode() {
  const editor = getEditor()
  if (editor?.state?.doc) {
    return editor.state.doc.toString()
  }

  // Fallback: Try MirrorStudio state
  if (window.MirrorStudio?.state?.code) {
    return window.MirrorStudio.state.code
  }

  // Fallback: DOM
  const editorContainer = document.getElementById('editor-container')
  if (editorContainer) {
    const cmContent = editorContainer.querySelector('.cm-content')
    if (cmContent) {
      return cmContent.textContent
    }
  }

  return ''
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
