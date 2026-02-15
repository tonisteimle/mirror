# Data Tab Konzept

> Deklaratives Data-Binding für Mirror - Datengetriebene Prototypen ohne Code

## Die Idee

UI-Komponenten binden sich deklarativ an Daten. Keine Loop-Syntax, keine Variablen - einfach ein `data` Property wie jedes andere auch.

```
TodoList data Tasks pad 16 gap 8
  Checkbox checked done
  Label title
  Tag category.name bg category.color
```

## Schema Definition (Data Tab)

Einfache Syntax im Data Tab:

```
Task
  title: text
  done: boolean
  priority: number
  category: Category

Category
  name: text
  color: text
```

**Feld-Typen:**
- `text` - String
- `number` - Zahl
- `boolean` - true/false
- `TypeName` - Relation zu anderem Typ

## Data Binding

### Grundsyntax

```
Container data TypeName [where condition] [properties]
  ... feldname ...
```

Das `data` Property ist wie jedes andere Property:

```
UserList data Users pad 12 gap 4 bg #1E1E2E rad 8
  Label name
  Label email col #888
```

### Feld-Zugriff

Innerhalb eines `data`-Containers sind alle Felder direkt verfügbar:

```
ProductCard data Products
  Image src image h 200 fit cover
  Label name size 18 weight 600
  Label price col #10B981
  Label description col #888
```

Kein Präfix nötig - der Kontext ist durch `data Products` klar.

### Relationen

Relationen werden automatisch aufgelöst durch Punkt-Notation:

```
// Schema:
Task
  title: text
  category: Category

Category
  name: text
  color: text

// UI - category.name greift auf die verknüpfte Category zu:
TaskList data Tasks
  Label title
  Badge category.name bg category.color
```

### Filter

Optional mit `where`:

```
// Nur unerledigte Tasks
TodoList data Tasks where done == false
  Label title

// Nur aktive User
ActiveUsers data Users where active == true
  Avatar src avatar
  Label name

// Kombinierte Bedingungen
HighPriority data Tasks where done == false and priority > 5
  Label title
```

### Verschachtelte Daten

Bei verschachtelten Containern wechselt der Kontext:

```
// Schema:
Project
  name: text
  tasks: Task[]    // Liste von Tasks

Task
  title: text
  done: boolean

// UI:
ProjectView data Projects pad 24
  H2 name                           // <- Project.name
  Label "Tasks:"
  TaskList data tasks gap 4         // <- tasks ist Relation
    Checkbox checked done           // <- Task.done (neuer Kontext)
    Label title                     // <- Task.title
```

## Vollständiges Beispiel

**Schema:**
```
Task
  title: text
  done: boolean
  category: Category
  assignee: User

Category
  name: text
  color: text
  icon: text

User
  name: text
  avatar: text
  email: text
```

**UI:**
```
App ver gap 24 pad 24

Header hor between
  H1 "Task Manager"
  Button onclick add Task "Neue Aufgabe"

Sidebar data Categories w 200 gap 8
  CategoryItem hor gap 8 pad 8 rad 6 hover-bg #333
    Icon icon icon
    Label name weight 500
    Badge count col #888

MainContent data Tasks where done == false gap 12
  TaskCard hor gap 12 pad 16 bg #1E1E2E rad 8
    Checkbox checked done
    Content ver gap 4 grow
      Label title weight 600
      Meta hor gap 8 col #888 size 12
        Label category.name
        Label assignee.name
    Avatar src assignee.avatar w 32 h 32 rad 16

DoneSection data Tasks where done == true opa 0.6 gap 8
  DoneItem hor gap 8
    Icon icon "check" col #10B981
    Label title
```

## Tabellen mit Grid

Eine Datentabelle ist einfach Grid + data. Keine spezielle Tabellen-Syntax nötig:

```
TaskTable data Tasks grid 4 gap 1 bg #333
  Label title pad 8
  Label category.name pad 8
  Label priority pad 8
  Checkbox checked done pad 8
```

**Das IST eine Tabelle.** Jede Iteration erzeugt 4 Grid-Zellen.

**Mit Header:**
```
TaskView ver gap 1
  Header grid 4 bg #444 pad 8 weight 600
    Label "Titel"
    Label "Kategorie"
    Label "Prio"
    Label "Done"
  Rows data Tasks grid 4 hover-bg #333
    Label title pad 8
    Label category.name pad 8
    Label priority pad 8
    Checkbox checked done pad 8
```

**Sortierbare Spalten:**
```
TaskView ver gap 1
  Header grid 4 bg #444 pad 8 weight 600
    Label "Titel" onclick sort Tasks by title
    Label "Prio" onclick sort Tasks by priority desc
    Label "Kategorie"
    Label "Done"
  Rows data Tasks grid 4
    Label title pad 8
    Label priority pad 8
    Label category.name pad 8
    Checkbox checked done pad 8
```

Die Mirror-Philosophie: **Kombiniere einfache Dinge.**
- `grid 4` → Layout
- `data Tasks` → Daten
- Zusammen → Tabelle

Kein `<Table>`, kein `<Row>`, kein `<Cell>`.

## Actions (CRUD)

### Hinzufügen

```
Button onclick add Task title "Neu" done false
  "Neue Aufgabe"
```

### Löschen

```
TaskCard data Tasks
  Label title
  DeleteBtn onclick remove
    Icon icon "trash"
```

`remove` ohne Parameter entfernt das aktuelle Item im Daten-Kontext.

## Formulare & Databinding

> **TODO: Hier muss noch deutlich mehr durchdacht werden.**

Offene Fragen:
- Wie bindet sich ein Input an ein Datenfeld? Implizit durch Feldname?
- Wie werden verschiedene Feldtypen gemappt (text→Input, boolean→Checkbox, Relation→Select)?
- Validierung - wo definiert, wie dargestellt?
- Error Messages und Error States
- Required/Optional Felder
- Komplexe Felder: Multi-Select, Date Picker, File Upload
- Formulare für neue Records vs. Editieren bestehender Records
- Verschachtelte Daten in Formularen

Erste Ideen-Skizze (noch nicht final):
```
// Explizites Control, implizites Binding?
TaskForm data Task[task-1]
  Input title
  Checkbox done
  Select category

// Oder komplett implizit?
TaskForm data Task[task-1]
  title           // → wird Input weil text
  done            // → wird Checkbox weil boolean
  category        // → wird Select weil Relation

// Oder mit Field-Wrapper?
TaskForm data Task[task-1]
  Field title
  Field done
  Field category
```

**Das braucht mehr Konzeptarbeit.**

## UI im Data Tab

```
+----------------------------------------------------------+
|  Schema   Tasks   Categories              [Generate ⚡]   |
|  ------                                                   |
+----------------------------------------------------------+
|                                                           |
|  Task                                                     |
|    title: text                                            |
|    done: boolean                                          |
|    category: Category                                     |
|                                                           |
|  Category                                                 |
|    name: text                                             |
|    color: text                                            |
|                                                           |
+----------------------------------------------------------+
```

Nach "Generate" erscheinen Tabs mit editierbaren Tabellen:

```
+----------------------------------------------------------+
|  Schema   Tasks   Categories              [Generate ⚡]   |
|           -----                                           |
+----------------------------------------------------------+
|                                                           |
|  _id       title              done    category            |
|  -------------------------------------------------------- |
|  task-1    Einkaufen          false   cat-1               |
|  task-2    Meeting vorber...  true    cat-2               |
|  task-3    Sport machen       false   cat-1               |
|                                          [+ Zeile]        |
+----------------------------------------------------------+
```

## Differentiator

**Hier versagen Figma & Co:**

1. **Echte Daten** statt Copy-Paste von Beispieltext
2. **Relationen** - Category.name wird automatisch aufgelöst
3. **Filter** - `where done == false`
4. **CRUD** - Daten hinzufügen, ändern, löschen im Prototyp
5. **KI-generierte Demo-Daten** - realistische Testdaten auf Knopfdruck

Das ist **echter datengetriebener Prototyping** - nicht nur statische Mockups.
