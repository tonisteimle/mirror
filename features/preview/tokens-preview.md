# Tokens Preview

## Übersicht

Wenn eine Tokens-Datei ausgewählt ist, zeigt das Preview-Panel alle definierten Tokens in einer übersichtlichen Tabellenansicht.

## Screenshot

![Tokens Preview](../../packages/mirror-lang/docs/screenshots/tokens-preview.png)

## Gruppierung

Tokens werden automatisch nach Typ gruppiert:

### Farben
Tokens mit Farbwerten (`#hex`, `rgb()`, `hsl()`, oder Token-Referenzen):
```mirror
$primary.bg: #3B82F6
$grey-900: #18181B
```

### Abstände
Tokens mit `.pad`, `.gap`, oder `.margin` Suffix:
```mirror
$sm.pad: 4
$md.gap: 8
```

### Radien
Tokens mit `.rad` Suffix:
```mirror
$sm.rad: 4
$lg.rad: 16
```

## Layout

```
┌─────────────────────────────────────┐
│ FARBEN                              │
├──────────┬───────────────┬──────────┤
│ [swatch] │ $primary.bg   │ #3B82F6  │
│ [swatch] │ $grey-900     │ #18181B  │
├──────────┴───────────────┴──────────┤
│ ABSTÄNDE                            │
├──────────┬───────────────┬──────────┤
│ [bar]    │ $sm.pad       │ 4        │
│ [bar]    │ $md.pad       │ 8        │
└──────────┴───────────────┴──────────┘
```

## CSS Klassen

```css
.tokens-preview-section        /* Gruppierung */
.tokens-preview-section-header /* Titel (FARBEN, etc.) */
.tokens-preview-table          /* Tabelle */
.tokens-preview-row            /* Zeile */
.tokens-preview-cell           /* Zelle */
.tokens-preview-swatch         /* Farb-Swatch */
.tokens-preview-spacing        /* Abstands-Visualisierung */
.tokens-preview-name           /* Token-Name */
.tokens-preview-value          /* Token-Wert */
```

## JavaScript

```javascript
function renderTokensPreview(ast) {
  const tokens = ast.tokens || []

  // Gruppieren nach Typ
  const colorTokens = tokens.filter(t => isColorValue(t.value))
  const spacingTokens = tokens.filter(t =>
    t.name.includes('.pad') || t.name.includes('.gap')
  )
  // ...
}
```
