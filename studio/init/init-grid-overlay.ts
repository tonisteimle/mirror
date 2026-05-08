/**
 * GridOverlay initialization — visualizes Mirror's structural grids.
 *
 * Subscribes to:
 *   - `selection:changed`  → recompute which grids to highlight
 *   - `compile:completed`  → DOM was rebuilt, drop stale element refs
 *
 * Phase 1 only handles visualization. Phase 2 will hook drag/snap into the
 * same overlay and Phase 3 adds resize-cell-spans.
 */

import { events } from '../core'
import { executor } from '../core/command-executor'
import { InsertComponentCommand } from '../core/commands'
import { GridOverlay, type GridOverlayMode } from '../visual/grid-overlay'
import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('GridOverlayInit')

export interface GridOverlayInitConfig {
  /** Preview container — usually `#preview`. */
  container: HTMLElement
  /** Initial mode. Defaults to 'auto'. */
  mode?: GridOverlayMode
}

export interface GridOverlayInitResult {
  overlay: GridOverlay
  dispose: () => void
}

export function initGridOverlay(config: GridOverlayInitConfig): GridOverlayInitResult {
  const overlay = new GridOverlay({ container: config.container })
  overlay.setMode(config.mode ?? 'auto')

  const offSelection = events.on('selection:changed', payload => {
    overlay.setSelection(payload.nodeId)
  })

  // Recompile rebuilds preview innerHTML — we must drop our SVGs, then
  // re-find grids on the next selection / refresh tick.
  const offCompile = events.on('compile:completed', () => {
    // RAF lets the browser commit the new DOM and run layout before we
    // try to read computed grid geometry.
    requestAnimationFrame(() => overlay.refresh())
  })

  // Phase-2: live drag preview. DragController emits `grid:active-cell`
  // (or null) on every dragover that lands in / leaves a CSS-grid
  // container.
  const offActiveCell = events.on('grid:active-cell', hint => {
    overlay.setActiveCell(hint)
  })

  // Phase-4: click-to-insert. The overlay emits `grid:insert-at-cell`
  // when the user clicks an empty cell. We translate that into an
  // InsertComponentCommand that adds a default Frame at the cell.
  // Default placeholder bg is the accent — visible by default so the
  // user sees the click landed even before they style it.
  const offInsertCell = events.on('grid:insert-at-cell', ({ containerId, gridX, gridY }) => {
    const command = new InsertComponentCommand({
      parentId: containerId,
      component: 'Frame',
      properties: `x ${gridX}, y ${gridY}, bg #2271C1`,
      position: 'last',
    })
    const result = executor.execute(command)
    if (!result.success) {
      log.warn('grid:insert-at-cell failed:', result.error)
    }
  })

  log.info('GridOverlay initialized', { mode: config.mode ?? 'auto' })

  return {
    overlay,
    dispose: () => {
      offSelection()
      offCompile()
      offActiveCell()
      offInsertCell()
      overlay.dispose()
    },
  }
}
