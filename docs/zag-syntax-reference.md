# Zag Components - Mirror DSL Syntax Reference

Vollständige Syntax-Definitionen für alle ~50 Zag-Komponenten in Mirror DSL.

## Syntax-Prinzipien

### 1. Slots (Strukturelle Teile)
```mirror
Component
  SlotName:
    properties
    Children
```

### 2. Items (Wiederholbare Elemente mit Content)
```mirror
Component
  Item "Label"
    // Kinder = Content des Items
    Text "Inhalt"
    Button "Aktion"
```

### 3. Simple Items (Nur Label/Value)
```mirror
Component
  Item "Option A"
  Item "Option B" disabled
```

### 4. Properties
```mirror
Component prop1 "value", prop2, booleanProp
```

---

## Kategorie: Selection & Dropdowns

### Select
```mirror
Select placeholder "Wähle...", multiple, searchable, clearable
  Trigger:
    pad 12, bg #1e1e2e, rad 6
  Content:
    bg #2a2a3e, rad 8, shadow lg
  Item "Option A"
  Item "Option B"
  Item "Option C" disabled
  Group:
    GroupLabel: "Kategorie"
    Item "Gruppiert 1"
    Item "Gruppiert 2"
```

### Combobox (Autocomplete)
```mirror
Combobox placeholder "Suchen...", allowCustomValue
  Label: "Suche"
  Control:
    Input:
      pad 12, bg #1e1e2e
    Trigger:
      Icon "chevron-down"
  Content:
    bg #2a2a3e, rad 8
  Item "Apple"
  Item "Banana"
  Item "Cherry"
  Empty:
    Text "Keine Ergebnisse"
```

### Listbox
```mirror
Listbox multiple
  Label: "Auswahl"
  Content:
    bg #1e1e2e, rad 8
  Item "Item 1"
  Item "Item 2"
  Item "Item 3"
```

### CascadeSelect (Beta)
```mirror
CascadeSelect placeholder "Wähle Kategorie"
  Trigger:
    pad 12
  Content:
    Column:
      Item "Electronics"
        Item "Phones"
          Item "iPhone"
          Item "Android"
        Item "Laptops"
    Column:
      // Dynamisch basierend auf Auswahl
```

---

## Kategorie: Menus

### Menu
```mirror
Menu
  Trigger:
    Button "Aktionen"
  Content:
    bg #2a2a3e, rad 8
  Item "Bearbeiten"
  Item "Duplizieren"
  Separator:
  Item "Löschen" disabled
```

### ContextMenu
```mirror
ContextMenu
  Trigger:
    Box w 200, h 200, bg #1e1e2e
      Text "Rechtsklick hier"
  Content:
    bg #2a2a3e, rad 8
  Item "Ausschneiden"
  Item "Kopieren"
  Item "Einfügen"
```

### NestedMenu
```mirror
NestedMenu
  Trigger:
    Button "Menu"
  Content:
  Item "Datei"
    Submenu:
      Item "Neu"
      Item "Öffnen"
      Item "Speichern"
  Item "Bearbeiten"
    Submenu:
      Item "Rückgängig"
      Item "Wiederholen"
```

### NavigationMenu
```mirror
NavigationMenu
  List:
    hor, gap 8
  Item "Produkte"
    Content:
      Box hor, gap 24
        Box ver
          Link "Feature 1"
          Link "Feature 2"
        Box ver
          Link "Feature 3"
          Link "Feature 4"
  Item "Ressourcen"
    Content:
      Link "Dokumentation"
      Link "Blog"
  Item "Preise"
    // Kein Content = direkter Link
```

---

## Kategorie: Navigation & Tabs

### Tabs
```mirror
Tabs defaultValue "home", orientation "horizontal"
  List:
    hor, gap 4, bg #1e1e2e, pad 4, rad 8
  Indicator:
    bg #3b82f6, rad 4
  Tab "Home"
    Text "Willkommen"
    Button "Los geht's"
  Tab "Profile"
    Avatar
    Text "Benutzerprofil"
  Tab "Settings"
    Form
      Input placeholder "Name"
```

### Accordion
```mirror
Accordion multiple, collapsible
  Item "Abschnitt 1"
    Trigger:
      Text "Was ist Mirror?"
      Icon "chevron-down"
    Content:
      Text "Mirror ist eine DSL für UI-Prototyping."
  Item "Abschnitt 2"
    Trigger:
      Text "Wie funktioniert es?"
    Content:
      Text "Es kompiliert zu DOM oder React."
```

### Collapsible
```mirror
Collapsible defaultOpen
  Trigger:
    Button "Details anzeigen"
  Content:
    pad 16, bg #1e1e2e, rad 8
    Text "Versteckter Inhalt hier"
```

### Steps
```mirror
Steps defaultStep 1
  List:
    hor, gap 8
  Step "Konto"
    Trigger:
      Number: "1"
      Title: "Konto erstellen"
    Content:
      Input placeholder "E-Mail"
      Button "Weiter"
  Step "Profil"
    Trigger:
      Number: "2"
      Title: "Profil einrichten"
    Content:
      Input placeholder "Name"
  Step "Fertig"
    Trigger:
      Number: "3"
      Title: "Abschließen"
    Content:
      Text "Alles erledigt!"
```

### Pagination
```mirror
Pagination count 100, pageSize 10, defaultPage 1
  Root:
    hor, gap 4
  PrevTrigger:
    Icon "chevron-left"
  Item:
    // Wird für jede Seite wiederholt
    pad 8 12, rad 4
  Ellipsis:
    Text "..."
  NextTrigger:
    Icon "chevron-right"
```

### TreeView
```mirror
TreeView
  Tree:
  Branch "Ordner 1"
    Indicator:
      Icon "chevron-right"
    Content:
      Item "Datei 1.txt"
      Item "Datei 2.txt"
      Branch "Unterordner"
        Content:
          Item "Datei 3.txt"
  Branch "Ordner 2"
    Content:
      Item "Datei 4.txt"
  Item "Datei 5.txt"
```

---

## Kategorie: Form Controls

### Checkbox
```mirror
Checkbox defaultChecked, disabled
  Control:
    w 20, h 20, bor 1 #555, rad 4
    Indicator:
      Icon "check"
  Label: "Ich stimme zu"
```

### Switch
```mirror
Switch defaultChecked
  Track:
    w 44, h 24, rad 12, bg #555
  Thumb:
    w 20, h 20, rad 10, bg #fff
  Label: "Benachrichtigungen"
```

### RadioGroup
```mirror
RadioGroup defaultValue "option1", orientation "vertical"
  Label: "Wähle eine Option"
  Item "option1"
    Control:
      w 20, h 20, rad 10, bor 2 #555
      Indicator:
        w 10, h 10, rad 5, bg #3b82f6
    Label: "Option 1"
  Item "option2"
    Control:
    Label: "Option 2"
  Item "option3"
    Control:
    Label: "Option 3"
```

### Slider
```mirror
Slider defaultValue 50, min 0, max 100, step 1
  Label: "Lautstärke"
  Track:
    h 4, bg #333, rad 2
  Range:
    bg #3b82f6
  Thumb:
    w 16, h 16, rad 8, bg #fff
  ValueText:
    Text "{value}%"
```

### RangeSlider
```mirror
RangeSlider defaultValue [20, 80], min 0, max 100
  Label: "Preisbereich"
  Track:
    h 4, bg #333
  Range:
    bg #3b82f6
  Thumb index 0:
    w 16, h 16, rad 8, bg #fff
  Thumb index 1:
    w 16, h 16, rad 8, bg #fff
```

### AngleSlider
```mirror
AngleSlider defaultValue 45
  Control:
    w 100, h 100, rad 50
  Thumb:
    w 12, h 12, rad 6, bg #3b82f6
  ValueText:
    Text "{value}°"
```

### NumberInput
```mirror
NumberInput defaultValue 0, min 0, max 100, step 1
  Label: "Menge"
  Control:
    hor
  Input:
    w 80, pad 8, text-align center
  DecrementTrigger:
    Icon "minus"
  IncrementTrigger:
    Icon "plus"
```

### PinInput
```mirror
PinInput length 6, mask, otp
  Label: "Verifizierungscode"
  Control:
    hor, gap 8
  Input:
    // Wird 6x wiederholt
    w 40, h 48, text-align center, fs 18
```

### PasswordInput
```mirror
PasswordInput
  Label: "Passwort"
  Control:
    hor
  Input:
    pad 12
  VisibilityTrigger:
    Icon visible ? "eye" : "eye-off"
```

### TagsInput
```mirror
TagsInput defaultValue ["tag1", "tag2"]
  Label: "Tags"
  Control:
    hor, wrap, gap 4, pad 8, bg #1e1e2e
  Tag:
    // Für jeden Tag
    pad 4 8, bg #3b82f6, rad 4
    Text:
    DeleteTrigger:
      Icon "x"
  Input:
    placeholder "Tag hinzufügen..."
  ClearTrigger:
    Icon "x"
```

### Editable
```mirror
Editable defaultValue "Klicken zum Bearbeiten"
  Preview:
    pad 8
  Input:
    pad 8, bor 1 #3b82f6
  Control:
    hor, gap 4
  EditTrigger:
    Icon "edit"
  SubmitTrigger:
    Icon "check"
  CancelTrigger:
    Icon "x"
```

### RatingGroup
```mirror
RatingGroup defaultValue 3, count 5
  Label: "Bewertung"
  Control:
    hor, gap 4
  Item:
    // 5x wiederholt
    Icon half ? "star-half" : (highlighted ? "star-filled" : "star")
```

### SegmentedControl
```mirror
SegmentedControl defaultValue "list"
  Root:
    hor, bg #1e1e2e, rad 8, pad 4
  Indicator:
    bg #3b82f6, rad 6
  Item "list"
    Icon "list"
  Item "grid"
    Icon "grid"
  Item "kanban"
    Icon "columns"
```

### ToggleGroup
```mirror
ToggleGroup multiple, defaultValue ["bold"]
  Root:
    hor, gap 2
  Item "bold"
    Icon "bold"
  Item "italic"
    Icon "italic"
  Item "underline"
    Icon "underline"
```

---

## Kategorie: Date & Time

### DatePicker
```mirror
DatePicker defaultValue "2024-01-15"
  Label: "Datum"
  Control:
    hor
  Input:
    pad 12
  Trigger:
    Icon "calendar"
  Content:
    bg #1e1e2e, rad 8, pad 16
  ViewControl:
    hor, spread
    PrevTrigger:
      Icon "chevron-left"
    ViewTrigger:
      Text "{month} {year}"
    NextTrigger:
      Icon "chevron-right"
  Table:
    // Kalender-Grid wird automatisch generiert
  TableHeader:
  TableCell:
    pad 8, rad 4
  Presets:
    PresetTrigger "today" "Heute"
    PresetTrigger "tomorrow" "Morgen"
```

### DateInput (Beta)
```mirror
DateInput placeholder "TT.MM.JJJJ"
  Label: "Geburtsdatum"
  Control:
    hor
  Input segment "day":
    w 30
  Separator: "."
  Input segment "month":
    w 30
  Separator: "."
  Input segment "year":
    w 50
```

### Timer
```mirror
Timer defaultValue 60, autoStart
  Root:
    hor, gap 8
  Segment type "minutes":
    fs 48, weight bold
  Separator:
    Text ":"
  Segment type "seconds":
    fs 48
  Control:
    hor, gap 4
  ActionTrigger action "start":
    Icon "play"
  ActionTrigger action "pause":
    Icon "pause"
  ActionTrigger action "reset":
    Icon "refresh"
```

---

## Kategorie: Overlays & Modals

### Dialog
```mirror
Dialog modal, closeOnOutsideClick, closeOnEscape
  Trigger:
    Button "Dialog öffnen"
  Backdrop:
    bg #00000080
  Positioner:
    center
  Content:
    w 400, bg #1e1e2e, rad 12, pad 24
  Title: "Dialog Titel"
  Description: "Beschreibungstext"
  CloseTrigger:
    Icon "x"
  // Beliebiger Inhalt
  Form
    Input placeholder "Name"
    Button "Speichern"
```

### Popover
```mirror
Popover placement "bottom", closeOnOutsideClick
  Trigger:
    Button "Info"
  Positioner:
  Content:
    w 300, bg #1e1e2e, rad 8, pad 16
  Arrow:
    bg #1e1e2e
  Title: "Popover Titel"
  Description: "Weitere Informationen hier."
  CloseTrigger:
    Icon "x"
```

### Tooltip
```mirror
Tooltip placement "top", openDelay 200, closeDelay 100
  Trigger:
    Button "Hover mich"
  Positioner:
  Content:
    bg #1f2937, col #fff, pad 8 12, rad 6, fs 12
    Text "Tooltip Text"
  Arrow:
    bg #1f2937
```

### HoverCard
```mirror
HoverCard openDelay 300
  Trigger:
    Link "Benutzername"
  Positioner:
  Content:
    w 300, bg #1e1e2e, rad 8, pad 16
  Arrow:
  // Beliebiger Inhalt
  Box hor, gap 12
    Avatar src "avatar.jpg"
    Box ver
      Text "Max Mustermann"
      Text "@maxmuster", col #888
```

### Toast
```mirror
// Toast wird programmatisch erstellt
Toast type "success", duration 5000, placement "top-right"
  Root:
    hor, gap 12, bg #1e1e2e, rad 8, pad 16
  Title: "Erfolg!"
  Description: "Änderungen gespeichert."
  CloseTrigger:
    Icon "x"
  ActionTrigger:
    Button "Rückgängig"
```

### FloatingPanel
```mirror
FloatingPanel defaultPosition [100, 100], resizable, draggable
  Trigger:
    Button "Panel öffnen"
  Content:
    w 400, h 300, bg #1e1e2e, rad 8
  Header:
    hor, spread, pad 12
    DragTrigger:
      Text "Panel Titel"
    CloseTrigger:
      Icon "x"
  Body:
    pad 16
    Text "Panel Inhalt"
  ResizeTrigger:
    // Resize Handle
```

### Tour
```mirror
Tour defaultStep 0
  Step target "#button1"
    Content:
      bg #1e1e2e, rad 8, pad 16
    Title: "Willkommen"
    Description: "Klicke hier um zu starten."
    Arrow:
    Actions:
      CloseTrigger: "Überspringen"
      NextTrigger: "Weiter"
  Step target "#input1"
    Content:
    Title: "Eingabe"
    Description: "Gib deinen Namen ein."
    Actions:
      PrevTrigger: "Zurück"
      NextTrigger: "Weiter"
  Step target "#submit"
    Content:
    Title: "Fertig"
    Description: "Klicke zum Abschließen."
    Actions:
      PrevTrigger: "Zurück"
      CloseTrigger: "Fertig"
```

---

## Kategorie: Media & Files

### Avatar
```mirror
Avatar src "user.jpg", fallback "JD"
  Root:
    w 48, h 48, rad 24
  Image:
  Fallback:
    bg #3b82f6, col #fff
    Text "{initials}"
```

### FileUpload
```mirror
FileUpload multiple, accept "image/*", maxFiles 5, maxSize 5242880
  Root:
    ver, gap 8
  Dropzone:
    w full, h 150, bor 2 dashed #555, rad 8, center
    Icon "upload"
    Text "Dateien hierher ziehen"
  Trigger:
    Button "Dateien auswählen"
  ItemGroup:
    ver, gap 4
  Item:
    // Für jede Datei
    hor, spread, pad 8, bg #1e1e2e, rad 4
    ItemName:
    ItemSize:
    ItemDeleteTrigger:
      Icon "trash"
  HiddenInput:
```

### ImageCropper
```mirror
ImageCropper aspectRatio 1
  Root:
    w 400, h 400
  Image src "photo.jpg":
  Overlay:
    bg #00000066
  Cropper:
    bor 2 #fff
  Control:
    hor, gap 8
  ZoomInTrigger:
    Icon "zoom-in"
  ZoomOutTrigger:
    Icon "zoom-out"
  RotateTrigger:
    Icon "rotate"
```

### Carousel
```mirror
Carousel loop, autoplay 3000
  Root:
    w full
  ItemGroup:
    hor
  Item:
    // Für jedes Slide
    w full
    Image src "slide1.jpg"
  Item:
    Image src "slide2.jpg"
  Item:
    Image src "slide3.jpg"
  Control:
    hor, spread
  PrevTrigger:
    Icon "chevron-left"
  NextTrigger:
    Icon "chevron-right"
  IndicatorGroup:
    hor, gap 4
  Indicator:
    // Für jedes Slide
    w 8, h 8, rad 4, bg #555
```

### SignaturePad
```mirror
SignaturePad
  Root:
    w 400, h 200
  Control:
    bor 1 #555, rad 8
  Segment:
    // Zeichenfläche
  Guide:
    // Führungslinie
  ClearTrigger:
    Button "Löschen"
```

---

## Kategorie: Feedback & Status

### Progress (Linear)
```mirror
Progress value 60, max 100
  Root:
    w full
  Label: "Fortschritt"
  Track:
    h 8, bg #333, rad 4
  Range:
    bg #3b82f6, rad 4
  ValueText:
    Text "{value}%"
```

### CircularProgress
```mirror
CircularProgress value 75, max 100
  Root:
    w 100, h 100
  Circle:
    stroke #333
  Range:
    stroke #3b82f6
  ValueText:
    Text "{value}%"
```

### Marquee
```mirror
Marquee speed 50, direction "left", pauseOnHover
  Root:
    w full, clip
  Content:
    hor, gap 24
    Text "Breaking News: "
    Text "Wichtige Meldung hier!"
```

### Presence
```mirror
// Utility für animierte Ein-/Ausblendungen
Presence present {isVisible}
  Content:
    // Wird animiert ein-/ausgeblendet
    Box pad 16
      Text "Animierter Inhalt"
```

---

## Kategorie: Utility

### Clipboard
```mirror
Clipboard value "Text zum Kopieren"
  Root:
    hor, gap 8
  Input:
    readonly
  Trigger:
    Icon copied ? "check" : "copy"
  Indicator:
    Text copied ? "Kopiert!" : ""
```

### QRCode
```mirror
QRCode value "https://example.com"
  Root:
    w 200, h 200
  Frame:
    bor 1 #333, rad 8, pad 8
  // QR wird automatisch generiert
```

### ScrollArea
```mirror
ScrollArea
  Root:
    w 300, h 400
  Viewport:
    // Scrollbarer Inhalt
    Box ver, gap 8
      Text "Item 1"
      Text "Item 2"
      // ... viele Items
  Scrollbar orientation "vertical":
    w 8, bg #333, rad 4
  Thumb:
    bg #666, rad 4
  Scrollbar orientation "horizontal":
    h 8
  Thumb:
```

### Splitter
```mirror
Splitter orientation "horizontal", defaultSize [30, 70]
  Root:
    w full, h 400
  Panel:
    // Linkes Panel
    Box bg #1a1a23
      Text "Panel 1"
  ResizeTrigger:
    w 4, bg #333, cursor col-resize
  Panel:
    // Rechtes Panel
    Box bg #1e1e2e
      Text "Panel 2"
```

### FocusTrap
```mirror
// Utility - fängt Fokus innerhalb eines Bereichs
FocusTrap
  Root:
    // Fokus bleibt innerhalb
    Dialog
      Input
      Button "OK"
```

---

## State-Mapping (CSS)

Mirror States werden zu Zag Data-Attributen gemappt:

| Mirror State | Zag Selector |
|--------------|--------------|
| `hover:` | `[data-highlighted]` |
| `selected:` | `[data-state="checked"]` |
| `checked:` | `[data-state="checked"]` |
| `highlighted:` | `[data-highlighted]` |
| `disabled:` | `[data-disabled]` |
| `focus:` | `[data-focus]` |
| `focus-visible:` | `[data-focus-visible]` |
| `active:` | `[data-active]` |
| `open:` | `[data-state="open"]` |
| `closed:` | `[data-state="closed"]` |
| `expanded:` | `[data-state="open"]` |
| `collapsed:` | `[data-state="closed"]` |
| `valid:` | `[data-valid]` |
| `invalid:` | `[data-invalid]` |
| `loading:` | `[data-loading]` |
| `readonly:` | `[data-readonly]` |
| `complete:` | `[data-complete]` |
| `incomplete:` | `[data-incomplete]` |
| `current:` | `[data-current]` |

```mirror
Select
  Item "Option"
    pad 8
    highlighted:
      bg #3b82f6
    selected:
      bg #1e40af
    disabled:
      opacity 0.5
```

---

## Zusammenfassung: Pattern-Typen

### Pattern A: Slots Only
Komponenten mit nur strukturellen Teilen, keine Items.
```
Dialog, Popover, Tooltip, HoverCard, Collapsible,
Progress, Avatar, Clipboard, QRCode, etc.
```

### Pattern B: Slots + Simple Items
Strukturelle Teile plus einfache Items (nur value/label).
```
Select, Menu, ContextMenu, Listbox, ToggleGroup,
SegmentedControl, RatingGroup
```

### Pattern C: Slots + Content Items
Items die eigenen Content haben (Trigger + Content).
```
Tabs, Accordion, Steps, NavigationMenu,
TreeView (Branches), Carousel
```

### Pattern D: Repeating Items
Items werden basierend auf Daten wiederholt.
```
TagsInput (Tags), PinInput (Inputs),
Pagination (Pages), RadioGroup (Items)
```

### Pattern E: Complex Nested
Verschachtelte Strukturen mit mehreren Ebenen.
```
DatePicker (Navigation + Grid), NestedMenu,
CascadeSelect, FileUpload (Multiple Items)
```
