/**
 * Spacing-arrow keyboard handling (P/M/G modes).
 *
 * Extracted from keyboard-handler.ts. While the user is in padding,
 * margin, or gap mode (toggled by P/M/G), arrow keys adjust spacing
 * instead of moving the element:
 *   - Plain ↑/↓: all sides ± grid step.
 *   - Option+arrow: arrow direction selects the side (top/right/bottom/
 *     left). Shift inverts the sign.
 *   - Gap mode ignores side-based adjustments — only plain ↑/↓.
 *
 * Step size is sourced from `handleSnapSettings.gridSize` so the
 * keyboard and visual handles always land on the same grid. Off-grid
 * values are "rescued" onto the grid on the first press, then step
 * normally on subsequent presses.
 *
 * Sequential arrow presses while still in the same mode are coalesced
 * into one undo step via `executor.beginSession` / `executeInSession`;
 * `endSession` is triggered by the `handleMode:changed` listener in
 * KeyboardHandler.attach when the user leaves the mode.
 */

import {
  events,
  executor,
  handleSnapSettings,
  SetPropertyCommand,
  type HandleMode,
} from '../../core'

export interface SpacingArrowContext {
  container: HTMLElement
  nodeIdAttribute: string
}

type Side = 'top' | 'right' | 'bottom' | 'left'
type SpacingMode = 'padding' | 'margin' | 'gap'

export function handleSpacingArrow(
  ctx: SpacingArrowContext,
  e: KeyboardEvent,
  mode: HandleMode,
  nodeId: string
): void {
  if (mode !== 'padding' && mode !== 'margin' && mode !== 'gap') return

  const gridSize = handleSnapSettings.get().gridSize
  if (gridSize <= 0) return

  const useSide = e.altKey
  const isVerticalKey = e.key === 'ArrowUp' || e.key === 'ArrowDown'
  const isHorizontalKey = e.key === 'ArrowLeft' || e.key === 'ArrowRight'

  // Gap has no sides — only plain ↑/↓ is meaningful.
  if (mode === 'gap' && (useSide || isHorizontalKey)) return

  let direction: 1 | -1
  let side: Side | null

  if (useSide) {
    // Option+arrow: arrow direction selects the side. Shift inverts sign.
    direction = e.shiftKey ? -1 : 1
    switch (e.key) {
      case 'ArrowUp':
        side = 'top'
        break
      case 'ArrowDown':
        side = 'bottom'
        break
      case 'ArrowLeft':
        side = 'left'
        break
      case 'ArrowRight':
        side = 'right'
        break
      default:
        return
    }
  } else {
    if (!isVerticalKey) return
    direction = e.key === 'ArrowUp' ? 1 : -1
    side = null
  }

  const property = getSpacingProperty(mode, side)
  const current = getCurrentSpacingValue(ctx, nodeId, mode, side)
  if (current === null) return

  const next = computeNextSnapValue(current, direction, gridSize)
  if (next === current) return

  if (!executor.isInSession()) {
    executor.beginSession(`Adjust ${mode} via keyboard`)
  }
  executor.executeInSession(
    new SetPropertyCommand({
      nodeId,
      property,
      value: String(next),
    })
  )
  events.emit('selection:refresh', { nodeId })
}

/** Map (mode, side) to the Mirror property name SetPropertyCommand expects. */
function getSpacingProperty(mode: SpacingMode, side: Side | null): string {
  if (mode === 'gap') return 'gap'
  const prefix = mode === 'padding' ? 'pad' : 'mar'
  if (side === null) return prefix
  const sideMap: Record<Side, string> = {
    top: '-t',
    right: '-r',
    bottom: '-b',
    left: '-l',
  }
  return `${prefix}${sideMap[side]}`
}

/**
 * Read the current spacing value (px) from computed style. For "all sides"
 * we use `top` as a representative — matches what the visual "all" handle
 * picks on drag.
 */
function getCurrentSpacingValue(
  ctx: SpacingArrowContext,
  nodeId: string,
  mode: SpacingMode,
  side: Side | null
): number | null {
  const el = ctx.container.querySelector(
    `[${ctx.nodeIdAttribute}="${nodeId}"]`
  ) as HTMLElement | null
  if (!el) return null

  const style = window.getComputedStyle(el)
  if (mode === 'gap') return parseInt(style.gap || '0', 10) || 0

  const sideForRead = side ?? 'top'
  if (mode === 'padding') {
    switch (sideForRead) {
      case 'top':
        return parseInt(style.paddingTop || '0', 10) || 0
      case 'right':
        return parseInt(style.paddingRight || '0', 10) || 0
      case 'bottom':
        return parseInt(style.paddingBottom || '0', 10) || 0
      case 'left':
        return parseInt(style.paddingLeft || '0', 10) || 0
    }
  } else {
    switch (sideForRead) {
      case 'top':
        return parseInt(style.marginTop || '0', 10) || 0
      case 'right':
        return parseInt(style.marginRight || '0', 10) || 0
      case 'bottom':
        return parseInt(style.marginBottom || '0', 10) || 0
      case 'left':
        return parseInt(style.marginLeft || '0', 10) || 0
    }
  }
  return null
}

/**
 * Compute the next snap value in the given direction.
 * - On-grid value: step by ± gridSize.
 * - Off-grid value: snap to next/prev grid multiple (first press
 *   "rescues" off-grid values, subsequent presses step normally).
 * - Negative results clamp to 0.
 */
function computeNextSnapValue(current: number, direction: 1 | -1, gridSize: number): number {
  if (current % gridSize === 0) {
    return Math.max(0, current + direction * gridSize)
  }
  if (direction > 0) {
    return Math.ceil(current / gridSize) * gridSize
  }
  return Math.max(0, Math.floor(current / gridSize) * gridSize)
}
