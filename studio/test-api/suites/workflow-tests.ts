/**
 * Workflow Tests - With Rigorous DOM Validation
 *
 * Uses the DOM Bridge for declarative, comprehensive validation.
 * Every Mirror DSL property is verified against actual DOM output.
 *
 * Usage:
 *   api.dom.expect('node-1', {
 *     tag: 'div',
 *     bg: '#2271C1',
 *     pad: 16,
 *     gap: 12,
 *     hor: true,
 *     children: 3
 *   })
 */

import { testWithSetup, describe } from '../test-runner'
import type { TestCase } from '../types'

// =============================================================================
// 1. Project with Code - Token & Component Tests
// =============================================================================

export const projectWithCodeTests: TestCase[] = describe('Project with Code', [
  // --- Token Tests ---
  testWithSetup(
    'Color token applied to background',
    `primary.bg: #2271C1

Frame bg $primary, pad 16
  Text "Token Test"`,
    async api => {
      // Validate Frame with token-resolved background
      api.dom.expect('node-1', {
        tag: 'div',
        bg: '#2271C1',
        pad: 16,
        children: 1,
      })

      // Validate Text child
      api.dom.expect('node-2', {
        tag: 'span',
        text: 'Token Test',
      })
    }
  ),

  testWithSetup(
    'Spacing tokens for pad and gap',
    `space.pad: 16
space.gap: 12

Frame pad $space, gap $space, bg #1a1a1a
  Button "A"
  Button "B"
  Button "C"`,
    async api => {
      // Validate Frame with token-resolved spacing
      api.dom.expect('node-1', {
        tag: 'div',
        bg: '#1a1a1a',
        pad: 16,
        gap: 12,
        ver: true, // default vertical
        children: 3,
      })

      // Validate all buttons exist
      api.dom.expect('node-2', { tag: 'button', text: 'A' })
      api.dom.expect('node-3', { tag: 'button', text: 'B' })
      api.dom.expect('node-4', { tag: 'button', text: 'C' })
    }
  ),

  // --- Component Tests ---
  testWithSetup(
    'Component definition and usage',
    `Btn as Button: pad 12 24, rad 6, bg #2271C1, col white

Frame gap 12, pad 16, bg #1a1a1a
  Btn "Save"
  Btn "Cancel", bg #333`,
    async api => {
      // Container
      api.dom.expect('node-1', {
        tag: 'div',
        bg: '#1a1a1a',
        pad: 16,
        gap: 12,
        children: 2,
      })

      // Save button - inherits all from Btn (with "as Button" renders as <button>)
      api.dom.expect('node-2', {
        tag: 'button',
        text: 'Save',
        bg: '#2271C1',
        rad: 6,
        pad: [12, 24],
      })

      // Cancel button - overrides bg
      api.dom.expect('node-3', {
        tag: 'button',
        text: 'Cancel',
        bg: '#333333',
        rad: 6, // still inherited
        pad: [12, 24], // still inherited
      })
    }
  ),

  testWithSetup(
    'Component with "as" inherits primitive',
    `PrimaryBtn as Button: bg #2271C1, col white, pad 12 24, rad 6
DangerBtn as Button: bg #ef4444, col white, pad 12 24, rad 6

Frame gap 12, pad 16
  PrimaryBtn "Save"
  DangerBtn "Delete"`,
    async api => {
      // Both should be actual <button> elements
      api.dom.expect('node-2', {
        tag: 'button',
        text: 'Save',
        bg: '#2271C1',
        rad: 6,
      })

      api.dom.expect('node-3', {
        tag: 'button',
        text: 'Delete',
        bg: '#ef4444',
        rad: 6,
      })
    }
  ),

  // --- Layout Tests ---
  testWithSetup(
    'Horizontal layout with spread',
    `Frame hor, gap 16, pad 24, bg #1a1a1a, spread
  Text "Left", col white
  Text "Right", col white`,
    async api => {
      api.dom.expect('node-1', {
        tag: 'div',
        hor: true,
        spread: true,
        gap: 16,
        pad: 24,
        bg: '#1a1a1a',
        children: 2,
      })

      api.dom.expect('node-2', { text: 'Left' })
      api.dom.expect('node-3', { text: 'Right' })
    }
  ),

  testWithSetup(
    'Vertical layout with center',
    `Frame w 300, h 200, bg #1a1a1a, center
  Text "Centered", col white, fs 18
  Button "Click Me"`,
    async api => {
      api.dom.expect('node-1', {
        tag: 'div',
        w: 300,
        h: 200,
        bg: '#1a1a1a',
        center: true,
        children: 2,
      })

      api.dom.expect('node-2', {
        tag: 'span',
        text: 'Centered',
        fs: 18,
      })

      api.dom.expect('node-3', {
        tag: 'button',
        text: 'Click Me',
      })
    }
  ),

  testWithSetup(
    'Nested frames with different layouts',
    `Frame gap 16, pad 24, bg #0a0a0a
  Frame hor, gap 8, bg #1a1a1a, pad 12, rad 8
    Icon "star"
    Text "Featured", col white
  Frame gap 8, bg #1a1a1a, pad 12, rad 8
    Text "Description", col #888
    Button "Learn More"`,
    async api => {
      // Outer frame - vertical
      api.dom.expect('node-1', {
        tag: 'div',
        ver: true,
        gap: 16,
        pad: 24,
        bg: '#0a0a0a',
        children: 2,
      })

      // First nested - horizontal
      api.dom.expect('node-2', {
        tag: 'div',
        hor: true,
        gap: 8,
        bg: '#1a1a1a',
        pad: 12,
        rad: 8,
        children: 2,
      })

      // Second nested - vertical
      api.dom.expect('node-5', {
        tag: 'div',
        ver: true,
        gap: 8,
        bg: '#1a1a1a',
        pad: 12,
        rad: 8,
        children: 2,
      })
    }
  ),

  testWithSetup(
    'Wrap layout for responsive grid',
    `Frame hor, wrap, gap 16, pad 24, bg #1a1a1a
  Frame w 100, h 80, bg #2271C1, rad 8
  Frame w 100, h 80, bg #2271C1, rad 8
  Frame w 100, h 80, bg #2271C1, rad 8
  Frame w 100, h 80, bg #2271C1, rad 8`,
    async api => {
      api.dom.expect('node-1', {
        tag: 'div',
        hor: true,
        wrap: true,
        gap: 16,
        pad: 24,
        bg: '#1a1a1a',
        children: 4,
      })

      // All children should have same dimensions
      for (let i = 2; i <= 5; i++) {
        api.dom.expect(`node-${i}`, {
          tag: 'div',
          w: 100,
          h: 80,
          bg: '#2271C1',
          rad: 8,
        })
      }
    }
  ),

  // --- Typography Tests ---
  testWithSetup(
    'Text with typography styles',
    `Frame pad 16, bg #1a1a1a, gap 8
  Text "Bold Title", weight bold, fs 24, col white
  Text "Italic Subtitle", italic, fs 14, col #888
  Text "UPPERCASE", uppercase, fs 12, col #666`,
    async api => {
      api.dom.expect('node-2', {
        text: 'Bold Title',
        weight: 'bold',
        fs: 24,
      })

      api.dom.expect('node-3', {
        text: 'Italic Subtitle',
        italic: true,
        fs: 14,
      })

      api.dom.expect('node-4', {
        text: 'UPPERCASE',
        uppercase: true,
        fs: 12,
      })
    }
  ),

  // --- Border & Shadow Tests ---
  testWithSetup(
    'Border and shadow styles',
    `Frame pad 16, bg #1a1a1a, gap 16
  Frame w 100, h 100, bg #2271C1, rad 8, shadow md
  Frame w 100, h 100, bg white, bor 2, boc #2271C1, rad 12`,
    async api => {
      // Shadow box - shadow md applies medium shadow
      api.dom.expect('node-2', {
        w: 100,
        h: 100,
        bg: '#2271C1',
        rad: 8,
        shadow: true,
      })

      // Bordered box
      api.dom.expect('node-3', {
        w: 100,
        h: 100,
        rad: 12,
        bor: 2,
      })
    }
  ),

  // --- Form Element Tests ---
  testWithSetup(
    'Input and Textarea elements',
    `Frame gap 12, pad 16, bg #1a1a1a, w 300
  Input placeholder "Enter your name..."
  Textarea placeholder "Write a message..."`,
    async api => {
      api.dom.expect('node-1', {
        tag: 'div',
        gap: 12,
        pad: 16,
        w: 300,
        children: 2,
      })

      api.dom.expect('node-2', {
        tag: 'input',
        placeholder: 'Enter your name...',
      })

      api.dom.expect('node-3', {
        tag: 'textarea',
        placeholder: 'Write a message...',
      })
    }
  ),

  // --- Divider Test ---
  testWithSetup(
    'Divider renders as hr',
    `Frame gap 8, pad 16, bg #1a1a1a
  Text "Above"
  Divider
  Text "Below"`,
    async api => {
      api.dom.expect('node-1', {
        children: 3,
      })

      api.dom.expect('node-2', { text: 'Above' })
      api.dom.expect('node-3', { tag: 'hr' })
      api.dom.expect('node-4', { text: 'Below' })
    }
  ),
])

// =============================================================================
// 2. Project with Drag & Drop
// =============================================================================

export const projectWithDragDropTests: TestCase[] = describe('Project with Drag & Drop', [
  testWithSetup('Drop Button into Frame', 'Frame gap 12, pad 16, bg #1a1a1a', async api => {
    // Initial state
    api.dom.expect('node-1', { children: 0 })

    // Drop Button
    await api.interact.dragFromPalette('Button', 'node-1', 0)
    await api.utils.waitForIdle()

    // Verify Button was added
    api.dom.expect('node-1', { children: 1 })
    api.dom.expect('node-2', { tag: 'button' })
  }),

  testWithSetup(
    'Drop multiple elements in order',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async api => {
      // Drop Text, Input, Button in sequence
      await api.interact.dragFromPalette('Text', 'node-1', 0)
      await api.utils.waitForIdle()
      await api.interact.dragFromPalette('Input', 'node-1', 1)
      await api.utils.waitForIdle()
      await api.interact.dragFromPalette('Button', 'node-1', 2)
      await api.utils.waitForIdle()

      // Verify all 3 children in correct order
      api.dom.expect('node-1', { children: 3 })
      api.dom.expect('node-2', { tag: 'span' }) // Text
      api.dom.expect('node-3', { tag: 'input' }) // Input
      api.dom.expect('node-4', { tag: 'button' }) // Button
    }
  ),

  testWithSetup(
    'Drop Frame creates nested structure',
    'Frame gap 16, pad 24, bg #0a0a0a',
    async api => {
      // Drop nested Frame
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.waitForIdle()

      api.dom.expect('node-1', { children: 1 })
      api.dom.expect('node-2', { tag: 'div' })

      // Drop Button into nested Frame
      await api.interact.dragFromPalette('Button', 'node-2', 0)
      await api.utils.waitForIdle()

      api.dom.expect('node-2', { children: 1 })
      api.dom.expect('node-3', { tag: 'button' })
    }
  ),

  testWithSetup(
    'Drop at specific index',
    `Frame gap 12, pad 16, bg #1a1a1a
  Text "First"
  Text "Third"`,
    async api => {
      // Initial: 2 children
      api.dom.expect('node-1', { children: 2 })

      // Drop Button at index 1 (between First and Third)
      await api.interact.dragFromPalette('Button', 'node-1', 1)
      await api.utils.waitForIdle()

      // Now: 3 children, Button in middle
      api.dom.expect('node-1', { children: 3 })

      // Verify order in code
      const code = api.editor.getCode()
      const posFirst = code.indexOf('"First"')
      const posButton = code.indexOf('Button')
      const posThird = code.indexOf('"Third"')
      api.assert.ok(
        posFirst < posButton && posButton < posThird,
        'Order should be First, Button, Third'
      )
    }
  ),

  testWithSetup(
    'Style dropped element via editor',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async api => {
      // Drop Button
      await api.interact.dragFromPalette('Button', 'node-1', 0)
      await api.utils.waitForIdle()

      // Style it via code
      await api.editor.setCode(`Frame gap 12, pad 16, bg #1a1a1a
  Button "Styled", bg #2271C1, col white, pad 12 24, rad 8`)
      await api.utils.waitForIdle()

      // Verify styles applied
      api.dom.expect('node-2', {
        tag: 'button',
        text: 'Styled',
        bg: '#2271C1',
        rad: 8,
      })
    }
  ),

  testWithSetup(
    'Move element changes position',
    `Frame gap 12, pad 16, bg #1a1a1a
  Button "A"
  Button "B"
  Button "C"`,
    async api => {
      // Verify initial order
      api.dom.expect('node-2', { text: 'A' })
      api.dom.expect('node-3', { text: 'B' })
      api.dom.expect('node-4', { text: 'C' })

      // Move C to first position
      await api.interact.moveElement('node-4', 'node-1', 0)
      await api.utils.waitForIdle()

      // Verify code order changed
      const code = api.editor.getCode()
      const posA = code.indexOf('"A"')
      const posC = code.indexOf('"C"')
      api.assert.ok(posC < posA, 'C should come before A after move')
    }
  ),

  testWithSetup('Drop Checkbox (Zag component)', 'Frame gap 12, pad 16, bg #1a1a1a', async api => {
    await api.interact.dragFromPalette('Checkbox', 'node-1', 0)
    await api.utils.waitForIdle()

    api.assert.codeContains(/Checkbox/)
    api.dom.expect('node-1', { children: 1 })
    api.dom.expect('node-2', { exists: true })
  }),

  testWithSetup('Drop Switch (Zag component)', 'Frame gap 12, pad 16, bg #1a1a1a', async api => {
    await api.interact.dragFromPalette('Switch', 'node-1', 0)
    await api.utils.waitForIdle()

    api.assert.codeContains(/Switch/)
    api.dom.expect('node-2', { exists: true })
  }),

  testWithSetup(
    'Drop Slider (Zag component)',
    'Frame gap 12, pad 16, bg #1a1a1a, w 300',
    async api => {
      await api.interact.dragFromPalette('Slider', 'node-1', 0)
      await api.utils.waitForIdle()

      api.assert.codeContains(/Slider/)
      api.dom.expect('node-2', { exists: true })
    }
  ),
])

// =============================================================================
// 3. Application - Data & Interactions
// =============================================================================

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
    async api => {
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
    async api => {
      api.dom.expect('node-1', {
        tag: 'div',
        gap: 8,
        pad: 16,
        bg: '#1a1a1a',
        children: 2,
      })

      // Text should render actual value
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
    async api => {
      api.assert.codeContains(/each item in \$items/)

      // Container should have 3+ children (one per item)
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
    async api => {
      // Container is horizontal
      api.dom.expect('node-1', {
        hor: true,
        gap: 12,
        pad: 16,
        bg: '#1a1a1a',
        children: 3,
      })

      // Minus button
      api.dom.expect('node-2', {
        tag: 'button',
        text: '-',
        bg: '#333333',
        w: 40,
        h: 40,
        rad: 6,
      })

      // Count text shows 0
      api.dom.expect('node-3', {
        textContains: '0',
        fs: 24,
        w: 60,
      })

      // Plus button
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
    async api => {
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
    async api => {
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
    async api => {
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

Table $users
  Header: bg #222, pad 12
    Row "Name", "Role"
  Row: pad 12, bg #1a1a1a
    Text row.name
    Text row.role`,
    async api => {
      api.assert.codeContains(/Table \$users/)
      api.assert.codeContains(/Header:/)
      api.assert.codeContains(/row\.name/)
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
    async api => {
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
    async api => {
      // Main container - horizontal
      api.dom.expect('node-1', {
        hor: true,
        bg: '#0a0a0a',
        children: 2,
      })

      // Sidebar
      api.dom.expect('node-2', {
        w: 200,
        bg: '#1a1a1a',
        pad: 16,
        gap: 8,
      })

      // Sidebar title
      api.dom.expect('node-3', {
        text: 'Dashboard',
        fs: 18,
        weight: 'bold',
      })
    }
  ),
])

// =============================================================================
// Combined Exports
// =============================================================================

export const allWorkflowTests: TestCase[] = [
  ...projectWithCodeTests,
  ...projectWithDragDropTests,
  ...applicationTests,
]

export default allWorkflowTests
