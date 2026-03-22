# Select

## Übersicht

Das `Select` Primitive ermöglicht Dropdown-Auswahl mit voller Kontrolle über Struktur und Styling. Das Behavior (Keyboard-Navigation, Accessibility, State Management) wird von Zag bereitgestellt.

## Varianten

| Variante | Keyword | Beschreibung |
|----------|---------|--------------|
| Single Select | (default) | Eine Option auswählen |
| Multi Select | `multiple` | Mehrere Optionen auswählen |
| Searchable | `searchable` | Mit Suchfeld/Filter |
| Grouped | `Group` | Optionen gruppiert |

## Syntax

### Basis

```mirror
Select placeholder "Wähle..."
  Item "Option A"
  Item "Option B"
  Item "Option C"
```

### Mit Styling

```mirror
Select placeholder "Wähle..."

  Trigger:
    pad 12, bg surface, rad 8

  Content:
    bg surface, shadow lg, rad 8

  Item:
    pad 8, hover: bg hover, selected: bg primary

  Item "Option A"
  Item "Option B"
```

### Multi Select

```mirror
Select multiple, placeholder "Wähle mehrere..."

  Pill:
    pad 4 8, bg primary, rad 12

  Item:
    pad 8, selected: bg primary

  Item "Option A"
  Item "Option B"
```

### Searchable

```mirror
Select searchable, placeholder "Suche..."

  Input:
    bg transparent

  Empty:
    Text "Keine Ergebnisse"

  Item "Option A"
  Item "Option B"
```

### Mit Value/Label

```mirror
Select placeholder "Land..."
  Item value "de", label "Deutschland"
  Item value "at", label "Österreich"
  Item value "ch", label "Schweiz"
```

### Gruppiert

```mirror
Select placeholder "Wähle..."

  Group "Europa"
    Item "Deutschland"
    Item "Österreich"

  Group "Amerika"
    Item "USA"
    Item "Kanada"
```

## Slots

| Slot | Beschreibung | Zag API |
|------|--------------|---------|
| `Trigger` | Button der das Dropdown öffnet | `getTriggerProps()` |
| `Icon` | Chevron-Icon im Trigger | - |
| `Content` | Dropdown-Container | `getContentProps()` |
| `Item` | Einzelne Option | `getItemProps()` |
| `ItemIndicator` | Checkmark bei selected | `getItemIndicatorProps()` |
| `Input` | Suchfeld (searchable) | `getInputProps()` |
| `ClearButton` | X zum Leeren | `getClearTriggerProps()` |
| `Pill` | Selected Tag (multiple) | - |
| `PillRemove` | X in Pill | - |
| `Group` | Gruppen-Container | `getItemGroupProps()` |
| `GroupLabel` | Gruppen-Überschrift | `getItemGroupLabelProps()` |
| `Empty` | "Keine Ergebnisse" | - |
| `Divider` | Trennlinie | - |

## States

| State | Beschreibung | Data Attribute |
|-------|--------------|----------------|
| `hover:` | Mouse over Item | `[data-highlighted]` |
| `highlighted:` | Keyboard highlight | `[data-highlighted]` |
| `selected:` | Item ausgewählt | `[data-state="checked"]` |
| `disabled:` | Item deaktiviert | `[data-disabled]` |
| `open:` | Dropdown offen | `[data-state="open"]` |
| `focus:` | Trigger fokussiert | `[data-focus]` |

## Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `placeholder` | string | - | Placeholder-Text |
| `multiple` | flag | false | Multi-Select aktivieren |
| `searchable` | flag | false | Suchfeld aktivieren |
| `clearable` | flag | false | Clear-Button anzeigen |
| `disabled` | flag | false | Select deaktivieren |
| `value` | string | - | Controlled value |
| `defaultValue` | string | - | Initial value |

## Behavior (via Zag)

- Keyboard Navigation (Arrow Up/Down, Enter, Escape)
- Type-ahead (tippen springt zu Option)
- Focus Management
- Click-outside schließt
- ARIA Attributes automatisch
- Screen Reader Support

## Referenzen

- [Zag Select](https://zagjs.com/components/react/select)
- [Zag Combobox](https://zagjs.com/components/react/combobox)
