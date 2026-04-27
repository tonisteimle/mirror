/**
 * Step-Runner — hover state.
 *
 * Hover is a transient render state, not a sync question between code
 * and DOM. Source declares the hover variant under a `hover:` block;
 * after the hover action triggers, computed style reflects those
 * values. The scenarios assert via `expect.dom` (computed style)
 * rather than `expect.props`, since hover doesn't change the source.
 *
 * The setup uses a Mirror Frame with a hover state because hover on
 * Frame is the most general; Btn/Button works the same way.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

const hoverChangesBg: Scenario = {
  name: 'hover changes the rendered background to the hover color',
  category: 'step-runner',
  setup:
    'Frame w 100, h 100, bg #2271c1\n' + //
    '  hover:\n' +
    '    bg #ef4444',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        // Default state: bg is the original blue
        dom: { 'node-1': { backgroundColor: 'rgb(34, 113, 193)' } },
      },
    },
    {
      do: 'hover',
      target: 'node-1',
      expect: {
        // Hover state: bg becomes the red
        dom: { 'node-1': { backgroundColor: 'rgb(239, 68, 68)' } },
      },
    },
    {
      do: 'unhover',
      target: 'node-1',
      expect: {
        // Back to default
        dom: { 'node-1': { backgroundColor: 'rgb(34, 113, 193)' } },
      },
    },
  ],
}

export const hoverScenarios: Scenario[] = [hoverChangesBg]
export const hoverStepRunnerTests: TestCase[] = hoverScenarios.map(scenarioToTestCase)
