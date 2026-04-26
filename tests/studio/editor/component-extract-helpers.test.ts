/**
 * Component-Extract :: trigger — Pure helpers
 *
 * Unit tests for parseSegments / mergeProperties /
 * getExistingDefinitionBody / replaceDefinitionLine. These cover the
 * user-visible behavior of `Btn:: ...`:
 *   - bare strings stay at the instance (kind: 'content')
 *   - properties go into the .com definition (merged with existing)
 */

import { describe, it, expect } from 'vitest'
import {
  parseSegments,
  mergeProperties,
  getExistingDefinitionBody,
  replaceDefinitionLine,
} from '../../../studio/editor/triggers/component-extract-trigger'

describe('parseSegments — content vs property classification', () => {
  it('user case: hex + named property + content string', () => {
    const segs = parseSegments('#333, pad 12, "Drück mich"')
    expect(segs).toEqual([
      { kind: 'property', key: null, full: '#333' },
      { kind: 'property', key: 'pad', full: 'pad 12' },
      { kind: 'content', full: '"Drück mich"' },
    ])
  })

  it('multiple bare values + multiple content strings', () => {
    const segs = parseSegments('100, 50, #333, "Hello", "World"')
    expect(segs.filter(s => s.kind === 'content').map(s => s.full)).toEqual(['"Hello"', '"World"'])
    expect(segs.filter(s => s.kind === 'property').map(s => s.full)).toEqual(['100', '50', '#333'])
  })

  it('comma inside a string is preserved', () => {
    const segs = parseSegments('"hello, world", pad 12')
    expect(segs).toEqual([
      { kind: 'content', full: '"hello, world"' },
      { kind: 'property', key: 'pad', full: 'pad 12' },
    ])
  })

  it('named property with string value is NOT content', () => {
    const segs = parseSegments('placeholder "Email...", pad 8')
    expect(segs).toEqual([
      { kind: 'property', key: 'placeholder', full: 'placeholder "Email..."' },
      { kind: 'property', key: 'pad', full: 'pad 8' },
    ])
  })

  it('positional bare value (number, hex, $token) has key=null', () => {
    // Note: bare `hug` / `full` ARE alphabetic identifiers — the trigger
    // can't tell them apart from property names without the schema. They
    // get a key, but that's fine: the merge still works correctly because
    // they'd never appear by themselves in a real definition (they're
    // always values to `w` / `h` slots).
    const segs = parseSegments('100, #333, $primary')
    expect(segs.every(s => s.kind === 'property' && s.key === null)).toBe(true)
  })

  it('empty string returns empty array', () => {
    expect(parseSegments('')).toEqual([])
    expect(parseSegments('   ')).toEqual([])
  })
})

describe('mergeProperties — preserves existing, replaces by name, appends new', () => {
  it('new properties extend existing ones', () => {
    const existing = parseSegments('pad 10, bg #2271C1')
    const updates = parseSegments('rad 8')
    expect(mergeProperties(existing, updates)).toBe('pad 10, bg #2271C1, rad 8')
  })

  it('same-named property replaces existing value', () => {
    const existing = parseSegments('pad 10, bg #2271C1')
    const updates = parseSegments('pad 12')
    expect(mergeProperties(existing, updates)).toBe('pad 12, bg #2271C1')
  })

  it('multiple updates: some replace, some append', () => {
    const existing = parseSegments('pad 10, bg #2271C1, col white')
    const updates = parseSegments('pad 12, rad 8')
    expect(mergeProperties(existing, updates)).toBe('pad 12, bg #2271C1, col white, rad 8')
  })

  it('content segments are dropped (do not pollute definition)', () => {
    const existing = parseSegments('pad 10')
    const updates = parseSegments('"Drück mich", bg #333')
    expect(mergeProperties(existing, updates)).toBe('pad 10, bg #333')
  })

  it('positional bare values (key=null) are always appended, never merged', () => {
    const existing = parseSegments('pad 10')
    const updates = parseSegments('#333, 100')
    expect(mergeProperties(existing, updates)).toBe('pad 10, #333, 100')
  })

  it('existing-only properties survive when not mentioned in updates', () => {
    const existing = parseSegments('pad 10, bg #blue, col white, rad 4')
    const updates = parseSegments('pad 12')
    expect(mergeProperties(existing, updates)).toBe('pad 12, bg #blue, col white, rad 4')
  })
})

describe('getExistingDefinitionBody / replaceDefinitionLine', () => {
  const com = `// Components

PrimaryBtn: pad 10, bg #2271C1
DangerBtn: pad 10, bg #ef4444`

  it('finds the body of an existing component', () => {
    expect(getExistingDefinitionBody(com, 'PrimaryBtn')).toBe('pad 10, bg #2271C1')
    expect(getExistingDefinitionBody(com, 'DangerBtn')).toBe('pad 10, bg #ef4444')
    expect(getExistingDefinitionBody(com, 'GhostBtn')).toBeNull()
  })

  it('replaces the definition line in place, preserving order + leading whitespace', () => {
    const updated = replaceDefinitionLine(com, 'PrimaryBtn', 'pad 12, bg #2271C1, rad 6')
    expect(updated).toBe(`// Components

PrimaryBtn: pad 12, bg #2271C1, rad 6
DangerBtn: pad 10, bg #ef4444`)
  })

  it('does not duplicate the definition (it modifies in place)', () => {
    const updated = replaceDefinitionLine(com, 'PrimaryBtn', 'rad 99')
    expect(updated.match(/PrimaryBtn:/g)?.length).toBe(1)
  })
})

describe('User scenario end-to-end (helper-level)', () => {
  it('Btn:: #333, pad 12, "Drück mich" — first time', () => {
    // Initially: no Btn definition
    const com = ''
    const segs = parseSegments('#333, pad 12, "Drück mich"')
    const props = segs.filter(s => s.kind === 'property')
    const content = segs.filter(s => s.kind === 'content')

    // First time: existing = [] → mergeProperties returns just the new props
    const body = mergeProperties([], props)
    expect(body).toBe('#333, pad 12')
    expect(content.map(s => s.full)).toEqual(['"Drück mich"'])

    // What gets written to .com:  Btn: #333, pad 12
    // What stays in editor:       Btn "Drück mich"
    expect(`Btn: ${body}`).toBe('Btn: #333, pad 12')
    expect(`Btn ${content.map(s => s.full).join(', ')}`).toBe('Btn "Drück mich"')
    void com
  })

  it('Btn:: pad 14 — refining existing component, no content', () => {
    const com = `Btn: pad 10, bg #2271C1, col white`
    const existing = parseSegments(getExistingDefinitionBody(com, 'Btn')!)
    const updates = parseSegments('pad 14')
    const newBody = mergeProperties(existing, updates)

    expect(newBody).toBe('pad 14, bg #2271C1, col white')
    expect(replaceDefinitionLine(com, 'Btn', newBody)).toBe('Btn: pad 14, bg #2271C1, col white')
  })

  it('Btn:: rad 6, "Save" — existing, with new content', () => {
    const com = `Btn: pad 10, bg #2271C1`
    const existing = parseSegments(getExistingDefinitionBody(com, 'Btn')!)
    const segs = parseSegments('rad 6, "Save"')
    const propUpdates = segs.filter(s => s.kind === 'property')
    const content = segs.filter(s => s.kind === 'content')

    expect(mergeProperties(existing, propUpdates)).toBe('pad 10, bg #2271C1, rad 6')
    expect(content.map(s => s.full)).toEqual(['"Save"'])
  })
})
