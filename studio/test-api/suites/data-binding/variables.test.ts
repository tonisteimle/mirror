/**
 * Variable Interpolation — simple, nested, deep nested object access
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const variableTests: TestCase[] = describe('Variables', [
  testWithSetup(
    'Simple variable interpolation',
    `name: "Max"
count: 42

Frame gap 8, pad 16, bg #1a1a1a
  Text "Hello $name", col white
  Text "Count: $count", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-2', { textContains: 'Hello Max' })
      api.dom.expect('node-3', { textContains: 'Count: 42' })
    }
  ),

  testWithSetup(
    'Nested object access',
    `user:
  name: "Max Mustermann"
  email: "max@example.com"
  role: "Admin"

Frame gap 8, pad 16, bg #1a1a1a
  Text "$user.name", col white, weight bold
  Text "$user.email", col #888
  Text "$user.role", col #2271C1`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const nameEl = api.preview.inspect('node-2')
      api.assert.ok(
        nameEl?.fullText?.includes('Max') || nameEl?.textContent?.includes('Max'),
        'Should render user.name'
      )

      const emailEl = api.preview.inspect('node-3')
      api.assert.ok(
        emailEl?.fullText?.includes('@') || emailEl?.textContent?.includes('@'),
        'Should render user.email'
      )
    }
  ),

  testWithSetup(
    'Deep nested object access',
    `app:
  settings:
    theme:
      primary: "#2271C1"
      bg: "#1a1a1a"
    user:
      name: "Test User"

Frame bg $app.settings.theme.bg, pad 16, gap 8
  Text "$app.settings.user.name", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame !== null, 'Frame should exist')
    }
  ),
])
