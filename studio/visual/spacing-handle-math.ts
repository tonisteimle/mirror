/**
 * Spacing-Handle Math — pure helpers shared by padding/margin/gap managers.
 *
 * The visual padding/margin/gap managers each had their own copy of the
 * "where did the mouse move relative to the handle, and what does that
 * mean for the spacing value" logic. The math is small but subtle:
 *
 *   - Padding handles grow **inward** — dragging the top-padding handle
 *     down increases padding-top.
 *   - Margin handles grow **outward** — dragging the top-margin handle
 *     UP increases margin-top.
 *
 * That one-bit difference lived inline in three 800+ LOC manager files,
 * each browser-tested but lacking unit coverage. Extracting the pure
 * piece here lets vitest pin the polarity rules without spinning up
 * jsdom + the full overlay/snap stack, and unblocks the
 * `SpacingHandleManagerBase` Step 3 refactor tracked in
 * docs/findings.md.
 */

export type SpacingHandleSide = 'top' | 'right' | 'bottom' | 'left'

/** Drag-mode for a spacing handle, picked by held modifier keys. */
export type SpacingHandleMode = 'single' | 'all' | 'axis'

/** Direction polarity: padding shrinks toward centre (inward), margin
 *  grows away from element (outward). */
export type SpacingPolarity = 'inward' | 'outward'

/**
 * Calculate the signed delta from drag start, in pixels.
 * Positive delta means the spacing should *increase*.
 */
export function calculateSpacingDelta(
  handle: SpacingHandleSide,
  polarity: SpacingPolarity,
  startX: number,
  startY: number,
  mouseX: number,
  mouseY: number
): number {
  if (polarity === 'inward') {
    // Padding: drag handle inward (toward centre) to grow the spacing.
    if (handle === 'top') return mouseY - startY
    if (handle === 'bottom') return startY - mouseY
    if (handle === 'left') return mouseX - startX
    return startX - mouseX // right
  }
  // Outward (margin): drag handle outward (away from element) to grow.
  if (handle === 'top') return startY - mouseY
  if (handle === 'bottom') return mouseY - startY
  if (handle === 'left') return startX - mouseX
  return mouseX - startX // right
}

/**
 * Which CSS-property names to mutate for a given drag mode.
 *
 *   single → just the handle's own side
 *   all    → all four sides at once (Shift)
 *   axis   → both sides on the same axis (Alt/Option)
 */
export function spacingPropertiesForMode(
  prefix: 'padding' | 'margin',
  mode: SpacingHandleMode,
  handle: SpacingHandleSide
): readonly string[] {
  if (mode === 'all') {
    return [`${prefix}-top`, `${prefix}-right`, `${prefix}-bottom`, `${prefix}-left`]
  }
  if (mode === 'axis') {
    return handle === 'top' || handle === 'bottom'
      ? [`${prefix}-top`, `${prefix}-bottom`]
      : [`${prefix}-left`, `${prefix}-right`]
  }
  return [`${prefix}-${handle}`]
}

/**
 * Label shown in the size-indicator overlay during a drag.
 *
 *   prefix='pad', mode='all',  handle='top'    → 'pad'
 *   prefix='pad', mode='axis', handle='top'    → 'pad-y'
 *   prefix='pad', mode='axis', handle='left'   → 'pad-x'
 *   prefix='pad', mode='single', handle='top'  → 'pad-t'
 *   prefix='mar', mode='single', handle='right'→ 'mar-r'
 */
export function spacingDragLabel(
  prefix: 'pad' | 'mar',
  mode: SpacingHandleMode,
  handle: SpacingHandleSide
): string {
  if (mode === 'all') return prefix
  if (mode === 'axis') {
    return handle === 'top' || handle === 'bottom' ? `${prefix}-y` : `${prefix}-x`
  }
  return `${prefix}-${handle[0]}`
}

/**
 * Pick the drag-mode based on which modifier keys are held when the
 * drag starts. Centralises the (unwritten) convention used across the
 * three managers — Shift = all, Alt/Option = axis, plain = single.
 */
export function spacingModeFromModifiers(modifiers: {
  shift?: boolean
  alt?: boolean
}): SpacingHandleMode {
  if (modifiers.shift) return 'all'
  if (modifiers.alt) return 'axis'
  return 'single'
}
