---
title: Date & Time
subtitle: DatePicker, DateInput und Timer
prev: 17-selection
next: 19-media
---

Komponenten für Datum und Zeit. **DatePicker** ist ein vollständiger Kalender. **DateInput** ist eine segmentierte Eingabe. **Timer** ist ein Countdown/Stoppuhr.

## DatePicker

Ein Kalender zur Datumsauswahl mit Navigation zwischen Monaten und Jahren.

```mirror
DatePicker
  Root: gap 4
  Label: col #888, fs 12
    "Datum"
  Control: hor, bg #1a1a1a, bor 1, boc #333, rad 8
  Input: w 160, bg transparent, col white, pad 12, bor 0
  Trigger: pad 12, col #666, cursor pointer
    Icon "calendar", is 18

  Content: bg #1a1a1a, rad 12, pad 16, shadow lg, w 300
  ViewControl: hor, spread, ver-center, margin 0 0 12 0
  PrevTrigger: pad 8, col #888, cursor pointer, rad 4
    hover:
      bg #333
    Icon "chevron-left", is 18
  ViewTrigger: col white, weight 500, cursor pointer
  NextTrigger: pad 8, col #888, cursor pointer, rad 4
    hover:
      bg #333
    Icon "chevron-right", is 18

  Table: w full
  TableHeader: col #666, fs 12, pad 8
  TableCell: pad 0
  TableCellTrigger: w 36, h 36, rad 6, col white, cursor pointer
    hover:
      bg #333
    selected:
      bg #2563eb
    disabled:
      col #444
      cursor default
```

### Range-Auswahl

```mirror
DatePicker selectionMode "range"
  Control: hor, bg #1a1a1a, bor 1, boc #333, rad 8
  Input: w 200, bg transparent, col white, pad 12, bor 0
  Trigger: pad 12, col #666
    Icon "calendar", is 18

  Content: bg #1a1a1a, rad 12, pad 16, shadow lg
  ViewControl: hor, spread, ver-center, margin 0 0 12 0
  PrevTrigger: pad 8, col #888, rad 4
    Icon "chevron-left", is 18
  NextTrigger: pad 8, col #888, rad 4
    Icon "chevron-right", is 18

  TableCellTrigger: w 36, h 36, rad 6, col white, cursor pointer
    hover:
      bg #333
    selected:
      bg #2563eb
    inrange:
      bg #1e3a5f
```

### Mit Presets

```mirror
DatePicker
  Control: hor, bg #1a1a1a, bor 1, boc #333, rad 8
  Input: w 180, bg transparent, col white, pad 12, bor 0

  Content: hor, bg #1a1a1a, rad 12, shadow lg
    Frame w 140, pad 12, bor 0 1 0 0, boc #333, gap 4
      PresetTrigger: w full, pad 8 12, rad 4, col #888, cursor pointer
        hover:
          bg #333
          col white
      PresetTrigger value "today"
        "Heute"
      PresetTrigger value "yesterday"
        "Gestern"
      PresetTrigger value "last7days"
        "Letzte 7 Tage"
      PresetTrigger value "last30days"
        "Letzte 30 Tage"
    Frame pad 16
      // Kalender hier
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `value` | Date \| Date[] | Ausgewähltes Datum |
| `defaultValue` | Date \| Date[] | Startwert |
| `min` | Date | Frühestes Datum |
| `max` | Date | Spätestes Datum |
| `disabled` | boolean | Deaktiviert |
| `readOnly` | boolean | Nur Anzeige |
| `selectionMode` | "single" \| "multiple" \| "range" | Auswahlmodus |
| `fixedWeeks` | boolean | Immer 6 Wochen |
| `startOfWeek` | number | Wochenstart (0=So, 1=Mo) |
| `closeOnSelect` | boolean | Nach Auswahl schließen |
| `locale` | string | Sprache (z.B. "de-DE") |
| `positioning` | string | Dropdown-Position |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Label:` | Label |
| `Control:` | Input-Container |
| `Input:` | Textfeld |
| `Trigger:` | Kalender-Button |
| `Content:` | Kalender-Dropdown |
| `ViewControl:` | Navigation (Prev/Next) |
| `PrevTrigger:` | Vorheriger Monat |
| `NextTrigger:` | Nächster Monat |
| `ViewTrigger:` | Monat/Jahr-Anzeige |
| `RangeText:` | Datum-Bereich Text |
| `Table:` | Kalender-Tabelle |
| `TableHead:` | Wochentage-Header |
| `TableHeader:` | Einzelner Wochentag |
| `TableBody:` | Wochen |
| `TableRow:` | Eine Woche |
| `TableCell:` | Tag-Zelle |
| `TableCellTrigger:` | Klickbarer Tag |
| `MonthSelect:` | Monat-Dropdown |
| `YearSelect:` | Jahr-Dropdown |
| `ClearTrigger:` | Löschen-Button |
| `PresetTrigger:` | Preset-Button |

---

## DateInput

Segmentierte Datums-Eingabe – jedes Segment (Tag, Monat, Jahr) ist einzeln editierbar.

```mirror
DateInput
  Root: gap 4
  Label: col #888, fs 12
    "Geburtsdatum"
  Control: hor, gap 0, bg #1a1a1a, bor 1, boc #333, rad 8, pad 12
  Segment: col white, fs 14, pad 2 4, rad 2
    focus:
      bg #2563eb
    placeholder:
      col #666
  Separator: col #666, pad 0 2
    "/"
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `value` | Date | Datum |
| `defaultValue` | Date | Startwert |
| `disabled` | boolean | Deaktiviert |
| `readOnly` | boolean | Nur Anzeige |
| `locale` | string | Sprache |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Label:` | Label |
| `Control:` | Segmente-Container |
| `Segment:` | Einzelnes Segment (Tag/Monat/Jahr) |
| `Separator:` | Trennzeichen |

---

## Timer

Countdown oder Stoppuhr mit Start/Stop/Reset-Kontrollen.

```mirror
Timer countdown, defaultValue 300000
  Root: gap 16, center
  Area: hor, gap 0
  Segment: col white, fs 48, weight 200, font mono
  Separator: col #666, fs 48
    ":"

  Control: hor, gap 8
  ActionTrigger: pad 12 24, rad 8, col white, cursor pointer
    action "start"
      bg #2563eb
      "Start"
    action "pause"
      bg #f59e0b
      "Pause"
    action "reset"
      bg #333
      "Reset"
```

### Stoppuhr

```mirror
Timer autoStart
  Root: gap 12, center
  Area: hor
  Segment: col white, fs 36, font mono
    type "hours"
      // Stunden
    type "minutes"
      // Minuten
    type "seconds"
      // Sekunden
  Separator: col #666, fs 36
    ":"

  Control: hor, gap 8
  ActionTrigger: pad 10 20, rad 6, bg #333, col white
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `defaultValue` | number | Startzeit in ms |
| `autoStart` | boolean | Automatisch starten |
| `countdown` | boolean | Countdown statt Hochzählen |
| `interval` | number | Update-Intervall in ms |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Area:` | Anzeige-Bereich |
| `Segment:` | Zeit-Segment (H/M/S) |
| `Separator:` | Trennzeichen |
| `Control:` | Button-Container |
| `ActionTrigger:` | Start/Pause/Reset Button |

### States für ActionTrigger

```mirror
ActionTrigger
  action "start":    // Wenn Timer gestoppt
  action "pause":    // Wenn Timer läuft
  action "reset":    // Immer
```

---

## Praktisch: Buchungsformular

```mirror
Frame gap 16, w 320, bg #1a1a1a, pad 24, rad 12

  Text "Buchung", col white, fs 18, weight 600

  DatePicker
    Label: col #888, fs 12
      "Check-in"
    Control: hor, bg #252525, bor 1, boc #333, rad 8
    Input: w full, bg transparent, col white, pad 12, bor 0
    Trigger: pad 12, col #666
      Icon "calendar", is 18
    Content: bg #1a1a1a, rad 12, pad 16, shadow lg
    TableCellTrigger: w 32, h 32, rad 4, col white
      selected:
        bg #2563eb

  DatePicker
    Label: col #888, fs 12
      "Check-out"
    Control: hor, bg #252525, bor 1, boc #333, rad 8
    Input: w full, bg transparent, col white, pad 12, bor 0
    Trigger: pad 12, col #666
      Icon "calendar", is 18

  Button "Verfügbarkeit prüfen", w full, bg #2563eb, col white, pad 14, rad 8
```

---

## Zusammenfassung

| Komponente | Verwendung |
|------------|-----------|
| `DatePicker` | Kalender mit Dropdown |
| `DateInput` | Segmentierte Eingabe |
| `Timer` | Countdown/Stoppuhr |

**Gemeinsame Props:** `disabled`, `readOnly`, `locale`

**Tastatursteuerung:** Arrow-Keys für Navigation, Enter für Auswahl
