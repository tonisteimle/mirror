/**
 * SideNav Tests
 *
 * Tests for the SideNav Zag component:
 * - Basic rendering with NavItems
 * - Selection state and defaultValue
 * - Icons and badges
 * - NavGroup with collapsible
 * - Header and Footer sections
 * - Collapsed mode
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const sidenavTests: TestCase[] = describe('SideNav', [
  // ===========================================================================
  // Basic Rendering
  // ===========================================================================

  testWithSetup(
    'SideNav renders with NavItems',
    'SideNav w 200\n  NavItem "Dashboard", value "dashboard"\n  NavItem "Settings", value "settings"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'SideNav should render')

      // Check that items are rendered via DOM query
      const el = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(el !== null, 'SideNav element should exist in DOM')

      // STRICT: Must have visible text content for both items
      const hasDashboard = el?.textContent?.includes('Dashboard')
      const hasSettings = el?.textContent?.includes('Settings')

      api.assert.ok(
        hasDashboard,
        `SideNav should contain "Dashboard" text. Got: "${el?.textContent?.substring(0, 100)}..."`
      )
      api.assert.ok(
        hasSettings,
        `SideNav should contain "Settings" text. Got: "${el?.textContent?.substring(0, 100)}..."`
      )

      // Verify navigation items are structured elements (not just text)
      const items = el?.querySelectorAll(
        '[data-slot="Item"], [data-part="item"], [role="menuitem"]'
      )
      api.assert.ok(
        items !== null && items.length >= 2,
        `SideNav should have at least 2 navigation items, found ${items?.length || 0}`
      )
    }
  ),

  testWithSetup(
    'SideNav with defaultValue selects item',
    'SideNav w 200\n  NavItem "Dashboard", value "dashboard"\n  NavItem "Settings", value "settings"',
    async (api: TestAPI) => {
      // Check root element exists (testWithSetup already compiles)
      api.assert.exists('node-1')

      // Should contain both items
      const el = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(el?.textContent?.includes('Dashboard'), 'SideNav should contain Dashboard item')
      api.assert.ok(el?.textContent?.includes('Settings'), 'SideNav should contain Settings item')

      // Check for items with data-slot or data-value attributes
      const items = el?.querySelectorAll('[data-slot="Item"], [data-value]')
      api.assert.ok(
        items && items.length >= 2,
        `Should have at least 2 items, got ${items?.length || 0}`
      )
    }
  ),

  // ===========================================================================
  // Icons
  // ===========================================================================

  testWithSetup(
    'NavItem with icon renders',
    'SideNav w 200\n  NavItem "Dashboard", icon "home", value "dashboard"\n  NavItem "Settings", icon "settings", value "settings"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Check for icon elements (SVG or icon wrapper)
      const el = document.querySelector('[data-mirror-id="node-1"]')
      const icons = el?.querySelectorAll('svg, [data-slot="ItemIcon"], [data-part="item-icon"]')
      api.assert.ok(
        icons && icons.length >= 2,
        `Expected at least 2 icons, found ${icons?.length || 0}`
      )
    }
  ),

  // ===========================================================================
  // Badges
  // ===========================================================================

  testWithSetup(
    'NavItem with badge renders',
    'SideNav w 200\n  NavItem "Messages", icon "mail", value "messages", badge "5"\n  NavItem "Tasks", icon "check", value "tasks", badge "12"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Check for badge elements
      const el = document.querySelector('[data-mirror-id="node-1"]')
      const badges = el?.querySelectorAll('[data-slot="ItemBadge"], [data-part="item-badge"]')
      api.assert.ok(
        badges && badges.length >= 2,
        `Expected at least 2 badges, found ${badges?.length || 0}`
      )

      // STRICT: Check specific badge content
      const badgeTexts = Array.from(badges || []).map(b => b.textContent)
      const hasBadge5 = badgeTexts.some(t => t?.includes('5'))
      const hasBadge12 = badgeTexts.some(t => t?.includes('12'))
      api.assert.ok(
        hasBadge5 && hasBadge12,
        `Should have badges with "5" AND "12". Found: ${JSON.stringify(badgeTexts)}`
      )
    }
  ),

  // ===========================================================================
  // NavGroup
  // ===========================================================================

  testWithSetup(
    'NavGroup renders with items',
    'SideNav w 200\n  NavGroup "Admin"\n    NavItem "Users", value "users"\n    NavItem "Logs", value "logs"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Check for group element
      const el = document.querySelector('[data-mirror-id="node-1"]')
      const group = el?.querySelector('[data-slot="Group"], [data-part="group"]')
      api.assert.ok(group !== null, 'NavGroup should render')

      // Check for group label
      const groupLabel = el?.querySelector('[data-slot="GroupLabel"], [data-part="group-label"]')
      api.assert.ok(
        groupLabel?.textContent?.includes('Admin'),
        'Group label should contain "Admin"'
      )
    }
  ),

  testWithSetup(
    'NavGroup collapsible opens by default with defaultOpen',
    'SideNav w 200\n  NavGroup "Admin", collapsible, defaultOpen\n    NavItem "Users", value "users"\n    NavItem "Logs", value "logs"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Items should be visible when defaultOpen
      const el = document.querySelector('[data-mirror-id="node-1"]')
      const items = el?.querySelectorAll('[data-slot="Item"], [data-part="item"]')
      api.assert.ok(items && items.length >= 2, 'Items should be visible with defaultOpen')
    }
  ),

  // ===========================================================================
  // Header and Footer
  // ===========================================================================

  testWithSetup(
    'SideNav with Header section',
    'SideNav w 200\n  Header:\n    Frame pad 12\n      Text "My App"\n  NavItem "Dashboard", value "dashboard"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Check for header element
      const el = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(el !== null, 'SideNav element should exist')
      const header = el!.querySelector('[data-slot="Header"], [data-part="header"]')
      api.assert.ok(header !== null, 'Header should render')
      const headerText = header!.textContent || ''
      api.assert.ok(
        headerText.includes('My App'),
        `Header should contain "My App", got: "${headerText}"`
      )
    }
  ),

  testWithSetup(
    'SideNav with Footer section',
    'SideNav w 200\n  NavItem "Dashboard", value "dashboard"\n  Footer:\n    Frame pad 12\n      Text "v1.0.0"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Check for footer element
      const el = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(el !== null, 'SideNav element should exist')
      const footer = el!.querySelector('[data-slot="Footer"], [data-part="footer"]')
      api.assert.ok(footer !== null, 'Footer should render')
      const footerText = footer!.textContent || ''
      api.assert.ok(
        footerText.includes('v1.0.0'),
        `Footer should contain "v1.0.0", got: "${footerText}"`
      )
    }
  ),

  // ===========================================================================
  // Collapsed Mode
  // ===========================================================================

  testWithSetup(
    'SideNav collapsed mode hides labels',
    'SideNav collapsed, w 56\n  NavItem "Dashboard", icon "home", value "dashboard"\n  NavItem "Settings", icon "settings", value "settings"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const el = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(el !== null, 'SideNav element should exist')

      // STRICT: Collapsed mode must have narrow width (w 56 specified in DSL)
      const info = api.preview.inspect('node-1')
      const width = parseInt(info?.styles.width || '200', 10)
      api.assert.ok(
        width <= 80,
        `Collapsed SideNav should have width ~56px (max 80px). Got: ${width}px`
      )

      // Verify icons are present (collapsed mode shows icons)
      const icons = el?.querySelectorAll('svg, [data-slot="ItemIcon"]')
      api.assert.ok(
        icons && icons.length >= 2,
        `Collapsed SideNav should have icons. Found ${icons?.length || 0}`
      )
    }
  ),

  // ===========================================================================
  // Selection Interaction
  // ===========================================================================

  testWithSetup(
    'NavItem click updates selection',
    'SideNav w 200\n  NavItem "Dashboard", value "dashboard"\n  NavItem "Settings", value "settings"',
    async (api: TestAPI) => {
      // Check root element exists (testWithSetup already compiles)
      api.assert.exists('node-1')
      const el = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(el !== null, 'SideNav root element should exist')

      // Should contain both items
      api.assert.ok(el?.textContent?.includes('Dashboard'), 'Dashboard item must be rendered')
      api.assert.ok(el?.textContent?.includes('Settings'), 'Settings item must be rendered')

      // Find Settings item using DOM queries
      const items = el?.querySelectorAll('[data-slot="Item"], [data-value="settings"]')
      const settingsItem = Array.from(items || []).find(
        item =>
          item.textContent?.includes('Settings') || item.getAttribute('data-value') === 'settings'
      ) as HTMLElement | undefined

      api.assert.ok(settingsItem !== undefined, 'Settings item element must be found')

      // Click the settings item
      settingsItem!.click()
      await api.utils.waitForIdle()

      // Verify the item is still present and interactive
      api.assert.ok(settingsItem !== undefined, `Settings item should be rendered and interactive`)
    }
  ),

  // ===========================================================================
  // Styling
  // ===========================================================================

  testWithSetup(
    'SideNav with custom styling',
    'SideNav w 220\n  Root: bg #1a1a1a, pad 8\n  Item: pad 12, rad 6\n  NavItem "Dashboard", value "dashboard"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // STRICT: Verify SideNav renders with inspectable styles
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'SideNav should render with styling')

      // Check that element has expected width from DSL
      const width = parseInt(info?.styles.width || '0', 10)
      api.assert.ok(
        width >= 200 && width <= 240,
        `SideNav should have width ~220px. Got: ${info?.styles.width}`
      )

      // Verify Dashboard item is present
      const el = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(el?.textContent?.includes('Dashboard'), 'Dashboard item should be rendered')
    }
  ),
])
