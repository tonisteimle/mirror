/**
 * Step-Runner — Layout Phase 2: sizing keywords (full / hug / grow).
 *
 * The reader registry only handles `w N` / `h N` (pixel form). Keyword
 * forms are asserted via `code` + `dom` directly. Computed-style checks
 * pin the IR pipeline (full → flex 1 1 0% on main axis, hug → fit-content,
 * grow → flex-grow 1) to actual rendered geometry.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

// ----- L2.1: w full child fills remaining width in hor parent ---------------
//
// Outer 300px hor Frame; child A is 100px fixed, child B is `w full`. By
// CSS flex math, child B takes the remaining 200px. This pins:
//   1. compiler emits `flex: 1 1 0%` for `w full` on main axis
//   2. preview renders the geometry (no panel reader needed for the keyword)

const wFullFillsRemaining: Scenario = {
  name: 'L2.1 w full child in hor parent fills the remaining width',
  category: 'step-runner',
  setup:
    'Frame hor, w 300, h 50\n' +
    '  Frame w 100, h 50, bg #ef4444\n' +
    '  Frame w full, h 50, bg #2271c1',
  steps: [
    {
      do: 'select',
      nodeId: 'node-3',
      expect: {
        selection: 'node-3',
        dom: {
          'node-3': {
            // 300 (parent) - 100 (sibling) = 200. Pins both flex-math and
            // the IR mapping `w full` → `flex: 1 1 0%` on the main axis.
            width: '200px',
            flexGrow: '1',
          },
        },
      },
    },
  ],
}

// ----- L2.2: h full child fills remaining height in ver parent --------------

const hFullFillsRemaining: Scenario = {
  name: 'L2.2 h full child in ver parent fills the remaining height',
  category: 'step-runner',
  setup:
    'Frame ver, w 50, h 300\n' +
    '  Frame w 50, h 100, bg #ef4444\n' +
    '  Frame w 50, h full, bg #2271c1',
  steps: [
    {
      do: 'select',
      nodeId: 'node-3',
      expect: {
        selection: 'node-3',
        dom: {
          'node-3': {
            height: '200px',
            flexGrow: '1',
          },
        },
      },
    },
  ],
}

// ----- L2.3: w hug shrinks parent to content width --------------------------
//
// The parent has `w hug` (no explicit width), child has fixed `w 120`.
// CSS fit-content + a single fixed-width child → parent width == child width.

const wHugShrinksToContent: Scenario = {
  name: 'L2.3 w hug shrinks the Frame to its single fixed-width child',
  category: 'step-runner',
  setup: 'Frame w hug, h 50\n  Frame w 120, h 30, bg #2271c1',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: { 'node-1': { width: '120px' } },
      },
    },
  ],
}

// ----- L2.4: grow distributes remaining space among siblings ----------------
//
// `grow` is the standalone form of flex-grow:1. Two siblings, one fixed,
// one growing — grower takes the remaining space exactly.

const growFillsRemaining: Scenario = {
  name: 'L2.4 grow on a sibling fills the remaining width in hor parent',
  category: 'step-runner',
  setup:
    'Frame hor, w 300, h 50\n' +
    '  Frame w 100, h 50, bg #ef4444\n' +
    '  Frame grow, h 50, bg #2271c1',
  steps: [
    {
      do: 'select',
      nodeId: 'node-3',
      expect: {
        selection: 'node-3',
        dom: {
          'node-3': {
            width: '200px',
            flexGrow: '1',
          },
        },
      },
    },
  ],
}

// ----- L2.5: w full on cross-axis stretches via align-self -----------------
//
// `w full` in a ver parent is the cross-axis case — the IR emits
// `width: 100%` + `align-self: stretch` instead of `flex: 1 1 0%`. This
// pins the secondary code path in the IR transformer.

const wFullCrossAxis: Scenario = {
  name: 'L2.5 w full child in ver parent stretches across the cross-axis',
  category: 'step-runner',
  setup: 'Frame ver, w 300, h 200\n  Frame w full, h 50, bg #2271c1',
  steps: [
    {
      do: 'select',
      nodeId: 'node-2',
      expect: {
        selection: 'node-2',
        dom: { 'node-2': { width: '300px' } },
      },
    },
  ],
}

export const layoutSizingScenarios: Scenario[] = [
  wFullFillsRemaining,
  hFullFillsRemaining,
  wHugShrinksToContent,
  growFillsRemaining,
  wFullCrossAxis,
]
export const layoutSizingStepRunnerTests: TestCase[] = layoutSizingScenarios.map(scenarioToTestCase)
