# Drag & Drop Test Framework

Framework für programmatische Tests von Drag & Drop Operationen im Mirror Studio.

## Übersicht

Das Framework ermöglicht:

- **Browser-Tests**: Echtzeit-Tests direkt in der Browser-Konsole
- **Automatisierte Tests**: Headless-Tests via Chrome DevTools Protocol
- **Vollständige Verifikation**: Code-Änderungen UND Element-Selektion werden geprüft

## Quick Start

### Browser-Tests ausführen

1. Studio im Browser öffnen
2. Konsole öffnen (F12 → Console)
3. Test-API verwenden:

```javascript
// Alle Tests ausführen (40 Tests)
__dragTest.runAllTests()

// Einzelne Palette-Drop Operation
__dragTest.fromPalette('Button').toContainer('node-1').atIndex(0).execute()

// Element auf Canvas verschieben
__dragTest.moveElement('node-3').toContainer('node-1').atIndex(0).execute()
```

### CLI Test-Runner

```bash
# Headless Tests
npx tsx tools/drag-test-runner.ts

# Mit sichtbarem Browser
npx tsx tools/drag-test-runner.ts --headed

# Gegen spezifische URL
npx tsx tools/drag-test-runner.ts --url http://localhost:5173/studio/
```

---

## Architektur

```
┌──────────────────────────────────────────────────────────────────┐
│                    Browser Test API                               │
│                (studio/preview/drag/browser-test-api.ts)         │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ BrowserTest     │  │ MirrorStudio    │  │ Test Cases      │  │
│  │ Runner          │  │ Control         │  │ (40 Tests)      │  │
│  │                 │  │                 │  │                 │  │
│  │ - fromPalette() │  │ - getCode()     │  │ - Palette Drop  │  │
│  │ - moveElement() │  │ - setCode()     │  │ - Canvas Move   │  │
│  │ - executeXxx()  │  │ - getSelection()│  │ - Nested        │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Test API Layer                                 │
│                (studio/preview/drag/test-api/)                   │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Types           │  │ Fixtures        │  │ Test Runner     │  │
│  │                 │  │                 │  │                 │  │
│  │ - DragTestResult│  │ - SIMPLE_       │  │ - DragTest      │  │
│  │ - TestParams    │  │   COMPONENTS    │  │   Runner        │  │
│  │ - CodeExpect    │  │ - ZAG_COMPONENTS│  │ - executeTest() │  │
│  │   ation         │  │ - CHART_        │  │                 │  │
│  │                 │  │   COMPONENTS    │  │                 │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Drag Controller                                │
│                (studio/preview/drag/drag-controller.ts)          │
│                                                                   │
│  - simulateDrop(source, target) für Test-Bypass                  │
│  - Normale Drop-Logik mit Code-Änderung                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## Dateien & Struktur

### Kern-Dateien

| Datei                                              | Beschreibung                        |
| -------------------------------------------------- | ----------------------------------- |
| `studio/preview/drag/browser-test-api.ts`          | Haupt-Test-API, Browser-Integration |
| `studio/preview/drag/test-api/types.ts`            | TypeScript-Interfaces für Tests     |
| `studio/preview/drag/test-api/drag-test-runner.ts` | Test-Runner Klasse                  |
| `studio/preview/drag/drag-controller.ts`           | Controller mit `simulateDrop()`     |
| `tools/drag-test-runner.ts`                        | CLI Test-Runner (CDP)               |

### Fixtures (Komponenten-Templates)

| Datei                                    | Inhalt                                 |
| ---------------------------------------- | -------------------------------------- |
| `test-api/fixtures/simple-components.ts` | Button, Text, Frame, Icon, etc.        |
| `test-api/fixtures/zag-components.ts`    | Checkbox, Switch, Select, Dialog, etc. |
| `test-api/fixtures/chart-components.ts`  | Line, Bar, Pie, Donut, Area Charts     |
| `test-api/fixtures/container-setups.ts`  | Verschiedene Container-Layouts         |

### Unit Tests (Vitest)

| Datei                                                     | Beschreibung        |
| --------------------------------------------------------- | ------------------- |
| `tests/studio/drag-drop/fixtures.test.ts`                 | Fixture-Validierung |
| `tests/studio/drag-drop/drag-test-runner.test.ts`         | Runner-Tests        |
| `tests/studio/drag-drop/drag-controller-test-api.test.ts` | Controller API      |

---

## API-Referenz

### Globale API (`__dragTest`)

Die API ist global unter `window.__dragTest` verfügbar.

#### Drag-Operationen

```typescript
// Palette-Drop (neue Komponente einfügen)
__dragTest.fromPalette(componentName: string): PaletteDragBuilder

// Canvas-Move (bestehendes Element verschieben)
__dragTest.moveElement(nodeId: string): CanvasMoveBuilder

// Alle Tests ausführen
__dragTest.runAllTests(): Promise<TestResults>
```

#### Editor-Kontrolle

```typescript
// Code lesen/schreiben
__dragTest.getCode(): string
__dragTest.setCode(code: string): void
__dragTest.setTestCode(code: string): Promise<void>  // Mit Kompilierung
__dragTest.reset(code?: string): void

// Kompilierung
__dragTest.waitForCompile(timeout?: number): Promise<void>
__dragTest.recompile(): void
```

#### Selektion

```typescript
// Selektion steuern
__dragTest.selectNode(nodeId: string): void
__dragTest.getSelection(): string | null
__dragTest.clearSelection(): void
```

#### Panel-Kontrolle

```typescript
// Panels ein-/ausblenden
__dragTest.showPanel(panel: string): void
__dragTest.hidePanel(panel: string): void
__dragTest.togglePanel(panel: string): void

// Modi
__dragTest.focusMode(): void   // Nur Preview
__dragTest.normalMode(): void  // Alle Panels
__dragTest.testMode(): void    // Minimal für Tests
```

#### Inspektion

```typescript
// DOM-Struktur inspizieren
__dragTest.getNodeIds(): string[]
__dragTest.getSourceMap(): SourceMap
__dragTest.snapshot(): Snapshot
```

### Builder API

#### PaletteDragBuilder

```typescript
#### Property Panel Kontrolle

```typescript
// Element-Properties lesen
__dragTest.getElement(nodeId: string): ExtractedElementInfo | null
__dragTest.getPropertyValue(nodeId: string, propName: string): string | null
__dragTest.hasProperty(nodeId: string, propName: string): boolean
__dragTest.getPropertiesMap(nodeId: string): Record<string, string>
__dragTest.getPrimitiveType(nodeId: string): string | null  // "Frame", "Button", etc.
__dragTest.isComponentInstance(nodeId: string): boolean
__dragTest.isComponentDefinition(nodeId: string): boolean

// Properties ändern (async, wartet auf Kompilierung)
__dragTest.setProperty(nodeId: string, propName: string, value: string): Promise<PropertyModificationResult>
__dragTest.removeProperty(nodeId: string, propName: string): Promise<PropertyModificationResult>
__dragTest.toggleProperty(nodeId: string, propName: string, enabled: boolean): Promise<PropertyModificationResult>
__dragTest.batchUpdateProperties(nodeId: string, changes: PropertyChange[]): Promise<PropertyModificationResult>

// Tokens
__dragTest.getColorTokens(): TokenInfo[]    // Alle Farb-Tokens (bg, col, boc, ic)
__dragTest.getSpacingTokens(): TokenInfo[]  // Alle Spacing-Tokens (pad, gap, mar, rad)

// Panel-Steuerung
__dragTest.refreshPropertyPanel(): void
__dragTest.getCurrentPanelElement(): ExtractedElementInfo | null
__dragTest.selectAndInspect(nodeId: string): Promise<ExtractedElementInfo | null>
```

**Beispiele:**

```javascript
// Element inspizieren
const element = __dragTest.getElement('node-1')
console.log(element.nodeName)       // "Frame"
console.log(element.allProperties)  // [{name: "bg", value: "#333", hasValue: true}, ...]

// Einzelne Property lesen
const bg = __dragTest.getPropertyValue('node-1', 'bg')  // "#333"

// Alle Properties als Map
const props = __dragTest.getPropertiesMap('node-1')
// { bg: "#333", pad: "16", gap: "8" }

// Property setzen (wartet auf Kompilierung)
const result = await __dragTest.setProperty('node-1', 'bg', '#ff0000')
if (result.success) {
  console.log('Neuer Code:', result.newSource)
}

// Mehrere Properties auf einmal ändern
await __dragTest.batchUpdateProperties('node-1', [
  { name: 'bg', value: '#2271C1', action: 'set' },
  { name: 'pad', value: '24', action: 'set' },
  { name: 'shadow', value: '', action: 'remove' }
])

// Tokens auslesen
const colors = __dragTest.getColorTokens()
// [{name: "primary", type: "bg", value: "#2271C1", fullName: "primary.bg"}, ...]
```

__dragTest
  .fromPalette('Button')
  .toContainer('node-1') // Ziel-Container (Node-ID)
  .atIndex(0) // Position (0 = erstes Kind)
  .execute() // Ausführen → Promise<BrowserTestResult>
```

#### CanvasMoveBuilder

```typescript
__dragTest
  .moveElement('node-3')
  .toContainer('node-1') // Ziel-Container
  .atIndex(2) // Neue Position
  .execute() // Ausführen → Promise<BrowserTestResult>
```

### Ergebnis-Typen

#### BrowserTestResult

```typescript
interface BrowserTestResult {
  success: boolean
  description: string
  duration: number // ms
  codeBefore?: string
  codeAfter?: string
  error?: string
}
```

#### DragTestResult (aus runAllTests)

```typescript
interface DragTestResult {
  name: string
  passed: boolean
  codeBefore: string
  codeAfter: string
  verification: {
    match: boolean
    diff: string
    message: string
  }
  selectionAfter: string | null
  selectionVerification: {
    correct: boolean
    expected: string | null
    actual: string | null
  }
  debugInfo: {
    preludeOffset: number
    nodeCount: number
    targetFound: boolean
  }
  error?: string
  duration: number
}
```

---

## Test-Kategorien
#### Property Panel Types

```typescript
// Extrahierte Element-Info (aus getElement)
interface ExtractedElementInfo {
  nodeId: string
  nodeName: string              // "Frame", "Button", "Text", etc.
  componentName?: string        // Name wenn Komponenten-Instanz
  isDefinition: boolean         // true wenn Komponenten-Definition
  isTemplateInstance: boolean   // true wenn Komponenten-Instanz
  categories: PropertyCategoryInfo[]
  allProperties: ExtractedPropertyInfo[]
}

// Property-Kategorie (layout, sizing, spacing, etc.)
interface PropertyCategoryInfo {
  name: string    // "layout", "sizing", "spacing", "color", etc.
  label: string   // "Layout", "Sizing", "Spacing", "Color", etc.
  properties: ExtractedPropertyInfo[]
}

// Einzelne Property
interface ExtractedPropertyInfo {
  name: string       // "bg", "pad", "gap", etc.
  value: string      // "#333", "16", "8", etc.
  hasValue: boolean  // true wenn Property gesetzt ist
  isToken?: boolean  // true wenn Token-Referenz
  tokenRef?: string  // z.B. "primary" für $primary
}

// Änderungs-Ergebnis (von setProperty, removeProperty, etc.)
interface PropertyModificationResult {
  success: boolean
  newSource?: string
  change?: { from: number; to: number; insert: string }
  error?: string
}

// Token-Info (von getColorTokens, getSpacingTokens)
interface TokenInfo {
  name: string      // "primary", "sm", etc.
  type: string      // "bg", "col", "pad", "gap", etc.
  value: string     // "#2271C1", "8", etc.
  fullName: string  // "primary.bg", "sm.pad", etc.
}

// Änderungs-Aktion für batchUpdateProperties
interface PropertyChange {
  name: string
  value: string
  action: 'set' | 'remove' | 'toggle'
}
```


### 1. Palette Drop Tests (32 Tests)

Testen das Einfügen neuer Komponenten aus der Palette.

#### Einfache Komponenten

```javascript
// Button, Text, Icon, Frame, Input, etc.
{ name: 'Drop Button into empty Frame',
  setup: 'Frame gap 12, pad 16, bg #1a1a1a',
  drag: { componentName: 'Button', targetNodeId: 'node-1', insertionIndex: 0 },
  expected: { pattern: 'Button', description: '...' } }
```

#### Insertion Positions

```javascript
// First, Middle, Last Position
{ name: 'Drop as first child (before existing)',
  setup: 'Frame gap 12\n  Button "Existing"',
  drag: { componentName: 'Icon', targetNodeId: 'node-1', insertionIndex: 0 },
  ... }
```

#### Nested Containers

```javascript
// 2-3 Level Verschachtelung
{ name: 'Drop into nested Frame (2 levels)',
  setup: 'Frame gap 16\n  Frame gap 8\n    Text "Inner"',
  drag: { componentName: 'Button', targetNodeId: 'node-2', insertionIndex: 1 },
  ... }
```

#### Horizontal Layout

```javascript
// hor, spread, wrap
{ name: 'Drop into horizontal Frame',
  setup: 'Frame hor, gap 12, pad 16',
  drag: { componentName: 'Button', targetNodeId: 'node-1', insertionIndex: 0 },
  ... }
```

#### Zag-Komponenten

```javascript
// Checkbox, Switch, Slider, Select, Dialog
{ name: 'Drop Checkbox into Frame',
  setup: 'Frame gap 12, pad 16',
  drag: { componentName: 'Checkbox', targetNodeId: 'node-1', insertionIndex: 0 },
  ... }
```

### 2. Canvas Move Tests (10 Tests)

Testen das Verschieben bestehender Elemente.

#### Reorder (im selben Container)

```javascript
{ name: 'Move element to first position',
  setup: 'Frame gap 12\n  Text "First"\n  Button "Move Me"\n  Text "Last"',
  move: { sourceNodeId: 'node-3', targetNodeId: 'node-1', insertionIndex: 0 },
  ... }
```

#### Cross-Container

```javascript
{ name: 'Move element to different container',
  setup: 'Frame gap 16\n  Frame gap 8\n    Button "Source"\n  Frame gap 8\n    Text "Target"',
  move: { sourceNodeId: 'node-3', targetNodeId: 'node-4', insertionIndex: 1 },
  ... }
```

#### Horizontal ↔ Vertical

```javascript
{ name: 'Move from vertical to horizontal',
  setup: 'Frame gap 16\n  Frame gap 8\n    Button "V"\n  Frame hor, gap 8\n    Text "H"',
  move: { sourceNodeId: 'node-3', targetNodeId: 'node-4', insertionIndex: 1 },
  ... }
```

---

## Verifikation

### Code-Verifikation

Jeder Test prüft, ob der Code korrekt geändert wurde:

```typescript
// Pattern-Match (enthält erwarteten Code)
expected: { pattern: 'Button "Click"', description: '...' }

// Verifikation prüft:
// 1. Pattern ist im neuen Code enthalten
// 2. Diff zeigt die Änderung
```

### Selection-Verifikation

Nach Drop/Move wird geprüft, ob das Element selektiert ist:

```typescript
// Nach erfolgreichem Drop/Move:
selectionAfter: 'node-5'  // Neue Node-ID
selectionVerification: {
  correct: true,
  expected: 'any (new element)',
  actual: 'node-5'
}
```

**Wichtig**: Ein Test gilt nur als bestanden, wenn BEIDE Verifikationen erfolgreich sind:

- Code-Änderung korrekt ✓
- Element selektiert ✓

### Debug-Output

Bei fehlgeschlagenen Tests:

```
❌ FAILED: No selection after drop
   Expected: Element should be selected after drop
   Actual: null

❌ FAILED: Pattern not found
   Debug: prelude=125, nodes=5
   Diff:
   + Button "New"
```

---

## Fixtures

### Component Fixture Interface

```typescript
interface ComponentFixture {
  componentName: string // 'Button', 'Checkbox', etc.
  properties?: string // 'placeholder "..."'
  textContent?: string // '"Click me"'
  template: string // Vollständiger Code
  hasDefinition?: boolean // Hat : (Definition)
  hasSlots?: boolean // Hat Kind-Slots
  expectedLines: string[] // Erwartete Code-Zeilen
  category: 'simple' | 'zag' | 'chart' | 'layout'
}
```

### Verfügbare Fixtures

#### Simple Components

```typescript
SIMPLE_COMPONENTS = {
  Button: { template: 'Button "Click"', ... },
  Text: { template: 'Text "Hello"', ... },
  Icon: { template: 'Icon "check"', ... },
  Input: { template: 'Input placeholder "..."', ... },
  Frame: { template: 'Frame gap 8', ... },
  Divider: { template: 'Divider', ... },
  Spacer: { template: 'Spacer h 16', ... },
  Image: { template: 'Image src "..."', ... },
  Link: { template: 'Link "Click", href "..."', ... },
  Textarea: { template: 'Textarea placeholder "..."', ... },
}
```

#### Zag Components

```typescript
ZAG_SIMPLE = {
  Switch: { hasSlots: true, expectedLines: ['Switch', '  Track: ...', '  Thumb: ...'], ... },
  Slider: { hasSlots: true, expectedLines: ['Slider', '  Track: ...', '  Range: ...', '  Thumb: ...'], ... },
}

ZAG_WITH_SLOTS = {
  Checkbox: { hasSlots: true, ... },
  Select: { hasSlots: true, ... },
  Dialog: { hasSlots: true, ... },
  Tooltip: { hasSlots: true, ... },
  Tabs: { hasSlots: true, ... },
  RadioGroup: { ... },
  DatePicker: { hasSlots: true, ... },
}
```

#### Chart Components

```typescript
CHART_COMPONENTS = {
  Line: { template: 'Line $data', ... },
  Bar: { template: 'Bar $data', ... },
  Pie: { template: 'Pie $data', ... },
  Donut: { template: 'Donut $data', ... },
  Area: { template: 'Area $data', ... },
}
```

### Helper-Funktionen

```typescript
// Alle Fixtures
import { ALL_COMPONENTS, getFixture, getAllComponentNames } from './fixtures'

// Nach Kategorie
import { getComponentsByCategory } from './fixtures'
getComponentsByCategory('zag') // → ComponentFixture[]

// Spezifische Fixtures
import { getZagFixture, isZagComponent } from './fixtures/zag-components'
import { getChartFixture, isChartComponent } from './fixtures/chart-components'
```

---

## CLI Test-Runner

### Verwendung

```bash
# Standard (headless)
npx tsx tools/drag-test-runner.ts

# Mit sichtbarem Browser
npx tsx tools/drag-test-runner.ts --headed

# Gegen andere URL
npx tsx tools/drag-test-runner.ts --url http://localhost:5173/studio/

# Hilfe
npx tsx tools/drag-test-runner.ts --help
```

### Funktionsweise

1. Startet Chrome via CDP (Chrome DevTools Protocol)
2. Navigiert zur Studio-URL
3. Führt `__dragTest.runAllTests()` aus
4. Sammelt Ergebnisse
5. Gibt Summary aus

### Output

```
🧪 Drag & Drop Test Runner
━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Palette Drop Tests

📋 Drop Button into empty Frame
  ✅ PASSED (45ms)
     Button should be added as child of Frame
     Selection: node-2

📋 Drop Text into empty Frame
  ✅ PASSED (38ms)
     Text should be added as child of Frame
     Selection: node-2

...

🔄 Canvas Move Tests

📋 Move element to first position
  ✅ PASSED (52ms)
     Button should be moved to first position
     Selection: node-2

...

Results: 40/40 passed (0 failed)
```

---

## Eigene Tests schreiben

### Test-Case Format

```typescript
interface DragTestCase {
  name: string // Test-Name
  setup: string // Initial-Code (Mirror DSL)
  drag: {
    componentName: string // Komponente aus Palette
    targetNodeId: string // Ziel-Container ID
    insertionIndex: number // Position (0-basiert)
  }
  expected: {
    pattern: string // Erwarteter Code (Substring)
    description: string // Beschreibung des erwarteten Verhaltens
  }
}

interface CanvasMoveTestCase {
  name: string
  setup: string
  move: {
    sourceNodeId: string // Element das verschoben wird
    targetNodeId: string // Ziel-Container
    insertionIndex: number
  }
  expected: {
    pattern: string
    description: string
  }
}
```

### Beispiel: Neuen Test hinzufügen

In `browser-test-api.ts`, Array `DRAG_TEST_CASES`:

```typescript
{
  name: 'Drop DatePicker into Form',
  setup: 'Frame gap 12, pad 16, bg #1a1a1a\n  Text "Geburtsdatum"',
  drag: {
    componentName: 'DatePicker',
    targetNodeId: 'node-1',
    insertionIndex: 1
  },
  expected: {
    pattern: 'DatePicker',
    description: 'DatePicker should be added after label'
  }
},
```

### Manueller Test

```javascript
// In Browser-Konsole:

// 1. Setup-Code setzen
await __dragTest.setTestCode('Frame gap 12, pad 16, bg #1a1a1a')

// 2. Drop ausführen
const result = await __dragTest.fromPalette('Button').toContainer('node-1').atIndex(0).execute()

// 3. Ergebnis prüfen
console.log('Success:', result.success)
console.log('Code after:', __dragTest.getCode())
console.log('Selection:', __dragTest.getSelection())
```

---

## Troubleshooting

### Problem: "Target element not found"

```javascript
// Node-IDs prüfen:
__dragTest.getNodeIds()
// → ['node-1', 'node-2', 'node-3']

// SourceMap für Details:
__dragTest.getSourceMap()
```

### Problem: "No selection after drop"

Ursache: Selection wird nicht gesetzt nach Code-Änderung.

Lösung: Prüfen, ob `setPendingSelection` in `DropResultApplier` aufgerufen wird.

### Problem: Code-Änderung falsch

```javascript
// Prelude-Offset prüfen:
__dragTest.resetPreludeOffset()

// Snapshot für Details:
__dragTest.snapshot()
```

### Problem: Tests hängen

```javascript
// Animation deaktivieren:
__dragTest.setAnimation({ stepDelay: 0, steps: 1, showCursor: false })
```

---

## Best Practices

1. **Setup einfach halten**: Minimaler Code für reproduzierbare Tests
2. **Node-IDs verstehen**: `node-1` ist erstes Element, Kinder sind `node-2`, `node-3`, etc.
3. **Nach Änderungen neu kompilieren**: `__dragTest.recompile()` nach manuellem `setCode()`
4. **Prelude-Offset beachten**: Studio fügt Prelude hinzu, `setTestCode()` handhabt das
5. **Selection prüfen**: Immer `getSelection()` nach Drop/Move prüfen

---

## Verwandte Dokumentation

- `CLAUDE.md` - Projekt-Übersicht
- `docs/concepts/drag-and-drop.md` - Drag & Drop Konzept (falls vorhanden)
- `studio/preview/drag/README.md` - Drag-System Details (falls vorhanden)
