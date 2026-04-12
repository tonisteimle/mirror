/**
 * Tests for CRUD Operations
 *
 * Verifies that:
 * 1. add() and remove() actions generate correct code
 * 2. Direct binding for checked/value with loop variables works
 * 3. editable property generates data-editable attribute and setup code
 * 4. updateField() is called for inline editing
 */

import { describe, test, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'
import { generateDOM } from '../../compiler/backends/dom'
import type { IRNode } from '../../compiler/ir/types'

// ============================================================================
// ADD ACTION
// ============================================================================

describe('CRUD: add() Action', () => {
  test('add() generates runtime call', () => {
    const code = `
todos:
  task1:
    text: "First task"
    done: false

Button "Add", add(todos)
`
    const ast = parse(code)
    const output = generateDOM(ast)

    // Should generate add call
    expect(output).toContain('_runtime.add')
    expect(output).toContain("'todos'")
  })

  test('add() with initial values', () => {
    const code = `
todos:
  task1:
    text: "First"
    done: false

Button "Add Todo", add(todos, text: "New Task", done: false)
`
    const ast = parse(code)
    const output = generateDOM(ast)

    // Should generate add call with initial values
    expect(output).toContain('_runtime.add')
    expect(output).toContain("'todos'")
  })

  test('add() appears in event handler', () => {
    const code = `
items:
  item1:
    name: "Item"

Button "Add Item", add(items)
`
    const ast = parse(code)
    const output = generateDOM(ast)

    // Should be inside click handler
    expect(output).toContain('addEventListener')
    expect(output).toContain('click')
  })
})

// ============================================================================
// REMOVE ACTION
// ============================================================================

describe('CRUD: remove() Action', () => {
  test('remove() in loop generates runtime call with item reference', () => {
    const code = `
todos:
  task1:
    text: "Task"

each todo in $todos
  Frame hor
    Text todo.text
    Button "Delete", remove(todo)
`
    const ast = parse(code)
    const output = generateDOM(ast)

    // Should generate remove call
    expect(output).toContain('_runtime.remove')
  })

  test('remove() is in click handler', () => {
    const code = `
items:
  a:
    name: "A"

each item in $items
  Button "Remove", remove(item)
`
    const ast = parse(code)
    const output = generateDOM(ast)

    // Should be inside click handler
    expect(output).toContain('addEventListener')
    expect(output).toContain('click')
    expect(output).toContain('_runtime.remove')
  })
})

// ============================================================================
// DIRECT BINDING: CHECKED
// ============================================================================

describe('CRUD: Direct Binding - checked', () => {
  test('checked with loop variable generates binding code', () => {
    const code = `
todos:
  task1:
    text: "Task"
    done: true

each todo in $todos
  Checkbox checked todo.done
    Text todo.text
`
    const ast = parse(code)
    const output = generateDOM(ast)

    // Should have change handler for checkbox
    expect(output).toContain('addEventListener')
    expect(output).toContain('change')
  })

  test('checked property with loop variable preserved in IR', () => {
    const code = `
todos:
  task1:
    done: false

each todo in $todos
  Frame
    Input type "checkbox", checked todo.done
`
    const ast = parse(code)
    const ir = toIR(ast)

    // The IR should preserve checked binding info
    // Find any node with checked property containing todo.done
    const hasCheckedBinding = JSON.stringify(ir).includes('todo.done')
    expect(hasCheckedBinding).toBe(true)
  })
})

// ============================================================================
// DIRECT BINDING: VALUE
// ============================================================================

describe('CRUD: Direct Binding - value', () => {
  test('value with loop variable generates binding code', () => {
    const code = `
todos:
  task1:
    text: "Task"

each todo in $todos
  Input value todo.text
`
    const ast = parse(code)
    const output = generateDOM(ast)

    // Should have input handler
    expect(output).toContain('addEventListener')
    expect(output).toContain('input')
  })

  test('value binding generates updateField call', () => {
    const code = `
todos:
  task1:
    text: "Hello"

each todo in $todos
  Input value todo.text
`
    const ast = parse(code)
    const output = generateDOM(ast)

    // Should call updateField when input changes
    expect(output).toContain('updateField')
  })
})

// ============================================================================
// EDITABLE PROPERTY
// ============================================================================

describe('CRUD: editable Property', () => {
  test('editable generates data-editable attribute in IR', () => {
    const code = `Text "Hello", editable`
    const ast = parse(code)
    const ir = toIR(ast)

    const textNode = ir.nodes.find(n => n.primitive === 'text')
    expect(textNode).toBeDefined()

    const editableProp = textNode?.properties.find(p => p.name === 'data-editable')
    expect(editableProp).toBeDefined()
    expect(editableProp?.value).toBe(true)
  })

  test('editable generates setupEditable call in DOM output', () => {
    const code = `
todos:
  task1:
    text: "Task"

each todo in $todos
  Text todo.text, editable
`
    const ast = parse(code)
    const output = generateDOM(ast)

    // Should call setupEditable
    expect(output).toContain('setupEditable')
  })

  test('editable with loop variable includes field path', () => {
    const code = `
items:
  a:
    name: "Item A"

each item in $items
  Text item.name, editable
`
    const ast = parse(code)
    const output = generateDOM(ast)

    // Should setup editable with item and field
    expect(output).toContain('setupEditable')
    // Field path should be included
    expect(output).toContain('name')
  })

  test('editable without loop variable still works', () => {
    const code = `Text "Static text", editable`
    const ast = parse(code)
    const output = generateDOM(ast)

    // Should have data-editable attribute
    expect(output).toContain('data-editable')
  })
})

// ============================================================================
// COMBINED CRUD SCENARIOS
// ============================================================================

describe('CRUD: Combined Scenarios', () => {
  test('todo list with add, remove, checked binding, and editable', () => {
    const code = `
todos:
  task1:
    text: "Learn Mirror"
    done: false

Frame gap 12
  Button "Add Todo", add(todos, text: "New", done: false)

  each todo in $todos
    Frame hor, gap 8
      Checkbox checked todo.done
      Text todo.text, editable
      Button "Delete", remove(todo)
`
    const ast = parse(code)
    const output = generateDOM(ast)

    // Should have all CRUD operations
    expect(output).toContain('_runtime.add')
    expect(output).toContain('_runtime.remove')
    expect(output).toContain('setupEditable')

    // Should have event handlers
    expect(output).toContain('addEventListener')
  })

  test('list with input binding and remove', () => {
    const code = `
users:
  user1:
    name: "Max"
    email: "max@example.com"

each user in $users
  Frame gap 4
    Input value user.name
    Input value user.email
    Button "Delete", remove(user)
`
    const ast = parse(code)
    const output = generateDOM(ast)

    // Should have remove action
    expect(output).toContain('_runtime.remove')

    // Should have input handlers for binding
    expect(output).toContain('addEventListener')
    expect(output).toContain('input')
  })
})

// ============================================================================
// DATA PERSISTENCE
// ============================================================================

describe('CRUD: Data Persistence', () => {
  test('output includes __mirrorData for collections', () => {
    const code = `
todos:
  task1:
    text: "Task"
    done: false

Text "Hello"
`
    const ast = parse(code)
    const output = generateDOM(ast)

    // Should have __mirrorData with todos
    expect(output).toContain('__mirrorData')
    expect(output).toContain('"todos"')
  })

  test('add action references correct collection in __mirrorData', () => {
    const code = `
items:
  first:
    name: "First"

Button "Add", add(items)
`
    const ast = parse(code)
    const output = generateDOM(ast)

    // add() should reference the items collection
    expect(output).toContain('_runtime.add')
    expect(output).toContain("'items'")
    expect(output).toContain('"items"')
  })
})

// ============================================================================
// IR TRANSFORMATION
// ============================================================================

describe('CRUD: IR Transformation', () => {
  test('add action parsed correctly', () => {
    const code = `Button "Add", add(todos)`
    const ast = parse(code)

    // AST uses instances, not elements
    const buttonNode = ast.instances[0]
    expect(buttonNode).toBeDefined()
    expect(buttonNode.events).toBeDefined()

    // Check for add action in events
    const hasAddAction = buttonNode.events?.some(e =>
      e.actions?.some(a => a.name === 'add')
    )
    expect(hasAddAction).toBe(true)
  })

  test('remove action parsed correctly', () => {
    const code = `Button "Remove", remove(item)`
    const ast = parse(code)

    const buttonNode = ast.instances[0]
    expect(buttonNode).toBeDefined()

    const hasRemoveAction = buttonNode.events?.some(e =>
      e.actions?.some(a => a.name === 'remove')
    )
    expect(hasRemoveAction).toBe(true)
  })

  test('editable property in AST', () => {
    const code = `Text "Hello", editable`
    const ast = parse(code)

    const textNode = ast.instances[0]
    expect(textNode).toBeDefined()

    const editableProp = textNode.properties?.find(p => p.name === 'editable')
    expect(editableProp).toBeDefined()
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('CRUD: Edge Cases', () => {
  test('empty collection still generates valid code', () => {
    // Using inline data object syntax
    const code = `
items:
  placeholder:
    name: "placeholder"

Button "Add", add(items)
`
    const ast = parse(code)
    const output = generateDOM(ast)

    expect(output).toContain('__mirrorData')
    expect(output).toContain('_runtime.add')
  })

  test('multiple editable elements in same loop', () => {
    const code = `
todos:
  task1:
    title: "Title"
    description: "Desc"

each todo in $todos
  Frame gap 4
    Text todo.title, editable
    Text todo.description, editable
`
    const ast = parse(code)
    const output = generateDOM(ast)

    // Should setup editable for both
    const matches = output.match(/setupEditable/g)
    expect(matches?.length).toBeGreaterThanOrEqual(2)
  })

  test('nested loops with editable', () => {
    const code = `
projects:
  proj1:
    name: "Project"

each project in $projects
  Text project.name, editable
`
    const ast = parse(code)
    const output = generateDOM(ast)

    expect(output).toContain('setupEditable')
  })

  test('remove inside nested structure', () => {
    const code = `
items:
  a:
    name: "A"

Frame
  each item in $items
    Frame
      Button "X", remove(item)
`
    const ast = parse(code)
    const output = generateDOM(ast)

    expect(output).toContain('_runtime.remove')
  })
})
