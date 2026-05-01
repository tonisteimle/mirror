/**
 * Integration — Nested Components
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Nested Component Structures
// =============================================================================

export const nestedComponentTests: TestCase[] = describe('Nested Components', [
  testWithSetup(
    'Card with nested slot components',
    `Card: bg #1a1a1a, pad 16, rad 8, gap 8
  Title: col white, fs 18, weight bold
  Desc: col #888, fs 14
  Footer: hor, gap 8, mar 8 0 0 0

Btn as Button: pad 8 16, rad 4
PrimaryBtn as Btn: bg #2271C1, col white
GhostBtn as Btn: bg transparent, col #888, bor 1, boc #444

Card
  Title "Project Update"
  Desc "This is the latest status of the project."
  Footer
    GhostBtn "Cancel"
    PrimaryBtn "Save"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Card

      // Card styling
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasStyle('node-1', 'gap', '8px')

      // DOM structure
      const card = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(card !== null, 'Card should exist')
      const cardText = card!.textContent || ''

      // Check all content is inside card
      api.assert.ok(
        cardText.includes('Project Update'),
        `Card must contain title, got: "${cardText.substring(0, 100)}"`
      )
      api.assert.ok(cardText.includes('This is the latest'), 'Card must contain description')
      api.assert.ok(cardText.includes('Cancel'), 'Card must contain Cancel button')
      api.assert.ok(cardText.includes('Save'), 'Card must contain Save button')

      // Find buttons and verify they are actual button elements
      const buttons = card!.querySelectorAll('button')
      api.assert.ok(buttons.length === 2, `Should have exactly 2 buttons, found ${buttons.length}`)

      // Verify button texts
      const buttonTexts = Array.from(buttons || []).map(b => b.textContent)
      api.assert.ok(buttonTexts.includes('Cancel'), 'Cancel button should exist')
      api.assert.ok(buttonTexts.includes('Save'), 'Save button should exist')
    }
  ),

  testWithSetup(
    'List with repeated item component',
    `ListItem: hor, pad 12, gap 12, bg #1a1a1a, rad 6, ver-center
  Avatar: w 40, h 40, rad 99, bg #333, center
  Content: grow, gap 2
  Action: pad 6 12, bg #2271C1, col white, rad 4, fs 12

Frame gap 8
  ListItem
    Avatar
      Text "JD", col white, fs 12
    Content
      Text "John Doe", col white, weight 500
      Text "Developer", col #888, fs 12
    Action
      Text "View"
  ListItem
    Avatar
      Text "AS", col white, fs 12
    Content
      Text "Alice Smith", col white, weight 500
      Text "Designer", col #888, fs 12
    Action
      Text "View"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame

      // Frame has gap
      api.assert.hasStyle('node-1', 'gap', '8px')

      const frame = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(frame !== null, 'Frame should exist')
      const frameText = frame!.textContent || ''

      // Should contain both people
      api.assert.ok(frameText.includes('John Doe'), 'Should have John Doe')
      api.assert.ok(frameText.includes('Alice Smith'), 'Should have Alice Smith')
      api.assert.ok(frameText.includes('Developer'), 'Should have Developer role')
      api.assert.ok(frameText.includes('Designer'), 'Should have Designer role')

      // Count list items (children of frame)
      const children = frame!.children
      api.assert.ok(
        children.length === 2,
        `Frame should have 2 children (ListItems), found ${children.length}`
      )

      // Each list item should have horizontal layout
      // We already verified children.length === 2 above
      const firstItem = children[0] as HTMLElement
      api.assert.ok(firstItem !== null, 'First ListItem should exist')
      const style = getComputedStyle(firstItem)
      api.assert.ok(style.flexDirection === 'row', 'ListItem should be horizontal')
      api.assert.ok(style.gap === '12px', 'ListItem should have gap 12px')
    }
  ),

  testWithSetup(
    'Deeply nested layout components',
    `AppShell: hor, h 200
  Sidebar: w 160, bg #1a1a1a, pad 12, gap 8
  Main: grow, bg #0a0a0a

NavGroup: gap 4
  NavLabel: fs 11, col #666, uppercase, weight 500
  NavItems: gap 2

NavItem: pad 8 12, col #888, rad 4, cursor pointer
  hover:
    bg #222
    col white

AppShell
  Sidebar
    NavGroup
      NavLabel "Main"
      NavItems
        NavItem "Dashboard"
        NavItem "Projects"
    NavGroup
      NavLabel "Settings"
      NavItems
        NavItem "Account"
        NavItem "Team"
  Main
    Text "Content Area", col white, pad 16`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // AppShell

      // AppShell layout
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'height', '200px')

      const shell = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(shell !== null, 'AppShell should exist')
      const shellText = shell!.textContent || ''

      // Verify content exists
      api.assert.ok(shellText.includes('Main'), 'Should have Main label')
      api.assert.ok(shellText.includes('Dashboard'), 'Should have Dashboard')
      api.assert.ok(shellText.includes('Projects'), 'Should have Projects')
      api.assert.ok(shellText.includes('Settings'), 'Should have Settings label')
      api.assert.ok(shellText.includes('Account'), 'Should have Account')
      api.assert.ok(shellText.includes('Team'), 'Should have Team')
      api.assert.ok(shellText.includes('Content Area'), 'Should have main content')

      // Shell should have exactly 2 children (Sidebar and Main)
      const children = shell!.children
      api.assert.ok(
        children.length === 2,
        `AppShell should have 2 children, found ${children.length}`
      )

      // First child (Sidebar) styling
      // We already verified children.length === 2 above
      const sidebar = children[0] as HTMLElement
      api.assert.ok(sidebar !== null, 'Sidebar should exist')
      const sidebarStyle = getComputedStyle(sidebar)
      api.assert.ok(sidebarStyle.width === '160px', 'Sidebar should be 160px wide')
      api.assert.ok(
        sidebarStyle.backgroundColor === 'rgb(26, 26, 26)',
        'Sidebar should have dark background'
      )
    }
  ),

  testWithSetup(
    'Component reused at multiple levels',
    `Badge: pad 2 6, rad 4, fs 10, bg #333, col white

Card: bg #1a1a1a, pad 12, rad 6, gap 8
  Header: hor, spread, ver-center
  Body: gap 4

Card
  Header
    Text "Task", col white, weight 500
    Badge "New"
  Body
    Text "Complete the feature", col #888
    Frame hor, gap 4
      Badge "High"
      Badge "Urgent"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Card

      // Card styling
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'padding', '12px')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')
      api.assert.hasStyle('node-1', 'gap', '8px')

      const card = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(card !== null, 'Card should exist')
      const cardText = card!.textContent || ''

      // All badges exist
      api.assert.ok(cardText.includes('New'), 'Should have New badge')
      api.assert.ok(cardText.includes('High'), 'Should have High badge')
      api.assert.ok(cardText.includes('Urgent'), 'Should have Urgent badge')

      // Count elements with badge styling (bg #333 = rgb(51, 51, 51))
      const allElements = card!.querySelectorAll('*')
      let badgeCount = 0
      allElements?.forEach(el => {
        const bg = getComputedStyle(el).backgroundColor
        const fs = getComputedStyle(el).fontSize
        if (bg === 'rgb(51, 51, 51)' && fs === '10px') {
          badgeCount++
        }
      })
      api.assert.ok(
        badgeCount >= 3,
        `Should have at least 3 badge-styled elements, found ${badgeCount}`
      )
    }
  ),
])
