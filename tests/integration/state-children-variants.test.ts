/**
 * State Children / Variant Tests
 *
 * Tests for states with completely different children,
 * similar to Figma Variants.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterEach } from 'vitest'
import { renderMirror } from '../helpers/test-api'

describe('States with Different Children (Figma Variants)', () => {
  let cleanup: () => void

  afterEach(() => {
    cleanup?.()
  })

  it('should swap children when state changes', async () => {
    // State children swapping: base children are replaced by state-specific children
    // when the state changes (similar to Figma Variants)
    // Syntax: "open toggle onclick:" combines state definition with trigger and children
    const { api, container, cleanup: c } = await renderMirror(`
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

    // Initial state: should show "Mehr anzeigen" text
    expect(api.getState(panel!)).toBe('default')

    // Check initial content
    const initialText = panel!.textContent
    expect(initialText).toContain('Mehr anzeigen')
    expect(initialText).not.toContain('Weniger anzeigen')
    expect(initialText).not.toContain('versteckte Inhalt')

    // Click to toggle to 'open' state
    api.trigger(panel!, 'click')
    expect(api.getState(panel!)).toBe('open')

    // Check open state content - should have different children
    const openText = panel!.textContent
    expect(openText).toContain('Weniger anzeigen')
    expect(openText).toContain('versteckte Inhalt')
    expect(openText).not.toContain('Mehr anzeigen')

    // Click to toggle back to default
    api.trigger(panel!, 'click')
    expect(api.getState(panel!)).toBe('default')

    // Should show original children again
    const finalText = panel!.textContent
    expect(finalText).toContain('Mehr anzeigen')
    expect(finalText).not.toContain('Weniger anzeigen')
  })

  it('should handle simple expand/collapse with show/hide', async () => {
    // Alternative pattern: use visibility instead of child swapping
    const { api, cleanup: c } = await renderMirror(`
      Spoiler: bg #1a1a1a, rad 8, pad 16
        open:
          bg #252525
        onclick: toggle()

      Spoiler name panel
        Text "Header"
    `)
    cleanup = c

    const panel = api.findByName('panel')
    expect(panel).not.toBeNull()

    // This simpler pattern should work
    expect(api.getState(panel!)).toBe('default')

    api.trigger(panel!, 'click')
    expect(api.getState(panel!)).toBe('open')

    api.trigger(panel!, 'click')
    expect(api.getState(panel!)).toBe('default')
  })
})
