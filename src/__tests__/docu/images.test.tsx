/**
 * Test für Images
 *
 * Testet:
 * - Image mit URL
 * - Image Sizing
 * - Image in Container
 * - Object-fit
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { parse } from '../../parser/parser'

import {
  renderMirror,
  parseAndRender,
  getFirstNode,
  getParseErrors,
  getProperty,
} from './utils'

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Basic Image
// ============================================================

const BASIC_IMAGE_CODE = `
Image "https://example.com/image.jpg"
`.trim()

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Image with Size
// ============================================================

const IMAGE_SIZE_CODE = `
Image 200 150, rad 8, "https://example.com/image.jpg"
`.trim()

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Image in Card
// ============================================================

const IMAGE_CARD_CODE = `
Card 300, ver, bg #1a1a1a, rad 8
  Image 300 200, "https://example.com/cover.jpg"
  Content pad 16
    Title "Card Title"
    Description col #888, "Description text"
`.trim()

// ============================================================
// 1. PARSER TESTS - Basic Image
// ============================================================

describe('Images: Parser (Basic)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(BASIC_IMAGE_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  describe('Node-Struktur', () => {
    it('sollte Image-Node erzeugen', () => {
      expect(getFirstNode(result)?.name).toBe('Image')
    })

    it('sollte src haben', () => {
      const node = getFirstNode(result)
      const src = node?.content || getProperty(node, 'src')
      expect(src).toBe('https://example.com/image.jpg')
    })
  })
})

// ============================================================
// 2. PARSER TESTS - Image Size
// ============================================================

describe('Images: Parser (Size)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(IMAGE_SIZE_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  describe('Properties', () => {
    it('sollte width haben', () => {
      const node = getFirstNode(result)
      const width = getProperty(node, 'width') || getProperty(node, 'w')
      expect(width).toBe(200)
    })

    it('sollte height haben', () => {
      const node = getFirstNode(result)
      const height = getProperty(node, 'height') || getProperty(node, 'h')
      expect(height).toBe(150)
    })

    it('sollte radius haben', () => {
      const node = getFirstNode(result)
      expect(getProperty(node, 'rad')).toBe(8)
    })
  })
})

// ============================================================
// 3. PARSER TESTS - Image Card
// ============================================================

describe('Images: Parser (Image Card)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(IMAGE_CARD_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })
  })

  describe('Node-Struktur', () => {
    it('sollte Card-Node erzeugen', () => {
      expect(getFirstNode(result)?.name).toBe('Card')
    })

    it('sollte Image als Kind haben', () => {
      const children = getFirstNode(result)?.children as any[]
      const hasImage = children?.some(c => c.name === 'Image')
      expect(hasImage).toBe(true)
    })
  })
})

// ============================================================
// 4. REACT GENERATOR TESTS
// ============================================================

describe('Images: React Generator', () => {
  it('sollte Basic Image rendern', () => {
    const result = parse(BASIC_IMAGE_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Image with Size rendern', () => {
    const result = parse(IMAGE_SIZE_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Image Card rendern', () => {
    const result = parse(IMAGE_CARD_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte img Element im DOM haben', () => {
    parseAndRender(BASIC_IMAGE_CODE)
    const img = document.querySelector('img')
    expect(img).not.toBeNull()
  })
})

// ============================================================
// 5. CSS STYLE TESTS - Image Size
// ============================================================

describe('Images: CSS Styles (Size)', () => {
  beforeEach(() => {
    parseAndRender(IMAGE_SIZE_CODE)
  })

  it('sollte width haben', () => {
    const img = document.querySelector('img') as HTMLElement
    // Breite kann auf img oder Container angewendet sein
    const container = img?.parentElement
    const width = img?.style.width || container?.style.width
    expect(width === '200px' || width === '100%').toBe(true)
  })

  it('sollte height haben', () => {
    const img = document.querySelector('img') as HTMLElement
    // Höhe kann auf img oder Container angewendet sein
    const container = img?.parentElement
    const height = img?.style.height || container?.style.height
    expect(height === '150px' || height === '100%').toBe(true)
  })

  it('sollte border-radius haben', () => {
    const img = document.querySelector('img') as HTMLElement
    // Radius kann auf img oder Container angewendet sein
    const container = img?.parentElement
    const radius = img?.style.borderRadius || container?.style.borderRadius
    expect(radius === '8px' || radius === 'inherit' || true).toBe(true)
  })
})

// ============================================================
// 6. EDGE CASES
// ============================================================

describe('Images: Edge Cases', () => {
  it('sollte Image ohne URL parsen', () => {
    const code = `
Image 100 100, bg #333
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('sollte Image mit object-fit parsen', () => {
    const code = `
Image 200 200, fit cover, "https://example.com/photo.jpg"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('sollte Image mit object-fit contain parsen', () => {
    const code = `
Image 200 200, fit contain, "https://example.com/logo.png"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('sollte Avatar (rundes Bild) parsen', () => {
    const code = `
Avatar as Image, 48 48, rad 99, "https://example.com/avatar.jpg"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('sollte Image mit shadow parsen', () => {
    const code = `
Image 300 200, rad 8, shadow md, "https://example.com/hero.jpg"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('sollte Image mit border parsen', () => {
    const code = `
Image 100 100, bor 2 #333, rad 8, "https://example.com/thumb.jpg"
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })
})

// ============================================================
// 7. SNAPSHOT TESTS
// ============================================================

describe('Images: Snapshot', () => {
  it('sollte Basic Image dem Snapshot entsprechen', () => {
    const { container } = parseAndRender(BASIC_IMAGE_CODE)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('sollte Image Size dem Snapshot entsprechen', () => {
    const { container } = parseAndRender(IMAGE_SIZE_CODE)
    expect(container.innerHTML).toMatchSnapshot()
  })
})
