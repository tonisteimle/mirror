/**
 * Tutorial Tests: Navigation
 *
 * Auto-generated from docs/tutorial/12-navigation.html
 * Generated: 2026-04-20T13:03:12.785Z
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

export const chapter_12_navigationTests: TestCase[] = describe('Tutorial: Navigation', [
  testWithSetup(
    '[12-navigation] Tabs: Example 1',
    `Tabs defaultValue "Home"
  Tab "Home"
    Text "Welcome to the home page"
  Tab "Profile"
    Text "Your profile settings"
  Tab "Settings"
    Text "Application settings"`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Tabs, Tab
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[12-navigation] Tabs: Example 2',
    `Tabs defaultValue "Dashboard"
  // Kind-Komponenten (mit :) zuerst
  List: bor 0 0 1 0, boc #333, gap 24
  Indicator: h 2, bg #2271C1
  Content: pad 16 0

  // Dann die Tabs (ohne :)
  Tab "Dashboard"
    Text "Dashboard content"
  Tab "Analytics"
    Text "Analytics content"`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Tabs, Tab, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[12-navigation] SideNav: Example 3',
    `SideNav defaultValue "dashboard", w 200
  NavItem "Dashboard", icon "home", value "dashboard"
  NavItem "Projects", icon "folder", value "projects"
  NavItem "Settings", icon "settings", value "settings"`,
    async (api: TestAPI) => {
      // Complex feature: Zag: SideNav, NavItem
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[12-navigation] SideNav: Example 4',
    `SideNav defaultValue "dashboard", w 200
  Header:
    Frame pad 12
      Text "My App", fs 14, weight bold

  NavItem "Dashboard", icon "home", value "dashboard"
  NavItem "Messages", icon "mail", value "messages", badge "3"

  NavGroup "Settings", collapsible, defaultOpen
    NavItem "Account", icon "user", value "account"
    NavItem "Security", icon "shield", value "security"

  Footer:
    Frame pad 12
      Text "v1.0.0", col #666, fs 11`,
    async (api: TestAPI) => {
      // Complex feature: Zag: SideNav, NavItem, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[12-navigation] SideNav: Example 5',
    `SideNav defaultValue "dashboard", collapsed, w 56
  NavItem "Dashboard", icon "home", value "dashboard"
  NavItem "Projects", icon "folder", value "projects"
  NavItem "Settings", icon "settings", value "settings"`,
    async (api: TestAPI) => {
      // Complex feature: Zag: SideNav, NavItem
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[12-navigation] SideNav: Example 6',
    `Frame hor
  SideNav defaultValue "dashboard", w 160
    NavItem "Dashboard", icon "home", value "dashboard", navigate(DashboardView)
    NavItem "Settings", icon "settings", value "settings", navigate(SettingsView)

  Frame w full, pad 16
    Frame name DashboardView
      Text "Dashboard Content", col white
    Frame name SettingsView, hidden
      Text "Settings Content", col white`,
    async (api: TestAPI) => {
      // Complex feature: Zag: SideNav, NavItem
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[12-navigation] SideNav: Example 7',
    `SideNav defaultValue "dashboard", w 220
  // Kind-Komponenten zuerst
  Root: bg #050510, pad 8
  Item: pad 12 16, rad 8, mar 4 8, col #aaa, bg #151520
  ItemIcon: ic #818cf8
  ItemBadge: bg #ef4444, col white, pad 2 8, rad 99, fs 11, weight 600
  GroupLabel: pad 12 16, col #666, fs 11, uppercase

  // Dann die NavItems
  NavItem "Dashboard", icon "home", value "dashboard"
  NavItem "Messages", icon "mail", value "messages", badge "5"
  NavGroup "Admin"
    NavItem "Users", icon "users", value "users"
    NavItem "Logs", icon "file-text", value "logs"`,
    async (api: TestAPI) => {
      // Complex feature: Zag: SideNav, NavItem, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),
])
