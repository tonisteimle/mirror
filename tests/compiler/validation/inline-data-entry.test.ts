/**
 * Tests for inline data entry format support
 *
 * Validates that the entry-based data format works inline in .mirror files:
 *   tasks:
 *     task1:
 *       title: "Design Review"
 *       status: "todo"
 */

import { describe, it, expect } from 'vitest'
import { parse, compile } from '../../../dist/index.js'

describe('Inline Data Entry Format', () => {
  describe('Parsing', () => {
    it('parses simple entry format', () => {
      const source = `
tasks:
  task1:
    title: "Design Review"
    status: "todo"
`
      const ast = parse(source)

      expect(ast.tokens).toHaveLength(1)
      expect(ast.tokens[0].name).toBe('tasks')
      expect(ast.tokens[0].attributes).toBeDefined()
      expect(ast.tokens[0].attributes).toHaveLength(1)
      expect(ast.tokens[0].attributes![0].key).toBe('task1')
      expect(ast.tokens[0].attributes![0].children).toHaveLength(2)
    })

    it('parses multiple entries', () => {
      const source = `
users:
  max:
    name: "Max Mustermann"
    email: "max@example.com"
  anna:
    name: "Anna Schmidt"
    email: "anna@example.com"
`
      const ast = parse(source)

      expect(ast.tokens).toHaveLength(1)
      expect(ast.tokens[0].name).toBe('users')
      expect(ast.tokens[0].attributes).toHaveLength(2)
      expect(ast.tokens[0].attributes![0].key).toBe('max')
      expect(ast.tokens[0].attributes![1].key).toBe('anna')
    })

    it('parses mixed tokens and data', () => {
      const source = `
$primary.bg: #2563eb
$card.rad: 8

tasks:
  task1:
    title: "Test"

Frame bg $primary, rad $card
`
      const ast = parse(source)

      // Should have 3 tokens: primary.bg, card.rad, tasks
      expect(ast.tokens).toHaveLength(3)
      expect(ast.tokens[0].value).toBe('#2563eb')
      expect(ast.tokens[1].value).toBe(8)
      expect(ast.tokens[2].attributes).toBeDefined()
    })
  })

  describe('Compilation', () => {
    it('emits entry data to __mirrorData', () => {
      const source = `
tasks:
  task1:
    title: "Design Review"
    status: "todo"
  task2:
    title: "Code Review"
    status: "doing"

Frame
`
      const html = compile(source)

      expect(html).toContain('"tasks":')
      expect(html).toContain('"task1":')
      expect(html).toContain('"task2":')
      expect(html).toContain('"Design Review"')
      expect(html).toContain('"Code Review"')
    })

    it('supports iteration over entry data', () => {
      const source = `
items:
  a:
    name: "First"
  b:
    name: "Second"

each item in $items
  Text item.name
`
      const html = compile(source)

      expect(html).toContain('"items":')
      expect(html).toContain('"a":')
      expect(html).toContain('"b":')
      // Data is emitted as object, runtime converts with Object.values()
    })

    it('supports nested data structures', () => {
      const source = `
config:
  server:
    host: "localhost"
    port: 3000
  database:
    name: "mydb"

Frame
`
      const html = compile(source)

      expect(html).toContain('"config":')
      expect(html).toContain('"server":')
      expect(html).toContain('"host":')
      expect(html).toContain('"localhost"')
      expect(html).toContain('"port":')
      expect(html).toContain('3000')
    })

    it('handles boolean values', () => {
      const source = `
settings:
  feature1:
    enabled: true
    visible: false

Frame
`
      const html = compile(source)

      expect(html).toContain('"enabled": true')
      expect(html).toContain('"visible": false')
    })

    it('handles numeric values', () => {
      const source = `
metrics:
  stat1:
    count: 42
    ratio: 0.75

Frame
`
      const html = compile(source)

      expect(html).toContain('"count": 42')
      expect(html).toContain('"ratio": 0.75')
    })
  })

  describe('Integration with Table', () => {
    it('Table can reference entry-format data', () => {
      const source = `
tasks:
  task1:
    title: "Design Review"
    status: "todo"

Table $tasks
`
      const html = compile(source)

      // Data should be available for Table
      expect(html).toContain('"tasks":')
      expect(html).toContain('$collection')
    })
  })
})
