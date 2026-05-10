# Mirror Test Framework

End-to-End-Tests für Mirror Studio fahren ausschließlich über echte
Browser-Eingaben — Maus und Tastatur, getrieben durch Chrome DevTools
Protocol (CDP). Es gibt keine synthetischen Cursor, keine
`el.dispatchEvent()`-Hacks, keinen direkten Zugriff auf Studio-internes
State.

> Vorgängerdokument (~1429 Zeilen, beschreibt das alte synthetische
> Test-Framework) liegt in `docs/archive/TEST-FRAMEWORK-pre-cdp-rewrite.md`.

## Grundprinzip — Maus und Keyboard, sonst nichts

Alles, was in der Applikation passiert, wird durch genau zwei
Eingabekanäle ausgelöst: **Maus** und **Keyboard**. Tests müssen denselben
Pfad nehmen, den ein echter Benutzer nimmt — sonst testen sie etwas
anderes als das, was Benutzer erleben.

### Erlaubt

- **Schicht 1 — `cdpInput.*`**: atomare CDP-Trusted-Events
  (`mouseDown`, `mouseUp`, `mouseMove`, `mouseClick`, `mouseDoubleClick`,
  `wheel`, `keyDown`, `keyUp`, `typeText`, `focus`). Lösen die volle
  Browser-Pipeline aus: native Focus, HTML5-Drag mit `dataTransfer`,
  IME, Shortcut-Handler, CodeMirror-Keymaps.
- **Schicht 2 — `trustedInteractions.*`**: dünner Wrapper um
  `cdpInput.*`, der Selektoren (Node-IDs, Slot-Pseudo-IDs) zu
  Viewport-Koordinaten auflöst und Sequenzen wie `drag(from, to)` als
  ein Aufruf bündelt.
- **Schicht 3 — `__mirrorActions.*`**: high-level Test-Helfer
  (`dropFromPalette`, `setProperty`, `pickColor`, `inlineEdit`,
  `dragResize`, `dragPadding`, …). Jeder Helfer ist intern eine
  Sequenz aus Schicht-1-Aufrufen.
- **Optional — OS-Maus via nut-js**: bewegt den realen macOS-Cursor.
  Aktivierung mit `--os-mouse`/`--driver=os`. Liefert dieselben Events
  wie ein Mensch, braucht Accessibility-Permission.

### Verboten

- `el.click()`, `el.focus()`, `el.dispatchEvent(new MouseEvent(...))`
  — synthetische Events mit `isTrusted=false`. Umgehen Focus-Management,
  HTML5-Drag und native Pipelines.
- `controller.startDrag()`, `panel.changeProperty()`, `editor.dispatch()`
  als **Test-Aktion**. Das sind Studio-interne APIs, kein Bedienpfad.
- Synthetische Cursor / Keystroke-Overlays / fake Drop-Indicator-Highlights,
  die App-Verhalten _vortäuschen_. Was im Test sichtbar wird, muss aus
  der echten App kommen. Der alte Demo-Runner mit SVG-Cursor ist gelöscht
  (Commit `8e81387f`).

### Daumenregel

Wenn du einen Test-Schritt nicht als Reihe von „Maus klickt da, Keyboard
tippt das" beschreiben kannst, geht er einen Pfad, den der Benutzer nicht
nehmen kann.

---

## Architektur — drei Schichten

```
┌────────────────────────────────────────────────────────────────┐
│  Schicht 3 — __mirrorActions (high-level Helfer)               │
│  studio/test-api/mirror-actions/index.ts                       │
│                                                                 │
│  dropFromPalette · drawInGrid · moveElement · dragResize       │
│  dragPadding · dragMargin · inlineEdit · selectInPreview       │
│  setProperty · pickColor · aiPrompt                            │
└────────────────────────────────────────────────────────────────┘
                            │ baut auf
                            ▼
┌────────────────────────────────────────────────────────────────┐
│  Schicht 2 — trustedInteractions (Selektor-Wrapper)            │
│  studio/test-api/trusted-interactions.ts                       │
│                                                                 │
│  click · doubleClick · drag · focus · press · type · wheel     │
│  + Selektor-Auflösung (node-id → Viewport-Koordinaten)         │
└────────────────────────────────────────────────────────────────┘
                            │ baut auf
                            ▼
┌────────────────────────────────────────────────────────────────┐
│  Schicht 1 — cdpInput (atomare CDP Trusted Events)             │
│  studio/test-api/cdp-input-client.ts                           │
│                                                                 │
│  mouseDown · mouseUp · mouseMove · mouseClick · mouseDoubleClick│
│  wheel · keyDown · keyUp · typeText · focus                    │
└────────────────────────────────────────────────────────────────┘
                            │ Promise-Bridge via Runtime.addBinding
                            ▼
┌────────────────────────────────────────────────────────────────┐
│  Node-Side Bridge                                               │
│  tools/test-runner/cdp-input-bridge.ts                         │
│                                                                 │
│  Empfängt JSON-Calls, ruft echte CDP `Input.dispatchMouseEvent`/│
│  `Input.dispatchKeyEvent` auf, antwortet via                    │
│  `window.__cdpInputResponse`.                                   │
└────────────────────────────────────────────────────────────────┘
                            │ optional zusätzlich
                            ▼
┌────────────────────────────────────────────────────────────────┐
│  OS-Maus Bridge (optional, --os-mouse)                          │
│  tools/test-runner/os-mouse-bridge.ts + os-mouse.ts            │
│                                                                 │
│  nut-js dreht den realen macOS-Cursor — gleiche Events wie ein  │
│  Mensch. Braucht Accessibility-Permission.                      │
└────────────────────────────────────────────────────────────────┘
```

**Lese-APIs** (kein Eingabepfad, deshalb außerhalb der Schichten):
`PreviewInspector`, `Assertions`, `DOMBridge`, `PanelAPI`, `ZagAPI`,
`StudioAPI`, `FixturesAPI`, `LayoutAssertions` — sehen den DOM-Stand
und vergleichen, mutieren aber nichts.

---

## API-Referenz

### Schicht 1 — `cdpInput`

`studio/test-api/cdp-input-client.ts`. Atomare CDP-Calls. Verfügbar
sobald die Node-Bridge installiert ist (`isCdpInputAvailable() === true`).
Außerhalb des Test-Runners rejecten alle Methoden mit klarem Fehler.

```typescript
import { cdpInput, isCdpInputAvailable } from '../cdp-input-client'

interface CdpModifiers { alt?: boolean; ctrl?: boolean; meta?: boolean; shift?: boolean }
interface CdpMouseArgs { x: number; y: number; button?: 'left'|'middle'|'right'; modifiers?: CdpModifiers; buttons?: number }
interface CdpKeyArgs   { key: string; code?: string; modifiers?: CdpModifiers }

cdpInput.mouseDown(args: CdpMouseArgs):           Promise<void>
cdpInput.mouseUp(args: CdpMouseArgs):             Promise<void>
cdpInput.mouseMove(args: CdpMouseArgs):           Promise<void>
cdpInput.mouseClick(args: CdpMouseArgs & { clickCount?: number }): Promise<void>
cdpInput.mouseDoubleClick(args: CdpMouseArgs):    Promise<void>
cdpInput.keyDown(args: CdpKeyArgs):               Promise<void>
cdpInput.keyUp(args: CdpKeyArgs):                 Promise<void>
cdpInput.typeText(args: { text: string; perCharDelay?: number }): Promise<void>
cdpInput.wheel(args: { x: number; y: number; deltaX: number; deltaY: number }): Promise<void>
cdpInput.focus(args: { x: number; y: number }):   Promise<void>

isCdpInputAvailable(): boolean   // gate: nur True unter dem CDP-Runner
```

`buttons`-Detail: für mid-drag Bewegung zwischen `mouseDown` und
`mouseUp` muss `buttons: 1` mitgegeben werden, damit Chrome HTML5
`dragstart`/`dragover` zündet.

### Schicht 2 — `trustedInteractions`

`studio/test-api/trusted-interactions.ts`. Wrapped `cdpInput`, löst
Node-IDs (`node-1`, `node-1:Slot:value`) auf Viewport-Koordinaten auf,
bündelt Drag-Sequenzen.

```typescript
import { trustedInteractions } from '../trusted-interactions'

interface ViewportPoint { x: number; y: number }

trustedInteractions.isAvailable():                                 boolean
trustedInteractions.coordsOf(nodeId: string):                      ViewportPoint | null

trustedInteractions.click(target: ViewportPoint | string,
                          opts?: { modifiers?: CdpModifiers }):     Promise<void>
trustedInteractions.doubleClick(target: ViewportPoint | string):    Promise<void>
trustedInteractions.mouseDown(target, opts?):                       Promise<void>
trustedInteractions.mouseUp(target, opts?):                         Promise<void>
trustedInteractions.mouseMove(point: ViewportPoint):                Promise<void>

trustedInteractions.drag(from: ViewportPoint | string,
                         to: ViewportPoint | string,
                         opts?: { steps?: number }):                Promise<void>

trustedInteractions.focus(target: ViewportPoint | string):          Promise<void>

trustedInteractions.keyDown(key, opts?):                            Promise<void>
trustedInteractions.keyUp(key, opts?):                              Promise<void>
trustedInteractions.press(key, opts?):                              Promise<void>   // keyDown + keyUp
trustedInteractions.type(text, opts?: { perCharDelay?: number }):   Promise<void>

trustedInteractions.wheel(point, deltaX, deltaY):                   Promise<void>
```

### Schicht 3 — `__mirrorActions`

`studio/test-api/mirror-actions/index.ts`, registriert auf
`window.__mirrorActions`. Domain-spezifische Test-Helfer für die
Studio-Workflows. Jede Methode ist intern eine cdpInput-Sequenz.

```typescript
type Selector =
  | { byId: string }
  | { byTestId: string }
  | { byText: string | RegExp; nth?: number }
  | { byTag: string; nth?: number }
  | { byRole: string; nth?: number }
  | { byPath: string; nth?: number }

type Selectorish = Selector | string // String-Shorthand: '#node-2' / 'node-2' / '"Save"' / 'Card > Title'

interface MirrorActionsAPI {
  resolveSelector(sel: Selectorish): string
  dropChildIndexPoint(targetEl: HTMLElement, index: number): { x: number; y: number }
  snapshotElement(nodeId: string, extras?: string[]): Record<string, unknown>
  snapshotAllByPreviewOrder(): Array<{
    selector: { byId: string }
    snapshot: Record<string, unknown>
  }>

  dropFromPalette(
    component: string,
    targetSel: Selectorish,
    at?: { kind: 'index'; index: number } | { kind: 'zone'; zone: string }
  ): Promise<void>

  drawInGrid(
    componentName: string,
    targetSel: Selector,
    fromCell: { x: number; y: number },
    toCell: { x: number; y: number },
    name?: string
  ): Promise<void>

  moveElement(sourceSel: Selector, targetSel: Selector, index: number): Promise<void>

  dragResize(
    sel: Selector,
    position: string,
    deltaX: number,
    deltaY: number,
    opts?: unknown
  ): Promise<void>
  dragPadding(
    sel: Selector,
    side: string,
    delta: number,
    mode: 'all' | 'axis' | 'single',
    bypassSnap?: boolean
  ): Promise<void>
  dragMargin(
    sel: Selector,
    side: string,
    delta: number,
    mode: 'all' | 'axis' | 'single',
    bypassSnap?: boolean
  ): Promise<void>

  inlineEdit(sel: Selector, text: string, charDelay?: number): Promise<void>
  selectInPreview(sel: Selector): Promise<void>
  setProperty(sel: Selector, propName: string, value: string): Promise<void>
  pickColor(sel: Selector, propName: string, color: string): Promise<void>

  aiPrompt(promptText: string, options?: unknown): Promise<unknown>
  installAiMockListener(): void
}
```

Browser-Zugriff in Tests: `(window as any).__mirrorActions` nach
`installMirrorActions()` (passiert automatisch in `initStudioTestAPI`).

### Lese-APIs (Test-Sicht auf den DOM)

Eine Test-Funktion bekommt ein `TestAPI`-Objekt mit Lese-/Assert-Helfern:

```typescript
interface TestAPI {
  editor: EditorAPI // CodeMirror-Inhalte lesen, Cursor-Position
  preview: PreviewAPI // node-IDs, Element-Inspection, byText
  assert: AssertionAPI // equals, exists, hasText, hasStyle, codeContains, …
  dom: DOMAPI // deklarative DOM-Validierung
  panel: PanelAPI // Property-/Tree-/Files-Panel ablesen
  zag: ZagAPI // Zag-Komponenten-State ablesen (DatePicker)
  studio: StudioAPI // History, Viewport, Selection
  fixtures: FixturesAPI // vordefinierte Mirror-Snippets
  utils: UtilsAPI // delay, waitFor*, …
}
```

> `interact` (alte synthetische Schicht) gibt es immer noch im Code,
> ist aber **deprecated** für neue Tests. Wer eine Maus- oder
> Keyboard-Aktion braucht, nutzt Schicht 1/2/3 oben.

Typdefinitionen: `studio/test-api/types.ts`.

---

## Test-File-Template

```typescript
/**
 * Preview CDP — Palette drop: Frame ins leere Canvas.
 *
 * Maus-/Keyboard-Sequenz:
 *   1. Maus-Drag von Palette-Item "Frame" zur Mitte des leeren Previews.
 *
 * Verifiziert:
 *   - Editor-Code beginnt mit `Frame`.
 *   - Genau ein gerendertes Element mit data-mirror-id.
 *   - Auto-Selection auf den neuen Knoten.
 */
import type { TestCase } from '../../../types'

export const frameIntoEmptyCanvasTests: TestCase[] = [
  {
    name: 'Palette → leeres Preview: Frame wird Top-Level-Knoten',
    fixture: '',
    test: async api => {
      const actions = (window as any).__mirrorActions
      await actions.dropFromPalette('Frame', { byPath: 'preview' })

      const code = api.editor.getValue().trim()
      api.assert.match(code, /^Frame\b/, 'editor source should start with `Frame`')

      const ids = api.preview.getNodeIds()
      api.assert.equals(ids.length, 1, 'preview has exactly one node')
      api.assert.equals(api.panel.property.getSelectedNodeId(), ids[0], 'auto-selected')
    },
  },
]
```

Registrierung pro Wave / Bereich erfolgt in
`studio/test-api/suites/categories.ts` (eine Kategorie pro Test-Bereich,
nicht pro File).

---

## Verzeichnisstruktur

### `studio/test-api/` — Browser-Side

| Pfad                      | Zweck                                                     |
| ------------------------- | --------------------------------------------------------- |
| `index.ts`                | Bootstrap, registriert `__mirrorTest` / `__mirrorActions` |
| `cdp-input-client.ts`     | Schicht 1 — `cdpInput.*`                                  |
| `trusted-interactions.ts` | Schicht 2 — `trustedInteractions.*`                       |
| `mirror-actions/index.ts` | Schicht 3 — `__mirrorActions.*`                           |
| `os-mouse-client.ts`      | Optionale OS-Maus-Bridge (nut-js)                         |
| `snapshot-client.ts`      | Pixel-Diff-Bridge (Snapshots)                             |
| `cli-bridge-shim.ts`      | Shim, um Node-Helfer im Browser-Kontext aufzurufen        |
| `codemirror-api.ts`       | CodeMirror-Inspect-Helfer für Editor-Tests                |
| `interactions.ts`         | **Legacy** synthetische Interactions — nur für Altbestand |
| `inspector.ts`            | `PreviewInspector` (DOM-Inspektion)                       |
| `assertions.ts`           | `Assertions` + `AssertionCollector`                       |
| `dom-bridge.ts`           | Deklarative DOM-Validierung                               |
| `layout-assertions.ts`    | Pixel-genaue Layout-Checks (`assertActualGap`, …)         |
| `panel-api.ts`            | Property-/Tree-/Files-Panel-Lesen                         |
| `zag-api.ts`              | Zag-Komponenten-State (DatePicker)                        |
| `studio-api.ts`           | History, Viewport, Selection                              |
| `snapping-api.ts`         | Snap-Service-Inspection für Spacing/Resize-Tests          |
| `fixtures.ts`             | Vordefinierte Mirror-Snippets                             |
| `helpers/`                | Wiederverwendbare Helfer (`structure`, `keyboard`)        |
| `test-runner.ts`          | `TestRunner`, `test`, `testWithSetup`, `describe`         |
| `types.ts`                | Alle TypeScript-Interfaces                                |
| `suites/`                 | Test-Suites (siehe unten)                                 |
| `suites/categories.ts`    | Kategorien-Registry — Eintrag pro Test-Bereich            |

### `studio/test-api/suites/` — Test-Bereiche

```
ai/                  drag/                  preview-cdp/
animations/          editor/                primitives/
autocomplete/        events/                project/
bidirectional/       export/                property-panel/
charts/              flex-reorder/          property-robustness/
compiler/            gradients/             responsive/
compiler-verification/  inline-edit/        stacked-drag/
components/          integration/           states/
core/                interactions/          stress/
data-binding/        layout/                styling/
demo-project.test.ts layout-verification/   sync/
                     playmode/              test-system/
                     pure-select.test.ts    transforms/
                                            tutorial/
                                            ui-builder/
                                            undo-redo/
                                            workflow/
```

Aktuell sind **21 Kategorien** in `categories.ts` registriert: `core`,
`layout`, `styling`, `visuals`, `states`, `components`, `drag`,
`handles`, `stepRunner` (leer — Stub), `selection`, `propertyPanel`,
`editor`, `data`, `project`, `compiler`, `ai`, `ai.realLlm`, `tutorial`,
`stress`, `headed`, `previewCdp`. Nicht jeder `suites/`-Subdir hat
einen eigenen Kategorie-Eintrag — viele werden über aggregierende
Kategorien zugeführt.

### `tools/test-runner/` — Node-Side CDP-Runner

| Datei                   | Zweck                                              |
| ----------------------- | -------------------------------------------------- |
| `cli.ts`                | CLI-Entry (geladen via `tools/test.ts`)            |
| `chrome.ts`             | Chromium-Launch                                    |
| `cdp.ts`                | CDP-Client (Generic Wire-Protocol)                 |
| `cdp-input-bridge.ts`   | Bridge für Schicht 1 — empfängt `cdpInput.*`-Calls |
| `os-mouse-bridge.ts`    | Bridge für Schicht 1 (OS-Maus, optional)           |
| `os-mouse.ts`           | nut-js-Wrapper für reale macOS-Cursor-Kontrolle    |
| `snapshot-bridge.ts`    | Pixel-Diff-Bridge (Node-Side)                      |
| `pixel-diff.ts`         | Pixel-Diff-Algorithmus                             |
| `recording.ts`          | CDP-Screencast → WebM via ffmpeg                   |
| `runner.ts`             | Test-Orchestrierung                                |
| `console-collector.ts`  | Browser-Console-Aufzeichnung                       |
| `screenshot.ts`         | Screenshots bei Fail                               |
| `file-explorer.ts`      | `--explore` / `--diagnose` Diagnose                |
| `reporters/console.ts`  | Konsole                                            |
| `reporters/junit.ts`    | JUnit-XML                                          |
| `reporters/html.ts`     | HTML-Report                                        |
| `reporters/progress.ts` | Live-Fortschrittsbar                               |
| `types.ts`              | Wire-Protokoll-Typen                               |

### `tools/atomic-input-tests.ts` — Smoke-Tests

Kleine end-to-end-Probes, die direkt prüfen, dass die CDP-`Input.*`-
Pipeline echtes Vertrauen liefert (Click trifft Button, Keystroke
landet im Input, Drag zündet HTML5-`dragstart`, …). Laufen ohne Studio.

```bash
npx tsx tools/atomic-input-tests.ts            # headless
npx tsx tools/atomic-input-tests.ts --headed   # mit sichtbarem Chrome
npx tsx tools/atomic-input-tests.ts --studio   # inkl. Studio-Smoke
```

---

## CLI

```bash
# Studio Server starten (Terminal 1)
npm run studio

# Tests ausführen (Terminal 2)
npm run test:browser                        # alle Tests
npm run test:browser:progress               # alle Tests mit Live-Bar
npm run test:browser:drag                   # nur Drag & Drop
npm run test:browser:mirror                 # alle Mirror-Tests
npm run test:browser:headed                 # mit sichtbarem Browser
npm run test:browser:tutorial               # nur Tutorial-Suite
npm run test:browser:edit-flow-real         # AI-Realmode (60s timeout)

# Direkt
npx tsx tools/test.ts --list                # Kategorien anzeigen
npx tsx tools/test.ts --category=layout
npx tsx tools/test.ts --filter="Button" --progress
npx tsx tools/test.ts --test="Drop Avatar" --headed
npx tsx tools/test.ts --all --progress
```

### Wichtige Flags

| Flag                                | Zweck                                     |
| ----------------------------------- | ----------------------------------------- |
| `--category=NAME`                   | Eine Kategorie laufen lassen              |
| `--test="NAME"`                     | Einzelnen Test (exakter Name)             |
| `--filter=PATTERN`                  | Regex-Filter über Test-Namen              |
| `--all`                             | Alles laufen lassen                       |
| `--list`                            | Kategorien listen                         |
| `--headed`                          | Sichtbarer Browser                        |
| `--os-mouse` / `--driver=os`        | Reale macOS-Maus via nut-js (Permission!) |
| `--cpu-throttle=N`                  | CPU verlangsamen (CDP Emulation)          |
| `--network=PROFILE`                 | offline \| slow-3g \| fast-3g \| 4g       |
| `--window-size=WxH`                 | Viewport-Größe                            |
| `--bail`                            | Bei erstem Fail stoppen                   |
| `--retries=N`                       | N Wiederholungen pro Fail                 |
| `--timeout=MS`                      | Timeout pro Test (Default 30000)          |
| `--watch`                           | Watch-Mode                                |
| `--hide-panels=files,components`    | Panels verstecken                         |
| `--panel-mode=test\|focus\|minimal` | Preset-Panel-Konfiguration                |
| `--junit=PATH` / `--html=PATH`      | Reports                                   |
| `--screenshot-dir=DIR`              | Screenshot-Verzeichnis                    |
| `--no-screenshot`                   | Screenshots deaktivieren                  |
| `--progress`                        | Live-Fortschrittsbar                      |
| `--log=PATH`                        | Logfile                                   |
| `--snapshot-dir=DIR`                | Pixel-Diff-Baseline                       |
| `--snapshot-baseline=DIR`           | Vergleichs-Baseline                       |
| `--snapshot-threshold=N`            | Schwellwert (0–1, Default 0.01)           |
| `--record=PATH`                     | CDP-Screencast → WebM                     |
| `--record-fps=N`                    | Framerate (Default 24)                    |
| `--explore` / `--diagnose`          | Diagnose-Lauf (Files, Project-State)      |

---

## Browser-Konsolen-API

Während ein Studio-Browser offen ist (egal ob via `npm run studio`
oder unter dem Test-Runner), stehen folgende Globals zur Verfügung:

```javascript
__mirrorTest.list() // alle Kategorien
__mirrorTest.list('drag') // Tests einer Kategorie
__mirrorTest.filter('Button') // Pattern-Filter
__mirrorTest.category('zag') // Kategorie laufen lassen
__mirrorTest.only('Checkbox toggle') // Einzelner Test (exakt/partial)
__mirrorTest.runAll() // Alle Tests
__mirrorTest.debug('Checkbox toggle') // Step-by-step Debug
__mirrorTest.step() //   weiter
__mirrorTest.abort() //   abbrechen
__mirrorTest.inspect('node-1') // Element-Snapshot
__mirrorTest.expect('node-1').hasText('OK').hasBackground('#2271C1')
```

CDP-Layer direkt (nur unter dem Test-Runner verfügbar):

```javascript
window.__cdpInput?.mouseClick({ x: 100, y: 200 })
window.__mirrorActions?.dropFromPalette('Frame', { byPath: 'preview' })
window.__osMouse // nur mit --os-mouse
window.__snapshot // nur mit --snapshot-dir
```

---

## Test-Plan: Preview-Funktionalitäten

Der inkrementelle Wave-Plan für die `preview-cdp`-Suite (atomare,
isolierte Tests pro Preview-Interaktion) liegt in
`docs/test-plan-preview-cdp.md`. Aktuell ~62 Tests in 13 Waves geplant,
Status pro Wave dort gepflegt.

---

## Vitest-Layer (jsdom)

Tests, die kein Browser-Verhalten brauchen (DSL-rein, IR, Compiler-Output,
Assertion auf erzeugten Code), laufen über Vitest mit jsdom — siehe
`docs/archive/test-classification.md` für die Migration-Geschichte und
`tests/utils/mirror-mount.ts` + `tests/utils/mirror-test-adapter.ts` für
die Adapter, mit denen Suite-Tests aus `studio/test-api/suites/` 1:1 in
Vitest laufen können.

```bash
npm test                       # alle Vitest-Tests
npm test -- --watch            # Watch-Mode
npm test -- parser             # nur Parser-Tests
```

Nicht jeder Browser-Test ist migrierbar — Tests, die echte
Maus-/Keyboard-Pfade brauchen, bleiben im Browser-Stack. Die Adapter
erkennen `api.interact.*`-Aufrufe via `needsRuntime()` und überspringen
diese Suites automatisch.

---

## Verankerungen

- Grundprinzip: dieses Dokument („Maus und Keyboard, sonst nichts").
- Memory: `feedback_test_input_principle.md` (User-Quote 2026-05-10).
- Inkrementeller Test-Plan: `docs/test-plan-preview-cdp.md`.
- Findings & Hunt-Log: `docs/findings.md`.
- Vorgängerdokument (zur Referenz): `docs/archive/TEST-FRAMEWORK-pre-cdp-rewrite.md`.
