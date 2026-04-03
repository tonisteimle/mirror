/**
 * Tests for Two-Way Data Binding
 *
 * Verifies that:
 * 1. Input elements with token value get valueBinding in IR
 * 2. DOM backend generates binding code
 * 3. $set function updates data and notifies bindings
 */

import { describe, test, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'
import { generateDOM } from '../../compiler/backends/dom'

describe('Two-Way Data Binding', () => {
  describe('IR Generation', () => {
    test('Input with token value has valueBinding', () => {
      const code = `
$user.name: "Max"

Input value $user.name, placeholder "Name"
`
      const ast = parse(code)
      const ir = toIR(ast)

      // Find the input node
      const inputNode = ir.nodes.find(n => n.primitive === 'input')
      expect(inputNode).toBeDefined()
      expect(inputNode!.valueBinding).toBe('user.name')
    })

    test('Input with static value has no valueBinding', () => {
      const code = `Input value "static text", placeholder "Name"`
      const ast = parse(code)
      const ir = toIR(ast)

      const inputNode = ir.nodes.find(n => n.primitive === 'input')
      expect(inputNode).toBeDefined()
      expect(inputNode!.valueBinding).toBeUndefined()
    })

    test('Textarea with token value has valueBinding', () => {
      const code = `
$content: "Hello"

Textarea value $content, placeholder "Enter text"
`
      const ast = parse(code)
      const ir = toIR(ast)

      const textareaNode = ir.nodes.find(n => n.primitive === 'textarea')
      expect(textareaNode).toBeDefined()
      expect(textareaNode!.valueBinding).toBe('content')
    })

    test('Frame with token does not get valueBinding', () => {
      const code = `
$color: #ff0000

Frame bg $color, pad 16
`
      const ast = parse(code)
      const ir = toIR(ast)

      const frameNode = ir.nodes.find(n => n.primitive === 'frame')
      expect(frameNode).toBeDefined()
      expect(frameNode!.valueBinding).toBeUndefined()
    })

    test('Nested data path in valueBinding', () => {
      const code = `
$posts.first.title: "Hello World"

Input value $posts.first.title
`
      const ast = parse(code)
      const ir = toIR(ast)

      const inputNode = ir.nodes.find(n => n.primitive === 'input')
      expect(inputNode).toBeDefined()
      expect(inputNode!.valueBinding).toBe('posts.first.title')
    })
  })

  describe('DOM Code Generation', () => {
    test('generates binding code for input with valueBinding', () => {
      const code = `
$user.name: "Max"

Input value $user.name
`
      const ast = parse(code)
      const output = generateDOM(ast)

      // Should have initial value assignment
      expect(output).toContain('$get("user.name")')

      // Should have input event listener
      expect(output).toContain('addEventListener(\'input\'')
      expect(output).toContain('$set("user.name"')

      // Should register binding
      expect(output).toContain('_runtime.bindValue')
      expect(output).toContain('"user.name"')
    })

    test('generates $set function in header', () => {
      const code = `
$name: "Test"

Input value $name
`
      const ast = parse(code)
      const output = generateDOM(ast)

      // Should define $set function
      expect(output).toContain('function $set(path, value)')
      expect(output).toContain('__mirrorData')
      expect(output).toContain('notifyDataChange')
    })

    test('does not generate binding code for static value', () => {
      const code = `Input value "static", placeholder "Name"`
      const ast = parse(code)
      const output = generateDOM(ast)

      // Should NOT have binding registration
      expect(output).not.toContain('_runtime.bindValue')
      // Should NOT have two-way binding comment
      expect(output).not.toContain('Two-way data binding')
    })
  })

  describe('Value property handling', () => {
    test('value property preserves $ reference for binding', () => {
      const code = `
$data.field: "initial"

Input value $data.field
`
      const ast = parse(code)
      const ir = toIR(ast)

      const inputNode = ir.nodes.find(n => n.primitive === 'input')
      expect(inputNode).toBeDefined()

      // The value property should preserve the $-reference
      const valueProp = inputNode!.properties.find(p => p.name === 'value')
      expect(valueProp).toBeDefined()
      expect(valueProp!.value).toBe('$data.field')
    })
  })

  describe('Integration: Text + Input binding', () => {
    test('Input and Text can both reference same token', () => {
      const code = `
$name: "Max"

Frame gap 12
  Input value $name
  Text "Hello, " + $name
`
      const ast = parse(code)
      const output = generateDOM(ast)

      // Input should have binding
      expect(output).toContain('_runtime.bindValue')

      // Text should use $get for the expression
      expect(output).toContain('$get("name")')

      // Data should be initialized
      expect(output).toContain('"name": "Max"')
    })
  })

  describe('Text reactive binding', () => {
    test('Text with $-reference gets text binding and template', () => {
      const code = `
$name: "Max"

Text "Hello, " + $name
`
      const ast = parse(code)
      const output = generateDOM(ast)

      // Should register text binding
      expect(output).toContain('_runtime.bindText')
      expect(output).toContain('"name"')

      // Should store template for re-evaluation
      expect(output).toContain('_textTemplate')
      expect(output).toContain('$get("name")')
    })

    test('Text with simple $-reference gets binding', () => {
      const code = `
$title: "Welcome"

Text $title
`
      const ast = parse(code)
      const output = generateDOM(ast)

      // Should register text binding
      expect(output).toContain('_runtime.bindText')

      // Should have template
      expect(output).toContain('_textTemplate')
    })

    test('Text without $-reference has no binding', () => {
      const code = `Text "Static text"`
      const ast = parse(code)
      const output = generateDOM(ast)

      // Should NOT have text binding on element
      expect(output).not.toContain('_runtime.bindText')
      // Should NOT have element-specific _textTemplate assignment
      // (Note: _textTemplate exists in runtime helper code, but not as element assignment)
      expect(output).not.toMatch(/\w+\._textTemplate\s*=/)
    })

    test('Multiple $-references in one Text element', () => {
      const code = `
$first: "John"
$last: "Doe"

Text $first + " " + $last
`
      const ast = parse(code)
      const output = generateDOM(ast)

      // Should register both bindings
      expect(output).toContain('_runtime.bindText')
      expect(output).toContain('"first"')
      expect(output).toContain('"last"')
    })
  })
})
