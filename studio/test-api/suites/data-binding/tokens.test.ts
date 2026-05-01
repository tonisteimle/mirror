/**
 * Tokens (data-binding) — property-specific tokens, property sets, spacing tokens
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const tokenTests: TestCase[] = describe('Tokens', [
  testWithSetup(
    'Property-specific tokens (.bg, .col)',
    `primary.bg: #2271C1
primary.col: white
danger.bg: #ef4444

Frame gap 8, pad 16, bg #1a1a1a
  Button "Primary", bg $primary, col $primary
  Button "Danger", bg $danger, col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const primaryBtn = api.preview.inspect('node-2')
      api.assert.ok(primaryBtn !== null, 'Primary button should exist')

      const dangerBtn = api.preview.inspect('node-3')
      api.assert.ok(dangerBtn !== null, 'Danger button should exist')
    }
  ),

  testWithSetup(
    'Property set tokens',
    `cardstyle: bg #1a1a1a, pad 16, rad 8, gap 8
heading: fs 18, weight bold, col white

Frame $cardstyle
  Text "Title", $heading
  Text "Description", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      api.dom.expect('node-1', {
        bg: '#1a1a1a',
        pad: 16,
        rad: 8,
        gap: 8,
      })

      api.dom.expect('node-2', {
        fs: 18,
        weight: 'bold',
      })
    }
  ),

  testWithSetup(
    'Spacing tokens',
    `space.gap: 12
space.pad: 16

Frame gap $space, pad $space, bg #1a1a1a
  Text "Spaced content"`,
    async (api: TestAPI) => {
      api.dom.expect('node-1', {
        gap: 12,
        pad: 16,
        bg: '#1a1a1a',
      })
    }
  ),
])
