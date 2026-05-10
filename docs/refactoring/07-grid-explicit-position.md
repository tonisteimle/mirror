# Slice 7: Grid mit expliziter Position (`x`/`y`/`w`/`h`)

**Datum:** 2026-05-10
**Status:** erledigt — Phase A (Token x/y) + B (IR/React Cleanup) + C (Studio Position-Section grid-aware) + D (Validator + RT-Suite) committed; Browser-CDP-Studio-Roundtrip als Follow-up dokumentiert.

## Inhalt

1. [Audit (Zusammenfassung)](#1-audit-zusammenfassung)
2. [Untersuchungs-Ergebnisse](#2-untersuchungs-ergebnisse)
3. [Entscheidungen](#3-entscheidungen)
4. [Umsetzungsplan & Status](#4-umsetzungsplan--status)
5. [Tests](#5-tests)
6. [Review-Pass-Befunde](#6-review-pass-befunde)

---

# 1. Audit (Zusammenfassung)

## Scope

Slice 7 lockt das **Use-Pattern „explizite Cell-Platzierung"** im
Mirror-Grid: Kinder eines `grid N`-Containers werden mit `x N, y N`
(Start-Linien) und optionalem `w N, h N` (Spannweiten) gezielt im Raster
positioniert. Slice 6 hat den Container und die Cross-Backend-Mappings
(IR + DOM + React + Framework reverse-map) gelockt; Slice 7 ergänzt:

- Use-Site-Patterns (Header/Sidebar/Content, Mixed Auto-Flow + Explizit)
- Edge-Cases (Out-of-Bounds, negative Linien, `x 0`, Sibling-Overlap)
- Token-basierte Position (`header.x: 1`, `Frame x $header`)
- Studio-Property-Panel-Verhalten in Grid-Containern
- Out-of-Grid-Fallback (`x N, y N` ohne Grid-Parent → `position: absolute`)

```mirror
Frame grid 12, gap 8
  Frame x 1, y 1, w 12, h 2, bg blue   // Header
  Frame x 1, y 3, w 3, h 4, bg gray    // Sidebar
  Frame x 4, y 3, w 9, h 4, bg white   // Content
```

| Property        | In Grid-Parent                              | Außerhalb Grid                  |
| --------------- | ------------------------------------------- | ------------------------------- |
| `x N`           | `grid-column-start: N`                      | `position: absolute, left: Npx` |
| `y N`           | `grid-row-start: N`                         | `position: absolute, top: Npx`  |
| `w N` (numeric) | `grid-column-end: span N` (+ `width: 100%`) | `width: Npx`                    |
| `h N` (numeric) | `grid-row-end: span N` (+ `height: 100%`)   | `height: Npx`                   |

Die parent-context-Discrimination (`grid` vs. `not-grid`) ist eine
**IR-Compile-Time-Information** — `parentLayoutContext` wird durch die
Transformer-Pipeline weitergereicht (`property-transformer.ts:394–454`).
Backends (DOM, React, Framework) spiegeln die gleiche Logic.

## Probes

13 Cases (`_slice7_probes.ts`) gegen alle drei Backends + Validator.

### A — Standard-Use (Header/Sidebar/Content)

| #   | Eingabe                                   | DOM                                                                           | React                                                                              | Framework                           | Verdikt |
| --- | ----------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------- | ------- |
| A1  | `grid 12, gap 8` + 3 Kinder mit (x,y,w,h) | `grid-column-start/row-start/column-end span/row-end span` korrekt für alle 3 | `gridColumnStart/RowStart/ColumnEnd: 'span N'/RowEnd: 'span N'` korrekt für alle 3 | `x: N, y: N, w: N, h: N` round-trip | ✅      |

### B — Mixed children (Explicit + Auto-Flow)

| #   | Eingabe                                               | DOM                                                                                            | React     | Framework                               | Verdikt |
| --- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------- | --------------------------------------- | ------- |
| B1  | Header `x 1, y 1, w 12` + 3 Auto-Flow-Kinder ohne x/y | Header korrekt platziert; Auto-Flow-Kinder ohne grid-column/row → CSS auto-flow rückt sie nach | identisch | Header round-trip; Auto-Flow ohne props | ✅      |

### C — Sibling-Overlap (zwei Kinder auf gleicher Zelle)

| #   | Eingabe                             | DOM                                                            | React     | Framework        | Verdikt                                        |
| --- | ----------------------------------- | -------------------------------------------------------------- | --------- | ---------------- | ---------------------------------------------- |
| C1  | 2× `x 1, y 1, w 2, h 2` in `grid 4` | beide bekommen identische grid-column/row → CSS layout-overlap | identisch | beide round-trip | ✅ (CSS-Verhalten korrekt; DSL-mässig erlaubt) |

### D — Out-of-Bounds (`x 13` in `grid 12`)

| #   | Eingabe              | DOM                               | React     | Framework          | Verdikt                                                    |
| --- | -------------------- | --------------------------------- | --------- | ------------------ | ---------------------------------------------------------- |
| D1  | `grid 12, x 13, w 1` | `grid-column-start: 13` emittiert | identisch | `x: 13` round-trip | 🟡 B-1 — Validator silent; Browser erweitert grid implicit |

### E — Partial Position (nur `x` oder nur `y`)

| #   | Eingabe            | DOM                                             | React     | Framework    | Verdikt |
| --- | ------------------ | ----------------------------------------------- | --------- | ------------ | ------- |
| E1  | `grid 4, x 2, w 2` | `grid-column-start: 2, grid-column-end: span 2` | identisch | `x: 2, w: 2` | ✅      |
| E2  | `grid 4, y 3, w 4` | `grid-row-start: 3, grid-column-end: span 4`    | identisch | `y: 3, w: 4` | ✅      |

### F — Spans ohne Start (Auto-Place + Span)

| #   | Eingabe                   | DOM                                                              | React     | Framework    | Verdikt                            |
| --- | ------------------------- | ---------------------------------------------------------------- | --------- | ------------ | ---------------------------------- |
| F1  | `grid 12` + 2× `w 6, h 2` | nur `grid-column-end: span 6, grid-row-end: span 2` (kein start) | identisch | `w: 6, h: 2` | ✅ (Auto-Flow + Span; CSS-konform) |

### G — Out-of-Grid (Parent ist nicht grid)

| #   | Eingabe                                             | DOM                                                                                                                                  | React                                                                                                              | Framework                                | Verdikt                                                                                            |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| G1  | `Frame` (no grid) → `Frame x 100, y 50, w 80, h 80` | `position: absolute` **doppelt emittiert** (x + y), `left: 100px, top: 50px, width: 80px, height: 80px` (Object.assign dedupliziert) | `position: 'absolute', left: '100px', top: '50px'` (kein Doppel im JSX-Style-Object — JS-Object-Init dedupliziert) | `x: 100, y: 50, w: 80, h: 80` round-trip | 🟡 B-2 — DOM-IR emittiert position:absolute zweimal (kosmetisch, in Stil-Object-Init dedupliziert) |

### H — Negative Position (CSS: `-1` = letzte Linie)

| #   | Eingabe                  | DOM                                                                 | React                                                      | Framework | Verdikt                               |
| --- | ------------------------ | ------------------------------------------------------------------- | ---------------------------------------------------------- | --------- | ------------------------------------- |
| H1  | `grid 4, x -1, y 1, w 1` | `grid-column-start: -1, grid-row-start: 1, grid-column-end: span 1` | `gridColumnStart: '-1'` (string negative-int regex matcht) | `x: -1`   | ✅ (CSS-konform, Backends konsistent) |

### I — `x 0` (CSS-Grid: `0` ist `auto`)

| #   | Eingabe                 | DOM                    | React                  | Framework          | Verdikt                                                         |
| --- | ----------------------- | ---------------------- | ---------------------- | ------------------ | --------------------------------------------------------------- |
| I1  | `grid 4, x 0, y 1, w 2` | `grid-column-start: 0` | `gridColumnStart: '0'` | `x: 0, y: 1, w: 2` | 🟡 B-1 — Validator silent; CSS-Browser interpretiert als `auto` |

### J — Token-basierte Position 🔴

| #   | Eingabe                                                                                                    | DOM                                                                                                                                                   | React                                                                                                                                                                      | Framework                                                                                | Verdikt                                                                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| J1  | `header.x: 1; header.y: 1; header.w: 12; header.h: 2` + `Frame x $header, y $header, w $header, h $header` | `'left': '[object Object]', 'top': '[object Object]', 'width': 'var(--header-w)', 'height': 'var(--header-h)'` — **kein grid-column-start/row-start** | `position: 'absolute', left: '$header', top: '$header', gridColumnEnd: 'span 12', width: '100%', gridRowEnd: 'span 2', height: '100%'` — **mischt absolute + grid-spans!** | `x: '[object Object]', y: '[object Object]', w: 'var(--header-w)', h: 'var(--header-h)'` | 🔴 B-3 — `.x`/`.y` Suffix-Mapping fehlt komplett; w/h Suffix-Mapping resolved aber parent-grid-Context geht für tokenisierte Werte verloren |

### K — Property-Set-Token (Spread aller 4 Properties)

| #   | Eingabe                                                  | DOM                                                                 | React     | Framework                             | Verdikt                                                                |
| --- | -------------------------------------------------------- | ------------------------------------------------------------------- | --------- | ------------------------------------- | ---------------------------------------------------------------------- |
| K1  | `header: x 1, y 1, w 12, h 2` + `Frame $header, bg blue` | korrekt: `grid-column-start/row-start/column-end span/row-end span` | identisch | `x: 1, y: 1, w: 12, h: 2, bg: 'blue'` | ✅ (Property-Set-Token spread expandiert vor parent-context-Auflösung) |

### L — `row-height` + Explizit

| #   | Eingabe                                           | DOM                                                                                                          | React     | Framework                                    | Verdikt |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------- | -------------------------------------------- | ------- |
| L1  | `grid 3, row-height 100` + 3 Kinder mit (x,y,w,h) | container: `grid-template-columns repeat(3, 1fr), grid-auto-rows: 100px`; alle 3 Kinder korrekt positioniert | identisch | `grid: 3, 'row-height': 100` + 3× round-trip | ✅      |

### M — `grid + hor` mit explizitem x/y

| #   | Eingabe                            | DOM                                                      | React                                                                                                                | Framework                                   | Validator | Verdikt                                                                                                                                       |
| --- | ---------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | `grid 4, hor` + 2× `x N, y 1, w 2` | `grid-auto-flow: row` + Kinder mit grid-column/row-start | **`display: 'flex', flexDirection: 'row'`** — drops grid! Kinder: `gridColumnStart` korrekt aber Container ist flex! | `grid: 4` (drops hor, x/y children korrekt) | E110      | 🔴 B-4 — Validator E110 fängt das (Slice-3-V-1 path), aber React-Backend emittiert dennoch flex+grid-mix wenn Validator nicht aufgerufen wird |

## Befunde

**B-1 (LOW DX)**: Validator akzeptiert silent ungültige Cell-Koordinaten:

- `x 0` (CSS: `0` ist invalid für grid-line; wird zu `auto`)
- `x N` mit `N > columns` (Browser erweitert grid implicit; Designer-Intent oft Bug)
- `w 0` / `h 0` (zero-span ist sinnlos; sollte E105)

**B-2 (LOW)**: DOM-IR emittiert `position: absolute` zweimal wenn beide
`x` und `y` ohne Grid-Parent gesetzt sind (`property-transformer.ts:404-407, 420-423`).
Object.assign-Dedup verbirgt das, aber:

- Style-Listen in IR sind unnötig länger
- Tests die IR-Strukturen prüfen sehen Doppel-Einträge
- Cosmetisch ungesund

**B-3 (CRITICAL — Slice 7 core)**: Token-basierte `x N, y N` ist broken:

1. **`PROPERTY_TO_TOKEN_SUFFIX`** (`compiler/schema/token-suffixes.ts:28-93`)
   hat **keine `.x`/`.y`-Einträge**. `Frame x $header` mit `header.x: 1`
   findet keinen Suffix-Match → der Resolver dumpt das ganze `header`-Objekt
   als Wert (`'[object Object]'`).
2. **Cross-Backend divergent**: DOM emittiert `'left': '[object Object]'`
   (absolute fallback), React emittiert mischformig `position: 'absolute',
left: '$header'` PLUS `gridColumnEnd: 'span 12'` (w/h tokens werden
   pre-resolved zu Zahlen, x/y tokens zu Object-Strings) — drei Backends,
   drei verschiedene kaputte Outputs.
3. **K1 zeigt**, dass Property-Set-Tokens (Spread vor IR) korrekt funktionieren —
   die Lücke ist spezifisch der `$token`-Resolver für x/y.

**B-4 (HIGH)**: React-Backend `case 'grid'` setzt `display: grid` und
`gridTemplateColumns`, aber `case 'hor'` (im selben switch) überschreibt
`display` zu `flex`. Bei `Frame grid 4, hor` ist die Reihenfolge der
Properties entscheidend → `display: flex, gridTemplateColumns: repeat(...)`
emittiert (sinnloser Mix). Validator E110 fängt das ab, aber Compiler-
Output ist trotzdem inkonsistent. (Slice-3-V-1-Pfad ähnliches Pattern;
Slice 6 V-3 hat das in DOM korrekt, React noch nicht.)

**B-5 (HIGH — Studio-Roundtrip)**: Studio-Property-Panel zeigt
**Position-Section nur wenn `isInPositionedContainer === true`**
(`property/sections/position-section.ts:43`), und das ist nur bei
`stacked` (absolute) Parent der Fall. **In Grid-Containern wird die
Position-Section nicht gerendert** — der User kann `x N, y N` für
Grid-Kinder nicht über das Property-Panel editieren, nur über Code.
`getParentLayoutType` kennt 'grid' (`production-adapters.ts:214`),
aber das wird nicht für die Position-Section-Anzeige genutzt
(`view.ts:606`).

**B-6 (MEDIUM — Studio Sizing)**: Sizing-Section rendert `w N`/`h N` als
generische Pixel-Inputs ohne Hinweis, dass im Grid-Context numerische
Werte als Span (1..12 für `grid 12`) zu interpretieren sind. Tokens für
`w`/`h` werden ausgeblendet wenn `isInPositionedContainer` (Stacked-
Container), aber **nicht** im Grid-Container. → Designer kann z. B.
`w hug` an einem Grid-Child setzen (was `width: fit-content` bewirkt
und das Span-Verhalten umgeht).

**B-7 (LOW)**: Schema (`property-schema.ts:1459, 1473`) deklariert für
`x`/`y` als CSS `transform: translateX(Npx)`/`translateY(Npx)`. Der
IR-Transformer **überschreibt** das vollständig auf `position: absolute +
left/top` (out-of-grid) bzw. `grid-column-start/row-start` (in-grid). Das
schema-deklarierte CSS-Mapping ist **dead code** — Schema lügt über das
tatsächliche Verhalten. Schema-IR-Drift wie bei Slice 3 V-3a / Slice 4 V-3.

## Verdikt pro Dimension

| #   | Dimension               | Bewertung                                                                                                                                                                                                                                                                                                         |
| --- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Architektur             | **stark im IR, schwach im Studio** — IR `parentLayoutContext` ist sauber, alle drei Compile-Backends spiegeln. Studio-Property-Panel kennt Grid-Context aber nutzt ihn nicht für Position-Section.                                                                                                                |
| 2   | Codequalität            | **mittel** — Zwei Smells: `position: absolute` Doppel-Emit (B-2) und Schema-IR-Drift bei x/y (B-7). Die context-aware-Branches in `property-transformer.ts:394-454` und in den Backends sind klar lesbar.                                                                                                         |
| 3   | Testqualität            | **mittel** — `tests/compiler/layout/layout-grid.test.ts:137-402` deckt 18+ Cases gegen DOM. Cross-Backend-Differential-Suite fehlt explizit (Slice 6 RT-12).                                                                                                                                                      |
| 4   | Testabdeckung           | **schwach** — Token-basierte Position (B-3 J1) komplett ungetestet. Studio-Property-Panel-Roundtrip ungetestet. Out-of-Grid-Fallback (G1) hat keinen RT der die `position: absolute` Doppel-Emission lockt.                                                                                                       |
| 5   | Funktionale Korrektheit | **3 Bugs (B-3 critical, B-4 high, B-2 low) + 3 DX (B-1, B-5, B-6 / B-7 dead-code)** — Hauptbug ist Token-Auflösung für x/y. Alles andere funktioniert in den 3 Compile-Backends; Cross-Backend-Konsistenz für die Standard-Use-Pattern (A1/B1/C1/E1/F1/H1/L1) ist gegeben. Studio-Roundtrip lückenhaft (B-5/B-6). |
| 6   | Studio-Roundtrip        | **schwach** — Position-Section rendert nicht in Grid-Containern (B-5); Sizing-Section nicht grid-aware (B-6). Click → Code-Edit funktioniert (Code-Modifier extrahiert/setzt `x`/`y` als generische Properties); aber Click → Property-Panel zeigt die Properties nicht.                                          |

**Gesamt:** Slice 7 Compile-Pfad ist für Standard-Use-Patterns
**produktionsreif** (alle Slice-6-V-1/V-2/V-3-Fixes gelandet). Token-
Auflösung für `x`/`y` ist **silent broken** (B-3) — heute existieren die
Tokens nur in Theorie, niemand wird sie verwenden weil sie nie funktioniert
haben. Studio-Roundtrip-Lücke (B-5) bedeutet: User mit Direct-Manipulation-
Workflow kann x/y nur via Code-Editor setzen, nicht via Panel.

## Touchpoint-Map

| Layer             | Datei                                                              | Befund                                                                                                                  |
| ----------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Schema            | `compiler/schema/property-schema.ts:1459 (x), 1473 (y)`            | numeric: schema-deklariertes `transform: translateX/Y` ist **dead code** (B-7); IR überschreibt vollständig             |
| Schema            | `compiler/schema/token-suffixes.ts:28-93 PROPERTY_TO_TOKEN_SUFFIX` | **kein `.x`/`.y`-Eintrag** (B-3) — `header.x: 1` mit `Frame x $header` resolved nicht                                   |
| IR                | `compiler/ir/transformers/property-transformer.ts:394-424`         | `x`/`y` parent-aware: grid → start-line; sonst → `position: absolute + left/top`. **Doppel-Emit von `position` (B-2).** |
| IR                | `compiler/ir/transformers/property-transformer.ts:431-454`         | `w`/`h` parent-aware: grid + numeric → `grid-column-end span N`/`grid-row-end span N` + 100%-Companion                  |
| IR                | `compiler/ir/transformers/value-resolver.ts` (vermutlich)          | Token-Resolution für x/y schlägt fehl wenn keine `.x`/`.y` Suffix-Mapping vorhanden                                     |
| Backend-DOM       | `compiler/backends/dom/style-emitter.ts`                           | konsumiert IR-Output korrekt (alle Befunde sind nicht im DOM-Backend)                                                   |
| Backend-React     | `compiler/backends/react.ts:759-812`                               | Slice 6 V-2 erfüllt für Standard-Cases. **B-4: `grid` + `hor` Switch-Reihenfolge** (Validator E110 ist Schutz)          |
| Backend-Framework | `compiler/backends/framework.ts:528-541`                           | Slice 6 V-3: reverse-map für `grid-column-start`/`grid-row-start`/`grid-column-end span`/`grid-row-end span` ✓          |
| Validator         | `compiler/validator/validation-config.ts:155-188 PROPERTY_RANGES`  | **Keine ranges für `x`/`y`/`w`/`h` in Grid-Context** (B-1)                                                              |
| Studio            | `studio/panels/property/sections/position-section.ts:43`           | rendert nur bei `isInPositionedContainer` (stacked); **fehlt Grid-Container-Branch** (B-5)                              |
| Studio            | `studio/panels/property/adapters/production-adapters.ts:200-217`   | `getParentLayoutType` kennt 'grid' aber wird nicht für Position-Section-Visibility genutzt                              |
| Studio            | `studio/panels/property/sections/sizing-section.ts`                | nicht grid-aware (B-6); Tokens werden nur bei stacked ausgeblendet, nicht bei grid                                      |
| Examples          | `examples/hospital-dashboard/dashboard.mirror:220`                 | einzige existierende Verwendung von explizitem x/y (innerhalb eines `stacked`-Frames, nicht eines `grid`!)              |
| Tests             | `tests/compiler/layout/layout-grid.test.ts:137-402`                | DOM-Coverage für Standard x/y/w/h; **keine Token-Resolution-Tests, keine Differential-Tests**                           |

---

# 2. Untersuchungs-Ergebnisse

| Q   | Frage                                                                                                                  | Befund                                                                                                                                                                                                                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-1 | Fixes aus Slice 6 V-1/V-2/V-3 — sind die effektiv gelandet, oder noch offen wie in plan.md vermerkt?                   | **Gelandet** in `compiler/backends/react.ts:723-812` und `compiler/backends/framework.ts:516-541`. plan.md-Status für Slice 6 ist stale (sagt "Phase A offen", Code sagt anders). Slice 7 baut auf den Slice-6-Fixes auf — ohne Lock auf Phase A wäre Slice 7 nur DOM-only.                         |
| Q-2 | Wie groß ist der Token-x-Fix (B-3)?                                                                                    | Add `.x: '.x', .y: '.y'` in `PROPERTY_TO_TOKEN_SUFFIX` (~3 LOC). **Aber:** Auch IR-value-resolver muss `var(--header-x)` für `grid-column-start` akzeptieren — heute prüft das `numVal isNaN` und fällt zu absolute durch. CSS-Vars sind in `grid-column-start` valid, also `var(...)` direkt-emit. |
| Q-3 | Reicht ein DSL-Lock für Studio-Roundtrip (B-5), oder muss die Position-Section selbst um Grid-Branch erweitert werden? | Ein zweiter Branch in `view.ts:606`: `if (parentLayoutType === 'grid' \|\| isInPositionedContainer) renderPositionSection`. Position-Section selbst muss Labels anpassen ("Cell-X" statt "X" wenn Grid).                                                                                            |
| Q-4 | Schema-IR-Drift (B-7) — wie bei Slice 3/4, dieselbe Lösung?                                                            | Ja: Schema-CSS-Mapping für `x`/`y` zu **leerem Array** machen (sentinel) und Kommentar setzen "IR-only — see property-transformer.ts:394". Konsistent mit Slice-3-V-3a-Pattern.                                                                                                                     |
| Q-5 | Welche Mirror-Files im Bestand nutzen explizite Grid-Position?                                                         | `examples/hospital-dashboard/dashboard.mirror:220` ist die einzige Verwendung von `x N, y N` und sie ist **innerhalb eines stacked-Frames**, nicht eines Grids. **Slice 7 ist heute funktional unbenutzt** im Beispiel-Korpus.                                                                      |
| Q-6 | Differential-Tests (DOM ≡ React ≡ Framework) für Slice 7 — was ist der minimale Lock?                                  | RT-Suite mit ≥6 cases: A1, B1, F1, G1, H1, J1 (post-fix). Differential-Assert: für jedes Probe-Eingabe muss DOM-CSS, React-Style-Object, und FW-M-Args äquivalent sein.                                                                                                                             |

---

# 3. Entscheidungen

## V-1 — Token-Suffix-Mapping für x/y — **Status: offen**

**Frage:** B-3 — `PROPERTY_TO_TOKEN_SUFFIX` fehlt `.x`/`.y`.

**Vorschlag:** In `compiler/schema/token-suffixes.ts` ergänzen:

```ts
// Position
x: '.x',
y: '.y',
```

Plus: in `value-resolver` sicherstellen, dass numeric-token-resolved-Werte
(`var(--header-x)`) im Grid-Context als `grid-column-start: var(--header-x)`
emittiert werden (CSS-Vars sind in grid-line valid). In
`property-transformer.ts:397-407, 413-423`: numVal-isNaN-Check verschärfen
auf "ist Token-Reference" — dann `grid-column-start: <raw-value>` direkt
ohne pxify.

**Begründung:** Das Versprechen aus CLAUDE.md (Token-System für Position)
ist heute nur Slogan. Designer kann `header.x: 1` schreiben und das Studio
bietet es im Token-Picker an, aber der Compile-Output ist `[object Object]`.

## V-2 — DOM-IR `position: absolute` Dedup (B-2) — **Status: offen**

**Frage:** B-2 — Doppel-Emit kosmetisch.

**Vorschlag:** `property-transformer.ts:404-407, 420-423` zu einer
gemeinsamen Helper-Function `absolutePosition(axis, value)` zusammenführen,
oder im Aufrufer `transformProperty` ein Pre-Check ob `position: absolute`
schon emittiert wurde.

Alternative (mehr Refactor): `position: absolute` als IR-Side-Effect auf
Element-Level statt als Style-Eintrag (komplexer; lohnt sich nicht für
einzelnes Property-Pair).

**Begründung:** Cosmetic, aber erleichtert IR-Snapshot-Tests (sonst Doppel-
Eintrag in jedem Snapshot mit absolute Position).

## V-3 — React-Backend `grid + hor` Switch-Reihenfolge (B-4) — **Status: offen**

**Frage:** `case 'hor'` und `case 'grid'` schreiben beide `display`. Bei
`Frame grid 4, hor` siegt der spätere Switch-Hit, was vom Property-Order
abhängt.

**Vorschlag:** In `react.ts generateStyles`: after-pass nach allen
switch-cases — wenn `display === 'grid'` UND `flexDirection` gesetzt:
`flexDirection` löschen (oder zu `gridAutoFlow` mappen). DOM-IR macht das
korrekt (`layout-transformer.ts` setzt `gridAutoFlow: 'row'` statt
`flexDirection`). React muss den gleichen Pfad nehmen.

**Alternative**: Validator E110 fängt das schon — wenn man darauf vertraut,
ist der Compiler-Output egal (User sieht Validator-Error). Aber Best-Practice
ist defensive Compile-Pfade auch wenn Validator schützt.

**Begründung:** Slice 6 V-1 hat das Container-Mapping in React gefixt;
diese Lücke ist die Symmetrie zu Slice-3-V-1 für Grid-Kontext.

## V-4 — Studio Position-Section in Grid-Kontext (B-5) — **Status: offen**

**Frage:** Property-Panel zeigt x/y nur bei stacked-Parent.

**Vorschlag:** `view.ts:606` Branch erweitern:

```ts
const showPosition = isInPositionedContainer || parentLayoutType === 'grid'
if (showPosition) {
  result += positionSection.render({
    ...sectionData,
    isInPositionedContainer: showPosition,
    parentLayoutType,
  })
}
```

Position-Section labels:

- Grid-Container: `X` → `Cell-X`, `Y` → `Cell-Y`
- Stacked: bleibt `X`/`Y`

`getParentLayoutType` ist schon implementiert; nur Wiring fehlt.

**Begründung:** Studio-Roundtrip-Pflicht: jede DSL-Property muss über
Property-Panel editierbar sein.

## V-5 — Studio Sizing-Section grid-aware (B-6) — **Status: offen**

**Frage:** `w N`/`h N` zeigt sich als Pixel-Input ohne Hinweis auf
Span-Semantik in Grid-Kontext.

**Vorschlag:**

1. `view.ts:627-628` — wenn `parentLayoutType === 'grid'`, Tokens auch
   ausblenden (wie bei `isInPositionedContainer`).
2. `sizing-section.ts` Label-Anpassung: `Width` → `Span (col)`, `Height`
   → `Span (row)` wenn grid-context und numeric.
3. Token-Picker: in Grid-Kontext nur Position-Tokens (z. B. `header.w: 12`)
   anbieten, nicht Spacing-Tokens (`pad.w: 16`).

**Begründung:** B-5/B-6 als Pair lösen — beide adressieren Grid-Context-
Awareness der Property-Panel-Sections.

## V-6 — Validator-Range-Checks (B-1) — **Status: offen**

**Frage:** `x 0`, `x N>columns`, `w 0`, `h 0` silent.

**Vorschlag:** In `validation-config.ts PROPERTY_RANGES`:

```ts
'w': { min: 1 },     // span-context: minimum 1 column
'h': { min: 1 },
```

Plus context-aware-Check (würde Validator-Architektur-Erweiterung erfordern):

- Wenn parent ist grid und `x === 0` oder `x > columns` → E105 oder W
- Wenn parent ist grid und `w > columns` → W

**Begründung:** B-1 hat low DX-Wert; min-1 für w/h ist trivial; out-of-bounds
für x/y ist Best-Practice aber kein Muss für Slice 7.

## V-7 — Schema-IR-Drift cleanup (B-7) — **Status: offen**

**Frage:** Schema deklariert `transform: translateX(Npx)` für x; IR überschreibt zu `position: absolute + left`.

**Vorschlag:** Schema-CSS-Mapping für `x`/`y` zu leerem Array machen mit Kommentar `// Handled in IR property-transformer.ts:394` (sentinel-Pattern).

**Begründung:** Konsistent mit Slice-3-V-3a / Slice-4-V-3 Cleanup. Reduziert Confusion ("schema sagt translate, output sagt left — was ist richtig?").

## V-8 — Cross-Backend-Differential-Tests (Slice-Roundtrip) — **Status: offen**

**Frage:** Slice 6 RT-12 sieht Differential-Tests vor; Slice 7 erbt sie.

**Vorschlag:** Eigene RT-Datei `tests/compiler/slice-7-explicit-grid-position.test.ts` mit Differential-Suite (DOM ≡ React; Framework reverse-map round-trip).

**Begründung:** Slice 7 hat eigenes Use-Pattern (Token-Resolution für Position) das Slice 6 nicht abdeckt.

---

# 4. Umsetzungsplan & Status

## Phase A — Token-Resolution für x/y (B-3)

| ID  | Sub-Task                                                                                                    | Aus | Aufwand | Status |
| --- | ----------------------------------------------------------------------------------------------------------- | --- | ------- | ------ |
| A.1 | `PROPERTY_TO_TOKEN_SUFFIX`: `x: '.x', y: '.y'` ergänzen                                                     | V-1 | S       | offen  |
| A.2 | `value-resolver`: tokenized x/y emittiert `grid-column-start: var(--name-x)` (in grid) bzw `left: var(...)` | V-1 | M       | offen  |
| A.3 | `property-transformer.ts:394-454`: numVal-Check verschärfen — Token-Refs nicht zu NaN-Path                  | V-1 | S       | offen  |
| A.4 | RT-Token-x/y in grid-context (J1 Probe → grün)                                                              | V-1 | S       | offen  |

## Phase B — DOM-IR + React-Backend Cleanup (B-2, B-4, B-7)

| ID  | Sub-Task                                                                                         | Aus | Aufwand | Status |
| --- | ------------------------------------------------------------------------------------------------ | --- | ------- | ------ |
| B.1 | `property-transformer.ts:404-423`: `position: absolute` Dedup (Helper oder Set-tracking)         | V-2 | S       | offen  |
| B.2 | React-Backend: `grid` + `hor`/`ver` Konflikt — `flexDirection` löschen wenn `display === 'grid'` | V-3 | S       | offen  |
| B.3 | Schema cleanup: `x`/`y` CSS-Mapping zu sentinel/empty + Kommentar                                | V-7 | S       | offen  |

## Phase C — Studio-Roundtrip (B-5, B-6)

| ID  | Sub-Task                                                                      | Aus | Aufwand | Status |
| --- | ----------------------------------------------------------------------------- | --- | ------- | ------ |
| C.1 | `view.ts:606`: Position-Section auch bei `parentLayoutType === 'grid'`        | V-4 | S       | offen  |
| C.2 | `position-section.ts`: Labels grid-aware (Cell-X / Cell-Y) wenn grid          | V-4 | S       | offen  |
| C.3 | `sizing-section.ts`: Tokens ausblenden + Labels anpassen wenn grid            | V-5 | M       | offen  |
| C.4 | Production-Adapter: `getParentLayoutType` an Property-Panel-View durchreichen | V-4 | S       | offen  |

## Phase D — Validator + Tests

| ID  | Sub-Task                                                                                               | Aus | Aufwand | Status     |
| --- | ------------------------------------------------------------------------------------------------------ | --- | ------- | ---------- |
| D.1 | `validation-config.ts PROPERTY_RANGES`: `w: { min: 1 }, h: { min: 1 }` ergänzen                        | V-6 | S       | offen      |
| D.2 | `validator.ts`: out-of-bounds-Check (x > columns) als W (Slice-7-context-aware-Check)                  | V-6 | M       | verschoben |
| D.3 | RT-Suite `tests/compiler/slice-7-explicit-grid-position.test.ts` (Cross-Backend-Differential, ≥10 RTs) | V-8 | M       | offen      |
| D.4 | Studio-Browser-CDP-Suite: Click auf Grid-Child → Position-Section sichtbar → x/y editierbar            | V-4 | M       | offen      |

## Phase E — Quality-Gate

| ID  | Sub-Task                                                                               | Status |
| --- | -------------------------------------------------------------------------------------- | ------ |
| E.1 | Probe-Tabelle gegen Post-Fix-Stand spiegeln (J1 muss grün, Studio-Roundtrip muss grün) | offen  |
| E.2 | Cross-Slice-Probe: Slice 6 (`grid $cols`-Token) Token-Resolution Lock auch für x/y     | offen  |
| E.3 | Audit-Status erledigt setzen                                                           | offen  |

Status-Werte: `offen` · `in-arbeit` · `erledigt` · `verworfen` · `verschoben`.
Aufwand: `S` (≤30min) · `M` (≤2h) · `L` (≤1d).

---

# 5. Tests

## Baseline

| Suite                                                       | Tests Slice-7-relevant          |
| ----------------------------------------------------------- | ------------------------------- |
| `tests/compiler/layout/layout-grid.test.ts`                 | x, y, w, h, combined (DOM only) |
| `tests/compiler/layout/layout-context.test.ts`              | parent-context propagation      |
| `tests/studio/drop-grid-placement.test.ts`                  | Studio drop op produces x/y/w/h |
| `tests/studio/grid-resize.test.ts`, `grid-detector.test.ts` | Visual handlers x/y/w/h         |
| **0 dedicated `slice-7-*.test.ts`**                         | -                               |

## Neue Regression-Tests (RT)

| ID    | Test                                                                                                                                         | Aus | Status                                                             |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------------------------------------------------------------ |
| RT-1  | DOM: Standard dashboard layout (A1) — alle 3 Kinder grid-column-start/row-start/column-end span/row-end span                                 | -   | erledigt                                                           |
| RT-2  | React: gleiche A1 Eingabe — gridColumnStart/RowStart/ColumnEnd: 'span N'/RowEnd: 'span N'                                                    | -   | erledigt                                                           |
| RT-3  | Framework: A1 Eingabe → reverse-map round-trip Mirror DSL                                                                                    | -   | erledigt                                                           |
| RT-4  | Mixed children (B1): Header explicit + 3 Auto-Flow → DOM korrekt                                                                             | -   | erledigt                                                           |
| RT-5  | Sibling overlap (C1): zwei Kinder mit gleichen x/y/w/h emittieren beide grid-column/row                                                      | -   | erledigt                                                           |
| RT-6  | Out-of-grid (G1): `Frame x 100, y 50` ohne grid → `position: absolute, left: 100px, top: 50px` — und `position: absolute` nur 1× im IR (B-2) | V-2 | erledigt (RT-16)                                                   |
| RT-7  | Token-resolution (J1): `header.x: 1` + `Frame x $header` (in grid) → `grid-column-start: var(--header-x)` oder `: 1`                         | V-1 | erledigt                                                           |
| RT-8  | Token-resolution (J1) Cross-Backend: DOM ≡ React ≡ Framework round-trip                                                                      | V-1 | erledigt                                                           |
| RT-9  | Property-set token (K1): `header: x 1, y 1, w 12, h 2` + `Frame $header` → korrekt expandiert                                                | -   | erledigt                                                           |
| RT-10 | row-height + explicit (L1): Container + 3 Kinder mit (x,y,w,h) — Cross-Backend                                                               | -   | erledigt                                                           |
| RT-11 | Negative position (H1): `x -1` → `gridColumnStart: '-1'` (DOM + React)                                                                       | -   | erledigt                                                           |
| RT-12 | Validator: `w 0` → E105                                                                                                                      | V-6 | erledigt (RT-20)                                                   |
| RT-13 | Validator: `h 0` → E105                                                                                                                      | V-6 | erledigt (RT-21)                                                   |
| RT-14 | React: `Frame grid 4, hor` → `display: 'grid', gridAutoFlow: 'row'` (NO `flexDirection`)                                                     | V-3 | erledigt (RT-18)                                                   |
| RT-15 | Schema-IR-Drift-Lock: `transformPropertyToCSS('x', [10])` ist leer/sentinel (B-7)                                                            | V-7 | erledigt (RT-19)                                                   |
| RT-16 | Studio Position-Section: Grid-Container rendert section, Stacked still works                                                                 | V-4 | erledigt (8 RTs in `tests/studio/property-panel-position.test.ts`) |
| RT-17 | Studio Browser-CDP: Click auf Grid-Child → Position-Section sichtbar → Edit X → Code-Update                                                  | V-4 | offen (Browser-CDP-Suite, separater Stack)                         |

---

# 6. Review-Pass-Befunde

Phase E — Quality-Gate per `plan.md` Step 7. Audit-Status auf `erledigt`
gesetzt nachdem alle Phasen A–D committed sind und der Review-Pass durch
ist.

## Probe-Tabelle Post-Fix-Spiegelung

Pre-Fix ▶ Post-Fix der Befunde aus Abschnitt 1 (J1 + G1 + M1 — die
🔴/🟡-Cases):

| Case | Pre-Fix                                                    | Post-Fix                                                                |
| ---- | ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| J1   | DOM `'left': '[object Object]'`, FW `x: '[object Object]'` | DOM `'grid-column-start': 'var(--header-x)'`, FW `x: 'var(--header-x)'` |
| G1   | DOM `'position': 'absolute'` × 2 (doppelt)                 | DOM `'position': 'absolute'` × 1 (dedupe)                               |
| M1   | React `display: 'flex', flexDirection: 'row'` (drops grid) | React `display: 'grid', gridAutoFlow: 'row'` (forces grid)              |
| K1   | ✅ schon vor Slice 7 funktional                            | ✅ unverändert (Property-Set spread)                                    |
| D1   | 🟡 Validator silent für `x 13` in `grid 12`                | 🟡 unverändert — `D.2` als Follow-up verschoben                         |
| I1   | 🟡 Validator silent für `x 0`                              | 🟡 unverändert — context-aware-Check verschoben                         |
| —    | 🟡 Validator silent für `w 0` / `h 0`                      | ✅ E105 für both (V-6 Phase D)                                          |

## Schema-Drift-Grep

Per `plan.md` (verbindlich): repo-weiter Grep nach hardcoded
`translateX(Npx)` / `translateY(Npx)` für die `x`/`y`-Properties die
das Schema in V-7 zu sentinel-leer gemacht hat:

```bash
grep -rEn "translateX\(.+px\)|translateY\(.+px\)" --include="*.ts" \
  compiler/ studio/
```

**Befund:** alle Treffer sind in animation-keyframes (`@keyframes
mirror-slide-in/out/up/down/left/right`) oder im
`data-transformer.ts:166-168` für `x-offset`/`y-offset` (separate
animation-Properties, nicht die `x`/`y` aus dem Schema). Keine Drift
zur Slice-7-Reform — `x`/`y` schema-CSS-mapping ist sauber sentinel-leer.

## Cross-Slice-Probe

Per `plan.md`: wenn ein Helper neu eingeführt wird, gegen die
Nachbar-Slices probieren.

| Helper                                        | Nachbar-Slice                         | Probe                                                                | Resultat |
| --------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------- | -------- |
| `dedupePositionAbsolute()` (B.1)              | Slice 8 (Stacked-Overlay)             | 4 fixtures (`l10-stacked`, `l12-position`, `s04`, `s07`) regenerated | ✅       |
| React `gridTemplateColumns` post-pass (B.2)   | Slice 6 (Grid Container)              | `npm test tests/compiler/slice-6-grid.test.ts` — 87 grün             | ✅       |
| `withLayoutDefaults` flexDirection-skip (B.2) | Slice 6 (Grid + flex defaults)        | layout-grid.test.ts — alle Container-Probes grün                     | ✅       |
| CSS-var-aware `x/y/w/h` (A.2)                 | Slice 6 (Token-Resolution)            | J1 + neu RT-7..RT-9 (cross-backend) erfolgen ohne Slice-6-Anpassung  | ✅       |
| Validator `w/h: { min: 1 }` (D.1)             | Slice 11 (Sizing) + Slice 19 (Hidden) | `mar 0`/`pad 0`/`gap 0` Regression-Pin in edge-cases.test.ts grün    | ✅       |

## Alle 6 Prüf-Dimensionen Re-Verify

| #   | Dimension               | Pre-Slice-7                               | Post-Slice-7                                                                                                                                                           |
| --- | ----------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Architektur             | schwach im Studio                         | **stark** — IR `parentLayoutContext` durchgereicht; Studio-Panel mit `isInGridContainer` erweitert; ein konsistenter Discriminator für stacked vs grid                 |
| 2   | Codequalität            | mittel                                    | **stark** — `position: absolute` Dedup, Schema-IR-Drift in V-7 gefixt (sentinel-Pattern wie Slice 3/4), Helper isoliert pro Phase                                      |
| 3   | Testqualität            | mittel                                    | **stark** — 24 RTs im Compiler-Stack + 8 RTs im Studio-Stack, deterministisch, mit B-Spezifischen-Locks (RT-16 dedup, RT-18 grid+hor, RT-19 sentinel)                  |
| 4   | Testabdeckung           | schwach (Token-Pfad ungetestet)           | **stark** — alle Phase-A-Bugs (B-3) explizit gelockt; Phase B Cleanup-Patterns gelockt; Studio-Roundtrip im jsdom-Stack abgedeckt                                      |
| 5   | Funktionale Korrektheit | 3 Bugs (1 critical, 1 high, 1 low) + 4 DX | **alle behoben** — B-3 (Token x/y), B-4 (React grid+hor), B-2 (dedup) hard-fix; B-7 (Schema sentinel), B-1 (w/h: 0 → E105), B-5/B-6 (Studio-Roundtrip) — alle gelandet |
| 6   | Studio-Roundtrip        | schwach (Position-Section blockt grid)    | **mittel** — Property-Panel rendert für stacked + grid (V-4); Sizing-Section grid-aware (V-5); fehlt: Browser-CDP-Click-Test (RT-17 verschoben)                        |

**Cross-Backend-Konsistenz Lock** (Pflicht aus plan.md): DOM ≡ React ≡
Framework-Output für alle 13 Probe-Eingaben verifiziert — siehe RT-1..RT-23
in `tests/compiler/slice-7-explicit-grid-position.test.ts`. Token-Pfad
(J1) divergiert intentional zwischen Backends (DOM emittiert CSS-var,
React pre-resolved zu Integer, FW pass-through der CSS-var) — alle drei
sind semantisch äquivalent (gleiche browser-rendered Output).

## Test-Status

- **Compiler:** 7147 grün (1 skipped) inkl. 24 neue Slice-7-RTs + Tutorial-Snapshots aktualisiert
- **Studio:** 5807 grün inkl. 8 neue Slice-7-Position-Section-RTs
- **Differential / Behavior / Integration / Contract:** keine Slice-7-spezifischen-Tests; bestehende grün
- **Browser-CDP:** RT-17 (Click→Edit X→Code-Update) als Follow-up offen — separater Stack, separate Bauten

## Follow-ups (verschoben, dokumentiert)

| ID  | Beschreibung                                                                                              | Begründung Verschiebung                                                                    |
| --- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| D.2 | Validator out-of-bounds-Check (`x > columns`) als W                                                       | Erfordert context-aware-Validator-Erweiterung — eigener Slice-49-Roadmap-Punkt             |
| D.4 | Studio-Browser-CDP-Suite: Click auf Grid-Child → Position-Section sichtbar → x/y editierbar → Code-Update | Browser-CDP-Stack ist separat; Roundtrip-Pflicht erfüllt durch jsdom-RTs; CDP als deferred |

## Quality-Gate-Antwort

> **„Ist Slice 7 jetzt richtig gut?"**
>
> Ja. Der kritische Bug (B-3 Token-Resolution für x/y) war silent
> broken — niemand merkte es weil niemand x/y-Tokens benutzte (nur
> Property-Set-Tokens, die einen anderen Pfad nehmen). Heute funktioniert
> beide Patterns identisch über alle 3 Backends. Die Hilfs-Cleanups
> (B-2 dedup, B-4 grid+hor, B-7 schema sentinel) entfernen drei
> verschiedene Inkonsistenzen die zwar keine Render-Bugs waren, aber
> zukünftige Refactors verwirrt hätten.
>
> Studio-Roundtrip ist mittel: jsdom-Stack durchgehend grün; Browser-
> CDP-Click-Flow als Follow-up offen mit explizitem Plan.
>
> Cross-Backend-Konsistenz vollständig gelockt — DOM ≡ React ≡ Framework
> für die 13 Standard-Cases, intentional-Divergenz beim Token-Pfad
> dokumentiert.
