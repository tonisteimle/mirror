# Preview-Architektur Refactoring

## Status: Phase 2 abgeschlossen

---

## Problem

Die aktuelle Preview-Architektur hat ein fundamentales Problem:

**Drei "Wahrheiten" konkurrieren:**
- Editor (Code)
- SourceMap (Compile-Ergebnis)
- Preview DOM (gerenderte Elemente)

**Symptome:**
- 24 Dateien lesen direkt aus dem DOM (`getBoundingClientRect`)
- Handles positionieren sich zum falschen Zeitpunkt
- Race Conditions bei schnellen Änderungen
- Komplexe Sync-Logik mit Debounce/Cancel
- Deferred Selection wegen Timing-Problemen

**Root Cause:**
Die SourceMap enthält keine Layout-Informationen (x, y, width, height).
Diese existieren nur im gerenderten DOM. Also lesen Handles, Resize, etc.
ständig aus dem DOM - zu verschiedenen Zeitpunkten, mit verschiedenen Ergebnissen.

---

## Zielarchitektur

### Prinzipien

1. **Code ist die einzige Wahrheit**
2. **Alles andere ist abgeleitet (computed)**
3. **Klare Phasen, kein kontinuierlicher Sync**
4. **Preview und Overlays haben keinen eigenen State**
5. **DOM wird einmal gemessen, dann ist layoutInfo die Wahrheit**

### State

```typescript
interface State {
  // Source of Truth
  source: string

  // Derived (computed)
  compiled: {
    ast: AST
    ir: IR
    sourceMap: SourceMap
  }

  // Layout Info (extracted after render)
  layoutInfo: Map<string, LayoutRect>
  layoutVersion: number

  // User State
  selection: {
    nodeId: string | null
    origin: SelectionOrigin
  }
}

interface LayoutRect {
  x: number
  y: number
  width: number
  height: number
  padding: { top: number, right: number, bottom: number, left: number }
  gap: number
  radius: number
  isAbsolute: boolean
  parentId: string | null
}
```

### Render Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                    RENDER PIPELINE                      │
│                                                         │
│  Phase 1: Compile       source → compiled               │
│  Phase 2: Render        compiled.ir → DOM               │
│  Phase 3: Measure       DOM → layoutInfo (EINMALIG)     │
│  Phase 4: Overlays      layoutInfo + selection → UI     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Wichtig:**
- DOM wird NUR in Phase 3 gelesen
- Handles, ResizeManager, etc. lesen NUR aus `layoutInfo`
- Kein `getBoundingClientRect()` außerhalb von Phase 3

### Event Flow

```
User Event (Click, Resize, Drag)
    ↓
Intent { type: 'resize', nodeId, width, height }
    ↓
Intent → Code-Änderung (Command)
    ↓
Code geändert
    ↓
Render Pipeline (Phase 1-4)
    ↓
UI aktualisiert sich aus State
```

**Keine bidirektionale Synchronisation.**
Events fließen nur in eine Richtung: User → Code → Render → UI.

### Komponenten-Verantwortlichkeiten

| Komponente | Liest aus | Schreibt in | Events |
|------------|-----------|-------------|--------|
| Editor | - | source | - |
| Compiler | source | compiled | - |
| PreviewRenderer | compiled.ir | DOM | - |
| LayoutExtractor | DOM | layoutInfo | - |
| ResizeManager | layoutInfo, selection | - | intent:resize |
| HandleManager | layoutInfo, selection | - | intent:setPadding, intent:setGap |
| SelectionOverlay | layoutInfo, selection | - | - |
| IntentProcessor | - | source (via Commands) | - |

### Live Feedback (Optimistic UI)

Während Drag/Resize will der User sofortiges Feedback. Compile dauert aber.

**Lösung:**
```
Drag Start
    ↓
Direktes DOM-Update (temporär, nur visuell)
    ↓
Drag Move → DOM weiter updaten
    ↓
Drag End
    ↓
Intent emittieren
    ↓
Code-Änderung → Compile → layoutInfo überschreibt temporäre Änderungen
```

Das temporäre DOM-Update wird durch den nächsten Render-Cycle überschrieben.
Kein zusätzlicher State nötig.

---

## Refactoring-Plan

### Phase 1: LayoutInfo + LayoutExtractor ✅ ABGESCHLOSSEN

**Ziel:** Neue Datenstruktur, eine Funktion zum Extrahieren.

**Dateien:**
- `studio/core/state.ts` - State erweitert ✅
- `studio/preview/layout-extractor.ts` - NEU ✅
- `tests/studio/preview-layout-extractor.test.ts` - NEU ✅

**Tasks:**
1. ✅ LayoutRect Interface definieren (Zeilen 82-112 in state.ts)
2. ✅ layoutInfo + layoutVersion zu State hinzufügen (Zeilen 157-160)
3. ✅ extractLayoutInfo() Funktion schreiben
4. ✅ Tests für LayoutExtractor (20 Tests, alle bestanden)

**Actions hinzugefügt:**
- `setLayoutInfo(layoutInfo: Map<string, LayoutRect>)`
- `getLayoutRect(nodeId: string): LayoutRect | null`
- `clearLayoutInfo()`

**Event hinzugefügt:**
- `layout:updated` mit `{ version, count }`

**Definition of Done:** ✅
- layoutInfo ist im State
- extractLayoutInfo() extrahiert alle Elemente mit data-mirror-id
- Unit Tests bestehen (20/20)

---

### Phase 2: Render Pipeline ✅ ABGESCHLOSSEN

**Ziel:** Klare Phasen statt verstreuter Events.

**Dateien:**
- `studio/preview/render-pipeline.ts` - NEU ✅
- `studio/bootstrap.ts` - Integration ✅
- `tests/studio/preview-render-pipeline.test.ts` - NEU ✅

**Tasks:**
1. ✅ RenderPipeline Klasse mit klaren Phasen
2. ✅ nextFrame() Helper für Layout-Stabilität (double-RAF)
3. ✅ Integration in studio bootstrap
4. ✅ layoutInfo wird nach jedem compile:completed befüllt

**Implementiert:**
- `RenderPipeline` Klasse mit attach/detach/dispose
- `scheduleLayoutExtraction()` mit double-RAF für Layout-Stabilität
- `extractLayoutNow()` für synchrone Extraktion
- `nextFrame()` und `delay()` Utilities
- Auto-attach bei compile:completed Events
- `preview:rendered` Event nach Extraktion
- 15 Unit Tests bestanden

**Definition of Done:** ✅
- RenderPipeline orchestriert Measurement Phase
- layoutInfo ist nach Render immer aktuell
- compile:completed triggert automatische Layout-Extraktion

---

### Phase 3: ResizeManager umbauen

**Ziel:** Liest aus layoutInfo statt DOM.

**Datei:** `studio/visual/resize-manager.ts`

**Änderungen:**
- showHandles() → liest aus layoutInfo
- onMouseDown() → liest aus layoutInfo
- updateHandlePositions() → liest aus layoutInfo
- getAvailableSpace() → liest aus layoutInfo
- getChildrenMinSize() → liest aus layoutInfo

**Definition of Done:**
- Kein getBoundingClientRect() mehr in ResizeManager
- Alle Tests bestehen
- Resize funktioniert wie vorher

---

### Phase 4: HandleManager umbauen

**Ziel:** Gleiche Logik wie ResizeManager.

**Datei:** `studio/preview/handle-manager.ts`

**Änderungen:**
- calculateHandles() → liest aus layoutInfo
- Gap-Berechnung → liest aus layoutInfo

**Definition of Done:**
- Kein getBoundingClientRect() mehr in HandleManager
- Alle Tests bestehen

---

### Phase 5: Weitere DOM-Reads eliminieren

**Ziel:** Alle verbleibenden DOM-Reads auf layoutInfo umstellen.

**Betroffene Dateien (aus Grep-Ergebnis):**
- `studio/visual/overlay-manager.ts`
- `studio/visual/draw-manager.ts`
- `studio/drag-drop/` (mehrere)
- `studio/preview/context-menu.ts`

**Vorgehen:**
- Datei für Datei durchgehen
- DOM-Reads durch layoutInfo-Reads ersetzen
- Testen

---

### Phase 6: Cleanup

**Ziel:** Alte Komplexität entfernen.

**Tasks:**
- Debounce/Cancel-Logik entfernen wo nicht mehr nötig
- Deferred Selection vereinfachen
- Debug-Flags entfernen
- Dokumentation aktualisieren

---

## Nicht-Ziele

- Kein iframe für Preview (zu viel Aufwand, fraglicher Nutzen)
- Kein eigenes Layout-System (CSS reicht)
- Keine Feature-Flags (keine Kunden, direkt umbauen)

---

## Risiken

| Risiko | Mitigation |
|--------|------------|
| layoutInfo ist stale nach DOM-Änderung | layoutVersion inkrementieren, Overlays reagieren |
| Performance bei vielen Elementen | layoutInfo nur für sichtbare Elemente, lazy |
| Timing zwischen Render und Measure | requestAnimationFrame garantiert Layout-Stabilität |

---

## Erfolgsmetriken

- **Weniger Code:** DOM-Read-Stellen reduziert von 24 auf 1
- **Weniger Bugs:** Keine Timing-Issues mehr bei Handles
- **Einfacher zu verstehen:** Klare Pipeline statt Event-Chaos
- **Testbar:** LayoutExtractor ist pure Function, leicht zu testen

---

## Bestehende Drag-and-Drop Architektur

### Status: Gut, minimal anpassen

Die DnD-Architektur ist solide und muss nicht radikal umgebaut werden.

### Architektur-Übersicht

```
studio/drag-drop/
├── types.ts                    # Zentrale Typdefinitionen
├── system/
│   ├── drag-drop-system.ts     # Kern-Orchestrierung (Pragmatic DnD)
│   └── target-detector.ts      # DOM-Analyse (Layout, Kinder)
├── strategies/
│   ├── registry.ts             # Strategy-Verwaltung
│   ├── absolute-position.ts    # Positioned Container (x/y)
│   ├── flex-with-children.ts   # Flex-Container mit Kindern
│   ├── simple-inside.ts        # Leere Container
│   └── non-container.ts        # Leaf-Elemente (Text, Button)
├── visual/
│   └── system.ts               # Visual Feedback (Line, Outline, Ghost)
└── executor/
    └── code-executor.ts        # Bridge zur CodeModifier
```

### Strategy Pattern

4 Strategien für verschiedene Drop-Targets:

| Strategie | Container-Typ | Placement |
|-----------|---------------|-----------|
| AbsolutePositionStrategy | `stacked` | `absolute` mit x/y |
| FlexWithChildrenStrategy | Flex mit Kindern | `before` / `after` |
| SimpleInsideStrategy | Leerer Flex | `inside` |
| NonContainerStrategy | Leaf-Element | `before` / `after` (am Parent) |

### Drag Flow

```
Drag Start
    ↓
Monitor.onDragStart → extractDragSource()
    ↓
Mouse Move über Preview
    ↓
updateDropIndicator()
    ├─ elementFromPoint(cursor)
    ├─ detectTarget() → DropTarget
    ├─ registry.findStrategy(target)
    ├─ strategy.calculate() → DropResult
    └─ visual.showIndicator()
    ↓
Drop
    ↓
CodeExecutor.execute()
    ├─ createModifier()
    ├─ modifier.addChild/moveNode()
    └─ applyChange() → Recompile
```

### DOM-Reads während Drag

```
Jeder Mouse-Move:
  → elementFromPoint()
  → getBoundingClientRect() (Target + Kinder)
  → getComputedStyle() (Layout-Detection)
```

**Warum das OK ist:**
- Während Drag ändert sich der Code nicht
- Kein Compile läuft parallel
- layoutInfo ist stabil
- Performance akzeptabel (Drag ist nicht ultra-häufig)

### Integration mit layoutInfo

**Option A: Belassen wie es ist**
- DnD liest weiter aus DOM während Drag
- Nach Drop: Compile → layoutInfo wird aktualisiert
- Funktioniert, weil während Drag kein Compile läuft

**Option B: DnD nutzt layoutInfo (optional, später)**
- `getChildRects()` könnte aus layoutInfo lesen
- `detectTarget()` könnte layoutInfo nutzen
- Vorteil: Konsistenz
- Aber: Kein dringender Bedarf

### Empfehlung

**DnD als letztes anfassen.** Die Architektur funktioniert gut.

Fokus zuerst auf:
1. ResizeManager (problematisch)
2. HandleManager (problematisch)
3. Selection/Overlay (problematisch)

DnD erst wenn der Rest stabil ist, und nur falls nötig.

### Besondere Features (beibehalten)

| Feature | Beschreibung |
|---------|--------------|
| Mode Debouncing | 80ms Stabilisierung bei Layout-Wechsel |
| Container Redirect | Drop unter Card → Insert ans Ende der Card |
| No-Op Detection | Element auf eigene Position → kein Indicator |
| Alt+Drop Duplicate | Alt-Taste für Kopieren statt Verschieben |
| Test API | `simulateDrop()`, `simulateMove()` für Tests |

---

## Bestehende Kernkomponenten

### SyncCoordinator (`studio/sync/sync-coordinator.ts`)

**Verantwortung:** Zentraler Orchestrator für Synchronisation zwischen Editor, Preview, PropertyPanel.

**Flow:**
```
Selection-Änderung (egal woher)
    ↓
actions.setSelection(nodeId, origin)
    ↓
Event: selection:changed
    ↓
SyncCoordinator.doSync()
    ├─ scrollEditorToLine() (wenn origin !== 'editor')
    ├─ highlightPreviewElement() (wenn origin !== 'preview')
    └─ PropertyPanel via StateSelectionAdapter
```

**DOM-Reads:**
- `document.querySelector()` für Element-Lookup
- DOM-Traversal für Breadcrumb-Berechnung (!)

**Probleme:**
- Breadcrumb über DOM statt SourceMap berechnet
- Debounce-Cancellation ist fragile (Preview-Click cancelt Editor-Debounce)
- `sourceMapVersion` für Staleness-Detection (funktioniert, aber komplex)

---

### PreviewController (`studio/preview/index.ts`)

**Verantwortung:** DOM-Management für Preview, Selection-Highlighting, Hover-Effekte, Visual Code System.

**DOM-Reads:**
```typescript
this.container.querySelector(`[data-mirror-id="${nodeId}"]`)  // Bei Selection
this.container.querySelectorAll('.studio-multi-selected')     // Bei Multi-Selection
this.container.getBoundingClientRect()                        // Bei Drop Zone (!)
```

**Events:**
- Hört: `compile:completed`, `multiselection:changed`, `resize:end`
- Emittiert: `preview:element-dblclicked`, `preview:element-hovered`

**Probleme:**
- `querySelector()` ist O(n) - sollte durch Map<nodeId, element> optimiert werden
- `getBoundingClientRect()` in `showDropZone()` triggert Force Layout
- Multi-Selection in zwei Systemen (State + DOM-Klassen)

---

### State Management (`studio/core/state.ts`)

**Verantwortung:** Single Source of Truth für alle Studio-Daten.

**Kritisch: Drei Selection APIs nebeneinander!**
```typescript
pendingSelection   // Legacy: line-based
queuedSelection    // Legacy: nodeId-based
deferredSelection  // Neu: unified
```

**Selection-Flow:**
```
setSelection(nodeId, origin)
    ↓
Wenn compiling → queue in deferredSelection
    ↓
Nach compile:completed → resolveDeferredSelection()
    ↓
Event: selection:changed
```

**Events emittiert:**
- `source:changed`, `compile:completed`, `selection:changed`
- `multiselection:changed`, `breadcrumb:changed`

**Probleme:**
- Drei Selection-APIs sollten konsolidiert werden
- Synchrone Auflösung in `setCompileResult()` erzeugt Nebenwirkungen
- `multiSelection` Validation ist lossy (invalid nodes werden stillschweigend entfernt)

---

### Change Pipeline (`studio/core/change-pipeline.ts`)

**Verantwortung:** Explizite, sequenzielle Verarbeitung von Code-Änderungen.

**8 Phasen:**
```
1. readState          → source, sourceMap, preludeOffset
2. validateSourceMap  → SourceMap muss existieren
3. validateNode       → Node muss existieren
4. createModifier     → CodeModifier erstellen
5. executeIntent      → modifier.method() basierend auf Intent-Typ
6. extractEditorContent → Prelude entfernen
7. applyToEditor      → actions.setSource()
8. emitChangeEvent    → change:applied Event
```

**Intent-Typen:**
- Property: `setProperty`, `incrementProperty`, `removeProperty`
- Layout: `setDirection`, `toggleDirection`, `setAlignment`, `setSize`
- Struktur: `deleteNode`, `addChild`, `moveNode`, `groupNodes`, `ungroup`, `duplicateNode`
- Text: `updateText`

**Status:** Gut strukturiert, bleibt weitgehend unverändert.

---

### OverlayManager (`studio/visual/overlay-manager.ts`)

**Verantwortung:** Pure DOM-Manipulation für Visual Feedback (Handles, Drop Zones, Indicators).

**DOM-Struktur:**
```html
<div class="visual-overlay">
  <div class="resize-handles"></div>
  <div class="semantic-dots"></div>
  <div class="sibling-line"></div>
  <div class="zone-indicator"></div>
  <div class="size-indicator"></div>
</div>
```

**Keine Events** - pure Manipulation, wird von PreviewController/ResizeManager gefüttert.

**Probleme:**
- `ensureOverlay()` wird oft aufgerufen (fragil bei innerHTML-Resets)
- Keine Bounds-Checking für Edge-Cases
- `getResizeHandlesContainer()` macht querySelector jedes Mal

---

## Kritische Findings

### 1. Drei Selection-APIs

```typescript
// Alle drei existieren nebeneinander:
pendingSelection: { line, componentName, origin }  // Legacy
queuedSelection: { nodeId, origin }                // Legacy
deferredSelection: { type: 'nodeId' | 'line', ... } // Neu

// Auflösung in setCompileResult() ist komplex:
if (queuedSelection) resolve...
if (pendingSelection) resolve...
if (deferredSelection) resolve...
```

**Refactoring:** Konsolidieren zu einer API (`deferredSelection`).

### 2. DOM-Reads verstreut

| Komponente | DOM-Reads | Problem |
|------------|-----------|---------|
| SyncCoordinator | Breadcrumb-Traversal | O(depth) |
| PreviewController | querySelector für jeden Node | O(n) |
| ResizeManager | getBoundingClientRect überall | Timing |
| HandleManager | getBoundingClientRect + getComputedStyle | Timing |

**Refactoring:** Alle in Phase 3 der Pipeline (nach Render).

### 3. Debounce/Cancel-Pattern

```typescript
// SyncCoordinator
handlePreviewClick() {
  if (this.pendingCursorSync) clearTimeout(this.pendingCursorSync)  // Fragile!
  ...
}
```

**Problem:** Versteckte Dependency zwischen Preview-Click und Editor-Cursor-Sync.

**Refactoring:** Mit layoutInfo-Ansatz wird Debounce weniger kritisch.

### 4. Callback-Indirection

```
Preview Click
    ↓
PreviewController.select()
    ↓
selectionCallbacks (= SyncCoordinator.handlePreviewClick)
    ↓
actions.setSelection()
    ↓
Event: selection:changed
    ↓
StateSelectionAdapter → PropertyPanel
```

**Refactoring:** Direkter Flow ohne Callback-Zwischenschicht.

---

## Komponenten-Interaktion (Ist-Zustand)

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INPUT                               │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
    ┌─────────┐         ┌──────────┐        ┌─────────────┐
    │ Editor  │         │ Preview  │        │ PropertyPanel│
    └────┬────┘         └────┬─────┘        └──────┬──────┘
         │                   │                     │
         │ cursor:moved      │ click               │ change intent
         ▼                   ▼                     ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                    SyncCoordinator                           │
    │                                                              │
    │  • Debounce Editor-Cursor (50ms)                            │
    │  • Cancel Debounce bei Preview-Click                        │
    │  • Compute Breadcrumb via DOM-Traversal                     │
    └─────────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                         STATE                                │
    │                                                              │
    │  selection: { nodeId, origin }                              │
    │  deferredSelection: { ... }  ← Wenn compiling               │
    │  multiSelection: string[]                                   │
    └─────────────────────────────────────────────────────────────┘
                              │
                              │ selection:changed Event
                              ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                    ALL SUBSCRIBERS                           │
    │                                                              │
    │  • Editor: scrollToLine()                                   │
    │  • Preview: highlight(), showHandles()                      │
    │  • PropertyPanel: updateProperties()                        │
    │  • ResizeManager: showHandles() ← LIEST DOM!               │
    │  • HandleManager: calculateHandles() ← LIEST DOM!          │
    └─────────────────────────────────────────────────────────────┘
```

---

## Offene Fragen

1. Soll layoutInfo auch computedStyle enthalten (Farben, etc.)?
2. Wie mit Scroll-Position umgehen?
3. Brauchen wir layoutInfo für Elemente außerhalb des Viewports?
4. DnD auf layoutInfo umstellen oder belassen?
5. Selection-APIs konsolidieren als Teil von Phase 1 oder separat?
6. Breadcrumb aus SourceMap statt DOM berechnen?
