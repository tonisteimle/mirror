# Color Picker - Technische Lösung

## Architektur

```
studio/app.js
├── Color Picker UI
│   ├── renderColorPicker()
│   ├── ColorArea (2D Canvas)
│   ├── HueSlider
│   └── AlphaSlider (optional)
├── Color Utils
│   ├── hexToHsl()
│   ├── hslToHex()
│   ├── parseColor()
│   └── formatColor()
├── Integration
│   ├── Editor Trigger
│   ├── Property Panel Trigger
│   └── Token Suggestions
└── State
    ├── currentColor
    ├── recentColors
    └── projectColors
```

## Implementation

### 1. Color Picker Container

```javascript
// Globaler State
let colorPickerState = {
  isOpen: false,
  position: { x: 0, y: 0 },
  currentColor: { h: 0, s: 100, l: 50, a: 1 },
  originalColor: null,  // Für Escape/Undo
  targetProperty: null, // 'bg', 'col', etc.
  onSelect: null        // Callback
}

function openColorPicker(options) {
  const { x, y, color, property, onSelect } = options

  colorPickerState = {
    isOpen: true,
    position: { x, y },
    currentColor: parseColorToHsl(color),
    originalColor: color,
    targetProperty: property,
    onSelect
  }

  renderColorPicker()
}
```

### 2. Color Area (2D Picker)

```javascript
function createColorArea(container) {
  const canvas = document.createElement('canvas')
  canvas.width = 200
  canvas.height = 150

  function draw(hue) {
    const ctx = canvas.getContext('2d')

    // Basis-Farbe
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Weißer Gradient (links → rechts)
    const whiteGrad = ctx.createLinearGradient(0, 0, canvas.width, 0)
    whiteGrad.addColorStop(0, 'white')
    whiteGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = whiteGrad
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Schwarzer Gradient (oben → unten)
    const blackGrad = ctx.createLinearGradient(0, 0, 0, canvas.height)
    blackGrad.addColorStop(0, 'transparent')
    blackGrad.addColorStop(1, 'black')
    ctx.fillStyle = blackGrad
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  canvas.addEventListener('mousedown', handleColorAreaClick)
  canvas.addEventListener('mousemove', handleColorAreaDrag)

  return { canvas, draw }
}
```

### 3. Hue Slider

```javascript
function createHueSlider(container) {
  const slider = document.createElement('div')
  slider.className = 'color-picker-hue-slider'

  // CSS Gradient für alle Farbtöne
  slider.style.background = `linear-gradient(to right,
    hsl(0, 100%, 50%),
    hsl(60, 100%, 50%),
    hsl(120, 100%, 50%),
    hsl(180, 100%, 50%),
    hsl(240, 100%, 50%),
    hsl(300, 100%, 50%),
    hsl(360, 100%, 50%)
  )`

  slider.addEventListener('mousedown', handleHueChange)
  slider.addEventListener('mousemove', handleHueDrag)

  return slider
}
```

### 4. Color Utils

```javascript
// Hex zu HSL
function hexToHsl(hex) {
  let r, g, b

  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16)
    g = parseInt(hex[2] + hex[2], 16)
    b = parseInt(hex[3] + hex[3], 16)
  } else {
    r = parseInt(hex.slice(1, 3), 16)
    g = parseInt(hex.slice(3, 5), 16)
    b = parseInt(hex.slice(5, 7), 16)
  }

  r /= 255; g /= 255; b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2

  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 }
}

// HSL zu Hex
function hslToHex(h, s, l) {
  s /= 100
  l /= 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2

  let r, g, b

  if (h < 60)      { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else              { r = c; g = 0; b = x }

  r = Math.round((r + m) * 255)
  g = Math.round((g + m) * 255)
  b = Math.round((b + m) * 255)

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase()
}
```

### 5. Token Suggestions

```javascript
function getColorTokenSuggestions(property) {
  const tokens = extractTokensFromFiles()

  // Filter nach Property-Typ
  const suffix = property === 'bg' || property === 'background' ? '.bg'
               : property === 'col' || property === 'color' ? '.col'
               : null

  return tokens.filter(token => {
    // Nur Farb-Tokens (Hex-Werte)
    if (!/^#[0-9A-F]{3,8}$/i.test(token.value)) return false

    // Nach Suffix filtern wenn vorhanden
    if (suffix && !token.name.endsWith(suffix)) return false

    return true
  })
}
```

### 6. Editor Integration

```javascript
// Trigger bei Farb-Property
function checkColorPickerTrigger(view, pos) {
  const line = view.state.doc.lineAt(pos)
  const textBefore = line.text.slice(0, pos - line.from)

  // Pattern: property #... oder property $...
  const colorPropertyMatch = textBefore.match(/(bg|col|color|background|boc|border-color|ic|icon-color|hover-bg|hover-col)\s+(#|$)?$/)

  if (colorPropertyMatch) {
    const property = colorPropertyMatch[1]
    const coords = view.coordsAtPos(pos)

    openColorPicker({
      x: coords.left,
      y: coords.bottom,
      color: '#3B82F6',  // Default oder vorhandener Wert
      property,
      onSelect: (color) => insertColorAtCursor(view, color)
    })
  }
}
```

### 7. Recent Colors

```javascript
const RECENT_COLORS_KEY = 'mirror-recent-colors'
const MAX_RECENT_COLORS = 12

function getRecentColors() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_COLORS_KEY)) || []
  } catch {
    return []
  }
}

function addRecentColor(color) {
  const recent = getRecentColors().filter(c => c !== color)
  recent.unshift(color)
  localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT_COLORS)))
}
```

### 8. Project Colors

```javascript
function extractProjectColors() {
  const colors = new Map()  // color → count

  for (const content of Object.values(files)) {
    const hexMatches = content.matchAll(/#[0-9A-Fa-f]{3,8}/g)
    for (const match of hexMatches) {
      const hex = match[0].toUpperCase()
      colors.set(hex, (colors.get(hex) || 0) + 1)
    }
  }

  // Nach Häufigkeit sortiert
  return Array.from(colors.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color)
}
```

## CSS

```css
.color-picker {
  position: fixed;
  background: var(--surface-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  z-index: 1000;
  width: 240px;
}

.color-picker-area {
  border-radius: 4px;
  cursor: crosshair;
  margin-bottom: 8px;
}

.color-picker-hue-slider {
  height: 12px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 8px;
}

.color-picker-input {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.color-picker-input input {
  flex: 1;
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 6px 8px;
  color: var(--text);
  font-family: monospace;
}

.color-picker-section {
  margin-top: 12px;
}

.color-picker-section-title {
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 6px;
  text-transform: uppercase;
}

.color-picker-swatches {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
}

.color-picker-swatch {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.1);
}

.color-picker-swatch:hover {
  transform: scale(1.1);
}
```

## Nächste Schritte

1. [ ] Basis UI implementieren (Color Area + Hue Slider)
2. [ ] Hex-Eingabe mit Live-Update
3. [ ] Editor Integration (Trigger + Insert)
4. [ ] Token Suggestions
5. [ ] Recent Colors
6. [ ] Project Colors
7. [ ] Property Panel Integration
8. [ ] Alpha Slider (optional)
