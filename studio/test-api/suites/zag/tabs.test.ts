/**
 * Tabs Tests
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const tabsTests: TestCase[] = describe('Tabs', [
  testWithSetup(
    'Tabs renders with items',
    'Tabs\n  Tab "Home"\n    Text "Home content"\n  Tab "Profile"\n    Text "Profile content"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Tabs should render')

      const tabs = api.zag.getAllTabs('node-1')
      api.assert.ok(tabs.length >= 2, `Expected at least 2 tabs, got ${tabs.length}`)
    }
  ),

  testWithSetup(
    'Tabs with default value',
    'Tabs defaultValue "profile"\n  Tab "Home", value "home"\n    Text "Home"\n  Tab "Profile", value "profile"\n    Text "Profile"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const activeTab = api.zag.getActiveTab('node-1')
      api.assert.ok(
        activeTab === 'profile' || activeTab?.includes('Profile'),
        `Expected "profile" to be active, got "${activeTab}"`
      )
    }
  ),

  testWithSetup(
    'Tabs selection interaction',
    'Tabs defaultValue "home"\n  Tab "Home", value "home"\n    Text "Home content"\n  Tab "Profile", value "profile"\n    Text "Profile content"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      let activeTab = api.zag.getActiveTab('node-1')
      api.assert.ok(
        activeTab === 'home' || activeTab?.includes('Home'),
        `Initially should have "home" active, got "${activeTab}"`
      )

      await api.zag.selectTab('node-1', 'profile')
      await api.utils.waitForIdle()

      activeTab = api.zag.getActiveTab('node-1')
      api.assert.ok(
        activeTab === 'profile' || activeTab?.includes('Profile'),
        `After selection should have "profile" active, got "${activeTab}"`
      )
    }
  ),
])
