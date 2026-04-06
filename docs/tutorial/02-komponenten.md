---
title: Wiederverwendbare Komponenten
subtitle: Styles einmal definieren, überall verwenden
prev: 01-elemente
next: 03-tokens
---

In diesem Kapitel lernst du, wie du eigene Komponenten erstellst. Das Kernkonzept: **Mit `:` definierst du, ohne `:` verwendest du.** Diese Regel gilt überall – für Komponenten, für Variationen, für Kind-Komponenten.

## Das Problem: Wiederholung

Wenn du mehrere Buttons mit dem gleichen Styling brauchst, musst du alles wiederholen:

```mirror
Frame hor, gap 8, bg #0a0a0a, pad 16, rad 8
  Button "Speichern", pad 10 20, rad 6, bg #2563eb, col white
  Button "Abbrechen", pad 10 20, rad 6, bg #2563eb, col white
  Button "Löschen", pad 10 20, rad 6, bg #2563eb, col white
```

Das ist mühsam und fehleranfällig. Änderst du das Styling, musst du es überall anpassen. Besser: Eine Komponente definieren.

## Komponenten definieren

Mit einem **Doppelpunkt nach dem Namen** definierst du eine wiederverwendbare Komponente. Bei der Verwendung lässt du den Doppelpunkt weg:

```mirror
// Definition: Name endet mit :
Btn: pad 10 20, rad 6, bg #2563eb, col white

// Verwendung: Name ohne :
Frame hor, gap 8, bg #0a0a0a, pad 16, rad 8
  Btn "Speichern"
  Btn "Abbrechen"
  Btn "Löschen"
```

Die Komponente `Btn:` speichert alle Properties. Bei `Btn "Text"` werden diese Properties angewendet und der Text eingefügt.

| Syntax | Bedeutung |
|--------|-----------|
| `Name:` | Komponente definieren |
| `Name` | Komponente verwenden |

## Properties überschreiben

Bei der Verwendung kannst du einzelne Properties überschreiben. Die übrigen bleiben erhalten:

```mirror
Btn: pad 10 20, rad 6, bg #2563eb, col white

Frame hor, gap 8, wrap, bg #0a0a0a, pad 16, rad 8
  Btn "Standard"
  Btn "Grau", bg #333
  Btn "Rot", bg #dc2626
  Btn "Groß", pad 16 32, fs 18
```

`Btn "Grau", bg #333` überschreibt nur die Hintergrundfarbe. Padding, Radius und Textfarbe kommen weiterhin von der Definition.

## Kinder hinzufügen

Bei der Verwendung kannst du einer Komponente auch Kinder hinzufügen. Die Komponente wird zum Container für beliebige Inhalte:

```mirror
Card: bg #1a1a1a, pad 16, rad 8, gap 8

Card
  Text "Titel", col white, fs 16, weight 500
  Text "Beschreibung", col #888, fs 14
  Button "Aktion", pad 8 16, rad 6, bg #2563eb, col white
```

`Card:` definiert nur den Container (Hintergrund, Padding, Radius, Gap). Bei der Verwendung fügst du beliebige Kinder hinzu – Text, Buttons, weitere Frames, was immer du brauchst.

Das kombiniert beides: Die Komponente liefert das Grundgerüst, du lieferst den Inhalt.

## Variationen als Komponenten

Du hast gesehen, wie du Properties bei der Verwendung überschreibst (`Btn "Rot", bg #333`). Das funktioniert gut für Einzelfälle. Aber was, wenn du dieselbe Variation mehrmals brauchst?

```mirror
Btn: pad 10 20, rad 6, bg #2563eb, col white

// Immer wieder dieselbe Überschreibung...
Frame hor, gap 8, bg #0a0a0a, pad 16, rad 8
  Btn "Löschen", bg #ef4444
  Btn "Entfernen", bg #ef4444
  Btn "Abbrechen", bg #ef4444
```

Jetzt wiederholst du dich wieder – `bg #ef4444` steht dreimal. Änderst du die Farbe, musst du es überall anpassen.

### Lösung: Variationen zu Komponenten machen

Mit `as` machst du eine Variation selbst zur Komponente. Sie erbt alles von der Basis und fügt nur das Unterschiedliche hinzu:

```mirror
// Basis-Button
Btn: pad 10 20, rad 6, cursor pointer

// Variationen als eigene Komponenten
PrimaryBtn as Btn: bg #2563eb, col white
DangerBtn as Btn: bg #ef4444, col white
GhostBtn as Btn: bg transparent, col #888, bor 1, boc #333

Frame hor, gap 8, bg #0a0a0a, pad 16, rad 8
  PrimaryBtn "Speichern"
  DangerBtn "Löschen"
  GhostBtn "Abbrechen"
```

`DangerBtn as Btn:` bedeutet: "DangerBtn ist ein Btn, aber mit rotem Hintergrund." Alle drei Varianten erben `pad 10 20, rad 6, cursor pointer` von `Btn`.

Der Vorteil: Änderst du das Padding in `Btn`, wirkt es in allen Varianten. Änderst du die Farbe in `DangerBtn`, wirkt es überall wo `DangerBtn` verwendet wird.

> **Tipp:** Du kannst auch direkt von Primitives erben. `PrimaryBtn as Button: bg #2563eb` erzeugt einen Button mit allen Standard-Button-Eigenschaften plus blauem Hintergrund.

| Syntax | Bedeutung |
|--------|-----------|
| `DangerBtn as Btn:` | DangerBtn erbt von Btn |
| `PrimaryBtn as Button:` | Von Primitive erben |
| `DangerBtn "Text"` | DangerBtn verwenden |

## Komplexe Komponenten

Bisher waren unsere Komponenten einfach: Ein Element mit Properties (`Btn: pad 10 20, bg #2563eb`). Aber eine Komponente kann beliebig komplex sein – eine ganze Struktur mit mehreren Kindern. Stell dir einen Footer vor:

```mirror
Footer: w full, pad 20, bg #0a0a0a, hor, spread
  Text "© 2024 Meine App", col #666, fs 12
  Frame hor, gap 16
    Text "Impressum", col #888, fs 12
    Text "Datenschutz", col #888, fs 12
    Text "Kontakt", col #888, fs 12

Frame gap 200, bg #1a1a1a
  Text "Seiteninhalt...", col white, pad 20
  Footer
```

`Footer:` enthält mehrere Elemente: Copyright-Text links, Links rechts. Bei der Verwendung schreibst du nur `Footer` – die gesamte Struktur wird eingefügt.

### Das Problem: Fester Inhalt

Was aber, wenn du den Inhalt variieren möchtest? Zum Beispiel eine Card, die auf jeder Seite einen anderen Titel zeigt:

```mirror
Card: bg #1a1a1a, pad 16, rad 8, gap 8
  Text "Projekt Alpha", fs 16, weight 500, col white
  Text "Beschreibung des Projekts.", col #888, fs 14

Frame hor, gap 12, bg #0a0a0a, pad 16, rad 8
  Card
  Card
  Card
```

Alle drei Karten zeigen "Projekt Alpha". Der Inhalt ist fest in der Definition – du kannst ihn bei der Verwendung nicht ändern.

## Komponenten in Komponenten

Die Lösung: Definiere Kind-Komponenten innerhalb der Eltern-Komponente. Es gilt dieselbe Regel wie immer – **mit `:` definierst du, ohne `:` verwendest du**:

```mirror
// Card definiert zwei Kind-Komponenten: Title: und Desc:
Card: bg #1a1a1a, pad 16, rad 8, gap 8, w 200
  Title: fs 16, weight 500, col white
  Desc: col #888, fs 14

// Bei Verwendung: Kind-Komponenten befüllen (ohne :)
Frame hor, gap 12, bg #0a0a0a, pad 16, rad 8
  Card
    Title "Projekt Alpha"
    Desc "Das erste Projekt."
  Card
    Title "Projekt Beta"
    Desc "Ein anderes Projekt."
```

`Title:` und `Desc:` sind Komponenten-Definitionen innerhalb von `Card:`. Sie haben eigene Styles (Schriftgröße, Farbe). Bei der Verwendung schreibst du `Title "Text"` und `Desc "Text"` – ohne Doppelpunkt, wie bei jeder Komponenten-Verwendung.

**Es ist dieselbe Regel, nur verschachtelt.**

| Syntax | Bedeutung |
|--------|-----------|
| `Title:` in Definition | Kind-Komponente definieren |
| `Title "Text"` bei Verwendung | Kind-Komponente befüllen |

## Kind-Komponenten mit mehreren Elementen

Eine Kind-Komponente kann auch mehrere Kinder aufnehmen. Das ist nützlich für Bereiche wie "Content" oder "Actions":

```mirror
Card: bg #1a1a1a, pad 16, rad 8, gap 12
  Title: fs 16, weight 500, col white
  Content: gap 8

Card
  Title "Benutzer"
  Content
    Text "Max Mustermann", col white, fs 14
    Text "max@example.com", col #888, fs 12
    Button "Profil", pad 8 16, rad 6, bg #333, col white
```

`Content:` definiert nur `gap 8`. Die eigentlichen Inhalte (Text, Button) werden bei der Verwendung eingefügt.

## Layouts

Das Prinzip funktioniert genauso für App-Layouts. Du definierst die Struktur (Sidebar links, Main rechts), und befüllst die Bereiche bei der Verwendung:

```mirror
// Layout mit Kind-Komponenten: Sidebar und Main
AppShell: w full, h 180, hor
  Sidebar: w 140, h full, bg #1a1a1a, pad 12, gap 8
  Main: w full, h full, bg #0c0c0c, pad 20

// Verwendung: Kind-Komponenten befüllen
AppShell
  Sidebar
    Text "Navigation", col #888, fs 11, uppercase
    Text "Dashboard", col white, fs 14
    Text "Settings", col white, fs 14
  Main
    Text "Hauptinhalt", col white, fs 18
```

`AppShell:` definiert das Grundgerüst: horizontal (`hor`), Sidebar 140px breit, Main füllt den Rest (`w full`). `Sidebar:` und `Main:` sind Kind-Komponenten mit eigenem Styling – der Inhalt kommt bei der Verwendung.

## Praxisbeispiel: Card-Komponente

Eine vollständige Card – alle Elemente sind in der Definition mit Formatierung vordefiniert. Bei der Verwendung gibst du nur noch die Texte an:

```mirror
// Alle Elemente mit Formatierung in der Definition
Card: w 260, bg #1a1a1a, rad 12, clip
  Title: w full, pad 16, bg #252525, col white, weight 500
  Desc: w full, pad 16, col #888, fs 14
  Footer: w full, pad 12 16, bg #151515, hor, spread
    Status: col #666, fs 12
    Action: pad 8 16, rad 6, bg #2563eb, col white

// Verwendung: Nur noch die Texte einfügen
Card
  Title "Neues Projekt"
  Desc "Erstelle ein neues Projekt."
  Footer
    Status "Schritt 1/3"
    Action "Weiter"
```

Der Vorteil: Die gesamte Formatierung ist in der Definition. Bei der Verwendung schreibst du nur noch die Inhalte – kein `col white`, kein `fs 14`, keine Wiederholung.

---

## Das Wichtigste

**Eine Regel:** Mit `:` definierst du, ohne `:` verwendest du.

| Syntax | Bedeutung |
|--------|-----------|
| `Btn:` | Komponente definieren |
| `Btn "OK"` | Komponente verwenden |
| `Btn "OK", bg #333` | Properties überschreiben |
| `Card` + Kinder | Kinder hinzufügen |
| `Title:` in Komponente | Kind-Komponente definieren |
| `Title "Text"` | Kind-Komponente befüllen |
| `DangerBtn as Btn:` | Variation als Komponente |
