/**
 * Step-Runner — Layout Phase 5: nested flex containers.
 *
 * Each parent + each level inside the tree gets its own direction +
 * spacing assertions. Nested layout bugs typically come from the IR
 * pipeline applying parent context (`parentLayoutContext`) incorrectly
 * to children, or from `display: flex` not propagating to inner Frames.
 * These scenarios pin the rendered shape across multiple levels at once.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

// ----- L5.1: 2-level — ver outer with two hor inner rows --------------------

const verOuterHorInner: Scenario = {
  name: 'L5.1 ver outer with two hor inner rows renders both directions',
  category: 'step-runner',
  setup:
    'Frame ver, gap 8, w 200\n' +
    '  Frame hor, gap 4, h 30\n' +
    '    Text "A1"\n' +
    '    Text "A2"\n' +
    '  Frame hor, gap 4, h 30\n' +
    '    Text "B1"\n' +
    '    Text "B2"',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          'node-1': { flexDirection: 'column', rowGap: '8px' },
          'node-2': { flexDirection: 'row', columnGap: '4px' },
          'node-5': { flexDirection: 'row', columnGap: '4px' },
        },
      },
    },
  ],
}

// ----- L5.2: 2-level — hor outer with two ver inner columns -----------------

const horOuterVerInner: Scenario = {
  name: 'L5.2 hor outer with two ver inner columns renders both directions',
  category: 'step-runner',
  setup:
    'Frame hor, gap 8, h 100\n' +
    '  Frame ver, gap 4, w 80\n' +
    '    Text "A1"\n' +
    '    Text "A2"\n' +
    '  Frame ver, gap 4, w 80\n' +
    '    Text "B1"\n' +
    '    Text "B2"',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          'node-1': { flexDirection: 'row', columnGap: '8px' },
          'node-2': { flexDirection: 'column', rowGap: '4px' },
          'node-5': { flexDirection: 'column', rowGap: '4px' },
        },
      },
    },
  ],
}

// ----- L5.3: 3-level — Card pattern (outer ver, header hor, body ver) -------
//
// The realistic shape: a card has a horizontal header (icon + title) and
// a vertical body (paragraphs). Three nesting levels, each with its own
// direction + spacing. This pins the IR's recursive parentLayoutContext
// passing.

const cardPattern3Level: Scenario = {
  name: 'L5.3 3-level Card pattern (outer ver, header hor, body ver) renders correctly',
  category: 'step-runner',
  setup:
    'Frame ver, pad 16, gap 12, w 240, bg #1a1a1a\n' +
    '  Frame hor, gap 8, h 24\n' +
    '    Icon "circle", is 16, ic #2271c1\n' +
    '    Text "Title", weight 500\n' +
    '  Frame ver, gap 4\n' +
    '    Text "Line 1", col #888\n' +
    '    Text "Line 2", col #888',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          'node-1': {
            flexDirection: 'column',
            paddingTop: '16px',
            rowGap: '12px',
          },
          'node-2': { flexDirection: 'row', columnGap: '8px' },
          'node-5': { flexDirection: 'column', rowGap: '4px' },
        },
      },
    },
  ],
}

export const layoutNestingScenarios: Scenario[] = [
  verOuterHorInner,
  horOuterVerInner,
  cardPattern3Level,
]
export const layoutNestingStepRunnerTests: TestCase[] =
  layoutNestingScenarios.map(scenarioToTestCase)
