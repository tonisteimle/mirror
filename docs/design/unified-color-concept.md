# Unified Color Concept

## Konzept

Anstatt `bg` (background) und `col` (color) zu unterscheiden, gibt es nur noch **eine einzige Farb-Property: `col`**.

Der Parser entscheidet basierend auf dem Komponenten-Typ, welche CSS-Property generiert wird:

| Komponenten-Typ | `col` generiert |
|-----------------|-----------------|
| Container (Button, Box, Stack, Card, ...) | `backgroundColor` |
| Text (Label, Text) | `color` |

## Begründung

In Mirror ist alles eine Komponente. Ein Text ist keine "Eigenschaft" eines Buttons, sondern eine eigenständige Komponente (Label). Daher braucht jede Komponente nur ihre eigene Farbe - nicht "Hintergrund" und "Textfarbe".

- **Button** hat eine Farbe → sein Fill/Background
- **Label** hat eine Farbe → seine Textfarbe

## Syntax

### Explizite Schreibweise (volle Kontrolle)

```
Button col #333
  Label "Click" col #fff
```

### Shorthand (für einfache Fälle)

```
Button col #333 "Click" col #fff
```

Die Regel: Ein String erzeugt implizit ein Label. Properties nach dem String gehören zu diesem impliziten Label.

### Äquivalenz

Diese beiden Schreibweisen sind identisch:

```
// Shorthand
Button col #333 "Click" col #fff

// Explizit
Button col #333
  Label "Click" col #fff
```

## Parser-Mapping

```typescript
const colorMapping: Record<string, 'backgroundColor' | 'color'> = {
  // Container → backgroundColor
  Button: 'backgroundColor',
  Box: 'backgroundColor',
  Stack: 'backgroundColor',
  Card: 'backgroundColor',
  VStack: 'backgroundColor',
  HStack: 'backgroundColor',
  ZStack: 'backgroundColor',

  // Text → color
  Label: 'color',
  Text: 'color',
}
```

## Vorteile

1. **Einfacheres mentales Modell**: Jede Komponente hat "eine Farbe"
2. **Konsistenz**: Folgt dem "alles ist eine Komponente" Prinzip
3. **Klarere Struktur**: Text ist explizit eine eigene Komponente

## Rückwärtskompatibilität

`bg` bleibt für Rückwärtskompatibilität erhalten und setzt immer explizit `backgroundColor`. Bestehender Code funktioniert weiterhin:

```
// Beide funktionieren:
Button bg #333        // explizit backgroundColor
Button col #333       // automatisch backgroundColor (Container)
```

## Komponenten-Klassifizierung

**Container-Komponenten** (col → backgroundColor):
- Box, Stack, VStack, HStack, ZStack
- Button, Card, Container, Header, Footer, Sidebar
- Nav, Main, Section, Article, Aside
- Modal, Dialog, Drawer, Popover, Tooltip
- Dropdown, Menu, List, ListItem, Grid, Row, Column

**Text-Komponenten** (col → color):
- Text, Label, Title, Heading, Paragraph, Span
- Link, Badge, Tag, Chip
- `_text` (impliziter Text aus Strings)
