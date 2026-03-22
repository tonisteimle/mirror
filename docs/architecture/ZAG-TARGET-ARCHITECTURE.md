# Zag Target Architecture

Zielarchitektur für die Integration von Zag als Behavior-Engine in Mirror.

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Schichten](#schichten)
3. [Datenfluss](#datenfluss)
4. [Komponenten-Syntax](#komponenten-syntax)
5. [Komponenten-Mapping (Zag API)](#komponenten-mapping-zag-api)
6. [Event-Integration](#event-integration)
7. [Data Binding](#data-binding)
8. [Animation & Transitions](#animation--transitions)
9. [Dateistruktur](#dateistruktur-ziel)
10. [Dependencies](#dependencies)
11. [Implementierungs-Phasen](#implementierungs-phasen)
12. [Koexistenz-Strategie](#koexistenz-strategie)
13. [SourceMap für Slots](#sourcemap-für-slots)
14. [PropertyPanel Integration](#propertypanel-integration)
15. [Machine Lifecycle](#machine-lifecycle)
16. [Code-Modifier Integration](#code-modifier-integration)
17. [Portal-Handling](#portal-handling)
18. [Fehlerbehandlung](#fehlerbehandlung)
19. [Primitive-Ablösung](#primitive-ablösung)
20. [Migration Path](#migration-path)
21. [Testing-Strategie](#testing-strategie)
22. [Risiken & Mitigations](#risiken--mitigations)

---

## Übersicht

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MIRROR STUDIO                                  │
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────────┐ │
│  │   Editor    │    │   Preview   │    │          Panels                 │ │
│  │             │───▶│             │◀───│  Property │ Tree │ Files        │ │
│  │  Mirror DSL │    │  Live DOM   │    │                                 │ │
│  └─────────────┘    └─────────────┘    └─────────────────────────────────┘ │
│         │                  ▲                                                │
│         │                  │                                                │
│         ▼                  │                                                │
│  ┌─────────────────────────┴───────────────────────────────────────────┐   │
│  │                      COMPILER PIPELINE                               │   │
│  │                                                                      │   │
│  │  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────────┐  │   │
│  │  │  Lexer   │──▶│  Parser  │──▶│   AST    │──▶│  Zag Compiler    │  │   │
│  │  └──────────┘   └──────────┘   └──────────┘   └──────────────────┘  │   │
│  │                                                        │             │   │
│  └────────────────────────────────────────────────────────┼─────────────┘   │
│                                                           │                 │
│                                                           ▼                 │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        ZAG RUNTIME                                     │ │
│  │                                                                        │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐       │ │
│  │  │   Select   │  │   Dialog   │  │    Menu    │  │    ...     │       │ │
│  │  │  Machine   │  │  Machine   │  │  Machine   │  │  Machines  │       │ │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘       │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Export
                                      ▼
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
         ▼                            ▼                            ▼
  ┌─────────────┐            ┌─────────────┐            ┌─────────────┐
  │ Vanilla JS  │            │   React     │            │   Native    │
  │   + Zag     │            │   + Zag     │            │    DOM      │
  └─────────────┘            └─────────────┘            └─────────────┘
```

## Schichten

### 1. DSL Layer

**Verantwortung:** Syntax für Struktur, Styling, Komposition

**Dateien:**
```
src/
├── parser/
│   ├── lexer.ts           # Tokenization
│   ├── parser.ts          # AST Generation
│   └── ast.ts             # AST Types
└── schema/
    └── dsl.ts             # DSL Schema (Primitives, Props, States)
```

**Erweiterungen für Zag:**
```typescript
// Neue Primitives in dsl.ts
const ZAG_PRIMITIVES = {
  Select: { machine: 'select', slots: ['Trigger', 'Content', 'Item', ...] },
  Dialog: { machine: 'dialog', slots: ['Trigger', 'Content', 'Title', ...] },
  Menu: { machine: 'menu', slots: ['Trigger', 'Content', 'Item', ...] },
  // ...
}

// Neue Keywords
const ZAG_KEYWORDS = ['searchable', 'multiple', 'clearable', 'modal']
```

### 2. Compiler Layer

**Verantwortung:** AST → Zag-kompatiblen Output

**Dateien:**
```
src/
├── ir/
│   └── index.ts           # AST → IR Transformation
├── compiler/
│   └── zag/
│       ├── index.ts       # Zag Compiler Entry
│       ├── machines.ts    # Machine Mappings
│       ├── slots.ts       # Slot → API Mappings
│       ├── styles.ts      # Style → CSS Generation
│       └── collection.ts  # Item → Collection Transform
```

**Compiler Interface:**
```typescript
interface ZagCompiler {
  compile(ast: MirrorAST): ZagOutput
}

interface ZagOutput {
  machines: MachineConfig[]      // Zag Machine Konfigurationen
  dom: DOMStructure              // DOM-Struktur mit Slot-Bindings
  styles: StyleSheet             // Generierte CSS
  bindings: SlotBinding[]        // Slot → Zag API Mappings
}
```

### 3. Runtime Layer

**Verantwortung:** Zag Machines ausführen, DOM verbinden

**Dateien:**
```
src/
└── runtime/
    └── zag/
        ├── index.ts           # Runtime Entry
        ├── machine-runner.ts  # Machine Lifecycle
        ├── dom-binder.ts      # API → DOM Binding
        ├── style-manager.ts   # Dynamic Styles
        └── state-sync.ts      # State ↔ DOM Sync
```

**Runtime Interface:**
```typescript
interface ZagRuntime {
  // Machine Lifecycle
  createMachine(type: string, config: MachineConfig): Service
  startMachine(service: Service): void
  stopMachine(service: Service): void

  // DOM Binding
  bindSlot(element: HTMLElement, api: ZagAPI, slot: string): void
  applyStyles(element: HTMLElement, styles: StateStyles): void

  // State Management
  getState(service: Service): MachineState
  subscribe(service: Service, callback: (state: MachineState) => void): void
}
```

### 4. Preview Layer (Studio)

**Verantwortung:** Live-Vorschau im Studio

**Dateien:**
```
studio/
├── preview/
│   ├── index.ts               # Preview Controller
│   ├── zag-preview.ts         # Zag-spezifische Preview
│   └── renderer.ts            # DOM Rendering
└── modules/
    └── compiler/
        └── zag-adapter.ts     # Studio ↔ Compiler Bridge
```

### 5. Export Layer

**Verantwortung:** Production-ready Code generieren

**Dateien:**
```
src/
└── backends/
    ├── zag-vanilla.ts         # Vanilla JS + Zag
    ├── zag-react.ts           # React + Zag
    └── native-dom.ts          # Pure DOM (existing)
```

## Datenfluss

### Preview (Hot Path)

```
Mirror Source
     │
     ▼
┌─────────────────┐
│  Parser         │  ~5ms
└─────────────────┘
     │
     ▼
┌─────────────────┐
│  AST            │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│  Zag Compiler   │  ~10ms
│  (Preview Mode) │
└─────────────────┘
     │
     ├──────────────────────────────┐
     ▼                              ▼
┌─────────────────┐      ┌─────────────────┐
│  Zag Machines   │      │  DOM Structure  │
│  (started)      │      │  + Styles       │
└─────────────────┘      └─────────────────┘
     │                              │
     └──────────────┬───────────────┘
                    ▼
          ┌─────────────────┐
          │  Live Preview   │
          │  (bound)        │
          └─────────────────┘
```

### Export

```
Mirror Source
     │
     ▼
┌─────────────────┐
│  Parser         │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│  AST            │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│  Zag Compiler   │
│  (Export Mode)  │
└─────────────────┘
     │
     ├─────────────────┬─────────────────┐
     ▼                 ▼                 ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Vanilla  │    │  React   │    │  Native  │
│ + Zag    │    │  + Zag   │    │   DOM    │
└──────────┘    └──────────┘    └──────────┘
```

## Komponenten-Syntax

Alle 51 Zag-Komponenten folgen konsistenten Syntax-Patterns.

> **Vollständige Referenz:** [features/zag-components/syntax-reference.md](../../features/zag-components/syntax-reference.md)

### Übersicht nach Kategorien

#### Selection (5 Komponenten)
| Komponente | Pattern | Keywords |
|------------|---------|----------|
| Select | Trigger + Content | `multiple`, `searchable`, `clearable` |
| Menu | Trigger + Content | `contextmenu` |
| Combobox | Input + Content | `multiple`, `autocomplete` |
| TreeView | Container + Branch/Item | `multiple` |
| ListNavigation | List + Item | - |

#### Form Controls (11 Komponenten)
| Komponente | Pattern | Keywords |
|------------|---------|----------|
| Checkbox | Control + Indicator | `indeterminate`, `disabled` |
| RadioGroup | Group + Radio | `orientation` |
| Switch | Track + Thumb | `disabled` |
| Slider | Track + Thumb | `range`, `orientation` |
| NumberInput | Input + Buttons | `formatOptions`, `min`, `max` |
| PinInput | Input + Field | `otp`, `mask` |
| RatingGroup | Control + Item | `max`, `allowHalf`, `readonly` |
| ToggleGroup | Group + Item | `multiple` |
| SignaturePad | Control + Segment | `readonly`, `disabled` |
| EditableText | Display + Input | `submitMode`, `startWithEditView` |
| Clipboard | Trigger + Input | - |

#### Overlays (5 Komponenten)
| Komponente | Pattern | Keywords |
|------------|---------|----------|
| Dialog | Trigger + Backdrop + Content | `modal`, `closeOnEscape` |
| Popover | Trigger + Content | `position`, `closeOnEscape` |
| Tooltip | Trigger + Content | `position`, `delay` |
| HoverCard | Trigger + Content | `delay` |
| Toast | Container + Item | `placement`, `duration` |

#### Navigation (4 Komponenten)
| Komponente | Pattern | Keywords |
|------------|---------|----------|
| Tabs | List + Panel | `orientation`, `activationMode` |
| Accordion | Item + Trigger + Content | `collapsible`, `multiple` |
| Pagination | Container + Items | `count`, `pageSize` |
| Steps | Container + Item | `orientation`, `linear` |

#### Date & Time (3 Komponenten)
| Komponente | Pattern | Keywords |
|------------|---------|----------|
| DatePicker | Trigger + Content + Grid | `mode "range"`, `locale` |
| TimePicker | Trigger + Content | `format`, `min`, `max` |
| Timer | Display + Controls | `countdown`, `autoStart` |

#### Media & Upload (6 Komponenten)
| Komponente | Pattern | Keywords |
|------------|---------|----------|
| FileUpload | Dropzone + Item | `multiple`, `accept`, `maxFiles` |
| Avatar | Image + Fallback | `size` |
| Carousel | Container + Item | `loop`, `autoplay` |
| ColorPicker | Trigger + Content | `format` |
| QRCode | Container | `value`, `size` |
| Angle | Control + Thumb | - |

#### Layout & Structure (8 Komponenten)
| Komponente | Pattern | Keywords |
|------------|---------|----------|
| Collapsible | Trigger + Content | `disabled` |
| Splitter | Panel + ResizeTrigger | `orientation` |
| ProgressBar | Track + Indicator | `max`, `indeterminate` |
| ProgressCircle | Circle + Indicator | `max`, `indeterminate` |
| Segment | Container + Item | - |
| TagsInput | Container + Tag + Input | `max`, `allowDuplicates` |
| Highlight | Container | `query`, `matchAll` |
| FloatingPanel | Trigger + Content | `position` |

#### Utility (9 Komponenten)
| Komponente | Pattern | Keywords |
|------------|---------|----------|
| Tour | Container + Step | `closeOnEscape` |
| Presence | Container | `present`, `lazyMount` |
| FocusTrap | Container | `disabled` |
| ScrollArea | Container + Scrollbar | `orientation` |
| Frame | Container | `src` |
| Field | Label + Input + Error | `required`, `invalid` |
| Fieldset | Legend + Fields | `disabled` |
| Format | Container | `number`, `bytes`, `date` |
| Locale | Provider | `locale` |

### Design-Prinzipien

```
1. Slots mit Doppelpunkt       →  Trigger:, Content:, Item:
2. Behavior als Keywords       →  searchable, multiple, modal
3. States mit Doppelpunkt      →  hover:, selected:, open:
4. Definition vs. Verwendung   →  Komplexität in Definition
```

### Gemeinsame Patterns

```
Trigger + Content     →  Dialog, Menu, Popover, Tooltip, Select
List + Item           →  Select, Menu, Tabs, Accordion, RadioGroup
Control + Indicator   →  Checkbox, Radio, Switch
Track + Thumb         →  Slider, Switch
```

### Konsistente States

| State | Beschreibung | Data Attribute |
|-------|--------------|----------------|
| `hover:` | Mouse over | `[data-highlighted]` |
| `focus:` | Keyboard focus | `[data-focus]` |
| `selected:` | Item ausgewählt | `[data-state="checked"]` |
| `checked:` | Checkbox/Radio/Switch an | `[data-state="checked"]` |
| `highlighted:` | Keyboard navigation | `[data-highlighted]` |
| `expanded:` | Accordion offen | `[data-state="open"]` |
| `open:` | Dropdown/Dialog offen | `[data-state="open"]` |
| `disabled:` | Deaktiviert | `[data-disabled]` |
| `invalid:` | Validierungsfehler | `[data-invalid]` |
| `valid:` | Validierung OK | `[data-valid]` |
| `loading:` | Laden aktiv | `[data-loading]` |
| `dragging:` | Drag aktiv | `[data-dragging]` |
| `pressed:` | Button gedrückt | `[data-pressed]` |
| `indeterminate:` | Teilweise ausgewählt | `[data-state="indeterminate"]` |
| `readonly:` | Nur lesen | `[data-readonly]` |
| `required:` | Pflichtfeld | `[data-required]` |

### Beispiele

#### Select

```mirror
Select placeholder "Wähle..."
  Trigger: pad 12, bg surface, rad 8
  Content: bg surface, shadow lg
  Item: hover: bg hover, selected: bg primary

  Item "Option A"
  Item "Option B"
```

#### Dialog

```mirror
Dialog modal, closeOnEscape
  Trigger: Button "Öffnen"
  Backdrop: bg #00000080
  Content: w 400, pad 24, bg surface, rad 12
  Title: fs 18, weight semibold
  Close: absolute, top 16, right 16

  Content
    Title "Bestätigung"
    Text "Möchtest du fortfahren?"
    Actions hor, gap 8
      Button "Abbrechen" onclick close
      Button "OK" onclick confirm
```

#### Tabs

```mirror
Tabs defaultValue "tab1"
  TabList: hor, gap 4, bg surface, pad 4, rad 8
  Tab: pad 8 16, rad 6, selected: bg primary, col white
  TabPanel: pad 16

  TabList
    Tab value "tab1", "Übersicht"
    Tab value "tab2", "Details"

  TabPanel value "tab1"
    Text "Übersicht Content"
  TabPanel value "tab2"
    Text "Details Content"
```

#### Checkbox

```mirror
Checkbox label "Newsletter abonnieren"
  Control: size 20, rad 4, bor 2 #555, checked: bg primary
  Indicator: Icon "check", col white
```

#### Slider

```mirror
Slider min 0, max 100, defaultValue 50
  Track: h 4, bg #333, rad 2
  Range: bg primary
  Thumb: size 20, rad full, bg white, shadow md
```

---

## Komponenten-Mapping (Zag API)

### Select

```
Mirror                          Zag
──────────────────────────────────────────────────────
Select                    →     select.machine()
  searchable              →     combobox.machine()
  multiple                →     { multiple: true }
  placeholder "..."       →     { placeholder: "..." }

  Trigger:                →     getTriggerProps()
  Content:                →     getContentProps()
  Item:                   →     getItemProps({ item })
  ItemIndicator:          →     getItemIndicatorProps()

  Item "Apple"            →     collection.items[]
  Item value "x" label "Y"→     { value: "x", label: "Y" }
```

### Dialog

```
Mirror                          Zag
──────────────────────────────────────────────────────
Dialog                    →     dialog.machine()
  modal                   →     { modal: true }
  closeOnEscape           →     { closeOnEscapeKeyDown: true }
  closeOnOutsideClick     →     { closeOnInteractOutside: true }

  Trigger:                →     getTriggerProps()
  Backdrop:               →     getBackdropProps()
  Content:                →     getContentProps()
  Title:                  →     getTitleProps()
  Description:            →     getDescriptionProps()
  Close:                  →     getCloseTriggerProps()
```

### Menu

```
Mirror                          Zag
──────────────────────────────────────────────────────
Menu                      →     menu.machine()
  trigger "contextmenu"   →     { contextMenu: true }

  Trigger:                →     getTriggerProps()
  Content:                →     getContentProps()
  Item:                   →     getItemProps({ value })
  Separator:              →     getSeparatorProps()
  ItemGroup:              →     getItemGroupProps()
  ItemGroupLabel:         →     getItemGroupLabelProps()
```

### Tabs

```
Mirror                          Zag
──────────────────────────────────────────────────────
Tabs                      →     tabs.machine()
  defaultValue "x"        →     { defaultValue: "x" }
  orientation "vertical"  →     { orientation: "vertical" }

  TabList:                →     getListProps()
  Tab:                    →     getTriggerProps({ value })
  TabPanel:               →     getContentProps({ value })
  TabIndicator:           →     getIndicatorProps()
```

### Accordion

```
Mirror                          Zag
──────────────────────────────────────────────────────
Accordion                 →     accordion.machine()
  collapsible             →     { collapsible: true }
  multiple                →     { multiple: true }

  AccordionItem:          →     getItemProps({ value })
  Trigger:                →     getItemTriggerProps({ value })
  Content:                →     getItemContentProps({ value })
  TriggerIcon:            →     getItemIndicatorProps({ value })
```

### Checkbox

```
Mirror                          Zag
──────────────────────────────────────────────────────
Checkbox                  →     checkbox.machine()
  checked                 →     { checked: true }
  indeterminate           →     { checked: "indeterminate" }
  disabled                →     { disabled: true }

  Control:                →     getControlProps()
  Indicator:              →     getIndicatorProps()
  Label:                  →     getLabelProps()
```

### Slider

```
Mirror                          Zag
──────────────────────────────────────────────────────
Slider                    →     slider.machine()
  min 0, max 100          →     { min: 0, max: 100 }
  step 5                  →     { step: 5 }
  defaultValue 50         →     { defaultValue: [50] }
  range                   →     (uses two thumbs)

  Track:                  →     getTrackProps()
  Range:                  →     getRangeProps()
  Thumb:                  →     getThumbProps({ index })
```

### DatePicker

```
Mirror                          Zag
──────────────────────────────────────────────────────
DatePicker                →     datepicker.machine()
  mode "range"            →     { selectionMode: "range" }
  locale "de-DE"          →     { locale: "de-DE" }
  min 2024-01-01          →     { min: parseDate("2024-01-01") }

  Trigger:                →     getTriggerProps()
  Content:                →     getContentProps()
  Day:                    →     getDayTableCellProps({ value })
  Header:                 →     (custom)
  NavButton:              →     getPrevTriggerProps() / getNextTriggerProps()
```

### Slot Binding

```typescript
const SLOT_MAPPINGS: Record<string, SlotMapping> = {
  Select: {
    Trigger: {
      api: 'getTriggerProps',
      element: 'button',
      states: {
        'open:': '[data-state="open"]',
        'focus:': '[data-focus]',
      }
    },
    Content: {
      api: 'getContentProps',
      element: 'div',
      portal: true,
      states: {
        'open:': '[data-state="open"]',
      }
    },
    Item: {
      api: 'getItemProps',
      element: 'div',
      itemBound: true,  // Wird pro Item aufgerufen
      states: {
        'hover:': '[data-highlighted]',
        'highlighted:': '[data-highlighted]',
        'selected:': '[data-state="checked"]',
        'disabled:': '[data-disabled]',
      }
    },
  }
}
```

### Style Generation

```
Mirror State              CSS Selector
──────────────────────────────────────────────────────
hover:                →   [data-highlighted]
highlighted:          →   [data-highlighted]
selected:             →   [data-state="checked"]
disabled:             →   [data-disabled]
open:                 →   [data-state="open"]
focus:                →   [data-focus]
invalid:              →   [data-invalid]
loading:              →   [data-loading]
dragging:             →   [data-dragging]
```

---

## Event-Integration

Zag-Events werden in Mirror-Events übersetzt.

### Zag → Mirror Event Mapping

```
Zag Event                 Mirror Event
──────────────────────────────────────────────────────
onValueChange         →   onchange
onOpenChange          →   onopen / onclose
onFocusChange         →   onfocus / onblur
onHighlightChange     →   onhighlight
onInputValueChange    →   oninput
onFileAccept          →   onaccept
onFileReject          →   onreject
```

### Syntax

```mirror
Select placeholder "Wähle..."
  onchange: assign $selected
  onopen: call trackOpen
  onclose: call trackClose

  Item "Option A"
  Item "Option B"
```

### Implementierung

```typescript
// Event-Handler werden an Machine-Callbacks gebunden
const machineConfig = {
  id: nodeId,
  onValueChange: (details) => {
    // Mirror Event auslösen
    emitEvent(nodeId, 'change', details.value)

    // Actions ausführen (assign, call, etc.)
    executeActions(node.events.onchange, details)
  },
  onOpenChange: (details) => {
    if (details.open) {
      emitEvent(nodeId, 'open')
      executeActions(node.events.onopen)
    } else {
      emitEvent(nodeId, 'close')
      executeActions(node.events.onclose)
    }
  }
}
```

### Event-Details

Zag liefert strukturierte Event-Details:

```typescript
// Select onValueChange
{
  value: string[],           // Ausgewählte Werte
  items: CollectionItem[],   // Ausgewählte Items
}

// DatePicker onValueChange
{
  value: DateValue[],        // Ausgewählte Daten
  valueAsString: string[],   // Formatierte Strings
}

// Slider onValueChange
{
  value: number[],           // Aktuelle Werte
}

// FileUpload onFileAccept
{
  files: File[],             // Akzeptierte Dateien
}
```

---

## Data Binding

Mirror unterstützt deklarative Datenbindung für Zag-Komponenten.

### Collection Binding

```mirror
// Statische Items
Select
  Item "Apple"
  Item "Banana"

// Dynamische Items via data
Select data $fruits

// Mit Value/Label Mapping
Select data $countries, valueKey "code", labelKey "name"
```

### Implementierung

```typescript
// Compiler generiert Collection aus data
function buildCollection(dataRef: string, options: CollectionOptions) {
  const data = resolveData(dataRef)  // $fruits → [{...}, {...}]

  return createListCollection({
    items: data,
    itemToString: (item) => item[options.labelKey] || item.label || item,
    itemToValue: (item) => item[options.valueKey] || item.value || item,
  })
}
```

### Two-Way Binding

```mirror
// Binding an Variable
Select value $selectedCountry
  Item value "de", label "Deutschland"
  Item value "at", label "Österreich"

// Bei Änderung wird $selectedCountry automatisch aktualisiert
```

### Controlled vs Uncontrolled

```mirror
// Uncontrolled (Zag verwaltet State)
Select defaultValue "de"
  Item "Deutschland"

// Controlled (Mirror verwaltet State)
Select value $country, onchange: assign $country
  Item "Deutschland"
```

### Implementierung Controlled Mode

```typescript
// Bei controlled: Mirror State als Source of Truth
const machineConfig = {
  value: () => getVariable('$country'),  // Getter
  onValueChange: (details) => {
    setVariable('$country', details.value)  // Sync zurück
  }
}
```

---

## Animation & Transitions

Zag unterstützt Presence-Animationen für Overlays und Collapsibles.

### Presence-Konzept

```
┌─────────────────────────────────────────────────────────┐
│  Presence steuert Mount/Unmount mit Animation          │
│                                                         │
│  closed → mounting → open → unmounting → closed         │
│              ↓                    ↓                     │
│         CSS enter            CSS exit                   │
└─────────────────────────────────────────────────────────┘
```

### Syntax

```mirror
Dialog modal
  Content:
    transition "fade", duration 200

  // Oder mit Keyframes
  Content:
    enter: opacity 0 → 1, scale 0.95 → 1
    exit: opacity 1 → 0, scale 1 → 0.95
```

### Implementierung

```typescript
// Zag Presence-Integration
const dialogApi = dialog.connect(state, send, normalizeProps)

// Content wird nur gerendert wenn present
if (dialogApi.open || isAnimating) {
  renderContent({
    ...dialogApi.getContentProps(),
    'data-state': dialogApi.open ? 'open' : 'closed',
  })
}
```

### CSS-Generierung

```css
/* Generiert aus: transition "fade", duration 200 */
[data-scope="dialog"][data-part="content"] {
  transition: opacity 200ms ease-out;
}

[data-scope="dialog"][data-part="content"][data-state="open"] {
  opacity: 1;
}

[data-scope="dialog"][data-part="content"][data-state="closed"] {
  opacity: 0;
}
```

### Vordefinierte Transitions

| Name | Beschreibung |
|------|--------------|
| `fade` | Opacity 0 → 1 |
| `scale` | Scale 0.95 → 1 + Fade |
| `slide-up` | TranslateY 10px → 0 + Fade |
| `slide-down` | TranslateY -10px → 0 + Fade |
| `slide-left` | TranslateX 10px → 0 + Fade |
| `slide-right` | TranslateX -10px → 0 + Fade |

---

## Dateistruktur (Ziel)

```
src/
├── parser/                      # Existing
│   ├── lexer.ts
│   ├── parser.ts
│   └── ast.ts
│
├── schema/
│   ├── dsl.ts                   # Existing + Zag Primitives
│   └── zag-primitives.ts        # NEW: Zag Component Definitions
│
├── compiler/
│   └── zag/                     # NEW
│       ├── index.ts             # Entry Point
│       ├── compiler.ts          # Main Compiler
│       ├── machines.ts          # Machine Configurations
│       ├── slots.ts             # Slot Mappings
│       ├── styles.ts            # Style Generation
│       ├── collection.ts        # Data Collection Builder
│       └── types.ts             # TypeScript Types
│
├── runtime/
│   ├── index.ts                 # Existing Runtime
│   └── zag/                     # NEW
│       ├── index.ts             # Zag Runtime Entry
│       ├── machine-runner.ts    # Machine Lifecycle
│       ├── dom-binder.ts        # Slot → DOM Binding
│       ├── style-manager.ts     # State-based Styles
│       └── helpers.ts           # Utilities
│
├── backends/
│   ├── dom.ts                   # Existing
│   ├── zag-vanilla.ts           # NEW: Export Vanilla + Zag
│   └── zag-react.ts             # NEW: Export React + Zag
│
└── ir/
    └── index.ts                 # Existing, extended

studio/
├── preview/
│   ├── index.ts                 # Existing
│   ├── zag-preview.ts           # NEW: Zag Preview Integration
│   └── renderer.ts              # Existing, extended
│
└── modules/
    └── compiler/
        ├── index.ts             # Existing
        └── zag-adapter.ts       # NEW: Compiler Adapter
```

## Dependencies

Zag-Packages werden nach Bedarf installiert (Tree Shaking).

### Core (immer benötigt)

```json
{
  "dependencies": {
    "@zag-js/core": "^1.x",
    "@zag-js/dom-query": "^1.x",
    "@zag-js/interact-outside": "^1.x"
  }
}
```

### Komponenten (nach Kategorie)

```json
{
  "dependencies": {
    // Selection
    "@zag-js/select": "^1.x",
    "@zag-js/combobox": "^1.x",
    "@zag-js/menu": "^1.x",
    "@zag-js/tree-view": "^1.x",

    // Form Controls
    "@zag-js/checkbox": "^1.x",
    "@zag-js/radio-group": "^1.x",
    "@zag-js/switch": "^1.x",
    "@zag-js/slider": "^1.x",
    "@zag-js/number-input": "^1.x",
    "@zag-js/pin-input": "^1.x",
    "@zag-js/rating-group": "^1.x",
    "@zag-js/toggle-group": "^1.x",
    "@zag-js/signature-pad": "^1.x",
    "@zag-js/editable": "^1.x",
    "@zag-js/clipboard": "^1.x",

    // Overlays
    "@zag-js/dialog": "^1.x",
    "@zag-js/popover": "^1.x",
    "@zag-js/tooltip": "^1.x",
    "@zag-js/hover-card": "^1.x",
    "@zag-js/toast": "^1.x",

    // Navigation
    "@zag-js/tabs": "^1.x",
    "@zag-js/accordion": "^1.x",
    "@zag-js/pagination": "^1.x",
    "@zag-js/steps": "^1.x",

    // Date & Time
    "@zag-js/date-picker": "^1.x",
    "@zag-js/time-picker": "^1.x",
    "@zag-js/timer": "^1.x",

    // Media & Upload
    "@zag-js/file-upload": "^1.x",
    "@zag-js/avatar": "^1.x",
    "@zag-js/carousel": "^1.x",
    "@zag-js/color-picker": "^1.x",
    "@zag-js/qr-code": "^1.x",
    "@zag-js/angle-slider": "^1.x",

    // Layout & Structure
    "@zag-js/collapsible": "^1.x",
    "@zag-js/splitter": "^1.x",
    "@zag-js/progress": "^1.x",
    "@zag-js/tags-input": "^1.x",
    "@zag-js/floating-panel": "^1.x",

    // Utility
    "@zag-js/tour": "^1.x",
    "@zag-js/presence": "^1.x",
    "@zag-js/focus-trap": "^1.x"
  }
}
```

> **Hinweis:** Nicht alle Packages werden gleichzeitig benötigt. Der Compiler ermittelt verwendete Komponenten und generiert nur die benötigten Imports.

## Implementierungs-Phasen

Alle 51 Zag-Komponenten werden in 8 Phasen implementiert.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 1   │  Phase 2   │  Phase 3   │  Phase 4   │  Phase 5-8         │
│  Foundation│  Selection │  Forms     │  Overlays  │  Rest              │
│  (Infra)   │  (5)       │  (11)      │  (5)       │  (30)              │
└─────────────────────────────────────────────────────────────────────────┘
```

### Phase 1: Foundation

**Ziel:** Infrastruktur für Zag-Integration

```
□ Zag Core Dependencies installieren
□ Zag Runtime Basis (machine-runner, dom-binder)
□ Slot Mapping System
□ State → CSS Transformation
□ Event-Integration
□ Preview Integration
□ SourceMap für Slots
```

**Deliverable:** Infrastruktur bereit für Komponenten

---

### Phase 2: Selection (5 Komponenten)

**Ziel:** Alle Selection-Komponenten

| Komponente | Priorität | Abhängigkeit |
|------------|-----------|--------------|
| Select | Hoch | - |
| Menu | Hoch | - |
| Combobox | Hoch | Select |
| TreeView | Mittel | - |
| ListNavigation | Niedrig | - |

```
□ Select (single, multiple, grouped)
□ Menu (dropdown, context menu)
□ Combobox (searchable select)
□ TreeView (hierarchische Auswahl)
□ ListNavigation (keyboard nav)
```

**Deliverable:** Selection-Komponenten feature-complete

---

### Phase 3: Form Controls (11 Komponenten)

**Ziel:** Alle Form-Komponenten

| Komponente | Priorität | Abhängigkeit |
|------------|-----------|--------------|
| Checkbox | Hoch | - |
| RadioGroup | Hoch | - |
| Switch | Hoch | - |
| Slider | Hoch | - |
| NumberInput | Hoch | - |
| PinInput | Mittel | - |
| RatingGroup | Mittel | - |
| ToggleGroup | Mittel | - |
| EditableText | Mittel | - |
| SignaturePad | Niedrig | - |
| Clipboard | Niedrig | - |

```
□ Checkbox (single, indeterminate)
□ RadioGroup (mit custom styling)
□ Switch (on/off toggle)
□ Slider (single, range, vertical)
□ NumberInput (mit increment/decrement)
□ PinInput (OTP, verification codes)
□ RatingGroup (stars, custom icons)
□ ToggleGroup (single, multiple)
□ EditableText (inline editing)
□ SignaturePad (Unterschriften)
□ Clipboard (copy/paste)
```

**Deliverable:** Form Controls feature-complete

---

### Phase 4: Overlays (5 Komponenten)

**Ziel:** Alle Overlay-Komponenten

| Komponente | Priorität | Abhängigkeit |
|------------|-----------|--------------|
| Dialog | Hoch | Presence |
| Popover | Hoch | - |
| Tooltip | Hoch | - |
| HoverCard | Mittel | - |
| Toast | Mittel | - |

```
□ Dialog (modal, non-modal, nested)
□ Popover (positioning, arrow)
□ Tooltip (delay, positioning)
□ HoverCard (rich content preview)
□ Toast (notifications, stacking)
```

**Deliverable:** Overlay-Komponenten feature-complete

---

### Phase 5: Navigation (4 Komponenten)

**Ziel:** Alle Navigation-Komponenten

| Komponente | Priorität | Abhängigkeit |
|------------|-----------|--------------|
| Tabs | Hoch | - |
| Accordion | Hoch | Collapsible |
| Pagination | Mittel | - |
| Steps | Mittel | - |

```
□ Tabs (horizontal, vertical, lazy)
□ Accordion (single, multiple, collapsible)
□ Pagination (pages, page size)
□ Steps (wizard, linear/non-linear)
```

**Deliverable:** Navigation-Komponenten feature-complete

---

### Phase 6: Date & Time + Media (9 Komponenten)

**Ziel:** Date/Time und Media-Komponenten

| Komponente | Priorität | Abhängigkeit |
|------------|-----------|--------------|
| DatePicker | Hoch | - |
| TimePicker | Mittel | - |
| Timer | Niedrig | - |
| FileUpload | Hoch | - |
| Avatar | Mittel | - |
| Carousel | Mittel | - |
| ColorPicker | Mittel | Popover |
| QRCode | Niedrig | - |
| Angle | Niedrig | - |

```
□ DatePicker (single, range, multi)
□ TimePicker (12h, 24h)
□ Timer (countdown, stopwatch)
□ FileUpload (drag & drop, multiple)
□ Avatar (image, fallback, group)
□ Carousel (slides, autoplay)
□ ColorPicker (formats, swatches)
□ QRCode (generate QR codes)
□ Angle (angle/rotation input)
```

**Deliverable:** Date/Time und Media feature-complete

---

### Phase 7: Layout & Structure (8 Komponenten)

**Ziel:** Layout-Komponenten

| Komponente | Priorität | Abhängigkeit |
|------------|-----------|--------------|
| Collapsible | Hoch | Presence |
| ProgressBar | Hoch | - |
| ProgressCircle | Mittel | - |
| TagsInput | Mittel | - |
| Splitter | Mittel | - |
| Segment | Niedrig | - |
| Highlight | Niedrig | - |
| FloatingPanel | Niedrig | - |

```
□ Collapsible (expand/collapse)
□ ProgressBar (determinate, indeterminate)
□ ProgressCircle (circular progress)
□ TagsInput (tags, chips)
□ Splitter (resizable panels)
□ Segment (segmented control)
□ Highlight (text highlighting)
□ FloatingPanel (draggable panels)
```

**Deliverable:** Layout-Komponenten feature-complete

---

### Phase 8: Utility (9 Komponenten)

**Ziel:** Utility-Komponenten

| Komponente | Priorität | Abhängigkeit |
|------------|-----------|--------------|
| Field | Hoch | - |
| Fieldset | Hoch | Field |
| Presence | Hoch | - |
| FocusTrap | Mittel | - |
| ScrollArea | Mittel | - |
| Tour | Mittel | Popover |
| Frame | Niedrig | - |
| Format | Niedrig | - |
| Locale | Niedrig | - |

```
□ Field (label, input, error, hint)
□ Fieldset (grouped fields)
□ Presence (mount/unmount animation)
□ FocusTrap (keyboard focus management)
□ ScrollArea (custom scrollbars)
□ Tour (onboarding, feature tours)
□ Frame (iframe wrapper)
□ Format (number, date, bytes formatting)
□ Locale (i18n provider)
```

**Deliverable:** Utility-Komponenten feature-complete

---

### Phase 9: Export & Polish

**Ziel:** Production-ready Export

```
□ Vanilla JS + Zag Backend
□ React + Zag Backend
□ Vue + Zag Backend (optional)
□ Export Dialog im Studio
□ Bundle Optimization
□ Tree Shaking verifizieren
□ Performance Benchmarks
□ Dokumentation vervollständigen
```

**Deliverable:** Exportierbare Projekte

---

### Zusammenfassung

| Phase | Komponenten | Kumulativ |
|-------|-------------|-----------|
| 1. Foundation | 0 (Infra) | 0 |
| 2. Selection | 5 | 5 |
| 3. Form Controls | 11 | 16 |
| 4. Overlays | 5 | 21 |
| 5. Navigation | 4 | 25 |
| 6. Date/Time + Media | 9 | 34 |
| 7. Layout & Structure | 8 | 42 |
| 8. Utility | 9 | **51** |
| 9. Export | 0 (Polish) | 51 |

**Alle 51 Komponenten sind abgedeckt.**

## Koexistenz-Strategie

Native Komponenten und Zag-Komponenten existieren parallel.

### Erkennung

```typescript
// Schema definiert welche Komponenten Zag nutzen
const ZAG_COMPONENTS = ['Select', 'Dialog', 'Menu', 'Tabs', ...]

function isZagComponent(type: string): boolean {
  return ZAG_COMPONENTS.includes(type)
}
```

### Rendering

```
┌──────────────────────────────────────────┐
│ App                                      │
│   ├─ Box          → Native Runtime       │
│   ├─ Select       → Zag Runtime          │
│   ├─ Text         → Native Runtime       │
│   └─ Dialog       → Zag Runtime          │
└──────────────────────────────────────────┘
```

### Implementierung

```typescript
// preview/renderer.ts
function renderNode(node: IRNode): HTMLElement {
  if (isZagComponent(node.type)) {
    return zagRuntime.render(node)
  } else {
    return nativeRuntime.render(node)
  }
}
```

**Prinzip:** Schrittweise Migration. Alte Komponenten bleiben funktional.

---

## SourceMap für Slots

Slots sind **Properties** der Parent-Komponente, keine eigenen Nodes.

### Struktur

```mirror
Select placeholder "..."      ← Zeile 1, Node: select_1
  Trigger:                    ← Zeile 2, Slot von select_1
    pad 12                    ← Zeile 3, Property von Trigger-Slot
  Item "Apple"                ← Zeile 4, Item: select_1_item_0
  Item "Banana"               ← Zeile 5, Item: select_1_item_1
```

### SourceMap Einträge

```typescript
interface ZagSourceMapEntry {
  nodeId: string           // "select_1"
  line: number             // 1
  slot?: string            // undefined für Root, "Trigger" für Slots
  itemIndex?: number       // undefined für Root, 0/1/2 für Items
}

// Beispiel
sourceMap.entries = [
  { nodeId: 'select_1', line: 1 },
  { nodeId: 'select_1', line: 2, slot: 'Trigger' },
  { nodeId: 'select_1', line: 4, slot: 'Item', itemIndex: 0 },
  { nodeId: 'select_1', line: 5, slot: 'Item', itemIndex: 1 },
]
```

### Lookup

```typescript
// Line → Node + Context
sourceMap.getNodeAtLine(4)
// → { nodeId: 'select_1', slot: 'Item', itemIndex: 0 }

// Node + Context → Line
sourceMap.getLineForSlot('select_1', 'Trigger')
// → 2
```

---

## PropertyPanel Integration

Das PropertyPanel zeigt kontextabhängige Properties.

### Selection-Kontext

```typescript
interface SelectionContext {
  nodeId: string
  slot?: string           // "Trigger", "Content", "Item"
  itemIndex?: number      // Bei Item-Selection
}
```

### Property-Sets pro Slot

```typescript
const SELECT_PROPERTY_SETS = {
  root: ['placeholder', 'multiple', 'searchable', 'disabled'],
  Trigger: ['pad', 'bg', 'rad', 'bor', 'col', ...],  // Alle Style-Props
  Content: ['bg', 'rad', 'shadow', 'maxh', ...],
  Item: ['pad', 'rad', 'col', 'hover:', 'selected:', ...],
}

function getPropertiesForSelection(context: SelectionContext) {
  if (context.slot) {
    return SELECT_PROPERTY_SETS[context.slot]
  }
  return SELECT_PROPERTY_SETS.root
}
```

### UI-Gruppierung

```
┌─────────────────────────────────────┐
│ Select: select_1                    │
├─────────────────────────────────────┤
│ ▼ Component                         │
│   placeholder: [Wähle...        ]   │
│   ☑ multiple   ☐ searchable        │
├─────────────────────────────────────┤
│ ▼ Trigger (selected)                │
│   padding:  [12]                    │
│   bg:       [#1e1e2e]               │
│   radius:   [8]                     │
├─────────────────────────────────────┤
│ ▼ Content                           │
│   bg:       [#1e1e2e]               │
│   shadow:   [lg]                    │
├─────────────────────────────────────┤
│ ▼ Item                              │
│   padding:  [8 12]                  │
│   hover:    bg [#2a2a3e]            │
│   selected: bg [#3B82F6]            │
└─────────────────────────────────────┘
```

---

## Machine Lifecycle

### Hot-Reload Strategie

```
Code-Änderung
     │
     ▼
┌─────────────────────────────────────┐
│ 1. Alte Machines stoppen            │
│    - service.stop()                 │
│    - Event Listeners entfernen      │
│    - DOM Bindings lösen             │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ 2. Neues AST kompilieren            │
│    - Parse                          │
│    - Transform                      │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ 3. Machines vergleichen             │
│    - Gleiche ID? → State erhalten   │
│    - Neue Machine? → Fresh start    │
│    - Gelöscht? → Cleanup            │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ 4. Neue Machines starten            │
│    - service.start()                │
│    - DOM Bindings erstellen         │
│    - Optional: State wiederherstellen│
└─────────────────────────────────────┘
```

### State Preservation

```typescript
interface MachineRegistry {
  machines: Map<string, {
    service: Service
    lastState: MachineState
  }>
}

function hotReload(oldRegistry: MachineRegistry, newConfig: MachineConfig[]) {
  for (const config of newConfig) {
    const existing = oldRegistry.machines.get(config.id)

    if (existing && config.type === existing.type) {
      // Gleiche Machine, State erhalten
      const preserved = {
        value: existing.lastState.value,      // open/closed
        // NICHT erhalten: highlighted (transient)
      }
      startMachine(config, preserved)
    } else {
      // Neue Machine, fresh start
      startMachine(config)
    }
  }
}
```

---

## Code-Modifier Integration

### Slot-Adressierung

```typescript
// Adressierungsschema: nodeId.slot.property
// Oder: nodeId.slot[index].property für Items

interface PropertyPath {
  nodeId: string
  slot?: string
  itemIndex?: number
  property: string
}

// Beispiele
'select_1.Trigger.bg'           // → Trigger background
'select_1.Item.hover.bg'        // → Item hover background
'select_1.Item[0].label'        // → Erstes Item Label
```

### Code-Modifier API

```typescript
class ZagCodeModifier {

  // Slot-Property ändern
  updateSlotProperty(
    nodeId: string,
    slot: string,
    property: string,
    value: string
  ): CodeChange {
    const line = sourceMap.getLineForSlot(nodeId, slot)
    // ... Property auf der richtigen Zeile finden/einfügen
  }

  // Item hinzufügen
  addItem(nodeId: string, label: string, value?: string): CodeChange {
    const lastItemLine = sourceMap.getLastItemLine(nodeId)
    // ... Neue Zeile nach letztem Item einfügen
  }

  // Item entfernen
  removeItem(nodeId: string, index: number): CodeChange {
    const itemLine = sourceMap.getItemLine(nodeId, index)
    // ... Zeile löschen
  }
}
```

### Beispiel

```typescript
// User ändert Trigger Background im PropertyPanel
codeModifier.updateSlotProperty('select_1', 'Trigger', 'bg', '#FF0000')

// Vorher:
// Select placeholder "..."
//   Trigger:
//     pad 12, bg #1e1e2e

// Nachher:
// Select placeholder "..."
//   Trigger:
//     pad 12, bg #FF0000
```

---

## Portal-Handling

Zag rendert Content in Portals (außerhalb des DOM-Parents).

### DOM-Struktur

```html
<!-- Mirror-generierte Struktur -->
<div data-node="select_1" data-zag="select">
  <button data-part="trigger">Wähle...</button>
</div>

<!-- Zag Portal (am Ende von body) -->
<div data-zag-portal data-parent-node="select_1">
  <div data-part="positioner">
    <div data-part="content">
      <div data-part="item" data-item-index="0">Apple</div>
      <div data-part="item" data-item-index="1">Banana</div>
    </div>
  </div>
</div>
```

### Click-Handling im Preview

```typescript
// preview/zag-preview.ts
function handlePreviewClick(event: MouseEvent) {
  const target = event.target as HTMLElement

  // Normaler Node?
  const nodeId = target.closest('[data-node]')?.dataset.node
  if (nodeId) {
    selectNode(nodeId)
    return
  }

  // Portal-Element?
  const portal = target.closest('[data-zag-portal]')
  if (portal) {
    const parentNodeId = portal.dataset.parentNode
    const part = target.closest('[data-part]')?.dataset.part
    const itemIndex = target.closest('[data-item-index]')?.dataset.itemIndex

    selectNode(parentNodeId, {
      slot: part === 'item' ? 'Item' : 'Content',
      itemIndex: itemIndex ? parseInt(itemIndex) : undefined
    })
  }
}
```

### SourceMap für Portals

```typescript
// Portals referenzieren Parent-Node
sourceMap.registerPortal({
  portalElement: portalDiv,
  parentNodeId: 'select_1'
})

// Lookup funktioniert über Parent
sourceMap.getNodeForElement(portalItemDiv)
// → { nodeId: 'select_1', slot: 'Item', itemIndex: 0 }
```

---

## Fehlerbehandlung

### Validierungsstufen

```
┌─────────────────────────────────────┐
│ 1. Parse-Zeit (Schema)              │
│    - Ungültige Slot-Namen           │
│    - Falsche Property-Typen         │
│    - Fehlende required Props        │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 2. Compile-Zeit (Zag Compiler)      │
│    - Inkompatible Kombinationen     │
│    - Fehlende Items bei Select      │
│    - Ungültige Machine Config       │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 3. Runtime (Zag Machine)            │
│    - State Transition Errors        │
│    - DOM Binding Failures           │
│    - Event Handler Errors           │
└─────────────────────────────────────┘
```

### Error-Typen

```typescript
type ZagError =
  | { type: 'INVALID_SLOT', slot: string, component: string, valid: string[] }
  | { type: 'MISSING_REQUIRED', prop: string, component: string }
  | { type: 'INVALID_COMBINATION', props: string[], reason: string }
  | { type: 'RUNTIME_ERROR', message: string, machineId: string }
```

### Graceful Degradation

```typescript
function renderWithFallback(node: IRNode): HTMLElement {
  try {
    if (isZagComponent(node.type)) {
      return zagRuntime.render(node)
    }
    return nativeRuntime.render(node)
  } catch (error) {
    console.error(`Zag render error for ${node.id}:`, error)

    // Fallback: Render als Box mit Error-Indikator
    const fallback = document.createElement('div')
    fallback.dataset.node = node.id
    fallback.dataset.error = 'true'
    fallback.className = 'zag-error-fallback'
    fallback.textContent = `[${node.type}: Render Error]`
    return fallback
  }
}
```

### Error-Anzeige im Studio

```
┌─────────────────────────────────────────────┐
│ ⚠ Zag Error                                 │
│                                             │
│ Select "select_1":                          │
│ Invalid slot "Tigger" - did you mean        │
│ "Trigger"?                                  │
│                                             │
│ Valid slots: Trigger, Content, Item,        │
│ ItemIndicator, Group, GroupLabel            │
│                                             │
│ Line 3, Column 3                            │
└─────────────────────────────────────────────┘
```

---

## Primitive-Ablösung

Bestehende native Primitives werden schrittweise durch Zag-basierte ersetzt.

### Übersicht

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRIMITIVE EVOLUTION                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  NATIVE (bleiben)              ZAG (neu)                    DEPRECATED       │
│  ─────────────────             ─────────                    ──────────       │
│  Box, Frame, Text              Select ←──────────────────── Select (html)   │
│  Button, Input                 Dialog ←──────────────────── (Pattern)       │
│  Label, Textarea               Menu                         Dropdown (Pat.) │
│  Image, Icon, Link             Tabs                                         │
│  Divider, Spacer               Accordion                                    │
│  Header, Nav, Main             Tooltip                                      │
│  Section, Article              Popover                                      │
│  Aside, Footer                 Slider ←──────────────────── (neu)           │
│  H1-H6                         NumberInput                                  │
│                                DatePicker                                   │
│                                Checkbox ←────────────────── Checkbox (html) │
│                                RadioGroup ←──────────────── Radio (html)    │
│                                Switch                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Kategorien

#### 1. Native Primitives (bleiben unverändert)

Einfache HTML-Elemente ohne komplexes Behavior:

```typescript
const NATIVE_PRIMITIVES = [
  // Container
  'Box', 'Frame', 'Text', 'Slot', 'Divider', 'Spacer',

  // Semantic
  'Header', 'Nav', 'Main', 'Section', 'Article', 'Aside', 'Footer',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',

  // Media
  'Image', 'Icon', 'Link',

  // Simple Form
  'Button', 'Input', 'Textarea', 'Label',
]
```

Diese brauchen kein Zag - sie sind bereits optimal.

#### 2. Zag-Primitives (neu)

Komplexe interaktive Komponenten:

```typescript
const ZAG_PRIMITIVES = {
  // Form Controls
  Select: { machine: 'select', replaces: ['Select (html)', 'Option'] },
  Checkbox: { machine: 'checkbox', replaces: ['Checkbox (html)'] },
  RadioGroup: { machine: 'radio-group', replaces: ['Radio (html)'] },
  Switch: { machine: 'switch', replaces: null },
  Slider: { machine: 'slider', replaces: null },
  NumberInput: { machine: 'number-input', replaces: null },

  // Overlay
  Dialog: { machine: 'dialog', replaces: ['Modal Pattern'] },
  Popover: { machine: 'popover', replaces: null },
  Tooltip: { machine: 'tooltip', replaces: null },
  Menu: { machine: 'menu', replaces: ['Dropdown Pattern'] },

  // Navigation
  Tabs: { machine: 'tabs', replaces: ['Tabs Pattern'] },
  Accordion: { machine: 'accordion', replaces: ['Accordion Pattern'] },

  // Date/Time
  DatePicker: { machine: 'date-picker', replaces: null },
  TimePicker: { machine: 'time-picker', replaces: null },
}
```

#### 3. Deprecated Primitives

```typescript
const DEPRECATED_PRIMITIVES = {
  // HTML Select → Zag Select
  'Select (html)': {
    replacement: 'Select',
    reason: 'Zag Select bietet besseres Styling und Accessibility',
    migration: 'automatic',
  },

  // HTML Option → Teil von Zag Select
  'Option': {
    replacement: 'Select > Item',
    reason: 'Wird Teil der Zag Select Syntax',
    migration: 'automatic',
  },

  // HTML Checkbox → Zag Checkbox
  'Checkbox (html)': {
    replacement: 'Checkbox',
    reason: 'Zag Checkbox bietet Custom Styling',
    migration: 'automatic',
  },

  // HTML Radio → Zag RadioGroup
  'Radio (html)': {
    replacement: 'RadioGroup > Radio',
    reason: 'Zag RadioGroup bietet bessere Gruppierung',
    migration: 'manual',
  },
}
```

### Migrations-Matrix

| Alt | Neu | Migration | Phase |
|-----|-----|-----------|-------|
| `Select` (html) | `Select` (zag) | Automatisch | 1 |
| `Option` | `Item` in Select | Automatisch | 1 |
| `Checkbox` (html) | `Checkbox` (zag) | Automatisch | 2 |
| `Radio` (html) | `RadioGroup > Radio` | Manuell | 2 |
| Dropdown Pattern | `Select` oder `Menu` | Manuell | 1 |
| Modal Pattern | `Dialog` | Manuell | 2 |
| Tabs Pattern | `Tabs` | Manuell | 3 |
| Accordion Pattern | `Accordion` | Manuell | 3 |

### Syntax-Transformationen

#### Select (html) → Select (zag)

```mirror
# VORHER (html select)
Select
  Option value "de" "Deutschland"
  Option value "at" "Österreich"
  Option value "ch" "Schweiz"

# NACHHER (zag select)
Select placeholder "Land wählen..."
  Item value "de", label "Deutschland"
  Item value "at", label "Österreich"
  Item value "ch", label "Schweiz"
```

#### Checkbox (html) → Checkbox (zag)

```mirror
# VORHER (html checkbox)
Checkbox named newsletter
Label "Newsletter abonnieren"

# NACHHER (zag checkbox)
Checkbox label "Newsletter abonnieren"
  Box:                          # Custom checkbox styling
    size 20, rad 4, bor 1 #555
    checked: bg primary, bor 0
  Indicator:
    Icon "check", col white
```

#### Radio (html) → RadioGroup (zag)

```mirror
# VORHER (html radio - manuell gruppiert)
Radio name "size" value "s"
Label "Small"
Radio name "size" value "m"
Label "Medium"
Radio name "size" value "l"
Label "Large"

# NACHHER (zag radiogroup)
RadioGroup name "size"
  Radio value "s", label "Small"
  Radio value "m", label "Medium"
  Radio value "l", label "Large"

  Radio:                        # Styling für alle
    hor, gap 8
    Indicator:
      size 20, rad full, bor 2 #555
      checked: bor 2 primary
      Dot:
        size 10, rad full, bg primary
        opacity 0
        checked: opacity 1
```

#### Dropdown Pattern → Select/Menu

```mirror
# VORHER (manuelles Dropdown Pattern)
Dropdown as frame:
  closed
  onclick toggle
  onclick-outside close
  keys
    escape close
    arrow-down highlight next

  Trigger as frame:
    pad 12, bg surface

  if (open)
    Menu as frame:
      Item as frame:
        onhover highlight
        onclick select, close
        state highlighted: bg hover

      Item "Option A"
      Item "Option B"

# NACHHER (zag select)
Select placeholder "Wähle..."
  Trigger: pad 12, bg surface
  Item: highlighted: bg hover

  Item "Option A"
  Item "Option B"
```

### Schema-Änderungen

```typescript
// src/schema/dsl.ts - Änderungen

export const DSL = {
  primitives: {
    // UNVERÄNDERT: Native Primitives
    Box: { html: 'div', description: 'Generic container' },
    Frame: { html: 'div', aliases: ['Box'], description: 'Alias for Box' },
    Text: { html: 'span', description: 'Text element' },
    Button: { html: 'button', description: 'Clickable button' },
    Input: { html: 'input', description: 'Text input field' },
    // ... etc.

    // DEPRECATED: Werden zu Zag migriert
    // Select: { html: 'select', ... }     // → ZAG
    // Option: { html: 'option', ... }     // → ZAG (Item)
    // Checkbox: { html: 'input', ... }    // → ZAG
    // Radio: { html: 'input', ... }       // → ZAG
  },

  // NEU: Zag Primitives
  zagPrimitives: {
    Select: {
      machine: 'select',
      slots: ['Trigger', 'Content', 'Item', 'ItemIndicator', 'Group', 'GroupLabel'],
      props: ['placeholder', 'multiple', 'searchable', 'clearable', 'disabled'],
    },
    Checkbox: {
      machine: 'checkbox',
      slots: ['Control', 'Indicator', 'Label'],
      props: ['label', 'checked', 'disabled', 'required', 'indeterminate'],
    },
    RadioGroup: {
      machine: 'radio-group',
      slots: ['Radio', 'Indicator', 'Label'],
      props: ['name', 'value', 'disabled'],
    },
    Dialog: {
      machine: 'dialog',
      slots: ['Trigger', 'Backdrop', 'Content', 'Title', 'Description', 'Close'],
      props: ['modal', 'closeOnEscape', 'closeOnOutsideClick'],
    },
    // ... etc.
  },
}
```

### Erkennungslogik

```typescript
// src/compiler/zag/detector.ts

export function detectPrimitiveType(name: string): 'native' | 'zag' | 'deprecated' {
  if (ZAG_PRIMITIVES[name]) {
    return 'zag'
  }

  if (DEPRECATED_PRIMITIVES[name]) {
    return 'deprecated'
  }

  return 'native'
}

export function handleDeprecated(name: string, node: ASTNode): ASTNode {
  const deprecated = DEPRECATED_PRIMITIVES[name]

  if (!deprecated) return node

  // Warnung ausgeben
  console.warn(
    `"${name}" is deprecated. Use "${deprecated.replacement}" instead. ` +
    `Reason: ${deprecated.reason}`
  )

  // Automatische Migration wenn möglich
  if (deprecated.migration === 'automatic') {
    return transformToZag(node, deprecated.replacement)
  }

  return node
}
```

### Rollout-Phasen

```
Phase 1 (Select)
├── Select (zag) verfügbar
├── Select (html) → automatische Migration + Warning
├── Option → Item Migration
├── Dropdown Pattern → Manual Migration Docs
└── Menu (zag) verfügbar

Phase 2 (Form Controls)
├── Checkbox (zag) verfügbar
├── Checkbox (html) → automatische Migration
├── RadioGroup (zag) verfügbar
├── Radio (html) → Manual Migration + Warning
├── Switch (zag) verfügbar
└── Slider (zag) verfügbar

Phase 3 (Overlay)
├── Dialog (zag) verfügbar
├── Popover (zag) verfügbar
├── Tooltip (zag) verfügbar
└── Modal Pattern → Manual Migration Docs

Phase 4 (Navigation)
├── Tabs (zag) verfügbar
├── Accordion (zag) verfügbar
└── Pattern → Manual Migration Docs

Phase 5 (Advanced)
├── DatePicker (zag) verfügbar
├── TimePicker (zag) verfügbar
├── NumberInput (zag) verfügbar
└── Combobox (searchable Select) verfügbar
```

### Feature Flags

Feature Flags steuern den schrittweisen Rollout. Neue Flags werden mit jeder Phase hinzugefügt.

```typescript
// Schrittweiser Rollout via Feature Flags
const FEATURE_FLAGS = {
  // Phase 1: Selection
  ZAG_SELECT: true,
  ZAG_MENU: true,
  ZAG_COMBOBOX: false,

  // Phase 2: Form Controls
  ZAG_CHECKBOX: false,
  ZAG_RADIO_GROUP: false,
  ZAG_SWITCH: false,
  ZAG_SLIDER: false,

  // Phase 3: Overlays
  ZAG_DIALOG: false,
  ZAG_POPOVER: false,
  ZAG_TOOLTIP: false,

  // Phase 4: Navigation
  ZAG_TABS: false,
  ZAG_ACCORDION: false,

  // Phase 5: Advanced
  ZAG_DATE_PICKER: false,
  ZAG_NUMBER_INPUT: false,
  ZAG_FILE_UPLOAD: false,

  // ... weitere Komponenten werden mit jeder Phase hinzugefügt

  // System Flags
  DEPRECATION_WARNINGS: true,
  AUTO_MIGRATION: true,
}

function shouldUseZag(primitive: string): boolean {
  const flag = `ZAG_${primitive.toUpperCase().replace('-', '_')}`
  return FEATURE_FLAGS[flag] ?? false
}

// Alle 51 Komponenten werden über Feature Flags gesteuert
// Vollständige Liste: siehe syntax-reference.md
```

---

## Migration Path

### Von Dropdown zu Select

Das alte `Dropdown` Pattern wird durch `Select` ersetzt.

### Strategie: Alias + Deprecation Warning

```typescript
// Phase 1: Alias
const COMPONENT_ALIASES = {
  Dropdown: 'Select',  // Dropdown → Select
}

// Parser erkennt und wandelt um
if (COMPONENT_ALIASES[type]) {
  console.warn(`"${type}" is deprecated, use "${COMPONENT_ALIASES[type]}"`)
  type = COMPONENT_ALIASES[type]
}
```

### Code-Transformation

```mirror
# Vorher (altes Dropdown)
Dropdown as frame:
  closed
  onclick toggle
  onclick-outside close

  Trigger as frame:
    pad 12

  if (open)
    Menu as frame:
      Item as frame:
        onclick select, close
      Item "Apple"
      Item "Banana"

# Nachher (neues Select)
Select placeholder "Wähle..."
  Trigger: pad 12
  Item "Apple"
  Item "Banana"
```

### Migration-Tool (optional)

```bash
# Automatische Migration
mirror migrate --from dropdown --to select ./src/**/*.mirror
```

### Timeline

| Phase | Aktion |
|-------|--------|
| v1.0 | `Select` verfügbar, `Dropdown` funktioniert |
| v1.1 | `Dropdown` zeigt Deprecation Warning |
| v2.0 | `Dropdown` entfernt |

---

## Testing-Strategie

### Unit Tests

```typescript
// src/compiler/zag/__tests__/compiler.test.ts
describe('ZagCompiler', () => {
  it('compiles Select to machine config', () => {
    const ast = parse(`Select placeholder "Test"`)
    const output = zagCompiler.compile(ast)

    expect(output.machines[0]).toMatchObject({
      type: 'select',
      config: { placeholder: 'Test' }
    })
  })

  it('maps Trigger slot correctly', () => {
    const ast = parse(`
      Select
        Trigger: pad 12, bg #333
    `)
    const output = zagCompiler.compile(ast)

    expect(output.bindings).toContainEqual({
      nodeId: expect.any(String),
      slot: 'Trigger',
      api: 'getTriggerProps'
    })
  })
})
```

### Integration Tests

```typescript
// src/runtime/zag/__tests__/runtime.test.ts
describe('ZagRuntime', () => {
  it('starts and stops machine', () => {
    const runtime = new ZagRuntime()
    const service = runtime.createMachine('select', { id: 'test' })

    runtime.startMachine(service)
    expect(service.getState().value).toBe('idle')

    runtime.stopMachine(service)
    expect(service.status).toBe('stopped')
  })

  it('binds DOM correctly', () => {
    const trigger = document.createElement('button')
    const api = select.connect(service, normalizeProps)

    runtime.bindSlot(trigger, api, 'Trigger')

    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox')
    expect(trigger.getAttribute('data-part')).toBe('trigger')
  })
})
```

### E2E Tests (Playwright)

```typescript
// src/__tests__/playwright/select.test.ts
test('Select keyboard navigation', async ({ page }) => {
  await page.goto('/preview')
  await page.fill('.editor', `
    Select placeholder "Wähle..."
      Item "Apple"
      Item "Banana"
  `)

  // Open select
  await page.click('[data-part="trigger"]')
  await expect(page.locator('[data-part="content"]')).toBeVisible()

  // Navigate with keyboard
  await page.keyboard.press('ArrowDown')
  await expect(page.locator('[data-highlighted]')).toHaveText('Apple')

  await page.keyboard.press('ArrowDown')
  await expect(page.locator('[data-highlighted]')).toHaveText('Banana')

  // Select with Enter
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-part="trigger"]')).toHaveText('Banana')
})
```

### Test-Matrix

| Test-Typ | Scope | Framework |
|----------|-------|-----------|
| Unit | Compiler, Slots, Styles | Vitest |
| Integration | Runtime, DOM Binding | Vitest + JSDOM |
| E2E | Full Preview Flow | Playwright |
| Accessibility | ARIA, Keyboard | axe-playwright |

### CI Pipeline

```yaml
test:
  - npm run test:unit        # Compiler & Runtime
  - npm run test:integration # DOM Bindings
  - npm run test:e2e         # Playwright
  - npm run test:a11y        # Accessibility
```

---

## Risiken & Mitigations

| Risiko | Mitigation |
|--------|------------|
| Zag API Changes | Wrapper-Layer, Version Pinning |
| Performance | Lazy Loading Machines, Code Splitting |
| Bundle Size | Tree Shaking, nur verwendete Machines |
| Komplexität | Klare Schichtentrennung, gute Tests |
| Koexistenz-Bugs | Feature Flags, schrittweise Rollout |
| Portal-Issues | Robustes Click-Handling, Fallbacks |
| Migration-Friction | Alias-Support, Migration-Tool |

## Metriken

| Metrik | Ziel |
|--------|------|
| Preview Compile Time | < 50ms |
| First Render | < 100ms |
| Bundle Size (Select) | < 20KB |
| Accessibility Score | 100% |

## Referenzen

- [Zag Documentation](https://zagjs.com/)
- [Zag GitHub](https://github.com/chakra-ui/zag)
- [ZAG-INTEGRATION.md](./ZAG-INTEGRATION.md)

### Mirror Syntax Dokumentation

- [Syntax-Referenz (51 Komponenten)](../../features/zag-components/syntax-reference.md) - Vollständige Syntax für alle Zag-Komponenten
- [Syntax-Übersicht](../../features/zag-components/syntax-overview.md) - Kurzübersicht der wichtigsten Patterns

### Feature-Dokumentation

- [Select Requirements](../../features/select/requirements.md)
- [Select Syntax](../../features/select/syntax.md)
- [Select Examples](../../features/select/examples.md)
