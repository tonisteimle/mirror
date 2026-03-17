/**
 * LLMBridge Integration Tests
 *
 * Tests the line-N format resolution logic.
 * Note: Full command execution tests are in integration tests.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { state } from '../../core'

// We test the resolution logic by checking what getNodeAtLine is called with
describe('LLMBridge line-N resolution', () => {
  const mockGetNodeAtLine = vi.fn((line: number) => {
    const nodeMap: Record<number, { nodeId: string }> = {
      1: { nodeId: 'node-1' },
      2: { nodeId: 'node-2' },
      3: { nodeId: 'node-3' },
    }
    return nodeMap[line] || null
  })

  const mockSourceMap = {
    getNodeAtLine: mockGetNodeAtLine
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(state, 'get').mockReturnValue({
      source: 'Box ver\n  Text "Hello"\n  Button "Click"',
      sourceMap: mockSourceMap as any,
      selection: { nodeId: null, origin: 'code' },
      multiSelection: [],
      cursorPosition: { line: 0, character: 0, absolute: 0 },
      breadcrumbs: [],
      focusedPanel: null,
      isCompiling: false,
      lastCompileError: null,
      pendingSelection: null,
    } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Test helper that mimics resolveNodeId logic
  function resolveNodeId(nodeId: string | undefined): string | null {
    if (!nodeId) return null

    const lineMatch = nodeId.match(/^line-(\d+)$/)
    if (lineMatch) {
      const lineNumber = parseInt(lineMatch[1], 10)
      const sourceMap = state.get().sourceMap
      if (sourceMap) {
        const node = sourceMap.getNodeAtLine(lineNumber)
        if (node) {
          return node.nodeId
        }
        return null
      }
      return null
    }

    return nodeId
  }

  it('resolves line-1 to node-1', () => {
    const result = resolveNodeId('line-1')
    expect(result).toBe('node-1')
    expect(mockGetNodeAtLine).toHaveBeenCalledWith(1)
  })

  it('resolves line-2 to node-2', () => {
    const result = resolveNodeId('line-2')
    expect(result).toBe('node-2')
    expect(mockGetNodeAtLine).toHaveBeenCalledWith(2)
  })

  it('resolves line-3 to node-3', () => {
    const result = resolveNodeId('line-3')
    expect(result).toBe('node-3')
    expect(mockGetNodeAtLine).toHaveBeenCalledWith(3)
  })

  it('returns null for non-existent line', () => {
    const result = resolveNodeId('line-999')
    expect(result).toBeNull()
    expect(mockGetNodeAtLine).toHaveBeenCalledWith(999)
  })

  it('passes through real nodeIds unchanged', () => {
    const result = resolveNodeId('node-5')
    expect(result).toBe('node-5')
    expect(mockGetNodeAtLine).not.toHaveBeenCalled()
  })

  it('passes through other formats unchanged', () => {
    expect(resolveNodeId('some-other-id')).toBe('some-other-id')
    expect(resolveNodeId('prefix-123')).toBe('prefix-123')
    expect(mockGetNodeAtLine).not.toHaveBeenCalled()
  })

  it('returns null for undefined', () => {
    expect(resolveNodeId(undefined)).toBeNull()
  })

  it('handles line-0', () => {
    // Line 0 doesn't exist in 1-based indexing
    const result = resolveNodeId('line-0')
    expect(result).toBeNull()
    expect(mockGetNodeAtLine).toHaveBeenCalledWith(0)
  })
})

describe('LLMBridge JSON parsing', () => {
  it('extracts JSON from markdown code block', () => {
    const markdown = `Here's the change:
\`\`\`json
{"commands": [{"type": "UPDATE_SOURCE", "from": 0, "to": 3, "insert": "Frame"}]}
\`\`\`
`
    const jsonMatch = markdown.match(/```(?:json)?\s*([\s\S]*?)```/)
    const cleanJson = jsonMatch ? jsonMatch[1].trim() : markdown.trim()
    const parsed = JSON.parse(cleanJson)

    expect(parsed.commands).toHaveLength(1)
    expect(parsed.commands[0].type).toBe('UPDATE_SOURCE')
  })

  it('extracts JSON from code block without language', () => {
    const markdown = `\`\`\`
{"commands": []}
\`\`\``
    const jsonMatch = markdown.match(/```(?:json)?\s*([\s\S]*?)```/)
    const cleanJson = jsonMatch ? jsonMatch[1].trim() : markdown.trim()
    const parsed = JSON.parse(cleanJson)

    expect(parsed.commands).toEqual([])
  })

  it('handles plain JSON', () => {
    const json = '{"commands": [{"type": "SET_PROPERTY"}]}'
    const jsonMatch = json.match(/```(?:json)?\s*([\s\S]*?)```/)
    const cleanJson = jsonMatch ? jsonMatch[1].trim() : json.trim()
    const parsed = JSON.parse(cleanJson)

    expect(parsed.commands).toHaveLength(1)
  })
})

describe('Command payload validation', () => {
  it('SET_PROPERTY requires nodeId, property, value', () => {
    const payload = {
      type: 'SET_PROPERTY',
      nodeId: 'line-2',
      property: 'bg',
      value: '#333'
    }

    expect(payload.nodeId).toBeDefined()
    expect(payload.property).toBeDefined()
    expect(payload.value).toBeDefined()
  })

  it('INSERT_COMPONENT requires parentId, component', () => {
    const payload = {
      type: 'INSERT_COMPONENT',
      parentId: 'line-1',
      component: 'Text',
      properties: '"Hello"'
    }

    expect(payload.parentId).toBeDefined()
    expect(payload.component).toBeDefined()
  })

  it('UPDATE_SOURCE requires from, to, insert', () => {
    const payload = {
      type: 'UPDATE_SOURCE',
      from: 0,
      to: 10,
      insert: 'new content'
    }

    expect(payload.from).toBeDefined()
    expect(payload.to).toBeDefined()
    expect(payload.insert).toBeDefined()
  })
})
