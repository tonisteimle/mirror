/**
 * Collection Runtime
 *
 * Generic collection wrapper with CRUD operations and reactivity.
 * Used for managing data collections with a `current` selection.
 */

export type CollectionItem = { id: string; [key: string]: unknown }

export type CollectionSubscriber = () => void

export class Collection<T extends CollectionItem = CollectionItem> {
  private _items: T[]
  private _current: T | null = null
  private subscribers: Set<CollectionSubscriber> = new Set()

  constructor(initialItems: T[] = []) {
    this._items = [...initialItems]
  }

  /**
   * Get all items in the collection
   */
  get items(): T[] {
    return this._items
  }

  /**
   * Get the currently selected item
   */
  get current(): T | null {
    return this._current
  }

  /**
   * Set the currently selected item
   * Notifies subscribers if the value changes
   */
  set current(item: T | null) {
    if (this._current === item) return
    this._current = item
    this.notifySubscribers()
  }

  /**
   * Add a new item to the collection
   * Generates an ID if not provided
   */
  add(item: Partial<T>): T {
    const newItem = {
      id: item.id || this.generateId(),
      ...item,
    } as T
    this._items.push(newItem)
    this.notifySubscribers()
    return newItem
  }

  /**
   * Update an existing item with new values
   */
  update(item: T, changes: Partial<T>): void {
    const index = this._items.indexOf(item)
    if (index === -1) return

    Object.assign(item, changes)
    this.notifySubscribers()
  }

  /**
   * Remove an item from the collection
   * Clears current if the removed item was selected
   */
  remove(item: T): void {
    const index = this._items.indexOf(item)
    if (index === -1) return

    this._items.splice(index, 1)

    // Clear current if removed item was selected
    if (this._current === item) {
      this._current = null
    }

    this.notifySubscribers()
  }

  /**
   * Find an item by ID
   */
  findById(id: string): T | undefined {
    return this._items.find(item => item.id === id)
  }

  /**
   * Filter items by a predicate
   */
  filter(predicate: (item: T) => boolean): T[] {
    return this._items.filter(predicate)
  }

  /**
   * Subscribe to collection changes
   * Returns an unsubscribe function
   */
  subscribe(callback: CollectionSubscriber): () => void {
    this.subscribers.add(callback)
    return () => {
      this.subscribers.delete(callback)
    }
  }

  /**
   * Notify all subscribers of a change
   */
  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback())
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }

  /**
   * Clear all items from the collection
   */
  clear(): void {
    this._items = []
    this._current = null
    this.notifySubscribers()
  }

  /**
   * Get the number of items
   */
  get length(): number {
    return this._items.length
  }
}

/**
 * Collection Store
 *
 * Central store for all collections in the runtime.
 * Accessed via `__collections` in generated code.
 */
export class CollectionStore {
  private collections: Map<string, Collection> = new Map()

  /**
   * Get or create a collection by name
   */
  get<T extends CollectionItem>(name: string): Collection<T> {
    const normalizedName = name.startsWith('$') ? name.slice(1) : name

    if (!this.collections.has(normalizedName)) {
      this.collections.set(normalizedName, new Collection<T>())
    }

    return this.collections.get(normalizedName) as Collection<T>
  }

  /**
   * Register a collection with initial items
   */
  register<T extends CollectionItem>(name: string, items: T[]): Collection<T> {
    const normalizedName = name.startsWith('$') ? name.slice(1) : name
    const collection = new Collection<T>(items)
    this.collections.set(normalizedName, collection)
    return collection
  }

  /**
   * Check if a collection exists
   */
  has(name: string): boolean {
    const normalizedName = name.startsWith('$') ? name.slice(1) : name
    return this.collections.has(normalizedName)
  }

  /**
   * Get all collection names
   */
  names(): string[] {
    return Array.from(this.collections.keys())
  }

  /**
   * Clear all collections
   */
  clear(): void {
    this.collections.clear()
  }
}

// Global collection store singleton
export const collectionStore = new CollectionStore()
