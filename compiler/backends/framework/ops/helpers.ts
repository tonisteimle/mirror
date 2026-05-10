/**
 * Framework backend — pure helpers (Slice 1 of framework-backend-decomp).
 *
 * Pure functions and constants the FrameworkGenerator uses across its
 * methods. No `this` state, no side effects — easy to unit-test in
 * isolation if the need arises.
 *
 * Exports:
 *   ANIMATION_REVERSE  — reverse the shared `mirror-X …` CSS string back
 *                        to the `anim X` keyword.
 *   TAG_TO_TYPE        — HTML-tag → Mirror primitive name lookup
 *                        (`div` → `Box`, `span` → `Text`, …).
 *   parseGridSpan      — `span N` / `span var(--token)` → number | string
 *                        | null (caller drops the prop on null).
 *   parsePxValue       — CSS-pixel-string → bare number | unchanged
 *                        string (var(), multi-value, non-numeric).
 *   escapeString       — JS-string-literal-safe escape (`\` and `'`).
 *   dataValueToJS      — nested IR data value → JS object/array/scalar
 *                        literal string (mirrors React `dataAttributes
 *                        ToJSObject`).
 *
 * Extracted from `compiler/backends/framework.ts` per
 * `docs/refactoring/framework-backend-decomp.md`. Behaviour is byte-
 * identical to the pre-extraction call sites.
 */

import { ANIMATION_SHORTHAND } from '../../animations'

/**
 * Reverse `mirror-X 0.3s ease forwards` strings back to the `anim X`
 * keyword. Pre-built from the shared shorthand map so any future
 * keyword stays in sync automatically.
 */
export const ANIMATION_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(ANIMATION_SHORTHAND).map(([keyword, css]) => [css, keyword])
)

export const TAG_TO_TYPE: Record<string, string> = {
  div: 'Box',
  span: 'Text',
  button: 'Button',
  input: 'Input',
  textarea: 'Textarea',
  img: 'Image',
  a: 'Link',
}

/**
 * Parse a `grid-column-end` / `grid-row-end` value into a Mirror-style
 * span count. Accepts `span N` (number of grid tracks) and
 * `span var(--token)` (token-resolved span). Returns null when the value
 * doesn't match either form, which the caller treats as drop-this-prop.
 */
export function parseGridSpan(value: string): number | string | null {
  const num = value.match(/^span\s+(\d+)$/)
  if (num) return parseInt(num[1])
  const tokenVar = value.match(/^span\s+(var\(--[^)]+\))$/)
  if (tokenVar) return tokenVar[1]
  return null
}

export function parsePxValue(value: string): string | number {
  if (value.startsWith('var(')) return value
  // Multi-value shorthand: keep as CSS string — the M-runtime understands
  // `gap: '12px 8px'` literally, no need to convert to a single number.
  if (/\s/.test(value.trim())) return value
  if (value.endsWith('px')) {
    const num = parseFloat(value)
    if (!isNaN(num)) return num
  }
  // Bare numeric strings (e.g. `'0'` from `left: 0` in stacked-overlay
  // children) — round-trip back to a number so the M(...) bag stays
  // numeric-typed and re-compile produces the same IR. Pre-2026-05-10
  // these emitted as quoted strings (`x: '0'` in M-prop bag).
  if (/^-?\d+(\.\d+)?$/.test(value.trim())) {
    return parseFloat(value)
  }
  return value
}

export function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

/**
 * Convert an IR data-value (nested object, list, or scalar) to a JS literal
 * the M(...) runtime can iterate at render time. Mirrors the React backend's
 * `dataAttributesToJSObject` semantics — nested objects round-trip as object
 * literals, bare-list forms as arrays, scalars as quoted/raw values.
 */
export function dataValueToJS(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) {
    return '[' + value.map(v => dataValueToJS(v)).join(', ') + ']'
  }
  if (typeof value === 'object' && value !== null) {
    // Skip data-references (`__ref: true` markers) — their resolution
    // happens at runtime; emit as a plain placeholder string for now.
    if ('__ref' in value && (value as { __ref: boolean }).__ref) {
      const ref = value as unknown as { collection: string; entry: string }
      return JSON.stringify(`$${ref.collection}.${ref.entry}`)
    }
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([k, v]) => `${JSON.stringify(k)}: ${dataValueToJS(v)}`
    )
    return '{ ' + entries.join(', ') + ' }'
  }
  return JSON.stringify(value)
}
