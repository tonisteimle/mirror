# Select Syntax

## Prinzip: Definition vs. Verwendung

Mirror trennt **Definition** (komplex, einmalig) von **Verwendung** (simpel, überall).

```
┌─────────────────────────────────────────────────┐
│ Definition     │  Komplex, aber nur einmal     │
├─────────────────────────────────────────────────┤
│ Verwendung     │  Simpel, überall              │
└─────────────────────────────────────────────────┘
```

## Kompositions-Schichten

### Schicht 1: Basis-Bausteine

Kleine, wiederverwendbare Elemente.

```mirror
// Einmal definiert, überall genutzt
Avatar as Image:
  size 32, rad full, clip

StatusDot as Box:
  size 8, rad full

Badge as Box:
  pad 2 8, rad 12, fs 11
```

### Schicht 2: Item-Layouts

Kombinieren Basis-Bausteine zu Item-Strukturen.

```mirror
UserItem as Item:
  hor, gap 12, pad 10 12

  Avatar:
  Info:
    ver, gap 2
    Name: weight medium
    Role: col #888, fs 12

StatusItem as Item:
  hor, gap 8, pad 8 12

  StatusDot:
  Label:
```

### Schicht 3: Fertige Selects

Kombinieren Select mit Item-Layouts.

```mirror
UserSelect as Select:
  placeholder "Benutzer wählen..."

  Trigger:
    pad 12, bg surface

  Content:
    bg surface, shadow lg

  UserItem:                          // Referenz auf Schicht 2
    hover: bg hover
    selected: bg primary

StatusSelect as Select:
  w 160

  Trigger:
    pad 8 12, bg surface

  Content:
    bg surface, shadow lg

  StatusItem:                        // Referenz auf Schicht 2
    hover: bg hover
    selected: bg primary
```

### Schicht 4: Verwendung

Maximal einfach.

```mirror
// User-Select verwenden
UserSelect
  UserItem Avatar "alice.jpg"; Name "Alice"; Role "Designer"
  UserItem Avatar "bob.jpg"; Name "Bob"; Role "Developer"
  UserItem Avatar "clara.jpg"; Name "Clara"; Role "Manager"

// Status-Select verwenden
StatusSelect
  StatusItem StatusDot bg #22c55e; Label "Online"
  StatusItem StatusDot bg #eab308; Label "Abwesend"
  StatusItem StatusDot bg #888; Label "Offline"

// Oder mit Daten
UserSelect data users
StatusSelect data statuses
```

## Der Effekt

| Schicht | Zeilen | Häufigkeit |
|---------|--------|------------|
| Basis-Bausteine | 5-10 je | Einmal im Design System |
| Item-Layouts | 5-10 je | Einmal pro Pattern |
| Fertige Selects | 3-5 je | Einmal pro Anwendungsfall |
| **Verwendung** | **1-3** | **Überall** |

Jede Schicht baut auf der vorherigen auf. Keine Schicht ist komplex, weil sie nur das Neue definiert.

## Beispiele

### Einfaches Select

**Definition:**
```mirror
SimpleSelect as Select:
  Trigger: pad 12, bg surface, rad 8, bor 1 #333
  Content: bg surface, shadow lg, rad 8
  Item: pad 8 12, hover: bg hover, selected: bg primary
```

**Verwendung:**
```mirror
SimpleSelect placeholder "Wähle..."
  Item "Option A"
  Item "Option B"
  Item "Option C"
```

### User-Select mit Avatar

**Basis-Bausteine:**
```mirror
Avatar as Image:
  size 32, rad full, clip
```

**Item-Layout:**
```mirror
UserItem as Item:
  hor, gap 12, pad 10 12, rad 4

  Avatar:

  Info:
    ver, gap 2
    Name: weight medium
    Role: col #888, fs 12
```

**Select-Definition:**
```mirror
UserSelect as Select:
  placeholder "Benutzer wählen..."

  Trigger:
    hor, gap 8
    pad 12, bg #1e1e2e, rad 8
    bor 1 #333

  Content:
    bg #1e1e2e, rad 8, shadow lg
    pad 4, maxh 240, scroll

  UserItem:
    hover: bg #2a2a3e
    selected: bg #3B82F6
```

**Verwendung:**
```mirror
UserSelect
  UserItem Avatar "alice.jpg"; Name "Alice Schmidt"; Role "Designer"
  UserItem Avatar "bob.jpg"; Name "Bob Müller"; Role "Developer"
```

### Status-Select mit Farbpunkten

**Basis-Bausteine:**
```mirror
StatusDot as Box:
  size 8, rad full
```

**Item-Layout:**
```mirror
StatusItem as Item:
  hor, gap 8, pad 8 12

  StatusDot:
  Label:
```

**Select-Definition:**
```mirror
StatusSelect as Select:
  w 160

  Trigger:
    hor, gap 8
    pad 8 12, bg surface, rad 6
    bor 1 #333

  Content:
    bg surface, shadow lg, rad 8

  StatusItem:
    hover: bg hover
    selected: bg primary
```

**Verwendung:**
```mirror
StatusSelect
  StatusItem StatusDot bg #22c55e; Label "Online"
  StatusItem StatusDot bg #eab308; Label "Abwesend"
  StatusItem StatusDot bg #888; Label "Offline"
```

### Country-Select mit Icons

**Item-Layout:**
```mirror
CountryItem as Item:
  hor, gap 10, pad 10 12

  Flag:
    size 20

  Name:
```

**Select-Definition:**
```mirror
CountrySelect as Select:
  searchable
  placeholder "Land suchen..."

  Trigger:
    hor, gap 8, pad 12, bg surface, rad 8

  Input:
    bg transparent

  Content:
    bg surface, shadow lg, rad 8
    maxh 200, scroll

  CountryItem:
    hover: bg hover
    selected: bg primary

  Empty:
    pad 20, center, col #888
    Text "Kein Land gefunden"
```

**Verwendung:**
```mirror
CountrySelect
  CountryItem Flag "🇩🇪"; Name "Deutschland"
  CountryItem Flag "🇦🇹"; Name "Österreich"
  CountryItem Flag "🇨🇭"; Name "Schweiz"
```

## Zusammenfassung

**Komplexität in der Definition verstecken, Einfachheit bei der Verwendung garantieren.**

- Änderst du `Avatar`, ändert sich alles was `Avatar` nutzt
- Änderst du `UserItem`, ändern sich alle `UserSelect`
- Die Verwendung bleibt immer 1-3 Zeilen

Das ist die Power von Mirror - nicht nur UI beschreiben, sondern ein **Design System** bauen.
