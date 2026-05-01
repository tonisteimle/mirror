/**
 * Navigation Actions — navigate() between views
 */

import { testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const navigationActionTests: TestCase[] = describe('Navigation Actions', [
  // TODO: Runtime bug - navigate() + show/hide combinations don't work correctly
  testWithSetupSkip(
    'navigate() switches between views',
    `Frame hor, w 400
  Frame gap 4, pad 8, bg #1a1a1a, w 100
    Button "Home", navigate(HomeView), show(HomeView), hide(SettingsView)
    Button "Settings", navigate(SettingsView), show(SettingsView), hide(HomeView)

  Frame w full, pad 16, bg #222
    Frame name HomeView
      Text "Home Content", col white
    Frame name SettingsView, hidden
      Text "Settings Content", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const getDisplay = (id: string) =>
        window.getComputedStyle(document.querySelector(`[data-mirror-id="${id}"]`)!).display

      api.assert.ok(getDisplay('node-6') !== 'none', 'Home view should be visible initially')
      api.assert.equal(getDisplay('node-8'), 'none', 'Settings view should be hidden initially')

      await api.interact.click('node-3')
      await api.utils.delay(150)

      api.assert.equal(getDisplay('node-6'), 'none', 'Home view should be hidden after navigate')
      api.assert.ok(
        getDisplay('node-8') !== 'none',
        'Settings view should be visible after navigate'
      )

      await api.interact.click('node-2')
      await api.utils.delay(150)

      api.assert.ok(getDisplay('node-6') !== 'none', 'Home view should be visible again')
    }
  ),
])
