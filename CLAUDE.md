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
├── parser/            # Lexer & Parser → AST (incl. positional-resolver)
├── ir/                # AST → IR Transformation
├── backends/          # IR → DOM/React Code (DOM emitter + runtime template)
├── runtime/           # Runtime modules (TS, single source of truth)
├── validator/         # Schema-basierter Code Validator
└── schema/            # DSL Schema (Single Source of Truth)

studio/                # Studio Runtime (TypeScript) - Modulare Architektur
├── code-modifier/     # Bidirectional editing (Code ops + Property extraction)
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
└── studio/            # Studio Component Tests

tools/                 # CLI Tools
├── test.ts            # Browser Test Runner Entry Point
└── test-runner/       # Test Runner Implementation (CDP)

docs/                  # Dokumentation
├── concepts/          # Feature-Konzepte (in Entwicklung)
└── generated/         # Auto-generierte Referenz
packages/mirror-lang/  # NPM Package
dist/                  # Build Output
```

## Wichtige Dateien

| Datei                          | Beschreibung                          |
| ------------------------------ | ------------------------------------- |
| `studio/bootstrap.ts`          | Architektur Entry Point               |
| `studio/core/state.ts`         | Single Source of Truth                |
| `studio/modules/file-manager/` | File Operations                       |
| `studio/modules/compiler/`     | Compiler Wrapper                      |
| `studio/pickers/`              | Color, Token, Icon, Animation Picker  |
| `studio/panels/`               | Property, Tree, Files Panel           |
| `studio/test-api/`             | Browser Test Framework                |
| `compiler/ir/index.ts`         | IR-Transformation, SourceMap          |
| `compiler/backends/dom.ts`     | DOM Code-Generator                    |
| `studio/code-modifier/`        | Code-Änderungen + Property-Extraktion |
| `compiler/schema/dsl.ts`       | DSL Schema (Single Source of Truth)   |
| `compiler/validator/index.ts`  | Code Validator API                    |
| `tools/test.ts`                | Browser Test Runner CLI               |
| `tools/test-runner/`           | Test Runner Implementation (CDP)      |
| `docs/TEST-FRAMEWORK.md`       | **Test Framework Dokumentation**      |

## Commands

```bash
# Build
npm run build          # Compiler bauen
npm run build:studio   # Studio Runtime bauen

# Studio
npm run studio         # Studio Server starten (localhost:5173)

# Tests
npm test               # Unit Tests (Vitest)
npm run test:browser:progress     # Browser Tests mit Fortschrittsanzeige (empfohlen)
npm run test:browser -- --headed  # Browser Tests (sichtbar)

# Sonstiges
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
- **Projekt-/Konzept-Dokumente**: Werden in `docs/archive/` archiviert. Aktive Doku ist auf wenige Produktdokumente reduziert (siehe `README.md`, `docs/MIRROR-TUTORIAL-FULL.md`, `docs/TEST-FRAMEWORK.md`, `docs/generated/`).

---

<!-- Diese Kurzreferenz ist HANDKURIERT — bewusst kompakt für den Always-Loaded-Context.
     Die didaktische Vollversion (`docs/MIRROR-TUTORIAL-FULL.md`) wird auto-generiert
     aus `docs/tutorial/*.html` via `npm run generate:claude`. -->

## Mirror DSL Kurzreferenz

> **Diese Kurzreferenz reicht für ~80% der Tasks (Syntax-Lookup, kleine Änderungen).**
> Bei tieferen DSL-Fragen, neuen Features oder unklaren Patterns:
> **`Read docs/MIRROR-TUTORIAL-FULL.md`** (Vollversion, ~140 KB, didaktisch).

### Canvas (App-Basis)

```mirror
// Canvas definiert Basis-Styling für die gesamte Anwendung
// Muss erste Zeile sein (optional)

canvas bg #1a1a1a, w 375, h 812, col white, font sans

// Mit Device Preset (vordefinierte Größen)
canvas mobile                    // 375 × 812
canvas tablet                    // 768 × 1024
canvas desktop                   // 1440 × 900

// Preset mit zusätzlichen Properties
canvas mobile, bg #1a1a1a, col white

// Top-Level Elemente brauchen keine Einrückung nach canvas
canvas mobile, bg #1a1a1a

Text "Titel", fs 24
Frame hor, gap 12
  Button "A"
  Button "B"
```

**Vererbbare Properties:** `col`, `font`, `fs` fließen automatisch zu allen Kindern.

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

// Verteilen (space-between)
Frame hor, spread, ver-center
  Text "Links"
  Text "Rechts"

// 9 Positionen
Frame tl    // top-left
Frame tc    // top-center
Frame tr    // top-right
Frame cl    // center-left
Frame center
Frame cr    // center-right
Frame bl    // bottom-left
Frame bc    // bottom-center
Frame br    // bottom-right

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

// Grid mit expliziter Position
Frame grid 12, gap 8
  Frame x 1, y 1, w 12, h 2, bg blue   // Header
  Frame x 1, y 3, w 3, h 4, bg gray    // Sidebar
  Frame x 4, y 3, w 9, h 4, bg white   // Content

// Device Presets (vordefinierte App-Größen)
Frame device mobile     // 375 × 812
Frame device tablet     // 768 × 1024
Frame device desktop    // 1440 × 900

// Preset mit Override
Frame device mobile, h 600   // 375 × 600 (Höhe überschrieben)

// Stacked (übereinander für Overlays, Badges)
Frame stacked, w 100, h 100
  Image src "bg.jpg", w full, h full
  Frame x 10, y 70
    Text "Caption", col white

// Badge auf Icon
Frame stacked, w 40, h 40
  Icon "bell", ic #888, is 24
  Frame x 24, y -4, w 16, h 16, bg #ef4444, rad 99, center
    Text "3", col white, fs 10
```

### Styling

```mirror
// Farben
Frame bg #2271C1                      // Hex
Frame bg white, col black             // Named
Frame bg rgba(0,0,0,0.5)              // Transparent
Frame bg #2271C180                    // Hex mit Alpha (80 = 50%)
Text col grad #2271C1 #7c3aed         // Gradient horizontal
Frame bg grad-ver #f59e0b #ef4444     // Gradient vertikal
Frame bg grad 45 #10b981 #2271C1      // Gradient 45°

// Abstände
Frame pad 16                          // Alle Seiten
Frame pad 12 24                       // Vertikal Horizontal
Frame pad 8 16 12 16                  // Top Right Bottom Left
Frame pad-x 16                        // Nur horizontal (px)
Frame pad-y 12                        // Nur vertikal (py)
Frame pad-t 8                         // Nur oben (pt)
Frame pad-r 16                        // Nur rechts (pr)
Frame mar 8                           // Margin außen
Frame mar-x 16                        // Margin horizontal (mx)
Frame mar-y 12                        // Margin vertikal (my)
Frame mar-t 8                         // Margin oben (mt)
Frame gap 12                          // Zwischen Kindern

// Größen
Frame w 200, h 100                    // Pixel
Frame w full                          // 100% des Parents
Frame w hug                           // Shrink-to-fit
Frame minw 100, maxw 400              // Min/Max
Frame grow                            // Flex grow
Frame shrink                          // Flex shrink

// Border & Radius
Frame bor 1, boc #333                 // 1px Border
Frame bor 2, boc #2271C1, rad 8       // Mit Radius
Frame rad 99                          // Kreis (bei quadrat)
Frame bor 0 0 1 0, boc #333           // Nur unten

// Typo
Text fs 24, weight bold               // Größe und Gewicht
Text fs 12, weight 300, italic        // Light italic
Text font mono, uppercase             // Monospace, uppercase
Text truncate, w 100                  // Abschneiden mit ...
Text underline                        // Unterstrichen
Text line 1.5                         // Line-height

// Effekte
Frame shadow sm                       // Schatten klein
Frame shadow md                       // Schatten mittel
Frame shadow lg                       // Schatten groß
Frame opacity 0.5                     // Transparenz
Frame blur 4                          // Element blur
Frame backdrop-blur 8                 // Hintergrund blur

// Sichtbarkeit
Frame hidden                          // display: none
Frame visible                         // display: flex
Frame clip                            // overflow: hidden
Frame scroll                          // overflow-y: auto
```

### Komponenten

```mirror
// Definition mit : (speichert Properties)
Btn: pad 10 20, rad 6, bg #2271C1, col white, cursor pointer

// Verwendung ohne : (wendet Properties an)
Btn "Speichern"
Btn "Abbrechen", bg #333              // Überschreiben

// Von Primitive erben mit "as"
PrimaryBtn as Button: bg #2271C1, col white, pad 12 24, rad 6
DangerBtn as Button: bg #ef4444, col white, pad 12 24, rad 6
GhostBtn as Button: bg transparent, col #888, pad 12 24, rad 6

// Varianten einer Basis-Komponente
Btn: pad 10 20, rad 6, cursor pointer
PrimaryBtn as Btn: bg #2271C1, col white
DangerBtn as Btn: bg #ef4444, col white
OutlineBtn as Btn: bor 1, boc #2271C1, col #2271C1

// Mit Kind-Slots (: in Definition, ohne : bei Verwendung)
Card: bg #1a1a1a, pad 16, rad 8, gap 8
  Title: col white, fs 16, weight 500
  Desc: col #888, fs 14
  Footer: hor, gap 8, mar 8 0 0 0

Card
  Title "Projekttitel"
  Desc "Eine Beschreibung des Projekts."
  Footer
    PrimaryBtn "Bearbeiten"
    DangerBtn "Löschen"

// Layout Komponente
AppShell: hor, h full
  Sidebar: w 200, bg #1a1a1a, pad 16, gap 8
  Main: grow, pad 24, bg #0a0a0a

AppShell
  Sidebar
    Text "Navigation", col #888, fs 12, uppercase
    Text "Dashboard", col white
    Text "Settings", col white
  Main
    Text "Content", col white, fs 24
```

### Tokens

```mirror
// Einzelne Werte (mit Suffix für Property-Typ)
primary.bg: #2271C1
primary.col: white
danger.bg: #ef4444
card.bg: #1a1a1a
card.rad: 8
space.gap: 12
space.pad: 16

// Verwendung (mit $, ohne Suffix - wird automatisch gemappt)
Button bg $primary, col $primary
Frame bg $card, rad $card, gap $space, pad $space
Button bg $danger, col white

// Property Set (ohne Suffix = mehrere Properties gebündelt)
cardstyle: bg #1a1a1a, pad 16, rad 8, gap 8
btnbase: pad 10 20, rad 6, cursor pointer
heading: fs 24, weight bold, col white

Frame $cardstyle
  Text "Titel", $heading
  Text "Beschreibung", col #888
  Button $btnbase, bg #2271C1, col white
    Text "Aktion"
```

### Custom Icons

```mirror
// Icon-Registry definieren (SVG path data)
$icons:
  hbox: "M3 3h18v18H3z|M9 3v18|M15 3v18"
  vbox: "M3 3h18v18H3z|M21 9H3|M21 15H3"
  grid: "M3 3h8v8H3z|M13 3h8v8h-8z|M3 13h8v8H3z|M13 13h8v8h-8z"

// Verwendung - wie normale Lucide Icons
Icon "hbox", is 24, ic #888
Icon "vbox", is 24, ic #2271C1
Icon "grid", is 20

// Custom Icons und Lucide Icons mischen
Frame hor, gap 8
  Icon "hbox", is 20           // Custom
  Icon "check", is 20          // Lucide
  Icon "grid", is 20           // Custom
```

**Hinweis:** Mehrere Pfade mit `|` trennen. ViewBox ist standardmäßig `0 0 24 24`.

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

// Custom State mit toggle() - wechselt bei Klick
LikeBtn: bg #333, col #888, pad 12 20, rad 6, hor, gap 8, toggle()
  Icon "heart", ic #888, is 18
  Text "Gefällt mir"
  on:
    bg #ef4444
    col white
    Icon "heart", ic white, is 18, fill
    Text "Gefällt mir!"

// State mit Transition (smooth)
Btn: bg #333, toggle()
  hover 0.15s:
    bg #444
  on 0.2s ease-out:
    bg #2271C1
    anim bounce

// Mehrere States - toggle() cyclet durch alle
TaskStatus: pad 8 16, rad 6, hor, gap 8, toggle()
  todo:
    bg #333
    Icon "circle", ic #888, is 16
    Text "To Do", col #888
  doing:
    bg #f59e0b
    Icon "clock", ic white, is 16
    Text "In Progress", col white
  done:
    bg #10b981
    Icon "check", ic white, is 16
    Text "Done", col white

// Exklusiv - nur einer in Gruppe aktiv
Tab: pad 12 20, col #888, cursor pointer, exclusive()
  selected:
    col white
    bor 0 0 2 0, boc #2271C1

Frame hor, gap 0
  Tab "Home", selected
  Tab "Profile"
  Tab "Settings"

// Cross-Element State - auf anderes Element reagieren
Button name MenuBtn, pad 10 20, bg #333, col white, rad 6, toggle()
  open:
    bg #2271C1

Frame bg #1a1a1a, pad 12, rad 8, gap 4, hidden
  MenuBtn.open:
    visible
  Text "Menü Item 1", col white
  Text "Menü Item 2", col white

// Instanz mit State starten
Btn "Aktiv", on
Tab "Home", selected

// Animation Presets
Icon "loader", anim spin       // Lädt...
Frame anim pulse               // Aufmerksamkeit
Frame anim bounce              // Erfolg
Frame anim shake               // Fehler
```

### Funktionen

```mirror
// State wechseln
Button "Toggle", toggle()
Button "Select", exclusive()

// Sichtbarkeit
Button "Show", show(Menu)
Button "Hide", hide(Menu)

// Zähler
count: 0
Frame hor, gap 12, ver-center
  Button "-", decrement(count)
  Text "$count", fs 24, w 40, center
  Button "+", increment(count)

Button set(count, 10)    // Auf Wert setzen
Button reset(count)       // Auf 0 zurück

// Feedback
Button toast("Gespeichert!")
Button toast("Fehler!", "error")
Button toast("Achtung!", "warning")
Button toast("Info", "info", "top-right")

// Input Control
Button focus(EmailField)
Button clear(EmailField)
Button setError(EmailField, "Ungültige Email")
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
Button copy("Text kopiert"), toast("Kopiert!", "success")

// CRUD (in Listen)
Button add(todos, text: "Neue Aufgabe", done: false)
each todo in $todos
  Frame hor, gap 8
    Text todo.text
    Button "×", remove(todo)

// Mehrere Funktionen kombinieren
Button toggle(), increment(count), toast("Liked!")

// List Navigation (für Select, Dropdown, etc.)
Frame loop-focus, typeahead    // Navigation-Features aktivieren
  onkeydown(arrow-down) highlightNext(Options)
  onkeydown(arrow-up) highlightPrev(Options)
  onkeydown(enter) selectHighlighted(Options)

// loop-focus: Arrow-Keys wrappen am Ende/Anfang
// typeahead: Tippen springt zur passenden Option
// trigger-text: Trigger zeigt ausgewählten Wert
```

### Daten & Bedingungen

```mirror
// Variablen
name: "Max"
count: 42
active: true
Text "Hallo $name, du hast $count Punkte"

// Objekt (verschachtelt)
user:
  name: "Max Mustermann"
  email: "max@example.com"
  role: "Admin"
  active: true

Frame gap 4
  Text "$user.name", weight bold
  Text "$user.email", col #888
  Text "$user.role", col #2271C1

// Sammlung (mehrere Einträge)
users:
  max:
    name: "Max"
    role: "Admin"
  anna:
    name: "Anna"
    role: "Designer"
  tom:
    name: "Tom"
    role: "Developer"

// Iteration mit each
each user in $users
  Frame hor, gap 12, pad 12, bg #1a1a1a, rad 6
    Text "$user.name", col white, weight 500
    Text "$user.role", col #888

// Aggregation
Text "Anzahl: $users.count"
Text "Erster: $users.first.name"
Text "Letzter: $users.last.name"

// Block Bedingungen
if loggedIn
  Text "Willkommen zurück, $user.name"
  Button "Logout"
else
  Button "Login"
  Button "Registrieren"

if count > 0
  Text "$count Einträge"
else
  Text "Keine Einträge"

if isAdmin && hasPermission
  Button "Admin Panel"

// Inline Conditional (Ternary)
Text done ? "Erledigt" : "Offen"
Frame bg active ? #2271C1 : #333
Icon done ? "check" : "circle", ic done ? #10b981 : #888
Text count > 0 ? "$count Items" : "Leer"
```

### UI-Komponenten (fertige UI-Patterns)

```mirror
// Dialog (Modal)
Dialog
  Trigger: Button "Dialog öffnen", bg #2271C1, col white
  Backdrop: bg rgba(0,0,0,0.5)
  Content: Frame pad 24, bg #1a1a1a, rad 12, gap 16, w 400
    Text "Bestätigung", fs 18, weight bold, col white
    Text "Möchtest du fortfahren?", col #888
    Frame hor, gap 8
      CloseTrigger: Button "Abbrechen", bg #333, col white, grow
      Button "OK", bg #2271C1, col white, grow

// Tooltip
Tooltip positioning "bottom"
  Trigger: Icon "info", ic #888, is 20
  Content: Text "Hilfetext erscheint hier", fs 12

// Tabs
Tabs defaultValue "home"
  Tab "Home"
    Frame pad 16
      Text "Home Content"
  Tab "Profile"
    Frame pad 16
      Text "Profile Content"
  Tab "Settings"
    Frame pad 16
      Text "Settings Content"

// Select (Pure Mirror Dropdown)
// Verwendet: trigger-text, loop-focus, typeahead
Select
  Trigger
    Text "Stadt wählen..."
  Content
    Item "Berlin"
    Item "Hamburg"
    Item "München"
    Item "Köln"

// Form Controls
Checkbox "Newsletter abonnieren"
Checkbox "AGB akzeptieren", checked
Switch "Dark Mode"
Switch "Notifications", checked
Slider value 50, min 0, max 100, step 10

// Radio Group
RadioGroup value "monthly"
  RadioItem "Monatlich - €9/Monat", value "monthly"
  RadioItem "Jährlich - €99/Jahr", value "yearly"
  RadioItem "Lifetime - €299", value "lifetime"

// Date Picker
DatePicker placeholder "Datum wählen"

// Input mit Binding
searchTerm: ""
Input bind searchTerm, placeholder "Suchen..."
Text "Suche: $searchTerm", col #888

// Input Mask (Pattern-basiert)
Input mask "###.####.####.##", placeholder "AHV-Nummer"  // 756.1234.5678.90
Input mask "(###) ###-####", placeholder "Telefon"       // (079) 123-4567
Input mask "####-##-##", placeholder "Datum"             // 2024-01-15
Input mask "##'###.##", placeholder "Betrag CHF"         // 12'345.67
Input mask "AAA-###", placeholder "Kennzeichen"          // ZH-1234

// Pattern-Zeichen:
// # = Ziffer (0-9)
// A = Buchstabe (a-z, A-Z)
// * = Alphanumerisch
// Alle anderen = Literal (wird automatisch eingefügt)

// Mask mit Binding (speichert rohen Wert ohne Formatierung)
ahv: ""
Input mask "###.####.####.##", bind ahv
```

### Tabellen

```mirror
// Statische Tabelle
Table
  Header:
    Row "Name", "Status", "Aktion"
  Row "Max", "Aktiv", "Bearbeiten"
  Row "Anna", "Pending", "Bearbeiten"
  Row "Tom", "Inaktiv", "Bearbeiten"

// Datengebundene Tabelle
tasks:
  t1:
    title: "Design Review"
    status: "done"
    priority: 1
  t2:
    title: "Development"
    status: "progress"
    priority: 2
  t3:
    title: "Testing"
    status: "todo"
    priority: 3

Table $tasks, gap 4
  Header: bg #222, pad 12, rad 6 6 0 0
    Row "Aufgabe", "Status", "Priorität"
  Row: hor, spread, pad 12, bg #1a1a1a, rad 6, ver-center
    Text row.title, col white, grow
    Text row.status, col #888, w 80
    Text "P" + row.priority, col #f59e0b, w 40

// Mit Filter und Sortierung
Table $tasks where row.status != "done" by priority
  Row: pad 12, bg #1a1a1a
    Text row.title
```

### Charts

```mirror
// Daten
sales:
  Jan: 120
  Feb: 180
  Mar: 240
  Apr: 200
  May: 280
  Jun: 320

// Chart-Typen
Line $sales, w 400, h 200
Bar $sales, w 400, h 200, colors #2271C1
Pie $sales, w 250, h 250
Donut $sales, w 250, h 250
Area $sales, w 400, h 200

// Mit Styling
Line $sales, w 400, h 200, colors #2271C1
  Title: text "Umsatz 2024", col white
  XAxis: label "Monat", col #888
  YAxis: label "€", min 0, col #888
  Grid: col #333
  Point: size 6, bg #2271C1
  Line: width 2, tension 0.3
```

### Häufige Fehler

```mirror
// ❌ FALSCH                    ✅ RICHTIG
Text "Hi" col white            Text "Hi", col white         // Komma vergessen
Frame w 100px                  Frame w 100                  // Keine Einheiten
Frame w "200"                  Frame w 200                  // Zahlen ohne Quotes

Btn: "Text"                    Btn "Text"                   // Kein : bei Verwendung
PrimaryBtn pad 12              PrimaryBtn: pad 12           // : bei Definition fehlt
PrimaryBtn: Button pad 12      PrimaryBtn as Button: pad 12 // as fehlt

$primary.bg: #2271C1           primary.bg: #2271C1          // Kein $ bei Definition
bg $primary.bg                 bg $primary                  // Kein Suffix bei Verwendung
bg primary                     bg $primary                  // $ fehlt

hover                          hover:                       // : fehlt bei State
toggle                         toggle()                     // () fehlt bei Funktion
Btn "Text", on:                Btn "Text", on               // Kein : bei Instanz-State

Icon check                     Icon "check"                 // Quotes fehlen
Icon "x", is #ef4444           Icon "x", ic #ef4444         // ic für Farbe, is für Größe
```

### Quick Reference

| Kategorie       | Properties                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------- |
| **Canvas**      | `canvas mobile/tablet/desktop`, `canvas bg #hex, w N, h N, col #hex, font sans, fs N`             |
| **Layout**      | `hor`, `ver`, `gap N`, `center`, `spread`, `wrap`, `grid N`, `stacked`                            |
| **Position**    | `tl`, `tc`, `tr`, `cl`, `cr`, `bl`, `bc`, `br`, `x N`, `y N`                                      |
| **Größe**       | `w N`, `h N`, `w full`, `w hug`, `device mobile/tablet/desktop`, `grow`, `shrink`, `minw`, `maxw` |
| **Farbe**       | `bg #hex`, `col #hex`, `boc #hex`, `ic #hex`, `grad #a #b`                                        |
| **Abstand**     | `pad N`, `pad-x`, `pad-y`, `pad-t/r/b/l`, `mar N`, `mar-x/y/t/r/b/l`                              |
| **Border**      | `bor N`, `boc #hex`, `rad N`                                                                      |
| **Typo**        | `fs N`, `weight bold/500`, `font mono`, `truncate`, `uppercase`                                   |
| **Effekte**     | `shadow sm/md/lg`, `opacity N`, `blur N`, `cursor pointer`                                        |
| **Sichtbar**    | `hidden`, `visible`, `clip`, `scroll`                                                             |
| **States**      | `hover:`, `focus:`, `active:`, `disabled:`, `on:`, `open:`                                        |
| **Animation**   | `anim pulse/bounce/shake/spin`, `0.2s ease-out`                                                   |
| **Listen**      | `loop-focus`, `typeahead`, `trigger-text`, `highlightNext/Prev`                                   |
| **Input**       | `placeholder`, `type`, `mask "###-####"`, `bind varName`, `disabled`                              |
| **Komponenten** | `Name:` Definition, `Name` Verwendung, `as` erben                                                 |
| **Tokens**      | `name.bg: #hex` Definition, `bg $name` Verwendung                                                 |
| **Daten**       | `name: value`, `$name`, `each x in $list`, `if cond`                                              |

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

> Mirror nutzt nur **eine einzige** Zag-Komponente: **DatePicker**. Alle
> früheren Zag-Komponenten (Select, Checkbox, Switch, RadioGroup, Slider,
> Tabs, SideNav, Dialog, Tooltip, …) sind heute **Pure-Mirror-Templates**
> in `studio/panels/components/component-templates.ts` — d.h. sie sind als
> Mirror-DSL definiert (Frame/Slot/Icon/State) und kommen ohne
> Zag-Runtime aus. Verwendung im Code (`Checkbox "Newsletter"`,
> `Dialog`, `Select`, …) bleibt identisch; intern wird das Template
> expandiert. Historische Details: `docs/archive/concepts/pure-mirror-components.md`.

| Component  | Machine     | Slots                    | Description          |
| ---------- | ----------- | ------------------------ | -------------------- |
| DatePicker | date-picker | Root, Label, Control +20 | Date picker calendar |

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
| pad-t              | pt                   | <number>, $token                                                                                                                                                             |
| pad-r              | pr                   | <number>, $token                                                                                                                                                             |
| pad-b              | pb                   | <number>, $token                                                                                                                                                             |
| pad-l              | pl                   | <number>, $token                                                                                                                                                             |
| margin             | mar, m               | <number>, $token                                                                                                                                                             |
| mar-x              | mx                   | <number>, $token                                                                                                                                                             |
| mar-y              | my                   | <number>, $token                                                                                                                                                             |
| mar-t              | mt                   | <number>, $token                                                                                                                                                             |
| mar-r              | mr                   | <number>, $token                                                                                                                                                             |
| mar-b              | mb                   | <number>, $token                                                                                                                                                             |
| mar-l              | ml                   | <number>, $token                                                                                                                                                             |
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
| mask               | -                    | Input mask pattern (# = digit, A = letter, \* = alphanumeric)                                                                                                                |
| focusable          | -                    | _(standalone)_                                                                                                                                                               |
| editable           | -                    | _(standalone)_                                                                                                                                                               |
| keyboard-nav       | keynav               | _(standalone)_                                                                                                                                                               |
| loop-focus         | loopfocus            | _(standalone)_                                                                                                                                                               |
| typeahead          | -                    | _(standalone)_                                                                                                                                                               |
| trigger-text       | triggertext          | _(standalone)_                                                                                                                                                               |
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

### Zag Behavior Properties (DatePicker)

> Component-specific behavior properties. Da nur DatePicker als Zag-Komponente
> bleibt, listen wir hier nur dessen Properties. Pure-Mirror-Komponenten
> (Checkbox/Switch/Slider/etc.) verwenden direkte Mirror-Properties statt
> Zag-Properties.

| Property        | Type    | Default        | Description                                    |
| --------------- | ------- | -------------- | ---------------------------------------------- |
| `selectionMode` | enum    | `single`       | `single` / `multiple` / `range`                |
| `fixedWeeks`    | boolean | `false`        | Always show 6 weeks                            |
| `closeOnSelect` | boolean | `true`         | Close after selection                          |
| `startOfWeek`   | number  | `0`            | First day of week (0=Sun, 1=Mon)               |
| `positioning`   | enum    | `bottom-start` | `bottom`/`bottom-start`/`bottom-end`/`top`/... |
| `value`         | string  | —              | Selected date(s)                               |
| `defaultValue`  | string  | —              | Initial date(s)                                |
| `disabled`      | boolean | `false`        | Disable interaction                            |
| `readOnly`      | boolean | `false`        | Read-only state                                |
| `min`           | string  | —              | Min selectable date                            |
| `max`           | string  | —              | Max selectable date                            |
| `locale`        | string  | `en-US`        | Locale identifier                              |

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

## Demos (Spec-by-Example E2E)

Demos sind in `tools/test-runner/demo/` und nutzen den existierenden CDP-
Test-Runner. Sie sind gleichzeitig **Tutorials, Video-Skripte und E2E-Tests**:
ein Skript zeigt einen User-Workflow, validiert nach jedem Schritt sowohl
den Editor-Code als auch das gerenderte DOM, und kann sowohl headless (CI)
als auch headed (Video) laufen.

**Schnelleinstieg:**

```bash
npm run studio              # Studio-Server (Terminal 1)
npm run test:demos          # Suite headless, alle Demos (Terminal 2)
npm run test:demos:headed   # Suite mit sichtbarem Browser
```

**Vorhandene Demos** (`tools/test-runner/demo/scripts/`):

| Demo                      | Zeigt                                               |
| ------------------------- | --------------------------------------------------- |
| `visual-editing.ts`       | Drag/Resize/Padding/Margin/Inline-Edit/Reorder      |
| `property-workflow.ts`    | Cross-Panel Preview ↔ Properties ↔ Code             |
| `ai-assisted-card.ts`     | `--`-Prompt → AI-generiertes UI → Property-Tweaking |
| `token-system.ts`         | Multi-File `tokens.tok` + `$token`-Resolution       |
| `responsive-design.ts`    | `canvas mobile/tablet/desktop` Presets              |
| `state-interactions.ts`   | Hover/active States + computed-style                |
| `component-extraction.ts` | `components.com` + 3× Card-Verwendung               |

**Validation pro Demo-Schritt:**

- `expectCode` — Editor-Source strict gegen Snapshot
- `expectCodeMatches` — Editor-Source gegen RegExp (für AI-Output)
- `expectDom` — Computed-Style/Layout (tag-spezialisiertes Schema)
- `--snapshot-baseline=DIR` — Pixel-Diff gegen Baseline-PNGs

**Iteration:**

- `--from-step=N` / `--until-step=N` — schnell zum Problem-Step springen
- `--step` — interaktiv pausen nach jedem Schritt (TTY)
- `--watch` — Re-run on file save

**Volle User-Doc:** `tools/test-runner/demo/README.md`
**Architektur/Roadmap (archiviert):** `docs/archive/concepts/demo-infrastructure.md`
**Headed-Verification-Checkliste (archiviert):** `docs/archive/concepts/demo-headed-verification.md`

> ⚠️ **Headless validiert** Editor-Source und Computed-Style. **Cursor-
> Animation, Pacing, Single-Cursor-Effekt, Highlights, Keystroke-Overlay**
> sind nur im headed-Lauf sichtbar — vor Major-Releases die Headed-
> Verification-Checkliste durchlaufen.

## Tests

Tests in `tests/` — siehe `docs/test-layers.md` für die volle Layer-Map.
Kurzversion:

- `tests/compiler/` (164 files) — Compiler Unit-Tests (Parser, IR, Backends)
- `tests/behavior/` (16) — Schicht 2: observable Feature-Semantik in jsdom
- `tests/contract/` (16) — App-Contract-Tests für `examples/*`
- `tests/differential/` (16) — Cross-Backend-Equivalenz (DOM ≡ React ≡ Framework)
- `tests/integration/` (19) — Multi-Feature-Interaktionen
- `tests/runtime/` (3) — Runtime-Module (typed TS) Unit-Tests
- `tests/studio/` (125) — Panels, Pickers, Editor, Sync
- `studio/test-api/suites/` — Browser-Tests via CDP (~225, separater Stack)

**Wichtig:** Kein Playwright. Browser-Tests laufen über eigenen CDP Test Runner.

### Unit Tests (Vitest)

```bash
npm test                    # Alle Unit Tests
npm test -- --watch         # Watch Mode
npm test -- parser          # Nur Parser Tests
```

### Browser Test Framework

Eigenes Test-Framework für Studio-Tests direkt im Browser. Ersetzt Playwright.

**Test-Kategorien (17 Hauptkategorien):**

| Kategorie     | Beschreibung                                    |
| ------------- | ----------------------------------------------- |
| core          | Primitives (Frame, Text, Button, Icon, etc.)    |
| layout        | Layout (direction, gap, grid, stacked, wrap)    |
| styling       | Styling (colors, sizing, spacing, gradients)    |
| visuals       | Animations & Transforms                         |
| states        | State Management (toggle, exclusive, hover)     |
| components    | UI Patterns (checkbox, dialog, tabs, accordion) |
| drag          | Drag & Drop Operationen                         |
| handles       | Visual Handles (padding, margin, gap, resize)   |
| selection     | Multi-select, Ungroup, Spread Toggle            |
| propertyPanel | Property Panel UI                               |
| editor        | Bidirectional Sync, Undo/Redo, Autocomplete     |
| data          | Data Binding, Actions, Events, Responsive       |
| project       | Multi-File Projects, Workflows                  |
| compiler      | Compiler Verification                           |
| ai            | AI-Assist (Draft Lines, Draft Mode)             |
| tutorial      | Tutorial Verification                           |
| stress        | Stress Tests, Integration, Play Mode            |

### CLI Test Runner (CDP)

Headless Browser-Tests via Chrome DevTools Protocol. Modularer, sauberer Code in `tools/test-runner/`.

```bash
# Studio Server starten (Terminal 1)
npm run studio

# Tests ausführen (Terminal 2)
npm run test:browser:progress     # Alle Tests mit Fortschrittsanzeige (empfohlen)
npm run test:browser:drag         # Nur Drag Tests
npm run test:browser:mirror       # Nur Mirror Tests
npm run test:browser:headed       # Mit sichtbarem Browser

# Erweiterte Optionen (via npx)
npx tsx tools/test.ts --progress --category=layout  # Kategorie mit Fortschritt
npx tsx tools/test.ts --progress --all              # Alle Tests mit Fortschritt
npx tsx tools/test.ts --filter="token"              # Nach Name filtern
npx tsx tools/test.ts --junit=results.xml           # JUnit Report
npx tsx tools/test.ts --html=report.html            # HTML Report
npx tsx tools/test.ts --retries=2                   # Retry bei Failures
```

**NPM Scripts:**

| Script                          | Beschreibung                                |
| ------------------------------- | ------------------------------------------- |
| `npm run test:browser:progress` | Alle Tests mit Live-Fortschritt (empfohlen) |
| `npm run test:browser:drag`     | Nur Drag & Drop Tests                       |
| `npm run test:browser:mirror`   | Nur Mirror Tests                            |
| `npm run test:browser:headed`   | Mit sichtbarem Browser                      |

**CLI Optionen:**

| Option             | Beschreibung                                        |
| ------------------ | --------------------------------------------------- |
| `--progress`       | Live-Fortschrittsanzeige + Log-Datei                |
| `--all`            | Alle Tests ausführen                                |
| `--category=X`     | Einzelne Kategorie                                  |
| `--filter=PATTERN` | Filter nach Name (Regex)                            |
| `--log=PATH`       | Log-Datei Pfad (default: test-results/test-run.log) |

**Kategorien:** core, layout, styling, visuals, states, components, drag, handles, selection, propertyPanel, editor, data, project, compiler, ai, tutorial, stress

**Execution:**

| Option         | Beschreibung              |
| -------------- | ------------------------- |
| `--headed`     | Browser sichtbar          |
| `--bail`       | Bei erstem Fehler stoppen |
| `--retries=N`  | N Retries bei Failure     |
| `--timeout=MS` | Timeout pro Test          |

**Reports:**

| Option                 | Beschreibung                |
| ---------------------- | --------------------------- |
| `--junit=PATH`         | JUnit XML (CI-Integration)  |
| `--html=PATH`          | HTML Report mit Screenshots |
| `--screenshot-dir=DIR` | Screenshot-Verzeichnis      |
| `--no-screenshot`      | Keine Screenshots           |

**Geschätzte Testdauer pro Kategorie:**

| Kategorie  | Tests | Dauer   | Empfehlung             |
| ---------- | ----- | ------- | ---------------------- |
| core       | ~50   | ~30s    | Direkt ausführen       |
| layout     | ~80   | ~45s    | Direkt ausführen       |
| styling    | ~60   | ~35s    | Direkt ausführen       |
| editor     | ~40   | ~30s    | Direkt ausführen       |
| components | ~250  | ~3min   | Direkt oder Background |
| drag       | ~100  | ~2min   | Direkt oder Background |
| --all      | ~2100 | ~15-20m | Background empfohlen   |

**Test-Ausführung für Claude:**

```bash
# SCHNELLE TESTS (< 2 min): Direkt ausführen
npx tsx tools/test.ts --category=layout

# LÄNGERE TESTS: Mit run_in_background, dann TaskOutput prüfen
# (Nie sleep verwenden - das wartet immer die volle Zeit!)

# FILTER für gezielte Tests (am schnellsten):
npx tsx tools/test.ts --filter="Drag Column"
```

**Architektur:** `tools/test-runner/`

```
tools/test-runner/
├── types.ts           # Type Definitions
├── chrome.ts          # Chrome Launcher
├── cdp.ts             # CDP Client
├── console-collector.ts
├── screenshot.ts
├── runner.ts          # Test Orchestration
├── cli.ts             # CLI Entry Point
└── reporters/
    ├── console.ts     # Terminal Output
    ├── junit.ts       # JUnit XML
    └── html.ts        # HTML Report
```

**Output:**

```
🧪 Running Real Drag & Drop Tests...

  ✅ Drop Button into empty Frame (467ms)
  ✅ Drop Text into empty Frame (465ms)
  ✅ Move element to first position (466ms)
  ...

Results: 40/46 passed (6 failed)
```

### Browser-Konsole APIs

| API                  | Beschreibung                               |
| -------------------- | ------------------------------------------ |
| `__mirrorTest`       | Compiler-Tests, DOM-Inspektion, Assertions |
| `__mirrorTestSuites` | Einheitliches Test-Suite System            |
| `__dragTest`         | Drag-API für Interaktionen (intern)        |

**Quick Start:**

```javascript
// Filter & Run Tests
__mirrorTest.filter('Button') // Tests mit "Button" im Namen
__mirrorTest.category('zag') // Alle Zag-Tests
__mirrorTest.only('Checkbox toggle') // Einzelner Test
__mirrorTest.list() // Kategorien auflisten

// Drag & Drop Tests (unified)
__mirrorTestSuites.runCategory('comprehensiveDrag')

// Debug Mode
__mirrorTest.debug('Checkbox toggle') // Step-by-Step Debug
__mirrorTest.step() // Weiter zum nächsten Schritt
__mirrorTest.abort() // Debug abbrechen

// Element inspizieren
__mirrorTest.inspect('node-1')
// → { nodeId, tagName, styles, textContent, children, ... }

// Assertions
__mirrorTest.expect('node-1').hasText('Hello').hasBackground('#2271C1')
```

**Test-Suites:** `studio/test-api/suites/`

**Dokumentation:** `docs/TEST-FRAMEWORK.md` (vollständige API-Referenz, Best Practices, Troubleshooting)
