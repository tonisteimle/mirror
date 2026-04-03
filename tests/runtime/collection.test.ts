/**
 * Collection Tests
 *
 * Tests for the Collection class with CRUD operations and reactivity.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Collection, CollectionStore, collectionStore } from '../../compiler/runtime/collection'

interface Task {
  id: string
  title: string
  done?: boolean
}

describe('Collection', () => {
  let collection: Collection<Task>

  beforeEach(() => {
    collection = new Collection<Task>([
      { id: '1', title: 'Task 1' },
      { id: '2', title: 'Task 2' },
    ])
  })

  describe('current', () => {
    it('starts as null', () => {
      expect(collection.current).toBeNull()
    })

    it('can be set', () => {
      collection.current = collection.items[0]
      expect(collection.current).toEqual({ id: '1', title: 'Task 1' })
    })

    it('notifies subscribers on change', () => {
      const callback = vi.fn()
      collection.subscribe(callback)

      collection.current = collection.items[0]

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('does not notify if same value', () => {
      collection.current = collection.items[0]

      const callback = vi.fn()
      collection.subscribe(callback)

      collection.current = collection.items[0]

      expect(callback).not.toHaveBeenCalled()
    })

    it('unsubscribe stops notifications', () => {
      const callback = vi.fn()
      const unsubscribe = collection.subscribe(callback)

      unsubscribe()
      collection.current = collection.items[0]

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('CRUD', () => {
    it('add creates new item', () => {
      const newItem = collection.add({ title: 'Task 3' })

      expect(collection.items).toHaveLength(3)
      expect(newItem.title).toBe('Task 3')
      expect(newItem.id).toBeDefined()
    })

    it('add uses provided id', () => {
      const newItem = collection.add({ id: 'custom-id', title: 'Task 3' })

      expect(newItem.id).toBe('custom-id')
    })

    it('add notifies subscribers', () => {
      const callback = vi.fn()
      collection.subscribe(callback)

      collection.add({ title: 'Task 3' })

      expect(callback).toHaveBeenCalled()
    })

    it('remove deletes item', () => {
      const item = collection.items[0]
      collection.remove(item)

      expect(collection.items).toHaveLength(1)
      expect(collection.items).not.toContain(item)
    })

    it('remove clears current if removed', () => {
      collection.current = collection.items[0]
      collection.remove(collection.items[0])

      expect(collection.current).toBeNull()
    })

    it('remove notifies subscribers', () => {
      const callback = vi.fn()
      collection.subscribe(callback)

      collection.remove(collection.items[0])

      expect(callback).toHaveBeenCalled()
    })

    it('update modifies item', () => {
      const item = collection.items[0]
      collection.update(item, { title: 'Updated' })

      expect(item.title).toBe('Updated')
    })

    it('update notifies subscribers', () => {
      const callback = vi.fn()
      collection.subscribe(callback)

      collection.update(collection.items[0], { title: 'Updated' })

      expect(callback).toHaveBeenCalled()
    })

    it('update does nothing for unknown item', () => {
      const unknownItem = { id: 'unknown', title: 'Unknown' }
      const callback = vi.fn()
      collection.subscribe(callback)

      collection.update(unknownItem, { title: 'Updated' })

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('findById', () => {
    it('finds item by id', () => {
      const item = collection.findById('1')
      expect(item?.title).toBe('Task 1')
    })

    it('returns undefined for unknown id', () => {
      const item = collection.findById('unknown')
      expect(item).toBeUndefined()
    })
  })

  describe('filter', () => {
    it('filters items by predicate', () => {
      collection.add({ title: 'Task 3', done: true })
      collection.update(collection.items[0], { done: false })
      collection.update(collection.items[1], { done: false })

      const doneItems = collection.filter(item => item.done === true)

      expect(doneItems).toHaveLength(1)
      expect(doneItems[0].title).toBe('Task 3')
    })
  })

  describe('clear', () => {
    it('removes all items', () => {
      collection.clear()
      expect(collection.items).toHaveLength(0)
    })

    it('clears current', () => {
      collection.current = collection.items[0]
      collection.clear()
      expect(collection.current).toBeNull()
    })

    it('notifies subscribers', () => {
      const callback = vi.fn()
      collection.subscribe(callback)

      collection.clear()

      expect(callback).toHaveBeenCalled()
    })
  })

  describe('length', () => {
    it('returns item count', () => {
      expect(collection.length).toBe(2)
    })
  })
})

describe('CollectionStore', () => {
  let store: CollectionStore

  beforeEach(() => {
    store = new CollectionStore()
  })

  describe('get', () => {
    it('creates collection on first access', () => {
      const tasks = store.get('tasks')
      expect(tasks).toBeInstanceOf(Collection)
      expect(tasks.length).toBe(0)
    })

    it('returns same collection on subsequent access', () => {
      const tasks1 = store.get('tasks')
      const tasks2 = store.get('tasks')
      expect(tasks1).toBe(tasks2)
    })

    it('handles $ prefix', () => {
      const tasks1 = store.get('$tasks')
      const tasks2 = store.get('tasks')
      expect(tasks1).toBe(tasks2)
    })
  })

  describe('register', () => {
    it('creates collection with initial items', () => {
      const tasks = store.register<Task>('tasks', [
        { id: '1', title: 'Task 1' },
        { id: '2', title: 'Task 2' },
      ])

      expect(tasks.length).toBe(2)
      expect(tasks.items[0].title).toBe('Task 1')
    })

    it('handles $ prefix', () => {
      store.register<Task>('$tasks', [{ id: '1', title: 'Task 1' }])

      const tasks = store.get('tasks')
      expect(tasks.length).toBe(1)
    })
  })

  describe('has', () => {
    it('returns true for registered collection', () => {
      store.register('tasks', [])
      expect(store.has('tasks')).toBe(true)
      expect(store.has('$tasks')).toBe(true)
    })

    it('returns false for unknown collection', () => {
      expect(store.has('unknown')).toBe(false)
    })
  })

  describe('names', () => {
    it('returns all collection names', () => {
      store.register('tasks', [])
      store.register('users', [])

      const names = store.names()
      expect(names).toContain('tasks')
      expect(names).toContain('users')
    })
  })

  describe('clear', () => {
    it('removes all collections', () => {
      store.register('tasks', [])
      store.register('users', [])

      store.clear()

      expect(store.has('tasks')).toBe(false)
      expect(store.has('users')).toBe(false)
    })
  })
})

describe('collectionStore singleton', () => {
  it('is a CollectionStore instance', () => {
    expect(collectionStore).toBeInstanceOf(CollectionStore)
  })
})
