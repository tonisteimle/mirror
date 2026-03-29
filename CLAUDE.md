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

tests/                 # Test Suite
├── compiler/          # IR & Backend Tests
├── studio/            # Studio Component Tests
└── e2e/               # Playwright E2E Tests

docs/                  # Dokumentation
├── concepts/          # Feature-Konzepte (in Entwicklung)
└── generated/         # Auto-generierte Referenz
packages/mirror-lang/  # NPM Package
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

## Konventionen

- **Dateinamen**: Kleinbuchstaben mit Bindestrichen (`interaction-model.md`, nicht `INTERACTION-MODEL.md`)
- **Konzeptdokumente**: In `docs/concepts/` ablegen

## DSL Grundkonzepte

### 1. Primitives & Properties
Primitives sind die Basis-Elemente (Frame, Text, Button, Input, Icon, etc.). Properties folgen dem Element, getrennt durch Kommas:
```
Frame w 200, h 100, bg #1a1a1a, rad 8
Text "Hello", col white, fs 16, weight bold
Button "Click", pad 12 24, bg #2563eb, col white
```

### 2. Hierarchie durch Einrückung
Kinder werden durch 2 Leerzeichen Einrückung definiert:
```
Frame pad 20, gap 12
  Text "Title", fs 18
  Text "Subtitle", col #888
  Frame hor, gap 8
    Button "OK"
    Button "Cancel"
```

### 3. Komponenten-Definition (`:` = Definition)
Eine Komponente fasst wiederverwendbare Styles zusammen. Der Name endet mit `:`:
```
// Definition
PrimaryBtn: = Button pad 12 24, bg #2563eb, col white, rad 8

// Verwendung (ohne :)
PrimaryBtn "Save"
PrimaryBtn "Cancel", bg #666
```

### 4. Komponenten mit Slots (WICHTIG!)
**Das zentrale Pattern für wiederverwendbare Layouts.** Kinder-Definitionen (mit `:`) werden automatisch zu benannten Slots:
```
// Definition - Kinder mit : definieren Slots
SidebarLayout: w full, h full, hor
  Sidebar: w 240, h full, pad 16, bg #1a1a1a
  Main: w full, h full, pad 24

// Verwendung - Slots OHNE : befüllen!
SidebarLayout
  Sidebar
    Text "Navigation"
    Button "Home"
  Main
    Text "Content Area"
```

Weiteres Beispiel:
```
// Definition
Card: bg #1a1a1a, rad 12, pad 16, gap 12
  Header: fs 18, weight bold
  Body: col #888
  Footer: hor, spread

// Verwendung (OHNE :)
Card
  Header "Titel"
  Body "Beschreibung hier..."
  Footer
    Button "Abbrechen"
    Button "OK"
```

**Wichtig:**
- Definition: `:` nach dem Namen
- Verwendung: KEIN `:` - nur der Slot-Name
- Slots haben semantische Namen (Sidebar, Main, Header, Body, Footer, etc.)

### 5. Vererbung (`as`)
Eine Komponente kann von einer anderen erben:
```
BaseCard: = Frame bg #1a1a1a, rad 12, pad 16
ClickableCard as BaseCard: = cursor pointer
  hover:
    bg #252525
```

### 7. Vorgefertigte Komponenten (Dialog, Tabs, etc.)
Komplexe UI-Komponenten haben vordefinierte Slots die befüllt werden:
```
Dialog
  Trigger
    Button "Open Dialog"
  Backdrop bg rgba(0,0,0,0.5)
  Content w 400, rad 12
    Text "Dialog Content"

Tabs
  List
    Trigger "Tab 1"
    Trigger "Tab 2"
  Content
    Text "Inhalt 1"
  Content
    Text "Inhalt 2"
```

### 8. Custom States
States definieren Zustände mit optionalen Modifiern:
```
Frame state selected              // Einfacher State
Frame state selected exclusive    // Nur einer gleichzeitig
Frame state on initial            // Startet aktiviert

// State-Styling in eigenem Block:
Frame state selected, pad 12
  Text "Item", col #888
  selected:
    bg #2563eb
    Text "Item", col white
```

### 9. Tokens (Design-Variablen)
Tokens werden mit `$` definiert. **Wichtig:** Bei der Definition MIT Typ-Suffix, bei der Verwendung OHNE Suffix (das Property zeigt den Typ):
```
// Definition: MIT Typ-Suffix (.bg, .col, .rad, .pad, .boc, etc.)
$primary.bg: #2563eb
$primary.col: white
$card.bg: #1a1a1a
$card.rad: 8
$spacing.pad: 16

// Hierarchische Tokens (Gruppe.Variante.Typ)
$colors.page.bg: #111
$colors.accent.bg: #2563eb
$space.md.pad: 16

// Verwendung: OHNE Typ-Suffix
// Das Property (bg, col, rad, pad) zeigt bereits den erwarteten Typ
Button bg $primary, col $primary, pad $spacing
Frame bg $colors.page, pad $space.md, rad $card
```

**Warum Suffixe?** Sie ermöglichen intelligentes IDE-Autocomplete: Bei `bg $` werden nur `.bg`-Tokens angezeigt, bei `rad $` nur `.rad`-Tokens.

### 10. Events & Actions
Events enden mit `:`, Actions folgen eingerückt:
```
Button "Delete"
  onclick:
    show ConfirmDialog      // Element anzeigen

Frame state open
  onclick:
    toggle self             // self = dieses Element
  onclick-outside:
    close self
```
Actions: `show`, `hide`, `toggle`, `open`, `close`, `select`, `highlight`, `focus`, `blur`, `submit`, `reset`

### 11. Element-Naming & Targeting
Elemente werden automatisch nach ihrem Typ oder State benannt:
```
Frame state open              // Heißt implizit "Frame" oder wird durch State identifiziert
Dialog                        // Heißt "Dialog"
  Trigger                     // Heißt "Trigger"
  Content                     // Heißt "Content"

// Targeting in Actions:
onclick:
  show Dialog                 // Zeigt das Dialog-Element
  toggle Dropdown             // Toggled Element mit state "Dropdown"
  close self                  // self = aktuelles Element
```

### 12. Hover/Focus Styling-Blocks
Zustands-Blöcke für bedingtes Styling:
```
Button "Hover me", bg #333, col white
  hover:
    bg #2563eb
    col white
    scale 1.05
  focus:
    boc #2563eb
  active:
    bg #1d4ed8
  disabled:
    opacity 0.5
```

### 13. String-Content (Text & Buttons)
Text-Inhalt kann inline oder als Kind definiert werden:
```
// Inline (kurz)
Text "Hello World"
Button "Click me"

// Als Kind (für komplexere Fälle)
Button
  "Click me"
  Icon "arrow-right"

// Dynamisch mit Variablen
Text $userName
Text "Hello, " + $name + "!"
```

### 14. Icons (Lucide)
Icons verwenden Lucide-Namen mit `ic` (color) und `is` (size):
```
Icon "check", ic #10b981, is 20
Icon "x", ic red, is 16
Icon "arrow-right", ic white, is 14

// In Buttons
Button "Save", bg #2563eb
  Icon "save", ic white, is 16
```
Verfügbar: Alle [Lucide Icons](https://lucide.dev/icons/) (z.B. `check`, `x`, `arrow-right`, `settings`, `user`, `mail`, `search`, etc.)

---

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

TOKENS      $name.bg: #hex    → bg $name     (Definition MIT Suffix)
            $name.pad: N      → pad $name    (Verwendung OHNE Suffix)

CONDITIONALS visible when Element state
             visibleWhen $variable

LOOPS       each item in Items
            data Items, selection $selected

MODIFIERS   debounce N, delay N
            enter: anim, exit: anim
```

<!-- GENERATED:DSL-PROPERTIES:START -->

## DSL Reference (auto-generated)

### Primitives

| Primitive | HTML | Aliases |
|-----------|------|---------|
| Frame | `<div>` | Box |
| Text | `<span>` | - |
| Button | `<button>` | - |
| Input | `<input>` | - |
| Textarea | `<textarea>` | - |
| Label | `<label>` | - |
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

### Zag Primitives (Behavior Components)

> Note: Select, Checkbox, Radio are now Zag components with full accessibility and keyboard navigation.

| Component | Machine | Slots | Description |
|-----------|---------|-------|-------------|
| **Selection & Dropdowns** | | | |
| Select | select | Trigger, Content, Item +8 | Dropdown select with keyboard navigation |
| Combobox | combobox | Root, Label, Control +9 | Autocomplete combobox with filtering |
| Listbox | listbox | Root, Label, Content +5 | Listbox selection |
| **Menus** | | | |
| Menu | menu | Trigger, Positioner, Content +5 | Dropdown menu with keyboard navigation |
| ContextMenu | menu | Trigger, Positioner, Content +4 | Right-click context menu |
| NestedMenu | menu | Trigger, Positioner, Content +5 | Nested submenu structure |
| NavigationMenu | navigation-menu | Root, List, Item +5 | Navigation menu with submenus |
| **Form Controls** | | | |
| Checkbox | checkbox | Root, Control, Label +2 | Checkbox with label |
| Switch | switch | Track, Thumb, Label | Toggle switch |
| RadioGroup | radio-group | Root, Item, ItemControl +4 | Radio button group |
| Slider | slider | Root, Track, Range +6 | Range slider |
| RangeSlider | slider | Root, Track, Range +6 | Range slider with two thumbs |
| AngleSlider | angle-slider | Root, Control, Thumb +4 | Circular angle slider |
| NumberInput | number-input | Root, Label, Control +4 | Number input with increment/decrement |
| PinInput | pin-input | Root, Label, Control +2 | PIN/OTP input |
| PasswordInput | password-input | Root, Label, Control +2 | Password input with visibility toggle |
| TagsInput | tags-input | Root, Label, Control +6 | Tags/chips input |
| Editable | editable | Root, Area, Preview +5 | Inline editable text |
| RatingGroup | rating-group | Root, Label, Control +2 | Star rating input |
| SegmentedControl | radio-group | Root, Item, ItemText +2 | Segmented control / button group |
| ToggleGroup | toggle-group | Root, Item | Toggle button group |
| **Date & Time** | | | |
| DatePicker | date-picker | Root, Label, Control +20 | Date picker calendar |
| DateInput | date-input | Root, Label, Control +2 | Segmented date input |
| Timer | timer | Root, Area, Control +3 | Timer/stopwatch |
| **Overlays & Modals** | | | |
| Dialog | dialog | Trigger, Backdrop, Positioner +4 | Modal dialog |
| Tooltip | tooltip | Trigger, Positioner, Content +1 | Hover tooltip |
| Popover | popover | Trigger, Positioner, Content +5 | Click popover |
| HoverCard | hover-card | Trigger, Positioner, Content +1 | Hover card preview |
| FloatingPanel | floating-panel | Trigger, Positioner, Content +5 | Draggable floating panel |
| Tour | tour | Backdrop, Spotlight, Positioner +9 | Guided tour/walkthrough |
| Presence | presence | Root | Presence animation utility |
| **Navigation** | | | |
| Tabs | tabs | Root, List, Trigger +2 | Tabbed navigation |
| Accordion | accordion | Root, Item, ItemTrigger +2 | Collapsible accordion |
| Collapsible | collapsible | Root, Trigger, Content | Collapsible section |
| Steps | steps | Root, List, Item +7 | Step wizard/stepper |
| Pagination | pagination | Root, PrevTrigger, NextTrigger +2 | Pagination controls |
| TreeView | tree-view | Root, Tree, Branch +5 | Tree view navigation |
| **Media & Files** | | | |
| Avatar | avatar | Root, Image, Fallback | Avatar with fallback |
| FileUpload | file-upload | Root, Dropzone, Trigger +8 | File upload with drag & drop |
| ImageCropper | image-cropper | Root, Image, Overlay +9 | Image cropping tool |
| Carousel | carousel | Root, ItemGroup, Item +6 | Carousel/slider |
| SignaturePad | signature-pad | Root, Control, Segment +4 | Signature drawing pad |
| **Feedback & Status** | | | |
| Progress | progress | Root, Track, Range +5 | Linear progress bar |
| CircularProgress | progress | Root, Circle, CircleTrack +3 | Circular progress indicator |
| Toast | toast | Root, Title, Description +2 | Toast notification |
| Marquee | marquee | Root, Content | Scrolling marquee |
| **Utility** | | | |
| Clipboard | clipboard | Root, Label, Control +3 | Clipboard copy utility |
| QRCode | qr-code | Root, Frame, Pattern +1 | QR code generator |
| ScrollArea | scroll-area | Root, Viewport, Content +3 | Custom scrollbar area |
| Splitter | splitter | Root, Panel, ResizeTrigger | Resizable split panels |

### Compound Primitives (Layout Components)

> Layout-Komponenten werden als eigene Komponenten mit Slots definiert (siehe "Komponenten mit Slots").
> Beispiele: SidebarLayout, PageLayout, Card mit Header/Body/Footer.

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
| top-left | tl | *(standalone)* |
| top-center | tc | *(standalone)* |
| top-right | tr | *(standalone)* |
| center-left | cl | *(standalone)* |
| center-right | cr | *(standalone)* |
| bottom-left | bl | *(standalone)* |
| bottom-center | bc | *(standalone)* |
| bottom-right | br | *(standalone)* |
| wrap | - | *(standalone)* |
| pos | positioned, position | *(standalone)* |
| stacked | - | *(standalone)* |
| grid | - | auto, <number> |
| dense | - | *(standalone)* |
| gap-x | gx | <number>, $token |
| gap-y | gy | <number>, $token |
| row-height | rh | <number>, $token |
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
| font | - | sans, serif, mono, roboto, $token |
| text-align | - | left, center, right, justify |
| italic | - | *(standalone)* |
| underline | - | *(standalone)* |
| uppercase | - | *(standalone)* |
| lowercase | - | *(standalone)* |
| truncate | - | *(standalone)* |
| x | - | <number> |
| y | - | <number> |
| pin-left | pl | <number> |
| pin-right | pr | <number> |
| pin-top | pt | <number> |
| pin-bottom | pb | <number> |
| pin-center-x | pcx | *(standalone)* |
| pin-center-y | pcy | *(standalone)* |
| pin-center | pc | *(standalone)* |
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
| content | - | - |
| href | - | - |
| src | - | - |
| placeholder | - | - |
| focusable | - | *(standalone)* |
| readonly | - | *(standalone)* |
| type | - | - |
| name | - | - |
| value | - | - |
| checked | - | *(standalone)* |
| text | - | - |
| icon-size | is | <number>, $token |
| icon-color | ic | <color>, $token |
| icon-weight | iw | <number> |
| fill | - | *(standalone)* |
| material | - | *(standalone)* |
| animation | anim | fade-in, fade-out, slide-in, slide-out, scale-in, scale-out, bounce, pulse, shake, spin |
| x-offset | - | <number> |
| y-offset | - | <number> |
| hover-bg | hover-background | <color>, $token |
| hover-col | hover-color, hover-c | <color>, $token |
| hover-opacity | hover-opa, hover-o | <number> |
| hover-scale | - | <number> |
| hover-border | hover-bor | <number> |
| hover-border-color | hover-boc | <color>, $token |
| hover-radius | hover-rad | <number> |

### Zag Behavior Properties

> Component-specific behavior properties for Zag components.

*50 components with 195 behavior properties total.*

**Boolean:** addOnBlur, addOnPaste, allowCustomValue, allowDrop, allowDuplicate, allowHalf, allowMouseWheel, autoFocus, autoStart, autoplay, checked, clampValueOnBlur, clearable, closeOnClick, closeOnEscape, closeOnOutsideClick, closeOnScroll, closeOnSelect, collapsible, countdown, deselectable, directory, disabled, draggable, fixedWeeks, indeterminate, interactive, invalid, lazyMount, linear, lockAspectRatio, loop, loopFocus, mask, modal, multiple, open, openOnChange, otp, pauseOnHover, preventInteraction, preventScroll, readOnly, required, resizable, restoreFocus, searchable, selectOnFocus, trapFocus, typeahead, unmountOnExit, visible

**Enum:** activationMode, encoding, errorCorrection, orientation, origin, placement, positioning, selectionMode, submitMode

**Number:** aspectRatio, autoplayInterval, closeDelay, count, duration, gap, interval, length, max, maxFiles, maxTags, maxZoom, min, minStepsBetweenThumbs, minZoom, openDelay, pageSize, scrollHideDelay, siblingCount, slidesPerView, speed, spotlightOffset, spotlightRadius, startOfWeek, step, timeout

**String:** label, locale, name, placeholder

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

**Custom:** selected, highlighted, expanded, collapsed, on, off, open, closed, filled, valid, invalid, loading, error, dragging

### Keyboard Keys

escape, enter, space, tab, backspace, delete, arrow-up, arrow-down, arrow-left, arrow-right, home, end

<!-- GENERATED:DSL-PROPERTIES:END -->

## Tests

Tests in `tests/`:
- `tests/compiler/` - IR, Backend, Layout, Zag-Komponenten
- `tests/studio/` - Panels, Pickers, Editor, Sync
- `tests/e2e/` - Playwright Browser-Tests

Dokumentation: `tests/compiler/regeln.md` (bewiesene Regeln), `tests/compiler/strategie.md` (Teststrategie)
