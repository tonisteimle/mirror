# Property Panel Erweiterung

> **Status:** ✅ Abgeschlossen (Hohe + Mittlere Priorität)

## Übersicht

Das Property Panel zeigt Eigenschaften des selektierten Elements und ermöglicht deren Bearbeitung. Dieses Dokument beschreibt fehlende Features und den Implementierungsplan.

## Aktuelle Sektionen

| Sektion | Status | Inhalt |
|---------|--------|--------|
| Behavior | ✅ Aktiv | Zag-Component Properties |
| Layout | ✅ Aktiv | Mode (hor/ver/grid/stacked), Gap, Wrap, Align |
| Size | ✅ Aktiv | Width, Height (mit hug/full), Min/Max (expandierbar) |
| Spacing | ✅ Aktiv | Padding + Margin (H/V, expandierbar) |
| Radius & Border | ✅ Aktiv | Radius, Border-Width, Border-Color |
| Color | ✅ Aktiv | Background, Text |
| Typography | ✅ Aktiv | Font, Size, Weight, Align, Italic, Underline, Truncate |
| Icon | ✅ Aktiv | Size, Color, Weight, Fill (nur für Icon-Elemente) |
| Visual | ✅ Aktiv | Shadow, Opacity, Cursor, Z-Index, Overflow, Visibility |
| Hover | ❌ Nicht relevant | hover: wird als State-Block definiert |
| Interactions | ✅ Aktiv | toggle, exclusive, select |
| Events | ✅ Aktiv | onclick, onhover, etc. |
| States/Actions | ✅ Aktiv | State-Definitionen |

## Fehlende Properties

### Hohe Priorität (Erledigt ✅)

| Property | Alias | Kategorie | Status |
|----------|-------|-----------|--------|
| `shadow` | - | Visual | ✅ Implementiert |
| `opacity` | `o`, `opa` | Visual | ✅ Implementiert |
| `cursor` | - | Visual | ✅ Implementiert |
| `margin` | `m` | Spacing | ✅ Implementiert |
| `scroll` | `scroll-ver` | Visual | ✅ Implementiert |
| `scroll-hor` | - | Visual | ✅ Implementiert |
| `clip` | - | Visual | ✅ Implementiert |

### Mittlere Priorität (Erledigt ✅)

| Property | Alias | Kategorie | Status |
|----------|-------|-----------|--------|
| `icon-size` | `is` | Icon | ✅ Implementiert |
| `icon-color` | `ic` | Icon | ✅ Implementiert |
| `fill` | - | Icon | ✅ Implementiert |

### Niedrigere Priorität

| Property | Alias | Kategorie | Status |
|----------|-------|-----------|--------|
| `min-width` | `minw` | Sizing | ✅ Implementiert |
| `max-width` | `maxw` | Sizing | ✅ Implementiert |
| `min-height` | `minh` | Sizing | ✅ Implementiert |
| `max-height` | `maxh` | Sizing | ✅ Implementiert |
| `truncate` | - | Typography | ✅ Implementiert |
| `uppercase` | - | Typography | ⏳ Nicht priorisiert |
| `line` | - | Typography | ⏳ Nicht priorisiert |

## Sektionen-Reihenfolge (Ziel)

```
┌─────────────────────────────────────────┐
│ 1. Behavior     (nur Zag-Komponenten)   │
├─────────────────────────────────────────┤
│ 2. Layout       Mode, Gap, Wrap, Align  │
├─────────────────────────────────────────┤
│ 3. Size         Width, Height           │
│                 + Min/Max (expandierbar)│ ✅
├─────────────────────────────────────────┤
│ 4. Spacing      Padding (existiert)     │
│                 + Margin (NEU)          │
├─────────────────────────────────────────┤
│ 5. Radius & Border                      │
├─────────────────────────────────────────┤
│ 6. Color        Background, Text        │
├─────────────────────────────────────────┤
│ 7. Typography   (für Text-Elemente)     │
│                 + truncate              │ ✅
├─────────────────────────────────────────┤
│ 8. Icon         (nur für Icon-Elemente) │
│                 is, ic, fill            │
├─────────────────────────────────────────┤
│ 9. Visual       Shadow, Opacity, Cursor │
│                 Z-Index, Scroll, Clip   │
│                 Hidden/Visible/Disabled │
├─────────────────────────────────────────┤
│ 10. Hover       hover-bg, hover-col     │
│                 hover-opacity, scale    │
├─────────────────────────────────────────┤
│ ─────────── Divider ─────────────────── │
├─────────────────────────────────────────┤
│ 11. Interactions                        │
├─────────────────────────────────────────┤
│ 12. Events                              │
├─────────────────────────────────────────┤
│ 13. States/Actions                      │
└─────────────────────────────────────────┘
```

## Review: Bestehende Implementierung

### Visual Section (`renderVisualSection`)

**Positiv:**
- Logik vollständig implementiert
- Event-Handler existieren (`handleShadowToggle`, `handleOpacityPreset`, `handleVisibilityToggle`)
- CSS-Styles vorhanden (`.pp-visual-*`)
- Icons definiert (shadow-none/sm/md/lg, hidden, visible, disabled)

**Probleme:**

1. **Inkonsistente CSS-Klassen**
   ```
   Visual Section: .pp-visual-row, .pp-visual-label
   Hover Section:  .pp-prop-row, .pp-prop-label
   Rest des Panels: .prop-row, .prop-label
   ```
   → Drei verschiedene Naming-Patterns

2. **Visibility-Row ohne Label**
   ```html
   <div class="pp-visual-row">
     <div class="pp-visibility-group">  <!-- kein Label -->
       ${visibilityToggles}
     </div>
   </div>
   ```

3. **Fehlende Scroll/Clip Controls**

### Hover Section (`renderHoverSection`)

**Positiv:**
- Farb-Picker integriert
- Token-Auflösung funktioniert
- Event-Handler vorhanden

**Probleme:**

1. **Scale-Presets nicht verwendet**
   ```typescript
   // Existiert, wird aber nicht gerendert:
   private readonly HOVER_SCALE_PRESETS = ['0.95', '1', '1.02', '1.05', '1.1']
   ```

2. **Border-Parsing fehleranfällig**
   ```typescript
   const currentBorderWidth = hoverBorValue.split(' ')[0] || '0'
   ```

## Implementierungsplan

### Phase 1: Visual Section refactoren ✅

1. ✅ CSS-Klassen vereinheitlichen auf `.prop-row` / `.prop-label`
2. ✅ Visibility-Row: Label "Visibility" hinzufügen
3. ✅ Scroll/Clip Toggles ergänzen (scroll, scroll-hor, clip)

**Dateien:**
- `studio/panels/property-panel.ts` - `renderVisualSection()`
- `compiler/studio/property-extractor.ts` - visual-Kategorie erweitert

### Phase 2: Hover Section ❌ (Nicht relevant)

Mirror verwendet `hover:` State-Blöcke statt inline hover-Properties. Eine Hover Section im Property Panel macht daher keinen Sinn.

### Phase 3: Visual Section einbinden ✅

Visual Section ist in `renderCategories()` eingebunden.

### Phase 4: Margin zu Spacing hinzufügen ✅

1. ✅ `renderSpacingSection()` erweitert
2. ✅ Margin mit gleichem Pattern wie Padding (H/V, expandierbar zu T/R/B/L)
3. ✅ Event-Handler für Margin-Inputs (`handleMarginInputChange`, `handleMarginTokenBtnClick`)
4. ✅ `getMarginTokens()` Methode hinzugefügt

**Dateien:**
- `studio/panels/property-panel.ts` - `renderSpacingSection()`, neue Handler
- `compiler/studio/property-extractor.ts` - margin/m bereits in spacing-Kategorie

### Phase 5: Icon Section implementieren ✅

1. ✅ Neue `renderIconSection()` Methode
2. ✅ Kontextuell nur für Icon-Elemente anzeigen
3. ✅ Properties: is (icon-size), ic (icon-color), iw (icon-weight), fill (toggle)
4. ✅ Size-Presets (14, 16, 18, 20, 24, 32)
5. ✅ Color-Picker Integration
6. ✅ Event-Handler (`handleIconSizeClick`, `handleIconFillToggle`)

**Dateien:**
- `studio/panels/property-panel.ts` - `renderIconSection()`, Handler
- `compiler/studio/property-extractor.ts` - Icon-Kategorie vorhanden

### Phase 6: Min/Max und Truncate hinzufügen ✅

1. ✅ Size Section erweitert mit Min/Max (expandierbar)
   - `minw`, `maxw`, `minh`, `maxh` als expandierbarer Bereich
   - Expand-Button mit chevron-Icon
   - Auto-Expand wenn Werte vorhanden
2. ✅ Typography Section erweitert mit Truncate-Toggle
   - Truncate-Icon neben italic/underline

**Dateien:**
- `studio/panels/property-panel.ts` - `renderSizingSection()`, `renderTypographySection()`

## CSS-Klassen Konvention (Ziel)

Nach dem Refactoring sollen alle Sektionen diese Klassen verwenden:

| Klasse | Verwendung |
|--------|------------|
| `.section` | Section-Container |
| `.section-label` | Section-Überschrift |
| `.section-content` | Section-Inhalt |
| `.prop-row` | Property-Zeile |
| `.prop-label` | Property-Label (links) |
| `.prop-content` | Property-Controls (rechts) |
| `.prop-input` | Text-Input |
| `.toggle-group` | Gruppe von Toggle-Buttons |
| `.toggle-btn` | Einzelner Toggle-Button |
| `.token-group` | Gruppe von Token-Buttons |
| `.token-btn` | Einzelner Token-Button |

## Offene Fragen (Beantwortet)

1. ~~**Min/Max in Size Section** - Als expandierbarer Bereich oder eigene Section?~~
   → ✅ Expandierbarer Bereich innerhalb Size Section
2. ~~**Typography-Erweiterungen** - uppercase/truncate als Toggles neben italic/underline?~~
   → ✅ truncate als Toggle, uppercase nicht priorisiert
3. ~~**Scroll-Controls** - Drei Toggles (ver/hor/both) oder Dropdown?~~
   → ✅ Bereits als Toggles in Visual Section implementiert
