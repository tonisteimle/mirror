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

  'tokens.mir': `// iOS Light Palette — Apple's stock-app look (Reminders, Health, Fitness).

// Backgrounds
surface.bg: #F2F2F7        // systemGroupedBackground
card.bg: #FFFFFF           // secondarySystemGroupedBackground
elev.bg: #FFFFFF           // sheets / dialogs
nav.bg: #F9F9F9            // tabBar (mit subtilem Top-Hairline)
glow.bg: #007AFF1A         // 10% Blue für today-Highlight

// Tint — systemBlue
accent.bg: #007AFF
accent.col: #007AFF
accent.ic: #007AFF

// Auf-Accent = Text auf accent-bg (Button-Label).
onAccent.col: #FFFFFF

// Status
success.bg: #34C759         // systemGreen
success.ic: #34C759
danger.ic: #FF3B30          // systemRed

// Text
text.col: #000000           // labelColor (light mode)
muted.col: #8E8E93          // secondaryLabel
dim.col: #C7C7CC            // tertiaryLabel / separator-like

// Typography (iOS-Skala in pt ≈ px im Web)
hero.fs: 34                 // Large Title
title.fs: 22                // Title 2
heading.fs: 17              // Headline
body.fs: 17                 // Body
small.fs: 13                // Footnote
counter.fs: 28              // Numerische Kennzahlen

// Weights
medium.weight: 500
bold.weight: 600            // semibold (iOS-Headlines)

// Spacing (iOS lehnt 16pt-Raster)
view.pad: 16
card.pad: 16
gap.gap: 12
small.gap: 8
nav.pad: 6

// Radius — iOS-Cards ≈ 10
radius.rad: 10
ctrl.rad: 8
pill.rad: 99

// Sizes
icon.is: 22
big.is: 28
hero.is: 28
daycell.h: 72
kpi.h: 88

// Effects
dim.opacity: 0.85
press.scale: 0.97`,

  'components.mir': `// ── App-Shell (Screens + Bottom-Nav) ──────────────────────────────────

@icon app-window, @group Shell
App as Frame: ver, h full, bg $surface

@icon layout, @group Shell
Screen as Frame: grow, scroll, pad $view, gap $gap

// ── Container (Frame mit sprechendem Namen) ──────────────────────────

@icon panel-top, @group Shell
TopBar as Frame: hor, ver-center, spread, gap $gap, w full, pad-t 8, pad-b 4

@hidden
TitleBlock as Frame: gap 2

// ── Cards & Rows ──────────────────────────────────────────────────────

@icon square, @group Layout
Card as Frame: bg $card, pad $card, rad $radius, gap $gap, w full

@hidden
RoutineRow as Frame: hor, gap $gap, ver-center

@hidden
RoutineMeta as Frame: gap 2, grow

// ── Typography (iOS-Skala) ────────────────────────────────────────────

@icon heading-1, @group Typography
H1 as Text: fs $hero, weight $bold, col $text

@icon heading-2, @group Typography
H2 as Text: fs $title, weight $bold, col $text

@icon heading-3, @group Typography
H3 as Text: fs $heading, weight $bold, col $text

@icon type, @group Typography
Body as Text: fs $body, col $text

@icon text-quote, @group Typography
Hint as Text: fs $small, col $muted

@icon list, @group Typography
SectionLabel as Text: fs $small, col $muted, weight $medium, uppercase, letter 0.4, pad-l 4

// ── Icons ─────────────────────────────────────────────────────────────

@hidden
RoutineIcon as Icon: ic $accent, is $icon

@hidden
RoutineIconDone as Icon: ic $success, is $icon

@hidden
HeroIcon as Icon: ic $accent, is $hero

@hidden
NavIcon as Icon: is $icon

// ── Buttons ───────────────────────────────────────────────────────────

@icon square-mouse-pointer, @group Buttons
Btn as Button: bg $accent, col $onAccent, pad 10 16, rad $ctrl, weight $bold, cursor pointer, fs $body
  hover:
    opacity $dim

@icon mouse-pointer, @group Buttons
GhostBtn as Button: bg transparent, col $accent, pad 10 16, rad $ctrl, cursor pointer, fs $body, weight $medium
  hover:
    opacity $dim

@icon plus-circle, @group Buttons
IconBtn as Button: w 30, h 30, rad $pill, bg transparent, col $accent, cursor pointer, center, fs $title, weight $medium
  hover:
    opacity $dim

// ── Bottom-Nav (iOS Tab Bar) ─────────────────────────────────────────

@icon panel-bottom, @group Navigation
BottomNav as Frame: hor, gap 0, bg $nav, pad 6 0, bor 1 0 0 0, boc $dim

@icon square, @group Navigation
NavBtn as Frame: ver, gap 2, hor-center, ver-center, pad 6 0, col $muted, cursor pointer, exclusive(), grow
  hover:
    col $text
  selected:
    col $accent

@hidden
NavLabel as Text: fs 10, weight $medium

// ── Check-Circle (toggleable) ─────────────────────────────────────────

@icon check-circle, @group Forms
RoutineCheck as Frame: w 28, h 28, rad $pill, bor 1, boc $dim, cursor pointer, center, toggle()
  on 0.15s ease-out:
    bg $success
    boc $success
    Icon "check", ic white, is 16

// ── Streak / Done Indicator (dezent, iOS-Stil) ───────────────────────

@hidden
StreakText as Text: fs $small, col $muted

@hidden
DoneText as Text: fs $small, col $success, weight $medium

// ── Verlauf-Grid (7 Tages-Zellen) ────────────────────────────────────

@icon calendar-days, @group Layout
WeekGrid as Frame: grid 7, gap $small, w full

@icon calendar, @group Layout
DayCell as Frame: ver, ver-center, hor-center, gap $small, h $daycell, rad $ctrl, bg $card, pad $small 0

@hidden
DayLabel as Text: fs $small, col $muted, weight $medium

@hidden
DayCount as Text: fs $heading, weight $bold, col $accent

// ── Stats KPI-Grid (2 Spalten) ───────────────────────────────────────

@icon layout-grid, @group Layout
KpiGrid as Frame: grid 2, gap $gap, w full

@icon square-stack, @group Layout
KpiTile as Frame: ver, gap 4, bg $card, pad $card, rad $radius

@hidden
KpiLabel as Text: fs $small, col $muted, weight $medium

@hidden
KpiValue as Frame: hor, gap 4, ver-baseline

@hidden
KpiNumber as Text: fs $counter, weight $bold, col $text

@hidden
KpiUnit as Text: fs $small, col $muted

// ── Top-Routinen-Zeile (sortiert nach Streak) ───────────────────────

@hidden
TopRow as Frame: hor, spread, ver-center, pad 6 0

@hidden
TopName as Text: fs $body, col $text, grow

@hidden
TopStreak as Text: fs $body, col $muted

// ── Settings-Zeile (Label + Control) ─────────────────────────────────

@icon settings, @group Forms
SettingRow as Frame: hor, spread, ver-center, pad 6 0

@hidden
SettingLabel as Text: fs $body, col $text, grow

// ── iOS-Switch (gerundete Pille mit Thumb) ──────────────────────────

@icon toggle-right, @group Forms
TogglePill as Frame: w 51, h 31, rad $pill, bg $dim, cursor pointer, toggle()
  on:
    bg $success

// ── Stepper (− / Wert / +) — iOS-typisch grau, nicht akzentuiert ────

@icon minus-plus, @group Forms
Stepper as Frame: hor, gap $gap, ver-center

@hidden
StepperBtn as Button: w 32, h 32, rad $pill, bg $surface, col $accent, cursor pointer, center, fs $heading, weight $bold, bor 1, boc $dim
  hover:
    opacity $dim

@hidden
StepperValue as Text: fs $title, weight $bold, col $text, w 40, center

// ── Dialog (Overlay + Panel + Actions) ───────────────────────────────

@icon square-stack, @group Overlay
DialogOverlay as Frame: abs, x 0, y 0, w full, h full, hor-center, ver-center, bg rgba(0,0,0,0.4)

@icon message-square, @group Overlay
DialogPanel as Frame: bg $elev, pad $card, rad 14, gap $gap, w 280, shadow lg

@hidden
DialogActions as Frame: hor, gap $small`,

  'app.mir': `canvas mobile, bg $surface, col $text, font sans

App
  Screen name HeuteScreen
    TopBar
      TitleBlock
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
              DoneText "Erledigt"
            else
              StreakText "$routine.streak Tage Streak"
          RoutineCheck

  Screen name VerlaufScreen, hidden
    TitleBlock
      H1 "Verlauf"
      Hint "Letzte 7 Tage"

    WeekGrid
      each day in $history
        DayCell bg day.today ? $glow : $card
          DayLabel day.day
          DayCount day.count

    SectionLabel "Zusammenfassung"
    Card
      H3 "Diese Woche"
      Hint "31 von 42 Routinen erledigt — 74% Quote"

  Screen name StatsScreen, hidden
    TitleBlock
      H1 "Stats"
      Hint "Deine Routinen-Übersicht"

    KpiGrid
      KpiTile
        KpiLabel "Aktiv"
        KpiValue
          KpiNumber "$routines.count"
          KpiUnit "Routinen"
      KpiTile
        KpiLabel "Längste Serie"
        KpiValue
          KpiNumber "28"
          KpiUnit "Tage"
      KpiTile
        KpiLabel "Diese Woche"
        KpiValue
          KpiNumber "31"
          KpiUnit "/ 42"
      KpiTile
        KpiLabel "Quote"
        KpiValue
          KpiNumber "74"
          KpiUnit "%"

    SectionLabel "Top Routinen"
    Card
      each routine in $routines by streak desc
        TopRow
          TopName routine.title
          TopStreak "$routine.streak Tage"

  Screen name MehrScreen, hidden
    TitleBlock
      H1 "Mehr"
      Hint "Einstellungen & Profil"

    SectionLabel "Benachrichtigungen"
    Card
      SettingRow
        SettingLabel "Tägliche Erinnerung"
        TogglePill on
      SettingRow
        SettingLabel "Streak-Warnung"
        TogglePill on
      SettingRow
        SettingLabel "Wochenrückblick"
        TogglePill

    SectionLabel "Tagesziel"
    Card
      Hint "Wieviele Routinen pro Tag?"
      Stepper
        StepperBtn "−", decrement(goalPerDay)
        StepperValue "$goalPerDay"
        StepperBtn "+", increment(goalPerDay)

    SectionLabel "Profil"
    Card
      SettingLabel "Name"
      Input bind newRoutineName, placeholder "Dein Name…", w full

    SectionLabel "Über"
    Card
      Hint "Tagesroutine v1.0 · gebaut mit Mirror DSL"

  BottomNav
    NavBtn show(HeuteScreen), hide(VerlaufScreen), hide(StatsScreen), hide(MehrScreen), selected
      NavIcon "house"
      NavLabel "Heute"
    NavBtn show(VerlaufScreen), hide(HeuteScreen), hide(StatsScreen), hide(MehrScreen)
      NavIcon "calendar"
      NavLabel "Verlauf"
    NavBtn show(StatsScreen), hide(HeuteScreen), hide(VerlaufScreen), hide(MehrScreen)
      NavIcon "chart-bar"
      NavLabel "Stats"
    NavBtn show(MehrScreen), hide(HeuteScreen), hide(VerlaufScreen), hide(StatsScreen)
      NavIcon "ellipsis"
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
        if (!isProjectImportFile(file.name)) continue

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

/**
 * Project-import scope: every extension the folder-import dialog will pull
 * into a fresh project. Wider than `isMirrorProjectFile` because it also
 * accepts `.data` (legacy data-file convention, see `studio/app.ts:475`).
 */
function isProjectImportFile(filename: string): boolean {
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
