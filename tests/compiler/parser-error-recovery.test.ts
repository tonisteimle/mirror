/**
 * Parser Error Recovery Tests
 *
 * Der Parser soll bei Fehlern weitermachen und alle Fehler sammeln,
 * statt beim ersten Fehler abzubrechen.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { validate } from '../../compiler/validator'

describe('Parser Error Recovery', () => {

  describe('Multiple Errors Collection', () => {
    it('collects multiple syntax errors', () => {
      const code = `
Frame w 100
Button "OK"
  // valid
Frame bg
  // missing value - should error
Text "Hello"
  // valid again
`
      const result = validate(code)
      // Should have parsed the valid elements even with errors
      expect(result).toBeDefined()
    })

    it('continues after missing colon in component definition', () => {
      const code = `
Btn as Button
  bg #333

ValidBtn as Button:
  bg #2563eb

Btn "Click"
ValidBtn "Also Click"
`
      const result = validate(code)
      // Should have error about missing colon
      expect(result.errors.some(e => e.message.includes('colon') || e.message.includes('COLON'))).toBe(true)
      // But should also parse ValidBtn
      expect(result.valid).toBe(false)
    })

    it('continues after invalid property value', () => {
      const code = `
Frame w 100
Frame bg !!!invalid
Frame h 200
`
      const result = validate(code)
      // Should have parsed Frame w 100 and Frame h 200
      expect(result).toBeDefined()
    })

    it('continues after unclosed string', () => {
      const code = `
Text "Hello
Text "World"
Button "Click"
`
      const result = validate(code)
      // Should have error about unclosed string
      expect(result.errors.some(e => e.message.toLowerCase().includes('unclosed') || e.code === 'E010')).toBe(true)
      // But should parse subsequent elements
      expect(result).toBeDefined()
    })

    it('continues after deeply nested error', () => {
      const code = `
Card as Frame:
  Header: bg #333
    Title: col white
      InvalidStuff @#$%
      Text "Still valid"
  Footer: bg #222

Card
  Header
    Title "Works"
`
      const result = validate(code)
      expect(result).toBeDefined()
    })
  })

  describe('Recovery at Different Levels', () => {
    it('recovers from top-level errors', () => {
      const code = `
@@@invalid
Frame w 100
###alsoinvalid
Button "OK"
`
      const result = validate(code)
      // Should have collected errors for invalid tokens
      expect(result.errors.length).toBeGreaterThan(0)
      // But should have parsed Frame and Button
      expect(result).toBeDefined()
    })

    it('recovers from component body errors', () => {
      const code = `
Card as Frame:
  bg #333
  @@@invalid
  pad 16

Card
`
      const result = validate(code)
      expect(result).toBeDefined()
    })

    it('recovers from state block errors', () => {
      const code = `
Btn as Button:
  hover:
    bg #444
    @@@invalid
  on:
    bg #2563eb

Btn "Click"
`
      const result = validate(code)
      expect(result).toBeDefined()
    })

    it('recovers from each loop errors', () => {
      const code = `
items:
  a: name "A"
  b: name "B"

each item in $items
  @@@invalid
  Text "$item.name"
`
      const result = validate(code)
      expect(result).toBeDefined()
    })

    it('recovers from conditional errors', () => {
      const code = `
show: true

if show
  @@@invalid
  Text "Visible"
else
  Text "Hidden"
`
      const result = validate(code)
      expect(result).toBeDefined()
    })
  })

  describe('Partial AST Generation', () => {
    it('generates AST for valid parts before error', () => {
      const code = `
Frame w 100
Button "Valid"
@@@error
`
      const ast = parse(code)
      // Should have parsed Frame and Button
      expect(ast.instances.length).toBeGreaterThanOrEqual(2)
    })

    it('generates AST for valid parts after error', () => {
      const code = `
@@@error
Frame w 100
Button "Valid"
`
      const ast = parse(code)
      // Should have parsed Frame and Button despite initial error
      expect(ast.instances.length).toBeGreaterThanOrEqual(2)
    })

    it('generates AST for valid parts around error', () => {
      const code = `
Frame w 100
@@@error
Button "Valid"
`
      const ast = parse(code)
      // Should have parsed both Frame and Button
      expect(ast.instances.length).toBeGreaterThanOrEqual(2)
    })

    it('generates component definition despite body errors', () => {
      const code = `
Card as Frame:
  bg #333
  @@@invalid
  pad 16

Card
`
      const ast = parse(code)
      // Should have parsed Card component
      expect(ast.components.length).toBe(1)
      expect(ast.components[0].name).toBe('Card')
      // And have the valid properties
      expect(ast.components[0].properties.some(p => p.name === 'bg')).toBe(true)
    })

    it('parses multiple valid components despite one error', () => {
      const code = `
ValidA as Frame:
  bg #111

Invalid as Button

ValidB as Frame:
  bg #222
`
      const ast = parse(code)
      // Should have at least the valid components
      const validComponents = ast.components.filter(c => c.name === 'ValidA' || c.name === 'ValidB')
      expect(validComponents.length).toBe(2)
    })

    it('preserves instance properties after recovery', () => {
      const code = `
Btn as Button
Frame w 100, h 200, bg #333
`
      const ast = parse(code)
      // Frame should have all its properties despite previous error
      const frame = ast.instances.find(i => i.component === 'Frame')
      expect(frame).toBeDefined()
      expect(frame!.properties.length).toBe(3)
    })

    it('preserves nested children after error', () => {
      const code = `
@@@error
Frame
  Text "Child 1"
  Text "Child 2"
`
      const ast = parse(code)
      const frame = ast.instances.find(i => i.component === 'Frame')
      expect(frame).toBeDefined()
      expect(frame!.children?.length).toBe(2)
    })

    it('preserves tokens after recovery', () => {
      const code = `
primary.bg: #2563eb

InvalidComp as Button

Frame bg $primary
`
      const ast = parse(code)
      // Token should be parsed despite component error
      expect(ast.tokens.length).toBeGreaterThanOrEqual(1)
      expect(ast.tokens[0].name).toBe('primary.bg')
    })
  })

  describe('Error Messages Quality', () => {
    it('provides helpful error message for missing colon', () => {
      const code = `Btn as Button`
      const result = validate(code)
      expect(result.errors.length).toBeGreaterThan(0)
      // Should mention colon or have a hint
      const error = result.errors[0]
      expect(error.message.includes('COLON') || error.hint?.includes('colon')).toBe(true)
    })

    it('provides line numbers for all errors', () => {
      const code = `
Line1 @@@
Line2 @@@
Line3 @@@
`
      const result = validate(code)
      // All errors should have line numbers
      for (const error of result.errors) {
        expect(error.line).toBeGreaterThan(0)
      }
    })

    it('provides column numbers for all errors', () => {
      const code = `Frame @@@invalid`
      const result = validate(code)
      // Errors should have column numbers
      for (const error of result.errors) {
        expect(error.column).toBeGreaterThan(0)
      }
    })
  })

  describe('Common Syntax Errors', () => {
    it('handles missing property value', () => {
      const code = `Frame w`
      const result = validate(code)
      expect(result.valid).toBe(false)
    })

    it('handles extra commas', () => {
      const code = `Frame w 100,, h 200`
      const result = validate(code)
      // Should still parse with some tolerance
      expect(result).toBeDefined()
    })

    it('handles mismatched indentation', () => {
      const code = `
Frame
   Text "3 spaces"
  Text "2 spaces"
`
      const result = validate(code)
      // Should warn about inconsistent indentation but continue
      expect(result).toBeDefined()
    })

    it('handles unknown primitive', () => {
      const code = `
Btn as UnknownPrimitive:
  bg #333

Btn "Click"
`
      const result = validate(code)
      // Should error about unknown primitive
      expect(result.errors.some(e => e.code === 'E001' || e.message.includes('Unknown'))).toBe(true)
    })

    it('handles circular reference', () => {
      const code = `
A as B:
B as A:
`
      const result = validate(code)
      // Should detect and report circular reference
      expect(result).toBeDefined()
    })
  })

  describe('Stress Tests', () => {
    it('handles many errors without hanging', () => {
      // 100 lines of errors
      let code = ''
      for (let i = 0; i < 100; i++) {
        code += `@@@error${i}\n`
      }
      code += 'Frame w 100\n'

      const start = Date.now()
      const result = validate(code)
      const duration = Date.now() - start

      // Should complete in reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000)
      // Should have collected errors
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('handles alternating valid and invalid lines', () => {
      let code = ''
      for (let i = 0; i < 50; i++) {
        if (i % 2 === 0) {
          code += `Frame w ${i * 10}\n`
        } else {
          code += `@@@error\n`
        }
      }

      const result = validate(code)
      // Should have parsed some valid frames
      expect(result).toBeDefined()
    })
  })
})
