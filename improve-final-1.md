# Mirror v2 - Finale Empfehlungen

> Bewertet nach: Lesbarkeit, Lernbarkeit, Schreibbarkeit

---

## Ändern

### 1. Token-Bindestrich statt Punkt

```
// Aktuell - verwirrend
$primary.bg: #3B82F6      // Token
$task.title               // Data-Property (gleiche Syntax!)

// Neu - klar unterscheidbar
$primary-bg: #3B82F6      // Token (Bindestrich)
$task.title               // Data-Property (Punkt)
```

**Warum:** Lesbarkeit +++ / Lernbarkeit +++ / Keine Inferenz-Regeln nötig

---

### 2. State-Syntax mit Doppelpunkt

```
// Aktuell - inkonsistent
hover
  bg #333
state highlighted
  bg #333
state selected bg blue    // inline

// Neu - einheitlich
hover:
  bg #333
highlighted:
  bg #333
selected: bg blue         // inline
```

**Warum:** Konsistent mit `Button:` Definition-Syntax. Lesbar. Kurz.

---

### 3. Event-Syntax mit `on`

```
// Aktuell - inkonsistent
onclick select
onkeydown escape: close
onclick-outside close

// Neu - einheitlich
on click: select
on key escape: close
on click outside: close
```

**Warum:** Einheitliches Muster. Klar getrennt. Leicht zu lernen.

---

### 4. Eine kanonische Property-Form

```
// Entfernen: padding, p, background, color, c, radius
// Behalten: pad, bg, col, rad

pad 12          // nicht: padding 12, p 12
bg #333         // nicht: background #333
col white       // nicht: color white, c white
rad 8           // nicht: radius 8
```

**Warum:** Konsistenter Code. Eine Form merken. Mittlere Länge = lesbar + schreibbar.

---

## Nicht ändern

### Definition-Syntax `Button:`

```
Button: pad 12, bg $primary-bg
```

Funktioniert, ist etabliert, minimal. `@Button` oder `def Button` bringt wenig Gewinn.

---

### Listen mit `- Item`

```
Menu
  - Item "Profile"
  - Item "Settings"
```

Universell verständlich. `*Item` ist kryptischer.

---

### Named Instances mit `named`

```
Button named SaveBtn "Save"
```

Selbsterklärend für Anfänger. Lesbarkeit vor Kürze.

---

### Block-Conditionals mit `if then else`

```
if $isLoggedIn
  Avatar
else
  Button "Login"
```

Natürliche Sprache. Sofort verständlich.

---

## Optional (additiv)

### Ternary für Inline-Conditionals

```
// Zusätzlich zu if-then-else
bg $active ? blue : gray
icon $done ? "check" : "circle"
```

Für erfahrene User. Nicht als Ersatz, sondern als Kurzform.

---

## Beispiel: Vorher / Nachher

### Aktuell (v1)

```
$primary.bg: #3B82F6
$text.col: white

Button: pad 12, bg $primary, col $text, rad 6
  hover
    bg #2563EB
  state disabled
    opacity 0.5
  onclick select self
  onkeydown enter: submit

Menu
  onclick-outside close
  - Item "Profile"
  - Item "Settings"
```

### Neu (v2)

```
$primary-bg: #3B82F6
$text-col: white

Button: pad 12, bg $primary-bg, col $text-col, rad 6
  hover:
    bg #2563EB
  disabled:
    opacity 0.5
  on click: select self
  on key enter: submit

Menu
  on click outside: close
  - Item "Profile"
  - Item "Settings"
```

---

## Zusammenfassung

| Konzept | v1 | v2 | Grund |
|---------|-----|-----|-------|
| Token-Namen | `$x.bg` | `$x-bg` | Klarheit |
| States | `hover` / `state x` | `hover:` / `x:` | Konsistenz |
| Events | `onclick` | `on click:` | Einheitlichkeit |
| Aliase | viele | eine Form | Konsistenz |
| Definition | `Name:` | `Name:` | beibehalten |
| Listen | `- Item` | `- Item` | beibehalten |
| Named | `named` | `named` | beibehalten |
| Conditionals | `if then else` | `if then else` | beibehalten |

**Prinzip:** Im Zweifel lesbar und lernbar vor kurz.
