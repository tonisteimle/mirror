# Property Panel v2 - Designvorschlag

## Grundprinzip

Ein systematischer, technischer Property-Editor mit konsistenter Struktur:

```
┌─────────────────────────────────────────────────┐
│  LABEL        │  CONFIGURATION ELEMENT          │
│  (60px fix)   │  (flex, rest der Breite)        │
└─────────────────────────────────────────────────┘
```

## Konfigurationselemente

### 1. Toggle-Gruppe (gleiche Breite pro Button)

```
┌──────────────────────────────────────────────────┐
│ Layout    │ [hor] [ver] [grid] [stack]           │
└──────────────────────────────────────────────────┘
```

- Alle Buttons haben **exakt gleiche Breite** (flex: 1)
- Aktiver Button ist hervorgehoben
- Hover-State auf inaktiven Buttons

### 2. Toggle + Input (Hybrid)

```
┌──────────────────────────────────────────────────┐
│ Width     │ [hug] [full] │ [____120____]         │
└──────────────────────────────────────────────────┘
```

- Presets links als Toggle-Gruppe
- Input rechts für custom Wert
- Input wird aktiv wenn custom Wert gesetzt

### 3. Nur Input

```
┌──────────────────────────────────────────────────┐
│ Gap       │ [________16________]                 │
└──────────────────────────────────────────────────┘
```

- Einfaches Input-Feld
- Mit Token-Autocomplete ($)

### 4. Color Picker

```
┌──────────────────────────────────────────────────┐
│ BG        │ [■][■][■][■] │ [___#3B82F6___]       │
└──────────────────────────────────────────────────┘
```

- Farbswatches links (aus Tokens)
- Hex/Token-Input rechts

### 5. Icon-Toggles (z.B. Alignment)

```
┌──────────────────────────────────────────────────┐
│ Align     │ [←] [↔] [→]  │  [↑] [↕] [↓]         │
└──────────────────────────────────────────────────┘
```

- Icon-basierte Toggles
- Gruppiert nach Achse

## Struktur

### Sections mit optionalen Trennlinien

**Option A: Keine Linien (kompakt)**
```
┌──────────────────────────────────────────────────┐
│ Layout    │ [hor] [ver] [grid] [stack]           │
│ Gap       │ [________16________]                 │
│ Wrap      │ [on] [off]                           │
├──────────────────────────────────────────────────┤
│ Width     │ [hug] [full] │ [____120____]         │
│ Height    │ [hug] [full] │ [____auto___]         │
├──────────────────────────────────────────────────┤
│ ...                                              │
└──────────────────────────────────────────────────┘
```

**Option B: Linien nach jeder Property (technisch)**
```
┌──────────────────────────────────────────────────┐
│ Layout    │ [hor] [ver] [grid] [stack]           │
├──────────────────────────────────────────────────┤
│ Gap       │ [________16________]                 │
├──────────────────────────────────────────────────┤
│ Wrap      │ [on] [off]                           │
├──────────────────────────────────────────────────┤
│ ...                                              │
└──────────────────────────────────────────────────┘
```

**Option C: Subtile Linien (Kompromiss)**
```
Nur 1px Linie, sehr dezent (#2a2a2a auf #1a1a1a Hintergrund)
Erzeugt visuelle Trennung ohne zu dominant zu sein
```

## Komponenten-Bibliothek

### PropertyRow
```typescript
interface PropertyRow {
  label: string           // "Layout", "Width", etc.
  type: 'toggle' | 'input' | 'toggle-input' | 'color' | 'icon-toggle'
  options?: string[]      // Für Toggles: ['hor', 'ver', 'grid']
  value: string
  onChange: (value: string) => void
}
```

### ToggleGroup
```typescript
interface ToggleGroup {
  options: Array<{
    value: string
    label?: string        // Falls anders als value
    icon?: string         // SVG path
  }>
  value: string
  equalWidth: boolean     // true = flex: 1 für alle
}
```

### PropertyInput
```typescript
interface PropertyInput {
  value: string
  placeholder?: string
  suffix?: string         // "px", "%"
  autocomplete?: boolean  // Token-Autocomplete
}
```

## CSS Variablen

```css
:root {
  --pp-label-width: 60px;
  --pp-row-height: 28px;
  --pp-row-gap: 2px;
  --pp-toggle-gap: 2px;
  --pp-section-gap: 8px;

  --pp-bg: #1a1a23;
  --pp-row-bg: #222;
  --pp-toggle-bg: #2a2a2a;
  --pp-toggle-active: #3B82F6;
  --pp-input-bg: #1a1a1a;
  --pp-border: #333;
  --pp-text: #ccc;
  --pp-text-muted: #888;
}
```

## Layout Grid

```
┌─────────────────────────────────────────────────────────┐
│ LABEL (60px)  │  CONTENT (flex: 1)                      │
│               │  ┌─────────────────────────────────┐    │
│               │  │ Toggles oder Input              │    │
│               │  └─────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘

Property Row: display: flex; align-items: center; height: 28px;
Label: width: 60px; flex-shrink: 0;
Content: flex: 1; display: flex; gap: 4px;
Toggle Button: flex: 1; (bei equalWidth)
```

## Empfehlung

**Option C (Subtile Linien)** bietet den besten Kompromiss:
- Technisches, professionelles Aussehen
- Visuelle Struktur ohne zu überladen
- Konsistent mit modernen Design-Tools (Figma, etc.)

Die Linien sollten:
- Sehr dezent sein (1px, kaum sichtbar)
- Nur zwischen Properties, nicht am Rand
- Optional: Stärkere Linien zwischen Sections
