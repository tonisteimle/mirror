---
title: Layout
subtitle: Flex, Grid und Positionierung
prev: 03-tokens
next: 05-styling
---

Mirror bietet drei Layout-Systeme: **Flex** für fließende Layouts (Navigation, Cards), **Grid** für strukturierte Raster (Dashboards, Page-Layouts), und **Stacked** für überlagerte Elemente (Badges, Overlays).

## Flex Layout

### Richtung: hor und ver

Standardmäßig fließen Kinder vertikal (untereinander). Mit `hor` wechselst du auf horizontal:

```mirror
Frame gap 12
  // Vertikal (Standard)
  Frame bg #1a1a1a, pad 16, rad 8, gap 8
    Text "Zeile 1", col white
    Text "Zeile 2", col white
    Text "Zeile 3", col white

  // Horizontal
  Frame hor, bg #1a1a1a, pad 16, rad 8, gap 12
    Frame w 50, h 50, bg #2563eb, rad 6, center
      Text "1", col white
    Frame w 50, h 50, bg #10b981, rad 6, center
      Text "2", col white
    Frame w 50, h 50, bg #f59e0b, rad 6, center
      Text "3", col white
```

### Größen: w und h

Drei Optionen für Breite und Höhe:

```mirror
Frame gap 8, w 300, bg #0a0a0a, pad 16, rad 8
  // Fester Wert in Pixeln
  Frame w 120, h 40, bg #f59e0b, rad 4, center
    Text "w 120", col white, fs 12

  // hug = nur so groß wie der Inhalt
  Frame w hug, h 40, bg #10b981, rad 4, center, pad 0 16
    Text "w hug", col white, fs 12

  // full = verfügbaren Platz füllen
  Frame w full, h 40, bg #2563eb, rad 4, center
    Text "w full", col white, fs 12
```

### Zentrieren und Verteilen

```mirror
Frame gap 12
  // center – beide Achsen
  Frame w 200, h 80, bg #1a1a1a, rad 8, center
    Text "center", col white

  // spread – an die Ränder
  Frame hor, spread, bg #1a1a1a, pad 16, rad 8
    Text "Links", col white
    Text "Rechts", col white
```

### 9 Positionen

Kinder an einer von 9 Positionen platzieren:

```mirror
Frame hor, gap 8
  Frame w 70, h 70, bg #1a1a1a, rad 6, tl
    Text "tl", col #888, fs 11
  Frame w 70, h 70, bg #1a1a1a, rad 6, tc
    Text "tc", col #888, fs 11
  Frame w 70, h 70, bg #1a1a1a, rad 6, tr
    Text "tr", col #888, fs 11

Frame hor, gap 8, margin 8 0 0 0
  Frame w 70, h 70, bg #1a1a1a, rad 6, cl
    Text "cl", col #888, fs 11
  Frame w 70, h 70, bg #1a1a1a, rad 6, center
    Text "cen", col #888, fs 11
  Frame w 70, h 70, bg #1a1a1a, rad 6, cr
    Text "cr", col #888, fs 11

Frame hor, gap 8, margin 8 0 0 0
  Frame w 70, h 70, bg #1a1a1a, rad 6, bl
    Text "bl", col #888, fs 11
  Frame w 70, h 70, bg #1a1a1a, rad 6, bc
    Text "bc", col #888, fs 11
  Frame w 70, h 70, bg #1a1a1a, rad 6, br
    Text "br", col #888, fs 11
```

### Wrap

Bei Überlauf in die nächste Zeile umbrechen:

```mirror
Frame hor, wrap, gap 8, bg #1a1a1a, pad 16, rad 8, w 240
  Frame w 60, h 40, bg #2563eb, rad 4, center
    Text "1", col white
  Frame w 60, h 40, bg #2563eb, rad 4, center
    Text "2", col white
  Frame w 60, h 40, bg #2563eb, rad 4, center
    Text "3", col white
  Frame w 60, h 40, bg #2563eb, rad 4, center
    Text "4", col white
  Frame w 60, h 40, bg #2563eb, rad 4, center
    Text "5", col white
```

## Grid Layout

Grid ist für strukturierte Raster. Du definierst Spalten, Elemente werden in Zellen platziert.

### Grid aktivieren

Mit `grid N` aktivierst du ein N-Spalten-Grid:

```mirror
Frame grid 12, gap 8, bg #111, pad 16, rad 8
  // w = Spalten-Span (nicht Pixel!)
  Frame w 12, h 40, bg #2563eb, rad 4, center
    Text "w 12 (volle Breite)", col white, fs 12
  Frame w 6, h 40, bg #10b981, rad 4, center
    Text "w 6", col white, fs 12
  Frame w 6, h 40, bg #10b981, rad 4, center
    Text "w 6", col white, fs 12
  Frame w 4, h 40, bg #f59e0b, rad 4, center
    Text "w 4", col white, fs 12
  Frame w 4, h 40, bg #f59e0b, rad 4, center
    Text "w 4", col white, fs 12
  Frame w 4, h 40, bg #f59e0b, rad 4, center
    Text "w 4", col white, fs 12
```

### Explizite Platzierung

Mit `x` und `y` platzierst du Elemente exakt (1-indexed):

```mirror
Frame grid 12, gap 8, bg #111, pad 16, rad 8, row-height 35
  Frame x 1, y 1, w 12, h 2, bg #2563eb, rad 4, center
    Text "Hero", col white, fs 12

  Frame x 1, y 3, w 3, h 3, bg #10b981, rad 4, center
    Text "Sidebar", col white, fs 12

  Frame x 4, y 3, w 9, h 3, bg #333, rad 4, center
    Text "Content", col white, fs 12

  Frame x 1, y 6, w 12, h 1, bg #1a1a1a, rad 4, center
    Text "Footer", col #888, fs 11
```

### Grid als Komponente

```mirror
// Layout-Komponente
Dashboard: grid 12, gap 12, row-height 25, h 200
  Header: x 1, y 1, w 12, h 2, bg #1a1a1a, rad 6, pad 0 16, hor, spread, ver-center
  Nav: x 1, y 3, w 2, h 5, bg #1a1a1a, rad 6, pad 12, gap 4
  Main: x 3, y 3, w 10, h 5, grid 2, gap 12

Widget: bg #252525, rad 6, pad 12, gap 4
  Title: col white, fs 13, weight 500
  Value: col #2563eb, fs 24, weight 600

// Verwendung
Dashboard
  Header
    Text "Dashboard", col white, weight 500
    Text "Admin", col #888, fs 12
  Nav
    Text "Menu", col #666, fs 10, uppercase
    Text "Overview", col white, fs 12
    Text "Users", col #888, fs 12
  Main
    Widget
      Title "Users"
      Value "1,234"
    Widget
      Title "Revenue"
      Value "$12.4k"
```

## Stacked Layout

`stacked` stapelt Kinder übereinander. Positionierung mit `x` und `y` – wie in Figma:

```mirror
Frame w 200, h 150, stacked, bg #1a1a1a, rad 8
  // Vier Ecken
  Frame x 0, y 0, w 30, h 30, bg #ef4444, rad 4
  Frame x 170, y 0, w 30, h 30, bg #f59e0b, rad 4
  Frame x 0, y 120, w 30, h 30, bg #10b981, rad 4
  Frame x 170, y 120, w 30, h 30, bg #2563eb, rad 4

  // Mitte
  Frame x 80, y 55, w 40, h 40, bg white, rad 99
```

### Praktisch: Badge auf Icon

```mirror
Frame hor, gap 24
  // Icon mit Badge
  Frame w 44, h 44, stacked
    Frame x 0, y 0, w 44, h 44, bg #1a1a1a, rad 8, center
      Icon "bell", ic #888, is 22
    Frame x 30, y -4, w 18, h 18, bg #ef4444, rad 99, center
      Text "3", col white, fs 10, weight 600

  // Avatar mit Status
  Frame w 44, h 44, stacked
    Frame x 0, y 0, w 44, h 44, bg #2563eb, rad 99, center
      Text "TS", col white, fs 14, weight 500
    Frame x 30, y 30, w 14, h 14, bg #10b981, rad 99, bor 2, boc #111
```

---

## Zusammenfassung

| System | Verwendung |
|--------|------------|
| **Flex** | Fließende Layouts (Navigation, Cards) |
| **Grid** | Strukturierte Raster (Dashboards) |
| **Stacked** | Überlagerungen (Badges, Overlays) |

**Flex:**
- `hor`, `ver` – Richtung
- `gap N` – Abstand
- `center`, `spread` – Ausrichtung
- `tl` bis `br` – 9 Positionen
- `w/h`: Pixel, `hug`, `full`
- `wrap` – Zeilenumbruch

**Grid:**
- `grid 12` – 12-Spalten-Grid
- `w 4`, `h 2` – Spalten/Zeilen-Span
- `x 1, y 1` – Position (1-indexed)
- `row-height 40` – Zeilenhöhe

**Stacked:**
- `stacked` – Kinder übereinander
- `x`, `y` – Position (wie Figma)
- `w`, `h` – Größe
- `z N` – Stapelreihenfolge
