/**
 * Grid Detector — pure DOM-reading helpers for the GridOverlay.
 *
 * No state, no side effects. Every function takes an Element and returns a
 * read-only summary. Designed so the overlay code can stay declarative:
 * "given selection X, here are all grid containers I should show".
 *
 * Why we read the *computed* DOM rather than the AST:
 *   A user-defined component like `MetaList as Frame: hor, wrap` ends up as
 *   a `<div>` whose `display` is decided by the compiler. Whether the div
 *   actually became a grid container is only knowable after compile. The
 *   AST would force us to resolve component chains ourselves; the browser
 *   already did that work.
 */

export interface GridGeometry {
  /** Inner content rect of the grid container (relative to the viewport). */
  rect: DOMRect
  /** X-offsets of all column boundaries, including 0 and total inner width. */
  columnLines: number[]
  /** Y-offsets of all row boundaries, including 0 and total inner height. */
  rowLines: number[]
  /** Pixel widths of each cell column (excludes the gap). */
  columnSizes: number[]
  /** Pixel heights of each cell row (excludes the gap). */
  rowSizes: number[]
  /** Column gap in px (0 if none). */
  columnGap: number
  /** Row gap in px (0 if none). */
  rowGap: number
}

/**
 * `true` iff this element is laid out as a CSS grid container.
 *
 * Note: we accept both `grid` and `inline-grid`. We do *not* use the AST
 * to look up `Frame grid 12` — a component chain like
 * `Container as Frame: ...` could resolve to a grid container too.
 */
export function isGridContainer(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false
  const display = getComputedStyle(el).display
  return display === 'grid' || display === 'inline-grid'
}

/**
 * Direct grid children — the elements that CSS Grid actually places into
 * cells. Excludes generated overlay elements (`data-mirror-overlay`),
 * style/script tags, and any synthetic Studio chrome that we inject.
 *
 * If the input is not itself a grid container, returns [].
 */
export function getDirectGridChildren(el: Element): HTMLElement[] {
  if (!isGridContainer(el)) return []
  const out: HTMLElement[] = []
  for (const child of Array.from(el.children)) {
    if (!(child instanceof HTMLElement)) continue
    if (child.tagName === 'STYLE' || child.tagName === 'SCRIPT') continue
    if (child.dataset.mirrorOverlay !== undefined) continue
    out.push(child)
  }
  return out
}

/**
 * Set of `"x,y"` cell-key strings occupied by direct grid children.
 * Reads gridColumnStart/Row + grid-column/row-end (`span N`) from each
 * child's computed style; cells beyond explicit tracks are silently
 * ignored (CSS would auto-grow, but our cell-snap math doesn't see
 * implicit tracks anyway).
 *
 * Used by the Phase-4 click-to-insert affordance to decide which cells
 * are empty and therefore clickable.
 */
export function getOccupiedCells(el: Element): Set<string> {
  const out = new Set<string>()
  if (!isGridContainer(el)) return out
  for (const child of getDirectGridChildren(el)) {
    const cs = getComputedStyle(child)
    const x = parseLineIndex(cs.gridColumnStart)
    const y = parseLineIndex(cs.gridRowStart)
    if (x === null || y === null) continue
    const w = parseSpan(cs.gridColumnEnd) ?? 1
    const h = parseSpan(cs.gridRowEnd) ?? 1
    // A `w 2` child blocks its right neighbor too — mark every cell
    // it spans, not just the start.
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        out.add(`${x + dx},${y + dy}`)
      }
    }
  }
  return out
}

function parseLineIndex(raw: string): number | null {
  if (!raw || raw === 'auto') return null
  const m = raw.match(/^(\d+)$/)
  return m ? parseInt(m[1], 10) : null
}

function parseSpan(raw: string): number | null {
  if (!raw) return null
  const m = raw.match(/^span\s+(\d+)$/)
  return m ? parseInt(m[1], 10) : null
}

/**
 * Walk up the DOM until we find a grid-container ancestor (inclusive).
 * Returns the innermost grid container, or null if none.
 */
export function findOwningGridContainer(el: Element | null): HTMLElement | null {
  let cur: Element | null = el
  while (cur && cur instanceof HTMLElement) {
    if (isGridContainer(cur)) return cur
    cur = cur.parentElement
  }
  return null
}

/**
 * Find every grid container at or below `root`. Order is document-order.
 * Used by the "always-show" toolbar mode and tests.
 */
export function findGridContainersIn(root: Element): HTMLElement[] {
  const out: HTMLElement[] = []
  if (root instanceof HTMLElement && isGridContainer(root)) out.push(root)
  // Descendants — querySelectorAll('*') is fine for a typical preview tree
  for (const el of Array.from(root.querySelectorAll('*'))) {
    if (el instanceof HTMLElement && isGridContainer(el)) out.push(el)
  }
  return out
}

/**
 * Read computed grid geometry. Returns null if the element isn't actually
 * a grid container, or if any track size couldn't be parsed (e.g. named
 * grid lines, which Mirror's DSL doesn't emit but a hand-rolled component
 * theoretically could).
 *
 * Track sizes come from `gridTemplateColumns` / `gridTemplateRows`, which
 * the browser resolves to absolute pixels — even for `1fr` and `auto`.
 * That means we get the *actually rendered* track widths, including the
 * effects of content size on auto rows.
 */
export function readGridGeometry(el: Element): GridGeometry | null {
  if (!isGridContainer(el) || !(el instanceof HTMLElement)) return null

  const cs = getComputedStyle(el)
  const columnSizes = parseTrackList(cs.gridTemplateColumns)
  const rowSizes = parseTrackList(cs.gridTemplateRows)
  if (columnSizes === null || rowSizes === null) return null

  const columnGap = parsePxOrZero(cs.columnGap)
  const rowGap = parsePxOrZero(cs.rowGap)

  // Border + padding shift the content origin. Lines should sit on the
  // content box, not the border box, otherwise they'd punch through any
  // border/padding the grid container itself has.
  const padLeft = parsePxOrZero(cs.paddingLeft)
  const padTop = parsePxOrZero(cs.paddingTop)
  const borderLeft = parsePxOrZero(cs.borderLeftWidth)
  const borderTop = parsePxOrZero(cs.borderTopWidth)

  const rect = el.getBoundingClientRect()
  const innerRect = new DOMRect(
    rect.left + borderLeft + padLeft,
    rect.top + borderTop + padTop,
    rect.width -
      borderLeft -
      parsePxOrZero(cs.borderRightWidth) -
      padLeft -
      parsePxOrZero(cs.paddingRight),
    rect.height -
      borderTop -
      parsePxOrZero(cs.borderBottomWidth) -
      padTop -
      parsePxOrZero(cs.paddingBottom)
  )

  const columnLines = buildBoundaryLines(columnSizes, columnGap)
  const rowLines = buildBoundaryLines(rowSizes, rowGap)

  return {
    rect: innerRect,
    columnLines,
    rowLines,
    columnSizes,
    rowSizes,
    columnGap,
    rowGap,
  }
}

/**
 * Parse a `gridTemplateColumns`-style computed value into an array of
 * pixel widths. The browser resolves `1fr` / `auto` / `minmax(...)` /
 * percentages to concrete `Npx` values, so a simple split + parseFloat
 * works for everything Mirror's DSL can express.
 *
 * Returns null if anything in the list isn't a px value (named lines,
 * `[start]`, etc.) — caller treats that as "can't visualize this grid".
 */
function parseTrackList(raw: string): number[] | null {
  if (!raw || raw === 'none') return []
  const tokens = raw.trim().split(/\s+/)
  const sizes: number[] = []
  for (const tok of tokens) {
    // Skip named-line brackets if they ever appear: `[mid]`
    if (tok.startsWith('[') || tok.endsWith(']')) continue
    if (!/px$/.test(tok)) return null
    const n = parseFloat(tok)
    if (!Number.isFinite(n)) return null
    sizes.push(n)
  }
  return sizes
}

/**
 * Build all visible cell-edge positions. For `[100, 100, 100]` with
 * `gap = 8` we emit `[0, 100, 108, 208, 216, 316]`: every cell boundary
 * gets a line, including the *both* edges of each gap. That way users
 * see "cell ends at 100, next cell starts at 108" — the gap is rendered
 * as breathing room *between* two visible boundaries, not vanishing into
 * one.
 *
 * For `gap = 0` (or single-column grids), adjacent boundaries collapse
 * naturally because the loop never adds a duplicate.
 */
function buildBoundaryLines(sizes: number[], gap: number): number[] {
  if (sizes.length === 0) return []
  const lines: number[] = [0]
  let cursor = 0
  for (let i = 0; i < sizes.length; i++) {
    cursor += sizes[i]
    lines.push(cursor) // cell-end edge
    if (i < sizes.length - 1 && gap > 0) {
      cursor += gap
      lines.push(cursor) // next cell's start edge
    }
  }
  return lines
}

function parsePxOrZero(raw: string): number {
  if (!raw) return 0
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : 0
}
