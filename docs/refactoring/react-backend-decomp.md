# React-Backend Decomposition — Lane Doc

**Status:** aktiv. Verlinkt aus `docs/findings.md`.

**Stand 2026-05-10:** Lane abgeschlossen — alle 8 Slices done.
react.ts: 3273 → 343 LOC (89% Reduktion). Acht Module unter
`compiler/backends/react/ops/` (layout.ts 239, events.ts 149,
chart.ts 175, text.ts 490, icon.ts 251, attributes.ts 181,
style.ts 1064, jsx.ts 624). react.ts ist jetzt ein dünner
Orchestrator (Type-Definitionen, Token-Emit, Component-Map-Aufbau,
Pre-Scan-Flags für hasIcon/hasChart/hasAnimation, Root-Item-Loop).
Differential-Tests 384/384 grün, full vitest 15441/15441.

## Ausgangslage

`compiler/backends/react.ts` ist 3273 LOC (Stand 2026-05-10) — die größte
Datei in `compiler/`. Zum Vergleich:

| Backend                          |  LOC | Modularisiert?                              |
| -------------------------------- | ---: | ------------------------------------------- |
| `compiler/backends/dom.ts`       |  767 | ja, `compiler/backends/dom/ops/*.ts` Subdir |
| `compiler/backends/framework.ts` | 1057 | nein                                        |
| `compiler/backends/react.ts`     | 3273 | nein                                        |

DOM hat seine Ops in `compiler/backends/dom/ops/{emit-events,
emit-state,emit-loops,emit-static,emit-zag,resolve-templates,
resolve-utils}.ts` ausgelagert; ein Großteil der DOM-Komplexität
lebt in einem Subdir. React und Framework sind monolithisch.

62 Commits seit April auf `react.ts` (Hot-Path) — siehe Findings
„React + Framework + DOM Backend-Hunt (24-Slice-Run)" und folgend.
Jeder Slice hat in dieselbe große Datei reingeschnitten; das
ist kurzfristig okay, aber langfristig wird das File zu groß für
sinnvolle Code-Reviews und für eine fokussierte Test-Suite.

## Ziel

`compiler/backends/react.ts` auf einen schlanken Orchestrator (~300 LOC)
schrumpfen, Sub-Concerns in `compiler/backends/react/ops/*.ts`
auslagern. Analog zur DOM-Backend-Struktur, aber mit React-eigenen
Eigenheiten (JSX-String-Building statt CSS-Emit, `<style>`-Block-
Aggregation für State-Pseudoklassen, Inline-Style-Objekt-Format).

## Konkrete Cluster (Stand 2026-05-10)

49 Top-Level-Deklarationen lassen sich in 8 Cluster gruppieren:

### 1. Style-Emission (~830 LOC) → `react/ops/style.ts`

- `generateStyles` (3076 - 2245 = 831 LOC) — der größte Switch der Datei,
  mappt jeden Mirror-Property auf JSX-Inline-Style-Felder.
- `applyFlagProperty` — flag-form props (`italic`, `underline`, `truncate`, …).
- `formatStyleObject`, `formatStyleAsCSS` — Inline-Style-Object-Stringify.
- `collectStateGroups` — Sammelt Hover/Focus/Active-State-Blocks für
  den `<style>`-Block-Aggregator.

### 2. JSX-Generation (~470 LOC) → `react/ops/jsx.ts`

- `generateJSX` — top-level JSX-Builder.
- `generateEachJSX`, `generateConditionalJSX` — Control-Flow.
- `wrapWithVisibility` — `visible-when`-Wrapping.

### 3. Icon (~120 LOC) → `react/ops/icon.ts`

- `generateIconJSX`, `getIconName`, `formatIconPropValue`.
- Plus eingebettete Runtime-Strings:
  `MIRROR_ICON_COMPONENT`, `_MIRROR_LUCIDE_CDN`, `_MIRROR_FALLBACK_ICON`,
  `MirrorIcon`, helper-fns.

### 4. Chart (~100 LOC) → `react/ops/chart.ts`

- `generateChartJSX`.
- Eingebettete Runtime: `MIRROR_CHART_COMPONENT`, `MirrorChart`,
  `_mirrorLoadChartJs`, `_mirrorParseChartData`.

### 5. Text & Expression (~430 LOC) → `react/ops/text.ts`

- `getTextContent`, `renderTextSlot`.
- `expressionPartsToJS`, `interpolateStringForJSX`, `inlineMarkdownToJSX`.
- `rewriteIdentifiersToTokens`, `ternaryBranchToJS`.

### 6. Attributes (~280 LOC) → `react/ops/attributes.ts`

- `generateMirrorAttributes`, `generateHtmlAttributes`, `generateBindAttribute`.
- `dataAttributesToJSObject`.

### 7. Events (~80 LOC) → `react/ops/events.ts`

- `emitActionExpression`, `generateEventHandlers`.

### 8. Layout & Component (~150 LOC) → `react/ops/layout.ts`

- `detectLayoutContext`, `withLayoutDefaults`.
- `getHtmlTag`, `containsIconInstance`, `containsChartInstance`,
  `containsAnimUsage`, `collectNamedInstances`.

## Verbleibend in `react.ts` nach Decomp (~300 LOC)

- `generateReact` (Entry-Function, ~300 LOC).
- `ReactExportOptions`-Type.
- Imports und thin orchestration (calls into the ops modules).

## Risiken & Nebenwirkungen

1. **State-Block-Aggregation** — `<style>`-Block wird im Top-Level-
   Tree-Walk gesammelt (`ReactStateContext`-Akkumulator). Beim
   Decomp muss der Akkumulator als Parameter durch die Module
   gefädelt werden, ohne dass die public API von `generateReact`
   sich ändert.
2. **Runtime-String-Komponenten** (MirrorIcon, MirrorChart) sind
   Strings (kein TypeScript), werden als Top-of-File-Konstanten
   embedded. Beim Auslagern in `ops/icon.ts`/`ops/chart.ts` muss der
   Builder die Strings aus dem Module zurückholen — keine
   `import`-Beziehung von der Runtime-String-Seite.
3. **Cross-Cluster-Calls.** `generateStyles` ruft `applyFlagProperty`
   und `formatIconPropValue`. `generateJSX` ruft jede der anderen
   Ops. Eine Reihe der Helfer ist tightly coupled — das Modul-Layout
   braucht einen kontroller-Style Entry-Point pro Ops-File, der
   die Dependencies via Parameter oder Service-Object injectet.
4. **Differential-Test-Pin** vor jeder Slice. Der hauseigene
   `tests/differential/`-Stack pinnt Cross-Backend-Equivalenz und
   ist die wichtigste Sicherheitsleine. Jeder Decomp-Slice sollte
   die Suite vor + nach laufen lassen.

## Empfohlene Reihenfolge (klein zu groß)

1. **Slice 1 — Layout & Component** (Cluster 8, ~150 LOC).
   Niedriges Coupling, einfache Move-Operationen. Pre-Refactor-Pin
   in `tests/differential/properties.test.ts`.
2. **Slice 2 — Events** (Cluster 7, ~80 LOC). Kleines Modul,
   gut isoliert. Pin in `tests/differential/actions.test.ts`.
3. **Slice 3 — Attributes** (Cluster 6, ~280 LOC). Pin in
   `tests/differential/properties.test.ts`.
4. **Slice 4 — Icon** (Cluster 3, ~120 LOC). Inkl. Embedded-
   Runtime-Strings. Pin in `tests/differential/cleanup.test.ts`
   (Custom Icons block).
5. **Slice 5 — Chart** (Cluster 4, ~100 LOC). Pin in
   `tests/differential/tables-charts.test.ts`.
6. **Slice 6 — Text** (Cluster 5, ~430 LOC). Pin in
   `tests/differential/{variables,conditionals}.test.ts`.
7. **Slice 7 — JSX** (Cluster 2, ~470 LOC). Pin in
   `tests/differential/each.test.ts` + Component-Tests.
8. **Slice 8 — Style** (Cluster 1, ~830 LOC). Größter Brocken,
   höchstes Coupling. Pin in `tests/differential/properties.test.ts`
   - states + cleanup.

Jede Slice ein eigener Commit, alle Differential-Tests grün, kein
Big-Bang.

## Was diese Lane NICHT ist

- Keine Verhaltens-Änderung. Die Decomp soll den emittierten
  React-Code byte-identisch lassen.
- Kein Schema-Refactor. SCHEMA und Token-Suffixes bleiben unangetastet.
- Kein Differential-Pin-Erweiterung. Die existierenden Pins reichen
  für die Re-Validation; neue Pins wären ein eigenes Inkrement.

## Deferred: Framework-Backend-Decomp

`compiler/backends/framework.ts` (1057 LOC) hat dieselbe
Monolithik-Struktur. Pattern wäre identisch (`framework/ops/*.ts`),
aber der Hunt-Wert ist niedriger weil das File deutlich kleiner
ist. Empfehlung: erst React-Decomp validieren, dann Pattern auf
Framework anwenden — bei dem Punkt ist das Ergebnis ein
Copy-Paste-Refactor mit minimaler Risiko-Surface.
