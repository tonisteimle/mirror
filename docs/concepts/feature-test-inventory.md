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
| 5   | **Canvas**       | mobile/tablet/desktop preset, properties, inheritance to children                                                                                           |   ✅   | F·B·C·D·S | Sprint 6                             |
| 6   | **Custom Icons** | `$icons:` Definition, SVG paths, Mix mit Lucide                                                                                                             |   ✅   | F·B·C·D·S | Sprint 6 — Bug #34 gefixt            |

## Layout & Styling

| #   | Feature               | Sub-Features                                    | Status | Schichten | Notizen    |
| --- | --------------------- | ----------------------------------------------- | :----: | --------- | ---------- |
| 7   | **Layout-Direction**  | L1 vertical, L2 horizontal                      |   ✅   | F·B·C·D·S | Sprint 4.1 |
| 8   | **Gap & Spacing**     | L1-L4 gap, pad/mar across fixtures              |   ✅   | F·B·C·D·S | Sprint 4.1 |
| 9   | **Center & Spread**   | L3 center, L4 spread                            |   ✅   | F·B·C·D·S | Sprint 4.1 |
| 10  | **9-Position-Grid**   | L5 tl/tr/etc.                                   |   ✅   | F·B·C·D·S | Sprint 4.1 |
| 11  | **Sizing**            | L6 w/h/full/hug/min/max                         |   ✅   | F·B·C·D·S | Sprint 4.1 |
| 12  | **Grow/Shrink**       | L7 grow                                         |   ✅   | F·B·C·D·S | Sprint 4.1 |
| 13  | **Wrap**              | L8 wrap                                         |   ✅   | F·B·C·D·S | Sprint 4.1 |
| 14  | **Grid-Layout**       | L9 grid                                         |   ✅   | F·B·C·D·S | Sprint 4.1 |
| 15  | **Stacked-Layout**    | L10 stacked                                     |   ✅   | F·B·C·D·S | Sprint 4.1 |
| 16  | **Device-Presets**    | L11 mobile/tablet/desktop                       |   ✅   | F·B·C·D·S | Sprint 4.1 |
| 17  | **Position**          | L12 absolute, x/y                               |   ✅   | F·B·C·D·S | Sprint 4.1 |
| 18  | **Border & Radius**   | P9 bor, boc, rad                                |   ✅   | F·B·C·D·S | Sprint 4.2 |
| 19  | **Color & Gradients** | P1 hex, P2 rgba/named, P3 grad/grad-ver/grad-NN |   ✅   | F·B·C·D·S | Sprint 4.2 |
| 20  | **Typography**        | P4 fs/weight/font/case, P5 truncate             |   ✅   | F·B·C·D·S | Sprint 4.2 |
| 21  | **Effects**           | P6 shadow, opacity, blur                        |   ✅   | F·B·C·D·S | Sprint 4.2 |
| 22  | **Visibility**        | P7 hidden, scroll, clip                         |   ✅   | F·B·C·D·S | Sprint 4.2 |
| 23  | **Hover-Properties**  | P11 hover-bg/scale                              |   ✅   | F·B·C·D·S | Sprint 4.2 |
| 24  | **Cursor**            | P8 pointer/grab/not-allowed                     |   ✅   | F·B·C·D·S | Sprint 4.2 |
| 25  | **Aspect-Ratio**      | square, video, numeric                          |   🔵   | -         |            |
| 26  | **Transform**         | P10 rotate, scale                               |   ✅   | F·B·C·D·S | Sprint 4.2 |

## State & Interaktion

| #   | Feature                 | Sub-Features                                                           | Status | Schichten | Notizen               |
| --- | ----------------------- | ---------------------------------------------------------------------- | :----: | --------- | --------------------- |
| 27  | **System-States**       | S9 hover, focus, active, disabled                                      |   ✅   | F·B·C·D·S | Sprint 3.1, ~42 Tests |
| 28  | **Custom-States**       | S4 multi-state, S5 style-override, S8 state-children                   |   ✅   | F·B·C·D·S | Sprint 3.1            |
| 29  | **toggle()**            | S1 basic, S2 initial, S3 transition, S10 multiple-independent          |   ✅   | F·B·C·D·S | Sprint 3.1            |
| 30  | **exclusive()**         | S6 group, S7 cross-element                                             |   ✅   | F·B·C·D·S | Sprint 3.1            |
| 31  | **Size-States**         | compact (<400px), regular (400-800px), wide (>800px), Custom-Threshold |   🔵   | -         |                       |
| 32  | **State-Transitions**   | duration, easing, anim-Property                                        |   🔵   | -         |                       |
| 33  | **Cross-Element-State** | `Element.state:` Selektor, `name`-Referenzen                           |   🔵   | -         |                       |

## Daten & Bindings

| #   | Feature            | Sub-Features                                                                                                                                                        | Status | Schichten | Notizen                                 |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----: | --------- | --------------------------------------- |
| 34  | **Variables**      | V1 number, V2 string, V3 boolean, V4 reference (style), V5 interpolation, V6 multi-interpolation, V7 nested object, V8 deep access, V9 collection, V10 aggregations |   ✅   | F·B·C·D·S | Sprint 1.1, ~75 Tests, Bug #22 entdeckt |
| 35  | **Objects**        | nested (`user: { name: "X" }`), property access (`$user.name`)                                                                                                      |   🔵   | -         |                                         |
| 36  | **Collections**    | object-of-entries, array, aggregations (count, first, last)                                                                                                         |   🔵   | -         |                                         |
| 37  | **Bind (One-way)** | B1 text, B2 style — `Text $var`                                                                                                                                     |   ✅   | F·B·C·D·S | Sprint 2.2, ~22 Tests, 2 Bugs gepinnt   |
| 38  | **Bind (Two-way)** | B3 Input, B5 mit Mask                                                                                                                                               |   ✅   | F·B·C·D·S | Sprint 2.2, ~22 Tests, 2 Bugs gepinnt   |
| 39  | **Bind in Loops**  | B4 each-Loop-Items mit `bind` auf Loop-Var-Property                                                                                                                 |   ✅   | F·B·C·D·S | Sprint 2.2, ~22 Tests, 2 Bugs gepinnt   |
| 40  | **Exclusive-Bind** | B6 `bind selectedItem` für Auswahl                                                                                                                                  |   ✅   | F·B·C·D·S | Sprint 2.2, ~22 Tests, 2 Bugs gepinnt   |
| 41  | **Input Mask**     | B5 Pattern, mit `bind`                                                                                                                                              |   ✅   | F·B·C·D·S | Sprint 2.2, ~22 Tests, 2 Bugs gepinnt   |

## Komposition & Kontrollfluss

| #   | Feature                  | Sub-Features                                                                                                                                                    | Status | Schichten | Notizen                               |
| --- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----: | --------- | ------------------------------------- |
| 42  | **Each-Loop**            | E1 basic, E2 index, E3 inline-array, E4 object, E5 where, E6 by, E7 desc, E8 combined, E9 nested, E10 inner-conditional, E11 bind, E12 parallel, E13 with-token |   ✅   | F·B·C·D·S | Sprint 1.3, ~53 Tests, 2 Bugs gepinnt |
| 43  | **Conditional (Block)**  | T1 if, T2 if/else, T3 boolean ops, T4 comparison, T5 string-comparison                                                                                          |   ✅   | F·B·C·D·S | Sprint 1.2, ~36 Tests                 |
| 44  | **Conditional (Inline)** | T6 ternary, T7 nested, T8 in style, T9 token-ref, T10 loopVar, T11 in text, T12 unicode                                                                         |   ✅   | F·B·C·D·S | Sprint 1.2, 4 Bugs gepinnt            |
| 45  | **Computed Expression**  | `count + 1`, `name.toUpperCase()`, `$var > 10`                                                                                                                  |   🔵   | -         |                                       |
| 46  | **Show/Hide**            | `if loggedIn`-Block vs. `hidden`-Property                                                                                                                       |   🔵   | -         |                                       |

## Events & Actions

| #   | Feature               | Sub-Features                             | Status | Schichten | Notizen        |
| --- | --------------------- | ---------------------------------------- | :----: | --------- | -------------- |
| 47  | **Click-Events**      | EV1 onclick, EV9 multi-action            |   ✅   | F·B·C·D·S | Sprint 3.2     |
| 48  | **Hover-Events**      | EV2 onhover                              |   ✅   | F·B·C·D·S | Sprint 3.2     |
| 49  | **Focus-Events**      | EV3 onfocus, onblur                      |   ✅   | F·B·C·D·S | Sprint 3.2     |
| 50  | **Input-Events**      | EV4 oninput, onchange                    |   ✅   | F·B·C·D·S | Sprint 3.2     |
| 51  | **Keyboard-Events**   | EV5 enter, EV6 arrows, EV10 escape       |   ✅   | F·B·C·D·S | Sprint 3.2     |
| 52  | **Click-Outside**     | EV7 onclick-outside                      |   ✅   | F·B·C·D·S | Sprint 3.2     |
| 53  | **Viewport-Events**   | EV8 onviewenter, onviewexit              |   ✅   | F·B·C·D·S | Sprint 3.2     |
| 54  | **Load-Events**       | onload                                   |   🔵   | -         | Tutorial-Tests |
| 55  | **Show/Hide-Actions** | A2 toggle/show/hide via state            |   ✅   | F·B·C·D·S | Sprint 3.3     |
| 56  | **State-Actions**     | activate, deactivate, select, highlight  |   🔵   | -         |                |
| 57  | **Counter-Actions**   | A1 increment, decrement, set, reset      |   ✅   | F·B·C·D·S | Sprint 3.3     |
| 58  | **Toast/Feedback**    | A3 toast (info/success/error)            |   ✅   | F·B·C·D·S | Sprint 3.3     |
| 59  | **Input-Control**     | A4 focus, clear; A9 setError, clearError |   ✅   | F·B·C·D·S | Sprint 3.3     |
| 60  | **Navigation**        | A7 navigate, back, forward               |   ✅   | F·B·C·D·S | Sprint 3.3     |
| 61  | **Scroll-Actions**    | A6 scrollToTop, scrollToBottom, scrollTo |   ✅   | F·B·C·D·S | Sprint 3.3     |
| 62  | **Position-Actions**  | showAt, showBelow, showModal             |   🔵   | -         |                |
| 63  | **CRUD-Actions**      | A5 add, remove                           |   ✅   | F·B·C·D·S | Sprint 3.3     |
| 64  | **Clipboard**         | A8 copy(text)                            |   ✅   | F·B·C·D·S | Sprint 3.3     |
| 65  | **Multi-Action**      | A10 toggle + increment + toast chain     |   ✅   | F·B·C·D·S | Sprint 3.3     |

## Animationen

| #   | Feature               | Sub-Features                                                                       | Status | Schichten | Notizen           |
| --- | --------------------- | ---------------------------------------------------------------------------------- | :----: | --------- | ----------------- |
| 66  | **Animation-Presets** | fade-in, slide-up/down/left/right, scale-in, bounce, pulse, shake, spin, reveal-\* |   ✅   | F·B·C·D·S | Sprint 6          |
| 67  | **Custom-Animations** | duration, easing, mit `anim`-Property                                              |   🔵   | -         |                   |
| 68  | **State-Transitions** | hover 0.15s, on 0.2s ease-out                                                      |   🔵   | -         | überlappt mit #32 |

## UI-Komponenten (Pure Mirror)

| #   | Feature               | Sub-Features                                                               | Status | Schichten | Notizen                 |
| --- | --------------------- | -------------------------------------------------------------------------- | :----: | --------- | ----------------------- |
| 69  | **Dialog**            | Trigger, Backdrop, Content, CloseTrigger, Open/Close, ESC, Click-Outside   |   ✅   | F·B·C·D·S | Sprint 5.2              |
| 70  | **Tooltip**           | Trigger, Content, Positioning (top/bottom/left/right)                      |   ✅   | F·B·C·D·S | Sprint 5.2 — Bug #32 ✅ |
| 71  | **Tabs**              | defaultValue, Tab-Triggers, Tab-Contents, Switching                        |   ✅   | F·B·C·D·S | Sprint 5.2 — Bug #33 ✅ |
| 72  | **Select (Dropdown)** | Trigger, Content, Items, trigger-text, loop-focus, typeahead, keyboard-nav |   ✅   | F·B·C·D·S | Sprint 5.2              |
| 73  | **Checkbox**          | label, checked default, click toggles                                      |   ✅   | F·B·C·D·S | Sprint 5.2              |
| 74  | **Switch**            | label, checked, click toggles                                              |   ✅   | F·B·C·D·S | Sprint 5.2              |
| 75  | **Slider**            | min, max, value, step                                                      |   ✅   | F·B·C·D·S | Sprint 5.2              |
| 76  | **RadioGroup**        | value, RadioItem, exclusive selection                                      |   ✅   | F·B·C·D·S | Sprint 5.2              |
| 77  | **DatePicker** (Zag)  | selectionMode, fixedWeeks, startOfWeek, positioning, min/max               |   ✅   | F·B·C·D·S | Sprint 6 — letzter Zag  |

## Compound Primitives

| #   | Feature    | Sub-Features                                                               | Status | Schichten | Notizen    |
| --- | ---------- | -------------------------------------------------------------------------- | :----: | --------- | ---------- |
| 78  | **Table**  | Header, Row, Footer, Group, data-driven, where-Filter, by-OrderBy, Spalten |   ✅   | F·B·C·D·S | Sprint 5.3 |
| 79  | **Charts** | Line, Bar, Pie, Donut, Area, Title, Axis, Grid, Point, Line-Style          |   ✅   | F·B·C·D·S | Sprint 5.3 |

## Multi-File & Projekt-Struktur

| #   | Feature                | Sub-Features                                                | Status | Schichten | Notizen                 |
| --- | ---------------------- | ----------------------------------------------------------- | :----: | --------- | ----------------------- |
| 80  | **Multi-File-Projekt** | data/, tokens/, components/, layouts/, screens/ Reihenfolge |   ✅   | 1-4       | Sprint 5.1              |
| 81  | **`use`-Statement**    | use tokens, use components, use data                        |   ✅   | 1-4       | Sprint 5.1 — kosmetisch |
| 82  | **File-Load-Order**    | Dependency-Resolution, Token-Reuse, Data-Cross-File         |   ✅   | 1-4       | Sprint 5.1              |
| 83  | **Page-Navigation**    | navigate(PageName), Page-Loading, Page-Container            |   🔵   | -         | (Actions-Pyramide)      |

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

| #   | Bug                                                                    | Gefunden in        | Status    |
| --- | ---------------------------------------------------------------------- | ------------------ | --------- |
| 17  | Doppelter `tasksData` bei zwei `each`-Loops                            | Smoke-Tests        | ✅ gefixt |
| 18  | Strings ohne Quotes in Conditional                                     | Smoke-Tests        | ✅ gefixt |
| 19  | Colon-Splitting in `__loopVar:` Markern                                | Smoke-Tests        | ✅ gefixt |
| 20  | `__loopVar:` ohne Wrap als bare Identifier                             | Smoke-Tests        | ✅ gefixt |
| 21  | Self-Reference Stack-Overflow                                          | Components-F.      | ✅ gefixt |
| 22  | `Text $var` (bare ref) emittiert keinen `textContent`                  | Variables-Contract | ✅ gefixt |
| 23  | Nested ternary in Text → mehrere Sibling-Elemente                      | Conditionals-F.    | ✅ gefixt |
| 24  | Ternary mit `$token` in style → kein `background`                      | Conditionals-F.    | ✅ gefixt |
| 25  | Ternary in style mit `$var`-Operand fällt auf var()                    | Conditionals-F.    | ✅ gefixt |
| 26  | Ternary in Text mit Interpolation → leerer textContent                 | Conditionals-F.    | ✅ gefixt |
| 27  | `each x, idx in $list` — `$idx` wird nicht substituiert                | Each-Fixtures      | ✅ gefixt |
| 28  | `if/else` innerhalb `each` rendert BEIDE Branches                      | Each-Fixtures      | ✅ gefixt |
| 29  | `bor`-Shorthand überschreibt `boc $token` mit currentColor             | Tokens-Fixtures    | ✅ gefixt |
| 30  | `bind item.value` in each-Loop initialisiert nicht                     | Bind-Fixtures      | ✅ gefixt |
| 31  | `bind user.email` bindet auf `user` (ganzes Object)                    | Bind-Fixtures      | ✅ gefixt |
| 32  | `Tooltip positioning "X"` parst, emittiert kein Attribut               | Pure-UI-Behavior   | ✅ gefixt |
| 33  | `Tabs defaultValue "X"` parst, emittiert kein Attribut                 | Pure-UI-Behavior   | ✅ gefixt |
| 34  | `$icons:` emittiert `_runtime.registerIcon` vor `_runtime`-const → TDZ | Cleanup-F.         | ✅ gefixt |

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
