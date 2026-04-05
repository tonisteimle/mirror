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
$tasks: [
  { title: "Design Review", status: "done" },
  { title: "API Integration", status: "progress" },
  { title: "Testing", status: "todo" }
]

Table $tasks
  Row:
    Text row.title, col white
    Text row.status, col #888
```

- `Table $tasks` – Die Datenquelle (ein Array von Objekten)
- `Row:` – Template für jede Zeile
- `row.title` – Zugriff auf Felder des aktuellen Eintrags

## Row-Template stylen

Der `Row:` Slot kann Properties haben:

```mirror
$users: [
  { name: "Anna", role: "Designer" },
  { name: "Max", role: "Developer" }
]

Table $users
  Row: hor, gap 16, pad 12, bg #1a1a1a, rad 4
    Text row.name, col white, w 120
    Text row.role, col #888
```

## Mehrere Elemente pro Zeile

Kombiniere beliebige Elemente im Row-Template:

```mirror
$projects: [
  { name: "Website", progress: 75, active: true },
  { name: "App", progress: 30, active: true },
  { name: "API", progress: 100, active: false }
]

Table $projects
  Row: hor, gap 16, pad 12 16, bg #1a1a1a, rad 6
    Icon row.active ? "circle-dot" : "circle", ic row.active ? #10b981 : #666, is 16
    Text row.name, col white, w 100
    Frame w 100, h 6, bg #333, rad 3
      Frame w row.progress + "%", h full, bg #2563eb, rad 3
    Text row.progress + "%", col #888, fs 12, w 40
```

## Editierbare Tabellen

Mit `Input` und `value row.field` werden Zellen editierbar:

```mirror
$items: [
  { name: "Item 1", quantity: 5 },
  { name: "Item 2", quantity: 3 }
]

Table $items
  Row: hor, gap 12, pad 8
    Input value row.name, bg #1a1a1a, col white, pad 8, rad 4, w 150
    Input value row.quantity, bg #1a1a1a, col white, pad 8, rad 4, w 60, type number
```

Änderungen werden automatisch in die Daten zurückgeschrieben (Two-Way Binding).

## Bedingte Styles

Nutze Ternary-Operatoren für bedingte Darstellung:

```mirror
$tasks: [
  { title: "Design", done: true },
  { title: "Development", done: false },
  { title: "Testing", done: false }
]

Table $tasks
  Row: hor, gap 12, pad 12, bg #1a1a1a, rad 6
    Icon row.done ? "check-circle" : "circle", ic row.done ? #10b981 : #666, is 18
    Text row.title, col row.done ? #888 : white, fs 14
```

## Aktionen pro Zeile

Füge Buttons oder klickbare Elemente hinzu:

```mirror
$users: [
  { name: "Anna", email: "anna@example.com" },
  { name: "Max", email: "max@example.com" }
]

Table $users
  Row: hor, spread, ver-center, pad 12 16, bg #1a1a1a, rad 6
    Frame hor, gap 12, ver-center
      Frame w 36, h 36, bg #2563eb, rad 99, center
        Text row.name[0], col white, fs 14
      Frame gap 2
        Text row.name, col white, fs 14
        Text row.email, col #666, fs 12
    Frame hor, gap 8
      Button "Edit", pad 6 12, bg #333, col white, rad 4, fs 12
      Button "Delete", pad 6 12, bg #ef4444, col white, rad 4, fs 12
```

## Praktisch: Task-Liste

Eine vollständige Task-Liste mit Status und Aktionen:

```mirror
$tasks: [
  { title: "Design Homepage", priority: "high", done: false },
  { title: "Write API Docs", priority: "medium", done: true },
  { title: "Fix Login Bug", priority: "high", done: false }
]

$priorityColor: { high: #ef4444, medium: #f59e0b, low: #10b981 }

Table $tasks
  Row: hor, gap 12, pad 12 16, bg #1a1a1a, rad 8, margin 0 0 4 0
    // Checkbox
    Frame w 24, h 24, rad 4, bor 2, boc row.done ? #10b981 : #444, bg row.done ? #10b981 : transparent, center, cursor pointer
      Icon "check", ic white, is 14, hidden row.done ? visible : hidden

    // Content
    Frame gap 4, grow
      Text row.title, col row.done ? #666 : white, fs 14
      Frame hor, gap 8
        Frame pad 2 8, rad 4, bg $priorityColor[row.priority] + "22"
          Text row.priority, col $priorityColor[row.priority], fs 11, uppercase

    // Actions
    Frame hor, gap 4
      Button pad 6, bg transparent, rad 4
        Icon "edit", ic #666, is 16
        hover:
          Icon "edit", ic white, is 16
      Button pad 6, bg transparent, rad 4
        Icon "trash", ic #666, is 16
        hover:
          Icon "trash", ic #ef4444, is 16
```

## Praktisch: Editierbare Produktliste

Eine Tabelle zum Bearbeiten von Produktdaten:

```mirror
$products: [
  { name: "T-Shirt", price: 29.99, stock: 150 },
  { name: "Hoodie", price: 59.99, stock: 45 },
  { name: "Cap", price: 19.99, stock: 200 }
]

Frame bg #111, pad 16, rad 12, gap 12
  // Header
  Frame hor, gap 12, ver-center, pad 8 12
    Text "Produkt", col #888, fs 12, w 150
    Text "Preis", col #888, fs 12, w 80
    Text "Lager", col #888, fs 12, w 60

  // Rows
  Table $products
    Row: hor, gap 12, pad 8 12, bg #1a1a1a, rad 6
      Input value row.name, bg transparent, col white, bor 0, w 150, pad 4
        focus:
          bg #252525
      Frame hor, ver-center, w 80
        Text "€", col #888, fs 14
        Input value row.price, bg transparent, col white, bor 0, w 60, pad 4, type number
          focus:
            bg #252525
      Input value row.stock, bg transparent, col white, bor 0, w 60, pad 4, type number
        focus:
          bg #252525
```

---

## Zusammenfassung

| Syntax | Beschreibung |
|--------|--------------|
| `Table $data` | Datenquelle (Array) |
| `Row:` | Zeilentemplate |
| `row.field` | Feld des aktuellen Eintrags |
| `Input value row.field` | Editierbares Feld |
| `row.done ? "Ja" : "Nein"` | Bedingte Werte |

**Das Prinzip:** Table iteriert über Daten. Der `Row:` Slot definiert das Aussehen jeder Zeile. Mit `row.field` greifst du auf Felder zu, mit `Input value row.field` machst du sie editierbar.
