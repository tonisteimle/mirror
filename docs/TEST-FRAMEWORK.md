# Mirror Test Framework

Umfassendes Test-Framework für das Mirror Studio mit Browser-basierter End-to-End-Testausführung.

## Übersicht

Das Framework bietet:

- **Echtes E2E-Testing**: Tests laufen im Browser mit echtem DOM
- **Extrem schnell**: ~225 Tests in unter 30 Sekunden
- **Robuster als Playwright**: Keine Flakiness durch direkte API-Integration
- **Vollständige API-Abdeckung**: Editor, Preview, Panels, Zag-Komponenten, History

## Quick Start

### Browser-Tests ausführen

```javascript
// In der Browser-Konsole

// Alle Mirror-Tests ausführen (~225 Tests)
__mirrorTest.runAll()

// Einzelne Kategorie
__mirrorTest.runCategory('zag')

// Einzelnen Test
__mirrorTest.run([
  testWithSetup('Button rendert', 'Button "Click"', async api => {
    api.assert.exists('node-1')
    api.dom.expect('node-1', { tag: 'button', text: 'Click' })
  }),
])
```

### Browser Filter API

Neue Convenience-Methoden für einfaches Test-Filtering direkt in der Browser-Konsole:

```javascript
// Tests nach Pattern filtern (case-insensitive)
__mirrorTest.filter('Button') // Alle Tests mit "Button" im Namen
__mirrorTest.filter('hover') // Alle Hover-Tests

// Tests nach Kategorie ausführen
__mirrorTest.category('zag') // Alle Zag-Tests
__mirrorTest.category('layout') // Alle Layout-Tests

// Einzelnen Test ausführen
__mirrorTest.only('Checkbox toggle') // Exakter oder partieller Match

// Tests auflisten
__mirrorTest.list() // Alle Kategorien mit Testanzahl
__mirrorTest.list('drag') // Tests einer Kategorie auflisten
```

### Debug Mode

Step-by-Step Debugging für einzelne Tests:

```javascript
// Test im Debug-Modus starten
__mirrorTest.debug('Checkbox toggle')

// Während Debug:
__mirrorTest.step() // Weiter zum nächsten Schritt
__mirrorTest.abort() // Test abbrechen

// Output:
// 🐛 DEBUG MODE: Checkbox toggle
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Controls:
//   __mirrorTest.step()  - Continue to next step
//   __mirrorTest.abort() - Abort test
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📝 Setup: Loading code...
//    Code loaded. Continue with __mirrorTest.step() or Enter
```

### CLI Test-Runner

```bash
# Studio Server starten (Terminal 1)
npm run studio

# Tests ausführen (Terminal 2)
npx tsx tools/test.ts                     # Alle Browser Tests
npx tsx tools/test.ts --category=zag      # Nur Zag-Tests
npx tsx tools/test.ts --filter="Button"   # Filter nach Name
npx tsx tools/test.ts --headed            # Mit sichtbarem Browser
npx tsx tools/test.ts --junit=results.xml # JUnit Report für CI
```

---

## Architektur

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLI Test Runner                                    │
│                      (tools/drag-test-runner.ts)                            │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│
│  │ Chrome      │  │ CDP Client  │  │ Console     │  │ Reporters           ││
│  │ Launcher    │  │             │  │ Collector   │  │ (Console/JUnit/HTML)││
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Browser Test API                                   │
│                      (studio/test-api/index.ts)                             │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│
│  │ TestRunner  │  │ Assertions  │  │ DOM Bridge  │  │ Test Suites         ││
│  │             │  │             │  │             │  │ (~225 Tests)        ││
│  │ - runSuite()│  │ - equals()  │  │ - expect()  │  │                     ││
│  │ - runTest() │  │ - exists()  │  │ - verify()  │  │ - primitives        ││
│  │             │  │ - hasStyle()│  │ - verifyAll │  │ - layout            ││
│  └─────────────┘  └─────────────┘  └─────────────┘  │ - styling           ││
│                                                      │ - zag               ││
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │ - interactions      ││
│  │ EditorAPI   │  │ PreviewAPI  │  │ InteractAPI │  │ - bidirectional     ││
│  │             │  │             │  │             │  │ - undo-redo         ││
│  │ - getCode() │  │ - inspect() │  │ - click()   │  │ - autocomplete      ││
│  │ - setCode() │  │ - query()   │  │ - hover()   │  └─────────────────────┘│
│  │ - undo()    │  │ - waitFor() │  │ - type()    │                         │
│  └─────────────┘  └─────────────┘  └─────────────┘                         │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│  │ PanelAPI   │  │ ZagAPI      │  │ StudioAPI   │                         │
│  │             │  │             │  │             │                         │
│  │ - property  │  │ - isOpen()  │  │ - history   │                         │
│  │ - tree      │  │ - isChecked │  │ - viewport  │                         │
│  │ - files     │  │ - getValue()│  │ - selection │                         │
│  └─────────────┘  └─────────────┘  └─────────────┘                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Mirror Studio                                      │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│
│  │ Editor      │  │ Preview     │  │ Panels      │  │ Compiler            ││
│  │ (CodeMirror)│  │ (DOM)       │  │ (Property)  │  │                     ││
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Dateien & Struktur

### Kern-Dateien

| Datei                             | Beschreibung                            |
| --------------------------------- | --------------------------------------- |
| `studio/test-api/index.ts`        | Haupt-Export, Browser-Integration       |
| `studio/test-api/test-runner.ts`  | TestRunner Klasse, Test-Ausführung      |
| `studio/test-api/types.ts`        | Alle TypeScript-Interfaces              |
| `studio/test-api/assertions.ts`   | Assertion-Bibliothek                    |
| `studio/test-api/interactions.ts` | Interaktions-Bibliothek                 |
| `studio/test-api/inspector.ts`    | Preview-Inspektor                       |
| `studio/test-api/dom-bridge.ts`   | Deklarative DOM-Validierung             |
| `studio/test-api/panel-api.ts`    | Property/Tree/Files Panel API           |
| `studio/test-api/zag-api.ts`      | Zag-Komponenten API                     |
| `studio/test-api/studio-api.ts`   | Studio-Level API (inkl. Test Isolation) |
| `studio/test-api/fixtures.ts`     | Test-Fixtures API                       |

### Test-Suites

Die Tests sind in Verzeichnisse organisiert, wobei jede Kategorie eigene `.test.ts` Dateien enthält:

| Verzeichnis              | Tests | Dateien                                                                                                                                                                   |
| ------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `suites/primitives/`     | ~25   | basic.test.ts, semantic.test.ts, headings.test.ts                                                                                                                         |
| `suites/layout/`         | ~35   | direction.test.ts, alignment.test.ts, gap.test.ts, stacked.test.ts, grid.test.ts, nesting.test.ts                                                                         |
| `suites/styling/`        | ~50   | colors.test.ts, sizing.test.ts, spacing.test.ts, borders.test.ts, typography.test.ts, effects.test.ts                                                                     |
| `suites/zag/`            | ~30   | checkbox.test.ts, switch.test.ts, slider.test.ts, select.test.ts, radio-group.test.ts, dialog.test.ts, tooltip.test.ts, tabs.test.ts, date-picker.test.ts, layout.test.ts |
| `suites/interactions/`   | ~30   | Click, Hover, Focus, Input                                                                                                                                                |
| `suites/bidirectional/`  | ~20   | Code ↔ Preview Sync                                                                                                                                                       |
| `suites/undo-redo/`      | ~15   | History Management                                                                                                                                                        |
| `suites/autocomplete/`   | ~20   | Completions                                                                                                                                                               |
| `suites/property-panel/` | ~25   | Token-Buttons, Property-Änderungen                                                                                                                                        |
| `suites/drag/`           | ~46   | Stacked Drag, Flex Reorder                                                                                                                                                |
| `suites/workflow/`       | ~30   | End-to-End Workflows                                                                                                                                                      |
| `suites/charts/`         | ~15   | Chart-Komponenten                                                                                                                                                         |

Zusätzliche Test-Dateien:

| Datei                                 | Tests | Beschreibung                                                  |
| ------------------------------------- | ----- | ------------------------------------------------------------- |
| `suites/compiler-tests.ts`            | ~20   | Compiler IR & Backend                                         |
| `suites/layout-verification-tests.ts` | ~15   | Visuelle Layout-Verifikation                                  |
| `suites/test-system-tests.ts`         | ~20   | Test-Framework Features (Fixtures, Isolation, Keyboard, Wait) |

### CLI Test-Runner

| Datei                          | Beschreibung                  |
| ------------------------------ | ----------------------------- |
| `tools/drag-test-runner.ts`    | CLI Entry Point               |
| `tools/test-runner/chrome.ts`  | Chrome Launcher               |
| `tools/test-runner/cdp.ts`     | CDP Client                    |
| `tools/test-runner/runner.ts`  | Test Orchestration            |
| `tools/test-runner/reporters/` | Console, JUnit, HTML Reporter |

---

## Test API Referenz

### TestAPI (Haupt-Interface)

Jeder Test erhält ein `TestAPI`-Objekt mit allen Sub-APIs:

```typescript
interface TestAPI {
  editor: EditorAPI // Code-Editor Kontrolle
  preview: PreviewAPI // DOM-Inspektion
  interact: InteractionAPI // Benutzer-Interaktionen (inkl. Keyboard)
  assert: AssertionAPI // Assertions
  dom: DOMAPI // Deklarative DOM-Validierung
  state: StateAPI // Anwendungs-State
  utils: UtilsAPI // Hilfsfunktionen (inkl. Wait-Helpers)
  panel: PanelAPI // UI-Panels
  zag: ZagAPI // Zag-Komponenten
  studio: StudioAPI // Studio-Level Operationen (inkl. Test Isolation)
  fixtures: FixturesAPI // Test-Fixtures (vordefinierte Szenarien)
}
```

---

### EditorAPI

Kontrolle des Code-Editors (CodeMirror).

```typescript
interface EditorAPI {
  getCode(): string
  setCode(code: string): Promise<void>
  insertAt(code: string, line: number, indent?: number): void
  getCursor(): { line: number; column: number }
  setCursor(line: number, column: number): void
  triggerAutocomplete(): void
  getCompletions(): string[]
  undo(): void
  redo(): void
}
```

**Beispiele:**

```typescript
// Code setzen und auf Kompilierung warten
await api.editor.setCode('Button "Click", bg #2271C1')

// Aktuellen Code prüfen
const code = api.editor.getCode()
api.assert.contains(code, 'Button')

// Undo/Redo
api.editor.undo()
api.editor.redo()

// Autocomplete testen
api.editor.setCursor(1, 10)
api.editor.triggerAutocomplete()
const completions = api.editor.getCompletions()
api.assert.ok(completions.includes('bg'), 'Should suggest bg')
```

---

### PreviewAPI

Inspektion des gerenderten DOMs.

```typescript
interface PreviewAPI {
  getNodeIds(): string[]
  inspect(nodeId: string): ElementInfo | null
  query(selector: string): ElementInfo[]
  findByText(text: string, options?: { exact?: boolean }): ElementInfo | null
  getRoot(): ElementInfo | null
  getChildren(nodeId: string): ElementInfo[]
  exists(nodeId: string): boolean
  waitFor(nodeId: string, timeout?: number): Promise<ElementInfo>
  screenshot(): Promise<string>
}

interface ElementInfo {
  nodeId: string
  tagName: string
  textContent: string
  fullText: string
  styles: ComputedStyles
  attributes: Record<string, string>
  dataAttributes: Record<string, string>
  bounds: DOMRect
  children: string[]
  parent: string | null
  visible: boolean
  interactive: boolean
}
```

**Beispiele:**

```typescript
// Element inspizieren
const info = api.preview.inspect('node-1')
console.log(info.tagName) // 'div'
console.log(info.styles.backgroundColor) // 'rgb(34, 113, 193)'
console.log(info.children) // ['node-2', 'node-3']

// Alle Node-IDs
const nodeIds = api.preview.getNodeIds() // ['node-1', 'node-2', ...]

// Nach Text suchen
const btn = api.preview.findByText('Click me')

// Auf Element warten
const element = await api.preview.waitFor('node-5', 2000)
```

---

### InteractionAPI

Simulation von Benutzer-Interaktionen.

```typescript
interface KeyModifiers {
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
}

interface InteractionAPI {
  // Maus-Events
  click(nodeId: string): Promise<void>
  doubleClick(nodeId: string): Promise<void>
  hover(nodeId: string): Promise<void>
  unhover(nodeId: string): Promise<void>

  // Fokus
  focus(nodeId: string): Promise<void>
  blur(nodeId: string): Promise<void>

  // Text-Eingabe
  type(nodeId: string, text: string): Promise<void>
  clear(nodeId: string): Promise<void>

  // Keyboard (mit Modifier-Unterstützung)
  pressKey(key: string, modifiers?: KeyModifiers): Promise<void>
  pressKeyOn(nodeId: string, key: string, modifiers?: KeyModifiers): Promise<void>
  pressSequence(keys: string[], delayBetween?: number): Promise<void>
  typeText(text: string, delayPerChar?: number): Promise<void>

  // Selection
  select(nodeId: string): void
  clearSelection(): void

  // Drag & Drop
  dragFromPalette(component: string, target: string, index: number): Promise<void>
  dragToPosition(component: string, target: string, x: number, y: number): Promise<void>
  moveElement(source: string, target: string, index: number): Promise<void>
}
```

**Beispiele:**

```typescript
// Button klicken
await api.interact.click('node-1')

// Text eingeben
await api.interact.type('node-2', 'Hello World')
await api.interact.clear('node-2')

// Hover
await api.interact.hover('node-1')
await api.utils.delay(100)
await api.interact.unhover('node-1')

// Keyboard mit Modifiern
await api.interact.pressKey('s', { ctrl: true }) // Ctrl+S
await api.interact.pressKey('z', { ctrl: true, shift: true }) // Ctrl+Shift+Z
await api.interact.pressKey('c', { meta: true }) // Cmd+C (Mac)

// Key auf spezifischem Element
await api.interact.pressKeyOn('node-1', 'Enter')
await api.interact.pressKeyOn('node-1', 'ArrowDown', { shift: true })

// Key-Sequenz (z.B. für Navigation)
await api.interact.pressSequence(['ArrowDown', 'ArrowDown', 'Enter'])
await api.interact.pressSequence(['Tab', 'Tab', 'Space'], 100) // mit Delay

// Text Zeichen für Zeichen tippen
await api.interact.typeText('Hello World', 20) // 20ms pro Zeichen

// Element selektieren (im Editor)
api.interact.select('node-2')

// Drag & Drop
await api.interact.dragFromPalette('Button', 'node-1', 0)
await api.interact.moveElement('node-3', 'node-1', 0)
```

---

### AssertionAPI

Klassische Assertions für Tests.

```typescript
interface AssertionAPI {
  ok(condition: boolean, message?: string): void
  equals<T>(actual: T, expected: T, message?: string): void
  matches(actual: string, pattern: RegExp, message?: string): void
  contains(actual: string, substring: string, message?: string): void
  hasStyle(nodeId: string, property: keyof ComputedStyles, value: string): void
  hasText(nodeId: string, text: string, options?: { exact?: boolean }): void
  exists(nodeId: string, message?: string): void
  isVisible(nodeId: string, message?: string): void
  hasChildren(nodeId: string, count: number): void
  hasAttribute(nodeId: string, attr: string, value?: string): void
  codeContains(pattern: string | RegExp): void
  codeEquals(expected: string): void
  isSelected(nodeId: string): void
}
```

**Beispiele:**

```typescript
// Basis-Assertions
api.assert.ok(true, 'Should be true')
api.assert.equals(value, 42, 'Value should be 42')
api.assert.contains(text, 'hello')

// DOM-Assertions
api.assert.exists('node-1')
api.assert.isVisible('node-1')
api.assert.hasChildren('node-1', 3)
api.assert.hasText('node-1', 'Hello')
api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
api.assert.hasAttribute('node-1', 'data-testid', 'my-button')

// Code-Assertions
api.assert.codeContains('Button "Click"')
api.assert.codeContains(/bg #[0-9a-fA-F]{6}/)

// Selection
api.assert.isSelected('node-2')
```

---

### DOMAPI (DOM Bridge)

Deklarative DOM-Validierung mit Mirror DSL-Properties.

```typescript
interface DOMAPI {
  expect(nodeId: string, expectations: DOMExpectations): void
  verify(nodeId: string, expectations: DOMExpectations): DOMVerifyResult
  verifyAll(expectations: Record<string, DOMExpectations>): DOMVerifyResult[]
  verifyTree(rootId: string, tree: DOMTreeExpectation): DOMVerifyResult[]
}

interface DOMExpectations {
  // Element
  tag?: string
  exists?: boolean
  visible?: boolean
  // Text
  text?: string
  textContains?: string
  // Children
  children?: number | string[]
  childTags?: string[]
  // Layout
  hor?: boolean
  ver?: boolean
  wrap?: boolean
  center?: boolean
  spread?: boolean
  // Dimensions
  w?: number | 'full' | 'auto'
  h?: number | 'full' | 'auto'
  // Spacing
  pad?: number | [number, number] | [number, number, number, number]
  gap?: number
  // Colors
  bg?: string
  col?: string
  boc?: string
  // Border
  bor?: number
  rad?: number
  // Typography
  fs?: number
  weight?: string | number
  italic?: boolean
  uppercase?: boolean
  // Effects
  shadow?: boolean
  opacity?: number
  // Attributes
  placeholder?: string
  href?: string
  src?: string
}
```

**Beispiele:**

```typescript
// Einzelnes Element validieren
api.dom.expect('node-1', {
  tag: 'div',
  bg: '#2271C1',
  pad: 16,
  gap: 12,
  hor: true,
  children: 3,
})

// Button mit allen Properties
api.dom.expect('node-2', {
  tag: 'button',
  text: 'Click me',
  bg: '#2271C1',
  col: 'white',
  pad: [12, 24],
  rad: 6,
})

// Multiple Elemente
api.dom.verifyAll({
  'node-1': { tag: 'div', children: 2 },
  'node-2': { tag: 'button', text: 'Save' },
  'node-3': { tag: 'button', text: 'Cancel' },
})

// Baum-Struktur
api.dom.verifyTree('node-1', {
  tag: 'div',
  children: [
    { tag: 'span', text: 'Title' },
    { tag: 'button', text: 'Action' },
  ],
})
```

---

### PanelAPI

Kontrolle der UI-Panels.

```typescript
interface PanelAPI {
  property: PropertyPanelAPI
  tree: TreePanelAPI
  files: FilesPanelAPI
}

interface PropertyPanelAPI {
  isVisible(): boolean
  getSelectedNodeId(): string | null
  getPropertyValue(name: string): string | null
  getAllProperties(): Record<string, string>
  setProperty(name: string, value: string): Promise<boolean>
  removeProperty(name: string): Promise<boolean>
  toggleProperty(name: string, enabled: boolean): Promise<boolean>
  getTokenOptions(property: string): string[]
  clickToken(property: string, tokenName: string): Promise<boolean>
  getSections(): string[]
  isSectionExpanded(sectionName: string): boolean
  toggleSection(sectionName: string): void
  getInputValue(inputName: string): string | null
  setInputValue(inputName: string, value: string): Promise<boolean>
}

interface TreePanelAPI {
  getNodes(): TreeNode[]
  getSelected(): string | null
  select(nodeId: string): void
  expand(nodeId: string): void
  collapse(nodeId: string): void
  expandAll(): void
  collapseAll(): void
}

interface FilesPanelAPI {
  list(): string[]
  getContent(filename: string): string | null
  create(name: string, content?: string): Promise<boolean>
  open(name: string): Promise<boolean>
  delete(name: string): Promise<boolean>
  rename(oldName: string, newName: string): Promise<boolean>
  getCurrentFile(): string | null
  getFileType(filename: string): string
}
```

**Beispiele:**

```typescript
// Property Panel
api.assert.ok(api.panel.property.isVisible(), 'Panel should be visible')

const selectedId = api.panel.property.getSelectedNodeId()
api.assert.equals(selectedId, 'node-1')

// Property lesen
const bgValue = api.panel.property.getPropertyValue('bg')
api.assert.equals(bgValue, '#2271C1')

// Property setzen
await api.panel.property.setProperty('pad', '24')

// Token verwenden
const tokens = api.panel.property.getTokenOptions('pad')
api.assert.ok(tokens.includes('sm'))
await api.panel.property.clickToken('pad', 'sm')

// Tree Panel
const nodes = api.panel.tree.getNodes()
api.panel.tree.select('node-2')
api.panel.tree.expandAll()

// Files Panel
const files = api.panel.files.list()
await api.panel.files.create('new.mir', 'Frame\n  Text "Hello"')
await api.panel.files.open('new.mir')
```

---

### ZagAPI

Zugriff auf Zag-Komponenten State Machines.

```typescript
interface ZagAPI {
  // State Access
  getState(nodeId: string): ZagState | null

  // Overlay Components (Dialog, Tooltip, Select)
  isOpen(nodeId: string): boolean
  open(nodeId: string): Promise<void>
  close(nodeId: string): Promise<void>

  // Form Controls (Checkbox, Switch)
  isChecked(nodeId: string): boolean
  check(nodeId: string): Promise<void>
  uncheck(nodeId: string): Promise<void>
  toggle(nodeId: string): Promise<void>

  // Value Components (Slider, Input, Select)
  getValue(nodeId: string): unknown
  setValue(nodeId: string, value: unknown): Promise<void>

  // Tabs
  getActiveTab(nodeId: string): string | null
  selectTab(nodeId: string, tabValue: string): Promise<void>
  getAllTabs(nodeId: string): string[]

  // Select/Dropdown
  getSelectedOption(nodeId: string): string | null
  selectOption(nodeId: string, optionValue: string): Promise<void>
  getOptions(nodeId: string): string[]

  // Radio Group
  getSelectedRadio(nodeId: string): string | null
  selectRadio(nodeId: string, value: string): Promise<void>

  // Events
  send(nodeId: string, event: string, payload?: unknown): Promise<void>
}

interface ZagState {
  scope: string
  value: string
  context: Record<string, unknown>
}
```

**Beispiele:**

```typescript
// Checkbox
api.assert.ok(!api.zag.isChecked('node-1'), 'Should be unchecked')
await api.zag.check('node-1')
api.assert.ok(api.zag.isChecked('node-1'), 'Should be checked')
await api.zag.toggle('node-1')

// Dialog
api.assert.ok(!api.zag.isOpen('node-1'), 'Dialog should be closed')
await api.zag.open('node-1')
api.assert.ok(api.zag.isOpen('node-1'), 'Dialog should be open')
await api.zag.close('node-1')

// Slider
const value = api.zag.getValue('node-1')
api.assert.equals(value, 50)
await api.zag.setValue('node-1', 75)

// Tabs
const activeTab = api.zag.getActiveTab('node-1')
api.assert.equals(activeTab, 'home')
await api.zag.selectTab('node-1', 'profile')
const allTabs = api.zag.getAllTabs('node-1')
api.assert.ok(allTabs.includes('home'))

// Select
await api.zag.open('node-1')
await api.zag.selectOption('node-1', 'Berlin')
const selected = api.zag.getSelectedOption('node-1')
api.assert.equals(selected, 'Berlin')

// Radio Group
const selectedRadio = api.zag.getSelectedRadio('node-1')
await api.zag.selectRadio('node-1', 'option-b')

// State Machine Details
const state = api.zag.getState('node-1')
console.log(state.scope) // 'checkbox'
console.log(state.value) // 'checked'
console.log(state.context) // { disabled: false, ... }
```

---

### StudioAPI

Studio-Level Operationen.

```typescript
interface StudioStateSnapshot {
  code: string
  selection: string | null
  nodeIds: string[]
  undoStackSize: number
  redoStackSize: number
  compileErrors: string[]
}

interface StudioAPI {
  history: HistoryAPI
  viewport: ViewportAPI

  // Test Isolation
  reset(): Promise<void> // Studio komplett zurücksetzen
  resetSelection(): void // Nur Selection clearen
  getStateSnapshot(): StudioStateSnapshot // State-Snapshot für Vergleiche

  // Project Management
  newProject(): Promise<void>
  loadExample(name: string): Promise<boolean>

  // Compilation
  compile(): Promise<void>
  getAST(): unknown
  getIR(): unknown
  getSourceMap(): unknown
  getCompileErrors(): string[]
  getGeneratedCode(): string

  // UI State
  getTheme(): 'light' | 'dark'
  setTheme(theme: 'light' | 'dark'): void
  isPanelVisible(panel: string): boolean
  setPanelVisible(panel: string, visible: boolean): void

  // Selection
  getSelection(): string | null
  setSelection(nodeId: string | null): Promise<void>
  clearSelection(): void

  // Notifications
  toast(message: string, type?: 'success' | 'error' | 'info'): Promise<void>

  // Wait Helpers
  waitForCompile(timeout?: number): Promise<void>
  waitForSelection(timeout?: number): Promise<string>
}

interface HistoryAPI {
  canUndo(): boolean
  canRedo(): boolean
  getUndoStackSize(): number
  getRedoStackSize(): number
  getLastCommand(): string | null
  undo(): Promise<boolean>
  redo(): Promise<boolean>
  clear(): void
}

interface ViewportAPI {
  getSize(): { width: number; height: number }
  setSize(width: number, height: number): Promise<void>
  getZoom(): number
  setZoom(zoom: number): Promise<void>
  scrollTo(x: number, y: number): Promise<void>
  getScroll(): { x: number; y: number }
}
```

**Beispiele:**

```typescript
// Test Isolation - Vor jedem Test aufrufen
await api.studio.reset() // Leert Editor, History, Selection

// State-Snapshot für Vergleiche
const before = api.studio.getStateSnapshot()
// ... Test-Operationen ...
const after = api.studio.getStateSnapshot()
api.assert.ok(after.undoStackSize > before.undoStackSize, 'Undo stack grew')

// Nur Selection clearen
api.studio.resetSelection()

// Selection
await api.studio.setSelection('node-2')
const selection = api.studio.getSelection()
api.assert.equals(selection, 'node-2')
api.studio.clearSelection()

// History
api.assert.ok(api.studio.history.canUndo(), 'Should be able to undo')
await api.studio.history.undo()
api.assert.ok(api.studio.history.canRedo(), 'Should be able to redo')
await api.studio.history.redo()
api.studio.history.clear()

// Compilation
await api.studio.compile()
const errors = api.studio.getCompileErrors()
api.assert.ok(errors.length === 0, 'No compile errors')

// Theme
api.studio.setTheme('dark')
api.assert.equals(api.studio.getTheme(), 'dark')

// Viewport
await api.studio.viewport.setSize(800, 600)
await api.studio.viewport.setZoom(1.5)

// Wait Helpers
await api.studio.waitForCompile(3000)
const selected = await api.studio.waitForSelection(2000)
```

---

### UtilsAPI

Hilfsfunktionen für Tests.

```typescript
interface UtilsAPI {
  delay(ms: number): Promise<void>
  waitForCompile(timeout?: number): Promise<void>
  waitUntil(condition: () => boolean, timeout?: number): Promise<void>
  waitForElement(nodeId: string, timeout?: number): Promise<HTMLElement>
  waitForStyle(nodeId: string, property: string, value: string, timeout?: number): Promise<void>
  waitForCount(selector: string, count: number, timeout?: number): Promise<void>
  waitForAnimation(nodeId?: string, timeout?: number): Promise<void>
  waitForIdle(timeout?: number): Promise<void>
  log(message: string): void
  snapshot(): { code: string; nodeIds: string[]; selection: string | null }
}
```

**Beispiele:**

```typescript
// Basis-Warten
await api.utils.delay(100)
await api.utils.waitForCompile()
await api.utils.waitUntil(() => api.preview.exists('node-5'), 2000)

// Auf Element warten
const element = await api.utils.waitForElement('node-1')
console.log(element.tagName)

// Auf Style-Änderung warten
await api.utils.waitForStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')

// Auf Anzahl Elemente warten
await api.utils.waitForCount('[data-mirror-id]', 5)

// Auf Animation warten
await api.utils.waitForAnimation('node-1')
await api.utils.waitForAnimation() // Alle Animationen

// Auf Idle-State warten (keine pending Updates)
await api.utils.waitForIdle()

// Logging
api.utils.log('Test checkpoint reached')

// Snapshot
const snapshot = api.utils.snapshot()
console.log(snapshot.code)
console.log(snapshot.nodeIds)
console.log(snapshot.selection)
```

---

### FixturesAPI

Vordefinierte Test-Szenarien für wiederverwendbares Testing.

```typescript
interface Fixture {
  name: string
  category: 'layout' | 'components' | 'zag' | 'styling' | 'states' | 'test'
  code: string
  description?: string
}

interface FixturesAPI {
  // Fixture abrufen
  list(): string[] // Alle verfügbaren Fixtures
  get(name: string): Fixture | undefined // Fixture nach Name
  getByCategory(category: string): Fixture[] // Fixtures einer Kategorie

  // Fixture laden
  load(name: string): Promise<void> // Built-in Fixture laden
  loadCode(code: string): Promise<void> // Custom Code laden

  // Custom Fixtures
  register(fixture: Fixture): void // Eigene Fixture registrieren
}
```

**Built-in Fixtures:**

| Kategorie    | Name                | Beschreibung                      |
| ------------ | ------------------- | --------------------------------- |
| `layout`     | `horizontal-layout` | 3 Texte horizontal mit gap        |
| `layout`     | `vertical-layout`   | 3 Texte vertikal mit gap          |
| `layout`     | `grid-layout`       | 12-Spalten Grid                   |
| `layout`     | `nested-layout`     | Verschachtelte Frames             |
| `layout`     | `stacked-layout`    | Overlay mit stacked               |
| `components` | `button-variants`   | Primary, Secondary, Ghost Buttons |
| `components` | `input-form`        | Input mit Label und Validation    |
| `components` | `card-layout`       | Card mit Header, Body, Footer     |
| `components` | `icon-buttons`      | Buttons mit Icons                 |
| `components` | `navigation-bar`    | Navigation mit Links              |
| `zag`        | `checkbox-form`     | Checkbox Gruppe                   |
| `zag`        | `tabs-content`      | Tabs mit Content                  |
| `zag`        | `dialog-modal`      | Dialog mit Trigger und Content    |
| `styling`    | `color-palette`     | Verschiedene Farben               |
| `styling`    | `spacing-scale`     | Spacing-Varianten                 |
| `styling`    | `shadow-examples`   | Shadow sm, md, lg                 |
| `states`     | `hover-states`      | Hover-Effekte                     |
| `states`     | `toggle-states`     | Toggle on/off                     |
| `states`     | `disabled-states`   | Disabled Elements                 |

**Beispiele:**

```typescript
// Verfügbare Fixtures auflisten
const fixtures = api.fixtures.list()
console.log(fixtures) // ['horizontal-layout', 'button-variants', ...]

// Fixture laden
await api.fixtures.load('horizontal-layout')
await api.utils.delay(200)

// Element inspizieren
const nodeIds = api.preview.getNodeIds()
api.assert.ok(nodeIds.length >= 4, 'Should have Frame + 3 Text nodes')

// Fixtures einer Kategorie holen
const layoutFixtures = api.fixtures.getByCategory('layout')
api.assert.ok(layoutFixtures.length >= 5, 'Should have layout fixtures')

// Custom Code laden
await api.fixtures.loadCode(`
Frame gap 12, pad 16, bg #1a1a1a
  Button "Primary", bg #2271C1, col white
  Button "Secondary", bg #333, col white
`)

// Eigene Fixture registrieren
api.fixtures.register({
  name: 'my-test-fixture',
  category: 'test',
  code: 'Frame gap 8\n  Button "Test"',
  description: 'Meine Test-Fixture',
})

// Registrierte Fixture verwenden
await api.fixtures.load('my-test-fixture')
```

**Verwendung in Tests:**

```typescript
export const myTests: TestCase[] = [
  {
    name: 'Layout Test mit Fixture',
    category: 'layout',
    run: async api => {
      // Fixture laden statt manuellem Setup
      await api.fixtures.load('horizontal-layout')
      await api.utils.delay(200)

      // Testen
      const root = api.preview.inspect(api.preview.getNodeIds()[0])
      api.assert.ok(root?.styles.flexDirection === 'row', 'Should be horizontal')
    },
  },

  {
    name: 'Custom Fixture Test',
    category: 'test',
    run: async api => {
      // Custom Code als Fixture
      await api.fixtures.loadCode(`
        Frame gap 16, center
          Text "Hello World", fs 24
      `)
      await api.utils.delay(200)

      const text = api.preview.findByText('Hello World')
      api.assert.ok(text !== null, 'Should find text')
    },
  },
]
```

---

## Tests schreiben

### Test-Helfer

```typescript
import { test, testWithSetup, testOnly, testSkip, describe } from '../test-runner'

// Einfacher Test
test('Test name', async api => {
  // Test code
})

// Test mit Setup-Code
testWithSetup('Test name', 'Frame gap 8\n  Button "Click"', async api => {
  // Test code (setup wird automatisch kompiliert)
})

// Nur diesen Test ausführen
testOnly('Test name', async api => {
  // ...
})

// Test überspringen
testSkip('Test name', async api => {
  // ...
})

// Tests gruppieren
const myTests = describe('Category', [
  testWithSetup('Test 1', '...', async api => {}),
  testWithSetup('Test 2', '...', async api => {}),
])
```

### Beispiel: Kompletter Test

```typescript
import { testWithSetup, describe, type TestCase } from '../test-runner'
import type { TestAPI } from '../types'

export const buttonTests: TestCase[] = describe('Button', [
  testWithSetup(
    'Button rendert mit korrektem Styling',
    'Button "Save", bg #2271C1, col white, pad 12 24, rad 6',
    async (api: TestAPI) => {
      // 1. Existenz prüfen
      api.assert.exists('node-1')

      // 2. Deklarative DOM-Validierung
      api.dom.expect('node-1', {
        tag: 'button',
        text: 'Save',
        bg: '#2271C1',
        pad: [12, 24],
        rad: 6,
      })

      // 3. Interaktion testen
      await api.interact.click('node-1')
    }
  ),

  testWithSetup(
    'Button mit Hover-State',
    `Button "Hover me", bg #333
  hover:
    bg #444`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial background
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')

      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(100)
      // Hover-State testen...
    }
  ),
])

export const allButtonTests = buttonTests
```

### Beispiel: Zag-Komponenten testen

```typescript
export const dialogTests: TestCase[] = describe('Dialog', [
  testWithSetup(
    'Dialog öffnet und schließt',
    `Dialog
  Trigger: Button "Open"
  Content: Frame pad 24, bg white
    Text "Content"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial geschlossen
      api.assert.ok(!api.zag.isOpen('node-1'), 'Dialog should be closed')

      // Öffnen
      await api.zag.open('node-1')
      await api.utils.delay(100)
      api.assert.ok(api.zag.isOpen('node-1'), 'Dialog should be open')

      // Schließen
      await api.zag.close('node-1')
      await api.utils.delay(100)
      api.assert.ok(!api.zag.isOpen('node-1'), 'Dialog should be closed')
    }
  ),
])
```

### Beispiel: Property Panel testen

```typescript
export const propertyPanelTests: TestCase[] = describe('Property Panel', [
  testWithSetup(
    'Property-Änderung aktualisiert Code',
    'Frame pad 16, bg #333',
    async (api: TestAPI) => {
      // Element selektieren
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      // Property Panel prüfen
      api.assert.ok(api.panel.property.isVisible())

      // Property ändern
      await api.panel.property.setProperty('pad', '24')
      await api.utils.delay(200)

      // Code prüfen
      api.assert.codeContains('pad 24')
    }
  ),
])
```

---

## CLI Test-Runner

### Optionen

```bash
npx tsx tools/test.ts [options]
```

| Option             | Beschreibung                   |
| ------------------ | ------------------------------ |
| `--drag`           | Nur Drag & Drop Tests          |
| `--mirror`         | Mirror Test Suite (~225 Tests) |
| `--category=X`     | Einzelne Kategorie             |
| `--filter=PATTERN` | Filter nach Name (Regex)       |
| `--headed`         | Browser sichtbar               |
| `--bail`           | Bei erstem Fehler stoppen      |
| `--retries=N`      | N Retries bei Failure          |
| `--timeout=MS`     | Timeout pro Test               |
| `--junit=PATH`     | JUnit XML Report (für CI)      |
| `--html=PATH`      | HTML Report                    |
| `--no-screenshot`  | Keine Screenshots              |

### NPM Scripts

```bash
npm run test:browser              # Alle Browser Tests (default)
npm run test:browser:drag         # Nur Drag & Drop Tests
npm run test:browser:mirror       # Nur Mirror Tests
npm run test:browser:headed       # Mit sichtbarem Browser
```

### Kategorien

```bash
--category=primitives    # Frame, Text, Button, etc.
--category=layout        # hor, ver, gap, grid, stacked
--category=styling       # bg, col, pad, rad, shadow
--category=zag           # Dialog, Tabs, Select, Checkbox
--category=interactions  # Click, Hover, Focus, Input
--category=bidirectional # Code ↔ Preview Sync
--category=undoRedo      # History Management
--category=autocomplete  # Completions
--category=testSystem    # Test-Framework Features
```

### Output

```
🧪 Running Mirror Tests...

📦 Zag
  ✅ Checkbox renders with label (45ms)
  ✅ Checkbox toggle interaction (62ms)
  ✅ Switch renders (38ms)
  ✅ Dialog open/close interaction (89ms)
  ...

📦 Layout
  ✅ Horizontal layout with gap (42ms)
  ✅ Grid layout 12 columns (55ms)
  ...

Results: 225/225 passed (0 failed)
Duration: 28.4s
```

---

## Best Practices

### 1. Setup minimal halten

```typescript
// ✅ Gut: Minimaler Setup
testWithSetup('Button test', 'Button "Click"', async api => {})

// ❌ Schlecht: Zu viel irrelevanter Setup
testWithSetup(
  'Button test',
  `
Frame gap 16, pad 24, bg #0a0a0a
  Frame gap 8, bg #1a1a1a, pad 12, rad 8
    Icon "star"
    Text "Featured"
  Button "Click"
`,
  async api => {}
)
```

### 2. Deklarative Validierung bevorzugen

```typescript
// ✅ Gut: Deklarativ mit dom.expect()
api.dom.expect('node-1', {
  tag: 'button',
  bg: '#2271C1',
  pad: [12, 24],
  rad: 6,
})

// ❌ Vermeiden: Viele einzelne Assertions
api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
api.assert.hasStyle('node-1', 'paddingTop', '12px')
api.assert.hasStyle('node-1', 'paddingRight', '24px')
api.assert.hasStyle('node-1', 'borderRadius', '6px')
```

### 3. Richtige API verwenden

```typescript
// ✅ Gut: Zag API für Zag-Komponenten
api.assert.ok(api.zag.isChecked('node-1'))
await api.zag.toggle('node-1')

// ❌ Vermeiden: Direkte DOM-Abfragen
const el = document.querySelector('[data-mirror-id="node-1"]')
const isChecked = el.getAttribute('data-state') === 'checked'

// ✅ Gut: Panel API für Property Panel
const value = api.panel.property.getPropertyValue('bg')
await api.panel.property.setProperty('bg', '#ff0000')

// ❌ Vermeiden: Direkte DOM-Manipulation
const input = document.querySelector('.property-panel input[data-prop="bg"]')
input.value = '#ff0000'

// ✅ Gut: Studio API für Selection
await api.studio.setSelection('node-2')
const selection = api.studio.getSelection()

// ❌ Vermeiden: Alte State API
api.interact.select('node-2')
const selection = api.state.getSelection()
```

### 4. Auf Async-Operationen warten

```typescript
// ✅ Gut: Auf Kompilierung warten
await api.editor.setCode('Button "New"')
await api.utils.waitForCompile()

// ✅ Gut: Delay nach Interaktionen
await api.interact.click('node-1')
await api.utils.delay(100)

// ❌ Schlecht: Keine Wartezeit
await api.editor.setCode('Button "New"')
api.assert.exists('node-1') // Kann fehlschlagen!
```

### 5. History API für Undo/Redo

```typescript
// ✅ Gut: History-State prüfen
api.assert.ok(api.studio.history.canUndo(), 'Should be able to undo')
api.editor.undo()
api.assert.ok(api.studio.history.canRedo(), 'Should be able to redo')

// ❌ Vermeiden: Nur Undo aufrufen ohne State-Check
api.editor.undo()
api.editor.undo()
api.editor.undo() // Könnte nichts mehr zum Undo geben
```

---

## Troubleshooting

### Problem: "Element not found"

```typescript
// Node-IDs prüfen
const nodeIds = api.preview.getNodeIds()
console.log(nodeIds) // ['node-1', 'node-2', ...]

// Auf Element warten
await api.preview.waitFor('node-5', 3000)
```

### Problem: "Assertion failed" bei Styles

```typescript
// Computed styles können anders formatiert sein
// Statt: api.assert.hasStyle('node-1', 'backgroundColor', '#2271C1')
// Besser: DOM Bridge verwenden
api.dom.expect('node-1', { bg: '#2271C1' })
```

### Problem: Tests sind flaky

```typescript
// Mehr Wartezeit nach Änderungen
await api.editor.setCode(code)
await api.utils.waitForCompile()
await api.utils.delay(100) // Extra Zeit für DOM-Updates

// Oder waitUntil verwenden
await api.utils.waitUntil(() => api.preview.exists('node-5'), 2000)
```

### Problem: Zag-Komponente reagiert nicht

```typescript
// State prüfen
const state = api.zag.getState('node-1')
console.log(state) // { scope: 'checkbox', value: 'unchecked', context: {...} }

// Mehr Zeit für Animation
await api.zag.open('node-1')
await api.utils.delay(200) // Mehr Zeit für Overlay-Animation
```

---

## Verwandte Dokumentation

- `CLAUDE.md` - Projekt-Übersicht
- `docs/DRAG-DROP-TESTING.md` - Drag & Drop Test-Dokumentation
- `studio/test-api/types.ts` - Vollständige Type-Definitionen
