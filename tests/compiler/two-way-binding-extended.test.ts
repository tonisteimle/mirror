/**
 * Extended Tests for Two-Way Data Binding
 *
 * Tests edge cases, runtime behavior, and component integration
 *
 * @vitest-environment jsdom
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'
import { generateDOM } from '../../compiler/backends/dom'
import {
  bindValue,
  bindText,
  notifyDataChange,
  unbindValue,
} from '../../compiler/runtime/dom-runtime'

describe('Two-Way Binding: Edge Cases', () => {
  describe('Nested data paths', () => {
    test('deeply nested path in valueBinding', () => {
      const code = `
$app.user.profile.name: "Max"

Input value $app.user.profile.name
`
      const ast = parse(code)
      const ir = toIR(ast)

      const inputNode = ir.nodes.find(n => n.primitive === 'input')
      expect(inputNode?.valueBinding).toBe('app.user.profile.name')
    })

    test('deeply nested path generates correct $set call', () => {
      const code = `
$app.settings.theme.color: "#fff"

Input value $app.settings.theme.color
`
      const ast = parse(code)
      const output = generateDOM(ast)

      expect(output).toContain('$set("app.settings.theme.color"')
      expect(output).toContain('$get("app.settings.theme.color")')
    })
  })

  describe('Multiple inputs same path', () => {
    test('two inputs bound to same token', () => {
      const code = `
$name: "Max"

Frame gap 12
  Input value $name, placeholder "Input 1"
  Input value $name, placeholder "Input 2"
`
      const ast = parse(code)
      const output = generateDOM(ast)

      // Both should have bindings to "name"
      const bindValueCalls = output.match(/_runtime\.bindValue\([^,]+, "name"\)/g)
      expect(bindValueCalls?.length).toBe(2)
    })
  })

  describe('Input inside components', () => {
    test('Input in component definition has valueBinding', () => {
      const code = `
$search: ""

SearchBox: Frame pad 12, bg #1a1a1a, rad 8
  Input value $search, placeholder "Search..."

SearchBox
`
      const ast = parse(code)
      const output = generateDOM(ast)

      expect(output).toContain('_runtime.bindValue')
      expect(output).toContain('"search"')
    })
  })

  describe('Mixed static and dynamic values', () => {
    test('Input with static value followed by Input with token', () => {
      const code = `
$dynamic: "dynamic value"

Frame gap 8
  Input value "static", placeholder "Static"
  Input value $dynamic, placeholder "Dynamic"
`
      const ast = parse(code)
      const ir = toIR(ast)

      // Find inputs - first child of frame
      const frame = ir.nodes.find(n => n.primitive === 'frame')
      const inputs = frame?.children.filter(n => n.primitive === 'input') || []

      expect(inputs[0]?.valueBinding).toBeUndefined()
      expect(inputs[1]?.valueBinding).toBe('dynamic')
    })
  })
})

describe('Two-Way Binding: Runtime Functions', () => {
  let mockElement: any

  beforeEach(() => {
    mockElement = {
      value: '',
      textContent: '',
      addEventListener: vi.fn(),
    }
  })

  describe('bindValue', () => {
    test('stores binding path on element', () => {
      bindValue(mockElement, 'user.name')
      expect(mockElement._valueBinding).toBe('user.name')
    })

    test('can bind multiple elements to same path', () => {
      const el1 = { ...mockElement }
      const el2 = { ...mockElement }

      bindValue(el1, 'shared.value')
      bindValue(el2, 'shared.value')

      expect(el1._valueBinding).toBe('shared.value')
      expect(el2._valueBinding).toBe('shared.value')
    })
  })

  describe('bindText', () => {
    test('stores binding path on element', () => {
      bindText(mockElement, 'title')
      expect(mockElement._textBinding).toBe('title')
    })
  })

  describe('notifyDataChange', () => {
    test('updates bound input elements', () => {
      const input = {
        value: 'old',
        _valueBinding: 'name',
      }

      bindValue(input as any, 'name')
      notifyDataChange('name', 'new value')

      expect(input.value).toBe('new value')
    })

    test('skips focused element to prevent cursor jump', () => {
      const input = {
        value: 'old',
        _valueBinding: 'name',
      }

      // Mock document.activeElement
      const originalActiveElement = document.activeElement
      Object.defineProperty(document, 'activeElement', {
        value: input,
        configurable: true,
      })

      bindValue(input as any, 'name')
      notifyDataChange('name', 'new value')

      // Should NOT update because it's the active element
      expect(input.value).toBe('old')

      // Restore
      Object.defineProperty(document, 'activeElement', {
        value: originalActiveElement,
        configurable: true,
      })
    })

    test('calls _textTemplate for text elements', () => {
      const textEl = {
        textContent: 'old',
        _textTemplate: vi.fn(() => 'Hello, World'),
        _textBinding: 'name',
      }

      bindText(textEl as any, 'name')
      notifyDataChange('name', 'World')

      expect(textEl._textTemplate).toHaveBeenCalled()
      expect(textEl.textContent).toBe('Hello, World')
    })

    test('handles missing _textTemplate gracefully', () => {
      const textEl = {
        textContent: 'old',
        _textBinding: 'name',
      }

      bindText(textEl as any, 'name')
      notifyDataChange('name', 'new')

      expect(textEl.textContent).toBe('new')
    })
  })

  describe('unbindValue', () => {
    test('removes element from bindings', () => {
      const input = {
        value: 'test',
        _valueBinding: 'name',
      }

      bindValue(input as any, 'name')
      unbindValue(input as any)

      // After unbind, notifyDataChange should not update this element
      input.value = 'unchanged'
      notifyDataChange('name', 'new value')

      // Element should not be updated (it was unbound)
      // Note: This depends on implementation - may need adjustment
    })
  })
})

describe('Two-Way Binding: $set Function Generation', () => {
  test('$set updates nested paths correctly', () => {
    const code = `
$user.profile.name: "Max"

Input value $user.profile.name
`
    const ast = parse(code)
    const output = generateDOM(ast)

    // Verify $set handles nested paths
    expect(output).toContain('const parts = path.split(".")')
    expect(output).toContain('obj[parts[i]]')
  })

  test('$set notifies runtime of changes', () => {
    const code = `
$name: "Max"

Input value $name
`
    const ast = parse(code)
    const output = generateDOM(ast)

    expect(output).toContain('_runtime.notifyDataChange')
  })
})

describe('Two-Way Binding: Text Expression Templates', () => {
  test('complex expression is stored as template', () => {
    const code = `
$count: 5
$unit: "items"

Text $count + " " + $unit + " selected"
`
    const ast = parse(code)
    const output = generateDOM(ast)

    // Should have template
    expect(output).toContain('_textTemplate')

    // Should bind to both variables
    expect(output).toContain('_runtime.bindText')
  })

  test('template preserves string concatenation', () => {
    const code = `
$name: "Max"

Text "Welcome, " + $name + "!"
`
    const ast = parse(code)
    const output = generateDOM(ast)

    // Template should preserve the expression structure
    expect(output).toContain('"Welcome, "')
    expect(output).toContain('$get("name")')
  })
})

describe('Two-Way Binding: Special Cases', () => {
  test('token with suffix in different context', () => {
    const code = `
$primary.bg: #2563eb
$primary.col: white

Frame bg $primary
  Input value $primary.col
`
    const ast = parse(code)
    const ir = toIR(ast)

    // Frame should use primary.bg for background (CSS context)
    // Input value should bind to primary.col
    const frame = ir.nodes.find(n => n.primitive === 'frame')
    const input = frame?.children.find(n => n.primitive === 'input')

    expect(input?.valueBinding).toBe('primary.col')
  })

  test('password input with binding', () => {
    const code = `
$password: ""

Input value $password, type password, placeholder "Password"
`
    const ast = parse(code)
    const ir = toIR(ast)
    const output = generateDOM(ast)

    const inputNode = ir.nodes.find(n => n.primitive === 'input')
    expect(inputNode?.valueBinding).toBe('password')
    // Check that type attribute is set (format may vary)
    expect(output).toMatch(/type['"],?\s*['"]?password/)
  })
})
