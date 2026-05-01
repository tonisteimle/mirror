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

import { describe, it, expect, beforeEach } from 'vitest'
import {
  setEditStatus,
  hideEditStatus,
  getEditStatusElement,
} from '../../studio/editor/edit-status-indicator'

beforeEach(() => {
  document.body.innerHTML = ''
  hideEditStatus()
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
