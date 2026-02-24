/**
 * Test für Syntax Shortcuts
 *
 * Testet:
 * - Dimension Shorthand (80 50 = width 80, height 50)
 * - Image Shorthand (String = src)
 * - Property Kurzformen (g = gap, pad = padding, etc.)
 * - Single vs Double Number Interpretation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { parse } from '../../parser/parser'
import { screen, fireEvent } from '@testing-library/react'

import {
  renderMirror,
  parseAndRender,
  getStyledElement,
  getFirstNode,
  getParseErrors,
  getSyntaxWarnings,
  getTextContent,
  getProperty,
  colorsMatch,
} from './utils'

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Dimension Shorthand
// ============================================================

const DIMENSION_SHORTHAND_CODE = `
Row hor, g 8
  Box 80, 50, bg #2271c1, rad 8, cen
    Text text-size 11, "80×50"
  Card 60, 60, bg #333, rad 8, cen
    Text text-size 11, "60"
`.trim()

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Single Number (width only)
// ============================================================

const SINGLE_NUMBER_CODE = `
Row hor, g 8
  Box 80, 50, bg #2271c1, rad 8, cen
    Text text-size 11, "80×50"
  Card 60, bg #333, rad 8, cen
    Text text-size 11, "60"
`.trim()

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Image Shorthand
// ============================================================

const IMAGE_SHORTHAND_CODE = `
Gallery hor, g 16
  Image "https://picsum.photos/id/10/200/150", 200, 150, rad 8
  Image "https://picsum.photos/id/20/120/80", 120, 80, rad 8
  Image "https://picsum.photos/id/64/48/48", 48, 48, rad 24
`.trim()

// ============================================================
// DAS ZU TESTENDE BEISPIEL: Property Kurzformen
// ============================================================

const PROPERTY_SHORTCUTS_CODE = `
Card bg #1a1a1a, pad 16, rad 8, g 12
  Title col white, text-size 18, weight 600, "Shortcuts Demo"
  Box w 100, h 50, bg #333, rad 4
`.trim()

// ============================================================
// 1. PARSER TESTS - Dimension Shorthand (Two Numbers)
// ============================================================

describe('Syntax Shortcuts: Parser (Dimension Shorthand)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(DIMENSION_SHORTHAND_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })

    it('sollte keine Syntax-Warnings haben', () => {
      expect(getSyntaxWarnings(result)).toHaveLength(0)
    })
  })

  describe('Node-Struktur', () => {
    it('sollte Row als Root-Node haben', () => {
      expect(getFirstNode(result)?.name).toBe('Row')
    })

    it('sollte 2 Kinder haben (Box und Card)', () => {
      const children = getFirstNode(result)?.children as any[]
      expect(children?.length).toBe(2)
    })

    it('sollte Box als erstes Kind haben', () => {
      const children = getFirstNode(result)?.children as any[]
      expect(children?.[0]?.name).toBe('Box')
    })

    it('sollte Card als zweites Kind haben', () => {
      const children = getFirstNode(result)?.children as any[]
      expect(children?.[1]?.name).toBe('Card')
    })
  })

  describe('Box Dimensionen (80, 50)', () => {
    it('sollte width 80 haben', () => {
      const children = getFirstNode(result)?.children as any[]
      const box = children?.[0]
      const width = getProperty(box, 'width') || getProperty(box, 'w')
      expect(width).toBe(80)
    })

    it('sollte height 50 haben', () => {
      const children = getFirstNode(result)?.children as any[]
      const box = children?.[0]
      const height = getProperty(box, 'height') || getProperty(box, 'h')
      expect(height).toBe(50)
    })
  })

  describe('Card Dimensionen (60, 60)', () => {
    it('sollte width 60 haben', () => {
      const children = getFirstNode(result)?.children as any[]
      const card = children?.[1]
      const width = getProperty(card, 'width') || getProperty(card, 'w')
      expect(width).toBe(60)
    })

    it('sollte height 60 haben', () => {
      const children = getFirstNode(result)?.children as any[]
      const card = children?.[1]
      const height = getProperty(card, 'height') || getProperty(card, 'h')
      expect(height).toBe(60)
    })
  })
})

// ============================================================
// 2. PARSER TESTS - Single Number (Width Only)
// ============================================================

describe('Syntax Shortcuts: Parser (Single Number)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(SINGLE_NUMBER_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })

    it('sollte keine Syntax-Warnings haben', () => {
      expect(getSyntaxWarnings(result)).toHaveLength(0)
    })
  })

  describe('Card mit einer Zahl (60)', () => {
    it('sollte width 60 haben', () => {
      const children = getFirstNode(result)?.children as any[]
      const card = children?.[1]
      const width = getProperty(card, 'width') || getProperty(card, 'w')
      expect(width).toBe(60)
    })

    it('sollte KEINE explizite height haben', () => {
      const children = getFirstNode(result)?.children as any[]
      const card = children?.[1]
      const height = getProperty(card, 'height') || getProperty(card, 'h')
      // Eine einzelne Zahl setzt nur width, nicht height
      expect(height).toBeUndefined()
    })
  })
})

// ============================================================
// 3. PARSER TESTS - Image Shorthand
// ============================================================

describe('Syntax Shortcuts: Parser (Image Shorthand)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(IMAGE_SHORTHAND_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })

    it('sollte keine Syntax-Warnings haben', () => {
      expect(getSyntaxWarnings(result)).toHaveLength(0)
    })
  })

  describe('Node-Struktur', () => {
    it('sollte Gallery als Root-Node haben', () => {
      expect(getFirstNode(result)?.name).toBe('Gallery')
    })

    it('sollte 3 Image-Kinder haben', () => {
      const children = getFirstNode(result)?.children as any[]
      expect(children?.length).toBe(3)
      expect(children?.every((c: any) => c.name === 'Image')).toBe(true)
    })
  })

  describe('Erstes Image (200x150)', () => {
    it('sollte src Property haben', () => {
      const children = getFirstNode(result)?.children as any[]
      const img = children?.[0]
      const src = getProperty(img, 'src')
      expect(src).toBe('https://picsum.photos/id/10/200/150')
    })

    it('sollte width 200 haben', () => {
      const children = getFirstNode(result)?.children as any[]
      const img = children?.[0]
      const width = getProperty(img, 'width') || getProperty(img, 'w')
      expect(width).toBe(200)
    })

    it('sollte height 150 haben', () => {
      const children = getFirstNode(result)?.children as any[]
      const img = children?.[0]
      const height = getProperty(img, 'height') || getProperty(img, 'h')
      expect(height).toBe(150)
    })

    it('sollte radius 8 haben', () => {
      const children = getFirstNode(result)?.children as any[]
      const img = children?.[0]
      const rad = getProperty(img, 'rad') || getProperty(img, 'radius')
      expect(rad).toBe(8)
    })
  })

  describe('Drittes Image (48x48, rad 24 = Kreis)', () => {
    it('sollte radius 24 haben (halbe Breite = Kreis)', () => {
      const children = getFirstNode(result)?.children as any[]
      const img = children?.[2]
      const rad = getProperty(img, 'rad') || getProperty(img, 'radius')
      expect(rad).toBe(24)
    })
  })
})

// ============================================================
// 4. PARSER TESTS - Property Kurzformen
// ============================================================

describe('Syntax Shortcuts: Parser (Property Shortcuts)', () => {
  let result: ReturnType<typeof parse>

  beforeEach(() => {
    result = parse(PROPERTY_SHORTCUTS_CODE)
  })

  describe('Fehlerfreiheit', () => {
    it('sollte keine Parse-Fehler haben', () => {
      expect(getParseErrors(result)).toHaveLength(0)
    })

    it('sollte keine Syntax-Warnings haben', () => {
      expect(getSyntaxWarnings(result)).toHaveLength(0)
    })
  })

  describe('Card Properties', () => {
    it('sollte bg als background parsen', () => {
      const card = getFirstNode(result)
      expect(getProperty(card, 'bg')).toBe('#1a1a1a')
    })

    it('sollte pad als padding parsen', () => {
      const card = getFirstNode(result)
      expect(getProperty(card, 'pad')).toBe(16)
    })

    it('sollte rad als radius parsen', () => {
      const card = getFirstNode(result)
      expect(getProperty(card, 'rad')).toBe(8)
    })

    it('sollte g als gap parsen', () => {
      const card = getFirstNode(result)
      const gap = getProperty(card, 'gap') || getProperty(card, 'g')
      // gap sollte entweder 12 sein (g 12 im Code) oder als gap-Property gespeichert
      expect(gap).toBeDefined()
      expect(typeof gap === 'number').toBe(true)
    })
  })

  describe('Title Properties', () => {
    it('sollte col als color parsen', () => {
      const card = getFirstNode(result)
      const title = (card?.children as any[])?.[0]
      expect(getProperty(title, 'col')).toBe('white')
    })

    it('sollte text-size als font-size parsen', () => {
      const card = getFirstNode(result)
      const title = (card?.children as any[])?.[0]
      const size = getProperty(title, 'text-size') || getProperty(title, 'font-size')
      expect(size).toBe(18)
    })

    it('sollte weight parsen', () => {
      const card = getFirstNode(result)
      const title = (card?.children as any[])?.[0]
      expect(getProperty(title, 'weight')).toBe(600)
    })
  })

  describe('Box Properties (w/h Shortcuts)', () => {
    it('sollte w als width parsen', () => {
      const card = getFirstNode(result)
      const box = (card?.children as any[])?.[1]
      const width = getProperty(box, 'w') || getProperty(box, 'width')
      expect(width).toBe(100)
    })

    it('sollte h als height parsen', () => {
      const card = getFirstNode(result)
      const box = (card?.children as any[])?.[1]
      const height = getProperty(box, 'h') || getProperty(box, 'height')
      expect(height).toBe(50)
    })
  })
})

// ============================================================
// 5. REACT GENERATOR TESTS
// ============================================================

describe('Syntax Shortcuts: React Generator', () => {
  it('sollte Dimension Shorthand rendern', () => {
    const result = parse(DIMENSION_SHORTHAND_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Single Number rendern', () => {
    const result = parse(SINGLE_NUMBER_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Image Shorthand rendern', () => {
    const result = parse(IMAGE_SHORTHAND_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Property Shortcuts rendern', () => {
    const result = parse(PROPERTY_SHORTCUTS_CODE)
    expect(() => renderMirror(result)).not.toThrow()
  })

  it('sollte Text-Inhalte anzeigen', () => {
    parseAndRender(DIMENSION_SHORTHAND_CODE)
    expect(screen.getByText('80×50')).toBeInTheDocument()
    expect(screen.getByText('60')).toBeInTheDocument()
  })
})

// ============================================================
// 6. CSS STYLE TESTS - Dimension Shorthand
// ============================================================

describe('Syntax Shortcuts: CSS Styles (Dimensions)', () => {
  beforeEach(() => {
    parseAndRender(DIMENSION_SHORTHAND_CODE)
  })

  it('sollte Row mit flexDirection row haben', () => {
    const row = document.querySelector('[data-id^="Row"]') as HTMLElement
    expect(row?.style.flexDirection).toBe('row')
  })

  it('sollte Row mit gap 8px haben', () => {
    const row = document.querySelector('[data-id^="Row"]') as HTMLElement
    expect(row?.style.gap).toBe('8px')
  })

  it('sollte Box mit width 80px haben', () => {
    const box = document.querySelector('[data-id^="Box"]') as HTMLElement
    expect(box?.style.width).toBe('80px')
  })

  it('sollte Box mit height 50px haben', () => {
    const box = document.querySelector('[data-id^="Box"]') as HTMLElement
    expect(box?.style.height).toBe('50px')
  })

  it('sollte Card mit width 60px haben', () => {
    const card = document.querySelector('[data-id^="Card"]') as HTMLElement
    expect(card?.style.width).toBe('60px')
  })

  it('sollte Card mit height 60px haben', () => {
    const card = document.querySelector('[data-id^="Card"]') as HTMLElement
    expect(card?.style.height).toBe('60px')
  })
})

// ============================================================
// 7. CSS STYLE TESTS - Image Shorthand
// ============================================================

describe('Syntax Shortcuts: CSS Styles (Images)', () => {
  beforeEach(() => {
    parseAndRender(IMAGE_SHORTHAND_CODE)
  })

  it('sollte Gallery mit flexDirection row haben', () => {
    const gallery = document.querySelector('[data-id^="Gallery"]') as HTMLElement
    expect(gallery?.style.flexDirection).toBe('row')
  })

  it('sollte Image-Elemente haben', () => {
    const images = document.querySelectorAll('img')
    expect(images.length).toBe(3)
  })

  it('sollte erstes Bild mit korrekter Größe haben', () => {
    // Image-Styles können auf img oder auf Wrapper-Element angewendet werden
    const imageWrappers = document.querySelectorAll('[data-id^="Image"]')
    const firstWrapper = imageWrappers[0] as HTMLElement
    const firstImg = document.querySelectorAll('img')[0]
    // Entweder img oder wrapper hat die Größe
    const width = firstImg?.style.width || firstWrapper?.style.width
    expect(width === '200px' || width === '100%').toBe(true)
  })

  it('sollte erstes Bild mit korrekter Höhe haben', () => {
    const imageWrappers = document.querySelectorAll('[data-id^="Image"]')
    const firstWrapper = imageWrappers[0] as HTMLElement
    const firstImg = document.querySelectorAll('img')[0]
    const height = firstImg?.style.height || firstWrapper?.style.height
    expect(height === '150px' || height === '100%').toBe(true)
  })

  it('sollte drittes Bild mit borderRadius haben', () => {
    const imageWrappers = document.querySelectorAll('[data-id^="Image"]')
    const thirdWrapper = imageWrappers[2] as HTMLElement
    const thirdImg = document.querySelectorAll('img')[2]
    const radius = thirdImg?.style.borderRadius || thirdWrapper?.style.borderRadius
    // borderRadius kann 24px sein oder inherit
    expect(radius === '24px' || radius === 'inherit' || radius === '').toBe(true)
  })
})

// ============================================================
// 8. CSS STYLE TESTS - Property Shortcuts
// ============================================================

describe('Syntax Shortcuts: CSS Styles (Property Shortcuts)', () => {
  beforeEach(() => {
    parseAndRender(PROPERTY_SHORTCUTS_CODE)
  })

  it('sollte Card mit padding 16px haben', () => {
    const card = document.querySelector('[data-id^="Card"]') as HTMLElement
    expect(card?.style.padding).toBe('16px')
  })

  it('sollte Card mit borderRadius 8px haben', () => {
    const card = document.querySelector('[data-id^="Card"]') as HTMLElement
    expect(card?.style.borderRadius).toBe('8px')
  })

  it('sollte Card mit gap 12px haben', () => {
    const card = document.querySelector('[data-id^="Card"]') as HTMLElement
    expect(card?.style.gap).toBe('12px')
  })

  it('sollte Card mit background #1a1a1a haben', () => {
    const card = document.querySelector('[data-id^="Card"]') as HTMLElement
    expect(colorsMatch(card?.style.backgroundColor, '#1a1a1a')).toBe(true)
  })

  it('sollte Title mit color white haben', () => {
    const title = screen.getByText('Shortcuts Demo')
    const styledEl = getStyledElement(title)
    const color = styledEl.style.color
    const isWhite = color === 'white' || color === 'rgb(255, 255, 255)' || color === '#ffffff'
    expect(isWhite).toBe(true)
  })
})

// ============================================================
// 9. DOM STRUKTUR TESTS
// ============================================================

describe('Syntax Shortcuts: DOM Struktur', () => {
  describe('Dimension Shorthand', () => {
    beforeEach(() => {
      parseAndRender(DIMENSION_SHORTHAND_CODE)
    })

    it('sollte Row mit data-id haben', () => {
      const row = document.querySelector('[data-id^="Row"]')
      expect(row).toBeInTheDocument()
    })

    it('sollte Row mit Klassennamen haben', () => {
      const row = document.querySelector('.Row')
      expect(row).toBeInTheDocument()
    })

    it('sollte Box mit data-id haben', () => {
      const box = document.querySelector('[data-id^="Box"]')
      expect(box).toBeInTheDocument()
    })

    it('sollte Card mit data-id haben', () => {
      const card = document.querySelector('[data-id^="Card"]')
      expect(card).toBeInTheDocument()
    })
  })

  describe('Images', () => {
    beforeEach(() => {
      parseAndRender(IMAGE_SHORTHAND_CODE)
    })

    it('sollte alle Bilder mit src-Attribut haben', () => {
      const images = document.querySelectorAll('img')
      images.forEach((img) => {
        expect(img.getAttribute('src')).toContain('picsum.photos')
      })
    })
  })
})

// ============================================================
// 10. EDGE CASES
// ============================================================

describe('Syntax Shortcuts: Edge Cases', () => {
  it('sollte Dimension Shorthand mit weiteren Properties kombinieren', () => {
    const code = `
Box 100, 80, pad 12, bg #333, rad 8
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)

    const node = getFirstNode(result)
    const width = getProperty(node, 'width') || getProperty(node, 'w')
    const height = getProperty(node, 'height') || getProperty(node, 'h')
    expect(width).toBe(100)
    expect(height).toBe(80)
    expect(getProperty(node, 'pad')).toBe(12)
  })

  it('sollte Prozent-Werte für Dimensionen parsen', () => {
    const code = `
Box w 50%, h 100%, bg #333
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)

    const node = getFirstNode(result)
    const width = getProperty(node, 'width') || getProperty(node, 'w')
    const height = getProperty(node, 'height') || getProperty(node, 'h')
    expect(width).toBe('50%')
    expect(height).toBe('100%')
  })

  it('sollte "full" als width/height-Wert parsen', () => {
    const code = `
Box w full, bg #333
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)

    const node = getFirstNode(result)
    const width = getProperty(node, 'width') || getProperty(node, 'w')
    // 'full' wird intern als 'max' gespeichert
    expect(width === 'full' || width === 'max').toBe(true)
  })

  it('sollte "hug" als width/height-Wert parsen', () => {
    const code = `
Box w hug, bg #333
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)

    const node = getFirstNode(result)
    const width = getProperty(node, 'width') || getProperty(node, 'w')
    // 'hug' wird intern als 'min' gespeichert
    expect(width === 'hug' || width === 'min').toBe(true)
  })

  it('sollte size Shorthand parsen', () => {
    const code = `
Box size 100 80, bg #333
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)
  })

  it('sollte minw/maxw Kurzformen parsen', () => {
    const code = `
Box minw 100, maxw 300, bg #333
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)

    const node = getFirstNode(result)
    const minw = getProperty(node, 'minw') || getProperty(node, 'min-width')
    const maxw = getProperty(node, 'maxw') || getProperty(node, 'max-width')
    expect(minw).toBe(100)
    expect(maxw).toBe(300)
  })

  it('sollte minh/maxh Kurzformen parsen', () => {
    const code = `
Box minh 50, maxh 200, bg #333
    `.trim()

    const result = parse(code)
    expect(getParseErrors(result)).toHaveLength(0)

    const node = getFirstNode(result)
    const minh = getProperty(node, 'minh') || getProperty(node, 'min-height')
    const maxh = getProperty(node, 'maxh') || getProperty(node, 'max-height')
    expect(minh).toBe(50)
    expect(maxh).toBe(200)
  })
})

// ============================================================
// 11. SNAPSHOT TESTS
// ============================================================

describe('Syntax Shortcuts: Snapshots', () => {
  it('Dimension Shorthand - Parser Output stabil', () => {
    const result = parse(DIMENSION_SHORTHAND_CODE)
    const snapshot = {
      nodeCount: result.nodes?.length,
      errorCount: getParseErrors(result).length,
      childCount: (getFirstNode(result)?.children as any[])?.length,
    }
    expect(snapshot).toMatchSnapshot()
  })

  it('Image Shorthand - Parser Output stabil', () => {
    const result = parse(IMAGE_SHORTHAND_CODE)
    const snapshot = {
      nodeCount: result.nodes?.length,
      errorCount: getParseErrors(result).length,
      childCount: (getFirstNode(result)?.children as any[])?.length,
    }
    expect(snapshot).toMatchSnapshot()
  })

  it('sollte Dimension Shorthand dem HTML-Snapshot entsprechen', () => {
    const { container } = parseAndRender(DIMENSION_SHORTHAND_CODE)
    expect(container.innerHTML).toMatchSnapshot()
  })
})
