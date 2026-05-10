/**
 * Framework backend — Style/Event/Action emit (Slice 3 of
 * framework-backend-decomp).
 *
 * Translates IR styles + events into the Mirror props bag the M(...)
 * descriptor carries.
 *
 *   stylesToProps     — IR style list → props record. Handles flex-full
 *                       coalescing, 9-zone alias detection, single-axis
 *                       center, `align <value>` reverse-mapping, grid-
 *                       span companion suppression, state-style grouping.
 *   eventsToProps     — IR events → onclick/onhover/onkeydown-* props.
 *   actionToString    — IR action → `<type> <target>` or `<type>` string.
 *
 * Pure — only deps: `cssPropToMirrorProp` from `./css-to-mirror`,
 * `flexToNineZone`/`flexToSingleAxisCenter` from schema layout defaults.
 *
 * Extracted from `compiler/backends/framework.ts` per
 * `docs/refactoring/framework-backend-decomp.md`. Behaviour is byte-
 * identical to the pre-extraction call sites.
 */

import { flexToNineZone, flexToSingleAxisCenter } from '../../../schema/layout-defaults'
import type { IRAction, IREvent, IRStyle } from '../../../ir/types'
import { cssPropToMirrorProp } from './css-to-mirror'

export function stylesToProps(styles: IRStyle[], props: Record<string, unknown>): void {
  // Group styles by state
  const baseStyles = styles.filter(s => !s.state)
  const stateStyles = styles.filter(s => s.state)

  // Check for flex: 1 1 0% pattern (used for w full / h full)
  const hasFlexFull = baseStyles.some(
    s => s.property === 'flex' && (s.value === '1 1 0%' || s.value === '1')
  )
  const hasMinWidth0 = baseStyles.some(s => s.property === 'min-width' && s.value === '0')
  const hasMinHeight0 = baseStyles.some(s => s.property === 'min-height' && s.value === '0')

  // Convert flex: 1 1 0% + min-width: 0 to w: 'full'
  if (hasFlexFull && hasMinWidth0) {
    props.w = 'full'
  }
  // Convert flex: 1 1 0% + min-height: 0 to h: 'full'
  if (hasFlexFull && hasMinHeight0) {
    props.h = 'full'
  }

  // Slice 6 V-3: pre-detect grid-column-end / grid-row-end so we can
  // suppress their `width: 100%` / `height: 100%` companions emitted by
  // the IR property-transformer (`property-transformer.ts:436, 451`).
  // Without this, the per-style mapper writes `w: 'full'` from `width:
  // 100%` AFTER our `grid-column-end: span N → w: N` mapping, so the
  // span-count gets clobbered. Mark companions for skip in the loop
  // below.
  const hasGridColSpan = baseStyles.some(
    s => s.property === 'grid-column-end' && /^span\s+(\d+|var\(--[^)]+\))$/.test(s.value)
  )
  const hasGridRowSpan = baseStyles.some(
    s => s.property === 'grid-row-end' && /^span\s+(\d+|var\(--[^)]+\))$/.test(s.value)
  )

  // Slice 4 V-2: detect 9-zone combination BEFORE the per-style loop
  // and emit the alias instead of two individual `justify-content` /
  // `align-items` mappings. Without this the per-style mapper either
  // dropped `flex-start`/`flex-end` entirely (→ `(no props)` for `tl`/
  // `tr`/`bl`/`br`) or collapsed any `center` axis to a bare
  // `center: true` (→ ambiguous for `tc`/`cl`/`cr`/`bc`).
  const justify = baseStyles.find(s => s.property === 'justify-content')?.value
  const align = baseStyles.find(s => s.property === 'align-items')?.value
  const direction =
    baseStyles.find(s => s.property === 'flex-direction')?.value === 'row' ? 'row' : 'column'
  const consumedAlignmentStyles = new Set<string>()
  if (justify && align && justify !== 'space-between') {
    const zone = flexToNineZone(justify, align, direction)
    if (zone) {
      props[zone] = true
      consumedAlignmentStyles.add('justify-content')
      consumedAlignmentStyles.add('align-items')
    }
  }
  // Slice 5 V-4: single-axis center detection. Fires when EXACTLY ONE
  // axis is `center` AND the other is unset — that's the unique IR
  // signature of `hor-center` / `ver-center` (the orthogonal axis is
  // omitted entirely, vs. `tc`/`cl`/etc. which set both). Without this
  // the per-style fallback collapses single `justify:center` /
  // `align:center` to a bare `center: true`, which compiles to BOTH
  // axes — round-trip-lossy.
  if (!consumedAlignmentStyles.has('justify-content') && justify === 'center' && !align) {
    const keyword = flexToSingleAxisCenter('justify-content', direction)
    if (keyword) {
      props[keyword] = true
      consumedAlignmentStyles.add('justify-content')
    }
  }
  if (!consumedAlignmentStyles.has('align-items') && align === 'center' && !justify) {
    const keyword = flexToSingleAxisCenter('align-items', direction)
    if (keyword) {
      props[keyword] = true
      consumedAlignmentStyles.add('align-items')
    }
  }

  // `align top|bottom|left|right` reverse mapping. The IR's layout-
  // transformer collapses these to a single-axis flex value
  // (`align-items: flex-end`, `justify-content: flex-start`, etc.)
  // depending on direction. Pre-2026-05-10 the Framework reverse-
  // mapper had no branch — single-axis flex-start/flex-end values
  // dropped as "default" or were collapsed to nothing. Now we map
  // them back to `align <value>` strings the Mirror parser accepts.
  //
  // direction=row:
  //   align-items: flex-start  → `align top`
  //   align-items: flex-end    → `align bottom`
  //   justify-content: flex-end → `align right`
  //   (justify-content: flex-start is the default — drop)
  // direction=column:
  //   align-items: flex-end    → `align right`
  //   align-items: flex-start  → drop (default)
  //   justify-content: flex-start → `align top`
  //   justify-content: flex-end   → `align bottom`
  if (!consumedAlignmentStyles.has('align-items') && align && align !== 'center') {
    let keyword: string | null = null
    if (direction === 'row') {
      if (align === 'flex-end') keyword = 'bottom'
      // align-items: flex-start is the default; round-trip from
      // explicit `align top` would need provenance the IR doesn't
      // carry. Skip to avoid emitting noisy `align: 'top'` on every
      // default-aligned row.
    } else {
      if (align === 'flex-end') keyword = 'right'
    }
    if (keyword) {
      props.align = keyword
      consumedAlignmentStyles.add('align-items')
    }
  }
  if (
    !consumedAlignmentStyles.has('justify-content') &&
    justify &&
    justify !== 'center' &&
    justify !== 'space-between'
  ) {
    let keyword: string | null = null
    if (direction === 'row') {
      if (justify === 'flex-end') keyword = 'right'
    } else {
      if (justify === 'flex-end') keyword = 'bottom'
      if (justify === 'flex-start') keyword = 'top'
    }
    if (keyword) {
      props.align = keyword
      consumedAlignmentStyles.add('justify-content')
    }
  }

  // Convert base styles to props
  for (const style of baseStyles) {
    // Skip flex and min-width/min-height that were handled above
    if (
      hasFlexFull &&
      hasMinWidth0 &&
      (style.property === 'flex' || style.property === 'min-width')
    )
      continue
    if (
      hasFlexFull &&
      hasMinHeight0 &&
      (style.property === 'flex' || style.property === 'min-height')
    )
      continue

    // Slice 4 V-2: skip the alignment styles already consumed by the
    // 9-zone alias above so we don't double-emit `tl: true` plus a
    // bare `center: true`.
    if (consumedAlignmentStyles.has(style.property)) continue

    // Slice 6 V-3: skip width: 100% / height: 100% companions of grid-
    // span — the `grid-column-end`/`grid-row-end` mapping below already
    // emits `w: N` / `h: N`, the 100% would clobber that.
    if (hasGridColSpan && style.property === 'width' && style.value === '100%') continue
    if (hasGridRowSpan && style.property === 'height' && style.value === '100%') continue

    const mirrorProp = cssPropToMirrorProp(style.property, style.value)
    if (mirrorProp) {
      props[mirrorProp.name] = mirrorProp.value
    }
  }

  // Convert state styles to states object
  if (stateStyles.length > 0) {
    const states: Record<string, Record<string, unknown>> = {}

    for (const style of stateStyles) {
      if (!states[style.state!]) {
        states[style.state!] = {}
      }
      const mirrorProp = cssPropToMirrorProp(style.property, style.value)
      if (mirrorProp) {
        states[style.state!][mirrorProp.name] = mirrorProp.value
      }
    }

    props.states = states
  }
}

/**
 * Convert IR events to Mirror props.
 */
export function eventsToProps(events: IREvent[], props: Record<string, unknown>): void {
  for (const event of events) {
    const actions = event.actions.map(a => actionToString(a))
    const actionValue = actions.length === 1 ? actions[0] : actions

    if (event.key) {
      // Keyboard event: 'onkeydown escape': 'close'
      props[`onkeydown ${event.key}`] = actionValue
    } else {
      // Regular event: onclick: 'toggle'
      const eventName = `on${event.name}`
      props[eventName] = actionValue
    }
  }
}

/**
 * Convert IR action to action string.
 */
export function actionToString(action: IRAction): string {
  if (action.target) {
    return `${action.type} ${action.target}`
  }
  return action.type
}
