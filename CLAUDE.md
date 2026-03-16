# Mirror

DSL für rapid UI prototyping. Kompiliert zu DOM oder React.

## Projekt-Übersicht

```
src/                    # Core Compiler (TypeScript)
├── parser/            # Lexer & Parser → AST
├── ir/                # AST → IR Transformation
├── backends/          # IR → DOM/React Code
├── runtime/           # DOM Runtime (Events, States)
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

## Commands

```bash
npm run build          # Compiler bauen
npm run build:studio   # Studio Runtime bauen
npm test               # Tests ausführen
./deploy.sh            # Production Deploy
```

## Architektur

Siehe `docs/architecture/` für detaillierte Dokumentation:

- **ARCHITECTURE.md** - System-Übersicht, Datenfluss, Module
- **MIGRATION-PLAN.md** - Schrittweiser Plan zur Modularisierung
- **MODULES.md** - Interface-Definitionen aller Module
- **TESTING.md** - Test-Strategie und Beispiele

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

LAYOUT      hor, ver, gap N, spread, wrap, center, stacked, grid N
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

## Feature-Docs

Detaillierte Dokumentation in `features/`:
- `token-picker/` - $ Trigger, Kontext-Erkennung
- `colorpicker/` - Smart Positioning, Keyboard Nav
- `autocomplete/` - Property Completions
- `propertypanel/` - Element Selection, Property Editing
