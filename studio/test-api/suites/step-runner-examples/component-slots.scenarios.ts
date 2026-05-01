/**
 * Step-Runner — Components Phase C3: child slots.
 *
 * Component definitions can declare named child "slots" that the usage
 * fills with content. Each slot carries its own property bundle that
 * applies whenever the slot is invoked.
 *
 *   Card: bg #1a1a1a, pad 16, gap 8
 *     Title: col white, fs 16, weight 500
 *     Desc:  col #888, fs 14
 *
 *   Card
 *     Title "..."
 *     Desc "..."
 *
 * The usage's children invoke slot names; their text becomes content,
 * and the slot's bundle styles them.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

// ----- C3.1: Card with Title and Desc slots --------------------------------

const cardWithTitleDescSlots: Scenario = {
  name: 'C3.1 Card with Title + Desc slots applies each slot bundle',
  category: 'step-runner',
  setup:
    'Card: bg #1a1a1a, pad 16, rad 8, gap 8\n' +
    '  Title: col white, fs 16, weight 500\n' +
    '  Desc: col #888, fs 14\n' +
    'Card\n' +
    '  Title "Project Title"\n' +
    '  Desc "A description"',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          // Card root: definition's bundle applied
          'node-1': {
            backgroundColor: 'rgb(26, 26, 26)',
            paddingTop: '16px',
            borderTopLeftRadius: '8px',
            rowGap: '8px',
          },
          // Title slot: white, 16px, 500
          'node-2': {
            color: 'rgb(255, 255, 255)',
            fontSize: '16px',
            fontWeight: '500',
          },
          // Desc slot: gray, 14px
          'node-3': {
            color: 'rgb(136, 136, 136)',
            fontSize: '14px',
          },
        },
      },
    },
  ],
}

// ----- C3.2: AppShell layout component (hor + Sidebar + Main slots) -------
//
// Layout components combine direction + child slots — pins both at once.

const appShellLayout: Scenario = {
  name: 'C3.2 AppShell (hor + Sidebar + Main slots) renders both slots correctly',
  category: 'step-runner',
  setup:
    'AppShell: hor, h 400, w 800\n' +
    '  Sidebar: w 200, bg #1a1a1a, pad 16\n' +
    '  Main: grow, pad 24, bg #0a0a0a\n' +
    'AppShell\n' +
    '  Sidebar\n' +
    '    Text "Nav"\n' +
    '  Main\n' +
    '    Text "Content"',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          // AppShell: hor row, w 800
          'node-1': { flexDirection: 'row', width: '800px', height: '400px' },
          // Sidebar: 200px wide, dark bg, pad
          'node-2': {
            width: '200px',
            backgroundColor: 'rgb(26, 26, 26)',
            paddingTop: '16px',
          },
          // Main: grow → fills 600px (800 - 200), pad 24
          'node-4': {
            width: '600px',
            paddingTop: '24px',
            backgroundColor: 'rgb(10, 10, 10)',
            flexGrow: '1',
          },
        },
      },
    },
  ],
}

export const componentSlotsScenarios: Scenario[] = [cardWithTitleDescSlots, appShellLayout]
export const componentSlotsStepRunnerTests: TestCase[] =
  componentSlotsScenarios.map(scenarioToTestCase)
