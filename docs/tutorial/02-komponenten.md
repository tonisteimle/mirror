---
title: Wiederverwendbare Komponenten
subtitle: Styles einmal definieren, überall verwenden
prev: 01-elemente
next: 03-tokens
---

In diesem Kapitel lernst du, wie du eigene Komponenten erstellst. Das Kernkonzept: Mit `:` definierst du eine Komponente, ohne `:` verwendest du sie. Mit Slots machst du Bereiche einer Komponente von außen befüllbar.

## Das Problem: Wiederholung

Wenn du mehrere Buttons mit dem gleichen Styling brauchst, musst du alles wiederholen:

```mirror
Frame hor, gap 8
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
Frame hor, gap 8
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

Frame hor, gap 8, wrap
  Btn "Standard"
  Btn "Grau", bg #333
  Btn "Rot", bg #dc2626
  Btn "Groß", pad 16 32, fs 18
```

`Btn "Grau", bg #333` überschreibt nur die Hintergrundfarbe. Padding, Radius und Textfarbe kommen weiterhin von der Definition.

## Primitives erweitern mit as

Wenn deine Komponente ein **Primitive erweitert** (Button, Input, Text, etc.), schreibst du `as Primitive` vor dem Doppelpunkt:

```mirror
// Erweitert das Button-Primitive
PrimaryBtn as Button: pad 12 24, rad 6, bg #2563eb, col white

// Erweitert das Input-Primitive
SearchInput as Input: bg #1a1a1a, col white, pad 12, rad 8, bor 1, boc #333

Frame gap 12
  PrimaryBtn "Speichern"
  SearchInput placeholder "Suche..."
```

Das `as Button` sagt: "Diese Komponente *ist* ein Button." Ohne `as` wäre es nur ein Container (Frame) mit Properties.

### Wann as und wann nicht?

| Syntax | Bedeutung | Beispiel |
|--------|-----------|----------|
| `Name as Primitive: ...` | Erweitert ein Primitive | `Btn as Button: pad 12` |
| `Name: ...` | Container mit Properties | `Card: bg #1a1a1a, pad 16` |

> **Faustregel:** Wenn deine Komponente klickbar sein soll (Button), Eingaben entgegen nimmt (Input, Textarea), oder einen Link darstellt (Link) – dann `as Primitive`. Für Layout-Container (Cards, Panels) brauchst du kein `as`.

## Komponenten mit Kindern

Eine Komponente kann auch Kinder enthalten – aber dann haben alle Instanzen denselben Inhalt:

```mirror
// Karte mit festem Inhalt
Card: bg #1a1a1a, pad 16, rad 8, gap 8
  Text "Projekt Alpha", fs 16, weight 500, col white
  Text "Beschreibung des Projekts.", col #888, fs 14

Frame hor, gap 12
  Card
  Card
  Card
```

Das Problem: Alle drei Karten zeigen "Projekt Alpha". Wie gibst du jeder Karte einen eigenen Titel? Dafür brauchst du **Slots**.

## Slots: Variable Bereiche

Wenn du Kinder **mit `:`** definierst, werden sie zu **Slots** – Platzhalter, die du bei der Verwendung befüllst:

```mirror
// Title: und Desc: sind Slots (mit :)
Card: bg #1a1a1a, pad 16, rad 8, gap 8, w 200
  Title: fs 16, weight 500, col white
  Desc: col #888, fs 14

// Bei Verwendung: Slots befüllen (ohne :)
Frame hor, gap 12
  Card
    Title "Projekt Alpha"
    Desc "Das erste Projekt."
  Card
    Title "Projekt Beta"
    Desc "Ein anderes Projekt."
```

`Title:` in der Definition erstellt einen Slot mit vordefinierten Styles (Schriftgröße, Farbe). Bei der Verwendung befüllst du diesen Slot mit `Title "Text"` – ohne Doppelpunkt.

| Syntax | Bedeutung |
|--------|-----------|
| `Slot:` in Definition | Slot anlegen mit Default-Styles |
| `Slot` bei Verwendung | Slot mit Inhalt befüllen |

## Slots mit mehreren Elementen

Ein Slot kann auch mehrere Kinder aufnehmen. Das ist nützlich für Bereiche wie "Content" oder "Actions":

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

Der `Content:` Slot definiert nur `gap 8`. Die eigentlichen Inhalte (Text, Button) werden bei der Verwendung eingefügt.

## Layouts mit Slots

Das Slot-Pattern ist besonders mächtig für App-Layouts. Du definierst die Struktur (Sidebar links, Main rechts), und befüllst die Bereiche bei der Verwendung mit beliebigem Inhalt:

```mirror
// Layout-Definition: Sidebar und Main sind Slots
AppShell: w full, h 180, hor
  Sidebar: w 140, h full, bg #1a1a1a, pad 12, gap 8
  Main: w full, h full, bg #0c0c0c, pad 20

// Verwendung: Slots mit Inhalt befüllen
AppShell
  Sidebar
    Text "Navigation", col #888, fs 11, uppercase
    Text "Dashboard", col white, fs 14
    Text "Settings", col white, fs 14
  Main
    Text "Hauptinhalt", col white, fs 18
```

`AppShell` definiert das Grundgerüst: horizontal (`hor`), Sidebar 140px breit, Main füllt den Rest (`w full`). Die Slots `Sidebar:` und `Main:` legen Hintergrund und Padding fest – der eigentliche Inhalt kommt bei der Verwendung.

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
| `Title:` | Slot definieren (in Komponente) |
| `Title "Text"` | Slot befüllen (bei Verwendung) |
| `Btn as Button: ...` | Primitive erweitern |
