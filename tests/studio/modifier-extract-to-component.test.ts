/**
 * Tests for extractToComponentFile functionality
 */

import { describe, it, expect } from 'vitest'
import { CodeModifier, type FilesAccess } from '../../compiler/studio/code-modifier'
import { SourceMapBuilder, type SourceMap } from '../../compiler/ir/source-map'

/**
 * Helper to create a simple SourceMap for testing
 */
function createTestSourceMap(config: {
  nodes: Array<{
    id: string
    componentName: string
    line: number
    endLine: number
    parentId?: string
  }>
}): SourceMap {
  const builder = new SourceMapBuilder()

  for (const node of config.nodes) {
    builder.addNode(node.id, node.componentName, {
      line: node.line,
      column: 1,
      endLine: node.endLine,
      endColumn: 100,
    }, {
      parentId: node.parentId,
    })
  }

  return builder.build()
}

function createMockFilesAccess(files: Record<string, string>, currentFile: string): FilesAccess {
  return {
    getFile: (path: string) => files[path],
    setFile: (path: string, content: string) => { files[path] = content },
    getCurrentFile: () => currentFile,
  }
}

describe('CodeModifier.extractToComponentFile', () => {
  it('extracts inline properties to component definition', () => {
    const source = 'Button pad 12, bg #3B82F6, "Click me"'
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Button', line: 1, endLine: 1 },
      ],
    })
    const codeModifier = new CodeModifier(source, sourceMap)

    const files: Record<string, string> = {}
    const filesAccess = createMockFilesAccess(files, 'index.mirror')

    const result = codeModifier.extractToComponentFile('node-1', filesAccess)

    expect(result.success).toBe(true)
    expect(result.componentFileChange.path).toBe('components.mirror')
    expect(result.componentFileChange.content).toContain('Button: pad 12, bg #3B82F6')
    expect(result.importAdded).toBe(true)

    // The change should include both the import and the simplified instance
    expect(result.currentFileChange.insert).toContain('import components')
    expect(result.currentFileChange.insert).toContain('Button "Click me"')
  })

  it('preserves named instances', () => {
    const source = 'Button named SaveBtn pad 12, bg #3B82F6, "Save"'
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Button', line: 1, endLine: 1 },
      ],
    })
    const codeModifier = new CodeModifier(source, sourceMap)

    const files: Record<string, string> = {}
    const filesAccess = createMockFilesAccess(files, 'index.mirror')

    const result = codeModifier.extractToComponentFile('node-1', filesAccess)

    expect(result.success).toBe(true)
    expect(result.currentFileChange.insert).toContain('Button named SaveBtn "Save"')
  })

  it('does not add import if already present', () => {
    const source = 'import components\nButton pad 12, "Click"'
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Button', line: 2, endLine: 2 },
      ],
    })
    const codeModifier = new CodeModifier(source, sourceMap)

    const files: Record<string, string> = {}
    const filesAccess = createMockFilesAccess(files, 'index.mirror')

    const result = codeModifier.extractToComponentFile('node-1', filesAccess)

    expect(result.success).toBe(true)
    expect(result.importAdded).toBe(false)
    // Should only change the line, not add import
    expect(result.currentFileChange.insert).toBe('Button "Click"')
  })

  it('appends to existing components.mirror', () => {
    const source = 'Card pad 16, bg #333'
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Card', line: 1, endLine: 1 },
      ],
    })
    const codeModifier = new CodeModifier(source, sourceMap)

    const files: Record<string, string> = {
      'components.mirror': 'Button: pad 12, bg #3B82F6\n'
    }
    const filesAccess = createMockFilesAccess(files, 'index.mirror')

    const result = codeModifier.extractToComponentFile('node-1', filesAccess)

    expect(result.success).toBe(true)
    expect(result.componentFileChange.content).toContain('Button: pad 12, bg #3B82F6')
    expect(result.componentFileChange.content).toContain('Card: pad 16, bg #333')
  })

  it('fails for elements without inline properties', () => {
    const source = 'Button "Click"'
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Button', line: 1, endLine: 1 },
      ],
    })
    const codeModifier = new CodeModifier(source, sourceMap)

    const files: Record<string, string> = {}
    const filesAccess = createMockFilesAccess(files, 'index.mirror')

    const result = codeModifier.extractToComponentFile('node-1', filesAccess)

    expect(result.success).toBe(false)
    expect(result.error).toContain('No properties to extract')
  })

  it('handles element with only text content after extraction', () => {
    const source = 'Text col #fff, "Hello World"'
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Text', line: 1, endLine: 1 },
      ],
    })
    const codeModifier = new CodeModifier(source, sourceMap)

    const files: Record<string, string> = {}
    const filesAccess = createMockFilesAccess(files, 'index.mirror')

    const result = codeModifier.extractToComponentFile('node-1', filesAccess)

    expect(result.success).toBe(true)
    expect(result.componentFileChange.content).toContain('Text: col #fff')
    expect(result.currentFileChange.insert).toContain('Text "Hello World"')
  })

  it('handles element without text content', () => {
    const source = 'Box pad 16, bg #333'
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Box', line: 1, endLine: 1 },
      ],
    })
    const codeModifier = new CodeModifier(source, sourceMap)

    const files: Record<string, string> = {}
    const filesAccess = createMockFilesAccess(files, 'index.mirror')

    const result = codeModifier.extractToComponentFile('node-1', filesAccess)

    expect(result.success).toBe(true)
    expect(result.componentFileChange.content).toContain('Box: pad 16, bg #333')
    // Instance should just be the component name
    expect(result.currentFileChange.insert).toContain('import components')
    expect(result.currentFileChange.insert).toMatch(/\nBox$/)
  })
})
