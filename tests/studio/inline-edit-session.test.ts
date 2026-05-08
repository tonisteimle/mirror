/**
 * QP tests for studio/inline-edit/inline-edit-session.ts
 *
 * `InlineEditSession` is the DOM-level primitive that owns ONE editable
 * span/button/heading at a time. It floats an `<input>` over the element,
 * handles Enter/Escape/Tab/blur, and emits a result on end. No studio-
 * core or state-store coupling — tests run pure-DOM in jsdom.
 *
 * Coverage focus:
 *  - lifecycle: start/end idempotency, isEditing flag, listener cleanup
 *  - save vs cancel semantics: saved=true only when value changed AND save=true
 *  - keyboard: Enter saves, Escape cancels, Tab saves
 *  - blur: deferred save with 50ms timer
 *  - overlay click: saves
 *  - text alignment inference: text-align respected, flex-justify mapped
 *  - auto-resize input: grows but never shrinks below initial width
 *  - DOM-cleanup: input + overlay removed; classList.inline-editing toggled
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  InlineEditSession,
  createInlineEditSession,
  type InlineEditSessionConfig,
} from '../../studio/inline-edit/inline-edit-session'
import type { InlineEditResult } from '../../studio/inline-edit/types'

let element: HTMLElement
let onEnd: ReturnType<typeof vi.fn>
let onInput: ReturnType<typeof vi.fn>

function makeConfig(overrides: Partial<InlineEditSessionConfig> = {}): InlineEditSessionConfig {
  return {
    element,
    nodeId: 'node-1',
    onEnd,
    onInput,
    ...overrides,
  }
}

beforeEach(() => {
  document.body.innerHTML = ''
  element = document.createElement('span')
  element.textContent = 'Hello'
  element.style.cssText = 'color: rgb(255, 255, 255); font-size: 14px; font-family: sans-serif;'
  document.body.appendChild(element)
  onEnd = vi.fn()
  onInput = vi.fn()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

function getInput(): HTMLInputElement | null {
  return document.querySelector('input.inline-edit-input')
}

function getOverlay(): HTMLDivElement | null {
  return document.querySelector('.inline-edit-overlay')
}

describe('InlineEditSession — lifecycle', () => {
  it('start() creates a floating input + overlay and sets the .inline-editing class', () => {
    const session = new InlineEditSession(makeConfig())
    session.start()

    expect(getInput()).not.toBeNull()
    expect(getOverlay()).not.toBeNull()
    expect(element.classList.contains('inline-editing')).toBe(true)
    expect(session.isEditing()).toBe(true)
  })

  it('start() pre-fills the input with the trimmed original text', () => {
    element.textContent = '  Hello  '
    const session = new InlineEditSession(makeConfig())
    session.start()

    expect(getInput()!.value).toBe('Hello')
    expect(session.getOriginalText()).toBe('Hello')
  })

  it('start() is idempotent — calling twice does not produce two inputs', () => {
    const session = new InlineEditSession(makeConfig())
    session.start()
    session.start()
    const inputs = document.querySelectorAll('input.inline-edit-input')
    expect(inputs.length).toBe(1)
  })

  it('end() removes the input + overlay and the .inline-editing class', () => {
    const session = new InlineEditSession(makeConfig())
    session.start()
    session.end(true)

    expect(getInput()).toBeNull()
    expect(getOverlay()).toBeNull()
    expect(element.classList.contains('inline-editing')).toBe(false)
    expect(session.isEditing()).toBe(false)
  })

  it('end() before start() is a silent no-op (does not call onEnd)', () => {
    const session = new InlineEditSession(makeConfig())
    session.end(true)
    expect(onEnd).not.toHaveBeenCalled()
  })

  it('end() called twice is idempotent — onEnd fires only once', () => {
    const session = new InlineEditSession(makeConfig())
    session.start()
    session.end(true)
    session.end(true)
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('createInlineEditSession factory returns a working InlineEditSession instance', () => {
    const session = createInlineEditSession(makeConfig())
    expect(session).toBeInstanceOf(InlineEditSession)
    session.start()
    expect(session.isEditing()).toBe(true)
  })
})

describe('InlineEditSession — save vs cancel', () => {
  it('end(true) with unchanged text reports saved=false (no real edit)', () => {
    const session = new InlineEditSession(makeConfig())
    session.start()
    session.end(true)

    const result = onEnd.mock.calls[0][0] as InlineEditResult
    expect(result.nodeId).toBe('node-1')
    expect(result.originalText).toBe('Hello')
    expect(result.newText).toBe('Hello')
    expect(result.saved).toBe(false)
  })

  it('end(true) with changed text reports saved=true and the new value', () => {
    const session = new InlineEditSession(makeConfig())
    session.start()
    getInput()!.value = 'World'
    session.end(true)

    const result = onEnd.mock.calls[0][0] as InlineEditResult
    expect(result.newText).toBe('World')
    expect(result.saved).toBe(true)
    expect(result.originalText).toBe('Hello')
  })

  it('end(false) returns the original text regardless of input value', () => {
    const session = new InlineEditSession(makeConfig())
    session.start()
    getInput()!.value = 'World'
    session.end(false)

    const result = onEnd.mock.calls[0][0] as InlineEditResult
    expect(result.newText).toBe('Hello') // not "World"
    expect(result.saved).toBe(false)
  })

  it('end(true) trims trailing/leading whitespace from the new value', () => {
    const session = new InlineEditSession(makeConfig())
    session.start()
    getInput()!.value = '  World  '
    session.end(true)

    const result = onEnd.mock.calls[0][0] as InlineEditResult
    expect(result.newText).toBe('World')
    expect(result.saved).toBe(true)
  })
})

describe('InlineEditSession — keyboard handling', () => {
  it('Enter ends the session with save=true and prevents default', () => {
    const session = new InlineEditSession(makeConfig())
    session.start()
    getInput()!.value = 'Saved!'

    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
    getInput()!.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(session.isEditing()).toBe(false)
    expect((onEnd.mock.calls[0][0] as InlineEditResult).newText).toBe('Saved!')
  })

  it('Escape ends the session with save=false', () => {
    const session = new InlineEditSession(makeConfig())
    session.start()
    getInput()!.value = 'Discarded'

    getInput()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))

    expect(session.isEditing()).toBe(false)
    expect((onEnd.mock.calls[0][0] as InlineEditResult).newText).toBe('Hello')
  })

  it('Tab ends the session with save=true (commits like Enter)', () => {
    const session = new InlineEditSession(makeConfig())
    session.start()
    getInput()!.value = 'Next'

    getInput()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }))

    expect(session.isEditing()).toBe(false)
    expect((onEnd.mock.calls[0][0] as InlineEditResult).newText).toBe('Next')
  })

  it('other keys (letters, arrows, backspace) do not end the session', () => {
    const session = new InlineEditSession(makeConfig())
    session.start()
    for (const key of ['a', 'ArrowLeft', 'Backspace', 'Home', 'End']) {
      getInput()!.dispatchEvent(new KeyboardEvent('keydown', { key }))
    }
    expect(session.isEditing()).toBe(true)
    expect(onEnd).not.toHaveBeenCalled()
  })

  it('keydown stops propagation so outer handlers do not see it', () => {
    const session = new InlineEditSession(makeConfig())
    session.start()
    const outerHandler = vi.fn()
    document.body.addEventListener('keydown', outerHandler)

    getInput()!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', cancelable: true, bubbles: true })
    )

    expect(outerHandler).not.toHaveBeenCalled()
    document.body.removeEventListener('keydown', outerHandler)
  })
})

describe('InlineEditSession — blur and overlay click', () => {
  it('blur ends the session after a 50ms delay (saving)', () => {
    const session = new InlineEditSession(makeConfig())
    session.start()
    getInput()!.value = 'Blurred'

    getInput()!.dispatchEvent(new FocusEvent('blur'))

    // before timer fires, still active
    expect(session.isEditing()).toBe(true)
    expect(onEnd).not.toHaveBeenCalled()

    vi.advanceTimersByTime(50)

    expect(session.isEditing()).toBe(false)
    expect((onEnd.mock.calls[0][0] as InlineEditResult).newText).toBe('Blurred')
  })

  it('blur after the session has already ended does not double-fire onEnd', () => {
    // Race condition guard: blur fires, then in the 50ms window something
    // else calls end() — the timer must check isActive before firing.
    const session = new InlineEditSession(makeConfig())
    session.start()
    getInput()!.dispatchEvent(new FocusEvent('blur'))

    // End the session synchronously (e.g. via Escape) before timer fires
    session.end(false)
    expect(onEnd).toHaveBeenCalledTimes(1)

    // Now flush the deferred blur timer — must NOT fire onEnd again
    vi.advanceTimersByTime(60)
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('clicking the overlay ends the session with save=true', () => {
    const session = new InlineEditSession(makeConfig())
    session.start()
    getInput()!.value = 'Outside-clicked'

    const event = new MouseEvent('mousedown', { cancelable: true, bubbles: true })
    getOverlay()!.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(session.isEditing()).toBe(false)
    expect((onEnd.mock.calls[0][0] as InlineEditResult).newText).toBe('Outside-clicked')
  })
})

describe('InlineEditSession — onInput live updates', () => {
  it('typing fires onInput with the current value', () => {
    const session = new InlineEditSession(makeConfig())
    session.start()
    const input = getInput()!
    input.value = 'Hi'
    input.dispatchEvent(new Event('input'))

    expect(onInput).toHaveBeenCalledWith('Hi')
  })

  it('onInput is optional — sessions without it do not crash on input events', () => {
    const session = new InlineEditSession(makeConfig({ onInput: undefined }))
    session.start()
    const input = getInput()!
    input.value = 'Hi'
    expect(() => input.dispatchEvent(new Event('input'))).not.toThrow()
  })
})

describe('InlineEditSession — auto-resize', () => {
  // Note: jsdom does not lay out elements, so getBoundingClientRect returns
  // zero-width rects regardless of CSS — meaning input.style.width starts
  // empty/NaN. The resize logic in the source defaults the comparison to 40
  // (`parseFloat(input.style.width) || 40`), so test the direction instead
  // of exact start values: short text below the 40+16=56 floor leaves the
  // width unchanged; long text above that floor sets it to text+16.

  function patchCanvasMeasure(charWidth: number) {
    const ctx = {
      font: '',
      measureText: (text: string) => ({ width: text.length * charWidth }),
    }
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx) as never
  }

  it('input width grows when measured text exceeds the 40px floor + 16px padding', () => {
    const session = new InlineEditSession(makeConfig())
    session.start()
    const input = getInput()!

    patchCanvasMeasure(10) // 50-char string × 10 = 500px → far above floor
    const longText = 'a'.repeat(50)
    input.value = longText
    input.dispatchEvent(new Event('input'))

    // 500 + 16 = 516px set on the input
    expect(parseFloat(input.style.width)).toBe(516)
  })

  it('input width does NOT change when text fits within the existing width', () => {
    const session = new InlineEditSession(makeConfig())
    session.start()
    const input = getInput()!
    const widthBefore = input.style.width

    patchCanvasMeasure(1) // 5-char × 1 = 5px → well below the 40px floor
    input.value = 'short'
    input.dispatchEvent(new Event('input'))

    expect(input.style.width).toBe(widthBefore) // unchanged
  })
})

describe('InlineEditSession — accessors', () => {
  it('getOriginalText returns the trimmed original textContent', () => {
    element.textContent = '  spacey  '
    const session = new InlineEditSession(makeConfig())
    session.start()
    expect(session.getOriginalText()).toBe('spacey')
  })

  it('getCurrentText returns the input value when active', () => {
    const session = new InlineEditSession(makeConfig())
    session.start()
    getInput()!.value = 'Live'
    expect(session.getCurrentText()).toBe('Live')
  })

  it('getCurrentText falls back to original when no input exists', () => {
    const session = new InlineEditSession(makeConfig())
    expect(session.getCurrentText()).toBe('') // not started yet, original is ''
  })
})

describe('InlineEditSession — listener cleanup (memory-leak guard)', () => {
  it('end() detaches keydown/input/blur listeners — orphaned events do not fire onEnd', () => {
    const session = new InlineEditSession(makeConfig())
    session.start()
    const input = getInput()!
    session.end(false)

    // Calling onEnd cleared the spy slate; further events should not fire it.
    onEnd.mockClear()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }))
    input.dispatchEvent(new FocusEvent('blur'))
    vi.advanceTimersByTime(100)

    expect(onEnd).not.toHaveBeenCalled()
  })

  it('end() detaches the overlay mousedown listener', () => {
    const session = new InlineEditSession(makeConfig())
    session.start()
    const overlay = getOverlay()!
    session.end(false)

    onEnd.mockClear()
    overlay.dispatchEvent(new MouseEvent('mousedown', { cancelable: true, bubbles: true }))
    expect(onEnd).not.toHaveBeenCalled()
  })
})
