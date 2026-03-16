/**
 * DOM Backend JavaScript Integration Tests (Phase 3)
 *
 * Tests that JavaScript code from Mirror files is correctly
 * integrated into the generated DOM code.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'
import { generateDOM } from '../dom'

describe('DOM Backend: JavaScript Integration', () => {
  it('generates initialization block when JavaScript is present', () => {
    const ast = parse(`
Button named saveBtn "Save"

let count = 0
`)
    const code = generateDOM(ast)

    expect(code).toContain('Auto-initialization')
    expect(code).toContain('const _ui = createUI()')
    expect(code).toContain("document.body.appendChild(_ui.root)")
  })

  it('exposes named instances as global variables', () => {
    const ast = parse(`
Button named saveBtn "Save"
Button named cancelBtn "Cancel"

let active = true
`)
    const code = generateDOM(ast)

    expect(code).toContain('const saveBtn = _ui.saveBtn')
    expect(code).toContain('const cancelBtn = _ui.cancelBtn')
  })

  it('provides global update function', () => {
    const ast = parse(`
Counter as frame:

Counter

let count = 0
function increment() {
  count++
  update()
}
`)
    const code = generateDOM(ast)

    expect(code).toContain('function update() { _ui.update() }')
  })

  it('includes user JavaScript code', () => {
    const ast = parse(`
Button named btn "Click"

let count = 0

function handleClick() {
  count++
  btn.text = \`Count: \${count}\`
}
`)
    const code = generateDOM(ast)

    expect(code).toContain('let count = 0')
    expect(code).toContain('function handleClick()')
    expect(code).toContain('count++')
  })

  it('preserves JavaScript formatting', () => {
    const ast = parse(`
Card as frame:

const data = {
  name: "Test",
  value: 42
}
`)
    const code = generateDOM(ast)

    expect(code).toContain('const data = {')
    expect(code).toContain('name: "Test"')
    expect(code).toContain('value: 42')
  })

  it('does not generate initialization without JavaScript', () => {
    const ast = parse(`
Button "Click me"
`)
    const code = generateDOM(ast)

    expect(code).not.toContain('Auto-initialization')
    expect(code).not.toContain('const _ui = createUI()')
  })

  it('integrates tokens, UI, and JavaScript correctly', () => {
    const ast = parse(`
primary: #3B82F6

Button as button:
  bg primary, pad 8

Button named submitBtn "Submit"

let submitted = false

submitBtn.onclick = () => {
  submitted = true
  update()
}
`)
    const code = generateDOM(ast)

    // Check structure order
    const tokensIndex = code.indexOf('Design Tokens')
    const createUIIndex = code.indexOf('export function createUI')
    const runtimeIndex = code.indexOf('Mirror DOM Runtime')
    const initIndex = code.indexOf('Auto-initialization')
    const jsIndex = code.indexOf('let submitted = false')

    expect(tokensIndex).toBeLessThan(createUIIndex)
    expect(createUIIndex).toBeLessThan(runtimeIndex)
    expect(runtimeIndex).toBeLessThan(initIndex)
    expect(initIndex).toBeLessThan(jsIndex)
  })
})

describe('DOM Backend: JavaScript with Named Instances', () => {
  it('allows JavaScript to reference named instances', () => {
    const ast = parse(`
Input named searchInput "Search..."
Button named searchBtn "Go"

function search() {
  const query = searchInput.value
  console.log('Searching:', query)
}
`)
    const code = generateDOM(ast)

    // Named instances should be available before user JS
    const inputProxy = code.indexOf('const searchInput = _ui.searchInput')
    const btnProxy = code.indexOf('const searchBtn = _ui.searchBtn')
    const userJS = code.indexOf('function search()')

    expect(inputProxy).toBeGreaterThan(-1)
    expect(btnProxy).toBeGreaterThan(-1)
    expect(userJS).toBeGreaterThan(-1)
    expect(inputProxy).toBeLessThan(userJS)
    expect(btnProxy).toBeLessThan(userJS)
  })
})

describe('DOM Backend: Event-to-Function Integration (Phase 4)', () => {
  it('treats unknown action as function call', () => {
    const ast = parse(`
AddButton as button:
  onclick addTask

AddButton "Add"

let tasks = []
`)
    const code = generateDOM(ast)

    // Should generate function call for 'addTask'
    expect(code).toContain('addTask')
    expect(code).toContain("if (typeof addTask === 'function') addTask()")
  })

  it('passes target as argument to function', () => {
    const ast = parse(`
MyButton as button:
  onclick handleClick myArg

MyButton "Click"

let x = 0
`)
    const code = generateDOM(ast)

    // Should pass target as string argument
    expect(code).toContain('handleClick("myArg")')
  })

  it('still supports explicit call action', () => {
    const ast = parse(`
ActionButton as button:
  onclick call doSomething

ActionButton "Do It"

let done = false
`)
    const code = generateDOM(ast)

    // Should use the call action handling
    expect(code).toContain('doSomething')
  })

  it('does not confuse built-in actions with function calls', () => {
    const ast = parse(`
ToggleButton as button:
  onclick toggle self

ToggleButton "Toggle"

let x = 0
`)
    const code = generateDOM(ast)

    // Should use runtime.toggle, not call toggle()
    expect(code).toContain('_runtime.toggle')
    expect(code).not.toContain("if (typeof toggle === 'function')")
  })
})
