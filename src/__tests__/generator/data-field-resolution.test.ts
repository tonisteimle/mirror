/**
 * Tests for data field resolution in data binding contexts.
 *
 * Tests the automatic resolution of field names within `data TypeName` contexts:
 * - Label title              -> shows "Einkaufen"
 * - Checkbox checked done    -> checked = false
 * - Tag category.name        -> shows "Arbeit"
 */

import { describe, it, expect } from 'vitest'
import {
  resolveNodeFields,
  isFieldReference,
  resolveFieldPath
} from '../../generator/data-utils'
import type { ASTNode, DataSchema, DataRecord } from '../../parser/types'

// =============================================================================
// TEST FIXTURES
// =============================================================================

const createNode = (name: string, overrides: Partial<ASTNode> = {}): ASTNode => ({
  type: 'component',
  name,
  id: `test-${name}`,
  properties: {},
  children: [],
  ...overrides
})

const taskSchema: DataSchema = {
  typeName: 'Task',
  fields: [
    { name: 'title', type: 'text' },
    { name: 'done', type: 'boolean' },
    { name: 'priority', type: 'number' },
    { name: 'category', type: 'Category' } // Relation
  ]
}

const categorySchema: DataSchema = {
  typeName: 'Category',
  fields: [
    { name: 'name', type: 'text' },
    { name: 'color', type: 'text' }
  ]
}

const schemas: DataSchema[] = [taskSchema, categorySchema]

const categoryRecords: DataRecord[] = [
  { _id: 'cat-1', name: 'Arbeit', color: '#FF0000' },
  { _id: 'cat-2', name: 'Privat', color: '#00FF00' }
]

const taskRecords: DataRecord[] = [
  { _id: 'task-1', title: 'Einkaufen', done: false, priority: 2, category: 'cat-1' },
  { _id: 'task-2', title: 'Meeting', done: true, priority: 1, category: 'cat-2' }
]

const allRecords = new Map<string, DataRecord[]>([
  ['tasks', taskRecords],
  ['categories', categoryRecords]
])

// =============================================================================
// isFieldReference TESTS
// =============================================================================

describe('isFieldReference', () => {
  const fieldNames = new Set(['title', 'done', 'priority', 'category'])

  it('returns true for direct field name', () => {
    expect(isFieldReference('title', fieldNames)).toBe(true)
    expect(isFieldReference('done', fieldNames)).toBe(true)
  })

  it('returns false for non-field strings', () => {
    expect(isFieldReference('random', fieldNames)).toBe(false)
    expect(isFieldReference('Hello World', fieldNames)).toBe(false)
  })

  it('returns true for dotted paths starting with a field', () => {
    expect(isFieldReference('category.name', fieldNames)).toBe(true)
    expect(isFieldReference('category.color', fieldNames)).toBe(true)
  })

  it('returns false for dotted paths not starting with a field', () => {
    expect(isFieldReference('other.name', fieldNames)).toBe(false)
  })

  it('returns false for non-string values', () => {
    expect(isFieldReference(42, fieldNames)).toBe(false)
    expect(isFieldReference(true, fieldNames)).toBe(false)
    expect(isFieldReference(null, fieldNames)).toBe(false)
    expect(isFieldReference(undefined, fieldNames)).toBe(false)
  })
})

// =============================================================================
// resolveFieldPath TESTS
// =============================================================================

describe('resolveFieldPath', () => {
  const record = taskRecords[0] // { title: 'Einkaufen', done: false, priority: 2, category: 'cat-1' }

  it('resolves simple field paths', () => {
    expect(resolveFieldPath('title', record, 'Task', schemas, allRecords)).toBe('Einkaufen')
    expect(resolveFieldPath('done', record, 'Task', schemas, allRecords)).toBe(false)
    expect(resolveFieldPath('priority', record, 'Task', schemas, allRecords)).toBe(2)
  })

  it('resolves relation field paths', () => {
    expect(resolveFieldPath('category.name', record, 'Task', schemas, allRecords)).toBe('Arbeit')
    expect(resolveFieldPath('category.color', record, 'Task', schemas, allRecords)).toBe('#FF0000')
  })

  it('returns undefined for invalid paths', () => {
    expect(resolveFieldPath('nonexistent', record, 'Task', schemas, allRecords)).toBeUndefined()
    expect(resolveFieldPath('category.invalid', record, 'Task', schemas, allRecords)).toBeUndefined()
  })

  it('returns undefined when record is null', () => {
    expect(resolveFieldPath('title', null, 'Task', schemas, allRecords)).toBeUndefined()
  })

  it('returns undefined when typeName is null', () => {
    expect(resolveFieldPath('title', record, null, schemas, allRecords)).toBeUndefined()
  })
})

// =============================================================================
// resolveNodeFields TESTS
// =============================================================================

describe('resolveNodeFields', () => {
  const record = taskRecords[0]

  describe('content resolution', () => {
    it('resolves field name in content', () => {
      const node = createNode('Label', { content: 'title' })
      const resolved = resolveNodeFields(node, record, 'Task', schemas, allRecords)

      expect(resolved.content).toBe('Einkaufen')
    })

    it('resolves dotted path in content', () => {
      const node = createNode('Tag', { content: 'category.name' })
      const resolved = resolveNodeFields(node, record, 'Task', schemas, allRecords)

      expect(resolved.content).toBe('Arbeit')
    })

    it('leaves non-field content unchanged', () => {
      const node = createNode('Label', { content: 'Hello World' })
      const resolved = resolveNodeFields(node, record, 'Task', schemas, allRecords)

      expect(resolved.content).toBe('Hello World')
    })
  })

  describe('property resolution', () => {
    it('resolves field name in property value', () => {
      const node = createNode('Text', {
        properties: { text: 'title' }
      })
      const resolved = resolveNodeFields(node, record, 'Task', schemas, allRecords)

      expect(resolved.properties.text).toBe('Einkaufen')
    })

    it('resolves boolean field in property value', () => {
      const node = createNode('Checkbox', {
        properties: { checked: 'done' }
      })
      const resolved = resolveNodeFields(node, record, 'Task', schemas, allRecords)

      expect(resolved.properties.checked).toBe(false)
    })

    it('resolves _fieldBinding objects', () => {
      const node = createNode('Checkbox', {
        properties: { checked: { _fieldBinding: 'done' } }
      })
      const resolved = resolveNodeFields(node, record, 'Task', schemas, allRecords)

      expect(resolved.properties.checked).toBe(false)
    })

    it('leaves non-field properties unchanged', () => {
      const node = createNode('Box', {
        properties: { bg: '#FF0000', pad: 16 }
      })
      const resolved = resolveNodeFields(node, record, 'Task', schemas, allRecords)

      expect(resolved.properties.bg).toBe('#FF0000')
      expect(resolved.properties.pad).toBe(16)
    })
  })

  describe('_text children resolution', () => {
    it('resolves field name in _text child content', () => {
      const textChild = createNode('_text', { content: 'title' })
      const node = createNode('Label', { children: [textChild] })

      const resolved = resolveNodeFields(node, record, 'Task', schemas, allRecords)

      expect(resolved.children[0].content).toBe('Einkaufen')
    })

    it('leaves non-field _text children unchanged', () => {
      const textChild = createNode('_text', { content: 'Hello World' })
      const node = createNode('Label', { children: [textChild] })

      const resolved = resolveNodeFields(node, record, 'Task', schemas, allRecords)

      expect(resolved.children[0].content).toBe('Hello World')
    })
  })

  describe('edge cases', () => {
    it('returns original node when record is null', () => {
      const node = createNode('Label', { content: 'title' })
      const resolved = resolveNodeFields(node, null, 'Task', schemas, allRecords)

      expect(resolved).toBe(node)
    })

    it('returns original node when typeName is null', () => {
      const node = createNode('Label', { content: 'title' })
      const resolved = resolveNodeFields(node, record, null, schemas, allRecords)

      expect(resolved).toBe(node)
    })

    it('returns original node when schema not found', () => {
      const node = createNode('Label', { content: 'title' })
      const resolved = resolveNodeFields(node, record, 'Unknown', schemas, allRecords)

      expect(resolved).toBe(node)
    })

    it('does not modify original node', () => {
      const node = createNode('Label', { content: 'title' })
      const resolved = resolveNodeFields(node, record, 'Task', schemas, allRecords)

      expect(node.content).toBe('title')
      expect(resolved.content).toBe('Einkaufen')
      expect(resolved).not.toBe(node)
    })
  })
})
