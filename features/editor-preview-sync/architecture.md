# Editor-Preview-Sync Architektur

## Performance-First Design

### Grundprinzip

Der Code-Editor ist das primäre Werkzeug. **Keine Sync-Operation darf die Eingabe-Latenz beeinflussen.**

```
User tippt → Editor reagiert SOFORT
                    ↓
          (nach 200ms Ruhe)
                    ↓
         Sync wird ausgeführt
```

### Kritische Performance-Regeln

| Regel | Begründung |
|-------|------------|
| **Kein Sync bei docChanged** | Während Tippen keine CPU für Sync verschwenden |
| **Nur bei selectionChanged** | Sync nur bei Cursor-Bewegung ohne Textänderung |
| **Debounce 200ms** | Warten bis Cursor "ruht" |
| **requestIdleCallback** | Sync in Browser-Leerlaufzeit |
| **Abbruch bei neuem Event** | Veraltete Syncs canceln |

---

## Architektur

### Komponenten-Übersicht

```
┌─────────────────────────────────────────────────────────────────┐
│                         Code Editor                              │
│                        (CodeMirror)                              │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               │ EditorView.updateListener
                               │ (nur selectionChanged, NICHT docChanged)
                               │
                               ▼
                    ┌──────────────────────┐
                    │  EditorSyncManager   │  ◄── NEUE KOMPONENTE
                    │                      │
                    │  - debounce 200ms    │
                    │  - cancelable        │
                    │  - idle callback     │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
     ┌─────────────┐  ┌──────────────┐  ┌─────────────┐
     │  SourceMap  │  │  Selection   │  │   Editor    │
     │             │  │   Manager    │  │  Highlight  │
     │getNodeAtLine│  │   .select()  │  │  .reveal()  │
     └─────────────┘  └──────────────┘  └─────────────┘
```

---

## Neue Komponenten

### 1. EditorSyncManager (Neue Klasse)

```typescript
// src/studio/editor-sync-manager.ts

interface EditorSyncManagerOptions {
  debounceMs: number        // Default: 200
  useIdleCallback: boolean  // Default: true
}

class EditorSyncManager {
  private pendingSync: number | null = null
  private lastLine: number = -1

  constructor(
    private sourceMap: SourceMap,
    private selectionManager: SelectionManager,
    private options: EditorSyncManagerOptions
  ) {}

  /**
   * Called by EditorView.updateListener
   * ONLY when selection changed WITHOUT doc change
   */
  onCursorMove(line: number): void {
    // Same line? Skip
    if (line === this.lastLine) return
    this.lastLine = line

    // Cancel pending sync
    this.cancelPending()

    // Schedule new sync (debounced)
    this.pendingSync = window.setTimeout(() => {
      this.executeSync(line)
    }, this.options.debounceMs)
  }

  /**
   * Execute sync in idle time
   */
  private executeSync(line: number): void {
    if (this.options.useIdleCallback && 'requestIdleCallback' in window) {
      requestIdleCallback(() => this.syncToLine(line), { timeout: 100 })
    } else {
      this.syncToLine(line)
    }
  }

  /**
   * Actual sync logic
   */
  private syncToLine(line: number): void {
    const node = this.sourceMap.getNodeAtLine(line)
    if (node) {
      this.selectionManager.select(node.nodeId)
    }
  }

  private cancelPending(): void {
    if (this.pendingSync) {
      clearTimeout(this.pendingSync)
      this.pendingSync = null
    }
  }

  dispose(): void {
    this.cancelPending()
  }
}
```

### 2. SourceMap Erweiterung

```typescript
// src/studio/source-map.ts - NEUE METHODE

/**
 * Find the node that contains a specific line
 * Returns the most specific (deepest) node at that line
 */
getNodeAtLine(line: number): NodeMapping | null {
  let bestMatch: NodeMapping | null = null
  let bestSpecificity = -1

  for (const node of this.nodes.values()) {
    const startLine = node.position.line
    const endLine = node.position.endLine

    if (line >= startLine && line <= endLine) {
      // Prefer more specific (smaller range) matches
      const specificity = endLine - startLine
      if (bestMatch === null || specificity < bestSpecificity) {
        bestMatch = node
        bestSpecificity = specificity
      }
    }
  }

  return bestMatch
}
```

### 3. Editor Integration (app.js Änderung)

```javascript
// studio/app.js - NEUER updateListener

// Separater Listener NUR für Cursor-Bewegung (nicht Doc-Änderung)
EditorView.updateListener.of(update => {
  // KRITISCH: Nur bei Selection-Änderung OHNE Doc-Änderung
  if (update.selectionSet && !update.docChanged) {
    const line = update.state.doc.lineAt(
      update.state.selection.main.head
    ).number

    editorSyncManager.onCursorMove(line)
  }
})
```

---

## Reverse-Sync: Preview → Editor

### Ansatz

Bei Klick in Preview → Editor zur Zeile scrollen

```typescript
// In app.js nach SelectionManager Setup

selectionManager.subscribe((nodeId, previousNodeId) => {
  if (!nodeId) return

  // Nur wenn Selection von Preview kam (nicht von Editor)
  if (syncOrigin !== 'editor') {
    const node = sourceMap.getNodeById(nodeId)
    if (node) {
      scrollEditorToLine(node.position.line)
    }
  }
})

function scrollEditorToLine(line: number): void {
  const pos = editor.state.doc.line(line).from
  editor.dispatch({
    effects: EditorView.scrollIntoView(pos, { y: 'center' })
  })
}
```

### Sync-Origin Tracking

Um Endlosschleifen zu vermeiden:

```typescript
type SyncOrigin = 'editor' | 'preview' | 'property-panel' | null

let currentSyncOrigin: SyncOrigin = null

// Editor → Preview
editorSyncManager.onCursorMove = (line) => {
  currentSyncOrigin = 'editor'
  // ... sync logic
  requestAnimationFrame(() => currentSyncOrigin = null)
}

// Preview → Editor
selectionManager.subscribe((nodeId) => {
  if (currentSyncOrigin === 'editor') return // Skip reverse sync
  // ... scroll to line
})
```

---

## Performance-Metriken

### Ziel-Werte

| Metrik | Ziel | Messmethode |
|--------|------|-------------|
| Keystroke Latenz | < 16ms (60fps) | Performance.now() |
| Sync Delay | 200-250ms nach Cursor-Ruhe | Debounce Timer |
| SourceMap Lookup | < 1ms | Performance.now() |
| DOM Update | < 5ms | RAF callback |

### Monitoring (Development)

```javascript
// Optional: Performance logging
const PERF_LOG = false

function measureSync(fn, label) {
  if (!PERF_LOG) return fn()
  const start = performance.now()
  const result = fn()
  console.log(`[Sync] ${label}: ${(performance.now() - start).toFixed(2)}ms`)
  return result
}
```

---

## Implementierungsreihenfolge

### Phase 1: Grundlagen (Editor → Preview)
1. `SourceMap.getNodeAtLine()` implementieren
2. `EditorSyncManager` Klasse erstellen
3. EditorView.updateListener hinzufügen (nur selectionSet)
4. Testen: Cursor bewegen → Preview Selection

### Phase 2: Reverse (Preview → Editor)
1. Sync-Origin Tracking einbauen
2. `scrollEditorToLine()` implementieren
3. SelectionManager Subscriber für Editor-Scroll
4. Testen: Preview klicken → Editor scrollt

### Phase 3: Polish
1. Zeilen-Highlight im Editor (optional)
2. Breadcrumb-Klick → Editor springt
3. Performance-Tests
4. Edge Cases (Template-Instanzen, Conditionals)

---

## Risiken & Mitigationen

| Risiko | Mitigation |
|--------|------------|
| Endlosschleife Editor↔Preview | Sync-Origin Tracking |
| Lag bei großen Dateien | Debounce + Idle Callback |
| Stale SourceMap nach Edit | SourceMap wird bei jedem Compile aktualisiert |
| Template-Instanzen [0], [1] | SourceMap.getTemplateId() nutzen |
