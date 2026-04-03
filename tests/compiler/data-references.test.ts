/**
 * Data References Tests
 *
 * Tests the parsing and serialization of data references in .data files.
 * References use the syntax: $collection.entry (e.g., $users.toni)
 */

import { describe, it, expect } from 'vitest'
import { parseDataFile, mergeDataFiles, serializeDataForJS } from '../../compiler/parser/data-parser'
import {
  isDataReference,
  isDataReferenceArray,
  DataFile,
  DataReference,
  DataReferenceArray,
} from '../../compiler/parser/data-types'

// ============================================================================
// PARSING REFERENCES
// ============================================================================

describe('DataParser: References - Parsing', () => {
  it('parses a single reference', () => {
    const source = `
task:
title: My Task
assignee: $users.toni
`
    const result = parseDataFile(source, 'tasks')

    expect(result.errors).toHaveLength(0)
    expect(result.entries).toHaveLength(1)

    const assignee = result.entries[0].attributes.find(a => a.key === 'assignee')
    expect(assignee).toBeDefined()
    expect(isDataReference(assignee!.value)).toBe(true)

    const ref = assignee!.value as DataReference
    expect(ref.kind).toBe('reference')
    expect(ref.collection).toBe('users')
    expect(ref.entry).toBe('toni')
  })

  it('parses multiple references', () => {
    const source = `
project:
name: Mirror
members: $users.toni, $users.anna
`
    const result = parseDataFile(source, 'projects')

    expect(result.errors).toHaveLength(0)

    const members = result.entries[0].attributes.find(a => a.key === 'members')
    expect(members).toBeDefined()
    expect(isDataReferenceArray(members!.value)).toBe(true)

    const refs = members!.value as DataReferenceArray
    expect(refs.kind).toBe('referenceArray')
    expect(refs.references).toHaveLength(2)
    expect(refs.references[0].collection).toBe('users')
    expect(refs.references[0].entry).toBe('toni')
    expect(refs.references[1].collection).toBe('users')
    expect(refs.references[1].entry).toBe('anna')
  })

  it('parses references with hyphens', () => {
    const source = `
task:
category: $task-categories.high-priority
`
    const result = parseDataFile(source, 'tasks')

    expect(result.errors).toHaveLength(0)

    const category = result.entries[0].attributes.find(a => a.key === 'category')
    expect(isDataReference(category!.value)).toBe(true)

    const ref = category!.value as DataReference
    expect(ref.collection).toBe('task-categories')
    expect(ref.entry).toBe('high-priority')
  })

  it('does not parse regular strings with $ as references', () => {
    const source = `
item:
price: $19.99
`
    const result = parseDataFile(source, 'items')

    expect(result.errors).toHaveLength(0)

    const price = result.entries[0].attributes.find(a => a.key === 'price')
    expect(typeof price!.value).toBe('string')
    expect(price!.value).toBe('$19.99')
  })

  it('does not parse token syntax as reference', () => {
    const source = `
item:
color: $primary
`
    const result = parseDataFile(source, 'items')

    expect(result.errors).toHaveLength(0)

    const color = result.entries[0].attributes.find(a => a.key === 'color')
    // Token syntax without second part is not a reference
    expect(typeof color!.value).toBe('string')
    expect(color!.value).toBe('$primary')
  })

  it('parses mixed content with references', () => {
    const source = `
task:
title: Important Task
priority: 5
done: false
assignee: $users.toni
tags: [urgent, review]
`
    const result = parseDataFile(source, 'tasks')

    expect(result.errors).toHaveLength(0)

    const attrs = result.entries[0].attributes
    expect(attrs.find(a => a.key === 'title')?.value).toBe('Important Task')
    expect(attrs.find(a => a.key === 'priority')?.value).toBe(5)
    expect(attrs.find(a => a.key === 'done')?.value).toBe(false)
    expect(attrs.find(a => a.key === 'tags')?.value).toEqual(['urgent', 'review'])

    const assignee = attrs.find(a => a.key === 'assignee')
    expect(isDataReference(assignee!.value)).toBe(true)
  })
})

// ============================================================================
// SERIALIZATION
// ============================================================================

describe('DataParser: References - Serialization', () => {
  it('serializes a single reference', () => {
    const files: DataFile[] = [
      {
        filename: 'tasks',
        entries: [{
          name: 'task1',
          attributes: [{
            key: 'assignee',
            value: { kind: 'reference', collection: 'users', entry: 'toni' },
            line: 3,
          }],
          blocks: [],
          line: 1,
        }],
        errors: [],
      },
    ]

    const merged = mergeDataFiles(files)
    const js = serializeDataForJS(merged)

    expect(js).toContain('__ref: true')
    expect(js).toContain('collection: "users"')
    expect(js).toContain('entry: "toni"')
  })

  it('serializes multiple references', () => {
    const files: DataFile[] = [
      {
        filename: 'projects',
        entries: [{
          name: 'project1',
          attributes: [{
            key: 'members',
            value: {
              kind: 'referenceArray',
              references: [
                { kind: 'reference', collection: 'users', entry: 'toni' },
                { kind: 'reference', collection: 'users', entry: 'anna' },
              ],
            },
            line: 3,
          }],
          blocks: [],
          line: 1,
        }],
        errors: [],
      },
    ]

    const merged = mergeDataFiles(files)
    const js = serializeDataForJS(merged)

    // Should be an array of references
    expect(js).toContain('[{')
    expect(js).toContain('entry: "toni"')
    expect(js).toContain('entry: "anna"')
  })
})

// ============================================================================
// INTEGRATION
// ============================================================================

describe('DataParser: References - Integration', () => {
  it('full pipeline: parse, merge, serialize', () => {
    const usersSource = `
toni:
name: Toni Steimle
role: admin

anna:
name: Anna Schmidt
role: editor
`

    const tasksSource = `
task1:
title: Important Task
assignee: $users.toni

task2:
title: Review Task
assignee: $users.anna
reviewer: $users.toni
`

    const usersFile = parseDataFile(usersSource, 'users')
    const tasksFile = parseDataFile(tasksSource, 'tasks')

    expect(usersFile.errors).toHaveLength(0)
    expect(tasksFile.errors).toHaveLength(0)

    const merged = mergeDataFiles([usersFile, tasksFile])

    // Check users
    expect(merged.users.toni.name).toBe('Toni Steimle')
    expect(merged.users.anna.name).toBe('Anna Schmidt')

    // Check tasks with references
    const task1Assignee = merged.tasks.task1.assignee
    expect(isDataReference(task1Assignee)).toBe(true)
    expect((task1Assignee as DataReference).collection).toBe('users')
    expect((task1Assignee as DataReference).entry).toBe('toni')

    // Serialize
    const js = serializeDataForJS(merged)
    expect(js).toContain('"users"')
    expect(js).toContain('"tasks"')
    expect(js).toContain('__ref: true')
  })

  it('handles self-referencing within same collection', () => {
    const source = `
task1:
title: First Task

task2:
title: Second Task
blockedBy: $tasks.task1
`
    const result = parseDataFile(source, 'tasks')

    expect(result.errors).toHaveLength(0)

    const blockedBy = result.entries[1].attributes.find(a => a.key === 'blockedBy')
    expect(isDataReference(blockedBy!.value)).toBe(true)

    const ref = blockedBy!.value as DataReference
    expect(ref.collection).toBe('tasks')
    expect(ref.entry).toBe('task1')
  })

  it('handles multiple references to same entry', () => {
    const source = `
task1:
assignee: $users.toni
reviewer: $users.toni
`
    const result = parseDataFile(source, 'tasks')

    expect(result.errors).toHaveLength(0)

    const assignee = result.entries[0].attributes.find(a => a.key === 'assignee')
    const reviewer = result.entries[0].attributes.find(a => a.key === 'reviewer')

    expect(isDataReference(assignee!.value)).toBe(true)
    expect(isDataReference(reviewer!.value)).toBe(true)

    expect((assignee!.value as DataReference).entry).toBe('toni')
    expect((reviewer!.value as DataReference).entry).toBe('toni')
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('DataParser: References - Edge Cases', () => {
  it('handles whitespace around references', () => {
    const source = `
task:
assignee:   $users.toni
`
    const result = parseDataFile(source, 'tasks')

    expect(result.errors).toHaveLength(0)

    const assignee = result.entries[0].attributes.find(a => a.key === 'assignee')
    expect(isDataReference(assignee!.value)).toBe(true)
  })

  it('handles whitespace in reference arrays', () => {
    const source = `
task:
members:   $users.toni  ,   $users.anna
`
    const result = parseDataFile(source, 'tasks')

    expect(result.errors).toHaveLength(0)

    const members = result.entries[0].attributes.find(a => a.key === 'members')
    expect(isDataReferenceArray(members!.value)).toBe(true)

    const refs = members!.value as DataReferenceArray
    expect(refs.references).toHaveLength(2)
  })

  it('treats partial reference-like syntax as string', () => {
    const source = `
task:
note: $incomplete.
other: $.invalid
third: $no-dot
`
    const result = parseDataFile(source, 'tasks')

    expect(result.errors).toHaveLength(0)

    const note = result.entries[0].attributes.find(a => a.key === 'note')
    const other = result.entries[0].attributes.find(a => a.key === 'other')
    const third = result.entries[0].attributes.find(a => a.key === 'third')

    // These should not be parsed as references
    expect(typeof note!.value).toBe('string')
    expect(typeof other!.value).toBe('string')
    expect(typeof third!.value).toBe('string')
  })

  it('handles three references', () => {
    const source = `
task:
watchers: $users.a, $users.b, $users.c
`
    const result = parseDataFile(source, 'tasks')

    expect(result.errors).toHaveLength(0)

    const watchers = result.entries[0].attributes.find(a => a.key === 'watchers')
    expect(isDataReferenceArray(watchers!.value)).toBe(true)

    const refs = watchers!.value as DataReferenceArray
    expect(refs.references).toHaveLength(3)
    expect(refs.references[0].entry).toBe('a')
    expect(refs.references[1].entry).toBe('b')
    expect(refs.references[2].entry).toBe('c')
  })

  it('mixed valid and invalid reference syntax stays string', () => {
    const source = `
task:
mixed: $users.toni, not-a-reference
`
    const result = parseDataFile(source, 'tasks')

    expect(result.errors).toHaveLength(0)

    const mixed = result.entries[0].attributes.find(a => a.key === 'mixed')
    // If not all parts are valid references, the whole thing is a string
    expect(typeof mixed!.value).toBe('string')
    expect(mixed!.value).toBe('$users.toni, not-a-reference')
  })
})

// ============================================================================
// TYPE GUARDS
// ============================================================================

describe('DataParser: Reference Type Guards', () => {
  it('isDataReference correctly identifies references', () => {
    const ref: DataReference = { kind: 'reference', collection: 'users', entry: 'toni' }
    expect(isDataReference(ref)).toBe(true)
    expect(isDataReference('string')).toBe(false)
    expect(isDataReference(42)).toBe(false)
    expect(isDataReference(true)).toBe(false)
    expect(isDataReference(['a', 'b'])).toBe(false)
    expect(isDataReference(null as any)).toBe(false)
    expect(isDataReference(undefined as any)).toBe(false)
  })

  it('isDataReferenceArray correctly identifies reference arrays', () => {
    const refArray: DataReferenceArray = {
      kind: 'referenceArray',
      references: [{ kind: 'reference', collection: 'users', entry: 'toni' }],
    }
    expect(isDataReferenceArray(refArray)).toBe(true)
    expect(isDataReferenceArray('string')).toBe(false)
    expect(isDataReferenceArray(['a', 'b'])).toBe(false)
    expect(isDataReferenceArray({ kind: 'reference', collection: 'x', entry: 'y' })).toBe(false)
  })
})
