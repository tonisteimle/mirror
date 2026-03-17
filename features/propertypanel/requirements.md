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
| **Typography** | ✅ Funktioniert | Font, Size, Weight, Align, Style |
| **Visual** | ⚠️ Nicht aktiviert | Code vorhanden, bewusst nicht eingebunden |
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
| Font Dropdown | ✅ Funktioniert | Mit Presets (Inter, SF Pro, etc.) |
| Font Size Input | ✅ Funktioniert | Mit Token-Presets (xs, s, m, l, xl) |
| Weight Input | ✅ Funktioniert | Dropdown 100-900 |
| Text Align | ✅ Funktioniert | Icon-Toggles (left, center, right) |
| Text Style | ✅ Funktioniert | Italic, Underline Toggles |
| Min/Max Constraints | ❌ Fehlt | Keine UI |
| Shadow Presets | ⚠️ Nicht aktiviert | Code vorhanden in `renderVisualSection()` |
| Opacity Input | ⚠️ Nicht aktiviert | In Visual Section |
| Z-Index Input | ⚠️ Nicht aktiviert | In Visual Section |
| Hidden Toggle | ⚠️ Nicht aktiviert | In Visual Section |

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

## Bekannte Probleme

### ✅ GEFIXT: Font Input Selektoren falsch

**Datei:** `property-panel.ts:1657, 1668, 1674`

**Problem:** CSS-Klassen im Rendering stimmten nicht mit Event-Handler-Selektoren überein.

**Fix:** CSS-Klassen angepasst:
```typescript
// Vorher:
<select class="prop-select" data-prop="font">
<input class="prop-input" data-prop="font-size">
<select class="prop-select" data-prop="weight">

// Nachher:
<select class="pp-font-input" data-prop="font">
<input class="pp-fontsize-input" data-prop="font-size">
<select class="pp-weight-input" data-prop="weight">
```

**Status:** ✅ Gefixt

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

### 2. Visual Controls (bewusst nicht implementiert)

Die `renderVisualSection()` Methode existiert, wird aber bewusst nicht in `renderCategories()` aufgerufen.

**Existierende Implementierung umfasst:**
- Shadow Presets (none, sm, md, lg)
- Opacity Slider (0-1)
- Z-Index Input
- Cursor Dropdown (pointer, default, etc.)
- Hidden Toggle

**Status:** Code vorhanden, aber nicht aktiviert.

### 3. Constraints

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

### Ungenutzter Code

Folgende Methoden existieren aber werden nie aufgerufen:
- `renderVisualSection()` (78 Zeilen) - bewusst nicht aktiviert

## CSS Organisation

**Datei:** `studio.html` (Zeilen 1900-3100)

Alle `.pp-*` Styles sind inline im HTML. Sollte extrahiert werden zu:
- `property-panel.css` oder
- In build integriert werden

## Prioritäten für Verbesserungen

### P0 - Hoch
1. ✅ ~~Typography Input Selektoren fixen~~ (GEFIXT)

### P1 - Mittel
2. Hover Properties Section hinzufügen
3. Min/Max Width/Height Controls
4. Token-Parsing cachen

### P2 - Niedrig
5. Visual Section aktivieren (optional)
6. Klasse aufteilen (Refactoring)
7. CSS extrahieren
8. Performance optimieren (incremental updates)
