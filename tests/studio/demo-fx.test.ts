/**
 * Mirror Demo API tests
 *
 * Verifies the bundled `MirrorDemoAPI` produced for the demo-runner
 * extraction:
 *   - install is idempotent (same global, no duplicates)
 *   - init applies timing profiles + config
 *   - cursor / overlay sub-objects expose the legacy shape
 *   - moveTo / wait / click delegate sensibly with mocked timings
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  installMirrorDemo,
  getMirrorDemo,
  isMirrorDemoInstalled,
  MirrorDemoAPI,
  DemoCursor,
  KeystrokeOverlay,
} from '../../studio/test-api/demo-fx'

interface DemoGlobal {
  __mirrorDemo?: MirrorDemoAPI
}

const g = globalThis as DemoGlobal

describe('MirrorDemoAPI bundled module', () => {
  beforeEach(() => {
    delete g.__mirrorDemo
    document.body.innerHTML = ''
    document.head.innerHTML = ''
  })

  afterEach(() => {
    if (g.__mirrorDemo) {
      g.__mirrorDemo.destroy()
      delete g.__mirrorDemo
    }
    document.body.innerHTML = ''
  })

  it('installs at window.__mirrorDemo and is idempotent', () => {
    const a = installMirrorDemo()
    const b = installMirrorDemo()
    expect(a).toBe(b)
    expect(g.__mirrorDemo).toBe(a)
    expect(isMirrorDemoInstalled()).toBe(true)
  })

  it('exposes the legacy cursor + overlay sub-objects', () => {
    const api = installMirrorDemo()
    expect(api.cursor).toBeInstanceOf(DemoCursor)
    expect(api.overlay).toBeInstanceOf(KeystrokeOverlay)
  })

  it('init applies pacing profile to internal timings', () => {
    const api = installMirrorDemo('instant')
    api.init({ pacing: 'video' })
    expect(api.getTimings().moveTo.baseMs).toBeGreaterThan(0)
    api.init({ pacing: 'instant' })
    expect(api.getTimings().moveTo.baseMs).toBe(0)
  })

  it('init accepts explicit timings overriding pacing', () => {
    const api = installMirrorDemo()
    const fakeTimings = {
      moveTo: { baseMs: 99, perHundredPixels: 0, minMs: 99, maxMs: 99, easing: 'linear' as const },
      click: { preDelayMs: 1, postDelayMs: 1, rippleDurationMs: 0 },
      doubleClick: { preDelayMs: 1, postDelayMs: 1, rippleDurationMs: 0 },
      type: {
        charMs: 5,
        wordPauseMs: 0,
        linePauseMs: 0,
        thoughtPauseMs: 0,
        variance: 0,
      },
      pressKey: { keyMs: 5, overlayMs: 0 },
      wait: { scale: 1, minMs: 0, maxMs: 1000 },
      highlight: { durationMs: 0, fadeInMs: 0, fadeOutMs: 0 },
      comment: { durationMs: 0, fadeInMs: 0, fadeOutMs: 0 },
      transitions: { afterClick: 0, betweenSteps: 0 },
    }
    api.init({ timings: fakeTimings })
    expect(api.getTimings().moveTo.baseMs).toBe(99)
  })

  it('moveTo on a known selector resolves successfully', async () => {
    const api = installMirrorDemo('instant')
    api.init({ pacing: 'instant' })
    const div = document.createElement('div')
    div.id = 'target'
    div.getBoundingClientRect = () =>
      ({ left: 100, top: 50, width: 40, height: 20, right: 140, bottom: 70 }) as DOMRect
    document.body.appendChild(div)

    api.showCursor(0, 0)
    await api.moveTo('#target')
    // No throw, cursor reaches the target center under instant timings.
    expect(api.cursor.getPosition()).toEqual({ x: 120, y: 60 })
  })

  it('moveTo warns and bails out on missing selector', async () => {
    const api = installMirrorDemo('instant')
    api.init({ pacing: 'instant' })
    const warns: unknown[] = []
    const orig = console.warn
    console.warn = (...args: unknown[]) => warns.push(args)
    await api.moveTo('#nope')
    console.warn = orig
    expect(warns.length).toBeGreaterThan(0)
  })

  it('wait clamps to the configured min/max', async () => {
    const api = installMirrorDemo()
    api.init({
      timings: {
        ...api.getTimings(),
        wait: { scale: 1, minMs: 0, maxMs: 5 },
      },
    })
    const start = performance.now()
    await api.wait(1000)
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(50)
  })

  it('getMirrorDemo returns null before install', () => {
    delete g.__mirrorDemo
    expect(getMirrorDemo()).toBeNull()
    installMirrorDemo()
    expect(getMirrorDemo()).not.toBeNull()
  })

  it('legacy speed presets are accessible', () => {
    const api = installMirrorDemo()
    api.init({ speed: 'fast' })
    expect(api.getSpeedPreset()).toEqual({ mouseMs: 300, charMs: 50 })
    api.init({ speed: 'slow' })
    expect(api.getSpeedPreset()).toEqual({ mouseMs: 1200, charMs: 150 })
  })

  it('showComment renders a top-center caption and removes it', async () => {
    const api = installMirrorDemo()
    // Drive the timing tiny so the caption fades fast in tests.
    api.init({
      timings: {
        ...api.getTimings(),
        comment: { readingSpeedWPM: 200, minMs: 80, maxMs: 80, baseMs: 0 },
      },
    })
    const promise = api.showComment('Hello caption')
    // After the next frame, a caption element exists in the DOM.
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    const caption = Array.from(document.body.children).find(
      el => el.id.startsWith('__demo-fx-caption-') && el.textContent === 'Hello caption'
    )
    expect(caption).toBeDefined()
    await promise
    // Once the lifecycle completes, the caption is gone.
    const after = Array.from(document.body.children).find(el =>
      el.id.startsWith('__demo-fx-caption-')
    )
    expect(after).toBeUndefined()
  })

  it('showComment is a no-op for empty text', async () => {
    const api = installMirrorDemo()
    await api.showComment('')
    const caption = Array.from(document.body.children).find(el =>
      el.id.startsWith('__demo-fx-caption-')
    )
    expect(caption).toBeUndefined()
  })

  it('setStepIndicator inserts, updates, and removes the indicator', () => {
    const api = installMirrorDemo()
    const id = '__demo-fx-step-indicator'

    // No indicator before first call.
    expect(document.getElementById(id)).toBeNull()

    // First call inserts the indicator with counter + label.
    api.setStepIndicator(1, 7, 'Open editor')
    const el = document.getElementById(id)
    expect(el).not.toBeNull()
    expect(el?.querySelector('[data-role="counter"]')?.textContent).toBe('Step 1 / 7')
    expect(el?.querySelector('[data-role="label"]')?.textContent).toBe('Open editor')

    // Second call updates in place — same DOM node, updated text.
    api.setStepIndicator(2, 7, 'Type Card definition')
    const elAfter = document.getElementById(id)
    expect(elAfter).toBe(el)
    expect(elAfter?.querySelector('[data-role="counter"]')?.textContent).toBe('Step 2 / 7')
    expect(elAfter?.querySelector('[data-role="label"]')?.textContent).toBe('Type Card definition')

    // Empty label hides the label row but keeps the counter.
    api.setStepIndicator(3, 7)
    const labelEl = document.getElementById(id)?.querySelector<HTMLElement>('[data-role="label"]')
    expect(labelEl?.style.display).toBe('none')

    // currentStep <= 0 removes the indicator entirely.
    api.setStepIndicator(0, 7)
    expect(document.getElementById(id)).toBeNull()
  })

  it('clearStepIndicator removes the indicator', () => {
    const api = installMirrorDemo()
    api.setStepIndicator(4, 9, 'Click Save')
    expect(document.getElementById('__demo-fx-step-indicator')).not.toBeNull()
    api.clearStepIndicator()
    expect(document.getElementById('__demo-fx-step-indicator')).toBeNull()
    // Idempotent — no throw if already gone.
    api.clearStepIndicator()
    expect(document.getElementById('__demo-fx-step-indicator')).toBeNull()
  })

  it('destroy() also removes the step indicator', () => {
    const api = installMirrorDemo()
    api.setStepIndicator(2, 5, 'Step in progress')
    expect(document.getElementById('__demo-fx-step-indicator')).not.toBeNull()
    api.destroy()
    expect(document.getElementById('__demo-fx-step-indicator')).toBeNull()
    delete (globalThis as DemoGlobal).__mirrorDemo
  })
})
