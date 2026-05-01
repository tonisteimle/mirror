/**
 * Integration — Data Iteration & Conditional Rendering
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Data & Iteration Integration
// =============================================================================

export const dataIterationTests: TestCase[] = describe('Data & Iteration', [
  testWithSetup(
    'Each loop renders list items',
    `items:
  a:
    name: "Alpha"
    value: 100
  b:
    name: "Beta"
    value: 200
  c:
    name: "Gamma"
    value: 300

Frame gap 8
  each item in $items
    Frame hor, spread, pad 12, bg #1a1a1a, rad 6
      Text item.name, col white
      Text item.value, col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame container

      // Container has gap
      api.assert.hasStyle('node-1', 'gap', '8px')

      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(container !== null, 'Container should exist')
      const containerText = container!.textContent || ''

      // All items rendered
      api.assert.ok(containerText.includes('Alpha'), 'Should have Alpha')
      api.assert.ok(containerText.includes('Beta'), 'Should have Beta')
      api.assert.ok(containerText.includes('Gamma'), 'Should have Gamma')
      api.assert.ok(containerText.includes('100'), 'Should have value 100')
      api.assert.ok(containerText.includes('200'), 'Should have value 200')
      api.assert.ok(containerText.includes('300'), 'Should have value 300')

      // Should have 3 list items (via each container with display:contents)
      // The each container creates itemContainers with data-each-item attribute
      const eachItems = container!.querySelectorAll('[data-each-item]')
      api.assert.ok(eachItems.length === 3, `Should have 3 each items, found ${eachItems.length}`)

      // Each item contains a Frame with horizontal layout
      // We already verified eachItems.length === 3 above
      const firstItemContainer = eachItems[0] as HTMLElement
      api.assert.ok(firstItemContainer !== null, 'First each item container should exist')
      // Find the actual Frame inside the item container
      const firstItem = firstItemContainer.querySelector(
        '[data-mirror-name="Frame"]'
      ) as HTMLElement
      api.assert.ok(firstItem !== null, 'Item should contain Frame')
      const style = getComputedStyle(firstItem)
      api.assert.ok(style.flexDirection === 'row', 'Item should be horizontal')
      api.assert.ok(style.justifyContent === 'space-between', 'Item should have spread')
      api.assert.ok(style.padding === '12px', 'Item should have 12px padding')
      api.assert.ok(style.backgroundColor === 'rgb(26, 26, 26)', 'Item should have dark bg')
      api.assert.ok(style.borderRadius === '6px', 'Item should have 6px radius')
    }
  ),

  testWithSetup(
    'Each loop with component',
    `Card: bg #1a1a1a, pad 16, rad 8, gap 4
  Title: col white, fs 16, weight 500
  Desc: col #888, fs 14

cards:
  first:
    title: "Card One"
    desc: "First description"
  second:
    title: "Card Two"
    desc: "Second description"

Frame gap 12
  each card in $cards
    Card
      Title card.title
      Desc card.desc`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(container !== null, 'Container should exist')
      const containerText = container!.textContent || ''

      // Both cards rendered with correct content
      api.assert.ok(containerText.includes('Card One'), 'Should have Card One')
      api.assert.ok(containerText.includes('Card Two'), 'Should have Card Two')
      api.assert.ok(containerText.includes('First description'), 'Should have first desc')
      api.assert.ok(containerText.includes('Second description'), 'Should have second desc')

      // Container has 2 card children (via each container with display:contents)
      const eachItems = container!.querySelectorAll('[data-each-item]')
      api.assert.ok(eachItems.length === 2, `Should have 2 cards, found ${eachItems.length}`)

      // Cards have correct styling
      // We already verified eachItems.length === 2 above
      // Find the Card component inside the first item container
      const card = eachItems[0].querySelector('[data-mirror-name="Card"]') as HTMLElement
      api.assert.ok(card !== null, 'Each item should contain Card')
      const cardStyle = getComputedStyle(card)
      api.assert.ok(cardStyle.backgroundColor === 'rgb(26, 26, 26)', 'Card should have dark bg')
      api.assert.ok(cardStyle.padding === '16px', 'Card should have 16px padding')
      api.assert.ok(cardStyle.borderRadius === '8px', 'Card should have 8px radius')
      api.assert.ok(cardStyle.gap === '4px', 'Card should have 4px gap')
    }
  ),

  testWithSetup(
    'Variable interpolation in text',
    `user:
  name: "Max Mustermann"
  role: "Admin"
  points: 1250

Frame gap 8, pad 16, bg #1a1a1a, rad 8
  Text "Willkommen, $user.name!", col white, fs 18, weight bold
  Text "Rolle: $user.role", col #888
  Text "Punkte: $user.points", col #10b981`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Container styling
      api.assert.hasStyle('node-1', 'gap', '8px')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')

      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(container !== null, 'Container should exist')
      const containerText = container!.textContent || ''

      // Variables interpolated correctly
      api.assert.ok(containerText.includes('Max Mustermann'), 'Should interpolate name')
      api.assert.ok(containerText.includes('Admin'), 'Should interpolate role')
      api.assert.ok(containerText.includes('1250'), 'Should interpolate points')

      // Text styling
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-2', 'fontSize', '18px')
      api.assert.hasStyle('node-3', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-4', 'color', 'rgb(16, 185, 129)')
    }
  ),

  testWithSetup(
    'Aggregation functions on collections',
    `tasks:
  t1:
    name: "Task 1"
    done: true
  t2:
    name: "Task 2"
    done: false
  t3:
    name: "Task 3"
    done: true

Frame gap 8, pad 16, bg #1a1a1a, rad 8
  Text "Anzahl: $tasks.count", col white
  Text "Erster: $tasks.first.name", col #888
  Text "Letzter: $tasks.last.name", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(container !== null, 'Container should exist')

      // Aggregation functions work - $tasks.count should show the number 3
      const content = container!.textContent || ''
      api.assert.ok(
        content.includes('3'),
        `Should show count '3' from $tasks.count, got: "${content.substring(0, 100)}"`
      )
      api.assert.ok(
        content.includes('Anzahl'),
        `Should show 'Anzahl' label, got: "${content.substring(0, 100)}"`
      )
      api.assert.ok(content.includes('Task 1'), 'Should show first task')
      api.assert.ok(content.includes('Task 3'), 'Should show last task')
    }
  ),
])

// =============================================================================
// Conditional Rendering Integration
// =============================================================================

export const conditionalTests: TestCase[] = describe('Conditional Rendering', [
  testWithSetup(
    'If/else block rendering',
    `loggedIn: true
user:
  name: "Max"

Frame gap 8, pad 16, bg #1a1a1a, rad 8
  if loggedIn
    Text "Willkommen, $user.name!", col white
    Button "Logout", bg #ef4444, col white, pad 8 16, rad 4
  else
    Button "Login", bg #2271C1, col white, pad 8 16, rad 4`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(container !== null, 'Container should exist')

      // Get all buttons in container
      const buttons = container?.querySelectorAll('button') || []

      // Find visible buttons (display !== 'none')
      const visibleButtons: Element[] = []
      buttons.forEach(btn => {
        if (getComputedStyle(btn).display !== 'none') {
          visibleButtons.push(btn)
        }
      })

      // loggedIn is true, so Logout should be visible, Login should be hidden
      api.assert.ok(visibleButtons.length === 1, 'Should have exactly 1 visible button')
      api.assert.ok(visibleButtons[0] !== undefined, 'Visible button should exist')
      const visibleBtnText = visibleButtons[0]!.textContent || ''
      api.assert.ok(
        visibleBtnText.includes('Logout'),
        `Visible button should be Logout, got: "${visibleBtnText}"`
      )

      // Check Welcome text is visible (parent Frame should be visible)
      const node2 = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      api.assert.ok(node2 !== null, 'node-2 should exist')
      api.assert.ok(getComputedStyle(node2).display !== 'none', 'Welcome frame should be visible')
      const node2Text = node2.textContent || ''
      api.assert.ok(node2Text.includes('Willkommen'), `Should contain welcome, got: "${node2Text}"`)
      api.assert.ok(node2Text.includes('Max'), 'Should contain user name')

      // Login button (in else branch) should be hidden when condition is true
      // Both branches exist in DOM but the else branch has display: none
      const loginButton = document.querySelector('[data-mirror-id="node-4"]') as HTMLElement
      api.assert.ok(loginButton !== null, 'Login button should exist in DOM')
      api.assert.ok(
        getComputedStyle(loginButton).display === 'none',
        'Login button (else branch) should be hidden'
      )

      // Logout button styling
      api.assert.ok(visibleButtons[0] !== null, 'Logout button should exist')
      const style = getComputedStyle(visibleButtons[0] as Element)
      api.assert.ok(style.backgroundColor === 'rgb(239, 68, 68)', 'Logout should be red')
    }
  ),

  testWithSetup(
    'Ternary in text content',
    `active: true

Frame gap 8, pad 16, bg #1a1a1a, rad 8
  Text active ? "Aktiv" : "Inaktiv", col active ? #10b981 : #ef4444
  Frame hor, gap 4, ver-center
    Frame w 8, h 8, rad 99, bg active ? #10b981 : #ef4444
    Text "Status", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(container !== null, 'Container should exist')
      const containerText = container!.textContent || ''

      // active is true, so should show "Aktiv" in green
      api.assert.ok(containerText.includes('Aktiv'), 'Should show Aktiv')
      api.assert.ok(!containerText.includes('Inaktiv'), 'Should NOT show Inaktiv')

      // Text should be green (active = true)
      api.assert.hasStyle('node-2', 'color', 'rgb(16, 185, 129)')

      // Status indicator dot should be green
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(16, 185, 129)')
      api.assert.hasStyle('node-4', 'width', '8px')
      api.assert.hasStyle('node-4', 'height', '8px')
      api.assert.hasStyle('node-4', 'borderRadius', '99px')
    }
  ),

  testWithSetup(
    'Ternary in styling properties',
    `selected: true

Button "Option", pad 12 24, rad 6, cursor pointer, bg selected ? #2271C1 : #333, col selected ? white : #888, bor selected ? 0 : 1, boc #444`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button', text: 'Option' })

      // selected is true, so should have primary blue, white text, no border
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-1', 'paddingTop', '12px')
      api.assert.hasStyle('node-1', 'paddingLeft', '24px')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')
    }
  ),

  testWithSetup(
    'Numeric comparison in condition',
    `count: 5

Frame gap 8, pad 16, bg #1a1a1a, rad 8
  if count > 0
    Text "$count Einträge", col white
  else
    Text "Keine Einträge", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(container !== null, 'Container should exist')
      // Use innerText which only returns visible text (respects display:none)
      const visibleText = container!.innerText || ''

      // count > 0, so should show entries
      api.assert.ok(visibleText.includes('5'), 'Should show count')
      api.assert.ok(visibleText.includes('Einträge'), 'Should show Einträge')
      api.assert.ok(!visibleText.includes('Keine'), 'Should NOT show Keine')
    }
  ),
])
