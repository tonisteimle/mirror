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

// ----- C4.2 removed: relied on the multi-file file-switching UX which the
//                     MVP single-file rollback deactivated. Reactivate
//                     alongside multi-file infrastructure.

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
  // C4.2 (definitionEditPropagates) removed: relies on the multi-file
  // file-switching UX which the MVP single-file rollback deactivated.
  // Reactivate alongside multi-file infrastructure.
  instanceOverrideIsolated,
]
export const componentCrossFileStepRunnerTests: TestCase[] =
  componentCrossFileScenarios.map(scenarioToTestCase)
