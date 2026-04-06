---
title: Was ist Mirror?
subtitle: Die Sprache für AI-unterstütztes UI-Design
next: 01-elemente
---

## Die Zukunft des Designs

Die Zukunft liegt im AI-unterstützten Design. AI generiert Code – aber heutige Programmiersprachen sind für Designer nicht lesbar. Kleine Änderungen werden zum Pain. Du bist abhängig von Entwicklern oder musst hoffen, dass die AI versteht was du meinst.

**Mirror löst dieses Problem.**

Mirror ist eine Sprache, die AI versteht *und* Menschen lesen können. AI generiert, du verfeinerst. Ohne Framework-Wissen, ohne Build-Tools, ohne Abhängigkeiten.

```mirror
Button "Speichern", bg #2563eb, col white, pad 12 24, rad 6
```

Das ist ein blauer Button. Du siehst es, du verstehst es, du kannst es ändern. `bg #2563eb` → `bg #10b981` und der Button ist grün. Keine Magie, keine versteckten Dateien.

## Lesbar wie ein Dokument

Mirror verwendet kurze, eindeutige Abkürzungen:

```mirror-static
Frame hor, gap 12, pad 16, bg #1a1a1a, rad 8
  Icon "user", ic #2563eb, is 24
  Frame gap 2
    Text "Max Mustermann", col white, fs 14, weight 500
    Text "Designer", col #888, fs 12
```

- `hor` – horizontal
- `gap` – Abstand zwischen Kindern
- `pad` – Padding
- `bg` – Hintergrund
- `rad` – Radius
- `col` – Farbe
- `fs` – Schriftgröße

Die Abkürzungen sind der Anfang des Wortes. Nach wenigen Minuten liest sich Mirror-Code wie eine Beschreibung des UIs.

## Hierarchie durch Einrückung

Kinder werden eingerückt. Keine schließenden Tags, keine Klammern. Die Struktur ist sichtbar:

```mirror
Frame bg #1a1a1a, pad 20, rad 12, gap 16
  Text "Titel", col white, fs 18, weight bold
  Text "Beschreibung hier", col #888, fs 14
  Frame hor, gap 8
    Button "Abbrechen", pad 10 20, rad 6, bg #333, col white
    Button "OK", pad 10 20, rad 6, bg #2563eb, col white
```

Der Code sieht aus wie ein Baum, weil er ein Baum ist.

## Von Element zu Komponente: Ein Zeichen

Du hast einen Button gebaut und willst ihn wiederverwenden? Füge einen Namen mit Doppelpunkt hinzu:

```mirror-static
// Vorher: Ein einzelner Button
Button "Speichern", bg #2563eb, col white, pad 12 24, rad 6
```

```mirror-static
// Nachher: Eine wiederverwendbare Komponente
PrimaryBtn as Button: bg #2563eb, col white, pad 12 24, rad 6

PrimaryBtn "Speichern"
PrimaryBtn "Senden"
PrimaryBtn "Weiter"
```

Keine separate Datei. Kein Import. Kein Export. Die Definition ist dort, wo du sie brauchst.

## Tokens für Design-Systeme

Farben, Abstände, Radien – definiere sie einmal, verwende sie überall:

```mirror
$primary.bg: #2563eb
$card.bg: #1a1a1a
$card.rad: 8

Card: bg $card, rad $card, pad 16, gap 8
  Title: col white, fs 16, weight 500

Card
  Title "Mit Tokens"
  Text "Änderst du den Token, ändert sich alles.", col #888, fs 13
```

Tokens + Komponenten = konsistentes Design ohne Wiederholung.

## States ohne Komplexität

Interaktionen sind States. Ein State beschreibt, wie ein Element in einem Zustand aussieht:

```mirror
Btn: pad 12 24, rad 6, bg #333, col white, cursor pointer, toggle()
  hover:
    bg #444
  on:
    bg #2563eb

Btn "Anklicken"
```

`hover:` – wenn die Maus darüber ist. `on:` – wenn aktiviert. `toggle()` – bei Klick den State wechseln (Klick ist Default).

Ein State kann sogar komplett andere Inhalte haben:

```mirror
ExpandBtn: pad 12 20, bg #1a1a1a, col white, rad 6, hor, gap 8, cursor pointer, toggle()
  "Mehr zeigen"
  Icon "chevron-down", ic #888, is 16
  open:
    "Weniger zeigen"
    Icon "chevron-up", ic #888, is 16

ExpandBtn
```

## JavaScript wenn nötig

Mirror hat eingebaute Funktionen für typische Patterns – `toggle()`, `show()`, `hide()`, `navigate()`. Für komplexe Logik schreibst du JavaScript:

```mirror-static
Button "Speichern", save()
```

```javascript
async function saveData(element) {
  element.state = 'loading'
  await fetch('/api/save')
  element.state = 'success'
}
```

Mirror definiert das UI. JavaScript steuert die Logik. Beide arbeiten zusammen.

## Arbeite wie du willst

Mirror ist Text. Du kannst es schreiben in:

- **Jedem Texteditor** – VS Code, Sublime, vim
- **Mirror Studio** – einer IDE mit Live-Preview, visuellem Editing und Property-Panel

In Mirror Studio siehst du Code und Ergebnis nebeneinander. Ändere den Code, das Preview aktualisiert sich. Klicke ins Preview, der Code wird selektiert. Beides bleibt synchron.

## Mensch + AI = besseres Design

Mirror wurde für die Zusammenarbeit mit AI entwickelt:

```
Du: "Erstelle eine Card mit Avatar, Name und Rolle"
AI: generiert Mirror-Code
Du: "Der Avatar soll größer sein"
AI: ändert `is 24` → `is 32`
Du: siehst die Änderung, verstehst sie, kannst selbst weiter tweaken
```

**Das ist der entscheidende Unterschied:** Du bist nicht ausgeliefert. Du verstehst was die AI generiert hat. Du kannst selbst eingreifen – eine Farbe ändern, einen Abstand anpassen, ein Element verschieben. Der Code gehört dir.

## Dieses Tutorial

Die folgenden Kapitel führen durch alle Konzepte:

| Kapitel | Thema |
|---------|-------|
| 01-03 | **Grundlagen** – Elemente, Komponenten, Tokens |
| 04-05 | **Layout & Styling** – Flex, Grid, Farben, Effekte |
| 06-07 | **Interaktion** – States, Events, Functions |
| 08-09 | **Navigation** – Tabs, Accordion, Overlays |
| 10-12 | **Daten** – Variablen, Content, Tabellen |
| 13-14 | **Struktur** – Bedingungen, Seiten |

Jedes Kapitel enthält interaktive Beispiele – der Code kann direkt bearbeitet werden, das Ergebnis erscheint live.
