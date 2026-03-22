# Property Panel Components

Wiederverwendbare UI-Komponenten für das Property Panel.

## Installation

```typescript
import { PP, Section, PropRow, ToggleGroup, ICONS } from './components'
```

## Komponenten-Übersicht

| Komponente | Beschreibung |
|------------|--------------|
| `Section` | Collapsible Sektion mit Label und Icon |
| `PropRow` | Property-Zeile mit Label und Content |
| `ToggleGroup` | Segmented Control (Buttons) |
| `ColorInput` | Farbfeld mit Preview und Picker |
| `AlignGrid` | 3x3 Alignment-Grid |
| `Select` | Dropdown-Auswahl |
| `Input` | Text-/Zahlen-Eingabe |
| `IconButton` | Icon-Button |
| `Slider` | Range-Slider |
| `NumericInput` | Zahl mit Drag-to-Adjust |

## Verwendung

### Mit der PP Factory (empfohlen)

```typescript
import { PP } from './components'

// Layout Section erstellen
const layoutSection = PP.section('Layout', 'layout')
  .append(
    PP.row('Direction')
      .append(PP.toggleIcons([
        { value: 'hor', icon: 'horizontal', title: 'Horizontal' },
        { value: 'ver', icon: 'vertical', title: 'Vertical' },
      ], currentDirection, (dir) => {
        console.log('Direction changed:', dir)
      }))
  )
  .append(
    PP.row('Gap')
      .append(PP.number(currentGap, (v) => {
        console.log('Gap changed:', v)
      }, 'px'))
  )

container.appendChild(layoutSection.getElement())
```

### Mit Klassen direkt

```typescript
import { Section, PropRow, ToggleGroup, ColorInput } from './components'

// Section erstellen
const section = new Section({
  label: 'Appearance',
  icon: 'color',
  collapsed: false,
  onToggle: (collapsed) => console.log('Collapsed:', collapsed),
})

// Color Input in PropRow
const colorRow = new PropRow({ label: 'Background' })
colorRow.append(new ColorInput({
  value: '#3B82F6',
  onChange: (color) => console.log('Color:', color),
  onPickerOpen: (anchor) => showColorPicker(anchor),
}))

section.append(colorRow)
container.appendChild(section.getElement())
```

## Komponenten-Referenz

### Section

```typescript
interface SectionConfig {
  label: string          // Section-Titel
  icon?: string          // Icon-Name (aus icons.ts)
  collapsed?: boolean    // Startzustand
  onToggle?: (collapsed: boolean) => void
}

const section = new Section({ label: 'Layout', icon: 'layout' })
section.append(child)      // Kind hinzufügen
section.toggle()           // Auf-/Zuklappen
section.expand()           // Aufklappen
section.collapse()         // Zuklappen
section.isCollapsed()      // Status abfragen
```

### PropRow

```typescript
interface PropRowConfig {
  label: string          // Label-Text
  tooltip?: string       // Tooltip für Label
  isOverride?: boolean   // Override-Marker
}

const row = new PropRow({ label: 'Width', tooltip: 'Element width' })
row.append(input)          // Content hinzufügen
row.setLabel('New Label')  // Label ändern
```

### ToggleGroup

```typescript
interface ToggleGroupConfig<T> {
  options: Array<{
    value: T
    label?: string
    icon?: string
    title?: string
    disabled?: boolean
  }>
  value: T | T[]
  onChange: (value: T) => void
  multiSelect?: boolean
  size?: 'sm' | 'md'
}

const group = new ToggleGroup({
  options: [
    { value: 'left', icon: ICONS.alignLeft, title: 'Left' },
    { value: 'center', icon: ICONS.alignCenter, title: 'Center' },
    { value: 'right', icon: ICONS.alignRight, title: 'Right' },
  ],
  value: 'left',
  onChange: (v) => console.log(v),
})
```

### ColorInput

```typescript
interface ColorInputConfig {
  value: string                              // Hex-Farbe
  onChange: (color: string) => void
  showPicker?: boolean                       // Picker-Button zeigen
  onPickerOpen?: (anchor: HTMLElement) => void
  placeholder?: string
}

const colorInput = new ColorInput({
  value: '#FF0000',
  onChange: (color) => applyColor(color),
  onPickerOpen: (anchor) => showColorPicker(anchor),
})
```

### AlignGrid

```typescript
type AlignPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'

interface AlignGridConfig {
  value: AlignPosition | null
  onChange: (position: AlignPosition) => void
  cornersOnly?: boolean  // Nur 4 Ecken
}

const grid = new AlignGrid({
  value: 'middle-center',
  onChange: (pos) => setAlignment(pos),
})
```

### Input

```typescript
interface InputConfig {
  value: string
  onChange: (value: string) => void
  onInput?: (value: string) => void  // Live-Updates
  placeholder?: string
  type?: 'text' | 'number'
  unit?: string                       // z.B. 'px', '%'
  invalid?: boolean
}

const input = new Input({
  value: '100',
  onChange: (v) => setWidth(v),
  unit: 'px',
})
```

### Slider

```typescript
interface SliderConfig {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  showValue?: boolean
}

const slider = new Slider({
  value: 50,
  min: 0,
  max: 100,
  step: 5,
  onChange: (v) => setOpacity(v / 100),
})
```

## Icons

Verfügbare Icons in `icons.ts`:

```typescript
import { ICONS, getIcon, createIconElement } from './components'

// Als SVG-String
const svg = ICONS.horizontal

// Als DOM-Element
const iconEl = createIconElement('horizontal')
```

**Layout:** horizontal, vertical, wrap, stacked, grid, spread
**Alignment:** alignLeft, alignCenter, alignRight, alignTop, alignMiddle, alignBottom
**Size:** sizeHug, sizeFull, sizeFixed
**UI:** chevronDown, chevronUp, chevronRight, plus, minus, close, colorPicker, link, unlink
**Categories:** layout, size, spacing, color, typography, border, effects, position

## CSS-Klassen

Die Komponenten nutzen die bestehenden CSS-Klassen aus `styles.css`:

- `.section`, `.pp-section` - Section Container
- `.prop-row`, `.pp-prop-row` - Property Row
- `.toggle-group`, `.pp-toggle-group` - Toggle Group
- `.toggle-btn`, `.pp-toggle-btn` - Toggle Button
- `.prop-input`, `.pp-v2-input` - Input Field
- `.color-preview` - Color Swatch Preview
- `.align-grid`, `.align-cell` - Alignment Grid
- `.prop-select` - Select Dropdown
- `.icon-btn` - Icon Button
- `.slider-wrapper`, `.prop-slider` - Slider
