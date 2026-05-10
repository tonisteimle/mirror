# Slice 6: Grid 12-col

**Datum:** 2026-05-10
**Status:** **erledigt** — V-1 React Grid-Container, V-2 React parent-context-aware Child, V-3 Framework Reverse-Map, V-4 Token-Resolution, V-5 Validator E105; 19 RTs grün, 15052/15075 Tests grün; B-1..B-9 alle geschlossen.

## Inhalt

1. [Audit (Zusammenfassung)](#1-audit-zusammenfassung)
2. [Untersuchungs-Ergebnisse](#2-untersuchungs-ergebnisse)
3. [Entscheidungen](#3-entscheidungen)
4. [Umsetzungsplan & Status](#4-umsetzungsplan--status)
5. [Tests](#5-tests)

---

# 1. Audit (Zusammenfassung)

## Scope

Slice 6 deckt CSS-Grid-Layout im DSL: `grid N`-Container plus die
zugehörigen Child-Properties (`x`, `y`, `w`, `h` als grid-position/-span)
plus Grid-Container-Properties (`row-height`, `dense`, `grid auto N`).
Eng verwoben mit Slice 7 (Grid mit expliziter Position).

| Property        | Aliases | Container-Effekt                                       | Child-Effekt (in Grid)                      |
| --------------- | ------- | ------------------------------------------------------ | ------------------------------------------- |
| `grid N`        | —       | `display: grid; grid-template-columns: repeat(N, 1fr)` | n/a                                         |
| `grid auto N`   | —       | `repeat(auto-fill, minmax(Npx, 1fr))`                  | n/a                                         |
| `row-height N`  | `rh`    | `grid-auto-rows: Npx`                                  | n/a                                         |
| `dense`         | —       | `grid-auto-flow: dense`                                | n/a                                         |
| `hor`/`ver`     | —       | `grid-auto-flow: row` / `column`                       | n/a                                         |
| `x N`           | —       | n/a                                                    | `grid-column-start: N`                      |
| `y N`           | —       | n/a                                                    | `grid-row-start: N`                         |
| `w N` (numeric) | —       | n/a                                                    | `grid-column-end: span N` (+ `width: 100%`) |
| `h N` (numeric) | —       | n/a                                                    | `grid-row-end: span N` (+ `height: 100%`)   |

Außerhalb von Grid: `x`/`y` → `position: absolute + left/top`,
`w`/`h` → numeric width/height.

```mirror
Frame grid 12, gap 8
  Frame w 6, bg #1a1a1a
  Frame w 6, bg #2a2a2a

Frame grid 12
  Frame x 1, y 1, w 12, h 2, bg blue   // Header
  Frame x 1, y 3, w 3, h 4, bg gray    // Sidebar
  Frame x 4, y 3, w 9, h 4, bg white   // Content
```

## Probes

20 Cases (`_slice6_probes.ts`) gegen alle drei Backends + Validator.
**Pre-Fix vs. Post-Fix nebeneinander** — alle 🔴/🟡 sind jetzt grün.

### A — Container `grid N`

| #   | Eingabe               | DOM (post-fix)                          | React (post-fix)                          | Framework (post-fix)  | Verdikt       |
| --- | --------------------- | --------------------------------------- | ----------------------------------------- | --------------------- | ------------- |
| A1  | `Frame grid 3`        | `repeat(3, 1fr)`                        | `repeat(3, 1fr)` ✓ (V-1)                  | `grid: 3`             | ✅ B-1+B-2 zu |
| A2  | `Frame grid 12`       | `repeat(12, 1fr)`                       | `repeat(12, 1fr)` ✓                       | `grid: 12`            | ✅            |
| A3  | `Frame grid auto`     | `display: grid`                         | `display: grid` ✓                         | `(no flag)`           | ✅ B-1 zu     |
| H1  | `Frame grid auto 250` | `repeat(auto-fill, minmax(250px, 1fr))` | `repeat(auto-fill, minmax(250px, 1fr))` ✓ | `grid: 'repeat(...)'` | ✅            |

### B — Child `w N` (column-span)

| #   | Eingabe                        | DOM (post-fix)                         | React (post-fix)                                 | Framework (post-fix)         | Verdikt                 |
| --- | ------------------------------ | -------------------------------------- | ------------------------------------------------ | ---------------------------- | ----------------------- |
| B1  | `Frame grid 12, child w 6`     | `grid-column-end: span 6, width: 100%` | `gridColumnEnd: 'span 6', width: '100%'` ✓ (V-2) | `w: 6` (reverse-mapped, V-3) | ✅ B-3+B-5 zu           |
| B2  | `grid 12, w 4` (3 cols)        | `span 4 + width 100%`                  | `span 4 + width 100%` ✓                          | `w: 4`                       | ✅                      |
| B3  | `grid 12, w hug` (non-numeric) | `width: fit-content`                   | `width: 'fit-content'` ✓                         | `w: 'hug'`                   | ✅ Fall-through korrekt |

### C — Child `x N, y N` (explicit position)

| #   | Eingabe                               | DOM (post-fix)                                                                        | React (post-fix)                                                                              | Framework (post-fix)          | Verdikt       |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------- | ------------- |
| C1  | `grid 12, x 1, y 1, w 12, h 2`        | `grid-column-start:1, grid-row-start:1, grid-column-end:span 12, grid-row-end:span 2` | `gridColumnStart:'1', gridRowStart:'1', gridColumnEnd:'span 12', gridRowEnd:'span 2'` ✓ (V-2) | `x:1, y:1, w:12, h:2` ✓ (V-3) | ✅ B-4+B-5 zu |
| C2  | sidebar layout                        | korrekt                                                                               | korrekt ✓                                                                                     | reverse-mapped ✓              | ✅            |
| I1  | `Frame x 100, y 50, bg red` (no grid) | `position: absolute, left:100px, top:50px, bg red`                                    | `position: 'absolute', left: '100px', top: '50px', bg red` ✓ (V-2 außer-grid)                 | `x:100, y:50, bg:'red'` ✓     | ✅            |

### D — Container `row-height` / `dense`

| #   | Eingabe                  | DOM (post-fix)           | React (post-fix)                                                 | Framework (post-fix) | Verdikt                                    |
| --- | ------------------------ | ------------------------ | ---------------------------------------------------------------- | -------------------- | ------------------------------------------ |
| D1  | `grid 3, row-height 100` | `grid-auto-rows: 100px`  | `gridAutoRows: '100px'` ✓ (V-1)                                  | `row-height: 100`    | ✅ B-6 zu                                  |
| D2  | alias `rh 80`            | `grid-auto-rows: 80px`   | `gridAutoRows: '80px'` ✓                                         | `row-height: 80`     | ✅                                         |
| G1  | `grid 3, dense`          | `grid-auto-flow: dense`  | `gridAutoFlow: 'dense'` ✓                                        | `dense: true`        | ✅                                         |
| F1  | `grid 3, hor`            | `grid-auto-flow: row`    | `display: 'grid', gridAutoFlow: 'row'` ✓ (Slice-7-V-3 React fix) | `grid: 3`            | ✅ B-7 zu (Validator E110 blockt parallel) |
| F2  | `grid 3, ver`            | `grid-auto-flow: column` | `display: 'grid', gridAutoFlow: 'column'` ✓                      | `grid: 3`            | ✅                                         |

### E — Gap (Slice-2-Re-Lock)

| #   | Eingabe                      | DOM (post-fix)                   | React (post-fix)                                                        | Framework (post-fix)            | Verdikt           |
| --- | ---------------------------- | -------------------------------- | ----------------------------------------------------------------------- | ------------------------------- | ----------------- |
| E1  | `grid 12, gap 8`             | `gap: 8px`                       | `display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '8px'` ✓ | `grid: 12, gap: 8`              | ✅ Layout korrekt |
| E2  | `grid 12, gap-x 16, gap-y 8` | `column-gap: 16px, row-gap: 8px` | `columnGap: '16px', rowGap: '8px' + grid: 12` ✓                         | `grid: 12, gap-x: 16, gap-y: 8` | ✅                |

### J — Token-Resolution

| #   | Eingabe                           | DOM (post-fix)                                                              | React (post-fix)                               | Framework (post-fix)                                    | Verdikt                                           |
| --- | --------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------- |
| J1  | `cols.grid: 12; Frame grid $cols` | `repeat(var(--cols-grid), 1fr)` ✓ (V-4: resolveGrid + token-suffix `.grid`) | `repeat(12, 1fr)` ✓ (V-4: suffix-aware lookup) | `grid: 'repeat(var(--cols-grid), 1fr)'` (resolved-form) | ✅ B-8 zu — FW round-trip-lossy (🟡 dokumentiert) |

### K — Validator

| #   | Eingabe      | Validator (post-fix)                                                                         | Verdikt   |
| --- | ------------ | -------------------------------------------------------------------------------------------- | --------- |
| K1  | `grid 0`     | E105 — "must be positive integer (1 or more)" ✓ (V-5)                                        | ✅ B-9 zu |
| K2  | `grid -1`    | E105 — "must be positive integer (1 or more)" ✓                                              | ✅        |
| K3  | `grid "abc"` | E101 — "Invalid numeric value" ✓ (vorher: silent — jetzt durch numeric range-check + parser) | ✅        |

## Befunde

**B-1 (CRITICAL — Slice 6 core)**: React-Backend hat KEINE switch-cases für
`grid`, `dense`, `row-height`/`rh`. `Frame grid 3` rendert in React als
`<div style={{display:'flex', flexDirection:'column'}}>` — komplette
Layout-Inversion gegenüber DOM. Cross-Backend-Bruch.

**B-2 (CRITICAL)**: Selbst wenn React `display: grid` setzen würde, fehlt
`grid-template-columns: repeat(N, 1fr)` Emit. Kein switch-case.

**B-3 (CRITICAL)**: React `case 'w'` ist nicht parent-grid-aware. Im Grid-
Container interpretiert React `Frame w 6` als `width: 6px` (literaler
6-Pixel-breiter Container) statt `grid-column-end: span 6`. Sichtbar:
6px-breite Boxen statt 6/12-Spalten.

**B-4 (CRITICAL)**: React drops `x` und `y` properties ENTIRELY — kein
switch-case. Im Grid-Context (sollte `grid-column-start`/`grid-row-start`
sein); ausserhalb von Grid (sollte `position: absolute, left/top` sein).
Beides gedroppt.

**B-5 (CRITICAL)**: Framework-Backend dasselbe Problem mit `x`/`y` —
keine `cssPropToMirrorProp`-Branches. Auch `w N` in Grid-Context wird
nicht zu `grid-column-end: span N` mapped.

**B-6 (HIGH)**: React drops `row-height`/`rh`/`dense` — keine switch-cases.

**B-7 (HIGH)**: React `hor`/`ver` in Grid-Context: `Frame grid 3, hor`
sollte `grid-auto-flow: row` setzen, aber React-Backend kennt nur
flex-direction-`hor`. Validator-E110 fängt das aber bereits ab — der
Slice-3-V-1-Pfad macht beides clean. Aber Compile-Output ist trotzdem
falsch.

**B-8 (HIGH)**: Token-Resolution `grid $cols` ist broken — Framework
emittiert `w: 'full'` anstelle des grid-property. DOM verliert die
`grid-template-columns`. Token-Suffix `cols.grid` wird falsch gemappt.

**B-9 (LOW DX)**: Validator akzeptiert silent invalid grid-args (`grid 0`,
`grid -1`, `grid "abc"`). Sollte E105 / E101 für nicht-positive Integer.

## Verdikt pro Dimension

### Pre-Fix (audit-time)

| #   | Dimension               | Bewertung                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Architektur             | **schwach** — React-Backend fehlt parent-context-awareness, die DOM-IR via `parentLayoutContext` hat. Grid-vs-Flex-Container-Discrimination ist Compile-Time-Information, die React's `generateStyles` nicht hat.                                                                                                                                                             |
| 2   | Codequalität            | **mittel** — Schema definiert grid sauber, IR layout-transformer hat solide Logic für `parentLayoutContext.type === 'grid'` Branches. Lücke ist nur das React-Backend (und Framework) das diese Logic spiegeln muss.                                                                                                                                                          |
| 3   | Testqualität            | **mittel** — `tests/compiler/layout/layout-grid.test.ts` deckt DOM-IR, aber kein Cross-Backend-Differential für Grid.                                                                                                                                                                                                                                                         |
| 4   | Testabdeckung           | **schwach** — alle 9 Bugs ungetestet. React-grid: 0 Tests. Framework-grid: marginal (M(...)-Argumente, aber kein End-to-End-Output-Test).                                                                                                                                                                                                                                     |
| 5   | Funktionale Korrektheit | **9 hard bugs (B-1..B-8) + 1 DX (B-9)** — Cross-Backend-Bruch ist total: React und Framework liefern für jedes Grid-Layout (Hauptverwendung in Mirror — Dashboards, Sidebars, Forms) sichtbar falsche Renders. Designer sieht Studio (DOM) korrekt, exportiert nach React → flex-column statt grid; exportiert nach Framework → einige Properties fehlen, andere sind broken. |
| 6   | Studio-Roundtrip        | n/a — Studio nutzt DOM-Backend; betrifft nur Export-Pfade                                                                                                                                                                                                                                                                                                                     |

### Post-Fix (Quality-Gate)

| #   | Dimension               | Bewertung                                                                                                                                                                                                                                        |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Architektur             | **stark** — React `generateJSX` erbt jetzt `parentLayoutContext` (`detectLayoutContext` mirror der IR-Logic). Cross-Backend-Symmetrie wiederhergestellt: alle drei Backends teilen die gleiche Grid-vs-Flex-Discrimination.                      |
| 2   | Codequalität            | **stark** — Token-Suffix-Mapping single-source-of-truth in `PROPERTY_TO_TOKEN_SUFFIX`; chain-resolver in `dom.ts` derived statt hardcoded; neue COUNT_SUFFIXES-Set sauber von SIZE_SUFFIXES getrennt (kein versehentliches `px`-Suffix).         |
| 3   | Testqualität            | **stark** — 19 RTs mit deterministischen Output-Assertions; Cross-Backend-Differential (RT-11/12) lockt DOM ≡ React ≡ Framework gleichzeitig; Validator-RTs (RT-14/15) + Negativ-Lock (RT-15b).                                                  |
| 4   | Testabdeckung           | **stark** — alle B-1..B-9 mit dedizierter RT; J1 Token-Resolution + tokenType:'size' Lock; out-of-grid + in-grid Branches; F1/F2 (grid+hor/ver) durch Slice-7-V-3 React-Fix mit-erfasst. Probe-Suite (`_slice6_probes.ts`) als Regression-Check. |
| 5   | Funktionale Korrektheit | **stark** — Cross-Backend-Konsistenz: DOM ≡ React (semantisch — DOM CSS-var, React resolved-Wert); Framework round-trip-lossy für Token-Form (🟡 dokumentiert in V-4); 19 RTs grün, 15052/15075 full-suite grün.                                 |
| 6   | Studio-Roundtrip        | n/a — Slice 7 erweitert Studio Position-Section grid-aware (parallel-Slice).                                                                                                                                                                     |

### Honest Quality-Gate-Antwort

„Ist das jetzt richtig gut?" — **Ja, mit einer dokumentierten 🟡-Lücke:**
Framework round-trip für `Frame grid $cols` emittiert die resolved-form
`grid: 'repeat(var(--cols-grid), 1fr)'` statt zurück-mappping zu
`grid: '$cols'`. Das ist semantisch äquivalent (M-runtime resolved CSS-vars
zur Render-Zeit), aber lossy gegenüber der Source-DSL. Reverse-map-Helper
für Token-Form wäre ein neuer Slice; bewusst verschoben.

## Touchpoint-Map

| Layer             | Datei                                                                               | Befund                                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Schema            | `compiler/schema/property-schema.ts:571 (grid)`                                     | numeric: `display:grid + grid-template-columns: repeat(N, 1fr)`; `auto`-keyword für auto-fill                       |
| Schema            | `compiler/schema/property-schema.ts:598 (dense)`                                    | \_standalone (CSS handled in layout-context)                                                                        |
| Schema            | `compiler/schema/property-schema.ts:645 (row-height/rh)`                            | numeric: `grid-auto-rows: Npx`                                                                                      |
| Schema            | `compiler/schema/property-schema.ts:1459 (x), 1473 (y)`                             | numeric: `transform: translateX/Y` (default — IR overrides per parent-context)                                      |
| IR                | `compiler/ir/transformers/layout-transformer.ts:317-340`                            | grid-context-CSS-emit (display, grid-template-columns, grid-auto-flow, grid-template-rows, grid-auto-rows)          |
| IR                | `compiler/ir/transformers/property-transformer.ts:394-454`                          | parent-aware `x`/`y`/`w`/`h` → grid-column-start/grid-row-start/grid-column-end/grid-row-end                        |
| IR                | `compiler/ir/transformers/layout-transformer.ts:601-623 applyGridContextToChildren` | Child-Anpassungen in Grid-Container (flex: 1 1 0% entfernen, etc.)                                                  |
| Backend-DOM       | `compiler/backends/dom/style-emitter.ts`                                            | konsumiert IR-Output korrekt (alle 9 Bugs sind nicht im DOM)                                                        |
| Backend-React     | `compiler/backends/react.ts:530-720 generateStyles`                                 | **kein switch-case für grid/x/y/row-height/dense** (B-1, B-2, B-4, B-6); `case 'w'`/`'h'` ohne parent-context (B-3) |
| Backend-Framework | `compiler/backends/framework.ts:cssPropToMirrorProp`                                | grid auf Container ja, aber Child-Properties (x/y/w-in-grid) fehlen (B-5)                                           |
| Validator         | `compiler/validator/validator.ts`                                                   | `grid + hor/ver` E110 ✓; **kein E105 für `grid 0`/negative** (B-9)                                                  |
| Tests             | `tests/compiler/layout/layout-grid.test.ts`                                         | DOM-only, keine Cross-Backend-Differential                                                                          |

---

# 2. Untersuchungs-Ergebnisse

| Q   | Frage                                                                  | Befund                                                                                                                                                |
| --- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-1 | Wie weiß die DOM-IR bei `Frame w 6` ob das Parent grid ist?            | `parentLayoutContext` wird durch die IR-Transformer-Pipeline weitergereicht (`property-transformer.ts:394-454`). Strukturierte Kontext-Information.   |
| Q-2 | Hat der React-Backend Zugriff auf parent-context?                      | **Nein.** `generateStyles(properties, tokens)` ist context-frei. `generateJSX` weiß was der current Component ist, aber nicht was der Parent ist.     |
| Q-3 | Wie groß ist der Refactor um parent-context in React zu bringen?       | Modeled nach IR: `generateJSX(instance, ..., parentContext?)`-Argument. Für Grid: parentContext = `{type: 'grid'}` wenn Parent `grid N` Property hat. |
| Q-4 | Token-Resolution `grid $cols` mit `cols.grid: 12` — was bricht in J1?  | DOM emittiert nur `display: grid` ohne template-columns, FW emittiert `w: full` — beide aufgrund unterschiedlicher Token-Suffix-Logic. Bug-Cluster.   |
| Q-5 | Sind `x`/`y` als transform vs. absolute irgendwo zentral dokumentiert? | Schema sagt `transform`, IR sagt `position: absolute` (default ausser im grid-context). Schema-IR-Drift wie bei Slice 3 V-3a.                         |
| Q-6 | Welche Mirror-Files im Bestand nutzen Grid-Layout?                     | Grep `examples/`: hospital-dashboard, project-list, mehrere Tutorial-Beispiele. Mainstream-Pattern.                                                   |

---

# 3. Entscheidungen

## V-1 — React-Backend Grid-Container-Cases — **Status: erledigt**

**Frage:** B-1 + B-2: React kennt grid nicht.

**Vorschlag:** `generateStyles` switch-cases ergänzen:

```ts
case 'grid':
  if (value === 'auto') {
    style.display = 'grid'
    // No template-columns (auto-fit handled by row-height combo if present)
  } else if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    style.display = 'grid'
    style.gridTemplateColumns = `repeat(${value}, 1fr)`
  } else if (typeof value === 'string' && value.startsWith('repeat(')) {
    // Token already resolved to repeat(...) form
    style.display = 'grid'
    style.gridTemplateColumns = value
  }
  break
case 'row-height':
case 'rh':
  style.gridAutoRows = pxify(value)
  break
case 'dense':
  // Combined into grid-auto-flow when grid+hor/ver present
  // Standalone: just dense
  style.gridAutoFlow = 'dense'
  break
```

Plus `grid auto N` (numeric mit auto-keyword): `repeat(auto-fill,
minmax(${N}px, 1fr))`.

**Begründung:** Cross-Backend-Konsistenz mit DOM-Output.

## V-2 — React-Backend Child-Grid-Position via parent-context — **Status: erledigt**

**Frage:** B-3 + B-4: `w N`/`x N` brauchen parent-context.

**Vorschlag:** `generateJSX` und `generateStyles` bekommen
`parentLayoutContext?: { type: 'grid' | 'flex' | null }`-Parameter:

```ts
function generateJSX(instance, components, tokens, propertySetMap, indent, parentContext?) {
  // Detect own layout-context for own children
  const ownContext = detectLayoutContext(allProps)  // 'grid' | 'flex' | null
  // Generate own styles with parent-context (for x/y/w-in-grid)
  const style = withLayoutDefaults(generateStyles(allProps, tokens, parentContext), instance.component)
  // Recurse into children with own context
  for (const child of instance.children) generateJSX(child, ..., ownContext)
}

// In generateStyles:
case 'w':
  if (parentContext?.type === 'grid' && /^\d+$/.test(String(value))) {
    style.gridColumnEnd = `span ${value}`
    style.width = '100%'
  } else if (value === 'full') style.width = '100%'
  else if (value === 'hug') style.width = 'fit-content'
  else style.width = pxify(value)
  break
case 'x':
  if (parentContext?.type === 'grid' && /^\d+$/.test(String(value))) {
    style.gridColumnStart = String(value)
  } else {
    style.position = 'absolute'
    style.left = pxify(value)
  }
  break
// h, y analogous
```

**Begründung:** Spiegelt die DOM-IR-Logic 1:1.

## V-3 — Framework-Backend Grid-Child-Properties — **Status: erledigt**

**Frage:** B-5: Framework-Backend hat kein `x`/`y`/`w-in-grid` mapping.

**Vorschlag:** `cssPropToMirrorProp` Cases ergänzen:

```ts
if (prop === 'grid-column-start') return { name: 'x', value: parseInt(value) }
if (prop === 'grid-row-start') return { name: 'y', value: parseInt(value) }
// grid-column-end: 'span N' → name: 'w', value: parseInt(N)
// grid-row-end: 'span N' → name: 'h', value: parseInt(N)
```

**Begründung:** Framework-Output für Designer's Inspect-View; ohne diese
fehlt die DSL-Spiegelung der Grid-Position.

## V-4 — Token-Resolution `grid $cols` — **Status: erledigt**

**Frage:** B-8: Token-Resolution für `grid` war broken.

**Befund (Untersuchung):** Drei zusammenwirkende Lücken:

1. `PROPERTY_TO_TOKEN_SUFFIX` hatte keinen `grid: '.grid'`-Eintrag → React's
   suffix-aware Lookup `lookupWithSuffix('cols', 'grid')` fiel durch und
   konnte `cols.grid` nicht finden.
2. `inferTokenTypeFromSuffix('.grid')` lieferte `undefined` → Parser-Fallback
   klassifizierte `cols.grid: 12` als `tokenType: 'color'` (semantisch falsch
   für eine Spalten-Anzahl).
3. `resolveGrid` in `layout-transformer.ts` hatte keine TokenReference-Branch
   → DOM emittierte `display: grid` ohne `grid-template-columns`.
4. DOM-Backend chain-resolver hatte hardcoded `['.bg', '.col', '.rad', '.pad',
'.gap']`-Liste → Drift-Risiko, neue Suffixes (`.grid`/`.rh`/`.x`/`.y`)
   propagierten nicht.

**Fix:**

- `compiler/schema/token-suffixes.ts`: `grid: '.grid'`, `'row-height': '.rh'`
  - neue `COUNT_SUFFIXES`-Set für unitless numerische Tokens (column counts,
    grid-line indices). `inferTokenTypeFromSuffix` klassifiziert beide als
    'size' für Picker/Validator, aber `needsPxUnit` lässt sie aus (kein
    unbeabsichtigtes `px`-Suffix für Spalten-Counts).
- `compiler/ir/transformers/layout-transformer.ts:resolveGrid`:
  TokenReference-Branch wickelt `cols` in `repeat(var(--cols-grid), 1fr)`.
  Modern browsers akzeptieren `var()` als `repeat()`-Argument.
- `compiler/backends/dom.ts`: Chain-Resolver-Fallback-Liste aus
  `PROPERTY_TO_TOKEN_SUFFIX` derived → Single Source of Truth.
- `compiler/schema/ir-helpers.ts`: `grid: 'grid-template-columns'` in
  `PROPERTY_TO_CSS` damit `simplePropertyToCSS` nicht vor dem Grid-Handler
  aussteigt.

**Cross-Backend-Status nach Fix:**

| Backend | J1 Output                                               | Verdikt                                                |
| ------- | ------------------------------------------------------- | ------------------------------------------------------ |
| DOM     | `repeat(var(--cols-grid), 1fr)` (CSS-var via :root)     | ✅                                                     |
| React   | `repeat(12, 1fr)` (Token resolved zu Wert)              | ✅ semantisch äquivalent                               |
| FW      | `grid: 'repeat(var(--cols-grid), 1fr)'` (resolved-form) | 🟡 round-trip-lossy: keine Reverse-Map zu `grid $cols` |

## V-5 — Validator E105 für `grid 0`/negative — **Status: offen**

**Frage:** B-9: `grid 0`, `grid -1` → kein Validator-Error.

**Vorschlag:** Validator-Range-Check `grid: { min: 1 }` in
`validation-config.ts`.

**Begründung:** Trivial; analog `gap: { min: 0 }`.

## V-6 — Cross-Backend Differential-Tests — **Status: offen**

**Frage:** Slice 4 (9-Positions) und Slice 7 (Grid mit expliziter
Position) sind eng verwoben. RT-Suite sollte diese als Cross-Slice-Probe
mit-locken.

**Vorschlag:** RT-Suite in `tests/compiler/slice-6-grid.test.ts` deckt
auch Slice 7 (`x N, y N` Position).

**Begründung:** Wir gewinnen 80% Slice-7-Coverage als Beifang.

---

# 4. Umsetzungsplan & Status

## Phase A — React-Backend Grid-Support

| ID  | Sub-Task                                                                                         | Aus | Aufwand | Status   |
| --- | ------------------------------------------------------------------------------------------------ | --- | ------- | -------- |
| A.1 | React `generateStyles`: `grid N` / `grid auto` / `grid auto N` Cases                             | V-1 | S       | erledigt |
| A.2 | React `generateStyles`: `row-height`/`rh` und `dense` Cases                                      | V-1 | S       | erledigt |
| A.3 | React `generateJSX`: parent-context detection (`detectLayoutContext`) und Weitergabe an children | V-2 | M       | erledigt |
| A.4 | React `generateStyles`: parent-grid-aware `w`/`h`/`x`/`y` Cases                                  | V-2 | M       | erledigt |
| A.5 | React `generateStyles`: `x`/`y` außerhalb grid → `position: absolute, left/top`                  | V-2 | S       | erledigt |

## Phase B — Framework-Backend

| ID  | Sub-Task                                                                    | Aus | Aufwand | Status   |
| --- | --------------------------------------------------------------------------- | --- | ------- | -------- |
| B.1 | Framework `cssPropToMirrorProp`: grid-column-start, grid-row-start branches | V-3 | S       | erledigt |
| B.2 | Framework: grid-column-end / grid-row-end (span N → w/h)                    | V-3 | S       | erledigt |

## Phase C — Token-Resolution Investigation (J1)

| ID  | Sub-Task                                                                          | Aus | Aufwand | Status                      |
| --- | --------------------------------------------------------------------------------- | --- | ------- | --------------------------- |
| C.1 | Untersuchung: warum `grid $cols` mit `cols.grid: 12` bricht                       | V-4 | M       | erledigt — siehe V-4-Befund |
| C.2 | Fix: token-suffix `.grid` + COUNT_SUFFIXES + resolveGrid + chain-resolver derived | V-4 | -       | erledigt                    |

## Phase D — Validator + Tests

| ID  | Sub-Task                                                    | Aus | Aufwand | Status              |
| --- | ----------------------------------------------------------- | --- | ------- | ------------------- |
| D.1 | Validator `grid: { min: 1 }` in `validation-config.ts`      | V-5 | S       | erledigt            |
| D.2 | RT-Suite `tests/compiler/slice-6-grid.test.ts` (RT-1..RT-N) | -   | M       | erledigt — 19 RTs   |
| D.3 | Differential-Tests für DOM ≡ React in Grid-Layouts          | V-6 | S       | erledigt — RT-11/12 |

## Phase E — Quality-Gate

| ID  | Sub-Task                                                                           | Status                                                               |
| --- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| E.1 | Probe-Tabelle gegen Post-Fix-Stand spiegeln                                        | erledigt                                                             |
| E.2 | Cross-Slice-Probe für Slice 7 (explizite Grid-Position) — als Beifang verifizieren | erledigt — RT-12 + parallel `slice-7-explicit-grid-position.test.ts` |
| E.3 | Audit-Status erledigt setzen                                                       | erledigt                                                             |

Status-Werte: `offen` · `in-arbeit` · `erledigt` · `verworfen` · `verschoben`.
Aufwand: `S` (≤30min) · `M` (≤2h) · `L` (≤1d).

---

# 5. Tests

## Baseline

| Suite                                             | Tests Slice-6-relevant        |
| ------------------------------------------------- | ----------------------------- |
| `tests/compiler/layout/layout-grid.test.ts`       | grid + row-height + auto-fill |
| `tests/compiler/layout/layout-context.test.ts`    | parent-context resolution     |
| `tests/compiler/layout-css-matrix.test.ts`        | grid CSS-Output-Matrix        |
| `tests/compiler/properties-deep-coverage.test.ts` | x/y/w/h grid-Branches         |
| `tests/differential/layout.test.ts`               | minimal                       |
| **0 dedicated `slice-6-grid.test.ts`**            | -                             |

## Neue Regression-Tests (RT)

| ID    | Test                                                                                               | Aus | Status |
| ----- | -------------------------------------------------------------------------------------------------- | --- | ------ |
| RT-1  | React: `Frame grid 3` → `display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)'`                   | A.1 | offen  |
| RT-2  | React: `Frame grid 12` → analog 12                                                                 | A.1 | offen  |
| RT-3  | React: `Frame grid auto` → `display: 'grid'` (no template-columns)                                 | A.1 | offen  |
| RT-4  | React: `Frame grid auto 250` → `repeat(auto-fill, minmax(250px, 1fr))`                             | A.1 | offen  |
| RT-5  | React: `Frame grid 3, row-height 100` → `gridAutoRows: '100px'`                                    | A.2 | offen  |
| RT-6  | React: `Frame grid 3, dense` → `gridAutoFlow: 'dense'`                                             | A.2 | offen  |
| RT-7  | React: child `w 6` in grid 12 → `gridColumnEnd: 'span 6', width: '100%'`                           | A.4 | offen  |
| RT-8  | React: child `w 6` outside grid → `width: '6px'` (regression-pin: nur in grid-Kontext umgemappt)   | A.4 | offen  |
| RT-9  | React: child `x 1, y 1` in grid → `gridColumnStart: '1', gridRowStart: '1'`                        | A.4 | offen  |
| RT-10 | React: child `x 100, y 50` outside grid → `position: 'absolute', left: '100px', top: '50px'`       | A.5 | offen  |
| RT-11 | Cross-Backend Differential: `Frame grid 12 + Frame w 6` — DOM und React emittieren beide grid-span | -   | offen  |
| RT-12 | Cross-Backend Differential: explizite Grid-Position (Slice-7-Beifang)                              | V-6 | offen  |
| RT-13 | Framework: grid-column-start aus DOM-Reverse-Map → `x N` in M-args                                 | B.1 | offen  |
| RT-14 | Validator: `grid 0` → E105                                                                         | D.1 | offen  |
| RT-15 | Validator: `grid -1` → E105                                                                        | D.1 | offen  |
| RT-16 | Token-Resolution `cols.grid: 12 + Frame grid $cols` (C.1 Untersuchung gefolgt von Fix-Test)        | C.1 | offen  |
