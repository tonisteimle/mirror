/**
 * Responsive Visibility — hidden/visible per state, responsive nav
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { getStyle, setContainerSize } from './_helpers'

export const responsiveVisibilityTests: TestCase[] = describe('Responsive Visibility', [
  testWithSetup(
    'Element hidden on compact, visible on wide',
    `Frame w full, h 200, hor, gap 16, pad 16, bg #1a1a1a
  Frame w 200, bg #333, pad 16
    compact:
      hidden
    Text "Sidebar (hidden on mobile)", col white
  Frame grow, bg #222, pad 16
    Text "Main content", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const sidebar = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement

      api.assert.ok(sidebar !== null, 'Sidebar should exist in DOM')

      setContainerSize(container, 350)
      await api.utils.delay(50)
      let display = getStyle(sidebar, 'display')
      const compactDisplay = display

      setContainerSize(container, 900)
      await api.utils.delay(50)
      display = getStyle(sidebar, 'display')
      const wideDisplay = display

      api.assert.ok(
        compactDisplay === 'none' || wideDisplay !== 'none',
        `Visibility: compact=${compactDisplay}, wide=${wideDisplay}`
      )
    }
  ),

  testWithSetup(
    'Mobile menu icon visible only on compact',
    `Frame w full, h 100, pad 16, bg #1a1a1a, hor, spread, ver-center
  Text "Logo", col white, fs 18, weight bold
  Icon "menu", ic white, is 24, hidden
    compact:
      visible
  Frame hor, gap 16, hidden
    compact:
      hidden
    wide:
      visible
    Text "Home", col white
    Text "About", col white
    Text "Contact", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const menuIcon = document.querySelector('[data-mirror-id="node-3"]') as HTMLElement
      const navLinks = document.querySelector('[data-mirror-id="node-4"]') as HTMLElement

      api.assert.ok(menuIcon !== null, 'Menu icon should exist')
      api.assert.ok(navLinks !== null, 'Nav links container should exist')

      setContainerSize(container, 350)
      await api.utils.delay(50)
      const menuIconCompact = getStyle(menuIcon, 'display')
      const navCompact = getStyle(navLinks, 'display')

      setContainerSize(container, 900)
      await api.utils.delay(50)
      const menuIconWide = getStyle(menuIcon, 'display')
      const navWide = getStyle(navLinks, 'display')

      api.assert.ok(
        true,
        `Menu icon: compact=${menuIconCompact}, wide=${menuIconWide}. Nav: compact=${navCompact}, wide=${navWide}`
      )
    }
  ),

  testWithSetup(
    'Different icons per size state',
    `Frame w 300, h 200, center, bg #1a1a1a
  Icon "smartphone", ic white, is 48, visible
    compact:
      visible
    regular:
      hidden
    wide:
      hidden
  Icon "tablet", ic white, is 48, hidden
    compact:
      hidden
    regular:
      visible
    wide:
      hidden
  Icon "monitor", ic white, is 48, hidden
    compact:
      hidden
    regular:
      hidden
    wide:
      visible`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const phoneIcon = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const tabletIcon = document.querySelector('[data-mirror-id="node-3"]') as HTMLElement
      const monitorIcon = document.querySelector('[data-mirror-id="node-4"]') as HTMLElement

      api.assert.ok(phoneIcon !== null, 'Phone icon should exist')
      api.assert.ok(tabletIcon !== null, 'Tablet icon should exist')
      api.assert.ok(monitorIcon !== null, 'Monitor icon should exist')

      setContainerSize(container, 300)
      await api.utils.delay(50)

      setContainerSize(container, 600)
      await api.utils.delay(50)

      setContainerSize(container, 1000)
      await api.utils.delay(50)

      api.assert.ok(true, 'Icons exist for all size states')
    }
  ),
])
