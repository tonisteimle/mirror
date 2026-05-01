/**
 * Step-Runner — Tables Phase T1: static tables.
 *
 * `Table` is a compound primitive with named slots: TableHeader,
 * TableRow, etc. Each rendered as a node with its own data-mirror-id.
 * Tests pin three things:
 *   - Table renders as a node (no compile error)
 *   - TableHeader cell contents
 *   - Multiple TableRows each render with their own cells
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

// ----- T1.1: Table + TableHeader + 2 TableRows -----------------------------

const tableHeaderTwoRows: Scenario = {
  name: 'T1.1 Table with TableHeader + two TableRows renders all cells',
  category: 'step-runner',
  setup:
    'Table\n' +
    '  TableHeader hor, gap 24\n' +
    '    Text "Name"\n' +
    '    Text "City"\n' +
    '  TableRow hor, gap 24\n' +
    '    Text "Max"\n' +
    '    Text "Berlin"\n' +
    '  TableRow hor, gap 24\n' +
    '    Text "Anna"\n' +
    '    Text "Munich"',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          // Header cells
          'node-3': { textContent: 'Name' },
          'node-4': { textContent: 'City' },
          // First row
          'node-6': { textContent: 'Max' },
          'node-7': { textContent: 'Berlin' },
          // Second row
          'node-9': { textContent: 'Anna' },
          'node-10': { textContent: 'Munich' },
        },
      },
    },
  ],
}

// ----- T1.2: Three TableRows count check ----------------------------------
//
// Sanity check that N rows in source produce N TableRow nodes in DOM.

const threeTableRows: Scenario = {
  name: 'T1.2 Three TableRow declarations all render to DOM',
  category: 'step-runner',
  setup:
    'Table\n' +
    '  TableHeader hor\n' +
    '    Text "X"\n' +
    '  TableRow hor\n' +
    '    Text "A"\n' +
    '  TableRow hor\n' +
    '    Text "B"\n' +
    '  TableRow hor\n' +
    '    Text "C"',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          // Cells of all three rows
          'node-5': { textContent: 'A' },
          'node-7': { textContent: 'B' },
          'node-9': { textContent: 'C' },
        },
      },
    },
  ],
}

export const tableStaticScenarios: Scenario[] = [tableHeaderTwoRows, threeTableRows]
export const tableStaticStepRunnerTests: TestCase[] = tableStaticScenarios.map(scenarioToTestCase)
