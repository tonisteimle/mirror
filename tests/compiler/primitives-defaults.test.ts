/**
 * Primitive Defaults Tests
 *
 * Verify that primitives have the correct default properties,
 * especially width: hug (fit-content) for non-container elements.
 */

import { describe, it, expect } from 'vitest'
import { parse, toIR } from '../../compiler'

function compileToIR(code: string) {
  const ast = parse(code)
  return toIR(ast)
}

describe('Primitive Width Defaults', () => {
  describe('Non-container primitives should have w hug', () => {
    it('Button should have width: fit-content', () => {
      const ir = compileToIR('Button "Click"')
      const styles = ir.nodes[0].styles
      const hasHug = styles.some(s => s.property === 'width' && s.value === 'fit-content')
      expect(hasHug).toBe(true)
    })

    it('Link should have width: fit-content', () => {
      const ir = compileToIR('Link "Click here"')
      const styles = ir.nodes[0].styles
      const hasHug = styles.some(s => s.property === 'width' && s.value === 'fit-content')
      expect(hasHug).toBe(true)
    })

    it('Label should have width: fit-content', () => {
      const ir = compileToIR('Label "Name:"')
      const styles = ir.nodes[0].styles
      const hasHug = styles.some(s => s.property === 'width' && s.value === 'fit-content')
      expect(hasHug).toBe(true)
    })

    it('H1 should have width: fit-content', () => {
      const ir = compileToIR('H1 "Title"')
      const styles = ir.nodes[0].styles
      const hasHug = styles.some(s => s.property === 'width' && s.value === 'fit-content')
      expect(hasHug).toBe(true)
    })

    it('H2 should have width: fit-content', () => {
      const ir = compileToIR('H2 "Subtitle"')
      const styles = ir.nodes[0].styles
      const hasHug = styles.some(s => s.property === 'width' && s.value === 'fit-content')
      expect(hasHug).toBe(true)
    })

    it('H3 should have width: fit-content', () => {
      const ir = compileToIR('H3 "Section"')
      const styles = ir.nodes[0].styles
      const hasHug = styles.some(s => s.property === 'width' && s.value === 'fit-content')
      expect(hasHug).toBe(true)
    })
  })

  describe('Container primitives should stretch by default', () => {
    it('Frame should have align-self: stretch (not fit-content)', () => {
      // Frame is a container - it should stretch to fill parent width,
      // not shrink to content like Button/Link
      const ir = compileToIR('Frame')
      const styles = ir.nodes[0].styles

      // Frame should have align-self: stretch
      const hasStretch = styles.some(s => s.property === 'align-self' && s.value === 'stretch')
      expect(hasStretch).toBe(true)

      // Frame should NOT have width: fit-content
      const hasFitContent = styles.some(s => s.property === 'width' && s.value === 'fit-content')
      expect(hasFitContent).toBe(false)
    })
  })

  describe('Button in flex container should not stretch', () => {
    it('Button in Frame hor should keep its natural width', () => {
      const ir = compileToIR(`Frame hor, gap 8
  Button "A"
  Button "Long Button Text"`)

      const frame = ir.nodes[0]
      const button1 = frame.children![0]
      const button2 = frame.children![1]

      // Both buttons should have fit-content
      const btn1HasHug = button1.styles.some(
        s => s.property === 'width' && s.value === 'fit-content'
      )
      const btn2HasHug = button2.styles.some(
        s => s.property === 'width' && s.value === 'fit-content'
      )

      expect(btn1HasHug).toBe(true)
      expect(btn2HasHug).toBe(true)
    })
  })

  describe('Link in flex container should not stretch', () => {
    it('Link in Frame should keep its natural width', () => {
      const ir = compileToIR(`Frame gap 8
  Link "Home"
  Link "About Us"`)

      const frame = ir.nodes[0]
      const link1 = frame.children![0]
      const link2 = frame.children![1]

      const link1HasHug = link1.styles.some(
        s => s.property === 'width' && s.value === 'fit-content'
      )
      const link2HasHug = link2.styles.some(
        s => s.property === 'width' && s.value === 'fit-content'
      )

      expect(link1HasHug).toBe(true)
      expect(link2HasHug).toBe(true)
    })
  })
})
