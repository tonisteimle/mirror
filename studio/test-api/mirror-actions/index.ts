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
import { getDragController } from '../../preview/drag'
import type { DragSource } from '../../preview/drag'
import { setCurrentDragData, clearCurrentDragData } from '../../preview/drag-preview'
import { getFixture } from '../../preview/drag/test-api/fixtures'
import { LAYOUT_SECTION, COMPONENTS_SECTION } from '../../panels/components/layout-presets'

/**
 * Selectorish — a structured Selector OR a string shorthand. The runner
 * accepts strings like `'#node-2'`, `'node-2'`, `'"Save"'`, or
 * `'Card > Title'` and resolves them via the same rules as Selector.
 */
export type Selectorish = Selector | string

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
  resolveSelector(sel: Selectorish): string
  dropChildIndexPoint(targetEl: HTMLElement, index: number): Point
  snapshotElement(nodeId: string, extras?: string[]): SnapshotResult
  snapshotAllByPreviewOrder(): { selector: { byId: string }; snapshot: SnapshotResult }[]
  dropFromPalette(
    component: string,
    targetSel: Selectorish,
    at?: { kind: 'index'; index: number } | { kind: 'zone'; zone: string }
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

  const resolveSelector = (sel: Selector | string): string => {
    // String shorthand. Accepted forms:
    //   '#node-2'  → { byId: 'node-2' }   (CSS-id-like)
    //   'node-2'   → { byId: 'node-2' }   (raw mirror id)
    //   '"Save"'   → { byText: 'Save' }   (quoted text)
    //   anything else → byPath
    // Lifts selector boilerplate out of every script — scripts can pass
    // the most common forms as plain strings and the runner DWIMs.
    if (typeof sel === 'string') {
      const trimmed = sel.trim()
      if (trimmed.startsWith('#')) {
        return resolveSelector({ byId: trimmed.slice(1) })
      }
      if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ) {
        return resolveSelector({ byText: trimmed.slice(1, -1) })
      }
      // Looks like a Mirror node id (e.g. "node-2")?
      if (/^node-\d+$/.test(trimmed)) {
        return resolveSelector({ byId: trimmed })
      }
      // Default to byPath ('Card > Title' style).
      return resolveSelector({ byPath: trimmed })
    }
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
    await delay(opts.preHoldMs ?? 100)
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
    await delay(opts.settleMs ?? 160)
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
    settleMs = 90
  ): Promise<T> => {
    const cursor = win.__mirrorDemo && win.__mirrorDemo.cursor
    if (cursor && endPoint) await cursor.moveTo(endPoint, durationMs)
    if (cursor) cursor.showClickEffect()
    await delay(40)
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

  const dropFromPalette = async (
    component: string,
    targetSel: Selector,
    at?: { kind: 'index'; index: number } | { kind: 'zone'; zone: string }
  ): Promise<void> => {
    // If the script omits `at`, default to "append at the end" of the
    // target container. That's what most demo scripts mean — they just
    // want the new node added inside the container, position doesn't
    // matter — and the boilerplate `at: { kind: 'index', index: 0 }`
    // hidden in every drop step is noise.
    if (!at) {
      const targetForCount = document.querySelector(
        '[data-mirror-id="' +
          (typeof targetSel === 'string' ? targetSel : (targetSel as any).byId || '') +
          '"]'
      ) as HTMLElement | null
      const childCount = targetForCount
        ? Array.from(targetForCount.children).filter(c => c.hasAttribute('data-mirror-id')).length
        : 0
      at = { kind: 'index', index: childCount }
    }
    const lower = component.toLowerCase()
    const paletteEl =
      (document.querySelector(
        '#components-panel [data-id="comp-' + lower + '"]'
      ) as HTMLElement | null) ||
      (document.querySelector('#components-panel [data-id="' + lower + '"]') as HTMLElement | null)
    if (paletteEl) await visitElement(paletteEl)

    // Special case: empty / canvas-only editor (no node tree yet).
    // Studio's real DragController has no target container to highlight
    // when the preview tree is empty, so we write the new node directly
    // into the editor source and let the normal compile cycle render it.
    // No synthetic ring / insertion line / ghost — those were fake app
    // visuals that didn't match anything Studio actually shows.
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

        const newLine = component + ' w 100, h 100, bg #27272a, rad 8'
        const newCode = isEmpty ? newLine : trimmed + '\n\n' + newLine

        await withVisibleDrag(
          dropPoint,
          async () => {
            await win.__dragTest.setTestCode(newCode)
          },
          {
            moveMs: 700,
            triggerFrac: 0.85,
            preHoldMs: 100,
            settleMs: 140,
          }
        )

        await win.__dragTest.waitForCompile()
        // Auto-select the dropped element so follow-up styling steps land
        // on it without an explicit selectInPreview. (Studio doesn't do
        // this on its own today.)
        const droppedIds = Array.from(document.querySelectorAll('#preview [data-mirror-id]')).map(
          el => el.getAttribute('data-mirror-id') as string
        )
        if (droppedIds.length > 0 && win.__dragTest && win.__dragTest.selectNode) {
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
    if (at.kind === 'index') {
      endPoint = dropChildIndexPoint(targetEl, at.index)
    } else {
      const r = targetEl.getBoundingClientRect()
      endPoint = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
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

    // Drive Studio's REAL drag pipeline (DragController + Indicator). The
    // controller renders the genuine container highlight, alignment zones,
    // insertion line, and ghost rectangle — exactly what a real user sees.
    // No synthetic overlays.
    // Resolve the dragged component to a Studio source. We prefer the live
    // layout-preset registry (the same one the Component Panel renders
    // from — has the correct textContent / properties / mirTemplate for
    // primitives like H1-H6, Image, RadioGroup, …) over the test
    // fixtures, and fall back to a minimal synth for unknown names so
    // the drag pipeline never crashes on basic primitives.
    const presets = [...LAYOUT_SECTION, ...COMPONENTS_SECTION]
    const preset = presets.find(p => p.name.toLowerCase() === lower)
    const fallbackFixture = getFixture(component)
    const fixture = preset
      ? {
          componentName: preset.template ?? preset.name,
          textContent: preset.textContent,
          properties: preset.properties,
          mirTemplate: preset.mirTemplate,
          template: preset.template ?? preset.name,
          expectedLines: [],
          category: 'simple' as const,
        }
      : (fallbackFixture ?? {
          componentName: component,
          textContent: component,
          template: component,
          expectedLines: [`${component} "${component}"`],
          category: 'simple' as const,
        })

    const previewContainer = document.getElementById('preview') as HTMLElement | null
    if (!previewContainer) throw new Error('dropFromPalette: #preview not found')

    const dragSource: DragSource = {
      type: 'palette',
      componentName: fixture.componentName,
      template: fixture.template,
    }

    const cursor = win.__mirrorDemo && win.__mirrorDemo.cursor
    const controller = getDragController()

    // Set the global drag data so Studio's drop callback can read it.
    setCurrentDragData({
      componentName: fixture.componentName,
      properties: fixture.properties,
      textContent: fixture.textContent,
      mirTemplate: fixture.mirTemplate,
      fromComponentPanel: true,
    })

    try {
      // 1. Enter drag state — caches the layout, primes the indicator.
      controller.startDrag(dragSource, previewContainer)

      // 2. Move the demo cursor towards the drop point AND tick the
      //    DragController's updatePosition along the way so Studio's
      //    real ghost / container highlight / insertion line / alignment
      //    zones render naturally. We poll cursor position via rAF.
      const cursorStart = cursor ? cursor.getPosition() : { x: 0, y: 0 }
      const moveDur = cursor && cursor.calculateDuration ? cursor.calculateDuration(endPoint) : 700
      const moveMs = Math.max(450, moveDur)

      let alive = true
      let raf = 0
      const tick = (): void => {
        if (!alive) return
        const p = cursor ? cursor.getPosition() : endPoint
        controller.updatePosition({ x: p.x, y: p.y })
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)

      const motionPromise = cursor ? cursor.moveTo(endPoint, moveMs) : Promise.resolve()
      await motionPromise

      // Final tick at the exact drop point so the indicator settles.
      controller.updatePosition({ x: endPoint.x, y: endPoint.y })
      // Hold a beat so the viewer registers the indicator + ghost at rest.
      await delay(160)

      // 3. Apply the drop — DragController routes to studio's onDrop
      //    callback, which writes the new component into the editor.
      if (cursor) cursor.showClickEffect()
      alive = false
      cancelAnimationFrame(raf)
      await controller.drop()
    } finally {
      clearCurrentDragData()
    }

    await win.__dragTest.waitForCompile()

    // Auto-select the freshly-dropped element. Diff the post-drop
    // data-mirror-id set against the snapshot taken before the drop;
    // the new node(s) are the difference.
    const newIds = Array.from(document.querySelectorAll('#preview [data-mirror-id]'))
      .map(el => el.getAttribute('data-mirror-id') as string)
      .filter(id => !idsBefore.has(id))
    if (newIds.length > 0 && win.__dragTest && win.__dragTest.selectNode) {
      win.__dragTest.selectNode(newIds[0])
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
    // If the target is already selected — typically because dropFromPalette
    // auto-selected it, or because a previous step already touched it —
    // this is a no-op. Real users don't re-tap something they just
    // selected, and the extra click ripple reads as "the runner is
    // clicking on it again for no reason".
    if (getCurrentSelectionId() === nodeId) return
    const el = document.querySelector('[data-mirror-id="' + nodeId + '"]') as HTMLElement | null
    if (!el) throw new Error('selectInPreview: element ' + nodeId + ' not in DOM')
    const r = el.getBoundingClientRect()
    const endPoint: Point = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    await withSingleClick(endPoint, 350, async () => {
      win.__dragTest.selectNode(nodeId)
      await delay(150)
    })
  }

  /** Internal alias — kept so call sites read with intent. */
  const ensureSelected = async (sel: Selector): Promise<string> => {
    const nodeId = resolveSelector(sel)
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
        await withSingleClick(endPoint, 250, async () => {
          input!.focus()
          ;(input as HTMLSelectElement).value = value
          input!.dispatchEvent(new Event('change', { bubbles: true }))
          await delay(100)
          input!.blur()
        })
        await delay(200)
      } else {
        await withSingleClick(endPoint, 250, async () => {
          input!.focus()
          ;(input as HTMLInputElement).select()
          await delay(120)
          await typeIntoInput(input as HTMLInputElement, value)
          await delay(80)
          input!.dispatchEvent(new Event('change', { bubbles: true }))
          input!.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              bubbles: true,
              cancelable: true,
            })
          )
          await delay(80)
          input!.blur()
        })
        await delay(150)
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
    await delay(200)
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
