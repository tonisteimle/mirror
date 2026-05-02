/**
 * Spacing parsing helpers (used by SpacingSection + MarginSection).
 *
 * The two sections render padding and margin respectively, but both
 * deal with the same shape: a CSS-style shorthand (`8 16` / `8 16 12 24`)
 * combined with optional axis (`*-x` / `*-y`) and per-side
 * (`*-t` / `*-r` / `*-b` / `*-l`) overrides.
 */

import type { ExtractedProperty } from '../../../core/compiler-types'

export interface Sides {
  t: string
  r: string
  b: string
  l: string
}

/**
 * Parse a CSS-shorthand-style spacing value into T/R/B/L:
 *   ''                  → all empty
 *   '8'                 → 8 / 8 / 8 / 8
 *   '8 16'              → 8 / 16 / 8 / 16
 *   '8 16 12'           → 8 / 16 / 12 / 16   (T=parts[0], R=L=parts[1], B=parts[2])
 *   '8 16 12 24'        → 8 / 16 / 12 / 24
 *   anything else       → all empty
 */
export function parseSidesValue(value: string): Sides {
  const parts = value.split(/\s+/).filter(Boolean)
  let t = '',
    r = '',
    b = '',
    l = ''

  if (parts.length === 1) {
    t = r = b = l = parts[0]
  } else if (parts.length === 2) {
    t = b = parts[0]
    r = l = parts[1]
  } else if (parts.length === 3) {
    t = parts[0]
    r = l = parts[1]
    b = parts[2]
  } else if (parts.length === 4) {
    t = parts[0]
    r = parts[1]
    b = parts[2]
    l = parts[3]
  }

  return { t, r, b, l }
}

/**
 * Resolve canonical T/R/B/L for a spacing-style property by combining
 * the shorthand with axis (`*-x` / `*-y`) and per-side
 * (`*-t` / `*-r` / `*-b` / `*-l`) overrides.
 *
 * Precedence (later wins, matching CSS specificity once compiled):
 *   shorthand → *-y / *-x → *-t / *-r / *-b / *-l
 *
 * @param props      Properties from the panel category.
 * @param baseName   Full prop name (`padding` or `margin`).
 * @param prefix     Short alias used by per-side props (`pad`, `mar`).
 * @param ultraShort Single-letter alias (`p`, `m`).
 */
export function extractSides(
  props: ExtractedProperty[],
  baseName: string,
  prefix: string,
  ultraShort: string
): Sides {
  const shorthand = props.find(
    p => p.name === baseName || p.name === prefix || p.name === ultraShort
  )
  const sides = parseSidesValue(shorthand?.value || '')

  const lookup = (name: string): string | undefined => props.find(p => p.name === name)?.value

  // Axis overrides (apply before per-side, so per-side wins)
  const axisX = lookup(`${prefix}-x`)
  const axisY = lookup(`${prefix}-y`)
  if (axisY) sides.t = sides.b = axisY
  if (axisX) sides.r = sides.l = axisX

  // Per-side overrides win last
  const sideT = lookup(`${prefix}-t`)
  const sideR = lookup(`${prefix}-r`)
  const sideB = lookup(`${prefix}-b`)
  const sideL = lookup(`${prefix}-l`)
  if (sideT !== undefined) sides.t = sideT
  if (sideR !== undefined) sides.r = sideR
  if (sideB !== undefined) sides.b = sideB
  if (sideL !== undefined) sides.l = sideL

  return sides
}

/**
 * Names of all properties (shorthand + axis + per-side) that contribute
 * to a spacing-style value. Useful for "is the section overridden?"
 * checks across the whole family of related props.
 */
export function spacingPropertyNames(
  baseName: string,
  prefix: string,
  ultraShort: string
): string[] {
  return [
    baseName,
    prefix,
    ultraShort,
    `${prefix}-x`,
    `${prefix}-y`,
    `${prefix}-t`,
    `${prefix}-r`,
    `${prefix}-b`,
    `${prefix}-l`,
  ]
}
