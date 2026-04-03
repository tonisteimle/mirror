---
title: Tabellen
subtitle: Daten anzeigen, sortieren und auswählen
prev: 13-methoden
next: 15-crud
---

Tabellen sind der Standard für Business-Anwendungen. Mirror macht sie einfach: Zero Config wenn möglich, volle Kontrolle wenn nötig.

## Die einfachste Tabelle

```mirror
Table $tasks
```

Das wars. Mirror:
- Erkennt die Felder aus den Daten
- Inferiert den Typ jedes Feldes (String, Number, Boolean, ...)
- Wählt das passende Rendering pro Typ
- Macht Header klickbar für Sortierung

## Typ-Inferenz

Mirror erkennt Datentypen aus den **Werten**, nicht aus Feldnamen:

```
task1:
  titel: "Design Review"       // String (wegen "...")
  aufwand: 8                   // Number (wegen Zahl)
  erledigt: false              // Boolean (wegen true/false)
  verantwortlich: $users.toni  // Relation (wegen $...)
  deadline: 2024-02-15         // Date (wegen Format)
  tags: [urgent, design]       // Array (wegen [...])
```

| Wert | Erkannter Typ | Table-Rendering |
|------|---------------|-----------------|
| `"text"` | String | Links, Text |
| `123` | Number | Rechts, summierbar |
| `true/false` | Boolean | Checkbox-Icon |
| `$ref` | Relation | Zeigt `.name` |
| `2024-02-15` | Date | Formatiert |
| `[a, b]` | Array | Als Tags |

## Type Renderer

Wie sieht jeder Typ aus? Das definierst du zentral mit Type-Renderer-Komponenten:

```mirror
// String: Standard-Text
StringCell: Text col white, truncate

// Number: Rechtsbündig
NumberCell: Text col white, align right

// Boolean: Check oder X
BooleanCell: Icon is 16
  true:
    "check", ic #10b981
  false:
    "x", ic #666

// Date: Deutsches Format
DateCell: Text col #888, format "DD.MM.YYYY"

// Relation: Name des referenzierten Objekts
RelationCell: Text col #2563eb, show .name
```

Diese Komponenten gelten für **alle** Tables. Definiere sie einmal, nutze sie überall.

## Table-Styling

Auch die Table-Struktur selbst ist über Komponenten steuerbar:

```mirror
// Header-Zeile
TableHeader: Frame hor, bg #1a1a1a, pad 12, bor 0 0 1 0, boc #333
  HeaderCell: Text weight 500, col #888, uppercase, fs 11

// Daten-Zeilen
TableRow: Frame hor, pad 12, bor 0 0 1 0, boc #222
  hover:
    bg #252525
  selected:
    bg #2563eb22
```

## Query-Integration

Tables nutzen die vorhandene Query-Syntax:

```mirror
// Gefiltert
Table $tasks where done == false

// Sortiert
Table $tasks by priority desc

// Kombiniert
Table $tasks where done == false by dueDate

// Gruppiert
Table $tasks grouped by status
```

Die Query bestimmt **welche** Daten angezeigt werden. Die Table bestimmt **wie**.

## Spalten anpassen

Wenn du vom Default abweichen willst:

```mirror
Table $tasks
  Column titel, w 250           // Breite setzen
  Column aufwand, suffix "h"    // Suffix hinzufügen
  Column priority, hidden       // Ausblenden
  Column done, label "Erledigt" // Label ändern
```

### Verfügbare Column-Optionen

| Option | Beschreibung | Beispiel |
|--------|--------------|----------|
| `w` | Spaltenbreite | `w 200` |
| `label` | Header-Text | `label "Titel"` |
| `suffix` | Nach dem Wert | `suffix "h"` |
| `prefix` | Vor dem Wert | `prefix "$"` |
| `align` | Ausrichtung | `align right` |
| `sortable` | Sortierbar | `sortable` |
| `filterable` | Filterbar | `filterable` |
| `hidden` | Ausblenden | `hidden` |
| `sum` | Summe im Footer | `sum` |
| `avg` | Durchschnitt im Footer | `avg` |

## Custom Cells

Für komplexe Layouts – mehrere Felder in einer Spalte:

```mirror
Table $users
  Column "User"
    Cell:
      Frame hor, gap 12
        Frame w 36, h 36, bg #333, rad 99, center
          Text row.name.charAt(0), col white, weight 600
        Frame gap 2
          Text row.name, col white, weight 500
          Text row.email, col #888, fs 12

  Column "Role"
    Cell:
      RoleBadge row.role

  Column "Tasks"
    Cell:
      Text row.TaskCount(), col #888
```

Im `Cell:`-Block hast du Zugriff auf `row` – das aktuelle Datenobjekt der Zeile.

## Selection

### Single Selection

```mirror
Table $tasks, select()

// Anderswo: auf $selected zugreifen
if $selected
  Text "Ausgewählt: " + $selected.titel
```

### Multi Selection

```mirror
Table $tasks, select(multi)

// $selection ist ein Array
Text $selection.length + " ausgewählt"
```

### Row-Klick

```mirror
Table $tasks
  TableRow:
    onclick selectTask(row)
```

## Master-Detail

Das klassische Pattern: Liste links, Details rechts.

```mirror
Frame hor, gap 0, h full

  // Master: Table
  Table $tasks where done == false, select(), w 500
    Column titel
    Column status
    Column priority

  // Detail: Reagiert auf $selected
  Frame w 400, pad 24, bg #0a0a0a

    if $selected
      Frame gap 20
        // Header
        Text $selected.titel, col white, fs 24, weight 600
        Text $selected.beschreibung, col #888

        Divider

        // Details
        Frame gap 12
          Frame hor, spread
            Text "Status", col #666
            StatusBadge $selected.status
          Frame hor, spread
            Text "Priorität", col #666
            Text $selected.priority
          Frame hor, spread
            Text "Aufwand", col #666
            Text $selected.aufwand + "h"
          Frame hor, spread
            Text "Zuständig", col #666
            Text $selected.assignee.name

        // Actions
        Frame hor, gap 8, margin 20 0 0 0
          Button "Bearbeiten", pad 12 20, bg #2563eb, col white, rad 6
          Button "Löschen", pad 12 20, bg #333, col white, rad 6

    else
      Frame center, h full
        Text "Task auswählen", col #666
```

## Sortierung

### Automatisch

Header sind standardmäßig klickbar:

```mirror
Table $tasks
  Column titel, sortable     // Klick togglet Sortierung
  Column priority, sortable
  Column aufwand             // Nicht sortierbar
```

### Initial sortiert

```mirror
Table $tasks by priority desc
  Column titel, sortable
  Column priority, sortable  // Startet mit desc-Indikator
```

## Filterung

### Spalten-Filter

```mirror
Table $tasks
  Column status, filterable   // Dropdown im Header
  Column assignee, filterable
```

### Externer Filter

```mirror
$statusFilter: "all"

Frame gap 16
  // Filter UI
  Frame hor, gap 8
    FilterChip "Alle", value "all", selected $statusFilter
    FilterChip "Offen", value "open", selected $statusFilter
    FilterChip "Erledigt", value "done", selected $statusFilter

  // Table mit dynamischem Filter
  Table $tasks where ($statusFilter == "all" or status == $statusFilter)
```

## Gruppierung

```mirror
Table $tasks grouped by status
```

Mit Custom Group Header:

```mirror
Table $tasks grouped by project
  Group:
    Frame hor, spread, pad 12, bg #1a1a1a
      Frame hor, gap 8
        Text group.key.name, col white, weight 500
        Text group.items.count + " Tasks", col #666, fs 12
      Text group.items.sum(aufwand) + "h", col #888

  Column titel
  Column assignee.name
  Column aufwand, suffix "h"
```

`group.key` ist der Gruppierungs-Wert, `group.items` sind die Einträge der Gruppe.

## Aggregationen

Footer mit Summen und Durchschnitten:

```mirror
Table $tasks
  Column titel
  Column aufwand, sum    // Zeigt Summe im Footer
  Column priority, avg   // Zeigt Durchschnitt im Footer

  Footer:
    Frame hor, pad 12, bg #1a1a1a, spread
      Text "Gesamt"
      Text $tasks.sum(aufwand) + " Stunden", col #888
```

## Pagination

```mirror
// Feste Seitengröße
Table $tasks, pageSize 20

// Infinite Scroll
Table $tasks, infinite
```

## Praktisch: Task-Board

```mirror
Frame gap 24

  // Header mit Stats
  Frame hor, spread
    Text "Tasks", col white, fs 24, weight 600
    Frame hor, gap 16
      StatBadge ($tasks).count, "Total"
      StatBadge ($tasks where done == false).count, "Offen", col #f59e0b

  // Gefilterte, sortierte Table
  Table $tasks where done == false by priority desc, select()
    Column titel, w 280, sortable
    Column status, w 100, filterable
      Cell:
        StatusBadge row.status
    Column assignee, w 140
      Cell:
        Frame hor, gap 8
          Avatar row.assignee, size 24
          Text row.assignee.name, col #888
    Column aufwand, w 80, suffix "h", sum, align right
    Column priority, w 60, sortable
      Cell:
        PriorityBadge row.priority
```

## Praktisch: User-Verwaltung

```mirror
Frame hor, gap 0, h 400

  // User-Liste
  Table $users, select(), w 400
    Column "User"
      Cell:
        Frame hor, gap 12
          Frame w 40, h 40, bg #2563eb, rad 99, center
            Text row.name.charAt(0), col white, weight 600
          Frame gap 2
            Text row.name, col white, weight 500
            Text row.role, col #888, fs 12
    Column "Tasks"
      Cell:
        Text row.TaskCount()
    Column "Stunden"
      Cell:
        Text row.Workload() + "h"

  // Edit Form
  Frame w 350, pad 24, bg #0a0a0a
    if $selected
      Text "Bearbeiten", col #888, fs 12, uppercase, margin 0 0 16 0

      Frame gap 16
        Frame gap 4
          Text "Name", col #888, fs 12
          Input value $selected.name
            bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full

        Frame gap 4
          Text "E-Mail", col #888, fs 12
          Input value $selected.email
            bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full

        Frame gap 4
          Text "Rolle", col #888, fs 12
          Select value $selected.role
            Trigger bg #1a1a1a, bor 1, boc #333, pad 12, rad 6, w full
            Content bg #1a1a1a, rad 8, pad 4
              Item "Lead"
              Item "Dev"
              Item "Design"

        Button "Speichern", bg #2563eb, col white, pad 14, rad 8, w full
```

---

## Zusammenfassung

| Konzept | Syntax |
|---------|--------|
| Einfache Table | `Table $data` |
| Mit Query | `Table $data where x by y` |
| Gruppiert | `Table $data grouped by field` |
| Selection | `Table $data, select()` |
| Multi-Select | `Table $data, select(multi)` |
| Column Override | `Column field, w 200, suffix "h"` |
| Custom Cell | `Cell:` mit `row.field` |
| Sortierbar | `Column field, sortable` |
| Filterbar | `Column field, filterable` |
| Aggregation | `Column field, sum` oder `avg` |
| Type Renderer | `StringCell:`, `NumberCell:`, etc. |

**Zero Config by Default, Full Control when Needed.**
