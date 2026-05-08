/**
 * Tests for studio/editor/edit-status-indicator.ts
 *
 * Singleton DOM widget für drei Edit-Flow-States:
 *   - 'thinking' — LLM-Call läuft (Spinner + Cancel-Hint)
 *   - 'ready'    — Diff-Ghost steht (Tab/Esc-Hint)
 *   - 'error'    — Fehler aufgetreten (Message + Dismiss)
 *
 * Auto-hide bei 'idle'. Browser-visuelle Verifikation in T3.5.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  setEditStatus,
  hideEditStatus,
  getEditStatusElement,
  getEditStatusElapsedSeconds,
} from '../../studio/editor/edit-status-indicator'

beforeEach(() => {
  document.body.innerHTML = ''
  hideEditStatus()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('EditStatusIndicator — visibility', () => {
  it('is hidden initially', () => {
    expect(getEditStatusElement()).toBeNull()
    expect(document.querySelector('.cm-llm-status')).toBeNull()
  })

  it('becomes visible after setEditStatus("thinking")', () => {
    setEditStatus('thinking')
    expect(document.querySelector('.cm-llm-status')).not.toBeNull()
  })

  it('hides on hideEditStatus()', () => {
    setEditStatus('thinking')
    hideEditStatus()
    expect(document.querySelector('.cm-llm-status')).toBeNull()
  })

  it('hides on setEditStatus("idle")', () => {
    setEditStatus('thinking')
    setEditStatus('idle')
    expect(document.querySelector('.cm-llm-status')).toBeNull()
  })
})

describe('EditStatusIndicator — state classes', () => {
  it('applies cm-llm-status-thinking for thinking', () => {
    setEditStatus('thinking')
    const el = document.querySelector('.cm-llm-status')
    expect(el?.classList.contains('cm-llm-status-thinking')).toBe(true)
  })

  it('applies cm-llm-status-ready for ready', () => {
    setEditStatus('ready')
    const el = document.querySelector('.cm-llm-status')
    expect(el?.classList.contains('cm-llm-status-ready')).toBe(true)
  })

  it('applies cm-llm-status-error for error', () => {
    setEditStatus('error', 'Bridge offline')
    const el = document.querySelector('.cm-llm-status')
    expect(el?.classList.contains('cm-llm-status-error')).toBe(true)
  })

  it('replaces previous state class on transition', () => {
    setEditStatus('thinking')
    setEditStatus('ready')
    const el = document.querySelector('.cm-llm-status')
    expect(el?.classList.contains('cm-llm-status-thinking')).toBe(false)
    expect(el?.classList.contains('cm-llm-status-ready')).toBe(true)
  })
})

describe('EditStatusIndicator — content', () => {
  it('shows the default message for thinking when none is provided', () => {
    setEditStatus('thinking')
    const el = document.querySelector('.cm-llm-status')
    expect(el?.textContent).toMatch(/denk|think/i)
  })

  it('shows the default message for ready', () => {
    setEditStatus('ready')
    const el = document.querySelector('.cm-llm-status')
    expect(el?.textContent).toMatch(/Tab|akzept|Esc|verwerf/i)
  })

  it('shows the explicit message for error', () => {
    setEditStatus('error', 'rate limit exceeded')
    const el = document.querySelector('.cm-llm-status')
    expect(el?.textContent).toContain('rate limit exceeded')
  })

  it('shows a custom message when provided for thinking', () => {
    setEditStatus('thinking', 'AI denkt nach (Modus 3)…')
    const el = document.querySelector('.cm-llm-status')
    expect(el?.textContent).toContain('AI denkt nach (Modus 3)')
  })
})

describe('EditStatusIndicator — singleton', () => {
  it('only renders one element across multiple calls', () => {
    setEditStatus('thinking')
    setEditStatus('ready')
    setEditStatus('error', 'oops')
    const els = document.querySelectorAll('.cm-llm-status')
    expect(els.length).toBe(1)
  })

  it('hideEditStatus is idempotent', () => {
    hideEditStatus()
    hideEditStatus()
    expect(document.querySelector('.cm-llm-status')).toBeNull()
  })
})

describe('EditStatusIndicator — elapsed-counter', () => {
  it('does not render the counter outside of "thinking"', () => {
    setEditStatus('ready')
    const el = document.querySelector('.cm-llm-status-elapsed') as HTMLElement
    expect(el).not.toBeNull()
    expect(el.style.display).toBe('none')
    expect(el.textContent).toBe('')
  })

  it('shows the counter after >= 1s in "thinking"', () => {
    vi.useFakeTimers()
    setEditStatus('thinking')
    // Sub-second: counter intentionally suppressed (0s flicker = noise).
    const el = document.querySelector('.cm-llm-status-elapsed') as HTMLElement
    expect(el.textContent).toBe('')
    // Tick to 1500 ms — interval has fired once at 1000 ms.
    vi.advanceTimersByTime(1500)
    expect(el.textContent).toMatch(/\(1s\)/)
    // Tick to 4500 ms — counter at 4 seconds.
    vi.advanceTimersByTime(3000)
    expect(el.textContent).toMatch(/\(4s\)/)
  })

  it('keeps the counter ticking when the thinking message is updated', () => {
    vi.useFakeTimers()
    setEditStatus('thinking', 'AI denkt nach…')
    vi.advanceTimersByTime(3500)
    // Phase update: caller changes the message text mid-call.
    setEditStatus('thinking', 'Übersetze HTML zu Mirror…')
    const el = document.querySelector('.cm-llm-status-elapsed') as HTMLElement
    // Counter must NOT reset to 0 — same call, just new phase label.
    expect(el.textContent).toMatch(/\(3s\)/)
    expect(getEditStatusElapsedSeconds()).toBe(3)
  })

  it('resets the counter when leaving and re-entering thinking', () => {
    vi.useFakeTimers()
    setEditStatus('thinking')
    vi.advanceTimersByTime(5000)
    setEditStatus('ready')
    // Now a new call starts.
    setEditStatus('thinking')
    vi.advanceTimersByTime(1500)
    const el = document.querySelector('.cm-llm-status-elapsed') as HTMLElement
    // Counter shows 1s — fresh call, fresh start, doesn't accumulate.
    expect(el.textContent).toMatch(/\(1s\)/)
  })

  it('hides the counter on transition to ready / error / warning', () => {
    vi.useFakeTimers()
    setEditStatus('thinking')
    vi.advanceTimersByTime(2500)
    const el = document.querySelector('.cm-llm-status-elapsed') as HTMLElement
    expect(el.textContent).toMatch(/\(2s\)/)

    setEditStatus('ready')
    expect(el.textContent).toBe('')
    expect(el.style.display).toBe('none')

    // Re-enter thinking, then jump to error.
    setEditStatus('thinking')
    vi.advanceTimersByTime(500)
    setEditStatus('error', 'boom')
    expect(el.textContent).toBe('')
    expect(el.style.display).toBe('none')
    expect(getEditStatusElapsedSeconds()).toBeNull()
  })

  it('hideEditStatus stops the counter', () => {
    vi.useFakeTimers()
    setEditStatus('thinking')
    vi.advanceTimersByTime(1500)
    expect(getEditStatusElapsedSeconds()).toBe(1)
    hideEditStatus()
    expect(getEditStatusElapsedSeconds()).toBeNull()
    // Re-creating the indicator must not inherit the old counter.
    setEditStatus('thinking')
    vi.advanceTimersByTime(500)
    expect(getEditStatusElapsedSeconds()).toBe(0)
  })
})

describe('EditStatusIndicator — A11y', () => {
  it('uses aria-live polite for thinking', () => {
    setEditStatus('thinking')
    const el = document.querySelector('.cm-llm-status')
    expect(el?.getAttribute('aria-live')).toBe('polite')
  })

  it('uses aria-live assertive for error', () => {
    setEditStatus('error', 'something failed')
    const el = document.querySelector('.cm-llm-status')
    expect(el?.getAttribute('aria-live')).toBe('assertive')
  })

  it('uses role=status', () => {
    setEditStatus('thinking')
    const el = document.querySelector('.cm-llm-status')
    expect(el?.getAttribute('role')).toBe('status')
  })
})
