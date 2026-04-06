---
title: Feedback & Status
subtitle: Progress, CircularProgress, Toast und Marquee
prev: 19-media
next: 21-utility
---

Komponenten für Feedback und Status-Anzeigen. **Progress** zeigt linearen Fortschritt. **CircularProgress** ist die runde Variante. **Toast** zeigt temporäre Benachrichtigungen. **Marquee** ist ein Laufband-Text.

## Progress

Linearer Fortschrittsbalken.

```mirror
Progress value 60, max 100
  Root: gap 8, w 300
  Label: hor, spread
    Text "Fortschritt", col white, fs 13
    ValueText: col #888, fs 12
  Track: h 8, bg #333, rad 99
  Range: bg #2563eb, rad 99
```

### Mit Animation

```mirror
Progress value 75
  Root: gap 4, w 280
  Label: col #888, fs 12
    "Upload läuft..."
  Track: h 6, bg #333, rad 99, clip
  Range: bg grad #2563eb #7c3aed, rad 99
    // Animierter Streifen-Effekt über CSS
```

### Indeterminate (unbestimmt)

```mirror
Progress
  Root: w 280
  Track: h 4, bg #333, rad 99, clip
  Range: bg #2563eb, rad 99, w 30%
    // Animation: von links nach rechts bewegen
```

### Verschiedene Farben

```mirror
Frame gap 12, w 300

  Progress value 90
    Label: hor, spread
      Text "CPU", col white, fs 12
      ValueText: col #888, fs 11
    Track: h 6, bg #333, rad 99
    Range: bg #10b981, rad 99

  Progress value 65
    Label: hor, spread
      Text "Memory", col white, fs 12
      ValueText: col #888, fs 11
    Track: h 6, bg #333, rad 99
    Range: bg #f59e0b, rad 99

  Progress value 95
    Label: hor, spread
      Text "Disk", col white, fs 12
      ValueText: col #888, fs 11
    Track: h 6, bg #333, rad 99
    Range: bg #ef4444, rad 99
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `value` | number | Aktueller Wert |
| `min` | number | Minimum (default: 0) |
| `max` | number | Maximum (default: 100) |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Track:` | Hintergrund-Balken |
| `Range:` | Gefüllter Bereich |
| `Label:` | Label |
| `ValueText:` | Wert-Anzeige (z.B. "60%") |

---

## CircularProgress

Kreisförmiger Fortschritt – gut für Dashboards und kompakte Anzeigen.

```mirror
CircularProgress value 75
  Root: w 120, h 120, center
  Circle: w 100, h 100
  CircleTrack: stroke #333, stroke-width 8
  CircleRange: stroke #2563eb, stroke-width 8
  ValueText: col white, fs 24, weight 600
```

### Mit Label

```mirror
CircularProgress value 42, max 100
  Root: gap 8, center
  Circle: w 80, h 80
  CircleTrack: stroke #333, stroke-width 6
  CircleRange: stroke #10b981, stroke-width 6
  Label: col #888, fs 12
    "Abgeschlossen"
```

### Verschiedene Größen

```mirror
Frame hor, gap 24

  CircularProgress value 25
    Root: w 60, h 60
    Circle: w 50, h 50
    CircleTrack: stroke #333, stroke-width 4
    CircleRange: stroke #ef4444, stroke-width 4
    ValueText: col white, fs 12

  CircularProgress value 50
    Root: w 80, h 80
    Circle: w 70, h 70
    CircleTrack: stroke #333, stroke-width 6
    CircleRange: stroke #f59e0b, stroke-width 6
    ValueText: col white, fs 16

  CircularProgress value 75
    Root: w 100, h 100
    Circle: w 90, h 90
    CircleTrack: stroke #333, stroke-width 8
    CircleRange: stroke #10b981, stroke-width 8
    ValueText: col white, fs 20
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `value` | number | Aktueller Wert |
| `min` | number | Minimum (default: 0) |
| `max` | number | Maximum (default: 100) |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Circle:` | SVG Container |
| `CircleTrack:` | Hintergrund-Kreis |
| `CircleRange:` | Gefüllter Bogen |
| `Label:` | Label |
| `ValueText:` | Wert in der Mitte |

---

## Toast

Temporäre Benachrichtigungen – erscheinen und verschwinden automatisch.

```mirror
Toast type "success", duration 5000
  Root: hor, gap 12, bg #1a1a1a, bor 1, boc #333, pad 16, rad 12, shadow lg, w 320
    success:
      boc #10b981
    error:
      boc #ef4444
    warning:
      boc #f59e0b

  Frame w 24, h 24, rad 99, center
    success:
      bg #10b981
      Icon "check", ic white, is 14
    error:
      bg #ef4444
      Icon "x", ic white, is 14
    warning:
      bg #f59e0b
      Icon "alert-triangle", ic white, is 14

  Frame w full, gap 2
    Title: col white, fs 14, weight 500
    Description: col #888, fs 13

  CloseTrigger: pad 4, col #666, cursor pointer
    hover:
      col white
    Icon "x", is 16
```

### Verschiedene Typen

```mirror
Frame gap 12

  Toast type "success"
    Root: hor, gap 12, bg #1a1a1a, bor 1, boc #10b981, pad 12, rad 8
    Title: col white, fs 14
      "Erfolgreich gespeichert"
    CloseTrigger: col #666
      Icon "x", is 14

  Toast type "error"
    Root: hor, gap 12, bg #1a1a1a, bor 1, boc #ef4444, pad 12, rad 8
    Title: col white, fs 14
      "Fehler beim Speichern"

  Toast type "warning"
    Root: hor, gap 12, bg #1a1a1a, bor 1, boc #f59e0b, pad 12, rad 8
    Title: col white, fs 14
      "Verbindung instabil"
```

### Mit Action-Button

```mirror
Toast
  Root: hor, gap 12, bg #1a1a1a, pad 16, rad 12, shadow lg
  Title: col white, fs 14
    "Datei gelöscht"
  Description: col #888, fs 13
    "Die Datei wurde in den Papierkorb verschoben."
  ActionTrigger: pad 8 12, bg #2563eb, col white, rad 6, fs 13
    "Rückgängig"
  CloseTrigger: col #666
    Icon "x", is 16
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `type` | "success" \| "error" \| "warning" \| "info" | Toast-Typ |
| `duration` | number | Anzeigedauer in ms |
| `placement` | string | Position |
| `removeDelay` | number | Verzögerung vor Entfernung |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Title:` | Titel |
| `Description:` | Beschreibung |
| `CloseTrigger:` | Schließen-Button |
| `ActionTrigger:` | Action-Button |

---

## Marquee

Laufband-Text – scrollt horizontal durch.

```mirror
Marquee speed 50, pauseOnHover
  Root: w full, clip, bg #1a1a1a, pad 12
  Content: hor, gap 48
    Text "🎉 Willkommen zur großen Eröffnung!", col white
    Text "⭐ 50% Rabatt auf alles!", col #f59e0b
    Text "🚀 Kostenloser Versand ab 50€", col #10b981
```

### News-Ticker

```mirror
Frame bg #1a1a1a, bor 0 0 1 0, boc #333

  Frame hor
    Frame bg #ef4444, pad 8 16
      Text "BREAKING", col white, fs 12, weight 600

    Marquee speed 40
      Root: w full, pad 8 16
      Content: hor, gap 64
        Text "Aktuelle Nachrichten hier...", col white, fs 14
        Text "Weitere Meldung...", col white, fs 14
```

### Logo-Parade

```mirror
Marquee speed 30
  Root: pad 24, bg #0a0a0a
  Content: hor, gap 48, ver-center
    Frame w 100, h 40, bg #333, rad 4, center
      Text "Logo 1", col #888, fs 12
    Frame w 100, h 40, bg #333, rad 4, center
      Text "Logo 2", col #888, fs 12
    Frame w 100, h 40, bg #333, rad 4, center
      Text "Logo 3", col #888, fs 12
    Frame w 100, h 40, bg #333, rad 4, center
      Text "Logo 4", col #888, fs 12
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `speed` | number | Geschwindigkeit (px/s) |
| `direction` | "left" \| "right" | Richtung |
| `pauseOnHover` | boolean | Bei Hover pausieren |
| `gap` | number | Abstand zwischen Wiederholungen |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container (sollte `clip` haben) |
| `Content:` | Scrollender Inhalt |

---

## Praktisch: Notification-Center

```mirror
Frame w 360, bg #111, rad 12, clip

  Frame hor, spread, ver-center, pad 16, bor 0 0 1 0, boc #333
    Text "Benachrichtigungen", col white, weight 500
    Frame bg #ef4444, pad 2 8, rad 99
      Text "3", col white, fs 11

  Frame gap 2, pad 8, maxh 300, scroll

    Toast type "success"
      Root: hor, gap 12, pad 12, rad 8, cursor pointer
        hover:
          bg #1a1a1a
      Frame w 8, h 8, bg #10b981, rad 99, margin 6 0 0 0
      Frame w full
        Title: col white, fs 13
          "Projekt erstellt"
        Description: col #666, fs 12
          "vor 2 Minuten"

    Toast type "info"
      Root: hor, gap 12, pad 12, rad 8, cursor pointer
        hover:
          bg #1a1a1a
      Frame w 8, h 8, bg #2563eb, rad 99, margin 6 0 0 0
      Frame w full
        Title: col white, fs 13
          "Neuer Kommentar"
        Description: col #666, fs 12
          "vor 15 Minuten"

    Toast type "warning"
      Root: hor, gap 12, pad 12, rad 8, cursor pointer
        hover:
          bg #1a1a1a
      Frame w 8, h 8, bg #f59e0b, rad 99, margin 6 0 0 0
      Frame w full
        Title: col white, fs 13
          "Speicherplatz niedrig"
        Description: col #666, fs 12
          "vor 1 Stunde"
```

---

## Praktisch: Dashboard-Widgets

```mirror
Frame hor, gap 16

  Frame bg #1a1a1a, pad 20, rad 12, gap 12, center
    CircularProgress value 87
      Circle: w 80, h 80
      CircleTrack: stroke #333, stroke-width 6
      CircleRange: stroke #10b981, stroke-width 6
      ValueText: col white, fs 18, weight 600
    Text "Verfügbarkeit", col #888, fs 12

  Frame bg #1a1a1a, pad 20, rad 12, gap 12, w 200
    Frame hor, spread
      Text "Downloads", col white, fs 13
      Text "1.2k / 2k", col #888, fs 12
    Progress value 60
      Track: h 8, bg #333, rad 99
      Range: bg #2563eb, rad 99

  Frame bg #1a1a1a, pad 20, rad 12, gap 12, center
    CircularProgress value 23
      Circle: w 80, h 80
      CircleTrack: stroke #333, stroke-width 6
      CircleRange: stroke #ef4444, stroke-width 6
      ValueText: col white, fs 18, weight 600
    Text "Fehlerrate", col #888, fs 12
```

---

## Zusammenfassung

| Komponente | Verwendung |
|------------|-----------|
| `Progress` | Linearer Fortschritt |
| `CircularProgress` | Runder Fortschritt |
| `Toast` | Temporäre Benachrichtigung |
| `Marquee` | Laufband-Text |

**Toast-Typen:** `success`, `error`, `warning`, `info`

**Progress-States:** Determinate (mit value) oder Indeterminate (ohne value)
