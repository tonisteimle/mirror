# Mirror

DSL für rapid UI prototyping. Kompiliert zu DOM oder React.

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

## Mirror DSL Tutorial

Das folgende Tutorial ist die vollständige Referenz für die Mirror DSL. Es erklärt alle Konzepte mit Beispielen.

### 00-intro: Was ist Mirror?


## Der Code ist das Design

In Mirror beschreibst du, was du siehst:

```mirror
Button "Speichern", bg #2563eb, col white, pad 12 24, rad 6
```

Das ist ein blauer Button mit weißem Text, Padding 12/24, Radius 6. Kein Import. Kein Export. Keine Konfiguration. Was du schreibst, erscheint auf dem Bildschirm.

Mirror kompiliert zu HTML, DOM oder React. Du baust keine Mockups – du baust funktionierende Prototypen.

## Lesbar wie ein Dokument

Mirror verwendet kurze, eindeutige Abkürzungen:

```mirror
Frame hor, gap 12, pad 16, bg #1a1a1a, rad 8
  Icon "user", ic #2563eb, is 24
  Frame gap 2
    Text "Max Mustermann", col white, fs 14, weight 500
    Text "Designer", col #888, fs 12
```

- `hor` – horizontal
- `gap` – Abstand zwischen Kindern
- `pad` – Padding
- `bg` – Hintergrund
- `rad` – Radius
- `col` – Farbe
- `fs` – Schriftgröße

Die Abkürzungen sind der Anfang des Wortes. Nach wenigen Minuten liest sich Mirror-Code wie eine Beschreibung des UIs.

## Hierarchie durch Einrückung

Kinder werden eingerückt. Keine schließenden Tags, keine Klammern. Die Struktur ist sichtbar:

```mirror
Frame bg #1a1a1a, pad 20, rad 12, gap 16
  Text "Titel", col white, fs 18, weight bold
  Text "Beschreibung hier", col #888, fs 14
  Frame hor, gap 8
    Button "Abbrechen", pad 10 20, rad 6, bg #333, col white
    Button "OK", pad 10 20, rad 6, bg #2563eb, col white
```

Der Code sieht aus wie ein Baum, weil er ein Baum ist.

## Von Element zu Komponente: Ein Zeichen

Du hast einen Button gebaut und willst ihn wiederverwenden? Füge einen Namen mit Doppelpunkt hinzu:

```mirror
// Vorher: Ein einzelner Button
Button "Speichern", bg #2563eb, col white, pad 12 24, rad 6
```

```mirror
// Nachher: Eine wiederverwendbare Komponente
PrimaryBtn: = Button bg #2563eb, col white, pad 12 24, rad 6

PrimaryBtn "Speichern"
PrimaryBtn "Senden"
PrimaryBtn "Weiter"
```

Keine separate Datei. Kein Import. Kein Export. Die Definition ist dort, wo du sie brauchst.

## Tokens für Design-Systeme

Farben, Abstände, Radien – definiere sie einmal, verwende sie überall:

```mirror
$primary.bg: #2563eb
$card.bg: #1a1a1a
$card.rad: 8

Card: bg $card, rad $card, pad 16, gap 8
  Title: col white, fs 16, weight 500

Card
  Title "Mit Tokens"
  Text "Änderst du den Token, ändert sich alles.", col #888, fs 13
```

Tokens + Komponenten = konsistentes Design ohne Wiederholung.

## States ohne Komplexität

Interaktionen sind States. Ein State beschreibt, wie ein Element in einem Zustand aussieht:

```mirror
Btn: pad 12 24, rad 6, bg #333, col white, cursor pointer, toggle()
  hover:
    bg #444
  on:
    bg #2563eb

Btn "Anklicken"
```

`hover:` – wenn die Maus darüber ist. `on:` – wenn aktiviert. `toggle()` – bei Klick den State wechseln (Klick ist Default).

Ein State kann sogar komplett andere Inhalte haben:

```mirror
ExpandBtn: pad 12 20, bg #1a1a1a, col white, rad 6, hor, gap 8, cursor pointer, toggle()
  "Mehr zeigen"
  Icon "chevron-down", ic #888, is 16
  open:
    "Weniger zeigen"
    Icon "chevron-up", ic #888, is 16

ExpandBtn
```

## JavaScript wenn nötig

Mirror hat eingebaute Funktionen für typische Patterns – `toggle()`, `show()`, `hide()`, `navigate()`. Für komplexe Logik schreibst du JavaScript:

```mirror
Button "Speichern", save()
```

```javascript
async function saveData(element) {
  element.state = 'loading'
  await fetch('/api/save')
  element.state = 'success'
}
```

Mirror definiert das UI. JavaScript steuert die Logik. Beide arbeiten zusammen.

## Arbeite wie du willst

Mirror ist Text. Du kannst es schreiben in:

- **Jedem Texteditor** – VS Code, Sublime, vim
- **Mirror Studio** – einer IDE mit Live-Preview, visuellem Editing und Property-Panel

In Mirror Studio siehst du Code und Ergebnis nebeneinander. Ändere den Code, das Preview aktualisiert sich. Klicke ins Preview, der Code wird selektiert. Beides bleibt synchron.

## Zusammenarbeit mit AI

Mirror ist einfach genug, dass AI es versteht und generiert. Aber auch einfach genug, dass Menschen es lesen und anpassen können.

Das bedeutet:
- AI kann komplexe Layouts erstellen
- Du kannst Details selbst ändern – eine Farbe, einen Abstand, einen Text
- Der Code dokumentiert Design-Entscheidungen, die Mensch und AI verstehen

## Dieses Tutorial

Die folgenden Kapitel führen durch alle Konzepte:

| Kapitel | Thema |
|---------|-------|
| 01-03 | **Grundlagen** – Elemente, Komponenten, Tokens |
| 04 | **Layout** – Flex, Grid, Positionierung |
| 05 | **Styling** – Farben, Typografie, Effekte |
| 06-07 | **Interaktion** – States, Events, Functions |
| 08-09 | **Navigation** – Tabs, Accordion, Overlays |
| 10-12 | **Fortgeschritten** – Daten, Formulare, Theming |
| 13 | **Referenz** – Häufige Fehler und Checkliste |

Jedes Kapitel enthält interaktive Beispiele – der Code kann direkt bearbeitet werden, das Ergebnis erscheint live.

### 01-elemente: Elemente & Hierarchie


In diesem Kapitel lernst du die Basis-Syntax von Mirror: Wie du Elemente erstellst, sie mit Properties gestaltest und durch Einrückung verschachtelst.

## Die Grundsyntax

Ein Mirror-Element besteht aus dem **Element-Namen**, optionalem **Text-Inhalt** in Anführungszeichen, und **Properties** getrennt durch Kommas:

```mirror
Button "Speichern", bg #2563eb, col white, pad 12 24, rad 6
```

Lies das so: _Ein Button mit Text "Speichern", blauem Hintergrund, weißer Schrift, Padding 12/24 und Radius 6._

## Primitives

Primitives sind die Grundelemente von Mirror. Es gibt über 50 davon – hier die Basis-Elemente für den Einstieg:

```mirror
Frame gap 12, pad 16, bg #1a1a1a, rad 8
  Text "Eine Überschrift", col white, fs 18
  Text "Normaler Text darunter", col #888
  Button "Klick mich", bg #2563eb, col white, pad 10 20, rad 6
  Input placeholder "E-Mail eingeben...", bg #333, col white, pad 10, rad 4
```

| Primitive | Beschreibung |
|-----------|--------------|
| `Frame` | Container – das zentrale Layout-Element |
| `Text` | Textinhalt |
| `Image` | Bild |
| `Icon` | Icon (Lucide oder Material) |
| `Button` | Klickbarer Button |
| `Input` | Einzeiliges Eingabefeld |
| `Link` | Anklickbarer Link |

> **Note:** Weitere Primitives: `Textarea`, `Label`, `Divider`, `Spacer`, semantische Elemente (`Header`, `Nav`, `Main`, `Section`, `Footer`, `H1`–`H6`) und über 50 Zag-Komponenten (`Dialog`, `Tabs`, `Menu`, `Select`, etc.).

## Styling-Properties

Properties steuern das Aussehen. Zahlen sind Pixel, `#hex` sind Farben:

```mirror
Frame gap 16

  // Farben: bg = Hintergrund, col = Textfarbe
  Text "Farbiger Text", bg #2563eb, col white, pad 8 16, rad 4

  // Abstände: pad = innen, margin = außen
  Text "Mit Padding", pad 16, bg #333, col white, rad 4

  // Größen: w = Breite, h = Höhe (in Pixel)
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
| `pad` | Innenabstand (Padding) | `pad 12` oder `pad 12 24` |
| `margin` | Außenabstand | `margin 16` |
| `w` / `h` | Breite / Höhe | `w 200, h 100` |
| `rad` | Eckenradius | `rad 8` |
| `fs` | Schriftgröße | `fs 18` |

## Hierarchie durch Einrückung

Kinder-Elemente werden mit **2 Leerzeichen** eingerückt. So entsteht die Struktur:

```mirror
// Eltern-Element
Frame bg #1a1a1a, pad 20, rad 8, gap 12

  // Kind 1: Text
  Text "Titel", col white, fs 18, weight bold

  // Kind 2: Text
  Text "Untertitel", col #888

  // Kind 3: Frame mit eigenen Kindern
  Frame hor, gap 8
    Button "Abbrechen", pad 10 20, rad 6, bg #333, col white
    Button "OK", pad 10 20, rad 6, bg #2563eb, col white
```

`Frame` ist der wichtigste Container. Er ordnet seine Kinder standardmäßig **vertikal** an. Mit `hor` wird horizontal angeordnet.

## Layout-Properties (Vorschau)

Mit Layout-Properties steuerst du, wie Kinder innerhalb eines Frames angeordnet werden. Hier die wichtigsten – Details im [Layout-Kapitel](04-layout.html):

```mirror
Frame gap 16

  // hor = horizontal anordnen
  Frame hor, gap 8, bg #1a1a1a, pad 12, rad 6
    Frame w 40, h 40, bg #2563eb, rad 4
    Frame w 40, h 40, bg #10b981, rad 4
    Frame w 40, h 40, bg #f59e0b, rad 4

  // center = horizontal und vertikal zentrieren
  Frame w 200, h 60, bg #1a1a1a, rad 6, center
    Text "Zentriert", col white

  // spread = Kinder an den Rändern verteilen
  Frame hor, spread, w 300, bg #1a1a1a, pad 12, rad 6
    Text "Links", col white
    Text "Rechts", col white

  // gap = Abstand zwischen Kindern
  Frame hor, gap 24, bg #1a1a1a, pad 12, rad 6
    Text "A", col white
    Text "B", col white
    Text "C", col white
```

| Property | Beschreibung |
|----------|--------------|
| `hor` | Kinder horizontal anordnen |
| `ver` | Kinder vertikal anordnen (Standard) |
| `gap` | Abstand zwischen Kindern |
| `center` | Kinder zentrieren (beide Achsen) |
| `spread` | Kinder an Rändern verteilen |
| `wrap` | Kinder umbrechen wenn kein Platz |

## Icons

Icons kommen von [Lucide](https://lucide.dev/icons/) (Standard) oder [Material Icons](https://fonts.google.com/icons). Der Name kommt in Anführungszeichen:

```mirror
Frame gap 16

  // Lucide Icons (Standard)
  Frame hor, gap 16
    Icon "check", ic #10b981, is 24
    Icon "x", ic #ef4444, is 24
    Icon "settings", ic #888, is 24
    Icon "user", ic #2563eb, is 24

  // fill = ausgefüllte Variante
  Frame hor, gap 16
    Icon "heart", ic #ef4444, is 24
    Icon "heart", ic #ef4444, is 24, fill

  // material = Material Icons statt Lucide
  Frame hor, gap 16
    Icon "star", ic #f59e0b, is 24, material
    Icon "star", ic #f59e0b, is 24, material, fill

  // Icons in Buttons
  Button pad 10 16, rad 6, bg #2563eb, col white
    Frame hor, gap 8, center
      Icon "save", ic white, is 16
      Text "Speichern"
```

| Property | Beschreibung | Beispiel |
|----------|--------------|----------|
| `is` | Icon-Größe in Pixel | `is 24` |
| `ic` | Icon-Farbe | `ic #2563eb` |
| `iw` | Strichstärke | `iw 1.5` |
| `fill` | Ausgefüllte Variante | `Icon "heart", fill` |
| `material` | Material Icons verwenden | `Icon "star", material` |

## Praxisbeispiel: Card

Kombiniere alles zu einer typischen UI-Komponente:

```mirror
Frame w 300, bg #1a1a1a, rad 12, pad 20, gap 16

  // Header mit Icon
  Frame hor, gap 12, center
    Icon "user", ic #2563eb, is 32
    Frame gap 2
      Text "Max Mustermann", col white, fs 16, weight semibold
      Text "Software Engineer", col #888, fs 13

  // Beschreibung
  Text "Arbeitet an spannenden Projekten.", col #aaa, fs 14

  // Action-Buttons
  Frame hor, gap 8
    Button pad 10 16, rad 6, bg #2563eb, col white
      Frame hor, gap 6, center
        Icon "mail", ic white, is 14
        Text "Nachricht"
    Button "Folgen", pad 10 16, rad 6, bg #333, col white
```


## Das Wichtigste

| Syntax | Bedeutung |
|--------|-----------|
| `Element "Text", prop value` | Grundsyntax |
| `Frame, Text, Button, Input` | Primitives |
| `bg, col, pad, rad, w, h, fs` | Styling |
| `hor, ver, gap, center, spread` | Layout |
| `2 Leerzeichen Einrückung` | Kind-Element |

### 02-komponenten: Komponenten


Dieses Kapitel hat eine Regel: **Mit `:` definierst du, ohne `:` verwendest du.** Diese Regel gilt überall – ob für Buttons, Cards oder komplexe Layouts.

## Das Problem: Wiederholung

Wenn du mehrere Buttons mit dem gleichen Styling brauchst, musst du alles wiederholen:

```mirror
Frame hor, gap 8
  Button "Speichern", pad 10 20, rad 6, bg #2563eb, col white
  Button "Abbrechen", pad 10 20, rad 6, bg #2563eb, col white
  Button "Löschen", pad 10 20, rad 6, bg #2563eb, col white
```

Das ist mühsam. Änderst du das Styling, musst du es dreimal anpassen.

## Komponenten definieren

Mit einem **Doppelpunkt nach dem Namen** definierst du eine Komponente. Bei der Verwendung lässt du den Doppelpunkt weg:

```mirror
// Definition: Name mit :
Btn: pad 10 20, rad 6, bg #2563eb, col white

// Verwendung: Name ohne :
Frame hor, gap 8
  Btn "Speichern"
  Btn "Abbrechen"
  Btn "Löschen"
```

`Btn:` speichert die Properties. `Btn "Text"` wendet sie an.

## Properties überschreiben

Bei der Verwendung kannst du Properties überschreiben. Die übrigen bleiben erhalten:

```mirror
Btn: pad 10 20, rad 6, bg #2563eb, col white

Frame hor, gap 8, wrap
  Btn "Standard"
  Btn "Grau", bg #333
  Btn "Rot", bg #dc2626
  Btn "Groß", pad 16 32, fs 18
```

`Btn "Grau", bg #333` überschreibt nur den Hintergrund. Padding, Radius und Textfarbe kommen von der Definition.

## Komponenten erweitern

Eine Komponente kann beliebig erweitert werden – auch mit Kindern:

```mirror
Card: bg #1a1a1a, pad 16, rad 8, gap 8

Card
  Text "Titel", col white, fs 16, weight 500
  Text "Beschreibung", col #888, fs 14
  Button "Aktion", pad 8 16, rad 6, bg #2563eb, col white
```

`Card:` definiert nur den Container. Bei der Verwendung fügst du beliebige Kinder hinzu.

## Komponenten in Komponenten

Jetzt der entscheidende Schritt. Du kannst Komponenten *innerhalb* einer Komponente definieren – mit der gleichen Regel:

```mirror
// Card mit zwei Kind-Komponenten
Card: bg #1a1a1a, pad 16, rad 8, gap 8, w 200
  Title: col white, fs 16, weight 500
  Desc: col #888, fs 14

// Verwendung: gleiche Regel
Frame hor, gap 12
  Card
    Title "Projekt Alpha"
    Desc "Das erste Projekt."
  Card
    Title "Projekt Beta"
    Desc "Ein anderes Projekt."
```

`Title:` und `Desc:` sind Komponenten-Definitionen innerhalb von `Card:`. Bei der Verwendung schreibst du `Title` und `Desc` ohne Doppelpunkt – genau wie bei `Card` selbst.

**Es ist dieselbe Regel, nur verschachtelt.**

## Beliebige Kinder in Kind-Komponenten

Kind-Komponenten können selbst wieder erweitert werden:

```mirror
Card: bg #1a1a1a, pad 16, rad 8, gap 12
  Title: col white, fs 16, weight 500
  Content: gap 8

Card
  Title "Benutzer"
  Content
    Text "Max Mustermann", col white, fs 14
    Text "max@example.com", col #888, fs 12
    Button "Profil", pad 8 16, rad 6, bg #333, col white
```

`Content:` definiert nur `gap 8`. Bei der Verwendung fügst du beliebige Kinder hinzu – Text, Buttons, weitere Komponenten.

## Layouts

Das gleiche Prinzip funktioniert für App-Layouts:

```mirror
AppShell: w full, h 180, hor
  Sidebar: w 140, h full, bg #1a1a1a, pad 12, gap 8
  Main: w full, h full, bg #0c0c0c, pad 20

AppShell
  Sidebar
    Text "Navigation", col #888, fs 11, uppercase
    Text "Dashboard", col white, fs 14
    Text "Settings", col white, fs 14
  Main
    Text "Hauptinhalt", col white, fs 18
```

`AppShell:` definiert das Grundgerüst. `Sidebar:` ist 140px breit, `Main:` füllt den Rest (`w full`). Bei der Verwendung befüllst du beide – ohne Doppelpunkt.

## Tiefe Verschachtelung

Die Regel gilt auf jeder Ebene:

```mirror
Card: w 260, bg #1a1a1a, rad 12, clip
  Title: w full, pad 16, bg #252525, col white, weight 500
  Desc: w full, pad 16, col #888, fs 14
  Footer: w full, pad 12 16, bg #151515, hor, spread
    Status: col #666, fs 12
    Action: pad 8 16, rad 6, bg #2563eb, col white

Card
  Title "Neues Projekt"
  Desc "Erstelle ein neues Projekt."
  Footer
    Status "Schritt 1/3"
    Action "Weiter"
```

`Footer:` enthält `Status:` und `Action:`. Bei der Verwendung: `Footer` enthält `Status` und `Action`. Immer dieselbe Regel.


## Das Wichtigste

**Eine Regel:** Mit `:` definierst du, ohne `:` verwendest du.

Diese Regel gilt:
- Für Komponenten (`Btn:` → `Btn`)
- Für Komponenten in Komponenten (`Title:` → `Title`)
- Auf jeder Verschachtelungsebene

| Syntax | Bedeutung |
|--------|-----------|
| `Name:` | Komponente definieren |
| `Name` | Komponente verwenden |

### 03-tokens: Vererbung & Tokens


Dieses Kapitel zeigt zwei Konzepte für skalierbare UIs: Mit `as` erstellst du Varianten einer Komponente (z.B. PrimaryBtn, DangerBtn). Mit Tokens definierst du Werte zentral und verwendest sie überall.

## Das Problem: Ähnliche Komponenten

Du hast einen Button definiert und brauchst nun Varianten – Primary, Danger, Ghost. Ohne Vererbung müsstest du alles kopieren:

```mirror
// Ohne Vererbung: Alles wiederholen
PrimaryBtn: pad 10 20, rad 6, cursor pointer, bg #2563eb, col white
DangerBtn: pad 10 20, rad 6, cursor pointer, bg #ef4444, col white
GhostBtn: pad 10 20, rad 6, cursor pointer, bg transparent, col #888, bor 1, boc #333

Frame hor, gap 8
  PrimaryBtn "Speichern"
  DangerBtn "Löschen"
  GhostBtn "Abbrechen"
```

Das Problem: `pad 10 20, rad 6, cursor pointer` wird dreimal wiederholt. Änderst du das Padding, musst du es überall anpassen.

## Vererbung mit as

Mit `as` erbst du von einer Basis-Komponente und überschreibst nur das, was sich unterscheidet:

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

## Vererbung mit Slots

Auch Komponenten mit Slots können vererbt werden:

```mirror
// Basis-Card
Card: bg #1a1a1a, pad 16, rad 8, gap 8
  Title: fs 16, weight 500, col white
  Body: col #888, fs 14

// Feature-Card erbt und erweitert
FeatureCard as Card: bor 1, boc #333
  Icon: margin 0 0 8 0

// Verwendung
FeatureCard
  Icon
    Icon "zap", ic #f59e0b, is 24
  Title "Schnell"
  Body "Kompiliert in Millisekunden"
```

## Design Tokens definieren

Tokens sind zentrale Werte für konsistentes Design. Bei der **Definition** gibst du einen Suffix an (`.bg`, `.col`, `.rad`), bei der **Verwendung** nicht – das Property sagt bereits, welcher Typ erwartet wird:

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

// 3. INSTANZEN – sauber, nur Inhalt
Card
  Title "Mit Tokens"
  Btn "Primary"
```

**Warum Suffixe?** Sie ermöglichen intelligentes Autocomplete: Tippst du `bg $`, zeigt die IDE nur Tokens mit `.bg` Suffix. Bei `rad $` nur `.rad` Tokens.

## Semantische Tokens

Tokens können andere Tokens referenzieren. Damit trennst du **Rohwerte** (welche Farben existieren) von ihrer **Bedeutung** (wofür sie stehen):

```mirror
// 1. PRIMITIVE – Rohwerte (deine Farbpalette)
$blue.bg: #2563eb
$red.bg: #ef4444
$gray.bg: #1a1a1a

// 2. SEMANTISCH – Bedeutung zuweisen
// Diese Tokens referenzieren primitive mit $
$primary.bg: $blue    // "primary" = aktuell "blue"
$danger.bg: $red      // "danger" = aktuell "red"
$card.bg: $gray

// 3. KOMPONENTEN – nur semantische Tokens
// Sie wissen nicht, welche Farbe dahinter steckt
Btn: bg $primary, col white, pad 10 20, rad 6
DangerBtn: bg $danger, col white, pad 10 20, rad 6
Card: bg $card, rad 8, pad 16, gap 8
  Title: col white, fs 16, weight 500

// 4. INSTANZEN
Card
  Title "Semantische Tokens"
  Frame hor, gap 8
    Btn "Speichern"
    DangerBtn "Löschen"
```

Willst du die Primary-Farbe ändern, änderst du nur `$primary.bg: $green`. Alle Buttons passen sich an – ohne dass du eine Komponente anfassen musst. Das ist die Basis für Theming.

## Die drei Stufen: Tokens → Komponenten → Instanzen

Ein vollständiges Design System hat drei Ebenen. Am Ende sind die Instanzen komplett sauber – keine Farben, keine Abstände, nur Inhalt:

```mirror
// 1. TOKENS – Werte zentral definieren
$btn.bg: #2563eb
$btn.col: white
$card.bg: #1a1a1a
$card.rad: 8
$space.pad: 16

// 2. KOMPONENTEN – Tokens verwenden
Card: bg $card, rad $card, pad $space, gap 12
  Title: col white, fs 16, weight 500
  Desc: col #888, fs 14

Btn: bg $btn, col $btn, pad 10 20, rad 6, cursor pointer

// 3. INSTANZEN – nur noch Inhalt, kein Styling!
Card
  Title "Design System"
  Desc "Tokens + Komponenten = Konsistenz"
  Frame hor, gap 8
    Btn "Speichern"
    Btn "Abbrechen"
```

Der Vorteil: Instanzen sind lesbar wie ein Dokument. Alle Design-Entscheidungen stecken in Tokens und Komponenten – änderst du dort etwas, wirkt es überall.


## Das Wichtigste

| Syntax | Bedeutung |
|--------|-----------|
| `Child as Parent:` | Vererbung – Varianten einer Komponente |
| `$blue.bg: #2563eb` | Primitiver Token – Rohwert |
| `$primary.bg: $blue` | Semantischer Token – referenziert anderen Token |
| `bg $primary` | Token verwenden (ohne Suffix) |

### 04-layout: Layout


Mirror bietet drei Layout-Systeme: **Flex** für fließende Layouts (Navigation, Cards), **Grid** für strukturierte Raster (Dashboards, Page-Layouts), und **Stacked** für überlagerte Elemente (Badges, Overlays).

## Flex Layout

### Richtung: hor und ver

Standardmäßig fließen Kinder vertikal (untereinander). Mit `hor` wechselst du auf horizontal:

```mirror
Frame gap 12
  // Vertikal (Standard)
  Frame bg #1a1a1a, pad 16, rad 8, gap 8
    Text "Zeile 1", col white
    Text "Zeile 2", col white
    Text "Zeile 3", col white

  // Horizontal
  Frame hor, bg #1a1a1a, pad 16, rad 8, gap 12
    Frame w 50, h 50, bg #2563eb, rad 6, center
      Text "1", col white
    Frame w 50, h 50, bg #10b981, rad 6, center
      Text "2", col white
    Frame w 50, h 50, bg #f59e0b, rad 6, center
      Text "3", col white
```

### Größen: w und h

Drei Optionen für Breite und Höhe:

```mirror
Frame gap 8, w 300, bg #0a0a0a, pad 16, rad 8
  // Fester Wert in Pixeln
  Frame w 120, h 40, bg #f59e0b, rad 4, center
    Text "w 120", col white, fs 12

  // hug = nur so groß wie der Inhalt
  Frame w hug, h 40, bg #10b981, rad 4, center, pad 0 16
    Text "w hug", col white, fs 12

  // full = verfügbaren Platz füllen
  Frame w full, h 40, bg #2563eb, rad 4, center
    Text "w full", col white, fs 12
```

### Zentrieren und Verteilen

```mirror
Frame gap 12
  // center – beide Achsen
  Frame w 200, h 80, bg #1a1a1a, rad 8, center
    Text "center", col white

  // spread – an die Ränder
  Frame hor, spread, bg #1a1a1a, pad 16, rad 8
    Text "Links", col white
    Text "Rechts", col white
```

### 9 Positionen

Kinder an einer von 9 Positionen platzieren:

```mirror
Frame hor, gap 8
  Frame w 70, h 70, bg #1a1a1a, rad 6, tl
    Text "tl", col #888, fs 11
  Frame w 70, h 70, bg #1a1a1a, rad 6, tc
    Text "tc", col #888, fs 11
  Frame w 70, h 70, bg #1a1a1a, rad 6, tr
    Text "tr", col #888, fs 11

Frame hor, gap 8, margin 8 0 0 0
  Frame w 70, h 70, bg #1a1a1a, rad 6, cl
    Text "cl", col #888, fs 11
  Frame w 70, h 70, bg #1a1a1a, rad 6, center
    Text "cen", col #888, fs 11
  Frame w 70, h 70, bg #1a1a1a, rad 6, cr
    Text "cr", col #888, fs 11

Frame hor, gap 8, margin 8 0 0 0
  Frame w 70, h 70, bg #1a1a1a, rad 6, bl
    Text "bl", col #888, fs 11
  Frame w 70, h 70, bg #1a1a1a, rad 6, bc
    Text "bc", col #888, fs 11
  Frame w 70, h 70, bg #1a1a1a, rad 6, br
    Text "br", col #888, fs 11
```

### Wrap

Bei Überlauf in die nächste Zeile umbrechen:

```mirror
Frame hor, wrap, gap 8, bg #1a1a1a, pad 16, rad 8, w 240
  Frame w 60, h 40, bg #2563eb, rad 4, center
    Text "1", col white
  Frame w 60, h 40, bg #2563eb, rad 4, center
    Text "2", col white
  Frame w 60, h 40, bg #2563eb, rad 4, center
    Text "3", col white
  Frame w 60, h 40, bg #2563eb, rad 4, center
    Text "4", col white
  Frame w 60, h 40, bg #2563eb, rad 4, center
    Text "5", col white
```

## Grid Layout

Grid ist für strukturierte Raster. Du definierst Spalten, Elemente werden in Zellen platziert.

### Grid aktivieren

Mit `grid N` aktivierst du ein N-Spalten-Grid:

```mirror
Frame grid 12, gap 8, bg #111, pad 16, rad 8
  // w = Spalten-Span (nicht Pixel!)
  Frame w 12, h 40, bg #2563eb, rad 4, center
    Text "w 12 (volle Breite)", col white, fs 12
  Frame w 6, h 40, bg #10b981, rad 4, center
    Text "w 6", col white, fs 12
  Frame w 6, h 40, bg #10b981, rad 4, center
    Text "w 6", col white, fs 12
  Frame w 4, h 40, bg #f59e0b, rad 4, center
    Text "w 4", col white, fs 12
  Frame w 4, h 40, bg #f59e0b, rad 4, center
    Text "w 4", col white, fs 12
  Frame w 4, h 40, bg #f59e0b, rad 4, center
    Text "w 4", col white, fs 12
```

### Explizite Platzierung

Mit `x` und `y` platzierst du Elemente exakt (1-indexed):

```mirror
Frame grid 12, gap 8, bg #111, pad 16, rad 8, row-height 35
  Frame x 1, y 1, w 12, h 2, bg #2563eb, rad 4, center
    Text "Hero", col white, fs 12

  Frame x 1, y 3, w 3, h 3, bg #10b981, rad 4, center
    Text "Sidebar", col white, fs 12

  Frame x 4, y 3, w 9, h 3, bg #333, rad 4, center
    Text "Content", col white, fs 12

  Frame x 1, y 6, w 12, h 1, bg #1a1a1a, rad 4, center
    Text "Footer", col #888, fs 11
```

### Grid als Komponente

```mirror
// Layout-Komponente
Dashboard: grid 12, gap 12, row-height 25, h 200
  Header: x 1, y 1, w 12, h 2, bg #1a1a1a, rad 6, pad 0 16, hor, spread, center
  Nav: x 1, y 3, w 2, h 5, bg #1a1a1a, rad 6, pad 12, gap 4
  Main: x 3, y 3, w 10, h 5, grid 2, gap 12

Widget: bg #252525, rad 6, pad 12, gap 4
  Title: col white, fs 13, weight 500
  Value: col #2563eb, fs 24, weight 600

// Verwendung
Dashboard
  Header
    Text "Dashboard", col white, weight 500
    Text "Admin", col #888, fs 12
  Nav
    Text "Menu", col #666, fs 10, uppercase
    Text "Overview", col white, fs 12
    Text "Users", col #888, fs 12
  Main
    Widget
      Title "Users"
      Value "1,234"
    Widget
      Title "Revenue"
      Value "$12.4k"
```

## Stacked Layout

`stacked` stapelt Kinder übereinander. Positionierung mit `x` und `y` – wie in Figma:

```mirror
Frame w 200, h 150, stacked, bg #1a1a1a, rad 8
  // Vier Ecken
  Frame x 0, y 0, w 30, h 30, bg #ef4444, rad 4
  Frame x 170, y 0, w 30, h 30, bg #f59e0b, rad 4
  Frame x 0, y 120, w 30, h 30, bg #10b981, rad 4
  Frame x 170, y 120, w 30, h 30, bg #2563eb, rad 4

  // Mitte
  Frame x 80, y 55, w 40, h 40, bg white, rad 99
```

### Praktisch: Badge auf Icon

```mirror
Frame hor, gap 24
  // Icon mit Badge
  Frame w 44, h 44, stacked
    Frame x 0, y 0, w 44, h 44, bg #1a1a1a, rad 8, center
      Icon "bell", ic #888, is 22
    Frame x 30, y -4, w 18, h 18, bg #ef4444, rad 99, center
      Text "3", col white, fs 10, weight 600

  // Avatar mit Status
  Frame w 44, h 44, stacked
    Frame x 0, y 0, w 44, h 44, bg #2563eb, rad 99, center
      Text "TS", col white, fs 14, weight 500
    Frame x 30, y 30, w 14, h 14, bg #10b981, rad 99, bor 2, boc #111
```


## Zusammenfassung

| System | Verwendung |
|--------|------------|
| **Flex** | Fließende Layouts (Navigation, Cards) |
| **Grid** | Strukturierte Raster (Dashboards) |
| **Stacked** | Überlagerungen (Badges, Overlays) |

**Flex:**
- `hor`, `ver` – Richtung
- `gap N` – Abstand
- `center`, `spread` – Ausrichtung
- `tl` bis `br` – 9 Positionen
- `w/h`: Pixel, `hug`, `full`
- `wrap` – Zeilenumbruch

**Grid:**
- `grid 12` – 12-Spalten-Grid
- `w 4`, `h 2` – Spalten/Zeilen-Span
- `x 1, y 1` – Position (1-indexed)
- `row-height 40` – Zeilenhöhe

**Stacked:**
- `stacked` – Kinder übereinander
- `x`, `y` – Position (wie Figma)
- `w`, `h` – Größe
- `z N` – Stapelreihenfolge

### 05-styling: Styling


## Farben

Hex-Farben, benannte Farben und rgba:

```mirror
Frame hor, gap 8, wrap
  // Hex-Farben
  Frame w 50, h 50, bg #2563eb, rad 6
  Frame w 50, h 50, bg #10b981, rad 6
  Frame w 50, h 50, bg #f59e0b, rad 6
  Frame w 50, h 50, bg #ef4444, rad 6

  // Benannte Farben
  Frame w 50, h 50, bg white, rad 6
  Frame w 50, h 50, bg black, rad 6

  // Mit Transparenz
  Frame w 50, h 50, bg rgba(37,99,235,0.5), rad 6
  Frame w 50, h 50, bg #2563eb88, rad 6
```

## Gradients

Farbverläufe mit `grad`:

```mirror
Frame gap 8
  // Horizontal (Standard)
  Frame w full, h 50, rad 8, bg grad #2563eb #7c3aed

  // Vertikal
  Frame w full, h 50, rad 8, bg grad-ver #f59e0b #ef4444

  // Mit Winkel (45°)
  Frame w full, h 50, rad 8, bg grad 45 #10b981 #2563eb

  // Drei Farben
  Frame w full, h 50, rad 8, bg grad #10b981 #2563eb #7c3aed
```

Text-Gradients funktionieren genauso mit `col`:

```mirror
Frame bg #1a1a1a, pad 20, rad 8, gap 8
  Text "Gradient Text", fs 24, weight bold, col grad #2563eb #7c3aed
  Text "Vertical Gradient", fs 24, weight bold, col grad-ver #f59e0b #ef4444
```

## Borders

`bor` für Breite, `boc` für Farbe:

```mirror
Frame hor, gap 12
  // Border rundum
  Frame w 70, h 70, bor 2, boc #2563eb, rad 8, center
    Text "2px", col #888, fs 11

  // Dickerer Border
  Frame w 70, h 70, bor 4, boc #10b981, rad 8, center
    Text "4px", col #888, fs 11

  // Mit Hintergrund
  Frame w 70, h 70, bg #1a1a1a, bor 1, boc #333, rad 8, center
    Text "subtle", col #888, fs 11
```

## Border Radius

Von eckig bis rund:

```mirror
Frame hor, gap 12
  Frame w 60, h 60, bg #2563eb, rad 0, center
    Text "0", col white, fs 11
  Frame w 60, h 60, bg #2563eb, rad 4, center
    Text "4", col white, fs 11
  Frame w 60, h 60, bg #2563eb, rad 12, center
    Text "12", col white, fs 11
  Frame w 60, h 60, bg #2563eb, rad 99, center
    Text "99", col white, fs 11
```

`rad 99` erzeugt einen Kreis bei quadratischen Elementen.

## Typografie: Größe & Gewicht

`fs` für Schriftgröße, `weight` für Dicke:

```mirror
Frame gap 4, bg #1a1a1a, pad 16, rad 8
  Text "Headline", col white, fs 24, weight bold
  Text "Subheadline", col white, fs 18, weight 500
  Text "Body Text", col #ccc, fs 14
  Text "Small Text", col #888, fs 12
  Text "Caption", col #666, fs 10, uppercase
```

## Typografie: Stil

Text-Transformationen und Stile:

```mirror
Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "UPPERCASE TEXT", col white, uppercase
  Text "lowercase text", col white, lowercase
  Text "Italic Text", col white, italic
  Text "Underlined Text", col white, underline
  Text "Truncated text that is too long to fit...", col white, truncate, w 200
```

## Typografie: Fonts

Verschiedene Schriftarten:

```mirror
Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "Sans Serif (default)", col white, font sans
  Text "Serif Font", col white, font serif
  Text "Monospace Font", col white, font mono
```

## Shadows

Vordefinierte Schatten-Stufen:

```mirror
Frame hor, gap 16, pad 20, bg #0a0a0a
  Frame w 80, h 80, bg #1a1a1a, rad 8, shadow sm, center
    Text "sm", col #888, fs 11
  Frame w 80, h 80, bg #1a1a1a, rad 8, shadow md, center
    Text "md", col #888, fs 11
  Frame w 80, h 80, bg #1a1a1a, rad 8, shadow lg, center
    Text "lg", col #888, fs 11
```

## Opacity

Transparenz des gesamten Elements:

```mirror
Frame hor, gap 8
  Frame w 60, h 60, bg #2563eb, rad 8, center, opacity 1
    Text "1", col white, fs 11
  Frame w 60, h 60, bg #2563eb, rad 8, center, opacity 0.7
    Text "0.7", col white, fs 11
  Frame w 60, h 60, bg #2563eb, rad 8, center, opacity 0.4
    Text "0.4", col white, fs 11
  Frame w 60, h 60, bg #2563eb, rad 8, center, opacity 0.2
    Text "0.2", col white, fs 11
```

## Blur Effekte

`blur` für Element-Blur, `blur-bg` für Glaseffekt:

```mirror
Frame w 280, h 120, stacked, rad 8, clip
  // Bunter Hintergrund
  Frame w full, h full, bg grad 135 #2563eb #7c3aed #ec4899

  // Glaseffekt-Karte
  Frame x 40, y 20, w 200, h 80, bg rgba(255,255,255,0.1), rad 8, blur-bg 10, pad 16, center
    Text "Glassmorphism", col white, fs 14, weight 500
```

## Cursor

Mauszeiger-Stil ändern:

```mirror
Frame hor, gap 8, wrap
  Frame w 70, h 50, bg #1a1a1a, rad 6, center, cursor pointer
    Text "pointer", col #888, fs 10
  Frame w 70, h 50, bg #1a1a1a, rad 6, center, cursor grab
    Text "grab", col #888, fs 10
  Frame w 70, h 50, bg #1a1a1a, rad 6, center, cursor move
    Text "move", col #888, fs 10
  Frame w 70, h 50, bg #1a1a1a, rad 6, center, cursor not-allowed
    Text "not-allowed", col #888, fs 9
```

## Praktisch: Button Varianten

Verschiedene Button-Stile:

```mirror
Frame gap 12
  // Filled Buttons
  Frame hor, gap 8
    Button "Primary", bg #2563eb, col white, pad 10 20, rad 6
    Button "Success", bg #10b981, col white, pad 10 20, rad 6
    Button "Danger", bg #ef4444, col white, pad 10 20, rad 6

  // Outlined Buttons
  Frame hor, gap 8
    Button "Outline", bor 1, boc #2563eb, col #2563eb, pad 10 20, rad 6
    Button "Subtle", bg #2563eb22, col #2563eb, pad 10 20, rad 6

  // Ghost & Link
  Frame hor, gap 8
    Button "Ghost", col #888, pad 10 20, rad 6
    Button "Link →", col #2563eb, pad 10 20, underline
```

## Praktisch: Card Styles

Verschiedene Card-Designs:

```mirror
Frame hor, gap 12
  // Elevated
  Frame w 120, bg #1a1a1a, pad 16, rad 12, shadow md, gap 8
    Text "Elevated", col white, fs 13, weight 500
    Text "Mit Schatten", col #888, fs 11

  // Bordered
  Frame w 120, bor 1, boc #333, pad 16, rad 12, gap 8
    Text "Bordered", col white, fs 13, weight 500
    Text "Mit Border", col #888, fs 11

  // Gradient
  Frame w 120, pad 16, rad 12, gap 8, bg grad 135 #1a1a2e #16213e
    Text "Gradient", col white, fs 13, weight 500
    Text "Mit Verlauf", col #888, fs 11
```


## Zusammenfassung

- `bg, col` – Hintergrund & Textfarbe
- `bg grad #a #b`, `col grad #a #b` – Gradients (auch `grad-ver`, `grad 45`)
- `bor, boc, rad` – Border & Radius
- `fs, weight, font` – Schriftgröße, -dicke, -art
- `italic, underline, uppercase, truncate` – Text-Stile
- `shadow sm/md/lg` – Schatten
- `opacity, blur, blur-bg` – Transparenz & Blur
- `cursor pointer/grab/move` – Mauszeiger

### 06-states: Interaktion


Bisher haben wir statische UIs gebaut. Jetzt lernen wir, wie Elemente ihr Aussehen ändern können – bei Hover, bei Klick, oder wenn etwas anderes passiert. Das Konzept dahinter: **States**.

## Das Konzept: States

Ein **State** beschreibt, wie ein Element in einem bestimmten Zustand aussieht. Ein Button kann zum Beispiel diese States haben:

- **Base** – der Normalzustand (grauer Hintergrund)
- **hover** – wenn die Maus darüber ist (hellerer Hintergrund)
- **on** – wenn er aktiviert wurde (blauer Hintergrund)

In Mirror trennen wir klar:

| Syntax | Bedeutung |
|--------|-----------|
| `on:` | **State** – definiert das Aussehen |
| `toggle()` | **Funktion** – was bei Klick passiert |

States beschreiben Styles, Funktionen definieren Aktionen. Klick ist der Default-Event – du schreibst einfach die Funktion als Property.

## System-States: hover, focus, active

Manche States werden automatisch vom Browser ausgelöst – du musst keinen Trigger definieren. Der Browser weiß selbst, wann die Maus über einem Element ist:

```mirror
Btn: pad 12 24, rad 6, bg #333, col white, cursor pointer
  hover:
    bg #2563eb
    scale 1.02

Btn "Hover mich"
```

Der `hover:` State definiert nur das Aussehen. Der Browser kümmert sich darum, wann dieser State aktiv wird (Maus drüber) und wann nicht (Maus weg).

> **Note:** **System-States:** `hover:` (Maus darüber), `focus:` (Tastatur-Fokus), `active:` (während Klick gedrückt). Diese brauchen keinen Event-Trigger.

## Custom States und toggle()

Für eigene Interaktionen definierst du **Custom States**. Anders als System-States werden diese nicht automatisch ausgelöst – du brauchst eine Funktion die sie auslöst:

```mirror
Btn: pad 12 24, rad 6, bg #333, col white, cursor pointer, toggle()
  on:
    bg #2563eb

Btn "An/Aus"
```

Hier passieren zwei Dinge:

- `on:` definiert einen State namens "on" mit blauem Hintergrund
- `toggle()` wechselt bei Klick zwischen Base und dem State

**Base** ist der Normalzustand – die Styles, die du direkt am Element definierst (hier: `bg #333`). Du brauchst keinen extra "off" State.

### Im State starten

Manchmal soll ein Element bereits im aktivierten State starten. Dafür gibst du den State-Namen bei der Instanz an:

```mirror
Btn: pad 12 24, rad 6, bg #333, col white, cursor pointer, toggle()
  on:
    bg #2563eb

Frame hor, gap 12
  Btn "Normal"
  Btn "Bereits aktiv", on
```

Der zweite Button startet im `on` State (blauer Hintergrund). Ein Klick schaltet ihn auf Base zurück.

## States können alles ändern

Bisher haben States nur Styles geändert (Farben, Größen). Aber States können auch **komplett andere Kinder** haben – wie Figma Variants:

```mirror
ExpandBtn: pad 12, bg #333, col white, rad 6, hor, gap 8, cursor pointer, toggle()
  "Mehr zeigen"
  Icon "chevron-down", ic white, is 16
  open:
    "Weniger zeigen"
    Icon "chevron-up", ic white, is 16

ExpandBtn
```

Im Base-State zeigt der Button "Mehr zeigen" mit Pfeil nach unten. Im `open`-State wird _alles_ ausgetauscht: anderer Text, anderes Icon.

> **Note:** **Wie Figma Variants:** Jeder State kann eine komplett andere Version der Komponente sein – nicht nur andere Farben, sondern andere Inhalte, andere Struktur.

## Mehrere States

Was wenn du mehr als zwei Zustände brauchst? Ein Task kann "todo", "doing" oder "done" sein. `toggle()` erkennt das automatisch und cyclet durch alle States:

```mirror
StatusBtn: pad 12 24, rad 6, col white, cursor pointer, hor, gap 8, toggle()
  todo:
    bg #333
    Icon "circle", ic white, is 14
  doing:
    bg #f59e0b
    Icon "clock", ic white, is 14
  done:
    bg #10b981
    Icon "check", ic white, is 14

StatusBtn "Task 1"
```

`toggle()` erkennt automatisch wie viele States du hast:

- **1 State** → binärer Wechsel: default ↔ state
- **2+ States** → Cycle: todo → doing → done → todo → ...

> **Note:** **Wichtig:** Der _erste_ definierte State ist der Startzustand. Die Reihenfolge der Definition bestimmt die Cycle-Reihenfolge.

## Nur einer aktiv: exclusive()

Bei Tabs oder Radio-Buttons soll immer nur _ein_ Element aktiv sein. Wenn du eines aktivierst, werden alle anderen automatisch deaktiviert:

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

`exclusive()` macht zwei Dinge: Es aktiviert das geklickte Element und deaktiviert alle Geschwister des gleichen Typs.

**Gruppierung:** Mirror erkennt automatisch, welche Elemente zusammengehören – alle `Tab`-Instanzen mit dem gleichen Parent bilden eine Gruppe.

## Auf andere Elemente reagieren

Manchmal soll ein Element sein Aussehen ändern, wenn ein _anderes_ Element seinen State wechselt. Klassisches Beispiel: Ein Menü wird sichtbar, wenn ein Button aktiviert wird.

Dafür brauchst du zwei Dinge:

- Gib dem steuernden Element einen **Namen** mit `name`
- Referenziere diesen Namen mit `Name.state:`

```mirror
Frame gap 12
  Button "Menü", name MenuBtn, pad 10 20, rad 6, bg #333, col white, toggle()
    open:
      bg #2563eb

  Frame bg #1a1a1a, pad 12, rad 8, gap 4, hidden
    MenuBtn.open:
      visible
    Text "Dashboard", col white, fs 14, pad 8
    Text "Einstellungen", col white, fs 14, pad 8
```

`MenuBtn.open:` bedeutet: "Wenn das Element namens MenuBtn im State 'open' ist, wende diese Styles an." Das Menü startet `hidden` und wird sichtbar, sobald der Button aktiviert wird.

## Praktisch: Accordion

Ein Accordion zeigt im geschlossenen Zustand nur einen Header, im offenen Zustand auch den Inhalt:

```mirror
Panel: bg #1a1a1a, rad 8, clip, toggle()
  Frame hor, spread, pad 16, cursor pointer
    Text "Mehr anzeigen", col white, fs 14
    Icon "chevron-down", ic #888, is 18
  open:
    Frame hor, spread, pad 16, cursor pointer
      Text "Weniger anzeigen", col white, fs 14
      Icon "chevron-up", ic #888, is 18
    Frame pad 0 16 16 16, gap 8
      Text "Hier ist der versteckte Inhalt.", col #888, fs 13

Panel
```

Der Base-State zeigt "Mehr anzeigen" mit Pfeil nach unten. Der `open`-State zeigt "Weniger anzeigen" mit Pfeil nach oben plus den zusätzlichen Inhalt.

## Weitere Events

Klick ist der Default – du schreibst einfach die Funktion. Für andere Events wie Tastatureingaben gibt es Shorthands:

### Tastatur: onenter, onescape

Mit `onenter` oder `onescape` reagierst du auf Tastatureingaben:

```mirror
SearchStatus: col #888, fs 12, name Status
  "Tippe und drücke Enter..."
  searching:
    col #2563eb
    "Suche läuft..."

SearchBox: hor, gap 8, bg #1a1a1a, pad 12, rad 8
  Icon "search", ic #888, is 18
  Input placeholder "Suche...", bg transparent, col white, bor 0, w full, name SearchInput, onenter toggle()
    searching:
      bg #252525

Frame gap 12
  SearchBox
  SearchStatus
    SearchInput.searching:
      searching
```

| Event | Beschreibung |
|-------|--------------|
| `onenter` | Enter/Return-Taste |
| `onescape` | Escape-Taste |
| `onspace` | Leertaste |
| `onkeydown arrow-up` | Pfeiltaste hoch |
| `onkeydown arrow-down` | Pfeiltaste runter |


## Zusammenfassung

States definieren das Aussehen, Funktionen definieren Aktionen.

| Syntax | Bedeutung |
|--------|-----------|
| `hover:` | System-State (automatisch bei Maus-Hover) |
| `on:` | Custom State (visueller Block) |
| `toggle()` | Bei Klick State wechseln |
| `exclusive()` | Nur dieser aktiv (Geschwister aus) |
| `onenter search()` | Bei Enter-Taste |
| `Btn "Text", on` | Instanz startet im State "on" |
| `name MenuBtn` | Element benennen |
| `MenuBtn.open:` | Styles wenn MenuBtn in "open" |

### 07-functions: Functions


In [Kapitel 6](06-states.html) hast du States und Events kennengelernt. Events rufen Funktionen auf – und Mirror bietet viele **eingebaute Funktionen** für typische UI-Patterns: Buttons die ihren Zustand wechseln, Dropdowns die sich öffnen, Dialoge die zentriert erscheinen, Tabs die Inhalte wechseln.

## Übersicht

| Funktion | Beschreibung |
|----------|--------------|
| **STATE** | |
| `toggle()` | State wechseln (binär oder cycle) |
| `exclusive()` | Nur einer aktiv, Geschwister deaktivieren |
| **VISIBILITY** | |
| `show(el)` | Element einblenden |
| `hide(el)` | Element ausblenden |
| **NAVIGATION** | |
| `navigate(view)` | Ansicht wechseln (Tabs, Views) |
| `navigateToPage(file)` | Externe .mirror-Datei laden |
| **SELECTION** | |
| `select()` | Element auswählen |
| `highlightNext()` | Nächstes Element markieren |
| `highlightPrev()` | Vorheriges Element markieren |
| **OVERLAYS** | |
| `showBelow(el)` | Dropdown unter Trigger |
| `showAbove(el)` | Tooltip über Trigger |
| `showModal(el)` | Zentrierter Dialog |
| `dismiss(el)` | Overlay schließen |
| **SCROLL** | |
| `scrollTo(el)` | Zu Element scrollen |
| `scrollBy(el, x, y)` | Container um Offset scrollen |
| `scrollToTop(el?)` | Zum Anfang scrollen |
| **VALUES** | |
| `increment($t)` | Zähler erhöhen |
| `decrement($t)` | Zähler verringern |
| `set($t, value)` | Wert setzen |
| `reset($t)` | Auf Startwert zurücksetzen |
| **CLIPBOARD** | |
| `copy(text)` | In Zwischenablage kopieren |

## State-Funktionen

### toggle() – Zustände wechseln

`toggle()` wechselt zwischen States. Bei 1 Custom State: binär. Bei 2+ States: cycle.

**Binär (1 State):**

```mirror
FavBtn: Button pad 12, bg #1a1a1a, rad 6, cursor pointer, hor, gap 8, toggle()
  Icon "heart", ic #666, is 18
  "Merken"
  on:
    Icon "heart", ic #ef4444, is 18, fill
    "Gemerkt"
    col #ef4444

FavBtn
```

**Cycle (2+ States):**

```mirror
TaskBtn: Button pad 12 20, col white, rad 6, cursor pointer, hor, gap 8, toggle()
  todo:
    bg #333
    Icon "circle", ic white, is 14
    "Todo"
  doing:
    bg #f59e0b
    Icon "loader", ic white, is 14
    "In Arbeit"
  done:
    bg #10b981
    Icon "check", ic white, is 14
    "Erledigt"

TaskBtn
```

### exclusive() – Nur einer aktiv

```mirror
Tab: Button pad 12 20, rad 6, bg #252525, col #888, cursor pointer, exclusive()
  active:
    bg #2563eb
    col white

Frame hor, gap 4, bg #1a1a1a, pad 4, rad 8
  Tab "Dashboard"
  Tab "Projekte", active
  Tab "Einstellungen"
```

## Visibility-Funktionen

### show(element) / hide(element)

```mirror
Frame gap 12
  Button "Menü anzeigen", pad 10 20, bg #333, col white, rad 6, show(Menu)

  Menu: Frame hidden, bg #1a1a1a, pad 8, rad 8, gap 2, name Menu
    MenuItem: Button w full, pad 10 16, bg transparent, col white, rad 4
      hover:
        bg #333
    MenuItem "Profil"
    MenuItem "Einstellungen"
    Button "Schließen", pad 10 16, bg #333, col white, rad 4, w full, hide(Menu)
```

## Navigation-Funktionen

### navigate(ViewName) – Ansichten wechseln

```mirror
NavItem: Button pad 12 20, bg transparent, col #888, rad 6, cursor pointer
  selected:
    bg #2563eb
    col white
  hover:
    bg #333

Frame gap 16
  Frame hor, gap 4, bg #1a1a1a, pad 4, rad 8
    NavItem "Home", navigate(HomeView)
    NavItem "Profil", selected, navigate(ProfileView)
    NavItem "Settings", navigate(SettingsView)

  Frame bg #1a1a1a, pad 20, rad 8, h 100
    HomeView: Frame name HomeView, hidden
      Text "Home", col white, fs 16
    ProfileView: Frame name ProfileView
      Text "Profil", col white, fs 16
    SettingsView: Frame name SettingsView, hidden
      Text "Settings", col white, fs 16
```

## Selection-Funktionen

### select() – Listen-Auswahl

```mirror
ListItem: Frame pad 12 16, col #888, cursor pointer, rad 4, select()
  hover:
    bg #252525
  selected:
    bg #2563eb
    col white

Frame gap 2, bg #1a1a1a, pad 8, rad 8, w 200
  ListItem "Dokumente"
  ListItem "Bilder", selected
  ListItem "Downloads"
  ListItem "Musik"
```

## Overlay-Funktionen

### showBelow(element) – Dropdown positionieren

```mirror
MenuBtn: Button "Datei", pad 10 20, bg #333, col white, rad 6, name MenuBtn, showBelow(FileMenu)

FileMenu: Frame hidden, bg #1a1a1a, pad 4, rad 8, shadow lg, w 180, name FileMenu
  Button "Neu", w full, pad 10 16, bg transparent
    hover:
      bg #333
  Button "Öffnen", w full, pad 10 16, bg transparent
    hover:
      bg #333
  Button "Speichern", w full, pad 10 16, bg transparent
    hover:
      bg #333
```

### showModal(element) – Zentrierter Dialog

```mirror
Button "Löschen", bg #ef4444, col white, pad 10 20, rad 6, showModal(ConfirmDialog)

ConfirmDialog: Frame hidden, w 320, bg #1a1a1a, rad 12, pad 24, gap 16, name ConfirmDialog
  Text "Wirklich löschen?", fs 18, weight bold
  Text "Diese Aktion kann nicht rückgängig gemacht werden.", col #888, fs 14
  Frame hor, gap 8
    Button "Abbrechen", pad 10 16, bg #333, col white, rad 6, dismiss(ConfirmDialog)
    Button "Löschen", pad 10 16, bg #ef4444, col white, rad 6, dismiss(ConfirmDialog)
```

## Scroll-Funktionen

### scrollTo(element)

```mirror
Frame h 200, gap 16
  Frame hor, gap 8
    Button "Zu Rot", pad 8 12, bg #333, col white, rad 4, scrollTo(RedSection)
    Button "Zu Grün", pad 8 12, bg #333, col white, rad 4, scrollTo(GreenSection)
    Button "Zu Blau", pad 8 12, bg #333, col white, rad 4, scrollTo(BlueSection)

  Frame scroll, h 120, gap 8, bg #111, pad 8, rad 8
    Frame h 80, bg #ef4444, rad 4, center, name RedSection
      Text "Rot", col white
    Frame h 80, bg #22c55e, rad 4, center, name GreenSection
      Text "Grün", col white
    Frame h 80, bg #3b82f6, rad 4, center, name BlueSection
      Text "Blau", col white
```

### scrollBy(container, x, y) – Karussell-Navigation

```mirror
Frame gap 8
  Frame hor, gap 8
    Button "← Links", pad 8 12, bg #333, col white, rad 4, scrollBy(Gallery, -100, 0)
    Button "Rechts →", pad 8 12, bg #333, col white, rad 4, scrollBy(Gallery, 100, 0)

  Frame hor, scroll-hor, gap 8, w 280, name Gallery
    Frame w 100, h 80, bg #6366f1, rad 4, shrink, center
      Text "1", col white
    Frame w 100, h 80, bg #8b5cf6, rad 4, shrink, center
      Text "2", col white
    Frame w 100, h 80, bg #a855f7, rad 4, shrink, center
      Text "3", col white
    Frame w 100, h 80, bg #d946ef, rad 4, shrink, center
      Text "4", col white
```

## Eigene JavaScript-Funktionen

Die eingebauten Funktionen decken Standard-Patterns ab. Für API-Calls, Validierung oder komplexe Logik schreibst du eigene Funktionen:

```mirror
// Mirror-Code
Btn: pad 12 24, bg #333, col white, save()
  loading:
    bg #666
    "Wird gespeichert..."
  success:
    bg #10b981
    "Gespeichert!"
```

```mirror
// JavaScript
async function save(element) {
  element.state = 'loading'
  const response = await fetch('/api/save')
  element.state = response.ok ? 'success' : 'error'
}
```

**Faustregel:** Wenn eine einzige Funktion reicht → eingebaut. Wenn mehrere Schritte, Bedingungen oder externe Calls → eigene Funktion.


## Zusammenfassung

| Funktion | Beschreibung |
|----------|--------------|
| `toggle()` | State wechseln (binär oder cycle) |
| `exclusive()` | Nur einer aktiv |
| `show(el)` / `hide(el)` | Sichtbarkeit |
| `navigate(view)` | Ansicht wechseln |
| `select()` | Element auswählen |
| `showBelow(el)` / `showModal(el)` | Overlays |
| `scrollTo(el)` / `scrollBy(el, x, y)` | Scrollen |
| `increment($t)` / `decrement($t)` | Zähler |
| `copy(text)` | Zwischenablage |

### 08-navigation: Navigation


Drei Komponenten für unterschiedliche Szenarien: **Tabs** wechseln zwischen Ansichten – nur eine ist sichtbar. **Accordion** hat mehrere aufklappbare Bereiche. **Collapsible** ist ein einzelner Toggle.

Tabs und Accordion folgen dem gleichen Muster: Du definierst Items mit einem Label, die Kinder werden automatisch zum Content. Collapsible funktioniert anders – hier legst du Trigger und Content explizit fest.

## Tabs

Ein `Tab` braucht zwei Dinge: ein Label (der Text im Tab-Header) und einen `value` (die ID). Mit `defaultValue` auf dem `Tabs`-Container bestimmst du, welcher Tab beim Start aktiv ist:

```mirror
Tabs defaultValue "home"
  Tab "Home", value "home"
    Text "Welcome to the home page"
  Tab "Profile", value "profile"
    Text "Your profile settings"
  Tab "Settings", value "settings"
    Text "Application settings"
```

Die Kinder jedes Tabs werden zum Panel-Content. Das erste Tab muss nicht "home" heißen – der `value` ist nur eine ID, die mit `defaultValue` übereinstimmen muss.

### Tab-Elemente stylen

Tabs bestehen aus mehreren Elementen, die du individuell stylen kannst:

| Element | Beschreibung |
|---------|--------------|
| `List:` | Container um alle Tab-Header (die Leiste) |
| `Trigger:` | Der klickbare Bereich jedes Tabs |
| `Indicator:` | Der Strich unter dem aktiven Tab |
| `Content:` | Container für den Panel-Inhalt |

Im folgenden Beispiel werden alle Elemente gestylt:

```mirror
Tabs defaultValue "a"
  List: bor 0 0 1 0, boc #333
  Trigger: pad 12 20, col #888
  Indicator: h 2, bg #2563eb
  Content: pad 16
  Tab "Dashboard", value "a"
    Text "Dashboard content"
  Tab "Analytics", value "b"
    Text "Analytics content"
  Tab "Settings", value "c"
    Text "Settings content"
```

Der `Indicator:` bewegt sich automatisch zum aktiven Tab. Du steuerst nur Höhe und Farbe:

```mirror
Tabs defaultValue "home"
  List: bor 0 0 1 0, boc #333
  Trigger: pad 12 20, col #666
  Indicator: h 3, bg #10b981
  Tab "Home", value "home"
    Text "Home content"
  Tab "Profile", value "profile"
    Text "Profile content"
```

## Accordion

Accordion funktioniert ähnlich wie Tabs: `AccordionItem` bekommt ein Label, die Kinder werden zum aufklappbaren Content. Der Unterschied: Mehrere Sections können existieren, und das Auf/Zuklappen passiert durch Klick auf den Header:

```mirror
Accordion
  AccordionItem "Section 1"
    Text "Content for section 1"
  AccordionItem "Section 2"
    Text "Content for section 2"
  AccordionItem "Section 3"
    Text "Content for section 3"
```

Standardmäßig kann nur ein Item offen sein – klickst du ein anderes, schließt sich das vorherige. Mit `multiple` können mehrere gleichzeitig offen bleiben. Das `icon`-Property ändert das Chevron zu einem anderen Icon:

```mirror
Accordion multiple, icon "plus"
  AccordionItem "Was ist Mirror?"
    Text "Eine DSL für rapid UI prototyping."
  AccordionItem "Wie installiere ich es?"
    Text "npm install mirror-lang"
  AccordionItem "Open Source?"
    Text "Ja, MIT Lizenz."
```

Zum Stylen gibt es `Item:` (der ganze Bereich), `ItemTrigger:` (der klickbare Header) und `ItemContent:` (der aufklappbare Inhalt). Diese Styles gelten für alle Items:

```mirror
Accordion
  Item: bg #1a1a1a, rad 8, margin 0 0 4 0
  ItemTrigger: pad 16
  ItemContent: pad 0 16 16 16, col #888
  AccordionItem "Styled Section"
    Text "Content with custom padding"
  AccordionItem "Another Section"
    Text "Same styling applied"
```

## Collapsible

Collapsible ist für einen einzelnen auf/zuklappbaren Bereich. Anders als bei Tabs und Accordion definierst du hier `Trigger:` und `Content:` explizit fest – das gibt dir volle Kontrolle über beide Teile:

```mirror
Collapsible
  Trigger:
    Button "Toggle content"
  Content:
    Text "Hidden content revealed."
```

Der Trigger muss kein Button sein – du kannst beliebige Elemente verwenden. Mit `defaultOpen` startet der Bereich ausgeklappt:

```mirror
Collapsible defaultOpen
  Trigger:
    Frame hor, spread, pad 12, bg #1a1a1a, rad 8, cursor pointer
      Text "Filter", weight 500
      Icon "chevron-down"
  Content:
    Frame ver, gap 8, pad 12, bg #1a1a1a, rad 0 0 8 8
      Text "Status: Aktiv", col #888
      Text "Kategorie: Alle", col #888
```

## Praktische Beispiele

Ein typisches FAQ mit gestyltem Accordion – die Border trennt die Items visuell:

```mirror
Accordion
  Item: bor 0 0 1 0, boc #222
  ItemTrigger: pad 16
  ItemContent: pad 0 16 16 16, col #888
  AccordionItem "What is Mirror?"
    Text "A DSL for rapid UI prototyping that compiles to DOM or React."
  AccordionItem "How do I get started?"
    Text "Install via npm and start writing components."
  AccordionItem "Is it production ready?"
    Text "Designed for prototyping, usable in production with care."
```

Ein Settings-Panel mit mehreren Collapsible-Sections. Jede Section hat ihren eigenen Trigger und Content:

```mirror
Frame ver, w 350, pad 16, bg #111, rad 8, gap 12
  Text "Settings", weight bold, fs 18
  Collapsible defaultOpen
    Trigger:
      Frame hor, spread, cursor pointer
        Text "General", weight 500
        Icon "chevron-down"
    Content:
      Frame ver, gap 8, pad 8 0
        Frame hor, spread
          Text "Dark mode", fs 14
          Switch
        Frame hor, spread
          Text "Notifications", fs 14
          Switch
  Divider
  Collapsible
    Trigger:
      Frame hor, spread, cursor pointer
        Text "Advanced", weight 500
        Icon "chevron-down"
    Content:
      Frame pad 8 0
        Text "Advanced settings here", col #666
```


## Zusammenfassung

| Komponente | Pattern | Anwendung |
|------------|---------|-----------|
| `Tabs` + `Tab` | Label + Kinder → Content | Zwischen Ansichten wechseln |
| `Accordion` + `AccordionItem` | Label + Kinder → Content | Mehrere aufklappbare Bereiche |
| `Collapsible` | `Trigger:` + `Content:` | Ein einzelner Toggle |

**Tabs:** `defaultValue` · Elemente: `List:`, `Trigger:`, `Indicator:`, `Content:`

**Accordion:** `multiple`, `icon` · Elemente: `Item:`, `ItemTrigger:`, `ItemContent:`

**Collapsible:** `defaultOpen`

### 09-overlays: Overlays


Overlays sind Elemente, die über dem normalen Content erscheinen. Alle folgen dem gleichen Muster: `Trigger:` definiert das auslösende Element, `Content:` den Overlay-Inhalt.

**Tooltip** zeigt kurze Hinweise bei Hover. **Popover** öffnet bei Klick und zeigt reicheren Inhalt. **HoverCard** ist wie Popover, aber öffnet bei Hover. **Dialog** ist ein modales Fenster, das den Rest der Seite blockiert.

## Tooltip

Tooltips zeigen kurze Hilfetexte bei Hover. Der `Trigger:` ist das Element, über das man hovert – der `Content:` erscheint dann daneben:

```mirror
Tooltip
  Trigger: Button "Hover me"
  Content: Text "This is a tooltip"
```

Mit `positioning` bestimmst du, wo der Tooltip erscheint. Mit `openDelay` und `closeDelay` steuerst du die Verzögerung in Millisekunden:

```mirror
Frame hor, gap 16
  Tooltip positioning "top"
    Trigger: Button "Top"
    Content: Text "Tooltip on top"
  Tooltip positioning "bottom", openDelay 500
    Trigger: Button "Delayed"
    Content: Text "Shows after 500ms"
```

Der Content kann auch gestylt werden – du kannst beliebige Elemente verwenden:

```mirror
Tooltip
  Trigger: Button "Multi-line"
  Content: Frame ver, gap 4, pad 8
    Text "Title", weight bold
    Text "Description here", col #888, fs 12
```

## Popover

Popovers öffnen bei Klick und bleiben offen, bis man außerhalb klickt oder Escape drückt. Sie eignen sich für reicheren Inhalt wie Formulare oder Listen:

```mirror
Popover
  Trigger: Button "Open Popover"
  Content: Frame ver, gap 8
    Text "Title", weight bold
    Text "Some description text"
```

Mit `CloseTrigger:` kannst du einen expliziten Schließen-Button einbauen:

```mirror
Popover
  Trigger: Button "Open"
  Content: Frame ver, gap 12, pad 16, bg #1a1a1a, rad 8, w 200
    Frame hor, spread
      Text "Popover Title", weight bold
      CloseTrigger: Button "X", bg transparent, col #666
    Text "Content goes here"
```

`positioning` funktioniert wie bei Tooltip. Mit `closeOnEscape` und `closeOnInteractOutside` steuerst du das Schließ-Verhalten:

```mirror
Popover positioning "bottom", closeOnEscape
  Trigger: Button "Settings"
  Content: Frame ver, gap 8, pad 12, bg #1a1a1a, rad 8, w 180
    Frame hor, spread
      Text "Notifications"
      Switch
    Frame hor, spread
      Text "Dark mode"
      Switch
```

## HoverCard

HoverCard ist wie Popover, aber öffnet bei Hover statt Klick. Das ist nützlich für Vorschauen von Links oder User-Profilen:

```mirror
HoverCard
  Trigger: Text "Hover over me", underline, cursor pointer
  Content: Text "HoverCard content"
```

Ein typisches Beispiel ist eine User-Vorschau bei Hover über einen @-Mention:

```mirror
HoverCard positioning "bottom"
  Trigger: Text "@johndoe", col #3b82f6, underline, cursor pointer
  Content: Frame ver, gap 12, pad 16, bg #1a1a1a, rad 12, w 250
    Frame hor, gap 12
      Frame w 48, h 48, bg #3b82f6, rad 99, center
        Text "JD", col white, weight 500
      Frame ver
        Text "John Doe", weight 600
        Text "@johndoe", col #666, fs 14
    Text "Software engineer building great tools.", col #888, fs 13
```

## Dialog

Dialoge sind modale Fenster – sie blockieren die Interaktion mit dem Rest der Seite. Neben `Trigger:` und `Content:` gibt es `Backdrop:` für den Hintergrund:

```mirror
Dialog
  Trigger: Button "Open Dialog"
  Content: Frame ver, gap 8, pad 16, bg #1a1a1a, rad 12
    Text "Dialog Title", weight bold, fs 18
    Text "This is the dialog content."
```

Mit `CloseTrigger:` baust du Schließen-Buttons ein. Diese können überall im Content platziert werden:

```mirror
Dialog
  Trigger: Button "Open"
  Content: Frame ver, gap 12, pad 24, bg #1a1a1a, rad 12, w 320
    Frame hor, spread
      Text "Settings", weight bold, fs 18
      CloseTrigger: Button "X", bg transparent
    Text "Dialog content here"
```

Mit `Backdrop:` kannst du den Overlay-Hintergrund stylen:

```mirror
Dialog
  Trigger: Button "Custom backdrop"
  Backdrop: bg rgba(0,0,100,0.5)
  Content: Frame pad 24, bg #1a1a1a, rad 12
    Text "Dialog with blue backdrop"
```

## Praktisch: Confirm Dialog

Ein typischer Bestätigungs-Dialog mit zwei Buttons:

```mirror
Dialog
  Trigger: Button "Delete item", bg #ef4444
  Content: Frame ver, gap 16, pad 24, bg #1a1a1a, rad 12, w 380
    Frame hor, gap 12
      Frame w 40, h 40, rad 99, bg rgba(239,68,68,0.2), center
        Icon "trash", col #ef4444
      Frame ver
        Text "Delete Item", weight bold, fs 16
        Text "This action cannot be undone.", col #888, fs 14
    Frame hor, gap 8
      CloseTrigger: Button "Cancel" grow
      Button "Delete", bg #ef4444, grow
```

## Praktisch: Form Dialog

Ein Dialog mit Eingabefeldern:

```mirror
Dialog
  Trigger: Button "Create new"
  Content: Frame ver, gap 16, pad 24, bg #1a1a1a, rad 12, w 400
    Frame hor, spread
      Text "Create Project", weight bold, fs 18
      CloseTrigger: Button "X", bg transparent, col #666
    Frame ver, gap 12
      Frame ver, gap 4
        Label "Project Name"
        Input placeholder "Enter project name"
      Frame ver, gap 4
        Label "Description"
        Textarea placeholder "Enter description", h 80
    Frame hor, gap 8
      CloseTrigger: Button "Cancel" grow
      Button "Create", bg #3b82f6, grow
```

## Praktisch: Icon Toolbar

Tooltips für eine Icon-Leiste:

```mirror
Frame hor, gap 8
  Tooltip positioning "bottom"
    Trigger: Frame pad 8, rad 4, bg #222, cursor pointer
      Icon "home"
    Content: Text "Home", fs 12
  Tooltip positioning "bottom"
    Trigger: Frame pad 8, rad 4, bg #222, cursor pointer
      Icon "settings"
    Content: Text "Settings", fs 12
  Tooltip positioning "bottom"
    Trigger: Frame pad 8, rad 4, bg #222, cursor pointer
      Icon "user"
    Content: Text "Profile", fs 12
```


## Zusammenfassung

| Komponente | Auslöser | Anwendung |
|------------|----------|-----------|
| `Tooltip` | Hover | Kurze Hilfetexte |
| `Popover` | Klick | Reicherer Inhalt, Menüs |
| `HoverCard` | Hover | Vorschauen, User-Profile |
| `Dialog` | Klick | Modale Fenster, Formulare |

**Slots:** `Trigger:`, `Content:`, `Backdrop:` (Dialog), `CloseTrigger:`

**Optionen:** `positioning`, `openDelay`, `closeDelay`, `closeOnEscape`

### 10-data: Daten


Mirror trennt UI von Daten. Mit `$` greifst du auf Variablen zu – egal ob Token, YAML-Datei oder JavaScript. Eine Syntax für alle Datenquellen.

## $-Variablen

Das `$`-Zeichen bedeutet: "Hole den Wert dieser Variable". Die Variable kann aus drei Quellen stammen:

### Tokens (in Mirror)

Für schnelle Prototypen definierst du Werte direkt in Mirror:

```mirror
$userName: "Max Mustermann"
$userPlan: "Pro"

Frame bg #1a1a1a, pad 16, rad 8, gap 8
  Text $userName, col white, fs 14
  Text $userPlan, col #10b981, fs 12
```

### YAML-Dateien

Für strukturierte Daten nutzt du YAML. Dateien im `data/`-Ordner sind automatisch verfügbar:

```yaml
# data/users.yaml
- name: Anna
  role: Admin
- name: Ben
  role: User
```

```mirror
// $users enthält das Array aus der YAML-Datei
each user in $users
  Text user.name, col white
```

### JavaScript

Jede JS-Variable ist mit `$` erreichbar:

```javascript
const currentUser = { name: "Max", plan: "Pro" }
const products = await fetch('/api/products').json()
```

```mirror
Text $currentUser.name
each item in $products
  Text item.title
```

**Pragmatisch:** Wer will, kann alles in JS definieren. Funktioniert genauso.

## Each-Loops

Mit `each` iterierst du über Arrays:

```mirror
Frame gap 8
  each item in ["Apple", "Banana", "Cherry"]
    Frame hor, gap 8, bg #1a1a1a, pad 12, rad 6
      Icon "circle", ic #10b981, is 8
      Text item, col white, fs 13
```

### Objekte

Bei Objekten greifst du mit Punkt-Notation auf Properties zu:

```mirror
Frame gap 8
  each user in [{ name: "Anna", role: "Admin" }, { name: "Ben", role: "User" }]
    Frame hor, spread, bg #1a1a1a, pad 12, rad 6
      Text user.name, col white, fs 13
      Text user.role, col #888, fs 11
```

### Index

Mit `with index` hast du zusätzlich die Position (ab 0):

```mirror
Frame gap 4
  each item in ["Erster", "Zweiter", "Dritter"] with index
    Frame hor, gap 12, bg #1a1a1a, pad 12, rad 6
      Frame w 24, h 24, bg #2563eb, rad 4, center
        Text index + 1, col white, fs 11
      Text item, col white, fs 13
```

### Verschachtelt

Der innere Loop hat Zugriff auf Variablen des äußeren:

```mirror
Frame gap 12
  each category in [{ name: "Früchte", items: ["Apfel", "Birne"] }, { name: "Gemüse", items: ["Karotte", "Brokkoli"] }]
    Frame bg #1a1a1a, pad 12, rad 8, gap 8
      Text category.name, col white, fs 14, weight 500
      each item in category.items
        Text item, col #888, fs 12
```

## Berechnungen

Variablen lassen sich verrechnen:

```mirror
$count: 3
$price: 29

Frame bg #1a1a1a, pad 16, rad 8, gap 8
  Text $count + " Artikel", col white
  Text "Summe: €" + ($count * $price), col #10b981
```

- **String:** `$name + " ist da"`
- **Mathematik:** `$a + $b`, `$a * $b`, `$a - $b`, `$a / $b`
- **Klammern:** `($a + $b) * $c`

## Praktisch: Produkt-Grid

```mirror
Frame grid 2, gap 12
  each product in [{ name: "Kopfhörer", price: 199 }, { name: "Keyboard", price: 149 }, { name: "Maus", price: 79 }, { name: "Monitor", price: 399 }]
    Frame bg #1a1a1a, rad 12, clip, cursor pointer
      Frame w full, h 80, bg #2563eb, center
        Icon "package", ic white, is 32
      Frame pad 12, gap 4
        Text product.name, col white, fs 14, weight 500
        Text "€" + product.price, col #888, fs 13
      hover:
        scale 1.02
```


## Zusammenfassung

| Konzept | Syntax |
|---------|--------|
| Token definieren | `$name: value` |
| Variable nutzen | `$name` |
| YAML-Daten | `data/file.yaml` → `$file` |
| JS-Variable | `const x = ...` → `$x` |
| Liste iterieren | `each item in [...]` |
| Mit Index | `each item in [...] with index` |
| Property | `item.name` |
| Berechnung | `$a + $b`, `$a * $b` |

### 11-forms: Formulare


## Text Input

Einfache Texteingabe mit Styling:

```mirror
Frame gap 12, w 280
  Frame gap 4
    Text "Name", col #888, fs 12
    Input placeholder "Dein Name"
      bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full
      focus:
        boc #2563eb

  Frame gap 4
    Text "E-Mail", col #888, fs 12
    Input placeholder "email@example.com", type email
      bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full
      focus:
        boc #2563eb
```

## Textarea

Mehrzeiliges Textfeld:

```mirror
Frame gap 4, w 280
  Text "Nachricht", col #888, fs 12
  Textarea placeholder "Schreibe eine Nachricht..."
    bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full, h 100
    focus:
      boc #2563eb
```

## Checkbox

Checkbox mit Zag-Integration:

```mirror
Frame gap 12
  Checkbox
    Root hor, gap 10, cursor pointer
      Control w 20, h 20, bor 2, boc #444, rad 4
      Label "Newsletter abonnieren", col white, fs 13

  Checkbox checked
    Root hor, gap 10, cursor pointer
      Control w 20, h 20, bor 2, boc #444, rad 4
      Label "AGB akzeptieren", col white, fs 13

  Checkbox disabled
    Root hor, gap 10, cursor not-allowed, opacity 0.5
      Control w 20, h 20, bor 2, boc #444, rad 4
      Label "Deaktiviert", col #888, fs 13
```

## Switch

Toggle-Switch für Ein/Aus-Zustände:

```mirror
Frame gap 12
  Switch
    Root hor, gap 12
      Track w 44, h 24, bg #333, rad 99, pad 2
        Thumb w 20, h 20, bg white, rad 99
      Label "Dark Mode", col white, fs 13

  Switch checked
    Root hor, gap 12
      Track w 44, h 24, bg #2563eb, rad 99, pad 2
        Thumb w 20, h 20, bg white, rad 99
      Label "Notifications", col white, fs 13
```

## Radio Group

Gruppe von Radio-Buttons:

```mirror
RadioGroup value "monthly"
  Root gap 10
    Label "Abrechnungszeitraum", col white, fs 14, weight 500, margin 0 0 4 0

    Item value "monthly"
      ItemControl w 20, h 20, bor 2, boc #444, rad 99
      ItemText "Monatlich - €9/Monat", col white, fs 13, margin 0 0 0 10

    Item value "yearly"
      ItemControl w 20, h 20, bor 2, boc #444, rad 99
      ItemText "Jährlich - €99/Jahr", col white, fs 13, margin 0 0 0 10
```

## Select Dropdown

Dropdown-Auswahl mit Zag:

```mirror
Frame gap 4, w 240
  Text "Land", col #888, fs 12
  Select
    Trigger bg #1a1a1a, bor 1, boc #333, pad 12, rad 6, hor, spread
      ValueText "Land auswählen", col #888, fs 13
      Icon "chevron-down", ic #666, is 16
    Content bg #1a1a1a, bor 1, boc #333, rad 8, pad 4, shadow lg
      Item "Deutschland", pad 10, rad 4, col white, fs 13, cursor pointer
        hover:
          bg #2a2a2a
      Item "Österreich", pad 10, rad 4, col white, fs 13, cursor pointer
        hover:
          bg #2a2a2a
      Item "Schweiz", pad 10, rad 4, col white, fs 13, cursor pointer
        hover:
          bg #2a2a2a
```

## Slider

Wertauswahl mit Slider:

```mirror
Frame gap 16, w 280
  Slider value 50, min 0, max 100
    Root gap 8
      Label hor, spread
        Text "Lautstärke", col white, fs 13
        ValueText col #888, fs 12
      Track h 6, bg #333, rad 99
        Range bg #2563eb, rad 99
        Thumb w 18, h 18, bg white, rad 99, shadow md
```

## Praktisch: Login Form

```mirror
Frame w 320, bg #1a1a1a, pad 24, rad 16, gap 20
  Frame gap 4, center
    Text "Willkommen zurück", col white, fs 20, weight 600
    Text "Melde dich mit deinem Konto an", col #888, fs 13

  Frame gap 16
    Frame gap 4
      Text "E-Mail", col #888, fs 12
      Input placeholder "email@example.com", type email
        bg #111, bor 1, boc #333, col white, pad 12, rad 8, w full
        focus:
          boc #2563eb

    Frame gap 4
      Frame hor, spread
        Text "Passwort", col #888, fs 12
        Text "Vergessen?", col #2563eb, fs 12, cursor pointer
      Input placeholder "••••••••", type password
        bg #111, bor 1, boc #333, col white, pad 12, rad 8, w full
        focus:
          boc #2563eb

    Checkbox
      Root hor, gap 8
        Control w 18, h 18, bor 2, boc #444, rad 4
        Label "Angemeldet bleiben", col #888, fs 12

  Button "Anmelden", bg #2563eb, col white, pad 14, rad 8, w full, weight 500
    hover:
      bg #3b82f6

  Frame hor, center, gap 4
    Text "Noch kein Konto?", col #888, fs 13
    Text "Registrieren", col #2563eb, fs 13, cursor pointer
```


## Zusammenfassung

- `Input` – Texteingabe (type: text, email, password)
- `Textarea` – Mehrzeiliger Text
- `Checkbox` – Ankreuzfeld (Root, Control, Label)
- `Switch` – Toggle (Track, Thumb, Label)
- `RadioGroup` – Radio-Buttons (Item, ItemControl, ItemText)
- `Select` – Dropdown (Trigger, Content, Item)
- `Slider` – Wertebereich (Track, Range, Thumb)

### 12-theming: Theming


## Design Tokens

Definiere Werte einmal, nutze sie überall:

```mirror
// Token-Definitionen
$primary.bg: #2563eb
$secondary.bg: #10b981
$surface.bg: #1a1a1a
$text.col: #ffffff
$muted.col: #888888

Frame gap 12
  Button "Primary", bg $primary, col $text, pad 12 24, rad 6
  Button "Secondary", bg $secondary, col $text, pad 12 24, rad 6
  Frame bg $surface, pad 16, rad 8
    Text "Surface mit Text", col $text, fs 14
    Text "Und Muted Text", col $muted, fs 12
```

## Nested Tokens

Tokens können verschachtelt werden mit Punkt-Notation:

```mirror
// Verschachtelte Tokens
$color.primary.bg: #2563eb
$color.success.bg: #10b981
$color.warning.bg: #f59e0b
$color.danger.bg: #ef4444

$spacing.sm.pad: 8
$spacing.md.pad: 16
$spacing.lg.pad: 24

Frame gap $spacing.md
  Frame hor, gap $spacing.sm
    Frame w 40, h 40, bg $color.primary, rad 6
    Frame w 40, h 40, bg $color.success, rad 6
    Frame w 40, h 40, bg $color.warning, rad 6
    Frame w 40, h 40, bg $color.danger, rad 6

  Frame bg #1a1a1a, pad $spacing.lg, rad 8
    Text "Large Padding mit Token", col white, fs 13
```

## Komponenten-Definition

Wiederverwendbare Komponenten mit `:`:

```mirror
// Komponenten-Definitionen
PrimaryBtn: = Button bg #2563eb, col white, pad 12 24, rad 6
  hover:
    bg #3b82f6

SecondaryBtn: = Button bg #333, col white, pad 12 24, rad 6
  hover:
    bg #444

Card: = Frame bg #1a1a1a, pad 20, rad 12

// Verwendung
Frame gap 12
  Frame hor, gap 8
    PrimaryBtn "Speichern"
    SecondaryBtn "Abbrechen"

  Card
    Text "Wiederverwendbare Card", col white, fs 14
```

## Komponenten mit Slots

Definiere Layout-Strukturen mit benannten Slots:

```mirror
// Card mit Slots definieren
InfoCard: bg #1a1a1a, pad 16, rad 12, gap 12
  CardIcon: w 40, h 40, rad 8, center
  CardContent: gap 4
    CardTitle: col white, fs 14, weight 500
    CardDescription: col #888, fs 12

// Verwendung
Frame gap 12
  InfoCard
    CardIcon bg #2563eb22
      Icon "code", ic #2563eb, is 20
    CardContent
      CardTitle "Development"
      CardDescription "Build amazing applications"

  InfoCard
    CardIcon bg #10b98122
      Icon "palette", ic #10b981, is 20
    CardContent
      CardTitle "Design"
      CardDescription "Create beautiful interfaces"
```

## Vererbung mit as

Komponenten können von anderen erben:

```mirror
// Basis-Komponente
BaseBtn: = Button pad 12 24, rad 6, weight 500

// Erweiterte Versionen
PrimaryBtn as BaseBtn: = bg #2563eb, col white
  hover:
    bg #3b82f6

DangerBtn as BaseBtn: = bg #ef4444, col white
  hover:
    bg #f87171

GhostBtn as BaseBtn: = bg transparent, col #888, bor 1, boc #333
  hover:
    bg #1a1a1a
    col white

Frame hor, gap 8
  PrimaryBtn "Primary"
  DangerBtn "Danger"
  GhostBtn "Ghost"
```

## Praktisch: Complete Theme

Ein vollständiges Theme-System:

```mirror
// Theme Tokens
$theme.bg: #0a0a0a
$theme.surface.bg: #1a1a1a
$theme.border.boc: #333
$theme.text.col: #ffffff
$theme.muted.col: #888888
$theme.primary.bg: #2563eb

// Komponenten
Card: = Frame bg $theme.surface, rad 12, bor 1, boc $theme.border
CardHeader: = Frame pad 16 16 12 16
CardBody: = Frame pad 0 16 16 16
CardTitle: = Text col $theme.text, fs 16, weight 600
CardDesc: = Text col $theme.muted, fs 13

PrimaryBtn: = Button bg $theme.primary, col $theme.text, pad 10 20, rad 6
  hover:
    opacity 0.9

// Verwendung
Frame bg $theme, pad 20, rad 16, gap 16
  Card w 280
    CardHeader
      CardTitle "Projekt erstellen"
      CardDesc "Neues Projekt anlegen"
    CardBody gap 12
      Input placeholder "Projektname"
        bg $theme, bor 1, boc $theme.border, col $theme.text, pad 10, rad 6, w full
      PrimaryBtn "Erstellen", w full
```


## Zusammenfassung

- `$name.suffix: value` – Token definieren (z.B. `$primary.bg: #2563eb`)
- `$name` – Token verwenden (z.B. `bg $primary`)
- `$group.name.suffix: value` – Verschachtelte Tokens
- `Name: = ...` – Komponente definieren
- `Name` – Komponente verwenden
- `Child as Parent:` – Vererbung
- Slots mit `SlotName:` definieren

### 13-fehler: Häufige Fehler


Dieses Kapitel zeigt typische Fehler und ihre Korrektur. Jeder Fehler hat ein "Falsch"-Beispiel, ein "Richtig"-Beispiel und eine kurze Erklärung.

## Syntax

### Komma nach String vergessen

```mirror
// FALSCH
Text "Hello" col white
Button "Click" bg #2563eb
```

```mirror
// RICHTIG
Text "Hello", col white
Button "Click", bg #2563eb
```

**Warum:** Properties werden durch Kommas getrennt. Nach einem String-Inhalt muss ein Komma stehen, bevor weitere Properties folgen.

### Einheiten angeben

```mirror
// FALSCH
Frame w 100px, h 50px, pad 10px
```

```mirror
// RICHTIG
Frame w 100, h 50, pad 10
```

**Warum:** Mirror verwendet keine Einheiten. Zahlen sind implizit Pixel. `100` statt `100px`.

### Anführungszeichen bei Zahlen

```mirror
// FALSCH
Frame w "200", h "100"
```

```mirror
// RICHTIG
Frame w 200, h 100
```

**Warum:** Zahlen brauchen keine Anführungszeichen. Nur Text-Inhalte werden in `"..."` geschrieben.

## Elemente

### Box statt Frame

```mirror
// FALSCH
Box pad 16, gap 8
  Text "Content"
```

```mirror
// RICHTIG
Frame pad 16, gap 8
  Text "Content"
```

**Warum:** Das Container-Element heißt `Frame`, nicht `Box`. Es gibt kein `Box` in Mirror.

### Div statt Frame

```mirror
// FALSCH
Div pad 16
  Span "Text"
```

```mirror
// RICHTIG
Frame pad 16
  Text "Text"
```

**Warum:** Mirror verwendet eigene Primitive, keine HTML-Elemente. `Frame` statt `Div`, `Text` statt `Span`.

## Tokens

### Token ohne $ definieren

```mirror
// FALSCH
primary: #2563eb
card.bg: #1a1a1a
```

```mirror
// RICHTIG
$primary.bg: #2563eb
$card.bg: #1a1a1a
```

**Warum:** Tokens beginnen immer mit `$`. Ohne `$` wäre es keine Token-Definition.

### Token ohne Suffix definieren

```mirror
// FALSCH
$primary: #2563eb
$spacing: 16
```

```mirror
// RICHTIG
$primary.bg: #2563eb
$spacing.pad: 16
```

**Warum:** Der Suffix (`.bg`, `.col`, `.pad`, `.rad`, etc.) gibt den Typ an. Das ermöglicht intelligentes Autocomplete – bei `bg $` werden nur `.bg`-Tokens vorgeschlagen.

### Token mit Suffix verwenden

```mirror
// FALSCH
Frame bg $primary.bg, pad $spacing.pad
```

```mirror
// RICHTIG
Frame bg $primary, pad $spacing
```

**Warum:** Bei der Verwendung wird der Suffix weggelassen. Das Property (`bg`, `pad`) zeigt bereits den Typ.

## Komponenten

### Doppelpunkt bei Verwendung

```mirror
// FALSCH – Doppelpunkt bei Instanz
Btn: "Speichern"
Card:
  Title: "Überschrift"
```

```mirror
// RICHTIG – Ohne Doppelpunkt
Btn "Speichern"
Card
  Title "Überschrift"
```

**Warum:** Der Doppelpunkt definiert eine Komponente. Ohne Doppelpunkt wird sie verwendet. `Btn:` = Definition, `Btn` = Instanz.

### Doppelpunkt bei Definition vergessen

```mirror
// FALSCH – Definition ohne Doppelpunkt
PrimaryBtn pad 12, bg #2563eb
```

```mirror
// RICHTIG – Mit Doppelpunkt
PrimaryBtn: pad 12, bg #2563eb
```

**Warum:** Ohne Doppelpunkt wäre es eine Verwendung, keine Definition. Die Komponente würde nicht erstellt.

### = bei Primitive-Erweiterung vergessen

```mirror
// FALSCH
PrimaryBtn: Button pad 12, bg #2563eb
```

```mirror
// RICHTIG
PrimaryBtn: = Button pad 12, bg #2563eb
```

**Warum:** Wenn eine Komponente ein Primitive erweitert (Button, Frame, Text, etc.), braucht es das `=` Zeichen. Bei Slot-Komponenten ohne Primitive-Basis ist kein `=` nötig.

## States

### State ohne Doppelpunkt

```mirror
// FALSCH
Btn pad 12, bg #333
  hover
    bg #444
```

```mirror
// RICHTIG
Btn: pad 12, bg #333
  hover:
    bg #444
```

**Warum:** State-Namen brauchen einen Doppelpunkt: `hover:`, `on:`, `active:`. Ohne Doppelpunkt wird es als Kind-Element interpretiert.

### Funktion ohne Klammern

```mirror
// FALSCH
Btn: pad 12, bg #333, toggle
  on:
    bg #2563eb
```

```mirror
// RICHTIG
Btn: pad 12, bg #333, toggle()
  on:
    bg #2563eb
```

**Warum:** Funktionen werden mit Klammern aufgerufen: `toggle()`, `exclusive()`, `show(Element)`. Die Klammern zeigen: Das ist ein Funktionsaufruf, nicht eine Property.

### State in Instanz mit Doppelpunkt

```mirror
// FALSCH – Doppelpunkt beim State-Setzen
Btn "Aktiv", on:
```

```mirror
// RICHTIG – Ohne Doppelpunkt
Btn "Aktiv", on
```

**Warum:** Bei der Instanz sagst du nur "starte in diesem State". Der State wurde bereits in der Definition mit `:` definiert.

## Layout

### Pixel in Grid-Kontext

```mirror
// FALSCH – w 200 bedeutet hier 200 Spalten
Frame grid 12
  Frame w 200, h 100
```

```mirror
// RICHTIG – w 6 bedeutet 6 von 12 Spalten
Frame grid 12
  Frame w 6, h 2
```

**Warum:** Im Grid-Kontext bedeutet `w` Spalten-Span, nicht Pixel. `w 6` bei `grid 12` = halbe Breite.

### center und spread verwechseln

```mirror
// FALSCH – spread zentriert nicht
Frame hor, spread
  Button "OK"
```

```mirror
// RICHTIG – center zentriert
Frame hor, center
  Button "OK"
```

**Warum:** `spread` verteilt Kinder an die Ränder (links/rechts). `center` zentriert sie. Bei einem Kind ist `center` meist gewünscht.

### stacked ohne Positionierung

```mirror
// FALSCH – Kinder stapeln sich ohne Position
Frame stacked
  Frame bg red
  Frame bg blue
```

```mirror
// RICHTIG – Mit Positionierung
Frame stacked
  Frame bg red, w full, h full
  Frame bg blue, w 50, h 50, center
```

**Warum:** Bei `stacked` brauchen Kinder explizite Positionierung (`top`, `bottom`, `center`, `pt`, `pb`, etc.), sonst liegen alle übereinander.

## Zag-Komponenten

### Slots ohne Doppelpunkt

```mirror
// FALSCH
Dialog
  Trigger Button "Open"
  Content Frame pad 16
    Text "Dialog content"
```

```mirror
// RICHTIG
Dialog
  Trigger: Button "Open"
  Content: Frame pad 16
    Text "Dialog content"
```

**Warum:** Zag-Slots (`Trigger:`, `Content:`, `Backdrop:`, etc.) brauchen einen Doppelpunkt. Sie sind Teil der Komponenten-Struktur.

### Tab value ohne Komma

```mirror
// FALSCH
Tabs defaultValue "a"
  Tab "Home" value "a"
  Tab "Settings" value "b"
```

```mirror
// RICHTIG
Tabs defaultValue "a"
  Tab "Home", value "a"
  Tab "Settings", value "b"
```

**Warum:** Nach dem String-Label kommt ein Komma, dann `value`. Wie bei allen Properties.

## Icons

### Icon-Name ohne Anführungszeichen

```mirror
// FALSCH
Icon check, ic green
Icon settings
```

```mirror
// RICHTIG
Icon "check", ic green
Icon "settings"
```

**Warum:** Der Icon-Name ist ein String und braucht Anführungszeichen.

### ic/is verwechseln

```mirror
// FALSCH – is für Farbe, ic für Größe
Icon "check", is #10b981, ic 24
```

```mirror
// RICHTIG – ic für Farbe, is für Größe
Icon "check", ic #10b981, is 24
```

**Warum:** `ic` = icon color (Farbe), `is` = icon size (Größe). Die Abkürzungen sind konsistent: i + erster Buchstabe.

## Referenzen

### name und Referenz verwechseln

```mirror
// FALSCH – name fehlt
Button "Menu", pad 12, toggle()
  open:
    bg #2563eb

Frame hidden
  Button.open:    // Button ist kein Name!
    visible
```

```mirror
// RICHTIG – name setzen
Button "Menu", name MenuBtn, pad 12, toggle()
  open:
    bg #2563eb

Frame hidden
  MenuBtn.open:
    visible
```

**Warum:** Um auf ein Element zu referenzieren, braucht es einen `name`. Der Komponenten-Name (`Button`) ist nicht der Referenz-Name.


## Checkliste

Vor dem Testen prüfen:

- [ ] Kommas nach Strings?
- [ ] Keine Einheiten (px, em)?
- [ ] Tokens mit $ und Suffix definiert?
- [ ] Tokens ohne Suffix verwendet?
- [ ] Komponenten-Definition mit `:`?
- [ ] Komponenten-Verwendung ohne `:`?
- [ ] States mit `:` definiert?
- [ ] Funktionen mit `()` aufgerufen?
- [ ] Icon-Namen in Anführungszeichen?
- [ ] Zag-Slots mit `:`?

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
