/**
 * Table Tests
 *
 * Tests for Mirror's Table component:
 * - Static tables with Header and Row
 * - Data-bound tables with $data
 * - Table styling and layout
 * - Column definitions
 * - Row customization
 * - Filtering and sorting
 */

import { testWithSetup, describe, type TestCase } from '../test-runner'
import type { TestAPI } from '../types'

// =============================================================================
// Static Tables
// =============================================================================

export const staticTableTests: TestCase[] = describe('Static Tables', [
  testWithSetup(
    'Basic table with header and rows',
    `Table
  Header:
    Row "Name", "Status", "Action"
  Row "Max", "Active", "Edit"
  Row "Anna", "Pending", "Edit"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Table

      const table = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(table !== null, 'Table should exist')
      api.assert.ok(table?.textContent?.includes('Max'), 'Should contain Max')
      api.assert.ok(table?.textContent?.includes('Anna'), 'Should contain Anna')
    }
  ),

  testWithSetup(
    'Table with styled header',
    `Table
  Header: bg #222, pad 12, col white, weight bold
    Row "Product", "Price", "Stock"
  Row "Widget", "$10", "100"
  Row "Gadget", "$25", "50"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Table

      const table = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(table !== null, 'Table should exist')
    }
  ),

  testWithSetup(
    'Table with footer',
    `Table
  Header:
    Row "Item", "Qty", "Price"
  Row "Apple", "5", "$2.50"
  Row "Banana", "3", "$1.50"
  Footer: bg #1a1a1a, pad 12
    Row "Total", "", "$4.00"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Table
    }
  ),
])

// =============================================================================
// Data-Bound Tables
// =============================================================================

export const dataBoundTableTests: TestCase[] = describe('Data-Bound Tables', [
  testWithSetup(
    'Table with data binding',
    `users:
  u1:
    name: "John"
    email: "john@example.com"
  u2:
    name: "Jane"
    email: "jane@example.com"

Table $users
  Header:
    Row "Name", "Email"
  Row: pad 8
    Text row.name, col white
    Text row.email, col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Table

      const table = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(table !== null, 'Table should exist')
      api.assert.ok(table?.textContent?.includes('John'), 'Should render John')
      api.assert.ok(table?.textContent?.includes('Jane'), 'Should render Jane')
    }
  ),

  testWithSetup(
    'Table with custom row template',
    `tasks:
  t1:
    title: "Design"
    status: "done"
  t2:
    title: "Develop"
    status: "progress"

Table $tasks, gap 4
  Header: bg #222, pad 12, rad 6 6 0 0
    Row "Task", "Status"
  Row: hor, spread, pad 12, bg #1a1a1a, rad 6, ver-center
    Text row.title, col white, grow
    Text row.status, col #888, w 80`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Table

      const table = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(table !== null, 'Table should exist')
    }
  ),

  testWithSetup(
    'Table with conditional styling',
    `items:
  i1:
    name: "Item A"
    active: true
  i2:
    name: "Item B"
    active: false

Table $items
  Row: pad 12, bg row.active ? #10b98120 : #1a1a1a
    Text row.name, col row.active ? #10b981 : #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Table
    }
  ),
])

// =============================================================================
// Table Layout
// =============================================================================

export const tableLayoutTests: TestCase[] = describe('Table Layout', [
  testWithSetup(
    'Table with gap between rows',
    `Table gap 8
  Row "Row 1", pad 12, bg #1a1a1a, rad 6
  Row "Row 2", pad 12, bg #1a1a1a, rad 6
  Row "Row 3", pad 12, bg #1a1a1a, rad 6`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Table
    }
  ),

  testWithSetup(
    'Table with fixed width columns',
    `Table
  Header:
    Row w 100, w 200, w 80
      Text "ID", col #888
      Text "Name", col #888
      Text "Status", col #888
  Row
    Text "001", w 100
    Text "Product Name", w 200
    Text "Active", w 80`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Table
    }
  ),

  testWithSetup(
    'Table in scrollable container',
    `Frame h 200, scroll, bg #0a0a0a
  Frame gap 4
    Text "Item 1", col white, pad 8
    Text "Item 2", col white, pad 8
    Text "Item 3", col white, pad 8
    Text "Item 4", col white, pad 8
    Text "Item 5", col white, pad 8`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Inner Frame
    }
  ),
])

// =============================================================================
// Table Styling
// =============================================================================

export const tableStylingTests: TestCase[] = describe('Table Styling', [
  testWithSetup(
    'Striped rows',
    `Table
  Header: bg #333, pad 12, col white
    Row "Name", "Role", "Status"
  Row: pad 12, bg #1a1a1a
    Text "Alice", col white
    Text "Admin", col #888
    Text "Active", col #10b981
  Row: pad 12, bg #222
    Text "Bob", col white
    Text "User", col #888
    Text "Pending", col #f59e0b`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Table
    }
  ),

  testWithSetup(
    'Table with borders',
    `Table bor 1, boc #333, rad 8, clip
  Header: bg #222, pad 12, bor 0 0 1 0, boc #333
    Row "Column A", "Column B"
  Row: pad 12, bor 0 0 1 0, boc #333
    Text "Value 1", col white
    Text "Value 2", col white
  Row: pad 12
    Text "Value 3", col white
    Text "Value 4", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Table
    }
  ),

  testWithSetup(
    'Hover effect on rows',
    `Table
  Header: bg #222, pad 12
    Row "Item", "Price"
  Row: pad 12, cursor pointer
    hover:
      bg #333
    Text "Product A", col white
    Text "$10", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Table
    }
  ),
])

// =============================================================================
// Table with Actions
// =============================================================================

export const tableActionTests: TestCase[] = describe('Table with Actions', [
  testWithSetup(
    'Table row with delete button',
    `Frame gap 8, bg #0a0a0a, pad 16
  Frame hor, spread, pad 12, bg #1a1a1a, rad 6, ver-center
    Text "Item A", col white
    Button "Delete", bg #ef4444, col white, pad 6 12, rad 4, fs 12
  Frame hor, spread, pad 12, bg #1a1a1a, rad 6, ver-center
    Text "Item B", col white
    Button "Delete", bg #ef4444, col white, pad 6 12, rad 4, fs 12`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Container

      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(container !== null, 'Container should exist')
    }
  ),

  testWithSetup(
    'Table with edit and view actions',
    `Table
  Header: bg #222, pad 12
    Row "Name", "Actions"
  Row: pad 12, hor, spread, ver-center
    Text "Record 1", col white, grow
    Frame hor, gap 8
      Button "View", bg #333, col white, pad 6 12, rad 4, fs 12
      Button "Edit", bg #2271C1, col white, pad 6 12, rad 4, fs 12`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Table
    }
  ),

  testWithSetup(
    'Selectable table rows',
    `Table
  Row: pad 12, bg #1a1a1a, cursor pointer, toggle()
    selected:
      bg #2271C1
      col white
    Text "Click to select", col #888
  Row: pad 12, bg #1a1a1a, cursor pointer, toggle()
    selected:
      bg #2271C1
      col white
    Text "Another row", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Table
    }
  ),
])

// =============================================================================
// Table Filtering and Sorting
// =============================================================================

export const tableFilterTests: TestCase[] = describe('Table Filtering', [
  testWithSetup(
    'Table with where filter',
    `tasks:
  t1:
    title: "Active Task"
    done: false
  t2:
    title: "Completed Task"
    done: true
  t3:
    title: "Another Active"
    done: false

Table $tasks where row.done == false
  Row: pad 12, bg #1a1a1a
    Text row.title, col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Table
    }
  ),

  testWithSetup(
    'Table with sorting',
    `items:
  a: { name: "Zebra", priority: 3 }
  b: { name: "Apple", priority: 1 }
  c: { name: "Mango", priority: 2 }

Table $items by priority
  Row: pad 12
    Text row.name, col white
    Text row.priority, col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Table
    }
  ),

  testWithSetup(
    'Table with filter and sort',
    `products:
  p1: { name: "Widget", price: 10, inStock: true }
  p2: { name: "Gadget", price: 25, inStock: false }
  p3: { name: "Tool", price: 15, inStock: true }

Table $products where row.inStock by price
  Header:
    Row "Product", "Price"
  Row: pad 12
    Text row.name, col white
    Text "$" + row.price, col #10b981`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Table
    }
  ),
])

// =============================================================================
// Complex Table Patterns
// =============================================================================

export const complexTableTests: TestCase[] = describe('Complex Table Patterns', [
  testWithSetup(
    'Expandable table rows',
    `Table gap 4
  Row: pad 12, bg #1a1a1a, rad 6, cursor pointer, toggle()
    Frame hor, spread, ver-center
      Text "Row with details", col white
      Icon "chevron-down", ic #888, is 16
    expanded:
      Frame pad 12, bg #222, rad 0 0 6 6
        Text "Expanded content here", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Table
    }
  ),

  testWithSetup(
    'Table with status badges',
    `orders:
  o1: { id: "001", status: "shipped" }
  o2: { id: "002", status: "pending" }
  o3: { id: "003", status: "delivered" }

Table $orders
  Header: bg #222, pad 12
    Row "Order ID", "Status"
  Row: pad 12, hor, spread, ver-center
    Text "#" + row.id, col white
    Frame pad 4 8, rad 4, bg row.status == "shipped" ? #2271C1 : row.status == "delivered" ? #10b981 : #f59e0b
      Text row.status, col white, fs 12, uppercase`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Table
    }
  ),

  testWithSetup(
    'Table with inline editing',
    `editMode: false

Table
  Header: bg #222, pad 12
    Row "Field", "Value", "Action"
  Row: pad 12, hor, spread, ver-center
    Text "Name", col #888, w 100
    if editMode
      Input placeholder "Enter name...", bg #333, col white, pad 8, rad 4, grow
    else
      Text "John Doe", col white, grow
    Button editMode ? "Save" : "Edit", toggle(), bg #333, col white, pad 6 12, rad 4, fs 12`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Table
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allTableTests: TestCase[] = [
  ...staticTableTests,
  ...dataBoundTableTests,
  ...tableLayoutTests,
  ...tableStylingTests,
  ...tableActionTests,
  ...tableFilterTests,
  ...complexTableTests,
]
