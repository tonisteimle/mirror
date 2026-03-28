# Grid Layout

Grid als Layout-System für Container. Aktiviert ein Constraint-basiertes Platzierungssystem mit definierter Spalten- und Zeilen-Struktur.

## Kernidee

Ein Grid ist eine bewusste Reduktion von Freiheitsgraden:

```
Freeform:     ∞ Positionen (x, y pixelgenau)
Grid:         N × M Zellen (diskrete Platzierung)
```

Der User aktiviert das Grid auf Container-Ebene. Alle direkten Kinder positionieren sich dann im Grid.

## Syntax

### Grid aktivieren

```
Frame grid 12                    // 12-Spalten-Grid
Frame grid 12, row-height 80     // mit fixer Zeilenhöhe
Frame grid 12, gap 16            // mit Abstand zwischen Zellen
```

### Elemente platzieren

Bestehende Properties `x`, `y`, `w`, `h` werden im Grid-Kontext zu Grid-Einheiten:

| Property | Ohne Grid | Mit Grid |
|----------|-----------|----------|
| `x` | Pixel-Position | Start-Spalte |
| `y` | Pixel-Position | Start-Zeile |
| `w` | Pixel/full/hug | Spalten-Span |
| `h` | Pixel/full/hug | Zeilen-Span |

### Beispiel

```
Frame w full, h full, grid 12

  // Explizit platziert (x, y angegeben)
  Hero x 1, y 1, w 12, h 5
  Sidebar x 1, y 6, w 3, h 10
  Main x 4, y 6, w 9, h 10
  Footer x 1, y 16, w 12, h 2

  // Fließend (x, y weggelassen)
  Card w 4, h 3
  Card w 4, h 3
  Card w 4, h 3
  // → füllen automatisch die nächste freie Zeile
```

## Platzierungs-Modi

### Explizit

Mit `x` und `y` wird das Element an einer festen Position platziert:

```
Hero x 1, y 1, w 12, h 5    // Spalte 1, Zeile 1, 12 breit, 5 hoch
```

### Fließend (Auto-Placement)

Ohne `x` und `y` fließt das Element in die nächste freie Position:

```
Card w 4, h 3    // Position wird automatisch bestimmt
Card w 4, h 3    // nächste freie Position
Card w 4, h 3    // usw.
```

## Flussrichtung

Die Flussrichtung wird mit `hor` und `ver` gesteuert - gleiche Syntax wie bei Flex, kontextabhängige Bedeutung.

### Horizontal (Default)

```
Frame grid 12, hor
  Card w 4, h 2
  Card w 4, h 2
  Card w 4, h 2
  Card w 4, h 2
  // → Zeile 1: Card Card Card
  // → Zeile 2: Card
```

### Vertikal

```
Frame grid 12, ver
  Card w 4, h 2
  Card w 4, h 2
  Card w 4, h 2
  // → Spalte 1: Card Card Card (untereinander)
```

### Dense (Lücken füllen)

```
Frame grid 12, hor, dense
  Card w 4, h 2
  Card w 8, h 3
  Card w 4, h 2    // füllt Lücke neben erstem Card
```

## Zwischenräume und Ränder

### Gap (Zwischenräume)

```
Frame grid 12, gap 16              // gleicher Abstand überall
Frame grid 12, gap-x 24, gap-y 16  // horizontal vs. vertikal
```

### Padding (Ränder)

```
Frame grid 12, pad 24                      // Rand um das Grid
Frame grid 12, pad left 48, pad right 48   // nur seitlich (z.B. für max-width Content)
```

### Beispiel: Typisches Page-Layout

```
Frame w full, h full, grid 12, gap 24, pad 48
  Hero x 1, y 1, w 12, h 5
  Sidebar x 1, y 6, w 3, h 10
  Main x 4, y 6, w 9, h 10
```

### CSS Mapping

| Mirror | CSS |
|--------|-----|
| `grid 12` | `grid-template-columns: repeat(12, 1fr)` |
| `hor` | `grid-auto-flow: row` |
| `ver` | `grid-auto-flow: column` |
| `dense` | `grid-auto-flow: dense` |
| `w 4` | `grid-column: span 4` |
| `h 3` | `grid-row: span 3` |
| `x 2` | `grid-column-start: 2` |
| `y 3` | `grid-row-start: 3` |
| `gap 16` | `gap: 16px` |
| `gap-x 16` | `column-gap: 16px` |
| `gap-y 16` | `row-gap: 16px` |
| `pad 24` | `padding: 24px` |

1:1 CSS Grid. Keine eigene Layout-Engine.

## Responsive

Das Grid kann sich je nach Breakpoint ändern:

```
Frame grid 12, @mobile grid 4

  Hero x 1, y 1, w 12, h 5
       @mobile w 4, h 3

  Sidebar x 1, y 6, w 3, h 10
          @mobile x 1, y 4, w 4, h 5

  // Fließende Elemente passen sich automatisch an
  Card w 4, h 3
       @mobile w 2, h 2
```

## Benannte Bereiche (Areas)

Areas sind einfach Komponenten mit Grid-Position. Keine neue Syntax nötig.

### Definition

```
PageLayout: = Frame grid 12
  Hero: x 1, y 1, w 12, h 5
  Sidebar: x 1, y 6, w 3, h 10
  Main: x 4, y 6, w 9, h 10
  Footer: x 1, y 16, w 12, h 2
```

### Verwendung

```
PageLayout
  Hero
    H1 "Welcome"
    Text "Subtitle"
  Sidebar
    Nav
      Link "Home"
      Link "About"
  Main
    Article
      H2 "Content"
      Text "..."
  Footer
    Text "© 2024"
```

### Mit eigenem Namen

```
PageLayout
  MyCustomHero as Hero
    H1 "Custom Title"
```

### Responsive Areas

```
PageLayout: = Frame grid 12, @mobile grid 4
  Hero: x 1, y 1, w 12, h 5
        @mobile x 1, y 1, w 4, h 3
  Sidebar: x 1, y 6, w 3, h 10
           @mobile x 1, y 4, w 4, h 4
  Main: x 4, y 6, w 9, h 10
        @mobile x 1, y 8, w 4, h 8
```

Die Instanzen bleiben unverändert - das Layout regelt alles.

## Offene Fragen

### Zeilenhöhe

```
// Option A: Fixer Wert
Frame grid 12, row-height 80

// Option B: Content-basiert (auto)
Frame grid 12, row-height auto

// Option C: Gemischt
Frame grid 12, row-height 80
  Hero h 5           // 5 × 80 = 400px
  Card h auto        // passt sich Inhalt an
```

### Verschachtelte Grids

```
Frame grid 12
  Main x 4, y 1, w 9, h 10, grid 3    // Nested Grid?
    Article w 2, h 3
    Aside w 1, h 3
```

### Gap

```
Frame grid 12, gap 16           // gleicher Gap überall
Frame grid 12, gap-x 16, gap-y 24   // unterschiedlich?
```

## Vergleich Layout-Systeme

| System | Aktivierung | Kinder-Positionierung |
|--------|-------------|----------------------|
| `hor` | horizontal flow | automatisch nebeneinander |
| `ver` | vertical flow | automatisch untereinander |
| `stacked` | absolute | x, y in Pixel |
| `grid N` | Grid-Constraint | x, y, w, h in Grid-Einheiten |

## Vorteile

1. **Konsistenz** - Alles alignt am Grid
2. **Klarheit** - "w 4" statt "320px mit margin"
3. **Responsive** - Grid-Spalten skalieren mit
4. **Vertraut** - Wiederverwendung von x, y, w, h
