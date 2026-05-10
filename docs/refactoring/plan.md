# Mirror Refactoring — Gesamtplan

Vertikale, end2end prüfbare User-Fähigkeiten („Capability-Slices"). Jeder Slice wird einzeln entlang von 6 Dimensionen auditiert; Befunde werden als nummeriertes Audit-Dokument abgelegt; Follow-up-Tickets stehen am Ende jedes Audits.

**~88 Slices in 11 Surfaces.**

---

## Vorgehen

**Pro Slice:**

1. Audit gemäß den 6 Prüf-Dimensionen
2. Probes / Mini-Mirror-Beispiele dokumentieren
3. Bewertung pro Dimension (stark / mittel / schwach)
4. Follow-up-Tickets (Bugs, Architektur, Cleanup)
5. Ergebnis als `XX-<name>.md` ablegen (XX = Slice-Nummer 2-stellig), Audit-Status-Tabelle aktualisieren
6. Implementierung in Runden — pro Phase ein Commit
7. **Review-Pass nach Implementierung** (verbindlich, kein Skip):
   - Probe-Tabelle im Audit-Doc gegen den Post-Fix-Stand spiegeln (alle 🔴/🟡/🟠 die jetzt grün sind, müssen grün gemacht werden — sonst lügt das Doc)
   - Jede RT aus dem Audit-Plan effektiv schreiben oder begründet streichen — ein Plan-RT ohne Test ist eine offene Lücke, kein erledigter Punkt
   - **Schema-Drift-Grep** (verbindlich): wenn der Slice eine Schema-Liste erweitert hat (z. B. system-states von 4 → 13), repo-weit nach den alten enum-Werten greppen (`grep -rEn "['\"]hover['\"].*['\"]focus['\"]" --include="*.ts" compiler/ studio/ tests/`). Jede gefundene Stelle muss entweder schema-derived gemacht oder explizit als „bewusster Scope" dokumentiert werden. Das ist die Heuristik aus dem Slice-26/27/29-Cluster: ohne diesen Grep findet der Audit den Compiler, aber nicht den Sync-Layer / Syntax-Highlighter / etc.
   - **Cross-Slice-Probe**: wenn ein Helper neu eingeführt wurde (z. B. `isToggleableStateName` für `toggle()`), den Helper aktiv gegen die _Nachbar-Slices_ derselben Bug-Familie testen (`exclusive()`, `cycle()`, …). Eine RT pro Nachbar-Slice mit demselben Edge-Case (System-State im Body) ist die Versicherung, dass die Reform nicht nur den auditierten Slice, sondern die Familie deckt.
   - Alle 6 Prüf-Dimensionen gegen den neuen Stand re-verifizieren, **inklusive Cross-Backend-Konsistenz** (DOM ≡ React ≡ Framework-Export — wenn ein Backend ausgelassen wurde, ist der Slice nicht fertig) und **Studio-Roundtrip** (Click im Preview → Property-Panel → Code-Edit → DOM-Update bleibt konsistent)
   - Audit-Doc-Status auf `erledigt` erst nach diesem Pass; offene Sub-Tasks bleiben nicht als „done" verkleidet stehen — entweder umsetzen oder explizit als Follow-up dokumentieren mit Begründung warum verschoben
   - **Iterieren bis sauber:** der Review-Pass ist nicht ein einziger Durchlauf, sondern eine Schleife. Jede gefundene Issue (neue Drift, unehrliche Probe-Tabelle, fehlende RT, übersehene Cross-Slice-Wirkung) wird gefixt, danach wird der gesamte Review-Pass _erneut_ durchlaufen — denn der Fix kann selbst neue Issues erzeugen. Erst wenn ein vollständiger Durchlauf 0 neue Findings produziert, ist der Slice review-fertig. „Wir machen's beim nächsten Slice" ist Drift-Hülle, nicht Abschluss.
8. **Quality-Gate vor Slice-Abschluss:** Wer fragt „ist das jetzt richtig gut?" muss eine ehrliche Antwort bekommen können. Solange die Antwort „substantiell besser, aber …" lautet, ist der Slice nicht fertig — entweder die Lücken schliessen oder den Status präzise zurücksetzen.

**Reihenfolge:**

1. Fundament zuerst (Slices 1–25): Layout, Styling, Komponenten, Tokens
2. States & Daten (26–49)
3. Inhalt & Patterns (50–66)
4. Studio-Loops (67–84)
5. CLIs & Export (85–88)

---

## Prüf-Dimensionen

1. **Architektur** — Modulgrenzen, Abhängigkeiten, Patterns, passt der Slice zur Gesamtstruktur?
2. **Codequalität** — Lesbarkeit, Naming, Komplexität, Duplikation, Clean-Code-Prinzipien, **Dead Code** (ungenutzte Exports/Branches/Files)
3. **Testqualität** — sind Tests sinnvoll, robust, deterministisch, gute Assertions?
4. **Testabdeckung** — was wird abgedeckt, was nicht (Edge-Cases, Fehlerpfade)?
5. **Funktionale Korrektheit** — tut der Slice tatsächlich, was DSL/Tutorial verspricht? Inkl. Cross-Backend-Konsistenz (DOM ≡ React ≡ Framework-Export) und DX (Fehlermeldungen bei kaputtem Input)
6. **Studio-Roundtrip** — Code ↔ Preview ↔ Property-Panel ↔ Drag/Resize-Handles: bleibt der Slice an jeder Edit-Quelle konsistent?

---

## Audit-Status

| #   | Slice                                     | Status                                                                                                           | Dokument                                                     |
| --- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 24  | Single-Value-Token                        | erledigt                                                                                                         | [24-tokens.md](24-tokens.md)                                 |
| 1   | Frame-Container                           | erledigt                                                                                                         | [01-frame.md](01-frame.md)                                   |
| 25  | Property-Set-Token                        | erledigt                                                                                                         | [25-property-set-tokens.md](25-property-set-tokens.md)       |
| 21  | Komponenten-Definition & -Verwendung      | Phase A erledigt · B/C verschoben                                                                                | [21-komponenten.md](21-komponenten.md)                       |
| 26  | System-States                             | DOM+Sync erledigt · Browser-CDP+Studio-Roundtrip offen                                                           | [26-system-states.md](26-system-states.md)                   |
| 27  | Custom-State `toggle()`                   | DOM+Sync erledigt · Browser-CDP+Studio-Roundtrip offen                                                           | [27-toggle.md](27-toggle.md)                                 |
| 78  | Token-Picker (Studio)                     | erledigt                                                                                                         | [78-token-picker.md](78-token-picker.md)                     |
| 29  | `exclusive()`                             | DOM+Sync erledigt · Browser-CDP+Studio-Roundtrip offen                                                           | [29-exclusive.md](29-exclusive.md)                           |
| 28  | Multi-State-Cycle                         | Compile+Sync erledigt · Browser-CDP+Studio-Roundtrip offen                                                       | [28-multi-state-cycle.md](28-multi-state-cycle.md)           |
| 2   | Vertical Stack (`gap N`)                  | erledigt (Phase 1 + Phase 2: gap-x/gap-y, Chain in React, Shorthand)                                             | [02-vertical-stack.md](02-vertical-stack.md)                 |
| 3   | Horizontal Stack (`hor`/wrap/spread)      | erledigt — V-1 React-Defaults gelocked (B-1); V-2/V-3a deferred mit Code-Kommentar + Test-Lock; 31 RTs grün      | [03-horizontal-stack.md](03-horizontal-stack.md)             |
| 30  | Cross-Element-State                       | Compile+Validator+Sync erledigt · Browser-CDP+Studio-Roundtrip offen                                             | [30-cross-element-state.md](30-cross-element-state.md)       |
| 6   | Grid 12-col                               | Audit erledigt · Phase A offen (React Grid-Support, Framework Grid-Children, Token-Resolution)                   | [06-grid.md](06-grid.md)                                     |
| 4   | 9-Positions                               | erledigt — V-1 React-9-zone-Lookup, V-2 Framework reverse-map, V-3 E115 grid+flex-alignment, 63 RT-Subtests grün | [04-9-positions.md](04-9-positions.md)                       |
| 5   | center / spread / ver-center / hor-center | erledigt — V-1 `singleAxisCenterToFlex` Helper, V-2 React-Backend wired, V-3 Cross-Backend-Tabelle (22 RTs grün) | [05-center-spread.md](05-center-spread.md)                   |
| 7   | Grid mit expliziter Position              | Audit erledigt · Phase A (Token x/y) + B (IR-Cleanup) + C (Studio-Roundtrip) offen                               | [07-grid-explicit-position.md](07-grid-explicit-position.md) |

---

## Capability-Slices

### 1. Layout & Sizing (12)

1. **Frame-Container** — leerer Frame rendert als `<div>`
2. **Vertical Stack** — `gap N` zwischen Kindern
3. **Horizontal Stack** — `hor`, gap, optional `wrap`
4. **9-Positions** — `tl`/`tc`/`tr`/`cl`/`center`/`cr`/`bl`/`bc`/`br`
5. **center / spread / ver-center / hor-center**
6. **Grid 12-col** — `grid 12`, `w 4`, `row-height`
7. **Grid mit expliziter Position** — `x`/`y`/`w`/`h`
8. **Stacked-Overlay** — Kinder übereinander
9. **Padding** — `pad N`, `pad-x/y/t/r/b/l`, Kombinationen
10. **Margin** — `mar`, `mar-x/y/t/r/b/l`
11. **Sizing** — `w/h`, `full`/`hug`, `minw/maxw`, `grow/shrink`, `aspect`
12. **Device-Presets** — `mobile`/`tablet`/`desktop` als Frame oder Canvas

### 2. Styling (8)

13. **Farben** — Hex, Named, rgba, Hex+Alpha
14. **Gradients** — `grad`/`grad-ver`/`grad 45`
15. **Border** — `bor`, `boc`, side-spezifisch (`bor 0 0 1 0`)
16. **Radius** — inkl. `rad 99` (Kreis)
17. **Typografie** — `fs`/`weight`/`font`/`italic`/`underline`/`uppercase`/`line`/`truncate`/`text-align`
18. **Effekte** — `shadow sm/md/lg`, `opacity`, `blur`, `backdrop-blur`
19. **Sichtbarkeit & Overflow** — `hidden`/`visible`/`clip`/`scroll`
20. **Cursor**

### 3. Komponenten & Tokens (5)

21. **Komponenten-Definition & -Verwendung** — `Btn:` / `Btn "Text"`, Property-Override an Use-Site
22. **`as`-Inheritance** — `PrimaryBtn as Button: ...`, mehrstufig (`as Btn`)
23. **Kind-Slots** — `Card: ... \n Title: ... \n Desc: ...` + Use-Site mit benannten Slots
24. **Single-Value-Token** — `primary.bg:`, Suffix-Mapping bei `bg $primary`
25. **Property-Set-Token** — `btnbase: pad ..., rad ...` + Mehrfach-Spread

### 4. States & Animationen (8)

26. **System-States** — `hover:`/`focus:`/`active:`/`disabled:`
27. **Custom-State `toggle()`** — Klick wechselt 2 Bodies
28. **Multi-State-Cycle** — todo → doing → done bei wiederholtem Klick
29. **`exclusive()`** — Tab-Gruppe, nur einer aktiv
30. **Cross-Element-State** — `MenuBtn.open: visible`
31. **Initialer State** — `Btn "Aktiv", on`
32. **State-Transitions** — `hover 0.15s:`, `on 0.2s ease-out:`
33. **Animation-Presets** — `anim pulse/bounce/shake/spin`

### 5. Funktionen / Aktionen (10)

34. **Sichtbarkeit** — `show(X)`, `hide(X)`
35. **Counter** — `increment`/`decrement`/`set`/`reset`
36. **Toast-Varianten** — default/error/warning/info × Positionen
37. **Input-Control** — `focus(F)`/`clear(F)`/`setError`/`clearError`
38. **Navigation** — `navigate(View)`/`back()`/`forward()`/`openUrl(...)`
39. **Scroll** — `scrollToTop`/`scrollToBottom`/`scrollTo(Section)`
40. **Clipboard** — `copy("...")` + Toast-Kombi
41. **CRUD** — `add(list, ...)` / `remove(item)` (mit `each`)
42. **Action-Verkettung** — mehrere Funktionen pro Element
43. **List-Nav** — `loop-focus`, `typeahead`, `highlightNext/Prev`, `selectHighlighted`

### 6. Daten & Bedingungen (6)

44. **Variablen** — `name: ...`, `$name`, Interpolation in Strings
45. **Verschachtelte Objekte** — `user.name`/`user.role`
46. **Sammlungen + `each`** — Iteration
47. **Aggregationen** — `.count`/`.first`/`.last`
48. **Block-Conditional** — `if`/`else`, Vergleichs- und Bool-Ops
49. **Inline-Ternary + `bind`** — `done ? "X" : "Y"`, `bind varName`

### 7. Inhalt-Primitives (8)

50. **Lucide-Icons** — Name, `is`, `ic`, `fill`
51. **Custom-Icons-Registry** — `$icons:` mit Pfad-Daten
52. **Image** — `src`, Sizing
53. **Link** — `href`
54. **Input** — placeholder, type, disabled
55. **Input-Mask** — `###.####`/`AAA-###`/`##'###.##`
56. **Tabellen** — statisch, datengebunden, `where`/`by`
57. **Charts** — Line/Bar/Pie/Donut/Area + Title/Axes/Grid/Point/Line

### 8. UI-Patterns (Pure-Mirror + Zag) (8)

58. **Dialog** — Trigger/Backdrop/Content/CloseTrigger
59. **Tooltip** — Trigger/Content + `positioning`
60. **Tabs** — `defaultValue`, mehrere `Tab`s
61. **Select** — Trigger + Items, `trigger-text`, Keyboard-Nav
62. **Checkbox / Switch** — `checked`, Toggle-Verhalten
63. **Slider** — value/min/max/step
64. **RadioGroup** — `value`, `RadioItem value "..."`
65. **DatePicker (Zag)** — selectionMode/range/min/max/locale

### 9. Prose-Mode (1)

66. **Prose-Body** — `, prose` mit Markdown-Untermenge (Absätze/`-`/`1.`/`#`/Bold/Italic) → `BodyTxt`/`DashItem`/`H2`-Mappings

### 10. Studio Edit-Loops (10)

67. **Paste DSL → Preview rendert**
68. **Bidirektionaler Sync** — Code-Edit ↔ Preview-Update; Klick im Preview → Cursor im Code
69. **Property-Panel-Roundtrip** — Klick im Preview → Properties anzeigen → ändern → Code-Update
70. **Drag & Resize** — Direktmanipulation aktualisiert Code
71. **Padding/Margin/Gap-Handles** — visuelle Spacing-Editierung
72. **Snap** — Alignment / Grid-Cell / Spacing
73. **Smart-Guides** — Live-Linealien während Drag
74. **Multi-Selection + Distribution** — gleichmäßige Abstände
75. **Drop aus Komponenten-Panel** — in Preview oder Editor
76. **Inline-Edit + F2-Rename** — Text-Slot ändern, Komponenten/Token umbenennen über alle Verwendungen

### 11. Studio Pickers & AI & Tooling (12)

77. **Color-Picker-Trigger im Code** — Hex-Wert öffnet Picker
78. **Token-Picker** — kontextabhängige Token-Liste
79. **Icon-Picker** — Lucide-Suche + Custom
80. **Animation-Picker** — Preset wählen
81. **AI-Sketch-Block** — `-- ... --` → AI generiert Mirror-Code
82. **AI-Edit** — Selektion + Prompt → Patch
83. **Smart-Paste / Image-Drop** — Bild → Mirror-Code
84. **Undo/Redo** — Command-Pattern über alle Edit-Quellen
85. **`mirror-build` CLI** — Single-File + Project, `--minify`, `--external-*`, `--watch`
86. **`mirror-compile` CLI** — JS- und React-Output, `--project`
87. **`mirror-validate` CLI** — Schema-Errors, `--json`
88. **Export-Pipeline** — React/Vue/Svelte/Vanilla, `--snapshot`, `--incremental`, `--run`
