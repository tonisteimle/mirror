/**
 * Step-Runner — Layout Phase 6: realistic use-case combinations.
 *
 * Real UI patterns designers build daily: toolbar, sidebar+main, centered
 * modal, card stack. Each scenario combines properties from earlier
 * phases (direction + alignment + sizing + spacing) and asserts the
 * shape from the user's perspective ("the sidebar is exactly 200px and
 * main fills the rest"), not just isolated properties.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

// ----- L6.1: Toolbar — three buttons distributed via spread -----------------

const toolbarSpread: Scenario = {
  name: 'L6.1 Toolbar (hor + spread + pad) distributes three buttons',
  category: 'step-runner',
  setup:
    'Frame hor, spread, pad 12, w 400, h 48, bg #1a1a1a\n' +
    '  Button "Save", bg #2271c1, col white\n' +
    '  Button "Cancel", bg #333, col white\n' +
    '  Button "Help", bg #333, col white',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          'node-1': {
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingTop: '12px',
            paddingLeft: '12px',
          },
        },
      },
    },
  ],
}

// ----- L6.2: Sidebar + Main — fixed sidebar, w full main --------------------

const sidebarMain: Scenario = {
  name: 'L6.2 Sidebar (w 200) + Main (w full) split a hor parent precisely',
  category: 'step-runner',
  setup:
    'Frame hor, w 800, h 400\n' +
    '  Frame w 200, h full, bg #1a1a1a\n' +
    '  Frame w full, h full, bg #0a0a0a',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          'node-1': { flexDirection: 'row' },
          // Sidebar: fixed 200, full height of parent (cross-axis stretch).
          'node-2': { width: '200px', height: '400px' },
          // Main: 800 - 200 = 600 (main-axis flex), 400 height.
          'node-3': { width: '600px', height: '400px' },
        },
      },
    },
  ],
}

// ----- L6.3: Centered modal — outer center + fixed-size inner --------------

const centeredModal: Scenario = {
  name: 'L6.3 Centered modal (outer center, inner fixed) places inner in middle',
  category: 'step-runner',
  setup:
    'Frame center, w 400, h 400, bg #0a0a0a\n' +
    '  Frame ver, w 200, h 200, pad 16, gap 8, bg #1a1a1a\n' +
    '    Text "Title"\n' +
    '    Text "Body"',
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
          // Inner modal renders with its declared dimensions + padding.
          'node-2': {
            width: '200px',
            height: '200px',
            flexDirection: 'column',
            paddingTop: '16px',
            rowGap: '8px',
          },
        },
      },
    },
  ],
}

// ----- L6.4: Card stack — ver outer gap, three card-like Frames inside ------
//
// The classic stack-of-cards pattern. Each card is a 3-property Frame
// (pad + gap + bg). Outer ver Frame gaps them apart by 16. This combines
// alignment-free layout with realistic content shapes.

const cardStack: Scenario = {
  name: 'L6.4 Card stack (ver outer, three Frame "cards" with pad/gap inside)',
  category: 'step-runner',
  setup:
    'Frame ver, gap 16, pad 24, w 320, bg #0a0a0a\n' +
    '  Frame ver, pad 16, gap 8, bg #1a1a1a, rad 8\n' +
    '    Text "Card A title", weight 500\n' +
    '    Text "Card A body", col #888\n' +
    '  Frame ver, pad 16, gap 8, bg #1a1a1a, rad 8\n' +
    '    Text "Card B title", weight 500\n' +
    '    Text "Card B body", col #888\n' +
    '  Frame ver, pad 16, gap 8, bg #1a1a1a, rad 8\n' +
    '    Text "Card C title", weight 500\n' +
    '    Text "Card C body", col #888',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          'node-1': {
            flexDirection: 'column',
            rowGap: '16px',
            paddingTop: '24px',
          },
          'node-2': {
            flexDirection: 'column',
            rowGap: '8px',
            paddingTop: '16px',
            borderTopLeftRadius: '8px',
          },
          'node-5': { flexDirection: 'column', paddingTop: '16px' },
          'node-8': { flexDirection: 'column', paddingTop: '16px' },
        },
      },
    },
  ],
}

export const layoutUseCasesScenarios: Scenario[] = [
  toolbarSpread,
  sidebarMain,
  centeredModal,
  cardStack,
]
export const layoutUseCasesStepRunnerTests: TestCase[] =
  layoutUseCasesScenarios.map(scenarioToTestCase)
