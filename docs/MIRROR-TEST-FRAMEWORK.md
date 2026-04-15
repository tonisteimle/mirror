# Mirror Test Framework

Umfassendes Test-Framework für Mirror Studio. Ermöglicht das Testen von:

- Compiler-Korrektheit (Code → DOM)
- User-Interaktionen (Klicks, Hover, Tastatur)
- Bidirektionales Editing (Preview → Code)
- State-Management

## Quick Start

Öffne das Studio im Browser und nutze die Konsole:

```javascript
// Element inspizieren
__mirrorTest.inspect('node-1')
// → { nodeId, tagName, styles, textContent, children, ... }

// Alle Node-IDs auflisten
__mirrorTest.getNodeIds()
// → ['node-1', 'node-2', 'node-3']

// Element nach Text finden
__mirrorTest.findByText('Button')
// → { nodeId: 'node-2', ... }

// Quick Assertions (chainable)
__mirrorTest.expect('node-1').exists().isVisible().hasText('Hello').hasBackground('#2271C1')
```

## Tests schreiben

```javascript
const { testWithSetup } = __mirrorTest

// Einfacher Test
__mirrorTest.runOne(
  testWithSetup('Button hat blauen Hintergrund', 'Button "Klick", bg #2271C1', async api => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
  })
)

// Test-Suite ausführen
__mirrorTest.run(
  [
    testWithSetup('Frame rendert korrekt', 'Frame gap 12', async api => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'display', 'flex')
    }),
    testWithSetup('Text zeigt Inhalt', 'Text "Hello"', async api => {
      api.assert.hasText('node-1', 'Hello')
    }),
  ],
  'Meine Tests'
)
```

## API Reference

### Inspektion

| Methode                       | Beschreibung                            |
| ----------------------------- | --------------------------------------- |
| `inspect(nodeId)`             | Gibt ElementInfo für ein Element zurück |
| `getNodeIds()`                | Liste aller Mirror-Element-IDs          |
| `findByText(text)`            | Findet Element nach Text-Inhalt         |
| `preview.query(selector)`     | CSS-Selektor Suche                      |
| `preview.getRoot()`           | Wurzelelement                           |
| `preview.getChildren(nodeId)` | Kind-Elemente                           |
| `preview.exists(nodeId)`      | Prüft ob Element existiert              |
| `preview.waitFor(nodeId)`     | Wartet auf Element                      |

### ElementInfo

```typescript
interface ElementInfo {
  nodeId: string // data-mirror-id
  tagName: string // div, button, span, ...
  textContent: string // Direkter Text
  fullText: string // Text inkl. Kinder
  styles: ComputedStyles // Alle CSS-Styles
  attributes: Record<string, string>
  dataAttributes: Record<string, string>
  bounds: DOMRect // Position & Größe
  children: string[] // Kind-Node-IDs
  parent: string | null // Parent-Node-ID
  visible: boolean
  interactive: boolean
}
```

### Interaktionen

| Methode                                       | Beschreibung                 |
| --------------------------------------------- | ---------------------------- |
| `click(nodeId)`                               | Klickt auf Element           |
| `doubleClick(nodeId)`                         | Doppelklick                  |
| `hover(nodeId)`                               | Hover über Element           |
| `unhover(nodeId)`                             | Hover verlassen              |
| `focus(nodeId)`                               | Element fokussieren          |
| `blur(nodeId)`                                | Fokus entfernen              |
| `type(nodeId, text)`                          | Text eingeben                |
| `clear(nodeId)`                               | Input leeren                 |
| `pressKey(key)`                               | Taste drücken                |
| `select(nodeId)`                              | Element selektieren (Studio) |
| `clearSelection()`                            | Selektion aufheben           |
| `interact.dragFromPalette(comp, target, idx)` | Palette-Drop                 |
| `interact.moveElement(src, target, idx)`      | Element verschieben          |

### Assertions

| Methode                                     | Beschreibung       |
| ------------------------------------------- | ------------------ |
| `assert.ok(condition, msg)`                 | Bedingung prüfen   |
| `assert.equals(actual, expected)`           | Gleichheit         |
| `assert.matches(str, regex)`                | Regex-Match        |
| `assert.contains(str, substr)`              | Substring          |
| `assert.exists(nodeId)`                     | Element existiert  |
| `assert.isVisible(nodeId)`                  | Element sichtbar   |
| `assert.hasText(nodeId, text)`              | Text-Inhalt        |
| `assert.hasStyle(nodeId, prop, value)`      | CSS-Style          |
| `assert.hasChildren(nodeId, count)`         | Kind-Anzahl        |
| `assert.hasAttribute(nodeId, attr, value?)` | Attribut           |
| `assert.codeContains(pattern)`              | Code-Prüfung       |
| `assert.codeEquals(expected)`               | Code-Vergleich     |
| `assert.isSelected(nodeId)`                 | Element selektiert |

### Fluent Assertions

```javascript
__mirrorTest
  .expect('node-1')
  .exists()
  .isVisible()
  .hasText('Hello')
  .hasBackground('#2271C1')
  .hasColor('white')
  .hasStyle('padding', '16px')
  .hasChildCount(3)
```

### Editor-Kontrolle

| Methode                               | Beschreibung         |
| ------------------------------------- | -------------------- |
| `getCode()`                           | Aktuellen Code lesen |
| `setCode(code)`                       | Code setzen (async)  |
| `editor.insertAt(code, line, indent)` | Code einfügen        |
| `editor.getCursor()`                  | Cursor-Position      |
| `editor.setCursor(line, col)`         | Cursor setzen        |
| `editor.undo()`                       | Rückgängig           |
| `editor.redo()`                       | Wiederholen          |

### Utilities

| Methode            | Beschreibung              |
| ------------------ | ------------------------- |
| `delay(ms)`        | Warten                    |
| `waitForCompile()` | Auf Kompilierung warten   |
| `snapshot()`       | Aktuellen State speichern |

## Test-Definition Helpers

```javascript
const { test, testWithSetup, testOnly, testSkip, describe } = __mirrorTest

// Einfacher Test
test('Name', async (api) => { ... })

// Test mit Setup-Code
testWithSetup('Name', 'Frame gap 12', async (api) => { ... })

// Nur diesen Test ausführen
testOnly('Name', async (api) => { ... })

// Test überspringen
testSkip('Name', async (api) => { ... })

// Tests gruppieren
describe('Layout', [
  testWithSetup('hor', 'Frame hor', async (api) => { ... }),
  testWithSetup('ver', 'Frame ver', async (api) => { ... }),
])
```

## Verfügbare Test-Suites

### Compiler Tests

```javascript
// Alle Compiler-Tests ausführen
import { runCompilerTests } from './test-api/suites/compiler-tests.js'
await runCompilerTests()

// Einzelne Kategorien
import { primitiveTests, layoutTests, stylingTests } from './test-api/suites/compiler-tests.js'
__mirrorTest.run(primitiveTests, 'Primitives')
__mirrorTest.run(layoutTests, 'Layout')
```

### Drag & Drop Tests

```javascript
// Alle Drag-Tests
__dragTest.runDragTests()

// Einzelne Operation
__dragTest.fromPalette('Button').toContainer('node-1').atIndex(0).execute()
```

## Beispiele

### Compiler-Korrektheit testen

```javascript
// Prüfen ob Button korrekt rendert
__mirrorTest.runOne(
  testWithSetup(
    'Button hat korrekte Styles',
    'Button "Test", bg #2271C1, col white, pad 12 24, rad 6',
    async api => {
      api.assert.exists('node-1')

      const info = api.preview.inspect('node-1')
      api.assert.ok(info.tagName === 'button')

      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')
    }
  )
)
```

### Layout testen

```javascript
testWithSetup(
  'Horizontal Layout funktioniert',
  'Frame hor, gap 8\n  Button "A"\n  Button "B"\n  Button "C"',
  async api => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'flexDirection', 'row')
    api.assert.hasStyle('node-1', 'gap', '8px')
    api.assert.hasChildren('node-1', 3)
  }
)
```

### Interaktion testen

```javascript
testWithSetup(
  'Klick ändert State',
  'Button "Toggle", bg #333, toggle()\n  on:\n    bg #2271C1',
  async api => {
    // Initial-State
    api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')

    // Klicken
    await api.interact.click('node-1')
    await api.utils.delay(100)

    // State geändert
    api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
  }
)
```

### Bidirektionales Editing testen

```javascript
testWithSetup('Property-Änderung aktualisiert Code', 'Button "Test", bg #333', async api => {
  const codeBefore = api.editor.getCode()
  api.assert.contains(codeBefore, 'bg #333')

  // Hier würde man das Property-Panel simulieren
  // (wenn API verfügbar)

  // Code sollte sich geändert haben
  api.assert.codeContains('bg #2271C1')
})
```

## Runner-Optionen

```javascript
const runner = new TestRunner({
  bail: true, // Stoppen bei erstem Fehler
  filter: /layout/i, // Nur Tests mit "layout" im Namen
  tags: ['critical'], // Nur Tests mit Tag
  timeout: 5000, // Timeout pro Test
  verbose: true, // Detaillierte Ausgabe
})
```

## Architektur

```
studio/test-api/
├── index.ts           # Haupt-Export, Setup
├── types.ts           # TypeScript-Typen
├── inspector.ts       # DOM-Inspektion
├── assertions.ts      # Assertions
├── interactions.ts    # User-Interaktionen
├── test-runner.ts     # Test-Ausführung
└── suites/
    └── compiler-tests.ts  # Compiler Test-Suite
```

## Globale APIs

| API               | Beschreibung                       |
| ----------------- | ---------------------------------- |
| `__mirrorTest`    | Comprehensive Test Framework       |
| `__dragTest`      | Drag & Drop Tests (Browser)        |
| `__testDragDrop`  | Drag & Drop Tests (Programmatisch) |
| `__STUDIO_TEST__` | Event-basierte Studio-Tests        |

## Best Practices

1. **Setup minimal halten** - Nur den Code, der für den Test nötig ist
2. **Ein Konzept pro Test** - Jeder Test prüft eine Sache
3. **Aussagekräftige Namen** - Test-Name beschreibt was getestet wird
4. **Assertions am Ende** - Erst Setup, dann Aktion, dann Assert
5. **Timeouts beachten** - `waitForCompile()` nutzen statt feste Delays
