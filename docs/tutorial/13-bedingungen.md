---
title: Bedingte Anzeige
subtitle: Elemente basierend auf Bedingungen ein- und ausblenden
prev: 12-tabellen
next: 14-pages
---

Manchmal soll ein Element nur unter bestimmten Bedingungen angezeigt werden. Mirror bietet zwei Syntaxen: **Block Conditionals** für ganze Elemente und **Inline Conditionals** für Property-Werte.

## Block Conditionals: if / else

Mit `if` zeigst du Elemente nur an, wenn eine Bedingung erfüllt ist:

```mirror
loggedIn: true

if loggedIn
  Text "Willkommen zurück!", col white
```

### if / else

Mit `else` definierst du eine Alternative:

```mirror
loggedIn: false

if loggedIn
  Text "Willkommen zurück!", col white
else
  Button "Anmelden", bg #2563eb, col white, pad 10 20, rad 6
```

### Mehrere Elemente

Ein `if`-Block kann mehrere Kinder haben:

```mirror
showDetails: true

Frame bg #1a1a1a, pad 16, rad 8, gap 8
  Text "Produkt", col white, fs 16, weight 500
  if showDetails
    Text "Beschreibung des Produkts", col #888, fs 13
    Text "Preis: €29", col #10b981, fs 14
    Button "Kaufen", bg #2563eb, col white, pad 8 16, rad 4
```

## Komplexe Bedingungen

Du kannst JavaScript-Ausdrücke verwenden:

### Logische Operatoren

```mirror
isAdmin: true
hasPermission: true

if isAdmin && hasPermission
  Frame bg #1a1a1a, pad 16, rad 8
    Text "Admin Panel", col white, fs 16, weight 500
    Text "Voller Zugriff", col #10b981, fs 12
```

### Vergleiche

```mirror
count: 5

Frame bg #1a1a1a, pad 16, rad 8, gap 8
  if count > 0
    Text count + " Artikel im Warenkorb", col white
  else
    Text "Warenkorb ist leer", col #888
```

### Negation

```mirror
disabled: false

if !disabled
  Button "Absenden", bg #2563eb, col white, pad 10 20, rad 6
```

### Kombiniert

```mirror
user:
  role: "admin"
feature:
  enabled: true

if user.role === "admin" && feature.enabled
  Text "Feature aktiv", col #10b981
```

## Verschachtelte Bedingungen

`if`-Blöcke können verschachtelt werden:

```mirror
hasData: true
isLoading: false

if hasData
  if isLoading
    Frame hor, gap 8, center
      Icon "loader", ic #888, is 16
      Text "Lädt...", col #888
  else
    Text "Daten geladen!", col #10b981
else
  Text "Keine Daten", col #888
```

## if mit each kombinieren

Conditionals und Loops arbeiten zusammen:

```mirror
tasks: [{ title: "Task 1", done: true }, { title: "Task 2", done: false }, { title: "Task 3", done: true }]

Frame bg #1a1a1a, pad 16, rad 8, gap 8
  each task in $tasks
    Frame hor, gap 8, ver-center, pad 8, bg #252525, rad 4
      if task.done
        Icon "check", ic #10b981, is 16
      else
        Icon "circle", ic #666, is 16
      Text task.title, col white, fs 13
```

## Inline Conditionals (Ternary)

Für einzelne Property-Werte gibt es die Kurzschreibweise mit `?` und `:`:

```mirror
active: true

Button "Status", bg active ? #2563eb : #333, col white, pad 10 20, rad 6
```

Das entspricht: "Wenn `active` wahr ist, nimm `#2563eb`, sonst `#333`."

### Weitere Beispiele

```mirror
visible: true
done: false
count: 3

Frame gap 12, bg #0a0a0a, pad 16, rad 8
  // Opacity basierend auf Sichtbarkeit
  Frame w 100, h 50, bg #2563eb, rad 6, opacity visible ? 1 : 0.3

  // Icon basierend auf Status
  Frame hor, gap 8, ver-center, bg #1a1a1a, pad 12, rad 6
    Icon done ? "check" : "circle", ic done ? #10b981 : #666, is 18
    Text "Aufgabe", col white

  // Text basierend auf Anzahl
  Text count > 0 ? count + " Einträge" : "Keine Einträge", col #888
```

### Mit Variablen

```mirror
theme: "dark"
primary.bg: #2563eb
muted.bg: #333

Button "Themed", bg theme === "dark" ? $primary : $muted, col white, pad 10 20, rad 6
```

## Block vs. Inline

| Syntax | Verwendung |
|--------|------------|
| `if` / `else` Block | Ganze Elemente ein-/ausblenden |
| `condition ? a : b` | Einzelne Property-Werte |

**Faustregel:**
- Soll ein Element komplett erscheinen/verschwinden? → `if` Block
- Soll nur eine Farbe, Größe, Icon wechseln? → Ternary

## Praktisch: Leerer Zustand

Ein typisches Pattern - zeige Inhalt oder "Empty State":

```mirror
items: []

Frame bg #1a1a1a, pad 20, rad 12, gap 12, w 280, center
  if items.length > 0
    each item in $items
      Text item, col white
  else
    Icon "inbox", ic #444, is 48
    Text "Keine Einträge", col #666, fs 14
    Text "Füge deinen ersten Eintrag hinzu", col #444, fs 12
```

## Praktisch: Ladeindikator

```mirror
loading: true
data: "Inhalt geladen"

Frame bg #1a1a1a, pad 20, rad 12, w 200, center
  if loading
    Frame hor, gap 8, ver-center
      Icon "loader", ic #888, is 18
      Text "Lädt...", col #888
  else
    Text $data, col white
```

## Praktisch: Benutzer-Status

```mirror
user:
  loggedIn: true
  name: "Max"
  avatar: ""

Frame hor, gap 12, ver-center, bg #1a1a1a, pad 12, rad 8
  if user.loggedIn
    Frame hor, gap 10, ver-center
      Frame w 36, h 36, rad 99, bg #2563eb, center
        Text user.avatar ? user.avatar : user.name[0], col white, fs 14
      Frame gap 2
        Text user.name, col white, fs 14, weight 500
        Text "Online", col #10b981, fs 11
  else
    Button "Anmelden", bg #2563eb, col white, pad 8 16, rad 6
```

---

## Zusammenfassung

| Syntax | Beispiel |
|--------|----------|
| `if bedingung` | `if loggedIn` |
| `if ... else` | `if count > 0 ... else` |
| `&&`, `\|\|`, `!` | `if isAdmin && hasAccess` |
| `===`, `>`, `<` | `if status === "active"` |
| Ternary | `bg active ? #2563eb : #333` |

**Block Conditionals** für Elemente, **Inline Conditionals** für Properties.
