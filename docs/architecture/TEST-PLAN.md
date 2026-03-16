# Umfassender Testplan - Studio Module

## Übersicht

### Aktuelle Test-Abdeckung

| Modul | Tests | Status |
|-------|-------|--------|
| `studio/core/` | ✅ core.test.ts | Vorhanden |
| `studio/sync/` | ✅ sync.test.ts | Vorhanden |
| `studio/preview/` | ✅ preview.test.ts | Vorhanden |
| `studio/autocomplete/` | ✅ autocomplete.test.ts | Vorhanden |
| `studio/modules/file-manager/` | ✅ file-operations.test.ts | Vorhanden |
| `studio/modules/compiler/` | ✅ prelude-builder.test.ts | Vorhanden |
| `studio/pickers/base/` | ❌ | **Fehlt** |
| `studio/pickers/color/` | ❌ | **Fehlt** |
| `studio/pickers/token/` | ❌ | **Fehlt** |
| `studio/pickers/icon/` | ❌ | **Fehlt** |
| `studio/pickers/animation/` | ❌ | **Fehlt** |
| `studio/panels/property/` | ❌ | **Fehlt** |
| `studio/panels/tree/` | ❌ | **Fehlt** |
| `studio/panels/files/` | ❌ | **Fehlt** |
| `studio/preview/renderer.ts` | ❌ | **Fehlt** |

---

## Fehlende Tests

### 1. Pickers Base (`studio/pickers/base/__tests__/`)

#### keyboard-nav.test.ts

```typescript
describe('KeyboardNav', () => {
  describe('Initialization', () => {
    it('should initialize with default options')
    it('should accept custom orientation')
    it('should accept wrap option')
  })

  describe('Item Management', () => {
    it('should set items array')
    it('should handle empty items')
    it('should select first item by default')
  })

  describe('Vertical Navigation', () => {
    it('should move down on ArrowDown')
    it('should move up on ArrowUp')
    it('should wrap at boundaries when wrap=true')
    it('should stop at boundaries when wrap=false')
  })

  describe('Horizontal Navigation', () => {
    it('should move right on ArrowRight')
    it('should move left on ArrowLeft')
  })

  describe('Grid Navigation', () => {
    it('should calculate column count')
    it('should move down to next row')
    it('should move up to previous row')
    it('should handle partial last row')
  })

  describe('Selection', () => {
    it('should call onSelect on Enter')
    it('should call onSelect on Space')
    it('should update visual focus')
  })

  describe('Cancel', () => {
    it('should call onCancel on Escape')
  })
})
```

#### picker.test.ts

```typescript
describe('BasePicker', () => {
  describe('Lifecycle', () => {
    it('should initialize as closed')
    it('should open with show()')
    it('should close with hide()')
    it('should toggle state')
  })

  describe('Positioning', () => {
    it('should position below anchor by default')
    it('should position above when no space below')
    it('should respect viewport boundaries')
    it('should update position on window resize')
  })

  describe('Event Handling', () => {
    it('should close on outside click')
    it('should close on Escape')
    it('should prevent event bubbling')
  })

  describe('Selection', () => {
    it('should call onSelect with value')
    it('should close after selection')
  })
})
```

---

### 2. Color Picker (`studio/pickers/color/__tests__/`)

#### palette.test.ts

```typescript
describe('Color Palette Utilities', () => {
  describe('parseColor', () => {
    it('should parse 3-digit hex')
    it('should parse 6-digit hex')
    it('should parse 8-digit hex with alpha')
    it('should handle invalid colors')
  })

  describe('hexToHSL', () => {
    it('should convert black to HSL(0,0,0)')
    it('should convert white to HSL(0,0,100)')
    it('should convert red to HSL(0,100,50)')
    it('should handle various colors')
  })

  describe('hslToHex', () => {
    it('should convert HSL to hex')
    it('should round trip correctly')
  })

  describe('generateShades', () => {
    it('should generate 9 shades')
    it('should include original color')
    it('should have lighter variants')
    it('should have darker variants')
  })

  describe('isLightColor', () => {
    it('should return true for light colors')
    it('should return false for dark colors')
    it('should handle edge cases')
  })
})
```

#### color-picker.test.ts

```typescript
describe('ColorPicker', () => {
  describe('Rendering', () => {
    it('should render palette tab by default')
    it('should render custom tab when switched')
    it('should render gray scale row')
    it('should render color palette grid')
  })

  describe('Tab Switching', () => {
    it('should switch to custom tab')
    it('should switch to palette tab')
    it('should preserve state between tabs')
  })

  describe('Palette Selection', () => {
    it('should select color on click')
    it('should highlight selected color')
    it('should call onSelect with hex value')
  })

  describe('Custom Input', () => {
    it('should accept hex input')
    it('should validate hex format')
    it('should update preview on input')
    it('should submit on Enter')
  })

  describe('Keyboard Navigation', () => {
    it('should navigate palette with arrows')
    it('should select with Enter')
    it('should close with Escape')
  })

  describe('Token Integration', () => {
    it('should show token button when tokens available')
    it('should switch to token picker')
  })
})
```

---

### 3. Token Picker (`studio/pickers/token/__tests__/`)

#### token-picker.test.ts

```typescript
describe('TokenPicker', () => {
  describe('Token Parsing', () => {
    it('should parse tokens from source')
    it('should categorize by type (color, size, etc.)')
    it('should extract token values')
  })

  describe('Context Filtering', () => {
    it('should filter tokens for bg context')
    it('should filter tokens for pad context')
    it('should filter tokens for col context')
    it('should show all tokens when no context')
  })

  describe('Rendering', () => {
    it('should render token list')
    it('should show token name')
    it('should show token value')
    it('should show color preview for color tokens')
  })

  describe('Selection', () => {
    it('should select token on click')
    it('should format output as $tokenName')
    it('should call onSelect')
  })

  describe('Search', () => {
    it('should filter by token name')
    it('should be case insensitive')
    it('should show no results message')
  })

  describe('Keyboard Navigation', () => {
    it('should navigate with arrows')
    it('should select with Enter')
    it('should filter while typing')
  })
})
```

---

### 4. Icon Picker (`studio/pickers/icon/__tests__/`)

#### icon-data.test.ts

```typescript
describe('Icon Data', () => {
  describe('ICONS array', () => {
    it('should contain all icons')
    it('should have valid SVG paths')
    it('should have categories')
    it('should have tags for search')
  })

  describe('searchIcons', () => {
    it('should find by name')
    it('should find by tag')
    it('should be case insensitive')
    it('should return empty for no match')
  })

  describe('getIconsByCategory', () => {
    it('should filter by category')
    it('should return all categories')
  })

  describe('getCategories', () => {
    it('should return all unique categories')
    it('should include count per category')
  })
})
```

#### icon-picker.test.ts

```typescript
describe('IconPicker', () => {
  describe('Rendering', () => {
    it('should render icon grid')
    it('should render category tabs')
    it('should render search input')
    it('should render SVG icons')
  })

  describe('Category Filtering', () => {
    it('should show all icons by default')
    it('should filter by category')
    it('should update active tab')
  })

  describe('Search', () => {
    it('should filter icons by query')
    it('should search name and tags')
    it('should clear category on search')
    it('should show no results')
  })

  describe('Selection', () => {
    it('should select icon on click')
    it('should return icon name')
    it('should close picker')
  })

  describe('Keyboard Navigation', () => {
    it('should navigate grid with arrows')
    it('should handle multi-column layout')
    it('should focus search on open')
  })
})
```

---

### 5. Animation Picker (`studio/pickers/animation/__tests__/`)

#### presets.test.ts

```typescript
describe('Animation Presets', () => {
  describe('ANIMATION_PRESETS', () => {
    it('should contain all presets')
    it('should have valid keyframes')
    it('should have duration')
    it('should have easing')
    it('should have category')
  })

  describe('getPresetsByCategory', () => {
    it('should filter fade animations')
    it('should filter slide animations')
    it('should filter bounce animations')
  })

  describe('getAnimationCategories', () => {
    it('should return all categories')
  })

  describe('getPreset', () => {
    it('should find preset by name')
    it('should return null for unknown')
  })
})
```

#### animation-picker.test.ts

```typescript
describe('AnimationPicker', () => {
  describe('Rendering', () => {
    it('should render preset list')
    it('should render category tabs')
    it('should render preview area')
  })

  describe('Category Filtering', () => {
    it('should show all by default')
    it('should filter by category')
  })

  describe('Preview', () => {
    it('should preview on hover')
    it('should inject keyframes')
    it('should apply animation')
    it('should cleanup after animation')
  })

  describe('Selection', () => {
    it('should select preset')
    it('should return preset name')
  })
})
```

---

### 6. Property Panel (`studio/panels/property/__tests__/`)

#### ui-renderer.test.ts

```typescript
describe('UIRenderer', () => {
  describe('Category Rendering', () => {
    it('should render layout category')
    it('should render size category')
    it('should render spacing category')
    it('should render color category')
    it('should collapse/expand categories')
  })

  describe('Input Types', () => {
    it('should render text input')
    it('should render number input')
    it('should render color input with picker')
    it('should render select dropdown')
    it('should render checkbox')
  })

  describe('Value Display', () => {
    it('should show current value')
    it('should show placeholder for empty')
    it('should show token reference')
  })

  describe('Validation', () => {
    it('should validate number input')
    it('should validate color format')
  })
})
```

#### change-handler.test.ts

```typescript
describe('ChangeHandler', () => {
  describe('Property Changes', () => {
    it('should apply property change')
    it('should remove property')
    it('should modify existing property')
  })

  describe('CodeModifier Integration', () => {
    it('should call setProperty')
    it('should call removeProperty')
    it('should handle errors')
  })

  describe('Events', () => {
    it('should emit change event')
    it('should include change details')
  })
})
```

---

### 7. Tree Panel (`studio/panels/tree/__tests__/`)

#### tree-panel.test.ts

```typescript
describe('TreePanel', () => {
  describe('Tree Building', () => {
    it('should build tree from AST')
    it('should handle components')
    it('should handle instances')
    it('should handle nested children')
  })

  describe('Rendering', () => {
    it('should render tree nodes')
    it('should show expand/collapse icons')
    it('should show node names')
    it('should show node types')
    it('should apply indentation')
  })

  describe('Expand/Collapse', () => {
    it('should expand node')
    it('should collapse node')
    it('should expand all')
    it('should collapse all')
    it('should expand to selected node')
  })

  describe('Selection', () => {
    it('should select node on click')
    it('should highlight selected')
    it('should call onSelect callback')
  })

  describe('Navigation', () => {
    it('should navigate with arrow keys')
    it('should expand with ArrowRight')
    it('should collapse with ArrowLeft')
  })
})
```

---

### 8. File Panel (`studio/panels/files/__tests__/`)

#### file-panel.test.ts

```typescript
describe('FilePanel', () => {
  describe('Rendering', () => {
    it('should render file list')
    it('should group by type')
    it('should show file icons')
    it('should highlight current file')
  })

  describe('File Selection', () => {
    it('should select file on click')
    it('should call onSelect callback')
  })

  describe('Context Menu', () => {
    it('should show on right-click')
    it('should have rename option')
    it('should have delete option')
    it('should have duplicate option')
    it('should close on outside click')
  })

  describe('Rename', () => {
    it('should enter rename mode')
    it('should show input with current name')
    it('should save on Enter')
    it('should cancel on Escape')
    it('should call onRename callback')
  })

  describe('New File', () => {
    it('should show new file menu')
    it('should offer file types')
    it('should call onCreate callback')
  })
})
```

---

### 9. Preview Renderer (`studio/preview/__tests__/`)

#### renderer.test.ts

```typescript
describe('PreviewRenderer', () => {
  describe('Token Mode', () => {
    it('should render token sections')
    it('should render token items')
    it('should show color previews')
    it('should show token names')
    it('should show token values')
  })

  describe('Component Mode', () => {
    it('should render component cards')
    it('should show component name')
    it('should show extends/primitive')
    it('should show property count')
    it('should show children count')
  })

  describe('Layout Mode', () => {
    it('should execute JS code')
    it('should inject runtime')
    it('should handle errors')
  })

  describe('Mode Switching', () => {
    it('should switch modes')
    it('should clear previous content')
  })

  describe('Node IDs', () => {
    it('should set data-mirror-id attributes')
    it('should enable selection')
  })
})
```

---

## Integration Tests

### E2E Workflows (`studio/__tests__/e2e/`)

#### picker-workflows.test.ts

```typescript
describe('Picker Workflows', () => {
  describe('Color Selection Flow', () => {
    it('should open picker from property panel')
    it('should select color')
    it('should update source code')
    it('should update preview')
  })

  describe('Token Selection Flow', () => {
    it('should switch from color to token picker')
    it('should filter by context')
    it('should insert token reference')
  })

  describe('Icon Selection Flow', () => {
    it('should search for icon')
    it('should preview icon')
    it('should insert icon name')
  })
})
```

#### panel-workflows.test.ts

```typescript
describe('Panel Workflows', () => {
  describe('Property Panel Editing', () => {
    it('should select element in preview')
    it('should show properties in panel')
    it('should edit property')
    it('should sync changes to editor')
  })

  describe('Tree Panel Navigation', () => {
    it('should sync selection with preview')
    it('should sync selection with editor')
  })

  describe('File Panel Operations', () => {
    it('should switch files')
    it('should preserve state per file')
    it('should compile on file change')
  })
})
```

---

## Test-Utilities

### Mock Factories (`studio/__tests__/mocks/`)

```typescript
// mock-ast.ts
export function createMockAST(options?: Partial<AST>): AST

// mock-source-map.ts
export function createMockSourceMap(): SourceMap

// mock-dom.ts
export function createMockContainer(): HTMLElement
export function createMockAnchor(): HTMLElement

// mock-tokens.ts
export function createMockTokens(): TokenDefinition[]

// mock-icons.ts
export function createMockIcons(): IconDefinition[]
```

---

## Ausführungsplan

### Phase 1: Base & Utilities (1 Tag)

1. `pickers/base/__tests__/keyboard-nav.test.ts`
2. `pickers/base/__tests__/picker.test.ts`
3. `pickers/color/__tests__/palette.test.ts`

### Phase 2: Pickers (2 Tage)

4. `pickers/color/__tests__/color-picker.test.ts`
5. `pickers/token/__tests__/token-picker.test.ts`
6. `pickers/icon/__tests__/icon-data.test.ts`
7. `pickers/icon/__tests__/icon-picker.test.ts`
8. `pickers/animation/__tests__/presets.test.ts`
9. `pickers/animation/__tests__/animation-picker.test.ts`

### Phase 3: Panels (2 Tage)

10. `panels/property/__tests__/ui-renderer.test.ts`
11. `panels/property/__tests__/change-handler.test.ts`
12. `panels/tree/__tests__/tree-panel.test.ts`
13. `panels/files/__tests__/file-panel.test.ts`

### Phase 4: Preview & Integration (1 Tag)

14. `preview/__tests__/renderer.test.ts`
15. E2E Workflow Tests

---

## Erwartete Metriken

| Metrik | Ziel |
|--------|------|
| Test-Dateien | +15 neue |
| Einzelne Tests | +200 neue |
| Gesamt Tests | ~800 |
| Code Coverage | >80% |
| Kritische Pfade | 100% |

---

## Prioritäten

### Kritisch (P0)

- KeyboardNav (wird von allen Pickern genutzt)
- BasePicker (Basis aller Picker)
- ColorPicker (meistgenutzt)
- PropertyPanel ChangeHandler

### Hoch (P1)

- TokenPicker
- IconPicker
- TreePanel
- FilePanel

### Mittel (P2)

- AnimationPicker
- PreviewRenderer
- E2E Workflows
