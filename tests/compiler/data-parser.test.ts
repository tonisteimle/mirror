/**
 * Data Parser Tests
 *
 * Tests the .data file parser for structured data and markdown content.
 */

import { describe, it, expect } from 'vitest'
import { parseDataFile, parseDataFiles, mergeDataFiles, serializeDataForJS } from '../../compiler/parser/data-parser'
import { DataFile } from '../../compiler/parser/data-types'

// ============================================================================
// BASIC ENTRY PARSING
// ============================================================================

describe('DataParser: Basic Entries', () => {
  it('parses a simple entry with attributes', () => {
    const source = `
my-post:
title: Hello World
author: Max
`
    const result = parseDataFile(source, 'posts')

    expect(result.filename).toBe('posts')
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].name).toBe('my-post')
    expect(result.entries[0].attributes).toHaveLength(2)
    expect(result.entries[0].attributes[0].key).toBe('title')
    expect(result.entries[0].attributes[0].value).toBe('Hello World')
    expect(result.entries[0].attributes[1].key).toBe('author')
    expect(result.entries[0].attributes[1].value).toBe('Max')
    expect(result.errors).toHaveLength(0)
  })

  it('parses multiple entries', () => {
    const source = `
first-post:
title: First Post

second-post:
title: Second Post
`
    const result = parseDataFile(source, 'posts')

    expect(result.entries).toHaveLength(2)
    expect(result.entries[0].name).toBe('first-post')
    expect(result.entries[1].name).toBe('second-post')
    expect(result.errors).toHaveLength(0)
  })

  it('handles entry with no attributes', () => {
    const source = `
empty-entry:
`
    const result = parseDataFile(source, 'test')

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].name).toBe('empty-entry')
    expect(result.entries[0].attributes).toHaveLength(0)
    expect(result.errors).toHaveLength(0)
  })

  it('preserves line numbers', () => {
    const source = `
first:
title: One

second:
title: Two
`
    const result = parseDataFile(source, 'test')

    expect(result.entries[0].line).toBe(2)
    expect(result.entries[1].line).toBe(5)
  })
})

// ============================================================================
// VALUE TYPES
// ============================================================================

describe('DataParser: Value Types', () => {
  it('parses string values', () => {
    const source = `
entry:
text: Hello World
path: /path/to/file
`
    const result = parseDataFile(source, 'test')

    expect(result.entries[0].attributes[0].value).toBe('Hello World')
    expect(result.entries[0].attributes[1].value).toBe('/path/to/file')
  })

  it('parses number values', () => {
    const source = `
entry:
count: 42
price: 19.99
negative: -5
`
    const result = parseDataFile(source, 'test')

    expect(result.entries[0].attributes[0].value).toBe(42)
    expect(result.entries[0].attributes[1].value).toBe(19.99)
    expect(result.entries[0].attributes[2].value).toBe(-5)
  })

  it('parses boolean values', () => {
    const source = `
entry:
active: true
disabled: false
`
    const result = parseDataFile(source, 'test')

    expect(result.entries[0].attributes[0].value).toBe(true)
    expect(result.entries[0].attributes[1].value).toBe(false)
  })

  it('parses array values', () => {
    const source = `
entry:
tags: [a, b, c]
numbers: [1, 2, 3]
`
    const result = parseDataFile(source, 'test')

    expect(result.entries[0].attributes[0].value).toEqual(['a', 'b', 'c'])
    expect(result.entries[0].attributes[1].value).toEqual(['1', '2', '3'])
  })

  it('parses external references', () => {
    const source = `
entry:
body: @external-file
`
    const result = parseDataFile(source, 'test')

    expect(result.entries[0].attributes[0].value).toBe('@external-file')
  })
})

// ============================================================================
// MARKDOWN BLOCKS
// ============================================================================

describe('DataParser: Markdown Blocks', () => {
  it('parses a simple markdown block', () => {
    const source = `
post:
title: My Post

@body
This is **markdown** content.
`
    const result = parseDataFile(source, 'test')

    expect(result.entries[0].blocks).toHaveLength(1)
    expect(result.entries[0].blocks[0].name).toBe('body')
    expect(result.entries[0].blocks[0].content).toBe('This is **markdown** content.')
    expect(result.errors).toHaveLength(0)
  })

  it('parses multiple markdown blocks', () => {
    const source = `
post:
title: My Post

@intro
Introduction here.

@body
Main content here.
`
    const result = parseDataFile(source, 'test')

    expect(result.entries[0].blocks).toHaveLength(2)
    expect(result.entries[0].blocks[0].name).toBe('intro')
    expect(result.entries[0].blocks[0].content).toBe('Introduction here.')
    expect(result.entries[0].blocks[1].name).toBe('body')
    expect(result.entries[0].blocks[1].content).toBe('Main content here.')
  })

  it('preserves multi-line markdown content', () => {
    const source = `
post:
title: Test

@body
Line one.

Line two.

Line three.
`
    const result = parseDataFile(source, 'test')

    expect(result.entries[0].blocks[0].content).toBe('Line one.\n\nLine two.\n\nLine three.')
  })

  it('preserves markdown formatting', () => {
    const source = `
post:
title: Test

@body
# Heading

This is **bold** and *italic*.

- List item 1
- List item 2
`
    const result = parseDataFile(source, 'test')

    const expected = `# Heading

This is **bold** and *italic*.

- List item 1
- List item 2`
    expect(result.entries[0].blocks[0].content).toBe(expected)
  })
})

// ============================================================================
// ERROR HANDLING
// ============================================================================

describe('DataParser: Error Handling', () => {
  it('reports error for attribute outside entry', () => {
    const source = `
title: No Entry
`
    const result = parseDataFile(source, 'test')

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('outside of entry')
    expect(result.errors[0].line).toBe(2)
  })

  it('reports error for block outside entry', () => {
    const source = `
@body
Content without entry.
`
    const result = parseDataFile(source, 'test')

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('outside of entry')
  })

  it('reports error for attribute after block', () => {
    const source = `
entry:
title: Before

@body
Content

key: After Block
`
    const result = parseDataFile(source, 'test')

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('after block definitions')
  })

  it('ignores comment lines', () => {
    const source = `
// This is a comment
entry:
// Another comment
title: Value
`
    const result = parseDataFile(source, 'test')

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].attributes).toHaveLength(1)
    expect(result.errors).toHaveLength(0)
  })
})

// ============================================================================
// MULTIPLE FILES
// ============================================================================

describe('DataParser: Multiple Files', () => {
  it('parses multiple data files', () => {
    const files = [
      { name: 'posts.data', source: 'first:\ntitle: First' },
      { name: 'users.data', source: 'admin:\nname: Admin' },
    ]

    const results = parseDataFiles(files)

    expect(results).toHaveLength(2)
    expect(results[0].filename).toBe('posts')
    expect(results[1].filename).toBe('users')
  })

  it('merges data files into runtime object', () => {
    const files: DataFile[] = [
      {
        filename: 'posts',
        entries: [{
          name: 'first',
          attributes: [{ key: 'title', value: 'First Post', line: 2 }],
          blocks: [{ name: 'body', content: 'Content', line: 4 }],
          line: 1,
        }],
        errors: [],
      },
    ]

    const merged = mergeDataFiles(files)

    expect(merged.posts.first.title).toBe('First Post')
    expect(merged.posts.first.body).toBe('Content')
  })
})

// ============================================================================
// SERIALIZATION
// ============================================================================

describe('DataParser: Serialization', () => {
  it('serializes simple values', () => {
    const data = {
      posts: {
        first: {
          title: 'Hello',
          count: 42,
          active: true,
        },
      },
    }

    const js = serializeDataForJS(data)

    expect(js).toContain('"posts"')
    expect(js).toContain('"first"')
    expect(js).toContain('"title": "Hello"')
    expect(js).toContain('"count": 42')
    expect(js).toContain('"active": true')
  })

  it('serializes arrays', () => {
    const data = {
      test: {
        entry: {
          tags: ['a', 'b', 'c'],
        },
      },
    }

    const js = serializeDataForJS(data)

    expect(js).toContain('"tags": ["a","b","c"]')
  })

  it('serializes multi-line strings with backticks', () => {
    const data = {
      test: {
        entry: {
          body: 'Line 1\nLine 2\nLine 3',
        },
      },
    }

    const js = serializeDataForJS(data)

    expect(js).toContain('`Line 1')
    expect(js).toContain('Line 3`')
  })

  it('escapes special characters in strings', () => {
    const data = {
      test: {
        entry: {
          text: 'Quote: "Hello"',
        },
      },
    }

    const js = serializeDataForJS(data)

    expect(js).toContain('\\"Hello\\"')
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('DataParser: Edge Cases', () => {
  it('handles empty file', () => {
    const result = parseDataFile('', 'empty')

    expect(result.entries).toHaveLength(0)
    expect(result.errors).toHaveLength(0)
  })

  it('handles file with only comments', () => {
    const source = `
// Comment 1
// Comment 2
`
    const result = parseDataFile(source, 'test')

    expect(result.entries).toHaveLength(0)
    expect(result.errors).toHaveLength(0)
  })

  it('handles entry names with hyphens', () => {
    const source = `
my-complex-entry-name:
title: Test
`
    const result = parseDataFile(source, 'test')

    expect(result.entries[0].name).toBe('my-complex-entry-name')
  })

  it('handles attribute keys with hyphens', () => {
    const source = `
entry:
background-color: blue
font-size: 14
`
    const result = parseDataFile(source, 'test')

    expect(result.entries[0].attributes[0].key).toBe('background-color')
    expect(result.entries[0].attributes[1].key).toBe('font-size')
  })

  it('handles values with colons', () => {
    const source = `
entry:
url: https://example.com:8080/path
time: 12:30:45
`
    const result = parseDataFile(source, 'test')

    expect(result.entries[0].attributes[0].value).toBe('https://example.com:8080/path')
    expect(result.entries[0].attributes[1].value).toBe('12:30:45')
  })

  it('handles values with special characters', () => {
    const source = `
entry:
email: test@example.com
price: $19.99
path: /path/to/file.txt
`
    const result = parseDataFile(source, 'test')

    expect(result.entries[0].attributes[0].value).toBe('test@example.com')
    expect(result.entries[0].attributes[1].value).toBe('$19.99')
    expect(result.entries[0].attributes[2].value).toBe('/path/to/file.txt')
  })
})

// ============================================================================
// EXTENDED VALUE TYPE TESTS
// ============================================================================

describe('DataParser: Extended Value Types', () => {
  it('parses zero as number', () => {
    const source = `
entry:
count: 0
`
    const result = parseDataFile(source, 'test')
    expect(result.entries[0].attributes[0].value).toBe(0)
    expect(typeof result.entries[0].attributes[0].value).toBe('number')
  })

  it('parses negative decimals', () => {
    const source = `
entry:
value: -3.14159
`
    const result = parseDataFile(source, 'test')
    expect(result.entries[0].attributes[0].value).toBe(-3.14159)
  })

  it('parses very large numbers', () => {
    const source = `
entry:
big: 9999999999999
small: 0.00000001
`
    const result = parseDataFile(source, 'test')
    expect(result.entries[0].attributes[0].value).toBe(9999999999999)
    expect(result.entries[0].attributes[1].value).toBe(0.00000001)
  })

  it('treats strings that look like numbers with text as strings', () => {
    const source = `
entry:
version: 1.0.0
code: 123abc
phone: +49 123 456
`
    const result = parseDataFile(source, 'test')
    expect(result.entries[0].attributes[0].value).toBe('1.0.0')
    expect(result.entries[0].attributes[1].value).toBe('123abc')
    expect(result.entries[0].attributes[2].value).toBe('+49 123 456')
  })

  it('parses empty array as string', () => {
    // Empty brackets [] are kept as string since they don't match [content]
    const source = `
entry:
tags: []
`
    const result = parseDataFile(source, 'test')
    // Parser treats [] as a literal string, not an empty array
    expect(result.entries[0].attributes[0].value).toBe('[]')
  })

  it('parses single-item array', () => {
    const source = `
entry:
tags: [single]
`
    const result = parseDataFile(source, 'test')
    expect(result.entries[0].attributes[0].value).toEqual(['single'])
  })

  it('parses array with spaces', () => {
    const source = `
entry:
tags: [  a  ,  b  ,  c  ]
`
    const result = parseDataFile(source, 'test')
    expect(result.entries[0].attributes[0].value).toEqual(['a', 'b', 'c'])
  })

  it('parses array with mixed content', () => {
    const source = `
entry:
mixed: [hello world, 123, true, test@email.com]
`
    const result = parseDataFile(source, 'test')
    expect(result.entries[0].attributes[0].value).toEqual(['hello world', '123', 'true', 'test@email.com'])
  })

  it('preserves case in boolean strings that are not exactly true/false', () => {
    const source = `
entry:
yes: True
no: FALSE
maybe: TRUE
`
    const result = parseDataFile(source, 'test')
    expect(result.entries[0].attributes[0].value).toBe('True')
    expect(result.entries[0].attributes[1].value).toBe('FALSE')
    expect(result.entries[0].attributes[2].value).toBe('TRUE')
  })
})

// ============================================================================
// EXTENDED MARKDOWN BLOCK TESTS
// ============================================================================

describe('DataParser: Extended Markdown Blocks', () => {
  it('handles empty block', () => {
    const source = `
entry:
title: Test

@empty
`
    const result = parseDataFile(source, 'test')
    expect(result.entries[0].blocks).toHaveLength(1)
    expect(result.entries[0].blocks[0].name).toBe('empty')
    expect(result.entries[0].blocks[0].content).toBe('')
  })

  it('handles block with only whitespace', () => {
    const source = `
entry:
title: Test

@whitespace


`
    const result = parseDataFile(source, 'test')
    expect(result.entries[0].blocks[0].content).toBe('')
  })

  it('preserves indentation in code blocks', () => {
    const source = `
entry:
title: Code

@code
function test() {
    if (true) {
        return 42
    }
}
`
    const result = parseDataFile(source, 'test')
    expect(result.entries[0].blocks[0].content).toContain('    if (true)')
    expect(result.entries[0].blocks[0].content).toContain('        return 42')
  })

  it('handles multiple paragraphs with complex formatting', () => {
    const source = `
entry:
title: Complex

@content
# Main Title

This is the **first** paragraph with *emphasis*.

## Subtitle

- Item one with \`code\`
- Item two with [link](url)
- Item three

> Quote block here

Final paragraph.
`
    const result = parseDataFile(source, 'test')
    const content = result.entries[0].blocks[0].content
    expect(content).toContain('# Main Title')
    expect(content).toContain('## Subtitle')
    expect(content).toContain('**first**')
    expect(content).toContain('*emphasis*')
    expect(content).toContain('> Quote block')
  })

  it('handles blocks across multiple entries', () => {
    const source = `
post1:
title: First

@body
Content 1

post2:
title: Second

@body
Content 2

@footer
Footer 2
`
    const result = parseDataFile(source, 'test')
    expect(result.entries).toHaveLength(2)
    expect(result.entries[0].blocks).toHaveLength(1)
    expect(result.entries[0].blocks[0].content).toBe('Content 1')
    expect(result.entries[1].blocks).toHaveLength(2)
    expect(result.entries[1].blocks[0].content).toBe('Content 2')
    expect(result.entries[1].blocks[1].content).toBe('Footer 2')
  })

  it('handles block names with numbers', () => {
    const source = `
entry:
title: Test

@section1
First section

@section2
Second section
`
    const result = parseDataFile(source, 'test')
    expect(result.entries[0].blocks[0].name).toBe('section1')
    expect(result.entries[0].blocks[1].name).toBe('section2')
  })

  it('handles block with HTML-like content', () => {
    const source = `
entry:
title: HTML

@content
<div class="test">
  <p>Paragraph</p>
</div>
`
    const result = parseDataFile(source, 'test')
    expect(result.entries[0].blocks[0].content).toContain('<div class="test">')
  })
})

// ============================================================================
// EXTENDED ERROR HANDLING TESTS
// ============================================================================

describe('DataParser: Extended Error Handling', () => {
  it('reports multiple errors in one file', () => {
    const source = `
title: orphan1
count: orphan2

@body
orphan block
`
    const result = parseDataFile(source, 'test')
    expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })

  it('continues parsing after error', () => {
    const source = `
orphan: value

valid-entry:
title: This should work
count: 42
`
    const result = parseDataFile(source, 'test')
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].name).toBe('valid-entry')
    expect(result.entries[0].attributes).toHaveLength(2)
  })

  it('provides hints in error messages', () => {
    const source = `
title: outside
`
    const result = parseDataFile(source, 'test')
    expect(result.errors[0].hint).toBeDefined()
    expect(result.errors[0].hint).toContain('entry')
  })

  it('tracks correct line numbers for attribute before entry', () => {
    // The parser reports an error when attribute appears before any entry
    const source = `
orphan: line 2

entry:
title: ok
`
    const result = parseDataFile(source, 'test')
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].line).toBe(2)
  })
})

// ============================================================================
// COMPLEX REAL-WORLD SCENARIOS
// ============================================================================

describe('DataParser: Real-World Scenarios', () => {
  it('parses a blog post with full metadata', () => {
    const source = `
my-first-post:
title: My First Blog Post
slug: my-first-post
author: John Doe
date: 2024-01-15
tags: [programming, tutorial, javascript]
published: true
views: 1234
rating: 4.5

@excerpt
A brief introduction to **JavaScript** programming.

@content
# Introduction

Welcome to my first post!

## Getting Started

Here's how to begin:

1. Install Node.js
2. Create a new project
3. Write some code

\`\`\`javascript
console.log("Hello World");
\`\`\`

## Conclusion

Thanks for reading!
`
    const result = parseDataFile(source, 'posts')

    expect(result.errors).toHaveLength(0)
    expect(result.entries).toHaveLength(1)

    const post = result.entries[0]
    expect(post.name).toBe('my-first-post')
    expect(post.attributes).toHaveLength(8)

    // Check specific attributes
    const attrs = Object.fromEntries(post.attributes.map(a => [a.key, a.value]))
    expect(attrs.title).toBe('My First Blog Post')
    expect(attrs.published).toBe(true)
    expect(attrs.views).toBe(1234)
    expect(attrs.rating).toBe(4.5)
    expect(attrs.tags).toEqual(['programming', 'tutorial', 'javascript'])

    // Check blocks
    expect(post.blocks).toHaveLength(2)
    expect(post.blocks[0].name).toBe('excerpt')
    expect(post.blocks[1].name).toBe('content')
    expect(post.blocks[1].content).toContain('# Introduction')
    expect(post.blocks[1].content).toContain('console.log')
  })

  it('parses a user database', () => {
    const source = `
admin:
id: 1
username: admin
email: admin@example.com
role: administrator
active: true
permissions: [read, write, delete, admin]

editor:
id: 2
username: editor
email: editor@example.com
role: editor
active: true
permissions: [read, write]

viewer:
id: 3
username: viewer
email: viewer@example.com
role: viewer
active: false
permissions: [read]
`
    const result = parseDataFile(source, 'users')

    expect(result.errors).toHaveLength(0)
    expect(result.entries).toHaveLength(3)

    const admin = result.entries[0]
    expect(admin.name).toBe('admin')
    expect(admin.attributes.find(a => a.key === 'permissions')?.value).toEqual(['read', 'write', 'delete', 'admin'])
  })

  it('parses a product catalog', () => {
    const source = `
laptop-pro:
name: Laptop Pro 15
price: 1299.99
stock: 50
featured: true
tags: [laptop, computer]

@description
The **Laptop Pro 15** is our flagship computer.

wireless-mouse:
name: Wireless Mouse
price: 29.99
stock: 200
featured: false
tags: [mouse, wireless]

@description
Ergonomic wireless mouse.
`
    const result = parseDataFile(source, 'products')

    expect(result.errors).toHaveLength(0)
    expect(result.entries).toHaveLength(2)

    const laptop = result.entries[0]
    expect(laptop.attributes.find(a => a.key === 'price')?.value).toBe(1299.99)
    expect(laptop.blocks[0].content).toContain('**Laptop Pro 15**')
  })

  it('parses a navigation structure', () => {
    const source = `
home:
label: Home
path: /
icon: home
order: 1

about:
label: About Us
path: /about
icon: info
order: 2

products:
label: Products
path: /products
icon: shopping-cart
order: 3
children: [laptops, phones, accessories]

contact:
label: Contact
path: /contact
icon: mail
order: 4
`
    const result = parseDataFile(source, 'navigation')

    expect(result.errors).toHaveLength(0)
    expect(result.entries).toHaveLength(4)

    const products = result.entries[2]
    expect(products.attributes.find(a => a.key === 'children')?.value).toEqual(['laptops', 'phones', 'accessories'])
  })

  it('parses configuration settings', () => {
    const source = `
database:
host: localhost
port: 5432
name: myapp_production
ssl: true
pool-size: 10
timeout: 30000

api:
base-url: https://api.example.com
version: v2
rate-limit: 1000
cache-ttl: 3600

features:
dark-mode: true
notifications: true
analytics: false
beta-features: false
`
    const result = parseDataFile(source, 'config')

    expect(result.errors).toHaveLength(0)
    expect(result.entries).toHaveLength(3)

    const db = result.entries[0]
    expect(db.attributes.find(a => a.key === 'port')?.value).toBe(5432)
    expect(db.attributes.find(a => a.key === 'ssl')?.value).toBe(true)
  })
})

// ============================================================================
// STRESS TESTS
// ============================================================================

describe('DataParser: Stress Tests', () => {
  it('handles many entries', () => {
    let source = ''
    for (let i = 0; i < 100; i++) {
      source += `
entry-${i}:
index: ${i}
name: Entry ${i}
`
    }

    const result = parseDataFile(source, 'test')

    expect(result.errors).toHaveLength(0)
    expect(result.entries).toHaveLength(100)
    expect(result.entries[99].name).toBe('entry-99')
  })

  it('handles many attributes per entry', () => {
    let source = 'entry:\n'
    for (let i = 0; i < 50; i++) {
      source += `attr-${i}: value-${i}\n`
    }

    const result = parseDataFile(source, 'test')

    expect(result.errors).toHaveLength(0)
    expect(result.entries[0].attributes).toHaveLength(50)
  })

  it('handles large markdown block', () => {
    let content = ''
    for (let i = 0; i < 100; i++) {
      content += `Line ${i}: Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n\n`
    }

    const source = `
entry:
title: Large Content

@body
${content}
`
    const result = parseDataFile(source, 'test')

    expect(result.errors).toHaveLength(0)
    expect(result.entries[0].blocks[0].content.split('\n').length).toBeGreaterThan(100)
  })

  it('handles very long attribute values', () => {
    const longValue = 'x'.repeat(10000)
    const source = `
entry:
long: ${longValue}
`
    const result = parseDataFile(source, 'test')

    expect(result.errors).toHaveLength(0)
    expect((result.entries[0].attributes[0].value as string).length).toBe(10000)
  })

  it('handles deeply nested-looking structures (flat)', () => {
    const source = `
level1-a:
name: A

level1-b:
name: B
parent: level1-a

level1-c:
name: C
parent: level1-b

level1-d:
name: D
parent: level1-c
`
    const result = parseDataFile(source, 'test')

    expect(result.errors).toHaveLength(0)
    expect(result.entries).toHaveLength(4)
  })
})

// ============================================================================
// WHITESPACE HANDLING
// ============================================================================

describe('DataParser: Whitespace Handling', () => {
  it('handles tabs in values', () => {
    const source = `
entry:
text: hello	world
`
    const result = parseDataFile(source, 'test')
    expect(result.entries[0].attributes[0].value).toBe('hello\tworld')
  })

  it('handles trailing whitespace on entry line', () => {
    const source = `entry:
title: Test`
    const result = parseDataFile(source, 'test')
    expect(result.entries[0].name).toBe('entry')
  })

  it('handles leading whitespace on attribute line', () => {
    const source = `
entry:
  title: Test
`
    const result = parseDataFile(source, 'test')
    // Should still parse (trimmed)
    expect(result.entries[0].attributes[0].value).toBe('Test')
  })

  it('preserves internal whitespace in values', () => {
    const source = `
entry:
text: hello    world    test
`
    const result = parseDataFile(source, 'test')
    expect(result.entries[0].attributes[0].value).toBe('hello    world    test')
  })

  it('handles Windows line endings', () => {
    const source = "entry:\r\ntitle: Test\r\ncount: 42\r\n"
    const result = parseDataFile(source, 'test')
    expect(result.entries).toHaveLength(1)
  })

  it('handles mixed line endings', () => {
    const source = "entry:\ntitle: Test\r\ncount: 42\n"
    const result = parseDataFile(source, 'test')
    expect(result.entries).toHaveLength(1)
  })
})

// ============================================================================
// UNICODE AND INTERNATIONAL
// ============================================================================

describe('DataParser: Unicode and International', () => {
  it('handles German umlauts', () => {
    const source = `
entry:
title: Größe und Höhe
author: Müller
`
    const result = parseDataFile(source, 'test')
    expect(result.entries[0].attributes[0].value).toBe('Größe und Höhe')
    expect(result.entries[0].attributes[1].value).toBe('Müller')
  })

  it('handles Chinese characters', () => {
    const source = `
entry:
title: 你好世界
author: 张三
`
    const result = parseDataFile(source, 'test')
    expect(result.entries[0].attributes[0].value).toBe('你好世界')
    expect(result.entries[0].attributes[1].value).toBe('张三')
  })

  it('handles emoji', () => {
    const source = `
entry:
title: Hello 👋 World 🌍
mood: 😀
`
    const result = parseDataFile(source, 'test')
    expect(result.entries[0].attributes[0].value).toBe('Hello 👋 World 🌍')
    expect(result.entries[0].attributes[1].value).toBe('😀')
  })

  it('handles Arabic text', () => {
    const source = `
entry:
title: مرحبا بالعالم
`
    const result = parseDataFile(source, 'test')
    expect(result.entries[0].attributes[0].value).toBe('مرحبا بالعالم')
  })

  it('handles mixed scripts', () => {
    const source = `
entry:
mixed: Hello 世界 مرحبا 🌍 Привет
`
    const result = parseDataFile(source, 'test')
    expect(result.entries[0].attributes[0].value).toBe('Hello 世界 مرحبا 🌍 Привет')
  })
})

// ============================================================================
// SERIALIZATION EDGE CASES
// ============================================================================

describe('DataParser: Serialization Edge Cases', () => {
  it('escapes backticks in multi-line strings', () => {
    const data = {
      test: {
        entry: {
          code: 'Line 1\n`code`\nLine 3',
        },
      },
    }
    const js = serializeDataForJS(data)
    expect(js).toContain('\\`code\\`')
  })

  it('escapes dollar signs in multi-line strings', () => {
    const data = {
      test: {
        entry: {
          text: 'Price: $100\nTotal: $200',
        },
      },
    }
    const js = serializeDataForJS(data)
    expect(js).toContain('\\$100')
  })

  it('handles empty string values', () => {
    const data = {
      test: {
        entry: {
          empty: '',
        },
      },
    }
    const js = serializeDataForJS(data)
    expect(js).toContain('"empty": ""')
  })

  it('handles boolean false', () => {
    const data = {
      test: {
        entry: {
          active: false,
        },
      },
    }
    const js = serializeDataForJS(data)
    expect(js).toContain('"active": false')
  })

  it('handles zero', () => {
    const data = {
      test: {
        entry: {
          count: 0,
        },
      },
    }
    const js = serializeDataForJS(data)
    expect(js).toContain('"count": 0')
  })

  it('handles empty array', () => {
    const data = {
      test: {
        entry: {
          tags: [],
        },
      },
    }
    const js = serializeDataForJS(data)
    expect(js).toContain('"tags": []')
  })

  it('handles special JSON characters', () => {
    const data = {
      test: {
        entry: {
          text: 'Line1\nLine2\tTab\\Backslash',
        },
      },
    }
    const js = serializeDataForJS(data)
    // Should be escaped properly
    expect(js).toBeDefined()
  })
})

// ============================================================================
// MERGE EDGE CASES
// ============================================================================

describe('DataParser: Merge Edge Cases', () => {
  it('handles same entry name in different files', () => {
    const files: DataFile[] = [
      {
        filename: 'file1',
        entries: [{ name: 'entry', attributes: [{ key: 'source', value: 'file1', line: 1 }], blocks: [], line: 1 }],
        errors: [],
      },
      {
        filename: 'file2',
        entries: [{ name: 'entry', attributes: [{ key: 'source', value: 'file2', line: 1 }], blocks: [], line: 1 }],
        errors: [],
      },
    ]

    const merged = mergeDataFiles(files)

    expect(merged.file1.entry.source).toBe('file1')
    expect(merged.file2.entry.source).toBe('file2')
  })

  it('handles empty entries', () => {
    const files: DataFile[] = [
      {
        filename: 'test',
        entries: [{ name: 'empty', attributes: [], blocks: [], line: 1 }],
        errors: [],
      },
    ]

    const merged = mergeDataFiles(files)

    expect(merged.test.empty).toEqual({})
  })

  it('handles blocks overwriting attributes with same name', () => {
    const files: DataFile[] = [
      {
        filename: 'test',
        entries: [{
          name: 'entry',
          attributes: [{ key: 'body', value: 'attribute value', line: 1 }],
          blocks: [{ name: 'body', content: 'block content', line: 3 }],
          line: 1,
        }],
        errors: [],
      },
    ]

    const merged = mergeDataFiles(files)

    // Block should overwrite attribute
    expect(merged.test.entry.body).toBe('block content')
  })

  it('handles very long filenames', () => {
    const longName = 'a'.repeat(100)
    const files: DataFile[] = [
      {
        filename: longName,
        entries: [{ name: 'entry', attributes: [{ key: 'test', value: 'value', line: 1 }], blocks: [], line: 1 }],
        errors: [],
      },
    ]

    const merged = mergeDataFiles(files)

    expect(merged[longName]).toBeDefined()
    expect(merged[longName].entry.test).toBe('value')
  })
})
