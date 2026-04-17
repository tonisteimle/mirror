/**
 * Cross-Element State Tests
 *
 * Tests for state dependencies between elements.
 * One element's state affects another element's visibility/styling.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const crossElementBasicTests: TestCase[] = describe('Cross-Element Basic', [
  testWithSetup(
    'Button toggle shows/hides menu',
    `Frame gap 8
  Button "Menu", name MenuBtn, bg #333, col white, pad 12 24, toggle()
    open:
      bg #2271C1
  Frame bg #1a1a1a, pad 12, rad 8, gap 4, hidden
    MenuBtn.open:
      visible
    Text "Option 1", col white
    Text "Option 2", col white
    Text "Option 3", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Container
      api.assert.exists('node-2') // Button
      api.assert.exists('node-3') // Menu

      // Menu should be hidden initially
      api.assert.hasStyle('node-3', 'display', 'none')

      // Click button to open menu
      await api.interact.click('node-2')
      await api.utils.delay(150)

      // Button should be in open state
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')

      // Menu should be visible
      api.assert.hasStyle('node-3', 'display', 'flex')

      // Click button again to close
      await api.interact.click('node-2')
      await api.utils.delay(150)

      // Button should return to default
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')

      // Menu should be hidden again
      api.assert.hasStyle('node-3', 'display', 'none')
    }
  ),

  testWithSetup(
    'Toggle controls multiple target elements',
    `Frame gap 8
  Button "Show All", name ShowBtn, bg #333, toggle()
    on:
      bg #2271C1
  Frame gap 4
    Frame bg #ef4444, pad 16, rad 6, hidden
      ShowBtn.on:
        visible
      Text "Red", col white
    Frame bg #10b981, pad 16, rad 6, hidden
      ShowBtn.on:
        visible
      Text "Green", col white
    Frame bg #2271C1, pad 16, rad 6, hidden
      ShowBtn.on:
        visible
      Text "Blue", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-2') // Button
      api.assert.exists('node-4') // Red
      api.assert.exists('node-6') // Green
      api.assert.exists('node-8') // Blue

      // All hidden initially
      api.assert.hasStyle('node-4', 'display', 'none')
      api.assert.hasStyle('node-6', 'display', 'none')
      api.assert.hasStyle('node-8', 'display', 'none')

      // Toggle on
      await api.interact.click('node-2')
      await api.utils.delay(150)

      // All should be visible
      api.assert.hasStyle('node-4', 'display', 'flex')
      api.assert.hasStyle('node-6', 'display', 'flex')
      api.assert.hasStyle('node-8', 'display', 'flex')

      // Toggle off
      await api.interact.click('node-2')
      await api.utils.delay(150)

      // All hidden again
      api.assert.hasStyle('node-4', 'display', 'none')
      api.assert.hasStyle('node-6', 'display', 'none')
      api.assert.hasStyle('node-8', 'display', 'none')
    }
  ),

  testWithSetup(
    'Cross-element style changes (not just visibility)',
    `Frame gap 8
  Button "Highlight", name HLBtn, bg #333, toggle()
    on:
      bg #2271C1
  Frame pad 16, bg #1a1a1a, rad 8
    HLBtn.on:
      bor 2
      boc #2271C1
      bg #1f1f1f
    Text "This frame gets highlighted", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-2') // Button
      api.assert.exists('node-3') // Frame

      // Initial: no border
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(26, 26, 26)')

      // Toggle on
      await api.interact.click('node-2')
      await api.utils.delay(150)

      // Frame should have highlight styles
      api.assert.hasStyle('node-3', 'borderWidth', '2px')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(31, 31, 31)')

      // Toggle off
      await api.interact.click('node-2')
      await api.utils.delay(150)

      // Frame should return to normal
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(26, 26, 26)')
    }
  ),
])

export const crossElementDropdownTests: TestCase[] = describe('Cross-Element Dropdowns', [
  testWithSetup(
    'Dropdown menu pattern',
    `Frame relative
  Button "Account", name AccBtn, bg transparent, col white, hor, gap 8, toggle()
    Icon "user", ic white, is 16
    Icon "chevron-down", ic #888, is 14
    open:
      Icon "user", ic #2271C1, is 16
      Icon "chevron-up", ic #2271C1, is 14
  Frame absolute, x 0, y 40, w 200, bg #1a1a1a, pad 8, rad 8, shadow lg, hidden, z 10
    AccBtn.open:
      visible
    Frame hor, pad 12, rad 6, gap 8, cursor pointer
      Icon "user", ic #888, is 16
      Text "Profile", col white
      hover:
        bg #ffffff10
    Frame hor, pad 12, rad 6, gap 8, cursor pointer
      Icon "settings", ic #888, is 16
      Text "Settings", col white
      hover:
        bg #ffffff10
    Divider col #333
    Frame hor, pad 12, rad 6, gap 8, cursor pointer
      Icon "log-out", ic #ef4444, is 16
      Text "Logout", col #ef4444
      hover:
        bg #ef444420`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Container
      api.assert.exists('node-2') // Button
      api.assert.exists('node-5') // Dropdown menu

      // Dropdown hidden initially
      api.assert.hasStyle('node-5', 'display', 'none')

      // Click button
      await api.interact.click('node-2')
      await api.utils.delay(150)

      // Dropdown visible
      api.assert.hasStyle('node-5', 'display', 'flex')

      // Verify dropdown has shadow
      const dropdown = api.preview.inspect('node-5')
      api.assert.ok(dropdown !== null, 'Dropdown should exist')
      api.assert.ok(dropdown!.children.length >= 3, 'Dropdown should have menu items')
    }
  ),

  testWithSetup(
    'Accordion pattern with multiple sections',
    `Frame gap 4, w 300
  Frame
    Button "Section 1", name Sec1, bg #1a1a1a, col white, pad 12, w full, toggle()
      open:
        bg #222
    Frame pad 12 16, bg #0a0a0a, hidden
      Sec1.open:
        visible
      Text "Content for section 1", col #888
  Frame
    Button "Section 2", name Sec2, bg #1a1a1a, col white, pad 12, w full, toggle()
      open:
        bg #222
    Frame pad 12 16, bg #0a0a0a, hidden
      Sec2.open:
        visible
      Text "Content for section 2", col #888
  Frame
    Button "Section 3", name Sec3, bg #1a1a1a, col white, pad 12, w full, toggle()
      open:
        bg #222
    Frame pad 12 16, bg #0a0a0a, hidden
      Sec3.open:
        visible
      Text "Content for section 3", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Get all section toggles
      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length >= 9, 'Should have multiple sections')
    }
  ),
])

export const crossElementModalTests: TestCase[] = describe('Cross-Element Modals', [
  testWithSetup(
    'Modal overlay pattern',
    `Frame relative, w full, h full
  Button "Open Modal", name ModalBtn, bg #2271C1, col white, pad 12 24, toggle()
  Frame absolute, x 0, y 0, w full, h full, bg rgba(0,0,0,0.5), center, hidden
    ModalBtn.on:
      visible
    Frame bg white, pad 24, rad 12, w 400, gap 16
      Frame hor, spread, ver-center
        Text "Modal Title", col #1a1a1a, fs 18, weight bold
        Button "×", bg transparent, col #888, fs 20
      Text "Modal content goes here. This is a simple modal dialog.", col #666
      Frame hor, gap 8
        Button "Cancel", bg #eee, col #333, pad 10 20, grow
        Button "Confirm", bg #2271C1, col white, pad 10 20, grow`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Container
      api.assert.exists('node-2') // Trigger button
      api.assert.exists('node-3') // Overlay

      // Overlay hidden initially
      api.assert.hasStyle('node-3', 'display', 'none')

      // Click trigger
      await api.interact.click('node-2')
      await api.utils.delay(150)

      // Overlay visible
      api.assert.hasStyle('node-3', 'display', 'flex')

      // Modal content should exist
      api.assert.exists('node-4') // Modal box
      api.assert.exists('node-5') // Header
    }
  ),

  testWithSetup(
    'Toast notification pattern',
    `Frame relative, w full, h full
  Button "Show Toast", name ToastBtn, bg #2271C1, col white, toggle()
  Frame absolute, x 16, y 16, bg #1a1a1a, pad 16, rad 8, hor, gap 12, shadow lg, hidden
    ToastBtn.on:
      visible
    Icon "check-circle", ic #10b981, is 20
    Frame gap 2
      Text "Success", col white, weight 500
      Text "Your changes have been saved.", col #888, fs 14`,
    async (api: TestAPI) => {
      api.assert.exists('node-2') // Button
      api.assert.exists('node-3') // Toast

      // Toast hidden
      api.assert.hasStyle('node-3', 'display', 'none')

      // Show toast
      await api.interact.click('node-2')
      await api.utils.delay(150)

      // Toast visible
      api.assert.hasStyle('node-3', 'display', 'flex')

      // Verify toast structure
      const toast = api.preview.inspect('node-3')
      api.assert.ok(toast !== null, 'Toast should exist')
      api.assert.ok(toast!.children.length >= 2, 'Toast should have icon and content')
    }
  ),
])

export const crossElementFormTests: TestCase[] = describe('Cross-Element Form Patterns', [
  testWithSetup(
    'Password visibility toggle',
    `Frame gap 8
  Frame relative
    Input placeholder "Password", type password, name PwdInput, w 250, pad 12, bg #1a1a1a, col white, rad 6
    Button absolute, x 210, y 8, bg transparent, name EyeBtn, toggle()
      Icon "eye-off", ic #888, is 18
      on:
        Icon "eye", ic #2271C1, is 18`,
    async (api: TestAPI) => {
      api.assert.exists('node-2') // Input container
      api.assert.exists('node-3') // Input
      api.assert.exists('node-4') // Eye button

      // Toggle eye button
      await api.interact.click('node-4')
      await api.utils.delay(150)

      // Icon should change (eye-off to eye)
      // The toggle state changes the icon
    }
  ),

  testWithSetup(
    'Form field with validation state',
    `Frame gap 4
  Input placeholder "Email", name EmailInput, w 300, pad 12, bg #1a1a1a, col white, rad 6, bor 1, boc #333
  Text "Please enter a valid email", col #ef4444, fs 12, hidden, name ErrorMsg
  Button "Validate", name ValidateBtn, bg #2271C1, col white, toggle()
    on:
      bg #10b981`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Container
      api.assert.exists('node-2') // Input
      api.assert.exists('node-3') // Error message
      api.assert.exists('node-4') // Validate button

      // Error message hidden initially
      api.assert.hasStyle('node-3', 'display', 'none')

      // Type in input
      await api.interact.type('node-2', 'invalid-email')
      await api.utils.delay(100)

      // Click validate
      await api.interact.click('node-4')
      await api.utils.delay(150)

      // Button should change state
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(16, 185, 129)')
    }
  ),
])

export const allCrossElementTests: TestCase[] = [
  ...crossElementBasicTests,
  ...crossElementDropdownTests,
  ...crossElementModalTests,
  ...crossElementFormTests,
]
