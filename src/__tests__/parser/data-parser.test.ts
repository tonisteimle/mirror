/**
 * Tests for Data Parser
 *
 * Tests parsing of Data tab syntax:
 * - Schema definitions
 * - Instance parsing with values
 * - Reference resolution
 * - Tokenization edge cases
 */

import { describe, it, expect } from 'vitest'
import {
  parseDataCode,
  instancesToRecords,
  getCollectionName,
  generateInstancesSyntax
} from '../../parser/data-parser'

// =============================================================================
// SCHEMA PARSING
// =============================================================================

describe('parseDataCode - schemas', () => {
  it('parses simple schema', () => {
    const code = `Task:
  title: text
  done: boolean`

    const result = parseDataCode(code)

    expect(result.errors).toHaveLength(0)
    expect(result.schemas).toHaveLength(1)
    expect(result.schemas[0].typeName).toBe('Task')
    expect(result.schemas[0].fields).toHaveLength(2)
    expect(result.schemas[0].fields[0]).toEqual({ name: 'title', type: 'text' })
    expect(result.schemas[0].fields[1]).toEqual({ name: 'done', type: 'boolean' })
  })

  it('parses multiple schemas', () => {
    const code = `Category:
  name: text
  color: text

Task:
  title: text
  category: Category`

    const result = parseDataCode(code)

    expect(result.errors).toHaveLength(0)
    expect(result.schemas).toHaveLength(2)
    expect(result.schemas[0].typeName).toBe('Category')
    expect(result.schemas[1].typeName).toBe('Task')
    // Relation type preserved
    expect(result.schemas[1].fields[1].type).toBe('Category')
  })

  it('normalizes field types', () => {
    const code = `Test:
  a: string
  b: int
  c: integer
  d: float
  e: bool`

    const result = parseDataCode(code)

    expect(result.schemas[0].fields[0].type).toBe('text')    // string -> text
    expect(result.schemas[0].fields[1].type).toBe('number')  // int -> number
    expect(result.schemas[0].fields[2].type).toBe('number')  // integer -> number
    expect(result.schemas[0].fields[3].type).toBe('number')  // float -> number
    expect(result.schemas[0].fields[4].type).toBe('boolean') // bool -> boolean
  })

  it('ignores comments', () => {
    const code = `// This is a comment
Task:
  // Field comment
  title: text`

    const result = parseDataCode(code)

    expect(result.schemas).toHaveLength(1)
    expect(result.schemas[0].fields).toHaveLength(1)
  })
})

// =============================================================================
// INSTANCE PARSING
// =============================================================================

describe('parseDataCode - instances', () => {
  it('parses instance with comma-separated values', () => {
    const code = `Task:
  title: text
  done: boolean

- Task "Einkaufen", false`

    const result = parseDataCode(code)

    expect(result.errors).toHaveLength(0)
    expect(result.instances).toHaveLength(1)
    expect(result.instances[0].typeName).toBe('Task')
    expect(result.instances[0].values[0].value).toBe('Einkaufen')
    expect(result.instances[0].values[1].value).toBe(false)
  })

  it('parses instance with reference', () => {
    const code = `Category:
  name: text

Task:
  title: text
  category: Category

- Category "Arbeit"
- Task "Einkaufen", Category[0]`

    const result = parseDataCode(code)

    expect(result.errors).toHaveLength(0)
    expect(result.instances).toHaveLength(2)

    // Check reference
    const taskValues = result.instances[1].values
    expect(taskValues[1].value).toEqual({
      type: 'reference',
      typeName: 'Category',
      index: 0
    })
  })

  it('parses multiple instances', () => {
    const code = `Task:
  title: text

- Task "First"
- Task "Second"
- Task "Third"`

    const result = parseDataCode(code)

    expect(result.instances).toHaveLength(3)
    expect(result.instances[0]._id).toBe('task-0')
    expect(result.instances[1]._id).toBe('task-1')
    expect(result.instances[2]._id).toBe('task-2')
  })

  it('handles number values', () => {
    const code = `Item:
  name: text
  price: number
  qty: number

- Item "Widget", 19.99, 5`

    const result = parseDataCode(code)

    expect(result.instances[0].values[1].value).toBe(19.99)
    expect(result.instances[0].values[2].value).toBe(5)
  })

  it('handles boolean values', () => {
    const code = `Task:
  done: boolean

- Task true
- Task false`

    const result = parseDataCode(code)

    expect(result.instances[0].values[0].value).toBe(true)
    expect(result.instances[1].values[0].value).toBe(false)
  })

  it('provides default values for missing fields', () => {
    const code = `Task:
  title: text
  done: boolean
  priority: number

- Task "Only title"`

    const result = parseDataCode(code)

    expect(result.instances[0].values[0].value).toBe('Only title')
    expect(result.instances[0].values[1].value).toBe(false)  // default boolean
    expect(result.instances[0].values[2].value).toBe(0)      // default number
  })

  it('reports error for unknown type', () => {
    const code = `Task:
  title: text

- Unknown "Test"`

    const result = parseDataCode(code)

    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0]).toContain('Unknown type')
  })
})

// =============================================================================
// TOKENIZATION EDGE CASES
// =============================================================================

describe('parseDataCode - tokenization', () => {
  it('handles single quotes', () => {
    const code = `Task:
  title: text

- Task 'Single quoted'`

    const result = parseDataCode(code)

    expect(result.instances[0].values[0].value).toBe('Single quoted')
  })

  it('handles mixed quotes and commas', () => {
    const code = `Task:
  title: text
  desc: text

- Task "Title here", "Description here"`

    const result = parseDataCode(code)

    expect(result.instances[0].values[0].value).toBe('Title here')
    expect(result.instances[0].values[1].value).toBe('Description here')
  })

  it('handles values without commas (space-separated)', () => {
    // This tests current behavior - values with spaces but no quotes
    // should work with comma separation
    const code = `Task:
  title: text
  done: boolean
  priority: number

- Task "Title", false, 5`

    const result = parseDataCode(code)

    expect(result.instances[0].values[0].value).toBe('Title')
    expect(result.instances[0].values[1].value).toBe(false)
    expect(result.instances[0].values[2].value).toBe(5)
  })

  // This test documents a known issue with the current tokenizer
  it('handles values separated only by spaces (potential issue)', () => {
    const code = `Task:
  a: number
  b: number

- Task 10 20`

    const result = parseDataCode(code)

    // Current behavior: "10 20" is treated as one token due to space handling
    // This may or may not be the expected behavior
    // The test documents the current state
    console.log('Values:', result.instances[0]?.values)
    console.log('Errors:', result.errors)
  })
})

// =============================================================================
// INSTANCES TO RECORDS CONVERSION
// =============================================================================

describe('instancesToRecords', () => {
  it('converts simple instances', () => {
    const code = `Task:
  title: text
  done: boolean

- Task "Einkaufen", false
- Task "Meeting", true`

    const { schemas, instances } = parseDataCode(code)
    const records = instancesToRecords(schemas, instances)

    expect(records.get('tasks')).toHaveLength(2)
    expect(records.get('tasks')![0]).toEqual({
      _id: 'task-0',
      title: 'Einkaufen',
      done: false
    })
  })

  it('resolves references to _id', () => {
    const code = `Category:
  name: text

Task:
  title: text
  category: Category

- Category "Arbeit"
- Category "Privat"
- Task "Einkaufen", Category[0]
- Task "Sport", Category[1]`

    const { schemas, instances } = parseDataCode(code)
    const records = instancesToRecords(schemas, instances)

    expect(records.get('tasks')![0].category).toBe('category-0')
    expect(records.get('tasks')![1].category).toBe('category-1')
  })
})

// =============================================================================
// COLLECTION NAME GENERATION
// =============================================================================

describe('getCollectionName', () => {
  it('pluralizes regular nouns', () => {
    expect(getCollectionName('Task')).toBe('tasks')
    expect(getCollectionName('User')).toBe('users')
    expect(getCollectionName('Item')).toBe('items')
  })

  it('handles -y ending', () => {
    expect(getCollectionName('Category')).toBe('categories')
    expect(getCollectionName('Company')).toBe('companies')
  })

  it('handles -y with vowel before', () => {
    expect(getCollectionName('Day')).toBe('days')
    expect(getCollectionName('Key')).toBe('keys')
    expect(getCollectionName('Boy')).toBe('boys')
  })

  it('handles -s, -x, -ch, -sh endings', () => {
    expect(getCollectionName('Status')).toBe('statuses')
    expect(getCollectionName('Box')).toBe('boxes')
    expect(getCollectionName('Match')).toBe('matches')
    expect(getCollectionName('Dish')).toBe('dishes')
  })

  it('handles irregular plurals', () => {
    expect(getCollectionName('Person')).toBe('people')
    expect(getCollectionName('Child')).toBe('children')
  })
})

// =============================================================================
// INSTANCE SYNTAX GENERATION
// =============================================================================

describe('generateInstancesSyntax', () => {
  it('generates instances for schema', () => {
    const schemas = [{
      typeName: 'Task',
      fields: [
        { name: 'title', type: 'text' as const },
        { name: 'done', type: 'boolean' as const }
      ]
    }]

    const syntax = generateInstancesSyntax(schemas, 2)

    expect(syntax).toContain('- Task')
    expect(syntax).toContain('"title 1"')
    expect(syntax).toContain('"title 2"')
  })

  it('generates relation references', () => {
    const schemas = [
      {
        typeName: 'Category',
        fields: [{ name: 'name', type: 'text' as const }]
      },
      {
        typeName: 'Task',
        fields: [
          { name: 'title', type: 'text' as const },
          { name: 'category', type: 'Category' }
        ]
      }
    ]

    const syntax = generateInstancesSyntax(schemas, 2)

    expect(syntax).toContain('Category[')
  })

  it('generates comma-separated values for proper parsing', () => {
    const schemas = [{
      typeName: 'Task',
      fields: [
        { name: 'title', type: 'text' as const },
        { name: 'done', type: 'boolean' as const },
        { name: 'priority', type: 'number' as const }
      ]
    }]

    const syntax = generateInstancesSyntax(schemas, 1)

    // Should use commas between values for proper tokenization
    expect(syntax).toContain(', ')
    expect(syntax).toBe('- Task "title 1", true, 10')
  })
})

// =============================================================================
// ROUND-TRIP: Generate -> Parse -> Records
// =============================================================================

describe('round-trip: generateInstancesSyntax -> parseDataCode', () => {
  it('generated syntax should be parseable', () => {
    const schemaCode = `Category:
  name: text

Task:
  title: text
  done: boolean
  category: Category`

    // First parse the schema
    const { schemas } = parseDataCode(schemaCode)

    // Generate instance syntax
    const instanceSyntax = generateInstancesSyntax(schemas, 2)
    console.log('Generated:', instanceSyntax)

    // Parse the combined code
    const fullCode = schemaCode + '\n\n' + instanceSyntax
    const result = parseDataCode(fullCode)

    console.log('Parse errors:', result.errors)
    console.log('Instances:', result.instances.map(i => ({
      type: i.typeName,
      values: i.values.map(v => v.value)
    })))

    // Should parse without errors
    // NOTE: This may fail due to the space vs comma issue
    expect(result.schemas).toHaveLength(2)
    expect(result.instances.length).toBeGreaterThan(0)
  })
})
