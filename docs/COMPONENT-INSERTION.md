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

## Offene Fragen

1. **Sollen wir .mir vs .com unterscheiden?**
   - Aktuell: Nein, wir fügen immer das Gleiche ein
   - Vorschlag: Ja, für Slot-basierte Komponenten

2. **Wie erkennen wir den Datei-Typ?**
   - Dateiendung: `.mir` vs `.com`
   - Oder: Kontext im Editor

3. **Was passiert bei Items/Slots?**
   - Immer Beispiel-Items einfügen (sonst nicht nutzbar)
   - Anzahl: 2-3 Items als Startpunkt

4. **Styling in .com?**
   - Minimal: Nur strukturelle Properties
   - Oder: Beispiel-Styling als Startpunkt
