/**
 * Tutorial Kapitel 4: States - Integration Tests
 *
 * Tests für alle Code-Beispiele aus dem Tutorial.
 * Diese Tests verifizieren ob die Beispiele wie dokumentiert funktionieren.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterEach } from 'vitest'
import { renderMirror } from '../helpers/test-api'

describe('Tutorial 04: States', () => {
  let cleanup: () => void

  afterEach(() => {
    cleanup?.()
  })

  describe('System-States: hover', () => {
    it('Hover Button - hover: State sollte definiert sein', async () => {
      const { api, cleanup: c } = await renderMirror(`
Btn: pad 12 24, rad 6, bg #333, col white, cursor pointer
  hover:
    bg #2563eb
    scale 1.02

Btn "Hover mich"
      `)
      cleanup = c

      const btn = api.getAllElements()[0]
      expect(btn).not.toBeNull()

      // hover: ist ein CSS pseudo-state, State Machine bleibt in default
      expect(api.getState(btn!)).toBe('default')
    })
  })

  describe('Custom States und toggle()', () => {
    it('Toggle Button - sollte zwischen default und on wechseln', async () => {
      const { api, cleanup: c } = await renderMirror(`
Btn: pad 12 24, rad 6, bg #333, col white, cursor pointer
  on:
    bg #2563eb
  onclick: toggle()

Btn "An/Aus"
      `)
      cleanup = c

      const btn = api.getAllElements()[0]
      expect(btn).not.toBeNull()

      expect(api.getState(btn!)).toBe('default')

      api.trigger(btn!, 'click')
      expect(api.getState(btn!)).toBe('on')

      api.trigger(btn!, 'click')
      expect(api.getState(btn!)).toBe('default')
    })

    it('Im State starten - Button mit "on" sollte im on-State starten', async () => {
      const { api, cleanup: c } = await renderMirror(`
Btn: pad 12 24, rad 6, bg #333, col white, cursor pointer
  on:
    bg #2563eb
  onclick: toggle()

Frame hor, gap 12
  Btn name normalBtn, "Normal"
  Btn name activeBtn, "Bereits aktiv", on
      `)
      cleanup = c

      const normalBtn = api.findByName('normalBtn')
      const activeBtn = api.findByName('activeBtn')

      expect(api.getState(normalBtn!)).toBe('default')
      expect(api.getState(activeBtn!)).toBe('on')

      // Klick auf aktiven Button setzt ihn zurück
      api.trigger(activeBtn!, 'click')
      expect(api.getState(activeBtn!)).toBe('default')
    })
  })

  describe('States mit anderen Kindern (Figma Variants)', () => {
    it('ExpandBtn - sollte Kinder beim State-Wechsel austauschen', async () => {
      const { api, cleanup: c } = await renderMirror(`
ExpandBtn: pad 12, bg #333, col white, rad 6, hor, gap 8, cursor pointer
  "Mehr zeigen"
  Icon "chevron-down", ic white, is 16
  open:
    "Weniger zeigen"
    Icon "chevron-up", ic white, is 16
  onclick: toggle()

ExpandBtn name expandBtn
      `)
      cleanup = c

      const btn = api.findByName('expandBtn')
      expect(btn).not.toBeNull()

      // Initial: "Mehr zeigen"
      expect(api.getState(btn!)).toBe('default')
      expect(btn!.textContent).toContain('Mehr zeigen')

      // Klick -> open: "Weniger zeigen"
      api.trigger(btn!, 'click')
      expect(api.getState(btn!)).toBe('open')
      // ERWARTUNG: Kinder sollten ausgetauscht sein
      expect(btn!.textContent).toContain('Weniger zeigen')
    })
  })

  describe('Mehrere States (Cycle)', () => {
    it('StatusBtn - sollte durch todo/doing/done cyclen', async () => {
      const { api, cleanup: c } = await renderMirror(`
StatusBtn: pad 12 24, rad 6, col white, cursor pointer, hor, gap 8
  todo:
    bg #333
    Icon "circle", ic white, is 14
  doing:
    bg #f59e0b
    Icon "clock", ic white, is 14
  done:
    bg #10b981
    Icon "check", ic white, is 14
  onclick: toggle()

StatusBtn name taskBtn, "Task 1"
      `)
      cleanup = c

      const btn = api.findByName('taskBtn')
      expect(btn).not.toBeNull()

      // Startet in default (nicht todo!)
      expect(api.getState(btn!)).toBe('default')

      // Klick -> todo
      api.trigger(btn!, 'click')
      expect(api.getState(btn!)).toBe('todo')

      // Klick -> doing
      api.trigger(btn!, 'click')
      expect(api.getState(btn!)).toBe('doing')

      // Klick -> done
      api.trigger(btn!, 'click')
      expect(api.getState(btn!)).toBe('done')

      // Klick -> todo (wrap)
      api.trigger(btn!, 'click')
      expect(api.getState(btn!)).toBe('todo')
    })
  })

  describe('exclusive() - Nur einer aktiv', () => {
    it('Tabs - sollte nur einen aktiven Tab haben', async () => {
      const { api, cleanup: c } = await renderMirror(`
Tab: pad 12 20, rad 6, bg #333, col #888, cursor pointer
  active:
    bg #2563eb
    col white
  onclick: exclusive()

Frame hor, gap 4, bg #1a1a1a, pad 4, rad 8
  Tab name tab1, "Home"
  Tab name tab2, "Projekte", active
  Tab name tab3, "Settings"
      `)
      cleanup = c

      const tab1 = api.findByName('tab1')
      const tab2 = api.findByName('tab2')
      const tab3 = api.findByName('tab3')

      // Tab2 startet aktiv
      expect(api.getState(tab1!)).toBe('default')
      expect(api.getState(tab2!)).toBe('active')
      expect(api.getState(tab3!)).toBe('default')

      // Klick auf Tab1 -> nur Tab1 aktiv
      api.trigger(tab1!, 'click')
      expect(api.getState(tab1!)).toBe('active')
      expect(api.getState(tab2!)).toBe('default')
      expect(api.getState(tab3!)).toBe('default')

      // Klick auf Tab3 -> nur Tab3 aktiv
      api.trigger(tab3!, 'click')
      expect(api.getState(tab1!)).toBe('default')
      expect(api.getState(tab2!)).toBe('default')
      expect(api.getState(tab3!)).toBe('active')
    })
  })

  describe('State-Referenzen', () => {
    it('Menu - Frame sollte sichtbar werden wenn MenuBtn.open', async () => {
      const { api, cleanup: c } = await renderMirror(`
Frame gap 12
  Button "Menü", name MenuBtn, pad 10 20, rad 6, bg #333, col white
    open:
      bg #2563eb
    onclick: toggle()

  Frame name menu, bg #1a1a1a, pad 12, rad 8, gap 4, hidden
    MenuBtn.open:
      visible
    Text "Dashboard", col white, fs 14, pad 8
    Text "Einstellungen", col white, fs 14, pad 8
      `)
      cleanup = c

      const menuBtn = api.findByName('MenuBtn')
      const menu = api.findByName('menu')

      expect(menuBtn).not.toBeNull()
      expect(menu).not.toBeNull()

      // Menu sollte hidden starten
      expect(api.isHidden(menu!)).toBe(true)

      // Klick auf Button -> open
      api.trigger(menuBtn!, 'click')
      expect(api.getState(menuBtn!)).toBe('open')

      // Wait for MutationObserver to fire (it's async)
      await new Promise(resolve => setTimeout(resolve, 10))

      // ERWARTUNG: Menu sollte jetzt sichtbar sein
      expect(api.isVisible(menu!)).toBe(true)
    })
  })

  describe('Accordion (Praktisches Beispiel)', () => {
    it('Panel - sollte beim Klick Kinder austauschen', async () => {
      const { api, cleanup: c } = await renderMirror(`
Panel: bg #1a1a1a, rad 8, clip
  Frame hor, spread, pad 16, cursor pointer
    Text "Mehr anzeigen", col white, fs 14
    Icon "chevron-down", ic #888, is 18
  open:
    Frame hor, spread, pad 16, cursor pointer
      Text "Weniger anzeigen", col white, fs 14
      Icon "chevron-up", ic #888, is 18
    Frame pad 0 16 16 16, gap 8
      Text "Hier ist der versteckte Inhalt.", col #888, fs 13
  onclick: toggle()

Panel name panel
      `)
      cleanup = c

      const panel = api.findByName('panel')
      expect(panel).not.toBeNull()

      // Initial: "Mehr anzeigen"
      expect(api.getState(panel!)).toBe('default')
      expect(panel!.textContent).toContain('Mehr anzeigen')

      // Klick -> open
      api.trigger(panel!, 'click')
      expect(api.getState(panel!)).toBe('open')

      // ERWARTUNG: Kinder sollten ausgetauscht sein
      expect(panel!.textContent).toContain('Weniger anzeigen')
      expect(panel!.textContent).toContain('versteckte Inhalt')
    })
  })
})
