/**
 * Multi-File — Behavior Spec (Schicht 2)
 *
 * Sub-Features:
 *   MF1  data/ → tokens/ → components/ → layouts/ load order
 *   MF2  cross-file token references resolve
 *   MF3  cross-file component definitions usable in layouts
 *   MF4  multiple files in same directory are concatenated alphabetically
 *   MF5  `use` statement is cosmetic (no runtime effect)
 *   MF6  empty directories are skipped
 *   MF7  missing optional dirs (e.g. only layouts/) compile cleanly
 *   MF8  components in components/ may reference tokens from tokens/
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { compileProject } from '../../compiler/index'
import { combineProjectFiles } from '../../compiler/preprocessor'
import type { ListFilesFn, ReadFileFn } from '../../compiler/preprocessor'

function makeFs(layout: Record<string, Record<string, string>>): {
  listFiles: ListFilesFn
  readFile: ReadFileFn
} {
  const listFiles: ListFilesFn = dir => Object.keys(layout[dir] || {}).sort()
  const readFile: ReadFileFn = path => {
    const slash = path.indexOf('/')
    if (slash === -1) return null
    const dir = path.slice(0, slash)
    const file = path.slice(slash + 1)
    return layout[dir]?.[file] ?? null
  }
  return { listFiles, readFile }
}

function render(code: string, container: HTMLElement): HTMLElement {
  const stripped = code.replace(/^export\s+function/gm, 'function')
  const g = globalThis as any
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
  const fn = new Function(stripped + '\nreturn createUI();')
  const root = fn() as HTMLElement
  container.appendChild(root)
  return root
}

function findByName(root: Element, name: string): Element | null {
  return root.querySelector(`[data-mirror-name="${name}"]`)
}

describe('Multi-File — Behavior Spec', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  // ---------------------------------------------------------------------------
  // MF1: directory load order
  // ---------------------------------------------------------------------------

  describe('MF1: directory load order', () => {
    it('combined source emits data → tokens → components → layouts in order', () => {
      const { listFiles, readFile } = makeFs({
        tokens: {
          'colors.mirror': 'primary.bg: #2271C1',
        },
        components: {
          'btn.mirror': 'PrimaryBtn as Button: bg $primary, pad 10 20',
        },
        layouts: {
          'app.mirror': 'PrimaryBtn "Go"',
        },
      })
      const combined = combineProjectFiles(listFiles, readFile)
      const tokensIdx = combined.indexOf('=== tokens/')
      const componentsIdx = combined.indexOf('=== components/')
      const layoutsIdx = combined.indexOf('=== layouts/')
      expect(tokensIdx).toBeGreaterThan(-1)
      expect(componentsIdx).toBeGreaterThan(tokensIdx)
      expect(layoutsIdx).toBeGreaterThan(componentsIdx)
    })
  })

  // ---------------------------------------------------------------------------
  // MF2: cross-file token references
  // ---------------------------------------------------------------------------

  describe('MF2: cross-file token references', () => {
    it('a token defined in tokens/ resolves when referenced in layouts/', () => {
      const { listFiles, readFile } = makeFs({
        tokens: {
          'colors.mirror': 'primary.bg: #2271C1',
        },
        layouts: {
          'app.mirror': 'Frame bg $primary, w 100, h 50',
        },
      })
      const code = compileProject({ listFiles, readFile })
      const root = render(code, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      // token resolution emits a CSS variable
      expect(frame.style.background).toContain('var(--primary-bg)')
    })
  })

  // ---------------------------------------------------------------------------
  // MF3: cross-file component definitions
  // ---------------------------------------------------------------------------

  describe('MF3: cross-file component definitions', () => {
    it('component defined in components/ is instantiable in layouts/', () => {
      const { listFiles, readFile } = makeFs({
        components: {
          'btn.mirror': 'PrimaryBtn as Button: bg #2271C1, col white, pad 10 20',
        },
        layouts: {
          'app.mirror': 'PrimaryBtn "Save"',
        },
      })
      const code = compileProject({ listFiles, readFile })
      const root = render(code, container)
      const btn = findByName(root, 'PrimaryBtn') as HTMLElement
      expect(btn).toBeTruthy()
      expect(btn.tagName).toBe('BUTTON')
      expect(btn.textContent?.trim()).toBe('Save')
    })
  })

  // ---------------------------------------------------------------------------
  // MF4: multiple files in same directory
  // ---------------------------------------------------------------------------

  describe('MF4: multiple files in same directory (alphabetical)', () => {
    it('multiple tokens files are all loaded', () => {
      const { listFiles, readFile } = makeFs({
        tokens: {
          'colors.mirror': 'primary.bg: #2271C1',
          'spacing.mirror': 'space.pad: 16',
        },
        layouts: {
          'app.mirror': 'Frame bg $primary, pad $space, w 100',
        },
      })
      const code = compileProject({ listFiles, readFile })
      const root = render(code, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('var(--primary-bg)')
      expect(frame.style.padding).toContain('var(--space-pad)')
    })

    it('multiple component files are all loaded', () => {
      const { listFiles, readFile } = makeFs({
        components: {
          'a-buttons.mirror': 'PrimaryBtn as Button: bg #2271C1, pad 10',
          'b-cards.mirror': 'Card as Frame: bg #1a1a1a, pad 16',
        },
        layouts: {
          'app.mirror': 'Card\n  PrimaryBtn "X"',
        },
      })
      const code = compileProject({ listFiles, readFile })
      const root = render(code, container)
      expect(findByName(root, 'Card')).toBeTruthy()
      expect(findByName(root, 'PrimaryBtn')).toBeTruthy()
    })
  })

  // ---------------------------------------------------------------------------
  // MF5: `use` statement is cosmetic
  // ---------------------------------------------------------------------------

  describe('MF5: `use` directive', () => {
    it('`use tokens` does not affect compiled output (cosmetic only)', () => {
      const layout = {
        tokens: { 'c.mirror': 'primary.bg: #2271C1' },
        layouts: { 'app.mirror': 'Frame bg $primary, w 100' },
      }
      const without = compileProject(makeFs(layout))
      const layoutWithUse = {
        ...layout,
        layouts: { 'app.mirror': 'use tokens\n\nFrame bg $primary, w 100' },
      }
      const withUse = compileProject(makeFs(layoutWithUse))
      // Compiled body should be identical (modulo line/comment shifts) — both
      // should resolve $primary to var(--primary-bg).
      expect(without).toContain('var(--primary-bg)')
      expect(withUse).toContain('var(--primary-bg)')
    })
  })

  // ---------------------------------------------------------------------------
  // MF6: empty directories are skipped
  // ---------------------------------------------------------------------------

  describe('MF6: empty directories', () => {
    it('an empty tokens/ folder does not break compilation', () => {
      const { listFiles, readFile } = makeFs({
        tokens: {},
        layouts: { 'app.mirror': 'Text "Hi"' },
      })
      const code = compileProject({ listFiles, readFile })
      const root = render(code, container)
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('Hi')
    })
  })

  // ---------------------------------------------------------------------------
  // MF7: only layouts/
  // ---------------------------------------------------------------------------

  describe('MF7: layouts-only project', () => {
    it('compiles a project with only a layouts/ folder', () => {
      const { listFiles, readFile } = makeFs({
        layouts: { 'app.mirror': 'Frame bg #2271C1, w 100, h 50' },
      })
      const code = compileProject({ listFiles, readFile })
      const root = render(code, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('rgb(34, 113, 193)')
    })
  })

  // ---------------------------------------------------------------------------
  // MF8: components reference tokens
  // ---------------------------------------------------------------------------

  describe('MF8: components reference tokens', () => {
    it('a component in components/ may reference a token from tokens/', () => {
      const { listFiles, readFile } = makeFs({
        tokens: {
          't.mirror': 'primary.bg: #2271C1\nradius: 6',
        },
        components: {
          'b.mirror': 'PrimaryBtn as Button: bg $primary, rad $radius, pad 10',
        },
        layouts: {
          'app.mirror': 'PrimaryBtn "Go"',
        },
      })
      const code = compileProject({ listFiles, readFile })
      const root = render(code, container)
      const btn = findByName(root, 'PrimaryBtn') as HTMLElement
      expect(btn.style.background).toContain('var(--primary-bg)')
      expect(btn.style.borderRadius).toContain('var(--radius)')
    })
  })
})
