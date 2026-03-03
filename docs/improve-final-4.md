# Mirror Syntax - Finale Empfehlungen

> Bewertet nach: **Lesbarkeit**, **Lernbarkeit**, **Schreibbarkeit**

---

## Änderungen

### 1. State-Syntax vereinheitlichen

**Von:**
```
state highlighted bg #333
hover
    bg #333
state hover
    bg #333
```

**Zu:**
```
hover:
    bg #333

highlighted:
    bg #333
    col white
```

**Begründung:**
- Lesbarkeit: Klar abgegrenzt durch `:`
- Lernbarkeit: Konsistent mit Definition-Syntax (`Button:`)
- Schreibbarkeit: Kurz, ein Zeichen mehr als `hover`

---

### 2. Token-Inferenz entfernen

**Von:**
```
col $text           // wird zu $text.col inferiert
bg $surface         // wird zu $surface.bg inferiert
```

**Zu:**
```
col $text.col       // explizit
bg $surface.bg      // explizit
```

**Begründung:**
- Lesbarkeit: Klar was passiert
- Lernbarkeit: Keine versteckte Magie, keine Verwirrung
- Schreibbarkeit: Autocomplete im Editor gleicht aus

---

### 3. Eine kanonische Form pro Property

**Von:**
```
padding / pad / p       // drei Optionen
background / bg         // zwei Optionen
color / col / c         // drei Optionen
```

**Zu:**
```
pad                     // einzige Form
bg                      // einzige Form
col                     // einzige Form
rad                     // einzige Form
hor                     // einzige Form
ver                     // einzige Form
```

**Begründung:**
- Lesbarkeit: Konsistenter Code überall
- Lernbarkeit: Keine Entscheidung "welche Form?"
- Schreibbarkeit: Mittlere Länge ist optimal

---

### 4. `each` ohne `-`

**Von:**
```
each $task in $tasks
    - Card
        Text $task.title
```

**Zu:**
```
each $task in $tasks
    Card
        Text $task.title
```

**Begründung:**
- Lesbarkeit: Cleaner, weniger Rauschen
- Lernbarkeit: Logisch - `each` impliziert mehrere Instanzen
- Schreibbarkeit: Weniger tippen, keine Redundanz

---

## Beibehalten

### Definition mit `:`

```
Button: pad 12, bg $primary.bg
```

- Lesbarkeit: Gut
- Lernbarkeit: Intuitiv - Doppelpunkt wie "ist definiert als"
- Schreibbarkeit: Ein Zeichen

### Vererbung mit `as`

```
DangerButton as Button:
    bg $danger.bg
```

- Lesbarkeit: Natürliche Sprache "DangerButton als Button"
- Lernbarkeit: Kurz genug um zu merken
- Schreibbarkeit: 4 Zeichen inkl. Leerzeichen

### Events mit `onclick`

```
onclick select
onclick toggle Menu
onhover highlight
```

- Lesbarkeit: Kompakt aber klar
- Lernbarkeit: HTML-Entwickler kennen es
- Schreibbarkeit: Kurz, zusammenhängend

### Listen mit `-`

```
Menu
    - Item "Home"
    - Item "Settings"
    - Item "Logout"
```

- Lesbarkeit: Klar als Liste erkennbar
- Lernbarkeit: YAML, Markdown - universell bekannt
- Schreibbarkeit: Ein Zeichen + Leerzeichen

### Conditionals: Beide Formen

```
// Lang - für Lesbarkeit
if $loggedIn then Avatar else LoginButton

// Kurz - für Schreibbarkeit
icon $done ? "check" : "circle"
bg $active ? $primary.bg : $surface.bg
```

- `if then else`: Selbsterklärend für Anfänger
- `? :`: Kurz für erfahrene Entwickler
- Beide behalten für verschiedene Nutzer

### Benannte Instanzen mit `as`

```
saveBtn as Button "Save"
header as Box pad 16
```

- Lesbarkeit: "saveBtn als Button" ist natürlich
- Lernbarkeit: Gleiche Syntax wie Vererbung - konsistent
- Schreibbarkeit: Kompakt

---

## Zusammenfassung

| Konzept | Entscheidung | Form |
|---------|--------------|------|
| States | **ändern** | `hover:` mit Einrückung |
| Token-Inferenz | **entfernen** | immer explizit `$x.prop` |
| Property-Aliase | **entfernen** | eine Form: `pad`, `bg`, `col` |
| `each` + `-` | **ändern** | `each` ohne `-` |
| Definition | behalten | `Name:` |
| Vererbung | behalten | `as Parent:` |
| Events | behalten | `onclick` |
| Listen | behalten | `- Item` |
| Conditionals | behalten | beide Formen |
| Named Instances | behalten | `name as Type` |

---

## Beispiel: Vorher/Nachher

### Vorher (v1)

```
$primary: #3B82F6

Button: padding 12, background $primary, color white, radius 6
    state hover
        background #2563EB
    state disabled
        opacity 0.5

TodoItem: pad 8, bg $surface
    hover
        bg #333

App
    each $task in $tasks
        - TodoItem
            Text col $text, $task.title
            Icon if $task.done then "check" else "circle"
```

### Nachher (v2)

```
$primary: #3B82F6

Button: pad 12, bg $primary.bg, col white, rad 6
    hover:
        bg #2563EB
    disabled:
        opacity 0.5

TodoItem: pad 8, bg $surface.bg
    hover:
        bg #333

App
    each $task in $tasks
        TodoItem
            Text col $text.col, $task.title
            Icon $task.done ? "check" : "circle"
```

---

## Migrations-Aufwand

| Änderung | Aufwand | Breaking |
|----------|---------|----------|
| State-Syntax | mittel | ja |
| Token explizit | gering | ja |
| Aliase entfernen | gering | ja (Codemod möglich) |
| `each` ohne `-` | gering | ja |

Alle Änderungen sind Breaking Changes, aber mit einem Codemod automatisierbar.

---

## Nicht empfohlen

Diese Vorschläge aus improve-1/2/3 werden **nicht** übernommen:

| Vorschlag | Grund |
|-----------|-------|
| `@Button` für Definition | Kein Gewinn über `:` |
| `def Button` | Zu lang |
| `extends` statt `as` | Zu lang |
| `*Item` statt `- Item` | Unbekannte Konvention |
| `p`, `fg`, `r` | Zu kryptisch |
| `on click:` statt `onclick` | Minimaler Gewinn |
| `#SaveBtn` für Namen | `as` ist eleganter |
| `[hover]` für States | Fremd, keine Vorteile |
| `$primary-bg` | Punkt ist hierarchischer |

---

*Stand: März 2026*
