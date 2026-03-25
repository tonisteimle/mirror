# Pragmatic Drag and Drop - Evaluation

## 1. Library Overview

**Name:** Pragmatic Drag and Drop (Atlassian)
**Repo:** https://github.com/atlassian/pragmatic-drag-and-drop
**NPM:** `@atlaskit/pragmatic-drag-and-drop`
**Bundle:** ~4.7kB (core)

### Packages

| Package | Beschreibung | Vanilla JS? |
|---------|--------------|-------------|
| `core` | Basis: draggable, dropTarget, monitor | ✅ |
| `hitbox` | Edge-Detection (before/after) | ✅ |
| `auto-scroll` | Scroll während Drag | ✅ |
| `flourish` | Flash-on-drop Animation | ✅ |
| `live-region` | Screen Reader Announcements | ✅ |
| `react-drop-indicator` | Drop Lines (React) | ❌ React |
| `react-accessibility` | A11y Controls (React) | ❌ React |

**Fazit:** Alle relevanten Packages sind Vanilla JS kompatibel.

---

## 2. Anforderungs-Abgleich

### 2.1 Drag Sources

| Anforderung | Library Support | Anmerkung |
|-------------|-----------------|-----------|
| Component Panel → Preview | ✅ `draggable()` | HTML5 Drag API |
| Canvas Element → Canvas | ✅ `draggable()` | Gleiche API |
| Alt+Drag Duplicate | ⚠️ Custom | Alt-Key in Event prüfen |
| Component Panel → Editor | ✅ `draggable()` | Gleiche API |

### 2.2 Drop Targets - Flex Container mit Kindern

| Anforderung | Library Support | Anmerkung |
|-------------|-----------------|-----------|
| before/after Detection | ✅ `hitbox` | `attachClosestEdge(['top','bottom'])` |
| Insertion Line | ⚠️ Custom | Library liefert Daten, wir rendern |
| Direction-aware | ✅ `hitbox` | `['left','right']` für horizontal |

**Code-Beispiel:**
```typescript
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'

dropTargetForElements({
  element: childElement,
  getData: ({ input }) => attachClosestEdge({
    nodeId: element.dataset.mirrorId
  }, {
    element,
    input,
    allowedEdges: isHorizontal ? ['left', 'right'] : ['top', 'bottom'],
  }),
  onDrag: ({ self }) => {
    const edge = extractClosestEdge(self.data) // 'top' | 'bottom' | 'left' | 'right'
    showInsertionLine(element, edge)
  },
})
```

### 2.3 Drop Targets - Flex Container leer (9-Zone)

| Anforderung | Library Support | Anmerkung |
|-------------|-----------------|-----------|
| 9-Zone Detection | ❌ Custom | Nicht in Library |
| Zone Highlight | ❌ Custom | Nicht in Library |

**Bewertung:** Die 9-Zone Logik muss custom implementiert werden. Das sind ~100-150 LOC.

**Custom Implementation:**
```typescript
function detectZone(cursor: Point, containerRect: Rect): Zone {
  const relX = (cursor.x - containerRect.x) / containerRect.width
  const relY = (cursor.y - containerRect.y) / containerRect.height

  const col = relX < 0.33 ? 'left' : relX > 0.66 ? 'right' : 'center'
  const row = relY < 0.33 ? 'top' : relY > 0.66 ? 'bottom' : 'middle'

  return `${row}-${col}` as Zone
}
```

### 2.4 Drop Targets - Positioned Container (absolute x/y)

| Anforderung | Library Support | Anmerkung |
|-------------|-----------------|-----------|
| Freie Positionierung | ⚠️ Partial | Library gibt Events, wir berechnen Position |
| Snap-Lines | ❌ Custom | Nicht in Library |
| Distance Labels | ❌ Custom | Nicht in Library |

**Bewertung:** Pragmatic DnD nutzt HTML5 Drag API, die keine kontinuierlichen Koordinaten liefert. Für absolute Positionierung brauchen wir:

**Option A:** `onDrag` Event nutzen (liefert clientX/clientY)
```typescript
dropTargetForElements({
  element: posContainer,
  onDrag: ({ location }) => {
    const x = location.current.input.clientX - containerRect.left
    const y = location.current.input.clientY - containerRect.top
    updateGhostPosition(x, y)
    calculateSnapLines(x, y)
  },
})
```

**Option B:** Hybrides System - Pragmatic für Drop-Detection, eigenes Mouse-Tracking für Snap

### 2.5 Drop Targets - Code Editor

| Anforderung | Library Support | Anmerkung |
|-------------|-----------------|-----------|
| Drop in CodeMirror | ✅ Kompatibel | HTML5 Events passieren durch |
| Line/Indent Berechnung | ❌ Custom | CodeMirror-spezifisch |

**Bewertung:** Der bestehende `EditorDropHandler` kann beibehalten werden. Pragmatic DnD interferiert nicht.

### 2.6 Visual Feedback

| Anforderung | Library Support | Anmerkung |
|-------------|-----------------|-----------|
| Ghost Rendering | ⚠️ HTML5 native | `setDragImage()` oder custom |
| Insertion Line | ❌ Custom | Wir rendern, Library liefert Daten |
| Zone Highlight | ❌ Custom | Vollständig custom |
| Snap Lines | ❌ Custom | Vollständig custom |

**Bewertung:** Visual Rendering bleibt bei uns. Das ist gewollt (headless Library).

### 2.7 Keyboard & Modifiers

| Anforderung | Library Support | Anmerkung |
|-------------|-----------------|-----------|
| Escape Cancel | ✅ Native | HTML5 Drag API |
| Alt Duplicate | ⚠️ Custom | `event.altKey` prüfen |
| Space+Drag | ❌ Custom | Nicht HTML5 kompatibel |

**Problem Space+Drag:**
HTML5 Drag API startet nur durch `dragstart` Event (mousedown auf draggable Element). Space+Click ist nicht nativ unterstützt.

**Workaround:**
```typescript
// Space gedrückt → temporär draggable=true setzen
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    previewElements.forEach(el => el.draggable = true)
  }
})
```

### 2.8 Edge Cases

| Anforderung | Library Support | Anmerkung |
|-------------|-----------------|-----------|
| Self-Drop Prevention | ✅ `canDrop` | Filter in dropTarget |
| Stale SourceMap | ⚠️ Custom | Unsere Logik |
| Scroll während Drag | ✅ `auto-scroll` | Optional Package |
| Zoom/Scale | ⚠️ Custom | Koordinaten-Transformation |

---

## 3. Migrations-Aufwand

### Was wir LÖSCHEN können (~2500 LOC)

| Datei | LOC | Ersetzt durch |
|-------|-----|---------------|
| `drag-state.ts` | 380 | Pragmatic State |
| `drop-zone.ts` | 365 | `hitbox` Package |
| `drag-controller.ts` | 560 | `draggable()` + `dropTarget()` |
| `drag-drop-service.ts` | 385 | Neuer Service |
| `studio-drag-drop-service.ts` | 990 | Neuer Service |

### Was wir BEHALTEN müssen (~600 LOC)

| Komponente | LOC | Grund |
|------------|-----|-------|
| 9-Zone Detection | ~100 | Custom Feature |
| Snap-Lines Calculator | ~150 | Custom Feature |
| Ghost Renderer | ~150 | Bleibt (nur Rendering) |
| Drop Indicator Renderer | ~100 | Bleibt (nur Rendering) |
| Editor Drop Handler | ~100 | CodeMirror-spezifisch |

### Was wir NEU schreiben (~400 LOC)

| Komponente | LOC | Beschreibung |
|------------|-----|--------------|
| `PragmaticDragService` | ~200 | Wrapper um Library |
| `DropTargetRegistry` | ~100 | Container registrieren |
| `DragDataAdapter` | ~100 | Daten-Transformation |

---

## 4. Risiken

### Mittleres Risiko
- **Space+Drag:** Nicht nativ unterstützt, Workaround nötig
- **Snap-Lines:** Müssen wir selbst implementieren (wie bisher)
- **HTML5 Drag Limitations:** Kein kontinuierliches Position-Update (nur in `onDrag`)

### Niedriges Risiko
- **9-Zone:** Einfache Geometrie, ~100 LOC
- **Editor Drop:** Bestehender Code funktioniert weiter
- **Bundle Size:** +4.7kB ist akzeptabel

### Mitigiert
- **Browser Support:** Atlassian testet umfassend (Jira, Trello, Confluence)
- **Maintenance:** Aktiv maintained, große Nutzerbasis

---

## 5. Empfehlung

### ✅ Migration empfohlen

**Gründe:**
1. **-2000 LOC** weniger selbst geschriebener Code
2. **Stabilität** durch battle-tested Library
3. **Edge Cases** (Scroll, A11y, Browser-Quirks) sind gelöst
4. **Zukunftssicher** - Atlassian maintained

**Einschränkungen akzeptabel:**
- 9-Zone und Snap-Lines bleiben custom (~250 LOC)
- Space+Drag braucht Workaround
- Visual Rendering bleibt bei uns (gewollt)

### Nächste Schritte

1. **Proof of Concept** (~1 Tag)
   - Palette → Preview Drop mit Pragmatic
   - Prüfen ob `onDrag` für absolute Pos ausreicht

2. **Incremental Migration** (~3-4 Tage)
   - Neuen Service parallel aufbauen
   - Feature-Flag für Umschaltung
   - Alten Code schrittweise entfernen

3. **Custom Features** (~2 Tage)
   - 9-Zone auf neues System portieren
   - Snap-Lines integrieren

---

## 6. Alternative: Kein Library-Wechsel

Falls Migration zu riskant erscheint:

**Option:** Bestehenden Code stabilisieren
- Focus auf die instabilsten Teile
- Tests für Edge Cases
- Aufwand: ~2-3 Tage für Quick Wins

**Nachteil:** Grundprobleme (Komplexität, Wartbarkeit) bleiben.
