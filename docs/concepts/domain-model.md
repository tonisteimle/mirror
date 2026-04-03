# Domain Model

Mirror macht Datenmodellierung so einfach wie Visual Basic – aber für Web.

## Die Vision

Keine Klassen. Kein ORM. Kein State Management. Kein Redux. Keine API-Layer.

**Daten + Abfragen + UI. Fertig.**

## Collections = Dateien

Jede `.data`-Datei ist eine Collection. Der Dateiname wird zum Typ.

```
// data/users.data

toni:
  name: Toni Steimle
  email: toni@example.com
  role: Lead

peter:
  name: Peter Müller
  email: peter@example.com
  role: Dev
```

```
// data/projects.data

alpha:
  name: Projekt Alpha
  status: active

beta:
  name: Projekt Beta
  status: planning
```

**Zugriff:**
- `$users` → alle User
- `$users.toni` → ein User
- `$users.toni.name` → "Toni Steimle"

## Relationen

### N-zu-1 (viele zu eins)

Direkte Referenz mit `$collection.entry`:

```
// data/tasks.data

t1:
  name: Design Review
  assignee: $users.toni
  project: $projects.alpha
```

Zugriff durch die Relation: `$tasks.t1.assignee.name` → "Toni Steimle"

### N-zu-N (viele zu viele)

Arrays auf beiden Seiten:

```
// data/users.data

toni:
  name: Toni Steimle
  projects: $projects.alpha, $projects.beta

peter:
  name: Peter Müller
  projects: $projects.alpha
```

```
// data/projects.data

alpha:
  name: Projekt Alpha
  members: $users.toni, $users.peter
  lead: $users.toni

beta:
  name: Projekt Beta
  members: $users.toni
  lead: $users.toni
```

Ja, redundant – aber explizit und lesbar.

## Methoden

Methoden werden am Anfang der `.data`-Datei **deklariert** und separat **definiert**.

### Deklaration (in der .data-Datei)

```
// data/tasks.data

Gesamtaufwand()
OffeneTasks()
Fortschritt()

t1:
  name: Design Review
  aufwand: 8
  done: true

t2:
  name: API bauen
  aufwand: 24
  done: false
```

### Definition

Funktionen nutzen eine vereinfachte Syntax – wie Mirror selbst:

```
function tasks.Gesamtaufwand(task)
  return task.aufwand

function tasks.OffeneTasks()
  return $tasks where done == false

function tasks.Fortschritt()
  done = $tasks where done == true
  return done.count / $tasks.count
```

### Aufruf

```mirror
// Auf Instanz
Text $tasks.t1.Gesamtaufwand()

// Auf Collection (ohne Parameter)
Text $tasks.OffeneTasks().count
Text $tasks.Fortschritt() * 100 + "%"
```

**Die Regel:** Wie bei Mirror – in der Deklaration werden Funktionen nur aufgerufen, definiert werden sie separat.

## Funktions-Syntax

Funktionen nutzen eine vereinfachte Syntax. Einrückung statt Klammern, kein Boilerplate.

### Vereinfachungen

| JavaScript | Mirror |
|------------|--------|
| `for (const x of items) { }` | `each x in items` |
| `if (cond) { }` | `if cond` |
| `} else {` | `else` |
| `const x = ...` | `x = ...` |
| `let x = ...` | `x = ...` |
| Keine `{ }` | Einrückung |
| Keine `;` | Keine `;` |

### Variablen-Prefixe

| Kontext | Syntax | Beispiel |
|---------|--------|----------|
| Globale Daten | `$name` | `$users`, `$tasks` |
| Lokale Variable | `name` | `tasks = ...` |
| Parameter | `name` | `function foo(project)` |

`$` markiert globale Daten. Lokale Variablen und Parameter brauchen kein Prefix.

### Domänen-Methoden vs. allgemeine Funktionen

Nicht alles gehört zu einer Domäne:

```
// Domänen-Methoden (gehören zu Collections)
function projects.Gesamtaufwand(project)
  tasks = $tasks where project == project
  return tasks.sum(aufwand)

function users.FullName(user)
  return user.firstName + " " + user.lastName

// Allgemeine Funktionen (ohne Namespace)
function formatDate(date)
  return date.toLocaleDateString("de-DE")

function calculateTax(amount, rate)
  return amount * rate

function sendNotification(user, message)
  // API call, side effect, etc.
```

**Aufruf:**

```mirror
Text $projects.alpha.Gesamtaufwand()      // Domänen-Methode
Text formatDate($tasks.t1.dueDate)         // Allgemeine Funktion
```

| Typ | Syntax | Wann |
|-----|--------|------|
| Domänen-Methode | `collection.name()` | Operiert auf einem Typ |
| Allgemeine Funktion | `name()` | Utility, Helper, Actions |

### Beispiel

```
function projects.BerechneStats(project)
  tasks = $tasks where project == project
  total = tasks.count

  if total == 0
    return { done: 0, open: 0, progress: 0 }

  done = tasks where done == true
  open = tasks where done == false

  each task in open
    log(task.name + " ist noch offen")

  return {
    done: done.count,
    open: open.count,
    progress: done.count / total
  }
```

Unter der Haube wird das zu JavaScript kompiliert.

### JavaScript bleibt erlaubt

Du kannst auch normales JavaScript schreiben – muss aber nicht:

```javascript
// Das geht auch
function projects.Gesamtaufwand(project) {
  const tasks = $tasks.filter(t => t.project === project);
  return tasks.reduce((sum, t) => sum + t.aufwand, 0);
}
```

Beides funktioniert. Die vereinfachte Syntax ist optional – für alle die es cleaner mögen.

## Abfragefunktionen

Eingebaute Funktionen für typische Datenoperationen.

### Properties (ohne Klammern)

```
$tasks.count          // Anzahl: 42
$tasks.first          // erstes Element
$tasks.last           // letztes Element
```

### Aggregationen

```
$tasks.sum(aufwand)   // Summe: 120
$tasks.avg(aufwand)   // Durchschnitt: 8.5
$tasks.min(dueDate)   // Minimum: frühestes Datum
$tasks.max(priority)  // Maximum: höchste Priorität
```

### Filter

```
$tasks where done == true
$tasks where aufwand > 10
$tasks where assignee == $users.toni
$tasks where status == "open" and priority > 5
```

### Sortierung

```
$tasks by dueDate                   // aufsteigend
$tasks by priority desc             // absteigend
$tasks by assignee.name             // nach Relation
```

### Kombiniert

```
$tasks where done == false by dueDate
$tasks where assignee == $users.toni by priority desc
```

### Existenz-Checks

```
$tasks.any(done == true)    // mindestens einer erledigt?
$tasks.all(assigned)        // alle zugewiesen?
$tasks.none(overdue)        // keiner überfällig?
```

### Gruppierung

```
$tasks grouped by status
// → { "todo": [...], "doing": [...], "done": [...] }

$tasks grouped by assignee
// → { "$users.toni": [...], "$users.peter": [...] }
```

### Unique

```
$tasks.unique(assignee)     // [$users.toni, $users.peter]
$tasks.unique(status)       // ["todo", "doing", "done"]
```

## Queries: Abgeleitete Tabellen

Queries sind eine **eigene Schicht** über den Daten. Sie kombinieren, transformieren und abstrahieren Daten aus verschiedenen Collections. Der UI-Layer sieht nur eine flache Tabelle.

### Die drei Ebenen

| Ebene | Datei | Inhalt |
|-------|-------|--------|
| **Daten** | `.data` | Rohdaten, Relationen |
| **Queries** | `.query` | Abgeleitete Tabellen, Joins, Berechnungen |
| **UI** | `.mir` | Layout, nur `$QueryName` verwenden |

### Query definieren

Eine Query ist wie eine berechnete Collection:

```
// queries/taskboard.query

TaskBoard:
  each task in $tasks
    title: task.title
    userName: task.assignee.name        // Join aufgelöst
    projectName: task.project.name      // Join aufgelöst
    hoursLeft: task.aufwand - task.logged
    isUrgent: task.priority > 5 and task.done == false
```

### Query verwenden

Im UI ist die Query eine normale Collection:

```mirror
each item in $TaskBoard
  Frame hor, spread, pad 12, bg #1a1a1a, rad 8
    Text item.title
    Text item.userName, col #888
    if item.isUrgent
      Icon "alert-circle", ic #ef4444
```

**Der UI-Code weiß nichts von Joins oder Berechnungen.** Er sieht nur `title`, `userName`, `isUrgent`.

### Komplexe Queries

Queries können filtern, sortieren, aggregieren:

```
// queries/dashboard.query

// Offene Tasks mit User-Daten
OpenTasks:
  each task in $tasks where done == false by priority desc
    title: task.title
    user: task.assignee.name
    avatar: task.assignee.avatar
    project: task.project.name
    daysLeft: daysBetween(today(), task.dueDate)

// Projekt-Übersicht mit berechneten Feldern
ProjectStats:
  each project in $projects where status == "active"
    name: project.name
    lead: project.lead.name
    totalTasks: ($tasks where project == project).count
    openTasks: ($tasks where project == project and done == false).count
    totalHours: ($tasks where project == project).sum(aufwand)
    progress: (totalTasks - openTasks) / totalTasks

// User-Workload aus verschiedenen Collections
TeamWorkload:
  each user in $users
    name: user.name
    role: user.role
    assignedTasks: ($tasks where assignee == user).count
    openTasks: ($tasks where assignee == user and done == false).count
    totalHours: ($tasks where assignee == user).sum(aufwand)
    projects: ($projects where members contains user).count
```

### UI bleibt simpel

```mirror
// Dashboard mit drei Queries
Frame gap 24, pad 24

  // Stats aus ProjectStats
  Frame hor, gap 16
    each project in $ProjectStats
      Frame bg #1a1a1a, pad 20, rad 12, w 200
        Text project.name, weight 600
        Text project.progress * 100 + "% fertig", col #888

  // Tasks aus OpenTasks
  Frame gap 8
    Text "Offene Tasks", fs 18, weight 600
    each task in $OpenTasks
      Frame hor, spread, pad 12, bg #1a1a1a, rad 8
        Frame hor, gap 12
          Image task.avatar, w 32, h 32, rad 99
          Frame gap 2
            Text task.title
            Text task.project, col #888, fs 12
        Text task.daysLeft + " Tage", col #f59e0b

  // Team aus TeamWorkload
  Frame gap 8
    Text "Team", fs 18, weight 600
    each member in $TeamWorkload
      Frame hor, spread, pad 12, bg #1a1a1a, rad 8
        Text member.name
        Text member.openTasks + " offen", col #888
```

### Warum Queries?

| Ohne Queries | Mit Queries |
|--------------|-------------|
| Joins im UI-Code | Joins in Query |
| Berechnungen überall | Berechnungen zentral |
| Komplexe Expressions | Einfache Felder |
| Copy-Paste von Logik | Einmal definiert |
| UI kennt Datenstruktur | UI kennt nur Query |

**Queries abstrahieren Komplexität.** Der UI-Layer bleibt lesbar, die Logik ist zentral.

## In Mirror

Alle Abfragen funktionieren direkt in Mirror:

```mirror
// Einfache Anzeige
Text "Tasks: " + $tasks.count
Text "Offen: " + ($tasks where done == false).count
Text "Aufwand: " + $tasks.sum(aufwand) + "h"

// Iteration mit Filter und Sortierung
each task in $tasks where done == false by priority desc
  Frame hor, spread, pad 12, bg #1a1a1a, rad 8
    Text task.name
    Text task.assignee.name, col #888
```

## Komplettes Beispiel

### Daten

```
// data/users.data

toni:
  name: Toni Steimle
  role: Lead

peter:
  name: Peter Müller
  role: Dev

anna:
  name: Anna Schmidt
  role: Design
```

```
// data/projects.data

Gesamtaufwand()
Fortschritt()
OffeneTasks()

website:
  name: Website Relaunch
  lead: $users.toni
  members: $users.toni, $users.peter, $users.anna
  status: active

app:
  name: Mobile App
  lead: $users.peter
  members: $users.peter, $users.anna
  status: planning
```

```
// data/tasks.data

t1:
  name: Design System
  aufwand: 16
  done: true
  assignee: $users.anna
  project: $projects.website

t2:
  name: API Development
  aufwand: 40
  done: false
  assignee: $users.peter
  project: $projects.website

t3:
  name: Frontend Build
  aufwand: 32
  done: false
  assignee: $users.toni
  project: $projects.website

t4:
  name: App Konzept
  aufwand: 8
  done: false
  assignee: $users.anna
  project: $projects.app
```

### Methoden

```
function projects.Gesamtaufwand(project)
  tasks = $tasks where project == project
  return tasks.sum(aufwand)

function projects.Fortschritt(project)
  tasks = $tasks where project == project
  done = tasks where done == true
  if tasks.count == 0
    return 0
  return done.count / tasks.count

function projects.OffeneTasks(project)
  return $tasks where project == project and done == false
```

### UI

```mirror
// Dashboard
Frame gap 24, pad 24

  // Header
  Text "Projekte", fs 24, weight bold

  // Projekt-Cards
  each project in $projects where status == "active"
    Frame bg #1a1a1a, pad 20, rad 12, gap 16

      // Titel & Lead
      Frame hor, spread
        Text project.name, fs 18, weight 600
        Text project.lead.name, col #888

      // Stats
      Frame hor, gap 24
        Frame gap 4
          Text "Aufwand", col #666, fs 12
          Text project.Gesamtaufwand() + "h", fs 20, weight 500
        Frame gap 4
          Text "Fortschritt", col #666, fs 12
          Text (project.Fortschritt() * 100).toFixed(0) + "%", fs 20, weight 500
        Frame gap 4
          Text "Offen", col #666, fs 12
          Text project.OffeneTasks().count, fs 20, weight 500

      // Offene Tasks
      Frame gap 8
        Text "Offene Tasks", col #888, fs 12, uppercase
        each task in project.OffeneTasks() by aufwand desc
          Frame hor, spread, pad 12, bg #252525, rad 8
            Text task.name
            Frame hor, gap 12
              Text task.aufwand + "h", col #888
              Text task.assignee.name, col #666
```

## Zusammenfassung

### Die Architektur

```
┌─────────────────────────────────────────────────────┐
│  UI (.mir)                                          │
│  - Layout, Komponenten                              │
│  - Verwendet nur $QueryName oder $Collection        │
│  - Keine Joins, keine Berechnungen                  │
└─────────────────────────────────────────────────────┘
                         ▲
                         │ verwendet
                         │
┌─────────────────────────────────────────────────────┐
│  Queries (.query)                                   │
│  - Abgeleitete Tabellen                             │
│  - Joins aufgelöst, Berechnungen zentral            │
│  - Abstrahiert Komplexität                          │
└─────────────────────────────────────────────────────┘
                         ▲
                         │ kombiniert
                         │
┌─────────────────────────────────────────────────────┐
│  Daten (.data)                                      │
│  - Rohdaten mit Relationen                          │
│  - Methoden auf Collections                         │
│  - Single Source of Truth                           │
└─────────────────────────────────────────────────────┘
```

### Konzepte

| Konzept | Syntax | Ebene |
|---------|--------|-------|
| Collection | `.data`-Datei | Daten |
| Eintrag | `name:` + Attribute | Daten |
| Relation N:1 | `assignee: $users.toni` | Daten |
| Relation N:N | `members: $users.toni, $users.anna` | Daten |
| Methode | `function collection.name()` | Daten |
| Abfrage | `where`, `by`, `count`, `sum` | Daten/Query |
| Query | `.query`-Datei mit `each` | Query |
| Berechnetes Feld | `isUrgent: task.priority > 5` | Query |
| UI-Zugriff | `$QueryName`, `$Collection` | UI |

### Das Domain Model erweitert Mirror um:

1. **Relationen** zwischen Daten (`$users.toni`)
2. **Methoden** auf Collections (`Gesamtaufwand()`)
3. **Abfragefunktionen** (`where`, `by`, `count`, `sum`)
4. **Queries** als abgeleitete Tabellen (`.query`)
5. **Vereinfachte Funktions-Syntax** (Einrückung, kein const/let)

## Warum das funktioniert

| Früher | Mirror |
|--------|--------|
| Klassen definieren | .data-Dateien |
| ORM konfigurieren | Direkte Referenzen |
| State Management | Reaktive Daten |
| API Endpoints | Eingebaut |
| SQL/GraphQL lernen | `where`, `by` |
| Boilerplate schreiben | Einfach loslegen |

**Visual Basic für Web.** Jeder der denken kann, kann bauen.
