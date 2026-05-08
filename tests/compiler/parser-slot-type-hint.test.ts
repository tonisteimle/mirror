/**
 * Parser test — slot definitions with inline type hints.
 *
 * Designers commonly write `Slot: Frame prop, prop` to be explicit about
 * the visual type of a slot. Pre-fix the parser interpreted `Frame` as a
 * property name with no value, then flattened every subsequent prop into
 * the slot — producing W110 duplicate-property noise on every multi-slot
 * component. Post-fix the parser detects the redundant type hint when
 * the first identifier matches a primitive or a known component, and
 * skips it so the props that follow attach correctly.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'

describe('parser — slot type hint inference', () => {
  it('skips a primitive name as inline type hint', () => {
    const ast = parse(`Card: bg #fff
  Body: Frame col #000, fs 14
`)
    const card = ast.components[0]
    const bodySlot = card.children[0]
    expect(bodySlot.type).toBe('Instance')
    if (bodySlot.type !== 'Instance') return
    expect(bodySlot.component).toBe('Body')
    // The properties should be col + fs only — no spurious "Frame" property.
    const propNames = bodySlot.properties.map(p => p.name)
    expect(propNames).toEqual(['col', 'fs'])
    expect(propNames).not.toContain('Frame')
  })

  it('skips a known-component name as inline type hint', () => {
    const ast = parse(`MyBase: pad 10

Card: bg #fff
  Sub: MyBase fs 14
`)
    // MyBase is a defined component; "Sub: MyBase fs 14" should treat
    // MyBase as the type hint and emit only the fs property on Sub.
    const card = ast.components.find(c => c.name === 'Card')!
    const subSlot = card.children[0]
    expect(subSlot.type).toBe('Instance')
    if (subSlot.type !== 'Instance') return
    expect(subSlot.component).toBe('Sub')
    const propNames = subSlot.properties.map(p => p.name)
    expect(propNames).toEqual(['fs'])
  })

  it('does NOT skip when first token is a property name', () => {
    const ast = parse(`Card: bg #fff
  Title: col white, fs 16
`)
    const card = ast.components[0]
    const titleSlot = card.children[0]
    expect(titleSlot.type).toBe('Instance')
    if (titleSlot.type !== 'Instance') return
    expect(titleSlot.component).toBe('Title')
    const propNames = titleSlot.properties.map(p => p.name)
    expect(propNames).toEqual(['col', 'fs'])
  })

  it('does NOT skip when first token is unknown / lowercase', () => {
    const ast = parse(`Card: bg #fff
  Body: nonsenseprop 5
`)
    const card = ast.components[0]
    const bodySlot = card.children[0]
    expect(bodySlot.type).toBe('Instance')
    if (bodySlot.type !== 'Instance') return
    // nonsenseprop should be parsed as a property (will be flagged by
    // the validator, but the parser keeps it).
    const propNames = bodySlot.properties.map(p => p.name)
    expect(propNames).toContain('nonsenseprop')
  })

  it('multi-slot component — no flattening into parent', () => {
    const ast = parse(`Row: hor, gap 8
  Name: Frame col #fff, fs 11
  ISIN: Frame font mono, fs 10, col #888
`)
    const row = ast.components[0]
    // Parent Row has only its own props (hor, gap), not children's.
    expect(row.properties.map(p => p.name)).toEqual(['hor', 'gap'])
    // Each slot has its own clean props.
    const nameSlot = row.children[0]
    const isinSlot = row.children[1]
    if (nameSlot.type !== 'Instance' || isinSlot.type !== 'Instance') {
      throw new Error('Expected both slots as Instance')
    }
    expect(nameSlot.properties.map(p => p.name)).toEqual(['col', 'fs'])
    expect(isinSlot.properties.map(p => p.name)).toEqual(['font', 'fs', 'col'])
  })
})
