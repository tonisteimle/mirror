/**
 * Layout Defaults - Single Source of Truth
 *
 * This file defines ALL layout defaults for the Mirror DSL.
 * The IR code only READS from here, never DECIDES.
 *
 * Key principles:
 * - SYMMETRIC: hor and ver are treated the same way
 * - EXPLICIT: center means the same thing everywhere
 * - NO CSS MARKERS: Sizing uses flags, not CSS properties as markers
 */

// =============================================================================
// PRIMITIVE CLASSIFICATION
// =============================================================================

/**
 * Non-container primitives that should NOT get default flex layout.
 * These are leaf elements that don't have children.
 */
export const NON_CONTAINER_PRIMITIVES = new Set([
  'text',
  'span',
  'input',
  'textarea',
  'button',
  'img',
  'image',
  'icon',
  'label',
  'link',
  'a',
  'option',
  'divider',
  'hr',
  'spacer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'checkbox',
  'radio',
  'slot',
  'zagslot',
])

/**
 * Check if a primitive is a container (can have children with flex/grid layout)
 */
export function isContainer(primitive: string): boolean {
  return !NON_CONTAINER_PRIMITIVES.has(primitive.toLowerCase())
}

// =============================================================================
// FLEX DEFAULTS
// =============================================================================

/**
 * Flex layout defaults - SYMMETRIC for both directions.
 *
 * IMPORTANT: Both column and row have align-items: flex-start.
 * This is intentional symmetry. If you want centering, use `center` explicitly.
 */
export const FLEX_DEFAULTS = {
  column: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start', // NOT center! Symmetric with column.
  },
} as const

/**
 * Default layout for container elements (Frame, Box, etc.)
 */
export const CONTAINER_DEFAULTS = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  width: 'fit-content',
} as const

// =============================================================================
// 9-ZONE ALIGNMENT
// =============================================================================

/**
 * 9-Zone alignment grid:
 *
 *   tl  |  tc  |  tr
 *  -----+------+-----
 *   cl  | center| cr
 *  -----+------+-----
 *   bl  |  bc  |  br
 *
 * Note: These are for COLUMN layout. In column layout:
 * - justify-content controls vertical (main axis)
 * - align-items controls horizontal (cross axis)
 */
export const NINE_ZONE = {
  tl: { justify: 'flex-start', align: 'flex-start' },
  tc: { justify: 'flex-start', align: 'center' },
  tr: { justify: 'flex-start', align: 'flex-end' },
  cl: { justify: 'center', align: 'flex-start' },
  center: { justify: 'center', align: 'center' },
  cr: { justify: 'center', align: 'flex-end' },
  bl: { justify: 'flex-end', align: 'flex-start' },
  bc: { justify: 'flex-end', align: 'center' },
  br: { justify: 'flex-end', align: 'flex-end' },
} as const

export type NineZonePosition = keyof typeof NINE_ZONE

// =============================================================================
// CENTER SEMANTICS
// =============================================================================

/**
 * Center alignment semantics - UNAMBIGUOUS.
 *
 * IMPORTANT: `center` ALWAYS means both axes.
 * Use `hor-center` or `ver-center` for single-axis centering.
 *
 * This eliminates the context-dependent behavior where `center` meant
 * different things based on other properties.
 */
export const CENTER_ALIGNMENT = {
  /** Center on BOTH axes - justify-content AND align-items */
  center: { justify: 'center', align: 'center' },
  /** Center ONLY on horizontal axis (cross-axis in column, main-axis in row) */
  'hor-center': { justify: null, align: 'center' },
  /** Center ONLY on vertical axis (main-axis in column, cross-axis in row) */
  'ver-center': { justify: 'center', align: null },
} as const

// =============================================================================
// SIZING FLAGS
// =============================================================================

/**
 * Sizing mode for width/height.
 * Used instead of CSS markers like `min-width: 0`.
 */
export type SizingMode = 'fixed' | 'hug' | 'full'

/**
 * Sizing flags attached to IR nodes.
 * This tracks HOW a dimension was sized, not just what CSS to generate.
 */
export interface SizingFlags {
  width?: SizingMode
  height?: SizingMode
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get flex defaults for a direction.
 */
export function getFlexDefaults(direction: 'column' | 'row' = 'column') {
  return FLEX_DEFAULTS[direction]
}

/**
 * Get 9-zone alignment values.
 */
export function getNineZoneAlignment(position: NineZonePosition): {
  justify: string
  align: string
} {
  return NINE_ZONE[position]
}

/**
 * Check if a value is a 9-zone position.
 */
export function isNineZonePosition(value: string): value is NineZonePosition {
  return value in NINE_ZONE
}

// =============================================================================
// 9-ZONE → FLEX (direction-aware)
// =============================================================================

/**
 * Semantic alignment of a 9-zone position.
 * `vAlign` controls vertical (top/bottom), `hAlign` controls horizontal (left/right).
 *
 * Slice 4 V-1: this is the schema-side single-source-of-truth that the IR
 * layout-transformer (case-by-case in `layout-transformer.ts:213-260`) and
 * the React backend (Slice 4 V-1 fix) share — same semantic answer in both
 * places, no duplication.
 */
export type SemanticAxis = 'start' | 'center' | 'end'
export type SemanticAlignment = { vAlign: SemanticAxis; hAlign: SemanticAxis }

const ZONE_TO_SEMANTIC: Record<NineZonePosition, SemanticAlignment> = {
  tl: { vAlign: 'start', hAlign: 'start' },
  tc: { vAlign: 'start', hAlign: 'center' },
  tr: { vAlign: 'start', hAlign: 'end' },
  cl: { vAlign: 'center', hAlign: 'start' },
  center: { vAlign: 'center', hAlign: 'center' },
  cr: { vAlign: 'center', hAlign: 'end' },
  bl: { vAlign: 'end', hAlign: 'start' },
  bc: { vAlign: 'end', hAlign: 'center' },
  br: { vAlign: 'end', hAlign: 'end' },
}

const LONG_FORM_TO_ZONE: Record<string, NineZonePosition> = {
  'top-left': 'tl',
  'top-center': 'tc',
  'top-right': 'tr',
  'center-left': 'cl',
  'center-right': 'cr',
  'bottom-left': 'bl',
  'bottom-center': 'bc',
  'bottom-right': 'br',
  cen: 'center',
}

/**
 * Resolve a 9-zone alias (short or long form) to its canonical zone key.
 * Returns null if the input is not a recognised 9-zone position.
 */
export function resolveNineZoneAlias(name: string): NineZonePosition | null {
  if (name in NINE_ZONE) return name as NineZonePosition
  if (name in LONG_FORM_TO_ZONE) return LONG_FORM_TO_ZONE[name]
  return null
}

/**
 * Get semantic v/h alignment for a 9-zone position. Returns null for non-zone names.
 */
export function nineZoneToSemantic(name: string): SemanticAlignment | null {
  const zone = resolveNineZoneAlias(name)
  return zone === null ? null : ZONE_TO_SEMANTIC[zone]
}

const FLEX_AXIS_VALUE: Record<SemanticAxis, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
}

/**
 * Map a 9-zone position to direction-aware flex CSS.
 *
 * - In `column` layout: vertical alignment → `justify-content` (main axis),
 *   horizontal alignment → `align-items` (cross axis).
 * - In `row` layout: vertical alignment → `align-items` (cross axis),
 *   horizontal alignment → `justify-content` (main axis).
 *
 * Returns null for non-zone names so callers can fall through to other logic.
 */
export function nineZoneToFlex(
  name: string,
  direction: 'column' | 'row' = 'column'
): { justifyContent: string; alignItems: string } | null {
  const semantic = nineZoneToSemantic(name)
  if (!semantic) return null
  if (direction === 'column') {
    return {
      justifyContent: FLEX_AXIS_VALUE[semantic.vAlign],
      alignItems: FLEX_AXIS_VALUE[semantic.hAlign],
    }
  }
  return {
    justifyContent: FLEX_AXIS_VALUE[semantic.hAlign],
    alignItems: FLEX_AXIS_VALUE[semantic.vAlign],
  }
}

/**
 * Map the single-axis center keywords (`hor-center`, `ver-center`) to the
 * one CSS property they affect, direction-aware.
 *
 *   `hor-center` — center on the horizontal axis. In a column layout the
 *   horizontal axis is the cross-axis (`align-items: center`); in a row
 *   layout it's the main-axis (`justify-content: center`).
 *
 *   `ver-center` — center on the vertical axis. Mirror image.
 *
 * Distinct from `nineZoneToFlex` because these set EXACTLY ONE axis instead
 * of both — a 9-zone position always pins both axes simultaneously, whereas
 * `Frame hor, ver-center` leaves the main axis (horizontal in row) free for
 * `gap`/`spread` to drive.
 *
 * Returns `null` for non-matching names so callers can fall through.
 *
 * Slice 5 V-1: schema-side single source of truth shared by the IR
 * layout-transformer (case-by-case in `layout-transformer.ts:286-296`)
 * and the React backend; previously the React backend was missing both
 * keywords entirely and silently dropped them.
 */
export function singleAxisCenterToFlex(
  name: string,
  direction: 'column' | 'row' = 'column'
): { property: 'justifyContent' | 'alignItems'; value: string } | null {
  if (name === 'hor-center') {
    return {
      property: direction === 'column' ? 'alignItems' : 'justifyContent',
      value: 'center',
    }
  }
  if (name === 'ver-center') {
    return {
      property: direction === 'column' ? 'justifyContent' : 'alignItems',
      value: 'center',
    }
  }
  return null
}

/**
 * Inverse of `singleAxisCenterToFlex` — given an axis with `center` and the
 * layout direction, return `'hor-center'` or `'ver-center'`.
 *
 * The caller is responsible for confirming that the *other* axis is unset
 * (or its container default) — only then is the keyword unambiguously
 * single-axis. If both axes are set explicitly, prefer `flexToNineZone`.
 *
 * Slice 5 V-2: the Framework backend reverse-walks IR styles back to Mirror
 * props. The per-style mapper previously collapsed any single `center` axis
 * to a bare `center: true`, but `Frame hor-center` and `Frame center` emit
 * different CSS (one axis vs both), so the round-trip was lossy. With this
 * inverse the framework can re-emit `hor-center: true` / `ver-center: true`
 * for the unambiguous single-axis cases.
 */
export function flexToSingleAxisCenter(
  axis: 'justify-content' | 'align-items',
  direction: 'column' | 'row' = 'column'
): 'hor-center' | 'ver-center' | null {
  if (axis === 'justify-content') {
    return direction === 'column' ? 'ver-center' : 'hor-center'
  }
  if (axis === 'align-items') {
    return direction === 'column' ? 'hor-center' : 'ver-center'
  }
  return null
}

/**
 * Inverse of `nineZoneToFlex` — given a `justify-content` + `align-items`
 * combination plus the layout direction, return the canonical 9-zone alias
 * (`tl`/`tc`/…/`br`) or null if the combination doesn't fit any zone.
 *
 * Slice 4 V-2: the Framework backend reverse-walks IR styles back to
 * Mirror props. Without this inverse the per-style mapper could only
 * recognise `justify:center` or `align:center` individually and collapsed
 * the 8 non-center zones to either `(no props)` or a misleading
 * `center: true`. Now the four-axis combinations round-trip cleanly.
 */
export function flexToNineZone(
  justify: string,
  align: string,
  direction: 'column' | 'row' = 'column'
): NineZonePosition | null {
  const fromFlex = (v: string): SemanticAxis | null => {
    if (v === 'flex-start') return 'start'
    if (v === 'center') return 'center'
    if (v === 'flex-end') return 'end'
    return null
  }
  const j = fromFlex(justify)
  const a = fromFlex(align)
  if (!j || !a) return null
  const vAlign = direction === 'column' ? j : a
  const hAlign = direction === 'column' ? a : j
  for (const [zone, semantic] of Object.entries(ZONE_TO_SEMANTIC) as [
    NineZonePosition,
    SemanticAlignment,
  ][]) {
    if (semantic.vAlign === vAlign && semantic.hAlign === hAlign) return zone
  }
  return null
}
