# Realistic User Demo — Feature Inventory

> Planungsartefakt für ein „Realistic User"-Demo, das einen kompletten UI-Bau
> end-to-end zeigt. Inventur stammt aus einer Code-Exploration über alle
> Studio-Surfaces. CLAUDE.md ist für die DSL die Referenz; dieses Doc
> ergänzt das, was Mirror Studio _selber_ als UI-Surface anbietet.
>
> **Status:** Hauptpfade (Drop, Selection, Property-Panel, Pickers, Inline-
> Edit, `::`-Extraktion, AI-Prompt, Visual Handles, Multi-File) sind durch
> die Notion-Settings-Demo (`tools/test-runner/demo/scripts/notion-
settings.ts`) end-to-end verifiziert. Die drei Refactoring-Tastaturen
> (`Cmd+D`, `Cmd+G`, Right-Click-Context-Menü) werden ad-hoc von
> `_verify-triggers.ts` bestätigt — Cmd+D + Right-Click-Menü brauchen
> ein Element MIT Parent (Root-Elemente lehnen Duplicate ab), Cmd+G
> braucht Multi-Selection ≥2.

## Surface: Component Panel (Palette)

### Layout-Komponenten

- **Trigger:** Klick auf "Row" / "Column" / "Grid" / "Stack" / "Fill"
- **Code:** `studio/panels/components/layout-presets.ts:14-65`
- **Effekt:** Frame mit `hor`, `grid 3`, `stacked` etc. einfügen

### UI-Komponenten (built-in)

- **Trigger:** Klick auf Button / Checkbox / Switch / Dialog / Tabs / Select / RadioGroup / Slider / DatePicker / …
- **Code:** `studio/panels/components/component-templates.ts:25-104`
- **Effekt:** Pure-Mirror-Templates expandieren bei Drop, Definition + Instanz werden eingefügt
- **Notiz:** ~25 Komponenten in `Components` Sektion

### User-Komponenten (`.com`-Files)

- **Trigger:** Klick in „MyComponents"-Sektion (nur sichtbar wenn `.com`-Files existieren)
- **Code:** `studio/panels/components/user-components-panel.ts:80-150`
- **Effekt:** Instanz der user-defined Komponente einfügen

### Drag aus Palette

- **Trigger:** Click+Drag aus Component Panel ins Preview
- **Code:** `studio/drop/drop-service.ts`, `studio/drop/handlers/palette-drop.ts`
- **Effekt:** Element an Drop-Position einfügen; respektiert Hierarchie / Insertion-Strategy

## Surface: Property Panel

> Sektionen erscheinen kontextabhängig (was ist selektiert, welche Properties sind valide).

| Sektion         | Properties                                                                       | Trigger                                  |
| --------------- | -------------------------------------------------------------------------------- | ---------------------------------------- |
| Layout          | `hor`/`ver`, `gap`, `wrap`, `grid N`, `center`/`spread`, 9-Zonen                 | Buttons / Toggles                        |
| Sizing          | `w`/`h` (Pixel/full/hug), `minw`/`maxw`, `grow`/`shrink`, `aspect`               | Inputs / Slider                          |
| Spacing         | `pad` (alle Seiten / x / y / einzeln), `mar`, `gap`                              | Inputs + P/M/G Toggle für Visual Handles |
| Colors          | `bg`, `col`, `boc`, `ic`                                                         | Klick auf Swatch → Color Picker öffnet   |
| Typography      | `fs`, `weight`, `font`, `line`, `text-align`, `uppercase`/`lowercase`/`truncate` | Inputs / Dropdowns                       |
| Border & Radius | `bor`, `boc`, `rad`                                                              | Inputs                                   |
| Effects         | `shadow sm/md/lg`, `opacity`, `blur`, `blur-bg`, `cursor`                        | Inputs / Dropdowns                       |
| Animation       | `anim presetName`                                                                | Trigger öffnet Animation Picker          |
| States          | `hover:`, `focus:`, `active:`, `disabled:`, custom                               | State-Row aufklappen                     |

### Component-Definition-Editor

- **Trigger:** Cursor auf `ComponentName:` Definition-Zeile setzen
- **Code:** `studio/panels/property/property-panel.ts:147+`
- **Effekt:** Property Panel zeigt globale Properties der Definition

## Surface: Color Picker

| Tab/Feature | Trigger                     | Effekt                                                   |
| ----------- | --------------------------- | -------------------------------------------------------- |
| Palette     | öffnet sich per Default     | Tailwind / Open Colors / Material / Grays / Quick Colors |
| Custom      | Tab "Custom"                | HSV-Canvas + Hex-Input + RGBA                            |
| Gradient    | Property Panel Modus-Toggle | `bg grad`, `bg grad-ver`, `bg grad N`                    |
| Recent      | autom. getrackt             | letzte ~10 Farben quick-access                           |

**Code:** `studio/pickers/color/index.ts`, `studio/pickers/color/full-picker.ts`

## Surface: Token Picker

- **Trigger:** Klick auf `$`-Trigger neben Property-Wert (Color / Spacing / Size / Font)
- **Code:** `studio/pickers/token/index.ts`
- **Features:** Token-Suche, Gruppierung nach Kategorie-Präfix (`primary.bg`, `space.pad`)
- **Notiz:** Trigger nur sichtbar wenn `tokens.tok` oder Token-Definitionen vorhanden

## Surface: Icon Picker

- **Trigger:** Icon-Trigger erscheint wenn `Icon`-Element selektiert
- **Code:** `studio/pickers/icon/index.ts`
- **Features:** ~1000 Lucide-Icons (CDN), Live-Search, Kategorien (general / arrows / media / symbols), Recent (12)

## Surface: Animation Picker

- **Trigger:** Animation-Trigger im Property Panel (wenn Element animation property unterstützt)
- **Code:** `studio/pickers/animation/presets.ts`
- **Presets:** ~15 (fade-in/out, slide 4×, bounce, pulse, shake, spin, scale-in/out, reveal-\*)

## Surface: Preview (Visual Editing)

### Selektion

- **Single-Select:** Klick auf Element
- **Multi-Select:** Shift- oder Cmd/Ctrl-Klick auf weitere Elemente
- **Code:** `studio/preview/index.ts`, `addToMultiSelection()`

### Drag-Operationen

| Operation        | Trigger                                   | Effekt            |
| ---------------- | ----------------------------------------- | ----------------- |
| Insert (Palette) | Drag aus Component Panel                  | neues Element     |
| Reorder (Move)   | Drag selektiertes Element zu neuer Stelle | `MoveNodeCommand` |
| Duplicate (Drag) | Drag mit Alt/Option                       | Element kopieren  |

### Visual Handles

| Modus   | Toggle-Key | Effekt                                      | Code                               |
| ------- | ---------- | ------------------------------------------- | ---------------------------------- |
| Resize  | (default)  | 8 Eckpunkte, snap on Shift / no-snap on Alt | `studio/visual/resize-manager.ts`  |
| Padding | `P`        | innere Handles, ändert `pad-t/r/b/l`        | `studio/visual/padding-manager.ts` |
| Margin  | `M`        | äußere Handles, ändert `mar-t/r/b/l`        | `studio/visual/margin-manager.ts`  |
| Gap     | `G`        | Handles zwischen Children                   | `studio/visual/gap-manager.ts`     |

### Inline-Text-Edit

- **Trigger:** Doppelklick auf Text-Inhalt (Button / Text / H1-H6 / Label / Placeholder)
- **Code:** `studio/inline-edit/inline-edit-controller.ts`

### Breadcrumb / Context-Menu

- **Breadcrumb:** Klick auf Element-Pfad oberhalb Preview → springt im Tree
- **Context-Menu:** Rechtsklick → Group / Ungroup / Duplicate / Delete (verifizieren!)

## Surface: Keyboard-Shortcuts (Preview-Fokus)

> Verifizieren bevor in Demo eingebaut: `studio/preview/keyboard-handler.ts`

| Key                           | Effekt                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `H`                           | toggle horizontal (single: `hor` setzen, multi: in `Frame hor, gap 8` wrappen) |
| `V`                           | toggle vertical                                                                |
| `F`                           | smart full-dimension (analysiert Element-Form, w/h/beides)                     |
| `S`                           | toggle `spread` (space-between)                                                |
| `P` / `M` / `G`               | Padding / Margin / Gap Handles toggeln                                         |
| `Cmd/Ctrl + G`                | Group (Selection in Frame wrappen)                                             |
| `U` oder `Shift+Cmd/Ctrl + G` | Ungroup                                                                        |
| `Cmd/Ctrl + D`                | Duplicate                                                                      |
| `Delete` / `Backspace`        | Löschen                                                                        |
| `Escape`                      | Selection → Parent (oder Multi-Select clearen)                                 |
| `Enter`                       | Selection → erstes Child                                                       |
| Pfeiltasten                   | bei `x`/`y`-positionierten Elementen 1px verschieben (Shift = 10px)            |

## Surface: Code-Editor (CodeMirror)

### Autocomplete

- **Element/Property-Namen:** beim Tippen, manuell via `Ctrl+Space`
- **Tokens:** trigger via `$`
- **Komponenten:** Großbuchstabe am Zeilenanfang
- **Code:** `studio/autocomplete/index.ts`, `studio/autocomplete/schema-completions.ts`

### Draft Mode (AI-Prompt)

- **Trigger:** Zeile beginnt mit `--` (optional Indent), beliebiger Prompt-Text danach
- **Submit:** `Cmd/Ctrl + Enter` im Draft-Block
- **Code:** `studio/editor/draft-mode.ts`, Regex `/^(\s*)--\s*(.*)$/`
- **Effekt:** AI generiert Code, ersetzt Draft-Zeilen
- **Notiz:** Anthropic SDK Agent in Settings aktivieren

### Smart Paste

- **Trigger:** Cmd/Ctrl + V mit Mirror-Code im Clipboard
- **Code:** `studio/editor/smart-paste.ts`
- **Effekt:** auto-Indent, Format-Adapt

### Undo/Redo

- **Trigger:** Cmd/Ctrl + Z / Shift+Cmd/Ctrl + Z
- **Code:** `studio/core/commands.ts` (`CommandExecutor`)
- **Notiz:** Unifizierter Stack — Code + Visual-Operations zusammen

## Surface: File Management (Multi-File)

| Aktion   | Trigger                            | Code                             |
| -------- | ---------------------------------- | -------------------------------- |
| New File | Right-click File-Tree → New File   | `studio/file-tree/controller.ts` |
| Switch   | Klick auf Filename                 | `onSelectFile()`                 |
| Rename   | Doppelklick / Right-click → Rename | `studio/files/inline-editor.ts`  |
| Delete   | Right-click → Delete               | confirmation dialog              |
| Reorder  | Drag in Tree                       | `studio/files/drag-drop.ts`      |

**Compile-Order:** `data → tokens → components → layouts → screens → root` (siehe CLAUDE.md)

## Surface: Tree Panel

- Klick auf Knoten → Selektion sync zum Preview
- Expand/Collapse via Pfeil
- Expand-All / Collapse-All Header-Buttons
- **Code:** `studio/panels/tree/index.ts`

## Surface: Activity Bar (Panel-Toggles)

| Icon                   | Effekt                         |
| ---------------------- | ------------------------------ |
| Property               | Property Panel an/aus          |
| Tree                   | Tree Panel an/aus              |
| Files                  | File Tree an/aus               |
| Chat                   | Chat Panel (Agent-Interaktion) |
| Settings (gear, unten) | öffnet Settings-Modal          |

**Code:** `studio/panels/explorer/activity-bar.ts`

## Surface: Settings-Modal

- **Trigger:** Settings-Icon (gear) in Activity Bar
- **Code:** `studio/panels/settings/settings-panel.ts` (centered modal seit Commit `2aaafa0`)
- **Sektionen:** Agent (enabled, type: Claude SDK / CLI), Snap-Settings (threshold, grid), View-Settings

## Surface: Sync (Preview ↔ Editor ↔ Property)

- **Preview-Klick → Editor-Cursor:** Element selektieren → Cursor springt zur Definition (sofern in aktueller Datei)
- **Editor-Edit → Preview:** debounced (~250ms), Selection bleibt
- **Property-Edit → Code:** SourceMap-präzise via CodeModifier; `SetPropertyCommand` für Undo
- **Code:** `studio/sync/`, `studio/core/change-pipeline.ts`

## Surface: AI-Agent

- **Draft-Submission:** `--` + Prompt + Cmd/Ctrl+Enter
- **Tools:** `studio/agent/tools/` — analyze / visual / validate (Agent-intern, nicht user-triggered)
- **Visual Feedback:** Loading + Streaming + Error → `studio/agent/visual-feedback.ts`
- **Abort:** Escape

## Cross-Cutting User-Workflows

Diese Kombinationen bilden realistische User-Journeys (relevant für Demo-Step-Auswahl):

1. **Visual Drop → Property Panel Tweak**
   Drop aus Palette → Click → Property Panel ändert Spacing/Color → Undo → Property erneut
2. **AI-First → Polish**
   `-- Card mit Header und Button` → Cmd+Enter → AI generiert → Color Picker im Property Panel → Inline-Edit eines Texts
3. **Multi-File Token-Workflow**
   Neue Datei `tokens.tok` → Tokens definieren → Datei wechseln zu `app.mir` → `bg $primary` mit Token Picker → Token-Wert ändern → live update überall
4. **Keyboard-Driven Layout**
   Drop Frame → `H` (horizontal) → `G` (Gap-Handles) → drag → `P` (Padding-Handles) → drag
5. **Hierarchie-Navigation**
   Click → `Escape` zum Parent → `Enter` zu erstem Child → Breadcrumb-Click → Tree-Panel
6. **Component-Customization**
   `Checkbox` aus Palette → Definition wird auto-eingefügt → Property Panel ändert Slot-Properties → alle Instanzen ziehen mit
7. **Multi-Select-Operations**
   Shift-Click 3 Elemente → Cmd+G (group) → `H` für horizontal → Gap-Handle → Cmd+D (duplicate)
8. **Token-System aufsetzen**
   `tokens.tok` neu → `primary.bg`, `space.gap`, `text.col` definieren → in `app.mir` per Token Picker referenzieren → einen Token-Wert ändern → globaler Effekt

## Orphan-Module (vorhanden, evtl. nicht user-erreichbar)

> Vor Demo-Scripting nicht antasten — könnten broken oder unvollständig sein.

- `studio/visual/constraints/` — Layout-Constraints UI nicht im Property Panel
- `studio/visual/smart-guides/` — Alignment-Guides existieren, nicht voll im Drag-Flow
- `studio/panels/chat-panel.ts` — UI da, Agent-Integration unklar
- `studio/mcp/` — MCP-Support, nicht UI-exposed
- alte Zag-Property-Handler (Rest aus Pre-Pure-Mirror-Migration)
- `studio/rename/` — Rename-Refactoring nicht UI-getriggert
- DSL `$icons` Custom-Icons — Parser unterstützt es, UI fehlt

## Nächste Schritte

1. **Verifikation** der wichtigsten Trigger via kleinem Probe-Skript (besonders Cmd+D / Cmd+G / Right-click-Menu / Inline-Edit-Element-Whitelist).
2. **Ziel-UI festlegen** (Settings-Screen / Dashboard / Login / Pricing-Page) — eine konkrete Vorlage, an der die Demo eine Erzählung haben kann, nicht eine Feature-Parade.
3. **Step-Sequenz designen** (~50–100 Steps), die durch die obigen Workflows mäandert und dabei die meisten Surfaces berührt.
4. **Realismus-Schicht:** Denkpausen, kleine Rückschritte, Multi-Pass (AI generiert → User korrigiert).
