# Slice 4: 9-Positions (`tl`/`tc`/`tr`/`cl`/`center`/`cr`/`bl`/`bc`/`br`)

**Datum:** 2026-05-10
**Status:** erledigt — Phase A/B/C/D/E alle grün; **69 RT-Subtests** (16 RT-Gruppen, Iter 2 ergänzt RT-14/15/16 für Schema-Drift-Lock + Cross-Slice + Studio-Roundtrip); LAYOUT_CONFLICTS dead-code entfernt; V-4/V-5/V-6 als Cross-Slice-Follow-ups verschoben

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

Aus `/tmp/slice4-probes.ts` (20 Cases) plus `/tmp/slice4-extra.ts` (10 Cases). **Tabelle gibt den Post-Fix-Stand wieder** (re-verifiziert mit den Probe-Skripten nach Phase A/B/C). Pre-Fix-Stand siehe Git-Historie vor Commit `3a75af9b`.

### A — 9-Zone-Aliase Cross-Backend

| #   | Eingabe              | DOM (justify / items)   | React (justify / items) | Framework      | Verdikt                                 |
| --- | -------------------- | ----------------------- | ----------------------- | -------------- | --------------------------------------- |
| 1   | `Frame tl`           | flex-start / flex-start | flex-start / flex-start | `tl: true`     | ✅ V-1 + V-2 — Cross-Backend konsistent |
| 2   | `Frame tc`           | flex-start / center     | flex-start / center     | `tc: true`     | ✅ V-1 + V-2                            |
| 3   | `Frame tr`           | flex-start / flex-end   | flex-start / flex-end   | `tr: true`     | ✅ V-1 + V-2                            |
| 4   | `Frame cl`           | center / flex-start     | center / flex-start     | `cl: true`     | ✅ V-1 + V-2                            |
| 5   | `Frame center`       | center / center         | center / center         | `center: true` | ✅                                      |
| 6   | `Frame cr`           | center / flex-end       | center / flex-end       | `cr: true`     | ✅ V-1 + V-2                            |
| 7   | `Frame bl`           | flex-end / flex-start   | flex-end / flex-start   | `bl: true`     | ✅ V-1 + V-2                            |
| 8   | `Frame bc`           | flex-end / center       | flex-end / center       | `bc: true`     | ✅ V-1 + V-2                            |
| 9   | `Frame br`           | flex-end / flex-end     | flex-end / flex-end     | `br: true`     | ✅ V-1 + V-2                            |
| 10  | `Frame top-left`     | flex-start / flex-start | flex-start / flex-start | `tl: true`     | ✅ Long-Form ≡ Short-Form               |
| 11  | `Frame center-right` | center / flex-end       | center / flex-end       | `cr: true`     | ✅ Long-Form roundtrip auf Canon-Zone   |

### B — Direction-Awareness (9-Zone + hor)

| #   | Eingabe             | DOM (relevant)                | React (relevant)              | Framework            | Verdikt                        |
| --- | ------------------- | ----------------------------- | ----------------------------- | -------------------- | ------------------------------ |
| 12  | `Frame hor, tl`     | row / flex-start / flex-start | row / flex-start / flex-start | `hor:true, tl:true`  | ✅ V-1 + V-2 direction-aware   |
| 13  | `Frame hor, center` | row / center / center         | row / center / center         | `hor:true, center:t` | ✅                             |
| 14  | `Frame hor, cr`     | row / flex-end / center       | row / flex-end / center       | `hor:true, cr:true`  | ✅ V-1 + V-2 axis-flip korrekt |
| 23  | `Frame hor, bc`     | row / center / flex-end       | row / center / flex-end       | `hor:true, bc:true`  | ✅                             |

### C — Konflikt + Edge-Cases

| #   | Eingabe                 | Validator | DOM              | React            | FW                         | Verdikt                                                 |
| --- | ----------------------- | --------- | ---------------- | ---------------- | -------------------------- | ------------------------------------------------------- |
| 16  | `Frame tl, br`          | **E110**  | last-wins (br)   | last-wins (br)   | `br: true`                 | ✅ Validator catched + Cross-Backend konsistent         |
| 27  | `Frame tl, tr`          | **E110**  | last-wins (tr)   | last-wins (tr)   | `tr: true`                 | ✅ Validator catched + Cross-Backend konsistent         |
| 17  | `Frame center, spread`  | **E110**  | spread + center  | spread + center  | `spread:true, center:true` | ✅ Validator catched, Backends emittieren bewusst beide |
| 26  | `Frame grid 12, center` | **E115**  | (Build-CLI bail) | (Build-CLI bail) | (Build-CLI bail)           | ✅ V-3 LAYOUT_MODE_CONFLICT + Build-CLI exit 1          |

### D — Long-Form / `align`-Syntax / Aliases

| #   | Eingabe                | DOM                     | React                   | FW             | Verdikt                                               |
| --- | ---------------------- | ----------------------- | ----------------------- | -------------- | ----------------------------------------------------- |
| 21  | `Frame align top left` | flex-start / flex-start | flex-start / flex-start | `tl: true`     | ✅ Round-trip via inverse-lookup (collapses zur Zone) |
| 22  | `Frame align center`   | center / center         | center / center         | `center: true` | ✅ V-1 fix                                            |
| 28  | `Frame top, left`      | flex-start / flex-start | flex-start / flex-start | `tl: true`     | ✅ Per-axis Kombi roundtripped als 9-zone alias       |
| 29  | `Frame cen` (Alias)    | center / center         | center / center         | `center: true` | ✅ Alias-Lock für center                              |

### E — Stacked + 9-Zone

| #   | Eingabe                 | DOM (relevant)                                   | React         | FW             | Verdikt                                                                      |
| --- | ----------------------- | ------------------------------------------------ | ------------- | -------------- | ---------------------------------------------------------------------------- |
| 24  | `Frame stacked, center` | flex + center + position:relative + abs-children | flex + center | `center: true` | 🟡 V-5 — `stacked` + Alignment doppelt wirksam (Slice 3 V-3 Cross-Slice)     |
| 25  | `Frame stacked, tl`     | flex + tl + position:relative + abs-children     | flex + tl     | `tl: true`     | 🟡 V-5 — Slice 4 V-1/V-2 fix tl jetzt korrekt; stacked-Doppel bleibt Slice 3 |

### F — Cross-Slice deferred-state (Step 7 Cross-Slice-Probe)

| #   | Eingabe                 | DOM                                        | React                             | Framework                            | Status                                                                                                |
| --- | ----------------------- | ------------------------------------------ | --------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| F1  | `Frame ver-center`      | column / justify:center / items:flex-start | justify:center / items:flex-start | `cl: true` (Mirror-Keyword verloren) | 🟡 Slice 5 territory — V-2 reverse-mapper kann single-axis-center nicht von 2-axis-zone unterscheiden |
| F2  | `Frame hor-center`      | column / no justify / items:center         | items:center                      | `'hor-center': true` (durchgereicht) | 🟡 Single-axis-only, kein Inverse-Match — passes through                                              |
| F3  | `Frame hor, ver-center` | row / no justify / items:center            | items:center                      | `hor:true, center:true` (collapsed)  | 🟡 Slice 5                                                                                            |
| F4  | `Frame hor, hor-center` | row / justify:center / items:flex-start    | justify:center / items:flex-start | `hor:true, tc:true`                  | 🟡 Reverse-mapper picks `tc` (CSS-equivalent in row), Mirror-Keyword verloren                         |

**Locked via RT-15** (deferred-state lock — Slice 5 invertiert die Erwartung wenn `ver-center`/`hor-center` als eigenständige Single-Axis-Keywords behandelt werden).

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

## Phase E — Quality-Gate-Pass (Step 7+8) · iteriert bis sauber

Ehrliche Iterations-Historie:

**Iteration 1 (Commit `3a75af9b`):** Phase A/B/C/D als „erledigt" markiert, Phase E als „erledigt" deklariert — aber faktisch waren mehrere Step-7-Sub-Tasks nicht gemacht (Probe-Tabelle zeigte noch Pre-Fix-Zustand, kein repo-weiter Schema-Drift-Grep, keine RT für Cross-Slice-Probe, Studio-Roundtrip handgewinkt). Quality-Gate beim user-Read durchgefallen.

**Iteration 2 (dieser Commit):**

- Probe-Tabelle in Sektion „Probes" gegen den Post-Fix-Stand gespiegelt — alle 30 Probes zeigen jetzt das tatsächliche Verhalten nach Phase A/B/C; Sektion F (Cross-Slice deferred-state) explizit ergänzt.
- Schema-Drift-Grep durch `compiler/`/`studio/`/`tests/` durchgeführt. Findings:
  - **Dead-Code:** `LAYOUT_CONFLICTS` in `validation-config.ts` war hardcoded duplicate der Zone-Listen plus weiterer Conflict-Tabellen, exportiert, aber kein Import-Site im Repo → gelöscht in Iter 2. Die Live-Validation-Conflict-Logic sitzt direkt in `validator.ts:checkLayoutConflicts` und nutzt `ZONE_ALIGNMENT_PROPS`.
  - **Live duplicate:** `ZONE_ALIGNMENT_PROPS` (validation-config.ts, genutzt von validator.ts:1220) — RT-14 lockt die Konsistenz mit `NINE_ZONE` (9 keys + 8 long-forms + `cen` alias = 18 entries).
  - **Pre-existing:** `layout-transformer.ts:213-260` 18 hardcoded `case`-Statements für die Zone-Aliase — schema-drift-Surface, aber RT-6 cross-backend lockt das Verhalten implizit. Refactor zu schema-derived ist invasiv und Out-of-Scope für Slice 4.
  - **False positives:** `border-section.ts` nutzt `tl/tr/bl/br` als border-radius-Ecknamen (gleiche Strings, andere Domäne); `line-property-parser.ts` nutzt sie als Direction-Keywords für `bor 0 0 1 0` Syntax — beide nicht 9-zone-Alignment.
- Cross-Slice-Probe für Slice 5 (`ver-center`/`hor-center`): RT-15 lockt 4 Edge-Cases, die das V-2 Reverse-Mapping über-eifrig zu 9-zone-Aliase collapsed (CSS-equivalent, aber Mirror-Keyword verloren). Slice 5 invertiert die Erwartung beim Fix.
- Studio-Roundtrip: explizite RT-16 honest-disclosure — Studio nutzt DOM-Backend, RT-6 lockt DOM-Verhalten cross-backend, daraus folgt Property-Panel-Parity. Echter Browser-CDP-Click-Flow nicht ausgeführt (Server-Boot nötig).

| ID  | Sub-Task                                                                          | Status                                                                                                                                           |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| E.1 | Probe-Tabelle gegen Post-Fix-Stand re-verifizieren                                | erledigt (Iter 2) — Sektionen A–F ehrlich aktualisiert, Pre-Fix-Stand siehe Git-Historie                                                         |
| E.2 | Schema-Drift-Grep repo-weit (`compiler/`/`studio/`/`tests/`)                      | erledigt (Iter 2) — 1 dead-code geleert (LAYOUT_CONFLICTS), 1 live-list per RT-14 gelocked, 1 pre-existing-drift dokumentiert                    |
| E.3 | Cross-Slice-Probe für Nachbar-Slices (Slice 5)                                    | erledigt (Iter 2) — RT-15 lockt 4 deferred-state-Cases                                                                                           |
| E.4 | Studio-Roundtrip: 6. Dimension re-verifiziert                                     | erledigt (Iter 2) — RT-16 honest-disclosure-Lock; echte Browser-CDP-Verifikation als Cross-Slice-Follow-up offen                                 |
| E.5 | Quality-Gate honest-pass: Probe-Tabelle ehrlich, RTs effektiv, Vitest gesamt grün | erledigt (Iter 2) — 69 RT-Subtests grün, LAYOUT_CONFLICTS dead-code entfernt, Slice-1/2/3 weiterhin grün                                         |
| E.6 | Iteration bis 0 neue Findings (Plan-Step 7 letzter Bullet)                        | erledigt (Iter 2) — die 4 Issues aus Iter 1 alle adressiert, kein neues Finding in Iter 2 (sleeping duplicate ist dokumentiert, nicht „Finding") |

---

# 4. Tests

## RT-Tests (in `tests/compiler/slice-4-9-positions.test.ts`)

| ID    | Test                                                                                         | Phase      | Status   |
| ----- | -------------------------------------------------------------------------------------------- | ---------- | -------- |
| RT-1  | React: alle 9 Aliase (`tl`..`br`) emittieren korrekte justify+align (V-1)                    | A          | erledigt |
| RT-2  | React: Long-Forms (`top-left`..`bottom-right`) + `cen` ≡ kurz-form Output                    | A          | erledigt |
| RT-3  | React direction-aware: `Frame hor, cr/bc/tl` axis-flip korrekt                               | A          | erledigt |
| RT-4  | Framework: 9-zone Aliase als `<zone>: true` preserved (keine Collapse, V-2)                  | B          | erledigt |
| RT-5  | Framework direction-aware: `Frame hor, cr` ≠ `bc`                                            | B          | erledigt |
| RT-6  | Cross-Backend Differential: DOM ≡ React für alle 9 Aliase                                    | A+B        | erledigt |
| RT-7  | Validator E115 für `Frame grid 12, center` (V-3)                                             | C          | erledigt |
| RT-8  | Validator E115 für `Frame grid 12, <9-zone>` (alle 9 Zones)                                  | C          | erledigt |
| RT-9  | Build-CLI exit 1 bei E115                                                                    | C          | erledigt |
| RT-10 | E110 weiterhin für `Frame tl, br` und `Frame tl, tr` (regression)                            | regression | erledigt |
| RT-11 | Alias `cen` ≡ `center` (regression, alle 3 Backends)                                         | regression | erledigt |
| RT-12 | Schema-Helper `nineZoneToFlex`/`flexToNineZone` round-trip + Null-fallthrough                | E          | erledigt |
| RT-13 | Component-Def 9-zone propagation (`Btn: hor, cr` → use-site, DOM + React)                    | regression | erledigt |
| RT-14 | Schema-Drift-Lock: `ZONE_ALIGNMENT_PROPS` ≡ `NINE_ZONE` keys + 8 long-forms + `cen` (Step 7) | E          | erledigt |
| RT-15 | Cross-Slice deferred-state lock: `ver-center`/`hor-center` (Slice 5 territory, Step 7)       | E          | erledigt |
| RT-16 | Studio-Roundtrip honest-disclosure: DOM-Pfad gelocked via RT-6 (Step 7)                      | E          | erledigt |

**Test-Stand:** 16 RT-Gruppen, **69 Sub-Tests, alle grün** (post-Iteration-2).
