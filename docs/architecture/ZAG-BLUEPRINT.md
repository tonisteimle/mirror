# Zag Component Blueprint

Umfassende Anleitung zur Implementierung von Zag-Komponenten im Mirror-Projekt. Basierend auf der Select-Komponente als Referenzimplementierung.

---

## Inhaltsverzeichnis

0. [Zag.js Referenz & Workflow](#0-zagjs-referenz)
1. [Architektur-Überblick](#1-architektur-überblick)
2. [Schema-Definition (Single Source of Truth)](#2-schema-definition)
3. [Property Metadata (UI-Steuerung)](#3-property-metadata)
4. [Compiler/Backend (DOM-Generierung)](#4-compilerbackend)
5. [Runtime (Zag-Initialisierung)](#5-runtime)
6. [Property Panel (Studio-Integration)](#6-property-panel)
7. [CSS/Styling](#7-cssstyling)
7a. [Theme Tokens](#7a-theme-tokens) ✨ NEU
8. [Test-File Patterns](#8-test-file-patterns)
9. [Checkliste für neue Komponenten](#9-checkliste)
10. [Tabs: Vollständiges Mapping](#10-tabs-vollständiges-mapping-content-items-pattern)
11. [Kritische Learnings & Fehlerquellen](#11-kritische-learnings--fehlerquellen) ⚠️
12. [Slot-Customization in Mirror DSL](#12-slot-customization-in-mirror-dsl)
13. [Erweiterte Checkliste](#13-erweiterte-checkliste)

---

## 0. Zag.js Referenz & Workflow

### Zag.js Dokumentation als Quelle

**URL-Pattern:** `https://zagjs.com/components/react/{component-name}`

Für jede neue Komponente MUSS die Zag.js Dokumentation konsultiert werden, um:
1. Alle verfügbaren **Props/Options** zu erfassen
2. Alle **Slots/Parts** (data-part) zu identifizieren
3. Alle **Events/Callbacks** zu dokumentieren
4. Alle **Data-Attributes** für Styling zu kennen
5. Die **Keyboard-Interaktionen** zu verstehen

### Workflow für neue Komponenten

```
1. Zag.js Dokumentation lesen
   └─> https://zagjs.com/components/react/{name}

2. Props extrahieren → zag-primitives.ts (props[])

3. Slots extrahieren → zag-primitives.ts (slots[])
                     → SLOT_MAPPINGS

4. Events extrahieren → zag-primitives.ts (events[])

5. Data-Attributes → Runtime Styling + CSS

6. Keyboard-Support → Runtime Implementation
```

---

### Select: Vollständiges Zag → Mirror Mapping

#### Props (Zag → Mirror)

| Zag Prop | Mirror Prop | Typ | Beschreibung |
|----------|-------------|-----|--------------|
| `id` | (auto) | string | Automatisch generiert |
| `collection` | (auto) | - | Aus Items generiert |
| `name` | `name` | string | Form-Feldname |
| `form` | `form` | string | Form-ID |
| `multiple` | `multiple` | boolean | Mehrfachauswahl |
| `value` | `value` | string | Aktueller Wert |
| `defaultValue` | `defaultValue` | string | Initialwert |
| `deselectable` | `deselectable` | boolean | Abwählbar |
| `closeOnSelect` | `closeOnSelect` | boolean | Schließen nach Auswahl |
| `open` | `open` | boolean | Offen (controlled) |
| `defaultOpen` | `defaultOpen` | boolean | Initial offen |
| `loopFocus` | `loopFocus` | boolean | Zyklische Navigation |
| `positioning` | `placement` | enum | Positionierung |
| `disabled` | `disabled` | boolean | Deaktiviert |
| `invalid` | `invalid` | boolean | Ungültig |
| `readOnly` | `readonly` | boolean | Nur-Lesen |
| `required` | `required` | boolean | Pflichtfeld |
| - | `searchable` | boolean | **Mirror-Intent**: Such-Input |
| - | `clearable` | boolean | **Mirror-Intent**: Clear-Button |
| - | `keepOpen` | boolean | **Mirror-Intent**: Offen bleiben |
| - | `placeholder` | string | Platzhaltertext |
| - | `label` | string | Label-Text |
| - | `offset` | number | Dropdown-Abstand |

#### Slots (Zag data-part → Mirror data-slot)

| Zag Part | Mirror Slot | Element | API Method | Beschreibung |
|----------|-------------|---------|------------|--------------|
| `root` | (root) | div | - | Container |
| `label` | Label | label | `getLabelProps` | Label-Element |
| `trigger` | Trigger | button | `getTriggerProps` | Öffnen-Button |
| `value-text` | ValueText | span | `getValueTextProps` | Anzeige-Text |
| `indicator` | Indicator | span | `getIndicatorProps` | Chevron-Icon |
| `positioner` | (auto) | div | `getPositionerProps` | Positionierung |
| `content` | Content | div | `getContentProps` | Dropdown-Menu |
| `item` | Item | div | `getItemProps` | Einzelnes Item |
| `item-text` | ItemText | span | `getItemTextProps` | Item-Text |
| `item-indicator` | ItemIndicator | span | `getItemIndicatorProps` | Checkmark |
| `item-group` | Group | div | `getItemGroupProps` | Item-Gruppe |
| `item-group-label` | GroupLabel | span | `getItemGroupLabelProps` | Gruppen-Label |
| `clear-trigger` | ClearButton | button | `getClearTriggerProps` | Clear-Button |
| - | Input | input | - | **Mirror**: Such-Input |
| - | Empty | div | - | **Mirror**: Keine Ergebnisse |
| - | Pill | span | - | **Mirror**: Multi-Tag |
| - | PillRemove | button | - | **Mirror**: Tag entfernen |

#### Events (Zag → Mirror)

| Zag Callback | Mirror Event | Detail |
|--------------|--------------|--------|
| `onValueChange` | `onchange` | `{ value, previousValue }` |
| `onOpenChange` | `onopen` / `onclose` | `{ value }` |
| `onHighlightChange` | `onhighlightchange` | `{ highlightedValue }` |
| `onSelect` | `onselect` | `{ value }` |

#### Data-Attributes (Styling)

| Zag Attribute | CSS Selector | Zustand |
|---------------|--------------|---------|
| `data-state="open"` | `[data-state="open"]` | Dropdown offen |
| `data-state="closed"` | `[data-state="closed"]` | Dropdown geschlossen |
| `data-state="checked"` | `[data-state="checked"]` | Item ausgewählt |
| `data-highlighted` | `[data-highlighted]` | Item hervorgehoben |
| `data-disabled` | `[data-disabled]` | Deaktiviert |
| `data-invalid` | `[data-invalid]` | Ungültig |
| `data-readonly` | `[data-readonly]` | Nur-Lesen |
| `data-placeholder-shown` | `[data-placeholder-shown]` | Kein Wert |

#### Keyboard-Support

| Taste | Trigger (geschlossen) | Content (offen) |
|-------|----------------------|-----------------|
| `Space` | Öffnen | Item auswählen |
| `Enter` | Öffnen | Item auswählen |
| `ArrowDown` | Öffnen | Nächstes Item |
| `ArrowUp` | Öffnen | Vorheriges Item |
| `Escape` | - | Schließen |
| `Tab` | - | Schließen + Focus weiter |
| `A-Z` | - | Typeahead (erstes Match) |
| `Home` | - | Erstes Item |
| `End` | - | Letztes Item |

---

## 1. Architektur-Überblick

### Datenfluss

```
DSL SOURCE CODE
      │
      ▼
┌─────────────┐
│ LEXER/PARSER │
└─────────────┘
      │
      ▼
┌─────────────┐
│     AST     │ ─── Zag Detection: isZagPrimitive(name)
└─────────────┘
      │
      ▼
┌─────────────┐
│ IR TRANSFORMER │
├─────────────┤
│ • Slot Transformation     │
│ • Item Transformation     │
│ • Machine Config Building │
└─────────────┘
      │
      ▼
┌─────────────┐
│  IRZagNode  │
├─────────────┤
│ zagType     │ → 'select'
│ slots       │ → { Trigger, Content, ... }
│ items       │ → [ {value, label, children}, ... ]
│ machineConfig │ → { searchable, clearable, ... }
└─────────────┘
      │
      ▼
┌─────────────┐
│ DOM BACKEND │
├─────────────┤
│ • Create root div                │
│ • Store _zagConfig on element    │
│ • Create slot elements           │
│ • Render items into Content slot │
│ • Call _runtime.initZagComponent │
└─────────────┘
      │
      ▼
┌─────────────┐
│ JAVASCRIPT  │ → function createUI() { ... }
└─────────────┘
      │
      ▼
┌─────────────┐
│   RUNTIME   │
├─────────────┤
│ • Create Zag machine             │
│ • Apply slot props               │
│ • Bind item click handlers       │
│ • Subscribe to state changes     │
└─────────────┘
      │
      ▼
┌─────────────┐
│ INTERACTIVE │ → Select mit Keyboard, Click, States
│     DOM     │
└─────────────┘
```

### Beteiligte Dateien

| Datei | Zweck |
|-------|-------|
| `src/schema/zag-primitives.ts` | Komponentendefinition (Slots, Props, Events) |
| `src/schema/zag-prop-metadata.ts` | UI-Metadata für Property Panel |
| `src/backends/dom.ts` | DOM-Code-Generierung |
| `src/runtime/dom-runtime-string.ts` | Runtime-Implementierung |
| `studio/panels/property-panel.ts` | Property Panel Integration |
| `studio/panels/property/ui-renderer.ts` | Behavior Section Rendering |

---

## 2. Schema-Definition

**Datei:** `src/schema/zag-primitives.ts`

### 2.1 ZagPrimitiveDef

Jede Zag-Komponente wird durch ein `ZagPrimitiveDef` definiert:

```typescript
export interface ZagPrimitiveDef {
  /** Zag machine name (z.B. 'select', 'accordion') */
  machine: string

  /** Verfügbare Slots für Komposition */
  slots: string[]

  /** Komponenten-spezifische Properties */
  props: string[]

  /** Komponenten-spezifische Events */
  events?: string[]

  /** Beschreibung für Dokumentation */
  description?: string

  /** Pattern-Typ für Syntax-Handling */
  pattern?: 'slots-only' | 'simple-items' | 'content-items' | 'repeating-items' | 'complex-nested'

  /** Item-Keywords (Default: ['Item']) */
  itemKeywords?: string[]
}
```

### 2.2 Select-Definition (Referenz)

```typescript
Select: {
  machine: 'select',
  slots: [
    'Trigger',        // Button der das Dropdown öffnet
    'Content',        // Dropdown-Container
    'Item',           // Einzelnes Item
    'ItemIndicator',  // Checkmark/Checkbox
    'Group',          // Item-Gruppe
    'GroupLabel',     // Gruppen-Überschrift
    'Input',          // Such-Input (searchable)
    'Empty',          // "Keine Ergebnisse" Anzeige
    'Pill',           // Tag für Multi-Select
    'PillRemove',     // X-Button zum Entfernen
    'ClearButton',    // Clear-All Button
  ],
  props: [
    // Value Management
    'value', 'defaultValue', 'placeholder',

    // Core Behavior (Zag-native)
    'multiple', 'disabled', 'readOnly', 'required', 'invalid',
    'loopFocus', 'deselectable', 'closeOnSelect', 'typeahead',

    // Open State
    'open', 'defaultOpen',

    // Highlighted State
    'highlightedValue', 'defaultHighlightedValue',

    // Positioning
    'positioning',

    // Form Integration
    'name', 'form',

    // Advanced
    'composite',

    // Intent-oriented Props (Designer-freundlich)
    'searchable',   // Aktiviert Such-Input
    'clearable',    // Aktiviert Clear-Button
    'keepOpen',     // Bleibt nach Auswahl offen
  ],
  events: ['onchange', 'onopen', 'onclose', 'onhighlightchange', 'onselect'],
  description: 'Dropdown select with keyboard navigation',
  pattern: 'simple-items',  // Items sind einfache Listen
  itemKeywords: ['Item', 'Option'],  // Alternative Keywords
},
```

### 2.3 Slot-Mappings (ZagSlotDef)

Jeder Slot muss auf seine Zag-API-Methode und HTML-Element gemappt werden:

```typescript
export interface ZagSlotDef {
  /** API method (z.B. 'getTriggerProps') */
  api: string

  /** Default HTML element */
  element: string

  /** Soll in Portal gerendert werden? */
  portal?: boolean

  /** Gebunden an Item-Iteration? */
  itemBound?: boolean
}

// Beispiel: Select Slot-Mappings
Select: {
  Trigger: { api: 'getTriggerProps', element: 'button' },
  Content: { api: 'getContentProps', element: 'div', portal: true },
  Item: { api: 'getItemProps', element: 'div', itemBound: true },
  ItemIndicator: { api: 'getItemIndicatorProps', element: 'span', itemBound: true },
  Group: { api: 'getGroupProps', element: 'div' },
  GroupLabel: { api: 'getLabelProps', element: 'span' },
  Input: { api: 'getInputProps', element: 'input' },
  Empty: { api: 'getEmptyProps', element: 'div' },
  Pill: { api: 'getPillProps', element: 'span', itemBound: true },
  PillRemove: { api: 'getPillRemoveProps', element: 'button', itemBound: true },
  ClearButton: { api: 'getClearButtonProps', element: 'button' },
},
```

### 2.4 Pattern-Typen

| Pattern | Verwendung | Beispiele |
|---------|------------|-----------|
| `slots-only` | Keine Items, nur Slots | Dialog, Tooltip, Switch |
| `simple-items` | Einfache Item-Liste | Select, Menu, Listbox |
| `content-items` | Items mit Content-Panels | Tabs, Accordion |
| `repeating-items` | Items werden für Collection wiederholt | RadioGroup, PinInput |
| `complex-nested` | Verschachtelte Strukturen | TreeView, DatePicker |

---

## 3. Property Metadata

**Datei:** `src/schema/zag-prop-metadata.ts`

Diese Metadata steuert wie Properties im Property Panel dargestellt werden.

### 3.1 ZagPropMeta Interface

```typescript
export type ZagPropType = 'boolean' | 'string' | 'number' | 'enum'

export interface ZagPropMeta {
  type: ZagPropType
  label: string
  description: string
  options?: string[]      // für enum
  default?: string | number | boolean
  min?: number           // für number
  max?: number           // für number
  step?: number          // für number
}
```

### 3.2 Select Metadata (Referenz)

```typescript
Select: {
  // String-Property: Input-Feld
  placeholder: {
    type: 'string',
    label: 'Placeholder',
    description: 'Text shown when nothing selected',
  },

  // Boolean-Properties: Toggle-Chips
  multiple: {
    type: 'boolean',
    label: 'Multiple',
    description: 'Allow selecting multiple items',
  },
  searchable: {
    type: 'boolean',
    label: 'Searchable',
    description: 'Enable search/filter input',
  },
  clearable: {
    type: 'boolean',
    label: 'Clearable',
    description: 'Show clear button to reset selection',
  },
  disabled: {
    type: 'boolean',
    label: 'Disabled',
    description: 'Disable interaction',
  },
  required: {
    type: 'boolean',
    label: 'Required',
    description: 'Mark as required field',
  },
},
```

### 3.3 UI-Rendering nach Typ

| Typ | UI-Element | Beispiel |
|-----|------------|----------|
| `boolean` | Toggle-Chip | `[Multiple] [Searchable] [Clearable]` |
| `string` | Text-Input | Placeholder: `[____________]` |
| `number` | Number-Input mit min/max/step | `[10] ▲▼` |
| `enum` | Dropdown-Select | Position: `[bottom-start ▼]` |

---

## 4. Compiler/Backend

**Datei:** `src/backends/dom.ts`

### 4.1 Zag-Component Erkennung

```typescript
// In emitNode():
if (isIRZagNode(node)) {
  this.emitZagComponent(node, parentVar)
  return
}
```

### 4.2 emitZagComponent (Zeilen 580-668)

```typescript
private emitZagComponent(node: IRZagNode, parentVar: string): void {
  const varName = this.sanitizeVarName(node.id)

  // 1. Root-Element erstellen
  this.emit(`const ${varName} = document.createElement('div')`)
  this.emit(`${varName}.dataset.zagComponent = '${node.zagType}'`)

  // 2. _zagConfig speichern (für Runtime)
  this.emit(`${varName}._zagConfig = {`)
  this.emit(`  type: '${node.zagType}',`)
  this.emit(`  id: '${node.id}',`)
  this.emit(`  machineConfig: ${JSON.stringify(node.machineConfig)},`)
  this.emit(`  slots: { ... },`)
  this.emit(`  items: ${JSON.stringify(node.items)},`)
  this.emit(`}`)

  // 3. Slot-Elemente erstellen
  for (const [slotName, slot] of Object.entries(node.slots)) {
    this.emit(`const ${slotVar} = document.createElement('${slot.element}')`)
    this.emit(`${slotVar}.dataset.slot = '${slotName}'`)
    // Styles anwenden wenn vorhanden
    if (slot.styles.length > 0) {
      this.emit(`${slotVar}.setAttribute('data-styled', 'true')`)
      // ... styles
    }
    this.emit(`${varName}.appendChild(${slotVar})`)
  }

  // 4. Items rendern
  if (node.items.length > 0) {
    this.emitZagItems(node.items, varName, contentSlotVar)
  }

  // 5. Runtime initialisieren
  this.emit(`_runtime.initZagComponent(${varName})`)
}
```

### 4.3 emitZagItems (Zeilen 673-768)

Items können einfach (nur Label) oder komplex (mit Children) sein:

```typescript
private emitZagItems(items, varNamePrefix, parentVar): void {
  for (const item of items) {
    if (item.isGroup) {
      // GROUP: Container + Label + rekursive Items
      this.emit(`${groupVar}.dataset.slot = 'Group'`)
      if (item.label) {
        // GroupLabel erstellen
      }
      this.emitZagItems(item.items, ..., groupVar)
    } else {
      // ITEM: Container mit value-Attribut
      this.emit(`${itemVar}.dataset.mirrorItem = '${item.value}'`)

      // Layout-Properties (ver, hor, gap, pad, spread, center)
      if (item.properties) {
        for (const prop of item.properties) {
          // Styles anwenden
        }
      }

      // Children oder Label-Text
      if (item.children?.length > 0) {
        for (const child of item.children) {
          this.emitNode(child, itemVar)
        }
      } else {
        this.emit(`${itemVar}.textContent = '${item.label}'`)
      }
    }
  }
}
```

---

## 5. Runtime

**Datei:** `src/runtime/dom-runtime-string.ts`

Die Runtime ist ein eingebetteter JavaScript-String, der zur Laufzeit ausgeführt wird.

### 5.1 initZagComponent (Zeilen 444-1157)

```javascript
initZagComponent(el) {
  const config = el._zagConfig
  const trigger = el.querySelector('[data-slot="Trigger"]')
  const content = el.querySelector('[data-slot="Content"]')

  // 1. Initiale State
  el._zagState = { open: false, value: [], highlightedIndex: -1 }

  // 2. Config-Werte extrahieren
  const isMultiple = config.machineConfig?.multiple
  const isSearchable = config.machineConfig?.searchable
  const isClearable = config.machineConfig?.clearable
  const placeholder = config.machineConfig?.placeholder
  // ...

  // 3. Default-Styling (wenn nicht data-styled)
  if (!trigger.hasAttribute('data-styled')) {
    Object.assign(trigger.style, { /* ... */ })
  }

  // 4. Trigger-Elemente erstellen (ValueText, Indicator)
  let triggerText = trigger.querySelector('[data-slot="ValueText"]')
  if (!triggerText) {
    triggerText = document.createElement('span')
    // ...
  }

  // 5. Item-Indicators erstellen (Checkmark/Checkbox)
  items.forEach(item => {
    if (isMultiple) {
      // Checkbox-Style
    } else {
      // Checkmark-Style
    }
  })

  // 6. Optional: Search Input
  if (isSearchable) {
    // Input erstellen + Filter-Logic
  }

  // 7. Optional: Clear Button
  if (isClearable) {
    // Clear Button erstellen + Event
  }

  // 8. Trigger-Click-Handler
  trigger.addEventListener('click', (e) => {
    el._zagState.open = !el._zagState.open
    // Open/Close Animation
    // Dispatch open/close Events
    // Auto-Flip für Positioning
  })

  // 9. Click-Outside-Handler
  document.addEventListener('click', (e) => {
    if (el._zagState.open && !el.contains(e.target)) {
      // Close
    }
  })

  // 10. Item-Interactions
  items.forEach((item, index) => {
    item.addEventListener('click', (e) => {
      // Single/Multiple Select Logic
      // Update State
      // Fire change Event
    })

    item.addEventListener('mouseenter', () => {
      // Highlight
    })
  })

  // 11. Keyboard Navigation
  el.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown': // Next
      case 'ArrowUp':   // Prev
      case 'Enter':     // Select
      case 'Escape':    // Close
    }
  })

  // 12. Accessibility
  trigger.setAttribute('role', 'combobox')
  trigger.setAttribute('aria-haspopup', 'listbox')
  content.setAttribute('role', 'listbox')
}
```

### 5.2 Highlight-Update

```javascript
_updateZagHighlight(el, items) {
  items.forEach((item, i) => {
    if (i === el._zagState.highlightedIndex) {
      item.setAttribute('data-highlighted', 'true')
      item.style.background = '#252525'
    } else {
      item.removeAttribute('data-highlighted')
      item.style.background = ''
    }
  })
}
```

### 5.3 Events dispatchen

```javascript
// Standard-Events die gefeuert werden:
el.dispatchEvent(new CustomEvent('open', { detail: { value } }))
el.dispatchEvent(new CustomEvent('close', { detail: { value } }))
el.dispatchEvent(new CustomEvent('change', {
  detail: { value: newValue, previousValue },
  bubbles: true
}))
```

---

## 6. Property Panel

**Dateien:**
- `studio/panels/property-panel.ts` - Haupt-Panel mit renderBehaviorSection
- `src/studio/property-extractor.ts` - Property-Extraktion & Kategorisierung
- `src/schema/zag-prop-metadata.ts` - Metadata für Zag-Props

### 6.1 Design-Prinzipien

#### Prinzip 1: Nur wichtige Properties

Die Metadata in `zag-prop-metadata.ts` definiert welche Props im Panel erscheinen.
Zusätzlich werden bestimmte Props im Panel explizit ausgeschlossen:

```typescript
// property-panel.ts, Zeile 1772
const excludedProps = ['clearable', 'disabled', 'required']
const filteredProps = props.filter(p => !excludedProps.includes(p.name))
```

#### Prinzip 2: Behavior-Kategorie ZUOBERST

```typescript
// property-panel.ts, Zeile 459-462
// Render behavior section FIRST (for Zag components)
if (behaviorCat && behaviorCat.properties.length > 0) {
  result += this.renderBehaviorSection(behaviorCat)
}

// Danach folgen:
// - Layout (mit Alignment und Position)
// - Sizing
// - Spacing
// - Border
// - Color
// - Typography
```

#### Prinzip 3: Konsistente UI-Komponenten

Die gleichen Komponenten wie im Rest des Studios:

| Prop-Typ | UI-Komponente | Beispiel |
|----------|---------------|----------|
| `string` | `<input type="text">` | Placeholder |
| `select` (enum) | `<select>` Dropdown | Placement |
| `boolean` | Toggle-Button mit ✓ | Multiple, Searchable |

### 6.2 renderBehaviorSection (Zeile 1767-1842)

```typescript
private renderBehaviorSection(category: PropertyCategory): string {
  const props = category.properties

  // 1. Bestimmte Props ausschließen
  const excludedProps = ['clearable', 'disabled', 'required']
  const filteredProps = props.filter(p => !excludedProps.includes(p.name))

  // 2. Props nach Typ gruppieren
  const booleans = filteredProps.filter(p => p.type === 'boolean')
  const selects = filteredProps.filter(p => p.type === 'select' && p.options?.length > 0)
  const others = filteredProps.filter(p => p.type !== 'boolean' &&
                                           !(p.type === 'select' && p.options?.length > 0))

  // 3. Select-Dropdowns rendern
  const selectRows = selects.map(prop => `
    <div class="prop-row">
      <span class="prop-label">${prop.label || prop.name}</span>
      <div class="prop-content">
        <select class="prop-select" data-behavior-select="${prop.name}">
          <option value="">-</option>
          ${prop.options.map(opt =>
            `<option value="${opt}" ${prop.value === opt ? 'selected' : ''}>${opt}</option>`
          ).join('')}
        </select>
      </div>
    </div>
  `).join('')

  // 4. String/Number-Inputs rendern
  const otherRows = others.map(prop => `
    <div class="prop-row">
      <span class="prop-label">${prop.label || prop.name}</span>
      <div class="prop-content">
        <input type="text" class="prop-input" value="${prop.value || ''}"
               data-behavior-input="${prop.name}" placeholder="${prop.type === 'number' ? '0' : ''}">
      </div>
    </div>
  `).join('')

  // 5. Boolean-Toggles rendern (einzelne Zeilen mit Checkbox-Icon)
  const booleanRows = booleans.map(prop => {
    const isActive = prop.value === 'true' || (prop.value === '' && prop.hasValue !== false)
    return `
      <div class="prop-row">
        <span class="prop-label">${prop.label || prop.name}</span>
        <div class="prop-content">
          <button class="toggle-btn single ${isActive ? 'active' : ''}"
                  data-behavior-toggle="${prop.name}">
            <svg class="icon" viewBox="0 0 14 14">
              ${isActive ? '<path d="M11 4L6 10L3 7" stroke="currentColor" stroke-width="2" fill="none"/>' : ''}
            </svg>
          </button>
        </div>
      </div>
    `
  }).join('')

  // 6. Reihenfolge: Others → Selects → Booleans
  return `
    <div class="section">
      <div class="section-label">Behavior</div>
      <div class="section-content">
        ${otherRows}
        ${selectRows}
        ${booleanRows}
      </div>
    </div>
  `
}
```

### 6.3 Reihenfolge innerhalb Behavior-Section

| Position | Typ | Beispiel |
|----------|-----|----------|
| 1. | String/Number Inputs | `Placeholder: [____________]` |
| 2. | Select Dropdowns | `Placement: [bottom-start ▼]` |
| 3. | Boolean Toggles | `Multiple: [✓]`, `Searchable: [✓]` |

### 6.4 Property Metadata (zag-prop-metadata.ts)

```typescript
Select: {
  placeholder: {
    type: 'string',
    label: 'Placeholder',
    description: 'Text shown when nothing selected',
  },
  multiple: {
    type: 'boolean',
    label: 'Multiple',
    description: 'Allow selecting multiple items',
  },
  searchable: {
    type: 'boolean',
    label: 'Searchable',
    description: 'Enable search/filter input',
  },
  disabled: {
    type: 'boolean',
    label: 'Disabled',
    description: 'Disable interaction',
  },
  required: {
    type: 'boolean',
    label: 'Required',
    description: 'Mark as required field',
  },
}
```

### 6.5 Resultierende UI

```
┌─────────────────────────────────────┐
│ Select                              │
├─────────────────────────────────────┤
│ Behavior                            │  ← Zuoberst
│ ┌─────────────────────────────────┐ │
│ │ Placeholder  [Farbe wählen...] │ │  ← String-Input (zuerst)
│ ├─────────────────────────────────┤ │
│ │ Multiple     [✓]               │ │  ← Boolean-Toggle (zuletzt)
│ │ Searchable   [ ]               │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Layout                              │
│ ...                                 │
├─────────────────────────────────────┤
│ Size                                │
│ ...                                 │
└─────────────────────────────────────┘
```

### 6.6 Event Handler

```typescript
// property-panel.ts, Zeile 2585-2600
// Behavior toggle buttons
const behaviorToggles = this.container.querySelectorAll('[data-behavior-toggle]')
behaviorToggles.forEach(toggle => {
  toggle.addEventListener('click', (e) => this.handleBehaviorToggle(e))
})

// Behavior select dropdowns
const behaviorSelects = this.container.querySelectorAll('[data-behavior-select]')
behaviorSelects.forEach(select => {
  select.addEventListener('change', (e) => this.handleBehaviorSelect(e))
})

// Behavior text/number inputs
const behaviorInputs = this.container.querySelectorAll('[data-behavior-input]')
behaviorInputs.forEach(input => {
  input.addEventListener('change', (e) => this.handleBehaviorInput(e))
})
```

---

## 7. CSS/Styling

### 7.1 Default-Styles in Runtime

Die Runtime wendet Default-Styles an, WENN das Element nicht `data-styled="true"` hat:

```javascript
// Trigger
if (!trigger.hasAttribute('data-styled')) {
  Object.assign(trigger.style, {
    background: '#1a1a1a',
    padding: '7px 10px',
    borderRadius: '5px',
    height: '34px',
    border: '1px solid #333',
    minWidth: '160px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#e0e0e0',
  })
}
```

### 7.2 State-Selektoren (Zag Data Attributes)

```typescript
// src/schema/zag-primitives.ts: STATE_MAPPINGS
'hover:': '[data-highlighted]',
'selected:': '[data-state="checked"]',
'highlighted:': '[data-highlighted]',
'disabled:': '[data-disabled]',
'open:': '[data-state="open"]',
'closed:': '[data-state="closed"]',
```

### 7.3 Placement-basiertes Styling

```javascript
// Auto-flip basierend auf verfügbarem Platz
if (spaceBelow < contentHeight && spaceAbove > spaceBelow) {
  content.style.bottom = '100%'
  content.style.marginBottom = offset + 'px'
  content.dataset.placement = 'top-start'
} else {
  content.style.top = '100%'
  content.style.marginTop = offset + 'px'
  content.dataset.placement = 'bottom-start'
}
```

---

## 7a. Theme Tokens

Zag-Komponenten nutzen CSS Custom Properties für konsistentes Styling. Diese Tokens können vom User über Mirror DSL überschrieben werden.

### 7a.1 Konzept

```
┌─────────────────────────────────────────────────────────────────┐
│  Mirror DSL (User Code)                                         │
│                                                                 │
│  primary: #ff6600                                               │
│  surface: #1a1a23                                               │
│  radius: 8                                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  theme-generator.ts                                             │
│                                                                 │
│  generateTheme(tokens) → {                                      │
│    --m-primary: #ff6600                                         │
│    --m-primary-hover: #e65c00    ← auto darkened 10%            │
│    --m-primary-active: #cc5200   ← auto darkened 15%            │
│    --m-surface: #1a1a23                                         │
│    --m-surface-hover: #252530    ← auto lightened 5%            │
│    --m-radius: 8px                                              │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Zag Components (Select, Tabs, etc.)                            │
│                                                                 │
│  background: var(--m-surface);                                  │
│  border-radius: var(--m-radius);                                │
│  &:hover { background: var(--m-surface-hover); }                │
└─────────────────────────────────────────────────────────────────┘
```

### 7a.2 Verfügbare Theme Tokens

**Dateien:**
- `src/schema/component-tokens.ts` - Token-Definitionen
- `src/schema/color-utils.ts` - Farbtransformationen
- `src/schema/theme-generator.ts` - CSS-Generierung

#### Farben

| User Token | Generierte CSS Vars | Beschreibung |
|------------|---------------------|--------------|
| `primary` | `--m-primary`, `--m-primary-hover`, `--m-primary-active` | Akzentfarbe |
| `surface` | `--m-surface`, `--m-surface-hover`, `--m-surface-active`, `--m-surface-selected` | Hintergründe |
| `text` | `--m-text`, `--m-text-muted`, `--m-text-placeholder` | Textfarben |
| `error` | `--m-error` | Fehlerfarbe |
| `success` | `--m-success` | Erfolgsfarbe |
| `warning` | `--m-warning` | Warnfarbe |

#### Spacing

| User Token | CSS Var | Beschreibung |
|------------|---------|--------------|
| `spacing` | `--m-spacing` | Basis-Einheit (Default: 4px) |
| `gap` | `--m-gap` | Element-Abstand (Default: 8px) |
| `pad` | `--m-pad` | Padding (Default: 8px) |
| `pad-x` | `--m-pad-x` | Horizontales Padding (Default: 12px) |
| `pad-y` | `--m-pad-y` | Vertikales Padding (Default: 8px) |

#### Sizing

| User Token | CSS Var | Beschreibung |
|------------|---------|--------------|
| `control-height` | `--m-control-h` | Höhe von Buttons/Inputs (Default: 36px) |
| `item-height` | `--m-item-h` | Höhe von Dropdown-Items (Default: 32px) |
| `icon-size` | `--m-icon` | Icon-Größe (Default: 16px) |

#### Border

| User Token | CSS Var | Beschreibung |
|------------|---------|--------------|
| `radius` | `--m-radius`, `--m-radius-sm`, `--m-radius-lg` | Border-Radii |
| `border-width` | `--m-border` | Border-Breite |

#### Typography

| User Token | CSS Var | Beschreibung |
|------------|---------|--------------|
| `font` | `--m-font` | Font-Family |
| `font-size` | `--m-font-size`, `--m-font-size-sm` | Schriftgrößen |
| `line-height` | `--m-line-height` | Zeilenhöhe |

### 7a.3 Verwendung in CSS

Alle Zag-Komponenten-Styles in `assets/mirror-defaults.css` nutzen diese Tokens:

```css
[data-zag-component="select"] [data-slot="Trigger"] {
  padding: var(--m-pad-y) var(--m-pad-x);
  background: var(--m-surface);
  color: var(--m-text);
  border-radius: var(--m-radius);
}

[data-zag-component="select"] [data-slot="Trigger"]:hover {
  background: var(--m-surface-hover);
}

[data-mirror-item][data-selected="true"] {
  background: var(--m-surface-selected);
}
```

### 7a.4 User Override Beispiel

```mirror
// Design Tokens - User definiert nur was abweicht
primary: #22c55e          // Grün statt Blau
surface: #0a0a0f          // Dunklerer Hintergrund
radius: 12                // Rundere Ecken
control-height: 40        // Größere Controls

// Komponenten nutzen automatisch die Tokens
Select placeholder "Status wählen..."
  Item "Online"
  Item "Offline"
```

### 7a.5 Auto-Generierung von Varianten

Der `theme-generator.ts` berechnet Hover/Active-Varianten automatisch:

| Basis-Token | Generierte Variante | Transformation |
|-------------|---------------------|----------------|
| `primary` | `primary-hover` | 10% dunkler |
| `primary` | `primary-active` | 15% dunkler |
| `surface` | `surface-hover` | 5% heller |
| `surface` | `surface-active` | 8% heller |
| `surface` | `surface-selected` | 12% heller |
| `text` | `text-muted` | 35% dunkler |
| `text` | `text-placeholder` | 55% dunkler |
| `radius` | `radius-sm` | × 0.66 |
| `radius` | `radius-lg` | × 1.33 |

### 7a.6 Integration in Compiler

Der DOM-Backend generiert Theme-CSS automatisch wenn User Theme-Tokens definiert:

```typescript
// src/backends/dom.ts
private emitStyles(): void {
  // Theme Tokens generieren
  const themeTokens = this.astTokens.filter(t => isThemeToken(t.name))
  if (themeTokens.length > 0) {
    const theme = generateTheme(themeTokens)
    this.emitRaw(theme.css)
  }
  // ... rest
}
```

### 7a.7 Checkliste für neue Komponenten

Bei neuen Zag-Komponenten:

- [ ] **CSS mit Theme-Tokens schreiben:**
  - [ ] Backgrounds: `var(--m-surface)`, `var(--m-surface-hover)`
  - [ ] Text: `var(--m-text)`, `var(--m-text-muted)`
  - [ ] Akzente: `var(--m-primary)`, `var(--m-primary-hover)`
  - [ ] Spacing: `var(--m-pad-y)`, `var(--m-pad-x)`, `var(--m-gap)`
  - [ ] Sizing: `var(--m-control-h)`, `var(--m-item-h)`
  - [ ] Border: `var(--m-radius)`, `var(--m-border)`

- [ ] **CSS-Selektoren scopen:**
  ```css
  [data-zag-component="componentname"] [data-slot="SlotName"] {
    background: var(--m-surface);
  }
  ```

- [ ] **Defaults in `mirror-defaults.css` hinzufügen**

---

## 8. Test-File Patterns

**Datei:** `test/compiler-test.html`

### 8.1 Basic Properties

```mirror
# Placeholder
Select placeholder "Farbe wählen..."
  Item "Rot"
  Item "Grün"
  Item "Blau"

# Pre-selected Value
Select value "DE"
  Item "Deutschland" value "DE"
  Item "Österreich" value "AT"
```

### 8.2 Behavior Flags

```mirror
# Multiple Selection
Select multiple, placeholder "Farben wählen..."
  Item "Rot"
  Item "Grün"

# Searchable
Select searchable, placeholder "Land suchen..."
  Item "Afghanistan"
  Item "Albanien"

# Clearable
Select clearable, value "Option A"
  Item "Option A"
  Item "Option B"

# Kombiniert
Select multiple, searchable, clearable, placeholder "Suche..."
  Item "React"
  Item "Vue"
```

### 8.3 Custom Items

```mirror
# Zweizeilig (vertical layout)
Select placeholder "Plan wählen..."
  Item value "free", ver, gap 2, pad 12 14:
    Text "Free" weight medium
    Text "Für Einzelpersonen" fs 12, col #666

# Mit Icons
Select placeholder "Status wählen..."
  Item value "draft"
    Icon "file-text" col #888
    Text "Entwurf"

# Status-Indicator
Select value "online"
  Item value "online": Box w 8, h 8, rad 4, bg #22c55e, Text "Online"
  Item value "away": Box w 8, h 8, rad 4, bg #eab308, Text "Abwesend"

# Mit Shortcuts (spread layout)
Select placeholder "Aktionen..."
  Item value "save" spread:
    Box hor, gap 8: Icon "save", Text "Speichern"
    Text "⌘S" fs 11, col #666
```

### 8.4 Groups

```mirror
Select placeholder "Kategorie wählen..."
  Group "Obst"
    Item "Apfel"
    Item "Birne"
  Group "Gemüse"
    Item "Karotte"
    Item "Gurke"
```

---

## 9. Checkliste für neue Komponenten

### Phase 0: Zag.js Recherche (WICHTIG!)

- [ ] **Zag.js Dokumentation lesen**
  - [ ] URL: `https://zagjs.com/components/react/{component-name}`
  - [ ] Alle Props/Options notieren
  - [ ] Alle Slots/Parts (data-part) notieren
  - [ ] Alle Events/Callbacks notieren
  - [ ] Alle Data-Attributes für Styling notieren
  - [ ] Keyboard-Interaktionen dokumentieren

- [ ] **Mapping-Tabelle erstellen** (wie in Abschnitt 0)
  - [ ] Zag Props → Mirror Props
  - [ ] Zag Parts → Mirror Slots
  - [ ] Zag Callbacks → Mirror Events
  - [ ] Intent-Props identifizieren (searchable, clearable, etc.)

### Phase 1: Schema

- [ ] **ZagPrimitiveDef** in `src/schema/zag-primitives.ts` definieren
  - [ ] `machine`: Zag-Machine-Name
  - [ ] `slots`: Alle Slots aus Zag Parts + Mirror-eigene
  - [ ] `props`: Alle Props aus Zag + Intent-Props
  - [ ] `events`: Alle Events aus Zag Callbacks
  - [ ] `pattern`: Pattern-Typ wählen
  - [ ] `itemKeywords`: Alternative Item-Namen (optional)

- [ ] **SLOT_MAPPINGS** hinzufügen
  - [ ] Jeder Slot → `api` (Zag getXxxProps), `element`, `portal?`, `itemBound?`

### Phase 2: Property Metadata

- [ ] **ZAG_PROP_METADATA** in `src/schema/zag-prop-metadata.ts`
  - [ ] Alle benutzerrelevanten Props (aus Zag + Intent)
  - [ ] `type`, `label`, `description`
  - [ ] `options` für enums (z.B. placement)
  - [ ] `default`, `min`, `max`, `step` für numbers

### Phase 3: Compiler

- [ ] **IR Transformation** (falls spezielle Logik nötig)
  - [ ] `src/ir/index.ts` oder eigener Transformer

- [ ] **emitZagComponent** erweitern (falls nötig)
  - [ ] Spezielle Slot-Generierung
  - [ ] Spezielle Item-Struktur

### Phase 4: Runtime

- [ ] **initZagComponent** erweitern in `src/runtime/dom-runtime-string.ts`
  - [ ] Komponenten-spezifische Initialisierung
  - [ ] State-Management (`el._zagState`)
  - [ ] Default-Styling (wenn nicht data-styled)
  - [ ] Event-Binding für alle Slots
  - [ ] Keyboard-Navigation (ALLE Tasten aus Zag-Doku!)
  - [ ] Accessibility-Attribute (role, aria-*)
  - [ ] Data-Attributes setzen (data-state, data-highlighted, etc.)

### Phase 5: CSS/Styling

- [ ] **Theme-Tokens verwenden** (siehe Abschnitt 7a)
  - [ ] Backgrounds: `var(--m-surface)`, `var(--m-surface-hover)`
  - [ ] Text: `var(--m-text)`, `var(--m-text-muted)`
  - [ ] Akzente: `var(--m-primary)`, `var(--m-primary-hover)`
  - [ ] Spacing: `var(--m-pad-y)`, `var(--m-pad-x)`, `var(--m-gap)`
  - [ ] Sizing: `var(--m-control-h)`, `var(--m-item-h)`
  - [ ] Border: `var(--m-radius)`

- [ ] **Default-Styles** in Runtime
  - [ ] Trigger-Styling
  - [ ] Content-Styling (inkl. Portal/Positioning)
  - [ ] Item-Styling (inkl. Hover/Highlight)
  - [ ] Group/GroupLabel-Styling

- [ ] **CSS-Selektoren scopen**
  - [ ] `[data-zag-component="name"] [data-slot="Slot"]`

- [ ] **State-Styles** (data-attributes)
  - [ ] `data-state="open|closed"`
  - [ ] `data-highlighted`
  - [ ] `data-disabled`
  - [ ] Weitere komponenten-spezifische States

- [ ] **Defaults in `mirror-defaults.css` hinzufügen**

### Phase 6: Testing

- [ ] **Test-Szenarien** in `test/compiler-test.html`
  - [ ] Basic Properties (value, placeholder, etc.)
  - [ ] Behavior Flags (multiple, disabled, etc.)
  - [ ] Intent Props (searchable, clearable, etc.)
  - [ ] Custom Content (Items mit Children)
  - [ ] Groups/Nesting (falls zutreffend)
  - [ ] Keyboard-Navigation testen!
  - [ ] Edge Cases

### Phase 7: Dokumentation

- [ ] **CLAUDE.md** Property-Referenz aktualisieren
  - [ ] Neue Primitives
  - [ ] Neue Properties

- [ ] **Mapping-Tabelle** in ZAG-BLUEPRINT.md hinzufügen
  - [ ] Vollständiges Zag → Mirror Mapping (wie Select)

---

## Anhang: Intent-oriented Properties

Ein wichtiges Pattern: **Designer-freundliche Abstraktionen**.

| Intent Property | Was es aktiviert | Zag-Equivalent |
|-----------------|------------------|----------------|
| `searchable` | Such-Input, Filter-Logic | `inputBehavior: 'autocomplete'` |
| `clearable` | Clear-Button | (custom implementation) |
| `keepOpen` | Bleibt nach Auswahl offen | `closeOnSelect: false` |
| `deselectable` | Auswahl kann entfernt werden | `deselectable: true` |

Diese Props machen die DSL benutzerfreundlicher, während die Runtime sie auf Zag-Konfiguration oder eigene Implementierungen abbildet.

---

## Anhang: Datei-Referenz

| Datei | Zeilen | Relevante Stellen |
|-------|--------|-------------------|
| `src/schema/zag-primitives.ts` | 1-1292 | Select: 52-80, SLOT_MAPPINGS: 554 (Select: 558-570) |
| `src/schema/zag-prop-metadata.ts` | 1-1391 | Select: 29-62 |
| `src/schema/component-tokens.ts` | - | THEME_TOKENS, USER_TOKEN_MAPPINGS |
| `src/schema/color-utils.ts` | - | lighten, darken, Color-Transformationen |
| `src/schema/theme-generator.ts` | - | generateTheme(), isThemeToken() |
| `src/backends/dom.ts` | 580-668 | emitZagComponent, emitZagItems: 673-768 |
| `src/runtime/dom-runtime-string.ts` | 444+ | initZagComponent (Select-spezifisch) |
| `studio/panels/property-panel.ts` | 459-462, 1767-1842 | behaviorCat zuerst, renderBehaviorSection |
| `assets/mirror-defaults.css` | - | Theme-Token CSS Variables, Default-Styles |

---

---

## 10. Tabs: Vollständiges Mapping (content-items Pattern)

### Unterschiede zum Select-Pattern

| Aspekt | Select (simple-items) | Tabs (content-items) |
|--------|----------------------|---------------------|
| Pattern | `simple-items` | `content-items` |
| Items | Einfache Werte | Items MIT Content-Panels |
| Struktur | Trigger → Content (Dropdown) | List (Triggers) + Content (Panels) |
| Init-Funktion | `initZagComponent` | `initTabsComponent` |
| Indikator | Chevron-Icon | Animierte Linie |

### Props (Zag → Mirror)

| Zag Prop | Mirror Prop | Typ | Beschreibung |
|----------|-------------|-----|--------------|
| `id` | (auto) | string | Automatisch generiert |
| `value` | `value` | string | Aktiver Tab (controlled) |
| `defaultValue` | `defaultValue` | string | Initial aktiver Tab |
| `orientation` | `orientation` | enum | `horizontal` / `vertical` |
| `activationMode` | `activationMode` | enum | `automatic` / `manual` |
| `loopFocus` | `loopFocus` | boolean | Zyklische Tastaturnavigation |
| `deselectable` | `deselectable` | boolean | Tab kann abgewählt werden |

### Slots (Zag data-part → Mirror data-slot)

| Zag Part | Mirror Slot | Element | API Method | Beschreibung |
|----------|-------------|---------|------------|--------------|
| `root` | (root) | div | `getRootProps` | Container |
| `list` | List | div | `getListProps` | Tab-Leiste |
| `trigger` | Trigger | button | `getTriggerProps` | Tab-Button (itemBound) |
| `content` | Content | div | `getContentProps` | Tab-Panel (itemBound) |
| `indicator` | Indicator | div | `getIndicatorProps` | Aktiv-Indikator |

### Events (Zag → Mirror)

| Zag Callback | Mirror Event | Detail |
|--------------|--------------|--------|
| `onValueChange` | `onchange` | `{ value, previousValue }` |

### Data-Attributes (Styling)

| Zag Attribute | CSS Selector | Zustand |
|---------------|--------------|---------|
| `data-selected` | `[data-selected]` | Tab ist aktiv |
| `data-state="active"` | `[data-state="active"]` | Panel ist sichtbar |
| `data-state="inactive"` | `[data-state="inactive"]` | Panel ist versteckt |
| `data-disabled` | `[data-disabled]` | Tab deaktiviert |
| `data-orientation` | `[data-orientation="vertical"]` | Vertikale Ausrichtung |

### Keyboard-Support

| Taste | Horizontal | Vertical |
|-------|------------|----------|
| `ArrowRight` | Nächster Tab | - |
| `ArrowLeft` | Vorheriger Tab | - |
| `ArrowDown` | - | Nächster Tab |
| `ArrowUp` | - | Vorheriger Tab |
| `Home` | Erster Tab | Erster Tab |
| `End` | Letzter Tab | Letzter Tab |
| `Enter/Space` | Aktivieren (manual mode) | Aktivieren (manual mode) |

---

## 11. Kritische Learnings & Fehlerquellen

### 11.1 CSS Scoping Problem

**Problem:** Generische Slot-Selektoren beeinflussen mehrere Komponenten.

```css
/* ❌ FALSCH - betrifft Select UND Tabs Trigger */
[data-slot="Trigger"] {
  min-width: 140px;
}

/* ✅ RICHTIG - nur Select Trigger */
[data-zag-component="select"] [data-slot="Trigger"] {
  min-width: 140px;
}
```

**Regel:** CSS-Selektoren für Slots IMMER mit `[data-zag-component="xxx"]` scopen!

### 11.2 Slot-Namen Kollisionen

Mehrere Komponenten haben gleichnamige Slots:

| Slot | Verwendet von |
|------|---------------|
| `Trigger` | Select, Tabs, Menu, Dialog, Popover, Tooltip, Collapsible |
| `Content` | Select, Tabs, Menu, Dialog, Popover, Accordion, Collapsible |
| `Indicator` | Select (Chevron), Tabs (Linie), Checkbox (Check) |
| `List` | Tabs, NavigationMenu |

**Konsequenz:** Jeder Komponenten-Typ braucht eigene CSS-Regeln und eigene Runtime-Init-Funktion.

### 11.3 Separate Init-Funktionen

**Pattern:** Jeder Komponenten-Typ hat seine eigene Init-Funktion:

```javascript
// ❌ FALSCH - eine generische Funktion
initZagComponent(el) {
  if (el._zagConfig.type === 'select') { ... }
  else if (el._zagConfig.type === 'tabs') { ... }  // Wird unübersichtlich!
}

// ✅ RICHTIG - separate Funktionen
initZagComponent(el) { ... }  // Select
initTabsComponent(el) { ... } // Tabs
initAccordionComponent(el) { ... } // Accordion
```

**Aufruf im Backend:**
```typescript
// dom.ts
if (node.zagType === 'tabs') {
  this.emit(`_runtime.initTabsComponent(${varName})`)
} else {
  this.emit(`_runtime.initZagComponent(${varName})`)
}
```

### 11.4 data-styled Pattern

**Mechanismus:** Runtime wendet Default-Styles nur an, wenn `data-styled` NICHT gesetzt ist.

```javascript
// Runtime
if (!list.hasAttribute('data-styled')) {
  Object.assign(list.style, { /* Default-Styles */ })
}
```

```typescript
// Backend (dom.ts)
if (slot.styles.length > 0) {
  this.emit(`${slotVar}.setAttribute('data-styled', 'true')`)
  // Custom styles anwenden
}
```

**Wichtig für Slot-Customization:** Wenn ein Designer `List: gap 32` schreibt, wird `data-styled="true"` gesetzt und die Runtime-Defaults werden übersprungen.

### 11.5 Indikator-Positionierung

**Tabs Indicator** muss basierend auf Orientation positioniert werden:

| Orientation | Indikator-Position |
|-------------|-------------------|
| horizontal | `bottom: 0`, Breite = Trigger-Breite |
| vertical | `left: 0`, Höhe = Trigger-Höhe |

```javascript
if (isVertical) {
  indicator.style.width = '2px'
  indicator.style.left = '0'
  indicator.style.top = triggerRect.top - listRect.top + 'px'
  indicator.style.height = triggerRect.height + 'px'
} else {
  indicator.style.height = '2px'
  indicator.style.bottom = '0'
  indicator.style.left = triggerRect.left - listRect.left + 'px'
  indicator.style.width = triggerRect.width + 'px'
}
```

### 11.6 Content-Panel Visibility

**Problem:** Bei Tabs sind Content-Panels keine Dropdowns, sondern Inline-Panels.

```javascript
// ❌ FALSCH - position:absolute (für Select-Dropdown OK)
content.style.position = 'absolute'

// ✅ RICHTIG - Tabs Panels sind normal im Flow
content.style.display = isActive ? '' : 'none'
```

**Regel:** `position: absolute` nur für Overlays (Select-Dropdown, Menu, Popover), nicht für Inline-Content wie Tab-Panels.

---

## 12. Slot-Customization in Mirror DSL

### 12.1 Syntax für Slot-Styling

Designer können interne Slots anpassen mit der Slot-Definition-Syntax (`:` am Ende):

```mirror
Tabs defaultValue "home"
  List: gap 32, border none
  Indicator: bg #00ff00, h 4
  Tab "Home" value "home"
    Text "Home content"
  Tab "Profile" value "profile"
    Text "Profile content"
```

### 12.2 Wie es funktioniert

1. **Parser** erkennt `List:` als Slot-Definition (endet mit `:`)
2. **IR** speichert Properties in `node.slots['List'].styles`
3. **Backend** generiert Element mit `data-styled="true"` + Custom Styles
4. **Runtime** überspringt Default-Styling wegen `data-styled`

### 12.3 Verfügbare Slots pro Komponente

| Komponente | Customizable Slots |
|------------|-------------------|
| **Select** | Trigger, Content, Item, ItemIndicator, Group, GroupLabel |
| **Tabs** | List, Trigger, Content, Indicator |
| **Accordion** | Item, ItemTrigger, ItemContent, ItemIndicator |
| **Dialog** | Backdrop, Content, Title, Description |
| **Menu** | Content, Item, Separator |

### 12.4 Custom Slot Children

Slots können auch eigene Kind-Elemente enthalten, um das Standard-Verhalten komplett zu ersetzen:

```mirror
Tabs defaultValue "home"
  Indicator:
    Icon "circle" col #4f46e5, fs 8
  Tab "Home" value "home"
    Text "Icon statt Linie als Indicator"
  Tab "Profile" value "profile"
    Text "Custom Indicator"
```

**Oder mit komplexeren Strukturen:**

```mirror
Tabs defaultValue "a"
  Indicator: bg #22c55e, rad 50
    Box w 8, h 8, bg #fff, rad 50
  Tab "Dot" value "a"
    Text "Punkt-Indicator"
  Tab "Style" value "b"
    Text "Grüner Punkt mit weißem Kern"
```

#### Wie Custom Children funktionieren

1. **Parser** erkennt Slot-Definition (`Indicator:`) und parst Kind-Elemente (wie bei Select Items)
2. **IR** transformiert Slot-Children via `transformChild()` in `slots[slotName].children`
3. **Backend** rendert Children und setzt `data-custom-indicator="true"`
4. **Runtime** erkennt `data-custom-indicator` und:
   - Überspringt Standard-Linien-Styling (width/height)
   - Zentriert das Custom-Element unter/neben dem aktiven Tab
   - Animiert Position mit CSS-Transition

#### Anwendungsfälle

| Use Case | Beispiel |
|----------|----------|
| Icon-Indicator | `Indicator: Icon "dot" col #fff` |
| Dot-Indicator | `Indicator: Box w 8, h 8, rad 50` |
| Badge-Indicator | `Indicator: Box bg #f00, rad 4 Text "3"` |
| Animierter Indicator | `Indicator: Box animate pulse` |

---

## 13. Erweiterte Checkliste

### Phase 0: Vorbereitung (KRITISCH!)

- [ ] **Zag.js Dokumentation lesen** (wie bisher)
- [ ] **Pattern-Typ bestimmen:**
  - [ ] `slots-only` → Keine Items (Dialog, Switch)
  - [ ] `simple-items` → Items ohne Content (Select, Menu)
  - [ ] `content-items` → Items MIT Content (Tabs, Accordion)
- [ ] **CSS-Konflikte prüfen:**
  - [ ] Welche Slot-Namen teilt diese Komponente mit anderen?
  - [ ] Alle CSS-Selektoren mit `[data-zag-component="xxx"]` planen

### Phase 4a: Runtime - Eigene Init-Funktion

- [ ] **Neue Init-Funktion** erstellen (nicht initZagComponent erweitern!)
  - [ ] Funktionsname: `init{ComponentName}Component`
  - [ ] State-Objekt: `el._{componentName}State`
  - [ ] Alle Slots mit `querySelector('[data-slot="..."]')` finden

### Phase 5a: CSS - Scoping beachten

- [ ] **Alle CSS-Selektoren scopen:**
  ```css
  [data-zag-component="componentname"] [data-slot="SlotName"] { }
  ```
- [ ] **Bestehende CSS prüfen:** Keine generischen Slot-Selektoren?

### Phase 6a: Testing - Isolation

- [ ] **Separate Test-Datei:** `test/components/{name}.html`
- [ ] **Keine Interferenz:** Komponente zusammen mit anderen testen
- [ ] **Slot-Customization testen:** `List: gap 32` etc.

---

*Stand: 2026-03-25 - Erweitert mit Tabs-Learnings und Theme-Token-System*
