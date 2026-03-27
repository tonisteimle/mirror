/**
 * Project Actions
 *
 * Abstrakte Schicht für Projekt-Operationen.
 * Gleiche API für Browser (localStorage) und Tauri.
 */

import { storage } from './index'
import { isTauri } from './providers'

// =============================================================================
// Default Project Template
// =============================================================================

// Used for new projects - includes starter tokens, components, and layout
const DEFAULT_PROJECT: Record<string, string> = {
  'index.mir': `App
  Title "Welcome to Mirror"
  Muted "Edit this code to get started"

  Card
    Muted "Your first component"
    Button "Click Me"

  // Zag Select Component
  Select placeholder "Choose an option..."
    Item "Option 1"
    Item "Option 2"
    Item "Option 3"`,

  'tokens.tok': `// Theme Tokens

// Typography
$font: Inter, system-ui, -apple-system, sans-serif

$s.fs: 12
$m.fs: 14
$l.fs: 18
$xl.fs: 24
$xxl.fs: 32

// Colors
$accent: #3b82f6
$surface: #27272a
$canvas: #18181b
$input: #1f1f1f
$text: #ffffff
$muted: #a1a1aa
$border: #333333
$focus: #3b82f6

// Spacing
$s.pad: 4
$m.pad: 8
$l.pad: 16
$xl.pad: 32

$s.gap: 4
$m.gap: 8
$l.gap: 16
$xl.gap: 32

// Radius
$s.rad: 4
$m.rad: 8
$l.rad: 12`,

  'components.com': `// Component Definitions

App: bg $canvas, pad $l, gap $l

Title: fs $xl, weight bold, col $text

Muted: fs $m, col $muted

Button: pad $m $l, bg $accent, rad $s, col white, cursor pointer
  hover bg #2563eb

Card: bg $surface, pad $l, rad $m, gap $l

Input: pad $m, bg $input, rad $s, bor 1 $border, col $text
  focus bor 1 $focus`
}

// =============================================================================
// Project Actions
// =============================================================================

/**
 * Neues leeres Projekt erstellen
 */
export async function newProject(): Promise<void> {
  if (isTauri()) {
    // Tauri: Native Dialog für neuen Ordner
    await tauriNewProject()
  } else {
    // Browser: localStorage leeren
    await browserNewProject()
  }
}

/**
 * Demo-Projekt laden (ersetzt alles)
 */
export async function loadDemoProject(): Promise<void> {
  if (isTauri()) {
    await tauriLoadDemo()
  } else {
    await browserLoadDemo()
  }
}

/**
 * Projekt-Ordner laden/importieren
 */
export async function importProject(): Promise<boolean> {
  if (isTauri()) {
    return await tauriImportProject()
  } else {
    return await browserImportProject()
  }
}

/**
 * Projekt exportieren/speichern
 */
export async function exportProject(): Promise<void> {
  if (isTauri()) {
    await tauriExportProject()
  } else {
    await browserExportProject()
  }
}

// =============================================================================
// Browser Implementation
// =============================================================================

async function browserNewProject(): Promise<void> {
  // Neues Projekt mit Default-Template erstellen
  localStorage.setItem('mirror-files', JSON.stringify(DEFAULT_PROJECT))

  // Seite neu laden um sauberen State zu haben
  window.location.reload()
}

async function browserLoadDemo(): Promise<void> {
  // Demo = Default Project (same thing now)
  localStorage.setItem('mirror-files', JSON.stringify(DEFAULT_PROJECT))

  // Seite neu laden
  window.location.reload()
}

async function browserImportProject(): Promise<boolean> {
  return new Promise((resolve) => {
    // Hidden file input für Ordner-Upload
    const input = document.createElement('input')
    input.type = 'file'
    input.webkitdirectory = true
    input.multiple = true

    input.onchange = async () => {
      const files = input.files
      if (!files || files.length === 0) {
        resolve(false)
        return
      }

      const projectFiles: Record<string, string> = {}

      // Gemeinsamen Prefix finden (Ordnername)
      const firstPath = files[0].webkitRelativePath
      const rootFolder = firstPath.split('/')[0]

      for (const file of Array.from(files)) {
        // Nur Mirror-Dateien importieren
        if (!isMirrorFile(file.name)) continue

        // Pfad relativ zum Projekt-Ordner
        const relativePath = file.webkitRelativePath
          .replace(rootFolder + '/', '')

        try {
          const content = await file.text()
          projectFiles[relativePath] = content
        } catch (err) {
          console.warn(`[ProjectActions] Failed to read ${file.name}:`, err)
        }
      }

      if (Object.keys(projectFiles).length === 0) {
        alert('Keine Mirror-Dateien (.mir, .tok, .com) im Ordner gefunden.')
        resolve(false)
        return
      }

      // In localStorage speichern
      localStorage.setItem('mirror-files', JSON.stringify(projectFiles))

      // Seite neu laden
      window.location.reload()
      resolve(true)
    }

    input.oncancel = () => resolve(false)
    input.click()
  })
}

async function browserExportProject(): Promise<void> {
  // Files aus localStorage laden
  const stored = localStorage.getItem('mirror-files')
  if (!stored) {
    alert('Keine Dateien zum Exportieren.')
    return
  }

  const files: Record<string, string> = JSON.parse(stored)

  // ZIP erstellen und downloaden
  await downloadAsZip(files, 'mirror-project.zip')
}

// =============================================================================
// Tauri Implementation (Stubs - werden von tauri-bridge.js überschrieben)
// =============================================================================

async function tauriNewProject(): Promise<void> {
  // Wird von Tauri überschrieben
  const tauriBridge = (window as any).__TAURI_BRIDGE__
  if (tauriBridge?.newProject) {
    await tauriBridge.newProject()
  } else {
    console.warn('[ProjectActions] Tauri bridge not available')
  }
}

async function tauriLoadDemo(): Promise<void> {
  const tauriBridge = (window as any).__TAURI_BRIDGE__
  if (tauriBridge?.loadDemo) {
    await tauriBridge.loadDemo()
  } else {
    // Fallback: Default-Project direkt schreiben
    for (const [path, content] of Object.entries(DEFAULT_PROJECT)) {
      await storage.writeFile(path, content)
    }
    await storage.refreshTree()
  }
}

async function tauriImportProject(): Promise<boolean> {
  const tauriBridge = (window as any).__TAURI_BRIDGE__
  if (tauriBridge?.importProject) {
    return await tauriBridge.importProject()
  }
  return false
}

async function tauriExportProject(): Promise<void> {
  // Tauri speichert automatisch - nichts zu tun
  // Oder: "Speichern unter" Dialog
  const tauriBridge = (window as any).__TAURI_BRIDGE__
  if (tauriBridge?.exportProject) {
    await tauriBridge.exportProject()
  }
}

// =============================================================================
// Helpers
// =============================================================================

function isMirrorFile(filename: string): boolean {
  const extensions = ['.mir', '.mirror', '.tok', '.tokens', '.com', '.components']
  return extensions.some(ext => filename.endsWith(ext))
}

/**
 * Files als ZIP downloaden
 */
async function downloadAsZip(files: Record<string, string>, filename: string): Promise<void> {
  // Dynamisch JSZip laden (CDN)
  const JSZip = await loadJSZip()

  const zip = new JSZip()

  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content)
  }

  const blob = await zip.generateAsync({ type: 'blob' })

  // Download triggern
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * JSZip lazy laden
 */
async function loadJSZip(): Promise<any> {
  // Prüfen ob bereits geladen
  if ((window as any).JSZip) {
    return (window as any).JSZip
  }

  // Script laden
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
    script.onload = () => resolve((window as any).JSZip)
    script.onerror = () => reject(new Error('Failed to load JSZip'))
    document.head.appendChild(script)
  })
}

// =============================================================================
// Export für UI
// =============================================================================

export const projectActions = {
  new: newProject,
  demo: loadDemoProject,
  import: importProject,
  export: exportProject
}
