# 50 — Slice 50: Lucide-Icons

**Datum:** 2026-05-10
**Dev:** 4
**Status:** Audit erledigt · Implementation offen · Quality-Gate offen

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

Lucide-Icon-Primitive: `Icon "name", is N, ic #color, iw N, fill`. Eingangs-DSL:

```mirror
Icon "check"                              // default size, default color
Icon "check", is 20, ic #888              // sized + colored
Icon "heart", ic #ef4444, fill            // filled (fill-Variante)
Icon "loader", anim spin                  // mit Animation
```

**DSL-Versprechen** (CLAUDE.md `Icon` Reference + Properties-Tabelle):

- `Icon "name"` rendert Lucide-Icon (CDN, gecached)
- `is N` Größe — default **24** lt. CLAUDE.md
- `ic #color` Farbe (stroke bei outline, fill bei `fill`-Variante)
- `iw N` stroke-width (`weight` Property, range 100-700, default 400)
- `fill` Boolean → ausgefülltes Icon (`fill` statt `stroke`)
- Token-driven: `Icon "x", is $size, ic $color`
- State-aware: `Icon "heart"\n  hover:\n    ic #ef4444`

## Probe-Skript

`tools/probes/slice-50-icons.ts` — 8 Sektionen (A–H):

- A: Default-Quellen-Drift (Schema vs. Primitive vs. Runtime)
- B: Cross-Backend Plain-Icon (DOM/React/Framework)
- C: `is`/`ic`/`iw`/`fill` cross-backend
- D: Token-driven properties
- E: State-Pfad mit `ic`-change in `hover:`
- F: Edge-Cases (unknown name, kebab-multi-word, single-letter)
- G: `sanitizeIconName` boundary
- H: Default-Drift-Confirmation textuelle Doku

## Probes-Tabelle (Pre-Fix)

| #    | Eingabe                                           | DOM ist                                                                     | React ist                                  | Framework ist                                                                  | Verdikt |
| ---- | ------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------ | ------- |
| P-1  | `Icon "check"` (plain)                            | `data-icon-size="16"`, `width: 20px`                                        | `<span>{"check"}</span>` (kein Icon!)      | `M('Icon','check', { w: 20, h: 20, is: '16' })`                                | 🔴      |
| P-2  | `Icon "check", is 32`                             | `data-icon-size="32"`, `width: 32px`                                        | `<span>{"check"}</span>` (kein Icon!)      | `M('Icon','check', { w: 32, h: 32, is: '32' })`                                | 🔴      |
| P-3  | `Icon "heart", ic #ef4444`                        | `data-icon-color="#ef4444"`, `color: #ef4444`                               | `<span>{"heart"}</span>` (kein Icon!)      | `M('Icon','heart', { w: 20, h: 20, col: '#ef4444', is: '16', ic: '#ef4444' })` | 🔴      |
| P-4  | `Icon "check", iw 1`                              | `data-icon-weight="1"`, `font-weight: '1'` ⚠️                               | `<span>{"check"}</span>`                   | `M('Icon','check', { w: 20, h: 20, weight: '1', is: '16', iw: '1' })`          | 🔴      |
| P-5  | `Icon "heart", fill`                              | `data-icon-fill=true` ⚠️ (boolean, nicht string)                            | `<span>{"heart"}</span>`                   | `M('Icon','heart', { w: 20, h: 20, is: '16' })` (fill weg!)                    | 🔴      |
| P-6  | alle vier Properties                              | data-icon-\* korrekt + `font-weight` Leak                                   | `<span>{"heart"}</span>`                   | doppelte Emit `w/is/h/col/ic/weight/iw`                                        | 🔴      |
| P-7  | `is $iconSize` Token                              | `width: var(--iconSize-is)`, **kein** data-icon-size emittiert ⚠️           | `<span>` (kein Icon)                       | `w: 'var(--iconSize-is)'`                                                      | 🔴      |
| P-8  | `ic $primary` Token                               | `data-icon-size="16"`, **kein** data-icon-color emittiert? Probe lückenhaft | `<span>` (kein Icon)                       | `ic: '$primary'` (Token unresolved!)                                           | 🔴      |
| P-9  | `Icon "heart", ic #888\n  hover:\n    ic #ef4444` | base + state korrekt                                                        | `<span>` (kein Icon)                       | `states: { hover: { col: '#ef4444' } }` aber `ic` weg im state                 | 🟡      |
| P-10 | unknown icon name                                 | `loadIcon` fired, runtime fallback-icon                                     | `<span>{"this-does-not-exist-xyz"}</span>` | `M('Icon','this-does-not-exist-xyz', ...)`                                     | 🔴      |
| P-11 | `Icon ""` (leere Quote)                           | parser-Verhalten ungetestet                                                 | —                                          | —                                                                              | ⚪️ TBD  |
| P-12 | `Icon "Check"` (uppercase)                        | sanitizeIconName REJECT, fallback                                           | text-leak                                  | text-leak                                                                      | 🔴      |
| P-13 | `is 0` / negative                                 | ungetestet                                                                  | —                                          | —                                                                              | ⚪️ TBD  |

## Verdikt pro Dimension (Pre-Fix)

| #   | Dimension               | Bewertung                                                                                                                                      |
| --- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Architektur             | **schwach** — 7 verschiedene Default-Quellen für `is` (16/20/24); kein Schema-Helper als Single Source                                         |
| 2   | Codequalität            | **mittel** — value-resolver hardcodet "16"; primitive emittiert 20px w/h; runtime hat 16-fallback und 24-fallback                              |
| 3   | Testqualität            | **mittel** — positional-args.test deckt PA6, states.test deckt toggle ic, cleanup deckt CDN-fallback. Keine systematische Cross-Backend-Suite. |
| 4   | Testabdeckung           | **schwach** — Cross-Backend nicht gepinnt; React-Icon-Bug nirgends gepinnt; Default-Drift nicht gepinnt; iw font-weight Leak nicht gepinnt     |
| 5   | Funktionale Korrektheit | **kritisch** — React rendert KEINE Icons (nur Text!); Framework emit 6× redundante Properties; 4 unterschiedliche Defaults                     |
| 6   | Studio-Roundtrip        | **untested** — Property-Panel ic/is/iw/fill Roundtrip ungeprüft; Icon-Picker UI separat (Slice 79)                                             |

## Touchpoint-Map

| Layer        | Datei                                                                                          | Rolle                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Schema       | `compiler/schema/dsl.ts:246`                                                                   | Icon → `<span>` HTML-Tag                                                                                |
| Schema       | `compiler/schema/primitives.ts:41,158-165`                                                     | `SIZES.iconSize = 20` und Icon-Primitive default `w/h: 20`                                              |
| Schema       | `compiler/schema/properties.ts:480-514`                                                        | Properties `icon-size`/`is` default 24, `icon-weight`/`iw` default 400, `ic`, `fill`                    |
| Schema       | `compiler/schema/ir-helpers.ts:65`                                                             | Icon contentProperty                                                                                    |
| IR           | `compiler/ir/transformers/property-transformer.ts:169-176`                                     | `is` auf Icon → `width/height` CSS                                                                      |
| IR           | `compiler/ir/transformers/property-transformer.ts:191-198`                                     | `size` auf Icon → `width/height` CSS                                                                    |
| IR           | `compiler/ir/transformers/value-resolver.ts:273-278`                                           | **Default `data-icon-size: 16`** (HARDCODED, ≠ Schema-Default 24!)                                      |
| IR           | `compiler/ir/transformers/value-resolver.ts:352-365`                                           | `is`/`ic`/`iw` → `data-icon-*` Attribute                                                                |
| Backend DOM  | `compiler/backends/dom/node-emitter.ts:89-215`                                                 | Icon-Setup: span Sizing + `_runtime.loadIcon(el, name)` call                                            |
| Backend DOM  | `compiler/backends/dom/state-machine-emitter.ts:82,141`                                        | `iconSize \|\| '16'` fallback in state-pfad                                                             |
| Backend DOM  | `compiler/backends/dom/ops/emit-loops.ts:135,320`                                              | `iconSize \|\| '16'` fallback in loop-pfad                                                              |
| Backend DOM  | `compiler/backends/dom/ops/emit-static.ts:14-24`                                               | Custom-Icon-Registry-Emit (`registerIcon`) — Slice 51 territory                                         |
| Backend Reac | `compiler/backends/react.ts:276`                                                               | **Icon → `'span'` ohne weitere Logik (kein Loader, kein SVG-Render)**                                   |
| Backend FW   | `compiler/backends/framework.ts:226,296-301`                                                   | Reverse-Map `data-icon-*` → `is`/`ic`/`iw`. **Aber:** keine Suppression der CSS-Styles → doppelte Emit. |
| Runtime      | `compiler/runtime/icons.ts:16,18`                                                              | LUCIDE_CDN constant + FALLBACK_ICON                                                                     |
| Runtime      | `compiler/runtime/icons.ts:152-187` (`applyIconToElement`)                                     | Liest data-icon-\* + appliziert auf SVG. **Default size '16'**.                                         |
| Runtime      | `compiler/runtime/icons.ts:203-218` (`sanitizeIconName`)                                       | Validiert Icon-Name. Strict regex `[a-z0-9-]`, max 50 chars.                                            |
| Runtime      | `compiler/runtime/icons.ts:234-293` (`sanitizeSVG`)                                            | Strip `<script>`/`on*`/`href`/`xlink`. DOMParser-basiert.                                               |
| Runtime      | `compiler/runtime/mirror-runtime.ts:1212`                                                      | Lucide-API utility default `?? 24` (matches CLAUDE.md, but isolated).                                   |
| Validator    | `compiler/validator/validation-config.ts:60`                                                   | Icon als meta-Permitted (kein strict name-list)                                                         |
| Studio       | `studio/icons/index.ts`                                                                        | LAYOUT_ICONS / COMPONENT_ICONS — **UI-Icons** für Studio selber, nicht User-Icons                       |
| Studio       | `studio/pickers/icon/picker.ts`                                                                | Icon-Picker UI (CDN-Liste). **Slice 79 territory.**                                                     |
| Studio       | `studio/panels/property/sections/content-section.ts:37-173`                                    | Property-Panel Icon-Field + Picker-Button                                                               |
| Studio       | `studio/editor/icon-trigger.ts`, `studio/editor/triggers/icon-trigger.ts`                      | Editor-Trigger zur Icon-Edit-Loop                                                                       |
| Tests        | `tests/behavior/positional-args.test.ts:173-429` (PA6)                                         | Bare hex/number → `ic`/`is` Disambiguation                                                              |
| Tests        | `tests/behavior/states.test.ts:222`                                                            | Icon stroke-color/weight in toggle                                                                      |
| Tests        | `tests/behavior/cleanup.test.ts:65-153` (CL3)                                                  | Custom-icons + Lucide CDN fallback                                                                      |
| Tests        | `tests/studio/pickers-icon-data-and-animation.test.ts`, `editor-icon-trigger-toplevel.test.ts` | Studio Icon-Picker + Editor-Trigger                                                                     |

---

# 2. Untersuchungs-Ergebnisse

| Q    | Frage                                                         | Befund                                                                                                                                                                                                               |
| ---- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-1  | Was ist der „korrekte" Default für `is`?                      | CLAUDE.md DSL-Doc + properties.ts + mirror-runtime.ts:1212 sagen alle **24**. Probe-Praxis liefert 16 (data-icon) + 20 (CSS w/h). Drift in 5 Stellen.                                                                |
| Q-2  | Warum rendert React keine Icons?                              | `react.ts:276` mappt Icon → 'span', mehr nicht. Kein Loader, kein useEffect, kein SVG-Render. **DSL-Versprechen bricht für react-Target.**                                                                           |
| Q-3  | Wo kommt `data-icon-size="16"` her?                           | `compiler/ir/transformers/value-resolver.ts:276` hardcodet `value: '16'` als Default wenn weder `is` noch `icon-size` gesetzt.                                                                                       |
| Q-4  | Wo kommt `width: 20px` her?                                   | `compiler/schema/primitives.ts:41,158-165` setzt Icon-Primitive default `w/h: SIZES.iconSize = 20`.                                                                                                                  |
| Q-5  | Wo kommt `width: 16px` (im SVG) her?                          | `compiler/runtime/icons.ts:166` `el.dataset.iconSize \|\| '16'`. Da data-icon-size aber compiletime auf '16' gesetzt wird, ist Runtime-Fallback nie aktiv.                                                           |
| Q-6  | Kann der Default zentralisiert werden?                        | Ja — Schema-Helper `getIconDefaultSize()` in `compiler/schema/primitives.ts` (oder `schema/icon-defaults.ts`). Alle 5+ Stellen lesen daraus.                                                                         |
| Q-7  | Warum doppelt-emit Framework `w/is/h/col/ic/weight/iw`?       | Framework `stylesToProps` emittiert CSS→Mirror-Reverse für `width`→`w` etc., parallel zu `nodeToProps` das `data-icon-*` → `is`/`ic`/`iw` macht. Keine Suppression.                                                  |
| Q-8  | Wieso `font-weight` für `iw` in DOM-styles?                   | property-transformer.ts oder simplePropertyToCSS hat `iw` → `font-weight` als Generic-Mapping (nicht Icon-spezifisch). Leakage.                                                                                      |
| Q-9  | `setAttribute('data-icon-fill', true)` — Boolean oder String? | `setAttribute(_, true)` → Browser coerces zu `"true"`. **Type-confused** aber funktional. Sollte konsistent `"true"` sein.                                                                                           |
| Q-10 | React-Backend Icon-Fix-Strategie?                             | Option A: client-Side Lucide-Component (`import { Check } from 'lucide-react'`). Option B: kompiliertes Icon (Inline-SVG embedded). Option C: useEffect mit fetch+sanitize. Option A ist canonical für React-Export. |
| Q-11 | Gibt es eine schema-derived Icon-Property-Liste?              | properties.ts hat 4 Properties als isolierte Einträge. Keine zentrale Liste. Slice-21-style Schema-Lookup wäre ein Refactor.                                                                                         |
| Q-12 | Cross-Slice mit Slice 21 (Komponenten)?                       | Komponenten können Icon-Slot enthalten (`Btn: hor, gap 8\n  Icon "..."\n  Slot`). HSP-1 Cross-Slice-Probe-Pflicht. Probe in P-9 deckt es.                                                                            |
| Q-13 | Cross-Slice mit Slice 51 (Custom-Icons)?                      | Custom-Icons via `$icons:` Registry. Geteilte Render-Pipeline (`getIconSvg` checkt customIconRegistry vor CDN). Slice 51 territory aber Helper-shared.                                                               |

---

# 3. Entscheidungen

## V-1 — Schema-zentralisierte Default-Quelle (kritisch)

**Entscheidung:** Neuer Schema-Konstanten-Bereich in `compiler/schema/primitives.ts` (oder `compiler/schema/icon-defaults.ts`):

```typescript
export const ICON_DEFAULTS = {
  size: 24, // CLAUDE.md DSL doc canonical
  weight: 2, // Lucide stroke-width canonical (NICHT 400!)
  color: 'currentColor',
  fill: false,
} as const

export function getIconDefault<K extends keyof typeof ICON_DEFAULTS>(
  key: K
): (typeof ICON_DEFAULTS)[K] {
  return ICON_DEFAULTS[key]
}
```

Alle 7 Drift-Stellen (value-resolver:276, primitives.ts:41, icons.ts:166, icons.ts:168, state-machine-emitter:82+141, emit-loops:135+320, properties.ts:480) lesen daraus.

**Begründung:** Plan-Lesson 7 „Hot-Files brauchen Schema-Lookups, nicht Switch-Cases / hardcoded Defaults". Single Source of Truth für Icon-Defaults verhindert künftige Drift. Pick **24** als canonical (CLAUDE.md doc + 2 von 3 schema-Stellen + Lucide-React community default).

**Begründung gegen 16:** 16 ist nirgends dokumentiert; war wahrscheinlich ein Probe-Wert der eingefroren wurde.
**Begründung gegen 20:** `SIZES.iconSize=20` ist eine `tokens`-Style-Konstante für Studio-UI (kleine Icons). User-DSL-Default sollte nicht von Studio-UI-Tokens abhängen.
**Begründung für `weight: 2`:** Lucide stroke-width 2 ist visueller Default; properties.ts:`iw default = 400` ist Copy-Paste vom font-weight-Schema (Bug).

## V-2 — React-Backend Icon-Render (kritisch)

**Entscheidung:** Slice 50 V-2 fügt React Icon-Rendering ein. Strategie: **Option A** — client-side `lucide-react`-Komponenten.

Output-Beispiel:

```jsx
import { Check } from 'lucide-react'
// ...
;<span data-component="Icon" data-mirror-name="Icon">
  <Check size={32} color="#ef4444" strokeWidth={1} />
</span>
```

Mit `fill`-Variante:

```jsx
<Heart size={32} color="#ef4444" fill="currentColor" />
```

Imports werden dynamisch erweitert (Compile-Pipeline trackt verwendete Icon-Namen). Wenn `lucide-react` nicht im Target verfügbar: Fallback auf inline-SVG mit Static-Import (Phase B, deferred).

**Begründung:** React-Export-Pipeline in CLAUDE.md hat React-Target validiert „first-try grün" — aber Icons sind verloren. Korrektheit > Bundle-Size. Inline-SVG (Option B) ist 2x larger Bundle aber kein peer-dep. Phase A liefert lucide-react Path; Phase B kann Inline-SVG nachreichen.

## V-3 — Framework-Backend Reverse-Map Suppression

**Entscheidung:** In `framework.ts:stylesToProps`, wenn der IR-Node ein Icon ist UND `data-icon-*` Attribute vorhanden sind, suppress die korrespondierenden CSS-Style-Reverses (`width`→`w` skip, `color`→`col` skip, `font-weight`→`weight` skip).

Das Set zu suppress-en wenn Icon + data-icon-attrs:

- `width`, `height` (durch `is` abgedeckt)
- `color` (durch `ic` abgedeckt)
- `font-weight` (Leakage, gehört nicht hierhin)

**Begründung:** Round-trip-Cleanness. User schreibt `Icon "x", is 32, ic #f00` → IR → Framework sollte zurück `is: 32, ic: '#f00'` sein, nicht `{w:32, h:32, col:'#f00', is:'32', ic:'#f00'}`.

## V-4 — `iw` font-weight Leak im DOM

**Entscheidung:** In `compiler/ir/transformers/property-transformer.ts` (oder simplePropertyToCSS) sicherstellen, dass `iw`/`icon-weight` auf einem Icon-Primitive **nicht** in `font-weight` CSS landet. Weg: Early-Return wenn primitive='icon' für diese property-names.

**Begründung:** SVG-stroke-width wird über data-icon-weight via Runtime appliziert; CSS font-weight ist Dead-Code-Emit der Browser ignoriert (`<svg>` hat kein font-weight). Aber: 1) Bundle-Bloat, 2) Confusing in DevTools, 3) Property-Panel-Roundtrip könnte font-weight zurück-konvertieren.

## V-5 — `setAttribute('data-icon-fill', true)` Type-Konsistenz

**Entscheidung:** Emitter ändert `setAttribute('data-icon-fill', true)` zu `setAttribute('data-icon-fill', "true")` (String-Quoting). Plus äquivalente Konsistenz für andere data-icon-Boolean-Attribute (sollte's keine geben).

**Begründung:** Konsistenz mit anderen data-icon-\* (alle string-quoted). Plus DOM-Spec: setAttribute coerces, aber explicit > implicit.

## V-6 — Cross-Backend RT-Suite

**Entscheidung:** `tests/compiler/slice-50-icons.test.ts` mit:

- RT-1..RT-4: Default-Drift gepinnt (alle Stellen liefern `24`)
- RT-5..RT-12: Cross-Backend Icon-Render (DOM/React/Framework × is/ic/iw/fill)
- RT-13..RT-15: Token-driven cross-backend
- RT-16: hover-state ic
- RT-17..RT-19: Edge-Cases (unknown, kebab, single-letter)
- RT-20: sanitizeIconName boundary (12 Cases)
- RT-21: Schema-Helper `getIconDefault('size')` === `24`
- RT-22: Studio-Roundtrip Lower-Bar (DOM-pfad locked + Property-Panel-content-section.ts test exists)

## V-7 — Cross-Slice-Probe gegen Slice 51 (Custom-Icons)

**Entscheidung:** Probe + RT für `Icon "myicon"` mit `$icons: myicon: "M..."` Registry, gegen alle 3 Backends. Sicherstellt dass Custom-Icons-Pfad nicht durch V-1/V-2/V-3 zerbricht.

**Begründung:** Slice 51 ist meine direkte nächste Phase (51 depends on 50). Defer-Lock-RT für Slice 51 statt im Slice 50 zu fixen. Re-Open-Trigger: Slice 51 Audit.

---

# 4. Umsetzungsplan & Status

| ID   | Sub-Task                                                                                           | Status  |
| ---- | -------------------------------------------------------------------------------------------------- | ------- |
| A.1  | Schema-Konstanten `ICON_DEFAULTS` + `getIconDefault()` Helper                                      | pending |
| A.2  | Drift-Fixes: value-resolver:276, icons.ts:166+168, primitives.ts:41+158-165, properties.ts:480-514 | pending |
| A.3  | React-Backend Icon-Renderer (Option A: lucide-react) — V-2                                         | pending |
| A.4  | Framework Reverse-Map Suppression — V-3                                                            | pending |
| A.5  | `iw` font-weight Leak in property-transformer — V-4                                                | pending |
| A.6  | `setAttribute('data-icon-fill', "true")` Quote-Fix — V-5                                           | pending |
| A.7  | Slice-50 RT-Suite — V-6 (Cross-Backend, ~22 RTs)                                                   | pending |
| A.8  | Cross-Slice-Probe gegen Slice 51 (Custom-Icons) — V-7                                              | pending |
| A.9  | Schema-Drift-Grep + Cross-Slice-Scope-Entscheidung                                                 | pending |
| A.10 | Review-Pass mit Iteration bis sauber                                                               | pending |
| A.11 | 9-Punkt Quality-Gate-Check                                                                         | pending |

---

# 5. Tests

## Baseline (alle grün, müssen grün bleiben)

| Suite                                                      | Tests                               |
| ---------------------------------------------------------- | ----------------------------------- |
| `tests/behavior/positional-args.test.ts` (PA6)             | Icon hex/number disambiguation      |
| `tests/behavior/states.test.ts` (line 222 ff)              | Icon stroke-color toggle            |
| `tests/behavior/cleanup.test.ts` (CL3, lines 65-153)       | Custom icons + CDN fallback         |
| `tests/studio/pickers-icon-data-and-animation.test.ts`     | Icon-Picker UI (Slice 79 territory) |
| `tests/studio/editor-icon-trigger-toplevel.test.ts`        | Editor Icon-Trigger                 |
| Voll-Regression Pre-Slice-50: 490 files / 13984 tests grün |                                     |

## Neue RT-Tests (`tests/compiler/slice-50-icons.test.ts`)

| ID    | Test                                                                                                     | V-Mapping     | Status  |
| ----- | -------------------------------------------------------------------------------------------------------- | ------------- | ------- |
| RT-1  | `getIconDefault('size')` === `24`                                                                        | V-1           | pending |
| RT-2  | `getIconDefault('weight')` === `2`                                                                       | V-1           | pending |
| RT-3  | Plain `Icon "check"`: DOM emits `data-icon-size="24"` (post-fix)                                         | V-1           | pending |
| RT-4  | Plain Icon: kein `font-weight` Style                                                                     | V-4           | pending |
| RT-5  | Cross-Backend: `Icon "check", is 32` — DOM/React/Framework alle haben `size=32`                          | V-1, V-2      | pending |
| RT-6  | Cross-Backend: `Icon "heart", ic #ef4444` — Color in allen 3 Backends                                    | V-2, V-3      | pending |
| RT-7  | Cross-Backend: `Icon "x", iw 1` — stroke-width 1 in allen 3, kein font-weight                            | V-2, V-4      | pending |
| RT-8  | Cross-Backend: `Icon "heart", fill` — Fill-Variante in allen 3                                           | V-2, V-3, V-5 | pending |
| RT-9  | Cross-Backend: alle vier Properties kombiniert                                                           | V-1..V-5      | pending |
| RT-10 | React-Output: import `lucide-react` für verwendete Icons                                                 | V-2           | pending |
| RT-11 | React-Output: `<Check size={32} color="#ef4444" strokeWidth={1} />` für full-spec                        | V-2           | pending |
| RT-12 | React-Output: kein literal text-Leak `{"check"}` (außer im aria-label)                                   | V-2           | pending |
| RT-13 | Token: `Icon "x", is $size` cross-backend                                                                | V-1, V-2      | pending |
| RT-14 | Token: `Icon "x", ic $primary` cross-backend                                                             | V-2           | pending |
| RT-15 | Token: alle Tokens cross-backend                                                                         | V-1, V-2      | pending |
| RT-16 | State: `hover: ic #ef4444` cross-backend                                                                 | V-2           | pending |
| RT-17 | Edge: unknown name fällt sauber zurück (DOM fallback-icon, React null/empty, FW passthrough)             | V-2           | pending |
| RT-18 | Edge: `Icon ""` produziert klaren Validator-Error (kein silent skip)                                     | new           | pending |
| RT-19 | Edge: Multi-word kebab `arrow-up-right`                                                                  | V-1           | pending |
| RT-20 | sanitizeIconName: 12 boundary-cases gepinnt                                                              | V-1           | pending |
| RT-21 | Framework Reverse-Map: keine doppelt `w/is`, `h/is`, `col/ic`                                            | V-3           | pending |
| RT-22 | Studio-Roundtrip Lower-Bar: DOM gelocked via RT-3..RT-9; `tests/studio/pickers-icon-*.test.ts` existiert | new           | pending |
| RT-23 | Cross-Slice gegen Slice 51: `Custom-Icon` registriert via `$icons:` rendert in DOM                       | V-7           | pending |

---

# 6. Review-Pass-Befunde

_Wird nach Implementation der V-Items ausgefüllt. Iter 1 = Implementation-Pass; Iter 2+ = jeweils ein Review-Pass-Durchlauf bis 0 neue Findings._
