# Mirror Studio Testing Strategy

## Übersicht

Testing-Konzept für die neue modulare Architektur.

---

## Test-Pyramide

```
          ╱╲
         ╱  ╲
        ╱ E2E╲           5%  - Critical User Journeys
       ╱──────╲
      ╱        ╲
     ╱Integration╲       20% - Module Interactions
    ╱──────────────╲
   ╱                ╲
  ╱   Unit Tests     ╲   75% - Isolated Functions
 ╱────────────────────╲
```

---

## Unit Tests

### Strategie

- Jedes Modul hat eigene `__tests__/` Directory
- Test-Datei-Konvention: `[module].test.ts`
- Mocking für externe Dependencies (DOM, API, CodeMirror)

### Beispiel-Struktur

```
studio/
├── modules/
│   ├── file-manager/
│   │   ├── __tests__/
│   │   │   ├── file-store.test.ts
│   │   │   ├── file-operations.test.ts
│   │   │   └── storage.test.ts
│   │   └── ...
│   │
│   └── compiler/
│       ├── __tests__/
│       │   ├── compile.test.ts
│       │   ├── prelude-builder.test.ts
│       │   └── error-handler.test.ts
│       └── ...
│
├── pickers/
│   ├── color/
│   │   ├── __tests__/
│   │   │   ├── color-picker.test.ts
│   │   │   ├── palette.test.ts
│   │   │   └── keyboard-nav.test.ts
│   │   └── ...
│   └── ...
│
└── panels/
    └── property/
        ├── __tests__/
        │   ├── ui-renderer.test.ts
        │   ├── change-handler.test.ts
        │   └── child-ordering.test.ts
        └── ...
```

### Test-Kategorien

#### 1. State Management

```typescript
// studio/core/__tests__/state.test.ts
describe('Store', () => {
  it('should initialize with default state', () => {
    const store = createStore({ count: 0 })
    expect(store.get().count).toBe(0)
  })

  it('should update state partially', () => {
    const store = createStore({ a: 1, b: 2 })
    store.set({ a: 10 })
    expect(store.get()).toEqual({ a: 10, b: 2 })
  })

  it('should notify subscribers on change', () => {
    const store = createStore({ value: 'initial' })
    const callback = vi.fn()
    store.subscribe(callback)

    store.set({ value: 'updated' })

    expect(callback).toHaveBeenCalledWith({ value: 'updated' })
  })

  it('should not notify after unsubscribe', () => {
    const store = createStore({ value: 0 })
    const callback = vi.fn()
    const unsubscribe = store.subscribe(callback)

    unsubscribe()
    store.set({ value: 1 })

    expect(callback).not.toHaveBeenCalled()
  })
})
```

#### 2. Event Bus

```typescript
// studio/core/__tests__/events.test.ts
describe('EventBus', () => {
  it('should emit events to subscribers', () => {
    const bus = createEventBus<{ test: { value: number } }>()
    const handler = vi.fn()

    bus.on('test', handler)
    bus.emit('test', { value: 42 })

    expect(handler).toHaveBeenCalledWith({ value: 42 })
  })

  it('should support multiple handlers per event', () => {
    const bus = createEventBus<{ test: {} }>()
    const handler1 = vi.fn()
    const handler2 = vi.fn()

    bus.on('test', handler1)
    bus.on('test', handler2)
    bus.emit('test', {})

    expect(handler1).toHaveBeenCalled()
    expect(handler2).toHaveBeenCalled()
  })

  it('should isolate errors in handlers', () => {
    const bus = createEventBus<{ test: {} }>()
    const errorHandler = vi.fn(() => { throw new Error('test') })
    const normalHandler = vi.fn()

    bus.on('test', errorHandler)
    bus.on('test', normalHandler)
    bus.emit('test', {})

    expect(normalHandler).toHaveBeenCalled()
  })
})
```

#### 3. Commands

```typescript
// studio/core/__tests__/commands.test.ts
describe('SetPropertyCommand', () => {
  it('should execute property change', () => {
    const context = createMockContext({
      source: 'Box bg #fff',
      sourceMap: createMockSourceMap()
    })

    const command = new SetPropertyCommand({
      nodeId: 'node_1',
      property: 'bg',
      value: '#000'
    })

    const result = command.execute()

    expect(result.success).toBe(true)
    expect(context.getSource()).toContain('bg #000')
  })

  it('should undo property change', () => {
    const originalSource = 'Box bg #fff'
    const context = createMockContext({ source: originalSource })

    const command = new SetPropertyCommand({
      nodeId: 'node_1',
      property: 'bg',
      value: '#000'
    })

    command.execute()
    command.undo()

    expect(context.getSource()).toBe(originalSource)
  })
})

describe('CommandExecutor', () => {
  it('should maintain undo stack', () => {
    const executor = createCommandExecutor()
    const command1 = createMockCommand('cmd1')
    const command2 = createMockCommand('cmd2')

    executor.execute(command1)
    executor.execute(command2)

    expect(executor.canUndo()).toBe(true)
    expect(executor.getUndoStack()).toHaveLength(2)
  })

  it('should clear redo stack on new command', () => {
    const executor = createCommandExecutor()
    executor.execute(createMockCommand('cmd1'))
    executor.undo()

    expect(executor.canRedo()).toBe(true)

    executor.execute(createMockCommand('cmd2'))

    expect(executor.canRedo()).toBe(false)
  })
})
```

#### 4. File Manager

```typescript
// studio/modules/file-manager/__tests__/file-operations.test.ts
describe('FileManager', () => {
  let fileManager: FileManager

  beforeEach(() => {
    fileManager = createFileManager({ storage: 'local' })
  })

  it('should create a new file', async () => {
    await fileManager.createFile('test.mirror', 'layout')

    expect(fileManager.getAllFiles()).toContain('test.mirror')
    expect(fileManager.getFileType('test.mirror')).toBe('layout')
  })

  it('should prevent duplicate filenames', async () => {
    await fileManager.createFile('test.mirror', 'layout')

    await expect(
      fileManager.createFile('test.mirror', 'layout')
    ).rejects.toThrow('File already exists')
  })

  it('should rename file and update references', async () => {
    await fileManager.createFile('old.mirror', 'layout')
    fileManager.setContent('old.mirror', 'Box')

    await fileManager.renameFile('old.mirror', 'new.mirror')

    expect(fileManager.getAllFiles()).not.toContain('old.mirror')
    expect(fileManager.getAllFiles()).toContain('new.mirror')
    expect(fileManager.getContent('new.mirror')).toBe('Box')
  })

  it('should track dirty state', () => {
    fileManager.createFile('test.mirror', 'layout')

    expect(fileManager.store.get().isDirty['test.mirror']).toBe(false)

    fileManager.setContent('test.mirror', 'Changed')

    expect(fileManager.store.get().isDirty['test.mirror']).toBe(true)
  })
})
```

#### 5. Pickers

```typescript
// studio/pickers/color/__tests__/color-picker.test.ts
describe('ColorPicker', () => {
  let container: HTMLElement
  let picker: ColorPicker

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    picker?.destroy()
    container.remove()
  })

  it('should render with initial color', () => {
    picker = createColorPicker(
      { position: 'below', initialColor: '#ff0000' },
      { onSelect: vi.fn() }
    )

    const anchor = document.createElement('button')
    picker.show(anchor)

    expect(picker.getValue()).toBe('#ff0000')
  })

  it('should emit onSelect when swatch clicked', () => {
    const onSelect = vi.fn()
    picker = createColorPicker(
      { position: 'below' },
      { onSelect }
    )

    const anchor = document.createElement('button')
    picker.show(anchor)

    const swatch = container.querySelector('[data-color="#333333"]')
    swatch?.dispatchEvent(new MouseEvent('click'))

    expect(onSelect).toHaveBeenCalledWith('#333333')
  })

  it('should handle Enter key to confirm', () => {
    const onSelect = vi.fn()
    picker = createColorPicker(
      { position: 'below' },
      { onSelect }
    )

    const anchor = document.createElement('button')
    picker.show(anchor)

    // Navigate to a swatch
    picker['keyboardNav'].selectIndex(0)

    // Press Enter
    const event = new KeyboardEvent('keydown', { key: 'Enter' })
    picker['handleKeyDown'](event)

    expect(onSelect).toHaveBeenCalled()
  })

  it('should close on Escape', () => {
    picker = createColorPicker(
      { position: 'below' },
      { onSelect: vi.fn() }
    )

    const anchor = document.createElement('button')
    picker.show(anchor)
    expect(picker['isOpen']).toBe(true)

    const event = new KeyboardEvent('keydown', { key: 'Escape' })
    document.dispatchEvent(event)

    expect(picker['isOpen']).toBe(false)
  })
})

// studio/pickers/color/__tests__/keyboard-nav.test.ts
describe('KeyboardNav', () => {
  it('should navigate grid with arrow keys', () => {
    const items = createMockGrid(3, 4) // 3 rows, 4 columns
    const onSelect = vi.fn()

    const nav = new KeyboardNav({
      items: items.flat(),
      orientation: 'grid',
      columns: 4,
      onSelect
    })

    // Start at [0,0]
    expect(nav.getSelectedIndex()).toBe(0)

    // Move right
    nav.moveRight()
    expect(nav.getSelectedIndex()).toBe(1)

    // Move down
    nav.moveDown()
    expect(nav.getSelectedIndex()).toBe(5) // Second row

    // Move left
    nav.moveLeft()
    expect(nav.getSelectedIndex()).toBe(4)
  })

  it('should wrap at boundaries when enabled', () => {
    const items = createMockList(5)
    const nav = new KeyboardNav({
      items,
      orientation: 'vertical',
      wrap: true,
      onSelect: vi.fn()
    })

    nav.moveToLast()
    expect(nav.getSelectedIndex()).toBe(4)

    nav.moveDown() // Should wrap to first
    expect(nav.getSelectedIndex()).toBe(0)
  })
})
```

#### 6. Property Panel

```typescript
// studio/panels/property/__tests__/change-handler.test.ts
describe('ChangeHandler', () => {
  let handler: ChangeHandler
  let mockModifier: CodeModifier
  let mockExecutor: CommandExecutor

  beforeEach(() => {
    mockModifier = createMockCodeModifier()
    mockExecutor = createMockCommandExecutor()
    handler = new ChangeHandler(mockModifier, mockExecutor)
  })

  it('should create SetPropertyCommand for property change', () => {
    handler.handlePropertyChange('node_1', 'bg', '#fff')

    expect(mockExecutor.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SetPropertyCommand',
        params: { nodeId: 'node_1', property: 'bg', value: '#fff' }
      })
    )
  })

  it('should create RemovePropertyCommand for property removal', () => {
    handler.handlePropertyRemove('node_1', 'bg')

    expect(mockExecutor.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RemovePropertyCommand',
        params: { nodeId: 'node_1', property: 'bg' }
      })
    )
  })
})
```

---

## Integration Tests

### Modul-Interaktion

```typescript
// studio/__tests__/integration/file-compiler.test.ts
describe('FileManager + Compiler Integration', () => {
  let fileManager: FileManager
  let compiler: Compiler

  beforeEach(() => {
    fileManager = createFileManager({ storage: 'local' })
    compiler = createCompiler({ target: 'dom' })
  })

  it('should compile file content', async () => {
    await fileManager.createFile('layout.mirror', 'layout')
    fileManager.setContent('layout.mirror', 'Box w 100 h 100')
    fileManager.selectFile('layout.mirror')

    const content = fileManager.getCurrentContent()!
    const result = compiler.compile(content)

    expect(result.success).toBe(true)
    expect(result.ast).not.toBeNull()
  })

  it('should build prelude from multiple files', async () => {
    await fileManager.createFile('tokens.mirror', 'tokens')
    await fileManager.createFile('button.mirror', 'component')
    await fileManager.createFile('main.mirror', 'layout')

    fileManager.setContent('tokens.mirror', '$accent.bg: #007bff')
    fileManager.setContent('button.mirror', 'Button: = Box pad 16')
    fileManager.selectFile('main.mirror')

    const prelude = compiler.buildPrelude(
      fileManager.store.get().files,
      'main.mirror'
    )

    expect(prelude.prelude).toContain('$accent.bg: #007bff')
    expect(prelude.prelude).toContain('Button: = Box pad 16')
  })
})
```

### Bidirektionales Editing

```typescript
// studio/__tests__/integration/bidirectional-editing.test.ts
describe('Bidirectional Editing', () => {
  let studio: StudioInstance

  beforeEach(async () => {
    const container = createMockContainer()
    studio = await initializeStudio({
      editor: container.editor,
      preview: container.preview,
      propertyPanel: container.propertyPanel
    })
  })

  afterEach(() => {
    studio.destroy()
  })

  it('should sync selection from preview to editor', async () => {
    // Set source
    studio.editor.setContent('Box bg #fff\n  Text "Hello"')
    await studio.compiler.compile(studio.editor.getContent())

    // Click element in preview
    studio.sync.handleSelectionChange('node_2', 'preview')

    // Editor should scroll to line 2
    await waitFor(() => {
      expect(studio.editor.getCursor().line).toBe(2)
    })
  })

  it('should update preview when property changes', async () => {
    studio.editor.setContent('Box bg #fff')
    await studio.compiler.compile(studio.editor.getContent())

    // Change property via panel
    studio.propertyPanel?.show('node_1')
    studio.events.emit('panel:property-changed', {
      nodeId: 'node_1',
      property: 'bg',
      value: '#000'
    })

    // Wait for recompile
    await waitFor(() => {
      const previewElement = document.querySelector('[data-node-id="node_1"]')
      expect(previewElement?.style.backgroundColor).toBe('#000')
    })
  })

  it('should maintain selection through edit cycle', async () => {
    studio.editor.setContent('Box bg #fff')
    await studio.compiler.compile(studio.editor.getContent())

    studio.sync.handleSelectionChange('node_1', 'preview')

    // Edit property
    studio.events.emit('panel:property-changed', {
      nodeId: 'node_1',
      property: 'bg',
      value: '#000'
    })

    // Wait for recompile
    await waitFor(() => {
      expect(studio.state.get().selection.nodeId).toBe('node_1')
    })
  })
})
```

### Command Undo/Redo

```typescript
// studio/__tests__/integration/undo-redo.test.ts
describe('Undo/Redo', () => {
  let studio: StudioInstance

  beforeEach(async () => {
    studio = await initializeStudio(createMockConfig())
    studio.editor.setContent('Box bg #fff')
    await studio.compiler.compile(studio.editor.getContent())
  })

  it('should undo property change', async () => {
    const originalSource = studio.editor.getContent()

    studio.executor.execute(new SetPropertyCommand({
      nodeId: 'node_1',
      property: 'bg',
      value: '#000'
    }))

    expect(studio.editor.getContent()).toContain('#000')

    studio.executor.undo()

    expect(studio.editor.getContent()).toBe(originalSource)
  })

  it('should redo after undo', async () => {
    studio.executor.execute(new SetPropertyCommand({
      nodeId: 'node_1',
      property: 'bg',
      value: '#000'
    }))

    studio.executor.undo()
    studio.executor.redo()

    expect(studio.editor.getContent()).toContain('#000')
  })

  it('should handle batch commands atomically', async () => {
    const originalSource = studio.editor.getContent()

    studio.executor.execute(new BatchCommand({
      commands: [
        new SetPropertyCommand({ nodeId: 'node_1', property: 'bg', value: '#000' }),
        new SetPropertyCommand({ nodeId: 'node_1', property: 'pad', value: '16' })
      ],
      description: 'Batch edit'
    }))

    expect(studio.editor.getContent()).toContain('#000')
    expect(studio.editor.getContent()).toContain('pad 16')

    // Single undo reverts both
    studio.executor.undo()

    expect(studio.editor.getContent()).toBe(originalSource)
  })
})
```

---

## E2E Tests (Playwright)

### Setup

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './studio/__tests__/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev:studio',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
})
```

### Critical User Journeys

```typescript
// studio/__tests__/e2e/critical-journeys.test.ts
import { test, expect } from '@playwright/test'

test.describe('Critical User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.editor')
  })

  test('Create file, edit, and compile', async ({ page }) => {
    // Create new file
    await page.click('[data-testid="new-file-button"]')
    await page.fill('[data-testid="filename-input"]', 'test.mirror')
    await page.click('[data-testid="create-button"]')

    // Type code
    const editor = page.locator('.cm-content')
    await editor.fill('Box w 100 h 100 bg #007bff')

    // Wait for compilation
    await expect(page.locator('[data-node-id="node_1"]')).toBeVisible()

    // Verify preview
    const box = page.locator('[data-node-id="node_1"]')
    await expect(box).toHaveCSS('width', '100px')
    await expect(box).toHaveCSS('height', '100px')
    await expect(box).toHaveCSS('background-color', 'rgb(0, 123, 255)')
  })

  test('Select element and edit via property panel', async ({ page }) => {
    // Setup
    const editor = page.locator('.cm-content')
    await editor.fill('Box bg #fff')
    await page.waitForSelector('[data-node-id="node_1"]')

    // Click element in preview
    await page.click('[data-node-id="node_1"]')

    // Property panel should show
    await expect(page.locator('.property-panel')).toBeVisible()

    // Change color
    await page.fill('[data-property="bg"]', '#000')
    await page.press('[data-property="bg"]', 'Enter')

    // Verify code updated
    await expect(editor).toContainText('bg #000')

    // Verify preview updated
    const box = page.locator('[data-node-id="node_1"]')
    await expect(box).toHaveCSS('background-color', 'rgb(0, 0, 0)')
  })

  test('Use color picker', async ({ page }) => {
    const editor = page.locator('.cm-content')
    await editor.fill('Box bg #fff')
    await page.waitForSelector('[data-node-id="node_1"]')

    // Click element
    await page.click('[data-node-id="node_1"]')

    // Open color picker
    await page.click('[data-property="bg"] .color-swatch')

    // Picker should open
    await expect(page.locator('.color-picker')).toBeVisible()

    // Select color
    await page.click('[data-color="#ff0000"]')

    // Verify
    await expect(editor).toContainText('bg #ff0000')
  })

  test('Undo/Redo', async ({ page }) => {
    const editor = page.locator('.cm-content')
    await editor.fill('Box bg #fff')

    // Edit
    await page.click('[data-node-id="node_1"]')
    await page.fill('[data-property="bg"]', '#000')
    await page.press('[data-property="bg"]', 'Enter')

    await expect(editor).toContainText('bg #000')

    // Undo (Cmd/Ctrl+Z)
    await page.keyboard.press('Meta+z')

    await expect(editor).toContainText('bg #fff')

    // Redo (Cmd/Ctrl+Shift+Z)
    await page.keyboard.press('Meta+Shift+z')

    await expect(editor).toContainText('bg #000')
  })

  test('Multi-file project', async ({ page }) => {
    // Create tokens file
    await page.click('[data-testid="new-file-button"]')
    await page.fill('[data-testid="filename-input"]', 'tokens.mirror')
    await page.selectOption('[data-testid="file-type"]', 'tokens')
    await page.click('[data-testid="create-button"]')

    const editor = page.locator('.cm-content')
    await editor.fill('$accent.bg: #007bff')

    // Create layout file
    await page.click('[data-testid="new-file-button"]')
    await page.fill('[data-testid="filename-input"]', 'main.mirror')
    await page.selectOption('[data-testid="file-type"]', 'layout')
    await page.click('[data-testid="create-button"]')

    await editor.fill('Box bg $accent.bg')

    // Token should resolve
    const box = page.locator('[data-node-id="node_1"]')
    await expect(box).toHaveCSS('background-color', 'rgb(0, 123, 255)')
  })
})
```

### Picker Tests

```typescript
// studio/__tests__/e2e/pickers.test.ts
test.describe('Pickers', () => {
  test('Color picker keyboard navigation', async ({ page }) => {
    await page.goto('/')
    await page.locator('.cm-content').fill('Box bg #fff')
    await page.click('[data-node-id="node_1"]')
    await page.click('[data-property="bg"] .color-swatch')

    // Navigate with arrows
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')

    // Confirm with Enter
    await page.keyboard.press('Enter')

    // Picker should close
    await expect(page.locator('.color-picker')).not.toBeVisible()

    // Color should be applied
    await expect(page.locator('.cm-content')).not.toContainText('bg #fff')
  })

  test('Token picker context filtering', async ({ page }) => {
    // Setup with tokens
    await page.goto('/')
    // ... create tokens file with different types

    // Open for bg property
    await page.click('[data-node-id="node_1"]')
    await page.click('[data-property="bg"]')
    await page.keyboard.type('$')

    // Should only show color tokens
    await expect(page.locator('.token-picker')).toBeVisible()
    await expect(page.locator('[data-token-type="color"]')).toHaveCount(
      await page.locator('.token-item').count()
    )
  })
})
```

---

## Test Utilities

### Mock Factories

```typescript
// studio/__tests__/utils/mocks.ts

export function createMockStore<T>(initial: T): Store<T> {
  let state = initial
  const subscribers = new Set<(s: T) => void>()

  return {
    get: () => state,
    set: (partial) => {
      state = { ...state, ...partial }
      subscribers.forEach(s => s(state))
    },
    subscribe: (fn) => {
      subscribers.add(fn)
      return () => subscribers.delete(fn)
    },
    reset: () => { state = initial }
  }
}

export function createMockEventBus<E>(): EventBus<E> {
  const handlers = new Map<keyof E, Set<Function>>()

  return {
    on: (event, handler) => {
      if (!handlers.has(event)) handlers.set(event, new Set())
      handlers.get(event)!.add(handler)
      return () => handlers.get(event)?.delete(handler)
    },
    emit: (event, payload) => {
      handlers.get(event)?.forEach(h => h(payload))
    },
    off: (event, handler) => {
      handlers.get(event)?.delete(handler)
    },
    clear: () => handlers.clear()
  }
}

export function createMockCodeModifier(): CodeModifier {
  return {
    updateProperty: vi.fn(() => ({ success: true, newSource: '' })),
    removeProperty: vi.fn(() => ({ success: true, newSource: '' })),
    insertChild: vi.fn(() => ({ success: true, newSource: '' })),
    deleteNode: vi.fn(() => ({ success: true, newSource: '' })),
  }
}

export function createMockContainer(): {
  editor: HTMLElement
  preview: HTMLElement
  propertyPanel: HTMLElement
} {
  const container = document.createElement('div')
  container.innerHTML = `
    <div id="editor"></div>
    <div id="preview"></div>
    <div id="property-panel"></div>
  `
  document.body.appendChild(container)

  return {
    editor: container.querySelector('#editor')!,
    preview: container.querySelector('#preview')!,
    propertyPanel: container.querySelector('#property-panel')!,
  }
}
```

### Test Helpers

```typescript
// studio/__tests__/utils/helpers.ts

export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 1000
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await condition()) return
    await new Promise(r => setTimeout(r, 50))
  }
  throw new Error('Timeout waiting for condition')
}

export function createMockGrid(rows: number, cols: number): HTMLElement[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const el = document.createElement('div')
      el.dataset.row = String(r)
      el.dataset.col = String(c)
      return el
    })
  )
}

export function simulateKeyPress(
  element: HTMLElement,
  key: string,
  modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}
): void {
  element.dispatchEvent(new KeyboardEvent('keydown', {
    key,
    ctrlKey: modifiers.ctrl,
    shiftKey: modifiers.shift,
    altKey: modifiers.alt,
    bubbles: true
  }))
}
```

---

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v4
```

---

## Coverage Goals

| Bereich | Ziel | Aktuell |
|---------|------|---------|
| Core (state, events, commands) | 95% | ~80% |
| File Manager | 90% | 0% |
| Compiler | 85% | ~70% |
| Pickers | 80% | 0% |
| Panels | 80% | ~60% |
| Integration | 70% | ~40% |
| E2E | Critical paths | ~20% |
