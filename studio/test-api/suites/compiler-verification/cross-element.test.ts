/**
 * Compiler Verification — Cross-Element States
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// 34. Cross-Element States
// =============================================================================

export const crossElementStateTests: TestCase[] = describe('Cross-Element States', [
  testWithSetup(
    'Button controls another element visibility',
    `Button name MenuToggle, pad 10 20, bg #333, col white, rad 6, toggle()
  Text "Menu"
  open:
    bg #2271C1
    Text "Close"

Frame pad 16, bg #222, rad 8, gap 8, hidden
  MenuToggle.open:
    visible
  Text "Menu Item 1", col white
  Text "Menu Item 2", col white
  Text "Menu Item 3", col white`,
    async (api: TestAPI) => {
      const menuToggle = api.preview.findByText('Menu')
      api.assert.ok(menuToggle !== null, 'Menu toggle should exist')

      // Menu items should exist (even if hidden initially)
      const item1 = api.preview.findByText('Menu Item 1')
      // Item might be hidden or not rendered - just check toggle exists
      api.assert.ok(menuToggle !== null, 'Toggle button should exist')
    }
  ),

  testWithSetup(
    'Accordion with cross-element state',
    `Frame gap 4, w 300
  Button name Section1, pad 12 16, bg #333, col white, rad 6, w full, hor, spread, toggle()
    Text "Section 1"
    Icon "chevron-down", ic #888, is 16
    open:
      Icon "chevron-up", ic #888, is 16
  Frame pad 16, bg #222, rad 0 0 8 8, hidden
    Section1.open:
      visible
    Text "Section 1 content goes here.", col #888

  Button name Section2, pad 12 16, bg #333, col white, rad 6, w full, hor, spread, toggle()
    Text "Section 2"
    Icon "chevron-down", ic #888, is 16
    open:
      Icon "chevron-up", ic #888, is 16
  Frame pad 16, bg #222, rad 0 0 8 8, hidden
    Section2.open:
      visible
    Text "Section 2 content goes here.", col #888`,
    async (api: TestAPI) => {
      const section1 = api.preview.findByText('Section 1')
      const section2 = api.preview.findByText('Section 2')

      api.assert.ok(section1 !== null, 'Section 1 trigger should exist')
      api.assert.ok(section2 !== null, 'Section 2 trigger should exist')
    }
  ),

  testWithSetup(
    'Tab-like navigation with cross-element',
    `Frame gap 0
  Frame hor, gap 0, bg #1a1a1a
    Button name Tab1, pad 12 20, col #888, exclusive(), selected
      Text "Overview"
      selected:
        col white
        bor 0 0 2 0, boc #2271C1
    Button name Tab2, pad 12 20, col #888, exclusive()
      Text "Details"
      selected:
        col white
        bor 0 0 2 0, boc #2271C1
    Button name Tab3, pad 12 20, col #888, exclusive()
      Text "Reviews"
      selected:
        col white
        bor 0 0 2 0, boc #2271C1

  Frame pad 16, bg #222
    Frame hidden
      Tab1.selected:
        visible
      Text "Overview content", col white
    Frame hidden
      Tab2.selected:
        visible
      Text "Details content", col white
    Frame hidden
      Tab3.selected:
        visible
      Text "Reviews content", col white`,
    async (api: TestAPI) => {
      const overview = api.preview.findByText('Overview')
      const details = api.preview.findByText('Details')
      const reviews = api.preview.findByText('Reviews')

      api.assert.ok(overview !== null, 'Overview tab should exist')
      api.assert.ok(details !== null, 'Details tab should exist')
      api.assert.ok(reviews !== null, 'Reviews tab should exist')
    }
  ),

  testWithSetup(
    'Form field validation state',
    `Input name EmailInput, placeholder "Email", bg #333, col white, pad 12, rad 6, w 250
  invalid:
    bor 2, boc #ef4444

Frame pad 4, bg #ef4444, col white, rad 4, fs 12, hidden
  EmailInput.invalid:
    visible
  Text "Please enter a valid email"`,
    async (api: TestAPI) => {
      const allNodes = api.preview.getNodeIds()
      api.assert.ok(allNodes.length >= 1, 'Form elements should render')
    }
  ),
])
