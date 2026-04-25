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
