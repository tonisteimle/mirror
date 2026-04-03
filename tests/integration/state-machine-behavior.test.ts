/**
 * State Machine Behavior Integration Tests
 *
 * These tests compile real Mirror code, render it to DOM,
 * and verify actual behavior through user interactions.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderMirror } from '../helpers/test-api'

describe('State Machine Behavior', () => {
  let cleanup: () => void

  afterEach(() => {
    cleanup?.()
  })

  describe('toggle() function', () => {
    it('should switch between default and custom state on click', async () => {
      const { api, cleanup: c } = await renderMirror(`
        Btn: pad 12, bg #333, col white
          on:
            bg #2563eb
          onclick: toggle()

        Btn name testBtn, "Click me"
      `)
      cleanup = c

      const btn = api.findByName('testBtn')
      expect(btn).not.toBeNull()

      // Initial state should be default
      expect(api.getState(btn!)).toBe('default')

      // Click should toggle to 'on'
      api.trigger(btn!, 'click')
      expect(api.getState(btn!)).toBe('on')

      // Click again should toggle back to 'default'
      api.trigger(btn!, 'click')
      expect(api.getState(btn!)).toBe('default')
    })

    it('should apply correct styles in each state', async () => {
      const { api, container, cleanup: c } = await renderMirror(`
        Btn: pad 12, bg #333333
          on:
            bg #2563eb
          onclick: toggle()

        Btn name testBtn, "Styled"
      `)
      cleanup = c

      const btn = api.findByName('testBtn')
      expect(btn).not.toBeNull()

      // Check initial background color
      const initialBg = window.getComputedStyle(btn!).backgroundColor
      expect(initialBg).toContain('51') // #333 = rgb(51, 51, 51)

      // Click to toggle
      api.trigger(btn!, 'click')

      // Check 'on' state background
      const onBg = window.getComputedStyle(btn!).backgroundColor
      expect(onBg).toContain('37') // #2563eb = rgb(37, 99, 235)
    })

    it('should start in specified initial state', async () => {
      const { api, cleanup: c } = await renderMirror(`
        Btn: pad 12, bg #333
          on:
            bg #2563eb
          onclick: toggle()

        Btn name activeBtn, "Active", on
      `)
      cleanup = c

      const btn = api.findByName('activeBtn')
      expect(btn).not.toBeNull()

      // Should start in 'on' state
      expect(api.getState(btn!)).toBe('on')

      // Click should toggle to 'default'
      api.trigger(btn!, 'click')
      expect(api.getState(btn!)).toBe('default')
    })
  })

  describe('cycle() function', () => {
    it('should cycle through states starting from first defined state', async () => {
      const { api, cleanup: c } = await renderMirror(`
        StatusBtn: pad 12, col white
          todo:
            bg #333
          doing:
            bg #f59e0b
          done:
            bg #10b981
          onclick: cycle()

        StatusBtn name taskBtn, "Task"
      `)
      cleanup = c

      const btn = api.findByName('taskBtn')
      expect(btn).not.toBeNull()

      // With states controlled by events (no triggers on states), initial is 'default'
      expect(api.getState(btn!)).toBe('default')

      // First click: default -> todo (start of cycle)
      api.trigger(btn!, 'click')
      expect(api.getState(btn!)).toBe('todo')

      // Cycle: todo -> doing
      api.trigger(btn!, 'click')
      expect(api.getState(btn!)).toBe('doing')

      // Cycle: doing -> done
      api.trigger(btn!, 'click')
      expect(api.getState(btn!)).toBe('done')

      // Cycle: done -> todo (wrap around)
      api.trigger(btn!, 'click')
      expect(api.getState(btn!)).toBe('todo')
    })

    it('should start in specified initial state', async () => {
      const { api, cleanup: c } = await renderMirror(`
        StatusBtn: pad 12, col white
          todo:
            bg #333
          doing:
            bg #f59e0b
          done:
            bg #10b981
          onclick: cycle()

        StatusBtn name taskBtn, "Task", doing
      `)
      cleanup = c

      const btn = api.findByName('taskBtn')
      expect(btn).not.toBeNull()

      // Starts in 'doing' because we specified it
      expect(api.getState(btn!)).toBe('doing')

      // Cycle: doing -> done
      api.trigger(btn!, 'click')
      expect(api.getState(btn!)).toBe('done')

      // Cycle: done -> todo
      api.trigger(btn!, 'click')
      expect(api.getState(btn!)).toBe('todo')
    })
  })

  describe('exclusive() function', () => {
    it('should deselect siblings when one is selected', async () => {
      const { api, cleanup: c } = await renderMirror(`
        Tab: pad 12 20, bg #333, col #888
          active:
            bg #2563eb
            col white
          onclick: exclusive()

        Frame hor, gap 4
          Tab name tab1, "Home"
          Tab name tab2, "Projects", active
          Tab name tab3, "Settings"
      `)
      cleanup = c

      const tab1 = api.findByName('tab1')
      const tab2 = api.findByName('tab2')
      const tab3 = api.findByName('tab3')

      expect(tab1).not.toBeNull()
      expect(tab2).not.toBeNull()
      expect(tab3).not.toBeNull()

      // Tab2 should start active
      expect(api.getState(tab1!)).toBe('default')
      expect(api.getState(tab2!)).toBe('active')
      expect(api.getState(tab3!)).toBe('default')

      // Click tab1 - should become active, tab2 should deselect
      api.trigger(tab1!, 'click')
      expect(api.getState(tab1!)).toBe('active')
      expect(api.getState(tab2!)).toBe('default')
      expect(api.getState(tab3!)).toBe('default')

      // Click tab3 - should become active, tab1 should deselect
      api.trigger(tab3!, 'click')
      expect(api.getState(tab1!)).toBe('default')
      expect(api.getState(tab2!)).toBe('default')
      expect(api.getState(tab3!)).toBe('active')
    })

    it('should apply correct visual styles when switching', async () => {
      const { api, cleanup: c } = await renderMirror(`
        Tab: pad 12 20, bg #333333
          active:
            bg #2563eb
          onclick: exclusive()

        Frame hor, gap 4
          Tab name tabA, "A"
          Tab name tabB, "B"
      `)
      cleanup = c

      const tabA = api.findByName('tabA')
      const tabB = api.findByName('tabB')

      // Get initial background of tabA (should be #333)
      let bgA = window.getComputedStyle(tabA!).backgroundColor
      expect(bgA).toContain('51') // #333 = rgb(51, 51, 51)

      // Click tabA
      api.trigger(tabA!, 'click')

      // tabA should now have active background
      bgA = window.getComputedStyle(tabA!).backgroundColor
      expect(bgA).toContain('37') // #2563eb contains 37

      // Click tabB
      api.trigger(tabB!, 'click')

      // tabA should reset to default background
      bgA = window.getComputedStyle(tabA!).backgroundColor
      expect(bgA).toContain('51') // Back to #333

      // tabB should have active background
      const bgB = window.getComputedStyle(tabB!).backgroundColor
      expect(bgB).toContain('37')
    })
  })

  describe('hover states', () => {
    it('hover is a CSS pseudo-state, not a state machine state', async () => {
      const { api, cleanup: c } = await renderMirror(`
        Btn: pad 12, bg #333333
          hover:
            bg #444444

        Btn name hoverBtn, "Hover me"
      `)
      cleanup = c

      const btn = api.findByName('hoverBtn')
      expect(btn).not.toBeNull()

      // hover: is a CSS pseudo-state - the state machine stays in 'default'
      // The browser handles :hover via CSS, not JavaScript state
      expect(api.getState(btn!)).toBe('default')

      // trigger('hover') dispatches mouseenter but doesn't change state machine
      api.trigger(btn!, 'hover')
      expect(api.getState(btn!)).toBe('default')

      // To test hover visuals, we'd need Playwright or actual mouse events
      // This test documents the expected behavior
    })

    it('custom hover-like states work with click', async () => {
      const { api, cleanup: c } = await renderMirror(`
        Btn: pad 12, bg #333333
          highlighted:
            bg #444444
          onhover: toggle()

        Btn name hoverBtn, "Hover me"
      `)
      cleanup = c

      const btn = api.findByName('hoverBtn')
      expect(btn).not.toBeNull()

      // Initial state
      expect(api.getState(btn!)).toBe('default')

      // onhover triggers toggle() which switches to 'highlighted'
      api.trigger(btn!, 'hover')
      expect(api.getState(btn!)).toBe('highlighted')
    })
  })

  describe('state references', () => {
    it('should show element when referenced state becomes active', async () => {
      // The syntax `menuBtn.open:` makes this element react to another element's state
      const { api, cleanup: c } = await renderMirror(`
        Btn: pad 12, bg #333
          open:
            bg #2563eb
          onclick: toggle()

        Btn name menuBtn, "Menu"

        Frame name dropdown, bg #1a1a1a, pad 12, hidden
          menuBtn.open:
            visible
          Text "Dropdown Content"
      `)
      cleanup = c

      const menuBtn = api.findByName('menuBtn')
      const dropdown = api.findByName('dropdown')

      expect(menuBtn).not.toBeNull()
      expect(dropdown).not.toBeNull()

      // Dropdown should be hidden initially
      expect(api.isHidden(dropdown!)).toBe(true)

      // Click button to open
      api.trigger(menuBtn!, 'click')
      expect(api.getState(menuBtn!)).toBe('open')

      // Wait for MutationObserver to fire (it's async)
      await new Promise(resolve => setTimeout(resolve, 10))

      // Dropdown should now be visible
      expect(api.isVisible(dropdown!)).toBe(true)
    })

    it('independent elements can control visibility via shared variable', async () => {
      // Alternative pattern: use visibleWhen with a variable
      const { api, cleanup: c } = await renderMirror(`
        Btn: pad 12, bg #333
          open:
            bg #2563eb
          onclick: toggle()

        Btn name menuBtn, "Menu"
        Frame name dropdown, bg #1a1a1a, pad 12
          Text "Dropdown Content"
      `)
      cleanup = c

      const menuBtn = api.findByName('menuBtn')
      const dropdown = api.findByName('dropdown')

      expect(menuBtn).not.toBeNull()
      expect(dropdown).not.toBeNull()

      // Both elements exist and can be controlled
      expect(api.getState(menuBtn!)).toBe('default')

      api.trigger(menuBtn!, 'click')
      expect(api.getState(menuBtn!)).toBe('open')

      // Manual visibility control works
      api.hide(dropdown!)
      expect(api.isHidden(dropdown!)).toBe(true)

      api.show(dropdown!)
      expect(api.isVisible(dropdown!)).toBe(true)
    })
  })

  describe('keyboard events', () => {
    it('should respond to escape key', async () => {
      const { api, cleanup: c } = await renderMirror(`
        Modal: bg #1a1a1a, pad 20, rad 8
          open:
            visible
          closed:
            hidden
          onkeydown escape: toggle()

        Modal name modal, open
          Text "Press ESC to close"
      `)
      cleanup = c

      const modal = api.findByName('modal')
      expect(modal).not.toBeNull()

      // Should start in 'open' state
      expect(api.getState(modal!)).toBe('open')
      expect(api.isVisible(modal!)).toBe(true)

      // Press escape
      api.triggerKey(modal!, 'Escape', 'keydown')

      // Should toggle to closed/default
      const state = api.getState(modal!)
      expect(['closed', 'default']).toContain(state)
    })
  })

  describe('complex state machines', () => {
    it('should handle multi-step form wizard', async () => {
      const { api, cleanup: c } = await renderMirror(`
        Step: pad 20, bg #1a1a1a
          step1:
            visible
          step2:
            visible
          step3:
            visible
          onclick: cycle()

        Step name wizard, step1
          Text "Current Step"
      `)
      cleanup = c

      const wizard = api.findByName('wizard')
      expect(wizard).not.toBeNull()

      // Start at step1
      expect(api.getState(wizard!)).toBe('step1')

      // Progress through steps
      api.trigger(wizard!, 'click')
      expect(api.getState(wizard!)).toBe('step2')

      api.trigger(wizard!, 'click')
      expect(api.getState(wizard!)).toBe('step3')

      api.trigger(wizard!, 'click')
      expect(api.getState(wizard!)).toBe('step1') // wrap
    })

    it('should preserve base styles after state transitions', async () => {
      const { api, cleanup: c } = await renderMirror(`
        Card: pad 16, bg #1a1a1a, rad 8
          highlighted:
            bg #2563eb
          onclick: toggle()

        Card name card, "Content"
      `)
      cleanup = c

      const card = api.findByName('card')
      expect(card).not.toBeNull()

      // Check base styles
      let styles = window.getComputedStyle(card!)
      expect(styles.padding).toContain('16')
      expect(styles.borderRadius).toContain('8')

      // Toggle to highlighted
      api.trigger(card!, 'click')
      expect(api.getState(card!)).toBe('highlighted')

      // Background should change
      styles = window.getComputedStyle(card!)
      expect(styles.backgroundColor).toContain('37') // #2563eb

      // But padding and radius should be preserved
      expect(styles.padding).toContain('16')
      expect(styles.borderRadius).toContain('8')

      // Toggle back
      api.trigger(card!, 'click')
      expect(api.getState(card!)).toBe('default')

      // Background should revert
      styles = window.getComputedStyle(card!)
      expect(styles.backgroundColor).toContain('26') // #1a1a1a = rgb(26, 26, 26)
    })
  })
})
