# Canvas Drag & Drop - Implementation

## Übersicht

Dieses Dokument beschreibt die exakten Code-Änderungen um Canvas-Element-Verschiebung zu aktivieren.

## Änderungen in studio.html

### 1. Export bestätigen

Sicherstellen dass `makeCanvasElementDraggable` exportiert wird:

```javascript
// Diese Funktion muss aus Mirror.* verfügbar sein:
Mirror.makeCanvasElementDraggable(element, nodeId, dragDropManager)
```

**Status:** ✅ Bereits in `studio/index.ts` exportiert

### 2. Cleanup-Tracking hinzufügen

Vor den globalen Variablen (ca. Zeile 8200):

```javascript
// Drag cleanup functions für Canvas-Elemente
let canvasDragCleanups = []
```

### 3. makePreviewElementsDraggable Funktion

Nach `studioDragDropManager` Initialisierung (ca. Zeile 8335):

```javascript
/**
 * Macht alle Preview-Elemente draggable für Canvas-interne Verschiebung
 */
function makePreviewElementsDraggable() {
  // Cleanup vorherige Bindings
  canvasDragCleanups.forEach(cleanup => cleanup())
  canvasDragCleanups = []

  if (!studioDragDropManager) return

  // Finde alle Elemente mit data-mirror-id
  const elements = previewContainer.querySelectorAll('[data-mirror-id]')

  elements.forEach(el => {
    const nodeId = el.getAttribute('data-mirror-id')
    if (!nodeId) return

    // Root-Element nicht draggable machen
    const isRoot = el.parentElement === previewContainer ||
                   el.parentElement?.parentElement === previewContainer
    if (isRoot) return

    // Element draggable machen und cleanup speichern
    const cleanup = Mirror.makeCanvasElementDraggable(
      el,
      nodeId,
      studioDragDropManager
    )
    canvasDragCleanups.push(cleanup)
  })
}
```

### 4. Nach compile() aufrufen

In der `compile()` Funktion, am Ende nach erfolgreichem Render:

```javascript
async function compile() {
  // ... existing code ...

  try {
    // ... compilation ...

    // Render preview
    previewContainer.innerHTML = ''
    previewContainer.appendChild(dom)

    // NEU: Canvas-Elemente draggable machen
    makePreviewElementsDraggable()

    // ... rest of function ...
  } catch (e) {
    // ...
  }
}
```

### 5. Drop-Handler aktualisieren

Im `onDrop` Callback des DragDropManager (ca. Zeile 8326):

```javascript
studioDragDropManager = new Mirror.DragDropManager(previewContainer, {
  onDrop: async (result) => {
    if (result.success && result.modification) {
      // Source-Code aktualisieren
      const newSource = result.modification.newSource
      editor.dispatch({
        changes: {
          from: 0,
          to: editor.state.doc.length,
          insert: newSource
        }
      })

      // Re-compile und Preview aktualisieren
      await compile()

      // Status aktualisieren
      if (status) {
        status.textContent = result.modification.isMove
          ? 'Element verschoben'
          : 'Element hinzugefügt'
        status.className = 'status success'
      }
    } else if (result.error) {
      console.error('Drop failed:', result.error)
      if (status) {
        status.textContent = result.error
        status.className = 'status error'
      }
    }
  },
  onDragEnter: () => {
    previewContainer.classList.add('drop-target')
  },
  onDragLeave: () => {
    previewContainer.classList.remove('drop-target')
  }
})
```

### 6. CSS für Drag-Feedback

Im `<style>` Block hinzufügen:

```css
/* Canvas-Element Drag Feedback */
[data-mirror-id] {
  cursor: default;
}

[data-mirror-id]:not([data-mirror-root]) {
  cursor: grab;
}

[data-mirror-id]:not([data-mirror-root]):active {
  cursor: grabbing;
}

/* Drag-in-Progress */
.preview-container.dragging [data-mirror-id] {
  pointer-events: none;
}

/* Drop-Target Highlight */
.preview-container.drop-target {
  outline: 2px dashed #3B82F6;
  outline-offset: -2px;
}
```

## Vollständiges Code-Diff

### studio.html Änderungen

```diff
@@ -8200,6 +8200,9 @@ let studioDragDropManager = null
+// Drag cleanup functions für Canvas-Elemente
+let canvasDragCleanups = []
+
 @@ -8335,6 +8338,35 @@ studioDragDropManager.setCodeModifier(source, sourceMap)
+
+/**
+ * Macht alle Preview-Elemente draggable für Canvas-interne Verschiebung
+ */
+function makePreviewElementsDraggable() {
+  // Cleanup vorherige Bindings
+  canvasDragCleanups.forEach(cleanup => cleanup())
+  canvasDragCleanups = []
+
+  if (!studioDragDropManager) return
+
+  const elements = previewContainer.querySelectorAll('[data-mirror-id]')
+
+  elements.forEach(el => {
+    const nodeId = el.getAttribute('data-mirror-id')
+    if (!nodeId) return
+
+    // Root-Element nicht draggable machen
+    const isRoot = el.parentElement === previewContainer
+    if (isRoot) return
+
+    const cleanup = Mirror.makeCanvasElementDraggable(
+      el,
+      nodeId,
+      studioDragDropManager
+    )
+    canvasDragCleanups.push(cleanup)
+  })
+}

@@ in compile() after previewContainer.appendChild(dom):
+    // Canvas-Elemente draggable machen
+    makePreviewElementsDraggable()
```

## Verifikation

Nach Implementation:

1. Studio öffnen (`studio.html`)
2. Mirror-Code eingeben:
   ```
   Card w 200, pad 16
     Title "Eins"
     Title "Zwei"
     Title "Drei"
   ```
3. Auf "Zwei" klicken und nach unten ziehen
4. Blaue Linie sollte unter "Drei" erscheinen
5. Loslassen → "Zwei" sollte unter "Drei" sein
6. Code sollte aktualisiert sein

## Edge Cases

| Fall | Erwartetes Verhalten |
|------|---------------------|
| Self-Drop | Kein Indikator, Drop blockiert |
| Drop in Child | Kein Indikator, Drop blockiert |
| Drop in Sibling | Blauer Indikator, Move funktioniert |
| Drop in Container | Blaues Highlight, Move als Child |
| Root-Element | Nicht draggable |
