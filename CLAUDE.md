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

## Mirror DSL Tutorial

Das folgende Tutorial ist die vollständige Referenz für die Mirror DSL. Es wird automatisch aus den HTML-Tutorials generiert.

## Elemente & Hierarchie

_Die Grundbausteine jeder Mirror-Oberfläche_

In diesem Kapitel lernst du die Basis-Syntax von Mirror: Wie du Elemente erstellst, sie mit Properties gestaltest und durch Einrückung verschachtelst.

### Die Grundsyntax

Ein Mirror-Element besteht aus dem **Element-Namen**, optionalem **Text-Inhalt** in Anführungszeichen, und **Properties** getrennt durch Kommas:

```mirror
Button "Speichern", bg #2271C1, col white, pad 12 24, rad 6
```

**Was passiert hier?**

- `Button` – der Element-Typ
- `"Speichern"` – der sichtbare Text
- `bg #2271C1` – Hintergrundfarbe (Hex)
- `col white` – Textfarbe
- `pad 12 24` – Padding: 12px oben/unten, 24px links/rechts
- `rad 6` – Eckenradius von 6px

### Primitives

Primitives sind die Grundelemente von Mirror. Es gibt über 50 davon – hier die Basis-Elemente für den Einstieg:

```mirror
Frame gap 12, pad 16, bg #1a1a1a, rad 8
  Text "Eine Überschrift", col white, fs 18
  Text "Normaler Text darunter", col #888
  Button "Klick mich", bg #2271C1, col white, pad 10 20, rad 6
  Input placeholder "E-Mail eingeben...", bg #333, col white, pad 10, rad 4
```

| Primitive | Beschreibung                            |
| --------- | --------------------------------------- |
| `Frame`   | Container – das zentrale Layout-Element |
| `Text`    | Textinhalt                              |
| `Image`   | Bild                                    |
| `Icon`    | Icon (Lucide oder Material)             |
| `Button`  | Klickbarer Button                       |
| `Input`   | Einzeiliges Eingabefeld                 |
| `Link`    | Anklickbarer Link                       |

> **Hinweis:** Weitere Primitives: `Textarea`, `Label`, `Divider`, `Spacer`, semantische Elemente (`Header`, `Nav`, `Main`, `Section`, `Footer`, `H1`–`H6`) und über 50 Zag-Komponenten (`Dialog`, `Tabs`, `Menu`, `Select`, etc.).

### Styling-Properties

Properties steuern das Aussehen. Zahlen sind Pixel, `#hex` sind Farben:

```mirror
Frame gap 16, bg #0a0a0a, pad 16, rad 8

  // Farben: bg = Hintergrund, col = Textfarbe
  Text "Farbiger Text", bg #2271C1, col white, pad 8 16, rad 4

  // pad = Innenabstand (zwischen Rand und Inhalt)
  // mar = Außenabstand (zwischen Elementen)
  Frame hor, gap 0, bg #444, rad 4
    Text "pad 16", pad 16, bg #2271C1, col white
    Text "mar 16", mar 16, bg #10b981, col white

  // Größen: w = Breite, h = Höhe (in Pixel)
  Frame w 200, h 50, bg #10b981, rad 4, center
    Text "200 x 50", col white

  // Ecken: rad = Radius
  Frame hor, gap 8
    Frame w 50, h 50, bg #f59e0b, rad 0
    Frame w 50, h 50, bg #f59e0b, rad 8
    Frame w 50, h 50, bg #f59e0b, rad 25
```

| Property  | Beschreibung                            | Beispiel                  |
| --------- | --------------------------------------- | ------------------------- |
| `bg`      | Hintergrundfarbe                        | `bg #2271C1`              |
| `col`     | Textfarbe                               | `col white`               |
| `pad`     | Innenabstand (zwischen Rand und Inhalt) | `pad 12` oder `pad 12 24` |
| `mar`     | Außenabstand (zwischen Elementen)       | `mar 16`                  |
| `w` / `h` | Breite / Höhe                           | `w 200, h 100`            |
| `rad`     | Eckenradius                             | `rad 8`                   |
| `fs`      | Schriftgröße                            | `fs 18`                   |

### Hierarchie durch Einrückung

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
    Button "OK", pad 10 20, rad 6, bg #2271C1, col white
```

**Was passiert hier?**

- Der äußere `Frame` ist das Eltern-Element mit dunklem Hintergrund
- Zwei `Text`-Elemente sind direkte Kinder (eingerückt mit 2 Leerzeichen)
- Ein innerer `Frame hor` enthält selbst zwei Buttons als Kinder
- Die Hierarchie ist beliebig tief verschachtelbar

> **Hinweis:** **Wichtig:** `Frame` ist der wichtigste Container. Er ordnet seine Kinder standardmäßig **vertikal** an. Mit `hor` wird horizontal angeordnet.

### Kurzschreibweise mit Semicolon

Für einfache Strukturen kannst du Kinder auch in **einer Zeile** schreiben. Trenne sie mit Semikolon:

```mirror
// Mit Einrückung (3 Zeilen)
Frame hor, gap 12, bg #1a1a1a, pad 12, rad 6
  Icon "check", ic #10b981, is 20
  Text "Erfolgreich gespeichert", col white

// Gleiche Struktur in einer Zeile
Frame hor, gap 12, bg #1a1a1a, pad 12, rad 6; Icon "check", ic #10b981, is 20; Text "Erfolgreich gespeichert", col white
```

**Was passiert hier?**

- `Frame hor, gap 12, ...` – das Eltern-Element mit seinen Properties
- `;` – Semicolon trennt Eltern von Kindern
- `Icon "check", ...` – erstes Kind-Element
- `; Text "Erfolgreich", ...` – zweites Kind-Element

```mirror
// Frame ohne Properties, nur Kinder
Frame; Icon "star", ic #f59e0b, is 20; Text "Favorit", col white
```

> **Hinweis:** **Wann verwenden?** Die Semicolon-Syntax eignet sich für einfache, flache Strukturen wie Status-Meldungen oder Icon-Text-Kombinationen. Für komplexere Verschachtelungen ist Einrückung besser lesbar.

### Layout-Properties (Vorschau)

Mit Layout-Properties steuerst du, wie Kinder innerhalb eines Frames angeordnet werden. Hier die wichtigsten – Details im Layout-Kapitel:

```mirror
Frame gap 16, bg #0a0a0a, pad 16, rad 8

  // hor = horizontal anordnen
  Frame hor, gap 8, bg #1a1a1a, pad 12, rad 6
    Frame w 40, h 40, bg #2271C1, rad 4
    Frame w 40, h 40, bg #10b981, rad 4
    Frame w 40, h 40, bg #f59e0b, rad 4

  // center = horizontal und vertikal zentrieren
  Frame w 200, h 60, bg #1a1a1a, rad 6, center
    Text "Zentriert", col white

  // spread = Kinder an den Rändern verteilen
  Frame hor, spread, ver-center, w 300, bg #1a1a1a, pad 12, rad 6
    Text "Links", col white
    Text "Rechts", col white

  // gap = Abstand zwischen Kindern
  Frame hor, gap 24, bg #1a1a1a, pad 12, rad 6
    Text "A", col white
    Text "B", col white
    Text "C", col white
```

| Property | Beschreibung                        |
| -------- | ----------------------------------- |
| `hor`    | Kinder horizontal anordnen          |
| `ver`    | Kinder vertikal anordnen (Standard) |
| `gap`    | Abstand zwischen Kindern            |
| `center` | Kinder zentrieren (beide Achsen)    |
| `spread` | Kinder an Rändern verteilen         |
| `wrap`   | Kinder umbrechen wenn kein Platz    |

### Icons

Icons kommen von Lucide. Der Name kommt in Anführungszeichen:

```mirror
Frame gap 16, bg #0a0a0a, pad 16, rad 8

  // Lucide Icons (Standard)
  Frame hor, gap 16, bg #1a1a1a, pad 12, rad 6
    Icon "check", ic #10b981, is 24
    Icon "x", ic #ef4444, is 24
    Icon "settings", ic #888, is 24
    Icon "user", ic #2271C1, is 24

  // fill = ausgefüllte Variante
  Frame hor, gap 16, bg #1a1a1a, pad 12, rad 6
    Icon "heart", ic #ef4444, is 24
    Icon "heart", ic #ef4444, is 24, fill

  // Icons in Buttons
  Button pad 10 16, rad 6, bg #2271C1, col white
    Frame hor, gap 8, center
      Icon "save", ic white, is 16
      Text "Speichern"
```

| Property | Beschreibung         | Beispiel             |
| -------- | -------------------- | -------------------- |
| `is`     | Icon-Größe in Pixel  | `is 24`              |
| `ic`     | Icon-Farbe           | `ic #2271C1`         |
| `iw`     | Strichstärke         | `iw 1.5`             |
| `fill`   | Ausgefüllte Variante | `Icon "heart", fill` |

### Praxisbeispiel: Card

Kombiniere alles zu einer typischen UI-Komponente:

```mirror
Frame w 300, bg #1a1a1a, rad 12, pad 20, gap 16

  // Header mit Icon
  Frame hor, gap 12, center
    Icon "user", ic #2271C1, is 32
    Frame gap 2
      Text "Max Mustermann", col white, fs 16, weight semibold
      Text "Software Engineer", col #888, fs 13

  // Beschreibung
  Text "Arbeitet an spannenden Projekten.", col #aaa, fs 14

  // Action-Buttons
  Frame hor, gap 8
    Button pad 10 16, rad 6, bg #2271C1, col white
      Frame hor, gap 6, center
        Icon "mail", ic white, is 14
        Text "Nachricht"
    Button "Folgen", pad 10 16, rad 6, bg #333, col white
```

**Was passiert hier?**

- Die äußere `Frame` ist die Card mit fester Breite, Hintergrund und Padding
- Der Header kombiniert ein Icon mit zwei Text-Zeilen horizontal (`hor`)
- Die Buttons im Footer sind ebenfalls horizontal angeordnet
- Alles was du gelernt hast – Primitives, Properties, Hierarchie – kommt zusammen

> **Hinweis:** **Nächster Schritt:** Im nächsten Kapitel lernst du, wie du solche Cards als wiederverwendbare **Komponenten** definierst – damit du sie nicht jedes Mal neu schreiben musst.

---

### Das Wichtigste

| Syntax                          | Bedeutung        |
| ------------------------------- | ---------------- |
| `Element "Text", prop value`    | Grundsyntax      |
| `Frame, Text, Button, Input`    | Primitives       |
| `bg, col, pad, rad, w, h, fs`   | Styling          |
| `hor, ver, gap, center, spread` | Layout           |
| `2 Leerzeichen Einrückung`      | Kind-Element     |
| `Frame props; Kind1; Kind2`     | Kurzschreibweise |

---

## Wiederverwendbare Komponenten

_Styles einmal definieren, überall verwenden_

In diesem Kapitel lernst du, wie du eigene Komponenten erstellst. Das Kernkonzept: **Mit `:` definierst du, ohne `:` verwendest du.** Diese Regel gilt überall – für Komponenten, für Variationen, für Kind-Komponenten.

### Das Problem: Wiederholung

Wenn du mehrere Buttons mit dem gleichen Styling brauchst, musst du alles wiederholen:

```mirror
Frame hor, gap 8, bg #0a0a0a, pad 16, rad 8
  Button "Speichern", pad 10 20, rad 6, bg #2271C1, col white
  Button "Abbrechen", pad 10 20, rad 6, bg #2271C1, col white
  Button "Löschen", pad 10 20, rad 6, bg #2271C1, col white
```

Das ist mühsam und fehleranfällig. Änderst du das Styling, musst du es überall anpassen. Besser: Eine Komponente definieren.

### Komponenten definieren

Mit einem **Doppelpunkt nach dem Namen** definierst du eine wiederverwendbare Komponente. Bei der Verwendung lässt du den Doppelpunkt weg:

```mirror
// Definition: Name endet mit :
Btn: pad 10 20, rad 6, bg #2271C1, col white

// Verwendung: Name ohne :
Frame hor, gap 8, bg #0a0a0a, pad 16, rad 8
  Btn "Speichern"
  Btn "Abbrechen"
  Btn "Löschen"
```

Die Komponente `Btn:` speichert alle Properties. Bei `Btn "Text"` werden diese Properties angewendet und der Text eingefügt.

| Syntax  | Bedeutung             |
| ------- | --------------------- |
| `Name:` | Komponente definieren |
| `Name`  | Komponente verwenden  |

### Properties überschreiben

Bei der Verwendung kannst du einzelne Properties überschreiben. Die übrigen bleiben erhalten:

```mirror
Btn: pad 10 20, rad 6, bg #2271C1, col white

Frame hor, gap 8, wrap, bg #0a0a0a, pad 16, rad 8
  Btn "Standard"
  Btn "Grau", bg #333
  Btn "Rot", bg #dc2626
  Btn "Groß", pad 16 32, fs 18
```

`Btn "Grau", bg #333` überschreibt nur die Hintergrundfarbe. Padding, Radius und Textfarbe kommen weiterhin von der Definition.

### Kinder hinzufügen

Bei der Verwendung kannst du einer Komponente auch Kinder hinzufügen. Die Komponente wird zum Container für beliebige Inhalte:

```mirror
Card: bg #1a1a1a, pad 16, rad 8, gap 8

Card
  Text "Titel", col white, fs 16, weight 500
  Text "Beschreibung", col #888, fs 14
  Button "Aktion", pad 8 16, rad 6, bg #2271C1, col white
```

`Card:` definiert nur den Container (Hintergrund, Padding, Radius, Gap). Bei der Verwendung fügst du beliebige Kinder hinzu – Text, Buttons, weitere Frames, was immer du brauchst.

### Variationen als Komponenten

Du hast gesehen, wie du Properties bei der Verwendung überschreibst (`Btn "Rot", bg #333`). Das funktioniert gut für Einzelfälle. Aber was, wenn du dieselbe Variation mehrmals brauchst?

```mirror
Btn: pad 10 20, rad 6, bg #2271C1, col white

// Immer wieder dieselbe Überschreibung...
Frame hor, gap 8, bg #0a0a0a, pad 16, rad 8
  Btn "Löschen", bg #ef4444
  Btn "Entfernen", bg #ef4444
  Btn "Abbrechen", bg #ef4444
```

Jetzt wiederholst du dich wieder – `bg #ef4444` steht dreimal. Änderst du die Farbe, musst du es überall anpassen.

#### Lösung: Variationen zu Komponenten machen

Mit `as` machst du eine Variation selbst zur Komponente. Sie erbt alles von der Basis und fügt nur das Unterschiedliche hinzu:

```mirror
// Basis-Button
Btn: pad 10 20, rad 6, cursor pointer

// Variationen als eigene Komponenten
PrimaryBtn as Btn: bg #2271C1, col white
DangerBtn as Btn: bg #ef4444, col white
GhostBtn as Btn: bg transparent, col #888, bor 1, boc #333

Frame hor, gap 8, bg #0a0a0a, pad 16, rad 8
  PrimaryBtn "Speichern"
  DangerBtn "Löschen"
  GhostBtn "Abbrechen"
```

`DangerBtn as Btn:` bedeutet: "DangerBtn ist ein Btn, aber mit rotem Hintergrund." Alle drei Varianten erben `pad 10 20, rad 6, cursor pointer` von `Btn`.

> **Hinweis:** **Tipp:** Du kannst auch direkt von Primitives erben. `PrimaryBtn as Button: bg #2271C1` erzeugt einen Button mit allen Standard-Button-Eigenschaften plus blauem Hintergrund.

| Syntax                  | Bedeutung              |
| ----------------------- | ---------------------- |
| `DangerBtn as Btn:`     | DangerBtn erbt von Btn |
| `PrimaryBtn as Button:` | Von Primitive erben    |
| `DangerBtn "Text"`      | DangerBtn verwenden    |

### Komplexe Komponenten

Bisher waren unsere Komponenten einfach: Ein Element mit Properties (`Btn: pad 10 20, bg #2271C1`). Aber eine Komponente kann beliebig komplex sein – eine ganze Struktur mit mehreren Kindern. Stell dir einen Footer vor:

```mirror
Footer: w full, pad 20, bg #0a0a0a, hor, spread
  Text "© 2024 Meine App", col #666, fs 12
  Frame hor, gap 16
    Text "Impressum", col #888, fs 12
    Text "Datenschutz", col #888, fs 12
    Text "Kontakt", col #888, fs 12

Frame w full, gap 200, bg #1a1a1a
  Text "Seiteninhalt...", col white, pad 20
  Footer
```

`Footer:` enthält mehrere Elemente: Copyright-Text links, Links rechts. Bei der Verwendung schreibst du nur `Footer` – die gesamte Struktur wird eingefügt.

#### Das Problem: Fester Inhalt

Was aber, wenn du den Inhalt variieren möchtest? Zum Beispiel eine Card, die auf jeder Seite einen anderen Titel zeigt:

```mirror
Card: bg #1a1a1a, pad 16, rad 8, gap 8
  Text "Projekt Alpha", fs 16, weight 500, col white
  Text "Beschreibung des Projekts.", col #888, fs 14

Frame hor, gap 12, bg #0a0a0a, pad 16, rad 8
  Card
  Card
  Card
```

Alle drei Karten zeigen "Projekt Alpha". Der Inhalt ist fest in der Definition – du kannst ihn bei der Verwendung nicht ändern.

### Komponenten in Komponenten

Die Lösung: Definiere Kind-Komponenten innerhalb der Eltern-Komponente. Es gilt dieselbe Regel wie immer – **mit `:` definierst du, ohne `:` verwendest du**:

```mirror
// Card definiert zwei Kind-Komponenten: Title: und Desc:
Card: bg #1a1a1a, pad 16, rad 8, gap 8, w 200
  Title: fs 16, weight 500, col white
  Desc: col #888, fs 14

// Bei Verwendung: Kind-Komponenten befüllen (ohne :)
Frame hor, gap 12, bg #0a0a0a, pad 16, rad 8
  Card
    Title "Projekt Alpha"
    Desc "Das erste Projekt."
  Card
    Title "Projekt Beta"
    Desc "Ein anderes Projekt."
```

`Title:` und `Desc:` sind Komponenten-Definitionen innerhalb von `Card:`. Sie haben eigene Styles (Schriftgröße, Farbe). Bei der Verwendung schreibst du `Title "Text"` und `Desc "Text"` – ohne Doppelpunkt, wie bei jeder Komponenten-Verwendung.

| Syntax                        | Bedeutung                  |
| ----------------------------- | -------------------------- |
| `Title:` in Definition        | Kind-Komponente definieren |
| `Title "Text"` bei Verwendung | Kind-Komponente befüllen   |

### Kind-Komponenten mit mehreren Elementen

Eine Kind-Komponente kann auch mehrere Kinder aufnehmen. Das ist nützlich für Bereiche wie "Content" oder "Actions":

```mirror
Card: bg #1a1a1a, pad 16, rad 8, gap 12
  Title: fs 16, weight 500, col white
  Content: gap 8

Card
  Title "Benutzer"
  Content
    Text "Max Mustermann", col white, fs 14
    Text "max@example.com", col #888, fs 12
    Button "Profil", pad 8 16, rad 6, bg #333, col white
```

`Content:` definiert nur `gap 8`. Die eigentlichen Inhalte (Text, Button) werden bei der Verwendung eingefügt.

### Layouts

Das Prinzip funktioniert genauso für App-Layouts. Du definierst die Struktur (Sidebar links, Main rechts), und befüllst die Bereiche bei der Verwendung:

```mirror
// Layout mit Kind-Komponenten: Sidebar und Main
AppShell: w full, h 180, hor
  Sidebar: w 140, h full, bg #1a1a1a, pad 12, gap 8
  Main: w full, h full, bg #0c0c0c, pad 20

// Verwendung: Kind-Komponenten befüllen
AppShell
  Sidebar
    Text "Navigation", col #888, fs 11, uppercase
    Text "Dashboard", col white, fs 14
    Text "Settings", col white, fs 14
  Main
    Text "Hauptinhalt", col white, fs 18
```

`AppShell:` definiert das Grundgerüst: horizontal (`hor`), Sidebar 140px breit, Main füllt den Rest (`w full`). `Sidebar:` und `Main:` sind Kind-Komponenten mit eigenem Styling – der Inhalt kommt bei der Verwendung.

### Praxisbeispiel: Card-Komponente

Eine vollständige Card – alle Elemente sind in der Definition mit Formatierung vordefiniert. Bei der Verwendung gibst du nur noch die Texte an:

```mirror
// Alle Elemente mit Formatierung in der Definition
Card: w 260, bg #1a1a1a, rad 12, clip
  Title: w full, pad 16, bg #252525, col white, weight 500
  Desc: w full, pad 16, col #888, fs 14
  Footer: w full, pad 12 16, bg #151515, hor, spread
    Status: col #666, fs 12
    Action: pad 8 16, rad 6, bg #2271C1, col white

// Verwendung: Nur noch die Texte einfügen
Card
  Title "Neues Projekt"
  Desc "Erstelle ein neues Projekt."
  Footer
    Status "Schritt 1/3"
    Action "Weiter"
```

Der Vorteil: Die gesamte Formatierung ist in der Definition. Bei der Verwendung schreibst du nur noch die Inhalte – kein `col white`, kein `fs 14`, keine Wiederholung.

---

### Das Wichtigste

**Eine Regel:** Mit `:` definierst du, ohne `:` verwendest du.

| Syntax                 | Bedeutung                  |
| ---------------------- | -------------------------- |
| `Btn:`                 | Komponente definieren      |
| `Btn "OK"`             | Komponente verwenden       |
| `Btn "OK", bg #333`    | Properties überschreiben   |
| `Card` + Kinder        | Kinder hinzufügen          |
| `Title:` in Komponente | Kind-Komponente definieren |
| `Title "Text"`         | Kind-Komponente befüllen   |
| `DangerBtn as Btn:`    | Variation als Komponente   |

---

## Design Tokens

_Werte zentral definieren und überall verwenden_

Im letzten Kapitel hast du gelernt, Struktur zu abstrahieren – mit Komponenten. Dieses Kapitel zeigt, wie du **Werte** abstrahierst: Farben, Abstände, Radien. Statt Hex-Codes überall zu wiederholen, definierst du sie einmal als Token.

### Das Problem: Magische Werte

Schau dir diesen Code an – die Farbe `#2271C1` taucht dreimal auf:

```mirror
Btn: pad 10 20, rad 6, bg #2271C1, col white
Link: col #2271C1, underline
Badge: bg #2271C1, col white, pad 4 8, rad 4, fs 12

Frame gap 12, bg #0a0a0a, pad 16, rad 8
  Btn "Speichern"
  Link "Mehr erfahren"
  Badge "Neu"
```

> **Hinweis:** **Das Problem:** Was passiert, wenn du die Primärfarbe ändern willst? Du musst jede Stelle finden und anpassen. Bei großen Projekten ist das fehleranfällig – und du verlierst Zeit mit Suchen statt Gestalten.

### Tokens definieren

Ein Token ist ein Name für einen Wert. Die Syntax:

- **Definition:** `name.suffix: wert` – ohne `$`
- **Verwendung:** `bg $name` – mit `$`

```mirror
// Token definieren (ohne $)
primary.bg: #2271C1

// Token verwenden (mit $, ohne Suffix)
Btn: bg $primary, col white, pad 10 20, rad 6

Frame hor, gap 8, bg #0a0a0a, pad 16, rad 8
  Btn "Speichern"
  Btn "Senden"
  Btn "Weiter"
```

**Was passiert hier?**

- `primary.bg: #2271C1` – definiert einen Token namens "primary" für Hintergrundfarben
- `bg $primary` – verwendet den Token (`$` bedeutet "hole den Wert")
- Änderst du jetzt `primary.bg` auf `#10b981`, werden alle drei Buttons grün

> **Hinweis:** **Die Regel:** Definition ohne `$`, Verwendung mit `$`. Das `$` ist ein Platzhalter – "hier den Wert einsetzen".

### Warum Suffixe?

Der Suffix sagt, wofür der Token gedacht ist:

| Suffix | Bedeutung        | Beispiel              |
| ------ | ---------------- | --------------------- |
| `.bg`  | Hintergrundfarbe | `primary.bg: #2271C1` |
| `.col` | Textfarbe        | `muted.col: #888`     |
| `.boc` | Border-Farbe     | `border.boc: #333`    |
| `.rad` | Radius           | `card.rad: 8`         |
| `.pad` | Padding          | `space.pad: 16`       |
| `.gap` | Abstand          | `space.gap: 12`       |

> **Hinweis:** **Warum das hilft:** Das ermöglicht intelligentes Autocomplete. Tippst du `bg $`, zeigt die IDE nur Tokens mit `.bg` Suffix. So siehst du sofort, welche Tokens für Hintergrundfarben gedacht sind.

Hier ein Beispiel mit mehreren Token-Typen:

```mirror
primary.bg: #2271C1
primary.col: white
card.bg: #1a1a1a
card.rad: 8

// Jeder Token am richtigen Property
Btn: bg $primary, col $primary, pad 10 20, rad 6
Card: bg $card, rad $card, pad 16

Card
  Btn "In der Card"
```

**Was passiert hier?**

- `primary.bg` und `primary.col` – zwei Tokens mit dem gleichen Namen aber unterschiedlichen Suffixen
- `card.bg` und `card.rad` – Tokens für die Card: Hintergrund und Radius
- Bei `bg $primary` wird automatisch `$primary.bg` verwendet
- Bei `rad $card` wird automatisch `$card.rad` verwendet

### Semantische Tokens

Der wichtigste Tipp: Benenne Tokens nach ihrer _Bedeutung_, nicht nach ihrem Wert. Statt `$blue` schreib `$primary` – das beschreibt die Funktion, nicht die Farbe.

Warum? Deine Komponenten wissen dann nicht, dass "primary" gerade blau ist – sie wissen nur, dass es die Hauptfarbe ist. Willst du später die Primärfarbe ändern, änderst du nur den Token.

```mirror
// SEMANTISCHE TOKENS – benenne nach Bedeutung
primary.bg: #2271C1
danger.bg: #ef4444
card.bg: #1a1a1a

// KOMPONENTEN – verwenden semantische Tokens
Btn: bg $primary, col white, pad 10 20, rad 6
DangerBtn: bg $danger, col white, pad 10 20, rad 6
Card: bg $card, rad 8, pad 16, gap 8
  Title: col white, fs 16, weight 500

// INSTANZEN
Card
  Title "Semantische Tokens"
  Frame hor, gap 8
    Btn "Speichern"
    DangerBtn "Löschen"
```

**Was passiert hier?**

- `primary`, `danger`, `card` – semantische Namen beschreiben die Funktion
- Komponenten verwenden nur `$token` – sie kennen keine konkreten Farben
- Willst du die Primärfarbe ändern, änderst du nur `primary.bg` – alle Buttons passen sich an

### Style-Bündel (Property Sets)

Manchmal willst du nicht nur einen einzelnen Wert speichern, sondern eine **Kombination von Styles**. Das nennt sich Property Set – ein Bündel von Properties unter einem Namen:

```mirror
// Property Sets definieren (ohne Suffix, mehrere Properties)
standardtext: fs 14, col #888, weight 500
cardstyle: bg #1a1a1a, pad 16, rad 8
centeredrow: hor, center, gap 12

// Property Sets verwenden
Frame $cardstyle, gap 12
  Text "Normaler Text", $standardtext
  Text "Noch ein Text", $standardtext
  Frame $centeredrow
    Text "Zentriert", col white
    Text "•", col #444
    Text "In einer Reihe", col white
```

**Was passiert hier?**

- `standardtext: fs 14, col #888, weight 500` – drei Properties in einem Namen gebündelt
- `$standardtext` – wendet alle drei Properties auf einmal an
- `$cardstyle` – setzt Hintergrund, Padding und Radius in einem
- `$centeredrow` – kombiniert Layout-Properties (horizontal, zentriert, Abstand)

> **Hinweis:** **Syntax-Unterschied:** Einzelne Tokens haben einen Suffix (`primary.bg: #2271C1`), Property Sets haben keinen (`cardstyle: bg #1a1a1a, pad 16`). Das macht den Unterschied klar: Suffix = ein Wert, kein Suffix = mehrere Properties.

#### Property Sets mit Tokens kombinieren

Property Sets können auch andere Tokens referenzieren:

```mirror
// Einzelne Tokens
primary.bg: #2271C1
card.bg: #1a1a1a

// Property Sets die Tokens verwenden
primarybutton: bg $primary, col white, pad 10 20, rad 6
cardbase: bg $card, pad 16, rad 8, gap 8

Frame $cardbase
  Text "Card mit Token-Referenz", col white
  Frame $primarybutton
    Text "Button"
```

**Wann Property Sets nutzen?**

- Für wiederkehrende Style-Kombinationen, die keine eigene Komponente brauchen
- Für typografische Stile: `heading: fs 24, weight bold, col white`
- Für Layout-Patterns: `stackedcenter: stacked, center`

> **Hinweis:** **Property Set vs Komponente:** Ein Property Set ist nur ein Bündel von Styles. Eine Komponente kann zusätzlich Kinder, States und Events haben. Nutze Property Sets für reine Style-Wiederverwendung, Komponenten für strukturelle Bausteine.

### Die drei Stufen: Tokens → Komponenten → Instanzen

Jetzt siehst du das große Bild: Ein vollständiges Design System hat drei Ebenen, die aufeinander aufbauen:

Am Ende sind die Instanzen komplett sauber – du siehst nur noch, _was_ angezeigt wird, nicht _wie_:

```mirror
// 1. TOKENS – Werte zentral definieren
btn.bg: #2271C1
btn.col: white
card.bg: #1a1a1a
card.rad: 8
space.pad: 16

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

**Was passiert hier?**

- **Stufe 1 (Tokens):** Definiert alle Werte an einer Stelle – Farben, Radien, Abstände
- **Stufe 2 (Komponenten):** `Card` und `Btn` verwenden nur Tokens, keine Hex-Werte
- **Stufe 3 (Instanzen):** Nur noch Inhalt! `Title "Design System"` – keine einzige Style-Property

> **Hinweis:** **Das Ergebnis:** Instanzen sind lesbar wie ein Dokument. Du siehst sofort die Struktur: Eine Card mit Titel, Beschreibung und zwei Buttons. Alle Design-Entscheidungen stecken in den oberen Ebenen.

---

### Das Wichtigste

#### Einzelne Tokens

| Syntax                 | Bedeutung                     |
| ---------------------- | ----------------------------- |
| `primary.bg: #2271C1`  | Token definieren (mit Suffix) |
| `bg $primary`          | Token verwenden (mit `$`)     |
| `primary` statt `blue` | Semantisch benennen           |

#### Property Sets (Style-Bündel)

| Syntax                                 | Bedeutung                             |
| -------------------------------------- | ------------------------------------- |
| `cardstyle: bg #1a1a1a, pad 16, rad 8` | Property Set definieren (ohne Suffix) |
| `Frame $cardstyle`                     | Alle Properties auf einmal anwenden   |
| `heading: fs 24, weight bold`          | Typografie-Stile bündeln              |

**Drei Stufen:** Tokens → Komponenten → Instanzen

Tokens abstrahieren Werte, Property Sets bündeln Styles, Komponenten abstrahieren Struktur. Zusammen ergeben sie ein konsistentes Design System.

---

## Layout

_Flex, Grid und Positionierung_

Mirror bietet drei Layout-Systeme: **Flex** für fließende Layouts (Navigation, Cards), **Grid** für strukturierte Raster (Dashboards, Page-Layouts), und **Stacked** für überlagerte Elemente (Badges, Overlays).

### Flex Layout

#### Richtung: hor und ver

Standardmäßig fließen Kinder vertikal (untereinander). Mit `hor` wechselst du auf horizontal.

**Wichtig – Defaults:** Sowohl `hor` als auch `ver` haben dieselben Defaults: Kinder werden am **Anfang** ausgerichtet (`flex-start`). Bei `ver` = oben, bei `hor` = links. **Keine automatische Zentrierung!** Wenn du Zentrierung willst, sagst du es explizit mit `center` (beide Achsen) oder `ver-center` (nur vertikal).

> **Hinweis:** **Wichtig – Defaults:** Sowohl `hor` als auch `ver` haben dieselben Defaults: Kinder werden am **Anfang** ausgerichtet (`flex-start`). Bei `ver` = oben, bei `hor` = links. **Keine automatische Zentrierung!** Wenn du Zentrierung willst, sagst du es explizit mit `center` (beide Achsen) oder `ver-center` (nur vertikal).

```mirror
Box: w 50, h 50, rad 6, center

Frame gap 12, bg #0a0a0a, pad 16, rad 8
  // Vertikal (Standard)
  Frame bg #1a1a1a, pad 16, rad 8, gap 8
    Text "Zeile 1", col white
    Text "Zeile 2", col white
    Text "Zeile 3", col white

  // Horizontal
  Frame hor, bg #1a1a1a, pad 16, rad 8, gap 12
    Box "1", bg #2271C1
    Box "2", bg #10b981
    Box "3", bg #f59e0b
```

**Was passiert hier?**

- Der erste Frame stapelt Text-Elemente vertikal (Standard-Verhalten)
- Der zweite Frame mit `hor` legt die Boxen nebeneinander
- `gap` definiert den Abstand zwischen den Kindern – ob vertikal oder horizontal

#### Größen: w und h

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
  Frame w full, h 40, bg #2271C1, rad 4, center
    Text "w full", col white, fs 12
```

**Was passiert hier?**

- `w 120` – feste Breite in Pixel
- `w hug` – schrumpft auf die Größe des Inhalts (wie Shrink-to-fit)
- `w full` – dehnt sich auf den verfügbaren Platz aus (wie 100%)

> **Hinweis:** **Merke:** `full` ist der häufigste Fall – Elemente füllen standardmäßig den verfügbaren Platz. `hug` brauchst du, wenn ein Element nur so groß wie nötig sein soll.

#### Zentrieren und Verteilen

```mirror
Frame gap 12, bg #0a0a0a, pad 16, rad 8
  // center – beide Achsen
  Frame w 200, h 80, bg #1a1a1a, rad 8, center
    Text "center", col white

  // ver-center – nur vertikal (nützlich bei hor + spread)
  Frame hor, spread, ver-center, w full, bg #1a1a1a, pad 16, rad 8
    Text "Links", col white
    Text "Rechts", col white

  // hor-center – nur horizontal
  Frame w 200, h 60, bg #1a1a1a, rad 8, hor-center
    Text "nur horizontal", col white
```

| Ausrichtung  | Beschreibung                          |
| ------------ | ------------------------------------- |
| `center`     | Beide Achsen zentrieren               |
| `ver-center` | Nur vertikal zentrieren (bei `hor`)   |
| `hor-center` | Nur horizontal zentrieren (bei `ver`) |
| `spread`     | Kinder an Rändern verteilen           |

#### 9 Positionen

Kinder an einer von 9 Positionen platzieren:

```mirror
Box: w 70, h 70, bg #1a1a1a, rad 6
  Label: col #888, fs 11

Frame gap 8, bg #0a0a0a, pad 12, rad 8
  Frame hor, gap 8
    Box tl
      Label "tl"
    Box tc
      Label "tc"
    Box tr
      Label "tr"
  Frame hor, gap 8
    Box cl
      Label "cl"
    Box center
      Label "cen"
    Box cr
      Label "cr"
  Frame hor, gap 8
    Box bl
      Label "bl"
    Box bc
      Label "bc"
    Box br
      Label "br"
```

#### Wrap

Bei Überlauf in die nächste Zeile umbrechen:

```mirror
Box: w 60, h 40, bg #2271C1, rad 4, center

Frame hor, wrap, gap 8, bg #1a1a1a, pad 16, rad 8, w 240
  Box "1"
  Box "2"
  Box "3"
  Box "4"
  Box "5"
```

### Grid Layout

Grid ist das zweite Layout-System – ideal für strukturierte Raster wie Dashboards oder Seitenlayouts. Der entscheidende Unterschied zu Flex: Du definierst ein festes Spaltenraster, und Elemente werden in Zellen platziert.

#### Grid aktivieren

Mit `grid N` aktivierst du ein N-Spalten-Grid. Wichtig: Im Grid-Kontext bedeutet `w` nicht mehr Pixel, sondern **Spalten-Span**:

```mirror
Frame w 500, grid 12, gap 8, bg #111, pad 16, rad 8, row-height 40
  // w = Spalten-Span (nicht Pixel!)
  Frame w 12, bg #2271C1, rad 4, center
    Text "w 12 (volle Breite)", col white, fs 12
  Frame w 6, bg #10b981, rad 4, center
    Text "w 6", col white, fs 12
  Frame w 6, bg #10b981, rad 4, center
    Text "w 6", col white, fs 12
  Frame w 4, bg #f59e0b, rad 4, center
    Text "w 4", col white, fs 12
  Frame w 4, bg #f59e0b, rad 4, center
    Text "w 4", col white, fs 12
  Frame w 4, bg #f59e0b, rad 4, center
    Text "w 4", col white, fs 12
```

**Was passiert hier?**

- `grid 12` – teilt den Container in 12 gleich breite Spalten
- `row-height 40` – jede Zeile ist 40 Pixel hoch
- `w 12` – das Element spannt alle 12 Spalten (volle Breite)
- `w 6` – das Element spannt 6 Spalten (halbe Breite)
- `w 4` – das Element spannt 4 Spalten (ein Drittel)

> **Hinweis:** **Achtung:** Im Grid-Kontext haben `w` und `h` eine andere Bedeutung! `w 6` bedeutet 6 Spalten, `h 2` bedeutet 2 Zeilen – nicht Pixel. Für die Zeilenhöhe in Pixel nutzt du `row-height`.

#### Explizite Platzierung

Mit `x` und `y` platzierst du Elemente exakt (1-indexed):

```mirror
Frame w 600, grid 12, gap 8, bg #111, pad 16, rad 8, row-height 35
  Frame x 1, y 1, w 12, h 2, bg #2271C1, rad 4, center
    Text "Hero", col white, fs 12

  Frame x 1, y 3, w 3, h 3, bg #10b981, rad 4, center
    Text "Sidebar", col white, fs 12

  Frame x 4, y 3, w 9, h 3, bg #333, rad 4, center
    Text "Content", col white, fs 12

  Frame x 1, y 6, w 12, h 1, bg #1a1a1a, rad 4, center
    Text "Footer", col #888, fs 11
```

#### Grid als Komponente

```mirror
// Layout-Komponente
Dashboard: grid 12, gap 12, row-height 25, h 200
  Header: x 1, y 1, w 12, h 2, bg #1a1a1a, rad 6, pad 0 16, hor, spread, ver-center
  Nav: x 1, y 3, w 2, h 5, bg #1a1a1a, rad 6, pad 12, gap 4
  Main: x 3, y 3, w 10, h 5, grid 2, gap 12

Widget: bg #252525, rad 6, pad 12, gap 4
  Title: col white, fs 13, weight 500
  Value: col #2271C1, fs 24, weight 600

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

### Stacked Layout

Das dritte Layout-System ist `stacked` – es stapelt alle Kinder übereinander an derselben Position. Das ist ideal für Overlays, Badges oder absolut positionierte Elemente. Die Positionierung erfolgt mit `x` und `y` in Pixel – genau wie in Figma:

```mirror
Frame w 200, h 150, stacked, bg #1a1a1a, rad 8
  // Vier Ecken
  Frame x 0, y 0, w 30, h 30, bg #ef4444, rad 4
  Frame x 170, y 0, w 30, h 30, bg #f59e0b, rad 4
  Frame x 0, y 120, w 30, h 30, bg #10b981, rad 4
  Frame x 170, y 120, w 30, h 30, bg #2271C1, rad 4

  // Mitte
  Frame x 80, y 55, w 40, h 40, bg white, rad 99
```

**Was passiert hier?**

- `stacked` – alle Kinder werden übereinander gestapelt
- `x 0, y 0` – Position von oben-links des Containers
- `x 170, y 0` – 170px vom linken Rand, 0px vom oberen Rand
- Anders als bei Grid sind `x` und `y` hier echte Pixel-Werte

#### Praktisch: Badge auf Icon

Das typische Anwendungsbeispiel für `stacked`: Ein Badge oder Status-Indikator über einem Icon:

```mirror
// Badge-Komponente
Badge: x 30, y -4, w 18, h 18, bg #ef4444, rad 99, center
  Count: col white, fs 10, weight 600

// Status-Punkt
Status: x 30, y 30, w 14, h 14, bg #10b981, rad 99, bor 2, boc #111

Frame hor, gap 24, bg #0a0a0a, pad 16, rad 8
  // Icon mit Badge
  Frame w 44, h 44, stacked
    Frame w 44, h 44, bg #1a1a1a, rad 8, center
      Icon "bell", ic #888, is 22
    Badge
      Count "3"

  // Avatar mit Status
  Frame w 44, h 44, stacked
    Frame w 44, h 44, bg #2271C1, rad 99, center
      Text "TS", col white, fs 14, weight 500
    Status
```

---

### Zusammenfassung

| System      | Verwendung                            |
| ----------- | ------------------------------------- |
| **Flex**    | Fließende Layouts (Navigation, Cards) |
| **Grid**    | Strukturierte Raster (Dashboards)     |
| **Stacked** | Überlagerungen (Badges, Overlays)     |

**Flex:**

- `hor`, `ver` – Richtung (beide: `flex-start` als Default)
- `gap N` – Abstand
- `center` – beide Achsen zentrieren
- `ver-center` – nur vertikal zentrieren
- `hor-center` – nur horizontal zentrieren
- `spread` – Kinder an Rändern verteilen
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

---

## Styling

_Farben, Typografie, Borders und Effekte_

In den vorherigen Kapiteln hast du Layout und Struktur kennengelernt. Dieses Kapitel zeigt alle **visuellen Properties** – von Farben über Typografie bis zu Effekten. Es ist als Referenz gedacht: Schau hier nach, wenn du wissen willst, wie ein bestimmter Effekt funktioniert.

### Farben

Mirror unterstützt verschiedene Farbformate. Am häufigsten verwendest du Hex-Farben (`#2271C1`), aber auch benannte Farben und rgba sind möglich:

```mirror
Frame hor, gap 8, wrap, bg #0a0a0a, pad 16, rad 8
  // Hex-Farben
  Frame w 50, h 50, bg #2271C1, rad 6
  Frame w 50, h 50, bg #10b981, rad 6
  Frame w 50, h 50, bg #f59e0b, rad 6
  Frame w 50, h 50, bg #ef4444, rad 6

  // Benannte Farben
  Frame w 50, h 50, bg white, rad 6
  Frame w 50, h 50, bg black, rad 6

  // Mit Transparenz
  Frame w 50, h 50, bg rgba(34,113,193,0.5), rad 6
  Frame w 50, h 50, bg #2271C188, rad 6
```

**Was passiert hier?**

- `#2271C1` – Hex-Farbe (6 Zeichen für RGB)
- `white`, `black` – benannte CSS-Farben funktionieren direkt
- `rgba(34,113,193,0.5)` – Farbe mit 50% Transparenz
- `#2271C188` – Hex mit Alpha-Kanal (8 Zeichen, die letzten zwei sind Transparenz)

> **Hinweis:** **Tipp:** Für transparente Farben ist `#rrggbbaa` kürzer als `rgba()`. Die letzten zwei Hex-Zeichen geben die Transparenz an: `ff` = 100% sichtbar, `00` = unsichtbar.

### Gradients

Farbverläufe machen UIs lebendiger. In Mirror verwendest du `grad` für horizontale Verläufe, `grad-ver` für vertikale, oder `grad N` für einen bestimmten Winkel:

```mirror
Frame w 400, gap 8, bg #0a0a0a, pad 16, rad 8
  // Horizontal (Standard)
  Frame w full, h 50, rad 8, bg grad #2271C1 #7c3aed

  // Vertikal
  Frame w full, h 50, rad 8, bg grad-ver #f59e0b #ef4444

  // Mit Winkel (45°)
  Frame w full, h 50, rad 8, bg grad 45 #10b981 #2271C1

  // Drei Farben
  Frame w full, h 50, rad 8, bg grad #10b981 #2271C1 #7c3aed
```

**Was passiert hier?**

- `grad #a #b` – horizontaler Verlauf von links nach rechts
- `grad-ver #a #b` – vertikaler Verlauf von oben nach unten
- `grad 45 #a #b` – Verlauf im 45°-Winkel
- `grad #a #b #c` – Verlauf mit drei Farben (funktioniert auch mit mehr)

```mirror
Frame bg #1a1a1a, pad 20, rad 8, gap 8
  Text "Gradient Text", fs 24, weight bold, col grad #2271C1 #7c3aed
  Text "Vertical Gradient", fs 24, weight bold, col grad-ver #f59e0b #ef4444
```

### Borders

Borders bestehen aus zwei Properties: `bor` (Breite in Pixel) und `boc` (Farbe). Beide zusammen ergeben den sichtbaren Rahmen:

```mirror
Frame hor, gap 12, bg #0a0a0a, pad 16, rad 8
  // Border rundum
  Frame w 70, h 70, bor 2, boc #2271C1, rad 8, center
    Text "2px", col #888, fs 11

  // Dickerer Border
  Frame w 70, h 70, bor 4, boc #10b981, rad 8, center
    Text "4px", col #888, fs 11

  // Mit Hintergrund
  Frame w 70, h 70, bg #1a1a1a, bor 1, boc #333, rad 8, center
    Text "subtle", col #888, fs 11
```

> **Hinweis:** **Praxis-Tipp:** Ein subtiler 1px-Border (`bor 1, boc #333`) auf dunklem Hintergrund gibt Elementen Tiefe, ohne aufdringlich zu wirken. Das ist ein häufig genutztes Pattern für Cards und Inputs.

### Border Radius

Von eckig bis rund:

```mirror
Frame hor, gap 12, bg #0a0a0a, pad 16, rad 8
  Frame w 60, h 60, bg #2271C1, rad 0, center
    Text "0", col white, fs 11
  Frame w 60, h 60, bg #2271C1, rad 4, center
    Text "4", col white, fs 11
  Frame w 60, h 60, bg #2271C1, rad 12, center
    Text "12", col white, fs 11
  Frame w 60, h 60, bg #2271C1, rad 99, center
    Text "99", col white, fs 11
```

`rad 99` erzeugt einen Kreis bei quadratischen Elementen.

### Typografie: Größe & Gewicht

Die zwei wichtigsten Typografie-Properties sind `fs` (font-size, in Pixel) und `weight` (Schriftdicke). Eine klare Hierarchie entsteht durch die Kombination beider:

```mirror
Frame gap 4, bg #1a1a1a, pad 16, rad 8
  Text "Headline", col white, fs 24, weight bold
  Text "Subheadline", col white, fs 18, weight 500
  Text "Body Text", col #ccc, fs 14
  Text "Small Text", col #888, fs 12
  Text "Caption", col #666, fs 10, uppercase
```

**Was passiert hier?**

- Größe und Farbe schaffen Hierarchie: Größer + heller = wichtiger
- `weight` akzeptiert Zahlen (100-900) oder Namen (`bold`, `semibold`, etc.)
- `uppercase` bei Captions ist ein gängiges Pattern für Labels und Kategorien

### Typografie: Stil

Text-Transformationen und Stile:

```mirror
Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "UPPERCASE TEXT", col white, uppercase
  Text "lowercase text", col white, lowercase
  Text "Italic Text", col white, italic
  Text "Underlined Text", col white, underline
  Text "Truncated text that is too long to fit...", col white, truncate, w 200
```

### Typografie: Fonts

Verschiedene Schriftarten:

```mirror
Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "Sans Serif (default)", col white, font sans
  Text "Serif Font", col white, font serif
  Text "Monospace Font", col white, font mono
```

### Shadows

Schatten erzeugen Tiefe und Hierarchie. Mirror bietet drei vordefinierte Stufen – von subtil bis auffällig:

```mirror
Frame hor, gap 16, pad 20, bg #0a0a0a
  Frame w 80, h 80, bg #1a1a1a, rad 8, shadow sm, center
    Text "sm", col #888, fs 11
  Frame w 80, h 80, bg #1a1a1a, rad 8, shadow md, center
    Text "md", col #888, fs 11
  Frame w 80, h 80, bg #1a1a1a, rad 8, shadow lg, center
    Text "lg", col #888, fs 11
```

> **Hinweis:** **Wann welche Stufe?** `sm` für subtile Erhöhung (Cards), `md` für schwebende Elemente (Dropdowns), `lg` für modale Dialoge die Aufmerksamkeit brauchen.

### Opacity

Transparenz des gesamten Elements:

```mirror
Frame hor, gap 8, bg #0a0a0a, pad 16, rad 8
  Frame w 60, h 60, bg #2271C1, rad 8, center, opacity 1
    Text "1", col white, fs 11
  Frame w 60, h 60, bg #2271C1, rad 8, center, opacity 0.7
    Text "0.7", col white, fs 11
  Frame w 60, h 60, bg #2271C1, rad 8, center, opacity 0.4
    Text "0.4", col white, fs 11
  Frame w 60, h 60, bg #2271C1, rad 8, center, opacity 0.2
    Text "0.2", col white, fs 11
```

### Cursor

Mauszeiger-Stil ändern:

```mirror
Frame hor, gap 8, wrap, bg #0a0a0a, pad 16, rad 8
  Frame w 70, h 50, bg #1a1a1a, rad 6, center, cursor pointer
    Text "pointer", col #888, fs 10
  Frame w 70, h 50, bg #1a1a1a, rad 6, center, cursor grab
    Text "grab", col #888, fs 10
  Frame w 70, h 50, bg #1a1a1a, rad 6, center, cursor move
    Text "move", col #888, fs 10
  Frame w 70, h 50, bg #1a1a1a, rad 6, center, cursor not-allowed
    Text "not-allowed", col #888, fs 9
```

### Praktisch: Button Varianten

Jetzt siehst du, wie die einzelnen Properties zusammenspielen. Hier sind sechs typische Button-Varianten, die du in fast jedem Design System findest:

```mirror
Frame gap 12, bg #0a0a0a, pad 16, rad 8
  // Filled Buttons
  Frame hor, gap 8
    Button "Primary", bg #2271C1, col white, pad 10 20, rad 6
    Button "Success", bg #10b981, col white, pad 10 20, rad 6
    Button "Danger", bg #ef4444, col white, pad 10 20, rad 6

  // Outlined Buttons
  Frame hor, gap 8
    Button "Outline", bor 1, boc #2271C1, col #2271C1, pad 10 20, rad 6
    Button "Subtle", bg #2271C122, col #2271C1, pad 10 20, rad 6

  // Ghost & Link
  Frame hor, gap 8
    Button "Ghost", col #888, pad 10 20, rad 6
    Button "Link →", col #2271C1, pad 10 20, underline
```

**Was passiert hier?**

- **Filled:** Volle Hintergrundfarbe – für primäre Aktionen
- **Outline:** Nur Border, kein Hintergrund – für sekundäre Aktionen
- **Subtle:** Transparenter Hintergrund mit `bg #2271C122` (22 = 13% Opacity)
- **Ghost:** Nur Text, kein visueller Container – für tertiäre Aktionen
- **Link:** Mit `underline` – für Inline-Navigation

### Praktisch: Card Styles

Cards sind Container für zusammengehörige Inhalte. Hier drei typische Varianten, die sich durch ihre visuelle "Erhöhung" unterscheiden:

```mirror
Frame hor, gap 12, bg #0a0a0a, pad 16, rad 8
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

**Was passiert hier?**

- **Elevated:** Hintergrund + Schatten – die Card "schwebt" über der Oberfläche
- **Bordered:** Kein Hintergrund, nur Border – flacher, weniger dominant
- **Gradient:** Farbverlauf im 135°-Winkel – für besondere Hervorhebung

> **Hinweis:** **Design-Tipp:** Mische nicht zu viele Card-Styles in einem Design. Wähle einen Hauptstil und verwende die anderen sparsam für besondere Hervorhebung.

---

### Zusammenfassung

- `bg, col` – Hintergrund & Textfarbe
- `bg grad #a #b`, `col grad #a #b` – Gradients (auch `grad-ver`, `grad 45`)
- `bor, boc, rad` – Border & Radius
- `fs, weight, font` – Schriftgröße, -dicke, -art
- `italic, underline, uppercase, truncate` – Text-Stile
- `shadow sm/md/lg` – Schatten
- `opacity` – Transparenz
- `cursor pointer/grab/move` – Mauszeiger

---

## States

_Wie Elemente ihr Aussehen ändern_

Bisher haben wir statische UIs gebaut. Jetzt lernen wir, wie Elemente ihr Aussehen ändern können – bei Hover, bei Klick, oder wenn etwas anderes passiert. Das Konzept dahinter: **States**.

### Das Konzept: States

Ein **State** beschreibt, wie ein Element in einem bestimmten Zustand aussieht. Eine **Funktion** löst den Wechsel aus:

```mirror
Btn: pad 12 24, rad 6, bg #333, col white, cursor pointer, toggle()
  on:
    bg #2271C1

Btn "Klick mich"
```

Der Button startet grau. Bei Klick wird er blau. Nochmal klicken – wieder grau.

| Syntax     | Bedeutung                                   |
| ---------- | ------------------------------------------- |
| `on:`      | **State** – definiert das Aussehen          |
| `toggle()` | **Funktion** – wechselt den State bei Klick |

### System-States: hover, focus, active, disabled

Manche States werden automatisch vom Browser ausgelöst – du brauchst keine Funktion:

```mirror
Btn: pad 12 24, rad 6, bg #333, col white, cursor pointer
  hover:
    bg #444
  active:
    bg #222
    scale 0.98

Btn "Hover und Klick mich"
```

| System-State | Wann aktiv?                |
| ------------ | -------------------------- |
| `hover:`     | Maus ist über dem Element  |
| `focus:`     | Element hat Tastatur-Fokus |
| `active:`    | Während Mausklick gedrückt |
| `disabled:`  | Element ist deaktiviert    |

#### Focus und Disabled

Besonders wichtig für Formulare:

```mirror
Field: bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w 200
  focus:
    boc #2271C1
  disabled:
    opacity 0.5
    cursor not-allowed

Frame gap 8
  Input placeholder "Klick mich", Field
  Input placeholder "Deaktiviert", Field, disabled
```

### Custom States

Für eigene Interaktionen definierst du **Custom States**. Anders als System-States brauchst du eine Funktion, die sie auslöst:

```mirror
FavBtn: pad 12 20, rad 6, bg #1a1a1a, col #888, cursor pointer, hor, ver-center, gap 8, toggle()
  Icon "heart", ic #666, is 16
  "Merken"
  hover:
    bg #252525
  on:
    bg #2271C1
    col white
    Icon "heart", ic white, is 16, fill
    "Gemerkt"

Frame hor, ver-center, gap 8
  FavBtn
  FavBtn on
```

Dieses Beispiel kombiniert System-State (`hover:`) mit Custom State (`on:`):

- `hover:` – Browser aktiviert bei Maus-Hover (kein Trigger nötig)
- `on:` – `toggle()` aktiviert bei Klick
- `FavBtn on` – Instanz startet im aktivierten State

#### State-Namen sind frei wählbar

Du kannst jeden Namen verwenden – `on`, `open`, `selected`, `expanded`. **Ausnahme:** Vermeide `hover`, `focus`, `active`, `disabled` – diese sind für CSS-Pseudo-States reserviert.

**Tipp:** Für Toggle-Switches gibt es die fertige `Switch` Zag-Komponente (siehe Eingabe-Komponenten) mit Accessibility und Keyboard-Navigation.

> **Hinweis:** **Tipp:** Für Toggle-Switches gibt es die fertige `Switch` Zag-Komponente (siehe Eingabe-Komponenten) mit Accessibility und Keyboard-Navigation.

### States können alles ändern

Bisher haben States nur Styles geändert (Farben, Größen). Aber States können auch **komplett andere Kinder** haben – wie Figma Variants:

```mirror
ExpandBtn: pad 12, bg #333, col white, rad 6, hor, ver-center, gap 8, cursor pointer, toggle()
  "Mehr zeigen"
  Icon "chevron-down", ic white, is 16
  open:
    "Weniger zeigen"
    Icon "chevron-up", ic white, is 16

ExpandBtn
```

Im Base-State zeigt der Button "Mehr zeigen" mit Pfeil nach unten. Im `open`-State wird _alles_ ausgetauscht: anderer Text, anderes Icon.

> **Hinweis:** **Wie Figma Variants:** Jeder State kann eine komplett andere Version der Komponente sein – nicht nur andere Farben, sondern andere Inhalte, andere Struktur.

### Mehrere States

Was wenn du mehr als zwei Zustände brauchst? Ein Task kann "todo", "doing" oder "done" sein. `toggle()` erkennt das automatisch und cyclet durch alle States:

```mirror
StatusBtn: pad 12 24, rad 6, col white, cursor pointer, hor, ver-center, gap 8, toggle()
  todo:
    bg #333
    Icon "circle", ic white, is 14
  doing:
    bg #f59e0b
    Icon "clock", ic white, is 14
  done:
    bg #10b981
    Icon "check", ic white, is 14

StatusBtn
```

`toggle()` cyclet durch alle definierten States:

- Klick 1: todo → doing (orange mit Uhr)
- Klick 2: doing → done (grün mit Haken)
- Klick 3: done → todo (zurück zum Anfang)

> **Hinweis:** Die Reihenfolge der State-Definitionen bestimmt die Cycle-Reihenfolge. Der erste State (`todo`) ist der Startzustand.

### Nur einer aktiv: exclusive()

Bei Tabs oder Radio-Buttons soll immer nur _ein_ Element aktiv sein. Wenn du eines aktivierst, werden alle anderen automatisch deaktiviert:

```mirror
Tab: pad 12 20, rad 6, bg #333, col #888, cursor pointer, exclusive()
  selected:
    bg #2271C1
    col white

Frame hor, ver-center, gap 4, bg #1a1a1a, pad 4, rad 8
  Tab "Home"
  Tab "Projekte", selected
  Tab "Settings"
```

`exclusive()` macht zwei Dinge: Es aktiviert das geklickte Element und deaktiviert alle Geschwister des gleichen Typs.

### Auswahl-Wert verfolgen: bind

Bei `exclusive()` ist immer nur ein Element aktiv – aber welcher Wert ist ausgewählt? Mit `bind varName` speicherst du den Textinhalt des aktiven Elements automatisch in einer Variable:

```mirror
Option: pad 10, rad 6, bg #333, col #888, cursor pointer, exclusive()
  hover:
    bg #444
  on:
    bg #2271C1
    col white

Frame gap 8, bind city
  Text "Ausgewählt: $city", col #888, fs 12
  Option "Berlin"
  Option "Hamburg"
  Option "München"
```

**Was passiert hier?**

- `bind city` auf dem Frame – speichert den Textinhalt des aktiven Elements
- `$city` im Text – zeigt den aktuell ausgewählten Wert
- `exclusive()` auf Option – nur eine Option kann aktiv sein
- Bei Klick auf eine Option wird deren Textinhalt ("Berlin", "Hamburg", etc.) in `$city` gespeichert

> **Hinweis:** **bind + exclusive() = Custom Select.** Für vollständige Dropdowns mit Auf-/Zuklappen, Accessibility und Keyboard-Navigation gibt es die fertige `Select` Zag-Komponente (siehe Eingabe).

### Auf andere Elemente reagieren

Manchmal soll ein Element sein Aussehen ändern, wenn ein _anderes_ Element seinen State wechselt. Klassisches Beispiel: Ein Menü wird sichtbar, wenn ein Button aktiviert wird.

Dafür brauchst du zwei Dinge:

- Gib dem steuernden Element einen **Namen** mit `name`
- Referenziere diesen Namen mit `Name.state:`

```mirror
Frame gap 12, bg #0a0a0a, pad 16, rad 8
  Button "Menü", name MenuBtn, pad 10 20, rad 6, bg #333, col white, toggle()
    open:
      bg #2271C1

  Frame bg #1a1a1a, pad 12, rad 8, gap 4, hidden
    MenuBtn.open:
      visible
    Text "Dashboard", col white, fs 14, pad 8
    Text "Einstellungen", col white, fs 14, pad 8
```

`MenuBtn.open:` bedeutet: "Wenn das Element namens MenuBtn im State 'open' ist, wende diese Styles an." Das Menü startet `hidden` und wird sichtbar, sobald der Button aktiviert wird.

### Praktisch: Accordion

Ein Accordion zeigt im geschlossenen Zustand nur einen Header, im offenen Zustand auch den Inhalt:

```mirror
Panel: bg #1a1a1a, rad 8, clip, toggle()
  Frame hor, spread, ver-center, gap 8, pad 16, cursor pointer
    Text "Mehr anzeigen", col white, fs 14
    Icon "chevron-down", ic #888, is 18
  open:
    Frame hor, spread, ver-center, gap 8, pad 16, cursor pointer
      Text "Weniger anzeigen", col white, fs 14
      Icon "chevron-up", ic #888, is 18
    Frame pad 0 16 16 16, gap 8
      Text "Hier ist der versteckte Inhalt.", col #888, fs 13

Panel
```

Der Base-State zeigt "Mehr anzeigen" mit Pfeil nach unten. Der `open`-State zeigt "Weniger anzeigen" mit Pfeil nach oben plus den zusätzlichen Inhalt.

### Andere Events

Klick ist der Default. Für andere Events gibt es Shorthands:

```mirror
Field: bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w 220
  focus:
    boc #2271C1

Frame gap 8
  Input placeholder "Enter drücken...", Field, onenter toggle()
    on:
      boc #10b981
      bg #10b98122
  Input placeholder "Escape drücken...", Field, onescape toggle()
    on:
      boc #ef4444
      bg #ef444422
```

| Event                | Beschreibung        |
| -------------------- | ------------------- |
| `toggle()`           | Bei Klick (Default) |
| `onenter toggle()`   | Bei Enter-Taste     |
| `onescape toggle()`  | Bei Escape-Taste    |
| `onspace toggle()`   | Bei Leertaste       |
| `onkeydown arrow-up` | Bei Pfeiltaste hoch |

---

### Zusammenfassung

**States** definieren das Aussehen, **Funktionen** lösen den Wechsel aus.

#### System-States (automatisch)

| State       | Wann aktiv?         |
| ----------- | ------------------- |
| `hover:`    | Maus über Element   |
| `focus:`    | Tastatur-Fokus      |
| `active:`   | Während Klick       |
| `disabled:` | Element deaktiviert |

#### Custom States (manuell)

| Syntax           | Bedeutung                                   |
| ---------------- | ------------------------------------------- |
| `on:`            | Custom State definieren (Name frei wählbar) |
| `toggle()`       | State bei Klick wechseln                    |
| `exclusive()`    | Nur einer aktiv (Geschwister aus)           |
| `bind varName`   | Aktiven Wert in Variable speichern          |
| `Btn "Text", on` | Instanz startet im State                    |

#### Cross-Element

| Syntax          | Bedeutung                        |
| --------------- | -------------------------------- |
| `name MenuBtn`  | Element benennen                 |
| `MenuBtn.open:` | Reagieren wenn MenuBtn in "open" |

#### Events

| Event           | Beschreibung        |
| --------------- | ------------------- |
| `toggle()`      | Bei Klick (Default) |
| `onenter fn()`  | Bei Enter-Taste     |
| `onescape fn()` | Bei Escape-Taste    |

---

## Size-States (Responsive Komponenten)

_Element-basierte Responsive Layouts mit CSS Container Queries_

Size-States sind ein spezieller State-Typ, der auf die **Breite des Elements selbst** reagiert – nicht auf die Viewport-Breite wie Media Queries. Sie nutzen CSS Container Queries für native Browser-Unterstützung ohne JavaScript.

### Das Konzept

Während `hover:` oder `on:` auf Benutzer-Interaktionen reagieren, reagieren Size-States auf die **Größe des Elements**:

```mirror
Card: bg #1a1a1a, pad 16, rad 8
  compact:              // Element < 400px breit
    pad 8
    fs 12
  regular:              // Element 400-800px breit
    pad 16
  wide:                 // Element > 800px breit
    pad 24
    hor                 // Layout wechselt zu horizontal
```

**Warum Element-basiert?** Eine Card in einer schmalen Sidebar soll anders aussehen als dieselbe Card im Hauptbereich – unabhängig von der Bildschirmgröße.

### Built-in Size-States

Mirror bietet drei vordefinierte Size-States:

| Size-State | Bedingung         | Typische Verwendung      |
| ---------- | ----------------- | ------------------------ |
| `compact:` | Element < 400px   | Schmale Sidebars, Mobile |
| `regular:` | Element 400-800px | Standard-Layouts         |
| `wide:`    | Element > 800px   | Breite Hauptbereiche     |

```mirror
Frame bg #1a1a1a, pad 16
  compact:
    pad 8
    Text "Kompakt", col white
  regular:
    pad 16
    Text "Normal", col white
  wide:
    pad 24
    Text "Breit", col white
```

### Mit System-States kombinieren

Size-States und System-States (hover, focus) arbeiten unabhängig voneinander:

```mirror
Card: bg #1a1a1a, pad 16, rad 8, cursor pointer
  hover:
    bg #252525
  compact:
    pad 8
  wide:
    pad 24
    hor
```

Das Element reagiert auf Hover (interaktiv) **und** auf seine eigene Breite (responsiv) – beide Mechanismen greifen gleichzeitig.

### Custom Size-States mit Tokens

Du kannst eigene Size-States definieren oder die Default-Schwellenwerte überschreiben:

```mirror
// Eigenen Size-State definieren
tiny.max: 200

// Default-Schwellenwert überschreiben
compact.max: 300
wide.min: 1200

Frame bg #1a1a1a
  tiny:                 // Eigener Size-State: < 200px
    pad 4
    fs 10
  compact:              // Überschrieben: < 300px (statt 400px)
    pad 8
  wide:                 // Überschrieben: > 1200px (statt 800px)
    pad 32
```

| Token              | Beschreibung                  |
| ------------------ | ----------------------------- |
| `statename.max: N` | Maximale Breite für den State |
| `statename.min: N` | Minimale Breite für den State |

### Technische Umsetzung

Mirror generiert **CSS Container Queries** – keine JavaScript-Größenüberwachung:

```css
/* Generierter CSS-Code */
[data-mirror-id='el_1'] {
  container-type: inline-size;
}

@container (max-width: 400px) {
  [data-mirror-id='el_1'] {
    padding: 8px;
  }
}

@container (min-width: 800px) {
  [data-mirror-id='el_1'] {
    padding: 24px;
  }
}
```

**Vorteile:**

- Browser-native, kein JavaScript-Overhead
- Funktioniert mit verschachtelten Containern
- ~92%+ Browser-Unterstützung

### Praxisbeispiel: Responsive Card

```mirror
Card: bg #1a1a1a, rad 12, pad 20, gap 16
  compact:
    pad 12
    gap 8
    Title: fs 14
  wide:
    hor
    pad 24
    gap 24

  Title: col white, fs 18, weight 600
  Desc: col #888, fs 14

Card
  Title "Projekt Alpha"
  Desc "Eine responsive Card, die sich an ihren Container anpasst."
```

---

### Zusammenfassung

| Size-State | Schwellenwert     |
| ---------- | ----------------- |
| `compact:` | Element < 400px   |
| `regular:` | Element 400-800px |
| `wide:`    | Element > 800px   |

| Token              | Beschreibung                |
| ------------------ | --------------------------- |
| `tiny.max: 200`    | Neuen Size-State erstellen  |
| `compact.max: 300` | Schwellenwert überschreiben |

**Unterschied zu System-States:** Size-States reagieren auf **Element-Breite** (CSS Container Queries), System-States auf **Benutzer-Interaktion** (CSS Pseudo-Classes).

---

## Animationen

_Bewegung und Übergänge_

Im letzten Kapitel hast du States kennengelernt – wie Elemente ihr Aussehen ändern. Dieses Kapitel zeigt, wie diese Änderungen **animiert** werden: **Transitions** für sanfte Übergänge und **Presets** für typische Effekte (pulse, bounce, shake, spin).

### Transitions: Sanfte Übergänge

Ohne Transition springen Änderungen sofort. Mit Transition gleiten sie smooth. Du fügst einfach eine **Dauer** zum State hinzu:

```mirror
// Ohne Transition: springt
BtnHart: pad 12 24, rad 6, bg #333, col white, cursor pointer
  hover:
    bg #2271C1

// Mit Transition: gleitet
BtnSoft: pad 12 24, rad 6, bg #333, col white, cursor pointer
  hover 0.3s:
    bg #2271C1

Frame hor, gap 12
  BtnHart "Ohne"
  BtnSoft "Mit 0.3s"
```

**Was passiert hier?**

- `hover:` — Änderung springt sofort
- `hover 0.3s:` — Änderung gleitet über 300 Millisekunden
- Die Dauer macht den Unterschied. Alles andere bleibt gleich.

> **Hinweis:** **Faustregel für Dauer:** 100-200ms für Hover-Effekte, 200-300ms für State-Wechsel, 300-500ms für größere Übergänge. Im Zweifel lieber zu schnell als zu langsam.

### Easing: Wie sich Bewegung anfühlt

Easing bestimmt die Beschleunigungskurve. Du kannst es nach der Dauer angeben:

```mirror
Btn: pad 12 24, rad 6, bg #333, col white, cursor pointer

// Verschiedene Easings
Frame gap 8
  Btn "ease-out (Standard)"
    hover 0.3s ease-out:
      bg #2271C1
  Btn "ease-in"
    hover 0.3s ease-in:
      bg #2271C1
  Btn "ease-in-out"
    hover 0.3s ease-in-out:
      bg #2271C1
```

**Was passiert hier?**

- `ease-out` — startet schnell, endet langsam (gut für Erscheinen)
- `ease-in` — startet langsam, endet schnell (gut für Verschwinden)
- `ease-in-out` — beides kombiniert (gut für Hin-und-her)

| Easing        | Gefühl              | Typische Verwendung   |
| ------------- | ------------------- | --------------------- |
| `ease`        | Natürlich (Default) | Allgemein             |
| `ease-out`    | Langsames Ende      | Elemente erscheinen   |
| `ease-in`     | Langsamer Start     | Elemente verschwinden |
| `ease-in-out` | Beides              | Hin-und-her           |
| `linear`      | Gleichmäßig         | Spinner, Fortschritt  |

### Animation Presets

Für typische Bewegungen gibt es vordefinierte Animationen. Du schreibst einfach `anim` mit dem Namen:

```mirror
Frame hor, gap 12, wrap, bg #0a0a0a, pad 16, rad 8
  Frame w 60, h 60, bg #2271C1, rad 8, center, anim pulse
    Text "pulse", col white, fs 10
  Frame w 60, h 60, bg #10b981, rad 8, center, anim bounce
    Text "bounce", col white, fs 10
  Frame w 60, h 60, bg #f59e0b, rad 8, center, anim shake
    Text "shake", col white, fs 10
  Frame w 60, h 60, bg #ef4444, rad 8, center, anim spin
    Text "spin", col white, fs 10
```

**Was passiert hier?**

- `anim pulse` — Element pulsiert (gut für "neu" oder "Aufmerksamkeit")
- `anim bounce` — Element hüpft (gut für Bestätigung)
- `anim shake` — Element schüttelt sich (gut für Fehler)
- `anim spin` — Element dreht sich (gut für Loading)

| Preset   | Effekt    | Typische Verwendung |
| -------- | --------- | ------------------- |
| `pulse`  | Pulsieren | Hinweis, "neu"      |
| `bounce` | Hüpfen    | Bestätigung, Erfolg |
| `shake`  | Schütteln | Fehler, ungültig    |
| `spin`   | Drehen    | Loading             |

> **Hinweis:** **Weniger ist mehr:** Nicht alles animieren — nur was Bedeutung hat. `shake` = Fehler, `bounce` = Erfolg, `pulse` = Aufmerksamkeit. Nutze das bewusst.

### Animation bei State-Wechsel

Animationen sind besonders nützlich bei State-Wechseln. Du kannst sie direkt im State definieren:

```mirror
LikeBtn: pad 12 20, rad 6, bg #1a1a1a, col #888, cursor pointer, hor, ver-center, gap 8, toggle()
  Icon "heart", ic #666, is 18
  "Gefällt mir"
  hover 0.15s:
    bg #252525
  on:
    bg #dc2626
    col white
    anim bounce
    Icon "heart", ic white, is 18, fill
    "Gefällt mir!"

LikeBtn
```

Der Hover-Effekt (`hover 0.15s:`) gleitet sanft. Beim Aktivieren (`on:`) hüpft der Button mit `anim bounce` — sofortiges Feedback: "Dein Klick wurde registriert!"

### Transition auf Custom States

Nicht nur `hover:` kann animiert werden – auch eigene States wie `on:` oder `open:`:

```mirror
Toggle: Frame w 48, h 28, rad 99, bg #333, cursor pointer, toggle()
  // Der Knopf
  Frame w 24, h 24, rad 99, bg white, mar 2
  on 0.2s:
    bg #2271C1
    Frame mar 2 2 2 22

Toggle
```

`on 0.2s:` bedeutet: Beim Wechsel in den `on`-State über 200ms animieren. Der Knopf gleitet von links nach rechts.

### Sichtbarkeit animieren

Elemente können beim Ein-/Ausblenden animiert werden:

```mirror
Frame gap 12, bg #0a0a0a, pad 16, rad 8
  Button name Btn, "Hinweis zeigen", pad 10 20, bg #2271C1, col white, rad 6, toggle()
    open:
      "Hinweis verstecken"

  Frame bg #1a1a1a, pad 16, rad 8, hidden
    Btn.open 0.2s:
      visible
    Text "Dies ist ein Hinweis mit Animation.", col #ccc
```

`Btn.open 0.2s:` reagiert auf den State eines anderen Elements und animiert die Änderung über 200ms.

### Praktisch: Animiertes Menü

Ein klassisches Pattern — Menü mit sanfter Animation:

```mirror
Frame hor, gap 12, bg #0a0a0a, pad 16, rad 8
  Button name Btn, "Menü", pad 10 20, bg #333, col white, rad 6, toggle()
    open 0.15s:
      bg #2271C1

  Frame bg #1a1a1a, pad 12, rad 8, gap 4, w 160, hidden, opacity 0
    Btn.open 0.2s:
      visible
      opacity 1
    Text "Dashboard", col white, pad 8 12
    Text "Einstellungen", col white, pad 8 12
    Text "Logout", col #888, pad 8 12
```

Das Menü startet `hidden` und `opacity 0`. Bei `Btn.open` wird es sichtbar und blendet sanft ein.

### Praktisch: Loading Spinner

Ein einfacher Spinner mit `spin`:

```mirror
Frame hor, ver-center, gap 12, bg #1a1a1a, pad 16, rad 8
  Icon "loader-2", ic #2271C1, is 24, anim spin
  Text "Lädt...", col #888
```

`anim spin` auf dem Icon dreht es endlos. Das Lucide-Icon "loader-2" ist genau dafür designed.

### Praktisch: Erfolgs-Feedback

Visuelles Feedback bei erfolgreicher Aktion:

```mirror
SaveBtn: pad 12 24, rad 6, bg #333, col white, cursor pointer, hor, ver-center, gap 8, toggle()
  Icon "save", ic white, is 16
  "Speichern"
  hover 0.15s:
    bg #444
  saved:
    bg #10b981
    anim bounce
    Icon "check", ic white, is 16
    "Gespeichert!"

SaveBtn
```

Nach dem Klick wechselt der Button in den `saved`-State mit grünem Hintergrund und einem kurzen Bounce-Effekt.

---

### Zusammenfassung

#### Transitions

| Syntax                 | Bedeutung                  |
| ---------------------- | -------------------------- |
| `hover 0.2s:`          | State mit 200ms Übergang   |
| `hover 0.3s ease-out:` | Mit Easing-Funktion        |
| `on 0.2s:`             | Custom State mit Animation |

#### Animation Presets

| Preset        | Effekt                     |
| ------------- | -------------------------- |
| `anim pulse`  | Pulsieren (Aufmerksamkeit) |
| `anim bounce` | Hüpfen (Erfolg)            |
| `anim shake`  | Schütteln (Fehler)         |
| `anim spin`   | Drehen (Loading)           |

#### Easing

| Easing        | Gefühl              |
| ------------- | ------------------- |
| `ease`        | Natürlich (Default) |
| `ease-out`    | Langsames Ende      |
| `ease-in`     | Langsamer Start     |
| `ease-in-out` | Beides kombiniert   |

---

## Functions

_Eingebaute und eigene Funktionen_

In Kapitel 6 hast du `toggle()` und `exclusive()` kennengelernt – zwei eingebaute Funktionen für State-Wechsel. Mirror bietet viele weitere **eingebaute Funktionen** für typische UI-Patterns: Feedback, Navigation, Zähler, Scroll und mehr.

### Syntax: Funktionen als Properties

Funktionen werden direkt als Properties geschrieben – genau wie `bg` oder `pad`. Der Unterschied: Sie lösen Aktionen aus statt Styles zu setzen.

```mirror
// Kurzschreibweise – Klick ist Default
Btn: Button pad 10 20, rad 6, bg #333, col white, toggle()
  on:
    bg #2271C1

Btn "An/Aus"
```

Wenn du eine Funktion als Property schreibst, wird sie automatisch bei **Klick** ausgeführt. Das ist der häufigste Fall – deshalb ist Klick der Default.

| Syntax                              | Bedeutung                     |
| ----------------------------------- | ----------------------------- |
| `Button "X", toggle()`              | Funktion bei Klick (Kurzform) |
| `Button "X", show(Menu)`            | Element zeigen bei Klick      |
| `Button "X", toggle(), toast("OK")` | Mehrere Funktionen            |

> **Hinweis:** **Faustregel:** Kurzschreibweise für Klick-Events (99% der Fälle). Für andere Events wie Enter oder Escape gibt es Shorthands (`onenter`, `onescape`) – siehe States.

### Alle eingebauten Funktionen

Mirror hat eingebaute Funktionen für die häufigsten UI-Patterns. Du musst sie nicht importieren – sie sind einfach da:

| Kategorie                       | Funktion                           | Was sie tut                         |
| ------------------------------- | ---------------------------------- | ----------------------------------- |
| **State**                       | `toggle()`                         | State wechseln (an/aus oder cyclen) |
| `exclusive()`                   | Nur diesen aktivieren              |                                     |
| **Sichtbarkeit**                | `show(Element)`                    | Element sichtbar machen             |
| `hide(Element)`                 | Element verstecken                 |                                     |
| **Feedback**                    | `toast("Text")`                    | Toast-Benachrichtigung              |
| **Input**                       | `focus(Element)`                   | Fokus setzen                        |
| `clear(Element)`                | Eingabe löschen                    |                                     |
| `setError(Element, "msg")`      | Fehler-State setzen                |                                     |
| `clearError(Element)`           | Fehler-State entfernen             |                                     |
| **Zähler**                      | `increment(token)`                 | Token +1                            |
| `decrement(token)`              | Token -1                           |                                     |
| `set(token, value)`             | Token auf Wert setzen              |                                     |
| `reset(token)`                  | Auf Initialwert zurücksetzen       |                                     |
| **Scroll**                      | `scrollTo(Element)`                | Zu Element scrollen                 |
| `scrollToTop()`                 | Zum Seitenanfang                   |                                     |
| `scrollToBottom()`              | Zum Seitenende                     |                                     |
| **Clipboard**                   | `copy("Text")`                     | In Zwischenablage kopieren          |
| **Navigation**                  | `navigate(View)`                   | Zu View wechseln                    |
| `back()`                        | Browser zurück                     |                                     |
| `forward()`                     | Browser vorwärts                   |                                     |
| `openUrl("...")`                | URL öffnen (neuer Tab)             |                                     |
| **CRUD**                        | `add(collection)`                  | Eintrag zur Sammlung hinzufügen     |
| `add(collection, field: value)` | Mit Initialwerten hinzufügen       |                                     |
| `remove(item)`                  | Eintrag entfernen (im `each` Loop) |                                     |

### Feedback: toast()

Toast-Benachrichtigungen erscheinen kurz und verschwinden automatisch – perfekt für Bestätigungen ohne Modal:

```mirror
Frame hor, gap 8, wrap, bg #0a0a0a, pad 16, rad 8
  Button "Info", pad 10 20, bg #333, col white, rad 6, toast("Das ist eine Info")
  Button "Erfolg", pad 10 20, bg #10b981, col white, rad 6, toast("Gespeichert!", "success")
  Button "Fehler", pad 10 20, bg #ef4444, col white, rad 6, toast("Fehler aufgetreten", "error")
  Button "Warnung", pad 10 20, bg #f59e0b, col black, rad 6, toast("Achtung!", "warning")
```

| Syntax                         | Beschreibung                          |
| ------------------------------ | ------------------------------------- |
| `toast("Text")`                | Standard-Toast (info)                 |
| `toast("Text", "success")`     | Grüner Erfolgs-Toast                  |
| `toast("Text", "error")`       | Roter Fehler-Toast                    |
| `toast("Text", "warning")`     | Gelber Warn-Toast                     |
| `toast("Text", "info", "top")` | Position: top, bottom, top-left, etc. |

### Input: focus(), clear(), setError()

Funktionen zur Steuerung von Eingabefeldern – Fokus setzen, Werte löschen, Validierung anzeigen:

```mirror
Frame gap 12, bg #0a0a0a, pad 16, rad 8
  Frame gap 8
    Input name EmailInput, placeholder "E-Mail eingeben...", bg #1a1a1a, col white, pad 12, rad 6, w 260, bor 1, boc #333
      invalid:
        boc #ef4444
    Frame hor, gap 8
      Button "Fokus", pad 8 16, bg #333, col white, rad 6, focus(EmailInput)
      Button "Löschen", pad 8 16, bg #333, col white, rad 6, clear(EmailInput)
      Button "Fehler", pad 8 16, bg #ef4444, col white, rad 6, setError(EmailInput, "Ungültige E-Mail")
      Button "OK", pad 8 16, bg #10b981, col white, rad 6, clearError(EmailInput)
```

| Funktion                   | Beschreibung                    |
| -------------------------- | ------------------------------- |
| `focus(Element)`           | Fokus auf Element setzen        |
| `blur(Element)`            | Fokus entfernen                 |
| `clear(Element)`           | Eingabewert löschen             |
| `selectText(Element)`      | Text im Feld markieren          |
| `setError(Element, "msg")` | Fehler-State + Nachricht setzen |
| `clearError(Element)`      | Fehler-State entfernen          |

> **Hinweis:** **Hinweis:** `setError()` aktiviert den `invalid:` State und zeigt die Fehlermeldung an. Mit `clearError()` wird beides zurückgesetzt.

### Zähler: increment() und decrement()

Perfekt für Warenkorb, Likes, oder jede Art von Zähler:

```mirror
count: 0

Frame hor, gap 12, ver-center, bg #1a1a1a, pad 16, rad 8
  Button "-", pad 8 16, bg #333, col white, rad 6, fs 18, decrement(count)
  Text "$count", col white, fs 24, weight 600, w 60, center
  Button "+", pad 8 16, bg #2271C1, col white, rad 6, fs 18, increment(count)
```

| Funktion           | Beschreibung                     |
| ------------------ | -------------------------------- |
| `increment(token)` | Token-Wert um 1 erhöhen          |
| `decrement(token)` | Token-Wert um 1 verringern       |
| `set(token, 5)`    | Token auf bestimmten Wert setzen |
| `reset(token)`     | Auf Initialwert zurücksetzen     |

> **Hinweis:** **Hinweis:** Die Funktionen arbeiten mit Tokens (Variablen). Definiere den Token mit Startwert (`count: 0`) und verwende ihn mit `$count`.

### Praktisch: Warenkorb-Zähler

Ein typisches E-Commerce Pattern – Artikelmenge mit Plus/Minus Buttons:

```mirror
qty: 1
price: 29

Frame bg #1a1a1a, pad 20, rad 12, gap 16, w 280
  Frame hor, gap 16, ver-center
    Frame w 60, h 60, bg #252525, rad 8, center
      Icon "shopping-bag", ic #888, is 24
    Frame gap 4
      Text "Premium T-Shirt", col white, fs 16, weight 500
      Text "€$price pro Stück", col #888, fs 13

  Frame hor, spread, ver-center, bg #0a0a0a, pad 12, rad 8
    Frame hor, gap 8, ver-center
      Button "-", pad 6 12, bg #333, col white, rad 4, decrement(qty)
      Text "$qty", col white, fs 16, weight 600, w 32, center
      Button "+", pad 6 12, bg #333, col white, rad 4, increment(qty)
    Text "€" + ($price * $qty), col #10b981, fs 18, weight 600
```

### Clipboard: copy()

Text in die Zwischenablage kopieren – nützlich für Code-Snippets, Links, oder Referenz-Codes:

```mirror
code: "SUMMER2024"

Frame bg #1a1a1a, pad 16, rad 8, gap 12
  Text "Dein Rabattcode:", col #888, fs 13
  Frame hor, gap 8, ver-center
    Frame pad 12 16, bg #0a0a0a, rad 6, bor 1, boc #333
      Text "$code", col #10b981, fs 16, weight 600, font mono
    Button "Kopieren", pad 10 16, bg #2271C1, col white, rad 6, copy("$code"), toast("Code kopiert!", "success")
      copied:
        bg #10b981
        "Kopiert!"
```

`copy()` kann mit einem `copied:` State kombiniert werden – der Button zeigt dann kurz "Kopiert!" an.

### show() und hide(): Sichtbarkeit

Mit `show(Element)` und `hide(Element)` machst du Elemente sichtbar oder versteckst sie:

```mirror
Frame gap 12, bg #0a0a0a, pad 16, rad 8
  Button "Info anzeigen", pad 10 20, bg #2271C1, col white, rad 6, show(InfoBox)

  Frame name InfoBox, hidden, bg #1a1a1a, pad 16, rad 8, gap 8
    Text "Hier sind weitere Informationen.", col #ccc, fs 14
    Button "Schließen", pad 8 16, bg #333, col white, rad 4, hide(InfoBox)
```

- `name InfoBox` gibt dem Element einen Namen
- `hidden` macht das Element initial unsichtbar
- `show(InfoBox)` macht es sichtbar
- `hide(InfoBox)` versteckt es wieder

> **Hinweis:** **Wichtig:** Das Ziel-Element braucht einen `name`. Ohne Namen kann die Funktion das Element nicht finden.

### Navigation: navigate(), back(), openUrl()

Funktionen für Navigation zwischen Views und Browser-History:

```mirror
Frame gap 12, bg #0a0a0a, pad 16, rad 8
  Frame hor, gap 8
    Button "← Zurück", pad 10 20, bg #333, col white, rad 6, back()
    Button "Vorwärts →", pad 10 20, bg #333, col white, rad 6, forward()

  Divider bg #333, mar 8 0

  Button "Mirror Website öffnen", pad 10 20, bg #2271C1, col white, rad 6, hor, gap 8
    Icon "external-link", ic white, is 16
    openUrl("https://mirror-lang.dev")
```

| Funktion             | Beschreibung                          |
| -------------------- | ------------------------------------- |
| `navigate(ViewName)` | Zu einer View wechseln (siehe Seiten) |
| `back()`             | Browser-History zurück                |
| `forward()`          | Browser-History vorwärts              |
| `openUrl("...")`     | URL in neuem Tab öffnen               |

### Scroll: scrollTo(), scrollToTop()

Smooth-Scroll zu Elementen oder Seitenposition:

```mirror
Frame gap 8, bg #0a0a0a, pad 16, rad 8, h 200, scroll
  Button "Zum Ende scrollen", pad 10 20, bg #2271C1, col white, rad 6, scrollToBottom()

  Frame gap 8, pad 40 0
    Text "Abschnitt 1", col white, fs 16
    Text "Lorem ipsum dolor sit amet...", col #888, fs 13
    Text "Abschnitt 2", col white, fs 16
    Text "Consectetur adipiscing elit...", col #888, fs 13
    Text "Abschnitt 3", col white, fs 16
    Text "Sed do eiusmod tempor...", col #888, fs 13

  Button "Nach oben", pad 10 20, bg #333, col white, rad 6, scrollToTop()
```

| Funktion            | Beschreibung                  |
| ------------------- | ----------------------------- |
| `scrollTo(Element)` | Zu benanntem Element scrollen |
| `scrollToTop()`     | Zum Anfang scrollen           |
| `scrollToBottom()`  | Zum Ende scrollen             |

### CRUD: Sammlungen bearbeiten

Für dynamische Listen – Items hinzufügen, bearbeiten und entfernen. Perfekt für Todo-Listen, Warenkörbe oder jede Art von bearbeitbarer Sammlung:

```mirror
todos:
  task1:
    text: "Erste Aufgabe"
    done: false

Frame gap 12, bg #0a0a0a, pad 16, rad 8
  // Neues Item hinzufügen
  Button "Neue Aufgabe", pad 10 20, bg #2271C1, col white, rad 6, add(todos, text: "Neue Aufgabe", done: false)

  // Liste mit Bearbeiten und Löschen
  each todo in $todos
    Frame hor, gap 12, ver-center, bg #1a1a1a, pad 12, rad 6
      Checkbox "", checked todo.done
      Text todo.text, col white, editable, grow
      Button "×", pad 6 12, bg #ef4444, col white, rad 4, remove(todo)
```

**Was passiert hier?**

- `add(todos, text: "...", done: false)` – fügt einen neuen Eintrag mit Initialwerten hinzu
- `editable` – macht den Text direkt im UI bearbeitbar (Doppelklick zum Editieren)
- `remove(todo)` – entfernt den Eintrag aus der Sammlung

| Funktion                             | Beschreibung                              |
| ------------------------------------ | ----------------------------------------- |
| `add(collection)`                    | Leeren Eintrag zur Sammlung hinzufügen    |
| `add(collection, field: value, ...)` | Eintrag mit Initialwerten hinzufügen      |
| `remove(item)`                       | Eintrag entfernen (innerhalb `each` Loop) |

| Property   | Beschreibung                   |
| ---------- | ------------------------------ |
| `editable` | Text inline bearbeitbar machen |

> **Hinweis:** `remove(item)` funktioniert nur innerhalb eines `each` Loops – dort ist `item` die Loop-Variable, die auf den aktuellen Eintrag verweist.

#### Praktisch: Einkaufsliste

```mirror
items:
  milk:
    name: "Milch"
  bread:
    name: "Brot"

Frame gap 12, bg #1a1a1a, pad 20, rad 12, w 280
  Text "Einkaufsliste", col white, fs 18, weight 600

  each item in $items
    Frame hor, gap 12, ver-center, pad 8, bg #252525, rad 6
      Text item.name, col white, editable, grow
      Button "×", pad 4 10, bg transparent, col #888, rad 4, remove(item)
        hover:
          col #ef4444

  Button "Hinzufügen", pad 10 16, bg #333, col white, rad 6, w full, add(items, name: "Neuer Artikel")
```

### Funktionen kombinieren

Du kannst mehrere Funktionen bei einem Klick ausführen:

```mirror
count: 0

Frame gap 8, bg #0a0a0a, pad 16, rad 8
  Button "Like", name LikeBtn, pad 12 20, bg #333, col white, rad 6, hor, gap 8, toggle(), increment(count), toast("Gefällt dir!", "success")
    Icon "heart", ic #888, is 18
    Text "$count"
    on:
      bg #ef4444
      Icon "heart", ic white, is 18, fill
```

Der Button hat **drei** Funktionen: `toggle()` wechselt den State, `increment(count)` erhöht den Zähler, und `toast()` zeigt eine Bestätigung.

> **Hinweis:** **Reihenfolge:** Die Funktionen werden in der Reihenfolge ausgeführt, wie du sie schreibst.

### Praktisch: Formular mit Feedback

Ein komplettes Beispiel das mehrere Funktionen kombiniert:

```mirror
Frame bg #1a1a1a, pad 20, rad 12, gap 16, w 300
  Text "Newsletter", col white, fs 18, weight 600

  Frame gap 12
    Input name EmailInput, placeholder "E-Mail Adresse", bg #0a0a0a, col white, pad 12, rad 6, w full
    Button "Anmelden", pad 12 20, bg #2271C1, col white, rad 6, w full, toast("Erfolgreich angemeldet!", "success")
      hover:
        bg #2271C1

  Text "Spam-frei. Jederzeit abmeldbar.", col #666, fs 11, center
```

### Eigene Funktionen

Die eingebauten Funktionen decken die häufigsten Fälle ab. Für komplexere Logik (API-Calls, Validierung) schreibst du eigene Funktionen in JavaScript.

Das Prinzip: **Du greifst auf Elemente zu und änderst ihre Eigenschaften.**

#### Elemente ansprechen

Jedes Element mit einem `name` kannst du in einer Funktion ansprechen:

```mirror
// Im Mirror-UI
Input name EmailInput, placeholder "E-Mail"
Button "Absenden", absenden()

// In der Funktion (JavaScript)
function absenden() {
  const wert = api.EmailInput.value
  console.log(wert)
}
```

#### Element-Eigenschaften

| Eigenschaft | Lesen               | Schreiben           |
| ----------- | ------------------- | ------------------- |
| `.state`    | Aktueller State     | State wechseln      |
| `.visible`  | Ist sichtbar?       | Sichtbarkeit ändern |
| `.value`    | Eingabewert (Input) | Wert setzen         |
| `.content`  | Textinhalt          | Text ändern         |

**Zusammenspiel:** Du als Designer bestimmst _wie_ jeder State aussieht. Die Funktion bestimmt _wann_ welcher State aktiv wird. So könnt ihr unabhängig arbeiten.

> **Hinweis:** **Zusammenspiel:** Du als Designer bestimmst _wie_ jeder State aussieht. Die Funktion bestimmt _wann_ welcher State aktiv wird. So könnt ihr unabhängig arbeiten.

---

### Zusammenfassung

#### State & Sichtbarkeit

| `toggle()`    | State wechseln        |
| ------------- | --------------------- |
| `exclusive()` | Nur diesen aktivieren |
| `show(Name)`  | Element zeigen        |
| `hide(Name)`  | Element verstecken    |

#### Feedback

| `toast("Text")`            | Toast-Benachrichtigung                  |
| -------------------------- | --------------------------------------- |
| `toast("Text", "success")` | Mit Type: info, success, error, warning |

#### Input Control

| `focus(Element)`           | Fokus setzen     |
| -------------------------- | ---------------- |
| `blur(Element)`            | Fokus entfernen  |
| `clear(Element)`           | Eingabe löschen  |
| `selectText(Element)`      | Text markieren   |
| `setError(Element, "msg")` | Fehler setzen    |
| `clearError(Element)`      | Fehler entfernen |

#### Zähler & Werte

| `increment(token)`  | Token +1     |
| ------------------- | ------------ |
| `decrement(token)`  | Token -1     |
| `set(token, value)` | Wert setzen  |
| `reset(token)`      | Zurücksetzen |

#### Clipboard & Scroll

| `copy("Text")`      | In Zwischenablage   |
| ------------------- | ------------------- |
| `scrollTo(Element)` | Zu Element scrollen |
| `scrollToTop()`     | Zum Anfang          |
| `scrollToBottom()`  | Zum Ende            |

#### Navigation

| `navigate(View)` | Zu View wechseln |
| ---------------- | ---------------- |
| `back()`         | Browser zurück   |
| `forward()`      | Browser vorwärts |
| `openUrl("...")` | URL öffnen       |

#### CRUD (Sammlungen)

| `add(collection)`               | Eintrag hinzufügen          |
| ------------------------------- | --------------------------- |
| `add(collection, field: value)` | Mit Initialwerten           |
| `remove(item)`                  | Eintrag entfernen (im Loop) |
| `editable`                      | Text inline bearbeitbar     |

---

## Daten

_Echte Daten statt Platzhalter_

Bisher hast du Text direkt in Komponenten geschrieben: `Text "Max Mustermann"`. Das funktioniert – aber was, wenn derselbe Name an 10 Stellen steht und du ihn ändern willst? Oder wenn du den Prototyp mit verschiedenen Testdaten zeigen möchtest?

### Das Problem: Hardcoded Text

Stell dir vor, du baust eine Begrüßung. Der Name steht direkt im Code:

```mirror
Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "Willkommen, Max!", col white, fs 18
  Text "Du hast 3 neue Nachrichten.", col #888
  Text "Max's Profil", col #2563eb
```

**Das Problem:** "Max" steht dreimal im Code. Willst du den Namen ändern, musst du jede Stelle finden. Bei einem echten Prototyp mit Dutzenden Screens wird das schnell unübersichtlich.

```mirror
name: "Max"
messageCount: 3

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "Willkommen, $name!", col white, fs 18
  Text "Du hast $messageCount neue Nachrichten.", col #888
  Text "$name's Profil", col #2563eb
```

### Variablen definieren

Eine Variable wird mit Namen und Wert definiert. Bei der Verwendung steht `$` davor:

```mirror
name: "Max"
count: 42

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "Name: $name", col white
  Text "Count: $count", col #888
```

**Die Regel:** Definition ohne `$`, Verwendung mit `$` in Anführungszeichen.

### In Text verwenden

Variablen werden in Anführungszeichen als Text angezeigt. Mit String-Interpolation kannst du Variablen direkt in Text einbetten:

```mirror
firstName: "Max"
lastName: "Mustermann"

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "$firstName", col white, fs 18
  Text "$firstName $lastName", col #888
  Text "Hallo, $firstName!", col #10b981
```

### Arithmetik

Für Berechnungen verwendest du Expressions mit `+`, `-`, `*`, `/`:

```mirror
price: 29
quantity: 3

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "Preis: $$price", col white
  Text "Menge: $quantity", col #888
  Text "Total: $" + ($price * $quantity), col #10b981, weight 600
```

> **Hinweis:** **Hinweis:** Für ein Dollarzeichen im Text schreibe `$$`. Für Berechnungen brauchst du weiterhin den `+` Operator.

### Einfache Listen

Für einfache Listen ohne Attribute – nur Namen auflisten:

```mirror
colors:
  red
  green
  blue

each color in $colors
  Frame hor, gap 12, ver-center, bg #1a1a1a, pad 12, rad 6, mar 0 0 4 0
    Frame w 20, h 20, rad 4, bg $color
    Text "$color", col white
```

**Keine Doppelpunkte nötig** – der Eintrag _ist_ der Wert. Sauberer als JSON-Arrays und konsistent mit dem Rest von Mirror.

### Datenobjekte: Zusammengehörige Daten gruppieren

Manchmal gehören mehrere Werte zusammen – Name, E-Mail und Status eines Benutzers zum Beispiel. Statt drei einzelne Variablen zu definieren, gruppierst du sie in einem **Datenobjekt**:

```mirror
// OHNE Datenobjekt: drei einzelne Variablen
userName: "Max Mustermann"
userEmail: "max@example.com"
userActive: true

// MIT Datenobjekt: zusammengehörige Daten gruppiert
user:
  name: "Max Mustermann"
  email: "max@example.com"
  active: true

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "$user.name", col white, weight 500
  Text "$user.email", col #888
  Text $user.active ? "Aktiv" : "Inaktiv", col #10b981
```

**Warum Datenobjekte?**

- **Struktur:** Zusammengehörige Daten sind klar erkennbar
- **Dot-Notation:** Zugriff mit `$user.name` statt `$userName`
- **Wiederverwendbar:** Das ganze Objekt kann übergeben oder iteriert werden

#### Attribut-Typen

Datenobjekte unterstützen Strings, Zahlen und Booleans:

| Typ     | Beispiel       |
| ------- | -------------- |
| String  | `name: "Max"`  |
| Zahl    | `age: 25`      |
| Boolean | `active: true` |

### Sammlungen: Mehrere Einträge

Ein einzelnes Datenobjekt ist gut für _einen_ Benutzer. Aber was wenn du eine **Liste von Benutzern** hast? Dafür gibt es Sammlungen – mehrere benannte Einträge unter einem gemeinsamen Namen:

```mirror
users:
  max:
    name: "Max"
    role: "Admin"
  anna:
    name: "Anna"
    role: "User"
  tom:
    name: "Tom"
    role: "User"

each user in $users
  Frame hor, gap 12, bg #1a1a1a, pad 12, rad 6, mar 0 0 4 0
    Text "$user.name", col white, weight 500
    Text "$user.role", col #888, fs 12
```

**Warum Sammlungen?**

- **Iteration:** Mit `each user in $users` über alle Einträge iterieren
- **Direktzugriff:** Einzelne Einträge mit `$users.max.name` adressieren
- **Eindeutige IDs:** Jeder Eintrag hat einen Namen (`max`, `anna`, `tom`)

### Verschachtelte Datenobjekte

Datenobjekte können beliebig tief verschachtelt werden:

```mirror
method:
  name: "Agile"
  steps:
    planning:
      title: "Sprint Planning"
      duration: "2h"
    standup:
      title: "Daily Standup"
      duration: "15min"
    retro:
      title: "Retrospektive"
      duration: "1h"

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "$method.name", col white, fs 18, weight 600
  Frame gap 4, mar 8 0 0 0
    each step in $method.steps
      Frame hor, gap 8
        Text "$step.title", col white
        Text "$step.duration", col #888
```

Jedes verschachtelte Objekt hat einen Namen und ist direkt adressierbar: `$method.steps.planning.title`

### Externe Daten: .data-Dateien

Für größere Datenmengen oder Wiederverwendung: Daten in `.data`-Dateien auslagern. **Die Syntax ist identisch** – nur in einer separaten Datei:

```mirror
// data/customers.data

max:
  name: Max Mustermann
  email: max@example.com
  plan: Pro

anna:
  name: Anna Schmidt
  email: anna@example.com
  plan: Basic
```

// data/customers.data max: name: Max Mustermann email: max@example.com plan: Pro anna: name: Anna Schmidt email: anna@example.com plan: Basic In Mirror mit `$dateiname.eintrag.attribut` zugreifen:

```mirror
Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "$customers.max.name", col white, weight 500
  Text "$customers.max.email", col #888
  Text "$customers.max.plan", col #2271C1
```

### Über Einträge iterieren

Mit `each` über alle Einträge einer `.data`-Datei:

```mirror
each customer in $customers
  Frame hor, spread, ver-center, bg #1a1a1a, pad 12, rad 6, mar 0 0 4 0
    Frame gap 2
      Text "$customer.name", col white, weight 500
      Text "$customer.email", col #888, fs 12
    Text "$customer.plan", col #2271C1, fs 12
```

### Relationen

Daten können auf andere Daten verweisen. Eine Referenz ist ein Pfad mit `$`:

```mirror
// data/users.data

toni:
  name: Toni Steimle
  role: Lead

anna:
  name: Anna Schmidt
  role: Design
```

// data/users.data toni: name: Toni Steimle role: Lead anna: name: Anna Schmidt role: Design // data/tasks.data task1: title: Design Review assignee: $users.toni task2: title: Wireframes assignee: $users.anna **Zugriff durch die Relation:**

```mirror
// data/tasks.data

task1:
  title: Design Review
  assignee: $users.toni

task2:
  title: Wireframes
  assignee: $users.anna
```

```mirror
Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "$tasks.task1.title", col white, weight 500
  Text "Zuständig: $tasks.task1.assignee.name", col #888
```

Frame gap 8, bg #1a1a1a, pad 16, rad 8 Text "$tasks.task1.title", col white, weight 500 Text "Zuständig: $tasks.task1.assignee.name", col #888 `$tasks.task1.assignee`ist der User`$users.toni`. Mit `.name` greifst du auf dessen Attribute zu.

#### N-zu-N Relationen

Für viele-zu-viele Beziehungen: Arrays von Referenzen:

```mirror
// data/projects.data

website:
  name: Website Relaunch
  members: $users.toni, $users.anna
  lead: $users.toni
```

```mirror
Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "$projects.website.name", col white, weight 500
  Text "Lead: $projects.website.lead.name", col #888
  Frame gap 4, mar 8 0 0 0
    Text "Team:", col #666, fs 12
    each member in $projects.website.members
      Text "• $member.name", col #888, fs 13
```

### Praktisch: Produktliste

```mirror
products:
  basic:
    name: "Basic"
    price: 9
    features: "5 Users"
  pro:
    name: "Pro"
    price: 29
    features: "Unlimited"
  enterprise:
    name: "Enterprise"
    price: 99
    features: "Custom"

Frame hor, gap 12, bg #0a0a0a, pad 16, rad 8
  each product in $products
    Frame bg #1a1a1a, pad 20, rad 12, gap 8, w 140, center
      Text "$product.name", col white, fs 16, weight 600
      Text "$$product.price", col #2271C1, fs 24, weight 700
      Text "$product.features", col #888, fs 12
```

### Bedingte Anzeige: if / else

Manchmal soll ein Element nur unter bestimmten Bedingungen angezeigt werden. Mit `if` zeigst du Elemente nur an, wenn eine Bedingung erfüllt ist:

```mirror
loggedIn: true

if loggedIn
  Text "Willkommen zurück!", col white
```

#### if / else

Mit `else` definierst du eine Alternative:

```mirror
loggedIn: false

if loggedIn
  Text "Willkommen zurück!", col white
else
  Button "Anmelden", bg #2271C1, col white, pad 10 20, rad 6
```

#### Mehrere Elemente

Ein `if`-Block kann mehrere Kinder haben:

```mirror
showDetails: true

Frame bg #1a1a1a, pad 16, rad 8, gap 8
  Text "Produkt", col white, fs 16, weight 500
  if showDetails
    Text "Beschreibung des Produkts", col #888, fs 13
    Text "Preis: €29", col #10b981, fs 14
    Button "Kaufen", bg #2271C1, col white, pad 8 16, rad 4
```

### Komplexe Bedingungen

Du kannst JavaScript-Ausdrücke verwenden:

#### Logische Operatoren

```mirror
isAdmin: true
hasPermission: true

if isAdmin && hasPermission
  Frame bg #1a1a1a, pad 16, rad 8
    Text "Admin Panel", col white, fs 16, weight 500
    Text "Voller Zugriff", col #10b981, fs 12
```

#### Vergleiche

```mirror
count: 5

Frame bg #1a1a1a, pad 16, rad 8, gap 8
  if count > 0
    Text "$count Artikel im Warenkorb", col white
  else
    Text "Warenkorb ist leer", col #888
```

#### Negation

```mirror
disabled: false

if !disabled
  Button "Absenden", bg #2271C1, col white, pad 10 20, rad 6
```

#### Kombiniert

```mirror
user:
  role: "admin"
feature:
  enabled: true

if user.role === "admin" && feature.enabled
  Text "Feature aktiv", col #10b981
```

### Verschachtelte Bedingungen

`if`-Blöcke können verschachtelt werden:

```mirror
hasData: true
isLoading: false

if hasData
  if isLoading
    Frame hor, gap 8, center
      Icon "loader", ic #888, is 16
      Text "Lädt...", col #888
  else
    Text "Daten geladen!", col #10b981
else
  Text "Keine Daten", col #888
```

### if mit each kombinieren

Conditionals und Loops arbeiten zusammen:

```mirror
tasks:
  task1:
    title: "Task 1"
    done: true
  task2:
    title: "Task 2"
    done: false
  task3:
    title: "Task 3"
    done: true

Frame bg #1a1a1a, pad 16, rad 8, gap 8
  each task in $tasks
    Frame hor, gap 8, ver-center, pad 8, bg #252525, rad 4
      if $task.done
        Icon "check", ic #10b981, is 16
      else
        Icon "circle", ic #666, is 16
      Text "$task.title", col white, fs 13
```

### Inline Conditionals (Ternary)

Für einzelne Property-Werte gibt es die Kurzschreibweise mit `?` und `:`:

```mirror
active: true

Button "Status", bg active ? #2271C1 : #333, col white, pad 10 20, rad 6
```

Das entspricht: "Wenn `active` wahr ist, nimm `#2271C1`, sonst `#333`."

#### Weitere Beispiele

```mirror
visible: true
done: false
count: 3

Frame gap 12, bg #0a0a0a, pad 16, rad 8
  // Opacity basierend auf Sichtbarkeit
  Frame w 100, h 50, bg #2271C1, rad 6, opacity visible ? 1 : 0.3

  // Icon basierend auf Status
  Frame hor, gap 8, ver-center, bg #1a1a1a, pad 12, rad 6
    Icon done ? "check" : "circle", ic done ? #10b981 : #666, is 18
    Text "Aufgabe", col white

  // Text basierend auf Anzahl
  Text count > 0 ? "$count Einträge" : "Keine Einträge", col #888
```

#### Mit Variablen

```mirror
theme: "dark"
primary.bg: #2271C1
muted.bg: #333

Button "Themed", bg theme === "dark" ? $primary : $muted, col white, pad 10 20, rad 6
```

### Block vs. Inline

| Syntax              | Verwendung                     |
| ------------------- | ------------------------------ |
| `if` / `else` Block | Ganze Elemente ein-/ausblenden |
| `condition ? a : b` | Einzelne Property-Werte        |

**Faustregel:**

- Soll ein Element komplett erscheinen/verschwinden? → `if` Block
- Soll nur eine Farbe, Größe, Icon wechseln? → Ternary

### Praktisch: Leerer Zustand

Ein typisches Pattern - zeige Inhalt oder "Empty State":

```mirror
hasItems: false

Frame bg #1a1a1a, pad 20, rad 12, gap 12, w 280, center
  if hasItems
    Text "Hier wären Einträge", col white
  else
    Icon "inbox", ic #444, is 48
    Text "Keine Einträge", col #666, fs 14
    Text "Füge deinen ersten Eintrag hinzu", col #444, fs 12
```

Ändere `hasItems: true` um den Inhalt zu sehen.

### Praktisch: Ladeindikator

```mirror
loading: true
data: "Inhalt geladen"

Frame bg #1a1a1a, pad 20, rad 12, w 200, center
  if loading
    Frame hor, gap 8, ver-center
      Icon "loader", ic #888, is 18
      Text "Lädt...", col #888
  else
    Text "$data", col white
```

### Praktisch: Benutzer-Status

```mirror
user:
  loggedIn: true
  name: "Max"
  avatar: ""

Frame hor, gap 12, ver-center, bg #1a1a1a, pad 12, rad 8
  if $user.loggedIn
    Frame hor, gap 10, ver-center
      Frame w 36, h 36, rad 99, bg #2271C1, center
        Text $user.avatar ? "$user.avatar" : "$user.name[0]", col white, fs 14
      Frame gap 2
        Text "$user.name", col white, fs 14, weight 500
        Text "Online", col #10b981, fs 11
  else
    Button "Anmelden", bg #2271C1, col white, pad 8 16, rad 6
```

---

### Zusammenfassung

#### Variablen & Daten

| Konzept              | Syntax                          |
| -------------------- | ------------------------------- |
| Variable definieren  | `name: "Wert"`                  |
| In Text verwenden    | `Text "$name"`                  |
| String-Interpolation | `Text "Hallo $name!"`           |
| Arithmetik           | `$a * $b`                       |
| Datenobjekt          | `users:` + eingerückte Einträge |
| Eintrag adressieren  | `Text "$users.max.name"`        |
| Iteration            | `each user in $users`           |
| Loop-Variable        | `Text "$user.name"`             |
| Relation             | `assignee: $users.toni`         |

#### Bedingungen

| Syntax          | Beispiel                     |
| --------------- | ---------------------------- | ------ | ------------------------- |
| `if bedingung`  | `if loggedIn`                |
| `if ... else`   | `if count > 0 ... else`      |
| `&&`, `         |                              | `, `!` | `if isAdmin && hasAccess` |
| `===`, `>`, `<` | `if status === "active"`     |
| Ternary         | `bg active ? #2271C1 : #333` |

**Variablen:** Definition mit `name:`, Verwendung in Text mit `"$name"`.

**Bedingungen:** Block Conditionals für Elemente, Inline Conditionals für Properties.

---

## Seiten & Navigation

_Content referenzieren mit show_

Mit `show` referenzierst du Content – aus der gleichen Datei oder aus anderen Dateien. Das ist die Basis für Apps mit mehreren Seiten.

### Das Konzept: show

`show` sagt: "Zeige diesen Content an". Der Content kann aus drei Quellen kommen:

| Syntax          | Bedeutung                         | Beispiel                                                           |
| --------------- | --------------------------------- | ------------------------------------------------------------------ |
| `show X`        | Zeige lokales Element X           | `show HomeView` → Element mit `name HomeView`                      |
| `show X`        | Oder: Lade Datei X.mirror         | `show Home` → `Home.mirror`                                        |
| `show X from Y` | Lade Element X aus Datei Y.mirror | `show Settings from Pages` → Element "Settings" aus `Pages.mirror` |

**Priorität:** Wenn ein lokales Element mit dem Namen existiert, wird es verwendet. Sonst wird eine Datei geladen.

### Inline vs. show

Tabs ohne `show` haben ihren Content als Kinder:

```mirror
Tabs defaultValue "Home"
  Tab "Home"
    Text "Das ist der Home-Content"
  Tab "Settings"
    Text "Das sind die Einstellungen"
```

Mit `show` kommt der Content von woanders:

```mirror
Tabs defaultValue "Home"
  Tab "Home", show HomeView
  Tab "Settings", show SettingsView

// Lokale Views in der gleichen Datei
HomeView: Frame name HomeView, pad 20
  Text "Das ist der Home-Content"

SettingsView: Frame name SettingsView, pad 20
  Text "Das sind die Einstellungen"
```

### Content aus Dateien: show X

Wenn kein lokales Element existiert, lädt `show X` die Datei `X.mirror`:

```mirror
// app.mirror
Tabs defaultValue "Home"
  Tab "Home", show Home        // → lädt Home.mirror
  Tab "Settings", show Settings  // → lädt Settings.mirror
```

// app.mirror Tabs defaultValue "Home" Tab "Home", show Home // → lädt Home.mirror Tab "Settings", show Settings // → lädt Settings.mirror // Home.mirror Frame pad 20, gap 16 Text "Willkommen", fs 24, weight bold Text "Das ist die Startseite." // Settings.mirror Frame pad 20, gap 16 Text "Einstellungen", fs 24, weight bold Switch "Dark Mode" Switch "Benachrichtigungen" Die Dateistruktur:

```mirror
// Home.mirror
Frame pad 20, gap 16
  Text "Willkommen", fs 24, weight bold
  Text "Das ist die Startseite."
```

```mirror
// Settings.mirror
Frame pad 20, gap 16
  Text "Einstellungen", fs 24, weight bold
  Switch "Dark Mode"
  Switch "Benachrichtigungen"
```

```mirror
app.mirror       ← Navigation
Home.mirror      ← Home-Content
Settings.mirror  ← Settings-Content
```

### Element aus Datei: show X from Y

Mit `show X from Y` lädst du ein spezifisches Element aus einer Datei. Das ist nützlich wenn eine Datei mehrere Views enthält:

```mirror
// Pages.mirror – enthält mehrere Views
HomeView: Frame name HomeView, pad 20, gap 16
  Text "Home", fs 24, weight bold
  Text "Willkommen auf der Startseite"

SettingsView: Frame name SettingsView, pad 20, gap 16
  Text "Einstellungen", fs 24, weight bold
  Switch "Dark Mode"

ProfileView: Frame name ProfileView, pad 20, gap 16
  Text "Profil", fs 24, weight bold
  Input "Name"
```

// Pages.mirror – enthält mehrere Views HomeView: Frame name HomeView, pad 20, gap 16 Text "Home", fs 24, weight bold Text "Willkommen auf der Startseite" SettingsView: Frame name SettingsView, pad 20, gap 16 Text "Einstellungen", fs 24, weight bold Switch "Dark Mode" ProfileView: Frame name ProfileView, pad 20, gap 16 Text "Profil", fs 24, weight bold Input "Name" // app.mirror – referenziert Views aus Pages Tabs defaultValue "Home" Tab "Home", show HomeView from Pages Tab "Settings", show SettingsView from Pages Tab "Profile", show ProfileView from Pages **Vorteil:** Zusammengehörige Views bleiben in einer Datei. Du brauchst nicht für jeden Tab eine eigene Datei.

```mirror
// app.mirror – referenziert Views aus Pages
Tabs defaultValue "Home"
  Tab "Home", show HomeView from Pages
  Tab "Settings", show SettingsView from Pages
  Tab "Profile", show ProfileView from Pages
```

### Wann was verwenden?

| Situation                   | Empfehlung                 |
| --------------------------- | -------------------------- |
| Kleiner, einfacher Content  | Inline (als Kinder)        |
| Views in der gleichen Datei | `show ViewName`            |
| Jede Seite ist eigenständig | `show Dateiname`           |
| Mehrere Views gruppiert     | `show ViewName from Datei` |

Mischen ist erlaubt:

```mirror
Tabs defaultValue "Quick"
  Tab "Quick"
    Text "Kurzer Inline-Content"
  Tab "Details", show DetailsView
  Tab "More", show More from Extra

DetailsView: Frame name DetailsView, pad 20
  Text "Details aus lokaler View"
```

### SideNav mit show

`show` funktioniert genauso bei SideNav:

```mirror
Frame hor, h 300
  SideNav defaultValue "Dashboard", w 180
    NavItem "Dashboard", icon "home", show DashboardView
    NavItem "Projects", icon "folder", show ProjectsView
    NavItem "Settings", icon "settings", show SettingsView

  Frame w full, pad 20
    DashboardView: Frame name DashboardView
      Text "Dashboard Content"
    ProjectsView: Frame name ProjectsView, hidden
      Text "Projects Content"
    SettingsView: Frame name SettingsView, hidden
      Text "Settings Content"
```

Oder mit externen Dateien:

```mirror
SideNav defaultValue "Dashboard"
  NavItem "Dashboard", icon "home", show Dashboard
  NavItem "Projects", icon "folder", show Projects
  NavItem "Settings", icon "settings", show Settings
```

### Komponenten teilen mit use

Gemeinsame Komponenten definierst du in einer eigenen Datei und importierst sie mit `use`:

```mirror
// components.mirror
Card: bg #1a1a1a, pad 16, rad 8, gap 8
  Title: col white, fs 16, weight 500
  Body: col #888, fs 14

PrimaryBtn as Button: bg #2271C1, col white, pad 10 20, rad 6
```

// components.mirror Card: bg #1a1a1a, pad 16, rad 8, gap 8 Title: col white, fs 16, weight 500 Body: col #888, fs 14 PrimaryBtn as Button: bg #2271C1, col white, pad 10 20, rad 6 // dashboard.mirror use components Frame gap 16 Card Title "Willkommen" Body "Schön dass du da bist." PrimaryBtn "Los geht's" `use` importiert Komponenten-Definitionen. `show` zeigt Content an. Beides ergänzt sich.

```mirror
// dashboard.mirror
use components

Frame gap 16
  Card
    Title "Willkommen"
    Body "Schön dass du da bist."
  PrimaryBtn "Los geht's"
```

---

### Zusammenfassung

#### show Syntax

| Syntax          | Wirkung                                         |
| --------------- | ----------------------------------------------- |
| `show X`        | Zeige lokales Element X (braucht `name X`)      |
| `show X`        | Oder: Lade X.mirror (wenn kein lokales Element) |
| `show X from Y` | Lade Element X aus Y.mirror                     |

#### Vergleich

| Methode          | Verwendung                     |
| ---------------- | ------------------------------ |
| Inline (Kinder)  | Kleiner Content direkt im Tab  |
| `show ViewName`  | Lokale Views in gleicher Datei |
| `show Dateiname` | Content aus eigener Datei      |
| `show X from Y`  | Spezifisches Element aus Datei |
| `use datei`      | Komponenten importieren        |

---

## Eingabe

_Formular-Komponenten_

Interaktive Formular-Komponenten. Alle haben ein Default-Styling – du kannst sie direkt verwenden oder das Aussehen anpassen.

### Input

Ein einzeiliges Textfeld – der Klassiker für Namen, E-Mail, Suche.

```mirror
Frame gap 12, w 280
  Input placeholder "Name eingeben..."
  Input placeholder "E-Mail", type "email"
  Input placeholder "Deaktiviert", disabled
```

`placeholder` zeigt Hilfstext. `type` kann `"email"`, `"password"`, `"number"` sein. `disabled` deaktiviert das Feld.

### Textarea

Ein mehrzeiliges Textfeld – für längere Eingaben wie Kommentare oder Beschreibungen.

```mirror
Frame gap 12, w 280
  Textarea placeholder "Deine Nachricht..."
  Textarea placeholder "Mit Inhalt", value "Hallo Welt!\nZweite Zeile."
```

Gleiche Props wie Input: `placeholder`, `value`, `disabled`, `readonly`.

### Checkbox

Eine Checkbox mit Label – der Klassiker für Ja/Nein-Auswahlen.

```mirror
Frame gap 12
  Checkbox "Newsletter abonnieren"
  Checkbox "AGB akzeptieren", checked
  Checkbox "Deaktiviert", disabled
```

`checked` setzt den Startzustand. `disabled` deaktiviert die Checkbox.

### Switch

Ein Toggle-Switch für An/Aus-Zustände – visuell klarer als eine Checkbox.

```mirror
Frame gap 12
  Switch "Dark Mode"
  Switch "Benachrichtigungen", checked
  Switch "Premium", disabled
```

Gleiche Props wie Checkbox: `checked`, `disabled`.

### RadioGroup

Eine Gruppe von Radio-Buttons – nur einer kann ausgewählt sein.

```mirror
RadioGroup value "monthly"
  RadioItem "Monatlich – €9/Monat", value "monthly"
  RadioItem "Jährlich – €99/Jahr", value "yearly"
  RadioItem "Lifetime – €299", value "lifetime"
```

`value` auf der RadioGroup bestimmt die Auswahl. Jedes `RadioItem` braucht einen eigenen `value`.

### Slider

Ein Schieberegler für numerische Werte in einem Bereich.

```mirror
Frame gap 16, w 240
  Slider value 50, min 0, max 100
  Slider value 75, min 0, max 100, step 25
```

`min` und `max` definieren den Bereich. `step` bestimmt die Schrittweite – mit `step 25` rastet der Slider bei 0, 25, 50, 75, 100 ein.

### Select

Ein Dropdown zur Auswahl aus mehreren Optionen:

```mirror
Select placeholder "Stadt wählen..."
    Option "Berlin"
    Option "Hamburg"
    Option "München"
    Option "Köln"
```

`Option "Text"` reicht – der `value` wird automatisch vom Label übernommen. Bei Bedarf kannst du einen expliziten `value` setzen:

```mirror
Select placeholder "Land wählen..."
    Option "Deutschland", value "de"
    Option "Österreich", value "at"
    Option "Schweiz", value "ch"
```

Mit `placeholder` zeigst du Text, wenn nichts ausgewählt ist. Das Dropdown öffnet bei Klick, ist mit Pfeiltasten navigierbar und schließt bei Auswahl oder Escape.

### DatePicker

Ein Kalender zur Datumsauswahl:

```mirror
DatePicker
```

Mit den Buttons oben wechselst du zwischen Monaten.

### Tastatursteuerung

Mit `keyboard-nav` (oder `keynav`) auf einem Container aktivierst du Tastaturnavigation für Formulare:

```mirror
Frame keyboard-nav, gap 12, w 280, bg #1a1a1a, pad 16, rad 8
  Input placeholder "Name"
  Input placeholder "E-Mail"
  Input placeholder "Telefon"
  Button "Absenden", bg #2271C1, col white, pad 10 20, rad 6
```

**Was passiert:**

- **Enter** springt zum nächsten Eingabefeld
- **Enter** im letzten Feld klickt den Button
- **Escape** verlässt das aktuelle Feld
- **Tab** funktioniert wie gewohnt

> **Hinweis:** **Tipp:** `keyboard-nav` ist besonders nützlich für Formulare ohne Maus – z.B. auf Touch-Geräten mit externer Tastatur oder für Accessibility.

### Custom Styling

Wenn du nur `Checkbox "Text"` schreibst, rendert Mirror im Hintergrund eine komplette Struktur mit Default-Styling. Diese Struktur besteht aus mehreren Elementen:

```mirror
// Das schreibst du:
Checkbox "Newsletter"

// Das erzeugt Mirror intern (vereinfacht):
// Root (Container, horizontal)
//   └─ Control (das Kästchen)
//   └─ Label (der Text)
```

Jedes dieser Elemente ist eine **Kind-Komponente** – genau wie in Kapitel 2 erklärt. Mit `:` kannst du sie überschreiben. Die Kind-Komponenten stehen direkt unter der Hauptkomponente:

```mirror
Checkbox "Custom Checkbox"
  // Kind-Komponenten mit : überschreiben
  Root: hor, gap 12, pad 12, bg #1a1a1a, rad 8
  Control: w 24, h 24, rad 6, bg #333
  Label: col white, fs 14
```

```mirror
Switch "Dark Mode"
  Root: hor, gap 12
  Track: w 52, h 28, rad 99, bg #333
  Thumb: w 24, h 24, rad 99, bg white
  Label: col white, fs 14
```

---

### Zusammenfassung

| Komponente                 | Verwendung                     |
| -------------------------- | ------------------------------ |
| `Input`                    | Einzeiliges Textfeld           |
| `Textarea`                 | Mehrzeiliges Textfeld          |
| `Checkbox`                 | Einzelne Ja/Nein-Auswahl       |
| `Switch`                   | An/Aus-Toggle (visuell klarer) |
| `RadioGroup` + `RadioItem` | Eine aus mehreren Optionen     |
| `Slider`                   | Numerischer Bereich            |
| `Select` + `Option`        | Dropdown-Auswahl               |
| `DatePicker`               | Kalender-Auswahl               |

**Tastatursteuerung:** `Frame keyboard-nav` aktiviert Enter/Escape-Navigation für Formulare.

**Custom Styling:** Über Kind-Komponenten wie `Root:`, `Control:`, `Label:` – siehe Referenz

---

## Navigation

_Tabs und SideNav_

Zwei Komponenten für Navigation: **Tabs** wechseln zwischen Ansichten. **SideNav** ist eine Sidebar-Navigation.

### Tabs

Tabs wechseln zwischen Inhalten. Jeder `Tab` hat ein Label – mit `defaultValue` sagst du, welcher Tab beim Start aktiv sein soll:

```mirror
Tabs defaultValue "Home"
  Tab "Home"
    Text "Welcome to the home page"
  Tab "Profile"
    Text "Your profile settings"
  Tab "Settings"
    Text "Application settings"
```

Die Kinder jedes Tabs werden zum Panel-Content. Klickst du auf einen Tab, zeigt Mirror automatisch den passenden Inhalt.

#### Custom Styling

Tabs besteht intern aus mehreren Teilen: `List:` (Container um die Tab-Header), `Indicator:` (animierte Markierung), `Content:` (Panel-Container). Diese kannst du mit Kind-Komponenten überschreiben.

**Wichtig:** Kind-Komponenten stehen direkt unter `Tabs` – **vor** den eigentlichen Tabs:

```mirror
Tabs defaultValue "Dashboard"
  // Kind-Komponenten (mit :) zuerst
  List: bor 0 0 1 0, boc #333, gap 24
  Indicator: h 2, bg #2271C1
  Content: pad 16 0

  // Dann die Tabs (ohne :)
  Tab "Dashboard"
    Text "Dashboard content"
  Tab "Analytics"
    Text "Analytics content"
```

Die Kind-Komponenten gelten für alle Tabs gleichzeitig. Du kannst nicht einzelne Tabs unterschiedlich stylen – dafür sind die Styles ja da: einmal definieren, überall anwenden.

### SideNav

SideNav ist eine Sidebar-Navigation. Jedes `NavItem` hat einen `value` – mit `defaultValue` bestimmst du, welches Item aktiv startet:

```mirror
SideNav defaultValue "dashboard", w 200
  NavItem "Dashboard", icon "home", value "dashboard"
  NavItem "Projects", icon "folder", value "projects"
  NavItem "Settings", icon "settings", value "settings"
```

SideNav unterstützt `Header:` und `Footer:` für feste Bereiche, `badge` für Zähler, und `NavGroup` für Gruppierung. Mit `collapsible` werden Gruppen auf-/zuklappbar:

```mirror
SideNav defaultValue "dashboard", w 200
  Header:
    Frame pad 12
      Text "My App", fs 14, weight bold

  NavItem "Dashboard", icon "home", value "dashboard"
  NavItem "Messages", icon "mail", value "messages", badge "3"

  NavGroup "Settings", collapsible, defaultOpen
    NavItem "Account", icon "user", value "account"
    NavItem "Security", icon "shield", value "security"

  Footer:
    Frame pad 12
      Text "v1.0.0", col #666, fs 11
```

```mirror
SideNav defaultValue "dashboard", collapsed, w 56
  NavItem "Dashboard", icon "home", value "dashboard"
  NavItem "Projects", icon "folder", value "projects"
  NavItem "Settings", icon "settings", value "settings"
```

#### Views wechseln mit navigate()

Mit `navigate(ViewName)` zeigst du bei Klick eine View an. Die anderen Views werden automatisch ausgeblendet:

```mirror
Frame hor
  SideNav defaultValue "dashboard", w 160
    NavItem "Dashboard", icon "home", value "dashboard", navigate(DashboardView)
    NavItem "Settings", icon "settings", value "settings", navigate(SettingsView)

  Frame w full, pad 16
    Frame name DashboardView
      Text "Dashboard Content", col white
    Frame name SettingsView, hidden
      Text "Settings Content", col white
```

Die Views sind Frames mit `name`. Die erste ist sichtbar, die anderen starten mit `hidden`.

#### Custom Styling

Auch SideNav hat Kind-Komponenten. Wieder gilt: **zuerst** die Kind-Komponenten (mit `:`), **dann** die Inhalte:

```mirror
SideNav defaultValue "dashboard", w 220
  // Kind-Komponenten zuerst
  Root: bg #050510, pad 8
  Item: pad 12 16, rad 8, mar 4 8, col #aaa, bg #151520
  ItemIcon: ic #818cf8
  ItemBadge: bg #ef4444, col white, pad 2 8, rad 99, fs 11, weight 600
  GroupLabel: pad 12 16, col #666, fs 11, uppercase

  // Dann die NavItems
  NavItem "Dashboard", icon "home", value "dashboard"
  NavItem "Messages", icon "mail", value "messages", badge "5"
  NavGroup "Admin"
    NavItem "Users", icon "users", value "users"
    NavItem "Logs", icon "file-text", value "logs"
```

`Item:` stylt alle NavItems, `ItemIcon:` die Icons, `ItemBadge:` die Badges, `GroupLabel:` die Gruppenüberschriften. Welche Kind-Komponenten es gibt, findest du in der Referenz.

---

### Zusammenfassung

**Tabs** für horizontale Tab-Navigation. Jeder `Tab` enthält seinen Content als Kinder.

**SideNav** für Sidebar-Navigation. `NavItem` mit `icon`, `badge`, optional `navigate(View)`.

**NavGroup** gruppiert Items, optional `collapsible`.

---

## Overlays

_Dialog und Tooltip_

Overlays erscheinen über dem normalen Content. Beide folgen dem gleichen Muster: `Trigger:` ist das auslösende Element, `Content:` der Overlay-Inhalt.

### Dialog

Dialoge sind modale Fenster – sie blockieren die Interaktion mit dem Rest der Seite:

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
    Frame hor, spread, ver-center
      Text "Settings", weight bold, fs 18
      CloseTrigger: Icon "x", ic #666, cursor pointer
    Text "Dialog content here"
```

```mirror
Dialog
  Trigger: Button "Custom backdrop"
  Backdrop: bg rgba(0,0,100,0.5)
  Content: Frame pad 24, bg #1a1a1a, rad 12
    Text "Dialog with blue backdrop"
```

> **Hinweis:** **Accessibility:** Dialoge sind vollständig tastatursteuerbar: **Tab** / **Shift+Tab** – zwischen Elementen im Dialog wechseln (Fokus bleibt im Dialog) **Escape** – Dialog schließen **Fokus-Wiederherstellung** – nach Schließen springt der Fokus zurück zum Trigger

- **Tab** / **Shift+Tab** – zwischen Elementen im Dialog wechseln (Fokus bleibt im Dialog)
- **Escape** – Dialog schließen
- **Fokus-Wiederherstellung** – nach Schließen springt der Fokus zurück zum Trigger

### Praktisch: Confirm Dialog

Ein typischer Bestätigungs-Dialog mit zwei Buttons:

```mirror
Dialog
  Trigger: Button "Delete item", bg #ef4444
  Content: Frame ver, gap 16, pad 24, bg #1a1a1a, rad 12, w 380
    Frame hor, gap 12, ver-center
      Frame w 40, h 40, rad 99, bg rgba(239,68,68,0.2), center
        Icon "trash", ic #ef4444
      Frame ver
        Text "Delete Item", weight bold, fs 16
        Text "This action cannot be undone.", col #888, fs 14
    Frame hor, gap 8
      CloseTrigger: Button "Cancel", grow
      Button "Delete", bg #ef4444, grow
```

### Praktisch: Form Dialog

Ein Dialog mit Eingabefeldern:

```mirror
Dialog
  Trigger: Button "Create new"
  Content: Frame ver, gap 16, pad 24, bg #1a1a1a, rad 12, w 400
    Frame hor, spread, ver-center
      Text "Create Project", weight bold, fs 18
      CloseTrigger: Icon "x", ic #666, cursor pointer
    Frame ver, gap 12
      Frame ver, gap 4
        Label "Project Name"
        Input placeholder "Enter project name"
      Frame ver, gap 4
        Label "Description"
        Textarea placeholder "Enter description", h 80
    Frame hor, gap 8
      CloseTrigger: Button "Cancel", grow
      Button "Create", bg #5BA8F5, grow
```

### Tooltip

Tooltips erscheinen bei Hover – ideal für kurze Hilfetexte. Sie blockieren nichts und verschwinden automatisch:

```mirror
Tooltip
  Trigger: Button "Hover me"
  Content: Text "This is a tooltip"
```

Mit `positioning` bestimmst du, wo der Tooltip erscheint (`"top"`, `"bottom"`, `"left"`, `"right"`):

```mirror
Frame hor, gap 8, pad 16
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

---

### Zusammenfassung

**Dialog** ist modal – blockiert die Seite, hat `Backdrop:` und `CloseTrigger:`.

**Tooltip** erscheint bei Hover – für kurze Hilfetexte, mit `positioning` platzierbar.

**Gemeinsames Muster:** `Trigger:` + `Content:`

**Custom Styling:** Auch Overlays haben Kind-Komponenten – siehe Referenz.

---

## Tabellen

_Statische und datengebundene Tabellen_

Tabellen zeigen strukturierte Daten. **Statische Tabellen** für feste Inhalte. **Datengebundene Tabellen** für dynamische Daten mit Filtern und Sortieren.

### Statische Tabellen

Die einfachste Art, eine Tabelle zu erstellen – ohne Datenbindung. Mit `Header:` markierst du die Kopfzeile, jede `Row` enthält die Zell-Werte:

```mirror
Table
  Header:
    Row "Name", "Alter", "Stadt"
  Row "Max", "25", "Berlin"
  Row "Anna", "30", "München"
  Row "Tom", "28", "Hamburg"
```

Das ist alles – nur `Table`, `Header:` und `Row` mit den Werten.

> **Hinweis:** **Wann statisch?** Verwende statische Tabellen für: Preislisten, Feature-Vergleiche, Kontaktdaten, Referenztabellen – alles mit festen, bekannten Werten.

### Datengebundene Tabellen

Für dynamische Daten bindest du eine Datenquelle mit `Table $name` und definierst ein `Row:` Template:

```mirror
tasks:
  task1:
    title: "Design Review"
    status: "done"
  task2:
    title: "API Integration"
    status: "progress"
  task3:
    title: "Testing"
    status: "todo"

Table $tasks, gap 4, w full
  Row: hor, gap 16, pad 12, bg #1a1a1a, rad 6, w full
    Text row.title, col white, w 140
    Text row.status, col #888
```

- `Table $tasks` – Die Datenquelle (Datenobjekt mit Einträgen)
- `Row:` – Template für jede Zeile (mit Doppelpunkt!)
- `row.title` – Zugriff auf Felder des aktuellen Eintrags

> **Hinweis:** **Hinweis:** Daten werden im Entry-Format definiert: `name:` gefolgt von eingerückten `key: value` Paaren. Bei der Verwendung mit `$name` iteriert die Runtime automatisch über alle Einträge.

### Tabellen stylen

Tabellen können auf allen Ebenen gestylt werden – von der Tabelle selbst bis zu einzelnen Zellen.

#### Table-Level Styles

Styles direkt auf `Table` wirken auf den Container:

```mirror
tasks:
  t1:
    name: "Design"
    status: "done"
  t2:
    name: "Dev"
    status: "wip"

Table $tasks, bg #111, pad 16, rad 12, gap 8
  Row: hor, spread, pad 12, bg #1a1a1a, rad 6, w full
    Text row.name, col white
    Text row.status, col #888
```

#### Header: und Footer: Styles

Mit `Header:` und `Footer:` stylst du Kopf- und Fußbereich separat:

```mirror
tasks:
  t1:
    name: "Task 1"
    effort: 5
  t2:
    name: "Task 2"
    effort: 3

Table $tasks, bg #111, rad 12, gap 4
  Header: bg #222, pad 12 16, rad 8 8 0 0
    Row "Aufgabe", "Aufwand"
  Row: hor, spread, pad 12 16, w full
    Text row.name, col white
    Text row.effort + "h", col #888
  Footer: bg #222, pad 12 16, rad 0 0 8 8
    Row "Total", "8h"
```

#### Zebra-Muster mit RowOdd: und RowEven:

Für alternierende Zeilenfarben nutze `RowOdd:` und `RowEven:`:

```mirror
users:
  u1:
    name: "Anna"
    role: "Designer"
  u2:
    name: "Max"
    role: "Developer"
  u3:
    name: "Tom"
    role: "Manager"
  u4:
    name: "Lisa"
    role: "Designer"

Table $users, bg #111, rad 12, w full
  Header: bg #222, pad 12 16
    Row "Name", "Rolle"
  RowOdd: bg #1a1a1a
  RowEven: bg #151515
  Row: hor, spread, pad 12 16, w full
    Text row.name, col white
    Text row.role, col #888
```

**Tipp:** `RowOdd:` und `RowEven:` werden automatisch basierend auf dem Zeilen-Index angewendet. Ungerade Zeilen (1, 3, 5...) bekommen `RowOdd:`, gerade Zeilen (0, 2, 4...) bekommen `RowEven:`.

> **Hinweis:** **Tipp:** `RowOdd:` und `RowEven:` werden automatisch basierend auf dem Zeilen-Index angewendet. Ungerade Zeilen (1, 3, 5...) bekommen `RowOdd:`, gerade Zeilen (0, 2, 4...) bekommen `RowEven:`.

#### Column Styles

Bei spaltenbasierten Tabellen kannst du Styles direkt auf `Column` setzen – sie wirken auf alle Zellen dieser Spalte:

```mirror
tasks:
  t1:
    title: "Design Review"
    status: "done"
  t2:
    title: "API Integration"
    status: "wip"
  t3:
    title: "Testing"
    status: "todo"

Table $tasks, bg #111, rad 12, pad 8
  Header: bg #222, pad 12
    Row "Aufgabe", "Status"
  Column title, col white, pad 12
  Column status, col #10b981, pad 12, weight 600
```

#### Kombiniertes Styling

Alle Styling-Ebenen können kombiniert werden:

```mirror
products:
  p1:
    name: "Basic"
    price: 9
    users: 5
  p2:
    name: "Pro"
    price: 29
    users: 50
  p3:
    name: "Enterprise"
    price: 99
    users: 999

Table $products, bg #0a0a0a, rad 16, pad 12, gap 2, w full
  Header: bg #1a1a1a, pad 16, rad 8
    Row "Plan", "Preis", "Users"
  RowOdd: bg #151515, rad 6
  RowEven: bg #111, rad 6
  Row: hor, pad 16, w full
    Text row.name, col white, weight 500, w 120
    Text "$" + row.price, col #10b981, w 80
    Text row.users + " Users", col #666
```

### Filtern mit where

Mit `where` filterst du Einträge nach einer Bedingung:

```mirror
tasks:
  task1:
    title: "Design Review"
    done: true
  task2:
    title: "API Integration"
    done: false
  task3:
    title: "Testing"
    done: false
  task4:
    title: "Documentation"
    done: true

// Nur nicht erledigte Tasks
Table $tasks where row.done == false, gap 4, w full
  Row: hor, gap 12, pad 12 16, bg #1a1a1a, rad 8, ver-center, w full
    Icon "circle", ic #f59e0b, is 16
    Text row.title, col white, grow
```

**Vergleichsoperatoren:** `==`, `!=`, `>`, `=`, `<=`

```mirror
tasks:
  task1:
    title: "Critical Bug"
    priority: 1
    done: false
  task2:
    title: "Minor Fix"
    priority: 3
    done: false
  task3:
    title: "Feature"
    priority: 2
    done: true

// Nicht erledigt UND hohe Priorität
Table $tasks where row.done == false and row.priority < 3, gap 4, w full
  Row: hor, gap 12, pad 12 16, bg #1a1a1a, rad 8, ver-center, w full
    Icon "alert-circle", ic #ef4444, is 16
    Text row.title, col white, grow
    Text "P" + row.priority, col #ef4444, fs 12, weight 600
```

### Sortieren mit by

Mit `by` sortierst du nach einem Feld. Mit `desc` wird absteigend sortiert:

```mirror
tasks:
  task1:
    title: "Low Priority"
    priority: 3
  task2:
    title: "High Priority"
    priority: 1
  task3:
    title: "Medium Priority"
    priority: 2

// Sortiert nach Priorität (aufsteigend)
Table $tasks by priority, gap 4, w full
  Row: hor, gap 12, pad 12 16, bg #1a1a1a, rad 8, ver-center, w full
    Text row.priority, col #2271C1, fs 14, weight 600, w 24
    Text row.title, col white, grow
```

**Absteigend sortieren:**

```mirror
products:
  tshirt:
    name: "T-Shirt"
    price: 29
  hoodie:
    name: "Hoodie"
    price: 59
  cap:
    name: "Cap"
    price: 19

// Teuerste zuerst
Table $products by price desc, gap 4, w full
  Row: hor, spread, pad 12 16, bg #1a1a1a, rad 8, ver-center, w full
    Text row.name, col white, weight 500
    Text "€" + row.price, col #10b981, fs 14, weight 600
```

---

### Zusammenfassung

**Statische Tabellen:** `Table` + `Row "A", "B", "C"` für feste Werte. Optional `Header:` für Kopfzeile.

**Datengebundene Tabellen:** `Table $data` mit `Row:` Template. Zugriff auf Felder mit `row.field`.

#### Styling

| `Table $data, bg #111, pad 16, rad 12` | Table-Level Styles          |
| -------------------------------------- | --------------------------- |
| `Header: bg #222, pad 12`              | Kopfzeilen-Styles           |
| `Footer: bg #222, pad 12`              | Fußzeilen-Styles            |
| `Row: pad 12, bg #1a1a1a`              | Zeilen-Styles (alle Zeilen) |
| `RowOdd: bg #1a1a1a`                   | Ungerade Zeilen (Zebra)     |
| `RowEven: bg #151515`                  | Gerade Zeilen (Zebra)       |
| `Column title, col white, pad 12`      | Spalten/Zellen-Styles       |

#### Daten-Operationen

| `where row.done == false` | Filtern               |
| ------------------------- | --------------------- |
| `by priority`             | Aufsteigend sortieren |
| `by price desc`           | Absteigend sortieren  |

---

## Charts

_Datenvisualisierung mit Chart.js_

Charts machen Daten sichtbar. Mirror bietet einfache Primitives für die häufigsten Chart-Typen – **Line**, **Bar**, **Pie** und mehr. Die Daten kommen aus Variablen, das Styling ist minimal.

### Das Prinzip

Ein Chart ist ein Primitive wie `Frame` oder `Button`. Du gibst ihm Daten und optional Größe – fertig:

```mirror
sales:
  Jan: 120
  Feb: 180
  Mar: 240
  Apr: 200
  May: 280

Line $sales, w 400, h 200
```

`Line $sales` erzeugt ein Liniendiagramm. Die Daten kommen aus dem `sales`-Objekt – die Keys werden zu Labels (Jan, Feb, ...), die Werte zur Linie.

### Chart-Typen

Mirror unterstützt sieben Chart-Typen. Jeder hat seinen Einsatzzweck:

#### Line – Trends über Zeit

```mirror
revenue:
  Q1: 45
  Q2: 62
  Q3: 78
  Q4: 95

Line $revenue, w 350, h 180
```

#### Bar – Werte vergleichen

```mirror
teams:
  Design: 8
  Engineering: 12
  Marketing: 5
  Sales: 7

Bar $teams, w 350, h 180
```

#### Pie – Anteile zeigen

```mirror
browsers:
  Chrome: 65
  Safari: 20
  Firefox: 10
  Other: 5

Pie $browsers, w 250, h 200
```

#### Donut – Anteile mit Loch

```mirror
status:
  Done: 45
  Progress: 30
  Todo: 25

Donut $status, w 200, h 200
```

#### Area – Gefüllte Linie

```mirror
users:
  Jan: 1200
  Feb: 1800
  Mar: 2400
  Apr: 3100

Area $users, w 350, h 180
```

| Typ       | Verwendung                                |
| --------- | ----------------------------------------- |
| `Line`    | Trends, Entwicklung über Zeit             |
| `Bar`     | Kategorien vergleichen                    |
| `Pie`     | Anteile eines Ganzen                      |
| `Donut`   | Anteile (mit Platz für Zahl in der Mitte) |
| `Area`    | Volumen, kumulative Werte                 |
| `Scatter` | Korrelationen zwischen zwei Werten        |
| `Radar`   | Mehrdimensionale Vergleiche               |

### Datenformate

Charts akzeptieren verschiedene Datenformate:

#### Key-Value Objekte

Das einfachste Format – Keys werden Labels, Werte die Datenpunkte:

```mirror
// Keys = Labels, Values = Datenpunkte
sales:
  Jan: 120
  Feb: 180
  Mar: 240

Bar $sales, w 300, h 160
```

#### Objekte mit Feldern

Für komplexere Daten mit `x` und `y` die Felder angeben:

```mirror
products:
  a:
    name: "Widget"
    sales: 120
  b:
    name: "Gadget"
    sales: 85
  c:
    name: "Tool"
    sales: 200

Bar $products, x "name", y "sales", w 300, h 180
```

`x "name"` sagt: "Nimm das `name`-Feld für die Labels." `y "sales"` sagt: "Nimm `sales` für die Werte."

### Styling

#### Farben

Mit `colors` definierst du die Farbpalette:

```mirror
data:
  A: 30
  B: 50
  C: 20

Pie $data, w 200, h 180, colors #2271C1 #10b981 #f59e0b
```

#### Titel

```mirror
revenue:
  Q1: 45
  Q2: 62
  Q3: 78
  Q4: 95

Line $revenue, w 350, h 200, title "Quartalsumsatz 2024"
```

#### Legende

Bei Pie/Donut ist die Legende automatisch an. Bei anderen Charts mit `legend true` aktivieren:

```mirror
months:
  Jan: 120
  Feb: 180
  Mar: 240

Bar $months, w 350, h 200, legend true
```

#### Raster ausblenden

```mirror
data:
  A: 30
  B: 50
  C: 40
  D: 60

Line $data, w 350, h 180, grid false
```

### Subkomponenten

Für präzise Kontrolle über jeden Aspekt eines Charts gibt es **Subkomponenten**. Sie funktionieren wie Kind-Komponenten – mit Doppelpunkt definiert, eingerückt unter dem Chart:

#### Achsen anpassen

Mit `XAxis:` und `YAxis:` kontrollierst du Farben, Labels und Wertebereiche:

```mirror
revenue:
  Jan: 45
  Feb: 62
  Mar: 78
  Apr: 95
  May: 88
  Jun: 110

Line $revenue, w 400, h 220
  XAxis: col #888, label "Monat", fs 11
  YAxis: col #888, label "Umsatz (k€)", min 0, max 120
```

`label` fügt einen Achsentitel hinzu. `min` und `max` fixieren den Wertebereich.

#### Datenpunkte stylen

`Point:` kontrolliert die Datenpunkte bei Line- und Scatter-Charts:

```mirror
data:
  Q1: 30
  Q2: 45
  Q3: 60
  Q4: 52

Line $data, w 350, h 180
  Point: size 8, bg #2271C1, hover-size 12
```

#### Grid anpassen

`Grid:` steuert die Rasterlinien:

```mirror
sales:
  Mon: 120
  Tue: 180
  Wed: 150
  Thu: 200
  Fri: 240

Bar $sales, w 350, h 180
  Grid: col #333, dash 4
```

`dash 4` macht die Linien gestrichelt (4px Segmente).

#### Legende und Titel

Für volle Kontrolle über Legende und Titel:

```mirror
status:
  Done: 45
  Progress: 30
  Todo: 25

Pie $status, w 280, h 220, colors #10b981 #f59e0b #ef4444
  Title: text "Projektstatus", col white, fs 16
  Legend: pos right, col #888, fs 12
```

#### Linien anpassen

`Line:` (bei Line/Area-Charts) kontrolliert die Liniendarstellung:

```mirror
trend:
  Jan: 20
  Feb: 35
  Mar: 28
  Apr: 45
  May: 52

Line $trend, w 350, h 180
  Line: width 3, tension 0.4, fill true
```

`tension` steuert die Kurvenstärke (0 = eckig, 1 = sehr rund). `fill` füllt die Fläche unter der Linie.

#### Balken stylen

`Bar:` für Balken-spezifische Optionen:

```mirror
teams:
  Design: 8
  Dev: 12
  Marketing: 5

Bar $teams, w 300, h 180, colors #2271C1
  Bar: rad 6, bor 2, boc #2271C1
```

#### Alle Subkomponenten kombinieren

Ein vollständig angepasstes Chart:

```mirror
revenue:
  Jan: 45
  Feb: 62
  Mar: 78
  Apr: 95
  May: 88
  Jun: 110

Frame bg #0a0a0a, pad 20, rad 12
  Line $revenue, w 420, h 240, colors #2271C1
    Title: text "Umsatzentwicklung 2024", col white, fs 14
    XAxis: col #666, fs 10
    YAxis: col #666, label "Umsatz (k€)", fs 10, min 0
    Grid: col #222
    Point: size 5, bg #2271C1, hover-size 8
    Line: width 2, tension 0.3
```

| Subkomponente | Charts                    | Properties                          |
| ------------- | ------------------------- | ----------------------------------- |
| `XAxis:`      | Line, Bar, Scatter        | col, label, fs, min, max, visible   |
| `YAxis:`      | Line, Bar, Scatter        | col, label, fs, min, max, visible   |
| `Grid:`       | Line, Bar, Scatter, Radar | col, width, dash, visible           |
| `Point:`      | Line, Scatter, Radar      | size, bg, boc, bor, hover-size      |
| `Legend:`     | Alle                      | visible, pos, col, fs               |
| `Title:`      | Alle                      | text, col, fs, weight, pos, visible |
| `Line:`       | Line, Area                | width, tension, fill, dash          |
| `Bar:`        | Bar                       | rad, bor, boc                       |
| `Arc:`        | Pie, Donut                | bor, boc, offset, hover-offset      |

### In Layouts einbetten

Charts sind normale Elemente – du kannst sie in Frames, Cards oder Grids einbetten:

```mirror
sales:
  Jan: 120
  Feb: 180
  Mar: 240
  Apr: 200

Card: bg #1a1a1a, pad 20, rad 12, gap 12
  Title: col white, fs 16, weight 600
  Subtitle: col #888, fs 13

Card
  Title "Monatsumsatz"
  Subtitle "Januar - April 2024"
  Line $sales, w full, h 160
```

### Dashboard-Beispiel

Mehrere Charts in einem Grid:

```mirror
revenue:
  Q1: 45
  Q2: 62
  Q3: 78
  Q4: 95

users:
  Free: 1200
  Pro: 450
  Team: 180

Stat: bg #1a1a1a, pad 16, rad 8, gap 8
  Label: col #888, fs 12
  Value: col white, fs 24, weight 600

Frame gap 16
  Frame hor, gap 16
    Stat
      Label "Revenue"
      Line $revenue, w 180, h 80, grid false, axes false
    Stat
      Label "Users"
      Donut $users, w 100, h 100
```

---

### Zusammenfassung

#### Chart-Typen

| Primitive | Beschreibung                |
| --------- | --------------------------- |
| `Line`    | Liniendiagramm (Trends)     |
| `Bar`     | Balkendiagramm (Vergleiche) |
| `Pie`     | Kreisdiagramm (Anteile)     |
| `Donut`   | Ring-Diagramm               |
| `Area`    | Flächendiagramm             |
| `Scatter` | Streudiagramm               |
| `Radar`   | Netzdiagramm                |

#### Properties

| Property       | Beschreibung            |
| -------------- | ----------------------- |
| `$data`        | Datenquelle (Variable)  |
| `x "field"`    | Feld für Labels         |
| `y "field"`    | Feld für Werte          |
| `colors #a #b` | Farbpalette             |
| `title "Text"` | Chart-Titel             |
| `legend true`  | Legende anzeigen        |
| `grid false`   | Rasterlinien ausblenden |
| `axes false`   | Achsen ausblenden       |

#### Subkomponenten

| Slot                | Wichtige Properties      |
| ------------------- | ------------------------ |
| `XAxis:` / `YAxis:` | col, label, fs, min, max |
| `Grid:`             | col, dash, visible       |
| `Point:`            | size, bg, hover-size     |
| `Legend:`           | pos, col, fs, visible    |
| `Title:`            | text, col, fs, weight    |
| `Line:`             | width, tension, fill     |
| `Bar:`              | rad, bor, boc            |

**Sizing:** Charts nehmen `w` und `h` wie jedes andere Element. Mit `w full` füllen sie den Container.

**Subkomponenten:** Mit `XAxis:`, `Point:` etc. passt du jeden Aspekt des Charts an – konsistent mit Mirrors Komponenten-Syntax.

---

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
| margin             | mar, m               | <number>, $token                                                                                                                                                             |
| background         | bg                   | <color>, $token                                                                                                                                                              |
| color              | col, c               | <color>, $token                                                                                                                                                              |
| border-color       | boc                  | <color>, $token                                                                                                                                                              |
| border             | bor                  | <number>, $token                                                                                                                                                             |
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
