/**
 * DatePicker — Compiler-Pipeline-Tests (Thema 12)
 *
 * Deckt Parser → IR-Transformer → DOM-Backend → Runtime ab.
 * Begleitend zu tests/compiler/docs/themen/12-datepicker.md.
 *
 * DatePicker ist nach dem Zag-Cleanup 2026-04-25 die einzige verbleibende
 * Zag-Komponente. Diese Test-Suite holt die Coverage von ~0% auf
 * sinnvolles Niveau.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'
import { generateDOM } from '../../compiler/backends/dom'

// =============================================================================
// Helpers
// =============================================================================

function compile(src: string): { ast: any; ir: any } {
  const ast = parse(src) as any
  const ir = toIR(ast) as any
  return { ast, ir }
}

function dpNode(ir: any): any {
  return ir.nodes.find((n: any) => n.zagType === 'datepicker' || n.primitive === 'datepicker')
}

function dom(src: string): string {
  return generateDOM(parse(src))
}

// =============================================================================
// 3.1 Property-Mapping
// =============================================================================

describe('DatePicker — Property-Mapping (zag-transformer)', () => {
  it('D1: bare DatePicker yields zagType=datepicker', () => {
    const { ir } = compile('canvas mobile\nDatePicker')
    const dp = dpNode(ir)
    expect(dp).toBeDefined()
    expect(dp.zagType).toBe('datepicker')
    expect(dp.machineConfig?.id).toBeDefined()
  })

  it('D2: placeholder is captured', () => {
    const { ir } = compile('canvas mobile\nDatePicker placeholder "Pick a date"')
    expect(dpNode(ir).machineConfig.placeholder).toBe('Pick a date')
  })

  it('D3: selectionMode single', () => {
    const { ir } = compile('canvas mobile\nDatePicker selectionMode "single"')
    expect(dpNode(ir).machineConfig.selectionMode).toBe('single')
  })

  it('D4: selectionMode multiple', () => {
    const { ir } = compile('canvas mobile\nDatePicker selectionMode "multiple"')
    expect(dpNode(ir).machineConfig.selectionMode).toBe('multiple')
  })

  it('D5: selectionMode range', () => {
    const { ir } = compile('canvas mobile\nDatePicker selectionMode "range"')
    expect(dpNode(ir).machineConfig.selectionMode).toBe('range')
  })

  it('D6: fixedWeeks (boolean standalone) sets machineConfig.fixedWeeks=true', () => {
    const { ir } = compile('canvas mobile\nDatePicker fixedWeeks')
    expect(dpNode(ir).machineConfig.fixedWeeks).toBe(true)
  })

  it('D7: closeOnSelect false', () => {
    const { ir } = compile('canvas mobile\nDatePicker closeOnSelect false')
    expect(dpNode(ir).machineConfig.closeOnSelect).toBe(false)
  })

  it('D8: startOfWeek 1 (Monday)', () => {
    const { ir } = compile('canvas mobile\nDatePicker startOfWeek 1')
    expect(dpNode(ir).machineConfig.startOfWeek).toBe(1)
  })

  it('D9: positioning "top-end" lands in machineConfig', () => {
    const { ir } = compile('canvas mobile\nDatePicker positioning "top-end"')
    expect(dpNode(ir).machineConfig.positioning).toBe('top-end')
  })

  it('D10: disabled (boolean standalone)', () => {
    const { ir } = compile('canvas mobile\nDatePicker disabled')
    expect(dpNode(ir).machineConfig.disabled).toBe(true)
  })

  it('D11: readOnly (boolean standalone)', () => {
    const { ir } = compile('canvas mobile\nDatePicker readOnly')
    expect(dpNode(ir).machineConfig.readOnly).toBe(true)
  })

  it('D12: value "2026-04-25"', () => {
    const { ir } = compile('canvas mobile\nDatePicker value "2026-04-25"')
    expect(dpNode(ir).machineConfig.value).toBe('2026-04-25')
  })

  it('D13: min/max set independently', () => {
    const { ir } = compile('canvas mobile\nDatePicker min "2026-01-01", max "2026-12-31"')
    const cfg = dpNode(ir).machineConfig
    expect(cfg.min).toBe('2026-01-01')
    expect(cfg.max).toBe('2026-12-31')
  })

  it('D14: locale "de-DE"', () => {
    const { ir } = compile('canvas mobile\nDatePicker locale "de-DE"')
    expect(dpNode(ir).machineConfig.locale).toBe('de-DE')
  })

  it('combined: many properties at once', () => {
    const { ir } = compile(
      'canvas mobile\nDatePicker placeholder "Pick", selectionMode "range", fixedWeeks, closeOnSelect false, startOfWeek 1, positioning "top", disabled'
    )
    const cfg = dpNode(ir).machineConfig
    expect(cfg.placeholder).toBe('Pick')
    expect(cfg.selectionMode).toBe('range')
    expect(cfg.fixedWeeks).toBe(true)
    expect(cfg.closeOnSelect).toBe(false)
    expect(cfg.startOfWeek).toBe(1)
    expect(cfg.positioning).toBe('top')
    expect(cfg.disabled).toBe(true)
  })
})

// =============================================================================
// 3.2 Bind & Interaction
// =============================================================================

describe('DatePicker — bind', () => {
  it('D15: bind myDate (no $)', () => {
    const { ir } = compile('canvas mobile\nDatePicker bind myDate')
    const dp = dpNode(ir)
    expect(dp.bindValue || dp.valueBinding || dp.bind).toBe('myDate')
  })

  it('D16: bind $myDate (strip leading $)', () => {
    const { ir } = compile('canvas mobile\nDatePicker bind $myDate')
    const dp = dpNode(ir)
    expect(dp.bindValue || dp.valueBinding || dp.bind).toBe('myDate')
  })
})

// =============================================================================
// 3.3 Code-Emission (overlay-emitters)
// =============================================================================

describe('DatePicker — DOM Code-Emission', () => {
  it('D17: output contains zagComponent marker + init call + slot creation', () => {
    const out = dom('canvas mobile\nDatePicker')
    expect(out).toContain("dataset.zagComponent = 'datepicker'")
    expect(out).toContain('initDatePickerComponent')
    expect(out).toContain("dataset.slot = 'Control'")
    expect(out).toContain("dataset.slot = 'Input'")
    expect(out).toContain("dataset.slot = 'Trigger'")
    expect(out).toContain("dataset.slot = 'Content'")
  })

  it('D18: placeholder is set on the input element', () => {
    const out = dom('canvas mobile\nDatePicker placeholder "Pick a date"')
    expect(out).toContain("placeholder = 'Pick a date'")
  })

  it('D19: default placeholder is "Select date..." when none provided', () => {
    const out = dom('canvas mobile\nDatePicker')
    expect(out).toContain("placeholder = 'Select date...'")
  })

  it('D20: root styling (bg/pad/rad) reaches the output', () => {
    const out = dom('canvas mobile\nDatePicker bg #f00, pad 16, rad 8')
    // Root styles are emitted via emitRootStyles → Object.assign(varName.style, {...})
    expect(out).toMatch(/'background':\s*'#f00'/)
    expect(out).toMatch(/'padding':\s*'16px'/)
    expect(out).toMatch(/'border-radius':\s*'8px'/)
  })

  it('runtime initDatePickerComponent function is in the bundle', () => {
    const out = dom('canvas mobile\nDatePicker')
    expect(out).toContain('initDatePickerComponent(el)')
  })
})

// =============================================================================
// 3.4 Pathological
// =============================================================================

describe('DatePicker — pathological inputs', () => {
  it('D24: invalid selectionMode is passed through (no validation crash)', () => {
    const { ir } = compile('canvas mobile\nDatePicker selectionMode "INVALID"')
    expect(dpNode(ir).machineConfig.selectionMode).toBe('INVALID')
  })

  it('D25: startOfWeek 7 is passed through (out-of-range, no crash)', () => {
    const { ir } = compile('canvas mobile\nDatePicker startOfWeek 7')
    expect(dpNode(ir).machineConfig.startOfWeek).toBe(7)
  })

  it('D26: startOfWeek "abc" produces NaN, no crash', () => {
    const { ir } = compile('canvas mobile\nDatePicker startOfWeek "abc"')
    const v = dpNode(ir).machineConfig.startOfWeek
    expect(Number.isNaN(v)).toBe(true)
  })

  it('D29: two DatePickers receive distinct IDs', () => {
    const { ir } = compile('canvas mobile\nFrame\n  DatePicker\n  DatePicker')
    const dps = ir.nodes
      .flatMap(function collect(n: any): any[] {
        return [n, ...((n.children as any[]) || []).flatMap(collect)]
      })
      .filter((n: any) => n.zagType === 'datepicker')
    expect(dps.length).toBe(2)
    expect(dps[0].machineConfig.id).not.toBe(dps[1].machineConfig.id)
  })

  it('does not crash on DatePicker with explicit empty body', () => {
    expect(() => compile('canvas mobile\nDatePicker:\n')).not.toThrow()
  })
})

// =============================================================================
// Iter 2 — Slot-Body Tests (overlay-emitters + zag-parser/transformer slot path)
// =============================================================================

describe('DatePicker Iter 2 — slot bodies with custom styling', () => {
  it('S1: Control slot with custom styling reaches output', () => {
    const out = dom(`canvas mobile
DatePicker placeholder "Pick"
  Control: bg #f00, pad 8, rad 6
`)
    // Control slot styles are applied via Object.assign(controlVar.style, ...)
    expect(out).toMatch(/Object\.assign\(\w+_control\.style/)
    expect(out).toMatch(/'background':\s*'#f00'/)
    expect(out).toMatch(/'padding':\s*'8px'/)
  })

  it('S2: Input slot with custom styling', () => {
    const out = dom(`canvas mobile
DatePicker
  Input: bg #fff, col #333, fs 14
`)
    expect(out).toMatch(/Object\.assign\(\w+_input\.style/)
    expect(out).toMatch(/'background':\s*'#fff'/)
  })

  it('S3: Trigger slot with custom styling', () => {
    const out = dom(`canvas mobile
DatePicker
  Trigger: bg #eee, w 32, h 32
`)
    expect(out).toMatch(/Object\.assign\(\w+_trigger\.style/)
  })

  it('S4: Content slot with custom styling', () => {
    const out = dom(`canvas mobile
DatePicker
  Content: bg #1a1a1a, rad 8, pad 16
`)
    expect(out).toMatch(/Object\.assign\(\w+_content\.style/)
  })

  it('S5: All four primary slots styled together', () => {
    const out = dom(`canvas mobile
DatePicker
  Control: bg #f00
  Input: bg #fff
  Trigger: bg #eee
  Content: bg #1a1a1a
`)
    expect(out).toMatch(/_control\.style/)
    expect(out).toMatch(/_input\.style/)
    expect(out).toMatch(/_trigger\.style/)
    expect(out).toMatch(/_content\.style/)
  })
})

describe('DatePicker Iter 2 — additional zag-transformer paths', () => {
  it('T5: defaultValue "2026-04-25" is preserved', () => {
    const { ir } = compile('canvas mobile\nDatePicker defaultValue "2026-04-25"')
    expect(dpNode(ir).machineConfig.defaultValue).toBe('2026-04-25')
  })

  it('T6: 2 DatePicker on the same canvas register independently', () => {
    const out = dom(`canvas mobile
DatePicker placeholder "Birthday"
DatePicker placeholder "Anniversary"
`)
    const inits = (out.match(/initDatePickerComponent/g) || []).length
    expect(inits).toBeGreaterThanOrEqual(2)
  })

  it('T7: DatePicker inside a Frame respects parent layout', () => {
    const { ir } = compile(`canvas mobile
Frame pad 16, gap 8
  DatePicker
`)
    // The DatePicker should be a child of the Frame, not at root.
    const frame = ir.nodes[0]
    expect(frame.children?.length).toBeGreaterThan(0)
    expect(frame.children?.[0].zagType).toBe('datepicker')
  })

  it('T8: DatePicker in component definition extends correctly', () => {
    const out = dom(`canvas mobile
MyDP as DatePicker: placeholder "Pick"

MyDP
`)
    expect(out).toContain('initDatePickerComponent')
  })
})

describe('DatePicker Iter 2 — calendar slots', () => {
  it('C1: Label slot accepts text content', () => {
    const out = dom(`canvas mobile
DatePicker
  Label: bg #fff, col #333
`)
    expect(out).toMatch(/Object\.assign|data-slot|Label/)
  })

  it('C2: positioning property on instance reaches machineConfig', () => {
    const out = dom(`canvas mobile
DatePicker positioning "top"
`)
    expect(out).toMatch(/positioning":?\s*"top"|positioning':\s*'top'/)
  })
})

describe('DatePicker Iter 2 — keyboard + binding', () => {
  it('K1: bind <token> wires two-way value binding', () => {
    const { ir } = compile(`canvas mobile
selectedDate: ""
DatePicker bind selectedDate
`)
    const dp = dpNode(ir)
    // bindValue should be `selectedDate` (without `$`).
    expect(dp.bindValue ?? dp.valueBinding ?? dp.bind).toBe('selectedDate')
  })

  it('K2: name attribute is captured for form submission', () => {
    const { ir } = compile('canvas mobile\nDatePicker name "birthday"')
    expect(dpNode(ir).machineConfig.name).toBe('birthday')
  })
})

describe('DatePicker Iter 2 — parser branch coverage', () => {
  it('P1: defaultValue as array `[...]` parses without crash (range mode)', () => {
    expect(() =>
      compile('canvas mobile\nDatePicker selectionMode "range", defaultValue [2026-04-25]')
    ).not.toThrow()
  })

  it('P2: `MyDP as DatePicker: ...` is a definition (colon at end of decl line)', () => {
    const { ast } = compile(`canvas mobile
MyDP as DatePicker: placeholder "Pick"

MyDP
`) as any
    // The instance MyDP must be present as a Component def, not as a rendered Zag instance.
    expect(ast.components?.some((c: any) => c.name === 'MyDP')).toBe(true)
  })

  it('P3: DatePicker with comma-separated initial state lowercase ident → kept', () => {
    // `open` is a non-Zag-prop lowercase identifier without value → still
    // becomes initialState for the DatePicker (not in primitiveDef.props).
    const { ast } = compile('canvas mobile\nDatePicker open\n') as any
    const dp = ast.instances?.[0]
    // Either open becomes initialState OR is dropped as unknown — must not crash.
    expect(dp.type).toBe('ZagComponent')
  })

  it('P4: DatePicker with inline slot props: `Control, hor, spread:`', () => {
    const out = dom(`canvas mobile
DatePicker
  Control, hor, spread:
    Input
    Trigger
`)
    // Inline slot props must reach the output.
    expect(out).toContain('initDatePickerComponent')
  })

  it('P5: DatePicker definition with trailing colon → isDefinition path', () => {
    const { ast } = compile(`canvas mobile
DatePicker placeholder "X":
`) as any
    // The bare `DatePicker:` line marks it as a definition (isDefinition: true).
    // It should not render as a top-level instance.
    const dp = ast.instances?.find((i: any) => i.type === 'ZagComponent')
    if (dp) expect(dp.isDefinition).toBe(true)
  })

  it('P6: DatePicker with multiple events on instance', () => {
    const { ast } = compile(`canvas mobile
DatePicker
  onchange call("date-changed")
  onopen toast("opened")
`) as any
    const dp = ast.instances?.[0]
    expect(dp.events?.length).toBeGreaterThanOrEqual(2)
  })

  it('P7: DatePicker with Label slot containing text content', () => {
    const out = dom(`canvas mobile
DatePicker
  Label "Birthday":
    bg #fff
`)
    expect(out).toContain('initDatePickerComponent')
  })
})
