# Visual Editing Demo

Demo-Skript für den **bestehenden Demo-Modus im Test-Runner** (`tools/test-runner/demo/`),
das einen vollständigen Mirror-Workflow per Drag & Drop, Resize/Padding/Margin-Handles
und Inline-Editing zeigt — als Video oder Live-Demo nutzbar.

## Auftrag

Eine Demo, die Schritt für Schritt zeigt, wie eine einfache UI (Card mit Titel, Text,
Button) ohne einzelne Code-Manipulation komplett visuell gebaut wird, unter Nutzung der
relevanten Mirror-Studio-Mechaniken:

- **Hierarchie** — Element in Container droppen, Element zwischen Containern verschieben,
  Reihenfolge ändern
- **Sizing** — Resize-Handles ziehen
- **Padding** — Padding-Handles ziehen
- **Margin** — Margin-Handles ziehen
- **Inline-Editing** — Text-Inhalte per Doppelklick ändern

Die Demo ist eine Erweiterung des **bestehenden Demo-Modus** (`--demo=PATH`-Flag des
Test-Runners), nicht ein eigenes neues System. Wenn der Runner heute keine saubere API
für eine Aktion hat, wird die API erweitert — _nicht_ via `execute`-Action mit
eingebettetem JS umgangen.

## Architektur-Prinzipien

1. **Test-Runner-Erweiterung, nicht ad-hoc**: Jede wiederkehrende Aktion braucht einen
   eigenen Action-Type in `tools/test-runner/demo/types.ts`, einen Handler in
   `runner.ts`, und nutzt die schon bestehende Browser-Interactions-API
   (`studio/test-api/interactions.ts`) sowie `__dragTest`/`__mirrorTest`. Die
   `execute`-Action bleibt für Edge-Cases reserviert.

2. **Single-Cursor**: `__dragTest` hat einen eigenen Drag-Cursor (blauer Kreis), der
   Demo-Runner einen eigenen (Pfeil-SVG). Während eines echten Drags soll im Video
   _nur ein_ Cursor sichtbar sein — der Demo-Cursor. Konkret:
   `__dragTest.setAnimation({ showCursor: false })` einmal beim Demo-Start, dann steuert
   der Runner pro Aktion den Demo-Cursor parallel zur echten Drag-Operation.
   Cursor-Synchronisation gehört in den **Runner**, nicht in jedes Demo-Skript.

3. **Eingebauter Validierungs-Layer**: Pro mutierender Aktion muss erkennbar sein, ob
   sie wie erwartet gewirkt hat. Primär über `expectCode` (Strict-Vergleich des
   Editor-Inhalts gegen einen erwarteten Snapshot — siehe unten). Sekundär über die
   bereits existierende `validate`-Action mit DOM-Checks.

4. **Lern-Modus zur Kalibrierung**: `expectCode` ohne `code`-Feld dumpt den aktuellen
   Editor-Code. Ein erster Lauf füllt damit alle Erwartungen, ein zweiter sperrt sie ein.

## Status Quo (Stand 2026-04-25)

### Was funktioniert

- **Demo-Modus läuft** über `node_modules/.bin/tsx tools/test.ts --demo=PATH`. Der
  Runner spawned Chrome/Edge via CDP, navigiert zur Studio-URL, injiziert eine Demo-API
  ins Browser-Window und führt die Steps sequenziell aus.
- Die aktuelle `tools/test-runner/demo/scripts/visual-editing.ts` zeigt eine grüne
  Demo mit:
  - Frame in Canvas droppen (echtes Drag aus der Palette)
  - H1, Text, Button in die Card droppen
  - Padding-Handle ziehen (Top, +18 → snap auf 16)
  - Inline-Edit von H1 und Button
- `expectCode`-Action ist gebaut: `tools/test-runner/demo/types.ts` (Type),
  `tools/test-runner/demo/runner.ts` (Handler + `normalizeCode`/`lineDiff`-Helper).
- Cursor-Sync läuft heute _im Skript_ via `Promise.all([cursorAnim, dragOp])`. Das
  funktioniert, gehört aber in den Runner verschoben (siehe Architektur-Prinzip 2).
- Edge wird als Chromium-Browser akzeptiert (`tools/test-runner/chrome.ts`).

### Was fehlt

- **Hierarchie-Manipulation 2. Stufe**: Reorder eines bestehenden Elements innerhalb
  des Containers (`moveElement`).
- **Sizing**: Resize-Handle ziehen.
- **Margin**: Margin-Handle ziehen.
- **Saubere Action-Types**: Drop, Move, Resize, Padding, Margin, Inline-Edit laufen
  heute alle über `execute` mit eingebettetem JS.
- **Cursor-Sync zentral im Runner**: Heute pro-Skript dupliziert.
- **Snapping-Determinismus**: Beim Padding-Drag snappt der Wert per Default auf das
  8px-Grid. Für reproduzierbare Demos ggf. ein optionaler Bypass (z.B. Cmd-Modifier)
  pro Drag-Aktion.

## Geplante Test-Runner-Erweiterungen

### Neue Demo-Action-Types

In `tools/test-runner/demo/types.ts` — alle mit `comment?: string` und
`expectCode?: string` für Inline-Validierung direkt nach dem Schritt.

| Action            | Felder                                                                                                       | Browser-API                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `dropFromPalette` | `component`, `target` (nodeId), `at: { kind: 'index', index } \| { kind: 'zone', zone }`                     | `__dragTest.fromPalette(c).toContainer(t).atIndex(n).execute()` bzw. `.atAlignmentZone(z)` |
| `moveElement`     | `source` (nodeId), `target` (nodeId), `index`                                                                | `__dragTest.moveElement(s).toContainer(t).atIndex(n).execute()`                            |
| `dragResize`      | `nodeId`, `position: 'n'\|'s'\|'e'\|'w'\|'nw'\|'ne'\|'sw'\|'se'`, `deltaX`, `deltaY`, `bypassSnap?`          | `__mirrorTest.interact.dragResizeHandle(...)`                                              |
| `dragPadding`     | `nodeId`, `side: 'top'\|'right'\|'bottom'\|'left'`, `delta`, `mode?: 'single'\|'all'\|'axis'`, `bypassSnap?` | `enterPaddingMode` + `dragPaddingHandle`                                                   |
| `dragMargin`      | `nodeId`, `side`, `delta`, `mode?`, `bypassSnap?`                                                            | `enterMarginMode` + `dragMarginHandle`                                                     |
| `inlineEdit`      | `nodeId`, `text`                                                                                             | `window.__mirrorStudio__.inlineEdit.startEdit(nodeId)` + char-by-char input                |

`bypassSnap` setzt `cmd: true` im synthetischen Mouse-Event (siehe
`studio/visual/snapping-service.ts`). Für die Demo per Default `false`, damit echtes
Verhalten gezeigt wird; einzelne Schritte können bypassen.

### Cursor-Sync zentral

In `runner.ts` ein Helper:

```ts
// Pseudo-Code
async function withCursorSync(
  endPointSelector: () => Point | string, // Ziel-Position (oder Selector)
  durationMs: number,
  realOp: () => Promise<unknown>
): Promise<void> {
  const endPoint = resolveEndPoint(endPointSelector)
  const cursorAnim = window.__mirrorDemo.cursor.moveTo(endPoint, durationMs)
  const result = await Promise.all([cursorAnim, realOp()])
  // Error from realOp surfaces here
}
```

Pro neuem Action-Type ruft der Runner-Handler `withCursorSync` mit der korrekten
End-Position (Container-Mitte für Drops, Handle-Position für Resize/Padding/Margin,
etc.). Skripte enthalten keinen Cursor-Sync-Code mehr.

### Initial-Setup im Runner

Beim Demo-Start automatisch `__dragTest.setAnimation({ showCursor: false })` setzen,
am Ende wieder zurück. Aktuell im Skript dupliziert.

### `expectCode` ist schon da

Verhalten beibehalten:

- ohne `code`-Feld → Lern-Modus (dump)
- mit `code`-Feld → Strict-Compare nach Normalisierung, line-by-line-Diff bei Mismatch

## Geplanter Demo-Ablauf

Ziel: Eine **300-breite Card** mit Padding, Margin, sauberer Innerstruktur und einer
Reorder-Demonstration.

| #   | Schritt                                                 | Action                                    | Validierung                                   |
| --- | ------------------------------------------------------- | ----------------------------------------- | --------------------------------------------- |
| 1   | Reset auf leeren Canvas-Frame                           | `execute` (setTestCode)                   | `expectCode`                                  |
| 2   | Frame in Canvas droppen                                 | `dropFromPalette` (atIndex 0)             | `expectCode`                                  |
| 3   | Card-Frame breiter ziehen (z.B. e-Handle, +180px → 280) | `dragResize` (`bypassSnap: true`)         | `expectCode`                                  |
| 4   | H1 in Card droppen                                      | `dropFromPalette` (Alignment-Zone center) | `expectCode`                                  |
| 5   | Text in Card (atIndex 1)                                | `dropFromPalette`                         | `expectCode`                                  |
| 6   | Button in Card (atIndex 2)                              | `dropFromPalette`                         | `expectCode`                                  |
| 7   | Reorder: Button vor H1 schieben (Index 0)               | `moveElement`                             | `expectCode`                                  |
| 8   | Padding ziehen (Top, +24)                               | `dragPadding`                             | `expectCode`                                  |
| 9   | Margin ziehen (Top, +16)                                | `dragMargin`                              | `expectCode`                                  |
| 10  | Inline-Edit H1 → "Willkommen"                           | `inlineEdit`                              | `expectCode`                                  |
| 11  | Inline-Edit Button → "Loslegen"                         | `inlineEdit`                              | `expectCode`                                  |
| 12  | Final highlights (Editor + Preview)                     | `highlight`                               | `validate` (lint-clean, alle Texte vorhanden) |

Zwischen den Schritten kurze `wait`s und `comment`s für Video-Pacing.

## Validierungsstrategie

**Pro mutierender Schritt** ein `expectCode` direkt danach. Wenn der Editor-Inhalt
_exakt_ dem erwarteten Snapshot entspricht, weiß ich:

- Der Drop ist im richtigen Container gelandet
- Indent stimmt (= Hierarchie korrekt)
- Property-Update (alignment, pad-t, mar-t etc.) ist ausgeführt
- Reihenfolge stimmt
- Keine Phantom-Zeilen, kein duplizierter Code

**Zusätzlich** behalten wir die wichtigen `validate`-Steps am Ende (lint-clean,
Editor enthält erwartete Texte) als Sanity-Check.

**Lern-Modus-Workflow**:

1. Demo mit allen `expectCode`-Steps OHNE `code`-Feld schreiben
2. Lauf 1: Runner dumpt nach jedem Step den aktuellen Editor-Inhalt
3. Erwartete Snippets in `code`-Felder einkopieren
4. Lauf 2: Strict-Match überall ✓ — Demo ist gesperrt

**Bei Mismatch**: Der `lineDiff`-Output zeigt expected vs actual nebeneinander mit
`✗`-Marker auf differenden Zeilen. Daraus ergibt sich, ob es:

- einen echten Mirror-Bug gibt (Demo-Erwartung ist korrekt, Mirror schreibt anderes)
- eine Demo-Erwartungs-Ungenauigkeit ist (Mirror-Verhalten ist OK, ich hab falsch
  vorhergesagt — meine Erwartung anpassen)

## Vorgehen

In dieser Reihenfolge, jede Stufe alleine deploybar/lauffähig:

1. **Action-Types definieren** in `types.ts` — alle 6 neuen Actions plus optionale
   Felder (`bypassSnap`, `expectCode`-Inline)
2. **Runner-Handler implementieren** in `runner.ts` — pro Action ein `case` im
   `executeStep`-Switch, alle nutzen den neuen `withCursorSync`-Helper
3. **Browser-API-Glue** falls nötig in `studio/test-api/interactions.ts` —
   z.B. ein `dragHandle(nodeId, kind, side, delta, options)` der Padding und Margin
   einheitlich behandelt
4. **Demo umschreiben** in `visual-editing.ts` — alle `execute`-Blöcke ersetzen
   durch dedizierte Actions, alle `expectCode` zunächst ohne `code` (Lern-Modus)
5. **Lern-Lauf** und Erwartungen befüllen
6. **Strict-Lauf** — alle `✓`?
7. **Headed-Lauf** zur visuellen Kontrolle — sieht der Cursor flüssig aus, ist die
   Reihenfolge nachvollziehbar?

## Definition of Done

- `node_modules/.bin/tsx tools/test.ts --demo=tools/test-runner/demo/scripts/visual-editing.ts --pacing=video --headed`
  läuft grün durch (alle `expectCode` ✓, alle `validate` ✓, keine Lint-Errors)
- Im Skript steht **kein** `execute`-Block mehr — alle Aktionen sind dedizierte
  Action-Types
- Single-Cursor im Headed-Run sichtbar (kein zweiter blauer Kreis)
- Pro Schritt eine `expectCode`-Erwartung mit konkretem `code`-Snippet
- Demo zeigt alle 4 Mirror-Mechaniken: Hierarchie (Drop + Reorder), Sizing,
  Padding, Margin
