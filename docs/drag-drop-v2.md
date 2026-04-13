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

**Außerhalb Preview:** Normaler Drag-Cursor (oder kleines Icon)

**Im Preview:** Gerenderte Komponente + Insertion-Line

---

## Offene Fragen

- [ ] Wie wird die Insertion-Position berechnet?
- [ ] Wie wird die gerenderte Komponente im Preview angezeigt (Ghost)?
- [ ] Wie funktioniert das Bewegen von existierenden Elementen?
- [ ] Keyboard-Modifiers (Shift, Alt)?

---

## Implementation

_Wird ergänzt sobald wir mit der Implementierung beginnen._
