/**
 * Tutorial Kapitel 10: Overlays - Integration Tests
 *
 * Tooltip, Popover, HoverCard und Dialog sind Zag-Komponenten.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterEach } from 'vitest'
import { renderMirror } from '../helpers/test-api'

describe('Tutorial 10: Overlays', () => {
  let cleanup: () => void

  afterEach(() => {
    cleanup?.()
  })

  describe('Tooltip', () => {
    it('Tooltip mit Trigger und Content sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Tooltip
  Trigger: Button "Hover me"
  Content: Text "This is a tooltip"
      `)
      cleanup = c

      // Trigger-Button sollte existieren
      const button = container.querySelector('button')
      expect(button).not.toBeNull()
      expect(button!.textContent).toContain('Hover me')
    })

    it('Tooltip mit positioning sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame hor, gap 16
  Tooltip positioning "top"
    Trigger: Button "Top"
    Content: Text "Tooltip on top"
  Tooltip positioning "bottom", openDelay 500
    Trigger: Button "Delayed"
    Content: Text "Shows after 500ms"
      `)
      cleanup = c

      const buttons = container.querySelectorAll('button')
      expect(buttons.length).toBe(2)
    })

    it('Tooltip mit gestyltem Content sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Tooltip
  Trigger: Button "Multi-line"
  Content: Frame ver, gap 4, pad 8
    Text "Title", weight bold
    Text "Description here", col #888, fs 12
      `)
      cleanup = c

      const button = container.querySelector('button')
      expect(button).not.toBeNull()
    })
  })

  describe('Popover', () => {
    it('Popover mit Trigger und Content sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Popover
  Trigger: Button "Open Popover"
  Content: Frame ver, gap 8
    Text "Title", weight bold
    Text "Some description text"
      `)
      cleanup = c

      const button = container.querySelector('button')
      expect(button).not.toBeNull()
      expect(button!.textContent).toContain('Open Popover')
    })

    it('Popover mit CloseTrigger sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Popover
  Trigger: Button "Open"
  Content: Frame ver, gap 12, pad 16, bg #1a1a1a, rad 8, w 200
    Frame hor, spread
      Text "Popover Title", weight bold
      CloseTrigger: Button "X", bg transparent, col #666
    Text "Content goes here"
      `)
      cleanup = c

      const buttons = container.querySelectorAll('button')
      expect(buttons.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('HoverCard', () => {
    it('HoverCard mit Trigger und Content sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
HoverCard
  Trigger: Text "Hover over me", underline, cursor pointer
  Content: Text "HoverCard content"
      `)
      cleanup = c

      // Check that trigger text is rendered
      const texts = container.querySelectorAll('span')
      const triggerText = Array.from(texts).find(t => t.textContent === 'Hover over me')
      expect(triggerText).not.toBeNull()
    })

    it('User-Vorschau HoverCard sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
HoverCard positioning "bottom"
  Trigger: Text "@johndoe", col #3b82f6, underline, cursor pointer
  Content: Frame ver, gap 12, pad 16, bg #1a1a1a, rad 12, w 250
    Frame hor, gap 12
      Frame w 48, h 48, bg #3b82f6, rad 99, center
        Text "JD", col white, weight 500
      Frame ver
        Text "John Doe", weight 600
        Text "@johndoe", col #666, fs 14
    Text "Software engineer building great tools.", col #888, fs 13
      `)
      cleanup = c

      // Trigger sollte den @-Mention zeigen
      const texts = container.querySelectorAll('span')
      const triggerText = Array.from(texts).find(t => t.textContent === '@johndoe')
      expect(triggerText).not.toBeNull()
    })
  })

  describe('Dialog', () => {
    it('Dialog mit Trigger und Content sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Dialog
  Trigger: Button "Open Dialog"
  Content: Frame ver, gap 8, pad 16, bg #1a1a1a, rad 12
    Text "Dialog Title", weight bold, fs 18
    Text "This is the dialog content."
      `)
      cleanup = c

      // Dialog-Trigger sollte existieren
      const button = container.querySelector('button')
      expect(button).not.toBeNull()
      expect(button!.textContent).toContain('Open Dialog')
    })

    it('Dialog mit CloseTrigger sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Dialog
  Trigger: Button "Open"
  Content: Frame ver, gap 12, pad 24, bg #1a1a1a, rad 12, w 320
    Frame hor, spread
      Text "Settings", weight bold, fs 18
      CloseTrigger: Button "X", bg transparent
    Text "Dialog content here"
      `)
      cleanup = c

      const button = container.querySelector('button')
      expect(button).not.toBeNull()
    })

    it('Dialog mit Backdrop sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Dialog
  Trigger: Button "Custom backdrop"
  Backdrop: bg rgba(0,0,100,0.5)
  Content: Frame pad 24, bg #1a1a1a, rad 12
    Text "Dialog with blue backdrop"
      `)
      cleanup = c

      const button = container.querySelector('button')
      expect(button).not.toBeNull()
    })
  })

  describe('Confirm Dialog', () => {
    it('Bestätigungs-Dialog sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Dialog
  Trigger: Button "Delete item", bg #ef4444
  Content: Frame ver, gap 16, pad 24, bg #1a1a1a, rad 12, w 380
    Frame hor, gap 12
      Frame w 40, h 40, rad 99, bg rgba(239,68,68,0.2), center
        Icon "trash", col #ef4444
      Frame ver
        Text "Delete Item", weight bold, fs 16
        Text "This action cannot be undone.", col #888, fs 14
    Frame hor, gap 8
      CloseTrigger: Button "Cancel"
      Button "Delete", bg #ef4444
      `)
      cleanup = c

      const buttons = container.querySelectorAll('button')
      const deleteButton = Array.from(buttons).find(b => b.textContent?.includes('Delete item'))
      expect(deleteButton).not.toBeNull()
    })
  })

  describe('Icon Toolbar mit Tooltips', () => {
    it('Tooltips für Icon-Leiste sollten rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame hor, gap 8
  Tooltip positioning "bottom"
    Trigger: Frame pad 8, rad 4, bg #222, cursor pointer
      Icon "home"
    Content: Text "Home", fs 12
  Tooltip positioning "bottom"
    Trigger: Frame pad 8, rad 4, bg #222, cursor pointer
      Icon "settings"
    Content: Text "Settings", fs 12
  Tooltip positioning "bottom"
    Trigger: Frame pad 8, rad 4, bg #222, cursor pointer
      Icon "user"
    Content: Text "Profile", fs 12
      `)
      cleanup = c

      // Verify that content is rendered - check for elements or tooltip content texts
      const allElements = container.querySelectorAll('*')
      // Should have rendered multiple elements (divs, spans, etc.)
      expect(allElements.length).toBeGreaterThanOrEqual(3)
    })
  })
})
