/**
 * Headed-realism starter scenarios — exercise the Phases 3–8 features
 * (real-compile mode, structural selectors, OS-mouse drag, snapshot
 * pixel-diff). Designed as copy-paste templates: each scenario covers
 * one feature in isolation so authors can lift the minimum surface
 * they need into their own scenarios.
 *
 * Tier-gated scenarios (OS-Mouse, snapshots) are marked `skip` by
 * default so the synthetic CI run stays green. Remove the skip and
 * pass the matching CLI flag (`--os-mouse`, `--snapshot-dir=DIR`) to
 * exercise them.
 *
 * See docs/headed-realism.md for the full audit and tier matrix.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

// =============================================================================
// Phase 3 — real-compile mode
//
// Default scenarios use `__compileTestCode` (test-mode shortcut).
// `compileMode: 'real'` exercises the production compile path so prelude
// resolution, debounced sync, and state transitions are tested end-to-end.
// =============================================================================

const realCompileMode: Scenario = {
  name: 'real-compile mode runs production compile() per step',
  category: 'step-runner-headed',
  compileMode: 'real',
  setup: 'Frame w 100, h 100, bg #888888',
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'setProperty',
      via: 'panel',
      target: 'node-1',
      property: 'bg',
      value: '#2271c1',
      expect: { props: { 'node-1': { bg: '#2271c1' } } },
    },
  ],
}

// =============================================================================
// Phase 4 — structural Selectors
//
// Bare node-ids (`node-N`) renumber when the IR changes. Structural
// selectors survive renumbering: byText/byTag/byPath resolve against
// the rendered DOM each time they're used.
// =============================================================================

const structuralSelectorByText: Scenario = {
  name: 'click target via byText survives surrounding insertions',
  category: 'step-runner-headed',
  setup: 'Frame gap 8\n  Button "Save"\n  Button "Cancel"',
  steps: [
    {
      do: 'click',
      nodeId: { byText: 'Save' },
      expect: { selectionNot: 'node-1' },
    },
    {
      do: 'click',
      nodeId: { byText: 'Cancel' },
    },
  ],
}

const structuralSelectorByPath: Scenario = {
  name: 'click target via byPath (Frame > Button)',
  category: 'step-runner-headed',
  setup: 'Frame gap 8\n  Button "A"\n  Button "B"',
  steps: [
    {
      do: 'click',
      nodeId: { byPath: 'Frame > Button', nth: 1 },
    },
  ],
}

// =============================================================================
// Phase 5 — OS-Mouse drag (gated, --os-mouse required)
//
// Only path that fires real HTML5 dragstart with `dataTransfer`.
// Required for palette-drag tests and HTML5-drag-handler tests.
// Removed the `skip` flag and pass `--os-mouse` on the CLI to run.
// =============================================================================

const osMouseClick: Scenario = {
  name: 'OS-mouse click (real cursor) on a node',
  category: 'step-runner-headed',
  inputMode: 'os',
  skip: { reason: 'requires --os-mouse on the CLI' },
  setup: 'Frame w 200, h 80, bg #2271c1\n  Button "Click me"',
  steps: [
    {
      do: 'click',
      nodeId: { byText: 'Click me' },
    },
  ],
}

const osMouseDragBetweenNodes: Scenario = {
  name: 'osDrag from one node to another',
  category: 'step-runner-headed',
  inputMode: 'os',
  skip: { reason: 'requires --os-mouse on the CLI' },
  setup: 'Frame hor, gap 16\n  Frame w 100, h 100, bg #2271c1\n  Frame w 100, h 100, bg #ef4444',
  steps: [
    {
      do: 'osDrag',
      from: { byId: 'node-2' },
      to: { byId: 'node-3' },
      preHoldMs: 100,
      dwellMs: 200,
    },
  ],
}

// =============================================================================
// Phase 7 — snapshot pixel-diff (gated, --snapshot-dir required)
//
// Per-step viewport PNGs pixel-diffed against a baseline. Catches
// realism regressions (cursor smoothness, focus rings, animation
// frames) that computed-style assertions miss.
//
// On first run, no baseline exists — the runner writes the PNG and
// logs a one-line hint; copy `dir/*.png` to `baselineDir/` to seed.
// On subsequent runs, mismatches fail the step.
// =============================================================================

const snapshotPerStep: Scenario = {
  name: 'snapshot at every step: hover state, selection, prop change',
  category: 'step-runner-headed',
  skip: { reason: 'requires --snapshot-dir=DIR (baseline must be seeded on first run)' },
  snapshots: {
    dir: 'test-results/snapshots/headed-realism',
    baselineDir: 'tests/baselines/headed-realism',
    threshold: 0.1,
  },
  setup: 'Frame w 200, h 80, bg #2271c1, rad 8',
  steps: [
    { do: 'select', nodeId: 'node-1' },
    {
      do: 'setProperty',
      via: 'panel',
      target: 'node-1',
      property: 'bg',
      value: '#ef4444',
      expect: { props: { 'node-1': { bg: '#ef4444' } } },
    },
  ],
}

// =============================================================================
// Combining tiers — real-compile + structural selector + (optional) snapshots
//
// Demonstrates that the new fields compose cleanly: a single scenario
// can exercise the production compile path, address nodes structurally,
// AND verify pixel output. The snapshot-gating still applies.
// =============================================================================

const combined: Scenario = {
  name: 'real-compile + structural selector (snapshots optional)',
  category: 'step-runner-headed',
  compileMode: 'real',
  // byText resolution matches any element whose textContent.trim() equals
  // the needle — siblings with disjoint text are unambiguous (Frame's
  // own textContent is the concatenation, not "Save"). The frame's bare
  // "Save" matches only one Button.
  setup: 'Frame gap 8\n  Button "Save"\n  Button "Cancel"',
  steps: [
    {
      do: 'click',
      nodeId: { byText: 'Save' },
    },
    {
      do: 'setProperty',
      via: 'panel',
      // Use byId here — the panel writer needs a stable handle that
      // matches the selection set in step 1; structural targets work
      // when one match is unambiguous.
      target: 'node-2',
      property: 'bg',
      value: '#10b981',
      expect: { props: { 'node-2': { bg: '#10b981' } } },
    },
  ],
}

// =============================================================================
// Export
// =============================================================================

export const headedRealismScenarios: Scenario[] = [
  realCompileMode,
  structuralSelectorByText,
  structuralSelectorByPath,
  osMouseClick,
  osMouseDragBetweenNodes,
  snapshotPerStep,
  combined,
]

export const headedRealismStepRunnerTests: TestCase[] =
  headedRealismScenarios.map(scenarioToTestCase)
