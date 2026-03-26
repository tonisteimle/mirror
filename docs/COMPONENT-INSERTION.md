# Component Insertion Strategy

## Kontext

Wenn eine Komponente aus dem Component Panel gezogen wird, muss entschieden werden, welcher Code eingefügt wird. Dies hängt ab von:

1. **Ziel-Datei-Typ**: `.mir` (Layout) vs `.com` (Komponenten-Definition)
2. **Komponenten-Komplexität**: Einfache vs. Slot-basierte Komponenten
3. **Verwendungszweck**: Direkte Nutzung vs. Anpassung

---

## Grundprinzipien

### .mir Layout-Datei
- **Minimal & funktional**: Nur das Nötigste für sofortige Nutzung
- **Keine Styling-Details**: Verwendet Default-Styles
- **Fokus auf Struktur**: Zeigt die wesentliche Hierarchie

### .com Komponenten-Datei
- **Vollständig & anpassbar**: Alle Slots und Optionen sichtbar
- **Mit Beispiel-Styling**: Als Startpunkt für Customization
- **Dokumentiert**: Zeigt alle Möglichkeiten

---

## Basic Primitives

### Frame
| Kontext | Code |
|---------|------|
| .mir | `Frame` |
| .com | `Frame w 100, h 100` |

### Text
| Kontext | Code |
|---------|------|
| .mir | `Text "Label"` |
| .com | `Text "Label"` |

### Icon
| Kontext | Code |
|---------|------|
| .mir | `Icon star` |
| .com | `Icon star, size 24` |

### Image
| Kontext | Code |
|---------|------|
| .mir | `Image src "..."` |
| .com | `Image src "...", w 100, h 100, fit cover` |

---

## Simple HTML Components

### Button
| Kontext | Code |
|---------|------|
| .mir | `Button "Click"` |
| .com | `Button "Click"` |

### Input
| Kontext | Code |
|---------|------|
| .mir | `Input placeholder "Enter..."` |
| .com | `Input placeholder "Enter..."` |

---

## Zag Components

### Select
| Kontext | Code |
|---------|------|
| .mir | ```Select placeholder "Choose..."```<br>```  Item "Option A"```<br>```  Item "Option B"``` |
| .com | Gleich wie .mir - Items sind Teil der Komponente |

**Überlegung**: Select braucht immer Items, sonst ist es nutzlos.

---

### Checkbox
| Kontext | Code |
|---------|------|
| .mir | `Checkbox "Accept terms"` |
| .com | `Checkbox "Label"` |

**Überlegung**: Label ist Teil der Checkbox-Syntax.

---

### Switch
| Kontext | Code |
|---------|------|
| .mir | `Switch` |
| .com | `Switch` |

**Überlegung**: Switch braucht kein Label als Kind.

---

### Slider
| Kontext | Code |
|---------|------|
| .mir | `Slider` |
| .com | `Slider min 0, max 100, value 50` |

**Überlegung**: Defaults sind ok für .mir.

---

### Radio Group
| Kontext | Code |
|---------|------|
| .mir | ```RadioGroup```<br>```  RadioItem "Option A"```<br>```  RadioItem "Option B"``` |
| .com | Gleich - braucht immer Items |

---

### Number Input
| Kontext | Code |
|---------|------|
| .mir | `NumberInput` |
| .com | `NumberInput min 0, max 100` |

---

### Pin Input
| Kontext | Code |
|---------|------|
| .mir | `PinInput length 4` |
| .com | `PinInput length 6, mask` |

---

### Password Input
| Kontext | Code |
|---------|------|
| .mir | `PasswordInput placeholder "Password"` |
| .com | `PasswordInput placeholder "Password"` |

---

### Tags Input
| Kontext | Code |
|---------|------|
| .mir | `TagsInput placeholder "Add tag..."` |
| .com | `TagsInput placeholder "Add tag..."` |

---

### Editable
| Kontext | Code |
|---------|------|
| .mir | `Editable "Click to edit"` |
| .com | `Editable "Click to edit"` |

---

### Segmented Control
| Kontext | Code |
|---------|------|
| .mir | ```SegmentedControl```<br>```  Segment "Option A"```<br>```  Segment "Option B"``` |
| .com | Gleich - braucht Segments |

---

### Toggle Group
| Kontext | Code |
|---------|------|
| .mir | ```ToggleGroup```<br>```  Toggle "B"```<br>```  Toggle "I"```<br>```  Toggle "U"``` |
| .com | Gleich - braucht Toggles |

---

## Overlay Components

### Dialog
| Kontext | Code |
|---------|------|
| .mir | ```Dialog```<br>```  Trigger: Button "Open"```<br>```  Content: Text "Dialog content"``` |
| .com | ```Dialog closeOnEscape, closeOnInteractOutside```<br>```  Trigger: Button "Open"```<br>```  Backdrop:```<br>```  Title: Text "Title"```<br>```  Description: Text "Description"```<br>```  Content:```<br>```    Text "Content"```<br>```  CloseTrigger: Button "Close"``` |

**Überlegung**: Dialog hat viele optionale Slots. In .mir nur das Minimum, in .com alle Slots zeigen.

---

### Tooltip
| Kontext | Code |
|---------|------|
| .mir | ```Tooltip```<br>```  Trigger: Button "Hover"```<br>```  Content: Text "Tooltip text"``` |
| .com | ```Tooltip positioning "top", openDelay 200```<br>```  Trigger: Button "Hover"```<br>```  Content: Text "Tooltip text"``` |

---

### Popover
| Kontext | Code |
|---------|------|
| .mir | ```Popover```<br>```  Trigger: Button "Click"```<br>```  Content: Text "Popover content"``` |
| .com | ```Popover positioning "bottom", closeOnEscape```<br>```  Trigger: Button "Click"```<br>```  Content:```<br>```    Text "Content"```<br>```  CloseTrigger: Button "X"``` |

---

### Hover Card
| Kontext | Code |
|---------|------|
| .mir | ```HoverCard```<br>```  Trigger: Text "Hover me"```<br>```  Content: Text "Card content"``` |
| .com | ```HoverCard openDelay 200, closeDelay 100```<br>```  Trigger: Text "Hover me"```<br>```  Content:```<br>```    Frame pad 16```<br>```      Text "Card content"``` |

---

### Collapsible
| Kontext | Code |
|---------|------|
| .mir | ```Collapsible```<br>```  Trigger: Button "Toggle"```<br>```  Content: Text "Hidden content"``` |
| .com | ```Collapsible defaultOpen```<br>```  Trigger: Button "Toggle"```<br>```  Content:```<br>```    Text "Collapsible content"``` |

---

## Navigation Components

### Tabs
| Kontext | Code |
|---------|------|
| .mir | ```Tabs```<br>```  Tab "Tab 1"```<br>```    Text "Content 1"```<br>```  Tab "Tab 2"```<br>```    Text "Content 2"``` |
| .com | Gleich - Tab-Syntax ist bereits kompakt |

**Überlegung**: Verwende die vereinfachte Tab-Syntax mit Kindern.

---

### Accordion
| Kontext | Code |
|---------|------|
| .mir | ```Accordion```<br>```  AccordionItem "Section 1"```<br>```    Text "Content 1"```<br>```  AccordionItem "Section 2"```<br>```    Text "Content 2"``` |
| .com | ```Accordion multiple, collapsible```<br>```  AccordionItem "Section 1"```<br>```    Text "Content"``` |

---

### Steps
| Kontext | Code |
|---------|------|
| .mir | ```Steps```<br>```  Step "Step 1"```<br>```  Step "Step 2"```<br>```  Step "Step 3"``` |
| .com | Gleich |

---

### Pagination
| Kontext | Code |
|---------|------|
| .mir | `Pagination count 100, pageSize 10` |
| .com | `Pagination count 100, pageSize 10, siblingCount 1` |

---

### Tree View
| Kontext | Code |
|---------|------|
| .mir | ```TreeView```<br>```  Branch "Folder"```<br>```    TreeItem "File 1"```<br>```    TreeItem "File 2"```<br>```  TreeItem "File 3"``` |
| .com | Gleich |

---

## Selection Components

### Listbox
| Kontext | Code |
|---------|------|
| .mir | ```Listbox```<br>```  ListItem "Item 1"```<br>```  ListItem "Item 2"```<br>```  ListItem "Item 3"``` |
| .com | ```Listbox multiple```<br>```  ListItem "Item 1"```<br>```  ListItem "Item 2"``` |

---

## Date & Time

### Date Picker
| Kontext | Code |
|---------|------|
| .mir | `DatePicker` |
| .com | `DatePicker placeholder "Select date"` |

---

## Media & Files

### Avatar
| Kontext | Code |
|---------|------|
| .mir | `Avatar "AB"` |
| .com | `Avatar "AB", size 48` |

**Überlegung**: Fallback-Initialen als Argument.

---

### File Upload
| Kontext | Code |
|---------|------|
| .mir | `FileUpload` |
| .com | ```FileUpload multiple, accept "image/*"```<br>```  Dropzone:```<br>```    Text "Drop files here"```<br>```  Trigger: Button "Browse"``` |

---

### Carousel
| Kontext | Code |
|---------|------|
| .mir | ```Carousel```<br>```  Slide: Frame bg #333```<br>```  Slide: Frame bg #555```<br>```  Slide: Frame bg #777``` |
| .com | ```Carousel loop, autoplay```<br>```  Slide: Frame```<br>```  Slide: Frame``` |

---

## Feedback

### Progress
| Kontext | Code |
|---------|------|
| .mir | `Progress value 60` |
| .com | `Progress value 60, max 100` |

---

### Circular Progress
| Kontext | Code |
|---------|------|
| .mir | `CircularProgress value 75` |
| .com | `CircularProgress value 75, size 60` |

---

## Zusammenfassung

### Kategorien nach Komplexität

**Einfach (gleicher Code für .mir und .com)**:
- Frame, Text, Icon, Image
- Button, Input
- Switch, Slider, NumberInput, PasswordInput, TagsInput, Editable
- DatePicker, Avatar, Progress, CircularProgress

**Mit Items (brauchen immer Kinder)**:
- Select, RadioGroup, SegmentedControl, ToggleGroup
- Tabs, Accordion, Steps, TreeView, Listbox
- Carousel

**Slot-basiert (unterschiedlich für .mir vs .com)**:
- Dialog, Tooltip, Popover, HoverCard, Collapsible
- FileUpload

---

---

## Entscheidung: Klare Unterscheidung .mir vs .com

### .mir Layout-Datei
**Zweck**: UI zusammenbauen aus fertigen Komponenten

- Minimaler Code
- Nur essenzielle Properties
- Beispiel-Items wo nötig (Select, Tabs)
- Kein Styling - verwendet Defaults
- Fokus: "Was will ich hier haben?"

### .com Komponenten-Datei
**Zweck**: Komponente definieren/anpassen

- Vollständiger Code
- Alle Slots sichtbar (auch optionale)
- Beispiel-Styling als Startpunkt
- Dokumentiert die Möglichkeiten
- Fokus: "Wie soll es aussehen und funktionieren?"

---

## Implementation

### Erkennung des Datei-Typs

```typescript
function getFileType(filename: string): 'mir' | 'com' {
  if (filename.endsWith('.com')) return 'com'
  return 'mir' // Default
}
```

### Code-Templates pro Komponente

```typescript
interface ComponentTemplate {
  mir: string   // Minimal für Layout
  com: string   // Vollständig für Definition
}
```

---

## Vollständige Template-Definitionen

### Frame
```
// .mir
Frame

// .com
Frame w 100, h 100, bg #27272a, rad 8
```

### Text
```
// .mir
Text "Label"

// .com
Text "Label", fs 16, weight medium, col #e4e4e7
```

### Icon
```
// .mir
Icon star

// .com
Icon star, size 24, col #a1a1aa
```

### Image
```
// .mir
Image

// .com
Image w 200, h 150, fit cover, rad 8, bg #3f3f46
```

### Button
```
// .mir
Button "Click"

// .com
Button "Click"
  pad 12 24, bg #3b82f6, col white, rad 6
  hover bg #2563eb
```

### Input
```
// .mir
Input placeholder "Enter..."

// .com
Input placeholder "Enter..."
  pad 12, bg #27272a, bor 1 #3f3f46, rad 6, col white
  focus bor 1 #3b82f6
```

### Select
```
// .mir
Select placeholder "Choose..."
  Item "Option A"
  Item "Option B"
  Item "Option C"

// .com
Select placeholder "Choose...", searchable, clearable
  Item "Option A"
  Item "Option B"
  Item "Option C"
```

### Checkbox
```
// .mir
Checkbox "Label"

// .com
Checkbox "Accept terms and conditions"
  icon check
```

### Switch
```
// .mir
Switch

// .com
Switch defaultChecked
```

### Slider
```
// .mir
Slider

// .com
Slider min 0, max 100, value 50, step 1
```

### Radio Group
```
// .mir
RadioGroup
  RadioItem "Option A"
  RadioItem "Option B"

// .com
RadioGroup value "a"
  RadioItem "Option A" value "a"
  RadioItem "Option B" value "b"
  RadioItem "Option C" value "c"
```

### Number Input
```
// .mir
NumberInput

// .com
NumberInput min 0, max 100, step 1, value 0
```

### Pin Input
```
// .mir
PinInput length 4

// .com
PinInput length 6, mask, otp
```

### Password Input
```
// .mir
PasswordInput

// .com
PasswordInput placeholder "Enter password..."
```

### Tags Input
```
// .mir
TagsInput

// .com
TagsInput placeholder "Add tag...", max 5
```

### Editable
```
// .mir
Editable "Click to edit"

// .com
Editable "Click to edit", submitMode "enter"
```

### Segmented Control
```
// .mir
SegmentedControl
  Segment "List"
  Segment "Grid"

// .com
SegmentedControl value "list"
  Segment "List" value "list"
  Segment "Grid" value "grid"
  Segment "Table" value "table"
```

### Toggle Group
```
// .mir
ToggleGroup
  Toggle "B"
  Toggle "I"
  Toggle "U"

// .com
ToggleGroup multiple
  Toggle "B" value "bold"
  Toggle "I" value "italic"
  Toggle "U" value "underline"
```

### Dialog
```
// .mir
Dialog
  Trigger: Button "Open"
  Content: Text "Dialog content"

// .com
Dialog closeOnEscape, closeOnInteractOutside
  Trigger: Button "Open Dialog"
  Backdrop: bg rgba(0,0,0,0.8)
  Content: Frame ver, gap 16, pad 24, bg #27272a, rad 12, w 400
    Title: Text "Dialog Title", fs 20, weight bold
    Description: Text "Dialog description", col #a1a1aa
    Frame ver, gap 8
      Text "Main content goes here"
    Frame hor, gap 8, spread
      CloseTrigger: Button "Cancel", bg transparent, bor 1 #3f3f46
      Button "Confirm", bg #3b82f6
```

### Tooltip
```
// .mir
Tooltip
  Trigger: Text "Hover me"
  Content: Text "Tooltip"

// .com
Tooltip positioning "top", openDelay 200, closeDelay 0
  Trigger: Button "Hover for info"
  Content: Frame pad 8 12, bg #18181b, rad 6, bor 1 #3f3f46
    Text "Helpful tooltip text", fs 13
```

### Popover
```
// .mir
Popover
  Trigger: Button "Click"
  Content: Text "Popover content"

// .com
Popover positioning "bottom", closeOnEscape, closeOnInteractOutside
  Trigger: Button "Open Menu"
  Content: Frame ver, gap 4, pad 8, bg #27272a, rad 8, bor 1 #3f3f46, w 200
    Button "Option 1", bg transparent, w full
    Button "Option 2", bg transparent, w full
    Divider
    CloseTrigger: Button "Close", bg transparent, w full, col #ef4444
```

### Hover Card
```
// .mir
HoverCard
  Trigger: Text "@username"
  Content: Text "User info"

// .com
HoverCard positioning "bottom", openDelay 300, closeDelay 100
  Trigger: Text "@username", col #3b82f6, underline
  Content: Frame ver, gap 12, pad 16, bg #27272a, rad 12, bor 1 #3f3f46, w 300
    Frame hor, gap 12
      Avatar "JD", size 48
      Frame ver
        Text "John Doe", weight bold
        Text "@johndoe", col #71717a, fs 13
    Text "Software developer and UI enthusiast", col #a1a1aa
```

### Collapsible
```
// .mir
Collapsible
  Trigger: Button "Toggle"
  Content: Text "Hidden content"

// .com
Collapsible defaultOpen
  Trigger: Frame hor, spread, pad 12, bg #27272a, rad 8, cursor pointer
    Text "Click to expand"
    Icon chevron-down
  Content: Frame pad 16, bg #1f1f23, rad 8
    Text "This content can be collapsed"
```

### Tabs
```
// .mir
Tabs
  Tab "Tab 1"
    Text "Content 1"
  Tab "Tab 2"
    Text "Content 2"

// .com
Tabs defaultValue "tab1"
  Tab "Overview" value "tab1"
    Frame pad 16
      Text "Overview content"
  Tab "Details" value "tab2"
    Frame pad 16
      Text "Details content"
  Tab "Settings" value "tab3"
    Frame pad 16
      Text "Settings content"
```

### Accordion
```
// .mir
Accordion
  AccordionItem "Section 1"
    Text "Content 1"
  AccordionItem "Section 2"
    Text "Content 2"

// .com
Accordion collapsible, multiple
  AccordionItem "What is Mirror?" value "q1"
    Text "Mirror is a DSL for rapid UI prototyping."
  AccordionItem "How does it work?" value "q2"
    Text "You write declarative code and it compiles to DOM or React."
  AccordionItem "Is it free?" value "q3"
    Text "Yes, Mirror is open source."
```

### Steps
```
// .mir
Steps
  Step "Step 1"
  Step "Step 2"
  Step "Step 3"

// .com
Steps current 1
  Step "Account" description "Create your account"
  Step "Profile" description "Set up your profile"
  Step "Complete" description "You're all set"
```

### Pagination
```
// .mir
Pagination count 100

// .com
Pagination count 100, pageSize 10, siblingCount 1, page 1
```

### Tree View
```
// .mir
TreeView
  Branch "Folder"
    TreeItem "File"
  TreeItem "File"

// .com
TreeView selectionMode "single"
  Branch "src" value "src"
    Branch "components" value "components"
      TreeItem "Button.tsx" value "button"
      TreeItem "Input.tsx" value "input"
    TreeItem "index.ts" value "index"
  Branch "public" value "public"
    TreeItem "favicon.ico" value "favicon"
```

### Listbox
```
// .mir
Listbox
  ListItem "Item 1"
  ListItem "Item 2"
  ListItem "Item 3"

// .com
Listbox selectionMode "multiple"
  ListItem "Design" value "design"
  ListItem "Development" value "dev"
  ListItem "Marketing" value "marketing"
  ListItem "Sales" value "sales"
```

### Date Picker
```
// .mir
DatePicker

// .com
DatePicker placeholder "Select date", format "DD.MM.YYYY"
```

### Avatar
```
// .mir
Avatar "AB"

// .com
Avatar "JD", size 48, src "https://..."
```

### File Upload
```
// .mir
FileUpload

// .com
FileUpload multiple, maxFiles 5, accept "image/*"
  Dropzone: Frame ver, center, gap 8, pad 32, bg #27272a, rad 12, bor 2 dashed #3f3f46
    Icon upload, size 32, col #71717a
    Text "Drop files here", col #a1a1aa
    Text "or click to browse", fs 13, col #52525b
  Trigger: Button "Browse Files"
```

### Carousel
```
// .mir
Carousel
  Slide: Frame bg #27272a
  Slide: Frame bg #3f3f46

// .com
Carousel loop, autoplay, interval 5000
  Slide: Frame center, h 200, bg #27272a, rad 8
    Text "Slide 1"
  Slide: Frame center, h 200, bg #3f3f46, rad 8
    Text "Slide 2"
  Slide: Frame center, h 200, bg #52525b, rad 8
    Text "Slide 3"
```

### Progress
```
// .mir
Progress value 60

// .com
Progress value 60, max 100
```

### Circular Progress
```
// .mir
CircularProgress value 75

// .com
CircularProgress value 75, size 80, trackWidth 8
```
