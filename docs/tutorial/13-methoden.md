---
title: Methoden
subtitle: Eigene Funktionen auf Daten
prev: 12-abfragen
next: 14-tables
---

Wenn die eingebauten Abfragen nicht reichen, schreibst du eigene Methoden. Methoden gehören zu einer Collection und werden separat definiert.

## Methoden deklarieren

Am Anfang einer `.data`-Datei deklarierst du die Methoden:

```
// data/projects.data

Gesamtaufwand()
Fortschritt()
OffeneTasks()

website:
  name: Website Relaunch
  status: active

app:
  name: Mobile App
  status: planning
```

Die Deklaration sagt: "Diese Collection hat diese Methoden." Die Implementation kommt separat.

## Methoden definieren

Funktionen werden mit der vereinfachten Mirror-Syntax geschrieben:

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

**Der Namespace:** `projects.Gesamtaufwand` – die Funktion gehört zur Collection `projects`.

**Der Parameter:** `project` – die Instanz auf der die Methode aufgerufen wird.

## Methoden aufrufen

```mirror-static
Frame gap 16

  each project in $projects where status == "active"
    Frame bg #1a1a1a, pad 20, rad 12, gap 12

      Text project.name, col white, fs 18, weight 600

      Frame hor, gap 24
        Frame gap 4
          Text "Aufwand", col #666, fs 12
          Text project.Gesamtaufwand() + "h", col white, fs 20, weight 500

        Frame gap 4
          Text "Fortschritt", col #666, fs 12
          Text (project.Fortschritt() * 100).toFixed(0) + "%", col white, fs 20, weight 500

        Frame gap 4
          Text "Offen", col #666, fs 12
          Text project.OffeneTasks().count, col white, fs 20, weight 500
```

## Die Funktions-Syntax

Mirror-Funktionen sind wie JavaScript – nur sauberer.

### Einrückung statt Klammern

```
// JavaScript
function calculate(a, b) {
  const result = a + b;
  return result;
}

// Mirror
function calculate(a, b)
  result = a + b
  return result
```

### Kein const/let

Variablen werden einfach zugewiesen:

```
function projects.Stats(project)
  tasks = $tasks where project == project
  total = tasks.count
  done = tasks where done == true
  return done.count / total
```

### each statt for

```
function printTasks(project)
  tasks = $tasks where project == project
  each task in tasks
    log(task.title)
```

### if/else ohne Klammern

```
function projects.Status(project)
  progress = project.Fortschritt()
  if progress == 1
    return "Fertig"
  else if progress > 0.5
    return "In Arbeit"
  else
    return "Geplant"
```

## Vereinfachungen im Überblick

| JavaScript | Mirror |
|------------|--------|
| `for (const x of items) { }` | `each x in items` |
| `if (cond) { }` | `if cond` |
| `} else {` | `else` |
| `const x = ...` | `x = ...` |
| `let x = ...` | `x = ...` |
| Keine `{ }` | Einrückung |
| Keine `;` | Keine `;` |

## Variablen-Prefixe

| Kontext | Syntax | Beispiel |
|---------|--------|----------|
| Globale Daten | `$name` | `$users`, `$tasks` |
| Lokale Variable | `name` | `tasks = ...` |
| Parameter | `name` | `function foo(project)` |

`$` markiert globale Daten. Lokale Variablen und Parameter brauchen kein Prefix.

## Allgemeine Funktionen

Nicht alles gehört zu einer Collection. Utility-Funktionen haben keinen Namespace:

```
// Domänen-Methode
function projects.Gesamtaufwand(project)
  tasks = $tasks where project == project
  return tasks.sum(aufwand)

// Allgemeine Funktion
function formatDate(date)
  return date.toLocaleDateString("de-DE")

function formatCurrency(amount)
  return "$" + amount.toFixed(2)
```

**Aufruf:**

```mirror-static
Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text formatDate($tasks.task1.dueDate), col white
  Text formatCurrency($products.pro.price), col #10b981
```

## JavaScript bleibt erlaubt

Du kannst auch normales JavaScript schreiben:

```javascript
function projects.Gesamtaufwand(project) {
  const tasks = $tasks.filter(t => t.project === project);
  return tasks.reduce((sum, t) => sum + t.aufwand, 0);
}
```

Beides funktioniert. Die vereinfachte Syntax ist optional.

## Praktisch: User Stats

```
// data/users.data

TaskCount()
OpenTaskCount()
Workload()

toni:
  name: Toni Steimle
  role: Lead

anna:
  name: Anna Schmidt
  role: Design
```

```
function users.TaskCount(user)
  return ($tasks where assignee == user).count

function users.OpenTaskCount(user)
  return ($tasks where assignee == user and done == false).count

function users.Workload(user)
  return ($tasks where assignee == user).sum(aufwand)
```

```mirror-static
Frame gap 12

  each user in $users
    Frame hor, spread, bg #1a1a1a, pad 16, rad 8

      Frame hor, gap 12
        Frame w 40, h 40, bg #2563eb, rad 99, center
          Text user.name.charAt(0), col white, weight 600
        Frame gap 2
          Text user.name, col white, weight 500
          Text user.role, col #888, fs 12

      Frame hor, gap 16
        Frame center
          Text user.TaskCount(), col white, fs 18, weight 600
          Text "Tasks", col #666, fs 10
        Frame center
          Text user.OpenTaskCount(), col #f59e0b, fs 18, weight 600
          Text "Offen", col #666, fs 10
        Frame center
          Text user.Workload() + "h", col #2563eb, fs 18, weight 600
          Text "Stunden", col #666, fs 10
```

---

## Zusammenfassung

| Konzept | Syntax |
|---------|--------|
| Methode deklarieren | `Gesamtaufwand()` (am Anfang der .data) |
| Methode definieren | `function collection.name(param)` |
| Methode aufrufen | `$projects.website.Gesamtaufwand()` |
| Lokale Variable | `tasks = ...` (kein $) |
| Globale Daten | `$tasks`, `$users` (mit $) |
| Loop | `each item in list` |
| Bedingung | `if cond` / `else` |
| Allgemeine Funktion | `function name()` (ohne Namespace) |

**Eigene Logik, saubere Syntax.** Methoden erweitern deine Daten mit berechneten Werten.
