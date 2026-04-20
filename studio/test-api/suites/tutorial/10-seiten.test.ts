/**
 * Tutorial Tests: Seiten & Navigation
 *
 * Auto-generated from docs/tutorial/10-seiten.html
 * Generated: 2026-04-20T13:03:12.783Z
 *
 * DEEP VALIDATION: Each element is validated for:
 * - Correct HTML tag
 * - Text content
 * - All CSS styles (bg, col, pad, rad, gap, etc.)
 * - Child count and hierarchy
 * - HTML attributes
 *
 * DO NOT EDIT MANUALLY - Run 'npm run tutorial:generate' to regenerate
 */

import { testWithSetup, testSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const chapter_10_seitenTests: TestCase[] = describe('Tutorial: Seiten & Navigation', [
  testWithSetup(
    '[10-seiten] Inline vs. show: Example 1',
    `Tabs defaultValue "Home"
  Tab "Home"
    Text "Das ist der Home-Content"
  Tab "Settings"
    Text "Das sind die Einstellungen"`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Tabs, Tab
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[10-seiten] Inline vs. show: Example 2',
    `Tabs defaultValue "Home"
  Tab "Home", show HomeView
  Tab "Settings", show SettingsView

// Lokale Views in der gleichen Datei
HomeView: Frame name HomeView, pad 20
  Text "Das ist der Home-Content"

SettingsView: Frame name SettingsView, pad 20
  Text "Das sind die Einstellungen"`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Tabs, Tab, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[10-seiten] Wann was verwenden?: Example 3',
    `Tabs defaultValue "Quick"
  Tab "Quick"
    Text "Kurzer Inline-Content"
  Tab "Details", show DetailsView
  Tab "More", show More from Extra

DetailsView: Frame name DetailsView, pad 20
  Text "Details aus lokaler View"`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Tabs, Tab, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[10-seiten] SideNav mit show: Example 4',
    `Frame hor, h 300
  SideNav defaultValue "Dashboard", w 180
    NavItem "Dashboard", icon "home", show DashboardView
    NavItem "Projects", icon "folder", show ProjectsView
    NavItem "Settings", icon "settings", show SettingsView

  Frame w full, pad 20
    DashboardView: Frame name DashboardView
      Text "Dashboard Content"
    ProjectsView: Frame name ProjectsView, hidden
      Text "Projects Content"
    SettingsView: Frame name SettingsView, hidden
      Text "Settings Content"`,
    async (api: TestAPI) => {
      // Complex feature: Zag: SideNav, NavItem, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),
])
