---
title: Overlays
subtitle: Tooltip, Popover, HoverCard und Dialog
prev: 08-navigation
next: 10-variablen
---

Overlays sind Elemente, die über dem normalen Content erscheinen. Alle folgen dem gleichen Muster: `Trigger:` definiert das auslösende Element, `Content:` den Overlay-Inhalt.

**Tooltip** zeigt kurze Hinweise bei Hover. **Popover** öffnet bei Klick und zeigt reicheren Inhalt. **HoverCard** ist wie Popover, aber öffnet bei Hover. **Dialog** ist ein modales Fenster, das den Rest der Seite blockiert.

## Tooltip

Tooltips zeigen kurze Hilfetexte bei Hover. Der `Trigger:` ist das Element, über das man hovert – der `Content:` erscheint dann daneben:

```mirror
Tooltip
  Trigger: Button "Hover me"
  Content: Text "This is a tooltip"
```

Mit `positioning` bestimmst du, wo der Tooltip erscheint. Mit `openDelay` und `closeDelay` steuerst du die Verzögerung in Millisekunden:

```mirror
Frame hor, gap 16
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
    Frame hor, spread
      Text "Popover Title", weight bold
      CloseTrigger: Button "X", bg transparent, col #666
    Text "Content goes here"
```

`positioning` funktioniert wie bei Tooltip. Mit `closeOnEscape` und `closeOnInteractOutside` steuerst du das Schließ-Verhalten:

```mirror
Popover positioning "bottom", closeOnEscape
  Trigger: Button "Settings"
  Content: Frame ver, gap 8, pad 12, bg #1a1a1a, rad 8, w 180
    Frame hor, spread
      Text "Notifications"
      Switch
    Frame hor, spread
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
    Frame hor, gap 12
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
    Frame hor, spread
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
    Frame hor, gap 12
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
    Frame hor, spread
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
Frame hor, gap 8
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

## Zusammenfassung

| Komponente | Auslöser | Anwendung |
|------------|----------|-----------|
| `Tooltip` | Hover | Kurze Hilfetexte |
| `Popover` | Klick | Reicherer Inhalt, Menüs |
| `HoverCard` | Hover | Vorschauen, User-Profile |
| `Dialog` | Klick | Modale Fenster, Formulare |

**Slots:** `Trigger:`, `Content:`, `Backdrop:` (Dialog), `CloseTrigger:`

**Optionen:** `positioning`, `openDelay`, `closeDelay`, `closeOnEscape`
