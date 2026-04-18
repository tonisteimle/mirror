/**
 * Data Integration Tests
 *
 * End-to-end tests for .data file parsing and integration with the compiler.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { parseDataFile, parseDataFiles, mergeDataFiles } from '../../compiler/parser/data-parser'
import { compile, compileProjectWithData } from '../../compiler'
import type { DataFile } from '../../compiler/parser/data-types'

// ============================================================================
// DATA IN OUTPUT
// ============================================================================

describe('Data Integration: Output', () => {
  it('includes data entries in __mirrorData', () => {
    const dataFile: DataFile = {
      filename: 'posts',
      entries: [
        {
          name: 'hello',
          attributes: [
            { key: 'title', value: 'Hello World', line: 2 },
            { key: 'count', value: 42, line: 3 },
          ],
          blocks: [],
          line: 1,
        },
      ],
      errors: [],
    }

    const code = 'Text "Test"'
    const output = compile(code, { dataFiles: [dataFile] })

    // Check that data is in the output
    expect(output).toContain('__mirrorData')
    expect(output).toContain('"posts"')
    expect(output).toContain('"hello"')
    expect(output).toContain('"title": "Hello World"')
    expect(output).toContain('"count": 42')
  })

  it('includes multiple entries', () => {
    const dataFile: DataFile = {
      filename: 'users',
      entries: [
        {
          name: 'admin',
          attributes: [{ key: 'role', value: 'admin', line: 2 }],
          blocks: [],
          line: 1,
        },
        {
          name: 'guest',
          attributes: [{ key: 'role', value: 'guest', line: 5 }],
          blocks: [],
          line: 4,
        },
      ],
      errors: [],
    }

    const output = compile('Text "Test"', { dataFiles: [dataFile] })

    expect(output).toContain('"admin"')
    expect(output).toContain('"guest"')
    expect(output).toContain('"role": "admin"')
    expect(output).toContain('"role": "guest"')
  })

  it('includes multiple data files', () => {
    const dataFiles: DataFile[] = [
      {
        filename: 'posts',
        entries: [
          {
            name: 'first',
            attributes: [{ key: 'title', value: 'First', line: 2 }],
            blocks: [],
            line: 1,
          },
        ],
        errors: [],
      },
      {
        filename: 'users',
        entries: [
          {
            name: 'admin',
            attributes: [{ key: 'name', value: 'Admin', line: 2 }],
            blocks: [],
            line: 1,
          },
        ],
        errors: [],
      },
    ]

    const output = compile('Text "Test"', { dataFiles })

    expect(output).toContain('"posts"')
    expect(output).toContain('"users"')
    expect(output).toContain('"first"')
    expect(output).toContain('"admin"')
  })

  it('includes markdown blocks', () => {
    const dataFile: DataFile = {
      filename: 'content',
      entries: [
        {
          name: 'page',
          attributes: [{ key: 'title', value: 'Page', line: 2 }],
          blocks: [
            {
              name: 'body',
              content: 'This is **markdown**.',
              line: 4,
            },
          ],
          line: 1,
        },
      ],
      errors: [],
    }

    const output = compile('Text "Test"', { dataFiles: [dataFile] })

    expect(output).toContain('"body"')
    expect(output).toContain('This is **markdown**.')
  })
})

// ============================================================================
// $GET ACCESSOR
// ============================================================================

describe('Data Integration: $get Accessor', () => {
  it('$get function is emitted in output', () => {
    const output = compile('Text "Test"')

    expect(output).toContain('function $get(name)')
    expect(output).toContain('__mirrorData')
  })

  it('$get handles nested data access', () => {
    const dataFile: DataFile = {
      filename: 'test',
      entries: [
        {
          name: 'entry',
          attributes: [{ key: 'nested', value: 'value', line: 2 }],
          blocks: [],
          line: 1,
        },
      ],
      errors: [],
    }

    const output = compile('Text "Test"', { dataFiles: [dataFile] })

    // The $get function should handle name.split(".")
    expect(output).toContain('name.split(".")')
    expect(output).toContain('__mirrorData[parts[0]]')
  })
})

// ============================================================================
// MERGE DATA FILES
// ============================================================================

describe('Data Integration: Merge', () => {
  it('merges multiple data files correctly', () => {
    const files: DataFile[] = [
      {
        filename: 'posts',
        entries: [
          {
            name: 'first',
            attributes: [
              { key: 'title', value: 'First Post', line: 2 },
              { key: 'count', value: 10, line: 3 },
            ],
            blocks: [{ name: 'body', content: 'Content here', line: 5 }],
            line: 1,
          },
        ],
        errors: [],
      },
      {
        filename: 'users',
        entries: [
          {
            name: 'admin',
            attributes: [{ key: 'role', value: 'admin', line: 2 }],
            blocks: [],
            line: 1,
          },
        ],
        errors: [],
      },
    ]

    const merged = mergeDataFiles(files)

    expect(merged.posts.first.title).toBe('First Post')
    expect(merged.posts.first.count).toBe(10)
    expect(merged.posts.first.body).toBe('Content here')
    expect(merged.users.admin.role).toBe('admin')
  })

  it('handles arrays in merge', () => {
    const dataSource = `
entry:
tags: [a, b, c]
`
    const parsed = parseDataFile(dataSource, 'test')
    const merged = mergeDataFiles([parsed])

    expect(merged.test.entry.tags).toEqual(['a', 'b', 'c'])
  })

  it('handles booleans in merge', () => {
    const dataSource = `
entry:
active: true
disabled: false
`
    const parsed = parseDataFile(dataSource, 'test')
    const merged = mergeDataFiles([parsed])

    expect(merged.test.entry.active).toBe(true)
    expect(merged.test.entry.disabled).toBe(false)
  })
})

// ============================================================================
// COMBINED WITH TOKENS
// ============================================================================

describe('Data Integration: With Tokens', () => {
  it('includes both tokens and data in __mirrorData', () => {
    const code = `
$primary.bg: #2563eb
Text "Test"
`
    const dataFile: DataFile = {
      filename: 'content',
      entries: [
        {
          name: 'page',
          attributes: [{ key: 'title', value: 'Page', line: 2 }],
          blocks: [],
          line: 1,
        },
      ],
      errors: [],
    }

    const output = compile(code, { dataFiles: [dataFile] })

    // Should have both token and data
    expect(output).toContain('"primary.bg": "#2563eb"')
    expect(output).toContain('"content"')
    expect(output).toContain('"page"')
    expect(output).toContain('"title": "Page"')
  })
})

// ============================================================================
// PROJECT STRUCTURE
// ============================================================================

describe('Data Integration: Project Structure', () => {
  it('compileProjectWithData integrates data files', () => {
    // Mock file system
    const files: Record<string, string> = {
      'data/posts.data': `
first:
title: Hello
`,
      'components/app.mir': `
Text "App"
`,
    }

    const listFiles = (dir: string): string[] => {
      if (dir === 'data') return ['posts.data']
      if (dir === 'components') return ['app.mir']
      return []
    }

    const readFile = (path: string): string | null => {
      return files[path] || null
    }

    const output = compileProjectWithData({ listFiles, readFile })

    expect(output).toContain('"posts"')
    expect(output).toContain('"first"')
    expect(output).toContain('"title": "Hello"')
  })
})

// ============================================================================
// SPECIAL VALUES
// ============================================================================

describe('Data Integration: Special Values', () => {
  it('handles multi-line markdown in output', () => {
    const dataFile: DataFile = {
      filename: 'content',
      entries: [
        {
          name: 'page',
          attributes: [],
          blocks: [
            {
              name: 'body',
              content: 'Line 1\nLine 2\nLine 3',
              line: 3,
            },
          ],
          line: 1,
        },
      ],
      errors: [],
    }

    const output = compile('Text "Test"', { dataFiles: [dataFile] })

    // Multi-line content should use backticks
    expect(output).toContain('`Line 1')
    expect(output).toContain('Line 3`')
  })

  it('escapes special characters in strings', () => {
    const dataFile: DataFile = {
      filename: 'test',
      entries: [
        {
          name: 'entry',
          attributes: [{ key: 'text', value: 'Quote: "Hello"', line: 2 }],
          blocks: [],
          line: 1,
        },
      ],
      errors: [],
    }

    const output = compile('Text "Test"', { dataFiles: [dataFile] })

    // Quotes should be escaped
    expect(output).toContain('\\"Hello\\"')
  })
})

// ============================================================================
// ERROR HANDLING
// ============================================================================

describe('Data Integration: Errors', () => {
  it('compiles without data files', () => {
    const output = compile('Text "Test"')

    expect(output).toContain('__mirrorData')
    // Check for actual undefined values being assigned (not comparison checks like typeof !== "undefined")
    // Pattern: assignment of literal "undefined" string, but not comparison operators
    expect(output).not.toMatch(/[^!=]= "undefined"/)
    expect(output).not.toMatch(/: "undefined"/)
  })

  it('handles empty data files array', () => {
    const output = compile('Text "Test"', { dataFiles: [] })

    expect(output).toContain('__mirrorData')
    expect(output).toBeDefined()
  })

  it('handles data file with errors gracefully', () => {
    const dataFile: DataFile = {
      filename: 'test',
      entries: [],
      errors: [{ message: 'Parse error', line: 1 }],
    }

    // Should not throw
    const output = compile('Text "Test"', { dataFiles: [dataFile] })
    expect(output).toBeDefined()
  })
})

// ============================================================================
// EXTENDED OUTPUT TESTS
// ============================================================================

describe('Data Integration: Extended Output', () => {
  it('handles deeply nested data structure', () => {
    const dataFile: DataFile = {
      filename: 'config',
      entries: [
        {
          name: 'settings',
          attributes: [
            { key: 'theme', value: 'dark', line: 2 },
            { key: 'version', value: 1, line: 3 },
            { key: 'enabled', value: true, line: 4 },
          ],
          blocks: [],
          line: 1,
        },
      ],
      errors: [],
    }

    const output = compile('Text "Test"', { dataFiles: [dataFile] })

    expect(output).toContain('"config"')
    expect(output).toContain('"settings"')
    expect(output).toContain('"theme": "dark"')
    expect(output).toContain('"version": 1')
    expect(output).toContain('"enabled": true')
  })

  it('handles data with multiple blocks', () => {
    const dataFile: DataFile = {
      filename: 'article',
      entries: [
        {
          name: 'post',
          attributes: [{ key: 'title', value: 'Article', line: 2 }],
          blocks: [
            { name: 'intro', content: 'Introduction text', line: 4 },
            { name: 'body', content: 'Main body text', line: 7 },
            { name: 'conclusion', content: 'Conclusion text', line: 10 },
          ],
          line: 1,
        },
      ],
      errors: [],
    }

    const output = compile('Text "Test"', { dataFiles: [dataFile] })

    expect(output).toContain('"intro"')
    expect(output).toContain('Introduction text')
    expect(output).toContain('"body"')
    expect(output).toContain('Main body text')
    expect(output).toContain('"conclusion"')
    expect(output).toContain('Conclusion text')
  })

  it('handles array values in output', () => {
    const dataFile: DataFile = {
      filename: 'tags',
      entries: [
        {
          name: 'post',
          attributes: [{ key: 'categories', value: ['tech', 'design', 'code'], line: 2 }],
          blocks: [],
          line: 1,
        },
      ],
      errors: [],
    }

    const output = compile('Text "Test"', { dataFiles: [dataFile] })

    expect(output).toContain('"categories"')
    // Arrays are serialized without spaces
    expect(output).toContain('["tech","design","code"]')
  })

  it('handles boolean values correctly', () => {
    const dataFile: DataFile = {
      filename: 'flags',
      entries: [
        {
          name: 'feature',
          attributes: [
            { key: 'enabled', value: true, line: 2 },
            { key: 'deprecated', value: false, line: 3 },
          ],
          blocks: [],
          line: 1,
        },
      ],
      errors: [],
    }

    const output = compile('Text "Test"', { dataFiles: [dataFile] })

    expect(output).toContain('"enabled": true')
    expect(output).toContain('"deprecated": false')
  })

  it('handles numeric values correctly', () => {
    const dataFile: DataFile = {
      filename: 'stats',
      entries: [
        {
          name: 'metrics',
          attributes: [
            { key: 'count', value: 42, line: 2 },
            { key: 'score', value: 3.14, line: 3 },
            { key: 'zero', value: 0, line: 4 },
            { key: 'negative', value: -10, line: 5 },
          ],
          blocks: [],
          line: 1,
        },
      ],
      errors: [],
    }

    const output = compile('Text "Test"', { dataFiles: [dataFile] })

    expect(output).toContain('"count": 42')
    expect(output).toContain('"score": 3.14')
    expect(output).toContain('"zero": 0')
    expect(output).toContain('"negative": -10')
  })

  it('handles many entries in one file', () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({
      name: `entry${i}`,
      attributes: [
        { key: 'index', value: i, line: i * 3 + 2 },
        { key: 'label', value: `Label ${i}`, line: i * 3 + 3 },
      ],
      blocks: [],
      line: i * 3 + 1,
    }))

    const dataFile: DataFile = {
      filename: 'collection',
      entries,
      errors: [],
    }

    const output = compile('Text "Test"', { dataFiles: [dataFile] })

    expect(output).toContain('"entry0"')
    expect(output).toContain('"entry19"')
    expect(output).toContain('"index": 0')
    expect(output).toContain('"index": 19')
  })
})

// ============================================================================
// EXTENDED MERGE TESTS
// ============================================================================

describe('Data Integration: Extended Merge', () => {
  it('merges many data files', () => {
    const files: DataFile[] = Array.from({ length: 5 }, (_, i) => ({
      filename: `file${i}`,
      entries: [
        {
          name: 'entry',
          attributes: [{ key: 'index', value: i, line: 2 }],
          blocks: [],
          line: 1,
        },
      ],
      errors: [],
    }))

    const merged = mergeDataFiles(files)

    expect(merged.file0.entry.index).toBe(0)
    expect(merged.file4.entry.index).toBe(4)
  })

  it('handles entries with same name in different files', () => {
    const files: DataFile[] = [
      {
        filename: 'posts',
        entries: [
          {
            name: 'featured',
            attributes: [{ key: 'type', value: 'post', line: 2 }],
            blocks: [],
            line: 1,
          },
        ],
        errors: [],
      },
      {
        filename: 'users',
        entries: [
          {
            name: 'featured',
            attributes: [{ key: 'type', value: 'user', line: 2 }],
            blocks: [],
            line: 1,
          },
        ],
        errors: [],
      },
    ]

    const merged = mergeDataFiles(files)

    // Same entry name in different files should be kept separate
    expect(merged.posts.featured.type).toBe('post')
    expect(merged.users.featured.type).toBe('user')
  })

  it('handles empty entries', () => {
    const dataFile: DataFile = {
      filename: 'test',
      entries: [
        {
          name: 'empty',
          attributes: [],
          blocks: [],
          line: 1,
        },
      ],
      errors: [],
    }

    const merged = mergeDataFiles([dataFile])

    expect(merged.test.empty).toBeDefined()
    expect(Object.keys(merged.test.empty)).toHaveLength(0)
  })

  it('handles entries with only blocks', () => {
    const dataFile: DataFile = {
      filename: 'content',
      entries: [
        {
          name: 'page',
          attributes: [],
          blocks: [{ name: 'content', content: 'Block content', line: 3 }],
          line: 1,
        },
      ],
      errors: [],
    }

    const merged = mergeDataFiles([dataFile])

    expect(merged.content.page.content).toBe('Block content')
  })

  it('handles mixed value types in same entry', () => {
    const dataFile: DataFile = {
      filename: 'mixed',
      entries: [
        {
          name: 'data',
          attributes: [
            { key: 'str', value: 'text', line: 2 },
            { key: 'num', value: 123, line: 3 },
            { key: 'bool', value: true, line: 4 },
            { key: 'arr', value: ['a', 'b'], line: 5 },
          ],
          blocks: [{ name: 'md', content: 'Markdown', line: 7 }],
          line: 1,
        },
      ],
      errors: [],
    }

    const merged = mergeDataFiles([dataFile])

    expect(merged.mixed.data.str).toBe('text')
    expect(merged.mixed.data.num).toBe(123)
    expect(merged.mixed.data.bool).toBe(true)
    expect(merged.mixed.data.arr).toEqual(['a', 'b'])
    expect(merged.mixed.data.md).toBe('Markdown')
  })

  it('handles array with special characters', () => {
    const dataFile: DataFile = {
      filename: 'test',
      entries: [
        {
          name: 'entry',
          attributes: [{ key: 'tags', value: ['hello world', 'foo-bar', 'test_123'], line: 2 }],
          blocks: [],
          line: 1,
        },
      ],
      errors: [],
    }

    const merged = mergeDataFiles([dataFile])

    expect(merged.test.entry.tags).toEqual(['hello world', 'foo-bar', 'test_123'])
  })
})

// ============================================================================
// PROJECT STRUCTURE EXTENDED
// ============================================================================

describe('Data Integration: Extended Project Structure', () => {
  it('handles multiple data files in project', () => {
    const files: Record<string, string> = {
      'data/posts.data': `
first:
title: First Post

second:
title: Second Post
`,
      'data/users.data': `
admin:
name: Admin User
`,
      'components/app.mir': 'Text "App"',
    }

    const listFiles = (dir: string): string[] => {
      if (dir === 'data') return ['posts.data', 'users.data']
      if (dir === 'components') return ['app.mir']
      return []
    }

    const readFile = (path: string): string | null => files[path] || null

    const output = compileProjectWithData({ listFiles, readFile })

    expect(output).toContain('"posts"')
    expect(output).toContain('"users"')
    expect(output).toContain('"first"')
    expect(output).toContain('"second"')
    expect(output).toContain('"admin"')
  })

  it('handles empty data directory', () => {
    const files: Record<string, string> = {
      'components/app.mir': 'Text "App"',
    }

    const listFiles = (dir: string): string[] => {
      if (dir === 'components') return ['app.mir']
      return []
    }

    const readFile = (path: string): string | null => files[path] || null

    const output = compileProjectWithData({ listFiles, readFile })

    expect(output).toBeDefined()
    expect(output).toContain('__mirrorData')
  })

  it('handles data files with markdown blocks', () => {
    const files: Record<string, string> = {
      'data/content.data': `
page:
title: Welcome

@intro
This is **bold** intro.

@body
Main content here.
`,
      'components/app.mir': 'Text "App"',
    }

    const listFiles = (dir: string): string[] => {
      if (dir === 'data') return ['content.data']
      if (dir === 'components') return ['app.mir']
      return []
    }

    const readFile = (path: string): string | null => files[path] || null

    const output = compileProjectWithData({ listFiles, readFile })

    expect(output).toContain('"content"')
    expect(output).toContain('"page"')
    expect(output).toContain('"intro"')
    expect(output).toContain('"body"')
  })
})

// ============================================================================
// SPECIAL VALUES EXTENDED
// ============================================================================

describe('Data Integration: Extended Special Values', () => {
  it('handles empty strings', () => {
    const dataFile: DataFile = {
      filename: 'test',
      entries: [
        {
          name: 'entry',
          attributes: [{ key: 'empty', value: '', line: 2 }],
          blocks: [],
          line: 1,
        },
      ],
      errors: [],
    }

    const output = compile('Text "Test"', { dataFiles: [dataFile] })

    expect(output).toContain('"empty": ""')
  })

  it('handles special characters in strings', () => {
    const dataFile: DataFile = {
      filename: 'test',
      entries: [
        {
          name: 'entry',
          attributes: [
            { key: 'newline', value: 'Line1\nLine2', line: 2 },
            { key: 'tab', value: 'Col1\tCol2', line: 3 },
          ],
          blocks: [],
          line: 1,
        },
      ],
      errors: [],
    }

    const output = compile('Text "Test"', { dataFiles: [dataFile] })

    expect(output).toBeDefined()
  })

  it('handles unicode in strings', () => {
    const dataFile: DataFile = {
      filename: 'i18n',
      entries: [
        {
          name: 'labels',
          attributes: [
            { key: 'german', value: 'Über', line: 2 },
            { key: 'japanese', value: '日本語', line: 3 },
            { key: 'emoji', value: '👋🌍', line: 4 },
          ],
          blocks: [],
          line: 1,
        },
      ],
      errors: [],
    }

    const output = compile('Text "Test"', { dataFiles: [dataFile] })

    expect(output).toContain('Über')
    expect(output).toContain('日本語')
    expect(output).toContain('👋🌍')
  })

  it('handles long markdown blocks', () => {
    const longContent = 'Paragraph. '.repeat(100)
    const dataFile: DataFile = {
      filename: 'content',
      entries: [
        {
          name: 'article',
          attributes: [],
          blocks: [{ name: 'body', content: longContent, line: 3 }],
          line: 1,
        },
      ],
      errors: [],
    }

    const output = compile('Text "Test"', { dataFiles: [dataFile] })

    expect(output).toContain('"body"')
  })

  it('handles empty array', () => {
    const dataFile: DataFile = {
      filename: 'test',
      entries: [
        {
          name: 'entry',
          attributes: [{ key: 'tags', value: [], line: 2 }],
          blocks: [],
          line: 1,
        },
      ],
      errors: [],
    }

    const output = compile('Text "Test"', { dataFiles: [dataFile] })

    expect(output).toContain('"tags"')
    expect(output).toContain('[]')
  })

  it('handles single-item array', () => {
    const dataFile: DataFile = {
      filename: 'test',
      entries: [
        {
          name: 'entry',
          attributes: [{ key: 'tags', value: ['single'], line: 2 }],
          blocks: [],
          line: 1,
        },
      ],
      errors: [],
    }

    const output = compile('Text "Test"', { dataFiles: [dataFile] })

    expect(output).toContain('["single"]')
  })
})

// ============================================================================
// COMBINED WITH TOKENS EXTENDED
// ============================================================================

describe('Data Integration: Extended Token Combination', () => {
  it('handles multiple tokens with data', () => {
    const code = `
$primary.bg: #2563eb
$secondary.bg: #10b981
$text.col: white
Text "Test"
`
    const dataFile: DataFile = {
      filename: 'content',
      entries: [
        {
          name: 'page',
          attributes: [{ key: 'title', value: 'Page', line: 2 }],
          blocks: [],
          line: 1,
        },
      ],
      errors: [],
    }

    const output = compile(code, { dataFiles: [dataFile] })

    expect(output).toContain('"primary.bg": "#2563eb"')
    expect(output).toContain('"secondary.bg": "#10b981"')
    expect(output).toContain('"text.col": "white"')
    expect(output).toContain('"content"')
    expect(output).toContain('"page"')
  })

  it('tokens and data do not conflict', () => {
    // Token name might look like data path, but they are separate
    const code = `
$posts.bg: #1a1a1a
Text "Test"
`
    const dataFile: DataFile = {
      filename: 'posts',
      entries: [
        {
          name: 'first',
          attributes: [{ key: 'title', value: 'First', line: 2 }],
          blocks: [],
          line: 1,
        },
      ],
      errors: [],
    }

    const output = compile(code, { dataFiles: [dataFile] })

    // Token with posts prefix
    expect(output).toContain('"posts.bg": "#1a1a1a"')
    // Data file named posts
    expect(output).toContain('"posts"')
    expect(output).toContain('"first"')
  })
})

// ============================================================================
// REAL-WORLD SCENARIOS
// ============================================================================

describe('Data Integration: Real-World Scenarios', () => {
  it('blog scenario - multiple posts with metadata and content', () => {
    const dataFiles: DataFile[] = [
      {
        filename: 'posts',
        entries: [
          {
            name: 'getting-started',
            attributes: [
              { key: 'title', value: 'Getting Started', line: 2 },
              { key: 'author', value: 'John Doe', line: 3 },
              { key: 'date', value: '2024-01-15', line: 4 },
              { key: 'tags', value: ['tutorial', 'beginner'], line: 5 },
            ],
            blocks: [
              { name: 'intro', content: 'Welcome to **Mirror**!', line: 7 },
              { name: 'body', content: 'Main tutorial content here.', line: 10 },
            ],
            line: 1,
          },
          {
            name: 'advanced-features',
            attributes: [
              { key: 'title', value: 'Advanced Features', line: 14 },
              { key: 'author', value: 'Jane Smith', line: 15 },
              { key: 'date', value: '2024-01-20', line: 16 },
              { key: 'tags', value: ['advanced', 'deep-dive'], line: 17 },
            ],
            blocks: [{ name: 'body', content: 'Advanced content.', line: 19 }],
            line: 13,
          },
        ],
        errors: [],
      },
      {
        filename: 'authors',
        entries: [
          {
            name: 'john-doe',
            attributes: [
              { key: 'name', value: 'John Doe', line: 2 },
              { key: 'bio', value: 'Technical writer', line: 3 },
            ],
            blocks: [],
            line: 1,
          },
          {
            name: 'jane-smith',
            attributes: [
              { key: 'name', value: 'Jane Smith', line: 6 },
              { key: 'bio', value: 'Senior developer', line: 7 },
            ],
            blocks: [],
            line: 5,
          },
        ],
        errors: [],
      },
    ]

    const output = compile('Text "Blog"', { dataFiles })

    // Posts data
    expect(output).toContain('"posts"')
    expect(output).toContain('"getting-started"')
    expect(output).toContain('"advanced-features"')
    expect(output).toContain('"title": "Getting Started"')
    expect(output).toContain('["tutorial","beginner"]')

    // Authors data
    expect(output).toContain('"authors"')
    expect(output).toContain('"john-doe"')
    expect(output).toContain('"jane-smith"')
  })

  it('e-commerce scenario - products with variants', () => {
    const dataFile: DataFile = {
      filename: 'products',
      entries: [
        {
          name: 'shirt-basic',
          attributes: [
            { key: 'name', value: 'Basic T-Shirt', line: 2 },
            { key: 'price', value: 29.99, line: 3 },
            { key: 'inStock', value: true, line: 4 },
            { key: 'sizes', value: ['S', 'M', 'L', 'XL'], line: 5 },
          ],
          blocks: [{ name: 'description', content: 'A comfortable **cotton** t-shirt.', line: 7 }],
          line: 1,
        },
        {
          name: 'pants-slim',
          attributes: [
            { key: 'name', value: 'Slim Fit Pants', line: 11 },
            { key: 'price', value: 59.99, line: 12 },
            { key: 'inStock', value: false, line: 13 },
            { key: 'sizes', value: ['30', '32', '34'], line: 14 },
          ],
          blocks: [],
          line: 10,
        },
      ],
      errors: [],
    }

    const output = compile('Text "Shop"', { dataFiles: [dataFile] })

    expect(output).toContain('"products"')
    expect(output).toContain('"shirt-basic"')
    expect(output).toContain('"name": "Basic T-Shirt"')
    expect(output).toContain('"price": 29.99')
    expect(output).toContain('"inStock": true')
    expect(output).toContain('["S","M","L","XL"]')
    expect(output).toContain('"pants-slim"')
    expect(output).toContain('"inStock": false')
  })

  it('documentation scenario - structured API docs', () => {
    const dataFile: DataFile = {
      filename: 'api',
      entries: [
        {
          name: 'compile',
          attributes: [
            { key: 'method', value: 'compile(code, options)', line: 2 },
            { key: 'returns', value: 'string', line: 3 },
            { key: 'since', value: '1.0.0', line: 4 },
          ],
          blocks: [
            { name: 'description', content: 'Compiles Mirror code to JavaScript.', line: 6 },
            { name: 'example', content: '```\nconst js = compile("Text Hello")\n```', line: 9 },
          ],
          line: 1,
        },
        {
          name: 'parse',
          attributes: [
            { key: 'method', value: 'parse(code)', line: 14 },
            { key: 'returns', value: 'AST', line: 15 },
            { key: 'since', value: '1.0.0', line: 16 },
          ],
          blocks: [{ name: 'description', content: 'Parses Mirror code into an AST.', line: 18 }],
          line: 13,
        },
      ],
      errors: [],
    }

    const output = compile('Text "API Docs"', { dataFiles: [dataFile] })

    expect(output).toContain('"api"')
    expect(output).toContain('"compile"')
    expect(output).toContain('"parse"')
    expect(output).toContain('"method": "compile(code, options)"')
    expect(output).toContain('"returns": "string"')
    expect(output).toContain('"since": "1.0.0"')
  })

  it('settings scenario - app configuration', () => {
    const dataFile: DataFile = {
      filename: 'settings',
      entries: [
        {
          name: 'appearance',
          attributes: [
            { key: 'theme', value: 'dark', line: 2 },
            { key: 'fontSize', value: 14, line: 3 },
            { key: 'showSidebar', value: true, line: 4 },
          ],
          blocks: [],
          line: 1,
        },
        {
          name: 'editor',
          attributes: [
            { key: 'tabSize', value: 2, line: 7 },
            { key: 'wordWrap', value: true, line: 8 },
            { key: 'language', value: 'typescript', line: 9 },
          ],
          blocks: [],
          line: 6,
        },
      ],
      errors: [],
    }

    const output = compile('Text "Settings"', { dataFiles: [dataFile] })

    expect(output).toContain('"settings"')
    expect(output).toContain('"appearance"')
    expect(output).toContain('"editor"')
    expect(output).toContain('"theme": "dark"')
    expect(output).toContain('"tabSize": 2')
    expect(output).toContain('"wordWrap": true')
  })
})

// ============================================================================
// STRESS TESTS
// ============================================================================

describe('Data Integration: Stress Tests', () => {
  it('handles many data files', () => {
    const dataFiles: DataFile[] = Array.from({ length: 20 }, (_, i) => ({
      filename: `file${i}`,
      entries: [
        {
          name: 'entry',
          attributes: [{ key: 'index', value: i, line: 2 }],
          blocks: [],
          line: 1,
        },
      ],
      errors: [],
    }))

    const output = compile('Text "Test"', { dataFiles })

    expect(output).toContain('"file0"')
    expect(output).toContain('"file19"')
  })

  it('handles many entries per file', () => {
    const entries = Array.from({ length: 50 }, (_, i) => ({
      name: `entry${i}`,
      attributes: [{ key: 'value', value: i, line: i * 2 + 2 }],
      blocks: [],
      line: i * 2 + 1,
    }))

    const dataFile: DataFile = {
      filename: 'large',
      entries,
      errors: [],
    }

    const output = compile('Text "Test"', { dataFiles: [dataFile] })

    expect(output).toContain('"entry0"')
    expect(output).toContain('"entry49"')
  })

  it('handles many attributes per entry', () => {
    const attributes = Array.from({ length: 30 }, (_, i) => ({
      key: `attr${i}`,
      value: `value${i}`,
      line: i + 2,
    }))

    const dataFile: DataFile = {
      filename: 'attrs',
      entries: [
        {
          name: 'entry',
          attributes,
          blocks: [],
          line: 1,
        },
      ],
      errors: [],
    }

    const output = compile('Text "Test"', { dataFiles: [dataFile] })

    expect(output).toContain('"attr0": "value0"')
    expect(output).toContain('"attr29": "value29"')
  })

  it('handles complex mixed content', () => {
    const dataFiles: DataFile[] = Array.from({ length: 5 }, (_, fileIndex) => ({
      filename: `data${fileIndex}`,
      entries: Array.from({ length: 10 }, (_, entryIndex) => ({
        name: `entry${entryIndex}`,
        attributes: [
          { key: 'string', value: `String ${fileIndex}-${entryIndex}`, line: 2 },
          { key: 'number', value: fileIndex * 10 + entryIndex, line: 3 },
          { key: 'bool', value: (fileIndex + entryIndex) % 2 === 0, line: 4 },
          { key: 'arr', value: ['a', 'b', 'c'], line: 5 },
        ],
        blocks: [{ name: 'content', content: `Content for ${fileIndex}-${entryIndex}`, line: 7 }],
        line: 1,
      })),
      errors: [],
    }))

    const output = compile('Text "Test"', { dataFiles })

    // Check first file
    expect(output).toContain('"data0"')
    expect(output).toContain('"entry0"')

    // Check last file
    expect(output).toContain('"data4"')
    expect(output).toContain('"entry9"')
  })
})
