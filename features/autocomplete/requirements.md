# Autocomplete System

## Übersicht

Kontextsensitives Autocomplete im Mirror Studio Editor. Je nach Cursor-Position werden unterschiedliche Vorschläge angezeigt: Properties, Values, Tokens oder spezielle Picker (Color, Icon).

## Feature-Status

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Property-Autocomplete | ✅ | Nach Component-Name, Komma, Colon |
| Value-Autocomplete | ✅ | Für width, cursor, shadow, etc. |
| Color Picker bei `#` | ✅ | Nach Color-Properties und Token-Definitionen |
| Token Panel bei `$` | ✅ | Nach `$` in Wert-Kontext |
| State-Autocomplete | ✅ | Nach `state ` |
| Slot-Autocomplete | ✅ | In eingerückten Zeilen |

---

## Soll/Ist Abweichung

### ✅ Implementiert

| Feature | Trigger | Code-Zeilen |
|---------|---------|-------------|
| **Property-Autocomplete** | Nach `Component `, `, `, `:`, Indent | 5791-5920 |
| **Value-Autocomplete** | Nach Property + Space (10 Properties) | 5699-5807 |
| **Token Panel bei Space** | Nach `pad `, `gap `, `margin `, `rad ` | 6349-6404 |
| **Token Panel bei `$`** | Nach `bg $`, `pad $`, `$name: $` | 6382-6402 |
| **Color Picker bei `#`** | Nach Color-Properties + `#` | 6435-6510 |
| **Color Picker Navigation** | Pfeiltasten 13×10 Grid | 6513-6556 |
| **Color Picker Auto-Close** | Bei non-Hex-Zeichen | 6467-6473 |
| **Double-Click Edit** | Auf bestehende Hex-Farben | 6406-6440 |
| **State-Autocomplete** | Nach `state ` | 5800-5829 |
| **Slot-Autocomplete** | Eingerückt + Großbuchstabe | 5831-5857 |

### ✅ Neu implementiert

| Feature | Trigger | Beschreibung |
|---------|---------|--------------|
| **Action-Autocomplete** | Nach `onclick:` | show, hide, toggle, select, page... |
| **Target-Autocomplete** | Nach `show ` | Elemente aus Code + Keyword-Targets |
| **Duration-Autocomplete** | Nach `transition all ` | 100, 150, 200, 300, 500 |
| **Easing-Autocomplete** | Nach `transition all 200 ` | ease, ease-in, ease-out, linear |

**Siehe:** `action-chain.md` für detaillierte Spezifikation.

### ❌ Nicht implementiert (TODO)

| Feature | Erwartetes Verhalten | Priorität |
|---------|---------------------|-----------|
| **Kontextfilterung** | Properties je Component-Typ | P3 |

### Bekannte Einschränkungen

| Einschränkung | Beschreibung |
|---------------|--------------|
| Nur Open Colors | 130 Farben, keine Custom-Eingabe |
| Keine Live-Preview | Farbe nicht im Editor während Navigation |
| 10 Properties mit Values | `propertyValues{}` hat nur width, cursor, shadow, etc. |
| Keine Icon-Completion | Icon-Namen nicht vorgeschlagen |

### Code-Referenzen

| Komponente | Zeilen | Funktion |
|------------|--------|----------|
| Token Panel | 6054-6325 | `showTokenPanel()`, `extractTokensFromDoc()` |
| Color Picker | 5860-6523 | `showColorPicker()`, `hashColorTriggerExtension` |
| Property AC | 5780-5857 | `mirrorCompletions()` |
| Value AC | 5699-5807 | `propertyValues{}` Lookup |
| Trigger Regex | 6361 | `/\b(pad\|padding\|gap\|margin\|rad\|radius)$/` |
| Color Regex | 6451 | `/\b(bg\|col\|color\|background\|boc\|...)\\s+$/` |

---

## Kontexte

### 1. Zeilenanfang (Indent 0)

**Position:** Cursor am Anfang einer nicht-eingerückten Zeile.

| Eingabe | Erwartung | Status |
|---------|-----------|--------|
| `Box...` | Kein Autocomplete (User tippt Component-Name) | ✅ |
| `$name: #` | Color Picker | ✅ |
| `$name: $` | Token Panel | ❌ TODO |
| `//` | Kein Autocomplete (Kommentar) | ✅ |

---

### 2. Nach Component-Name (erstes Property)

**Position:** `Component ` (Name + Space)

| Eingabe | Erwartung | Status |
|---------|-----------|--------|
| `Box ` | Property-Autocomplete Liste | ✅ |
| `Box p...` | Property-Autocomplete (gefiltert) | ✅ |

**Trigger:** `/^[A-Z]\w*\s+$/` oder `/^\s+[A-Z]\w*\s+$/`

---

### 3. Nach Property (Wert-Kontext)

**Position:** `property ` (Property + Space)

| Eingabe | Erwartung | Status |
|---------|-----------|--------|
| `pad ` | Kein Autocomplete (Zahl erwartet) | ✅ |
| `pad $` | **Token Panel** (gefiltert .pad) | ❌ TODO |
| `bg ` | Kein Autocomplete (Farbe erwartet) | ✅ |
| `bg #` | **Color Picker** | ✅ |
| `bg $` | **Token Panel** (gefiltert .bg) | ❌ TODO |
| `width ` | Value-Autocomplete (hug, full) | ✅ |
| `cursor ` | Value-Autocomplete (pointer, etc.) | ✅ |
| `shadow ` | Value-Autocomplete (sm, md, lg) | ✅ |

**Properties mit Value-Autocomplete:**
- `width`, `w`, `height`, `h`, `size` → hug, full
- `text-align` → left, center, right
- `align` → top, bottom, left, right, center
- `shadow` → sm, md, lg
- `cursor` → pointer, default, text, move, not-allowed
- `weight` → 400, 500, 600, 700, bold
- `font` → monospace, sans-serif, serif
- `bor`, `border` → solid, dashed, dotted

---

### 4. Nach Komma (nächstes Property)

**Position:** `value, ` (Wert + Komma + Space)

| Eingabe | Erwartung | Status |
|---------|-----------|--------|
| `bg #fff, ` | Property-Autocomplete | ✅ |
| `bg #fff, p...` | Property-Autocomplete (gefiltert) | ✅ |

**Trigger:** `/,\s*$/`

---

### 5. Nach Colon (Definition)

**Position:** `Name:` oder `Name: `

| Eingabe | Erwartung | Status |
|---------|-----------|--------|
| `Button: ` | Property-Autocomplete | ✅ |
| `Button: p...` | Property-Autocomplete (gefiltert) | ✅ |

**Trigger:** `/:\s*$/`

---

### 6. Eingerückte Zeile

**Position:** Zeile beginnt mit Whitespace

| Eingabe | Erwartung | Status |
|---------|-----------|--------|
| `  p...` | Property-Autocomplete | ✅ |
| `  on...` | Event-Autocomplete | ✅ |
| `  state ` | State-Namen Autocomplete | ❌ TODO |
| `  Child` | Slot-Name Autocomplete | ❌ TODO |

**Trigger:** `/^\s+$/`

---

### 7. Token-Definitionen

**Position:** `$name:` Token wird definiert

| Eingabe | Erwartung | Status |
|---------|-----------|--------|
| `$primary: #` | **Color Picker** | ✅ |
| `$primary: $` | Token-Referenz Autocomplete | ❌ TODO |
| `$component.bg: #` | **Color Picker** | ✅ |
| `$s.pad: ` | Kein Autocomplete (Zahl) | ✅ |

**Trigger für Color Picker:**
- `/\$[\w.-]+\.(bg|col|color|boc):\s*$/`
- `/\$[\w.-]+:\s*$/`

---

## Color Picker

### Trigger-Kontexte

| Kontext | Pattern | Status |
|---------|---------|--------|
| `bg #` | Property + Space + # | ✅ |
| `col #` | Property + Space + # | ✅ |
| `$name: #` | Token-Definition + # | ✅ |
| `$name.bg: #` | Token mit Suffix + # | ✅ |
| `"text #"` | KEIN Trigger (String) | ✅ |
| `// #` | KEIN Trigger (Kommentar) | ✅ |

### Keyboard-Navigation

| Taste | Aktion |
|-------|--------|
| `←` `→` `↑` `↓` | Navigation durch 13×10 Farbgitter |
| `Enter` | Farbe einfügen, Picker schließen |
| `Escape` | `#` entfernen, Picker schließen |
| `Backspace` | `#` löschen, Picker schließen |
| Andere | Picker schließen |

### Color-Properties

```
bg, background, col, color, boc, border-color,
hover-bg, hover-col, hover-boc
```

---

## Token Panel

**Trigger:** `$` nach Property

### Trigger-Kontexte

| Kontext | Erwartung | Status |
|---------|-----------|--------|
| `pad $` | Token Panel (gefiltert .pad) | ❌ TODO |
| `gap $` | Token Panel (gefiltert .gap) | ❌ TODO |
| `bg $` | Token Panel (gefiltert .bg) | ❌ TODO |
| `col $` | Token Panel (gefiltert .col) | ❌ TODO |
| `$name: $` | Token Panel (alle Tokens) | ❌ TODO |

### Suffix-Filterung

| Property | Token-Suffix |
|----------|--------------|
| `bg`, `background` | `.bg` |
| `col`, `color` | `.col` |
| `pad`, `padding` | `.pad` |
| `gap` | `.gap` |
| `rad`, `radius` | `.rad` |
| `margin` | `.margin` |

---

## Offene Punkte

### Priorität 1
1. **Token-Referenz nach `$`** - In Wert-Kontext `bg $` soll Token-Autocomplete erscheinen

### Priorität 2
2. **State-Namen** - Nach `state ` die bekannten States vorschlagen

### Priorität 3
3. **Child/Slot Autocomplete** - In eingerückten Zeilen definierte Slots vorschlagen
4. **Kontextfilterung** - Nur relevante Properties je nach Component-Typ

---

## Tests

Siehe `autocomplete.test.ts` für detaillierte Testbeschreibungen.

```bash
npx vitest run features/autocomplete/autocomplete.test.ts
```

---

## Implementierung

### Dateien
- `studio.html` - `mirrorCompletions()` Haupt-Logik
- `studio.html` - `hashColorTriggerExtension` (Color Picker bei #)
- `studio.html` - `hashColorKeyboardExtension` (Keyboard-Navigation)

### Kontext-Patterns

```javascript
// Property-Kontext (wann Property-Autocomplete zeigen)
const isAfterComma = textBefore.match(/,\s*$/)
const isAfterColon = textBefore.match(/:\s*$/)
const isIndentedStart = textBefore.match(/^\s+$/)
const isAfterComponentName = textBefore.match(/^[A-Z]\w*\s+$/)

// Color-Kontext (wann # den Color Picker triggert)
const colorPropertyMatch = textBefore.match(
  /\b(bg|col|color|background|boc|border-color|hover-bg|hover-col|hover-boc)\s+$/
)
const tokenColorMatch = textBefore.match(/\$[\w.-]+\.(bg|col|color|boc):\s*$/)
const simpleTokenMatch = textBefore.match(/\$[\w.-]+:\s*$/)
```
