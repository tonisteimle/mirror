/**
 * Project Actions
 *
 * Abstrakte Schicht für Projekt-Operationen.
 * Gleiche API für Browser (localStorage) und Tauri.
 */

// Lazy import to avoid circular dependency with index.ts
// storage singleton is created in index.ts which re-exports this module
let _storage: typeof import('./index').storage | null = null
function getStorage(): typeof import('./index').storage {
  if (!_storage) {
    _storage = require('./index').storage
  }
  return _storage as typeof import('./index').storage
}

import { isTauri } from './providers'
import { createLogger } from '../../compiler/utils/logger'

// Lazy-load tauri-bridge inside the tauriXProject branches. The bridge
// module has top-level side effects (assigns window.TauriBridge) that
// pollute the vitest+jsdom test environment when spies on document.*
// are active in unrelated tests — pulling it in only when the Tauri
// branch is actually taken keeps the browser-path tests isolated.
type TauriBridgeModule = typeof import('../tauri-bridge')
async function loadTauriBridge(): Promise<TauriBridgeModule> {
  return import('../tauri-bridge')
}

const log = createLogger('ProjectActions')

// Custom dialog module (loaded globally)
declare const MirrorDialog: {
  alert: (message: string, options?: { title?: string }) => Promise<void>
  prompt: (
    message: string,
    options?: { title?: string; defaultValue?: string; placeholder?: string; confirmLabel?: string }
  ) => Promise<string | null>
}

// =============================================================================
// Project Types
// =============================================================================

export type ProjectType = 'empty' | 'demo'

// =============================================================================
// Empty Project Template
// =============================================================================

// Minimal project: four empty files matching the editor's four tabs.
// Multi-File-Roadmap: all files use the unified `.mir` extension. The
// compiler classifies content (not filenames), so naming is purely
// convention. The four canonical names are preserved as a familiar
// starting structure — the user can rename or add files freely.
export const EMPTY_PROJECT: Record<string, string> = {
  'data.mir': '',
  'tokens.mir': '',
  'components.mir': '',
  'app.mir': '',
}

// =============================================================================
// Default/Demo Project Template
// =============================================================================

// Multi-file demo project: each file maps 1:1 to one editor tab.
// "Tagesroutine" — daily-routine tracker. Showcases every Mirror
// technique we want a generated app to be able to use:
// data tables, each-loops, ternary conditionals, exclusive()
// bottom-nav, grid (7-day Verlauf, 2-col KPI), aggregations,
// custom toggle states, increment/decrement, Input bind, Dialog
// with overlay+backdrop, anim pulse/bounce, toast feedback.
//
// Five-Prinzipien-Check: tokens drive every value (no hex in
// components.mir or app.mir), no Frame in layout (sprechende
// Namen via `as Frame`), slot-names are roles (Title/StreakIcon/…),
// layout flat (no single-child wrappers).
export const DEFAULT_PROJECT: Record<string, string> = {
  'data.mir': `// 6 tägliche Routinen mit aktuellem Status
routines:
  med:
    icon: sparkles
    title: Meditation
    goal: 10
    done: true
    streak: 12
  run:
    icon: activity
    title: Sport
    goal: 30
    done: false
    streak: 3
  morn:
    icon: sun
    title: Morgenroutine
    goal: 5
    done: true
    streak: 28
  read:
    icon: book-open
    title: Lesen
    goal: 20
    done: false
    streak: 7
  walk:
    icon: trees
    title: Spaziergang
    goal: 15
    done: true
    streak: 2
  diary:
    icon: pen-line
    title: Tagebuch
    goal: 5
    done: false
    streak: 4

// 7-Tage Verlauf
history:
  mo:
    day: Mo
    count: 5
  di:
    day: Di
    count: 4
  mi:
    day: Mi
    count: 6
    today: true
  do:
    day: Do
    count: 3
  fr:
    day: Fr
    count: 5
  sa:
    day: Sa
    count: 6
  so:
    day: So
    count: 2

// Einstellungen
notifications: true
weekStartsMonday: true
goalPerDay: 5
remindHour: 7

// UI-State
showAddDialog: false
newRoutineName: ""`,

  'tokens.mir': `// Warm Dark Palette — dunkel, aber wärmer als pure Tech-Blue.

// Backgrounds (warm tones)
surface.bg: #1a1410
card.bg: #2a201a
elev.bg: #322820
nav.bg: #1a1410
glow.bg: #f59e0b22

// Accent — sun amber (col + ic = amber; bg also amber for buttons)
accent.bg: #f59e0b
accent.col: #f59e0b
accent.ic: #f59e0b

// "Auf-Accent" = Text/Inhalt auf accent-bg (z. B. Button-Label).
onAccent.col: #1a1410

// Status
success.bg: #10b981
success.ic: #10b981
danger.ic: #ef4444

// Text
text.col: #fef3c7
muted.col: #a8a29e
dim.col: #57534e

// Typography sizes
hero.fs: 28
title.fs: 22
heading.fs: 16
body.fs: 14
small.fs: 12
counter.fs: 32

// Weights
medium.weight: 500
bold.weight: 700

// Spacing
view.pad: 20
card.pad: 16
gap.gap: 12
small.gap: 6
nav.pad: 10

// Radius
radius.rad: 12
ctrl.rad: 8
pill.rad: 99

// Sizes
icon.is: 22
big.is: 28
hero.is: 48
daycell.h: 88
kpi.h: 84

// Effects
dim.opacity: 0.85
press.scale: 0.97`,

  'components.mir': `// ── App-Shell (Screens + Bottom-Nav) ──────────────────────────────────

App as Frame: ver, h full
Screen as Frame: grow, scroll, pad $view, gap $gap

// ── Container (Frame mit sprechendem Namen) ──────────────────────────

View as Frame: pad $view, gap $gap, h full
Hero as Frame: gap $small, ver-center
TopBar as Frame: hor, ver-center, spread, gap $gap, w full

// ── Cards & Rows ──────────────────────────────────────────────────────

Card as Frame: bg $card, pad $card, rad $radius, gap $gap, w full
RoutineRow as Frame: hor, gap $gap, ver-center
RoutineMeta as Frame: gap $small, grow

// ── Typography (Text mit Rolle) ───────────────────────────────────────

H1 as Text: fs $hero, weight $bold, col $text
H2 as Text: fs $title, weight $bold, col $text
H3 as Text: fs $heading, weight $medium, col $text
Body as Text: fs $body, col $text
Hint as Text: fs $small, col $muted

// ── Icons ─────────────────────────────────────────────────────────────

RoutineIcon as Icon: ic $accent, is $icon
RoutineIconDone as Icon: ic $success, is $icon
HeroIcon as Icon: ic $accent, is $hero
NavIcon as Icon: is $icon

// ── Buttons ───────────────────────────────────────────────────────────

Btn as Button: bg $accent, col $onAccent, pad $nav, rad $ctrl, weight $medium, cursor pointer
  hover:
    opacity $dim

GhostBtn as Button: bg transparent, col $muted, pad $nav, rad $ctrl, cursor pointer
  hover:
    col $text

// ── Bottom-Nav (exclusive, nur ein Tab gleichzeitig aktiv) ────────────

BottomNav as Frame: hor, gap $small, bg $nav, pad $nav, bor 1 0 0 0, boc $card

NavBtn as Frame: ver, gap $small, hor-center, ver-center, pad $small, rad $ctrl, col $muted, cursor pointer, exclusive(), grow
  hover:
    col $text
  selected:
    col $accent

NavLabel as Text: fs $small, weight $medium

// ── Check-Circle (toggleable) ─────────────────────────────────────────

RoutineCheck as Frame: w 28, h 28, rad $pill, bor 2, boc $muted, cursor pointer, center, toggle()
  on 0.2s ease-out:
    bg $success
    boc $success
    Icon "check", ic $text, is 16
    anim bounce

// ── Streak-Pill (Flame-Icon + Tage) ───────────────────────────────────

StreakPill as Frame: hor, gap $small, ver-center, bg $glow, pad 4 8, rad $pill, w hug
StreakIcon as Icon: ic $accent, is 14, anim pulse
StreakText as Text: fs $small, col $accent, weight $medium

// DonePill — Pendant zur StreakPill für erledigte Routinen.
DonePill as Frame: hor, gap $small, ver-center, bg $success, pad 4 8, rad $pill, w hug
DoneIcon as Icon: ic $text, is 14
DoneText as Text: fs $small, col $text, weight $medium

// ── Verlauf-Grid (7 Tages-Zellen) ────────────────────────────────────

WeekGrid as Frame: grid 7, gap $small, w full
DayCell as Frame: ver, ver-center, hor-center, gap $small, h $daycell, rad $ctrl, pad $small 0
DayLabel as Text: fs $small, col $muted, weight $medium
DayCount as Text: fs $heading, weight $bold, col $accent

// ── Stats KPI-Grid (2 Spalten) ───────────────────────────────────────

KpiGrid as Frame: grid 2, gap $gap, w full
KpiTile as Frame: ver, gap $small, bg $card, pad $card, rad $radius
KpiLabel as Text: fs $small, col $muted, weight $medium
KpiValue as Frame: hor, gap $small, ver-center
KpiNumber as Text: fs $counter, weight $bold, col $accent
KpiUnit as Text: fs $small, col $muted

// ── Top-Routinen-Zeile (sortiert nach Streak) ───────────────────────

TopRow as Frame: hor, spread, ver-center, pad $small 0
TopName as Text: fs $body, col $text, grow
TopStreak as Text: fs $body, col $accent, weight $medium

// ── Settings-Zeile (Label + Control) ─────────────────────────────────

SettingRow as Frame: hor, spread, ver-center, pad $small 0
SettingLabel as Text: fs $body, col $text, grow

// ── Toggle-Pille (eigener Switch — toggle() Frame) ─────────────────

TogglePill as Frame: w 44, h 24, rad $pill, bg $card, bor 1, boc $muted, cursor pointer, toggle()
  on:
    bg $accent
    boc $accent

// ── Stepper (− / Wert / +) ───────────────────────────────────────────

Stepper as Frame: hor, gap $gap, ver-center
StepperBtn as Button: w 36, h 36, rad $pill, bg $elev, col $text, cursor pointer, center, fs $heading, weight $bold
  hover:
    opacity $dim
StepperValue as Text: fs $title, weight $bold, col $accent, w 48, center

// ── Icon-Button (rund, für + / − etc.) ──────────────────────────────

IconBtn as Button: w 40, h 40, rad $pill, bg $accent, col $onAccent, cursor pointer, center, fs $title, weight $bold
  hover:
    opacity $dim

// ── Dialog (Overlay + Panel + Actions) ───────────────────────────────

DialogOverlay as Frame: abs, x 0, y 0, w full, h full, hor-center, ver-center, bg rgba(0,0,0,0.7)
DialogPanel as Frame: bg $elev, pad $card, rad $radius, gap $gap, w 280, shadow lg
DialogActions as Frame: hor, gap $small`,

  'app.mir': `canvas mobile, bg $surface, col $text, font sans

App
  Screen name HeuteScreen
    TopBar
      RoutineMeta
        H1 "Heute"
        Hint "Mittwoch, 7. Mai"
      IconBtn "+", show(NewRoutineDialog)

    each routine in $routines
      Card
        RoutineRow
          if routine.done
            RoutineIconDone routine.icon
          else
            RoutineIcon routine.icon
          RoutineMeta
            H3 routine.title, col routine.done ? $muted : $text
            if routine.done
              DonePill
                DoneIcon "check"
                DoneText "Erledigt"
            else
              StreakPill
                StreakIcon "flame"
                StreakText "$routine.streak Tage"
          RoutineCheck

  Screen name VerlaufScreen, hidden
    H1 "Verlauf"
    Hint "Letzte 7 Tage"

    WeekGrid
      each day in $history
        DayCell bg day.today ? $glow : $card
          DayLabel day.day
          DayCount day.count

    Card
      H3 "Diese Woche"
      Hint "31 von 42 Routinen erledigt — 74% Quote"

  Screen name StatsScreen, hidden
    H1 "Stats"
    Hint "Deine Routinen-Übersicht"

    KpiGrid
      KpiTile
        KpiLabel "Routinen aktiv"
        KpiValue
          KpiNumber "$routines.count"
          KpiUnit "Stück"
      KpiTile
        KpiLabel "Längste Serie"
        KpiValue
          KpiNumber "28"
          KpiUnit "Tage"
      KpiTile
        KpiLabel "Diese Woche"
        KpiValue
          KpiNumber "31"
          KpiUnit "von 42"
      KpiTile
        KpiLabel "Quote"
        KpiValue
          KpiNumber "74"
          KpiUnit "%"

    Card
      H3 "Top Routinen"
      Hint "Sortiert nach Streak"
      each routine in $routines by streak desc
        TopRow
          TopName routine.title
          TopStreak "$routine.streak Tage"

  Screen name MehrScreen, hidden
    H1 "Mehr"
    Hint "Einstellungen & Profil"

    Card
      H3 "Benachrichtigungen"
      SettingRow
        SettingLabel "Tägliche Erinnerung"
        TogglePill on
      SettingRow
        SettingLabel "Streak-Warnung"
        TogglePill on
      SettingRow
        SettingLabel "Wochenrückblick"
        TogglePill

    Card
      H3 "Tagesziel"
      Hint "Wieviele Routinen pro Tag?"
      Stepper
        StepperBtn "−", decrement(goalPerDay)
        StepperValue "$goalPerDay"
        StepperBtn "+", increment(goalPerDay)

    Card
      H3 "Profil"
      SettingLabel "Name"
      Input bind newRoutineName, placeholder "Dein Name…", w full

    Card
      H3 "Über"
      Hint "Tagesroutine v1.0 · gebaut mit Mirror DSL"

  BottomNav
    NavBtn show(HeuteScreen), hide(VerlaufScreen), hide(StatsScreen), hide(MehrScreen), selected
      NavIcon "home"
      NavLabel "Heute"
    NavBtn show(VerlaufScreen), hide(HeuteScreen), hide(StatsScreen), hide(MehrScreen)
      NavIcon "calendar"
      NavLabel "Verlauf"
    NavBtn show(StatsScreen), hide(HeuteScreen), hide(VerlaufScreen), hide(MehrScreen)
      NavIcon "bar-chart-3"
      NavLabel "Stats"
    NavBtn show(MehrScreen), hide(HeuteScreen), hide(VerlaufScreen), hide(StatsScreen)
      NavIcon "settings"
      NavLabel "Mehr"

// "Neue Routine" Dialog — Overlay deckt Bildschirm, Panel zentriert.
DialogOverlay name NewRoutineDialog, hidden
  DialogPanel
    H2 "Neue Routine"
    Hint "Was willst du täglich tun?"
    Input bind newRoutineName, placeholder "z. B. Yoga", w full

    SettingRow
      SettingLabel "Tagesziel"
      Stepper
        StepperBtn "−", decrement(goalPerDay)
        StepperValue "$goalPerDay"
        StepperBtn "+", increment(goalPerDay)

    DialogActions
      GhostBtn "Abbrechen", hide(NewRoutineDialog), grow
      Btn "Hinzufügen", hide(NewRoutineDialog), toast("Routine hinzugefügt!", "success"), grow`,
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

// Force a server-fresh reload (bypasses cached index.html so the browser
// picks up new cache-buster query params on its next render). Plain
// window.location.reload() may serve cached HTML, in which case the user
// keeps loading the OLD app.js — which after a reset writes the OLD demo
// content into localStorage and the screen ends up blank.
function reloadFresh(): void {
  const u = new URL(window.location.href)
  u.searchParams.set('_r', String(Date.now()))
  window.location.replace(u.toString())
}

async function browserNewProject(type: ProjectType): Promise<void> {
  // Projekt-Template basierend auf Typ wählen
  const projectFiles = type === 'empty' ? EMPTY_PROJECT : DEFAULT_PROJECT
  localStorage.setItem('mirror-files', JSON.stringify(projectFiles))

  reloadFresh()
}

async function browserLoadDemo(): Promise<void> {
  // Demo = Default Project (same thing now)
  localStorage.setItem('mirror-files', JSON.stringify(DEFAULT_PROJECT))

  reloadFresh()
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
// Tauri Implementation
// =============================================================================
//
// `tauriLoadDemo` writes the default-project to the on-disk storage.
// `tauriNewProject` is wired through TauriDialog + TauriProject (see
// docs/concepts/tauri-strategy.md Slice 1, decided 2026-05-10).
// `tauriImportProject` and `tauriExportProject` are still stubs —
// queued as Slices 2 + 3 of the Tauri-commit-plan.

async function tauriNewProject(type: ProjectType): Promise<void> {
  // 1. Project name (text input)
  const name = await MirrorDialog.prompt('Projektname:', {
    title: 'Neues Mirror-Projekt',
    placeholder: 'mein-projekt',
    confirmLabel: 'Weiter',
  })
  if (!name) return // user cancelled
  if (!/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(name)) {
    await MirrorDialog.alert(
      'Projektname darf nur Buchstaben, Zahlen, Punkt, Bindestrich und Unterstrich enthalten.',
      { title: 'Ungültiger Name' }
    )
    return
  }

  // Tauri-only path; lazy-load to keep the bridge module out of the
  // browser-path test environment (see loadTauriBridge comment).
  const { TauriDialog, TauriProject, TauriFS } = await loadTauriBridge()

  // 2. Parent directory (native folder picker)
  let parentDir: string | null
  try {
    parentDir = await TauriDialog.openFolder()
  } catch (err) {
    log.error('TauriDialog.openFolder failed:', err)
    await MirrorDialog.alert(`Ordner-Dialog fehlgeschlagen: ${err}`, { title: 'Fehler' })
    return
  }
  if (!parentDir) return // user cancelled

  // 3. Create the project directory + seed file (Rust-side)
  let projectPath: string
  try {
    projectPath = (await TauriProject.createProject(name, parentDir)) as string
  } catch (err) {
    log.error('TauriProject.createProject failed:', err)
    await MirrorDialog.alert(`Projekt konnte nicht erstellt werden: ${err}`, { title: 'Fehler' })
    return
  }

  // 4. For 'demo' type, drop in the DEFAULT_PROJECT files. For 'empty'
  //    type, drop in EMPTY_PROJECT (four canonical empty files). Both
  //    sit alongside the Rust-seeded `index.mir`.
  const filesToWrite: Record<string, string> = type === 'demo' ? DEFAULT_PROJECT : EMPTY_PROJECT
  for (const [relPath, content] of Object.entries(filesToWrite)) {
    const absPath = `${projectPath}/${relPath}`
    try {
      await TauriFS.writeFile(absPath, content)
    } catch (err) {
      // Non-fatal: the project directory exists, this just means one
      // seed file failed. Log + keep going so the user still gets the
      // project they asked for.
      log.warn(`Could not write seed file ${relPath}:`, err)
    }
  }

  // 5. Open the new project as the active one (sets base path + recents)
  try {
    await TauriProject.openProject(projectPath)
  } catch (err) {
    log.error('TauriProject.openProject failed:', err)
    await MirrorDialog.alert(
      `Projekt erstellt unter ${projectPath}, aber konnte nicht geöffnet werden: ${err}`,
      { title: 'Warnung' }
    )
    return
  }

  // 6. Reload the app so the file-tree picks up the new project
  reloadFresh()
}

async function tauriLoadDemo(): Promise<void> {
  // Default-Project direkt in den Tauri-Storage schreiben.
  const storage = getStorage()
  for (const [path, content] of Object.entries(DEFAULT_PROJECT)) {
    await storage.writeFile(path, content)
  }
  await storage.refreshTree()
}

async function tauriImportProject(): Promise<boolean> {
  // Tauri-only path; lazy-load (see loadTauriBridge comment).
  const { TauriDialog, TauriProject } = await loadTauriBridge()

  // 1. Folder picker — let the user pick the project root on disk.
  let projectPath: string | null
  try {
    projectPath = await TauriDialog.openFolder()
  } catch (err) {
    log.error('TauriDialog.openFolder failed:', err)
    await MirrorDialog.alert(`Ordner-Dialog fehlgeschlagen: ${err}`, { title: 'Fehler' })
    return false
  }
  if (!projectPath) return false // user cancelled

  // 2. Open the project (sets base path + adds to recents). The Rust
  //    side canonicalises + verifies it's a directory.
  try {
    await TauriProject.openProject(projectPath)
  } catch (err) {
    log.error('TauriProject.openProject failed:', err)
    await MirrorDialog.alert(`Projekt konnte nicht geöffnet werden: ${err}`, { title: 'Fehler' })
    return false
  }

  // 3. Reload so file-tree + storage adapter see the new base path.
  reloadFresh()
  return true
}

async function tauriExportProject(): Promise<void> {
  // In Tauri, files live on disk in the user's git repo — there's
  // nothing to "export" the way the browser path zips up localStorage.
  // The Spec-Bundle-via-Claude flow (Mirror → React/Vue/Svelte/Vanilla)
  // is wired separately on the toolbar via `initExportButton` →
  // TauriAgent.runAgent, not on the menu Export Project entry.
  //
  // Show a toast so the user gets clear feedback that the action
  // completed (their files are already on disk + git-tracked); add a
  // pointer to the Spec-Bundle export they probably want.
  await MirrorDialog.alert(
    'Dein Projekt ist bereits auf der Disk gespeichert (Git-Repo). ' +
      'Für den Export zu React / Vue / Svelte / Vanilla nutze den ' +
      '"Export"-Knopf in der Toolbar.',
    { title: 'Auto-saved' }
  )
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
async function loadJSZip(): Promise<NonNullable<typeof window.JSZip>> {
  // Prüfen ob bereits geladen
  if (window.JSZip) {
    return window.JSZip
  }

  // Script laden
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
    script.onload = () => {
      if (window.JSZip) {
        resolve(window.JSZip)
      } else {
        reject(new Error('JSZip loaded but global not available'))
      }
    }
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
