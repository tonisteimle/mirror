/**
 * Component-Extract :: trigger — Edge cases + computeExtraction integration
 *
 * These tests close the gap between the helper unit tests and the
 * full CDP browser tests by exercising the pure-function orchestrator
 * `computeExtraction()`. No EditorView, no Studio dependency.
 */

import { describe, it, expect } from 'vitest'
import {
  getExistingDefinitionBody,
  replaceDefinitionLine,
  parseSegments,
  mergeProperties,
  computeExtraction,
} from '../../../studio/editor/triggers/component-extract-trigger'

// ---------------------------------------------------------------------------
// Helper-level edge cases
// ---------------------------------------------------------------------------

describe('Helper edge cases', () => {
  it('Btn vs BtnDanger — name is matched exactly, no prefix collision', () => {
    const com = `BtnDanger: bg #ef4444\nBtn: pad 10`
    expect(getExistingDefinitionBody(com, 'Btn')).toBe('pad 10')
    expect(getExistingDefinitionBody(com, 'BtnDanger')).toBe('bg #ef4444')
  })

  it('multi-line component (Card with inline props + slot children)', () => {
    const com = `Card: bg #1a1a1a, pad 16
  Title: col white
  Desc: col #888`
    expect(getExistingDefinitionBody(com, 'Card')).toBe('bg #1a1a1a, pad 16')
    const updated = replaceDefinitionLine(com, 'Card', 'bg #222, pad 20')
    expect(updated).toContain('Card: bg #222, pad 20')
    expect(updated).toContain('  Title: col white')
    expect(updated).toContain('  Desc: col #888')
  })

  it('empty body (Card: with only slots underneath)', () => {
    const com = `Card:\n  Title: col white`
    expect(getExistingDefinitionBody(com, 'Card')).toBe('')
    const merged = mergeProperties(parseSegments(''), parseSegments('pad 16, bg #333'))
    expect(merged).toBe('pad 16, bg #333')
  })

  it('replaceDefinitionLine preserves leading whitespace if any', () => {
    expect(replaceDefinitionLine('  Btn: pad 10', 'Btn', 'pad 12')).toBe('  Btn: pad 12')
  })

  it('returns null for missing component', () => {
    expect(getExistingDefinitionBody('Btn: pad 10', 'Other')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// computeExtraction — pure orchestrator integration
// ---------------------------------------------------------------------------

describe('computeExtraction — full flow', () => {
  it('user case: Btn:: #333, pad 12, "Drück mich" — fresh component', () => {
    const result = computeExtraction({
      source: 'Frame pad 16\n  Btn:: #333, pad 12, "Drück mich"',
      lineNumber: 2,
      componentName: 'Btn',
      comContent: '',
    })
    expect(result?.kind).toBe('extract')
    if (result?.kind !== 'extract') throw new Error('expected extract')
    expect(result.replacement).toBe('  Btn "Drück mich"')
    expect(result.newComContent.trim()).toBe('Btn: #333, pad 12')
  })

  it('refining existing: Btn:: pad 14 — merges into existing definition', () => {
    const result = computeExtraction({
      source: 'Frame\n  Btn:: pad 14',
      lineNumber: 2,
      componentName: 'Btn',
      comContent: 'Btn: pad 10, bg #2271C1, col white',
    })
    if (result?.kind !== 'extract') throw new Error('expected extract')
    expect(result.replacement).toBe('  Btn')
    // pad replaced, bg + col preserved
    expect(result.newComContent).toBe('Btn: pad 14, bg #2271C1, col white')
  })

  it('strip-colon: Btn:: with no properties → just remove ::', () => {
    const result = computeExtraction({
      source: 'Frame\n  Btn::',
      lineNumber: 2,
      componentName: 'Btn',
      comContent: '',
    })
    expect(result).toEqual({ kind: 'strip-colon', componentName: 'Btn' })
  })

  it('children stay at instance, properties go to .com', () => {
    const result = computeExtraction({
      source: 'Frame\n  Card:: pad 16, bg #333\n    Text "Title"\n    Text "Desc"',
      lineNumber: 2,
      componentName: 'Card',
      comContent: '',
    })
    if (result?.kind !== 'extract') throw new Error('expected extract')
    expect(result.replacement).toBe('  Card\n    Text "Title"\n    Text "Desc"')
    expect(result.newComContent.trim()).toBe('Card: pad 16, bg #333')
    // endLine should cover all children
    expect(result.endLine).toBe(4)
  })

  it('children + content string both preserved', () => {
    const result = computeExtraction({
      source: 'Frame\n  Card:: pad 16, "Title here"\n    Text "Body"',
      lineNumber: 2,
      componentName: 'Card',
      comContent: '',
    })
    if (result?.kind !== 'extract') throw new Error('expected extract')
    expect(result.replacement).toBe('  Card "Title here"\n    Text "Body"')
    expect(result.newComContent.trim()).toBe('Card: pad 16')
  })

  it('component name with prefix collision in .com — only target replaced', () => {
    const result = computeExtraction({
      source: 'Btn:: pad 14',
      lineNumber: 1,
      componentName: 'Btn',
      comContent: 'BtnDanger: bg #ef4444\nBtn: pad 10',
    })
    if (result?.kind !== 'extract') throw new Error('expected extract')
    // Btn updated, BtnDanger untouched
    expect(result.newComContent).toContain('Btn: pad 14')
    expect(result.newComContent).toContain('BtnDanger: bg #ef4444')
    expect(result.newComContent.match(/BtnDanger:/g)?.length).toBe(1)
  })

  it('multi-line existing component (Card with slots) — slots preserved', () => {
    const com = `Card: bg #1a1a1a, pad 16
  Title: col white
  Desc: col #888`
    const result = computeExtraction({
      source: 'Card:: bg #222',
      lineNumber: 1,
      componentName: 'Card',
      comContent: com,
    })
    if (result?.kind !== 'extract') throw new Error('expected extract')
    expect(result.newComContent).toContain('Card: bg #222, pad 16')
    expect(result.newComContent).toContain('  Title: col white')
    expect(result.newComContent).toContain('  Desc: col #888')
  })

  it('multiple positional bare values + content + named property', () => {
    const result = computeExtraction({
      source: 'IconBtn:: 24, #888, "edit"',
      lineNumber: 1,
      componentName: 'IconBtn',
      comContent: '',
    })
    if (result?.kind !== 'extract') throw new Error('expected extract')
    expect(result.replacement).toBe('IconBtn "edit"')
    expect(result.newComContent.trim()).toBe('IconBtn: 24, #888')
  })

  it('cursor offset points right after the component name', () => {
    const result = computeExtraction({
      source: '  Btn:: pad 10',
      lineNumber: 1,
      componentName: 'Btn',
      comContent: '',
    })
    if (result?.kind !== 'extract') throw new Error('expected extract')
    // indent (2) + name length (3) = 5
    expect(result.cursorOffsetInReplacement).toBe(5)
  })

  it('returns null for invalid line number', () => {
    expect(
      computeExtraction({
        source: 'Btn:: pad 10',
        lineNumber: 99,
        componentName: 'Btn',
        comContent: '',
      })
    ).toBeNull()
  })

  it('returns null when :: not found on the line', () => {
    expect(
      computeExtraction({
        source: 'Btn pad 10',
        lineNumber: 1,
        componentName: 'Btn',
        comContent: '',
      })
    ).toBeNull()
  })

  it('appended new component preserves existing components in .com', () => {
    const result = computeExtraction({
      source: 'NewComp:: bg #fff',
      lineNumber: 1,
      componentName: 'NewComp',
      comContent: 'OldComp: pad 10',
    })
    if (result?.kind !== 'extract') throw new Error('expected extract')
    expect(result.newComContent).toContain('OldComp: pad 10')
    expect(result.newComContent).toContain('NewComp: bg #fff')
  })

  it('merge appends new properties to existing definition', () => {
    const result = computeExtraction({
      source: 'Btn:: rad 6, shadow md',
      lineNumber: 1,
      componentName: 'Btn',
      comContent: 'Btn: pad 10, bg #2271C1',
    })
    if (result?.kind !== 'extract') throw new Error('expected extract')
    expect(result.newComContent).toBe('Btn: pad 10, bg #2271C1, rad 6, shadow md')
  })

  it('positional bare values in :: line go to .com unchanged', () => {
    const result = computeExtraction({
      source: 'Btn:: 100, 50, #333',
      lineNumber: 1,
      componentName: 'Btn',
      comContent: '',
    })
    if (result?.kind !== 'extract') throw new Error('expected extract')
    expect(result.newComContent.trim()).toBe('Btn: 100, 50, #333')
    // Instance line: just Btn (no content strings, no children)
    expect(result.replacement).toBe('Btn')
  })
})
