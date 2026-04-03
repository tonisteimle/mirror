/**
 * Table Component Tests
 *
 * Tests for the data-driven Table component with:
 * - Type inference from data schema
 * - Column overrides
 * - Type renderers
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  DataTypeRegistry,
  extractSchema,
  inferType,
  dataTypeRegistry,
} from '../../compiler/schema/table-types'
import {
  TYPE_RENDERERS,
  getTypeRenderer,
  getTypeRendererStyles,
  getTypeAlignment,
  getValueFormatter,
} from '../../compiler/schema/type-renderers'
import {
  isCompoundPrimitive,
  getCompoundPrimitive,
} from '../../compiler/schema/compound-primitives'
import { isIRTable } from '../../compiler/ir/types'
import type { InferredDataType } from '../../compiler/schema/table-types'
import type { IRTable } from '../../compiler/ir/types'

describe('Table - Type Inference', () => {
  describe('DataTypeRegistry', () => {
    let registry: DataTypeRegistry

    beforeEach(() => {
      registry = new DataTypeRegistry()
    })

    it('registers and retrieves collection schemas', () => {
      const entries = [
        {
          name: 'task1',
          attributes: [
            { key: 'title', value: 'Design Review', line: 1 },
            { key: 'effort', value: 8, line: 2 },
            { key: 'done', value: false, line: 3 },
          ],
          blocks: [],
          line: 1,
        },
      ]

      registry.registerCollection('tasks', entries)
      const schema = registry.getSchema('tasks')

      expect(schema).toBeDefined()
      expect(schema?.fields).toHaveLength(3)
    })

    it('infers string type for text values', () => {
      const entries = [
        {
          name: 'item1',
          attributes: [{ key: 'name', value: 'Test', line: 1 }],
          blocks: [],
          line: 1,
        },
      ]

      registry.registerCollection('items', entries)
      const type = registry.getFieldType('items', 'name')

      expect(type).toBe('string')
    })

    it('infers number type for numeric values', () => {
      const entries = [
        {
          name: 'item1',
          attributes: [{ key: 'count', value: 42, line: 1 }],
          blocks: [],
          line: 1,
        },
      ]

      registry.registerCollection('items', entries)
      const type = registry.getFieldType('items', 'count')

      expect(type).toBe('number')
    })

    it('infers boolean type for boolean values', () => {
      const entries = [
        {
          name: 'item1',
          attributes: [{ key: 'active', value: true, line: 1 }],
          blocks: [],
          line: 1,
        },
      ]

      registry.registerCollection('items', entries)
      const type = registry.getFieldType('items', 'active')

      expect(type).toBe('boolean')
    })

    it('infers date type for ISO date strings', () => {
      const entries = [
        {
          name: 'item1',
          attributes: [{ key: 'created', value: '2024-02-15', line: 1 }],
          blocks: [],
          line: 1,
        },
      ]

      registry.registerCollection('items', entries)
      const type = registry.getFieldType('items', 'created')

      expect(type).toBe('date')
    })

    it('infers relation type for $collection.entry references', () => {
      const entries = [
        {
          name: 'task1',
          attributes: [
            {
              key: 'assignee',
              value: { kind: 'reference' as const, collection: 'users', entry: 'toni' },
              line: 1,
            },
          ],
          blocks: [],
          line: 1,
        },
      ]

      registry.registerCollection('tasks', entries)
      const type = registry.getFieldType('tasks', 'assignee')

      expect(type).toBe('relation')
    })

    it('returns unknown for non-existent fields', () => {
      const entries = [
        {
          name: 'item1',
          attributes: [{ key: 'name', value: 'Test', line: 1 }],
          blocks: [],
          line: 1,
        },
      ]

      registry.registerCollection('items', entries)
      const type = registry.getFieldType('items', 'nonexistent')

      expect(type).toBe('unknown')
    })

    it('returns unknown for non-existent collections', () => {
      const type = registry.getFieldType('nonexistent', 'field')
      expect(type).toBe('unknown')
    })

    it('clears all schemas', () => {
      const entries = [
        {
          name: 'item1',
          attributes: [{ key: 'name', value: 'Test', line: 1 }],
          blocks: [],
          line: 1,
        },
      ]

      registry.registerCollection('items', entries)
      expect(registry.hasCollection('items')).toBe(true)

      registry.clear()
      expect(registry.hasCollection('items')).toBe(false)
    })
  })

  describe('inferType', () => {
    it('infers string type', () => {
      expect(inferType('hello')).toBe('string')
    })

    it('infers number type', () => {
      expect(inferType(42)).toBe('number')
      expect(inferType(3.14)).toBe('number')
    })

    it('infers boolean type', () => {
      expect(inferType(true)).toBe('boolean')
      expect(inferType(false)).toBe('boolean')
    })

    it('infers date type from ISO string', () => {
      expect(inferType('2024-02-15')).toBe('date')
      expect(inferType('2024-12-31')).toBe('date')
    })

    it('does not infer date for non-ISO strings', () => {
      expect(inferType('15.02.2024')).toBe('string')
      expect(inferType('February 15, 2024')).toBe('string')
    })

    it('infers relation type from DataReference', () => {
      const ref = { kind: 'reference' as const, collection: 'users', entry: 'toni' }
      expect(inferType(ref)).toBe('relation')
    })

    it('infers array type from DataReferenceArray', () => {
      const refArray = {
        kind: 'referenceArray' as const,
        references: [
          { kind: 'reference' as const, collection: 'users', entry: 'toni' },
        ],
      }
      expect(inferType(refArray)).toBe('array')
    })

    it('infers array type from string array', () => {
      expect(inferType(['a', 'b', 'c'])).toBe('array')
    })
  })

  describe('extractSchema', () => {
    it('extracts field names and types from entries', () => {
      const entries = [
        {
          name: 'task1',
          attributes: [
            { key: 'title', value: 'Test', line: 1 },
            { key: 'priority', value: 1, line: 2 },
          ],
          blocks: [],
          line: 1,
        },
        {
          name: 'task2',
          attributes: [
            { key: 'title', value: 'Another', line: 3 },
            { key: 'priority', value: 2, line: 4 },
            { key: 'done', value: true, line: 5 },
          ],
          blocks: [],
          line: 3,
        },
      ]

      const schema = extractSchema('tasks', entries)

      expect(schema.name).toBe('tasks')
      expect(schema.fields).toHaveLength(3)
      expect(schema.fields.find(f => f.name === 'title')?.type).toBe('string')
      expect(schema.fields.find(f => f.name === 'priority')?.type).toBe('number')
      expect(schema.fields.find(f => f.name === 'done')?.type).toBe('boolean')
    })

    it('extracts relationTo for relation types', () => {
      const entries = [
        {
          name: 'task1',
          attributes: [
            {
              key: 'assignee',
              value: { kind: 'reference' as const, collection: 'users', entry: 'toni' },
              line: 1,
            },
          ],
          blocks: [],
          line: 1,
        },
      ]

      const schema = extractSchema('tasks', entries)
      const field = schema.fields.find(f => f.name === 'assignee')

      expect(field?.type).toBe('relation')
      expect(field?.relationTo).toBe('users')
    })
  })
})

describe('Table - Type Renderers', () => {
  it('has renderers for all types', () => {
    const types: InferredDataType[] = ['string', 'number', 'boolean', 'date', 'relation', 'array', 'unknown']

    for (const type of types) {
      expect(TYPE_RENDERERS[type]).toBeDefined()
    }
  })

  it('getTypeRenderer returns correct renderer objects', () => {
    expect(getTypeRenderer('string').name).toBe('StringCell')
    expect(getTypeRenderer('number').name).toBe('NumberCell')
    expect(getTypeRenderer('boolean').name).toBe('BooleanCell')
    expect(getTypeRenderer('date').name).toBe('DateCell')
    expect(getTypeRenderer('relation').name).toBe('RelationCell')
  })

  it('getTypeRenderer returns unknown renderer for invalid types', () => {
    // @ts-expect-error - testing invalid type
    expect(getTypeRenderer('invalid').name).toBe('UnknownCell')
  })

  describe('getTypeRendererStyles', () => {
    it('returns right alignment for number type', () => {
      const styles = getTypeRendererStyles('number')
      expect(styles['justify-content']).toBe('flex-end')
      expect(styles['text-align']).toBe('right')
    })

    it('returns center alignment for boolean type', () => {
      const styles = getTypeRendererStyles('boolean')
      expect(styles['justify-content']).toBe('center')
      expect(styles['text-align']).toBe('center')
    })

    it('returns monospace font for number type', () => {
      const styles = getTypeRendererStyles('number')
      expect(styles['font-family']).toContain('monospace')
    })

    it('returns empty styles for left-aligned types', () => {
      const styles = getTypeRendererStyles('string')
      expect(styles['justify-content']).toBeUndefined()
      expect(styles['text-align']).toBeUndefined()
    })
  })

  describe('getTypeAlignment', () => {
    it('returns flex-end for number type', () => {
      expect(getTypeAlignment('number')).toBe('flex-end')
    })

    it('returns center for boolean type', () => {
      expect(getTypeAlignment('boolean')).toBe('center')
    })

    it('returns flex-start for string type', () => {
      expect(getTypeAlignment('string')).toBe('flex-start')
    })
  })

  describe('getValueFormatter', () => {
    it('formats date values with toLocaleDateString', () => {
      const expr = getValueFormatter('date', 'row.created')
      expect(expr).toContain('toLocaleDateString')
      expect(expr).toContain('de-DE')
    })

    it('formats relation values by extracting name', () => {
      const expr = getValueFormatter('relation', 'row.assignee')
      expect(expr).toContain('.name')
    })

    it('formats array values with join', () => {
      const expr = getValueFormatter('array', 'row.tags')
      expect(expr).toContain('.join')
    })

    it('adds prefix and suffix for number type', () => {
      const expr = getValueFormatter('number', 'row.price', { prefix: '$', suffix: '.00' })
      expect(expr).toContain('"$"')
      expect(expr).toContain('".00"')
    })

    it('adds prefix and suffix for string type', () => {
      const expr = getValueFormatter('string', 'row.name', { suffix: '!' })
      expect(expr).toContain('"!"')
    })
  })
})

describe('Table - IR Types', () => {
  it('IRTable interface has required fields', () => {
    // Type-level test - if this compiles, the interface is correct
    const table: IRTable = {
      id: 'table1',
      tag: 'div',
      properties: [],
      styles: [],
      events: [],
      children: [],
      isTableComponent: true,
      dataSource: 'tasks',
      columns: [
        {
          field: 'title',
          label: 'Title',
          inferredType: 'string',
        },
        {
          field: 'effort',
          label: 'Effort',
          inferredType: 'number',
          suffix: 'h',
        },
      ],
    }

    expect(table.isTableComponent).toBe(true)
    expect(table.dataSource).toBe('tasks')
    expect(table.columns).toHaveLength(2)
  })

  it('isIRTable type guard works correctly', () => {
    const tableNode = {
      id: 'table1',
      tag: 'div',
      properties: [],
      styles: [],
      events: [],
      children: [],
      isTableComponent: true,
      dataSource: 'tasks',
      columns: [],
    }

    const normalNode = {
      id: 'node1',
      tag: 'div',
      properties: [],
      styles: [],
      events: [],
      children: [],
    }

    expect(isIRTable(tableNode as any)).toBe(true)
    expect(isIRTable(normalNode as any)).toBe(false)
  })
})

describe('Table - Compound Primitive', () => {
  it('Table is registered as compound primitive', () => {
    expect(isCompoundPrimitive('Table')).toBe(true)

    const def = getCompoundPrimitive('Table')
    expect(def).toBeDefined()
    expect(def!.slots).toContain('Column')
    expect(def!.slots).toContain('Header')
    expect(def!.slots).toContain('Row')
    expect(def!.slots).toContain('Footer')
    expect(def!.slots).toContain('Group')
  })

  it('Table has correct props', () => {
    const def = getCompoundPrimitive('Table')
    expect(def!.props).toContain('select')
    expect(def!.props).toContain('pageSize')
    expect(def!.props).toContain('infinite')
  })

  it('Table has default styles', () => {
    const def = getCompoundPrimitive('Table')
    expect(def!.defaultStyles).toBeDefined()
    expect(def!.defaultStyles!['display']).toBe('flex')
    expect(def!.defaultStyles!['flex-direction']).toBe('column')
  })

  it('Table has slot styles', () => {
    const def = getCompoundPrimitive('Table')
    expect(def!.slotStyles).toBeDefined()
    expect(def!.slotStyles!['Header']).toBeDefined()
    expect(def!.slotStyles!['Row']).toBeDefined()
  })
})

describe('Table - Global Registry', () => {
  beforeEach(() => {
    dataTypeRegistry.clear()
  })

  it('global dataTypeRegistry instance exists', () => {
    expect(dataTypeRegistry).toBeDefined()
    expect(dataTypeRegistry).toBeInstanceOf(DataTypeRegistry)
  })

  it('can register and retrieve from global registry', () => {
    const entries = [
      {
        name: 'item1',
        attributes: [{ key: 'name', value: 'Test', line: 1 }],
        blocks: [],
        line: 1,
      },
    ]

    dataTypeRegistry.registerCollection('items', entries)
    expect(dataTypeRegistry.hasCollection('items')).toBe(true)
    expect(dataTypeRegistry.getFieldType('items', 'name')).toBe('string')
  })
})
