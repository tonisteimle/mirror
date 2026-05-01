/**
 * Compiler Verification — Data Binding
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// 35. Data Binding - Input Binding
// =============================================================================

export const dataBindingTests: TestCase[] = describe('Data Binding', [
  testWithSetup(
    'Input with bind',
    `searchTerm: ""

Frame gap 8, pad 16, bg #1a1a1a, rad 8, w 300
  Input bind searchTerm, placeholder "Search...", bg #333, col white, pad 12, rad 6, w full
  Text "Searching for: $searchTerm", col #888, fs 12`,
    async (api: TestAPI) => {
      const input = api.preview.inspect('node-2')
      api.assert.ok(input !== null, 'Input should exist')
      api.assert.ok(input.tagName === 'input', 'Should be input element')
    }
  ),

  testWithSetup(
    'Computed display from variable',
    `price: 99
quantity: 1

Frame gap 12, pad 16, bg #1a1a1a, rad 8
  Frame hor, gap 8, ver-center
    Text "Price:", col #888
    Text "$price €", col white, weight bold
  Frame hor, gap 8, ver-center
    Text "Quantity:", col #888
    Frame hor, gap 8
      Button "-", pad 4 12, bg #333, col white, rad 4, decrement(quantity)
      Text "$quantity", col white, w 30, center
      Button "+", pad 4 12, bg #333, col white, rad 4, increment(quantity)`,
    async (api: TestAPI) => {
      const price = api.preview.findByText('Price:')
      const quantity = api.preview.findByText('Quantity:')

      api.assert.ok(price !== null, 'Price label should exist')
      api.assert.ok(quantity !== null, 'Quantity label should exist')
    }
  ),

  testWithSetup(
    'Nested data access',
    `user:
  profile:
    name: "John Doe"
    email: "john@example.com"
  settings:
    theme: "dark"
    notifications: true

Frame gap 8, pad 16, bg #1a1a1a, rad 8
  Text "$user.profile.name", col white, fs 18, weight bold
  Text "$user.profile.email", col #888
  Text "Theme: $user.settings.theme", col #666, fs 12`,
    async (api: TestAPI) => {
      const name = api.preview.findByText('John Doe')
      const email = api.preview.findByText('john@example.com')

      // STRICT: Text content must be found - these are data-bound values
      api.assert.ok(name !== null, `Name "John Doe" should render from $user.profile.name`)
      api.assert.ok(
        email !== null,
        `Email "john@example.com" should render from $user.profile.email`
      )
    }
  ),
])
