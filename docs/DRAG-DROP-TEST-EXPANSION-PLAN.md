# Drag & Drop / Preview Test Expansion Plan

## Executive Summary

**Ziel:** Kompromisslose Testabdeckung für die gesamte Drag & Drop / Preview Mechanik

**Aktueller Stand:**
- Pure Logic (DragMachine): 95%+ Coverage
- DOM Adapter (DragController): 80%+ Coverage
- Drop Zone Calculation: 90%+ Coverage
- **Integration Tests: <10% Coverage** ← KRITISCH
- **E2E Tests: 0% Coverage** ← KRITISCH
- **Error Handling: <5% Coverage** ← KRITISCH

---

## Phase 1: Integration Tests mit echtem CodeModifier

### 1.1 MoveService ↔ CodeModifier Integration

**Datei:** `studio/drag/__tests__/move-service-integration.test.ts`

```typescript
describe('MoveService Integration', () => {
  // Setup: Echter CodeModifier mit echtem SourceMap

  describe('moveElement with real CodeModifier', () => {
    it('moves element before sibling - updates source code correctly')
    it('moves element after sibling - updates source code correctly')
    it('moves element inside container - updates source code correctly')
    it('moves element to different parent - updates indentation')
    it('moves deeply nested element (3+ levels)')
    it('moves element with children - preserves subtree')
    it('moves element with properties - preserves all properties')
    it('moves element with states - preserves state definitions')
    it('moves element with events - preserves event handlers')
  })

  describe('addComponent with real CodeModifier', () => {
    it('adds component as first child')
    it('adds component as last child')
    it('adds component at specific index')
    it('adds component with properties')
    it('adds component with text content')
    it('adds component before sibling')
    it('adds component after sibling')
  })

  describe('semantic zone insertion', () => {
    it('inserts with wrapper for top-left zone')
    it('inserts with wrapper for top-center zone')
    it('inserts with wrapper for top-right zone')
    it('inserts with wrapper for mid-left zone')
    it('inserts without wrapper for mid-center zone')
    it('inserts with wrapper for mid-right zone')
    it('inserts with wrapper for bot-left zone')
    it('inserts with wrapper for bot-center zone')
    it('inserts with wrapper for bot-right zone')
    it('determines correct wrapper type (HBox vs VBox)')
    it('applies correct wrapper properties for zone')
  })

  describe('slot replacement', () => {
    it('replaces slot with component')
    it('replaces slot with component and properties')
    it('replaces slot preserving surrounding code')
    it('handles slot with default content')
  })

  describe('error handling', () => {
    it('returns error when SourceMap is null')
    it('returns error when node ID not found')
    it('returns error when parent ID invalid')
    it('returns error on circular parent-child move')
    it('returns error when moving into own descendant')
    it('handles CodeModifier exceptions gracefully')
  })
})
```

### 1.2 DropHandler ↔ CodeModifier Integration

**Datei:** `studio/visual/__tests__/drop-handler-integration.test.ts`

```typescript
describe('DropHandler Integration', () => {
  describe('handleDrop with real CodeModifier', () => {
    it('drops component type - creates correct source')
    it('drops container type horizontal - creates HBox')
    it('drops container type vertical - creates VBox')
    it('drops layout type - creates configured layout')

    it('handles inside placement with semantic zone')
    it('handles before placement with siblingId')
    it('handles after placement with siblingId')
  })

  describe('component name resolution', () => {
    it('resolves component type to component name')
    it('resolves container horizontal to HBox')
    it('resolves container vertical to VBox')
    it('preserves custom component names')
  })
})
```

---

## Phase 2: SourceMap Integration Tests

### 2.1 DropZoneCalculator ↔ SourceMap

**Datei:** `src/studio/__tests__/drop-zone-sourcemap.test.ts`

```typescript
describe('DropZone SourceMap Integration', () => {
  // Setup: Echtes IR, echte SourceMap, echte DOM-Elemente

  describe('node ID resolution', () => {
    it('finds correct parent in IR tree')
    it('finds correct sibling in IR tree')
    it('handles deeply nested IR structure')
    it('handles component instances')
    it('handles component definitions')
  })

  describe('layout detection from IR', () => {
    it('detects horizontal layout from hor property')
    it('detects vertical layout from ver property')
    it('detects grid layout from grid property')
    it('detects absolute layout from position property')
    it('detects stacked layout from stacked property')
  })

  describe('parent-child relationship validation', () => {
    it('validates parent contains child in IR')
    it('validates sibling relationship in IR')
    it('detects invalid drop targets')
    it('prevents dropping into descendants')
  })
})
```

### 2.2 CodeModifier ↔ SourceMap Consistency

**Datei:** `src/studio/__tests__/code-modifier-sourcemap.test.ts`

```typescript
describe('CodeModifier SourceMap Consistency', () => {
  describe('after modification', () => {
    it('SourceMap node IDs remain valid after addChild')
    it('SourceMap node IDs remain valid after moveNode')
    it('SourceMap node IDs remain valid after removeNode')
    it('SourceMap line numbers update correctly')
    it('SourceMap column positions update correctly')
  })

  describe('source position mapping', () => {
    it('maps node ID to correct line after insertion')
    it('maps node ID to correct line after deletion')
    it('maps node ID to correct line after move')
    it('handles multi-line insertions')
    it('handles indentation changes')
  })
})
```

---

## Phase 3: Preview Integration Tests

### 3.1 Preview ↔ DragDrop ↔ CodeModifier Cycle

**Datei:** `studio/__tests__/preview-drag-integration.test.ts`

```typescript
describe('Preview DragDrop Integration', () => {
  // Setup: Vollständige Preview mit DOM, DragSystem, CodeModifier

  describe('complete drag-drop cycle', () => {
    it('drag element → drop → preview updates → code changes')
    it('drag from component panel → drop → preview renders new element')
    it('drag existing element → move → preview re-renders')
    it('drag → cancel → no changes')
  })

  describe('preview re-render synchronization', () => {
    it('indicators survive preview re-render')
    it('selection survives preview re-render')
    it('ghost element cleaned up after re-render')
    it('drop zones recalculated after re-render')
  })

  describe('source ↔ preview consistency', () => {
    it('code change triggers preview update')
    it('preview reflects all source properties')
    it('preview element IDs match source map')
    it('preview hierarchy matches IR hierarchy')
  })
})
```

### 3.2 Preview Selection ↔ DragDrop

**Datei:** `studio/__tests__/preview-selection-drag.test.ts`

```typescript
describe('Preview Selection and Drag', () => {
  describe('selection during drag', () => {
    it('dragged element remains visually indicated')
    it('selection clears when drag starts')
    it('selection restored after drop')
    it('selection updates to dropped position')
  })

  describe('multi-selection drag', () => {
    it('drags all selected elements together')
    it('maintains relative positions')
    it('updates source for all moved elements')
  })
})
```

---

## Phase 4: Error Scenarios & Edge Cases

### 4.1 CodeModifier Error Handling

**Datei:** `src/studio/__tests__/code-modifier-errors.test.ts`

```typescript
describe('CodeModifier Error Handling', () => {
  describe('invalid node operations', () => {
    it('addChild with invalid parent ID returns error')
    it('moveNode with invalid source ID returns error')
    it('moveNode with invalid target ID returns error')
    it('removeNode with invalid ID returns error')
    it('updateProperty with invalid ID returns error')
  })

  describe('structural errors', () => {
    it('prevents moving node into itself')
    it('prevents moving node into its descendant')
    it('prevents creating circular references')
    it('prevents removing root node')
  })

  describe('source code edge cases', () => {
    it('handles empty source gracefully')
    it('handles source with only comments')
    it('handles malformed indentation')
    it('handles Windows line endings (CRLF)')
    it('handles mixed line endings')
    it('handles tabs vs spaces')
  })
})
```

### 4.2 DropZone Edge Cases

**Datei:** `src/studio/__tests__/drop-zone-edge-cases.test.ts`

```typescript
describe('DropZone Edge Cases', () => {
  describe('positioning edge cases', () => {
    it('handles drop at exact 50% threshold')
    it('handles drop at container edge (1px from border)')
    it('handles drop outside viewport')
    it('handles drop on partially visible element')
    it('handles drop on scrolled container')
  })

  describe('element state edge cases', () => {
    it('skips display:none elements')
    it('skips visibility:hidden elements')
    it('skips opacity:0 elements')
    it('handles pointer-events:none elements')
    it('handles elements with transforms')
  })

  describe('container edge cases', () => {
    it('handles container with 0 width')
    it('handles container with 0 height')
    it('handles container with only text content')
    it('handles deeply nested containers (10+ levels)')
    it('handles container with overflow:hidden')
  })

  describe('layout edge cases', () => {
    it('handles flex with flex-wrap')
    it('handles flex with row-reverse')
    it('handles flex with column-reverse')
    it('handles grid with auto-fill')
    it('handles grid with named areas')
    it('handles mixed flex and absolute children')
  })
})
```

### 4.3 DOM Event Edge Cases

**Datei:** `studio/drag/__tests__/drag-events-edge-cases.test.ts`

```typescript
describe('Drag Event Edge Cases', () => {
  describe('rapid event sequences', () => {
    it('handles 100 mousemove events in 100ms')
    it('handles mousedown-mouseup within 16ms (single frame)')
    it('handles double-click during drag')
    it('handles rapid drag start-cancel cycles')
  })

  describe('interrupted drags', () => {
    it('handles element removed during drag')
    it('handles container removed during drag')
    it('handles DOM mutation during drag')
    it('handles window blur during drag')
    it('handles tab switch during drag')
  })

  describe('scroll during drag', () => {
    it('updates drop zones on scroll')
    it('adjusts mouse position for scroll offset')
    it('handles scroll-then-drop correctly')
    it('handles continuous scroll during drag')
  })

  describe('touch events', () => {
    it('converts touchstart to drag start')
    it('converts touchmove to drag move')
    it('converts touchend to drop')
    it('handles touch cancel')
    it('ignores multi-touch gestures')
  })
})
```

---

## Phase 5: Visual Indicator Tests

### 5.1 Drop Indicator Positioning

**Datei:** `studio/visual/__tests__/drop-indicator-positioning.test.ts`

```typescript
describe('Drop Indicator Positioning', () => {
  describe('line indicators', () => {
    it('positions horizontal line correctly for before placement')
    it('positions horizontal line correctly for after placement')
    it('positions vertical line correctly for horizontal layouts')
    it('calculates line length to match container width')
    it('applies correct offset from element edge')
  })

  describe('zone highlights', () => {
    it('positions inside highlight to cover full container')
    it('applies correct border radius for rounded containers')
    it('shows correct color for different zone types')
  })

  describe('semantic zone indicators', () => {
    it('positions dot at correct semantic position (9 zones)')
    it('shows zone label with correct text')
    it('positions zone label near dot')
    it('handles small containers (adjusts dot spacing)')
  })

  describe('absolute positioning indicators', () => {
    it('shows crosshair at cursor position')
    it('shows x/y position label')
    it('updates position label in real-time')
    it('snaps to grid when configured')
  })
})
```

### 5.2 Ghost Element Tests

**Datei:** `studio/drag/__tests__/ghost-element.test.ts`

```typescript
describe('Ghost Element', () => {
  describe('creation', () => {
    it('creates ghost as clone of dragged element')
    it('applies semi-transparent styling')
    it('positions ghost at cursor offset')
    it('adds ghost to document body')
  })

  describe('updates', () => {
    it('follows cursor position smoothly')
    it('maintains cursor offset')
    it('handles rapid position updates')
  })

  describe('cleanup', () => {
    it('removes ghost on drop')
    it('removes ghost on cancel')
    it('removes ghost on dispose')
    it('handles ghost removal when already removed')
  })
})
```

---

## Phase 6: Absolute Layout Tests

### 6.1 Absolute Container Detection

**Datei:** `studio/__tests__/absolute-layout.test.ts`

```typescript
describe('Absolute Layout Support', () => {
  describe('container detection', () => {
    it('detects position:relative container')
    it('detects position:absolute container')
    it('detects stacked layout as absolute container')
    it('ignores position:static containers')
    it('handles nested absolute containers')
  })

  describe('position calculation', () => {
    it('calculates x relative to container left')
    it('calculates y relative to container top')
    it('accounts for container border')
    it('accounts for container padding')
    it('accounts for scroll offset')
  })

  describe('drop zone for absolute', () => {
    it('shows crosshair indicators')
    it('shows position coordinates')
    it('snaps to grid when enabled')
    it('constrains to container bounds')
  })

  describe('code generation for absolute', () => {
    it('adds x property to dropped component')
    it('adds y property to dropped component')
    it('preserves other properties')
    it('handles negative coordinates')
  })
})
```

### 6.2 Layout Transition Tests

**Datei:** `studio/__tests__/layout-transition.test.ts`

```typescript
describe('Layout Transitions', () => {
  describe('flex to absolute', () => {
    it('removes from flex flow')
    it('adds x/y properties')
    it('calculates position from current render position')
  })

  describe('absolute to flex', () => {
    it('removes x/y properties')
    it('inserts at correct position in flex order')
  })

  describe('grid to absolute', () => {
    it('removes grid properties')
    it('adds x/y properties')
  })
})
```

---

## Phase 7: Performance & Stress Tests

### 7.1 Large Scale Operations

**Datei:** `studio/__tests__/drag-performance.test.ts`

```typescript
describe('Drag Performance', () => {
  describe('large element counts', () => {
    it('calculates drop zones for 100 elements in <50ms')
    it('calculates drop zones for 500 elements in <200ms')
    it('calculates drop zones for 1000 elements in <500ms')
    it('updates indicators for 1000 elements without frame drop')
  })

  describe('deep nesting', () => {
    it('handles 20 levels of nesting')
    it('handles 50 levels of nesting')
    it('parent traversal completes in <10ms')
  })

  describe('rapid operations', () => {
    it('handles 60 zone calculations per second')
    it('handles 100 indicator updates per second')
    it('handles continuous drag for 30 seconds')
  })

  describe('memory stability', () => {
    it('no memory leak after 100 drag-drop cycles')
    it('no memory leak after 1000 zone calculations')
    it('cleanup releases all references')
  })
})
```

---

## Phase 8: E2E Playwright Tests

### 8.1 Complete User Flows

**Datei:** `src/__tests__/playwright/drag-drop-e2e.test.ts`

```typescript
describe('Drag Drop E2E', () => {
  describe('component panel to preview', () => {
    test('drag Box from panel, drop in empty preview')
    test('drag Text from panel, drop inside Box')
    test('drag Button from panel, drop before existing element')
    test('drag Image from panel, drop after existing element')
  })

  describe('element reordering', () => {
    test('drag first child to last position')
    test('drag last child to first position')
    test('drag child to different parent')
    test('drag child back to original position')
  })

  describe('semantic zone drops', () => {
    test('drop in top-left zone creates correct wrapper')
    test('drop in center zone adds without wrapper')
    test('drop in bottom-right zone creates correct wrapper')
  })

  describe('keyboard interactions', () => {
    test('Escape cancels drag')
    test('Arrow keys during drag (if supported)')
  })

  describe('visual feedback', () => {
    test('ghost element follows cursor')
    test('drop indicator visible during drag')
    test('drop indicator updates on position change')
    test('visual feedback cleared after drop')
  })

  describe('undo/redo', () => {
    test('Ctrl+Z undoes drop operation')
    test('Ctrl+Shift+Z redoes drop operation')
    test('multiple undos restore original state')
  })
})
```

---

## Implementation Priority

| Phase | Tests | Priority | Estimated Effort |
|-------|-------|----------|------------------|
| Phase 1: Integration Tests | ~50 | P0 - CRITICAL | 3-4 Tage |
| Phase 2: SourceMap Integration | ~25 | P0 - CRITICAL | 2-3 Tage |
| Phase 3: Preview Integration | ~20 | P0 - CRITICAL | 2-3 Tage |
| Phase 4: Error Scenarios | ~60 | P1 - HIGH | 3-4 Tage |
| Phase 5: Visual Indicators | ~30 | P1 - HIGH | 2-3 Tage |
| Phase 6: Absolute Layout | ~25 | P2 - MEDIUM | 2 Tage |
| Phase 7: Performance | ~15 | P2 - MEDIUM | 2 Tage |
| Phase 8: E2E Tests | ~20 | P1 - HIGH | 3-4 Tage |
| **Gesamt** | **~245 Tests** | | **19-25 Tage** |

---

## Test Infrastructure Requirements

### Shared Test Utilities

```typescript
// studio/__tests__/utils/integration-helpers.ts

export function createRealSourceMap(source: string): SourceMap
export function createRealCodeModifier(source: string): CodeModifier
export function createTestPreview(source: string): { preview: Preview, cleanup: () => void }
export function simulateDragDrop(from: Element, to: Element, options?: DragOptions): Promise<void>
export function waitForPreviewUpdate(): Promise<void>
export function assertSourceEquals(actual: string, expected: string): void
export function assertDropZone(zone: DropZone, expected: Partial<DropZone>): void
```

### Mock Infrastructure Improvements

```typescript
// studio/__tests__/mocks/dom-environment.ts

export function createTestContainer(html: string): HTMLElement
export function setupDocumentWithElements(elements: ElementSpec[]): Document
export function createMockSourceMap(nodes: NodeSpec[]): SourceMap
export function createMockCodeModifier(): MockCodeModifier & CodeModifier
```

---

## Success Criteria

1. **Integration Coverage:** Alle kritischen Pfade zwischen DragSystem, CodeModifier und SourceMap getestet
2. **Error Coverage:** Jeder Fehlerfall hat mindestens einen Test
3. **Edge Case Coverage:** Alle dokumentierten Edge Cases haben Tests
4. **Performance Baseline:** Performance-Tests etablieren Baseline für Regression Detection
5. **E2E Coverage:** Vollständige User Flows sind durch Playwright abgedeckt
6. **CI Integration:** Alle Tests laufen in <2 Minuten in CI

---

## Verification Checklist

Nach Abschluss jeder Phase:

- [ ] Alle Tests bestehen
- [ ] Coverage Report zeigt Verbesserung
- [ ] Keine neuen Linting-Fehler
- [ ] Performance-Baseline nicht verschlechtert
- [ ] Documentation aktualisiert
