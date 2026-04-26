/**
 * Step-Runner — editText action.
 *
 * Mirror text content (the quoted segment after the element name) is
 * the most-changed property in real designer flows ("change button
 * label to 'Save'"). The new editText action targets a node and
 * replaces its text. The runner then validates `text` across all three
 * readout dimensions — code, DOM (.textContent), and the panel's text
 * field.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

const editTextOnButton: Scenario = {
  name: 'editText changes a Button label consistently across code+dom+panel',
  category: 'step-runner',
  setup: 'Button "Click me", bg #2271c1',
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'editText',
      target: 'node-1',
      text: 'Save',
      expect: {
        props: {
          'node-1': {
            text: 'Save',
            // Other props untouched
            bg: '#2271c1',
          },
        },
      },
    },
  ],
}

const editTextOnText: Scenario = {
  name: 'editText changes Text element content',
  category: 'step-runner',
  setup: 'Text "Hello world", fs 24',
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'editText',
      target: 'node-1',
      text: 'Goodbye world',
      expect: {
        props: { 'node-1': { text: 'Goodbye world', fs: '24' } },
      },
    },
  ],
}

export const editTextScenarios: Scenario[] = [editTextOnButton, editTextOnText]
export const editTextStepRunnerTests: TestCase[] = editTextScenarios.map(scenarioToTestCase)
