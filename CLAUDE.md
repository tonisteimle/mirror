# Mirror

DSL für rapid UI prototyping. Kompiliert zu DOM oder React.

## Projekt-Übersicht

```
src/                    # Core Compiler (TypeScript)
├── parser/            # Lexer & Parser → AST
├── ir/                # AST → IR Transformation
├── backends/          # IR → DOM/React Code
├── runtime/           # DOM Runtime (Events, States)
├── validator/         # Schema-basierter Code Validator
├── schema/            # DSL Schema (Single Source of Truth)
└── studio/            # Property Panel, Code Modifier, SourceMap

studio/                # Studio Runtime (TypeScript) - Modulare Architektur
├── core/              # State, Events, Commands, Executor
├── modules/           # Feature-Module
│   ├── file-manager/  # File Operations, Storage
│   └── compiler/      # Compiler Wrapper, Prelude Builder
├── pickers/           # UI Pickers
│   ├── base/          # BasePicker, KeyboardNav
│   ├── color/         # ColorPicker mit Paletten
│   ├── token/         # TokenPicker mit Kontext
│   ├── icon/          # IconPicker (70+ Icons)
│   └── animation/     # AnimationPicker (20+ Presets)
├── panels/            # UI Panels
│   ├── property/      # PropertyPanel
│   ├── tree/          # AST Tree Navigation
│   └── files/         # File Management UI
├── preview/           # Preview Controller & Renderer
├── sync/              # Editor ↔ Preview Synchronisation
├── editor/            # CodeMirror Controller
├── autocomplete/      # Completions
├── llm/               # LLM Integration
├── bootstrap.ts       # Initialisierung
├── app.js             # Legacy UI
├── index.html         # Entry Point
└── styles.css         # Styling

docs/architecture/     # Architektur-Dokumentation
├── ARCHITECTURE.md    # Übersicht & Datenfluss
├── MIGRATION-PLAN.md  # Refactoring-Plan
├── MODULES.md         # Interface-Spezifikationen
└── TESTING.md         # Test-Strategie

features/              # Feature-Dokumentation & Tests
dist/                  # Build Output
```

## Wichtige Dateien

| Datei | Beschreibung |
|-------|--------------|
| `studio/bootstrap.ts` | Architektur Entry Point |
| `studio/core/state.ts` | Single Source of Truth |
| `studio/modules/file-manager/` | File Operations |
| `studio/modules/compiler/` | Compiler Wrapper |
| `studio/pickers/` | Color, Token, Icon, Animation Picker |
| `studio/panels/` | Property, Tree, Files Panel |
| `src/ir/index.ts` | IR-Transformation, SourceMap |
| `src/backends/dom.ts` | DOM Code-Generator |
| `src/studio/code-modifier.ts` | Code-Änderungen |
| `src/schema/dsl.ts` | DSL Schema (Single Source of Truth) |
| `src/validator/index.ts` | Code Validator API |

## Commands

```bash
npm run build          # Compiler bauen
npm run build:studio   # Studio Runtime bauen
npm test               # Tests ausführen
npm run validate       # Code validieren (z.B. npm run validate app.mirror)
./deploy.sh            # Production Deploy
```

## Architektur

Siehe `docs/architecture/` für detaillierte Dokumentation:

- **ARCHITECTURE.md** - System-Übersicht, Datenfluss, Module
- **MIGRATION-PLAN.md** - Schrittweiser Plan zur Modularisierung
- **MODULES.md** - Interface-Definitionen aller Module
- **TESTING.md** - Test-Strategie und Beispiele
- **VALIDATOR.md** - Code-Validator Dokumentation

### Kern-Konzepte

| Konzept | Beschreibung |
|---------|--------------|
| **State Store** | Single Source of Truth in `studio/core/state.ts` |
| **Event Bus** | Lose Kopplung via Events |
| **Command Pattern** | Undo/Redo für alle Änderungen |
| **SourceMap** | Bidirektionales Editing (Preview ↔ Code) |
| **SyncCoordinator** | Editor ↔ Preview ↔ Panel Sync |

## Cache Busting

Bei Änderungen an `studio/app.js` oder `studio/styles.css`:
→ Version in `studio/index.html` erhöhen (`?v=N`)

## DSL Kurzreferenz

```
SYNTAX      Component property value, property2 value2
            Name: = Definition | Name = Instanz
            Child as Parent: = Vererbung

LAYOUT      hor, ver, gap N, spread, wrap, center, stacked, pos, grid N
SIZE        w/h hug/full/N, minw, maxw, minh, maxh
SPACING     pad N, pad left N, margin N
COLOR       bg #hex, col #hex, boc #hex
BORDER      bor 1 #333, rad 8

STATES      hover, focus, active, disabled
            state selected, state highlighted, state on/off

EVENTS      onclick, onhover, onfocus, onblur, onchange, oninput
            onkeydown enter: action

ACTIONS     show, hide, toggle, open, close
            select, highlight, activate, deactivate
            page, call, assign

TOKENS      $name.bg: #hex    → bg $name.bg
            $name.pad: N      → pad $name.pad
```

<!-- GENERATED:DSL-PROPERTIES:START -->

## DSL Reference (auto-generated)

### Primitives

| Primitive | HTML | Aliases |
|-----------|------|---------|
| Box | `<div>` | - |
| Frame | `<div>` | Box |
| Text | `<span>` | - |
| Button | `<button>` | - |
| Input | `<input>` | - |
| Textarea | `<textarea>` | - |
| Label | `<label>` | - |
| Select | `<select>` | - |
| Option | `<option>` | - |
| Checkbox | `<input>` | - |
| Radio | `<input>` | - |
| Image | `<img>` | Img |
| Icon | `<span>` | - |
| Link | `<a>` | - |
| Slot | `<div>` | - |
| Divider | `<hr>` | - |
| Spacer | `<div>` | - |
| Header | `<header>` | - |
| Nav | `<nav>` | - |
| Main | `<main>` | - |
| Section | `<section>` | - |
| Article | `<article>` | - |
| Aside | `<aside>` | - |
| Footer | `<footer>` | - |
| H1 | `<h1>` | - |
| H2 | `<h2>` | - |
| H3 | `<h3>` | - |
| H4 | `<h4>` | - |
| H5 | `<h5>` | - |
| H6 | `<h6>` | - |

### Properties

| Property | Aliases | Werte |
|----------|---------|-------|
| width | w | full, hug, <number>, $token |
| height | h | full, hug, <number>, $token |
| size | - | full, hug, <number>, $token |
| min-width | minw | <number>, $token |
| max-width | maxw | <number>, $token |
| min-height | minh | <number>, $token |
| max-height | maxh | <number>, $token |
| aspect | - | square, video, <number> |
| horizontal | hor | *(standalone)* |
| vertical | ver | *(standalone)* |
| gap | g | <number>, $token |
| center | cen | *(standalone)* |
| spread | - | *(standalone)* |
| wrap | - | *(standalone)* |
| stacked | - | *(standalone)* |
| pos | positioned | *(standalone)* |
| grid | - | auto, <number> |
| grow | - | *(standalone)* |
| shrink | - | *(standalone)* |
| align | - | top, bottom, left, right, center |
| left | - | *(standalone)* |
| right | - | *(standalone)* |
| top | - | *(standalone)* |
| bottom | - | *(standalone)* |
| hor-center | - | *(standalone)* |
| ver-center | - | *(standalone)* |
| padding | pad, p | <number>, $token |
| margin | m | <number>, $token |
| background | bg | <color>, $token |
| color | col, c | <color>, $token |
| border-color | boc | <color>, $token |
| border | bor | <number>, $token |
| radius | rad | <number>, $token |
| font-size | fs | <number>, $token |
| weight | - | thin, light, normal, medium, semibold, bold, black, <number> |
| line | - | <number>, $token |
| font | - | sans, serif, mono, $token |
| text-align | - | left, center, right, justify |
| italic | - | *(standalone)* |
| underline | - | *(standalone)* |
| uppercase | - | *(standalone)* |
| lowercase | - | *(standalone)* |
| truncate | - | *(standalone)* |
| x | - | <number> |
| y | - | <number> |
| z | - | <number> |
| absolute | abs | *(standalone)* |
| fixed | - | *(standalone)* |
| relative | - | *(standalone)* |
| rotate | rot | <number> |
| scale | - | <number> |
| translate | - | <number> |
| opacity | o, opa | <number> |
| shadow | - | sm, md, lg |
| cursor | - | pointer, grab, move, text, wait, not-allowed |
| blur | - | <number> |
| backdrop-blur | blur-bg | <number> |
| hidden | - | *(standalone)* |
| visible | - | *(standalone)* |
| disabled | - | *(standalone)* |
| scroll | scroll-ver | *(standalone)* |
| scroll-hor | - | *(standalone)* |
| scroll-both | - | *(standalone)* |
| clip | - | *(standalone)* |

### Events

| Event | DOM | Key? |
|-------|-----|------|
| onclick | click | - |
| onhover | mouseenter | - |
| onfocus | focus | - |
| onblur | blur | - |
| onchange | change | - |
| oninput | input | - |
| onkeydown | keydown | ✓ |
| onkeyup | keyup | ✓ |
| onclick-outside | click-outside | - |
| onload | load | - |
| onenter | enter | - |
| onexit | exit | - |

### Actions

| Action | Targets |
|--------|---------|
| show | - |
| hide | - |
| toggle | - |
| open | - |
| close | - |
| select | - |
| highlight | next, prev, first, last |
| activate | - |
| deactivate | - |
| page | - |
| call | - |
| assign | - |
| focus | - |
| blur | - |
| submit | - |
| reset | - |
| navigate | - |

### States

**System:** hover, focus, active, disabled

**Custom:** selected, highlighted, expanded, collapsed, on, off, open, closed, filled, valid, invalid, loading, error

### Keyboard Keys

escape, enter, space, tab, backspace, delete, arrow-up, arrow-down, arrow-left, arrow-right, home, end

<!-- GENERATED:DSL-PROPERTIES:END -->

## Feature-Docs

Detaillierte Dokumentation in `features/`:
- `token-picker/` - $ Trigger, Kontext-Erkennung
- `colorpicker/` - Smart Positioning, Keyboard Nav
- `autocomplete/` - Property Completions
- `propertypanel/` - Element Selection, Property Editing
