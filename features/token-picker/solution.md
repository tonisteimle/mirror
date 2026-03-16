# Token Picker - Technische Lösung

## Übersicht

Der Token Picker ist ein Playground-Feature, implementiert in `playground.html`. Er kombiniert Token-Vorschläge mit dem bestehenden Color Picker in einem einheitlichen Panel.

## Architektur

```
User tippt "bg " → Trigger Extension → extractTokensFromDoc() → filterTokensBySuffix() → showTokenPanel()
                                                                                              ↓
User wählt Token → selectTokenValue() → Editor dispatch() → Panel schließt
```

## Komponenten

### HTML-Struktur

```html
<!-- Token Panel (kombiniert tokens + picker) -->
<div id="token-panel" class="token-panel">
  <div id="token-panel-tokens" class="token-panel-section">
    <div class="token-panel-label">Tokens</div>
    <div id="token-list" class="token-list"></div>
  </div>
  <div id="token-panel-picker" class="token-panel-section">
    <div class="token-panel-label">Farben</div>
    <div id="token-color-grid" class="color-picker-grid"></div>
  </div>
</div>
```

### CSS-Klassen

| Klasse | Zweck |
|--------|-------|
| `.token-panel` | Container, Positioning, Styling |
| `.token-panel.visible` | Sichtbarkeits-Toggle |
| `.token-panel-section` | Abschnitte (Tokens, Farben) |
| `.token-list` | Scrollbarer Token-Container |
| `.token-item` | Einzelner Token-Eintrag |
| `.token-item.selected` | Keyboard-Auswahl |
| `.token-name` | Token-Name ($primary.bg) |
| `.token-value` | Token-Wert (#3B82F6) |
| `.token-swatch` | Farbvorschau für Color-Tokens |

## JavaScript-Implementierung

### Property-Mappings

```javascript
// Property → Suffix für Token-Filterung
const PROPERTY_SUFFIXES = {
  bg: '.bg',
  background: '.bg',
  col: '.col',
  color: '.col',
  boc: '.boc',
  'border-color': '.boc',
  'hover-bg': '.bg',
  'hover-col': '.col',
  'hover-boc': '.boc',
  pad: '.pad',
  padding: '.pad',
  gap: '.gap',
  margin: '.margin',
  rad: '.rad',
  radius: '.rad',
}

// Property → Panel-Typ (color zeigt Picker, spacing nicht)
const PROPERTY_PANELS = {
  bg: 'color',
  background: 'color',
  col: 'color',
  color: 'color',
  boc: 'color',
  'border-color': 'color',
  'hover-bg': 'color',
  'hover-col': 'color',
  'hover-boc': 'color',
  pad: 'spacing',
  padding: 'spacing',
  gap: 'spacing',
  margin: 'spacing',
  rad: 'spacing',
  radius: 'spacing',
}
```

### Token-Extraktion

```javascript
function extractTokensFromDoc(doc) {
  const text = doc.toString()
  const tokens = []
  const lines = text.split('\n')

  for (const line of lines) {
    // Match: name: value (token definition)
    // Examples: primary: #3B82F6, sm.pad: 4, surface.bg: #1a1a23
    const match = line.match(/^\s*([a-zA-Z][a-zA-Z0-9.-]*):\s*(#[0-9A-Fa-f]{3,8}|\d+)/)
    if (match) {
      const name = match[1]
      const value = match[2]
      const isColor = value.startsWith('#')
      tokens.push({
        name,
        value,
        type: isColor ? 'color' : 'spacing'
      })
    }
  }

  return tokens
}
```

**Regex-Erklärung:**
- `^\s*` - Zeilenanfang mit optionalem Whitespace
- `([a-zA-Z][a-zA-Z0-9.-]*)` - Token-Name (Buchstabe, dann alphanumerisch + Punkt + Minus)
- `:\s*` - Doppelpunkt mit optionalem Whitespace
- `(#[0-9A-Fa-f]{3,8}|\d+)` - Hex-Farbe oder Zahl

### Token-Filterung

```javascript
// Primär: Nach Suffix filtern
function filterTokensBySuffix(tokens, suffix) {
  if (!suffix) return tokens
  return tokens.filter(t => t.name.endsWith(suffix))
}

// Fallback: Nach Typ filtern
function filterTokensByType(tokens, type) {
  return tokens.filter(t => t.type === type)
}
```

### Panel-Anzeige

```javascript
function showTokenPanel(x, y, insertPos, property) {
  tokenPanelInsertPos = insertPos
  tokenPanelProperty = property
  selectedTokenIndex = 0

  // Get tokens from document
  const allTokens = extractTokensFromDoc(window.editor.state.doc)

  // Filter by suffix first
  const suffix = PROPERTY_SUFFIXES[property]
  let filteredTokens = filterTokensBySuffix(allTokens, suffix)

  // If no suffix matches, filter by type
  if (filteredTokens.length === 0) {
    const panelType = PROPERTY_PANELS[property]
    filteredTokens = filterTokensByType(allTokens, panelType)
  }

  renderTokenList(filteredTokens)

  // Show/hide color picker section based on property type
  const panelType = PROPERTY_PANELS[property]
  if (panelType === 'color') {
    tokenPanelPicker.style.display = 'block'
  } else {
    tokenPanelPicker.style.display = 'none'
  }

  // Position and show panel
  tokenPanel.style.left = x + 'px'
  tokenPanel.style.top = y + 'px'
  tokenPanel.classList.add('visible')
  tokenPanelVisible = true
}
```

### Token-Liste rendern

```javascript
function renderTokenList(tokens) {
  currentTokens = tokens
  tokenList.innerHTML = ''

  if (tokens.length === 0) {
    tokenPanelTokens.style.display = 'none'
    return
  }

  tokenPanelTokens.style.display = 'block'

  tokens.forEach((token, index) => {
    const item = document.createElement('div')
    item.className = 'token-item'
    if (index === selectedTokenIndex) item.classList.add('selected')

    // Color swatch for color tokens
    if (token.type === 'color') {
      const swatch = document.createElement('div')
      swatch.className = 'token-swatch'
      swatch.style.backgroundColor = token.value
      item.appendChild(swatch)
    }

    const name = document.createElement('span')
    name.className = 'token-name'
    name.textContent = '$' + token.name
    item.appendChild(name)

    const value = document.createElement('span')
    value.className = 'token-value'
    value.textContent = token.value
    item.appendChild(value)

    item.addEventListener('click', () => {
      selectTokenValue('$' + token.name)
    })

    item.addEventListener('mouseenter', () => {
      selectedTokenIndex = index
      updateSelectedToken()
    })

    tokenList.appendChild(item)
  })
}
```

### Wert einfügen

```javascript
function selectTokenValue(value) {
  if (window.editor && tokenPanelInsertPos !== null) {
    const newCursorPos = tokenPanelInsertPos + value.length
    window.editor.dispatch({
      changes: { from: tokenPanelInsertPos, to: tokenPanelInsertPos, insert: value },
      selection: { anchor: newCursorPos }
    })
    window.editor.focus()
  }
  hideTokenPanel()
}
```

## CodeMirror Extensions

### Trigger Extension

```javascript
const tokenPanelTriggerExtension = EditorView.updateListener.of(update => {
  if (!update.docChanged) return

  update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
    const insertedText = inserted.toString()

    // Close panel if typing (not navigation keys)
    if (tokenPanelVisible && insertedText.length > 0 && insertedText !== ' ') {
      hideTokenPanel()
      return
    }

    if (insertedText === ' ') {
      const line = update.view.state.doc.lineAt(fromB)
      const textBefore = line.text.slice(0, fromB - line.from)

      // Match any property that has a panel mapping
      const propertyMatch = textBefore.match(
        /\b(bg|col|background|color|boc|border-color|hover-bg|hover-col|hover-boc|pad|padding|gap|margin|rad|radius)$/
      )
      if (propertyMatch) {
        const property = propertyMatch[1]
        const coords = update.view.coordsAtPos(fromB)
        if (coords) {
          showTokenPanel(coords.left, coords.bottom + 4, fromB + 1, property)
        }
      }
    }
  })
})
```

### Keyboard Extension

```javascript
const tokenPanelKeyboardExtension = EditorView.domEventHandlers({
  keydown: (event, view) => {
    if (!tokenPanelVisible) return false

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (currentTokens.length > 0) {
          selectedTokenIndex = Math.min(selectedTokenIndex + 1, currentTokens.length - 1)
          updateSelectedToken()
        }
        return true
      case 'ArrowUp':
        event.preventDefault()
        if (currentTokens.length > 0) {
          selectedTokenIndex = Math.max(selectedTokenIndex - 1, 0)
          updateSelectedToken()
        }
        return true
      case 'Enter':
        event.preventDefault()
        if (currentTokens[selectedTokenIndex]) {
          selectTokenValue('$' + currentTokens[selectedTokenIndex].name)
        }
        return true
      case 'Escape':
        event.preventDefault()
        hideTokenPanel()
        return true
    }
    return false
  }
})
```

### Extension-Registrierung

```javascript
const editor = new EditorView({
  // ...
  extensions: [
    // ...
    tokenPanelTriggerExtension,
    Prec.highest(tokenPanelKeyboardExtension),  // Höchste Priorität
    colorDoubleClickExtension,
    iconTriggerExtension,
    Prec.highest(iconKeyboardExtension),
    // ...
  ],
})
```

**`Prec.highest` ist wichtig:**
- Keyboard-Events sollen vor anderen Handlern verarbeitet werden
- Verhindert dass Enter/Escape andere Aktionen auslösen

## Event-Handling

### Klick außerhalb

```javascript
document.addEventListener('mousedown', (e) => {
  if (tokenPanelVisible && !tokenPanel.contains(e.target)) {
    hideTokenPanel()
  }
})
```

### Escape global

```javascript
document.addEventListener('keydown', (e) => {
  if (tokenPanelVisible && e.key === 'Escape') {
    hideTokenPanel()
    if (window.editor) window.editor.focus()
  }
})
```

## State-Management

```javascript
let tokenPanelVisible = false      // Panel sichtbar?
let tokenPanelInsertPos = null     // Cursor-Position für Insert
let tokenPanelProperty = null      // Aktuelle Property (bg, pad, etc.)
let selectedTokenIndex = 0         // Keyboard-Auswahl
let currentTokens = []             // Gefilterte Token-Liste
```

## Tests

15 Playwright-Tests in `src/__tests__/playground/token-picker.test.ts`:

```bash
npx playwright test
```

### Test-Abdeckung

| Test | Beschreibung |
|------|--------------|
| shows token panel | Panel erscheint bei `bg ` |
| shows color picker section | Color Picker für Farb-Properties |
| hides color picker for spacing | Kein Picker für `pad`, `gap`, etc. |
| inserts token when clicking | Klick fügt Token ein |
| inserts color when clicking | Klick auf Swatch fügt Farbe ein |
| closes panel when typing | Auto-Close bei Weiterschreiben |
| closes panel on Escape | Escape schließt Panel |
| keyboard navigation | Pfeiltasten funktionieren |
| Enter selects highlighted | Enter wählt Token aus |
| filters by suffix | Suffix-Filterung funktioniert |
| falls back to type | Typ-Fallback funktioniert |
| empty token section | Versteckt wenn keine Tokens |
| hover-bg property | Hover-Properties funktionieren |
| rad property | Radius-Property funktioniert |
| gap property | Gap-Property funktioniert |

## Mögliche Erweiterungen

### $ Trigger

```javascript
// Bei $ Eingabe alle Tokens zeigen
if (insertedText === '$') {
  const allTokens = extractTokensFromDoc(window.editor.state.doc)
  showAllTokensPanel(allTokens, cursorPosition)
}
```

### Font Picker

```javascript
const PROPERTY_PANELS = {
  // ...
  font: { suffix: '.font', picker: 'font' },
}

// System-Fonts Liste
const SYSTEM_FONTS = [
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Courier New',
  // ...
]
```

### Token-Import

```javascript
// Tokens aus importierten Dateien laden
function extractTokensFromImports(doc) {
  const imports = parseImports(doc)
  const tokens = []
  for (const importPath of imports) {
    const importedDoc = loadFile(importPath)
    tokens.push(...extractTokensFromDoc(importedDoc))
  }
  return tokens
}
```
