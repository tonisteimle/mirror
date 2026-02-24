# Mirror DSL Reference (v1)

> Mirror is a DSL for rapid UI prototyping. Auto-generated from src/dsl/properties.ts.

## Grundlagen

Basis-Syntax und Kommentare

### Inline-Syntax

Mirror v1 verwendet eine kompakte Inline-Syntax ohne geschweifte Klammern.

```
Component property value
Component property value, property2 value2
Component vertical, horizontal
Component "Text-Inhalt"
Component\n  Child
```

**Example:**
```
Button pad 12, bg #3B82F6, "Click me"
```

### Kommentare

```
// Einzeiliger Kommentar
property value,  // Inline-Kommentar
```

### Dimension Shorthand

Erste Zahlen nach Komponente werden als width/height interpretiert.

```
Box 300, 400, pad 16  // width: 300, height: 400
Card 200, pad 8       // width: 200
```

## Tokens (Design Variables)

Zweistufiges Token-System: Basis-Palette + Semantische Tokens

### Basis-Palette

Reine Farbwerte ohne semantische Bedeutung. Namensschema: `$farbe-stufe`

```
// Grey Scale
$grey-50: #FAFAFA
$grey-100: #F4F4F5
$grey-200: #E4E4E7
$grey-300: #D4D4D8
$grey-400: #A1A1AA
$grey-500: #71717A
$grey-600: #52525B
$grey-700: #3F3F46
$grey-800: #27272A
$grey-900: #18181B
$grey-950: #09090B

// Accent Colors
$blue-500: #3B82F6
$blue-600: #2563EB
$green-500: #22C55E
$yellow-500: #F59E0B
$red-500: #EF4444
```

### Semantische Tokens (Bound Property Format)

Tokens mit Property-Binding: `$name.property`

Die Property im Namen bestimmt den Verwendungszweck:
- `.bg` → Background
- `.col` → Color (Text/Foreground)
- `.pad` → Padding
- `.gap` → Gap
- `.rad` → Border-Radius
- `.font.size` → Font-Size (Compound Property)

```
// Background (referenziert Palette)
$app.bg: $grey-950
$default.bg: $grey-900
$elevated.bg: $grey-800
$surface.bg: $grey-700

// Foreground
$default.col: $grey-300
$muted.col: $grey-500
$heading.col: $grey-50

// Primary
$primary.bg: $blue-500
$primary.col: $blue-500
$primary.hover.bg: $blue-600

// Status
$success.bg: $green-500
$danger.bg: $red-500
$warning.bg: $yellow-500

// Spacing
$sm.pad: 4
$md.pad: 6
$lg.pad: 8

$sm.gap: 4
$md.gap: 6
$lg.gap: 8

// Radius
$sm.rad: 3
$md.rad: 4
$lg.rad: 6

// Typography (Compound)
$xs.font.size: 11
$sm.font.size: 12
$default.font.size: 13
```

### Verwendung in Komponenten

```
Button:
    background $primary.bg
    color $on-primary.col
    padding $sm.pad $lg.pad
    radius $md.rad
    hover
        background $primary.hover.bg

Card:
    background $elevated.bg
    padding $lg.pad
    radius $lg.rad
```

### Best Practices

| Regel | Beschreibung |
|-------|--------------|
| Palette zuerst | Basis-Farben ohne Semantik definieren |
| Semantik referenziert | Semantische Tokens referenzieren Palette |
| Property im Namen | `.bg`, `.col`, `.pad` zeigt Verwendung |
| Konsistente Stufen | xs, sm, md, lg, xl für Größen |
| Keine Magic Numbers | Alle Werte als Token definieren |

### Component References

Referenzieren von Properties anderer Komponenten.

```
Component.property
Button rad Card.radius
Panel bg Theme.background
```

## Komponenten

Definition, Vererbung und Instanzen

### Definition

Komponenten mit Doppelpunkt definieren (nicht rendern).

```
Name: properties
```

**Example:**
```
Button: pad 12, bg #3B82F6, rad 8
```

### Vererbung

Von anderen Komponenten erben mit Child: Parent.

```
Child: Parent overrides
```

**Example:**
```
DangerButton: Button bg #EF4444
GhostButton: Button bg transparent, bor 1 $primary
```

### Vererbung mit Child-Overrides

Kinder-Properties inline überschreiben mit Semicolon-Syntax.

```
Child: Parent childName property; childName2 property
```

**Example:**
```
Button:
  icon "check", hidden
  label "Click"

Icon-Button: Button icon visible; label hidden
```

### Instanz Child-Overrides

Die Semicolon-Syntax funktioniert auch für Instanzen (ohne Doppelpunkt).

```
Component childName "content"; childName2 "content"
```

**Example:**
```
// Definition mit Slots
NavItem:
  Icon:
  Label:

// Instanzen mit Child-Overrides
NavItem Icon "home"; Label "Home"
NavItem Icon "settings"; Label "Settings"
NavItem Icon "user"; Label "Profile"
```

### Instanzen

Komponenten verwenden (ohne Doppelpunkt).

```
Name content
Name "text"
```

**Example:**
```
Button "Click me"
Card
  Title "Welcome"
```

### Benannte Instanzen

Für Referenzierung in Events.

```
Component named Name
```

**Example:**
```
Button named SaveBtn "Save"
- Item named FirstItem "Dashboard"
```

### Inline Define + Render (as)

Komponenten definieren UND rendern in einem Schritt mit `as`.

```
Name as Type properties
```

**Example:**
```
Email as Input, pad 12, "placeholder@mail.com"
SearchIcon as Icon, size 20, "search"
Container bg #333, pad 16      // = Container as Box
```

### Slots

Vordefinierte Kinder-Platzhalter.

```
Parent
  Slot:
```

**Example:**
```
Card:
  Title:
  Description:
Card
  Title "Welcome"
  Description "Get started"
```

### Flat Access

Direkter Zugriff auf verschachtelte Slots.

```
Parent
  NestedSlot props
```

**Example:**
```
Header:
  Left:
    Logo:
Header
  Logo bg #F00  // Findet Logo in Left
```

### Listen (- Prefix)

Neue Instanzen mit - erstellen.

```
- Component
```

**Example:**
```
Menu
  - Item "Profile"
  - Item "Settings"
  - Item col #EF4444, "Logout"
```

## Properties

Styling und Layout

### Layout

| Name | Description |
|------|-------------|
| `horizontal / hor` | Horizontale Anordnung (row) |
| `vertical / ver` | Vertikale Anordnung (column) - Default |
| `center / cen` | Beide Achsen zentrieren |
| `gap / g` | Abstand zwischen Kindern |
| `spread` | Space-between Distribution |
| `wrap` | Erlaubt Umbruch |
| `stacked` | Kinder übereinander (z-layers) |

### Alignment

| Name | Description |
|------|-------------|
| `left` | Links ausrichten (horizontal) |
| `right` | Rechts ausrichten (horizontal) |
| `hor-center` | Horizontal zentrieren |
| `top` | Oben ausrichten (vertikal) |
| `bottom` | Unten ausrichten (vertikal) |
| `ver-center` | Vertikal zentrieren |

### Sizing

| Name | Description |
|------|-------------|
| `size` | Kombinierte Dimension (size hug 32, size 100 200) |
| `width hug` | Breite = Inhalt (fit-content) |
| `width full` | Breite = 100% + flex-grow |
| `width N` | Feste Breite in px |
| `height hug` | Höhe = Inhalt (fit-content) |
| `height full` | Höhe = 100% + flex-grow |
| `height N` | Feste Höhe in px |
| `min-width / minw` | Minimale Breite |
| `max-width / maxw` | Maximale Breite |
| `min-height / minh` | Minimale Höhe |
| `max-height / maxh` | Maximale Höhe |

### Spacing

Padding mit optionalen Richtungen.

```
pad 16
pad 16 12
pad 16 12 8 4
pad left 16
pad top 8 bottom 24
```

| Name | Description |
|------|-------------|
| `padding / p` | Innenabstand |
| `margin / m` | Außenabstand |

### Farben

| Name | Description |
|------|-------------|
| `color / c` | Textfarbe |
| `background / bg` | Hintergrundfarbe |
| `border-color / boc` | Rahmenfarbe |

### Border & Radius

```
bor 1
bor 1 #333
bor 2 dashed #3B82F6
bor t 1
rad 8
rad tl 8 br 8
```

| Name | Description |
|------|-------------|
| `border / bor` | Rahmen (width style color) |
| `radius / rad` | Eckenradius |

### Typography

| Name | Description |
|------|-------------|
| `font-size` | Schriftgröße (px) |
| `icon-size / is` | Icon-Größe (px) |
| `icon-weight / iw` | Icon-Strichstärke (100-700, Standard: 400) |
| `icon-color / ic` | Icon-Farbe (überschreibt color) |
| `fill` | Icon gefüllt (Material only) |
| `weight` | Schriftstärke (400, 600, bold) |
| `line` | Zeilenhöhe |
| `font` | Schriftart |
| `align` | Textausrichtung |
| `italic` | Kursiv |
| `underline` | Unterstrichen |
| `truncate` | Abschneiden mit Ellipsis |
| `uppercase` | Großbuchstaben |
| `lowercase` | Kleinbuchstaben |

### Visuals

| Name | Description |
|------|-------------|
| `opacity / o` | Transparenz (0-1) |
| `shadow` | Schatten (sm, md, lg) |
| `cursor` | Cursor-Stil |
| `z` | Z-Index |
| `hidden` | Versteckt starten |
| `visible` | Sichtbarkeit |
| `disabled` | Deaktiviert |
| `rotate / rot` | Rotation in Grad |
| `translate` | X Y Verschiebung |

### Scroll

| Name | Description |
|------|-------------|
| `scroll` | Vertikales Scrollen |
| `scroll-ver` | Vertikales Scrollen |
| `scroll-hor` | Horizontales Scrollen |
| `scroll-both` | Beide Richtungen |
| `clip` | Overflow hidden |

### Hover Properties

Inline Hover-Styles.

| Name | Description |
|------|-------------|
| `hover-background / hover-bg` | Hover Hintergrund |
| `hover-color / hover-col` | Hover Textfarbe |
| `hover-opacity / hover-opa` | Hover Transparenz |
| `hover-scale` | Hover Skalierung |
| `hover-border / hover-bor` | Hover Rahmen |
| `hover-border-color / hover-boc` | Hover Rahmenfarbe |
| `hover-radius / hover-rad` | Hover Eckenradius |

### Grid

Grid-Layout für Spalten.

```
grid 3                    // 3 gleiche Spalten
grid 2, g 16              // Mit Abstand
grid auto 250             // Auto-fill, min 250px
grid 30% 70%              // Prozentuale Spalten
```

### Inline Spans

Formatierung innerhalb von Strings.

```
"This is *important*:bold"
"Click *here*:underline"
"A *warning*:$customToken"
```

| Name | Description |
|------|-------------|
| `:bold` | Fett |
| `:italic` | Kursiv |
| `:underline` | Unterstrichen |
| `:$token` | Custom Token-Style |

## HTML Primitives

Native HTML-Elemente

### Primitives

| Name | Description |
|------|-------------|
| `Image "url"` | Bild (String = src) |
| `Input "placeholder"` | Eingabefeld (String = placeholder) |
| `Textarea "placeholder"` | Mehrzeiliges Eingabefeld |
| `Link href "/url", "Label"` | Hyperlink (String = Label) |
| `Button "Label"` | Button |
| `Icon "name"` | Icon (Lucide oder Material) |
| `Segment segments 4` | Segmentiertes Eingabefeld |

### Icons

Lucide (default) oder Material Icons.

```
Icon "search"
Icon "home", material
Icon "user", size 20, col #3B82F6
```

## States

System- und Behavior-States

### System States

Automatisch vom Browser bei Interaktion.

| Name | Description |
|------|-------------|
| `hover` | Maus über Element |
| `focus` | Element hat Fokus |
| `active` | Element ist aktiv (gedrückt) |
| `disabled` | Element ist deaktiviert |

### Behavior States

Aktiviert durch Actions.

| Name | Description |
|------|-------------|
| `highlighted` | Hervorgehoben (via highlight) |
| `selected` | Ausgewählt (via select) |
| `active` | Element ist aktiv (gedrückt) |
| `inactive` |  |
| `expanded` | Ausgeklappt |
| `collapsed` | Eingeklappt |
| `valid` | Eingabe valide |
| `invalid` | Eingabe invalide |
| `default` | Initialzustand |
| `on` | Toggle an |
| `off` | Toggle aus |

### State Syntax

```
hover
  bg #555
state hover
  bg #555
state highlighted
  bg #333
state selection
  selected
    bg #3B82F6
  not-selected
    bg transparent
```

## Events

Event-Handler und Keyboard-Events

### Basis Events

| Name | Description |
|------|-------------|
| `onclick` | Klick-Event |
| `onhover` | Hover-Event |
| `onchange` | Wert geändert (nach Blur) |
| `oninput` | Während Eingabe |
| `onload` | Komponente geladen |
| `onfocus` | Fokus erhalten |
| `onblur` | Fokus verloren |

### Keyboard Events

Mit Key-Modifier zwischen Event und Doppelpunkt.

```
onkeydown escape: close
onkeydown enter: select highlighted
onkeydown arrow-down: highlight next
```

| Name | Description |
|------|-------------|
| `escape` | Escape-Taste |
| `enter` | Enter-Taste |
| `tab` | Tab-Taste |
| `space` | Leertaste |
| `arrow-up` | Pfeil hoch |
| `arrow-down` | Pfeil runter |
| `arrow-left` | Pfeil links |
| `arrow-right` | Pfeil rechts |
| `backspace` | Backspace |
| `delete` | Delete |
| `home` | Home |
| `end` | End |

### Timing Modifiers

| Name | Description |
|------|-------------|
| `debounce N` | Verzögert bis N ms nach letztem Event |
| `delay N` | Verzögert um N ms |

**Example:**
```
oninput debounce 300: filter Results
onblur delay 200: hide Dropdown
```

### Zentralisierter Events Block

Trennt Layout und Behavior.

```
events
  ComponentName onclick
    action1
    action2
```

**Example:**
```
events
  SaveBtn onclick
    show Spinner
    Submit.disabled = true
```

## Actions

Interaktive Aktionen

### Navigation & Visibility

| Name | Description |
|------|-------------|
| `toggle` | Toggle-State wechseln |
| `show` | Element anzeigen |
| `hide` | Element verstecken |
| `open` | Overlay/Dialog öffnen |
| `close` | Overlay schließen |
| `page` | Zu Seite wechseln |

### Selection & Highlight

| Name | Description |
|------|-------------|
| `highlight` | Element hervorheben |
| `select` | Element auswählen |
| `deselect` | Auswahl aufheben |
| `clear-selection` | Alle Auswahlen löschen |
| `filter` | Liste filtern |

### State Changes

| Name | Description |
|------|-------------|
| `change` | State ändern (change self to X) |
| `activate` | Element aktivieren |
| `deactivate` | Element deaktivieren |
| `deactivate-siblings` | Geschwister deaktivieren |
| `toggle-state` | State umschalten |

### Assignments & Forms

| Name | Description |
|------|-------------|
| `assign` | Variable zuweisen |
| `validate` | Formular validieren |
| `reset` | Formular zurücksetzen |
| `focus` | Fokus setzen |
| `alert` | Alert anzeigen |

### JavaScript Integration

| Name | Description |
|------|-------------|
| `call` | Externe JavaScript-Funktion aufrufen |

**Example:**
```
// JavaScript-Funktion definieren (außerhalb von Mirror)
function handleLogin(data) {
  console.log('Login:', data)
}

// In Mirror aufrufen
Button onclick call handleLogin, "Login"
```

### Action Targets

| Name | Description |
|------|-------------|
| `self` | Das aktuelle Element |
| `next` | Nächstes Element |
| `prev` | Vorheriges Element |
| `first` | Erstes Element |
| `last` | Letztes Element |
| `first-empty` | Erstes leeres Element |
| `highlighted` | Hervorgehobenes Element |
| `selected` | Ausgewähltes Element |
| `self-and-before` | Selbst und alle davor |
| `all` | Alle Elemente |
| `none` | Kein Element |

## Conditionals & Logic

Bedingungen und Operatoren

### Block Conditionals

```
if $condition
  Component
if $condition
  Component
else
  Other
```

**Example:**
```
if $isLoggedIn
  Avatar
else
  Button "Login"
```

### Property Conditionals

Inline Bedingungen für Properties.

```
if $cond then property value
if $cond then property value else property value2
```

**Example:**
```
Button if $active then bg #3B82F6 else bg #333
Icon if $task.done then "check" else "circle"
```

### Operatoren

| Name | Description |
|------|-------------|
| `==, !=` | Gleichheit / Ungleichheit |
| `>, <, >=, <=` | Vergleiche |
| `and` | Logisches UND |
| `or` | Logisches ODER |
| `not` | Negation |
| `+, -, *, /` | Arithmetik |

### Expressions

| Name | Description |
|------|-------------|
| `$varName` | Variable |
| `$obj.prop` | Property-Access |
| `Component.prop` | Component-Property |
| `$event.value` | Event-Wert |

## Iterators & Data

Schleifen und Data Binding

### Each Loop

```
each $item in $collection
  Component $item.prop
```

**Example:**
```
each $task in $tasks
  Card
    Text $task.title
    Icon if $task.done then "check" else "circle"
```

### Data Binding

Mit optionalem Filter.

```
Component data Collection
Component data Collection where field == value
```

**Example:**
```
TaskList data Tasks where done == false
```

### Master-Detail Pattern

Für Klick-auf-Liste-zeigt-Details Pattern.

```
$selected: null

Master data Collection
  - Item onclick assign $selected to $item
    Text $item.title

Detail if $selected
  Text $selected.title
```

**Example:**
```
onclick assign $selected to $item
$selected.field (access stored record fields)
```

## Animations

Show/Hide und kontinuierliche Animationen

### Show/Hide Animations

```
show fade slide-up 300
hide fade 150
```

| Name | Description |
|------|-------------|
| `slide-up` | Von unten einblenden |
| `slide-down` | Von oben einblenden |
| `slide-left` | Von rechts einblenden |
| `slide-right` | Von links einblenden |
| `fade` | Ein-/Ausblenden (opacity) |
| `scale` | Skalieren |
| `none` | Keine Animation |

### Kontinuierliche Animationen

```
animate spin 1000
animate pulse 800
```

| Name | Description |
|------|-------------|
| `spin` | Rotation (kontinuierlich) |
| `pulse` | Pulsieren |
| `bounce` | Hüpfen |

### Overlay Positions

Für open-Action.

| Name | Description |
|------|-------------|
| `below` | Unterhalb des Elements |
| `above` | Oberhalb des Elements |
| `left` | Links vom Element |
| `right` | Rechts vom Element |
| `center` | Zentriert im Viewport |

## Doc Mode

Dokumentation mit formatiertem Text

### Komponenten

| Name | Description |
|------|-------------|
| `text` | Formatierte Text-Blöcke |
| `playground` | Live Code-Beispiele |
| `doc` | Container für Dokumentation |

### Block-Level Syntax

| Name | Description |
|------|-------------|
| `# / ## / ### / ####` | Headings 1-4 |
| `$p` | Paragraph |
| `$lead` | Lead Paragraph |
| `$label` | Label (uppercase) |
| `$li` | List Item |

### Inline Formatting

| Name | Description |
|------|-------------|
| `**text**` | Bold |
| `_text_` | Italic |
| ``code`` | Inline Code |
| `[text](url)` | Hyperlink |

## Quick Reference

```
SYNTAX      Component property value
            Name: = definition | Name = instance
            Child: Parent = inheritance
            Child: Parent child1 prop; child2 prop = child overrides
            Component named Name = named instance
            Name as Type = inline define + render
            Name props = implicit Box define + render

LAYOUT      hor, ver, gap N, spread, wrap, stacked, grid N
ALIGN       left, right, hor-center, top, bottom, ver-center, cen
SIZE        size hug/full W H | width hug/full/N, height hug/full/N
SPACING     pad N | pad left/right/top/bottom N | pad top 8 bottom 24
COLOR       col (text), bg (background), boc (border-color)
BORDER      bor [dir] [width] [style] [color]
RADIUS      rad [corners] | tl tr bl br | t b l r
TYPE        font-size/fs, icon-size/is, icon-weight/iw, icon-color/ic, fill, weight, line, font, align, italic, underline, truncate
VISUAL      o (opacity), shadow, cursor, z, hidden, disabled, rot

STATES      hover, focus, active, disabled (indented block)
            state highlighted, state selected

EVENTS      onclick, onhover, onfocus, onblur, onchange, oninput
            onkeydown KEY: action, onkeyup KEY: action
            debounce N, delay N

ACTIONS     toggle, show, hide, open, close, page
            highlight, select, deselect, clear-selection
            activate, deactivate, toggle-state
            assign $var to expr, validate, reset, focus, filter
            call functionName  // JS-Funktion aufrufen

TARGETS     self, next, prev, first, last, highlighted, selected
ANIMATIONS  fade, scale, slide-up/down/left/right, spin, pulse, bounce
POSITIONS   below, above, left, right, center

CONDITION   if $cond (indented) else (indented)
            if $x then prop val else prop val
ITERATOR    each $x in $list (indented)
            data Collection where field == value
OPERATORS   == != > < >= <= | and or not | + - * /

TOKENS      $name: value (palette) | $name.property: value (semantic)
            $grey-500: #71717A | $primary.bg: $blue-500 | $sm.pad: 4
BINDING     .bg (background), .col (color), .pad (padding), .gap, .rad
            .font.size (compound) | .hover.bg (state-specific)
REFERENCE   Component.property | Button rad Card.radius
```