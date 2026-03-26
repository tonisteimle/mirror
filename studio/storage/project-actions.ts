/**
 * Project Actions
 *
 * Abstrakte Schicht für Projekt-Operationen.
 * Gleiche API für Browser (localStorage) und Tauri.
 */

import { storage } from './index'
import { isTauri } from './providers'

// =============================================================================
// Demo Files
// =============================================================================

const DEMO_FILES: Record<string, string> = {
  'index.mir': `App bg $app.bg, pad $lg.pad, gap $md.gap
  Text "Welcome to Mirror", fs 24, weight bold, col $text.col
  Text "Edit this code to get started", col $muted.col

  Card
    Text "Your first component", col $muted.col
    Button "Click Me"`,

  'tokens.tok': `// Design Tokens

// Background Colors
$primary.bg: #3b82f6
$primary-hover.bg: #2563eb
$surface.bg: #27272a
$app.bg: #18181b

// Text Colors
$text.col: #ffffff
$muted.col: #a1a1aa

// Padding
$sm.pad: 8
$md.pad: 16
$lg.pad: 24

// Gap
$sm.gap: 8
$md.gap: 12
$lg.gap: 16

// Radius
$sm.rad: 4
$md.rad: 8
$lg.rad: 12`,

  'components.com': `// Component Definitions

Card:
  bg $surface.bg, pad $md.pad, rad $md.rad, gap $sm.gap

Button:
  pad $sm.pad $md.pad, bg $primary.bg, rad $sm.rad, col white
  hover bg $primary-hover.bg`
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

// Empty project template (three files, all empty)
const EMPTY_PROJECT: Record<string, string> = {
  'index.mir': '',
  'tokens.tok': '',
  'components.com': ''
}

async function browserNewProject(): Promise<void> {
  // Leeres Projekt mit drei Dateien erstellen
  localStorage.setItem('mirror-files', JSON.stringify(EMPTY_PROJECT))

  // Seite neu laden um sauberen State zu haben
  window.location.reload()
}

async function browserLoadDemo(): Promise<void> {
  // Demo-Files in localStorage speichern
  localStorage.setItem('mirror-files', JSON.stringify(DEMO_FILES))

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
    // Fallback: Demo-Files direkt schreiben
    for (const [path, content] of Object.entries(DEMO_FILES)) {
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
