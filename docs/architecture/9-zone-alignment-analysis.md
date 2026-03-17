# Analyse: Parent-Alignment wird bei Move-Operationen nicht gesetzt

**Datum:** 2026-03-16
**Status:** Root Cause identifiziert

## Problem-Beschreibung

Wenn ein Element innerhalb seines Containers verschoben wird (das einzige Kind), werden die 9-Zone-Alignment-Indikatoren nicht angezeigt und die Parent-Layout-Eigenschaften (z.B. `ver, center`) werden nicht gesetzt.

## Erwartetes Verhalten

1. User zieht das einzige Kind in einem Container
2. 9-Zone-Indikatoren erscheinen (top-left, top-center, ..., bot-right)
3. Bei Drop wird der Container-Code mit entsprechendem Alignment aktualisiert

## Tatsächliches Verhalten

1. User zieht das einzige Kind
2. Normale Sibling-Insertion-Logik wird verwendet
3. `placement: 'after'` wird zurückgegeben statt `placement: 'inside'` mit Zone
4. Element wird dupliziert statt neu positioniert

## Root Cause Analyse

### 1. FlexDropStrategy.calculateDropZone() - Hauptursache

**Datei:** `src/studio/drop-strategies/flex-strategy.ts`

```typescript
calculateDropZone(container, context) {
  const { children, sourceNodeId } = context

  // ✓ Korrekt: Leerer Container → 9-Zone-Modell
  if (children.length === 0) {
    return this.calculateEmptyContainerZone(...)
  }

  // ✗ Problem: Mit Kindern → Slot-Berechnung
  const slot = this.calculateInsertionSlot(
    container, children, ..., sourceNodeId  // sourceNodeId zum Ausfiltern
  )

  if (!slot) {
    return null  // ← Strategie gibt null zurück
  }

  // ... Sibling-Logik
}
```

**Problem in `calculateInsertionSlot`:**

```typescript
private calculateInsertionSlot(..., excludeNodeId?: string): DropSlot | null {
  const filteredChildren = excludeNodeId
    ? children.filter(c => c.nodeId !== excludeNodeId)
    : children

  if (filteredChildren.length === 0) {
    return null  // ← BUG: Gibt null zurück statt 9-Zone zu nutzen!
  }

  // ... Slot-Berechnung für verbleibende Kinder
}
```

**Ablauf bei Move des einzigen Kindes:**

1. Container hat 1 Kind
2. `children.length === 1` → geht NICHT in den Empty-Branch
3. `calculateInsertionSlot` wird aufgerufen mit `sourceNodeId`
4. Das einzige Kind wird ausgefiltert → `filteredChildren.length === 0`
5. `calculateInsertionSlot` gibt `null` zurück
6. `calculateDropZone` gibt `null` zurück
7. `DropZoneCalculator` fällt auf Legacy-Logik zurück
8. Legacy-Logik hat keine 9-Zone-Unterstützung für diesen Fall

### 2. Console-Log Beweis

```
[DropZoneCalc] Strategy result: {containerId: node-2, childrenCount: 1, placement: after, sugg...
```

- `childrenCount: 1` - Container hat ein Kind
- `placement: after` - Sibling-Insertion statt Inside
- Keine `suggestedAlignment` im Log → 9-Zone wurde nicht aktiviert

## Lösung

### Option A: Fix in calculateInsertionSlot (Minimal)

```typescript
private calculateInsertionSlot(..., excludeNodeId?: string): DropSlot | null {
  const filteredChildren = excludeNodeId
    ? children.filter(c => c.nodeId !== excludeNodeId)
    : children

  if (filteredChildren.length === 0) {
    // GEÄNDERT: Signalisiere, dass 9-Zone verwendet werden soll
    return {
      index: 0,
      siblingBeforeId: null,
      siblingAfterId: null,
      indicatorPosition: 0,
      siblingBeforeRect: null,
      siblingAfterRect: null,
      useZoneModel: true  // Neues Flag
    }
  }
  // ...
}
```

### Option B: Fix in calculateDropZone (Empfohlen)

```typescript
calculateDropZone(container, context) {
  const { children, sourceNodeId } = context

  // GEÄNDERT: Prüfe ob nach Ausfiltern 0 Kinder übrig
  const effectiveChildren = sourceNodeId
    ? children.filter(c => c.nodeId !== sourceNodeId)
    : children

  // Leerer Container ODER einziges Kind wird verschoben → 9-Zone-Modell
  if (effectiveChildren.length === 0) {
    return this.calculateEmptyContainerZone(...)
  }

  // Container mit anderen Kindern → Slot-Berechnung
  const slot = this.calculateInsertionSlot(
    container, children, ..., sourceNodeId
  )
  // ...
}
```

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/studio/drop-strategies/flex-strategy.ts` | Fix für 9-Zone bei Move |

## Test-Szenario

```
# Setup
App bg #18181b, pad 20
  rect w 100, h 200, bg #FCC419

# Aktion
1. rect nach Center ziehen
2. 9-Zone-Indikator sollte für "mid-center" erscheinen
3. Bei Drop sollte Code werden:

App bg #18181b, pad 20, center
  rect w 100, h 200, bg #FCC419
```

## Zusammenhang mit DragDropManager

Der `DragDropManager` hat bereits Code für 9-Zone-Move:

```typescript
// drag-drop-manager.ts
if (placement === 'inside' && this.sourceMap) {
  const targetChildren = this.sourceMap.getChildren(targetId)
  const isOnlyChildOfTarget = targetChildren.length === 1 &&
    targetChildren[0].nodeId === sourceNodeId

  if (isOnlyChildOfTarget || isTargetEmpty) {
    // ... applyLayoutToContainer
  }
}
```

Dieser Code wird **nie erreicht**, weil:
1. Die Strategie `placement: 'after'` zurückgibt (nicht `'inside'`)
2. Die Bedingung `placement === 'inside'` ist false

## Implementierter Fix

**Datei:** `src/studio/drop-strategies/flex-strategy.ts`

```typescript
calculateDropZone(container, context) {
  const { children, sourceNodeId } = context

  // GEÄNDERT: Berechne effektive Kinder (ohne das gezogene Element)
  const effectiveChildren = sourceNodeId
    ? children.filter(c => c.nodeId !== sourceNodeId)
    : children

  // Leerer Container ODER einziges Kind wird verschoben → 9-Zone-Modell
  if (effectiveChildren.length === 0) {
    return this.calculateEmptyContainerZone(...)
  }

  // Container mit anderen Kindern → Slot-Berechnung
  // ...
}
```

## Zusätzliche Erkenntnisse

### Browser-Test-Schwierigkeiten

Synthetische DragEvents in Playwright triggern nicht die echten Event-Handler, weil:
1. `makeCanvasElementDraggable()` setzt Handler direkt auf Elemente
2. Der Handler ruft `manager.setDragSource(nodeId)` auf
3. Synthetische Events erreichen diese Handler nicht zuverlässig

### Empfohlene Test-Strategie

Unit-Tests für `FlexDropStrategy.calculateDropZone()` direkt:

```typescript
// src/studio/__tests__/flex-strategy-move.test.ts
describe('FlexDropStrategy - Move Only Child', () => {
  it('should use 9-zone model when moving only child', () => {
    const strategy = new FlexDropStrategy()
    const container = createMockContainer()

    const context: DropContext = {
      clientX: 500,  // center
      clientY: 300,  // center
      sourceNodeId: 'child-1',  // The only child
      containerRect: { left: 0, top: 0, width: 1000, height: 600, ... },
      children: [{ element: mockElement, nodeId: 'child-1' }],
      isHorizontal: false,
    }

    const result = strategy.calculateDropZone(container, context)

    expect(result.placement).toBe('inside')
    expect(result.suggestedAlignment).toBe('center')
    expect(result.suggestedCrossAlignment).toBe('center')
  })
})
```

## Zweiter Bug: parentId nicht im SourceMap gesetzt

### Problem

Nach Fix #1 wurde die 9-Zone korrekt erkannt (`placement: inside`, `Zone to apply: mid-center`),
aber der Code wurde nicht aktualisiert. Console zeigte:

```
[WARNING] Studio: Invalid drop range after offset adjustment
```

### Root Cause

In `src/ir/index.ts` wurde `parentId` nicht an Kinder weitergegeben:

```typescript
// resolveChildren wurde aufgerufen OHNE parentId
const children = this.resolveChildren(
  resolvedComponent?.children || [],
  [...remainingChildren, ...childOverrideInstances]
)

// nodeId wurde NACH resolveChildren generiert
const nodeId = this.generateId()
```

Dies führte dazu, dass `sourceMap.getNodeById(childId).parentId` immer `undefined` war.

### Fix #2

**Datei:** `src/ir/index.ts`

1. `nodeId` vor `resolveChildren` generieren
2. `parentId` durch alle Child-Transformationen propagieren

```typescript
// Generate node ID FIRST so we can pass it to children as their parentId
const nodeId = this.generateId()

// Pass nodeId as parentId so children know their parent in the sourceMap
const children = this.resolveChildren(
  resolvedComponent?.children || [],
  [...remainingChildren, ...childOverrideInstances],
  nodeId  // <-- NEU: parentId Parameter
)
```

Geänderte Methoden:
- `resolveChildren(componentChildren, instanceChildren, parentId?)`
- `transformChild(child, parentId?)`

### Test für Fix #2

```typescript
// src/ir/__tests__/parent-id.test.ts
describe('SourceMap parentId propagation', () => {
  it('should set parentId for direct children of App', () => {
    const code = `
App bg #18181b, pad 20
  rect w 100, h 200, bg #FCC419
`
    const ast = parse(code)
    const { sourceMap } = toIR(ast, true)

    const rectNode = sourceMap.getNodeById('rect-node-id')
    const appNode = sourceMap.getNodeById('app-node-id')

    // rect's parentId should match App's nodeId
    expect(rectNode.parentId).toBe(appNode.nodeId)
  })
})
```

## Fazit

**Bug #1:** `FlexDropStrategy` - Die Strategie muss erkennen, dass nach dem Ausfiltern des gezogenen Elements effektiv ein leerer Container vorliegt und das 9-Zone-Modell verwendet werden soll.

**Bug #2:** `IRTransformer` - Kinder müssen ihre `parentId` im SourceMap erhalten, damit der DragDropManager erkennen kann, wenn ein Element innerhalb desselben Containers verschoben wird.

### Status

- ✅ Fix #1 implementiert in `src/studio/drop-strategies/flex-strategy.ts`
- ✅ Fix #2 implementiert in `src/ir/index.ts`
- ✅ Tests: `src/studio/__tests__/flex-strategy-move.test.ts` (5 Tests)
- ✅ Tests: `src/ir/__tests__/parent-id.test.ts` (4 Tests)
