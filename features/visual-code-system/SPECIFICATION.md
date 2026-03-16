# Visual Code System - Spezifikation

## Vision

Ein visueller Editor, der das Erstellen von UI-Layouts durch direkte Manipulation ermöglicht. Jede visuelle Änderung wird bidirektional mit Code synchronisiert.

**Kernprinzip:** Der User denkt visuell, der Code folgt automatisch.

---

## Konstanten

Diese Werte sind im gesamten System konsistent:

| Konstante | Wert | Begründung |
|-----------|------|------------|
| `PADDING` | 16px | Standard-Innenabstand für Container |
| `GAP` | 8px | Abstand zwischen Geschwister-Elementen |
| `MIN_SIZE` | 40px | Minimum für jede Dimension (Touch-Target) |
| `EDGE_THRESHOLD_MIN` | 6px | Minimum für Sibling-Edge-Detection |
| `EDGE_THRESHOLD_MAX` | 12px | Maximum für Sibling-Edge-Detection |
| `EDGE_THRESHOLD_RATIO` | 0.15 | 15% der Element-Größe |
| `SNAP_THRESHOLD` | 10px | Toleranz für fill/hug-Erkennung beim Resize |

---

## Kernkonzepte

### 1. Unified Container Model

**Prinzip:** Alles ist ein Container. Es gibt keine fundamentale Unterscheidung zwischen "Layouts" und "Komponenten" - beide sind Container mit Kindern und Layout-Eigenschaften.

**Eigenschaften jedes Containers:**

```typescript
interface Container {
  id: string
  name: string
  type: 'root' | 'layout' | 'slot' | 'container' | 'component'
  direction: 'horizontal' | 'vertical'
  sizing: {
    width: 'fill' | 'hug' | number   // number = Pixel
    height: 'fill' | 'hug' | number
  }
  children: string[]  // IDs der Kind-Container

  // Optional für Grid:
  grid?: {
    columns: number
    rows: number
    gap: number
  }
}
```

**Implikation:** Jedes Element kann Kinder haben. Ein Button kann ein Icon enthalten. Eine Card kann beliebig verschachtelt sein.

### 2. Layout-Modi

Drei Grundmodi für Container-Layout:

| Modus | Beschreibung | Kinder-Anordnung |
|-------|--------------|------------------|
| `horizontal` | Horizontaler Stack (HBox) | Kinder nebeneinander (links → rechts) |
| `vertical` | Vertikaler Stack (VBox) | Kinder übereinander (oben → unten) |
| `grid` | CSS Grid | Kinder in Zellen (column × row) |

**Stack (horizontal/vertical):**
- Kinder werden linear angeordnet
- Reihenfolge im Code = Reihenfolge auf Screen
- Gap zwischen jedem Kind

**Grid:**
- Kinder werden in Zellen platziert
- Jedes Kind hat Position: `{ column, row }`
- Zellen können gespannt werden: `{ colspan, rowspan }` (Zukunft)

### 3. Sizing-Modell

Drei Modi pro Dimension (Breite und Höhe unabhängig):

| Modus | Bedeutung | Verhalten |
|-------|-----------|-----------|
| `fill` | Verfügbaren Platz füllen | Teilt Platz mit anderen `fill`-Geschwistern |
| `hug` | An Inhalt anpassen | Schrumpft auf Minimum der Kinder |
| `<pixel>` | Feste Größe | Exakte Pixelgröße (min. 40px) |

**Verteilungslogik bei mehreren `fill`-Kindern:**

```
verfügbar = parent_size - (2 × PADDING) - Σ(feste_kinder) - ((n-1) × GAP)
fill_size = max(MIN_SIZE, verfügbar / anzahl_fill_kinder)
```

**Beispiel:** VBox 400px hoch, 3 Kinder (100px, fill, fill):
```
verfügbar = 400 - 32 - 100 - 16 = 252px
fill_size = 252 / 2 = 126px
```

### 4. Residual Space (Verbleibender Platz)

**Definition:** Der Platz, der einem neuen Element zur Verfügung steht, nachdem alle existierenden Geschwister berücksichtigt wurden.

**Berechnung:**

```
residual = parent_verfügbar - Σ(geschwister_mit_fester_größe) - ((n-1) × GAP)
```

**Wichtig:** Nur Geschwister mit fester Pixel-Größe werden abgezogen. `fill`-Geschwister teilen sich den verbleibenden Platz dynamisch.

**Anwendung:**
- **Beim Einfügen:** Neue Elemente bekommen `residual / 2` in Stack-Richtung
- **Beim Resize:** `fill` wird gesetzt wenn `size >= residual - SNAP_THRESHOLD`

---

## Interaktionsmuster

### Pattern 1: Hierarchisches Drop-Targeting

**Problem:** Bei verschachtelten Containern - welcher ist das Drop-Target?

**Lösung:** Der tiefste Container unter dem Cursor gewinnt.

**Algorithmus:**
```
function findDeepestContainer(containerId, x, y):
  bounds = getBounds(containerId)
  if not pointInBounds(x, y, bounds):
    return null

  // Kinder prüfen (tiefere haben Priorität)
  for childId in container.children:
    deeper = findDeepestContainer(childId, x, y)
    if deeper:
      return deeper

  // Kein tieferes Match → diesen Container zurückgeben
  return { id: containerId, bounds }
```

**Edge Case:** Element darf nicht in sich selbst oder eigene Nachkommen gedroppt werden.

### Pattern 2: Sibling-Insertion (Geschwister-Einfügung)

**Problem:** Bei hierarchischem Targeting landet man immer als Kind, nie als Geschwister.

**Lösung:** Edge-Detection - am Rand eines Elements wird als Geschwister eingefügt.

**Threshold-Berechnung:**

```
threshold = min(EDGE_THRESHOLD_MAX, max(EDGE_THRESHOLD_MIN, size × EDGE_THRESHOLD_RATIO))
         = min(12px, max(6px, size × 0.15))
```

**Begründung der Werte:**
- **15%:** Proportional zur Element-Größe, fühlt sich natürlich an
- **min 6px:** Auch bei kleinen Elementen (z.B. Icons 16px) noch treffbar
- **max 12px:** Bei großen Elementen nicht zu viel Fläche für Sibling-Zone

**Mechanismus:**

```
relativePosition = cursor - element.start

if relativePosition < threshold:
  return { position: 'before' }
if relativePosition > element.size - threshold:
  return { position: 'after' }
return null  // Kind-Modus
```

**Richtungsabhängigkeit:**
- In horizontalem Parent: Links/Rechts-Ränder prüfen (X-Achse)
- In vertikalem Parent: Oben/Unten-Ränder prüfen (Y-Achse)

**Visuelles Feedback:**
- Blaue Linie (3px) an Einfügeposition
- Linie ist senkrecht zur Parent-Direction
- Text-Indikator: "(als Schwester)"

### Pattern 3: Smart Sizing beim Einfügen

**Problem:** Welche Größe soll ein neues Element haben?

**Lösung:** Intelligente Berechnung basierend auf verfügbarem Platz.

**Algorithmus:**

```
residual = getResidualSpace(parentId)
parentDirection = parent.direction

if parentDirection == 'horizontal':
  width = max(MIN_SIZE, residual.width / 2)
  height = 'fill'
else:  // vertical
  width = 'fill'
  height = max(MIN_SIZE, residual.height / 2)
```

**Logik:**
- **Stack-Richtung:** Halber verbleibender Platz (Raum für weitere Elemente lassen)
- **Cross-Richtung:** `fill` (volle Ausdehnung nutzen)

**Beispiel in VBox (400px hoch, 2 existierende Kinder je 100px fest):**

```
residual.height = 400 - 32(padding) - 200(kinder) - 8(gap) = 160px
neues Kind: height = max(40, 160/2) = 80px, width = 'fill'
```

### Pattern 4: Resize mit Modus-Erkennung

**Problem:** User zieht Element größer/kleiner - wann wird es `fill`, wann `hug`, wann `pixel`?

**Lösung:** Automatische Modus-Erkennung basierend auf Grenzwerten.

**Wichtig:** Bei Resize muss `available` ohne das Element selbst berechnet werden!

```
available = getResidualSpace(parentId, excludeChildId: elementId)
childMin = getMinimumSizeOfChildren(elementId)
```

**Algorithmus:**

```
if newSize >= available - SNAP_THRESHOLD:
  return 'fill'
if newSize <= childMin + SNAP_THRESHOLD:
  return 'hug'
return max(MIN_SIZE, newSize)
```

**SNAP_THRESHOLD (10px):** Toleranz für einfacheres Treffen der Grenzen.

**Feedback während Resize:**
- Size-Indicator zeigt aktuelle Größe: "200px × fill"
- Zentriert auf Element
- Verschwindet nach Resize

### Pattern 5: Grid Drop-Targeting

**Problem:** In Grid-Containern sollen Elemente in spezifische Zellen gedroppt werden.

**Zellen-Berechnung:**

```
availableWidth = bounds.width - 2 × PADDING
availableHeight = bounds.height - 2 × PADDING

cellWidth = (availableWidth - (columns - 1) × gap) / columns
cellHeight = (availableHeight - (rows - 1) × gap) / rows
```

**Zellen-Erkennung bei Drag:**

```
relX = cursorX - bounds.left - PADDING
relY = cursorY - bounds.top - PADDING

column = floor(relX / (cellWidth + gap))
row = floor(relY / (cellHeight + gap))

// Bounds-Check
column = clamp(column, 0, columns - 1)
row = clamp(row, 0, rows - 1)
```

**Visuelles Feedback:**
- Grid-Linien permanent sichtbar (gestrichelt)
- Aktive Zelle beim Drag highlighten
- Grid-Controls bei Selektion: columns, rows, gap

**Sizing in Grid:**
- Kinder füllen ihre Zelle (`fill` × `fill`)
- Zukünftig: colspan/rowspan für Zellen-Spanning

### Pattern 6: Multi-Select & Gruppieren

**Multi-Select:**
- **Click:** Einzelselektion (ersetzt alle anderen)
- **Shift+Click:** Toggle (hinzufügen/entfernen)
- Visuelles Feedback: Alle selektierten haben blauen Schatten

**Gruppieren (Cmd+G):**

Voraussetzungen:
- ≥2 Elemente selektiert
- Alle haben gleichen Parent (sind Geschwister)

**Algorithmus:**

```
1. Validiere: alle selektierten haben gleichen Parent
2. Sortiere selektierte nach Index im Parent
3. Erstelle neuen Container:
   - direction = parent.direction
   - sizing = { width: 'fill', height: 'fill' }
4. Verschiebe selektierte (in Reihenfolge) in neuen Container
5. Entferne selektierte aus Parent
6. Füge neuen Container an Position des ersten ein
7. Selektiere neuen Container
```

**Ungroup (Cmd+Shift+G):** (Zukunft)
- Kinder des Containers werden zu Geschwistern
- Container wird entfernt
- Kinder behalten Reihenfolge

---

## Soll-Architektur

### Schichtenmodell

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
│  ┌────────────┐ ┌──────────┐ ┌─────────────┐ ┌───────────┐ │
│  │  Canvas    │ │ Palette  │ │  Property   │ │   Grid    │ │
│  │  Renderer  │ │          │ │   Panel     │ │  Controls │ │
│  └─────┬──────┘ └────┬─────┘ └──────┬──────┘ └─────┬─────┘ │
│        │             │              │              │        │
├────────┴─────────────┴──────────────┴──────────────┴────────┤
│                    Interaction Layer                         │
│  ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌────────────┐ │
│  │   Drag     │ │ Selection  │ │  Resize  │ │  Grouping  │ │
│  │  Manager   │ │  Manager   │ │  Manager │ │  Service   │ │
│  └─────┬──────┘ └─────┬──────┘ └────┬─────┘ └─────┬──────┘ │
│        │              │             │             │         │
├────────┴──────────────┴─────────────┴─────────────┴─────────┤
│                     Spatial Layer                            │
│  ┌──────────────┐ ┌────────────┐ ┌────────────────────────┐ │
│  │   Bounds     │ │    Hit     │ │    Edge / Grid         │ │
│  │  Calculator  │ │  Testing   │ │    Detection           │ │
│  └──────┬───────┘ └─────┬──────┘ └───────────┬────────────┘ │
│         │               │                    │              │
├─────────┴───────────────┴────────────────────┴──────────────┤
│                      Model Layer                             │
│  ┌──────────────┐ ┌───────────────┐ ┌─────────────────────┐ │
│  │  Container   │ │    Sizing     │ │   Residual Space    │ │
│  │    Tree      │ │    Model      │ │    Calculator       │ │
│  └──────┬───────┘ └───────┬───────┘ └──────────┬──────────┘ │
│         │                 │                    │            │
├─────────┴─────────────────┴────────────────────┴────────────┤
│                   Sync Layer (Mirror)                        │
│  ┌──────────────┐ ┌───────────────┐ ┌─────────────────────┐ │
│  │  SourceMap   │ │ CodeModifier  │ │  CommandExecutor    │ │
│  │              │ │               │ │  (Undo/Redo)        │ │
│  └──────────────┘ └───────────────┘ └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Komponenten-Interfaces

#### Model Layer

**ContainerTree** - Verwaltung der Container-Hierarchie

```typescript
interface ContainerTree {
  // CRUD
  get(id: string): Container | null
  create(data: Omit<Container, 'id'>): string
  update(id: string, changes: Partial<Container>): void
  delete(id: string): void

  // Queries
  getParent(id: string): string | null
  getChildren(id: string): string[]
  getSiblings(id: string): string[]
  getIndex(id: string): number
  isDescendant(ancestorId: string, descendantId: string): boolean

  // Manipulation
  insertChild(parentId: string, childId: string, index?: number): void
  insertBefore(refId: string, childId: string): void
  insertAfter(refId: string, childId: string): void
  moveChild(childId: string, newParentId: string, index?: number): void

  // Events
  on(event: 'change', handler: (changes: ChangeSet) => void): void
}
```

**SizingModel** - Berechnung von Sizing-Werten

```typescript
interface SizingModel {
  getResidualSpace(parentId: string, excludeId?: string): Size
  getAvailableSpace(elementId: string): Size
  getChildrenMinSize(parentId: string): Size

  calculateSmartSize(parentId: string, direction: Direction): Sizing
  detectSizingMode(newSize: number, available: number, childMin: number): SizingValue
}

type SizingValue = 'fill' | 'hug' | number
type Size = { width: number, height: number }
type Sizing = { width: SizingValue, height: SizingValue }
```

#### Spatial Layer

**BoundsCalculator** - Pixel-Bounds aus Container-Tree

```typescript
interface BoundsCalculator {
  calculate(rootId: string, rootBounds: Rect): Map<string, Rect>
  getBounds(id: string): Rect | null
  invalidate(id?: string): void  // null = alles invalidieren
}

interface Rect {
  left: number
  top: number
  width: number
  height: number
}
```

**HitTesting** - Element-Erkennung an Koordinaten

```typescript
interface HitTesting {
  findContainerAt(x: number, y: number): HitResult | null
  checkSiblingZone(x: number, y: number, hit: HitResult, parent: Container): SiblingZone | null
  getGridCellAt(x: number, y: number, gridBounds: Rect, config: GridConfig): GridCell | null
}

interface HitResult {
  id: string
  bounds: Rect
  depth: number
}

interface SiblingZone {
  refId: string
  position: 'before' | 'after'
}

interface GridCell {
  column: number
  row: number
  bounds: Rect
}
```

#### Interaction Layer

**DragManager** - Drag & Drop Koordination

```typescript
interface DragManager {
  startDrag(source: 'palette' | 'canvas', data: DragData): void
  updateDrag(x: number, y: number): DragState
  endDrag(): DropResult | null
  cancelDrag(): void

  on(event: 'start' | 'update' | 'end' | 'cancel', handler: Function): void
}

interface DragData {
  type: 'container' | 'component'
  direction?: Direction
  sizing?: Sizing
  moveId?: string  // Bei Move statt Create
  grid?: GridConfig
}

interface DropResult {
  targetId: string
  siblingInsert?: SiblingZone
  gridCell?: GridCell
}
```

**SelectionManager** - Selektion verwalten

```typescript
interface SelectionManager {
  readonly selected: readonly string[]

  select(id: string): void        // Ersetzt Selektion
  toggle(id: string): void        // Add/Remove
  add(id: string): void
  remove(id: string): void
  clear(): void
  selectMultiple(ids: string[]): void

  isSelected(id: string): boolean
  hasMultiple(): boolean

  on(event: 'change', handler: (selected: string[]) => void): void
}
```

**ResizeManager** - Resize-Interaktion

```typescript
interface ResizeManager {
  startResize(elementId: string, handle: ResizeHandle): void
  updateResize(dx: number, dy: number): ResizeState
  endResize(): void
  cancelResize(): void

  on(event: 'update' | 'end', handler: (state: ResizeState) => void): void
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'

interface ResizeState {
  elementId: string
  sizing: Sizing
  displayWidth: string   // "200px" oder "fill"
  displayHeight: string
}
```

**GroupingService** - Gruppieren/Ungruppieren

```typescript
interface GroupingService {
  canGroup(ids: string[]): GroupValidation
  group(ids: string[]): string  // Returns new group ID

  canUngroup(id: string): boolean
  ungroup(id: string): string[]  // Returns freed children IDs
}

interface GroupValidation {
  valid: boolean
  reason?: 'need_multiple' | 'different_parents' | 'cannot_group_root'
}
```

---

## Integration mit Mirror

### Bestehende Komponenten nutzen

| Prototype-Konzept | Mirror-Äquivalent |
|-------------------|-------------------|
| ContainerTree | IR (Intermediate Representation) |
| Bounds-Berechnung | Preview Renderer + SourceMap |
| SelectionManager | StateSelectionAdapter |
| Code-Generierung | CodeModifier |
| Property-Editing | PropertyPanel |
| Undo/Redo | CommandExecutor |

### Integrationspunkte

**1. IR als Container-Tree**
- Mirror's IR ist bereits ein Baum von Nodes
- `IRNode` hat `children`, `props` (inkl. sizing)
- Erweiterung: `direction` Property, `grid` Config

**2. SourceMap für Bounds**
- Bidirektionale Mapping: Code-Position ↔ DOM-Element
- DOM-Bounds via `getBoundingClientRect()` extrahieren
- Empfehlung: DOM-Bounds nutzen (konsistent mit Preview)

**3. SyncCoordinator erweitern**
- Bereits vorhanden: Editor ↔ Preview Sync
- Neu: Visuelle Manipulationen → Code-Änderungen
- Während Drag: Pending State (noch nicht committen)
- Bei Drop: Code-Änderung via CodeModifier

**4. CodeModifier erweitern**
- Bestehend: Property-Änderungen
- Neu: `insertSibling()`, `wrapInContainer()`, `unwrapContainer()`

### Neue Komponenten

1. **EdgeDetectionService** - Sibling-Erkennung
2. **ResizeManager** - Resize mit Modus-Erkennung
3. **GroupingService** - Multi-Select und Gruppieren
4. **GridDropTargeting** - Zellen-Erkennung für Grid

---

## Offene Fragen mit Empfehlungen

| Frage | Empfehlung | Begründung |
|-------|------------|------------|
| Bounds: DOM vs. eigene Berechnung? | **DOM** (`getBoundingClientRect`) | Konsistent mit Preview, keine Sync-Probleme |
| IR erweitern oder separates Model? | **IR erweitern** | Single Source of Truth, einfacherer Sync |
| Pending State während Drag? | **Ja, lokaler State** | IR erst bei Drop ändern, bessere UX |
| Undo/Redo Granularität? | **Eine Operation = ein Command** | Group ist ein Command, nicht mehrere |

---

## Glossar

| Begriff | Definition |
|---------|------------|
| **Container** | Jedes Element im Baum (Layout, Box, Komponente) |
| **Direction** | Stapelrichtung der Kinder (`horizontal` / `vertical`) |
| **Sizing** | Größen-Modus (`fill`, `hug`, oder Pixel-Wert) |
| **Residual Space** | Verbleibender Platz nach Abzug der festen Geschwister |
| **Sibling-Insertion** | Einfügen als Geschwister statt als Kind |
| **Hit-Testing** | Finden des Elements unter Cursor-Position |
| **Edge-Detection** | Erkennung ob Cursor am Rand eines Elements ist |
| **Smart Sizing** | Automatische Größenberechnung beim Einfügen |
| **Snap** | Automatisches Einrasten bei fill/hug-Grenzen |
