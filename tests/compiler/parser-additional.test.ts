/**
 * Parser Additional Coverage Tests
 *
 * Schließt Coverage-Lücken aus tests/compiler/docs/themen/02-parser.md (Bereich 4.2).
 * Fixiert existierendes Verhalten an bisher untesteten Stellen.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser/parser'

// ============================================================================
// 3.1 TOP-LEVEL DETECTION
// ============================================================================

describe('Parser Additional: Top-level constructs', () => {
  it('multiple section headers in sequence do not crash', () => {
    const ast = parse(`--- Buttons ---
--- Cards ---
Btn as Button:
  pad 10`)
    expect(ast.errors.length).toBe(0)
    expect(ast.components.length).toBe(1)
    // Note: parser tracks `currentSection` only for tokens, not for components.
  })

  it('use statement is captured into program.imports', () => {
    const ast = parse('use components')
    expect(ast.imports).toContain('components')
  })

  it('multiple use statements collected in order', () => {
    const ast = parse(`use tokens
use components
use layouts`)
    expect(ast.imports).toEqual(['tokens', 'components', 'layouts'])
  })

  it('canvas at start sets program.canvas', () => {
    const ast = parse('canvas mobile')
    expect(ast.canvas).toBeDefined()
  })
})

// ============================================================================
// 3.2 TOKEN DEFINITIONS — additional patterns
// ============================================================================

describe('Parser Additional: Token definitions', () => {
  it('token with hex color (3-digit)', () => {
    const ast = parse('primary: #f00')
    expect(ast.tokens.length).toBe(1)
    expect((ast.tokens[0] as any).name).toBe('primary')
  })

  it('token with hex color (8-digit alpha)', () => {
    const ast = parse('primary: #2271C1AA')
    expect(ast.tokens.length).toBe(1)
  })

  it('token with hyphenated name', () => {
    const ast = parse('grey-800: #333')
    expect(ast.tokens.length).toBe(1)
    expect((ast.tokens[0] as any).name).toBe('grey-800')
  })

  it('token reference: $primary', () => {
    const ast = parse(`primary: #2271C1
accent.bg: $primary`)
    expect(ast.tokens.length).toBe(2)
  })

  it('property set (mixin) with multiple properties', () => {
    const ast = parse('cardstyle: pad 16, rad 8, bg #1a1a1a')
    expect(ast.tokens.length).toBe(1)
    const propSet = ast.tokens[0] as any
    expect(propSet.name).toBe('cardstyle')
    expect(propSet.properties?.length).toBeGreaterThanOrEqual(3)
  })

  it('data object with nested attributes', () => {
    const ast = parse(`user:
  name: "Max"
  age: 42`)
    expect(ast.tokens.length).toBe(1)
  })
})

// ============================================================================
// 3.3 COMPONENTS — additional patterns
// ============================================================================

describe('Parser Additional: Components', () => {
  it('component with default primitive: Btn:', () => {
    const ast = parse(`Btn:
  pad 12`)
    expect(ast.components.length).toBe(1)
    const comp = ast.components[0] as any
    expect(comp.name).toBe('Btn')
    expect(comp.primitive).toBe('Frame') // default
  })

  it('component with hyphenated name', () => {
    const ast = parse(`My-Btn as Button:
  pad 10`)
    expect(ast.components.length).toBe(1)
    expect((ast.components[0] as any).name).toBe('My-Btn')
  })

  it('component with hyphenated parent (extends)', () => {
    const ast = parse(`Foo extends My-Btn:
  bg #f00`)
    expect(ast.components.length).toBe(1)
    expect((ast.components[0] as any).extends).toBe('My-Btn')
  })

  it('redefining a component: parser keeps both, semantic check is later', () => {
    const ast = parse(`Btn as Button:
  pad 10
Btn as Button:
  pad 20`)
    expect(ast.components.length).toBe(2)
  })
})

// ============================================================================
// 3.5 PROPERTIES — Token references, multi-value
// ============================================================================

describe('Parser Additional: Properties', () => {
  it('property with token reference value', () => {
    const ast = parse(`primary: #2271C1
Frame bg $primary`)
    const inst = ast.instances[0] as any
    // Property names stay raw at parse stage — alias resolution happens in IR.
    const bg = inst.properties.find((p: any) => p.name === 'bg')
    expect(bg).toBeDefined()
    // Token references are parsed as structured objects { kind: 'token', name: ... }
    expect(bg.values[0]).toEqual({ kind: 'token', name: 'primary' })
  })

  it('multi-value padding (4 values)', () => {
    const ast = parse('Frame pad 8 16 8 16')
    const inst = ast.instances[0] as any
    const pad = inst.properties.find((p: any) => p.name === 'pad')
    expect(pad).toBeDefined()
    expect(pad.values.length).toBe(4)
  })

  it('comma-separated properties on one line', () => {
    const ast = parse('Frame pad 12, bg #f00, rad 8')
    const inst = ast.instances[0] as any
    expect(inst.properties.length).toBeGreaterThanOrEqual(3)
  })

  it('auto-property-separation: hor center spread', () => {
    const ast = parse('Frame hor center spread')
    const inst = ast.instances[0] as any
    expect(inst.properties.length).toBeGreaterThanOrEqual(3)
  })

  it('mixed comma and auto-separation', () => {
    const ast = parse('Frame pad 8 16, hor center')
    const inst = ast.instances[0] as any
    expect(inst.properties.length).toBeGreaterThanOrEqual(3)
  })
})

// ============================================================================
// 3.6 STATES — additional patterns
// ============================================================================

describe('Parser Additional: States', () => {
  it('inline state with single property', () => {
    const ast = parse(`Btn:
  hover: bg #f00`)
    const comp = ast.components[0] as any
    expect(comp.states.length).toBe(1)
    expect(comp.states[0].name).toBe('hover')
  })

  it('multiple system states on one component', () => {
    const ast = parse(`Btn:
  hover:
    bg #f00
  focus:
    bor 1
  active:
    scale 0.95`)
    const comp = ast.components[0] as any
    expect(comp.states.length).toBe(3)
  })

  it('state with onclick trigger', () => {
    const ast = parse(`Btn:
  selected onclick:
    bg #f00`)
    const comp = ast.components[0] as any
    expect(comp.states.length).toBe(1)
    expect(comp.states[0].name).toBe('selected')
  })

  it('state with toggle modifier in component (block syntax)', () => {
    // Component definition with toggle modifier: requires `as <primitive>:` syntax.
    // `Btn toggle():` without `as` is parsed as instance, not component.
    const ast = parse(`Btn as Button:
  toggle()
  on:
    bg #f00`)
    expect(ast.components.length).toBe(1)
    const comp = ast.components[0] as any
    expect(comp.states.some((s: any) => s.name === 'on')).toBe(true)
  })

  it('state with when-clause', () => {
    const ast = parse(`Item:
  selected when MenuBtn.open:
    bg #f00`)
    expect(ast.components.length).toBe(1)
  })
})

// ============================================================================
// 3.7 EVENTS — additional patterns
// ============================================================================

describe('Parser Additional: Events', () => {
  it('onclick with single action', () => {
    const ast = parse('Btn onclick toggle()')
    const inst = ast.instances[0] as any
    expect(inst.events.length).toBeGreaterThanOrEqual(1)
  })

  it('onclick with multiple actions: comma → 2 separate events with same name', () => {
    // Documented behavior: `onclick toggle(), toast("hi")` produces TWO separate
    // onclick events, each with one action — not one event with two actions.
    // The IR/runtime layer is responsible for merging events with the same name.
    const ast = parse('Btn onclick toggle(), toast("hi")')
    const inst = ast.instances[0] as any
    const onclickEvents = inst.events.filter((e: any) => e.name === 'onclick')
    expect(onclickEvents.length).toBe(2)
    const allActions = onclickEvents.flatMap((e: any) => e.actions)
    expect(allActions.map((a: any) => a.name)).toEqual(['toggle', 'toast'])
  })

  it('implicit onclick syntax: Btn toggle()', () => {
    const ast = parse('Btn toggle()')
    const inst = ast.instances[0] as any
    expect(inst.events.length).toBeGreaterThanOrEqual(1)
  })

  it('keyboard event onkeydown enter', () => {
    const ast = parse(`Input onkeydown enter: submit()`)
    const inst = ast.instances[0] as any
    expect(inst.events.length).toBeGreaterThanOrEqual(1)
  })

  it('keyboard shortcut: onkeyenter', () => {
    const ast = parse('Input onkeyenter submit()')
    const inst = ast.instances[0] as any
    expect(inst.events.length).toBeGreaterThanOrEqual(1)
  })
})

// ============================================================================
// 3.8 ITERATION — combined where + by
// ============================================================================

describe('Parser Additional: Each loops', () => {
  it('basic each loop', () => {
    const ast = parse(`each item in $items
  Frame`)
    const each = ast.instances[0] as any
    expect(each.type).toBe('Each')
    expect(each.item).toBe('item')
    expect(each.collection).toBe('$items')
  })

  it('each with where filter', () => {
    const ast = parse(`each item in $items where item.active
  Frame`)
    const each = ast.instances[0] as any
    expect(each.type).toBe('Each')
    expect(each.filter).toBeDefined()
  })

  it('each with optional index variable: each item, idx in $items', () => {
    const ast = parse(`each item, idx in $items
  Frame`)
    const each = ast.instances[0] as any
    expect(each.type).toBe('Each')
    expect(each.index).toBe('idx')
  })

  it('each with property access in collection: each item in cat.items', () => {
    const ast = parse(`each cat in $cats
  each item in cat.items
    Frame`)
    expect(ast.instances.length).toBe(1)
  })

  it('nested each', () => {
    const ast = parse(`each cat in $cats
  each item in cat.items
    Frame`)
    const outer = ast.instances[0] as any
    expect(outer.type).toBe('Each')
    expect(outer.children.length).toBe(1)
  })
})

// ============================================================================
// 3.9 CONDITIONALS
// ============================================================================

describe('Parser Additional: Conditionals', () => {
  it('basic if block', () => {
    const ast = parse(`if loggedIn
  Text "hi"`)
    const cond = ast.instances[0] as any
    expect(cond.type).toBe('Conditional')
    expect(cond.then.length).toBe(1)
  })

  it('if-else block', () => {
    const ast = parse(`if loggedIn
  Text "hi"
else
  Text "login"`)
    const cond = ast.instances[0] as any
    expect(cond.type).toBe('Conditional')
    expect(cond.then.length).toBe(1)
    expect(cond.else.length).toBe(1)
  })

  it('nested if', () => {
    const ast = parse(`if a
  if b
    Text "both"`)
    const cond = ast.instances[0] as any
    expect(cond.type).toBe('Conditional')
    expect(cond.then[0].type).toBe('Conditional')
  })

  it('if with comparison expression', () => {
    const ast = parse(`if count > 0
  Text "items"`)
    const cond = ast.instances[0] as any
    expect(cond.type).toBe('Conditional')
  })

  it('if with logical expression', () => {
    const ast = parse(`if a and b
  Text "both"`)
    const cond = ast.instances[0] as any
    expect(cond.type).toBe('Conditional')
  })
})

// ============================================================================
// 3.13 POSITION TRACKING — systematic
// ============================================================================

describe('Parser Additional: Position tracking', () => {
  it('each loop has correct line', () => {
    const ast = parse(`Frame
each item in $items
  Frame`)
    const each = ast.instances[1] as any
    expect(each.line).toBe(2)
  })

  it('if conditional has correct line', () => {
    const ast = parse(`Frame
if loggedIn
  Text "hi"`)
    const cond = ast.instances[1] as any
    expect(cond.line).toBe(2)
  })

  it('nested instance child has correct line', () => {
    const ast = parse(`Frame
  Frame
    Text "deep"`)
    const child = (ast.instances[0] as any).children[0]
    expect(child.line).toBe(2)
  })

  it('property has correct line', () => {
    const ast = parse(`Frame
  bg #f00`)
    const prop = (ast.instances[0] as any).properties[0]
    expect(prop.line).toBe(2)
  })

  it('component has correct line', () => {
    const ast = parse(`// comment
Btn as Button:
  pad 12`)
    const comp = ast.components[0] as any
    expect(comp.line).toBe(2)
  })
})
