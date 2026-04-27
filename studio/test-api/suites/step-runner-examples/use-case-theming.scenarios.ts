/**
 * Step-Runner — token-driven theming use case.
 *
 * The user defines a `primary.bg` token, uses it on three sibling Frames,
 * then changes the token value and verifies all three render the new
 * color. This is the workflow design tokens are meant for, and the
 * scenario exercises the token resolver across multiple nodes plus the
 * propagation of a token redefinition.
 *
 * Three nodes share one token; one editText to the token line updates
 * all three Frames' rendered backgrounds simultaneously.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

const tokenThemeChange: Scenario = {
  name: 'token redefinition propagates to all consumers',
  category: 'step-runner',
  setup:
    'primary.bg: #2271c1\n\n' +
    'Frame ver, gap 8\n' +
    '  Frame w 50, h 50, bg $primary\n' +
    '  Frame w 50, h 50, bg $primary\n' +
    '  Frame w 50, h 50, bg $primary',
  steps: [
    // Sanity: all three Frames render the original blue.
    {
      do: 'wait',
      ms: 50,
      comment: 'verify initial token resolution',
      expect: {
        props: {
          'node-2': { bg: '#2271c1' },
          'node-3': { bg: '#2271c1' },
          'node-4': { bg: '#2271c1' },
        },
      },
    },

    // Change the token definition by replacing the entire source.
    // (editText would only swap the quoted text; for token def we need
    // to rewrite the line in code.)
    {
      do: 'editorSet',
      code:
        'primary.bg: #ef4444\n\n' +
        'Frame ver, gap 8\n' +
        '  Frame w 50, h 50, bg $primary\n' +
        '  Frame w 50, h 50, bg $primary\n' +
        '  Frame w 50, h 50, bg $primary',
      comment: 'change token value to red',
      expect: {
        // All three follow — that's the whole point of tokens.
        props: {
          'node-2': { bg: '#ef4444' },
          'node-3': { bg: '#ef4444' },
          'node-4': { bg: '#ef4444' },
        },
      },
    },
  ],
}

export const useCaseThemingScenarios: Scenario[] = [tokenThemeChange]
export const useCaseThemingStepRunnerTests: TestCase[] =
  useCaseThemingScenarios.map(scenarioToTestCase)
