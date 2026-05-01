/**
 * Step-Runner — Layout Phase 3: alignment tokens.
 *
 * Tokens covered: `center`, `spread`, the 9-zone presets (tl/tc/tr/cl/cr/
 * bl/bc/br), and `hor-center`/`ver-center`. We assert via computed
 * `justify-content` + `align-items` on the parent (the deterministic
 * outputs of the IR mapping). Geometry-based assertions on child position
 * would also work but are noisier — direct CSS-property checks pin the
 * IR pipeline and skip layout-engine variance.
 *
 * Caveat: the 9-zone tokens force `flex-direction: column`. They override
 * any prior `hor`. Tests that exercise them use the default-vertical
 * direction so the assertion is unambiguous.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

// ----- L3.1: center standalone — both axes ---------------------------------

const centerCentersBoth: Scenario = {
  name: 'L3.1 center on a Frame sets justify+align to center on both axes',
  category: 'step-runner',
  setup: 'Frame center, w 200, h 200, bg #333\n  Frame w 50, h 50, bg #2271c1',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          'node-1': {
            justifyContent: 'center',
            alignItems: 'center',
          },
        },
      },
    },
  ],
}

// ----- L3.2: spread sets justify-content space-between ----------------------

const spreadDistributesChildren: Scenario = {
  name: 'L3.2 spread on a hor Frame distributes children with space-between',
  category: 'step-runner',
  setup:
    'Frame hor, spread, w 300, h 50\n' +
    '  Frame w 50, h 50, bg #ef4444\n' +
    '  Frame w 50, h 50, bg #10b981\n' +
    '  Frame w 50, h 50, bg #2271c1',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: { 'node-1': { justifyContent: 'space-between' } },
      },
    },
  ],
}

// ----- L3.3 9-zone presets (tl/tc/tr/cl/center/cr/bl/bc/br) -----------------
//
// Each zone token forces `flex-direction: column` plus a (justify, align)
// pair. Justify drives the vertical (main axis = column), align drives
// the horizontal (cross axis). The factory generates one scenario per
// zone — all share the same setup shape but with the zone token swapped
// in.

interface ZoneSpec {
  token: string
  /** Vertical via justify-content. */
  js: 'flex-start' | 'center' | 'flex-end'
  /** Horizontal via align-items. */
  ai: 'flex-start' | 'center' | 'flex-end'
  /** Step-id suffix for the L3.3.x label. */
  num: string
}

const ZONES: ZoneSpec[] = [
  { token: 'tl', num: 'a', js: 'flex-start', ai: 'flex-start' },
  { token: 'tc', num: 'b', js: 'flex-start', ai: 'center' },
  { token: 'tr', num: 'c', js: 'flex-start', ai: 'flex-end' },
  { token: 'cl', num: 'd', js: 'center', ai: 'flex-start' },
  { token: 'cr', num: 'e', js: 'center', ai: 'flex-end' },
  { token: 'bl', num: 'f', js: 'flex-end', ai: 'flex-start' },
  { token: 'bc', num: 'g', js: 'flex-end', ai: 'center' },
  { token: 'br', num: 'h', js: 'flex-end', ai: 'flex-end' },
]

const zoneScenarios: Scenario[] = ZONES.map(zone => ({
  name: `L3.3${zone.num} ${zone.token} sets justify=${zone.js}, align=${zone.ai}, direction column`,
  category: 'step-runner',
  setup: `Frame ${zone.token}, w 200, h 200, bg #333\n  Frame w 50, h 50, bg #2271c1`,
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          'node-1': {
            flexDirection: 'column',
            justifyContent: zone.js,
            alignItems: zone.ai,
          },
        },
      },
    },
  ],
}))

// ----- L3.4 hor-center / ver-center single-axis tokens ---------------------
//
// Both tokens force `flex-direction: column`. On column flex:
//   hor-center → align-items: center (centers across horizontal axis)
//   ver-center → justify-content: center (centers along vertical axis)

const horCenterAlignsHorizontal: Scenario = {
  name: 'L3.4a hor-center sets align-items center on a column Frame',
  category: 'step-runner',
  setup: 'Frame hor-center, w 200, h 200, bg #333\n  Frame w 50, h 50, bg #2271c1',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: { 'node-1': { flexDirection: 'column', alignItems: 'center' } },
      },
    },
  ],
}

const verCenterAlignsVertical: Scenario = {
  name: 'L3.4b ver-center sets justify-content center on a column Frame',
  category: 'step-runner',
  setup: 'Frame ver-center, w 200, h 200, bg #333\n  Frame w 50, h 50, bg #2271c1',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: { 'node-1': { flexDirection: 'column', justifyContent: 'center' } },
      },
    },
  ],
}

export const layoutAlignmentScenarios: Scenario[] = [
  centerCentersBoth,
  spreadDistributesChildren,
  ...zoneScenarios,
  horCenterAlignsHorizontal,
  verCenterAlignsVertical,
]
export const layoutAlignmentStepRunnerTests: TestCase[] =
  layoutAlignmentScenarios.map(scenarioToTestCase)
