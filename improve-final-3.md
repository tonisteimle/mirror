# Mirror v1.5 - Konsistenz statt Revolution

## Prinzip

Nicht radikal neu, sondern v1 konsistenter machen. Vertraute Muster behalten.

---

## Änderungen

### 1. `col` → `color`

```
// v1 - verwirrend ("column"?)
Button col #FFF

// v1.5 - eindeutig
Button color #FFF
```

Alternativ: `text` (Designer-Sprache)

---

### 2. Events konsistent

```
// v1 - inkonsistent
onclick select
onkeydown escape: close    // Warum Doppelpunkt?

// v1.5 - einheitlich
onclick select
onkey escape close
onkey enter submit
onkey down highlight next
```

---

### 3. Vererbung mit `extends`

```
// v1 - "as" ist überladen
DangerButton as Button: bg red    // Vererbung
Email as Input                    // Inline Define

// v1.5 - eindeutig
DangerButton extends Button: bg red
Email as Input                    // as nur für Inline Define
```

---

### 4. Token-Inferenz entfernen

```
// v1 - magisch
col $text              // wird zu $text.col

// v1.5 - explizit
color $text.col        // was drin steht, gilt
```

---

## Was bleibt

| Konzept | Syntax | Grund |
|---------|--------|-------|
| Definition | `Button:` | Vertraut (YAML, Python) |
| States | `hover` / `state x` | Lesbar, natürlich |
| Listen | `- Item` | Wie Markdown |
| Slots | `Title:` | Konsistent mit Definition |
| Conditionals | `if then else` | Wie Englisch |
| Tokens | `$name.property` | Hierarchisch, JS-vertraut |

---

## Vollständiges Beispiel

### v1

```
$primary: #3B82F6
$primary.hover: #2563EB

Button: pad 12, bg $primary, col white, rad 6
  hover
    bg $primary.hover
  state disabled
    opacity 0.5

DangerButton as Button: bg #EF4444

Card: pad 16, bg #1a1a23, rad 8
  Title:
  Content:

SearchField: pad 8, bg #252525
  onkeydown escape: clear
  onkeydown enter: search

App
  Card
    Title "Welcome"
    Content
      - Button "Save"
      - DangerButton "Delete"
```

### v1.5

```
$primary.bg: #3B82F6
$primary.hover.bg: #2563EB

Button: pad 12, bg $primary.bg, color white, rad 6
  hover
    bg $primary.hover.bg
  state disabled
    opacity 0.5

DangerButton extends Button: bg #EF4444

Card: pad 16, bg #1a1a23, rad 8
  Title:
  Content:

SearchField: pad 8, bg #252525
  onkey escape clear
  onkey enter search

App
  Card
    Title "Welcome"
    Content
      - Button "Save"
      - DangerButton "Delete"
```

---

## Änderungen im Überblick

| v1 | v1.5 | Grund |
|----|------|-------|
| `col` | `color` | Keine Verwechslung mit "column" |
| `onkeydown k:` | `onkey k` | Konsistent, kein Doppelpunkt |
| `as Parent:` | `extends Parent:` | Eindeutig, bekannt |
| Token-Inferenz | Explizit | Vorhersehbar, debuggbar |

---

## Migrationsaufwand

| Änderung | Aufwand | Automatisierbar |
|----------|---------|-----------------|
| `col` → `color` | Gering | Ja (Regex) |
| `onkeydown k:` → `onkey k` | Gering | Ja (Regex) |
| `as X:` → `extends X:` | Gering | Ja (Regex) |
| Token-Inferenz | Mittel | Teilweise |

---

## Fazit

v1.5 verbessert Konsistenz ohne die Lernkurve zu erhöhen:

- **Lesbarkeit:** Besser (eindeutige Begriffe)
- **Lernbarkeit:** Gleich gut (vertraute Muster bleiben)
- **Schreibbarkeit:** Gleich gut (keine neuen Symbole)
- **Migration:** Minimal (4 einfache Änderungen)
