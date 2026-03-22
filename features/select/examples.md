# Select Beispiele

Vollständige Beispiele mit Custom Styling.

## Basis Select

```mirror
Select placeholder "Wähle ein Land..."

  Trigger:
    hor, spread, gap 8
    pad 12 16, bg #1e1e2e, rad 8
    bor 1 #333, col #ccc
    hover: bor 1 #555
    focus: bor 1 #3B82F6

  Icon:
    "chevron-down", size 16, col #888
    open: rotate 180

  Content:
    bg #1e1e2e, rad 8, shadow lg
    bor 1 #333, pad 4
    maxh 240, scroll

  Item:
    pad 10 12, rad 4
    col #ccc, cursor pointer
    hover: bg #2a2a3e
    highlighted: bg #2a2a3e
    selected: bg #3B82F6, col white
    disabled: col #666, cursor not-allowed

  Item "Deutschland"
  Item "Österreich"
  Item "Schweiz"
```

## MultiSelect mit Pills

```mirror
Select multiple, placeholder "Länder wählen..."

  Trigger:
    hor, wrap, gap 6
    pad 8 12, bg #1e1e2e, rad 8
    bor 1 #333, minh 44
    focus: bor 1 #3B82F6

  Pill:
    hor, gap 4
    pad 4 8, bg #3B82F6, rad 12
    col white, fs 13

  PillRemove:
    size 14, col white, opacity 0.7
    hover: opacity 1

  Content:
    bg #1e1e2e, rad 8, shadow lg
    pad 4

  Item:
    hor, gap 8
    pad 10 12, rad 4
    col #ccc
    hover: bg #2a2a3e

  Checkbox:
    size 16, rad 4, bor 1 #555
    selected: bg #3B82F6, bor 0

  Item "Deutschland"
  Item "Österreich"
  Item "Schweiz"
  Item "Frankreich"
  Item "Italien"
```

## Searchable Select

```mirror
Select searchable, placeholder "Land suchen..."

  Trigger:
    hor, spread
    pad 12, bg #1e1e2e, rad 8
    bor 1 #333

  Input:
    bg transparent, col white
    placeholder-col #666

  Icon:
    "search", size 16, col #666

  ClearButton:
    size 16, col #888
    hover: col white

  Content:
    bg #1e1e2e, rad 8, shadow lg
    pad 4

  Item:
    pad 10 12, rad 4, col #ccc
    hover: bg #2a2a3e
    highlighted: bg #2a2a3e
    selected: bg #3B82F6, col white

  Empty:
    pad 20, center
    col #666, fs 14
    Text "Keine Ergebnisse"

  Item "Deutschland"
  Item "Österreich"
  Item "Schweiz"
```

## Gruppiert mit Labels

```mirror
Select placeholder "Wähle..."

  Trigger:
    pad 12 16, bg #1e1e2e, rad 8
    bor 1 #333, col #ccc

  Content:
    bg #1e1e2e, rad 8, shadow lg
    pad 4, maxh 300, scroll

  GroupLabel:
    pad 8 12, col #888
    fs 11, uppercase, weight semibold

  Item:
    pad 10 12, rad 4, col #ccc
    hover: bg #2a2a3e
    selected: bg #3B82F6, col white

  Divider:
    h 1, bg #333, margin 4 0

  Group "Europa"
    Item "Deutschland"
    Item "Österreich"
    Item "Schweiz"

  Group "Nordamerika"
    Item "USA"
    Item "Kanada"
```

## Mit Value/Label und Icons

```mirror
Select placeholder "Status wählen..."

  Trigger:
    hor, gap 8
    pad 12 16, bg #1e1e2e, rad 8
    bor 1 #333

  SelectedIcon:
    size 16

  Content:
    bg #1e1e2e, rad 8, shadow lg
    w 200, pad 4

  Item:
    hor, gap 10
    pad 10 12, rad 4, col #ccc
    hover: bg #2a2a3e
    selected: bg #3B82F6, col white

  ItemIcon:
    size 16

  Item value "draft", label "Entwurf", icon "file"
  Item value "review", label "In Prüfung", icon "eye"
  Item value "published", label "Veröffentlicht", icon "check"
  Item value "archived", label "Archiviert", icon "archive"
```

## Item mit Unterstruktur

### User-Select

```mirror
Select placeholder "Benutzer wählen..."

  Trigger:
    pad 12, bg #1e1e2e, rad 8
    bor 1 #333

  Content:
    bg #1e1e2e, shadow lg, rad 8
    pad 4

  Item:
    hor, gap 12, pad 10 12, rad 4
    hover: bg #2a2a3e
    selected: bg #3B82F6

    Avatar:
      size 32, rad full

    Info:
      ver, gap 2

      Name:
        col white, weight medium

      Email:
        col #888, fs 12

  Item
    Avatar src "alice.jpg"
    Info
      Name "Alice Schmidt"
      Email "alice@example.com"

  Item
    Avatar src "bob.jpg"
    Info
      Name "Bob Müller"
      Email "bob@example.com"
```

### Status-Select mit Badge

```mirror
Select placeholder "Status..."

  Trigger:
    pad 12, bg #1e1e2e, rad 8
    bor 1 #333

  Content:
    bg #1e1e2e, shadow lg, rad 8
    w 200, pad 4

  Item:
    hor, spread, pad 10 12, rad 4
    hover: bg #2a2a3e
    selected: bg #3B82F6

    Left:
      hor, gap 8

      Dot:
        size 8, rad full

      Label:
        col #ccc

    Badge:
      pad 2 8, rad 12, fs 11

  Item
    Left
      Dot bg #22c55e
      Label "Online"
    Badge bg #22c55e20, col #22c55e
      "3"

  Item
    Left
      Dot bg #eab308
      Label "Abwesend"
    Badge bg #eab30820, col #eab308
      "1"

  Item
    Left
      Dot bg #888
      Label "Offline"
```

## Slots Übersicht

| Slot | Beschreibung |
|------|--------------|
| `Trigger` | Der Button/Input der das Dropdown öffnet |
| `Icon` | Chevron-Icon im Trigger |
| `Input` | Suchfeld (bei searchable) |
| `ClearButton` | X zum Leeren |
| `Content` | Dropdown-Container |
| `Item` | Einzelne Option |
| `ItemIcon` | Icon in Option |
| `Checkbox` | Checkbox in Option (bei multiple) |
| `Pill` | Ausgewählte Items als Tags (bei multiple) |
| `PillRemove` | X in Pill |
| `Group` | Gruppen-Container |
| `GroupLabel` | Gruppen-Überschrift |
| `Divider` | Trennlinie |
| `Empty` | "Keine Ergebnisse" |
| `SelectedIcon` | Icon des gewählten Items im Trigger |
