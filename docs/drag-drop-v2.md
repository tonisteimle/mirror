# Drag & Drop v2

Neuimplementierung des Drag & Drop Systems für Mirror Studio.

## Kontext

Das vorherige System wurde am 13.04.2026 vollständig entfernt (~7600 Zeilen Code). Es war zu komplex, unzuverlässig und schwer zu debuggen.

## Designprinzipien

1. **Einfachheit** - So wenig Code wie möglich
2. **Direktheit** - Keine abstrakten Layer, keine State Machines
3. **Schrittweise** - Ein Feature nach dem anderen, jedes muss funktionieren bevor das nächste kommt

## Entscheidungen

### E1: Rendering nur im Preview

**Frage:** Wann wird die gezogene Komponente gerendert?

**Entscheidung:** Erst wenn der Cursor im Preview/Canvas Bereich ist.

**Begründung:**

- Kein Pre-Caching nötig
- Rendering nur wenn wirklich gebraucht
- Preview-Container ist schon da
- Weniger Komplexität
- Entspricht dem Verhalten von Figma/Webflow

**Außerhalb Preview:** Icon + Text aus dem Component Panel (wie im Panel selbst)

**Im Preview:** Gerenderte Komponente + Insertion-Line

---

### E2: Zweistufiger Ghost

**Frage:** Was sieht der Benutzer beim Ziehen?

**Entscheidung:** Zwei verschiedene Darstellungen je nach Position:

| Phase | Wo               | Was sieht man                        |
| ----- | ---------------- | ------------------------------------ |
| 1     | Außerhalb Canvas | Icon + Text (wie im Component Panel) |
| 2     | Im Canvas        | Gerenderte Komponente                |

**Technische Umsetzung:**

1. **Phase 1 (Component Panel):**
   - Bei `dragstart`: Sichtbares Drag-Image mit Icon + Text erstellen
   - Native HTML5 `setDragImage()` verwenden
   - Element muss kurz im DOM sein für `setDragImage()`

2. **Phase 2 (Canvas/Preview):**
   - Bei `dragenter` auf Canvas: Custom Ghost-Element erstellen
   - Ghost folgt dem Cursor mit `position: fixed`
   - Ghost zeigt gerenderte Komponente (via Mirror Compiler)
   - Bei `dragleave`: Ghost entfernen

---

## Offene Fragen

- [ ] Wie wird die Insertion-Position berechnet?
- [ ] Wie funktioniert das Bewegen von existierenden Elementen?
- [ ] Keyboard-Modifiers (Shift, Alt)?

---

## Implementation

### Dateien

| Datei                                         | Zweck                           |
| --------------------------------------------- | ------------------------------- |
| `studio/panels/components/component-panel.ts` | Drag-Image bei dragstart setzen |
| `studio/preview/drag-preview.ts`              | Ghost im Canvas anzeigen        |

### Phase 1: Sichtbares Drag-Image (Component Panel)

Das Component Panel erstellt bei `dragstart` ein sichtbares Element mit Icon + Name:

```typescript
private setupVisibleDragImage(event: DragEvent, item: ComponentItem): void {
  const dragImage = document.createElement('div')
  // Icon + Text wie im Panel
  dragImage.innerHTML = `${getComponentIcon(item.icon)} ${item.name}`
  // Styling...
  document.body.appendChild(dragImage)
  event.dataTransfer.setDragImage(dragImage, 20, 20)
  setTimeout(() => dragImage.remove(), 0)
}
```

### Phase 2: Ghost im Canvas (DragPreview)

Die DragPreview-Klasse in `studio/preview/drag-preview.ts` zeigt den gerenderten Ghost wenn der Cursor über dem Canvas ist.
