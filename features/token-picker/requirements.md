# Token Picker

## Übersicht

Kontextsensitive Vorschläge für Property-Werte. Wenn der User eine Property eingibt und ein Leerzeichen tippt, erscheint ein Panel mit passenden Tokens und einem visuellen Picker. Der Editor bleibt immer im Lead - der User kann jederzeit weiterschreiben.

## Feature-Status

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Color Picker | ✅ Funktioniert | Farbpalette nach `bg`, `col`, etc. |
| Icon Picker | ✅ Funktioniert | Icon-Suche nach `Icon "` |
| Token-Vorschläge | ✅ Funktioniert | Passende Tokens basierend auf Property |
| Kombiniertes Panel | ✅ Funktioniert | Tokens + Picker in einem Panel |
| Suffix-Matching | ✅ Funktioniert | `.bg`, `.pad`, `.col` Filter |
| Keyboard-Navigation | ✅ Funktioniert | Pfeiltasten + Enter zum Auswählen |
| Auto-Close bei Tippen | ✅ Funktioniert | Panel schließt wenn User weitertippt |

## Konzept

### Editor im Lead

Der Editor ist immer aktiv. Das Panel ist ein Helfer, kein Modal:

```
┌─ Editor ─────────────────────────────────┐
│ Button pad 12, bg |                      │  ← Cursor
└──────────────────────────────────────────┘
        ↓
┌─ Panel (Vorschläge) ─────────────────────┐
│ TOKENS                                   │
│  $primary.bg      #3B82F6  ●             │
│  $surface.bg      #1a1a23  ●             │
├──────────────────────────────────────────┤
│ FARBEN                                   │
│  [Farbpalette]                           │
└──────────────────────────────────────────┘
```

**Interaktion:**
- User klickt Token/Farbe → wird eingefügt
- User tippt weiter (z.B. `#F00`) → Panel schließt, Eingabe geht weiter
- User drückt Escape → Panel schließt

Kein "Custom" Feld nötig - der User ist ja schon im Editor.

### Property-spezifische Panels

Je nach Property erscheint ein anderes Panel:

**Farb-Properties** (`bg`, `col`, `boc`, `hover-bg`, etc.):
```
┌─────────────────────────────────┐
│ TOKENS                          │
│  $primary.bg      #3B82F6    ●  │
│  $surface.bg      #1a1a23    ●  │
│  $elevated.bg     #27272A    ●  │
│  $danger.bg       #EF4444    ●  │
├─────────────────────────────────┤
│ FARBEN                          │
│  ┌──┬──┬──┬──┬──┬──┬──┬──┐     │
│  │  │  │  │  │  │  │  │  │     │
│  ├──┼──┼──┼──┼──┼──┼──┼──┤     │
│  │  │  │  │  │  │  │  │  │     │
│  └──┴──┴──┴──┴──┴──┴──┴──┘     │
└─────────────────────────────────┘
```

**Spacing-Properties** (`pad`, `gap`, `margin`):
```
┌─────────────────────────────────┐
│ TOKENS                          │
│  $sm.pad          4             │
│  $md.pad          8             │
│  $lg.pad          16            │
│  $xl.pad          24            │
└─────────────────────────────────┘
```

**Radius-Properties** (`rad`):
```
┌─────────────────────────────────┐
│ TOKENS                          │
│  $sm.rad          4             │
│  $md.rad          6             │
│  $lg.rad          8             │
│  $full.rad        9999          │
└─────────────────────────────────┘
```

**Icon** (`Icon "`):
```
┌─────────────────────────────────┐
│ ZULETZT                         │
│  home    user    search         │
├─────────────────────────────────┤
│ ALLE ICONS                      │
│  [Suche...]                     │
│                                 │
│  ┌────┬────┬────┬────┬────┐    │
│  │ ⌂  │ ♥  │ ★  │ ✓  │ ✕  │    │
│  ├────┼────┼────┼────┼────┤    │
│  │ ...                    │    │
│  └────┴────┴────┴────┴────┘    │
└─────────────────────────────────┘
```

**Font-Properties** (`font`):
```
┌─────────────────────────────────┐
│ TOKENS                          │
│  $body.font       Inter         │
│  $heading.font    Inter         │
│  $mono.font       Fira Code     │
├─────────────────────────────────┤
│ SYSTEM FONTS                    │
│  Arial                          │
│  Helvetica                      │
│  Georgia                        │
│  Times New Roman                │
└─────────────────────────────────┘
```

## Token-Matching

### Suffix-basiert

Tokens werden durch ihr Suffix gefiltert:

```mirror
// Definierte Tokens
$primary.bg: #3B82F6
$surface.bg: #1a1a23
$sm.pad: 4
$md.pad: 8
$default.col: #ccc

// Bei Eingabe "bg " → zeige alle .bg Tokens
// Bei Eingabe "pad " → zeige alle .pad Tokens
// Bei Eingabe "col " → zeige alle .col Tokens
```

### Fallback: Typ-basiert

Wenn keine Suffix-Matches, dann Typ-Inferenz:

```
pad → erwartet Spacing → zeige $sm, $md, $lg (Zahlen)
bg → erwartet Color → zeige $primary, $danger (Farben)
```

### Priorität

1. Exakter Suffix-Match (`.bg`, `.pad`, `.col`)
2. Typ-Match (color, spacing, etc.)
3. Keine Vorschläge (User tippt frei)

## Property → Panel Mapping

```typescript
const PROPERTY_PANELS = {
  // Farben → Tokens + Color Picker
  bg: { suffix: '.bg', picker: 'color' },
  background: { suffix: '.bg', picker: 'color' },
  col: { suffix: '.col', picker: 'color' },
  color: { suffix: '.col', picker: 'color' },
  boc: { suffix: '.boc', picker: 'color' },
  'border-color': { suffix: '.boc', picker: 'color' },
  'hover-bg': { suffix: '.bg', picker: 'color' },
  'hover-col': { suffix: '.col', picker: 'color' },

  // Spacing → Tokens only
  pad: { suffix: '.pad', picker: null },
  padding: { suffix: '.pad', picker: null },
  gap: { suffix: '.gap', picker: null },
  margin: { suffix: '.margin', picker: null },

  // Radius → Tokens only
  rad: { suffix: '.rad', picker: null },
  radius: { suffix: '.rad', picker: null },

  // Typography
  font: { suffix: '.font', picker: 'font' },
  'font-size': { suffix: '.font.size', picker: null },
  weight: { suffix: '.weight', picker: null },

  // Icons → Icon Picker only
  Icon: { suffix: null, picker: 'icon' },
}
```

## Trigger-Logik

### Wann öffnet das Panel?

```typescript
// Nach Property + Leerzeichen (nur Spacing-Properties)
if (textBefore.match(/\b(pad|padding|gap|margin|rad|radius)\s$/)) {
  showPanel(property, cursorPosition)
}

// Nach Icon + Anführungszeichen
if (textBefore.match(/\bIcon\s+"$/)) {
  showIconPicker(cursorPosition)
}

// Bei $ Eingabe - KONTEXTSENSITIV
// NICHT am Zeilenanfang (neue Token-Definition)
if (/^\s*$/.test(textBefore)) {
  // Kein Panel - User definiert neues Token
  return
}

// Nach Property + $
if (textBefore.match(/\b(bg|col|pad|gap|rad|...)\s*$/)) {
  showPanel(property, cursorPosition)  // Gefiltert nach Property
}

// Nach Token-Definition: $name.suffix: $
if (textBefore.match(/\$([\w-]+)\.(bg|col|pad|gap|rad):\s*$/)) {
  // Suffix bestimmt Filterung
  showPanel(suffix, cursorPosition)
}
```

### $ Trigger Kontexte

| Kontext | Beispiel | Verhalten |
|---------|----------|-----------|
| Zeilenanfang | `$primary...` | **Kein Panel** - Token-Definition |
| Nach Property | `bg $...` | Gefiltert nach Property (`.bg` Tokens) |
| Token → Token | `$primary.bg: $...` | Gefiltert nach Suffix (Farb-Tokens) |
| Nach Spacing | `pad $...` | Gefiltert nach `.pad` Tokens |

### Wann schließt das Panel?

- User wählt einen Wert (Token, Farbe, Icon)
- User tippt weiter (beliebiges Zeichen außer Navigation)
- User drückt Escape
- User klickt außerhalb
- Cursor bewegt sich weg

## Token-Sammlung

Tokens werden gesammelt aus:

1. **Aktuellem Dokument** - Token-Definitionen im Code
2. **Imports** - Tokens aus importierten Dateien (wenn implementiert)
3. **Theme** - Globale Theme-Tokens (wenn implementiert)

```typescript
function collectTokens(document: string): Token[] {
  const tokens = parseTokenDefinitions(document)
  return tokens
}

function filterTokensBySuffix(tokens: Token[], suffix: string): Token[] {
  return tokens.filter(t => t.name.endsWith(suffix))
}

function filterTokensByType(tokens: Token[], type: TokenType): Token[] {
  return tokens.filter(t => t.inferredType === type)
}
```

## UI-Komponenten

### Token-Liste

```
┌─────────────────────────────────┐
│  $primary.bg      #3B82F6    ●  │  ← Farbvorschau
│  $surface.bg      #1a1a23    ●  │
│  $elevated.bg     #27272A    ●  │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  $sm.pad          4             │  ← Zahlenwert
│  $md.pad          8             │
│  $lg.pad          16            │
└─────────────────────────────────┘
```

### Color Picker

Bestehende Implementierung aus playground.html:
- Farbpalette mit Graustufen + Akzentfarben
- Hover-Preview mit Hex-Wert
- Klick fügt Farbe ein

### Icon Picker

Bestehende Implementierung aus playground.html:
- Zuletzt verwendet
- Suchfeld
- Icon-Grid mit allen verfügbaren Icons

### Font Picker

Noch zu implementieren:
- Token-Vorschläge
- System-Fonts Liste

## Vollständiges Beispiel

```mirror
// Token-Definitionen
$primary.bg: #3B82F6
$surface.bg: #1a1a23
$sm.pad: 4
$md.pad: 8
$lg.pad: 16

// User tippt:
Button pad |
          ↓
    ┌─────────────────────┐
    │ $sm.pad       4     │  ← User sieht Vorschläge
    │ $md.pad       8     │
    │ $lg.pad       16    │
    └─────────────────────┘

// User klickt $md.pad → eingefügt:
Button pad $md.pad

// ODER User tippt "12" → Panel schließt:
Button pad 12
```

## Implementierung

Die Kernfunktionalität ist in `playground.html` implementiert:

### Implementierte Features

- **Token Panel** - Kombiniertes Panel mit Tokens + Color Picker
- **Token-Extraktion** - `extractTokensFromDoc()` liest Tokens aus dem Dokument
- **Suffix-Filtering** - `filterTokensBySuffix()` filtert nach `.bg`, `.pad`, etc.
- **Typ-Fallback** - `filterTokensByType()` als Fallback wenn kein Suffix-Match
- **Keyboard-Navigation** - Pfeiltasten + Enter zum Auswählen
- **Auto-Close** - Panel schließt bei Weiterschreiben
- **Property-Trigger** - Öffnet bei `bg `, `pad `, `col `, etc.

### Tests

15 Playwright-Tests in `src/__tests__/playground/token-picker.test.ts`:

```bash
npx playwright test
```

## Mögliche Erweiterungen

- **Font Picker** - System-Fonts Liste für `font` Property
- **Spacing-Visualisierung** - Visuelle Darstellung von 4px, 8px, etc.
- **Token-Vorschau on Hover** - Live-Preview im Editor
- **$ Trigger** - Panel öffnen bei `$` Eingabe für alle Tokens
- **Imports** - Tokens aus importierten Dateien laden
- **Theme-Tokens** - Globale Theme-Tokens unterstützen
