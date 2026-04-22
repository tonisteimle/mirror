/**
 * Project Actions
 *
 * Abstrakte Schicht für Projekt-Operationen.
 * Gleiche API für Browser (localStorage) und Tauri.
 */

// Lazy import to avoid circular dependency with index.ts
// storage singleton is created in index.ts which re-exports this module
let _storage: typeof import('./index').storage | null = null
function getStorage() {
  if (!_storage) {
    _storage = require('./index').storage
  }
  return _storage
}

import { isTauri } from './providers'
import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('ProjectActions')

// Custom dialog module (loaded globally)
declare const MirrorDialog: {
  alert: (message: string, options?: { title?: string }) => Promise<void>
}

// =============================================================================
// Project Types
// =============================================================================

export type ProjectType = 'empty' | 'demo'

// =============================================================================
// Empty Project Template
// =============================================================================

// Minimal project with just an empty index.mir
export const EMPTY_PROJECT: Record<string, string> = {
  'index.mir': '',
}

// =============================================================================
// Default/Demo Project Template
// =============================================================================

// Simple demo project - shows all file types working together
// Exported for testing
export const DEFAULT_PROJECT: Record<string, string> = {
  // Tokens - Farben und Abstände
  'tokens.tok': `// Design Tokens
primary.bg: #2271C1
primary.ic: #2271C1
surface.bg: #1a1a1a
card.bg: #27272a
muted.col: #888
muted.ic: #888
space.pad: 16
space.gap: 12
radius.rad: 8`,

  // Components - Wiederverwendbare Bausteine
  'components.com': `// Komponenten
Card: bg $card, pad $space, rad $radius, gap 8

Btn as Button: bg $primary, col white, pad 10 16, rad 6, cursor pointer
  hover:
    opacity 0.9`,

  // Data - Strukturierte Daten
  'data.yaml': `// Karten-Daten
cards:
  welcome:
    title: "Willkommen"
    text: "Dies ist ein Demo-Projekt."
    icon: home
  components:
    title: "Komponenten"
    text: "Baue wiederverwendbare UI-Bausteine."
    icon: layers
  preview:
    title: "Live Preview"
    text: "Änderungen sofort sehen."
    icon: eye`,

  // Main Layout - nutzt alles
  'index.mir': `// Demo - zeigt Tokens, Components und Data
Frame bg $surface, col white, pad 24, gap $space, h full

  // Header
  Frame hor, spread, ver-center
    Text "Demo App", fs 20, weight bold
    Icon "settings", ic $muted

  // Karten aus Daten
  each card in $cards
    Card
      Frame hor, gap $space, ver-center
        Icon card.icon, ic $primary, is 20
        Text card.title, fs 16, weight 500
      Text card.text, col $muted, fs 14
      Btn "Mehr"`,
}

// =============================================================================
// Project Actions
// =============================================================================

/**
 * Neues Projekt erstellen
 * @param type - 'empty' für leeres Projekt (default), 'demo' für Demo-Projekt
 */
export async function newProject(type: ProjectType = 'empty'): Promise<void> {
  if (isTauri()) {
    // Tauri: Native Dialog für neuen Ordner
    await tauriNewProject(type)
  } else {
    // Browser: localStorage leeren
    await browserNewProject(type)
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

async function browserNewProject(type: ProjectType): Promise<void> {
  // Projekt-Template basierend auf Typ wählen
  const projectFiles = type === 'empty' ? EMPTY_PROJECT : DEFAULT_PROJECT
  localStorage.setItem('mirror-files', JSON.stringify(projectFiles))

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
  return new Promise(resolve => {
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
        const relativePath = file.webkitRelativePath.replace(rootFolder + '/', '')

        try {
          const content = await file.text()
          projectFiles[relativePath] = content
        } catch (err) {
          log.warn(`Failed to read ${file.name}:`, err)
        }
      }

      if (Object.keys(projectFiles).length === 0) {
        await MirrorDialog.alert('Keine Mirror-Dateien (.mir, .tok, .com) im Ordner gefunden.', {
          title: 'Import fehlgeschlagen',
        })
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
    await MirrorDialog.alert('Keine Dateien zum Exportieren.', { title: 'Export fehlgeschlagen' })
    return
  }

  const files: Record<string, string> = JSON.parse(stored)

  // ZIP erstellen und downloaden
  await downloadAsZip(files, 'mirror-project.zip')
}

// =============================================================================
// Tauri Implementation (Stubs - werden von tauri-bridge.js überschrieben)
// =============================================================================

async function tauriNewProject(type: ProjectType): Promise<void> {
  // Wird von Tauri überschrieben
  const tauriBridge = (window as any).__TAURI_BRIDGE__
  if (tauriBridge?.newProject) {
    await tauriBridge.newProject(type)
  } else {
    log.warn('Tauri bridge not available')
  }
}

async function tauriLoadDemo(): Promise<void> {
  const tauriBridge = (window as any).__TAURI_BRIDGE__
  if (tauriBridge?.loadDemo) {
    await tauriBridge.loadDemo()
  } else {
    // Fallback: Default-Project direkt schreiben
    const storage = getStorage()
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
  const extensions = [
    '.mir',
    '.mirror',
    '.tok',
    '.tokens',
    '.com',
    '.components',
    '.data',
    '.yaml',
    '.yml',
  ]
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
  export: exportProject,
}
