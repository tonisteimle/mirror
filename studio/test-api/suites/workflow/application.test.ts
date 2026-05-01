/**
 * Application Tests — data binding, each loops, counter, input bind, dialog,
 * select, table, toggle state, dashboard layout
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'

export const applicationTests: TestCase[] = describe('Application', [
  testWithSetup(
    'Tabs component renders',
    `Tabs defaultValue "home"
  Tab "Home"
    Frame pad 16, bg #1a1a1a
      Text "Home Content", col white
  Tab "Profile"
    Frame pad 16, bg #1a1a1a
      Text "Profile Content", col white`,
    async (api: TestAPI) => {
      api.assert.codeContains(/Tabs defaultValue "home"/)
      api.assert.codeContains(/Tab "Home"/)
      api.assert.codeContains(/Tab "Profile"/)
      api.dom.expect('node-1', { exists: true })
    }
  ),

  testWithSetup(
    'Data binding renders values',
    `userName: "John Doe"
userEmail: "john@example.com"

Frame gap 8, pad 16, bg #1a1a1a
  Text "$userName", col white, fs 18, weight bold
  Text "$userEmail", col #888`,
    async (api: TestAPI) => {
      api.dom.expect('node-1', {
        tag: 'div',
        gap: 8,
        pad: 16,
        bg: '#1a1a1a',
        children: 2,
      })

      api.dom.expect('node-2', {
        textContains: 'John Doe',
        fs: 18,
        weight: 'bold',
      })

      api.dom.expect('node-3', {
        textContains: 'john@example.com',
      })
    }
  ),

  testWithSetup(
    'Each loop renders list items',
    `items:
  a:
    name: "Item A"
  b:
    name: "Item B"
  c:
    name: "Item C"

Frame gap 8, pad 16, bg #1a1a1a
  each item in $items
    Frame pad 12, bg #222, rad 6
      Text item.name, col white`,
    async (api: TestAPI) => {
      api.assert.codeContains(/each item in \$items/)

      const container = api.preview.inspect('node-1')
      api.assert.ok(container !== null, 'Container should exist')
      api.assert.ok(
        container!.children.length >= 3,
        `Should render 3 items, got ${container!.children.length}`
      )
    }
  ),

  testWithSetup(
    'Counter with increment/decrement',
    `count: 0

Frame hor, gap 12, pad 16, bg #1a1a1a, ver-center
  Button "-", decrement(count), bg #333, col white, w 40, h 40, rad 6
  Text "$count", fs 24, col white, w 60, center
  Button "+", increment(count), bg #333, col white, w 40, h 40, rad 6`,
    async (api: TestAPI) => {
      api.dom.expect('node-1', {
        hor: true,
        gap: 12,
        pad: 16,
        bg: '#1a1a1a',
        children: 3,
      })

      api.dom.expect('node-2', {
        tag: 'button',
        text: '-',
        bg: '#333333',
        w: 40,
        h: 40,
        rad: 6,
      })

      api.dom.expect('node-3', {
        textContains: '0',
        fs: 24,
        w: 60,
      })

      api.dom.expect('node-4', {
        tag: 'button',
        text: '+',
        bg: '#333333',
        w: 40,
        h: 40,
        rad: 6,
      })
    }
  ),

  testWithSetup(
    'Input with bind and placeholder',
    `searchTerm: ""

Frame gap 12, pad 16, bg #1a1a1a
  Input bind searchTerm, placeholder "Search...", w full
  Text "Searching for: $searchTerm", col #888`,
    async (api: TestAPI) => {
      api.dom.expect('node-1', {
        gap: 12,
        pad: 16,
        bg: '#1a1a1a',
        children: 2,
      })

      api.dom.expect('node-2', {
        tag: 'input',
        placeholder: 'Search...',
      })
    }
  ),

  testWithSetup(
    'Dialog component structure',
    `Dialog
  Trigger: Button "Open", bg #2271C1, col white, pad 12 24, rad 6
  Backdrop: bg rgba(0,0,0,0.5)
  Content: Frame pad 24, bg #1a1a1a, rad 12, gap 16, w 400
    Text "Title", fs 18, weight bold, col white
    CloseTrigger: Button "Close", bg #333, col white`,
    async (api: TestAPI) => {
      api.assert.codeContains(/Dialog/)
      api.assert.codeContains(/Trigger:/)
      api.assert.codeContains(/Backdrop:/)
      api.assert.codeContains(/Content:/)
      api.assert.codeContains(/CloseTrigger:/)
      api.dom.expect('node-1', { exists: true })
    }
  ),

  testWithSetup(
    'Select dropdown structure',
    `Frame gap 12, pad 16, bg #1a1a1a
  Text "Choose a fruit:", col white
  Select placeholder "Select..."
    Option "Apple"
    Option "Banana"
    Option "Orange"`,
    async (api: TestAPI) => {
      api.dom.expect('node-1', {
        gap: 12,
        pad: 16,
        bg: '#1a1a1a',
        children: 2,
      })

      api.assert.codeContains(/Select placeholder "Select..."/)
      api.assert.codeContains(/Option "Apple"/)
    }
  ),

  testWithSetup(
    'Table with data',
    `users:
  u1:
    name: "Alice"
    role: "Admin"
  u2:
    name: "Bob"
    role: "User"

Table bg #1a1a1a, rad 8
  TableHeader hor, pad 12, bg #222
    Text "Name", col #888, fs 11, uppercase
    Text "Role", col #888, fs 11, uppercase
  each user in $users
    TableRow hor, pad 12
      Text user.name, col white
      Text user.role, col #888`,
    async (api: TestAPI) => {
      api.assert.codeContains(/Table bg/)
      api.assert.codeContains(/TableHeader/)
      api.assert.codeContains(/user\.name/)
      api.dom.expect('node-1', { exists: true })
    }
  ),

  testWithSetup(
    'Toggle state in code',
    `Frame gap 16, pad 24, bg #1a1a1a
  Button name MenuBtn, toggle(), bg #2271C1, col white, pad 12 24, rad 6
    Text "Menu"
    open:
      bg #1e5a9e
  Frame bg #222, pad 12, rad 8, hidden
    MenuBtn.open:
      visible
    Text "Item 1", col white`,
    async (api: TestAPI) => {
      api.assert.codeContains(/toggle\(\)/)
      api.assert.codeContains(/open:/)
      api.assert.codeContains(/MenuBtn\.open:/)
      api.assert.codeContains(/hidden/)
      api.assert.codeContains(/visible/)

      api.dom.expect('node-1', { children: 2 })
      api.dom.expect('node-2', { tag: 'button' })
    }
  ),

  testWithSetup(
    'Dashboard layout with sidebar',
    `Frame hor, h full, bg #0a0a0a
  Frame w 200, bg #1a1a1a, pad 16, gap 8
    Text "Dashboard", col white, fs 18, weight bold
    Text "Overview", col white
    Text "Settings", col #888
  Frame grow, pad 24, gap 16
    Text "Welcome", col white, fs 24, weight bold
    Frame hor, gap 16
      Frame bg #1a1a1a, pad 16, rad 8, grow
        Text "Users: 1,234", col white`,
    async (api: TestAPI) => {
      api.dom.expect('node-1', {
        hor: true,
        bg: '#0a0a0a',
        children: 2,
      })

      api.dom.expect('node-2', {
        w: 200,
        bg: '#1a1a1a',
        pad: 16,
        gap: 8,
      })

      api.dom.expect('node-3', {
        text: 'Dashboard',
        fs: 18,
        weight: 'bold',
      })
    }
  ),
])
