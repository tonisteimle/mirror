/**
 * Table IR Transformation Reality Check
 *
 * Prüft, was die IR-Transformation mit Table-Instanzen macht.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'
import { isIRTable } from '../../compiler/ir/types'
import type { IRNode, IRTable, IR } from '../../compiler/ir/types'

function compileToIR(source: string): IR {
  const ast = parse(source)
  if (ast.errors.length > 0) {
    console.log('Parse errors:', ast.errors)
  }
  return toIR(ast)
}

function findTableInIR(ir: { nodes: IRNode[] }): IRTable | undefined {
  for (const node of ir.nodes) {
    if (isIRTable(node)) {
      return node
    }
    // Check children recursively
    if (node.children) {
      for (const child of node.children) {
        if (isIRTable(child)) {
          return child
        }
      }
    }
  }
  return undefined
}

describe('Table - IR Transformation Reality Check', () => {
  describe('Basic Table IR', () => {
    it('compiles Table $tasks - is IRTable created?', () => {
      const ir = compileToIR(`Table $tasks`)

      console.log('IR nodes count:', ir.nodes.length)
      console.log('First node:', JSON.stringify(ir.nodes[0], null, 2))

      const tableNode = findTableInIR(ir)
      console.log('IRTable found?:', !!tableNode)
      console.log('isTableComponent?:', (ir.nodes[0] as any)?.isTableComponent)
    })

    it('checks IRTable fields if created', () => {
      const ir = compileToIR(`Table $tasks`)

      const tableNode = findTableInIR(ir)

      if (tableNode) {
        console.log('dataSource:', tableNode.dataSource)
        console.log('columns:', tableNode.columns)
        console.log('selectionMode:', tableNode.selectionMode)
      } else {
        console.log('IRTable NOT created - checking regular node:')
        const node = ir.nodes[0]
        console.log('tag:', node?.tag)
        console.log('properties:', node?.properties)
        console.log('data-component?:', node?.properties?.find((p) => p.name === 'data-component'))
      }
    })
  })

  describe('Table with Data', () => {
    it('compiles Table with inline data', () => {
      const ir = compileToIR(`
$tasks: [
  { titel: "Review", effort: 8 }
]

Table $tasks
`)

      console.log('Tokens in IR:', ir.tokens)
      console.log('First node:', JSON.stringify(ir.nodes[0], null, 2))

      const tableNode = findTableInIR(ir)
      if (tableNode) {
        console.log('Columns inferred?:', tableNode.columns)
      }
    })
  })

  describe('Table with Columns', () => {
    it('compiles Table with Column children', () => {
      const ir = compileToIR(`
Table $tasks
  Column titel, w 250
  Column effort, suffix "h"
`)

      console.log('IR:', JSON.stringify(ir.nodes[0], null, 2))

      const tableNode = findTableInIR(ir)
      if (tableNode) {
        console.log('Columns:', tableNode.columns)
      } else {
        // Check if columns are children
        const node = ir.nodes[0]
        console.log('Children count:', node?.children?.length)
        console.log('Children:', node?.children?.map((c) => ({ tag: c.tag, props: c.properties })))
      }
    })
  })

  describe('Table Selection', () => {
    it('compiles Table with select()', () => {
      const ir = compileToIR(`Table $tasks, select()`)

      console.log('IR:', JSON.stringify(ir.nodes[0], null, 2))

      const tableNode = findTableInIR(ir)
      if (tableNode) {
        console.log('selectionMode:', tableNode.selectionMode)
      } else {
        // Check events
        const node = ir.nodes[0]
        console.log('events:', node?.events)
      }
    })
  })
})

describe('Table - Gap Analysis', () => {
  it('documents what IR transformation should do', () => {
    const requirements = [
      {
        input: 'Table $tasks',
        requirement: 'Create IRTable with dataSource="tasks"',
        check: (ir: any) => {
          const table = findTableInIR(ir)
          return table?.dataSource === 'tasks'
        },
      },
      {
        input: `Table $tasks
  Column titel, w 250`,
        requirement: 'IRTable.columns should have titel column with width 250',
        check: (ir: any) => {
          const table = findTableInIR(ir)
          const col = table?.columns?.find((c) => c.field === 'titel')
          return col?.width === 250
        },
      },
      {
        input: 'Table $tasks, select()',
        requirement: 'IRTable.selectionMode should be "single"',
        check: (ir: any) => {
          const table = findTableInIR(ir)
          return table?.selectionMode === 'single'
        },
      },
    ]

    console.log('\n=== IR Transformation Gap Analysis ===\n')

    for (const req of requirements) {
      const ir = compileToIR(req.input)
      const passes = req.check(ir)

      console.log(`Input: ${req.input.split('\n')[0]}...`)
      console.log(`Requirement: ${req.requirement}`)
      console.log(`Status: ${passes ? '✓ PASS' : '✗ FAIL'}`)
      console.log('')
    }

    // This test always passes - documentation only
    expect(true).toBe(true)
  })
})
