---
title: Styling
subtitle: Farben, Typografie, Borders und Effekte
prev: 04-layout
next: 06-states
---

## Farben

Hex-Farben, benannte Farben und rgba:

```mirror
Frame hor, gap 8, wrap, bg #0a0a0a, pad 16, rad 8
  // Hex-Farben
  Frame w 50, h 50, bg #2563eb, rad 6
  Frame w 50, h 50, bg #10b981, rad 6
  Frame w 50, h 50, bg #f59e0b, rad 6
  Frame w 50, h 50, bg #ef4444, rad 6

  // Benannte Farben
  Frame w 50, h 50, bg white, rad 6
  Frame w 50, h 50, bg black, rad 6

  // Mit Transparenz
  Frame w 50, h 50, bg rgba(37,99,235,0.5), rad 6
  Frame w 50, h 50, bg #2563eb88, rad 6
```

## Gradients

Farbverläufe mit `grad`:

```mirror
Frame gap 8, bg #0a0a0a, pad 16, rad 8
  // Horizontal (Standard)
  Frame w full, h 50, rad 8, bg grad #2563eb #7c3aed

  // Vertikal
  Frame w full, h 50, rad 8, bg grad-ver #f59e0b #ef4444

  // Mit Winkel (45°)
  Frame w full, h 50, rad 8, bg grad 45 #10b981 #2563eb

  // Drei Farben
  Frame w full, h 50, rad 8, bg grad #10b981 #2563eb #7c3aed
```

Text-Gradients funktionieren genauso mit `col`:

```mirror
Frame bg #1a1a1a, pad 20, rad 8, gap 8
  Text "Gradient Text", fs 24, weight bold, col grad #2563eb #7c3aed
  Text "Vertical Gradient", fs 24, weight bold, col grad-ver #f59e0b #ef4444
```

## Borders

`bor` für Breite, `boc` für Farbe:

```mirror
Frame hor, gap 12, bg #0a0a0a, pad 16, rad 8
  // Border rundum
  Frame w 70, h 70, bor 2, boc #2563eb, rad 8, center
    Text "2px", col #888, fs 11

  // Dickerer Border
  Frame w 70, h 70, bor 4, boc #10b981, rad 8, center
    Text "4px", col #888, fs 11

  // Mit Hintergrund
  Frame w 70, h 70, bg #1a1a1a, bor 1, boc #333, rad 8, center
    Text "subtle", col #888, fs 11
```

## Border Radius

Von eckig bis rund:

```mirror
Frame hor, gap 12, bg #0a0a0a, pad 16, rad 8
  Frame w 60, h 60, bg #2563eb, rad 0, center
    Text "0", col white, fs 11
  Frame w 60, h 60, bg #2563eb, rad 4, center
    Text "4", col white, fs 11
  Frame w 60, h 60, bg #2563eb, rad 12, center
    Text "12", col white, fs 11
  Frame w 60, h 60, bg #2563eb, rad 99, center
    Text "99", col white, fs 11
```

`rad 99` erzeugt einen Kreis bei quadratischen Elementen.

## Typografie: Größe & Gewicht

`fs` für Schriftgröße, `weight` für Dicke:

```mirror
Frame gap 4, bg #1a1a1a, pad 16, rad 8
  Text "Headline", col white, fs 24, weight bold
  Text "Subheadline", col white, fs 18, weight 500
  Text "Body Text", col #ccc, fs 14
  Text "Small Text", col #888, fs 12
  Text "Caption", col #666, fs 10, uppercase
```

## Typografie: Stil

Text-Transformationen und Stile:

```mirror
Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "UPPERCASE TEXT", col white, uppercase
  Text "lowercase text", col white, lowercase
  Text "Italic Text", col white, italic
  Text "Underlined Text", col white, underline
  Text "Truncated text that is too long to fit...", col white, truncate, w 200
```

## Typografie: Fonts

Verschiedene Schriftarten:

```mirror
Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "Sans Serif (default)", col white, font sans
  Text "Serif Font", col white, font serif
  Text "Monospace Font", col white, font mono
```

## Shadows

Vordefinierte Schatten-Stufen:

```mirror
Frame hor, gap 16, pad 20, bg #0a0a0a
  Frame w 80, h 80, bg #1a1a1a, rad 8, shadow sm, center
    Text "sm", col #888, fs 11
  Frame w 80, h 80, bg #1a1a1a, rad 8, shadow md, center
    Text "md", col #888, fs 11
  Frame w 80, h 80, bg #1a1a1a, rad 8, shadow lg, center
    Text "lg", col #888, fs 11
```

## Opacity

Transparenz des gesamten Elements:

```mirror
Frame hor, gap 8, bg #0a0a0a, pad 16, rad 8
  Frame w 60, h 60, bg #2563eb, rad 8, center, opacity 1
    Text "1", col white, fs 11
  Frame w 60, h 60, bg #2563eb, rad 8, center, opacity 0.7
    Text "0.7", col white, fs 11
  Frame w 60, h 60, bg #2563eb, rad 8, center, opacity 0.4
    Text "0.4", col white, fs 11
  Frame w 60, h 60, bg #2563eb, rad 8, center, opacity 0.2
    Text "0.2", col white, fs 11
```

## Cursor

Mauszeiger-Stil ändern:

```mirror
Frame hor, gap 8, wrap, bg #0a0a0a, pad 16, rad 8
  Frame w 70, h 50, bg #1a1a1a, rad 6, center, cursor pointer
    Text "pointer", col #888, fs 10
  Frame w 70, h 50, bg #1a1a1a, rad 6, center, cursor grab
    Text "grab", col #888, fs 10
  Frame w 70, h 50, bg #1a1a1a, rad 6, center, cursor move
    Text "move", col #888, fs 10
  Frame w 70, h 50, bg #1a1a1a, rad 6, center, cursor not-allowed
    Text "not-allowed", col #888, fs 9
```

## Praktisch: Button Varianten

Verschiedene Button-Stile:

```mirror
Frame gap 12, bg #0a0a0a, pad 16, rad 8
  // Filled Buttons
  Frame hor, gap 8
    Button "Primary", bg #2563eb, col white, pad 10 20, rad 6
    Button "Success", bg #10b981, col white, pad 10 20, rad 6
    Button "Danger", bg #ef4444, col white, pad 10 20, rad 6

  // Outlined Buttons
  Frame hor, gap 8
    Button "Outline", bor 1, boc #2563eb, col #2563eb, pad 10 20, rad 6
    Button "Subtle", bg #2563eb22, col #2563eb, pad 10 20, rad 6

  // Ghost & Link
  Frame hor, gap 8
    Button "Ghost", col #888, pad 10 20, rad 6
    Button "Link →", col #2563eb, pad 10 20, underline
```

## Praktisch: Card Styles

Verschiedene Card-Designs:

```mirror
Frame hor, gap 12, bg #0a0a0a, pad 16, rad 8
  // Elevated
  Frame w 120, bg #1a1a1a, pad 16, rad 12, shadow md, gap 8
    Text "Elevated", col white, fs 13, weight 500
    Text "Mit Schatten", col #888, fs 11

  // Bordered
  Frame w 120, bor 1, boc #333, pad 16, rad 12, gap 8
    Text "Bordered", col white, fs 13, weight 500
    Text "Mit Border", col #888, fs 11

  // Gradient
  Frame w 120, pad 16, rad 12, gap 8, bg grad 135 #1a1a2e #16213e
    Text "Gradient", col white, fs 13, weight 500
    Text "Mit Verlauf", col #888, fs 11
```

---

## Zusammenfassung

- `bg, col` – Hintergrund & Textfarbe
- `bg grad #a #b`, `col grad #a #b` – Gradients (auch `grad-ver`, `grad 45`)
- `bor, boc, rad` – Border & Radius
- `fs, weight, font` – Schriftgröße, -dicke, -art
- `italic, underline, uppercase, truncate` – Text-Stile
- `shadow sm/md/lg` – Schatten
- `opacity` – Transparenz
- `cursor pointer/grab/move` – Mauszeiger
