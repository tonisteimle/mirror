/**
 * Aggressive Tests: CRUD Actions
 *
 * Comprehensive edge case testing for CRUD functionality:
 * - Collection operations
 * - Selection management
 * - Schema registry
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  $add,
  $remove,
  $update,
  $save,
  $select,
  $selectNext,
  $selectPrev,
  $clear,
  $getCollection,
  type CollectionLike,
} from '../../compiler/runtime/crud-actions'
import { schemaRegistry } from '../../compiler/runtime/schema-registry'

// Mock window.__collections
const mockCollections: Record<string, CollectionLike> = {}

beforeEach(() => {
  Object.keys(mockCollections).forEach(key => delete mockCollections[key])
  schemaRegistry.clear()
  ;(global as unknown as { window: { __collections: typeof mockCollections } }).window = {
    __collections: mockCollections,
  }
})

function createCollection(items: Array<Record<string, unknown>> = []): CollectionLike {
  const subscribers = new Set<() => void>()
  let current: Record<string, unknown> | null = null

  const collection: CollectionLike = {
    items: [...items],
    get current() { return current },
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

  return collection
}

describe('$getCollection: Aggressive Tests', () => {
  it('returns existing collection', () => {
    mockCollections['tasks'] = createCollection([{ id: '1', title: 'Task 1' }])

    const coll = $getCollection('tasks')

    expect(coll).toBeDefined()
    expect(coll?.items).toHaveLength(1)
  })

  it('handles $ prefix', () => {
    mockCollections['tasks'] = createCollection()

    const coll = $getCollection('$tasks')

    expect(coll).toBeDefined()
  })

  it('returns undefined for nonexistent', () => {
    const coll = $getCollection('nonexistent')

    expect(coll).toBeUndefined()
  })

  it('returns undefined for empty string', () => {
    const coll = $getCollection('')

    expect(coll).toBeUndefined()
  })
})

describe('$add: Aggressive Tests', () => {
  beforeEach(() => {
    mockCollections['items'] = createCollection()
  })

  it('adds item to collection', () => {
    const item = $add('items', { name: 'Test' })

    expect(item).toBeDefined()
    expect(item.name).toBe('Test')
    expect(mockCollections['items'].items).toHaveLength(1)
  })

  it('generates id if not provided', () => {
    const item = $add('items', { name: 'Test' })

    expect(item.id).toBeDefined()
    expect(typeof item.id).toBe('string')
  })

  it('preserves provided id', () => {
    const item = $add('items', { id: 'custom-id', name: 'Test' })

    expect(item.id).toBe('custom-id')
  })

  it('returns null for nonexistent collection', () => {
    const item = $add('nonexistent', { name: 'Test' })

    expect(item).toBeNull()
  })

  it('handles $ prefix', () => {
    const item = $add('$items', { name: 'Test' })

    expect(item).toBeDefined()
    expect(mockCollections['items'].items).toHaveLength(1)
  })

  it('adds multiple items', () => {
    $add('items', { name: 'One' })
    $add('items', { name: 'Two' })
    $add('items', { name: 'Three' })

    expect(mockCollections['items'].items).toHaveLength(3)
  })

  it('notifies subscribers', () => {
    const callback = vi.fn()
    mockCollections['items'].subscribe(callback)

    $add('items', { name: 'Test' })

    expect(callback).toHaveBeenCalled()
  })
})

describe('$remove: Aggressive Tests', () => {
  let item1: Record<string, unknown>
  let item2: Record<string, unknown>

  beforeEach(() => {
    item1 = { id: '1', name: 'Item 1' }
    item2 = { id: '2', name: 'Item 2' }
    mockCollections['items'] = createCollection([item1, item2])
  })

  it('removes item from collection', () => {
    $remove('items', item1)

    expect(mockCollections['items'].items).toHaveLength(1)
    expect(mockCollections['items'].items[0]).toBe(item2)
  })

  it('clears current if removed item is current', () => {
    mockCollections['items'].current = item1

    $remove('items', item1)

    expect(mockCollections['items'].current).toBeNull()
  })

  it('preserves current if different item removed', () => {
    mockCollections['items'].current = item2

    $remove('items', item1)

    expect(mockCollections['items'].current).toBe(item2)
  })

  it('handles $ prefix', () => {
    $remove('$items', item1)

    expect(mockCollections['items'].items).toHaveLength(1)
  })

  it('does nothing for nonexistent collection', () => {
    // Should not throw
    $remove('nonexistent', item1)
  })

  it('does nothing for nonexistent item', () => {
    const fakeItem = { id: 'fake', name: 'Fake' }

    $remove('items', fakeItem)

    expect(mockCollections['items'].items).toHaveLength(2)
  })

  it('notifies subscribers', () => {
    const callback = vi.fn()
    mockCollections['items'].subscribe(callback)

    $remove('items', item1)

    expect(callback).toHaveBeenCalled()
  })
})

describe('$update: Aggressive Tests', () => {
  let item: Record<string, unknown>

  beforeEach(() => {
    item = { id: '1', name: 'Original', count: 0 }
    mockCollections['items'] = createCollection([item])
  })

  it('updates item properties', () => {
    $update('items', item, { name: 'Updated' })

    expect(item.name).toBe('Updated')
  })

  it('updates multiple properties', () => {
    $update('items', item, { name: 'Updated', count: 10 })

    expect(item.name).toBe('Updated')
    expect(item.count).toBe(10)
  })

  it('adds new properties', () => {
    $update('items', item, { newProp: 'value' })

    expect((item as any).newProp).toBe('value')
  })

  it('preserves unchanged properties', () => {
    $update('items', item, { name: 'Updated' })

    expect(item.id).toBe('1')
    expect(item.count).toBe(0)
  })

  it('handles $ prefix', () => {
    $update('$items', item, { name: 'Updated' })

    expect(item.name).toBe('Updated')
  })

  it('does nothing for nonexistent collection', () => {
    const original = { ...item }

    $update('nonexistent', item, { name: 'Updated' })

    expect(item.name).toBe(original.name)
  })

  it('notifies subscribers', () => {
    const callback = vi.fn()
    mockCollections['items'].subscribe(callback)

    $update('items', item, { name: 'Updated' })

    expect(callback).toHaveBeenCalled()
  })
})

describe('$save: Aggressive Tests', () => {
  beforeEach(() => {
    mockCollections['items'] = createCollection([
      { id: '1', name: 'Existing' },
    ])
  })

  it('returns false when no current item', () => {
    mockCollections['items'].current = null

    const result = $save('items', { name: 'New Item' })

    expect(result).toBe(false)
    expect(mockCollections['items'].items).toHaveLength(1) // No new item added
  })

  it('updates existing item (with current)', () => {
    const existing = mockCollections['items'].items[0]
    mockCollections['items'].current = existing

    const result = $save('items', { name: 'Updated Name' })

    expect(result).toBe(true)
    expect(existing.name).toBe('Updated Name')
    expect(mockCollections['items'].items).toHaveLength(1)
  })

  it('handles $ prefix', () => {
    const existing = mockCollections['items'].items[0]
    mockCollections['items'].current = existing

    const result = $save('$items', { name: 'Test' })

    expect(result).toBe(true)
  })

  it('returns false for nonexistent collection', () => {
    const result = $save('nonexistent', { name: 'Test' })

    expect(result).toBe(false)
  })
})

describe('$select: Aggressive Tests', () => {
  let item1: Record<string, unknown>
  let item2: Record<string, unknown>

  beforeEach(() => {
    item1 = { id: '1', name: 'Item 1' }
    item2 = { id: '2', name: 'Item 2' }
    mockCollections['items'] = createCollection([item1, item2])
  })

  it('selects item', () => {
    $select('items', item1)

    expect(mockCollections['items'].current).toBe(item1)
  })

  it('changes selection', () => {
    $select('items', item1)
    $select('items', item2)

    expect(mockCollections['items'].current).toBe(item2)
  })

  it('clears selection with null', () => {
    $select('items', item1)
    $select('items', null)

    expect(mockCollections['items'].current).toBeNull()
  })

  it('handles $ prefix', () => {
    $select('$items', item1)

    expect(mockCollections['items'].current).toBe(item1)
  })

  it('does nothing for nonexistent collection', () => {
    // Should not throw
    $select('nonexistent', item1)
  })

  it('notifies subscribers', () => {
    const callback = vi.fn()
    mockCollections['items'].subscribe(callback)

    $select('items', item1)

    expect(callback).toHaveBeenCalled()
  })
})

describe('$selectNext: Aggressive Tests', () => {
  let items: Array<Record<string, unknown>>

  beforeEach(() => {
    items = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
      { id: '3', name: 'Item 3' },
    ]
    mockCollections['items'] = createCollection(items)
  })

  it('selects first item when no current', () => {
    $selectNext('items')

    expect(mockCollections['items'].current).toBe(items[0])
  })

  it('selects next item', () => {
    mockCollections['items'].current = items[0]

    $selectNext('items')

    expect(mockCollections['items'].current).toBe(items[1])
  })

  it('wraps to first from last', () => {
    mockCollections['items'].current = items[2]

    $selectNext('items')

    expect(mockCollections['items'].current).toBe(items[0])
  })

  it('handles single item', () => {
    mockCollections['single'] = createCollection([{ id: '1' }])
    mockCollections['single'].current = mockCollections['single'].items[0]

    $selectNext('single')

    // Should stay on same item (wraps)
    expect(mockCollections['single'].current).toBe(mockCollections['single'].items[0])
  })

  it('handles empty collection', () => {
    mockCollections['empty'] = createCollection([])

    $selectNext('empty')

    expect(mockCollections['empty'].current).toBeNull()
  })

  it('handles $ prefix', () => {
    $selectNext('$items')

    expect(mockCollections['items'].current).toBe(items[0])
  })
})

describe('$selectPrev: Aggressive Tests', () => {
  let items: Array<Record<string, unknown>>

  beforeEach(() => {
    items = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
      { id: '3', name: 'Item 3' },
    ]
    mockCollections['items'] = createCollection(items)
  })

  it('selects last item when no current', () => {
    $selectPrev('items')

    expect(mockCollections['items'].current).toBe(items[2])
  })

  it('selects previous item', () => {
    mockCollections['items'].current = items[2]

    $selectPrev('items')

    expect(mockCollections['items'].current).toBe(items[1])
  })

  it('wraps to last from first', () => {
    mockCollections['items'].current = items[0]

    $selectPrev('items')

    expect(mockCollections['items'].current).toBe(items[2])
  })

  it('handles single item', () => {
    mockCollections['single'] = createCollection([{ id: '1' }])
    mockCollections['single'].current = mockCollections['single'].items[0]

    $selectPrev('single')

    expect(mockCollections['single'].current).toBe(mockCollections['single'].items[0])
  })

  it('handles empty collection', () => {
    mockCollections['empty'] = createCollection([])

    $selectPrev('empty')

    expect(mockCollections['empty'].current).toBeNull()
  })

  it('handles $ prefix', () => {
    mockCollections['items'].current = items[1]

    $selectPrev('$items')

    expect(mockCollections['items'].current).toBe(items[0])
  })
})

describe('$clear: Aggressive Tests', () => {
  beforeEach(() => {
    mockCollections['items'] = createCollection([
      { id: '1' },
      { id: '2' },
      { id: '3' },
    ])
    mockCollections['items'].current = mockCollections['items'].items[0]
  })

  it('removes all items', () => {
    $clear('items')

    expect(mockCollections['items'].items).toHaveLength(0)
  })

  it('clears current selection', () => {
    $clear('items')

    expect(mockCollections['items'].current).toBeNull()
  })

  it('handles $ prefix', () => {
    $clear('$items')

    expect(mockCollections['items'].items).toHaveLength(0)
  })

  it('does nothing for nonexistent collection', () => {
    // Should not throw
    $clear('nonexistent')
  })

  it('handles already empty collection', () => {
    mockCollections['empty'] = createCollection([])

    $clear('empty')

    expect(mockCollections['empty'].items).toHaveLength(0)
  })
})

describe('schemaRegistry: Aggressive Tests', () => {
  describe('Registration', () => {
    it('registers schema', () => {
      schemaRegistry.register('test', {
        fields: [{ name: 'x', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 }],
        line: 1,
        column: 1,
      })

      const schema = schemaRegistry.get('test')
      expect(schema).toBeDefined()
      expect(schema?.fields).toHaveLength(1)
    })

    it('overwrites existing schema', () => {
      schemaRegistry.register('test', {
        fields: [{ name: 'old', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 }],
        line: 1,
        column: 1,
      })

      schemaRegistry.register('test', {
        fields: [{ name: 'new', type: { kind: 'primitive', type: 'number' }, constraints: [], line: 1 }],
        line: 1,
        column: 1,
      })

      const schema = schemaRegistry.get('test')
      expect(schema?.fields[0].name).toBe('new')
    })
  })

  describe('Retrieval', () => {
    it('returns undefined for nonexistent', () => {
      const schema = schemaRegistry.get('nonexistent')
      expect(schema).toBeUndefined()
    })

    it('handles $ prefix', () => {
      schemaRegistry.register('test', {
        fields: [],
        line: 1,
        column: 1,
      })

      const schema = schemaRegistry.get('$test')
      expect(schema).toBeDefined()
    })
  })

  describe('Clear', () => {
    it('removes all schemas', () => {
      schemaRegistry.register('a', { fields: [], line: 1, column: 1 })
      schemaRegistry.register('b', { fields: [], line: 1, column: 1 })

      schemaRegistry.clear()

      expect(schemaRegistry.get('a')).toBeUndefined()
      expect(schemaRegistry.get('b')).toBeUndefined()
    })
  })

  describe('List', () => {
    it('returns all registered names', () => {
      schemaRegistry.register('alpha', { fields: [], line: 1, column: 1 })
      schemaRegistry.register('beta', { fields: [], line: 1, column: 1 })

      const names = schemaRegistry.list()

      expect(names).toContain('alpha')
      expect(names).toContain('beta')
    })

    it('returns empty array when none registered', () => {
      const names = schemaRegistry.list()
      expect(names).toEqual([])
    })
  })
})

describe('CRUD: Subscription Tests', () => {
  it('multiple subscribers are notified', () => {
    mockCollections['items'] = createCollection()

    const callback1 = vi.fn()
    const callback2 = vi.fn()

    mockCollections['items'].subscribe(callback1)
    mockCollections['items'].subscribe(callback2)

    $add('items', { name: 'Test' })

    expect(callback1).toHaveBeenCalled()
    expect(callback2).toHaveBeenCalled()
  })

  it('unsubscribe works', () => {
    mockCollections['items'] = createCollection()

    const callback = vi.fn()
    const unsubscribe = mockCollections['items'].subscribe(callback)

    unsubscribe()
    $add('items', { name: 'Test' })

    expect(callback).not.toHaveBeenCalled()
  })

  it('partial unsubscribe', () => {
    mockCollections['items'] = createCollection()

    const callback1 = vi.fn()
    const callback2 = vi.fn()

    const unsub1 = mockCollections['items'].subscribe(callback1)
    mockCollections['items'].subscribe(callback2)

    unsub1()
    $add('items', { name: 'Test' })

    expect(callback1).not.toHaveBeenCalled()
    expect(callback2).toHaveBeenCalled()
  })
})

describe('CRUD: Integration Tests', () => {
  it('complete CRUD workflow', () => {
    mockCollections['todos'] = createCollection()

    // Create
    const item1 = $add('todos', { title: 'Task 1', done: false })
    const item2 = $add('todos', { title: 'Task 2', done: false })
    expect(mockCollections['todos'].items).toHaveLength(2)

    // Select
    $select('todos', item1)
    expect(mockCollections['todos'].current).toBe(item1)

    // Update
    $update('todos', item1, { done: true })
    expect(item1.done).toBe(true)

    // Navigate
    $selectNext('todos')
    expect(mockCollections['todos'].current).toBe(item2)

    // Delete
    $remove('todos', item1)
    expect(mockCollections['todos'].items).toHaveLength(1)

    // Clear
    $clear('todos')
    expect(mockCollections['todos'].items).toHaveLength(0)
    expect(mockCollections['todos'].current).toBeNull()
  })

  it('selection during modifications', () => {
    const item1 = { id: '1', name: 'Item 1' }
    const item2 = { id: '2', name: 'Item 2' }
    const item3 = { id: '3', name: 'Item 3' }

    mockCollections['items'] = createCollection([item1, item2, item3])
    mockCollections['items'].current = item2

    // Remove selected item
    $remove('items', item2)
    expect(mockCollections['items'].current).toBeNull()

    // Select new item
    $select('items', item1)
    expect(mockCollections['items'].current).toBe(item1)

    // Navigate
    $selectNext('items')
    expect(mockCollections['items'].current).toBe(item3)

    $selectPrev('items')
    expect(mockCollections['items'].current).toBe(item1)
  })
})

describe('CRUD: Stress Tests', () => {
  it('handles 1000 items', () => {
    mockCollections['large'] = createCollection()

    for (let i = 0; i < 1000; i++) {
      $add('large', { index: i })
    }

    expect(mockCollections['large'].items).toHaveLength(1000)

    // Navigate through all
    $select('large', mockCollections['large'].items[0])
    for (let i = 0; i < 999; i++) {
      $selectNext('large')
    }
    expect(mockCollections['large'].current).toBe(mockCollections['large'].items[999])
  })

  it('handles rapid selection changes', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: String(i) }))
    mockCollections['rapid'] = createCollection(items)

    for (let i = 0; i < 100; i++) {
      $select('rapid', items[i])
    }

    expect(mockCollections['rapid'].current).toBe(items[99])
  })

  it('handles concurrent modifications', () => {
    mockCollections['concurrent'] = createCollection()

    // Simulate concurrent adds
    const promises = Array.from({ length: 50 }, (_, i) =>
      Promise.resolve($add('concurrent', { index: i }))
    )

    Promise.all(promises).then(() => {
      expect(mockCollections['concurrent'].items).toHaveLength(50)
    })
  })
})
