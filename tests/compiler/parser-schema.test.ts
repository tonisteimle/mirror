/**
 * Parser Tests: Schema Definitions
 *
 * Tests for $schema: blocks in .data files.
 * Schema defines field types and relation targets for CRUD operations.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'

describe('Parser: Schema', () => {
  describe('Basic Schema Parsing', () => {
    it('parses empty schema', () => {
      const input = `
$schema:
`
      const ast = parse(input)
      expect(ast.schema).toBeDefined()
      expect(ast.schema?.fields).toEqual([])
    })

    it('parses primitive string field', () => {
      const input = `
$schema:
  title: string
`
      const ast = parse(input)
      expect(ast.schema?.fields[0]).toMatchObject({
        name: 'title',
        type: { kind: 'primitive', type: 'string' },
        constraints: []
      })
    })

    it('parses primitive number field', () => {
      const input = `
$schema:
  aufwand: number
`
      const ast = parse(input)
      expect(ast.schema?.fields[0].type).toMatchObject({
        kind: 'primitive',
        type: 'number'
      })
    })

    it('parses primitive boolean field', () => {
      const input = `
$schema:
  done: boolean
`
      const ast = parse(input)
      expect(ast.schema?.fields[0].type).toMatchObject({
        kind: 'primitive',
        type: 'boolean'
      })
    })
  })

  describe('Relation Parsing', () => {
    it('parses N:1 relation', () => {
      const input = `
$schema:
  assignee: $users
`
      const ast = parse(input)
      expect(ast.schema?.fields[0]).toMatchObject({
        name: 'assignee',
        type: { kind: 'relation', target: '$users', isArray: false }
      })
    })

    it('parses N:N relation (array)', () => {
      const input = `
$schema:
  members: $users[]
`
      const ast = parse(input)
      expect(ast.schema?.fields[0]).toMatchObject({
        name: 'members',
        type: { kind: 'relation', target: '$users', isArray: true }
      })
    })
  })

  describe('Constraints', () => {
    it('parses required constraint', () => {
      const input = `
$schema:
  title: string, required
`
      const ast = parse(input)
      expect(ast.schema?.fields[0].constraints).toContainEqual({ kind: 'required' })
    })

    it('parses max constraint', () => {
      const input = `
$schema:
  members: $users[], max 10
`
      const ast = parse(input)
      expect(ast.schema?.fields[0].constraints).toContainEqual({ kind: 'max', value: 10 })
    })

    it('parses onDelete cascade', () => {
      const input = `
$schema:
  project: $projects, onDelete cascade
`
      const ast = parse(input)
      expect(ast.schema?.fields[0].constraints).toContainEqual({
        kind: 'onDelete',
        action: 'cascade'
      })
    })

    it('parses onDelete nullify', () => {
      const input = `
$schema:
  assignee: $users, onDelete nullify
`
      const ast = parse(input)
      expect(ast.schema?.fields[0].constraints).toContainEqual({
        kind: 'onDelete',
        action: 'nullify'
      })
    })

    it('parses onDelete restrict', () => {
      const input = `
$schema:
  owner: $users, onDelete restrict
`
      const ast = parse(input)
      expect(ast.schema?.fields[0].constraints).toContainEqual({
        kind: 'onDelete',
        action: 'restrict'
      })
    })

    it('parses multiple constraints', () => {
      const input = `
$schema:
  title: string, required
  assignee: $users, required, onDelete nullify
  members: $users[], max 5
`
      const ast = parse(input)
      expect(ast.schema?.fields).toHaveLength(3)
      expect(ast.schema?.fields[1].constraints).toHaveLength(2)
    })
  })

  describe('Full Schema with Data Entries', () => {
    it('parses schema followed by data entries', () => {
      const input = `
$schema:
  title: string, required
  assignee: $users

$task1:
  title: "Design Review"
  assignee: $users.toni
`
      const ast = parse(input)
      expect(ast.schema?.fields).toHaveLength(2)
      // Data entries should still be parsed as tokens/data objects
      expect(ast.tokens.some(t => t.name === '$task1')).toBe(true)
    })
  })
})
