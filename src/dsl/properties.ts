/**
 * @module dsl/properties
 * @description Single Source of Truth für alle DSL Properties
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PROPERTY-MAPPINGS (Short ↔ Long)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @category Layout
 * @property hor ↔ horizontal       Horizontale Ausrichtung (row)
 * @property ver ↔ vertical         Vertikale Ausrichtung (column)
 * @property cen ↔ center           Zentrierung (beide Achsen)
 *
 * @category Sizing
 * @property w ↔ width              Breite (px oder %)
 * @property h ↔ height             Höhe (px oder %)
 * @property minw ↔ min-width       Mindestbreite
 * @property maxw ↔ max-width       Maximalbreite
 * @property minh ↔ min-height      Mindesthöhe
 * @property maxh ↔ max-height      Maximalhöhe
 *
 * @category Spacing
 * @property p, pad ↔ padding       Innenabstand
 * @property m, mar ↔ margin        Außenabstand
 * @property g ↔ gap                Abstand zwischen Kindern
 *
 * @category Colors
 * @property c, col ↔ color         Textfarbe
 * @property bg ↔ background        Hintergrundfarbe
 * @property boc ↔ border-color     Rahmenfarbe
 *
 * @category Border
 * @property bor ↔ border           Rahmen (Breite)
 * @property rad ↔ radius           Eckenradius
 *
 * @category Visual
 * @property o, opa, op ↔ opacity   Transparenz (0-1)
 * @property rot ↔ rotate           Rotation (Grad)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * RICHTUNGEN (Directions)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @direction l = left              Links
 * @direction r = right             Rechts
 * @direction u, t = top            Oben (u=up, t=top)
 * @direction d, b = bottom         Unten (d=down, b=bottom)
 *
 * @combo l-r = left + right        Kombiniert links UND rechts
 * @combo u-d, t-b = top + bottom   Kombiniert oben UND unten
 *
 * @internal Intern immer u/d/l/r (t→u, b→d normalisiert)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ECKEN (Corners) - für radius
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @corner tl = top-left            Oben links
 * @corner tr = top-right           Oben rechts
 * @corner bl = bottom-left         Unten links
 * @corner br = bottom-right        Unten rechts
 *
 * @edge t = tl + tr                Beide oberen Ecken
 * @edge b = bl + br                Beide unteren Ecken
 * @edge l = tl + bl                Beide linken Ecken
 * @edge r = tr + br                Beide rechten Ecken
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ALIGNMENT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @align hor-l, horizontal-left    Links ausrichten
 * @align hor-cen, horizontal-center Horizontal zentrieren
 * @align hor-r, horizontal-right   Rechts ausrichten
 * @align ver-t, vertical-top       Oben ausrichten
 * @align ver-cen, vertical-center  Vertikal zentrieren
 * @align ver-b, vertical-bottom    Unten ausrichten
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * HOVER-PROPERTIES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @hover hover-col ↔ hover-color          Textfarbe bei Hover
 * @hover hover-bg ↔ hover-background      Hintergrund bei Hover
 * @hover hover-boc ↔ hover-border-color   Rahmenfarbe bei Hover
 * @hover hover-bor ↔ hover-border         Rahmen bei Hover
 * @hover hover-rad ↔ hover-radius         Radius bei Hover
 * @hover hover-opa ↔ hover-opacity        Transparenz bei Hover
 * @hover hover-scale                      Skalierung bei Hover
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * STATES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @system-states hover, focus, active, disabled
 *   Automatisch vom Browser/System getriggert
 *
 * @behavior-states highlighted, selected, active, inactive,
 *                   expanded, collapsed, valid, invalid
 *   Durch Actions aktiviert (highlight, select, change, etc.)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EVENTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @event onclick                   Klick
 * @event onclick-outside           Klick außerhalb
 * @event onhover                   Hover
 * @event onfocus                   Fokus erhalten
 * @event onblur                    Fokus verloren
 * @event onchange                  Wert geändert (nach Blur)
 * @event oninput                   Wert geändert (während Eingabe)
 * @event onload                    Komponente geladen
 * @event onkeydown KEY             Taste gedrückt
 * @event onkeyup KEY               Taste losgelassen
 *
 * @keys escape, enter, tab, space, arrow-up, arrow-down,
 *       arrow-left, arrow-right, backspace, delete, home, end
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ACTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @action toggle                   State umschalten
 * @action show Target              Element anzeigen
 * @action hide Target              Element verstecken
 * @action open Target [pos] [anim] [ms]  Overlay öffnen
 * @action close                    Overlay schließen
 * @action page Target              Seite wechseln
 * @action change self to State     State ändern
 * @action assign $var to expr      Variable zuweisen
 * @action alert "message"          Alert anzeigen
 * @action highlight Target         Hervorheben
 * @action select Target            Auswählen
 * @action deselect Target          Auswahl aufheben
 * @action clear-selection          Alle Auswahlen löschen
 * @action focus Target             Fokus setzen
 * @action filter Container         Liste filtern
 * @action activate Target          Aktivieren
 * @action deactivate Target        Deaktivieren
 * @action deactivate-siblings      Geschwister deaktivieren
 * @action toggle-state             State umschalten
 * @action validate Target          Formular validieren
 * @action reset Target             Formular zurücksetzen
 *
 * @targets self, next, prev, first, last, highlighted, selected
 * @positions below, above, left, right, center
 * @animations fade, scale, slide-up, slide-down, slide-left, slide-right
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ============================================
// Property Name Mappings (Short → Long)
// ============================================

// Maps short property names to their full, readable forms
export const PROPERTY_LONG_FORMS: Record<string, string> = {
  // Layout
  'hor': 'horizontal',
  'ver': 'vertical',
  'vert': 'vertical',  // Alternative short form
  'cen': 'center',
  // Sizing
  'w': 'width',
  'h': 'height',
  'minw': 'min-width',
  'maxw': 'max-width',
  'minh': 'min-height',
  'maxh': 'max-height',
  // Spacing
  'p': 'padding',
  'pad': 'padding',
  'm': 'margin',
  'mar': 'margin',
  'g': 'gap',
  // CSS-style directional shorthands (for LLM compatibility)
  'pt': 'padding-top',
  'pb': 'padding-bottom',
  'pl': 'padding-left',
  'pr': 'padding-right',
  'mt': 'margin-top',
  'mb': 'margin-bottom',
  'ml': 'margin-left',
  'mr': 'margin-right',
  // Colors
  'c': 'color',
  'col': 'color',
  'bg': 'background',
  'boc': 'border-color',
  // Border
  'rad': 'radius',
  'bor': 'border',
  // Typography
  'ts': 'text-size',
  'fs': 'text-size',  // backwards compatibility
  // Icon
  'is': 'icon-size',
  'iw': 'icon-weight',
  'ic': 'icon-color',
  // Visuals
  'o': 'opacity',
  'opa': 'opacity',
  'op': 'opacity',
  // Transform
  'rot': 'rotate',
  // Hover states
  'hover-col': 'hover-color',
  'hover-bg': 'hover-background',
  'hover-boc': 'hover-border-color',
  'hover-bor': 'hover-border',
  'hover-rad': 'hover-radius',
  'hover-opa': 'hover-opacity',
  // Alignment (horizontal) - short forms
  'hor-l': 'horizontal-left',
  'hor-cen': 'horizontal-center',
  'hor-r': 'horizontal-right',
  // Alignment (horizontal) - new ausgeschriebene Formen
  'left': 'horizontal-left',
  'right': 'horizontal-right',
  'hor-center': 'horizontal-center',
  // Alignment (vertical) - short forms
  'ver-t': 'vertical-top',
  'ver-cen': 'vertical-center',
  'ver-b': 'vertical-bottom',
  // Alignment (vertical) - new ausgeschriebene Formen
  'top': 'vertical-top',
  'bottom': 'vertical-bottom',
  'ver-center': 'vertical-center',
  // Distribution - new alias
  'spread': 'between',
  // Sizing keywords - new aliases
  'hug': 'min',  // hug = fit-content
  'full': 'max', // full = 100% + flex-grow (was already implied, now explicit)
}

// Reverse mapping: Long → Short (for internal storage compatibility)
export const PROPERTY_SHORT_FORMS: Record<string, string> = Object.fromEntries(
  Object.entries(PROPERTY_LONG_FORMS).map(([short, long]) => [long, short])
)

// Direction mappings (Short → Long)
export const DIRECTION_LONG_FORMS: Record<string, string> = {
  'u': 'top',
  't': 'top',
  'd': 'bottom',
  'b': 'bottom',
  'l': 'left',
  'r': 'right',
}

// Reverse mapping: Long direction → Short (for internal storage)
export const DIRECTION_SHORT_FORMS: Record<string, string> = {
  'top': 'u',
  'bottom': 'd',
  'left': 'l',
  'right': 'r',
}

// Corner direction mappings for radius (Short → Long)
export const CORNER_LONG_FORMS: Record<string, string> = {
  'tl': 'top-left',
  'tr': 'top-right',
  'bl': 'bottom-left',
  'br': 'bottom-right',
}

// Reverse mapping: Long corner → Short
export const CORNER_SHORT_FORMS: Record<string, string> = {
  'top-left': 'tl',
  'top-right': 'tr',
  'bottom-left': 'bl',
  'bottom-right': 'br',
}

// All corner directions (both short and long forms)
export const CORNER_DIRECTIONS = new Set([
  'tl', 'tr', 'bl', 'br',
  'top-left', 'top-right', 'bottom-left', 'bottom-right'
])

// All known properties (both short and long forms accepted)
// Editor expands shortcuts to long forms for readability
export const PROPERTIES = new Set([
  // Layout - both forms
  // Note: 'center' is also in POSITION_KEYWORDS for overlays, but the parser
  // handles context-dependent interpretation (property vs position)
  'hor', 'horizontal', 'ver', 'vert', 'vertical', 'cen', 'center',
  'gap', 'gap-x', 'gap-y', 'gap-col', 'gap-row', 'between', 'wrap', 'grow', 'shrink', 'fill', 'grid', 'rows', 'stacked',
  // Data binding
  'data',
  // Alignment - all forms (short, ausgeschrieben, hyphenated)
  'hor-l', 'horizontal-left', 'hor-cen', 'horizontal-center', 'hor-r', 'horizontal-right',
  'ver-t', 'vertical-top', 'ver-cen', 'vertical-center', 'ver-b', 'vertical-bottom',
  'left', 'right', 'hor-center',  // NEU: ausgeschriebene Horizontal-Alignment
  'top', 'bottom', 'ver-center',  // NEU: ausgeschriebene Vertical-Alignment
  'spread',  // NEU: Alias für between
  'centered',  // Horizontal centering (margin auto)
  // Sizing - both forms
  'w', 'width', 'h', 'height',
  // Combined sizing shorthand: w-min, w-max, h-min, h-max
  'w-min', 'w-max', 'h-min', 'h-max',
  'minw', 'min-width', 'maxw', 'max-width', 'minh', 'min-height', 'maxh', 'max-height',
  // Sizing keywords: 'min' (fit-content), 'max' (100% + flex-grow), 'full' (legacy → max), 'hug' (alias for min)
  'min', 'max', 'full', 'hug',
  // Spacing - both forms
  'p', 'pad', 'padding', 'm', 'mar', 'margin', 'g',
  // CSS-style directional spacing shorthands (for LLM compatibility)
  'pt', 'pb', 'pl', 'pr', 'mt', 'mb', 'ml', 'mr',
  'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
  'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
  // Colors - both forms
  'c', 'col', 'color', 'bg', 'background', 'boc', 'border-color',
  // Border - both forms
  'rad', 'radius', 'bor', 'border',
  // Typography
  'text-size', 'ts', 'fs', 'weight', 'font', 'line', 'text-align', 'align', 'italic', 'underline', 'lowercase', 'uppercase', 'truncate',
  // Icon properties
  'icon-size', 'is',
  'icon-weight', 'iw',
  'icon-color', 'ic',
  'fill',  // Material Icons filled variant
  // Combined dimensions shorthand
  'size',
  // Form inputs
  'placeholder', 'type', 'disabled', 'visible', 'rows',
  // Segment (masked input)
  'length', 'pattern', 'mask', 'segments',
  // Link attributes
  'href', 'target',
  // Slider/Range
  'min', 'max', 'step', 'value',
  // Visuals - both forms
  'o', 'opa', 'op', 'opacity',
  'src', 'alt', 'fit', 'shadow', 'cursor', 'pointer', 'z', 'hidden', 'shortcut', 'material', 'phosphor',
  // Transform (note: 'scale' is in ANIMATION_KEYWORDS, so not listed here)
  'rot', 'rotate', 'translate',
  // Overflow / Scroll - both forms
  'scroll', 'scroll-ver', 'scroll-vertical', 'scroll-hor', 'scroll-horizontal', 'scroll-both', 'snap', 'clip',
  // Hover states - both forms
  'hover-col', 'hover-color', 'hover-bg', 'hover-background',
  'hover-boc', 'hover-border-color', 'hover-bor', 'hover-border',
  'hover-rad', 'hover-radius', 'hover-opa', 'hover-opacity', 'hover-scale',
])

// Border styles for compound border property
// Note: 'none' is not included - to remove a border, simply don't use bor
export const BORDER_STYLES = new Set(['solid', 'dashed', 'dotted'])

// Properties that can take direction modifiers (both forms)
export const DIRECTIONAL_PROPERTIES = new Set([
  'p', 'pad', 'padding',
  'm', 'mar', 'margin',
  'bor', 'border'
])

// Direction values for spacing/border (short forms only as tokens)
// Long forms (left, right, top, bottom) are handled as COMPONENT_NAME
// to avoid conflicts with position keywords for overlays
export const DIRECTIONS = new Set([
  'l', 'r', 'u', 'd', 't', 'b'
])

// Short directions only (for regex matching)
export const SHORT_DIRECTIONS = new Set(['l', 'r', 'u', 'd', 't', 'b'])

// Long directions (for normalization, not tokenization)
export const LONG_DIRECTIONS = new Set(['left', 'right', 'top', 'bottom'])

// Check if a string is a valid direction or combo
// Supports: l, left, l-r, left-right, top-bottom, etc.
// EXCLUDES corner directions (tl, tr, bl, br) which are used for radius
export function isDirectionOrCombo(value: string): boolean {
  // Exclude corner directions - these are for radius, not padding/margin
  if (CORNER_DIRECTIONS.has(value)) return false

  // Single direction (short or long)
  if (DIRECTIONS.has(value)) return true

  // Combo with hyphen: u-d, l-r, t-b, left-right, top-bottom, etc.
  if (value.includes('-')) {
    const parts = value.split('-')
    return parts.every(p => DIRECTIONS.has(p))
  }

  // Combo without hyphen (short forms only): ud, lr, udlr, tb
  // But NOT corner combos like tl, tr, bl, br
  if (/^[lrudtb]+$/.test(value)) {
    // Exclude corner patterns: tl, tr, bl, br (and their reverses lt, rt, lb, rb)
    const cornerPatterns = ['tl', 'lt', 'tr', 'rt', 'bl', 'lb', 'br', 'rb']
    if (cornerPatterns.includes(value)) return false
    return value.length > 0
  }

  return false
}

// Normalize direction to internal short form for storage
// top/t → u, bottom/b → d, left → l, right → r
export function normalizeDirection(dir: string): string {
  // Long forms
  if (dir === 'top') return 'u'
  if (dir === 'bottom') return 'd'
  if (dir === 'left') return 'l'
  if (dir === 'right') return 'r'
  // Short form aliases
  if (dir === 't') return 'u'
  if (dir === 'b') return 'd'
  return dir
}

// Convert direction to long form for display
export function directionToLongForm(dir: string): string {
  const normalized = normalizeDirection(dir)
  return DIRECTION_LONG_FORMS[normalized] || dir
}

// Split direction combo into individual directions (normalized to short form)
export function splitDirectionCombo(value: string): string[] {
  if (value.includes('-')) {
    return value.split('-').filter(p => DIRECTIONS.has(p)).map(normalizeDirection)
  }
  // For short combos like 'ud', 'lr'
  if (/^[lrudtb]+$/.test(value)) {
    return value.split('').filter(p => SHORT_DIRECTIONS.has(p)).map(normalizeDirection)
  }
  // Single long direction
  if (LONG_DIRECTIONS.has(value)) {
    return [normalizeDirection(value)]
  }
  return []
}

// Convert direction combo to long form for display
// e.g., 'l-r' → 'left-right', 'u-d' → 'top-bottom'
export function directionComboToLongForm(value: string): string {
  const parts = splitDirectionCombo(value)
  return parts.map(p => DIRECTION_LONG_FORMS[p] || p).join('-')
}

// Properties by type (both short and long forms)
export const BOOLEAN_PROPERTIES = new Set([
  // Short forms
  'hor', 'ver', 'vert', 'cen',
  'hor-l', 'hor-cen', 'hor-r', 'ver-t', 'ver-cen', 'ver-b',
  // Long forms
  'horizontal', 'vertical', 'center',
  'horizontal-left', 'horizontal-center', 'horizontal-right',
  'vertical-top', 'vertical-center', 'vertical-bottom',
  // NEU: ausgeschriebene Alignment-Formen
  'left', 'right', 'hor-center',
  'top', 'bottom', 'ver-center',
  'spread',  // Alias für between
  // Sizing keywords (standalone): min = fit-content, max = 100% + flex-grow
  'min', 'max', 'hug',  // hug ist Alias für min
  // Combined sizing shorthand: w-min, w-max, h-min, h-max
  'w-min', 'w-max', 'h-min', 'h-max',
  // Legacy sizing (kept for backwards compatibility, now equivalent to 'max')
  'full', 'grow', 'fill',
  // Horizontal centering (margin auto)
  'centered',
  // Common
  'between', 'wrap', 'stacked',
  'italic', 'underline', 'lowercase', 'uppercase', 'truncate',
  'hidden', 'visible',
  'mask',  // Segment (masked input) - hide characters
  'material',  // Switch to Material Icons
  'phosphor',  // Switch to Phosphor Icons
  'fill',      // Material Icons filled variant (default: outlined)
])

export const COLOR_PROPERTIES = new Set([
  // Short forms
  'c', 'col', 'bg', 'boc', 'ic',
  'hover-col', 'hover-bg', 'hover-boc',
  // Long forms
  'color', 'background', 'border-color', 'icon-color',
  'hover-color', 'hover-background', 'hover-border-color'
])

export const NUMBER_PROPERTIES = new Set([
  // Short forms
  'w', 'h', 'minw', 'maxw', 'minh', 'maxh',
  'p', 'pad', 'm', 'mar', 'g', 'rad', 'bor',
  'o', 'opa', 'op',
  'hover-bor', 'hover-rad',
  // Long forms
  'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
  'padding', 'margin', 'radius', 'border',
  'opacity',
  'hover-border', 'hover-radius',
  // Common
  'gap', 'gap-col', 'gap-row', 'shrink',
  'size', 'weight', 'line', 'z',
  'hover-opa', 'hover-opacity', 'hover-scale',
  // Transform
  'rot', 'rotate',
  'min', 'max', 'step', 'value', 'rows',
  'length', 'segments',  // Segment (masked input)
  // Icon weight
  'icon-weight', 'iw'
])

export const STRING_PROPERTIES = new Set(['font', 'src', 'alt', 'fit', 'text-align', 'align', 'cursor', 'pointer', 'shadow', 'href', 'target', 'placeholder', 'type', 'pattern', 'shortcut'])

// ============================================
// Property Normalization Functions
// ============================================

/**
 * Normalize a property name to its short form for internal storage.
 * This ensures backward compatibility with existing code.
 * e.g., 'padding' → 'pad', 'horizontal' → 'hor'
 */
export function normalizePropertyToShort(prop: string): string {
  return PROPERTY_SHORT_FORMS[prop] || prop
}

/**
 * Convert a property name to its long, readable form for display.
 * e.g., 'pad' → 'padding', 'hor' → 'horizontal'
 */
export function propertyToLongForm(prop: string): string {
  return PROPERTY_LONG_FORMS[prop] || prop
}

/**
 * Normalize a full property with direction to short form.
 * e.g., 'padding top' → 'pad_u', 'margin left-right' → 'mar_l-r'
 */
export function normalizePropertyWithDirection(prop: string, direction?: string): string {
  const shortProp = normalizePropertyToShort(prop)
  if (!direction) return shortProp

  // Normalize direction(s)
  const dirs = splitDirectionCombo(direction)
  if (dirs.length === 0) return shortProp

  return `${shortProp}_${dirs.join('-')}`
}

/**
 * Convert a property_direction to long form for display.
 * e.g., 'pad_u' → 'padding top', 'mar_l-r' → 'margin left-right'
 */
export function propertyWithDirectionToLongForm(prop: string): string {
  // Check for underscore-separated direction
  const underscoreIndex = prop.indexOf('_')
  if (underscoreIndex === -1) {
    return propertyToLongForm(prop)
  }

  const baseProp = prop.substring(0, underscoreIndex)
  const direction = prop.substring(underscoreIndex + 1)

  const longProp = propertyToLongForm(baseProp)
  const longDir = directionComboToLongForm(direction)

  return `${longProp} ${longDir}`
}

// Property keyword values - valid keyword values for certain properties
// These are accepted as COMPONENT_NAME tokens but should be consumed as property values
export const PROPERTY_KEYWORD_VALUES = new Set([
  // Shadow sizes
  'sm', 'md', 'lg', 'xl', 'xs', '2xl', '3xl', 'none',
  // Fit values (for Image)
  'cover', 'contain', 'fill', 'none', 'scale-down',
  // Cursor values
  'pointer', 'default', 'text', 'move', 'grab', 'grabbing', 'not-allowed', 'wait', 'crosshair',
  // Align values
  'left', 'center', 'right', 'justify',
  // Input types
  'email', 'password', 'text', 'number', 'tel', 'url', 'search', 'date', 'time', 'datetime-local',
  // Segment types (for masked input)
  'digits', 'alpha', 'alphanumeric',
  // Link targets
  '_blank', '_self', '_parent', '_top'
])

// Keywords
export const KEYWORDS = new Set(['after', 'before', 'from', 'as', 'named'])

// Type Keywords - REMOVED
// Previously contained 'box' and 'text' but these were never used
// and conflicted with common component names

// Action Keywords (for state changes and interactions)
export const ACTION_KEYWORDS = new Set([
  'open', 'close', 'toggle', 'change', 'to', 'page', 'show', 'hide', 'assign', 'alert',
  // External function calls
  'call',
  // Behavior actions (for dropdowns, lists, etc.)
  'highlight', 'select', 'filter',
  // Selection management
  'deselect', 'clear-selection',
  // Activation (for tabs, toggle groups)
  'activate', 'deactivate', 'deactivate-siblings',
  // State toggle (for accordions)
  'toggle-state',
  // Validation
  'validate', 'reset',
  // Focus management (for segments/forms)
  'focus'
])

// Special targets for behavior actions
export const BEHAVIOR_TARGETS = new Set([
  'self',           // Target the current element
  'next',           // highlight next in list
  'prev',           // highlight prev in list
  'first',          // highlight first in list
  'last',           // highlight last in list
  'first-empty',    // focus first empty segment
  'highlighted',    // select highlighted item
  'selected',       // the currently selected item
  'self-and-before', // highlight/select self and all before (Rating pattern)
  'all',            // all items in container
  'none'            // clear all highlights/selections
])

// Control Flow Keywords
export const CONTROL_KEYWORDS = new Set([
  'if', 'then', 'not', 'and', 'or', 'else', 'each', 'in',
  'where'  // For data binding filter: data Tasks where done == false
])

// Event Keywords
export const EVENT_KEYWORDS = new Set([
  'onclick', 'onhover', 'onchange', 'oninput', 'onload', 'onfocus', 'onblur', 'onkeydown', 'onkeyup',
  // Form events
  'onsubmit',
  // Overlay/Dialog events
  'onopen', 'onclose',
  // Behavior events (click outside, key-specific)
  'onclick-outside', 'onclick-inside',
  // Segment events (for masked input)
  'onfill', 'oncomplete', 'onempty'
])

// Timing Modifiers for events and actions
export const TIMING_MODIFIERS = new Set([
  'debounce',  // Debounce event: oninput debounce 300 filter Results
  'delay'      // Delay action: onblur delay 200 hide Results
])

// Key Modifiers for onkeydown/onkeyup events
export const KEY_MODIFIERS = new Set([
  'escape', 'enter', 'tab', 'space',
  'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right',
  'backspace', 'delete', 'home', 'end'
])

// State Keyword
export const STATE_KEYWORD = 'state'

// Behavior State Keywords - these can be used as state block names
// The keyword IS the state name: `highlight` block defines the `highlight` state
// Used by behavior actions: `highlight next` applies the `highlight` state
export const BEHAVIOR_STATE_KEYWORDS = new Set([
  'highlight',  // highlight next/prev/self
  'select'      // select highlighted/self
])

// System States - automatically bound to browser pseudo-classes
// These states don't need explicit event handlers
export const SYSTEM_STATES = new Set([
  'hover',    // Bound to onMouseEnter/Leave
  'focus',    // Bound to onFocus/onBlur
  'active',   // Bound to onMouseDown/Up
  'disabled', // Bound to disabled attribute
])

// Behavior States - activated by actions like highlight, select, etc.
// These require explicit event handlers
export const BEHAVIOR_STATES = new Set([
  'highlighted',
  'selected',
  'active',     // Can also be a behavior state
  'inactive',
  'expanded',
  'collapsed',
  'valid',
  'invalid',
  'default',    // Initial state
  'on',         // Toggle states
  'off',
])

// Events Keyword (for centralized event block)
export const EVENTS_KEYWORD = 'events'

// Keys Keyword (for grouped keyboard event handlers)
export const KEYS_KEYWORD = 'keys'

// Theme Keyword (for theme block definition)
export const THEME_KEYWORD = 'theme'

// Use Keyword (for activating themes)
export const USE_KEYWORD = 'use'

// Animation Keywords (for overlay open/close animations)
// Note: 'none' also exists in BORDER_STYLES, but the parser handles context
export const ANIMATION_KEYWORDS = new Set([
  'slide-up', 'slide-down', 'slide-left', 'slide-right',
  'fade', 'scale', 'none',
  // Continuous animations
  'spin', 'pulse', 'bounce'
])

// Animation Action Keywords (for element show/hide/animate blocks)
export const ANIMATION_ACTION_KEYWORDS = new Set([
  'show',     // Entrance animation: show fade slide-up 300
  'hide',     // Exit animation: hide fade 200
  'animate'   // Continuous animation: animate spin 1000
])

// Position Keywords (for overlay positioning relative to trigger or viewport)
// Note: includes both long and short forms since normalizer may convert center->cen
export const POSITION_KEYWORDS = new Set([
  'below', 'above', 'left', 'right',  // Relative to trigger element
  'center', 'cen'                      // Relative to viewport (for modals)
])

// =============================================================================
// PROPERTY CATEGORIES (Source of Truth for DSL_SCHEMA)
// =============================================================================

/**
 * Layout properties
 */
export const LAYOUT_PROPERTIES = new Set([
  'horizontal', 'hor', 'vertical', 'ver', 'gap', 'g', 'gap-col', 'gap-row',
  'gap-x', 'gap-y', 'between', 'wrap', 'grow', 'fill', 'shrink', 'stacked',
  'grid', 'rows'
])

/**
 * Alignment properties
 */
export const ALIGNMENT_PROPERTIES = new Set([
  'horizontal-left', 'hor-l', 'horizontal-center', 'hor-cen', 'horizontal-right', 'hor-r',
  'vertical-top', 'ver-t', 'vertical-center', 'ver-cen', 'vertical-bottom', 'ver-b',
  'center', 'cen', 'centered', 'left', 'right', 'top', 'bottom'
])

/**
 * Sizing properties
 */
export const SIZING_PROPERTIES = new Set([
  'width', 'w', 'height', 'h', 'size',
  'min-width', 'minw', 'w-min', 'max-width', 'maxw', 'w-max',
  'min-height', 'minh', 'h-min', 'max-height', 'maxh', 'h-max',
  'full', 'hug'
])

/**
 * Spacing properties
 */
export const SPACING_PROPERTIES = new Set([
  'padding', 'p', 'pad', 'margin', 'm', 'mar'
])

/**
 * Color properties (can take color values)
 */
export const COLORS_PROPERTIES = new Set([
  'background', 'bg', 'color', 'c', 'col', 'border-color', 'boc'
])

/**
 * Border properties
 */
export const BORDER_PROPERTIES = new Set([
  'border', 'bor', 'radius', 'rad'
])

/**
 * Typography properties
 */
export const TYPOGRAPHY_PROPERTIES = new Set([
  'font-size', 'fs', 'size', 'weight', 'font', 'line', 'align',
  'italic', 'underline', 'uppercase', 'lowercase', 'truncate'
])

/**
 * Visual properties
 */
export const VISUAL_PROPERTIES = new Set([
  'opacity', 'o', 'opa', 'op', 'shadow', 'cursor', 'z',
  'hidden', 'visible', 'disabled', 'rotate', 'rot', 'translate', 'shortcut'
])

/**
 * Scroll properties
 */
export const SCROLL_PROPERTIES = new Set([
  'scroll', 'scroll-ver', 'scroll-vertical', 'scroll-hor', 'scroll-horizontal',
  'scroll-both', 'snap', 'clip'
])

/**
 * Hover properties
 */
export const HOVER_PROPERTIES = new Set([
  'hover-background', 'hover-bg', 'hover-color', 'hover-col',
  'hover-border-color', 'hover-boc', 'hover-border', 'hover-bor',
  'hover-radius', 'hover-rad', 'hover-opacity', 'hover-opa', 'hover-scale'
])

/**
 * Icon properties
 */
export const ICON_PROPERTIES = new Set([
  'icon', 'icon-size', 'is', 'icon-weight', 'iw', 'icon-color', 'ic', 'fill', 'material', 'phosphor'
])

/**
 * Form properties
 */
export const FORM_PROPERTIES = new Set([
  'type', 'placeholder', 'value', 'min', 'max', 'step'
])

/**
 * Segment properties
 */
export const SEGMENT_PROPERTIES = new Set([
  'segments', 'length', 'pattern', 'mask'
])

/**
 * Image properties
 */
export const IMAGE_PROPERTIES = new Set([
  'src', 'alt', 'fit'
])

/**
 * Link properties
 */
export const LINK_PROPERTIES = new Set([
  'href', 'target'
])

/**
 * Data properties
 */
export const DATA_PROPERTIES = new Set([
  'data'
])

// =============================================================================
// ACTION CATEGORIES (Source of Truth for DSL_SCHEMA)
// =============================================================================

/**
 * Visibility actions
 */
export const VISIBILITY_ACTIONS = new Set([
  'show', 'hide', 'toggle', 'open', 'close'
])

/**
 * State actions
 */
export const STATE_ACTIONS = new Set([
  'change', 'toggle-state', 'activate', 'deactivate', 'deactivate-siblings'
])

/**
 * Selection actions
 */
export const SELECTION_ACTIONS = new Set([
  'highlight', 'select', 'deselect', 'clear-selection', 'filter'
])

/**
 * Navigation actions
 */
export const NAVIGATION_ACTIONS = new Set([
  'page', 'assign', 'alert', 'call'
])

/**
 * Form actions
 */
export const FORM_ACTIONS = new Set([
  'focus', 'validate', 'reset'
])

// =============================================================================
// OTHER CONSTANTS
// =============================================================================

/**
 * Direction combos
 */
export const DIRECTION_COMBOS = new Set([
  'l-r', 'left-right', 'u-d', 't-b', 'top-bottom', 'lr', 'ud', 'tb'
])

/**
 * Segment events
 */
export const SEGMENT_EVENTS = new Set([
  'onfill', 'oncomplete', 'onempty'
])

/**
 * DSL keywords
 */
export const DSL_KEYWORDS = new Set([
  'from', 'as', 'named', 'state', 'events', 'if', 'then', 'else',
  'each', 'in', 'where', 'and', 'or', 'not', 'to', 'show', 'hide', 'animate'
])

/**
 * Primitive component names
 */
export const PRIMITIVES = new Set([
  'Input', 'Textarea', 'Image', 'Link', 'Button', 'Segment', 'Icon'
])

/**
 * All DSL keywords and properties combined (for token-fixes)
 * This is used to distinguish DSL syntax from token names
 */
export const ALL_DSL_KEYWORDS = new Set([
  // Spread all property categories
  ...LAYOUT_PROPERTIES,
  ...ALIGNMENT_PROPERTIES,
  ...SIZING_PROPERTIES,
  ...SPACING_PROPERTIES,
  ...COLORS_PROPERTIES,
  ...BORDER_PROPERTIES,
  ...TYPOGRAPHY_PROPERTIES,
  ...VISUAL_PROPERTIES,
  ...SCROLL_PROPERTIES,
  ...HOVER_PROPERTIES,
  ...ICON_PROPERTIES,
  ...FORM_PROPERTIES,
  ...SEGMENT_PROPERTIES,
  ...IMAGE_PROPERTIES,
  ...LINK_PROPERTIES,
  ...DATA_PROPERTIES,
  // Directions
  ...DIRECTIONS,
  ...DIRECTION_COMBOS,
  // Events
  ...EVENT_KEYWORDS,
  // Actions
  ...ACTION_KEYWORDS,
  // Targets
  ...BEHAVIOR_TARGETS,
  // States
  ...SYSTEM_STATES,
  ...BEHAVIOR_STATES,
  // Animations
  ...ANIMATION_KEYWORDS,
  // Positions
  ...POSITION_KEYWORDS,
  // Keywords
  ...DSL_KEYWORDS,
])
