---
title: Interaktion
subtitle: Wie Elemente auf Benutzer reagieren
prev: 05-styling
next: 07-functions
---

Bisher haben wir statische UIs gebaut. Jetzt lernen wir, wie Elemente ihr Aussehen ändern können – bei Hover, bei Klick, oder wenn etwas anderes passiert. Das Konzept dahinter: **States**.

## Das Konzept: States

Ein **State** beschreibt, wie ein Element in einem bestimmten Zustand aussieht. Ein Button kann zum Beispiel diese States haben:

- **Base** – der Normalzustand (grauer Hintergrund)
- **hover** – wenn die Maus darüber ist (hellerer Hintergrund)
- **on** – wenn er aktiviert wurde (blauer Hintergrund)

In Mirror trennen wir klar:

| Syntax | Bedeutung |
|--------|-----------|
| `on:` | **State** – definiert das Aussehen |
| `toggle()` | **Funktion** – was bei Klick passiert |

States beschreiben Styles, Funktionen definieren Aktionen. Klick ist der Default-Event – du schreibst einfach die Funktion als Property.

## System-States: hover, focus, active

Manche States werden automatisch vom Browser ausgelöst – du musst keinen Trigger definieren. Der Browser weiß selbst, wann die Maus über einem Element ist:

```mirror
Btn: pad 12 24, rad 6, bg #333, col white, cursor pointer
  hover:
    bg #2563eb
    scale 1.02

Btn "Hover mich"
```

Der `hover:` State definiert nur das Aussehen. Der Browser kümmert sich darum, wann dieser State aktiv wird (Maus drüber) und wann nicht (Maus weg).

> **Note:** **System-States:** `hover:` (Maus darüber), `focus:` (Tastatur-Fokus), `active:` (während Klick gedrückt). Diese brauchen keinen Event-Trigger.

## Custom States und toggle()

Für eigene Interaktionen definierst du **Custom States**. Anders als System-States werden diese nicht automatisch ausgelöst – du brauchst eine Funktion die sie auslöst:

```mirror
Btn: pad 12 24, rad 6, bg #333, col white, cursor pointer, toggle()
  on:
    bg #2563eb

Btn "An/Aus"
```

Hier passieren zwei Dinge:

- `on:` definiert einen State namens "on" mit blauem Hintergrund
- `toggle()` wechselt bei Klick zwischen Base und dem State

**Base** ist der Normalzustand – die Styles, die du direkt am Element definierst (hier: `bg #333`). Du brauchst keinen extra "off" State.

> **Kurzschreibweise:** Funktionen als Properties werden automatisch zu onclick-Events. `toggle()` ist dasselbe wie `onclick: toggle()`. Du kannst auch mehrere Aktionen kombinieren: `toggle(), show(Menu)`.

### Im State starten

Manchmal soll ein Element bereits im aktivierten State starten. Dafür gibst du den State-Namen bei der Instanz an:

```mirror
FavBtn: pad 12 24, rad 6, bg #333, col white, cursor pointer, hor, gap 8, toggle()
  Icon "heart", ic #888, is 16
  "Merken"
  on:
    bg #2563eb
    Icon "heart", ic white, is 16, fill
    "Gemerkt"

Frame hor, gap 12
  FavBtn
  FavBtn on
```

Der zweite Button startet im `on` State. Beide Buttons sind unabhängig voneinander – jeder toggelt für sich. Für "nur einer aktiv" siehe `exclusive()` weiter unten.

## States können alles ändern

Bisher haben States nur Styles geändert (Farben, Größen). Aber States können auch **komplett andere Kinder** haben – wie Figma Variants:

```mirror
ExpandBtn: pad 12, bg #333, col white, rad 6, hor, gap 8, cursor pointer, toggle()
  "Mehr zeigen"
  Icon "chevron-down", ic white, is 16
  open:
    "Weniger zeigen"
    Icon "chevron-up", ic white, is 16

ExpandBtn
```

Im Base-State zeigt der Button "Mehr zeigen" mit Pfeil nach unten. Im `open`-State wird _alles_ ausgetauscht: anderer Text, anderes Icon.

> **Note:** **Wie Figma Variants:** Jeder State kann eine komplett andere Version der Komponente sein – nicht nur andere Farben, sondern andere Inhalte, andere Struktur.

## Mehrere States

Was wenn du mehr als zwei Zustände brauchst? Ein Task kann "todo", "doing" oder "done" sein. `toggle()` erkennt das automatisch und cyclet durch alle States:

```mirror
StatusBtn: pad 12 24, rad 6, col white, cursor pointer, hor, gap 8, toggle()
  todo:
    bg #333
    Icon "circle", ic white, is 14
  doing:
    bg #f59e0b
    Icon "clock", ic white, is 14
  done:
    bg #10b981
    Icon "check", ic white, is 14

StatusBtn "Task 1"
```

`toggle()` erkennt automatisch wie viele States du hast:

- **1 State** → binärer Wechsel: default ↔ state
- **2+ States** → Cycle: todo → doing → done → todo → ...

> **Note:** **Wichtig:** Der _erste_ definierte State ist der Startzustand. Die Reihenfolge der Definition bestimmt die Cycle-Reihenfolge.

## Nur einer aktiv: exclusive()

Bei Tabs oder Radio-Buttons soll immer nur _ein_ Element aktiv sein. Wenn du eines aktivierst, werden alle anderen automatisch deaktiviert:

```mirror
Tab: pad 12 20, rad 6, bg #333, col #888, cursor pointer, exclusive()
  active:
    bg #2563eb
    col white

Frame hor, gap 4, bg #1a1a1a, pad 4, rad 8
  Tab "Home"
  Tab "Projekte", active
  Tab "Settings"
```

`exclusive()` macht zwei Dinge: Es aktiviert das geklickte Element und deaktiviert alle Geschwister des gleichen Typs.

**Gruppierung:** Mirror erkennt automatisch, welche Elemente zusammengehören – alle `Tab`-Instanzen mit dem gleichen Parent bilden eine Gruppe.

## Auf andere Elemente reagieren

Manchmal soll ein Element sein Aussehen ändern, wenn ein _anderes_ Element seinen State wechselt. Klassisches Beispiel: Ein Menü wird sichtbar, wenn ein Button aktiviert wird.

Dafür brauchst du zwei Dinge:

- Gib dem steuernden Element einen **Namen** mit `name`
- Referenziere diesen Namen mit `Name.state:`

```mirror
Frame gap 12
  Button "Menü", name MenuBtn, pad 10 20, rad 6, bg #333, col white, toggle()
    open:
      bg #2563eb

  Frame bg #1a1a1a, pad 12, rad 8, gap 4, hidden
    MenuBtn.open:
      visible
    Text "Dashboard", col white, fs 14, pad 8
    Text "Einstellungen", col white, fs 14, pad 8
```

`MenuBtn.open:` bedeutet: "Wenn das Element namens MenuBtn im State 'open' ist, wende diese Styles an." Das Menü startet `hidden` und wird sichtbar, sobald der Button aktiviert wird.

## Praktisch: Accordion

Ein Accordion zeigt im geschlossenen Zustand nur einen Header, im offenen Zustand auch den Inhalt:

```mirror
Panel: bg #1a1a1a, rad 8, clip, toggle()
  Frame hor, spread, pad 16, cursor pointer
    Text "Mehr anzeigen", col white, fs 14
    Icon "chevron-down", ic #888, is 18
  open:
    Frame hor, spread, pad 16, cursor pointer
      Text "Weniger anzeigen", col white, fs 14
      Icon "chevron-up", ic #888, is 18
    Frame pad 0 16 16 16, gap 8
      Text "Hier ist der versteckte Inhalt.", col #888, fs 13

Panel
```

Der Base-State zeigt "Mehr anzeigen" mit Pfeil nach unten. Der `open`-State zeigt "Weniger anzeigen" mit Pfeil nach oben plus den zusätzlichen Inhalt.

## Weitere Events

Klick ist der Default – du schreibst einfach die Funktion. Für andere Events wie Tastatureingaben gibt es Shorthands:

### Tastatur: onkeyenter, onkeyescape

Mit `onkeyenter` oder `onkeyescape` reagierst du auf Tastatureingaben:

```mirror
SearchStatus: col #888, fs 12, name Status
  "Tippe und drücke Enter..."
  searching:
    col #2563eb
    "Suche läuft..."

SearchBox: hor, gap 8, bg #1a1a1a, pad 12, rad 8
  Icon "search", ic #888, is 18
  Input placeholder "Suche...", bg transparent, col white, bor 0, w full, name SearchInput, onkeyenter toggle()
    searching:
      bg #252525

Frame gap 12
  SearchBox
  SearchStatus
    SearchInput.searching:
      searching
```

### Keyboard-Shorthands

Für häufige Tasten gibt es Kurzformen:

| Shorthand | Entspricht | Beschreibung |
|-----------|------------|--------------|
| `onkeyenter` | `onkeydown enter:` | Enter/Return-Taste |
| `onkeyescape` | `onkeydown escape:` | Escape-Taste |
| `onkeyspace` | `onkeydown space:` | Leertaste |

Für andere Tasten verwendest du die vollständige Syntax:

| Event | Beschreibung |
|-------|--------------|
| `onkeydown arrow-up:` | Pfeiltaste hoch |
| `onkeydown arrow-down:` | Pfeiltaste runter |
| `onkeydown tab:` | Tab-Taste |

```mirror
Btn: = Button pad 12 24, rad 6, bg #333, col white, cursor pointer
  hover:
    bg #444

Frame gap 8
  Btn "Enter drücken", onkeyenter toggle()
    on:
      bg #2563eb
  Btn "Escape drücken", onkeyescape toggle()
    on:
      bg #ef4444
```

---

## Zusammenfassung

States definieren das Aussehen, Funktionen definieren Aktionen.

| Syntax | Bedeutung |
|--------|-----------|
| `hover:` | System-State (automatisch bei Maus-Hover) |
| `on:` | Custom State (visueller Block) |
| `toggle()` | Bei Klick State wechseln |
| `exclusive()` | Nur dieser aktiv (Geschwister aus) |
| `onkeyenter search()` | Bei Enter-Taste |
| `Btn "Text", on` | Instanz startet im State "on" |
| `name MenuBtn` | Element benennen |
| `MenuBtn.open:` | Styles wenn MenuBtn in "open" |
