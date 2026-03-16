# Tutorial: Token Picker

Dieses Kapitel zeigt, wie du den Token Picker im Mirror Playground nutzt, um effizient mit Design Tokens zu arbeiten.

## Was der Token Picker bietet

- Automatische Token-Vorschläge basierend auf Property
- Kombiniertes Panel mit Tokens + Color Picker
- Keyboard-Navigation (Pfeiltasten + Enter)
- Suffix-basiertes Filtering (`.bg`, `.pad`, `.col`)
- Auto-Close bei Weiterschreiben

## Tokens definieren

Zuerst definierst du deine Design Tokens am Anfang deiner Mirror-Datei:

```mirror
// Farb-Tokens mit .bg Suffix
primary.bg: #3B82F6
surface.bg: #1a1a23
elevated.bg: #27272A
danger.bg: #EF4444

// Farb-Tokens mit .col Suffix
default.col: #E4E4E7
muted.col: #888888
heading.col: #FFFFFF

// Spacing-Tokens mit .pad Suffix
sm.pad: 4
md.pad: 8
lg.pad: 16
xl.pad: 24

// Radius-Tokens mit .rad Suffix
sm.rad: 4
md.rad: 6
lg.rad: 8
full.rad: 9999

// Gap-Tokens mit .gap Suffix
sm.gap: 4
md.gap: 8
lg.gap: 16
```

**Die Namenskonvention ist wichtig:**
- `.bg` → für Background-Properties
- `.col` → für Color/Text-Properties
- `.pad` → für Padding-Properties
- `.rad` → für Radius-Properties
- `.gap` → für Gap-Properties

## Token Picker verwenden

### Für Farb-Properties

Wenn du eine Farb-Property tippst und ein Leerzeichen eingibst:

```mirror
Button bg |
          ↓ Token Picker öffnet sich
```

Das Panel zeigt:
1. **Tokens** - Alle Tokens mit `.bg` Suffix
2. **Farben** - Color Picker mit Farbpalette

```
┌─────────────────────────────────┐
│ TOKENS                          │
│  $primary.bg      #3B82F6    ●  │
│  $surface.bg      #1a1a23    ●  │
│  $elevated.bg     #27272A    ●  │
│  $danger.bg       #EF4444    ●  │
├─────────────────────────────────┤
│ FARBEN                          │
│  [Farbpalette]                  │
└─────────────────────────────────┘
```

### Für Spacing-Properties

Bei Spacing-Properties (`pad`, `gap`, `margin`) erscheint nur die Token-Liste:

```mirror
Button pad |
           ↓ Token Picker öffnet sich

┌─────────────────────────────────┐
│ TOKENS                          │
│  $sm.pad          4             │
│  $md.pad          8             │
│  $lg.pad          16            │
│  $xl.pad          24            │
└─────────────────────────────────┘
```

Kein Color Picker - macht bei Spacing keinen Sinn.

### Für Radius-Properties

```mirror
Card rad |
         ↓ Token Picker öffnet sich

┌─────────────────────────────────┐
│ TOKENS                          │
│  $sm.rad          4             │
│  $md.rad          6             │
│  $lg.rad          8             │
│  $full.rad        9999          │
└─────────────────────────────────┘
```

## Keyboard-Navigation

Du kannst das Panel komplett mit der Tastatur bedienen:

| Taste | Aktion |
|-------|--------|
| `↓` | Nächsten Token auswählen |
| `↑` | Vorherigen Token auswählen |
| `Enter` | Ausgewählten Token einfügen |
| `Escape` | Panel schließen |

**Beispiel-Workflow:**

1. Tippe `Button bg ` → Panel öffnet
2. Drücke `↓` zweimal → `$elevated.bg` ist ausgewählt
3. Drücke `Enter` → Token wird eingefügt

Ergebnis:
```mirror
Button bg $elevated.bg
```

## Weiterschreiben schließt Panel

Der Editor bleibt immer im Lead. Wenn du einfach weitertippst:

```mirror
Button bg #F|  ← Sobald du # tippst
               → Panel schließt automatisch
```

Das ermöglicht:
- Token-Vorschläge nutzen wenn gewünscht
- Eigene Werte eingeben ohne Unterbrechung
- Kein modaler Workflow

## Suffix-Matching

Der Token Picker filtert intelligent nach Suffix:

| Property | Suffix | Zeigt Tokens |
|----------|--------|--------------|
| `bg` | `.bg` | `$primary.bg`, `$surface.bg`, ... |
| `col` | `.col` | `$default.col`, `$muted.col`, ... |
| `pad` | `.pad` | `$sm.pad`, `$md.pad`, ... |
| `gap` | `.gap` | `$sm.gap`, `$md.gap`, ... |
| `rad` | `.rad` | `$sm.rad`, `$md.rad`, ... |

**Hover-Properties funktionieren auch:**

```mirror
Button hover-bg |  → zeigt alle .bg Tokens
Button hover-col | → zeigt alle .col Tokens
```

## Typ-basierter Fallback

Wenn kein Token mit passendem Suffix existiert, filtert der Picker nach Typ:

```mirror
// Nur diese Tokens definiert (ohne Suffix):
primary: #3B82F6
danger: #EF4444
sm: 4
lg: 16

Button bg |
          ↓ Zeigt alle Farb-Tokens (primary, danger)

Button pad |
           ↓ Zeigt alle Zahlen-Tokens (sm, lg)
```

## Vollständiges Beispiel

```mirror
// === TOKENS ===

// Farben
primary.bg: #3B82F6
primary.hover.bg: #2563EB
surface.bg: #1a1a23
elevated.bg: #27272A

default.col: #E4E4E7
muted.col: #888888

// Spacing
sm.pad: 4
md.pad: 8
lg.pad: 16

sm.gap: 8
md.gap: 12

// Radius
sm.rad: 4
md.rad: 6
lg.rad: 8

// === KOMPONENTEN ===

Button:
  pad $md.pad $lg.pad      // ← Token-Vorschlag bei Eingabe
  bg $primary.bg           // ← Token-Vorschlag bei Eingabe
  col white
  rad $md.rad              // ← Token-Vorschlag bei Eingabe
  cursor pointer

  state hover
    bg $primary.hover.bg

Card:
  pad $lg.pad
  bg $surface.bg
  rad $lg.rad
  gap $md.gap

// === UI ===

Container pad 40, bg #0a0a0f
  Card
    Text "Willkommen" col $default.col
    Text "Subtitle" col $muted.col
    Button "Klick mich"
```

## Best Practices

### 1. Konsistente Namenskonvention

```mirror
// Gut: Klare Suffixe
primary.bg: #3B82F6
primary.col: #3B82F6
sm.pad: 4
sm.rad: 4

// Vermeiden: Unklare Namen
blue: #3B82F6        // Was ist das? bg? col?
small: 4             // pad? rad? gap?
```

### 2. Semantische Namen

```mirror
// Gut: Beschreibt den Zweck
surface.bg: #1a1a23
elevated.bg: #27272A
danger.bg: #EF4444

// Vermeiden: Beschreibt nur den Wert
dark-gray.bg: #1a1a23
lighter-gray.bg: #27272A
red.bg: #EF4444
```

### 3. Skalierte Tokens

```mirror
// Gut: Konsistente Skala
sm.pad: 4
md.pad: 8
lg.pad: 16
xl.pad: 24

// Gut: Auch für Radius
sm.rad: 4
md.rad: 6
lg.rad: 8
```

## Zusammenfassung

| Feature | Verhalten |
|---------|-----------|
| Trigger | Space nach `bg`, `col`, `pad`, `gap`, `rad` |
| Filter | Suffix-basiert (`.bg`, `.pad`, etc.) |
| Fallback | Typ-basiert (color, spacing) |
| Farben | Color Picker nur bei Farb-Properties |
| Keyboard | Pfeiltasten + Enter + Escape |
| Auto-Close | Bei Weiterschreiben |
| Editor | Bleibt immer aktiv (kein Modal) |
