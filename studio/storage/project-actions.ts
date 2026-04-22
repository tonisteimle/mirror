/**
 * Project Actions
 *
 * Abstrakte Schicht für Projekt-Operationen.
 * Gleiche API für Browser (localStorage) und Tauri.
 */

import { storage } from './index'
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

// Used for demo projects - includes starter tokens, components, and layout
// Uses canvas keyword for app-level styling with device presets
// Exported for testing
export const DEFAULT_PROJECT: Record<string, string> = {
  'index.mir': `canvas mobile, bg $canvas, col $text, font $font

// Header
Frame hor, spread, ver-center, pad $m
  Text "Mirror Demo", fs $l, weight bold
  Frame hor, gap $s
    Icon "sun", ic $muted, is 20
    Switch "Theme"
      Label: hidden

// Navigation Tabs
Tabs defaultValue "Home"
  Tab "Home"
    Frame pad $l, gap $l
      Card
        Text "Willkommen!", fs $l, weight bold
        TextMuted "Dies ist ein Demo-Projekt mit verschiedenen Komponenten."
        PrimaryBtn "Mehr erfahren"

      Card
        Text "Quick Stats", fs $m, weight 500
        Frame hor, gap $l, wrap
          StatBox
            Text "4", fs $xxl, weight bold, col $accent
            TextMuted "Aufgaben"
          StatBox
            Text "2", fs $xxl, weight bold, col #10b981
            TextMuted "Erledigt"

  Tab "Tasks"
    Frame pad $l, gap $m
      Frame hor, spread, ver-center
        Text "Aufgaben", fs $l, weight bold
        PrimaryBtn "Neu", pad $s $m, fs $s

      each task in $tasks
        TaskItem
          Frame w 20, h 20, rad 4, bor 1, boc $border, center
            Icon task.done ? "check" : "", ic $accent, is 14
          Text task.title, col task.done ? $muted : $text
          Icon "trash-2", ic $muted, is 16, cursor pointer

  Tab "Settings"
    Frame pad $l, gap $l
      Card
        Text "Einstellungen", fs $l, weight bold, mar 0 0 $m 0

        SettingRow
          Frame gap $s
            Text "Dark Mode"
            TextMuted "Dunkles Farbschema verwenden"
          Switch "Dark Mode"
            Label: hidden

        Divider

        SettingRow
          Frame gap $s
            Text "Benachrichtigungen"
            TextMuted "Push-Benachrichtigungen aktivieren"
          Switch "Notifications"
            Label: hidden

        Divider

        SettingRow
          Frame gap $s
            Text "Sprache"
            TextMuted "Anzeigesprache wählen"
          Select placeholder "Wählen..."
            Item "Deutsch"
            Item "English"
            Item "Français"

// Info Dialog
Dialog
  Trigger: Link "Über Mirror", col $accent, fs $s, pad $m
  Backdrop: bg rgba(0,0,0,0.7)
  Content: Frame w 300, bg $surface, pad $l, rad $m, gap $m
    Text "Über Mirror", fs $l, weight bold
    TextMuted "Mirror ist eine DSL für AI-unterstütztes UI-Design. Erstelle Interfaces durch einfache, lesbare Syntax."
    Frame hor, gap $s
      CloseTrigger: GhostBtn "Schließen", grow
      CloseTrigger: PrimaryBtn "OK", grow`,

  'tokens.tok': `// Theme Tokens

// Typography
font: Inter, system-ui, -apple-system, sans-serif

s.fs: 12
m.fs: 14
l.fs: 18
xl.fs: 24
xxl.fs: 32

// Colors
accent.bg: #5BA8F5
success.bg: #10b981
warning.bg: #f59e0b
danger.bg: #ef4444
surface.bg: #27272a
canvas.bg: #18181b
input.bg: #1f1f1f
text.col: #ffffff
muted.col: #71717a
border.boc: #3f3f46
focus.boc: #5BA8F5

// Spacing
s.pad: 4
m.pad: 8
l.pad: 16
xl.pad: 24

s.gap: 4
m.gap: 8
l.gap: 16
xl.gap: 24

// Radius
s.rad: 4
m.rad: 8
l.rad: 12`,

  'components.com': `// Component Definitions

// Typography
Title: fs $xl, weight bold
TextMuted: fs $m, col $muted

// Buttons
PrimaryBtn as Button: pad $m $l, bg $accent, rad $s, col white, cursor pointer
  hover:
    bg #2271C1

GhostBtn as Button: pad $m $l, bg transparent, rad $s, col $muted, cursor pointer
  hover:
    bg $surface
    col $text

DangerBtn as Button: pad $m $l, bg $danger, rad $s, col white, cursor pointer
  hover:
    bg #dc2626

// Layout Components
Card: bg $surface, pad $l, rad $m, gap $m

StatBox: bg $canvas, pad $m, rad $s, center

SettingRow: hor, spread, ver-center, pad $s 0

TaskItem: hor, gap $m, ver-center, pad $m, bg $surface, rad $s
  hover:
    bg #333

// Form
Input: pad $m, bg $input, rad $s, bor 1, boc $border
  focus:
    boc $focus`,

  'data.data': `// Demo Data

tasks:
  task1:
    title: "Design Review abschließen"
    done: true
  task2:
    title: "Komponenten dokumentieren"
    done: false
  task3:
    title: "Tests schreiben"
    done: false
  task4:
    title: "Deployment vorbereiten"
    done: true

sales:
  Jan: 120
  Feb: 180
  Mar: 240
  Apr: 200
  May: 280
  Jun: 320

products:
  laptop:
    name: "Laptop Pro"
    price: 1299
    stock: 45
  phone:
    name: "SmartPhone X"
    price: 899
    stock: 120
  tablet:
    name: "Tablet Air"
    price: 599
    stock: 80

categories:
  electronics: 45
  clothing: 32
  books: 18
  home: 25

traffic:
  Mon: 1200
  Tue: 1450
  Wed: 1380
  Thu: 1520
  Fri: 1680
  Sat: 980
  Sun: 750`,
}

// =============================================================================
// Project Actions
// =============================================================================

/**
 * Neues Projekt erstellen
 * @param type - 'empty' für leeres Projekt, 'demo' für Demo-Projekt
 */
export async function newProject(type: ProjectType = 'demo'): Promise<void> {
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
