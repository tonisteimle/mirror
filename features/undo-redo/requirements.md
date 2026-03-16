# Undo / Redo

## Übersicht

Vollständige Undo/Redo-Funktionalität für alle Änderungen im Mirror Studio, nicht nur für direkte Editor-Eingaben.

## Feature-Status

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Editor-Eingaben | ✅ Fertig | CodeMirror's history() bereits aktiv |
| Property Panel Änderungen | ✅ Fertig | Cmd+Z funktioniert |
| Canvas Drag & Drop | ✅ Fertig | Cmd+Z funktioniert |
| Color Picker | ✅ Fertig | Cmd+Z funktioniert |
| Token Picker | ✅ Fertig | Cmd+Z funktioniert |
| Icon Picker | ✅ Fertig | Cmd+Z funktioniert |
| Image Upload | ✅ Fertig | Cmd+Z funktioniert |
| AI Code Generation | ✅ Fertig | Cmd+Z funktioniert |
| Delete-Aktionen | ✅ Fertig | Element mit Delete/Backspace löschen + Undo |
| Gruppierte Änderungen | ⬜ Offen | Zusammengehörige Änderungen als Einheit |
| Redo | ✅ Fertig | Cmd+Shift+Z für alle Änderungen |

## Problem-Analyse

### Was funktioniert

CodeMirror's `history()` Extension ist aktiviert (app.js:4157):
- Direkte Texteingaben im Editor
- Cmd+Z / Cmd+Shift+Z Shortcuts

### Was NICHT funktioniert

Property Panel und Drag-Drop Änderungen umgehen das History-System:

```
Property Panel Änderung
  ↓
CodeModifier.updateProperty() → CodeChange
  ↓
handleStudioCodeChange()
  ↓
editor.dispatch({ changes, annotations })  ← Keine History!
  ↓
Cmd+Z macht nichts
```

**Ursache:** `editor.dispatch()` wird direkt aufgerufen ohne History-Integration.

## Lösung

### Konzept

Alle programmatischen Änderungen (Property Panel, Drag-Drop, Delete) müssen als "User Actions" an CodeMirror übergeben werden, damit die History sie trackt.

### CodeMirror History Integration

```javascript
import { history, historyField } from '@codemirror/commands'

// Option 1: userEvent Annotation (empfohlen)
editor.dispatch({
  changes: adjustedChange,
  annotations: Transaction.userEvent.of('input.property-panel')
})

// Option 2: addToHistory Annotation
editor.dispatch({
  changes: adjustedChange,
  annotations: Transaction.addToHistory.of(true)
})
```

Die `userEvent` Annotation signalisiert CodeMirror, dass dies eine Benutzer-Aktion ist und in die History gehört.

## Implementierung

### Phase 1: Grundlegende History-Integration

**Datei: `studio/app.js`**

#### 1.1 Import erweitern

```javascript
import { Transaction } from '@codemirror/state'
```

#### 1.2 handleStudioCodeChange() anpassen

```javascript
function handleStudioCodeChange(result) {
  if (!result.success) {
    console.warn('Studio: Code modification failed:', result.error)
    return
  }

  const adjustedChange = {
    from: result.change.from - currentPreludeOffset,
    to: result.change.to - currentPreludeOffset,
    insert: result.change.insert
  }

  // Validate range
  const docLength = editor.state.doc.length
  if (adjustedChange.from < 0 || adjustedChange.to > docLength) {
    console.warn('Studio: Invalid change range')
    debouncedCompile.cancel()
    compile(editor.state.doc.toString())
    return
  }

  // Mit History-Integration dispatchen
  editor.dispatch({
    changes: adjustedChange,
    annotations: [
      propertyPanelChangeAnnotation.of(true),
      Transaction.userEvent.of('input.property-panel')  // NEU
    ]
  })

  compile(editor.state.doc.toString())
  debouncedSave(code)
}
```

#### 1.3 handleStudioDrop() anpassen

```javascript
function handleStudioDrop(result) {
  if (!result.success) return

  const adjustedChange = {
    from: result.modification.change.from - currentPreludeOffset,
    to: result.modification.change.to - currentPreludeOffset,
    insert: result.modification.change.insert
  }

  editor.dispatch({
    changes: adjustedChange,
    annotations: Transaction.userEvent.of('input.drag-drop')  // NEU
  })

  compile(editor.state.doc.toString())
}
```

#### 1.4 Element-Löschung (Delete-Action)

```javascript
function handleElementDelete(nodeId) {
  const result = studioCodeModifier.removeNode(nodeId)
  if (!result.success) return

  const adjustedChange = {
    from: result.change.from - currentPreludeOffset,
    to: result.change.to - currentPreludeOffset,
    insert: result.change.insert
  }

  editor.dispatch({
    changes: adjustedChange,
    annotations: Transaction.userEvent.of('delete.element')  // NEU
  })

  compile(editor.state.doc.toString())
}
```

### Phase 2: Gruppierte Änderungen

Mehrere zusammengehörige Änderungen (z.B. Drag-Drop mit Indentation-Fix) als eine Undo-Einheit:

```javascript
// Beispiel: Mehrere Änderungen gruppiert
editor.dispatch(
  editor.state.update({
    changes: [change1, change2, change3],
    annotations: Transaction.userEvent.of('input.grouped-action')
  })
)
```

### Phase 3: Undo/Redo UI (optional)

Toolbar-Buttons für Undo/Redo:

```html
<div class="toolbar">
  <button id="undo-btn" title="Undo (Cmd+Z)">↶</button>
  <button id="redo-btn" title="Redo (Cmd+Shift+Z)">↷</button>
</div>
```

```javascript
import { undo, redo } from '@codemirror/commands'

document.getElementById('undo-btn').onclick = () => undo(editor)
document.getElementById('redo-btn').onclick = () => redo(editor)

// Button-States aktualisieren
function updateUndoRedoButtons() {
  const canUndo = editor.state.field(historyField).done.length > 0
  const canRedo = editor.state.field(historyField).undone.length > 0

  document.getElementById('undo-btn').disabled = !canUndo
  document.getElementById('redo-btn').disabled = !canRedo
}
```

## Betroffene Dateien

| Datei | Änderungen |
|-------|------------|
| `studio/app.js` | History-Annotations zu dispatch() hinzufügen |
| `src/studio/property-panel.ts` | Keine Änderungen (nutzt handleStudioCodeChange) |
| `src/studio/drag-drop-manager.ts` | Keine Änderungen (nutzt handleStudioDrop) |

## Keyboard Shortcuts

| Shortcut | Aktion | Status |
|----------|--------|--------|
| Cmd+Z | Undo | ✅ Besteht (Editor) |
| Cmd+Shift+Z | Redo | ✅ Besteht (Editor) |
| Ctrl+Z | Undo (Windows) | ✅ Besteht |
| Ctrl+Y | Redo (Windows) | ✅ Besteht |

Die Shortcuts funktionieren bereits - es muss nur sichergestellt werden, dass alle Änderungen in der History landen.

## User Events

Verschiedene `userEvent` Types für besseres Debugging:

| Event | Beschreibung |
|-------|--------------|
| `input.property-panel` | Property Panel Änderung |
| `input.drag-drop` | Element per Drag & Drop bewegt |
| `input.color-picker` | Farbe über Color Picker gewählt |
| `delete.element` | Element gelöscht |
| `delete.property` | Property entfernt |

## Testing

### Manuelle Tests

1. **Property Panel Undo**
   - Element auswählen
   - Background-Farbe ändern
   - Cmd+Z drücken
   - → Alte Farbe sollte zurückkommen

2. **Drag & Drop Undo**
   - Element in Canvas verschieben
   - Cmd+Z drücken
   - → Element sollte zur alten Position zurück

3. **Delete Undo**
   - Element auswählen
   - Delete drücken
   - Cmd+Z drücken
   - → Element sollte wieder erscheinen

4. **Redo nach Undo**
   - Änderung machen
   - Cmd+Z (Undo)
   - Cmd+Shift+Z (Redo)
   - → Änderung sollte wieder da sein

5. **Gemischte History**
   - Text im Editor tippen
   - Property im Panel ändern
   - Element draggen
   - Cmd+Z mehrmals
   - → Alle Aktionen rückwärts

### Unit Tests

```typescript
describe('Undo/Redo', () => {
  it('undoes property panel changes', () => {
    // Setup editor with initial content
    // Apply property change via handleStudioCodeChange
    // Call undo command
    // Verify content is restored
  })

  it('undoes drag-drop changes', () => {
    // Similar test for drag-drop
  })

  it('groups related changes', () => {
    // Apply grouped changes
    // Single undo should revert all
  })
})
```

## Risiken & Fallbacks

| Risiko | Mitigation |
|--------|------------|
| History wird zu groß | CodeMirror limitiert automatisch |
| Undo bricht Kompilierung | compile() nach jedem Undo aufrufen |
| Selection geht verloren | SelectionManager nach Undo aktualisieren |

## Rollout

1. **Phase 1** (Quick Win): `userEvent` Annotations hinzufügen
2. **Phase 2**: Gruppierte Änderungen implementieren
3. **Phase 3**: Optional UI-Buttons

## Aufwand

| Phase | Geschätzter Aufwand |
|-------|---------------------|
| Phase 1 | ~1 Stunde |
| Phase 2 | ~2 Stunden |
| Phase 3 | ~1 Stunde |

## Referenzen

- [CodeMirror History Extension](https://codemirror.net/docs/ref/#commands.history)
- [CodeMirror Transactions](https://codemirror.net/docs/ref/#state.Transaction)
- [userEvent Annotation](https://codemirror.net/docs/ref/#state.Transaction%5EuserEvent)
