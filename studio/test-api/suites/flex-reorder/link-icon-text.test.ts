/**
 * Link + Icon + Text Reorder
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { findComponentPos } from './_helpers'

export const linkIconTextTests: TestCase[] = describe('Link + Icon + Text Reorder', [
  testWithSetup(
    'Move Link to middle',
    `Frame gap 8, bg #1a1a1a, pad 16
  Link "Read more", href "/article"
  Icon "arrow-right"
  Text "Continue"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-2', 'node-1', 1)

      const code = api.editor.getCode()
      const linkPos = findComponentPos(code, 'Link')
      const iconPos = findComponentPos(code, 'Icon')
      api.assert.ok(iconPos < linkPos, `Icon (${iconPos}) should be before Link (${linkPos})`)
    }
  ),

  testWithSetup(
    'Horizontal nav: move Icon to front',
    `Frame hor, gap 16, bg #1a1a1a, pad 12
  Link "Home"
  Link "About"
  Icon "search"`,
    async (api: TestAPI) => {
      await api.interact.moveElement('node-4', 'node-1', 0)

      const code = api.editor.getCode()
      const searchPos = findComponentPos(code, 'Icon')
      const homePos = code.indexOf('"Home"')
      api.assert.ok(searchPos < homePos, `Icon (${searchPos}) should be before Home (${homePos})`)
    }
  ),
])
