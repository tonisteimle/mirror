/**
 * Tutorial Tests: Tabellen
 *
 * Tests for the new Table primitive syntax using each loops.
 * Tables are now standard primitives (Table, TableHeader, TableRow, TableFooter).
 */

import { testWithSetup, testSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const chapter_14_tabellenTests: TestCase[] = describe('Tutorial: Tabellen', [
  testWithSetup(
    '[14-tabellen] Statische Tabellen: Example 1',
    `Table bg #1a1a1a, rad 8
  TableHeader hor, gap 24, pad 12 16, bg #252525
    Text "Name", col #888, fs 11, uppercase
    Text "Alter", col #888, fs 11, uppercase
    Text "Stadt", col #888, fs 11, uppercase
  TableRow hor, gap 24, pad 12 16
    Text "Max", col white
    Text "25", col white
    Text "Berlin", col white
  TableRow hor, gap 24, pad 12 16
    Text "Anna", col white
    Text "30", col white
    Text "München", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      // Header
      api.assert.exists('node-2')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(37, 37, 37)')
    }
  ),

  testWithSetup(
    '[14-tabellen] Datengebundene Tabellen: Example 2',
    `tasks:
  task1:
    title: "Design Review"
    status: "done"
  task2:
    title: "API Integration"
    status: "progress"
  task3:
    title: "Testing"
    status: "todo"

Table bg #1a1a1a, rad 8, w full
  TableHeader hor, gap 24, pad 12 16, bg #252525
    Text "Aufgabe", col #888, fs 11, uppercase
    Text "Status", col #888, fs 11, uppercase
  each task in \$tasks
    TableRow hor, gap 24, pad 12 16, bor 0 0 1 0, boc #222
      Text task.title, col white
      Text task.status, col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      // Check table renders
      const tableEl = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(tableEl !== null, 'Table should exist')
      // Should have data rows
      const spans = tableEl!.querySelectorAll('span')
      api.assert.ok(spans.length >= 6, 'Should have multiple text elements')
    }
  ),

  testWithSetup(
    '[14-tabellen] Tabellen stylen: Example 3',
    `tasks:
  t1:
    name: "Design"
    status: "done"
  t2:
    name: "Dev"
    status: "wip"

Table bg #0a0a0a, pad 16, rad 12, gap 4, w full
  each task in \$tasks
    TableRow hor, spread, pad 12 16, bg #1a1a1a, rad 6
      Text task.name, col white
      Text task.status, col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '12px')
    }
  ),

  testWithSetup(
    '[14-tabellen] Header und Footer: Example 4',
    `tasks:
  t1:
    name: "Task 1"
    effort: 5
  t2:
    name: "Task 2"
    effort: 3

Table bg #1a1a1a, rad 12, w full
  TableHeader hor, spread, pad 12 16, bg #252525, rad 8 8 0 0
    Text "Aufgabe", col #888, fs 11, uppercase
    Text "Aufwand", col #888, fs 11, uppercase
  each task in \$tasks
    TableRow hor, spread, pad 12 16, bor 0 0 1 0, boc #222
      Text task.name, col white
      Text task.effort + "h", col #888
  TableFooter hor, spread, pad 12 16, bg #252525, rad 0 0 8 8
    Text "Total", col white, weight 500
    Text "8h", col #10b981, weight 600`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      // Header
      api.assert.exists('node-2')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(37, 37, 37)')
    }
  ),

  testWithSetup(
    '[14-tabellen] Zeilen mit Hover: Example 5',
    `users:
  u1:
    name: "Anna"
    role: "Designer"
  u2:
    name: "Max"
    role: "Developer"

Table bg #1a1a1a, rad 8, w full
  TableHeader hor, spread, pad 12 16, bg #252525
    Text "Name", col #888, fs 11, uppercase
    Text "Rolle", col #888, fs 11, uppercase
  each user in \$users
    TableRow hor, spread, pad 12 16, bor 0 0 1 0, boc #222, cursor pointer
      hover:
        bg #252525
      Text user.name, col white
      Text user.role, col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const tableEl = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(tableEl !== null, 'Table should exist')
    }
  ),

  testWithSetup(
    '[14-tabellen] Zebra-Muster: Example 6',
    `users:
  u1:
    name: "Anna"
    role: "Designer"
  u2:
    name: "Max"
    role: "Developer"
  u3:
    name: "Tom"
    role: "Manager"
  u4:
    name: "Lisa"
    role: "Designer"

OddRow: hor, spread, pad 12 16, bg #1a1a1a
EvenRow: hor, spread, pad 12 16, bg #151515

Table bg #1a1a1a, rad 8, w full
  TableHeader hor, spread, pad 12 16, bg #252525
    Text "Name", col #888, fs 11, uppercase
    Text "Rolle", col #888, fs 11, uppercase
  each user in \$users
    TableRow hor, spread, pad 12 16
      Text user.name, col white
      Text user.role, col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const tableEl = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(tableEl !== null, 'Table should exist')
      // Should have 4 data rows
      const spans = tableEl!.querySelectorAll('span')
      api.assert.ok(spans.length >= 8, 'Should have user data rendered')
    }
  ),

  testWithSetup(
    '[14-tabellen] Filtern mit where: Example 7',
    `tasks:
  task1:
    title: "Design Review"
    done: true
  task2:
    title: "API Integration"
    done: false
  task3:
    title: "Testing"
    done: false
  task4:
    title: "Documentation"
    done: true

Table bg #1a1a1a, rad 8, w full
  TableHeader hor, pad 12 16, bg #252525
    Text "Offene Tasks", col #888, fs 11, uppercase
  each task in \$tasks where task.done == false
    TableRow hor, gap 12, pad 12 16, bor 0 0 1 0, boc #222, ver-center
      Icon "circle", ic #f59e0b, is 16
      Text task.title, col white, grow`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const tableEl = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(tableEl !== null, 'Table should exist')
      // Should only show 2 tasks (filtered)
      const text = tableEl!.textContent
      api.assert.ok(text?.includes('API Integration'), 'Should show API Integration')
      api.assert.ok(text?.includes('Testing'), 'Should show Testing')
      api.assert.ok(!text?.includes('Design Review'), 'Should NOT show Design Review (done)')
    }
  ),

  testWithSetup(
    '[14-tabellen] Filter mit and: Example 8',
    `tasks:
  task1:
    title: "Critical Bug"
    urgent: true
    done: false
  task2:
    title: "Minor Fix"
    urgent: false
    done: false
  task3:
    title: "Feature"
    urgent: true
    done: true

Table bg #1a1a1a, rad 8, w full
  TableHeader hor, pad 12 16, bg #252525
    Text "Dringende offene Tasks", col #888, fs 11, uppercase
  each task in \$tasks where task.done == false and task.urgent == true
    TableRow hor, gap 12, pad 12 16, bor 0 0 1 0, boc #222, ver-center
      Icon "alert-circle", ic #ef4444, is 16
      Text task.title, col white, grow`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const tableEl = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(tableEl !== null, 'Table should exist')
      // Should only show Critical Bug (urgent and not done)
      const text = tableEl!.textContent
      api.assert.ok(text?.includes('Critical Bug'), 'Should show Critical Bug')
      api.assert.ok(!text?.includes('Minor Fix'), 'Should NOT show Minor Fix (not urgent)')
    }
  ),

  testWithSetup(
    '[14-tabellen] Sortieren mit by: Example 9',
    `tasks:
  task1:
    title: "Low Priority"
    priority: 3
  task2:
    title: "High Priority"
    priority: 1
  task3:
    title: "Medium Priority"
    priority: 2

Table bg #1a1a1a, rad 8, w full
  TableHeader hor, pad 12 16, bg #252525
    Text "Nach Priorität sortiert", col #888, fs 11, uppercase
  each task in \$tasks by priority
    TableRow hor, gap 12, pad 12 16, bor 0 0 1 0, boc #222, ver-center
      Text task.priority, col #2563eb, fs 14, weight 600, w 24
      Text task.title, col white, grow`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const tableEl = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(tableEl !== null, 'Table should exist')
      // All items should be present
      const text = tableEl!.textContent
      api.assert.ok(text?.includes('High Priority'), 'Should show High Priority')
      api.assert.ok(text?.includes('Medium Priority'), 'Should show Medium Priority')
      api.assert.ok(text?.includes('Low Priority'), 'Should show Low Priority')
    }
  ),

  testWithSetup(
    '[14-tabellen] Sortieren desc: Example 10',
    `products:
  tshirt:
    name: "T-Shirt"
    price: 29
  hoodie:
    name: "Hoodie"
    price: 59
  cap:
    name: "Cap"
    price: 19

Table bg #1a1a1a, rad 8, w full
  TableHeader hor, spread, pad 12 16, bg #252525
    Text "Produkt", col #888, fs 11, uppercase
    Text "Preis", col #888, fs 11, uppercase
  each product in \$products by price desc
    TableRow hor, spread, pad 12 16, bor 0 0 1 0, boc #222, ver-center
      Text product.name, col white, weight 500
      Text product.price + " EUR", col #10b981, fs 14, weight 600`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const tableEl = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(tableEl !== null, 'Table should exist')
      // All products should be present
      const text = tableEl!.textContent
      api.assert.ok(text?.includes('Hoodie'), 'Should show Hoodie')
      api.assert.ok(text?.includes('T-Shirt'), 'Should show T-Shirt')
      api.assert.ok(text?.includes('Cap'), 'Should show Cap')
    }
  ),

  testWithSetup(
    '[14-tabellen] Mit Aktionen: Example 11',
    `users:
  u1:
    name: "Max Mustermann"
    email: "max@example.com"
  u2:
    name: "Anna Schmidt"
    email: "anna@example.com"

Table bg #1a1a1a, rad 8, w full
  TableHeader hor, pad 12 16, bg #252525
    Text "Benutzer", col #888, fs 11, uppercase, grow
    Text "Aktionen", col #888, fs 11, uppercase, w 100
  each user in \$users
    TableRow hor, pad 12 16, bor 0 0 1 0, boc #222, ver-center
      Frame gap 2, grow
        Text user.name, col white, weight 500
        Text user.email, col #888, fs 12
      Frame hor, gap 8, w 100
        Icon "edit", ic #888, is 18, cursor pointer
        Icon "trash-2", ic #ef4444, is 18, cursor pointer`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const tableEl = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(tableEl !== null, 'Table should exist')
      // Should have user data
      const text = tableEl!.textContent
      api.assert.ok(text?.includes('Max Mustermann'), 'Should show user name')
      api.assert.ok(text?.includes('max@example.com'), 'Should show user email')
    }
  ),
])
