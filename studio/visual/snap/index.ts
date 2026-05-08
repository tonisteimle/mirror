/**
 * Visual Snap Barrel
 *
 * Three semantically distinct snap domains, one import surface:
 *
 * - **spacing-snap** — stateful service: token-based snap for `pad`/`mar`/`gap`
 *   numeric values, with grid fallback. Caches token parsing keyed on source
 *   hash. Use `getSpacingSnapService()` (singleton) or `SpacingSnapService`
 *   (class) directly.
 *
 * - **alignment-snap** — stateless: edge/center/grid alignment for drag
 *   geometry. `calculateSnap(position, context)` is the entry point.
 *
 * - **grid-cell-snap** — stateless: viewport pointer → 1-indexed CSS-grid
 *   cell. `pointerToCell(cursor, geometry)`.
 *
 * The three are intentionally NOT merged into one class — they have
 * different statefulness profiles and forcing them through a single
 * facade would add indirection without simplifying anything. The barrel
 * exists for a unified import surface, not to flatten semantics.
 */

// Spacing-Snap (stateful: token-cache singleton)
export {
  SpacingSnapService,
  getSpacingSnapService,
  initSpacingSnapService,
  resetSpacingSnapService,
  shouldBypassSnapping,
  type SpacingSnapResult,
  type SpacingToken,
  type SpacingPropertyType,
} from './spacing-snap'

// Alignment-Snap (stateless: pure functions)
export {
  calculateSnap,
  snapPointToGrid,
  snapRectToGrid,
  createSnapConfig,
  createSnapContext,
  type SnapAxis,
  type AlignmentSnapResult,
  type SnapAxisInfo,
  type Guide as SnapGuide,
  type SnapConfig,
  type SnapContext,
} from './alignment-snap'

// Grid-Cell-Snap (stateless: pointer-to-cell geometry)
export { pointerToCell, readCurrentSpan, type GridCell } from './grid-cell-snap'
