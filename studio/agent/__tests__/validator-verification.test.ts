/**
 * Validator Verification Tests
 *
 * Tests that our validator actually catches real errors
 * and that validated code compiles with the real parser.
 */

import { describe, it, expect } from 'vitest'
import { validateStructure, validateAndFix, formatErrors } from '../validator'
import { parse } from '../../../src/parser'

// ============================================
// TEST: Validator catches known-bad code
// ============================================

describe('Validator catches known errors', () => {
  describe('Self-closing elements with children', () => {
    it('detects Input with children', () => {
      const code = `Box ver gap 16
  Input "Email"
    Text "placeholder"`

      const result = validateStructure(code)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.type === 'self-closing-with-children')).toBe(true)
    })

    it('detects Image with children', () => {
      const code = `Box ver gap 16
  Image src "test.jpg"
    Text "caption"`

      const result = validateStructure(code)
      expect(result.errors.some(e => e.type === 'self-closing-with-children')).toBe(true)
    })

    it('detects Icon with children', () => {
      const code = `Button pad 12
  Icon "star"
    Text "favorite"`

      const result = validateStructure(code)
      expect(result.errors.some(e => e.type === 'self-closing-with-children')).toBe(true)
    })

    it('detects Checkbox with children', () => {
      const code = `Box hor gap 8
  Checkbox
    Label "Accept"`

      const result = validateStructure(code)
      expect(result.errors.some(e => e.type === 'self-closing-with-children')).toBe(true)
    })

    it('detects Textarea with children', () => {
      const code = `Box ver gap 8
  Textarea
    Text "default value"`

      const result = validateStructure(code)
      expect(result.errors.some(e => e.type === 'self-closing-with-children')).toBe(true)
    })
  })

  describe('Empty text elements', () => {
    it('detects empty H1', () => {
      const code = `Box ver gap 16
  H1
  Text "content"`

      const result = validateStructure(code)
      expect(result.errors.some(e => e.type === 'empty-text-element')).toBe(true)
    })

    it('detects empty H2', () => {
      const code = `Box ver gap 16
  H2
  Text "content"`

      const result = validateStructure(code)
      expect(result.errors.some(e => e.type === 'empty-text-element')).toBe(true)
    })

    it('detects empty Label', () => {
      const code = `Box ver gap 8
  Label
  Input "email"`

      const result = validateStructure(code)
      expect(result.errors.some(e => e.type === 'empty-text-element')).toBe(true)
    })

    it('detects empty Text', () => {
      const code = `Box ver gap 16
  Text
  Button "Click"`

      const result = validateStructure(code)
      expect(result.errors.some(e => e.type === 'empty-text-element')).toBe(true)
    })

    it('detects empty Link', () => {
      const code = `Nav hor gap 16
  Link
  Link "About"`

      const result = validateStructure(code)
      expect(result.errors.some(e => e.type === 'empty-text-element')).toBe(true)
    })
  })

  describe('Root element issues', () => {
    it('detects abs on root', () => {
      const code = `App abs center
  Text "Hello"`

      const result = validateStructure(code)
      expect(result.errors.some(e => e.type === 'root-absolute')).toBe(true)
    })

    it('detects absolute on root', () => {
      const code = `Box absolute w 400
  Text "Modal"`

      const result = validateStructure(code)
      expect(result.errors.some(e => e.type === 'root-absolute')).toBe(true)
    })
  })

  describe('Invalid center on text', () => {
    it('detects center on Text element', () => {
      const code = `Box ver gap 16
  Text "Hello" center`

      const result = validateStructure(code)
      expect(result.errors.some(e => e.type === 'invalid-center-on-text')).toBe(true)
    })

    it('detects center on H1', () => {
      const code = `Box ver gap 16
  H1 "Title" center`

      const result = validateStructure(code)
      expect(result.errors.some(e => e.type === 'invalid-center-on-text')).toBe(true)
    })

    it('does NOT flag text-align center', () => {
      const code = `Box ver gap 16
  Text "Hello" text-align center`

      const result = validateStructure(code)
      expect(result.errors.some(e => e.type === 'invalid-center-on-text')).toBe(false)
    })
  })

  describe('Select/Option validation', () => {
    it('detects Select with non-Option children', () => {
      const code = `Box ver gap 16
  Select
    Text "Wrong"`

      const result = validateStructure(code)
      expect(result.errors.some(e => e.type === 'select-without-options')).toBe(true)
    })

    it('detects Option outside Select', () => {
      const code = `Box ver gap 16
  Option "Orphan"`

      const result = validateStructure(code)
      expect(result.errors.some(e => e.type === 'option-outside-select')).toBe(true)
    })

    it('accepts valid Select with Options', () => {
      const code = `Box ver gap 16
  Select
    Option "Choice 1"
    Option "Choice 2"`

      const result = validateStructure(code)
      expect(result.errors.filter(e =>
        e.type === 'select-without-options' || e.type === 'option-outside-select'
      )).toHaveLength(0)
    })

    it('detects empty Option', () => {
      const code = `Box ver gap 16
  Select
    Option`

      const result = validateStructure(code)
      expect(result.errors.some(e => e.type === 'empty-text-element')).toBe(true)
    })
  })
})

// ============================================
// TEST: Validator accepts known-good code
// ============================================

describe('Validator accepts valid code', () => {
  const validCodes = [
    {
      name: 'Simple layout',
      code: `App ver gap 16 pad 24
  Text "Hello World"`
    },
    {
      name: 'Login form',
      code: `App ver gap 16 pad 24
  Box ver gap 20 pad 32 bg #fff rad 12
    H2 "Login"
    Box ver gap 8
      Label "Email"
      Input type email pad 12
    Box ver gap 8
      Label "Password"
      Input type password pad 12
    Button bg #007bff col #fff pad 12
      Text "Sign In"`
    },
    {
      name: 'Card with image',
      code: `Box ver bg #fff rad 12 shadow md
  Image src "photo.jpg" w full h 200
  Box ver gap 8 pad 16
    H3 "Card Title"
    Text "Description here"`
    },
    {
      name: 'Navigation',
      code: `Nav hor gap 24 pad 16
  Link "Home" href "/"
  Link "About" href "/about"
  Link "Contact" href "/contact"`
    },
    {
      name: 'Button with icon',
      code: `Button hor gap 8 center pad 12 bg #007bff col #fff
  Icon "save" is 18
  Text "Save"`
    },
    {
      name: 'Checkbox with label (siblings)',
      code: `Box hor gap 8 center
  Checkbox
  Label "I agree"`
    },
    {
      name: 'Form with multiple inputs',
      code: `Box ver gap 16
  Box ver gap 4
    Label "Name"
    Input type text
  Box ver gap 4
    Label "Email"
    Input type email
  Box ver gap 4
    Label "Message"
    Textarea`
    },
    {
      name: 'Centered text with text-align',
      code: `Box ver gap 16
  Text "Centered" text-align center
  H1 "Also centered" text-align center`
    },
    {
      name: 'Modal structure',
      code: `Box stacked w full h full
  Box w full h full bg #000 opacity 0.5
  Box ver gap 16 pad 24 bg #fff rad 12 w 400
    H2 "Modal Title"
    Text "Modal content"
    Button bg #007bff col #fff pad 12
      Text "Close"`
    },
    {
      name: 'Sidebar layout',
      code: `App hor w full h full
  Box ver w 240 h full bg #1a1a1f
    H3 "Logo" col #fff
    Nav ver gap 4
      Link "Dashboard" col #888
      Link "Settings" col #888
  Main grow pad 24
    H1 "Content"`
    }
  ]

  for (const { name, code } of validCodes) {
    it(`accepts: ${name}`, () => {
      const result = validateStructure(code)
      if (!result.valid) {
        console.log(`Errors in "${name}":`, formatErrors(result.errors))
      }
      expect(result.valid).toBe(true)
    })
  }
})

// ============================================
// TEST: Auto-fix produces valid code
// ============================================

describe('Auto-fix produces valid code', () => {
  it('fixes empty H1', () => {
    const code = `Box ver gap 16
  H1
  Text "content"`

    const result = validateAndFix(code)
    expect(result.fixedCode).toContain('H1 "Placeholder"')

    // Re-validate fixed code
    const recheck = validateStructure(result.fixedCode!)
    expect(recheck.errors.filter(e => e.type === 'empty-text-element')).toHaveLength(0)
  })

  it('fixes root abs', () => {
    const code = `App abs center
  Text "Hello"`

    const result = validateAndFix(code)
    expect(result.fixedCode).not.toContain('abs')

    // Re-validate fixed code
    const recheck = validateStructure(result.fixedCode!)
    expect(recheck.errors.filter(e => e.type === 'root-absolute')).toHaveLength(0)
  })

  it('fixes center on Text to text-align center', () => {
    const code = `Box ver gap 16
  Text "Hello" center`

    const result = validateAndFix(code)
    expect(result.fixedCode).toContain('text-align center')

    // Re-validate fixed code
    const recheck = validateStructure(result.fixedCode!)
    expect(recheck.errors.filter(e => e.type === 'invalid-center-on-text')).toHaveLength(0)
  })
})

// ============================================
// TEST: Validated code compiles with real parser
// ============================================

describe('Validated code compiles with real parser', () => {
  const testCases = [
    `App ver gap 16 pad 24
  Text "Hello"`,

    `Box ver gap 20 pad 32 bg #fff rad 12
  H2 "Login"
  Box ver gap 8
    Label "Email"
    Input type email
  Button bg #007bff
    Text "Submit"`,

    `Nav hor gap 24 pad 16
  Link "Home"
  Link "About"`,

    `Button hor gap 8 center
  Icon "star"
  Text "Favorite"`,

    `Box hor gap 8
  Checkbox
  Label "Accept terms"`,
  ]

  for (let i = 0; i < testCases.length; i++) {
    it(`compiles test case ${i + 1}`, () => {
      const code = testCases[i]

      // First validate
      const validation = validateStructure(code)
      expect(validation.valid).toBe(true)

      // Then parse with real parser
      let parseError: Error | null = null
      let ast: any = null

      try {
        ast = parse(code)
      } catch (e) {
        parseError = e as Error
      }

      if (parseError) {
        console.log('Parse error for code:', code)
        console.log('Error:', parseError.message)
      }

      expect(parseError).toBeNull()
      expect(ast).not.toBeNull()
    })
  }
})

// ============================================
// TEST: Edge cases - siblings vs children
// ============================================

describe('Edge cases: siblings vs children', () => {
  it('Input followed by sibling (same indent) is OK', () => {
    const code = `Box ver gap 8
  Input type email
  Input type password`

    const result = validateStructure(code)
    expect(result.errors.filter(e => e.type === 'self-closing-with-children')).toHaveLength(0)
  })

  it('Image followed by sibling Text is OK', () => {
    const code = `Box ver gap 8
  Image src "photo.jpg"
  Text "Caption"`

    const result = validateStructure(code)
    expect(result.errors.filter(e => e.type === 'self-closing-with-children')).toHaveLength(0)
  })

  it('Icon and Text as siblings in Button is OK', () => {
    const code = `Button hor gap 8
  Icon "star"
  Text "Favorite"`

    const result = validateStructure(code)
    expect(result.errors.filter(e => e.type === 'self-closing-with-children')).toHaveLength(0)
  })

  it('Checkbox and Label as siblings is OK', () => {
    const code = `Box hor gap 8
  Checkbox
  Label "Accept"`

    const result = validateStructure(code)
    expect(result.errors.filter(e => e.type === 'self-closing-with-children')).toHaveLength(0)
  })

  it('Multiple Inputs as siblings is OK', () => {
    const code = `Box ver gap 8
  Label "Email"
  Input type email
  Label "Password"
  Input type password`

    const result = validateStructure(code)
    expect(result.errors.filter(e => e.type === 'self-closing-with-children')).toHaveLength(0)
  })
})
