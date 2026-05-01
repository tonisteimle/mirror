/**
 * Step-Runner — States Phase S5: events bound to data-mutating actions.
 *
 * Click events drive state-variable mutations (`increment`, `decrement`,
 * `set`, `reset`). The interpolated `$varName` in a Text re-renders
 * after each change. Tests assert via `dom` (textContent) since the
 * source itself doesn't change — only the runtime state.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

// ----- S5.1: onclick increment(count) ---------------------------------------

const incrementCounter: Scenario = {
  name: 'S5.1 onclick increment(count) bumps a $count interpolation each click',
  category: 'step-runner',
  setup: 'count: 0\n' + 'Button "+", onclick increment(count)\n' + 'Text "$count", fs 24',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        // Source carries `$count`; DOM holds the rendered value. The
        // 3-dim sync (`props`) doesn't fit interpolated text — code
        // reader returns `$count` while DOM resolves to a number. We
        // assert the rendered text via `dom.textContent`.
        dom: { 'node-2': { textContent: '0' } },
      },
    },
    {
      do: 'click',
      nodeId: 'node-1',
      expect: {
        dom: { 'node-2': { textContent: '1' } },
      },
    },
    {
      do: 'click',
      nodeId: 'node-1',
      expect: {
        dom: { 'node-2': { textContent: '2' } },
      },
    },
  ],
}

// ----- S5.2: onclick decrement(count) --------------------------------------

const decrementCounter: Scenario = {
  name: 'S5.2 onclick decrement(count) reduces $count on each click',
  category: 'step-runner',
  setup: 'count: 5\n' + 'Button "-", onclick decrement(count)\n' + 'Text "$count", fs 24',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: { 'node-2': { textContent: '5' } },
      },
    },
    {
      do: 'click',
      nodeId: 'node-1',
      expect: { dom: { 'node-2': { textContent: '4' } } },
    },
    {
      do: 'click',
      nodeId: 'node-1',
      expect: { dom: { 'node-2': { textContent: '3' } } },
    },
  ],
}

// ----- S5.3: onclick set(count, N) sets directly ---------------------------

const setCounter: Scenario = {
  name: 'S5.3 onclick set(count, 42) writes the literal value',
  category: 'step-runner',
  setup: 'count: 0\n' + 'Button "Set", onclick set(count, 42)\n' + 'Text "$count", fs 24',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: { 'node-2': { textContent: '0' } },
      },
    },
    {
      do: 'click',
      nodeId: 'node-1',
      expect: { dom: { 'node-2': { textContent: '42' } } },
    },
  ],
}

// ----- S5.4: Two buttons, one count — both wire up correctly ---------------
//
// Demonstrates that multiple event handlers on different elements can
// mutate the same shared state. Plus / Minus on the same `count`.

const twoButtonsOneCount: Scenario = {
  name: 'S5.4 Two buttons (+/-) sharing a single count keep $count in sync',
  category: 'step-runner',
  setup:
    'count: 5\n' +
    'Frame hor, gap 8\n' +
    '  Button "-", onclick decrement(count)\n' +
    '  Button "+", onclick increment(count)\n' +
    'Text "$count", fs 24',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: { 'node-4': { textContent: '5' } },
      },
    },
    {
      do: 'click',
      nodeId: 'node-3',
      comment: 'click +',
      expect: { dom: { 'node-4': { textContent: '6' } } },
    },
    {
      do: 'click',
      nodeId: 'node-2',
      comment: 'click -',
      expect: { dom: { 'node-4': { textContent: '5' } } },
    },
    {
      do: 'click',
      nodeId: 'node-2',
      comment: 'click - again',
      expect: { dom: { 'node-4': { textContent: '4' } } },
    },
  ],
}

export const stateEventsScenarios: Scenario[] = [
  incrementCounter,
  decrementCounter,
  setCounter,
  twoButtonsOneCount,
]
export const stateEventsStepRunnerTests: TestCase[] = stateEventsScenarios.map(scenarioToTestCase)
