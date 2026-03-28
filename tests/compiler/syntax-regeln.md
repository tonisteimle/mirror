# DSL Verhaltensregeln

Nur nicht-offensichtliche Regeln. Für Property-Referenz siehe `CLAUDE.md`.

---

## Kernprinzipien

### 1. Letzter Wert gewinnt
```
Frame w 100 w 200    → 200px
Frame hor ver        → column (ver letzter)
Frame tc hor         → row (hor überschreibt tc)
```

### 2. Kinder durch Einrückung
```
Frame
  Text "Kind"
  Frame
    Text "Enkel"
  Text "Geschwister"    ← gleiche Ebene wie Frame darüber
```

### 3. Vererbung merged (nicht ersetzt)
```
Card as Frame:
  Text "Base"
  bg #333

ExtendedCard extends Card:
  Text "Added"
  bg #f00              ← überschreibt

ExtendedCard
→ Hat BEIDE Texte
→ bg ist #f00
```

---

## Layout-System

### Sizing Keywords

| Keyword | CSS | Bedeutung |
|---------|-----|-----------|
| `w 100` | `width: 100px` | Fixe Größe |
| `w full` | `flex: 1 1 0%` | Flex-basiert (NICHT 100%!) |
| `w hug` | `width: fit-content` | Inhalt-basiert |

### Richtung + Alignment

```
Frame ver          → column (default)
Frame hor          → row
Frame center       → beide Achsen zentriert
Frame hor center   → row + zentriert
```

### 9-Zone Alignment

```
tl  tc  tr
cl  c   cr
bl  bc  br
```

Jede Zone setzt `justify-content` + `align-items`.

---

## States

### System States (CSS Pseudo-Classes)
```
hover:    → :hover
focus:    → :focus
active:   → :active
disabled: → :disabled
```

### Custom States
```
selected:    → data-state="selected"
highlighted: → data-state="highlighted"
```

### Inline vs Block
```
// Inline
Button hover: bg primary

// Block
Button
  hover:
    bg primary
    col white
```

---

## Events

### Basis
```
onclick show Modal
onhover highlight
```

### Mit Keyboard Key
```
onkeydown enter: submit
onkeydown escape: close
```

**Wichtig:** `enter:` ist KEIN State, sondern Key-Modifier.

---

## Zag-Komponenten

### Items gehören zur Komponente
```
Select
  Item "A"       ← gehört zu Select
  Item "B"
Text "Danach"    ← NICHT Teil von Select
```

### Styling auf Root
```
Select w 200 bg #333
→ Styles werden auf Root-Element angewendet
```

---

## Tokens

### Verwendung
```
primary: #3B82F6

Frame bg primary      → var(--primary)
Frame bg $primary     → var(--primary)
```

### Vererbung überschreibbar
```
Card as Frame:
  bg primary

DangerCard extends Card:
  bg danger           ← überschreibt token
```

---

## Edge Cases

### Semicolons
```
// Property-Trenner (lowercase nach ;)
Frame bg #f00; w 100

// Child Override (PascalCase nach ;)
NavItem Icon "home"; Label "Home"
```

### Strings
```
Text "Double Quotes"
Text 'Single Quotes'
Text "Escaped \"Quote\""
```

### Negative Werte
```
Frame margin -10     → margin: -10px
Frame x -50          → left: -50px
Frame rotate -45     → rotate(-45deg)
```

---

## Bekannte Limitierungen

| Bereich | Limitierung | Status |
|---------|-------------|--------|
| JSDOM | `aspect-ratio` nicht unterstützt | Test übersprungen |
| JSDOM | Farben werden konvertiert (#f00 → rgb) | Berücksichtigt |
| JSDOM | Computed flex-layouts nicht berechnet | Nur CSS-Properties prüfbar |

---

## Test-Referenzen

| Regel | Test |
|-------|------|
| Letzter gewinnt | `layout-conflicts-007.test.ts` |
| Vererbung | `inheritance-005.test.ts` |
| 9-Zone | `alignment-008.test.ts` |
| Zag | `zag-*.test.ts` |
| Edge Cases | `provocation-021.test.ts` |
