# Visual Code System - Integrationsplan V1 (DEPRECATED)

> **⚠️ DEPRECATED:** Dieser Plan wurde durch `INTEGRATION-PLAN-V2.md` ersetzt.
>
> **Grund:** V1 hätte parallele Systeme neben der bestehenden Architektur geschaffen.
> V2 erweitert stattdessen die existierenden Systeme (DropZoneCalculator, DragDropManager,
> CodeModifier, SyncCoordinator).
>
> **→ Siehe:** [INTEGRATION-PLAN-V2.md](INTEGRATION-PLAN-V2.md)

---

## Übersicht (DEPRECATED)

Inkrementelle Integration des Visual Code Systems in Mirror. Jede Phase ist unabhängig deploybar und bringt sofortigen Mehrwert.

**Referenz:** Siehe `SPECIFICATION.md` für Konzepte und Interfaces, `DOCUMENTATION.md` für Prototype-Details.

---

## Phase 0: Vorbereitung

**Ziel:** Verständnis der bestehenden Mirror-Architektur, Test-Baseline etablieren.

### 0.1 Bestandsaufnahme Mirror

**Zu analysieren:**

| Komponente | Datei | Fragen |
|------------|-------|--------|
| Drag & Drop | `DragDropManager`, `DropZoneCalculator` | Wie funktioniert aktuelles Targeting? |
| Selection | `SelectionManager`, `StateSelectionAdapter` | Single vs. Multi-Select? Events? |
| Bounds | `source-map.ts`, Preview-Rendering | DOM-Bounds oder eigene Berechnung? |
| Code-Änderungen | `CodeModifier` | API für Insert, Move, Update? |
| IR-Struktur | `ir/index.ts` | Welche Props für Sizing/Direction? |

**Deliverable:** Dokument mit Analyse-Ergebnissen und Empfehlungen.

### 0.2 Test-Setup

- [ ] E2E-Tests für bestehende Drag & Drop Funktionalität
- [ ] Unit-Tests für SourceMap/Bounds
- [ ] Test-Utilities: `createTestContainer()`, `simulateDrag()`, etc.

**Deliverable:** Test-Suite mit Baseline-Coverage.

---

## Phase 1: Sibling-Insertion

**Ziel:** Elemente als Geschwister einfügen können, nicht nur als Kinder.

**Warum zuerst:** Fundamentale Verbesserung der Drag & Drop UX, unabhängig von anderen Features.

### 1.1 Edge-Detection Service

```typescript
// Neuer Service: src/studio/services/edge-detection.ts

interface EdgeDetectionService {
  checkSiblingZone(
    cursorX: number,
    cursorY: number,
    elementBounds: Rect,
    parentDirection: 'horizontal' | 'vertical'
  ): SiblingZone | null
}

interface SiblingZone {
  position: 'before' | 'after'
  edge: 'start' | 'end'  // Für Debugging
}
```

**Implementierung:**
- Threshold: `min(12, max(6, size * 0.15))`
- Richtungsabhängig: horizontal → left/right, vertical → top/bottom

### 1.2 Sibling-Indicator UI

```typescript
// Erweitern: studio/preview/sibling-indicator.ts

interface SiblingIndicator {
  show(bounds: Rect, position: 'before' | 'after', direction: Direction): void
  hide(): void
}
```

**Styling:**
- Blaue Linie (3px)
- Position je nach Direction und before/after
- z-index über anderen Elementen

### 1.3 DragManager Integration

**Änderungen an bestehendem DragManager:**

```typescript
// Erweitern: state.drag
interface DragState {
  // ... existing
  siblingInsert: SiblingZone | null
}

// In dragOver Handler:
const siblingZone = edgeDetection.checkSiblingZone(...)
if (siblingZone) {
  state.drag.siblingInsert = siblingZone
  state.drag.targetContainer = parentId  // Parent statt Element
  siblingIndicator.show(...)
} else {
  state.drag.siblingInsert = null
  siblingIndicator.hide()
}
```

### 1.4 Drop-Handler für Sibling

**Änderungen an CodeModifier oder IR-Manipulation:**

```typescript
// Bei Drop mit siblingInsert:
if (siblingInsert) {
  // Einfügen vor/nach Referenz-Element
  codeModifier.insertSibling(
    newNode,
    siblingInsert.refId,
    siblingInsert.position
  )
} else {
  // Bestehende Logik: als Kind einfügen
  codeModifier.insertChild(targetId, newNode)
}
```

### 1.5 Tests

- [ ] Edge-Detection: Threshold-Berechnung
- [ ] Edge-Detection: Richtungsabhängigkeit
- [ ] Indicator: Positionierung
- [ ] Drop: Korrekte Reihenfolge im Code

**Akzeptanzkriterien:**
- [ ] Bei Drag an Elementrand erscheint blaue Linie
- [ ] Drop fügt Element als Geschwister ein
- [ ] Code-Reihenfolge entspricht visueller Reihenfolge

---

## Phase 2: Smart Sizing

**Ziel:** Neue Elemente bekommen intelligente Startgröße basierend auf verfügbarem Platz.

**Warum zweitens:** Verbessert sofort die UX beim Einfügen, baut auf Phase 1 auf.

### 2.1 Residual Space Calculator

```typescript
// Neuer Service: src/studio/services/residual-space.ts

interface ResidualSpaceCalculator {
  calculate(
    parentId: string,
    excludeChildId?: string
  ): { width: number, height: number }
}
```

**Benötigt:**
- Zugriff auf Bounds aller Elemente
- Zugriff auf Sizing-Properties
- Parent-Direction

### 2.2 Smart Sizing Service

```typescript
// Neuer Service: src/studio/services/smart-sizing.ts

interface SmartSizingService {
  calculateInitialSize(
    parentId: string,
    parentDirection: Direction
  ): Sizing
}
```

**Logik:**
```
residual = residualSpaceCalculator.calculate(parentId)

if (parentDirection === 'horizontal') {
  width = max(40, residual.width / 2)
  height = 'fill'
} else {
  width = 'fill'
  height = max(40, residual.height / 2)
}
```

### 2.3 Integration in Drop-Handler

```typescript
// Bei Drop ohne explizite Sizing:
const sizing = smartSizing.calculateInitialSize(targetId, parentDirection)
codeModifier.insert(targetId, { ...newNode, sizing })
```

### 2.4 Tests

- [ ] Residual: Berechnung mit verschiedenen Geschwister-Kombinationen
- [ ] Residual: excludeChildId funktioniert
- [ ] SmartSizing: Richtungsabhängigkeit
- [ ] SmartSizing: Minimum 40px

**Akzeptanzkriterien:**
- [ ] Erstes Kind in leerem Container: halbe Parent-Größe
- [ ] Weiteres Kind: halber verbleibender Platz
- [ ] Neue Elemente überlappen nicht

---

## Phase 3: Resize mit Modus-Erkennung

**Ziel:** Beim Resize automatisch zwischen fill/hug/pixel wechseln.

### 3.1 Sizing Mode Detector

```typescript
// Neuer Service: src/studio/services/sizing-mode-detector.ts

interface SizingModeDetector {
  detect(
    newSize: number,
    availableSpace: number,
    childMinSize: number,
    threshold?: number
  ): 'fill' | 'hug' | number
}
```

**Logik:**
```
if (newSize >= availableSpace - threshold) return 'fill'
if (newSize <= childMinSize + threshold) return 'hug'
return max(40, newSize)
```

### 3.2 Resize Manager

```typescript
// Neuer Service: src/studio/services/resize-manager.ts

interface ResizeManager {
  startResize(elementId: string, handle: ResizeHandle): void
  updateResize(dx: number, dy: number): SizingUpdate
  endResize(): void
  cancelResize(): void
}

interface SizingUpdate {
  width?: SizingValue
  height?: SizingValue
  displayWidth: string   // Für Anzeige: "200px" oder "fill"
  displayHeight: string
}
```

### 3.3 Resize Handles UI

```typescript
// Erweitern: Preview-Rendering für selektierte Elemente

interface ResizeHandles {
  render(elementId: string, bounds: Rect): void
  remove(elementId: string): void
}
```

**8 Handles:** n, s, e, w, nw, ne, sw, se
**Styling:** Kleine weiße Punkte (6px), nur bei Hover/Selection sichtbar

### 3.4 Size Indicator

```typescript
// Neuer UI-Component: studio/preview/size-indicator.ts

interface SizeIndicator {
  show(bounds: Rect, widthDisplay: string, heightDisplay: string): void
  hide(): void
}
```

**Positionierung:** Zentriert auf Element
**Format:** "200px × fill"

### 3.5 Integration

```typescript
// In ResizeManager.updateResize:
const availableSpace = residualSpace.calculate(parentId, elementId)
const childMin = getChildrenMinSize(elementId)

const newWidth = sizingModeDetector.detect(
  currentWidth + dx,
  availableSpace.width,
  childMin.width
)

sizeIndicator.show(bounds, formatSize(newWidth), formatSize(newHeight))

// Bei endResize:
codeModifier.updateSizing(elementId, { width: newWidth, height: newHeight })
sizeIndicator.hide()
```

### 3.6 Tests

- [ ] ModeDetector: fill-Erkennung an Grenze
- [ ] ModeDetector: hug-Erkennung an Minimum
- [ ] ModeDetector: pixel-Werte dazwischen
- [ ] ResizeManager: Richtungsabhängig (nur x, nur y, beide)
- [ ] Integration: Code-Update nach Resize

**Akzeptanzkriterien:**
- [ ] Resize-Handles erscheinen bei Selektion
- [ ] Drag an Grenze → "fill" im Code
- [ ] Drag unter Minimum → "hug" im Code
- [ ] Size-Indicator zeigt aktuelle Größe

---

## Phase 4: Multi-Select & Gruppieren

**Ziel:** Mehrere Elemente selektieren und zu Container zusammenfassen.

### 4.1 Multi-Select im SelectionManager

```typescript
// Erweitern: SelectionManager

interface SelectionManager {
  selected: string[]  // Statt single string

  select(id: string): void           // Ersetzt Selektion
  toggle(id: string): void           // Add/Remove
  selectMultiple(ids: string[]): void
  clear(): void

  isSelected(id: string): boolean
  hasMultipleSelected(): boolean
}
```

### 4.2 Keyboard Handler

```typescript
// Erweitern: Keyboard-Events

// Shift+Click → toggle statt select
// Click → select (clear others)
```

### 4.3 Grouping Service

```typescript
// Neuer Service: src/studio/services/grouping-service.ts

interface GroupingService {
  canGroup(elementIds: string[]): GroupValidation
  group(elementIds: string[]): string  // Returns new group ID
}

interface GroupValidation {
  valid: boolean
  reason?: string  // "Elements must have same parent"
}
```

**Validierung:**
- Mindestens 2 Elemente
- Alle haben gleichen Parent

**Logik:**
1. Parent-Direction ermitteln
2. Container erstellen mit gleicher Direction
3. Elemente (sortiert nach Index) in Container verschieben
4. Container an Position des ersten Elements einfügen

### 4.4 Code-Manipulation

```typescript
// Erweitern: CodeModifier

interface CodeModifier {
  // ... existing

  wrapInContainer(
    elementIds: string[],
    containerProps: { direction: Direction }
  ): string  // Returns new container ID
}
```

**Code-Transformation:**
```
// Vorher:
Parent
  Element1
  Element2
  Element3

// Nachher (nach Group von Element1, Element2):
Parent
  NewContainer direction
    Element1
    Element2
  Element3
```

### 4.5 Keyboard Shortcut

- **Cmd+G / Ctrl+G** → Group
- (Optional: **Cmd+Shift+G** → Ungroup)

### 4.6 Tests

- [ ] MultiSelect: Shift+Click Toggle
- [ ] MultiSelect: Click ersetzt
- [ ] Grouping: Validierung (gleicher Parent)
- [ ] Grouping: Reihenfolge bleibt erhalten
- [ ] Grouping: Direction wird übernommen
- [ ] Code: Korrekte Transformation

**Akzeptanzkriterien:**
- [ ] Shift+Click selektiert mehrere
- [ ] Alle selektierten haben visuelles Feedback
- [ ] Cmd+G gruppiert Geschwister
- [ ] Gruppe hat Parent-Direction
- [ ] Code-Struktur ist korrekt

---

## Phase 5: Grid-Layout

**Ziel:** Grid-Container mit Zellen-basiertem Layout.

**Warum als separate Phase:** Komplexer als Stack-Layouts, unabhängig von anderen Features.

### 5.1 Grid-Container Typ

```typescript
// Erweitern: Container-Interface
interface GridContainer extends Container {
  layout: 'grid'
  grid: {
    columns: number  // 1-12
    rows: number     // 1-12
    gap: number      // Pixel
  }
}
```

### 5.2 Grid-Bounds-Calculator

```typescript
// Erweitern: BoundsCalculator für Grid

function calculateGridChildBounds(
  parentBounds: Rect,
  grid: GridConfig,
  children: Container[]
): Map<string, Rect> {
  const padding = 16
  const { columns, rows, gap } = grid

  const availableWidth = parentBounds.width - 2 * padding
  const availableHeight = parentBounds.height - 2 * padding

  const cellWidth = (availableWidth - (columns - 1) * gap) / columns
  const cellHeight = (availableHeight - (rows - 1) * gap) / rows

  // Jedes Kind hat gridPosition: { col, row }
  // Berechne Bounds basierend auf Zelle
}
```

### 5.3 Grid-Drop-Targeting

```typescript
// Neuer Service: src/studio/services/grid-drop-targeting.ts

interface GridDropTargeting {
  getCellAt(
    cursorX: number,
    cursorY: number,
    gridBounds: Rect,
    gridConfig: GridConfig
  ): GridCell | null
}

interface GridCell {
  column: number
  row: number
  bounds: Rect
}
```

**Mechanismus:**
```
cellWidth = (availableWidth - (columns - 1) * gap) / columns
cellHeight = (availableHeight - (rows - 1) * gap) / rows

col = floor((cursorX - padding) / (cellWidth + gap))
row = floor((cursorY - padding) / (cellHeight + gap))
```

### 5.4 Grid-Indicator UI

```typescript
// Erweitern: Preview-Rendering für Grid-Container

interface GridIndicator {
  showGridLines(bounds: Rect, config: GridConfig): void
  highlightCell(cell: GridCell): void
  hideGridLines(): void
}
```

**Styling:**
- Gestrichelte Linien für Grid
- Highlight auf aktiver Zelle beim Drag
- Zellen-Koordinaten anzeigen (optional)

### 5.5 Grid-Controls Panel

```typescript
// UI-Component für Grid-Einstellungen

interface GridControlsPanel {
  show(container: GridContainer): void
  hide(): void
  onChange(callback: (config: GridConfig) => void): void
}
```

**Controls:**
- Spalten-Slider/Input (1-12)
- Zeilen-Slider/Input (1-12)
- Gap-Input (0-32px)

### 5.6 Code-Generierung für Grid

```
Grid columns 4, rows 3, gap 8
  Child1 col 0, row 0
  Child2 col 1, row 0
  ...
```

**Kurzform wenn Default-Werte:**
```
Grid 4          // 4 columns, 3 rows (default), 8px gap (default)
```

### 5.7 Tests

- [ ] Grid-Bounds: Zellen-Berechnung
- [ ] Grid-Drop: Zellen-Erkennung
- [ ] Grid-Controls: Live-Update
- [ ] Code: Korrekte Grid-Syntax

**Akzeptanzkriterien:**
- [ ] Grid-Container zeigt Linien
- [ ] Drop in Grid platziert in korrekter Zelle
- [ ] Controls ändern Grid-Konfiguration live
- [ ] Code zeigt Grid-Syntax

---

## Phase 6: Polish & Edge Cases

### 6.1 Undo/Redo Integration

- Jede Operation als Command
- Gruppe atomarer Operationen (z.B. Group = Move + Insert)

### 6.2 Error Handling

- Graceful Degradation bei ungültigen Operationen
- User Feedback bei Fehlern

### 6.3 Performance

- Bounds-Caching
- Debouncing bei häufigen Updates

### 6.4 Accessibility

- Keyboard Navigation
- Screen Reader Support

---

## Abhängigkeiten zwischen Phasen

```
Phase 0 (Vorbereitung)
    │
    ▼
Phase 1 (Sibling-Insertion)
    │
    ├────────────────────────────────────┐
    ▼                                    ▼
Phase 2 (Smart Sizing)        Phase 4 (Multi-Select) [unabhängig]
    │                                    │
    ▼                                    │
Phase 3 (Resize)                         │
    │                                    │
    │         Phase 5 (Grid) [unabhängig, kann parallel]
    │              │                     │
    └──────────────┴─────────────────────┘
                   ▼
             Phase 6 (Polish)
```

**Hinweis:** Phase 5 (Grid) ist unabhängig von Phase 2-4 und kann parallel entwickelt werden, sobald Phase 1 abgeschlossen ist.

---

## Phasen-Übersicht

| Phase | Beschreibung | Abhängigkeiten |
|-------|--------------|----------------|
| 0 | Vorbereitung: Analyse, Test-Setup | - |
| 1 | Sibling-Insertion | Phase 0 |
| 2 | Smart Sizing | Phase 1 |
| 3 | Resize mit Modus-Erkennung | Phase 2 |
| 4 | Multi-Select & Gruppieren | Phase 1 (parallel zu 2-3) |
| 5 | Grid-Layout | Phase 1 (parallel zu 2-4) |
| 6 | Polish, Edge Cases, Undo/Redo | Alle vorherigen |

---

## Risiken

| Risiko | Mitigation |
|--------|------------|
| Bounds-Berechnung weicht ab | Früh klären: DOM vs. eigene Berechnung |
| CodeModifier-API unzureichend | Phase 0: API analysieren, ggf. erweitern |
| Performance bei vielen Elementen | Bounds-Caching, virtualisiertes Rendering |
| Undo/Redo komplex | Als separate Phase, Command-Pattern nutzen |
| Grid-Zellen-Positionierung | Klare Semantik für colspan/rowspan definieren |

---

## Erfolgskriterien

Nach jeder Phase sollte Mirror:
1. **Stabiler sein als vorher** (keine Regression)
2. **Inkrementellen Mehrwert bieten** (Feature nutzbar)
3. **Gut getestet sein** (Unit + E2E)

Finale Vision:
- Visuelles Erstellen von Layouts durch Drag & Drop
- Stack-Layouts (VBox/HBox) mit Sibling-Insertion
- Grid-Layouts mit Zellen-Positionierung
- Intelligente Größenanpassung (fill/hug/pixel)
- Multi-Select und Gruppieren
- Bidirektionale Sync: Visuelle Änderung ↔ Code

---

## Quick Reference

### Neue Services pro Phase

| Phase | Service | Datei |
|-------|---------|-------|
| 1 | EdgeDetectionService | `src/studio/services/edge-detection.ts` |
| 1 | SiblingIndicator | `studio/preview/sibling-indicator.ts` |
| 2 | ResidualSpaceCalculator | `src/studio/services/residual-space.ts` |
| 2 | SmartSizingService | `src/studio/services/smart-sizing.ts` |
| 3 | SizingModeDetector | `src/studio/services/sizing-mode-detector.ts` |
| 3 | ResizeManager | `src/studio/services/resize-manager.ts` |
| 3 | SizeIndicator | `studio/preview/size-indicator.ts` |
| 4 | GroupingService | `src/studio/services/grouping-service.ts` |
| 5 | GridDropTargeting | `src/studio/services/grid-drop-targeting.ts` |
| 5 | GridIndicator | `studio/preview/grid-indicator.ts` |

### Konstanten (aus SPECIFICATION.md)

```typescript
const PADDING = 16
const GAP = 8
const MIN_SIZE = 40
const EDGE_THRESHOLD_MIN = 6
const EDGE_THRESHOLD_MAX = 12
const EDGE_THRESHOLD_RATIO = 0.15
const SNAP_THRESHOLD = 10
```

### Kern-Algorithmen

**Edge-Detection:**
```
threshold = min(12, max(6, size × 0.15))
if position < threshold → 'before'
if position > size - threshold → 'after'
else → null (Kind-Modus)
```

**Smart Sizing:**
```
residual = getResidualSpace(parentId)
stackDirection: max(40, residual / 2)
crossDirection: 'fill'
```

**Resize Mode Detection:**
```
if newSize >= available - 10 → 'fill'
if newSize <= childMin + 10 → 'hug'
else → max(40, newSize)
```
