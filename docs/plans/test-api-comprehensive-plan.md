# Comprehensive Test API Plan

## Ziel

Jede Mirror-Funktionalität soll programmatisch testbar sein. Die Test API ermöglicht:
- Unit Tests ohne Browser
- Integration Tests mit DOM
- E2E Tests mit Playwright
- Snapshot Testing für Regression

---

## Übersicht der Phasen

| Phase | Bereich | Funktionen | Status |
|-------|---------|------------|--------|
| 0 | Core | Element Access, State Machine, Events | ✅ Done |
| 1 | Visibility | show, hide, isVisible, isHidden | ✅ Done (39 unit tests) |
| 2 | Navigation | navigate, navigateToPage, history | ✅ Done (44 unit tests) |
| 3 | Selection | select, deselect, highlight, focus | ✅ Done (25 integration tests) |
| 4 | Data Binding | variables, bindings, updates | Pending |
| 5 | Forms | values, validation, submit | Pending |
| 6 | Animation | trigger, wait, verify | Pending |
| 7 | Zag Components | dialog, tabs, select, etc. | Pending |
| 8 | Snapshots | capture, compare, diff | Pending |
| 9 | Debug Tools | logging, inspection, tree | Pending |

---

## Phase 1: Visibility

### API Erweiterung

```typescript
interface MirrorTestAPI {
  // ... existing ...

  // Visibility Control
  show(el: MirrorElement): void
  hide(el: MirrorElement): void

  // Visibility Checks
  isVisible(el: MirrorElement): boolean      // already exists
  isHidden(el: MirrorElement): boolean
  isDisplayNone(el: MirrorElement): boolean
  isOpacityZero(el: MirrorElement): boolean
  hasHiddenAttribute(el: MirrorElement): boolean

  // Visibility State
  getVisibilityState(el: MirrorElement): {
    visible: boolean
    display: string
    opacity: number
    hidden: boolean
    reason: 'display' | 'opacity' | 'hidden' | 'visibility' | 'visible'
  }

  // Async
  waitForVisible(el: MirrorElement, timeout?: number): Promise<boolean>
  waitForHidden(el: MirrorElement, timeout?: number): Promise<boolean>
}
```

### Implementation

**Datei:** `compiler/runtime/test-api.ts`

```typescript
// Add to createTestAPI():

show(el: MirrorElement): void {
  if (!el) return
  runtime.show(el)
},

hide(el: MirrorElement): void {
  if (!el) return
  runtime.hide(el)
},

isHidden(el: MirrorElement): boolean {
  return !this.isVisible(el)
},

isDisplayNone(el: MirrorElement): boolean {
  if (!el) return true
  return window.getComputedStyle(el).display === 'none'
},

isOpacityZero(el: MirrorElement): boolean {
  if (!el) return true
  return parseFloat(window.getComputedStyle(el).opacity) === 0
},

hasHiddenAttribute(el: MirrorElement): boolean {
  if (!el) return true
  return el.hidden === true
},

getVisibilityState(el: MirrorElement): VisibilityState {
  if (!el) return { visible: false, display: 'none', opacity: 0, hidden: true, reason: 'hidden' }

  const style = window.getComputedStyle(el)
  const display = style.display
  const opacity = parseFloat(style.opacity)
  const hidden = el.hidden
  const visibility = style.visibility

  let reason: string = 'visible'
  let visible = true

  if (display === 'none') { visible = false; reason = 'display' }
  else if (opacity === 0) { visible = false; reason = 'opacity' }
  else if (hidden) { visible = false; reason = 'hidden' }
  else if (visibility === 'hidden') { visible = false; reason = 'visibility' }

  return { visible, display, opacity, hidden, reason }
},

waitForHidden(el: MirrorElement, timeout: number = 1000): Promise<boolean> {
  return this.waitForVisible(el, false, timeout)
},
```

### Tests

**Datei:** `tests/runtime/test-api-visibility.test.ts`

```typescript
describe('Test API - Visibility', () => {
  describe('show/hide', () => {
    it('show() should make element visible')
    it('hide() should hide element')
    it('show() on already visible element should not change anything')
    it('hide() on already hidden element should not change anything')
  })

  describe('visibility checks', () => {
    it('isHidden() should return true for display:none')
    it('isHidden() should return true for opacity:0')
    it('isHidden() should return true for hidden attribute')
    it('isHidden() should return true for visibility:hidden')
    it('isVisible() should return true for visible elements')
  })

  describe('getVisibilityState', () => {
    it('should return correct reason for display:none')
    it('should return correct reason for opacity:0')
    it('should return correct reason for hidden attribute')
    it('should return correct opacity value')
  })

  describe('async', () => {
    it('waitForVisible() should resolve when element becomes visible')
    it('waitForHidden() should resolve when element becomes hidden')
    it('waitForVisible() should timeout if element stays hidden')
  })
})
```

---

## Phase 2: Navigation

### API Erweiterung

```typescript
interface MirrorTestAPI {
  // ... existing ...

  // Navigation Actions
  navigate(target: string): void
  navigateToPage(pageName: string): Promise<void>
  goBack(): void
  goForward(): void

  // Navigation State
  getCurrentPage(): string | null
  getNavigationHistory(): string[]
  getPageContainer(): MirrorElement | null

  // View Switching (single-page)
  showView(view: MirrorElement): void
  hideView(view: MirrorElement): void
  switchToView(view: MirrorElement): void
  getActiveView(container: MirrorElement): MirrorElement | null
  getAllViews(container: MirrorElement): MirrorElement[]

  // Async
  waitForNavigation(pageName: string, timeout?: number): Promise<boolean>
  waitForViewChange(view: MirrorElement, timeout?: number): Promise<boolean>
}
```

### Tests

```typescript
describe('Test API - Navigation', () => {
  describe('page navigation', () => {
    it('navigateToPage() should load and render page')
    it('getCurrentPage() should return current page name')
    it('goBack() should navigate to previous page')
    it('getNavigationHistory() should track visited pages')
  })

  describe('view switching', () => {
    it('showView() should show specific view')
    it('hideView() should hide specific view')
    it('switchToView() should show one and hide others')
    it('getActiveView() should return visible view')
  })

  describe('component navigation', () => {
    it('navigate() to PascalCase should switch component state')
    it('navigate() to lowercase should load page')
  })
})
```

---

## Phase 3: Selection & Focus

### API Erweiterung

```typescript
interface MirrorTestAPI {
  // ... existing ...

  // Selection
  select(el: MirrorElement): void
  deselect(el: MirrorElement): void
  toggleSelection(el: MirrorElement): void
  isSelected(el: MirrorElement): boolean
  getSelectedItems(container?: MirrorElement): MirrorElement[]
  clearSelection(container?: MirrorElement): void

  // Highlighting (for dropdowns, lists)
  highlight(el: MirrorElement): void
  unhighlight(el: MirrorElement): void
  highlightNext(container: MirrorElement): MirrorElement | null
  highlightPrev(container: MirrorElement): MirrorElement | null
  highlightFirst(container: MirrorElement): MirrorElement | null
  highlightLast(container: MirrorElement): MirrorElement | null
  getHighlightedItem(container: MirrorElement): MirrorElement | null
  getHighlightableItems(container: MirrorElement): MirrorElement[]
  isHighlighted(el: MirrorElement): boolean

  // Focus
  focus(el: MirrorElement): void
  blur(el: MirrorElement): void
  getFocusedElement(): MirrorElement | null
  isFocused(el: MirrorElement): boolean
  focusNext(container?: MirrorElement): MirrorElement | null
  focusPrev(container?: MirrorElement): MirrorElement | null
  getFocusableElements(container?: MirrorElement): MirrorElement[]
}
```

### Tests

```typescript
describe('Test API - Selection', () => {
  describe('selection', () => {
    it('select() should mark element as selected')
    it('deselect() should unmark element')
    it('isSelected() should return selection state')
    it('getSelectedItems() should return all selected')
    it('clearSelection() should deselect all')
  })

  describe('highlighting', () => {
    it('highlight() should mark element as highlighted')
    it('highlightNext() should move highlight forward')
    it('highlightPrev() should move highlight backward')
    it('getHighlightedItem() should return current highlight')
    it('highlighting should wrap around at boundaries')
  })

  describe('focus', () => {
    it('focus() should focus element')
    it('blur() should remove focus')
    it('getFocusedElement() should return focused element')
    it('focusNext() should move to next focusable')
    it('getFocusableElements() should list all focusable')
  })
})
```

---

## Phase 4: Data Binding & Variables

### API Erweiterung

```typescript
interface MirrorTestAPI {
  // ... existing ...

  // Variables (Tokens)
  getVariable(name: string): any
  setVariable(name: string, value: any): void
  getAllVariables(): Record<string, any>
  watchVariable(name: string, callback: (value: any) => void): () => void

  // Element Bindings
  getBoundValue(el: MirrorElement): any
  getBinding(el: MirrorElement): {
    type: 'text' | 'value' | 'visibility' | 'style' | 'state'
    variable: string
    expression?: string
  } | null
  getAllBoundElements(variableName: string): MirrorElement[]

  // Data Updates
  updateBinding(el: MirrorElement): void
  refreshAllBindings(): void

  // Collections (for each loops)
  getCollection(name: string): any[]
  setCollection(name: string, items: any[]): void
  addToCollection(name: string, item: any): void
  removeFromCollection(name: string, index: number): void
  getCollectionElements(name: string): MirrorElement[]
}
```

### Tests

```typescript
describe('Test API - Data Binding', () => {
  describe('variables', () => {
    it('getVariable() should return token value')
    it('setVariable() should update token and bound elements')
    it('getAllVariables() should list all tokens')
    it('watchVariable() should notify on changes')
  })

  describe('bindings', () => {
    it('getBoundValue() should return current bound value')
    it('getBinding() should describe binding type')
    it('getAllBoundElements() should find all bound to variable')
  })

  describe('collections', () => {
    it('getCollection() should return array')
    it('setCollection() should update list')
    it('addToCollection() should append and re-render')
    it('removeFromCollection() should remove and re-render')
  })
})
```

---

## Phase 5: Forms

### API Erweiterung

```typescript
interface MirrorTestAPI {
  // ... existing ...

  // Input Values
  getValue(input: MirrorElement): string
  setValue(input: MirrorElement, value: string): void
  getNumericValue(input: MirrorElement): number
  setNumericValue(input: MirrorElement, value: number): void

  // Checkbox/Radio
  isChecked(input: MirrorElement): boolean
  setChecked(input: MirrorElement, checked: boolean): void
  getCheckedValue(radioGroup: MirrorElement): string | null

  // Select/Dropdown
  getSelectedValue(select: MirrorElement): string
  getSelectedValues(select: MirrorElement): string[]  // for multi-select
  setSelectedValue(select: MirrorElement, value: string): void
  getOptions(select: MirrorElement): { value: string; label: string }[]

  // Validation
  isValid(input: MirrorElement): boolean
  getValidationMessage(input: MirrorElement): string
  getValidationState(form: MirrorElement): {
    valid: boolean
    errors: { field: string; message: string }[]
  }
  validateField(input: MirrorElement): boolean
  validateForm(form: MirrorElement): boolean

  // Form Actions
  getFormData(form: MirrorElement): Record<string, any>
  setFormData(form: MirrorElement, data: Record<string, any>): void
  submitForm(form: MirrorElement): void
  resetForm(form: MirrorElement): void
  clearForm(form: MirrorElement): void

  // Input State
  isDisabled(input: MirrorElement): boolean
  setDisabled(input: MirrorElement, disabled: boolean): void
  isReadonly(input: MirrorElement): boolean
  setReadonly(input: MirrorElement, readonly: boolean): void
}
```

### Tests

```typescript
describe('Test API - Forms', () => {
  describe('input values', () => {
    it('getValue() should return input value')
    it('setValue() should set value and trigger events')
    it('setValue() should trigger oninput and onchange')
  })

  describe('checkboxes', () => {
    it('isChecked() should return checked state')
    it('setChecked() should toggle checkbox')
    it('setChecked() should trigger onchange')
  })

  describe('validation', () => {
    it('isValid() should check validity')
    it('getValidationMessage() should return error')
    it('validateForm() should validate all fields')
  })

  describe('form actions', () => {
    it('getFormData() should collect all values')
    it('setFormData() should populate form')
    it('resetForm() should clear to defaults')
    it('submitForm() should trigger onsubmit')
  })
})
```

---

## Phase 6: Animation

### API Erweiterung

```typescript
interface MirrorTestAPI {
  // ... existing ...

  // Animation State
  hasActiveAnimation(el: MirrorElement): boolean
  getActiveAnimations(el: MirrorElement): Animation[]
  getAnimationState(el: MirrorElement): {
    running: boolean
    paused: boolean
    name: string | null
    progress: number  // 0-1
    duration: number
  }

  // Animation Control
  playAnimation(el: MirrorElement, name: string): Animation
  pauseAnimation(el: MirrorElement): void
  resumeAnimation(el: MirrorElement): void
  cancelAnimation(el: MirrorElement): void
  finishAnimation(el: MirrorElement): void

  // Animation Testing
  skipAnimations(): void              // Disable all animations for testing
  enableAnimations(): void            // Re-enable animations
  setAnimationSpeed(multiplier: number): void  // 2 = 2x speed, 0.5 = half speed

  // Async
  waitForAnimation(el: MirrorElement, timeout?: number): Promise<boolean>
  waitForAllAnimations(timeout?: number): Promise<boolean>
  waitForAnimationFrame(): Promise<void>
}
```

### Tests

```typescript
describe('Test API - Animation', () => {
  describe('animation state', () => {
    it('hasActiveAnimation() should detect running animation')
    it('getAnimationState() should return progress')
    it('getActiveAnimations() should list all animations')
  })

  describe('animation control', () => {
    it('playAnimation() should start named animation')
    it('pauseAnimation() should pause')
    it('cancelAnimation() should stop immediately')
    it('finishAnimation() should jump to end')
  })

  describe('testing utilities', () => {
    it('skipAnimations() should disable animations')
    it('setAnimationSpeed(0) should make animations instant')
    it('waitForAnimation() should resolve when done')
  })
})
```

---

## Phase 7: Zag Components

### API Erweiterung

```typescript
interface MirrorTestAPI {
  // ... existing ...

  // Component Detection
  getZagComponent(el: MirrorElement): {
    type: string  // 'dialog', 'tabs', 'select', etc.
    api: any      // Zag API object
    state: any    // Current state
  } | null
  isZagComponent(el: MirrorElement): boolean

  // Dialog
  dialog: {
    open(el: MirrorElement): void
    close(el: MirrorElement): void
    isOpen(el: MirrorElement): boolean
    getContent(el: MirrorElement): MirrorElement | null
    getTrigger(el: MirrorElement): MirrorElement | null
  }

  // Tabs
  tabs: {
    selectTab(el: MirrorElement, index: number): void
    selectTabByValue(el: MirrorElement, value: string): void
    getActiveIndex(el: MirrorElement): number
    getActiveValue(el: MirrorElement): string
    getTabs(el: MirrorElement): MirrorElement[]
    getPanels(el: MirrorElement): MirrorElement[]
  }

  // Select/Combobox
  select: {
    open(el: MirrorElement): void
    close(el: MirrorElement): void
    isOpen(el: MirrorElement): boolean
    selectOption(el: MirrorElement, value: string): void
    getSelectedValue(el: MirrorElement): string
    getOptions(el: MirrorElement): { value: string; label: string }[]
    highlightOption(el: MirrorElement, index: number): void
  }

  // Accordion
  accordion: {
    expand(el: MirrorElement, index: number): void
    collapse(el: MirrorElement, index: number): void
    toggle(el: MirrorElement, index: number): void
    isExpanded(el: MirrorElement, index: number): boolean
    getExpandedIndices(el: MirrorElement): number[]
  }

  // Menu
  menu: {
    open(el: MirrorElement): void
    close(el: MirrorElement): void
    isOpen(el: MirrorElement): boolean
    highlightItem(el: MirrorElement, index: number): void
    selectItem(el: MirrorElement, index: number): void
    getItems(el: MirrorElement): MirrorElement[]
  }

  // Tooltip/Popover
  tooltip: {
    show(el: MirrorElement): void
    hide(el: MirrorElement): void
    isVisible(el: MirrorElement): boolean
    getContent(el: MirrorElement): MirrorElement | null
  }

  // Slider
  slider: {
    getValue(el: MirrorElement): number
    setValue(el: MirrorElement, value: number): void
    getMin(el: MirrorElement): number
    getMax(el: MirrorElement): number
    increment(el: MirrorElement): void
    decrement(el: MirrorElement): void
  }
}
```

### Tests

```typescript
describe('Test API - Zag Components', () => {
  describe('dialog', () => {
    it('open() should show dialog')
    it('close() should hide dialog')
    it('isOpen() should return state')
    it('escape key should close dialog')
  })

  describe('tabs', () => {
    it('selectTab() should switch active tab')
    it('getActiveIndex() should return current')
    it('keyboard navigation should work')
  })

  describe('select', () => {
    it('open() should show dropdown')
    it('selectOption() should choose value')
    it('keyboard navigation should work')
  })

  describe('accordion', () => {
    it('expand() should open section')
    it('collapse() should close section')
    it('toggle() should switch state')
  })
})
```

---

## Phase 8: Snapshots

### API Erweiterung

```typescript
interface MirrorTestAPI {
  // ... existing ...

  // Snapshot Creation
  takeSnapshot(options?: {
    includeStyles?: boolean
    includeState?: boolean
    includeBindings?: boolean
    selector?: string  // Only snapshot matching elements
  }): Snapshot

  // Snapshot Comparison
  compareSnapshots(before: Snapshot, after: Snapshot): SnapshotDiff
  expectSnapshotMatch(snapshot: Snapshot, expected: Snapshot): void

  // Element Snapshots
  snapshotElement(el: MirrorElement): ElementSnapshot
  compareElements(before: ElementSnapshot, after: ElementSnapshot): ElementDiff

  // State Snapshots
  snapshotStates(): Record<string, string>  // nodeId -> state
  compareStates(before: Record<string, string>, after: Record<string, string>): StateDiff[]

  // Style Snapshots
  snapshotStyles(el: MirrorElement, properties?: string[]): Record<string, string>
  compareStyles(before: Record<string, string>, after: Record<string, string>): StyleDiff[]
}

interface Snapshot {
  timestamp: number
  elements: ElementSnapshot[]
  states: Record<string, string>
  variables: Record<string, any>
}

interface ElementSnapshot {
  nodeId: string
  tagName: string
  className: string
  attributes: Record<string, string>
  state: string
  styles: Record<string, string>
  visible: boolean
  rect: { x: number; y: number; width: number; height: number }
  children: ElementSnapshot[]
}

interface SnapshotDiff {
  added: ElementSnapshot[]
  removed: ElementSnapshot[]
  changed: {
    nodeId: string
    changes: {
      property: string
      before: any
      after: any
    }[]
  }[]
}
```

### Tests

```typescript
describe('Test API - Snapshots', () => {
  describe('snapshot creation', () => {
    it('takeSnapshot() should capture all elements')
    it('takeSnapshot() should include states')
    it('takeSnapshot() should include styles when requested')
    it('snapshotElement() should capture single element')
  })

  describe('comparison', () => {
    it('compareSnapshots() should detect added elements')
    it('compareSnapshots() should detect removed elements')
    it('compareSnapshots() should detect changed properties')
    it('compareSnapshots() should detect state changes')
  })

  describe('state snapshots', () => {
    it('snapshotStates() should capture all states')
    it('compareStates() should detect changes')
  })
})
```

---

## Phase 9: Debug Tools

### API Erweiterung

```typescript
interface MirrorTestAPI {
  // ... existing ...

  // Logging
  logElement(el: MirrorElement): void
  logState(el: MirrorElement): void
  logTree(root?: MirrorElement): void
  logBindings(): void
  logVariables(): void

  // Element Tree
  getElementTree(root?: MirrorElement): TreeNode[]
  findElements(predicate: (el: MirrorElement) => boolean): MirrorElement[]
  findElementsByState(state: string): MirrorElement[]
  findElementsByComponent(componentName: string): MirrorElement[]

  // Inspection
  inspect(el: MirrorElement): {
    nodeId: string
    component: string
    state: string
    stateMachine: StateMachineInfo | null
    bindings: BindingInfo[]
    styles: Record<string, string>
    computedStyles: Record<string, string>
    rect: DOMRect
    parent: MirrorElement | null
    children: MirrorElement[]
    events: string[]
  }

  // Performance
  measureRenderTime(code: string): Promise<number>
  getElementCount(): number
  getStateMachineCount(): number

  // Error Tracking
  getErrors(): Error[]
  clearErrors(): void
  onError(callback: (error: Error) => void): () => void

  // Test Utilities
  cleanup(): void                    // Remove all test elements
  reset(): void                      // Reset all states to initial
  isolate(el: MirrorElement): void   // Hide all except element
}
```

### Tests

```typescript
describe('Test API - Debug Tools', () => {
  describe('logging', () => {
    it('logElement() should output element info')
    it('logTree() should show hierarchy')
    it('logState() should show state machine')
  })

  describe('element tree', () => {
    it('getElementTree() should return hierarchy')
    it('findElements() should filter by predicate')
    it('findElementsByState() should find by state')
  })

  describe('inspection', () => {
    it('inspect() should return complete info')
    it('inspect() should include computed styles')
    it('inspect() should include event listeners')
  })

  describe('utilities', () => {
    it('cleanup() should remove test elements')
    it('reset() should restore initial states')
    it('getElementCount() should count elements')
  })
})
```

---

## Implementierungs-Reihenfolge

| Woche | Phase | Aufwand | Tests |
|-------|-------|---------|-------|
| 1 | Phase 1: Visibility | 4h | 15 Tests |
| 1 | Phase 2: Navigation | 6h | 20 Tests |
| 2 | Phase 3: Selection & Focus | 6h | 25 Tests |
| 2 | Phase 4: Data Binding | 8h | 20 Tests |
| 3 | Phase 5: Forms | 8h | 30 Tests |
| 3 | Phase 6: Animation | 6h | 20 Tests |
| 4 | Phase 7: Zag Components | 12h | 40 Tests |
| 4 | Phase 8: Snapshots | 8h | 20 Tests |
| 5 | Phase 9: Debug Tools | 6h | 15 Tests |

**Gesamt:** ~64h, ~205 Tests

---

## Architektur

### Dateistruktur

```
compiler/runtime/
  test-api/
    index.ts           # Main export, combines all
    core.ts            # Element access, state machine (existing)
    visibility.ts      # Phase 1
    navigation.ts      # Phase 2
    selection.ts       # Phase 3
    binding.ts         # Phase 4
    forms.ts           # Phase 5
    animation.ts       # Phase 6
    zag/               # Phase 7
      index.ts
      dialog.ts
      tabs.ts
      select.ts
      accordion.ts
      menu.ts
      tooltip.ts
      slider.ts
    snapshots.ts       # Phase 8
    debug.ts           # Phase 9
    types.ts           # Shared types

tests/runtime/
  test-api-core.test.ts        # Existing
  test-api-visibility.test.ts  # Phase 1
  test-api-navigation.test.ts  # Phase 2
  test-api-selection.test.ts   # Phase 3
  test-api-binding.test.ts     # Phase 4
  test-api-forms.test.ts       # Phase 5
  test-api-animation.test.ts   # Phase 6
  test-api-zag.test.ts         # Phase 7
  test-api-snapshots.test.ts   # Phase 8
  test-api-debug.test.ts       # Phase 9
```

### Modular Design

Jede Phase wird als separates Modul implementiert:

```typescript
// compiler/runtime/test-api/visibility.ts
export function createVisibilityAPI(runtime: RuntimeFunctions) {
  return {
    show(el) { ... },
    hide(el) { ... },
    isHidden(el) { ... },
    // ...
  }
}

// compiler/runtime/test-api/index.ts
import { createCoreAPI } from './core'
import { createVisibilityAPI } from './visibility'
import { createNavigationAPI } from './navigation'
// ...

export function createTestAPI(runtime: RuntimeFunctions): MirrorTestAPI {
  return {
    ...createCoreAPI(runtime),
    ...createVisibilityAPI(runtime),
    ...createNavigationAPI(runtime),
    // ...
  }
}
```

---

## Erfolgs-Metriken

- [ ] 100% der Runtime-Funktionen sind testbar
- [ ] Jede API-Methode hat mindestens 3 Tests
- [ ] E2E Tests für alle Zag-Komponenten
- [ ] Snapshot-Tests für Regression
- [ ] < 50ms Overhead für Test API
- [ ] Dokumentation für jede Methode

---

## Nächste Schritte

1. [ ] Phase 1 implementieren (Visibility)
2. [ ] Tests schreiben und verifizieren
3. [ ] Phase 2 implementieren (Navigation)
4. [ ] Weiter durch alle Phasen
5. [ ] E2E Tests mit Playwright ergänzen
6. [ ] Dokumentation generieren
