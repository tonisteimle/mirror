---
title: Daten bearbeiten
subtitle: Create, Read, Update, Delete mit UI-Binding
prev: 14-tables
next: 16-forms
---

Daten lesen haben wir gelernt. Jetzt: Daten erstellen, ändern und löschen. Das Schlüsselkonzept ist `$collection.current` – die Brücke zwischen UI und Daten.

## Das Kernkonzept: current

Jede Collection hat einen **Cursor** – den Eintrag, mit dem der User gerade arbeitet:

```mirror-static
$tasks.current          // Der aktive Task
$users.current          // Der aktive User
$projects.current       // Das aktive Projekt
```

UI-Elemente setzen diesen Cursor automatisch:

```mirror-static
Table $tasks                    // Klick setzt $tasks.current
each task in $tasks, select()   // Klick setzt $tasks.current
Form $tasks                     // Arbeitet mit $tasks.current
```

## Table + Detail

Das klassische Pattern: Links eine Liste, rechts die Details des ausgewählten Eintrags.

```mirror-static
Frame hor, gap 0, h 300

  // Links: Table setzt $tasks.current bei Klick
  Table $tasks, w 400
    Column title
    Column assignee.name
    Column done

  // Rechts: Zeigt $tasks.current
  Frame w 300, pad 24, bg #0a0a0a
    if $tasks.current
      Frame gap 16
        Text $tasks.current.title, col white, fs 20, weight 600
        Text $tasks.current.description, col #888
        Frame hor, gap 8
          Text "Zuständig:", col #666
          Text $tasks.current.assignee.name, col white
    else
      Frame center, h full
        Text "Task auswählen", col #666
```

Klick auf eine Zeile → `$tasks.current` ändert sich → Detail-Ansicht aktualisiert sich.

## Form: Daten bearbeiten

`Form $collection` bindet automatisch an `$collection.current`. Jedes `Field` bindet an das entsprechende Attribut:

```mirror-static
Form $tasks, w 320
  Field title
  Field description, multiline
  Field aufwand
  Field done

  Actions:
    Button "Speichern", save()
    Button "Verwerfen", revert()
```

**Das ist alles.** Form erkennt die Feldtypen automatisch:

| Datentyp | Generiertes UI |
|----------|----------------|
| String | Input |
| String + `multiline` | Textarea |
| Number | NumberInput |
| Boolean | Switch |
| Relation | Select mit Optionen |
| Array | TagInput |

### Field-Optionen

```mirror-static
Form $tasks
  Field title, label "Titel", placeholder "Task-Titel eingeben..."
  Field aufwand, label "Aufwand", suffix "h"
  Field priority, label "Priorität", min 1, max 5
  Field done, label "Erledigt"
```

| Option | Beschreibung |
|--------|--------------|
| `label` | Anzeigename (sonst Feldname) |
| `placeholder` | Platzhalter-Text |
| `multiline` | Textarea statt Input |
| `suffix` / `prefix` | Text nach/vor dem Wert |
| `min` / `max` | Bei Zahlen |
| `required` | Pflichtfeld |
| `disabled` | Nicht editierbar |

## Schema: Relationen definieren

Die entscheidende Frage bei Formularen: Wenn ich `Field assignee` schreibe, woher weiß Mirror, dass es einen Select mit allen `$users` anzeigen soll?

**Die Antwort: Das Schema.**

Das `$schema:` in der `.data`-Datei definiert, **wohin** jede Relation zeigt:

```
// data/tasks.data

$schema:
  title: string
  description: string
  aufwand: number
  done: boolean
  assignee: $users              // ← "assignee zeigt auf $users"
  project: $projects            // ← "project zeigt auf $projects"
  watchers: $users[]            // ← "watchers ist ein Array von $users"

task1:
  title: Design Review
  assignee: $users.toni
  project: $projects.website
  watchers: $users.anna, $users.tom
```

**Jetzt weiß Mirror automatisch:**

| Feld | Schema | Generiertes UI |
|------|--------|----------------|
| `Field title` | `string` | Input |
| `Field aufwand` | `number` | NumberInput |
| `Field done` | `boolean` | Switch |
| `Field assignee` | `$users` | Select mit allen Users |
| `Field project` | `$projects` | Select mit allen Projects |
| `Field watchers` | `$users[]` | TagInput mit allen Users |

```mirror-static
// Das UI leitet alles aus dem Schema ab
Form $tasks
  Field title                   // → Input
  Field assignee                // → Select mit $users (automatisch!)
  Field project                 // → Select mit $projects (automatisch!)
  Field watchers                // → TagInput mit $users (automatisch!)
```

**Keine manuelle Verdrahtung.** Das Schema ist die Single Source of Truth.

## Relationen: N:1 (Lookup)

Bei einer N:1-Relation (`assignee: $users`) generiert Mirror einen Select mit allen Einträgen der Ziel-Collection:

```mirror-static
Form $tasks
  Field title
  Field assignee              // ← Automatisch: Select mit allen Users
```

**Generiertes UI:**

```
Zuständig
┌─────────────────────────────┐
│ Toni Steimle            ▼  │
└─────────────────────────────┘
  ┌───────────────────────────┐
  │ ○ Toni Steimle            │
  │ ○ Anna Schmidt            │
  │ ○ Tom Weber               │
  └───────────────────────────┘
```

### Was wird angezeigt?

Default: Das Feld `name` oder das erste String-Feld.

Explizit überschreiben mit `display`:

```mirror-static
Form $tasks
  Field assignee, display user.email
  Field assignee, display user.name + " (" + user.role + ")"
```

### Optionen filtern

Nur bestimmte Einträge als Optionen anzeigen:

```mirror-static
Form $tasks
  Field assignee, filter user.active == true
  Field assignee, filter user.role == "Dev"
```

### Weitere Optionen

```mirror-static
Form $tasks
  Field assignee
    label: "Zuständig"
    placeholder: "User auswählen..."
    allowClear: true                      // "Keine Auswahl" erlauben
    display: user.name
    filter: user.active == true
```

## Relationen: N:N (Multi-Lookup)

Bei einer N:N-Relation (`watchers: $users[]`) generiert Mirror einen TagInput:

```mirror-static
Form $tasks
  Field watchers              // ← Automatisch: TagInput mit allen Users
```

**Generiertes UI:**

```
Beobachter
┌─────────────────────────────────────┐
│ [Anna ×] [Tom ×]               + Add │
└─────────────────────────────────────┘
```

Klick auf "+ Add" öffnet einen Picker mit allen verfügbaren Users.

### N:N anpassen

```mirror-static
Form $projects
  Field members
    label: "Team-Mitglieder"
    display: user.name
    max: 10                              // Maximal 10 Mitglieder
    filter: user.active == true          // Nur aktive User
```

## Create: Neue Einträge

Mit `create()` erstellst du einen neuen Eintrag und machst ihn zum `current`:

```mirror-static
Frame gap 16

  Button "Neuer Task", create($tasks)

  // Form zeigt jetzt den neuen (leeren) Task
  Form $tasks
    Field title
    Field assignee

    Actions:
      Button "Erstellen", save()
      Button "Abbrechen", revert()
```

### Create mit Initialwerten

```mirror-static
// Neuer Task für das aktuelle Projekt
Button "Task hinzufügen", create($tasks, {
  project: $projects.current,
  assignee: $users.current,
  priority: 2
})
```

### Create im Kontext

```mirror-static
Frame hor, gap 24

  // Projekt-Liste
  Frame gap 8
    each project in $projects, select()
      Frame pad 12, bg #1a1a1a, rad 6, cursor pointer
        project == $projects.current:
          bg #2563eb
        Text project.name, col white

  // Tasks des ausgewählten Projekts
  Frame gap 12
    Frame hor, spread
      Text $projects.current.name, col white, fs 18, weight 600
      Button "Neuer Task", create($tasks, { project: $projects.current })

    each task in $tasks where project == $projects.current
      Frame pad 12, bg #1a1a1a, rad 6
        Text task.title, col white
```

## Delete: Einträge löschen

```mirror-static
Button "Löschen", delete($tasks.current)
```

### Mit Bestätigung

```mirror-static
Button "Löschen", delete($tasks.current, confirm: "Task wirklich löschen?")
```

### Im Master-Detail

```mirror-static
Frame hor, gap 0

  Table $tasks, w 400
    Column title
    Column done

  Frame w 300, pad 24
    if $tasks.current
      Form $tasks
        Field title
        Field done

        Actions:
          Button "Speichern", save()
          Button "Löschen", delete($tasks.current)
```

## Inline Editing in Tables

Für schnelles Bearbeiten direkt in der Tabelle:

```mirror-static
Table $tasks, editable
  Column title, editable           // Inline-Edit bei Klick
  Column assignee, editable        // Inline Relation-Picker
  Column done, editable            // Inline Checkbox
  Column aufwand                   // Nicht editierbar (nur Anzeige)

  RowActions:
    Button icon "trash", delete(row)
```

## Relation-Constraints

In der `.data`-Datei definierst du Regeln für Relationen:

```
// data/tasks.data

$schema:
  title: required
  assignee: $users, required
  project: $projects, onDelete cascade
  watchers: $users[], max 10

task1:
  title: Design Review
  assignee: $users.toni
  project: $projects.website
  watchers: $users.anna, $users.tom
```

| Constraint | Bedeutung |
|------------|-----------|
| `required` | Muss gesetzt sein |
| `$users` | Relation zu Users-Collection |
| `$users[]` | Array-Relation (N:N) |
| `onDelete cascade` | Wenn Ziel gelöscht → diesen Eintrag auch löschen |
| `onDelete nullify` | Wenn Ziel gelöscht → Feld auf null setzen |
| `onDelete restrict` | Löschen verhindern wenn noch referenziert |
| `max N` | Maximum bei Array-Relationen |

## Praktisch: Task-Manager

Ein komplettes CRUD-Beispiel:

```mirror-static
Frame hor, gap 0, h 400

  // Sidebar: Projekte
  Frame w 200, bg #0a0a0a, pad 16, gap 12
    Frame hor, spread
      Text "Projekte", col #888, fs 12, uppercase
      Button icon "plus", is 14, create($projects)

    each project in $projects, select()
      Frame pad 10, rad 6, cursor pointer
        project == $projects.current:
          bg #1a1a1a
        Text project.name, col white, fs 13

  // Main: Tasks des Projekts
  Frame grow, gap 0

    // Header
    Frame hor, spread, pad 16, bor 0 0 1 0, boc #222
      Text $projects.current.name, col white, fs 18, weight 600
      Button "Neuer Task", create($tasks, { project: $projects.current })

    // Task-Liste
    Frame hor, gap 0, grow

      Table $tasks where project == $projects.current, w 400
        Column title
        Column assignee.name
        Column done, editable

      // Detail / Edit
      Frame w 300, pad 20, bg #0a0a0a
        if $tasks.current
          Form $tasks
            Field title, label "Titel"
            Field description, label "Beschreibung", multiline
            Field assignee, label "Zuständig"
            Field aufwand, label "Aufwand", suffix "h"
            Field priority, label "Priorität"
            Field done, label "Erledigt"

            Actions:
              Frame hor, gap 8
                Button "Speichern", save(), grow
                Button "Löschen", delete($tasks.current), bg #333
        else
          Frame center, h full
            Text "Task auswählen", col #666
```

## Praktisch: User-Verwaltung

Mit N:N Relationen (User gehören zu mehreren Projekten):

```mirror-static
Frame hor, gap 0, h 400

  // User-Liste
  Table $users, w 350
    Column "User"
      Cell:
        Frame hor, gap 12
          Frame w 36, h 36, bg #2563eb, rad 99, center
            Text row.name.charAt(0), col white, weight 600
          Frame gap 2
            Text row.name, col white, weight 500
            Text row.email, col #888, fs 12
    Column role

  // Edit Form
  Frame w 350, pad 24, bg #0a0a0a
    if $users.current
      Form $users
        Field name, label "Name"
        Field email, label "E-Mail"
        Field role, label "Rolle"
        Field projects, label "Projekte"      // N:N Relation

        Actions:
          Button "Speichern", save()
          Button "Löschen", delete($users.current, confirm: "User löschen?")
```

---

## Zusammenfassung

### Schema definiert alles

```
// data/tasks.data

$schema:
  title: string, required
  assignee: $users                    // N:1 Relation
  watchers: $users[], max 5           // N:N Relation
  project: $projects, onDelete cascade
```

| Schema-Typ | Generiertes UI |
|------------|----------------|
| `string` | Input |
| `number` | NumberInput |
| `boolean` | Switch |
| `$users` | Select (Lookup) |
| `$users[]` | TagInput (Multi-Lookup) |

### CRUD-Operationen

| Konzept | Syntax |
|---------|--------|
| **Cursor** | `$collection.current` |
| **Table setzt Cursor** | `Table $tasks` → Klick setzt `$tasks.current` |
| **Form bindet an Cursor** | `Form $tasks` → arbeitet mit `$tasks.current` |
| **Field** | `Field name` → automatisches UI aus Schema |
| **Create** | `create($tasks)`, `create($tasks, {...})` |
| **Save** | `save()` in Form |
| **Revert** | `revert()` in Form |
| **Delete** | `delete($tasks.current)` |

### Relation-Optionen

| Option | Beschreibung |
|--------|--------------|
| `display` | Was im Dropdown angezeigt wird |
| `filter` | Welche Optionen verfügbar sind |
| `allowClear` | "Keine Auswahl" erlauben |
| `max` | Maximum bei N:N |
| `placeholder` | Platzhalter-Text |

**Das Prinzip:** Das Schema definiert die Datenstruktur. Das UI leitet alles daraus ab – Feldtypen, Lookups, Validierung. Eine Source of Truth, keine Redundanz.
