# Mirror v2 - Verbesserungsvorschläge

## 1. Implizites Binding mit `->`

```mirror
// Alt: Wert wird doppelt geschrieben
- Item onclick assign $selected to "Option 1"
    "Option 1"

// Neu: Pfeil bindet Content an Variable
- Item -> $selected
    "Option 1"
```

## 2. `each` erzeugt automatisch Instanzen

```mirror
// Alt: each + - ist redundant
each $option in $options
  - Item $option

// Neu: each impliziert neue Instanzen
each $option in $options
  Item $option
```

## 3. Action-Chaining mit `then`

```mirror
// Alt: Komma ist mehrdeutig
onclick assign $x to 1, close, bg #333

// Neu: Expliziter Separator
onclick assign $x to 1 then close
```

## 4. Klare Vererbung mit `extends`

```mirror
// Alt: as ist überladen
Child as Parent:

// Neu: extends für Definition
Child extends Parent:
```

## 5. Named Instances mit `#`

```mirror
// Alt: verbose
Button named SaveBtn "Save"

// Neu: Präfix
#SaveBtn Button "Save"
```

## 6. Einheitliche State-Syntax mit `[]`

```mirror
// Alt: inkonsistent
hover
  bg #333
state highlighted bg #333

// Neu: einheitlich
[hover] bg #333
[highlighted] bg #333
```

## 7. Token-Bindestriche statt Punkte

```mirror
// Alt: Punkt ist überladen
$primary.bg      // Token-Suffix
$task.title      // Data-Property

// Neu: Bindestrich für Tokens
$primary-bg      // Token
$task.title      // Data-Property (Punkt bleibt)
```

## 8. Event-Syntax mit `on`

```mirror
// Alt: inkonsistent
onclick
onclick-outside
onkeydown escape:

// Neu: einheitlich
on click
on click outside
on key escape
```

---

## Beispiel: Dropdown in Mirror v2

```mirror
$selected: "Select..."
$options: ["Option 1", "Option 2", "Option 3"]

Dropdown.Item extends Box:
  pad 8 12, cursor pointer
  [hover] bg #333
  [active] bg #222

Dropdown:
  [closed]
  on click outside: close

  Trigger: hor, ver-cen, gap 8, pad 8 12, bg #252525, rad 6
    on click: toggle
    $selected
    Icon "chevron-down"

  Menu: ver, bg #1E1E1E, rad 6, min-w 180
    [open]
    on key escape: close
    on key arrow-down: highlight next
    on key arrow-up: highlight prev

    each $option in $options
      Dropdown.Item -> $selected
        $option
```
