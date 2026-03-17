/**
 * Golden Master - Source of Truth für DOM Output
 *
 * Diese Datei definiert die ERWARTETEN CSS-Werte für alle DSL Properties.
 * Sie ist die einzige Quelle der Wahrheit für korrekte Ausgabe.
 *
 * Workflow:
 * 1. Manuell verifizieren dass Output korrekt ist
 * 2. Hier eintragen
 * 3. Schema-Tests nutzen diese Werte zur Validierung
 *
 * WICHTIG: Diese Werte wurden manuell verifiziert!
 */

export interface GoldenCase {
  /** DSL input (property line) */
  input: string
  /** Expected CSS properties */
  css: Record<string, string>
  /** Optional: specific element type needed */
  elementType?: 'frame' | 'text' | 'button' | 'input'
  /** Optional: notes about this case */
  note?: string
}

export interface GoldenCategory {
  name: string
  cases: GoldenCase[]
}

// ============================================================================
// SIZING
// ============================================================================

export const SIZING: GoldenCategory = {
  name: 'Sizing',
  cases: [
    // Width - numeric
    { input: 'w 100', css: { width: '100px' } },
    { input: 'w 200', css: { width: '200px' } },
    { input: 'w 0', css: { width: '0px' } },
    { input: 'width 150', css: { width: '150px' } },

    // Width - keywords
    { input: 'w hug', css: { width: 'fit-content' } },
    { input: 'w full', css: { flex: '1 1 0%' } },

    // Height - numeric
    { input: 'h 100', css: { height: '100px' } },
    { input: 'h 50', css: { height: '50px' } },
    { input: 'height 200', css: { height: '200px' } },

    // Height - keywords
    { input: 'h hug', css: { height: 'fit-content' } },
    { input: 'h full', css: { flex: '1 1 0%' } },

    // Size (width + height)
    { input: 'size 100', css: { width: '100px', height: '100px' } },

    // Min/Max
    { input: 'minw 100', css: { minWidth: '100px' } },
    { input: 'maxw 500', css: { maxWidth: '500px' } },
    { input: 'minh 50', css: { minHeight: '50px' } },
    { input: 'maxh 300', css: { maxHeight: '300px' } },
  ],
}

// ============================================================================
// SPACING
// ============================================================================

export const SPACING: GoldenCategory = {
  name: 'Spacing',
  cases: [
    // Padding - single value
    { input: 'pad 16', css: { padding: '16px' } },
    { input: 'p 8', css: { padding: '8px' } },
    { input: 'padding 24', css: { padding: '24px' } },

    // Padding - multiple values
    { input: 'pad 16 24', css: { padding: '16px 24px' } },
    { input: 'pad 10 20 30 40', css: { padding: '10px 20px 30px 40px' } },

    // Padding - directional (single direction)
    { input: 'pad left 16', css: { paddingLeft: '16px' } },
    { input: 'pad right 16', css: { paddingRight: '16px' } },
    { input: 'pad top 16', css: { paddingTop: '16px' } },
    { input: 'pad bottom 16', css: { paddingBottom: '16px' } },
    // Pad x/y shorthand
    { input: 'pad x 20', css: { paddingLeft: '20px', paddingRight: '20px' } },
    { input: 'pad y 20', css: { paddingTop: '20px', paddingBottom: '20px' } },

    // Margin - single value
    { input: 'margin 8', css: { margin: '8px' } },
    { input: 'm 16', css: { margin: '16px' } },

    // Margin - multiple values
    { input: 'margin 10 20', css: { margin: '10px 20px' } },

    // Margin - directional
    { input: 'margin left 16', css: { marginLeft: '16px' } },
    // Margin x auto (centering)
    { input: 'margin x auto', css: { marginLeft: 'auto', marginRight: 'auto' } },

    // Gap
    { input: 'gap 12', css: { gap: '12px' } },
    { input: 'g 8', css: { gap: '8px' } },
  ],
}

// ============================================================================
// LAYOUT
// ============================================================================

export const LAYOUT: GoldenCategory = {
  name: 'Layout',
  cases: [
    // Direction
    { input: 'horizontal', css: { display: 'flex', flexDirection: 'row' } },
    { input: 'hor', css: { display: 'flex', flexDirection: 'row' } },
    { input: 'vertical', css: { display: 'flex', flexDirection: 'column' } },
    { input: 'ver', css: { display: 'flex', flexDirection: 'column' } },

    // Alignment
    { input: 'center', css: { justifyContent: 'center', alignItems: 'center' } },
    { input: 'cen', css: { justifyContent: 'center', alignItems: 'center' } },
    { input: 'spread', css: { justifyContent: 'space-between' } },
    { input: 'left', css: { alignItems: 'flex-start' } },
    { input: 'right', css: { alignItems: 'flex-end' } },
    { input: 'top', css: { justifyContent: 'flex-start' } },
    { input: 'bottom', css: { justifyContent: 'flex-end' } },
    { input: 'hor-center', css: { alignItems: 'center' } },
    { input: 'ver-center', css: { justifyContent: 'center' } },

    // Wrap
    { input: 'wrap', css: { flexWrap: 'wrap' } },

    // Stacked
    { input: 'stacked', css: { position: 'relative' } },

    // Grid
    { input: 'grid 3', css: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' } },
    { input: 'grid 2', css: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' } },
  ],
}

// ============================================================================
// COLOR
// ============================================================================

export const COLOR: GoldenCategory = {
  name: 'Color',
  cases: [
    // Background
    { input: 'bg #FF0000', css: { background: 'rgb(255, 0, 0)' } },
    { input: 'bg #00FF00', css: { background: 'rgb(0, 255, 0)' } },
    { input: 'bg #333', css: { background: 'rgb(51, 51, 51)' } },
    { input: 'background #FFFFFF', css: { background: 'rgb(255, 255, 255)' } },

    // Text color
    { input: 'col #FFFFFF', css: { color: 'rgb(255, 255, 255)' } },
    { input: 'c #FF0000', css: { color: 'rgb(255, 0, 0)' } },
    { input: 'color #000000', css: { color: 'rgb(0, 0, 0)' } },
  ],
}

// ============================================================================
// BORDER
// ============================================================================

export const BORDER: GoldenCategory = {
  name: 'Border',
  cases: [
    // Border - basic (simple cases)
    { input: 'bor 1', css: { borderWidth: '1px' } },
    // Border with color/style - complex syntax (TODO: verify)
    // { input: 'bor 1 #333', css: { borderWidth: '1px', borderColor: 'rgb(51, 51, 51)' } },
    // { input: 'bor 2 solid #FF0000', css: { borderWidth: '2px', borderStyle: 'solid', borderColor: 'rgb(255, 0, 0)' } },
    // { input: 'bor 1 dashed #666', css: { borderStyle: 'dashed' } },

    // Border - directional
    { input: 'bor t 1 solid #333', css: { borderTopWidth: '1px' } },
    { input: 'bor b 1 solid #333', css: { borderBottomWidth: '1px' } },
    { input: 'bor l 1 solid #333', css: { borderLeftWidth: '1px' } },
    { input: 'bor r 1 solid #333', css: { borderRightWidth: '1px' } },

    // Radius - single
    { input: 'rad 8', css: { borderRadius: '8px' } },
    { input: 'rad 16', css: { borderRadius: '16px' } },
    { input: 'radius 4', css: { borderRadius: '4px' } },

    // Radius - multiple values
    { input: 'rad 4 8 12 16', css: { borderRadius: '4px 8px 12px 16px' } },

    // Radius - directional
    { input: 'rad tl 8', css: { borderTopLeftRadius: '8px' } },
    { input: 'rad tr 8', css: { borderTopRightRadius: '8px' } },
    { input: 'rad bl 8', css: { borderBottomLeftRadius: '8px' } },
    { input: 'rad br 8', css: { borderBottomRightRadius: '8px' } },
  ],
}

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const TYPOGRAPHY: GoldenCategory = {
  name: 'Typography',
  cases: [
    // Font size
    { input: 'font-size 16', css: { fontSize: '16px' }, elementType: 'text' },
    { input: 'fs 24', css: { fontSize: '24px' }, elementType: 'text' },

    // Font weight
    { input: 'weight 600', css: { fontWeight: '600' }, elementType: 'text' },
    { input: 'weight 400', css: { fontWeight: '400' }, elementType: 'text' },

    // Line height
    { input: 'line 1.5', css: { lineHeight: '1.5' }, elementType: 'text' },
    // line 24 outputs '24px' (with px unit for values > 10)
    { input: 'line 24', css: { lineHeight: '24px' }, elementType: 'text' },

    // Text transform
    { input: 'uppercase', css: { textTransform: 'uppercase' }, elementType: 'text' },
    { input: 'lowercase', css: { textTransform: 'lowercase' }, elementType: 'text' },

    // Text decoration
    { input: 'underline', css: { textDecoration: 'underline' }, elementType: 'text' },
    { input: 'italic', css: { fontStyle: 'italic' }, elementType: 'text' },

    // Text align
    { input: 'text-align center', css: { textAlign: 'center' } },
    { input: 'text-align left', css: { textAlign: 'left' } },
    { input: 'text-align right', css: { textAlign: 'right' } },

    // Truncate
    {
      input: 'truncate',
      css: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      elementType: 'text',
    },
  ],
}

// ============================================================================
// EFFECTS
// ============================================================================

export const EFFECTS: GoldenCategory = {
  name: 'Effects',
  cases: [
    // Opacity
    { input: 'opacity 0.5', css: { opacity: '0.5' } },
    { input: 'o 0.8', css: { opacity: '0.8' } },
    { input: 'opacity 1', css: { opacity: '1' } },

    // Cursor
    { input: 'cursor pointer', css: { cursor: 'pointer' } },
    { input: 'cursor grab', css: { cursor: 'grab' } },

    // Visibility
    { input: 'hidden', css: { display: 'none' } },

    // Scroll
    { input: 'scroll', css: { overflowY: 'auto' } },
    { input: 'scroll-hor', css: { overflowX: 'auto' } },

    // Clip
    { input: 'clip', css: { overflow: 'hidden' } },
  ],
}

// ============================================================================
// POSITION
// ============================================================================

export const POSITION: GoldenCategory = {
  name: 'Position',
  cases: [
    // X/Y (implies absolute)
    { input: 'x 10', css: { position: 'absolute', left: '10px' } },
    { input: 'y 20', css: { position: 'absolute', top: '20px' } },

    // Z-index
    { input: 'z 10', css: { zIndex: '10' } },
    { input: 'z 100', css: { zIndex: '100' } },
  ],
}

// ============================================================================
// TRANSFORM
// ============================================================================

export const TRANSFORM: GoldenCategory = {
  name: 'Transform',
  cases: [
    // Rotate
    { input: 'rotate 45', css: { transform: 'rotate(45deg)' } },
    { input: 'rot 90', css: { transform: 'rotate(90deg)' } },

    // Scale
    { input: 'scale 1.5', css: { transform: 'scale(1.5)' } },
    { input: 'scale 0.5', css: { transform: 'scale(0.5)' } },
  ],
}

// ============================================================================
// ALL CATEGORIES
// ============================================================================

export const ALL_CATEGORIES: GoldenCategory[] = [
  SIZING,
  SPACING,
  LAYOUT,
  COLOR,
  BORDER,
  TYPOGRAPHY,
  EFFECTS,
  POSITION,
  TRANSFORM,
]

// ============================================================================
// STATS
// ============================================================================

export function getGoldenStats() {
  const total = ALL_CATEGORIES.reduce((sum, cat) => sum + cat.cases.length, 0)
  return {
    categories: ALL_CATEGORIES.length,
    totalCases: total,
    byCategory: ALL_CATEGORIES.map((cat) => ({
      name: cat.name,
      count: cat.cases.length,
    })),
  }
}
