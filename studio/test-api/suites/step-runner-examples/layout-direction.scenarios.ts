/**
 * Step-Runner — Layout Phase 1: direction (ver / hor).
 *
 * Atomic, two-children Frame. We don't yet have a `dir` property reader,
 * so we assert via `code` (source kept literal) + `dom` (computed
 * flex-direction). Adding a 3-dim reader later is a tiny framework step.
 *
 * Naming convention: tests start with `L1.x` so `--filter="L1\\."` runs
 * exactly this phase.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

// ----- L1.1: hor renders flex-direction row ---------------------------------

const horRendersRow: Scenario = {
  name: 'L1.1 hor on a Frame renders flex-direction row',
  category: 'step-runner',
  setup: 'Frame hor\n  Text "A"\n  Text "B"',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        code: 'Frame hor\n  Text "A"\n  Text "B"',
        dom: { 'node-1': { flexDirection: 'row' } },
      },
    },
  ],
}

// ----- L1.2: ver renders flex-direction column ------------------------------

const verRendersColumn: Scenario = {
  name: 'L1.2 ver on a Frame renders flex-direction column',
  category: 'step-runner',
  setup: 'Frame ver\n  Text "A"\n  Text "B"',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        code: 'Frame ver\n  Text "A"\n  Text "B"',
        dom: { 'node-1': { flexDirection: 'column' } },
      },
    },
  ],
}

// ----- L1.3: Default (no direction token) is column -------------------------

const defaultIsColumn: Scenario = {
  name: 'L1.3 Frame without hor/ver defaults to flex-direction column',
  category: 'step-runner',
  setup: 'Frame\n  Text "A"\n  Text "B"',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        code: 'Frame\n  Text "A"\n  Text "B"',
        dom: { 'node-1': { flexDirection: 'column' } },
      },
    },
  ],
}

// ----- L1.4: hor → ver toggle via code edit ---------------------------------
//
// Drives the editor: replace `Frame hor` with `Frame ver`. Verifies the
// preview re-renders with column direction AFTER the edit, i.e. that the
// Studio compile/sync pipeline picks up the change.

const horToVerViaCode: Scenario = {
  name: 'L1.4 toggling hor → ver via code re-renders the preview as column',
  category: 'step-runner',
  setup: 'Frame hor\n  Text "A"\n  Text "B"',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: { 'node-1': { flexDirection: 'row' } },
      },
    },
    {
      do: 'editorSet',
      code: 'Frame ver\n  Text "A"\n  Text "B"',
      expect: {
        code: 'Frame ver\n  Text "A"\n  Text "B"',
        dom: { 'node-1': { flexDirection: 'column' } },
      },
    },
  ],
}

export const layoutDirectionScenarios: Scenario[] = [
  horRendersRow,
  verRendersColumn,
  defaultIsColumn,
  horToVerViaCode,
]
export const layoutDirectionStepRunnerTests: TestCase[] =
  layoutDirectionScenarios.map(scenarioToTestCase)
