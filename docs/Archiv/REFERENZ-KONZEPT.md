# Konzept: Mirror DSL Referenz

## Ziel

Eine **vollständige, präzise Syntax-Referenz** – kein Tutorial, keine Erklärungen warum, nur WAS und WIE.

Format: Nachschlagewerk für Nutzer, die das Grundkonzept kennen.

---

## Struktur

```
1. Syntax-Grundlagen
2. Tokens & References
   2.1 Tokens (Design Variables)
   2.2 Component Property References
3. Properties (Hauptteil)
   3.1-3.13 (13 Kategorien)
4. Komponenten-Definition
5. Interaktivität
   5.1 States
   5.2 Events
   5.3 Actions
   5.4 Conditional Rendering
   5.5 Conditional Properties
   5.6 Iterators (each)
   5.7 Event Object Access ($event)
   5.8 Expressions
   5.9 Conditional Actions
6. Library-Komponenten (19 Komponenten)
7. Kurzreferenz (Cheatsheet)
```

---

## 1. Syntax-Grundlagen

**Inhalt:**
- Grundform einer Zeile
- Einrückung (2 Spaces = Kind)
- Kommentare (`//`)
- Strings (`"text"`)
- Zahlen (implizit px, explizit `%`)
- Farben (Hex, mit Alpha)
- Komponenten-Namen (Großbuchstabe = Komponente)

**Format:** Kurze Regeln mit je einem Beispiel

```
// Grundform
Name eigenschaft wert eigenschaft wert "text"

// Hierarchie
Parent
  Child
    Grandchild
```

---

## 2. Tokens & References

### 2.1 Tokens (Design Variables)

**Inhalt:**
- Definition (`$name: wert`)
- Verwendung (`$name`)
- Erlaubte Werte (Farben, Zahlen, Strings)

**Format:** Syntax + Beispiele

```
// Definition
$primary: #3B82F6
$spacing: 16
$font: "Inter"

// Verwendung
Button bg $primary pad $spacing
```

### 2.2 Component Property References

Reference properties from defined components:

```
// Define a component with properties
Card: rad 16 pad 20 bg #2A2A3E

// Reference its properties in another component
Button rad $Card.rad bg $Card.bg
```

**Use Case: Design System without Magic Numbers**

```
// Define design primitives as "abstract" components
Spacing: pad 16 gap 12
Radius: rad 8
Colors: bg #1E1E2E col #F8FAFC

// Use them everywhere
Card pad $Spacing.pad gap $Spacing.gap rad $Radius.rad bg $Colors.bg
Button pad $Spacing.pad rad $Radius.rad
Input pad $Spacing.pad rad $Radius.rad boc $Colors.bg
```

**Structure:**
```
$ComponentName.propertyName
```

---

## 3. Properties (Hauptteil)

**Struktur pro Kategorie:**

```
### Kategorie-Name

| Property | Syntax | Werte | Beispiel |
|----------|--------|-------|----------|
| name     | syntax | werte | beispiel |
```

**Kategorien:**

### 3.1 Layout-Richtung
- `hor`, `ver`

### 3.2 Alignment
- `hor-l`, `hor-cen`, `hor-r`, `hor-stretch`, `hor-between`
- `ver-t`, `ver-cen`, `ver-b`, `ver-stretch`, `ver-between`
- `cen` (Shorthand)

### 3.3 Spacing
- `gap`
- `pad` (alle Varianten: 1-4 Werte, Richtungen l/r/u/d, Kombinationen l-r/u-d)
- `mar` (gleiche Varianten)

### 3.4 Sizing
- `w`, `h` (px, %, auto)
- `minw`, `maxw`, `minh`, `maxh`
- `full`, `grow`, `shrink`

### 3.5 Farben
- `bg`, `col`, `boc`

### 3.6 Border
- `bor` (alle Varianten)
- `boc`
- `rad` (1 oder 4 Werte)

### 3.7 Typography
- `size`, `weight`, `line`, `font`
- `align`, `italic`, `underline`
- `uppercase`, `lowercase`, `truncate`

### 3.8 Visuals
- `opacity`
- `shadow`, `sha`
- `cursor`
- `z`

### 3.9 Overflow
- `clip`, `scroll`, `scroll-x`, `scroll-y`

### 3.10 Images
- `src`, `alt`, `fit`

### 3.11 Icons
- `icon`

### 3.12 Hover-States
- `hover-bg`, `hover-col`, `hover-boc`, `hover-bor`, `hover-rad`

### 3.13 Modifier
- `-primary`, `-secondary`, `-outlined`, `-ghost`, `-filled`
- `-disabled`, `-rounded`

---

## 4. Komponenten-Definition

**Inhalt:**
- Definition mit `:` (Template erstellen)
- Instanz ohne `:` (Template verwenden)
- Vererbung mit `from`
- Kinder-Slots (Template-Kinder vs. Instanz-Kinder)
- Inline vs. Block-Syntax

**Format:** Regeln + Beispiele

```
// Definition (erstellt Template)
Button: pad 12 bg #3B82F6 rad 8

// Instanz (verwendet Template)
Button "Text"

// Vererbung
DangerButton: from Button bg #EF4444

// Mit Kindern
Card: ver pad 16 gap 8
  Title: size 18 weight 600
  Body: size 14

// Instanz mit eigenen Kindern (ersetzt Template-Kinder)
Card
  Title "Mein Titel"
  Body "Mein Text"
```

---

## 5. States & Interaktivität

### 5.1 States

```
Toggle: w 52 h 28 rad 14
  state off
    bg #333
  state on
    bg #3B82F6
```

### 5.2 Events

| Event | Beschreibung |
|-------|--------------|
| `onclick` | Klick |
| `onhover` | Hover |
| `onfocus` | Fokus (Inputs) |
| `onblur` | Blur (Inputs) |
| `onchange` | Wertänderung |
| `onload` | Laden |

### 5.3 Actions

| Action | Syntax | Beispiel |
|--------|--------|----------|
| toggle | `toggle` | `onclick toggle` |
| open | `open Name` | `onclick open Dialog` |
| close | `close Name` | `onclick close Dialog` |
| show | `show Name` | `onclick show Tooltip` |
| hide | `hide Name` | `onclick hide Tooltip` |
| change | `change self to state` | `onclick change self to active` |
| page | `page Name` | `onclick page Dashboard` |
| assign | `assign var = expr` | `onclick assign count = count + 1` |

### 5.4 Conditional Rendering

Show/hide entire components based on conditions:

```
// Simple
if $isLoggedIn
  Avatar

// With else
if $isLoggedIn
  Avatar
else
  Button "Login"

// Nested
if $user
  if $user.isAdmin
    AdminPanel
  else
    UserPanel
```

### 5.5 Conditional Properties

Properties that change based on conditions (inline):

```
// Simple
Button if $isActive then bg #3B82F6 else bg #333

// Multiple properties
Card if $isSelected then bg #3B82F6 bor 2 else bg #1A1A1A bor 0

// With complex conditions
Button if $count > 0 and $enabled then opacity 1 else opacity 0.5
```

**Structure:**
```
Component if <condition> then <properties> [else <properties>]
```

### 5.6 Iterators (each)

Render components for each item in a collection:

```
// Basic
each $task in $tasks
  TaskCard

// With property access
each $task in $tasks
  TaskCard
    Label $task.title
    Status $task.status

// Nested
each $category in $categories
  Section
    Title $category.name
    each $item in $category.items
      Item $item.name
```

**Structure:**
```
each $item in $collection
  Component
```

### 5.7 Event Object Access

Access the event object inside event handlers:

```
// Shorthand for input values
Input onchange assign text to $event.value

// Shorthand for checkbox state
Checkbox onchange assign isActive to $event.checked

// Full path access
Input onchange assign text to $event.target.value
```

**Available shortcuts:**
- `$event.value` → `$event.target.value`
- `$event.checked` → `$event.target.checked`

**Full access:**
- `$event.target.xxx` for any target property
- `$event.xxx` for any event property

### 5.8 Expressions

Arithmetic and string expressions in actions and bindings:

```
// Increment
Button onclick assign count to $count + 1

// Decrement
Button onclick assign count to $count - 1

// Math
Label $price * $quantity

// Comparison in conditions
if $count >= 10
  "Maximum reached"
```

**Operators:**
- Arithmetic: `+`, `-`, `*`, `/`
- Comparison: `==`, `!=`, `>`, `<`, `>=`, `<=`
- Logical: `and`, `or`, `not`

### 5.9 Conditional Actions

Conditions inside event handlers:

```
// Simple
onclick if condition
  action

// With else
onclick if condition
  action1
else
  action2
```

**Operators:**
- Comparison: `==`, `!=`, `>`, `<`, `>=`, `<=`
- Logical: `and`, `or`, `not`

---

## 6. Library-Komponenten

**Pro Komponente:**
- Name
- Kategorie
- Verfügbare Slots
- Eingebaute States
- Beispiel

**Format:**

```
### Dialog

**Kategorie:** Overlays
**States:** closed, open

**Slots:**
- Trigger - Auslöser-Element
- Content - Dialog-Inhalt

**Beispiel:**
Dialog
  Trigger
    Button "Öffnen"
  Content
    "Dialog-Inhalt"
```

**Alle Komponenten:**

| Kategorie | Komponenten |
|-----------|-------------|
| Overlays | Dropdown, Dialog, Tooltip, Popover, AlertDialog, ContextMenu, HoverCard |
| Navigation | Tabs, Accordion, Collapsible |
| Form | Input, Select, Checkbox, RadioGroup, Switch, Slider |
| Feedback | Toast, Progress, Avatar |

---

## 7. Kurzreferenz (Cheatsheet)

Eine Seite mit allen Properties und Syntax in kompakter Form:

```
LAYOUT      hor ver gap
ALIGN       hor-l hor-cen hor-r ver-t ver-cen ver-b cen
SPACING     pad mar (+ l r u d l-r u-d)
SIZE        w h minw maxw minh maxh full grow shrink
COLOR       bg col boc
BORDER      bor rad
TYPE        size weight line font align
VISUAL      opacity shadow sha cursor z
OVERFLOW    clip scroll scroll-x scroll-y
IMAGE       src alt fit
ICON        icon
HOVER       hover-bg hover-col hover-boc hover-bor hover-rad
MODIFIER    -primary -secondary -outlined -ghost -disabled -rounded

TOKENS      $name: value          → $primary: #3B82F6
REFERENCE   $Component.prop       → $Card.rad
DEFINE      Name: props           → Button: pad 12 bg #3B82F6
INHERIT     Name: from Parent     → DangerBtn: from Button bg #EF4444

STATE       state name            → state active
EVENT       onclick action        → onclick toggle
ACTIONS     toggle | open X | close X | show X | hide X | page X
ASSIGN      assign var to expr    → assign count to $count + 1
$EVENT      $event.value          → shorthand for $event.target.value
            $event.checked        → shorthand for $event.target.checked

CONDITION   if $cond              → if $isLoggedIn
ELSE        else                  → else
CONDPROP    if $x then p v else   → if $active then bg #3B82F6 else bg #333
ITERATOR    each $x in $list      → each $task in $tasks

OPERATORS   == != > < >= <=       (comparison)
            and or not            (logical)
            + - * /               (arithmetic)
```

---

## Entwicklungsstufen

### Stufe 1: Kern-Syntax
- Abschnitt 1 (Syntax-Grundlagen)
- Abschnitt 2.1 (Tokens)
- Abschnitt 3.1-3.6 (Layout, Align, Spacing, Sizing, Farben, Border)

### Stufe 2: Erweiterte Properties & Komponenten
- Abschnitt 2.2 (Component Property References)
- Abschnitt 3.7-3.13 (Typography, Visuals, Overflow, Images, Icons, Hover, Modifier)
- Abschnitt 4 (Komponenten-Definition)

### Stufe 3: Interaktivität
- Abschnitt 5.1-5.3 (States, Events, Actions)
- Abschnitt 5.4 (Conditional Rendering)
- Abschnitt 5.5 (Conditional Properties)
- Abschnitt 5.6 (Iterators)
- Abschnitt 5.7 (Event Object Access - $event)
- Abschnitt 5.8 (Expressions)
- Abschnitt 5.9 (Conditional Actions)

### Stufe 4: Library & Cheatsheet
- Abschnitt 6 (alle 19 Library-Komponenten mit Styling-Beispielen)
- Abschnitt 7 (Kurzreferenz)

### Stufe 5: Validierung
- Abgleich mit Parser-Code
- Fehlende Properties ergänzen
- Beispiele testen
- Edge Cases dokumentieren

---

## Decisions

1. **Format:** Markdown ✓
2. **Language:** English ✓
3. **Library Components:** Full documentation with styling examples ✓
4. **Versioning:** TBD
