# Demo Infrastructure

Roadmap für ausgefeilte, umfangreiche und sauber testbare Demos im
**bestehenden Demo-Modus des Test-Runners**. Diese Spec beschreibt die
Infrastruktur — konkrete Demos wie `visual-editing.ts` sind separate Skripte
und haben ihre eigenen Konzept-Dokumente (siehe `visual-editing-demo.md`).

## Vision

Demos sind **Spec-by-Example** — gleichzeitig Video-Skripte, Tutorials und
End-to-End-Tests. Eine Demo zeigt User-Workflows, dokumentiert Mirror-Verhalten
und fängt Regressionen ab. Demos werden in CI gegen jede Mirror-Änderung
gefahren; ein Demo-Bruch ist ein Bug-Signal mit präziser Diagnose
(Editor-Diff, DOM-Diff, Screenshot).

Daraus folgt:

- **Schreibbarkeit**: Eine neue Demo soll in 10 Minuten für einen typischen
  Workflow steh­en. Heute (nach Phase 0) braucht es 30+ Minuten weil viele
  Mechaniken (Property-Panel, AI, DOM-Asserts) noch fehlen.
- **Robustheit**: Demos brechen nicht bei kleinen Mirror-Änderungen. NodeIds
  werden nicht hardcoded; Validierung ist semantisch wo möglich.
- **Diagnose**: Bei Bruch sieht der Mensch in 5 Sekunden was schiefging — Diff
  in Editor _und_ DOM _und_ Screenshot.
- **Komposition**: Eine Card-Setup-Sequenz wird einmal geschrieben und in 10
  anderen Demos genutzt.

## Architektur-Prinzipien (durchgehend gültig)

Diese gelten für _alle_ unten beschriebenen Bausteine.

1. **Test-Runner-Erweiterung, nicht Skript-Workaround**: Wiederkehrende
   Aktionen werden zu Demo-Action-Types in `tools/test-runner/demo/types.ts`
   und Handlern in `runner.ts`. Kein eingebettetes JavaScript via `execute`
   für Mirror-Workflows.
2. **Cursor-Sync zentral**: Jede neue mutierende Action ruft
   `withCursorSync` (im injectierten `MIRROR_ACTIONS_API`) auf. Skripte
   enthalten keine Promise.all-Glue.
3. **Validierungs-Layer pro Action**: Mutierende Actions akzeptieren ein
   inline `expectCode`/`expectDom` für unmittelbare Verifikation.
4. **Browser-Interactions wiederverwenden**: `__mirrorTest.interact` und
   `__dragTest` haben bereits viele APIs (drag, padding, margin, resize,
   property-set). Neue Actions sind dünne Demo-Wrapper, kein Re-Implementation.
5. **Action-Typen klein und scharf**: Lieber 8 spezifische Actions als 3
   Mega-Actions mit vielen Options.

## Status Quo

| Phase                | Stand                                                                                                            | Offen                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **A** Foundation     | ✅ A1 (Selectors), A2 (expectDom), A3 (Fragments)                                                                | —                                                                                                         |
| **B** Capabilities   | ✅ B1 (3 von 6 Actions: selectInPreview, setProperty, pickColor), ✅ B2 (aiPrompt + mock)                        | pickToken/pickIcon/togglePropertyGroup (#33), --ai-record (#34)                                           |
| **C** Infrastructure | ✅ C1 (--demo-suite), ✅ C2 (JUnit/HTML), ✅ C3 (--from-step/--until-step), ✅ C4 (--snapshot-dir, capture-only) | --watch/--step (#32), pixel-diff (#37)                                                                    |
| **D** Showcases      | ✅ D1 (property-workflow), ✅ D2 (ai-assisted-card), ✅ D6 (state-interactions)                                  | D3 token (blocked #36), D4 responsive, D5 component-extraction (blocked #36), D7 visual-editing migration |
| Foundation polish    | —                                                                                                                | Multi-file reset (#36), card-workflow.ts triage (#35)                                                     |

### Fixes aus Showcase-Demos (Foundation gehärtet durch echten Use)

- `inlineEdit` → `controller.endEdit(true)` statt synthetic Enter (D1 deckte auf)
- `expectDom` Hex-Compare case-insensitive (D1)
- AI-Mock-Fixtures werden in Suite-Mode mitgegeben (D2 vs Suite-Lauf)

## Roadmap

Vier Phasen, jede einzeln deploybar — am Ende jeder Phase haben neue Demos
mehr Möglichkeiten.

### Phase A — Foundation

Hebel: alle nachfolgenden Phasen werden billiger. Reihenfolge wichtig.

#### A1 — Semantic Lookups (Selector-Type)

**Problem**: nodeIds verschieben sich nach `moveElement`, `addChild`, etc. In
`visual-editing.ts` musste der Reorder ans Ende, um Inline-Edit-Targets stabil
zu halten. Das skaliert nicht.

**Lösung**: Ein `Selector` Union-Type, akzeptiert von allen Actions, die heute
`nodeId: string` nehmen.

```ts
type Selector =
  | string // nodeId (wie heute)
  | { byText: string | RegExp; nth?: number }
  | { byTag: string; nth?: number }
  | { byPath: string } // CSS-ähnlich: "Card > H1"
  | { byRole: string; nth?: number } // ARIA / semantic
  | { byTestId: string } // data-test-id wenn gesetzt
```

Resolution im Browser via neuer Helper-Funktion in `MIRROR_ACTIONS_API`:
`resolveSelector(sel) → nodeId`. Wirft mit klarem Fehler wenn 0 oder mehrere
Treffer (außer `nth` ist gesetzt).

**Auswirkung auf bestehende Actions**: alle `nodeId`-Felder werden zu
`Selector`. Backwards-kompatibel weil `string` weiterhin als nodeId interpretiert
wird.

#### A2 — `expectDom` Action

**Problem**: `expectCode` deckt nur den Editor ab. Wenn der Code stimmt aber
das Rendering kaputt ist, sehen wir das nicht.

**Lösung**: Neue Action mit checks-Array, parallel zu `expectCode`:

```ts
{
  action: 'expectDom',
  checks: [
    { selector: 'node-3', tag: 'h1', text: 'Willkommen', visible: true },
    { selector: 'node-2', width: { min: 280 }, paddingTop: 24, childCount: 3 },
    { selector: 'node-2', layout: { direction: 'vertical', gap: 16, align: 'center' }},
    { selector: { byText: 'Loslegen' }, tag: 'button', visible: true },
  ]
}
```

Implementation: thin wrapper um `__mirrorTest.dom.verify` und `__mirrorTest.layout.assert*`,
die schon existieren. Lern-Modus: ohne `checks` Array dumpt der Runner den
aktuellen DOM-Snapshot (computed styles, layout, children) für Copy-Paste —
analog zu `expectCode`-Lern-Modus.

**Diff-Format bei Mismatch**: pro Check eine Zeile mit Erwartet vs Gefunden;
optional Screenshot-Pfad.

#### A3 — Demo-Composition (Fragments)

**Problem**: Jede Demo wiederholt Setup (Reset, Canvas-Frame). Eine Demo mit
"baue Card mit Header und Body" wiederholt sich wenn 5 Demos das brauchen.

**Lösung**: Ein **Fragment** ist ein Modul, das eine `DemoAction[]` exportiert
(oder eine Funktion, die eine zurückgibt). Demos importieren Fragments und
spreaden sie in ihre Steps:

```ts
// fragments/setup.ts
export const resetCanvas = (): DemoAction[] => [
  { action: 'execute', code: '...setTestCode...', comment: 'Reset' },
  { action: 'wait', duration: 300 },
]

// fragments/card.ts
export const createBasicCard = (opts: { width?: number } = {}): DemoAction[] => [
  { action: 'dropFromPalette', component: 'Frame', target: 'node-1', at: { kind: 'index', index: 0 }},
  { action: 'dragResize', selector: { byPath: 'Frame > Frame' }, position: 'e', deltaX: (opts.width ?? 280) - 100, deltaY: 0 },
  ...
]

// scripts/some-demo.ts
import { resetCanvas } from '../fragments/setup'
import { createBasicCard } from '../fragments/card'

export const demoScript: DemoScript = {
  name: '...',
  steps: [
    ...resetCanvas(),
    ...createBasicCard({ width: 320 }),
    // demo-spezifische Schritte
  ]
}
```

Konvention: Fragments unter `tools/test-runner/demo/fragments/`. Jeder
Fragment exportiert nur die Steps, keine eigene `DemoScript`-Hülle.

### Phase B — Action-Coverage

#### B1 — Property-Panel-Actions

**Aktionen**:

| Action                | Browser-API                                              | Was die Demo zeigt                                          |
| --------------------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| `selectInPreview`     | `__dragTest.selectNode` + click                          | User klickt Element im Preview, Property-Panel updated sich |
| `setProperty`         | `__dragTest.setProperty` (UI-Pfad bevorzugt)             | Direkt-Eintrag im Property-Panel-Field                      |
| `pickColor`           | klick → ColorPicker offen → Hex eintippen / Token wählen | Demonstriert Color-Picker-UI                                |
| `pickToken`           | klick → TokenPicker offen → Token wählen                 | Demonstriert Token-System-UI                                |
| `pickIcon`            | klick → IconPicker offen → Icon wählen                   | Demonstriert Icon-Library                                   |
| `togglePropertyGroup` | klick auf Section-Header (Layout/Spacing/Style)          | Spacing/Layout zeigen                                       |

**Tradeoff**: Wir können Property-Werte direkt programmatisch setzen
(`__dragTest.setProperty`) — schnell, aber Demo zeigt dann keine UI. Für
Video-Demos müssen wir den UI-Pfad gehen (Picker öffnen, klicken, schließen).
Daher: Action-Handler nutzen die UI-Pfade, validieren über `expectCode` dass
der Wert im Code landete.

#### B2 — AI-Action mit Mock-Mode

**Problem**: `--`-Prompt → LLM → non-deterministisch. Strict `expectCode`
unmöglich.

**Lösung**:

1. **Action `aiPrompt`**: tippt `-- <text>` an Cursor-Position, drückt Enter,
   wartet auf LLM-Antwort, validiert dass _irgendwas_ passiert ist.
2. **Action `acceptAiSuggestion` / `rejectAiSuggestion`**: klick die jeweiligen
   Buttons.
3. **Validation `expectCodeMatches`**: regex-basiert statt strict.
4. **Mock-Mode** für CI:
   - Env-Var `MIRROR_AI_MOCK=path/to/fixtures.json` setzt einen Hook der LLM-
     Calls abfängt und Antworten aus Fixtures liefert.
   - Fixtures: `{ promptHash: response }` map, deterministisch.
   - Demo läuft in CI mit Fixture, lokal optional mit echtem LLM.

**Diagnose bei Fehlschlag**: AI-Response wird ins Demo-Log geschrieben (auch
bei Strict-Match-Fail), damit man sieht was die AI tatsächlich generierte.

### Phase C — Infrastructure

#### C1 — Demo-Suite-Runner

`--demo-suite=DIR` führt alle `.ts`-Skripte unter `DIR` als Demos aus.
Aggregiert Pass/Fail/Duration.

**CLI**:

```
npx tsx tools/test.ts --demo-suite=tools/test-runner/demo/scripts
npx tsx tools/test.ts --demo-suite=...  --bail        # bei erstem Fail stoppen
npx tsx tools/test.ts --demo-suite=...  --filter=card # nur Skripte mit "card" im Namen
```

**Output**: kompakter Report (1 Zeile pro Demo + Detail bei Fail).

#### C2 — CI-Integration

- Neuer npm-script: `"test:demos": "npx tsx tools/test.ts --demo-suite=tools/test-runner/demo/scripts --pacing=instant"`
- `pacing=instant` für CI (kein Mausanim, kein Keystroke-Delay)
- JUnit-Reporter (existiert für Tests) wiederverwenden — `--junit=reports/demos.xml`
- HTML-Reporter mit Screenshots an Fehlschlag-Stellen

Wenn das stabil läuft: Aufnahme in Pre-Push-Hook oder Pull-Request-CI.

#### C3 — Iteration: Watch + Debug

- `--watch`: chokidar auf `--demo=PATH`, re-run on save (existing chokidar
  oder fs.watch)
- `--step`: nach jedem mutierenden Step (`drop*`/`move*`/`drag*`/`inlineEdit`
  /`expectCode`/`expectDom`) pause, „Enter" zum Weitergehen — User kann den
  Browser anschauen und manuell prüfen
- `--from-step=N`: erste N Steps schnell durchlaufen (pacing instant), ab
  Step N normales Pacing — für Iteration am Ende langer Demos
- `--until-step=N`: stoppt nach Step N — für Lern-Modus an einer einzelnen
  Stelle

#### C4 — Snapshot Library

Bei jedem `expectCode`/`expectDom` einen Screenshot-Hash speichern. Mismatch
gibt nicht nur Text-Diff, sondern verweist auf Screenshot.

**Speicherort**: `test-results/snapshots/<demo-name>/<step-N>.png`. Bei Demo-
Lauf wird automatisch ein neuer Screenshot erzeugt. Strict-Match-Modus
zusätzlich: vergleich mit Baseline-Screenshot via pixel-diff (`pixelmatch`
ist schon in node_modules).

### Phase D — Showcase-Demos

Sobald A+B+C laufen, schreiben wir die folgenden Demos um die neuen
Capabilities zu demonstrieren — und gleichzeitig als Regression-Suite.

| Demo                            | Zeigt                                                           | Nutzt              |
| ------------------------------- | --------------------------------------------------------------- | ------------------ |
| `visual-editing.ts` (existiert) | Drag, Resize, Padding, Margin, Inline-Edit, Reorder             | Phase 0            |
| `property-workflow.ts`          | Preview-Klick → Properties anpassen → Color-Token wählen → Code | A1, A2, B1         |
| `ai-assisted-card.ts`           | User tippt `-- card mit titel und button`, AI generiert         | A1, A2, B2         |
| `token-system.ts`               | Token-Datei anlegen, Tokens definieren, im Layout referenzieren | A3 (Fragments), B1 |
| `responsive-design.ts`          | Device-Preset wechseln, Layout für mobile/desktop tunen         | A1, A2             |
| `component-extraction.ts`       | Mehrfache Card-Instanzen → Component-Definition extrahieren     | A3, B1             |
| `state-interactions.ts`         | Hover/active/toggle-States definieren, Buttons mit toggle()     | A1, A2, B1         |

Jede Demo hat ein eigenes `docs/concepts/<name>-demo.md` analog zu
`visual-editing-demo.md`.

## Definition of Done pro Phase

Phase A: `visual-editing.ts` läuft mit Selectors statt nodeIds und nutzt
`expectDom` für mindestens 3 Schritte. Mindestens 1 Fragment extrahiert.

Phase B: Eine neue Demo `property-workflow.ts` läuft grün und nutzt mindestens
3 Property-Panel-Actions. Eine `ai-assisted-card.ts` läuft mit Mock-Mode grün.

Phase C: `npm run test:demos` läuft alle Skripte aus
`tools/test-runner/demo/scripts/`, gibt einen Aggregat-Report aus, generiert
JUnit-XML.

Phase D: Alle 7 Showcase-Demos in der Tabelle laufen grün in CI. Jede hat ein
Konzept-Dokument.

## Vorgehen / Pull-Request-Strategie

Jede Phase = eigener PR, jede Sub-Stufe (A1, A2, ...) = eigener Commit oder
Sub-PR. Reihenfolge fix:

```
A1 → A2 → A3   (Phase A, Foundation)
        ↓
B1 ↔ B2        (Phase B, parallel möglich nach A)
   ↓
C1 → C2 → C3 → C4   (Phase C, sequenziell)
   ↓
D1 ... D7      (Phase D, parallel möglich)
```

Showcase-Demos in Phase D sind parallel — verschiedene Beitragende können
gleichzeitig daran arbeiten.

## Nicht-Ziele (bewusst rausgelassen)

- **Kein Cypress/Playwright-Ersatz**: das hier ist nicht für unit-tests.
- **Kein Visual-Diff in Pixel-Genauigkeit als Default**: Snapshot-Library
  (C4) macht pixel-diff _optional_, nicht standard. Wir validieren primär
  über Code+DOM.
- **Keine Demo-Authoring-UI**: Demos werden in TypeScript geschrieben, nicht
  über GUI generiert. Das wäre ein anderes Projekt.
- **Kein Cross-Browser-Test**: Chrome/Edge reicht. Mirror selbst ist
  Chromium-zentriert.

## Architektur-Entscheidungen

Diese Entscheidungen sind getroffen und gelten für die ganze Roadmap.
Begründung jeweils: langfristig saubere Lösung priorisiert über
kurzfristigen Aufwand.

### E1 — Selector ist nur strukturierte Objekte, keine String-Shortcuts

```ts
type Selector =
  | { byId: string } // ehemals 'node-3' als raw string
  | { byText: string | RegExp; nth?: number }
  | { byTag: string; nth?: number }
  | { byPath: string } // "Card > H1"
  | { byRole: string; nth?: number }
  | { byTestId: string }
```

Begründung: String-as-Selector ist ambiguous (`'h1'` Tag oder NodeId?),
verhindert TypeScript-Discriminator-Narrowing, erzwingt Runtime-
Disambiguation. Demo-Skripte werden ein paar Zeichen länger, dafür typsicher
und IDE-freundlich.

### E2 — `expectDom`-Schema explizit deklariert, tag-spezialisiert, erweiterbar

Single source of truth für Lern-Modus-Output:

```ts
const DOM_SCHEMA: Record<string, readonly string[]> = {
  '*':      ['tag', 'text', 'visible', 'width', 'height',
             'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
             'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
             'color', 'background'],
  'button': ['disabled'],
  'img':    ['src', 'alt'],
  'input':  ['type', 'placeholder', 'value', 'disabled'],
}

// Per-check Erweiterung wenn ein Default-Set nicht reicht
{ selector: { byId: 'node-2' }, extras: ['boxShadow', 'transform'] }
```

Begründung: Lern-Modus produziert vorhersagbare Snapshots, kein Bloat. Wenn
eine Demo Effekt-Properties testen will (Shadow, Transform), wird das
explizit pro Check angefordert — Schema bleibt klein und Demo-Skripte
dokumentieren, was sie wirklich validieren.

### E3 — AI-Fixtures: Plain JSON, Prompt-String als Key, kein Hash

Format:

```json
// tools/test-runner/demo/fixtures/ai-<name>.json
{
  "card mit titel und button": "Frame bg #27272a, ...",
  "login formular": "..."
}
```

CLI:

```bash
--ai-record=PATH      # Demo läuft mit echtem LLM, schreibt Antworten ins File
--ai-mock=PATH        # Demo läuft offline, spielt Antworten ab
```

Bei nicht-gemocktem Prompt: `Demo failed — no mock for prompt: "<exakter
Text>". Run with --ai-record=<file> to capture.`

Begründung: Hashing macht Fixtures unlesbar — kein PR-Review möglich,
keine manuelle Pflege. Plain JSON ist editierbar, diff-bar, dokumentiert
sich selbst. Record-Modus löst das „Fixture-Erstellen ist Arbeit"-Problem.
