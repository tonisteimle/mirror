# Mirror

**Die Sprache für AI-unterstütztes UI-Design.**

Mirror ist eine DSL, die AI versteht *und* Menschen lesen können. AI generiert Code, Designer verfeinern ihn – ohne Framework-Wissen, ohne Build-Tools.

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

| Datei | Beschreibung |
|-------|--------------|
| `studio/bootstrap.ts` | Architektur Entry Point |
| `studio/core/state.ts` | Single Source of Truth |
| `studio/modules/file-manager/` | File Operations |
| `studio/modules/compiler/` | Compiler Wrapper |
| `studio/pickers/` | Color, Token, Icon, Animation Picker |
| `studio/panels/` | Property, Tree, Files Panel |
| `compiler/ir/index.ts` | IR-Transformation, SourceMap |
| `compiler/backends/dom.ts` | DOM Code-Generator |
| `compiler/studio/code-modifier.ts` | Code-Änderungen |
| `compiler/schema/dsl.ts` | DSL Schema (Single Source of Truth) |
| `compiler/validator/index.ts` | Code Validator API |

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

---

## Mirror DSL Tutorial

Das folgende Tutorial ist die vollständige Referenz für die Mirror DSL. Es erklärt alle Konzepte mit Beispielen.

**Struktur:**
- **Die Sprache (00-09)**: Grundlagen, Layout, Styling, Interaktion, Daten
- **Komponenten-Bibliothek (10-13)**: 50+ fertige UI-Bausteine mit Zag.js

---

### 00-intro: Was ist Mirror?

Mirror ist eine Sprache, die AI versteht *und* Menschen lesen können. AI generiert, du verfeinerst.

**Warum Mirror?** Heutige Programmiersprachen sind für Designer nicht lesbar. Kleine Änderungen werden zum Pain. Mirror löst das:

```mirror
Button "Speichern", bg #2563eb, col white, pad 12 24, rad 6
```

Das ist ein blauer Button. `bg #2563eb` → `bg #10b981` und der Button ist grün. Keine Magie, keine versteckten Dateien.

**Lesbar wie ein Dokument** – kurze, eindeutige Abkürzungen:

```mirror
Frame hor, gap 12, pad 16, bg #1a1a1a, rad 8
  Icon "user", ic #2563eb, is 24
  Frame gap 2
    Text "Max Mustermann", col white, fs 14, weight 500
    Text "Designer", col #888, fs 12
```

| Abkürzung | Bedeutung |
|-----------|-----------|
| `hor` | horizontal |
| `gap` | Abstand zwischen Kindern |
| `pad` | Padding |
| `bg` | Hintergrund |
| `rad` | Radius |
| `col` | Farbe |
| `fs` | Schriftgröße |

**Hierarchie durch Einrückung** – Kinder werden eingerückt. Keine schließenden Tags, keine Klammern:

```mirror
Frame bg #1a1a1a, pad 20, rad 12, gap 16
  Text "Titel", col white, fs 18, weight bold
  Text "Beschreibung hier", col #888, fs 14
  Frame hor, gap 8
    Button "Abbrechen", pad 10 20, rad 6, bg #333, col white
    Button "OK", pad 10 20, rad 6, bg #2563eb, col white
```

---

### 01-elemente: Elemente & Hierarchie

**Die Grundsyntax:** Element-Name, optionaler Text in Anführungszeichen, Properties mit Kommas:

```mirror
Button "Speichern", bg #2563eb, col white, pad 12 24, rad 6
```

**Primitives** – die Grundelemente:

| Primitive | Beschreibung |
|-----------|--------------|
| `Frame` | Container – das zentrale Layout-Element |
| `Text` | Textinhalt |
| `Image` | Bild |
| `Icon` | Icon (Lucide) |
| `Button` | Klickbarer Button |
| `Input` | Einzeiliges Eingabefeld |
| `Link` | Anklickbarer Link |

**Styling-Properties:**

```mirror
Frame gap 16
  // Farben: bg = Hintergrund, col = Textfarbe
  Text "Farbiger Text", bg #2563eb, col white, pad 8 16, rad 4

  // Größen: w = Breite, h = Höhe
  Frame w 200, h 50, bg #10b981, rad 4, center
    Text "200 x 50", col white

  // Ecken: rad = Radius
  Frame hor, gap 8
    Frame w 50, h 50, bg #f59e0b, rad 0
    Frame w 50, h 50, bg #f59e0b, rad 8
    Frame w 50, h 50, bg #f59e0b, rad 25
```

| Property | Beschreibung | Beispiel |
|----------|--------------|----------|
| `bg` | Hintergrundfarbe | `bg #2563eb` |
| `col` | Textfarbe | `col white` |
| `pad` | Innenabstand | `pad 12` oder `pad 12 24` |
| `margin` | Außenabstand | `margin 16` |
| `w` / `h` | Breite / Höhe | `w 200, h 100` |
| `rad` | Eckenradius | `rad 8` |
| `fs` | Schriftgröße | `fs 18` |

**Hierarchie durch Einrückung** – Kinder mit **2 Leerzeichen** einrücken:

```mirror
Frame bg #1a1a1a, pad 20, rad 8, gap 12
  Text "Titel", col white, fs 18, weight bold
  Text "Untertitel", col #888
  Frame hor, gap 8
    Button "Abbrechen", pad 10 20, rad 6, bg #333, col white
    Button "OK", pad 10 20, rad 6, bg #2563eb, col white
```

**Icons** – von Lucide, Name in Anführungszeichen:

```mirror
Frame hor, gap 16
  Icon "check", ic #10b981, is 24
  Icon "x", ic #ef4444, is 24
  Icon "heart", ic #ef4444, is 24, fill
```

| Property | Beschreibung |
|----------|--------------|
| `is` | Icon-Größe in Pixel |
| `ic` | Icon-Farbe |
| `iw` | Strichstärke |
| `fill` | Ausgefüllte Variante |

---

### 02-komponenten: Komponenten

**Die Regel:** Mit `:` definierst du, ohne `:` verwendest du.

**Das Problem – Wiederholung:**

```mirror
Frame hor, gap 8
  Button "Speichern", pad 10 20, rad 6, bg #2563eb, col white
  Button "Abbrechen", pad 10 20, rad 6, bg #2563eb, col white
  Button "Löschen", pad 10 20, rad 6, bg #2563eb, col white
```

**Die Lösung – Komponenten definieren:**

```mirror
// Definition: Name mit :
Btn: pad 10 20, rad 6, bg #2563eb, col white

// Verwendung: Name ohne :
Frame hor, gap 8
  Btn "Speichern"
  Btn "Abbrechen"
  Btn "Löschen"
```

**Properties überschreiben:**

```mirror
Btn: pad 10 20, rad 6, bg #2563eb, col white

Frame hor, gap 8, wrap
  Btn "Standard"
  Btn "Grau", bg #333
  Btn "Rot", bg #dc2626
  Btn "Groß", pad 16 32, fs 18
```

**Komponenten mit Kindern:**

```mirror
Card: bg #1a1a1a, pad 16, rad 8, gap 8
  Title: col white, fs 16, weight 500
  Desc: col #888, fs 14

Frame hor, gap 12
  Card
    Title "Projekt Alpha"
    Desc "Das erste Projekt."
  Card
    Title "Projekt Beta"
    Desc "Ein anderes Projekt."
```

**Warum das funktioniert:** `Title:` und `Desc:` sind Komponenten-Definitionen innerhalb von `Card:`. Bei der Verwendung schreibst du `Title` und `Desc` ohne Doppelpunkt.

---

### 03-tokens: Vererbung & Tokens

**Vererbung mit `as`** – Varianten einer Basis-Komponente erstellen:

```mirror
// Basis-Button
Btn: pad 10 20, rad 6, cursor pointer

// Varianten erben mit "as"
PrimaryBtn as Btn: bg #2563eb, col white
DangerBtn as Btn: bg #ef4444, col white
GhostBtn as Btn: bg transparent, col #888, bor 1, boc #333

Frame hor, gap 8
  PrimaryBtn "Speichern"
  DangerBtn "Löschen"
  GhostBtn "Abbrechen"
```

**Warum `as`?** Du erbst `pad 10 20, rad 6, cursor pointer` und überschreibst nur Farben. Änderst du das Padding in `Btn:`, wirkt es in allen Varianten.

**Tokens definieren** – bei der **Definition** mit Suffix, bei der **Verwendung** ohne:

```mirror
// 1. TOKENS – Definition MIT Suffix
$btn.bg: #2563eb
$btn.col: white
$card.bg: #1a1a1a
$card.rad: 8

// 2. KOMPONENTEN – Tokens verwenden (OHNE Suffix)
Card: bg $card, rad $card, pad 16, gap 8
  Title: col white, fs 16, weight 500

Btn: bg $btn, col $btn, pad 10 20, rad 6

// 3. INSTANZEN – nur noch Inhalt
Card
  Title "Mit Tokens"
  Btn "Primary"
```

**Warum Suffixe?** Sie ermöglichen intelligentes Autocomplete: Bei `bg $` zeigt die IDE nur `.bg`-Tokens. Das Property sagt bereits den Typ.

**Semantische Tokens** – Rohwerte von Bedeutung trennen:

```mirror
// 1. PRIMITIVE – Rohwerte
$blue.bg: #2563eb
$red.bg: #ef4444

// 2. SEMANTISCH – Bedeutung zuweisen
$primary.bg: $blue
$danger.bg: $red

// 3. KOMPONENTEN – nur semantische Tokens
Btn: bg $primary, col white, pad 10 20, rad 6
DangerBtn: bg $danger, col white, pad 10 20, rad 6
```

**Warum?** Willst du die Primary-Farbe ändern, änderst du nur `$primary.bg: $green`. Alle Buttons passen sich an.

---

### 04-layout: Layout

Mirror bietet drei Layout-Systeme: **Flex**, **Grid**, **Stacked**.

#### Flex Layout

**Richtung:** `hor` (horizontal) und `ver` (vertikal, Standard)

```mirror
Frame gap 12
  // Vertikal (Standard)
  Frame bg #1a1a1a, pad 16, rad 8, gap 8
    Text "Zeile 1", col white
    Text "Zeile 2", col white

  // Horizontal
  Frame hor, bg #1a1a1a, pad 16, rad 8, gap 12
    Frame w 50, h 50, bg #2563eb, rad 6
    Frame w 50, h 50, bg #10b981, rad 6
```

**Wichtig – Defaults:** Beide richten Kinder am **Anfang** aus (`flex-start`). Keine automatische Zentrierung!

**Größen:** Pixel, `hug`, `full`

```mirror
Frame gap 8, w 300, bg #0a0a0a, pad 16, rad 8
  Frame w 120, h 40, bg #f59e0b, rad 4, center
    Text "w 120", col white, fs 12
  Frame w hug, h 40, bg #10b981, rad 4, center, pad 0 16
    Text "w hug", col white, fs 12
  Frame w full, h 40, bg #2563eb, rad 4, center
    Text "w full", col white, fs 12
```

**Ausrichtung:**

| Property | Beschreibung |
|----------|--------------|
| `center` | Beide Achsen zentrieren |
| `ver-center` | Nur vertikal zentrieren |
| `hor-center` | Nur horizontal zentrieren |
| `spread` | Kinder an Rändern verteilen |
| `tl` bis `br` | 9 Positionen (top-left bis bottom-right) |

```mirror
Frame hor, spread, ver-center, bg #1a1a1a, pad 16, rad 8
  Text "Links", col white
  Text "Rechts", col white
```

#### Grid Layout

Mit `grid N` aktivierst du ein N-Spalten-Grid. `w` bedeutet dann Spalten-Span:

```mirror
Frame grid 12, gap 8, bg #111, pad 16, rad 8
  Frame w 12, h 40, bg #2563eb, rad 4, center
    Text "w 12 (volle Breite)", col white, fs 12
  Frame w 6, h 40, bg #10b981, rad 4, center
    Text "w 6", col white, fs 12
  Frame w 6, h 40, bg #10b981, rad 4, center
    Text "w 6", col white, fs 12
```

**Explizite Platzierung** mit `x` und `y` (1-indexed):

```mirror
Frame grid 12, gap 8, bg #111, pad 16, rad 8, row-height 35
  Frame x 1, y 1, w 12, h 2, bg #2563eb, rad 4, center
    Text "Hero", col white, fs 12
  Frame x 1, y 3, w 3, h 3, bg #10b981, rad 4, center
    Text "Sidebar", col white, fs 12
  Frame x 4, y 3, w 9, h 3, bg #333, rad 4, center
    Text "Content", col white, fs 12
```

#### Stacked Layout

`stacked` stapelt Kinder übereinander. Positionierung mit `x` und `y`:

```mirror
Frame w 44, h 44, stacked
  Frame x 0, y 0, w 44, h 44, bg #1a1a1a, rad 8, center
    Icon "bell", ic #888, is 22
  Frame x 30, y -4, w 18, h 18, bg #ef4444, rad 99, center
    Text "3", col white, fs 10, weight 600
```

---

### 05-styling: Styling

**Farben:**

```mirror
Frame hor, gap 8
  Frame w 50, h 50, bg #2563eb, rad 6
  Frame w 50, h 50, bg white, rad 6
  Frame w 50, h 50, bg rgba(37,99,235,0.5), rad 6
```

**Gradients:**

```mirror
Frame gap 8
  Frame w full, h 50, rad 8, bg grad #2563eb #7c3aed
  Frame w full, h 50, rad 8, bg grad-ver #f59e0b #ef4444
  Frame w full, h 50, rad 8, bg grad 45 #10b981 #2563eb
```

**Borders:**

```mirror
Frame hor, gap 12
  Frame w 70, h 70, bor 2, boc #2563eb, rad 8
  Frame w 70, h 70, bg #1a1a1a, bor 1, boc #333, rad 8
```

**Typografie:**

```mirror
Frame gap 4, bg #1a1a1a, pad 16, rad 8
  Text "Headline", col white, fs 24, weight bold
  Text "Body Text", col #ccc, fs 14
  Text "UPPERCASE", col #666, fs 10, uppercase
```

| Property | Beschreibung |
|----------|--------------|
| `fs` | Schriftgröße |
| `weight` | thin, light, normal, medium, semibold, bold, black |
| `font` | sans, serif, mono |
| `italic`, `underline`, `uppercase`, `truncate` | Text-Stile |

**Effekte:**

```mirror
Frame hor, gap 16, pad 20, bg #0a0a0a
  Frame w 80, h 80, bg #1a1a1a, rad 8, shadow sm
  Frame w 80, h 80, bg #1a1a1a, rad 8, shadow md
  Frame w 80, h 80, bg #1a1a1a, rad 8, shadow lg
```

| Property | Beschreibung |
|----------|--------------|
| `shadow sm/md/lg` | Schatten |
| `opacity` | Transparenz (0-1) |
| `blur` | Element-Blur |
| `blur-bg` | Glaseffekt |
| `cursor` | pointer, grab, move, not-allowed |

---

### 06-states: Interaktion

**Das Konzept:** Ein **State** beschreibt, wie ein Element in einem Zustand aussieht.

**System-States** – automatisch vom Browser ausgelöst:

```mirror
Btn: pad 12 24, rad 6, bg #333, col white, cursor pointer
  hover:
    bg #2563eb
    scale 1.02

Btn "Hover mich"
```

**Custom States** – brauchen einen Trigger wie `toggle()`:

```mirror
Btn: pad 12 24, rad 6, bg #333, col white, cursor pointer, toggle()
  on:
    bg #2563eb

Btn "An/Aus"
```

**Warum die Trennung?** States beschreiben Styles, Funktionen definieren Aktionen. Der Browser weiß, wann `hover:` aktiv ist. Aber `on:` muss durch `toggle()` ausgelöst werden.

**States können alles ändern** – auch komplett andere Kinder (wie Figma Variants):

```mirror
ExpandBtn: pad 12, bg #333, col white, rad 6, hor, gap 8, cursor pointer, toggle()
  "Mehr zeigen"
  Icon "chevron-down", ic white, is 16
  open:
    "Weniger zeigen"
    Icon "chevron-up", ic white, is 16

ExpandBtn
```

**Mehrere States** – `toggle()` cyclet automatisch:

```mirror
StatusBtn: pad 12 24, rad 6, bg #333, col white, cursor pointer, hor, gap 8, toggle()
  Icon "circle", ic white, is 14
  doing:
    bg #f59e0b
    Icon "clock", ic white, is 14
  done:
    bg #10b981
    Icon "check", ic white, is 14

StatusBtn
```

**exclusive()** – nur einer aktiv:

```mirror
Tab: pad 12 20, rad 6, bg #333, col #888, cursor pointer, exclusive()
  active:
    bg #2563eb
    col white

Frame hor, gap 4, bg #1a1a1a, pad 4, rad 8
  Tab "Home"
  Tab "Projekte", active
  Tab "Settings"
```

**Auf andere Elemente reagieren** – mit `name` und `Name.state:`:

```mirror
Frame gap 12
  Button name MenuBtn "Menü", pad 10 20, rad 6, bg #333, col white, toggle()
    open:
      bg #2563eb

  Frame bg #1a1a1a, pad 12, rad 8, gap 4, hidden
    MenuBtn.open:
      visible
    Text "Dashboard", col white, fs 14, pad 8
    Text "Einstellungen", col white, fs 14, pad 8
```

---

### 07-functions: Functions

**Eingebaute Funktionen:**

| Funktion | Beschreibung |
|----------|--------------|
| `toggle()` | State wechseln (binär oder cycle) |
| `exclusive()` | Nur einer aktiv |
| `show(el)` / `hide(el)` | Sichtbarkeit |
| `navigate(view)` | Ansicht wechseln |
| `showBelow(el)` / `showModal(el)` | Overlays |
| `scrollTo(el)` / `scrollBy(el, x, y)` | Scrollen |

**show() und hide():**

```mirror
Frame gap 12, bg #0a0a0a, pad 16, rad 8
  Button "Info anzeigen", pad 10 20, bg #2563eb, col white, rad 6, show(InfoBox)

  Frame name InfoBox, hidden, bg #1a1a1a, pad 16, rad 8, gap 8
    Text "Hier sind weitere Informationen.", col #ccc, fs 14
    Button "Schließen", pad 8 16, bg #333, col white, rad 4, hide(InfoBox)
```

**navigate():**

```mirror
NavItem: Button pad 12 20, bg transparent, col #888, rad 6, cursor pointer
  selected:
    bg #2563eb
    col white

Frame gap 16
  Frame hor, gap 4, bg #1a1a1a, pad 4, rad 8
    NavItem "Home", navigate(HomeView)
    NavItem "Profil", selected, navigate(ProfileView)

  Frame bg #1a1a1a, pad 20, rad 8
    HomeView: Frame name HomeView, hidden
      Text "Home", col white
    ProfileView: Frame name ProfileView
      Text "Profil", col white
```

**Eigene JavaScript-Funktionen:**

```mirror
Btn: pad 12 24, bg #333, col white, save()
  loading:
    bg #666
    "Wird gespeichert..."
  success:
    bg #10b981
    "Gespeichert!"
```

```javascript
async function save(element) {
  element.state = 'loading'
  const response = await fetch('/api/save')
  element.state = response.ok ? 'success' : 'error'
}
```

---

### 08-daten: Daten & Variablen

**Einfache Variablen:**

```mirror
name: "Max"
count: 42

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "Name: " + $name, col white
  Text "Count: " + $count, col #888
```

**Warum `$`?** Bei der Definition ohne `$`, bei der Verwendung mit `$`. Das unterscheidet Variablen von Properties.

**Datenobjekte (Entry-Format):**

```mirror
users:
  max:
    name: "Max"
    role: "Admin"
  anna:
    name: "Anna"
    role: "User"

each user in $users
  Frame hor, gap 12, bg #1a1a1a, pad 12, rad 6
    Text user.name, col white, weight 500
    Text user.role, col #888, fs 12
```

**Externe .data-Dateien:**

```
// data/customers.data
max:
  name: Max Mustermann
  email: max@example.com

anna:
  name: Anna Schmidt
  email: anna@example.com
```

In Mirror: `$dateiname.eintrag.attribut`

```mirror
Text $customers.max.name
each customer in $customers
  Text customer.name
```

**Relationen:**

```mirror
users:
  toni:
    name: "Toni"

tasks:
  task1:
    title: "Design Review"
    assignee: $users.toni

Text $tasks.task1.assignee.name  // → "Toni"
```

**Block Conditionals:**

```mirror
$loggedIn: true

if loggedIn
  Text "Willkommen zurück!", col white
else
  Button "Anmelden", bg #2563eb, col white, pad 10 20, rad 6
```

**Inline Conditionals (Ternary):**

```mirror
$active: true

Button "Status", bg active ? #2563eb : #333, col white, pad 10 20, rad 6
```

**Faustregel:** Element ein-/ausblenden → `if`-Block. Nur Property ändern → Ternary.

---

### 09-seiten: Seiten & Apps

**Tabs: Inline vs. Datei**

```mirror
// Inline-Content (hat Kinder)
Tabs defaultValue "home"
  Tab "Home", value "home"
    Text "Willkommen zuhause"
  Tab "Settings", value "settings"
    Text "Einstellungen"

// Datei-Content (keine Kinder)
Tabs defaultValue "home"
  Tab "Home", value "home"       // → home.mirror
  Tab "Settings", value "settings" // → settings.mirror
```

**Die Regel:** Hat ein Tab Kinder → Inhalt inline. Keine Kinder → Inhalt aus Datei.

**Komponenten teilen mit `use`:**

```mirror
// components.mirror
Card: bg #1a1a1a, pad 16, rad 8
PrimaryBtn as Button: bg #2563eb, col white, pad 10 20, rad 6
```

```mirror
// dashboard.mirror
use components

Card
  Text "Willkommen"
  PrimaryBtn "Los geht's"
```

---

### 10-eingabe: Eingabe-Komponenten

50+ Zag-Komponenten für Forms, Selection und DateTime.

#### Form Controls

**Checkbox:**

```mirror
Checkbox
  Root: hor, gap 10, cursor pointer
  Control: w 20, h 20, bor 2, boc #444, rad 4
  Label: col white, fs 14
  "Newsletter abonnieren"
```

**Switch:**

```mirror
Switch
  Root: hor, gap 12
  Track: w 44, h 24, rad 99, bg #333, pad 2
  Thumb: w 20, h 20, rad 99, bg white
  Label: col white, fs 14
  "Dark Mode"
```

**RadioGroup:**

```mirror
RadioGroup defaultValue "monthly"
  Root: gap 12
  Item: hor, gap 10, cursor pointer
  ItemControl: w 20, h 20, bor 2, boc #444, rad 99
  ItemText: col white, fs 14

  Radio "Monatlich", value "monthly"
  Radio "Jährlich", value "yearly"
```

**Slider:**

```mirror
Slider defaultValue 50, min 0, max 100
  Root: gap 8
  Label: hor, spread
    Text "Lautstärke", col white
    ValueText col #888, fs 12
  Track: h 6, bg #333, rad 99
  Range: bg #2563eb, rad 99
  Thumb: w 18, h 18, bg white, rad 99
```

**NumberInput:**

```mirror
NumberInput defaultValue 1, min 0, max 10
  Root: hor, gap 8
  Label: col white, fs 14
  DecrementTrigger: Button "-", w 32, h 32, bg #333, rad 4
  Input: w 60, bg #1a1a1a, pad 8, rad 4, col white
  IncrementTrigger: Button "+", w 32, h 32, bg #333, rad 4
```

#### Selection & Menus

**Select:**

```mirror
Select
  Trigger: bg #1a1a1a, bor 1, boc #333, pad 12, rad 6, hor, spread, w 200
    ValueText col white
    Icon "chevron-down", ic #666, is 16
  Content: bg #1a1a1a, rad 8, pad 4, shadow lg
  Item: pad 10 12, rad 4, col white, cursor pointer
    hover:
      bg #333
  Option "React", value "react"
  Option "Vue", value "vue"
  Option "Svelte", value "svelte"
```

**Combobox:**

```mirror
Combobox
  Root: gap 4
  Label: col #888, fs 12
  Control: hor, bg #1a1a1a, bor 1, boc #333, rad 6
  Input: bg transparent, pad 12, col white, bor 0, w full
  Trigger: pad 12
    Icon "chevron-down", ic #666, is 16
  Content: bg #1a1a1a, rad 8, pad 4, shadow lg
  Item: pad 10 12, rad 4, col white
  Option "Apple", value "apple"
  Option "Banana", value "banana"
  Option "Cherry", value "cherry"
```

**Menu:**

```mirror
Menu
  Trigger: Button "Aktionen", pad 10 16, bg #333, col white, rad 6
  Content: bg #1a1a1a, pad 4, rad 8, shadow lg, w 180
  Item: pad 10 12, rad 4, col white, cursor pointer
    hover:
      bg #333
  MenuItem "Bearbeiten", icon "edit"
  MenuItem "Duplizieren", icon "copy"
  Separator: h 1, bg #333, margin 4 0
  MenuItem "Löschen", icon "trash", col #ef4444
```

**ContextMenu:**

```mirror
ContextMenu
  Trigger: Frame w 200, h 100, bg #1a1a1a, rad 8, center
    Text "Rechtsklick hier", col #888
  Content: bg #1a1a1a, pad 4, rad 8, shadow lg
  Item: pad 10 12, rad 4, col white
  MenuItem "Ausschneiden"
  MenuItem "Kopieren"
  MenuItem "Einfügen"
```

#### Date & Time

**DatePicker:**

```mirror
DatePicker
  Control: hor, bg #1a1a1a, bor 1, boc #333, rad 6
  Input: bg transparent, pad 12, col white, bor 0
  Trigger: pad 12
    Icon "calendar", ic #666, is 18
  Content: bg #1a1a1a, pad 16, rad 12, shadow lg
```

**Timer:**

```mirror
Timer autoStart, countdown, startMs 60000
  Root: center, gap 16
  Area: fs 48, weight bold, col white, font mono
  Control: hor, gap 8
  ActionTrigger: Button pad 10 20, bg #333, col white, rad 6
```

---

### 11-navigation: Navigation-Komponenten

#### Tabs

```mirror
Tabs defaultValue "home"
  List: bor 0 0 1 0, boc #333
  Trigger: pad 12 20, col #888
  Indicator: h 2, bg #2563eb
  Content: pad 16
  Tab "Dashboard", value "a"
    Text "Dashboard content"
  Tab "Analytics", value "b"
    Text "Analytics content"
```

| Slot | Beschreibung |
|------|--------------|
| `List:` | Container um Tab-Header |
| `Trigger:` | Klickbarer Tab |
| `Indicator:` | Strich unter aktivem Tab |
| `Content:` | Panel-Container |

#### Accordion

```mirror
Accordion
  Item: bg #1a1a1a, rad 8, margin 0 0 4 0
  ItemTrigger: pad 16
  ItemContent: pad 0 16 16 16, col #888
  AccordionItem "Section 1"
    Text "Content for section 1"
  AccordionItem "Section 2"
    Text "Content for section 2"
```

Mit `multiple` können mehrere gleichzeitig offen sein. Mit `icon "plus"` änderst du das Chevron.

#### Collapsible

```mirror
Collapsible defaultOpen
  Trigger:
    Frame hor, spread, pad 12, bg #1a1a1a, rad 8, cursor pointer
      Text "Filter", weight 500
      Icon "chevron-down"
  Content:
    Frame gap 8, pad 12
      Text "Status: Aktiv", col #888
```

**Unterschied zu Accordion:** Bei Collapsible definierst du `Trigger:` und `Content:` explizit.

#### SideNav

```mirror
Frame hor, h full
  SideNav defaultValue "dashboard"
    NavItem "Dashboard", icon "home", value "dashboard", navigate(DashboardView)
    NavItem "Projects", icon "folder", value "projects", navigate(ProjectsView)

    NavGroup "Settings", collapsible, defaultOpen
      NavItem "Account", icon "user", value "account"
      NavItem "Security", icon "shield", value "security"

  Frame w full, pad 24
    DashboardView: Frame name DashboardView
      Text "Dashboard"
    ProjectsView: Frame name ProjectsView, hidden
      Text "Projects"
```

| Props | Beschreibung |
|-------|--------------|
| `defaultValue` | Welches Item aktiv startet |
| `collapsed` | Nur Icons anzeigen |
| `navigate(View)` | Welches Element anzeigen |

#### Steps

```mirror
Steps defaultValue 1
  List: hor, gap 16
  Item: hor, gap 8
  ItemIndicator: w 32, h 32, rad 99, bg #333, center
    active:
      bg #2563eb
    complete:
      bg #10b981
  ItemSeparator: h 2, w 40, bg #333

  Step "Account"
  Step "Profile"
  Step "Complete"
```

#### Pagination

```mirror
Pagination count 100, pageSize 10
  Root: hor, gap 4
  PrevTrigger: Button pad 8 12, bg #333, rad 4
    Icon "chevron-left", ic white, is 16
  Item: pad 8 12, bg #333, rad 4, col white
    selected:
      bg #2563eb
  NextTrigger: Button pad 8 12, bg #333, rad 4
    Icon "chevron-right", ic white, is 16
```

#### TreeView

```mirror
TreeView
  Root: gap 2
  Branch: pad 0 0 0 16
  BranchControl: hor, gap 8, pad 8, rad 4, cursor pointer
  BranchIndicator: Icon "chevron-right", ic #666, is 14
  Item: pad 8 8 8 24, rad 4, col white

  TreeBranch "src"
    TreeItem "index.ts"
    TreeItem "app.ts"
    TreeBranch "components"
      TreeItem "Button.tsx"
```

---

### 12-overlays: Overlays

**Tooltip:**

```mirror
Tooltip positioning "top"
  Trigger: Button "Hover me"
  Content: Text "This is a tooltip"
```

**Popover:**

```mirror
Popover
  Trigger: Button "Open Popover"
  Content: Frame gap 12, pad 16, bg #1a1a1a, rad 8, w 200
    Text "Title", weight bold
    Text "Description text"
    CloseTrigger: Button "Close", bg #333
```

**HoverCard:**

```mirror
HoverCard positioning "bottom"
  Trigger: Text "@johndoe", col #3b82f6, underline, cursor pointer
  Content: Frame gap 12, pad 16, bg #1a1a1a, rad 12, w 250
    Frame hor, gap 12
      Frame w 48, h 48, bg #3b82f6, rad 99, center
        Text "JD", col white
      Frame gap 2
        Text "John Doe", weight 600
        Text "@johndoe", col #666, fs 14
```

**Dialog:**

```mirror
Dialog
  Trigger: Button "Open Dialog"
  Backdrop: bg rgba(0,0,0,0.5)
  Content: Frame gap 16, pad 24, bg #1a1a1a, rad 12, w 320
    Text "Dialog Title", weight bold, fs 18
    Text "Dialog content here"
    Frame hor, gap 8
      CloseTrigger: Button "Cancel", bg #333
      Button "Confirm", bg #2563eb
```

| Komponente | Auslöser | Anwendung |
|------------|----------|-----------|
| `Tooltip` | Hover | Kurze Hilfetexte |
| `Popover` | Klick | Menüs, Formulare |
| `HoverCard` | Hover | Vorschauen |
| `Dialog` | Klick | Modale Fenster |

---

### 13-anzeige: Anzeige-Komponenten

#### Avatar

```mirror
Avatar
  Root: w 48, h 48, rad 99, bg #333
  Image: src "avatar.jpg"
  Fallback: Text "JD", col white, weight 500
```

#### Progress

```mirror
Progress value 65
  Root: gap 8
  Label: hor, spread
    Text "Uploading...", col white
    ValueText col #888, fs 12
  Track: h 8, bg #333, rad 99
  Range: bg #2563eb, rad 99
```

#### CircularProgress

```mirror
CircularProgress value 75
  Root: w 120, h 120
  Circle: stroke #2563eb, stroke-width 8
  CircleTrack: stroke #333, stroke-width 8
  ValueText: fs 24, weight bold, col white
```

#### Carousel

```mirror
Carousel
  Root: gap 16
  ItemGroup: hor, gap 16
  Item: w 200, h 150, bg #1a1a1a, rad 8, shrink
  Control: hor, gap 8
  PrevTrigger: Button pad 8, bg #333, rad 4
    Icon "chevron-left", ic white
  NextTrigger: Button pad 8, bg #333, rad 4
    Icon "chevron-right", ic white
  Slide
    Text "Slide 1"
  Slide
    Text "Slide 2"
```

#### FileUpload

```mirror
FileUpload maxFiles 5
  Root: gap 12
  Dropzone: pad 32, bor 2, boc #333, rad 8, center, cursor pointer
    hover:
      boc #2563eb
    Icon "upload", ic #666, is 32
    Text "Drop files here", col #888
  ItemGroup: gap 8
  Item: hor, spread, pad 12, bg #1a1a1a, rad 6
  ItemName: col white, fs 14
  ItemDeleteTrigger: Button bg transparent
    Icon "x", ic #666, is 16
```

#### Toast

```mirror
Toast
  Root: hor, gap 12, pad 16, bg #1a1a1a, rad 8, shadow lg
  Title: col white, weight 500
  Description: col #888, fs 14
  CloseTrigger: Button bg transparent
    Icon "x", ic #666
```

#### Clipboard

```mirror
Clipboard value "npm install mirror-lang"
  Root: hor, gap 8, bg #1a1a1a, pad 12, rad 6
  Input: bg transparent, col white, bor 0, w full
  Trigger: Button pad 8, bg #333, rad 4
    Icon "copy", ic white, is 16
  Indicator
    copied:
      Icon "check", ic #10b981, is 16
```

#### QRCode

```mirror
QRCode value "https://mirror.dev"
  Root: pad 16, bg white, rad 8
  Frame: w 128, h 128
```

---

## Häufige Fehler

### Syntax

| Falsch | Richtig | Warum |
|--------|---------|-------|
| `Text "Hello" col white` | `Text "Hello", col white` | Komma nach String |
| `Frame w 100px` | `Frame w 100` | Keine Einheiten |
| `Frame w "200"` | `Frame w 200` | Zahlen ohne Quotes |

### Komponenten

| Falsch | Richtig | Warum |
|--------|---------|-------|
| `Btn: "Speichern"` | `Btn "Speichern"` | Kein `:` bei Verwendung |
| `PrimaryBtn pad 12` | `PrimaryBtn: pad 12` | `:` bei Definition |
| `PrimaryBtn: Button pad 12` | `PrimaryBtn as Button: pad 12` | `as` bei Primitive-Erweiterung |

### Tokens

| Falsch | Richtig | Warum |
|--------|---------|-------|
| `primary: #2563eb` | `$primary.bg: #2563eb` | `$` und Suffix bei Definition |
| `bg $primary.bg` | `bg $primary` | Kein Suffix bei Verwendung |

### States

| Falsch | Richtig | Warum |
|--------|---------|-------|
| `hover` (ohne `:`) | `hover:` | State braucht `:` |
| `toggle` (ohne `()`) | `toggle()` | Funktion braucht `()` |
| `Btn "Text", on:` | `Btn "Text", on` | Kein `:` bei Instanz |

### Icons

| Falsch | Richtig | Warum |
|--------|---------|-------|
| `Icon check` | `Icon "check"` | Name in Quotes |
| `Icon "check", is #10b981` | `Icon "check", ic #10b981` | `ic` für Farbe, `is` für Größe |

---

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
| SideNav | sidenav | Root, Header, Footer +10 | Sidebar navigation |
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
| background | bg | <color>, $token, grad #a #b, grad-ver #a #b, grad N #a #b |
| color | col, c | <color>, $token, grad #a #b, grad-ver #a #b |
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
| showAt | - |
| showBelow | - |
| showAbove | - |
| showLeft | - |
| showRight | - |
| showModal | - |
| dismiss | - |
| scrollTo | - |
| scrollBy | - |
| scrollToTop | - |
| scrollToBottom | - |
| get | - |
| set | - |
| increment | - |
| decrement | - |
| reset | - |
| copy | - |

### States

**System-States** (impliziter Trigger): hover, focus, active, disabled

**Custom-States** (beliebige Namen möglich): on, open, closed, active, selected, expanded, collapsed, loading, error, valid, invalid, ...

**Syntax:**
- `on:` / `open:` / `loading:` – Custom States definieren
- `hover:` / `focus:` / `active:` – System-States (kein Trigger)
- `Btn "Text", on` – Instanz im State starten
- `toggle()` – Eingebaute Funktion (Klick ist Default)
- `save()` – Eigene JavaScript-Funktion aufrufen
- `onenter search()` – Bei Enter-Taste
- `name MenuBtn` – Element benennen
- `MenuBtn.open:` – Auf State reagieren

### Keyboard Keys

escape, enter, space, tab, backspace, delete, arrow-up, arrow-down, arrow-left, arrow-right, home, end

<!-- GENERATED:DSL-PROPERTIES:END -->

## Tests

Tests in `tests/`:
- `tests/compiler/` - IR, Backend, Layout, Zag-Komponenten
- `tests/studio/` - Panels, Pickers, Editor, Sync
- `tests/e2e/` - Playwright Browser-Tests

Dokumentation: `tests/compiler/regeln.md` (bewiesene Regeln), `tests/compiler/strategie.md` (Teststrategie)
