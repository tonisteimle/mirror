/**
 * Compiler Verification — Token Resolution
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { colorsMatch } from './_helpers'

// =============================================================================
// 4. Token & Variable Resolution
// =============================================================================

export const tokenResolutionTests: TestCase[] = describe('Token Resolution', [
  testWithSetup(
    'Simple color tokens',
    `primary.bg: #2271C1
secondary.bg: #10b981
text.col: white
muted.col: #888

Frame gap 8, pad 16, bg #1a1a1a
  Button "Primary", bg $primary, col $text, pad 12 24, rad 6
  Button "Secondary", bg $secondary, col $text, pad 12 24, rad 6`,
    async (api: TestAPI) => {
      const btn1 = api.preview.inspect('node-2')
      api.assert.ok(btn1, 'btn1 should exist')
      api.assert.ok(
        colorsMatch(btn1?.styles.backgroundColor || '', '#2271C1'),
        `Primary bg should be #2271C1, got ${btn1?.styles.backgroundColor}`
      )

      const btn2 = api.preview.inspect('node-3')
      api.assert.ok(btn2, 'btn2 should exist')
      api.assert.ok(
        colorsMatch(btn2?.styles.backgroundColor || '', '#10b981'),
        `Secondary bg should be #10b981, got ${btn2?.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Spacing tokens',
    `sm.pad: 8
md.pad: 16
lg.pad: 24
sm.gap: 4
md.gap: 8
lg.gap: 16

Frame gap $lg, pad $md, bg #1a1a1a
  Frame pad $sm, bg #333
    Text "Small padding"`,
    async (api: TestAPI) => {
      const outer = api.preview.inspect('node-1')
      api.assert.ok(outer, 'outer should exist')
      api.assert.ok(
        outer?.styles.gap === '16px',
        `Outer gap should be 16px (lg), got ${outer?.styles.gap}`
      )
      api.assert.ok(
        outer?.styles.padding === '16px',
        `Outer padding should be 16px (md), got ${outer?.styles.padding}`
      )

      const inner = api.preview.inspect('node-2')
      api.assert.ok(inner, 'inner should exist')
      api.assert.ok(
        inner?.styles.padding === '8px',
        `Inner padding should be 8px (sm), got ${inner?.styles.padding}`
      )
    }
  ),

  testWithSetup(
    'Property set tokens',
    `cardstyle: bg #1a1a1a, pad 16, rad 8, gap 8
btnstyle: pad 10 20, rad 6, cursor pointer

Frame $cardstyle
  Button "Styled", $btnstyle, bg #2271C1, col white`,
    async (api: TestAPI) => {
      const frame = api.preview.inspect('node-1')
      api.assert.ok(frame, 'frame should exist')
      api.assert.ok(
        colorsMatch(frame?.styles.backgroundColor || '', '#1a1a1a'),
        `Frame bg should be #1a1a1a, got ${frame?.styles.backgroundColor}`
      )
      api.assert.ok(
        frame?.styles.padding === '16px',
        `Frame padding should be 16px, got ${frame?.styles.padding}`
      )
      api.assert.ok(
        frame?.styles.borderRadius === '8px',
        `Frame radius should be 8px, got ${frame?.styles.borderRadius}`
      )

      const btn = api.preview.inspect('node-2')
      api.assert.ok(btn, 'btn should exist')
      api.assert.ok(
        btn?.styles.cursor === 'pointer',
        `Button cursor should be pointer, got ${btn?.styles.cursor}`
      )
    }
  ),

  testWithSetup(
    'Variable interpolation in text',
    `name: "World"
count: 42

Frame gap 8, pad 16, bg #1a1a1a
  Text "Hello $name!", col white
  Text "Count: $count items", col #888`,
    async (api: TestAPI) => {
      api.assert.hasText('node-2', 'Hello World!')
      api.assert.hasText('node-3', 'Count: 42 items')
    }
  ),

  testWithSetup(
    'Nested object access',
    `user:
  name: "Max"
  email: "max@example.com"
  stats:
    posts: 123
    followers: 456

Frame gap 4, pad 16, bg #1a1a1a
  Text "$user.name", col white, weight bold
  Text "$user.email", col #888
  Text "Posts: $user.stats.posts", col #666`,
    async (api: TestAPI) => {
      const nameEl = api.preview.inspect('node-2')
      api.assert.ok(nameEl, 'nameEl should exist')
      api.assert.ok(
        nameEl?.fullText?.includes('Max') || nameEl?.textContent?.includes('Max'),
        `Name should contain "Max", got "${nameEl?.fullText}"`
      )

      const emailEl = api.preview.inspect('node-3')
      api.assert.ok(emailEl, 'emailEl should exist')
      api.assert.ok(
        emailEl?.fullText?.includes('max@example.com') || emailEl?.textContent?.includes('max@'),
        `Email should contain email, got "${emailEl?.fullText}"`
      )
    }
  ),
])
