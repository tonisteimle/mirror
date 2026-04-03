---
title: Formulare
subtitle: Daten erfassen, bearbeiten und speichern
prev: 15-crud
next: 17-bedingungen
---

Formulare verbinden UI mit Daten. Mit Two-Way Binding ändern Inputs direkt die Daten, mit Methoden speicherst du sie.

## Two-Way Binding

Ein Input mit `value $variable` ist bidirektional gebunden – Änderungen im Input aktualisieren die Variable sofort:

```mirror
$name: "Max"

Frame gap 12, w 280
  Input value $name, placeholder "Dein Name"
    bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full

  Text "Hallo, " + $name + "!", col white, fs 16
```

Tippe in das Input – der Text aktualisiert sich live.

## Binding an Datenobjekte

Binde Inputs direkt an Felder eines Datenobjekts:

```mirror
$user:
  name: "Max Mustermann"
  email: "max@example.com"
  bio: ""

Frame gap 16, w 300

  Frame gap 4
    Text "Name", col #888, fs 12
    Input value $user.name
      bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full

  Frame gap 4
    Text "E-Mail", col #888, fs 12
    Input value $user.email, type email
      bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full

  Frame gap 4
    Text "Bio", col #888, fs 12
    Textarea value $user.bio, placeholder "Über dich..."
      bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full, h 80

  // Live-Vorschau
  Frame bg #252525, pad 16, rad 8, gap 4
    Text $user.name, col white, weight 500
    Text $user.email, col #888, fs 12
```

Alle Inputs ändern dasselbe `$user`-Objekt. Die Vorschau zeigt die aktuellen Werte.

## Binding an Collection-Einträge

Bearbeite Einträge aus `.data`-Dateien:

```
// data/users.data

toni:
  name: Toni Steimle
  email: toni@example.com
  role: Lead
```

```mirror-static
Frame gap 16, w 300

  Frame gap 4
    Text "Name", col #888, fs 12
    Input value $users.toni.name
      bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full

  Frame gap 4
    Text "E-Mail", col #888, fs 12
    Input value $users.toni.email
      bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full

  Frame gap 4
    Text "Rolle", col #888, fs 12
    Select value $users.toni.role
      Trigger bg #1a1a1a, bor 1, boc #333, pad 12, rad 6, hor, spread, w full
        ValueText col white, fs 13
        Icon "chevron-down", ic #666, is 16
      Content bg #1a1a1a, bor 1, boc #333, rad 8, pad 4, shadow lg
        Item "Lead"
        Item "Dev"
        Item "Design"
```

## Form Elemente

### Input

```mirror
Frame gap 12, w 280

  // Text Input
  Input placeholder "Name", value $form.name
    bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full
    focus:
      boc #2563eb

  // E-Mail
  Input placeholder "E-Mail", type email, value $form.email
    bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full

  // Passwort
  Input placeholder "Passwort", type password, value $form.password
    bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full

  // Zahl
  Input placeholder "Alter", type number, value $form.age
    bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full
```

### Textarea

```mirror
$form:
  message: ""

Frame gap 4, w 280
  Text "Nachricht", col #888, fs 12
  Textarea value $form.message, placeholder "Schreibe eine Nachricht..."
    bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full, h 100
    focus:
      boc #2563eb
  Text ($form.message).length + " Zeichen", col #666, fs 11
```

### Checkbox

```mirror
$settings:
  newsletter: false
  terms: false

Frame gap 12

  Checkbox checked $settings.newsletter
    Root hor, gap 10, cursor pointer
      Control w 20, h 20, bor 2, boc #444, rad 4
      Label "Newsletter abonnieren", col white, fs 13

  Checkbox checked $settings.terms
    Root hor, gap 10, cursor pointer
      Control w 20, h 20, bor 2, boc #444, rad 4
      Label "AGB akzeptieren", col white, fs 13
```

### Switch

```mirror
$prefs:
  darkMode: true
  notifications: false

Frame gap 12

  Switch checked $prefs.darkMode
    Root hor, gap 12
      Track w 44, h 24, rad 99, pad 2
      Label "Dark Mode", col white, fs 13

  Switch checked $prefs.notifications
    Root hor, gap 12
      Track w 44, h 24, rad 99, pad 2
      Label "Notifications", col white, fs 13
```

### RadioGroup

```mirror
$billing:
  plan: "monthly"

RadioGroup value $billing.plan
  Root gap 10

    Item value "monthly"
      ItemControl w 20, h 20, bor 2, boc #444, rad 99
      ItemText "Monatlich – €9/Monat", col white, fs 13, margin 0 0 0 10

    Item value "yearly"
      ItemControl w 20, h 20, bor 2, boc #444, rad 99
      ItemText "Jährlich – €99/Jahr (spare 17%)", col white, fs 13, margin 0 0 0 10
```

### Select

```mirror
$task:
  assignee: ""

Frame gap 4, w 240
  Text "Zuständig", col #888, fs 12
  Select value $task.assignee
    Trigger bg #1a1a1a, bor 1, boc #333, pad 12, rad 6, hor, spread, w full
      ValueText col white, fs 13
      Icon "chevron-down", ic #666, is 16
    Content bg #1a1a1a, bor 1, boc #333, rad 8, pad 4, shadow lg
      each user in $users
        Item user.name, value user
```

### Slider

```mirror
$audio:
  volume: 75

Frame gap 8, w 280
  Slider value $audio.volume, min 0, max 100
    Root gap 8
      Label hor, spread
        Text "Lautstärke", col white, fs 13
        ValueText col #888, fs 12
      Track h 6, bg #333, rad 99
        Range bg #2563eb, rad 99
        Thumb w 18, h 18, bg white, rad 99, shadow md
```

## Formulare absenden

Mit `onsubmit` rufst du eine Methode auf:

```mirror
$newTask:
  title: ""
  aufwand: 0
  assignee: ""

Frame gap 16, w 300

  Frame gap 4
    Text "Titel", col #888, fs 12
    Input value $newTask.title, placeholder "Task-Titel"
      bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full

  Frame gap 4
    Text "Aufwand (Stunden)", col #888, fs 12
    Input value $newTask.aufwand, type number
      bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full

  Frame gap 4
    Text "Zuständig", col #888, fs 12
    Select value $newTask.assignee
      Trigger bg #1a1a1a, bor 1, boc #333, pad 12, rad 6, hor, spread, w full
        ValueText col white, fs 13
        Icon "chevron-down", ic #666, is 16
      Content bg #1a1a1a, bor 1, boc #333, rad 8, pad 4, shadow lg
        each user in $users
          Item user.name, value user

  Button "Task erstellen", bg #2563eb, col white, pad 14, rad 8, w full, createTask()
    hover:
      bg #3b82f6
```

Die Methode:

```
function createTask()
  // Neuen Task zur Collection hinzufügen
  $tasks.add({
    title: $newTask.title,
    aufwand: $newTask.aufwand,
    assignee: $newTask.assignee,
    done: false
  })

  // Formular zurücksetzen
  $newTask.title = ""
  $newTask.aufwand = 0
  $newTask.assignee = ""
```

## Validierung

Zeige Fehler basierend auf Bedingungen:

```mirror
$form:
  email: ""
  password: ""

Frame gap 16, w 300

  Frame gap 4
    Text "E-Mail", col #888, fs 12
    Input value $form.email, type email
      bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full
      $form.email != "" and not isValidEmail($form.email):
        boc #ef4444
    if $form.email != "" and not isValidEmail($form.email)
      Text "Ungültige E-Mail-Adresse", col #ef4444, fs 11

  Frame gap 4
    Text "Passwort", col #888, fs 12
    Input value $form.password, type password
      bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full
      ($form.password).length > 0 and ($form.password).length < 8:
        boc #ef4444
    if ($form.password).length > 0 and ($form.password).length < 8
      Text "Mindestens 8 Zeichen", col #ef4444, fs 11

  Button "Registrieren", pad 14, rad 8, w full, register()
    isValidEmail($form.email) and ($form.password).length >= 8:
      bg #2563eb
      col white
    else:
      bg #333
      col #666
      cursor not-allowed
```

## Praktisch: User bearbeiten

Ein komplettes Bearbeitungsformular:

```mirror-static
// Aktuell ausgewählter User
$selectedUser: $users.toni

Frame hor, gap 24, pad 24

  // User-Liste
  Frame gap 8, w 200
    Text "Users", col #888, fs 12, uppercase
    each user in $users
      Frame hor, gap 12, pad 12, rad 8, cursor pointer, selectUser(user)
        user == $selectedUser:
          bg #2563eb
        else:
          bg #1a1a1a
        Frame w 32, h 32, bg #333, rad 99, center
          Text user.name.charAt(0), col white, fs 12, weight 600
        Text user.name, col white, fs 13

  // Edit Form
  Frame gap 16, w 300
    Text "Bearbeiten", col #888, fs 12, uppercase

    Frame gap 4
      Text "Name", col #888, fs 12
      Input value $selectedUser.name
        bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full

    Frame gap 4
      Text "E-Mail", col #888, fs 12
      Input value $selectedUser.email
        bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full

    Frame gap 4
      Text "Rolle", col #888, fs 12
      Select value $selectedUser.role
        Trigger bg #1a1a1a, bor 1, boc #333, pad 12, rad 6, hor, spread, w full
          ValueText col white, fs 13
          Icon "chevron-down", ic #666, is 16
        Content bg #1a1a1a, bor 1, boc #333, rad 8, pad 4, shadow lg
          Item "Lead"
          Item "Dev"
          Item "Design"

    Button "Speichern", bg #2563eb, col white, pad 14, rad 8, w full, saveUser()
```

```
function selectUser(user)
  $selectedUser = user

function saveUser()
  // Änderungen sind bereits durch Two-Way Binding gespeichert
  // Hier könntest du zusätzlich an einen Server senden
  log("User gespeichert: " + $selectedUser.name)
```

## Praktisch: Task erstellen

Formular mit Relation zu anderen Collections:

```mirror-static
$newTask:
  title: ""
  aufwand: 8
  priority: 1
  assignee: null
  project: null

Frame gap 20, w 340, bg #1a1a1a, pad 24, rad 12

  Text "Neuer Task", col white, fs 18, weight 600

  Frame gap 16

    Frame gap 4
      Text "Titel", col #888, fs 12
      Input value $newTask.title, placeholder "Was soll erledigt werden?"
        bg #111, bor 1, boc #333, col white, pad 12, rad 6, w full
        focus:
          boc #2563eb

    Frame hor, gap 12
      Frame gap 4, grow
        Text "Aufwand (h)", col #888, fs 12
        Input value $newTask.aufwand, type number
          bg #111, bor 1, boc #333, col white, pad 12, rad 6, w full

      Frame gap 4, grow
        Text "Priorität", col #888, fs 12
        Select value $newTask.priority
          Trigger bg #111, bor 1, boc #333, pad 12, rad 6, hor, spread, w full
            ValueText col white, fs 13
            Icon "chevron-down", ic #666, is 16
          Content bg #111, bor 1, boc #333, rad 8, pad 4, shadow lg
            Item "1 - Niedrig", value 1
            Item "2 - Mittel", value 2
            Item "3 - Hoch", value 3

    Frame gap 4
      Text "Zuständig", col #888, fs 12
      Select value $newTask.assignee
        Trigger bg #111, bor 1, boc #333, pad 12, rad 6, hor, spread, w full
          ValueText col white, fs 13
          Icon "chevron-down", ic #666, is 16
        Content bg #111, bor 1, boc #333, rad 8, pad 4, shadow lg
          each user in $users
            Item user.name, value user

    Frame gap 4
      Text "Projekt", col #888, fs 12
      Select value $newTask.project
        Trigger bg #111, bor 1, boc #333, pad 12, rad 6, hor, spread, w full
          ValueText col white, fs 13
          Icon "chevron-down", ic #666, is 16
        Content bg #111, bor 1, boc #333, rad 8, pad 4, shadow lg
          each project in $projects
            Item project.name, value project

  Frame hor, gap 8
    Button "Abbrechen", bg #333, col white, pad 12, rad 6, grow, resetForm()
    Button "Erstellen", bg #2563eb, col white, pad 12, rad 6, grow, createTask()
      $newTask.title == "":
        bg #333
        col #666
```

```
function resetForm()
  $newTask.title = ""
  $newTask.aufwand = 8
  $newTask.priority = 1
  $newTask.assignee = null
  $newTask.project = null

function createTask()
  if $newTask.title == ""
    return

  $tasks.add({
    title: $newTask.title,
    aufwand: $newTask.aufwand,
    priority: $newTask.priority,
    assignee: $newTask.assignee,
    project: $newTask.project,
    done: false
  })

  resetForm()
```

---

## Zusammenfassung

| Konzept | Syntax |
|---------|--------|
| Two-Way Binding | `Input value $variable` |
| Objekt-Feld | `Input value $user.email` |
| Collection-Eintrag | `Input value $users.toni.name` |
| Checkbox Binding | `Checkbox checked $settings.newsletter` |
| Select Binding | `Select value $task.assignee` |
| Items aus Collection | `each user in $users` → `Item user.name, value user` |
| Submit | `Button "Speichern", saveUser()` |
| Validierung | Bedingte Styles + if-Blöcke |
| Hinzufügen | `$collection.add({...})` |
| Zurücksetzen | Felder auf Startwerte setzen |

**Formulare + Datenmodell = echte Apps.** Two-Way Binding macht die Verbindung automatisch.
