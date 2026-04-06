---
title: Tabellen
subtitle: Daten in Zeilen und Spalten anzeigen und bearbeiten
prev: 11-content
next: 13-bedingungen
---

Tabellen zeigen Daten in strukturierter Form. Mit dem `Row:` Slot definierst du, wie jede Zeile aussieht – von einfacher Anzeige bis zu editierbaren Feldern.

## Grundsyntax

Eine Table braucht eine Datenquelle und einen `Row:` Slot:

```mirror
tasks:
  task1:
    title: "Design Review"
    status: "done"
  task2:
    title: "API Integration"
    status: "progress"
  task3:
    title: "Testing"
    status: "todo"

Table $tasks, gap 4, w full
  Row: hor, gap 16, pad 12, bg #1a1a1a, rad 6, w full
    Text row.title, col white, w 140
    Text row.status, col #888
```

- `Table $tasks` – Die Datenquelle (Datenobjekt mit Einträgen)
- `Row:` – Template für jede Zeile
- `row.title` – Zugriff auf Felder des aktuellen Eintrags

> **Hinweis:** Daten werden im Entry-Format definiert: `name:` gefolgt von eingerückten `key: value` Paaren. Bei der Verwendung mit `$name` iteriert die Runtime automatisch über alle Einträge.

## Row-Template stylen

Der `Row:` Slot kann Properties haben:

```mirror
users:
  anna:
    name: "Anna"
    role: "Designer"
  max:
    name: "Max"
    role: "Developer"

Table $users, gap 4, w full
  Row: hor, gap 16, pad 12 16, bg #1a1a1a, rad 6, ver-center, w full
    Text row.name, col white, w 120, weight 500
    Text row.role, col #666, fs 13
```

## Mehrere Elemente pro Zeile

Kombiniere beliebige Elemente im Row-Template. Mit verschachtelten Frames baust du mehrzeilige Zellen:

```mirror
projects:
  website:
    name: "Website Relaunch"
    info: "Neues Design und bessere Performance"
    status: "Aktiv"
  mobile:
    name: "Mobile App"
    info: "iOS und Android Version"
    status: "In Arbeit"
  api:
    name: "Backend API"
    info: "REST Endpoints für alle Services"
    status: "Fertig"

Table $projects, gap 4, w full
  Row: hor, gap 16, pad 14 16, bg #1a1a1a, rad 8, ver-center, w full
    Icon "folder", ic #2563eb, is 20
    Frame gap 2, grow
      Text row.name, col white, weight 500
      Text row.info, col #666, fs 12
    Text row.status, col #888, fs 12, pad 4 10, bg #252525, rad 4
```

## Editierbare Tabellen

Mit `Input` und `value row.field` werden Zellen editierbar:

```mirror
items:
  item1:
    name: "Item 1"
    quantity: 5
  item2:
    name: "Item 2"
    quantity: 3

Table $items, gap 4, w full
  Row: hor, gap 12, pad 10 12, bg #1a1a1a, rad 6, ver-center, w full
    Input value row.name, bg #252525, col white, pad 8 12, rad 4, w 150, bor 0
    Input value row.quantity, bg #252525, col white, pad 8 12, rad 4, w 80, type number, bor 0
```

Änderungen werden automatisch in die Daten zurückgeschrieben (Two-Way Binding).

## Filtern mit where

Mit `where` filterst du Einträge nach einer Bedingung:

```mirror
tasks:
  task1:
    title: "Design Review"
    done: true
  task2:
    title: "API Integration"
    done: false
  task3:
    title: "Testing"
    done: false
  task4:
    title: "Documentation"
    done: true

// Nur nicht erledigte Tasks
Table $tasks where row.done == false, gap 4, w full
  Row: hor, gap 12, pad 12 16, bg #1a1a1a, rad 8, ver-center, w full
    Icon "circle", ic #f59e0b, is 16
    Text row.title, col white, grow
```

**Vergleichsoperatoren:** `==`, `!=`, `>`, `<`, `>=`, `<=`

**Kombinieren mit and/or:**

```mirror
tasks:
  task1:
    title: "Critical Bug"
    priority: 1
    done: false
  task2:
    title: "Minor Fix"
    priority: 3
    done: false
  task3:
    title: "Feature"
    priority: 2
    done: true

// Nicht erledigt UND hohe Priorität
Table $tasks where row.done == false and row.priority < 3, gap 4, w full
  Row: hor, gap 12, pad 12 16, bg #1a1a1a, rad 8, ver-center, w full
    Icon "alert-circle", ic #ef4444, is 16
    Text row.title, col white, grow
    Text "P" + row.priority, col #ef4444, fs 12, weight 600
```

## Sortieren mit by

Mit `by` sortierst du nach einem Feld. Mit `desc` wird absteigend sortiert:

```mirror
tasks:
  task1:
    title: "Low Priority"
    priority: 3
  task2:
    title: "High Priority"
    priority: 1
  task3:
    title: "Medium Priority"
    priority: 2

// Sortiert nach Priorität (aufsteigend)
Table $tasks by priority, gap 4, w full
  Row: hor, gap 12, pad 12 16, bg #1a1a1a, rad 8, ver-center, w full
    Text row.priority, col #2563eb, fs 14, weight 600, w 24
    Text row.title, col white, grow
```

**Absteigend sortieren:**

```mirror
products:
  tshirt:
    name: "T-Shirt"
    price: 29
  hoodie:
    name: "Hoodie"
    price: 59
  cap:
    name: "Cap"
    price: 19

// Teuerste zuerst
Table $products by price desc, gap 4, w full
  Row: hor, spread, pad 12 16, bg #1a1a1a, rad 8, ver-center, w full
    Text row.name, col white, weight 500
    Text "€" + row.price, col #10b981, fs 14, weight 600
```

## Filtern und Sortieren kombinieren

`where` und `by` lassen sich kombinieren:

```mirror
tasks:
  task1:
    title: "Urgent Bug"
    priority: 1
    done: false
  task2:
    title: "Feature Request"
    priority: 2
    done: false
  task3:
    title: "Completed Task"
    priority: 1
    done: true
  task4:
    title: "Low Priority"
    priority: 3
    done: false

// Offene Tasks, sortiert nach Priorität
Table $tasks where row.done == false by priority, gap 4, w full
  Row: hor, gap 12, pad 12 16, bg #1a1a1a, rad 8, ver-center, w full
    Frame w 24, h 24, rad 4, bg #ef4444, center
      Text row.priority, col white, fs 11, weight 600
    Text row.title, col white, grow
```

## Gruppieren mit grouped by

Mit `grouped by` werden Einträge nach einem Feld gruppiert. Jede Gruppe bekommt automatisch einen Header:

```mirror
tasks:
  task1:
    title: "Design Homepage"
    status: "done"
  task2:
    title: "API Integration"
    status: "progress"
  task3:
    title: "Write Tests"
    status: "todo"
  task4:
    title: "Code Review"
    status: "done"
  task5:
    title: "Deploy"
    status: "todo"

Table $tasks grouped by status, gap 4, w full
  Row: hor, gap 12, pad 12 16, bg #1a1a1a, rad 6, ver-center, w full
    Icon "circle", ic #888, is 14
    Text row.title, col white, grow
```

### Custom Group Header

Mit `Group:` definierst du einen eigenen Gruppen-Header. Dabei hast du Zugriff auf `group.key` (Gruppenwert) und `group.count` (Anzahl Einträge):

```mirror
tasks:
  task1:
    title: "Design Homepage"
    status: "done"
  task2:
    title: "API Integration"
    status: "progress"
  task3:
    title: "Write Tests"
    status: "todo"
  task4:
    title: "Code Review"
    status: "done"

Table $tasks grouped by status, gap 4, w full
  Group: hor, spread, pad 12, bg #252525, rad 4
    Text group.key, col white, weight bold, uppercase
    Text group.count + " Einträge", col #888, fs 12
  Row: hor, gap 12, pad 12 16, bg #1a1a1a, rad 6, ver-center, w full
    Icon "circle", ic #888, is 14
    Text row.title, col white, grow
```

## Sticky Header

Mit `stickyHeader` bleibt der Header beim Scrollen fixiert. Damit das funktioniert, braucht die Tabelle eine feste Höhe (`h`) und `scroll`:

```mirror
products:
  p1:
    name: "T-Shirt"
    price: 29
  p2:
    name: "Hoodie"
    price: 59
  p3:
    name: "Cap"
    price: 19
  p4:
    name: "Sneakers"
    price: 89

Table $products, stickyHeader, gap 4, w full, h 150, scroll
  Header: hor, gap 12, pad 12 16, bg #0a0a0a, w full
    Text "Produkt", col #888, fs 12, w 120, weight 500
    Text "Preis", col #888, fs 12, w 80, weight 500
  Row: hor, gap 12, pad 12 16, bg #1a1a1a, rad 6, ver-center, w full
    Text row.name, col white, w 120
    Text "€" + row.price, col #10b981, w 80
```

> **Wichtig:** Ohne `h` (feste Höhe) und `scroll` hat die Tabelle keinen Scrollbereich – der Header kann dann nicht "kleben".

## Pagination

Mit `pageSize N` zeigt die Tabelle nur N Einträge pro Seite. Ein Paginator mit Vor-/Zurück-Buttons erscheint automatisch unter der Tabelle:

```mirror
tasks:
  task1:
    title: "Task 1"
    done: false
  task2:
    title: "Task 2"
    done: true
  task3:
    title: "Task 3"
    done: false
  task4:
    title: "Task 4"
    done: true
  task5:
    title: "Task 5"
    done: false

Table $tasks, pageSize 2, gap 4, w full
  Row: hor, gap 12, pad 12 16, bg #1a1a1a, rad 6, ver-center, w full
    Text row.title, col white, grow
```

Klicke auf die Pfeile um zwischen Seiten zu wechseln. Die Anzeige "Page 1 of 3" zeigt die aktuelle Position.

### Paginator stylen

Mit `Paginator:` und Sub-Slots (`Prev:`, `Next:`, `PageInfo:`) kannst du den Paginator anpassen:

```mirror
tasks:
  task1:
    title: "Task 1"
  task2:
    title: "Task 2"
  task3:
    title: "Task 3"
  task4:
    title: "Task 4"

Table $tasks, pageSize 2, gap 4, w full
  Row: hor, gap 12, pad 12 16, bg #1a1a1a, rad 6, ver-center, w full
    Text row.title, col white, grow
  Paginator: hor, spread, pad 12, bg #0a0a0a, rad 6
    Prev: pad 8 12, bg #333, col white, rad 4
    PageInfo: col #888, fs 12
    Next: pad 8 12, bg #333, col white, rad 4
```

## Sortierbare Spalten

Die `Column`-Syntax ist eine Alternative zu `Row:`. Statt ein eigenes Template zu definieren, gibst du nur die Feldnamen an – Mirror rendert automatisch eine klassische Tabelle mit Header und Zellen.

Mit `sortable` werden Spalten interaktiv sortierbar. Klick auf den Header sortiert die Daten:

```mirror
products:
  tshirt:
    name: "T-Shirt"
    price: 29
  hoodie:
    name: "Hoodie"
    price: 59
  cap:
    name: "Cap"
    price: 19

Table $products
  Column name, sortable
  Column price, sortable
```

> **Row: vs Column:** Verwende `Row:` für volle Kontrolle über das Layout. Verwende `Column` für klassische Tabellen mit automatischem Header und Sortierung.

### Initial absteigend sortieren

Mit `desc` startet eine Spalte absteigend sortiert:

```mirror
products:
  tshirt:
    name: "T-Shirt"
    price: 29
  hoodie:
    name: "Hoodie"
    price: 59
  cap:
    name: "Cap"
    price: 19

Table $products
  Column name, sortable
  Column price, sortable, desc
```

### Custom Sort Icons

Mit `SortAsc:` und `SortDesc:` definierst du eigene Icons für die Sortierrichtung:

```mirror
products:
  tshirt:
    name: "T-Shirt"
    price: 29
  hoodie:
    name: "Hoodie"
    price: 59

Table $products
  SortAsc: Icon "chevron-up", ic #2563eb, is 12
  SortDesc: Icon "chevron-down", ic #2563eb, is 12
  Column name, sortable
  Column price, sortable
```

## Features kombinieren

Alle Features lassen sich kombinieren. Hier eine Tabelle mit Sortierung, Pagination und Sticky Header:

```mirror
products:
  p1:
    name: "T-Shirt"
    price: 29
    stock: 150
  p2:
    name: "Hoodie"
    price: 59
    stock: 45
  p3:
    name: "Cap"
    price: 19
    stock: 200
  p4:
    name: "Sneakers"
    price: 89
    stock: 30
  p5:
    name: "Jacket"
    price: 129
    stock: 15

Table $products, stickyHeader, pageSize 3, h 200, scroll
  Column name, sortable
  Column price, sortable, desc
  Column stock, sortable
```

## Mit Icons und Badges

Zeige Status mit Icons und farbigen Badges:

```mirror
tasks:
  design:
    title: "Design Review"
    status: "done"
  development:
    title: "API Development"
    status: "progress"
  testing:
    title: "Testing"
    status: "todo"

Table $tasks, gap 4, w full
  Row: hor, gap 12, pad 12 16, bg #1a1a1a, rad 8, ver-center, w full
    Icon "circle", ic #888, is 16
    Text row.title, col white, fs 14, grow
    Text row.status, col #888, fs 12, pad 4 8, bg #252525, rad 4
```

## Aktionen pro Zeile

Füge Buttons oder klickbare Elemente hinzu:

```mirror
users:
  anna:
    name: "Anna"
    email: "anna@example.com"
  max:
    name: "Max"
    email: "max@example.com"

Table $users, gap 4, w full
  Row: hor, spread, ver-center, pad 12 16, bg #1a1a1a, rad 8, w full
    Frame hor, gap 12, ver-center
      Frame w 40, h 40, bg #2563eb, rad 99, center
        Text row.name[0], col white, fs 14, weight 600
      Frame gap 2
        Text row.name, col white, fs 14, weight 500
        Text row.email, col #666, fs 12
    Frame hor, gap 8
      Button "Edit", pad 8 14, bg #333, col white, rad 6, fs 12
      Button "Delete", pad 8 14, bg #ef4444, col white, rad 6, fs 12
```

## Praktisch: Task-Liste

Eine vollständige Task-Liste mit Status und Aktionen:

```mirror
tasks:
  task1:
    title: "Design Homepage"
    priority: "High"
  task2:
    title: "Write API Docs"
    priority: "Medium"
  task3:
    title: "Fix Login Bug"
    priority: "High"

Table $tasks, gap 4, w full
  Row: hor, gap 12, pad 12 16, bg #1a1a1a, rad 8, ver-center, w full
    Frame w 22, h 22, rad 4, bor 2, boc #444, center, cursor pointer
      Icon "circle", ic #666, is 14
    Frame gap 4, grow
      Text row.title, col white, fs 14, weight 500
      Text row.priority, col #888, fs 11
    Frame hor, gap 4
      Button pad 8, bg #252525, rad 6
        Icon "edit", ic #888, is 14
      Button pad 8, bg #252525, rad 6
        Icon "trash", ic #888, is 14
```

## Praktisch: Editierbare Produktliste

Eine Tabelle zum Bearbeiten von Produktdaten. Mit `Header:` definierst du die Kopfzeile:

```mirror
products:
  tshirt:
    name: "T-Shirt"
    price: 29.99
    stock: 150
  hoodie:
    name: "Hoodie"
    price: 59.99
    stock: 45
  cap:
    name: "Cap"
    price: 19.99
    stock: 200

Table $products, gap 4, w full, bg #111, pad 20, rad 12
  Header: hor, gap 12, pad 8 16, w full
    Text "Produkt", col #666, fs 12, w 150, weight 500
    Text "Preis", col #666, fs 12, w 100, weight 500
    Text "Lager", col #666, fs 12, w 80, weight 500
  Row: hor, gap 12, pad 10 16, bg #1a1a1a, rad 8, ver-center, w full
    Input value row.name, bg #252525, col white, bor 0, w 150, pad 8 12, rad 4
    Frame hor, ver-center, gap 4, w 100
      Text "€", col #666, fs 14
      Input value row.price, bg #252525, col white, bor 0, w 70, pad 8, rad 4, type number
    Input value row.stock, bg #252525, col white, bor 0, w 80, pad 8, rad 4, type number
```

---

## Zusammenfassung

| Syntax | Beschreibung |
|--------|--------------|
| `Table $data` | Datenquelle (Datenobjekt) |
| `Header:` | Kopfzeile (optional) |
| `Row:` | Zeilentemplate |
| `row.field` | Feld des aktuellen Eintrags |
| `Input value row.field` | Editierbares Feld |
| `where bedingung` | Filtern (`done == false`) |
| `by feld` | Sortieren aufsteigend |
| `by feld desc` | Sortieren absteigend |
| `grouped by feld` | Nach Feld gruppieren |
| `Group:` | Custom Gruppen-Header (mit `group.key`, `group.count`) |
| `stickyHeader` | Header bleibt beim Scrollen fixiert |
| `pageSize N` | Pagination mit N Einträgen pro Seite |
| `Paginator:` | Custom Paginator-Style |
| `Prev:`, `Next:`, `PageInfo:` | Paginator-Elemente stylen |
| `Column feld, sortable` | Spalte mit Klick-Sortierung |
| `Column feld, sortable, desc` | Initial absteigend sortiert |
| `SortAsc:`, `SortDesc:` | Custom Sort-Icons |

**Das Prinzip:** Table iteriert über Daten. Mit `Header:` definierst du eine Kopfzeile, mit `Row:` das Aussehen jeder Zeile. Mit `where` filterst du, mit `by` sortierst du, mit `grouped by` gruppierst du. Mit `Column` definierst du sortierbare Spalten, mit `pageSize` aktivierst du Pagination.
