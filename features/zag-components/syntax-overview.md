# Zag Components - Syntax Overview

Konsistente Syntax für alle Zag-basierten Komponenten in Mirror.

## Design-Prinzipien

1. **Slots mit Doppelpunkt** - `Trigger:`, `Content:`, `Item:`
2. **Behavior als Keywords** - `searchable`, `multiple`, `modal`
3. **States mit Doppelpunkt** - `hover:`, `selected:`, `open:`
4. **Definition vs. Verwendung** - Komplexität in Definition, Einfachheit bei Verwendung

---

## Select

### Basis

```mirror
Select placeholder "Wähle..."
  Item "Option A"
  Item "Option B"
  Item "Option C"
```

### Mit Styling

```mirror
Select placeholder "Wähle..."

  Trigger:
    hor, spread, gap 8
    pad 12 16, bg surface, rad 8
    bor 1 border
    hover: bor 1 primary
    focus: bor 2 primary

  Icon:
    "chevron-down", size 16, col muted
    open: rotate 180

  Content:
    bg surface, rad 8, shadow lg
    pad 4, maxh 240, scroll

  Item:
    pad 10 12, rad 4, col text
    hover: bg hover
    highlighted: bg hover
    selected: bg primary, col white
    disabled: col muted, cursor not-allowed

  ItemIndicator:
    Icon "check", size 14

  Item "Option A"
  Item "Option B"
  Item "Option C"
```

### Varianten

```mirror
// Multiple
Select multiple, placeholder "Wähle mehrere..."
  Pill: pad 4 8, bg primary, rad 12
  Item "A"
  Item "B"

// Searchable
Select searchable, placeholder "Suche..."
  Input: bg transparent
  Empty: Text "Keine Ergebnisse"
  Item "A"
  Item "B"

// Gruppiert
Select placeholder "Wähle..."
  Group "Kategorie A"
    Item "Option 1"
    Item "Option 2"
  Group "Kategorie B"
    Item "Option 3"
```

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Trigger` | Button der öffnet |
| `Icon` | Chevron im Trigger |
| `Content` | Dropdown-Container |
| `Item` | Einzelne Option |
| `ItemIndicator` | Checkmark |
| `Input` | Suchfeld (searchable) |
| `Pill` | Selected Tag (multiple) |
| `PillRemove` | X in Pill |
| `Group` | Gruppen-Container |
| `GroupLabel` | Gruppen-Titel |
| `Empty` | Keine Ergebnisse |

---

## Dialog

### Basis

```mirror
Dialog
  Trigger
    Button "Open Dialog"

  Content
    Title "Bestätigung"
    Description "Möchtest du fortfahren?"

    Actions
      Button "Abbrechen" onclick close
      Button "OK" onclick confirm, close
```

### Mit Styling

```mirror
Dialog modal, closeOnEscape, closeOnOutsideClick

  Trigger:
    // Beliebiges Element

  Backdrop:
    bg #00000080
    backdrop-blur 4

  Content:
    w 400, maxw 90vw
    bg surface, rad 12, shadow xl
    pad 24

  Title:
    fs 18, weight semibold, col text
    margin 0 0 8 0

  Description:
    fs 14, col muted
    margin 0 0 24 0

  Close:
    absolute, top 16, right 16
    size 32, rad full
    hover: bg hover
    Icon "x", size 16

  Trigger
    Button "Einstellungen öffnen"

  Content
    Title "Einstellungen"
    Description "Passe deine Präferenzen an."

    // Beliebiger Content
    Form
      Input label "Name"
      Input label "Email"

    Actions hor, gap 8, justify end
      Button "Abbrechen" onclick close
      Button "Speichern" onclick save, close
```

### Varianten

```mirror
// Alert Dialog (nicht schließbar ohne Aktion)
Dialog modal, role "alertdialog"
  Content
    Title "Löschen bestätigen"
    Description "Diese Aktion kann nicht rückgängig gemacht werden."
    Actions
      Button "Abbrechen" onclick close
      Button "Löschen" onclick delete, close; bg danger

// Drawer (von der Seite)
Dialog position "right"
  Content: w 320, h full, rad 0
  // ...
```

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Trigger` | Element das öffnet |
| `Backdrop` | Hintergrund-Overlay |
| `Content` | Dialog-Box |
| `Title` | Überschrift |
| `Description` | Beschreibungstext |
| `Close` | Schließen-Button |

---

## Menu

### Basis

```mirror
Menu
  Trigger
    Button "Optionen"

  Content
    Item "Bearbeiten"
    Item "Duplizieren"
    Separator
    Item "Löschen" col danger
```

### Mit Styling

```mirror
Menu

  Trigger:
    // Beliebiges Element

  Content:
    w 200, bg surface, rad 8, shadow lg
    pad 4

  Item:
    hor, gap 8
    pad 8 12, rad 4
    hover: bg hover
    highlighted: bg hover
    disabled: col muted

  ItemIcon:
    size 16, col muted

  Separator:
    h 1, bg border, margin 4 0

  Label:
    pad 8 12, fs 11, col muted
    uppercase, weight semibold

  Trigger
    Button "Aktionen" Icon "more-horizontal"

  Content
    Label "Bearbeiten"
    Item icon "edit", "Umbenennen"
    Item icon "copy", "Duplizieren"
    Item icon "move", "Verschieben"

    Separator

    Label "Gefährlich"
    Item icon "trash", "Löschen", col danger
```

### Varianten

```mirror
// Context Menu (Rechtsklick)
Menu trigger "contextmenu"
  Content
    Item "Ausschneiden"
    Item "Kopieren"
    Item "Einfügen"

// Mit Submenus
Menu
  Content
    Item "Bearbeiten"
    SubMenu
      SubTrigger "Exportieren als..."
      SubContent
        Item "PNG"
        Item "JPG"
        Item "SVG"
    Separator
    Item "Löschen"

// Mit Checkboxes
Menu
  Content
    CheckboxItem checked "Rechtschreibprüfung"
    CheckboxItem "Grammatikprüfung"
    Separator
    RadioGroup value "zoom"
      RadioItem value "50", "50%"
      RadioItem value "100", "100%"
      RadioItem value "200", "200%"
```

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Trigger` | Element das öffnet |
| `Content` | Menu-Container |
| `Item` | Menu-Eintrag |
| `ItemIcon` | Icon im Item |
| `Label` | Gruppen-Label |
| `Separator` | Trennlinie |
| `SubMenu` | Submenu-Container |
| `SubTrigger` | Submenu-Trigger |
| `SubContent` | Submenu-Content |
| `CheckboxItem` | Toggle-Item |
| `RadioGroup` | Radio-Gruppe |
| `RadioItem` | Radio-Option |

---

## Tabs

### Basis

```mirror
Tabs defaultValue "tab1"
  TabList
    Tab value "tab1", "Übersicht"
    Tab value "tab2", "Details"
    Tab value "tab3", "Einstellungen"

  TabPanel value "tab1"
    Text "Übersicht Content"

  TabPanel value "tab2"
    Text "Details Content"

  TabPanel value "tab3"
    Text "Einstellungen Content"
```

### Mit Styling

```mirror
Tabs defaultValue "overview"

  TabList:
    hor, gap 0
    bg surface, rad 8, pad 4
    bor 1 border

  Tab:
    pad 8 16, rad 6
    col muted, cursor pointer
    hover: col text
    selected: bg primary, col white

  TabPanel:
    pad 16

  TabIndicator:              // Animierter Indikator
    h 2, bg primary, rad 1

  TabList
    Tab value "overview", Icon "home"; "Übersicht"
    Tab value "analytics", Icon "chart"; "Analytics"
    Tab value "settings", Icon "settings"; "Einstellungen"

  TabPanel value "overview"
    // Content

  TabPanel value "analytics"
    // Content

  TabPanel value "settings"
    // Content
```

### Varianten

```mirror
// Vertikal
Tabs orientation "vertical"
  TabList: ver, w 200
  Tab: text-align left
  // ...

// Mit Badges
Tabs
  TabList
    Tab value "inbox"
      "Inbox"
      Badge "12"
    Tab value "sent", "Gesendet"
```

### Slots

| Slot | Beschreibung |
|------|--------------|
| `TabList` | Container für Tabs |
| `Tab` | Einzelner Tab |
| `TabPanel` | Content-Panel |
| `TabIndicator` | Animierter Indikator |

---

## Accordion

### Basis

```mirror
Accordion
  AccordionItem value "item1"
    Trigger "Frage 1"
    Content "Antwort 1"

  AccordionItem value "item2"
    Trigger "Frage 2"
    Content "Antwort 2"
```

### Mit Styling

```mirror
Accordion collapsible, defaultValue "item1"

  AccordionItem:
    bor-bottom 1 border

  Trigger:
    hor, spread
    pad 16, w full
    cursor pointer
    hover: bg hover

  TriggerIcon:
    "chevron-down", size 16
    transition rotate 200ms
    expanded: rotate 180

  Content:
    pad 0 16 16 16

  AccordionItem value "faq1"
    Trigger
      Text "Was ist Mirror?"
      TriggerIcon
    Content
      Text "Mirror ist eine DSL für Rapid UI Prototyping."

  AccordionItem value "faq2"
    Trigger
      Text "Wie funktioniert es?"
      TriggerIcon
    Content
      Text "Du schreibst deklarativen Code und siehst sofort das Ergebnis."
```

### Varianten

```mirror
// Multiple offen
Accordion multiple
  // ...

// Alle schließbar
Accordion collapsible
  // ...

// Mit Icons
Accordion
  AccordionItem value "settings"
    Trigger
      Icon "settings"
      Text "Einstellungen"
```

### Slots

| Slot | Beschreibung |
|------|--------------|
| `AccordionItem` | Einzelnes Item |
| `Trigger` | Klickbarer Header |
| `TriggerIcon` | Chevron-Icon |
| `Content` | Expandierbarer Content |

---

## Tooltip

### Basis

```mirror
Tooltip content "Hilfreicher Hinweis"
  Button "Hover me"
```

### Mit Styling

```mirror
Tooltip
  content "Dies ist ein Tooltip mit mehr Text."
  position "top"
  delay 200

  Content:
    bg #1a1a23
    col white
    pad 8 12, rad 6
    fs 13
    maxw 200

  Arrow:
    fill #1a1a23

  // Trigger Element
  Icon "info", size 16, col muted
```

### Varianten

```mirror
// Verschiedene Positionen
Tooltip position "top", content "Oben"
Tooltip position "bottom", content "Unten"
Tooltip position "left", content "Links"
Tooltip position "right", content "Rechts"

// Mit Rich Content
Tooltip
  Content
    Text weight semibold, "Tastenkürzel"
    Text col muted, "Cmd + K"
  Button "Suche"
```

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Content` | Tooltip-Inhalt |
| `Arrow` | Pfeil-Element |

---

## Slider

### Basis

```mirror
Slider min 0, max 100, defaultValue 50
```

### Mit Styling

```mirror
Slider
  min 0, max 100, step 1
  defaultValue 50

  Track:
    h 4, bg #333, rad 2

  Range:
    bg primary

  Thumb:
    size 20, rad full
    bg white, shadow md
    bor 2 primary
    focus: bor 2 primary, shadow lg

  Label:
    fs 14, col text
```

### Varianten

```mirror
// Range Slider
Slider range, min 0, max 1000
  defaultValue [200, 800]

// Vertikal
Slider orientation "vertical", h 200

// Mit Marks
Slider min 0, max 100, step 25
  marks
    Mark value 0, "0%"
    Mark value 25, "25%"
    Mark value 50, "50%"
    Mark value 75, "75%"
    Mark value 100, "100%"
```

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Track` | Hintergrund-Track |
| `Range` | Gefüllter Bereich |
| `Thumb` | Draggable Handle |
| `Mark` | Markierung |
| `Label` | Wert-Label |

---

## Checkbox

### Basis

```mirror
Checkbox label "Ich akzeptiere die AGB"
```

### Mit Styling

```mirror
Checkbox label "Newsletter abonnieren"

  Control:
    size 20, rad 4
    bor 2 #555
    transition all 150ms
    checked: bg primary, bor 0
    focus: bor 2 primary

  Indicator:
    Icon "check", size 14, col white
    opacity 0
    checked: opacity 1

  Label:
    fs 14, col text
    margin-left 8
```

### Varianten

```mirror
// Indeterminate
Checkbox indeterminate, label "Alle auswählen"

// Disabled
Checkbox disabled, label "Nicht verfügbar"

// Mit Description
Checkbox
  label "Marketing Emails"
  description "Erhalte Updates zu neuen Features."
```

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Control` | Checkbox-Box |
| `Indicator` | Checkmark |
| `Label` | Label-Text |
| `Description` | Zusätzlicher Text |

---

## RadioGroup

### Basis

```mirror
RadioGroup name "plan"
  Radio value "free", label "Free"
  Radio value "pro", label "Pro"
  Radio value "enterprise", label "Enterprise"
```

### Mit Styling

```mirror
RadioGroup name "size", defaultValue "m"

  Radio:
    hor, gap 8, pad 12
    cursor pointer

  Control:
    size 20, rad full
    bor 2 #555
    checked: bor 2 primary

  Indicator:
    size 10, rad full
    bg primary
    scale 0
    checked: scale 1

  Label:
    fs 14, col text

  Radio value "s", label "Small"
  Radio value "m", label "Medium"
  Radio value "l", label "Large"
```

### Varianten

```mirror
// Cards Style
RadioGroup name "plan"
  Radio:
    pad 16, rad 8, bor 1 border
    checked: bor 2 primary, bg primary-light

  Radio value "free"
    Title "Free"
    Price "$0/mo"
    Description "Für Einzelpersonen"

  Radio value "pro"
    Title "Pro"
    Price "$20/mo"
    Description "Für Teams"
```

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Radio` | Einzelne Option |
| `Control` | Radio-Circle |
| `Indicator` | Innerer Punkt |
| `Label` | Label-Text |

---

## Switch

### Basis

```mirror
Switch label "Benachrichtigungen"
```

### Mit Styling

```mirror
Switch label "Dark Mode"

  Track:
    w 44, h 24, rad 12
    bg #555
    checked: bg primary
    transition bg 200ms

  Thumb:
    size 20, rad full
    bg white, shadow sm
    margin 2
    checked: translate-x 20
    transition transform 200ms

  Label:
    fs 14, col text
    margin-left 12
```

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Track` | Hintergrund |
| `Thumb` | Beweglicher Knopf |
| `Label` | Label-Text |

---

## DatePicker

### Basis

```mirror
DatePicker placeholder "Datum wählen..."
```

### Mit Styling

```mirror
DatePicker
  mode "single"              // single | multiple | range
  locale "de-DE"
  min 2024-01-01
  max 2025-12-31

  Trigger:
    hor, gap 8
    pad 12, bg surface, rad 8
    bor 1 border

  TriggerIcon:
    "calendar", size 16, col muted

  Content:
    bg surface, rad 12, shadow xl
    pad 16

  Header:
    hor, spread, margin-bottom 16

  NavButton:
    size 32, rad full
    hover: bg hover

  MonthLabel:
    weight semibold

  Weekday:
    size 36, center
    fs 12, col muted

  Day:
    size 36, rad full, center
    hover: bg hover
    selected: bg primary, col white
    today: bor 2 primary
    outside: opacity 0.3
    disabled: opacity 0.3, cursor not-allowed
    inRange: bg primary-light
```

### Varianten

```mirror
// Range Picker
DatePicker mode "range"
  Preset label "Letzte 7 Tage", value "last7days"
  Preset label "Letzte 30 Tage", value "last30days"
  Preset label "Diesen Monat", value "thisMonth"

// Mit Zeit
DatePicker mode "single", includeTime
  TimeInput: pad 8, bg surface

// Multiple Dates
DatePicker mode "multiple", max 5
```

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Trigger` | Input/Button |
| `TriggerIcon` | Kalender-Icon |
| `Content` | Kalender-Popup |
| `Header` | Monat/Jahr Navigation |
| `NavButton` | Prev/Next Buttons |
| `MonthLabel` | Aktueller Monat |
| `Weekday` | Wochentag-Header |
| `Day` | Einzelner Tag |
| `Preset` | Schnellauswahl |
| `TimeInput` | Zeit-Eingabe |

---

## NumberInput

### Basis

```mirror
NumberInput min 0, max 100, defaultValue 0
```

### Mit Styling

```mirror
NumberInput
  min 0, max 100, step 1
  placeholder "0"

  Root:
    hor
    bor 1 border, rad 8
    focus-within: bor 1 primary

  Input:
    pad 12, bg transparent
    text-align center
    w 80

  DecrementButton:
    pad 12
    bor-right 1 border
    hover: bg hover
    disabled: opacity 0.3
    Icon "minus", size 16

  IncrementButton:
    pad 12
    bor-left 1 border
    hover: bg hover
    disabled: opacity 0.3
    Icon "plus", size 16
```

### Varianten

```mirror
// Currency
NumberInput
  formatOptions
    style "currency"
    currency "EUR"
  min 0
  step 0.01

// Mit Scrubbing
NumberInput allowMouseWheel, allowScrub

// Ohne Buttons
NumberInput
  DecrementButton: hidden
  IncrementButton: hidden
```

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root` | Container |
| `Input` | Eingabefeld |
| `DecrementButton` | Minus-Button |
| `IncrementButton` | Plus-Button |
| `Label` | Label-Text |

---

## Popover

### Basis

```mirror
Popover
  Trigger
    Button "Info"
  Content
    Text "Zusätzliche Informationen hier."
```

### Mit Styling

```mirror
Popover position "bottom", offset 8

  Trigger:
    // Beliebiges Element

  Content:
    w 280
    bg surface, rad 8, shadow lg
    pad 16

  Arrow:
    fill surface

  Close:
    absolute, top 8, right 8
    size 24, rad full
    hover: bg hover

  Trigger
    Button "Mehr erfahren"

  Content
    Close Icon "x", size 14

    Title fs 16, weight semibold, margin-bottom 8
      "Über diese Funktion"

    Text fs 14, col muted
      "Diese Funktion ermöglicht dir..."

    Link margin-top 12
      "Dokumentation lesen →"
```

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Trigger` | Element das öffnet |
| `Content` | Popover-Inhalt |
| `Arrow` | Pfeil-Element |
| `Close` | Schließen-Button |

---

## Zusammenfassung

### Gemeinsame Patterns

1. **Trigger + Content** - Dialog, Menu, Popover, Tooltip, Select
2. **List + Item** - Select, Menu, Tabs, Accordion, RadioGroup
3. **Control + Indicator** - Checkbox, Radio, Switch
4. **Track + Thumb** - Slider, Switch

### Konsistente States

| State | Verwendung |
|-------|------------|
| `hover:` | Mouse over |
| `focus:` | Keyboard focus |
| `selected:` | Ausgewählt |
| `checked:` | Checkbox/Radio/Switch an |
| `highlighted:` | Keyboard navigation |
| `expanded:` | Accordion/Disclosure offen |
| `open:` | Dropdown/Dialog offen |
| `disabled:` | Deaktiviert |

### Konsistente Props

| Prop | Komponenten |
|------|-------------|
| `placeholder` | Select, DatePicker, Input |
| `disabled` | Alle |
| `defaultValue` | Select, Tabs, Slider, etc. |
| `value` | Controlled mode |
| `position` | Tooltip, Popover, Menu |
| `modal` | Dialog |
| `multiple` | Select, Accordion |
