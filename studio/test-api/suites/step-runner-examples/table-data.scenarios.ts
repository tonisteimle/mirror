/**
 * Step-Runner — Tables Phase T2: data-bound tables.
 *
 *   tasks:
 *     t1: { title: "...", status: "..." }
 *     ...
 *   Table
 *     TableHeader hor
 *       Text "Title"
 *     each task in $tasks
 *       TableRow hor
 *         Text task.title
 *
 * The `each` block declares ONE template node in source but the runtime
 * renders one DOM element per data entry. We assert the rendered shape
 * via the Table root's textContent (which aggregates all descendants),
 * proving:
 *   - N entries → N rows rendered (combined text contains every title)
 *   - row.field interpolation resolves correctly per entry
 *
 * Pure-DOM cell-by-cell assertions would need stable per-instance node
 * ids, which Mirror's source-level mapping doesn't provide for
 * templated rows — root-textContent is the contractual readout.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

// ----- T2.1: each task in $tasks renders one row per entry -----------------

const eachRendersAllRows: Scenario = {
  name: 'T2.1 each task in $tasks renders one TableRow per entry',
  category: 'step-runner',
  setup:
    'tasks:\n' +
    '  t1:\n' +
    '    title: "Design Review"\n' +
    '  t2:\n' +
    '    title: "Development"\n' +
    '  t3:\n' +
    '    title: "Testing"\n' +
    'Table\n' +
    '  TableHeader hor\n' +
    '    Text "Title"\n' +
    '  each task in $tasks\n' +
    '    TableRow hor\n' +
    '      Text task.title',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        // Table root's textContent contains every task title plus the header
        dom: {
          'node-1': { textContent: /Title.*Design Review.*Development.*Testing/ },
        },
      },
    },
  ],
}

// ----- T2.2: row.field interpolation across multiple cells -----------------
//
// Each task has title + status. Both cells use task.<field>. Verify
// both fields resolve to actual values per row.

const rowFieldInterpolation: Scenario = {
  name: 'T2.2 row cells interpolate task.title AND task.status correctly',
  category: 'step-runner',
  setup:
    'tasks:\n' +
    '  t1:\n' +
    '    title: "Design"\n' +
    '    status: "done"\n' +
    '  t2:\n' +
    '    title: "Build"\n' +
    '    status: "progress"\n' +
    'Table\n' +
    '  TableHeader hor\n' +
    '    Text "Title"\n' +
    '    Text "Status"\n' +
    '  each task in $tasks\n' +
    '    TableRow hor\n' +
    '      Text task.title\n' +
    '      Text task.status',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        // Table aggregates: header + (Design done) + (Build progress)
        dom: {
          'node-1': {
            textContent: /Title.*Status.*Design.*done.*Build.*progress/,
          },
        },
      },
    },
  ],
}

// ----- T2.3: Empty list renders only the header ----------------------------
//
// `each` over an empty collection produces zero TableRow DOM nodes.
// The header cells are still there.

const emptyListOnlyHeader: Scenario = {
  name: 'T2.3 each over an empty collection renders only the header',
  category: 'step-runner',
  setup:
    'tasks:\n' +
    'Table\n' +
    '  TableHeader hor\n' +
    '    Text "Title"\n' +
    '  each task in $tasks\n' +
    '    TableRow hor\n' +
    '      Text task.title',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        // Only header text appears; no row content
        dom: {
          'node-1': { textContent: 'Title' },
        },
      },
    },
  ],
}

export const tableDataScenarios: Scenario[] = [
  eachRendersAllRows,
  rowFieldInterpolation,
  emptyListOnlyHeader,
]
export const tableDataStepRunnerTests: TestCase[] = tableDataScenarios.map(scenarioToTestCase)
