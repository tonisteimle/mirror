/**
 * Step-Runner — States Phase S2: toggle().
 *
 * `toggle()` cycles a node through declared states on each click. The
 * compiler emits `data-state` on the rendered element and applies the
 * matching state's bundle. Tests observe two things across the click:
 *   - the rendered `backgroundColor` (proves the bundle applied)
 *   - we don't assert `data-state` directly: the visible computed style
 *     IS the contract designers care about. Internal markers can change.
 *
 * Vitest already covers the compiler-side semantics; these step-runner
 * scenarios prove the same behaviour holds inside the Studio runtime
 * (i.e. `interact.click` reaches the element and the state machine fires).
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

// ----- S2.1: 2-state toggle (default ↔ on) ---------------------------------

const toggleDefaultOn: Scenario = {
  name: 'S2.1 toggle() click cycles default → on → default',
  category: 'step-runner',
  setup:
    'Btn: Button pad 10, bg #333, col white, toggle()\n' +
    '  on:\n' +
    '    bg #ef4444\n' +
    'Btn "Save"',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        // Default state — bg is #333
        dom: { 'node-1': { backgroundColor: 'rgb(51, 51, 51)' } },
      },
    },
    {
      do: 'click',
      nodeId: 'node-1',
      expect: {
        // After click — `on` state, bg is #ef4444
        dom: { 'node-1': { backgroundColor: 'rgb(239, 68, 68)' } },
      },
    },
    {
      do: 'click',
      nodeId: 'node-1',
      expect: {
        // Second click — back to default
        dom: { 'node-1': { backgroundColor: 'rgb(51, 51, 51)' } },
      },
    },
  ],
}

// ----- S2.2: Multi-state cycle (todo → doing → done → todo) ---------------
//
// Three declared states; toggle() cycles through them in declaration
// order. Instance starts with `todo` per the `, todo` initial-state
// declaration on the usage line.

const multiStateCycle: Scenario = {
  name: 'S2.2 toggle() with three states cycles todo → doing → done → todo',
  category: 'step-runner',
  setup:
    'Status: Button pad 8, col white, toggle()\n' +
    '  todo:\n' +
    '    bg #333333\n' +
    '  doing:\n' +
    '    bg #f59e0b\n' +
    '  done:\n' +
    '    bg #10b981\n' +
    'Status "Task", todo',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        // Initial: todo
        dom: { 'node-1': { backgroundColor: 'rgb(51, 51, 51)' } },
      },
    },
    {
      do: 'click',
      nodeId: 'node-1',
      comment: 'todo → doing',
      expect: { dom: { 'node-1': { backgroundColor: 'rgb(245, 158, 11)' } } },
    },
    {
      do: 'click',
      nodeId: 'node-1',
      comment: 'doing → done',
      expect: { dom: { 'node-1': { backgroundColor: 'rgb(16, 185, 129)' } } },
    },
    {
      do: 'click',
      nodeId: 'node-1',
      comment: 'done → todo (wraps)',
      expect: { dom: { 'node-1': { backgroundColor: 'rgb(51, 51, 51)' } } },
    },
  ],
}

// ----- S2.3: Instance starts in `on` state via init flag ------------------

const instanceInitOn: Scenario = {
  name: 'S2.3 Instance with `on` flag starts in the on state',
  category: 'step-runner',
  setup:
    'Like: Button pad 10, bg #333, col white, toggle()\n' +
    '  on:\n' +
    '    bg #ef4444\n' +
    'Like "Liked", on',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        // No click yet — `on` was the init state, so bg is already red
        dom: { 'node-1': { backgroundColor: 'rgb(239, 68, 68)' } },
      },
    },
    {
      do: 'click',
      nodeId: 'node-1',
      expect: {
        // First click → back to default
        dom: { 'node-1': { backgroundColor: 'rgb(51, 51, 51)' } },
      },
    },
  ],
}

export const stateToggleScenarios: Scenario[] = [toggleDefaultOn, multiStateCycle, instanceInitOn]
export const stateToggleStepRunnerTests: TestCase[] = stateToggleScenarios.map(scenarioToTestCase)
