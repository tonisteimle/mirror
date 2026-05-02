/**
 * Component Navigation Module
 *
 * Component routing, page navigation, and view switching.
 */

import type { MirrorElement } from './types'
import { applyState, removeState } from './state-machine'

// ============================================
// FILE CALLBACK STORAGE
// ============================================

let _readFileCallback: ((filename: string) => string | null) | null = null

/**
 * Set the readFile callback for page navigation
 */
export function setReadFileCallback(callback: (filename: string) => string | null): void {
  _readFileCallback = callback
}

// ============================================
// PAGE NAME SECURITY
// ============================================

/**
 * Sanitize page name to prevent path traversal attacks. Self-contained
 * so the runtime template can stamp it verbatim via .toString().
 */
export function sanitizePageName(name: string): string | null {
  if (!name || typeof name !== 'string') return null

  if (name.includes('..')) {
    console.warn('[Security] Path traversal attempt blocked:', name)
    return null
  }

  if (name.startsWith('/') || name.startsWith('\\')) {
    console.warn('[Security] Absolute path blocked:', name)
    return null
  }

  if (!/^[a-zA-Z0-9_\-/]+(\.[a-zA-Z0-9]+)?$/.test(name)) {
    console.warn('[Security] Invalid page name characters:', name)
    return null
  }

  return name
}

// ============================================
// CODE STRUCTURE CHECK
// ============================================

/**
 * Sanity check that compiled code looks like Mirror compiler output.
 * Doesn't claim to be a security boundary — it only catches obviously
 * mangled output (e.g. readFile returned wrong file) before we hand
 * it to new Function().
 *
 * Audit-4 removed the previous regex-based dangerous-pattern check:
 * the validator scanned full compiled output, but compiled output
 * always embeds the Mirror runtime — which legitimately contains
 * `new Function(...)` (ternary evaluator), `"javascript:"` literals
 * (in sanitizeSVG), regex patterns mentioning `<script`, and
 * sanitized `innerHTML = svgText` writes. Those triggered every
 * legit page. Real defence is at the entry point: sanitizePageName
 * blocks path traversal so the readFile callback can't be tricked
 * into loading arbitrary files.
 */
export function hasMirrorStructure(code: string): boolean {
  return code.includes('function createUI') || code.includes('export function createUI')
}

// ============================================
// CODE EXECUTION
// ============================================

/**
 * Execute compiled Mirror code. Skips structural check via
 * hasMirrorStructure to catch mangled output before new Function()
 * sees it — see the docstring there for why we don't pattern-match
 * for "dangerous" code.
 */
function executeCompiledCode(code: string): { root?: HTMLElement } | null {
  if (!hasMirrorStructure(code)) {
    console.warn('[component-navigation] Compiled code does not look like Mirror output')
    return null
  }

  const execCode = code.replace('export function createUI', 'function createUI')

  const safeWrapper = `
    "use strict";
    ${execCode}
    return createUI();
  `

  try {
    const fn = new Function(safeWrapper)
    return fn() as { root?: HTMLElement }
  } catch (err) {
    console.error('[Security] Code execution error:', err)
    return null
  }
}

// ============================================
// NAV SELECTION
// ============================================

/**
 * Update selected state for navigation items
 */
export function updateNavSelection(clickedElement: MirrorElement | null): void {
  if (!clickedElement) return
  const nav = clickedElement.closest('nav')
  if (!nav) return
  const navItems = nav.querySelectorAll('[data-route]') as NodeListOf<MirrorElement>
  navItems.forEach(item => {
    if (item === clickedElement) {
      item.dataset.selected = 'true'
      applyState(item, 'selected')
    } else {
      delete item.dataset.selected
      removeState(item, 'selected')
    }
  })
}

// ============================================
// COMPONENT NAVIGATION
// ============================================

/**
 * Find target by name
 */
function findTarget(root: Document | ShadowRoot, targetName: string): HTMLElement | null {
  return (
    (root.querySelector(`[data-mirror-name="${targetName}"]`) as HTMLElement | null) ||
    (root.querySelector(`[data-component="${targetName}"]`) as HTMLElement | null)
  )
}

/**
 * Check if element is a view element
 */
function isViewElement(el: HTMLElement): boolean {
  return Boolean(el.dataset?.mirrorName || el.dataset?.component)
}

/**
 * Hide siblings except target
 */
function hideSiblings(target: HTMLElement): void {
  if (!target.parentElement) return

  Array.from(target.parentElement.children).forEach(sibling => {
    const siblingEl = sibling as HTMLElement
    if (isViewElement(siblingEl)) {
      siblingEl.style.display = sibling === target ? '' : 'none'
    }
  })
}

/**
 * Navigate to a target component (for component routing)
 */
export function navigate(targetName: string, clickedElement: MirrorElement | null): void {
  if (!targetName) return

  const root = clickedElement ? (clickedElement.getRootNode() as Document | ShadowRoot) : document
  const target = findTarget(root, targetName)

  if (!target) return

  hideSiblings(target)
  updateNavSelection(clickedElement)
}

// ============================================
// PAGE NAVIGATION
// ============================================

/**
 * Get read file function
 */
function getReadFileFunction(): ((f: string) => string | null) | undefined {
  return (
    _readFileCallback ||
    (window as { _mirrorReadFile?: (f: string) => string | null })._mirrorReadFile
  )
}

/**
 * Get Mirror compiler
 */
function getMirrorCompiler():
  | {
      compile: (code: string, opts?: { readFile?: (f: string) => string | null }) => string
    }
  | undefined {
  return (
    window as {
      Mirror?: {
        compile: (code: string, opts?: { readFile?: (f: string) => string | null }) => string
      }
    }
  ).Mirror
}

/**
 * Append UI children to container
 */
function appendUIToContainer(ui: { root?: HTMLElement }, container: HTMLElement): void {
  if (!ui?.root) return

  while (ui.root.firstChild) {
    container.appendChild(ui.root.firstChild)
  }
}

/**
 * Navigate to a page (load .mirror file)
 */
export function navigateToPage(pageName: string, clickedElement: MirrorElement | null): void {
  if (!pageName) return

  const safeName = sanitizePageName(pageName)
  if (!safeName) return

  const filename = safeName.endsWith('.mirror') ? safeName : safeName + '.mirror'

  const readFile = getReadFileFunction()
  if (!readFile) {
    console.warn('No readFile callback available for page navigation')
    return
  }

  const content = readFile(filename)
  if (!content) {
    console.warn(`Page not found: ${filename}`)
    return
  }

  const Mirror = getMirrorCompiler()
  if (!Mirror?.compile) {
    console.warn('Mirror compiler not available for dynamic page loading')
    return
  }

  try {
    const pageCode = Mirror.compile(content, { readFile })
    const container = getPageContainer()

    if (!container) {
      console.warn('No page container found for rendering')
      return
    }

    container.replaceChildren()

    const ui = executeCompiledCode(pageCode)
    if (ui) appendUIToContainer(ui, container)
  } catch (err) {
    console.error(`Failed to load page ${filename}:`, err)
  }

  updateNavSelection(clickedElement)
}

// ============================================
// PAGE CONTAINER
// ============================================

/**
 * Find container by selector
 */
function findBySelector(selector: string): HTMLElement | null {
  return document.querySelector(selector) as HTMLElement | null
}

/**
 * Find content sibling of nav
 */
function findNavSibling(): HTMLElement | null {
  const nav = document.querySelector('nav')
  if (!nav?.parentElement) return null

  for (const sibling of Array.from(nav.parentElement.children)) {
    if (sibling !== nav && sibling.tagName !== 'NAV') {
      return sibling as HTMLElement
    }
  }
  return null
}

/**
 * Get container for page content
 */
export function getPageContainer(): HTMLElement | null {
  return (
    findBySelector('[data-page-container]') ||
    findBySelector('[data-instance-name="PageContent"]') ||
    findBySelector('[data-instance-name="Content"]') ||
    findNavSibling()
  )
}
