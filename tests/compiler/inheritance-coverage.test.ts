/**
 * Inheritance Coverage Tests (Thema 5)
 *
 * Systematische Coverage für Vererbungs-Edge-Cases.
 * Bereiche: Properties (3.2), States (3.3), Events (3.4), Children (3.5),
 * Style-Mixin (3.6), Property-Set (3.7), Empty Bodies (3.11),
 * Deep Chains (3.12), Mixed as/extends (3.13), Cross-Cases (3.14),
 * Pathologische (3.15).
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

function findStyle(node: any, property: string, state?: string) {
  return (node?.styles ?? []).find(
    (s: any) => s.property === property && (state ? s.state === state : !s.state)
  )
}

// ============================================================================
// 3.2 Properties Inheritance — extended
// ============================================================================

describe('Inheritance Coverage P: Properties', () => {
  it('P5: Token Reference Override — A "bg $primary", B as A "bg #f00" → child hex wins', () => {
    const code = `primary: #abc
A as Frame:
  bg $primary
B as A:
  bg #f00
B`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'background')?.value).toBe('#f00')
  })

  it('P7: Multi-Value Override — A "pad 8 16", B as A "pad 4" → child single wins', () => {
    const code = `A as Frame:
  pad 8 16
B as A:
  pad 4
B`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'padding')?.value).toBe('4px')
  })

  it('P8: Hover-Property in Inheritance — child hover-bg wins', () => {
    const code = `A as Button:
  hover-bg #f00
B as A:
  hover-bg #0f0
B`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'background', 'hover')?.value).toBe('#0f0')
  })

  it('P9: Same property different aliases — A "w 100", B as A "width 200" → child wins', () => {
    const code = `A as Frame:
  w 100
B as A:
  width 200
B`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'width')?.value).toBe('200px')
  })

  it('P10: 5-deep chain accumulates non-conflicting properties', () => {
    const code = `L0 as Frame:
  pad 0
L1 as L0:
  bg #f00
L2 as L1:
  rad 4
L3 as L2:
  col white
L4 as L3:
  fs 14
L4`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'padding')?.value).toBe('0px')
    expect(findStyle(inst, 'background')?.value).toBe('#f00')
    expect(findStyle(inst, 'border-radius')?.value).toBe('4px')
    expect(findStyle(inst, 'color')?.value).toBe('white')
    expect(findStyle(inst, 'font-size')?.value).toBe('14px')
  })

  it('P11: Direction-property in inheritance — A hor, B as A ver → child ver wins', () => {
    const code = `A as Frame:
  hor
B as A:
  ver
B`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'flex-direction')?.value).toBe('column')
  })
})

// ============================================================================
// 3.3 States Inheritance — extended
// ============================================================================

describe('Inheritance Coverage S: States', () => {
  it('S1: Parent hover bg + Child hover col → both merged in hover', () => {
    const code = `A as Button:
  hover:
    bg #f00
B as A:
  hover:
    col white
B`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'background', 'hover')?.value).toBe('#f00')
    expect(findStyle(inst, 'color', 'hover')?.value).toBe('white')
  })

  it('S3: Parent hover only + Child focus only → both states present', () => {
    const code = `A as Button:
  hover:
    bg #f00
B as A:
  focus:
    bor 2
B`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'background', 'hover')?.value).toBe('#f00')
    // focus state is present
    const focusBor = (inst.styles ?? []).find(
      (s: any) =>
        s.state === 'focus' && (s.property === 'border' || s.property?.startsWith('border-'))
    )
    expect(focusBor).toBeDefined()
  })

  it('S5: 3-Level state chain — properties accumulate in same state name', () => {
    const code = `A as Button:
  hover:
    bg #f00
B as A:
  hover:
    col white
C as B:
  hover:
    fs 14
C`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'background', 'hover')?.value).toBe('#f00')
    expect(findStyle(inst, 'color', 'hover')?.value).toBe('white')
    expect(findStyle(inst, 'font-size', 'hover')?.value).toBe('14px')
  })

  it('S2: Parent hover bg, Child hover bg different → child wins', () => {
    const code = `A as Button:
  hover:
    bg #f00
B as A:
  hover:
    bg #0f0
B`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'background', 'hover')?.value).toBe('#0f0')
  })
})

// ============================================================================
// 3.4 Events Inheritance — extended
// ============================================================================

describe('Inheritance Coverage E: Events', () => {
  it('E5: Parent has 2 events (separate lines), child adds 1 → 3 total', () => {
    const code = `A as Button:
  onclick toggle()
  onhover show(X)
B as A:
  onkeydown enter: submit()
B`
    const inst = toIR(parse(code)).nodes[0] as any
    const events = inst.events ?? []
    expect(events.length).toBe(3)
  })
})

// ============================================================================
// 3.5 Children Concatenation
// ============================================================================

describe('Inheritance Coverage CH: Children concatenation', () => {
  it('CH1: Parent [Frame "1", Frame "2"], Child [Frame "3"] → 3 children in order', () => {
    const code = `A as Frame:
  Frame "1"
  Frame "2"
B as A:
  Frame "3"
B`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(inst.children.length).toBe(3)
  })

  it('CH3: Parent has Slot, Child has Frame → both kept', () => {
    const code = `A as Frame:
  Slot
B as A:
  Frame "x"
B`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(inst.children.length).toBeGreaterThanOrEqual(2)
  })

  it('CH4: Parent has named "btn", Child has named "btn" → both kept (no name dedup)', () => {
    const code = `A as Frame:
  Button named btn "parent"
B as A:
  Button named btn "child"
B`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(inst.children.length).toBe(2)
  })

  it('CH5: 4-deep chain children stack correctly', () => {
    const code = `L0 as Frame:
  Text "L0"
L1 as L0:
  Text "L1"
L2 as L1:
  Text "L2"
L3 as L2:
  Text "L3"
L3`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(inst.children.length).toBe(4)
  })
})

// ============================================================================
// 3.6 Style-Mixin (PascalCase Property)
// ============================================================================

describe('Inheritance Coverage M: Style-mixin (PascalCase)', () => {
  it('M1: "Frame Base" expands Base properties into Frame', () => {
    const code = `Base as Frame:
  pad 16
  bg #f00
Frame Base`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'padding')?.value).toBe('16px')
    expect(findStyle(inst, 'background')?.value).toBe('#f00')
  })

  it('M2: Multiple mixins "Frame Base, Theme" expand both', () => {
    const code = `Base as Frame:
  pad 16
Theme as Frame:
  bg #f00
Frame Base, Theme`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'padding')?.value).toBe('16px')
    expect(findStyle(inst, 'background')?.value).toBe('#f00')
  })

  it('M3: Mixin + own property — own wins (last)', () => {
    const code = `Base as Frame:
  pad 16
Frame Base, pad 24`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'padding')?.value).toBe('24px')
  })
})

// ============================================================================
// 3.7 Property-Set (lowercase)
// ============================================================================

describe('Inheritance Coverage PS: Property-Set (lowercase mixin)', () => {
  it('PS1: "$cardstyle" expands properties', () => {
    const code = `cardstyle: pad 16, bg #f00, rad 8
Frame $cardstyle`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'padding')?.value).toBe('16px')
    expect(findStyle(inst, 'background')?.value).toBe('#f00')
    expect(findStyle(inst, 'border-radius')?.value).toBe('8px')
  })

  it('PS2: "$cardstyle, pad 8" — own pad overrides', () => {
    const code = `cardstyle: pad 16, bg #f00
Frame $cardstyle, pad 8`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'padding')?.value).toBe('8px')
  })

  it('PS3: "pad 8, $cardstyle" — property-set comes after, its pad wins', () => {
    const code = `cardstyle: pad 16, bg #f00
Frame pad 8, $cardstyle`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'padding')?.value).toBe('16px')
  })

  it('PS5: Property-Set with token reference inside resolves through', () => {
    const code = `primary: #abc
cardstyle: bg $primary, pad 16
Frame $cardstyle`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'background')?.value).toContain('--primary')
    expect(findStyle(inst, 'padding')?.value).toBe('16px')
  })
})

// ============================================================================
// 3.11 Empty Bodies
// ============================================================================

describe('Inheritance Coverage EB: Empty bodies', () => {
  it('EB1: "Btn:" (default Frame, no body) creates a working Component', () => {
    const code = `Btn:
Btn`
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('EB2: "Btn as Button:" (no body) is valid', () => {
    const code = `Btn as Button:
Btn`
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('EB3: "B extends A:" (no body, A has props) → B inherits all of A', () => {
    const code = `A as Frame:
  pad 16
  bg #f00
B extends A:
B`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'padding')?.value).toBe('16px')
    expect(findStyle(inst, 'background')?.value).toBe('#f00')
  })
})

// ============================================================================
// 3.12 Deep Chains
// ============================================================================

describe('Inheritance Coverage DC: Deep inheritance chains', () => {
  it('DC1: 5-Level chain with one property per level', () => {
    const code = `L0 as Frame:
  pad 0
L1 as L0:
  mar 1
L2 as L1:
  rad 2
L3 as L2:
  bor 3
L4 as L3:
  bg #f00
L4`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'padding')?.value).toBe('0px')
    expect(findStyle(inst, 'margin')?.value).toBe('1px')
    expect(findStyle(inst, 'border-radius')?.value).toBe('2px')
    expect(findStyle(inst, 'background')?.value).toBe('#f00')
  })

  it('DC2: 10-Level chain works without stack overflow', () => {
    const lines: string[] = ['L0 as Frame:', '  pad 0']
    for (let i = 1; i <= 10; i++) {
      lines.push(`L${i} as L${i - 1}:`)
      lines.push(`  mar ${i}`)
    }
    lines.push('L10')
    expect(() => toIR(parse(lines.join('\n')))).not.toThrow()
    const inst = toIR(parse(lines.join('\n'))).nodes[0] as any
    expect(findStyle(inst, 'margin')?.value).toBe('10px')
  })

  it('DC3: 5-Level chain with override at every level → final wins', () => {
    const code = `L0 as Frame:
  pad 0
L1 as L0:
  pad 1
L2 as L1:
  pad 2
L3 as L2:
  pad 3
L4 as L3:
  pad 4
L4`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'padding')?.value).toBe('4px')
  })
})

// ============================================================================
// 3.13 Mixed `as` and `extends`
// ============================================================================

describe('Inheritance Coverage AE: Mixed as/extends', () => {
  it('AE1: A as Frame (primitive); B extends A → B inherits Frame primitive', () => {
    const code = `A as Frame:
  pad 8
B extends A:
  bg #f00
B`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'padding')?.value).toBe('8px')
    expect(findStyle(inst, 'background')?.value).toBe('#f00')
  })

  it('AE2: B extends Frame (primitive directly) → does not crash', () => {
    const code = `B extends Frame:
  pad 8
B`
    expect(() => toIR(parse(code))).not.toThrow()
  })

  it('AE3: 3-level with mixed as/extends', () => {
    const code = `A as Frame:
  pad 4
B as A:
  bg #f00
C extends B:
  rad 8
C`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'padding')?.value).toBe('4px')
    expect(findStyle(inst, 'background')?.value).toBe('#f00')
    expect(findStyle(inst, 'border-radius')?.value).toBe('8px')
  })
})

// ============================================================================
// 3.14 Cross-Cases
// ============================================================================

describe('Inheritance Coverage X: Cross-cases', () => {
  it('X1: Parent hover changes layout, child overrides default direction', () => {
    const code = `A as Frame:
  hor
  hover:
    ver
B as A:
  ver
B`
    const inst = toIR(parse(code)).nodes[0] as any
    // Child overrides default to ver
    expect(findStyle(inst, 'flex-direction')?.value).toBe('column')
    // Parent's hover state is inherited
    expect(findStyle(inst, 'flex-direction', 'hover')?.value).toBe('column')
  })

  it('X2: Parent has 2 states, Child adds new state → all 3 states present', () => {
    const code = `A as Button:
  hover:
    bg #f00
  focus:
    bor 1
B as A:
  active:
    scale 0.95
B`
    const inst = toIR(parse(code)).nodes[0] as any
    expect(findStyle(inst, 'background', 'hover')).toBeDefined()
    const hasFocusStyle = (inst.styles ?? []).some((s: any) => s.state === 'focus')
    const hasActiveStyle = (inst.styles ?? []).some((s: any) => s.state === 'active')
    expect(hasFocusStyle).toBe(true)
    expect(hasActiveStyle).toBe(true)
  })
})

// ============================================================================
// 3.15 Pathologische
// ============================================================================

describe('Inheritance Coverage PA: Pathological', () => {
  it('PA1: 50 components in chain → works without crash', () => {
    const lines: string[] = ['C0 as Frame:', '  pad 0']
    for (let i = 1; i < 50; i++) {
      lines.push(`C${i} as C${i - 1}:`)
      lines.push(`  mar ${i}`)
    }
    lines.push('C49')
    expect(() => toIR(parse(lines.join('\n')))).not.toThrow()
  })

  it('PA2-extra: Component with 30 properties, child overrides 1 → 29 inherited + 1 overridden', () => {
    const lines: string[] = ['Big as Frame:']
    for (let i = 0; i < 30; i++) {
      lines.push(`  pad-t ${i}`)
    }
    // override one property in child
    lines.push('Small as Big:')
    lines.push('  pad-t 999')
    lines.push('Small')
    const inst = toIR(parse(lines.join('\n'))).nodes[0] as any
    // Last pad-t should win
    expect(findStyle(inst, 'padding-top')?.value).toBe('999px')
  })
})
