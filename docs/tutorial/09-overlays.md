---
title: Overlays
subtitle: Tooltip, Popover, HoverCard, Dialog, FloatingPanel, Tour und Presence
prev: 08-navigation
next: 10-variablen
---

Overlays sind Elemente, die über dem normalen Content erscheinen. Alle folgen dem gleichen Muster: `Trigger:` definiert das auslösende Element, `Content:` den Overlay-Inhalt.

**Tooltip** zeigt kurze Hinweise bei Hover. **Popover** öffnet bei Klick und zeigt reicheren Inhalt. **HoverCard** ist wie Popover, aber öffnet bei Hover. **Dialog** ist ein modales Fenster, das den Rest der Seite blockiert. **FloatingPanel** ist ein verschiebbares/skalierbares Panel. **Tour** führt Benutzer durch die UI. **Presence** steuert Ein-/Ausblend-Animationen.

## Tooltip

Tooltips zeigen kurze Hilfetexte bei Hover. Der `Trigger:` ist das Element, über das man hovert – der `Content:` erscheint dann daneben:

```mirror
Tooltip
  Trigger: Button "Hover me"
  Content: Text "This is a tooltip"
```

Mit `positioning` bestimmst du, wo der Tooltip erscheint. Mit `openDelay` und `closeDelay` steuerst du die Verzögerung in Millisekunden:

```mirror
Frame hor, gap 16, bg #0a0a0a, pad 16, rad 8
  Tooltip positioning "top"
    Trigger: Button "Top"
    Content: Text "Tooltip on top"
  Tooltip positioning "bottom", openDelay 500
    Trigger: Button "Delayed"
    Content: Text "Shows after 500ms"
```

Der Content kann auch gestylt werden – du kannst beliebige Elemente verwenden:

```mirror
Tooltip
  Trigger: Button "Multi-line"
  Content: Frame ver, gap 4, pad 8
    Text "Title", weight bold
    Text "Description here", col #888, fs 12
```

## Popover

Popovers öffnen bei Klick und bleiben offen, bis man außerhalb klickt oder Escape drückt. Sie eignen sich für reicheren Inhalt wie Formulare oder Listen:

```mirror
Popover
  Trigger: Button "Open Popover"
  Content: Frame ver, gap 8
    Text "Title", weight bold
    Text "Some description text"
```

Mit `CloseTrigger:` kannst du einen expliziten Schließen-Button einbauen:

```mirror
Popover
  Trigger: Button "Open"
  Content: Frame ver, gap 12, pad 16, bg #1a1a1a, rad 8, w 200
    Frame hor, spread, ver-center
      Text "Popover Title", weight bold
      CloseTrigger: Button "X", bg transparent, col #666
    Text "Content goes here"
```

`positioning` funktioniert wie bei Tooltip. Mit `closeOnEscape` und `closeOnInteractOutside` steuerst du das Schließ-Verhalten:

```mirror
Popover positioning "bottom", closeOnEscape
  Trigger: Button "Settings"
  Content: Frame ver, gap 8, pad 12, bg #1a1a1a, rad 8, w 180
    Frame hor, spread, ver-center
      Text "Notifications"
      Switch
    Frame hor, spread, ver-center
      Text "Dark mode"
      Switch
```

## HoverCard

HoverCard ist wie Popover, aber öffnet bei Hover statt Klick. Das ist nützlich für Vorschauen von Links oder User-Profilen:

```mirror
HoverCard
  Trigger: Text "Hover over me", underline, cursor pointer
  Content: Text "HoverCard content"
```

Ein typisches Beispiel ist eine User-Vorschau bei Hover über einen @-Mention:

```mirror
HoverCard positioning "bottom"
  Trigger: Text "@johndoe", col #3b82f6, underline, cursor pointer
  Content: Frame ver, gap 12, pad 16, bg #1a1a1a, rad 12, w 250
    Frame hor, gap 12, ver-center
      Frame w 48, h 48, bg #3b82f6, rad 99, center
        Text "JD", col white, weight 500
      Frame ver
        Text "John Doe", weight 600
        Text "@johndoe", col #666, fs 14
    Text "Software engineer building great tools.", col #888, fs 13
```

## Dialog

Dialoge sind modale Fenster – sie blockieren die Interaktion mit dem Rest der Seite. Neben `Trigger:` und `Content:` gibt es `Backdrop:` für den Hintergrund:

```mirror
Dialog
  Trigger: Button "Open Dialog"
  Content: Frame ver, gap 8, pad 16, bg #1a1a1a, rad 12
    Text "Dialog Title", weight bold, fs 18
    Text "This is the dialog content."
```

Mit `CloseTrigger:` baust du Schließen-Buttons ein. Diese können überall im Content platziert werden:

```mirror
Dialog
  Trigger: Button "Open"
  Content: Frame ver, gap 12, pad 24, bg #1a1a1a, rad 12, w 320
    Frame hor, spread, ver-center
      Text "Settings", weight bold, fs 18
      CloseTrigger: Button "X", bg transparent
    Text "Dialog content here"
```

Mit `Backdrop:` kannst du den Overlay-Hintergrund stylen:

```mirror
Dialog
  Trigger: Button "Custom backdrop"
  Backdrop: bg rgba(0,0,100,0.5)
  Content: Frame pad 24, bg #1a1a1a, rad 12
    Text "Dialog with blue backdrop"
```

## Praktisch: Confirm Dialog

Ein typischer Bestätigungs-Dialog mit zwei Buttons:

```mirror
Dialog
  Trigger: Button "Delete item", bg #ef4444
  Content: Frame ver, gap 16, pad 24, bg #1a1a1a, rad 12, w 380
    Frame hor, gap 12, ver-center
      Frame w 40, h 40, rad 99, bg rgba(239,68,68,0.2), center
        Icon "trash", col #ef4444
      Frame ver
        Text "Delete Item", weight bold, fs 16
        Text "This action cannot be undone.", col #888, fs 14
    Frame hor, gap 8
      CloseTrigger: Button "Cancel" grow
      Button "Delete", bg #ef4444, grow
```

## Praktisch: Form Dialog

Ein Dialog mit Eingabefeldern:

```mirror
Dialog
  Trigger: Button "Create new"
  Content: Frame ver, gap 16, pad 24, bg #1a1a1a, rad 12, w 400
    Frame hor, spread, ver-center
      Text "Create Project", weight bold, fs 18
      CloseTrigger: Button "X", bg transparent, col #666
    Frame ver, gap 12
      Frame ver, gap 4
        Label "Project Name"
        Input placeholder "Enter project name"
      Frame ver, gap 4
        Label "Description"
        Textarea placeholder "Enter description", h 80
    Frame hor, gap 8
      CloseTrigger: Button "Cancel" grow
      Button "Create", bg #3b82f6, grow
```

## Praktisch: Icon Toolbar

Tooltips für eine Icon-Leiste:

```mirror
Frame hor, gap 8, bg #0a0a0a, pad 16, rad 8
  Tooltip positioning "bottom"
    Trigger: Frame pad 8, rad 4, bg #222, cursor pointer
      Icon "home"
    Content: Text "Home", fs 12
  Tooltip positioning "bottom"
    Trigger: Frame pad 8, rad 4, bg #222, cursor pointer
      Icon "settings"
    Content: Text "Settings", fs 12
  Tooltip positioning "bottom"
    Trigger: Frame pad 8, rad 4, bg #222, cursor pointer
      Icon "user"
    Content: Text "Profile", fs 12
```

---

## FloatingPanel

Verschiebbares und skalierbares Panel – ideal für Tool-Paletten, Inspektoren oder Chat-Widgets.

```mirror
FloatingPanel draggable, resizable
  Trigger: Button "Panel öffnen", pad 10 20, bg #2563eb, col white, rad 6
  Content: Frame w 300, h 200, bg #1a1a1a, rad 12, shadow lg, clip
    Header: Frame hor, spread, ver-center, pad 12 16, bg #252525, cursor grab
      DragTrigger: Frame hor, gap 8, ver-center
        Icon "grip-vertical", ic #666, is 14
        Text "Tool-Palette", col white, weight 500
      CloseTrigger: Frame pad 4, rad 4, cursor pointer
        hover:
          bg #333
        Icon "x", ic #888, is 14
    Body: Frame pad 16, gap 8
      Text "Panel-Inhalt hier", col #888
      Button "Aktion", pad 8 16, bg #333, col white, rad 4
    ResizeTrigger: absolute, bottom 4, right 4, cursor nwse-resize
      Icon "grip", ic #444, is 12
```

### Mit fester Position

```mirror
FloatingPanel defaultPosition "{ x: 100, y: 50 }", draggable
  Trigger: Button "Inspector", pad 8 16, bg #333, col white, rad 4
  Content: Frame w 250, bg #1a1a1a, rad 8, shadow lg
    Header: Frame hor, spread, pad 12, bg #252525, rad 8 8 0 0, cursor grab
      DragTrigger: Text "Inspector", col white, fs 13, weight 500
      CloseTrigger: Icon "x", ic #666, is 14, cursor pointer
    Body: Frame pad 12, gap 8
      Frame gap 4
        Text "Position", col #666, fs 11
        Text "x: 120, y: 340", col white, fs 12, font mono
      Frame gap 4
        Text "Size", col #666, fs 11
        Text "200 × 150", col white, fs 12, font mono
```

### Skalierbar mit Limits

```mirror
FloatingPanel resizable, minSize "{ width: 200, height: 150 }", maxSize "{ width: 500, height: 400 }"
  Trigger: Button "Notes", pad 8 16, bg #333, col white, rad 4
  Content: Frame w 280, h 200, bg #1a1a1a, rad 8, shadow lg
    Header: Frame pad 12, bg #252525, rad 8 8 0 0
      Text "Notizen", col white, weight 500
    Body: Frame pad 12, h full
      Textarea placeholder "Notizen hier...", w full, h full, bg #252525, col white, bor 0, rad 4
    ResizeTrigger: absolute, bottom 0, right 0, w 16, h 16, cursor nwse-resize
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `open` | boolean | Offen (controlled) |
| `defaultOpen` | boolean | Start-Zustand |
| `position` | object | Position `{ x, y }` |
| `defaultPosition` | object | Start-Position |
| `size` | object | Größe `{ width, height }` |
| `defaultSize` | object | Start-Größe |
| `minSize` | object | Minimale Größe |
| `maxSize` | object | Maximale Größe |
| `draggable` | boolean | Verschiebbar |
| `resizable` | boolean | Skalierbar |
| `lockAspectRatio` | boolean | Seitenverhältnis fixieren |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Trigger:` | Auslöser |
| `Positioner:` | Positionierungs-Container |
| `Content:` | Panel-Inhalt |
| `Header:` | Header-Bereich |
| `Body:` | Body-Bereich |
| `DragTrigger:` | Drag-Handle |
| `CloseTrigger:` | Schließen-Button |
| `ResizeTrigger:` | Resize-Handle |

---

## Tour

Geführte Tour durch die UI – zeigt Schritte mit Spotlight auf Elemente.

```mirror
Tour defaultStep 1
  Backdrop: bg rgba(0,0,0,0.7)
  Spotlight: rad 8
  Content: Frame w 300, bg #1a1a1a, rad 12, pad 20, shadow lg, gap 12
  Title: col white, fs 16, weight 600
  Description: col #888, fs 14
  Actions: hor, gap 8, margin 8 0 0 0
  PrevTrigger: Button "Zurück", pad 8 16, bg #333, col white, rad 6
  NextTrigger: Button "Weiter", pad 8 16, bg #2563eb, col white, rad 6
  CloseTrigger: absolute, top 12, right 12
    Icon "x", ic #666, is 16, cursor pointer
  ProgressText: col #666, fs 12

  TourStep target "[name=search]"
    Title: "Suche"
    Description: "Hier kannst du nach Inhalten suchen."
  TourStep target "[name=sidebar]"
    Title: "Navigation"
    Description: "Die Sidebar enthält alle Bereiche."
  TourStep target "[name=editor]"
    Title: "Editor"
    Description: "Hier bearbeitest du deine Dateien."
```

### Kompakte Tour

```mirror
Tour defaultStep 1, closeOnEscape, closeOnOutsideClick
  Backdrop: bg rgba(0,0,0,0.5)
  Spotlight: rad 4, spotlightOffset 8
  Content: Frame w 260, bg #1a1a1a, rad 8, pad 16, shadow lg
  Title: col white, fs 14, weight 500
  Description: col #888, fs 13, margin 4 0 0 0
  Actions: hor, spread, margin 12 0 0 0
  PrevTrigger: col #888, fs 13, cursor pointer
    "← Zurück"
  NextTrigger: col #2563eb, fs 13, cursor pointer
    "Weiter →"
  ProgressText: col #444, fs 11

  TourStep target "#feature-1"
    Title: "Neue Funktion"
    Description: "Das ist neu in Version 2.0."
  TourStep target "#feature-2"
    Title: "Verbesserung"
    Description: "Das wurde verbessert."
```

### Mit Fortschritts-Anzeige

```mirror
Tour defaultStep 1
  Backdrop: bg rgba(0,0,0,0.6)
  Content: Frame w 320, bg #1a1a1a, rad 12, clip
    Frame pad 16, gap 8
      Title: col white, fs 16, weight 500
      Description: col #888, fs 14
    Frame pad 12 16, bg #252525, hor, spread, ver-center
      ProgressText: col #666, fs 12
      Actions: hor, gap 8
        PrevTrigger: Button "←", pad 8, bg #333, col white, rad 4
        NextTrigger: Button "→", pad 8, bg #2563eb, col white, rad 4

  TourStep target "#step1"
    Title: "Schritt 1"
    Description: "Erster Schritt der Tour."
  TourStep target "#step2"
    Title: "Schritt 2"
    Description: "Zweiter Schritt der Tour."
  TourStep target "#step3"
    Title: "Schritt 3"
    Description: "Letzter Schritt."
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `step` | number | Aktueller Schritt (controlled) |
| `defaultStep` | number | Start-Schritt |
| `closeOnEscape` | boolean | Mit Escape schließen |
| `closeOnOutsideClick` | boolean | Bei Klick außerhalb schließen |
| `preventInteraction` | boolean | Interaktion mit Hintergrund verhindern |
| `spotlightOffset` | number | Abstand um Spotlight |
| `spotlightRadius` | number | Radius des Spotlights |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Backdrop:` | Dunkler Hintergrund |
| `Spotlight:` | Hervorgehobener Bereich |
| `Positioner:` | Positionierung |
| `Content:` | Tooltip-Box |
| `Title:` | Titel |
| `Description:` | Beschreibung |
| `Arrow:` | Pfeil zum Element |
| `CloseTrigger:` | Schließen-Button |
| `PrevTrigger:` | Zurück-Button |
| `NextTrigger:` | Weiter-Button |
| `ProgressText:` | "1 von 3" |
| `Actions:` | Button-Container |

### TourStep Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `target` | string | CSS-Selector des Ziel-Elements |

---

## Presence

Steuert Ein- und Ausblend-Animationen von Elementen. Nützlich für sanfte Übergänge.

```mirror
$visible: true

Frame gap 16
  Button "Toggle", pad 10 20, bg #333, col white, rad 6, toggle()
    on:
      "Ausblenden"
    "Einblenden"

  Presence present $visible
    Root: Frame pad 20, bg #2563eb, rad 8
      anim fade-in, duration 200
      Text "Ich werde ein- und ausgeblendet", col white
```

### Mit Slide-Animation

```mirror
$showPanel: false

Frame gap 16
  Button "Panel anzeigen", pad 10 20, bg #333, col white, rad 6, show(Panel)

  Presence present $showPanel, lazyMount, unmountOnExit
    Root: Frame w 300, bg #1a1a1a, pad 20, rad 12, shadow lg, name Panel
      anim slide-in, direction left, duration 300
      Frame hor, spread, ver-center, margin 0 0 16 0
        Text "Side Panel", col white, weight 500
        Button "X", bg transparent, col #666, hide(Panel)
      Text "Panel-Inhalt hier", col #888
```

### Für Listen-Items

```mirror
$items: ["A", "B", "C"]

Frame gap 8
  each item in $items
    Presence present true, lazyMount
      Root: Frame pad 12, bg #1a1a1a, rad 6
        anim scale-in, duration 150, delay index * 50
        Text item, col white
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `present` | boolean | Element sichtbar |
| `lazyMount` | boolean | Erst bei Anzeige mounten |
| `unmountOnExit` | boolean | Nach Ausblenden unmounten |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Das animierte Element |

### Typische Animationen

| Animation | Beschreibung |
|-----------|--------------|
| `fade-in` / `fade-out` | Ein-/Ausblenden |
| `slide-in` / `slide-out` | Reinsliden |
| `scale-in` / `scale-out` | Skalieren |

---

## Zusammenfassung

| Komponente | Auslöser | Anwendung |
|------------|----------|-----------|
| `Tooltip` | Hover | Kurze Hilfetexte |
| `Popover` | Klick | Reicherer Inhalt, Menüs |
| `HoverCard` | Hover | Vorschauen, User-Profile |
| `Dialog` | Klick | Modale Fenster, Formulare |
| `FloatingPanel` | Klick | Verschiebbare/skalierbare Panels |
| `Tour` | Programmatisch | Geführte UI-Touren |
| `Presence` | Binding | Ein-/Ausblend-Animationen |

**Gemeinsame Slots:** `Trigger:`, `Content:`, `CloseTrigger:`

**Dialog:** `Backdrop:`, `modal`, `preventScroll`

**FloatingPanel:** `Header:`, `Body:`, `DragTrigger:`, `ResizeTrigger:`, `draggable`, `resizable`

**Tour:** `Backdrop:`, `Spotlight:`, `PrevTrigger:`, `NextTrigger:`, `ProgressText:`

**Presence:** `present`, `lazyMount`, `unmountOnExit`

**Optionen:** `positioning`, `openDelay`, `closeDelay`, `closeOnEscape`
