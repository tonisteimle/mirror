/**
 * executeMirrorJS — pin the two execution shapes (auto-init vs classic).
 */

import { describe, it, expect } from 'vitest'
import { executeMirrorJS } from '../../studio/compile/execute-mirror-js'

describe('executeMirrorJS — auto-init shape', () => {
  it('strips the export keyword and the document.body.appendChild line', () => {
    const code = `// Auto-initialization
export function createUI() { return null }
const _ui = { root: { tagName: 'STUB' } }
document.body.appendChild(_ui.root)`
    const ui = executeMirrorJS(code, null) as { root?: { tagName?: string } }
    expect(ui).toBeTruthy()
    expect(ui.root?.tagName).toBe('STUB')
  })

  it('injects YAML data after __mirrorData declaration', () => {
    const code = `// Auto-initialization
const __mirrorData = {
  initial: true
}
const _ui = { root: { mirrorData: __mirrorData } }`
    const ui = executeMirrorJS(code, '\n  __mirrorData.injected = true') as {
      root?: { mirrorData?: { initial?: boolean; injected?: boolean } }
    }
    expect(ui.root?.mirrorData?.initial).toBe(true)
    expect(ui.root?.mirrorData?.injected).toBe(true)
  })

  it('returns _ui regardless of whether YAML injection ran', () => {
    const code = `// Auto-initialization
const _ui = { root: 'stub' }`
    const ui = executeMirrorJS(code, undefined) as { root?: string }
    expect(ui.root).toBe('stub')
  })
})

describe('executeMirrorJS — classic shape', () => {
  it('returns the result of createUI()', () => {
    const code = `export function createUI() { return { root: 'classic' } }`
    const ui = executeMirrorJS(code, null) as { root?: string }
    expect(ui.root).toBe('classic')
  })

  it('returns null when createUI returns null', () => {
    // Mirror's DOM backend always emits `function createUI`; the only
    // null path in production is when the factory itself returns null.
    const code = `export function createUI() { return null }`
    const ui = executeMirrorJS(code, null)
    expect(ui).toBeNull()
  })

  it('YAML injection still applies in classic shape', () => {
    const code = `const __mirrorData = {
  base: true
}
export function createUI() { return { mirrorData: __mirrorData } }`
    const ui = executeMirrorJS(code, '\n  __mirrorData.via = "classic"') as {
      mirrorData?: { base?: boolean; via?: string }
    }
    expect(ui.mirrorData?.base).toBe(true)
    expect(ui.mirrorData?.via).toBe('classic')
  })
})
