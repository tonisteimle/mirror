/**
 * Selection & Focus Behavior Integration Tests
 *
 * These tests verify actual selection and focus behavior
 * with compiled Mirror components.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterEach } from 'vitest'
import { renderMirror } from '../helpers/test-api'

describe('Selection & Focus Behavior', () => {
  let cleanup: () => void

  afterEach(() => {
    cleanup?.()
  })

  describe('Tab Selection with exclusive()', () => {
    it('should only have one active tab at a time', async () => {
      const { api, cleanup: c } = await renderMirror(`
        Tab: pad 12, bg #333, col #888
          active:
            bg #2563eb
            col white
          onclick: exclusive()

        Frame hor, gap 4
          Tab name tab1, "Overview"
          Tab name tab2, "Details"
          Tab name tab3, "Settings"
      `)
      cleanup = c

      const tab1 = api.findByName('tab1')
      const tab2 = api.findByName('tab2')
      const tab3 = api.findByName('tab3')

      // All tabs start in default
      expect(api.getState(tab1!)).toBe('default')
      expect(api.getState(tab2!)).toBe('default')
      expect(api.getState(tab3!)).toBe('default')

      // Click tab1
      api.trigger(tab1!, 'click')
      expect(api.getState(tab1!)).toBe('active')
      expect(api.getState(tab2!)).toBe('default')
      expect(api.getState(tab3!)).toBe('default')

      // Click tab3
      api.trigger(tab3!, 'click')
      expect(api.getState(tab1!)).toBe('default')
      expect(api.getState(tab2!)).toBe('default')
      expect(api.getState(tab3!)).toBe('active')

      // Click tab2
      api.trigger(tab2!, 'click')
      expect(api.getState(tab1!)).toBe('default')
      expect(api.getState(tab2!)).toBe('active')
      expect(api.getState(tab3!)).toBe('default')
    })

    it('should allow pre-selected tab via initial state', async () => {
      const { api, cleanup: c } = await renderMirror(`
        Tab: pad 12, bg #333
          active:
            bg #2563eb
          onclick: exclusive()

        Frame hor, gap 4
          Tab name tab1, "Home"
          Tab name tab2, "About", active
          Tab name tab3, "Contact"
      `)
      cleanup = c

      const tab1 = api.findByName('tab1')
      const tab2 = api.findByName('tab2')
      const tab3 = api.findByName('tab3')

      // Tab2 starts active
      expect(api.getState(tab1!)).toBe('default')
      expect(api.getState(tab2!)).toBe('active')
      expect(api.getState(tab3!)).toBe('default')
    })
  })

  describe('List Item Selection', () => {
    it('should toggle selection on individual items', async () => {
      const { api, cleanup: c } = await renderMirror(`
        ListItem: pad 12, bg #1a1a1a
          selected:
            bg #2563eb
          onclick: toggle()

        Frame ver, gap 2
          ListItem name item1, "Apple"
          ListItem name item2, "Banana"
          ListItem name item3, "Cherry"
      `)
      cleanup = c

      const item1 = api.findByName('item1')
      const item2 = api.findByName('item2')
      const item3 = api.findByName('item3')

      // Toggle item1
      api.trigger(item1!, 'click')
      expect(api.getState(item1!)).toBe('selected')

      // Toggle item2 (item1 stays selected - this is toggle, not exclusive)
      api.trigger(item2!, 'click')
      expect(api.getState(item1!)).toBe('selected')
      expect(api.getState(item2!)).toBe('selected')

      // Toggle item1 again - deselects
      api.trigger(item1!, 'click')
      expect(api.getState(item1!)).toBe('default')
      expect(api.getState(item2!)).toBe('selected')
    })

    it('should support single selection with exclusive()', async () => {
      const { api, cleanup: c } = await renderMirror(`
        ListItem: pad 12, bg #1a1a1a
          selected:
            bg #2563eb
          onclick: exclusive()

        Frame ver, gap 2
          ListItem name item1, "Option A"
          ListItem name item2, "Option B"
          ListItem name item3, "Option C"
      `)
      cleanup = c

      const item1 = api.findByName('item1')
      const item2 = api.findByName('item2')
      const item3 = api.findByName('item3')

      // Select item1
      api.trigger(item1!, 'click')
      expect(api.getState(item1!)).toBe('selected')
      expect(api.getState(item2!)).toBe('default')
      expect(api.getState(item3!)).toBe('default')

      // Select item3 - item1 deselects
      api.trigger(item3!, 'click')
      expect(api.getState(item1!)).toBe('default')
      expect(api.getState(item2!)).toBe('default')
      expect(api.getState(item3!)).toBe('selected')
    })
  })

  describe('Input Focus States', () => {
    it('should handle focus and blur states', async () => {
      const { api, container, cleanup: c } = await renderMirror(`
        MyInput: bg #1a1a1a, pad 12, bor 1 #333
          focused:
            bor 2 #2563eb
          onfocus: toggle()
          onblur: toggle()

        MyInput name email, placeholder "Email"
      `)
      cleanup = c

      const email = api.findByName('email')
      expect(email).not.toBeNull()

      // Initial state
      expect(api.getState(email!)).toBe('default')

      // Focus
      api.trigger(email!, 'focus')
      expect(api.getState(email!)).toBe('focused')

      // Blur
      api.trigger(email!, 'blur')
      expect(api.getState(email!)).toBe('default')
    })
  })

  describe('Accordion Behavior', () => {
    it('should expand and collapse sections', async () => {
      const { api, cleanup: c } = await renderMirror(`
        AccordionItem: bg #1a1a1a, rad 8
          expanded:
            bg #252525
          onclick: toggle()

        Frame ver, gap 4
          AccordionItem name section1, "Section 1"
          AccordionItem name section2, "Section 2"
          AccordionItem name section3, "Section 3"
      `)
      cleanup = c

      const section1 = api.findByName('section1')
      const section2 = api.findByName('section2')

      // All collapsed initially
      expect(api.getState(section1!)).toBe('default')
      expect(api.getState(section2!)).toBe('default')

      // Expand section1
      api.trigger(section1!, 'click')
      expect(api.getState(section1!)).toBe('expanded')

      // Expand section2 (section1 stays expanded - accordion with toggle)
      api.trigger(section2!, 'click')
      expect(api.getState(section1!)).toBe('expanded')
      expect(api.getState(section2!)).toBe('expanded')

      // Collapse section1
      api.trigger(section1!, 'click')
      expect(api.getState(section1!)).toBe('default')
      expect(api.getState(section2!)).toBe('expanded')
    })

    it('should support single-open accordion with exclusive()', async () => {
      const { api, cleanup: c } = await renderMirror(`
        AccordionItem: bg #1a1a1a, rad 8
          expanded:
            bg #252525
          onclick: exclusive()

        Frame ver, gap 4
          AccordionItem name section1, "FAQ 1"
          AccordionItem name section2, "FAQ 2"
          AccordionItem name section3, "FAQ 3"
      `)
      cleanup = c

      const section1 = api.findByName('section1')
      const section2 = api.findByName('section2')
      const section3 = api.findByName('section3')

      // Expand section1
      api.trigger(section1!, 'click')
      expect(api.getState(section1!)).toBe('expanded')
      expect(api.getState(section2!)).toBe('default')

      // Expand section2 - section1 closes
      api.trigger(section2!, 'click')
      expect(api.getState(section1!)).toBe('default')
      expect(api.getState(section2!)).toBe('expanded')
      expect(api.getState(section3!)).toBe('default')
    })
  })

  describe('Checkbox/Toggle Behavior', () => {
    it('should toggle between checked and unchecked', async () => {
      const { api, cleanup: c } = await renderMirror(`
        Toggle: w 48, h 24, bg #333, rad 12
          on:
            bg #10b981
          onclick: toggle()

        Frame ver, gap 8
          Toggle name darkMode, "Dark Mode"
          Toggle name notifications, "Notifications", on
      `)
      cleanup = c

      const darkMode = api.findByName('darkMode')
      const notifications = api.findByName('notifications')

      // Initial states
      expect(api.getState(darkMode!)).toBe('default')
      expect(api.getState(notifications!)).toBe('on')

      // Toggle darkMode on
      api.trigger(darkMode!, 'click')
      expect(api.getState(darkMode!)).toBe('on')

      // Toggle notifications off
      api.trigger(notifications!, 'click')
      expect(api.getState(notifications!)).toBe('default')

      // Toggle both again
      api.trigger(darkMode!, 'click')
      api.trigger(notifications!, 'click')
      expect(api.getState(darkMode!)).toBe('default')
      expect(api.getState(notifications!)).toBe('on')
    })
  })

  describe('Radio Button Behavior', () => {
    it('should select only one option in a group', async () => {
      const { api, cleanup: c } = await renderMirror(`
        RadioOption: pad 8, bg transparent
          selected:
            bg #2563eb20
          onclick: exclusive()

        Frame ver, gap 4
          RadioOption name size_s, "Small"
          RadioOption name size_m, "Medium"
          RadioOption name size_l, "Large", selected
      `)
      cleanup = c

      const sizeS = api.findByName('size_s')
      const sizeM = api.findByName('size_m')
      const sizeL = api.findByName('size_l')

      // Large starts selected
      expect(api.getState(sizeS!)).toBe('default')
      expect(api.getState(sizeM!)).toBe('default')
      expect(api.getState(sizeL!)).toBe('selected')

      // Select Small
      api.trigger(sizeS!, 'click')
      expect(api.getState(sizeS!)).toBe('selected')
      expect(api.getState(sizeM!)).toBe('default')
      expect(api.getState(sizeL!)).toBe('default')

      // Select Medium
      api.trigger(sizeM!, 'click')
      expect(api.getState(sizeS!)).toBe('default')
      expect(api.getState(sizeM!)).toBe('selected')
      expect(api.getState(sizeL!)).toBe('default')
    })
  })

  describe('Dropdown Menu States', () => {
    it('should open and close dropdown', async () => {
      const { api, cleanup: c } = await renderMirror(`
        DropdownTrigger: pad 12, bg #333
          open:
            bg #444
          onclick: toggle()

        DropdownTrigger name dropdown, "Select..."
      `)
      cleanup = c

      const dropdown = api.findByName('dropdown')
      expect(api.getState(dropdown!)).toBe('default')

      // Open
      api.trigger(dropdown!, 'click')
      expect(api.getState(dropdown!)).toBe('open')

      // Close
      api.trigger(dropdown!, 'click')
      expect(api.getState(dropdown!)).toBe('default')
    })
  })

  describe('Button Loading States', () => {
    it('should cycle through button states', async () => {
      const { api, cleanup: c } = await renderMirror(`
        SubmitBtn: pad 12 24, bg #2563eb, col white
          loading:
            bg #666
          success:
            bg #10b981
          error:
            bg #ef4444
          onclick: cycle()

        SubmitBtn name submit, "Submit"
      `)
      cleanup = c

      const submit = api.findByName('submit')

      // Start in default
      expect(api.getState(submit!)).toBe('default')

      // Cycle through states
      api.trigger(submit!, 'click')
      expect(api.getState(submit!)).toBe('loading')

      api.trigger(submit!, 'click')
      expect(api.getState(submit!)).toBe('success')

      api.trigger(submit!, 'click')
      expect(api.getState(submit!)).toBe('error')

      api.trigger(submit!, 'click')
      expect(api.getState(submit!)).toBe('loading') // wraps
    })
  })

  describe('Visual Style Verification', () => {
    it('should apply correct background colors in each state', async () => {
      const { api, cleanup: c } = await renderMirror(`
        ColorBtn: pad 12, bg #ff0000
          green:
            bg #00ff00
          blue:
            bg #0000ff
          onclick: cycle()

        ColorBtn name colorBtn, "Colors"
      `)
      cleanup = c

      const btn = api.findByName('colorBtn')

      // Default: red
      let bg = window.getComputedStyle(btn!).backgroundColor
      expect(bg).toBe('rgb(255, 0, 0)')

      // Green
      api.trigger(btn!, 'click')
      bg = window.getComputedStyle(btn!).backgroundColor
      expect(bg).toBe('rgb(0, 255, 0)')

      // Blue
      api.trigger(btn!, 'click')
      bg = window.getComputedStyle(btn!).backgroundColor
      expect(bg).toBe('rgb(0, 0, 255)')

      // Back to green (cycles through defined states only)
      api.trigger(btn!, 'click')
      bg = window.getComputedStyle(btn!).backgroundColor
      expect(bg).toBe('rgb(0, 255, 0)')
    })
  })
})
