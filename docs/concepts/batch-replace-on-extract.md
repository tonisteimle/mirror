# Batch-Replace on Extract — Konzept

> **Status**: Implementiert (Phase A, B, C).
>
> Erweitert die bestehenden `::`-Trigger (Component-Extract,
> Token-Extract) um einen automatischen Project-Scan: nach der
> Extraction werden _alle anderen_ Lines im Projekt mit demselben
> Pattern als Batch-Replace-Kandidaten angeboten. Schliesst die
> "Cleanup-Phase"-Lücke, in der Designer aus rohem Draft-Code
> wiederverwendbare Tokens und Components herausziehen.
>
> **Implementation**:
>
> - `studio/editor/extract/pattern-match.ts` — pure match-Logik
> - `studio/editor/extract/apply-batch-replace.ts` — pure Datei-Rewrites
> - `studio/editor/extract/batch-replace-dialog.ts` — Modal-UI
> - Trigger-Hooks in `component-extract-trigger.ts` und `token-extract-trigger.ts`
> - 90 vitest-Tests in `tests/studio/editor/{pattern-match,apply-batch-replace}.test.ts`
>
> **Commits**: Phase A (`1db3d618`), Phase B (`39058560`), Phase C (`3bfef9af`).

## Motivation

Der bestehende `::`-Trigger arbeitet **lokal**: eine Zeile wird zu
Component/Token, die anderen identisch-styled Zeilen im Projekt
bleiben unangetastet. Designer-Workflow ist aber typischerweise:

1. **Draft-Phase**: schnell viel Inline-Code schreiben, oft mit
   Copy-Paste-Wiederholungen
2. **Cleanup-Phase**: Patterns erkennen, Tokens/Components extrahieren,
   _alle Vorkommen_ durch die neue Abstraktion ersetzen

Heute deckt `::` nur Schritt 2a ab (Extract auf einer Stelle). Schritt
2b (alle anderen Stellen ersetzen) erfordert manuelles Find-and-Replace.

Mit Batch-Replace deckt _ein_ `::`-Trigger den ganzen Cleanup-Schritt
ab: extract + replace-all in einem Klick.

## Match-Regel (Kern)

> Zwei Lines matchen dasselbe Pattern, wenn sie strikt identisch sind
> **bis auf gequotete Strings, die beliebig abweichen dürfen.**

Begründung: Designer haben Patterns wie "ein Card mit unterschiedlichem
Inhalt" oder "ein Icon mit verschiedenen Symbolen". Strings sind
per-Instance-Content (Text, Icon-Name, Image-Src, Label,
Placeholder, …) und unterscheiden sich praktisch immer. Hex,
Numbers, Tokens, Keywords sind dagegen Stilwerte — wenn die abweichen,
ist es ein anderes Pattern.

| Wert-Typ                  | Darf abweichen? | Begründung                                             |
| ------------------------- | --------------- | ------------------------------------------------------ |
| Quoted string (`"..."`)   | ✅ ja           | Per-Instance-Content                                   |
| Hex (`#2271C1`)           | ❌ nein         | Stilwert                                               |
| Number (`24`, `200`)      | ❌ nein         | Grösse / Spacing                                       |
| Token (`$primary`)        | ❌ nein         | `$primary` ≠ `$danger` semantisch                      |
| Keyword (`hug`, `hor`)    | ❌ nein         | Layout-Entscheidung                                    |
| Property-Name (`bg`, …)   | ❌ nein         | Strukturelle Property                                  |
| Boolean / standalone flag | ❌ nein         | `disabled`, `hidden`, `checked` — semantischer Zustand |

## Beispiele

```mirror
// Component-Extract Match-Verhalten:

Icon "edit", ic #888, is 24       ← Match
Icon "trash", ic #888, is 24      ← Match (string differt)
Icon "save", ic #888, is 24       ← Match
Icon "edit", ic #fff, is 24       ← Kein Match (hex differt)
Icon "edit", ic #888, is 32       ← Kein Match (number differt)
Icon "edit", ic $primary, is 24   ← Kein Match (token differt)

Button "Save", #2271C1            ← Match
Button "Cancel", #2271C1          ← Match
Button "Delete", #ef4444          ← Kein Match (Hex)

Image src "a.jpg", w 200, h 100   ← Match
Image src "b.jpg", w 200, h 100   ← Match (src ist string)
Image src "a.jpg", w 300, h 100   ← Kein Match (number)

Frame pad 16, bg #1a1a1a, rad 8   ← Match (kein leading string)
Frame pad 16, bg #1a1a1a, rad 8   ← Match
Frame pad 16, bg #2271C1, rad 8   ← Kein Match (hex)
```

## Tokenisierung

Vor dem Vergleich wird jede Line in eine kanonische Form gebracht.

### Schritt 1: Stripping

- Inline-Kommentare entfernen (`// ...` bis Zeilenende)
- Trailing-Whitespace + Trailing-Komma entfernen
- Multiple-Spaces zu Single-Space normalisieren

### Schritt 2: Strukturelle Zerlegung

```
ElementName [LeadingString] [, prop1, prop2, ...]
```

Jede Property-Segment-Tokenisierung:

```
[name] value
```

- Wenn Segment mit Identifier startet (`a-zA-Z` + alphanumerisch),
  ist das die Property-Name
- Rest ist Value
- Value kann mehrere Tokens enthalten (z.B. `pad 12 24` → name=`pad`,
  value=`12 24`)

### Schritt 3: Wert-Klassifikation

Jeder Wert (oder Wert-Token) wird klassifiziert:

| Klasse     | Beispiele                                 |
| ---------- | ----------------------------------------- |
| `string`   | `"..."`, `'...'`                          |
| `hex`      | `#abc`, `#abc123`, `#abc12345`            |
| `number`   | `12`, `-1.5`, `0.3`                       |
| `token`    | `$primary`, `$primary.bg`, `$user.name`   |
| `keyword`  | `hug`, `full`, `hor`, `center`, `bold`, … |
| `function` | `rgba(0,0,0,0.5)`, `linear-gradient(…)`   |
| `boolean`  | `true`, `false`                           |

### Schritt 4: Positional-Resolution

**Wichtig**: Match wird auf der _resolveden_ Form gemacht, nicht der
Source-Form. So matchen `Frame 100, 50, #333` und `Frame w 100, h 50,
bg #333` als selbes Pattern, weil der existierende Positional-Resolver
beide zur gleichen kanonischen Form expandiert.

```
"Frame 100, 50, #333"
  → Resolver-Pass
  → "Frame w 100, h 50, bg #333"
  → Tokenisierung
  → { name: "Frame", props: [(w, 100), (h, 50), (bg, #333)] }
```

### Schritt 5: Sortierung (Property-Order-Independent)

Property-Reihenfolge ist semantisch irrelevant in Mirror — `Frame bg
#333, pad 16` und `Frame pad 16, bg #333` produzieren identisches DOM.
Für Match-Zwecke werden Properties **alphabetisch nach Name sortiert**
bevor verglichen wird.

## Match-Algorithmus

```
function isMatch(rawA: string, rawB: string): boolean {
  const a = canonicalize(rawA)
  const b = canonicalize(rawB)

  if (a.elementName !== b.elementName) return false

  // Leading content: beide vorhanden oder beide nicht
  if (!!a.leadingString !== !!b.leadingString) return false

  // Property-Sets müssen gleich gross sein
  if (a.props.length !== b.props.length) return false

  // Properties paarweise vergleichen (sortiert nach name)
  for (let i = 0; i < a.props.length; i++) {
    const pa = a.props[i]
    const pb = b.props[i]
    if (pa.name !== pb.name) return false
    if (!valuesMatch(pa.value, pb.value)) return false
  }

  return true
}

function valuesMatch(va: ClassifiedValue, vb: ClassifiedValue): boolean {
  // Beide Strings → dürfen abweichen
  if (va.kind === 'string' && vb.kind === 'string') return true
  // Sonst: alle Tokens müssen gleich sein
  return va.kind === vb.kind && va.raw === vb.raw
}
```

## Token-Extract-Variante (simpler)

Bei `value::tokenName` ist der Match feiner: nur die _eine_
Property-Segment, nicht die ganze Line.

```
"bg primary::#2271C1" triggert
  → Token primary.bg = #2271C1 entsteht
  → Diese Stelle: bg #2271C1 → bg $primary
  → Project-Scan: alle Property-Segmente mit name="bg" und
    klassifizierter Wert kanonisch == "#2271C1"
  → Replace alle gefundenen Segmente mit "bg $primary"
```

Strings sind hier irrelevant (Tokens sind keine Strings). Match ist
strikt auf `(name, value)`-Paar.

**Frage** (offen, siehe unten): Soll auch `Frame #2271C1` (positional
mit Resolver-Expansion zu `bg #2271C1`) als Match gelten? Prinzipiell
ja, weil canonicalize() den Resolver durchläuft.

## UX Flow

Nach `::`-Trigger und erfolgreicher Extraction:

1. Editor-Change wird wie bisher angewendet (Line wird zu Instance,
   Definition wird in `.com` geschrieben)
2. Studio scannt **alle Source-Files im Projekt** nach matchenden
   Patterns
3. Wenn Matches gefunden: Modal-Dialog oder grosser Toast erscheint:

```
┌─────────────────────────────────────────────────┐
│  Card extrahiert.                               │
│                                                 │
│  3 weitere Frames mit identischen Properties    │
│  gefunden. Auch durch Card ersetzen?            │
│                                                 │
│   ☑ projects.mir:42  Frame pad 16, bg #1a1a1a…  │
│   ☑ projects.mir:67  Frame pad 16, bg #1a1a1a…  │
│   ☑ team.mir:18      Frame pad 16, bg #1a1a1a…  │
│                                                 │
│              [Anwenden]  [Abbrechen]            │
└─────────────────────────────────────────────────┘
```

- Per Default sind alle Matches **gewählt** — User kann opt-out per
  Klick wenn ein Match doch nicht passt
- Klick auf einen Match-Eintrag öffnet die Datei an der Stelle (Preview
  ohne den Dialog zu schliessen)
- "Anwenden" macht alle gewählten Replaces in einem einzigen
  Undo-Schritt
- "Abbrechen" tut nichts weiter (die Original-Extraction bleibt
  bestehen — nur die Batch-Replaces werden nicht angewendet)

**Wenn keine Matches**: Dialog erscheint nicht. Original-Extraction
bleibt das einzige Resultat (unverändertes Verhalten).

## Implementation-Skizze

### Neue Module

- `studio/editor/extract/pattern-match.ts`
  - `canonicalize(line: string): CanonicalLine`
  - `linesMatch(a: string, b: string): boolean`
  - `findProjectMatches(target: string, files: ProjectFiles): MatchResult[]`

### Erweiterung bestehender Trigger

- `studio/editor/triggers/component-extract-trigger.ts`:
  - Nach `computeExtraction()`: `findProjectMatches()` aufrufen
  - Wenn Matches > 0: BatchReplaceDialog anzeigen
  - Bei Confirm: für jede Match-Datei `updateFile(name, applyReplace(...))`

- `studio/editor/triggers/token-extract-trigger.ts`:
  - Analog, aber mit feinerem Property-Segment-Match statt Line-Match

### Neue UI-Komponente

- `studio/components/batch-replace-dialog.ts` (oder analog im
  bestehenden Studio-Style)
  - List of matches mit Checkboxen
  - Datei-Preview-Verlinkung
  - Apply / Cancel

### Pure Funktionen (für Vitest-Test)

`canonicalize`, `linesMatch`, `findProjectMatches` sind reine
Funktionen → testbar ohne Studio-Kontext (analog zu `computeExtraction`).

## Edge Cases

| #   | Fall                                                  | Verhalten                                           |
| --- | ----------------------------------------------------- | --------------------------------------------------- |
| E1  | Positional vs explizit (`Frame 100` vs `Frame w 100`) | Match (kanonisiert via Resolver)                    |
| E2  | Property-Order anders                                 | Match (sortiert vor Vergleich)                      |
| E3  | Multi-Token-Values (`pad 12 24`)                      | Match nur wenn Token-Sequenz identisch              |
| E4  | Tokens (`bg $primary` vs `bg $danger`)                | Kein Match (`$`-Werte müssen gleich)                |
| E5  | Inline-Kommentare                                     | Strip vor Vergleich                                 |
| E6  | Whitespace-Variationen                                | Normalisiert vor Vergleich                          |
| E7  | Leading-String präsent vs absent                      | Kein Match                                          |
| E8  | Beide haben Leading-String                            | Match (String darf abweichen)                       |
| E9  | Leerzeichen vs Tab in Indent                          | Indent ist nicht Teil der Property-Liste, ignoriert |
| E10 | Same line in same file as target                      | Skip (target ist bereits ersetzt)                   |
| E11 | Line ist innerhalb `hover:`/`state:`-Block            | **v1: skip** — nur Top-Level-Use-Sites              |
| E12 | Line ist innerhalb einer Component-Definition         | **v1: skip** — Definitions sind keine Use-Sites     |

## Phasing

### Phase A — Component-Extract Batch-Replace ✅

Fertig in Commit `1db3d618`. Komponenten:

- `pattern-match.ts`: `canonicalize` / `linesMatch` / `propertiesMatch` /
  `findProjectMatches`
- `apply-batch-replace.ts`: `applyBatchReplace` / `rewriteMatchLine`
- `batch-replace-dialog.ts`: Modal mit Per-Match-Checkboxen
- Trigger-Integration in `component-extract-trigger.ts`
- 51 vitest-Tests + 11 apply-Tests

Match ist **element-name-agnostic** (Frame, Btn, Box etc. matchen
gegenseitig wenn die Properties gleich sind), weil User nicht weiss
was vorher dort stand und Designer-Workflow oft mehrere Element-Typen
mit gleichem Styling hat.

### Phase B — Token-Extract Batch-Replace ✅

Fertig in Commit `39058560`. Komponenten:

- `pattern-match.ts`: `findSegmentMatches` (Property-Segment-Granularität)
- `apply-batch-replace.ts`: `applySegmentReplace`
- Trigger-Integration in `token-extract-trigger.ts`
- 7 vitest-Tests für findSegmentMatches + 4 apply-Tests

**v1-Limit**: positional Werte (`Frame #2271C1`) werden NICHT gematcht,
nur explizite (`bg #2271C1`). Positional-Replace im Source ist
ambiguous; mixed-syntax Projekte brauchen einen manuellen Pass.

### Phase C — Override-Modus ✅

Fertig in Commit `3bfef9af`. Komponenten:

- `pattern-match.ts`: `findNearMatches` (≤3 abweichende Werte)
- `apply-batch-replace.ts`: `applyNearMatchReplace` / `rewriteNearMatchLine`
- Dialog erweitert: zwei Sektionen (Exakt grün, Ähnlich amber)
- Component-Extract-Trigger ruft jetzt `findProjectMatches` UND
  `findNearMatches` auf
- 9 vitest-Tests für findNearMatches + 8 apply-Tests

**Verhalten**: bei "fast-gleich" (gleiche Property-Namen, ≤3 Werte
abweichend) wird die abweichende Property zur Override am neuen
Instance. Beispiel:

```
Frame pad 16, bg #2271C1, rad 8     → Card bg #2271C1
Frame pad 16, bg #1a1a1a, rad 8     → Card                 (target — exact match)
Frame pad 16, bg #ef4444, rad 8     → Card bg #ef4444
```

UX: separate Sektion "Ähnlich (N) — mit Override" im Dialog,
**default uncheck** (opt-in). Designer sieht Preview wie
`Frame ... → Card bg #ef4444`, kann pro Match entscheiden.

**v1-Limits in Phase C**:

- Maximal 3 abweichende Werte (`NEAR_MATCH_MAX_DIFFS`); mehr werden
  ignoriert
- Property-Namen-SETS müssen identisch sein (extra/fehlende Properties
  → kein Near-Match)
- Lines mit positional bare values werden ignoriert (zu ambig)

## Entscheidungen aus dem Implementations-Verlauf

Während der Phase-A-Diskussion wurden folgende Punkte geklärt:

1. **Element-Name strikt vs. agnostisch**: ursprünglich war `linesMatch`
   strikt (gleiches Element). Problem: User typt `Card::` auf einer
   Frame-Zeile, wir wissen nicht was es war. Lösung: `propertiesMatch`
   (element-name-agnostic) für Component-Extract; `linesMatch` (strikt)
   bleibt für Spezialfälle (Token-Extract). Designer entscheidet im
   Dialog welche Element-Typen unifiziert werden.

2. **String-Toleranz**: Quoted Strings (`"..."`) dürfen abweichen, alles
   andere muss byte-genau matchen. Per-Instance-Content (Text, Icon-
   Name, Image-Src, Button-Label) ist genau das was zwischen Instances
   unterschiedlich sein darf.

3. **Children-Matching**: Children werden NICHT für die Match-Entscheidung
   herangezogen. Beim Replace wandern sie einfach mit (`Frame x → Card`
   lässt die indented Children unter Card stehen). Decken automatisch
   die "Card-mit-verschiedenem-Content"-Pattern.

4. **Positional vs. explizit**: Component-Extract nutzt den
   Positional-Resolver für Kanonisierung — `Frame 100, 50, #333`
   matcht `Frame w 100, h 50, bg #333`. Token-Extract bleibt
   explizit-only (positional-Replace im Source ist ambig).

5. **Multi-Value-Property-Reihenfolge**: `pad 12 24` und `pad 24 12`
   matchen NICHT (Reihenfolge ist semantisch).

## Offene Fragen / nicht-implementiert

1. **Performance bei grossen Projekten**: nicht systematisch gemessen;
   bei 1000+-Lines-Projekten könnten 3 separate Scans (exact + near +
   bei Token-Extract segments) merkbar werden. Bei Bedarf cachen.

2. **Hover-/State-Children-Blöcke**: Lines innerhalb von `hover:` /
   `state:`-Blöcken werden derzeit nicht als Match-Kandidaten
   betrachtet. Wenn Designer auch Hover-Variant-Lines unifizieren
   wollen, braucht's einen separaten Pass mit Indentation-Awareness.

3. **Token-zu-Hex-Match**: `bg #2271C1` und `bg $primary` (wo
   `$primary.bg = #2271C1`) matchen NICHT — token-Wert vs hex-Wert
   klassifizieren sich verschieden. User muss separat mit `value::token`
   konvertieren. Möglich, aber nicht in v1.

4. **CDP-Browser-Test für Dialog**: vitest deckt die Pure-Logik ab,
   aber das DOM-Rendering und der End-to-End-Click-Flow im laufenden
   Studio sind nur manuell verifiziert. Ein CDP-Test wäre die letzte
   noch offene Test-Lücke.

5. **Reverse-Operation**: keine Geste um eine Komponente / einen Token
   wieder zu inlinen (z.B. `~~`). Niedrige Priorität — Designer
   editieren die Definition direkt, wenn nötig.

## Tradeoffs

**Wins**

- Cleanup-Phase wird _ein_ Klick statt manuellem Find-and-Replace
- Designer behält Kontrolle (kann Matches abwählen)
- Reine Erweiterung des bestehenden `::` — kein neues Konzept
- Match-Regel ist deterministisch und vorhersehbar

**Costs**

- Project-Scan-Latenz (sollte vernachlässigbar sein)
- Dialog-UI = neuer UX-Flow, der gelernt werden muss
- Match-Algorithmus muss positional + sort + value-classify
  korrekt machen — Code-Komplexität mittel

**Reversibilität**: hoch. Ein Cmd+Z macht alle Replaces (in einem
Transaction-Bündel) rückgängig. Wenn das Feature nicht funktioniert,
bleibt der bestehende `::`-Trigger wie er ist.
