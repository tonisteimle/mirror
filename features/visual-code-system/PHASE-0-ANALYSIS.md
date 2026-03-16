# Phase 0: Analyse-Ergebnisse

## Zusammenfassung

Die Mirror-Architektur ist **ausgereifter als erwartet**. Viele Features des Visual Code Systems sind bereits implementiert oder haben solide Grundlagen.

### Status-Übersicht

| Feature | Status | Anmerkung |
|---------|--------|-----------|
| Hierarchisches Drop-Targeting | ✅ Vorhanden | `DropZoneCalculator.getCurrentDropZone()` |
| Sibling-Insertion | ✅ Vorhanden | `placement: 'before' \| 'after' \| 'inside'` |
| Edge-Detection | ✅ Vorhanden | Threshold 25% (unser Prototyp: 15%) |
| Smart Sizing | ❌ Fehlt | Residual Space Berechnung nötig |
| Resize mit Modus-Erkennung | ❌ Fehlt | Komplett neu |
| Multi-Select | ❌ Fehlt | SelectionManager ist Single-Select |
| Gruppieren | ❌ Fehlt | Komplett neu |
| Grid-Layout | ❌ Fehlt | Komplett neu |

---

## 1. Drag & Drop

### Bestehende Implementierung

**Dateien:**
- `src/studio/drag-drop-manager.ts` (474 LOC)
- `src/studio/drop-zone-calculator.ts` (655 LOC)

**DropZone Interface:**
```typescript
interface DropZone {
  targetId: string              // node-5
  placement: 'before' | 'after' | 'inside'
  element: HTMLElement
  parentId: string
  siblingId?: string            // Für before/after
}
```

**Edge-Detection (bereits vorhanden!):**
- 0-25% → `before`
- 75-100% → `after`
- 25-75% → `inside`

**Unterschied zum Prototyp:**
- Mirror: Fester 25% Threshold
- Prototyp: `min(12px, max(6px, size × 0.15))`

**Empfehlung:** Threshold-Berechnung anpassen auf dynamisch (15%, min 6px, max 12px).

### Visuelle Indikatoren

Bereits vorhanden (Webflow-inspiriert):
- Blaue Linie für before/after
- Dots an Endpoints
- Highlight-Box für inside
- Layout-aware (horizontal vs. vertical)

**Keine Änderung nötig** - das System ist ausgereift.

---

## 2. Selection

### Bestehende Implementierung

**Datei:** `src/studio/selection-manager.ts` (224 LOC) - **DEPRECATED**

**Aktuell: Single-Select**
```typescript
class SelectionManager {
  private selectedNodeId: string | null = null
  // ...
}
```

**Neuer Standard:** `StateSelectionAdapter` in `studio/core/`

**API:**
```typescript
select(nodeId): void
getSelection(): string | null
subscribe(listener): () => void  // Returns unsubscribe
```

### Für Multi-Select benötigt

```typescript
// Erweitern zu:
class SelectionManager {
  private selectedNodeIds: Set<string> = new Set()

  select(id: string): void        // Ersetzt alle
  toggle(id: string): void        // Add/Remove
  add(id: string): void
  remove(id: string): void
  clear(): void

  isSelected(id: string): boolean
  getSelection(): string[]
  hasMultiple(): boolean
}
```

**Empfehlung:** StateSelectionAdapter erweitern, nicht SelectionManager.

---

## 3. Bounds & SourceMap

### Bounds-Ermittlung

**Methode:** DOM-basiert via `getBoundingClientRect()`

```typescript
// In DropZoneCalculator:
const rect = element.getBoundingClientRect()
```

**Empfehlung:** DOM-Bounds weiter nutzen. Konsistent mit Preview.

### SourceMap

**Datei:** `src/studio/source-map.ts` (315 LOC)

**Struktur:**
```typescript
interface NodeMapping {
  nodeId: string
  componentName: string
  position: SourcePosition       // Line/Column im Source
  properties: Map<string, SourcePosition>
  parentId?: string
}
```

**Bidirektionales Editing:**
- Code → Preview: SourceMap gibt DOM-Element
- Preview → Code: `data-mirror-id` → SourceMap → Position

**Keine Änderung nötig** für Visual Code System.

---

## 4. CodeModifier

### Bestehende Implementierung

**Datei:** `src/studio/code-modifier.ts` (1270 LOC)

**Relevante Methoden:**

```typescript
// Property-Änderungen
updateProperty(nodeId, propName, newValue): ModificationResult
addProperty(nodeId, propName, value): ModificationResult
removeProperty(nodeId, propName): ModificationResult

// Strukturelle Änderungen
addChild(parentId, componentName, options): ModificationResult
addChildRelativeTo(siblingId, componentName, placement, options): ModificationResult
moveNode(sourceNodeId, targetId, placement): ModificationResult
removeNode(nodeId): ModificationResult
```

**Sibling-Insertion bereits vorhanden!**
```typescript
addChildRelativeTo(
  siblingId: string,
  componentName: string,
  placement: 'before' | 'after',
  options?: { properties?, textContent? }
)
```

### Fehlende Methoden für Visual Code System

```typescript
// Für Gruppieren:
wrapInContainer(elementIds: string[], containerProps): string

// Für Ungroup:
unwrapContainer(containerId: string): string[]

// Für Smart Sizing:
updateSizing(nodeId, sizing: { width, height }): ModificationResult
```

**Empfehlung:** CodeModifier erweitern um `wrapInContainer()`.

---

## 5. IR-Struktur

### Bestehende Properties

**Datei:** `src/ir/types.ts`, `src/ir/index.ts` (1821 LOC)

**Layout/Direction:**
```typescript
// DSL Syntax → CSS
'horizontal' / 'hor' → flex-direction: row
'vertical' / 'ver'   → flex-direction: column
'center' / 'cen'     → display:flex + justify-content:center + align-items:center
'spread'             → justify-content: space-between
'wrap'               → flex-wrap: wrap
'gap' / 'g'          → CSS gap
'grid'               → display:grid + grid-template-columns
```

**Sizing:**
```typescript
// DSL Syntax → CSS
'size full'   → width:100% + height:100% + flex-grow:1
'size hug'    → width:fit-content + height:fit-content
'size 48'     → width:48px + height:48px
'w full'      → width:100% + flex-grow:1
'w hug'       → width:fit-content
'w 200'       → width:200px
'h full/hug/N'→ analog
```

**Fazit:** IR unterstützt bereits `fill` (= full), `hug`, und Pixel-Werte!

---

## 6. Datenflüsse

### Drag & Drop → Code

```
DragEvent
  ↓
DragDropManager.handleDrop()
  ↓
DropZoneCalculator.getCurrentDropZone()
  ↓
CodeModifier.addChild() oder addChildRelativeTo()
  ↓
CodeChange { from, to, insert }
  ↓
Editor.applyChange()
  ↓
IR.toIR() → neue SourceMap + Rendering
```

### Selection → Property Panel

```
Preview Click
  ↓
element.dataset.mirrorId
  ↓
SelectionManager.select(nodeId)
  ↓
PropertyPanel: SourceMap.getNodeMapping(nodeId)
  ↓
Display Properties
```

---

## 7. Empfehlungen

### Phase 1: Sibling-Insertion

**Status:** Bereits größtenteils vorhanden!

**Anpassungen:**
1. Edge-Threshold von 25% auf dynamisch ändern
2. `DropZoneCalculator.getEdgeThreshold()` einführen:
   ```typescript
   getEdgeThreshold(size: number): number {
     return Math.min(12, Math.max(6, size * 0.15))
   }
   ```

### Phase 2: Smart Sizing

**Neu zu implementieren:**
1. `ResidualSpaceCalculator` Service
2. `SmartSizingService`
3. Integration in `DragDropManager.handleDrop()`

**CodeModifier nutzen für:** `updateProperty(nodeId, 'w', '200')` etc.

### Phase 3: Resize

**Neu zu implementieren:**
1. `ResizeManager` Service
2. Resize-Handles im Preview rendern
3. Size-Indicator UI
4. Modus-Erkennung (fill/hug/pixel)

### Phase 4: Multi-Select & Gruppieren

**Änderungen:**
1. `StateSelectionAdapter` auf `Set<string>` erweitern
2. Shift+Click Handler in Preview
3. `GroupingService` neu
4. `CodeModifier.wrapInContainer()` neu

### Phase 5: Grid

**Komplett neu:**
1. Grid-Erkennung in IR (bereits `grid` Property vorhanden)
2. Grid-Bounds-Berechnung
3. Grid-Drop-Targeting
4. Grid-Controls Panel

---

## 8. Risiko-Bewertung (aktualisiert)

| Risiko | Bewertung | Mitigation |
|--------|-----------|------------|
| Sibling-Insertion | ✅ Niedrig | Bereits vorhanden, nur Threshold anpassen |
| CodeModifier-API | ✅ Niedrig | Robust, nur erweitern |
| Multi-Select | ⚠️ Mittel | StateSelectionAdapter refactoren |
| Resize | ⚠️ Mittel | Neue UI-Komponente, aber klare API |
| Grid | ⚠️ Mittel | IR-Support vorhanden, UI neu |

---

## 9. Nächste Schritte

Da Sibling-Insertion bereits vorhanden ist, können wir **Phase 1 überspringen** oder nur den Threshold anpassen.

**Empfehlung:** Direkt mit **Phase 2 (Smart Sizing)** beginnen, da:
1. Größter UX-Gewinn
2. Baut auf bestehenden APIs auf
3. Keine UI-Änderungen nötig (nur Drop-Logik)

---

## Anhang: Datei-Referenzen

| Datei | LOC | Funktion |
|-------|-----|----------|
| `src/studio/drag-drop-manager.ts` | 474 | Drag & Drop Orchestration |
| `src/studio/drop-zone-calculator.ts` | 655 | Targeting + Indikatoren |
| `src/studio/selection-manager.ts` | 224 | Single-Select (deprecated) |
| `src/studio/source-map.ts` | 315 | Node ↔ Source Mapping |
| `src/studio/code-modifier.ts` | 1270 | Source Code Editing |
| `src/studio/line-property-parser.ts` | 445 | Property Parsing |
| `src/ir/index.ts` | 1821 | IR Transform |
| `src/ir/types.ts` | 127 | IR Type Definitions |
