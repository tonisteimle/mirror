/**
 * Tutorial Kapitel 9: Navigation - Integration Tests
 *
 * Tabs und SideNav sind Zag-Komponenten.
 *
 * Tutorial Set: Tabs und SideNav
 * Entfernt: Accordion, Collapsible, Steps, Pagination, TreeView
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterEach } from 'vitest'
import { renderMirror } from '../helpers/test-api'

describe('Tutorial 09: Navigation', () => {
  let cleanup: () => void

  afterEach(() => {
    cleanup?.()
  })

  describe('Tabs', () => {
    it('Tabs mit defaultValue sollten rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Tabs defaultValue "home"
  Tab "Home" value "home"
    Text "Welcome to the home page"
  Tab "Profile" value "profile"
    Text "Your profile settings"
  Tab "Settings" value "settings"
    Text "Application settings"
      `)
      cleanup = c

      // Tabs-Container sollte existieren
      const tabList = container.querySelector('[role="tablist"]')
      expect(tabList).not.toBeNull()

      // Tab-Buttons sollten existieren
      const tabs = container.querySelectorAll('[role="tab"]')
      expect(tabs.length).toBe(3)
    })

    it('vertikale Tabs sollten funktionieren', async () => {
      const { container, cleanup: c } = await renderMirror(`
Tabs orientation "vertical", defaultValue "general"
  Tab "General" value "general"
    Text "Allgemeine Einstellungen"
  Tab "Account" value "account"
    Text "Account verwalten"
      `)
      cleanup = c

      const tabs = container.querySelectorAll('[role="tab"]')
      expect(tabs.length).toBe(2)
    })
  })

  describe('SideNav', () => {
    it('SideNav mit NavItems sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
SideNav defaultValue "home"
  NavItem "Home" icon "home" value "home"
  NavItem "Profile" icon "user" value "profile"
  NavItem "Settings" icon "settings" value "settings"
      `)
      cleanup = c

      // SideNav sollte existieren
      const sidenav = container.querySelector('[data-zag-component="sidenav"]')
      expect(sidenav).not.toBeNull()
    })
  })

  describe('Settings Panel', () => {
    it('Settings Panel sollte Text-Inhalte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame ver, w 350, pad 16, bg #111, rad 8, gap 12
  Text "Settings", weight bold, fs 18
  Frame gap 8
    Button "General Section"
    Text "Dark mode setting"
  Frame gap 8
    Button "Advanced Section"
    Text "Advanced settings here", col #666
      `)
      cleanup = c

      // Verify text content
      const texts = container.querySelectorAll('span')
      const textContents = Array.from(texts).map(t => t.textContent)

      const buttons = container.querySelectorAll('button')
      const buttonTexts = Array.from(buttons).map(b => b.textContent)

      expect(textContents).toContain('Settings')
      expect(buttonTexts.some(t => t?.includes('General'))).toBe(true)
      expect(buttonTexts.some(t => t?.includes('Advanced'))).toBe(true)
    })
  })
})
