# Drag & Drop - Anforderungsdokument

## 1. Übersicht

Dieses Dokument beschreibt die funktionalen Anforderungen an das Drag & Drop System in Mirror Studio.

---

## 2. Drag Sources (Quellen)

### 2.1 Component Panel → Preview
**Trigger:** Drag aus der Komponenten-Palette
**Daten:**
- `componentName` (z.B. "Button", "Box")
- `properties` (optional, z.B. "w 100 h 40")
- `textContent` (optional, z.B. "Click me")
- `children` (optional, für komplexe Komponenten wie Tabs)

**Erwartetes Verhalten:**
- Ghost zeigt Vorschau der Komponente
- Drop fügt neue Komponente in den Code ein

### 2.2 Canvas Element → Canvas (Reorder)
**Trigger:** Drag eines bestehenden Elements im Preview
**Daten:**
- `nodeId` (SourceMap ID des Elements)
- `componentName` (für Ghost-Rendering)

**Erwartetes Verhalten:**
- Ghost zeigt das Element (Klon oder Outline)
- Original wird visuell "ausgegraut"
- Drop verschiebt Element im Code

### 2.3 Canvas Element → Canvas (Duplicate)
**Trigger:** Alt+Drag eines Elements
**Daten:** Wie 2.2, plus `isDuplicate: true`

**Erwartetes Verhalten:**
- Ghost mit "+" Indikator
- Drop dupliziert Element im Code

### 2.4 Component Panel → Editor (Code)
**Trigger:** Drag aus Palette direkt in den Code-Editor
**Daten:** Wie 2.1

**Erwartetes Verhalten:**
- Drop Indicator (horizontale Linie) im Editor
- X-Position bestimmt Indentation (Snap auf 2er-Schritte)
- Y-Position bestimmt Zeile (vor/nach)
- Drop fügt Code an der Position ein

---

## 3. Drop Targets (Ziele)

### 3.1 Flex Container mit Kindern
**Erkennung:** `display: flex` + hat Kinder
**Placement:** `before` | `after` (relativ zu einem Kind)

**Visual Feedback:**
- Insertion Line zwischen Kindern
- Linie horizontal bei `flex-direction: column`
- Linie vertikal bei `flex-direction: row`

**Code-Änderung:**
```
codeModifier.moveNode(sourceId, siblingId, 'before' | 'after')
codeModifier.addChildRelativeTo(targetId, componentName, 'before' | 'after')
```

### 3.2 Flex Container leer (9-Zone Alignment)
**Erkennung:** `display: flex` + keine Kinder
**Placement:** `inside` mit Alignment-Zone

**Priorität:** MUST HAVE

**Visual Feedback:**
- 9-Zone Grid Overlay während Drag
- Aktive Zone wird hervorgehoben
- Alignment-Indikator (Punkt) zeigt gewählte Position

**Zonen:**
```
┌─────────────────┐
│ TL   TC   TR    │  TL = top-left, TC = top-center, TR = top-right
│ ML   MC   MR    │  ML = middle-left, MC = center, MR = middle-right
│ BL   BC   BR    │  BL = bottom-left, BC = bottom-center, BR = bottom-right
└─────────────────┘
```

**Zone → DSL Mapping:**
| Zone | DSL Properties |
|------|----------------|
| top-left | `align top left` oder `ver` + kind mit alignment |
| top-center | `align top` |
| top-right | `align top right` |
| middle-left | `align left` |
| center | (default, keine Properties) |
| middle-right | `align right` |
| bottom-left | `align bottom left` |
| bottom-center | `align bottom` |
| bottom-right | `align bottom right` |

**Code-Änderung:**
```
// Zone center → einfaches addChild
codeModifier.addChild(containerId, componentName)

// Zone top-left → Container bekommt alignment
codeModifier.insertWithWrapper(containerId, componentName, 'top-left')
// Oder: applyLayoutToContainer + addChild
```

### 3.3 Positioned Container (pos/stacked) - Absolute Koordinaten
**Erkennung:** Element hat `pos` oder `stacked` Property
**Placement:** `absolute` mit exakten x/y Koordinaten

**Priorität:** MUST HAVE

**Visual Feedback:**
- Ghost folgt Cursor exakt
- Snap-Lines zu:
  - Container-Edges (left, right, top, bottom)
  - Container-Center (horizontal, vertical)
  - Sibling-Edges
  - Sibling-Centers
- Distance Labels (Abstand zu Edges)

**Code-Änderung:**
```
// Neues Element mit absoluter Position
codeModifier.addChild(containerId, componentName, {
  properties: `x ${x} y ${y} abs`
})

// Bestehendes Element verschieben
codeModifier.setProperty(nodeId, 'x', x)
codeModifier.setProperty(nodeId, 'y', y)
```

### 3.4 Non-Container Element
**Erkennung:** Text, Input, Image, Icon, etc.
**Placement:** `before` | `after` (als Sibling)

**Visual Feedback:**
- Insertion Line ober/unterhalb des Elements

**Code-Änderung:**
```
codeModifier.addChildRelativeTo(elementId, componentName, 'before' | 'after')
```

### 3.5 Code Editor
**Erkennung:** Drop über CodeMirror Editor
**Placement:** Nach Zeile X mit Indentation Y

**Priorität:** MUST HAVE

**Visual Feedback:**
- Horizontale Linie an der Einfüge-Position
- Linie startet bei der Indentation (X-Position)
- Y-Position snappt zur nächsten Zeilen-Grenze

**Position-Berechnung:**
```
// Y → Zeile
- Obere Hälfte einer Zeile → vor dieser Zeile
- Untere Hälfte einer Zeile → nach dieser Zeile

// X → Indentation
- Snap auf 2-Space-Inkremente
- relativeX / charWidth → column
- column / 2 * 2 → indent
```

**Code-Änderung:**
```typescript
// Direkte Code-Insertion (kein CodeModifier)
const code = buildComponentCode(componentName, properties, textContent, indent)
editor.dispatch({
  changes: { from: lineEnd, insert: '\n' + code }
})
```

---

## 4. Visual Feedback

### 4.1 Ghost (Drag-Vorschau)

| Source | Ghost-Typ |
|--------|-----------|
| Component Panel | Gerenderter Komponenten-Preview |
| Canvas Element | Klon des Elements (semi-transparent) |

**Anforderungen:**
- Ghost folgt Cursor mit Offset (Grab-Position)
- Opacity ~0.7-0.85
- Optional: Schatten für Tiefe

### 4.2 Drop Indicator (Insertion Line)

**Anforderungen:**
- Farbe: Primärfarbe (z.B. #3b82f6)
- Dicke: 2-3px
- Optional: Glow-Effekt

**Orientierung:**
| Container Direction | Indicator |
|---------------------|-----------|
| `flex-direction: column` | Horizontale Linie |
| `flex-direction: row` | Vertikale Linie |

### 4.3 Alignment Indicator (9-Zone)

**Anforderungen:**
- Punkt oder Highlight in der aktiven Zone
- Nur bei leeren Containern
- Optional: Zone-Grid-Overlay während Drag

---

## 5. Keyboard Modifiers

| Modifier | Effekt |
|----------|--------|
| `Alt` | Duplicate statt Move |
| `Shift` | Feinere Bewegung (Grid-Snap deaktiviert) |
| `Escape` | Drag abbrechen |

~~`Space` (gehalten) | Drag-Modus aktivieren~~ → **Entfernt** (HTML5 Drag API Limitation)

---

## 6. Edge Cases

### 6.1 Self-Drop Prevention
- Element darf nicht auf sich selbst gedroppt werden
- Element darf nicht in eigene Kinder gedroppt werden

### 6.2 Stale SourceMap
- Nach Compile ist SourceMap neu
- Ghost/Indicator Positionen müssen aktualisiert werden

### 6.3 Scroll während Drag
- Container soll scrollen wenn Cursor am Rand

### 6.4 Zoom/Scale
- Ghost-Position muss Scale berücksichtigen
- Drop-Koordinaten müssen transformiert werden

---

## 7. Events

### Eingehend (Trigger)
| Event | Quelle | Payload |
|-------|--------|---------|
| `dragstart` (HTML5) | Component Panel | `ComponentDragData` |
| `mousedown` | Canvas Element | Element + MouseEvent |

### Ausgehend (Resultat)
| Event | Bedeutung | Payload |
|-------|-----------|---------|
| `move:completed` | Element wurde verschoben | `{ nodeId, targetId, position }` |
| `component:inserted` | Komponente eingefügt | `{ nodeId, componentName }` |
| `drag:cancelled` | Drag abgebrochen | `{}` |

---

## 8. Code-Integration

### Benötigte CodeModifier Methoden
```typescript
// Neues Element einfügen
addChild(parentId, componentName, options?)
addChildRelativeTo(siblingId, componentName, position)
addChildWithTemplate(parentId, templateCode, options?)

// Element verschieben
moveNode(nodeId, targetId, position)

// Layout anwenden (für 9-Zone)
applyLayoutToContainer(containerId, zone)
insertWithWrapper(containerId, componentName, zone)
```

---

## 9. Nicht-Anforderungen (Out of Scope)

- Drag zwischen verschiedenen Dateien
- Drag aus externen Quellen (Finder, Browser)
- Multi-Element Drag (mehrere gleichzeitig)
- Undo/Redo (wird separat via Command Pattern gehandhabt)

---

## 10. Akzeptanzkriterien

### Must Have (P0)
- [ ] Palette → Preview Drop funktioniert zuverlässig
- [ ] Palette → Editor Drop funktioniert zuverlässig
- [ ] Canvas Reorder funktioniert zuverlässig
- [ ] Visual Feedback (Ghost + Indicator) ist korrekt positioniert
- [ ] Code-Änderungen sind korrekt
- [ ] Escape bricht Drag ab
- [ ] 9-Zone Alignment für leere Flex-Container
- [ ] Absolute Positionierung in pos/stacked Containern
- [ ] Alt+Drag für Duplicate
- [ ] Snap-Lines in positioned Containern

### Should Have (P1)
- [ ] Scroll während Drag (Auto-Scroll am Rand)
- [ ] Distance Labels (Abstand zu Edges)
- [ ] Smooth Ghost Animations

### Nice to Have (P2)
- [ ] Touch Support
- [ ] Keyboard-basiertes Drag (Accessibility)
