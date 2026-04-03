/**
 * SchemaRegistry Tests
 *
 * Tests for the schema registry that manages collection schemas.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SchemaRegistry } from '../../compiler/runtime/schema-registry'
import type { SchemaDefinition } from '../../compiler/parser/ast'

describe('SchemaRegistry', () => {
  let registry: SchemaRegistry

  beforeEach(() => {
    registry = new SchemaRegistry()
  })

  describe('register and get', () => {
    it('registers and retrieves schema', () => {
      const schema: SchemaDefinition = {
        fields: [
          { name: 'title', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 }
        ],
        line: 1,
        column: 1,
      }
      registry.register('tasks', schema)
      expect(registry.get('tasks')).toEqual(schema)
    })

    it('handles $ prefix in collection name', () => {
      const schema: SchemaDefinition = {
        fields: [],
        line: 1,
        column: 1,
      }
      registry.register('$tasks', schema)
      expect(registry.get('tasks')).toEqual(schema)
      expect(registry.get('$tasks')).toEqual(schema)
    })

    it('returns undefined for unknown collection', () => {
      expect(registry.get('unknown')).toBeUndefined()
    })
  })

  describe('has', () => {
    it('returns true for registered collection', () => {
      const schema: SchemaDefinition = { fields: [], line: 1, column: 1 }
      registry.register('tasks', schema)
      expect(registry.has('tasks')).toBe(true)
      expect(registry.has('$tasks')).toBe(true)
    })

    it('returns false for unregistered collection', () => {
      expect(registry.has('tasks')).toBe(false)
    })
  })

  describe('getField', () => {
    it('returns field by name', () => {
      const schema: SchemaDefinition = {
        fields: [
          { name: 'title', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 },
          { name: 'done', type: { kind: 'primitive', type: 'boolean' }, constraints: [], line: 2 },
        ],
        line: 1,
        column: 1,
      }
      registry.register('tasks', schema)

      const field = registry.getField('tasks', 'title')
      expect(field?.name).toBe('title')
      expect(field?.type).toEqual({ kind: 'primitive', type: 'string' })
    })

    it('returns undefined for unknown field', () => {
      const schema: SchemaDefinition = { fields: [], line: 1, column: 1 }
      registry.register('tasks', schema)
      expect(registry.getField('tasks', 'unknown')).toBeUndefined()
    })
  })

  describe('getFieldType', () => {
    it('returns correct type for primitive', () => {
      const schema: SchemaDefinition = {
        fields: [
          { name: 'title', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 },
          { name: 'count', type: { kind: 'primitive', type: 'number' }, constraints: [], line: 2 },
        ],
        line: 1,
        column: 1,
      }
      registry.register('tasks', schema)

      expect(registry.getFieldType('tasks', 'title')).toMatchObject({ kind: 'primitive', type: 'string' })
      expect(registry.getFieldType('tasks', 'count')).toMatchObject({ kind: 'primitive', type: 'number' })
    })

    it('returns correct type for relation', () => {
      const schema: SchemaDefinition = {
        fields: [
          { name: 'assignee', type: { kind: 'relation', target: '$users', isArray: false }, constraints: [], line: 1 },
        ],
        line: 1,
        column: 1,
      }
      registry.register('tasks', schema)

      expect(registry.getFieldType('tasks', 'assignee')).toMatchObject({ kind: 'relation', target: '$users' })
    })
  })

  describe('getRelationTarget', () => {
    it('returns target collection for relation', () => {
      const schema: SchemaDefinition = {
        fields: [
          { name: 'assignee', type: { kind: 'relation', target: '$users', isArray: false }, constraints: [], line: 1 },
        ],
        line: 1,
        column: 1,
      }
      registry.register('tasks', schema)

      expect(registry.getRelationTarget('tasks', 'assignee')).toBe('$users')
    })

    it('returns undefined for primitive field', () => {
      const schema: SchemaDefinition = {
        fields: [
          { name: 'title', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 },
        ],
        line: 1,
        column: 1,
      }
      registry.register('tasks', schema)

      expect(registry.getRelationTarget('tasks', 'title')).toBeUndefined()
    })
  })

  describe('isRelation', () => {
    it('returns true for relation field', () => {
      const schema: SchemaDefinition = {
        fields: [
          { name: 'assignee', type: { kind: 'relation', target: '$users', isArray: false }, constraints: [], line: 1 },
        ],
        line: 1,
        column: 1,
      }
      registry.register('tasks', schema)

      expect(registry.isRelation('tasks', 'assignee')).toBe(true)
    })

    it('returns false for primitive field', () => {
      const schema: SchemaDefinition = {
        fields: [
          { name: 'title', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 },
        ],
        line: 1,
        column: 1,
      }
      registry.register('tasks', schema)

      expect(registry.isRelation('tasks', 'title')).toBe(false)
    })
  })

  describe('isArrayRelation', () => {
    it('returns true for array relation (N:N)', () => {
      const schema: SchemaDefinition = {
        fields: [
          { name: 'watchers', type: { kind: 'relation', target: '$users', isArray: true }, constraints: [], line: 1 },
        ],
        line: 1,
        column: 1,
      }
      registry.register('tasks', schema)

      expect(registry.isArrayRelation('tasks', 'watchers')).toBe(true)
    })

    it('returns false for single relation (N:1)', () => {
      const schema: SchemaDefinition = {
        fields: [
          { name: 'assignee', type: { kind: 'relation', target: '$users', isArray: false }, constraints: [], line: 1 },
        ],
        line: 1,
        column: 1,
      }
      registry.register('tasks', schema)

      expect(registry.isArrayRelation('tasks', 'assignee')).toBe(false)
    })
  })

  describe('isRequired', () => {
    it('returns true for required field', () => {
      const schema: SchemaDefinition = {
        fields: [
          { name: 'title', type: { kind: 'primitive', type: 'string' }, constraints: [{ kind: 'required' }], line: 1 },
        ],
        line: 1,
        column: 1,
      }
      registry.register('tasks', schema)

      expect(registry.isRequired('tasks', 'title')).toBe(true)
    })

    it('returns false for optional field', () => {
      const schema: SchemaDefinition = {
        fields: [
          { name: 'description', type: { kind: 'primitive', type: 'string' }, constraints: [], line: 1 },
        ],
        line: 1,
        column: 1,
      }
      registry.register('tasks', schema)

      expect(registry.isRequired('tasks', 'description')).toBe(false)
    })
  })

  describe('getMaxConstraint', () => {
    it('returns max value for constrained field', () => {
      const schema: SchemaDefinition = {
        fields: [
          { name: 'watchers', type: { kind: 'relation', target: '$users', isArray: true }, constraints: [{ kind: 'max', value: 10 }], line: 1 },
        ],
        line: 1,
        column: 1,
      }
      registry.register('tasks', schema)

      expect(registry.getMaxConstraint('tasks', 'watchers')).toBe(10)
    })

    it('returns undefined for field without max constraint', () => {
      const schema: SchemaDefinition = {
        fields: [
          { name: 'watchers', type: { kind: 'relation', target: '$users', isArray: true }, constraints: [], line: 1 },
        ],
        line: 1,
        column: 1,
      }
      registry.register('tasks', schema)

      expect(registry.getMaxConstraint('tasks', 'watchers')).toBeUndefined()
    })
  })

  describe('getOnDeleteAction', () => {
    it('returns cascade action', () => {
      const schema: SchemaDefinition = {
        fields: [
          { name: 'project', type: { kind: 'relation', target: '$projects', isArray: false }, constraints: [{ kind: 'onDelete', action: 'cascade' }], line: 1 },
        ],
        line: 1,
        column: 1,
      }
      registry.register('tasks', schema)

      expect(registry.getOnDeleteAction('tasks', 'project')).toBe('cascade')
    })

    it('returns nullify action', () => {
      const schema: SchemaDefinition = {
        fields: [
          { name: 'assignee', type: { kind: 'relation', target: '$users', isArray: false }, constraints: [{ kind: 'onDelete', action: 'nullify' }], line: 1 },
        ],
        line: 1,
        column: 1,
      }
      registry.register('tasks', schema)

      expect(registry.getOnDeleteAction('tasks', 'assignee')).toBe('nullify')
    })

    it('returns restrict action', () => {
      const schema: SchemaDefinition = {
        fields: [
          { name: 'owner', type: { kind: 'relation', target: '$users', isArray: false }, constraints: [{ kind: 'onDelete', action: 'restrict' }], line: 1 },
        ],
        line: 1,
        column: 1,
      }
      registry.register('tasks', schema)

      expect(registry.getOnDeleteAction('tasks', 'owner')).toBe('restrict')
    })

    it('returns undefined when no onDelete constraint', () => {
      const schema: SchemaDefinition = {
        fields: [
          { name: 'assignee', type: { kind: 'relation', target: '$users', isArray: false }, constraints: [], line: 1 },
        ],
        line: 1,
        column: 1,
      }
      registry.register('tasks', schema)

      expect(registry.getOnDeleteAction('tasks', 'assignee')).toBeUndefined()
    })
  })

  describe('collections and entries', () => {
    it('returns all registered collection names', () => {
      registry.register('tasks', { fields: [], line: 1, column: 1 })
      registry.register('users', { fields: [], line: 1, column: 1 })
      registry.register('projects', { fields: [], line: 1, column: 1 })

      const collections = registry.collections()
      expect(collections).toContain('tasks')
      expect(collections).toContain('users')
      expect(collections).toContain('projects')
      expect(collections).toHaveLength(3)
    })

    it('returns all entries', () => {
      const schema1: SchemaDefinition = { fields: [], line: 1, column: 1 }
      const schema2: SchemaDefinition = { fields: [], line: 2, column: 1 }
      registry.register('tasks', schema1)
      registry.register('users', schema2)

      const entries = registry.entries()
      expect(entries).toHaveLength(2)
      expect(entries).toContainEqual(['tasks', schema1])
      expect(entries).toContainEqual(['users', schema2])
    })
  })

  describe('clear', () => {
    it('removes all registered schemas', () => {
      registry.register('tasks', { fields: [], line: 1, column: 1 })
      registry.register('users', { fields: [], line: 1, column: 1 })

      expect(registry.collections()).toHaveLength(2)

      registry.clear()

      expect(registry.collections()).toHaveLength(0)
      expect(registry.get('tasks')).toBeUndefined()
    })
  })
})
