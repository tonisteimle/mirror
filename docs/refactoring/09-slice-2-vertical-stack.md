# 09 — Slice 2: Vertical Stack (`gap N`)

**Datum:** 2026-05-09
**Status:** Phase 1 (V-1..V-4) erledigt · **Phase 2 (V-5..V-9) offen** — zweiter Probe-Pass deckt fünf zusätzliche Cross-Backend-Bugs auf (gap-x/gap-y in React+Framework, Chain in React, Shorthand)

> **Honest update (Phase 2 audit, 2026-05-09):** Eine zweite Probe-Reihe gegen
> den committed Stand (Phase 1, `67f108f2`) hat fünf weitere Cross-Backend-Bugs
> aufgedeckt, die im ersten Pass nicht waren — siehe Sektion **5 — Phase 2 Findings**.
> Quality-Gate (Step 8): Slice 2 ist nicht „fertig" bis V-5..V-9 zu sind.

## Inhalt

1. [Audit (Zusammenfassung)](#1-audit-zusammenfassung)
2. [Entscheidungen](#2-entscheidungen)
3. [Umsetzungsplan & Status](#3-umsetzungsplan--status)
4. [Tests](#4-tests)
5. [Phase 2 Findings (gap-x/gap-y + Chain + Shorthand)](#5-phase-2-findings)

---

# 1. Audit (Zusammenfassung)

## Scope

`gap N` zwischen Kindern eines Frame (vertikal default, mit `hor` auch horizontal). Aliases `g`. Property-Schema: `numeric → gap: ${n}px`, `token: true`.

**DSL-Versprechen** (CLAUDE.md / `compiler/schema/property-schema.ts:295`):

- `Frame gap 12` → CSS `gap: 12px` zwischen direkten Kindern
- Alias `g`: `Frame g 8` ≡ `Frame gap 8`
- Token-Suffix-Mapping: `Frame gap $sp` mit `sp.gap: 12` → `gap: 12px` über CSS-Variable
- Kombiniert mit `hor` / `grid` / `stacked` / `wrap`
- Auch `gap-x` / `gap-y` (column-gap / row-gap) — separater Probe-Lauf

## Probes

Aus `/tmp/gap-probes.ts` (15 Fälle, alle drei Backends + Validator).

**Tabelle gibt den Post-Fix-Stand wieder** (re-verifiziert mit `/tmp/gap-probes.ts`). Pre-Fix-Stand siehe Git-Log.

| #   | Eingabe                             | DOM             | React               | Framework         | Validator | Verdikt                                                                                         |
| --- | ----------------------------------- | --------------- | ------------------- | ----------------- | --------- | ----------------------------------------------------------------------------------------------- |
| 1   | `Frame gap 12`                      | `'12px'`        | `'12px'`            | `12`              | ok        | ✅ V-1: Cross-Backend px-Einheit, alle drei korrekt                                             |
| 2   | `Frame gap 0`                       | `'0px'`         | `'0px'`             | `0`               | ok        | ✅ V-1                                                                                          |
| 3   | `Frame g 8` (Alias)                 | `'8px'`         | `'8px'`             | `8`               | ok        | ✅ V-1 + Alias                                                                                  |
| 4   | `Frame gap` (kein Wert)             | leer            | leer                | leer              | **E101**  | ✅ Validator catched                                                                            |
| 5   | `Frame gap "12"` (string)           | `'12px'`        | `'12px'`            | `12`              | ok        | ✅ V-1                                                                                          |
| 6   | `Frame gap -4` (negativ)            | `'-4px'`        | `'-4px'`            | `-4`              | **E105**  | ✅ Validator E105, Build-CLI exit 1 (Slice 1 B.7); direkter Backend-Aufruf emittiert (Test-API) |
| 7   | `sp.gap: 12; Frame gap $sp` (Token) | `var(--sp-gap)` | `'12px'` (resolved) | `'var(--sp-gap)'` | ok        | ✅ V-2 + V-3 — DOM via CSS-Var, React resolved direkt, Framework keeps full var                 |
| 8   | `Frame gap 12.5` (Decimal)          | `'12.5px'`      | `'12.5px'`          | `12` (parseInt)   | ok        | ✅ V-4 — DOM/React mit decimal+px; Framework reduziert auf int (M-runtime kompatibel)           |
| 9   | `Frame gap 9999`                    | `'9999px'`      | `'9999px'`          | `9999`            | ok        | ✅ V-1                                                                                          |
| 10  | `Frame gap 8` (no children)         | `'8px'`         | `'8px'`             | `8`               | ok        | ⚠️ Kein Warn — Follow-up (Slice 2 V-5, verschoben)                                              |
| 11  | `Frame hor, gap 8`                  | `'8px'`         | `'8px'`             | `8`               | ok        | ✅ V-1                                                                                          |
| 12  | `Frame grid 12, gap 8`              | `'8px'`         | `'8px'`             | `8`               | ok        | ✅ V-1                                                                                          |
| 13  | `Btn: gap 8` + `Btn "X"`            | `'8px'`         | `'8px'`             | `8`               | ok        | ✅ V-1 — Component-Def-gap fliesst durch                                                        |
| 14  | `Frame gap 8, gap 16` (duplicate)   | `'16px'`        | `'16px'`            | `16`              | **W110**  | ✅ Last-wins + Warn                                                                             |
| 15  | `Frame gap "12px"` (px im String)   | `'12px'`        | `'12px'`            | `12`              | **E101**  | ✅ Validator E101 + Build-CLI exit 1; Backends rendern korrekt durch Zufall                     |

**Befunde (priorisiert):**

1. **🔴 CRITICAL — React-Backend emittiert numerische Werte OHNE `px`-Einheit.** Pattern `typeof value === 'number'` in `generateStyles` matcht nie, weil der Parser Strings liefert (`"12"` ≠ `12`). Betroffen: `gap`, `pad`, `mar`, `w`, `h`, `minw/maxw/minh/maxh`, `bor`, `rad`, `fs` — also praktisch ALLE numerischen CSS-Properties. `gap: '12'` ist invalides CSS, der Browser ignoriert es. **Slice 2 macht das sichtbar, aber der Bug betrifft Slice 9 (Padding), 10 (Margin), 11 (Sizing), 15 (Border), 16 (Radius), 17 (Typografie) genauso** — Cross-Slice-Lehre aus Step 7.
2. **🔴 CRITICAL — Token-Resolution in React emittiert `$sp` literal.** Property-Schema sagt `token: true`, aber React-Backend's `resolve()` liefert `'$sp'` zurück wenn das Token nicht in `tokenMap` aufgelöst werden kann. Suffix-Mapping (`gap $sp` → `sp.gap`) ist im DOM-Backend (via IR) implementiert, im React-Backend nicht.
3. **🔴 CRITICAL — Framework-`parsePxValue` schneidet `var(--sp-gap)` ab.** `parseInt('var(--sp-gap)') = NaN`, dann fällt zurück auf `value`, aber `value.endsWith('px')` ist false → returnt `value` unmodifiziert. Heisst: Framework emittiert die volle CSS-Var. Aber das Quote-Stripping irgendwo schneidet die schliessende Klammer ab — Bug.
4. **🟠 DOM verliert `px` für Decimals.** `parseInt("12.5", 10) = 12`, aber dann wird `${value}px` mit dem ursprünglichen String gebaut — `'12.5'` → `'12.5px'`? Nein, Probe #8 zeigt `'12.5'` ohne `px`. Bug im IR-Transformer oder im Schema-css-Mapper.
5. **🟡 Probe #6 + #15: Validator-Errors aber Backends emittieren.** Slice 1 B.7 fixed das auf CLI-Ebene; `generateDOM(ast)` direkt umgeht den Validator. Akzeptabel — direkte Backend-Aufrufe sind Test-API, der CLI ist die User-Surface.
6. **⚠️ Follow-up: gap ohne Kinder.** Kein Warn. Niedrige Prio.

## Verdikt pro Dimension

| #   | Dimension               | Bewertung                                                                                                                                                                                                              |
| --- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Architektur             | ⚠️ React-Backend bypassed die IR — eigenständige `generateStyles`-Implementierung mit gleichen Schema-Werten dupliziert. Lange Sicht: React über IR generieren (zieht in Slice 2 Scope nicht rein, aber dokumentieren) |
| 2   | Codequalität            | ⚠️ 13× wiederholtes `typeof value === 'number' ? \`${value}px\` : value` Pattern in React. Helper fehlt.                                                                                                               |
| 3   | Testqualität            | ⚠️ Vorhandene Slice-2-relevante Tests existieren in `tests/compiler/`, aber kein dediziertes `gap.test.ts` oder Cross-Backend-Differential für gap                                                                     |
| 4   | Testabdeckung           | 🔴 React-px-Bug ist nirgends gelocked — Tests asserten nicht den korrekten px-Output von React                                                                                                                         |
| 5   | Funktionale Korrektheit | 🔴 React-Backend produziert visuell broken UI (CSS `gap: 12` wird vom Browser verworfen)                                                                                                                               |
| 6   | Studio-Roundtrip        | n/a — Studio nutzt DOM-Backend; betrifft nur Export-Pfad                                                                                                                                                               |

---

# 2. Entscheidungen

**V-1 (Critical):** `pxify()` Helper im React-Backend einführen, der sowohl `number` als auch numerische Strings (`/^-?\d+(\.\d+)?$/`) als Pixel-Wert behandelt. Auf alle 13 Stellen anwenden. Eigenes Slice 2 V-1 — der Effekt geht aber bis Slice 17.

**V-2 (Critical):** Token-Suffix-Mapping in React-Backend implementieren — `gap $sp` muss `sp.gap` nachschlagen, nicht stumpf nach `sp` suchen. Property-Schema hat das `token: true`-Flag und Suffix-Mapping ist im IR via `compiler/schema/token-suffixes.ts` codiert; React muss diesen Pfad mitnutzen.

**V-3:** `parsePxValue` im Framework-Backend reparieren so dass es CSS-Vars korrekt durchreicht (frühen Return wenn `value.startsWith('var(')`).

**V-4:** DOM-Decimal-Px-Bug fixen — `12.5` → `12.5px`.

**V-5 (Follow-up):** Warn `W113 GAP_WITHOUT_CHILDREN` für `Frame gap N` ohne Children. Niedrige Prio.

**V-6 (Cross-Slice-Probe aus Step 7):** Wenn V-1 implementiert ist, sofort gegen Nachbar-Slices probieren (Padding/Margin/Sizing/Border/Radius/FontSize) — die alle dasselbe Pattern haben.

---

# 3. Umsetzungsplan & Status

## Phase A — React-Backend px-Bug (V-1, V-6)

| ID  | Sub-Task                                                                                                                     | Aufwand | Status                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------- |
| A.1 | `pxify(value)` Helper in `react.ts` — handhabt `number` UND numerische Strings                                               | S       | erledigt                                       |
| A.2 | 13 Call-Sites in `generateStyles` auf `pxify` umstellen (gap/g, pad/p, mar/margin/m, w/h, minw/maxw/minh/maxh, bor, rad, fs) | S       | erledigt                                       |
| A.3 | RT-1 + RT-7 (Cross-Slice-Probe): jede betroffene Property hat React-Output mit px-Einheit                                    | M       | erledigt — 11 Properties durchgetestet in RT-7 |
| A.4 | Differential-Test (RT-5): DOM/React/Framework emittieren äquivalente gap-Werte                                               | M       | erledigt                                       |

## Phase B — Token-Resolution in React (V-2)

| ID  | Sub-Task                                                                                   | Aufwand | Status                                                                                              |
| --- | ------------------------------------------------------------------------------------------ | ------- | --------------------------------------------------------------------------------------------------- |
| B.1 | Token-Suffix-Mapping aus `compiler/schema/token-suffixes.ts` in React-Backend hineinziehen | M       | erledigt — `lookupWithSuffix(cleanName, propertyName)` Helper, `resolve()` propagiert Property-Name |
| B.2 | RT-2: `Frame gap $sp` mit `sp.gap: 12` resolved in React-Output                            | S       | erledigt — drei Sub-Tests inkl. Multi-Suffix und Fallback                                           |

## Phase C — Framework-Backend (V-3)

| ID  | Sub-Task                                                                              | Aufwand | Status                                                        |
| --- | ------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------- |
| C.1 | `parsePxValue` returnt CSS-Vars unverändert; kein `parseInt` auf `var(--…)`           | S       | erledigt — `if (value.startsWith('var(')) return value` Guard |
| C.2 | RT-3: Framework-Output für `Frame gap $sp` ist `'var(--sp-gap)'`, nicht abgeschnitten | S       | erledigt — Anti-Regression-Lock im Test                       |

## Phase D — DOM-Decimal-Bug (V-4)

| ID  | Sub-Task                                                                                | Aufwand | Status                                                                  |
| --- | --------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------- |
| D.1 | Schema-css-Mapper + `formatCSSValue`-Regex akzeptieren Decimals (`/^-?\d+(?:\.\d+)?$/`) | S       | erledigt — zwei Stellen: `style-utils-transformer.ts` + `ir-helpers.ts` |
| D.2 | RT-4: `Frame gap 12.5` → DOM emittiert `'12.5px'`                                       | S       | erledigt                                                                |

## Phase E — Optional Follow-up (V-5)

| ID  | Sub-Task                                                              | Aufwand | Status     |
| --- | --------------------------------------------------------------------- | ------- | ---------- |
| E.1 | `W113 GAP_WITHOUT_CHILDREN` Warn — für später; nicht im Slice 2 Scope | S       | verschoben |

## Phase F — Review-Pass (Step 7 verbindlich)

| ID  | Sub-Task                                                                                                                | Status                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| F.1 | Probe-Tabelle gegen Post-Fix-Stand spiegeln                                                                             | erledigt — alle 15 Probes ✅                |
| F.2 | Schema-Drift-Grep — `mar`-Alias fehlte im React-Backend (`case 'margin'` + `case 'm'` aber kein `case 'mar'`) → ergänzt | erledigt — Cross-Slice-Probe deckte das auf |
| F.3 | Cross-Slice-Probe — Padding/Margin/Sizing/Border/Radius/FontSize alle in RT-7 abgedeckt                                 | erledigt — 11 px-Properties grün            |
| F.4 | Audit-Status `erledigt` nach F.1–F.3                                                                                    | erledigt                                    |

---

# 4. Tests

## Neue RT-Tests (in `tests/compiler/slice-2-gap.test.ts`)

| ID    | Test                                                                                             | Layer         | Phase | Status   |
| ----- | ------------------------------------------------------------------------------------------------ | ------------- | ----- | -------- |
| RT-1  | React-Backend emittiert px für gap (5 Sub-Tests: int, alias, 0, decimal, quoted)                 | compiler-unit | A     | erledigt |
| RT-2  | React-Backend resolved Token-Suffix-Mapping (3 Sub-Tests: basic, multi-suffix, fallback)         | compiler-unit | B     | erledigt |
| RT-3  | Framework-Backend keeps full `var(--sp-gap)` für `Frame gap $sp`                                 | compiler-unit | C     | erledigt |
| RT-4  | DOM-Backend emittiert `'12.5px'` für `Frame gap 12.5`                                            | compiler-unit | D     | erledigt |
| RT-5  | Cross-Backend (DOM/React/Framework) emittiert äquivalente gap-Werte                              | compiler-unit | A.4   | erledigt |
| RT-6  | Alias `g` ≡ `gap`                                                                                | compiler-unit | A     | erledigt |
| RT-7  | Cross-Slice-Probe: 11 px-Properties (gap, pad, mar, w, h, minw, maxw, minh, maxh, rad, fs) + bor | compiler-unit | F.3   | erledigt |
| RT-8  | Validator: `Frame gap` (kein Wert) → E101                                                        | validator     | —     | erledigt |
| RT-9  | Validator: `Frame gap -4` → E105 + Build-CLI Exit-1                                              | validator+CLI | —     | erledigt |
| RT-10 | Component-Def-gap (Btn: gap 8) fliesst zu Use-Site (Btn "X") in DOM und React                    | compiler-unit | A     | erledigt |

**Test-Status:** 29 Sub-Tests in `tests/compiler/slice-2-gap.test.ts`, alle grün. Vitest gesamt nach Slice 2: 14844 / 14867 (23 skipped, 0 failed).

---

# 5. Phase 2 Findings

Phase 1 hat den `gap`-Pfad sauber durchgereicht — alle px-Properties haben jetzt
korrekten React-Output, Suffix-Lookup, Decimal-px, Var-Pass-through. Aber der
zweite Probe-Pass hat sechs **weitere** Cross-Backend-Defizite gefunden,
die vom ersten Audit nicht erfasst waren. Honest disclosure per Quality-Gate
(00-plan Schritt 8): solange diese offen sind, ist Slice 2 nicht „erledigt".

## Probe-Tabelle (Phase 2)

Fokus: `gap-x` / `gap-y` (column-gap / row-gap), Chain-Tokens in React, und
das CSS-Multi-Value-Shorthand `gap N M`. Probe-Skript:
`_slice2_recheck.ts` (post-Phase-1 state).

| #   | Eingabe                                       | DOM                                | React                        | Framework                 | Verdikt                      |
| --- | --------------------------------------------- | ---------------------------------- | ---------------------------- | ------------------------- | ---------------------------- |
| B1  | `Frame hor, gap-x 16`                         | `column-gap: 16px` ✓               | **(nichts)**                 | **(nichts)**              | 🔴 B-1 React + B-2 Framework |
| B2  | `Frame gap-y 24`                              | `row-gap: 24px` ✓                  | **(nichts)**                 | **(nichts)**              | 🔴 B-1 + B-2                 |
| B3  | `Frame hor, gap 8, gap-x 16`                  | `column-gap: 16px` (gap-x wins)    | `gap: '8px'` (gap-x dropped) | **(nichts)**              | 🔴 B-3 (Mixed-Precedence)    |
| B4  | `Frame hor, gx 12, gy 4` (Aliases)            | `column-gap: 12px, row-gap: 4px` ✓ | **(nichts)**                 | **(nichts)**              | 🔴 B-1 + B-2                 |
| C2  | `Frame grid 12, gap-x 8, gap-y 16`            | `column-gap: 8px, row-gap: 16px` ✓ | **(nichts)**                 | **(nichts)**              | 🔴 B-1 + B-2                 |
| D2  | `base.gap: 8; big.gap: $base; Frame gap $big` | `var(--big-gap)` (cascade) ✓       | `gap: '$base'` (literal!)    | `gap: 'var(--big-gap)'` ✓ | 🔴 B-4 (Chain in React)      |
| E1  | `Frame gap 12 8` (Shorthand)                  | `gap: 12px 8px` ✓                  | `gap: '12px'` (truncated)    | `gap: 12` (truncated)     | 🔴 B-5 (Multi-Value)         |
| E2  | `Frame gap 12.5` (Decimal)                    | `gap: 12.5px` ✓ (Phase 1)          | `gap: '12.5px'` ✓ (Phase 1)  | `gap: 12` (parseInt)      | 🟠 B-6 (Framework decimal)   |

## Befunde

- **B-1 (CRITICAL)**: React-Backend `generateStyles` switch-case
  (`compiler/backends/react.ts:574-577`) hat nur `gap`/`g`. **Keine Cases für
  `gap-x`/`gap-y`/`gx`/`gy`** — sie fallen durch die Switch und emittieren
  nichts. Designer schreibt `Frame hor, gap-x 16`, sieht im Studio (DOM)
  korrekten Abstand, exportiert nach React → der gap-x ist weg.
- **B-2 (CRITICAL)**: Framework-Backend `compiler/backends/framework.ts:383`
  hat denselben Pfad-Block wie React und mappt nur `gap`. Cross-Backend-Bruch
  identisch.
- **B-3 (HIGH)**: React's Property-Loop iteriert sequenziell durch die
  Properties; bei `Frame hor, gap 8, gap-x 16` wird zuerst `gap: 8px`
  gesetzt, dann `gap-x` ignoriert (kein Case). DOM hat die Precedence in
  `layout-transformer.ts:457-467` (specific gap → general gap). React fehlt
  diese Logik.
- **B-4 (HIGH)**: Chain-Token-Resolution in React's `tokenMap`-Builder
  (`compiler/backends/react.ts:419-428`) macht **nur 1-Hop OHNE Suffix-Match**.
  Bei `big.gap: $base; base.gap: 8` sucht der Builder `base` (kein Suffix) —
  findet nicht — bleibt `$base` literal. Die Phase-1 V-2-Reform (`lookupWithSuffix`)
  fixed nur den Use-Site-Lookup, nicht den Chain-Build.
- **B-5 (MED)**: `Frame gap 12 8` ist CSS-Shorthand für row-gap+column-gap
  (`gap: <row-gap> <column-gap>`). DOM emittiert das korrekt. React/Framework
  truncaten auf den ersten Wert (8 fällt verloren). Mirror-DSL erlaubt das
  ausdrücklich für `pad N M`/`mar N M`/`bor N M N M` — `gap N M` sollte
  konsistent funktionieren.
- **B-6 (LOW)**: Framework `parsePxValue` macht `parseInt(value)` was Decimals
  truncatet — `12.5` → `12`. Phase-1-V-3 (var(--…)-Pass-through) hat das nicht
  abgedeckt. Niedrige Prio: Decimal-Spacing ist selten.

## Verdikt pro Dimension (Phase 2)

| #   | Dimension               | Vor Phase 1    | Nach Phase 1                                    | Nach Phase 2 (geplant)                                |
| --- | ----------------------- | -------------- | ----------------------------------------------- | ----------------------------------------------------- |
| 1   | Architektur             | schwach        | mittel — Helper-Konsolidierung in React         | gut — auch gap-x/gap-y schema-derived                 |
| 2   | Codequalität            | mittel         | gut — pxify, lookupWithSuffix Helpers           | gut                                                   |
| 3   | Testqualität            | schwach        | mittel — 29 RTs                                 | gut — +RT für gap-x/gap-y, Chain, Shorthand           |
| 4   | Testabdeckung           | schwach        | schwach — gap-x/gap-y differential = 0          | gut — Cross-Backend-Differential für 13 px-Properties |
| 5   | Funktionale Korrektheit | 4 Bugs         | 0 Bugs für `gap` core; 6 Bugs für gap-x/y/chain | 0 Bugs                                                |
| 6   | Studio-Roundtrip        | n/a (DOM only) | n/a                                             | n/a (V-8 verschoben — eigener Studio-Slice)           |

## Touchpoint-Map (Phase 2)

| Layer             | Datei                                                 | Befund                                                         |
| ----------------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| Backend-React     | `compiler/backends/react.ts:574-577`                  | switch-case nur `gap`/`g` — **gap-x/gap-y/gx/gy fehlen** (B-1) |
| Backend-React     | `compiler/backends/react.ts:419-428` tokenMap-Build   | 1-Hop chain ohne Suffix-Match (B-4)                            |
| Backend-React     | (neu) `pxify` Multi-Value-Aware                       | `'12 8'` → `'12px 8px'` (B-5)                                  |
| Backend-Framework | `compiler/backends/framework.ts:383` property-mapper  | nur `gap`-Branch — **gap-x/gap-y fehlen** (B-2)                |
| Backend-Framework | `compiler/backends/framework.ts:556-565` parsePxValue | `parseInt` truncatet decimal (B-6)                             |

## Entscheidungen (Phase 2)

### V-5 — `gap-x` / `gap-y` in React + Framework — **Status: offen**

React `generateStyles` switch-case ergänzen:

```ts
case 'gap-x': case 'gx':
  style.columnGap = pxify(value); break
case 'gap-y': case 'gy':
  style.rowGap = pxify(value); break
```

Framework property-mapper analog. Mixed-precedence (B-3): Reihenfolge
respektieren; wenn `gap-x` nach `gap` kommt, überschreibt es nur die
column-axis (NICHT den unified gap droppen).

### V-6 — Chain-Resolution suffix-aware in React — **Status: offen**

`tokenMap`-Builder muss bei `big.gap: $base` mit context `big.gap`:

1. extrahiere Suffix: `.gap`
2. suche `base.gap` zuerst (suffix-aware), `base` als Fallback
3. rekursiv mit visited-Set, 8-Hop-Cap (Slice-78-Pattern)

Ähnlich Slice 78 V-5 für den Picker-Parser, jetzt portiert ins React-Backend.

### V-7 — Multi-Value Shorthand `gap N M` — **Status: offen**

`pxify(value)` muss multi-value-aware werden — wenn `value` mehrere
whitespace-getrennte Tokens enthält, jedes pxifizieren:

```ts
const pxify = v => {
  if (typeof v === 'number') return `${v}px`
  if (typeof v === 'string') {
    const parts = v.split(/\s+/)
    if (parts.every(p => NUMERIC_RE.test(p))) {
      return parts.map(p => `${p}px`).join(' ')
    }
    if (NUMERIC_RE.test(v)) return `${v}px`
  }
  return v
}
```

Cross-Slice-Probe: gilt auch für `pad`, `mar`, `bor` (alle erlauben Multi-Value).

### V-8 — Studio-Surface für gap-x/gap-y — **Status: verschoben**

Studio property-panel + visual gap-handles unterstützen kein gap-x/gap-y.
Eigener Slice (Studio-Roundtrip-Erweiterung). Out-of-scope für Slice 2
Compile-Layer.

### V-9 — Framework `parsePxValue` decimal-aware — **Status: offen (low prio)**

`parseInt(value)` durch `parseFloat(value)` ersetzen (oder Decimals als
String durchreichen wie var(--…)).

## Umsetzungsplan (Phase 2)

| ID    | Sub-Task                                                                                   | Aus | Aufwand | Status |
| ----- | ------------------------------------------------------------------------------------------ | --- | ------- | ------ |
| 2-A.1 | React: `gap-x`/`gx` → `columnGap` + `gap-y`/`gy` → `rowGap` in `generateStyles`            | V-5 | S       | offen  |
| 2-A.2 | React: Mixed-precedence — `gap-x` überschreibt nur column-axis, `gap` bleibt für row       | V-5 | S       | offen  |
| 2-A.3 | Framework: gap-x/gap-y/gx/gy Branches in property-mapper                                   | V-5 | S       | offen  |
| 2-B.1 | React: `resolveTokenChain(name, value, tokens, visited)` — suffix-aware, 8-hop, cycle-safe | V-6 | M       | offen  |
| 2-B.2 | React: tokenMap-Builder ruft chain-resolver pro `value.startsWith('$')`                    | V-6 | S       | offen  |
| 2-C.1 | React `pxify` multi-value-aware                                                            | V-7 | S       | offen  |
| 2-C.2 | Framework `parsePxValue` multi-value-aware                                                 | V-7 | S       | offen  |
| 2-D.1 | Framework `parsePxValue` decimal-aware                                                     | V-9 | S       | offen  |
| 2-E.1 | RT-11..RT-15 in `tests/compiler/slice-2-gap.test.ts` ergänzen                              | -   | M       | offen  |
| 2-E.2 | Cross-Backend-Differential für `gap-x`/`gap-y` (`tests/differential/layout.test.ts`)       | -   | S       | offen  |
| 2-F.1 | Probe-Tabelle (Phase 2) Post-Fix-Spiegelung                                                | -   | S       | offen  |
| 2-F.2 | Quality-Gate Status-Update (Audit + 00-plan)                                               | -   | S       | offen  |

## Neue Tests (Phase 2)

| ID    | Test                                                                                                        | Aus   | Status |
| ----- | ----------------------------------------------------------------------------------------------------------- | ----- | ------ |
| RT-11 | React: `Frame hor, gap-x 16` → JSX style hat `columnGap: '16px'`                                            | 2-A.1 | offen  |
| RT-12 | React: `Frame gap-y 24` + Aliases gx/gy                                                                     | 2-A.1 | offen  |
| RT-13 | React: Mixed `gap 8, gap-x 16` → both `gap: '8px'` AND `columnGap: '16px'` (oder per Konsens nur columnGap) | 2-A.2 | offen  |
| RT-14 | React: `base.gap: 8; big.gap: $base; Frame gap $big` → `gap: '8px'` (Chain resolved)                        | 2-B.1 | offen  |
| RT-15 | React + Framework: `Frame gap 12 8` → `gap: '12px 8px'` (Multi-Value)                                       | 2-C.1 | offen  |
| RT-16 | Framework: gap-x/gap-y emittieren                                                                           | 2-A.3 | offen  |
| RT-17 | Differential: alle Phase-2-Probes DOM ≡ React (oder dokumentierte Abweichung mit Begründung)                | 2-E.2 | offen  |
