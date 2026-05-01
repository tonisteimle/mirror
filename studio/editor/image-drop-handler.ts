/**
 * Image Drop & Paste Handler
 *
 * Lets the user drop or paste an image into the editor panel; uploads
 * the image to imgbb and inserts the resulting URL at the cursor.
 *
 * Status: imgbb upload is currently disabled in desktop mode (`getImgbbKey()`
 * returns an empty string). The drop/paste plumbing is still wired so the
 * UI affordance (drop overlay, error toast) is consistent across modes.
 */

import { Transaction } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload'
const SUPPORTED_IMAGE_FORMATS = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 32 * 1024 * 1024 // 32 MB

export interface ImageDropDeps {
  /** CodeMirror editor instance the URL should be inserted into. */
  editor: EditorView
  /** Element that listens for drag/drop events (typically `.editor-panel`). */
  editorPanel: HTMLElement
  /** Loading indicator element (toggled `.visible` during upload). */
  uploadIndicator: HTMLElement | null
  /** Drop-overlay element (toggled `.visible` when an image drag is over the panel). */
  dropOverlay: HTMLElement | null
  /** Returns the user's imgbb API key, or empty string if disabled. */
  getImgbbKey: () => string
}

async function uploadToImgbb(file: File, getImgbbKey: () => string): Promise<string> {
  const apiKey = getImgbbKey()
  if (!apiKey) {
    throw new Error('Kein imgbb API Key. Bitte in Einstellungen hinterlegen.')
  }

  if (!SUPPORTED_IMAGE_FORMATS.includes(file.type)) {
    const ext = file.type.split('/')[1].toUpperCase()
    throw new Error(`Format nicht unterstützt: ${ext}. Erlaubt: PNG, JPG, GIF, WebP`)
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1)
    throw new Error(`Datei zu groß: ${sizeMB} MB (Maximum: 32 MB)`)
  }

  const formData = new FormData()
  formData.append('image', file)

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

function insertImageUrl(editor: EditorView, url: string): void {
  const state = editor.state
  const pos = state.selection.main.head
  const line = state.doc.lineAt(pos)
  const textBefore = line.text.slice(0, pos - line.from)

  // If the cursor is inside an open quoted string, drop a bare URL; otherwise wrap in quotes.
  const quoteCount = (textBefore.match(/"/g) || []).length
  const inString = quoteCount % 2 === 1
  const insertText = inString ? url : `"${url}"`

  editor.dispatch({
    changes: { from: pos, to: pos, insert: insertText },
    selection: { anchor: pos + insertText.length },
    annotations: Transaction.userEvent.of('input.image'),
  })

  editor.focus()
}

function showUploadError(message: string): void {
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

function hasImageFile(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer || !dataTransfer.types.includes('Files')) return false
  for (const item of Array.from(dataTransfer.items)) {
    if (item.kind === 'file' && SUPPORTED_IMAGE_FORMATS.includes(item.type)) return true
  }
  return false
}

function getImageFiles(dataTransfer: DataTransfer | null): File[] {
  const files: File[] = []
  if (!dataTransfer || !dataTransfer.files) return files
  for (const file of Array.from(dataTransfer.files)) {
    if (SUPPORTED_IMAGE_FORMATS.includes(file.type)) files.push(file)
  }
  return files
}

/**
 * Wire image drag/drop and paste handling into the editor panel.
 *
 * Returns nothing — listeners stay attached for the lifetime of the page.
 */
export function initImageDropHandler(deps: ImageDropDeps): void {
  const { editor, editorPanel, uploadIndicator, dropOverlay, getImgbbKey } = deps

  async function handleImageUpload(file: File): Promise<void> {
    try {
      uploadIndicator?.classList.add('visible')
      const url = await uploadToImgbb(file, getImgbbKey)
      insertImageUrl(editor, url)
    } catch (error) {
      showUploadError((error as Error).message)
    } finally {
      uploadIndicator?.classList.remove('visible')
    }
  }

  let dragCounter = 0

  editorPanel.addEventListener('dragenter', e => {
    if (hasImageFile(e.dataTransfer)) {
      e.preventDefault()
      dragCounter++
      dropOverlay?.classList.add('visible')
    }
  })

  editorPanel.addEventListener('dragover', e => {
    if (hasImageFile(e.dataTransfer)) {
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }
  })

  editorPanel.addEventListener('dragleave', () => {
    dragCounter--
    if (dragCounter === 0) {
      dropOverlay?.classList.remove('visible')
    }
  })

  editorPanel.addEventListener('drop', async e => {
    dragCounter = 0
    dropOverlay?.classList.remove('visible')

    // Component drops are handled by EditorDropHandler (see bootstrap.ts).
    // Skip this handler for component drops.
    if (e.dataTransfer?.types.includes('application/mirror-component')) return

    const files = getImageFiles(e.dataTransfer)
    if (files.length === 0) return

    e.preventDefault()

    // Move cursor to drop position so the URL is inserted where the user dropped.
    const cmEditor = document.querySelector('.cm-editor')
    if (cmEditor) {
      const pos = editor.posAtCoords({ x: e.clientX, y: e.clientY })
      if (pos !== null) {
        editor.dispatch({ selection: { anchor: pos } })
      }
    }

    for (const file of files) {
      await handleImageUpload(file)
    }
  })

  // Paste handler is global because the editor doesn't always own document focus.
  document.addEventListener('paste', async e => {
    if (!(document.activeElement instanceof Element)) return
    if (!document.activeElement.closest('.cm-editor')) return

    const files = getImageFiles(e.clipboardData)
    if (files.length === 0) return

    e.preventDefault()
    for (const file of files) {
      await handleImageUpload(file)
    }
  })
}
