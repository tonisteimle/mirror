/**
 * Tests for $-variable system
 *
 * $name accesses variables from three sources:
 * 1. Tokens (defined in Mirror)
 * 2. YAML data (from data/*.yaml)
 * 3. JavaScript variables (globalThis)
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser/parser'
import { generateDOM } from '../../compiler/backends/dom'

describe('$-Variables: Code Generation', () => {
  describe('__mirrorData and $get() helper', () => {
    it('always generates __mirrorData object', () => {
      const ast = parse('Frame')
      const code = generateDOM(ast)

      // __mirrorData is also exposed to window for debugging and two-way binding
      expect(code).toContain('const __mirrorData = window.__mirrorData = {')
      expect(code).toContain('function $get(name)')
    })

    it('generates $get helper with correct lookup order', () => {
      const ast = parse('Frame')
      const code = generateDOM(ast)

      // Should lookup in __mirrorData first, then globalThis
      expect(code).toContain('__mirrorData[parts[0]] ?? globalThis[parts[0]]')
    })

    it('puts tokens into __mirrorData', () => {
      const ast = parse(`
$userName: "Max"
$count: 42
Frame`)
      const code = generateDOM(ast)

      expect(code).toContain('"userName": "Max"')
      // Note: numeric tokens are stored as strings in IR
      expect(code).toContain('"count":')
    })
  })

  describe('Text content with $-variables', () => {
    it('converts $name to $get("name") for text content', () => {
      const ast = parse(`
$userName: "Test"
Text $userName`)
      const code = generateDOM(ast)

      expect(code).toContain('$get("userName")')
    })

    it('handles nested property access: $user.name', () => {
      const ast = parse(`
Text $user.name`)
      const code = generateDOM(ast)

      expect(code).toContain('$get("user.name")')
    })

    it('does NOT convert currency literals: $12.4k', () => {
      const ast = parse('Text "$12.4k"')
      const code = generateDOM(ast)

      // Should be a literal string, not a $get call
      expect(code).toContain('"$12.4k"')
      expect(code).not.toContain('$get("12.4k")')
    })

    it('does NOT convert number literals: $100', () => {
      const ast = parse('Text "$100"')
      const code = generateDOM(ast)

      expect(code).toContain('"$100"')
      expect(code).not.toContain('$get("100")')
    })

    it('converts underscore-prefixed: $_private', () => {
      const ast = parse('Text $_private')
      const code = generateDOM(ast)

      expect(code).toContain('$get("_private")')
    })
  })

  describe('Each loops with $-variables', () => {
    it('converts each in $collection to $get()', () => {
      const ast = parse(`
each user in $users
  Text user.name`)
      const code = generateDOM(ast)

      expect(code).toContain("$get('users')")
    })

    it('inline arrays still work', () => {
      const ast = parse(`
each item in ["a", "b", "c"]
  Text item`)
      const code = generateDOM(ast)

      // Inline array should be used directly, not via $get
      expect(code).toContain('["a", "b", "c"]')
    })
  })
})

describe('$-Variables: Runtime Behavior', () => {
  it('$get returns value from __mirrorData', () => {
    // Simulate the generated $get function
    const __mirrorData: Record<string, unknown> = { userName: 'Max' }

    function $get(name: string) {
      const parts = name.split('.')
      let val: unknown = __mirrorData[parts[0]] ?? (globalThis as Record<string, unknown>)[parts[0]]
      for (let i = 1; i < parts.length && val != null; i++) {
        val = (val as Record<string, unknown>)[parts[i]]
      }
      return val
    }

    expect($get('userName')).toBe('Max')
  })

  it('$get handles nested properties', () => {
    const __mirrorData: Record<string, unknown> = {
      user: { name: 'Anna', profile: { email: 'anna@test.com' } }
    }

    function $get(name: string) {
      const parts = name.split('.')
      let val: unknown = __mirrorData[parts[0]] ?? (globalThis as Record<string, unknown>)[parts[0]]
      for (let i = 1; i < parts.length && val != null; i++) {
        val = (val as Record<string, unknown>)[parts[i]]
      }
      return val
    }

    expect($get('user.name')).toBe('Anna')
    expect($get('user.profile.email')).toBe('anna@test.com')
  })

  it('$get returns undefined for missing values', () => {
    const __mirrorData: Record<string, unknown> = {}

    function $get(name: string) {
      const parts = name.split('.')
      let val: unknown = __mirrorData[parts[0]] ?? (globalThis as Record<string, unknown>)[parts[0]]
      for (let i = 1; i < parts.length && val != null; i++) {
        val = (val as Record<string, unknown>)[parts[i]]
      }
      return val
    }

    expect($get('nonExistent')).toBeUndefined()
    expect($get('user.missing.deep')).toBeUndefined()
  })
})

describe('$-Variables: Expressions (Concatenation & Arithmetic)', () => {
  it('generates string concatenation: "Hello " + $name', () => {
    const ast = parse('Text "Hello " + $name')
    const code = generateDOM(ast)

    expect(code).toContain('"Hello " + $get("name")')
  })

  it('generates variable + string: $count + " items"', () => {
    const ast = parse('Text $count + " items"')
    const code = generateDOM(ast)

    expect(code).toContain('$get("count") + " items"')
  })

  it('generates multiple concatenations: $firstName + " " + $lastName', () => {
    const ast = parse('Text $firstName + " " + $lastName')
    const code = generateDOM(ast)

    expect(code).toContain('$get("firstName") + " " + $get("lastName")')
  })

  it('generates arithmetic: $count * $price', () => {
    const ast = parse('Text $count * $price')
    const code = generateDOM(ast)

    expect(code).toContain('$get("count") * $get("price")')
  })

  it('handles nested property access in expressions: $user.name + " logged in"', () => {
    const ast = parse('Text $user.name + " logged in"')
    const code = generateDOM(ast)

    expect(code).toContain('$get("user.name") + " logged in"')
  })

  it('handles index + number: index + 1', () => {
    const ast = parse(`
each item in ["a", "b", "c"] with index
  Text index + 1`)
    const code = generateDOM(ast)

    // index is a loop variable, not a $-variable
    expect(code).toContain('index + 1')
  })
})
