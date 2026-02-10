# <>mirror

A visual UI designer with a custom DSL (Domain-Specific Language) for rapid prototyping.

## Inhaltsverzeichnis

- [Features](#features)
- [Quick Start](#quick-start)
- [Tutorial: Deine erste UI bauen](#tutorial-deine-erste-ui-bauen)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [DSL Syntax Referenz](#dsl-syntax-referenz)
- [Properties Referenz](#properties-referenz)
  - [Layout](#layout)
  - [Größen](#größen)
  - [Abstände](#abstände)
  - [Farben & Rahmen](#farben--rahmen)
  - [Typografie](#typografie)
  - [Alignment](#alignment)
  - [Icons](#icons)
  - [Overflow](#overflow)
  - [Sonstiges](#sonstiges)
  - [Modifiers](#modifiers)
- [Bilder](#bilder)
- [Hover States](#hover-states)
- [Interaktives System](#interaktives-system-states-events-actions)
  - [Benutzerdefinierte Overlays](#benutzerdefinierte-overlays)
- [Library Components](#library-components)
  - [Overlays](#overlays) (Dropdown, Dialog, Tooltip, Popover, AlertDialog, ContextMenu, HoverCard)
  - [Navigation](#navigation) (Tabs, Accordion, Collapsible)
  - [Form](#form) (Input, Select, Switch, Checkbox, RadioGroup, Slider)
  - [Feedback](#feedback) (Toast, Progress, Avatar)
- [Komplette Beispiele](#komplette-beispiele)
- [Key Concepts](#key-concepts)
- [Tipps & Best Practices](#tipps--best-practices)
- [Multi-Page Support](#multi-page-support)
- [AI Generation](#ai-generation)
- [Extract Function](#extract-function)
- [Projekt speichern & exportieren](#projekt-speichern--exportieren)
- [Architecture](#architecture)
- [Scripts](#scripts)
- [Tech Stack](#tech-stack)

---

## Features

- **Multi-Page Support**: Create and manage multiple pages
- **Three-Tab Workflow**: Separate Tokens, Components, and Layout
- **Live Preview**: Real-time rendering of your UI
- **AI Generation**: Describe what you want, get DSL code (via OpenRouter/Claude)
- **Component Library**: 19 pre-built Radix-based components (Dropdown, Dialog, Tabs, etc.)
- **Component Templates**: Define once, reuse everywhere
- **Extract Function**: Auto-extract component definitions from layout
- **Undo/Redo**: Cmd+Z / Cmd+Shift+Z
- **Project Save/Load**: Auto-save to localStorage, Import/Export JSON
- **React Export**: Export your UI as React code

---

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

---

## Tutorial: Deine erste UI bauen

Dieses Tutorial führt dich durch den kompletten Workflow von Mirror. Am Ende hast du ein vollständiges Design-System mit mehreren Seiten erstellt.

---

### Teil 1: Die Grundlagen verstehen

Mirror arbeitet mit **drei Tabs**, die zusammenwirken:

| Tab | Zweck | Beispiel |
|-----|-------|----------|
| **Tokens** | Design-Variablen definieren | `$primary: #3B82F6` |
| **Components** | Wiederverwendbare Bausteine | `Button: pad 12 bg $primary` |
| **Layout** | Die eigentliche UI zusammenbauen | `Button "Klick mich"` |

**Das Prinzip:** Tokens → Components → Layout. Von abstrakt zu konkret.

---

### Teil 2: Ein einfaches Element erstellen

Lass uns mit dem einfachsten Fall starten - ein einzelnes Element ohne Tokens oder Komponenten.

**Schritt 1:** Gehe zum **Layout** Tab und tippe:

```
"Hallo Welt"
```

Du siehst sofort "Hallo Welt" in der Preview. Das ist alles! Text in Anführungszeichen wird direkt angezeigt.

**Schritt 2:** Füge Styling hinzu:

```
size 24 weight 600 col #3B82F6 "Hallo Welt"
```

Jetzt ist der Text größer (24px), fett (600) und blau (#3B82F6).

**Schritt 3:** Packe es in einen Container:

```
ver pad 24 bg #1A1A1A rad 12
  size 24 weight 600 col #3B82F6 "Hallo Welt"
  size 14 col #888 "Willkommen bei Mirror"
```

Jetzt hast du:
- `ver` - Vertikales Layout (Elemente untereinander)
- `pad 24` - 24px Innenabstand
- `bg #1A1A1A` - Dunkler Hintergrund
- `rad 12` - Abgerundete Ecken

---

### Teil 3: Design Tokens einführen

Hardcodierte Farben wie `#3B82F6` sind schwer zu warten. Tokens lösen das.

**Schritt 1:** Wechsle zum **Tokens** Tab und definiere:

```
// Farben
$primary: #3B82F6
$bg-card: #1A1A1A
$text: #FFFFFF
$text-muted: #888888

// Abstände
$space: 24
$radius: 12
```

**Schritt 2:** Nutze die Tokens im **Layout** Tab:

```
ver pad $space bg $bg-card rad $radius
  size 24 weight 600 col $primary "Hallo Welt"
  size 14 col $text-muted "Willkommen bei Mirror"
```

**Vorteil:** Ändere `$primary` einmal im Tokens Tab, und alle Elemente aktualisieren sich automatisch.

---

### Teil 4: Komponenten erstellen

Wenn du dasselbe Styling mehrfach brauchst, erstelle eine Komponente.

**Schritt 1:** Wechsle zum **Components** Tab:

```
// Eine einfache Card-Komponente
Card: ver pad $space bg $bg-card rad $radius gap 16
```

Das `:` nach dem Namen macht es zu einer **Definition**. Diese Komponente hat:
- Vertikales Layout
- Padding aus dem Token
- Dunkler Hintergrund
- Abgerundete Ecken
- 16px Abstand zwischen Kindern

**Schritt 2:** Nutze die Komponente im **Layout** Tab:

```
Card
  size 24 weight 600 col $primary "Hallo Welt"
  size 14 col $text-muted "Willkommen bei Mirror"
```

Die Card hat automatisch alle Styles aus der Definition!

---

### Teil 5: Komponenten mit Kind-Slots

Definiere Komponenten mit vordefinierten Kind-Elementen:

**Components Tab:**
```
Card: ver pad $space bg $bg-card rad $radius gap 16
  Title size 24 weight 600 col $text
  Subtitle size 14 col $text-muted
```

**Layout Tab:**
```
Card
  Title "Willkommen"
  Subtitle "Schön, dass du da bist"
```

Die `Title` und `Subtitle` Elemente erben ihre Styles aus der Card-Definition.

---

### Teil 6: Button-System mit Vererbung

Erstelle ein komplettes Button-System mit Varianten:

**Tokens Tab:**
```
$primary: #3B82F6
$primary-hover: #2563EB
$danger: #EF4444
$success: #10B981
$text: #FFFFFF
$text-muted: #888888
$border: #333333
$radius: 8
```

**Components Tab:**
```
// Basis-Button - alle anderen erben davon
Button: hor hor-cen ver-cen h 44 pad l-r 20 rad $radius bg $primary col $text size 14 weight 500 hover-bg $primary-hover

// Varianten durch Vererbung
SecondaryButton: from Button bg transparent bor 1 boc $border col $text hover-bg #ffffff10
GhostButton: from Button bg transparent col $primary hover-bg #3B82F610
DangerButton: from Button bg $danger hover-bg #DC2626
SuccessButton: from Button bg $success hover-bg #059669

// Größen-Varianten
SmallButton: from Button h 36 pad l-r 14 size 13
LargeButton: from Button h 52 pad l-r 28 size 16
```

**Layout Tab:**
```
ver gap 16

  hor gap 12
    Button "Primary"
    SecondaryButton "Secondary"
    GhostButton "Ghost"

  hor gap 12
    DangerButton "Löschen"
    SuccessButton "Speichern"

  hor gap 12
    SmallButton "Klein"
    Button "Normal"
    LargeButton "Groß"
```

**Das `from` Keyword:** Erbt alle Properties und überschreibt nur die angegebenen.

---

### Teil 7: Formular-Komponenten

Baue ein wiederverwendbares Formular-System:

**Tokens Tab:**
```
$bg-input: #252525
$border: #333333
$border-focus: #3B82F6
$text: #FFFFFF
$text-muted: #888888
$danger: #EF4444
$radius: 8
$space-sm: 8
```

**Components Tab:**
```
// Formular-Feld Container
FormField: ver gap $space-sm

// Label
FormLabel: size 14 weight 500 col $text

// Fehler-Anzeige
FormError: hor gap 6 ver-cen size 12 col $danger
  icon "alert-circle" size 14

// Hilfe-Text
FormHint: size 12 col $text-muted

// Styled Input Container
StyledInput: ver gap $space-sm
  Input
    Field: h 44 pad l-r 14 bg $bg-input rad $radius bor 1 boc $border col $text size 14
```

**Layout Tab:**
```
ver gap 20 w 400

  FormField
    FormLabel "E-Mail-Adresse"
    Input
      Field placeholder "name@beispiel.de" type "email"
    FormHint "Wir geben deine E-Mail nicht weiter"

  FormField
    FormLabel "Passwort"
    Input
      Field placeholder "Mindestens 8 Zeichen" type "password"
    FormError "Passwort ist zu kurz"

  FormField
    FormLabel "Passwort bestätigen"
    Input
      Field placeholder "Passwort wiederholen" type "password"
```

---

### Teil 8: Komplette Login-Seite

Kombiniere alles zu einer vollständigen Seite:

**Tokens Tab:**
```
// Farben
$primary: #3B82F6
$primary-hover: #2563EB
$danger: #EF4444

$bg: #0A0A0A
$bg-card: #1A1A1A
$bg-input: #252525

$text: #FFFFFF
$text-muted: #9CA3AF

$border: #333333
$radius: 8
$radius-lg: 12

// Abstände
$space-xs: 4
$space-sm: 8
$space: 16
$space-lg: 24
$space-xl: 32
```

**Components Tab:**
```
// Layout-Helfer
Page: ver full bg $bg
Center: hor-cen ver-cen full
Row: hor gap $space ver-cen
Column: ver gap $space
Spacer: grow

// Card
Card: ver pad $space-xl bg $bg-card rad $radius-lg
CardHeader: ver gap $space-xs
CardTitle: size 24 weight 600 col $text
CardDescription: size 14 col $text-muted line 1.5
CardContent: ver gap $space-lg
CardFooter: ver gap $space

// Formular
FormField: ver gap $space-sm
FormLabel: size 14 weight 500 col $text
FormHint: size 12 col $text-muted

// Buttons
Button: hor hor-cen ver-cen h 44 pad l-r 20 rad $radius bg $primary col $text size 14 weight 500 hover-bg $primary-hover
SecondaryButton: from Button bg transparent bor 1 boc $border col $text hover-bg #ffffff10
TextButton: size 14 col $primary hover-col $primary-hover

// Divider
Divider: hor ver-cen gap $space
DividerLine: grow h 1 bg $border
DividerText: size 12 col $text-muted
```

**Layout Tab:**
```
Page
  Center
    Card w 420
      CardHeader
        CardTitle "Willkommen zurück"
        CardDescription "Melde dich an, um fortzufahren"

      CardContent mar u $space-lg
        FormField
          FormLabel "E-Mail"
          Input
            Field placeholder "name@beispiel.de" type "email"

        FormField
          FormLabel "Passwort"
          Input
            Field placeholder "••••••••" type "password"

        Row
          Checkbox
            Indicator
            Label: size 13 col $text-muted
              "Angemeldet bleiben"
          Spacer
          TextButton "Passwort vergessen?"

      CardFooter mar u $space
        Button "Anmelden"

        Divider
          DividerLine
          DividerText "oder"
          DividerLine

        SecondaryButton
          icon "github" size 18
          "Mit GitHub anmelden"

      Row hor-cen mar u $space-lg
        size 13 col $text-muted "Noch kein Konto?"
        TextButton mar l $space-xs "Registrieren"
```

---

### Teil 9: Zweite Seite hinzufügen (Dashboard)

**Schritt 1:** Klicke auf **"+ Neue Seite"** in der linken Sidebar

**Schritt 2:** Benenne die Seite "Dashboard"

**Schritt 3:** Füge neue Komponenten im **Components** Tab hinzu:

```
// Zusätzlich zu den vorherigen Komponenten:

// Navigation
NavBar: hor pad l-r $space-lg h 64 bg $bg-card bor d 1 boc $border ver-cen
NavLogo: hor gap $space-sm ver-cen
NavLinks: hor gap $space-xs
NavLink: pad $space-sm $space rad 6 size 14 col $text-muted hover-bg #ffffff08 hover-col $text
NavLinkActive: from NavLink bg #ffffff10 col $text

// Stats
StatCard: ver pad $space-lg bg $bg-card rad $radius-lg gap $space-sm
StatLabel: size 13 col $text-muted uppercase weight 500
StatValue: size 32 weight 700 col $text
StatChange: hor gap $space-xs ver-cen size 13

// Content Area
MainContent: ver pad $space-lg gap $space-lg grow
SectionTitle: size 18 weight 600 col $text
```

**Schritt 4:** Baue das Dashboard-Layout:

```
Page
  // Navigation
  NavBar
    NavLogo
      icon "hexagon" size 24 col $primary
      size 18 weight 700 col $text "Mirror"

    NavLinks mar l $space-xl
      NavLinkActive "Dashboard"
      NavLink "Projekte"
      NavLink "Team"
      NavLink "Einstellungen"

    Spacer

    hor gap $space ver-cen
      icon "bell" size 20 col $text-muted
      Avatar w 32 h 32 rad 16
        Image src "https://i.pravatar.cc/64"
        Fallback "M"

  // Main Content
  MainContent
    SectionTitle "Übersicht"

    // Stats Grid
    hor gap $space
      StatCard grow
        StatLabel "Umsatz"
        StatValue "€ 24.580"
        StatChange col $success
          icon "trending-up" size 16
          "+12.5%"

      StatCard grow
        StatLabel "Bestellungen"
        StatValue "1.429"
        StatChange col $success
          icon "trending-up" size 16
          "+8.2%"

      StatCard grow
        StatLabel "Kunden"
        StatValue "892"
        StatChange col $danger
          icon "trending-down" size 16
          "-2.1%"

      StatCard grow
        StatLabel "Conversion"
        StatValue "3.2%"
        StatChange col $success
          icon "trending-up" size 16
          "+0.4%"

    // Recent Activity
    Card
      SectionTitle "Letzte Aktivität"
      // ... weitere Inhalte
```

---

### Teil 10: Navigation zwischen Seiten

Verbinde die Seiten mit der `page` Action:

**Auf der Login-Seite (Button anpassen):**
```
Button onclick page Dashboard
  "Anmelden"
```

**Im Dashboard (Logout hinzufügen):**
```
NavLink onclick page Login
  icon "log-out" size 16
  "Abmelden"
```

---

### Teil 11: Modale Dialoge hinzufügen

Füge einen Bestätigungs-Dialog zum Dashboard hinzu:

**Components Tab:**
```
ConfirmDialog:
  AlertDialog
    Portal
      Overlay: bg #00000080
      Content: ver gap $space-lg pad $space-xl bg $bg-card rad $radius-lg w 400
        Title: size 18 weight 600 col $text
        Description: size 14 col $text-muted line 1.5
        Actions: hor gap $space hor-r
```

**Layout Tab (im Dashboard):**
```
// Lösch-Button mit Dialog
AlertDialog
  Trigger
    DangerButton
      icon "trash" size 16
      "Projekt löschen"
  Portal
    Overlay: bg #00000080
    Content: ver gap $space-lg pad $space-xl bg $bg-card rad $radius-lg w 420
      Title: size 18 weight 600 col $text
        "Projekt wirklich löschen?"
      Description: size 14 col $text-muted line 1.5
        "Diese Aktion kann nicht rückgängig gemacht werden. Alle Daten werden permanent gelöscht."
      hor gap $space hor-r
        Cancel
          SecondaryButton "Abbrechen"
        Action
          DangerButton "Ja, löschen"
```

---

### Teil 12: Tipps für den Workflow

**1. Starte mit Tokens**
Definiere deine Farben und Abstände zuerst. Das spart Zeit beim Refactoring.

**2. Kleine Komponenten zuerst**
Baue von unten nach oben: Button → Card → Page

**3. Nutze `from` für Varianten**
Statt alles zu kopieren, erbe von Basis-Komponenten.

**4. Benenne konsistent**
- Tokens: `$bg-*`, `$text-*`, `$space-*`
- Komponenten: `Card`, `CardTitle`, `CardContent`

**5. Inspect Mode nutzen**
Halte `Shift` gedrückt, um Element-Grenzen zu sehen.

**6. Keyboard Shortcuts**
- `Cmd+Z` - Rückgängig
- `Cmd+Shift+Z` - Wiederholen
- `?` - Alle Shortcuts anzeigen

---

### Teil 13: Bilder einbinden

Füge Bilder mit `src` hinzu:

**Einfaches Bild:**
```
ver w 300 h 200 rad 12 clip
  src "https://picsum.photos/600/400"
```

- `clip` - Schneidet das Bild an den abgerundeten Ecken ab
- Das Bild füllt den Container automatisch aus

**Bild mit Alt-Text und Fit-Option:**
```
ver w 200 h 200 rad 100 clip
  src "https://i.pravatar.cc/400" alt "Profilbild" fit "cover"
```

| Property | Werte | Beschreibung |
|----------|-------|--------------|
| `src` | URL | Bild-URL |
| `alt` | Text | Alternativtext für Screenreader |
| `fit` | `cover`, `contain`, `fill`, `none` | Wie das Bild skaliert |

**Praktisches Beispiel - Produktkarte mit Bild:**

```
// Components Tab
ProductCard: ver bg $bg-card rad $radius-lg clip
  ProductImage: h 200
  ProductInfo: ver pad $space gap $space-sm
  ProductName: size 16 weight 600 col $text
  ProductPrice: size 18 weight 700 col $success

// Layout Tab
ProductCard w 280
  ProductImage
    src "https://picsum.photos/400/300"
  ProductInfo
    ProductName "Wireless Headphones"
    ProductPrice "€ 149,00"
```

**Avatar mit Fallback:**
```
Avatar w 48 h 48 rad 24
  Image src "https://i.pravatar.cc/96"
  Fallback "AB"
```

---

### Teil 14: Alignment-Optionen meistern

Mirror bietet absolute Alignment-Properties, die unabhängig von der Layout-Richtung funktionieren.

**Horizontale Ausrichtung:**
```
// Links ausrichten
ver hor-l pad 20 bg #1A1A1A
  Button "Links"

// Zentriert
ver hor-cen pad 20 bg #1A1A1A
  Button "Mitte"

// Rechts ausrichten
ver hor-r pad 20 bg #1A1A1A
  Button "Rechts"

// Horizontal strecken
ver hor-stretch pad 20 bg #1A1A1A
  Button "Volle Breite"

// Space-between horizontal
hor hor-between pad 20 bg #1A1A1A w 400
  Button "Links"
  Button "Rechts"
```

**Vertikale Ausrichtung:**
```
// Oben ausrichten
hor ver-t pad 20 bg #1A1A1A h 200
  Button "Oben"

// Vertikal zentriert
hor ver-cen pad 20 bg #1A1A1A h 200
  Button "Mitte"

// Unten ausrichten
hor ver-b pad 20 bg #1A1A1A h 200
  Button "Unten"

// Vertikal strecken
hor ver-stretch pad 20 bg #1A1A1A h 200
  Button "Volle Höhe"
```

**Kombinationen - Perfekt zentrieren:**
```
ver full hor-cen ver-cen bg $bg
  Card w 400
    "Dieser Inhalt ist perfekt zentriert"
```

**Übersicht aller Alignment-Optionen:**

| Property | Beschreibung |
|----------|--------------|
| `hor-l` | Links ausrichten |
| `hor-cen` | Horizontal zentrieren |
| `hor-r` | Rechts ausrichten |
| `hor-stretch` | Horizontal strecken |
| `hor-between` | Space-between horizontal |
| `ver-t` | Oben ausrichten |
| `ver-cen` | Vertikal zentrieren |
| `ver-b` | Unten ausrichten |
| `ver-stretch` | Vertikal strecken |
| `ver-between` | Space-between vertikal |

---

### Teil 15: Overflow und Scrolling

Kontrolliere, was passiert wenn Inhalt größer ist als der Container.

**Vertikales Scrollen:**
```
ver h 300 scroll-y bg $bg-card rad $radius pad $space gap $space
  // Viele Elemente...
  Card "Item 1"
  Card "Item 2"
  Card "Item 3"
  Card "Item 4"
  Card "Item 5"
  Card "Item 6"
  Card "Item 7"
  Card "Item 8"
```

**Horizontales Scrollen (z.B. für Karussell):**
```
hor scroll-x gap $space pad $space
  Card w 280 shrink 0
    "Karte 1"
  Card w 280 shrink 0
    "Karte 2"
  Card w 280 shrink 0
    "Karte 3"
  Card w 280 shrink 0
    "Karte 4"
```

- `shrink 0` - Verhindert, dass Karten schrumpfen

**Overflow verstecken (für abgerundete Ecken):**
```
ver rad 16 clip
  src "https://picsum.photos/400/300"
```

| Property | Beschreibung |
|----------|--------------|
| `scroll` | Scrollen in beide Richtungen |
| `scroll-x` | Nur horizontales Scrollen |
| `scroll-y` | Nur vertikales Scrollen |
| `clip` | Überlauf abschneiden (overflow: hidden) |

---

### Teil 16: Modifiers für schnelles Styling

Modifiers sind vordefinierte Style-Varianten mit `-` Prefix.

**Verfügbare Modifiers:**
```
ver gap 12

  // Button-Varianten
  Button -primary "Primary Button"
  Button -secondary "Secondary Button"
  Button -outlined "Outlined Button"
  Button -ghost "Ghost Button"
  Button -filled "Filled Button"

  // Zustände
  Button -disabled "Disabled Button"

  // Form
  Button -rounded "Rounded Button"
```

| Modifier | Effekt |
|----------|--------|
| `-primary` | Blauer Hintergrund (#3B82F6), weißer Text |
| `-secondary` | Grauer Hintergrund (#6B7280), weißer Text |
| `-outlined` | Transparenter Hintergrund, blauer Rahmen |
| `-ghost` | Komplett transparent, kein Rahmen |
| `-filled` | Ausgefüllter Hintergrund |
| `-disabled` | 50% Opacity, nicht klickbar |
| `-rounded` | Vollständig abgerundet (Pill-Form) |

**Kombinieren:**
```
Button -primary -rounded "Abgerundeter Primary"
```

---

### Teil 17: Das vollständige State-System

Definiere Komponenten mit mehreren Zuständen:

**Toggle-Komponente mit States:**
```
// Components Tab
Toggle: w 52 h 28 rad 14 pad 2
  state off
    bg #333
  state on
    bg $primary

  // Der Knob bewegt sich
  Knob: w 24 h 24 rad 12 bg white

// Layout Tab
Toggle
  Knob
```

**Karte mit aktiv/inaktiv State:**
```
// Components Tab
SelectableCard: ver pad $space bg $bg-card rad $radius bor 2
  state inactive
    boc transparent
  state active
    boc $primary bg #3B82F610

// Layout Tab
SelectableCard onclick toggle
  "Klick mich zum Auswählen"
```

**Accordion-Item mit States:**
```
// Components Tab
AccordionItem: ver
  state closed
  state open

  Header: hor ver-cen pad $space bg $bg-card
    Title size 14 weight 500 col $text
    Spacer
    Icon icon "chevron-down" size 16 col $text-muted

  Content: ver pad $space bg $bg-card
```

---

### Teil 18: Events und Actions

Reagiere auf Benutzer-Interaktionen:

**Alle verfügbaren Events:**
```
// Klick
Button onclick open Dialog
  "Dialog öffnen"

// Hover
Card onhover change self to highlighted
  "Hover über mich"

// Fokus (für Inputs)
Input onfocus change self to focused
  Field placeholder "Fokussiere mich"

// Blur (Fokus verloren)
Input onblur change self to normal
  Field placeholder "..."
```

**Alle verfügbaren Actions:**

| Action | Syntax | Beschreibung |
|--------|--------|--------------|
| `toggle` | `onclick toggle` | Wechselt zum nächsten State |
| `toggle X` | `onclick toggle Menu` | Wechselt State von Komponente X |
| `open X` | `onclick open Dialog` | Öffnet Komponente X als Overlay |
| `open X anim` | `onclick open Dialog slide-up` | Öffnet mit Animation |
| `open X anim ms` | `onclick open Dialog fade 300` | Öffnet mit Animation und Dauer |
| `close` | `onclick close` | Schließt oberstes Overlay |
| `close X` | `onclick close Dialog` | Schließt spezifisches Overlay |
| `close X anim ms` | `onclick close Dialog fade 150` | Schließt mit Animation |
| `show X` | `onclick show Tooltip` | Zeigt Komponente X |
| `hide X` | `onclick hide Tooltip` | Versteckt Komponente X |
| `change X to Y` | `onclick change self to active` | Setzt State auf Y |
| `page X` | `onclick page Home` | Navigiert zu Seite X |

**Verfügbare Animationen für `open`/`close`:**
- `slide-up` - Gleitet von unten ein
- `slide-down` - Gleitet von oben ein
- `slide-left` - Gleitet von rechts ein
- `slide-right` - Gleitet von links ein
- `fade` - Blendet ein/aus
- `scale` - Skaliert ein/aus
- `none` - Keine Animation

**Praktisches Beispiel - Tab-Navigation selbst bauen:**
```
// Components Tab
Tab: pad 12 20 rad 6 size 14
  state inactive
    bg transparent col $text-muted
  state active
    bg $primary col white

// Layout Tab
hor gap 4 bg $bg-card pad 4 rad 10

  Tab onclick change self to active
    "Tab 1"

  Tab onclick change self to active
    "Tab 2"

  Tab onclick change self to active
    "Tab 3"
```

---

### Teil 19: Bedingte Logik

Führe Actions basierend auf Bedingungen aus:

**If/Else:**
```
// Variable definieren
LoginButton: pad 12 bg $primary rad 8 col white
  $isLoggedIn: false

  onclick if isLoggedIn
    page Dashboard
  else
    open LoginDialog
```

**Vergleichsoperatoren:**
```
Counter: ver gap 8
  $count: 0

  onclick if count >= 10
    change self to maxReached
  else
    assign count = count + 1
```

| Operator | Bedeutung |
|----------|-----------|
| `==` | Gleich |
| `!=` | Ungleich |
| `>` | Größer als |
| `<` | Kleiner als |
| `>=` | Größer oder gleich |
| `<=` | Kleiner oder gleich |

**Logische Operatoren:**
```
Button onclick if isLoggedIn and hasPermission
  open AdminPanel

Button onclick if not isValid
  show ErrorMessage

Button onclick if optionA or optionB
  proceed
```

---

### Teil 20: Weitere Library-Komponenten

**Dropdown-Menü:**
```
Dropdown
  Trigger: pad 10 14 bg $bg-card rad 6 bor 1 boc $border hor gap 8 ver-cen
    "Optionen"
    icon "chevron-down" size 16
  Content: ver bg $bg-card rad 8 pad 4 min-w 180 sha 0 8 24 #00000060
    Item: pad 10 14 rad 4 size 14 col $text hover-bg #ffffff10
      icon "edit" size 16
      "Bearbeiten"
    Item: pad 10 14 rad 4 size 14 col $text hover-bg #ffffff10
      icon "copy" size 16
      "Duplizieren"
    Separator: h 1 bg $border mar u-d 4
    Item: pad 10 14 rad 4 size 14 col $danger hover-bg #EF444420
      icon "trash" size 16
      "Löschen"
```

**Tabs:**
```
Tabs
  List: hor gap 0 bg $bg-card rad 8 pad 4
    Tab: pad 10 20 rad 6 size 14 col $text-muted
      "Übersicht"
    Tab: pad 10 20 rad 6 size 14 col $text-muted
      "Details"
    Tab: pad 10 20 rad 6 size 14 col $text-muted
      "Einstellungen"
  Panel: pad 20
    "Inhalt Tab 1"
  Panel: pad 20
    "Inhalt Tab 2"
  Panel: pad 20
    "Inhalt Tab 3"
```

**Accordion:**
```
Accordion
  Item: bor d 1 boc $border
    Trigger: hor ver-cen pad 16 size 14 weight 500 col $text
      "Frage 1: Was ist Mirror?"
      Spacer
      icon "chevron-down" size 16 col $text-muted
    Content: pad 0 16 16 16 size 14 col $text-muted line 1.6
      "Mirror ist ein visueller UI-Designer mit eigener DSL für schnelles Prototyping."

  Item: bor d 1 boc $border
    Trigger: hor ver-cen pad 16 size 14 weight 500 col $text
      "Frage 2: Brauche ich Programmierkenntnisse?"
      Spacer
      icon "chevron-down" size 16 col $text-muted
    Content: pad 0 16 16 16 size 14 col $text-muted line 1.6
      "Nein, die DSL ist einfach zu lernen. Grundlegende Design-Konzepte helfen."
```

**Select (Dropdown-Auswahl):**
```
Select
  Trigger: pad 12 bg $bg-input rad 8 bor 1 boc $border min-w 200 hor ver-cen
    "Land auswählen"
    Spacer
    icon "chevron-down" size 16 col $text-muted
  Content: bg $bg-card rad 8 pad 4
    Group
      Label: pad 8 12 size 12 col $text-muted uppercase
        "Europa"
      Item: pad 10 14 rad 4 size 14 col $text
        "Deutschland"
      Item: pad 10 14 rad 4 size 14 col $text
        "Österreich"
      Item: pad 10 14 rad 4 size 14 col $text
        "Schweiz"
```

**Tooltip:**
```
Tooltip
  Trigger
    icon "help-circle" size 18 col $text-muted
  Content: pad 8 12 bg #333 rad 6 size 12 col white max-w 200
    "Dies ist ein hilfreicher Tooltip mit mehr Informationen."
```

**Slider:**
```
ver gap 8
  hor ver-cen
    size 14 weight 500 col $text "Lautstärke"
    Spacer
    size 14 col $text-muted "75%"

  Slider
    Track: h 4 bg #333 rad 2
      Range: bg $primary rad 2
    Thumb: w 20 h 20 bg white rad 10 sha 0 2 8 #00000040
```

**Progress:**
```
ver gap 8
  hor ver-cen
    size 14 col $text "Upload"
    Spacer
    size 14 col $text-muted "75%"

  Progress value 75
    Indicator: bg $primary rad 4 h 8
```

**Toast (Benachrichtigung):**
```
Toast
  Trigger: pad 12 20 bg $primary rad 8 col white
    "Benachrichtigung zeigen"
  Content: hor gap 12 pad 16 bg $bg-card rad 8 bor 1 boc $success sha 0 8 24 #000
    icon "check-circle" size 20 col $success
    ver gap 4
      Title: size 14 weight 600 col $text
        "Erfolgreich gespeichert!"
      Description: size 13 col $text-muted
        "Deine Änderungen wurden übernommen."
```

---

### Teil 21: Extract Function verwenden

Extrahiere wiederverwendbare Komponenten aus Layout-Code.

**Vorher - alles im Layout:**
```
ver pad 24 bg #1A1A1A rad 12 gap 16
  hor gap 12 ver-cen
    ver w 48 h 48 rad 24 bg #3B82F6 hor-cen ver-cen
      size 18 weight 600 col white "A"
    ver gap 2
      size 16 weight 600 col white "Anna Müller"
      size 13 col #888 "Produktdesignerin"
  size 14 col #9CA3AF line 1.5
    "Ich arbeite seit 5 Jahren als Designerin und liebe es, intuitive Benutzeroberflächen zu gestalten."
```

**So verwendest du Extract:**

1. Wähle den Code-Block im Layout-Editor aus
2. Klicke auf **"Extract"** in der Toolbar
3. Gib einen Namen ein (z.B. "ProfileCard")

**Nachher - saubere Trennung:**

**Components Tab:**
```
ProfileCard: ver pad 24 bg #1A1A1A rad 12 gap 16
  Header: hor gap 12 ver-cen
    Avatar: ver w 48 h 48 rad 24 bg #3B82F6 hor-cen ver-cen
      Initial size 18 weight 600 col white
    Info: ver gap 2
      Name size 16 weight 600 col white
      Role size 13 col #888
  Bio: size 14 col #9CA3AF line 1.5
```

**Layout Tab:**
```
ProfileCard
  Header
    Avatar
      Initial "A"
    Info
      Name "Anna Müller"
      Role "Produktdesignerin"
  Bio "Ich arbeite seit 5 Jahren als Designerin..."
```

**Vorteile:**
- Wiederverwendbar auf anderen Seiten
- Einfach zu warten
- Konsistentes Styling
- Kleinere Layout-Dateien

---

### Teil 22: AI Generation nutzen

Lass dir UI-Code von KI generieren.

**Voraussetzungen:**
1. OpenRouter API Key (kostenlos registrieren)
2. Key in den Einstellungen hinterlegen

**So funktioniert es:**

1. Klicke auf das **AI-Icon** (✨) in der Toolbar
2. Beschreibe was du willst
3. Der Code wird generiert und eingefügt

**Beispiel-Prompts:**

```
"Erstelle eine Pricing-Tabelle mit 3 Spalten: Basic (kostenlos),
Pro (9€/Monat) und Enterprise (49€/Monat). Jede Spalte hat
einen Titel, Preis, Feature-Liste und einen Button."
```

```
"Baue eine Sidebar-Navigation mit Logo oben, 5 Menüpunkten
mit Icons (Dashboard, Projekte, Team, Kalender, Einstellungen)
und einem Profil-Bereich unten."
```

```
"Erstelle ein Kontaktformular mit Feldern für Name, E-Mail,
Betreff und Nachricht. Füge Validierungshinweise hinzu und
einen Absende-Button."
```

**Tipps für bessere Ergebnisse:**

| Tipp | Beispiel |
|------|----------|
| Sei spezifisch | "3 Spalten" statt "mehrere Spalten" |
| Nenne Farben | "blauer Button" oder "dunkles Theme" |
| Beschreibe Hierarchie | "Card mit Header und Footer" |
| Erwähne Komponenten | "nutze einen Dialog" |
| Gib Text vor | 'Button sagt "Jetzt starten"' |

**Nach der Generierung:**
- Prüfe den Code auf Fehler
- Passe Tokens an dein Design-System an
- Extrahiere wiederverwendbare Komponenten

---

### Teil 23: React Export

Exportiere dein Design als funktionierenden React-Code.

**So exportierst du:**

1. Klicke auf **"React"** in der Toolbar
2. Wähle die Export-Optionen
3. Lade die Dateien herunter

**Was wird exportiert:**

```
exported-project/
├── components/
│   ├── Button.tsx
│   ├── Card.tsx
│   └── ...
├── pages/
│   ├── Login.tsx
│   └── Dashboard.tsx
├── tokens.ts          # Deine Design-Tokens
├── App.tsx            # Hauptkomponente
└── index.css          # Basis-Styles
```

**Beispiel - exportierter Button:**

```tsx
// components/Button.tsx
import { tokens } from '../tokens';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ children, onClick }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 44,
        padding: '0 20px',
        borderRadius: tokens.radius,
        backgroundColor: tokens.primary,
        color: tokens.text,
        fontSize: 14,
        fontWeight: 500,
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
```

**Verwendung im eigenen Projekt:**

```tsx
import { Button } from './components/Button';
import { Card } from './components/Card';

function App() {
  return (
    <Card>
      <h1>Willkommen</h1>
      <Button onClick={() => console.log('Clicked!')}>
        Los geht's
      </Button>
    </Card>
  );
}
```

---

### Teil 24: Projekt-Management

**Auto-Save:**
Dein Projekt wird automatisch im Browser gespeichert (localStorage). Bei jedem Neuladen ist alles noch da.

**Export als JSON:**
1. Klicke auf **"Export"**
2. Speichere die `.json` Datei
3. Enthält: Tokens, Components, Layout, alle Seiten

**Import:**
1. Klicke auf **"Import"**
2. Wähle eine `.json` Datei
3. Das Projekt wird geladen

**Backup-Strategie:**
- Exportiere regelmäßig als JSON
- Nutze Git für Versionskontrolle
- Teile JSON-Dateien im Team

---

### Zusammenfassung

Du hast jetzt **alle Features** von Mirror kennengelernt:

**Grundlagen:**
- ✅ Tokens für Design-Variablen
- ✅ Komponenten mit `:` definieren
- ✅ Vererbung mit `from`
- ✅ Kind-Slots in Komponenten

**Styling:**
- ✅ Layout: `hor`, `ver`, `gap`, `wrap`
- ✅ Spacing: `pad`, `mar` mit Richtungen
- ✅ Sizing: `w`, `h`, `full`, `grow`, `min-w`, `max-h`
- ✅ Farben: `bg`, `col`, `boc`
- ✅ Rahmen: `bor`, `rad`
- ✅ Typografie: `size`, `weight`, `font`
- ✅ Alignment: `hor-l`, `hor-cen`, `ver-t`, `ver-between`, etc.
- ✅ Overflow: `scroll`, `scroll-x`, `scroll-y`, `clip`
- ✅ Modifiers: `-primary`, `-ghost`, `-rounded`

**Medien:**
- ✅ Bilder: `src`, `alt`, `fit`
- ✅ Icons: `icon "name"`

**Interaktivität:**
- ✅ Hover-States: `hover-bg`, `hover-col`
- ✅ States definieren
- ✅ Events: `onclick`, `onhover`, `onfocus`
- ✅ Actions: `toggle`, `open`, `close`, `page`
- ✅ Bedingte Logik: `if`, `else`, `and`, `or`

**Library-Komponenten:**
- ✅ Overlays: Dropdown, Dialog, Tooltip, Popover, AlertDialog
- ✅ Navigation: Tabs, Accordion, Collapsible
- ✅ Form: Input, Select, Switch, Checkbox, RadioGroup, Slider
- ✅ Feedback: Toast, Progress, Avatar

**Workflow:**
- ✅ Multi-Page Support
- ✅ Extract Function
- ✅ AI Generation
- ✅ React Export
- ✅ JSON Import/Export

**Du bist jetzt bereit, komplexe UIs mit Mirror zu bauen!**

---

## Keyboard Shortcuts

| Shortcut | Aktion |
|----------|--------|
| `?` | Keyboard Shortcuts anzeigen |
| `Cmd+Z` | Rückgängig |
| `Cmd+Shift+Z` | Wiederholen |
| `Shift` (halten) | Inspect Mode - zeigt Element-Grenzen |
| `Esc` | Dialoge schließen |

---

## DSL Syntax Referenz

### Tokens Tab

Definiere wiederverwendbare Design-Tokens mit `$`:

```
// Farben (Hex, RGB, oder Namen)
$primary: #3B82F6
$text: rgb(255, 255, 255)
$transparent: transparent

// Zahlen (für Abstände, Größen, etc.)
$radius: 8
$space: 16

// Berechnungen sind nicht möglich - nur einfache Werte
```

**Tokens verwenden:**
```
Button: pad $space bg $primary rad $radius
```

---

### Components Tab

Definiere Komponenten mit `:` nach dem Namen:

```
// Einfache Komponente
Button: pad 12 bg #3B82F6 rad 8 col #FFF

// Mit Kind-Elementen
Card: ver pad 16 bg #1E1E1E rad 12 gap 8
  Title size 18 weight 600
  Description size 14 col #888
```

**Vererbung mit `from`:**
```
Button: pad 12 bg #3B82F6 rad 8 col #FFF
PrimaryButton: from Button
SecondaryButton: from Button bg transparent bor 1 boc #3B82F6 col #3B82F6
DangerButton: from Button bg #EF4444
SmallButton: from Button pad 8 size 12
```

---

### Layout Tab

Verwende definierte Komponenten - nur Namen und Inhalte:

```
Card
  Title "Willkommen"
  Description "Starte hier mit deinem Projekt."
  Button "Los geht's"
```

**Inline-Syntax für kompakte Layouts:**
```
Card Title "Titel" Description "Text"
```

**Anonyme Container:**
```
// Ohne Komponenten-Name - nur Properties
ver gap 16 pad 24
  "Text direkt"
  Button "Klick mich"
```

---

## Properties Referenz

### Layout

| Property | Beispiel | Beschreibung |
|----------|----------|--------------|
| `hor` | `hor` | Horizontales Layout (Flexbox row) |
| `ver` | `ver` | Vertikales Layout (Flexbox column) |
| `gap` | `gap 16` | Abstand zwischen Kindern |
| `wrap` | `wrap` | Flex-wrap aktivieren |

### Größen

| Property | Beispiel | Beschreibung |
|----------|----------|--------------|
| `w` | `w 200` | Breite in Pixeln |
| `w` | `w 50%` | Breite in Prozent |
| `h` | `h 48` | Höhe in Pixeln |
| `min-w` | `min-w 100` | Minimale Breite |
| `max-w` | `max-w 600` | Maximale Breite |
| `min-h` | `min-h 200` | Minimale Höhe |
| `max-h` | `max-h 400` | Maximale Höhe |
| `full` | `full` | 100% Breite und Höhe |
| `grow` | `grow` | Flex-grow: 1 |
| `shrink` | `shrink 0` | Flex-shrink Wert |

### Abstände

| Property | Beispiel | Beschreibung |
|----------|----------|--------------|
| `pad` | `pad 16` | Padding alle Seiten |
| `pad` | `pad 16 24` | Padding vertikal horizontal |
| `pad` | `pad l 16` | Padding links |
| `pad` | `pad r 16` | Padding rechts |
| `pad` | `pad u 16` | Padding oben |
| `pad` | `pad d 16` | Padding unten |
| `pad` | `pad l-r 16` | Padding links und rechts |
| `pad` | `pad u-d 16` | Padding oben und unten |
| `mar` | `mar 8` | Margin (gleiche Syntax wie pad) |

### Farben & Rahmen

| Property | Beispiel | Beschreibung |
|----------|----------|--------------|
| `bg` | `bg #1A1A1A` | Hintergrundfarbe |
| `col` | `col #FFFFFF` | Textfarbe |
| `bor` | `bor 1` | Rahmenbreite alle Seiten |
| `bor` | `bor l 2` | Rahmen nur links |
| `bor` | `bor u-d 1` | Rahmen oben und unten |
| `boc` | `boc #333` | Rahmenfarbe |
| `rad` | `rad 8` | Border-radius |
| `rad` | `rad 8 8 0 0` | Border-radius pro Ecke |

### Typografie

| Property | Beispiel | Beschreibung |
|----------|----------|--------------|
| `size` | `size 14` | Schriftgröße in Pixeln |
| `weight` | `weight 600` | Schriftstärke (100-900) |
| `line` | `line 1.5` | Zeilenhöhe |
| `align` | `align center` | Textausrichtung |
| `italic` | `italic` | Kursiv |
| `underline` | `underline` | Unterstrichen |
| `uppercase` | `uppercase` | Großbuchstaben |
| `lowercase` | `lowercase` | Kleinbuchstaben |
| `truncate` | `truncate` | Text abschneiden mit ... |

### Alignment

Funktioniert unabhängig von `hor`/`ver`:

| Property | Beschreibung |
|----------|--------------|
| `hor-l` | Links ausrichten |
| `hor-cen` | Horizontal zentrieren |
| `hor-r` | Rechts ausrichten |
| `hor-stretch` | Horizontal strecken |
| `hor-between` | Space-between horizontal |
| `ver-t` | Oben ausrichten |
| `ver-cen` | Vertikal zentrieren |
| `ver-b` | Unten ausrichten |
| `ver-stretch` | Vertikal strecken |
| `ver-between` | Space-between vertikal |

### Icons

```
// Lucide Icon einfügen
icon "search"
icon "chevron-down"
icon "user"
icon "settings"
icon "x"

// Mit Größe
icon "search" size 20
```

Alle Icons von [Lucide](https://lucide.dev/icons) sind verfügbar.

### Overflow

| Property | Beispiel | Beschreibung |
|----------|----------|--------------|
| `scroll` | `scroll` | Overflow scroll (beide Achsen) |
| `scroll-x` | `scroll-x` | Nur horizontales Scrollen |
| `scroll-y` | `scroll-y` | Nur vertikales Scrollen |
| `clip` | `clip` | Overflow hidden |

### Sonstiges

| Property | Beispiel | Beschreibung |
|----------|----------|--------------|
| `opacity` | `opacity 0.5` | Transparenz (0-1) |
| `cursor` | `cursor pointer` | Cursor-Stil |
| `z` | `z 100` | Z-Index |
| `shadow` | `shadow` | Standard-Schatten |
| `sha` | `sha 0 4 12 #00000040` | Schatten x y blur farbe |
| `font` | `font "Inter"` | Schriftfamilie |
| `cen` | `cen` | Zentriert (hor-cen + ver-cen) |

### Modifiers

Schnelle Style-Varianten mit `-` Prefix:

```
Button -primary "Speichern"
Button -secondary "Abbrechen"
Button -outlined "Details"
Button -ghost "Mehr"
Button -disabled "Inaktiv"
Button -rounded "Rund"
```

| Modifier | Beschreibung |
|----------|--------------|
| `-primary` | Primärfarbe (#3B82F6), weißer Text |
| `-secondary` | Sekundärfarbe (#6B7280), weißer Text |
| `-outlined` | Transparenter Hintergrund, blauer Rahmen |
| `-filled` | Ausgefüllter Hintergrund |
| `-ghost` | Transparenter Hintergrund, kein Rahmen |
| `-disabled` | 50% Transparenz, nicht klickbar |
| `-rounded` | Vollständig abgerundet (pill shape) |

---

## Bilder

Füge Bilder mit `src` ein:

```
// Einfaches Bild
ver w 200 h 150 rad 8 clip
  src "https://example.com/image.jpg"

// Mit Alt-Text
ver w 200 h 150 rad 8 clip
  src "https://example.com/image.jpg" alt "Beschreibung"

// Object-Fit Optionen
ver w 200 h 150 rad 8 clip
  src "https://example.com/image.jpg" fit "contain"
```

| Property | Werte | Beschreibung |
|----------|-------|--------------|
| `src` | URL | Bild-URL |
| `alt` | Text | Alternativtext |
| `fit` | `cover`, `contain`, `fill`, `none` | Wie das Bild skaliert (default: cover) |

**Beispiel: Avatar mit Bild**
```
Avatar: w 48 h 48 rad 24 clip
  src "https://i.pravatar.cc/96"
```

**Beispiel: Produktkarte**
```
Card: ver bg #1E1E1E rad 12 clip
  ver h 200
    src "https://example.com/product.jpg"
  ver pad 16 gap 8
    size 16 weight 600 col #FFF "Produktname"
    size 14 col #10B981 "€ 49,99"
```

---

## Hover States

Füge interaktive Hover-Effekte mit `hover-` Prefix hinzu:

```
// Button mit Hover
Button: pad 12 20 bg #3B82F6 rad 8 col #FFF hover-bg #2563EB

// Karte mit mehreren Hover-Effekten
Card: pad 16 bg #1E1E1E rad 8 bor 1 boc #333 hover-bg #252525 hover-boc #3B82F6

// Link mit Farbwechsel
Link: col #888 hover-col #FFF
```

| Property | Beschreibung |
|----------|--------------|
| `hover-bg` | Hintergrundfarbe bei Hover |
| `hover-col` | Textfarbe bei Hover |
| `hover-boc` | Rahmenfarbe bei Hover |
| `hover-bor` | Rahmenbreite bei Hover |
| `hover-rad` | Border-radius bei Hover |

**Beispiel: Interaktive Navigation**
```
NavItem: pad 10 16 rad 6 col #888 hover-bg #1E1E1E hover-col #FFF
```

**Beispiel: Button-Varianten**
```
Button: pad 12 20 bg #3B82F6 rad 8 col #FFF hover-bg #2563EB
GhostButton: pad 12 20 bg transparent rad 8 col #3B82F6 bor 1 boc transparent hover-bg #3B82F610 hover-boc #3B82F6
DangerButton: pad 12 20 bg #EF4444 rad 8 col #FFF hover-bg #DC2626
```

---

## Interaktives System (States, Events, Actions)

Mirror unterstützt interaktive Komponenten mit States, Events und Actions.

### States definieren

Definiere verschiedene Zustände für eine Komponente:

```
Toggle: w 48 h 24 rad 12 bg #333
  state off
    bg #333
  state on
    bg #3B82F6
```

### Events

Reagiere auf Benutzer-Interaktionen:

| Event | Beschreibung |
|-------|--------------|
| `onclick` | Klick auf Element |
| `onhover` | Maus über Element |
| `onfocus` | Element erhält Fokus |
| `onblur` | Element verliert Fokus |
| `onchange` | Wert ändert sich |
| `onload` | Element wird geladen |

### Actions

Führe Aktionen aus wenn Events ausgelöst werden:

| Action | Beispiel | Beschreibung |
|--------|----------|--------------|
| `toggle` | `onclick toggle` | Wechselt zum nächsten State |
| `toggle X` | `onclick toggle Menu` | Wechselt State von Komponente X |
| `open X` | `onclick open Dialog` | Öffnet Komponente X als Overlay |
| `open X anim` | `onclick open Dialog slide-up` | Öffnet mit Animation |
| `open X anim ms` | `onclick open Dialog fade 300` | Öffnet mit Animation und Dauer |
| `close` | `onclick close` | Schließt oberstes Overlay |
| `close X` | `onclick close Dialog` | Schließt spezifisches Overlay |
| `close X anim ms` | `onclick close Dialog fade 150` | Schließt mit Animation |
| `show X` | `onclick show Tooltip` | Zeigt Komponente X |
| `hide X` | `onclick hide Tooltip` | Versteckt Komponente X |
| `change X to Y` | `onclick change self to active` | Setzt State von X auf Y |
| `page X` | `onclick page Home` | Navigiert zu Seite X |

**Animationen:** `slide-up`, `slide-down`, `slide-left`, `slide-right`, `fade`, `scale`, `none`

### Beispiele

**Toggle Button:**
```
ToggleButton: pad 12 20 rad 8
  state inactive
    bg #333 col #888
  state active
    bg #3B82F6 col #FFF
  onclick toggle
```

**Externe Steuerung:**
```
// Button öffnet ein Dropdown
OpenButton: pad 12 bg #3B82F6 rad 8 col #FFF
  onclick open Menu

Menu:
  Dropdown
    Trigger "Menü"
    Content
      Item "Option 1"
      Item "Option 2"
```

**Seiten-Navigation:**
```
NavItem: pad 12 16 rad 6 col #888 hover-col #FFF
  onclick page Dashboard

NavItem: pad 12 16 rad 6 col #888 hover-col #FFF
  onclick page Settings
```

### Bedingte Logik

Verwende `if`, `else`, `and`, `or`, `not` für bedingte Aktionen:

```
Button: pad 12 bg #3B82F6 rad 8
  onclick if isLoggedIn
    page Dashboard
  else
    open LoginDialog
```

### Benutzerdefinierte Overlays

Öffne eigene Komponenten als modale Overlays mit Animationen:

**Definition einer Overlay-Komponente:**
```
// Components Tab - wird NICHT direkt gerendert
ConfirmDialog: ver pad 24 bg #1E1E2E rad 12
  Title: size 18 weight 600 col #FFF "Bist du sicher?"
  Description: size 14 col #888 mar-u 16
    "Diese Aktion kann nicht rückgängig gemacht werden."
  Actions: hor gap 8 mar-u 24 hor-r
    Button onclick close "Abbrechen"
    Button onclick close ConfirmDialog fade 150 "Bestätigen"
```

**Öffnen mit Animation:**
```
// Layout Tab
Button onclick open ConfirmDialog slide-up "Dialog öffnen"
Button onclick open ConfirmDialog fade 200 "Fade öffnen"
Button onclick open ConfirmDialog scale 300 "Scale öffnen"
```

**Schließen:**
```
// Innerhalb des Overlays
Button onclick close "Schließen"              // Schließt oberstes Overlay
Button onclick close ConfirmDialog "OK"       // Schließt spezifisches Overlay
Button onclick close ConfirmDialog fade 150   // Mit Animation schließen

// Klick auf Backdrop schließt automatisch
```

**Vollständiges Beispiel:**
```
// Components Tab
DeleteConfirm: ver pad 32 bg #1E1E2E rad 16 w 400
  icon "alert-triangle" size 48 col #EF4444
  Title: size 20 weight 600 col #FFF mar-u 16 "Datei löschen?"
  Text: size 14 col #888 align center
    "Diese Datei wird unwiderruflich gelöscht."
  Actions: hor gap 12 mar-u 24
    CancelBtn: pad 12 24 bg #333 rad 8 col #FFF
      onclick close
      "Abbrechen"
    DeleteBtn: pad 12 24 bg #EF4444 rad 8 col #FFF
      onclick close DeleteConfirm fade 150
      "Löschen"

// Layout Tab
Button onclick open DeleteConfirm scale 200 "Datei löschen"
```

---

## Library Components

Vorgefertigte, accessible Komponenten basierend auf Radix UI. Öffne den **Library** Tab, um alle zu sehen.

### Overlays

#### Dropdown

Menü mit Trigger-Button:

```
Dropdown
  Trigger "Optionen"
  Content
    Item "Bearbeiten"
    Item "Duplizieren"
    Separator
    Item "Löschen"
```

**Gestylt:**
```
Dropdown
  Trigger: hor ver-cen gap 8 pad 10 14 bg #252525 rad 6 bor 1 boc #444
    icon "menu"
    "Aktionen"
  Content: ver bg #1E1E1E rad 8 pad 4 min-w 180 sha 0 8 24 #00000060
    Item: pad 10 14 rad 4 size 14
      icon "edit" size 16
      "Bearbeiten"
    Item: pad 10 14 rad 4 size 14
      icon "copy" size 16
      "Duplizieren"
    Separator: h 1 bg #333 mar u-d 4
    Item: pad 10 14 rad 4 size 14 col #EF4444
      icon "trash" size 16
      "Löschen"
```

#### Dialog

Modal-Dialog mit Overlay:

```
Dialog
  Trigger "Dialog öffnen"
  Portal
    Overlay
    Content
      Title "Bestätigung"
      Description "Möchtest du fortfahren?"
      Close "Schließen"
```

**Vollständiges Beispiel:**
```
Dialog
  Trigger: pad 12 20 bg #3B82F6 rad 8 col #FFF size 14 weight 500
    "Neues Projekt"
  Portal
    Overlay: bg #00000080
    Content: ver gap 20 pad 24 bg #1A1A1A rad 12 w 450 sha 0 16 48 #000000
      Title: size 20 weight 600 col #FFF
        "Neues Projekt erstellen"
      Description: size 14 col #9CA3AF line 1.5
        "Gib deinem Projekt einen Namen und eine Beschreibung."

      ver gap 16
        ver gap 6
          size 14 weight 500 col #FFF "Name"
          Input
            Field placeholder "Mein Projekt"
        ver gap 6
          size 14 weight 500 col #FFF "Beschreibung"
          Input
            Field placeholder "Optional..."

      hor gap 12 hor-r
        Close: pad 10 20 bg transparent rad 6 bor 1 boc #444 col #FFF size 14
          "Abbrechen"
        Close: pad 10 20 bg #3B82F6 rad 6 col #FFF size 14 weight 500
          "Erstellen"
```

#### Tooltip

Hover-Tooltip:

```
Tooltip
  Trigger
    icon "info" size 16 col #888
  Content "Hilfreicher Hinweis hier"
```

**Gestylt:**
```
Tooltip
  Trigger: pad 4 rad 4
    icon "help-circle" size 18 col #666
  Content: pad 8 12 bg #333 rad 6 size 12 col #FFF max-w 200
    "Dieser Wert wird automatisch berechnet basierend auf deinen Einstellungen."
```

#### Popover

Klick-Popover:

```
Popover
  Trigger "Mehr Info"
  Content
    ver gap 8 pad 16 w 280
      size 14 weight 600 col #FFF "Details"
      size 13 col #9CA3AF line 1.5 "Hier können komplexere Inhalte stehen."
```

#### AlertDialog

Bestätigungs-Dialog:

```
AlertDialog
  Trigger "Löschen"
  Portal
    Overlay
    Content
      Title "Wirklich löschen?"
      Description "Diese Aktion kann nicht rückgängig gemacht werden."
      hor gap 12 hor-r
        Cancel "Abbrechen"
        Action "Ja, löschen"
```

#### ContextMenu

Rechtsklick-Menü:

```
ContextMenu
  Trigger
    ver pad 24 bg #1E1E1E rad 8 hor-cen ver-cen
      size 14 col #888 "Rechtsklick hier"
  Content
    Item "Ausschneiden"
    Item "Kopieren"
    Item "Einfügen"
    Separator
    Item "Löschen"
```

#### HoverCard

Rich-Hover-Content:

```
HoverCard
  Trigger
    size 14 col #3B82F6 underline "@benutzername"
  Content
    hor gap 12 pad 16 w 300
      Avatar
        Image src "https://example.com/avatar.jpg"
        Fallback "AB"
      ver gap 4
        size 14 weight 600 col #FFF "Anna Beispiel"
        size 13 col #888 "Produktdesignerin bei XYZ"
```

---

### Navigation

#### Tabs

Tab-Navigation:

```
Tabs
  List
    Tab "Übersicht"
    Tab "Einstellungen"
    Tab "Team"
  Panel
    "Inhalt für Übersicht"
  Panel
    "Inhalt für Einstellungen"
  Panel
    "Inhalt für Team"
```

**Gestylt:**
```
Tabs
  List: hor gap 0 bg #1E1E1E rad 8 pad 4
    Tab: pad 10 20 rad 6 size 14 col #888
      "Übersicht"
    Tab: pad 10 20 rad 6 size 14 col #888
      "Statistiken"
    Tab: pad 10 20 rad 6 size 14 col #888
      "Einstellungen"
  Panel: pad 20
    ver gap 16
      size 18 weight 600 col #FFF "Übersicht"
      size 14 col #9CA3AF line 1.5 "Willkommen zurück! Hier siehst du eine Zusammenfassung."
  Panel: pad 20
    "Statistiken-Inhalt hier..."
  Panel: pad 20
    "Einstellungen-Inhalt hier..."
```

#### Accordion

Aufklappbare Sektionen:

```
Accordion
  Item
    Trigger "Was ist Mirror?"
    Content "Mirror ist ein visueller UI-Designer mit eigener DSL."
  Item
    Trigger "Wie funktioniert es?"
    Content "Du definierst Tokens und Komponenten, dann baust du dein Layout."
  Item
    Trigger "Kann ich den Code exportieren?"
    Content "Ja! Du kannst React-Code oder JSON exportieren."
```

**Gestylt:**
```
Accordion
  Item: bor d 1 boc #333
    Trigger: hor ver-cen pad 16 size 14 weight 500 col #FFF
      "Was ist Mirror?"
    Content: pad 0 16 16 16 size 14 col #9CA3AF line 1.6
      "Mirror ist ein visueller UI-Designer, der eine eigene DSL (Domain-Specific Language) verwendet. Du kannst damit schnell Prototypen erstellen und als React-Code exportieren."
  Item: bor d 1 boc #333
    Trigger: hor ver-cen pad 16 size 14 weight 500 col #FFF
      "Brauche ich Programmierkenntnisse?"
    Content: pad 0 16 16 16 size 14 col #9CA3AF line 1.6
      "Die DSL ist einfach zu lernen. Grundlegende Konzepte wie Abstände und Farben helfen, aber du brauchst keine Programmiererfahrung."
```

#### Collapsible

Einzelner aufklappbarer Bereich:

```
Collapsible
  Trigger
    hor ver-cen gap 8
      icon "chevron-right" size 16
      "Mehr anzeigen"
  Content
    ver gap 8 pad l 24
      "Versteckter Inhalt 1"
      "Versteckter Inhalt 2"
      "Versteckter Inhalt 3"
```

---

### Form

#### Input

Text-Eingabefeld mit optionalem Label und Hinweis.

**Slots:**
| Slot | Required | Beschreibung |
|------|----------|--------------|
| `Label` | Nein | Text-Label über dem Feld |
| `Field` | Ja | Das eigentliche Eingabefeld |
| `Hint` | Nein | Hilfetext unter dem Feld |

**Field Properties:**
| Property | Werte | Beschreibung |
|----------|-------|--------------|
| `placeholder` | Text | Platzhaltertext |
| `type` | `text`, `password`, `email`, `number`, `tel`, `url` | Eingabetyp |

**Einfaches Beispiel:**
```
Input
  Label "E-Mail"
  Field placeholder "name@beispiel.de"
  Hint "Wir geben deine E-Mail nicht weiter"
```

**Verschiedene Typen:**
```
// Standard Text
Input
  Label "Name"
  Field placeholder "Max Mustermann"

// Passwort
Input
  Label "Passwort"
  Field placeholder "••••••••" type "password"

// E-Mail
Input
  Label "E-Mail"
  Field placeholder "name@beispiel.de" type "email"

// Nur mit Placeholder (ohne Label)
Input
  Field placeholder "Suchen..."
```

**Gestylt:**
```
Input
  Label: size 14 weight 500 col #FFF
    "Benutzername"
  Field: h 44 pad l-r 14 bg #252525 rad 8 bor 1 boc #333 col #FFF size 14
    placeholder "Dein Benutzername"
  Hint: size 12 col #888
    "Mindestens 3 Zeichen"
```

#### Select

Dropdown-Auswahl:

```
Select
  Trigger "Wählen..."
  Content
    Item "Option 1"
    Item "Option 2"
    Item "Option 3"
```

**Mit Gruppen:**
```
Select
  Trigger: pad 12 bg #252525 rad 6 bor 1 boc #444 min-w 200
    "Land wählen"
  Content: bg #1E1E1E rad 8 pad 4
    Group
      Label: pad 8 12 size 12 col #888 uppercase
        "Europa"
      Item: pad 10 14 rad 4 size 14 col #FFF
        "Deutschland"
      Item: pad 10 14 rad 4 size 14 col #FFF
        "Österreich"
      Item: pad 10 14 rad 4 size 14 col #FFF
        "Schweiz"
    Separator: h 1 bg #333 mar u-d 4
    Group
      Label: pad 8 12 size 12 col #888 uppercase
        "Nordamerika"
      Item: pad 10 14 rad 4 size 14 col #FFF
        "USA"
      Item: pad 10 14 rad 4 size 14 col #FFF
        "Kanada"
```

#### Switch

Toggle-Schalter:

```
Switch
```

**Mit Label:**
```
hor gap 12 ver-cen
  Switch
  ver gap 2
    size 14 weight 500 col #FFF "Dark Mode"
    size 12 col #888 "Dunkles Theme aktivieren"
```

#### Checkbox

Kontrollkästchen:

```
Checkbox
  Indicator
  Label "Ich akzeptiere die AGB"
```

**Checkbox-Gruppe:**
```
ver gap 12
  size 14 weight 500 col #FFF "Benachrichtigungen"

  Checkbox
    Indicator
    Label "E-Mail-Updates"

  Checkbox
    Indicator
    Label "Push-Nachrichten"

  Checkbox
    Indicator
    Label "SMS-Benachrichtigungen"
```

#### RadioGroup

Radio-Button-Gruppe:

```
RadioGroup
  Item value "1"
    Indicator
    Label "Option 1"
  Item value "2"
    Indicator
    Label "Option 2"
  Item value "3"
    Indicator
    Label "Option 3"
```

**Gestylt:**
```
ver gap 8
  size 14 weight 500 col #FFF "Zahlungsmethode"

  RadioGroup
    Item: hor gap 12 ver-cen pad 12 bg #1E1E1E rad 8 bor 1 boc #333
      Indicator
      ver gap 2
        Label: size 14 col #FFF "Kreditkarte"
        size 12 col #888 "Visa, Mastercard, Amex"
    Item: hor gap 12 ver-cen pad 12 bg #1E1E1E rad 8 bor 1 boc #333
      Indicator
      ver gap 2
        Label: size 14 col #FFF "PayPal"
        size 12 col #888 "Schnell und sicher"
    Item: hor gap 12 ver-cen pad 12 bg #1E1E1E rad 8 bor 1 boc #333
      Indicator
      ver gap 2
        Label: size 14 col #FFF "Überweisung"
        size 12 col #888 "Dauert 2-3 Werktage"
```

#### Slider

Schieberegler:

```
Slider
  Track
    Range
  Thumb
```

**Mit Wert-Anzeige:**
```
ver gap 8
  hor ver-cen
    size 14 weight 500 col #FFF "Lautstärke"
    grow
    size 14 col #888 "75%"

  Slider
    Track: h 4 bg #333 rad 2
      Range: bg #3B82F6 rad 2
    Thumb: w 20 h 20 bg #FFF rad 10 sha 0 2 8 #00000040
```

---

### Feedback

#### Toast

Benachrichtigungen:

```
Toast
  Trigger "Toast anzeigen"
  Content
    Title "Gespeichert"
    Description "Deine Änderungen wurden gespeichert."
```

**Verschiedene Stile:**
```
// Erfolg
Toast
  Trigger: pad 12 20 bg #10B981 rad 8 col #FFF
    "Erfolg anzeigen"
  Content: hor gap 12 pad 16 bg #1E1E1E rad 8 bor 1 boc #10B981 sha 0 8 24 #000
    icon "check-circle" size 20 col #10B981
    ver gap 4
      Title: size 14 weight 600 col #FFF
        "Erfolgreich!"
      Description: size 13 col #9CA3AF
        "Die Aktion wurde abgeschlossen."

// Fehler
Toast
  Trigger: pad 12 20 bg #EF4444 rad 8 col #FFF
    "Fehler anzeigen"
  Content: hor gap 12 pad 16 bg #1E1E1E rad 8 bor 1 boc #EF4444 sha 0 8 24 #000
    icon "alert-circle" size 20 col #EF4444
    ver gap 4
      Title: size 14 weight 600 col #FFF
        "Fehler!"
      Description: size 13 col #9CA3AF
        "Etwas ist schief gelaufen."
```

#### Progress

Fortschrittsanzeige:

```
Progress value 75
  Indicator
```

**Gestylt:**
```
ver gap 8
  hor ver-cen
    size 14 col #FFF "Upload"
    grow
    size 14 col #888 "75%"

  Progress value 75
    Indicator: bg #3B82F6 rad 4 h 8
```

#### Avatar

Benutzer-Avatar:

```
Avatar
  Image src "https://example.com/avatar.jpg"
  Fallback "AB"
```

**Avatar-Gruppe:**
```
hor
  Avatar: w 40 h 40 rad 20 bor 2 boc #0A0A0A mar r -12
    Image src "https://i.pravatar.cc/80?u=1"
    Fallback "A"
  Avatar: w 40 h 40 rad 20 bor 2 boc #0A0A0A mar r -12
    Image src "https://i.pravatar.cc/80?u=2"
    Fallback "B"
  Avatar: w 40 h 40 rad 20 bor 2 boc #0A0A0A mar r -12
    Image src "https://i.pravatar.cc/80?u=3"
    Fallback "C"
  Avatar: w 40 h 40 rad 20 bor 2 boc #0A0A0A bg #333 hor-cen ver-cen
    Fallback: size 12 col #888
      "+5"
```

---

## Komplette Beispiele

### Dashboard-Karte

```
// Tokens
$bg-card: #1A1A1A
$text: #FFFFFF
$text-muted: #9CA3AF
$success: #10B981
$radius: 12

// Components
StatCard: ver pad 20 bg $bg-card rad $radius gap 12
  StatLabel size 13 col $text-muted uppercase weight 500
  StatValue size 32 weight 700 col $text
  StatChange hor gap 4 ver-cen size 13

// Layout
hor gap 16

  StatCard
    StatLabel "Umsatz"
    StatValue "€ 24.580"
    StatChange col $success
      icon "trending-up" size 16
      "+12.5%"

  StatCard
    StatLabel "Bestellungen"
    StatValue "1.429"
    StatChange col $success
      icon "trending-up" size 16
      "+8.2%"

  StatCard
    StatLabel "Kunden"
    StatValue "892"
    StatChange col $success
      icon "trending-up" size 16
      "+15.3%"
```

### Navigation Bar

```
// Tokens
$bg-nav: #0A0A0A
$border: #1E1E1E
$text: #FFFFFF
$text-muted: #888888
$primary: #3B82F6

// Components
NavLink: pad 8 12 rad 6 size 14 col $text-muted
NavLinkActive: from NavLink bg #1E1E1E col $text

// Layout
hor pad l-r 24 h 64 bg $bg-nav bor d 1 boc $border ver-cen

  // Logo
  hor gap 8 ver-cen
    icon "hexagon" size 24 col $primary
    size 18 weight 700 col $text "Mirror"

  // Navigation
  hor gap 4 mar l 32
    NavLinkActive "Dashboard"
    NavLink "Projekte"
    NavLink "Team"
    NavLink "Einstellungen"

  grow

  // Rechte Seite
  hor gap 16 ver-cen
    icon "bell" size 20 col $text-muted
    icon "search" size 20 col $text-muted
    Avatar w 32 h 32 rad 16
      Image src "https://i.pravatar.cc/64"
      Fallback "M"
```

### Formular mit Validierung

```
// Tokens
$bg: #0A0A0A
$bg-card: #1A1A1A
$bg-input: #252525
$text: #FFFFFF
$text-muted: #9CA3AF
$border: #333333
$primary: #3B82F6
$danger: #EF4444
$radius: 8

// Components
FormCard: ver pad 32 bg $bg-card rad 12 gap 24 w 400

FormField: ver gap 6
FormLabel: size 14 weight 500 col $text
FormInput: h 44 pad l-r 14 bg $bg-input rad $radius bor 1 boc $border col $text size 14
FormError: hor gap 6 ver-cen size 12 col $danger
  icon "alert-circle" size 14

Button: hor hor-cen ver-cen h 44 pad l-r 20 rad $radius bg $primary col $text size 14 weight 500

// Layout
ver full hor-cen ver-cen bg $bg

  FormCard
    ver gap 4
      size 24 weight 600 col $text "Registrieren"
      size 14 col $text-muted "Erstelle dein kostenloses Konto"

    FormField
      FormLabel "Name"
      Input
        Field placeholder "Dein Name"

    FormField
      FormLabel "E-Mail"
      Input
        Field placeholder "name@beispiel.de" type "email"
      FormError
        "Bitte gib eine gültige E-Mail ein"

    FormField
      FormLabel "Passwort"
      Input
        Field placeholder "Mindestens 8 Zeichen" type "password"

    Checkbox
      Indicator
      Label: size 13 col $text-muted
        "Ich akzeptiere die AGB und Datenschutzerklärung"

    Button "Konto erstellen"

    hor hor-cen gap 4 size 13
      col $text-muted "Bereits registriert?"
      col $primary "Anmelden"
```

---

## Key Concepts

### Explizite Definitionen vs Instanzen

**Nur explizite Definitionen (mit `:`) erstellen wiederverwendbare Templates:**

```
// Dies erstellt ein wiederverwendbares Template
Footer: pad 16 bg #242424 hor gap 16
  Button "Okay"
  Button "Abbrechen"

// Dies verwendet das Template (bekommt alle Kinder)
Footer
```

**Instanzen ohne `:` modifizieren keine Templates:**

```
// Dies erstellt KEIN Template
Footer pad 16 bg #242424
  Button "Okay"

// Dieser Footer hat kein Styling und keine Kinder
Footer
```

### Instanz-Kinder ersetzen Template-Kinder

Wenn eine Instanz eigene Kinder hat, ersetzen sie die Template-Kinder:

```
Footer: hor gap 8
  Button "A"
  Button "B"

// Bekommt Template-Kinder: Button "A", Button "B"
Footer

// Ersetzt Kinder: Button "X", Button "Y"
Footer
  Button "X"
  Button "Y"
```

---

## Tipps & Best Practices

### 1. Tokens für Konsistenz

Definiere alle Farben und Abstände als Tokens:

```
// Gut
$primary: #3B82F6
Button: bg $primary

// Schlecht - Magic Values
Button: bg #3B82F6
```

### 2. Komponenten-Hierarchie

Baue kleine Komponenten und kombiniere sie:

```
// Basis-Elemente
Icon: size 16
Text: size 14 col #FFF
SmallText: from Text size 12 col #888

// Zusammengesetzte Komponenten
IconButton: hor ver-cen gap 8 pad 10 bg #252525 rad 6
  Icon
  Text
```

### 3. Vererbung nutzen

Erstelle Varianten durch `from`:

```
Button: pad 12 bg #3B82F6 rad 8 col #FFF
ButtonSmall: from Button pad 8 size 12
ButtonLarge: from Button pad 16 size 16
ButtonOutline: from Button bg transparent bor 1 boc #3B82F6 col #3B82F6
```

### 4. Layout-Container

Definiere wiederverwendbare Layout-Helfer:

```
Row: hor gap 16 ver-cen
Stack: ver gap 16
Center: hor-cen ver-cen
Spacer: grow
Container: max-w 1200 pad l-r 24
```

### 5. Inspect Mode nutzen

Halte `Shift` gedrückt, um Element-Grenzen zu sehen und das Layout zu debuggen.

---

## Multi-Page Support

Mirror unterstützt mehrere Seiten in einem Projekt.

### Seiten erstellen

Klicke auf **"+ Neue Seite"** in der linken Sidebar, um eine neue Seite hinzuzufügen.

### Zwischen Seiten wechseln

Klicke auf den Seitennamen in der Sidebar, um zu dieser Seite zu wechseln.

### Seiten umbenennen

Doppelklicke auf den Seitennamen, um ihn zu bearbeiten.

### Seiten löschen

Hover über eine Seite und klicke auf das X-Symbol.

### Navigation zwischen Seiten

Nutze die `page` Action, um zwischen Seiten zu navigieren:

```
// Navigation Button
NavButton: pad 12 20 bg #252525 rad 8 col #FFF
  onclick page Settings
  "Einstellungen"

// Navigation Link
NavLink: col #3B82F6 hover-col #60A5FA
  onclick page Home
  "Zurück zur Startseite"
```

---

## AI Generation

Mirror kann UI-Code automatisch generieren. Beschreibe was du willst, und erhalte DSL-Code.

### Voraussetzungen

1. **OpenRouter API Key** erforderlich
2. Nutzt Claude als Backend-Modell

### Verwendung

1. Klicke auf das **AI-Icon** in der Toolbar
2. Beschreibe deine gewünschte UI auf Deutsch oder Englisch
3. Der generierte Code wird in den Editor eingefügt

### Beispiel-Prompts

```
"Erstelle eine Login-Card mit E-Mail und Passwort Feldern"

"Baue eine Pricing-Tabelle mit 3 Spalten für Basic, Pro und Enterprise"

"Erstelle eine Sidebar-Navigation mit Icons und aktivem State"

"Baue ein Dashboard mit 4 Statistik-Karten oben und einer Tabelle darunter"
```

### Tipps für bessere Ergebnisse

- Sei spezifisch über Layout und Farben
- Erwähne welche Komponenten du nutzen willst
- Beschreibe die Hierarchie (z.B. "in einer Card")
- Nenne konkrete Texte und Platzhalter

---

## Extract Function

Extrahiere wiederverwendbare Komponenten aus deinem Layout-Code.

### Verwendung

1. Wähle den Code-Block im Layout-Editor aus
2. Klicke auf **"Extract"** in der Toolbar
3. Die Komponenten-Definition wird automatisch im Components-Tab erstellt
4. Im Layout bleibt nur die Komponenten-Nutzung

### Beispiel

**Vorher (Layout):**
```
ver pad 16 bg #1E1E1E rad 12 gap 8
  size 18 weight 600 col #FFF "Titel"
  size 14 col #888 "Beschreibung"
  hor gap 8
    pad 12 bg #3B82F6 rad 8 col #FFF "Button"
```

**Nachher:**

Components Tab:
```
Card: ver pad 16 bg #1E1E1E rad 12 gap 8
  Title size 18 weight 600 col #FFF
  Description size 14 col #888
  Actions hor gap 8
    Button pad 12 bg #3B82F6 rad 8 col #FFF
```

Layout Tab:
```
Card
  Title "Titel"
  Description "Beschreibung"
  Actions
    Button "Button"
```

---

## Projekt speichern & exportieren

### Auto-Save

Dein Projekt wird automatisch im Browser gespeichert (localStorage).

### Export als JSON

Klicke auf "Export" um das gesamte Projekt als JSON-Datei zu speichern.

### Import

Klicke auf "Import" um ein gespeichertes Projekt zu laden.

### React Export

Klicke auf "React" um funktionierenden React-Code zu exportieren.

---

## Architecture

```
src/
├── App.tsx                   # Main app
├── theme.ts                  # Color scheme
├── components/
│   ├── PromptPanel.tsx       # Code editor (CodeMirror)
│   ├── Preview.tsx           # Live preview renderer
│   ├── LibraryPanel.tsx      # Library component browser
│   ├── PageSidebar.tsx       # Multi-page navigation
│   ├── ErrorBoundary.tsx     # Error boundary
│   ├── ErrorDialog.tsx       # Error dialog
│   └── KeyboardShortcutsPanel.tsx
├── hooks/
│   └── useHistory.ts         # Undo/Redo history
├── parser/
│   ├── lexer.ts              # Tokenization
│   └── parser.ts             # AST generation
├── editor/
│   ├── dsl-syntax.ts         # Syntax highlighting
│   └── dsl-linter.ts         # Real-time validation
├── generator/
│   ├── react-generator.tsx   # AST to React
│   ├── react-exporter.ts     # React code export
│   └── behaviors/            # Library component handlers
├── library/
│   ├── types.ts              # Library types
│   ├── registry.ts           # Component registry
│   └── components/           # 19 component definitions
├── validation/               # LLM output validation
└── lib/
    └── ai.ts                 # OpenRouter API integration
```

---

## Scripts

```bash
npm run dev       # Start dev server
npm run build     # Build for production
npm run test      # Run tests
npm run lint      # Lint code
```

---

## Tech Stack

- React 19
- TypeScript
- Vite
- CodeMirror 6
- Radix UI (accessible components)
- Lucide React (icons)
- Vitest (264 tests)
- OpenRouter API (Claude)
