/**
 * Tests for studio/file-types/extensions.ts and studio/file-types/index.ts
 *
 * extensions.ts has 12.5% coverage (only one isMirrorSourceFile path covered),
 * index.ts has 39% coverage (templates + detect logic largely untested).
 *
 * Phase A: pin the extension predicates (extensions.ts).
 * Phase B: pin the content-based detection (detectFileType + per-type
 *          detect helpers).
 */

import { describe, it, expect } from 'vitest'
import {
  MIRROR_EXTENSIONS,
  isMirrorSourceFile,
  isComponentsFile,
  isLayoutFile,
} from '../../studio/file-types/extensions'
import {
  detectFileType,
  getFileIcon,
  getFileTypeColor,
  getFileTemplate,
  getFileExtension,
  FILE_TYPES,
} from '../../studio/file-types'

describe('extensions.ts — MIRROR_EXTENSIONS constant', () => {
  it('has the canonical extension lists', () => {
    expect(MIRROR_EXTENSIONS.layout).toEqual(['.mir', '.mirror'])
    expect(MIRROR_EXTENSIONS.components).toEqual(['.com', '.components'])
    expect(MIRROR_EXTENSIONS.tokens).toEqual(['.tok', '.tokens'])
  })
})

describe('extensions.ts — isMirrorSourceFile', () => {
  it.each([
    ['app.mir', true],
    ['page.mirror', true],
    ['button.com', true],
    ['ui.components', true],
    ['theme.tok', true],
    ['design.tokens', true],
    ['readme.md', false],
    ['style.css', false],
    ['data.yaml', false], // discovery: yaml is NOT a Mirror DSL source per this predicate
    ['data.yml', false],
  ])('isMirrorSourceFile(%s) → %s', (file, expected) => {
    expect(isMirrorSourceFile(file)).toBe(expected)
  })

  it('handles null and undefined inputs as false', () => {
    expect(isMirrorSourceFile(null)).toBe(false)
    expect(isMirrorSourceFile(undefined)).toBe(false)
    expect(isMirrorSourceFile('')).toBe(false)
  })

  it('uses suffix matching, not substring', () => {
    expect(isMirrorSourceFile('mirror.html')).toBe(false)
    expect(isMirrorSourceFile('component-test.txt')).toBe(false)
  })
})

describe('extensions.ts — isComponentsFile', () => {
  it('returns true ONLY for .com / .components', () => {
    expect(isComponentsFile('a.com')).toBe(true)
    expect(isComponentsFile('a.components')).toBe(true)
    expect(isComponentsFile('a.mir')).toBe(false)
    expect(isComponentsFile('a.tok')).toBe(false)
  })

  it('handles null/undefined gracefully', () => {
    expect(isComponentsFile(null)).toBe(false)
    expect(isComponentsFile(undefined)).toBe(false)
  })
})

describe('extensions.ts — isLayoutFile', () => {
  it('returns true ONLY for .mir / .mirror', () => {
    expect(isLayoutFile('a.mir')).toBe(true)
    expect(isLayoutFile('a.mirror')).toBe(true)
    expect(isLayoutFile('a.com')).toBe(false)
    expect(isLayoutFile('a.tok')).toBe(false)
  })

  it('handles null/undefined gracefully', () => {
    expect(isLayoutFile(null)).toBe(false)
    expect(isLayoutFile(undefined)).toBe(false)
  })
})

// =============================================================================
// FILE TYPE DETECTION
// =============================================================================

describe('detectFileType — filename hints (filename + empty content)', () => {
  // Discovery: detectFileType(name) with one arg is treated as CONTENT,
  // not filename. To engage the filename-hint path, pass an explicit
  // empty content as the second arg.
  it('detects "tokens" anywhere in filename → tokens type', () => {
    expect(detectFileType('tokens.mir', '')).toBe('tokens')
    expect(detectFileType('app-tokens.mir', '')).toBe('tokens')
    expect(detectFileType('Tokens.mir', '')).toBe('tokens') // case-insensitive
  })

  it('detects "component" anywhere in filename → component type', () => {
    expect(detectFileType('components.mir', '')).toBe('component')
    expect(detectFileType('my-components.mir', '')).toBe('component')
  })

  it('detects .data extension → data type', () => {
    expect(detectFileType('users.data', '')).toBe('data')
  })

  it('detects "data." in filename → data type', () => {
    expect(detectFileType('app.data.mir', '')).toBe('data')
  })

  it('detects "data.mir" exactly → data type', () => {
    expect(detectFileType('data.mir', '')).toBe('data')
  })

  it('falls back to layout for ambiguous filename without content', () => {
    expect(detectFileType('app.mir', '')).toBe('layout')
    expect(detectFileType('main.mir', '')).toBe('layout')
  })

  it('returns layout for empty input', () => {
    expect(detectFileType('')).toBe('layout')
  })

  it('Discovery: single-arg signature treats input as CONTENT, not filename', () => {
    // 'tokens.mir' as a single arg is parsed as content. No 'token.something:'
    // pattern → not detected as tokens. Fallback to layout.
    expect(detectFileType('tokens.mir')).toBe('layout')
    // To use filename-hint path, pass explicit empty content.
    expect(detectFileType('tokens.mir', '')).toBe('tokens')
  })
})

describe('detectFileType — content-based detection (filename + content)', () => {
  it('classifies as tokens when content has only token definitions (key.suffix: value)', () => {
    const content = `
primary.bg: #2271C1
primary.col: white
secondary.bg: #888
`
    expect(detectFileType('shared.mir', content)).toBe('tokens')
  })

  it('classifies as component when content uses Component: definitions', () => {
    const content = `
Button: pad 12, bg #2271C1, col white
Card: pad 16, bg #1a1a1a, rad 8
`
    expect(detectFileType('shared.mir', content)).toBe('component')
  })

  it('falls back to layout for ambiguous content (Frame/Text/Button instances)', () => {
    const content = `
Frame gap 12
  Text "Hello"
  Button "Click me"
`
    expect(detectFileType('app.mir', content)).toBe('layout')
  })

  it('classifies empty content as layout', () => {
    expect(detectFileType('something.mir', '')).toBe('layout')
    expect(detectFileType('something.mir', '   \n\n')).toBe('layout')
  })

  it('classifies whitespace + comment-only content as layout', () => {
    const content = `// just a comment\n// another comment\n`
    expect(detectFileType('app.mir', content)).toBe('layout')
  })

  it('filename hint wins over content (tokens.mir with layout content → still tokens)', () => {
    const content = 'Frame gap 12\n  Text "Hello"\n'
    expect(detectFileType('tokens.mir', content)).toBe('tokens')
  })
})

describe('detectFileType — javascript detection', () => {
  it('classifies content with "javascript" + "end" markers as javascript', () => {
    const content = '\nfunction foo() {}\n// javascript\nend\n'
    expect(detectFileType('script.mir', content)).toBe('javascript')
  })
})

// =============================================================================
// FILE TYPES TABLE + ICON/COLOR API
// =============================================================================

describe('FILE_TYPES table', () => {
  it('has all 5 expected types', () => {
    expect(Object.keys(FILE_TYPES).sort()).toEqual([
      'component',
      'data',
      'javascript',
      'layout',
      'tokens',
    ])
  })

  it('every type has a non-empty label, color, icon, template, detect', () => {
    for (const [name, def] of Object.entries(FILE_TYPES)) {
      expect(def.label, `${name} has label`).toBeTruthy()
      expect(def.color, `${name} has color`).toMatch(/^#/)
      expect(def.icon, `${name} has icon`).toContain('<svg')
      expect(typeof def.template).toBe('function')
      expect(typeof def.detect).toBe('function')
    }
  })

  it('layout / component / tokens have an .extension; data / javascript do not', () => {
    expect(FILE_TYPES.layout.extension).toBe('.mir')
    expect(FILE_TYPES.component.extension).toBe('.com')
    expect(FILE_TYPES.tokens.extension).toBe('.tok')
    expect(FILE_TYPES.data.extension).toBeUndefined()
    expect(FILE_TYPES.javascript.extension).toBeUndefined()
  })
})

describe('getFileIcon', () => {
  it('returns the icon SVG for the file type with stroke replaced by the color', () => {
    const icon = getFileIcon('tokens.mir', () => 'tokens')
    expect(icon).toContain('<svg')
    // Stroke should be the tokens color, not "currentColor".
    expect(icon).toContain(`stroke="${FILE_TYPES.tokens.color}"`)
    expect(icon).not.toContain('stroke="currentColor"')
  })

  it('returns icon WITHOUT color when withColor=false (keeps currentColor)', () => {
    const icon = getFileIcon('a.mir', () => 'layout', false)
    expect(icon).toContain('stroke="currentColor"')
  })

  it('falls back to layout icon for unknown types', () => {
    // Pass a getFileType that returns an unknown name.
    const icon = getFileIcon('a', () => 'unknown' as never)
    expect(icon).toContain(FILE_TYPES.layout.color)
  })
})

describe('getFileTypeColor', () => {
  it('returns the color string for the file type', () => {
    expect(getFileTypeColor('tokens.mir', () => 'tokens')).toBe(FILE_TYPES.tokens.color)
    expect(getFileTypeColor('a.mir', () => 'data')).toBe(FILE_TYPES.data.color)
  })

  it('falls back to layout color for unknown types', () => {
    expect(getFileTypeColor('x', () => 'unknown' as never)).toBe(FILE_TYPES.layout.color)
  })
})

describe('getFileTemplate', () => {
  it('renders a layout template that includes the name', () => {
    const out = getFileTemplate('layout', 'home')
    expect(out).toContain('home')
  })

  it('renders a tokens template that includes the name', () => {
    const out = getFileTemplate('tokens', 'theme')
    expect(out).toContain('theme')
  })

  it('falls back to layout template for an unknown type', () => {
    const out = getFileTemplate('unknown' as never, 'fallback')
    expect(out).toContain('fallback')
  })
})

describe('getFileExtension', () => {
  it('returns the canonical extension for known types', () => {
    expect(getFileExtension('layout')).toBe('.mir')
    expect(getFileExtension('component')).toBe('.com')
    expect(getFileExtension('tokens')).toBe('.tok')
  })

  it('falls back to .mir for types without an extension', () => {
    expect(getFileExtension('data')).toBe('.mir')
    expect(getFileExtension('javascript')).toBe('.mir')
  })

  it('falls back to .mir for unknown types', () => {
    expect(getFileExtension('unknown' as never)).toBe('.mir')
  })
})
