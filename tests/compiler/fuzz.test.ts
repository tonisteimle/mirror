/**
 * Fuzz Testing für Mirror Compiler
 *
 * Ziel: Der Compiler soll niemals abstürzen, egal welche Eingabe.
 * Alle Tests erwarten, dass validate() ein Ergebnis zurückgibt (valid oder Fehler),
 * aber niemals eine Exception wirft.
 *
 * Strategien:
 * 1. Zufällige Token-Sequenzen
 * 2. Mutierte gültige Eingaben
 * 3. Grenzwerte für Zahlen
 * 4. Zufällige Zeichen-Sequenzen
 * 5. Kombinatorische Explosion
 */

import { describe, it, expect } from 'vitest'
import { validate } from '../../compiler/validator'
import { tokenizeWithErrors } from '../../compiler/parser/lexer'

// ============================================================================
// HELPERS
// ============================================================================

/** Seed for reproducible random numbers */
let seed = 12345

function seededRandom(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}

function randomInt(min: number, max: number): number {
  return Math.floor(seededRandom() * (max - min + 1)) + min
}

function randomChoice<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)]
}

function randomString(length: number, charset: string): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += charset[randomInt(0, charset.length - 1)]
  }
  return result
}

/** Ensures validate() doesn't throw */
function safeValidate(input: string): { crashed: boolean; result?: any; error?: any } {
  try {
    const result = validate(input)
    return { crashed: false, result }
  } catch (error) {
    return { crashed: true, error }
  }
}

/** Ensures tokenize() doesn't throw */
function safeTokenize(input: string): { crashed: boolean; result?: any; error?: any } {
  try {
    const result = tokenizeWithErrors(input)
    return { crashed: false, result }
  } catch (error) {
    return { crashed: true, error }
  }
}

// ============================================================================
// TOKEN POOLS
// ============================================================================

const PRIMITIVES = ['Frame', 'Text', 'Button', 'Input', 'Image', 'Icon', 'Link', 'Box']
const PROPERTIES = ['w', 'h', 'bg', 'col', 'pad', 'margin', 'rad', 'gap', 'fs', 'weight']
const KEYWORDS = ['hor', 'ver', 'center', 'spread', 'wrap', 'hidden', 'visible', 'disabled']
const COLORS = ['#fff', '#000', '#2563eb', '#10b981', 'white', 'black', 'transparent']
const NUMBERS = ['0', '1', '10', '100', '0.5', '-10', '999999']
const STRINGS = ['""', '"hello"', '"test with spaces"', '"über"', '"emoji 🎉"']
const OPERATORS = [':', ',', ';', '.', '(', ')', '[', ']', '{', '}']
const STATES = ['hover:', 'focus:', 'active:', 'disabled:', 'on:', 'open:']
const FUNCTIONS = ['toggle()', 'show(X)', 'hide(X)', 'exclusive()']

// ============================================================================
// 1. RANDOM TOKEN SEQUENCES
// ============================================================================

describe('Fuzz: Random Token Sequences', () => {
  // Generate 50 random token sequences
  for (let i = 0; i < 50; i++) {
    it(`random sequence #${i + 1}`, () => {
      seed = 12345 + i * 100 // Different seed per test

      const tokens: string[] = []
      const tokenCount = randomInt(1, 20)

      for (let j = 0; j < tokenCount; j++) {
        const tokenType = randomInt(0, 8)
        switch (tokenType) {
          case 0: tokens.push(randomChoice(PRIMITIVES)); break
          case 1: tokens.push(randomChoice(PROPERTIES)); break
          case 2: tokens.push(randomChoice(KEYWORDS)); break
          case 3: tokens.push(randomChoice(COLORS)); break
          case 4: tokens.push(randomChoice(NUMBERS)); break
          case 5: tokens.push(randomChoice(STRINGS)); break
          case 6: tokens.push(randomChoice(OPERATORS)); break
          case 7: tokens.push(randomChoice(STATES)); break
          case 8: tokens.push(randomChoice(FUNCTIONS)); break
        }
      }

      const input = tokens.join(' ')
      const { crashed, error } = safeValidate(input)

      if (crashed) {
        console.error(`CRASH with input: ${input}`)
        console.error(`Error: ${error}`)
      }

      expect(crashed).toBe(false)
    })
  }
})

// ============================================================================
// 2. MUTATED VALID INPUTS
// ============================================================================

const VALID_INPUTS = [
  'Frame w 100',
  'Button "Click me"',
  'Frame bg #2563eb, pad 16',
  'Text "Hello", col white, fs 18',
  'Frame hor, gap 8\n  Button "A"\n  Button "B"',
  'Card: bg #1a1a1a, pad 16\nCard',
  'primary.bg: #2563eb\nButton bg $primary',
  'Btn: toggle()\n  on:\n    bg #2563eb',
]

const MUTATIONS = [
  (s: string) => s.replace(/\d+/, () => String(randomInt(-1000, 1000))),
  (s: string) => s.replace(/#[0-9a-fA-F]+/, () => '#' + randomString(randomInt(1, 10), '0123456789abcdef')),
  (s: string) => s + randomChoice(OPERATORS),
  (s: string) => randomChoice(OPERATORS) + s,
  (s: string) => s.replace(/[a-z]+/i, () => randomString(randomInt(1, 20), 'abcdefghijklmnopqrstuvwxyz')),
  (s: string) => s.split('').reverse().join(''),
  (s: string) => s.replace(/\s+/g, () => ' '.repeat(randomInt(0, 10))),
  (s: string) => s.replace(/"[^"]*"/, () => '"' + randomString(randomInt(0, 50), 'abcdefghijklmnopqrstuvwxyz ') + '"'),
  (s: string) => s.toUpperCase(),
  (s: string) => s.toLowerCase(),
  (s: string) => s + '\n' + s, // Duplicate
  (s: string) => s.replace(/,/g, ';'), // Swap delimiters
  (s: string) => s.replace(/:/g, ''), // Remove colons
]

describe('Fuzz: Mutated Valid Inputs', () => {
  for (let i = 0; i < VALID_INPUTS.length; i++) {
    for (let m = 0; m < MUTATIONS.length; m++) {
      it(`input #${i + 1}, mutation #${m + 1}`, () => {
        seed = 12345 + i * 1000 + m

        const original = VALID_INPUTS[i]
        const mutated = MUTATIONS[m](original)

        const { crashed, error } = safeValidate(mutated)

        if (crashed) {
          console.error(`CRASH with mutation:`)
          console.error(`Original: ${original}`)
          console.error(`Mutated: ${mutated}`)
          console.error(`Error: ${error}`)
        }

        expect(crashed).toBe(false)
      })
    }
  }
})

// ============================================================================
// 3. NUMBER BOUNDARY VALUES
// ============================================================================

describe('Fuzz: Number Boundaries', () => {
  const BOUNDARY_NUMBERS = [
    '0', '-0', '0.0', '-0.0',
    '1', '-1', '0.1', '-0.1',
    '0.5', '-0.5', '1.5', '-1.5',
    '100', '-100', '1000', '-1000',
    '999999999', '-999999999',
    '9007199254740991', // MAX_SAFE_INTEGER
    '-9007199254740991',
    '9007199254740992', // MAX_SAFE_INTEGER + 1
    '0.000001', '0.999999',
    '1e10', '1e-10', '1E10', '1E-10', // Scientific notation
    'Infinity', '-Infinity', 'NaN',
    '1.', '.1', '1..1', '...',
    '1.2.3', '1.2.3.4',
    '007', '00.7', '0x10', '0b10', '0o10', // Other bases
  ]

  for (const num of BOUNDARY_NUMBERS) {
    it(`number: ${num}`, () => {
      const input = `Frame w ${num}`
      const { crashed } = safeValidate(input)
      expect(crashed).toBe(false)
    })

    it(`number in expression: ${num}`, () => {
      const input = `Frame w ${num}, h ${num}, pad ${num}`
      const { crashed } = safeValidate(input)
      expect(crashed).toBe(false)
    })
  }
})

// ============================================================================
// 4. RANDOM CHARACTER SEQUENCES
// ============================================================================

describe('Fuzz: Random Characters', () => {
  const CHARSETS = {
    'ascii printable': ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~',
    'control chars': '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f',
    'unicode basic': 'äöüÄÖÜßéèêëàâîïôùûç',
    'unicode extended': '你好世界مرحباשלום',
    'emoji': '😀😃😄😁😆😅🤣😂🙂🙃😉😊😇',
    'special': '∀∃∄∅∆∇∈∉∊∋∌∍∎∏',
    'whitespace': ' \t\n\r\v\f\u00a0\u2000\u2001\u2002\u2003',
  }

  for (const [name, charset] of Object.entries(CHARSETS)) {
    for (let len = 1; len <= 100; len *= 10) {
      it(`${name}, length ${len}`, () => {
        seed = 12345 + len
        const input = randomString(len, charset)
        const { crashed } = safeValidate(input)
        expect(crashed).toBe(false)
      })
    }
  }
})

// ============================================================================
// 5. DEEPLY NESTED STRUCTURES
// ============================================================================

describe('Fuzz: Deep Nesting', () => {
  for (let depth = 1; depth <= 100; depth += 10) {
    it(`nesting depth ${depth}`, () => {
      let code = ''
      for (let i = 0; i < depth; i++) {
        code += '  '.repeat(i) + 'Frame\n'
      }
      const { crashed } = safeValidate(code)
      expect(crashed).toBe(false)
    })
  }

  it('alternating nesting', () => {
    let code = ''
    for (let i = 0; i < 20; i++) {
      const indent = i % 5
      code += '  '.repeat(indent) + 'Frame\n'
    }
    const { crashed } = safeValidate(code)
    expect(crashed).toBe(false)
  })

  it('random indentation', () => {
    seed = 12345
    let code = ''
    let currentIndent = 0
    for (let i = 0; i < 50; i++) {
      // Random indent change: -2, -1, 0, +1, +2
      const change = randomInt(-2, 2)
      currentIndent = Math.max(0, Math.min(10, currentIndent + change))
      code += '  '.repeat(currentIndent) + 'Frame\n'
    }
    const { crashed } = safeValidate(code)
    expect(crashed).toBe(false)
  })
})

// ============================================================================
// 6. COMBINATORIAL PROPERTY EXPLOSION
// ============================================================================

describe('Fuzz: Property Combinations', () => {
  it('all layout keywords together', () => {
    const allKeywords = ['hor', 'ver', 'center', 'spread', 'wrap', 'tl', 'tc', 'tr', 'cl', 'cr', 'bl', 'bc', 'br']
    const input = `Frame ${allKeywords.join(', ')}`
    const { crashed } = safeValidate(input)
    expect(crashed).toBe(false)
  })

  it('many properties on one element', () => {
    const props = PROPERTIES.map(p => `${p} 10`).join(', ')
    const input = `Frame ${props}`
    const { crashed } = safeValidate(input)
    expect(crashed).toBe(false)
  })

  it('same property repeated many times', () => {
    const repeated = Array(50).fill('bg #fff').join(', ')
    const input = `Frame ${repeated}`
    const { crashed } = safeValidate(input)
    expect(crashed).toBe(false)
  })

  it('many children on one line', () => {
    const children = Array(20).fill('Text "X"').join('; ')
    const input = `Frame; ${children}`
    const { crashed } = safeValidate(input)
    expect(crashed).toBe(false)
  })

  it('many states', () => {
    let code = 'Btn: toggle()\n'
    for (let i = 0; i < 20; i++) {
      code += `  state${i}:\n    bg #${i.toString(16).padStart(6, '0')}\n`
    }
    const { crashed } = safeValidate(code)
    expect(crashed).toBe(false)
  })
})

// ============================================================================
// 7. STRING EDGE CASES
// ============================================================================

describe('Fuzz: String Edge Cases', () => {
  const STRING_TESTS = [
    '""', // Empty
    '" "', // Single space
    '"\\n"', // Escaped newline
    '"\\t"', // Escaped tab
    '"\\\\"', // Escaped backslash
    '"\\""', // Escaped quote
    '"' + 'x'.repeat(10000) + '"', // Very long
    '"' + '\\n'.repeat(100) + '"', // Many escapes
    '"${var}"', // Template-like
    '"$token"', // Token-like
    '"\'"', // Single quote in double
    "'\"'", // Double quote in single (if supported)
    '"line1\nline2"', // Actual newline (should error)
    '"unclosed', // Unclosed
    'unclosed"', // Unopened
    '"""', // Triple quote
    '"a" "b" "c"', // Multiple strings
  ]

  for (const str of STRING_TESTS) {
    it(`string: ${str.slice(0, 30)}${str.length > 30 ? '...' : ''}`, () => {
      const input = `Text ${str}`
      const { crashed } = safeValidate(input)
      expect(crashed).toBe(false)
    })
  }
})

// ============================================================================
// 8. COLOR EDGE CASES
// ============================================================================

describe('Fuzz: Color Edge Cases', () => {
  const COLOR_TESTS = [
    '#', '#0', '#00', '#000', '#0000', '#00000', '#000000', '#0000000', '#00000000',
    '#fff', '#FFF', '#fFf', '#ffffff', '#FFFFFF',
    '#ggg', '#GGG', '#xyz', '#XYZ', // Invalid hex
    '#12345g', '#1234567', // Invalid length/chars
    'rgb(0,0,0)', 'rgb(255,255,255)', 'rgb(256,0,0)', 'rgb(-1,0,0)',
    'rgba(0,0,0,0)', 'rgba(0,0,0,1)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,2)',
    'hsl(0,0%,0%)', 'hsla(0,0%,0%,0.5)',
    'red', 'green', 'blue', 'transparent', 'currentColor',
    'notacolor', 'NOTACOLOR', '123', 'true', 'false',
    'grad #000 #fff', 'grad-ver #000 #fff', 'grad 45 #000 #fff',
    'grad', 'grad #000', 'grad #000 #fff #888',
  ]

  for (const color of COLOR_TESTS) {
    it(`color: ${color}`, () => {
      const input = `Frame bg ${color}`
      const { crashed } = safeValidate(input)
      expect(crashed).toBe(false)
    })
  }
})

// ============================================================================
// 9. LEXER STRESS TEST
// ============================================================================

describe('Fuzz: Lexer Stress', () => {
  it('very long identifier', () => {
    const id = 'A'.repeat(10000)
    const { crashed } = safeTokenize(id)
    expect(crashed).toBe(false)
  })

  it('many tokens', () => {
    const tokens = Array(1000).fill('Frame').join(' ')
    const { crashed } = safeTokenize(tokens)
    expect(crashed).toBe(false)
  })

  it('alternating indent/dedent', () => {
    let code = ''
    for (let i = 0; i < 100; i++) {
      code += '  '.repeat(i % 10) + 'Frame\n'
    }
    const { crashed } = safeTokenize(code)
    expect(crashed).toBe(false)
  })

  it('only operators', () => {
    const ops = ':,;.()[]{}=><+-*/'
    const input = ops.repeat(100)
    const { crashed } = safeTokenize(input)
    expect(crashed).toBe(false)
  })

  it('mixed valid and invalid', () => {
    seed = 12345
    let code = ''
    for (let i = 0; i < 50; i++) {
      if (seededRandom() > 0.5) {
        code += 'Frame w 100\n'
      } else {
        code += randomString(randomInt(1, 20), '~`^\\|') + '\n'
      }
    }
    const { crashed } = safeTokenize(code)
    expect(crashed).toBe(false)
  })
})

// ============================================================================
// 10. PURE RANDOM CHAOS
// ============================================================================

describe('Fuzz: Pure Random Chaos', () => {
  // Generate completely random byte sequences
  for (let i = 0; i < 20; i++) {
    it(`chaos #${i + 1}`, () => {
      seed = 99999 + i * 777

      // Random length 1-500
      const length = randomInt(1, 500)
      let input = ''

      for (let j = 0; j < length; j++) {
        // Random byte 0-127 (ASCII range)
        const byte = randomInt(0, 127)
        input += String.fromCharCode(byte)
      }

      const { crashed: lexerCrashed } = safeTokenize(input)
      expect(lexerCrashed).toBe(false)

      const { crashed: validatorCrashed } = safeValidate(input)
      expect(validatorCrashed).toBe(false)
    })
  }
})

// ============================================================================
// 11. UNICODE CHAOS
// ============================================================================

describe('Fuzz: Unicode Chaos', () => {
  for (let i = 0; i < 10; i++) {
    it(`unicode chaos #${i + 1}`, () => {
      seed = 88888 + i * 333

      const length = randomInt(10, 200)
      let input = ''

      for (let j = 0; j < length; j++) {
        // Random unicode codepoint (BMP range)
        const codepoint = randomInt(0x20, 0xFFFF)
        // Skip surrogates
        if (codepoint >= 0xD800 && codepoint <= 0xDFFF) continue
        input += String.fromCharCode(codepoint)
      }

      const { crashed } = safeValidate(input)
      expect(crashed).toBe(false)
    })
  }
})

// ============================================================================
// 12. STRUCTURE FUZZING
// ============================================================================

describe('Fuzz: Random Structure', () => {
  for (let i = 0; i < 20; i++) {
    it(`structure #${i + 1}`, () => {
      seed = 77777 + i * 555

      let code = ''
      const lines = randomInt(5, 30)

      for (let line = 0; line < lines; line++) {
        const indent = randomInt(0, 8)
        const element = randomChoice(PRIMITIVES)
        const props: string[] = []

        // Random number of properties
        const propCount = randomInt(0, 5)
        for (let p = 0; p < propCount; p++) {
          const prop = randomChoice(PROPERTIES)
          const value = randomChoice([...NUMBERS, ...COLORS, ...KEYWORDS])
          props.push(`${prop} ${value}`)
        }

        // Sometimes add a string
        if (seededRandom() > 0.7) {
          props.unshift(`"${randomString(randomInt(0, 20), 'abcdefghijklmnopqrstuvwxyz ')}"`)
        }

        // Sometimes add a state
        if (seededRandom() > 0.8) {
          code += '  '.repeat(indent) + randomChoice(STATES) + '\n'
          code += '  '.repeat(indent + 1) + 'bg #333\n'
        }

        // Sometimes make it a component definition
        const suffix = seededRandom() > 0.8 ? ':' : ''

        code += '  '.repeat(indent) + element + suffix
        if (props.length > 0) {
          code += ' ' + props.join(', ')
        }
        code += '\n'
      }

      const { crashed } = safeValidate(code)
      expect(crashed).toBe(false)
    })
  }
})

// ============================================================================
// 13. TOKEN DEFINITION FUZZING
// ============================================================================

describe('Fuzz: Token Definitions', () => {
  for (let i = 0; i < 20; i++) {
    it(`tokens #${i + 1}`, () => {
      seed = 66666 + i * 444

      let code = ''
      const tokenCount = randomInt(1, 10)

      // Generate random token definitions
      for (let t = 0; t < tokenCount; t++) {
        const name = randomString(randomInt(3, 10), 'abcdefghijklmnopqrstuvwxyz')
        const suffix = randomChoice(['.bg', '.col', '.pad', '.rad', '.gap', ''])
        const value = randomChoice([...COLORS, ...NUMBERS])
        code += `${name}${suffix}: ${value}\n`
      }

      // Use some tokens
      code += '\nFrame'
      for (let t = 0; t < Math.min(3, tokenCount); t++) {
        const name = randomString(randomInt(3, 10), 'abcdefghijklmnopqrstuvwxyz')
        code += ` bg $${name}`
      }

      const { crashed } = safeValidate(code)
      expect(crashed).toBe(false)
    })
  }
})

// ============================================================================
// 14. COMPONENT DEFINITION FUZZING
// ============================================================================

describe('Fuzz: Component Definitions', () => {
  for (let i = 0; i < 20; i++) {
    it(`components #${i + 1}`, () => {
      seed = 55555 + i * 222

      let code = ''
      const compCount = randomInt(1, 5)
      const compNames: string[] = []

      // Generate random component definitions
      for (let c = 0; c < compCount; c++) {
        const name = 'Comp' + randomString(randomInt(2, 8), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')
        compNames.push(name)

        const base = seededRandom() > 0.5 ? ` as ${randomChoice(PRIMITIVES)}` : ''
        const props = PROPERTIES.slice(0, randomInt(0, 5)).map(p => `${p} ${randomChoice(NUMBERS)}`).join(', ')

        code += `${name}${base}: ${props}\n`

        // Sometimes add child component definitions
        if (seededRandom() > 0.7) {
          code += `  Inner: col white\n`
        }
      }

      code += '\n'

      // Use some components
      for (const name of compNames.slice(0, 3)) {
        code += `${name}\n`
      }

      const { crashed } = safeValidate(code)
      expect(crashed).toBe(false)
    })
  }
})

// ============================================================================
// 15. REGRESSION: Known Problematic Inputs
// ============================================================================

describe('Fuzz: Regression Cases', () => {
  // Add any inputs that previously caused crashes
  const REGRESSION_INPUTS = [
    '', // Empty input
    '\n\n\n', // Only newlines
    '   ', // Only spaces
    '\t\t\t', // Only tabs
    '\r\n\r\n', // Windows line endings
    '\r\r\r', // Old Mac line endings
    '\0', // Null byte
    '\x00\x01\x02', // Control characters
    '\\', // Single backslash
    '//', // Comment start
    '/* */', // Block comment (not supported)
    '---', // Section start
    '...', // Ellipsis
    '===', // Triple equals
    '!==', // Strict not equal
    '&&', // Logical and
    '||', // Logical or
    '??', // Nullish coalescing (not supported)
    '?.', // Optional chaining (not supported)
    '=>', // Arrow (not supported)
    '${x}', // Template literal (not supported)
    '`template`', // Backtick string (not supported)
  ]

  for (const input of REGRESSION_INPUTS) {
    const displayInput = JSON.stringify(input).slice(0, 30)
    it(`regression: ${displayInput}`, () => {
      const { crashed: lexerCrashed } = safeTokenize(input)
      expect(lexerCrashed).toBe(false)

      const { crashed: validatorCrashed } = safeValidate(input)
      expect(validatorCrashed).toBe(false)
    })
  }
})
