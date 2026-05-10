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
})
