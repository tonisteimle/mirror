# Property Panel - Bug Tracker

## Kritische Bugs

### BUG-001: Typography Section wird nicht gerendert

**Status:** ✅ Behoben (2026-03-06)
**Priorität:** P0
**Datei:** `packages/mirror-lang/src/studio/property-panel.ts`
**Zeilen:** 1119-1185

**Beschreibung:**
Die `renderTypographySection()` Methode baut HTML auf, gibt aber immer einen leeren String zurück.

**Code:**
```typescript
private renderTypographySection(category: PropertyCategory): string {
  const props = category.properties

  // ... 60 Zeilen HTML-Aufbau für fontRow, sizeRow, alignToggles ...

  return ''  // ❌ BUG: Sollte den aufgebauten HTML zurückgeben
}
```

**Impact:**
- Font Family wird nicht angezeigt
- Font Size wird nicht angezeigt
- Font Weight wird nicht angezeigt
- Text Align wird nicht angezeigt
- Italic/Underline/etc. werden nicht angezeigt

**Fix:**
```typescript
return `
  <div class="pp-label">Typography</div>
  ${fontRow}
  ${sizeRow}
  ${alignToggles}
`
```

---

### BUG-002: Visual Section fehlt in Rendering Pipeline

**Status:** ✅ Behoben (2026-03-06)
**Priorität:** P0
**Datei:** `packages/mirror-lang/src/studio/property-panel.ts`
**Zeilen:** 212-282

**Beschreibung:**
Die Variable `visualCat` wird extrahiert aber nie verwendet. Die Methode `renderVisualSection()` existiert (Zeilen 1200-1278) aber wird nie aufgerufen.

**Code:**
```typescript
private renderCategories(categories: PropertyCategory[]): string {
  // ...
  const visualCat = categories.find(c => c.name === 'visual')  // Zeile 224

  // ... andere Sections werden gerendert ...

  // ❌ visualCat wird NICHT verwendet

  return result  // Zeile 281
}
```

**Impact:**
- Shadow wird nicht angezeigt
- Opacity wird nicht angezeigt
- Cursor wird nicht angezeigt
- Z-Index wird nicht angezeigt
- Hidden/Visible wird nicht angezeigt

**Fix:**
Nach Zeile 279 hinzufügen:
```typescript
// Render visual section
if (visualCat) {
  result += `<div class="pp-section">`
  result += this.renderVisualSection(visualCat)
  result += `</div>`
}
```

---

## Hohe Priorität

### BUG-003: Font Input Selektoren finden keine Elemente

**Status:** ✅ Behoben (2026-03-06) - via BUG-001 Fix
**Priorität:** P1
**Datei:** `packages/mirror-lang/src/studio/property-panel.ts`
**Zeilen:** 1986, 2052, 2112

**Beschreibung:**
Event Handler suchen nach Input-Elementen die nie erstellt werden (weil Typography nicht rendert).

**Code:**
```typescript
// Zeile 1986
private showFontDropdown(): void {
  const fontInput = this.container.querySelector('.pp-font-input')
  if (!fontInput) return  // Immer return!
  // ...
}

// Zeile 2052
const fontsizeInput = this.container.querySelector('.pp-fontsize-input')

// Zeile 2112
const weightInput = this.container.querySelector('.pp-weight-input')
```

**Impact:**
Font-bezogene Features funktionieren nicht.

**Fix:**
Hängt von BUG-001 ab. Nach Fix von Typography Section sollten die Elemente existieren.

---

### BUG-004: Section Label falsch

**Status:** ✅ Behoben (2026-03-06)
**Priorität:** P1
**Datei:** `packages/mirror-lang/src/studio/property-panel.ts`
**Zeile:** 1029

**Beschreibung:**
Spacing Section ist mit "Padding" beschriftet, enthält aber auch Margin und Gap.

**Code:**
```typescript
return `
  <div class="pp-label">Padding</div>  // ❌ Sollte "Spacing" sein
  <div class="pp-spacing-group" data-expanded="false">
    // Enthält: Padding, Margin, Gap
  </div>
`
```

**Fix:**
```typescript
<div class="pp-label">Spacing</div>
```

---

## Mittlere Priorität

### BUG-005: XSS Risiko bei Color Token

**Status:** ✅ Behoben (2026-03-06)
**Priorität:** P2
**Datei:** `packages/mirror-lang/src/studio/property-panel.ts`
**Zeile:** 790

**Beschreibung:**
Token-Werte werden nicht escaped in data-Attributen.

**Code:**
```typescript
const swatches = colorTokens.map(token =>
  `<button class="pp-color-swatch" data-color="${token.value}" ...`
  //                                          ^^^ Nicht escaped!
).join('')
```

**Risiko:**
Wenn `token.value` = `" onclick="alert('xss')` enthält, könnte Code ausgeführt werden.

**Fix:**
```typescript
`<button class="pp-color-swatch" data-color="${this.escapeHtml(token.value)}" ...`
```

---

### BUG-006: Token Parsing Performance

**Status:** ✅ Behoben (2026-03-06)
**Priorität:** P2
**Datei:** `packages/mirror-lang/src/studio/property-panel.ts`
**Zeilen:** 452-472

**Beschreibung:**
`getPaddingTokens()` parst den gesamten Source bei jedem Aufruf.

**Code:**
```typescript
private getPaddingTokens(): PaddingToken[] {
  const source = this.codeModifier.getSource()  // Holt alles
  const lines = source.split('\n')              // Split
  for (const line of lines) {                   // Loop
    const match = trimmed.match(/.../)          // Regex
  }
}
// Wird bei jedem Input-Focus aufgerufen!
```

**Impact:**
Langsame UI bei großen Dateien.

**Fix:**
```typescript
private cachedTokens: PaddingToken[] | null = null
private cachedSourceHash: string = ''

private getPaddingTokens(): PaddingToken[] {
  const source = this.codeModifier.getSource()
  const hash = this.hashSource(source)

  if (hash === this.cachedSourceHash && this.cachedTokens) {
    return this.cachedTokens
  }

  // Parse tokens...
  this.cachedTokens = tokens
  this.cachedSourceHash = hash
  return tokens
}
```

---

### BUG-007: Hover Properties fehlen komplett

**Status:** ✅ Behoben (2026-03-06)
**Priorität:** P2
**Datei:** `packages/mirror-lang/src/studio/property-panel.ts`

**Beschreibung:**
Keine UI für hover-* Properties obwohl in CLAUDE.md dokumentiert.

**Betroffene Properties:**
- `hover-bg` / `hover-background`
- `hover-col` / `hover-color`
- `hover-opa` / `hover-opacity`
- `hover-scale`
- `hover-bor` / `hover-border`
- `hover-boc` / `hover-border-color`
- `hover-rad` / `hover-radius`

**Fix:**
Neue Section "Hover" hinzufügen oder Hover-Inputs bei jeweiliger Property (z.B. BG Zeile hat auch Hover BG).

---

## Niedrige Priorität

### BUG-008: Dropdown Close Race Condition

**Status:** ✅ Behoben (2026-03-06)
**Priorität:** P3
**Datei:** `packages/mirror-lang/src/studio/property-panel.ts`
**Zeilen:** 1974-1980

**Beschreibung:**
Click-Listener wird mit setTimeout(0) angehängt, kann Clicks verpassen.

**Code:**
```typescript
setTimeout(() => document.addEventListener('click', closeDropdown), 0)
```

**Fix:**
```typescript
requestAnimationFrame(() => {
  document.addEventListener('click', closeDropdown)
})
```

---

### BUG-009: Memory Leak bei Event Listeners

**Status:** ✅ Behoben (2026-03-06)
**Priorität:** P3
**Datei:** `packages/mirror-lang/src/studio/property-panel.ts`
**Zeilen:** 653-662

**Beschreibung:**
Event Listeners auf Autocomplete Items werden nicht tracked/cleanup.

**Code:**
```typescript
dropdown.querySelectorAll('.pp-token-item').forEach((item, index) => {
  item.addEventListener('mousedown', (e) => { ... })
  item.addEventListener('mouseenter', () => { ... })
})
// Kein Cleanup wenn dropdown ersetzt wird
```

**Fix:**
AbortController verwenden oder Listener-Referenzen speichern.

---

### BUG-010: Category Order doppelt definiert + Inkonsistente Namen

**Status:** ✅ Behoben (2026-03-06)
**Priorität:** P3
**Dateien:**
- `property-panel.ts:226` - `specialCats` Array
- `property-extractor.ts:625` - `order` Array (lokale Methode)
- `schema/properties.ts:654` - `categoryOrder` (offizielle Quelle)

**Beschreibung:**
Category-Reihenfolge und -Namen sind an mehreren Stellen definiert mit INKONSISTENTEN Werten:

| Stelle | Sizing-Kategorie | Color-Kategorie |
|--------|-----------------|-----------------|
| Schema (`categoryOrder`) | `'sizing'` | `'color'` |
| `categorizeProperties()` lokal | `'size'` | `'colors'` |
| PropertyPanel erwartet | `'sizing'` | - (immer gerendert) |

**Code:**
```typescript
// property-extractor.ts:625 - LOKALE Methode mit 'size'
const order = ['layout', 'alignment', 'size', 'spacing', 'colors', ...]

// schema/properties.ts:654 - SCHEMA mit 'sizing'
export const categoryOrder = ['layout', 'alignment', 'sizing', 'spacing', 'color', ...]

// property-panel.ts:220 - erwartet 'sizing'
const sizingCat = categories.find(c => c.name === 'sizing')
```

**Risiko:**
Aktuell mitigiert weil `showAllProperties = true` (Default), was `categorizeAllProperties()` mit Schema-Namen verwendet. Falls jemand `showAllProperties = false` setzt, bricht die Size-Section.

**Fix:**
1. `categorizeProperties()` entfernen (Dead Code wenn Default true ist)
2. ODER: Lokale `order` durch Schema-Import ersetzen:
```typescript
import { categoryOrder } from '../schema/properties'
const order = categoryOrder  // Single source of truth
```
