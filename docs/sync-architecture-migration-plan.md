# Sync-Architektur Migration Plan

## Ziel

Migration von der dualen Architektur (app.js + studio/) zu einer einheitlichen, sauberen Architektur in `studio/`.

---

## Aktueller Zustand

### Problem: Duale Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                        app.js (Legacy)                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ editorHasFocus  │  │ SelectionManager│  │PropertyPanel│ │
│  │    (global)     │  │    (old)        │  │   (old)     │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘ │
│           │    ┌───────────────┘                  │        │
│           │    │  BRIDGE (bidirektionaler Sync)   │        │
└───────────┼────┼──────────────────────────────────┼────────┘
            │    │                                  │
            ▼    ▼                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      studio/ (Neu)                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │state.editorFocus│  │ SyncCoordinator │  │PropertyPanel│ │
│  │   (ungenutzt!)  │  │   (unvollständig)│  │ V2 (unused)│ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Kritische Bugs

1. **Code-Sync fehlt**: Preview-Klick scrollt Editor, aber Cursor wird nicht gesetzt
2. **Doppelte State-Verwaltung**: `editorHasFocus` (global) + `state.editorHasFocus`
3. **PropertyPanel V2 ungenutzt**: Neues Panel existiert, wird aber nicht instanziiert

---

## Zielzustand

```
┌─────────────────────────────────────────────────────────────┐
│                      studio/ (einzige Quelle)               │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    State Store                        │  │
│  │  source | selection | cursor | editorFocus | sourceMap│  │
│  └────────────────────────┬─────────────────────────────┘  │
│                           │                                 │
│           ┌───────────────┼───────────────┐                │
│           ▼               ▼               ▼                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Editor    │  │   Preview   │  │  Property   │        │
│  │ Controller  │  │ Controller  │  │  Panel V2   │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │
│         └────────────────┼────────────────┘                │
│                          ▼                                 │
│              ┌───────────────────────┐                     │
│              │    SyncCoordinator    │                     │
│              │  (einziger Sync-Hub)  │                     │
│              └───────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementierungsplan

### Phase 1: Core Sync vervollständigen

**Ziel:** Editor-Cursor wird beim Preview-Klick korrekt gesetzt

#### 1.1 SyncCoordinator: scrollToLineAndSelect nutzen

**Datei:** `studio/bootstrap.ts`

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

#### 1.2 Focus-Events in Controller

**Datei:** `studio/editor/index.ts`

- `onFocusChange(callback)` hinzufügen
- Focus-State automatisch tracken

**Datei:** `studio/preview/index.ts`

- Focus-Tracking bei Click

#### 1.3 SyncCoordinator erweitern

**Datei:** `studio/sync/sync-coordinator.ts`

- `SyncTargets.scrollEditorToLineAndSelect` hinzufügen
- Origin-basierte Logik für Cursor-Setzung

---

### Phase 2: Component Detection Service

**Ziel:** Komponentenerkennung aus Code-Zeilen in eigenem Service

#### 2.1 Neuer Service

**Datei:** `studio/sync/component-line-parser.ts` (NEU)

```typescript
export interface ComponentInfo {
  name: string
  isDefinition: boolean
  line: number
}

export function extractComponentFromLine(line: string): ComponentInfo | null
export function findParentDefinition(source: string, lineNum: number): ComponentInfo | null
export function getNodeIdForLine(sourceMap: SourceMap, lineNum: number): string | null
```

#### 2.2 Migration aus app.js

- `extractComponentFromLine()` (app.js:5859-5902)
- `findParentComponentDefinition()` (app.js:5910-5937)
- `findComponentNameFromDefinitionLine()` (app.js:5845-5851)

---

### Phase 3: PropertyPanel V2 Integration

**Ziel:** PropertyPanel V2 als einziges Property Panel

#### 3.1 Bootstrap Integration

**Datei:** `studio/bootstrap.ts`

```typescript
// PropertyPanel V2 instanziieren
const propertyPanel = createPropertyPanelV2(
  propertyPanelContainer,
  selectionManager,  // oder neuer Mechanismus
  propertyExtractor,
  codeModifier,
  sourceMap,
  onCodeChange
)
```

#### 3.2 Selection-Events verdrahten

```typescript
events.on('selection:changed', ({ nodeId }) => {
  propertyPanel.refresh()
})
```

#### 3.3 Altes PropertyPanel entfernen

**Datei:** `studio/app.js`

- Zeile ~6244: `new Mirror.PropertyPanel(...)` entfernen
- `studioPropertyPanel` Referenzen ersetzen

---

### Phase 4: SelectionManager konsolidieren

**Ziel:** Einheitliche Selection-Verwaltung

#### 4.1 Breadcrumb in State

**Datei:** `studio/core/state.ts`

```typescript
interface StudioState {
  // ... existing
  breadcrumb: Array<{ nodeId: string; name: string }>
}
```

#### 4.2 Bridge entfernen

**Datei:** `studio/app.js`

- Zeilen 6134-6152: Bidirektionale Sync-Bridge entfernen

#### 4.3 SelectionManager ersetzen

- Alle `studioSelectionManager` Aufrufe durch neue Architektur ersetzen

---

### Phase 5: app.js Cleanup

**Ziel:** Legacy-Code entfernen

| Was | Zeilen | Ersatz |
|-----|--------|--------|
| `editorHasFocus` global | ~5720 | `state.get().editorHasFocus` |
| `syncPropertyPanelToEditorCursor()` | 5949-6101 | `SyncCoordinator.handleCursorMove()` |
| Bidirektionale Bridge | 6134-6152 | Direkte Events |
| Focus Event Handlers | 6159-6178 | Controller-Events |
| Altes PropertyPanel | ~6244 | PropertyPanel V2 |

---

## Dateien Übersicht

### Neu zu erstellen

| Datei | Beschreibung |
|-------|--------------|
| `studio/sync/component-line-parser.ts` | Komponentenerkennung aus Code |

### Zu ändern

| Datei | Änderungen |
|-------|------------|
| `studio/bootstrap.ts` | + PropertyPanel V2, + Focus-Handling, + vollständige Verdrahtung |
| `studio/core/state.ts` | + breadcrumb State |
| `studio/editor/index.ts` | + onFocusChange(), + Focus-Tracking |
| `studio/preview/index.ts` | + Focus-Tracking |
| `studio/sync/sync-coordinator.ts` | + scrollToLineAndSelect Target |

### Zu bereinigen

| Datei | Was entfernen |
|-------|---------------|
| `studio/app.js` | ~300 Zeilen Legacy Sync-Code |

---

## Reihenfolge & Abhängigkeiten

```
Phase 1 ──────────────────────────────────────────┐
  │                                               │
  ├─► 1.1 scrollToLineAndSelect (keine Deps)     │
  │                                               │
  ├─► 1.2 Focus-Events (keine Deps)              │
  │                                               │
  └─► 1.3 SyncCoordinator erweitern (1.1, 1.2)   │
                                                  │
Phase 2 ◄─────────────────────────────────────────┤
  │                                               │
  └─► 2.1-2.2 Component Parser (keine Deps)      │
                                                  │
Phase 3 ◄─────────────────────────────────────────┤
  │                                               │
  ├─► 3.1 PropertyPanel V2 Bootstrap (Phase 1)   │
  │                                               │
  └─► 3.2-3.3 Integration (3.1)                  │
                                                  │
Phase 4 ◄─────────────────────────────────────────┤
  │                                               │
  └─► 4.1-4.3 SelectionManager (Phase 1-3)       │
                                                  │
Phase 5 ◄─────────────────────────────────────────┘
  │
  └─► 5.x Cleanup (alle Phasen abgeschlossen)
```

---

## Geschätzter Aufwand

| Phase | Aufwand | Risiko | Status |
|-------|---------|--------|--------|
| Phase 1 | 2-3h | Niedrig | ✅ Fertig |
| Phase 2 | 1-2h | Niedrig | ✅ Fertig |
| Phase 3 | 2-3h | Mittel | ✅ Fertig (PropertyPanel aus src/studio integriert) |
| Phase 4 | 1-2h | Mittel | ✅ Fertig (Breadcrumb in State) |
| Phase 5 | 1h | Niedrig | ✅ Fertig (Legacy-Code bereinigt, getEditorHasFocus()) |
| **Gesamt** | **8-12h** | | |

---

## Verifikation

Nach jeder Phase:

- [x] Build erfolgreich (`npm run build`)
- [x] Tests bestehen (`npm test`)
- [ ] Editor → Preview Sync funktioniert (manuell testen)
- [ ] Preview → Editor Sync funktioniert inkl. Cursor (manuell testen)
- [ ] Property Panel aktualisiert sich (manuell testen)
- [ ] Keine Console Errors (manuell testen)

---

## Rollback-Strategie

Jede Phase wird als separater Commit implementiert. Bei Problemen:

```bash
git revert <commit-hash>
```

---

*Erstellt: 2024-03-11*
*Abgeschlossen: 2026-03-11*
*Version: 1.1*
