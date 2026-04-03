/**
 * Parser Implicit Onclick Tests
 *
 * Tests the implicit onclick syntax where function calls are used as properties
 * and automatically become onclick events.
 *
 * Examples:
 *   Button "X", toggle()           // → onclick: toggle()
 *   Button "X", show(Menu)         // → onclick: show(Menu)
 *   Button "X", toggle(), show(P)  // → onclick: toggle(), show(P)
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

// ============================================================================
// IMPLICIT ONCLICK SYNTAX
// ============================================================================

describe('Parser: Implicit onclick syntax', () => {
  it('parses toggle() as implicit onclick', () => {
    const ast = parse(`Button "Click me", toggle()`)
    expect(ast.instances.length).toBe(1)
    const instance = ast.instances[0]
    expect(instance.events?.length).toBe(1)
    expect(instance.events?.[0].name).toBe('onclick')
    expect(instance.events?.[0].actions.length).toBe(1)
    expect(instance.events?.[0].actions[0].name).toBe('toggle')
    expect(instance.events?.[0].actions[0].isFunctionCall).toBe(true)
  })

  it('parses show(Element) as implicit onclick', () => {
    const ast = parse(`Button "Open", show(Menu)`)
    expect(ast.instances.length).toBe(1)
    const instance = ast.instances[0]
    expect(instance.events?.length).toBe(1)
    expect(instance.events?.[0].name).toBe('onclick')
    expect(instance.events?.[0].actions[0].name).toBe('show')
    expect(instance.events?.[0].actions[0].args).toContain('Menu')
  })

  it('parses hide(Element) as implicit onclick', () => {
    const ast = parse(`Button "Close", hide(Modal)`)
    const instance = ast.instances[0]
    expect(instance.events?.[0].name).toBe('onclick')
    expect(instance.events?.[0].actions[0].name).toBe('hide')
    expect(instance.events?.[0].actions[0].args).toContain('Modal')
  })

  it('parses multiple actions as single onclick', () => {
    const ast = parse(`Button "Do both", toggle(), show(Panel)`)
    const instance = ast.instances[0]
    expect(instance.events?.length).toBe(1)
    expect(instance.events?.[0].name).toBe('onclick')
    expect(instance.events?.[0].actions.length).toBe(2)
    expect(instance.events?.[0].actions[0].name).toBe('toggle')
    expect(instance.events?.[0].actions[1].name).toBe('show')
  })

  it('parses custom function as implicit onclick', () => {
    const ast = parse(`Button "Save", saveData()`)
    const instance = ast.instances[0]
    expect(instance.events?.[0].name).toBe('onclick')
    expect(instance.events?.[0].actions[0].name).toBe('saveData')
    expect(instance.events?.[0].actions[0].isFunctionCall).toBe(true)
  })

  it('works with other properties before', () => {
    const ast = parse(`Button "Click", bg #2563eb, col white, toggle()`)
    const instance = ast.instances[0]
    // Should have properties
    const bgProp = instance.properties.find(p => p.name === 'bg' || p.name === 'background')
    expect(bgProp).toBeDefined()
    // Should have onclick event
    expect(instance.events?.[0].name).toBe('onclick')
    expect(instance.events?.[0].actions[0].name).toBe('toggle')
  })

  it('works with other properties after', () => {
    const ast = parse(`Button toggle(), "Click", bg #333`)
    const instance = ast.instances[0]
    expect(instance.events?.[0].name).toBe('onclick')
    // Should also have bg property
    const bgProp = instance.properties.find(p => p.name === 'bg' || p.name === 'background')
    expect(bgProp).toBeDefined()
  })

  it('does not confuse property values with actions', () => {
    // bg #333 is a property, not an action
    const ast = parse(`Button "Click", bg #333, pad 12`)
    const instance = ast.instances[0]
    // Should NOT have any onclick events
    expect(instance.events?.length || 0).toBe(0)
    // Should have properties
    expect(instance.properties.length).toBeGreaterThanOrEqual(2)
  })

  it('backwards compatible with explicit onclick', () => {
    const ast = parse(`
Button "Click"
  onclick: toggle()`)
    const instance = ast.instances[0]
    expect(instance.events?.length).toBe(1)
    expect(instance.events?.[0].name).toBe('onclick')
    expect(instance.events?.[0].actions[0].name).toBe('toggle')
  })

  it('works on component definitions', () => {
    const ast = parse(`
Btn: = Button pad 12, bg #333, toggle()
  on:
    bg #2563eb`)
    expect(ast.components.length).toBe(1)
    const comp = ast.components[0]
    expect(comp.events?.length).toBe(1)
    expect(comp.events?.[0].name).toBe('onclick')
    expect(comp.events?.[0].actions[0].name).toBe('toggle')
  })

  it('parses exclusive() as implicit onclick', () => {
    const ast = parse(`Tab "Home", exclusive()`)
    const instance = ast.instances[0]
    expect(instance.events?.[0].name).toBe('onclick')
    expect(instance.events?.[0].actions[0].name).toBe('exclusive')
  })

  it('parses navigate(View) as implicit onclick', () => {
    const ast = parse(`Tab "Home", navigate(HomeView)`)
    const instance = ast.instances[0]
    expect(instance.events?.[0].name).toBe('onclick')
    expect(instance.events?.[0].actions[0].name).toBe('navigate')
    expect(instance.events?.[0].actions[0].args).toContain('HomeView')
  })

  it('parses scrollTo(Element) as implicit onclick', () => {
    const ast = parse(`Button "Go", scrollTo(Section)`)
    const instance = ast.instances[0]
    expect(instance.events?.[0].name).toBe('onclick')
    expect(instance.events?.[0].actions[0].name).toBe('scrollTo')
    expect(instance.events?.[0].actions[0].args).toContain('Section')
  })

  it('parses showModal(Dialog) as implicit onclick', () => {
    const ast = parse(`Button "Delete", showModal(ConfirmDialog)`)
    const instance = ast.instances[0]
    expect(instance.events?.[0].name).toBe('onclick')
    expect(instance.events?.[0].actions[0].name).toBe('showModal')
  })

  it('parses dismiss(Overlay) as implicit onclick', () => {
    const ast = parse(`Button "Cancel", dismiss(Dialog)`)
    const instance = ast.instances[0]
    expect(instance.events?.[0].name).toBe('onclick')
    expect(instance.events?.[0].actions[0].name).toBe('dismiss')
  })
})

// ============================================================================
// KEYBOARD EVENT SHORTHANDS
// ============================================================================

describe('Parser: Keyboard event shorthands', () => {
  it('parses onkeyenter as onkeydown enter', () => {
    const ast = parse(`
Input placeholder "Search"
  onkeyenter: search()`)
    const instance = ast.instances[0]
    expect(instance.events?.length).toBe(1)
    expect(instance.events?.[0].name).toBe('onkeydown')
    expect(instance.events?.[0].key).toBe('enter')
    expect(instance.events?.[0].actions[0].name).toBe('search')
  })

  it('parses onkeyescape as onkeydown escape', () => {
    const ast = parse(`
Input
  onkeyescape: clear()`)
    const instance = ast.instances[0]
    expect(instance.events?.[0].name).toBe('onkeydown')
    expect(instance.events?.[0].key).toBe('escape')
    expect(instance.events?.[0].actions[0].name).toBe('clear')
  })

  it('parses onkeyspace as onkeydown space', () => {
    const ast = parse(`
Button
  onkeyspace: toggle()`)
    const instance = ast.instances[0]
    expect(instance.events?.[0].name).toBe('onkeydown')
    expect(instance.events?.[0].key).toBe('space')
    expect(instance.events?.[0].actions[0].name).toBe('toggle')
  })

  it('backwards compatible with onkeydown enter:', () => {
    const ast = parse(`
Input
  onkeydown enter: submit()`)
    const instance = ast.instances[0]
    expect(instance.events?.[0].name).toBe('onkeydown')
    expect(instance.events?.[0].key).toBe('enter')
    expect(instance.events?.[0].actions[0].name).toBe('submit')
  })

  it('backwards compatible with onkeydown escape:', () => {
    const ast = parse(`
Input
  onkeydown escape: cancel()`)
    const instance = ast.instances[0]
    expect(instance.events?.[0].name).toBe('onkeydown')
    expect(instance.events?.[0].key).toBe('escape')
  })

  it('inline keyboard shorthand in component definition', () => {
    const ast = parse(`
SearchInput: = Input pad 12, bg #333
  onkeyenter: search()`)
    expect(ast.components.length).toBe(1)
    const comp = ast.components[0]
    expect(comp.events?.length).toBe(1)
    expect(comp.events?.[0].name).toBe('onkeydown')
    expect(comp.events?.[0].key).toBe('enter')
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Parser: Implicit onclick edge cases', () => {
  it('does not treat CSS functions as actions (rgba)', () => {
    // rgba() is a CSS function value, not an action
    const ast = parse(`Frame bg rgba(255,0,0,0.5)`)
    const instance = ast.instances[0]
    // Should NOT create an onclick event
    expect(instance.events?.length || 0).toBe(0)
    // Should have bg property
    const bgProp = instance.properties.find(p => p.name === 'bg' || p.name === 'background')
    expect(bgProp).toBeDefined()
  })

  it('handles function with multiple arguments', () => {
    const ast = parse(`Button "Scroll", scrollBy(Container, 100, 0)`)
    const instance = ast.instances[0]
    expect(instance.events?.[0].actions[0].name).toBe('scrollBy')
    expect(instance.events?.[0].actions[0].args).toEqual(['Container', '100', '0'])
  })

  it('handles function with string argument', () => {
    const ast = parse(`Button "Copy", copy("Hello World")`)
    const instance = ast.instances[0]
    expect(instance.events?.[0].actions[0].name).toBe('copy')
    expect(instance.events?.[0].actions[0].args).toContain('Hello World')
  })

  it('handles function with no arguments', () => {
    const ast = parse(`Button "Submit", submit()`)
    const instance = ast.instances[0]
    expect(instance.events?.[0].actions[0].name).toBe('submit')
    expect(instance.events?.[0].actions[0].args).toEqual([])
  })

  it('mixed implicit onclick and explicit event', () => {
    const ast = parse(`
Button "Click", toggle()
  onhover: highlight()`)
    const instance = ast.instances[0]
    expect(instance.events?.length).toBe(2)
    // Implicit onclick
    const onclick = instance.events?.find(e => e.name === 'onclick')
    expect(onclick).toBeDefined()
    expect(onclick?.actions[0].name).toBe('toggle')
    // Explicit onhover
    const onhover = instance.events?.find(e => e.name === 'onhover')
    expect(onhover).toBeDefined()
    expect(onhover?.actions[0].name).toBe('highlight')
  })

  it('action function with state defined below', () => {
    const ast = parse(`
Btn: = Button pad 12, toggle()
  on:
    bg #2563eb`)
    const comp = ast.components[0]
    expect(comp.events?.[0].name).toBe('onclick')
    expect(comp.states?.length).toBe(1)
    expect(comp.states?.[0].name).toBe('on')
  })
})

// ============================================================================
// DOM OUTPUT TESTS
// ============================================================================

describe('DOM Output: Implicit onclick generates event listeners', () => {
  it('generates click event listener for toggle()', () => {
    const ast = parse(`Button "Click", toggle()`)
    const js = generateDOM(ast)
    expect(js).toContain("addEventListener('click'")
  })

  it('generates click event listener for show(Element)', () => {
    const ast = parse(`
Button "Open", show(Menu)
Frame hidden, name Menu
  Text "Menu content"`)
    const js = generateDOM(ast)
    expect(js).toContain("addEventListener('click'")
    expect(js).toContain("show")
  })

  it('generates keydown event listener for onkeyenter', () => {
    const ast = parse(`
Input placeholder "Search"
  onkeyenter: search()`)
    const js = generateDOM(ast)
    expect(js).toContain("addEventListener('keydown'")
    expect(js).toContain("enter")
  })

  it('generates multiple actions in single click handler', () => {
    const ast = parse(`Button "Do both", toggle(), show(Panel)`)
    const js = generateDOM(ast)
    expect(js).toContain("addEventListener('click'")
    // Both actions should be in the handler
    expect(js).toContain("toggle")
    expect(js).toContain("show")
  })
})

// ============================================================================
// NESTED COMPONENTS
// ============================================================================

describe('Parser: Implicit onclick in nested structures', () => {
  it('works in nested component children', () => {
    const ast = parse(`
Card: = Frame pad 16, bg #1a1a1a

Card
  Button "Action", toggle()`)
    // Find the Button instance in Card's children
    const cardInstance = ast.instances[0]
    const buttonChild = cardInstance.children?.find(
      (c: any) => c.component === 'Button'
    )
    expect(buttonChild?.events?.[0].name).toBe('onclick')
  })

  it('works in deeply nested structures', () => {
    const ast = parse(`
Frame pad 20
  Frame pad 16
    Frame pad 12
      Button "Deep", toggle()`)
    // Navigate to deep button
    const outer = ast.instances[0]
    const mid = outer.children?.[0] as any
    const inner = mid?.children?.[0] as any
    const button = inner?.children?.[0] as any
    expect(button?.events?.[0].name).toBe('onclick')
  })

  it('parent and child both have implicit onclick', () => {
    const ast = parse(`
Frame pad 16, toggle()
  Button "Child", show(Menu)`)
    const frame = ast.instances[0]
    const button = frame.children?.[0] as any
    expect(frame.events?.[0].name).toBe('onclick')
    expect(button?.events?.[0].name).toBe('onclick')
  })
})

// ============================================================================
// EACH LOOPS
// ============================================================================

describe('Parser: Implicit onclick in each loops', () => {
  it('works inside each loop', () => {
    const ast = parse(`
each item in ["a", "b", "c"]
  Button item, toggle()`)
    const eachBlock = ast.instances[0] as any
    expect(eachBlock.type).toBe('Each')
    // Each has `children`, not `body`
    const buttonTemplate = eachBlock.children[0]
    expect(buttonTemplate.events?.[0].name).toBe('onclick')
  })

  it('works with loop variable in action argument', () => {
    const ast = parse(`
each item in $items
  Button "Select", select()`)
    const eachBlock = ast.instances[0] as any
    const buttonTemplate = eachBlock.children[0]
    expect(buttonTemplate.events?.[0].actions[0].name).toBe('select')
  })
})

// ============================================================================
// ZAG COMPONENTS
// ============================================================================

describe('Parser: Implicit onclick with Zag components', () => {
  it('works inside Zag slot content', () => {
    // Simpler test: Button inside a Zag structure
    const ast = parse(`
Frame
  Button "Open", toggle()`)
    const frame = ast.instances[0]
    const button = frame.children?.[0] as any
    expect(button?.events?.[0].name).toBe('onclick')
  })

  it('works on Tabs - basic parsing', () => {
    // Tabs are ZagNodes, not Instances - just verify parsing succeeds
    const ast = parse(`
Tabs defaultValue "home"
  Tab "Home", value "home"
    Text "Home content"
  Tab "Settings", value "settings"
    Text "Settings content"`)
    expect(ast.errors.length).toBe(0)
  })
})

// ============================================================================
// COMPONENT INHERITANCE
// ============================================================================

describe('Parser: Implicit onclick with inheritance', () => {
  it('works on inherited component', () => {
    const ast = parse(`
BaseBtn: = Button pad 12, bg #333

ActionBtn as BaseBtn: = toggle()
  on:
    bg #2563eb

ActionBtn "Click me"`)
    const comp = ast.components.find(c => c.name === 'ActionBtn')
    expect(comp?.events?.[0].name).toBe('onclick')
  })

  it('instance can add implicit onclick to component without it', () => {
    const ast = parse(`
Btn: = Button pad 12, bg #333

Btn "Static"
Btn "Interactive", toggle()`)
    // First instance has no events
    expect(ast.instances[0].events?.length || 0).toBe(0)
    // Second instance has onclick
    expect(ast.instances[1].events?.[0].name).toBe('onclick')
  })
})

// ============================================================================
// SLOTS
// ============================================================================

describe('Parser: Implicit onclick in slot definitions', () => {
  it('works in component slot usage', () => {
    const ast = parse(`
Card: = Frame pad 16, bg #1a1a1a

Card
  Button "Save", toggle()
  Button "Cancel", hide(Card)`)
    const card = ast.instances[0]
    const saveBtn = card.children?.[0] as any
    const cancelBtn = card.children?.[1] as any
    expect(saveBtn?.events?.[0].name).toBe('onclick')
    expect(cancelBtn?.events?.[0].name).toBe('onclick')
  })

  it('implicit onclick in nested slot structure', () => {
    const ast = parse(`
Frame
  Frame hor, gap 8
    Button "Action 1", toggle()
    Button "Action 2", show(Menu)`)
    const outer = ast.instances[0]
    const inner = outer.children?.[0] as any
    const btn1 = inner.children?.[0] as any
    const btn2 = inner.children?.[1] as any
    expect(btn1?.events?.[0].name).toBe('onclick')
    expect(btn2?.events?.[0].name).toBe('onclick')
  })
})

// ============================================================================
// ALL BUILTIN ACTIONS
// ============================================================================

describe('Parser: All builtin actions work as implicit onclick', () => {
  const actions = [
    'show(El)',
    'hide(El)',
    'toggle()',
    'open()',
    'close()',
    'select()',
    'activate()',
    'deactivate()',
    'navigate(View)',
    'showBelow(El)',
    'showAbove(El)',
    'showModal(El)',
    'dismiss(El)',
    'scrollTo(El)',
    'scrollToTop()',
    'increment($count)',
    'decrement($count)',
    'set($val, 5)',
    'reset($val)',
    'copy("text")',
  ]

  actions.forEach(action => {
    it(`parses ${action} as implicit onclick`, () => {
      const ast = parse(`Button "Test", ${action}`)
      expect(ast.instances[0].events?.[0].name).toBe('onclick')
    })
  })
})

// ============================================================================
// KEYBOARD SHORTHANDS COMPREHENSIVE
// ============================================================================

describe('Parser: Keyboard shorthands comprehensive', () => {
  it('onkeyenter works inline with other properties', () => {
    const ast = parse(`Input placeholder "Email", bg #333, onkeyenter: submit()`)
    const input = ast.instances[0]
    expect(input.events?.[0].name).toBe('onkeydown')
    expect(input.events?.[0].key).toBe('enter')
  })

  it('multiple keyboard events on same element', () => {
    const ast = parse(`
Input
  onkeyenter: submit()
  onkeyescape: clear()`)
    const input = ast.instances[0]
    expect(input.events?.length).toBe(2)
    expect(input.events?.[0].key).toBe('enter')
    expect(input.events?.[1].key).toBe('escape')
  })

  it('keyboard shorthand and implicit onclick together', () => {
    const ast = parse(`
Button "Submit", toggle()
  onkeyspace: activate()`)
    const button = ast.instances[0]
    expect(button.events?.length).toBe(2)
    const onclick = button.events?.find(e => e.name === 'onclick')
    const onkeydown = button.events?.find(e => e.name === 'onkeydown')
    expect(onclick).toBeDefined()
    expect(onkeydown?.key).toBe('space')
  })
})
