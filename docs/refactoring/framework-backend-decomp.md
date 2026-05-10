# Framework-Backend Decomposition — Lane Doc

**Status:** aktiv (Claude). Verlinkt aus `docs/findings.md`.

**Stand 2026-05-10:** Pattern aus React-Backend-Decomp ist erprobt
(8 Slices, react.ts 3273 → 343 LOC, 89 % Reduktion). Framework-
Backend trägt dieselbe Monolithik-Krankheit; gleicher Decomp-Ansatz
mit Anpassung auf die Class-basierte Struktur. Slices 1+2+3+4 abgehakt
— framework.ts: 1057 → 446 LOC (58 % Reduktion). Vier Module unter
`compiler/backends/framework/ops/` (helpers.ts 109,
css-to-mirror.ts 277, style-event.ts 234, props.ts 66).
Differential-Tests 384/384 grün, full vitest 15441/15441.

## Ausgangslage

`compiler/backends/framework.ts` ist 1057 LOC (Stand 2026-05-10).
DOM: 767 LOC + ops-Subdir. React: 343 LOC + 8 ops-Module
(`a9f52c64`–`ab8cb3fb`). Framework: 1057 LOC monolithisch.

Struktur ist anders als React:

- 2 freie Top-Level-Funktionen (`parseGridSpan`, `dataValueToJS`)
- 2 Top-Level-Konstanten (`ANIMATION_REVERSE`, `TAG_TO_TYPE`)
- 1 Class `FrameworkGenerator` mit 22 privaten Methoden (~1000 LOC)

Die Class kapselt drei mutables:

- `ir: IR` (read-only nach Konstruktor)
- `indent: number` (Indent-Level für emittiertes JS)
- `lines: string[]` (Output-Buffer)

Die meisten Methoden lesen nur `this.ir` oder sind reine
Transformationen (`cssPropToMirrorProp`, `parsePxValue`,
`escapeString`). Wenige Methoden mutieren `lines`/`indent`
(`emit`, `emitHeader`, `emitTokens`, …).

## Decomp-Strategie

**Anders als React:** Klasse bleibt, Methoden werden zu freien
Funktionen unter `compiler/backends/framework/ops/*.ts` extrahiert.
Die Klasse delegiert (`return cssPropToMirrorProp(prop, value)`
statt eigene Implementation). Der Side-Effect-Pfad
(`emit`/`emitHeader`/…) bleibt vorerst in der Klasse — Mutation
auf `this.lines` ist nicht trivial zu functional-stylen ohne
größeren Rewrite.

## Konkrete Cluster

### 1. Pure helpers (~150 LOC) → `framework/ops/helpers.ts`

- `parsePxValue` (1023-1040)
- `escapeString` (1042-1044)
- `parseGridSpan` (35-41) — heute frei, zieht nur um
- `ANIMATION_REVERSE` (25-27) — Const
- `TAG_TO_TYPE` (43-51) — Const
- `dataValueToJS` (81-99) — heute frei, zieht nur um

Slice 1 — kleinster, niedrigstes Coupling, kein Verhalten ändern.

### 2. CSS→Mirror reverse-mapper (~257 LOC) → `framework/ops/css-to-mirror.ts`

- `cssPropToMirrorProp` (679-935) — der größte Switch der Datei.

Slice 2 — nutzt nur `parsePxValue`. Pure.

### 3. Style/Event/Action emit (~280 LOC) → `framework/ops/style-event.ts`

- `stylesToProps` (496-678)
- `eventsToProps` (936-954)
- `actionToString` (955-964)

Slice 3 — nutzt `cssPropToMirrorProp` + `parseGridSpan`.

### 4. Props/States serialization (~110 LOC) → `framework/ops/props.ts`

- `propsToString` (965-1001)
- `statesToString` (1002-1022)

Slice 4 — pure record→string serializer.

### 5. Node-to-M emit (~190 LOC) → `framework/ops/node-emit.ts`

- `nodeToM` (228-283)
- `eachToM` (284-293)
- `conditionalToM` (294-306)
- `getNodeType` (307-320)
- `getContent` (321-332)
- `nodeToProps` (333-495)

Slice 5 — verwendet alle vorigen Cluster. Bringt die Klasse von
Class-mit-Logik zu Class-mit-Orchestrator.

## Verbleibend in `framework.ts` nach Decomp (~250 LOC)

- `generateFramework` (Entry-Function)
- `FrameworkGenerator` class — slim orchestrator mit
  `emit`/`emitHeader`/`emitTokens`/`emitCustomIcons`/
  `emitComponents`/`emitUI`/`emitMount`/`currentIndent`/
  `indentLines` (Side-Effect-Pfad).

## Risiken & Nebenwirkungen

1. **Class-Method → freie Funktion.** Jede extrahierte Methode
   muss ihre `this`-Dependencies (heute nur `parsePxValue` und
   `escapeString`) explizit als Parameter bekommen. Da diese
   beide auch raus wandern, läuft am Ende alles flach.
2. **Differential-Test-Pin.** Cross-Backend-Equivalenz
   (`tests/differential/`) prüft DOM ≡ React ≡ Framework. Jeder
   Slice läuft die Suite vor + nach.
3. **Round-Trip-Tests.** Framework hat zusätzlich `M.toMirror()`-
   Round-Trip-Pins in `tests/integration/`; Re-Run nach jedem
   Slice.

## Empfohlene Reihenfolge

1. **Slice 1 — Pure helpers** (Cluster 1). Trivial, kein Coupling.
2. **Slice 2 — CSS→Mirror** (Cluster 2). Pure, einzige Dep:
   `parsePxValue` (heute schon raus).
3. **Slice 3 — Style/Event** (Cluster 3). Dep: Slice 2.
4. **Slice 4 — Props/States** (Cluster 4). Pure serializer.
5. **Slice 5 — Node emit** (Cluster 5). Größter Slice, nutzt
   1+2+3+4.

Jede Slice ein Commit, alle Differential-Tests grün, kein Big-Bang.

## Was diese Lane NICHT ist

- Keine Verhaltens-Änderung. Decomp soll den emittierten
  M(...)-Code byte-identisch lassen.
- Kein Class→Funktional-Rewrite. Die Klasse bleibt als
  Orchestrator; nur die heavy logic wandert.
- Kein Test-Refactor. Existierende Differential- und Round-Trip-
  Pins reichen.
