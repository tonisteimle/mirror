/**
 * Position-arrow keyboard handling.
 *
 * Extracted from keyboard-handler.ts. Plain ↑/↓/←/→ moves the selected
 * element by 1px (10px with Shift) — but only when the element is inside
 * an absolute / stacked container. The detection cascades through three
 * sources of truth, each progressively more expensive but more reliable
 * if the previous tier missed:
 *   1. LayoutService cache (O(1), set during layout pass)
 *   2. Centralized DOM-based detection (`isAbsoluteLayoutContainer`)
 *   3. Computed `position: absolute` on the element itself
 *
 * Position read order is similar — LayoutService → data attrs → computed
 * left/top → bounding rect relative to parent.
 */

import { events, getLayoutService, SetPositionCommand, type CommandContext } from '../../core'
import { isAbsoluteLayoutContainer } from '../../code-modifier/utils/layout-detection'
import { createLogger } from '../../../compiler/utils/logger'

const log = createLogger('KeyboardHandler:position')

export interface PositionArrowContext {
  container: HTMLElement
  nodeIdAttribute: string
  getCommandContext: () => CommandContext | null
}

export function isArrowKey(key: string): boolean {
  return key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight'
}

/**
 * True when an element should accept arrow-key position adjustments.
 * Traverses LayoutService cache first, then DOM as a fallback.
 */
export function isInAbsoluteContainer(ctx: PositionArrowContext, nodeId: string): boolean {
  // Try LayoutService first (cached, O(1))
  const layoutService = getLayoutService()
  if (layoutService) {
    const layout = layoutService.getLayout(nodeId)
    if (layout) {
      if (layout.isAbsolute) return true
      if (layout.parentId) {
        const parentLayout = layoutService.getLayout(layout.parentId)
        if (parentLayout && parentLayout.isAbsolute) return true
      }
    }
  }

  const element = ctx.container.querySelector(
    `[${ctx.nodeIdAttribute}="${nodeId}"]`
  ) as HTMLElement | null
  if (!element) return false

  const parent = element.parentElement
  if (parent && isAbsoluteLayoutContainer(parent)) return true

  return window.getComputedStyle(element).position === 'absolute'
}

/**
 * Get the current (x, y) of an element. Prefers cached/intrinsic sources
 * over computed style, so a position that didn't make it onto the
 * element's `style.left` (e.g. inherited via flex centring) still
 * resolves to a sensible number.
 *
 * Returns `null` rather than {0, 0} when nothing is determinable — the
 * caller surfaces a notification instead of moving the element to the
 * origin.
 */
export function getCurrentPosition(
  ctx: PositionArrowContext,
  nodeId: string
): { x: number; y: number } | null {
  const layoutService = getLayoutService()
  if (layoutService) {
    const layout = layoutService.getLayout(nodeId)
    if (layout) {
      return { x: Math.round(layout.x), y: Math.round(layout.y) }
    }
  }

  const element = ctx.container.querySelector(
    `[${ctx.nodeIdAttribute}="${nodeId}"]`
  ) as HTMLElement | null
  if (!element) return null

  // data-x / data-y come from the DSL itself (most authoritative)
  const dataX = element.dataset.x
  const dataY = element.dataset.y
  if (dataX !== undefined && dataY !== undefined) {
    const x = parseInt(dataX, 10)
    const y = parseInt(dataY, 10)
    if (!isNaN(x) && !isNaN(y)) return { x, y }
  }

  const style = window.getComputedStyle(element)
  if (style.left && style.left !== 'auto' && style.top && style.top !== 'auto') {
    const x = parseFloat(style.left)
    const y = parseFloat(style.top)
    if (!isNaN(x) && !isNaN(y)) return { x: Math.round(x), y: Math.round(y) }
  }

  // Last resort: bounding rect relative to parent (works for any layout).
  const parent = element.parentElement
  const elementRect = element.getBoundingClientRect()
  if (parent) {
    const parentRect = parent.getBoundingClientRect()
    return {
      x: Math.round(elementRect.left - parentRect.left),
      y: Math.round(elementRect.top - parentRect.top),
    }
  }
  const containerRect = ctx.container.getBoundingClientRect()
  return {
    x: Math.round(elementRect.left - containerRect.left),
    y: Math.round(elementRect.top - containerRect.top),
  }
}

/**
 * Apply an arrow-key move (1px, 10px with Shift) to the selected
 * element via SetPositionCommand. Surfaces a warning notification if
 * the position couldn't be read or no command context is available —
 * never silently no-ops, never defaults to origin.
 */
export function handleArrowMove(ctx: PositionArrowContext, e: KeyboardEvent, nodeId: string): void {
  const step = e.shiftKey ? 10 : 1

  let dx = 0
  let dy = 0
  switch (e.key) {
    case 'ArrowUp':
      dy = -step
      break
    case 'ArrowDown':
      dy = step
      break
    case 'ArrowLeft':
      dx = -step
      break
    case 'ArrowRight':
      dx = step
      break
  }

  const currentPos = getCurrentPosition(ctx, nodeId)
  if (!currentPos) {
    log.warn('Cannot determine position for element:', nodeId)
    events.emit('notification:warning', {
      message: 'Element-Position konnte nicht ermittelt werden',
      duration: 2000,
    })
    return
  }

  const cmdCtx = ctx.getCommandContext()
  if (!cmdCtx) {
    log.warn('No command context available for position update')
    events.emit('notification:warning', {
      message: 'Aktion nicht verfügbar - bitte erneut versuchen',
      duration: 2000,
    })
    return
  }

  const newX = currentPos.x + dx
  const newY = currentPos.y + dy
  const command = new SetPositionCommand({
    nodeId,
    x: newX,
    y: newY,
    description: `Move ${e.key}`,
  })

  const result = command.execute(cmdCtx)
  if (result.success) {
    cmdCtx.compile()
    events.emit('notification:success', { message: `Moved to (${newX}, ${newY})` })
  } else {
    events.emit('notification:warning', { message: result.error || 'Failed to move element' })
  }
}
