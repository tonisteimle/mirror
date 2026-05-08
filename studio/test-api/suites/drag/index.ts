/**
 * Drag Test Suite Index
 *
 * Re-exports from existing drag test files.
 */

// Comprehensive drag tests (migrated from browser-test-api.ts)
export {
  allComprehensiveDragTests,
  allPaletteDropTests,
  allCanvasMoveTests,
  paletteDropBasicTests,
  paletteDropPositionTests,
  paletteDropNestedTests,
  paletteDropHorizontalTests,
  paletteDropLayoutTests,
  paletteDropZagTests,
  paletteDropComplexTests,
  canvasMoveReorderTests,
  canvasMoveCrossContainerTests,
  canvasMoveHorizontalTests,
  canvasMoveComplexTests,
  stackedDropTests,
} from './comprehensive-drag-tests'

export {
  allStackedDragTests,
  basicStackedTests,
  edgeCaseTests,
  layoutDetectionTests,
} from '../stacked-drag'

export {
  allFlexReorderTests,
  buttonReorderVerticalTests,
  buttonReorderHorizontalTests,
  textReorderTests,
  iconReorderTests,
  inputReorderTests,
  imageReorderTests,
  dividerSpacerReorderTests,
  linkTextareaReorderTests,
  mixedComponentReorderTests,
  zagComponentReorderTests,
  nestedContainerReorderTests,
  reorderEdgeCaseTests,
  sequentialReorderTests,
} from '../flex-reorder'

export {
  allAlignmentZoneTests,
  basicAlignmentZoneTests,
  allZonesTests,
  alignmentEdgeCaseTests,
  componentVarietyTests,
} from './alignment-zone-tests'

export {
  allAlignmentFromEmptyTests,
  alignmentFromEmptyTests,
  all9ZonesFromEmptyTests,
  alignmentVisualFeedbackTests,
  alignmentParentChildTests,
} from './alignment-from-empty.test'

export {
  allAlignmentFromMoveTests,
  moveSingleChildTests,
  all9ZonesFromMoveTests,
  multipleChildrenNoAlignmentTests,
  alignmentMoveEdgeCases,
} from './alignment-from-move.test'

// Tight contract tests: byte-exact source + DOM computed-style + threshold
export { alignmentTightTests } from './alignment-tight.test'

// Each-template guard: blocks reorder of each-rendered nodes
export { eachTemplateGuardTests } from './each-template-guard.test'

// Grid cell drop (Phase 2): cell-aware drop on CSS-grid containers writes
// `x N, y M` (and optional `w P, h Q`) to the dropped element's DSL.
export { gridCellDropTests } from './grid-cell-drop.test'

// Grid cell resize (Phase 3): resize handles on grid-placed elements
// snap to cell-spans and write `w N, h M` (and `x P, y Q` for w/n drags).
export { gridCellResizeTests } from './grid-cell-resize.test'

// Grid cell insert (Phase 4): clicking an empty cell of an active grid
// inserts a default Frame at that cell.
export { gridCellInsertTests } from './grid-cell-insert.test'

// Real pointer events: bypasses __dragTest, exercises HitDetector + InsertionCalculator
export { realPointerEventTests } from './real-pointer-events.test'

// Mirror-specific edge cases: components, sub-trees, tokens, undo/redo
export {
  allMoveEdgeCaseTests,
  moveComponentTests,
  moveDeepSubtreeTests,
  moveTokenReferenceTests,
  moveUndoRedoTests,
} from './move-edge-cases.test'
