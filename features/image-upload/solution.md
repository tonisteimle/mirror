# Image Upload - Technische Lösung

## Übersicht

Das Image Upload Feature ermöglicht Drag & Drop und Paste von Bildern im Playground. Bilder werden automatisch zu imgbb hochgeladen und die URL wird im Editor eingefügt.

**Status:** Noch nicht implementiert. Dieses Dokument beschreibt die geplante Architektur.

## Architektur

```
User Action (Drop/Paste)
         ↓
   Event Handler
         ↓
   File Validation
         ↓
   Show Upload Indicator
         ↓
   Upload to imgbb API
         ↓
   Insert URL at Cursor
         ↓
   Hide Upload Indicator
```

## Komponenten

### HTML-Struktur

```html
<!-- Upload Indicator (neben Editor) -->
<div id="upload-indicator" class="upload-indicator">
  <div class="upload-spinner"></div>
  <span>Bild wird hochgeladen...</span>
</div>

<!-- Drop Zone Overlay (über Editor) -->
<div id="drop-overlay" class="drop-overlay">
  <div class="drop-message">
    <span class="drop-icon">📷</span>
    <span>Bild hier ablegen</span>
  </div>
</div>
```

### CSS-Klassen

```css
/* Upload Indicator */
.upload-indicator {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #1a1a23;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 12px 16px;
  display: none;
  align-items: center;
  gap: 8px;
  z-index: 1000;
}

.upload-indicator.visible {
  display: flex;
}

.upload-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #333;
  border-top-color: #3B82F6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Drop Overlay */
.drop-overlay {
  position: absolute;
  inset: 0;
  background: rgba(59, 130, 246, 0.1);
  border: 2px dashed #3B82F6;
  border-radius: 8px;
  display: none;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 100;
}

.drop-overlay.visible {
  display: flex;
}

.drop-message {
  background: #1a1a23;
  padding: 16px 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #3B82F6;
}

.drop-icon {
  font-size: 24px;
}

/* Error Toast */
.upload-error {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #EF4444;
  color: white;
  border-radius: 8px;
  padding: 12px 16px;
  z-index: 1000;
}
```

## JavaScript-Implementierung

### Konstanten

```javascript
// imgbb API
const IMGBB_API_KEY = 'YOUR_API_KEY' // Kostenloser Key
const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload'

// Unterstützte Formate
const SUPPORTED_FORMATS = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

// Limits
const MAX_FILE_SIZE = 32 * 1024 * 1024 // 32 MB
```

### Upload-Funktion

```javascript
async function uploadToImgbb(file) {
  // Validierung
  if (!SUPPORTED_FORMATS.includes(file.type)) {
    throw new Error(`Nicht unterstütztes Format: ${file.type}`)
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Datei zu groß: ${(file.size / 1024 / 1024).toFixed(1)} MB (max 32 MB)`)
  }

  // FormData erstellen
  const formData = new FormData()
  formData.append('image', file)

  // Upload
  const response = await fetch(`${IMGBB_UPLOAD_URL}?key=${IMGBB_API_KEY}`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    throw new Error(`Upload fehlgeschlagen: ${response.status}`)
  }

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error?.message || 'Upload fehlgeschlagen')
  }

  return data.data.url
}
```

### URL-Insertion

```javascript
function insertImageUrl(url) {
  if (!window.editor) return

  const state = window.editor.state
  const pos = state.selection.main.head

  // Prüfen ob wir in einem String sind
  const line = state.doc.lineAt(pos)
  const textBefore = line.text.slice(0, pos - line.from)
  const textAfter = line.text.slice(pos - line.from)

  // Bereits in Anführungszeichen?
  const inString = (textBefore.match(/"/g) || []).length % 2 === 1

  let insertText
  if (inString) {
    // Bereits in String: nur URL einfügen
    insertText = url
  } else {
    // Außerhalb String: mit Anführungszeichen
    insertText = `"${url}"`
  }

  window.editor.dispatch({
    changes: { from: pos, to: pos, insert: insertText },
    selection: { anchor: pos + insertText.length }
  })
}
```

### Drag & Drop Handler

```javascript
function setupDragAndDrop() {
  const editorContainer = document.querySelector('.cm-editor')
  const dropOverlay = document.getElementById('drop-overlay')

  // Drag Enter - Overlay zeigen
  editorContainer.addEventListener('dragenter', (e) => {
    if (hasImageFile(e.dataTransfer)) {
      e.preventDefault()
      dropOverlay.classList.add('visible')
    }
  })

  // Drag Over - Default verhindern
  editorContainer.addEventListener('dragover', (e) => {
    if (hasImageFile(e.dataTransfer)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  })

  // Drag Leave - Overlay verstecken
  editorContainer.addEventListener('dragleave', (e) => {
    // Nur wenn wir den Container verlassen
    if (!editorContainer.contains(e.relatedTarget)) {
      dropOverlay.classList.remove('visible')
    }
  })

  // Drop - Upload starten
  editorContainer.addEventListener('drop', async (e) => {
    dropOverlay.classList.remove('visible')

    const files = getImageFiles(e.dataTransfer)
    if (files.length === 0) return

    e.preventDefault()

    // Cursor an Drop-Position setzen
    const pos = window.editor.posAtCoords({ x: e.clientX, y: e.clientY })
    if (pos !== null) {
      window.editor.dispatch({ selection: { anchor: pos } })
    }

    // Alle Bilder hochladen
    for (const file of files) {
      await handleImageUpload(file)
    }
  })
}

function hasImageFile(dataTransfer) {
  if (!dataTransfer.types.includes('Files')) return false

  // Während Drag können wir die Dateien nicht lesen,
  // aber wir können die Types prüfen
  for (const item of dataTransfer.items) {
    if (item.kind === 'file' && SUPPORTED_FORMATS.includes(item.type)) {
      return true
    }
  }
  return false
}

function getImageFiles(dataTransfer) {
  const files = []
  for (const file of dataTransfer.files) {
    if (SUPPORTED_FORMATS.includes(file.type)) {
      files.push(file)
    }
  }
  return files
}
```

### Paste Handler

```javascript
function setupPasteHandler() {
  const editorContainer = document.querySelector('.cm-editor')

  editorContainer.addEventListener('paste', async (e) => {
    const files = getImageFiles(e.clipboardData)
    if (files.length === 0) return

    e.preventDefault()

    for (const file of files) {
      await handleImageUpload(file)
    }
  })
}
```

### Upload Handler (zentral)

```javascript
async function handleImageUpload(file) {
  const indicator = document.getElementById('upload-indicator')

  try {
    // Indicator zeigen
    indicator.classList.add('visible')

    // Upload
    const url = await uploadToImgbb(file)

    // URL einfügen
    insertImageUrl(url)

  } catch (error) {
    showUploadError(error.message)
  } finally {
    indicator.classList.remove('visible')
  }
}

function showUploadError(message) {
  const toast = document.createElement('div')
  toast.className = 'upload-error'
  toast.textContent = message
  document.body.appendChild(toast)

  setTimeout(() => {
    toast.remove()
  }, 5000)
}
```

### Initialisierung

```javascript
function initImageUpload() {
  // HTML-Elemente erstellen
  createUploadIndicator()
  createDropOverlay()

  // Event Handler registrieren
  setupDragAndDrop()
  setupPasteHandler()
}

function createUploadIndicator() {
  const indicator = document.createElement('div')
  indicator.id = 'upload-indicator'
  indicator.className = 'upload-indicator'
  indicator.innerHTML = `
    <div class="upload-spinner"></div>
    <span>Bild wird hochgeladen...</span>
  `
  document.body.appendChild(indicator)
}

function createDropOverlay() {
  const overlay = document.createElement('div')
  overlay.id = 'drop-overlay'
  overlay.className = 'drop-overlay'
  overlay.innerHTML = `
    <div class="drop-message">
      <span class="drop-icon">📷</span>
      <span>Bild hier ablegen</span>
    </div>
  `

  // In Editor-Container einfügen
  const editorContainer = document.querySelector('.editor-container')
  editorContainer.style.position = 'relative'
  editorContainer.appendChild(overlay)
}

// Bei Editor-Init aufrufen
document.addEventListener('DOMContentLoaded', () => {
  // ... andere Initialisierung ...
  initImageUpload()
})
```

## API-Key Management

### Option 1: Öffentlicher Key (einfach)

```javascript
// Fest im Code - für öffentlichen Playground OK
const IMGBB_API_KEY = 'abc123...'
```

**Pro:** Einfach
**Contra:** Key öffentlich sichtbar, könnte missbraucht werden

### Option 2: Proxy-Endpoint (sicherer)

```javascript
// Über eigenen Proxy
async function uploadToImgbb(file) {
  const formData = new FormData()
  formData.append('image', file)

  const response = await fetch('/api/upload-image', {
    method: 'POST',
    body: formData
  })

  return (await response.json()).url
}
```

Server-seitig:
```javascript
// api/upload-image.js (Vercel/Netlify Function)
export default async function handler(req, res) {
  const formData = new FormData()
  formData.append('image', req.body.image)

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_KEY}`, {
    method: 'POST',
    body: formData
  })

  const data = await response.json()
  res.json({ url: data.data.url })
}
```

**Pro:** Key geschützt
**Contra:** Braucht Server-Infrastruktur

### Empfehlung für v1

Option 1 (öffentlicher Key) ist für den Playground akzeptabel:
- imgbb hat Rate Limits
- Missbrauch wäre auf Bild-Upload beschränkt
- Einfache Implementierung

Für Production kann später Option 2 implementiert werden.

## Fehlerbehandlung

### Fehlertypen

| Fehler | Ursache | Handling |
|--------|---------|----------|
| `UnsupportedFormat` | Falsches Dateiformat | Toast mit Hinweis |
| `FileTooLarge` | > 32 MB | Toast mit Limit-Info |
| `NetworkError` | Offline / Timeout | Toast + Retry-Hinweis |
| `APIError` | imgbb-Fehler | Toast mit Details |
| `RateLimited` | Zu viele Uploads | Toast mit Warte-Hinweis |

### Error Handling Code

```javascript
class UploadError extends Error {
  constructor(type, message, details = {}) {
    super(message)
    this.type = type
    this.details = details
  }
}

function getErrorMessage(error) {
  if (error instanceof UploadError) {
    switch (error.type) {
      case 'UnsupportedFormat':
        return `Format nicht unterstützt. Erlaubt: PNG, JPG, GIF, WebP`
      case 'FileTooLarge':
        return `Datei zu groß (${error.details.size}). Maximum: 32 MB`
      case 'NetworkError':
        return `Netzwerkfehler. Bitte Verbindung prüfen.`
      case 'RateLimited':
        return `Zu viele Uploads. Bitte kurz warten.`
      default:
        return error.message
    }
  }
  return 'Upload fehlgeschlagen. Bitte erneut versuchen.'
}
```

## Tests

### Unit Tests

```typescript
describe('Image Upload', () => {
  describe('uploadToImgbb', () => {
    it('uploads PNG successfully', async () => {
      const file = createMockFile('test.png', 'image/png', 1024)
      const url = await uploadToImgbb(file)
      expect(url).toMatch(/^https:\/\/i\.ibb\.co\//)
    })

    it('uploads JPG successfully', async () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const url = await uploadToImgbb(file)
      expect(url).toMatch(/^https:\/\/i\.ibb\.co\//)
    })

    it('rejects unsupported format', async () => {
      const file = createMockFile('test.txt', 'text/plain', 100)
      await expect(uploadToImgbb(file)).rejects.toThrow('Nicht unterstütztes Format')
    })

    it('rejects file too large', async () => {
      const file = createMockFile('huge.png', 'image/png', 50 * 1024 * 1024)
      await expect(uploadToImgbb(file)).rejects.toThrow('Datei zu groß')
    })
  })

  describe('insertImageUrl', () => {
    it('inserts URL in string', () => {
      setEditorContent('avatar "|"')
      setCursorPosition(8)
      insertImageUrl('https://i.ibb.co/xyz.jpg')
      expect(getEditorContent()).toBe('avatar "https://i.ibb.co/xyz.jpg|"')
    })

    it('wraps URL in quotes outside string', () => {
      setEditorContent('avatar |')
      setCursorPosition(7)
      insertImageUrl('https://i.ibb.co/xyz.jpg')
      expect(getEditorContent()).toBe('avatar "https://i.ibb.co/xyz.jpg"|')
    })
  })

  describe('hasImageFile', () => {
    it('returns true for image files', () => {
      const dt = createMockDataTransfer(['image/png'])
      expect(hasImageFile(dt)).toBe(true)
    })

    it('returns false for non-image files', () => {
      const dt = createMockDataTransfer(['text/plain'])
      expect(hasImageFile(dt)).toBe(false)
    })
  })
})
```

### E2E Tests (Playwright)

```typescript
describe('Image Upload E2E', () => {
  beforeEach(async () => {
    await page.goto('http://localhost:3000/playground')
  })

  it('shows drop overlay on drag', async () => {
    const editor = page.locator('.cm-editor')

    // Simuliere Drag
    await editor.dispatchEvent('dragenter', {
      dataTransfer: { types: ['Files'], items: [{ kind: 'file', type: 'image/png' }] }
    })

    const overlay = page.locator('#drop-overlay')
    await expect(overlay).toBeVisible()
  })

  it('hides drop overlay on drag leave', async () => {
    const editor = page.locator('.cm-editor')

    await editor.dispatchEvent('dragenter', { /* ... */ })
    await editor.dispatchEvent('dragleave', { /* ... */ })

    const overlay = page.locator('#drop-overlay')
    await expect(overlay).not.toBeVisible()
  })

  it('shows upload indicator during upload', async () => {
    // Mock API
    await page.route('**/api.imgbb.com/**', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, data: { url: 'https://i.ibb.co/test.jpg' } })
        })
      }, 500)
    })

    // Drop image
    await dropImageFile(page, 'test.png')

    // Indicator should be visible
    const indicator = page.locator('#upload-indicator')
    await expect(indicator).toBeVisible()

    // Wait for upload
    await expect(indicator).not.toBeVisible({ timeout: 2000 })
  })

  it('inserts URL after successful upload', async () => {
    // Mock API
    await page.route('**/api.imgbb.com/**', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, data: { url: 'https://i.ibb.co/test.jpg' } })
      })
    })

    // Set initial content
    await setEditorContent(page, 'avatar ')

    // Drop image
    await dropImageFile(page, 'test.png')

    // Check URL was inserted
    const content = await getEditorContent(page)
    expect(content).toContain('https://i.ibb.co/test.jpg')
  })

  it('shows error on upload failure', async () => {
    // Mock API failure
    await page.route('**/api.imgbb.com/**', route => {
      route.fulfill({ status: 500 })
    })

    // Drop image
    await dropImageFile(page, 'test.png')

    // Error should be visible
    const error = page.locator('.upload-error')
    await expect(error).toBeVisible()
  })

  it('handles paste from clipboard', async () => {
    // Mock API
    await page.route('**/api.imgbb.com/**', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, data: { url: 'https://i.ibb.co/pasted.jpg' } })
      })
    })

    // Paste image
    await pasteImageFromClipboard(page, 'screenshot.png')

    // Check URL was inserted
    const content = await getEditorContent(page)
    expect(content).toContain('https://i.ibb.co/pasted.jpg')
  })
})

// Helper functions
async function dropImageFile(page, filename) {
  const dataTransfer = await page.evaluateHandle(() => {
    const dt = new DataTransfer()
    const file = new File(['fake image data'], filename, { type: 'image/png' })
    dt.items.add(file)
    return dt
  })

  const editor = page.locator('.cm-editor')
  await editor.dispatchEvent('drop', { dataTransfer })
}

async function pasteImageFromClipboard(page, filename) {
  const clipboardData = await page.evaluateHandle(() => {
    const dt = new DataTransfer()
    const file = new File(['fake image data'], filename, { type: 'image/png' })
    dt.items.add(file)
    return dt
  })

  const editor = page.locator('.cm-editor')
  await editor.dispatchEvent('paste', { clipboardData })
}
```

## Implementierungs-Reihenfolge

### Phase 1: Basis-Upload
1. imgbb API-Integration
2. `uploadToImgbb()` Funktion
3. Unit Tests für Upload

### Phase 2: Drag & Drop
1. Drop Overlay HTML/CSS
2. Drag Event Handler
3. URL-Insertion
4. E2E Tests

### Phase 3: Paste
1. Paste Event Handler
2. Clipboard-Handling
3. E2E Tests

### Phase 4: UX Polish
1. Upload Indicator
2. Error Handling
3. Edge Cases

## Dateien

| Datei | Änderungen |
|-------|------------|
| `playground.html` | HTML, CSS, JavaScript für Upload |
| `src/__tests__/playground/image-upload.test.ts` | Playwright E2E Tests |
