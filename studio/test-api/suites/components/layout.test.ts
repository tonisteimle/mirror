/**
 * Zag in Layout Tests
 *
 * Tests Zag components integrated in layout structures.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

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
