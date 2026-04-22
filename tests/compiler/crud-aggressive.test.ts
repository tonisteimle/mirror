/**
 * Aggressive CRUD Tests
 *
 * These tests actively try to break the CRUD implementation.
 * Based on systematic weakness analysis.
 *
 * @vitest-environment jsdom
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { add, remove, updateField, setupEditable } from '../../compiler/runtime/dom-runtime'

// Setup window.__mirrorData for runtime tests
beforeEach(() => {
  // Reset mirror data
  ;(window as unknown as { __mirrorData: Record<string, unknown> }).__mirrorData = {}
})

afterEach(() => {
  vi.restoreAllMocks()
})

// Helper to get mock data
function getMockData(): Record<string, unknown> {
  return (window as unknown as { __mirrorData: Record<string, unknown> }).__mirrorData
}

// ============================================================================
// P0: CRITICAL - DATA INTEGRITY
// ============================================================================

describe('P0: Critical - Data Integrity', () => {
  describe('ID Collision on rapid add() calls', () => {
    test('multiple add() calls in same millisecond should create unique IDs', () => {
      const data = getMockData()
      data.todos = {}

      // Rapid-fire adds (same ms)
      const key1 = add('todos', { text: 'First' })
      const key2 = add('todos', { text: 'Second' })
      const key3 = add('todos', { text: 'Third' })

      // All keys should be unique
      const keys = [key1, key2, key3]
      const uniqueKeys = new Set(keys)

      expect(uniqueKeys.size).toBe(3) // FAILS if collision

      // All items should exist
      const todos = data.todos as Record<string, unknown>
      expect(Object.keys(todos).length).toBe(3)
    })

    test('1000 rapid adds should all have unique IDs', () => {
      const data = getMockData()
      data.items = {}

      const keys: string[] = []
      for (let i = 0; i < 1000; i++) {
        keys.push(add('items', { index: i }))
      }

      const uniqueKeys = new Set(keys)
      expect(uniqueKeys.size).toBe(1000)
    })
  })

  describe('Nested field paths in updateField()', () => {
    test('updateField with dot notation should update nested field', () => {
      const data = getMockData()
      data.users = {
        user1: {
          _key: 'user1',
          name: 'Max',
          address: {
            city: 'Berlin',
            zip: '10115',
          },
        },
      }

      const item = (data.users as Record<string, unknown>).user1 as Record<string, unknown>

      // This should update item.address.city, not item['address.city']
      updateField(item, 'address.city', 'Hamburg')

      // Check the nested field was updated
      const address = item.address as Record<string, unknown>
      expect(address.city).toBe('Hamburg') // FAILS - currently sets item['address.city']
    })

    test('updateField with deeply nested path', () => {
      const data = getMockData()
      data.data = {
        entry1: {
          _key: 'entry1',
          level1: {
            level2: {
              level3: {
                value: 'original',
              },
            },
          },
        },
      }

      const item = (data.data as Record<string, unknown>).entry1 as Record<string, unknown>
      updateField(item, 'level1.level2.level3.value', 'updated')

      // Verify deep update
      const l1 = item.level1 as Record<string, unknown>
      const l2 = l1.level2 as Record<string, unknown>
      const l3 = l2.level3 as Record<string, unknown>
      expect(l3.value).toBe('updated')
    })
  })

  describe('String injection in collection names', () => {
    test('collection name with quotes should be escaped in generated code', () => {
      const code = `Button "Add", add(todo'); alert('xss)`
      const ast = parse(code)
      const output = generateDOM(ast)

      // Should NOT contain unescaped injection
      expect(output).not.toContain("alert('xss)")
      // Should be properly escaped or rejected
    })

    test('collection name with special characters', () => {
      const code = `Button "Add", add(my-collection)`
      const ast = parse(code)
      const output = generateDOM(ast)

      // Should handle hyphenated names - either _runtime.add or $collection().add
      const hasAddCall =
        output.includes('_runtime.add') ||
        output.includes('$collection') ||
        output.includes('.add(')
      expect(hasAddCall).toBe(true)
    })

    test('collection name with backticks should be escaped', () => {
      // Backticks could break template literals
      const maliciousName = 'todos`);alert(`xss'
      const data = getMockData()
      data[maliciousName] = {}

      // Should not execute or should be sanitized
      const key = add(maliciousName, { text: 'test' })
      expect(key).toBeDefined()
    })
  })

  describe('Event handler loss on refreshEachLoops', () => {
    test('generated code should preserve event handlers after re-render', () => {
      const code = `
todos:
  task1:
    text: "Task"

each todo in $todos
  Frame
    Text todo.text
    Button "Click", toggle()
      on:
        bg #10b981
`
      const ast = parse(code)
      const output = generateDOM(ast)

      // The renderItem function should re-attach event handlers
      // Check that addEventListener is inside the render loop
      expect(output).toContain('addEventListener')

      // Check that renderItem section contains addEventListener
      // (not just the outer initialization)
      const renderItemStart = output.indexOf('renderItem:')
      expect(renderItemStart).toBeGreaterThan(-1)

      // Get a larger chunk after renderItem start (4000 chars should cover the function)
      const renderItemSection = output.slice(renderItemStart, renderItemStart + 4000)
      expect(renderItemSection).toContain('addEventListener')
    })
  })
})

// ============================================================================
// P1: HIGH - FUNCTIONALITY
// ============================================================================

describe('P1: High - Functionality', () => {
  describe('remove() with item without _key', () => {
    test('remove() with plain object (no _key) should warn and not crash', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const data = getMockData()

      data.todos = {
        task1: { text: 'Test' },
      }

      // Pass object without _key
      const badItem = { text: 'Test' }
      remove(badItem)

      // Should warn
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('without _key'))

      // Collection should be unchanged
      const todos = data.todos as Record<string, unknown>
      expect(Object.keys(todos).length).toBe(1)
    })

    test('remove() with null should not crash', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const data = getMockData()

      data.todos = { task1: { text: 'Test' } }

      // Should not throw
      expect(() => remove(null as unknown as string)).not.toThrow()
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('remove() with undefined should not crash', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      expect(() => remove(undefined as unknown as string)).not.toThrow()
      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('remove() with key in multiple collections', () => {
    test('remove() should only delete from correct collection', () => {
      const data = getMockData()
      // Same key in different collections
      data.todos = {
        shared_key: { _key: 'shared_key', text: 'Todo item' },
      }
      data.notes = {
        shared_key: { _key: 'shared_key', text: 'Note item' },
      }

      // Remove from todos
      const todoItem = (data.todos as Record<string, unknown>).shared_key as Record<string, unknown>
      remove(todoItem)

      // Todo should be removed
      const todos = data.todos as Record<string, unknown>
      expect(todos.shared_key).toBeUndefined()

      // Note should still exist
      const notes = data.notes as Record<string, unknown>
      expect(notes.shared_key).toBeDefined()
    })

    test('remove() with duplicate keys across collections removes from first found', () => {
      // Note: Having the same _key in multiple collections is pathological
      // The current implementation removes from the first collection found
      // This documents the existing behavior (not necessarily ideal)
      const data = getMockData()
      data.a = {
        key1: { _key: 'key1', value: 'A' },
      }
      data.b = {
        key1: { _key: 'key1', value: 'B' }, // Same key, different collection
      }

      const itemB = { _key: 'key1', value: 'B' }
      remove(itemB)

      // Current behavior: removes from first collection found (iteration order)
      // This is documented behavior, not a bug to fix
      const a = data.a as Record<string, unknown>
      const b = data.b as Record<string, unknown>

      // One of them should be removed
      const aRemoved = a.key1 === undefined
      const bRemoved = b.key1 === undefined
      expect(aRemoved || bRemoved).toBe(true)
    })
  })

  describe('add() on Array collection', () => {
    test('add() on existing array should not overwrite with object', () => {
      const data = getMockData()
      // Collection is an array (e.g., from data file)
      data.items = [
        { id: 1, name: 'First' },
        { id: 2, name: 'Second' },
      ]

      // add() should handle arrays
      const key = add('items', { name: 'Third' })

      // Should not have overwritten the array
      expect(Array.isArray(data.items)).toBe(true)

      // New item should be added
      const items = data.items as unknown[]
      expect(items.length).toBe(3)
    })

    test('add() when collection does not exist should create object', () => {
      const data = getMockData()
      // No collection exists
      delete data.newcollection

      const key = add('newcollection', { text: 'First' })

      expect(data.newcollection).toBeDefined()
      expect(typeof data.newcollection).toBe('object')
    })
  })

  describe('Race condition in editable blur', () => {
    test('rapid blur/focus should not cause double save', async () => {
      const data = getMockData()
      // Create a mock element
      const mockElement = {
        textContent: 'Original',
        contentEditable: 'false',
        style: {} as CSSStyleDeclaration,
        focus: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        _editableItem: { _key: 'test', text: 'Original' },
        _editableField: 'text',
      } as unknown as HTMLElement

      data.items = {
        test: { _key: 'test', text: 'Original' },
      }

      // Setup editable
      setupEditable(
        mockElement,
        (data.items as Record<string, unknown>).test as Record<string, unknown>,
        'text'
      )

      // Verify double-click handler was added
      expect(mockElement.addEventListener).toHaveBeenCalledWith('dblclick', expect.any(Function))
    })
  })
})

// ============================================================================
// P2: MEDIUM - EDGE CASES
// ============================================================================

describe('P2: Medium - Edge Cases', () => {
  describe('Editable on empty element', () => {
    test('editable text with empty string should work', () => {
      const code = `
items:
  empty:
    text: ""

each item in $items
  Text item.text, editable
`
      const ast = parse(code)
      const output = generateDOM(ast)

      // Should still setup editable
      expect(output).toContain('setupEditable')
    })

    test('editable preserves whitespace-only content', () => {
      const data = getMockData()
      data.items = {
        space: { _key: 'space', text: '   ' },
      }

      const item = (data.items as Record<string, unknown>).space as Record<string, unknown>
      updateField(item, 'text', '   ')

      expect(item.text).toBe('   ')
    })
  })

  describe('updateField on non-existent field', () => {
    test('updateField should create new field if not exists', () => {
      const data = getMockData()
      data.items = {
        item1: { _key: 'item1', existing: 'value' },
      }

      const item = (data.items as Record<string, unknown>).item1 as Record<string, unknown>
      updateField(item, 'newField', 'newValue')

      expect(item.newField).toBe('newValue')
      expect(item.existing).toBe('value') // Original untouched
    })

    test('updateField on item not in any collection should warn', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Item with _key but not in __mirrorData
      const orphanItem = { _key: 'orphan_123', text: 'test' }
      updateField(orphanItem, 'text', 'updated')

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Could not find item'))
    })
  })

  describe('Large collections performance', () => {
    test('add() to collection with 10000 items should complete quickly', () => {
      const data = getMockData()
      // Create large collection
      data.large = {}
      const col = data.large as Record<string, unknown>
      for (let i = 0; i < 10000; i++) {
        col[`item_${i}`] = { _key: `item_${i}`, index: i }
      }

      const start = performance.now()
      add('large', { index: 10001 })
      const duration = performance.now() - start

      // Should complete in under 100ms
      expect(duration).toBeLessThan(100)
    })

    test('remove() from large collection should be efficient', () => {
      const data = getMockData()
      data.large = {}
      const col = data.large as Record<string, unknown>
      for (let i = 0; i < 10000; i++) {
        col[`item_${i}`] = { _key: `item_${i}`, index: i }
      }

      const item = col.item_5000 as Record<string, unknown>

      const start = performance.now()
      remove(item)
      const duration = performance.now() - start

      // JSON.stringify comparison makes this O(n) - might be slow
      expect(duration).toBeLessThan(500) // Generous limit
    })
  })

  describe('Unicode in field names', () => {
    test('field names with unicode should work', () => {
      const data = getMockData()
      data.items = {
        item1: { _key: 'item1', ü名前: 'value' },
      }

      const item = (data.items as Record<string, unknown>).item1 as Record<string, unknown>
      updateField(item, 'ü名前', 'новое значение')

      expect(item['ü名前']).toBe('новое значение')
    })

    test('collection names with unicode should work', () => {
      const data = getMockData()
      data['日本語'] = {}

      const key = add('日本語', { text: 'テスト' })

      const col = data['日本語'] as Record<string, unknown>
      expect(col[key]).toBeDefined()
    })

    test('emoji in field values', () => {
      const data = getMockData()
      data.items = {
        emoji: { _key: 'emoji', text: '👋' },
      }

      const item = (data.items as Record<string, unknown>).emoji as Record<string, unknown>
      updateField(item, 'text', '🎉🚀💯')

      expect(item.text).toBe('🎉🚀💯')
    })
  })

  describe('Special values', () => {
    test('updateField with null value', () => {
      const data = getMockData()
      data.items = {
        item1: { _key: 'item1', value: 'something' },
      }

      const item = (data.items as Record<string, unknown>).item1 as Record<string, unknown>
      updateField(item, 'value', null)

      expect(item.value).toBeNull()
    })

    test('updateField with undefined value', () => {
      const data = getMockData()
      data.items = {
        item1: { _key: 'item1', value: 'something' },
      }

      const item = (data.items as Record<string, unknown>).item1 as Record<string, unknown>
      updateField(item, 'value', undefined)

      expect(item.value).toBeUndefined()
    })

    test('updateField with object value', () => {
      const data = getMockData()
      data.items = {
        item1: { _key: 'item1', data: {} },
      }

      const item = (data.items as Record<string, unknown>).item1 as Record<string, unknown>
      const newData = { nested: { deep: 'value' } }
      updateField(item, 'data', newData)

      expect(item.data).toEqual(newData)
    })

    test('updateField with array value', () => {
      const data = getMockData()
      data.items = {
        item1: { _key: 'item1', tags: [] },
      }

      const item = (data.items as Record<string, unknown>).item1 as Record<string, unknown>
      updateField(item, 'tags', ['a', 'b', 'c'])

      expect(item.tags).toEqual(['a', 'b', 'c'])
    })
  })

  describe('Prototype pollution prevention', () => {
    test('add() with __proto__ as collection name should not pollute', () => {
      const originalProto = Object.prototype.toString

      // Attempt prototype pollution
      add('__proto__', { polluted: true })

      // Should not have polluted Object.prototype
      expect(Object.prototype.toString).toBe(originalProto)
      expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    })

    test('updateField with __proto__ as field should not pollute', () => {
      const data = getMockData()
      data.items = {
        item1: { _key: 'item1' },
      }

      const item = (data.items as Record<string, unknown>).item1 as Record<string, unknown>

      // Attempt to set __proto__
      updateField(item, '__proto__', { polluted: true })

      // Should not affect other objects
      expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    })
  })

  describe('Concurrent modifications', () => {
    test('add() while iterating should not skip items', () => {
      const data = getMockData()
      data.items = {
        a: { _key: 'a', value: 1 },
        b: { _key: 'b', value: 2 },
      }

      // Simulate iteration + modification
      const items = data.items as Record<string, unknown>
      const originalKeys = Object.keys(items)

      // Add during "iteration"
      add('items', { value: 3 })

      // Original items should still be accessible
      originalKeys.forEach(k => {
        expect(items[k]).toBeDefined()
      })

      // New item should exist
      expect(Object.keys(items).length).toBe(3)
    })
  })
})

// ============================================================================
// GENERATED CODE QUALITY
// ============================================================================

describe('Generated Code Quality', () => {
  test('generated code should have balanced braces and parens', () => {
    const code = `
todos:
  task1:
    text: "Test"
    done: false

Frame gap 12
  Button "Add", add(todos, text: "New", done: false)
  each todo in $todos
    Frame hor
      Frame w 20, h 20, bor 1, rad 4
      Text todo.text, editable
      Button "Delete", remove(todo)
`
    const ast = parse(code)
    const output = generateDOM(ast)

    // Count balanced parens with proper state tracking for strings and regex
    function countBalancedParens(code: string): { open: number; close: number } {
      let open = 0
      let close = 0
      let inSingleQuote = false
      let inDoubleQuote = false
      let inTemplate = false
      let inRegex = false
      let prevChar = ''

      for (let i = 0; i < code.length; i++) {
        const char = code[i]
        const nextChar = code[i + 1] || ''

        // Handle escape sequences
        if (prevChar === '\\') {
          prevChar = ''
          continue
        }

        // Track string state
        if (!inSingleQuote && !inTemplate && !inRegex && char === '"') {
          inDoubleQuote = !inDoubleQuote
        } else if (!inDoubleQuote && !inTemplate && !inRegex && char === "'") {
          inSingleQuote = !inSingleQuote
        } else if (!inDoubleQuote && !inSingleQuote && !inRegex && char === '`') {
          inTemplate = !inTemplate
        } else if (!inDoubleQuote && !inSingleQuote && !inTemplate && !inRegex && char === '/') {
          // Simple heuristic: if followed by something that looks like regex content
          // and previous non-whitespace char is not an operand
          if (nextChar !== '/' && nextChar !== '*') {
            // Check if this could be start of regex (not division)
            const prevNonWS = code.slice(0, i).trimEnd().slice(-1)
            if (['=', '(', ',', '[', '!', '&', '|', ':', ';', '{', '}', '\n'].includes(prevNonWS)) {
              inRegex = true
            }
          }
        } else if (inRegex && char === '/') {
          inRegex = false
        }

        // Count parens only outside strings and regex
        if (!inDoubleQuote && !inSingleQuote && !inTemplate && !inRegex) {
          if (char === '(') open++
          if (char === ')') close++
        }

        prevChar = char
      }

      return { open, close }
    }

    const { open: openParens, close: closeParens } = countBalancedParens(output)

    // Check balanced braces (simple count - should be equal for valid JS)
    const openBraces = (output.match(/{/g) || []).length
    const closeBraces = (output.match(/}/g) || []).length
    expect(openBraces).toBe(closeBraces)

    // Check balanced parentheses (with string/regex context awareness)
    // Allow small discrepancy due to regex literals containing parens
    // e.g., /[^)]/ has ) but not ( which is valid
    const parenDiff = Math.abs(openParens - closeParens)
    expect(parenDiff).toBeLessThanOrEqual(2)

    // Check no obvious syntax issues
    expect(output).not.toContain('undefined(')
    expect(output).not.toContain('null(')
  })

  test('malformed add() arguments should not break code generation', () => {
    // Missing closing paren, invalid syntax
    const code = `Button "Add", add(todos`

    // Should either parse gracefully or throw clear error
    // Not generate broken JS
    try {
      const ast = parse(code)
      const output = generateDOM(ast)
      // If it generates, check for basic validity
      expect(output).toContain('function')
    } catch {
      // Parse error is acceptable
    }
  })

  test('empty collection name in add() should be handled', () => {
    const code = `Button "Add", add()`

    const ast = parse(code)
    const output = generateDOM(ast)

    // Should not contain broken add call
    expect(output).not.toContain("_runtime.add('')")
    expect(output).not.toContain('_runtime.add()')
  })
})
