/**
 * Task-App Multi-File — Contract Test (Schicht 3)
 *
 * Maps the real `examples/task-app/` flat-file layout into the canonical
 * `data/`/`tokens/`/`components/`/`layouts/` structure that `compileProject`
 * expects, then verifies cross-file token + component resolution end-to-end.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { compileProject } from '../../compiler/index'
import { combineProjectFiles } from '../../compiler/preprocessor'
import type { ListFilesFn, ReadFileFn } from '../../compiler/preprocessor'

const TASK_APP = join(__dirname, '..', '..', 'examples', 'task-app')

function makeFs(): { listFiles: ListFilesFn; readFile: ReadFileFn } {
  // Map task-app's flat root files into canonical directories.
  const layout: Record<string, Record<string, string>> = {
    tokens: {
      'tokens.mirror': readFileSync(join(TASK_APP, 'tokens.mirror'), 'utf-8'),
    },
    components: {
      'components.mirror': readFileSync(join(TASK_APP, 'components.mirror'), 'utf-8'),
    },
    layouts: {
      // simple.mirror is a self-contained dashboard that doesn't use $tokens
      // from external files; here we use it to verify load-order doesn't
      // break component resolution.
      'simple.mirror': readFileSync(join(TASK_APP, 'simple.mirror'), 'utf-8'),
    },
  }
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

describe('task-app multi-file project — Contract', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('compileProject combines tokens + components + layouts without error', () => {
    const fs = makeFs()
    expect(() => compileProject(fs)).not.toThrow()
  })

  it('produces parseable JavaScript', () => {
    const fs = makeFs()
    const code = compileProject(fs).replace(/^export\s+function/gm, 'function')
    expect(() => new Function(code)).not.toThrow()
  })

  it('renders without runtime exception', () => {
    const fs = makeFs()
    const code = compileProject(fs)
    expect(() => render(code, container)).not.toThrow()
  })

  it('renders tokens.mirror token references via CSS variables', () => {
    const fs = makeFs()
    const code = compileProject(fs)
    // Token `primary.bg` is defined in tokens.mirror; downstream components
    // referencing $primary should compile to var(--primary-bg).
    expect(code).toContain('--primary-bg')
  })

  it('renders components.mirror component definitions', () => {
    const fs = makeFs()
    const code = compileProject(fs)
    // The combined source should include the component definitions
    // before being consumed in the layout.
    expect(code).toMatch(/PrimaryBtn|GhostBtn|IconBtn/)
  })

  it('emits the canonical load-order header comments in combined source', () => {
    // Use the preprocessor directly to check ordering; compileProject runs
    // through the parser which strips comments.
    const fs = makeFs()
    const combined = combineProjectFiles(fs.listFiles, fs.readFile)
    const tokensIdx = combined.indexOf('=== tokens/')
    const componentsIdx = combined.indexOf('=== components/')
    const layoutsIdx = combined.indexOf('=== layouts/')
    expect(tokensIdx).toBeGreaterThan(-1)
    expect(componentsIdx).toBeGreaterThan(tokensIdx)
    expect(layoutsIdx).toBeGreaterThan(componentsIdx)
  })

  it('rendered DOM contains the dashboard root frame', () => {
    const fs = makeFs()
    const code = compileProject(fs)
    const root = render(code, container)
    expect(root.querySelectorAll('[data-mirror-name]').length).toBeGreaterThan(10)
  })
})
