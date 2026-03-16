# Autocomplete System - Technische Lösung

## Übersicht

Das Autocomplete-System besteht aus mehreren CodeMirror Extensions, die kontextsensitiv arbeiten. Dieses Dokument beschreibt die implementierten Features.

## Implementierte Features

### 1. Color Picker bei `#`

**Trigger:** User tippt `#` nach einer Color-Property oder Token-Definition.

#### State-Variablen

```javascript
let hashTriggerActive = false      // Ist Hash-Trigger-Modus aktiv?
let hashTriggerStartPos = null     // Position des # im Dokument
let selectedSwatchIndex = 0        // Aktuell ausgewählter Swatch (0-129)
let colorSwatchElements = []       // Array aller Swatch-Buttons
const SWATCH_COLUMNS = 13          // Spalten im Grid
const SWATCH_ROWS = 10             // Reihen pro Spalte
```

#### CSS für Selected Swatch

```css
.color-swatch.selected {
  transform: scale(1.4);
  z-index: 2;
  position: relative;
  box-shadow: 0 0 0 2px #fff, 0 0 0 3px #3b82f6;
}
```

#### buildColorGrid()

Erweitert um Tracking für Keyboard-Navigation:

```javascript
function buildColorGrid() {
  colorPickerGrid.innerHTML = ''
  colorSwatchElements = []
  let swatchIndex = 0
  OPEN_COLORS.forEach((scale, colIndex) => {
    const col = document.createElement('div')
    col.className = 'color-picker-column'
    scale.shades.forEach((hex, rowIndex) => {
      const btn = document.createElement('button')
      btn.className = 'color-swatch'
      btn.style.backgroundColor = hex
      btn.dataset.color = hex
      btn.dataset.index = swatchIndex
      btn.dataset.col = colIndex
      btn.dataset.row = rowIndex
      colorSwatchElements.push(btn)
      // ... event listeners
      swatchIndex++
    })
    colorPickerGrid.appendChild(col)
  })
}
```

#### Navigation-Funktionen

```javascript
function updateSelectedSwatch() {
  colorSwatchElements.forEach((el, i) => {
    el.classList.toggle('selected', i === selectedSwatchIndex)
  })
  const selected = colorSwatchElements[selectedSwatchIndex]
  if (selected) {
    colorPreview.style.backgroundColor = selected.dataset.color
    colorHex.textContent = selected.dataset.color.toUpperCase()
  }
}

function navigateSwatches(direction) {
  const currentCol = Math.floor(selectedSwatchIndex / SWATCH_ROWS)
  const currentRow = selectedSwatchIndex % SWATCH_ROWS
  let newCol = currentCol, newRow = currentRow

  switch (direction) {
    case 'left':  newCol = Math.max(0, currentCol - 1); break
    case 'right': newCol = Math.min(SWATCH_COLUMNS - 1, currentCol + 1); break
    case 'up':    newRow = Math.max(0, currentRow - 1); break
    case 'down':  newRow = Math.min(SWATCH_ROWS - 1, currentRow + 1); break
  }
  selectedSwatchIndex = newCol * SWATCH_ROWS + newRow
  updateSelectedSwatch()
}
```

#### hashColorTriggerExtension

Erkennt `#` nach Color-Kontexten:

```javascript
const hashColorTriggerExtension = EditorView.updateListener.of(update => {
  if (!update.docChanged) return

  // 1. Check if # was deleted (close picker)
  if (hashTriggerActive && colorPickerVisible && hashTriggerStartPos !== null) {
    const doc = update.state.doc
    const cursorPos = update.state.selection.main.head
    if (cursorPos < hashTriggerStartPos) { hideColorPicker(); return }
    const charAtStart = doc.sliceString(hashTriggerStartPos, hashTriggerStartPos + 1)
    if (charAtStart !== '#') { hideColorPicker(); return }
  }

  update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
    const insertedText = inserted.toString()

    // 2. Close on non-hex characters
    if (hashTriggerActive && insertedText.length > 0) {
      if (!/^[0-9A-Fa-f]$/.test(insertedText)) {
        hideColorPicker()
        return
      }
    }

    // 3. Detect # in color context
    if (insertedText === '#') {
      const line = update.view.state.doc.lineAt(fromB)
      const textBefore = line.text.slice(0, fromB - line.from)

      const colorPropertyMatch = textBefore.match(
        /\b(bg|col|color|background|boc|border-color|hover-bg|hover-col|hover-boc)\s+$/
      )
      const tokenColorMatch = textBefore.match(/\$[\w.-]+\.(bg|col|color|boc):\s*$/)
      const simpleTokenMatch = textBefore.match(/\$[\w.-]+:\s*$/)

      if (colorPropertyMatch || tokenColorMatch || simpleTokenMatch) {
        const coords = update.view.coordsAtPos(fromB)
        if (coords) {
          showColorPicker(coords.left, coords.bottom + 4, null, null, null, true, fromB)
        }
      }
    }
  })
})
```

#### hashColorKeyboardExtension

Keyboard-Handler mit `Prec.highest`:

```javascript
const hashColorKeyboardExtension = EditorView.domEventHandlers({
  keydown: (event, view) => {
    if (!hashTriggerActive || !colorPickerVisible) return false

    switch (event.key) {
      case 'ArrowLeft':  event.preventDefault(); navigateSwatches('left'); return true
      case 'ArrowRight': event.preventDefault(); navigateSwatches('right'); return true
      case 'ArrowUp':    event.preventDefault(); navigateSwatches('up'); return true
      case 'ArrowDown':  event.preventDefault(); navigateSwatches('down'); return true
      case 'Enter':
        event.preventDefault()
        const selected = colorSwatchElements[selectedSwatchIndex]
        if (selected) selectColor(selected.dataset.color.toUpperCase())
        return true
      case 'Escape':
        event.preventDefault()
        // Remove # and any typed hex chars
        if (hashTriggerStartPos !== null) {
          const cursorPos = view.state.selection.main.head
          view.dispatch({
            changes: { from: hashTriggerStartPos, to: cursorPos, insert: '' },
            selection: { anchor: hashTriggerStartPos }
          })
        }
        hideColorPicker()
        return true
    }
    return false
  }
})
```

#### showColorPicker() erweitert

Neue Parameter für Hash-Trigger-Modus:

```javascript
function showColorPicker(x, y, insertPos, replaceRange = null, initialColor = null,
                         isHashTrigger = false, hashStartPos = null) {
  hashTriggerActive = isHashTrigger
  hashTriggerStartPos = hashStartPos
  // ...
  if (isHashTrigger) {
    // Start at blue-500
    selectedSwatchIndex = 4 * SWATCH_ROWS + 5
    updateSelectedSwatch()
  }
}
```

#### selectColor() erweitert

Hash-Trigger-Modus ersetzt `#` bis Cursor:

```javascript
function selectColor(hex) {
  if (hashTriggerActive && hashTriggerStartPos !== null) {
    const cursorPos = window.editor.state.selection.main.head
    window.editor.dispatch({
      changes: { from: hashTriggerStartPos, to: cursorPos, insert: hex },
      selection: { anchor: hashTriggerStartPos + hex.length }
    })
  }
  // ... other modes
}
```

#### Extension-Registrierung

```javascript
const editor = new EditorView({
  extensions: [
    // ...
    hashColorTriggerExtension,
    Prec.highest(hashColorKeyboardExtension),  // Höchste Priorität für Keyboard
    // ...
  ],
})
```

---

### 2. Property-Autocomplete

**Trigger:** Nach Component-Name, Komma, Colon, oder am Zeilenanfang mit Indent.

#### Kontext-Erkennung

```javascript
const isAfterComma = textBefore.match(/,\s*$/)
const isAfterColon = textBefore.match(/:\s*$/)
const isIndentedStart = textBefore.match(/^\s+$/)
const isAfterComponentName = textBefore.match(/^[A-Z]\w*\s+$/) ||
                             textBefore.match(/^\s+[A-Z]\w*\s+$/)

const isPropertyContext = isAfterComma || isAfterColon ||
                          isIndentedStart || isAfterComponentName

if (!isPropertyContext && !context.explicit) {
  return null  // Kein Autocomplete
}
```

---

### 3. Value-Autocomplete

**Trigger:** Nach bestimmten Properties die feste Werte haben.

| Property | Werte |
|----------|-------|
| `width`, `height`, `size` | hug, full |
| `text-align` | left, center, right |
| `shadow` | sm, md, lg |
| `cursor` | pointer, default, text, move, not-allowed |
| `weight` | 400, 500, 600, 700, bold |
| `font` | monospace, sans-serif, serif |
| `bor`, `border` | solid, dashed, dotted |

---

## Architektur

```
User Input → CodeMirror Extension → Kontext-Analyse → Panel anzeigen
                                                           ↓
User wählt → selectColor() / selectCompletion() → Editor dispatch()
```

## Wichtige Design-Entscheidungen

### Prec.highest für Keyboard

```javascript
Prec.highest(hashColorKeyboardExtension)
```

**Warum:** Ohne `Prec.highest` würde CodeMirror Enter/Escape vor unserem Handler verarbeiten.

### Hash löschen bei Escape

Bei Escape wird nicht nur der Picker geschlossen, sondern auch das `#` und alle getippten Hex-Zeichen entfernt. Das ermöglicht sauberes Abbrechen.

### Auto-Close bei non-Hex

Der Picker schließt automatisch wenn:
- Space getippt wird
- Ein Buchstabe außer a-f getippt wird
- Backspace das `#` löscht

Das ermöglicht nahtloses Weitertippen ohne manuelles Schließen.

---

## Weitere implementierte Features

### `$`-Trigger für Token Panel

**Trigger:** `$` nach Property oder Token-Definition

```javascript
// In tokenPanelTriggerExtension
if (insertedText === '$') {
  // Match any property that accepts tokens
  const propertyMatch = textBefore.match(
    /\b(bg|background|col|color|boc|border-color|hover-bg|hover-col|hover-boc|pad|padding|gap|margin|rad|radius)\s+$/
  )
  // Match token definition: $name: $
  const tokenDefMatch = textBefore.match(/\$[\w.-]+:\s*$/)

  if (propertyMatch || tokenDefMatch) {
    showTokenPanel(coords.left, coords.bottom + 4, fromB, property, true)
  }
}
```

**Verhalten:**
- `bg $` → Token Panel zeigt `.bg` Tokens
- `pad $` → Token Panel zeigt `.pad` Tokens
- `$name: $` → Token Panel zeigt alle Tokens
- Auswahl fügt Token-Namen ohne `$` ein (da bereits getippt)

### State-Autocomplete

**Trigger:** Nach `state ` (Space nach state)

```javascript
// In mirrorCompletions()
const stateMatch = textBefore.match(/\bstate\s+$/)
if (stateMatch) {
  const stateNames = [
    { label: 'hover', info: 'Mouse over element' },
    { label: 'focus', info: 'Element has focus' },
    { label: 'highlighted', info: 'Element is highlighted' },
    { label: 'selected', info: 'Element is selected' },
    // ... 15 States insgesamt
  ]
  return { from, options: stateNames.map(s => ({ ...s, type: 'keyword' })) }
}
```

### Slot-Autocomplete

**Trigger:** Eingerückte Zeile + Großbuchstabe am Anfang

```javascript
// Hilfsfunktionen
function extractComponentSlots(doc) {
  // Extrahiert: { ComponentName: ['Slot1', 'Slot2'], ... }
}

function findParentComponent(doc, pos) {
  // Findet Parent-Component für aktuelle Cursor-Position
}

// In mirrorCompletions()
const slotMatch = textBefore.match(/^\s+$/) && typed.match(/^[A-Z]/)
if (slotMatch) {
  const parentComponent = findParentComponent(context.state.doc, context.pos)
  const componentSlots = extractComponentSlots(context.state.doc)
  const slots = componentSlots[parentComponent] || []
  // Return slot completions
}
```

**Beispiel:**
```mirror
Card:
  Title:
  Description:

Card
  Ti|    → Autocomplete: Title (Slot of Card)
```
