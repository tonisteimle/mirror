# Demo Blueprint

Verbindlicher Bauplan für alle Mirror-Demos. Wer eine neue Demo schreibt
oder eine bestehende anfasst, hält sich daran. Wer den Demo-Player
anpasst, erzwingt diese Regeln im Code.

## 1. Setup

Demos starten **immer leer**. Mirror Studio läuft mit `?demo=blank` — der
LocalStorage-Provider überspringt die State-Wiederherstellung und legt
ein einzelnes leeres `index.mir` an. Der Demo-Runner hängt diesen Query-
Parameter automatisch an die URL beim Navigieren; die Demo selbst muss
nichts tun.

**Verboten:** `setTestCode(...)` in Setup-Fragments, programmatisches
Vorbefüllen des Editors, Bypassing des Mirror-Compilers via
`__compileTestCode`. Der State soll allein durch sichtbare User-Inputs
(`type`, `dropFromPalette`, …) entstehen.

Der Runner injiziert als allerersten Step automatisch ein `expectCode`
mit leerem String. Demo-Autoren müssen das nicht hinschreiben.

## 2. Validierung pro Step

Für jeden **mutierenden** Step (siehe Liste unten) gilt:

1. `expectCode` ist **Pflicht**. Der Demo-Loader weigert sich, eine
   Demo zu starten, in der ein mutierender Step keinen erwarteten
   Source-Snapshot mitbringt.
2. **Strict Parse-Validation läuft automatisch.** Nach jeder Mutation
   ruft der Runner Mirror's Parser auf den aktuellen Editor-Inhalt auf;
   bei einem Parse-Fehler bricht die Demo ab und nennt die Zeile.
3. **Frame-Capture läuft automatisch.** PNG (Screenshot) + `.mir`
   (Editor-Source) werden ins Frames-Verzeichnis geschrieben. Reviewer
   können die Demo später durchblättern, ohne live zuzuschauen.

Mutierende Steps:

```
type, pressKey, createFile, switchFile, clearEditor,
dropFromPalette, moveElement, dragResize, dragPadding, dragMargin,
inlineEdit, selectInPreview (wenn Source-ändernd), setProperty,
pickColor, aiPrompt, execute (raw JS — Audit erforderlich)
```

Click/moveTo/highlight/comment/wait/expectCode/expectDom/validate sind
**nicht** mutierend und brauchen kein expectCode.

## 3. Action-Primitiven

Eine kanonische Liste. Demo-Autoren bevorzugen diese Primitiven über
ad-hoc `execute`-Steps, weil sie Validierung, Timing und Frame-Capture
konsistent durchziehen.

| Primitive         | Was es macht                                                                | Timing-Klasse |
| ----------------- | --------------------------------------------------------------------------- | ------------- |
| `type`            | Echtes JS-dispatch in den Editor (deterministisch, layout-agnostisch)       | `typing`      |
| `dropFromPalette` | OS-Maus-Drag von Palette-Item → Drop-Target                                 | `drop`        |
| `moveElement`     | OS-Maus-Drag eines bestehenden Elements → Container                         | `drop`        |
| `dragResize`      | OS-Click + OS-Drag des Resize-Handles                                       | `handle`      |
| `dragPadding`     | OS-Click → Tap `P` → OS-Drag des Padding-Handles (Shift/Alt für mode)       | `handle`      |
| `dragMargin`      | OS-Click → Tap `M` → OS-Drag des Margin-Handles                             | `handle`      |
| `inlineEdit`      | OS-Doppelklick → Text via `execCommand` → blur                              | `edit`        |
| `setProperty`     | OS-Click ins Property-Feld → Wert via JS → Enter                            | `edit`        |
| `pickColor`       | OS-Click Swatch → Picker (Wert via Studio-API gesetzt — Picker-UI variabel) | `edit`        |
| `selectInPreview` | OS-Click auf Preview-Knoten                                                 | `click`       |
| `aiPrompt`        | Tippen + AI-mock + Resultat einfügen                                        | `typing`      |

`execute` (raw JS) ist Fallback für Setup-Sonderfälle. Mutierende
`execute`-Steps brauchen ebenfalls `expectCode`.

## 4. Timings

Eine zentrale Tabelle in `tools/test-runner/demo/timing-classes.ts`.
Action-Implementierungen lesen ihre `preHoldMs` / `dwellMs` / `settleMs`
**ausschließlich** dort heraus. Magic Numbers im Action-Code sind ein
Bug.

| Klasse   | preHold | dwell | settle |
| -------- | ------- | ----- | ------ |
| `drop`   | 220     | 800   | 360    |
| `handle` | 180     | 600   | 260    |
| `edit`   | 140     | 0     | 200    |
| `click`  | 0       | 0     | 180    |
| `typing` | 0       | 0     | 200    |

`pacing=video` (Default für headed) verwendet diese Werte direkt.
`pacing=instant` (Default für headless / suite) skaliert sie auf das
Minimum, damit Tests schnell sind.

## 5. Selectors

**Nur strukturierte Selectors** für Mirror-Knoten:

```ts
{ byId: 'node-2' }
{ byTag: 'h1', nth: 0 }
{ byPath: 'Frame > Frame > H1' }
{ byText: 'Loslegen' }
```

**String-Selektoren nur** für Studio-UI-Chrome (Components-Panel,
Editor-Wrapper etc.) — nie für Mirror-Inhalt. Beispiele:

```ts
'#components-panel [data-id="comp-frame"]'
'.cm-editor'
'#preview'
```

## 6. Demo-Lifecycle

Der Player ist die einzige Quelle, die diese Reihenfolge garantiert:

1. Navigate `?demo=blank` (auto)
2. Auto-inject `expectCode: ''` als allerersten Step
3. Pro folgendem Step:
   1. Action ausführen (OS-Maus / OS-Tastatur / JS für `type`)
   2. **Auto:** Frame capture (PNG + `.mir`)
   3. **Auto:** Strict parse-validation (Mirror-Parser muss happy sein)
   4. Wenn `step.expectCode` gesetzt: Source-Vergleich, fail-fast bei Diff
4. Demo-Ende: Summary mit Pass/Fail pro Step

## 7. Was es nicht gibt

- Kein synthetischer `setTestCode` außerhalb von Setup-Fragments
- Kein hartkodiertes Pixel-Pacing in Action-Implementierungen
- Kein Fake-Cursor / Fake-Drag-Ghost / Fake-Drop-Indicator —
  `--driver=os` treibt den echten macOS-Cursor, alle visuellen
  Feedbacks kommen von Mirror Studio selbst
- Kein optionales `expectCode` auf mutierenden Steps

## 8. Beispiel: Hello-World-Demo

```ts
import type { DemoScript } from '../types'

export const demoScript: DemoScript = {
  name: 'Hello World',
  description: 'Empty → canvas tippen → Frame droppen',
  steps: [
    // Auto-injected: expectCode: ''

    // Setup via User-Inputs
    { action: 'comment', text: 'Schritt 1: canvas tippen' },
    { action: 'moveTo', target: '.cm-editor' },
    { action: 'click' },
    {
      action: 'type',
      text: 'canvas mobile, bg #0f0f0f, col white',
      expectCode: 'canvas mobile, bg #0f0f0f, col white',
    },

    // Drop
    { action: 'comment', text: 'Schritt 2: Frame aus Palette' },
    { action: 'moveTo', target: '#components-panel [data-id="comp-frame"]' },
    { action: 'highlight', target: '#components-panel [data-id="comp-frame"]', duration: 1500 },
    {
      action: 'dropFromPalette',
      component: 'Frame',
      target: { byId: 'node-1' },
      at: { kind: 'index', index: 0 },
      expectCode:
        'canvas mobile, bg #0f0f0f, col white\n' + '\n' + 'Frame w 100, h 100, bg #27272a, rad 8',
    },
  ],
}
```

Das ist alles. Setup-Fragments sind optional und nur für
wiederkehrende Sequenzen sinnvoll.

## 9. Lauf

```bash
# Single demo, headed, real OS mouse
npx tsx tools/test.ts --demo=path/to/demo.ts --headed --pacing=video --driver=os

# Mit Frame-Capture für Static-Review
npx tsx tools/test.ts --demo=path/to/demo.ts --headed --pacing=video --driver=os --frames=/tmp/demo-frames

# Headless suite (alle Demos)
npm run test:demos
```

## 10. Implementierungs-Verweise

- Player: `tools/test-runner/demo/runner.ts` — Lifecycle, Auto-Validation, Frame-Capture
- Action-Implementierungen: gleiche Datei, `runDropFromPaletteOs` etc.
- Timings: `tools/test-runner/demo/timing-classes.ts`
- OS-Maus / OS-Tastatur: `tools/test-runner/demo/os-mouse.ts`
- Studio-Hook für canvas-only Drops: `studio/app.js` (drag:dropped Subscriber)
- LocalStorageProvider blank-mode: `studio/storage/providers/localstorage.ts`
