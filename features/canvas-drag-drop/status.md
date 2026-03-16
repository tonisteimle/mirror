# Canvas Drag & Drop - Status Overview

> Zuletzt aktualisiert: 2026-03-07

## Quick Status

| Aspekt | Status | Details |
|--------|--------|---------|
| **Palette → Canvas** | ✅ Funktioniert | Component Library Items können gezogen werden |
| **Canvas → Canvas** | ✅ Implementiert | Elemente können innerhalb Canvas verschoben werden |
| **Drop-Indikatoren** | ✅ Implementiert | Webflow-Style Linien + Highlight |
| **Self-Drop Prevention** | ✅ Implementiert | Kann nicht auf sich selbst droppen |
| **Code-Modifikation** | ✅ Implementiert | moveNode(), removeNode() fertig |
| **Event Bubbling** | ✅ Behoben | stopPropagation() verhindert Parent-Drag |
| **Drag Preview** | ✅ Webflow-Style | Transparentes Drag-Image, nur Linie sichtbar |

## Was funktioniert

```
✅ Drag aus Component Palette in Canvas
✅ Drag von Canvas-Elementen zum Umordnen
✅ Drop-Indikatoren (blaue Linie mit Dots)
✅ Layout-Erkennung (horizontal vs vertical)
✅ Inside-Highlight für Container
✅ CodeModifier.addChild()
✅ CodeModifier.addChildRelativeTo()
✅ CodeModifier.removeNode()
✅ CodeModifier.moveNode()
✅ makeCanvasElementDraggable() Helper
✅ makePreviewElementsDraggable() Integration
✅ Self-Drop und Descendant-Drop Prevention
✅ Event stopPropagation() - nur einzelnes Element wird gezogen
✅ Transparentes Drag-Image (Webflow-Style)
✅ Drag-Feedback: Element wird halbtransparent + gestrichelter Rahmen
```

## Was noch fehlt (optional)

```
⬜ Drag-Handle UI (kleines Icon bei Hover)
⬜ Shift+Drag für Copy statt Move
⬜ Multi-Select Drag
```

## Implementierte Änderungen

### studio.html

1. **canvasDragCleanups** Variable hinzugefügt (Zeile 8044)
2. **makePreviewElementsDraggable()** Funktion hinzugefügt (Zeilen 8175-8206)
3. Aufruf in **updateStudio()** nach DragDropManager Setup (Zeile 8172)

### code-modifier.ts

1. **removeNode()** - Entfernt Node mit allen Children
2. **moveNode()** - Verschiebt Node mit Re-Indentation
3. **isDescendantOf()** - Verhindert ungültige Moves
4. **reindentBlock()** - Passt Indentation beim Move an

### drop-zone-calculator.ts

1. **calculateFromPoint()** - Akzeptiert sourceNodeId für Self-Drop Prevention
2. **updateDropZone()** - Gibt sourceNodeId weiter
3. **isDescendantOf()** - Prüft Descendant-Verhältnis

### drag-drop-manager.ts

1. **DragData** erweitert um sourceNodeId, isMove
2. **makeCanvasElementDraggable()** Helper-Funktion
3. **setDragSource()** für Self-Drop Prevention

## Tests

| Test Suite | Status | Tests |
|------------|--------|-------|
| code-modifier.test.ts | ✅ Passed | 21/21 (inkl. 8 neue Tests) |

## Verwendung

1. Studio öffnen (`studio.html`)
2. Code eingeben:
   ```
   Card pad 16
     Title "Eins"
     Title "Zwei"
     Title "Drei"
   ```
3. Ein Element (z.B. "Zwei") anklicken und ziehen
4. Blaue Linie zeigt Drop-Position
5. Loslassen → Element wird verschoben

## Dateien

- `requirements.md` - Vollständige Anforderungen und Architektur
- `implementation.md` - Detaillierte Code-Änderungen
- `status.md` - Diese Datei (Quick Overview)
