# Undo/Redo - Lösung

## Quick Fix (Phase 1)

Die einfachste Lösung: `Transaction.userEvent` Annotation zu allen programmatischen Änderungen hinzufügen.

### Änderungen in `studio/app.js`

#### 1. Import hinzufügen

Am Anfang der Datei, bei den anderen CodeMirror Imports:

```javascript
// Bereits vorhanden:
import { EditorState, StateField, StateEffect, Annotation } from '@codemirror/state'

// Erweitern um:
import { EditorState, StateField, StateEffect, Annotation, Transaction } from '@codemirror/state'
```

#### 2. handleStudioCodeChange() anpassen

Suche nach `function handleStudioCodeChange` und ersetze:

```javascript
// ALT:
editor.dispatch({
  changes: adjustedChange,
  annotations: [propertyPanelChangeAnnotation.of(true)]
})

// NEU:
editor.dispatch({
  changes: adjustedChange,
  annotations: [
    propertyPanelChangeAnnotation.of(true),
    Transaction.userEvent.of('input.property')
  ]
})
```

#### 3. handleStudioDrop() anpassen (falls vorhanden)

Suche nach Drag-Drop dispatch und füge hinzu:

```javascript
// ALT:
editor.dispatch({
  changes: result.modification.change
})

// NEU:
editor.dispatch({
  changes: adjustedChange,
  annotations: Transaction.userEvent.of('input.drop')
})
```

#### 4. Element-Löschung anpassen (falls vorhanden)

Suche nach Code der `removeNode` aufruft:

```javascript
// Bei jedem dispatch für Löschungen:
editor.dispatch({
  changes: adjustedChange,
  annotations: Transaction.userEvent.of('delete')
})
```

## Vollständige handleStudioCodeChange Funktion

```javascript
/**
 * Handle code changes from property panel
 */
function handleStudioCodeChange(result) {
  if (!result.success) {
    console.warn('Studio: Code modification failed:', result.error)
    return
  }

  // Adjust change positions for prelude offset
  const adjustedChange = {
    from: result.change.from - currentPreludeOffset,
    to: result.change.to - currentPreludeOffset,
    insert: result.change.insert
  }

  // Validate adjusted change range
  const docLength = editor.state.doc.length
  if (adjustedChange.from < 0 || adjustedChange.to > docLength || adjustedChange.from > adjustedChange.to) {
    console.warn('Studio: Invalid change range after adjustment', {
      original: result.change,
      adjusted: adjustedChange,
      preludeOffset: currentPreludeOffset,
      docLength
    })
    debouncedCompile.cancel()
    compile(editor.state.doc.toString())
    return
  }

  // Apply the change with history integration
  editor.dispatch({
    changes: adjustedChange,
    annotations: [
      propertyPanelChangeAnnotation.of(true),
      Transaction.userEvent.of('input.property')  // Enables Cmd+Z
    ]
  })

  // Compile immediately
  const code = editor.state.doc.toString()
  compile(code)
  debouncedSave(code)
}
```

## Verifizierung

Nach der Änderung testen:

1. Studio öffnen
2. Element auswählen
3. Background-Farbe im Property Panel ändern
4. Cmd+Z drücken
5. → Farbe sollte zurückspringen

## Falls Import nicht funktioniert

Falls `Transaction` nicht importiert werden kann (ältere CodeMirror Version):

```javascript
// Alternative: addToHistory verwenden
import { Annotation } from '@codemirror/state'

// In der dispatch-Stelle:
editor.dispatch({
  changes: adjustedChange,
  annotations: [
    propertyPanelChangeAnnotation.of(true),
    Annotation.define().of(true)  // Fallback
  ],
  // Explizit zur History hinzufügen
  effects: []
})
```

Oder direkt auf die Transaction-Klasse zugreifen:

```javascript
// Wenn Transaction nicht exportiert ist:
const { Transaction } = CM || window.CM || {}
if (Transaction?.userEvent) {
  // userEvent verwenden
}
```

## Debugging

Falls Undo nicht funktioniert, prüfen:

```javascript
// History-Status loggen
console.log('History state:', {
  doneLength: editor.state.field(historyField)?.done?.length,
  undoneLength: editor.state.field(historyField)?.undone?.length
})
```

## Zusammenfassung

**Minimale Änderung:** Eine Zeile pro dispatch() Aufruf:

```javascript
annotations: Transaction.userEvent.of('input.property')
```

Das reicht aus, damit CodeMirror die Änderung in die History aufnimmt und Cmd+Z/Cmd+Shift+Z funktioniert.
