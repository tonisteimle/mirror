/**
 * Mirror Actions API — high-level test helpers built on top of `cdpInput`.
 *
 * **Grundregel** (siehe `docs/TEST-FRAMEWORK.md`): jede Aktion fließt durch
 * `cdpInput.*` (CDP Trusted Mouse + Keyboard). Helper hier sind nur
 * Sequenzen aus „Maus klickt da, Keyboard tippt das" — keine direkten
 * Studio-API-Calls, keine `el.click()` / `el.dispatchEvent(...)` /
 * `controller.startDrag()`-Hacks. Wenn das Bridge nicht installiert ist
 * (Studio ohne CDP-Runner), schlagen Helper laut fehl.
 *
 * Selektor-Auflösung und DOM-Snapshots leben hier auch, weil sie reine
 * Lese-Operationen sind und keinen Eingabepfad brauchen.
 *
 * Installs once at `window.__mirrorActions`.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { cdpInput, isCdpInputAvailable } from '../cdp-input-client'

/**
 * Selector — structured ways to identify a Mirror preview node. Defined
 * locally because the old demo-runner's `types.ts` (which previously
 * housed this) is gone with the rest of the demo stack.
 */
export type Selector =
  | { byId: string }
  | { byTestId: string }
  | { byText: string | RegExp; nth?: number }
  | { byTag: string; nth?: number }
  | { byRole: string; nth?: number }
  | { byPath: string; nth?: number }

/**
 * Selectorish — a structured Selector OR a string shorthand. The runner
 * accepts strings like `'#node-2'`, `'node-2'`, `'"Save"'`, or
 * `'Card > Title'` and resolves them via the same rules as Selector.
 */
export type Selectorish = Selector | string

type Point = { x: number; y: number }

type SnapshotResult = Record<string, unknown>

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
  // CDP guard — every helper requires the test-runner's input bridge.
  // ===========================================================================

  const requireCdp = (): void => {
    if (!isCdpInputAvailable()) {
      throw new Error(
        '[__mirrorActions] CDP input bridge not installed. ' +
          'These helpers drive the app exclusively through cdpInput.* ' +
          '(see docs/TEST-FRAMEWORK.md, „Grundprinzip — Maus und Keyboard"). ' +
          'Run via the CDP test runner.'
      )
    }
  }

  // ===========================================================================
  // Selector resolution — read-only, no input needed
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
    if (typeof sel === 'string') {
      const trimmed = sel.trim()
      if (trimmed.startsWith('#')) return resolveSelector({ byId: trimmed.slice(1) })
      if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
      )
        return resolveSelector({ byText: trimmed.slice(1, -1) })
      if (/^node-\d+$/.test(trimmed)) return resolveSelector({ byId: trimmed })
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
  // Geometry helpers
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

  const center = (el: HTMLElement): Point => {
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }

  const queryRequired = (selector: string, label: string): HTMLElement => {
    const el = document.querySelector(selector) as HTMLElement | null
    if (!el) throw new Error(label + ': ' + selector + ' not found in DOM')
    return el
  }

  // ===========================================================================
  // CDP primitives — every action goes through these (no other path).
  // ===========================================================================

  /** Single trusted click at a viewport point. */
  const click = async (p: Point): Promise<void> => {
    requireCdp()
    await cdpInput.mouseClick({ x: p.x, y: p.y })
  }

  /** Trusted double click at a viewport point. */
  const doubleClick = async (p: Point): Promise<void> => {
    requireCdp()
    await cdpInput.mouseDoubleClick({ x: p.x, y: p.y })
  }

  /**
   * Trusted drag: press at `from`, move along the path, release at `to`.
   *
   * `steps` controls how many intermediate `mouseMove` events are
   * dispatched. ≥6 is enough to satisfy Chrome's HTML5-drag slop and to
   * tick Studio's drop-indicator multiple times. Each step carries
   * `buttons=1` so the browser knows the button is still held.
   *
   * `dwellMs` holds the cursor at `to` with the button still pressed —
   * gives Studio's drop-indicator a beat to render before release.
   */
  const drag = async (
    from: Point,
    to: Point,
    opts: { steps?: number; preHoldMs?: number; dwellMs?: number; settleMs?: number } = {}
  ): Promise<void> => {
    requireCdp()
    const steps = Math.max(6, opts.steps ?? 12)
    await cdpInput.mouseDown({ x: from.x, y: from.y })
    if (opts.preHoldMs) await delay(opts.preHoldMs)
    // First move with a small offset so Chrome arms HTML5 dragstart.
    await cdpInput.mouseMove({ x: from.x + 8, y: from.y + 8 })
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const x = from.x + (to.x - from.x) * t
      const y = from.y + (to.y - from.y) * t
      await cdpInput.mouseMove({ x, y })
      // tiny pause keeps drag indicators legible and gives the browser
      // time to fire dragover before the next move.
      await delay(8)
    }
    if (opts.dwellMs) await delay(opts.dwellMs)
    await cdpInput.mouseUp({ x: to.x, y: to.y })
    if (opts.settleMs) await delay(opts.settleMs)
  }

  /** Trusted Tab keypress (used as commit-by-blur signal). */
  const pressTab = async (): Promise<void> => {
    requireCdp()
    await cdpInput.keyDown({ key: 'Tab' })
    await cdpInput.keyUp({ key: 'Tab' })
  }

  /** Trusted Enter keypress. */
  const pressEnter = async (): Promise<void> => {
    requireCdp()
    await cdpInput.keyDown({ key: 'Enter' })
    await cdpInput.keyUp({ key: 'Enter' })
  }

  /** Trusted Escape keypress. */
  const pressEscape = async (): Promise<void> => {
    requireCdp()
    await cdpInput.keyDown({ key: 'Escape' })
    await cdpInput.keyUp({ key: 'Escape' })
  }

  /**
   * Insert text into the currently-focused field via CDP `Input.insertText`.
   * Existing content is replaced via Cmd+A (select all) — same path a user
   * takes. No `el.select()` shortcut, no synthetic events.
   */
  const typeIntoFocused = async (text: string, replaceExisting = true): Promise<void> => {
    requireCdp()
    if (replaceExisting) {
      // Cmd+A on macOS / Ctrl+A on Linux+Windows. CDP modifiers bit 4 = Meta,
      // bit 2 = Ctrl. We send Meta because Studio targets macOS; tests on
      // other platforms can override via direct cdpInput calls.
      await cdpInput.keyDown({ key: 'a', code: 'KeyA', modifiers: { meta: true } })
      await cdpInput.keyUp({ key: 'a', code: 'KeyA', modifiers: { meta: true } })
    }
    await cdpInput.typeText({ text })
  }

  // ===========================================================================
  // Compile / wait helpers
  // ===========================================================================

  const waitForCompile = async (): Promise<void> => {
    if (win.__dragTest && typeof win.__dragTest.waitForCompile === 'function') {
      await win.__dragTest.waitForCompile()
    } else {
      // Best-effort settle for tests/demos that don't expose __dragTest.
      await delay(80)
    }
  }

  // ===========================================================================
  // Public actions
  // ===========================================================================

  /**
   * Drag a palette item to a target container in the preview.
   * Drives Studio's real HTML5-drag pipeline (dragstart → dragover×N → drop)
   * via CDP mouse events. No `controller.startDrag()` shortcut, no fake
   * cursor — the events that arrive at Studio are the same the browser
   * would dispatch for a human user.
   */
  const dropFromPalette = async (
    component: string,
    targetSel: Selectorish,
    at?: { kind: 'index'; index: number } | { kind: 'zone'; zone: string }
  ): Promise<void> => {
    requireCdp()
    const lower = component.toLowerCase()
    const paletteEl =
      (document.querySelector(
        '#components-panel [data-id="comp-' + lower + '"]'
      ) as HTMLElement | null) ||
      (document.querySelector('#components-panel [data-id="' + lower + '"]') as HTMLElement | null)
    if (!paletteEl) throw new Error('Palette item for ' + component + ' not found')

    const startPoint = center(paletteEl)

    // Compute target landing point. Resolve target lazily — empty editor
    // has no node tree, so byId/byPath would throw.
    let endPoint: Point
    let targetId: string | null = null
    try {
      targetId = resolveSelector(targetSel)
    } catch (_e) {
      targetId = null
    }
    const targetEl = targetId
      ? (document.querySelector('[data-mirror-id="' + targetId + '"]') as HTMLElement | null)
      : null

    if (targetEl) {
      // Default to "append at end" if `at` is omitted.
      const childCount = Array.from(targetEl.children).filter(c =>
        c.hasAttribute('data-mirror-id')
      ).length
      const effective = at ?? { kind: 'index' as const, index: childCount }
      if (effective.kind === 'index') {
        endPoint = dropChildIndexPoint(targetEl, effective.index)
      } else {
        endPoint = center(targetEl)
      }
    } else {
      // Empty/canvas-only preview — drop just inside the preview pane so
      // Mirror's onDrop callback creates a top-level node.
      const preview = queryRequired('#preview', 'dropFromPalette')
      const r = preview.getBoundingClientRect()
      endPoint = { x: r.left + 80, y: r.top + 80 }
    }

    // Snapshot ids so we can find the freshly-dropped node afterwards.
    const idsBefore = new Set(
      Array.from(document.querySelectorAll('#preview [data-mirror-id]')).map(
        el => el.getAttribute('data-mirror-id') as string
      )
    )

    await drag(startPoint, endPoint, {
      steps: 14,
      preHoldMs: 60,
      dwellMs: 140,
      settleMs: 120,
    })

    await waitForCompile()

    // Auto-select the freshly-dropped element (Studio doesn't do this on
    // its own today). Diff the post-drop id-set against the snapshot.
    const newIds = Array.from(document.querySelectorAll('#preview [data-mirror-id]'))
      .map(el => el.getAttribute('data-mirror-id') as string)
      .filter(id => !idsBefore.has(id))
    if (newIds.length > 0) {
      // Click the new node via CDP so the selection goes through the same
      // pipeline as a user clicking it.
      const newEl = document.querySelector(
        '[data-mirror-id="' + newIds[0] + '"]'
      ) as HTMLElement | null
      if (newEl) await click(center(newEl))
    }
  }

  /**
   * Draw a rectangle in a Grid container by dragging from one cell to
   * another. Studio's grid-draw mode reads the start cell on mousedown
   * and updates the rect on mousemove until mouseup.
   *
   * `name` is applied as a follow-up via the property panel; the
   * old direct-editor-write path was a Studio-internal shortcut.
   */
  const drawInGrid = async (
    componentName: string,
    targetSel: Selector,
    fromCell: { x: number; y: number },
    toCell: { x: number; y: number },
    _name?: string
  ): Promise<void> => {
    requireCdp()
    const lower = componentName.toLowerCase()
    const paletteEl =
      (document.querySelector(
        '#components-panel [data-id="comp-' + lower + '"]'
      ) as HTMLElement | null) ||
      (document.querySelector('#components-panel [data-id="' + lower + '"]') as HTMLElement | null)
    if (!paletteEl) throw new Error('Palette item for ' + componentName + ' not found')

    // Click to arm the palette item (Studio's grid-draw mode listens for
    // a palette click before the drag starts).
    await click(center(paletteEl))
    await delay(120)

    const targetId = resolveSelector(targetSel)
    const grid = document.querySelector('[data-mirror-id="' + targetId + '"]') as HTMLElement | null
    if (!grid) throw new Error('Grid element ' + targetId + ' not in DOM')

    const gridApi = win.__mirrorGrid
    if (!gridApi) throw new Error('window.__mirrorGrid not initialized — Studio test API needed')
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

    const cellPoint = (cell: { x: number; y: number }): Point => ({
      x: geo.rect.left + gridApi.cellCenterOffset(geo.columnSizes, geo.columnGap, cell.x - 1),
      y: geo.rect.top + gridApi.cellCenterOffset(geo.rowSizes, geo.rowGap, cell.y - 1),
    })

    await drag(cellPoint(fromCell), cellPoint(toCell), {
      steps: 14,
      preHoldMs: 60,
      dwellMs: 100,
      settleMs: 120,
    })
    await waitForCompile()
  }

  /** Move an existing preview element into a new container at `index`. */
  const moveElement = async (
    sourceSel: Selector,
    targetSel: Selector,
    index: number
  ): Promise<void> => {
    requireCdp()
    const sourceId = resolveSelector(sourceSel)
    const targetId = resolveSelector(targetSel)
    const sourceEl = document.querySelector(
      '[data-mirror-id="' + sourceId + '"]'
    ) as HTMLElement | null
    const targetEl = document.querySelector(
      '[data-mirror-id="' + targetId + '"]'
    ) as HTMLElement | null
    if (!sourceEl) throw new Error('Source ' + sourceId + ' not found')
    if (!targetEl) throw new Error('Target ' + targetId + ' not found')

    const startPoint = center(sourceEl)
    const endPoint = dropChildIndexPoint(targetEl, index)

    await drag(startPoint, endPoint, {
      steps: 16,
      preHoldMs: 100,
      dwellMs: 140,
      settleMs: 160,
    })
    await waitForCompile()
  }

  /** Click a preview element to select it. */
  const selectInPreview = async (sel: Selector): Promise<void> => {
    requireCdp()
    const id = resolveSelector(sel)
    const el = document.querySelector('[data-mirror-id="' + id + '"]') as HTMLElement | null
    if (!el) throw new Error('selectInPreview: ' + id + ' not found')
    await click(center(el))
    await delay(80)
  }

  // ===========================================================================
  // Property panel — find input by data-prop, click, type, blur
  // ===========================================================================

  const findPropertyInput = (propName: string): HTMLInputElement | HTMLSelectElement => {
    const aliases: Record<string, string> = {
      bg: 'background',
      background: 'background',
      col: 'col',
      color: 'col',
      pad: 'padding',
      padding: 'padding',
      mar: 'margin',
      margin: 'margin',
      rad: 'radius',
      radius: 'radius',
      bor: 'border',
      border: 'border',
      boc: 'borderColor',
      fs: 'font-size',
      'font-size': 'font-size',
      weight: 'weight',
      gap: 'gap',
      w: 'width',
      width: 'width',
      h: 'height',
      height: 'height',
      ic: 'icon-color',
      'icon-color': 'icon-color',
      is: 'icon-size',
      'icon-size': 'icon-size',
      o: 'opacity',
      opacity: 'opacity',
    }
    const candidates = [propName, aliases[propName] || propName]
    for (const name of candidates) {
      const el = document.querySelector('#property-panel [data-prop="' + name + '"]') as
        | HTMLInputElement
        | HTMLSelectElement
        | null
      if (el && el.offsetParent !== null) return el
    }
    throw new Error(
      'setProperty: no visible [data-prop="' +
        propName +
        '"] input in property panel — is the right element selected?'
    )
  }

  const ensureSelected = async (sel: Selector): Promise<string> => {
    const id = resolveSelector(sel)
    await selectInPreview(sel)
    // Wait for the property panel to (re)render against the selection.
    for (let i = 0; i < 20; i++) {
      const panel = document.getElementById('property-panel')
      if (panel && panel.querySelector('input[data-prop], select[data-prop]')) return id
      await delay(50)
    }
    return id
  }

  /**
   * Edit a property via the property panel — click the input, replace its
   * value with `value`, commit by Tab (blur). Pure CDP path.
   */
  const setProperty = async (sel: Selector, propName: string, value: string): Promise<void> => {
    requireCdp()
    await ensureSelected(sel)
    const input = findPropertyInput(propName)
    const target = center(input as HTMLElement)
    if (input.tagName.toLowerCase() === 'select') {
      await selectDropdownByValue(input as HTMLSelectElement, target, value)
      await waitForCompile()
      return
    }
    await click(target)
    await delay(60)
    await typeIntoFocused(value, true)
    await pressTab()
    await waitForCompile()
  }

  /**
   * Choose `value` from a native <select> via real keyboard interaction:
   *   1. Click the select to give it focus.
   *   2. Press the first letter of the option's display text — browser
   *      typeahead jumps to the matching option (works for short option
   *      lists; for ambiguous prefixes we fall back to ArrowDown to walk).
   *   3. Press Enter to commit.
   *
   * No `(select).value = ...` shortcut.
   */
  const selectDropdownByValue = async (
    sel: HTMLSelectElement,
    selCenter: Point,
    targetValue: string
  ): Promise<void> => {
    await click(selCenter)
    await delay(60)
    // Find target option. Match by `value` first, then visible text.
    const options = Array.from(sel.options)
    const targetIdx = options.findIndex(
      o => o.value === targetValue || (o.textContent || '').trim() === targetValue
    )
    if (targetIdx < 0) {
      throw new Error(
        `setProperty: no option with value/text "${targetValue}" in select (have: ${options
          .map(o => o.value)
          .join(', ')})`
      )
    }
    const startIdx = sel.selectedIndex >= 0 ? sel.selectedIndex : 0
    // Walk via ArrowDown / ArrowUp from the currently-selected index.
    const delta = targetIdx - startIdx
    const stepKey = delta >= 0 ? 'ArrowDown' : 'ArrowUp'
    const steps = Math.abs(delta)
    for (let i = 0; i < steps; i++) {
      await cdpInput.keyDown({ key: stepKey })
      await cdpInput.keyUp({ key: stepKey })
      await delay(20)
    }
    // Some Chromium variants commit on close (Tab/Escape); Enter is the
    // user-canonical path that works across platforms.
    await pressEnter()
    await delay(60)
  }

  /**
   * Pick a color value via the property panel — click the swatch trigger
   * to open the color picker, then type the hex into the picker's hex
   * input and commit with Enter.
   */
  const pickColor = async (sel: Selector, propName: string, color: string): Promise<void> => {
    requireCdp()
    await ensureSelected(sel)
    const trigger = document.querySelector(
      '#property-panel [data-color-prop="' + propName + '"]'
    ) as HTMLElement | null
    if (!trigger || trigger.offsetParent === null) {
      throw new Error('pickColor: no visible [data-color-prop="' + propName + '"] trigger')
    }
    await click(center(trigger))
    // Wait for the picker's hex input to appear.
    let hex: HTMLInputElement | null = null
    for (let i = 0; i < 30; i++) {
      hex =
        (document.getElementById('color-picker-hex-input') as HTMLInputElement | null) ||
        (document.querySelector('.canvas-color-picker-hex-input') as HTMLInputElement | null) ||
        (document.querySelector('.color-picker-hex-input') as HTMLInputElement | null)
      if (hex && hex.offsetParent !== null) break
      await delay(40)
    }
    if (!hex) throw new Error('pickColor: hex input did not appear in color picker')
    await click(center(hex))
    await delay(40)
    await typeIntoFocused(color.replace(/^#/, ''), true)
    await pressEnter()
    await delay(60)
    await pressEscape()
    await waitForCompile()
  }

  /**
   * Inline-edit the text of a Mirror text element. Double-click to enter
   * edit mode, type the new text, commit with Enter.
   */
  const inlineEdit = async (sel: Selector, text: string, _charDelay?: number): Promise<void> => {
    requireCdp()
    const id = resolveSelector(sel)
    const el = document.querySelector('[data-mirror-id="' + id + '"]') as HTMLElement | null
    if (!el) throw new Error('inlineEdit: ' + id + ' not found')
    await doubleClick(center(el))
    // Wait for the inline-edit input to take focus.
    for (let i = 0; i < 30; i++) {
      const active = document.activeElement as HTMLElement | null
      if (
        active &&
        active !== document.body &&
        (active.isContentEditable || active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')
      )
        break
      await delay(40)
    }
    await typeIntoFocused(text, true)
    await pressEnter()
    await waitForCompile()
  }

  // ===========================================================================
  // Visual handles — resize / padding / margin
  // ===========================================================================

  const dragResize = async (
    sel: Selector,
    position: string,
    deltaX: number,
    deltaY: number,
    _opts?: unknown
  ): Promise<void> => {
    requireCdp()
    await ensureSelected(sel)
    const handle = document.querySelector(
      '.visual-overlay .resize-handles .resize-handle[data-position="' + position + '"]'
    ) as HTMLElement | null
    if (!handle) throw new Error('Resize handle not found for ' + position)
    const start = center(handle)
    const end = { x: start.x + deltaX, y: start.y + deltaY }
    await drag(start, end, { steps: 12, preHoldMs: 80, dwellMs: 80, settleMs: 120 })
    await waitForCompile()
  }

  const sideToHandle = (kind: 'padding' | 'margin', side: string): string =>
    '.' + kind + '-handle-' + side

  const handleDragWithModifier = async (
    handleSel: string,
    side: string,
    delta: number,
    mode: 'all' | 'axis' | 'single'
  ): Promise<void> => {
    const handle = document.querySelector(handleSel) as HTMLElement | null
    if (!handle) throw new Error('Handle not found: ' + handleSel)
    const start = center(handle)
    // Vertical sides → drag along Y; horizontal sides → drag along X.
    const isVertical = side === 'top' || side === 'bottom'
    const end = isVertical
      ? { x: start.x, y: start.y + (side === 'top' ? -delta : delta) }
      : { x: start.x + (side === 'left' ? -delta : delta), y: start.y }

    requireCdp()
    const modKey = mode === 'all' ? 'Shift' : mode === 'axis' ? 'Alt' : null
    if (modKey) await cdpInput.keyDown({ key: modKey })
    try {
      await drag(start, end, {
        steps: 12,
        preHoldMs: 80,
        dwellMs: 80,
        settleMs: 120,
      })
    } finally {
      if (modKey) await cdpInput.keyUp({ key: modKey })
    }
  }

  const dragPadding = async (
    sel: Selector,
    side: string,
    delta: number,
    mode: 'all' | 'axis' | 'single',
    _bypassSnap?: boolean
  ): Promise<void> => {
    requireCdp()
    await ensureSelected(sel)
    // Studio's padding mode is entered by clicking a "padding" toggle in
    // the property panel. The handles only render once that mode is on.
    const padToggle = document.querySelector(
      '#property-panel [data-mode-toggle="padding"]'
    ) as HTMLElement | null
    if (padToggle && padToggle.offsetParent !== null) {
      await click(center(padToggle))
      await delay(80)
    }
    await handleDragWithModifier(sideToHandle('padding', side), side, delta, mode)
    await waitForCompile()
    // Exit padding mode if a toggle is visible.
    if (padToggle && padToggle.offsetParent !== null) {
      await click(center(padToggle))
      await delay(80)
    }
  }

  const dragMargin = async (
    sel: Selector,
    side: string,
    delta: number,
    mode: 'all' | 'axis' | 'single',
    _bypassSnap?: boolean
  ): Promise<void> => {
    requireCdp()
    await ensureSelected(sel)
    const marToggle = document.querySelector(
      '#property-panel [data-mode-toggle="margin"]'
    ) as HTMLElement | null
    if (marToggle && marToggle.offsetParent !== null) {
      await click(center(marToggle))
      await delay(80)
    }
    await handleDragWithModifier(sideToHandle('margin', side), side, delta, mode)
    await waitForCompile()
    if (marToggle && marToggle.offsetParent !== null) {
      await click(center(marToggle))
      await delay(80)
    }
  }

  // ===========================================================================
  // DOM snapshot — read-only
  // ===========================================================================

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

  // ===========================================================================
  // AI / LLM-Edit-Flow stubs (pending rewire)
  // ===========================================================================

  const installAiMockListener = (): void => {
    // Pending rewire to the new LLM-Edit-Flow (Cmd+Enter → prompt-field →
    // ghost-diff → Tab to accept). When restored, will mock
    // window.TauriBridge.agent.runAgent to return canned responses.
  }

  const aiPrompt = async (_promptText: string, _options?: unknown): Promise<unknown> => {
    throw new Error(
      'aiPrompt: pending rewire to LLM-Edit-Flow (Cmd+Enter → prompt-field → ghost-diff → Tab).'
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
