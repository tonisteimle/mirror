# Mirror v2 - Syntax-Vorschläge

## Kernprinzipien

1. **Ein Konzept = Eine Syntax** - Keine Alternativen
2. **Explizite Marker** - Sofort erkennbar was was ist
3. **Konsistente Konventionen** - Gleiche Muster überall

---

## Änderungen

### 1. Definition mit `@`

```
// v1
Button: pad 12, bg blue

// v2
@Button p 12, bg blue
```

### 2. Vererbung mit `extends`

```
// v1
DangerButton as Button: bg red

// v2
@DangerButton extends Button
  bg red
```

### 3. Properties vereinheitlicht

| v1 | v2 | Grund |
|----|-----|-------|
| `col` | `fg` | "col" klingt nach "column" |
| `pad` | `p` | Konsistent mit w, h, g |
| `rad` | `r` | Konsistent |
| `bor` | `b` | Konsistent |

Richtungen mit Punkt-Notation:
```
p.l 12      // padding-left
p.x 16      // horizontal (left + right)
m.y 8       // vertical (top + bottom)
```

### 4. States einheitlich mit `:`

```
// v1 - inkonsistent
hover
  bg blue
state highlighted
  bg gray

// v2 - alle gleich
hover:
  bg blue
highlighted:
  bg gray

// v2 inline
bg blue, hover?bg blue-600
```

### 5. Events mit `on`

```
// v1
onclick select
onkeydown escape: close

// v2
on click: select
on key.escape: close
on key.down: highlight next
on input debounce 300: filter
```

### 6. Referenzen einheitlich mit `$`

```
// v1
$token
Component.property

// v2
$token
$Component.property
```

### 7. Tokens mit `=`

```
// v1
$primary: #3B82F6

// v2
$primary = #3B82F6
```

### 8. Slots mit `#`, Listen mit `*`

```
// v2
@Card
  #Title            // Slot
  #Content

@Menu
  *Item             // Liste

// Verwendung
Card
  #Title "Welcome"

Menu
  *Item "Profile"
  *Item "Settings"
```

### 9. Conditionals mit `?`

```
// v1
if $done then icon "check" else icon "circle"

// v2
icon $done ? "check" : "circle"
bg $active ? blue : gray
```

---

## Vollständiges Beispiel

### v1

```
$primary: #3B82F6

Button: pad 12, bg $primary, col white, rad 6
  hover
    bg #2563EB
  state disabled
    opacity 0.5

Card: pad 16, bg #1a1a23, rad 8
  Title:
  Description:

App
  Card
    Title "Welcome"
  Menu
    - Item "Home"
    - Item "Settings"
```

### v2

```
$primary = #3B82F6

@Button p 12, bg $primary, fg white, r 6
  hover:
    bg #2563EB
  disabled:
    o 0.5

@Card p 16, bg #1a1a23, r 8
  #Title
  #Description

App
  Card
    #Title "Welcome"
  Menu
    *Item "Home"
    *Item "Settings"
```

---

## Zusammenfassung

| Konzept | v1 | v2 |
|---------|-----|-----|
| Definition | `Name:` | `@Name` |
| Vererbung | `as Parent:` | `extends Parent` |
| Farbe | `col` | `fg` |
| States | `hover` / `state x` | `hover:` / `x:` |
| Events | `onclick` | `on click:` |
| Referenz | `Comp.prop` | `$Comp.prop` |
| Token | `$x: val` | `$x = val` |
| Slot | `Title:` | `#Title` |
| Liste | `- Item` | `*Item` |
| Conditional | `if then else` | `? :` |
