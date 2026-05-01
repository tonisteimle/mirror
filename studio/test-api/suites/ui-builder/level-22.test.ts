/**
 * UI Builder Level 22.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level22Tests = describe('Level 22: Social Media Feed', [
  // Post with author, content, actions
  testWithSetup(
    'Build social post with author and actions',
    `Frame gap 12, pad 16, bg #1a1a1a, rad 12`,
    async (api: TestAPI) => {
      // Author row
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(50)
      await api.panel.property.setProperty('ver-center', '')
      await api.utils.delay(50)

      // Avatar
      await api.interact.dragFromPalette('Frame', 'node-2', 0)
      await api.utils.delay(50)
      await api.interact.click('node-3')
      await api.utils.delay(40)
      await api.panel.property.setProperty('w', '40')
      await api.utils.delay(50)
      await api.panel.property.setProperty('h', '40')
      await api.utils.delay(50)
      await api.panel.property.setProperty('rad', '99')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bg', '#333')
      await api.utils.delay(50)

      // Author info
      await api.interact.dragFromPalette('Frame', 'node-2', 1)
      await api.utils.delay(50)
      await api.interact.click('node-4')
      await api.utils.delay(40)
      await api.panel.property.setProperty('gap', '2')
      await api.utils.delay(50)

      await api.interact.dragFromPalette('Text', 'node-4', 0)
      await api.utils.delay(40)
      await api.interact.dragFromPalette('Text', 'node-4', 1)
      await api.utils.delay(50)

      // Post content
      await api.interact.dragFromPalette('Text', 'node-1', 1)
      await api.utils.delay(50)

      // Action bar
      await api.interact.dragFromPalette('Frame', 'node-1', 2)
      await api.utils.delay(50)
      await api.interact.click('node-8')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '24')
      await api.utils.delay(50)

      // Like, Comment, Share icons
      await api.interact.dragFromPalette('Icon', 'node-8', 0)
      await api.utils.delay(40)
      await api.interact.dragFromPalette('Icon', 'node-8', 1)
      await api.utils.delay(40)
      await api.interact.dragFromPalette('Icon', 'node-8', 2)
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('rad 99'), 'CODE: Round avatar')
      api.assert.ok(code.includes('gap 24'), 'CODE: Action spacing')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Icon') >= 3, 'CODE: Action icons')
      api.assert.ok(analysis.countElements('Text') >= 3, 'CODE: Author + time + content')
    }
  ),

  // Comment with reply
  testWithSetup(
    'Build comment with reply button',
    `Frame gap 8, pad 12, bg #111, rad 8`,
    async (api: TestAPI) => {
      // Comment header
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '8')
      await api.utils.delay(50)

      // Mini avatar
      await api.interact.dragFromPalette('Frame', 'node-2', 0)
      await api.utils.delay(50)
      await api.interact.click('node-3')
      await api.utils.delay(40)
      await api.panel.property.setProperty('w', '24')
      await api.utils.delay(50)
      await api.panel.property.setProperty('h', '24')
      await api.utils.delay(50)
      await api.panel.property.setProperty('rad', '99')
      await api.utils.delay(50)

      // Name
      await api.interact.dragFromPalette('Text', 'node-2', 1)
      await api.utils.delay(50)
      await api.interact.click('node-4')
      await api.utils.delay(40)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(50)
      await api.panel.property.setProperty('fs', '13')
      await api.utils.delay(50)

      // Comment text
      await api.interact.dragFromPalette('Text', 'node-1', 1)
      await api.utils.delay(50)

      // Reply link
      await api.interact.dragFromPalette('Text', 'node-1', 2)
      await api.utils.delay(50)
      await api.interact.click('node-6')
      await api.utils.delay(40)
      await api.panel.property.setProperty('col', '#888')
      await api.utils.delay(50)
      await api.panel.property.setProperty('fs', '12')
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('w 24'), 'CODE: Mini avatar')
      api.assert.ok(code.includes('fs 13'), 'CODE: Small name')
      api.assert.ok(code.includes('col #888'), 'CODE: Muted reply')
    }
  ),
])
