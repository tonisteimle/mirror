# Slice 4: 9-Positions (`tl`/`tc`/`tr`/`cl`/`center`/`cr`/`bl`/`bc`/`br`)

**Datum:** 2026-05-10
**Status:** erledigt — Phase A/B/C/D/E alle grün; 63 RT-Subtests; V-4/V-5/V-6 als Cross-Slice-Follow-ups verschoben

## Inhalt

1. [Audit (Zusammenfassung)](#1-audit-zusammenfassung)
2. [Entscheidungen](#2-entscheidungen)
3. [Umsetzungsplan & Status](#3-umsetzungsplan--status)
4. [Tests](#4-tests)

---

# 1. Audit (Zusammenfassung)

## Scope

Die 9-Zonen-Aliase: `tl`/`tc`/`tr`/`cl`/`center`/`cr`/`bl`/`bc`/`br` plus deren Langformen (`top-left`, `top-center`, …, `bottom-right`). Schema-Lokation: `compiler/schema/property-schema.ts:347-525` (10 Property-Definitionen, je `_standalone` mit CSS-Liste). IR-Lokation: `compiler/schema/layout-defaults.ts:NINE_ZONE` (Single-Source-of-Truth) + `compiler/ir/transformers/layout-transformer.ts:213-268` (zone → `_hAlign`/`_vAlign` → direction-aware `justify-content`/`align-items`).

**DSL-Versprechen** (CLAUDE.md):

```mirror
Frame tl        // top-left
Frame tc        // top-center
Frame tr        // top-right
Frame cl        // center-left
Frame center    // both axes
Frame cr        // center-right
Frame bl        // bottom-left
Frame bc        // bottom-center
Frame br        // bottom-right
```

- 9 Position-Aliase, alle als reine Boolean-Flag-Properties
- Cross-Backend-Konsistenz (DOM ≡ React ≡ Framework-Export)
- Direction-aware: `Frame hor, cr` → main-axis (horizontal) flex-end + cross-axis (vertical) center
- `align top left` als alternative Long-Syntax: gleiches Resultat wie `Frame tl`

## Probes

Aus `/tmp/slice4-probes.ts` (20 Cases) plus `/tmp/slice4-extra.ts` (10 Cases).

### A — 9-Zone-Aliase Cross-Backend

| #   | Eingabe              | DOM (justify / items)   | React (justify / items) | Framework      | Verdikt                                               |
| --- | -------------------- | ----------------------- | ----------------------- | -------------- | ----------------------------------------------------- |
| 1   | `Frame tl`           | flex-start / flex-start | (default) / flex-start  | `(no props)`   | 🔴 R-Backend matcht zufällig (FLEX_DEFAULTS), FW lost |
| 2   | `Frame tc`           | flex-start / **center** | (default) / flex-start  | `center: true` | 🔴 R falsch (sollte align:center), FW collapsed       |
| 3   | `Frame tr`           | flex-start / flex-end   | (default) / flex-start  | `(no props)`   | 🔴 R falsch, FW lost                                  |
| 4   | `Frame cl`           | **center** / flex-start | (default) / flex-start  | `center: true` | 🔴 R falsch (kein justify), FW collapsed              |
| 5   | `Frame center`       | center / center         | center / center         | `center: true` | ✅ Cross-Backend konsistent                           |
| 6   | `Frame cr`           | center / flex-end       | (default) / flex-start  | `center: true` | 🔴 R falsch, FW collapsed                             |
| 7   | `Frame bl`           | flex-end / flex-start   | (default) / flex-start  | `(no props)`   | 🔴 R falsch, FW lost                                  |
| 8   | `Frame bc`           | flex-end / center       | (default) / flex-start  | `center: true` | 🔴 R falsch, FW collapsed                             |
| 9   | `Frame br`           | flex-end / flex-end     | (default) / flex-start  | `(no props)`   | 🔴 R falsch, FW lost                                  |
| 10  | `Frame top-left`     | flex-start / flex-start | (default) / flex-start  | `(no props)`   | 🔴 Long-Form genauso betroffen                        |
| 11  | `Frame center-right` | center / flex-end       | (default) / flex-start  | `center: true` | 🔴                                                    |

### B — Direction-Awareness (9-Zone + hor)

| #   | Eingabe             | DOM (relevant)                | React                 | Framework                 | Verdikt                                                                   |
| --- | ------------------- | ----------------------------- | --------------------- | ------------------------- | ------------------------------------------------------------------------- |
| 12  | `Frame hor, tl`     | row / flex-start / flex-start | row / flex-start      | `hor: true`               | 🔴 R droppt 9-zone trotz hor                                              |
| 13  | `Frame hor, center` | row / center / center         | row / center / center | `hor: true, center: true` | ✅                                                                        |
| 14  | `Frame hor, cr`     | row / **flex-end** / center   | row / flex-start      | `hor: true, center:true`  | 🔴 R komplett wrong (row + cr = items am rechten Rand zentriert vertikal) |
| 23  | `Frame hor, bc`     | row / center / flex-end       | row / flex-start      | `hor: true, center:true`  | 🔴 R wrong, FW collapsed                                                  |

### C — Konflikt + Edge-Cases

| #   | Eingabe                 | Validator | DOM                                | React                      | FW                         | Verdikt                                          |
| --- | ----------------------- | --------- | ---------------------------------- | -------------------------- | -------------------------- | ------------------------------------------------ |
| 16  | `Frame tl, br`          | **E110**  | last-wins (br)                     | (default)                  | `(no props)`               | ✅ Validator catched, BUT R/FW immer noch kaputt |
| 27  | `Frame tl, tr`          | **E110**  | last-wins (tr)                     | (default)                  | `(no props)`               | ✅ Validator catched                             |
| 17  | `Frame center, spread`  | **E110**  | spread + center                    | spread + center            | `spread:true, center:true` | ✅ Validator catched, beide Backends emittieren  |
| 26  | `Frame grid 12, center` | clean     | **`display: grid`** (drops center) | flex + center (drops grid) | `grid: 12` (drops center)  | 🔴 V-3 — Drei Backends, drei verschiedene Wins   |

### D — Long-Form / `align`-Syntax / Aliases

| #   | Eingabe                | DOM                     | React                   | FW            | Verdikt                                                       |
| --- | ---------------------- | ----------------------- | ----------------------- | ------------- | ------------------------------------------------------------- |
| 21  | `Frame align top left` | flex-start / flex-start | (default) / flex-start  | `(no props)`  | ⚠️ R droppt — same V-1 family                                 |
| 22  | `Frame align center`   | center / center         | (default) / flex-start  | `center:true` | 🔴 V-1 Family — `align center` same as `center` aber R droppt |
| 28  | `Frame top, left`      | flex-start / flex-start | flex-start / flex-start | `(no props)`  | 🟡 Individuelle Keywords funktionieren in R, FW lost          |
| 29  | `Frame cen` (Alias)    | center / center         | center / center         | `center:true` | ✅ Alias-Lock für center                                      |

### E — Stacked + 9-Zone

| #   | Eingabe                 | DOM                                              | React         | FW            | Verdikt                                            |
| --- | ----------------------- | ------------------------------------------------ | ------------- | ------------- | -------------------------------------------------- |
| 24  | `Frame stacked, center` | flex + center + position:relative + abs-children | flex + center | `center:true` | 🟡 V-5 — `stacked` und `center` doppelt wirksam    |
| 25  | `Frame stacked, tl`     | flex + tl + position:relative + abs-children     | (default)     | `(no props)`  | 🔴 V-5 + V-1 — R droppt tl auch im stacked-Kontext |

## Befunde

**🔴 V-1 (CRITICAL) — React-Backend droppt 9-zone Aliase komplett.** `compiler/backends/react.ts:548-616` hat Cases für `center`, `cen`, `spread`, `wrap`, `scroll`, `hidden`, plus individuelle `top`/`bottom`/`left`/`right`. **NICHT vorhanden:** alle 9 Aliase (`tl`/`tc`/`tr`/`cl`/`cr`/`bl`/`bc`/`br`) plus die 9 Long-Forms (`top-left`, `top-center`, …, `bottom-right`). Effekt: 16 von 18 Position-Keywords sind in React komplett wirkungslos. DOM rendert korrekt (über `NINE_ZONE` lookup im IR-Layout-Transformer), React rendert `align-items: flex-start` (FLEX_DEFAULTS) — visueller Bruch zwischen Studio (DOM) und Export (React). Cross-Slice-Bezug: Slice 3 X-1 hatte das schon flagged.

**🔴 V-2 (CRITICAL) — Framework-Backend reverse-mapper verliert 9-zone Information.** `compiler/backends/framework.ts:375-396` macht Single-Style → Single-Mirror-Property mapping (`justify-content:center` → `center`, `align-items:center` → `center`). Es kennt KEINEN Mapping für `flex-start`/`flex-end` und kann **Kombinationen** nicht auf 9-zone Aliase zurückmappen (`justify:flex-end + items:center` ≠ `bc`). Effekt: 8 von 9 Aliase verlieren Position-Info komplett (4 → `(no props)`, 4 → `center:true` collapsed). Designer schreibt `Frame br` im Studio, Mirror→Framework-Export emittiert nichts → User-sichtbare Layout-Bug nach Export.

**🔴 V-3 (CRITICAL) — `Frame grid 12, center` cross-backend disaster.** Drei Backends, drei verschiedene Verhalten:

- DOM: `display: grid` (center komplett gedroppt)
- React: `display: flex, justify:center, align:center` (grid komplett gedroppt)
- Framework: `grid: 12` (center komplett gedroppt)

Validator gibt KEIN Warning. Cross-Backend Equivalenz bricht spektakulär. Wahrscheinlich Slice 6 (Grid) Territorium für vollständigen Fix, aber zumindest Validator-Warning sinnvoll im Slice-4-Scope.

**🟠 V-4 — `Frame center, w 200, h 100` (Probe #15) DOM dropt `align-self:stretch`.** Wenn explizite Width/Height gesetzt sind, dropt DOM das `align-self:stretch` (sinnvoll, weil width vs stretch konfligieren). React behält stretch + width ZUSAMMEN — Cross-Backend Asymmetrie. Slice-1-style stretch-vs-width policy.

**🟡 V-5 — `Frame stacked, X`** emittiert beide Layout-Modi gleichzeitig (Cross-Slice-Familie aus Slice 3 V-3). Out of Slice 4 scope, dort schon dokumentiert.

**🟡 V-6 — `Frame top, left` (Probe #28) funktioniert in DOM/React, nicht Framework.** Asymmetrie zur 9-zone-Familie — Framework droppt sie.

## Verdikt pro Dimension

| #   | Dimension               | Bewertung                                                                                                                                                                                                                                 |
| --- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Architektur             | 🔴 React-Backend implementiert Layout-Mapping eigenständig statt IR zu konsumieren — duplizierte Logic, ohne `NINE_ZONE` Single-Source-of-Truth-Lookup. Framework reverse-mapper ist ad-hoc string-matching, kein Schema-derived Inverse. |
| 2   | Codequalität            | 🟠 16 Cases müssten in React-Backend ergänzt werden. Cleaner Pfad: schema-derived Lookup in `NINE_ZONE`.                                                                                                                                  |
| 3   | Testqualität            | 🟡 Bestehende Tests treffen 9-Zone partiell (DOM-fokussiert); kein Cross-Backend-Differential für 9-zone alias-set                                                                                                                        |
| 4   | Testabdeckung           | 🔴 V-1 (16 Aliase) ist nirgends in tests/ gelocked; V-2 (Framework-loss) ungetestet; V-3 (grid+center) ungetestet                                                                                                                         |
| 5   | Funktionale Korrektheit | 🔴 16 von 18 Aliase produzieren visuell falsches React-Output; 8 von 9 Aliase produzieren leeres oder collapsed Framework-Output. Cross-Backend gebrochen.                                                                                |
| 6   | Studio-Roundtrip        | ✅ Studio nutzt DOM-Backend; 9-zone funktioniert im Preview. Bruch passiert NUR beim Mirror-Export (React/Framework).                                                                                                                     |

---

# 2. Entscheidungen

**V-1 (Critical):** React-Backend lookup-driven machen. Statt 16 case-Statements einen einzelnen `nineZoneLookup(name)` der gegen `NINE_ZONE` aus `compiler/schema/layout-defaults.ts` matcht und `{ justify, align }` zurückliefert. Direction-aware Mapping: in `column` (default) → `justify` = vertikal, `align` = horizontal; in `row` (`hor`) → `justify` = horizontal, `align` = vertikal — dieselbe Logik wie der IR-Layout-Transformer. Cross-Slice-Wirkung: betrifft Slice 5 (`ver-center`/`hor-center`), die wir hier NICHT mit-fixen (Slice-Grenze) aber den Lookup-Pfad bereitstellen.

**V-2 (Critical):** Framework reverse-mapper auf einen 2-Pass-Walker upgraden:

1. Pass 1: Sammle alle alignment-relevanten CSS-Properties (`justify-content`, `align-items`, `flex-direction`).
2. Pass 2: Wenn die Kombination ein 9-zone-Pattern ist (z. B. `justify:flex-end + items:center` in column → `bc`), emittiere den Alias. Ansonsten Fallback auf einzeln (`top`/`bottom`/`left`/`right`).

Schema-derived: nutze `NINE_ZONE`-Inverse als Lookup-Table, automatisch generiert.

**V-3 (Critical):** Validator-Error `E115 LAYOUT_MODE_CONFLICT` für `grid + center`/`grid + 9-zone-aliase`. Begründung: Grid hat seine eigene Alignment-Property (`justify-items`/`align-items`/`place-items`), und das Mischen mit Flex-Alignment ist semantisch undefiniert. Cross-Backend-Disaster ist Symptom — Root-Cause ist nicht-orthogonale DSL. Error blockt Build (Slice 1 B.7).

**V-4 (Defer):** `align-self:stretch + explicit width` Asymmetrie zwischen DOM/React. Out of Slice 4 scope (Sizing-Slice 11 Territorium). Dokumentieren als Cross-Slice-Follow-up.

**V-5 (Out of Scope):** stacked + 9-zone — Slice 3 V-3 trackt es schon.

**V-6 (Defer):** `top`/`bottom`/`left`/`right` standalone in Framework — Slice 5 (center/spread/ver-center/hor-center) Territorium, dort wird die ganze einzeln-axis-alignment-Familie aufgeräumt.

---

# 3. Umsetzungsplan & Status

## Phase A — React 9-zone lookup (V-1)

| ID  | Sub-Task                                                                                                                                                               | Aufwand | Status   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------- |
| A.1 | `nineZoneToFlex(name, direction)` + `resolveNineZoneAlias` + `nineZoneToSemantic` in `compiler/schema/layout-defaults.ts:165-258` (schema-side single-source-of-truth) | M       | erledigt |
| A.2 | React-Backend ruft `nineZoneToFlex` aus beiden Loop-Branches auf (flag-only + boolean-value); 18 Aliase via einer Lookup-Zeile statt 16 case-Statements                | M       | erledigt |
| A.3 | Direction-Awareness via Pre-Scan: `layoutDirection` einmal aus `properties` ermittelt, dann an `nineZoneToFlex` durchgereicht                                          | M       | erledigt |

## Phase B — Framework reverse-map (V-2)

| ID  | Sub-Task                                                                                                                              | Aufwand | Status   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------- |
| B.1 | `flexToNineZone(justify, align, direction)` Inverse-Lookup in `layout-defaults.ts` — direction-aware semantic round-trip              | S       | erledigt |
| B.2 | Framework-Backend `stylesToProps` 2-Pass-Walker: pre-detect 9-zone-Kombination, consume `justify-content` + `align-items`, emit Alias | M       | erledigt |
| B.3 | Direction-Inverse: `flex-direction: row` flippt die Achsen-Interpretation; cross-direction round-trip in RT-12 gelocked               | M       | erledigt |

## Phase C — Validator E115 (V-3)

| ID  | Sub-Task                                                                                          | Aufwand | Status   |
| --- | ------------------------------------------------------------------------------------------------- | ------- | -------- |
| C.1 | `E115 LAYOUT_MODE_CONFLICT` in `compiler/validator/types.ts:118`                                  | XS      | erledigt |
| C.2 | Validator `checkLayoutConflicts`: `grid + center`/`grid + 9-zone` → E115 (validator.ts:1219-1234) | S       | erledigt |
| C.3 | Build-CLI Re-Lock: E115 → exit 1 (Slice 1 B.7-Pfad, gelockt durch RT-9)                           | XS      | erledigt |

## Phase D — RT Suite

| ID  | Sub-Task                                                                                                 | Aufwand | Status   |
| --- | -------------------------------------------------------------------------------------------------------- | ------- | -------- |
| D.1 | `tests/compiler/slice-4-9-positions.test.ts` — 13 RT-Gruppen, 63 Sub-Tests, alle drei Backends abgedeckt | M       | erledigt |

## Phase E — Quality-Gate-Pass (Step 7+8)

| ID  | Sub-Task                                                                                                   | Status                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| E.1 | Probe-Tabelle gegen Post-Fix-Stand re-verifizieren                                                         | erledigt — alle 30 Probes neu durchgelaufen, V-1/V-2/V-3 grün, V-4/V-5/V-6 als deferred dokumentiert |
| E.2 | Schema-Drift-Grep — wirken `NINE_ZONE`-Werte konsistent in allen drei Backends?                            | erledigt — `nineZoneToFlex`/`flexToNineZone` round-trip in RT-12 für column UND row                  |
| E.3 | Cross-Slice-Probe — Slice 5 (`ver-center`/`hor-center`) greift den Lookup nicht — bleibt für Slice 5 offen | erledigt (Out-of-Scope, dokumentiert)                                                                |
| E.4 | Quality-Gate honest-pass: Probe-Tabelle ehrlich, 13 RTs grün, Vitest gesamt grün                           | erledigt — 63 RT-Subtests + Slice-1/2/3 weiterhin grün                                               |

---

# 4. Tests

## Neue RT-Tests (in `tests/compiler/slice-4-9positions.test.ts`)

| ID    | Test                                                                                    | Phase      | Status  |
| ----- | --------------------------------------------------------------------------------------- | ---------- | ------- |
| RT-1  | React: alle 9 Aliase (`tl`..`br`) emittieren korrekte justify+align Kombination         | A          | pending |
| RT-2  | React: Long-Forms (`top-left`..`bottom-right`) ≡ kurz-form Output                       | A          | pending |
| RT-3  | React direction-aware: `Frame hor, cr` → `justifyContent:flex-end, alignItems:center`   | A          | pending |
| RT-4  | Framework: 9-zone Aliase als `tl: true`/`tc: true`/etc. preserved (keine Collapse)      | B          | pending |
| RT-5  | Framework direction-aware: `Frame hor, cr` re-emittiert `cr: true`, NICHT `center:true` | B          | pending |
| RT-6  | Cross-Backend Differential: `Frame tc` DOM ≡ React für alle 9 Aliase                    | A+B        | pending |
| RT-7  | Validator E115 für `Frame grid 12, center`                                              | C          | pending |
| RT-8  | Validator E115 für `Frame grid 12, tl`                                                  | C          | pending |
| RT-9  | Build-CLI exit 1 bei E115                                                               | C          | pending |
| RT-10 | E110 weiterhin für `Frame tl, br` (regression)                                          | regression | pending |
| RT-11 | Alias `cen` ≡ `center` (regression)                                                     | regression | pending |
| RT-12 | `align top left` ≡ `tl` (long-syntax compatibility, all 3 backends)                     | A+B        | pending |
| RT-13 | Schema-Drift-Lock: `NINE_ZONE` Map-Konsistenz mit React-Lookup-Output                   | E          | pending |

**Test-Zielmenge:** ≥ 30 Sub-Tests, alle drei Backends abgedeckt.
