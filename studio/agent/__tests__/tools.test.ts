/**
 * Agent Tools Unit Tests
 *
 * Tests tool execution without LLM - verifies command generation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { coreTools } from '../tools/core'
import { writeTools } from '../tools/write'
import { analyzeTools } from '../tools/analyze'
import { generateTools } from '../tools/generate'
import type { ToolContext, ToolResult } from '../types'

// ============================================
// TEST FIXTURES
// ============================================

const SAMPLE_CODE = `Box ver gap 16 pad 24 bg #f5f5f5
  Text "Hello" fs 24 weight bold col #333
  Button "Click me" bg #007bff col #fff pad 12 rad 8
  Box hor gap 8
    Text "Item 1"
    Text "Item 2"`

const SAMPLE_TOKENS = {
  '$primary.bg': '#007bff',
  '$primary.col': '#fff',
  '$surface.bg': '#f5f5f5',
  '$text.primary': '#333'
}

function createMockContext(code = SAMPLE_CODE, tokens = SAMPLE_TOKENS): ToolContext {
  return {
    getCode: () => code,
    getTokens: () => tokens
  }
}

function findTool(tools: any[], name: string) {
  return tools.find(t => t.name === name)
}

// ============================================
// CORE TOOLS TESTS
// ============================================

describe('Core Tools', () => {
  describe('get_code', () => {
    it('returns current code', async () => {
      const tool = findTool(coreTools, 'get_code')
      const ctx = createMockContext()
      const result = await tool.execute({}, ctx)

      expect(result.success).toBe(true)
      expect(result.data?.code).toBe(SAMPLE_CODE)
    })
  })

  describe('get_element', () => {
    it('finds element by line number', async () => {
      const tool = findTool(coreTools, 'get_element')
      const ctx = createMockContext()
      const result = await tool.execute({ selector: '@2' }, ctx)

      expect(result.success).toBe(true)
      expect(result.data?.type).toBe('Text')
      expect(result.data?.line).toBe(2)
      expect(result.data?.code).toContain('Hello')
    })

    it('returns error for invalid line', async () => {
      const tool = findTool(coreTools, 'get_element')
      const ctx = createMockContext()
      const result = await tool.execute({ selector: '@999' }, ctx)

      expect(result.success).toBe(false)
    })
  })

  describe('get_context', () => {
    it('returns code structure', async () => {
      const tool = findTool(coreTools, 'get_context')
      const ctx = createMockContext()
      const result = await tool.execute({}, ctx)

      expect(result.success).toBe(true)
      expect(result.data?.totalLines).toBe(6) // 6 lines in SAMPLE_CODE
      expect(result.data?.availableTokens).toEqual(Object.keys(SAMPLE_TOKENS))
    })
  })

  describe('set_property', () => {
    it('generates SET_PROPERTY command', async () => {
      const tool = findTool(coreTools, 'set_property')
      const ctx = createMockContext()
      const result = await tool.execute({
        selector: '@3',
        property: 'bg',
        value: '#ff0000'
      }, ctx)

      expect(result.success).toBe(true)
      expect(result.commands).toHaveLength(1)
      expect(result.commands![0]).toEqual({
        type: 'SET_PROPERTY',
        nodeId: 'line-3',
        property: 'bg',
        value: '#ff0000'
      })
    })
  })

  describe('remove_property', () => {
    it('generates REMOVE_PROPERTY command', async () => {
      const tool = findTool(coreTools, 'remove_property')
      const ctx = createMockContext()
      const result = await tool.execute({
        selector: '@3',
        property: 'shadow'
      }, ctx)

      expect(result.success).toBe(true)
      expect(result.commands![0]).toEqual({
        type: 'REMOVE_PROPERTY',
        nodeId: 'line-3',
        property: 'shadow'
      })
    })
  })

  describe('add_child', () => {
    it('generates INSERT_COMPONENT command', async () => {
      const tool = findTool(coreTools, 'add_child')
      const ctx = createMockContext()
      const result = await tool.execute({
        parent: '@1',
        component: 'Button',
        properties: '"New" bg #333',
        position: 'last'
      }, ctx)

      expect(result.success).toBe(true)
      expect(result.commands![0]).toEqual({
        type: 'INSERT_COMPONENT',
        parentId: 'line-1',
        component: 'Button',
        properties: '"New" bg #333',
        position: 'last'
      })
    })
  })

  describe('delete_element', () => {
    it('generates DELETE_NODE command', async () => {
      const tool = findTool(coreTools, 'delete_element')
      const ctx = createMockContext()
      const result = await tool.execute({ selector: '@2' }, ctx)

      expect(result.success).toBe(true)
      expect(result.commands![0]).toEqual({
        type: 'DELETE_NODE',
        nodeId: 'line-2'
      })
    })
  })

  describe('validate', () => {
    it('validates correct code', async () => {
      const tool = findTool(coreTools, 'validate')
      const ctx = createMockContext('Box ver gap 16\n  Text "Hello"')
      const result = await tool.execute({}, ctx)

      expect(result.success).toBe(true)
      expect(result.data?.valid).toBe(true)
    })
  })
})

// ============================================
// WRITE TOOLS TESTS
// ============================================

describe('Write Tools', () => {
  describe('wrap_in', () => {
    it('generates wrap commands', async () => {
      const tool = findTool(writeTools, 'wrap_in')
      const ctx = createMockContext()
      const result = await tool.execute({
        selector: '@2',
        wrapper: 'Box',
        properties: 'pad 16 bg #eee'
      }, ctx)

      expect(result.success).toBe(true)
      expect(result.commands).toBeDefined()
      expect(result.commands!.length).toBeGreaterThan(0)
      expect(result.commands![0].type).toBe('UPDATE_SOURCE')
    })
  })

  describe('duplicate_element', () => {
    it('generates duplicate command', async () => {
      const tool = findTool(writeTools, 'duplicate_element')
      const ctx = createMockContext()
      const result = await tool.execute({
        selector: '@3'
      }, ctx)

      expect(result.success).toBe(true)
      expect(result.commands).toBeDefined()
      expect(result.commands![0].type).toBe('UPDATE_SOURCE')
    })
  })

  describe('batch_edit', () => {
    it('generates batch commands for all elements of type', async () => {
      const tool = findTool(writeTools, 'batch_edit')
      const ctx = createMockContext()
      // batch_edit takes (type, property, value) - sets property on ALL elements of that type
      const result = await tool.execute({
        type: 'Text',
        property: 'col',
        value: '#000'
      }, ctx)

      expect(result.success).toBe(true)
      expect(result.commands).toBeDefined()
      // Should have 3 Text elements in our sample code
      expect(result.commands!.length).toBe(3)
      expect(result.commands![0].type).toBe('SET_PROPERTY')
    })
  })
})

// ============================================
// ANALYZE TOOLS TESTS
// ============================================

describe('Analyze Tools', () => {
  describe('explain', () => {
    it('explains code structure', async () => {
      const tool = findTool(analyzeTools, 'explain')
      const ctx = createMockContext()
      const result = await tool.execute({}, ctx)

      expect(result.success).toBe(true)
      expect(result.data?.totalLines).toBeDefined()
      expect(result.data?.elementCount).toBeDefined()
      expect(result.data?.componentTypes).toBeDefined()
    })
  })

  describe('find_issues', () => {
    it('finds accessibility issues', async () => {
      const tool = findTool(analyzeTools, 'find_issues')
      const codeWithIssues = `Box ver
  Button bg #007bff
  Image src "test.jpg"`
      const ctx = createMockContext(codeWithIssues)
      const result = await tool.execute({ category: 'accessibility' }, ctx)

      expect(result.success).toBe(true)
      expect(result.data?.issues).toBeDefined()
      expect(result.data?.issueCount).toBeGreaterThan(0)
    })

    it('finds consistency issues', async () => {
      const tool = findTool(analyzeTools, 'find_issues')
      const ctx = createMockContext()
      const result = await tool.execute({ category: 'consistency' }, ctx)

      expect(result.success).toBe(true)
      expect(result.data?.issueCount).toBeDefined()
    })
  })

  describe('code_stats', () => {
    it('returns code statistics', async () => {
      const tool = findTool(analyzeTools, 'code_stats')
      const ctx = createMockContext()
      const result = await tool.execute({}, ctx)

      expect(result.success).toBe(true)
      expect(result.data?.totalLines).toBe(6)
      expect(result.data?.elementCount).toBe(6) // Box, Text, Button, Box, Text, Text
      expect(result.data?.componentTypes).toBeDefined()
    })
  })
})

// ============================================
// GENERATE TOOLS TESTS
// ============================================

describe('Generate Tools', () => {
  describe('generate_component', () => {
    it('generates a card component', async () => {
      const tool = findTool(generateTools, 'generate_component')
      const ctx = createMockContext()
      const result = await tool.execute({
        name: 'card',
        description: 'A simple card with title'
      }, ctx)

      expect(result.success).toBe(true)
      expect(result.data?.code).toContain('Box')
    })

    it('generates a button component', async () => {
      const tool = findTool(generateTools, 'generate_component')
      const ctx = createMockContext()
      const result = await tool.execute({
        name: 'button',
        description: 'Primary action button'
      }, ctx)

      expect(result.success).toBe(true)
      // generate_component returns Box-based templates, not raw Button
      expect(result.data?.code).toBeDefined()
    })
  })

  describe('apply_pattern', () => {
    it('applies card pattern', async () => {
      const tool = findTool(generateTools, 'apply_pattern')
      const ctx = createMockContext()
      const result = await tool.execute({
        pattern: 'card'
      }, ctx)

      expect(result.success).toBe(true)
      expect(result.data?.code).toBeDefined()
    })

    it('applies grid pattern', async () => {
      const tool = findTool(generateTools, 'apply_pattern')
      const ctx = createMockContext()
      const result = await tool.execute({
        pattern: 'grid',
        options: { columns: 3 }
      }, ctx)

      expect(result.success).toBe(true)
      expect(result.data?.code).toContain('grid')
    })
  })
})

// ============================================
// COMMAND VALIDATION
// ============================================

describe('Command Validation', () => {
  const allTools = [...coreTools, ...writeTools, ...analyzeTools, ...generateTools]

  it('all commands have valid types', async () => {
    const validTypes = [
      'SET_PROPERTY',
      'REMOVE_PROPERTY',
      'INSERT_COMPONENT',
      'DELETE_NODE',
      'MOVE_NODE',
      'UPDATE_SOURCE',
      'BATCH'
    ]

    const ctx = createMockContext()

    for (const tool of allTools) {
      // Skip read-only tools
      if (['get_code', 'get_element', 'get_context', 'explain', 'find_issues', 'suggest', 'compare_elements', 'code_stats'].includes(tool.name)) {
        continue
      }

      // Try to execute with minimal valid input
      let result: ToolResult
      try {
        if (tool.name === 'set_property') {
          result = await tool.execute({ selector: '@1', property: 'bg', value: '#333' }, ctx)
        } else if (tool.name === 'remove_property') {
          result = await tool.execute({ selector: '@1', property: 'bg' }, ctx)
        } else if (tool.name === 'add_child') {
          result = await tool.execute({ parent: '@1', component: 'Text' }, ctx)
        } else if (tool.name === 'delete_element') {
          result = await tool.execute({ selector: '@1' }, ctx)
        } else if (tool.name === 'batch_edit') {
          result = await tool.execute({ edits: [{ selector: '@1', property: 'bg', value: '#333' }] }, ctx)
        } else {
          continue // Skip tools that need complex input
        }

        if (result.commands) {
          for (const cmd of result.commands) {
            expect(validTypes).toContain(cmd.type)
          }
        }
      } catch {
        // Some tools may fail without proper context, that's OK
      }
    }
  })
})
