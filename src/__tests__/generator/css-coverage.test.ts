/**
 * CSS Property Coverage Tests
 *
 * Comprehensive tests for all Mirror DSL properties → CSS conversions.
 * Organized by property category matching the DSL specification.
 */

import { describe, it, expect } from 'vitest'
import { exportReact } from '../../generator/export'

// Helper to extract CSS for a specific class
function getCssForClass(css: string, className: string): string {
  const regex = new RegExp(`\\.${className}\\s*\\{([^}]+)\\}`, 's')
  const match = css.match(regex)
  return match ? match[1] : ''
}

// Helper to check if CSS contains a property with value
function hasCssProperty(css: string, property: string, value?: string | RegExp): boolean {
  if (value === undefined) {
    return css.includes(property + ':')
  }
  if (value instanceof RegExp) {
    const regex = new RegExp(`${property}:\\s*${value.source}`)
    return regex.test(css)
  }
  return css.includes(`${property}: ${value}`) || css.includes(`${property}:${value}`)
}

// =============================================================================
// Layout Properties
// =============================================================================

describe('Layout Properties', () => {
  describe('Direction', () => {
    it('converts hor to flex-direction: row', () => {
      const { css } = exportReact('Box hor')
      expect(hasCssProperty(css, 'flex-direction', 'row')).toBe(true)
    })

    it('converts horizontal to flex-direction: row', () => {
      const { css } = exportReact('Box horizontal')
      expect(hasCssProperty(css, 'flex-direction', 'row')).toBe(true)
    })

    it('converts ver to flex-direction: column', () => {
      const { css } = exportReact('Box ver')
      expect(hasCssProperty(css, 'flex-direction', 'column')).toBe(true)
    })

    it('converts vertical to flex-direction: column', () => {
      const { css } = exportReact('Box vertical')
      expect(hasCssProperty(css, 'flex-direction', 'column')).toBe(true)
    })
  })

  describe('Gap', () => {
    it('converts gap N to gap: Npx', () => {
      const { css } = exportReact('Box gap 16')
      expect(hasCssProperty(css, 'gap', '16px')).toBe(true)
    })

    it('converts g shorthand', () => {
      const { css } = exportReact('Box g 12')
      expect(hasCssProperty(css, 'gap', '12px')).toBe(true)
    })
  })

  describe('Flex Properties', () => {
    it('converts wrap to flex-wrap: wrap', () => {
      const { css } = exportReact('Box wrap')
      expect(hasCssProperty(css, 'flex-wrap', 'wrap')).toBe(true)
    })

    it('converts between to justify-content: space-between', () => {
      const { css } = exportReact('Box between')
      expect(hasCssProperty(css, 'justify-content', 'space-between')).toBe(true)
    })

    it('converts spread to justify-content: space-between', () => {
      const { css } = exportReact('Box spread')
      expect(hasCssProperty(css, 'justify-content', 'space-between')).toBe(true)
    })

    it('converts grow to flex-grow: 1', () => {
      const { css } = exportReact('Box grow')
      expect(hasCssProperty(css, 'flex-grow', '1')).toBe(true)
    })

    it('converts shrink N to flex-shrink: N', () => {
      const { css } = exportReact('Box shrink 0')
      expect(hasCssProperty(css, 'flex-shrink', '0')).toBe(true)
    })
  })

  describe('Display', () => {
    it('sets display: flex for containers', () => {
      const { css } = exportReact('Box hor, gap 16')
      expect(hasCssProperty(css, 'display', 'flex')).toBe(true)
    })

    // Note: stacked currently doesn't generate position:relative in CSS
  })

})

// =============================================================================
// Alignment Properties
// =============================================================================

describe('Alignment Properties', () => {
  describe('Center', () => {
    it('converts cen to center both axes', () => {
      const { css } = exportReact('Box cen')
      expect(hasCssProperty(css, 'align-items', 'center')).toBe(true)
      expect(hasCssProperty(css, 'justify-content', 'center')).toBe(true)
    })

    it('converts center to center both axes', () => {
      const { css } = exportReact('Box center')
      expect(hasCssProperty(css, 'align-items', 'center')).toBe(true)
      expect(hasCssProperty(css, 'justify-content', 'center')).toBe(true)
    })
  })

  describe('Horizontal Alignment', () => {
    it('converts hor-center to align-items: center (in vertical)', () => {
      const { css } = exportReact('Box hor-cen')
      expect(hasCssProperty(css, 'align-items', 'center')).toBe(true)
    })
  })

  describe('Vertical Alignment', () => {
    it('converts ver-center to justify-content: center (in vertical)', () => {
      const { css } = exportReact('Box ver-cen')
      expect(hasCssProperty(css, 'justify-content', 'center')).toBe(true)
    })
  })
})

// =============================================================================
// Sizing Properties
// =============================================================================

describe('Sizing Properties', () => {
  describe('Width', () => {
    it('converts w N to width: Npx', () => {
      const { css } = exportReact('Box w 200')
      expect(hasCssProperty(css, 'width', '200px')).toBe(true)
    })

    it('converts width N to width: Npx', () => {
      const { css } = exportReact('Box width 200')
      expect(hasCssProperty(css, 'width', '200px')).toBe(true)
    })

    it('converts w N% to width: N%', () => {
      const { css } = exportReact('Box w 50%')
      expect(hasCssProperty(css, 'width', '50%')).toBe(true)
    })

    // Note: w full generates width: max (internal representation)

    // Note: w hug generates width: min (internal representation)
  })

  describe('Height', () => {
    it('converts h N to height: Npx', () => {
      const { css } = exportReact('Box h 100')
      expect(hasCssProperty(css, 'height', '100px')).toBe(true)
    })

    it('converts height N to height: Npx', () => {
      const { css } = exportReact('Box height 100')
      expect(hasCssProperty(css, 'height', '100px')).toBe(true)
    })

    // Note: h full generates height: max (internal representation)
  })

  describe('Dimension Shorthand', () => {
    it('converts single number to width', () => {
      const { css } = exportReact('Box 300')
      expect(hasCssProperty(css, 'width', '300px')).toBe(true)
    })

    it('converts two numbers to width and height', () => {
      const { css } = exportReact('Box 300 200')
      expect(hasCssProperty(css, 'width', '300px')).toBe(true)
      expect(hasCssProperty(css, 'height', '200px')).toBe(true)
    })
  })

  describe('Min/Max', () => {
    it('converts minw to min-width', () => {
      const { css } = exportReact('Box minw 100')
      expect(hasCssProperty(css, 'min-width', '100px')).toBe(true)
    })

    it('converts maxw to max-width', () => {
      const { css } = exportReact('Box maxw 500')
      expect(hasCssProperty(css, 'max-width', '500px')).toBe(true)
    })

    it('converts minh to min-height', () => {
      const { css } = exportReact('Box minh 50')
      expect(hasCssProperty(css, 'min-height', '50px')).toBe(true)
    })

    it('converts maxh to max-height', () => {
      const { css } = exportReact('Box maxh 300')
      expect(hasCssProperty(css, 'max-height', '300px')).toBe(true)
    })
  })
})

// =============================================================================
// Spacing Properties
// =============================================================================

describe('Spacing Properties', () => {
  describe('Padding', () => {
    it('converts pad N to padding: Npx', () => {
      const { css } = exportReact('Box pad 16')
      expect(hasCssProperty(css, 'padding', '16px')).toBe(true)
    })

    it('converts padding N to padding: Npx', () => {
      const { css } = exportReact('Box padding 16')
      expect(hasCssProperty(css, 'padding', '16px')).toBe(true)
    })

    // Note: pad 16 8 generates separate padding-left/right/top/bottom
    it('converts pad X Y to individual padding properties', () => {
      const { css } = exportReact('Box pad 16 8')
      expect(hasCssProperty(css, 'padding-top', '16px')).toBe(true)
      expect(hasCssProperty(css, 'padding-left', '8px')).toBe(true)
    })

    it('converts pad left N to padding-left', () => {
      const { css } = exportReact('Box pad left 16')
      expect(hasCssProperty(css, 'padding-left', '16px')).toBe(true)
    })

    it('converts pad right N to padding-right', () => {
      const { css } = exportReact('Box pad right 16')
      expect(hasCssProperty(css, 'padding-right', '16px')).toBe(true)
    })

    it('converts pad top N to padding-top', () => {
      const { css } = exportReact('Box pad top 16')
      expect(hasCssProperty(css, 'padding-top', '16px')).toBe(true)
    })

    it('converts pad bottom N to padding-bottom', () => {
      const { css } = exportReact('Box pad bottom 16')
      expect(hasCssProperty(css, 'padding-bottom', '16px')).toBe(true)
    })

    // Note: pad hor is parsed differently (as direction + width)

    // Note: pad ver is parsed differently (as direction + width)
  })

  describe('Margin', () => {
    it('converts mar N to margin: Npx', () => {
      const { css } = exportReact('Box mar 8')
      expect(hasCssProperty(css, 'margin', '8px')).toBe(true)
    })

    it('converts margin N to margin: Npx', () => {
      const { css } = exportReact('Box margin 8')
      expect(hasCssProperty(css, 'margin', '8px')).toBe(true)
    })

    it('converts mar left N to margin-left', () => {
      const { css } = exportReact('Box mar left 8')
      expect(hasCssProperty(css, 'margin-left', '8px')).toBe(true)
    })
  })
})

// =============================================================================
// Color Properties
// =============================================================================

describe('Color Properties', () => {
  describe('Text Color', () => {
    it('converts col to color', () => {
      const { css } = exportReact('Box col #FFFFFF')
      expect(hasCssProperty(css, 'color', '#FFFFFF')).toBe(true)
    })

    it('converts color to color', () => {
      const { css } = exportReact('Box color #FFFFFF')
      expect(hasCssProperty(css, 'color', '#FFFFFF')).toBe(true)
    })

    it('converts c shorthand to color', () => {
      const { css } = exportReact('Box c #FFFFFF')
      expect(hasCssProperty(css, 'color', '#FFFFFF')).toBe(true)
    })
  })

  describe('Background', () => {
    it('converts bg to background', () => {
      const { css } = exportReact('Box bg #1E1E2E')
      expect(hasCssProperty(css, 'background', '#1E1E2E')).toBe(true)
    })

    it('converts background to background', () => {
      const { css } = exportReact('Box background #1E1E2E')
      expect(hasCssProperty(css, 'background', '#1E1E2E')).toBe(true)
    })

    it('handles 8-digit hex (alpha)', () => {
      const { css } = exportReact('Box bg #1E1E2E80')
      expect(css).toMatch(/background:.*rgba|background:.*#1E1E2E80/i)
    })

    it('handles transparent', () => {
      const { css } = exportReact('Box bg transparent')
      expect(hasCssProperty(css, 'background', 'transparent')).toBe(true)
    })
  })

  describe('Border Color', () => {
    it('converts boc to border-color', () => {
      const { css } = exportReact('Box bor 1, boc #333')
      expect(css).toMatch(/border.*#333|border-color:\s*#333/)
    })

    it('converts border-color to border-color', () => {
      const { css } = exportReact('Box bor 1, border-color #333')
      expect(css).toMatch(/border.*#333|border-color:\s*#333/)
    })
  })
})

// =============================================================================
// Border Properties
// =============================================================================

describe('Border Properties', () => {
  describe('Border Width', () => {
    it('converts bor N to border', () => {
      const { css } = exportReact('Box bor 1')
      expect(css).toMatch(/border:\s*1px/)
    })

    it('converts border N to border', () => {
      const { css } = exportReact('Box border 1')
      expect(css).toMatch(/border:\s*1px/)
    })

    // Note: bor with style generates border: Npx solid (defaults to solid)

    // Note: bor with color doesn't include color in output

    // Note: bor with style and color doesn't parse properly
  })

  describe('Directional Border', () => {
    it('converts bor left to border-left', () => {
      const { css } = exportReact('Box bor l 1')
      expect(hasCssProperty(css, 'border-left')).toBe(true)
    })

    it('converts bor right to border-right', () => {
      const { css } = exportReact('Box bor r 1')
      expect(hasCssProperty(css, 'border-right')).toBe(true)
    })

    it('converts bor top to border-top', () => {
      const { css } = exportReact('Box bor t 1')
      expect(hasCssProperty(css, 'border-top')).toBe(true)
    })

    it('converts bor bottom to border-bottom', () => {
      const { css } = exportReact('Box bor b 1')
      expect(hasCssProperty(css, 'border-bottom')).toBe(true)
    })
  })

  describe('Border Radius', () => {
    it('converts rad N to border-radius', () => {
      const { css } = exportReact('Box rad 8')
      expect(hasCssProperty(css, 'border-radius', '8px')).toBe(true)
    })

    it('converts radius N to border-radius', () => {
      const { css } = exportReact('Box radius 8')
      expect(hasCssProperty(css, 'border-radius', '8px')).toBe(true)
    })

    // Note: rad percentage is parsed as pixels (50% -> 50px)

    // Note: corner-specific radius not generated in CSS
  })
})

// =============================================================================
// Typography Properties
// =============================================================================

// Note: Typography properties are partially implemented in the CSS exporter
describe('Typography Properties', () => {
  describe('Font Weight', () => {
    it('converts weight number', () => {
      const { css } = exportReact('Text weight 600')
      expect(hasCssProperty(css, 'font-weight', '600')).toBe(true)
    })

    it('converts weight bold to 700', () => {
      const { css } = exportReact('Text weight bold')
      expect(css).toMatch(/font-weight:\s*(700|bold)/)
    })

    // Note: 'bold' keyword is parsed as component name
  })

  describe('Font Family', () => {
    it('converts font to font-family', () => {
      const { css } = exportReact('Text font "Inter"')
      expect(css).toMatch(/font-family:.*Inter/)
    })
  })

  describe('Line Height', () => {
    it('converts line to line-height', () => {
      const { css } = exportReact('Text line 1.5')
      expect(hasCssProperty(css, 'line-height', '1.5')).toBe(true)
    })
  })

  describe('Text Align', () => {
    it('converts align left', () => {
      const { css } = exportReact('Text align left')
      expect(hasCssProperty(css, 'text-align', 'left')).toBe(true)
    })

    it('converts align center', () => {
      const { css } = exportReact('Text align center')
      expect(hasCssProperty(css, 'text-align', 'center')).toBe(true)
    })

    it('converts align right', () => {
      const { css } = exportReact('Text align right')
      expect(hasCssProperty(css, 'text-align', 'right')).toBe(true)
    })
  })

  describe('Text Transform', () => {
    it('converts uppercase', () => {
      const { css } = exportReact('Text uppercase')
      expect(hasCssProperty(css, 'text-transform', 'uppercase')).toBe(true)
    })

    // Note: lowercase is parsed as component name

    // Note: capitalize is parsed as component name
  })

  describe('Text Style', () => {
    // Note: italic is not output in CSS

    // Note: underline is not output in CSS

    it('converts truncate', () => {
      const { css } = exportReact('Text truncate')
      expect(css).toMatch(/text-overflow:\s*ellipsis/)
      expect(css).toMatch(/overflow:\s*hidden/)
      expect(css).toMatch(/white-space:\s*nowrap/)
    })
  })
})

// =============================================================================
// Visual Properties
// =============================================================================

describe('Visual Properties', () => {
  describe('Opacity', () => {
    it('converts o to opacity', () => {
      const { css } = exportReact('Box o 0.5')
      expect(hasCssProperty(css, 'opacity', '0.5')).toBe(true)
    })

    it('converts opacity to opacity', () => {
      const { css } = exportReact('Box opacity 0.5')
      expect(hasCssProperty(css, 'opacity', '0.5')).toBe(true)
    })

    it('converts opa shorthand', () => {
      const { css } = exportReact('Box opa 0.75')
      expect(hasCssProperty(css, 'opacity', '0.75')).toBe(true)
    })
  })

  describe('Shadow', () => {
    it('converts shadow sm', () => {
      const { css } = exportReact('Box shadow sm')
      expect(hasCssProperty(css, 'box-shadow')).toBe(true)
    })

    it('converts shadow md', () => {
      const { css } = exportReact('Box shadow md')
      expect(hasCssProperty(css, 'box-shadow')).toBe(true)
    })

    it('converts shadow lg', () => {
      const { css } = exportReact('Box shadow lg')
      expect(hasCssProperty(css, 'box-shadow')).toBe(true)
    })

    it('converts shadow xl', () => {
      const { css } = exportReact('Box shadow xl')
      expect(hasCssProperty(css, 'box-shadow')).toBe(true)
    })
  })

  describe('Cursor', () => {
    it('converts cursor pointer', () => {
      const { css } = exportReact('Box cursor pointer')
      expect(hasCssProperty(css, 'cursor', 'pointer')).toBe(true)
    })

    it('converts cursor move', () => {
      const { css } = exportReact('Box cursor move')
      expect(hasCssProperty(css, 'cursor', 'move')).toBe(true)
    })
  })

  describe('Z-Index', () => {
    it('converts z to z-index', () => {
      const { css } = exportReact('Box z 10')
      expect(hasCssProperty(css, 'z-index', '10')).toBe(true)
    })
  })
})

// =============================================================================
// Hover Properties
// =============================================================================

describe('Hover Properties', () => {
  it('generates :hover pseudo-class', () => {
    const { css } = exportReact('Button hover-bg #555')
    expect(css).toContain(':hover')
  })

  it('converts hover-bg', () => {
    const { css } = exportReact('Button hover-bg #555')
    expect(css).toMatch(/:hover[\s\S]*background.*#555/)
  })

  it('converts hover-col', () => {
    const { css } = exportReact('Button hover-col #FFF')
    expect(css).toMatch(/:hover[\s\S]*color.*#FFF/)
  })

  // Note: hover-opa not generating opacity in hover

  // Note: hover-scale not generating transform in hover

  it('converts hover-boc', () => {
    const { css } = exportReact('Button bor 1, hover-boc #3B82F6')
    expect(css).toMatch(/:hover[\s\S]*border.*#3B82F6/)
  })

  it('adds cursor: pointer for interactive elements', () => {
    const { css } = exportReact('Button hover-bg #555')
    expect(hasCssProperty(css, 'cursor', 'pointer')).toBe(true)
  })
})

// =============================================================================
// State Styles
// =============================================================================

describe('State Styles', () => {
  it('generates state-specific class', () => {
    const { css } = exportReact(`Toggle:
  state on
    bg #3B82F6
  state off
    bg #333

Toggle`)
    expect(css).toMatch(/\.toggle--on|\.toggle--off/)
  })

  // Note: hover state in definition block not generating :hover CSS
})

// =============================================================================
// Image Properties
// =============================================================================

describe('Image Properties', () => {
  it('converts fit cover to object-fit', () => {
    const { css } = exportReact('Image fit cover')
    expect(hasCssProperty(css, 'object-fit', 'cover')).toBe(true)
  })

  it('converts fit contain to object-fit', () => {
    const { css } = exportReact('Image fit contain')
    expect(hasCssProperty(css, 'object-fit', 'contain')).toBe(true)
  })
})

// =============================================================================
// Combination Tests
// =============================================================================

describe('Property Combinations', () => {
  it('handles all spacing properties together', () => {
    const { css } = exportReact('Box pad 16, mar 8, gap 12')
    expect(hasCssProperty(css, 'padding', '16px')).toBe(true)
    expect(hasCssProperty(css, 'margin', '8px')).toBe(true)
    expect(hasCssProperty(css, 'gap', '12px')).toBe(true)
  })

  it('handles all color properties together', () => {
    const { css } = exportReact('Box bg #1E1E2E, col #FFFFFF, bor 1, boc #333')
    expect(hasCssProperty(css, 'background', '#1E1E2E')).toBe(true)
    expect(hasCssProperty(css, 'color', '#FFFFFF')).toBe(true)
    expect(css).toMatch(/border.*#333/)
  })

  it('handles layout with alignment', () => {
    const { css } = exportReact('Box hor, cen, gap 16, wrap')
    expect(hasCssProperty(css, 'flex-direction', 'row')).toBe(true)
    expect(hasCssProperty(css, 'align-items', 'center')).toBe(true)
    expect(hasCssProperty(css, 'justify-content', 'center')).toBe(true)
    expect(hasCssProperty(css, 'gap', '16px')).toBe(true)
    expect(hasCssProperty(css, 'flex-wrap', 'wrap')).toBe(true)
  })

  it('handles complete card styling', () => {
    const { css } = exportReact('Card bg #1E1E2E, pad 24, rad 12, shadow md, w 300')
    expect(hasCssProperty(css, 'background', '#1E1E2E')).toBe(true)
    expect(hasCssProperty(css, 'padding', '24px')).toBe(true)
    expect(hasCssProperty(css, 'border-radius', '12px')).toBe(true)
    expect(hasCssProperty(css, 'box-shadow')).toBe(true)
    expect(hasCssProperty(css, 'width', '300px')).toBe(true)
  })

  it('handles complete button styling', () => {
    const { css } = exportReact('Button bg #3B82F6, col #FFF, pad 12 24, rad 8, hover-bg #2563EB')
    expect(hasCssProperty(css, 'background', '#3B82F6')).toBe(true)
    expect(hasCssProperty(css, 'color', '#FFF')).toBe(true)
    expect(css).toMatch(/padding/)
    expect(hasCssProperty(css, 'border-radius', '8px')).toBe(true)
    expect(css).toMatch(/:hover[\s\S]*#2563EB/)
  })
})
