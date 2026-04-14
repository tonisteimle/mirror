# Mirror

**Die Sprache für AI-unterstütztes UI-Design.**

Mirror ist eine DSL, die AI versteht _und_ Menschen lesen können. AI generiert Code, Designer verfeinern ihn – ohne Framework-Wissen, ohne Build-Tools.

## Vision

Die Zukunft liegt im AI-unterstützten Design. AI generiert Code – aber heutige Programmiersprachen sind für Designer nicht lesbar. Mirror löst dieses Problem:

- **Lesbar**: Kurze, eindeutige Syntax (`bg #2563eb`, `pad 12`, `hor`)
- **Veränderbar**: Designer können AI-generierten Code selbst anpassen
- **Kompilierbar**: Echte Prototypen, nicht nur Mockups (DOM oder React)

```mirror
Button "Speichern", bg #2563eb, col white, pad 12 24, rad 6
```

Das ist ein blauer Button. Du siehst es, du verstehst es, du kannst es ändern.

## Projekt-Übersicht

```
compiler/               # Core Compiler (TypeScript)
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

| Datei                              | Beschreibung                         |
| ---------------------------------- | ------------------------------------ |
| `studio/bootstrap.ts`              | Architektur Entry Point              |
| `studio/core/state.ts`             | Single Source of Truth               |
| `studio/modules/file-manager/`     | File Operations                      |
| `studio/modules/compiler/`         | Compiler Wrapper                     |
| `studio/pickers/`                  | Color, Token, Icon, Animation Picker |
| `studio/panels/`                   | Property, Tree, Files Panel          |
| `compiler/ir/index.ts`             | IR-Transformation, SourceMap         |
| `compiler/backends/dom.ts`         | DOM Code-Generator                   |
| `compiler/studio/code-modifier.ts` | Code-Änderungen                      |
| `compiler/schema/dsl.ts`           | DSL Schema (Single Source of Truth)  |
| `compiler/validator/index.ts`      | Code Validator API                   |

## Commands

```bash
npm run build          # Compiler bauen
npm run build:studio   # Studio Runtime bauen
npm test               # Tests ausführen
npm run validate       # Code validieren (z.B. npm run validate app.mirror)
./deploy.sh            # Production Deploy
```

## Compiler CLI

Das CLI kompiliert Mirror-Projekte zu JavaScript (DOM oder React).

### Installation & Aufruf

```bash
# Nach npm install / npm link
mirror-compile app.mir -o dist/app.js

# Oder direkt
npx tsx compiler/cli.ts app.mir -o dist/app.js
```

### Dateitypen

| Typ            | Extensions            | Beschreibung                     |
| -------------- | --------------------- | -------------------------------- |
| **Layout**     | `.mir`, `.mirror`     | UI-Layouts und App-Struktur      |
| **Tokens**     | `.tok`, `.tokens`     | Design Tokens (Farben, Abstände) |
| **Components** | `.com`, `.components` | Wiederverwendbare Komponenten    |
| **Data**       | `.yaml`, `.yml`       | Strukturierte Datenquellen       |

### Projekt-Struktur

```
my-app/
├── data/           # .yaml, .yml Dateien
├── tokens/         # .tok, .tokens Dateien
├── components/     # .com, .components Dateien
├── layouts/        # .mir, .mirror Dateien
├── screens/        # .mir, .mirror Dateien
├── tokens.tok      # Alternative: Root-Datei
├── components.com  # Alternative: Root-Datei
└── app.mir         # Entry Point
```

### Beispiele

```bash
# Einzelne Datei
mirror-compile app.mir -o dist/app.js

# Mehrere Dateien (Reihenfolge wichtig!)
mirror-compile tokens.tok components.com app.mir -o dist/bundle.js

# Projekt-Modus (automatische Reihenfolge)
mirror-compile --project my-app -o dist/app.js

# Watch-Mode
mirror-compile --project my-app -o dist/app.js --watch

# React-Output
mirror-compile app.mir --react -o App.tsx

# Verbose (zeigt geladene Dateien)
mirror-compile --project my-app -v -o dist/app.js
```

### Verarbeitungsreihenfolge (Projekt-Modus)

1. `data/` → Datenquellen
2. `tokens/` → Design Tokens
3. `components/` → Komponenten
4. `layouts/` → Layouts
5. `screens/` → Screens
6. Root-Dateien → App Entry Points

## Architektur

### Kern-Konzepte

| Konzept             | Beschreibung                                     |
| ------------------- | ------------------------------------------------ |
| **State Store**     | Single Source of Truth in `studio/core/state.ts` |
| **Event Bus**       | Lose Kopplung via Events                         |
| **Command Pattern** | Undo/Redo für alle Änderungen                    |
| **SourceMap**       | Bidirektionales Editing (Preview ↔ Code)         |
| **SyncCoordinator** | Editor ↔ Preview ↔ Panel Sync                    |

## Cache Busting

Bei Änderungen an `studio/app.js` oder `studio/styles.css`:
→ Version in `studio/index.html` erhöhen (`?v=N`)

## Konventionen

- **Dateinamen**: Kleinbuchstaben mit Bindestrichen (`interaction-model.md`, nicht `INTERACTION-MODEL.md`)
- **Konzeptdokumente**: In `docs/concepts/` ablegen

---

<!-- GENERATED:TUTORIAL:START -->

## Mirror DSL Kurzreferenz

> Vollständige Dokumentation: `docs/MIRROR-TUTORIAL-FULL.md`

### Grundsyntax

```mirror
// Element "Text", property value, property value
Button "Speichern", bg #2271C1, col white, pad 12 24, rad 6

// Hierarchie durch 2-Space Einrückung
Frame gap 12, pad 16, bg #1a1a1a, rad 8
  Text "Titel", col white, fs 18
  Text "Untertitel", col #888
  Button "Klick", bg #2271C1, col white, pad 10 20, rad 6

// Inline mit Semicolon
Frame hor, gap 8; Icon "check"; Text "OK"
```

### Primitives

```mirror
Frame         // Container (div) - wichtigstes Element
Text "Hallo"  // Textinhalt
Button "OK"   // Button
Input placeholder "Email..."
Textarea placeholder "Nachricht..."
Icon "check", ic #10b981, is 20
Icon "heart", ic #ef4444, fill    // Ausgefüllt
Image src "foto.jpg", w 200
Link "Mehr", href "/seite"
Divider       // Trennlinie
Spacer h 20   // Abstand
```

### Layout

```mirror
// Vertikal (Standard)
Frame gap 12
  Text "Zeile 1"
  Text "Zeile 2"

// Horizontal
Frame hor, gap 12
  Button "A"
  Button "B"
  Button "C"

// Zentrieren
Frame w 200, h 100, center
  Text "Mittig"

// Verteilen
Frame hor, spread, ver-center
  Text "Links"
  Text "Rechts"

// 9 Positionen
Frame w 200, h 200, tl   // top-left
Frame w 200, h 200, br   // bottom-right
Frame w 200, h 200, center

// Wrap bei Überlauf
Frame hor, wrap, gap 8
  Button "Tag1"
  Button "Tag2"
  Button "Tag3"

// Grid (12-Spalten)
Frame grid 12, gap 8, row-height 40
  Frame w 12, bg blue    // Volle Breite
  Frame w 6, bg green    // Halbe Breite
  Frame w 6, bg yellow
  Frame w 4, bg red      // Drittel
  Frame w 4, bg orange
  Frame w 4, bg purple

// Grid mit Position
Frame grid 12, gap 8
  Frame x 1, y 1, w 12, h 2, bg blue   // Header
  Frame x 1, y 3, w 3, h 4, bg gray    // Sidebar
  Frame x 4, y 3, w 9, h 4, bg white   // Content

// Stacked (übereinander für Overlays)
Frame stacked, w 100, h 100
  Image src "bg.jpg", w full, h full
  Frame x 10, y 70
    Text "Caption", col white
```

### Styling

```mirror
// Farben
Frame bg #2271C1                      // Hex
Frame bg white, col black             // Named
Frame bg rgba(0,0,0,0.5)              // Transparent
Frame bg #2271C188                    // Hex mit Alpha
Text col grad #2271C1 #7c3aed         // Gradient
Frame bg grad-ver #f59e0b #ef4444     // Vertikal
Frame bg grad 45 #10b981 #2271C1      // 45° Winkel

// Abstände
Frame pad 16                          // Alle Seiten
Frame pad 12 24                       // Vertikal Horizontal
Frame pad-x 16                        // Nur horizontal
Frame mar 8                           // Margin außen
Frame gap 12                          // Zwischen Kindern

// Größen
Frame w 200, h 100                    // Pixel
Frame w full                          // 100% des Parents
Frame w hug                           // Shrink-to-fit
Frame min-w 100, max-w 400            // Min/Max

// Border & Radius
Frame bor 1, boc #333                 // 1px Border
Frame bor 2, boc #2271C1, rad 8       // Mit Radius
Frame rad 99                          // Kreis

// Typo
Text fs 24, weight bold
Text fs 12, weight 300, italic
Text font mono, uppercase
Text truncate, w 100                  // Abschneiden

// Effekte
Frame shadow sm                       // Klein
Frame shadow md                       // Mittel
Frame shadow lg                       // Groß
Frame opacity 0.5
Frame blur 4
Frame backdrop-blur 8                 // Hintergrund-Blur
```

### Komponenten

```mirror
// Definition mit :
Btn: pad 10 20, rad 6, bg #2271C1, col white, cursor pointer

// Verwendung ohne :
Btn "Speichern"
Btn "Abbrechen", bg #333              // Überschreiben

// Von Primitive erben mit as
PrimaryBtn as Button: bg #2271C1, col white, pad 12 24, rad 6
DangerBtn as Button: bg #ef4444, col white, pad 12 24, rad 6
GhostBtn as Button: bg transparent, col #888, pad 12 24, rad 6

// Varianten
Btn: pad 10 20, rad 6, cursor pointer
PrimaryBtn as Btn: bg #2271C1, col white
DangerBtn as Btn: bg #ef4444, col white
OutlineBtn as Btn: bor 1, boc #2271C1, col #2271C1

// Mit Kind-Slots
Card: bg #1a1a1a, pad 16, rad 8, gap 8
  Title: col white, fs 16, weight 500
  Desc: col #888, fs 14
  Footer: hor, gap 8, mar 8 0 0 0

Card
  Title "Projekttitel"
  Desc "Eine Beschreibung"
  Footer
    Btn "Bearbeiten"
    Btn "Löschen", bg #ef4444

// Layout Komponente
AppShell: hor, h full
  Sidebar: w 200, bg #1a1a1a, pad 16
  Main: grow, pad 24

AppShell
  Sidebar
    Text "Navigation"
  Main
    Text "Content"
```

### Tokens

```mirror
// Einzelne Werte (mit Suffix)
primary.bg: #2271C1
primary.col: white
card.bg: #1a1a1a
card.rad: 8
space.gap: 12

// Verwendung (mit $, ohne Suffix)
Button bg $primary, col $primary
Frame bg $card, rad $card, gap $space

// Property Set (ohne Suffix = mehrere Properties)
cardstyle: bg #1a1a1a, pad 16, rad 8, gap 8
btnstyle: pad 10 20, rad 6, cursor pointer

Frame $cardstyle
  Text "Card mit Property Set"
  Button $btnstyle, bg #2271C1, col white
    Text "Button"
```

### States

```mirror
// System States (automatisch vom Browser)
Btn: bg #333, col white, pad 10 20, rad 6
  hover:
    bg #444
  active:
    scale 0.98
  focus:
    bor 2, boc #2271C1
  disabled:
    opacity 0.5, cursor not-allowed

// Custom State mit toggle()
LikeBtn: bg #333, col white, pad 12, rad 6, toggle()
  Icon "heart", ic #888
  on:
    bg #ef4444
    Icon "heart", ic white, fill

// State mit Transition
Btn: bg #333, toggle()
  hover 0.15s:
    bg #444
  on 0.2s ease-out:
    bg #2271C1
    anim bounce

// Mehrere States (toggle cyclet durch)
TaskStatus: toggle()
  todo:
    bg #333
    Icon "circle", ic #888
  doing:
    bg #f59e0b
    Icon "clock", ic white
  done:
    bg #10b981
    Icon "check", ic white

// Exklusiv (nur einer in Gruppe aktiv)
Tab: pad 12 20, col #888, exclusive()
  selected:
    col white, bor 0 0 2 0, boc #2271C1

Frame hor
  Tab "Home"
  Tab "Settings", selected

// Auf anderes Element reagieren
Button name MenuBtn, toggle()
  open:
    bg #2271C1
Frame hidden
  MenuBtn.open:
    visible
  Text "Menü Inhalt"

// Animation Presets
Frame anim pulse       // Pulsieren
Frame anim bounce      // Hüpfen
Frame anim shake       // Schütteln
Frame anim spin        // Drehen
```

### Funktionen

```mirror
// State wechseln
Button toggle()
Button exclusive()

// Sichtbarkeit
Button show(Menu)
Button hide(Menu)

// Zähler
count: 0
Button increment(count)
Button decrement(count)
Button set(count, 10)
Button reset(count)
Text "Anzahl: $count"

// Feedback
Button toast("Gespeichert!")
Button toast("Fehler!", "error")
Button toast("Achtung!", "warning")
Button toast("Info", "info", "top")

// Input Control
Button focus(EmailField)
Button blur(EmailField)
Button clear(EmailField)
Button setError(EmailField, "Ungültig")
Button clearError(EmailField)

// Navigation
Button navigate(HomeView)
Button back()
Button forward()
Button openUrl("https://example.com")

// Scroll
Button scrollToTop()
Button scrollToBottom()
Button scrollTo(Section2)

// Clipboard
Button copy("Kopierter Text")

// CRUD (in Listen)
Button add(todos, text: "Neu", done: false)
each todo in $todos
  Button remove(todo)

// Mehrere Funktionen
Button toggle(), increment(count), toast("Liked!")
```

### Daten

```mirror
// Variable
name: "Max"
count: 42
Text "Hallo $name, du hast $count Punkte"

// Objekt
user:
  name: "Max"
  email: "max@example.com"
  active: true
Text "$user.name ($user.email)"
Text $user.active ? "Aktiv" : "Inaktiv"

// Sammlung
users:
  max:
    name: "Max"
    role: "Admin"
  anna:
    name: "Anna"
    role: "User"

// Iteration
each user in $users
  Frame hor, gap 8
    Text "$user.name"
    Text "$user.role", col #888

// Aggregation
Text "Anzahl: $users.count"
Text "Erster: $users.first.name"

// Bedingungen
if loggedIn
  Text "Willkommen zurück"
else
  Button "Login"

if count > 0
  Text "$count Einträge"

if isAdmin && hasPermission
  Button "Admin Panel"

// Inline Conditional
Text done ? "Erledigt" : "Offen"
Frame bg active ? #2271C1 : #333
Icon done ? "check" : "circle"
```

### Zag-Komponenten

```mirror
// Dialog
Dialog
  Trigger: Button "Dialog öffnen"
  Backdrop: bg rgba(0,0,0,0.5)
  Content: Frame pad 24, bg #1a1a1a, rad 12, gap 16
    Text "Titel", fs 18, weight bold
    Text "Dialog Inhalt hier"
    Frame hor, gap 8
      CloseTrigger: Button "Abbrechen", bg #333
      Button "OK", bg #2271C1

// Tooltip
Tooltip positioning "bottom"
  Trigger: Icon "info", ic #888
  Content: Text "Hilfetext erscheint hier"

// Tabs
Tabs defaultValue "home"
  Tab "Home"
    Text "Home Content"
  Tab "Profile"
    Text "Profile Content"
  Tab "Settings"
    Text "Settings Content"

// Select
Select placeholder "Stadt wählen..."
  Option "Berlin"
  Option "Hamburg"
  Option "München"

// Form Controls
Checkbox "Newsletter abonnieren"
Checkbox "AGB akzeptieren", checked
Switch "Dark Mode"
Switch "Notifications", checked
Slider value 50, min 0, max 100

// Radio Group
RadioGroup value "monthly"
  RadioItem "Monatlich", value "monthly"
  RadioItem "Jährlich", value "yearly"

// Input Binding
searchTerm: ""
Input bind searchTerm, placeholder "Suchen..."
Text "Suche: $searchTerm"
```

### Tabellen

```mirror
// Statisch
Table
  Header:
    Row "Name", "Status", "Aktion"
  Row "Max", "Aktiv", "Edit"
  Row "Anna", "Pending", "Edit"

// Datengebunden
tasks:
  t1:
    title: "Design Review"
    status: "done"
  t2:
    title: "Development"
    status: "progress"

Table $tasks, gap 4
  Header: bg #222, pad 12
    Row "Aufgabe", "Status"
  Row: hor, spread, pad 12, bg #1a1a1a, rad 6
    Text row.title, col white
    Text row.status, col #888

// Mit Filter und Sortierung
Table $tasks where row.status != "done" by priority
```

### Charts

```mirror
sales:
  Jan: 100
  Feb: 150
  Mar: 200
  Apr: 180

Line $sales, w 300, h 150
Bar $sales, w 300, h 150, colors #2271C1
Pie $sales, w 200, h 200
Donut $sales, w 200, h 200

// Mit Subkomponenten
Line $sales, w 400, h 200
  Title: text "Umsatz 2024"
  XAxis: label "Monat"
  YAxis: label "€", min 0
  Grid: col #333
  Point: size 6, bg #2271C1
```

### Quick Reference

| Kategorie       | Properties                                                             |
| --------------- | ---------------------------------------------------------------------- |
| **Layout**      | `hor`, `ver`, `gap N`, `center`, `spread`, `wrap`, `grid N`, `stacked` |
| **Position**    | `tl`, `tc`, `tr`, `cl`, `cr`, `bl`, `bc`, `br`, `x N`, `y N`           |
| **Größe**       | `w N`, `h N`, `w full`, `w hug`, `grow`, `shrink`                      |
| **Farbe**       | `bg #hex`, `col #hex`, `boc #hex`, `ic #hex`, `grad #a #b`             |
| **Abstand**     | `pad N`, `pad V H`, `mar N`, `gap N`                                   |
| **Border**      | `bor N`, `boc #hex`, `rad N`                                           |
| **Typo**        | `fs N`, `weight bold/500`, `font mono/sans/serif`, `truncate`          |
| **Effekte**     | `shadow sm/md/lg`, `opacity N`, `blur N`, `cursor pointer`             |
| **States**      | `hover:`, `focus:`, `active:`, `disabled:`, `on:`, `open:`             |
| **Animation**   | `anim pulse/bounce/shake/spin`, `0.2s ease-out`                        |
| **Komponenten** | `Name:` (Definition), `Name` (Verwendung), `as` (erben)                |
| **Tokens**      | `name.bg: #hex` (Definition), `bg $name` (Verwendung)                  |

<!-- GENERATED:TUTORIAL:END -->

## Häufige Fehler

### Syntax

| Falsch                   | Richtig                   | Warum              |
| ------------------------ | ------------------------- | ------------------ |
| `Text "Hello" col white` | `Text "Hello", col white` | Komma nach String  |
| `Frame w 100px`          | `Frame w 100`             | Keine Einheiten    |
| `Frame w "200"`          | `Frame w 200`             | Zahlen ohne Quotes |

### Komponenten

| Falsch                      | Richtig                        | Warum                          |
| --------------------------- | ------------------------------ | ------------------------------ |
| `Btn: "Speichern"`          | `Btn "Speichern"`              | Kein `:` bei Verwendung        |
| `PrimaryBtn pad 12`         | `PrimaryBtn: pad 12`           | `:` bei Definition             |
| `PrimaryBtn: Button pad 12` | `PrimaryBtn as Button: pad 12` | `as` bei Primitive-Erweiterung |

### Tokens

| Falsch                 | Richtig               | Warum                      |
| ---------------------- | --------------------- | -------------------------- |
| `$primary.bg: #2563eb` | `primary.bg: #2563eb` | Kein `$` bei Definition    |
| `bg $primary.bg`       | `bg $primary`         | Kein Suffix bei Verwendung |
| `bg primary`           | `bg $primary`         | `$` bei Verwendung         |

### States

| Falsch               | Richtig          | Warum                 |
| -------------------- | ---------------- | --------------------- |
| `hover` (ohne `:`)   | `hover:`         | State braucht `:`     |
| `toggle` (ohne `()`) | `toggle()`       | Funktion braucht `()` |
| `Btn "Text", on:`    | `Btn "Text", on` | Kein `:` bei Instanz  |

### Size-States

| Falsch                      | Richtig                   | Warum                                      |
| --------------------------- | ------------------------- | ------------------------------------------ |
| `@media (max-width: 400px)` | `compact:`                | Size-States nutzen, nicht Media Queries    |
| `compact.max 300`           | `compact.max: 300`        | Token-Syntax mit `:`                       |
| `tiny: pad 4` (ohne Token)  | `tiny.max: 200` + `tiny:` | Custom Size-State braucht Token-Definition |

### Icons

| Falsch                     | Richtig                    | Warum                          |
| -------------------------- | -------------------------- | ------------------------------ |
| `Icon check`               | `Icon "check"`             | Name in Quotes                 |
| `Icon "check", is #10b981` | `Icon "check", ic #10b981` | `ic` für Farbe, `is` für Größe |

---

<!-- GENERATED:DSL-PROPERTIES:START -->

## DSL Reference (auto-generated)

### Primitives

| Primitive | HTML         | Aliases |
| --------- | ------------ | ------- |
| Frame     | `<div>`      | Box     |
| Text      | `<span>`     | -       |
| Button    | `<button>`   | -       |
| Input     | `<input>`    | -       |
| Textarea  | `<textarea>` | -       |
| Label     | `<label>`    | -       |
| Image     | `<img>`      | Img     |
| Icon      | `<span>`     | -       |
| Link      | `<a>`        | -       |
| Slot      | `<div>`      | -       |
| Divider   | `<hr>`       | -       |
| Spacer    | `<div>`      | -       |
| Header    | `<header>`   | -       |
| Nav       | `<nav>`      | -       |
| Main      | `<main>`     | -       |
| Section   | `<section>`  | -       |
| Article   | `<article>`  | -       |
| Aside     | `<aside>`    | -       |
| Footer    | `<footer>`   | -       |
| H1        | `<h1>`       | -       |
| H2        | `<h2>`       | -       |
| H3        | `<h3>`       | -       |
| H4        | `<h4>`       | -       |
| H5        | `<h5>`       | -       |
| H6        | `<h6>`       | -       |

### Zag Primitives (Behavior Components)

> Note: Select, Checkbox, Radio are now Zag components with full accessibility and keyboard navigation.

| Component                 | Machine     | Slots                            | Description                              |
| ------------------------- | ----------- | -------------------------------- | ---------------------------------------- |
| **Selection & Dropdowns** |             |                                  |                                          |
| Select                    | select      | Trigger, Content, Item +8        | Dropdown select with keyboard navigation |
| **Menus**                 |             |                                  |                                          |
| **Form Controls**         |             |                                  |                                          |
| Checkbox                  | checkbox    | Root, Control, Label +2          | Checkbox with label                      |
| Switch                    | switch      | Track, Thumb, Label              | Toggle switch                            |
| RadioGroup                | radio-group | Root, Item, ItemControl +4       | Radio button group                       |
| Slider                    | slider      | Root, Track, Range +6            | Range slider                             |
| **Date & Time**           |             |                                  |                                          |
| DatePicker                | date-picker | Root, Label, Control +20         | Date picker calendar                     |
| **Overlays & Modals**     |             |                                  |                                          |
| Dialog                    | dialog      | Trigger, Backdrop, Positioner +4 | Modal dialog                             |
| Tooltip                   | tooltip     | Trigger, Positioner, Content +1  | Hover tooltip                            |
| **Navigation**            |             |                                  |                                          |
| Tabs                      | tabs        | Root, List, Trigger +2           | Tabbed navigation                        |
| **Media & Files**         |             |                                  |                                          |
| **Feedback & Status**     |             |                                  |                                          |
| **Utility**               |             |                                  |                                          |

### Compound Primitives (Layout Components)

> Pre-built layout components for rapid prototyping. Fully customizable.

| Component | Slots                              | Nested Slots | Description                                                    |
| --------- | ---------------------------------- | ------------ | -------------------------------------------------------------- |
| Table     | Column, Header, Row, Footer, Group |              | Data-driven table with auto-generated columns from data schema |

### Properties

| Property           | Aliases              | Werte                                                                                                                                                                        |
| ------------------ | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| width              | w                    | full, hug, <number>, $token                                                                                                                                                  |
| height             | h                    | full, hug, <number>, $token                                                                                                                                                  |
| size               | -                    | full, hug, <number>, $token                                                                                                                                                  |
| min-width          | minw                 | <number>, $token                                                                                                                                                             |
| max-width          | maxw                 | <number>, $token                                                                                                                                                             |
| min-height         | minh                 | <number>, $token                                                                                                                                                             |
| max-height         | maxh                 | <number>, $token                                                                                                                                                             |
| aspect             | -                    | square, video, <number>                                                                                                                                                      |
| horizontal         | hor                  | _(standalone)_                                                                                                                                                               |
| vertical           | ver                  | _(standalone)_                                                                                                                                                               |
| gap                | g                    | <number>, $token                                                                                                                                                             |
| center             | cen                  | _(standalone)_                                                                                                                                                               |
| spread             | -                    | _(standalone)_                                                                                                                                                               |
| top-left           | tl                   | _(standalone)_                                                                                                                                                               |
| top-center         | tc                   | _(standalone)_                                                                                                                                                               |
| top-right          | tr                   | _(standalone)_                                                                                                                                                               |
| center-left        | cl                   | _(standalone)_                                                                                                                                                               |
| center-right       | cr                   | _(standalone)_                                                                                                                                                               |
| bottom-left        | bl                   | _(standalone)_                                                                                                                                                               |
| bottom-center      | bc                   | _(standalone)_                                                                                                                                                               |
| bottom-right       | br                   | _(standalone)_                                                                                                                                                               |
| wrap               | -                    | _(standalone)_                                                                                                                                                               |
| stacked            | -                    | _(standalone)_                                                                                                                                                               |
| grid               | -                    | auto, <number>                                                                                                                                                               |
| dense              | -                    | _(standalone)_                                                                                                                                                               |
| gap-x              | gx                   | <number>, $token                                                                                                                                                             |
| gap-y              | gy                   | <number>, $token                                                                                                                                                             |
| row-height         | rh                   | <number>, $token                                                                                                                                                             |
| grow               | -                    | _(standalone)_                                                                                                                                                               |
| shrink             | -                    | _(standalone)_                                                                                                                                                               |
| align              | -                    | top, bottom, left, right, center                                                                                                                                             |
| left               | -                    | _(standalone)_                                                                                                                                                               |
| right              | -                    | _(standalone)_                                                                                                                                                               |
| top                | -                    | _(standalone)_                                                                                                                                                               |
| bottom             | -                    | _(standalone)_                                                                                                                                                               |
| hor-center         | -                    | _(standalone)_                                                                                                                                                               |
| ver-center         | -                    | _(standalone)_                                                                                                                                                               |
| padding            | pad, p               | <number>, $token                                                                                                                                                             |
| pad-x              | px                   | <number>, $token                                                                                                                                                             |
| pad-y              | py                   | <number>, $token                                                                                                                                                             |
| margin             | mar, m               | <number>, $token                                                                                                                                                             |
| mar-x              | mx                   | <number>, $token                                                                                                                                                             |
| mar-y              | my                   | <number>, $token                                                                                                                                                             |
| background         | bg                   | <color>, $token                                                                                                                                                              |
| color              | col, c               | <color>, $token                                                                                                                                                              |
| border-color       | boc                  | <color>, $token                                                                                                                                                              |
| border             | bor                  | <number>, $token                                                                                                                                                             |
| border-top         | bor-t, bort          | <number>, $token                                                                                                                                                             |
| border-bottom      | bor-b, borb          | <number>, $token                                                                                                                                                             |
| border-left        | bor-l, borl          | <number>, $token                                                                                                                                                             |
| border-right       | bor-r, borr          | <number>, $token                                                                                                                                                             |
| radius             | rad                  | <number>, $token                                                                                                                                                             |
| font-size          | fs                   | <number>, $token                                                                                                                                                             |
| weight             | -                    | thin, light, normal, medium, semibold, bold, black, <number>                                                                                                                 |
| line               | -                    | <number>, $token                                                                                                                                                             |
| font               | -                    | sans, serif, mono, roboto, $token                                                                                                                                            |
| text-align         | -                    | left, center, right, justify                                                                                                                                                 |
| italic             | -                    | _(standalone)_                                                                                                                                                               |
| underline          | -                    | _(standalone)_                                                                                                                                                               |
| uppercase          | -                    | _(standalone)_                                                                                                                                                               |
| lowercase          | -                    | _(standalone)_                                                                                                                                                               |
| truncate           | -                    | _(standalone)_                                                                                                                                                               |
| x                  | -                    | <number>                                                                                                                                                                     |
| y                  | -                    | <number>                                                                                                                                                                     |
| z                  | -                    | <number>                                                                                                                                                                     |
| absolute           | abs                  | _(standalone)_                                                                                                                                                               |
| fixed              | -                    | _(standalone)_                                                                                                                                                               |
| relative           | -                    | _(standalone)_                                                                                                                                                               |
| rotate             | rot                  | <number>                                                                                                                                                                     |
| scale              | -                    | <number>                                                                                                                                                                     |
| opacity            | o, opa               | <number>                                                                                                                                                                     |
| shadow             | -                    | sm, md, lg                                                                                                                                                                   |
| cursor             | -                    | pointer, grab, move, text, wait, not-allowed                                                                                                                                 |
| blur               | -                    | <number>                                                                                                                                                                     |
| backdrop-blur      | blur-bg              | <number>                                                                                                                                                                     |
| hidden             | -                    | _(standalone)_                                                                                                                                                               |
| visible            | -                    | _(standalone)_                                                                                                                                                               |
| disabled           | -                    | _(standalone)_                                                                                                                                                               |
| scroll             | scroll-ver           | _(standalone)_                                                                                                                                                               |
| scroll-hor         | -                    | _(standalone)_                                                                                                                                                               |
| scroll-both        | -                    | _(standalone)_                                                                                                                                                               |
| clip               | -                    | _(standalone)_                                                                                                                                                               |
| content            | -                    | -                                                                                                                                                                            |
| href               | -                    | -                                                                                                                                                                            |
| src                | -                    | -                                                                                                                                                                            |
| placeholder        | -                    | -                                                                                                                                                                            |
| focusable          | -                    | _(standalone)_                                                                                                                                                               |
| editable           | -                    | _(standalone)_                                                                                                                                                               |
| keyboard-nav       | keynav               | _(standalone)_                                                                                                                                                               |
| readonly           | -                    | _(standalone)_                                                                                                                                                               |
| type               | -                    | -                                                                                                                                                                            |
| name               | -                    | -                                                                                                                                                                            |
| value              | -                    | -                                                                                                                                                                            |
| checked            | -                    | _(standalone)_                                                                                                                                                               |
| text               | -                    | -                                                                                                                                                                            |
| icon-size          | is                   | <number>, $token                                                                                                                                                             |
| icon-color         | ic                   | <color>, $token                                                                                                                                                              |
| icon-weight        | iw                   | <number>                                                                                                                                                                     |
| fill               | -                    | _(standalone)_                                                                                                                                                               |
| animation          | anim                 | fade-in, fade-out, slide-in, slide-out, slide-up, slide-down, slide-left, slide-right, scale-in, scale-out, bounce, pulse, shake, spin, reveal-up, reveal-scale, reveal-fade |
| x-offset           | -                    | <number>                                                                                                                                                                     |
| y-offset           | -                    | <number>                                                                                                                                                                     |
| hover-bg           | hover-background     | <color>, $token                                                                                                                                                              |
| hover-col          | hover-color, hover-c | <color>, $token                                                                                                                                                              |
| hover-opacity      | hover-opa, hover-o   | <number>                                                                                                                                                                     |
| hover-scale        | -                    | <number>                                                                                                                                                                     |
| hover-border       | hover-bor            | <number>                                                                                                                                                                     |
| hover-border-color | hover-boc            | <color>, $token                                                                                                                                                              |
| hover-radius       | hover-rad            | <number>                                                                                                                                                                     |

### Zag Behavior Properties

> Component-specific behavior properties for Zag components.

_50 components with 195 behavior properties total._

**Boolean:** addOnBlur, addOnPaste, allowCustomValue, allowDrop, allowDuplicate, allowHalf, allowMouseWheel, autoFocus, autoStart, autoplay, checked, clampValueOnBlur, clearable, closeOnClick, closeOnEscape, closeOnOutsideClick, closeOnScroll, closeOnSelect, collapsible, countdown, deselectable, directory, disabled, draggable, fixedWeeks, indeterminate, interactive, invalid, lazyMount, linear, lockAspectRatio, loop, loopFocus, mask, modal, multiple, open, openOnChange, otp, pauseOnHover, preventInteraction, preventScroll, readOnly, required, resizable, restoreFocus, searchable, selectOnFocus, trapFocus, typeahead, unmountOnExit, visible

**Enum:** activationMode, encoding, errorCorrection, orientation, origin, placement, positioning, selectionMode, submitMode

**Number:** aspectRatio, autoplayInterval, closeDelay, count, duration, gap, interval, length, max, maxFiles, maxTags, maxZoom, min, minStepsBetweenThumbs, minZoom, openDelay, pageSize, scrollHideDelay, siblingCount, slidesPerView, speed, spotlightOffset, spotlightRadius, startOfWeek, step, timeout

**String:** label, locale, name, placeholder

### Events

| Event           | DOM           | Key? |
| --------------- | ------------- | ---- |
| onclick         | click         | -    |
| onhover         | mouseenter    | -    |
| onfocus         | focus         | -    |
| onblur          | blur          | -    |
| onchange        | change        | -    |
| oninput         | input         | -    |
| onkeydown       | keydown       | ✓    |
| onkeyup         | keyup         | ✓    |
| onclick-outside | click-outside | -    |
| onload          | load          | -    |
| onviewenter     | enter         | -    |
| onviewexit      | exit          | -    |
| onenter         | keydown       | -    |
| onkeyenter      | keydown       | -    |
| onkeyescape     | keydown       | -    |
| onkeyspace      | keydown       | -    |
| onescape        | keydown       | -    |
| onspace         | keydown       | -    |

### Actions

| Action         | Targets                 |
| -------------- | ----------------------- |
| show           | -                       |
| hide           | -                       |
| toggle         | -                       |
| open           | -                       |
| close          | -                       |
| select         | -                       |
| highlight      | next, prev, first, last |
| activate       | -                       |
| deactivate     | -                       |
| page           | -                       |
| call           | -                       |
| assign         | -                       |
| focus          | -                       |
| blur           | -                       |
| submit         | -                       |
| reset          | -                       |
| navigate       | -                       |
| showAt         | -                       |
| showBelow      | -                       |
| showAbove      | -                       |
| showLeft       | -                       |
| showRight      | -                       |
| showModal      | -                       |
| dismiss        | -                       |
| scrollTo       | -                       |
| scrollBy       | -                       |
| scrollToTop    | -                       |
| scrollToBottom | -                       |
| get            | -                       |
| set            | -                       |
| increment      | -                       |
| decrement      | -                       |
| copy           | -                       |
| add            | -                       |
| remove         | -                       |
| create         | -                       |
| save           | -                       |
| revert         | -                       |
| delete         | -                       |

### States

**System:** hover, focus, active, disabled

**Custom:** selected, highlighted, expanded, collapsed, on, off, open, closed, filled, valid, invalid, loading, error

**Size-States (CSS Container Queries):** compact, regular, wide

| Size-State | Default Threshold  | Token Override                         |
| ---------- | ------------------ | -------------------------------------- |
| `compact:` | < 400px            | `compact.max: N`                       |
| `regular:` | 400-800px          | `regular.min: N`, `regular.max: N`     |
| `wide:`    | > 800px            | `wide.min: N`                          |
| Custom     | Defined via tokens | `statename.min: N`, `statename.max: N` |

### Keyboard Keys

escape, enter, space, tab, backspace, delete, arrow-up, arrow-down, arrow-left, arrow-right, home, end

<!-- GENERATED:DSL-PROPERTIES:END -->

## Tests

Tests in `tests/`:

- `tests/compiler/` - IR, Backend, Layout, Zag-Komponenten
- `tests/studio/` - Panels, Pickers, Editor, Sync
- `tests/e2e/` - Playwright Browser-Tests

Dokumentation: `tests/compiler/regeln.md` (bewiesene Regeln), `tests/compiler/strategie.md` (Teststrategie)
