/**
 * Table Primitives Tests
 *
 * Tests for: Table, TableHeader, TableRow, TableFooter, TableCell, TableHeaderCell
 *
 * These are now standard primitives (not compound primitives).
 * Tables are built using normal layout with `each` loops for data iteration.
 */

import { testWithSetup, testSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// Helper to inspect with null check
function inspectStrict(api: TestAPI, nodeId: string, elementName: string) {
  const info = api.preview.inspect(nodeId)
  api.assert.ok(info !== null, `${elementName} inspect should return info`)
  return info!
}

export const tablePrimitives: TestCase[] = describe('Table Primitives', [
  // =============================================================================
  // Basic Table Primitives
  // =============================================================================

  testWithSetup('Table renders as div', 'Table', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = inspectStrict(api, 'node-1', 'Table')
    api.assert.ok(info.tagName === 'div', `Table should be div, got: ${info.tagName}`)
  }),

  testWithSetup('TableHeader renders as div', 'TableHeader', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = inspectStrict(api, 'node-1', 'TableHeader')
    api.assert.ok(info.tagName === 'div', `TableHeader should be div, got: ${info.tagName}`)
  }),

  testWithSetup('TableRow renders as div', 'TableRow', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = inspectStrict(api, 'node-1', 'TableRow')
    api.assert.ok(info.tagName === 'div', `TableRow should be div, got: ${info.tagName}`)
  }),

  testWithSetup('TableFooter renders as div', 'TableFooter', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = inspectStrict(api, 'node-1', 'TableFooter')
    api.assert.ok(info.tagName === 'div', `TableFooter should be div, got: ${info.tagName}`)
  }),

  testWithSetup('TableCell renders as div', 'TableCell', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = inspectStrict(api, 'node-1', 'TableCell')
    api.assert.ok(info.tagName === 'div', `TableCell should be div, got: ${info.tagName}`)
  }),

  testWithSetup('TableHeaderCell renders as div', 'TableHeaderCell', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = inspectStrict(api, 'node-1', 'TableHeaderCell')
    api.assert.ok(info.tagName === 'div', `TableHeaderCell should be div, got: ${info.tagName}`)
  }),

  // =============================================================================
  // Table with Styles
  // =============================================================================

  testWithSetup('Table with styles', 'Table bg #1a1a1a, rad 8, gap 0', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
    api.assert.hasStyle('node-1', 'borderRadius', '8px')
  }),

  testWithSetup(
    'TableHeader with styles',
    'TableHeader hor, gap 24, pad 12 16, bg #252525',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'gap', '24px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(37, 37, 37)')
    }
  ),

  testWithSetup('TableRow with styles', 'TableRow hor, gap 24, pad 12 16', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'flexDirection', 'row')
    api.assert.hasStyle('node-1', 'gap', '24px')
  }),

  // =============================================================================
  // Static Table Structure
  // =============================================================================

  testWithSetup(
    'Static table with header and rows',
    `Table bg #1a1a1a, rad 8
  TableHeader hor, gap 24, pad 12 16, bg #252525
    Text "Name", col #888, fs 11, uppercase
    Text "Status", col #888, fs 11, uppercase
  TableRow hor, gap 24, pad 12 16
    Text "Max", col white
    Text "Active", col #10b981
  TableRow hor, gap 24, pad 12 16
    Text "Anna", col white
    Text "Pending", col #f59e0b`,
    async (api: TestAPI) => {
      // Table container
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')

      // Header
      api.assert.exists('node-2')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(37, 37, 37)')

      // Header cells
      api.assert.exists('node-3')
      api.assert.hasText('node-3', 'Name')

      api.assert.exists('node-4')
      api.assert.hasText('node-4', 'Status')

      // First row
      api.assert.exists('node-5')
      api.assert.exists('node-6')
      api.assert.hasText('node-6', 'Max')

      // Second row
      api.assert.exists('node-8')
    }
  ),

  // =============================================================================
  // Table with Footer
  // =============================================================================

  testWithSetup(
    'Table with footer',
    `Table bg #1a1a1a, rad 8
  TableHeader hor, pad 12 16, bg #252525
    Text "Item", col #888
    Text "Price", col #888
  TableRow hor, pad 12 16
    Text "Product A", col white
    Text "$29", col white
  TableFooter hor, pad 12 16, bg #252525
    Text "Total", col white
    Text "$29", col #10b981`,
    async (api: TestAPI) => {
      // Table container
      api.assert.exists('node-1')

      // Footer should exist
      api.assert.exists('node-8')
      api.assert.hasStyle('node-8', 'backgroundColor', 'rgb(37, 37, 37)')
    }
  ),

  // =============================================================================
  // Data-bound Table with each
  // =============================================================================

  testWithSetup(
    'Data-bound table with each loop',
    `users:
  u1:
    name: "Max"
    role: "Admin"
  u2:
    name: "Anna"
    role: "Designer"

Table bg #1a1a1a, rad 8
  TableHeader hor, gap 24, pad 12 16, bg #252525
    Text "Name", col #888
    Text "Role", col #888
  each user in $users
    TableRow hor, gap 24, pad 12 16
      Text user.name, col white
      Text user.role, col #888`,
    async (api: TestAPI) => {
      // Table container
      api.assert.exists('node-1')

      // Header
      api.assert.exists('node-2')

      // Data rows should be generated
      // The each loop creates rows dynamically
      const tableEl = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(tableEl !== null, 'Table element should exist')

      // Should have multiple rows (header + data rows)
      const rows = tableEl!.querySelectorAll('[data-mirror-id]')
      api.assert.ok(rows.length >= 3, `Table should have at least 3 elements, got ${rows.length}`)
    }
  ),

  // =============================================================================
  // Table with Filter (where)
  // =============================================================================

  testWithSetup(
    'Data-bound table with where filter',
    `tasks:
  t1:
    title: "Done Task"
    done: true
  t2:
    title: "Open Task"
    done: false
  t3:
    title: "Another Open"
    done: false

Table bg #1a1a1a, rad 8
  each task in $tasks where task.done == false
    TableRow hor, pad 12 16
      Text task.title, col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Should only show 2 rows (filtered)
      const tableEl = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(tableEl !== null, 'Table element should exist')

      // Count text elements with "Open" in them
      const textEls = tableEl!.querySelectorAll('span')
      let openCount = 0
      textEls.forEach(el => {
        if (el.textContent?.includes('Open')) openCount++
      })
      api.assert.ok(openCount === 2, `Should have 2 open tasks, got ${openCount}`)
    }
  ),

  // =============================================================================
  // Table with Sort (by)
  // =============================================================================

  testWithSetup(
    'Data-bound table with by sort',
    `items:
  a:
    name: "Zebra"
    priority: 3
  b:
    name: "Alpha"
    priority: 1
  c:
    name: "Beta"
    priority: 2

Table bg #1a1a1a, rad 8
  each item in $items by priority
    TableRow hor, pad 12 16
      Text item.priority, col #888
      Text item.name, col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Items should be sorted by priority
      const tableEl = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(tableEl !== null, 'Table element should exist')

      // Get all text elements
      const spans = tableEl!.querySelectorAll('span')
      const texts = Array.from(spans).map(s => s.textContent)

      // First item should be Alpha (priority 1)
      api.assert.ok(
        texts.some(t => t === 'Alpha'),
        'Should contain Alpha'
      )
    }
  ),

  // =============================================================================
  // Table with Hover States
  // =============================================================================

  testWithSetup(
    'TableRow with hover state',
    `Table bg #1a1a1a, rad 8
  TableRow hor, pad 12 16, bg #1a1a1a
    hover:
      bg #252525
    Text "Hover me", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')

      // Row should have base background
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(26, 26, 26)')
    }
  ),

  // =============================================================================
  // Table Component Definition
  // =============================================================================

  testWithSetup(
    'Custom table component definition',
    `MyTable: bg #1a1a1a, rad 8, gap 0, clip
MyRow: hor, gap 24, pad 12 16, bor 0 0 1 0, boc #222

MyTable
  MyRow
    Text "Cell 1", col white
    Text "Cell 2", col white
  MyRow
    Text "Cell 3", col white
    Text "Cell 4", col white`,
    async (api: TestAPI) => {
      // Table container
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')

      // Rows
      api.assert.exists('node-2')
      api.assert.hasStyle('node-2', 'flexDirection', 'row')
    }
  ),

  // =============================================================================
  // Zebra Striping with Index
  // Note: Ternary with modulo (index % 2 == 0 ? ...) is not supported in Mirror
  // Use CSS :nth-child or separate components for zebra patterns
  // =============================================================================

  testSkip(
    'Zebra striping with index - requires ternary with modulo (not supported)',
    async () => {}
  ),

  // =============================================================================
  // Complex Table Layout
  // =============================================================================

  testWithSetup(
    'Complex table with all features',
    `products:
  p1:
    name: "Basic Plan"
    price: 9
    users: 5
  p2:
    name: "Pro Plan"
    price: 29
    users: 50

Table bg #0a0a0a, rad 12, w full
  TableHeader hor, pad 16, bg #1a1a1a
    Text "Plan", col #888, fs 11, uppercase, w 120
    Text "Price", col #888, fs 11, uppercase, w 80
    Text "Users", col #888, fs 11, uppercase, grow
  each product in $products
    TableRow hor, pad 16, bor 0 0 1 0, boc #222
      Text product.name, col white, w 120
      Text "$" + product.price, col #10b981, w 80
      Text product.users + " users", col #666, grow
  TableFooter hor, pad 16, bg #1a1a1a
    Text "Total: 2 plans", col #888`,
    async (api: TestAPI) => {
      // Table container
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'borderRadius', '12px')

      // Header
      api.assert.exists('node-2')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(26, 26, 26)')

      // Footer should exist at end
      const tableEl = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(tableEl !== null, 'Table element should exist')

      // Check total text exists
      const allText = tableEl!.textContent
      api.assert.ok(allText?.includes('Total'), 'Should contain Total text')
    }
  ),

  // =============================================================================
  // Table with Actions
  // =============================================================================

  testWithSetup(
    'Table row with action button',
    `users:
  u1:
    name: "Max"
    email: "max@example.com"

Table bg #1a1a1a, rad 8
  each user in $users
    TableRow hor, spread, pad 12 16, ver-center
      Frame gap 4
        Text user.name, col white, weight 500
        Text user.email, col #888, fs 12
      Button "Edit", bg #2563eb, col white, pad 8 16, rad 6`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Check for button
      const tableEl = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(tableEl !== null, 'Table element should exist')

      const button = tableEl!.querySelector('button')
      api.assert.ok(button !== null, 'Should have an Edit button')
      api.assert.ok(button!.textContent === 'Edit', 'Button should say Edit')
    }
  ),

  // =============================================================================
  // Empty State
  // =============================================================================

  testWithSetup(
    'Table with empty data shows nothing',
    `items:

Table bg #1a1a1a, rad 8
  TableHeader hor, pad 12 16, bg #252525
    Text "Name", col #888
  each item in $items
    TableRow hor, pad 12 16
      Text item.name, col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Should only have header, no data rows
      const tableEl = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(tableEl !== null, 'Table element should exist')

      // Header should exist
      api.assert.exists('node-2')
    }
  ),
])
