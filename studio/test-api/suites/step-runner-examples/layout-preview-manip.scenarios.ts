/**
 * Step-Runner — Layout Phase 7: direct preview manipulation in nested
 * layouts.
 *
 * The atomic `via: 'preview'` paths are already covered for pad/mar/gap
 * in their respective `*.scenarios.ts`. This phase exercises the same
 * preview-writers but on a *descendant* node inside a nested layout —
 * the failure mode being keyboard mode entering on the root selection
 * and the wrong target being mutated.
 *
 * Each step uses `setProperty via: 'preview'`, so the assertion runs the
 * full 3-dim check via the property reader.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

// ----- L7.1: pad via preview on an inner Frame in a 2-level layout ----------
//
// Outer ver Frame, inner ver Frame with `pad 8`. We select the inner
// Frame (node-2) and bump pad to 24 via the preview keyboard shortcut.
// The `props.pad` reader confirms code + DOM + panel agree on `24`.

const padViaPreviewOnInnerFrame: Scenario = {
  name: 'L7.1 pad via preview keyboard on an inner Frame in a nested layout',
  category: 'step-runner',
  setup:
    'Frame ver, gap 8, w 240\n' +
    '  Frame ver, pad 8, gap 4, bg #1a1a1a, rad 8\n' +
    '    Text "Title"\n' +
    '    Text "Body"',
  steps: [
    {
      do: 'select',
      nodeId: 'node-2',
      expect: {
        selection: 'node-2',
        props: { 'node-2': { pad: '8' } },
      },
    },
    {
      do: 'setProperty',
      via: 'preview',
      target: 'node-2',
      property: 'pad',
      value: '24',
      expect: { props: { 'node-2': { pad: '24' } } },
    },
  ],
}

// ----- L7.2: gap via preview on an inner hor Frame --------------------------

const gapViaPreviewOnInnerHor: Scenario = {
  name: 'L7.2 gap via preview keyboard on an inner hor Frame',
  category: 'step-runner',
  setup:
    'Frame ver, gap 16, w 320, pad 16\n' +
    '  Frame hor, gap 8, h 32\n' +
    '    Text "A"\n' +
    '    Text "B"',
  steps: [
    {
      do: 'select',
      nodeId: 'node-2',
      expect: {
        selection: 'node-2',
        props: { 'node-2': { gap: '8' } },
      },
    },
    {
      do: 'setProperty',
      via: 'preview',
      target: 'node-2',
      property: 'gap',
      value: '16',
      expect: { props: { 'node-2': { gap: '16' } } },
    },
  ],
}

// ----- L7.3: mar via preview on a single-level child ----------------------

const marViaPreviewChild: Scenario = {
  name: 'L7.3 mar via preview keyboard on a sized child',
  category: 'step-runner',
  setup: 'Frame pad 0\n  Frame mar 8, w 50, h 50',
  steps: [
    {
      do: 'select',
      nodeId: 'node-2',
      expect: {
        selection: 'node-2',
        props: { 'node-2': { mar: '8' } },
      },
    },
    {
      do: 'setProperty',
      via: 'preview',
      target: 'node-2',
      property: 'mar',
      value: '24',
      expect: { props: { 'node-2': { mar: '24' } } },
    },
  ],
}

// ----- L7.4: regression — preview-keyboard commit on a 3+ line scenario ----
//
// This scenario was the canary that surfaced a state-desync bug between
// __compileTestCode and adjustChangeForEditor: state.isWrappedWithApp
// could leak `true` from a prior production compile into test mode, where
// nothing was actually App-wrapped. adjustChangeForEditor then stripped
// non-existent wrap-indents (2 chars per indent line passed) from the
// editor change, corrupting source whenever the target sat on line 3 or
// deeper. The `code:` assertion below is intentional regression bait —
// any future return of the off-by-N corruption shows up as a verbatim diff.
// Fix is in studio/app.js (__compileTestCode now resets isWrappedWithApp).

const marViaPreviewDeepNested: Scenario = {
  name: 'L7.4 mar via preview keyboard through an empty-property middle Frame',
  category: 'step-runner',
  setup: 'Frame ver, pad 0\n  Frame ver\n    Frame mar 8, w 50, h 50',
  steps: [
    {
      do: 'select',
      nodeId: 'node-3',
      expect: { selection: 'node-3', props: { 'node-3': { mar: '8' } } },
    },
    {
      do: 'setProperty',
      via: 'preview',
      target: 'node-3',
      property: 'mar',
      value: '24',
      expect: {
        code: 'Frame ver, pad 0\n  Frame ver\n    Frame mar 24, w 50, h 50',
        props: { 'node-3': { mar: '24' } },
      },
    },
  ],
}

export const layoutPreviewManipScenarios: Scenario[] = [
  padViaPreviewOnInnerFrame,
  gapViaPreviewOnInnerHor,
  marViaPreviewChild,
  marViaPreviewDeepNested,
]
export const layoutPreviewManipStepRunnerTests: TestCase[] =
  layoutPreviewManipScenarios.map(scenarioToTestCase)
