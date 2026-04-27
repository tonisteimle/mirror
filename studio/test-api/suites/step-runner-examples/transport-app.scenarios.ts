/**
 * Step-Runner — transport-app use case (incremental).
 *
 * The "real" use case: a transport company app with multiple screens
 * (dashboard, orders, …), shared tokens (brand colors), and shared
 * components (Card, …). Each scenario in this file adds ONE capability
 * on top of the previous one, so we can prove the framework supports
 * the realistic project shape one increment at a time.
 *
 *   1. Multi-screen project setup (screens/ subdir, tokens, components)
 *      — entry screen renders, file structure intact.
 *   2. switchFile between screens (dashboard ↔ orders).
 *   3. Token edit propagates back to consumers (cross-file resolve).
 *   4. Component edit propagates to all instances (cross-file resolve).
 *   5. Per-instance property change leaves siblings untouched.
 *   6. Undo/redo across files.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

// ----- 1: Multi-screen project setup ----------------------------------------
//
// Just file-structure: subdirectory paths (screens/), tokens.tok and
// components.com siblings, entry pointing at a screen. We don't yet
// USE the tokens or components in the entry source — that's what
// scenarios 3 and 4 prove. Here we just want to know the multi-file
// setup with a nested entry path renders the entry correctly.

const transportAppMultiScreenSetup: Scenario = {
  name: 'transport-app: multi-screen project initializes with all files',
  category: 'step-runner',
  setup: {
    entry: 'screens/dashboard.mir',
    files: {
      'tokens.tok': 'primary.bg: #2271c1\ndanger.bg: #ef4444',
      'components.com': 'Card: bg #1a1a1a, pad 16, rad 8',
      'screens/dashboard.mir': 'Frame w 200, h 200, bg #2271c1',
      'screens/orders.mir': 'Frame w 100, h 100, bg #ef4444',
    },
  },
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'wait',
      ms: 100,
      expect: {
        code: 'Frame w 200, h 200, bg #2271c1',
        props: { 'node-1': { bg: '#2271c1' } },
      },
    },
  ],
}

// ----- 2: Switch between screens --------------------------------------------
//
// Same realistic setup; navigate dashboard → orders → dashboard via
// switchFile. After each switch, the active file's source must match
// the file we switched to. Compile + UI propagation is debounced, so
// each switch is followed by a wait before asserting (same shape as
// multifile-basics atom 3, but with screens/ subdir paths and the
// tokens.tok / components.com siblings in the project).

const transportAppSwitchBetweenScreens: Scenario = {
  name: 'transport-app: switchFile navigates between dashboard and orders',
  category: 'step-runner',
  setup: {
    entry: 'screens/dashboard.mir',
    files: {
      'tokens.tok': 'primary.bg: #2271c1\ndanger.bg: #ef4444',
      'components.com': 'Card: bg #1a1a1a, pad 16, rad 8',
      'screens/dashboard.mir': 'Frame w 200, h 200, bg #2271c1',
      'screens/orders.mir': 'Frame w 100, h 100, bg #ef4444',
    },
  },
  steps: [
    // Initially: dashboard is open
    {
      do: 'wait',
      ms: 100,
      comment: 'dashboard active on entry',
      expect: { code: 'Frame w 200, h 200, bg #2271c1' },
    },
    // Switch to orders, wait for compile + UI to settle, assert source
    { do: 'switchFile', filename: 'screens/orders.mir' },
    {
      do: 'wait',
      ms: 500,
      expect: { code: 'Frame w 100, h 100, bg #ef4444' },
    },
    // Switch back to dashboard
    { do: 'switchFile', filename: 'screens/dashboard.mir' },
    {
      do: 'wait',
      ms: 500,
      expect: { code: 'Frame w 200, h 200, bg #2271c1' },
    },
  ],
}

// Atomic-by-atomic rollout: enable one scenario, get it green, then add
// the next. Anything below the active line is parked until ready.
export const transportAppScenarios: Scenario[] = [
  transportAppMultiScreenSetup,
  transportAppSwitchBetweenScreens,
]
export const transportAppStepRunnerTests: TestCase[] = transportAppScenarios.map(scenarioToTestCase)
