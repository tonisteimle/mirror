# Drop Indicator Konzept

## Anforderungen

### Ziel
Beim Drag & Drop soll der User visuell sehen, WO genau das Element platziert wird.

### Fall 1: Container MIT Kindern
- Zeige Linie zwischen/vor/nach den bestehenden Kindern
- Position basiert auf Cursor-Nähe zu den Slots zwischen Kindern
- **Funktioniert bereits** (getestet)

### Fall 2: Leerer Container
- Zeige Linie an der Position wo das Element erscheinen wird
- Position hängt ab von:
  1. **Container-Eigenschaften** (Layout-Direction, Alignment)
  2. **Cursor-Position** - User kann durch Drop-Position das Alignment beeinflussen

## Detaillierte Spezifikation für leere Container

### Vertikaler Container (flex-direction: column)
```
+---------------------------+
|  ═══════════════════════  |  ← Linie oben (User droppt im oberen Drittel)
|                           |    → Element wird mit align-items: start eingefügt
|                           |
|  ═══════════════════════  |  ← Linie mitte (User droppt in der Mitte)
|                           |    → Element wird mit align-items: center eingefügt
|                           |
|  ═══════════════════════  |  ← Linie unten (User droppt im unteren Drittel)
+---------------------------+    → Element wird mit align-items: end eingefügt
```

### Horizontaler Container (flex-direction: row)
```
+---------------------------+
|  ║                    ║   |
|  ║        ║           ║   |
|  ║        ║           ║   |
|  ↑        ↑           ↑   |
| links   mitte      rechts |
+---------------------------+
```

## Architektur

### Komponenten

1. **DropZoneCalculator** (src/studio/drop-zone-calculator.ts)
   - Berechnet die Drop-Position
   - Zeigt den visuellen Indicator
   - Speichert das "suggestedAlignment" für leere Container

2. **DragDropManager** (src/studio/drag-drop-manager.ts)
   - Koordiniert Drag-Events
   - Ruft CodeModifier auf zum Einfügen
   - Muss das "suggestedAlignment" an CodeModifier weitergeben

3. **CodeModifier** (src/studio/code-modifier.ts)
   - Fügt das Element ein
   - Muss Alignment-Properties setzen wenn nötig

### Datenfluss

```
User draggt über leeren Container
         ↓
DropZoneCalculator.calculateFromPoint()
  - Erkennt: Container ist leer
  - Berechnet: Cursor ist im oberen Drittel → alignment = 'start'
  - Berechnet: indicatorPosition = Oberkante des Content-Bereichs
  - Setzt: dropZone.suggestedAlignment = 'start'
         ↓
DropZoneCalculator.showIndicator()
  - Zeigt horizontale Linie an indicatorPosition
         ↓
User lässt los (drop)
         ↓
DragDropManager.handleDrop()
  - Liest: dropZone.suggestedAlignment
  - Ruft: CodeModifier.addChild() mit alignment info
         ↓
CodeModifier.addChild()
  - Fügt Element ein
  - Fügt alignment Property hinzu: "justify start" oder ähnlich
```

## Implementation Steps

### Step 1: Indicator-Berechnung korrigieren
- In `calculateChildInsertionZone()` für leere Container
- Position muss richtig berechnet werden (Viewport → Container-relative Koordinaten)

### Step 2: Indicator-Anzeige korrigieren
- In `showIndicator()` für `placement === 'inside'`
- Linie muss an der richtigen Stelle erscheinen

### Step 3: Alignment beim Drop anwenden
- In `DragDropManager.insertComponent()`
- Das `suggestedAlignment` aus der DropZone lesen
- An CodeModifier weitergeben

### Step 4: CodeModifier erweitern
- Alignment-Properties zum eingefügten Element oder Container hinzufügen

## Offene Fragen

1. **Wie wird das Alignment gesetzt?**
   - Option A: Als Property am neuen Element (`justify start`)
   - Option B: Als Property am Container (verändert bestehende Kinder)
   - **Empfehlung: Option A** - sicherer, keine Side-Effects

2. **Was wenn der Container bereits Alignment hat?**
   - Das bestehende Alignment verwenden für die Indicator-Position
   - Beim Drop: Nur "suggestedAlignment" setzen wenn Container keins hat

3. **Mirror DSL Syntax für Alignment**
   - Für vertikale Container: `justify start/center/end`
   - Für horizontale Container: `align start/center/end`
