/**
 * Parser Tests: Schema Definitions
 *
 * Tests for $schema parsing including:
 * - Primitive types (string, number, boolean)
 * - Relation types ($collection, $collection[])
 * - Constraints (required, max, onDelete)
 */

import { parse } from '../../compiler/parser'

describe('Schema Parsing', () => {
  // ============================================================
  // Basic Schema Definition
  // ============================================================
  describe('Basic Schema Definition', () => {
    test('parses empty schema', () => {
      const code = `$schema:
  `
      const ast = parse(code)
      expect(ast.schema).toBeDefined()
      expect(ast.schema?.fields).toEqual([])
    })

    test('parses single string field', () => {
      const code = `$schema:
  name: string`
      const ast = parse(code)
      expect(ast.schema).toBeDefined()
      expect(ast.schema?.fields.length).toBe(1)
      expect(ast.schema?.fields[0].name).toBe('name')
      expect(ast.schema?.fields[0].type.kind).toBe('primitive')
      if (ast.schema?.fields[0].type.kind === 'primitive') {
        expect(ast.schema?.fields[0].type.type).toBe('string')
      }
    })

    test('parses number field', () => {
      const code = `$schema:
  age: number`
      const ast = parse(code)
      expect(ast.schema?.fields[0].type.kind).toBe('primitive')
      if (ast.schema?.fields[0].type.kind === 'primitive') {
        expect(ast.schema?.fields[0].type.type).toBe('number')
      }
    })

    test('parses boolean field', () => {
      const code = `$schema:
  active: boolean`
      const ast = parse(code)
      expect(ast.schema?.fields[0].type.kind).toBe('primitive')
      if (ast.schema?.fields[0].type.kind === 'primitive') {
        expect(ast.schema?.fields[0].type.type).toBe('boolean')
      }
    })

    test('parses multiple fields', () => {
      const code = `$schema:
  name: string
  age: number
  active: boolean`
      const ast = parse(code)
      expect(ast.schema?.fields.length).toBe(3)
      expect(ast.schema?.fields[0].name).toBe('name')
      expect(ast.schema?.fields[1].name).toBe('age')
      expect(ast.schema?.fields[2].name).toBe('active')
    })
  })

  // ============================================================
  // Relation Types
  // ============================================================
  describe('Relation Types', () => {
    test('parses N:1 relation', () => {
      const code = `$schema:
  author: $users`
      const ast = parse(code)
      expect(ast.schema?.fields[0].type.kind).toBe('relation')
      if (ast.schema?.fields[0].type.kind === 'relation') {
        expect(ast.schema?.fields[0].type.target).toBe('$users')
        expect(ast.schema?.fields[0].type.isArray).toBe(false)
      }
    })

    test('parses N:N relation with array notation', () => {
      const code = `$schema:
  tags: $tags[]`
      const ast = parse(code)
      expect(ast.schema?.fields[0].type.kind).toBe('relation')
      if (ast.schema?.fields[0].type.kind === 'relation') {
        expect(ast.schema?.fields[0].type.target).toBe('$tags')
        expect(ast.schema?.fields[0].type.isArray).toBe(true)
      }
    })

    test('parses mixed primitive and relation fields', () => {
      const code = `$schema:
  title: string
  author: $users
  tags: $tags[]
  published: boolean`
      const ast = parse(code)
      expect(ast.schema?.fields.length).toBe(4)
      expect(ast.schema?.fields[0].type.kind).toBe('primitive')
      expect(ast.schema?.fields[1].type.kind).toBe('relation')
      expect(ast.schema?.fields[2].type.kind).toBe('relation')
      expect(ast.schema?.fields[3].type.kind).toBe('primitive')
    })
  })

  // ============================================================
  // Constraints — feature not yet implemented in parser
  // ============================================================
  describe.skip('Constraints', () => {
    test('parses required constraint', () => {
      const code = `$schema:
  name: string, required`
      const ast = parse(code)
      expect(ast.schema?.fields[0].constraints).toBeDefined()
      const required = ast.schema?.fields[0].constraints?.find(c => c.type === 'required')
      expect(required).toBeDefined()
    })

    test('parses max constraint with value', () => {
      const code = `$schema:
  title: string, max 100`
      const ast = parse(code)
      const max = ast.schema?.fields[0].constraints?.find(c => c.type === 'max')
      expect(max).toBeDefined()
      expect(max?.value).toBe(100)
    })

    test('parses onDelete cascade constraint', () => {
      const code = `$schema:
  author: $users, onDelete cascade`
      const ast = parse(code)
      const onDelete = ast.schema?.fields[0].constraints?.find(c => c.type === 'onDelete')
      expect(onDelete).toBeDefined()
      expect(onDelete?.action).toBe('cascade')
    })

    test('parses onDelete nullify constraint', () => {
      const code = `$schema:
  author: $users, onDelete nullify`
      const ast = parse(code)
      const onDelete = ast.schema?.fields[0].constraints?.find(c => c.type === 'onDelete')
      expect(onDelete?.action).toBe('nullify')
    })

    test('parses onDelete restrict constraint', () => {
      const code = `$schema:
  author: $users, onDelete restrict`
      const ast = parse(code)
      const onDelete = ast.schema?.fields[0].constraints?.find(c => c.type === 'onDelete')
      expect(onDelete?.action).toBe('restrict')
    })

    test('parses multiple constraints', () => {
      const code = `$schema:
  title: string, required, max 200`
      const ast = parse(code)
      expect(ast.schema?.fields[0].constraints?.length).toBe(2)
    })
  })

  // ============================================================
  // Complex Schema
  // ============================================================
  describe('Complex Schema', () => {
    test('parses complete blog post schema', () => {
      const code = `$schema:
  title: string, required, max 200
  content: string
  author: $users, required, onDelete cascade
  tags: $tags[]
  published: boolean
  views: number`
      const ast = parse(code)
      expect(ast.schema?.fields.length).toBe(6)

      // Title field
      const title = ast.schema?.fields[0]
      expect(title?.name).toBe('title')
      expect(title?.type.kind).toBe('primitive')
      expect(title?.constraints?.length).toBe(2)

      // Author field - relation with cascade
      const author = ast.schema?.fields[2]
      expect(author?.name).toBe('author')
      expect(author?.type.kind).toBe('relation')
      if (author?.type.kind === 'relation') {
        expect(author.type.target).toBe('$users')
        expect(author.type.isArray).toBe(false)
      }

      // Tags field - N:N relation
      const tags = ast.schema?.fields[3]
      if (tags?.type.kind === 'relation') {
        expect(tags.type.isArray).toBe(true)
      }
    })
  })

  // ============================================================
  // Source Position
  // ============================================================
  describe('Source Position', () => {
    test('schema has line/column info', () => {
      const code = `$schema:
  name: string`
      const ast = parse(code)
      expect(ast.schema?.line).toBeDefined()
      expect(ast.schema?.column).toBeDefined()
    })

    test('fields have line info', () => {
      const code = `$schema:
  name: string
  age: number`
      const ast = parse(code)
      expect(ast.schema?.fields[0].line).toBeDefined()
      expect(ast.schema?.fields[1].line).toBeDefined()
    })
  })
})
