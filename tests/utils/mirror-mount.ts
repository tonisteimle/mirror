/**
 * Mirror DOM Mount Helper for Vitest+jsdom
 *
 * Compiles a Mirror DSL source string and mounts the resulting DOM into a
 * jsdom container. Provides node-id-keyed inspection helpers that mirror
 * the browser test API surface (`api.preview.inspect`, `api.assert.hasStyle`)
 * so generated tests can move from CDP browser tests to Vitest with minimal
 * shape change.
 *
 * Use this for tests that only need: compile DSL → assert tag/text/style/
 * children. For tests that need real interactions (drag, keyboard, focus,
 * computed-layout), keep using the browser test runner.
 */

import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

/** Stub runtime exposed at globalThis._runtime — same shape used in tests/behavior/. */
function installRuntimeStub(): void {
  const g = globalThis as Record<string, unknown>
  if (g._runtime) return
  g._runtime = {
    createChart: async () => {},
    updateChart: () => {},
    registerToken: () => {},
    bindText: () => {},
    registerExclusiveGroup: () => {},
  }
  if (typeof g.IntersectionObserver === 'undefined') {
    g.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
  }
  if (typeof g.ResizeObserver === 'undefined') {
    g.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
}

export interface NodeInfo {
  nodeId: string
  tagName: string
  /** Direct text content (not from children). */
  textContent: string
  /** Full text content including descendants. */
  fullText: string
  /** Computed (and color-normalised) styles. */
  styles: Record<string, string>
  /** Inline `style` declaration (raw). */
  style: CSSStyleDeclaration
  /** All HTML attributes (excluding data-*). */
  attributes: Record<string, string>
  /** Just the data-* attributes. */
  dataAttributes: Record<string, string>
  /** Child mirror node ids. */
  children: string[]
  /** Parent mirror node id. */
  parent: string | null
  /** Direct child NodeInfo objects (recursive convenience). */
  childInfos: NodeInfo[]
}

export interface MirrorMount {
  /** The mounted root element. */
  root: HTMLElement
  /** All node-id values currently in the mounted tree, in document order. */
  getNodeIds(): string[]
  /** Inspect a node by its data-mirror-id (e.g., "node-1"). */
  inspect(nodeId: string): NodeInfo | null
  /** Direct DOM access for an id. */
  byId(nodeId: string): HTMLElement | null
  /** Cleanup the mount. */
  unmount(): void
}

/** Subset of computed styles that compiler-verification & tutorial tests read. */
const STYLE_KEYS: ReadonlyArray<string> = [
  'display',
  'flexDirection',
  'flexWrap',
  'justifyContent',
  'alignItems',
  'gap',
  'position',
  'left',
  'top',
  'right',
  'bottom',
  'zIndex',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'backgroundColor',
  'background',
  'backgroundImage',
  'color',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderWidth',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
  'borderStyle',
  'fontSize',
  'fontWeight',
  'fontFamily',
  'fontStyle',
  'lineHeight',
  'textAlign',
  'textTransform',
  'textDecoration',
  'whiteSpace',
  'letterSpacing',
  'opacity',
  'transform',
  'transition',
  'animation',
  'cursor',
  'overflow',
  'overflowX',
  'overflowY',
  'visibility',
  'boxShadow',
  'filter',
  'backdropFilter',
  'gridTemplateColumns',
  'gridTemplateRows',
  'gridGap',
  'rowGap',
  'columnGap',
  'aspectRatio',
  'objectFit',
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'order',
  'alignSelf',
  'justifySelf',
]

const COLOR_STYLE_KEYS = new Set([
  'color',
  'backgroundColor',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
])

function getDirectText(el: HTMLElement): string {
  let text = ''
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 3 /* TEXT_NODE */) text += node.textContent || ''
  }
  return text.trim()
}

function extractStyles(el: HTMLElement): Record<string, string> {
  const view = el.ownerDocument.defaultView
  if (!view) return {}
  const computed = view.getComputedStyle(el)
  const out: Record<string, string> = {}
  for (const key of STYLE_KEYS) {
    const kebab = key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)
    let value = computed.getPropertyValue(kebab)
    if (!value) value = (computed as unknown as Record<string, string>)[key] ?? ''
    if (value && COLOR_STYLE_KEYS.has(key)) value = normalizeColorValue(value)
    out[key] = value
  }
  return out
}

function getMirrorChildIds(el: HTMLElement): string[] {
  const out: string[] = []
  const walk = (parent: Element) => {
    for (const child of Array.from(parent.children)) {
      const id = (child as HTMLElement).dataset?.mirrorId
      if (id) out.push(id)
      else walk(child)
    }
  }
  walk(el)
  return out
}

function getMirrorParentId(el: HTMLElement): string | null {
  let p = el.parentElement
  while (p) {
    const id = p.dataset?.mirrorId
    if (id) return id
    p = p.parentElement
  }
  return null
}

function elementToInfo(el: HTMLElement): NodeInfo {
  const attributes: Record<string, string> = {}
  const dataAttributes: Record<string, string> = {}
  for (const attr of Array.from(el.attributes)) {
    if (attr.name.startsWith('data-')) dataAttributes[attr.name] = attr.value
    else attributes[attr.name] = attr.value
  }
  const childInfos: NodeInfo[] = []
  for (const child of Array.from(el.children)) {
    if (child instanceof HTMLElement && child.dataset.mirrorId) {
      childInfos.push(elementToInfo(child))
    }
  }
  return {
    nodeId: el.dataset.mirrorId ?? '',
    tagName: el.tagName.toLowerCase(),
    textContent: getDirectText(el),
    fullText: el.textContent?.trim() ?? '',
    styles: extractStyles(el),
    style: el.style,
    attributes,
    dataAttributes,
    children: getMirrorChildIds(el),
    parent: getMirrorParentId(el),
    childInfos,
  }
}

/**
 * Mount a Mirror DSL source into a fresh jsdom container.
 *
 * @example
 *   const m = mountMirror(`Frame bg #2271C1, pad 16`)
 *   expect(m.inspect('node-1')?.tagName).toBe('div')
 *   expect(m.inspect('node-1')?.style.backgroundColor).toBe('rgb(34, 113, 193)')
 *   m.unmount()
 */
export function mountMirror(src: string): MirrorMount {
  installRuntimeStub()

  const ast = parse(src)
  if (ast.errors && ast.errors.length > 0) {
    throw new Error(
      `Parse error in Mirror DSL:\n${ast.errors.map(e => `  Line ${e.line}: ${e.message}`).join('\n')}`
    )
  }
  const code = generateDOM(ast).replace(/^export\s+function/gm, 'function')

  // Match browser test harness expectations — tests sometimes reach for
  // `document.getElementById('preview')` directly. We mount each fresh
  // sample under a unique id but expose `#preview` as the most-recent.
  document.querySelector('#preview')?.removeAttribute('id')
  const container = document.createElement('div')
  container.id = 'preview'
  document.body.appendChild(container)

  const fn = new Function(code + '\nreturn createUI();')
  const result = fn() as HTMLElement | { root: HTMLElement } | null
  const root = (
    result instanceof HTMLElement ? result : (result as { root?: HTMLElement } | null)?.root
  ) as HTMLElement
  if (!root) throw new Error('Mirror mount: createUI() returned no root')
  container.appendChild(root)

  return {
    root,
    getNodeIds(): string[] {
      const ids: string[] = []
      const all = root.querySelectorAll('[data-mirror-id]')
      for (const el of Array.from(all)) {
        const id = (el as HTMLElement).dataset.mirrorId
        if (id) ids.push(id)
      }
      return ids
    },
    inspect(nodeId: string): NodeInfo | null {
      const el = root.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
      return el ? elementToInfo(el) : null
    },
    byId(nodeId: string): HTMLElement | null {
      return root.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
    },
    unmount(): void {
      container.remove()
    },
  }
}

/**
 * Read a single CSS property from an element. Mirrors browser-test
 * semantics by going through `getComputedStyle()` so colors come back as
 * `rgb(...)` and lengths as `px`-strings — matching what the auto-generated
 * tutorial assertions expect.
 *
 * jsdom doesn't always normalize CSS keywords (e.g. `white`) into rgb form
 * — we do that ourselves so the assertion strings stay portable.
 */
export function readStyle(el: HTMLElement, prop: string): string {
  const computed = el.ownerDocument.defaultView?.getComputedStyle(el)
  if (!computed) return ''
  const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) as keyof CSSStyleDeclaration
  const direct = computed[camel] as string | undefined
  let value = direct
  if (value === undefined || value === '') {
    value = computed.getPropertyValue(prop.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`))
  }
  if (typeof value === 'string' && isColorProperty(prop)) {
    return normalizeColorValue(value)
  }
  return value ?? ''
}

/** Reused by both readStyle and the inspect() styles map. */
export function normalizeColorValue(value: string): string {
  return normalizeColor(value)
}

const COLOR_PROPS = new Set([
  'color',
  'backgroundColor',
  'background-color',
  'borderColor',
  'border-color',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'fill',
  'stroke',
  'outlineColor',
])

function isColorProperty(prop: string): boolean {
  return COLOR_PROPS.has(prop)
}

const NAMED_COLORS: Record<string, string> = {
  white: 'rgb(255, 255, 255)',
  black: 'rgb(0, 0, 0)',
  red: 'rgb(255, 0, 0)',
  green: 'rgb(0, 128, 0)',
  blue: 'rgb(0, 0, 255)',
  transparent: 'rgba(0, 0, 0, 0)',
}

function normalizeColor(value: string): string {
  const lower = value.trim().toLowerCase()
  if (NAMED_COLORS[lower]) return NAMED_COLORS[lower]
  // jsdom can return short hex (`#fff`); normalize to rgb form for parity.
  const hex = lower.match(/^#([0-9a-f]{3,8})$/)
  if (hex) {
    const hexStr = hex[1]
    if (hexStr.length === 3) {
      const r = parseInt(hexStr[0] + hexStr[0], 16)
      const g = parseInt(hexStr[1] + hexStr[1], 16)
      const b = parseInt(hexStr[2] + hexStr[2], 16)
      return `rgb(${r}, ${g}, ${b})`
    }
    if (hexStr.length === 6) {
      const r = parseInt(hexStr.slice(0, 2), 16)
      const g = parseInt(hexStr.slice(2, 4), 16)
      const b = parseInt(hexStr.slice(4, 6), 16)
      return `rgb(${r}, ${g}, ${b})`
    }
  }
  // jsdom emits rgba alpha to 3 decimals (e.g. 0.533); Chrome to 2 (0.53).
  // Round alpha to 2 decimals so cross-engine assertions match.
  const rgbaMatch = lower.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)$/)
  if (rgbaMatch) {
    const [, r, g, b, a] = rgbaMatch
    const alpha = Math.round(parseFloat(a) * 100) / 100
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return value
}
