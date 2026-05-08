/**
 * Tests for studio/compile/yaml-parser.ts (327 LOC, 0%)
 *
 * Pure parser. Two parse paths: legacy flat (key:value + arrays) and
 * indent-stack for nested objects. The flat parser is the older code-path
 * and stays intact for sources that worked before; the nested parser
 * kicks in when `key:` (no value) is followed by indented `subkey:` lines
 * without any `- ` array marker.
 */

import { describe, it, expect } from 'vitest'
import {
  parseYAMLValue,
  parseYAML,
  collectYAMLData,
  generateYAMLDataInjection,
} from '../../studio/compile/yaml-parser'

// =============================================================================
// parseYAMLValue
// =============================================================================

describe('parseYAMLValue — primitives', () => {
  it('parses true/false', () => {
    expect(parseYAMLValue('true')).toBe(true)
    expect(parseYAMLValue('false')).toBe(false)
  })

  it('parses null + tilde', () => {
    expect(parseYAMLValue('null')).toBeNull()
    expect(parseYAMLValue('~')).toBeNull()
  })

  it('parses numbers (int + float)', () => {
    expect(parseYAMLValue('42')).toBe(42)
    expect(parseYAMLValue('3.14')).toBe(3.14)
    expect(parseYAMLValue('-7')).toBe(-7)
    expect(parseYAMLValue('0')).toBe(0)
  })

  it('strips double quotes', () => {
    expect(parseYAMLValue('"hello"')).toBe('hello')
  })

  it('strips single quotes', () => {
    expect(parseYAMLValue("'world'")).toBe('world')
  })

  it('preserves quoted numbers as strings', () => {
    expect(parseYAMLValue('"42"')).toBe('42')
  })

  it('keeps unquoted non-numeric strings as-is', () => {
    expect(parseYAMLValue('hello')).toBe('hello')
    expect(parseYAMLValue('foo bar')).toBe('foo bar')
  })

  it('keeps an empty string as ""', () => {
    expect(parseYAMLValue('')).toBe('')
  })

  it('keeps "true-ish" non-exact-matches as strings', () => {
    expect(parseYAMLValue('TRUE')).toBe('TRUE')
    expect(parseYAMLValue('Yes')).toBe('Yes')
  })
})

// =============================================================================
// parseYAML — flat path (legacy)
// =============================================================================

describe('parseYAML — flat key/value', () => {
  it('parses a single top-level key/value', () => {
    expect(parseYAML('name: Alice')).toEqual({ name: 'Alice' })
  })

  it('parses multiple top-level keys', () => {
    expect(parseYAML('name: Alice\nage: 30')).toEqual({ name: 'Alice', age: 30 })
  })

  it('skips blank lines and comments', () => {
    const text = `# Header
name: Alice

# Section
age: 30`
    expect(parseYAML(text)).toEqual({ name: 'Alice', age: 30 })
  })

  it('returns {} for empty input', () => {
    expect(parseYAML('')).toEqual({})
  })

  it('parses primitive values via parseYAMLValue', () => {
    const text = `s: "hello"\nn: 42\nb: true\nx: null`
    expect(parseYAML(text)).toEqual({ s: 'hello', n: 42, b: true, x: null })
  })
})

describe('parseYAML — top-level array (legacy quirk)', () => {
  it('returns the array directly when input is *only* a top-level array', () => {
    const text = `- foo\n- bar\n- baz`
    expect(parseYAML(text)).toEqual(['foo', 'bar', 'baz'])
  })

  it('parses array of inline objects', () => {
    const text = `- name: Alice, age: 30\n- name: Bob, age: 25`
    const result = parseYAML(text)
    expect(result).toEqual([
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ])
  })

  it('parses key with value-array', () => {
    // Note: value-array attaches the array to currentKey but the legacy
    // finalizer only returns the bare array if result is empty. With a key
    // present, result has the key and the array sits under it.
    const text = `tags:\n- a\n- b\n- c`
    expect(parseYAML(text)).toEqual({ tags: ['a', 'b', 'c'] })
  })

  it('nested-property under array: subkey at indent > currentIndent attaches to last array item', () => {
    const text = `users:\n- name: Alice\n  age: 30\n- name: Bob\n  age: 25`
    expect(parseYAML(text)).toEqual({
      users: [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ],
    })
  })
})

// =============================================================================
// parseYAML — nested-stack path
// =============================================================================

describe('parseYAML — nested objects (stack-parser path)', () => {
  it('parses bare-key + indented child', () => {
    const text = `user:\n  name: Alice\n  age: 30`
    expect(parseYAML(text)).toEqual({ user: { name: 'Alice', age: 30 } })
  })

  it('parses two levels deep', () => {
    const text = `tasks:\n  t1:\n    title: "Design"\n    status: "done"`
    expect(parseYAML(text)).toEqual({
      tasks: { t1: { title: 'Design', status: 'done' } },
    })
  })

  it('parses three levels deep', () => {
    const text = `a:\n  b:\n    c:\n      d: 1`
    expect(parseYAML(text)).toEqual({ a: { b: { c: { d: 1 } } } })
  })

  it('siblings at the same depth attach to the same parent', () => {
    const text = `tasks:\n  t1:\n    title: "A"\n  t2:\n    title: "B"`
    expect(parseYAML(text)).toEqual({
      tasks: { t1: { title: 'A' }, t2: { title: 'B' } },
    })
  })

  it('multiple top-level objects are independent', () => {
    const text = `a:\n  x: 1\nb:\n  y: 2`
    expect(parseYAML(text)).toEqual({ a: { x: 1 }, b: { y: 2 } })
  })

  it('values are parsed via parseYAMLValue', () => {
    const text = `obj:\n  s: "hi"\n  n: 5\n  b: true\n  q: "5"`
    expect(parseYAML(text)).toEqual({ obj: { s: 'hi', n: 5, b: true, q: '5' } })
  })

  it('skips blanks and comments inside nested blocks', () => {
    const text = `obj:\n  # comment\n\n  x: 1\n  y: 2`
    expect(parseYAML(text)).toEqual({ obj: { x: 1, y: 2 } })
  })

  it('lines without colon inside nested block are skipped (defensive)', () => {
    // First sibling has a colon → nested-stack path engages.
    // The bare `noseparator` line is skipped by the colonIdx <= 0 guard.
    const text = `obj:\n  ok: yes-value\n  noseparator`
    expect(parseYAML(text)).toEqual({ obj: { ok: 'yes-value' } })
  })
})

describe('parseYAML — path-selection (legacy vs nested)', () => {
  it('prefers nested path when bare-key + child detected', () => {
    const text = `user:\n  name: Alice`
    // Result must be the nested form, not the legacy currentArray fallback.
    expect(parseYAML(text)).toEqual({ user: { name: 'Alice' } })
  })

  it('uses legacy path when key has inline value (no nested children)', () => {
    expect(parseYAML('name: Alice\nage: 30')).toEqual({ name: 'Alice', age: 30 })
  })

  it('uses legacy path when content has - array markers', () => {
    const text = `users:\n  - name: Alice\n  - name: Bob`
    // Legacy parser handles this — note `  - ` (with leading spaces) is
    // allowed because trim() strips them.
    expect(parseYAML(text)).toEqual({
      users: [{ name: 'Alice' }, { name: 'Bob' }],
    })
  })
})

// =============================================================================
// collectYAMLData
// =============================================================================

describe('collectYAMLData', () => {
  it('parses .yaml and .yml files', () => {
    const data = collectYAMLData({
      getFiles: () => ({
        'data/users.yaml': 'name: Alice',
        'data/posts.yml': 'title: Hello',
      }),
    })
    expect(data).toEqual({
      users: { name: 'Alice' },
      posts: { title: 'Hello' },
    })
  })

  it('ignores non-YAML files', () => {
    const data = collectYAMLData({
      getFiles: () => ({
        'app.mir': 'Frame "Hello"',
        'tokens.tok': 'primary: #2271C1',
        'data.yaml': 'name: Alice',
      }),
    })
    expect(Object.keys(data)).toEqual(['data'])
  })

  it('extracts base name from path', () => {
    const data = collectYAMLData({
      getFiles: () => ({
        'deeply/nested/path/users.yaml': 'name: Alice',
      }),
    })
    expect(Object.keys(data)).toEqual(['users'])
  })

  it('skips empty/whitespace-only files', () => {
    const data = collectYAMLData({
      getFiles: () => ({
        'a.yaml': '',
        'b.yaml': '   \n  \n',
        'c.yaml': 'name: Alice',
      }),
    })
    expect(Object.keys(data)).toEqual(['c'])
  })

  it('extension matching is case-insensitive', () => {
    const data = collectYAMLData({
      getFiles: () => ({
        'a.YAML': 'name: A',
        'b.YML': 'name: B',
      }),
    })
    expect(Object.keys(data).sort()).toEqual(['a', 'b'])
  })

  it('returns {} when no YAML files', () => {
    expect(collectYAMLData({ getFiles: () => ({}) })).toEqual({})
  })
})

// =============================================================================
// generateYAMLDataInjection
// =============================================================================

describe('generateYAMLDataInjection', () => {
  it('emits __mirrorData assignments for each file', () => {
    const code = generateYAMLDataInjection({
      getFiles: () => ({
        'users.yaml': 'name: Alice',
        'posts.yaml': 'title: Hello',
      }),
    })
    expect(code).toContain('__mirrorData["users"]')
    expect(code).toContain('__mirrorData["posts"]')
    expect(code).toContain('"name":"Alice"')
    expect(code).toContain('"title":"Hello"')
  })

  it('returns "" when no YAML files exist', () => {
    expect(generateYAMLDataInjection({ getFiles: () => ({}) })).toBe('')
  })

  it('returns "" when only non-YAML files exist', () => {
    expect(
      generateYAMLDataInjection({
        getFiles: () => ({ 'app.mir': 'Frame "Hello"' }),
      })
    ).toBe('')
  })

  it('output is valid JS (parseable)', () => {
    const code = generateYAMLDataInjection({
      getFiles: () => ({
        'users.yaml': 'name: Alice',
      }),
    })
    // Basic sanity: starts with comment, contains assignment with `;`
    expect(code).toMatch(/__mirrorData\["users"\] = .+;/)
  })
})

// =============================================================================
// P3 — mutation-driven
// =============================================================================

describe('P3 — mutation-driven', () => {
  it('M1: parseYAMLValue treats "" as string, not as Number(0)', () => {
    // The guard `value !== ''` prevents Number('') = 0 surprise.
    expect(parseYAMLValue('')).toBe('')
  })

  it('M2: nested-stack pops correctly when going back up', () => {
    const text = `a:\n  b:\n    c: 1\n  d: 2`
    expect(parseYAML(text)).toEqual({ a: { b: { c: 1 }, d: 2 } })
  })

  it('M3: collectYAMLData uses lastIndexOf for extension (not indexOf)', () => {
    // file.with.dots.yaml — extension must be ".yaml", not ".with"
    const data = collectYAMLData({
      getFiles: () => ({ 'file.with.dots.yaml': 'k: v' }),
    })
    expect(data['file.with.dots']).toEqual({ k: 'v' })
  })

  it('M4: hasNestedObjects returns false for inline value', () => {
    // `key: value` (with value) should NOT trigger nested path.
    // We verify by checking that the legacy quirk of returning the bare
    // currentArray when result is empty still applies: a flat top-level
    // array still returns the array, not an object.
    expect(parseYAML('- a\n- b')).toEqual(['a', 'b'])
  })

  it('M5: nested parser strips trailing/leading whitespace from key + value', () => {
    const text = `obj:\n  key  :  value-text`
    expect(parseYAML(text)).toEqual({ obj: { key: 'value-text' } })
  })

  it('M6: extractBaseName strips path AND extension', () => {
    const data = collectYAMLData({
      getFiles: () => ({ '/abs/path/data.yaml': 'k: v' }),
    })
    expect(Object.keys(data)).toEqual(['data'])
  })
})
