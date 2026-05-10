# Slice 3: Horizontal Stack (`hor`, `wrap`, `spread`)

**Datum:** 2026-05-10
**Status (Iter-1):** Audit erledigt · Phase A: V-1 React-Defaults erledigt, V-2/V-3a deferred (Sektion 6) · Phase B Quality-Gate-Pass erledigt — 31 RTs grün, 14905/14928 Vitest grün
**Status (Iter-2, 2026-05-10, Dev 1):** V-2 Re-Open-Adresse präzisiert (Slice 21 Phase B/C oder dedizierter Parser-Audit-Slice) · V-3a Drift-Stand bestätigt (real+intentional, Schema-IR-Sync via Slice-5-Cluster Sweep Dev 2) · Probe-Skript Iter-2 committet · Studio-Roundtrip Lower-Bar explizit

## Inhalt

1. [Audit (Zusammenfassung)](#1-audit-zusammenfassung)
2. [Untersuchungs-Ergebnisse](#2-untersuchungs-ergebnisse)
3. [Entscheidungen](#3-entscheidungen)
4. [Umsetzungsplan & Status](#4-umsetzungsplan--status)
5. [Tests](#5-tests)

---

# 1. Audit (Zusammenfassung)

## Scope

Slice 3 deckt das horizontale Layout-Primitive `hor` (Alias für
`flex-direction: row`) plus seine direkten Geschwister `wrap` und `spread`,
und die Default-Verhalten der Layout-Defaults für `Frame hor`. Drei
DSL-Schlüsselwörter:

| Keyword  | Aliases      | CSS-Effekt                                                        |
| -------- | ------------ | ----------------------------------------------------------------- |
| `hor`    | `horizontal` | `display: flex; flex-direction: row`                              |
| `wrap`   | —            | `flex-wrap: wrap`                                                 |
| `spread` | —            | `justify-content: space-between` (mit implicitem `display: flex`) |

Plus die DSL-Default-Verhalten:

- Frame ohne explicit `hor`/`ver` → `flex-direction: column` (Slice 1)
- Frame als Container → `align-self: stretch` + `align-items: flex-start`
- `ver` ist Default (kein Emit nötig in Framework)

```mirror
Frame hor, gap 12
  Text "A"
  Text "B"

Frame hor, wrap, gap-x 16, gap-y 8
  Frame w 100
  Frame w 100
  Frame w 100

Frame hor, spread, ver-center
  Text "left"
  Text "right"
```

**DSL-Versprechen** (`compiler/schema/property-schema.ts:258,277,330,512`):

- `hor` und `ver` sind Flag-Keywords (kein Wert nimmt)
- `wrap` und `spread` ebenso
- Cross-Backend-Konsistenz (DOM ≡ React ≡ Framework)
- Frame als Container hat einen wohldefinierten Default-Look

## Probes

20 Cases (`_slice3_probes.ts`) plus 5 Validator-Cases (`_slice3_validator.ts`).
Vollständige Outputs: siehe Sektion 5.

### A — Basic-Keywords + Kombinationen

| #   | Eingabe                        | DOM                                                | React                                                | Framework                       | Verdikt                               |
| --- | ------------------------------ | -------------------------------------------------- | ---------------------------------------------------- | ------------------------------- | ------------------------------------- |
| A1  | `Frame hor`                    | `flex, row, stretch, flex-start`                   | `flex, row` (kein stretch, kein items)               | `hor: true`                     | 🔴 B-1 React drops Container-Defaults |
| A2  | `Frame ver` (default)          | `flex, column, stretch, flex-start`                | `flex, column` (kein stretch/items)                  | `(no flag-emit)`                | 🔴 B-1                                |
| A3  | `Frame horizontal` (long form) | wie A1                                             | wie A1                                               | `hor: true`                     | 🔴 B-1                                |
| A4  | `Frame hor, gap 12`            | `flex, row, stretch, flex-start, gap`              | `flex, row, gap`                                     | `hor: true, gap: 12`            | 🔴 B-1                                |
| A5  | `Frame hor, wrap`              | `flex, row, stretch, flex-start, wrap`             | `flex, row, wrap`                                    | `hor: true, wrap: true`         | 🔴 B-1                                |
| A6  | `Frame hor, wrap, gap 8`       | `flex, row, stretch, flex-start, wrap, gap`        | `flex, row, wrap, gap`                               | `hor: true, wrap: true, gap: 8` | 🔴 B-1                                |
| A7  | `Frame wrap, gap 8` (no hor)   | `flex, column, stretch, flex-start, wrap, gap`     | `flex, column, stretch, flex-start, wrap, gap` ✓     | `wrap: true, gap: 8`            | ✅                                    |
| A8  | `Frame spread`                 | `flex, column, stretch, space-between, flex-start` | `flex, column, stretch, flex-start, space-between` ✓ | `spread: true`                  | ✅                                    |
| A9  | `Frame hor, spread`            | `flex, row, stretch, space-between, flex-start`    | `flex, row, space-between` (kein stretch)            | `hor: true, spread: true`       | 🔴 B-1                                |

### B — hor + ver Konflikt (Last-wins)

| #   | Eingabe          | DOM                  | React    | Framework   | Verdikt |
| --- | ---------------- | -------------------- | -------- | ----------- | ------- |
| B1  | `Frame hor, ver` | `column` (last wins) | `column` | `(no flag)` | ✅      |
| B2  | `Frame ver, hor` | `row` (last wins)    | `row`    | `hor: true` | ✅      |

### C — Alignment-Kombi mit hor (Cross-Slice-Funde)

| #   | Eingabe                       | DOM                                                      | React                         | Framework                 | Verdikt                    |
| --- | ----------------------------- | -------------------------------------------------------- | ----------------------------- | ------------------------- | -------------------------- |
| C1  | `Frame hor, center`           | `flex, row, stretch, center, center`                     | `flex, row, center, center` ✓ | `hor: true, center: true` | ✅                         |
| C2  | `Frame hor, ver-center`       | `flex, row, stretch, items: center`                      | `flex, row` (NUR display+dir) | `hor: true, center: true` | 🔴 X-1 (Slice 5 territory) |
| C3  | `Frame hor, cl` (center-left) | `flex, row, stretch, justify: flex-start, items: center` | `flex, row` (NUR display+dir) | `hor: true, center: true` | 🔴 X-1 (Slice 4 territory) |

### D — Mixed Content

| #   | Eingabe                              | DOM   | React | Framework | Verdikt |
| --- | ------------------------------------ | ----- | ----- | --------- | ------- |
| D1  | `Frame hor, gap 8` + Icon + Text     | works | works | works     | ✅      |
| D2  | `Btn: hor, gap 8\n  Icon, Text\nBtn` | works | works | works     | ✅      |

### E — wrap-Edge

| #   | Eingabe                         | DOM                                                    | React                                    | Framework             | Verdikt                    |
| --- | ------------------------------- | ------------------------------------------------------ | ---------------------------------------- | --------------------- | -------------------------- |
| E1  | `Frame grid 12, wrap`           | `display: grid, grid-template-columns: repeat(12,1fr)` | `display: flex, column, wrap` (NO grid!) | `grid: 12` (no wrap?) | 🔴 X-2 (Slice 6 territory) |
| E2  | `Frame hor, wrap` (no children) | works                                                  | works                                    | works                 | ✅                         |

### F — Validator

| #   | Eingabe                     | Validator      | Verdikt                                                            |
| --- | --------------------------- | -------------- | ------------------------------------------------------------------ |
| F1  | `Frame hor 5`               | clean          | 🟡 B-2 — Flag-Keyword nimmt silent einen Wert (sollte W120 warnen) |
| F2  | `Frame wrap "yes"`          | W112 (content) | 🟡 B-3 — Falsche Warn (W112 statt W120 für Flag-mit-Wert)          |
| F3  | `Frame ver true`            | clean          | 🟡 B-2                                                             |
| F4  | `Frame spread 5`            | clean          | 🟡 B-2                                                             |
| F5  | `Frame hor, spread, center` | E110 ✓         | ✅ Layout-Conflict-Detection                                       |

## Befunde

**B-1 (CRITICAL — Slice 3 Scope)**: React-Backend `withLayoutDefaults`
applieert seine Defaults (`alignSelf: stretch`, `alignItems: flex-start`)
NICHT, wenn der User schon `display` gesetzt hat (durch `hor`/`ver`/`center`/
`grid`). Die Logik ist „skip-if-display-set", aber DOM via IR
layout-transformer applieert immer `align-self: stretch` für Container.
Result: `Frame hor` rendert in React als `<div style={{display:flex,
flexDirection:row}}>` — ohne stretch, ohne items. Visuell: Width
shrinks-to-fit (mit fallback-styles vom Parent), und Items sind nicht
explizit links-gestartet. DOM rendert sichtbar anders.

**Touchpoint:** `compiler/backends/react.ts:331-344 withLayoutDefaults`.

**B-2 (HIGH — Slice 3 Scope)**: Validator akzeptiert silent Werte für
Flag-Keywords. `Frame hor 5`, `Frame wrap "yes"`, `Frame ver true`,
`Frame spread 5` werden alle clean validiert (oder lösen W112-Content-
Fehl-Warn). Das ist DX-Defizit: Designer sieht keinen Hinweis, dass
`hor` ein Flag ist.

**Touchpoint:** `compiler/validator/validator.ts` (validateProperty).

**B-3 (MED — Slice 3 Scope)**: F2 (`Frame wrap "yes"`) löst W112
„CONTENT_ON_LAYOUT" aus statt einer dedizierten W120 „FLAG_HAS_VALUE".
Misleading: W112 sagt "wrap es in Text/Button/Label", aber das Problem
ist nicht der Inhalt — es ist die `wrap`-Property mit einem Wert.

**X-1 (CROSS-SLICE — Slice 4/5)**: 9-zone-Keywords (`cl`, `cr`, `tl`,
`tr`, `tc`, `bl`, `bc`, `br`, `ver-center`, `hor-center`) sind im
React-Backend KOMPLETT GEDROPPT. C2 (Frame hor, ver-center) → DOM hat
`align-items: center`, React hat nichts. Slice 5 / Slice 4 territory,
nicht Slice 3 — aber der Befund ist real.

**X-2 (CROSS-SLICE — Slice 6)**: `grid 12` setzt im React-Backend
`display` NICHT auf `grid`. E1 zeigt React emittiert `flex+col+wrap`
statt `grid+grid-template-columns`. Slice 6 territory.

## Verdikt pro Dimension

| #   | Dimension               | Bewertung                                                                                                                                                                                                             |
| --- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Architektur             | **mittel** — Schema (property-schema) deklariert für `hor` ein `align-items: center`, aber IR (layout-transformer + FLEX_DEFAULTS) override mit `flex-start`. Drift Schema-vs-IR; Schema sollte Source-of-Truth sein. |
| 2   | Codequalität            | **mittel** — `withLayoutDefaults` skip-if-display-set ist subtil-falsch (Slice 1 Phase B.3). Korrekter wäre default-merge-mit-overrides.                                                                              |
| 3   | Testqualität            | **schwach an einer Stelle** — `tests/compiler/layout/layout-manual.test.ts` und Genossen testen DOM, aber kein Test verlangt Cross-Backend-Symmetrie für Container-Defaults bei `hor`.                                |
| 4   | Testabdeckung           | **schwach** — Bug B-1 ist nirgends gelocked. F1-F4 ungetestet (Validator-Drift).                                                                                                                                      |
| 5   | Funktionale Korrektheit | **3 Bugs (B-1 hard, B-2 DX, B-3 wrong-warn) + 2 Cross-Slice-Funde (X-1, X-2)** — B-1 Cross-Backend-Bruch in Container-Defaults; B-2 Flag-Keyword DX; B-3 misleading Validator. X-1/X-2 sind Slice-4/5/6-Territorium.  |
| 6   | Studio-Roundtrip        | n/a — Studio nutzt DOM-Backend; betrifft nur Export-Pfad                                                                                                                                                              |

## Touchpoint-Map

| Layer             | Datei                                                    | Befund                                                                                                                                  |
| ----------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Schema            | `compiler/schema/property-schema.ts:258-275 (hor)`       | Schema deklariert `align-items: center` für `hor` — **inkonsistent mit IR-Default `flex-start`**                                        |
| Schema            | `compiler/schema/property-schema.ts:277-292 (ver)`       | Schema deklariert nur display+flex-direction (kein align-items) — asymmetrisch zu hor                                                   |
| IR-Layout         | `compiler/ir/transformers/layout-transformer.ts:181-208` | `hor`/`ver` setzt `ctx.direction`                                                                                                       |
| IR-Layout         | `compiler/ir/transformers/layout-transformer.ts:421-444` | `align-items` Default = `FLEX_DEFAULTS[direction].alignItems` (= `flex-start` für beide)                                                |
| IR-Layout         | `compiler/schema/layout-defaults.ts:45-56 FLEX_DEFAULTS` | symmetric `flex-start` für beide Achsen — Source-of-Truth für IR                                                                        |
| IR-Layout         | `compiler/ir/transformers/layout-transformer.ts:399-409` | `align-self: stretch` für Container ohne explicit width                                                                                 |
| Backend-DOM       | `compiler/backends/dom/style-emitter.ts`                 | konsumiert IR-Output korrekt                                                                                                            |
| Backend-React     | `compiler/backends/react.ts:498-528 (flag-handlers)`     | `hor`/`ver`/`wrap`/`spread`/`center`/`scroll`/`hidden` als Flag-Cases — fehlende: `ver-center`, `hor-center`, `tl`/`cl`/`tr`/etc. (X-1) |
| Backend-React     | `compiler/backends/react.ts:331-344 withLayoutDefaults`  | **Skip-if-display-set Bug (B-1)** — Container-Defaults nicht appliziert wenn `hor` schon display gesetzt hat                            |
| Backend-Framework | `compiler/backends/framework.ts:cssPropToMirrorProp`     | korrekt für `hor`/`wrap`/`spread`                                                                                                       |
| Validator         | `compiler/validator/validator.ts`                        | E110 für hor+spread+center conflict ✓; **kein W120 für Flag-mit-Wert** (B-2)                                                            |
| Validator         | `compiler/validator/validator.ts (W112)`                 | feuert irrtümlich für `Frame wrap "yes"` (B-3)                                                                                          |
| Tests             | `tests/compiler/layout/*` (mehrere)                      | DOM-fokussiert; keine Cross-Backend-Differential für Container-Defaults                                                                 |

---

# 2. Untersuchungs-Ergebnisse

| Q   | Frage                                                                     | Befund                                                                                                                                                        |
| --- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-1 | Schema sagt für `hor` `align-items: center` — implementiert die IR das?   | **Nein.** IR-FLEX_DEFAULTS sind symmetric `flex-start` für beide Richtungen. Schema-Drift. Aber semantically korrekt — Items zentrieren wäre breaking change. |
| Q-2 | Hat React-Backend dieselbe „Container-Default-Stretch"-Logik wie DOM-IR?  | **Nein.** `withLayoutDefaults` applieert nur wenn kein display gesetzt. DOM-IR applieert immer für Container ohne explicit width.                             |
| Q-3 | Welche Layout-Keywords sind im React-Backend vollständig unimplementiert? | `ver-center`, `hor-center`, `tl`, `tc`, `tr`, `cl`, `cr`, `bl`, `bc`, `br`, `top-left`, etc. — alle 9-zone-Aliase. (X-1, Slice 4/5)                           |
| Q-4 | Setzt React-Backend `display: grid` korrekt für `grid 12`?                | **Nein.** Kein switch-case für `grid` als value-property. (X-2, Slice 6)                                                                                      |
| Q-5 | Validiert irgendwer Flag-Keywords gegen Werte (`hor 5`)?                  | **Nein.** Parser akzeptiert beliebige Werte; Validator hat keinen W120-Code.                                                                                  |

---

# 3. Entscheidungen

## V-1 — React `withLayoutDefaults` als merge-with-defaults — **Status: offen**

**Frage:** `withLayoutDefaults` skip-if-display-set droppt
`alignSelf: stretch` und `alignItems: flex-start` (B-1).

**Vorschlag:** Refactor zu merge:

```ts
function withLayoutDefaults(style, componentName) {
  if (!isLayoutPrimitive(componentName)) return style
  // Defaults appliziert per-key, nur wo nicht überschrieben
  const merged = { ...style }
  if (merged.display === undefined) merged.display = 'flex'
  if (merged.flexDirection === undefined) merged.flexDirection = 'column'
  if (merged.alignSelf === undefined) merged.alignSelf = 'stretch'
  if (merged.alignItems === undefined) merged.alignItems = 'flex-start'
  return merged
}
```

So bleiben User-explicit choices (`hor` → flexDirection: row,
`center` → alignItems: center) intakt, aber die default-stretch und
flex-start defaults werden für jeden Layout-Primitive angewendet.

**Begründung:** Cross-Backend-Konsistenz mit DOM-IR. Visuell-äquivalent
zu `Frame hor` in DOM-Output. Slice 1 Phase B.3 hat einen halben Schritt
gemacht; jetzt komplettieren.

**Risiko:** Existierende React-Tests könnten auf der „lean style"-Form
asserten. Test-Lauf muss zeigen.

**Status:** offen.

## V-2 — Validator `W120 LAYOUT_FLAG_HAS_VALUE` — **Status: verschoben (parser-Schicht)**

**Frage:** Flag-Keywords (`hor`, `ver`, `wrap`, `spread`, `center`,
`tl`/etc., `scroll`, `hidden`) nehmen silent einen Wert (`hor 5`,
`wrap "yes"`).

**Untersuchungsergebnis:** Probe gegen den Parser zeigt: er **droppt den
Wert silent**. `Frame hor 5` produziert dieselbe AST wie `Frame hor`
(`hor: { values: [true] }`). Damit hat ein Validator-Pass kein Signal,
das W120 fire könnte — der Tippfehler ist auf AST-Ebene unsichtbar.

**Vorschlag (revidiert):** V-2 verschoben auf eine eigene Parser-Audit-
Slice (oder integriert in Slice 21+B Phase B/C, wenn dort Parser-strict-
Mode kommt). Optionen:

- Parser preserves discarded tokens als `Property.extraValues` und
  Validator emittiert W120
- Parser direkt warning-emit beim Schluck-Vorgang (LexerError-ähnlich)

**Begründung Verschiebung:** Pure Validator-Lösung ist nicht möglich
ohne Parser-Refactor. Der Parser-Refactor lohnt sich nur, wenn weitere
Diagnostiken davon profitieren (siehe Slice-21 Q-A "nested Component-
Definition", Slice 1 V-4 "Single-Word-Child-State-Gate").

**Status:** verschoben.

Die `PURE_FLAG_PROPERTIES`-Set in `compiler/schema/parser-helpers.ts`
bleibt erhalten — sobald der Parser das Signal bietet, ist die
Validator-Anbindung trivial.

## V-3 — Schema-IR-Sync für `hor` `align-items: center` — **Status: verschoben**

**Frage:** Schema sagt `hor` emittiert `align-items: center`, IR sagt
`flex-start`. Drift.

**Vorschlag (revidiert nach Probe):** **Verschoben.** Initial-Vorschlag
war Schema-Cleanup (V-3a: `align-items: center` aus dem `hor`-Schema
entfernen). Probe zeigte aber: der **size-state-CSS-Emit-Pfad**
(`compiler/schema/ir-helpers.ts:schemaPropertyToCSS`) konsultiert das
Schema **direkt**, nicht den IR layout-transformer. Tutorial-Snapshot
für `wide: hor` (Tutorial Kapitel 04, Beispiele 14+16) erwartet
`align-items: center`, weil der size-state-Pfad das Schema umgeht.

Den Drift zu beheben verlangt eine koordinierte Reform beider Pfade
(IR-FLEX_DEFAULTS + size-state-Emit + ggf. Tutorial-Snapshot-Update),
über Slice-3-Scope hinaus.

**Status:** verschoben — Drift dokumentiert, eigener Cross-Slice-Pass
für Schema-IR-Sync (Slice 5 Cluster mit center/spread/ver-center oder
eigener Schema-Konsolidierungs-Slice).

## V-4 — Cross-Slice X-1 (Slice 4/5 Territory) — **Status: verschoben**

**Frage:** 9-zone-Keywords (`cl`, `cr`, `tl`, `tr`, `tc`, `bl`, `bc`,
`br`, `ver-center`, `hor-center`) im React-Backend.

**Vorschlag:** Verschoben auf Slice 4 (9-Positions) und Slice 5 (center
/ spread / ver-center / hor-center).

**Begründung:** Slice-Grenzen respektieren. X-1 ist real und groß, aber
das Reformat des React-Switch-Case-Blocks für 9-zone-Aliase wird Teil
der Slice-4/5-Audits sein.

**Status:** verschoben.

## V-5 — Cross-Slice X-2 (Slice 6 Territory) — **Status: verschoben**

**Frage:** `grid` im React-Backend.

**Vorschlag:** Verschoben auf Slice 6 (Grid 12-col).

**Status:** verschoben.

---

# 4. Umsetzungsplan & Status

## Phase A — React-Defaults + Validator-Flag

| ID  | Sub-Task                                                                                                                                                 | Aus | Aufwand | Status                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------- | ---------------------------- |
| A.1 | `withLayoutDefaults` als merge-with-defaults refactor                                                                                                    | V-1 | S       | erledigt                     |
| A.2 | ~~Schema-Drift-Cleanup: `hor`-keyword `align-items: center` entfernen~~ — **verschoben** (size-state-Pfad nutzt Schema direkt, eigener Cross-Slice-Pass) | V-3 | S       | verschoben                   |
| A.3 | Schema-Helper `PURE_FLAG_PROPERTIES` (schema-derived, nur `_standalone`)                                                                                 | V-2 | S       | erledigt                     |
| A.4 | ~~Validator W120 LAYOUT_FLAG_HAS_VALUE~~ — **verschoben** (Parser eats values silently, no AST signal)                                                   | V-2 | M       | verschoben                   |
| A.5 | RT-Suite in `tests/compiler/slice-3-horizontal-stack.test.ts`                                                                                            | A   | M       | erledigt — 31 Sub-Tests grün |

## Phase B — Quality-Gate-Pass (Step 7+8)

| ID  | Sub-Task                                               | Status                                                                                                                                              |
| --- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| B.1 | Probe-Tabelle gegen Post-Fix-Stand spiegeln            | erledigt — 15 Probes re-verifiziert                                                                                                                 |
| B.2 | Schema-Drift-Grep: gibt es weitere Schema-vs-IR Drift? | erledigt — `/tmp/standalone-drift-grep.ts` läuft alle `_standalone`-Properties durch; einzig `horizontal` driftet (V-3a, dokumentiert + RT-1 lockt) |
| B.3 | Cross-Backend-Verifikation                             | erledigt — RT-5..RT-8 lockt DOM/React/Framework Symmetrie                                                                                           |
| B.4 | Audit-Status `erledigt` setzen                         | erledigt — Phase A V-1 erledigt; V-2/V-3a deferred mit Test-Lock und Schema-Kommentar                                                               |

Status-Werte: `offen` · `in-arbeit` · `erledigt` · `verworfen` · `verschoben`.
Aufwand: `S` (≤30min) · `M` (≤2h) · `L` (≤1d).

---

# 5. Tests

## Baseline

| Suite                                              | Tests Slice-3-relevant |
| -------------------------------------------------- | ---------------------- |
| `tests/compiler/layout/layout-manual.test.ts`      | hor-bezogene cases     |
| `tests/compiler/layout/layout-context.test.ts`     | direction precedence   |
| `tests/compiler/layout-css-matrix.test.ts`         | hor + wrap CSS-output  |
| `tests/behavior/layout.test.ts`                    | minimal                |
| `tests/differential/layout.test.ts`                | minimal                |
| **0 dedicated `slice-3-horizontal-stack.test.ts`** | -                      |

## Neue Regression-Tests (in `tests/compiler/slice-3-horizontal-stack.test.ts`)

Test-Struktur (3 Sub-Tests in RT-1, 2 in RT-2, 1 in RT-3, 3 in RT-5, 3 in RT-6, 3 in RT-7, 3 in RT-8, 3 in RT-9, 2 in RT-10, 1 in RT-11, 3 in RT-12, 2 in RT-13 = 31 Sub-Tests).

| ID    | Test                                                                                                                       | Aus        | Status                              |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------- |
| RT-1  | Schema-Lock: `horizontal._standalone.css` enthält `display+flex-direction+align-items:center` (V-3a deferred dokumentiert) | A.2        | erledigt                            |
| RT-2  | React: `Frame hor` keeps Container-Defaults (B-1 Lock — flexDirection:row + alignSelf:stretch + alignItems:flex-start)     | A.1        | erledigt                            |
| RT-3  | React: `Frame hor, gap N` preserves defaults + gap                                                                         | A.1        | erledigt                            |
| RT-4  | React: `Frame hor, center` lets user override defaults (alignItems:center wins)                                            | A.1        | erledigt                            |
| RT-5  | Cross-Backend: `Frame hor` emits row in DOM/React/Framework + locks IR `flex-start` ≠ schema `center`                      | A.1        | erledigt                            |
| RT-6  | Cross-Backend: `Frame hor, spread` → row + space-between in alle 3 Backends                                                | A.1        | erledigt                            |
| RT-7  | Cross-Backend: `Frame hor, wrap` → row + flex-wrap:wrap in alle 3 Backends                                                 | A.1        | erledigt                            |
| RT-8  | Cross-Backend: `Frame hor, gap 12` Slice-2-Re-Lock                                                                         | A.1        | erledigt                            |
| RT-9  | Validator: `Frame hor, ver` und `Frame ver, hor` → E110 + Build-CLI Exit-1                                                 | regression | erledigt                            |
| RT-10 | Component-Def `Btn: hor, gap 4` propagates to use-site (DOM + React)                                                       | regression | erledigt                            |
| RT-11 | Nested: outer hor, inner ver — directions independent                                                                      | regression | erledigt                            |
| RT-12 | W120 Wiring + Parser-Swallow Caveat (V-2 deferred): PURE_FLAG_PROPERTIES-Lock + Parser-Drop-Lock + W120-Reservation-Lock   | A.4        | erledigt (deferred-status gelocked) |
| RT-13 | PURE_FLAG_PROPERTIES is schema-derived (alle `_standalone`-only Properties + Aliases)                                      | A.3        | erledigt                            |

---

# 6. Deferred Items (Phase A teilweise) — Quality-Gate-honest

## V-3a — Schema-Drift `horizontal._standalone.css` `align-items: center`

**Status:** verschoben.
**Code-State:** `compiler/schema/property-schema.ts:266-278` enthält einen ausführlichen Block-Kommentar, der den Drift-Status dokumentiert. Der Schema-Eintrag deklariert weiterhin `align-items: center` für `horizontal`, weil die Size-State-CSS-Emit-Path (`schemaPropertyToCSS` für responsive `wide: hor` etc.) diesen Wert direkt konsumiert. Die regulär-IR-Pipeline (layout-transformer) bypassed den Schema-Eintrag und emittiert `FLEX_DEFAULTS.row.alignItems = 'flex-start'` (`compiler/schema/layout-defaults.ts:51-55`).
**Beobachtbares Verhalten:** ✅ unverändert — `Frame hor` rendert mit `align-items: flex-start` in DOM/React (siehe RT-5). Drift ist nur eine Schema-vs-IR-Doku-Inkonsistenz, kein Output-Bug.
**Test-Lock:** RT-1 lockt _beide_ Seiten der Drift (Schema-Eintrag UND IR-Output). Wer Schema-Drift später beheben will, sieht den Drift sofort an dem fail.
**Wann fortsetzen:** Wenn ein Slice die Size-State-CSS-Emit-Path und die layout-transformer-`FLEX_DEFAULTS` zusammen anfasst (Slice mit Responsive-Layout-Scope).

## V-2 — Validator W120 LAYOUT_FLAG_HAS_VALUE

**Status:** verschoben.
**Code-State:** Error-Code `LAYOUT_FLAG_HAS_VALUE: 'W120'` reserviert in `compiler/validator/types.ts:119`. Die Branch in `compiler/validator/validator.ts:700-707` ist als Kommentar belassen, der erklärt _warum_ sie deferred ist.
**Beobachtbares Verhalten:** Parser droppt Extra-Args nach Pure-Flags silently (`Frame hor 5` parst wie `Frame hor`; `Frame hor true` interpretiert das `true` als `initialState`; `Frame wrap "yes"` macht `wrap` + separate `content: "yes"` property). Dadurch erreichen die ungewollten Werte den Validator nicht und W120 hat kein Signal.
**Wo der echte Fix sitzt:** Parser muss die Extra-Args entweder im AST behalten (in `prop.values`) oder direkt selbst die Warning emittieren. Beides ist parser-aware, nicht validator-only.
**Test-Lock:** RT-12 hat drei Sub-Tests:

1. `PURE_FLAG_PROPERTIES.has('hor'/'ver'/'wrap'/'spread'/'center')` — Schema-Helper ist korrekt.
2. Parser-Swallow-Lock — `parse('Frame hor 5')` produziert `hor: [true]` ohne den `5`. Verhindert silent-relax dieses Vertrags.
3. W120-Code-Reservation in `ERROR_CODES.LAYOUT_FLAG_HAS_VALUE`. Mach das Wiederaktivieren grep-bar.
   **Wann fortsetzen:** Wenn Parser-Strict-Slice oder Slice 21+ den Inline-Property-Parser anfasst.

## Quality-Gate-Honesty

Slice 3 schließt **Phase A V-1 (B-1 React-Defaults)** vollständig — der ursprünglich kritische Cross-Backend-Bug (DOM emittiert `align-self:stretch + align-items:flex-start`, React droppte beide bei `Frame hor`) ist behoben und gelocked.

V-2 und V-3a sind ehrlich als **deferred** markiert, mit Schema-Kommentar (V-3a) bzw. Validator-Kommentar (V-2) im Code, der erklärt, _warum_ verschoben und _wann_ wieder anpacken. RT-1 und RT-12 lockt den deferred-Status, sodass eine spätere stille "Aufweichung" auffällt.

**Status pro Quality-Gate-Kriterium:**

- ✅ Probe-Tabelle ehrlich (Phase B.1, 15 Probes re-verifiziert)
- ✅ Cross-Slice-Probe (Phase B.2, Schema-Drift-Grep läuft alle `_standalone`-Properties durch)
- ✅ ≥12 RTs (31 Sub-Tests, 13 RT-Gruppen)
- ✅ Vitest gesamt 14905/14928 grün (23 skipped, 0 failed)
- ✅ Deferred-Items dokumentiert mit Code-Kommentar + Test-Lock

---

# 7. Iter-2-Sweep (2026-05-10, Dev 1)

Auftrag aus `plan.md` Phase 0: **V-2 Re-Open-Trigger setzen (W120 → Parser-Strict-Slice), V-3a Schema-Drift-Stand klären.**

## 7.1 Probe-Skript

`tools/probes/slice-03-horizontal-stack-iter2.ts` committet — Iter-2-Re-Probes für V-2 + V-3a:

- **A. Parser-AST-Lock:** `Frame hor 5` und `Frame hor` produzieren identisches AST (`hor: [true]`). Werte werden silent geschluckt — Validator hat kein Signal. Lock für V-2-Verschiebung.
- **B. Schema-IR-Drift:** Schema `horizontal._standalone.css` enthält `align-items: center`; IR-Pfad (layout-transformer `FLEX_DEFAULTS`) emittet `align-items: flex-start`. Beide Pfade aktiv, beide Werte fließen je nach Pfad durch.
- **C. PURE_FLAG_PROPERTIES schema-derived:** 65 Einträge, alle aus Schema. Drift-frei.

## 7.2 V-2 Re-Open-Trigger geschärft

**Vorher (Re-Open-Tracking, Iter-1):** Slice 22 `as`-Inheritance (Parser-Strict-Cluster).

**Nachher (Iter-2):** Slice 22 ist `as`-Inheritance, nicht Parser-Strict — die canonical Adresse ist **Slice 21 Phase B/C (Komponenten-Vollständigkeit)** ODER ein dedizierter Parser-Strict-Slice. Slice 21 Phase B/C ist von Dev 2 in seinem Iter-2-Sweep gesetzt; wenn dort ein Parser-Strict-Mode landet, wird V-2 dort eingelöst. Sonst verbleibt V-2 als Trigger an einen späteren dedizierten Parser-Audit-Slice (post-Phase-1).

**Konkrete Bedingung für Re-Open:** sobald der Parser `prop.extraValues` o.ä. AST-Signal bietet, ist die Validator-Anbindung trivial (`PURE_FLAG_PROPERTIES.has(name) && prop.extraValues.length > 0 → W120`). Lesson 7 (Hot-Files brauchen Schema-Lookups, nicht Switch-Cases) wird hier gelten — der Validator-Branch wird die schon existierende `PURE_FLAG_PROPERTIES`-Set verwenden.

## 7.3 V-3a Schema-Drift-Stand geklärt

**Bewerten:** Drift ist **real und intentional** im aktuellen Code-Zustand. Beide Pfade existieren parallel, weil das size-state-CSS-emit (`schemaPropertyToCSS` für `wide: hor`) Schema-direkt liest, während der normale Layout-Pfad über IR `FLEX_DEFAULTS` geht.

**Re-Open-Adresse Iter-1:** "Slice 5-Cluster Re-Open (Sweep Dev 2)" — bestätigt. Dev 2 würde im Iter-2-Sweep der Slices 5 (center/spread/ver-center/hor-center) den Schema-IR-Sync angehen, weil die `hor-center`/`ver-center`-Cases im Schema ähnliche Single-Source-Lücken haben.

**Konkrete Bedingung für Re-Open:** Schema und IR `FLEX_DEFAULTS` zusammen anfassen, Tutorial-Snapshot für `wide: hor` (Tutorial-Kapitel 04, Beispiele 14+16) als Cross-Slice-Lock mitziehen. RT-1 in der bestehenden Slice-3-Suite lockt aktuell beide Seiten der Drift — wenn die Reform kommt, fällt RT-1 in Stücke und zeigt damit, _wo_ die Reform ansetzen muss.

## 7.4 Studio-Roundtrip explizit benannt

**Modus:** **Lower-Bar — DOM gelocked via 31 RTs in `tests/compiler/slice-3-horizontal-stack.test.ts`; Property-Panel-Coverage durch `studio/test-api/suites/property-panel/comprehensive.test.ts` (alle Layout-Properties, inkl. hor/wrap/spread).**

**Begründung:** `hor`/`wrap`/`spread` sind reine flag-only Layout-Properties ohne State-Verhalten. Property-Panel emittet sie als Toggles (boolean-Flags), die durch comprehensive.test.ts mit-getestet werden.

**Re-Open-Trigger:** keiner. Slice 67-69 (Studio-Loops) bringen ihre eigenen CDP-Runs für Cross-Slice-Effekte mit.

## 7.5 9-Punkt-Quality-Gate (Iter-2)

| #   | Check                                           | Status                                                                                                                                                                                                                                                                                                            |
| --- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Probe-Tabelle ohne 🔴                           | ✅ Iter-1-Phase-A erledigt, V-2/V-3a explizit als 🟡 deferred mit Re-Open-Adressen                                                                                                                                                                                                                                |
| 2   | Phase-Stati ∈ {erledigt, verschoben, verworfen} | ✅ Phase A V-1 erledigt; A.2 (V-3a) und A.4 (V-2) als verschoben mit Iter-2-Schärfung                                                                                                                                                                                                                             |
| 3   | Jeder RT geschrieben                            | ✅ 31 RT-Sub-Tests (13 RT-Gruppen)                                                                                                                                                                                                                                                                                |
| 4   | Schema-Drift-Grep                               | ✅ durchgeführt (Iter-1 Phase B.2 + Iter-2 Probe-Re-Run); kein neuer Drift                                                                                                                                                                                                                                        |
| 5   | Cross-Slice-Wirkung geprüft                     | ✅ V-3a Cross-Slice mit Slice 5 dokumentiert; V-4 (9-zone) auf Slice 4 verschoben (Iter-1 erledigt); V-5 (grid) auf Slice 6 (Iter-1 erledigt)                                                                                                                                                                     |
| 6   | Cross-Backend-Differential-RT                   | ✅ RT-5..RT-8 lockt DOM/React/Framework Symmetrie für hor/wrap/spread/center                                                                                                                                                                                                                                      |
| 7   | Studio-Roundtrip explizit                       | ✅ Lower-Bar deklariert in 7.4                                                                                                                                                                                                                                                                                    |
| 8   | Vitest gesamt grün                              | ✅ 15066/15089 (23 skipped); kein Test-Subtraktion gegenüber Pre-Iter-2                                                                                                                                                                                                                                           |
| 9   | „Substantiell besser, aber …"-Test              | ✅ Antwort auf „ist das nun richtig gut?" — **Ja:** V-2 Re-Open-Adresse präzisiert (Slice 21 Phase B/C oder dedizierter Parser-Audit-Slice, nicht Slice 22). V-3a-Drift ist real-und-intentional dokumentiert mit Slice-5-Cross-Slice-Adresse. Beide Iter-1-deferred-Items haben jetzt klare Re-Open-Bedingungen. |
