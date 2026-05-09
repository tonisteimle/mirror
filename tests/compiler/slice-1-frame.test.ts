// @vitest-environment jsdom
/**
 * Slice 1 — Frame primitive regression suite.
 *
 * The Frame primitive is referenced in 200+ tests but was not the focused
 * subject of any. Audit `docs/refactoring/02-slice-1-frame.md` listed RT-1
 * through RT-15 as the locking tests for the slice's contract. This file
 * holds the ones that the implementation phases ship; remaining RTs land in
 * adjacent files (validator, differential).
 *
 * Currently locks:
 *   - RT-1  Frame default flex
 *   - RT-2  Box ≡ Frame at the DOM-emit level (modulo data-component)
 *   - RT-8  lowercase non-state child does not silently fold to initialState
 *   - RT-9  DSL state name still folds to initialState
 *   - RT-10 Frame name X emits dataset.mirrorName exactly once (Phase B.5)
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { validate } from '../../compiler/validator'
import { generateDOM } from '../../compiler/backends/dom'

function compileToCreateUI(source: string): string {
  return generateDOM(parse(source))
}

function countMirrorNameSets(js: string, varName = 'node_1'): number {
  const re = new RegExp(`${varName}\\.dataset\\.mirrorName\\s*=`, 'g')
  return (js.match(re) ?? []).length
}

describe('Slice 1 — Frame primitive', () => {
  describe('RT-10 — dataset.mirrorName emitted once', () => {
    it('Frame name MyFrame: writes mirrorName ONCE with the user-given name', () => {
      const js = compileToCreateUI('Frame name MyFrame')
      expect(countMirrorNameSets(js)).toBe(1)
      // Final value is the instance-name, not the component-name.
      expect(js).toContain("node_1.dataset.mirrorName = 'MyFrame'")
      expect(js).not.toContain("node_1.dataset.mirrorName = 'Frame'")
      // Element-Registry uses the instance name.
      expect(js).toContain("_elements['MyFrame'] = node_1")
    })

    it('plain Frame (no name property): writes mirrorName ONCE with the component name', () => {
      const js = compileToCreateUI('Frame')
      expect(countMirrorNameSets(js)).toBe(1)
      expect(js).toContain("node_1.dataset.mirrorName = 'Frame'")
    })

    it('Box name Foo: writes mirrorName ONCE with the user-given name', () => {
      const js = compileToCreateUI('Box name Foo')
      expect(countMirrorNameSets(js)).toBe(1)
      expect(js).toContain("node_1.dataset.mirrorName = 'Foo'")
      expect(js).not.toContain("node_1.dataset.mirrorName = 'Box'")
    })
  })

  describe('RT-1 — Frame default flex', () => {
    it('bare Frame compiles to a <div> with flex column defaults', () => {
      const js = compileToCreateUI('Frame')
      expect(js).toContain("document.createElement('div')")
      expect(js).toContain("'display': 'flex'")
      expect(js).toContain("'flex-direction': 'column'")
    })
  })

  describe('RT-2 — Box ≡ Frame', () => {
    it('Box and Frame produce the same default-flex emit, only data-component differs', () => {
      const frameJs = compileToCreateUI('Frame')
      const boxJs = compileToCreateUI('Box')

      // Both elements: <div> tag.
      expect(frameJs).toContain("document.createElement('div')")
      expect(boxJs).toContain("document.createElement('div')")

      // Both: same flex defaults.
      for (const style of [
        "'display': 'flex'",
        "'flex-direction': 'column'",
        "'align-self': 'stretch'",
        "'align-items': 'flex-start'",
      ]) {
        expect(frameJs).toContain(style)
        expect(boxJs).toContain(style)
      }

      // The visible difference is the component-name marker.
      expect(frameJs).toContain("node_1.dataset.component = 'Frame'")
      expect(boxJs).toContain("node_1.dataset.component = 'Box'")
    })
  })

  describe('RT-8 — lowercase non-state child does not silently fold to initialState', () => {
    it('Frame > unknown: validator catches typo with E002', () => {
      const ast = parse('Frame\n  unknown')
      expect(ast.instances[0]?.initialState).toBeUndefined()
      expect(ast.instances[0]?.children).toHaveLength(1)

      const result = validate('Frame\n  unknown')
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'E002')).toBe(true)
    })

    it('Frame > todo (user-defined custom state): falls through to child-instance, not initialState', () => {
      // `todo` is not a DSL state — it is a custom state a component might
      // define. Indented form does NOT fold it; use inline form instead.
      const ast = parse('Frame\n  todo')
      expect(ast.instances[0]?.initialState).toBeUndefined()
      expect(ast.instances[0]?.children).toHaveLength(1)
    })
  })

  describe('RT-9 — DSL state name still folds to initialState (indented form)', () => {
    for (const state of ['open', 'closed', 'selected', 'expanded', 'collapsed', 'on']) {
      it(`Frame > ${state}: folds to initialState`, () => {
        const ast = parse(`Frame\n  ${state}`)
        expect(ast.instances[0]?.initialState).toBe(state)
        expect(ast.instances[0]?.children).toHaveLength(0)
      })
    }
  })

  describe('RT-extra — implicit onclick action on its own line', () => {
    it('Button > openUrl(...): becomes an onclick event, not initialState', () => {
      const src = 'Button "Open"\n  openUrl("https://example.com")'
      const ast = parse(src)
      const btn = ast.instances[0]!
      expect(btn.initialState).toBeUndefined()
      expect(btn.events ?? []).toHaveLength(1)
      expect(btn.events?.[0]?.name).toBe('onclick')

      const result = validate(src)
      expect(result.valid).toBe(true)
    })
  })
})
