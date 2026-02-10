# Mirror DSL Konzept

## Kernphilosophie

Mirror trennt **WAS** (Struktur/Layout) von **WIE** (Styling/Aussehen):

- **Components Tab**: Definiert das Aussehen (Templates)
- **Layout Tab**: Definiert die Struktur (Instanzen)
- **Tokens Tab**: Definiert wiederverwendbare Werte (Variablen)

---

## 1. Tokens (Design-Variablen)

Tokens sind das Fundament des Design-Systems. Sie definieren wiederverwendbare Werte für Konsistenz.

### Farb-Tokens
```
// Markenfarben
$primary: #3B82F6
$primary-hover: #2563EB
$secondary: #6366F1
$accent: #10B981

// Oberflächen
$bg: #0A0A0A
$surface: #1A1A1A
$surface-hover: #252525
$border: #333333

// Text
$text: #FFFFFF
$text-muted: #888888
$text-subtle: #555555

// Status
$success: #22C55E
$warning: #F59E0B
$error: #EF4444
```

### Grössen-Tokens
```
// Abstände
$spacing-xs: 4
$spacing-sm: 8
$spacing: 16
$spacing-lg: 24
$spacing-xl: 32

// Radien
$radius-sm: 4
$radius: 8
$radius-lg: 12
$radius-full: 99

// Schriftgrössen
$text-xs: 10
$text-sm: 12
$text-base: 14
$text-lg: 18
$text-xl: 24
```

### Font-Tokens
```
$font-sans: "Inter", system-ui, sans-serif
$font-mono: "JetBrains Mono", monospace
```

### Verwendung
Tokens werden mit `$name` referenziert:
```
Button bg $primary rad $radius pad $spacing
Card bg $surface boc $border rad $radius-lg
```

---

## 2. Component-Definitionen (Templates)

Eine Definition endet mit `:` und beschreibt das **Aussehen**.

```
// Components Tab
Button: bg $primary col #FFF pad 12 20 rad 8 weight 500
Card: bg $surface pad 24 rad 12 bor 1 boc $border ver gap 16
Tag: bg #3B82F620 col #3B82F6 pad 4 12 rad 99 size 12
```

### Inline-Definition (Ad-hoc Component)

Komponenten können auch direkt im Layout definiert werden - praktisch für einmalige Verwendung:

```
// Layout Tab - Definition und Verwendung in einem
ProductCard: bg $surface pad 20 rad 12 ver gap 12
  Image: h 160 bg #252525 rad 8
  Title: size 18 weight 600 col $text
  Price: size 20 weight 700 col $accent

ProductCard
  Image
  Title "Sneaker"
  Price "$129"
```

### Kompakte Inline-Syntax

Für einfache Fälle kann alles auf einer Zeile stehen:

```
// Definition mit Kindern inline
ProductTile: hor gap 16 Image "foto.jpg" Title "Name" Price "$99"

// Verwendung
ProductTile
```

### Vererbung mit `from`

```
PrimaryButton: from Button bg $primary
DangerButton: from Button bg $error
GhostButton: from Button bg transparent col $text bor 1 boc $border
```

---

## 3. Component-Instanzen (Verwendung)

Im Layout Tab verwendet man die definierten Components:

```
// Layout Tab
Card
  "Willkommen"
  PrimaryButton "Weiter"
```

### Überschreiben bei der Instanz

Instanzen können Properties überschreiben:

```
Button "Normal"
Button bg $error "Löschen"    // überschreibt bg
```

### Text-Inhalt

Text wird in Anführungszeichen angegeben - inline oder als Kind:

```
// Inline
Button "Klick mich"

// Als Kind (für mehrzeiligen Text)
Card
  "Willkommen bei Mirror"
  "Starte jetzt dein erstes Projekt."
```

---

## 4. Layout-System

### Richtung
- `hor` - Kinder horizontal (nebeneinander)
- `ver` - Kinder vertikal (untereinander, default)

### Ausrichtung
- `cen` - zentriert (Hauptachse)
- `cen cen` - zentriert (beide Achsen)
- `between` - Abstand gleichmässig verteilen
- `ver-cen` - Kreuzachse zentrieren

### Abstände
- `gap N` - Abstand zwischen Kindern
- `pad N` - Innenabstand (alle Seiten)
- `pad N N` - Innenabstand (vertikal horizontal)
- `mar N` - Aussenabstand

---

## 5. Hierarchie durch Einrückung

Kinder werden mit 2 Leerzeichen eingerückt:

```
Container
  Header
    Logo "Mirror"
    Nav
      NavItem "Home"
      NavItem "About"
  Content
    "Hauptinhalt"
```

---

## 6. Wichtige Properties

| Property | Bedeutung | Beispiel |
|----------|-----------|----------|
| `bg` | Hintergrund | `bg #333` oder `bg $surface` |
| `col` | Textfarbe | `col #FFF` |
| `pad` | Padding | `pad 16` oder `pad 12 24` |
| `mar` | Margin | `mar 8` |
| `gap` | Abstand Kinder | `gap 16` |
| `rad` | Border-Radius | `rad 8` |
| `bor` | Border-Breite | `bor 1` |
| `boc` | Border-Farbe | `boc $border` |
| `w` / `h` | Breite/Höhe | `w 200` `h 100` |
| `size` | Schriftgrösse | `size 14` |
| `weight` | Schriftgewicht | `weight 600` |
| `grow` | Flex-Grow | `grow` |
| `full` | Volle Grösse | `full` |

---

## 7. Best Practices

### ✅ Richtig: Styling in Components

```
// Components Tab
ColorBox: pad 16 rad 4

// Layout Tab
Row hor gap 8
  ColorBox bg #EF4444
  ColorBox bg #10B981
  ColorBox bg #3B82F6
```

### ❌ Falsch: Styling bei jeder Instanz wiederholen

```
// Layout Tab (SCHLECHT!)
Row hor gap 8
  Box bg #EF4444 pad 16 rad 4
  Box bg #10B981 pad 16 rad 4
  Box bg #3B82F6 pad 16 rad 4
```

### ✅ Richtig: Tokens für Konsistenz

```
// Tokens Tab
$card-padding: 24
$card-radius: 12

// Components Tab
Card: bg $surface pad $card-padding rad $card-radius
SmallCard: from Card pad 16 rad 8
```

### ❌ Falsch: Magische Zahlen überall

```
Card: bg #1A1A1A pad 24 rad 12
SmallCard: bg #1A1A1A pad 16 rad 8
```

---

## 8. Vollständiges Beispiel

### Tokens Tab
```
$primary: #3B82F6
$surface: #1A1A1A
$border: #333
$text: #FFF
$text-muted: #888
$radius: 8
$spacing: 16
```

### Components Tab
```
// Layout
Page: ver full bg #0A0A0A
Header: hor between ver-cen pad $spacing bg $surface

// Typography
Title: size 24 weight 700 col $text
Subtitle: size 14 col $text-muted

// Interactive
Button: bg $primary col #FFF pad 12 20 rad $radius weight 500
Card: bg $surface pad 24 rad 12 bor 1 boc $border ver gap $spacing
```

### Layout Tab
```
Page
  Header
    Title "Mirror"
    Button "Login"

  Card
    Title "Willkommen"
    Subtitle "Starte dein erstes Projekt"
    Button "Loslegen"
```

---

## 9. Interaktivität

### Hover-States
```
Button: bg #333 hover-bg $primary col #888 hover-col #FFF
```

### Events
```
Button
  onclick open modal
  "Öffnen"
```

### States
```
Toggle
  state on
    bg $primary
  state off
    bg #333
  onclick toggle
```

---

## 10. Library-Komponenten

Die Library enthält fertige, interaktive Komponenten mit eingebauter Logik.

### Verfügbare Komponenten

| Kategorie | Komponenten |
|-----------|-------------|
| **Overlays** | Dropdown, Dialog, Tooltip, Popover, AlertDialog, ContextMenu, HoverCard |
| **Navigation** | Tabs, Accordion, Collapsible |
| **Formulare** | Select, Switch, Checkbox, RadioGroup, Slider |
| **Feedback** | Toast, Progress, Avatar |

### Slot-System

Library-Komponenten haben vordefinierte Slots (Kinder):

```
Dropdown
  Trigger
    "Optionen"
  Content
    Item "Profil"
    Item "Einstellungen"
    Separator
    Item "Logout"
```

### Beispiel: Dropdown

```
Dropdown
  Trigger: hor ver-cen gap 8 pad 8 12 bg $surface rad 6 bor 1 boc $border
    icon "chevron-down"
    "Menü"
  Content: ver bg $surface rad 8 pad 4
    Item: hor ver-cen gap 8 pad 8 12 rad 4 hover-bg $primary
      icon "user"
      "Profil"
    Item: hor ver-cen gap 8 pad 8 12 rad 4 hover-bg $primary
      icon "settings"
      "Einstellungen"
    Separator: h 1 bg $border mar 4
    Item: hor ver-cen gap 8 pad 8 12 rad 4 hover-bg $error col #FF6B6B
      icon "log-out"
      "Logout"
```

### Beispiel: Dialog

```
Dialog
  Trigger
    Button "Dialog öffnen"
  Content: ver gap 16 pad 24 bg $surface rad 12 w 400
    Title "Bestätigung"
    "Möchtest du fortfahren?"
    Row hor gap 8
      Button bg $border "Abbrechen"
        onclick close
      Button "Bestätigen"
```

### Beispiel: Tabs

```
Tabs
  TabList: hor gap 4 bg $surface pad 4 rad 8
    Tab "Übersicht"
    Tab "Details"
    Tab "Einstellungen"
  TabContent
    Panel
      "Inhalt der Übersicht"
    Panel
      "Inhalt der Details"
    Panel
      "Inhalt der Einstellungen"
```

### Automatische States

Library-Komponenten haben eingebaute States:
- `Dropdown`: closed, open
- `Dialog`: closed, open
- `Accordion`: collapsed, expanded
- `Switch`: off, on
- `Checkbox`: unchecked, checked

### Actions

```
Button
  onclick open myDialog    // Öffnet Dialog
  onclick close myDropdown // Schliesst Dropdown
  onclick toggle myPanel   // Toggled State
```
