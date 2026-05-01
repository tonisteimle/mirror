# Mirror Demo System

Demos sind **Spec-by-Example** — gleichzeitig Video-Skripte, Tutorials und
End-to-End-Tests. Jede Demo zeigt einen Mirror-Workflow, dokumentiert das
erwartete Verhalten und fängt Regressionen ab.

## Schnellstart

```bash
# 1. Studio im Hintergrund starten (Terminal 1)
npm run studio

# 2. Eine Demo headless laufen (Terminal 2)
npx tsx tools/test.ts --demo=tools/test-runner/demo/scripts/visual-editing.ts

# Mit sichtbarem Browser für Inspektion / Video
npx tsx tools/test.ts --demo=tools/test-runner/demo/scripts/visual-editing.ts \
  --pacing=video --headed

# Komplette Demo-Suite
npm run test:demos
```

## Verzeichnisstruktur

```
tools/test-runner/demo/
├── README.md                  # diese Datei
├── types.ts                   # Action-Type-Definitionen
├── runner.ts                  # DemoRunner + MIRROR_ACTIONS_API
├── timing.ts                  # Pacing profiles
├── validation.ts              # Auto-validation utilities
├── fragments/                 # Wiederverwendbare Step-Sequenzen
│   ├── README.md
│   ├── setup.ts               # resetCanvas, validateStudioReady
│   ├── palette.ts             # paletteHighlight
│   └── multi-file.ts          # resetMultiFileProject
├── scripts/                   # Demo-Skripte (.ts) + Smokes (_b1-smoke.ts ...)
│   ├── visual-editing.ts      # Drag/Resize/Padding/Margin/Inline-Edit
│   ├── property-workflow.ts   # Cross-Panel: Preview → Properties → Code
│   ├── ai-assisted-card.ts    # AI mock prompt → generated UI → tweak
│   ├── token-system.ts        # Multi-file tokens.tok + computed-style
│   ├── responsive-design.ts   # canvas mobile/tablet/desktop
│   ├── state-interactions.ts  # hover-state computed-style
│   └── component-extraction.ts # components.com + 3× Card
└── fixtures/                  # AI-Mock-Antworten als JSON
    └── ai-assisted-card.json
```

## Action-Types — Übersicht

Demo-Skripte sind ein Array von **Actions**. Jeder Type hat ein klares
Vokabular und einen dedizierten Handler im Runner.

### Setup / Navigation

| Action        | Zweck                                           |
| ------------- | ----------------------------------------------- |
| `navigate`    | Browser auf URL navigieren                      |
| `wait`        | Statische Pause (wird in fast-forward verkürzt) |
| `comment`     | Logging only — nicht ausgeführt                 |
| `clearEditor` | CodeMirror-Inhalt leeren                        |
| `createFile`  | File via storage anlegen                        |
| `switchFile`  | Active File wechseln                            |
| `execute`     | Beliebiges JS im Browser-Kontext (Fallback)     |

### Visuelle Steuerung (Cursor & Highlights)

| Action        | Zweck                               |
| ------------- | ----------------------------------- |
| `moveTo`      | Demo-Cursor zu CSS-Selector bewegen |
| `click`       | Click-Effekt am Cursor + dispatch   |
| `doubleClick` | Doppelklick                         |
| `type`        | In aktives Feld tippen              |
| `pressKey`    | Tastendruck dispatchen              |
| `drag`        | Generisches Drag (Low-Level)        |
| `scroll`      | Scroll-Event                        |
| `highlight`   | Element kurz hervorheben            |

### Mirror-spezifische Actions (High-Level)

Diese Actions wickeln Cursor-Sync + Browser-Interaction ab. Skripte sind
deklarativ — keine Promise.all-Boilerplate.

| Action            | Zweck                                                        |
| ----------------- | ------------------------------------------------------------ |
| `dropFromPalette` | Komponente aus Palette ins Preview droppen                   |
| `moveElement`     | Element zu neuem Container/Index verschieben                 |
| `dragResize`      | Resize-Handle ziehen (n/s/e/w/nw/ne/sw/se)                   |
| `dragPadding`     | Padding-Handle ziehen (top/right/bottom/left)                |
| `dragMargin`      | Margin-Handle ziehen                                         |
| `inlineEdit`      | Doppelklick auf Text-Element + neuen Text tippen             |
| `selectInPreview` | Element im Preview anclicken (Property-Panel updates)        |
| `setProperty`     | Property im Property-Panel setzen (UI-Pfad)                  |
| `pickColor`       | Color-Picker öffnen + Wert wählen                            |
| `aiPrompt`        | `--<text>--`-Block schreiben + Cmd+Enter (mit Mock-Fixtures) |

### Validation

| Action              | Zweck                                            |
| ------------------- | ------------------------------------------------ |
| `validate`          | DOM-Selector-Checks (exists, count, contains)    |
| `expectCode`        | Editor-Inhalt strict gegen Snapshot vergleichen  |
| `expectCodeMatches` | Editor-Inhalt gegen RegExp matchen               |
| `expectDom`         | Computed-Style/Layout-Properties gegen Erwartung |

## Selectors (Phase A1)

Alle Mirror-Actions nehmen einen strukturierten **Selector** statt eines
nodeId-Strings. Das macht Demos robust gegen Reorder / Re-Indexierung.

```ts
type Selector =
  | { byId: string } // 'node-3' — fragil
  | { byText: string | RegExp; nth?: number } // bevorzugt
  | { byTag: string; nth?: number } // 'h1', 'button'
  | { byPath: string } // 'Frame > Frame > H1'
  | { byRole: string; nth?: number } // ARIA
  | { byTestId: string } // data-test-id
```

Beispiel:

```ts
{ action: 'inlineEdit',
  selector: { byTag: 'h1' },
  text: 'Willkommen' }
```

## Validation: expectCode + expectDom

### `expectCode` — Editor-Source

Vergleicht den aktuellen Editor-Inhalt mit einem erwarteten Snapshot.

```ts
{ action: 'expectCode',
  comment: 'after Frame drop',
  code:
    'Frame bg #0f0f0f, ...\n' +
    '  Frame w 100, h 100, bg #27272a, rad 8' }
```

Ohne `code`-Feld → **Lern-Modus**: dumpt den aktuellen Inhalt zum Kopieren.

### `expectDom` — Computed Styles & Layout

Per-Element Validierung mit kuratierten Default-Feldern. Tag-spezialisiert
(button bekommt `disabled`, img `src`, etc.).

```ts
{ action: 'expectDom',
  checks: [
    { selector: { byId: 'node-2' },
      width: 280, height: 200, background: '#2196F3',
      paddingTop: 24, childCount: 3 },
    { selector: { byTag: 'h1' },
      text: 'Willkommen', color: '#FFFFFF' },
  ] }
```

Numerisch erlaubt Range: `width: { min: 280, max: 320 }`.
String erlaubt RegExp: `text: /Hallo/` oder `{ contains: 'Welt' }`.

Ohne `checks` → **Lern-Modus**: dumpt alle Mirror-Elemente.

## Fragments (Phase A3)

Wiederverwendbare Step-Sequenzen. Jede Demo importiert was sie braucht.

```ts
import { resetCanvas, validateStudioReady } from '../fragments/setup'
import { paletteHighlight } from '../fragments/palette'
import { resetMultiFileProject } from '../fragments/multi-file'

steps: [
  ...resetCanvas(),
  ...validateStudioReady(),
  ...paletteHighlight('comp-frame'),
  // demo-specific steps
]
```

## CLI-Optionen

### Single demo / Suite

```bash
npx tsx tools/test.ts --demo=PATH
npx tsx tools/test.ts --demo-suite=DIR
npm run test:demos                         # Suite mit instant pacing
npm run test:demos:headed                  # Headed-Variante
```

### Pacing-Profile

| Profil         | Charakter                               |
| -------------- | --------------------------------------- |
| `instant`      | Keine Animation/Delay (CI / Validation) |
| `testing`      | Schnell, aber sichtbar                  |
| `video`        | Komfortabel, default für headed-Lauf    |
| `tutorial`     | Etwas langsamer, mit thinking-Pausen    |
| `presentation` | Langsam und betont                      |

```bash
... --pacing=video
```

### Iteration

```bash
... --from-step=N      # Steps vor N im Fast-Forward (skip visuals, shrink waits)
... --until-step=N     # Stop nach Step N
... --step             # Pausiere nach jedem mutating Step (TTY)
... --watch            # Re-run on file save
```

### Reports

```bash
... --junit=test-results/demos.xml
... --html=test-results/demos.html
```

### Snapshots (C4)

PNGs an jedem `expectCode`/`expectDom`. Mit `--snapshot-baseline` pixel-diff.

```bash
# Erstes Mal: Baseline aufnehmen
... --snapshot-dir=test-results/baseline

# Folgende Läufe: gegen Baseline vergleichen
... --snapshot-dir=test-results/current \
    --snapshot-baseline=test-results/baseline \
    --snapshot-threshold=0.1
```

Mismatch erzeugt `<step>.diff.png` neben dem Current-Snapshot.

### AI-Mocks (B2)

```json
// fixtures.json
{ "card mit titel und button": "Frame bg #27272a, ...\n  H1 ..." }
```

```bash
... --ai-mock=fixtures.json
```

Demo-Skript: `aiPrompt` action mit dem Prompt-Text. Der normalized Prompt
schaut in der Mock-Map nach; bei Hit wird die Antwort als
`draft:ai-response` emittiert. Bei Miss → Demo failt fast mit
"no AI mock for prompt".

## Eine neue Demo schreiben

```ts
// tools/test-runner/demo/scripts/my-demo.ts
import type { DemoScript } from '../types'
import { resetCanvas, validateStudioReady } from '../fragments/setup'

export const demoScript: DemoScript = {
  name: 'My Demo',
  description: 'kurze Beschreibung',
  config: { speed: 'normal', showKeystrokeOverlay: true },
  steps: [
    ...resetCanvas(),
    ...validateStudioReady(),

    { action: 'comment', text: 'Schritt 1: Frame droppen' },
    {
      action: 'dropFromPalette',
      component: 'Frame',
      target: { byId: 'node-1' },
      at: { kind: 'index', index: 0 },
    },
    { action: 'wait', duration: 400 },

    // Lern-Modus zuerst — produziert den Snapshot zum Einkopieren
    { action: 'expectCode', comment: 'after frame drop' },
  ],
}

export default demoScript
```

**Workflow**:

1. Skript schreiben mit `expectCode`/`expectDom` ohne `code`/`checks`
2. Lern-Lauf: `--demo=PATH` → Konsolen-Output zeigt aktuelle Werte
3. Erwartete Werte in `code`/`checks` einkopieren
4. Strict-Lauf: Demo läuft grün ✓

## Was wird wo validiert?

| Aspekt                       | Wie                           | Wo gefangen                  |
| ---------------------------- | ----------------------------- | ---------------------------- |
| Editor-Source korrekt?       | `expectCode`                  | Strict-Match mit Diff-Output |
| Computed-Style korrekt?      | `expectDom`                   | Field-by-field Vergleich     |
| AI-Output strukturell OK?    | `expectCodeMatches`           | RegExp                       |
| Visuelles Layout OK?         | Snapshots + pixel-diff        | `--snapshot-baseline`        |
| State-Reaktion (hover etc.)? | `expectDom` mit hover-trigger | Cursor-Move + DOM-Check      |

## Was im Headless-Mode **nicht** validiert wird

Diese Aspekte sehen wir nur im headed run (`--headed --pacing=video`):

- **Cursor-Animation flüssig** — Bezier-Kurven, `requestAnimationFrame`-Smoothness
- **Single-Cursor-Effekt** — kein zweiter `__dragTest`-Kreis
- **Highlight-Sichtbarkeit** — Border-Pulsing, Fade-Timings
- **Keystroke-Overlay** — Tastenanzeige unten rechts
- **Pacing-Gefühl** — fühlt sich `video` natürlich an?
- **Drop-Indikator-Position** — wirkt der visual-feedback während des Drags richtig?

→ Vor jedem Major-Release / Video-Aufnahme: **Headed-Verification** durchlaufen
(historisch: `docs/archive/concepts/demo-headed-verification.md`).

## Architektur-Entscheidungen

Die folgenden sind in `docs/archive/concepts/demo-infrastructure.md` ausführlich
festgehalten:

- **E1**: Selector ist nur strukturierte Objekte, keine String-Shortcuts.
- **E2**: `expectDom`-Schema ist explizit deklariert, tag-spezialisiert,
  per-check erweiterbar.
- **E3**: AI-Fixtures sind Plain JSON mit Prompt-String als Key.

## Konzept-Dokumente pro Demo

Jede Showcase-Demo hat ein eigenes (archiviertes) Konzept-Dokument unter `docs/archive/concepts/`:

- `visual-editing-demo.md`
- `property-workflow-demo.md`
- `ai-assisted-card-demo.md`
- `token-system-demo.md`
- `state-interactions-demo.md`
- `component-extraction-demo.md`

Plus die Roadmap/Architektur:

- `demo-infrastructure.md`
