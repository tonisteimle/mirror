# Mirror Feature Test Inventory

> Vollständige Bestandsaufnahme aller Mirror-DSL-Features mit Status der
> Test-Pyramide pro Feature. Begleit-Doc zu
> [feature-testing-pyramid.md](./feature-testing-pyramid.md) (Strategie)
> und [feature-testing-blueprint.md](./feature-testing-blueprint.md)
> (Playbook).
>
> **Stand**: 2026-04-26. **Status-Legende**:
>
> - ✅ done — alle 5 Schichten implementiert + grün
> - 🟡 in progress — mindestens eine Schicht angefangen
> - ⬜ not started
> - 🔵 partial — bestehende Tests vorhanden, nicht im Pyramide-Format
>
> Schichten pro Feature: **F**ixtures · **B**ehavior · **C**ontract ·
> **D**ifferential · **S**upport-Doc.

## Sprache & Compiler-Pipeline

| #   | Feature          | Sub-Features                                                                                                                                                | Status | Schichten | Notizen                              |
| --- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | :----: | --------- | ------------------------------------ |
| 1   | **Components**   | Definition, `as`, Multi-Level, Slots, Override, States, Events, Composition (20)                                                                            |   ✅   | F·B·C·D·S | Commit `44fd84ae`, 112 Tests         |
| 2   | **Tokens**       | TK1 single, TK2 property-set, TK3 suffix, TK4 direct, TK5 in component, TK6 token-in-token, TK7 in conditional, TK8 in each, TK9 numeric, TK10 multi-suffix |   ✅   | F·B·C·D·S | Sprint 2.1, ~50 Tests, 1 Bug gepinnt |
| 3   | **Primitives**   | Frame, Text, Button, Input, Textarea, Image, Icon, Link, Divider, Spacer, semantic HTML                                                                     |   🔵   | -         | Tests bestehen, nicht pyramidisiert  |
| 4   | **Properties**   | ~120 Properties (Layout, Spacing, Color, Typo, Effects, Visibility, …)                                                                                      |   🔵   | -         | Verteilt auf andere Features         |
| 5   | **Canvas**       | mobile/tablet/desktop preset, properties, inheritance to children                                                                                           |   🔵   | -         | Eigene `canvas.test.ts`              |
| 6   | **Custom Icons** | `$icons:` Definition, SVG paths, Mix mit Lucide                                                                                                             |   🔵   | -         | `icons.test.ts`                      |

## Layout & Styling

| #   | Feature               | Sub-Features                                                                          | Status | Schichten | Notizen                  |
| --- | --------------------- | ------------------------------------------------------------------------------------- | :----: | --------- | ------------------------ |
| 7   | **Layout-Direction**  | hor, ver, default                                                                     |   🔵   | -         | Tutorial-Tests vorhanden |
| 8   | **Gap & Spacing**     | gap, gap-x/y, pad/mar (Vollständigkeit aller Achsen)                                  |   🔵   | -         |                          |
| 9   | **Center & Spread**   | center, spread, ver-center, hor-center, top/bottom/left/right                         |   🔵   | -         |                          |
| 10  | **9-Position-Grid**   | tl, tc, tr, cl, center, cr, bl, bc, br                                                |   🔵   | -         |                          |
| 11  | **Sizing**            | w, h, full, hug, min/max, fit-content                                                 |   🔵   | -         |                          |
| 12  | **Grow/Shrink**       | grow, shrink, default flex-shrink behavior                                            |   🔵   | -         |                          |
| 13  | **Wrap**              | wrap, default no-wrap                                                                 |   🔵   | -         |                          |
| 14  | **Grid-Layout**       | grid N, gap, row-height, x/y/w/h positioning                                          |   🔵   | -         | `grid-layout.test.ts`    |
| 15  | **Stacked-Layout**    | stacked, x/y offsets, z-index                                                         |   🔵   | -         |                          |
| 16  | **Device-Presets**    | mobile (375×812), tablet, desktop, override                                           |   🔵   | -         |                          |
| 17  | **Position**          | absolute, fixed, relative, x/y/z                                                      |   🔵   | -         |                          |
| 18  | **Border & Radius**   | bor, boc, rad, per-side                                                               |   🔵   | -         |                          |
| 19  | **Color & Gradients** | bg, col, hex, rgba, named, grad, grad-ver, grad-NN                                    |   🔵   | -         |                          |
| 20  | **Typography**        | fs, weight, line, font, text-align, italic, underline, uppercase, lowercase, truncate |   🔵   | -         |                          |
| 21  | **Effects**           | shadow, opacity, blur, backdrop-blur                                                  |   🔵   | -         |                          |
| 22  | **Visibility**        | hidden, visible, disabled, scroll, scroll-hor, scroll-both, clip                      |   🔵   | -         |                          |
| 23  | **Hover-Properties**  | hover-bg/col/opacity/scale/border/border-color/radius (Inline-States)                 |   🔵   | -         |                          |
| 24  | **Cursor**            | pointer, grab, move, text, wait, not-allowed                                          |   🔵   | -         |                          |
| 25  | **Aspect-Ratio**      | square, video, numeric                                                                |   🔵   | -         |                          |
| 26  | **Transform**         | rotate, scale, x/y/z translate                                                        |   🔵   | -         |                          |

## State & Interaktion

| #   | Feature                 | Sub-Features                                                                           | Status | Schichten | Notizen                           |
| --- | ----------------------- | -------------------------------------------------------------------------------------- | :----: | --------- | --------------------------------- |
| 27  | **System-States**       | hover, focus, active, disabled                                                         |   🔵   | -         | DOM-Backend implementiert         |
| 28  | **Custom-States**       | on/off, open/closed, selected/highlighted, expanded/collapsed, filled/valid/invalid, … |   🔵   | -         |                                   |
| 29  | **toggle()**            | binäres on/off, mit Transitions, mit `on`-Initial-State                                |   🔵   | -         | Im Components-Pyramide angerissen |
| 30  | **exclusive()**         | nur eines aktiv in Group, `selected` Initial-State, Cross-Element via `name`           |   🔵   | -         | dito                              |
| 31  | **Size-States**         | compact (<400px), regular (400-800px), wide (>800px), Custom-Threshold                 |   🔵   | -         |                                   |
| 32  | **State-Transitions**   | duration, easing, anim-Property                                                        |   🔵   | -         |                                   |
| 33  | **Cross-Element-State** | `Element.state:` Selektor, `name`-Referenzen                                           |   🔵   | -         |                                   |

## Daten & Bindings

| #   | Feature            | Sub-Features                                                                                                                                                        | Status | Schichten | Notizen                                 |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----: | --------- | --------------------------------------- |
| 34  | **Variables**      | V1 number, V2 string, V3 boolean, V4 reference (style), V5 interpolation, V6 multi-interpolation, V7 nested object, V8 deep access, V9 collection, V10 aggregations |   ✅   | F·B·C·D·S | Sprint 1.1, ~75 Tests, Bug #22 entdeckt |
| 35  | **Objects**        | nested (`user: { name: "X" }`), property access (`$user.name`)                                                                                                      |   🔵   | -         |                                         |
| 36  | **Collections**    | object-of-entries, array, aggregations (count, first, last)                                                                                                         |   🔵   | -         |                                         |
| 37  | **Bind (One-way)** | `Text $var`                                                                                                                                                         |   🔵   | -         |                                         |
| 38  | **Bind (Two-way)** | `Input bind varName`, mit Mask                                                                                                                                      |   🔵   | -         | `bind-feature.test.ts`                  |
| 39  | **Bind in Loops**  | each-Loop-Items mit `bind` auf Loop-Var-Property                                                                                                                    |   🔵   | -         |                                         |
| 40  | **Exclusive-Bind** | `bind selectedItem` für Auswahl in Liste                                                                                                                            |   🔵   | -         |                                         |
| 41  | **Input Mask**     | Pattern (`#`, `A`, `*`), Literal-Chars, mit `bind`                                                                                                                  |   🔵   | -         |                                         |

## Komposition & Kontrollfluss

| #   | Feature                  | Sub-Features                                                                                                                                                    | Status | Schichten | Notizen                               |
| --- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----: | --------- | ------------------------------------- |
| 42  | **Each-Loop**            | E1 basic, E2 index, E3 inline-array, E4 object, E5 where, E6 by, E7 desc, E8 combined, E9 nested, E10 inner-conditional, E11 bind, E12 parallel, E13 with-token |   ✅   | F·B·C·D·S | Sprint 1.3, ~53 Tests, 2 Bugs gepinnt |
| 43  | **Conditional (Block)**  | T1 if, T2 if/else, T3 boolean ops, T4 comparison, T5 string-comparison                                                                                          |   ✅   | F·B·C·D·S | Sprint 1.2, ~36 Tests                 |
| 44  | **Conditional (Inline)** | T6 ternary, T7 nested, T8 in style, T9 token-ref, T10 loopVar, T11 in text, T12 unicode                                                                         |   ✅   | F·B·C·D·S | Sprint 1.2, 4 Bugs gepinnt            |
| 45  | **Computed Expression**  | `count + 1`, `name.toUpperCase()`, `$var > 10`                                                                                                                  |   🔵   | -         |                                       |
| 46  | **Show/Hide**            | `if loggedIn`-Block vs. `hidden`-Property                                                                                                                       |   🔵   | -         |                                       |

## Events & Actions

| #   | Feature               | Sub-Features                                                                                   | Status | Schichten | Notizen |
| --- | --------------------- | ---------------------------------------------------------------------------------------------- | :----: | --------- | ------- |
| 47  | **Click-Events**      | onclick, mit Action, mit Multi-Action, mit `()`                                                |   🔵   | -         |         |
| 48  | **Hover-Events**      | onhover, mit Custom-State, mit Animation                                                       |   🔵   | -         |         |
| 49  | **Focus-Events**      | onfocus, onblur                                                                                |   🔵   | -         |         |
| 50  | **Input-Events**      | oninput, onchange, mit `bind`                                                                  |   🔵   | -         |         |
| 51  | **Keyboard-Events**   | onkeydown, onkeyup, mit Key-Filter (enter, escape, space, arrow-up/down/left/right, home, end) |   🔵   | -         |         |
| 52  | **Click-Outside**     | onclick-outside (für Dialogs, Dropdowns)                                                       |   🔵   | -         |         |
| 53  | **Viewport-Events**   | onviewenter, onviewexit (IntersectionObserver)                                                 |   🔵   | -         |         |
| 54  | **Load-Events**       | onload                                                                                         |   🔵   | -         |         |
| 55  | **Show/Hide-Actions** | show, hide, toggle, open, close, dismiss                                                       |   🔵   | -         |         |
| 56  | **State-Actions**     | activate, deactivate, select, highlight (next/prev/first/last), assign                         |   🔵   | -         |         |
| 57  | **Counter-Actions**   | increment, decrement, set, get, reset                                                          |   🔵   | -         |         |
| 58  | **Toast/Feedback**    | toast(message, type?, position?)                                                               |   🔵   | -         |         |
| 59  | **Input-Control**     | focus, blur, clear, setError, clearError, submit, reset                                        |   🔵   | -         |         |
| 60  | **Navigation**        | navigate, back, forward, openUrl                                                               |   🔵   | -         |         |
| 61  | **Scroll-Actions**    | scrollTo, scrollBy, scrollToTop, scrollToBottom                                                |   🔵   | -         |         |
| 62  | **Position-Actions**  | showAt, showBelow, showAbove, showLeft, showRight, showModal                                   |   🔵   | -         |         |
| 63  | **CRUD-Actions**      | add, remove, create, save, revert, delete (auf Collections)                                    |   🔵   | -         |         |
| 64  | **Clipboard**         | copy(text)                                                                                     |   🔵   | -         |         |
| 65  | **Multi-Action**      | mehrere Aktionen kombiniert: `toggle(), increment(count), toast("Liked!")`                     |   🔵   | -         |         |

## Animationen

| #   | Feature               | Sub-Features                                                                       | Status | Schichten | Notizen           |
| --- | --------------------- | ---------------------------------------------------------------------------------- | :----: | --------- | ----------------- |
| 66  | **Animation-Presets** | fade-in, slide-up/down/left/right, scale-in, bounce, pulse, shake, spin, reveal-\* |   🔵   | -         |                   |
| 67  | **Custom-Animations** | duration, easing, mit `anim`-Property                                              |   🔵   | -         |                   |
| 68  | **State-Transitions** | hover 0.15s, on 0.2s ease-out                                                      |   🔵   | -         | überlappt mit #32 |

## UI-Komponenten (Pure Mirror)

| #   | Feature               | Sub-Features                                                               | Status | Schichten | Notizen               |
| --- | --------------------- | -------------------------------------------------------------------------- | :----: | --------- | --------------------- |
| 69  | **Dialog**            | Trigger, Backdrop, Content, CloseTrigger, Open/Close, ESC, Click-Outside   |   🔵   | -         | `compound-primitives` |
| 70  | **Tooltip**           | Trigger, Content, Positioning (top/bottom/left/right)                      |   🔵   | -         |                       |
| 71  | **Tabs**              | defaultValue, Tab-Triggers, Tab-Contents, Switching                        |   🔵   | -         |                       |
| 72  | **Select (Dropdown)** | Trigger, Content, Items, trigger-text, loop-focus, typeahead, keyboard-nav |   🔵   | -         |                       |
| 73  | **Checkbox**          | label, checked default, click toggles                                      |   🔵   | -         |                       |
| 74  | **Switch**            | label, checked, click toggles                                              |   🔵   | -         |                       |
| 75  | **Slider**            | min, max, value, step                                                      |   🔵   | -         |                       |
| 76  | **RadioGroup**        | value, RadioItem, exclusive selection                                      |   🔵   | -         |                       |
| 77  | **DatePicker** (Zag)  | selectionMode, fixedWeeks, startOfWeek, positioning, min/max               |   🔵   | -         | Letzter Zag-Component |

## Compound Primitives

| #   | Feature    | Sub-Features                                                               | Status | Schichten | Notizen          |
| --- | ---------- | -------------------------------------------------------------------------- | :----: | --------- | ---------------- |
| 78  | **Table**  | Header, Row, Footer, Group, data-driven, where-Filter, by-OrderBy, Spalten |   🔵   | -         |                  |
| 79  | **Charts** | Line, Bar, Pie, Donut, Area, Title, Axis, Grid, Point, Line-Style          |   🔵   | -         | Chart.js-Backend |

## Multi-File & Projekt-Struktur

| #   | Feature                | Sub-Features                                                | Status | Schichten | Notizen                |
| --- | ---------------------- | ----------------------------------------------------------- | :----: | --------- | ---------------------- |
| 80  | **Multi-File-Projekt** | data/, tokens/, components/, layouts/, screens/ Reihenfolge |   🔵   | -         | Smoke-Tests rudimentär |
| 81  | **`use`-Statement**    | use tokens, use components, use data                        |   🔵   | -         |                        |
| 82  | **File-Load-Order**    | Dependency-Resolution, Token-Reuse, Data-Cross-File         |   🔵   | -         |                        |
| 83  | **Page-Navigation**    | navigate(PageName), Page-Loading, Page-Container            |   🔵   | -         |                        |

## Test-Pyramide-Roadmap

### Priorisierungs-Kriterien

Jedes Feature wird auf 5 Achsen gewichtet (1-5, höher = wichtiger):

| Achse                 | Bedeutung                                            | Gewicht |
| --------------------- | ---------------------------------------------------- | ------- |
| **B** Bug-Density     | Bekannte Bugs / wahrscheinliche Bugs pro Sub-Feature | ×3      |
| **F** Foundationality | Wieviele andere Features hängen davon ab             | ×2      |
| **S** Surface         | Wie häufig im echten App-Code                        | ×2      |
| **R** ROI             | Erwartete Bugs pro Stunde Test-Arbeit                | ×2      |
| **E** Effort          | Stunden bis fertig (negativer Faktor)                | ×−1     |

**Score** = `B×3 + F×2 + S×2 + R×2 − E`. Höher = höhere Priorität.

### Bewertung & Ranking

| Rang | Feature              |  B  |  F  |  S  |  R  |  E  | **Score** | Status                |
| :--: | -------------------- | :-: | :-: | :-: | :-: | :-: | :-------: | --------------------- |
|  1   | **Variables/Data**   |  5  |  5  |  5  |  4  |  2  |  **41**   | ⬜ Höchste Prio       |
|  2   | **Conditionals**     |  5  |  3  |  4  |  5  |  2  |  **37**   | ⬜ Just-fixed-Region  |
|  3   | **Each-Loop**        |  4  |  3  |  4  |  5  |  2  |  **34**   | ⬜ Just-fixed-Region  |
|  4   | **Tokens**           |  2  |  5  |  5  |  4  |  2  |  **32**   | ⬜ Foundation         |
|  5   | **Bind**             |  3  |  3  |  4  |  4  |  2  |  **29**   | ⬜                    |
|  6   | **Toggle/Exclusive** |  3  |  3  |  4  |  3  |  2  |  **27**   | ⬜                    |
|  7   | **Layout**           |  2  |  5  |  5  |  2  |  4  |  **26**   | 🔵 partial            |
|  8   | **Properties**       |  2  |  5  |  5  |  2  |  4  |  **26**   | 🔵 partial            |
|  9   | **Events**           |  2  |  3  |  4  |  3  |  3  |  **23**   | 🔵 partial            |
|  10  | **Actions**          |  2  |  3  |  4  |  3  |  3  |  **23**   | 🔵 partial            |
|  11  | **Multi-File**       |  2  |  3  |  3  |  3  |  2  |  **22**   | 🔵 partial            |
|  12  | **Primitives**       |  1  |  5  |  5  |  1  |  3  |  **22**   | 🔵 mature             |
|  13  | **Canvas**           |  1  |  2  |  4  |  1  |  1  |  **16**   | 🔵 partial            |
|  14  | **Pure UI Compons.** |  2  |  1  |  3  |  3  |  5  |  **15**   | 🔵 (erbt v. Compons.) |
|  15  | **Tables+Charts**    |  2  |  1  |  2  |  2  |  3  |  **13**   | 🔵                    |
|  16  | **Animationen**      |  1  |  1  |  3  |  1  |  1  |  **12**   | 🔵                    |
|  17  | **Custom Icons**     |  1  |  1  |  2  |  1  |  1  |  **10**   | 🔵                    |
|  18  | **DatePicker (Zag)** |  1  |  1  |  1  |  1  |  1  |   **8**   | 🔵 (last Zag)         |
|  ✅  | Components           |  3  |  4  |  5  |  3  |  -  |   done    | Commit `44fd84ae`     |

### Sprint-Plan

Statt einzeln durchzulaufen, in **Sprints von 1-2 Tagen** gruppiert
nach thematischer Nähe und Bug-Cluster:

#### Sprint 1: Daten-Fluss (~6h, ~250 Tests)

**Höchste Bug-Density. Just-fixed-Regions zementieren.**

1. **Variables/Data** (#34-36) — `name: "X"`, `$name`-Referenzen, Objekt-
   Access, Collections, Aggregationen, Interpolation in Text. **Pinning
   für die XSS-relevanten Bugs aus Tier-1-4**.
2. **Conditionals** (#43-44) — if/else Block + Inline-Ternary, nested,
   in Style-Properties. **Pinning für #18-20 (gerade gefixt)**.
3. **Each-Loop** (#42) — basic, with-index, where, by, nested, inline-
   array, over-object. **Pinning für #17, #19 (gerade gefixt)**.

#### Sprint 2: Foundation (~6h, ~300 Tests)

**Cross-cutting, alles andere baut darauf.**

4. **Tokens** (#2) — single-value, property-set, suffix, $-ref, nested,
   Token-in-Token, Runtime-Resolution.
5. **Bind** (#37-41) — One-way, Two-way, in Loops, exclusive-bind, mit
   Mask. Hier lauern Reactivity-Bugs.

#### Sprint 3: Interaktion (~5h, ~200 Tests)

**State-Machines + Side-Effects.**

6. **Toggle/Exclusive** (#29-30) — binär, exclusive-Group, Cross-Element,
   Initial-State (`on`, `selected`), Transitionen.
7. **Events** (#47-54) — onclick, onhover, onkey\*, oninput, click-outside,
   viewenter/exit. Genug Granularität.
8. **Actions** (#55-65) — show/hide, navigate, scroll, set/get, CRUD,
   multi-action.

#### Sprint 4: Layout & Properties (~4h, ~250 Tests)

**Größte Surface, niedrige Bug-Density. Bestehende Tests schon vorhanden,
nur Pyramide drumherum.**

9. **Layout** (#7-17) — direction, gap, center/spread, 9-position, sizing,
   grow/shrink, wrap, grid, stacked, device-presets, position.
10. **Properties** (#18-26) — color, gradients, typo, effects, visibility,
    hover-properties, cursor, aspect, transform.

#### Sprint 5: Integration & Compound (~5h, ~250 Tests)

11. **Multi-File** (#80-83) — `use`-Statement, File-Load-Order,
    Page-Navigation. Smoke-Tests aufwerten zu echtem Contract.
12. **Pure UI Components** (#69-76) — Dialog, Tooltip, Tabs, Select,
    Checkbox, Switch, Slider, RadioGroup. Erben bereits viel von
    Components-Pyramide; pro Komponente nur ~5 Tests.
13. **Tables + Charts** (#78-79) — Compound, mit externer Lib.

#### Sprint 6: Cleanup (~2h, ~80 Tests)

14. **Animationen** (#66-68) — Presets, Custom-Anim, State-Transitions.
15. **Canvas + Custom Icons** (#5-6) — gemeinsam, beide klein.
16. **DatePicker** (#77) — letzte Zag-Komponente.

### Aufwand Total

| Sprint | Aufwand | Test-Zuwachs |
| -----: | ------: | -----------: |
|      1 |     ~6h |         ~250 |
|      2 |     ~6h |         ~300 |
|      3 |     ~5h |         ~200 |
|      4 |     ~4h |         ~250 |
|      5 |     ~5h |         ~250 |
|      6 |     ~2h |          ~80 |
|  Summe |    ~28h |        ~1330 |

AI-paired-Schätzung. Solo: 5-7× Faktor (~5-6 Wochen).

Mit aktuellem Stand 10064 Tests → nach allen Sprints **~11400 Tests**,
strukturell pyramidisiert. Damit Test-Niveau **Svelte/Babel/TypeScript-
Liga** erreicht.

### Empfehlung: nächster PR

**Sprint 1, Schritt 1: Variables/Data**.

Begründung:

- Höchster Score (41)
- Foundational für Conditionals + Each + Bind
- 5 der 21 gefundenen Bugs lagen in Interpolation/Templates (XSS-relevant)
- 0 Sub-Features davon haben heute eine Pyramide
- Ergibt sofort Pinning für die zuletzt gefixten String-Quote-Bugs

Wenn Sprint 1 fertig: re-evaluieren, ob Sprint 2 in der vorgeschlagenen
Reihenfolge oder anders priorisiert wird (Erkenntnisse aus Sprint 1
können Bug-Density-Schätzungen für andere Features korrigieren).

## Laufende Notiz: Bekannte Bugs aus Pyramide-Arbeit

| #   | Bug                                                        | Gefunden in        | Status    |
| --- | ---------------------------------------------------------- | ------------------ | --------- |
| 17  | Doppelter `tasksData` bei zwei `each`-Loops                | Smoke-Tests        | ✅ gefixt |
| 18  | Strings ohne Quotes in Conditional                         | Smoke-Tests        | ✅ gefixt |
| 19  | Colon-Splitting in `__loopVar:` Markern                    | Smoke-Tests        | ✅ gefixt |
| 20  | `__loopVar:` ohne Wrap als bare Identifier                 | Smoke-Tests        | ✅ gefixt |
| 21  | Self-Reference Stack-Overflow                              | Components-F.      | ✅ gefixt |
| 22  | `Text $var` (bare ref) emittiert keinen `textContent`      | Variables-Contract | ✅ gefixt |
| 23  | Nested ternary in Text → mehrere Sibling-Elemente          | Conditionals-F.    | ✅ gefixt |
| 24  | Ternary mit `$token` in style → kein `background`          | Conditionals-F.    | ✅ gefixt |
| 25  | Ternary in style mit `$var`-Operand fällt auf var()        | Conditionals-F.    | ✅ gefixt |
| 26  | Ternary in Text mit Interpolation → leerer textContent     | Conditionals-F.    | ✅ gefixt |
| 27  | `each x, idx in $list` — `$idx` wird nicht substituiert    | Each-Fixtures      | ✅ gefixt |
| 28  | `if/else` innerhalb `each` rendert BEIDE Branches          | Each-Fixtures      | ✅ gefixt |
| 29  | `bor`-Shorthand überschreibt `boc $token` mit currentColor | Tokens-Fixtures    | ⬜ offen  |

## Nicht-Ziele

Bewusst **nicht** in dieser Inventory:

- **Studio-UI** (Drag/Drop, Pickers, Editor-Sync, AI-Assist) — separate Test-Suite
- **Test-Framework selbst** — Browser-Test-Runner, Demo-Runner haben eigene Tests
- **Performance-Budgets** — Tier-7 Hypothesis-Tests decken das ab
- **Visual-Regression** — separates Tooling, nicht hier verfolgt

## Wartung

- Bei jedem neuen Feature dieses Dokument updaten
- Bei jedem abgeschlossenen Pyramide-PR Status auf ✅ + Commit-Link
- Bei Bug-Discovery: Bug-Tabelle ergänzen
- Bei Schema-Erweiterung (DSL) neue Zeile in der passenden Kategorie
