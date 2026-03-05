# Dropdown

## Übersicht

Mirror unterstützt Dropdown-Komponenten mit Toggle-Verhalten, bedingter Sichtbarkeit, Keyboard-Navigation und Selection-Binding.

## Feature-Status

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| `closed` initial state | ✅ Funktioniert | Dropdown startet geschlossen |
| `onclick toggle` | ✅ Funktioniert | Klick öffnet/schließt |
| `if (open)` visibility | ✅ Funktioniert | Menu nur sichtbar wenn offen |
| `onhover highlight` | ✅ Funktioniert | Items werden hervorgehoben |
| `onclick select` | ✅ Funktioniert | Item wird ausgewählt (blau) |
| `onclick close` | ✅ Funktioniert | Dropdown schließt nach Auswahl |
| `state highlighted` | ✅ Funktioniert | Highlight-Style wird angewendet |
| `state selected` | ✅ Funktioniert | Selected-Style wird angewendet |
| `onclick-outside close` | ✅ Funktioniert | Schließt bei Klick außerhalb |
| `keys` Block | ✅ Funktioniert | Keyboard-Events werden registriert |
| `highlight next/prev` | ✅ Funktioniert | Keyboard-Navigation zwischen Items |
| `select highlighted` | ✅ Funktioniert | Highlighted Item mit Enter auswählen |
| `selection selected` | ⚠️ Teilweise | Variable wird aktualisiert, aber Text-Binding fehlt |
| `selected ? x : y` | ❌ Noch nicht | Dynamischer Text nicht implementiert |

## DSL Syntax

### Basis-Dropdown

```mirror
Dropdown as frame:
  closed
  onclick toggle

  Trigger as frame:
    pad 8 16, bg #333, rad 4
    cursor pointer

  if (open)
    Menu as frame:
      pad 4, bg #1a1a23, rad 4
      bor 1 #444

      Item as frame:
        pad 8 12, cursor pointer
        onhover highlight
        state highlighted
          bg #444

      Item "Option A"
      Item "Option B"
      Item "Option C"

Container pad 20
  Dropdown
    Trigger "Select option..."
```

### Mit Keyboard-Navigation

```mirror
Dropdown as frame:
  closed
  onclick toggle
  onclick-outside close

  keys
    escape close
    arrow-down highlight next
    arrow-up highlight prev
    enter select highlighted, close

  Trigger as frame:
    hor, spread, gap 8
    pad 10 16, bg #333, rad 4
    cursor pointer, col #ccc

    Label as text:
    Chevron as icon:
      is 16, col #888

    Label "Bitte wählen..."
    Chevron "chevron-down"

  if (open)
    Menu as frame:
      pad 4, bg #1a1a23, rad 6
      bor 1 #444

      Item as frame:
        pad 10 12, rad 4
        cursor pointer, col #ccc
        onhover highlight
        onclick select, close

        state highlighted
          bg #444
        state selected
          bg #2563EB
          col white

      Item "Option A"
      Item "Option B"
      Item "Option C"
```

### Mit Selection-Binding

```mirror
Dropdown as frame:
  closed
  onclick toggle
  selection selected

  Trigger as frame:
    Text selected ? selected : "Bitte wählen..."

  if (open)
    Menu as frame:
      Item as frame:
        onclick select, close
      Item "Dashboard"
      Item "Einstellungen"
```

## Konzepte

### Initial State

```mirror
Dropdown as frame:
  closed                  // Startet geschlossen
```

- `closed` setzt `data-state="closed"` initial
- Der State `open` ist initial nicht aktiv
- `if (open)` Bedingungen sind initial `false`

### Toggle

```mirror
  onclick toggle          // Klick wechselt State
```

- Wechselt zwischen `open` und `closed`
- `data-state` Attribut wird aktualisiert
- Visibility-Conditions werden neu evaluiert

### Conditional Visibility

```mirror
  if (open)
    Menu as frame:
      ...
```

- Kinder von `if (open)` bekommen `visibleWhen: "open"`
- Im DOM: `display: none` wenn Parent nicht im `open` State

### Hover Highlight

```mirror
Item as frame:
  onhover highlight
  state highlighted
    bg #444
```

- `onhover highlight` = `mouseenter` setzt `data-highlighted="true"`
- `mouseleave` entfernt `data-highlighted`
- `state highlighted` definiert die Styles

### Selection

```mirror
Item as frame:
  onclick select, close
  state selected
    bg #2563EB
```

- `onclick select, close` = Chained Actions
- `select` setzt `data-selected="true"`
- Vorherige Auswahl wird automatisch entfernt

### Keyboard Navigation

```mirror
keys
  escape close
  arrow-down highlight next
  arrow-up highlight prev
  enter select highlighted, close
```

- `keys` Block registriert Keyboard-Events
- Element bekommt automatisch `tabindex="0"`
- Dropdown muss fokussiert sein für Keyboard-Events

## Was noch fehlt

### Dynamischer Text mit Ternary

```mirror
// Noch nicht implementiert:
Trigger selected ? selected : "Bitte wählen..."
```

**Benötigt:**
- Parser: Ternary-Expressions in Text-Content
- DOM Backend: Text-Nodes mit Variable-Bindings
- Runtime: Reaktive Text-Updates bei Variable-Änderung
