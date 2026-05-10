/**
 * Preview CDP — smoke: `__mirrorActions` is wired and ready.
 *
 * Sanity check that the suite-test runtime sees the helper layer. Runs
 * before any drag/click test so a missing `cdpInput` bridge fails here
 * instead of inside a real test.
 */

import { testWithSetup, describe } from '../../../test-runner'
import type { TestCase, TestAPI } from '../../../types'
import { requireActions } from '../_shared/actions'
import { FIXTURES } from '../_shared/fixtures'

export const smokeTests: TestCase[] = describe('preview-cdp.smoke', [
  testWithSetup('preview-cdp helper layer is installed', FIXTURES.empty, async (api: TestAPI) => {
    const actions = requireActions()
    api.assert.ok(typeof actions.dropFromPalette === 'function', 'dropFromPalette exists')
    api.assert.ok(typeof actions.setProperty === 'function', 'setProperty exists')
    api.assert.ok(typeof actions.pickColor === 'function', 'pickColor exists')
    api.assert.ok(typeof actions.inlineEdit === 'function', 'inlineEdit exists')
    api.assert.ok(typeof actions.dragResize === 'function', 'dragResize exists')
    api.assert.ok(typeof actions.dragPadding === 'function', 'dragPadding exists')
    api.assert.ok(typeof actions.dragMargin === 'function', 'dragMargin exists')
    api.assert.ok(typeof actions.moveElement === 'function', 'moveElement exists')
    api.assert.ok(typeof actions.selectInPreview === 'function', 'selectInPreview exists')
    api.assert.ok(typeof actions.resolveSelector === 'function', 'resolveSelector exists')
  }),
])
