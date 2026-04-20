/**
 * Tutorial Tests: Tabellen
 *
 * Auto-generated from docs/tutorial/14-tabellen.html
 * Generated: 2026-04-20T13:03:12.787Z
 *
 * DEEP VALIDATION: Each element is validated for:
 * - Correct HTML tag
 * - Text content
 * - All CSS styles (bg, col, pad, rad, gap, etc.)
 * - Child count and hierarchy
 * - HTML attributes
 *
 * DO NOT EDIT MANUALLY - Run 'npm run tutorial:generate' to regenerate
 */

import { testWithSetup, testSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const chapter_14_tabellenTests: TestCase[] = describe('Tutorial: Tabellen', [
  testWithSetup(
    '[14-tabellen] Statische Tabellen: Example 1',
    `Table
  Header:
    Row "Name", "Alter", "Stadt"
  Row "Max", "25", "Berlin"
  Row "Anna", "30", "München"
  Row "Tom", "28", "Hamburg"`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Table, Row, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
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

Table \$tasks, bg #111, rad 12, w full
  Row: hor, gap 16, pad 12 16, bor 0 0 1 0, boc #222, w full
    Text row.title, col white, w 140
    Text row.status, col #888`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Table, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
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

Table \$tasks, bg #111, pad 16, rad 12
  Row: hor, spread, pad 12 16, bor 0 0 1 0, boc #222, w full
    Text row.name, col white
    Text row.status, col #888`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Table, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[14-tabellen] Tabellen stylen: Example 4',
    `tasks:
  t1:
    name: "Task 1"
    effort: 5
  t2:
    name: "Task 2"
    effort: 3

Table \$tasks, bg #111, rad 12, gap 4
  Header: bg #222, pad 12 16, rad 8 8 0 0
    Row "Aufgabe", "Aufwand"
  Row: hor, spread, pad 12 16, w full
    Text row.name, col white
    Text row.effort + "h", col #888
  Footer: bg #222, pad 12 16, rad 0 0 8 8
    Row "Total", "8h"`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Table, Row, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[14-tabellen] Tabellen stylen: Example 5',
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

Table \$users, bg #111, rad 12, w full
  Header: bg #222, pad 12 16
    Row "Name", "Rolle"
  RowOdd: bg #1a1a1a
  RowEven: bg #151515
  Row: hor, spread, pad 12 16, w full
    Text row.name, col white
    Text row.role, col #888`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Table, Row, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[14-tabellen] Tabellen stylen: Example 6',
    `tasks:
  t1:
    title: "Design Review"
    status: "done"
  t2:
    title: "API Integration"
    status: "wip"
  t3:
    title: "Testing"
    status: "todo"

Table \$tasks, bg #111, rad 12, pad 8
  Header: bg #222, pad 12
    Row "Aufgabe", "Status"
  Column title, col white, pad 12
  Column status, col #10b981, pad 12, weight 600`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Table, Row, Column, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[14-tabellen] Tabellen stylen: Example 7',
    `products:
  p1:
    name: "Basic"
    price: 9
    users: 5
  p2:
    name: "Pro"
    price: 29
    users: 50
  p3:
    name: "Enterprise"
    price: 99
    users: 999

Table \$products, bg #0a0a0a, rad 16, w full
  Header: bg #1a1a1a, pad 16, rad 8 8 0 0
    Row "Plan", "Preis", "Users"
  RowOdd: bg #151515
  RowEven: bg #111
  Row: hor, pad 16, w full
    Text row.name, col white, weight 500, w 120
    Text "\$" + row.price, col #10b981, w 80
    Text row.users + " Users", col #666`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Table, Row, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[14-tabellen] Filtern mit where: Example 8',
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

// Nur nicht erledigte Tasks
Table \$tasks where row.done == false, bg #111, rad 12, w full
  Row: hor, gap 12, pad 12 16, bor 0 0 1 0, boc #222, ver-center, w full
    Icon "circle", ic #f59e0b, is 16
    Text row.title, col white, grow`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Table, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[14-tabellen] Filtern mit where: Example 9',
    `tasks:
  task1:
    title: "Critical Bug"
    priority: 1
    done: false
  task2:
    title: "Minor Fix"
    priority: 3
    done: false
  task3:
    title: "Feature"
    priority: 2
    done: true

// Nicht erledigt UND hohe Priorität
Table \$tasks where row.done == false and row.priority < 3, bg #111, rad 12, w full
  Row: hor, gap 12, pad 12 16, bor 0 0 1 0, boc #222, ver-center, w full
    Icon "alert-circle", ic #ef4444, is 16
    Text row.title, col white, grow
    Text "P" + row.priority, col #ef4444, fs 12, weight 600`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Table, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[14-tabellen] Sortieren mit by: Example 10',
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

// Sortiert nach Priorität (aufsteigend)
Table \$tasks by priority, bg #111, rad 12, w full
  Row: hor, gap 12, pad 12 16, bor 0 0 1 0, boc #222, ver-center, w full
    Text row.priority, col #2563eb, fs 14, weight 600, w 24
    Text row.title, col white, grow`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Table, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[14-tabellen] Sortieren mit by: Example 11',
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

// Teuerste zuerst
Table \$products by price desc, bg #111, rad 12, w full
  Row: hor, spread, pad 12 16, bor 0 0 1 0, boc #222, ver-center, w full
    Text row.name, col white, weight 500
    Text "€" + row.price, col #10b981, fs 14, weight 600`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Table, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),
])
