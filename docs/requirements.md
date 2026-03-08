# Mirror Requirements

Übersicht aller Features in Mirror v2.

## Core Compiler ✅

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Parser | ✅ | Vollständiger Lexer und Parser |
| IR | ✅ | Intermediate Representation |
| DOM Backend | ✅ | Pure JavaScript Output |
| React Backend | ✅ | React Components Output |
| Static Backend | ✅ | HTML Output |
| Source Maps | ✅ | Bidirektionales Editing |

## DSL Features ✅

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Tokens | ✅ | Design-Variablen mit $-Prefix |
| Token Groups | ✅ | Gruppierte Tokens mit Punkt-Notation |
| Components | ✅ | Komponentendefinitionen |
| Primitives | ✅ | frame, text, button, input, icon, etc. |
| Inheritance | ✅ | `as Parent:` Syntax |
| Slots | ✅ | Kind-Platzhalter |
| Named Instances | ✅ | `named` Keyword |
| Child Overrides | ✅ | Semicolon-Syntax |

## Properties ✅

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Layout | ✅ | hor, ver, gap, spread, wrap, grid |
| Alignment | ✅ | left, right, top, bottom, center |
| Sizing | ✅ | width, height, hug, full, min/max |
| Spacing | ✅ | padding, margin mit Richtungen |
| Colors | ✅ | bg, col, boc |
| Border | ✅ | bor, rad mit Richtungen |
| Typography | ✅ | font-size, weight, line, etc. |
| Icons | ✅ | icon-size, icon-weight, fill |
| Visual | ✅ | opacity, shadow, cursor, z |
| Scroll | ✅ | scroll, scroll-hor, scroll-both, clip |
| Hover | ✅ | hover-bg, hover-col, etc. |

## States ✅

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| System States | ✅ | hover, focus, active, disabled, filled |
| Behavior States | ✅ | highlighted, selected, expanded, etc. |
| Initial States | ✅ | closed, open, collapsed |
| State Blocks | ✅ | `state name` mit Einrückung |
| Inline States | ✅ | `state name prop val` |
| State Child Overrides | ✅ | Children in States ändern |

## Events ✅

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Click Events | ✅ | onclick, onclick-outside |
| Hover Events | ✅ | onhover |
| Input Events | ✅ | onchange, oninput, onfocus, onblur |
| Keyboard Events | ✅ | onkeydown KEY:, onkeyup KEY: |
| Keys Block | ✅ | Gruppierte Keyboard-Handler |
| Timing | ✅ | debounce, delay |

## Actions ✅

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Toggle | ✅ | toggle |
| Visibility | ✅ | show, hide, open, close |
| Selection | ✅ | highlight, select, deselect |
| Navigation | ✅ | highlight next/prev/first/last |
| State Changes | ✅ | change, activate, deactivate |
| JavaScript | ✅ | call functionName |

## Data & Logic ✅

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Conditionals | ✅ | if/else Blocks |
| Ternary | ✅ | prop cond ? val : val2 |
| Each Loops | ✅ | each item in collection |
| Filters | ✅ | where Bedingungen |
| Data Binding | ✅ | data collection |
| Selection Binding | ✅ | selection variable |

## Animations ✅

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Show/Hide | ✅ | fade, scale, slide-* |
| Continuous | ✅ | spin, pulse, bounce |

---

## Feature-Dokumentation

Detaillierte Spezifikationen in `features/`:

| Feature | Verzeichnis | Status |
|---------|-------------|--------|
| Dropdown | `features/dropdown/` | ✅ |
| Navigation | `features/navigation/` | ✅ |
| Autocomplete | `features/autocomplete/` | ✅ |
| Icon Picker | `features/iconpicker/` | ✅ |
| Token Picker | `features/token-picker/` | ✅ |
| Image Upload | `features/image-upload/` | ✅ |
| Property Panel | `features/propertypanel/` | ✅ |
| Canvas Drag-Drop | `features/canvas-drag-drop/` | ✅ |
| Data Binding | `features/data/` | ✅ |
| Import | `features/import/` | ✅ |
| React Mode | `features/react-mode/` | 🔄 |
| React Validation | `features/react-validation/` | 🔄 |

---

## Studio (Visual Editor) ✅

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Property Panel | ✅ | Visuelles Bearbeiten |
| Code Editor | ✅ | CodeMirror Integration |
| Live Preview | ✅ | Echtzeitvorschau |
| Autocomplete | ✅ | Intelligente Vorschläge |
| Color Picker | ✅ | Farbauswahl UI |
| Icon Picker | ✅ | Icon-Auswahl UI |
| Token Picker | ✅ | Token-Auswahl UI |
| Drag & Drop | ✅ | Canvas-Interaktionen |
| Source Mapping | ✅ | Code ↔ Preview Sync |

---

## Tests

| Bereich | Anzahl | Status |
|---------|--------|--------|
| E2E Tests | 1000+ | ✅ |
| Parser Tests | ~100 | ✅ |
| IR Tests | ~50 | ✅ |
| Backend Tests | ~100 | ✅ |
| Runtime Tests | ~50 | ✅ |
| Studio Tests | ~50 | ✅ |

---

*Stand: März 2026*
