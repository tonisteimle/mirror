/**
 * Tutorial 07 - Animationen: BEHAVIOR Tests
 *
 * Testet:
 * - Transitions mit Dauer (hover 0.2s:)
 * - Easing-Funktionen (ease-out, spring)
 * - Animation Presets (anim pulse, anim bounce, etc.)
 * - State-basierte Animationen
 * - Enter/Exit Animationen
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderWithRuntime, click, getState } from './test-utils'

let container: HTMLDivElement

beforeEach(() => {
  container = document.createElement('div')
  container.id = 'test-container'
  document.body.appendChild(container)
})

afterEach(() => {
  container.remove()
})

// ============================================================
// TRANSITIONS - Sanfte Übergänge
// ============================================================
describe('Transitions', () => {
  it('hover 0.2s: generiert CSS transition', () => {
    const { root } = renderWithRuntime(
      `
Btn: pad 12 24, bg #333, col white, cursor pointer
  hover 0.2s:
    bg #2563eb

Btn "Hover me"
`,
      container
    )

    const btn = root.querySelector('[data-mirror-name="Btn"]') as HTMLElement
    expect(btn).toBeTruthy()

    // Transition sollte auf dem Element sein
    expect(btn.style.transition).toContain('background')
    expect(btn.style.transition).toContain('200ms')
  })

  it('hover: ohne Dauer hat keine transition', () => {
    const { root } = renderWithRuntime(
      `
Btn: pad 12 24, bg #333, col white, cursor pointer
  hover:
    bg #2563eb

Btn "Hover me"
`,
      container
    )

    const btn = root.querySelector('[data-mirror-name="Btn"]') as HTMLElement
    expect(btn).toBeTruthy()

    // Keine Transition ohne Dauer
    expect(btn.style.transition).toBeFalsy()
  })

  it('active 0.15s: generiert CSS transition', () => {
    const { root } = renderWithRuntime(
      `
Btn: pad 12, bg #333, col white, rad 6
  active 0.15s:
    bg #222

Btn "Press me"
`,
      container
    )

    const btn = root.querySelector('[data-mirror-name="Btn"]') as HTMLElement
    expect(btn).toBeTruthy()

    // Transition für background
    expect(btn.style.transition).toContain('150ms')
  })

  it('Mehrere Properties werden animiert', () => {
    const { root } = renderWithRuntime(
      `
Btn: pad 12, bg #333, col #888
  hover 0.2s:
    bg #2563eb
    col white

Btn "Multi"
`,
      container
    )

    const btn = root.querySelector('[data-mirror-name="Btn"]') as HTMLElement
    expect(btn).toBeTruthy()

    // Beide Properties sollten in transition sein
    expect(btn.style.transition).toContain('background')
    expect(btn.style.transition).toContain('color')
  })
})

// ============================================================
// EASING - Beschleunigungskurven
// ============================================================
describe('Easing', () => {
  it('hover 0.3s ease-out: setzt easing', () => {
    const { root } = renderWithRuntime(
      `
Btn: pad 12, bg #333
  hover 0.3s ease-out:
    bg #2563eb

Btn "Ease out"
`,
      container
    )

    const btn = root.querySelector('[data-mirror-name="Btn"]') as HTMLElement
    expect(btn).toBeTruthy()

    expect(btn.style.transition).toContain('ease-out')
    expect(btn.style.transition).toContain('300ms')
  })

  it('hover 0.2s ease-in: setzt easing', () => {
    const { root } = renderWithRuntime(
      `
Btn: pad 12, bg #333
  hover 0.2s ease-in:
    bg #2563eb

Btn "Ease in"
`,
      container
    )

    const btn = root.querySelector('[data-mirror-name="Btn"]') as HTMLElement
    expect(btn).toBeTruthy()

    expect(btn.style.transition).toContain('ease-in')
  })

  it('Default easing ist ease', () => {
    const { root } = renderWithRuntime(
      `
Btn: pad 12, bg #333
  hover 0.2s:
    bg #2563eb

Btn "Default"
`,
      container
    )

    const btn = root.querySelector('[data-mirror-name="Btn"]') as HTMLElement
    expect(btn).toBeTruthy()

    // Default easing
    expect(btn.style.transition).toMatch(/ease(?!-)|ease\s/)
  })
})

// ============================================================
// ANIMATION PRESETS
// ============================================================
describe('Animation Presets', () => {
  it('anim pulse kompiliert', () => {
    const { root } = renderWithRuntime(
      `
Frame w 60, h 60, bg #2563eb, rad 8, anim pulse
`,
      container
    )

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame).toBeTruthy()

    // Animation sollte gesetzt sein
    expect(frame.style.animation).toBeTruthy()
  })

  it('anim bounce kompiliert', () => {
    const { root } = renderWithRuntime(
      `
Frame w 60, h 60, bg #10b981, rad 8, anim bounce
`,
      container
    )

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame).toBeTruthy()

    expect(frame.style.animation).toBeTruthy()
  })

  it('anim shake kompiliert', () => {
    const { root } = renderWithRuntime(
      `
Frame w 60, h 60, bg #f59e0b, rad 8, anim shake
`,
      container
    )

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame).toBeTruthy()

    expect(frame.style.animation).toBeTruthy()
  })

  it('anim spin kompiliert', () => {
    const { root } = renderWithRuntime(
      `
Frame w 60, h 60, bg #ef4444, rad 8, anim spin
`,
      container
    )

    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame).toBeTruthy()

    expect(frame.style.animation).toBeTruthy()
  })
})

// ============================================================
// STATE-BASIERTE ANIMATIONEN
// ============================================================
describe('State-basierte Animationen', () => {
  it('State mit anim bounce', () => {
    const { root } = renderWithRuntime(
      `
LikeBtn: pad 12, bg #1a1a1a, col #888, cursor pointer
  on:
    bg #dc2626
    col white
    anim bounce
  onclick toggle()

LikeBtn "Like"
`,
      container
    )

    const btn = root.querySelector('[data-mirror-name="LikeBtn"]') as HTMLElement
    expect(btn).toBeTruthy()

    // Initial: default
    expect(getState(btn)).toBe('default')

    // Click aktiviert State
    click(btn)
    expect(getState(btn)).toBe('on')
  })

  it('toggle() mit mehreren States', () => {
    const { root } = renderWithRuntime(
      `
StatusBtn: pad 12, bg #333, col white, cursor pointer
  todo:
    bg #888
  doing:
    bg #f59e0b
  done:
    bg #10b981
  onclick cycle(todo, doing, done)

StatusBtn "Status"
`,
      container
    )

    const btn = root.querySelector('[data-mirror-name="StatusBtn"]') as HTMLElement
    expect(btn).toBeTruthy()

    // Cycle durch States
    click(btn)
    expect(getState(btn)).toBe('todo')

    click(btn)
    expect(getState(btn)).toBe('doing')

    click(btn)
    expect(getState(btn)).toBe('done')
  })
})

// ============================================================
// ENTER/EXIT ANIMATIONEN
// ============================================================
describe('Enter/Exit Animationen', () => {
  it('enter: und exit: kompilieren', () => {
    const { root } = renderWithRuntime(
      `
Panel: bg #1a1a1a, pad 16, rad 8
  enter: fade-in
  exit: fade-out

Frame
  Panel "Content"
`,
      container
    )

    const panel = root.querySelector('[data-mirror-name="Panel"]') as HTMLElement
    expect(panel).toBeTruthy()
  })

  it('Visibility-Toggle mit Animation', () => {
    const { root } = renderWithRuntime(
      `
Btn: pad 12, bg #333, col white
  open:
    bg #2563eb
  onclick toggle()

Hint: bg #1a1a1a, pad 16, rad 8, hidden
  visible when Btn open:
    opacity 1

Frame gap 12
  Btn name Btn, "Toggle"
  Hint name Hint
    Text "Visible content"
`,
      container
    )

    const btn = root.querySelector('[data-mirror-name="Btn"]') as HTMLElement
    expect(btn).toBeTruthy()

    // Toggle visibility
    click(btn)
    expect(getState(btn)).toBe('open')
  })
})

// ============================================================
// TUTORIAL BEISPIELE
// ============================================================
describe('Tutorial 07 Beispiele', () => {
  it('Beispiel: Hover mit Transition', () => {
    const { root } = renderWithRuntime(
      `
BtnSoft: pad 12 24, rad 6, bg #333, col white, cursor pointer
  hover 0.2s:
    bg #2563eb

BtnSoft "Mit Transition"
`,
      container
    )

    const btn = root.querySelector('[data-mirror-name="BtnSoft"]') as HTMLElement
    expect(btn).toBeTruthy()
    expect(btn.style.transition).toContain('200ms')
  })

  it('Beispiel: Like-Button mit Animation', () => {
    const { root } = renderWithRuntime(
      `
LikeBtn: pad 12 20, rad 6, bg #1a1a1a, col #888, cursor pointer, hor, ver-center, gap 8
  Icon "heart", ic #666, is 18
  "Gefällt mir"
  hover 0.15s:
    bg #252525
  on:
    bg #dc2626
    col white
    anim bounce
  onclick toggle()

LikeBtn
`,
      container
    )

    const btn = root.querySelector('[data-mirror-name="LikeBtn"]') as HTMLElement
    expect(btn).toBeTruthy()

    // Initial: default
    expect(getState(btn)).toBe('default')

    // Click: on
    click(btn)
    expect(getState(btn)).toBe('on')
    expect(btn.style.background).toMatch(/dc2626|rgb\(220,\s*38,\s*38\)/)
  })

  it('Beispiel: Loading Spinner', () => {
    const { root } = renderWithRuntime(
      `
Frame hor, ver-center, gap 12, bg #1a1a1a, pad 16, rad 8
  Icon "loader-2", ic #2563eb, is 24, anim spin
  Text "Lädt...", col #888
`,
      container
    )

    const icon = root.querySelector('[data-mirror-name="Icon"]') as HTMLElement
    expect(icon).toBeTruthy()
    expect(icon.style.animation).toBeTruthy()
  })

  it('Beispiel: Slide-In Menü', () => {
    const { root } = renderWithRuntime(
      `
Btn: pad 10 20, bg #333, col white, rad 6
  open:
    bg #2563eb
  onclick toggle()

Menu: bg #1a1a1a, pad 12, rad 8, gap 4, w 160, hidden
  enter: slide-in
  exit: slide-out
  visible when Btn open:
    opacity 1

Frame hor, gap 12
  Btn name Btn, "Menü"
  Menu name Menu
    Text "Dashboard", col white, pad 8 12
    Text "Settings", col white, pad 8 12
`,
      container
    )

    const btn = root.querySelector('[data-mirror-name="Btn"]') as HTMLElement
    expect(btn).toBeTruthy()

    // Initial: closed
    expect(getState(btn)).toBe('default')

    // Click: open
    click(btn)
    expect(getState(btn)).toBe('open')
  })
})

// ============================================================
// EDGE CASES
// ============================================================
describe('Edge Cases', () => {
  it('Transition auf Komponente mit hover', () => {
    const { root } = renderWithRuntime(
      `
Card: pad 16, bg #1a1a1a, rad 8, cursor pointer
  hover 0.2s:
    bg #2a2a2a
    scale 1.02

Card "Hover Card"
`,
      container
    )

    const card = root.querySelector('[data-mirror-name="Card"]') as HTMLElement
    expect(card).toBeTruthy()
    expect(card.style.transition).toContain('200ms')
  })

  it('Transition auf Frame mit hover', () => {
    const { root } = renderWithRuntime(
      `
Card: Frame bg #1a1a1a, pad 16, rad 8
  hover 0.2s:
    bg #2a2a2a

Card "Content"
`,
      container
    )

    const card = root.querySelector('[data-mirror-name="Card"]') as HTMLElement
    expect(card).toBeTruthy()
    expect(card.style.transition).toContain('200ms')
  })

  it('Kombination: hover mit mehreren Properties', () => {
    const { root } = renderWithRuntime(
      `
Btn: pad 12, bg #333, col #888, rad 6
  hover 0.2s:
    bg #2563eb
    col white

Btn "Both"
`,
      container
    )

    const btn = root.querySelector('[data-mirror-name="Btn"]') as HTMLElement
    expect(btn).toBeTruthy()

    // Beide Properties sollten in transition sein
    expect(btn.style.transition).toContain('background')
    expect(btn.style.transition).toContain('color')
  })
})

// =============================================================================
// Tutorial 07 — Aspect Closure (Iter 3, added 2026-04-25)
// =============================================================================

describe('Tutorial 07 Aspekte: Transition auf Custom States', () => {
  it('on (without duration) sets up the state machine correctly', () => {
    // The Tutorial example uses `on 0.2s: …` to make the custom-state
    // transition smooth. Currently the timing on a custom state is
    // *neither* serialized into the state-machine config *nor* emitted
    // as CSS — known Tutorial-Limitation (see `themen/13-animations.md`
    // and the it.todo below). System-state timing (`hover 0.2s:`) works.
    const { root } = renderWithRuntime(
      `Toggle: w 48, h 28, rad 99, bg #333, cursor pointer, toggle()
  on:
    bg #2271C1

Toggle`,
      container
    )
    const btn = root.querySelector('[data-mirror-name="Toggle"]') as HTMLElement
    const sm = (btn as any)._stateMachine
    expect(sm.states?.on).toBeDefined()
    expect(sm.states.on.styles?.background).toBe('#2271C1')
  })

  // Known Tutorial-Limitation: `on 0.2s:` (timing on a custom state)
  // does not emit transition timing — neither in CSS nor in the runtime
  // state-machine config.
  it.todo('on 0.2s: timing on custom state propagates as CSS transition')
})

describe('Tutorial 07 Aspekte: Erfolgs-Feedback (saved + anim bounce)', () => {
  it('SaveBtn cycling toggles between default and saved with bounce', () => {
    const { root } = renderWithRuntime(
      `SaveBtn: pad 12 24, rad 6, bg #333, col white, cursor pointer, toggle()
  Icon "save", ic white, is 16
  Text "Speichern"
  saved:
    bg #10b981
    anim bounce
    Icon "check", ic white, is 16
    Text "Gespeichert!"

SaveBtn`,
      container
    )
    const btn = root.querySelector('[data-mirror-name="SaveBtn"]') as HTMLElement
    expect(btn).toBeTruthy()
    // Initially: shows "Speichern"
    const initialTexts = Array.from(btn.querySelectorAll('span')).map(s => s.textContent)
    expect(initialTexts).toContain('Speichern')
    // Click to toggle into saved
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(btn.dataset.state).toBe('saved')
    // After click: state-children swap to "Gespeichert!"
    const savedTexts = Array.from(btn.querySelectorAll('span')).map(s => s.textContent)
    expect(savedTexts).toContain('Gespeichert!')
  })
})
