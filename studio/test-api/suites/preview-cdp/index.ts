/**
 * Preview CDP — barrel export.
 *
 * Bündelt alle preview-cdp Test-Wave-Files in eine Liste pro Sub-Bereich
 * (palette-drop, move, nesting, …) plus eine Gesamt-Liste für die
 * Top-Level-Kategorie. Konvention: jede Wave fügt eine neue Liste
 * hinzu; die Top-Level `previewCdpAllTests` ist nur das Concat aller
 * Sub-Listen.
 *
 * Plan-Doc: `docs/test-plan-preview-cdp.md`.
 */

import type { TestCase } from '../../types'

import { smokeTests } from './01-palette-drop/_smoke.test'
import { frameIntoEmptyCanvasTests } from './01-palette-drop/frame-into-empty-canvas.test'
import { frameIntoExistingFrameTests } from './01-palette-drop/frame-into-existing-frame.test'
import { textIntoFrameTests } from './01-palette-drop/text-into-frame.test'
import { buttonIntoFrameTests } from './01-palette-drop/button-into-frame.test'
import { iconIntoFrameTests } from './01-palette-drop/icon-into-frame.test'
import { appendAtEndVsIndexTests } from './01-palette-drop/append-at-end-vs-index.test'

import { moveIntoDifferentContainerTests } from './02-move/move-into-different-container.test'
import { reorderSiblingsTests } from './02-move/reorder-siblings.test'

import { nestIntoSiblingChildTests } from './03-nesting/nest-into-sibling-child.test'
import { unnestOutOfContainerTests } from './03-nesting/unnest-out-of-container.test'
import { deepNest3LevelsTests } from './03-nesting/deep-nest-3-levels.test'
import { textIntoNestedFrameTests } from './03-nesting/text-into-nested-frame.test'
import { twoLevelsDeepTests } from './03-nesting/two-levels-deep.test'

// Wave 1 — Smoke (verifies the helper layer is reachable).
export const previewCdpSmokeTests: TestCase[] = [...smokeTests]

// Wave 2-3 — palette drop atomic scenarios (filled wave-by-wave).
export const previewCdpPaletteDropTests: TestCase[] = [
  ...frameIntoEmptyCanvasTests,
  ...frameIntoExistingFrameTests,
  ...textIntoFrameTests,
  ...buttonIntoFrameTests,
  ...iconIntoFrameTests,
  ...appendAtEndVsIndexTests,
]

// Wave 4 — move (preview → preview).
export const previewCdpMoveTests: TestCase[] = [
  ...moveIntoDifferentContainerTests,
  ...reorderSiblingsTests,
]

// Wave 3 — drag-based nesting (reparent via Trusted dragstart/drop).
export const previewCdpNestingTests: TestCase[] = [
  ...nestIntoSiblingChildTests,
  ...unnestOutOfContainerTests,
  ...deepNest3LevelsTests,
  ...textIntoNestedFrameTests,
  ...twoLevelsDeepTests,
]

// Aggregate — every wave above flows into this list.
export const previewCdpAllTests: TestCase[] = [
  ...previewCdpSmokeTests,
  ...previewCdpPaletteDropTests,
  ...previewCdpMoveTests,
  ...previewCdpNestingTests,
]
