/**
 * Step-Runner — Tables Phase T4: cross-file data sources.
 *
 * Realistic projects keep table data in `data/*.yaml` and the layout
 * in `app.mir`. The compiler resolves cross-file references when the
 * Table consumes `$collection` defined in the data file.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

// ----- T4.0a: Inline with the SAME comment-separator format prelude uses --
//
// If T4.0a passes but T4.1 fails, the comment-separated source itself
// is fine and the fault is in the prelude pipeline (not picking up
// data files).

const inlineWithCommentSeparator: Scenario = {
  name: 'T4.0a inline data + table separated by `// === filename ===` comments still renders',
  category: 'step-runner',
  setup:
    '// === tasks.yaml ===\n' +
    'tasks:\n' +
    '  t1:\n' +
    '    title: "First"\n' +
    '  t2:\n' +
    '    title: "Second"\n' +
    '\n' +
    '// === app.mir ===\n' +
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
        dom: { 'node-1': { textContent: /^Title.*First.*Second$/ } },
      },
    },
  ],
}

// ----- T4.0: Sanity — same Table+data inline (one file) works -------------

const inlineDataSanity: Scenario = {
  name: 'T4.0 inline (single-file) tasks + Table renders rows correctly',
  category: 'step-runner',
  setup:
    'tasks:\n' +
    '  t1:\n' +
    '    title: "First"\n' +
    '  t2:\n' +
    '    title: "Second"\n' +
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
        dom: { 'node-1': { textContent: /^Title.*First.*Second$/ } },
      },
    },
  ],
}

// ----- T4.0b: Sanity — multi-file with NO data, just a Frame in app.mir ---

const multiFileSimpleFrame: Scenario = {
  name: 'T4.0b multi-file with a single Frame in app.mir renders correctly',
  category: 'step-runner',
  setup: {
    entry: 'app.mir',
    files: {
      'app.mir': 'Frame w 100, h 100, bg #2271c1',
    },
  },
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: { 'node-1': { backgroundColor: 'rgb(34, 113, 193)' } },
      },
    },
  ],
}

// ----- T4.1: Table consumes data declared in a separate YAML file ---------

const tableConsumesYamlData: Scenario = {
  name: 'T4.1 Table in app.mir consumes $tasks defined in data/tasks.yaml',
  category: 'step-runner',
  setup: {
    entry: 'app.mir',
    files: {
      // YAML basename = collection name. Top-level keys ARE the entries
      // — no outer wrapper. (`tasks.yaml` with `tasks:` outer key would
      // double-nest as __mirrorData["tasks"]["tasks"]).
      'tasks.yaml':
        't1:\n' +
        '  title: "First"\n' +
        't2:\n' +
        '  title: "Second"\n' +
        't3:\n' +
        '  title: "Third"',
      'app.mir':
        'Table\n' +
        '  TableHeader hor\n' +
        '    Text "Title"\n' +
        '  each task in $tasks\n' +
        '    TableRow hor\n' +
        '      Text task.title',
    },
  },
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        // All three titles render in declaration order
        dom: { 'node-1': { textContent: /^Title.*First.*Second.*Third$/ } },
      },
    },
  ],
}

// ----- T4.2: Edit data file → table re-renders with new entries ----------

const editDataFileRerenders: Scenario = {
  name: 'T4.2 Editing data/tasks.yaml propagates new rows into the Table',
  category: 'step-runner',
  setup: {
    entry: 'app.mir',
    files: {
      // No outer wrapper — see T4.1 for the basename rationale.
      'tasks.yaml': 't1:\n  title: "Original"',
      'app.mir':
        'Table\n' +
        '  TableHeader hor\n' +
        '    Text "Title"\n' +
        '  each task in $tasks\n' +
        '    TableRow hor\n' +
        '      Text task.title',
    },
  },
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: { 'node-1': { textContent: /^Title.*Original$/ } },
      },
    },
    // Replace tasks.yaml content directly via panel.files (not via the
    // editor — see replaceFile docs in step-runner/types for why).
    {
      do: 'replaceFile',
      filename: 'tasks.yaml',
      content:
        't1:\n' +
        '  title: "Original"\n' +
        't2:\n' +
        '  title: "Added"\n' +
        't3:\n' +
        '  title: "Newer"',
    },
    // Active file is still app.mir; the implicit recompile picks up
    // the new YAML data through generateYAMLDataInjection().
    {
      do: 'waitFor',
      until: {
        dom: { 'node-1': { textContent: /^Title.*Original.*Added.*Newer$/ } },
      },
    },
  ],
}

export const tableCrossFileScenarios: Scenario[] = [
  inlineWithCommentSeparator,
  inlineDataSanity,
  multiFileSimpleFrame,
  tableConsumesYamlData,
  editDataFileRerenders,
]
export const tableCrossFileStepRunnerTests: TestCase[] =
  tableCrossFileScenarios.map(scenarioToTestCase)
