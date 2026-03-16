# Direct Manipulation

Direktes Bearbeiten von Elementen im Preview ohne Code-Wechsel.

## Vision

Der Preview wird zum primären Editier-Interface. Code generiert sich automatisch.

```
┌─────────────────────────────────────┐
│  Preview (interaktiv)               │
│  ┌─────────────┐                    │
│  │   Card      │ ← Drag to move     │
│  │   ┌───┐     │ ← Resize handles   │
│  │   │ ● │     │ ← Click to select  │
│  │   └───┘     │                    │
│  └─────────────┘                    │
│        ↓                            │
│  Code updated automatically         │
└─────────────────────────────────────┘
```

## Interaktionen

### 1. Drag & Move

| Geste | Aktion | Code-Änderung |
|-------|--------|---------------|
| Drag Element | Position ändern | Reihenfolge im Parent |
| Drag zwischen Container | Element verschieben | Parent wechseln |
| Alt+Drag | Duplizieren | Kopie einfügen |

**Beispiel:**
```
// Vorher: Icon nach Text
Box hor
  Text "Label"
  Icon "check"

// Nach Drag: Icon vor Text
Box hor
  Icon "check"
  Text "Label"
```

### 2. Resize Handles

| Handle | Aktion | Code-Änderung |
|--------|--------|---------------|
| Ecke | Proportional skalieren | `w`, `h` |
| Kante | Einzelne Dimension | `w` oder `h` |
| Shift+Resize | Snap to grid | Runde Werte |

**Visuelle Handles:**
```
    ●───────────●
    │           │
    ●    Box    ●
    │           │
    ●───────────●
```

### 3. Inline Text Editing

| Geste | Aktion |
|-------|--------|
| Doppelklick auf Text | Inline editieren |
| Enter | Bestätigen |
| Escape | Abbrechen |

```
Box
  Text "Klick mich"  ← Doppelklick → Cursor blinkt, direkt tippen
```

### 4. Direktes Styling

| Geste | Aktion | Tool |
|-------|--------|------|
| Cmd+Click auf Farbe | Color Picker öffnen | Bestehender ColorPicker |
| Rechtsklick | Kontext-Menü | Schnellaktionen |
| Hover + Scroll | Wert inkrementieren | Für numerische Props |

**Kontext-Menü:**
```
┌─────────────────────┐
│ ✏️ Edit Text        │
│ 🎨 Change Color     │
│ 📐 Adjust Spacing   │
│ ─────────────────── │
│ 📋 Copy             │
│ 🗑️ Delete           │
│ ─────────────────── │
│ 🔗 Wrap in Box      │
│ 📦 Extract Component│
└─────────────────────┘
```

### 5. Spacing Visualization

Bei Hover oder Selection: Spacing-Werte anzeigen.

```
        ┌── 16px ──┐
      ┌─┴──────────┴─┐
 8px ─│    Card      │─ 8px
      │   Content    │
      └─┬──────────┬─┘
        └── 16px ──┘
```

Klick auf Spacing-Wert → Direktes Editieren.

### 6. Alignment Guides

Beim Drag: Snap-Lines zu anderen Elementen.

```
      │
      │ ← Vertikale Alignment-Linie
┌─────┼─────┐
│     │     │
│  A  │  B  │ ← Horizontal aligned
│     │     │
└─────┴─────┘
      │
```

## Technische Architektur

### Komponenten

```
studio/
├── preview/
│   ├── direct-manipulation/
│   │   ├── DragController.ts      # Drag & Drop
│   │   ├── ResizeController.ts    # Resize Handles
│   │   ├── InlineEditController.ts # Text Editing
│   │   ├── ContextMenuController.ts
│   │   ├── SpacingOverlay.ts      # Spacing Visualization
│   │   └── AlignmentGuides.ts     # Snap Lines
│   └── ...
```

### Datenfluss

```
User Gesture (Preview)
       ↓
DragController / ResizeController
       ↓
Calculate new property values
       ↓
CodeModifier.updateProperty()
       ↓
Source updated
       ↓
Re-compile → Re-render
       ↓
Visual Feedback (smooth)
```

### State Management

```typescript
interface DirectManipulationState {
  mode: 'idle' | 'dragging' | 'resizing' | 'editing'
  activeElement: string | null
  dragOffset: { x: number; y: number }
  resizeHandle: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null
  snapGuides: SnapGuide[]
  previewChange: PropertyChange | null  // Für Live-Preview vor Commit
}
```

## Implementierungs-Phasen

### Phase 1: Drag & Reorder (MVP)
- [ ] Drag-Detection im Preview
- [ ] Visual Feedback (Ghost Element)
- [ ] Drop-Zone Berechnung (existiert bereits: DropZoneCalculator)
- [ ] Code-Update via CodeModifier

### Phase 2: Resize
- [ ] Resize Handles rendern
- [ ] Mouse-Tracking für Resize
- [ ] Proportional vs. Free Resize
- [ ] Code-Update für `w`, `h`

### Phase 3: Inline Text
- [ ] Doppelklick-Detection
- [ ] Contenteditable aktivieren
- [ ] Blur → Code-Update

### Phase 4: Spacing & Alignment
- [ ] Spacing Overlay bei Selection
- [ ] Snap Guides bei Drag
- [ ] Spacing-Wert Click-to-Edit

### Phase 5: Context Menu
- [ ] Rechtsklick-Handler
- [ ] Menü-Rendering
- [ ] Action-Routing

## Risiken & Mitigations

| Risiko | Mitigation |
|--------|------------|
| Performance bei vielen Elementen | Virtualisierung, Throttling |
| Code-Formatierung kaputt | CodeModifier preserviert Whitespace |
| Undo/Redo komplex | Nutze bestehendes Command-System |
| Konflikte mit bestehendem Selection | Klare Mode-Trennung |

## Offene Fragen

1. **Wie handlen wir komplexe Layouts?** (Grid, Stacked)
2. **Soll Resize auch Padding ändern können?** (Shift+Resize?)
3. **Keyboard Shortcuts?** (Arrow Keys für Nudge)

## Referenzen

- Figma Direct Selection
- Framer Canvas Editing
- Webflow Designer
