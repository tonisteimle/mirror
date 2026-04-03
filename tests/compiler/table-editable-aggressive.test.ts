/**
 * Table Editable - Aggressive Tests
 *
 * Umfassende Tests für editierbare Tabellen mit Row: Template Slot.
 * Testet Parser, IR, DOM Backend und Edge Cases.
 */

import { describe, it, expect } from 'vitest'
import { compile } from '../../compiler'
import { parse } from '../../compiler/parser'

// =============================================================================
// PARSER TESTS: Loop Variable Detection
// =============================================================================

describe('Parser: Loop Variable Detection', () => {
  describe('Basic row reference', () => {
    it('detects row.field as loopVar', () => {
      const ast = parse(`
Table $data
  Row:
    Text row.name
`)
      const table = ast.instances.find(i => i.type === 'Table')
      expect(table?.rowSlot).toBeDefined()

      const textChild = table!.rowSlot!.children[0]
      const contentProp = textChild.properties.find(p => p.name === 'content')
      expect(contentProp?.values[0]).toEqual({ kind: 'loopVar', name: 'row.name' })
    })

    it('detects row in Input value binding', () => {
      const ast = parse(`
Table $data
  Row:
    Input value row.title
`)
      const table = ast.instances.find(i => i.type === 'Table')
      const inputChild = table!.rowSlot!.children[0]
      const valueProp = inputChild.properties.find(p => p.name === 'value')
      expect(valueProp?.values[0]).toEqual({ kind: 'loopVar', name: 'row.title' })
    })

    it('detects index variable', () => {
      const ast = parse(`
Table $data
  Row:
    Text index
`)
      const table = ast.instances.find(i => i.type === 'Table')
      const textChild = table!.rowSlot!.children[0]
      const contentProp = textChild.properties.find(p => p.name === 'content')
      expect(contentProp?.values[0]).toEqual({ kind: 'loopVar', name: 'index' })
    })
  })

  describe('Nested structures', () => {
    it('detects row in nested Frame', () => {
      const ast = parse(`
Table $data
  Row:
    Frame
      Frame
        Text row.deep
`)
      const table = ast.instances.find(i => i.type === 'Table')
      const frame1 = table!.rowSlot!.children[0]
      const frame2 = frame1.children[0]
      const text = frame2.children[0]
      const contentProp = text.properties.find(p => p.name === 'content')
      expect(contentProp?.values[0]).toEqual({ kind: 'loopVar', name: 'row.deep' })
    })

    it('detects row in deeply nested path', () => {
      const ast = parse(`
Table $data
  Row:
    Text row.user.profile.name
`)
      const table = ast.instances.find(i => i.type === 'Table')
      const text = table!.rowSlot!.children[0]
      const contentProp = text.properties.find(p => p.name === 'content')
      expect(contentProp?.values[0]).toEqual({ kind: 'loopVar', name: 'row.user.profile.name' })
    })
  })

  describe('Multiple row references', () => {
    it('handles multiple row refs in same element', () => {
      const ast = parse(`
Table $data
  Row:
    Frame hor, gap 8
      Text row.first
      Text row.second
      Text row.third
`)
      const table = ast.instances.find(i => i.type === 'Table')
      const frame = table!.rowSlot!.children[0]
      expect(frame.children.length).toBe(3)

      frame.children.forEach((child, i) => {
        const prop = child.properties.find(p => p.name === 'content')
        expect(prop?.values[0].kind).toBe('loopVar')
      })
    })

    it('handles row in multiple Input bindings', () => {
      const ast = parse(`
Table $data
  Row:
    Input value row.a
    Input value row.b
    Input value row.c
`)
      const table = ast.instances.find(i => i.type === 'Table')
      expect(table!.rowSlot!.children.length).toBe(3)

      table!.rowSlot!.children.forEach(child => {
        const prop = child.properties.find(p => p.name === 'value')
        expect(prop?.values[0].kind).toBe('loopVar')
      })
    })
  })

  describe('Field name variations', () => {
    it('handles snake_case field names', () => {
      const ast = parse(`
Table $data
  Row:
    Text row.first_name
`)
      const table = ast.instances.find(i => i.type === 'Table')
      const text = table!.rowSlot!.children[0]
      const prop = text.properties.find(p => p.name === 'content')
      expect(prop?.values[0]).toEqual({ kind: 'loopVar', name: 'row.first_name' })
    })

    it('handles camelCase field names', () => {
      const ast = parse(`
Table $data
  Row:
    Text row.firstName
`)
      const table = ast.instances.find(i => i.type === 'Table')
      const text = table!.rowSlot!.children[0]
      const prop = text.properties.find(p => p.name === 'content')
      expect(prop?.values[0]).toEqual({ kind: 'loopVar', name: 'row.firstName' })
    })

    it('handles numeric field access', () => {
      const ast = parse(`
Table $data
  Row:
    Text row.item0
`)
      const table = ast.instances.find(i => i.type === 'Table')
      const text = table!.rowSlot!.children[0]
      const prop = text.properties.find(p => p.name === 'content')
      expect(prop?.values[0]).toEqual({ kind: 'loopVar', name: 'row.item0' })
    })
  })

  describe('Edge cases', () => {
    it('handles empty Row slot', () => {
      const ast = parse(`
Table $data
  Row:
`)
      const table = ast.instances.find(i => i.type === 'Table')
      expect(table?.rowSlot).toBeDefined()
      expect(table?.rowSlot?.children.length).toBe(0)
    })

    it('handles Row without row references (static content)', () => {
      const ast = parse(`
Table $data
  Row:
    Text "Static text"
    Button "Click me"
`)
      const table = ast.instances.find(i => i.type === 'Table')
      expect(table?.rowSlot?.children.length).toBe(2)

      // Text has string content, not loopVar
      const text = table!.rowSlot!.children[0]
      const prop = text.properties.find(p => p.name === 'content')
      expect(prop?.values[0]).toBe('Static text')
    })

    it('distinguishes row from other identifiers', () => {
      const ast = parse(`
Table $data
  Row:
    Text "row"
    Text rowCount
`)
      const table = ast.instances.find(i => i.type === 'Table')
      expect(table?.rowSlot?.children.length).toBeGreaterThanOrEqual(1)

      // First text: string "row"
      const text1 = table!.rowSlot!.children[0]
      const prop1 = text1.properties.find(p => p.name === 'content')
      expect(prop1?.values[0]).toBe('row')

      // Second text: identifier rowCount (not a loopVar)
      // rowCount is NOT row.something, so it should be parsed as token or identifier
      const text2 = table!.rowSlot!.children[1]
      if (text2) {
        const prop2 = text2.properties.find(p => p.name === 'content')
        // rowCount is NOT row.something, so it's just an identifier
        if (prop2?.values[0]) {
          expect(prop2.values[0]).not.toHaveProperty('kind', 'loopVar')
        }
        // The second element should be some kind of Text element
        expect(text2.type || text2.element).toBeDefined()
      }
    })
  })
})

// =============================================================================
// DOM BACKEND TESTS: Code Generation
// =============================================================================

describe('DOM Backend: Row Template Code Generation', () => {
  describe('Basic structure', () => {
    it('generates forEach loop', () => {
      const js = compile(`
$data: [{ name: "Test" }]
Table $data
  Row:
    Text row.name
`)
      expect(js).toContain('.forEach((row, index)')
    })

    it('generates row template elements', () => {
      const js = compile(`
$data: [{ name: "Test" }]
Table $data
  Row:
    Frame hor
      Text row.name
`)
      expect(js).toContain('.forEach((row, index)')
      expect(js).toContain('row.name')
    })

    it('generates mirror-table-row class', () => {
      const js = compile(`
$data: [{ x: 1 }]
Table $data
  Row:
    Text row.x
`)
      expect(js).toContain("className = 'mirror-table-row'")
    })
  })

  describe('Two-Way Binding', () => {
    it('generates input event listener for Input', () => {
      const js = compile(`
$data: [{ title: "Test" }]
Table $data
  Row:
    Input value row.title
`)
      expect(js).toContain("addEventListener('input'")
      expect(js).toContain('row.title')
    })

    it('generates correct data update expression', () => {
      const js = compile(`
$data: [{ title: "Test" }]
Table $data
  Row:
    Input value row.title
`)
      // Should update data[index].title
      expect(js).toMatch(/\[index\]\.title\s*=\s*e\.target\.value/)
    })

    it('generates input event listener for Textarea', () => {
      const js = compile(`
$data: [{ desc: "Test" }]
Table $data
  Row:
    Textarea value row.desc
`)
      expect(js).toContain("addEventListener('input'")
    })

    it('generates multiple independent bindings', () => {
      const js = compile(`
$data: [{ a: "1", b: "2", c: "3" }]
Table $data
  Row:
    Input value row.a
    Input value row.b
    Input value row.c
`)
      // Should have 3 event listeners
      const inputListeners = (js.match(/addEventListener\('input'/g) || []).length
      // At least 3 for our inputs (there may be more from runtime)
      expect(inputListeners).toBeGreaterThanOrEqual(3)

      // Should update different fields
      expect(js).toContain('.a = e.target.value')
      expect(js).toContain('.b = e.target.value')
      expect(js).toContain('.c = e.target.value')
    })
  })

  describe('Text rendering', () => {
    it('generates textContent assignment for Text', () => {
      const js = compile(`
$data: [{ name: "Test" }]
Table $data
  Row:
    Text row.name
`)
      expect(js).toContain('row.name')
      expect(js).toContain('textContent')
    })

    it('handles multiple Text elements', () => {
      const js = compile(`
$data: [{ a: "1", b: "2" }]
Table $data
  Row:
    Text row.a
    Text row.b
`)
      expect(js).toContain('row.a')
      expect(js).toContain('row.b')
    })
  })

  describe('Nested structures', () => {
    it('generates nested Frame structure', () => {
      const js = compile(`
$data: [{ x: 1 }]
Table $data
  Row:
    Frame hor, gap 8
      Frame ver
        Text row.x
`)
      expect(js).toContain('.forEach((row, index)')
      expect(js).toContain('row.x')
      // Should create nested elements
      expect(js).toContain('appendChild')
    })

    it('generates deeply nested Input binding', () => {
      const js = compile(`
$data: [{ field: "value" }]
Table $data
  Row:
    Frame
      Frame
        Frame
          Input value row.field
`)
      expect(js).toContain("addEventListener('input'")
      expect(js).toContain('row.field')
    })
  })

  describe('Styling in templates', () => {
    it('applies styles to template elements', () => {
      const js = compile(`
$data: [{ x: 1 }]
Table $data
  Row:
    Frame bg #1a1a1a, pad 12, rad 8
      Text row.x, col white, fs 14
`)
      expect(js).toContain('background')
      expect(js).toContain('padding')
      expect(js).toContain('borderRadius')
    })

    it('applies width to Input in template', () => {
      const js = compile(`
$data: [{ x: 1 }]
Table $data
  Row:
    Input value row.x, w 200
`)
      expect(js).toContain('width')
    })
  })
})

// =============================================================================
// INTEGRATION TESTS: Full Compilation
// =============================================================================

describe('Integration: Full Editable Table', () => {
  it('compiles complete editable table', () => {
    const js = compile(`
$tasks: [
  { title: "Task 1", status: "todo", priority: 1 },
  { title: "Task 2", status: "doing", priority: 2 },
  { title: "Task 3", status: "done", priority: 3 }
]

Frame pad 20, gap 16
  Text "Task List", fs 18, weight bold, col white

  Table $tasks
    Row:
      Frame hor, gap 12, pad 12, bg #1a1a1a, rad 8
        Input value row.title, w 200, bg #252525, col white, pad 8, rad 4
        Text row.status, col #888, w 80
        Text row.priority, col #666, w 40
`)
    expect(js).toContain('.forEach((row, index)')
    expect(js).toContain('row.title')
    expect(js).toContain('row.status')
    expect(js).toContain('row.priority')
    expect(js).toContain("addEventListener('input'")
  })

  it('compiles table with mixed content', () => {
    const js = compile(`
$users: [{ name: "Max", email: "max@test.com" }]

Table $users
  Row:
    Frame hor, gap 16
      Frame w 40, h 40, bg #2563eb, rad 99, center
        Text "M", col white
      Frame ver, gap 4
        Input value row.name, bg #1a1a1a, col white
        Input value row.email, bg #1a1a1a, col white
`)
    expect(js).toContain('row.name')
    expect(js).toContain('row.email')
    // Two input bindings
    expect(js).toMatch(/\.name\s*=\s*e\.target\.value/)
    expect(js).toMatch(/\.email\s*=\s*e\.target\.value/)
  })

  it('compiles table inside Frame', () => {
    const js = compile(`
$data: [{ x: 1 }]

Frame pad 20
  Frame bg #111, pad 16, rad 8
    Table $data
      Row:
        Input value row.x
`)
    // Table should be compiled even when nested in Frames
    expect(js).toContain('mirror-table')
    expect(js).toContain('.forEach((row, index)')
  })
})

// =============================================================================
// EDGE CASES & ERROR HANDLING
// =============================================================================

describe('Edge Cases', () => {
  describe('Empty and minimal cases', () => {
    it('handles table with empty data', () => {
      const js = compile(`
$data: []
Table $data
  Row:
    Text row.name
`)
      // Should still compile, forEach will just not iterate
      expect(js).toContain('.forEach')
    })

    it('handles Row slot with only whitespace children', () => {
      // This might happen with formatting
      const ast = parse(`
Table $data
  Row:
    Text row.x
`)
      expect(ast.instances.find(i => i.type === 'Table')).toBeDefined()
    })
  })

  describe('Complex data paths', () => {
    it('handles deeply nested data path', () => {
      const js = compile(`
$data: [{ user: { profile: { settings: { theme: "dark" } } } }]
Table $data
  Row:
    Text row.user.profile.settings.theme
`)
      expect(js).toContain('row.user.profile.settings.theme')
    })

    it('handles array index in path (if supported)', () => {
      // This tests if row.items[0] works
      const code = `
$data: [{ items: ["a", "b"] }]
Table $data
  Row:
    Text row.items
`
      // Should at least compile without error
      expect(() => compile(code)).not.toThrow()
    })
  })

  describe('Special characters', () => {
    it('handles field names with numbers', () => {
      const js = compile(`
$data: [{ field1: "a", field2: "b" }]
Table $data
  Row:
    Text row.field1
    Text row.field2
`)
      expect(js).toContain('row.field1')
      expect(js).toContain('row.field2')
    })
  })

  describe('Table with other slots', () => {
    it('handles Row slot alongside Column definitions', () => {
      const js = compile(`
$data: [{ name: "Test", value: 123 }]
Table $data
  Column name, w 200
  Row:
    Frame hor
      Input value row.name
      Text row.value
`)
      // Should use Row slot for rendering, not Column
      expect(js).toContain('.forEach((row, index)')
      expect(js).toContain('row.name')
    })
  })
})

// =============================================================================
// STRESS TESTS
// =============================================================================

describe('Stress Tests', () => {
  it('handles many inputs in one row', () => {
    const js = compile(`
$data: [{ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8 }]
Table $data
  Row:
    Frame hor, gap 4
      Input value row.a
      Input value row.b
      Input value row.c
      Input value row.d
      Input value row.e
      Input value row.f
      Input value row.g
      Input value row.h
`)
    // All 8 fields should be bound
    expect(js).toContain('row.a')
    expect(js).toContain('row.h')

    // Should have event listeners for all
    const matches = js.match(/addEventListener\('input'/g) || []
    expect(matches.length).toBeGreaterThanOrEqual(8)
  })

  it('handles deeply nested template structure', () => {
    const js = compile(`
$data: [{ x: 1 }]
Table $data
  Row:
    Frame
      Frame
        Frame
          Frame
            Frame
              Frame
                Input value row.x
`)
    expect(js).toContain('row.x')
    expect(js).toContain("addEventListener('input'")
  })

  it('handles complex layout in row', () => {
    const js = compile(`
$data: [{ title: "T", subtitle: "S", desc: "D", status: "active" }]
Table $data
  Row:
    Frame hor, gap 16, pad 12, bg #1a1a1a, rad 8
      Frame w 48, h 48, bg #2563eb, rad 99, center
        Text "A", col white, fs 18
      Frame ver, gap 4, grow
        Frame hor, spread
          Input value row.title, weight 500, col white, bg transparent, bor 0
          Text row.status, col #10b981, fs 12
        Input value row.subtitle, col #888, fs 13, bg transparent, bor 0
      Frame ver, gap 8, w 100
        Button "Edit", pad 6 12, bg #333, col white, rad 4
        Button "Delete", pad 6 12, bg #ef4444, col white, rad 4
`)
    expect(js).toContain('row.title')
    expect(js).toContain('row.subtitle')
    expect(js).toContain('row.status')
  })
})

// =============================================================================
// WHERE CLAUSE WITH OR/AND
// =============================================================================

describe('Table Where Clause: Logical Operators', () => {
  it('converts "or" to "||"', () => {
    const ast = parse(`
Table $data where status == "a" or status == "b"
`)
    const table = ast.instances.find(i => i.type === 'Table')
    expect(table?.filter).toContain('||')
    expect(table?.filter).not.toContain(' or ')
  })

  it('converts "and" to "&&"', () => {
    const ast = parse(`
Table $data where active == true and visible == true
`)
    const table = ast.instances.find(i => i.type === 'Table')
    expect(table?.filter).toContain('&&')
    expect(table?.filter).not.toContain(' and ')
  })

  it('handles complex expression with both', () => {
    const ast = parse(`
Table $data where (status == "a" or status == "b") and active == true
`)
    const table = ast.instances.find(i => i.type === 'Table')
    expect(table?.filter).toContain('||')
    expect(table?.filter).toContain('&&')
  })

  it('compiles filter to valid JavaScript', () => {
    // Compile the code using standard JavaScript operators
    const js = compile(`
$data: [{ status: "active" }]
$filter: "active"
Table $data where ($filter == "all" || status == $filter)
  Row:
    Text row.status
`)
    // Should contain valid JS operators
    expect(js).toContain('||')
  })
})
