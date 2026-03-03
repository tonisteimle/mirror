# Mirror v2 - Syntax-Synthese

> Finale Zusammenfassung aller Änderungen

---

## 1. Explizite Definitionen (keine implizite Definition)

### Neu: Komponenten müssen explizit definiert werden

**Alt (implizite Definition durch erstes Vorkommen):**
```
Button
    background #2271c1
    padding 12
    "Hello World"
Button
    "Save"           // erbt automatisch von oben
```

Das erste `Button` definierte implizit die Komponente.

**Neu (explizite Definition mit `as` und Primitiv):**
```
Button as button:
    bg #2271c1, pad 12, rad 8

Button "Hello World"
Button "Save"
```

**Änderungen:**
- Jede Komponente muss mit `as primitive:` definiert werden
- Keine Magie durch "erstes Vorkommen"
- Definition und Verwendung sind klar getrennt
- Parser wird einfacher

---

## 2. Tokens

### Neu: Explizite Typen, kein `$`, mit `=`

**Alt:**
```
$primary.bg: #3B82F6
$text.col: #E4E4E7
$sm.pad: 4
```

**Neu:**
```
primary: color = #3B82F6
danger: color = #EF4444
surface: color = #1a1a23
text: color = #E4E4E7

sm: size = 4
md: size = 8
lg: size = 16

body: font = "Inter"
mono: font = "JetBrains Mono"

check: icon = "check"
close: icon = "x"
```

**Änderungen:**
- `$` entfernt - JS-näher
- Expliziter Typ (`color`, `size`, `font`, `icon`)
- `=` statt `:` für Zuweisung
- Keine Property-Bindung (`.bg`, `.col`) mehr

**Typen-Katalog:**

| Typ | Werte | Verwendbar für |
|-----|-------|----------------|
| `color` | Hex, rgb(), hsl() | bg, col, boc, shadow |
| `size` | Zahlen | pad, gap, rad, w, h, font-size |
| `font` | Font-Namen | font |
| `icon` | Icon-Namen | Icon content |
| `weight` | 100-900 | weight |

---

## 3. Token-Inferenz

### Entfernt

**Alt:**
```
col $text       // inferiert zu $text.col
bg $surface     // inferiert zu $surface.bg
```

**Neu:**
```
col text        // direkt, kein $, keine Inferenz
bg surface      // was da steht, gilt
```

---

## 4. Property-Syntax

### Kommas verpflichtend

**Alt:**
```
Button pad 12 bg primary rad 8      // ohne Kommas erlaubt
Button pad 12, bg primary, rad 8    // mit Kommas erlaubt
```

**Neu:**
```
Button pad 12, bg primary, rad 8    // Kommas verpflichtend
Button pad 12 8, bg primary         // Multi-Werte ohne Komma
```

---

## 5. Property-Namen

### Eine kanonische Form

**Entfernt:**
```
padding, p      → nur: pad
background      → nur: bg
color, c        → nur: col
radius          → nur: rad
horizontal      → nur: hor
vertical        → nur: ver
```

**Behalten (einzige Form):**
```
pad, bg, col, rad, hor, ver, gap, w, h
```

---

## 6. State-Syntax

### Vereinheitlicht mit `:`

**Alt:**
```
hover
    bg #333
state highlighted
    bg #333
state selected bg blue
```

**Neu:**
```
hover:
    bg #333

highlighted:
    bg #333
    col white

selected: bg blue    // inline auch möglich
```

---

## 7. Listen ohne `-`

**Alt:**
```
Menu
    - Item "Profile"
    - Item "Settings"

each task in tasks
    - Card
        Text task.title
```

**Neu:**
```
Menu
    Item "Profile"
    Item "Settings"

each task in tasks
    Card
        Text task.title
```

`-` komplett entfernt. Mit expliziten Definitionen ist jede Verwendung automatisch eine neue Instanz.

---

## 8. Conditionals

### Beide Formen behalten

**Lang (für Lesbarkeit):**
```
if loggedIn
    Avatar
else
    Button "Login"
```

**Kurz (für Erfahrene):**
```
icon done ? "check" : "circle"
bg active ? primary : surface
```

---

## 10. Import

### Neu: Dateien importieren

```
import "tokens"
import "components"

Card
    Title "Welcome"
    Button "Click"
```

- Einfache Syntax: `import "dateiname"`
- Keine Dateiendung nötig
- Importierte Definitionen sind verfügbar
- Können im aktuellen File überschrieben werden

---

## 11. Primitiven und Definition

### Primitiven sind eingebaut (klein geschrieben)

- `frame` → HTML `<div>` (Container, wie Figma Frame)
- `text` → HTML `<span>`
- `input` → HTML `<input>`
- `button` → HTML `<button>`
- `image` → HTML `<img>`
- `link` → HTML `<a>`
- `icon` → SVG Icon

### Komponenten müssen auf Primitiven basieren oder von Komponenten erben

**Neu:** `as` für Primitive, `extends` für Komponenten.

```
// tokens.mirror
textColor: color = #E4E4E7
primary: color = #3B82F6
sm: size = 4

// components.mirror
import "tokens"

Text as text:
    col textColor

Button as button:
    pad sm, bg primary, col white

// app.mirror
import "components"

Button "Click"    // funktioniert - Button ist definiert
Footer "Test"     // Fehler - Footer nicht definiert
```

Vorteile:
- Primitiven sind klar erkennbar (klein)
- Komponenten sind klar erkennbar (groß + as/extends)
- Klare Unterscheidung: `as` = Primitiv, `extends` = Komponente
- Volle Kontrolle über alle Komponenten

---

## 12. Definition vs Vererbung

### Neu: `as` für Primitive, `extends` für Komponenten

**Definition auf Primitiv (mit `as`):**
```
Card as frame:
    pad 16, bg surface

Button as button:
    pad 8, bg primary
```

**Vererbung von Komponente (mit `extends`):**
```
DangerButton extends Button:
    bg danger

ProductCard extends Card:
    bor 1 #333
```

- `as` = "ist implementiert als" (basiert auf Primitiv)
- `extends` = "erbt von" (spezialisiert Komponente)
- Bekannt aus Java, TypeScript
- Klare semantische Trennung

---

## 13. State Child Overrides

### States können Kind-Elemente verändern

```
Input as input:
    bg surface
    Placeholder "E-Mail..." col muted
    Value col muted

    filled:
        Value col text

    invalid:
        Value col danger
        bor 1 danger

Toggle as frame:
    Thumb as frame:
        size 20, bg white

    on:
        bg primary
        Thumb margin-left 20

    off:
        bg muted
        Thumb margin-left 0
```

Syntax bleibt wie in v1, nur mit `:` nach State-Name.

---

## 14. Implizites Self bei Actions

### `self` Keyword entfernt

**Alt:**
```
onclick select self
onhover highlight self
onclick-outside close self
```

**Neu:**
```
onclick select           // wirkt auf sich selbst
onhover highlight        // wirkt auf sich selbst
onclick-outside close    // wirkt auf sich selbst

onclick highlight next   // explizites Target
onclick show Menu        // explizites Target
```

**Regel:** Kein Target = wirkt auf das Element selbst.

---

## 15. Was bleibt (unverändert)

| Konzept | Syntax | Grund |
|---------|--------|-------|
| Primitiv-Definition | `Card as frame:` | Klar, lesbar |
| Vererbung | `extends Parent:` | Explizit, bekannt |
| Benannte Instanz | `Component named name` | Explizit, eindeutig |
| Events | `onclick` | HTML-vertraut |
| Inline Spans | `"*text*:bold"` | Rich Text für Designer |
| Keys Block | `keys { ... }` | Gruppierte Keyboard-Handler |
| Timing Modifiers | `debounce 300` | Für Search, Validation |
| Data Binding | `data X where y == z` | Datengetriebene UIs |
| Call Action | `onclick call fn` | JavaScript-Integration |
| Section Headers | `--- Name ---` | Organisation |
| Token-Gruppierung | `name: { ... }` | Design-Systeme |
| Flat Access | Nested Slots direkt | Praktisch |
| Child-Overrides | `Child "x"; Child2 "y"` | Kompakte Slots |

---

## 16. Entfernt

| Konzept | Grund |
|---------|-------|
| Dimension Shorthand `Box 300, 400` | Magic - besser explizit `w 300, h 400` |
| Definition Merging | Verwirrend - eine Definition pro Komponente |

---

## Keyword-Übersicht

Jedes Keyword hat genau eine Bedeutung:

| Keyword | Verwendung | Beispiel |
|---------|------------|----------|
| `as` | Primitiv-Definition | `Card as frame:` |
| `extends` | Komponenten-Vererbung | `DangerButton extends Button:` |
| `named` | Benannte Instanz | `Button named saveBtn "Save"` |

---

## Vollständiges Beispiel

### Alt (v1)

```
$primary.bg: #3B82F6
$primary.hover.bg: #2563EB
$surface.bg: #1a1a23
$text.col: #E4E4E7
$sm.pad: 4
$md.pad: 8

Button: padding $sm $md, background $primary, color white, radius 6
    hover
        background $primary.hover
    state disabled
        opacity 0.5

TodoItem: pad 8, bg $surface
    state hover
        bg #333

App
    each $task in $tasks
        - TodoItem
            Text col $text, $task.title
            Icon if $task.done then "check" else "circle"
```

### Neu (v2)

```
primary: color = #3B82F6
primary-hover: color = #2563EB
surface: color = #1a1a23
text: color = #E4E4E7

sm: size = 4
md: size = 8

Button as button:
    pad sm md, bg primary, col white, rad 6
    hover:
        bg primary-hover
    disabled:
        opacity 0.5

TodoItem as frame:
    pad 8, bg surface
    hover:
        bg #333

App as frame:
    each task in tasks
        TodoItem
            Text col text, task.title
            Icon done ? "check" : "circle"
```

---

## Zusammenfassung der Änderungen

| # | Was | Alt | Neu |
|---|-----|-----|-----|
| 1 | Definitionen | implizit (erstes Vorkommen) | explizit mit `as primitive:` |
| 2 | Token-Prefix | `$primary` | `primary` |
| 3 | Token-Definition | `$x.bg: val` | `x: color = val` |
| 4 | Token-Typen | implizit (.bg, .col) | explizit (color, size) |
| 5 | Token-Inferenz | `col $text` | `col text` |
| 6 | Kommas | optional | verpflichtend |
| 7 | Property-Aliase | pad/padding/p | nur pad |
| 8 | States | `state x` / `hover` | `x:` / `hover:` |
| 9 | Listen | `- Item` | kein `-` mehr nötig |
| 10 | Import | - | `import "file"` |
| 11 | Primitiven | box | frame (wie Figma) |
| 12 | Primitiv-Definition | implizit | `Card as frame:` |
| 13 | Vererbung | `as Parent:` | `extends Parent:` |
| 14 | Benannte Instanz | `name as Type` | `Component named name` |
| 15 | Action-Target `self` | `onclick select self` | implizit: `onclick select` |

---

## Migrationsaufwand

| Änderung | Automatisierbar |
|----------|-----------------|
| Explizite Definitionen mit `as primitive:` | Teilweise (Primitiv muss bestimmt werden) |
| `$` entfernen | Ja |
| Token-Syntax | Teilweise (Typ muss ergänzt werden) |
| Kommas einfügen | Ja |
| Aliase ersetzen | Ja |
| State-Syntax | Ja |
| `-` entfernen (Listen) | Ja |
| `box` → `frame` | Ja |
| Vererbung `as` → `extends` | Ja (wenn Parent eine Komponente ist) |
| `name as Type` → `Type named name` | Ja |
| `self` entfernen bei Actions | Ja |

---

## Prinzipien

1. **Explizit vor implizit** - keine Magie
2. **Eine Form pro Konzept** - keine Aliase
3. **JS-nah** - erleichtert Integration
4. **Lesbar und lernbar** - vor kurz

---

*Stand: März 2026*
