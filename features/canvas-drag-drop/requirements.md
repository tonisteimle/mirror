# Canvas Drag & Drop

## Übersicht

Canvas Drag & Drop ermöglicht das visuelle Verschieben von Elementen innerhalb des Mirror Studio Canvas. Es gibt zwei Modi:

1. **Component Palette → Canvas**: Neue Komponenten aus der Library in den Canvas ziehen
2. **Canvas → Canvas**: Existierende Elemente innerhalb des Canvas verschieben/umordnen

## Feature-Status

### Modi

| Modus | Status | Beschreibung |
|-------|--------|--------------|
| **Palette → Canvas** | ✅ Funktioniert | Drag aus Component Library |
| **Canvas → Canvas** | ❌ Nicht integriert | Code existiert, aber nicht verbunden |

### Drop-Indikatoren

| Indikator | Status | Beschreibung |
|-----------|--------|--------------|
| **Blaue Linie** | ✅ Implementiert | Zeigt before/after Position |
| **Endpoint Dots** | ✅ Implementiert | Kleine Punkte an Linien-Enden |
| **Layout-Erkennung** | ✅ Implementiert | Horizontal vs Vertical |
| **Inside Highlight** | ✅ Implementiert | Blauer Hintergrund für Container |
| **Self-Drop Prevention** | ✅ Implementiert | Kann nicht auf sich selbst droppen |

### Code-Modifikation

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| **addChild** | ✅ Funktioniert | Kind zu Parent hinzufügen |
| **addChildRelativeTo** | ✅ Funktioniert | Before/After Sibling |
| **removeNode** | ✅ Implementiert | Node und Children entfernen |
| **moveNode** | ✅ Implementiert | Node verschieben mit Re-Indent |

## Architektur

### Dateien

```
packages/mirror-lang/src/studio/
├── drag-drop-manager.ts      # Koordiniert Drag-Events
├── drop-zone-calculator.ts   # Berechnet Drop-Zonen + Indikatoren
├── code-modifier.ts          # Source-Code Manipulation
└── source-map.ts             # Node-Position Mapping

studio.html                   # Integration (nur Palette → Canvas)
```

### Klassen

**DragDropManager** - Event-Koordination
- Bindet dragover, dragenter, dragleave, drop Events
- Erkennt Move vs Copy Operationen
- Ruft CodeModifier für Source-Änderungen auf

**DropZoneCalculator** - Visuelle Logik
- Berechnet Drop-Zonen aus Maus-Position
- Erkennt Layout-Richtung (horizontal/vertical)
- Zeigt/Versteckt Indikatoren (Line, Dots, Highlight)
- Verhindert Self-Drop und Descendant-Drop

**CodeModifier** - Source-Manipulation
- `addChild()` - Fügt Kind zu Parent hinzu
- `addChildRelativeTo()` - Fügt Sibling hinzu
- `removeNode()` - Entfernt Node mit Children
- `moveNode()` - Verschiebt Node, passt Indent an

### Datenfluss (Palette → Canvas)

```
User zieht Component aus Palette
       ↓
dragstart: DragData = {componentName, properties, textContent}
       ↓
dragover: DropZoneCalculator.updateDropZone()
       ↓
Indikator wird angezeigt (Line oder Highlight)
       ↓
drop: CodeModifier.addChild() oder .addChildRelativeTo()
       ↓
Source wird aktualisiert, Preview neu gerendert
```

### Datenfluss (Canvas → Canvas) [FEHLT]

```
User klickt+zieht Element im Canvas
       ↓
dragstart: makeCanvasElementDraggable() setzt DragData mit isMove=true
       ↓
dragover: DropZoneCalculator prüft sourceNodeId für Self-Drop
       ↓
Indikator wird angezeigt (außer bei Self-Drop)
       ↓
drop: CodeModifier.moveNode()
       ↓
Source wird aktualisiert (Node entfernt + eingefügt + re-indented)
```

## Kritische Lücke

### Problem: Canvas-Elemente sind nicht draggable

**studio.html** macht nur Palette-Items draggable:

```javascript
// Zeile 8392: Palette Items
item.addEventListener('dragstart', (e) => {
  const dragData = {
    componentName: item.dataset.component,
    properties: item.dataset.props || '',
    textContent: item.dataset.text || ''
  }
  e.dataTransfer.setData('application/mirror-component', JSON.stringify(dragData))
})
```

**FEHLT:** Canvas-Elemente draggable machen:

```javascript
// Nach Preview-Render:
previewContainer.querySelectorAll('[data-mirror-id]').forEach(el => {
  Mirror.makeCanvasElementDraggable(
    el,
    el.dataset.mirrorId,
    studioDragDropManager
  )
})
```

## Implementation Tasks

### Task 1: Canvas-Elemente draggable machen

**Datei:** `studio.html`

Nach `compile()` die Preview-Elemente draggable machen:

```javascript
function makePreviewElementsDraggable() {
  const elements = previewContainer.querySelectorAll('[data-mirror-id]')
  elements.forEach(el => {
    // Nur nicht-Root Elemente
    if (el.parentElement !== previewContainer) {
      Mirror.makeCanvasElementDraggable(
        el,
        el.getAttribute('data-mirror-id'),
        studioDragDropManager
      )
    }
  })
}

// Nach compile() aufrufen
compile() {
  // ... existing code ...
  makePreviewElementsDraggable()
}
```

### Task 2: Drag-Handle UI (Optional)

Für bessere UX: Drag-Handle Icon bei Hover

```css
[data-mirror-id]:hover::before {
  content: '⋮⋮';
  position: absolute;
  left: -16px;
  cursor: grab;
  color: #666;
}

[data-mirror-id].dragging {
  opacity: 0.5;
}
```

### Task 3: Keyboard Modifier

Mit Shift für Copy statt Move:

```javascript
// In makeCanvasElementDraggable:
if (e.shiftKey) {
  dragData.isMove = false  // Copy statt Move
  e.dataTransfer.effectAllowed = 'copy'
}
```

## Test-Szenarien

### Szenario 1: Sibling Reorder

```mirror
Card
  Title "A"     // Drag nach unten
  Title "B"
  Title "C"

// Erwartet nach Drop von A nach C:
Card
  Title "B"
  Title "C"
  Title "A"
```

### Szenario 2: Move in Container

```mirror
Row
  Box "Left"    // Drag in Column
  Column
    Box "Top"

// Erwartet:
Row
  Column
    Box "Top"
    Box "Left"  // Jetzt in Column
```

### Szenario 3: Self-Drop Prevention

```mirror
Card
  Container     // Drag in Title (Child) → BLOCKIERT
    Title

// Kein Indikator, Drop nicht möglich
```

## UI Spezifikation (Webflow-Style)

### Drop-Linie

```
Farbe:     #3B82F6 (Blue 500)
Dicke:     2px
Dots:      6x6px an Enden
Transition: 100ms ease-out
```

### Inside-Highlight

```
Background: rgba(59, 130, 246, 0.08)
Outline:    2px solid #3B82F6
Offset:     -2px (inset)
Radius:     4px
```

### Drag-Element

```
Opacity:    0.5 während Drag
Cursor:     move (oder grab/grabbing)
```

## Prioritäten

### P0 - Kritisch
1. Canvas-Elemente draggable machen in studio.html
2. `makePreviewElementsDraggable()` nach compile() aufrufen

### P1 - Hoch
3. Drag-Handle UI bei Hover
4. Visual Feedback während Drag (opacity)

### P2 - Mittel
5. Shift+Drag für Copy statt Move
6. Undo-Support für Move-Operationen

### P3 - Niedrig
7. Multi-Select Drag (mehrere Elemente gleichzeitig)
8. Drag-Preview anpassen (nicht ganzes Element)
