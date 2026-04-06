# Drag & Drop: Absolute Positionierung

Konzeptdokument für die Erweiterung des Drag-and-Drop-Systems um absolute Positionierung in `stacked` Containern.

## Ausgangslage

Das aktuelle Drag-and-Drop-System unterstützt:
- **Flex-Container mit Kindern:** Index-basiertes Einfügen zwischen Geschwistern
- **Leere Container:** Einfügen als erstes Kind
- **Leaf Elements:** Einfügen als Geschwister (vor/nach)

Was fehlt:
- **Stacked Container:** Absolute Positionierung mit x/y Koordinaten

Der `TargetDetector` erkennt bereits `layoutType: 'positioned'`, aber die `SimpleInsideStrategy` behandelt diese wie leere Flex-Container – ohne Koordinaten.

---

## Teil 1: Risikoanalyse

### Risiko 1: Zwei fundamental verschiedene Visual-Systeme

**Problem:** Die visuelle Rückmeldung unterscheidet sich komplett.

| Aspekt | Flex | Absolut (stacked) |
|--------|------|-------------------|
| Indicator | Linie zwischen Kindern | Ghost in korrekter Größe |
| Position | Diskret (Index 0, 1, 2...) | Kontinuierlich (x: 147, y: 83) |
| Feedback | "Hier wird eingefügt" | "Hier liegt es" |
| Größe | Irrelevant | Muss bekannt sein |

**Konsequenz:** Der Visual-Code wird komplex mit vielen Verzweigungen. Jede Änderung kann den anderen Modus brechen.

**Schwere:** Hoch | **Wahrscheinlichkeit:** Hoch

---

### Risiko 2: Ghost-Element Größe unbekannt

**Problem:** Bei Palette-Drops (neue Komponente) ist die finale Größe nicht bekannt.

Beispiele:
- `Button "OK"` → ~60x40px
- `Button "Jetzt kaufen und 20% sparen"` → ~250x40px
- `Frame` mit Kindern → komplett unbekannt

**Konsequenz:** Ghost ist falsch dimensioniert, User-Erwartung wird verletzt.

**Schwere:** Mittel | **Wahrscheinlichkeit:** Hoch

---

### Risiko 3: Container-Typ-Wechsel während Drag

**Problem:** User zieht Element, Maus wandert von `stacked` über `flex` Container.

```mirror
Frame stacked           ←  Ghost-Modus
  Frame hor, gap 8      ←  Linien-Modus (plötzlicher Wechsel!)
    Button "A"
    Button "B"
```

**Konsequenz:** Abrupter Wechsel zwischen Ghost und Linie führt zu Flackern, Instabilität, verwirrender UX.

**Schwere:** Hoch | **Wahrscheinlichkeit:** Hoch

---

### Risiko 4: Koordinaten-System Komplexität

**Problem:** Die Umrechnung Cursor-Position → Element-Position ist nicht trivial.

Faktoren:
- Container hat eigenes Offset (`getBoundingClientRect`)
- Container kann gescrollt sein (`scrollLeft`, `scrollTop`)
- Container kann Padding haben
- Preview kann gezoomt sein
- Soll Element zentriert unter Cursor liegen? Oder Ecke?

**Konsequenz:** x/y stimmen nicht mit Preview überein – "es liegt nicht wo ich es hingelegt habe".

**Schwere:** Mittel | **Wahrscheinlichkeit:** Mittel

---

### Risiko 5: State-Explosion

**Problem:** Der aktuelle State ist einfach:

```typescript
currentResult: {
  placement: 'before' | 'after' | 'inside'
  targetId: string
  insertionIndex?: number
}
```

Mit absoluter Positionierung wird er komplex:

```typescript
currentResult: {
  mode?: 'flex' | 'absolute'
  placement?: 'before' | 'after' | 'inside'
  insertionIndex?: number
  x?: number
  y?: number
  width?: number
  height?: number
}
```

**Konsequenz:** Jede Funktion muss beide Modi handhaben. Vergessene Fälle führen zu Crashes oder falschem Verhalten.

**Schwere:** Mittel | **Wahrscheinlichkeit:** Mittel

---

### Risiko 6: CodeModifier-Änderungen

**Problem:** Aktuell fügt CodeModifier Nodes ein, setzt aber keine Properties dynamisch.

```typescript
// Heute
addChild(parentId, "Button", { properties: "bg #2563eb" })

// Gebraucht für Absolute
addChild(parentId, "Button", { properties: "x 147, y 83" })
// ODER bei Move:
moveNode(sourceId, targetId, 'inside', { x: 147, y: 83 })
```

**Konsequenz:** CodeModifier-Änderungen können bestehende Funktionalität brechen.

**Schwere:** Hoch | **Wahrscheinlichkeit:** Mittel

---

### Risiko 7: Verschachtelte stacked Container

**Problem:** Koordinaten-Referenz ist unklar.

```mirror
Frame stacked
  Frame stacked, x 50, y 50
    // Drop hier → x/y relativ zu welchem Container?
```

**Konsequenz:** Koordinaten werden relativ zum falschen Parent berechnet, Element erscheint woanders.

**Schwere:** Mittel | **Wahrscheinlichkeit:** Mittel

---

### Risiko 8: Kein Modus-Indikator für User

**Problem:** Woher weiß der User, ob er gerade in Flex- oder Absolut-Modus droppt?

In Figma ist es klar: Auto-Layout Frame vs normaler Frame sind visuell unterscheidbar (Icon, Rahmen).

**Konsequenz:** User erwartet Flex, bekommt Absolut (oder umgekehrt) → Frustration, unvorhersehbares Verhalten.

**Schwere:** Mittel | **Wahrscheinlichkeit:** Hoch

---

### Risiko-Matrix

| Risiko | Schwere | Wahrscheinlichkeit | Priorität |
|--------|---------|-------------------|-----------|
| Visual-System Komplexität | Hoch | Hoch | **Kritisch** |
| Modus-Wechsel während Drag | Hoch | Hoch | **Kritisch** |
| Ghost-Größe unbekannt | Mittel | Hoch | Hoch |
| Kein Modus-Indikator | Mittel | Hoch | Hoch |
| Koordinaten-Berechnung | Mittel | Mittel | Mittel |
| State-Explosion | Mittel | Mittel | Mittel |
| CodeModifier-Änderungen | Hoch | Mittel | Mittel |
| Verschachtelte Container | Mittel | Mittel | Mittel |

---

## Teil 2: Architektur-Prinzipien

Die Architektur folgt einem zentralen Prinzip: **Modell + Dünner UI-Layer**.

### Das Kernprinzip

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   Cursor + Source + Layout  ──→  calculateDragModel()       │
│                                         │                   │
│                                         ▼                   │
│                                    DragModel                │
│                                         │                   │
│                                         ▼                   │
│                                  DragRenderer               │
│                              (trivial, kaum testbar nötig)  │
│                                         │                   │
│                                         ▼                   │
│                                       DOM                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

1. **Die Logik ist eine pure Function:** `(cursor, source, layout) → DragModel`
2. **Das Modell beschreibt vollständig** was auf dem Bildschirm sein soll
3. **Der UI-Layer ist trivial:** Er übersetzt nur `model.x → element.style.left`

---

### Prinzip 1: Discriminated Unions für Type Safety

**Aus Risiko 5:** Der Compiler erzwingt Vollständigkeit.

```typescript
// ═══════════════════════════════════════════════════════════════════════
// TYPEN - Discriminated Unions statt optionaler Felder
// ═══════════════════════════════════════════════════════════════════════

type DropResult = FlexDropResult | AbsoluteDropResult

interface FlexDropResult {
  mode: 'flex'
  targetId: string
  placement: 'before' | 'after' | 'inside'
  insertionIndex: number
}

interface AbsoluteDropResult {
  mode: 'absolute'
  targetId: string
  x: number
  y: number
}

// Verwendung mit Exhaustive Check
function handleDrop(result: DropResult) {
  switch (result.mode) {
    case 'flex':
      // TypeScript weiß: result hat placement, insertionIndex
      return handleFlexDrop(result)
    case 'absolute':
      // TypeScript weiß: result hat x, y
      return handleAbsoluteDrop(result)
    default:
      const _exhaustive: never = result
      throw new Error(`Unhandled mode: ${_exhaustive}`)
  }
}
```

---

### Prinzip 2: Indicator-Typen statt Klassen

**Aus Risiko 1:** Verschiedene Indicators werden durch Datentypen unterschieden, nicht durch Klassen.

```typescript
type IndicatorModel =
  | { type: 'line'; x: number; y: number; orientation: 'hor' | 'ver'; length: number }
  | { type: 'ghost'; x: number; y: number; width: number; height: number; opacity: number }
  | { type: 'outline'; x: number; y: number; width: number; height: number }
```

Der Renderer entscheidet anhand des `type`-Feldes, wie er rendert. Keine Factory, keine Vererbung.

---

### Prinzip 3: Größen-Defaults für Ghost-Elemente

**Aus Risiko 2:** Bekannte Defaults für Palette-Drops.

```typescript
const DEFAULT_SIZES: Record<string, Size> = {
  // Primitives
  Button: { width: 100, height: 40 },
  Input: { width: 200, height: 40 },
  Textarea: { width: 200, height: 100 },
  Text: { width: 80, height: 24 },
  Icon: { width: 24, height: 24 },
  Image: { width: 150, height: 100 },
  Frame: { width: 100, height: 100 },

  // Zag Components
  Dialog: { width: 400, height: 300 },
  Select: { width: 200, height: 40 },
  Tabs: { width: 300, height: 200 },
}

// Die Palette-Komponente setzt source.size beim Drag-Start:
// - Canvas-Source: echte Größe aus DOM (getBoundingClientRect)
// - Palette-Source: DEFAULT_SIZES[componentName] ?? { width: 80, height: 40 }
//
// Die Pure Function calculateDragModel() verwendet dann einfach source.size.
// So bleibt die Logik in der UI-Schicht, die Pure Function ist simpler.
```

---

### Prinzip 4: Debounced Modus-Wechsel

**Aus Risiko 3:** Verzögerung verhindert Flackern bei schnellen Mausbewegungen.

```typescript
const MODE_CHANGE_DELAY_MS = 80

// Im DragDropSystem:
private pendingMode: 'flex' | 'absolute' | null = null
private confirmedMode: 'flex' | 'absolute' | null = null
private modeChangeTimer: ReturnType<typeof setTimeout> | null = null

private handleModeTransition(newModel: DragModel): DragModel {
  const newMode = newModel.containerHighlight?.mode ?? null

  // Gleicher Modus → sofort verwenden
  if (newMode === this.confirmedMode) {
    return newModel
  }

  // Neuer Modus → Timer starten
  if (newMode !== this.pendingMode) {
    this.pendingMode = newMode
    if (this.modeChangeTimer) clearTimeout(this.modeChangeTimer)

    this.modeChangeTimer = setTimeout(() => {
      this.confirmedMode = this.pendingMode
    }, MODE_CHANGE_DELAY_MS)
  }

  // Während Übergang: Altes Modell beibehalten (kein Flackern)
  if (this.confirmedMode !== newMode) {
    return this.lastStableModel  // Letzte stabile Version
  }

  return newModel
}
```

---

### Prinzip 5: Container-Highlighting

**Aus Risiko 8:** User muss Modus erkennen können.

```typescript
interface HighlightModel {
  containerId: string
  mode: 'flex' | 'absolute'
  bounds: Rect
}

// Unterschiedliche Farben je nach Modus:
// - Flex: Blau (rgba(59, 130, 246, 0.3))
// - Absolute: Lila (rgba(139, 92, 246, 0.5)) + "stacked" Label
```

---

### Prinzip 6: CodeModifier-Erweiterung ohne Breaking Changes

**Aus Risiko 6:** Neue Methoden, bestehende unberührt.

```typescript
class CodeModifier {
  // ═══════════════════════════════════════════════════════════
  // BESTEHENDE METHODEN (unverändert)
  // ═══════════════════════════════════════════════════════════

  moveNode(sourceNodeId: string, targetId: string, placement: string, insertionIndex?: number): ModifyResult
  addChild(parentId: string, componentName: string, options?: AddChildOptions): ModifyResult

  // ═══════════════════════════════════════════════════════════
  // NEUE METHODEN (für absolute Positionierung)
  // ═══════════════════════════════════════════════════════════

  moveNodeAbsolute(sourceNodeId: string, targetId: string, position: { x: number; y: number }): ModifyResult
  addChildAbsolute(parentId: string, componentName: string, position: { x: number; y: number }, options?: AddChildOptions): ModifyResult
  updateNodePosition(nodeId: string, position: { x: number; y: number }): ModifyResult
}
```

---

## Teil 3: Dateistruktur

```
studio/drag-drop/
├── index.ts                      # Public API
│
├── types.ts                      # Alle Typen
│   - Point, Size, Rect, Padding
│   - DragSource
│   - LayoutInfo, ContainerInfo
│   - DragModel, IndicatorModel, HighlightModel
│   - DropResult (FlexDropResult | AbsoluteDropResult)
│   - CodeModifier, ModifyResult
│   - DEFAULT_SIZES
│
├── calculate.ts                  # Pure Functions (alles in einer Datei)
│   - calculateDragModel()        # Haupt-Entry-Point
│   - findTargetContainer()       # Hit-Testing
│   - calculateAbsoluteModel()    # Ghost + AbsoluteDropResult
│   - calculateEmptyFlexModel()   # Outline + FlexDropResult
│   - calculateFlexWithChildrenModel()  # Line + FlexDropResult
│
├── layout-reader.ts              # readLayoutFromDOM() - einzige DOM-Abhängigkeit
│
├── renderer.ts                   # DragRenderer - triviale Modell→DOM Übersetzung
│
├── system.ts                     # DragDropSystem - Orchestrierung + Debouncing
│
└── executor.ts                   # DefaultCodeExecutor - Dispatch zu CodeModifier

compiler/studio/
└── code-modifier.ts              # + moveNodeAbsolute, addChildAbsolute, updateNodePosition
```

**Warum flache Struktur?** Weniger Indirektion, einfacher zu navigieren. Die Dateien sind klein genug für eine flache Hierarchie.

---

## Teil 4: Implementierungsplan

### Phase 1: Types & Pure Functions

**Ziel:** Gesamte Logik implementieren, testbar ohne DOM.

1. **types.ts** erstellen
   - Alle Discriminated Unions
   - Alle Interfaces
   - DEFAULT_SIZES Map

2. **calculate.ts** implementieren
   - `calculateDragModel()` als Haupt-Entry-Point
   - `findTargetContainer()` für Hit-Testing
   - `calculateAbsoluteModel()` für Ghost + AbsoluteDropResult
   - `calculateEmptyFlexModel()` für Outline + FlexDropResult
   - `calculateFlexWithChildrenModel()` für Line + FlexDropResult
   - Alle Funktionen sind pure: Input → Output

3. **Unit Tests** für alle Pure Functions
   - Kein DOM, kein Browser
   - Nur Daten rein, Daten raus

### Phase 2: Layout Reader

**Ziel:** DOM einmal lesen, dann pure berechnen.

1. **layout-reader.ts** implementieren
   - `readLayoutFromDOM()` extrahiert alle Container-Infos
   - Zoom, Scroll, Padding berücksichtigen

2. **Integration Tests** mit JSDOM
   - Einfache DOM-Strukturen aufbauen
   - Layout-Extraktion verifizieren

### Phase 3: Renderer

**Ziel:** Trivialer Modell→DOM Layer.

1. **renderer.ts** implementieren
   - `DragRenderer.render(model)`
   - Indicator-Element erstellen/updaten/entfernen
   - Highlight-Element erstellen/updaten/entfernen

2. **Manuelle Tests** im Browser
   - Renderer ist so einfach, dass automatische Tests wenig Wert haben

### Phase 4: System & Debouncing

**Ziel:** Alles zusammenführen mit sanften Übergängen.

1. **system.ts** implementieren
   - `DragDropSystem` Klasse
   - `startDrag()`: Layout lesen
   - `updateCursor()`: Model berechnen + debounced rendern
   - `drop()`: CodeExecutor aufrufen
   - `cancel()`: Aufräumen
   - `handleModeTransition()`: Debouncing-Logik für Modus-Wechsel

### Phase 5: CodeModifier & Integration

**Ziel:** Drops in Code umwandeln.

1. **CodeModifier erweitern** (in `compiler/studio/code-modifier.ts`)
   - `moveNodeAbsolute()`
   - `addChildAbsolute()`
   - `updateNodePosition()`

2. **executor.ts** implementieren
   - `DefaultCodeExecutor` Klasse
   - Dispatch basierend auf `DropResult.mode`

3. **E2E Tests** mit Playwright
   - Voller User-Flow
   - Drop in stacked → x/y im Code

---

## Teil 5: Test-Strategie

### Unit Tests (90% der Tests)

Alle Pure Functions in `calculate.ts` werden ohne DOM getestet:

```typescript
// calculate.test.ts
describe('calculateDragModel', () => {

  describe('stacked container', () => {
    it('erzeugt Ghost-Indicator', () => {
      const layout = createLayout([
        { id: 'frame-1', type: 'stacked', bounds: { x: 100, y: 100, width: 400, height: 300 } }
      ])
      const source = createPaletteSource('Button', { width: 100, height: 40 })

      const model = calculateDragModel({ x: 250, y: 200 }, source, layout)

      // Berechnung:
      // relativeX = (cursor.x - container.x) / zoom - width/2 = (250-100)/1 - 50 = 100
      // relativeY = (cursor.y - container.y) / zoom - height/2 = (200-100)/1 - 20 = 80
      // screenX = container.x + clampedX * zoom = 100 + 100 * 1 = 200
      // screenY = container.y + clampedY * zoom = 100 + 80 * 1 = 180
      expect(model.indicator).toEqual({
        type: 'ghost',
        x: 200,      // Screen-Position
        y: 180,      // Screen-Position
        width: 100,
        height: 40,
        opacity: 0.6
      })
    })

    it('erzeugt AbsoluteDropResult mit relativen Koordinaten', () => {
      const layout = createLayout([
        { id: 'frame-1', type: 'stacked', bounds: { x: 100, y: 100, width: 400, height: 300 } }
      ])
      const source = createPaletteSource('Button', { width: 100, height: 40 })

      const model = calculateDragModel({ x: 250, y: 200 }, source, layout)

      // DropResult enthält Position relativ zum Container (nicht Screen)
      // x = (cursor.x - container.x) / zoom - width/2 = 100
      // y = (cursor.y - container.y) / zoom - height/2 = 80
      expect(model.dropResult).toEqual({
        mode: 'absolute',
        targetId: 'frame-1',
        x: 100,      // Relativ zum Container
        y: 80        // Relativ zum Container
      })
    })
  })

  describe('flex container mit Kindern', () => {
    it('erzeugt Line-Indicator zwischen Kindern', () => {
      const layout = createLayout([{
        id: 'frame-1',
        type: 'flex',
        direction: 'horizontal',
        bounds: { x: 100, y: 100, width: 300, height: 60 },
        gap: 8,
        children: [
          { id: 'btn-1', bounds: { x: 100, y: 110, width: 80, height: 40 } },
          { id: 'btn-2', bounds: { x: 188, y: 110, width: 80, height: 40 } }
        ]
      }])
      const source = createPaletteSource('Button', { width: 100, height: 40 })

      // Cursor zwischen btn-1 (endet bei 180) und btn-2 (startet bei 188)
      const model = calculateDragModel({ x: 184, y: 130 }, source, layout)

      expect(model.indicator?.type).toBe('line')
      expect(model.indicator?.orientation).toBe('ver')
    })

    it('erzeugt FlexDropResult mit korrektem Index', () => {
      const layout = createLayout([{
        id: 'frame-1',
        type: 'flex',
        direction: 'horizontal',
        bounds: { x: 100, y: 100, width: 300, height: 60 },
        gap: 8,
        children: [
          { id: 'btn-1', bounds: { x: 100, y: 110, width: 80, height: 40 } },
          { id: 'btn-2', bounds: { x: 188, y: 110, width: 80, height: 40 } }
        ]
      }])
      const source = createPaletteSource('Button', { width: 100, height: 40 })

      // Cursor nach btn-1 Midpoint (140), vor btn-2 Midpoint (228)
      const model = calculateDragModel({ x: 184, y: 130 }, source, layout)

      expect(model.dropResult).toEqual({
        mode: 'flex',
        targetId: 'frame-1',
        placement: 'inside',
        insertionIndex: 1   // Zwischen btn-1 und btn-2
      })
    })
  })

  describe('leerer flex container', () => {
    it('erzeugt Outline-Indicator', () => {
      const layout = createLayout([{
        id: 'frame-1',
        type: 'flex',
        direction: 'vertical',
        bounds: { x: 100, y: 100, width: 200, height: 200 },
        children: []
      }])
      const source = createPaletteSource('Button', { width: 100, height: 40 })

      const model = calculateDragModel({ x: 200, y: 200 }, source, layout)

      expect(model.indicator).toEqual({
        type: 'outline',
        x: 100,
        y: 100,
        width: 200,
        height: 200
      })
    })

    it('erzeugt FlexDropResult mit insertionIndex 0', () => {
      const layout = createLayout([{
        id: 'frame-1',
        type: 'flex',
        direction: 'vertical',
        bounds: { x: 100, y: 100, width: 200, height: 200 },
        children: []
      }])
      const source = createPaletteSource('Button', { width: 100, height: 40 })

      const model = calculateDragModel({ x: 200, y: 200 }, source, layout)

      expect(model.dropResult).toEqual({
        mode: 'flex',
        targetId: 'frame-1',
        placement: 'inside',
        insertionIndex: 0
      })
    })
  })

  describe('kein container unter cursor', () => {
    it('erzeugt leeres Modell', () => {
      const layout = createLayout([{
        id: 'frame-1',
        type: 'flex',
        bounds: { x: 100, y: 100, width: 200, height: 200 },
        children: []
      }])
      const source = createPaletteSource('Button', { width: 100, height: 40 })

      // Cursor außerhalb
      const model = calculateDragModel({ x: 50, y: 50 }, source, layout)

      expect(model.indicator).toBeNull()
      expect(model.containerHighlight).toBeNull()
      expect(model.dropResult).toBeNull()
    })
  })

  describe('modus-wechsel', () => {
    it('wechselt Indicator-Typ bei Container-Wechsel', () => {
      const layout = createLayout([
        { id: 'stacked', type: 'stacked', bounds: { x: 0, y: 0, width: 200, height: 300 } },
        { id: 'flex', type: 'flex', bounds: { x: 200, y: 0, width: 200, height: 300 }, children: [] }
      ])
      const source = createPaletteSource('Button', { width: 100, height: 40 })

      const model1 = calculateDragModel({ x: 100, y: 150 }, source, layout)
      expect(model1.indicator?.type).toBe('ghost')
      expect(model1.containerHighlight?.mode).toBe('absolute')

      const model2 = calculateDragModel({ x: 300, y: 150 }, source, layout)
      expect(model2.indicator?.type).toBe('outline')
      expect(model2.containerHighlight?.mode).toBe('flex')
    })
  })

  describe('scroll handling', () => {
    it('Ghost-Position ist unabhängig von Scroll, dropResult enthält Scroll-Offset', () => {
      // Container mit scrollTop: 50 (User hat 50px nach unten gescrollt)
      const layout = createLayout([{
        id: 'frame-1',
        type: 'stacked',
        bounds: { x: 100, y: 100, width: 400, height: 300 },
        scrollLeft: 0,
        scrollTop: 50
      }])
      const source = createPaletteSource('Button', { width: 100, height: 40 })

      // Cursor bei (250, 200) - gleiche Position wie im Test ohne Scroll
      const model = calculateDragModel({ x: 250, y: 200 }, source, layout)

      // Ghost-Position ist GLEICH wie ohne Scroll (Screen-Koordinaten)
      // screenRelativeX = (250-100)/1 - 50 = 100
      // screenRelativeY = (200-100)/1 - 20 = 80
      // ghostScreenX = 100 + 100 = 200
      // ghostScreenY = 100 + 80 = 180
      expect(model.indicator).toMatchObject({
        type: 'ghost',
        x: 200,    // Unverändert durch Scroll
        y: 180     // Unverändert durch Scroll
      })

      // dropResult enthält Scroll-Offset (lokale Koordinaten für Code)
      // dropX = 100 + 0 = 100
      // dropY = 80 + 50 = 130  ← scrollTop addiert!
      expect(model.dropResult).toEqual({
        mode: 'absolute',
        targetId: 'frame-1',
        x: 100,    // Unverändert (kein scrollLeft)
        y: 130     // 80 + 50 scrollTop = 130
      })
    })

    it('horizontaler Scroll wird zu dropResult.x addiert', () => {
      const layout = createLayout([{
        id: 'frame-1',
        type: 'stacked',
        bounds: { x: 100, y: 100, width: 400, height: 300 },
        scrollLeft: 100,
        scrollTop: 0
      }])
      const source = createPaletteSource('Button', { width: 100, height: 40 })

      const model = calculateDragModel({ x: 250, y: 200 }, source, layout)

      // dropX = screenClampedX + scrollLeft = 100 + 100 = 200
      expect(model.dropResult).toMatchObject({
        x: 200,    // 100 + 100 scrollLeft
        y: 80      // Unverändert (kein scrollTop)
      })
    })
  })
})

// Test-Helpers
function createLayout(containers: any[]): LayoutInfo {
  return {
    zoom: 1,
    containers: containers.map(c => ({
      id: c.id,
      type: c.type ?? 'flex',
      direction: c.direction ?? 'vertical',
      screenBounds: c.bounds,
      localBounds: { x: 0, y: 0, width: c.bounds.width, height: c.bounds.height },
      padding: c.padding ?? { top: 0, right: 0, bottom: 0, left: 0 },
      gap: c.gap ?? 0,
      scrollLeft: c.scrollLeft ?? 0,
      scrollTop: c.scrollTop ?? 0,
      children: (c.children ?? []).map((child: any) => ({
        id: child.id,
        type: 'flex',
        direction: 'vertical',
        screenBounds: child.bounds,
        localBounds: { x: 0, y: 0, width: child.bounds.width, height: child.bounds.height },
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        gap: 0,
        scrollLeft: 0,
        scrollTop: 0,
        children: []
      }))
    }))
  }
}

function createPaletteSource(componentName: string, size: Size): DragSource {
  return { type: 'palette', componentName, size }
}
```

### Integration Tests

```typescript
// layout-reader.test.ts (mit JSDOM)
describe('readLayoutFromDOM', () => {
  it('extrahiert Container-Hierarchie', () => {
    document.body.innerHTML = `
      <div data-node-id="root" style="position: relative;">
        <div data-node-id="child-1" style="width: 100px; height: 50px;"></div>
        <div data-node-id="child-2" style="width: 100px; height: 50px;"></div>
      </div>
    `
    const layout = readLayoutFromDOM(document.body.firstChild as HTMLElement)

    expect(layout.containers).toHaveLength(1)
    expect(layout.containers[0].children).toHaveLength(2)
  })

  it('erkennt stacked Container', () => {
    document.body.innerHTML = `
      <div data-node-id="stacked" data-stacked="true" style="position: relative;">
        <div data-node-id="child" style="position: absolute;"></div>
      </div>
    `
    const layout = readLayoutFromDOM(document.body.firstChild as HTMLElement)

    expect(layout.containers[0].type).toBe('stacked')
  })
})
```

### E2E Tests

```typescript
// e2e/drag-drop-absolute.spec.ts (Playwright)
test('Drop in stacked Container setzt x/y Position', async ({ page }) => {
  await page.goto('/studio')

  // Code eingeben
  await setEditorContent(page, `
Frame stacked, w 400, h 300, bg #1a1a1a
  `)

  // Button aus Palette ziehen
  const palette = page.locator('[data-component="Button"]')
  const preview = page.locator('[data-node-id]').first()

  await palette.dragTo(preview, { targetPosition: { x: 150, y: 100 } })

  // Code prüfen
  const code = await getEditorContent(page)
  expect(code).toContain('Button')
  expect(code).toMatch(/x \d+/)
  expect(code).toMatch(/y \d+/)
})

test('Modus-Wechsel zeigt unterschiedliche Highlights', async ({ page }) => {
  await page.goto('/studio')

  await setEditorContent(page, `
Frame hor, gap 16
  Frame stacked, w 200, h 200, bg #1a1a1a
  Frame w 200, h 200, bg #2a2a2a
    Button "A"
  `)

  // Drag starten
  const palette = page.locator('[data-component="Button"]')
  await palette.hover()
  await page.mouse.down()

  // Über stacked Container
  await page.mouse.move(200, 200)
  await expect(page.locator('.drag-highlight--absolute')).toBeVisible()

  // Über flex Container
  await page.mouse.move(400, 200)
  await expect(page.locator('.drag-highlight--flex')).toBeVisible()

  await page.mouse.up()
})
```

### Test-Pyramide

```
                    ┌─────────────────────┐
                    │      E2E Tests      │  5%
                    │   (Playwright)      │  - User Flows
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Integration Tests  │  5%
                    │   (JSDOM)           │  - Layout Reader
                    └──────────┬──────────┘
                               │
     ┌─────────────────────────┴─────────────────────────┐
     │                                                   │
┌────▼────────────────────────────────────────────────────▼────┐
│                      UNIT TESTS                              │  90%
│                                                              │
│  calculateDragModel    findTarget    flexInsertion    etc.   │
│                                                              │
│              Kein DOM, kein Browser, Millisekunden           │
└──────────────────────────────────────────────────────────────┘
```

---

## Teil 6: Risiko-Mitigationen

| Risiko | Mitigation | Implementiert in |
|--------|------------|------------------|
| Visual-Komplexität | Discriminated Unions für Indicator-Typen | Phase 1 |
| Modus-Wechsel Flackern | Debounced Mode Transition | Phase 4 |
| Ghost-Größe unbekannt | DEFAULT_SIZES Map | Phase 1 |
| Koordinaten falsch | Pure Function + umfangreiche Unit Tests | Phase 1 |
| State-Explosion | Discriminated Unions | Phase 1 |
| CodeModifier Regression | Neue Methoden, alte unberührt + Tests | Phase 5 |
| Verschachtelte Container | findTargetContainer sucht von innen nach außen | Phase 1 |
| User weiß Modus nicht | ContainerHighlight mit unterschiedlichen Farben | Phase 3 |

---

## Teil 7: Offene Entscheidungen

### 1. Ghost-Positionierung

**Option A:** Element-Ecke unter Cursor
- Pro: Präzise Kontrolle
- Con: Weniger intuitiv

**Option B:** Element-Mitte unter Cursor (empfohlen)
- Pro: Intuitiver, wie Figma
- Con: Edge-Cases bei großen Elementen

### 2. Snap-to-Grid

**Option A:** Immer an (8px Grid)
- Pro: Saubere Werte
- Con: Weniger Flexibilität

**Option B:** Mit Shift-Taste (empfohlen)
- Pro: User hat Kontrolle
- Con: Mehr Implementierungsaufwand

**Option C:** Konfigurierbar in Settings
- Pro: Maximale Flexibilität
- Con: Mehr UI nötig

### 3. Negative Koordinaten

**Option A:** Erlauben
- Pro: Maximale Flexibilität
- Con: Kann verwirrend sein

**Option B:** Auf 0 clampen (empfohlen)
- Pro: Vorhersagbar
- Con: Einschränkung

### 4. Außerhalb Container droppen

**Option A:** Verhindern (kein Drop)
- Pro: Kein ungültiger State
- Con: Kann frustrierend sein

**Option B:** An Rand clampen (empfohlen)
- Pro: Drop immer möglich
- Con: Position nicht exakt wie erwartet

### 5. Padding-Behandlung bei absoluter Positionierung

Der Layout-Reader liest Padding, aber es wird aktuell nicht in Berechnungen verwendet.

**Option A:** Padding ignorieren (aktuell)
- Pro: Einfacher
- Con: x: 0, y: 0 liegt exakt am Container-Rand

**Option B:** Padding als Mindest-Offset
- Pro: Visuell sauberer (Elemente nicht am Rand gequetscht)
- Con: Mehr Logik

**Option C:** Content-Area als Drop-Zone (empfohlen für später)
- x: 0 = links des Padding-Bereichs
- Clamping berücksichtigt Padding: `max(padding.left, ...)`
- Pro: Konsistent mit CSS Box-Model
- Con: Implementierungsaufwand

**Empfehlung:** Mit Option A starten, später zu Option C erweitern wenn nötig.

---

## Teil 8: Vollständige Typen & Implementierung

### Typen

```typescript
// types.ts

// ═══════════════════════════════════════════════════════════════════════
// GRUNDTYPEN
// ═══════════════════════════════════════════════════════════════════════

interface Point {
  x: number
  y: number
}

interface Size {
  width: number
  height: number
}

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

interface Padding {
  top: number
  right: number
  bottom: number
  left: number
}

// ═══════════════════════════════════════════════════════════════════════
// DRAG SOURCE
// ═══════════════════════════════════════════════════════════════════════

type DragSource =
  | { type: 'palette'; componentName: string; size: Size }
  | { type: 'canvas'; nodeId: string; size: Size }

// ═══════════════════════════════════════════════════════════════════════
// LAYOUT INFO (aus DOM gelesen)
// ═══════════════════════════════════════════════════════════════════════

interface LayoutInfo {
  containers: ContainerInfo[]
  zoom: number
}

interface ContainerInfo {
  id: string
  type: 'flex' | 'stacked'
  direction: 'horizontal' | 'vertical'
  screenBounds: Rect       // Position auf Bildschirm (für Hit-Test)
  localBounds: Rect        // Ungezoomed (für max-Clamping, aktuell ungenutzt)
  padding: Padding         // Für zukünftige Content-Area Berechnung
  gap: number
  scrollLeft: number       // Scroll-Offset horizontal
  scrollTop: number        // Scroll-Offset vertikal
  children: ContainerInfo[]
}

// ═══════════════════════════════════════════════════════════════════════
// DRAG MODEL (Output der Pure Function)
// ═══════════════════════════════════════════════════════════════════════

interface DragModel {
  phase: 'idle' | 'dragging'
  indicator: IndicatorModel | null
  containerHighlight: HighlightModel | null
  dropResult: DropResult | null
}

type IndicatorModel =
  | { type: 'line'; x: number; y: number; orientation: 'hor' | 'ver'; length: number }
  | { type: 'ghost'; x: number; y: number; width: number; height: number; opacity: number }
  | { type: 'outline'; x: number; y: number; width: number; height: number }

interface HighlightModel {
  containerId: string
  mode: 'flex' | 'absolute'
  bounds: Rect
}

// ═══════════════════════════════════════════════════════════════════════
// DROP RESULT (Discriminated Union)
// ═══════════════════════════════════════════════════════════════════════

type DropResult = FlexDropResult | AbsoluteDropResult

interface FlexDropResult {
  mode: 'flex'
  targetId: string
  placement: 'before' | 'after' | 'inside'
  insertionIndex: number
}

interface AbsoluteDropResult {
  mode: 'absolute'
  targetId: string
  x: number
  y: number
}

// ═══════════════════════════════════════════════════════════════════════
// CODE MODIFIER (bereits vorhanden, hier Interface-Definition)
// ═══════════════════════════════════════════════════════════════════════

interface ModifyResult {
  success: boolean
  newCode?: string
  error?: string
}

interface AddChildOptions {
  position?: number
  properties?: string
}

interface CodeModifier {
  // Bestehende Methoden
  moveNode(sourceNodeId: string, targetId: string, placement: string, insertionIndex?: number): ModifyResult
  addChild(parentId: string, componentName: string, options?: AddChildOptions): ModifyResult

  // Neue Methoden für absolute Positionierung
  moveNodeAbsolute(sourceNodeId: string, targetId: string, position: { x: number; y: number }): ModifyResult
  addChildAbsolute(parentId: string, componentName: string, position: { x: number; y: number }, options?: AddChildOptions): ModifyResult
  updateNodePosition(nodeId: string, position: { x: number; y: number }): ModifyResult
}

// ═══════════════════════════════════════════════════════════════════════
// DEFAULT SIZES (für Palette-Drops)
// ═══════════════════════════════════════════════════════════════════════

// Wird von der Palette-Komponente beim Drag-Start verwendet, um source.size zu setzen.
// Die Pure Functions in calculate.ts verwenden dann einfach source.size.
export const DEFAULT_SIZES: Record<string, Size> = {
  // Primitives
  Button: { width: 100, height: 40 },
  Input: { width: 200, height: 40 },
  Textarea: { width: 200, height: 100 },
  Text: { width: 80, height: 24 },
  Icon: { width: 24, height: 24 },
  Image: { width: 150, height: 100 },
  Frame: { width: 100, height: 100 },

  // Zag Components
  Dialog: { width: 400, height: 300 },
  Select: { width: 200, height: 40 },
  Tabs: { width: 300, height: 200 },
}
```

---

### Haupt-Pure-Function

```typescript
// calculate.ts

import { Point, Size, Rect, DragSource, LayoutInfo, ContainerInfo, DragModel } from './types'

/**
 * Haupt-Entry-Point: Berechnet das komplette DragModel.
 * Pure Function - keine Seiteneffekte, keine DOM-Zugriffe.
 */
export function calculateDragModel(
  cursor: Point,
  source: DragSource,
  layout: LayoutInfo
): DragModel {
  // 1. Finde Container unter Cursor (von innen nach außen)
  const target = findTargetContainer(cursor, layout.containers)

  // Kein Container gefunden
  if (!target) {
    return {
      phase: 'dragging',
      indicator: null,
      containerHighlight: null,
      dropResult: null
    }
  }

  const sourceSize = source.size

  // 2. Stacked Container → Absolute Positioning
  if (target.type === 'stacked') {
    return calculateAbsoluteModel(cursor, target, sourceSize, layout.zoom)
  }

  // 3. Flex Container
  if (target.children.length === 0) {
    // Leerer Container → Outline
    return calculateEmptyFlexModel(target)
  }

  // Mit Kindern → Linie zwischen Kindern
  return calculateFlexWithChildrenModel(cursor, target, layout.zoom)
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER: Target finden
// ═══════════════════════════════════════════════════════════════════════

function findTargetContainer(
  cursor: Point,
  containers: ContainerInfo[]
): ContainerInfo | null {
  // Von innen nach außen suchen (tiefstes Element zuerst)
  for (const container of containers) {
    if (isPointInRect(cursor, container.screenBounds)) {
      // Rekursiv in Kindern suchen
      const child = findTargetContainer(cursor, container.children)
      if (child) return child
      return container
    }
  }
  return null
}

function isPointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER: Absolute Model (für stacked Container)
// ═══════════════════════════════════════════════════════════════════════

function calculateAbsoluteModel(
  cursor: Point,
  container: ContainerInfo,
  elementSize: Size,
  zoom: number
): DragModel {
  // 1. Screen-Position für Ghost (wo der User die Maus hat)
  //    Element zentriert unter Cursor, OHNE Scroll-Offset
  const screenRelativeX = (cursor.x - container.screenBounds.x) / zoom - elementSize.width / 2
  const screenRelativeY = (cursor.y - container.screenBounds.y) / zoom - elementSize.height / 2

  // Auf sichtbaren Bereich clampen
  const screenClampedX = Math.max(0, Math.round(screenRelativeX))
  const screenClampedY = Math.max(0, Math.round(screenRelativeY))

  // Ghost-Position in Screen-Koordinaten
  const ghostScreenX = container.screenBounds.x + screenClampedX * zoom
  const ghostScreenY = container.screenBounds.y + screenClampedY * zoom

  // 2. Drop-Position für Code (lokale Koordinaten MIT Scroll-Offset)
  //    Wenn Container gescrollt ist, muss die Position im Code höher sein
  const dropX = screenClampedX + container.scrollLeft
  const dropY = screenClampedY + container.scrollTop

  return {
    phase: 'dragging',
    indicator: {
      type: 'ghost',
      x: ghostScreenX,
      y: ghostScreenY,
      width: elementSize.width * zoom,
      height: elementSize.height * zoom,
      opacity: 0.6
    },
    containerHighlight: {
      containerId: container.id,
      mode: 'absolute',
      bounds: container.screenBounds
    },
    dropResult: {
      mode: 'absolute',
      targetId: container.id,
      x: dropX,
      y: dropY
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER: Leerer Flex Container
// ═══════════════════════════════════════════════════════════════════════

function calculateEmptyFlexModel(container: ContainerInfo): DragModel {
  return {
    phase: 'dragging',
    indicator: {
      type: 'outline',
      x: container.screenBounds.x,
      y: container.screenBounds.y,
      width: container.screenBounds.width,
      height: container.screenBounds.height
    },
    containerHighlight: {
      containerId: container.id,
      mode: 'flex',
      bounds: container.screenBounds
    },
    dropResult: {
      mode: 'flex',
      targetId: container.id,
      placement: 'inside',
      insertionIndex: 0
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER: Flex Container mit Kindern
// ═══════════════════════════════════════════════════════════════════════

function calculateFlexWithChildrenModel(
  cursor: Point,
  container: ContainerInfo,
  zoom: number
): DragModel {
  const isHorizontal = container.direction === 'horizontal'
  const axis = isHorizontal ? 'x' : 'y'
  const crossAxis = isHorizontal ? 'y' : 'x'
  const sizeKey = isHorizontal ? 'width' : 'height'
  const crossSizeKey = isHorizontal ? 'height' : 'width'

  // Finde Einfügeposition
  let insertionIndex = container.children.length  // Default: am Ende

  for (let i = 0; i < container.children.length; i++) {
    const child = container.children[i]
    const midpoint = child.screenBounds[axis] + child.screenBounds[sizeKey] / 2

    if (cursor[axis] < midpoint) {
      insertionIndex = i
      break
    }
  }

  // Berechne Linien-Position
  let linePos: number
  let lineLength: number

  if (insertionIndex === 0) {
    // Vor erstem Kind
    const first = container.children[0]
    linePos = first.screenBounds[axis] - container.gap / 2
    lineLength = first.screenBounds[crossSizeKey]
  } else if (insertionIndex === container.children.length) {
    // Nach letztem Kind
    const last = container.children[container.children.length - 1]
    linePos = last.screenBounds[axis] + last.screenBounds[sizeKey] + container.gap / 2
    lineLength = last.screenBounds[crossSizeKey]
  } else {
    // Zwischen zwei Kindern
    const before = container.children[insertionIndex - 1]
    const after = container.children[insertionIndex]
    linePos = (before.screenBounds[axis] + before.screenBounds[sizeKey] + after.screenBounds[axis]) / 2
    lineLength = Math.max(before.screenBounds[crossSizeKey], after.screenBounds[crossSizeKey])
  }

  // Cross-Axis Position (Mitte der Kinder)
  const firstChild = container.children[0]
  const crossPos = firstChild.screenBounds[crossAxis]

  return {
    phase: 'dragging',
    indicator: {
      type: 'line',
      x: isHorizontal ? linePos : crossPos,
      y: isHorizontal ? crossPos : linePos,
      orientation: isHorizontal ? 'ver' : 'hor',
      length: lineLength
    },
    containerHighlight: {
      containerId: container.id,
      mode: 'flex',
      bounds: container.screenBounds
    },
    dropResult: {
      mode: 'flex',
      targetId: container.id,
      placement: 'inside',
      insertionIndex
    }
  }
}
```

---

### Layout Reader

```typescript
// layout-reader.ts

import { LayoutInfo, ContainerInfo, Rect, Padding } from './types'

/**
 * Liest das Layout einmal aus dem DOM.
 * Das ist die EINZIGE Stelle mit DOM-Abhängigkeit.
 */
export function readLayoutFromDOM(previewContainer: HTMLElement): LayoutInfo {
  const zoom = getZoomLevel(previewContainer)

  function readContainer(element: HTMLElement): ContainerInfo | null {
    const nodeId = element.getAttribute('data-node-id')
    if (!nodeId) return null

    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)

    const isStacked =
      element.hasAttribute('data-stacked') ||
      (style.position === 'relative' && hasAbsoluteChildren(element))

    const children: ContainerInfo[] = []
    for (const child of element.children) {
      if (child instanceof HTMLElement) {
        const childInfo = readContainer(child)
        if (childInfo) children.push(childInfo)
      }
    }

    return {
      id: nodeId,
      type: isStacked ? 'stacked' : 'flex',
      direction: style.flexDirection?.includes('row') ? 'horizontal' : 'vertical',
      screenBounds: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      },
      localBounds: {
        x: 0,
        y: 0,
        width: rect.width / zoom,
        height: rect.height / zoom
      },
      padding: {
        top: parseFloat(style.paddingTop) || 0,
        right: parseFloat(style.paddingRight) || 0,
        bottom: parseFloat(style.paddingBottom) || 0,
        left: parseFloat(style.paddingLeft) || 0
      },
      gap: parseFloat(style.gap) || 0,
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop,
      children
    }
  }

  const rootContainers: ContainerInfo[] = []
  for (const child of previewContainer.children) {
    if (child instanceof HTMLElement) {
      const info = readContainer(child)
      if (info) rootContainers.push(info)
    }
  }

  return { containers: rootContainers, zoom }
}

function getZoomLevel(container: HTMLElement): number {
  const transform = getComputedStyle(container).transform
  if (transform && transform !== 'none') {
    const match = transform.match(/matrix\(([^,]+)/)
    if (match) return parseFloat(match[1])
  }
  return 1
}

function hasAbsoluteChildren(element: HTMLElement): boolean {
  for (const child of element.children) {
    if (child instanceof HTMLElement) {
      const pos = getComputedStyle(child).position
      if (pos === 'absolute') return true
    }
  }
  return false
}
```

---

### Renderer

```typescript
// renderer.ts

import { DragModel, IndicatorModel, HighlightModel } from './types'

/**
 * Trivialer Renderer: Übersetzt Modell → DOM.
 * Keine Logik, nur Style-Zuweisungen.
 */
export class DragRenderer {
  private indicatorEl: HTMLElement | null = null
  private highlightEl: HTMLElement | null = null

  render(model: DragModel): void {
    this.renderIndicator(model.indicator)
    this.renderHighlight(model.containerHighlight)
  }

  private renderIndicator(indicator: IndicatorModel | null): void {
    if (!indicator) {
      this.indicatorEl?.remove()
      this.indicatorEl = null
      return
    }

    if (!this.indicatorEl) {
      this.indicatorEl = document.createElement('div')
      this.indicatorEl.className = 'drag-indicator'
      document.body.appendChild(this.indicatorEl)
    }

    const el = this.indicatorEl
    el.className = `drag-indicator drag-indicator--${indicator.type}`
    el.style.position = 'fixed'
    el.style.left = `${indicator.x}px`
    el.style.top = `${indicator.y}px`
    el.style.pointerEvents = 'none'
    el.style.zIndex = '10000'

    switch (indicator.type) {
      case 'ghost':
        el.style.width = `${indicator.width}px`
        el.style.height = `${indicator.height}px`
        el.style.opacity = `${indicator.opacity}`
        el.style.background = 'rgba(139, 92, 246, 0.2)'
        el.style.border = '2px solid rgba(139, 92, 246, 0.8)'
        el.style.borderRadius = '4px'
        break

      case 'line':
        el.style.width = indicator.orientation === 'hor' ? `${indicator.length}px` : '2px'
        el.style.height = indicator.orientation === 'ver' ? `${indicator.length}px` : '2px'
        el.style.background = '#3b82f6'
        el.style.borderRadius = '1px'
        break

      case 'outline':
        el.style.width = `${indicator.width}px`
        el.style.height = `${indicator.height}px`
        el.style.border = '2px dashed rgba(59, 130, 246, 0.6)'
        el.style.background = 'rgba(59, 130, 246, 0.05)'
        el.style.borderRadius = '4px'
        break
    }
  }

  private renderHighlight(highlight: HighlightModel | null): void {
    if (!highlight) {
      this.highlightEl?.remove()
      this.highlightEl = null
      return
    }

    if (!this.highlightEl) {
      this.highlightEl = document.createElement('div')
      this.highlightEl.className = 'drag-highlight'
      document.body.appendChild(this.highlightEl)
    }

    const el = this.highlightEl
    el.className = `drag-highlight drag-highlight--${highlight.mode}`
    el.style.position = 'fixed'
    el.style.left = `${highlight.bounds.x}px`
    el.style.top = `${highlight.bounds.y}px`
    el.style.width = `${highlight.bounds.width}px`
    el.style.height = `${highlight.bounds.height}px`
    el.style.pointerEvents = 'none'
    el.style.zIndex = '9999'
    el.style.borderRadius = '4px'
    el.style.transition = 'all 0.1s ease'

    if (highlight.mode === 'absolute') {
      el.style.border = '2px dashed rgba(139, 92, 246, 0.5)'
      el.innerHTML = '<span style="position:absolute;top:-18px;left:4px;font-size:10px;color:rgba(139,92,246,0.8);font-family:system-ui">stacked</span>'
    } else {
      el.style.border = '2px dashed rgba(59, 130, 246, 0.3)'
      el.innerHTML = ''
    }
  }

  dispose(): void {
    this.indicatorEl?.remove()
    this.highlightEl?.remove()
    this.indicatorEl = null
    this.highlightEl = null
  }
}
```

---

### System mit Debouncing

```typescript
// system.ts

import { Point, DragSource, DragModel, LayoutInfo, DropResult } from './types'
import { calculateDragModel } from './calculate'
import { readLayoutFromDOM } from './layout-reader'
import { DragRenderer } from './renderer'

const MODE_CHANGE_DELAY_MS = 80
const IDLE_MODEL: DragModel = {
  phase: 'idle',
  indicator: null,
  containerHighlight: null,
  dropResult: null
}

export class DragDropSystem {
  private layout: LayoutInfo | null = null
  private source: DragSource | null = null
  private model: DragModel = IDLE_MODEL
  private renderer = new DragRenderer()

  // Debouncing
  private pendingMode: 'flex' | 'absolute' | null = null
  private confirmedMode: 'flex' | 'absolute' | null = null
  private lastStableModel: DragModel = IDLE_MODEL
  private modeChangeTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private previewContainer: HTMLElement,
    private codeExecutor: CodeExecutor
  ) {}

  startDrag(source: DragSource): void {
    this.layout = readLayoutFromDOM(this.previewContainer)
    this.source = source
    this.pendingMode = null
    this.confirmedMode = null
    this.lastStableModel = IDLE_MODEL
  }

  updateCursor(cursor: Point): void {
    if (!this.layout || !this.source) return

    // Pure Function aufrufen
    const newModel = calculateDragModel(cursor, this.source, this.layout)

    // Debounced Modus-Wechsel
    const modelToRender = this.handleModeTransition(newModel)

    this.model = modelToRender
    this.renderer.render(modelToRender)
  }

  private handleModeTransition(newModel: DragModel): DragModel {
    const newMode = newModel.containerHighlight?.mode ?? null

    // Kein Container → sofort verwenden
    if (newMode === null) {
      this.clearModeTimer()
      this.confirmedMode = null
      this.pendingMode = null
      return newModel
    }

    // Gleicher Modus wie bestätigt → sofort verwenden
    if (newMode === this.confirmedMode) {
      this.lastStableModel = newModel
      return newModel
    }

    // Neuer Modus → Timer starten/zurücksetzen
    if (newMode !== this.pendingMode) {
      this.pendingMode = newMode
      this.clearModeTimer()

      this.modeChangeTimer = setTimeout(() => {
        this.confirmedMode = this.pendingMode
        // Nach Delay das aktuelle Modell rendern
        if (this.model.containerHighlight?.mode === this.confirmedMode) {
          this.lastStableModel = this.model
          this.renderer.render(this.model)
        }
      }, MODE_CHANGE_DELAY_MS)
    }

    // Während Übergang: letztes stabiles Modell beibehalten (kein Flackern)
    return this.lastStableModel
  }

  private clearModeTimer(): void {
    if (this.modeChangeTimer) {
      clearTimeout(this.modeChangeTimer)
      this.modeChangeTimer = null
    }
  }

  drop(): void {
    if (this.model.dropResult) {
      this.codeExecutor.execute(this.source!, this.model.dropResult)
    }
    this.endDrag()
  }

  cancel(): void {
    this.endDrag()
  }

  private endDrag(): void {
    this.clearModeTimer()
    this.layout = null
    this.source = null
    this.model = IDLE_MODEL
    this.pendingMode = null
    this.confirmedMode = null
    this.lastStableModel = IDLE_MODEL
    this.renderer.render(IDLE_MODEL)
  }

  // Für Tests
  getModel(): Readonly<DragModel> {
    return this.model
  }
}

// CodeExecutor Interface - wird von system.ts importiert
export interface CodeExecutor {
  execute(source: DragSource, result: DropResult): void
}
```

---

### Code Executor

```typescript
// executor.ts

import { DragSource, DropResult, CodeModifier } from './types'
import { CodeExecutor } from './system'

export class DefaultCodeExecutor implements CodeExecutor {
  constructor(private codeModifier: CodeModifier) {}

  execute(source: DragSource, result: DropResult): void {
    switch (result.mode) {
      case 'flex':
        if (source.type === 'canvas') {
          this.codeModifier.moveNode(
            source.nodeId,
            result.targetId,
            result.placement,
            result.insertionIndex
          )
        } else {
          this.codeModifier.addChild(
            result.targetId,
            source.componentName,
            { position: result.insertionIndex }
          )
        }
        break

      case 'absolute':
        if (source.type === 'canvas') {
          this.codeModifier.moveNodeAbsolute(
            source.nodeId,
            result.targetId,
            { x: result.x, y: result.y }
          )
        } else {
          this.codeModifier.addChildAbsolute(
            result.targetId,
            source.componentName,
            { x: result.x, y: result.y }
          )
        }
        break

      default:
        const _exhaustive: never = result
        throw new Error(`Unhandled drop result mode`)
    }
  }
}
```

---

## Zusammenfassung

Die Architektur folgt einem klaren Prinzip:

| Datei | Verantwortung | Testbarkeit |
|-------|---------------|-------------|
| **types.ts** | Discriminated Unions für State | Compile-Time |
| **calculate.ts** | Pure Functions für alle Logik | 90% Unit Tests |
| **layout-reader.ts** | Einmal DOM lesen | Integration Tests |
| **renderer.ts** | Triviale Modell→DOM Übersetzung | Manuell |
| **system.ts** | Orchestrierung + Debouncing | E2E Tests |
| **executor.ts** | CodeModifier Dispatch | Unit Tests |

**Vorteile:**
- Keine Mocks nötig (Pure Functions vergleichen nur Daten)
- Deterministische Tests (gleiche Eingabe → gleiche Ausgabe)
- Debouncing verhindert Flackern bei Modus-Wechsel
- Container-Highlighting zeigt User den aktuellen Modus
- CodeModifier-Erweiterungen ohne Breaking Changes
