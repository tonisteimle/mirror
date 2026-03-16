# Sync-Architektur Review: Editor ↔ Preview ↔ Property Panel

## Executive Summary

Die aktuelle Architektur besteht aus zwei parallel laufenden Systemen:
1. **Neue Architektur** (`studio/`) - TypeScript-Module mit klarer Trennung
2. **Legacy Architektur** (`app.js`) - Monolithische JavaScript-Implementierung

**Kritisches Problem:** Wenn man im Preview ein Element anklickt, scrollt der Editor zur richtigen Zeile, aber der **Cursor wird nicht gesetzt**. Der Code wird also **nicht korrekt synchronisiert**.

---

## Aktuelle Architektur

### Datenfluss-Diagramm

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            USER INTERACTION                              │
└─────────────────────────────────────────────────────────────────────────┘
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│     EDITOR      │      │     PREVIEW     │      │  PROPERTY PANEL │
│  (CodeMirror)   │      │   (DOM Output)  │      │   (Properties)  │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│EditorController │      │PreviewController│      │SelectionManager │
│   (studio/)     │      │   (studio/)     │      │   (src/studio)  │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                        │                        │
         └────────────────┬───────┴────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   SyncCoordinator     │   ← Zentrale Koordination
              │     (studio/sync/)    │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │      SourceMap        │   ← Node ↔ Position Mapping
              │   (src/studio/)       │
              └───────────────────────┘
```

### Komponenten-Übersicht

| Komponente | Pfad | Verantwortung |
|------------|------|---------------|
| `SyncCoordinator` | `studio/sync/sync-coordinator.ts` | Orchestriert alle Sync-Operationen |
| `PreviewController` | `studio/preview/index.ts` | Click/Hover Detection im Preview |
| `EditorController` | `studio/editor/index.ts` | CodeMirror Wrapper |
| `SelectionManager` | `src/studio/selection-manager.ts` | Selection State Management |
| `SourceMap` | `src/studio/source-map.ts` | AST ↔ Source Code Mapping |
| `app.js` | `studio/app.js` | Legacy Integration Layer |

---

## Identifizierte Probleme

### 1. **Code-Sync beim Preview-Klick fehlt** ⚠️ KRITISCH

**Symptom:** Wenn man im Preview ein Element anklickt, scrollt der Editor zur Zeile, aber der Cursor steht nicht dort.

**Ursache:** In `bootstrap.ts` Zeile 69:
```typescript
scrollEditorToLine: (line) => editorController.scrollToLine(line, true),
```

Die Methode `scrollToLine()` scrollt nur, setzt aber **nicht den Cursor**.

**Vergleich mit app.js** (funktioniert korrekt):
```javascript
// studio/app.js Zeile 5814-5838
function scrollEditorToLine(line) {
  const editorHasFocus = editor.hasFocus
  if (editorHasFocus) {
    // Nur scrollen, Cursor nicht ändern
    editor.dispatch({
      effects: EditorView.scrollIntoView(lineInfo.from, { y: 'center' })
    })
  } else {
    // Scrollen UND Cursor setzen (Preview-Klick)
    editor.dispatch({
      effects: EditorView.scrollIntoView(lineInfo.from, { y: 'center' }),
      selection: { anchor: lineInfo.from }  // ← FEHLT im SyncCoordinator
    })
  }
}
```

### 2. **Duale Architektur** ⚠️ TECHNISCHE SCHULDEN

Zwei parallel laufende Systeme:

| Aspekt | Neue Architektur | Legacy |
|--------|------------------|--------|
| Selection | `SyncCoordinator` | `SelectionManager` |
| Editor Scroll | `EditorController.scrollToLine()` | `scrollEditorToLine()` |
| Events | `events.emit()` | Callbacks |
| State | `state.get()` | Globale Variablen |

**Problem:** Die neue Architektur nutzt nicht die komplette Funktionalität der app.js.

### 3. **SelectionManager wird zweimal verwendet**

```javascript
// app.js Zeile 6138-6151
// Forward: Old → New
studioSelectionManager.subscribe((nodeId) => {
  newHandleSelectionChange(nodeId, 'preview')
})

// Reverse: New → Old
events.on('selection:changed', ({ nodeId, origin }) => {
  if (origin === 'preview' && studioSelectionManager) {
    studioSelectionManager.select(nodeId)
  }
})
```

Dies führt zu unnötiger Komplexität und potentiellen Loop-Problemen.

### 4. **EditorController.scrollToLineAndSelect() existiert, wird aber nicht genutzt**

```typescript
// studio/editor/index.ts Zeile 64-71
scrollToLineAndSelect(lineNumber: number): void {
  const lineInfo = this.editorView.state.doc.line(lineNumber)
  const effect = EditorView.scrollIntoView(lineInfo.from, { y: 'center' })
  this.editorView.dispatch({
    effects: effect,
    selection: { anchor: lineInfo.from }  // ← Setzt Cursor!
  })
}
```

Diese Methode existiert bereits, wird aber im `SyncCoordinator` nicht verwendet!

---

## Lösungsvorschläge

### Option A: Minimal-Fix (Empfohlen für schnelle Lösung)

**Änderung in `bootstrap.ts`:**

```typescript
// VORHER
scrollEditorToLine: (line) => editorController.scrollToLine(line, true),

// NACHHER
scrollEditorToLine: (line) => {
  if (state.get().editorHasFocus) {
    editorController.scrollToLine(line, true)
  } else {
    editorController.scrollToLineAndSelect(line)
  }
},
```

**Aufwand:** 5 Zeilen Code
**Risiko:** Niedrig
**Ergebnis:** Code wird beim Preview-Klick synchronisiert

---

### Option B: SyncCoordinator erweitern

**Erweitere `SyncTargets` Interface:**

```typescript
export interface SyncTargets {
  scrollEditorToLine?: (line: number) => void
  scrollEditorToLineAndSelect?: (line: number) => void  // NEU
  highlightPreviewElement?: (nodeId: string | null) => void
  updatePropertyPanel?: (nodeId: string | null) => void
}
```

**Anpassung in `handleSelectionChange`:**

```typescript
handleSelectionChange(nodeId: string | null, origin: SelectionOrigin): void {
  // ...
  if (node && origin !== 'editor') {
    // Bei Preview-Klick: Cursor setzen
    if (origin === 'preview') {
      this.targets.scrollEditorToLineAndSelect?.(node.position.line)
    } else {
      this.targets.scrollEditorToLine?.(node.position.line)
    }
  }
  // ...
}
```

**Aufwand:** 15-20 Zeilen Code
**Risiko:** Niedrig
**Ergebnis:** Saubere Trennung der Verantwortlichkeiten

---

### Option C: Vollständige Migration (Mittelfristig empfohlen)

**Ziel:** Legacy-Code aus `app.js` in neue Architektur migrieren

#### Phase 1: Selection-System konsolidieren
1. `SelectionManager` in neue Architektur integrieren
2. Legacy-Adapter in `app.js` entfernen
3. Alle Selection-Events über `SyncCoordinator` leiten

#### Phase 2: Editor-Integration verbessern
1. `EditorController` mit vollständiger Focus-Awareness
2. Cursor-Position als Teil des State
3. Bidirektionale Sync ohne Adapter

#### Phase 3: app.js ausdünnen
1. Property Panel auf neue Architektur migrieren (bereits mit PropertyPanelV2)
2. Compile-Loop in `studio/core/` verschieben
3. File-Management extrahieren

**Aufwand:** 2-3 Tage
**Risiko:** Mittel
**Ergebnis:** Wartbare, einheitliche Architektur

---

## Empfohlene Architektur (Zielzustand)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              State Store                                 │
│  { source, selection, cursor, editorFocus, sourceMap, ... }           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
         ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
         │   Editor     │  │   Preview    │  │   Property   │
         │  Controller  │  │  Controller  │  │    Panel     │
         └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
                │                 │                 │
                └─────────────────┼─────────────────┘
                                  │
                                  ▼
                      ┌───────────────────────┐
                      │   SyncCoordinator     │
                      │  (single source of    │
                      │       truth)          │
                      └───────────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
    │ Editor Actions  │  │ Preview Actions │  │ Panel Actions   │
    │ - scroll        │  │ - highlight     │  │ - update        │
    │ - select line   │  │ - select node   │  │ - render        │
    │ - set cursor    │  │ - hover         │  │                 │
    └─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Prinzipien der Zielarchitektur

1. **Single Source of Truth:** Alle State-Änderungen durch zentralen Store
2. **Unidirektionaler Datenfluss:** Actions → State → Render
3. **Loop-Prevention:** Origin-Tracking verhindert Endlosschleifen
4. **Separation of Concerns:** Jede Komponente hat eine klare Verantwortung
5. **Testbarkeit:** Alle Module isoliert testbar

---

## Sofort-Maßnahmen (Quick Wins)

### 1. Fix Code-Sync (5 min)

In `studio/bootstrap.ts`:

```typescript
syncCoordinator.setTargets({
  scrollEditorToLine: (line) => {
    // Wenn Editor Fokus hat: nur scrollen
    // Sonst: scrollen UND Cursor setzen
    if (state.get().editorHasFocus) {
      editorController.scrollToLine(line, true)
    } else {
      editorController.scrollToLineAndSelect(line)
    }
  },
  // ... rest
})
```

### 2. Dokumentation aktualisieren

- Sync-Architektur dokumentieren (dieses Dokument)
- Migrations-Roadmap erstellen
- Code-Kommentare für Legacy-Teile hinzufügen

---

## Fazit

Die Architektur ist grundsätzlich gut durchdacht, aber die Migration ist unvollständig. Der kritische Bug (Code-Sync beim Preview-Klick) kann mit **5 Zeilen Code** behoben werden.

Mittelfristig sollte die Legacy-Integration in `app.js` vollständig in die neue Architektur migriert werden, um technische Schulden abzubauen und die Wartbarkeit zu verbessern.

### Prioritäten

| Prio | Aufgabe | Aufwand | Impact |
|------|---------|---------|--------|
| 1 | Code-Sync Fix | 5 min | Hoch |
| 2 | SyncCoordinator erweitern | 1h | Mittel |
| 3 | SelectionManager konsolidieren | 4h | Mittel |
| 4 | app.js Migration | 2-3 Tage | Hoch |

---

*Erstellt: 2024-03-11*
*Review-Version: 1.0*
