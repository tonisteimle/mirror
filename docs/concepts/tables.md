# Tables – Konzept

Tabellen für Business-Anwendungen: Zero Config by Default, Full Control when Needed.

## Das Prinzip

```
DATEN (inferierte Typen)
        ↓
TYPE RENDERER (zentrale Komponenten)
        ↓
TABLE (Zero Config oder Custom)
```

---

## 1. Datentypen aus Werten

Typen werden aus den Werten inferiert, nicht aus Feldnamen:

```
task1:
  titel: "Design Review"       // "..." → String
  aufwand: 8                   // 8 → Number
  erledigt: false              // false → Boolean
  verantwortlich: $users.toni  // $... → Relation
  deadline: 2024-02-15         // Pattern → Date
  tags: [urgent, design]       // [...] → Array
```

| Wert-Syntax | Inferierter Typ |
|-------------|-----------------|
| `"..."` oder `'...'` | String |
| `123`, `45.6`, `-7` | Number |
| `true`, `false` | Boolean |
| `$collection.entry` | Relation |
| `YYYY-MM-DD` | Date |
| `[...]` | Array |

Optional explizit überschreibbar:

```
Task:
  aufwand: Number, min 0, suffix "h"
  verantwortlich: -> User
```

---

## 2. Type Renderer – Zentrale Komponenten

Für jeden Datentyp existiert eine Renderer-Komponente. Diese definierst du einmal, sie gilt überall:

```mirror
// String: Standard-Text
StringCell: Text col white, truncate

// Number: Rechtsbündig
NumberCell: Text col white, align right

// Boolean: Icon-basiert
BooleanCell: Icon is 16
  true:
    "check", ic #10b981
  false:
    "x", ic #666

// Date: Formatiert
DateCell: Text col #888
  format "DD.MM.YYYY"

// Relation: Zeigt .name, klickbar
RelationCell: Text col #2563eb
  show .name
  onclick navigateTo(row.field)

// Array: Als Tags
ArrayCell: Frame hor, gap 4, wrap
  each item:
    Tag item
```

### Table-Struktur

```mirror
// Header-Zeile
TableHeader: Frame hor, bg #252525, pad 12
  HeaderCell: Text weight 500, col #888, uppercase, fs 11

// Daten-Zeilen
TableRow: Frame hor, pad 12, bor 0 0 1 0, boc #222
  hover:
    bg #1a1a1a
  selected:
    bg #2563eb22

// Gruppen-Header (für grouped by)
TableGroup: Frame pad 12, bg #1a1a1a
  GroupLabel: Text col #888, fs 11, uppercase
  GroupCount: Text col #666, fs 11
```

---

## 3. Table – 4 Ebenen der Anpassung

### Ebene 1: Zero Config

```mirror
Table $tasks
```

Das wars. Die Table:
- Inferiert Spalten aus der Datenstruktur
- Verwendet Type Renderer für jede Spalte
- Sortierbar durch Header-Klick
- Filterbar durch Filter-Icons

### Ebene 2: Query-Integration

```mirror
Table $tasks where done == false by priority desc
```

Nutzt die vorhandene Query-Schicht für Filter, Sortierung, Gruppierung:

```mirror
Table $tasks where status != "done" by dueDate grouped by project
```

### Ebene 3: Column Overrides

```mirror
Table $tasks
  Column titel, w 250              // Breite überschreiben
  Column aufwand, suffix "h"       // Suffix hinzufügen
  Column priority, hidden          // Spalte ausblenden
  Column done, label "Erledigt"    // Label überschreiben
```

### Ebene 4: Custom Cell Layout

Für komplexe Layouts – mehrere Felder in einer Spalte:

```mirror
Table $users
  Column "User", fields [name, email, avatar]
    Cell:
      Frame hor, gap 12
        Frame w 40, h 40, bg #333, rad 99, center, clip
          if row.avatar
            Image row.avatar
          else
            Text row.name.charAt(0), col white, weight 600
        Frame gap 2
          Text row.name, col white, weight 500
          Text row.email, col #888, fs 12

  Column "Status"
    Cell:
      StatusBadge row.status

  Column "Actions", w 100
    Cell:
      Frame hor, gap 8
        IconButton "edit", editUser(row)
        IconButton "trash", deleteUser(row)
```

---

## 4. Interaktionen

### Selection

```mirror
Table $tasks, select()
  // Single selection, $selected verfügbar
```

```mirror
Table $tasks, select(multi)
  // Multi selection, $selection Array verfügbar
```

### Sortierung

Automatisch bei Header-Klick. Modifiziert die Query:

```mirror
Table $tasks by title        // Initial: nach title
  Column title, sortable     // Klick togglet asc/desc
  Column priority, sortable
  Column aufwand             // Nicht sortierbar
```

### Inline Filter

```mirror
Table $tasks
  Column status, filterable   // Filter-Dropdown im Header
  Column assignee, filterable
```

### Pagination

```mirror
Table $tasks, pageSize 20
  // Automatische Pagination
```

```mirror
Table $tasks, infinite
  // Infinite Scroll
```

---

## 5. Master-Detail Pattern

```mirror
Frame hor, gap 0, h full

  // Master: Table mit Selection
  Table $tasks, select(), w 500
    Column titel
    Column status
    Column priority

  // Detail: Reagiert auf Selection
  Frame w 400, pad 24, bg #0a0a0a
    if $selected
      Frame gap 20
        Text $selected.titel, col white, fs 24, weight 600
        Text $selected.beschreibung, col #888

        Divider

        Frame gap 12
          DetailRow "Status", $selected.status
          DetailRow "Priorität", $selected.priority
          DetailRow "Aufwand", $selected.aufwand + "h"
          DetailRow "Zuständig", $selected.assignee.name

        Frame hor, gap 8, margin 20 0 0 0
          Button "Bearbeiten", editTask($selected)
          Button "Löschen", deleteTask($selected)
    else
      Frame center, h full
        Text "Task auswählen", col #666
```

---

## 6. Gruppierung

```mirror
Table $tasks grouped by status
  // Automatische Gruppen mit TableGroup Styling
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
```

---

## 7. Aggregationen

Footer mit Summen:

```mirror
Table $tasks
  Column titel
  Column aufwand, sum          // Zeigt Summe im Footer
  Column priority, avg         // Zeigt Durchschnitt

  Footer:
    Frame hor, pad 12, bg #1a1a1a
      Text "Gesamt: " + $tasks.sum(aufwand) + "h", col #888
```

---

## 8. Praktische Beispiele

### Einfache Task-Liste

```mirror
Table $tasks where done == false by priority desc
```

### User-Verwaltung

```mirror
Table $users
  Column "User", fields [name, email]
    Cell:
      Frame hor, gap 12
        Avatar row
        Frame gap 2
          Text row.name, weight 500
          Text row.email, fs 12, col #888
  Column role
  Column "Tasks", computed
    Cell:
      Text row.TaskCount()
  Column "Actions"
    Cell:
      Frame hor, gap 4
        IconButton "edit"
        IconButton "trash"
```

### Dashboard mit Stats

```mirror
Frame gap 24

  // Stats Cards (nutzt Queries)
  Frame hor, gap 16
    StatCard "Total", ($tasks).count
    StatCard "Offen", ($tasks where done == false).count
    StatCard "Stunden", ($tasks).sum(aufwand), suffix "h"

  // Gefilterte Table
  Table $tasks where done == false by priority desc, select()
    Column titel, w 250
    Column assignee.name, w 120
    Column aufwand, suffix "h", w 80
    Column priority, w 60
```

---

## Zusammenfassung

| Konzept | Beschreibung |
|---------|--------------|
| Typ-Inferenz | Aus Werten, nicht Namen |
| Type Renderer | `StringCell:`, `NumberCell:`, etc. |
| Zero Config | `Table $tasks` – funktioniert |
| Query-Integration | `where`, `by`, `grouped by` |
| Column Override | `Column field, w 200, suffix "h"` |
| Custom Cell | `Cell:` Slot mit `row.field` |
| Selection | `select()`, `select(multi)` |
| Master-Detail | `$selected` Variable |

**Das Ziel:** Eine Tabelle definieren ist so einfach wie nötig und so mächtig wie gewünscht.
