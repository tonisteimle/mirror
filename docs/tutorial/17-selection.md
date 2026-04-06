---
title: Selection & Menus
subtitle: Select, Combobox, Listbox und Menu-Varianten
prev: 16-form-controls
next: 18-datetime
---

Komponenten zur Auswahl aus Listen. **Select** ist das klassische Dropdown. **Combobox** erlaubt Suche/Filterung. **Listbox** zeigt alle Optionen direkt. Die **Menu**-Familie bietet kontextuelle Aktionen.

## Select

Ein Dropdown zur Auswahl eines oder mehrerer Werte.

```mirror
Select placeholder "Wähle eine Option..."
  Trigger: hor, spread, ver-center, bg #1a1a1a, bor 1, boc #333, pad 12, rad 8, w 200, cursor pointer
    Text placeholder, col #888
    Icon "chevron-down", ic #666, is 16
    open:
      Icon "chevron-up", ic #666, is 16
  Content: bg #1a1a1a, rad 8, pad 4, shadow lg, w 200
  Item: pad 10 12, rad 4, col white, cursor pointer
    hover:
      bg #333
    selected:
      bg #2563eb

  Option "Berlin", value "berlin"
  Option "Hamburg", value "hamburg"
  Option "München", value "munich"
  Option "Köln", value "cologne"
```

### Mit Icons

```mirror
Select placeholder "Status wählen..."
  Trigger: hor, spread, ver-center, bg #1a1a1a, bor 1, boc #333, pad 12, rad 8, w 220
  Content: bg #1a1a1a, rad 8, pad 4, shadow lg
  Item: hor, gap 10, pad 10 12, rad 4, col white, cursor pointer
    hover:
      bg #333

  Option icon "circle", value "todo"
    "Todo"
  Option icon "loader", value "progress"
    "In Progress"
  Option icon "check-circle", value "done"
    "Done"
```

### Multi-Select

```mirror
Select placeholder "Tags wählen...", multiple
  Trigger: hor, wrap, gap 8, bg #1a1a1a, bor 1, boc #333, pad 12, rad 8, w 280
  Pill: hor, gap 4, bg #333, pad 4 8, rad 4
    PillText: col white, fs 12
    PillRemove: col #888, cursor pointer
      Icon "x", is 12
  Content: bg #1a1a1a, rad 8, pad 4, shadow lg
  Item: pad 10 12, rad 4, col white, cursor pointer
    hover:
      bg #333
    selected:
      bg #2563eb

  Option "React", value "react"
  Option "Vue", value "vue"
  Option "Angular", value "angular"
  Option "Svelte", value "svelte"
```

### Mit Suche

```mirror
Select placeholder "Land suchen...", searchable
  Trigger: hor, spread, ver-center, bg #1a1a1a, bor 1, boc #333, pad 12, rad 8, w 240
  Input: bg transparent, col white, bor 0, w full
  Content: bg #1a1a1a, rad 8, pad 4, shadow lg
  Item: pad 10 12, rad 4, col white, cursor pointer
    hover:
      bg #333
  Empty: pad 20, col #888, text-align center
    "Keine Ergebnisse"

  Option "Deutschland", value "de"
  Option "Österreich", value "at"
  Option "Schweiz", value "ch"
```

### Mit Gruppen

```mirror
Select placeholder "Wähle..."
  Trigger: hor, spread, ver-center, bg #1a1a1a, bor 1, boc #333, pad 12, rad 8, w 200
  Content: bg #1a1a1a, rad 8, pad 4, shadow lg
  Group: margin 8 0 0 0
  GroupLabel: pad 8 12, col #666, fs 11, uppercase
  Item: pad 10 12, rad 4, col white, cursor pointer
    hover:
      bg #333

  Group "Europa"
    Option "Deutschland", value "de"
    Option "Frankreich", value "fr"
  Group "Asien"
    Option "Japan", value "jp"
    Option "Korea", value "kr"
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `value` | string \| string[] | Ausgewählter Wert |
| `defaultValue` | string \| string[] | Startwert |
| `placeholder` | string | Platzhalter |
| `multiple` | boolean | Mehrfachauswahl |
| `searchable` | boolean | Suche aktivieren |
| `clearable` | boolean | Clear-Button |
| `disabled` | boolean | Deaktiviert |
| `closeOnSelect` | boolean | Nach Auswahl schließen |
| `positioning` | string | Positionierung |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Trigger:` | Der klickbare Button |
| `Content:` | Das Dropdown |
| `Item:` | Einzelne Option |
| `ItemIndicator:` | Häkchen bei Auswahl |
| `Group:` | Optionsgruppe |
| `GroupLabel:` | Gruppen-Titel |
| `Input:` | Suchfeld (bei searchable) |
| `Empty:` | "Keine Ergebnisse" |
| `Pill:` | Tag bei Multi-Select |
| `PillRemove:` | Löschen-Button am Tag |
| `ClearButton:` | Alles löschen |

---

## Combobox

Select mit Autocomplete – der User kann tippen und filtern.

```mirror
Combobox placeholder "Suche..."
  Root: gap 4
  Label: col #888, fs 12
    "Framework"
  Control: hor, bg #1a1a1a, bor 1, boc #333, rad 8
  Input: w full, bg transparent, col white, pad 12, bor 0
  Trigger: pad 12, col #666
    Icon "chevron-down", is 16
  Content: bg #1a1a1a, rad 8, pad 4, shadow lg, margin 4 0 0 0
  Item: pad 10 12, rad 4, col white, cursor pointer
    hover:
      bg #333
    selected:
      bg #2563eb
  ItemIndicator: margin 0 0 0 auto
    Icon "check", ic #2563eb, is 16
  Empty: pad 20, col #888, text-align center
    "Keine Treffer"

  Option "React", value "react"
  Option "Vue", value "vue"
  Option "Angular", value "angular"
  Option "Svelte", value "svelte"
  Option "Solid", value "solid"
```

### Mit Custom Values

```mirror
Combobox placeholder "Eingabe oder Auswahl...", allowCustomValue
  Control: hor, bg #1a1a1a, bor 1, boc #333, rad 8
  Input: w full, bg transparent, col white, pad 12, bor 0
  Content: bg #1a1a1a, rad 8, pad 4, shadow lg
  Item: pad 10 12, rad 4, col white, cursor pointer
    hover:
      bg #333

  Option "Rot", value "red"
  Option "Grün", value "green"
  Option "Blau", value "blue"
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `value` | string | Ausgewählter Wert |
| `defaultValue` | string | Startwert |
| `placeholder` | string | Platzhalter |
| `allowCustomValue` | boolean | Freie Eingabe erlaubt |
| `autoFocus` | boolean | Auto-Fokus |
| `disabled` | boolean | Deaktiviert |
| `openOnChange` | boolean | Bei Eingabe öffnen |
| `loopFocus` | boolean | Tastatur-Loop |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Label:` | Label |
| `Control:` | Input-Container |
| `Input:` | Das Textfeld |
| `Trigger:` | Dropdown-Button |
| `Content:` | Das Dropdown |
| `Item:` | Einzelne Option |
| `ItemText:` | Option-Text |
| `ItemIndicator:` | Häkchen |
| `Empty:` | Keine Ergebnisse |
| `ClearTrigger:` | Löschen-Button |

---

## Listbox

Alle Optionen sind sichtbar – keine Dropdown-Öffnung nötig.

```mirror
Listbox defaultValue "home"
  Root: gap 4
  Label: col #888, fs 12
    "Navigation"
  Content: bg #1a1a1a, rad 8, pad 4, w 200
  Item: hor, gap 10, pad 10 12, rad 4, col #888, cursor pointer
    hover:
      bg #252525
    selected:
      bg #2563eb
      col white

  ListboxItem icon "home", value "home"
    "Dashboard"
  ListboxItem icon "folder", value "projects"
    "Projekte"
  ListboxItem icon "settings", value "settings"
    "Einstellungen"
```

### Multi-Select Listbox

```mirror
Listbox multiple
  Content: bg #1a1a1a, rad 8, pad 4, w 200
  Item: hor, gap 10, pad 10 12, rad 4, col white, cursor pointer
    hover:
      bg #252525
  ItemIndicator: margin 0 0 0 auto
    Icon "check", ic #2563eb, is 16

  ListboxItem "Option A", value "a"
  ListboxItem "Option B", value "b"
  ListboxItem "Option C", value "c"
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `value` | string \| string[] | Ausgewählter Wert |
| `defaultValue` | string \| string[] | Startwert |
| `multiple` | boolean | Mehrfachauswahl |
| `disabled` | boolean | Deaktiviert |
| `orientation` | "horizontal" \| "vertical" | Ausrichtung |
| `loopFocus` | boolean | Tastatur-Loop |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Label:` | Label |
| `Content:` | Listen-Container |
| `Item:` | Einzelne Option |
| `ItemText:` | Option-Text |
| `ItemIndicator:` | Auswahl-Indikator |
| `ItemGroup:` | Optionsgruppe |
| `ItemGroupLabel:` | Gruppen-Titel |

---

## Menu

Dropdown-Menü für Aktionen – öffnet bei Klick.

```mirror
Menu
  Trigger: Button "Aktionen", pad 10 16, bg #1a1a1a, col white, rad 6
    Icon "chevron-down", is 16, margin 0 0 0 8
  Content: bg #1a1a1a, rad 8, pad 4, shadow lg, w 180
  Item: pad 10 12, rad 4, col white, cursor pointer
    hover:
      bg #333
  Separator: h 1, bg #333, margin 4 0

  Item "Bearbeiten"
    Icon "edit", ic #888, is 16, margin 0 8 0 0
  Item "Duplizieren"
    Icon "copy", ic #888, is 16, margin 0 8 0 0
  Separator
  Item "Löschen", col #ef4444
    Icon "trash", ic #ef4444, is 16, margin 0 8 0 0
```

### Mit Gruppen

```mirror
Menu
  Trigger: Button "Menü", pad 10 16, bg #333, col white, rad 6
  Content: bg #1a1a1a, rad 8, pad 4, shadow lg, w 200
  ItemGroup: margin 8 0 0 0
  ItemGroupLabel: pad 8 12, col #666, fs 11, uppercase
  Item: pad 10 12, rad 4, col white, cursor pointer
    hover:
      bg #333

  ItemGroup "Datei"
    Item "Neu"
    Item "Öffnen"
    Item "Speichern"
  ItemGroup "Bearbeiten"
    Item "Rückgängig"
    Item "Wiederholen"
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `disabled` | boolean | Deaktiviert |
| `closeOnSelect` | boolean | Nach Klick schließen |
| `loopFocus` | boolean | Tastatur-Loop |
| `positioning` | string | Positionierung |
| `typeahead` | boolean | Tippen zum Suchen |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Trigger:` | Auslöser-Button |
| `Content:` | Das Menü |
| `Item:` | Menüpunkt |
| `ItemGroup:` | Gruppe |
| `ItemGroupLabel:` | Gruppen-Titel |
| `Separator:` | Trennlinie |
| `Arrow:` | Pfeil zum Trigger |

---

## ContextMenu

Rechtsklick-Menü – öffnet bei Rechtsklick auf den Trigger-Bereich.

```mirror
ContextMenu
  Trigger: Frame w 300, h 150, bg #1a1a1a, rad 8, center
    Text "Rechtsklick hier", col #888
  Content: bg #1a1a1a, rad 8, pad 4, shadow lg, w 180
  Item: pad 10 12, rad 4, col white, cursor pointer
    hover:
      bg #333

  Item "Ausschneiden"
    Frame hor, spread, w full
      Text "Ausschneiden"
      Text "⌘X", col #666, fs 12
  Item "Kopieren"
    Frame hor, spread, w full
      Text "Kopieren"
      Text "⌘C", col #666, fs 12
  Item "Einfügen"
    Frame hor, spread, w full
      Text "Einfügen"
      Text "⌘V", col #666, fs 12
```

Props und Slots wie Menu.

---

## NestedMenu

Menü mit Untermenüs – für komplexe Navigationsstrukturen.

```mirror
NestedMenu
  Trigger: Button "Datei", pad 10 16, bg #333, col white, rad 6
  Content: bg #1a1a1a, rad 8, pad 4, shadow lg, w 200
  Item: pad 10 12, rad 4, col white, cursor pointer
    hover:
      bg #333
  SubmenuTrigger: pad 10 12, rad 4, col white, cursor pointer
    hover:
      bg #333
  SubmenuContent: bg #1a1a1a, rad 8, pad 4, shadow lg, w 180

  Item "Neu"
  Item "Öffnen"
  Submenu "Zuletzt geöffnet"
    Item "Dokument 1.pdf"
    Item "Dokument 2.pdf"
    Item "Bild.png"
  Separator
  Item "Schließen"
```

### Slots (zusätzlich zu Menu)

| Slot | Beschreibung |
|------|--------------|
| `Submenu:` | Container für Untermenü |
| `SubmenuTrigger:` | Auslöser für Untermenü |
| `SubmenuContent:` | Inhalt des Untermenüs |

---

## NavigationMenu

Horizontale Navigation mit Mega-Menüs.

```mirror
NavigationMenu
  Root: hor, gap 4, bg #1a1a1a, pad 8, rad 8
  List: hor, gap 4
  Item: relative
  Trigger: pad 10 16, col #888, rad 6, cursor pointer
    hover:
      bg #333
      col white
  Content: bg #1a1a1a, rad 8, pad 16, shadow lg, w 300, margin 8 0 0 0
  Indicator: h 2, bg #2563eb, rad 1

  Item "Produkte", value "products"
    Frame grid 2, gap 12
      Link "Feature A", href "/a"
      Link "Feature B", href "/b"
      Link "Feature C", href "/c"
      Link "Feature D", href "/d"

  Item "Ressourcen", value "resources"
    Frame gap 8
      Link "Dokumentation", href "/docs"
      Link "Blog", href "/blog"
      Link "Support", href "/support"

  Item "Preise", value "pricing"
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `value` | string | Aktives Item |
| `defaultValue` | string | Initial aktiv |
| `orientation` | "horizontal" \| "vertical" | Ausrichtung |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `List:` | Item-Liste |
| `Item:` | Einzelnes Nav-Item |
| `Trigger:` | Klickbarer Text |
| `Content:` | Mega-Menü-Inhalt |
| `Indicator:` | Aktiv-Markierung |
| `Arrow:` | Pfeil zum Content |
| `Viewport:` | Content-Container |

---

## Zusammenfassung

| Komponente | Verwendung |
|------------|-----------|
| `Select` | Klassisches Dropdown |
| `Combobox` | Dropdown mit Suche/Autocomplete |
| `Listbox` | Alle Optionen sichtbar |
| `Menu` | Aktions-Dropdown |
| `ContextMenu` | Rechtsklick-Menü |
| `NestedMenu` | Menü mit Untermenüs |
| `NavigationMenu` | Horizontale Nav mit Mega-Menüs |

**Tastatursteuerung:** Alle Komponenten unterstützen Arrow-Keys, Enter, Escape und Typeahead.
