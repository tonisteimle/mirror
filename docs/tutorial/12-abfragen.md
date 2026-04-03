---
title: Abfragen
subtitle: Filtern, Sortieren und Aggregieren von Daten
prev: 11-content
next: 13-methoden
---

Daten abfragen ohne SQL. Mit `where` filterst du, mit `by` sortierst du, mit `.count` und `.sum` aggregierst du.

## Filter mit where

Filtere Daten mit `where` und einer Bedingung:

```mirror-static
// Alle erledigten Tasks
each task in $tasks where done == true
  Text task.title, col white, pad 4
```

```mirror-static
// Alle Tasks mit hohem Aufwand
each task in $tasks where aufwand > 10
  Frame hor, spread, bg #1a1a1a, pad 12, rad 6, margin 0 0 4 0
    Text task.title, col white
    Text task.aufwand + "h", col #888
```

### Vergleiche

| Operator | Bedeutung | Beispiel |
|----------|-----------|----------|
| `==` | gleich | `status == "open"` |
| `!=` | ungleich | `status != "done"` |
| `>` | größer | `aufwand > 10` |
| `<` | kleiner | `priority < 3` |
| `>=` | größer gleich | `age >= 18` |
| `<=` | kleiner gleich | `price <= 100` |

### Kombinieren mit and/or

```mirror-static
// Offene Tasks mit hoher Priorität
each task in $tasks where done == false and priority > 5
  Text task.title, col #ef4444, pad 4

// Tasks von Toni oder Anna
each task in $tasks where assignee == $users.toni or assignee == $users.anna
  Text task.title, col white, pad 4
```

### Filter auf Relationen

```mirror-static
// Alle Tasks eines bestimmten Users
each task in $tasks where assignee == $users.toni
  Text task.title, col white, pad 4

// Alle Tasks eines Projekts
each task in $tasks where project == $projects.website
  Text task.title, col white, pad 4
```

## Sortieren mit by

Sortiere Daten mit `by`:

```mirror-static
// Nach Datum aufsteigend
each task in $tasks by dueDate
  Text task.title, col white, pad 4

// Nach Priorität absteigend
each task in $tasks by priority desc
  Text task.title, col white, pad 4
```

### Kombiniert: Filter + Sortierung

```mirror-static
// Offene Tasks, sortiert nach Aufwand
each task in $tasks where done == false by aufwand desc
  Frame hor, spread, bg #1a1a1a, pad 12, rad 6, margin 0 0 4 0
    Text task.title, col white
    Text task.aufwand + "h", col #f59e0b
```

## Zählen mit .count

```mirror-static
$taskCount: ($tasks).count
$openCount: ($tasks where done == false).count

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "Alle Tasks: " + $taskCount, col white
  Text "Offen: " + $openCount, col #f59e0b
```

## Aggregieren

### Summe mit .sum

```mirror-static
$totalHours: ($tasks).sum(aufwand)
$openHours: ($tasks where done == false).sum(aufwand)

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "Gesamtaufwand: " + $totalHours + "h", col white
  Text "Noch offen: " + $openHours + "h", col #f59e0b
```

### Durchschnitt mit .avg

```mirror-static
$avgHours: ($tasks).avg(aufwand)

Frame bg #1a1a1a, pad 16, rad 8
  Text "Durchschnitt: " + $avgHours.toFixed(1) + "h", col white
```

### Min/Max

```mirror-static
$minPrice: ($products).min(price)
$maxPrice: ($products).max(price)

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "Günstigster: $" + $minPrice, col #10b981
  Text "Teuerster: $" + $maxPrice, col #ef4444
```

## Weitere Hilfsfunktionen

### .first und .last

```mirror-static
$firstTask: ($tasks by createdAt).first
$lastTask: ($tasks by createdAt).last

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "Ältester: " + $firstTask.title, col white
  Text "Neuester: " + $lastTask.title, col #888
```

### .unique

Eindeutige Werte eines Felds:

```mirror-static
each status in ($tasks).unique(status)
  Text status, col white, pad 4
```

### .any, .all, .none

Existenz prüfen:

```mirror-static
$hasOpen: ($tasks).any(done == false)
$allDone: ($tasks).all(done == true)
$noneOverdue: ($tasks).none(overdue == true)

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text $hasOpen ? "Es gibt offene Tasks" : "Alles erledigt", col white
```

## Gruppieren mit grouped by

```mirror-static
$byStatus: ($tasks) grouped by status

each group in $byStatus
  Frame gap 8, margin 0 0 16 0
    Text group.key, col #888, fs 12, uppercase
    each task in group.items
      Text task.title, col white, pad 4
```

## Praktisch: Dashboard Stats

```mirror-static
Frame hor, gap 16

  // Stat Card: Total
  Frame bg #1a1a1a, pad 20, rad 12, gap 4, w 120, center
    Text ($tasks).count, col white, fs 32, weight 700
    Text "Tasks", col #888, fs 12

  // Stat Card: Offen
  Frame bg #1a1a1a, pad 20, rad 12, gap 4, w 120, center
    Text ($tasks where done == false).count, col #f59e0b, fs 32, weight 700
    Text "Offen", col #888, fs 12

  // Stat Card: Stunden
  Frame bg #1a1a1a, pad 20, rad 12, gap 4, w 120, center
    Text ($tasks).sum(aufwand), col #2563eb, fs 32, weight 700
    Text "Stunden", col #888, fs 12
```

## Praktisch: Gefilterte Liste

```mirror-static
Frame gap 16

  // Header mit Stats
  Frame hor, spread
    Text "Offene Tasks", col white, fs 18, weight 600
    Text ($tasks where done == false).count + " Tasks", col #888

  // Gefilterte, sortierte Liste
  each task in $tasks where done == false by priority desc
    Frame hor, spread, bg #1a1a1a, pad 16, rad 8, margin 0 0 8 0
      Frame gap 4
        Text task.title, col white, weight 500
        Text task.assignee.name, col #888, fs 12
      Frame hor, gap 12
        Text task.aufwand + "h", col #888
        Frame pad 4 8, bg #f59e0b, rad 4
          Text "P" + task.priority, col white, fs 11, weight 600
```

## Queries: Abgeleitete Tabellen

Wenn Abfragen komplex werden oder an mehreren Stellen verwendet werden, lagere sie in `.query`-Dateien aus. Eine Query ist wie eine berechnete Collection.

### Query definieren

```
// queries/dashboard.query

// Offene Tasks mit aufgelösten Joins
OpenTasks:
  each task in $tasks where done == false by priority desc
    title: task.title
    userName: task.assignee.name        // Join aufgelöst
    projectName: task.project.name      // Join aufgelöst
    hoursLeft: task.aufwand - task.logged
    isUrgent: task.priority > 5

// Projekt-Statistiken
ProjectStats:
  each project in $projects where status == "active"
    name: project.name
    lead: project.lead.name
    totalTasks: ($tasks where project == project).count
    openTasks: ($tasks where project == project and done == false).count
    progress: (totalTasks - openTasks) / totalTasks
```

### Query verwenden

Im UI ist die Query eine normale Collection – keine Joins, keine Berechnungen:

```mirror-static
// Einfach wie jede andere Collection
each task in $OpenTasks
  Frame hor, spread, bg #1a1a1a, pad 12, rad 8, margin 0 0 4 0
    Frame gap 2
      Text task.title, col white
      Text task.userName, col #888, fs 12
    if task.isUrgent
      Icon "alert-circle", ic #ef4444, is 16
```

### Warum Queries?

| Inline Abfrage | Query-Datei |
|----------------|-------------|
| `task.assignee.name` im UI | `userName` als Feld |
| Berechnung überall | Berechnung einmal |
| UI kennt Datenstruktur | UI sieht flache Tabelle |
| Copy-Paste von Logik | Wiederverwendbar |

**Queries abstrahieren Komplexität.** Der UI-Code bleibt lesbar.

### Praktisch: Dashboard mit Queries

```
// queries/team.query

TeamWorkload:
  each user in $users
    name: user.name
    avatar: user.avatar
    role: user.role
    tasks: ($tasks where assignee == user).count
    open: ($tasks where assignee == user and done == false).count
    hours: ($tasks where assignee == user).sum(aufwand)
```

```mirror-static
Frame gap 16

  Text "Team Workload", fs 18, weight 600, col white

  each member in $TeamWorkload
    Frame hor, spread, bg #1a1a1a, pad 16, rad 8, margin 0 0 8 0
      Frame hor, gap 12
        Frame w 40, h 40, bg #2563eb, rad 99, center
          Text member.name.charAt(0), col white, weight 600
        Frame gap 2
          Text member.name, col white, weight 500
          Text member.role, col #888, fs 12
      Frame hor, gap 16
        Frame center
          Text member.tasks, col white, fs 18, weight 600
          Text "Tasks", col #666, fs 10
        Frame center
          Text member.open, col #f59e0b, fs 18, weight 600
          Text "Offen", col #666, fs 10
        Frame center
          Text member.hours + "h", col #2563eb, fs 18, weight 600
          Text "Stunden", col #666, fs 10
```

---

## Zusammenfassung

| Konzept | Syntax |
|---------|--------|
| Filtern | `$tasks where done == true` |
| Kombinieren | `where a == 1 and b == 2` |
| Sortieren | `$tasks by dueDate` |
| Absteigend | `$tasks by priority desc` |
| Filter + Sort | `$tasks where done == false by dueDate` |
| Zählen | `($tasks).count` |
| Summe | `($tasks).sum(aufwand)` |
| Durchschnitt | `($tasks).avg(aufwand)` |
| Min/Max | `($tasks).min(price)`, `.max(price)` |
| Erstes/Letztes | `($tasks).first`, `.last` |
| Eindeutige | `($tasks).unique(status)` |
| Existenz | `.any()`, `.all()`, `.none()` |
| Gruppieren | `($tasks) grouped by status` |
| **Query-Datei** | `.query` mit `QueryName:` |
| **Query-Feld** | `fieldName: expression` |
| **Query verwenden** | `each item in $QueryName` |

**Daten abfragen ohne SQL.** Inline für einfache Fälle, Query-Dateien für komplexe Abfragen.
