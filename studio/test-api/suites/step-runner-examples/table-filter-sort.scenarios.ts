/**
 * Step-Runner — Tables Phase T3: filter + sort.
 *
 * Mirror's `each` supports two modifiers:
 *   - `where <predicate>` filters out non-matching rows
 *   - `by <field>` orders rows by that field (ascending)
 *
 * Both inspectable via the rendered Table's textContent — included
 * titles + their order are observable from the readout.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

// ----- T3.1: `where` filters out matching rows ----------------------------

const whereFilter: Scenario = {
  name: 'T3.1 each ... where status != "done" excludes done rows',
  category: 'step-runner',
  setup:
    'tasks:\n' +
    '  t1:\n' +
    '    title: "A"\n' +
    '    status: "done"\n' +
    '  t2:\n' +
    '    title: "B"\n' +
    '    status: "todo"\n' +
    '  t3:\n' +
    '    title: "C"\n' +
    '    status: "todo"\n' +
    'Table\n' +
    '  TableHeader hor\n' +
    '    Text "Title"\n' +
    '  each task in $tasks where task.status != "done"\n' +
    '    TableRow hor\n' +
    '      Text task.title',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        // Includes B + C (todo), excludes A (done). Order is preserved.
        // The regex pins B before C and forbids "A" appearing as a row.
        dom: {
          'node-1': { textContent: /^Title.*B.*C$/ },
        },
      },
    },
  ],
}

// ----- T3.2: `by <field>` sorts rows ascending ----------------------------

const bySort: Scenario = {
  name: 'T3.2 each ... by priority renders rows in ascending order',
  category: 'step-runner',
  setup:
    'tasks:\n' +
    '  t1:\n' +
    '    title: "C"\n' +
    '    priority: 3\n' +
    '  t2:\n' +
    '    title: "A"\n' +
    '    priority: 1\n' +
    '  t3:\n' +
    '    title: "B"\n' +
    '    priority: 2\n' +
    'Table\n' +
    '  TableHeader hor\n' +
    '    Text "Title"\n' +
    '  each task in $tasks by priority\n' +
    '    TableRow hor\n' +
    '      Text task.title',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        // Source declares order C, A, B; sorted by priority gives A, B, C.
        dom: {
          'node-1': { textContent: /^Title.*A.*B.*C$/ },
        },
      },
    },
  ],
}

// ----- T3.3: where + by combined ------------------------------------------
//
// `each task in $tasks where task.status != "done" by priority` —
// filter THEN sort. Done rows excluded, remainder ordered ascending
// by priority.

const whereAndBy: Scenario = {
  name: 'T3.3 each ... where ... by combines filter and sort correctly',
  category: 'step-runner',
  setup:
    'tasks:\n' +
    '  t1:\n' +
    '    title: "Done"\n' +
    '    status: "done"\n' +
    '    priority: 1\n' +
    '  t2:\n' +
    '    title: "Med"\n' +
    '    status: "todo"\n' +
    '    priority: 2\n' +
    '  t3:\n' +
    '    title: "Hi"\n' +
    '    status: "todo"\n' +
    '    priority: 1\n' +
    '  t4:\n' +
    '    title: "Lo"\n' +
    '    status: "todo"\n' +
    '    priority: 3\n' +
    'Table\n' +
    '  TableHeader hor\n' +
    '    Text "Title"\n' +
    '  each task in $tasks where task.status != "done" by priority\n' +
    '    TableRow hor\n' +
    '      Text task.title',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        // "Done" excluded (status=done). Remaining sorted by priority:
        // Hi(1), Med(2), Lo(3).
        dom: {
          'node-1': { textContent: /^Title.*Hi.*Med.*Lo$/ },
        },
      },
    },
  ],
}

export const tableFilterSortScenarios: Scenario[] = [whereFilter, bySort, whereAndBy]
export const tableFilterSortStepRunnerTests: TestCase[] =
  tableFilterSortScenarios.map(scenarioToTestCase)
