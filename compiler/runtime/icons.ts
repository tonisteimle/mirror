/**
 * Icons Module
 *
 * Lucide icon loading with security sanitization.
 * Also supports custom icon registry for user-defined icons.
 * Extracted from dom-runtime.ts for Clean Code.
 */

import type { MirrorElement } from './types'

// ============================================
// CONSTANTS
// ============================================

const MAX_ICON_CACHE = 200
export const LUCIDE_CDN = 'https://unpkg.com/lucide-static/icons'

export const FALLBACK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 9 6 6"/><path d="m15 9-6 6"/></svg>`

// ============================================
// STATE
// ============================================

const iconCache = new Map<string, string>()
const pendingRequests = new Map<string, Promise<string | null>>()

/** Custom icon registry - stores SVG path data for user-defined icons */
const customIconRegistry = new Map<string, { path: string; viewBox: string }>()

// ============================================
// PUBLIC API
// ============================================

/**
 * Register a custom icon with SVG path data
 *
 * @param name - Icon name (used in Mirror code: Icon "myicon")
 * @param pathData - SVG path data (d attribute content)
 * @param viewBox - Optional viewBox (default: "0 0 24 24")
 */
export function registerIcon(name: string, pathData: string, viewBox: string = '0 0 24 24'): void {
  customIconRegistry.set(name, { path: pathData, viewBox })
}

export async function loadIcon(el: MirrorElement, iconName: string): Promise<void> {
  if (!el || !iconName) return

  const svgText = await getIconSvg(iconName)
  applyIconToElement(el, svgText)
}

export function preloadIcons(iconNames: string[]): void {
  iconNames.forEach(name => {
    if (!iconCache.has(name)) fetchIcon(name)
  })
}

// ============================================
// ICON LOADING
// ============================================

async function getIconSvg(iconName: string): Promise<string> {
  // Check custom icon registry first
  const customIcon = customIconRegistry.get(iconName)
  if (customIcon) {
    return buildSvgFromPath(customIcon.path, customIcon.viewBox)
  }

  // Check cache
  const cached = iconCache.get(iconName)
  if (cached) return cached

  // Fetch from Lucide CDN
  const fetched = await fetchIconWithDedup(iconName)
  return fetched ?? FALLBACK_ICON
}

/**
 * Build a complete SVG element from path data
 */
function buildSvgFromPath(pathData: string, viewBox: string): string {
  // Support multiple paths separated by newlines or pipes
  const paths = pathData
    .split(/[\n|]/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => `<path d="${p}"/>`)
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
}

async function fetchIconWithDedup(iconName: string): Promise<string | null> {
  let pending = pendingRequests.get(iconName)
  if (!pending) {
    pending = fetchIcon(iconName)
    pendingRequests.set(iconName, pending)
  }
  const result = await pending
  pendingRequests.delete(iconName)
  if (!result) console.warn(`Icon "${iconName}" not found, using fallback`)
  return result
}

async function fetchIcon(iconName: string): Promise<string | null> {
  const safeName = sanitizeIconName(iconName)
  if (!safeName) return null

  try {
    const res = await fetch(`${LUCIDE_CDN}/${safeName}.svg`)
    if (!res.ok) return null

    const svgText = await res.text()
    const sanitized = sanitizeSVG(svgText)

    if (!sanitized) {
      console.warn(`[Security] Icon "${safeName}" rejected - invalid SVG`)
      return null
    }

    cacheIcon(safeName, sanitized)
    return sanitized
  } catch (err) {
    console.warn(`Failed to load icon "${safeName}":`, err)
    return null
  }
}

function cacheIcon(name: string, svg: string): void {
  if (iconCache.size >= MAX_ICON_CACHE) {
    const oldest = iconCache.keys().next().value
    if (oldest) iconCache.delete(oldest)
  }
  iconCache.set(name, svg)
}

// ============================================
// ICON APPLICATION
// ============================================

function applyIconToElement(el: MirrorElement, svgText: string): void {
  el.innerHTML = svgText

  const svg = el.querySelector('svg')
  if (!svg) return

  applySvgStyles(svg, el)
  applyFillMode(svg, el.dataset.iconFill === 'true', el.dataset.iconWeight || '2')
}

function applySvgStyles(svg: SVGElement, el: MirrorElement): void {
  const size = el.dataset.iconSize || '16'
  const color = el.dataset.iconColor || 'currentColor'

  svg.style.width = size + 'px'
  svg.style.height = size + 'px'
  svg.style.color = color
  svg.style.display = 'block'
}

function applyFillMode(svg: SVGElement, isFilled: boolean, strokeWidth: string): void {
  if (isFilled) {
    svg.setAttribute('fill', 'currentColor')
    svg.setAttribute('stroke', 'none')
  } else {
    svg.setAttribute('stroke-width', strokeWidth)
  }
}

// ============================================
// ICON NAME SECURITY
// ============================================

/**
 * Validate an icon name before using it in URL construction or DOM
 * manipulation. Self-contained (no external deps) so it can be stamped
 * verbatim into the runtime template.
 */
export function sanitizeIconName(name: string): string | null {
  if (!name || typeof name !== 'string') return null
  if (!/^[a-z0-9\-]+$/.test(name)) {
    console.warn('[Security] Invalid icon name rejected:', name)
    return null
  }
  if (name.length > 50) {
    console.warn('[Security] Icon name too long:', name)
    return null
  }
  return name
}

// ============================================
// SVG SECURITY
// ============================================

/**
 * Sanitize SVG content fetched from external sources. Strips script tags,
 * dangerous wrappers (foreignObject/use/image/a/etc.), event handlers
 * (on*), href/xlink:href, and javascript: URLs.
 *
 * Self-contained: all helpers are defined inside the function body so
 * `sanitizeSVG.toString()` produces a runnable snippet that can be
 * stamped verbatim into the runtime template (no helper imports
 * required at the call site).
 */
export function sanitizeSVG(svgText: string): string | null {
  function parseSvgDocument(text: string): Document | null {
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'image/svg+xml')
    if (doc.querySelector('parsererror')) {
      console.warn('[Security] Invalid SVG content')
      return null
    }
    return doc
  }

  function isValidSvgRoot(element: Element): boolean {
    if (element.tagName.toLowerCase() !== 'svg') {
      console.warn('[Security] Not an SVG element')
      return false
    }
    return true
  }

  function removeDangerousElements(svg: Element): void {
    const dangerous = [
      'script',
      'foreignObject',
      'use',
      'image',
      'a',
      'style',
      'defs',
      'metadata',
      'animate',
      'set',
    ]
    for (const tag of dangerous) svg.querySelectorAll(tag).forEach(el => el.remove())
  }

  function removeDangerousAttributes(svg: Element): void {
    const dangerousPattern = /^(on|href|xlink:href|src|data|formaction)/i
    function isDangerous(attr: Attr): boolean {
      return dangerousPattern.test(attr.name) || attr.value.includes('javascript:')
    }
    for (const el of svg.querySelectorAll('*')) {
      for (const attr of Array.from(el.attributes)) {
        if (isDangerous(attr)) el.removeAttribute(attr.name)
      }
    }
  }

  try {
    const doc = parseSvgDocument(svgText)
    if (!doc) return null
    const svg = doc.documentElement
    if (!isValidSvgRoot(svg)) return null
    removeDangerousElements(svg)
    removeDangerousAttributes(svg)
    return svg.outerHTML
  } catch (err) {
    console.warn('[Security] SVG sanitization failed:', err)
    return null
  }
}
