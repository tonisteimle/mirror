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

| #   | Feature          | Sub-Features                                                                              | Status | Schichten | Notizen                             |
| --- | ---------------- | ----------------------------------------------------------------------------------------- | :----: | --------- | ----------------------------------- |
| 1   | **Components**   | Definition, `as`, Multi-Level, Slots, Override, States, Events, Composition (20)          |   ✅   | F·B·C·D·S | Commit `44fd84ae`, 112 Tests        |
| 2   | **Tokens**       | Single-value, property-set, suffix-resolution, $-ref, nested, propagation, runtime-tokens |   ⬜   | -         | Höchste Prio nach Components        |
| 3   | **Primitives**   | Frame, Text, Button, Input, Textarea, Image, Icon, Link, Divider, Spacer, semantic HTML   |   🔵   | -         | Tests bestehen, nicht pyramidisiert |
| 4   | **Properties**   | ~120 Properties (Layout, Spacing, Color, Typo, Effects, Visibility, …)                    |   🔵   | -         | Verteilt auf andere Features        |
| 5   | **Canvas**       | mobile/tablet/desktop preset, properties, inheritance to children                         |   🔵   | -         | Eigene `canvas.test.ts`             |
| 6   | **Custom Icons** | `$icons:` Definition, SVG paths, Mix mit Lucide                                           |   🔵   | -         | `icons.test.ts`                     |

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

| #   | Feature            | Sub-Features                                                                 | Status | Schichten | Notizen                |
| --- | ------------------ | ---------------------------------------------------------------------------- | :----: | --------- | ---------------------- |
| 34  | **Variables**      | scalar (`name: "X"`), reference (`$name`), interpolation (`"$name says hi"`) |   🔵   | -         |                        |
| 35  | **Objects**        | nested (`user: { name: "X" }`), property access (`$user.name`)               |   🔵   | -         |                        |
| 36  | **Collections**    | object-of-entries, array, aggregations (count, first, last)                  |   🔵   | -         |                        |
| 37  | **Bind (One-way)** | `Text $var`                                                                  |   🔵   | -         |                        |
| 38  | **Bind (Two-way)** | `Input bind varName`, mit Mask                                               |   🔵   | -         | `bind-feature.test.ts` |
| 39  | **Bind in Loops**  | each-Loop-Items mit `bind` auf Loop-Var-Property                             |   🔵   | -         |                        |
| 40  | **Exclusive-Bind** | `bind selectedItem` für Auswahl in Liste                                     |   🔵   | -         |                        |
| 41  | **Input Mask**     | Pattern (`#`, `A`, `*`), Literal-Chars, mit `bind`                           |   🔵   | -         |                        |

## Komposition & Kontrollfluss

| #   | Feature                  | Sub-Features                                                                             | Status | Schichten | Notizen                    |
| --- | ------------------------ | ---------------------------------------------------------------------------------------- | :----: | --------- | -------------------------- |
| 42  | **Each-Loop**            | basic, with-index, inline-array, over-object, nested, where-Filter, by-OrderBy, asc/desc |   🔵   | -         | Bug-Cluster #17/19/20 dort |
| 43  | **Conditional (Block)**  | `if`, `else`, complex-conditions (==, !=, >, <, &&, \|\|)                                |   🔵   | -         |                            |
| 44  | **Conditional (Inline)** | Ternary `? :`, nested ternary, in style-property, in Text-content                        |   🔵   | -         | Bug-Cluster #18-20 dort    |
| 45  | **Computed Expression**  | `count + 1`, `name.toUpperCase()`, `$var > 10`                                           |   🔵   | -         |                            |
| 46  | **Show/Hide**            | `if loggedIn`-Block vs. `hidden`-Property                                                |   🔵   | -         |                            |

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

Empfohlene Reihenfolge nach Impact und Bug-Anfälligkeit:

| Rang | Feature                | Begründung                                         | Geschätzter Aufwand |
| ---- | ---------------------- | -------------------------------------------------- | ------------------- |
| 1    | Components             | ✅ done                                            | 1.5h (real)         |
| 2    | **Tokens**             | Design-System-Fundament, durchdringt alle Features | 2h                  |
| 3    | **Each-Loop**          | Bug-Cluster (#17, #19, #20)                        | 2h                  |
| 4    | **Conditionals**       | Bug-Cluster (#18-20)                               | 2h                  |
| 5    | **Properties+Layout**  | Foundational, jede Mirror-Zeile betroffen          | 3-4h (groß)         |
| 6    | **Bind**               | Two-Way komplex, viele Edge-Cases mit Loops/Slots  | 2h                  |
| 7    | **Toggle/Exclusive**   | State-Machine-Bugs gefährlich                      | 2h                  |
| 8    | **Events+Actions**     | Side-Effects, Cross-Element-Refs                   | 3h                  |
| 9    | **Variables+Data**     | Interpolation-Bugs (XSS-relevant)                  | 2h                  |
| 10   | **Animations**         | Selten Bug-Träger, aber visible                    | 1h                  |
| 11   | **Multi-File**         | Integration-tief, schwer reproduzierbar            | 2h                  |
| 12   | **Pure UI Components** | je 30-60 min, summiert auf ~5h                     | 5h                  |
| 13   | **Tables+Charts**      | Compound + externe Lib (Chart.js)                  | 3h                  |
| 14   | **Canvas + Icons**     | klein, oft beiläufig getestet                      | 1h                  |
| 15   | **DatePicker (Zag)**   | letzte Zag-Komponente                              | 1h                  |

**Gesamt-Aufwand**: ~32h fokussierte Arbeit AI-paired (~4 Tage),
~150-200h ohne AI (~4-5 Wochen).

**Erwarteter Test-Zuwachs**: ~1500-2500 zusätzliche Tests (Schicht 1-4
pro Feature). Mit aktuellem Stand 10064 Tests landet das Repo in der
**TypeScript-/Svelte-/Babel-Liga** (~12000-15000 Tests).

## Laufende Notiz: Bekannte Bugs aus Pyramide-Arbeit

| #   | Bug                                         | Gefunden in   | Status    |
| --- | ------------------------------------------- | ------------- | --------- |
| 17  | Doppelter `tasksData` bei zwei `each`-Loops | Smoke-Tests   | ✅ gefixt |
| 18  | Strings ohne Quotes in Conditional          | Smoke-Tests   | ✅ gefixt |
| 19  | Colon-Splitting in `__loopVar:` Markern     | Smoke-Tests   | ✅ gefixt |
| 20  | `__loopVar:` ohne Wrap als bare Identifier  | Smoke-Tests   | ✅ gefixt |
| 21  | Self-Reference Stack-Overflow               | Components-F. | ⬜ offen  |

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
