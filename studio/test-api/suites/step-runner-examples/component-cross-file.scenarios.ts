/**
 * Step-Runner — Components Phase C4: cross-file definitions.
 *
 * Real projects keep component definitions in `components.com` and use
 * them across screens. The framework must:
 *   - Resolve a usage in `app.mir` against a `components.com` definition.
 *   - Propagate definition edits to every instance.
 *   - Keep instance overrides isolated to their own line.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

// ----- C4.1: Definition in components.com, usage in app.mir -----------------

const definitionInComponentsFile: Scenario = {
  name: 'C4.1 Btn defined in components.com renders correctly when used in app.mir',
  category: 'step-runner',
  setup: {
    entry: 'app.mir',
    files: {
      'components.com': 'Btn: pad 8, bg #2271c1, col white',
      'app.mir': 'Btn "Save"',
    },
  },
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          'node-1': {
            paddingTop: '8px',
            backgroundColor: 'rgb(34, 113, 193)',
            color: 'rgb(255, 255, 255)',
          },
        },
      },
    },
  ],
}

// ----- C4.2: Definition edit propagates to every instance ------------------
//
// Edit the component definition in components.com from one bg to another.
// Both instances in app.mir must reflect the new bg without any
// per-instance work — that's the whole point of components.

const definitionEditPropagates: Scenario = {
  name: 'C4.2 Editing Btn definition in components.com propagates to all instances',
  category: 'step-runner',
  setup: {
    entry: 'app.mir',
    files: {
      'components.com': 'Btn: pad 8, bg #2271c1, col white',
      'app.mir': 'Btn "Save"\nBtn "Cancel"',
    },
  },
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          'node-1': { backgroundColor: 'rgb(34, 113, 193)' },
          'node-2': { backgroundColor: 'rgb(34, 113, 193)' },
        },
      },
    },
    // Switch to components.com and rewrite the Btn definition's bg.
    { do: 'switchFile', filename: 'components.com' },
    {
      do: 'editorSet',
      code: 'Btn: pad 8, bg #ef4444, col white',
    },
    // Switch back to app.mir and assert both instances now use the new bg.
    { do: 'switchFile', filename: 'app.mir' },
    {
      do: 'waitFor',
      until: {
        dom: {
          'node-1': { backgroundColor: 'rgb(239, 68, 68)' },
          'node-2': { backgroundColor: 'rgb(239, 68, 68)' },
        },
      },
    },
  ],
}

// ----- C4.3: Per-instance override stays isolated ---------------------------
//
// Two instances in app.mir, one with an inline `bg` override. Editing
// the override (panel) updates only that instance — the other still
// inherits the components.com definition's bg.

const instanceOverrideIsolated: Scenario = {
  name: 'C4.3 Editing one instance override leaves the other on the components.com bg',
  category: 'step-runner',
  setup: {
    entry: 'app.mir',
    files: {
      'components.com': 'Btn: pad 8, bg #2271c1, col white',
      'app.mir': 'Btn "Save"\nBtn "Cancel", bg #ef4444',
    },
  },
  steps: [
    {
      do: 'select',
      nodeId: 'node-2',
      expect: {
        selection: 'node-2',
        props: { 'node-2': { bg: '#ef4444' } },
      },
    },
    {
      do: 'setProperty',
      via: 'panel',
      target: 'node-2',
      property: 'bg',
      value: '#10b981',
      expect: {
        // node-2's source line gets updated.
        files: {
          'app.mir': 'Btn "Save"\nBtn "Cancel", bg #10b981',
          'components.com': 'Btn: pad 8, bg #2271c1, col white',
        },
        // node-1's bg is still inherited (no source declaration), DOM
        // still shows the components.com value.
        dom: { 'node-1': { backgroundColor: 'rgb(34, 113, 193)' } },
        props: { 'node-2': { bg: '#10b981' } },
      },
    },
  ],
}

export const componentCrossFileScenarios: Scenario[] = [
  definitionInComponentsFile,
  definitionEditPropagates,
  instanceOverrideIsolated,
]
export const componentCrossFileStepRunnerTests: TestCase[] =
  componentCrossFileScenarios.map(scenarioToTestCase)
