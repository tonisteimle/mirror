/**
 * Test: States with children (like Figma Variants)
 *
 * States können komplett andere Kinder haben, nicht nur Style-Änderungen.
 * Dies ermöglicht Toggle-Buttons, Expand/Collapse etc.
 */

import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'
import { generateDOM } from '../../compiler/backends/dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'

describe('State Children Feature', () => {
  let dom: JSDOM
  let document: Document
  let window: typeof globalThis

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      runScripts: 'dangerously',
      url: 'http://localhost',
    })
    document = dom.window.document
    window = dom.window as unknown as typeof globalThis
  })

  function compile(code: string): string {
    const ast = parse(code)
    if (ast.errors.length > 0) {
      throw new Error(`Parse errors: ${ast.errors.map(e => e.message).join(', ')}`)
    }
    // generateDOM takes AST, not IR
    return generateDOM(ast)
  }

  function runCode(code: string): any {
    // Strip export keyword for browser execution
    const execCode = code.replace('export function createUI', 'function createUI')
    const fn = new dom.window.Function(execCode + '\nreturn createUI();')
    return fn()
  }

  describe('Parser: State children', () => {
    it('should parse states with children', () => {
      const code = `
ExpandBtn: hor, gap 8, pad 12, bg #333, cursor pointer
  Text "Mehr zeigen"
  Icon "chevron-down"
  open toggle onclick:
    Text "Weniger zeigen"
    Icon "chevron-up"
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)

      const comp = ast.components[0]
      expect(comp.name).toBe('ExpandBtn')
      expect(comp.states).toHaveLength(1)

      const openState = comp.states[0]
      expect(openState.name).toBe('open')
      expect(openState.children).toBeDefined()
      expect(openState.children!.length).toBe(2)

      // Check first child is Text
      const textChild = openState.children![0]
      expect(textChild.type).toBe('Instance')
      expect((textChild as any).component).toBe('Text')

      // Check second child is Icon
      const iconChild = openState.children![1]
      expect(iconChild.type).toBe('Instance')
      expect((iconChild as any).component).toBe('Icon')
    })

    it('should distinguish between child override and new child', () => {
      const code = `
Btn: pad 12, bg #333
  Icon "plus"
  selected:
    Icon: ic white
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)

      const comp = ast.components[0]
      const selectedState = comp.states[0]

      // Should be a childOverride (Icon: with colon)
      expect(selectedState.childOverrides).toHaveLength(1)
      expect(selectedState.childOverrides[0].childName).toBe('Icon')

      // Should NOT be a new child
      expect(selectedState.children).toBeUndefined()
    })
  })

  describe('IR: State children transformation', () => {
    it('should transform state children to IR', () => {
      const code = `
ExpandBtn: hor, gap 8, pad 12, bg #333
  Text "Mehr zeigen"
  open toggle onclick:
    Text "Weniger zeigen"

ExpandBtn
`
      const ast = parse(code)
      const ir = toIR(ast)

      // Find the instance node (not definition)
      const node = ir.nodes.find(n => n.name === 'ExpandBtn' && !n.isDefinition)
      expect(node).toBeDefined()
      expect(node!.stateMachine).toBeDefined()

      const openState = node!.stateMachine!.states['open']
      expect(openState).toBeDefined()
      expect(openState.children).toBeDefined()
      expect(openState.children!.length).toBe(1)
      expect(openState.children![0].tag).toBe('span')
    })
  })

  describe('DOM Backend: State children generation', () => {
    it('should generate children factory function', () => {
      const code = `
ExpandBtn: hor, gap 8, pad 12, bg #333
  Text "Show more"
  open toggle onclick:
    Text "Show less"

ExpandBtn
`
      const generated = compile(code)

      // Should contain the children factory function
      expect(generated).toContain('children: () => {')
      expect(generated).toContain('_stateChildren')
      expect(generated).toContain('return _stateChildren')
    })

    it('should handle Icon children in states', () => {
      const code = `
Toggle: pad 8, bg #333
  Icon "plus"
  on toggle onclick:
    Icon "x"

Toggle
`
      const generated = compile(code)

      // Should contain icon loading for state children
      expect(generated).toContain('children: () => {')
      expect(generated).toContain('loadIcon')
    })
  })

  describe('Runtime: State children swapping', () => {
    it('should swap children when state changes', () => {
      const code = `
ExpandBtn: hor, gap 8, pad 12, bg #333
  Text "Show more"
  open toggle onclick:
    Text "Show less"

ExpandBtn
`
      const generated = compile(code)
      const ui = runCode(generated)

      const btn = ui.root.querySelector('[data-mirror-id]') as HTMLElement

      // Initial state: should have "Show more"
      expect(btn.textContent).toBe('Show more')
      expect(btn.dataset.state).toBe('default')

      // Click to transition to 'open'
      btn.click()
      expect(btn.dataset.state).toBe('open')
      expect(btn.textContent).toBe('Show less')

      // Click again to toggle back
      btn.click()
      expect(btn.dataset.state).toBe('default')
      // After toggle back, original children should be restored
      expect(btn.textContent).toBe('Show more')
    })

    it('should handle multiple children in state', () => {
      const code = `
ExpandBtn: hor, gap 8, pad 12
  Text "More"
  Icon "chevron-down"
  open toggle onclick:
    Text "Less"
    Icon "chevron-up"

ExpandBtn
`
      const generated = compile(code)
      const ui = runCode(generated)

      const btn = ui.root.querySelector('[data-mirror-id]') as HTMLElement

      // Initial: 2 children
      expect(btn.children.length).toBe(2)

      // Click to open
      btn.click()

      // Open state: still 2 children, but different content
      expect(btn.children.length).toBe(2)
      expect(btn.children[0].textContent).toBe('Less')

      // Click to close
      btn.click()

      // Back to original
      expect(btn.children.length).toBe(2)
      expect(btn.children[0].textContent).toBe('More')
    })
  })
})
