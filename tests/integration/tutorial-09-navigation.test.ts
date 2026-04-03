/**
 * Tutorial Kapitel 9: Navigation - Integration Tests
 *
 * Tabs, Accordion und Collapsible sind Zag-Komponenten.
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

  describe('Accordion', () => {
    it('Accordion mit AccordionItem sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Accordion
  AccordionItem "Section 1"
    Text "Content for section 1"
  AccordionItem "Section 2"
    Text "Content for section 2"
  AccordionItem "Section 3"
    Text "Content for section 3"
      `)
      cleanup = c

      // Accordion-Triggers sollten existieren (Mirror verwendet data-slot)
      const triggers = container.querySelectorAll('[data-slot="ItemTrigger"]')
      expect(triggers.length).toBe(3)
    })

    it('Accordion sollte Text-Inhalte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Accordion
  AccordionItem "Section 1"
    Text "Content for section 1"
  AccordionItem "Section 2"
    Text "Content for section 2"
      `)
      cleanup = c

      // Verify text content is rendered
      const texts = container.querySelectorAll('span')
      const textContents = Array.from(texts).map(t => t.textContent)
      expect(textContents.some(t => t?.includes('Content for section'))).toBe(true)
    })
  })

  describe('Collapsible', () => {
    it('Collapsible mit Trigger und Content sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Collapsible
  Trigger: Button "Toggle content"
  Content: Text "Hidden content revealed."
      `)
      cleanup = c

      // Trigger sollte existieren (Mirror verwendet data-slot)
      const trigger = container.querySelector('[data-slot="Trigger"]')
      expect(trigger).not.toBeNull()
    })

    it('Collapsible sollte Button rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Collapsible
  Trigger: Button "Toggle"
  Content: Text "Hidden content revealed."
      `)
      cleanup = c

      // Check that button is rendered
      const button = container.querySelector('button')
      expect(button).not.toBeNull()
      expect(button!.textContent).toContain('Toggle')
    })
  })

  describe('FAQ Accordion', () => {
    it('gestyltes FAQ sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Accordion
  Item: bor 0 0 1 0, boc #222
  ItemTrigger: pad 16
  ItemContent: pad 0 16 16 16, col #888
  AccordionItem "What is Mirror?"
    Text "A DSL for rapid UI prototyping that compiles to DOM or React."
  AccordionItem "How do I get started?"
    Text "Install via npm and start writing components."
      `)
      cleanup = c

      // Mirror verwendet data-slot statt data-part
      const triggers = container.querySelectorAll('[data-slot="ItemTrigger"]')
      expect(triggers.length).toBe(2)
    })
  })

  describe('Settings Panel mit Collapsible', () => {
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
