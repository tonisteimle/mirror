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

<!-- GENERATED:TUTORIAL:START -->

## Mirror DSL Tutorial

Das folgende Tutorial ist die vollständige Referenz für die Mirror DSL. Es wird automatisch aus den HTML-Tutorials generiert.

## Was ist Mirror?

*Die Entwicklungsumgebung für Designer*

Mirror ist eine einfache Programmiersprache, um UIs zu beschreiben und zu steuern. Du kannst direkt Code schreiben, visuell im Editor arbeiten, oder AI generieren lassen – alle drei Wege führen zum selben lesbaren Code.

### Code, den du verstehst

AI kann UI generieren. Das Ergebnis sieht oft gut aus – aber der Code dahinter bleibt eine **Black Box**. Du kannst nicht beurteilen, ob er sauber ist. Du hast kein Gefühl der Kontrolle.

Und wenn du etwas ändern willst? Für "mach den Button etwas größer" musst du wieder die AI fragen. Dabei wäre es oft viel schneller, selbst drei Zeichen im Code zu ändern – wenn du ihn nur verstehen würdest.

**Mirror löst dieses Problem.**

Mirror ist eine Sprache, die AI versteht *und* Menschen lesen können:

```mirror
Button "Speichern", bg #2563eb, col white, pad 12 24, rad 6
```

Das ist ein blauer Button. Du siehst es, du verstehst es, du kannst es ändern. `bg #2563eb` → `bg #10b981` und der Button ist grün. `pad 12 24` → `pad 16 32` und er ist größer. Keine Magie, keine versteckten Dateien.

```mirror
// Einmal definieren (mit Styling)
Card: bg #1a1a1a, pad 16, rad 8, gap 8
  Title: col white, fs 16, weight 500
  Desc: col #888, fs 14

// Dann verwenden (clean wie ein Dokument)
Card
  Title "Projekt Alpha"
  Desc "Das erste Projekt"

Card
  Title "Projekt Beta"
  Desc "Ein anderes Projekt"
```

### Hierarchie durch Einrückung

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

### Von Element zu Komponente: Ein Zeichen

Du hast einen Button gebaut und willst ihn wiederverwenden? Füge einen Namen mit Doppelpunkt hinzu:

```mirror
// Komponente definieren: Name mit :
PrimaryBtn as Button: bg #2563eb, col white, pad 12 24, rad 6

// Verwenden: Name ohne :
Frame hor, gap 8
  PrimaryBtn "Speichern"
  PrimaryBtn "Senden"
  PrimaryBtn "Weiter"
```

Keine separate Datei. Kein Import. Kein Export. Die Definition ist dort, wo du sie brauchst.

### Tokens für Design-Systeme

Farben, Abstände, Radien – definiere sie einmal, verwende sie überall:

```mirror
primary.bg: #2563eb
card.bg: #1a1a1a
card.rad: 8

Card: bg $card, rad $card, pad 16, gap 8
  Title: col white, fs 16, weight 500

Card
  Title "Mit Tokens"
  Text "Änderst du den Token, ändert sich alles.", col #888, fs 13
```

Tokens + Komponenten = konsistentes Design ohne Wiederholung.

### States ohne Komplexität

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

```mirror
ExpandBtn: pad 12 20, bg #1a1a1a, col white, rad 6, hor, gap 8, cursor pointer, toggle()
  "Mehr zeigen"
  Icon "chevron-down", ic #888, is 16
  open:
    "Weniger zeigen"
    Icon "chevron-up", ic #888, is 16

ExpandBtn
```

### Animation und Logik

States können animiert werden – füge einfach eine Dauer hinzu:

```mirror
Btn: pad 12 24, rad 6, bg #333, col white, cursor pointer
  hover 0.2s:
    bg #2563eb
    scale 1.02

Btn "Hover mich"
```

`hover:` springt, `hover 0.2s:` gleitet. Für Logik schreibst du eigene Funktionen – in einer einfachen Syntax ohne Klammern:

```mirror
Input name EmailInput
Button "Absenden", absenden()

function absenden()
  wert = EmailInput.value
  Hinweis.content = "Gesendet: " + wert
```

### Arbeite wie du willst

Mirror ist Text. Du kannst es schreiben in:

- **Jedem Texteditor** – VS Code, Sublime, vim
- **Mirror Studio** – einer IDE mit Live-Preview, visuellem Editing und Property-Panel

In Mirror Studio siehst du Code und Ergebnis nebeneinander. Ändere den Code, das Preview aktualisiert sich. Klicke ins Preview, der Code wird selektiert. Beides bleibt synchron.

### Mensch + AI = besseres Design

Mirror wurde für die Zusammenarbeit mit AI entwickelt:

```mirror
Du: "Erstelle eine Card mit Avatar, Name und Rolle"
AI: generiert Mirror-Code
Du: "Der Avatar soll größer sein"
AI: ändert `is 24` → `is 32`
Du: siehst die Änderung, verstehst sie, kannst selbst weiter tweaken
```

Du: "Erstelle eine Card mit Avatar, Name und Rolle" AI: generiert Mirror-Code Du: "Der Avatar soll größer sein" AI: ändert `is 24` → `is 32` Du: siehst die Änderung, verstehst sie, kannst selbst weiter tweaken **Das ist der entscheidende Unterschied:** Du bist nicht ausgeliefert. Du verstehst was die AI generiert hat. Du kannst selbst eingreifen – eine Farbe ändern, einen Abstand anpassen, ein Element verschieben. Der Code gehört dir.

### Dieses Tutorial

Die folgenden Kapitel führen durch alle Konzepte:

| Die Sprache |  |
| --- | --- |
| 01-03 | **Grundlagen** – Elemente, Komponenten, Tokens |
| 04-05 | **Layout & Styling** – Flex, Grid, Farben, Effekte |
| 06-08 | **Interaktion** – States, Animationen, Functions |
| 09-10 | **Daten & Struktur** – Variablen, Binding, Seiten |
| Komponenten-Bibliothek |  |
| 11 | **Eingabe** – Forms, Selection, DateTime |
| 12 | **Navigation** – Tabs, SideNav |
| 13 | **Overlays** – Dialog, Popover, Tooltip |
| 14 | **Tabellen** – Statische und datengebundene Tabellen |

Jedes Kapitel enthält interaktive Beispiele – der Code kann direkt bearbeitet werden, das Ergebnis erscheint live.

---

### Das Wichtigste

| Konzept | Syntax |
| --- | --- |
| Element mit Properties | `Button "Text", bg #2563eb, pad 12` |
| Hierarchie | 2 Leerzeichen Einrückung |
| Komponente definieren | `Btn:` (mit Doppelpunkt) |
| Komponente verwenden | `Btn "Text"` (ohne Doppelpunkt) |
| Token definieren | `primary.bg: #2563eb` |
| Token verwenden | `bg $primary` |
| State definieren | `on:` oder `hover:` |
| State wechseln | `toggle()` |

**Das Prinzip:** Mirror ist lesbar wie ein Dokument. AI generiert Code, du verfeinerst ihn – ohne Framework-Wissen.


---

## Elemente & Hierarchie

*Die Grundbausteine jeder Mirror-Oberfläche*

In diesem Kapitel lernst du die Basis-Syntax von Mirror: Wie du Elemente erstellst, sie mit Properties gestaltest und durch Einrückung verschachtelst.

### Die Grundsyntax

Ein Mirror-Element besteht aus dem **Element-Namen**, optionalem **Text-Inhalt** in Anführungszeichen, und **Properties** getrennt durch Kommas:

```mirror
Button "Speichern", bg #2563eb, col white, pad 12 24, rad 6
```

**Was passiert hier?**

- `Button` – der Element-Typ
- `"Speichern"` – der sichtbare Text
- `bg #2563eb` – Hintergrundfarbe (Hex)
- `col white` – Textfarbe
- `pad 12 24` – Padding: 12px oben/unten, 24px links/rechts
- `rad 6` – Eckenradius von 6px

### Primitives

Primitives sind die Grundelemente von Mirror. Es gibt über 50 davon – hier die Basis-Elemente für den Einstieg:

```mirror
Frame gap 12, pad 16, bg #1a1a1a, rad 8
  Text "Eine Überschrift", col white, fs 18
  Text "Normaler Text darunter", col #888
  Button "Klick mich", bg #2563eb, col white, pad 10 20, rad 6
  Input placeholder "E-Mail eingeben...", bg #333, col white, pad 10, rad 4
```

| Primitive | Beschreibung |
| --- | --- |
| `Frame` | Container – das zentrale Layout-Element |
| `Text` | Textinhalt |
| `Image` | Bild |
| `Icon` | Icon (Lucide oder Material) |
| `Button` | Klickbarer Button |
| `Input` | Einzeiliges Eingabefeld |
| `Link` | Anklickbarer Link |

> **Hinweis:** Weitere Primitives: `Textarea`, `Label`, `Divider`, `Spacer`, semantische Elemente (`Header`, `Nav`, `Main`, `Section`, `Footer`, `H1`–`H6`) und über 50 Zag-Komponenten (`Dialog`, `Tabs`, `Menu`, `Select`, etc.).

### Styling-Properties

Properties steuern das Aussehen. Zahlen sind Pixel, `#hex` sind Farben:

```mirror
Frame gap 16, bg #0a0a0a, pad 16, rad 8

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
| --- | --- | --- |
| `bg` | Hintergrundfarbe | `bg #2563eb` |
| `col` | Textfarbe | `col white` |
| `pad` | Innenabstand (Padding) | `pad 12` oder `pad 12 24` |
| `margin` | Außenabstand | `margin 16` |
| `w` / `h` | Breite / Höhe | `w 200, h 100` |
| `rad` | Eckenradius | `rad 8` |
| `fs` | Schriftgröße | `fs 18` |

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
    Button "OK", pad 10 20, rad 6, bg #2563eb, col white
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
    Frame w 40, h 40, bg #2563eb, rad 4
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

| Property | Beschreibung |
| --- | --- |
| `hor` | Kinder horizontal anordnen |
| `ver` | Kinder vertikal anordnen (Standard) |
| `gap` | Abstand zwischen Kindern |
| `center` | Kinder zentrieren (beide Achsen) |
| `spread` | Kinder an Rändern verteilen |
| `wrap` | Kinder umbrechen wenn kein Platz |

### Icons

Icons kommen von Lucide. Der Name kommt in Anführungszeichen:

```mirror
Frame gap 16, bg #0a0a0a, pad 16, rad 8

  // Lucide Icons (Standard)
  Frame hor, gap 16, bg #1a1a1a, pad 12, rad 6
    Icon "check", ic #10b981, is 24
    Icon "x", ic #ef4444, is 24
    Icon "settings", ic #888, is 24
    Icon "user", ic #2563eb, is 24

  // fill = ausgefüllte Variante
  Frame hor, gap 16, bg #1a1a1a, pad 12, rad 6
    Icon "heart", ic #ef4444, is 24
    Icon "heart", ic #ef4444, is 24, fill

  // Icons in Buttons
  Button pad 10 16, rad 6, bg #2563eb, col white
    Frame hor, gap 8, center
      Icon "save", ic white, is 16
      Text "Speichern"
```

| Property | Beschreibung | Beispiel |
| --- | --- | --- |
| `is` | Icon-Größe in Pixel | `is 24` |
| `ic` | Icon-Farbe | `ic #2563eb` |
| `iw` | Strichstärke | `iw 1.5` |
| `fill` | Ausgefüllte Variante | `Icon "heart", fill` |

### Praxisbeispiel: Card

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

**Was passiert hier?**

- Die äußere `Frame` ist die Card mit fester Breite, Hintergrund und Padding
- Der Header kombiniert ein Icon mit zwei Text-Zeilen horizontal (`hor`)
- Die Buttons im Footer sind ebenfalls horizontal angeordnet
- Alles was du gelernt hast – Primitives, Properties, Hierarchie – kommt zusammen

> **Hinweis:** **Nächster Schritt:** Im nächsten Kapitel lernst du, wie du solche Cards als wiederverwendbare **Komponenten** definierst – damit du sie nicht jedes Mal neu schreiben musst.

---

### Das Wichtigste

| Syntax | Bedeutung |
| --- | --- |
| `Element "Text", prop value` | Grundsyntax |
| `Frame, Text, Button, Input` | Primitives |
| `bg, col, pad, rad, w, h, fs` | Styling |
| `hor, ver, gap, center, spread` | Layout |
| `2 Leerzeichen Einrückung` | Kind-Element |
| `Frame props; Kind1; Kind2` | Kurzschreibweise |


---

## Wiederverwendbare Komponenten

*Styles einmal definieren, überall verwenden*

In diesem Kapitel lernst du, wie du eigene Komponenten erstellst. Das Kernkonzept: **Mit `:` definierst du, ohne `:` verwendest du.** Diese Regel gilt überall – für Komponenten, für Variationen, für Kind-Komponenten.

### Das Problem: Wiederholung

Wenn du mehrere Buttons mit dem gleichen Styling brauchst, musst du alles wiederholen:

```mirror
Frame hor, gap 8, bg #0a0a0a, pad 16, rad 8
  Button "Speichern", pad 10 20, rad 6, bg #2563eb, col white
  Button "Abbrechen", pad 10 20, rad 6, bg #2563eb, col white
  Button "Löschen", pad 10 20, rad 6, bg #2563eb, col white
```

Das ist mühsam und fehleranfällig. Änderst du das Styling, musst du es überall anpassen. Besser: Eine Komponente definieren.

### Komponenten definieren

Mit einem **Doppelpunkt nach dem Namen** definierst du eine wiederverwendbare Komponente. Bei der Verwendung lässt du den Doppelpunkt weg:

```mirror
// Definition: Name endet mit :
Btn: pad 10 20, rad 6, bg #2563eb, col white

// Verwendung: Name ohne :
Frame hor, gap 8, bg #0a0a0a, pad 16, rad 8
  Btn "Speichern"
  Btn "Abbrechen"
  Btn "Löschen"
```

Die Komponente `Btn:` speichert alle Properties. Bei `Btn "Text"` werden diese Properties angewendet und der Text eingefügt.

| Syntax | Bedeutung |
| --- | --- |
| `Name:` | Komponente definieren |
| `Name` | Komponente verwenden |

### Properties überschreiben

Bei der Verwendung kannst du einzelne Properties überschreiben. Die übrigen bleiben erhalten:

```mirror
Btn: pad 10 20, rad 6, bg #2563eb, col white

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
  Button "Aktion", pad 8 16, rad 6, bg #2563eb, col white
```

`Card:` definiert nur den Container (Hintergrund, Padding, Radius, Gap). Bei der Verwendung fügst du beliebige Kinder hinzu – Text, Buttons, weitere Frames, was immer du brauchst.

### Variationen als Komponenten

Du hast gesehen, wie du Properties bei der Verwendung überschreibst (`Btn "Rot", bg #333`). Das funktioniert gut für Einzelfälle. Aber was, wenn du dieselbe Variation mehrmals brauchst?

```mirror
Btn: pad 10 20, rad 6, bg #2563eb, col white

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
PrimaryBtn as Btn: bg #2563eb, col white
DangerBtn as Btn: bg #ef4444, col white
GhostBtn as Btn: bg transparent, col #888, bor 1, boc #333

Frame hor, gap 8, bg #0a0a0a, pad 16, rad 8
  PrimaryBtn "Speichern"
  DangerBtn "Löschen"
  GhostBtn "Abbrechen"
```

`DangerBtn as Btn:` bedeutet: "DangerBtn ist ein Btn, aber mit rotem Hintergrund." Alle drei Varianten erben `pad 10 20, rad 6, cursor pointer` von `Btn`.

> **Hinweis:** **Tipp:** Du kannst auch direkt von Primitives erben. `PrimaryBtn as Button: bg #2563eb` erzeugt einen Button mit allen Standard-Button-Eigenschaften plus blauem Hintergrund.

| Syntax | Bedeutung |
| --- | --- |
| `DangerBtn as Btn:` | DangerBtn erbt von Btn |
| `PrimaryBtn as Button:` | Von Primitive erben |
| `DangerBtn "Text"` | DangerBtn verwenden |

### Komplexe Komponenten

Bisher waren unsere Komponenten einfach: Ein Element mit Properties (`Btn: pad 10 20, bg #2563eb`). Aber eine Komponente kann beliebig komplex sein – eine ganze Struktur mit mehreren Kindern. Stell dir einen Footer vor:

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

| Syntax | Bedeutung |
| --- | --- |
| `Title:` in Definition | Kind-Komponente definieren |
| `Title "Text"` bei Verwendung | Kind-Komponente befüllen |

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
    Action: pad 8 16, rad 6, bg #2563eb, col white

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

| Syntax | Bedeutung |
| --- | --- |
| `Btn:` | Komponente definieren |
| `Btn "OK"` | Komponente verwenden |
| `Btn "OK", bg #333` | Properties überschreiben |
| `Card` + Kinder | Kinder hinzufügen |
| `Title:` in Komponente | Kind-Komponente definieren |
| `Title "Text"` | Kind-Komponente befüllen |
| `DangerBtn as Btn:` | Variation als Komponente |


---

## Design Tokens

*Werte zentral definieren und überall verwenden*

Im letzten Kapitel hast du gelernt, Struktur zu abstrahieren – mit Komponenten. Dieses Kapitel zeigt, wie du **Werte** abstrahierst: Farben, Abstände, Radien. Statt Hex-Codes überall zu wiederholen, definierst du sie einmal als Token.

### Das Problem: Magische Werte

Schau dir diesen Code an – die Farbe `#2563eb` taucht dreimal auf:

```mirror
Btn: pad 10 20, rad 6, bg #2563eb, col white
Link: col #2563eb, underline
Badge: bg #2563eb, col white, pad 4 8, rad 4, fs 12

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
primary.bg: #2563eb

// Token verwenden (mit $, ohne Suffix)
Btn: bg $primary, col white, pad 10 20, rad 6

Frame hor, gap 8, bg #0a0a0a, pad 16, rad 8
  Btn "Speichern"
  Btn "Senden"
  Btn "Weiter"
```

**Was passiert hier?**

- `primary.bg: #2563eb` – definiert einen Token namens "primary" für Hintergrundfarben
- `bg $primary` – verwendet den Token (`$` bedeutet "hole den Wert")
- Änderst du jetzt `primary.bg` auf `#10b981`, werden alle drei Buttons grün

> **Hinweis:** **Die Regel:** Definition ohne `$`, Verwendung mit `$`. Das `$` ist ein Platzhalter – "hier den Wert einsetzen".

### Warum Suffixe?

Der Suffix sagt, wofür der Token gedacht ist:

| Suffix | Bedeutung | Beispiel |
| --- | --- | --- |
| `.bg` | Hintergrundfarbe | `primary.bg: #2563eb` |
| `.col` | Textfarbe | `muted.col: #888` |
| `.boc` | Border-Farbe | `border.boc: #333` |
| `.rad` | Radius | `card.rad: 8` |
| `.pad` | Padding | `space.pad: 16` |
| `.gap` | Abstand | `space.gap: 12` |

> **Hinweis:** **Warum das hilft:** Das ermöglicht intelligentes Autocomplete. Tippst du `bg $`, zeigt die IDE nur Tokens mit `.bg` Suffix. So siehst du sofort, welche Tokens für Hintergrundfarben gedacht sind.

Hier ein Beispiel mit mehreren Token-Typen:

```mirror
primary.bg: #2563eb
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

Der wichtigste Tipp: Benenne Tokens nach ihrer *Bedeutung*, nicht nach ihrem Wert. Statt `$blue` schreib `$primary` – das beschreibt die Funktion, nicht die Farbe.

Warum? Deine Komponenten wissen dann nicht, dass "primary" gerade blau ist – sie wissen nur, dass es die Hauptfarbe ist. Willst du später die Primärfarbe ändern, änderst du nur den Token.

```mirror
// SEMANTISCHE TOKENS – benenne nach Bedeutung
primary.bg: #2563eb
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

> **Hinweis:** **Syntax-Unterschied:** Einzelne Tokens haben einen Suffix (`primary.bg: #2563eb`), Property Sets haben keinen (`cardstyle: bg #1a1a1a, pad 16`). Das macht den Unterschied klar: Suffix = ein Wert, kein Suffix = mehrere Properties.

#### Property Sets mit Tokens kombinieren

Property Sets können auch andere Tokens referenzieren:

```mirror
// Einzelne Tokens
primary.bg: #2563eb
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

Am Ende sind die Instanzen komplett sauber – du siehst nur noch, *was* angezeigt wird, nicht *wie*:

```mirror
// 1. TOKENS – Werte zentral definieren
btn.bg: #2563eb
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

| Syntax | Bedeutung |
| --- | --- |
| `primary.bg: #2563eb` | Token definieren (mit Suffix) |
| `bg $primary` | Token verwenden (mit `$`) |
| `primary` statt `blue` | Semantisch benennen |

#### Property Sets (Style-Bündel)

| Syntax | Bedeutung |
| --- | --- |
| `cardstyle: bg #1a1a1a, pad 16, rad 8` | Property Set definieren (ohne Suffix) |
| `Frame $cardstyle` | Alle Properties auf einmal anwenden |
| `heading: fs 24, weight bold` | Typografie-Stile bündeln |

**Drei Stufen:** Tokens → Komponenten → Instanzen

Tokens abstrahieren Werte, Property Sets bündeln Styles, Komponenten abstrahieren Struktur. Zusammen ergeben sie ein konsistentes Design System.


---

## Layout

*Flex, Grid und Positionierung*

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
    Box "1", bg #2563eb
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
  Frame w full, h 40, bg #2563eb, rad 4, center
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

| Ausrichtung | Beschreibung |
| --- | --- |
| `center` | Beide Achsen zentrieren |
| `ver-center` | Nur vertikal zentrieren (bei `hor`) |
| `hor-center` | Nur horizontal zentrieren (bei `ver`) |
| `spread` | Kinder an Rändern verteilen |

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
Box: w 60, h 40, bg #2563eb, rad 4, center

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
  Frame w 12, bg #2563eb, rad 4, center
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
  Frame x 1, y 1, w 12, h 2, bg #2563eb, rad 4, center
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

### Stacked Layout

Das dritte Layout-System ist `stacked` – es stapelt alle Kinder übereinander an derselben Position. Das ist ideal für Overlays, Badges oder absolut positionierte Elemente. Die Positionierung erfolgt mit `x` und `y` in Pixel – genau wie in Figma:

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
    Frame w 44, h 44, bg #2563eb, rad 99, center
      Text "TS", col white, fs 14, weight 500
    Status
```

---

### Zusammenfassung

| System | Verwendung |
| --- | --- |
| **Flex** | Fließende Layouts (Navigation, Cards) |
| **Grid** | Strukturierte Raster (Dashboards) |
| **Stacked** | Überlagerungen (Badges, Overlays) |

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

*Farben, Typografie, Borders und Effekte*

In den vorherigen Kapiteln hast du Layout und Struktur kennengelernt. Dieses Kapitel zeigt alle **visuellen Properties** – von Farben über Typografie bis zu Effekten. Es ist als Referenz gedacht: Schau hier nach, wenn du wissen willst, wie ein bestimmter Effekt funktioniert.

### Farben

Mirror unterstützt verschiedene Farbformate. Am häufigsten verwendest du Hex-Farben (`#2563eb`), aber auch benannte Farben und rgba sind möglich:

```mirror
Frame hor, gap 8, wrap, bg #0a0a0a, pad 16, rad 8
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

**Was passiert hier?**

- `#2563eb` – Hex-Farbe (6 Zeichen für RGB)
- `white`, `black` – benannte CSS-Farben funktionieren direkt
- `rgba(37,99,235,0.5)` – Farbe mit 50% Transparenz
- `#2563eb88` – Hex mit Alpha-Kanal (8 Zeichen, die letzten zwei sind Transparenz)

> **Hinweis:** **Tipp:** Für transparente Farben ist `#rrggbbaa` kürzer als `rgba()`. Die letzten zwei Hex-Zeichen geben die Transparenz an: `ff` = 100% sichtbar, `00` = unsichtbar.

### Gradients

Farbverläufe machen UIs lebendiger. In Mirror verwendest du `grad` für horizontale Verläufe, `grad-ver` für vertikale, oder `grad N` für einen bestimmten Winkel:

```mirror
Frame w 400, gap 8, bg #0a0a0a, pad 16, rad 8
  // Horizontal (Standard)
  Frame w full, h 50, rad 8, bg grad #2563eb #7c3aed

  // Vertikal
  Frame w full, h 50, rad 8, bg grad-ver #f59e0b #ef4444

  // Mit Winkel (45°)
  Frame w full, h 50, rad 8, bg grad 45 #10b981 #2563eb

  // Drei Farben
  Frame w full, h 50, rad 8, bg grad #10b981 #2563eb #7c3aed
```

**Was passiert hier?**

- `grad #a #b` – horizontaler Verlauf von links nach rechts
- `grad-ver #a #b` – vertikaler Verlauf von oben nach unten
- `grad 45 #a #b` – Verlauf im 45°-Winkel
- `grad #a #b #c` – Verlauf mit drei Farben (funktioniert auch mit mehr)

```mirror
Frame bg #1a1a1a, pad 20, rad 8, gap 8
  Text "Gradient Text", fs 24, weight bold, col grad #2563eb #7c3aed
  Text "Vertical Gradient", fs 24, weight bold, col grad-ver #f59e0b #ef4444
```

### Borders

Borders bestehen aus zwei Properties: `bor` (Breite in Pixel) und `boc` (Farbe). Beide zusammen ergeben den sichtbaren Rahmen:

```mirror
Frame hor, gap 12, bg #0a0a0a, pad 16, rad 8
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

> **Hinweis:** **Praxis-Tipp:** Ein subtiler 1px-Border (`bor 1, boc #333`) auf dunklem Hintergrund gibt Elementen Tiefe, ohne aufdringlich zu wirken. Das ist ein häufig genutztes Pattern für Cards und Inputs.

### Border Radius

Von eckig bis rund:

```mirror
Frame hor, gap 12, bg #0a0a0a, pad 16, rad 8
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
  Frame w 60, h 60, bg #2563eb, rad 8, center, opacity 1
    Text "1", col white, fs 11
  Frame w 60, h 60, bg #2563eb, rad 8, center, opacity 0.7
    Text "0.7", col white, fs 11
  Frame w 60, h 60, bg #2563eb, rad 8, center, opacity 0.4
    Text "0.4", col white, fs 11
  Frame w 60, h 60, bg #2563eb, rad 8, center, opacity 0.2
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

**Was passiert hier?**

- **Filled:** Volle Hintergrundfarbe – für primäre Aktionen
- **Outline:** Nur Border, kein Hintergrund – für sekundäre Aktionen
- **Subtle:** Transparenter Hintergrund mit `bg #2563eb22` (22 = 13% Opacity)
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

*Wie Elemente ihr Aussehen ändern*

Bisher haben wir statische UIs gebaut. Jetzt lernen wir, wie Elemente ihr Aussehen ändern können – bei Hover, bei Klick, oder wenn etwas anderes passiert. Das Konzept dahinter: **States**.

### Das Konzept: States

Ein **State** beschreibt, wie ein Element in einem bestimmten Zustand aussieht. Eine **Funktion** löst den Wechsel aus:

```mirror
Btn: pad 12 24, rad 6, bg #333, col white, cursor pointer, toggle()
  on:
    bg #2563eb

Btn "Klick mich"
```

Der Button startet grau. Bei Klick wird er blau. Nochmal klicken – wieder grau.

| Syntax | Bedeutung |
| --- | --- |
| `on:` | **State** – definiert das Aussehen |
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

| System-State | Wann aktiv? |
| --- | --- |
| `hover:` | Maus ist über dem Element |
| `focus:` | Element hat Tastatur-Fokus |
| `active:` | Während Mausklick gedrückt |
| `disabled:` | Element ist deaktiviert |

#### Focus und Disabled

Besonders wichtig für Formulare:

```mirror
Field: bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w 200
  focus:
    boc #2563eb
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
    bg #2563eb
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

Im Base-State zeigt der Button "Mehr zeigen" mit Pfeil nach unten. Im `open`-State wird *alles* ausgetauscht: anderer Text, anderes Icon.

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

Bei Tabs oder Radio-Buttons soll immer nur *ein* Element aktiv sein. Wenn du eines aktivierst, werden alle anderen automatisch deaktiviert:

```mirror
Tab: pad 12 20, rad 6, bg #333, col #888, cursor pointer, exclusive()
  selected:
    bg #2563eb
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
Dropdown: Frame w 200, stacked, bind value
  Trigger: Button pad 12, bg #1a1a1a, col white, rad 6, hor, spread, w full, toggle()
    Text $value || "Auswählen..."
    Icon "chevron-down", ic #888, is 16
    open:
      Icon "chevron-up", ic #888, is 16
  Options: Frame y 44, w full, bg #1a1a1a, rad 6, pad 4, hidden, z 10
    Trigger.open:
      visible
  Option: Frame pad 10, rad 4, col #888, cursor pointer, w full, exclusive()
    hover:
      bg #333
    on:
      col white

Dropdown
  Option "Berlin"
  Option "Hamburg"
  Option "München"
```

**Was passiert hier?**

- `bind value` auf dem Dropdown-Container – speichert den aktiven Wert
- `$value || "Auswählen..."` – zeigt den Wert oder Fallback-Text
- `exclusive()` auf Option – nur eine Option kann aktiv sein
- Bei Klick auf eine Option wird deren Textinhalt in `$value` gespeichert

> **Hinweis:** **bind + exclusive() = Custom Select.** Das ist die Basis für eigene Dropdown-Komponenten. Für Standard-Selects mit Accessibility und Keyboard-Navigation gibt es die fertige `Select` Zag-Komponente (siehe Eingabe).

### Auf andere Elemente reagieren

Manchmal soll ein Element sein Aussehen ändern, wenn ein *anderes* Element seinen State wechselt. Klassisches Beispiel: Ein Menü wird sichtbar, wenn ein Button aktiviert wird.

Dafür brauchst du zwei Dinge:

- Gib dem steuernden Element einen **Namen** mit `name`
- Referenziere diesen Namen mit `Name.state:`

```mirror
Frame gap 12, bg #0a0a0a, pad 16, rad 8
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
    boc #2563eb

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

| Event | Beschreibung |
| --- | --- |
| `toggle()` | Bei Klick (Default) |
| `onenter toggle()` | Bei Enter-Taste |
| `onescape toggle()` | Bei Escape-Taste |
| `onspace toggle()` | Bei Leertaste |
| `onkeydown arrow-up` | Bei Pfeiltaste hoch |

---

### Zusammenfassung

**States** definieren das Aussehen, **Funktionen** lösen den Wechsel aus.

#### System-States (automatisch)

| State | Wann aktiv? |
| --- | --- |
| `hover:` | Maus über Element |
| `focus:` | Tastatur-Fokus |
| `active:` | Während Klick |
| `disabled:` | Element deaktiviert |

#### Custom States (manuell)

| Syntax | Bedeutung |
| --- | --- |
| `on:` | Custom State definieren (Name frei wählbar) |
| `toggle()` | State bei Klick wechseln |
| `exclusive()` | Nur einer aktiv (Geschwister aus) |
| `bind varName` | Aktiven Wert in Variable speichern |
| `Btn "Text", on` | Instanz startet im State |

#### Cross-Element

| Syntax | Bedeutung |
| --- | --- |
| `name MenuBtn` | Element benennen |
| `MenuBtn.open:` | Reagieren wenn MenuBtn in "open" |

#### Events

| Event | Beschreibung |
| --- | --- |
| `toggle()` | Bei Klick (Default) |
| `onenter fn()` | Bei Enter-Taste |
| `onescape fn()` | Bei Escape-Taste |


---

## Animationen

*Bewegung und Übergänge*

Im letzten Kapitel hast du States kennengelernt – wie Elemente ihr Aussehen ändern. Dieses Kapitel zeigt, wie diese Änderungen **animiert** werden: **Transitions** für sanfte Übergänge, **Presets** für typische Effekte (fade, bounce, shake), und **Enter/Exit** für Erscheinen und Verschwinden.

### Transitions: Sanfte Übergänge

Ohne Transition springen Änderungen sofort. Mit Transition gleiten sie smooth. Du fügst einfach eine **Dauer** zum State hinzu:

```mirror
// Ohne Transition: springt
BtnHart: pad 12 24, rad 6, bg #333, col white, cursor pointer
  hover:
    bg #2563eb

// Mit Transition: gleitet
BtnSoft: pad 12 24, rad 6, bg #333, col white, cursor pointer
  hover 0.2s:
    bg #2563eb

Frame hor, gap 12
  BtnHart "Ohne"
  BtnSoft "Mit 0.2s"
```

**Was passiert hier?**

- `hover:` — Änderung springt sofort
- `hover 0.2s:` — Änderung gleitet über 200 Millisekunden
- Die Dauer macht den Unterschied. Alles andere bleibt gleich.

> **Hinweis:** **Faustregel für Dauer:** 100-200ms für Hover-Effekte, 200-300ms für State-Wechsel, 300-500ms für größere Übergänge. Im Zweifel lieber zu schnell als zu langsam.

### Easing: Wie sich Bewegung anfühlt

Easing bestimmt die Beschleunigungskurve. Du kannst es nach der Dauer angeben:

```mirror
Btn: pad 12 24, rad 6, bg #333, col white, cursor pointer

// Verschiedene Easings
Frame gap 8
  Btn "ease-out"
    hover 0.3s ease-out:
      bg #2563eb
  Btn "ease-in"
    hover 0.3s ease-in:
      bg #2563eb
  Btn "ease-in-out"
    hover 0.3s ease-in-out:
      bg #2563eb
```

**Was passiert hier?**

- `ease-out` — startet schnell, endet langsam (gut für Erscheinen)
- `ease-in` — startet langsam, endet schnell (gut für Verschwinden)
- `ease-in-out` — beides kombiniert (gut für Hin-und-her)

| Easing | Gefühl | Typische Verwendung |
| --- | --- | --- |
| `ease` | Natürlich (Default) | Allgemein |
| `ease-out` | Langsames Ende | Elemente erscheinen |
| `ease-in` | Langsamer Start | Elemente verschwinden |
| `ease-in-out` | Beides | Hin-und-her |
| `linear` | Gleichmäßig | Spinner, Fortschritt |

### Animation Presets

Für typische Bewegungen gibt es vordefinierte Animationen. Du schreibst einfach `anim` mit dem Namen:

```mirror
Frame hor, gap 12, wrap, bg #0a0a0a, pad 16, rad 8
  Frame w 60, h 60, bg #2563eb, rad 8, center, anim pulse
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

| Preset | Effekt | Typische Verwendung |
| --- | --- | --- |
| `fade-in` | Einblenden | Elemente erscheinen |
| `fade-out` | Ausblenden | Elemente verschwinden |
| `slide-in` | Reingleiten | Panels, Menüs |
| `slide-out` | Rausgleiten | Panels schließen |
| `scale-in` | Reinzoomen | Modals, Popups |
| `scale-out` | Rauszoomen | Modals schließen |
| `bounce` | Hüpfen | Bestätigung, Erfolg |
| `pulse` | Pulsieren | Hinweis, "neu" |
| `shake` | Schütteln | Fehler, ungültig |
| `spin` | Drehen | Loading |

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

### Enter und Exit

Oft soll ein Element anders animieren wenn es **erscheint** vs wenn es **verschwindet**. Dafür gibt es `enter:` und `exit:`:

```mirror
Frame gap 12, bg #0a0a0a, pad 16, rad 8
  Button name Btn, "Hinweis zeigen", pad 10 20, bg #2563eb, col white, rad 6, toggle()
    open:
      "Hinweis verstecken"

  Frame bg #1a1a1a, pad 16, rad 8, hidden
    Btn.open:
      visible
      enter: fade-in
      exit: fade-out
    Text "Dies ist ein Hinweis mit Animation.", col #ccc
```

`enter: fade-in` animiert beim Erscheinen, `exit: fade-out` beim Verschwinden. Das fühlt sich natürlicher an als abruptes Ein-/Ausblenden.

> **Hinweis:** **Konsistenz:** Gleiche Aktionen, gleiche Animationen. Wenn ein Element mit `fade-in` erscheint, sollten ähnliche Elemente das auch tun.

### Praktisch: Slide-In Menü

Ein klassisches Pattern — Menü gleitet von der Seite rein:

```mirror
Frame hor, gap 12, bg #0a0a0a, pad 16, rad 8
  Button name Btn, "Menü", pad 10 20, bg #333, col white, rad 6, toggle()
    open:
      bg #2563eb

  Frame bg #1a1a1a, pad 12, rad 8, gap 4, w 160, hidden
    Btn.open:
      visible
      enter: slide-in
      exit: slide-out
    Text "Dashboard", col white, pad 8 12
    Text "Einstellungen", col white, pad 8 12
    Text "Logout", col #888, pad 8 12
```

`slide-in` lässt das Menü reingleiten, `slide-out` lässt es wieder verschwinden. Das zeigt visuell: "Das Menü kommt von irgendwo und geht wieder dorthin."

### Praktisch: Loading Spinner

Ein einfacher Spinner mit `spin`:

```mirror
Frame hor, ver-center, gap 12, bg #1a1a1a, pad 16, rad 8
  Icon "loader-2", ic #2563eb, is 24, anim spin
  Text "Lädt...", col #888
```

`anim spin` auf dem Icon dreht es endlos. Das Lucide-Icon "loader-2" ist genau dafür designed.

---

### Zusammenfassung

#### Transitions

| Syntax | Bedeutung |
| --- | --- |
| `hover 0.2s:` | State mit 200ms Übergang |
| `hover 0.3s ease-out:` | Mit Easing-Funktion |

#### Animation Presets

| Preset | Effekt |
| --- | --- |
| `fade-in` / `fade-out` | Ein-/Ausblenden |
| `slide-in` / `slide-out` | Rein-/Rausgleiten |
| `scale-in` / `scale-out` | Rein-/Rauszoomen |
| `bounce` | Hüpfen (Erfolg) |
| `pulse` | Pulsieren (Aufmerksamkeit) |
| `shake` | Schütteln (Fehler) |
| `spin` | Drehen (Loading) |

#### Enter/Exit

| Syntax | Wann |
| --- | --- |
| `enter: fade-in` | Beim Erscheinen |
| `exit: fade-out` | Beim Verschwinden |

#### Easing

| Easing | Gefühl |
| --- | --- |
| `ease` | Natürlich (Default) |
| `ease-out` | Erscheinen |
| `ease-in` | Verschwinden |
| `ease-in-out` | Hin-und-her |


---

## Functions

*Eingebaute und eigene Funktionen*

In Kapitel 6 hast du `toggle()` und `exclusive()` kennengelernt – zwei eingebaute Funktionen für State-Wechsel. Mirror bietet weitere **eingebaute Funktionen** für typische UI-Patterns. Wenn die nicht reichen, schreibst du eigene.

### Syntax: Funktionen als Properties

Funktionen werden direkt als Properties geschrieben – genau wie `bg` oder `pad`. Der Unterschied: Sie lösen Aktionen aus statt Styles zu setzen.

```mirror
// Kurzschreibweise – Klick ist Default
Btn: Button pad 10 20, rad 6, bg #333, col white, toggle()
  on:
    bg #2563eb

Btn "An/Aus"
```

Wenn du eine Funktion als Property schreibst, wird sie automatisch bei **Klick** ausgeführt. Das ist der häufigste Fall – deshalb ist Klick der Default.

| Syntax | Bedeutung |
| --- | --- |
| `Button "X", toggle()` | Funktion bei Klick (Kurzform) |
| `Button "X", show(Menu)` | Element zeigen bei Klick |
| `Button "X", toggle(), show(Panel)` | Mehrere Funktionen |

> **Hinweis:** **Faustregel:** Kurzschreibweise für Klick-Events (99% der Fälle). Für andere Events wie Enter oder Escape gibt es Shorthands (`onenter`, `onescape`) – siehe States.

### Eingebaute Funktionen: Übersicht

Mirror hat eingebaute Funktionen für die häufigsten UI-Patterns. Du musst sie nicht importieren – sie sind einfach da:

| Kategorie | Funktion | Was sie tut |
| --- | --- | --- |
| **State** | `toggle()` | State wechseln (an/aus oder durch mehrere cyclen) |
| `exclusive()` | Diesen aktivieren, alle Geschwister deaktivieren |  |
| **Visibility** | `show(Element)` | Element sichtbar machen |
| `hide(Element)` | Element verstecken |  |

Für **Overlays** (Dialoge, Dropdowns, Tooltips) gibt es spezialisierte Zag-Komponenten – siehe Overlays. Für **Navigation** (Tabs, SideNav) siehe Navigation.

Diese Funktionen decken 90% der typischen Interaktionen ab. Für komplexere Logik (API-Calls, Validierung, Berechnungen) schreibst du eigene Funktionen – dazu später mehr.

### show() und hide(): Sichtbarkeit steuern

Mit `show(Element)` und `hide(Element)` machst du Elemente sichtbar oder versteckst sie. Das ist nützlich für:

- Info-Boxen die bei Klick erscheinen
- Menüs die sich öffnen und schließen
- Hinweise die nach einer Aktion angezeigt werden

```mirror
Frame gap 12, bg #0a0a0a, pad 16, rad 8
  Button "Info anzeigen", pad 10 20, bg #2563eb, col white, rad 6, show(InfoBox)

  Frame name InfoBox, hidden, bg #1a1a1a, pad 16, rad 8, gap 8
    Text "Hier sind weitere Informationen.", col #ccc, fs 14
    Button "Schließen", pad 8 16, bg #333, col white, rad 4, hide(InfoBox)
```

Was passiert hier?

- `name InfoBox` gibt dem Element einen Namen, damit wir es referenzieren können
- `hidden` macht das Element initial unsichtbar
- `show(InfoBox)` macht es sichtbar wenn der Button geklickt wird
- `hide(InfoBox)` versteckt es wieder

> **Hinweis:** **Wichtig:** Das Ziel-Element braucht einen `name`. Ohne Namen kann die Funktion das Element nicht finden. Der Name muss eindeutig sein – wie eine ID.

### Praktisch: Aufklappbares Menü

Ein klassisches Pattern: Ein Button öffnet ein Menü, ein "Schließen"-Button (oder Klick außerhalb) versteckt es wieder. So baust du das mit `show()` und `hide()`:

```mirror
Frame gap 8, bg #0a0a0a, pad 16, rad 8
  Button "Menü öffnen", pad 10 20, bg #333, col white, rad 6, show(Menu)

  Frame name Menu, hidden, bg #1a1a1a, pad 8, rad 8, gap 2, w 180
    Button "Profil", pad 10 16, bg transparent, col white, rad 4, w full
      hover:
        bg #333
    Button "Einstellungen", pad 10 16, bg transparent, col white, rad 4, w full
      hover:
        bg #333
    Divider bg #333, margin 4 0
    Button "Schließen", pad 10 16, bg #333, col white, rad 4, w full, hide(Menu)
```

Das Menü startet `hidden`. Der "Menü öffnen"-Button macht es sichtbar, der "Schließen"-Button versteckt es wieder. Einfach und klar.

> **Hinweis:** **Für echte Menüs:** In Produktion würdest du die `Menu`-Komponente aus Overlays verwenden – die hat bereits Positionierung, Tastatur-Navigation und "Klick außerhalb schließt". Hier zeigen wir das manuelle Pattern zum Verständnis.

### Funktionen kombinieren

Du kannst mehrere Funktionen bei einem Klick ausführen. Einfach alle hintereinander schreiben:

```mirror
Frame gap 8, bg #0a0a0a, pad 16, rad 8
  Button "Filter", name FilterBtn, pad 10 20, bg #333, col white, rad 6, toggle(), show(FilterPanel)
    open:
      bg #2563eb

  Frame name FilterPanel, hidden, bg #1a1a1a, pad 16, rad 8, gap 12
    Text "Filter-Optionen", col white, fs 14, weight 500
    Frame gap 8
      Button "Aktiv", pad 8 12, bg #252525, col white, rad 4
      Button "Archiviert", pad 8 12, bg #252525, col white, rad 4
    Button "Schließen", pad 8 16, bg #333, col white, rad 4, hide(FilterPanel), toggle(FilterBtn)
```

Was passiert hier?

- Der "Filter"-Button hat **zwei** Funktionen: `toggle()` und `show(FilterPanel)`
- `toggle()` wechselt den State des Buttons (grau ↔ blau)
- `show(FilterPanel)` zeigt das Panel
- Der "Schließen"-Button macht das Gegenteil: `hide(FilterPanel)` und `toggle(FilterBtn)`

> **Hinweis:** **Reihenfolge:** Die Funktionen werden in der Reihenfolge ausgeführt, wie du sie schreibst. Meistens ist die Reihenfolge egal, aber bei komplexer Logik kann es wichtig sein.

### Eigene Funktionen: UI steuern

Die eingebauten Funktionen (`toggle`, `show`, `hide`) decken die häufigsten Fälle ab. Aber manchmal brauchst du mehr Kontrolle — zum Beispiel einen Wert aus einem Input lesen und woanders anzeigen, oder mehrere Elemente gleichzeitig steuern.

Dafür schreibst du eigene Funktionen. Das Prinzip: **Du greifst auf Elemente zu und änderst ihre Eigenschaften.**

#### Elemente ansprechen

Jedes Element mit einem `name` kannst du in einer Funktion ansprechen:

```mirror
// Im Mirror-UI
Input name EmailInput, placeholder "E-Mail"
Button "Absenden", absenden()

// In der Funktion
function absenden()
  wert = EmailInput.value      // Eingabewert lesen
  log(wert)                    // In Konsole ausgeben
```

// Im Mirror-UI Input name EmailInput, placeholder "E-Mail" Button "Absenden", absenden() // In der Funktion function absenden() wert = EmailInput.value // Eingabewert lesen log(wert) // In Konsole ausgeben Der `name` wird zur Referenz. In der Funktion schreibst du einfach `EmailInput.value` um den eingegebenen Text zu lesen.

#### Was du steuern kannst

Jedes UI-Element hat Eigenschaften die du lesen und ändern kannst:

| Eigenschaft | Lesen | Schreiben |
| --- | --- | --- |
| `.state` | Aktueller State | State wechseln |
| `.visible` | Ist sichtbar? | Sichtbarkeit ändern |
| `.value` | Eingabewert (Input) | Wert setzen |
| `.content` | Textinhalt | Text ändern |

#### Beispiel: State ändern

Du kannst den State eines Elements direkt setzen:

```mirror
function aktivieren()
  MeinButton.state = 'active'

function zuruecksetzen()
  MeinButton.state = 'base'       // 'base' ist der Normalzustand
```

#### Beispiel: Eingabe auswerten

Ein häufiges Pattern — Wert aus Input lesen und etwas damit machen:

```mirror
// UI
Input name SucheInput, placeholder "Suchen..."
Button "Suchen", suchen()
Text name Ergebnis, col #888

// Funktion
function suchen()
  begriff = SucheInput.value
  if begriff == ""
    Ergebnis.content = "Bitte Suchbegriff eingeben"
  else
    Ergebnis.content = "Suche nach: " + begriff
```

#### Beispiel: Mehrere Elemente steuern

Eine Funktion kann mehrere Elemente gleichzeitig ändern:

```mirror
function formularZuruecksetzen()
  NameInput.value = ""
  EmailInput.value = ""
  SubmitBtn.state = 'base'
  Hinweis.visible = false
```

#### Für komplexere Logik

Manche Dinge gehen über UI-Steuerung hinaus:

- **API-Calls** — Daten vom Server laden oder speichern
- **Validierung** — E-Mail-Format prüfen, Pflichtfelder checken
- **Berechnungen** — Summen, Durchschnitte, komplexe Logik

Hier arbeitet man typischerweise mit einem Entwickler zusammen. Als Designer definierst du die States und das UI — die Funktion steuert, wann welcher State aktiv wird:

```mirror
// Du definierst die States
SaveBtn as Button: pad 12 24, bg #333, col white, rad 6, save()
  loading:
    bg #666
    "Wird gespeichert..."
  success:
    bg #10b981
    "Gespeichert!"

// Der Entwickler schreibt die Funktion
// Sie setzt element.state = 'loading', macht den API-Call,
// und setzt dann element.state = 'success' oder 'error'
```

// Du definierst die States SaveBtn as Button: pad 12 24, bg #333, col white, rad 6, save() loading: bg #666 "Wird gespeichert..." success: bg #10b981 "Gespeichert!" // Der Entwickler schreibt die Funktion // Sie setzt element.state = 'loading', macht den API-Call, // und setzt dann element.state = 'success' oder 'error' **Zusammenspiel:** Du als Designer bestimmst *wie* jeder State aussieht. Die Funktion bestimmt *wann* welcher State aktiv wird. So könnt ihr unabhängig arbeiten.

> **Hinweis:** **Zusammenspiel:** Du als Designer bestimmst *wie* jeder State aussieht. Die Funktion bestimmt *wann* welcher State aktiv wird. So könnt ihr unabhängig arbeiten.

---

### Zusammenfassung

#### Eingebaute Funktionen

| Funktion | Was sie tut |
| --- | --- |
| `toggle()` | State wechseln (an/aus oder durch mehrere cyclen) |
| `exclusive()` | Diesen aktivieren, alle Geschwister deaktivieren |
| `show(Name)` | Element sichtbar machen |
| `hide(Name)` | Element verstecken |

#### Eigene Funktionen: UI steuern

| Zugriff | Beispiel |
| --- | --- |
| State ändern | `MeinBtn.state = 'active'` |
| Sichtbarkeit | `Hinweis.visible = false` |
| Eingabewert lesen | `wert = MeinInput.value` |
| Text ändern | `Label.content = "Neuer Text"` |

#### Syntax

| Syntax | Bedeutung |
| --- | --- |
| `Button "X", toggle()` | Funktion bei Klick |
| `name MeinElement` | Element benennen (für Zugriff in Funktionen) |
| `toggle(), show(X)` | Mehrere Funktionen kombinieren |


---

## Daten

*Echte Daten statt Platzhalter*

Prototypen werden glaubwürdig, wenn sie mit echten Daten arbeiten – nicht mit "Lorem ipsum" und "Max Mustermann". Mirror trennt UI von Daten: Du designst das Layout einmal, und füllst es mit echten Kundenlisten, Produktdaten oder Nutzerprofilen. Die Daten lassen sich auslagern und jederzeit austauschen – für verschiedene Szenarien, Sprachen oder Test-Cases.

### Einfache Variablen

Eine Variable wird mit Namen und Wert definiert. Bei der Verwendung steht `$` davor – in Anführungszeichen:

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
  Frame hor, gap 12, ver-center, bg #1a1a1a, pad 12, rad 6, margin 0 0 4 0
    Frame w 20, h 20, rad 4, bg $color
    Text "$color", col white
```

**Keine Doppelpunkte nötig** – der Eintrag *ist* der Wert. Sauberer als JSON-Arrays und konsistent mit dem Rest von Mirror.

### Datenobjekte mit Einträgen

Das **Entry-Format** ist die bevorzugte Art, Daten in Mirror zu definieren. Jeder Eintrag hat einen Namen und enthält `key: value` Paare:

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
  Frame hor, gap 12, bg #1a1a1a, pad 12, rad 6, margin 0 0 4 0
    Text "$user.name", col white, weight 500
    Text "$user.role", col #888, fs 12
```

**Vorteile des Entry-Formats:**

- Lesbar wie YAML/JSON
- Einträge haben eindeutige IDs (`max`, `anna`, `tom`)
- Direkt adressierbar: `$users.max.name`

### Datenobjekte

Für strukturierte Daten mit mehreren Attributen: Definiere ein Datenobjekt mit Einrückung:

```mirror
user:
  name: "Max Mustermann"
  email: "max@example.com"
  active: true

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "$user.name", col white, weight 500
  Text "$user.email", col #888
  Text $user.active ? "Aktiv" : "Inaktiv", col #10b981
```

#### Attribut-Typen

Datenobjekte unterstützen verschiedene Werttypen:

```mirror
profile:
  name: "Max"
  age: 25
  premium: true

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "$profile.name", col white
  Text "Alter: $profile.age", col #888
  Text $profile.premium ? "Premium" : "Free", col #10b981
```

| Typ | Beispiel |
| --- | --- |
| String | `name: "Max"` |
| Zahl | `age: 25` |
| Boolean | `active: true` |

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
  Frame gap 4, margin 8 0 0 0
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
  Text "$customers.max.plan", col #2563eb
```

### Über Einträge iterieren

Mit `each` über alle Einträge einer `.data`-Datei:

```mirror
each customer in $customers
  Frame hor, spread, ver-center, bg #1a1a1a, pad 12, rad 6, margin 0 0 4 0
    Frame gap 2
      Text "$customer.name", col white, weight 500
      Text "$customer.email", col #888, fs 12
    Text "$customer.plan", col #2563eb, fs 12
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

Frame gap 8, bg #1a1a1a, pad 16, rad 8 Text "$tasks.task1.title", col white, weight 500 Text "Zuständig: $tasks.task1.assignee.name", col #888 `$tasks.task1.assignee` ist der User `$users.toni`. Mit `.name` greifst du auf dessen Attribute zu.

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
  Frame gap 4, margin 8 0 0 0
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
      Text "$$product.price", col #2563eb, fs 24, weight 700
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
  Button "Anmelden", bg #2563eb, col white, pad 10 20, rad 6
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
    Button "Kaufen", bg #2563eb, col white, pad 8 16, rad 4
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
  Button "Absenden", bg #2563eb, col white, pad 10 20, rad 6
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

Button "Status", bg active ? #2563eb : #333, col white, pad 10 20, rad 6
```

Das entspricht: "Wenn `active` wahr ist, nimm `#2563eb`, sonst `#333`."

#### Weitere Beispiele

```mirror
visible: true
done: false
count: 3

Frame gap 12, bg #0a0a0a, pad 16, rad 8
  // Opacity basierend auf Sichtbarkeit
  Frame w 100, h 50, bg #2563eb, rad 6, opacity visible ? 1 : 0.3

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
primary.bg: #2563eb
muted.bg: #333

Button "Themed", bg theme === "dark" ? $primary : $muted, col white, pad 10 20, rad 6
```

### Block vs. Inline

| Syntax | Verwendung |
| --- | --- |
| `if` / `else` Block | Ganze Elemente ein-/ausblenden |
| `condition ? a : b` | Einzelne Property-Werte |

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
      Frame w 36, h 36, rad 99, bg #2563eb, center
        Text $user.avatar ? "$user.avatar" : "$user.name[0]", col white, fs 14
      Frame gap 2
        Text "$user.name", col white, fs 14, weight 500
        Text "Online", col #10b981, fs 11
  else
    Button "Anmelden", bg #2563eb, col white, pad 8 16, rad 6
```

---

### Zusammenfassung

#### Variablen & Daten

| Konzept | Syntax |
| --- | --- |
| Variable definieren | `name: "Wert"` |
| In Text verwenden | `Text "$name"` |
| String-Interpolation | `Text "Hallo $name!"` |
| Arithmetik | `$a * $b` |
| Datenobjekt | `users:` + eingerückte Einträge |
| Eintrag adressieren | `Text "$users.max.name"` |
| Iteration | `each user in $users` |
| Loop-Variable | `Text "$user.name"` |
| Relation | `assignee: $users.toni` |

#### Bedingungen

| Syntax | Beispiel |
| --- | --- |
| `if bedingung` | `if loggedIn` |
| `if ... else` | `if count > 0 ... else` |
| `&&`, `||`, `!` | `if isAdmin && hasAccess` |
| `===`, `>`, `<` | `if status === "active"` |
| Ternary | `bg active ? #2563eb : #333` |

**Variablen:** Definition mit `name:`, Verwendung in Text mit `"$name"`.

**Bedingungen:** Block Conditionals für Elemente, Inline Conditionals für Properties.


---

## Seiten & Navigation

*Content referenzieren mit show*

Mit `show` referenzierst du Content – aus der gleichen Datei oder aus anderen Dateien. Das ist die Basis für Apps mit mehreren Seiten.

### Das Konzept: show

`show` sagt: "Zeige diesen Content an". Der Content kann aus drei Quellen kommen:

| Syntax | Bedeutung | Beispiel |
| --- | --- | --- |
| `show X` | Zeige lokales Element X | `show HomeView` → Element mit `name HomeView` |
| `show X` | Oder: Lade Datei X.mirror | `show Home` → `Home.mirror` |
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

| Situation | Empfehlung |
| --- | --- |
| Kleiner, einfacher Content | Inline (als Kinder) |
| Views in der gleichen Datei | `show ViewName` |
| Jede Seite ist eigenständig | `show Dateiname` |
| Mehrere Views gruppiert | `show ViewName from Datei` |

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

PrimaryBtn as Button: bg #2563eb, col white, pad 10 20, rad 6
```

// components.mirror Card: bg #1a1a1a, pad 16, rad 8, gap 8 Title: col white, fs 16, weight 500 Body: col #888, fs 14 PrimaryBtn as Button: bg #2563eb, col white, pad 10 20, rad 6 // dashboard.mirror use components Frame gap 16 Card Title "Willkommen" Body "Schön dass du da bist." PrimaryBtn "Los geht's" `use` importiert Komponenten-Definitionen. `show` zeigt Content an. Beides ergänzt sich.

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

| Syntax | Wirkung |
| --- | --- |
| `show X` | Zeige lokales Element X (braucht `name X`) |
| `show X` | Oder: Lade X.mirror (wenn kein lokales Element) |
| `show X from Y` | Lade Element X aus Y.mirror |

#### Vergleich

| Methode | Verwendung |
| --- | --- |
| Inline (Kinder) | Kleiner Content direkt im Tab |
| `show ViewName` | Lokale Views in gleicher Datei |
| `show Dateiname` | Content aus eigener Datei |
| `show X from Y` | Spezifisches Element aus Datei |
| `use datei` | Komponenten importieren |


---

## Eingabe

*Formular-Komponenten*

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
    Option "Berlin", value "berlin"
    Option "Hamburg", value "hamburg"
    Option "München", value "munich"
    Option "Köln", value "cologne"
```

Jede `Option` braucht einen `value`. Mit `placeholder` zeigst du Text, wenn nichts ausgewählt ist. Das Dropdown öffnet bei Klick, ist mit Pfeiltasten navigierbar und schließt bei Auswahl oder Escape.

### DatePicker

Ein Kalender zur Datumsauswahl:

```mirror
DatePicker
```

Mit den Buttons oben wechselst du zwischen Monaten.

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

| Komponente | Verwendung |
| --- | --- |
| `Input` | Einzeiliges Textfeld |
| `Textarea` | Mehrzeiliges Textfeld |
| `Checkbox` | Einzelne Ja/Nein-Auswahl |
| `Switch` | An/Aus-Toggle (visuell klarer) |
| `RadioGroup` + `RadioItem` | Eine aus mehreren Optionen |
| `Slider` | Numerischer Bereich |
| `Select` + `Option` | Dropdown-Auswahl |
| `DatePicker` | Kalender-Auswahl |

**Custom Styling:** Über Kind-Komponenten wie `Root:`, `Control:`, `Label:` – siehe Referenz


---

## Navigation

*Tabs und SideNav*

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
  Indicator: h 2, bg #2563eb
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
  Item: pad 12 16, rad 8, margin 4 8, col #aaa, bg #151520
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

*Dialog und Tooltip*

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
      Button "Create", bg #3b82f6, grow
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

*Statische und datengebundene Tabellen*

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

#### Styling

Table, Header und Row können gestylt werden:

```mirror
Table bg #111, pad 16, rad 12, w full
  Header: bg #1a1a1a
    Row "Name", "Rolle", "Status"
  Row "Anna", "Designer", "Aktiv"
  Row "Max", "Developer", "Aktiv"
  Row "Tom", "Manager", "Urlaub"
```

**Wann statisch?** Verwende statische Tabellen für: Preislisten, Feature-Vergleiche, Kontaktdaten, Referenztabellen – alles mit festen, bekannten Werten.

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
    Text row.priority, col #2563eb, fs 14, weight 600, w 24
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

**Filtern:** `where row.done == false` – Vergleiche mit `==`, `!=`, `>`, `<`. Kombinieren mit `and`/`or`.

**Sortieren:** `by feld` (aufsteigend) oder `by feld desc` (absteigend).

**Custom Styling:** Auch Tabellen haben Kind-Komponenten – siehe Referenz.


---

<!-- GENERATED:TUTORIAL:END -->

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
| `$primary.bg: #2563eb` | `primary.bg: #2563eb` | Kein `$` bei Definition |
| `bg $primary.bg` | `bg $primary` | Kein Suffix bei Verwendung |
| `bg primary` | `bg $primary` | `$` bei Verwendung |

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
| toast | message, type?, position? |
| shake | element? |
| pulse | element? |
| back | - |
| forward | - |
| openUrl | url, newTab? |

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
