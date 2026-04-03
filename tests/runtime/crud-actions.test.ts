/**
 * CRUD Actions Tests
 *
 * Tests for create(), save(), revert(), delete() functions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  create,
  save,
  deleteEntry,
  revert,
  getCollection,
  getDefaults,
  type CollectionLike,
} from '../../compiler/runtime/crud-actions'
import { SchemaRegistry, schemaRegistry } from '../../compiler/runtime/schema-registry'
import type { SchemaDefinition } from '../../compiler/parser/ast'

// Mock window.__collections
const mockCollections: Record<string, CollectionLike> = {}

// Setup global window mock
beforeEach(() => {
  // Clear collections
  Object.keys(mockCollections).forEach(key => delete mockCollections[key])

  // Clear schema registry
  schemaRegistry.clear()

  // Setup window mock
  ;(global as unknown as { window: { __collections: typeof mockCollections; confirm: typeof vi.fn } }).window = {
    __collections: mockCollections,
    confirm: vi.fn(() => true),
  }
})

// Helper to create a mock collection
function createMockCollection(items: Array<Record<string, unknown>> = []): CollectionLike {
  const subscribers = new Set<() => void>()
  let current: Record<string, unknown> | null = null

  return {
    items: [...items],
    get current() {
      return current
    },
    set current(item: Record<string, unknown> | null) {
      current = item
      subscribers.forEach(fn => fn())
    },
    add(item) {
      const newItem = { id: Date.now().toString(), ...item }
      this.items.push(newItem)
      subscribers.forEach(fn => fn())
      return newItem
    },
    remove(item) {
      const idx = this.items.indexOf(item)
      if (idx > -1) this.items.splice(idx, 1)
      if (current === item) current = null
      subscribers.forEach(fn => fn())
    },
    update(item, changes) {
      Object.assign(item, changes)
      subscribers.forEach(fn => fn())
    },
    subscribe(fn) {
      subscribers.add(fn)
      return () => subscribers.delete(fn)
    },
  }
}

// Helper to register schema
function registerSchema(registry: SchemaRegistry, name: string, fields: SchemaDefinition['fields']) {
  registry.register(name, { fields, line: 1, column: 1 })
}

describe('getCollection', () => {
  it('returns collection by name', () => {
    mockCollections['tasks'] = createMockCollection()
    expect(getCollection('tasks')).toBe(mockCollections['tasks'])
  })

  it('handles $ prefix', () => {
    mockCollections['tasks'] = createMockCollection()
    expect(getCollection('$tasks')).toBe(mockCollections['tasks'])
  })

  it('returns undefined for unknown collection', () => {
    expect(getCollection('unknown')).toBeUndefined()
  })
})

describe('getDefaults', () => {
  it('returns empty object for unknown collection', () => {
    expect(getDefaults('unknown')).toEqual({})
  })

  it('returns defaults for primitive fields', () => {
    registerSchema(schemaRegistry, 'tasks', [
      { name: 'title', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 },
      { name: 'count', type: { kind: 'primitive', type: 'number' }, constraints: [], line: 2 },
      { name: 'done', type: { kind: 'primitive', type: 'boolean' }, constraints: [], line: 3 },
    ])

    const defaults = getDefaults('tasks')
    expect(defaults.title).toBe('')
    expect(defaults.count).toBe(0)
    expect(defaults.done).toBe(false)
  })

  it('returns defaults for relation fields', () => {
    registerSchema(schemaRegistry, 'tasks', [
      { name: 'assignee', type: { kind: 'relation', target: '$users', isArray: false }, constraints: [], line: 1 },
      { name: 'watchers', type: { kind: 'relation', target: '$users', isArray: true }, constraints: [], line: 2 },
    ])

    const defaults = getDefaults('tasks')
    expect(defaults.assignee).toBeNull()
    expect(defaults.watchers).toEqual([])
  })
})

describe('create()', () => {
  beforeEach(() => {
    mockCollections['tasks'] = createMockCollection()
  })

  it('creates empty entry', () => {
    create('tasks')

    expect(mockCollections['tasks'].items).toHaveLength(1)
    expect(mockCollections['tasks'].current).toBe(mockCollections['tasks'].items[0])
  })

  it('creates entry with initial values', () => {
    create('tasks', { title: 'New Task' })

    expect(mockCollections['tasks'].current?.title).toBe('New Task')
  })

  it('handles $ prefix', () => {
    create('$tasks', { title: 'Task' })

    expect(mockCollections['tasks'].items).toHaveLength(1)
  })

  it('returns null for unknown collection', () => {
    const result = create('unknown')
    expect(result).toBeNull()
  })

  it('sets new entry as current', () => {
    const existing = { id: 'old', title: 'Old' }
    mockCollections['tasks'].items.push(existing)
    mockCollections['tasks'].current = existing

    create('tasks', { title: 'New' })

    expect(mockCollections['tasks'].current?.title).toBe('New')
    expect(mockCollections['tasks'].current).not.toBe(existing)
  })
})

describe('save()', () => {
  beforeEach(() => {
    mockCollections['tasks'] = createMockCollection([
      { id: '1', title: 'Original' },
    ])
    mockCollections['tasks'].current = mockCollections['tasks'].items[0]
  })

  it('saves pending changes', () => {
    const result = save('tasks', { title: 'Changed' })

    expect(result).toBe(true)
    expect(mockCollections['tasks'].items[0].title).toBe('Changed')
  })

  it('returns false for unknown collection', () => {
    const result = save('unknown', { title: 'Test' })
    expect(result).toBe(false)
  })

  it('returns false when no current entry', () => {
    mockCollections['tasks'].current = null

    const result = save('tasks', { title: 'Changed' })
    expect(result).toBe(false)
  })
})

describe('revert()', () => {
  it('exists as a function', () => {
    // revert() is primarily handled by UI layer
    expect(typeof revert).toBe('function')
    revert() // Should not throw
  })
})

describe('deleteEntry()', () => {
  beforeEach(() => {
    mockCollections['tasks'] = createMockCollection([
      { id: '1', title: 'Task 1' },
      { id: '2', title: 'Task 2' },
    ])
    mockCollections['tasks'].current = mockCollections['tasks'].items[0]
  })

  it('deletes current entry when no entry specified', () => {
    const result = deleteEntry('tasks')

    expect(result).toBe(true)
    expect(mockCollections['tasks'].items).toHaveLength(1)
    expect(mockCollections['tasks'].items[0].title).toBe('Task 2')
  })

  it('deletes specific entry', () => {
    const entryToDelete = mockCollections['tasks'].items[1]
    const result = deleteEntry('tasks', entryToDelete)

    expect(result).toBe(true)
    expect(mockCollections['tasks'].items).toHaveLength(1)
    expect(mockCollections['tasks'].items[0].title).toBe('Task 1')
  })

  it('clears current when deleted', () => {
    deleteEntry('tasks')

    expect(mockCollections['tasks'].current).toBeNull()
  })

  it('shows confirmation when requested', () => {
    const confirmSpy = vi.fn(() => true)
    ;(global as unknown as { window: { confirm: typeof confirmSpy } }).window.confirm = confirmSpy

    deleteEntry('tasks', undefined, 'Are you sure?')

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure?')
  })

  it('cancels when confirmation declined', () => {
    const confirmSpy = vi.fn(() => false)
    ;(global as unknown as { window: { confirm: typeof confirmSpy } }).window.confirm = confirmSpy

    const result = deleteEntry('tasks', undefined, 'Are you sure?')

    expect(result).toBe(false)
    expect(mockCollections['tasks'].items).toHaveLength(2)
  })

  it('returns false for unknown collection', () => {
    const result = deleteEntry('unknown')
    expect(result).toBe(false)
  })

  it('returns false when no entry to delete', () => {
    mockCollections['tasks'].current = null

    const result = deleteEntry('tasks')
    expect(result).toBe(false)
  })
})

describe('Cascade Delete', () => {
  beforeEach(() => {
    // Setup users collection
    mockCollections['users'] = createMockCollection([
      { id: 'u1', name: 'User 1' },
    ])

    // Setup tasks collection with reference to users
    mockCollections['tasks'] = createMockCollection([
      { id: 't1', title: 'Task 1', assignee: 'u1' },
      { id: 't2', title: 'Task 2', assignee: 'u1' },
    ])
  })

  it('nullifies references on delete (default)', () => {
    registerSchema(schemaRegistry, 'tasks', [
      { name: 'title', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 },
      { name: 'assignee', type: { kind: 'relation', target: '$users', isArray: false }, constraints: [], line: 2 },
    ])

    mockCollections['users'].current = mockCollections['users'].items[0]
    deleteEntry('users')

    expect(mockCollections['tasks'].items[0].assignee).toBeNull()
    expect(mockCollections['tasks'].items[1].assignee).toBeNull()
  })

  it('cascades delete when onDelete: cascade', () => {
    registerSchema(schemaRegistry, 'tasks', [
      { name: 'title', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 },
      {
        name: 'assignee',
        type: { kind: 'relation', target: '$users', isArray: false },
        constraints: [{ kind: 'onDelete', action: 'cascade' }],
        line: 2,
      },
    ])

    mockCollections['users'].current = mockCollections['users'].items[0]
    deleteEntry('users')

    expect(mockCollections['tasks'].items).toHaveLength(0)
  })

  it('throws on restrict when references exist', () => {
    registerSchema(schemaRegistry, 'tasks', [
      { name: 'title', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 },
      {
        name: 'assignee',
        type: { kind: 'relation', target: '$users', isArray: false },
        constraints: [{ kind: 'onDelete', action: 'restrict' }],
        line: 2,
      },
    ])

    mockCollections['users'].current = mockCollections['users'].items[0]

    expect(() => deleteEntry('users')).toThrow('Cannot delete: referenced by tasks.assignee')
  })
})
