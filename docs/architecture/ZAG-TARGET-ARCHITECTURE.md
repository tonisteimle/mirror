# Zag Target Architecture

Zielarchitektur für die Integration von Zag als Behavior-Engine in Mirror.

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

Alle Zag-Komponenten folgen konsistenten Syntax-Patterns.

> **Vollständige Referenz:** [features/zag-components/syntax-overview.md](../../features/zag-components/syntax-overview.md)

### Übersicht

| Komponente | Pattern | Slots | Keywords |
|------------|---------|-------|----------|
| **Select** | Trigger + Content | Trigger, Content, Item, Icon, Pill | `multiple`, `searchable` |
| **Dialog** | Trigger + Content | Trigger, Backdrop, Content, Title, Close | `modal` |
| **Menu** | Trigger + Content | Trigger, Content, Item, Separator | - |
| **Tabs** | List + Item | TabList, Tab, TabPanel | `orientation` |
| **Accordion** | List + Item | AccordionItem, Trigger, Content | `collapsible`, `multiple` |
| **Tooltip** | Trigger + Content | Content, Arrow | `position`, `delay` |
| **Slider** | Track + Thumb | Track, Range, Thumb | `range` |
| **Checkbox** | Control + Indicator | Control, Indicator, Label | `indeterminate` |
| **RadioGroup** | List + Item | Radio, Control, Indicator | - |
| **Switch** | Track + Thumb | Track, Thumb, Label | - |
| **DatePicker** | Trigger + Content | Trigger, Content, Day, Header | `mode "range"` |
| **NumberInput** | Control | Input, DecrementButton, IncrementButton | `formatOptions` |
| **Popover** | Trigger + Content | Trigger, Content, Arrow | `position` |

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
```

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

```json
{
  "dependencies": {
    "@zag-js/core": "^1.x",
    "@zag-js/select": "^1.x",
    "@zag-js/combobox": "^1.x",
    "@zag-js/dialog": "^1.x",
    "@zag-js/menu": "^1.x",
    "@zag-js/tabs": "^1.x",
    "@zag-js/accordion": "^1.x",
    "@zag-js/tooltip": "^1.x",
    "@zag-js/popover": "^1.x",
    "@zag-js/slider": "^1.x",
    "@zag-js/number-input": "^1.x",
    "@zag-js/date-picker": "^1.x"
  }
}
```

## Implementierungs-Phasen

### Phase 1: Foundation

**Ziel:** Select-Komponente im Preview

```
□ Zag Dependencies installieren
□ Zag Runtime Basis (machine-runner, dom-binder)
□ Select Machine Integration
□ Slot Mapping für Select
□ Basic Styling (hover, selected)
□ Preview Integration
```

**Deliverable:** `Select` mit Items funktioniert im Preview

### Phase 2: Full Select

**Ziel:** Alle Select-Varianten

```
□ Multiple Selection
□ Searchable (Combobox Machine)
□ Grouped Items
□ Custom Item Content
□ Keyboard Navigation (automatisch via Zag)
□ Accessibility (automatisch via Zag)
```

**Deliverable:** Select feature-complete

### Phase 3: Export

**Ziel:** Production-ready Export

```
□ Vanilla JS + Zag Backend
□ React + Zag Backend
□ Export Dialog im Studio
□ Bundle Optimization
```

**Deliverable:** Exportierbare Projekte

### Phase 4: More Components

**Ziel:** Weitere Zag-Komponenten

```
□ Dialog / Modal
□ Menu / DropdownMenu
□ Tabs
□ Accordion
□ Tooltip
□ Slider
□ DatePicker
```

**Deliverable:** Umfangreiche Komponenten-Bibliothek

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
      slots: ['Box', 'Indicator', 'Label'],
      props: ['label', 'checked', 'disabled', 'required'],
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

```typescript
// Schrittweiser Rollout via Feature Flags
const FEATURE_FLAGS = {
  ZAG_SELECT: true,           // Phase 1
  ZAG_CHECKBOX: false,        // Phase 2
  ZAG_RADIO: false,           // Phase 2
  ZAG_DIALOG: false,          // Phase 3
  ZAG_TABS: false,            // Phase 4
  ZAG_DATEPICKER: false,      // Phase 5

  // Warnings
  DEPRECATION_WARNINGS: true,
  AUTO_MIGRATION: true,
}

function shouldUseZag(primitive: string): boolean {
  const flag = `ZAG_${primitive.toUpperCase()}`
  return FEATURE_FLAGS[flag] ?? false
}
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
- [Select Requirements](../../features/select/requirements.md)
