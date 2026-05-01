/**
 * Step-Runner — Components Phase C6: slot overrides.
 *
 * Slots ARE component-like definitions inside a parent component, so
 * they support the same per-usage override semantics as standalone
 * components. C3 covered "the slot bundle applies"; this phase covers
 * the override side:
 *
 *   - Inline override at the slot usage site replaces the matching slot
 *     property; other slot props still apply.
 *   - Two Card instances with different slot overrides — each is
 *     isolated, neither leaks to the other.
 *   - Editing one slot usage's override via panel updates only that
 *     usage; sibling Cards keep their own values.
 *   - Additive override at a slot usage adds a property the slot
 *     definition doesn't declare.
 *   - Token-reference override at a slot usage resolves correctly.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

// ----- C6.1: Inline override at slot usage replaces matching prop ----------
//
// Slot Title declares `weight 500`. Usage `Title "X", weight bold`
// overrides weight only — col + fs still apply from the slot definition.

const slotInlineOverride: Scenario = {
  name: 'C6.1 Inline override at a slot usage replaces only the matching slot prop',
  category: 'step-runner',
  setup:
    'Card: bg #1a1a1a, pad 16, gap 8\n' +
    '  Title: col white, fs 16, weight 500\n' +
    'Card\n' +
    '  Title "Headline", weight bold',
  steps: [
    {
      do: 'select',
      nodeId: 'node-2',
      expect: {
        selection: 'node-2',
        dom: {
          'node-2': {
            // Inherited from slot definition:
            color: 'rgb(255, 255, 255)',
            fontSize: '16px',
            // Overridden at usage:
            fontWeight: '700',
          },
        },
      },
    },
  ],
}

// ----- C6.2: Two Card instances, different slot overrides — isolated ------
//
// Same Card definition; two usages each fill Title with different
// overrides. Each Title's DOM reflects its own override; neither bleeds
// into the other. The slot definition's `col white` still applies in
// both cases.

const twoSlotOverridesIsolated: Scenario = {
  name: 'C6.2 Different slot overrides on two Card instances stay isolated',
  category: 'step-runner',
  setup:
    'Card: bg #1a1a1a, pad 16, gap 8\n' +
    '  Title: col white, fs 16, weight 500\n' +
    'Card\n' +
    '  Title "Bold one", weight bold\n' +
    'Card\n' +
    '  Title "Big one", fs 24',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          // First Card's Title: bold (700), default 16px
          'node-2': {
            color: 'rgb(255, 255, 255)',
            fontSize: '16px',
            fontWeight: '700',
          },
          // Second Card's Title: 24px, default weight 500
          'node-4': {
            color: 'rgb(255, 255, 255)',
            fontSize: '24px',
            fontWeight: '500',
          },
        },
      },
    },
  ],
}

// ----- C6.3: Edit one slot override via panel — sibling untouched ---------
//
// Two Card instances, each with a Title that has a `col` override.
// Edit the second Card's Title col via panel. The first Card's Title
// must keep its original override.

const slotOverrideEditIsolated: Scenario = {
  name: 'C6.3 Editing one slot override via panel does not affect sibling Card slots',
  category: 'step-runner',
  setup:
    'Card: bg #1a1a1a, pad 16, gap 8\n' +
    '  Title: col white, fs 16, weight 500\n' +
    'Card\n' +
    '  Title "First", col #2271c1\n' +
    'Card\n' +
    '  Title "Second", col #ef4444',
  steps: [
    {
      do: 'select',
      nodeId: 'node-4',
      expect: {
        selection: 'node-4',
        props: { 'node-4': { col: '#ef4444' } },
      },
    },
    {
      do: 'setProperty',
      via: 'panel',
      target: 'node-4',
      property: 'col',
      value: '#10b981',
      expect: {
        // Edit landed on node-4 only.
        props: {
          'node-2': { col: '#2271c1' },
          'node-4': { col: '#10b981' },
        },
        // Source: only the second Title line touched.
        code:
          'Card: bg #1a1a1a, pad 16, gap 8\n' +
          '  Title: col white, fs 16, weight 500\n' +
          'Card\n' +
          '  Title "First", col #2271c1\n' +
          'Card\n' +
          '  Title "Second", col #10b981',
      },
    },
  ],
}

// ----- C6.4: Additive override at slot usage --------------------------------
//
// Slot Title declares col + fs + weight, no margin. Usage adds `mar 8`.
// The mar applies; other slot props still inherited.

const slotAdditiveOverride: Scenario = {
  name: 'C6.4 Slot usage adds a property not in the slot definition (additive)',
  category: 'step-runner',
  setup:
    'Card: bg #1a1a1a, pad 16, gap 8\n' +
    '  Title: col white, fs 16, weight 500\n' +
    'Card\n' +
    '  Title "Spaced", mar 8',
  steps: [
    {
      do: 'select',
      nodeId: 'node-2',
      expect: {
        selection: 'node-2',
        dom: {
          'node-2': {
            // From slot definition:
            color: 'rgb(255, 255, 255)',
            fontSize: '16px',
            fontWeight: '500',
            // Added at usage:
            marginTop: '8px',
            marginLeft: '8px',
          },
        },
      },
    },
  ],
}

// ----- C6.5: Token-reference override at slot usage -----------------------
//
// Slot has `col white` literal. Usage overrides with `col $danger`,
// where the token lives in tokens.tok. The rendered color is the
// token's value, proving cross-file resolution at the slot level.

const slotTokenOverride: Scenario = {
  name: 'C6.5 Token reference as a slot override resolves at the usage site',
  category: 'step-runner',
  setup: {
    entry: 'app.mir',
    files: {
      'tokens.tok': 'danger.col: #ef4444',
      'components.com':
        'Card: bg #1a1a1a, pad 16, gap 8\n' + '  Title: col white, fs 16, weight 500',
      'app.mir': 'Card\n' + '  Title "Default"\n' + 'Card\n' + '  Title "Danger", col $danger',
    },
  },
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          // First Card's Title: slot's literal col white
          'node-2': { color: 'rgb(255, 255, 255)' },
          // Second Card's Title: $danger overrides → #ef4444
          'node-4': { color: 'rgb(239, 68, 68)' },
        },
      },
    },
  ],
}

export const componentSlotOverridesScenarios: Scenario[] = [
  slotInlineOverride,
  twoSlotOverridesIsolated,
  slotOverrideEditIsolated,
  slotAdditiveOverride,
  slotTokenOverride,
]
export const componentSlotOverridesStepRunnerTests: TestCase[] =
  componentSlotOverridesScenarios.map(scenarioToTestCase)
