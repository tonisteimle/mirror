/**
 * Mirror Actions API — bundled, typed port of the demo-runner's MIRROR_ACTIONS_API
 * inline JS string.
 *
 * Provides high-level helpers used by the demo runner's dropFromPalette /
 * moveElement / dragResize / dragPadding / dragMargin / inlineEdit /
 * selectInPreview / setProperty / pickColor / aiPrompt actions. Centralizes
 * selector resolution + cursor-synced drag flows + DOM snapshotting.
 *
 * Installs once at `window.__mirrorActions`. The demo runner detects the
 * pre-installed bundle and skips its inline-eval fallback.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Selector } from '../../../tools/test-runner/demo/types'

type Point = { x: number; y: number }

type SnapshotResult = Record<string, unknown>

type DragOpts = {
  preHoldMs?: number
  moveMs?: number
  triggerFrac?: number
  settleMs?: number
}

type ManualDragOpts = {
  durationMs?: number
  steps?: number
  eventOpts?: { shiftKey?: boolean; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }
  moveTarget?: EventTarget
}

export interface MirrorActionsAPI {
  resolveSelector(sel: Selector): string
  dropChildIndexPoint(targetEl: HTMLElement, index: number): Point
  snapshotElement(nodeId: string, extras?: string[]): SnapshotResult
  snapshotAllByPreviewOrder(): { selector: { byId: string }; snapshot: SnapshotResult }[]
  dropFromPalette(
    component: string,
    targetSel: Selector,
    at: { kind: 'index'; index: number } | { kind: 'zone'; zone: string }
  ): Promise<void>
  drawInGrid(
    componentName: string,
    targetSel: Selector,
    fromCell: { x: number; y: number },
    toCell: { x: number; y: number },
    name?: string
  ): Promise<void>
  moveElement(sourceSel: Selector, targetSel: Selector, index: number): Promise<void>
  dragResize(
    sel: Selector,
    position: string,
    deltaX: number,
    deltaY: number,
    opts?: unknown
  ): Promise<void>
  dragPadding(
    sel: Selector,
    side: string,
    delta: number,
    mode: 'all' | 'axis' | 'single',
    bypassSnap?: boolean
  ): Promise<void>
  dragMargin(
    sel: Selector,
    side: string,
    delta: number,
    mode: 'all' | 'axis' | 'single',
    bypassSnap?: boolean
  ): Promise<void>
  inlineEdit(sel: Selector, text: string, charDelay?: number): Promise<void>
  selectInPreview(sel: Selector): Promise<void>
  setProperty(sel: Selector, propName: string, value: string): Promise<void>
  pickColor(sel: Selector, propName: string, color: string): Promise<void>
  aiPrompt(promptText: string, options?: unknown): Promise<unknown>
  installAiMockListener(): void
}

const GLOBAL_KEY = '__mirrorActions'

export function isMirrorActionsInstalled(): boolean {
  return Boolean((globalThis as any)[GLOBAL_KEY])
}

export function getMirrorActions(): MirrorActionsAPI | null {
  return ((globalThis as any)[GLOBAL_KEY] as MirrorActionsAPI | undefined) ?? null
}

export function installMirrorActions(): MirrorActionsAPI {
  const existing = getMirrorActions()
  if (existing) return existing

  const win = globalThis as any
  const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

  // ===========================================================================
  // Selector resolution (E1) — strukturierte Objekte → nodeId
  // ===========================================================================

  const allMirrorElements = (): HTMLElement[] =>
    Array.from(document.querySelectorAll('#preview [data-mirror-id]')) as HTMLElement[]

  const matchByText = (needle: string | RegExp, all: HTMLElement[]): HTMLElement[] => {
    if (needle instanceof RegExp) {
      return all.filter(el => needle.test(el.textContent || ''))
    }
    return all.filter(el => (el.textContent || '').trim() === needle)
  }

  const matchByPath = (path: string): HTMLElement[] => {
    const segments = path
      .split('>')
      .map(s => s.trim())
      .filter(Boolean)
    if (segments.length === 0) return []
    const preview = document.getElementById('preview')
    if (!preview) return []
    const matchSegment = (el: HTMLElement, seg: string): boolean => {
      const lower = seg.toLowerCase()
      if (el.tagName.toLowerCase() === lower) return true
      if ((el.getAttribute('data-mirror-name') || '').toLowerCase() === lower) return true
      return false
    }
    let candidates = Array.from(preview.querySelectorAll('[data-mirror-id]')) as HTMLElement[]
    candidates = candidates.filter(el => matchSegment(el, segments[0]))
    for (let i = 1; i < segments.length; i++) {
      const next: HTMLElement[] = []
      for (const c of candidates) {
        const descendants = Array.from(c.querySelectorAll('[data-mirror-id]')) as HTMLElement[]
        for (const d of descendants) {
          if (matchSegment(d, segments[i])) next.push(d)
        }
      }
      candidates = next
    }
    return candidates
  }

  const selectorDescription = (sel: unknown): string => JSON.stringify(sel)

  const resolveSelector = (sel: Selector): string => {
    if (!sel || typeof sel !== 'object') {
      throw new Error('Selector must be a structured object, got: ' + JSON.stringify(sel))
    }
    if ('byId' in sel) {
      const el = document.querySelector('[data-mirror-id="' + sel.byId + '"]')
      if (!el) throw new Error('Selector ' + selectorDescription(sel) + ' matched 0 elements')
      return sel.byId
    }
    if ('byTestId' in sel) {
      const el = document.querySelector('[data-test-id="' + sel.byTestId + '"][data-mirror-id]')
      if (!el) throw new Error('Selector ' + selectorDescription(sel) + ' matched 0 elements')
      return el.getAttribute('data-mirror-id') as string
    }
    let matches: HTMLElement[] = []
    if ('byText' in sel) {
      matches = matchByText(sel.byText, allMirrorElements())
    } else if ('byTag' in sel) {
      matches = allMirrorElements().filter(
        el => el.tagName.toLowerCase() === sel.byTag.toLowerCase()
      )
    } else if ('byRole' in sel) {
      matches = allMirrorElements().filter(
        el => (el.getAttribute('role') || '').toLowerCase() === sel.byRole.toLowerCase()
      )
    } else if ('byPath' in sel) {
      matches = matchByPath(sel.byPath)
    } else {
      throw new Error('Unknown selector kind: ' + selectorDescription(sel))
    }
    const nth = (sel as any).nth as number | undefined
    if (matches.length === 0) {
      throw new Error('Selector ' + selectorDescription(sel) + ' matched 0 elements')
    }
    if (matches.length > 1 && nth === undefined) {
      throw new Error(
        'Selector ' +
          selectorDescription(sel) +
          ' matched ' +
          matches.length +
          ' elements; specify nth (0-based) to disambiguate'
      )
    }
    const target = nth === undefined ? matches[0] : matches[nth]
    if (!target) {
      throw new Error(
        'Selector ' +
          selectorDescription(sel) +
          ' nth=' +
          nth +
          ' out of range (matched ' +
          matches.length +
          ')'
      )
    }
    const id = target.getAttribute('data-mirror-id')
    if (!id) {
      throw new Error('Resolved element has no data-mirror-id: ' + selectorDescription(sel))
    }
    return id
  }

  // ===========================================================================
  // Cursor sync — animate demo cursor in parallel with real Studio op
  // ===========================================================================

  const dropChildIndexPoint = (targetEl: HTMLElement, index: number): Point => {
    const children = Array.from(targetEl.children).filter(
      el => el.hasAttribute && el.hasAttribute('data-mirror-id')
    ) as HTMLElement[]
    if (children.length === 0) {
      const r = targetEl.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }
    if (index >= children.length) {
      const r = children[children.length - 1].getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.bottom + 8 }
    }
    const r = children[index].getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top - 4 }
  }

  /**
   * Sequential, watcher-friendly drag flow:
   *  1. press-effect at the current cursor position (the source)
   *  2. cursor glides to targetPoint (paced by ACTION_TIMINGS.moveTo)
   *  3. real DOM operation fires roughly when the cursor is near the target
   *  4. release-effect at the target
   *  5. settle pause so the viewer can see the result
   */
  const withVisibleDrag = async <T>(
    targetPoint: Point | null,
    realOpFn: () => Promise<T> | T,
    opts: DragOpts = {}
  ): Promise<T> => {
    const cursor = win.__mirrorDemo && win.__mirrorDemo.cursor
    if (cursor) cursor.showClickEffect()
    await delay(opts.preHoldMs ?? 200)
    const moveDur =
      opts.moveMs ?? (cursor && targetPoint ? cursor.calculateDuration(targetPoint) : 0)
    const triggerAt = Math.max(0, Math.round(moveDur * (opts.triggerFrac ?? 0.7)))
    const motionPromise =
      cursor && targetPoint ? cursor.moveTo(targetPoint, moveDur) : Promise.resolve()
    const opPromise = (async () => {
      await delay(triggerAt)
      return realOpFn()
    })()
    await motionPromise
    const result = await opPromise
    if (cursor) cursor.showClickEffect()
    await delay(opts.settleMs ?? 280)
    return result
  }

  const withCursorSync = async <T>(
    endPoint: Point | null,
    durationMs: number,
    realOpFn: () => Promise<T> | T
  ): Promise<T> => withVisibleDrag(endPoint, realOpFn, { moveMs: durationMs })

  /**
   * Single-click flow for selectInPreview / setProperty / pickColor — moves
   * the cursor to `endPoint`, fires ONE click ripple at the destination,
   * runs `realOpFn`, then settles. `withVisibleDrag` would fire a click
   * ripple at the source AND the destination (press + release semantics
   * for drag flows), which makes a plain click look like a double-click.
   */
  const withSingleClick = async <T>(
    endPoint: Point | null,
    durationMs: number,
    realOpFn: () => Promise<T> | T,
    settleMs = 180
  ): Promise<T> => {
    const cursor = win.__mirrorDemo && win.__mirrorDemo.cursor
    if (cursor && endPoint) await cursor.moveTo(endPoint, durationMs)
    if (cursor) cursor.showClickEffect()
    await delay(60)
    const result = await realOpFn()
    await delay(settleMs)
    return result
  }

  // Mirrors studio/test-api/interactions.ts dispatchMouseEvent — no button/
  // buttons fields, so we match the existing tests' working contract exactly.
  const dispatchMouse = (
    target: EventTarget,
    type: string,
    x: number,
    y: number,
    eventOpts?: ManualDragOpts['eventOpts']
  ): void => {
    const ev = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      shiftKey: !!(eventOpts && eventOpts.shiftKey),
      altKey: !!(eventOpts && eventOpts.altKey),
      ctrlKey: !!(eventOpts && eventOpts.ctrlKey),
      metaKey: !!(eventOpts && eventOpts.metaKey),
    })
    target.dispatchEvent(ev)
  }

  const easeInOutCubic = (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

  const manualDrag = async (
    sourceEl: EventTarget,
    startPoint: Point,
    endPoint: Point,
    opts: ManualDragOpts = {}
  ): Promise<void> => {
    const cursor = win.__mirrorDemo && win.__mirrorDemo.cursor
    const dx = endPoint.x - startPoint.x
    const dy = endPoint.y - startPoint.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const durationMs = opts.durationMs ?? Math.max(600, Math.min(2000, 400 + dist * 3))
    const steps = opts.steps ?? Math.max(20, Math.round(durationMs / 16))
    const stepMs = durationMs / steps
    const eventOpts = opts.eventOpts || {}
    const moveTarget: EventTarget = opts.moveTarget || document

    dispatchMouse(sourceEl, 'mousedown', startPoint.x, startPoint.y, eventOpts)
    if (cursor) {
      cursor.updatePosition(startPoint)
      cursor.showClickEffect()
    }
    await delay(80)

    for (let i = 1; i <= steps; i++) {
      const eased = easeInOutCubic(i / steps)
      const x = startPoint.x + dx * eased
      const y = startPoint.y + dy * eased
      dispatchMouse(moveTarget, 'mousemove', x, y, eventOpts)
      if (cursor) cursor.updatePosition({ x, y })
      await delay(stepMs)
    }

    dispatchMouse(moveTarget, 'mouseup', endPoint.x, endPoint.y, eventOpts)
    if (cursor) cursor.showClickEffect()
    await delay(140)
  }

  // ===========================================================================
  // Mirror actions
  // ===========================================================================

  const visitElement = async (el: HTMLElement | null): Promise<Point | null> => {
    if (!el) return null
    const r = el.getBoundingClientRect()
    const point: Point = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    const cursor = win.__mirrorDemo && win.__mirrorDemo.cursor
    if (cursor) await cursor.moveTo(point)
    return point
  }

  const attachDragGhost = (label: string): (() => void) => {
    const cursor = win.__mirrorDemo && win.__mirrorDemo.cursor
    if (!cursor) return () => {}
    const ghost = document.createElement('div')
    ghost.style.cssText =
      'position:fixed;width:80px;height:60px;' +
      'background:rgba(91,168,245,0.18);' +
      'border:2px solid rgba(91,168,245,0.85);' +
      'border-radius:6px;' +
      'box-shadow:0 6px 20px rgba(0,0,0,0.35);' +
      'pointer-events:none;z-index:999998;' +
      'display:flex;align-items:center;justify-content:center;' +
      'color:white;font-family:system-ui,-apple-system,sans-serif;' +
      'font-size:11px;font-weight:600;' +
      'text-shadow:0 1px 2px rgba(0,0,0,0.6);' +
      'transform:translate(0,0);opacity:0;' +
      'transition:opacity 180ms ease-out;'
    ghost.textContent = label || ''
    document.body.appendChild(ghost)

    let rafHandle = 0
    let alive = true
    const tick = (): void => {
      if (!alive) return
      const p = cursor.getPosition()
      ghost.style.left = p.x + 14 + 'px'
      ghost.style.top = p.y + 14 + 'px'
      rafHandle = requestAnimationFrame(tick)
    }
    requestAnimationFrame(() => {
      ghost.style.opacity = '1'
      tick()
    })

    return (): void => {
      alive = false
      if (rafHandle) cancelAnimationFrame(rafHandle)
      ghost.style.transition = 'opacity 220ms ease-in'
      ghost.style.opacity = '0'
      setTimeout(() => {
        ghost.remove()
      }, 240)
    }
  }

  /**
   * Synthesize a drop-zone preview around `targetEl` plus an insertion line
   * at `endPoint`. Used by `dropFromPalette` so the viewer sees *where* the
   * dragged item will land before the cursor finishes moving — same colors
   * and z-indices as the empty-canvas branch's indicators so both flows
   * feel identical. Returns a `destroy()` that fades them out.
   *
   * Insertion-line orientation follows the target's flex-direction:
   *   - horizontal layout → vertical line between siblings
   *   - vertical layout (default) → horizontal line between siblings
   */
  const showDropIndicators = (targetEl: HTMLElement, endPoint: Point): (() => void) => {
    const targetRect = targetEl.getBoundingClientRect()
    const targetStyle = window.getComputedStyle(targetEl)
    const isHor =
      targetStyle.display.startsWith('flex') &&
      (targetStyle.flexDirection || 'row').startsWith('row')

    const containerRing = document.createElement('div')
    containerRing.style.cssText =
      'position:fixed;' +
      'left:' +
      targetRect.left +
      'px;' +
      'top:' +
      targetRect.top +
      'px;' +
      'width:' +
      targetRect.width +
      'px;' +
      'height:' +
      targetRect.height +
      'px;' +
      'border:2px dashed #5BA8F5;' +
      'border-radius:8px;' +
      'background:rgba(91,168,245,0.05);' +
      'box-sizing:border-box;' +
      'pointer-events:none;z-index:999990;' +
      'opacity:0;transition:opacity 240ms ease-out;'
    document.body.appendChild(containerRing)

    const insertionLine = document.createElement('div')
    if (isHor) {
      // Vertical line between two horizontal siblings.
      insertionLine.style.cssText =
        'position:fixed;' +
        'left:' +
        (endPoint.x - 1) +
        'px;' +
        'top:' +
        (targetRect.top + 6) +
        'px;' +
        'width:3px;' +
        'height:' +
        Math.max(20, targetRect.height - 12) +
        'px;' +
        'background:#5BA8F5;' +
        'box-shadow:0 0 8px rgba(91,168,245,0.6);' +
        'border-radius:2px;' +
        'pointer-events:none;z-index:999991;' +
        'opacity:0;transition:opacity 200ms ease-out;'
    } else {
      // Horizontal line between two stacked siblings.
      insertionLine.style.cssText =
        'position:fixed;' +
        'left:' +
        (targetRect.left + 6) +
        'px;' +
        'top:' +
        (endPoint.y - 1) +
        'px;' +
        'width:' +
        Math.max(40, targetRect.width - 12) +
        'px;' +
        'height:3px;' +
        'background:#5BA8F5;' +
        'box-shadow:0 0 8px rgba(91,168,245,0.6);' +
        'border-radius:2px;' +
        'pointer-events:none;z-index:999991;' +
        'opacity:0;transition:opacity 200ms ease-out;'
    }
    document.body.appendChild(insertionLine)

    // Reveal just before the cursor arrives so the viewer's eye lands on
    // them at the same beat as the drop, not while the cursor is still far.
    const showAt = setTimeout(() => {
      containerRing.style.opacity = '1'
      insertionLine.style.opacity = '1'
    }, 600)

    return (): void => {
      clearTimeout(showAt)
      containerRing.style.transition = 'opacity 280ms ease-in'
      insertionLine.style.transition = 'opacity 200ms ease-in'
      containerRing.style.opacity = '0'
      insertionLine.style.opacity = '0'
      setTimeout(() => {
        containerRing.remove()
        insertionLine.remove()
      }, 300)
    }
  }

  /**
   * Glow ring + value chip around a property-panel field, so viewers can
   * track which field changed and what the new value is during
   * setProperty / pickColor. Two layers:
   *
   *   - A ring positioned-fixed over the element's rect, color matching
   *     Mirror's own focus-ring blue.
   *   - A floating chip "→ value" anchored to the element's right edge,
   *     truncated for long values. The chip is what makes the change
   *     legible at a glance — the ring just says "look here".
   *
   * The caller controls when both fade out via the returned destroy().
   * Callers should keep the ring visible for ≥600ms so the eye has time
   * to read the chip and match it to the preview update.
   */
  /**
   * Type `value` into a focused input character-by-character so viewers see
   * real character entry instead of an instant whole-string replacement.
   * Existing content is cleared first; each char fires an `input` event so
   * Mirror's reactive bindings update incrementally.
   */
  const typeIntoInput = async (
    input: HTMLInputElement,
    value: string,
    charDelayMs = 65
  ): Promise<void> => {
    // Clear existing content first so the viewer sees the field empty
    // before the new value appears.
    input.value = ''
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await delay(80)
    for (const ch of value) {
      input.value += ch
      input.dispatchEvent(new Event('input', { bubbles: true }))
      // Light variance (±25%) so the typing feels natural rather than mechanical.
      await delay(charDelayMs * (0.75 + Math.random() * 0.5))
    }
  }

  const highlightField = (el: HTMLElement, valueLabel: string, showChip = true): (() => void) => {
    const rect = el.getBoundingClientRect()

    const ring = document.createElement('div')
    ring.style.cssText =
      'position:fixed;' +
      'left:' +
      (rect.left - 4) +
      'px;' +
      'top:' +
      (rect.top - 4) +
      'px;' +
      'width:' +
      (rect.width + 8) +
      'px;' +
      'height:' +
      (rect.height + 8) +
      'px;' +
      'border:2px solid #5BA8F5;' +
      'border-radius:6px;' +
      'box-shadow:0 0 0 4px rgba(91,168,245,0.18), 0 0 12px rgba(91,168,245,0.5);' +
      'background:rgba(91,168,245,0.06);' +
      'box-sizing:border-box;' +
      'pointer-events:none;z-index:999992;' +
      'opacity:0;transition:opacity 220ms ease-out;'
    document.body.appendChild(ring)

    const chip = showChip ? document.createElement('div') : null
    if (chip) {
      const trimmed = valueLabel.length > 28 ? valueLabel.slice(0, 28) + '…' : valueLabel
      chip.textContent = '→ ' + trimmed
      chip.style.cssText =
        'position:fixed;' +
        'left:' +
        (rect.right + 12) +
        'px;' +
        'top:' +
        (rect.top + rect.height / 2 - 14) +
        'px;' +
        'background:rgba(91,168,245,0.95);' +
        'color:white;' +
        'padding:6px 12px;' +
        'border-radius:6px;' +
        'font-family:ui-monospace,SFMono-Regular,Menlo,monospace;' +
        'font-size:13px;font-weight:600;' +
        'white-space:nowrap;' +
        'box-shadow:0 4px 12px rgba(0,0,0,0.3);' +
        'pointer-events:none;z-index:999993;' +
        'opacity:0;transform:translateX(-6px);' +
        'transition:opacity 220ms ease-out,transform 220ms ease-out;'
      document.body.appendChild(chip)
    }

    requestAnimationFrame(() => {
      ring.style.opacity = '1'
      if (chip) {
        chip.style.opacity = '1'
        chip.style.transform = 'translateX(0)'
      }
    })

    return (): void => {
      ring.style.transition = 'opacity 260ms ease-in'
      ring.style.opacity = '0'
      if (chip) {
        chip.style.transition = 'opacity 220ms ease-in,transform 220ms ease-in'
        chip.style.opacity = '0'
        chip.style.transform = 'translateX(-6px)'
      }
      setTimeout(() => {
        ring.remove()
        if (chip) chip.remove()
      }, 280)
    }
  }

  const pressPaletteItem = (el: HTMLElement | null): (() => void) => {
    if (!el) return () => {}
    const prev = {
      transform: el.style.transform,
      boxShadow: el.style.boxShadow,
      transition: el.style.transition,
      filter: el.style.filter,
    }
    el.style.transition =
      'transform 140ms ease-out, box-shadow 140ms ease-out, filter 140ms ease-out'
    el.style.transform = (prev.transform || '') + ' scale(1.06)'
    el.style.boxShadow = '0 8px 24px rgba(91,168,245,0.55), 0 0 0 2px rgba(91,168,245,0.85) inset'
    el.style.filter = 'brightness(1.15)'
    return (): void => {
      el.style.transition =
        'transform 200ms ease-in, box-shadow 200ms ease-in, filter 200ms ease-in'
      el.style.transform = prev.transform
      el.style.boxShadow = prev.boxShadow
      el.style.filter = prev.filter
      setTimeout(() => {
        el.style.transition = prev.transition
      }, 220)
    }
  }

  const dropFromPalette = async (
    component: string,
    targetSel: Selector,
    at: { kind: 'index'; index: number } | { kind: 'zone'; zone: string }
  ): Promise<void> => {
    const lower = component.toLowerCase()
    const paletteEl =
      (document.querySelector(
        '#components-panel [data-id="comp-' + lower + '"]'
      ) as HTMLElement | null) ||
      (document.querySelector('#components-panel [data-id="' + lower + '"]') as HTMLElement | null)
    if (paletteEl) await visitElement(paletteEl)

    // Special case: empty / canvas-only editor (no node tree yet).
    {
      const editor = win.editor
      const codeBefore = editor && editor.state ? editor.state.doc.toString() : ''
      const trimmed = codeBefore.trim()
      const isEmpty = trimmed === ''
      const isCanvasOnly = /^canvas\b[^\n]*$/i.test(trimmed)
      if (isEmpty || isCanvasOnly) {
        const previewEl = document.querySelector('#preview') as HTMLElement | null
        if (!previewEl) throw new Error('dropFromPalette: #preview not found')
        const previewRect = previewEl.getBoundingClientRect()

        const NEW_W = 100
        const dropPoint: Point = {
          x: previewRect.left + 24 + NEW_W / 2,
          y: previewRect.top + 24 + NEW_W / 2,
        }

        const containerRing = document.createElement('div')
        containerRing.style.cssText =
          'position:fixed;' +
          'left:' +
          (previewRect.left + 8) +
          'px;' +
          'top:' +
          (previewRect.top + 8) +
          'px;' +
          'width:' +
          (previewRect.width - 16) +
          'px;' +
          'height:' +
          (previewRect.height - 16) +
          'px;' +
          'border:2px dashed #5BA8F5;' +
          'border-radius:8px;' +
          'background:rgba(91,168,245,0.05);' +
          'pointer-events:none;z-index:999990;' +
          'opacity:0;transition:opacity 240ms ease-out;'
        document.body.appendChild(containerRing)

        const insertionLine = document.createElement('div')
        insertionLine.style.cssText =
          'position:fixed;' +
          'left:' +
          (previewRect.left + 24) +
          'px;' +
          'top:' +
          (previewRect.top + 22) +
          'px;' +
          'width:' +
          Math.min(NEW_W * 1.5, previewRect.width - 48) +
          'px;' +
          'height:3px;' +
          'background:#5BA8F5;' +
          'box-shadow:0 0 8px rgba(91,168,245,0.6);' +
          'border-radius:2px;' +
          'pointer-events:none;z-index:999991;' +
          'opacity:0;transition:opacity 200ms ease-out;'
        document.body.appendChild(insertionLine)

        const releasePalette = pressPaletteItem(paletteEl)
        const destroyGhost = attachDragGhost(component)

        try {
          const showAt = setTimeout(() => {
            containerRing.style.opacity = '1'
            insertionLine.style.opacity = '1'
          }, 800)

          const newLine = component + ' w 100, h 100, bg #27272a, rad 8'
          const newCode = isEmpty ? newLine : trimmed + '\n\n' + newLine

          await withVisibleDrag(
            dropPoint,
            async () => {
              await win.__dragTest.setTestCode(newCode)
            },
            {
              moveMs: 2500,
              triggerFrac: 0.85,
              preHoldMs: 300,
              settleMs: 420,
            }
          )

          clearTimeout(showAt)
        } finally {
          releasePalette()
          destroyGhost()
          containerRing.style.transition = 'opacity 280ms ease-in'
          insertionLine.style.transition = 'opacity 200ms ease-in'
          containerRing.style.opacity = '0'
          insertionLine.style.opacity = '0'
          setTimeout(() => {
            containerRing.remove()
            insertionLine.remove()
          }, 300)
        }

        await win.__dragTest.waitForCompile()
        // Auto-select the dropped element so follow-up styling steps land
        // on it without an explicit selectInPreview. (Studio doesn't do
        // this on its own today.)
        const droppedIds = Array.from(document.querySelectorAll('#preview [data-mirror-id]')).map(
          el => el.getAttribute('data-mirror-id') as string
        )
        if (droppedIds.length > 0 && win.__dragTest && win.__dragTest.selectNode) {
          // The empty-canvas case creates a single new node (the canvas-only
          // case appends one). Pick the last one — most recently added —
          // since data-mirror-id is assigned in document order.
          win.__dragTest.selectNode(droppedIds[droppedIds.length - 1])
          await delay(120)
        }
        return
      }
    }

    const targetId = resolveSelector(targetSel)
    const targetEl = document.querySelector(
      '[data-mirror-id="' + targetId + '"]'
    ) as HTMLElement | null
    if (!targetEl) throw new Error('Target ' + targetId + ' not found')

    let endPoint: Point
    let chain = win.__dragTest.fromPalette(component).toContainer(targetId)
    if (at.kind === 'index') {
      endPoint = dropChildIndexPoint(targetEl, at.index)
      chain = chain.atIndex(at.index)
    } else {
      const r = targetEl.getBoundingClientRect()
      endPoint = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      chain = chain.atAlignmentZone(at.zone)
    }

    // Snapshot the preview's data-mirror-id set before the drop so we can
    // identify the new node afterwards. Studio doesn't auto-select the
    // dropped element today, which makes follow-up steps that style "the
    // thing we just dropped" fragile and feels like a UX bug. We bridge
    // it here by selecting the diff after the drop completes.
    const idsBefore = new Set(
      Array.from(document.querySelectorAll('#preview [data-mirror-id]')).map(
        el => el.getAttribute('data-mirror-id') as string
      )
    )

    const releasePalette = pressPaletteItem(paletteEl)
    const destroyGhost = attachDragGhost(component)
    // Drop-zone preview: dashed ring around the target container plus an
    // insertion line at the predicted landing point, so the viewer sees
    // where the new node will land before the cursor finishes its glide.
    const destroyDropIndicators = showDropIndicators(targetEl, endPoint)

    let result: any
    try {
      result = await withVisibleDrag(endPoint, () => chain.execute(), {
        moveMs: 1500,
        triggerFrac: 0.05,
        preHoldMs: 240,
        settleMs: 320,
      })
    } finally {
      releasePalette()
      destroyGhost()
      destroyDropIndicators()
    }
    if (!result || !result.success) {
      throw new Error('Drop failed: ' + ((result && result.error) || 'unknown'))
    }
    await win.__dragTest.waitForCompile()

    // Auto-select the freshly-dropped element. Diff the post-drop
    // data-mirror-id set against the snapshot taken before the drop;
    // the new node(s) are the difference. If multiple were added (rare
    // — a component with default children counts as one drop but
    // multiple IDs), select the first one, which is the dropped root.
    const newIds = Array.from(document.querySelectorAll('#preview [data-mirror-id]'))
      .map(el => el.getAttribute('data-mirror-id') as string)
      .filter(id => !idsBefore.has(id))
    if (newIds.length > 0 && win.__dragTest && win.__dragTest.selectNode) {
      win.__dragTest.selectNode(newIds[0])
      // Brief settle so the property panel has time to populate before
      // the next demo step assumes the selection is live.
      await delay(120)
    }
  }

  const drawInGrid = async (
    componentName: string,
    targetSel: Selector,
    fromCell: { x: number; y: number },
    toCell: { x: number; y: number },
    name?: string
  ): Promise<void> => {
    const lower = componentName.toLowerCase()
    const paletteEl =
      (document.querySelector(
        '#components-panel [data-id="comp-' + lower + '"]'
      ) as HTMLElement | null) ||
      (document.querySelector('#components-panel [data-id="' + lower + '"]') as HTMLElement | null)
    if (!paletteEl) {
      throw new Error('Palette item for ' + componentName + ' not found')
    }
    await visitElement(paletteEl)
    paletteEl.click()
    await delay(140)

    const targetId = resolveSelector(targetSel)
    if (!targetId) throw new Error('Grid target not resolvable')
    const grid = document.querySelector('[data-mirror-id="' + targetId + '"]') as HTMLElement | null
    if (!grid) throw new Error('Grid element ' + targetId + ' not in DOM')

    const gridApi = win.__mirrorGrid
    if (!gridApi) {
      throw new Error('window.__mirrorGrid not initialized — Studio test API must be loaded')
    }
    const geo = gridApi.readGridGeometry(grid)
    if (!geo) {
      throw new Error(
        'Grid ' +
          targetId +
          ' has no readable geometry (display=' +
          getComputedStyle(grid).display +
          ')'
      )
    }

    const cellCenter = (cell: { x: number; y: number }): Point => ({
      x: geo.rect.left + gridApi.cellCenterOffset(geo.columnSizes, geo.columnGap, cell.x - 1),
      y: geo.rect.top + gridApi.cellCenterOffset(geo.rowSizes, geo.rowGap, cell.y - 1),
    })

    const startPoint = cellCenter(fromCell)
    const endPoint = cellCenter(toCell)

    const sourceEl = (document.elementFromPoint(startPoint.x, startPoint.y) || grid) as HTMLElement
    await manualDrag(sourceEl, startPoint, endPoint, { durationMs: 700 })
    await delay(180)

    if (name) {
      const editor = win.editor
      if (!editor) throw new Error('window.editor not available — cannot apply name')
      const src = editor.state.doc.toString() as string
      const lines = src.split('\n')
      let targetLineIdx = -1
      for (let i = lines.length - 1; i >= 0; i--) {
        if (/^\s+Frame\b.*\bx \d+,\s*y \d+,\s*w \d+,\s*h \d+\s*$/.test(lines[i])) {
          targetLineIdx = i
          break
        }
      }
      if (targetLineIdx < 0) {
        throw new Error('drawInGrid: no Frame line with x/y/w/h found to apply name=' + name)
      }
      const oldLine = lines[targetLineIdx]
      const newLine = oldLine.replace(/^(\s+Frame )(.*)$/, '$1name ' + name + ', $2')
      let lineStart = 0
      for (let i = 0; i < targetLineIdx; i++) lineStart += lines[i].length + 1
      editor.dispatch({
        changes: { from: lineStart, to: lineStart + oldLine.length, insert: newLine },
      })
      await delay(160)
      if (win.__dragTest && win.__dragTest.waitForCompile) {
        await win.__dragTest.waitForCompile()
      }
    }
  }

  const moveElement = async (
    sourceSel: Selector,
    targetSel: Selector,
    index: number
  ): Promise<void> => {
    const sourceId = resolveSelector(sourceSel)
    const targetId = resolveSelector(targetSel)
    const sourceEl = document.querySelector(
      '[data-mirror-id="' + sourceId + '"]'
    ) as HTMLElement | null
    const targetEl = document.querySelector(
      '[data-mirror-id="' + targetId + '"]'
    ) as HTMLElement | null
    if (!targetEl) throw new Error('Target ' + targetId + ' not found')

    if (sourceEl) await visitElement(sourceEl)

    const endPoint = dropChildIndexPoint(targetEl, index)
    const chain = win.__dragTest.moveElement(sourceId).toContainer(targetId).atIndex(index)
    const result = await withVisibleDrag(endPoint, () => chain.execute(), {
      moveMs: 1500,
      triggerFrac: 0.05,
      preHoldMs: 240,
      settleMs: 320,
    })
    if (!result || !result.success) {
      throw new Error('Move failed: ' + ((result && result.error) || 'unknown'))
    }
    await win.__dragTest.waitForCompile()
  }

  const dragResize = async (
    sel: Selector,
    position: string,
    deltaX: number,
    deltaY: number,
    _opts?: unknown
  ): Promise<void> => {
    const nodeId = resolveSelector(sel)
    await win.__mirrorTest.interact.click(nodeId)
    await delay(220)
    const handle = document.querySelector(
      '.visual-overlay .resize-handles .resize-handle[data-position="' + position + '"]'
    ) as HTMLElement | null
    if (!handle) throw new Error('Resize handle not found for ' + position)

    await visitElement(handle)

    const r = handle.getBoundingClientRect()
    const startPoint: Point = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    const endPoint: Point = { x: startPoint.x + deltaX, y: startPoint.y + deltaY }
    await manualDrag(handle, startPoint, endPoint, { moveTarget: document.body })
    if (win.__dragTest && win.__dragTest.waitForCompile) {
      await win.__dragTest.waitForCompile()
    }
  }

  const dragPadding = async (
    sel: Selector,
    side: string,
    delta: number,
    mode: 'all' | 'axis' | 'single',
    _bypassSnap?: boolean
  ): Promise<void> => {
    const nodeId = resolveSelector(sel)
    win.__dragTest.selectNode(nodeId)
    if (
      document.activeElement &&
      document.activeElement !== document.body &&
      (document.activeElement as HTMLElement).blur
    ) {
      ;(document.activeElement as HTMLElement).blur()
    }
    await delay(150)
    await win.__mirrorTest.interact.enterPaddingMode(nodeId)
    const handle = document.querySelector('.padding-handle-' + side) as HTMLElement | null
    if (!handle) throw new Error('Padding handle not visible for ' + side)

    await visitElement(handle)

    const opts = mode === 'all' ? { shift: true } : mode === 'axis' ? { alt: true } : undefined
    await win.__mirrorTest.interact.dragPaddingHandle(side, delta, opts)
    if (win.__dragTest && win.__dragTest.waitForCompile) {
      await win.__dragTest.waitForCompile()
    }
    await win.__mirrorTest.interact.exitPaddingMode()
  }

  const dragMargin = async (
    sel: Selector,
    side: string,
    delta: number,
    mode: 'all' | 'axis' | 'single',
    _bypassSnap?: boolean
  ): Promise<void> => {
    const nodeId = resolveSelector(sel)
    win.__dragTest.selectNode(nodeId)
    if (
      document.activeElement &&
      document.activeElement !== document.body &&
      (document.activeElement as HTMLElement).blur
    ) {
      ;(document.activeElement as HTMLElement).blur()
    }
    await delay(150)
    await win.__mirrorTest.interact.enterMarginMode(nodeId)
    const handle = document.querySelector('.margin-handle-' + side) as HTMLElement | null
    if (!handle) throw new Error('Margin handle not visible for ' + side)

    await visitElement(handle)

    const opts = mode === 'all' ? { shift: true } : mode === 'axis' ? { alt: true } : undefined
    await win.__mirrorTest.interact.dragMarginHandle(side, delta, opts)
    if (win.__dragTest && win.__dragTest.waitForCompile) {
      await win.__dragTest.waitForCompile()
    }
    await win.__mirrorTest.interact.exitMarginMode()
  }

  const inlineEdit = async (sel: Selector, text: string, charDelay?: number): Promise<void> => {
    const nodeId = resolveSelector(sel)
    const cd = typeof charDelay === 'number' ? charDelay : 60
    if (win.__mirrorDemo && win.__mirrorDemo.cursor) {
      const el = document.querySelector('[data-mirror-id="' + nodeId + '"]') as HTMLElement | null
      if (el) {
        const r = el.getBoundingClientRect()
        await win.__mirrorDemo.cursor.moveTo(
          { x: r.left + r.width / 2, y: r.top + r.height / 2 },
          250
        )
        win.__mirrorDemo.cursor.showClickEffect()
        await delay(120)
        win.__mirrorDemo.cursor.showClickEffect()
        await delay(180)
      }
    }
    const controller = win.__mirrorStudio__ && win.__mirrorStudio__.inlineEdit
    if (!controller) throw new Error('InlineEditController not available')
    if (!controller.startEdit(nodeId)) {
      throw new Error('startEdit returned false for ' + nodeId)
    }

    let input: HTMLInputElement | null = null
    for (let i = 0; i < 30; i++) {
      input = document.querySelector('.inline-edit-input') as HTMLInputElement | null
      if (input) break
      await delay(30)
    }
    if (!input) throw new Error('inline-edit-input did not appear')

    input.value = ''
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await delay(120)
    for (const ch of text) {
      input.value += ch
      input.dispatchEvent(new Event('input', { bubbles: true }))
      await delay(cd)
    }
    await delay(200)
    if (typeof controller.endEdit === 'function') {
      controller.endEdit(true)
    } else {
      input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          bubbles: true,
          cancelable: true,
        })
      )
    }
    await delay(300)
  }

  // === Property-Panel actions (B1) ===

  /**
   * Read the currently-selected node id from Studio's runtime, falling
   * back to the DOM marker. Returns null if nothing's selected.
   * Used to skip redundant selectInPreview when chained setProperty /
   * pickColor calls target a node that's already selected — otherwise
   * each call would re-click the preview element and the viewer reads
   * a string of click ripples as "tapping the same thing over and over".
   */
  const getCurrentSelectionId = (): string | null => {
    try {
      const fromApi = win.__dragTest && win.__dragTest.getSelection && win.__dragTest.getSelection()
      if (typeof fromApi === 'string' && fromApi.length > 0) return fromApi
    } catch {
      // fall through to DOM fallback
    }
    const sel = document.querySelector('#preview [data-mirror-id].selected')
    return sel ? sel.getAttribute('data-mirror-id') : null
  }

  const selectInPreview = async (sel: Selector): Promise<void> => {
    const nodeId = resolveSelector(sel)
    const el = document.querySelector('[data-mirror-id="' + nodeId + '"]') as HTMLElement | null
    if (!el) throw new Error('selectInPreview: element ' + nodeId + ' not in DOM')
    const r = el.getBoundingClientRect()
    const endPoint: Point = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    await withSingleClick(endPoint, 350, async () => {
      win.__dragTest.selectNode(nodeId)
      await delay(150)
    })
  }

  /**
   * Used internally by setProperty / pickColor. Skips the click + select
   * if the node is already selected — avoids the rapid repeat clicks
   * the user reported when chaining several setProperty calls on the
   * same target.
   */
  const ensureSelected = async (sel: Selector): Promise<string> => {
    const nodeId = resolveSelector(sel)
    if (getCurrentSelectionId() === nodeId) return nodeId
    await selectInPreview(sel)
    return nodeId
  }

  const findPropertyInput = (propName: string): HTMLInputElement | HTMLSelectElement => {
    const sel =
      '#property-panel input[data-prop="' +
      propName +
      '"], #property-panel select[data-prop="' +
      propName +
      '"]'
    const input = document.querySelector(sel) as HTMLInputElement | HTMLSelectElement | null
    if (!input) {
      throw new Error(
        'Property field ' +
          JSON.stringify(propName) +
          ' not visible — is the right element selected and the section open?'
      )
    }
    return input
  }

  const setProperty = async (sel: Selector, propName: string, value: string): Promise<void> => {
    await ensureSelected(sel)
    let input: HTMLInputElement | HTMLSelectElement | null = null
    try {
      input = findPropertyInput(propName)
    } catch {
      input = null
    }
    if (input) {
      const r = input.getBoundingClientRect()
      const endPoint: Point = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      if (input.tagName.toLowerCase() === 'select') {
        // Selects can't be typed into — keep the ring + chip so the viewer
        // sees what value the dropdown was set to.
        const releaseHighlight = highlightField(input, propName + ' ' + value, true)
        await withSingleClick(endPoint, 250, async () => {
          input!.focus()
          ;(input as HTMLSelectElement).value = value
          input!.dispatchEvent(new Event('change', { bubbles: true }))
          await delay(100)
          input!.blur()
        })
        await delay(600)
        releaseHighlight()
      } else {
        // Text input: ring only, no chip — the chip would spoil the value
        // before the typing reveals it. The actual character-by-character
        // typing is the visible signal.
        const releaseHighlight = highlightField(input, '', false)
        await withSingleClick(endPoint, 250, async () => {
          input!.focus()
          ;(input as HTMLInputElement).select()
          // Brief dwell so the viewer sees the focus + selection state
          // before content is replaced.
          await delay(220)
          await typeIntoInput(input as HTMLInputElement, value)
          await delay(140)
          input!.dispatchEvent(new Event('change', { bubbles: true }))
          input!.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              bubbles: true,
              cancelable: true,
            })
          )
          await delay(120)
          input!.blur()
        })
        // Hold the ring after blur so the eye can lock on the new value
        // long enough to compare with the preview update.
        await delay(500)
        releaseHighlight()
      }
    } else {
      const panelEl = document.querySelector('#property-panel') as HTMLElement | null
      if (panelEl) {
        const r = panelEl.getBoundingClientRect()
        await withSingleClick({ x: r.left + r.width / 2, y: r.top + 60 }, 400, async () => {
          const studio = win.__mirrorStudio__
          const panel = studio && studio.propertyPanel
          if (!panel || typeof panel.changeProperty !== 'function') {
            throw new Error('setProperty: studio.propertyPanel.changeProperty not available')
          }
          panel.changeProperty(propName, value)
          await delay(180)
        })
      } else {
        const studio = win.__mirrorStudio__
        const panel = studio && studio.propertyPanel
        if (!panel || typeof panel.changeProperty !== 'function') {
          throw new Error('setProperty: panel input not visible and studio API unavailable')
        }
        panel.changeProperty(propName, value)
      }
    }
    await delay(180)
  }

  const pickColor = async (sel: Selector, propName: string, color: string): Promise<void> => {
    await ensureSelected(sel)
    const trigger = document.querySelector(
      '#property-panel [data-color-prop="' + propName + '"]'
    ) as HTMLElement | null
    if (!trigger) {
      throw new Error(
        'pickColor: color trigger for ' +
          JSON.stringify(propName) +
          ' not visible — is the right element selected?'
      )
    }
    const triggerRect = trigger.getBoundingClientRect()
    // Glow ring around the color swatch trigger so viewers see which
    // property is being edited. No chip — the typing into the hex input
    // (and the trigger swatch updating to the new color) is the visible
    // signal.
    const releaseHighlight = highlightField(trigger, propName + ' ' + color, false)
    await withSingleClick(
      {
        x: triggerRect.left + triggerRect.width / 2,
        y: triggerRect.top + triggerRect.height / 2,
      },
      250,
      async () => {
        trigger.click()
        await delay(420)
      }
    )

    // Wait for the picker's hex input to appear, then type the color into
    // it character by character — same UX as a human entering a hex code.
    // Falls back to the API call if the picker has no visible hex input.
    let hexInput: HTMLInputElement | null = null
    for (let i = 0; i < 30; i++) {
      hexInput =
        (document.getElementById('color-picker-hex-input') as HTMLInputElement | null) ||
        (document.querySelector('.canvas-color-picker-hex-input') as HTMLInputElement | null) ||
        (document.querySelector('.color-picker-hex-input') as HTMLInputElement | null)
      if (hexInput) break
      await delay(40)
    }

    if (hexInput) {
      // Move the cursor to the hex input so viewers see WHERE the color
      // is being typed, then type the value.
      const cursor = win.__mirrorDemo && win.__mirrorDemo.cursor
      const inputRect = hexInput.getBoundingClientRect()
      const inputPoint: Point = {
        x: inputRect.left + inputRect.width / 2,
        y: inputRect.top + inputRect.height / 2,
      }
      if (cursor) await cursor.moveTo(inputPoint, 350)

      hexInput.focus()
      hexInput.select()
      await delay(220)
      // Strip the leading '#' — the picker's hex input usually accepts
      // either form but typing without it feels more deliberate.
      await typeIntoInput(hexInput, color.replace(/^#/, ''))
      await delay(180)
      hexInput.dispatchEvent(new Event('change', { bubbles: true }))
      hexInput.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          bubbles: true,
          cancelable: true,
        })
      )
      // Hold so the viewer sees the picker's preview update before it closes.
      await delay(500)
      // Close the picker the natural way — Escape key.
      hexInput.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          code: 'Escape',
          bubbles: true,
          cancelable: true,
        })
      )
      document.body.click()
    } else {
      // Fallback: API path (older / different picker variants).
      document.body.click()
      await delay(150)
      const studio = win.__mirrorStudio__
      const panel = studio && studio.propertyPanel
      if (!panel || typeof panel.changeProperty !== 'function') {
        throw new Error('pickColor: studio.propertyPanel.changeProperty not available')
      }
      panel.changeProperty(propName, color)
    }
    // Hold the highlight ring after the picker closes so the eye locks
    // on the swatch trigger and registers the new color.
    await delay(500)
    releaseHighlight()
  }

  // === DOM snapshot (E2) ===

  const DOM_SCHEMA: Record<string, string[]> = {
    '*': [
      'tag',
      'text',
      'visible',
      'width',
      'height',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'marginTop',
      'marginRight',
      'marginBottom',
      'marginLeft',
      'color',
      'background',
      'childCount',
      'layout',
    ],
    button: ['disabled'],
    img: ['src', 'alt'],
    input: ['type', 'placeholder', 'value', 'disabled'],
  }

  const rgbToHex = (rgb: string): string => {
    if (!rgb) return ''
    if (rgb[0] === '#' || !rgb.startsWith('rgb')) return rgb
    const m = rgb.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/)
    if (!m) return rgb
    const r = parseInt(m[1], 10)
    const g = parseInt(m[2], 10)
    const b = parseInt(m[3], 10)
    const a = m[4] !== undefined ? parseFloat(m[4]) : 1
    const hex = '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')
    if (a < 1) {
      const ah = Math.round(a * 255)
        .toString(16)
        .padStart(2, '0')
      return hex + ah
    }
    return hex
  }

  const layoutInfo = (
    _el: HTMLElement,
    style: CSSStyleDeclaration
  ): { direction: 'horizontal' | 'vertical'; gap: number; align: string } | undefined => {
    const display = style.display
    if (display !== 'flex' && display !== 'inline-flex') return undefined
    const direction: 'horizontal' | 'vertical' = (style.flexDirection || 'row').startsWith('row')
      ? 'horizontal'
      : 'vertical'
    const gap = parseInt(style.gap || '0', 10)
    const j = style.justifyContent
    const a = style.alignItems
    let align = 'start'
    if (j === 'center' && a === 'center') align = 'center'
    else if (j === 'space-between') align = 'spread'
    else if (j === 'flex-end' || a === 'flex-end') align = 'end'
    return { direction, gap, align }
  }

  const snapshotElement = (nodeId: string, extras?: string[]): SnapshotResult => {
    const el = document.querySelector('[data-mirror-id="' + nodeId + '"]') as HTMLElement | null
    if (!el) throw new Error('snapshotElement: not found ' + nodeId)
    const style = window.getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    const tag = el.tagName.toLowerCase()
    const tagExtras = DOM_SCHEMA[tag] || []
    const fields = ([] as string[]).concat(DOM_SCHEMA['*'], tagExtras, extras || [])
    const out: Record<string, unknown> = {}
    for (const f of fields) {
      switch (f) {
        case 'tag':
          out.tag = tag
          break
        case 'text':
          out.text = (el.textContent || '').trim()
          break
        case 'visible':
          out.visible =
            rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none'
          break
        case 'width':
          out.width = Math.round(rect.width)
          break
        case 'height':
          out.height = Math.round(rect.height)
          break
        case 'paddingTop':
          out.paddingTop = parseInt(style.paddingTop || '0', 10)
          break
        case 'paddingRight':
          out.paddingRight = parseInt(style.paddingRight || '0', 10)
          break
        case 'paddingBottom':
          out.paddingBottom = parseInt(style.paddingBottom || '0', 10)
          break
        case 'paddingLeft':
          out.paddingLeft = parseInt(style.paddingLeft || '0', 10)
          break
        case 'marginTop':
          out.marginTop = parseInt(style.marginTop || '0', 10)
          break
        case 'marginRight':
          out.marginRight = parseInt(style.marginRight || '0', 10)
          break
        case 'marginBottom':
          out.marginBottom = parseInt(style.marginBottom || '0', 10)
          break
        case 'marginLeft':
          out.marginLeft = parseInt(style.marginLeft || '0', 10)
          break
        case 'color':
          out.color = rgbToHex(style.color)
          break
        case 'background':
          out.background = rgbToHex(style.backgroundColor)
          break
        case 'childCount':
          out.childCount = Array.from(el.children).filter(
            c => c.hasAttribute && c.hasAttribute('data-mirror-id')
          ).length
          break
        case 'layout': {
          const li = layoutInfo(el, style)
          if (li) out.layout = li
          break
        }
        case 'disabled':
          out.disabled = (el as HTMLButtonElement).disabled === true
          break
        case 'src':
          out.src = el.getAttribute('src') || ''
          break
        case 'alt':
          out.alt = el.getAttribute('alt') || ''
          break
        case 'type':
          out.type = el.getAttribute('type') || ''
          break
        case 'placeholder':
          out.placeholder = el.getAttribute('placeholder') || ''
          break
        case 'value':
          out.value = 'value' in el ? (el as HTMLInputElement).value : ''
          break
        default:
          if (f in style) out[f] = (style as any)[f]
          break
      }
    }
    return out
  }

  const snapshotAllByPreviewOrder = (): {
    selector: { byId: string }
    snapshot: SnapshotResult
  }[] => {
    const preview = document.getElementById('preview')
    if (!preview) return []
    const els = preview.querySelectorAll('[data-mirror-id]')
    const out: { selector: { byId: string }; snapshot: SnapshotResult }[] = []
    for (const el of Array.from(els)) {
      const id = el.getAttribute('data-mirror-id') as string
      out.push({ selector: { byId: id }, snapshot: snapshotElement(id, []) })
    }
    return out
  }

  // === AI / LLM-Edit-Flow (B2, E3) ===
  // The legacy ??-based draft-mode flow has been removed in favor of the new
  // LLM-Edit-Flow (Cmd+Enter → prompt-field → ghost-diff → Tab to accept).
  // The aiPrompt action below is intentionally a stub — it must be rewired
  // to the new flow before the AI demos can run again.

  const installAiMockListener = (): void => {
    // Stub: the new LLM-Edit-Flow uses runEditFlow + ghost-diff instead of
    // the draft:submit/ai-response event pair. A future iteration will mock
    // window.TauriBridge.agent.runAgent to return canned responses.
  }

  const aiPrompt = async (_promptText: string, _options?: unknown): Promise<unknown> => {
    throw new Error(
      'aiPrompt: pending rewire to LLM-Edit-Flow ' +
        '(Cmd+Enter → prompt-field → ghost-diff → Tab). ' +
        'See docs/archive/concepts/llm-edit-flow-plan.md.'
    )
  }

  const api: MirrorActionsAPI = {
    resolveSelector,
    dropChildIndexPoint,
    snapshotElement,
    snapshotAllByPreviewOrder,
    dropFromPalette,
    drawInGrid,
    moveElement,
    dragResize,
    dragPadding,
    dragMargin,
    inlineEdit,
    selectInPreview,
    setProperty,
    pickColor,
    aiPrompt,
    installAiMockListener,
  }
  ;(globalThis as any)[GLOBAL_KEY] = api
  return api
}
