/**
 * Zag Components Test Suite
 *
 * Tests all Zag (behavior) components:
 * - Form Controls: Checkbox, Switch, RadioGroup, Slider
 * - Selection: Select
 * - Overlays: Dialog, Tooltip
 * - Navigation: Tabs
 * - Date: DatePicker
 */

import { testWithSetup, describe, type TestCase } from '../test-runner'
import type { TestAPI } from '../types'

// =============================================================================
// Checkbox Tests
// =============================================================================

export const checkboxTests: TestCase[] = describe('Checkbox', [
  testWithSetup('Checkbox renders with label', 'Checkbox "Accept terms"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    // Checkbox renders as a label with control and text
    const info = api.preview.inspect('node-1')
    api.assert.ok(info !== null, 'Checkbox should render')
  }),

  testWithSetup(
    'Checkbox with checked state',
    'Checkbox "Enabled", checked',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      // Should have checked attribute or data-state
    }
  ),

  testWithSetup(
    'Checkbox with disabled',
    'Checkbox "Disabled option", disabled',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),
])

// =============================================================================
// Switch Tests
// =============================================================================

export const switchTests: TestCase[] = describe('Switch', [
  testWithSetup('Switch renders', 'Switch "Dark mode"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info !== null, 'Switch should render')
  }),

  testWithSetup(
    'Switch with checked state',
    'Switch "Notifications", checked',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),

  testWithSetup('Switch disabled', 'Switch "Locked", disabled', async (api: TestAPI) => {
    api.assert.exists('node-1')
  }),
])

// =============================================================================
// Slider Tests
// =============================================================================

export const sliderTests: TestCase[] = describe('Slider', [
  testWithSetup('Slider renders', 'Slider value 50', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info !== null, 'Slider should render')
  }),

  testWithSetup('Slider with min/max', 'Slider min 0, max 100, value 25', async (api: TestAPI) => {
    api.assert.exists('node-1')
  }),

  testWithSetup(
    'Slider with step',
    'Slider min 0, max 100, step 10, value 50',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),

  testWithSetup('Slider disabled', 'Slider value 30, disabled', async (api: TestAPI) => {
    api.assert.exists('node-1')
  }),
])

// =============================================================================
// Select Tests
// =============================================================================

export const selectTests: TestCase[] = describe('Select', [
  testWithSetup(
    'Select renders with placeholder',
    'Select placeholder "Choose..."',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Select should render')
    }
  ),

  testWithSetup(
    'Select with options',
    'Select placeholder "City"\n  Option "Berlin"\n  Option "Hamburg"\n  Option "München"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),

  testWithSetup(
    'Select disabled',
    'Select placeholder "Locked", disabled',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),
])

// =============================================================================
// RadioGroup Tests
// =============================================================================

export const radioGroupTests: TestCase[] = describe('RadioGroup', [
  testWithSetup(
    'RadioGroup renders',
    'RadioGroup value "a"\n  RadioItem "Option A", value "a"\n  RadioItem "Option B", value "b"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'RadioGroup should render')
    }
  ),

  testWithSetup(
    'RadioGroup with default value',
    'RadioGroup value "monthly"\n  RadioItem "Monthly", value "monthly"\n  RadioItem "Yearly", value "yearly"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),
])

// =============================================================================
// Dialog Tests
// =============================================================================

export const dialogTests: TestCase[] = describe('Dialog', [
  testWithSetup(
    'Dialog renders with trigger',
    'Dialog\n  Trigger: Button "Open"\n  Content: Frame pad 24\n    Text "Dialog content"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      // Dialog trigger should be visible
    }
  ),

  testWithSetup(
    'Dialog with backdrop',
    'Dialog\n  Trigger: Button "Open"\n  Backdrop: bg rgba(0,0,0,0.5)\n  Content: Frame pad 24, bg white\n    Text "Modal"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),
])

// =============================================================================
// Tooltip Tests
// =============================================================================

export const tooltipTests: TestCase[] = describe('Tooltip', [
  testWithSetup(
    'Tooltip renders with trigger',
    'Tooltip\n  Trigger: Icon "info"\n  Content: Text "Help text"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      // Trigger should be visible, content hidden until hover
    }
  ),

  testWithSetup(
    'Tooltip with positioning',
    'Tooltip positioning "bottom"\n  Trigger: Button "Hover me"\n  Content: Text "Below"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),
])

// =============================================================================
// Tabs Tests
// =============================================================================

export const tabsTests: TestCase[] = describe('Tabs', [
  testWithSetup(
    'Tabs renders with items',
    'Tabs\n  Tab "Home"\n    Text "Home content"\n  Tab "Profile"\n    Text "Profile content"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Tabs should render')
    }
  ),

  testWithSetup(
    'Tabs with default value',
    'Tabs defaultValue "profile"\n  Tab "Home", value "home"\n    Text "Home"\n  Tab "Profile", value "profile"\n    Text "Profile"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),
])

// =============================================================================
// DatePicker Tests
// =============================================================================

export const datePickerTests: TestCase[] = describe('DatePicker', [
  testWithSetup(
    'DatePicker renders',
    'DatePicker placeholder "Select date"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'DatePicker should render')
    }
  ),

  testWithSetup(
    'DatePicker disabled',
    'DatePicker placeholder "Locked", disabled',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),
])

// =============================================================================
// Zag in Layout Tests
// =============================================================================

export const zagInLayoutTests: TestCase[] = describe('Zag in Layout', [
  testWithSetup(
    'Checkbox in Frame',
    'Frame gap 12, pad 16\n  Text "Settings"\n  Checkbox "Enable notifications"\n  Checkbox "Dark mode"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasChildren('node-1', 3)
    }
  ),

  testWithSetup(
    'Form with multiple Zag components',
    'Frame gap 16, pad 24\n  Text "Preferences", fs 18, weight bold\n  Switch "Dark mode"\n  Slider value 50, min 0, max 100\n  Select placeholder "Language"\n    Option "English"\n    Option "German"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),

  testWithSetup(
    'Dialog with form inside',
    'Dialog\n  Trigger: Button "Settings"\n  Content: Frame pad 24, gap 16\n    Text "Settings", fs 18\n    Checkbox "Option 1"\n    Checkbox "Option 2"\n    Button "Save"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allZagTests: TestCase[] = [
  ...checkboxTests,
  ...switchTests,
  ...sliderTests,
  ...selectTests,
  ...radioGroupTests,
  ...dialogTests,
  ...tooltipTests,
  ...tabsTests,
  ...datePickerTests,
  ...zagInLayoutTests,
]
