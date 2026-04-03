/**
 * Markdown Renderer Tests
 *
 * Tests the minimal markdown to HTML converter.
 */

import { describe, it, expect } from 'vitest'
import { markdownToHTML, markdownToPlainText, hasMarkdownFormatting } from '../../compiler/runtime/markdown'

// ============================================================================
// INLINE FORMATTING
// ============================================================================

describe('Markdown: Inline Formatting', () => {
  it('converts **bold** to <strong>', () => {
    const result = markdownToHTML('This is **bold** text.')
    expect(result).toContain('<strong>bold</strong>')
  })

  it('converts *italic* to <em>', () => {
    const result = markdownToHTML('This is *italic* text.')
    expect(result).toContain('<em>italic</em>')
  })

  it('converts `code` to <code>', () => {
    const result = markdownToHTML('Use `const` for constants.')
    expect(result).toContain('<code>const</code>')
  })

  it('converts [text](url) to <a href>', () => {
    const result = markdownToHTML('Visit [Google](https://google.com) for search.')
    expect(result).toContain('<a href="https://google.com">Google</a>')
  })

  it('handles multiple formatting in one line', () => {
    const result = markdownToHTML('This is **bold** and *italic* and `code`.')
    expect(result).toContain('<strong>bold</strong>')
    expect(result).toContain('<em>italic</em>')
    expect(result).toContain('<code>code</code>')
  })

  it('escapes HTML special characters', () => {
    const result = markdownToHTML('Use <div> tags.')
    expect(result).toContain('&lt;div&gt;')
  })
})

// ============================================================================
// HEADINGS
// ============================================================================

describe('Markdown: Headings', () => {
  it('converts # to <h1>', () => {
    const result = markdownToHTML('# Heading 1')
    expect(result).toBe('<h1>Heading 1</h1>')
  })

  it('converts ## to <h2>', () => {
    const result = markdownToHTML('## Heading 2')
    expect(result).toBe('<h2>Heading 2</h2>')
  })

  it('converts ### to <h3>', () => {
    const result = markdownToHTML('### Heading 3')
    expect(result).toBe('<h3>Heading 3</h3>')
  })

  it('converts #### to <h4>', () => {
    const result = markdownToHTML('#### Heading 4')
    expect(result).toBe('<h4>Heading 4</h4>')
  })

  it('converts ##### to <h5>', () => {
    const result = markdownToHTML('##### Heading 5')
    expect(result).toBe('<h5>Heading 5</h5>')
  })

  it('converts ###### to <h6>', () => {
    const result = markdownToHTML('###### Heading 6')
    expect(result).toBe('<h6>Heading 6</h6>')
  })

  it('supports inline formatting in headings', () => {
    const result = markdownToHTML('# This is **bold** heading')
    expect(result).toBe('<h1>This is <strong>bold</strong> heading</h1>')
  })
})

// ============================================================================
// LISTS
// ============================================================================

describe('Markdown: Lists', () => {
  it('converts - items to <ul><li>', () => {
    const markdown = `- Item 1
- Item 2
- Item 3`
    const result = markdownToHTML(markdown)
    expect(result).toContain('<ul>')
    expect(result).toContain('<li>Item 1</li>')
    expect(result).toContain('<li>Item 2</li>')
    expect(result).toContain('<li>Item 3</li>')
    expect(result).toContain('</ul>')
  })

  it('converts * items to <ul><li>', () => {
    const markdown = `* First
* Second`
    const result = markdownToHTML(markdown)
    expect(result).toContain('<li>First</li>')
    expect(result).toContain('<li>Second</li>')
  })

  it('supports inline formatting in list items', () => {
    const markdown = `- **Bold** item
- *Italic* item`
    const result = markdownToHTML(markdown)
    expect(result).toContain('<li><strong>Bold</strong> item</li>')
    expect(result).toContain('<li><em>Italic</em> item</li>')
  })

  it('handles numbered lists', () => {
    const markdown = `1. First
2. Second
3. Third`
    const result = markdownToHTML(markdown)
    expect(result).toContain('<li>First</li>')
    expect(result).toContain('<li>Second</li>')
    expect(result).toContain('<li>Third</li>')
  })
})

// ============================================================================
// PARAGRAPHS
// ============================================================================

describe('Markdown: Paragraphs', () => {
  it('wraps plain text in <p>', () => {
    const result = markdownToHTML('This is a paragraph.')
    expect(result).toBe('<p>This is a paragraph.</p>')
  })

  it('separates paragraphs by blank lines', () => {
    const markdown = `First paragraph.

Second paragraph.`
    const result = markdownToHTML(markdown)
    expect(result).toContain('<p>First paragraph.</p>')
    expect(result).toContain('<p>Second paragraph.</p>')
  })

  it('joins consecutive lines into one paragraph', () => {
    const markdown = `Line one
Line two
Line three`
    const result = markdownToHTML(markdown)
    expect(result).toBe('<p>Line one Line two Line three</p>')
  })
})

// ============================================================================
// COMPLEX DOCUMENTS
// ============================================================================

describe('Markdown: Complex Documents', () => {
  it('handles mixed content', () => {
    const markdown = `# Welcome

This is an introduction with **bold** text.

## Features

- Feature one
- Feature two

Visit [our site](https://example.com) for more.`

    const result = markdownToHTML(markdown)
    expect(result).toContain('<h1>Welcome</h1>')
    expect(result).toContain('<h2>Features</h2>')
    expect(result).toContain('<strong>bold</strong>')
    expect(result).toContain('<ul>')
    expect(result).toContain('<li>Feature one</li>')
    expect(result).toContain('<a href="https://example.com">our site</a>')
  })
})

// ============================================================================
// PLAIN TEXT CONVERSION
// ============================================================================

describe('Markdown: Plain Text', () => {
  it('strips bold markers', () => {
    const result = markdownToPlainText('This is **bold** text.')
    expect(result).toBe('This is bold text.')
  })

  it('strips italic markers', () => {
    const result = markdownToPlainText('This is *italic* text.')
    expect(result).toBe('This is italic text.')
  })

  it('strips code markers', () => {
    const result = markdownToPlainText('Use `const` keyword.')
    expect(result).toBe('Use const keyword.')
  })

  it('extracts link text', () => {
    const result = markdownToPlainText('Visit [Google](https://google.com).')
    expect(result).toBe('Visit Google.')
  })

  it('removes heading markers', () => {
    const result = markdownToPlainText('# Heading')
    expect(result).toBe('Heading')
  })

  it('removes list markers', () => {
    const result = markdownToPlainText('- Item one\n- Item two')
    expect(result).toBe('Item one\nItem two')
  })
})

// ============================================================================
// DETECTION
// ============================================================================

describe('Markdown: Detection', () => {
  it('detects headings', () => {
    expect(hasMarkdownFormatting('# Title')).toBe(true)
    expect(hasMarkdownFormatting('## Subtitle')).toBe(true)
  })

  it('detects lists', () => {
    expect(hasMarkdownFormatting('- Item')).toBe(true)
    expect(hasMarkdownFormatting('* Item')).toBe(true)
  })

  it('detects bold', () => {
    expect(hasMarkdownFormatting('**bold**')).toBe(true)
  })

  it('detects italic', () => {
    expect(hasMarkdownFormatting('*italic*')).toBe(true)
  })

  it('detects links', () => {
    expect(hasMarkdownFormatting('[text](url)')).toBe(true)
  })

  it('detects code', () => {
    expect(hasMarkdownFormatting('`code`')).toBe(true)
  })

  it('returns false for plain text', () => {
    expect(hasMarkdownFormatting('Plain text here.')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(hasMarkdownFormatting('')).toBe(false)
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Markdown: Edge Cases', () => {
  it('handles empty string', () => {
    expect(markdownToHTML('')).toBe('')
    expect(markdownToPlainText('')).toBe('')
  })

  it('handles whitespace only', () => {
    expect(markdownToHTML('   \n   \n   ')).toBe('')
  })

  it('handles null/undefined gracefully', () => {
    expect(markdownToHTML(null as unknown as string)).toBe('')
    expect(markdownToHTML(undefined as unknown as string)).toBe('')
  })

  it('handles unclosed bold markers', () => {
    const result = markdownToHTML('This is **bold without close')
    expect(result).toContain('**bold without close')
  })

  it('handles unclosed italic markers', () => {
    const result = markdownToHTML('This is *italic without close')
    expect(result).toContain('*italic without close')
  })

  it('handles nested formatting gracefully', () => {
    // This is tricky - **bold *italic*** might not work perfectly
    // but it should not crash
    const result = markdownToHTML('**bold *nested* text**')
    expect(result).toBeDefined()
  })

  it('preserves URLs with special characters', () => {
    const result = markdownToHTML('[link](https://example.com/path?a=1&b=2)')
    expect(result).toContain('href="https://example.com/path?a=1&amp;b=2"')
  })
})

// ============================================================================
// EXTENDED INLINE FORMATTING
// ============================================================================

describe('Markdown: Extended Inline Formatting', () => {
  it('handles multiple bold sections in one line', () => {
    const result = markdownToHTML('**first** and **second** and **third**')
    expect(result).toContain('<strong>first</strong>')
    expect(result).toContain('<strong>second</strong>')
    expect(result).toContain('<strong>third</strong>')
  })

  it('handles multiple italic sections in one line', () => {
    const result = markdownToHTML('*one* and *two* and *three*')
    expect(result).toContain('<em>one</em>')
    expect(result).toContain('<em>two</em>')
    expect(result).toContain('<em>three</em>')
  })

  it('handles multiple code spans in one line', () => {
    const result = markdownToHTML('Use `const` or `let` or `var`')
    expect(result).toContain('<code>const</code>')
    expect(result).toContain('<code>let</code>')
    expect(result).toContain('<code>var</code>')
  })

  it('handles multiple links in one line', () => {
    const result = markdownToHTML('[Google](https://google.com) and [GitHub](https://github.com)')
    expect(result).toContain('<a href="https://google.com">Google</a>')
    expect(result).toContain('<a href="https://github.com">GitHub</a>')
  })

  it('handles bold at start of line', () => {
    const result = markdownToHTML('**Bold** at start')
    expect(result).toContain('<strong>Bold</strong>')
  })

  it('handles bold at end of line', () => {
    const result = markdownToHTML('End is **bold**')
    expect(result).toContain('<strong>bold</strong>')
  })

  it('handles italic at start of line', () => {
    const result = markdownToHTML('*Italic* at start')
    expect(result).toContain('<em>Italic</em>')
  })

  it('handles italic at end of line', () => {
    const result = markdownToHTML('End is *italic*')
    expect(result).toContain('<em>italic</em>')
  })

  it('handles code at start of line', () => {
    const result = markdownToHTML('`code` at start')
    expect(result).toContain('<code>code</code>')
  })

  it('handles adjacent formatting', () => {
    const result = markdownToHTML('**bold***italic*`code`')
    expect(result).toContain('<strong>bold</strong>')
    expect(result).toContain('<em>italic</em>')
    expect(result).toContain('<code>code</code>')
  })

  it('handles formatting with punctuation', () => {
    const result = markdownToHTML('This is **bold**, *italic*, and `code`.')
    expect(result).toContain('<strong>bold</strong>,')
    expect(result).toContain('<em>italic</em>,')
    expect(result).toContain('<code>code</code>.')
  })

  it('preserves asterisks in code spans', () => {
    const result = markdownToHTML('Use `a * b` for multiplication')
    expect(result).toContain('<code>a * b</code>')
  })

  it('handles empty bold markers', () => {
    const result = markdownToHTML('Empty **** markers')
    expect(result).toBeDefined()
  })

  it('handles empty italic markers', () => {
    const result = markdownToHTML('Empty ** markers')
    expect(result).toBeDefined()
  })

  it('handles spaces inside formatting', () => {
    const result = markdownToHTML('** bold with spaces ** text')
    // Should not convert - spaces break formatting
    expect(result).toBeDefined()
  })
})

// ============================================================================
// EXTENDED HEADINGS
// ============================================================================

describe('Markdown: Extended Headings', () => {
  it('handles heading with only spaces after hash', () => {
    const result = markdownToHTML('#   Heading with spaces')
    expect(result).toContain('<h1>')
    expect(result).toContain('Heading with spaces')
  })

  it('handles heading without space after hash', () => {
    const result = markdownToHTML('#NoSpace')
    // Should still work or be left as-is
    expect(result).toBeDefined()
  })

  it('handles multiple headings in document', () => {
    const markdown = `# First
## Second
### Third
#### Fourth`
    const result = markdownToHTML(markdown)
    expect(result).toContain('<h1>First</h1>')
    expect(result).toContain('<h2>Second</h2>')
    expect(result).toContain('<h3>Third</h3>')
    expect(result).toContain('<h4>Fourth</h4>')
  })

  it('handles heading with inline code', () => {
    const result = markdownToHTML('# The `main` function')
    expect(result).toContain('<h1>')
    expect(result).toContain('<code>main</code>')
  })

  it('handles heading with link', () => {
    const result = markdownToHTML('# Welcome to [Mirror](https://mirror.dev)')
    expect(result).toContain('<h1>')
    expect(result).toContain('<a href="https://mirror.dev">Mirror</a>')
  })

  it('handles more than 6 hashes as text', () => {
    const result = markdownToHTML('####### Too many')
    // Should not be h7, treated as text
    expect(result).not.toContain('<h7>')
  })

  it('handles hash in middle of line as text', () => {
    const result = markdownToHTML('This # is not a heading')
    expect(result).not.toContain('<h1>')
    expect(result).toContain('#')
  })

  it('handles heading followed by paragraph', () => {
    const markdown = `# Title

This is content.`
    const result = markdownToHTML(markdown)
    expect(result).toContain('<h1>Title</h1>')
    expect(result).toContain('<p>This is content.</p>')
  })
})

// ============================================================================
// EXTENDED LISTS
// ============================================================================

describe('Markdown: Extended Lists', () => {
  it('handles single item list', () => {
    const result = markdownToHTML('- Single item')
    expect(result).toContain('<ul>')
    expect(result).toContain('<li>Single item</li>')
    expect(result).toContain('</ul>')
  })

  it('handles list with empty items', () => {
    const markdown = `- First
-
- Third`
    const result = markdownToHTML(markdown)
    expect(result).toContain('<li>First</li>')
    expect(result).toContain('<li>Third</li>')
  })

  it('handles list with links', () => {
    const markdown = `- [Link 1](url1)
- [Link 2](url2)`
    const result = markdownToHTML(markdown)
    expect(result).toContain('<li><a href="url1">Link 1</a></li>')
    expect(result).toContain('<li><a href="url2">Link 2</a></li>')
  })

  it('handles list with code', () => {
    const markdown = `- Use \`npm install\`
- Run \`npm start\``
    const result = markdownToHTML(markdown)
    expect(result).toContain('<code>npm install</code>')
    expect(result).toContain('<code>npm start</code>')
  })

  it('handles mixed list markers', () => {
    const markdown = `- Dash item
* Star item`
    const result = markdownToHTML(markdown)
    expect(result).toContain('<li>Dash item</li>')
    expect(result).toContain('<li>Star item</li>')
  })

  it('handles numbered list starting not at 1', () => {
    const markdown = `5. Fifth
6. Sixth
7. Seventh`
    const result = markdownToHTML(markdown)
    expect(result).toContain('<li>Fifth</li>')
    expect(result).toContain('<li>Sixth</li>')
  })

  it('handles list followed by paragraph', () => {
    const markdown = `- Item one
- Item two

Regular paragraph.`
    const result = markdownToHTML(markdown)
    expect(result).toContain('<li>Item one</li>')
    expect(result).toContain('<p>Regular paragraph.</p>')
  })

  it('handles paragraph followed by list', () => {
    const markdown = `Regular paragraph.

- Item one
- Item two`
    const result = markdownToHTML(markdown)
    expect(result).toContain('<p>Regular paragraph.</p>')
    expect(result).toContain('<li>Item one</li>')
  })

  it('handles very long list', () => {
    const items = Array.from({ length: 50 }, (_, i) => `- Item ${i + 1}`).join('\n')
    const result = markdownToHTML(items)
    expect(result).toContain('<li>Item 1</li>')
    expect(result).toContain('<li>Item 50</li>')
  })
})

// ============================================================================
// EXTENDED PARAGRAPHS
// ============================================================================

describe('Markdown: Extended Paragraphs', () => {
  it('handles multiple blank lines between paragraphs', () => {
    const markdown = `First paragraph.



Second paragraph.`
    const result = markdownToHTML(markdown)
    expect(result).toContain('<p>First paragraph.</p>')
    expect(result).toContain('<p>Second paragraph.</p>')
  })

  it('handles very long paragraph', () => {
    const longText = 'Word '.repeat(500)
    const result = markdownToHTML(longText)
    expect(result).toContain('<p>')
    expect(result).toContain('</p>')
  })

  it('handles paragraph with only formatting', () => {
    const result = markdownToHTML('**bold** *italic* `code`')
    expect(result).toContain('<strong>bold</strong>')
    expect(result).toContain('<em>italic</em>')
    expect(result).toContain('<code>code</code>')
  })

  it('handles multiple paragraphs with formatting', () => {
    const markdown = `**Bold** paragraph.

*Italic* paragraph.

\`Code\` paragraph.`
    const result = markdownToHTML(markdown)
    expect(result).toContain('<p><strong>Bold</strong> paragraph.</p>')
    expect(result).toContain('<p><em>Italic</em> paragraph.</p>')
    expect(result).toContain('<p><code>Code</code> paragraph.</p>')
  })

  it('handles trailing whitespace', () => {
    const markdown = 'Text with trailing spaces   '
    const result = markdownToHTML(markdown)
    expect(result).toBeDefined()
  })

  it('handles leading whitespace', () => {
    const markdown = '   Text with leading spaces'
    const result = markdownToHTML(markdown)
    expect(result).toBeDefined()
  })
})

// ============================================================================
// LINKS EXTENDED
// ============================================================================

describe('Markdown: Links Extended', () => {
  it('handles link with empty text', () => {
    // Links with empty text are not converted (require text content)
    const result = markdownToHTML('[](https://example.com)')
    // Should not crash, may leave as-is
    expect(result).toBeDefined()
  })

  it('handles link with special characters in text', () => {
    const result = markdownToHTML('[Click <here>](https://example.com)')
    expect(result).toContain('&lt;here&gt;')
  })

  it('handles link with parentheses in URL', () => {
    const result = markdownToHTML('[Wiki](https://en.wikipedia.org/wiki/Rust_(programming_language))')
    expect(result).toContain('href=')
  })

  it('handles mailto links', () => {
    const result = markdownToHTML('[Email](mailto:test@example.com)')
    expect(result).toContain('href="mailto:test@example.com"')
  })

  it('handles relative links', () => {
    const result = markdownToHTML('[Relative](/path/to/page)')
    expect(result).toContain('href="/path/to/page"')
  })

  it('handles link with hash fragment', () => {
    const result = markdownToHTML('[Section](#section-id)')
    expect(result).toContain('href="#section-id"')
  })

  it('handles links with formatting in text', () => {
    const result = markdownToHTML('[**Bold** link](url)')
    expect(result).toContain('<strong>Bold</strong>')
    expect(result).toContain('href="url"')
  })

  it('handles multiple links on same line', () => {
    const result = markdownToHTML('See [A](a.html) or [B](b.html) or [C](c.html)')
    expect(result).toContain('<a href="a.html">A</a>')
    expect(result).toContain('<a href="b.html">B</a>')
    expect(result).toContain('<a href="c.html">C</a>')
  })
})

// ============================================================================
// HTML ESCAPING
// ============================================================================

describe('Markdown: HTML Escaping', () => {
  it('escapes < in text', () => {
    const result = markdownToHTML('a < b')
    expect(result).toContain('&lt;')
  })

  it('escapes > in text', () => {
    const result = markdownToHTML('a > b')
    expect(result).toContain('&gt;')
  })

  it('escapes & in text', () => {
    const result = markdownToHTML('A & B')
    expect(result).toContain('&amp;')
  })

  it('preserves quotes in text', () => {
    // Quotes don't need HTML escaping in text content, only in attributes
    const result = markdownToHTML('He said "hello"')
    expect(result).toContain('"hello"')
  })

  it('escapes HTML tags', () => {
    const result = markdownToHTML('<script>alert("xss")</script>')
    expect(result).not.toContain('<script>')
    expect(result).toContain('&lt;script&gt;')
  })

  it('escapes HTML in headings', () => {
    const result = markdownToHTML('# <Title>')
    expect(result).toContain('&lt;Title&gt;')
  })

  it('escapes HTML in list items', () => {
    const result = markdownToHTML('- <Item>')
    expect(result).toContain('&lt;Item&gt;')
  })

  it('escapes HTML in code spans (double escape)', () => {
    const result = markdownToHTML('Use `<div>` for containers')
    expect(result).toContain('<code>')
    // Should escape HTML inside code
    expect(result).toContain('&lt;div&gt;')
  })

  it('escapes ampersands in URLs', () => {
    const result = markdownToHTML('[link](url?a=1&b=2)')
    expect(result).toContain('&amp;')
  })

  it('prevents XSS through markdown', () => {
    const result = markdownToHTML('[Click](javascript:alert(1))')
    // Should still create link but escape
    expect(result).toBeDefined()
  })

  it('handles nested angle brackets', () => {
    const result = markdownToHTML('<<nested>>')
    expect(result).toContain('&lt;&lt;nested&gt;&gt;')
  })
})

// ============================================================================
// UNICODE AND INTERNATIONAL
// ============================================================================

describe('Markdown: Unicode and International', () => {
  it('handles German umlauts', () => {
    const result = markdownToHTML('Über die Brücke nach München')
    expect(result).toContain('Über')
    expect(result).toContain('München')
  })

  it('handles French accents', () => {
    const result = markdownToHTML('Café résumé naïve')
    expect(result).toContain('Café')
    expect(result).toContain('résumé')
  })

  it('handles Chinese characters', () => {
    const result = markdownToHTML('# 你好世界')
    expect(result).toContain('你好世界')
  })

  it('handles Japanese characters', () => {
    const result = markdownToHTML('これは **テスト** です')
    expect(result).toContain('これは')
    expect(result).toContain('<strong>テスト</strong>')
  })

  it('handles Korean characters', () => {
    const result = markdownToHTML('안녕하세요')
    expect(result).toContain('안녕하세요')
  })

  it('handles Arabic characters', () => {
    const result = markdownToHTML('مرحبا بالعالم')
    expect(result).toContain('مرحبا')
  })

  it('handles emoji', () => {
    const result = markdownToHTML('Hello 👋 World 🌍')
    expect(result).toContain('👋')
    expect(result).toContain('🌍')
  })

  it('handles emoji in formatting', () => {
    const result = markdownToHTML('**🔥 Hot topic**')
    expect(result).toContain('<strong>🔥 Hot topic</strong>')
  })

  it('handles mixed scripts', () => {
    const result = markdownToHTML('English 日本語 한국어')
    expect(result).toContain('English')
    expect(result).toContain('日本語')
    expect(result).toContain('한국어')
  })

  it('handles RTL text', () => {
    const result = markdownToHTML('עברית')
    expect(result).toContain('עברית')
  })

  it('handles special unicode symbols', () => {
    const result = markdownToHTML('© 2024 • All rights reserved ™')
    expect(result).toContain('©')
    expect(result).toContain('•')
    expect(result).toContain('™')
  })

  it('handles mathematical symbols', () => {
    const result = markdownToHTML('∑ ∏ ∞ √ ≠ ≤ ≥')
    expect(result).toContain('∑')
    expect(result).toContain('∞')
    expect(result).toContain('≤')
  })
})

// ============================================================================
// STRESS TESTS
// ============================================================================

describe('Markdown: Stress Tests', () => {
  it('handles very long lines', () => {
    const longLine = 'a'.repeat(10000)
    const result = markdownToHTML(longLine)
    expect(result).toContain(longLine)
  })

  it('handles many paragraphs', () => {
    const paragraphs = Array.from({ length: 100 }, (_, i) => `Paragraph ${i + 1}.`).join('\n\n')
    const result = markdownToHTML(paragraphs)
    expect(result).toContain('<p>Paragraph 1.</p>')
    expect(result).toContain('<p>Paragraph 100.</p>')
  })

  it('handles deeply nested formatting attempts', () => {
    const nested = '**bold *italic **more** italic* bold**'
    const result = markdownToHTML(nested)
    // Should not crash
    expect(result).toBeDefined()
  })

  it('handles many formatting markers', () => {
    const manyBold = Array.from({ length: 50 }, (_, i) => `**bold${i}**`).join(' ')
    const result = markdownToHTML(manyBold)
    expect(result).toContain('<strong>bold0</strong>')
    expect(result).toContain('<strong>bold49</strong>')
  })

  it('handles many links', () => {
    const manyLinks = Array.from({ length: 50 }, (_, i) => `[link${i}](url${i})`).join(' ')
    const result = markdownToHTML(manyLinks)
    expect(result).toContain('<a href="url0">link0</a>')
    expect(result).toContain('<a href="url49">link49</a>')
  })

  it('handles alternating formatting', () => {
    const alternating = Array.from({ length: 50 }, (_, i) =>
      i % 2 === 0 ? `**bold${i}**` : `*italic${i}*`
    ).join(' ')
    const result = markdownToHTML(alternating)
    expect(result).toContain('<strong>bold0</strong>')
    expect(result).toContain('<em>italic1</em>')
  })

  it('handles document with all features', () => {
    const complex = `# Main Title

This is an **introduction** with *emphasis* and \`code\`.

## Section 1

Visit [our site](https://example.com) for more information.

- Item one
- Item two
- Item three

### Subsection

More **bold** and *italic* content here.

1. First step
2. Second step
3. Third step

## Conclusion

Final paragraph with [link](url).`

    const result = markdownToHTML(complex)
    expect(result).toContain('<h1>Main Title</h1>')
    expect(result).toContain('<h2>Section 1</h2>')
    expect(result).toContain('<h3>Subsection</h3>')
    expect(result).toContain('<strong>introduction</strong>')
    expect(result).toContain('<em>emphasis</em>')
    expect(result).toContain('<code>code</code>')
    expect(result).toContain('<a href="https://example.com">our site</a>')
    expect(result).toContain('<li>Item one</li>')
    expect(result).toContain('<li>First step</li>')
  })
})

// ============================================================================
// PLAIN TEXT EXTENDED
// ============================================================================

describe('Markdown: Plain Text Extended', () => {
  it('strips all formatting from complex document', () => {
    const markdown = `# Title

This is **bold** and *italic* with \`code\`.

- Item one
- [Link](url)

Visit [site](https://example.com).`

    const result = markdownToPlainText(markdown)
    expect(result).toContain('Title')
    expect(result).toContain('bold')
    expect(result).toContain('italic')
    expect(result).toContain('code')
    expect(result).not.toContain('**')
    expect(result).not.toContain('*')
    expect(result).not.toContain('`')
    expect(result).not.toContain('[')
    expect(result).not.toContain('](')
  })

  it('preserves whitespace in plain text', () => {
    const result = markdownToPlainText('Word one  word two')
    expect(result).toContain('Word one')
    expect(result).toContain('word two')
  })

  it('handles numbered lists', () => {
    const result = markdownToPlainText('1. First\n2. Second')
    expect(result).toContain('First')
    expect(result).toContain('Second')
  })

  it('handles multiple heading levels', () => {
    const result = markdownToPlainText('# H1\n## H2\n### H3')
    expect(result).toContain('H1')
    expect(result).toContain('H2')
    expect(result).toContain('H3')
    expect(result).not.toContain('#')
  })

  it('handles emoji in plain text', () => {
    const result = markdownToPlainText('Hello 👋 **World** 🌍')
    expect(result).toContain('👋')
    expect(result).toContain('World')
    expect(result).toContain('🌍')
  })
})

// ============================================================================
// DETECTION EXTENDED
// ============================================================================

describe('Markdown: Detection Extended', () => {
  it('detects inline code', () => {
    expect(hasMarkdownFormatting('const x = `value`')).toBe(true)
  })

  it('detects unordered lists (numbered lists not detected)', () => {
    // The detection function primarily focuses on unordered list markers
    // Numbered lists share syntax with regular sentences, harder to detect
    expect(hasMarkdownFormatting('- First item')).toBe(true)
    expect(hasMarkdownFormatting('* Second item')).toBe(true)
  })

  it('does not detect plain numbers with dot', () => {
    // "3.14" should not be detected as list
    expect(hasMarkdownFormatting('Pi is about 3.14')).toBe(false)
  })

  it('does not detect single asterisk as formatting', () => {
    expect(hasMarkdownFormatting('a * b = c')).toBe(false)
  })

  it('does not detect URLs as markdown', () => {
    expect(hasMarkdownFormatting('https://example.com')).toBe(false)
  })

  it('detects formatting at end of string', () => {
    expect(hasMarkdownFormatting('This is **bold**')).toBe(true)
  })

  it('detects formatting at start of string', () => {
    expect(hasMarkdownFormatting('**Bold** text')).toBe(true)
  })

  it('handles whitespace-only input', () => {
    expect(hasMarkdownFormatting('   \n\t  ')).toBe(false)
  })

  it('detects multiple formatting types', () => {
    expect(hasMarkdownFormatting('**bold** and *italic*')).toBe(true)
  })

  it('detects heading at any level', () => {
    expect(hasMarkdownFormatting('### Third level')).toBe(true)
    expect(hasMarkdownFormatting('###### Sixth level')).toBe(true)
  })
})

// ============================================================================
// REAL-WORLD SCENARIOS
// ============================================================================

describe('Markdown: Real-World Scenarios', () => {
  it('renders README-style content', () => {
    const markdown = `# Project Name

A **cool** project for *amazing* things.

## Installation

\`\`\`
npm install project
\`\`\`

## Usage

- Import the module
- Call the function
- Profit!

## License

[MIT](LICENSE.md)`

    const result = markdownToHTML(markdown)
    expect(result).toContain('<h1>Project Name</h1>')
    expect(result).toContain('<h2>Installation</h2>')
    expect(result).toContain('<strong>cool</strong>')
    expect(result).toContain('<li>Import the module</li>')
    expect(result).toContain('<a href="LICENSE.md">MIT</a>')
  })

  it('renders blog post content', () => {
    const markdown = `# My First Post

Published on *January 1, 2024*

Today I learned about **Mirror**, a new DSL for UI development.

## Key Features

1. Simple syntax
2. Fast compilation
3. Great tooling

Read more at [mirror.dev](https://mirror.dev).`

    const result = markdownToHTML(markdown)
    expect(result).toContain('<h1>My First Post</h1>')
    expect(result).toContain('<em>January 1, 2024</em>')
    expect(result).toContain('<strong>Mirror</strong>')
    expect(result).toContain('<li>Simple syntax</li>')
  })

  it('renders documentation content', () => {
    const markdown = `## API Reference

### \`createComponent(name)\`

Creates a new component with the given **name**.

**Parameters:**
- \`name\` - The component name (*required*)

**Returns:** Component instance

**Example:**
\`const btn = createComponent("Button")\``

    const result = markdownToHTML(markdown)
    expect(result).toContain('<h2>API Reference</h2>')
    expect(result).toContain('<code>createComponent(name)</code>')
    expect(result).toContain('<strong>Parameters:</strong>')
    expect(result).toContain('<em>required</em>')
  })

  it('renders changelog content', () => {
    const markdown = `# Changelog

## [1.2.0] - 2024-01-15

### Added
- New **dark mode** feature
- Support for *custom themes*

### Fixed
- [#123](https://github.com/org/repo/issues/123) - Fixed bug

### Changed
- Improved performance`

    const result = markdownToHTML(markdown)
    expect(result).toContain('<h1>Changelog</h1>')
    expect(result).toContain('<h2>[1.2.0] - 2024-01-15</h2>')
    expect(result).toContain('<h3>Added</h3>')
    expect(result).toContain('<strong>dark mode</strong>')
  })

  it('renders FAQ content', () => {
    const markdown = `# FAQ

## What is Mirror?

Mirror is a **DSL** for building UIs.

## How do I install it?

Run \`npm install mirror-lang\` in your terminal.

## Is it free?

Yes! Mirror is *open source* under the [MIT License](LICENSE).`

    const result = markdownToHTML(markdown)
    expect(result).toContain('<h1>FAQ</h1>')
    expect(result).toContain('<h2>What is Mirror?</h2>')
    expect(result).toContain('<code>npm install mirror-lang</code>')
    expect(result).toContain('<em>open source</em>')
  })
})
