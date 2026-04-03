---
title: Elemente & Hierarchie
subtitle: Die Grundbausteine jeder Mirror-Oberfläche
prev: 00-intro
next: 02-komponenten
---

In diesem Kapitel lernst du die Basis-Syntax von Mirror: Wie du Elemente erstellst, sie mit Properties gestaltest und durch Einrückung verschachtelst.

## Die Grundsyntax

Ein Mirror-Element besteht aus dem **Element-Namen**, optionalem **Text-Inhalt** in Anführungszeichen, und **Properties** getrennt durch Kommas:

```mirror
Button "Speichern", bg #2563eb, col white, pad 12 24, rad 6
```

Lies das so: _Ein Button mit Text "Speichern", blauem Hintergrund, weißer Schrift, Padding 12/24 und Radius 6._

## Primitives

Primitives sind die Grundelemente von Mirror. Es gibt über 50 davon – hier die Basis-Elemente für den Einstieg:

```mirror
Frame gap 12, pad 16, bg #1a1a1a, rad 8
  Text "Eine Überschrift", col white, fs 18
  Text "Normaler Text darunter", col #888
  Button "Klick mich", bg #2563eb, col white, pad 10 20, rad 6
  Input placeholder "E-Mail eingeben...", bg #333, col white, pad 10, rad 4
```

| Primitive | Beschreibung |
|-----------|--------------|
| `Frame` | Container – das zentrale Layout-Element |
| `Text` | Textinhalt |
| `Image` | Bild |
| `Icon` | Icon (Lucide oder Material) |
| `Button` | Klickbarer Button |
| `Input` | Einzeiliges Eingabefeld |
| `Link` | Anklickbarer Link |

> **Note:** Weitere Primitives: `Textarea`, `Label`, `Divider`, `Spacer`, semantische Elemente (`Header`, `Nav`, `Main`, `Section`, `Footer`, `H1`–`H6`) und über 50 Zag-Komponenten (`Dialog`, `Tabs`, `Menu`, `Select`, etc.).

## Styling-Properties

Properties steuern das Aussehen. Zahlen sind Pixel, `#hex` sind Farben:

```mirror
Frame gap 16

  // Farben: bg = Hintergrund, col = Textfarbe
  Text "Farbiger Text", bg #2563eb, col white, pad 8 16, rad 4

  // Abstände: pad = innen, margin = außen
  Text "Mit Padding", pad 16, bg #333, col white, rad 4

  // Größen: w = Breite, h = Höhe (in Pixel)
  Frame w 200, h 50, bg #10b981, rad 4, center
    Text "200 x 50", col white

  // Ecken: rad = Radius
  Frame hor, gap 8
    Frame w 50, h 50, bg #f59e0b, rad 0
    Frame w 50, h 50, bg #f59e0b, rad 8
    Frame w 50, h 50, bg #f59e0b, rad 25
```

| Property | Beschreibung | Beispiel |
|----------|--------------|----------|
| `bg` | Hintergrundfarbe | `bg #2563eb` |
| `col` | Textfarbe | `col white` |
| `pad` | Innenabstand (Padding) | `pad 12` oder `pad 12 24` |
| `margin` | Außenabstand | `margin 16` |
| `w` / `h` | Breite / Höhe | `w 200, h 100` |
| `rad` | Eckenradius | `rad 8` |
| `fs` | Schriftgröße | `fs 18` |

## Hierarchie durch Einrückung

Kinder-Elemente werden mit **2 Leerzeichen** eingerückt. So entsteht die Struktur:

```mirror
// Eltern-Element
Frame bg #1a1a1a, pad 20, rad 8, gap 12

  // Kind 1: Text
  Text "Titel", col white, fs 18, weight bold

  // Kind 2: Text
  Text "Untertitel", col #888

  // Kind 3: Frame mit eigenen Kindern
  Frame hor, gap 8
    Button "Abbrechen", pad 10 20, rad 6, bg #333, col white
    Button "OK", pad 10 20, rad 6, bg #2563eb, col white
```

`Frame` ist der wichtigste Container. Er ordnet seine Kinder standardmäßig **vertikal** an. Mit `hor` wird horizontal angeordnet.

## Layout-Properties (Vorschau)

Mit Layout-Properties steuerst du, wie Kinder innerhalb eines Frames angeordnet werden. Hier die wichtigsten – Details im [Layout-Kapitel](04-layout.html):

```mirror
Frame gap 16

  // hor = horizontal anordnen
  Frame hor, gap 8, bg #1a1a1a, pad 12, rad 6
    Frame w 40, h 40, bg #2563eb, rad 4
    Frame w 40, h 40, bg #10b981, rad 4
    Frame w 40, h 40, bg #f59e0b, rad 4

  // center = horizontal und vertikal zentrieren
  Frame w 200, h 60, bg #1a1a1a, rad 6, center
    Text "Zentriert", col white

  // spread = Kinder an den Rändern verteilen
  Frame hor, spread, w 300, bg #1a1a1a, pad 12, rad 6
    Text "Links", col white
    Text "Rechts", col white

  // gap = Abstand zwischen Kindern
  Frame hor, gap 24, bg #1a1a1a, pad 12, rad 6
    Text "A", col white
    Text "B", col white
    Text "C", col white
```

| Property | Beschreibung |
|----------|--------------|
| `hor` | Kinder horizontal anordnen |
| `ver` | Kinder vertikal anordnen (Standard) |
| `gap` | Abstand zwischen Kindern |
| `center` | Kinder zentrieren (beide Achsen) |
| `spread` | Kinder an Rändern verteilen |
| `wrap` | Kinder umbrechen wenn kein Platz |

## Icons

Icons kommen von [Lucide](https://lucide.dev/icons/) (Standard) oder [Material Icons](https://fonts.google.com/icons). Der Name kommt in Anführungszeichen:

```mirror
Frame gap 16

  // Lucide Icons (Standard)
  Frame hor, gap 16
    Icon "check", ic #10b981, is 24
    Icon "x", ic #ef4444, is 24
    Icon "settings", ic #888, is 24
    Icon "user", ic #2563eb, is 24

  // fill = ausgefüllte Variante
  Frame hor, gap 16
    Icon "heart", ic #ef4444, is 24
    Icon "heart", ic #ef4444, is 24, fill

  // material = Material Icons statt Lucide
  Frame hor, gap 16
    Icon "star", ic #f59e0b, is 24, material
    Icon "star", ic #f59e0b, is 24, material, fill

  // Icons in Buttons
  Button pad 10 16, rad 6, bg #2563eb, col white
    Frame hor, gap 8, center
      Icon "save", ic white, is 16
      Text "Speichern"
```

| Property | Beschreibung | Beispiel |
|----------|--------------|----------|
| `is` | Icon-Größe in Pixel | `is 24` |
| `ic` | Icon-Farbe | `ic #2563eb` |
| `iw` | Strichstärke | `iw 1.5` |
| `fill` | Ausgefüllte Variante | `Icon "heart", fill` |
| `material` | Material Icons verwenden | `Icon "star", material` |

## Praxisbeispiel: Card

Kombiniere alles zu einer typischen UI-Komponente:

```mirror
Frame w 300, bg #1a1a1a, rad 12, pad 20, gap 16

  // Header mit Icon
  Frame hor, gap 12, center
    Icon "user", ic #2563eb, is 32
    Frame gap 2
      Text "Max Mustermann", col white, fs 16, weight semibold
      Text "Software Engineer", col #888, fs 13

  // Beschreibung
  Text "Arbeitet an spannenden Projekten.", col #aaa, fs 14

  // Action-Buttons
  Frame hor, gap 8
    Button pad 10 16, rad 6, bg #2563eb, col white
      Frame hor, gap 6, center
        Icon "mail", ic white, is 14
        Text "Nachricht"
    Button "Folgen", pad 10 16, rad 6, bg #333, col white
```

---

## Das Wichtigste

| Syntax | Bedeutung |
|--------|-----------|
| `Element "Text", prop value` | Grundsyntax |
| `Frame, Text, Button, Input` | Primitives |
| `bg, col, pad, rad, w, h, fs` | Styling |
| `hor, ver, gap, center, spread` | Layout |
| `2 Leerzeichen Einrückung` | Kind-Element |
