/**
 * Step-Runner — States Phase S4: cross-element states + show/hide actions.
 *
 * Cross-element wiring lets one element trigger another's state. Two
 * mechanisms here:
 *   - Action functions on click (`show(Name)` / `hide(Name)` /
 *     `toggle(Name)`) — explicit imperative wiring.
 *   - State-based binding (`OtherName.state: { props }`) — the bound
 *     element reacts whenever `OtherName` enters that state.
 *
 * Asserts via computed `display` for visibility (`hidden` → none,
 * `visible` → flex). Source stays unchanged (state is runtime).
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

// ----- S4.1: Button onclick show(Menu) reveals a hidden Frame -------------

const showAction: Scenario = {
  name: 'S4.1 Button onclick show(Menu) toggles a hidden Frame to visible',
  category: 'step-runner',
  setup: 'Button "Show", onclick show(Menu)\n' + 'Frame name Menu, w 100, h 50, bg #2271c1, hidden',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        // Initially Menu is hidden
        dom: { 'node-2': { display: 'none' } },
      },
    },
    {
      do: 'click',
      nodeId: 'node-1',
      expect: {
        // After click, Menu's display is no longer `none`. The exact
        // value (flex / block) depends on Mirror's runtime visibility
        // mechanism — what we want to pin is "show() made it visible",
        // not the specific display token.
        dom: { 'node-2': { display: /^(?!none$).+/ } },
      },
    },
  ],
}

// ----- S4.2: Button onclick hide(Menu) flips visible → hidden ------------

const hideAction: Scenario = {
  name: 'S4.2 Button onclick hide(Menu) flips a visible Frame to hidden',
  category: 'step-runner',
  setup: 'Button "Hide", onclick hide(Menu)\n' + 'Frame name Menu, w 100, h 50, bg #2271c1',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        // Initially Menu is visible (anything except none)
        dom: { 'node-2': { display: /^(?!none$).+/ } },
      },
    },
    {
      do: 'click',
      nodeId: 'node-1',
      expect: {
        // After click, Menu hidden
        dom: { 'node-2': { display: 'none' } },
      },
    },
  ],
}

// ----- S4.3: Cross-element state binding (MenuBtn.open → Menu visible) ----
//
// MenuBtn has toggle() and an `open` state. The Menu Frame declares
// `MenuBtn.open: visible` — i.e. whenever MenuBtn is open, Menu gets
// the `visible` property applied. Clicking MenuBtn cycles to `open`,
// which flips Menu's display.

const crossElementStateBinding: Scenario = {
  name: 'S4.3 MenuBtn.open binding flips Menu visibility when the trigger toggles',
  category: 'step-runner',
  setup:
    'Button name MenuBtn, "Toggle", pad 10, bg #333, col white, toggle()\n' +
    '  open:\n' +
    '    bg #2271c1\n' +
    'Frame name Menu, w 100, h 50, bg #1a1a1a, hidden\n' +
    '  MenuBtn.open:\n' +
    '    visible',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          // MenuBtn default: bg #333; Menu hidden
          'node-1': { backgroundColor: 'rgb(51, 51, 51)' },
          'node-2': { display: 'none' },
        },
      },
    },
    {
      do: 'click',
      nodeId: 'node-1',
      expect: {
        dom: {
          // MenuBtn open: bg #2271c1; Menu visible (cross-state binding fires)
          'node-1': { backgroundColor: 'rgb(34, 113, 193)' },
          'node-2': { display: /^(?!none$).+/ },
        },
      },
    },
    {
      do: 'click',
      nodeId: 'node-1',
      expect: {
        dom: {
          // MenuBtn back to default; Menu hidden again
          'node-1': { backgroundColor: 'rgb(51, 51, 51)' },
          'node-2': { display: 'none' },
        },
      },
    },
  ],
}

export const stateCrossElementScenarios: Scenario[] = [
  showAction,
  hideAction,
  crossElementStateBinding,
]
export const stateCrossElementStepRunnerTests: TestCase[] =
  stateCrossElementScenarios.map(scenarioToTestCase)
