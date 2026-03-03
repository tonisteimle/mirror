# Mirror v2 - Finale Empfehlungen

Bewertet nach: **Lesbarkeit (L)**, **Lernbarkeit (E)**, **Schreibbarkeit (S)**

---

## Übernehmen

### 1. `->` für implizites Binding

```mirror
// Alt
- Item onclick assign $selected to "Option 1"
    "Option 1"

// Neu
- Item -> $selected
    "Option 1"
```

| L | E | S | Begründung |
|---|---|---|------------|
| ✅ | ✅ | ✅ | Keine Repetition, intuitiver Pfeil, kurz |

---

### 2. `each` erzeugt automatisch Instanzen

```mirror
// Alt
each $x in $list
  - Item $x

// Neu
each $x in $list
  Item $x
```

| L | E | S | Begründung |
|---|---|---|------------|
| ✅ | ✅ | ✅ | Weniger Regeln, `-` nur für manuelle Listen |

---

### 3. `fg` statt `col`

```mirror
// Alt
col #fff

// Neu
fg #fff
```

| L | E | S | Begründung |
|---|---|---|------------|
| ✅ | ✅ | = | `col` klingt wie "column", `fg/bg` ist ein klares Paar |

---

### 4. Token-Inferenz entfernen

```mirror
// Alt (mit Magic)
col $text

// Neu (explizit)
fg $text.col
```

| L | E | S | Begründung |
|---|---|---|------------|
| ✅ | ✅ | ⚠️ | Vorhersehbar, kein "was passiert hier?", Editor-Autocomplete hilft |

---

### 5. `then` für Action-Chaining

```mirror
// Alt
onclick assign $x to 1, close

// Neu
onclick assign $x to 1 then close
```

| L | E | S | Begründung |
|---|---|---|------------|
| ✅ | ✅ | ⚠️ | Komma ist mehrdeutig, `then` zeigt Sequenz |

---

### 6. `extends` für Vererbung

```mirror
// Alt
DangerButton as Button: bg red

// Neu
DangerButton extends Button: bg red
```

| L | E | S | Begründung |
|---|---|---|------------|
| ✅ | ✅ | ⚠️ | `as` ist überladen, `extends` ist selbsterklärend |

`as` bleibt nur für inline define+render:
```mirror
Container as Box, pad 16
```

---

### 7. Einheitliche State-Syntax mit `:`

```mirror
// Alt (inkonsistent)
hover
  bg #333
state highlighted
  bg #333

// Neu (konsistent)
hover:
  bg #333
highlighted:
  bg #333

// Inline auch möglich
hover: bg #333
```

| L | E | S | Begründung |
|---|---|---|------------|
| ✅ | ✅ | ✅ | Konsistent mit Definition-Syntax, kein neues Symbol |

---

## Optional (beide Varianten erlauben)

### 8. Richtungs-Shortcuts

```mirror
// Ausführlich (bleibt)
pad left 12, pad right 12

// Shortcut (neu)
pad.x 12
pad.l 12
```

| L | E | S | Begründung |
|---|---|---|------------|
| ✅ | ⚠️ | ✅ | Power-User Shortcut, Anfänger nutzen lange Form |

---

### 9. Ternary Conditionals

```mirror
// Ausführlich (bleibt)
if $done then icon "check" else icon "circle"

// Shortcut (neu)
icon $done ? "check" : "circle"
```

| L | E | S | Begründung |
|---|---|---|------------|
| ✅ | ⚠️ | ✅ | Programmierer kennen `? :`, Anfänger nutzen `if then else` |

---

## Nicht übernehmen

| Vorschlag | Grund |
|-----------|-------|
| `p`, `r`, `b` (ultra-kurz) | Zerstört Lesbarkeit |
| `@` für Definitionen | Kein Gewinn, `:` funktioniert |
| `*` statt `-` für Listen | `-` ist universell bekannt |
| `$primary-bg` (Bindestriche) | Verwirrend, sieht aus wie CSS-Variablen |
| `[hover]` (Brackets) | Neues Symbol ohne Mehrwert |
| `$Component.property` | Ändert Bedeutung von `$` |

---

## Beispiel: Dropdown in Mirror v2

```mirror
$selected: "Select..."
$options: ["Option 1", "Option 2", "Option 3"]

Dropdown.Item extends Box:
  pad 8 12, cursor pointer
  hover:
    bg #333
  active:
    bg #222

Dropdown:
  closed:
  on click outside: close

  Trigger: hor, ver-cen, gap 8, pad 8 12, bg #252525, rad 6
    on click: toggle
    $selected
    Icon "chevron-down"

  Menu: ver, bg #1E1E1E, rad 6, min-w 180
    open:
    on key escape: close
    on key arrow-down: highlight next
    on key arrow-up: highlight prev

    each $option in $options
      Dropdown.Item -> $selected
        $option
```

---

## Zusammenfassung

| Priorität | Prinzip |
|-----------|---------|
| 1 | **Lernbarkeit** - Wenige Konzepte, konsistente Patterns |
| 2 | **Lesbarkeit** - Code wird öfter gelesen als geschrieben |
| 3 | **Schreibbarkeit** - Autocomplete kompensiert, Shortcuts optional |

### Änderungen

| # | Änderung | Impact |
|---|----------|--------|
| 1 | `->` Binding | Hoch |
| 2 | `each` ohne `-` | Mittel |
| 3 | `fg` statt `col` | Gering |
| 4 | Token-Inferenz weg | Hoch |
| 5 | `then` für Actions | Mittel |
| 6 | `extends` für Vererbung | Mittel |
| 7 | `state:` Syntax | Mittel |
