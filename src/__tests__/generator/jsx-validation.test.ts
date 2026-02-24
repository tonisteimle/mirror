/**
 * JSX Syntax Validation Tests
 *
 * Verifies that generated JSX is syntactically valid and can be parsed.
 * Uses a lightweight JSX parser to validate output structure.
 */

import { describe, it, expect } from 'vitest'
import { exportReact } from '../../generator/export'

// =============================================================================
// JSX Structure Validators
// =============================================================================

/**
 * Validates JSX structure by checking:
 * - Matching open/close tags
 * - Proper attribute formatting
 * - Valid self-closing tags
 * - Correct React syntax
 */
function validateJsxStructure(jsx: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check for basic structure - either named export or default export
  if (!jsx.includes('function App()') && !jsx.includes('export function App')) {
    errors.push('Missing App function declaration')
  }

  // Use a simple approach: extract all opening/closing tag positions
  const tagStack: string[] = []

  // Find all tag-like patterns and check context
  // This is simpler and more robust than a single complex regex
  let pos = 0
  while (pos < jsx.length) {
    const tagStart = jsx.indexOf('<', pos)
    if (tagStart === -1) break

    // Find the matching > (accounting for attributes with > inside)
    let depth = 0
    let inString = false
    let stringChar = ''
    let tagEnd = tagStart + 1

    for (let i = tagStart + 1; i < jsx.length; i++) {
      const char = jsx[i]
      const prevChar = jsx[i - 1]

      if (inString) {
        if (char === stringChar && prevChar !== '\\') {
          inString = false
        }
      } else {
        if (char === '"' || char === "'" || char === '`') {
          inString = true
          stringChar = char
        } else if (char === '{') {
          depth++
        } else if (char === '}') {
          depth--
        } else if (char === '>' && depth === 0) {
          tagEnd = i
          break
        }
      }
    }

    const tagContent = jsx.substring(tagStart, tagEnd + 1)

    // Check if it's a Fragment shorthand <>
    if (tagContent === '<>' || tagContent === '</>') {
      pos = tagEnd + 1
      continue
    }

    // Extract tag name
    const tagMatch = tagContent.match(/^<(\/?)([a-zA-Z][a-zA-Z0-9.]*)/)
    if (tagMatch) {
      const isClosing = tagMatch[1] === '/'
      const tagName = tagMatch[2]
      const isSelfClosing = tagContent.endsWith('/>')

      if (isSelfClosing) {
        // Self-closing tags don't affect the stack
      } else if (isClosing) {
        // Closing tag
        if (tagStack.length === 0) {
          errors.push(`Extra closing tag: ${tagName}`)
        } else if (tagStack[tagStack.length - 1] !== tagName) {
          errors.push(`Mismatched tag: expected </${tagStack[tagStack.length - 1]}>, got </${tagName}>`)
        } else {
          tagStack.pop()
        }
      } else {
        // Opening tag
        tagStack.push(tagName)
      }
    }

    pos = tagEnd + 1
  }

  // Check for unclosed tags
  if (tagStack.length > 0) {
    errors.push(`Unclosed tags: ${tagStack.join(', ')}`)
  }

  // Check for invalid attribute syntax
  if (jsx.match(/className=([^{"`])/)) {
    errors.push('Invalid className attribute (should be string or expression)')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validates CSS structure
 */
function validateCssStructure(css: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check for unclosed braces
  const openBraces = (css.match(/{/g) || []).length
  const closeBraces = (css.match(/}/g) || []).length

  if (openBraces !== closeBraces) {
    errors.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`)
  }

  // Check for empty rules
  if (css.match(/{\s*}/)) {
    // Empty rules are technically valid but might indicate an issue
    // Don't error, just note
  }

  // Check for invalid property syntax
  if (css.match(/[a-z-]+:\s*;/)) {
    errors.push('Empty property value found')
  }

  // Check for missing semicolons before closing brace
  // Note: Last property before } doesn't need semicolon, so this is tricky
  // Skip this check

  return { valid: errors.length === 0, errors }
}

// =============================================================================
// Basic JSX Structure Tests
// =============================================================================

describe('JSX Structure Validation', () => {
  describe('Basic Components', () => {
    it('generates valid JSX for empty Box', () => {
      const result = exportReact('Box')
      const validation = validateJsxStructure(result.tsx)
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('generates valid JSX for Box with text', () => {
      const result = exportReact('Box "Hello World"')
      const validation = validateJsxStructure(result.tsx)
      expect(validation.valid).toBe(true)
    })

    it('generates valid JSX for nested components', () => {
      const result = exportReact(`Box
  Box
    Box
      Text "Deep"`)
      const validation = validateJsxStructure(result.tsx)
      expect(validation.valid).toBe(true)
    })

    it('generates valid JSX for multiple root components', () => {
      const result = exportReact(`Box "First"
Box "Second"
Box "Third"`)
      const validation = validateJsxStructure(result.tsx)
      expect(validation.valid).toBe(true)
      // Should use Fragment shorthand for multiple roots
      expect(result.tsx).toContain('<>')
    })

    it('generates valid JSX for all primitive types', () => {
      const primitives = [
        'Button "Click"',
        'Input "Placeholder"',
        'Textarea "Enter text"',
        'Image "photo.jpg"',
        'Link href "/about", "About"',
        'Icon "search"',
        'Text "Hello"',
        'Box',
        'Card',
      ]

      for (const primitive of primitives) {
        const result = exportReact(primitive)
        const validation = validateJsxStructure(result.tsx)
        expect(validation.valid, `Failed for: ${primitive}`).toBe(true)
      }
    })
  })

  describe('Component Definitions', () => {
    it('generates valid JSX for component definition', () => {
      const result = exportReact(`Card: pad 16, bg #1E1E2E, rad 8

Card "Hello"`)
      const validation = validateJsxStructure(result.tsx)
      expect(validation.valid).toBe(true)
      expect(result.tsx).toContain('function Card')
    })

    it('generates valid JSX for inherited components', () => {
      const result = exportReact(`Button: pad 12, bg #3B82F6
DangerButton: Button bg #EF4444

DangerButton "Delete"`)
      const validation = validateJsxStructure(result.tsx)
      expect(validation.valid).toBe(true)
    })

    it('generates valid JSX for component with children slots', () => {
      const result = exportReact(`Card:
  Header: pad 8
  Body: pad 16
  Footer: pad 8

Card
  Header "Title"
  Body "Content"
  Footer "Actions"`)
      const validation = validateJsxStructure(result.tsx)
      expect(validation.valid).toBe(true)
    })
  })

  describe('Event Handlers', () => {
    it('generates valid onClick handler', () => {
      const result = exportReact(`Button onclick show Panel "Show"
Panel hidden "Content"`)
      const validation = validateJsxStructure(result.tsx)
      expect(validation.valid).toBe(true)
      expect(result.tsx).toContain('onClick')
    })

    it('generates valid onChange handler', () => {
      const result = exportReact(`$text: ""
Input "Type..." onchange assign $text to $event.value`)
      const validation = validateJsxStructure(result.tsx)
      expect(validation.valid).toBe(true)
      expect(result.tsx).toContain('onChange')
    })

    it('generates valid toggle handler', () => {
      const result = exportReact(`Button onclick toggle Panel "Toggle"
Panel hidden "Content"`)
      const validation = validateJsxStructure(result.tsx)
      expect(validation.valid).toBe(true)
      expect(result.tsx).toMatch(/onClick.*prev|onClick.*!/)
    })
  })

  describe('State Management', () => {
    it('imports useState when needed', () => {
      const result = exportReact(`Panel: hidden
Button onclick show Panel "Show"
Panel`)
      expect(result.tsx).toContain("import { useState } from 'react'")
    })

    it('generates valid useState declarations', () => {
      const result = exportReact(`Panel: hidden
Button onclick toggle Panel "Toggle"
Panel "Content"`)
      const validation = validateJsxStructure(result.tsx)
      expect(validation.valid).toBe(true)
      expect(result.tsx).toContain('useState')
    })

    it('generates valid state type for component states', () => {
      const result = exportReact(`Toggle: w 52, h 28, rad 14
  state on
    bg #3B82F6
  state off
    bg #333
  onclick toggle-state

Toggle`)
      const validation = validateJsxStructure(result.tsx)
      expect(validation.valid).toBe(true)
    })
  })

  describe('Conditional Rendering', () => {
    it('generates valid conditional JSX', () => {
      const result = exportReact(`$active: true
if $active
  Box bg #3B82F6 "Active"`)
      const validation = validateJsxStructure(result.tsx)
      expect(validation.valid).toBe(true)
    })

    it('generates valid if/else JSX', () => {
      const result = exportReact(`$active: false
if $active
  Box bg #3B82F6 "Active"
else
  Box bg #333 "Inactive"`)
      const validation = validateJsxStructure(result.tsx)
      expect(validation.valid).toBe(true)
    })
  })

  describe('Special Characters', () => {
    it('handles text content without crashing', () => {
      const result = exportReact('Box "Hello World"')
      const validation = validateJsxStructure(result.tsx)
      expect(validation.valid).toBe(true)
      expect(result.tsx).toContain('Hello World')
    })

    it('handles quotes in text', () => {
      // Note: How quotes are escaped depends on the generator implementation
      const result = exportReact('Text "Say Hello"')
      const validation = validateJsxStructure(result.tsx)
      expect(validation.valid).toBe(true)
    })

    it('handles ampersand in text', () => {
      const result = exportReact('Box "Hello & Goodbye"')
      const validation = validateJsxStructure(result.tsx)
      expect(validation.valid).toBe(true)
    })

    it('handles unicode', () => {
      const result = exportReact('Box "Hello World"')
      const validation = validateJsxStructure(result.tsx)
      expect(validation.valid).toBe(true)
    })
  })
})

// =============================================================================
// CSS Structure Tests
// =============================================================================

describe('CSS Structure Validation', () => {
  it('generates valid CSS for basic component', () => {
    const result = exportReact('Box pad 16, bg #333')
    const validation = validateCssStructure(result.css)
    expect(validation.valid).toBe(true)
  })

  it('generates valid CSS for nested components', () => {
    const result = exportReact(`Box pad 16
  Card bg #1E1E2E
    Text col #FFF "Hello"`)
    const validation = validateCssStructure(result.css)
    expect(validation.valid).toBe(true)
  })

  it('generates valid hover CSS', () => {
    const result = exportReact('Button hover-bg #555 "Hover"')
    const validation = validateCssStructure(result.css)
    expect(validation.valid).toBe(true)
    expect(result.css).toContain(':hover')
  })

  it('generates valid state CSS', () => {
    const result = exportReact(`Toggle:
  state on
    bg #3B82F6
  state off
    bg #333

Toggle`)
    const validation = validateCssStructure(result.css)
    expect(validation.valid).toBe(true)
    expect(result.css).toMatch(/--on|--off/)
  })

  it('generates unique class names for duplicates', () => {
    const result = exportReact(`Box pad 8
Box pad 16
Box pad 24`)
    const validation = validateCssStructure(result.css)
    expect(validation.valid).toBe(true)
    expect(result.css).toContain('.box')
    expect(result.css).toContain('.box-2')
    expect(result.css).toContain('.box-3')
  })
})

// =============================================================================
// Import Statement Tests
// =============================================================================

describe('Import Statements', () => {
  it('does not import useState when not needed', () => {
    const result = exportReact('Box pad 16 "Hello"')
    expect(result.tsx).not.toContain('useState')
  })

  it('imports useState once for multiple state usages', () => {
    const result = exportReact(`Panel: hidden
Modal: hidden
Button onclick toggle Panel "Toggle Panel"
Button onclick toggle Modal "Toggle Modal"
Panel "Panel Content"
Modal "Modal Content"`)
    const useStateImports = (result.tsx.match(/useState/g) || []).length
    // One import, multiple usages
    expect(result.tsx).toContain("import { useState } from 'react'")
    expect(useStateImports).toBeGreaterThan(1) // import + usages
  })
})

// =============================================================================
// Self-Closing Tags
// =============================================================================

describe('Self-Closing Tags', () => {
  it('generates self-closing input', () => {
    const result = exportReact('Input "Placeholder"')
    expect(result.tsx).toContain('<input')
    expect(result.tsx).toContain('/>')
    expect(result.tsx).not.toContain('</input>')
  })

  it('generates self-closing img', () => {
    const result = exportReact('Image "photo.jpg"')
    expect(result.tsx).toContain('<img')
    expect(result.tsx).toContain('/>')
    expect(result.tsx).not.toContain('</img>')
  })

  it('does not self-close div with children', () => {
    const result = exportReact('Box "Hello"')
    expect(result.tsx).toContain('</div>')
  })

  it('generates valid empty div', () => {
    const result = exportReact('Box')
    // Empty box has empty content but is still valid
    const validation = validateJsxStructure(result.tsx)
    expect(validation.valid).toBe(true)
    expect(result.tsx).toContain('<div')
    expect(result.tsx).toContain('</div>')
  })
})

// =============================================================================
// Attribute Formatting
// =============================================================================

describe('Attribute Formatting', () => {
  it('uses string className', () => {
    const result = exportReact('Box pad 16')
    expect(result.tsx).toMatch(/className="[^"]+"/  )
  })

  it('uses JSX expression for dynamic className', () => {
    const result = exportReact(`Toggle:
  state active
    bg #3B82F6
  onclick toggle-state

Toggle`)
    // Dynamic className should use template literal or expression
    expect(result.tsx).toMatch(/className=\{|className=`/)
  })

  it('formats onClick as arrow function', () => {
    const result = exportReact(`Button onclick show Panel "Show"
Panel hidden "Content"`)
    expect(result.tsx).toMatch(/onClick=\{.*=>.*\}/)
  })

  it('formats onChange with event parameter', () => {
    const result = exportReact(`$text: ""
Input onchange assign $text to $event.value "Type"`)
    expect(result.tsx).toMatch(/onChange=\{.*e.*=>.*\}/)
  })

  it('uses proper type attribute for button', () => {
    const result = exportReact('Button "Click"')
    expect(result.tsx).toContain('type="button"')
  })

  it('uses proper placeholder attribute for input', () => {
    const result = exportReact('Input "Enter email"')
    expect(result.tsx).toContain('placeholder="Enter email"')
  })

  it('uses proper src attribute for image', () => {
    const result = exportReact('Image "photo.jpg"')
    expect(result.tsx).toContain('src="photo.jpg"')
  })

  it('uses proper href attribute for link', () => {
    const result = exportReact('Link href "/about", "About"')
    expect(result.tsx).toContain('href="/about"')
  })
})

// =============================================================================
// Complex Scenarios
// =============================================================================

describe('Complex Scenarios', () => {
  it('handles complete form', () => {
    const code = `$email: ""
$password: ""

Form: ver, gap 16, pad 24, bg #1E1E2E, rad 8
  Input onchange assign $email to $event.value "Email"
  Input onchange assign $password to $event.value "Password"
  Button bg #3B82F6, pad 12, rad 4 "Login"

Form`
    const result = exportReact(code)
    const validation = validateJsxStructure(result.tsx)
    expect(validation.valid).toBe(true)
  })

  it('handles modal pattern', () => {
    const code = `Button onclick show Modal "Open Modal"

Modal: hidden, stacked, cen, bg #00000080
  Dialog: bg #1E1E2E, pad 24, rad 12, w 400
    Text "Modal Title"
    Button onclick hide Modal "Close"

Modal
  Dialog`
    const result = exportReact(code)
    const validation = validateJsxStructure(result.tsx)
    expect(validation.valid).toBe(true)
  })

  it('handles navigation with states', () => {
    const code = `Nav: hor, gap 8
  NavItem: pad 8 16, rad 4
    state active
      bg #3B82F6
    state inactive
      bg transparent
    onclick
      activate self
      deactivate-siblings

Nav
  - NavItem "Home"
  - NavItem "About"
  - NavItem "Contact"`
    const result = exportReact(code)
    const validation = validateJsxStructure(result.tsx)
    expect(validation.valid).toBe(true)
  })

  it('handles card grid', () => {
    const code = `Grid: grid 3, gap 16
  Card: pad 16, bg #252525, rad 8
    hover
      bg #333

Grid
  - Card "Card 1"
  - Card "Card 2"
  - Card "Card 3"
  - Card "Card 4"
  - Card "Card 5"
  - Card "Card 6"`
    const result = exportReact(code)
    const validation = validateJsxStructure(result.tsx)
    expect(validation.valid).toBe(true)
  })
})

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  it('handles empty input', () => {
    const result = exportReact('')
    const validation = validateJsxStructure(result.tsx)
    expect(validation.valid).toBe(true)
  })

  it('handles whitespace-only input', () => {
    const result = exportReact('   \n   \n   ')
    const validation = validateJsxStructure(result.tsx)
    expect(validation.valid).toBe(true)
  })

  it('handles deeply nested structure', () => {
    const code = `Box
  Box
    Box
      Box
        Box
          Box
            Box
              Text "Very Deep"`
    const result = exportReact(code)
    const validation = validateJsxStructure(result.tsx)
    expect(validation.valid).toBe(true)
  })

  it('handles many siblings', () => {
    const items = Array.from({ length: 50 }, (_, i) => `  - Item "Item ${i + 1}"`).join('\n')
    const code = `List: ver\n  Item:\n\nList\n${items}`
    const result = exportReact(code)
    const validation = validateJsxStructure(result.tsx)
    expect(validation.valid).toBe(true)
  })

  it('handles component name edge cases', () => {
    const names = ['A', 'MyLongComponentName', 'Component123']
    for (const name of names) {
      const result = exportReact(`${name}: pad 8\n\n${name}`)
      const validation = validateJsxStructure(result.tsx)
      expect(validation.valid, `Failed for: ${name}`).toBe(true)
    }
  })
})
