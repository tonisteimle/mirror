# Zag Components - Vollständige Syntax-Referenz

Konsistente Syntax für alle 51 Zag-Komponenten in Mirror.

---

## Konsistenz-Regeln

### Slot-Naming

| Slot | Bedeutung | Verwendet in |
|------|-----------|--------------|
| `Trigger` | Element das öffnet/aktiviert | Select, Dialog, Menu, Popover, Tooltip, Accordion |
| `Content` | Hauptinhalt (Popup, Panel) | Select, Dialog, Menu, Popover, Tabs, Accordion |
| `Item` | Einzelnes Element in Liste | Select, Menu, Tabs, Accordion, RadioGroup, TagsInput |
| `Control` | Interaktives Element | Checkbox, Radio, Switch |
| `Indicator` | Visueller Status | Checkbox, Radio, Progress, Tabs |
| `Track` | Hintergrund-Linie | Slider, Switch, Progress |
| `Thumb` | Bewegliches Element | Slider, Switch |
| `Label` | Beschriftung | Alle Form-Elemente |
| `Input` | Eingabefeld | Combobox, TagsInput, PinInput, NumberInput |

### Keywords

| Keyword | Bedeutung | Verwendet in |
|---------|-----------|--------------|
| `multiple` | Mehrfachauswahl | Select, Accordion, FileUpload |
| `searchable` | Mit Suchfeld | Select (→ Combobox) |
| `clearable` | Mit Clear-Button | Select, TagsInput, DatePicker |
| `disabled` | Deaktiviert | Alle |
| `required` | Pflichtfeld | Alle Form-Elemente |
| `modal` | Blockiert Hintergrund | Dialog |
| `collapsible` | Kann geschlossen werden | Accordion |
| `range` | Bereichsauswahl | Slider, DatePicker |
| `readonly` | Nur lesbar | Input-Elemente |

### States

| State | Bedeutung | Data Attribute |
|-------|-----------|----------------|
| `hover:` | Mouse over | `[data-highlighted]` |
| `focus:` | Keyboard focus | `[data-focus]` |
| `selected:` | Ausgewählt | `[data-state="checked"]` |
| `checked:` | An (Toggle) | `[data-state="checked"]` |
| `open:` | Geöffnet | `[data-state="open"]` |
| `expanded:` | Ausgeklappt | `[data-state="open"]` |
| `highlighted:` | Keyboard-Nav | `[data-highlighted]` |
| `disabled:` | Deaktiviert | `[data-disabled]` |
| `dragging:` | Wird gezogen | `[data-dragging]` |
| `loading:` | Lädt | `[data-loading]` |
| `invalid:` | Ungültig | `[data-invalid]` |
| `today:` | Heutiges Datum | `[data-today]` |
| `inRange:` | Im Bereich | `[data-in-range]` |

---

## Kategorie 1: Selection

### Select

Dropdown-Auswahl mit einer oder mehreren Optionen.

```mirror
Select placeholder "Wähle..."
  Trigger: pad 12, bg surface, rad 8
  Content: bg surface, shadow lg, rad 8
  Item: pad 8 12, hover: bg hover, selected: bg primary

  Item "Option A"
  Item "Option B"
  Item "Option C"
```

**Varianten:**
```mirror
Select multiple, placeholder "Mehrere wählen..."
Select searchable, placeholder "Suchen..."
Select clearable, placeholder "Auswahl..."
```

**Slots:** Trigger, Icon, Content, Item, ItemIndicator, Group, GroupLabel, Pill, PillRemove, Input, Empty

---

### Combobox

Select mit Texteingabe und Autocomplete.

```mirror
Combobox placeholder "Suchen..."
  Input: pad 12, bg surface
  Content: bg surface, shadow lg
  Item: pad 8 12, hover: bg hover

  Item "Apple"
  Item "Banana"
  Item "Cherry"
```

**Varianten:**
```mirror
Combobox multiple, placeholder "Tags hinzufügen..."
Combobox allowCustomValue, placeholder "Oder eigener Wert..."
```

**Slots:** Input, Trigger, ClearButton, Content, Item, ItemIndicator, Empty

---

### Menu

Kontextmenü oder Dropdown-Menü.

```mirror
Menu
  Trigger: Button "Aktionen"
  Content: w 200, bg surface, shadow lg
  Item: pad 8 12, hover: bg hover

  Item "Bearbeiten"
  Item "Duplizieren"
  Separator
  Item "Löschen", col danger
```

**Varianten:**
```mirror
Menu contextMenu                    // Rechtsklick
Menu positioning { placement: "bottom-start" }
```

**Slots:** Trigger, Content, Item, ItemIcon, ItemText, Separator, Group, GroupLabel, Arrow

**Submenus:**
```mirror
Menu
  Content
    Item "Bearbeiten"
    Submenu
      Trigger: Item "Exportieren als..."
      Content
        Item "PNG"
        Item "JPG"
```

---

### Listbox

Auswahlliste ohne Dropdown (inline).

```mirror
Listbox
  Root: w 200, bg surface, rad 8, bor 1 border
  Item: pad 8 12, hover: bg hover, selected: bg primary

  Item "Option A"
  Item "Option B"
  Item "Option C"
```

**Varianten:**
```mirror
Listbox multiple
Listbox orientation "horizontal"
```

**Slots:** Root, Item, ItemIndicator, Group, GroupLabel

---

## Kategorie 2: Form Controls

### Checkbox

Einzelne An/Aus-Auswahl.

```mirror
Checkbox label "Ich akzeptiere die AGB"
  Control: size 20, rad 4, bor 2 border, checked: bg primary
  Indicator: Icon "check", col white
```

**Varianten:**
```mirror
Checkbox checked                    // Initial an
Checkbox indeterminate              // Teilweise
Checkbox disabled                   // Deaktiviert
```

**Slots:** Root, Control, Indicator, Label, Description

---

### RadioGroup

Einzelauswahl aus mehreren Optionen.

```mirror
RadioGroup name "size", defaultValue "m"
  Radio: hor, gap 8, pad 8
  Control: size 20, rad full, bor 2 border, checked: bor 2 primary
  Indicator: size 10, rad full, bg primary

  Radio value "s", label "Small"
  Radio value "m", label "Medium"
  Radio value "l", label "Large"
```

**Slots:** Root, Radio, Control, Indicator, Label

---

### Switch

Toggle zwischen zwei Zuständen.

```mirror
Switch label "Benachrichtigungen"
  Track: w 44, h 24, rad 12, bg muted, checked: bg primary
  Thumb: size 20, rad full, bg white, checked: translate-x 20
```

**Slots:** Root, Track, Thumb, Label

---

### Slider

Werteauswahl über Schieberegler.

```mirror
Slider min 0, max 100, defaultValue 50
  Track: h 4, bg muted, rad 2
  Range: bg primary
  Thumb: size 20, rad full, bg white, shadow md
```

**Varianten:**
```mirror
Slider range, defaultValue [20, 80]     // Bereichsauswahl
Slider step 10                           // Schrittweite
Slider orientation "vertical"            // Vertikal
```

**Slots:** Root, Track, Range, Thumb, Label, ValueText, Marker, MarkerGroup

---

### NumberInput

Numerische Eingabe mit Buttons.

```mirror
NumberInput min 0, max 100, step 1
  Root: hor, bor 1 border, rad 8
  Input: pad 12, text-align center, w 80
  DecrementButton: pad 12, hover: bg hover, Icon "minus"
  IncrementButton: pad 12, hover: bg hover, Icon "plus"
```

**Varianten:**
```mirror
NumberInput formatOptions { style: "currency", currency: "EUR" }
NumberInput allowMouseWheel
```

**Slots:** Root, Input, DecrementButton, IncrementButton, Label

---

### PinInput

Code-Eingabe (OTP, PIN).

```mirror
PinInput length 6, placeholder "○"
  Input: size 48, rad 8, bor 1 border, text-align center, fs 20
  Input: focus: bor 2 primary
```

**Varianten:**
```mirror
PinInput mask                           // Versteckt (wie Passwort)
PinInput otp                            // Auto-Submit bei Vollständigkeit
PinInput type "alphanumeric"            // Buchstaben + Zahlen
```

**Slots:** Root, Input, Label

---

### PasswordInput

Passwort-Eingabe mit Sichtbarkeits-Toggle.

```mirror
PasswordInput placeholder "Passwort..."
  Root: hor, bor 1 border, rad 8
  Input: pad 12, grow
  VisibilityTrigger: pad 12, Icon "eye"
```

**Slots:** Root, Input, VisibilityTrigger, Label

---

### TagsInput

Mehrere Tags/Chips eingeben.

```mirror
TagsInput placeholder "Tag hinzufügen..."
  Root: hor, wrap, gap 4, pad 8, bor 1 border, rad 8
  Tag: hor, gap 4, pad 4 8, bg primary, rad 12, col white
  TagDeleteButton: Icon "x", size 14
  Input: grow, bg transparent
```

**Varianten:**
```mirror
TagsInput max 5                         // Maximum Tags
TagsInput allowDuplicates false         // Keine Duplikate
TagsInput editable                      // Tags editierbar
```

**Slots:** Root, Tag, TagText, TagDeleteButton, Input, ClearButton, Label

---

### Rating

Sterne-Bewertung.

```mirror
Rating max 5, defaultValue 3
  Item: size 24, col muted, checked: col warning
  Item: Icon "star"
```

**Varianten:**
```mirror
Rating allowHalf                        // Halbe Sterne
Rating readonly                         // Nur Anzeige
```

**Slots:** Root, Item, Label

---

## Kategorie 3: Overlays

### Dialog

Modales Fenster.

```mirror
Dialog modal
  Trigger: Button "Öffnen"
  Backdrop: bg #00000080, backdrop-blur 4
  Content: w 400, bg surface, rad 12, pad 24
  Title: fs 18, weight semibold
  Description: col muted, fs 14
  Close: absolute, top 16, right 16, Icon "x"

  Content
    Title "Bestätigung"
    Description "Möchtest du fortfahren?"
    Footer hor, gap 8, justify end
      Button "Abbrechen", onclick close
      Button "OK", onclick confirm
```

**Varianten:**
```mirror
Dialog role "alertdialog"               // Nicht schließbar ohne Aktion
Dialog closeOnEscape false              // Escape deaktiviert
Dialog closeOnOutsideClick false        // Außenklick deaktiviert
```

**Slots:** Trigger, Backdrop, Positioner, Content, Title, Description, Close

---

### Drawer

Seitliches Panel.

```mirror
Drawer placement "right"
  Trigger: Button "Menü"
  Backdrop: bg #00000080
  Content: w 320, h full, bg surface, pad 24

  Content
    Title "Navigation"
    Nav
      Item "Home"
      Item "Produkte"
      Item "Kontakt"
```

**Varianten:**
```mirror
Drawer placement "left"
Drawer placement "top"
Drawer placement "bottom"
```

**Slots:** Trigger, Backdrop, Positioner, Content, Title, Description, Close

---

### Popover

Kleines Info-Popup.

```mirror
Popover
  Trigger: Button "Info"
  Content: w 280, bg surface, rad 8, shadow lg, pad 16
  Arrow: fill surface
  Close: absolute, top 8, right 8

  Content
    Title "Hilfe"
    Text "Hier findest du weitere Informationen."
```

**Varianten:**
```mirror
Popover positioning { placement: "top" }
Popover autoFocus false
```

**Slots:** Trigger, Positioner, Content, Arrow, Title, Description, Close

---

### Tooltip

Hover-Hinweis.

```mirror
Tooltip content "Hilfreicher Hinweis"
  Content: bg #1a1a23, col white, pad 8 12, rad 6, fs 13
  Arrow: fill #1a1a23

  Icon "info"
```

**Varianten:**
```mirror
Tooltip positioning { placement: "top" }
Tooltip openDelay 200
Tooltip closeDelay 0
```

**Slots:** Trigger, Positioner, Content, Arrow

---

### HoverCard

Erweiterter Tooltip mit reichem Inhalt.

```mirror
HoverCard
  Trigger: Link "Benutzerprofil"
  Content: w 300, bg surface, rad 8, shadow lg, pad 16

  Content
    Avatar src "user.jpg", size 48
    Title "Max Mustermann"
    Text "@maxmustermann"
    Stats hor, gap 16
      Stat "123 Follower"
      Stat "45 Following"
```

**Slots:** Trigger, Positioner, Content, Arrow

---

### Toast

Benachrichtigungen.

```mirror
Toast type "success"
  Root: hor, gap 12, pad 16, bg surface, rad 8, shadow lg
  Icon: size 20
  Title: weight semibold
  Description: col muted, fs 14
  Close: Icon "x"

  // Programmatisch:
  // toast.create({ title: "Gespeichert", type: "success" })
```

**Varianten:**
```mirror
Toast type "error"
Toast type "warning"
Toast type "info"
Toast type "loading"
```

**Slots:** Root, Icon, Title, Description, Close, ActionButton

---

## Kategorie 4: Navigation

### Tabs

Tab-Navigation.

```mirror
Tabs defaultValue "tab1"
  TabList: hor, gap 0, bg surface, pad 4, rad 8
  Tab: pad 8 16, rad 6, selected: bg primary, col white
  TabPanel: pad 16

  TabList
    Tab value "tab1", "Übersicht"
    Tab value "tab2", "Details"
    Tab value "tab3", "Einstellungen"

  TabPanel value "tab1"
    // Content
  TabPanel value "tab2"
    // Content
```

**Varianten:**
```mirror
Tabs orientation "vertical"
Tabs activationMode "manual"            // Nur mit Enter aktivieren
Tabs loop                               // Am Ende zum Anfang springen
```

**Slots:** Root, TabList, Tab, TabIndicator, TabPanel

---

### Accordion

Aufklappbare Sektionen.

```mirror
Accordion collapsible, defaultValue "item1"
  Item: bor-bottom 1 border
  Trigger: hor, spread, pad 16, w full, hover: bg hover
  TriggerIcon: Icon "chevron-down", expanded: rotate 180
  Content: pad 16

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
      Text "Du schreibst Code und siehst sofort das Ergebnis."
```

**Varianten:**
```mirror
Accordion multiple                      // Mehrere gleichzeitig offen
Accordion collapsible                   // Alle schließbar
```

**Slots:** Root, Item, Trigger, TriggerIcon, Content

---

### Steps

Schritt-für-Schritt Navigation.

```mirror
Steps defaultValue 1
  StepList: hor, gap 0
  Step: hor, gap 8, pad 16
  StepIndicator: size 32, rad full, bor 2 border, center
  StepIndicator: completed: bg primary, bor 0
  StepSeparator: h 2, bg border, grow, completed: bg primary

  Step value 1
    StepIndicator "1"
    StepTitle "Persönlich"
  Step value 2
    StepIndicator "2"
    StepTitle "Adresse"
  Step value 3
    StepIndicator "3"
    StepTitle "Bestätigung"

  StepContent value 1
    // Form Schritt 1
  StepContent value 2
    // Form Schritt 2
```

**Slots:** Root, StepList, Step, StepIndicator, StepTitle, StepDescription, StepSeparator, StepContent

---

### Pagination

Seiten-Navigation.

```mirror
Pagination count 100, pageSize 10, defaultPage 1
  Root: hor, gap 4
  PrevButton: pad 8, rad 4, hover: bg hover, Icon "chevron-left"
  NextButton: pad 8, rad 4, hover: bg hover, Icon "chevron-right"
  Page: size 32, rad 4, center, hover: bg hover, selected: bg primary
  Ellipsis: Text "..."
```

**Slots:** Root, PrevButton, NextButton, Page, Ellipsis

---

### NavigationMenu

Komplexe Hauptnavigation.

```mirror
NavigationMenu
  Root: hor, gap 4
  Item: pad 8 16, rad 4, hover: bg hover
  Content: bg surface, shadow lg, rad 8, pad 16

  NavigationItem
    Trigger "Produkte"
    Content
      Link "Feature A"
      Link "Feature B"

  NavigationItem
    Link "Preise"

  NavigationItem
    Link "Über uns"
```

**Slots:** Root, Item, Trigger, Content, Link, Indicator, Viewport

---

### TreeView

Hierarchische Baumansicht.

```mirror
TreeView
  Root: w 250
  Branch: // Ordner
  BranchControl: hor, gap 8, pad 8, hover: bg hover
  BranchIcon: Icon "folder", expanded: Icon "folder-open"
  BranchText:
  BranchContent: pad-left 16
  Leaf: hor, gap 8, pad 8, hover: bg hover, selected: bg primary
  LeafIcon: Icon "file"
  LeafText:

  Branch value "documents"
    BranchControl
      BranchIcon
      BranchText "Dokumente"
    BranchContent
      Leaf value "doc1"
        LeafIcon
        LeafText "Bericht.pdf"
      Leaf value "doc2"
        LeafIcon
        LeafText "Präsentation.pptx"
```

**Slots:** Root, Branch, BranchControl, BranchIcon, BranchText, BranchContent, BranchIndicator, Leaf, LeafIcon, LeafText

---

## Kategorie 5: Date & Time

### DatePicker

Datumsauswahl.

```mirror
DatePicker placeholder "Datum wählen..."
  Trigger: hor, gap 8, pad 12, bg surface, rad 8, bor 1 border
  TriggerIcon: Icon "calendar", col muted
  Content: bg surface, rad 12, shadow xl, pad 16

  Header: hor, spread, margin-bottom 16
  NavButton: size 32, rad full, hover: bg hover
  ViewButton: weight semibold

  Weekday: size 36, center, fs 12, col muted
  Day: size 36, rad full, center
  Day: hover: bg hover
  Day: selected: bg primary, col white
  Day: today: bor 2 primary
  Day: outside: opacity 0.3
  Day: disabled: opacity 0.3, cursor not-allowed
```

**Varianten:**
```mirror
DatePicker mode "range"                 // Zeitraum
DatePicker mode "multiple"              // Mehrere Daten
DatePicker locale "de-DE"
DatePicker min 2024-01-01, max 2025-12-31
```

**Slots:** Trigger, TriggerIcon, Positioner, Content, Header, NavButton, ViewButton, Table, Weekday, Day, MonthSelect, YearSelect

---

### DateInput

Datumseingabe per Text.

```mirror
DateInput placeholder "TT.MM.JJJJ"
  Root: hor, bor 1 border, rad 8
  Segment: pad 4
  Separator: col muted
```

**Slots:** Root, Segment, Separator, Label

---

### Timer

Countdown/Stoppuhr.

```mirror
Timer defaultValue 60000               // 60 Sekunden in ms
  Root: hor, gap 4, fs 48, font mono
  Segment: // Stunden, Minuten, Sekunden
  Separator: col muted, ":"

  Controls hor, gap 8
    Button onclick start, "Start"
    Button onclick pause, "Pause"
    Button onclick reset, "Reset"
```

**Slots:** Root, Segment, Separator, ActionButton

---

## Kategorie 6: Media & Upload

### FileUpload

Datei-Upload.

```mirror
FileUpload accept "image/*", maxFiles 5
  Dropzone: pad 32, bor 2 dashed border, rad 8, center
  Dropzone: dragging: bor 2 primary, bg primary-light
  DropzoneIcon: Icon "upload", size 32, col muted
  DropzoneText: col muted

  ItemGroup: ver, gap 8, margin-top 16
  Item: hor, gap 12, pad 12, bg surface, rad 8
  ItemPreview: size 48, rad 4
  ItemName: truncate
  ItemSize: col muted, fs 12
  ItemDeleteButton: Icon "x"

  Dropzone
    DropzoneIcon
    DropzoneText "Dateien hierher ziehen oder klicken"
```

**Varianten:**
```mirror
FileUpload directory                    // Ordner-Upload
FileUpload maxFileSize 5242880          // 5MB
```

**Slots:** Root, Dropzone, DropzoneIcon, DropzoneText, HiddenInput, ItemGroup, Item, ItemPreview, ItemName, ItemSize, ItemDeleteButton

---

### Avatar

Benutzer-Avatar.

```mirror
Avatar
  Image: size 48, rad full, src "user.jpg"
  Fallback: size 48, rad full, bg primary, col white, center
  Fallback: Text "MM"
```

**Slots:** Root, Image, Fallback

---

### Carousel

Bildergalerie/Slider.

```mirror
Carousel
  Root: relative
  Viewport: overflow hidden, rad 8
  ItemGroup: hor
  Item: w full, shrink 0

  PrevButton: absolute, left 8, top 50%, translate-y -50%
  PrevButton: size 40, rad full, bg surface, shadow md, Icon "chevron-left"
  NextButton: absolute, right 8, top 50%, translate-y -50%
  NextButton: size 40, rad full, bg surface, shadow md, Icon "chevron-right"

  IndicatorGroup: hor, gap 8, center, margin-top 16
  Indicator: size 8, rad full, bg muted, selected: bg primary

  Item
    Image src "slide1.jpg"
  Item
    Image src "slide2.jpg"
  Item
    Image src "slide3.jpg"
```

**Varianten:**
```mirror
Carousel autoplay interval 3000
Carousel loop
Carousel orientation "vertical"
```

**Slots:** Root, Viewport, ItemGroup, Item, PrevButton, NextButton, IndicatorGroup, Indicator

---

### Progress

Fortschrittsanzeige.

```mirror
Progress value 60, max 100
  Track: h 8, bg muted, rad 4
  Range: bg primary, rad 4
  ValueText: fs 14, col muted
```

**Varianten:**
```mirror
Progress indeterminate                  // Unbestimmt (Animation)
Progress type "circular"                // Kreisförmig
```

**Slots:** Root, Track, Range, ValueText, Label

---

### ImageCropper

Bild zuschneiden.

```mirror
ImageCropper
  Root: relative
  Image: src "photo.jpg"
  Overlay: bg #00000080
  Selection: bor 2 white
  Handle: size 12, rad full, bg white
```

**Slots:** Root, Image, Overlay, Selection, Handle

---

### SignaturePad

Unterschrift zeichnen.

```mirror
SignaturePad
  Root: bor 1 border, rad 8, bg white
  Segment: // Zeichenfläche
  ClearButton: Button "Löschen"
```

**Slots:** Root, Segment, Guide, ClearButton

---

## Kategorie 7: Layout & Structure

### Collapsible

Ein-/Ausklappbar.

```mirror
Collapsible
  Trigger: hor, spread, pad 12, hover: bg hover
  TriggerIcon: Icon "chevron-down", expanded: rotate 180
  Content: pad 12

  Trigger
    Text "Mehr anzeigen"
    TriggerIcon
  Content
    Text "Versteckter Inhalt..."
```

**Slots:** Root, Trigger, TriggerIcon, Content

---

### Splitter

Geteilte Panels.

```mirror
Splitter orientation "horizontal"
  Root: hor, h 400
  Panel: overflow auto
  ResizeTrigger: w 8, bg border, hover: bg primary, cursor col-resize

  Panel id "left", minSize 200
    // Linker Inhalt
  ResizeTrigger
  Panel id "right", minSize 200
    // Rechter Inhalt
```

**Varianten:**
```mirror
Splitter orientation "vertical"
```

**Slots:** Root, Panel, ResizeTrigger

---

### FloatingPanel

Bewegbares/Resizbares Panel.

```mirror
FloatingPanel
  Trigger: Button "Editor öffnen"
  Positioner: absolute
  Content: w 400, h 300, bg surface, rad 8, shadow xl

  Header: hor, spread, pad 12, bg surface-dark, cursor move
  Title: weight semibold
  Close: Icon "x"
  Body: pad 16, grow, overflow auto
  ResizeTrigger: absolute, bottom 0, right 0, size 16, cursor nwse-resize

  Content
    Header
      Title "Editor"
      Close
    Body
      // Content
    ResizeTrigger
```

**Slots:** Trigger, Positioner, Content, Header, Title, Close, Body, ResizeTrigger

---

### ScrollArea

Benutzerdefinierte Scrollbars.

```mirror
ScrollArea
  Root: h 300, overflow hidden
  Viewport: h full
  Scrollbar: w 8, bg muted-light, rad 4
  Scrollbar: orientation "vertical"
  Thumb: bg muted, rad 4, hover: bg primary

  Viewport
    // Langer Content
```

**Slots:** Root, Viewport, Scrollbar, Thumb, Corner

---

## Kategorie 8: Utility

### Clipboard

In Zwischenablage kopieren.

```mirror
Clipboard value "https://example.com"
  Trigger: Button "Kopieren", Icon "copy"
  Trigger: copied: Icon "check", col success

  // Oder:
  Input: readonly, value "https://example.com"
```

**Slots:** Root, Trigger, Input, Label

---

### QRCode

QR-Code generieren.

```mirror
QRCode value "https://example.com"
  Root: size 200, bg white, pad 16
```

**Slots:** Root, Frame, Pattern

---

### Toggle

Einzelner Toggle-Button.

```mirror
Toggle
  Root: pad 8, rad 4, hover: bg hover, pressed: bg primary
  Root: Icon "bold"
```

**Slots:** Root, Indicator

---

### ToggleGroup

Gruppe von Toggle-Buttons.

```mirror
ToggleGroup type "single", defaultValue "left"
  Root: hor, gap 0, bg surface, rad 8, pad 4
  Toggle: pad 8, rad 4, selected: bg primary

  Toggle value "left", Icon "align-left"
  Toggle value "center", Icon "align-center"
  Toggle value "right", Icon "align-right"
```

**Varianten:**
```mirror
ToggleGroup type "multiple"             // Mehrfachauswahl
```

**Slots:** Root, Toggle

---

### Presence

Ein-/Ausblende-Animation.

```mirror
Presence present {isOpen}
  Content: // Animiertes Element
  Content: data-state "open": animate fadeIn
  Content: data-state "closed": animate fadeOut
```

**Slots:** Root (das animierte Element)

---

### Tour

Geführte Tour durch die UI.

```mirror
Tour steps {tourSteps}
  Spotlight: rad 8
  Positioner:
  Content: w 300, bg surface, rad 8, shadow xl, pad 16
  Title: weight semibold
  Description: col muted
  Progress: hor, gap 4
  ProgressDot: size 8, rad full, bg muted, current: bg primary
  Actions: hor, gap 8

  Content
    Title "Willkommen"
    Description "Dies ist dein Dashboard."
    Progress
    Actions
      Button "Überspringen", onclick skip
      Button "Weiter", onclick next
```

**Slots:** Spotlight, Positioner, Content, Title, Description, Progress, ProgressDot, Actions, Close

---

### AngleSlider

Winkel-Auswahl (z.B. für Rotation).

```mirror
AngleSlider defaultValue 45
  Root: size 100
  Track: rad full, bor 2 border
  Thumb: size 16, rad full, bg primary
  ValueText: center, fs 14
```

**Slots:** Root, Track, Thumb, ValueText, Label

---

### ColorPicker

Farbauswahl.

```mirror
ColorPicker defaultValue "#3B82F6"
  Trigger: size 40, rad 8
  Content: w 280, bg surface, rad 12, shadow xl, pad 16

  Area: h 150, rad 8, margin-bottom 12
  AreaThumb: size 16, rad full, bor 2 white
  ChannelSlider: h 12, rad 6
  ChannelSliderThumb: size 16, rad full, bor 2 white
  SwatchGroup: grid 6, gap 8
  Swatch: size 24, rad 4
  Input: pad 8, bg surface-dark, rad 4
```

**Slots:** Trigger, Positioner, Content, Area, AreaThumb, ChannelSlider, ChannelSliderThumb, SwatchGroup, Swatch, Input, EyeDropperTrigger

---

### Marquee

Lauftext.

```mirror
Marquee speed 50
  Root: overflow hidden
  Content: hor, gap 32

  Text "Breaking News: "
  Text "Neuigkeiten hier!"
```

**Varianten:**
```mirror
Marquee direction "right"
Marquee pauseOnHover
```

**Slots:** Root, Content

---

### TOC (Table of Contents)

Inhaltsverzeichnis.

```mirror
TOC
  Root: ver, gap 4
  Item: pad 4 8, rad 4, hover: bg hover, active: col primary

  Item href "#intro", "Einführung"
  Item href "#features", "Features"
  Item href "#pricing", "Preise"
```

**Slots:** Root, Item

---

## Zusammenfassung

### Alle 51 Komponenten nach Kategorie

| Kategorie | Komponenten |
|-----------|-------------|
| **Selection** | Select, Combobox, Menu, Listbox, CascadeSelect |
| **Form Controls** | Checkbox, RadioGroup, Switch, Slider, NumberInput, PinInput, PasswordInput, TagsInput, Rating |
| **Overlays** | Dialog, Drawer, Popover, Tooltip, HoverCard, Toast |
| **Navigation** | Tabs, Accordion, Steps, Pagination, NavigationMenu, TreeView |
| **Date & Time** | DatePicker, DateInput, Timer |
| **Media & Upload** | FileUpload, Avatar, Carousel, Progress, ImageCropper, SignaturePad |
| **Layout** | Collapsible, Splitter, FloatingPanel, ScrollArea |
| **Utility** | Clipboard, QRCode, Toggle, ToggleGroup, Presence, Tour, AngleSlider, ColorPicker, Marquee, TOC, AsyncList |

### Pattern-Übersicht

| Pattern | Komponenten |
|---------|-------------|
| **Trigger + Content** | Select, Combobox, Menu, Dialog, Drawer, Popover, Tooltip, HoverCard, DatePicker, ColorPicker |
| **List + Item** | Select, Menu, Tabs, Accordion, RadioGroup, Listbox, TreeView, NavigationMenu |
| **Control + Indicator** | Checkbox, Radio, Switch, Toggle |
| **Track + Thumb** | Slider, Switch, Progress, AngleSlider |
| **Input + Buttons** | NumberInput, PinInput, TagsInput |
