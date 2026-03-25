# Drag & Drop Implementation Plan

## Übersicht

Migration von ~3200 LOC custom Drag & Drop Code zu Pragmatic DnD.

**Ziel:** Stabiles, testbares System mit ~800 LOC custom Code + Library.

---

## Phase 1: Setup & Foundation

### 1.1 Pragmatic DnD installieren
```bash
npm install @atlaskit/pragmatic-drag-and-drop @atlaskit/pragmatic-drag-and-drop-hitbox
```

### 1.2 Neue Dateistruktur anlegen
```
studio/drag-drop/
├── index.ts                 # Public API exports
├── types.ts                 # Alle Interfaces
├── drag-drop-system.ts      # Hauptklasse
├── strategies/
│   ├── index.ts             # Strategy exports
│   ├── types.ts             # Strategy interfaces
│   ├── flex-with-children.ts
│   ├── empty-flex.ts
│   ├── positioned.ts
│   └── non-container.ts
├── snap/
│   ├── calculator.ts        # Pure function
│   └── types.ts
├── visual/
│   ├── system.ts            # VisualSystem
│   ├── ghost.ts             # Ghost rendering
│   └── indicator.ts         # Drop indicators
└── __tests__/
    ├── strategies/
    │   ├── flex-with-children.test.ts
    │   ├── empty-flex.test.ts
    │   ├── positioned.test.ts
    │   └── non-container.test.ts
    ├── snap-calculator.test.ts
    └── integration.test.ts
```

### 1.3 Types definieren
- `DragSource` (palette | canvas)
- `DropTarget` (nodeId, layoutType, direction, hasChildren, isPositioned)
- `DropResult` (target, placement, position?, zone?)
- `VisualHint` (type, rect, direction?)
- `SnapResult` (position, snapped, guides)

### 1.4 Akzeptanzkriterium Phase 1
- [ ] Dependencies installiert
- [ ] Dateistruktur angelegt
- [ ] Types kompilieren ohne Fehler
- [ ] Leere Testfiles laufen

---

## Phase 2: Pure Functions (Testbar)

### 2.1 Snap Calculator
```typescript
// snap/calculator.ts
export function calculateSnap(
  position: Point,
  sourceSize: Size,
  container: Rect,
  siblings: Rect[],
  config: SnapConfig
): SnapResult
```

**Tests:**
- Edge snapping (left, right, top, bottom)
- Center snapping (horizontal, vertical)
- Sibling snapping
- Threshold behavior
- Multiple simultaneous snaps

### 2.2 Zone Detection (9-Zone)
```typescript
// strategies/empty-flex.ts
export function detectZone(cursor: Point, rect: Rect): AlignmentZone
```

**Tests:**
- Alle 9 Zonen
- Boundary cases (exakt auf Grenze)

### 2.3 Edge Detection Helper
```typescript
// strategies/flex-with-children.ts
export function detectEdge(
  cursor: Point,
  childRect: Rect,
  direction: 'horizontal' | 'vertical'
): 'before' | 'after'
```

**Tests:**
- Horizontal direction
- Vertical direction
- Edge cases

### 2.4 Akzeptanzkriterium Phase 2
- [ ] Snap Calculator: 95% coverage
- [ ] Zone Detection: 100% coverage
- [ ] Edge Detection: 95% coverage
- [ ] Alle Tests grün

---

## Phase 3: Strategies

### 3.1 Strategy Interface
```typescript
interface DropStrategy {
  matches(target: DropTarget): boolean
  calculate(cursor: Point, target: DropTarget, source: DragSource): DropResult
  getVisualHint(result: DropResult): VisualHint
}
```

### 3.2 FlexWithChildrenStrategy
- `matches`: layoutType === 'flex' && hasChildren
- `calculate`: Nutzt Edge Detection, findet nächstes Kind
- `getVisualHint`: Insertion Line

**Tests:**
- matches() true/false cases
- calculate() before/after für vertical
- calculate() before/after für horizontal
- getVisualHint() line direction

### 3.3 EmptyFlexStrategy
- `matches`: layoutType === 'flex' && !hasChildren
- `calculate`: Nutzt Zone Detection
- `getVisualHint`: Zone highlight

**Tests:**
- matches() true/false cases
- calculate() alle 9 Zonen
- getVisualHint() zone rect

### 3.4 PositionedStrategy
- `matches`: isPositioned
- `calculate`: Absolute Position + Snap
- `getVisualHint`: Outline + Snap guides

**Tests:**
- matches() true/false cases
- calculate() ohne Snap
- calculate() mit Snap
- getVisualHint() mit guides

### 3.5 NonContainerStrategy
- `matches`: layoutType === 'none'
- `calculate`: before/after basierend auf Y-Position
- `getVisualHint`: Insertion Line

**Tests:**
- matches() true/false cases
- calculate() top half → before
- calculate() bottom half → after

### 3.6 Strategy Registry
```typescript
class StrategyRegistry {
  register(strategy: DropStrategy): void
  findStrategy(target: DropTarget): DropStrategy | null
}
```

### 3.7 Akzeptanzkriterium Phase 3
- [ ] Alle 4 Strategies implementiert
- [ ] Jede Strategy: 95% coverage
- [ ] Registry funktioniert

---

## Phase 4: Visual System

### 4.1 Ghost Rendering
- Wiederverwenden: `studio/panels/components/ghost-renderer.ts`
- Anpassen für neue Interfaces

### 4.2 Indicator Rendering
- Insertion Line (horizontal/vertical)
- Zone Highlight (9-Zone)
- Snap Guides (Linien)

### 4.3 VisualSystem Klasse
```typescript
class VisualSystem {
  showGhost(source: DragSource, position: Point): void
  updateGhost(position: Point): void
  hideGhost(): void
  showIndicator(hint: VisualHint): void
  hideIndicator(): void
  showSnapGuides(guides: SnapGuide[]): void
  clear(): void
}
```

### 4.4 Akzeptanzkriterium Phase 4
- [ ] Ghost erscheint beim Drag
- [ ] Indicator zeigt korrekte Position
- [ ] Snap Guides werden angezeigt
- [ ] clear() räumt alles auf

---

## Phase 5: Pragmatic Integration

### 5.1 DragDropSystem Klasse
```typescript
class DragDropSystem {
  constructor(previewContainer: HTMLElement, codeExecutor: CodeExecutor)

  // Setup
  initialize(): void
  dispose(): void

  // Palette Registration
  registerPaletteItem(element: HTMLElement, data: PaletteItemData): () => void

  // State
  isDragging(): boolean
  cancel(): void
}
```

### 5.2 Event Delegation Setup
- Ein globaler `dropTargetForElements` auf Preview-Container
- `getData` findet Element unter Cursor dynamisch
- `onDrag` berechnet Strategy + zeigt Visual
- `onDrop` führt Code-Änderung aus

### 5.3 Palette Integration
- `draggable()` für jedes Palette-Item
- Ghost Setup via `setDragImage` oder custom

### 5.4 Canvas Element Dragging
- Elemente im Preview als Drag Source
- Alt-Key Detection für Duplicate

### 5.5 Compile Guard
```typescript
events.on('compile:started', () => {
  if (this.isDragging()) this.cancel()
})
```

### 5.6 Akzeptanzkriterium Phase 5
- [ ] Palette → Preview Drop funktioniert
- [ ] Canvas Reorder funktioniert
- [ ] Alt+Drag dupliziert
- [ ] Escape bricht ab
- [ ] Compile bricht Drag ab

---

## Phase 6: Code Executor

### 6.1 CodeExecutor Interface
```typescript
interface CodeExecutor {
  execute(source: DragSource, result: DropResult): ExecutionResult
  duplicate(source: DragSource, result: DropResult): ExecutionResult
}
```

### 6.2 Implementation
- Nutzt bestehenden `CodeModifier`
- Mapping: DropResult → CodeModifier Methode

```typescript
execute(source, result) {
  if (source.type === 'palette') {
    if (result.placement === 'inside') {
      if (result.zone && result.zone !== 'center') {
        return codeModifier.insertWithWrapper(...)
      }
      return codeModifier.addChild(...)
    } else {
      return codeModifier.addChildRelativeTo(...)
    }
  } else {
    return codeModifier.moveNode(...)
  }
}
```

### 6.3 Akzeptanzkriterium Phase 6
- [ ] Palette Drop erzeugt korrekten Code
- [ ] Move erzeugt korrekten Code
- [ ] 9-Zone erzeugt korrektes Alignment
- [ ] Positioned erzeugt x/y Properties

---

## Phase 7: Integration & Cleanup

### 7.1 Bootstrap Integration
- Neues System in `studio/bootstrap.ts` einbinden
- Feature Flag für Umschaltung (optional)

### 7.2 Alten Code entfernen
```
DELETE:
- studio/visual/controllers/drag-controller.ts
- studio/visual/services/drag-drop-service.ts
- studio/visual/services/studio-drag-drop-service.ts
- studio/visual/models/drag-state.ts
- studio/visual/models/drop-zone.ts
- studio/visual/renderers/drag-renderer.ts
- studio/visual/drop-handler.ts
- studio/interactions/coordinator.ts (Drag-Teile)
```

### 7.3 Editor Drop Handler anpassen
- Bestehenden `EditorDropHandler` beibehalten
- Interface-Anpassungen falls nötig

### 7.4 E2E Tests
- Palette → Preview
- Canvas Reorder
- 9-Zone Alignment
- Positioned Containers
- Escape Cancel

### 7.5 Akzeptanzkriterium Phase 7
- [ ] Alle 10 Must-Have Kriterien erfüllt
- [ ] Kein alter Drag-Code mehr vorhanden
- [ ] E2E Tests grün
- [ ] Keine Console Errors

---

## Risiken & Mitigationen

| Risiko | Mitigation |
|--------|------------|
| Pragmatic API unklar | Docs lesen, Beispiele studieren |
| Edge Cases übersehen | Umfangreiche Tests vor Integration |
| Performance-Probleme | Profiling nach Phase 5 |
| CodeModifier Bugs | Bestehende Tests beibehalten |

---

## Zeitschätzung

| Phase | Geschätzt |
|-------|-----------|
| Phase 1: Setup | 0.5 Tage |
| Phase 2: Pure Functions | 1 Tag |
| Phase 3: Strategies | 1.5 Tage |
| Phase 4: Visual System | 1 Tag |
| Phase 5: Pragmatic Integration | 1.5 Tage |
| Phase 6: Code Executor | 0.5 Tage |
| Phase 7: Integration & Cleanup | 1 Tag |
| **Total** | **~7 Tage** |

---

## Definition of Done

- [ ] Alle 10 Must-Have Kriterien aus Requirements erfüllt
- [ ] > 90% Test Coverage für Strategies und Snap
- [ ] Keine bekannten Race Conditions
- [ ] < 1000 LOC neuer Code
- [ ] Alter Code gelöscht (~2500 LOC entfernt)
- [ ] E2E Tests für kritische Flows
- [ ] Keine Console Errors im normalen Betrieb
