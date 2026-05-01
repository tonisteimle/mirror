/**
 * Step-Runner — States Phase S3: exclusive() — radio/tab semantics.
 *
 * `exclusive()` is a state-cycler that enforces "only one in the
 * surrounding group is active". Clicking another instance moves the
 * `selected` state to it; the previously selected instance falls back
 * to default. Behaviourally this matches a radio group or tab strip.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

// ----- S3.1: Three Tabs, click Profile selects it and deselects Home ------

const tabsExclusiveSelection: Scenario = {
  name: 'S3.1 exclusive() Tab group: clicking another tab moves the selected state',
  category: 'step-runner',
  setup:
    'Tab: Button pad 12 20, col #888888, cursor pointer, exclusive()\n' +
    '  selected:\n' +
    '    col white\n' +
    'Frame hor, gap 0\n' +
    '  Tab "Home", selected\n' +
    '  Tab "Profile"\n' +
    '  Tab "Settings"',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          // Home: white (initial selected)
          'node-2': { color: 'rgb(255, 255, 255)' },
          // Profile + Settings: gray (default)
          'node-3': { color: 'rgb(136, 136, 136)' },
          'node-4': { color: 'rgb(136, 136, 136)' },
        },
      },
    },
    {
      do: 'click',
      nodeId: 'node-3',
      comment: 'click Profile',
      expect: {
        dom: {
          // Home dropped to default
          'node-2': { color: 'rgb(136, 136, 136)' },
          // Profile became selected
          'node-3': { color: 'rgb(255, 255, 255)' },
          'node-4': { color: 'rgb(136, 136, 136)' },
        },
      },
    },
    {
      do: 'click',
      nodeId: 'node-4',
      comment: 'click Settings',
      expect: {
        dom: {
          'node-2': { color: 'rgb(136, 136, 136)' },
          'node-3': { color: 'rgb(136, 136, 136)' },
          'node-4': { color: 'rgb(255, 255, 255)' },
        },
      },
    },
  ],
}

// ----- S3.2: Two separate Tab groups don't interfere -----------------------
//
// Two horizontal Frames each contain their own Tab group. Clicking a
// tab in group A must not affect group B's selection — exclusive() is
// scoped to the surrounding parent.

const exclusiveScopedToGroup: Scenario = {
  name: 'S3.2 Two exclusive() groups stay independent — clicking one does not touch the other',
  category: 'step-runner',
  setup:
    'Tab: Button pad 8 16, col #888888, cursor pointer, exclusive()\n' +
    '  selected:\n' +
    '    col white\n' +
    'Frame hor, gap 0\n' +
    '  Tab "A1", selected\n' +
    '  Tab "A2"\n' +
    'Frame hor, gap 0\n' +
    '  Tab "B1", selected\n' +
    '  Tab "B2"',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          // Both groups: first tab selected
          'node-2': { color: 'rgb(255, 255, 255)' }, // A1
          'node-3': { color: 'rgb(136, 136, 136)' }, // A2
          'node-5': { color: 'rgb(255, 255, 255)' }, // B1
          'node-6': { color: 'rgb(136, 136, 136)' }, // B2
        },
      },
    },
    {
      do: 'click',
      nodeId: 'node-3',
      comment: 'click A2 — group A flips, group B unchanged',
      expect: {
        dom: {
          'node-2': { color: 'rgb(136, 136, 136)' }, // A1 deselected
          'node-3': { color: 'rgb(255, 255, 255)' }, // A2 selected
          'node-5': { color: 'rgb(255, 255, 255)' }, // B1 still selected
          'node-6': { color: 'rgb(136, 136, 136)' }, // B2 still default
        },
      },
    },
  ],
}

export const stateExclusiveScenarios: Scenario[] = [tabsExclusiveSelection, exclusiveScopedToGroup]
export const stateExclusiveStepRunnerTests: TestCase[] =
  stateExclusiveScenarios.map(scenarioToTestCase)
