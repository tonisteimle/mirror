/**
 * Spec Studio - Generate Module
 *
 * 1. Holt User-Input aus Editor
 * 2. Sendet an Server (Claude CLI)
 * 3. Schreibt saubere Spec zurück in Editor
 * 4. Lädt generierte App in Preview
 */

// Wait for app to initialize
setTimeout(() => {
  initGenerate()
}, 1000)

function initGenerate() {
  const generateBtn = document.getElementById('generate-btn')
  if (!generateBtn) {
    console.warn('Generate button not found')
    return
  }

  console.log('Spec Studio: Generate module initialized')

  generateBtn.addEventListener('click', handleGenerate)

  // Cmd+Enter shortcut
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleGenerate()
    }
  })
}

async function handleGenerate() {
  const generateBtn = document.getElementById('generate-btn')

  // Get code from editor
  const userInput = getEditorCode()
  if (!userInput || userInput.trim().length === 0) {
    console.warn('No input to generate')
    return
  }

  // Show loading state
  generateBtn.classList.add('loading')
  generateBtn.disabled = true
  const originalText = generateBtn.querySelector('span')?.textContent
  if (generateBtn.querySelector('span')) {
    generateBtn.querySelector('span').textContent = 'Generating...'
  }

  try {
    console.log('Generating from input...')

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mirrorCode: userInput })
    })

    const result = await response.json()

    if (result.success) {
      console.log('Generated successfully')

      // Write clean spec to editor - the studio will auto-render it
      if (result.cleanSpec) {
        setEditorCode(result.cleanSpec)
        // Studio re-renders automatically when code changes
        console.log('Clean spec written to editor')
      }

    } else {
      console.error('Generation failed:', result.error)
      alert('Fehler: ' + result.error)
    }
  } catch (error) {
    console.error('Generation error:', error)
    alert('Fehler bei der Generierung: ' + error.message)
  } finally {
    generateBtn.classList.remove('loading')
    generateBtn.disabled = false
    if (generateBtn.querySelector('span')) {
      generateBtn.querySelector('span').textContent = originalText || 'Generate'
    }
  }
}

function getEditorCode() {
  // Try MirrorStudio state
  if (window.MirrorStudio?.state?.code) {
    return window.MirrorStudio.state.code
  }

  // Try CodeMirror
  const editorContainer = document.getElementById('editor-container')
  if (editorContainer) {
    const cmContent = editorContainer.querySelector('.cm-content')
    if (cmContent) {
      return cmContent.textContent
    }
  }

  return ''
}

function setEditorCode(code) {
  // Try MirrorStudio
  if (window.MirrorStudio?.setCode) {
    window.MirrorStudio.setCode(code)
    return
  }

  // Try via event
  if (window.MirrorStudio?.events) {
    window.MirrorStudio.events.emit('code:set', code)
    return
  }

  // Fallback: Direct CodeMirror manipulation
  if (window.editor) {
    window.editor.dispatch({
      changes: {
        from: 0,
        to: window.editor.state.doc.length,
        insert: code
      }
    })
  }
}

function reloadPreview() {
  const preview = document.getElementById('preview')
  if (!preview) return

  // Clear and reload with generated content
  preview.innerHTML = ''

  const iframe = document.createElement('iframe')
  iframe.src = '/generated/index.html?' + Date.now()
  iframe.style.cssText = 'width: 100%; height: 100%; border: none; background: white;'

  preview.appendChild(iframe)
}
