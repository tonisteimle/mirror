/**
 * UI Builder Level 20.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level20Tests = describe('Level 20: Profile Page', [
  // Profile header (simplified)
  testWithSetup('Build profile header with avatar', `Frame stacked`, async (api: TestAPI) => {
    // Cover
    await api.interact.dragFromPalette('Image', 'node-1', 0)
    await api.utils.delay(60)
    await api.interact.click('node-2')
    await api.utils.delay(50)
    await api.panel.property.setProperty('w', 'full')
    await api.utils.delay(60)
    await api.panel.property.setProperty('h', '200')
    await api.utils.delay(60)

    // Avatar
    await api.interact.dragFromPalette('Image', 'node-1', 1)
    await api.utils.delay(60)
    await api.interact.click('node-3')
    await api.utils.delay(50)
    await api.panel.property.setProperty('w', '100')
    await api.utils.delay(60)
    await api.panel.property.setProperty('h', '100')
    await api.utils.delay(60)
    await api.panel.property.setProperty('rad', '99')
    await api.utils.delay(60)
    await api.panel.property.setProperty('x', '24')
    await api.utils.delay(60)
    await api.panel.property.setProperty('y', '150')
    await api.utils.delay(150)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('stacked'), 'CODE: Stacked layout')
    api.assert.ok(code.includes('h 200'), 'CODE: Cover height')
    api.assert.ok(code.includes('rad 99'), 'CODE: Circular avatar')
    const analysis = analyzeCode(code)
    api.assert.ok(analysis.countElements('Image') >= 2, 'CODE: Cover + avatar')
  }),

  // Profile info (simplified)
  testWithSetup('Build profile info section', `Frame gap 16, pad 24`, async (api: TestAPI) => {
    // Name row
    await api.interact.dragFromPalette('Frame', 'node-1', 0)
    await api.utils.delay(60)
    await api.interact.click('node-2')
    await api.utils.delay(50)
    await api.panel.property.setProperty('hor', '')
    await api.utils.delay(60)
    await api.panel.property.setProperty('spread', '')
    await api.utils.delay(60)

    // Name
    await api.interact.dragFromPalette('Text', 'node-2', 0)
    await api.utils.delay(60)
    await api.interact.click('node-3')
    await api.utils.delay(50)
    await api.panel.property.setProperty('fs', '24')
    await api.utils.delay(60)
    await api.panel.property.setProperty('weight', 'bold')
    await api.utils.delay(60)

    // Edit button
    await api.interact.dragFromPalette('Button', 'node-2', 1)
    await api.utils.delay(60)

    // Bio
    await api.interact.dragFromPalette('Text', 'node-1', 1)
    await api.utils.delay(150)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('fs 24'), 'CODE: Large name')
    api.assert.ok(code.includes('weight bold'), 'CODE: Bold name')
    api.assert.ok(code.includes('spread'), 'CODE: Spread layout')
  }),
])
