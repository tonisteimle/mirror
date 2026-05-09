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
 *   - RT-3  `Frame "hello"` (and Box / Spacer) emits validator W112
 *   - RT-4  DOM-Backend skips innerHTML for direct layout-primitive use
 *   - RT-6  lowercase / non-canonical primitive name canonicalised + W004 warn
 *   - RT-7  Top-level unknown component emits E002
 *   - RT-8  lowercase non-state child does not silently fold to initialState
 *   - RT-9  DSL state name still folds to initialState
 *   - RT-10 Frame name X emits dataset.mirrorName exactly once (Phase B.5)
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { validate } from '../../compiler/validator'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'

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

  describe('RT-3 — content on layout primitive emits W112 warning', () => {
    for (const src of ['Frame "hello"', 'Box "world"', 'Spacer "x"']) {
      it(`${src}: validator emits W112`, () => {
        const result = validate(src)
        expect(result.valid).toBe(true) // warning, not error
        expect(result.warnings ?? []).toHaveLength(1)
        expect(result.warnings?.[0]?.code).toBe('W112')
      })
    }

    it('content-bearing primitives (Text/Button/Label/Link/H1) do NOT emit W112', () => {
      for (const src of ['Text "ok"', 'Button "ok"', 'Label "ok"', 'Link "ok"', 'H1 "ok"']) {
        const result = validate(src)
        expect(result.warnings?.filter(w => w.code === 'W112')).toHaveLength(0)
      }
    })

    it('user component resolving to Frame does NOT emit W112 (slot/template pattern)', () => {
      const result = validate('Btn: pad 10 20\nBtn "Speichern"')
      expect(result.warnings?.filter(w => w.code === 'W112')).toHaveLength(0)
    })
  })

  describe('RT-4 — DOM-Backend skips innerHTML for direct layout-primitive use', () => {
    it('Frame "hello" emits no innerHTML assignment', () => {
      const js = compileToCreateUI('Frame "hello"')
      expect(js).not.toMatch(/node_\d+\.innerHTML\s*=\s*formatInlineMarkdown/)
    })

    it('Text "hello" still emits innerHTML', () => {
      const js = compileToCreateUI('Text "hello"')
      expect(js).toMatch(/node_\d+\.innerHTML\s*=\s*formatInlineMarkdown/)
    })

    it('user component (Btn "Speichern") still emits innerHTML — slot/template pattern', () => {
      const js = compileToCreateUI('Btn: pad 10 20\nBtn "Speichern"')
      expect(js).toMatch(/node_\d+\.innerHTML\s*=\s*formatInlineMarkdown/)
    })
  })

  describe('RT-13 — React-Backend emits Frame-default styles (Phase B.3)', () => {
    it('bare Frame carries display/flex-direction/align-self/align-items', () => {
      const tsx = generateReact(parse('Frame'))
      expect(tsx).toContain('display:')
      expect(tsx).toContain("'flex'")
      expect(tsx).toContain('flexDirection:')
      expect(tsx).toContain("'column'")
      expect(tsx).toContain('alignSelf:')
      expect(tsx).toContain("'stretch'")
      expect(tsx).toContain('alignItems:')
      expect(tsx).toContain("'flex-start'")
    })

    it('explicit `Frame hor` overrides flex-direction, keeps display flex', () => {
      const tsx = generateReact(parse('Frame hor'))
      // hor → flex-direction: row (overrides column default)
      expect(tsx).toContain("flexDirection: 'row'")
      // No vestigial column default after the override
      expect(tsx).not.toContain("'column'")
    })

    it('user component (Btn) does NOT get Frame defaults — keeps explicit choices', () => {
      const tsx = generateReact(parse('Btn: pad 10\nBtn "X"'))
      // Btn uses heuristic to become <button>; no flex defaults injected
      expect(tsx).not.toMatch(/<button[^>]*flexDirection/)
    })
  })

  describe('RT-5 — React-Backend skips content & emits Mirror data-* attributes', () => {
    it('Frame "hello" renders no JSX text child', () => {
      const tsx = generateReact(parse('Frame "hello"'))
      expect(tsx).not.toContain('{"hello"}')
    })

    it('every emitted element carries data-component and data-mirror-name', () => {
      const tsx = generateReact(parse('Frame name MyFrame'))
      expect(tsx).toContain('data-component="Frame"')
      expect(tsx).toContain('data-mirror-name="MyFrame"')
    })

    it('initial state surfaces as data-state', () => {
      const tsx = generateReact(parse('Frame\n  selected'))
      expect(tsx).toContain('data-state="selected"')
    })

    it('user-component name flows through data-component', () => {
      const tsx = generateReact(parse('Btn: pad 10\nBtn "X"'))
      expect(tsx).toContain('data-component="Btn"')
      expect(tsx).toContain('{"X"}') // user components keep their text content
    })
  })

  describe('RT-6 — primitive name canonicalisation + W004 casing warning', () => {
    it('lowercase `frame` is canonicalised to `Frame` in AST, emits W004 warn', () => {
      const ast = parse('frame')
      const inst = ast.instances[0]!
      expect(inst.component).toBe('Frame')
      expect(inst.originalName).toBe('frame')

      const result = validate('frame')
      expect(result.warnings ?? []).toHaveLength(1)
      expect(result.warnings?.[0]?.code).toBe('W004')
    })

    it('uppercase `BOX` is canonicalised to alias-canonical `Box`, emits W004', () => {
      const ast = parse('BOX')
      const inst = ast.instances[0]!
      expect(inst.component).toBe('Box')
      expect(inst.originalName).toBe('BOX')

      const result = validate('BOX')
      expect(result.warnings?.[0]?.code).toBe('W004')
    })

    it('canonical `Frame` and `Box` carry no `originalName` and no W004', () => {
      for (const src of ['Frame', 'Box']) {
        const ast = parse(src)
        expect(ast.instances[0]?.originalName).toBeUndefined()
        const result = validate(src)
        expect(result.warnings?.filter(w => w.code === 'W004')).toHaveLength(0)
      }
    })
  })

  describe('RT-7 — top-level unknown component emits E002', () => {
    it('`unknown` is not canonicalised and surfaces E002', () => {
      const result = validate('unknown')
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'E002')).toBe(true)
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
