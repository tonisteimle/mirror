/**
 * GridOverlay — visualizes Mirror's structural grids inside the preview.
 *
 * Lifecycle:
 *   const overlay = new GridOverlay({ container })
 *   overlay.setMode('auto')              // show only for selected grid + child
 *   overlay.setSelection(nodeId)         // selection changed — recompute
 *   overlay.refresh()                    // DOM rebuilt — re-find grids
 *   overlay.dispose()
 *
 * Architecture:
 *   - One <svg data-mirror-overlay="grid"> per visualized grid container,
 *     positioned inside the preview's scroll content. SVG sibling of the
 *     grid container's bounding rect (NOT a child — wouldn't want to add
 *     a node into the user's grid and steal a cell).
 *   - SVG redraws on resize/scroll/recompile via ResizeObserver +
 *     window resize + manual `refresh()` from boot wiring.
 *
 * Why SVG, not HTML divs:
 *   - Crisp 1px lines at any DPI, no rounding-shift on subpixel positions.
 *   - Single-element redraw per grid (vs one div per line) keeps DOM
 *     mutation count low when geometry ticks during drag.
 */

import { Z_INDEX_GRID_OVERLAY } from '../constants/z-index'
import { events } from '../../core'
import {
  isGridContainer,
  findOwningGridContainer,
  findGridContainersIn,
  readGridGeometry,
  getOccupiedCells,
  type GridGeometry,
} from './grid-detector'

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Visual configuration — exposed as constants so tests can assert + visual
 *  tweaks happen in one place. */
const STROKE_WIDTH = 1
const STROKE_DASH = '3 3'
/** CSS variable for the line color — falls back to a hard-coded accent if
 *  the token isn't defined (e.g. tests that don't load Studio's theme). */
const STROKE_VAR = 'var(--accent, #2271C1)'
const STROKE_OPACITY = 0.45

export type GridOverlayMode = 'auto' | 'always' | 'off'

export interface GridOverlayConfig {
  /** Preview container — usually `#preview`. SVG overlays append here as
   *  siblings of the user's compiled DOM. */
  container: HTMLElement
}

interface ActiveGrid {
  /** The user's grid container HTMLElement we're tracking. */
  target: HTMLElement
  /** The SVG element drawn over it. */
  svg: SVGSVGElement
  /** ResizeObserver scoped to this grid (so we redraw when its size changes). */
  observer: ResizeObserver | null
  /** Active-drag cell highlight rect (lazily attached as last child of svg). */
  activeCellRect: SVGRectElement | null
}

/** Active drop-target cell, set during a grid drag. */
export interface ActiveCellHint {
  /** node-id of the grid container the cell belongs to. */
  containerId: string
  /** 1-indexed cell coordinates + span. */
  gridX: number
  gridY: number
  gridW: number
  gridH: number
}

export class GridOverlay {
  private container: HTMLElement
  private mode: GridOverlayMode = 'auto'
  private selectionId: string | null = null
  /** Map from grid HTMLElement → its active overlay record. Identity-keyed so
   *  we can diff cheaply on each `refresh()`. */
  private active = new Map<HTMLElement, ActiveGrid>()
  private windowResizeHandler: () => void
  /** Currently-previewed drop cell (from a live drag), or null. */
  private activeCell: ActiveCellHint | null = null
  /**
   * Currently-hovered insert-target cell (from cursor over an empty
   * cell with no drag in flight). Painted with the same highlight as
   * activeCell — distinct field so a real drag never gets shadowed by
   * leftover hover state.
   */
  private hoveredCell: ActiveCellHint | null = null

  constructor(config: GridOverlayConfig) {
    this.container = config.container
    // Need position:relative so our absolute-positioned SVGs sit in the
    // same coord space as the user's content (existing OverlayManager
    // already sets this on #preview, but we don't want to depend on its
    // initialization order).
    if (getComputedStyle(this.container).position === 'static') {
      this.container.style.position = 'relative'
    }
    this.windowResizeHandler = () => this.refresh()
    window.addEventListener('resize', this.windowResizeHandler, { passive: true })
  }

  // ============================================================================
  // Public API
  // ============================================================================

  setMode(mode: GridOverlayMode): void {
    if (this.mode === mode) return
    this.mode = mode
    this.refresh()
  }

  setSelection(nodeId: string | null): void {
    if (this.selectionId === nodeId) return
    this.selectionId = nodeId
    this.refresh()
  }

  /**
   * Set the currently-previewed drop cell (from a live drag). Pass null
   * when the drag leaves all grids or ends. While an active cell is set,
   * the overlay forces visualization of that cell's owning grid (even if
   * it wouldn't otherwise be visible under `auto` mode).
   */
  setActiveCell(hint: ActiveCellHint | null): void {
    this.activeCell = hint
    this.refresh()
  }

  /**
   * Recompute which grid containers should be visualized and redraw them.
   * Cheap to call repeatedly: identity-diff means unchanged grids keep
   * their existing SVG (no DOM thrash).
   */
  refresh(): void {
    const wanted = this.computeWantedGrids()
    const wantedSet = new Set(wanted)

    // Tear down any previously-visualized grids that are no longer wanted
    // (or whose target was detached by a recompile).
    for (const [target, record] of Array.from(this.active.entries())) {
      if (!wantedSet.has(target) || !this.container.contains(target)) {
        this.removeOverlay(target, record)
      }
    }

    // Add or update the wanted set.
    for (const target of wanted) {
      const existing = this.active.get(target)
      if (existing) {
        this.redraw(existing)
      } else {
        this.addOverlay(target)
      }
    }
  }

  dispose(): void {
    window.removeEventListener('resize', this.windowResizeHandler)
    for (const [target, record] of Array.from(this.active.entries())) {
      this.removeOverlay(target, record)
    }
  }

  // ============================================================================
  // Mode resolution — which grids get a visible overlay right now?
  // ============================================================================

  private computeWantedGrids(): HTMLElement[] {
    if (this.mode === 'off') {
      // 'off' still respects an active drag preview — otherwise the
      // user's `setMode('off')` would silently swallow Phase-2 feedback.
      return this.activeCellGrid()
        .map(el => [el])
        .flat()
    }

    if (this.mode === 'always') {
      return findGridContainersIn(this.container)
    }

    // mode === 'auto': show grids that the user is currently working with.
    const result: HTMLElement[] = []

    // 0) The grid being targeted by an in-flight drag (always shown
    //    during drag, regardless of selection).
    for (const el of this.activeCellGrid()) {
      if (!result.includes(el)) result.push(el)
    }

    if (!this.selectionId) return result

    const selectedEl = this.container.querySelector<HTMLElement>(
      `[data-mirror-id="${cssEscape(this.selectionId)}"]`
    )
    if (!selectedEl) return result

    // 1) The selected element itself, if it's a grid container.
    if (isGridContainer(selectedEl) && !result.includes(selectedEl)) {
      result.push(selectedEl)
    }

    // 2) The grid container that owns the selected element (for "I'm
    //    editing a grid child" workflows). De-duplicated against case 1.
    const owner = findOwningGridContainer(selectedEl.parentElement)
    if (owner && !result.includes(owner)) result.push(owner)

    return result
  }

  /** Resolve the active-cell hint to its DOM-side grid container, if any. */
  private activeCellGrid(): HTMLElement[] {
    if (!this.activeCell) return []
    const el = this.container.querySelector<HTMLElement>(
      `[data-mirror-id="${cssEscape(this.activeCell.containerId)}"]`
    )
    if (!el || !isGridContainer(el)) return []
    return [el]
  }

  // ============================================================================
  // SVG rendering
  // ============================================================================

  private addOverlay(target: HTMLElement): void {
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement
    svg.dataset.mirrorOverlay = 'grid'
    svg.style.position = 'absolute'
    svg.style.pointerEvents = 'none'
    svg.style.zIndex = String(Z_INDEX_GRID_OVERLAY)
    svg.style.overflow = 'visible'
    this.container.appendChild(svg)

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => this.redraw(record))
      observer.observe(target)
    }

    const record: ActiveGrid = { target, svg, observer, activeCellRect: null }
    this.active.set(target, record)
    this.redraw(record)
  }

  private removeOverlay(target: HTMLElement, record: ActiveGrid): void {
    record.observer?.disconnect()
    record.svg.remove()
    this.active.delete(target)
  }

  private redraw(record: ActiveGrid): void {
    const geo = readGridGeometry(record.target)
    if (!geo || geo.columnLines.length === 0 || geo.rowLines.length === 0) {
      // Geometry isn't visualizable right now (empty grid, named lines,
      // detached element). Hide rather than tear down — the next refresh
      // tick may revive it.
      record.svg.style.display = 'none'
      return
    }

    // Translate viewport-rect to container-relative coords, factoring in
    // the container's scroll offset (so SVG follows scroll naturally).
    const containerRect = this.container.getBoundingClientRect()
    const x = geo.rect.left - containerRect.left + this.container.scrollLeft
    const y = geo.rect.top - containerRect.top + this.container.scrollTop
    const w = geo.rect.width
    const h = geo.rect.height

    record.svg.style.display = ''
    record.svg.style.left = `${x}px`
    record.svg.style.top = `${y}px`
    record.svg.setAttribute('width', String(w))
    record.svg.setAttribute('height', String(h))
    record.svg.setAttribute('viewBox', `0 0 ${w} ${h}`)

    // Rebuild contents. Cheap because line count is tiny (≤ ~30 lines for
    // any realistic grid). Replacing innerHTML is faster than diffing
    // individual <line> elements at this scale.
    record.svg.replaceChildren()

    // Vertical lines (column boundaries) span the full SVG height; horizontal
    // (row boundaries) span the full width. SVG `overflow: visible` keeps any
    // marginally-out-of-bounds lines (subpixel rounding) painted, so we
    // don't filter them.
    for (const xPos of geo.columnLines) {
      record.svg.appendChild(makeLine(xPos, 0, xPos, h))
    }
    for (const yPos of geo.rowLines) {
      record.svg.appendChild(makeLine(0, yPos, w, yPos))
    }

    // Active drop-cell highlight: solid accent fill + outline, sits on top
    // of the dashed lines. Rendered last so it's painted above. Drag
    // wins over hover when both are set — a click in flight is a
    // committed drop intent.
    record.activeCellRect = null
    const activeHint =
      this.activeCell && this.isHintForTarget(this.activeCell, record.target)
        ? this.activeCell
        : this.hoveredCell && this.isHintForTarget(this.hoveredCell, record.target)
          ? this.hoveredCell
          : null
    if (activeHint) {
      const cellRect = computeCellRect(geo, activeHint)
      if (cellRect) {
        const rect = document.createElementNS(SVG_NS, 'rect') as SVGRectElement
        rect.setAttribute('x', String(cellRect.x))
        rect.setAttribute('y', String(cellRect.y))
        rect.setAttribute('width', String(cellRect.w))
        rect.setAttribute('height', String(cellRect.h))
        rect.setAttribute('fill', STROKE_VAR)
        rect.setAttribute('fill-opacity', '0.18')
        rect.setAttribute('stroke', STROKE_VAR)
        rect.setAttribute('stroke-width', '1.5')
        rect.setAttribute('stroke-opacity', '0.9')
        record.svg.appendChild(rect)
        record.activeCellRect = rect
      }
    }

    // Phase 4: empty-cell click affordance. One transparent rect per
    // unoccupied cell, with `pointer-events: auto` so SVG-level clicks
    // route to the insert handler. Lines + filled cells stay
    // pointer-events: none (set on the SVG root) so normal selection
    // clicks pass through unchanged.
    this.addEmptyCellHitZones(record, geo)
  }

  private addEmptyCellHitZones(record: ActiveGrid, geo: GridGeometry): void {
    const containerId = record.target.dataset.mirrorId
    if (!containerId) return
    const occupied = getOccupiedCells(record.target)
    const colCount = geo.columnSizes.length
    const rowCount = geo.rowSizes.length

    for (let y = 1; y <= rowCount; y++) {
      for (let x = 1; x <= colCount; x++) {
        if (occupied.has(`${x},${y}`)) continue
        const cellRect = computeCellRect(geo, {
          containerId,
          gridX: x,
          gridY: y,
          gridW: 1,
          gridH: 1,
        })
        if (!cellRect) continue

        const hit = document.createElementNS(SVG_NS, 'rect') as SVGRectElement
        hit.setAttribute('x', String(cellRect.x))
        hit.setAttribute('y', String(cellRect.y))
        hit.setAttribute('width', String(cellRect.w))
        hit.setAttribute('height', String(cellRect.h))
        hit.setAttribute('fill', 'transparent')
        hit.style.pointerEvents = 'auto'
        hit.style.cursor = 'pointer'
        hit.dataset.mirrorOverlay = 'grid-cell-hit'

        hit.addEventListener('mouseenter', () => {
          this.hoveredCell = { containerId, gridX: x, gridY: y, gridW: 1, gridH: 1 }
          // Local refresh — don't re-emit `grid:active-cell` (would loop
          // back into setActiveCell). The hovered field drives redraw.
          this.refresh()
        })
        hit.addEventListener('mouseleave', () => {
          if (
            this.hoveredCell &&
            this.hoveredCell.containerId === containerId &&
            this.hoveredCell.gridX === x &&
            this.hoveredCell.gridY === y
          ) {
            this.hoveredCell = null
            this.refresh()
          }
        })
        hit.addEventListener('click', e => {
          // Stop propagation so the underlying preview-click handler
          // doesn't re-select the grid (or unselect if it's already
          // selected) — the insert handler manages selection itself.
          e.stopPropagation()
          this.hoveredCell = null
          events.emit('grid:insert-at-cell', { containerId, gridX: x, gridY: y })
        })

        record.svg.appendChild(hit)
      }
    }
  }

  /**
   * Does an active-cell hint correspond to a specific overlay target?
   * Compares via the `data-mirror-id` attribute, which the IR sets on
   * every rendered node — robust against re-mount/re-compile cycles.
   */
  private isHintForTarget(hint: ActiveCellHint, target: HTMLElement): boolean {
    const id = target.dataset.mirrorId
    return !!id && id === hint.containerId
  }
}

/**
 * Translate a cell hint (1-indexed) to a pixel rect inside the SVG's
 * coordinate space — relative to the grid's inner content origin.
 *
 * Returns null when the hint references cells beyond the grid's
 * explicit tracks. CSS would auto-grow the grid to fit, but we don't
 * have geometry for those implicit tracks so we just don't render.
 */
function computeCellRect(
  geo: import('./grid-detector').GridGeometry,
  hint: ActiveCellHint
): { x: number; y: number; w: number; h: number } | null {
  const colCount = geo.columnSizes.length
  const rowCount = geo.rowSizes.length
  if (hint.gridX < 1 || hint.gridY < 1) return null
  if (hint.gridX > colCount || hint.gridY > rowCount) return null

  const xStart = trackStart(geo.columnSizes, geo.columnGap, hint.gridX - 1)
  const yStart = trackStart(geo.rowSizes, geo.rowGap, hint.gridY - 1)
  const wEnd = trackEnd(
    geo.columnSizes,
    geo.columnGap,
    hint.gridX - 1 + Math.min(hint.gridW, colCount - hint.gridX + 1)
  )
  const hEnd = trackEnd(
    geo.rowSizes,
    geo.rowGap,
    hint.gridY - 1 + Math.min(hint.gridH, rowCount - hint.gridY + 1)
  )

  return { x: xStart, y: yStart, w: wEnd - xStart, h: hEnd - yStart }
}

/** Pixel offset of the leading edge of the i-th track. */
function trackStart(sizes: number[], gap: number, i: number): number {
  let pos = 0
  for (let k = 0; k < i; k++) {
    pos += sizes[k]
    if (gap > 0) pos += gap
  }
  return pos
}

/** Pixel offset of the trailing edge of the i-th track (exclusive of trailing gap). */
function trackEnd(sizes: number[], gap: number, i: number): number {
  // i is the count of tracks consumed (1-indexed end). End is start of (i+1)
  // minus the leading gap of (i+1).
  let pos = 0
  for (let k = 0; k < i; k++) {
    pos += sizes[k]
    if (k < i - 1 && gap > 0) pos += gap
  }
  return pos
}

// ============================================================================
// Helpers
// ============================================================================

function makeLine(x1: number, y1: number, x2: number, y2: number): SVGLineElement {
  const line = document.createElementNS(SVG_NS, 'line') as SVGLineElement
  line.setAttribute('x1', String(x1))
  line.setAttribute('y1', String(y1))
  line.setAttribute('x2', String(x2))
  line.setAttribute('y2', String(y2))
  line.setAttribute('stroke', STROKE_VAR)
  line.setAttribute('stroke-width', String(STROKE_WIDTH))
  line.setAttribute('stroke-dasharray', STROKE_DASH)
  line.setAttribute('opacity', String(STROKE_OPACITY))
  line.setAttribute('shape-rendering', 'crispEdges')
  return line
}

/**
 * Minimal CSS.escape polyfill for the `data-mirror-id` attribute selector.
 * Mirror's node ids are `node-N` (digit-only), but we defensively escape
 * to keep the selector valid if that scheme ever changes.
 */
function cssEscape(s: string): string {
  if (typeof (window as any).CSS?.escape === 'function') {
    return (window as any).CSS.escape(s)
  }
  return s.replace(/[^a-zA-Z0-9_-]/g, ch => `\\${ch}`)
}
