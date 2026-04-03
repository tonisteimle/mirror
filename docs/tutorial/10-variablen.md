---
title: Variablen & Daten
subtitle: Dynamische Werte und strukturierte Daten
prev: 09-overlays
next: 11-content
---

Variablen und Daten werden mit `name:` definiert und mit `$name` verwendet. Die Syntax ist überall gleich: in `.mir`-Dateien oder in externen `.data`-Dateien.

## Einfache Variablen

Eine Variable wird mit Namen und Wert definiert. Bei der Verwendung steht `$` davor:

```mirror
name: "Max"
count: 42

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "Name: " + $name, col white
  Text "Count: " + $count, col #888
```

**Die Regel:** Definition ohne `$`, Verwendung mit `$`.

## In Text verwenden

Variablen können direkt oder in Expressions verwendet werden:

```mirror
firstName: "Max"
lastName: "Mustermann"

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text $firstName, col white, fs 18
  Text $firstName + " " + $lastName, col #888
  Text "Hallo, " + $firstName + "!", col #10b981
```

## Arithmetik

```mirror
price: 29
quantity: 3

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "Preis: $" + $price, col white
  Text "Menge: " + $quantity, col #888
  Text "Total: $" + ($price * $quantity), col #10b981, weight 600
```

## Arrays und each

Iteriere über Listen mit `each`:

```mirror
each color in ["Rot", "Grün", "Blau"]
  Frame bg #1a1a1a, pad 12, rad 6, margin 0 0 4 0
    Text color, col white
```

Mit Index:

```mirror
each item, index in ["Erster", "Zweiter", "Dritter"]
  Text (index + 1) + ". " + item, col white, pad 4
```

## Objekt-Arrays

Arrays mit strukturierten Daten:

```mirror
users: [
  { name: "Max", role: "Admin" },
  { name: "Anna", role: "User" },
  { name: "Tom", role: "User" }
]

each user in $users
  Frame hor, gap 12, bg #1a1a1a, pad 12, rad 6, margin 0 0 4 0
    Text user.name, col white, weight 500
    Text user.role, col #888, fs 12
```

## Datenobjekte

Für strukturierte Daten mit mehreren Attributen: Definiere ein Datenobjekt mit Einrückung:

```mirror
user:
  name: "Max Mustermann"
  email: "max@example.com"
  active: true

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text $user.name, col white, weight 500
  Text $user.email, col #888
  Text $user.active ? "Aktiv" : "Inaktiv", col #10b981
```

### Attribut-Typen

Datenobjekte unterstützen verschiedene Werttypen:

```mirror
profile:
  name: "Max"
  age: 25
  premium: true
  tags: [admin, developer, tester]

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text $profile.name, col white
  Text "Alter: " + $profile.age, col #888
  Text $profile.premium ? "Premium" : "Free", col #10b981
```

| Typ | Beispiel |
|-----|----------|
| String | `name: "Max"` |
| Zahl | `age: 25` |
| Boolean | `active: true` |
| Array | `tags: [a, b, c]` |

## Verschachtelte Datenobjekte

Datenobjekte können beliebig tief verschachtelt werden:

```mirror
method:
  name: "Agile"
  steps:
    planning:
      title: "Sprint Planning"
      duration: "2h"
    standup:
      title: "Daily Standup"
      duration: "15min"
    retro:
      title: "Retrospektive"
      duration: "1h"

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text $method.name, col white, fs 18, weight 600
  Frame gap 4, margin 8 0 0 0
    each step in $method.steps
      Frame hor, gap 8
        Text step.title, col white
        Text step.duration, col #888
```

Jedes verschachtelte Objekt hat einen Namen und ist direkt adressierbar: `$method.steps.planning.title`

## Externe Daten: .data-Dateien

Für größere Datenmengen oder Wiederverwendung: Daten in `.data`-Dateien auslagern. **Die Syntax ist identisch** – nur in einer separaten Datei:

```
// data/customers.data

max:
  name: Max Mustermann
  email: max@example.com
  plan: Pro

anna:
  name: Anna Schmidt
  email: anna@example.com
  plan: Basic
```

In Mirror mit `$dateiname.eintrag.attribut` zugreifen:

```mirror-static
Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text $customers.max.name, col white, weight 500
  Text $customers.max.email, col #888
  Text $customers.max.plan, col #2563eb
```

## Über Einträge iterieren

Mit `each` über alle Einträge einer `.data`-Datei:

```mirror-static
each customer in $customers
  Frame hor, spread, bg #1a1a1a, pad 12, rad 6, margin 0 0 4 0
    Frame gap 2
      Text customer.name, col white, weight 500
      Text customer.email, col #888, fs 12
    Text customer.plan, col #2563eb, fs 12
```

## Relationen

Daten können auf andere Daten verweisen. Eine Referenz ist ein Pfad mit `$`:

```
// data/users.data

toni:
  name: Toni Steimle
  role: Lead

anna:
  name: Anna Schmidt
  role: Design
```

```
// data/tasks.data

task1:
  title: Design Review
  assignee: $users.toni

task2:
  title: Wireframes
  assignee: $users.anna
```

**Zugriff durch die Relation:**

```mirror-static
Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text $tasks.task1.title, col white, weight 500
  Text "Zuständig: " + $tasks.task1.assignee.name, col #888
```

`$tasks.task1.assignee` ist der User `$users.toni`. Mit `.name` greifst du auf dessen Attribute zu.

### N-zu-N Relationen

Für viele-zu-viele Beziehungen: Arrays von Referenzen:

```
// data/projects.data

website:
  name: Website Relaunch
  members: $users.toni, $users.anna
  lead: $users.toni
```

```mirror-static
Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text $projects.website.name, col white, weight 500
  Text "Lead: " + $projects.website.lead.name, col #888
  Frame gap 4, margin 8 0 0 0
    Text "Team:", col #666, fs 12
    each member in $projects.website.members
      Text "• " + member.name, col #888, fs 13
```

## Praktisch: Produktliste

```mirror
products: [
  { name: "Basic", price: 9, features: "5 Users" },
  { name: "Pro", price: 29, features: "Unlimited" },
  { name: "Enterprise", price: 99, features: "Custom" }
]

Frame hor, gap 12
  each product in $products
    Frame bg #1a1a1a, pad 20, rad 12, gap 8, w 140, center
      Text product.name, col white, fs 16, weight 600
      Text "$" + product.price, col #2563eb, fs 24, weight 700
      Text product.features, col #888, fs 12
```

---

## Zusammenfassung

| Konzept | Syntax |
|---------|--------|
| Variable definieren | `name: "Wert"` |
| Datenobjekt | `user:` + Einrückung |
| Verschachtelt | `steps:` + eingerückte Objekte |
| Attribut | `  name: "Max"` |
| Variable verwenden | `$name` |
| Attribut verwenden | `$user.name` |
| Verschachtelt verwenden | `$method.steps.planning.title` |
| Concatenation | `"Hallo " + $name` |
| Arithmetik | `$a * $b` |
| Array | `["a", "b", "c"]` |
| Objekt-Array | `[{ key: "value" }]` |
| Iteration | `each item in $list` |
| Mit Index | `each item, index in $list` |
| .data-Datei | `$datei.eintrag.attribut` |
| Relation (N:1) | `assignee: $users.toni` |
| Relation (N:N) | `members: $users.toni, $users.anna` |
| Durch Relation | `$tasks.task1.assignee.name` |

**Die Regel:** Definition mit `name:`, Verwendung mit `$name`.
