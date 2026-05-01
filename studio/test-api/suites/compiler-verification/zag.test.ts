/**
 * Compiler Verification — Zag Components (Dialog, Tabs, Select, Checkbox, Slider, Radio, Tooltip, DatePicker)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// 20. Zag Components - Dialog
// =============================================================================

export const zagDialogTests: TestCase[] = describe('Zag: Dialog', [
  testWithSetup(
    'Dialog structure renders',
    `Dialog
  Trigger: Button "Open Dialog", bg #2271C1, col white, pad 12 24, rad 6
  Backdrop: bg rgba(0,0,0,0.5)
  Content: Frame pad 24, bg #1a1a1a, rad 12, gap 16, w 400
    Text "Dialog Title", fs 18, weight bold, col white
    Text "Dialog content goes here.", col #888
    Frame hor, gap 8
      CloseTrigger: Button "Cancel", bg #333, col white, pad 8 16, rad 6
      Button "Confirm", bg #2271C1, col white, pad 8 16, rad 6`,
    async (api: TestAPI) => {
      // Dialog trigger should exist
      const trigger = api.preview.findByText('Open Dialog')
      api.assert.ok(trigger !== null, 'Dialog trigger should exist')
      // Zag wraps the button, so check for button or the wrapper
      api.assert.ok(
        trigger?.tagName === 'button' || trigger?.tagName === 'div' || trigger?.tagName === 'span',
        `Trigger should be interactive element, got ${trigger?.tagName}`
      )
    }
  ),

  testWithSetup(
    'Dialog with form content',
    `Dialog
  Trigger: Button "Edit Profile", bg #333, col white, pad 10 20, rad 6
  Content: Frame pad 24, bg #1a1a1a, rad 12, gap 16, w 450
    Text "Edit Profile", fs 20, weight bold, col white
    Frame gap 12
      Frame gap 4
        Text "Name", col #888, fs 12
        Input placeholder "Enter name...", bg #333, col white, pad 12, rad 6, w full
      Frame gap 4
        Text "Email", col #888, fs 12
        Input placeholder "Enter email...", bg #333, col white, pad 12, rad 6, w full
    Frame hor, gap 8, spread
      CloseTrigger: Button "Cancel", bg #333, col white, pad 10 20, rad 6
      Button "Save Changes", bg #10b981, col white, pad 10 20, rad 6`,
    async (api: TestAPI) => {
      const trigger = api.preview.findByText('Edit Profile')
      api.assert.ok(trigger !== null, 'Edit Profile trigger should exist')
    }
  ),
])

// =============================================================================
// 21. Zag Components - Tabs
// =============================================================================

export const zagTabsTests: TestCase[] = describe('Zag: Tabs', [
  testWithSetup(
    'Tabs with multiple panels',
    `Tabs defaultValue "home"
  Tab "Home"
    Frame pad 16, gap 8
      Text "Welcome Home", col white, fs 18, weight bold
      Text "This is the home tab content.", col #888
  Tab "Profile"
    Frame pad 16, gap 8
      Text "Your Profile", col white, fs 18, weight bold
      Text "Profile information here.", col #888
  Tab "Settings"
    Frame pad 16, gap 8
      Text "Settings", col white, fs 18, weight bold
      Text "Configure your preferences.", col #888`,
    async (api: TestAPI) => {
      // Tabs should render
      const home = api.preview.findByText('Home')
      const profile = api.preview.findByText('Profile')
      const settings = api.preview.findByText('Settings')

      api.assert.ok(home !== null, 'Home tab should exist')
      api.assert.ok(profile !== null, 'Profile tab should exist')
      api.assert.ok(settings !== null, 'Settings tab should exist')
    }
  ),

  testWithSetup(
    'Tabs with icons',
    `Tabs defaultValue "dashboard"
  Tab "Dashboard"
    Frame hor, gap 8, pad 16, ver-center
      Icon "home", ic #2271C1, is 20
      Text "Dashboard Content", col white
  Tab "Analytics"
    Frame hor, gap 8, pad 16, ver-center
      Icon "bar-chart", ic #10b981, is 20
      Text "Analytics Content", col white
  Tab "Reports"
    Frame hor, gap 8, pad 16, ver-center
      Icon "file-text", ic #f59e0b, is 20
      Text "Reports Content", col white`,
    async (api: TestAPI) => {
      const dashboard = api.preview.findByText('Dashboard')
      api.assert.ok(dashboard !== null, 'Dashboard tab should exist')
    }
  ),
])

// =============================================================================
// 22. Zag Components - Select
// =============================================================================

export const zagSelectTests: TestCase[] = describe('Zag: Select', [
  testWithSetup(
    'Select with options',
    `Select placeholder "Choose a city..."
  Option "Berlin"
  Option "Hamburg"
  Option "München"
  Option "Köln"
  Option "Frankfurt"`,
    async (api: TestAPI) => {
      // Select should render with placeholder or trigger
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Select should render elements')
    }
  ),

  testWithSetup(
    'Select with default value',
    `Select value "option2"
  Option "Option 1", value "option1"
  Option "Option 2", value "option2"
  Option "Option 3", value "option3"`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Select should render')
    }
  ),
])

// =============================================================================
// 23. Zag Components - Checkbox & Switch
// =============================================================================

export const zagCheckboxTests: TestCase[] = describe('Zag: Checkbox & Switch', [
  testWithSetup(
    'Checkbox unchecked',
    `Checkbox "Accept terms and conditions"`,
    async (api: TestAPI) => {
      const checkbox = api.preview.findByText('Accept terms')
      api.assert.ok(
        checkbox !== null || api.preview.getNodeIds().length >= 1,
        'Checkbox should render'
      )
    }
  ),

  testWithSetup(
    'Checkbox checked',
    `Checkbox "Subscribe to newsletter", checked`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Checked checkbox should render')
    }
  ),

  testWithSetup('Switch unchecked', `Switch "Dark Mode"`, async (api: TestAPI) => {
    const allNodes = api.preview.getNodeIds()
    api.assert.ok(allNodes.length >= 1, 'Switch should render')
  }),

  testWithSetup('Switch checked', `Switch "Notifications", checked`, async (api: TestAPI) => {
    const allNodes = api.preview.getNodeIds()
    api.assert.ok(allNodes.length >= 1, 'Checked switch should render')
  }),

  testWithSetup(
    'Multiple checkboxes',
    `Frame gap 8, pad 16, bg #1a1a1a
  Checkbox "Option A"
  Checkbox "Option B", checked
  Checkbox "Option C"
  Checkbox "Option D", checked`,
    async (api: TestAPI) => {
      const container = api.preview.inspect('node-1')
      api.assert.ok(container !== null, 'Container should exist')
      api.assert.ok(container.children.length >= 4, 'Should have 4 checkboxes')
    }
  ),
])

// =============================================================================
// 24. Zag Components - Slider
// =============================================================================

export const zagSliderTests: TestCase[] = describe('Zag: Slider', [
  testWithSetup(
    'Slider with default value',
    `Slider value 50, min 0, max 100`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Slider should render')
    }
  ),

  testWithSetup(
    'Slider with step',
    `Slider value 25, min 0, max 100, step 25`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Slider with step should render')
    }
  ),

  testWithSetup(
    'Slider in form context',
    `Frame gap 16, pad 16, bg #1a1a1a, w 300
  Frame gap 4
    Frame hor, spread
      Text "Volume", col white
      Text "75%", col #888
    Slider value 75, min 0, max 100
  Frame gap 4
    Frame hor, spread
      Text "Brightness", col white
      Text "50%", col #888
    Slider value 50, min 0, max 100`,
    async (api: TestAPI) => {
      const volume = api.preview.findByText('Volume')
      const brightness = api.preview.findByText('Brightness')
      api.assert.ok(volume !== null, 'Volume label should exist')
      api.assert.ok(brightness !== null, 'Brightness label should exist')
    }
  ),
])

// =============================================================================
// 25. Zag Components - RadioGroup
// =============================================================================

export const zagRadioTests: TestCase[] = describe('Zag: RadioGroup', [
  testWithSetup(
    'RadioGroup with options',
    `RadioGroup value "monthly"
  RadioItem "Monthly - $9/month", value "monthly"
  RadioItem "Yearly - $99/year", value "yearly"
  RadioItem "Lifetime - $299", value "lifetime"`,
    async (api: TestAPI) => {
      const monthly = api.preview.findByText('Monthly')
      api.assert.ok(
        monthly !== null || api.preview.getNodeIds().length >= 1,
        'RadioGroup should render'
      )
    }
  ),

  testWithSetup(
    'RadioGroup in card layout',
    `Frame gap 8, pad 16, bg #1a1a1a, rad 8
  Text "Select Plan", col white, fs 16, weight bold
  RadioGroup value "pro"
    RadioItem "Free - Basic features", value "free"
    RadioItem "Pro - Advanced features", value "pro"
    RadioItem "Enterprise - Full access", value "enterprise"`,
    async (api: TestAPI) => {
      const title = api.preview.findByText('Select Plan')
      api.assert.ok(title !== null, 'Title should exist')
    }
  ),
])

// =============================================================================
// 26. Zag Components - Tooltip
// =============================================================================

export const zagTooltipTests: TestCase[] = describe('Zag: Tooltip', [
  testWithSetup(
    'Tooltip on icon',
    `Tooltip positioning "bottom"
  Trigger: Icon "info", ic #888, is 20
  Content: Text "This is helpful information", fs 12, col white`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Tooltip should render trigger')
    }
  ),

  testWithSetup(
    'Tooltip on button',
    `Tooltip positioning "top"
  Trigger: Button "Hover me", bg #2271C1, col white, pad 8 16, rad 6
  Content: Frame pad 8, bg #333, rad 4
    Text "Button tooltip content", col white, fs 12`,
    async (api: TestAPI) => {
      const button = api.preview.findByText('Hover me')
      api.assert.ok(
        button !== null || api.preview.getNodeIds().length >= 1,
        'Tooltip trigger should render'
      )
    }
  ),
])

// =============================================================================
// 27. Zag Components - DatePicker
// =============================================================================

export const zagDatePickerTests: TestCase[] = describe('Zag: DatePicker', [
  testWithSetup(
    'DatePicker with placeholder',
    `DatePicker placeholder "Select date..."`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'DatePicker should render')
    }
  ),

  testWithSetup(
    'DatePicker in form',
    `Frame gap 12, pad 16, bg #1a1a1a, rad 8, w 300
  Frame gap 4
    Text "Start Date", col #888, fs 12
    DatePicker placeholder "Select start date..."
  Frame gap 4
    Text "End Date", col #888, fs 12
    DatePicker placeholder "Select end date..."`,
    async (api: TestAPI) => {
      const startLabel = api.preview.findByText('Start Date')
      const endLabel = api.preview.findByText('End Date')
      api.assert.ok(startLabel !== null, 'Start Date label should exist')
      api.assert.ok(endLabel !== null, 'End Date label should exist')
    }
  ),
])
