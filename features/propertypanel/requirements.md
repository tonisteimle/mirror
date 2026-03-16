# Property Panel

## Übersicht

Das Property Panel ist die rechte Sidebar im Mirror Studio, die erscheint wenn ein Element in der Preview ausgewählt wird. Es ermöglicht das visuelle Bearbeiten von Properties ohne Code zu schreiben.

## Feature-Status

### Sections

| Section | Status | Beschreibung |
|---------|--------|--------------|
| **Layout** | ✅ Funktioniert | Horizontal/Vertical/Grid/Stacked Toggle |
| **Alignment** | ✅ Funktioniert | 3x3 Grid für H/V Alignment + BTW/WRP |
| **Size** | ✅ Funktioniert | Width/Height mit hug/full/value |
| **Spacing** | ✅ Funktioniert | Padding mit Token-Auswahl und Expand |
| **Color** | ✅ Funktioniert | BG und Text mit Color Picker und Swatches |
| **Border** | ✅ Funktioniert | Radius und Border Width/Color |
| **Typography** | ❌ Broken | Return '' - wird nie gerendert |
| **Visual** | ❌ Fehlt | Nie in Pipeline eingebunden |
| **Hover** | ❌ Fehlt | Keine UI für hover-* Properties |

### Features

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Element-Auswahl | ✅ Funktioniert | Klick in Preview zeigt Properties |
| Breadcrumb Navigation | ✅ Funktioniert | Hierarchy-Navigation |
| Token Autocomplete | ✅ Funktioniert | $ Eingabe zeigt passende Tokens |
| Padding Expand | ✅ Funktioniert | T/R/B/L einzeln editieren |
| Color Swatches | ✅ Funktioniert | Vordefinierte Farben anklicken |
| Size Presets | ✅ Funktioniert | hug/full Buttons |
| Gap Input | ✅ Funktioniert | Mit Token-Auswahl |
| Font Dropdown | ❌ Broken | Element `.pp-font-input` existiert nicht |
| Font Size Input | ❌ Broken | Element `.pp-fontsize-input` existiert nicht |
| Weight Input | ❌ Broken | Element `.pp-weight-input` existiert nicht |
| Min/Max Constraints | ❌ Fehlt | Keine UI |
| Shadow Presets | ❌ Dead Code | `renderVisualSection()` nie aufgerufen |
| Opacity Input | ❌ Dead Code | In Visual Section |
| Z-Index Input | ❌ Dead Code | In Visual Section |
| Hidden Toggle | ❌ Dead Code | In Visual Section |

## Architektur

### Dateien

```
packages/mirror-lang/src/studio/
├── property-panel.ts      # 2.900+ Zeilen, Haupt-UI-Klasse
├── property-extractor.ts  # 665 Zeilen, AST zu Properties
├── code-modifier.ts       # Source-Code Manipulation
└── selection-manager.ts   # Element-Auswahl State

studio.html                # CSS Styles (2000+ Zeilen .pp-*)
```

### Klassen

**PropertyPanel** - Monolithische UI-Klasse
- Rendering aller Sections
- Event-Handling
- Token-Parsing
- Autocomplete
- DOM-Manipulation

**PropertyExtractor** - Gut strukturiert
- AST-Analyse
- Property-Kategorisierung
- Inheritance-Auflösung

### Datenfluss

```
User klickt Element in Preview
       ↓
SelectionManager.select(nodeId)
       ↓
PropertyPanel.updatePanel(nodeId)
       ↓
PropertyExtractor.getProperties(nodeId)
       ↓
PropertyPanel.render(element)
       ↓
PropertyPanel.attachEventListeners()
```

### Rendering Pipeline

```typescript
renderCategories(categories) {
  // 1. Layout Section
  if (layoutCat) → renderLayoutToggleGroup()

  // 2. Size + Align (side by side)
  if (sizingCat) → renderSizingSection()
  if (alignmentCat) → renderAlignmentGrid()

  // 3. Spacing Section
  if (spacingCat) → renderSpacingSection()

  // 4. Color Section (always)
  renderColorSection()

  // 5. Border Section
  if (borderCat) → renderBorderSection()

  // 6. Typography Section
  if (typographyCat) → renderTypographySection() // ❌ returns ''

  // ❌ FEHLT: Visual Section
  // ❌ FEHLT: Hover Section
  // ❌ FEHLT: Other Categories
}
```

## Kritische Bugs

### Bug #1: Typography Section gibt '' zurück

**Datei:** `property-panel.ts:1119-1185`

```typescript
private renderTypographySection(category: PropertyCategory): string {
  const props = category.properties

  // ... 60 Zeilen HTML-Aufbau ...

  const fontRow = `<div class="pp-row-line">...</div>`
  const sizeRow = `<div class="pp-row-line">...</div>`
  const alignToggles = `<div class="pp-row">...</div>`

  return ''  // ❌ KRITISCH: Gibt immer leer zurück!
}
```

**Fix benötigt:**
```typescript
return `
  <div class="pp-label">Typography</div>
  ${fontRow}
  ${sizeRow}
  ${alignToggles}
`
```

### Bug #2: Visual Section nicht in Pipeline

**Datei:** `property-panel.ts:212-282`

```typescript
private renderCategories(categories: PropertyCategory[]): string {
  const visualCat = categories.find(c => c.name === 'visual')  // Extrahiert

  // ... rendering ...

  // ❌ visualCat wird NIEMALS verwendet!
  return result
}
```

**Fix benötigt:**
```typescript
// Nach Typography Section hinzufügen:
if (visualCat) {
  result += `<div class="pp-section">`
  result += this.renderVisualSection(visualCat)
  result += `</div>`
}
```

### Bug #3: Font Input Selektoren falsch

**Datei:** `property-panel.ts:1986, 2052, 2112`

```typescript
// Diese Selektoren finden keine Elemente:
showFontDropdown() {
  const fontInput = this.container.querySelector('.pp-font-input')  // ❌
}

// Auch diese:
const fontsizeInput = this.container.querySelector('.pp-fontsize-input')  // ❌
const weightInput = this.container.querySelector('.pp-weight-input')      // ❌
```

**Problem:** Die Inputs werden in `renderTypographySection()` nie erstellt (weil return '').

## Performance-Probleme

### Problem #1: Token Parsing bei jedem Input

```typescript
// Wird bei jedem Focus aufgerufen:
private getPaddingTokens(): PaddingToken[] {
  const source = this.codeModifier.getSource()  // Holt gesamten Source
  const lines = source.split('\n')              // Split
  for (const line of lines) {                   // Loop über alle Zeilen
    const match = trimmed.match(/.../)          // Regex pro Zeile
  }
}
```

**Fix:** Tokens cachen und nur bei Source-Änderung neu parsen.

### Problem #2: Volles Re-Render bei jeder Änderung

```typescript
private render(element: ExtractedElement): void {
  this.container.innerHTML = `...`  // Ersetzt ALLES
  this.attachEventListeners()       // Bindet ALLE Listener neu
}
```

**Fix:** Incremental Updates oder Virtual DOM.

## Fehlende Features

### 1. Hover Properties

Benötigte Properties laut CLAUDE.md:
- `hover-background` / `hover-bg`
- `hover-color` / `hover-col`
- `hover-opacity` / `hover-opa`
- `hover-scale`
- `hover-border` / `hover-bor`
- `hover-border-color` / `hover-boc`
- `hover-radius` / `hover-rad`

**Implementation:**
- Neue Section "Hover" nach Color
- Color Picker für hover-bg und hover-col
- Number Inputs für opacity, scale
- Oder: Inline bei jeweiliger Property (BG → Hover BG)

### 2. Typography Controls

Benötigt:
- Font Family Dropdown (Inter, System, etc.)
- Font Size Input mit Presets (12, 14, 16, 18, 24)
- Font Weight Dropdown (400, 500, 600, 700, bold)
- Text Align Toggles (left, center, right)
- Style Toggles (italic, underline, truncate, uppercase)

### 3. Visual Controls

Benötigt:
- Shadow Presets (none, sm, md, lg)
- Opacity Slider (0-1)
- Z-Index Input
- Cursor Dropdown (pointer, default, etc.)
- Hidden Toggle

### 4. Constraints

Benötigt:
- Min Width / Max Width
- Min Height / Max Height

## Code Quality Issues

### Monolithische Klasse

`PropertyPanel` hat 2.900+ Zeilen und 100+ Methoden. Sollte aufgeteilt werden:

```
PropertyPanel (Koordinator)
├── LayoutRenderer
├── SizeRenderer
├── SpacingRenderer
├── ColorRenderer
├── BorderRenderer
├── TypographyRenderer
├── VisualRenderer
└── TokenAutocomplete
```

### Duplizierter Code

Category Order ist doppelt definiert:
- `property-panel.ts:226`
- `property-extractor.ts:625`

### Dead Code

Folgende Methoden werden nie aufgerufen:
- `renderVisualSection()` (78 Zeilen)
- `renderTypographySection()` gibt immer '' zurück (66 Zeilen nutzlos)
- `renderCategory()` - nur für alignment verwendet

## CSS Organisation

**Datei:** `studio.html` (Zeilen 1900-3100)

Alle `.pp-*` Styles sind inline im HTML. Sollte extrahiert werden zu:
- `property-panel.css` oder
- In build integriert werden

## Prioritäten für Fixes

### P0 - Kritisch
1. `renderTypographySection()` - return Statement fixen
2. Visual Section in `renderCategories()` einbauen

### P1 - Hoch
3. Typography Inputs erstellen und verbinden
4. Hover Properties Section hinzufügen

### P2 - Mittel
5. Token-Parsing cachen
6. Min/Max Width/Height Controls
7. Dead Code entfernen

### P3 - Niedrig
8. Klasse aufteilen
9. CSS extrahieren
10. Performance optimieren (incremental updates)
