/**
 * Compiler Verification — Event Handlers
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// 38. Event Handlers
// =============================================================================

export const eventHandlerTests: TestCase[] = describe('Event Handlers', [
  testWithSetup(
    'OnClick handler',
    `Button "Click Me", bg #2271C1, col white, pad 12 24, rad 6
  onclick:
    toast("Button clicked!")`,
    async (api: TestAPI) => {
      const btn = api.preview.findByText('Click Me')
      api.assert.ok(btn !== null, 'Button should exist')
    }
  ),

  testWithSetup(
    'OnHover handler',
    `Frame w 100, h 100, bg #333, rad 8, center
  Text "Hover", col white
  onhover:
    bg #444`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')
    }
  ),

  testWithSetup(
    'OnFocus and OnBlur',
    `Input placeholder "Focus me", bg #333, col white, pad 12, rad 6
  onfocus:
    bor 2, boc #2271C1
  onblur:
    bor 1, boc #555`,
    async (api: TestAPI) => {
      const input = api.preview.inspect('node-1')
      api.assert.ok(input !== null, 'Input should exist')
      api.assert.ok(input.tagName === 'input', 'Should be input')
    }
  ),

  testWithSetup(
    'OnChange handler',
    `selectedValue: ""

Select placeholder "Choose option"
  onchange:
    toast("Selection changed!")
  Option "Option A"
  Option "Option B"
  Option "Option C"`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Select should render')
    }
  ),

  testWithSetup(
    'Keyboard event handlers',
    `Input placeholder "Type and press Enter", bg #333, col white, pad 12, rad 6
  onenter:
    toast("Enter pressed!")
  onescape:
    clear()`,
    async (api: TestAPI) => {
      const input = api.preview.inspect('node-1')
      api.assert.ok(input !== null, 'Input should exist')
    }
  ),
])
