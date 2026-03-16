# Visual Code System - Prototype Documentation

## Übersicht

Das Visual Code System ist ein visueller Editor für UI-Layouts. Es ermöglicht das Erstellen und Manipulieren von verschachtelten Containern durch Drag & Drop, mit intelligenter Größenberechnung und Code-Generierung.

**Prototype-Dateien:**
- `prototype/index.html` - HTML-Struktur, Palette
- `prototype/styles.css` - Styling
- `prototype/app.js` - Komplette Logik (~1600 LOC)

---

## Architektur

### Globaler State

```javascript
const state = {
  // Container-Hierarchie (flache Map für O(1) Zugriff)
  containers: {
    root: {
      id: 'root',
      name: 'App',
      type: 'root',
      direction: 'vertical',
      children: []
    }
  },

  // Berechnete Pixel-Bounds (Cache, wird bei jedem Render neu berechnet)
  containerBounds: {
    // 'c-123': { left, top, width, height }
  },

  // Navigation (für Breadcrumb, aktuell nur root)
  viewContainer: 'root',

  // Selektion (Array für Multi-Select)
  selectedElements: [],

  // Drag & Drop State
  drag: {
    active: false,
    data: null,              // { type, component, direction, moveId?, ... }
    targetContainer: null,   // ID des Drop-Targets
    targetZone: 'mid-center',
    siblingInsert: null      // { refId, position: 'before'|'after' }
  }
}
```

### Container-Typen

| Typ | Beschreibung | Beispiele |
|-----|--------------|-----------|
| `root` | Wurzel-Container | App |
| `layout` | Vordefiniertes Layout mit Slots | HStack, VStack, SidebarLayout |
| `slot` | Slot innerhalb eines Layouts | Sidebar, Content, Header |
| `container` | Einfacher Box-Container | VBox, HBox, Grid |
| `component` | UI-Komponente | Button, Card, Icon |

### Container-Struktur

```javascript
{
  id: 'c-1234-abc',           // Eindeutige ID
  name: 'HBox',               // Anzeigename
  type: 'container',          // Typ (siehe oben)
  component: 'box',           // Komponenten-Typ für Palette
  direction: 'horizontal',    // 'horizontal' | 'vertical'
  sizing: {
    width: 'fill',            // 'fill' | 'hug' | number (Pixel)
    height: 200
  },
  zone: 'mid-center',         // Position im Parent (Legacy, 9-Zonen)
  children: ['c-5678-def'],   // Kind-IDs (geordnet)

  // Nur für Grid-Container:
  grid: {
    columns: 4,
    rows: 3,
    gap: 8
  }
}
```

---

## Konstanten

Diese Werte sind im Code fest definiert:

```javascript
const PADDING = 16      // Innenabstand jedes Containers
const GAP = 8           // Abstand zwischen Kindern
const MIN_SIZE = 40     // Minimum für jede Dimension
const SNAP_THRESHOLD = 10  // Toleranz für fill/hug-Erkennung
```

**Edge-Detection Threshold:**
```javascript
threshold = Math.min(12, Math.max(6, size * 0.15))
// 15% der Größe, min 6px, max 12px
```

---

## Features im Detail

### 1. Drag & Drop

#### Ablauf: Von Palette auf Canvas

```
1. dragstart (Palette-Item)
   └─> state.drag.active = true
   └─> state.drag.data = { type, component, direction, ... }

2. dragover (Canvas) - kontinuierlich
   └─> findContainerAt(x, y)           // Tiefsten Container finden
   └─> checkSiblingDrop(...)           // Edge-Detection
   └─> state.drag.targetContainer = ...
   └─> state.drag.siblingInsert = ...
   └─> renderDropZones()               // Visuelles Feedback

3. drop (Canvas)
   └─> createContainer({ ... })        // Neuen Container erstellen
   └─> Sizing berechnen (Smart Sizing)
   └─> addChild() oder insertChildAt() // Einfügen
   └─> render()

4. dragend
   └─> state.drag = { active: false, ... }
```

#### Ablauf: Element verschieben

```
1. dragstart (Container-Element)
   └─> state.drag.data.moveId = containerId  // Move-Marker

2. dragover - wie oben

3. drop
   └─> Validierung: nicht in sich selbst droppen
   └─> Aus altem Parent entfernen
   └─> In neuen Parent einfügen
   └─> render()
```

#### Code: Move-Erkennung

```javascript
if (data.moveId) {
  // Move-Operation
  const moveId = data.moveId

  // Validierung
  if (moveId === targetId || isDescendant(moveId, targetId)) {
    return  // Abbrechen
  }

  // Aus altem Parent entfernen
  const currentParent = findParent(moveId)
  parent.children = parent.children.filter(id => id !== moveId)

  // In neuen Parent einfügen
  addToTarget(moveId)
}
```

### 2. Sibling-Insertion

**Problem:** Beim Drop landet man immer als Kind des tiefsten Containers.

**Lösung:** Am Rand eines Elements wird als Geschwister eingefügt.

#### Algorithmus

```javascript
function checkSiblingDrop(x, y, hit, parent) {
  if (!parent) return null

  const bounds = hit.bounds
  const direction = parent.direction || 'vertical'

  // Relative Position zum Element
  const relX = x - canvasRect.left - bounds.left
  const relY = y - canvasRect.top - bounds.top

  if (direction === 'horizontal') {
    // Horizontaler Parent → Links/Rechts prüfen
    const threshold = Math.min(12, Math.max(6, bounds.width * 0.15))
    if (relX < threshold) return { position: 'before' }
    if (relX > bounds.width - threshold) return { position: 'after' }
  } else {
    // Vertikaler Parent → Oben/Unten prüfen
    const threshold = Math.min(12, Math.max(6, bounds.height * 0.15))
    if (relY < threshold) return { position: 'before' }
    if (relY > bounds.height - threshold) return { position: 'after' }
  }

  return null  // Kind-Modus
}
```

#### Einfüge-Logik

```javascript
function insertChildAt(parentId, childId, refId, position) {
  const parent = getContainer(parentId)

  // Entfernen falls bereits vorhanden
  parent.children = parent.children.filter(id => id !== childId)

  // Index des Referenz-Elements
  const refIndex = parent.children.indexOf(refId)

  // Einfügen vor oder nach Referenz
  const insertIndex = position === 'before' ? refIndex : refIndex + 1
  parent.children.splice(insertIndex, 0, childId)
}
```

#### Visuelles Feedback

```javascript
function showSiblingIndicator(bounds, position, direction) {
  if (direction === 'horizontal') {
    // Vertikale Linie
    indicator.style.width = '3px'
    indicator.style.height = bounds.height + 'px'
    indicator.style.left = position === 'before'
      ? bounds.left - 2 + 'px'
      : bounds.left + bounds.width - 1 + 'px'
  } else {
    // Horizontale Linie
    indicator.style.width = bounds.width + 'px'
    indicator.style.height = '3px'
    indicator.style.top = position === 'before'
      ? bounds.top - 2 + 'px'
      : bounds.top + bounds.height - 1 + 'px'
  }
}
```

### 3. Smart Sizing

#### Residual Space (Verbleibender Platz)

```javascript
function getResidualSpace(containerId, excludeChildId = null) {
  const container = getContainer(containerId)
  const bounds = containerBounds[containerId]
  const direction = container.direction || 'vertical'

  let usedSpace = 0

  // Nur feste Größen zählen
  container.children.forEach(childId => {
    if (childId === excludeChildId) return

    const child = getContainer(childId)
    const sizing = child.sizing || { width: 'fill', height: 'fill' }

    if (direction === 'horizontal') {
      if (typeof sizing.width === 'number') {
        usedSpace += sizing.width + GAP
      }
    } else {
      if (typeof sizing.height === 'number') {
        usedSpace += sizing.height + GAP
      }
    }
  })

  const totalSpace = direction === 'horizontal'
    ? bounds.width - 2 * PADDING
    : bounds.height - 2 * PADDING

  const residual = Math.max(MIN_SIZE, totalSpace - usedSpace)

  return {
    width: direction === 'horizontal' ? residual : bounds.width - 2 * PADDING,
    height: direction === 'vertical' ? residual : bounds.height - 2 * PADDING
  }
}
```

#### Sizing beim Einfügen

```javascript
// In onDrop():
const parentDirection = targetContainer.direction || 'vertical'
const residual = getResidualSpace(targetId)

let sizing
if (parentDirection === 'horizontal') {
  // Stack-Richtung: halber Platz, Cross: fill
  sizing = {
    width: Math.max(40, Math.round(residual.width / 2)),
    height: 'fill'
  }
} else {
  sizing = {
    width: 'fill',
    height: Math.max(40, Math.round(residual.height / 2))
  }
}
```

### 4. Resize

#### Resize-Handles

8 Punkte um selektierte Elemente:

```
nw --- n --- ne
|            |
w            e
|            |
sw --- s --- se
```

#### Modus-Erkennung beim Resize

```javascript
// In mousemove während Resize:
const availableSpace = getAvailableSpaceForElement(containerId)
const childMin = getChildrenMinSize(containerId)

if (newSize >= availableSpace - SNAP_THRESHOLD) {
  sizing = 'fill'
} else if (newSize <= childMin + SNAP_THRESHOLD) {
  sizing = 'hug'
} else {
  sizing = Math.max(MIN_SIZE, newSize)
}
```

#### Verfügbarer Platz für Element

```javascript
function getAvailableSpaceForElement(elementId) {
  const parentId = findParent(elementId)
  // Residual ohne sich selbst = verfügbarer Platz
  return getResidualSpace(parentId, elementId)
}
```

#### Size-Indicator

```javascript
function showSizeIndicator(sizing, bounds) {
  const w = typeof sizing.width === 'number'
    ? Math.round(sizing.width) + 'px'
    : sizing.width
  const h = typeof sizing.height === 'number'
    ? Math.round(sizing.height) + 'px'
    : sizing.height

  indicator.textContent = `${w} × ${h}`
  indicator.style.left = bounds.left + bounds.width / 2 + 'px'
  indicator.style.top = bounds.top + bounds.height / 2 + 'px'
}
```

### 5. Multi-Select & Gruppieren

#### Multi-Select

```javascript
dom.canvas.addEventListener('click', e => {
  const el = e.target.closest('.container-element')
  if (!el) {
    state.selectedElements = []
    return
  }

  const id = el.dataset.id

  if (e.shiftKey) {
    // Toggle in Selektion
    if (state.selectedElements.includes(id)) {
      state.selectedElements = state.selectedElements.filter(x => x !== id)
    } else {
      state.selectedElements.push(id)
    }
  } else {
    // Einzelselektion
    state.selectedElements = [id]
  }

  render()
})
```

#### Gruppieren (Cmd+G)

```javascript
function groupSelectedElements() {
  // Validierung
  if (state.selectedElements.length < 2) return

  const parents = state.selectedElements.map(id => findParent(id))
  const uniqueParents = [...new Set(parents)]
  if (uniqueParents.length !== 1) {
    console.warn('Can only group siblings')
    return
  }

  const parentId = uniqueParents[0]
  const parent = getContainer(parentId)

  // Indices sortieren
  const indices = state.selectedElements
    .map(id => parent.children.indexOf(id))
    .sort((a, b) => a - b)

  const firstIndex = indices[0]

  // Neuen Container erstellen (Direction vom Parent)
  const groupId = createContainer({
    type: 'container',
    name: parent.direction === 'horizontal' ? 'HBox' : 'VBox',
    component: 'box',
    direction: parent.direction || 'vertical',
    sizing: { width: 'fill', height: 'fill' }
  })

  // Selektierte Elemente verschieben
  indices.forEach(i => {
    addChild(groupId, parent.children[i])
  })

  // Aus Parent entfernen
  parent.children = parent.children.filter(
    id => !state.selectedElements.includes(id)
  )

  // Gruppe einfügen
  parent.children.splice(firstIndex, 0, groupId)

  // Neue Gruppe selektieren
  state.selectedElements = [groupId]

  render()
}
```

### 6. Grid-Container

#### Grid-Erstellung

```javascript
const containerId = createContainer({
  type: 'container',
  name: 'Grid',
  component: 'grid-container',
  direction: 'vertical',
  sizing: { width: 'fill', height: 'fill' },
  grid: { columns: 4, rows: 3, gap: 8 }
})
```

#### Grid-Linien Rendering

```javascript
function renderGridLines(el, grid, bounds) {
  const { columns, rows, gap } = grid
  const availableWidth = bounds.width - 2 * PADDING
  const availableHeight = bounds.height - 2 * PADDING

  const cellWidth = (availableWidth - (columns - 1) * gap) / columns
  const cellHeight = (availableHeight - (rows - 1) * gap) / rows

  // Vertikale Linien
  for (let i = 1; i < columns; i++) {
    const x = PADDING + i * cellWidth + (i - 0.5) * gap
    createLine('vertical', x, PADDING, availableHeight)
  }

  // Horizontale Linien
  for (let i = 1; i < rows; i++) {
    const y = PADDING + i * cellHeight + (i - 0.5) * gap
    createLine('horizontal', PADDING, y, availableWidth)
  }
}
```

#### Grid-Controls

Bei Selektion eines Grid-Containers:

```javascript
function updateGridControls() {
  const selectedId = state.selectedElements[0]
  const container = getContainer(selectedId)

  if (container?.grid) {
    dom.gridControls.style.display = 'flex'
    dom.gridColumns.value = container.grid.columns
    dom.gridRows.value = container.grid.rows
    dom.gridGap.value = container.grid.gap
  } else {
    dom.gridControls.style.display = 'none'
  }
}

function onGridSettingChange() {
  const container = getContainer(state.selectedElements[0])
  if (!container?.grid) return

  container.grid.columns = parseInt(dom.gridColumns.value) || 4
  container.grid.rows = parseInt(dom.gridRows.value) || 3
  container.grid.gap = parseInt(dom.gridGap.value) || 8

  render()
}
```

### 7. Weitere Aktionen

#### Duplizieren (Cmd+D)

```javascript
function deepCloneContainer(containerId) {
  const container = getContainer(containerId)
  const { id, children, ...rest } = container

  const newId = createContainer({ ...rest })

  children?.forEach(childId => {
    const clonedChildId = deepCloneContainer(childId)
    addChild(newId, clonedChildId)
  })

  return newId
}

function duplicateContainer(containerId) {
  const parentId = findParent(containerId)
  const cloneId = deepCloneContainer(containerId)

  // Nach Original einfügen
  const parent = getContainer(parentId)
  const originalIndex = parent.children.indexOf(containerId)
  parent.children.splice(originalIndex + 1, 0, cloneId)

  return cloneId
}
```

#### Löschen (Delete/Backspace)

```javascript
function removeContainer(id) {
  const container = getContainer(id)

  // Kinder rekursiv entfernen
  container.children?.forEach(childId => removeContainer(childId))

  // Aus Parent entfernen
  Object.values(state.containers).forEach(c => {
    if (c.children) {
      c.children = c.children.filter(cid => cid !== id)
    }
  })

  // Aus State entfernen
  delete state.containers[id]
  delete state.containerBounds[id]
}
```

---

## Bounds-Berechnung

### Haupt-Algorithmus

```javascript
function calculateAllBounds() {
  state.containerBounds = {}

  // Root = volle Canvas
  const canvasRect = dom.canvas.getBoundingClientRect()
  state.containerBounds.root = {
    left: 0,
    top: 0,
    width: canvasRect.width,
    height: canvasRect.height
  }

  // Rekursiv für alle Kinder
  calculateChildBounds('root', state.containerBounds.root)
}
```

### Kind-Bounds Berechnung

```javascript
function calculateChildBounds(parentId, parentBounds) {
  const parent = getContainer(parentId)
  if (!parent?.children?.length) return

  const direction = parent.direction || 'vertical'
  const children = parent.children.map(id => getContainer(id))

  // 1. Feste Größen und fill-Anzahl ermitteln
  let fixedSize = 0
  let fillCount = 0

  children.forEach(child => {
    const sizing = child.sizing || { width: 'fill', height: 'fill' }
    const relevantSize = direction === 'vertical' ? sizing.height : sizing.width

    if (typeof relevantSize === 'number') {
      fixedSize += relevantSize
    } else {
      fillCount++
    }
  })

  // 2. Fill-Größe berechnen
  const available = (direction === 'vertical'
    ? parentBounds.height
    : parentBounds.width) - 2 * PADDING

  const totalGap = (children.length - 1) * GAP
  const fillSize = fillCount > 0
    ? Math.max(MIN_SIZE, (available - fixedSize - totalGap) / fillCount)
    : 0

  // 3. Bounds für jedes Kind setzen
  let offset = PADDING

  children.forEach(child => {
    const sizing = child.sizing || { width: 'fill', height: 'fill' }
    let width, height

    if (direction === 'vertical') {
      // Breite
      width = typeof sizing.width === 'number'
        ? sizing.width
        : parentBounds.width - 2 * PADDING

      // Höhe
      height = typeof sizing.height === 'number'
        ? sizing.height
        : fillSize
    } else {
      // Breite
      width = typeof sizing.width === 'number'
        ? sizing.width
        : fillSize

      // Höhe
      height = typeof sizing.height === 'number'
        ? sizing.height
        : parentBounds.height - 2 * PADDING
    }

    state.containerBounds[child.id] = {
      left: parentBounds.left + (direction === 'horizontal' ? offset : PADDING),
      top: parentBounds.top + (direction === 'vertical' ? offset : PADDING),
      width,
      height
    }

    // Rekursiv für verschachtelte Container
    if (child.children?.length) {
      calculateChildBounds(child.id, state.containerBounds[child.id])
    }

    offset += (direction === 'vertical' ? height : width) + GAP
  })
}
```

---

## Code-Generierung

```javascript
function generateContainerCode(containerId, indent = 0) {
  const container = getContainer(containerId)
  const spaces = '  '.repeat(indent)
  let props = []

  // Sizing (fill ist default, nicht ausgeben)
  if (container.sizing) {
    if (typeof container.sizing.width === 'number') {
      props.push(`w ${Math.round(container.sizing.width)}`)
    } else if (container.sizing.width === 'hug') {
      props.push('w hug')
    }

    if (typeof container.sizing.height === 'number') {
      props.push(`h ${Math.round(container.sizing.height)}`)
    } else if (container.sizing.height === 'hug') {
      props.push('h hug')
    }
  }

  // Grid
  if (container.grid) {
    props.push(`grid ${container.grid.columns}`)
    if (container.grid.rows !== 3) {
      props.push(`rows ${container.grid.rows}`)
    }
    if (container.grid.gap !== 8) {
      props.push(`gap ${container.grid.gap}`)
    }
  }

  const propsStr = props.length ? ' ' + props.join(', ') : ''
  let code = `${spaces}${container.name}${propsStr}\n`

  // Kinder
  container.children?.forEach(childId => {
    code += generateContainerCode(childId, indent + 1)
  })

  return code
}
```

**Ausgabe-Beispiel:**

```
App
  HBox
    VBox w 200
      Button w 120, h 40
    VBox
      Card
  Grid grid 4, rows 2
    Icon
    Icon
```

---

## Tastenkürzel

| Kürzel | Aktion |
|--------|--------|
| **Click** | Einzelselektion |
| **Shift+Click** | Multi-Select (Toggle) |
| **Delete / Backspace** | Selektierte löschen |
| **Cmd+D / Ctrl+D** | Selektierte duplizieren |
| **Cmd+G / Ctrl+G** | Selektierte gruppieren |

---

## DOM-Struktur

```html
<div class="canvas" id="canvas">
  <!-- Grid-Overlay für Root -->
  <div class="grid-overlay" id="gridOverlay"></div>

  <!-- Drop-Zonen Indikatoren -->
  <div class="slot-indicators" id="slotIndicators"></div>
  <div class="drop-indicator" id="dropIndicator"></div>

  <!-- Gerenderte Elemente -->
  <div class="placed-elements" id="placedElements">
    <div class="container-element container selected" data-id="c-123">
      <!-- 8 Resize-Punkte -->
      <div class="resize-dot nw" data-pos="nw" data-id="c-123"></div>
      <div class="resize-dot n" data-pos="n" data-id="c-123"></div>
      <!-- ... -->
    </div>
  </div>

  <!-- Dynamische Indikatoren -->
  <div id="siblingIndicator" class="sibling-indicator"></div>
  <div id="sizeIndicator" class="size-indicator"></div>
</div>
```

---

## CSS-Klassen

| Klasse | Beschreibung |
|--------|--------------|
| `.container-element` | Basis für alle Elemente |
| `.container-element.layout` | Layout-Container (lila Border) |
| `.container-element.slot` | Slot (gestrichelt lila) |
| `.container-element.container` | Box-Container (gestrichelt grau) |
| `.container-element.component` | Komponente (gefärbt nach Typ) |
| `.container-element.selected` | Selektiert (blauer Schatten) |
| `.container-element.grid-container` | Grid-Container |
| `.resize-dot` | Resize-Punkt (6px, weiß, rund) |
| `.sibling-indicator` | Blaue Einfügelinie (3px) |
| `.size-indicator` | Größenanzeige beim Resize |
| `.grid-line` | Grid-Linien (gestrichelt) |

---

## Wichtige Funktionen

| Funktion | Zeilen | Beschreibung |
|----------|--------|--------------|
| `createContainer()` | 134-137 | Container erstellen, ID generieren |
| `addChild()` | 140-144 | Kind zu Parent hinzufügen |
| `insertChildAt()` | 147-162 | Kind an Position einfügen |
| `removeContainer()` | 165-180 | Container rekursiv entfernen |
| `findParent()` | 183-190 | Parent-ID finden |
| `isDescendant()` | 192-197 | Abstammung prüfen |
| `deepCloneContainer()` | 199-215 | Tiefe Kopie erstellen |
| `groupSelectedElements()` | 240-290 | Gruppieren |
| `calculateAllBounds()` | 345-362 | Alle Bounds berechnen |
| `calculateChildBounds()` | 364-532 | Kind-Bounds rekursiv |
| `findContainerAt()` | 539-546 | Container an Position finden |
| `findDeepestContainer()` | 548-569 | Tiefsten Container finden |
| `checkSiblingDrop()` | 939-968 | Sibling-Insertion prüfen |
| `getResidualSpace()` | 1264-1309 | Verbleibenden Platz berechnen |
| `getAvailableSpaceForElement()` | 1311-1325 | Verfügbaren Platz für Resize |
| `initResizeDrag()` | 1327-1423 | Resize-Interaktion |
| `renderGridLines()` | 695-729 | Grid-Linien rendern |
| `updateGridControls()` | 1463-1475 | Grid-Controls aktualisieren |
| `generateContainerCode()` | 1492-1539 | Code generieren |

---

## Edge Cases & Bekannte Einschränkungen

### Behandelte Edge Cases

1. **Drop in sich selbst:** Wird via `isDescendant()` verhindert
2. **Leerer Container:** Kinder erhalten `fill` und teilen Platz
3. **Alle Kinder `fill`:** Gleichmäßige Verteilung
4. **Sehr kleine Elemente:** Minimum 40px durchgesetzt
5. **Sibling bei kleinen Elementen:** Threshold min 6px

### Bekannte Einschränkungen

1. **Grid-Kinder:** Aktuell keine Zellen-Positionierung (immer sequential)
2. **Ungroup:** Noch nicht implementiert
3. **Undo/Redo:** Nicht implementiert
4. **Nested Grids:** Nicht getestet
5. **hug-Sizing:** Berechnet aktuell festen Fallback (100px)
