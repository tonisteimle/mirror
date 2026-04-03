/**
 * Spoiler Panel Test - Exakt der User-Fall
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterEach } from 'vitest'
import { renderMirror } from '../helpers/test-api'

describe('Spoiler Panel mit State Children', () => {
  let cleanup: () => void

  afterEach(() => {
    cleanup?.()
  })

  it('Panel sollte beim Klick die Kinder austauschen', async () => {
    // Syntax: open toggle onclick: defines a state that toggles on click
    // The children after the colon are the state's children
    const { api, cleanup: c } = await renderMirror(`
Panel: bg #1a1a1a, rad 8, clip, cursor pointer
  Frame hor, spread, pad 16
    Text "Mehr anzeigen", col white, fs 14
    Icon "chevron-down", ic #888, is 18
  open toggle onclick:
    Frame hor, spread, pad 16
      Text "Weniger anzeigen", col white, fs 14
      Icon "chevron-up", ic #888, is 18
    Frame pad 0 16 16 16, gap 8
      Text "Hier ist der versteckte Inhalt.", col #888, fs 13

Panel name spoiler
    `)
    cleanup = c

    const panel = api.findByName('spoiler')
    expect(panel).not.toBeNull()

    // Anfangszustand
    expect(api.getState(panel!)).toBe('default')
    expect(panel!.textContent).toContain('Mehr anzeigen')

    // Klick -> open
    api.trigger(panel!, 'click')
    expect(api.getState(panel!)).toBe('open')

    // ERWARTET: Kinder sollten ausgetauscht sein
    expect(panel!.textContent).toContain('Weniger anzeigen')
    expect(panel!.textContent).toContain('versteckte Inhalt')
  })
})
