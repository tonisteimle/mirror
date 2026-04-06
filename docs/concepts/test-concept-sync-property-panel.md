# Testkonzept: Synchronisierung & Property Panel

## Übersicht

Dieses Dokument beschreibt ein umfassendes Testkonzept für:
1. **Synchronisierung** zwischen Editor, Preview und Property Panel
2. **Property Panel** - UI, Werteextraktion, Code-Modifikation

---

## Teil 1: Synchronisierung

### 1.1 Architektur-Überblick

```
Editor ────────┐
               │
Preview ──────→ SyncCoordinator ──→ State Store → PropertyPanel
               │
Panel ─────────┘
```

**Kernprinzip**: Alle Selection-Änderungen fließen durch:
`actions.setSelection()` → Core State → `selection:changed` Event → `SyncCoordinator.doSync()` → Targets

### 1.2 Testebenen

| Ebene | Beschreibung | Framework |
|-------|--------------|-----------|
| **Unit** | Isolierte Komponenten | Vitest |
| **Integration** | Komponenten-Zusammenspiel | Vitest + JSDOM |
| **E2E** | Vollständige Flows im Browser | Playwright |

---

### 1.3 Unit Tests: SyncCoordinator

**Datei**: `tests/studio/sync-coordinator.test.ts`

#### 1.3.1 Selection Propagation

```typescript
describe('SyncCoordinator: Selection Propagation', () => {
  it('scrolls editor when selection originates from preview', () => {
    const scrollSpy = vi.fn()
    coordinator.setTargets({ scrollEditorToLine: scrollSpy })

    actions.setSelection('node-3', 'preview')

    expect(scrollSpy).toHaveBeenCalledWith(expect.any(Number))
  })

  it('does NOT scroll editor when selection originates from editor', () => {
    const scrollSpy = vi.fn()
    coordinator.setTargets({ scrollEditorToLine: scrollSpy })

    actions.setSelection('node-3', 'editor')

    expect(scrollSpy).not.toHaveBeenCalled()
  })

  it('highlights preview when selection originates from editor', () => {
    const highlightSpy = vi.fn()
    coordinator.setTargets({ highlightPreviewElement: highlightSpy })

    actions.setSelection('node-3', 'editor')

    expect(highlightSpy).toHaveBeenCalledWith('node-3')
  })

  it('does NOT highlight preview when selection originates from preview', () => {
    const highlightSpy = vi.fn()
    coordinator.setTargets({ highlightPreviewElement: highlightSpy })

    actions.setSelection('node-3', 'preview')

    expect(highlightSpy).not.toHaveBeenCalled()
  })
})
```

#### 1.3.2 Debouncing & Loop Prevention

```typescript
describe('SyncCoordinator: Debouncing', () => {
  it('debounces rapid cursor movements', async () => {
    const scrollSpy = vi.fn()
    coordinator.setTargets({ scrollEditorToLine: scrollSpy })

    // Simulate rapid cursor movements
    coordinator.handleCursorMove(10)
    coordinator.handleCursorMove(11)
    coordinator.handleCursorMove(12)

    // Immediate: no calls yet
    expect(scrollSpy).not.toHaveBeenCalled()

    // After debounce delay
    await vi.advanceTimersByTime(100)

    // Only last position synced
    expect(scrollSpy).toHaveBeenCalledTimes(1)
  })

  it('cancels pending cursor sync on preview click', () => {
    coordinator.handleCursorMove(10)
    coordinator.handlePreviewClick('node-5')

    // Preview click should cancel cursor sync
    expect(coordinator.pendingCursorSync).toBeNull()
  })

  it('prevents sync loops by checking origin', () => {
    const editorSpy = vi.fn()
    const previewSpy = vi.fn()

    coordinator.setTargets({
      scrollEditorToLine: editorSpy,
      highlightPreviewElement: previewSpy
    })

    // Selection from editor should only affect preview
    actions.setSelection('node-3', 'editor')
    expect(editorSpy).not.toHaveBeenCalled()
    expect(previewSpy).toHaveBeenCalled()
  })
})
```

#### 1.3.3 SourceMap Integration

```typescript
describe('SyncCoordinator: SourceMap', () => {
  it('aborts sync when SourceMap becomes invalid', async () => {
    const spy = vi.fn()
    coordinator.setTargets({ scrollEditorToLine: spy })

    // Start sync
    const syncPromise = coordinator.doSync('node-3', 'preview')

    // Invalidate SourceMap during sync
    coordinator.setSourceMap(newSourceMap)

    await syncPromise

    // Sync should have been aborted
    expect(spy).not.toHaveBeenCalled()
  })

  it('handles null SourceMap gracefully', () => {
    coordinator.setSourceMap(null)

    expect(() => {
      actions.setSelection('node-3', 'preview')
    }).not.toThrow()
  })

  it('uses LineOffsetService for editor line translation', () => {
    lineOffsetService.setOffset(50) // 50 lines prelude

    // SourceMap line 60 should become editor line 10
    const editorLine = coordinator.sourceMapToEditor(60)
    expect(editorLine).toBe(10)
  })
})
```

#### 1.3.4 Sync Queueing

```typescript
describe('SyncCoordinator: Queueing', () => {
  it('queues sync during active sync', async () => {
    // Make first sync take time
    coordinator.setTargets({
      scrollEditorToLine: () => new Promise(r => setTimeout(r, 100))
    })

    // Start first sync
    coordinator.doSync('node-1', 'preview')

    // Queue second sync
    coordinator.doSync('node-2', 'preview')
    coordinator.doSync('node-3', 'preview')

    // Only last should be queued
    expect(coordinator.pendingSync?.nodeId).toBe('node-3')
  })

  it('processes queued sync after current completes', async () => {
    const syncHistory: string[] = []

    coordinator.setTargets({
      highlightPreviewElement: (id) => {
        syncHistory.push(id)
      }
    })

    // Simulate queued syncs
    await coordinator.doSync('node-1', 'editor')

    expect(syncHistory).toContain('node-1')
  })
})
```

---

### 1.4 Unit Tests: LineOffsetService

**Datei**: `tests/studio/line-offset-service.test.ts`

```typescript
describe('LineOffsetService', () => {
  let service: LineOffsetService

  beforeEach(() => {
    service = new LineOffsetService()
  })

  describe('Line Translation', () => {
    it('translates editor line to SourceMap line', () => {
      service.setOffset(50) // 50 lines prelude

      expect(service.editorToSourceMap(1)).toBe(51)
      expect(service.editorToSourceMap(10)).toBe(60)
    })

    it('translates SourceMap line to editor line', () => {
      service.setOffset(50)

      expect(service.sourceMapToEditor(51)).toBe(1)
      expect(service.sourceMapToEditor(60)).toBe(10)
    })

    it('handles zero offset', () => {
      service.setOffset(0)

      expect(service.editorToSourceMap(5)).toBe(5)
      expect(service.sourceMapToEditor(5)).toBe(5)
    })

    it('identifies lines in current file', () => {
      service.setOffset(50)

      expect(service.isInCurrentFile(49)).toBe(false)
      expect(service.isInCurrentFile(50)).toBe(false) // Separator
      expect(service.isInCurrentFile(51)).toBe(true)
    })
  })
})
```

---

### 1.5 Integration Tests: Editor ↔ Preview ↔ Panel

**Datei**: `tests/studio/sync-integration.test.ts`

```typescript
describe('Sync Integration', () => {
  let editor: MockEditor
  let preview: MockPreview
  let panel: MockPropertyPanel
  let coordinator: SyncCoordinator

  beforeEach(() => {
    // Setup mocks with realistic behavior
    editor = createMockEditor()
    preview = createMockPreview()
    panel = createMockPropertyPanel()
    coordinator = createSyncCoordinator()

    // Wire together
    coordinator.setTargets({
      scrollEditorToLine: editor.scrollToLine,
      highlightPreviewElement: preview.highlight
    })
  })

  describe('Full Selection Flow', () => {
    it('editor cursor → preview highlight → panel update', async () => {
      // Simulate cursor move in editor
      editor.setCursor(line: 15)
      coordinator.handleCursorMove(15)

      await vi.advanceTimersByTime(100) // Debounce

      // Preview should be highlighted
      expect(preview.highlightedElement).toBe('node-3')

      // Panel should show properties
      expect(panel.currentNodeId).toBe('node-3')
    })

    it('preview click → editor scroll → panel update', async () => {
      // Click element in preview
      preview.click('node-5')
      coordinator.handlePreviewClick('node-5')

      // Editor should scroll
      expect(editor.scrolledToLine).toBeDefined()

      // Panel should update
      expect(panel.currentNodeId).toBe('node-5')
    })

    it('panel selection → editor scroll → preview highlight', async () => {
      // Select via breadcrumb in panel
      actions.setSelection('node-2', 'panel')

      // Editor should scroll
      expect(editor.scrolledToLine).toBeDefined()

      // Preview should highlight
      expect(preview.highlightedElement).toBe('node-2')
    })
  })

  describe('Selection Preservation', () => {
    it('maintains selection after code edit', async () => {
      actions.setSelection('node-3', 'preview')

      // Simulate code edit (triggers recompile)
      editor.setContent('Frame\n  Text "Changed"')
      await triggerRecompile()

      // Selection should still be valid
      expect(state.get().selection.nodeId).toBe('node-3')
    })

    it('clears selection when node is deleted', async () => {
      actions.setSelection('node-5', 'preview')

      // Delete the selected node
      editor.setContent('Frame\n  Text "Only One"')
      await triggerRecompile()

      // Selection should be cleared or moved
      expect(state.get().selection.nodeId).not.toBe('node-5')
    })
  })

  describe('Multi-file Sync', () => {
    it('handles prelude offset correctly', async () => {
      // Setup: 50 lines prelude + separator
      lineOffsetService.setOffset(51)

      // Select element at editor line 5
      editor.setCursor(line: 5)
      coordinator.handleCursorMove(5)

      // SourceMap lookup should use line 56 (51 + 5)
      expect(lastSourceMapLookup).toBe(56)
    })
  })
})
```

---

### 1.6 E2E Tests: Browser-basiert

**Datei**: `tests/e2e/sync-e2e.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Sync E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio/')
    await page.waitForSelector('[data-mirror-id]', { timeout: 10000 })
  })

  test('clicking preview element selects in editor', async ({ page }) => {
    // Click element in preview
    const element = page.locator('[data-mirror-id="node-3"]')
    await element.click()

    // Editor should show selection
    const editorSelection = page.locator('.cm-activeLine')
    await expect(editorSelection).toBeVisible()

    // Property panel should show
    const panel = page.locator('.property-panel')
    await expect(panel).toBeVisible()
  })

  test('cursor in editor highlights preview element', async ({ page }) => {
    // Focus editor and move cursor
    const editor = page.locator('.cm-editor')
    await editor.click()

    // Type to move to specific line
    await page.keyboard.press('Control+g')
    await page.keyboard.type('10')
    await page.keyboard.press('Enter')

    // Wait for debounce
    await page.waitForTimeout(200)

    // Preview element should have highlight class
    const highlighted = page.locator('[data-mirror-id].selected')
    await expect(highlighted).toBeVisible()
  })

  test('rapid clicks do not cause sync loops', async ({ page }) => {
    const elements = page.locator('[data-mirror-id]')
    const count = await elements.count()

    // Rapid clicks on different elements
    for (let i = 0; i < Math.min(5, count); i++) {
      await elements.nth(i).click({ delay: 50 })
    }

    // Wait for sync to settle
    await page.waitForTimeout(500)

    // Should have exactly one selected element
    const selected = page.locator('[data-mirror-id].selected')
    await expect(selected).toHaveCount(1)
  })

  test('selection persists through code edit', async ({ page }) => {
    // Select an element
    await page.locator('[data-mirror-id="node-3"]').click()

    // Edit in editor (add space)
    const editor = page.locator('.cm-editor')
    await editor.click()
    await page.keyboard.type(' ')

    // Wait for recompile
    await page.waitForTimeout(1000)

    // Selection should still be visible
    const selected = page.locator('[data-mirror-id].selected')
    await expect(selected).toBeVisible()
  })

  test('breadcrumb navigation updates all views', async ({ page }) => {
    // Select nested element
    await page.locator('[data-mirror-id="node-5"]').click()

    // Click parent in breadcrumb
    const breadcrumb = page.locator('.breadcrumb-item').first()
    await breadcrumb.click()

    // All views should update
    const selected = page.locator('[data-mirror-id].selected')
    const nodeId = await selected.getAttribute('data-mirror-id')

    // Should be parent element
    expect(nodeId).not.toBe('node-5')
  })
})
```

---

## Teil 2: Property Panel

### 2.1 Architektur-Überblick

```
PropertyPanel (UI Layer)
    ↓
PropertyExtractor (Data Reading)
    ↓
CodeModifier (Code Writing)
    ↓
LinePropertyParser (Low-level)
    ↓
AST + SourceMap
```

### 2.2 Testebenen

| Ebene | Komponente | Framework |
|-------|------------|-----------|
| **Unit** | PropertyExtractor, CodeModifier | Vitest |
| **Integration** | Panel + Extractor + Modifier | Vitest + JSDOM |
| **E2E** | Vollständige UI-Interaktion | Playwright |

---

### 2.3 Unit Tests: PropertyExtractor

**Datei**: `tests/studio/property-extractor.test.ts`

```typescript
describe('PropertyExtractor', () => {
  let extractor: PropertyExtractor

  beforeEach(() => {
    const source = `
Frame bg #1a1a1a, pad 16, rad 8
  Text "Hello", col white, fs 18
  Button "Click", bg #2563eb, col white
`
    const { ast, sourceMap } = compile(source)
    extractor = new PropertyExtractor(ast, sourceMap)
  })

  describe('Property Extraction', () => {
    it('extracts all properties from element', () => {
      const props = extractor.getProperties('node-1')

      expect(props).toContainEqual(
        expect.objectContaining({ name: 'bg', value: '#1a1a1a' })
      )
      expect(props).toContainEqual(
        expect.objectContaining({ name: 'pad', value: '16' })
      )
      expect(props).toContainEqual(
        expect.objectContaining({ name: 'rad', value: '8' })
      )
    })

    it('extracts text content', () => {
      const props = extractor.getProperties('node-2')

      expect(props).toContainEqual(
        expect.objectContaining({ name: 'text', value: 'Hello' })
      )
    })

    it('identifies property types correctly', () => {
      const props = extractor.getProperties('node-1')

      const bgProp = props.find(p => p.name === 'bg')
      const padProp = props.find(p => p.name === 'pad')

      expect(bgProp?.type).toBe('color')
      expect(padProp?.type).toBe('spacing')
    })
  })

  describe('Property Sources', () => {
    it('marks instance properties as "instance"', () => {
      const props = extractor.getProperties('node-3')

      const bgProp = props.find(p => p.name === 'bg')
      expect(bgProp?.source).toBe('instance')
    })

    it('marks component properties as "component"', () => {
      const source = `
Btn: bg #2563eb, col white, pad 12
Btn "Click"
`
      const { ast, sourceMap } = compile(source)
      extractor = new PropertyExtractor(ast, sourceMap)

      const props = extractor.getProperties('node-2') // Btn instance

      // Properties come from component definition
      const bgProp = props.find(p => p.name === 'bg')
      expect(bgProp?.source).toBe('component')
    })

    it('marks overridden properties as "instance"', () => {
      const source = `
Btn: bg #2563eb, col white
Btn "Click", bg #ef4444
`
      const { ast, sourceMap } = compile(source)
      extractor = new PropertyExtractor(ast, sourceMap)

      const props = extractor.getProperties('node-2')

      const bgProp = props.find(p => p.name === 'bg')
      expect(bgProp?.source).toBe('instance')
      expect(bgProp?.value).toBe('#ef4444')
    })
  })

  describe('Token Detection', () => {
    it('detects token references', () => {
      const source = `
$primary.bg: #2563eb
Frame bg $primary
`
      const { ast, sourceMap } = compile(source)
      extractor = new PropertyExtractor(ast, sourceMap)

      const props = extractor.getProperties('node-1')

      const bgProp = props.find(p => p.name === 'bg')
      expect(bgProp?.isToken).toBe(true)
      expect(bgProp?.tokenName).toBe('$primary')
    })

    it('resolves token values', () => {
      const source = `
$primary.bg: #2563eb
Frame bg $primary
`
      const { ast, sourceMap } = compile(source)
      extractor = new PropertyExtractor(ast, sourceMap)

      const resolved = extractor.resolveTokenValue('$primary', 'bg')
      expect(resolved).toBe('#2563eb')
    })
  })

  describe('Property Categories', () => {
    it('organizes properties by category', () => {
      const categories = extractor.getPropertiesByCategory('node-1')

      expect(categories.layout).toBeDefined()
      expect(categories.spacing).toBeDefined()
      expect(categories.colors).toBeDefined()
    })

    it('includes available properties not set', () => {
      const props = extractor.getProperties('node-1')

      const shadowProp = props.find(p => p.name === 'shadow')
      expect(shadowProp?.source).toBe('available')
      expect(shadowProp?.hasValue).toBe(false)
    })
  })
})
```

---

### 2.4 Unit Tests: CodeModifier

**Datei**: `tests/studio/code-modifier.test.ts`

```typescript
describe('CodeModifier', () => {
  let modifier: CodeModifier

  beforeEach(() => {
    const source = `Frame bg #1a1a1a, pad 16, rad 8
  Text "Hello", col white, fs 18`
    const { sourceMap } = compile(source)
    modifier = new CodeModifier(source, sourceMap)
  })

  describe('Update Property', () => {
    it('updates existing property value', () => {
      const result = modifier.updateProperty('node-1', 'bg', '#2563eb')

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('bg #2563eb')
      expect(result.newSource).not.toContain('bg #1a1a1a')
    })

    it('preserves other properties', () => {
      const result = modifier.updateProperty('node-1', 'bg', '#2563eb')

      expect(result.newSource).toContain('pad 16')
      expect(result.newSource).toContain('rad 8')
    })

    it('handles property aliases', () => {
      const result = modifier.updateProperty('node-1', 'background', 'red')

      // Should update 'bg' (the canonical name)
      expect(result.success).toBe(true)
      expect(result.newSource).toContain('bg red')
    })

    it('returns correct character offsets', () => {
      const result = modifier.updateProperty('node-1', 'bg', '#2563eb')

      expect(result.change).toBeDefined()
      expect(result.change.from).toBeGreaterThanOrEqual(0)
      expect(result.change.to).toBeGreaterThan(result.change.from)
    })
  })

  describe('Add Property', () => {
    it('adds new property to element', () => {
      const result = modifier.addProperty('node-1', 'shadow', 'md')

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('shadow md')
    })

    it('adds property in correct position', () => {
      const result = modifier.addProperty('node-1', 'opacity', '0.8')

      // Should be on same line
      const lines = result.newSource.split('\n')
      expect(lines[0]).toContain('opacity 0.8')
    })
  })

  describe('Remove Property', () => {
    it('removes property from element', () => {
      const result = modifier.removeProperty('node-1', 'rad')

      expect(result.success).toBe(true)
      expect(result.newSource).not.toContain('rad 8')
    })

    it('preserves other properties', () => {
      const result = modifier.removeProperty('node-1', 'rad')

      expect(result.newSource).toContain('bg #1a1a1a')
      expect(result.newSource).toContain('pad 16')
    })

    it('handles last property correctly', () => {
      const source = 'Frame bg #1a1a1a'
      const { sourceMap } = compile(source)
      modifier = new CodeModifier(source, sourceMap)

      const result = modifier.removeProperty('node-1', 'bg')

      expect(result.success).toBe(true)
      expect(result.newSource).toBe('Frame')
    })
  })

  describe('Multi-value Properties', () => {
    it('handles padding with multiple values', () => {
      const source = 'Frame pad 16 24'
      const { sourceMap } = compile(source)
      modifier = new CodeModifier(source, sourceMap)

      const result = modifier.updateProperty('node-1', 'pad', '20 30')

      expect(result.newSource).toContain('pad 20 30')
    })
  })

  describe('Error Handling', () => {
    it('returns error for non-existent node', () => {
      const result = modifier.updateProperty('node-999', 'bg', 'red')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('returns error for non-existent property on update', () => {
      const result = modifier.updateProperty('node-1', 'nonexistent', 'value')

      // Should add instead of error, or return appropriate message
      expect(result).toBeDefined()
    })
  })

  describe('Chained Modifications', () => {
    it('supports multiple modifications in sequence', () => {
      modifier.updateProperty('node-1', 'bg', '#2563eb')
      modifier.updateProperty('node-1', 'pad', '20')
      const result = modifier.addProperty('node-1', 'shadow', 'lg')

      expect(result.newSource).toContain('bg #2563eb')
      expect(result.newSource).toContain('pad 20')
      expect(result.newSource).toContain('shadow lg')
    })
  })
})
```

---

### 2.5 Unit Tests: PropertyPanel UI

**Datei**: `tests/studio/property-panel-ui.test.ts`

```typescript
describe('PropertyPanel UI', () => {
  let container: HTMLElement
  let panel: PropertyPanel
  let mockExtractor: MockPropertyExtractor
  let mockModifier: MockCodeModifier
  let onCodeChange: vi.Mock

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)

    mockExtractor = createMockPropertyExtractor()
    mockModifier = createMockCodeModifier()
    onCodeChange = vi.fn()

    panel = new PropertyPanel(
      container,
      mockSelectionProvider,
      mockExtractor,
      mockModifier,
      onCodeChange
    )
  })

  afterEach(() => {
    panel.detach()
    container.remove()
  })

  describe('Rendering', () => {
    it('renders property categories', () => {
      mockExtractor.setProperties({
        layout: [{ name: 'hor', value: '', type: 'boolean' }],
        spacing: [{ name: 'pad', value: '16', type: 'spacing' }],
        colors: [{ name: 'bg', value: '#1a1a1a', type: 'color' }]
      })

      panel.updatePanel('node-1')

      expect(container.querySelector('.category-layout')).toBeDefined()
      expect(container.querySelector('.category-spacing')).toBeDefined()
      expect(container.querySelector('.category-colors')).toBeDefined()
    })

    it('renders correct input types for properties', () => {
      mockExtractor.setProperties({
        colors: [{ name: 'bg', value: '#1a1a1a', type: 'color' }]
      })

      panel.updatePanel('node-1')

      const colorInput = container.querySelector('[data-property="bg"]')
      expect(colorInput).toBeDefined()
    })

    it('shows current property values', () => {
      mockExtractor.setProperties({
        spacing: [{ name: 'pad', value: '16', type: 'spacing' }]
      })

      panel.updatePanel('node-1')

      const input = container.querySelector('[data-property="pad"]') as HTMLInputElement
      expect(input.value).toBe('16')
    })
  })

  describe('Field Types', () => {
    it('renders color field with swatch', () => {
      mockExtractor.setProperties({
        colors: [{ name: 'bg', value: '#2563eb', type: 'color' }]
      })

      panel.updatePanel('node-1')

      const swatch = container.querySelector('.color-swatch')
      expect(swatch).toBeDefined()
      expect((swatch as HTMLElement).style.backgroundColor).toContain('rgb')
    })

    it('renders spacing field with presets', () => {
      mockExtractor.setProperties({
        spacing: [{ name: 'pad', value: '16', type: 'spacing' }]
      })

      panel.updatePanel('node-1')

      const presets = container.querySelectorAll('.spacing-preset')
      expect(presets.length).toBeGreaterThan(0)
    })

    it('renders select field for enum properties', () => {
      mockExtractor.setProperties({
        typography: [{
          name: 'weight',
          value: 'bold',
          type: 'select',
          options: ['thin', 'normal', 'bold']
        }]
      })

      panel.updatePanel('node-1')

      const select = container.querySelector('select[data-property="weight"]')
      expect(select).toBeDefined()
    })

    it('renders toggle for boolean properties', () => {
      mockExtractor.setProperties({
        layout: [{ name: 'hor', value: 'true', type: 'boolean' }]
      })

      panel.updatePanel('node-1')

      const toggle = container.querySelector('[data-property="hor"].toggle')
      expect(toggle).toBeDefined()
    })
  })

  describe('Input Handling', () => {
    it('calls updateProperty on input change', async () => {
      mockExtractor.setProperties({
        spacing: [{ name: 'pad', value: '16', type: 'spacing' }]
      })

      panel.updatePanel('node-1')

      const input = container.querySelector('[data-property="pad"]') as HTMLInputElement
      input.value = '20'
      input.dispatchEvent(new Event('input'))

      // Wait for debounce
      await vi.advanceTimersByTime(350)

      expect(mockModifier.updateProperty).toHaveBeenCalledWith('node-1', 'pad', '20')
    })

    it('debounces rapid input changes', async () => {
      mockExtractor.setProperties({
        spacing: [{ name: 'pad', value: '16', type: 'spacing' }]
      })

      panel.updatePanel('node-1')

      const input = container.querySelector('[data-property="pad"]') as HTMLInputElement

      // Rapid changes
      input.value = '17'
      input.dispatchEvent(new Event('input'))
      input.value = '18'
      input.dispatchEvent(new Event('input'))
      input.value = '19'
      input.dispatchEvent(new Event('input'))

      await vi.advanceTimersByTime(350)

      // Only last value should be sent
      expect(mockModifier.updateProperty).toHaveBeenCalledTimes(1)
      expect(mockModifier.updateProperty).toHaveBeenCalledWith('node-1', 'pad', '19')
    })

    it('calls onCodeChange callback after modification', async () => {
      mockExtractor.setProperties({
        colors: [{ name: 'bg', value: '#1a1a1a', type: 'color' }]
      })

      panel.updatePanel('node-1')

      const input = container.querySelector('[data-property="bg"]') as HTMLInputElement
      input.value = '#2563eb'
      input.dispatchEvent(new Event('input'))

      await vi.advanceTimersByTime(350)

      expect(onCodeChange).toHaveBeenCalled()
    })
  })

  describe('Validation', () => {
    it('validates numeric inputs', async () => {
      mockExtractor.setProperties({
        spacing: [{ name: 'pad', value: '16', type: 'spacing' }]
      })

      panel.updatePanel('node-1')

      const input = container.querySelector('[data-property="pad"]') as HTMLInputElement
      input.value = 'invalid'
      input.dispatchEvent(new Event('input'))

      await vi.advanceTimersByTime(350)

      // Should not call update with invalid value
      expect(mockModifier.updateProperty).not.toHaveBeenCalled()

      // Should show error state
      expect(input.classList.contains('invalid')).toBe(true)
    })

    it('validates color inputs', async () => {
      mockExtractor.setProperties({
        colors: [{ name: 'bg', value: '#1a1a1a', type: 'color' }]
      })

      panel.updatePanel('node-1')

      const input = container.querySelector('[data-property="bg"]') as HTMLInputElement
      input.value = 'notacolor'
      input.dispatchEvent(new Event('input'))

      await vi.advanceTimersByTime(350)

      expect(mockModifier.updateProperty).not.toHaveBeenCalled()
    })

    it('accepts token references', async () => {
      mockExtractor.setProperties({
        colors: [{ name: 'bg', value: '#1a1a1a', type: 'color' }]
      })

      panel.updatePanel('node-1')

      const input = container.querySelector('[data-property="bg"]') as HTMLInputElement
      input.value = '$primary'
      input.dispatchEvent(new Event('input'))

      await vi.advanceTimersByTime(350)

      expect(mockModifier.updateProperty).toHaveBeenCalledWith('node-1', 'bg', '$primary')
    })
  })

  describe('Token Integration', () => {
    it('shows token autocomplete on $ input', () => {
      mockExtractor.setProperties({
        colors: [{ name: 'bg', value: '#1a1a1a', type: 'color' }]
      })
      mockExtractor.setAvailableTokens(['$primary.bg', '$secondary.bg'])

      panel.updatePanel('node-1')

      const input = container.querySelector('[data-property="bg"]') as HTMLInputElement
      input.value = '$'
      input.dispatchEvent(new Event('input'))

      const autocomplete = container.querySelector('.token-autocomplete')
      expect(autocomplete).toBeDefined()
    })

    it('displays resolved token value', () => {
      mockExtractor.setProperties({
        colors: [{
          name: 'bg',
          value: '$primary',
          type: 'color',
          isToken: true,
          resolvedValue: '#2563eb'
        }]
      })

      panel.updatePanel('node-1')

      const swatch = container.querySelector('.color-swatch') as HTMLElement
      // Swatch should show resolved color
      expect(swatch.style.backgroundColor).toContain('rgb(37, 99, 235)')
    })
  })
})
```

---

### 2.6 Integration Tests: Panel + Extractor + Modifier

**Datei**: `tests/studio/property-panel-integration.test.ts`

```typescript
describe('PropertyPanel Integration', () => {
  let container: HTMLElement
  let panel: PropertyPanel
  let source: string
  let extractor: PropertyExtractor
  let modifier: CodeModifier

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)

    source = `Frame bg #1a1a1a, pad 16, rad 8
  Text "Hello", col white, fs 18
  Button "Click", bg #2563eb`

    const { ast, sourceMap } = compile(source)
    extractor = new PropertyExtractor(ast, sourceMap)
    modifier = new CodeModifier(source, sourceMap)

    panel = new PropertyPanel(
      container,
      mockSelectionProvider,
      extractor,
      modifier,
      (change) => { source = change.newSource }
    )
  })

  describe('Edit Property Flow', () => {
    it('complete flow: read → edit → write', async () => {
      // 1. Select element
      panel.updatePanel('node-1')

      // 2. Verify current value displayed
      const input = container.querySelector('[data-property="bg"]') as HTMLInputElement
      expect(input.value).toBe('#1a1a1a')

      // 3. Edit value
      input.value = '#2563eb'
      input.dispatchEvent(new Event('input'))

      await vi.advanceTimersByTime(350)

      // 4. Verify source updated
      expect(source).toContain('bg #2563eb')
      expect(source).not.toContain('bg #1a1a1a')
    })

    it('maintains other properties when editing one', async () => {
      panel.updatePanel('node-1')

      const bgInput = container.querySelector('[data-property="bg"]') as HTMLInputElement
      bgInput.value = '#ffffff'
      bgInput.dispatchEvent(new Event('input'))

      await vi.advanceTimersByTime(350)

      // Other properties should remain
      expect(source).toContain('pad 16')
      expect(source).toContain('rad 8')
    })

    it('multiple edits accumulate correctly', async () => {
      panel.updatePanel('node-1')

      // Edit bg
      const bgInput = container.querySelector('[data-property="bg"]') as HTMLInputElement
      bgInput.value = '#ffffff'
      bgInput.dispatchEvent(new Event('input'))
      await vi.advanceTimersByTime(350)

      // Recompile with new source
      const { ast, sourceMap } = compile(source)
      panel.updateExtractor(new PropertyExtractor(ast, sourceMap))
      panel.updateModifier(new CodeModifier(source, sourceMap))
      panel.updatePanel('node-1')

      // Edit pad
      const padInput = container.querySelector('[data-property="pad"]') as HTMLInputElement
      padInput.value = '24'
      padInput.dispatchEvent(new Event('input'))
      await vi.advanceTimersByTime(350)

      // Both changes should be in source
      expect(source).toContain('bg #ffffff')
      expect(source).toContain('pad 24')
    })
  })

  describe('Component Property Inheritance', () => {
    it('shows inherited properties from component', async () => {
      source = `
Btn: bg #2563eb, col white, pad 12
Btn "Click"
`
      const { ast, sourceMap } = compile(source)
      extractor = new PropertyExtractor(ast, sourceMap)
      modifier = new CodeModifier(source, sourceMap)
      panel.updateExtractor(extractor)
      panel.updateModifier(modifier)

      // Select instance
      panel.updatePanel('node-2')

      // Should show inherited bg
      const bgInput = container.querySelector('[data-property="bg"]') as HTMLInputElement
      expect(bgInput.value).toBe('#2563eb')

      // Should indicate inheritance
      const bgField = bgInput.closest('.property-field')
      expect(bgField?.classList.contains('inherited')).toBe(true)
    })

    it('overriding inherited property updates instance only', async () => {
      source = `
Btn: bg #2563eb, col white
Btn "Click"
`
      const { ast, sourceMap } = compile(source)
      extractor = new PropertyExtractor(ast, sourceMap)
      modifier = new CodeModifier(source, sourceMap)
      panel.updateExtractor(extractor)
      panel.updateModifier(modifier)

      panel.updatePanel('node-2')

      const bgInput = container.querySelector('[data-property="bg"]') as HTMLInputElement
      bgInput.value = '#ef4444'
      bgInput.dispatchEvent(new Event('input'))

      await vi.advanceTimersByTime(350)

      // Instance should have override
      expect(source).toContain('Btn "Click", bg #ef4444')

      // Component definition unchanged
      expect(source).toContain('Btn: bg #2563eb')
    })
  })
})
```

---

### 2.7 E2E Tests: Browser-basiert

**Datei**: `tests/e2e/property-panel-e2e.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Property Panel E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio/')
    await page.waitForSelector('[data-mirror-id]', { timeout: 10000 })
  })

  test('selecting element shows properties', async ({ page }) => {
    // Click element
    await page.locator('[data-mirror-id="node-1"]').click()

    // Property panel should appear
    const panel = page.locator('.property-panel')
    await expect(panel).toBeVisible()

    // Should show properties
    const properties = panel.locator('.property-field')
    await expect(properties.first()).toBeVisible()
  })

  test('editing property updates code', async ({ page }) => {
    // Select element
    await page.locator('[data-mirror-id="node-1"]').click()

    // Find bg property input
    const bgInput = page.locator('[data-property="bg"]')
    await bgInput.clear()
    await bgInput.fill('#ff0000')

    // Wait for debounce and update
    await page.waitForTimeout(500)

    // Check editor content
    const editor = page.locator('.cm-editor')
    const content = await editor.textContent()
    expect(content).toContain('#ff0000')
  })

  test('clicking color swatch opens picker', async ({ page }) => {
    await page.locator('[data-mirror-id="node-1"]').click()

    const swatch = page.locator('.color-swatch').first()
    await swatch.click()

    const picker = page.locator('.color-picker')
    await expect(picker).toBeVisible()
  })

  test('selecting color from picker updates property', async ({ page }) => {
    await page.locator('[data-mirror-id="node-1"]').click()

    const swatch = page.locator('.color-swatch').first()
    await swatch.click()

    // Click a color in the picker
    const color = page.locator('.color-picker .color-option').first()
    await color.click()

    // Wait for update
    await page.waitForTimeout(500)

    // Swatch should update
    const newColor = await swatch.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    )
    expect(newColor).not.toBe('rgb(26, 26, 26)') // original color
  })

  test('spacing presets update property', async ({ page }) => {
    await page.locator('[data-mirror-id="node-1"]').click()

    // Click spacing preset
    const preset = page.locator('[data-property="pad"] .preset-button').nth(2)
    await preset.click()

    // Wait for update
    await page.waitForTimeout(500)

    // Input should update
    const input = page.locator('[data-property="pad"]')
    const value = await input.inputValue()
    expect(value).toBeDefined()
  })

  test('invalid input shows error', async ({ page }) => {
    await page.locator('[data-mirror-id="node-1"]').click()

    const input = page.locator('[data-property="pad"]')
    await input.clear()
    await input.fill('invalid')
    await input.blur()

    // Should show error state
    await expect(input).toHaveClass(/invalid/)
  })

  test('token autocomplete appears on $ input', async ({ page }) => {
    await page.locator('[data-mirror-id="node-1"]').click()

    const input = page.locator('[data-property="bg"]')
    await input.clear()
    await input.fill('$')

    // Autocomplete should appear
    const autocomplete = page.locator('.token-autocomplete')
    await expect(autocomplete).toBeVisible({ timeout: 2000 })
  })

  test('selecting token from autocomplete updates property', async ({ page }) => {
    await page.locator('[data-mirror-id="node-1"]').click()

    const input = page.locator('[data-property="bg"]')
    await input.clear()
    await input.fill('$')

    // Wait for autocomplete
    const autocomplete = page.locator('.token-autocomplete')
    await expect(autocomplete).toBeVisible()

    // Select first token
    const token = autocomplete.locator('.token-option').first()
    await token.click()

    // Input should have token
    const value = await input.inputValue()
    expect(value).toMatch(/^\$/)
  })

  test('property panel updates after code edit in editor', async ({ page }) => {
    // Select element
    await page.locator('[data-mirror-id="node-1"]').click()

    // Get initial bg value
    const bgInput = page.locator('[data-property="bg"]')
    const initialValue = await bgInput.inputValue()

    // Edit in editor
    const editor = page.locator('.cm-editor')
    await editor.click()

    // Replace bg value (simplified - actual implementation may vary)
    await page.keyboard.press('Control+h') // Find/Replace
    await page.keyboard.type(initialValue)
    await page.keyboard.press('Tab')
    await page.keyboard.type('#00ff00')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Escape')

    // Wait for recompile and panel update
    await page.waitForTimeout(1000)

    // Panel should show new value
    const newValue = await bgInput.inputValue()
    expect(newValue).toBe('#00ff00')
  })
})
```

---

## Teil 3: Test-Utilities

### 3.1 Mock-Factories

**Datei**: `tests/utils/mocks/property-panel-mocks.ts`

```typescript
export function createMockPropertyExtractor(): MockPropertyExtractor {
  const properties = new Map<string, ExtractedProperty[]>()
  const tokens: string[] = []

  return {
    getProperties: vi.fn((nodeId) => properties.get(nodeId) || []),
    getPropertiesByCategory: vi.fn((nodeId) => {
      const props = properties.get(nodeId) || []
      return groupByCategory(props)
    }),
    resolveTokenValue: vi.fn((token, suffix) => {
      // Return mock resolved value
      return '#mock-resolved'
    }),
    setProperties(nodeId: string, props: ExtractedProperty[]) {
      properties.set(nodeId, props)
    },
    setAvailableTokens(t: string[]) {
      tokens.push(...t)
    }
  }
}

export function createMockCodeModifier(): MockCodeModifier {
  return {
    updateProperty: vi.fn(() => ({
      success: true,
      newSource: 'mock source',
      change: { from: 0, to: 10, insert: 'new' }
    })),
    addProperty: vi.fn(() => ({
      success: true,
      newSource: 'mock source',
      change: { from: 0, to: 0, insert: 'new prop' }
    })),
    removeProperty: vi.fn(() => ({
      success: true,
      newSource: 'mock source',
      change: { from: 0, to: 10, insert: '' }
    }))
  }
}

export function createMockSelectionProvider(): SelectionProvider {
  const listeners: Set<(nodeId: string | null) => void> = new Set()
  let currentSelection: string | null = null

  return {
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSelection: () => currentSelection,
    select: (nodeId) => {
      const prev = currentSelection
      currentSelection = nodeId
      listeners.forEach(l => l(nodeId, prev))
    },
    clearSelection: () => {
      const prev = currentSelection
      currentSelection = null
      listeners.forEach(l => l(null, prev))
    }
  }
}
```

### 3.2 Test Helpers

**Datei**: `tests/utils/helpers/property-panel-helpers.ts`

```typescript
export async function waitForPanelUpdate(panel: PropertyPanel): Promise<void> {
  return new Promise(resolve => {
    const observer = new MutationObserver(() => {
      observer.disconnect()
      resolve()
    })
    observer.observe(panel.container, { childList: true, subtree: true })
  })
}

export function getPropertyInput(
  container: HTMLElement,
  propName: string
): HTMLInputElement | null {
  return container.querySelector(`[data-property="${propName}"]`)
}

export function getAllPropertyFields(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('.property-field'))
}

export async function simulatePropertyEdit(
  container: HTMLElement,
  propName: string,
  newValue: string
): Promise<void> {
  const input = getPropertyInput(container, propName)
  if (!input) throw new Error(`Property ${propName} not found`)

  input.value = newValue
  input.dispatchEvent(new Event('input', { bubbles: true }))

  // Wait for debounce
  await vi.advanceTimersByTime(350)
}
```

---

## Teil 4: Testabdeckungs-Ziele

### 4.1 Sync-Abdeckung

| Bereich | Unit | Integration | E2E | Priorität |
|---------|------|-------------|-----|-----------|
| Selection Propagation | ✓ | ✓ | ✓ | Hoch |
| Debouncing | ✓ | - | - | Mittel |
| Loop Prevention | ✓ | ✓ | ✓ | Hoch |
| SourceMap Integration | ✓ | ✓ | - | Mittel |
| Multi-file Offset | ✓ | ✓ | - | Niedrig |
| Error Recovery | ✓ | ✓ | ✓ | Hoch |

### 4.2 Property Panel Abdeckung

| Bereich | Unit | Integration | E2E | Priorität |
|---------|------|-------------|-----|-----------|
| Property Extraction | ✓ | - | - | Hoch |
| Code Modification | ✓ | ✓ | - | Hoch |
| Field Rendering | ✓ | - | ✓ | Mittel |
| Input Validation | ✓ | - | ✓ | Hoch |
| Token Handling | ✓ | ✓ | ✓ | Mittel |
| Debouncing | ✓ | - | - | Niedrig |
| Component Inheritance | ✓ | ✓ | - | Mittel |
| Picker Integration | - | ✓ | ✓ | Mittel |

---

## Teil 5: Implementierungs-Roadmap

### Phase 1: Foundation (Woche 1)
- [ ] Mock-Factories erstellen
- [ ] Test-Helpers implementieren
- [ ] Bestehende Tests refactoren

### Phase 2: Unit Tests (Woche 2)
- [ ] SyncCoordinator Unit Tests
- [ ] LineOffsetService Tests
- [ ] PropertyExtractor Tests
- [ ] CodeModifier Tests

### Phase 3: Integration Tests (Woche 3)
- [ ] Sync Integration Tests
- [ ] PropertyPanel Integration Tests
- [ ] Cross-Component Tests

### Phase 4: E2E Tests (Woche 4)
- [ ] Sync E2E Tests
- [ ] PropertyPanel E2E Tests
- [ ] Full Flow Tests

### Phase 5: Maintenance
- [ ] CI Integration
- [ ] Coverage Reports
- [ ] Dokumentation aktualisieren
