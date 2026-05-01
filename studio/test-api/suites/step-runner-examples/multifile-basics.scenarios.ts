/**
 * Step-Runner — atomic tests for multi-file infrastructure.
 *
 * Each scenario tests ONE thing in the smallest possible way. If the
 * larger transport-app scenario later fails, we know which atom is the
 * culprit because we tested each in isolation here first.
 *
 *   1. Multi-file setup creates the entry file and renders it
 *   2. Multi-file setup creates non-entry files too
 *   3. switchFile action moves focus to another file
 *   4. Cross-file token resolution: token in another file resolves in
 *      the active file's source
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

// ----- 1: Multi-file setup, entry rendered ----------------------------------

const multifileEntryRenders: Scenario = {
  name: 'multi-file setup: entry file renders',
  category: 'step-runner',
  setup: {
    entry: 'app.mir',
    files: {
      'app.mir': 'Frame w 100, h 100, bg #2271c1',
    },
  },
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'waitFor',
      until: { props: { 'node-1': { bg: '#2271c1' } } },
    },
  ],
}

// ----- 2: Multi-file setup, non-entry files exist ----------------------------

const multifileSidecarFilesExist: Scenario = {
  name: 'multi-file setup: non-entry files exist after setup',
  category: 'step-runner',
  setup: {
    entry: 'app.mir',
    files: {
      'app.mir': 'Frame w 100, h 100, bg #2271c1',
      'tokens.tok': 'primary.bg: #ef4444',
    },
  },
  steps: [
    {
      // Verify both files exist. Active editor shows app.mir; the
      // tokens.tok sibling is asserted via `files`.
      do: 'waitFor',
      until: {
        code: 'Frame w 100, h 100, bg #2271c1',
        files: { 'tokens.tok': 'primary.bg: #ef4444' },
      },
    },
  ],
}

// ----- 3: switchFile changes the active file --------------------------------

const switchFileChangesActiveFile: Scenario = {
  name: 'switchFile: opens another file in the editor',
  category: 'step-runner',
  setup: {
    entry: 'app.mir',
    files: {
      'app.mir': 'Frame w 100, h 100, bg #2271c1',
      'other.mir': 'Frame w 50, h 50, bg #ef4444',
    },
  },
  steps: [
    // Initially: app.mir is open
    {
      do: 'waitFor',
      comment: 'app.mir active',
      until: { code: 'Frame w 100, h 100, bg #2271c1' },
    },
    // Switch to other.mir, then poll until editor reflects its content.
    { do: 'switchFile', filename: 'other.mir' },
    {
      do: 'waitFor',
      until: { code: 'Frame w 50, h 50, bg #ef4444' },
    },
  ],
}

// ----- 4: Cross-file token resolution (framework side) ----------------------
//
// Mirror's compiler in test mode (__compileTestCode) parses only the
// active file's source — sibling files aren't pulled in as a prelude.
// So a `bg $primary` whose definition lives in `tokens.tok` renders
// transparent in the DOM (token unresolved). That's a Studio test-mode
// limitation, not a framework limitation.
//
// What we CAN test: the framework's source-side resolver finds the
// token across files (allSources scan). The runner routes `panel:` for
// readable properties through PropertyReader.fromPanel, which uses the
// allSources fallback for color tokens — so we get the resolved hex on
// the panel dimension even though the DOM stays transparent.
//
// DOM verification of cross-file tokens still needs Studio prelude
// support in test mode — tracked separately.

const crossFileTokenResolves: Scenario = {
  name: 'cross-file: token defined in tokens.tok resolves at the source level',
  category: 'step-runner',
  setup: {
    entry: 'screen.mir',
    files: {
      'tokens.tok': 'primary.bg: #2271c1',
      'screen.mir': 'Frame w 100, h 100, bg $primary',
    },
  },
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'waitFor',
      until: {
        // The active file's source still has the literal `$primary`.
        code: 'Frame w 100, h 100, bg $primary',
        // The panel value (after the color reader's token resolution
        // through allSources) is the resolved hex. This is what proves
        // cross-file resolution works at the framework level.
        panel: { bg: '#2271c1' },
      },
    },
  ],
}

// Atomic-by-atomic rollout: enable one scenario, get it green, then add
// the next. Anything below the active line is parked until ready.
export const multifileBasicsScenarios: Scenario[] = [
  multifileEntryRenders,
  multifileSidecarFilesExist,
  switchFileChangesActiveFile,
  crossFileTokenResolves,
]
export const multifileBasicsStepRunnerTests: TestCase[] =
  multifileBasicsScenarios.map(scenarioToTestCase)
