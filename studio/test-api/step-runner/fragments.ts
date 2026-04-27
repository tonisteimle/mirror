/**
 * Step-Runner Fragments — composable, parameterised step sequences.
 *
 * A fragment is just a function that returns `Step[]`. Scenarios use
 * `...fragment(args)` to inline the steps. This is plain TypeScript —
 * the runner doesn't need to know fragments exist; they pre-expand.
 *
 * The point: real use-case scenarios share a lot of preamble ("create
 * a card with title and body", "set up a 3-button toolbar"). Inlining
 * those preambles per scenario is repetitive; fragments DRY it.
 */

import type { Step } from './types'

/**
 * Select a node and set a property to a value via the panel, asserting
 * sync across all three readout dimensions afterwards. The most common
 * user action — touch a property and verify it landed everywhere.
 */
export function panelSet(nodeId: string, property: string, value: string): Step[] {
  return [
    { do: 'select', nodeId, expect: { selection: nodeId } },
    {
      do: 'setProperty',
      via: 'panel',
      target: nodeId,
      property,
      value,
      expect: { props: { [nodeId]: { [property]: value } } },
    },
  ]
}

/**
 * Select a node and set a property via code edit. Same shape as panelSet
 * but tests the code-edit path.
 */
export function codeSet(nodeId: string, property: string, value: string): Step[] {
  return [
    { do: 'select', nodeId, expect: { selection: nodeId } },
    {
      do: 'setProperty',
      via: 'code',
      target: nodeId,
      property,
      value,
      expect: { props: { [nodeId]: { [property]: value } } },
    },
  ]
}

/**
 * Style an element by chaining several panel-set calls. Each property
 * is set + validated independently, plus the final step asserts the
 * full set together so we know nothing got trampled along the way.
 */
export function styleViaPanel(nodeId: string, styles: Record<string, string>): Step[] {
  const entries = Object.entries(styles)
  if (entries.length === 0) return []

  const steps: Step[] = [{ do: 'select', nodeId, expect: { selection: nodeId } }]
  for (const [property, value] of entries) {
    steps.push({
      do: 'setProperty',
      via: 'panel',
      target: nodeId,
      property,
      value,
      // Per-step expectation: just the property we just set.
      expect: { props: { [nodeId]: { [property]: value } } },
    })
  }
  // Final: assert the whole bundle survived.
  steps.push({
    do: 'wait',
    ms: 50,
    comment: `verify all of ${entries.map(([k]) => k).join(', ')} together`,
    expect: { props: { [nodeId]: styles } },
  })
  return steps
}
