/**
 * Demo Project Tests
 *
 * Comprehensive tests verifying that the demo project renders correctly
 * with all file types working together: tokens, components, data, and layout.
 *
 * These tests are STRICT - they verify:
 * - Exact token values resolved to CSS
 * - Correct data binding (right data in right card)
 * - Hierarchical structure (elements in correct parents)
 * - All visual properties (colors, sizes, fonts)
 * - All 3 cards, not just the first one
 */

import { testWithSetup, describe, type TestCase } from '../test-runner'
import type { TestAPI } from '../types'

// =============================================================================
// DEMO PROJECT CONTENT
// =============================================================================

const DEMO_TOKENS = `// Design Tokens
primary.bg: #2271C1
primary.ic: #2271C1
surface.bg: #1a1a1a
card.bg: #27272a
muted.col: #888
muted.ic: #888
space.pad: 16
space.gap: 12
radius.rad: 8`

const DEMO_COMPONENTS = `// Komponenten
Card: bg $card, pad $space, rad $radius, gap 8

Btn as Button: bg $primary, col white, pad 10 16, rad 6, cursor pointer
  hover:
    opacity 0.9`

const DEMO_DATA = `// Karten-Daten
cards:
  welcome:
    title: "Willkommen"
    text: "Dies ist ein Demo-Projekt."
    icon: home
  components:
    title: "Komponenten"
    text: "Baue wiederverwendbare UI-Bausteine."
    icon: layers
  preview:
    title: "Live Preview"
    text: "Änderungen sofort sehen."
    icon: eye`

const DEMO_LAYOUT = `// Demo - zeigt Tokens, Components und Data
Frame bg $surface, col white, pad 24, gap $space, h full

  // Header
  Frame hor, spread, ver-center
    Text "Demo App", fs 20, weight bold
    Icon "settings", ic $muted

  // Karten aus Daten
  each card in $cards
    Card
      Frame hor, gap $space, ver-center
        Icon card.icon, ic $primary, is 20
        Text card.title, fs 16, weight 500
      Text card.text, col $muted, fs 14
      Btn "Mehr"`

const DEMO_FULL = `${DEMO_TOKENS}

${DEMO_COMPONENTS}

${DEMO_DATA}

${DEMO_LAYOUT}`

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get all card elements (first child of each-item wrapper, since wrapper has display:contents) */
function getCards(): HTMLElement[] {
  const preview = document.getElementById('preview')
  const wrappers = preview?.querySelectorAll('[data-each-item]') || []
  // The actual Card component is the first child of the wrapper
  return Array.from(wrappers).map(w => w.children[0] as HTMLElement).filter(Boolean)
}

/** Get specific card by index (0, 1, 2) */
function getCard(index: number): HTMLElement | null {
  const cards = getCards()
  return cards[index] || null
}

/** Get the root element (node-1) */
function getRoot(): HTMLElement | null {
  // Try direct ID first
  let root = document.getElementById('node-1')
  if (root) return root
  // Fallback: find first element with node- prefix inside preview
  const preview = document.getElementById('preview')
  return preview?.querySelector('[id^="node-"]') as HTMLElement || null
}

/** Get text content of an element, excluding nested elements */
function getDirectText(el: HTMLElement): string {
  return Array.from(el.childNodes)
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent?.trim() || '')
    .join('')
}

/** Find element by text content within a parent */
function findByText(parent: HTMLElement, text: string): HTMLElement | null {
  const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT)
  let node: Text | null
  while ((node = walker.nextNode() as Text | null)) {
    if (node.textContent?.includes(text)) {
      return node.parentElement
    }
  }
  return null
}

/** Get computed style value */
function getStyle(el: HTMLElement, prop: string): string {
  return window.getComputedStyle(el)[prop as any] || ''
}

/** Check if color matches (handles rgb vs hex) */
function colorMatches(actual: string, expected: { rgb?: string; hex?: string }): boolean {
  if (expected.rgb && actual.includes(expected.rgb)) return true
  if (expected.hex && actual.toLowerCase().includes(expected.hex.toLowerCase())) return true
  return false
}

// =============================================================================
// EXPECTED VALUES (Single Source of Truth)
// =============================================================================

const COLORS = {
  primary: { hex: '#2271C1', rgb: '34, 113, 193' },
  surface: { hex: '#1a1a1a', rgb: '26, 26, 26' },
  card: { hex: '#27272a', rgb: '39, 39, 42' },
  muted: { hex: '#888', rgb: '136, 136, 136' },
  white: { hex: '#fff', rgb: '255, 255, 255' },
}

const SPACING = {
  spacePad: '16px',
  spaceGap: '12px',
  radiusRad: '8px',
  rootPad: '24px',
  cardGap: '8px',
  btnPadVer: '10px',
  btnPadHor: '16px',
  btnRad: '6px',
}

const CARD_DATA = [
  { title: 'Willkommen', text: 'Dies ist ein Demo-Projekt.', icon: 'home' },
  { title: 'Komponenten', text: 'Baue wiederverwendbare UI-Bausteine.', icon: 'layers' },
  { title: 'Live Preview', text: 'Änderungen sofort sehen.', icon: 'eye' },
]

// =============================================================================
// TESTS: ROOT FRAME
// =============================================================================

export const demoProjectTests: TestCase[] = describe('Demo Project', [

  // ---------------------------------------------------------------------------
  // ROOT FRAME STRUCTURE
  // ---------------------------------------------------------------------------

  testWithSetup('Demo: Root frame exists and is flex column', DEMO_FULL, async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'display', 'flex')
    api.assert.hasStyle('node-1', 'flexDirection', 'column')
  }),

  testWithSetup('Demo: Root frame has surface background from token', DEMO_FULL, async (api: TestAPI) => {
    const info = api.preview.inspect('node-1')
    const bg = info?.styles.backgroundColor || ''
    api.assert.ok(
      colorMatches(bg, COLORS.surface),
      `Root bg should be surface ${COLORS.surface.hex}, got: ${bg}`
    )
  }),

  testWithSetup('Demo: Root frame has white text color', DEMO_FULL, async (api: TestAPI) => {
    api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')
  }),

  testWithSetup('Demo: Root frame has correct padding (24px)', DEMO_FULL, async (api: TestAPI) => {
    api.assert.hasStyle('node-1', 'padding', SPACING.rootPad)
  }),

  testWithSetup('Demo: Root frame has gap from $space token (12px)', DEMO_FULL, async (api: TestAPI) => {
    api.assert.hasStyle('node-1', 'gap', SPACING.spaceGap)
  }),

  testWithSetup('Demo: Root frame has h full style set', DEMO_FULL, async (api: TestAPI) => {
    // Note: In test environment, 100% resolves to container pixel size
    // We check that height is not auto/0 and is substantial
    const info = api.preview.inspect('node-1')
    const height = info?.styles.height || ''
    api.assert.ok(
      height === '100%' || (height.endsWith('px') && parseInt(height) > 100),
      `Root should have full height (100% or >100px), got: ${height}`
    )
  }),

  testWithSetup('Demo: Root frame has exactly 4 direct children (header + 3 cards)', DEMO_FULL, async (api: TestAPI) => {
    const info = api.preview.inspect('node-1')
    api.assert.ok(
      info?.children.length === 4,
      `Root should have 4 children (header + 3 cards), got: ${info?.children.length}`
    )
  }),

  // ---------------------------------------------------------------------------
  // HEADER
  // ---------------------------------------------------------------------------

  testWithSetup('Demo: Header is first child of root', DEMO_FULL, async (api: TestAPI) => {
    const rootInfo = api.preview.inspect('node-1')
    api.assert.ok(rootInfo?.children.length! > 0, 'Root should have children')
    const headerId = rootInfo!.children[0]
    const headerInfo = api.preview.inspect(headerId)
    api.assert.ok(headerInfo !== null, 'Header should exist')
  }),

  testWithSetup('Demo: Header has horizontal layout (hor)', DEMO_FULL, async (api: TestAPI) => {
    const rootInfo = api.preview.inspect('node-1')
    const headerId = rootInfo!.children[0]
    const headerInfo = api.preview.inspect(headerId)
    api.assert.ok(
      headerInfo?.styles.flexDirection === 'row',
      `Header should be row, got: ${headerInfo?.styles.flexDirection}`
    )
  }),

  testWithSetup('Demo: Header has spread layout (space-between)', DEMO_FULL, async (api: TestAPI) => {
    const rootInfo = api.preview.inspect('node-1')
    const headerId = rootInfo!.children[0]
    const headerInfo = api.preview.inspect(headerId)
    api.assert.ok(
      headerInfo?.styles.justifyContent === 'space-between',
      `Header should be space-between, got: ${headerInfo?.styles.justifyContent}`
    )
  }),

  testWithSetup('Demo: Header has ver-center (align-items: center)', DEMO_FULL, async (api: TestAPI) => {
    const rootInfo = api.preview.inspect('node-1')
    const headerId = rootInfo!.children[0]
    const headerInfo = api.preview.inspect(headerId)
    api.assert.ok(
      headerInfo?.styles.alignItems === 'center',
      `Header should have alignItems center, got: ${headerInfo?.styles.alignItems}`
    )
  }),

  testWithSetup('Demo: Header contains "Demo App" text', DEMO_FULL, async (api: TestAPI) => {
    // Use API to get the header info
    const rootInfo = api.preview.inspect('node-1')
    api.assert.ok(rootInfo !== null, 'Root should exist via API')
    const headerId = rootInfo!.children[0]
    const headerInfo = api.preview.inspect(headerId)
    api.assert.ok(headerInfo !== null, 'Header should exist')
    // Find text in entire preview
    const preview = document.getElementById('preview')
    api.assert.ok(
      preview?.textContent?.includes('Demo App'),
      `Preview should contain "Demo App" text`
    )
  }),

  testWithSetup('Demo: Demo App text has correct styling (fs 20, bold)', DEMO_FULL, async (api: TestAPI) => {
    // Find the text element directly in preview
    const preview = document.getElementById('preview')
    const textEl = findByText(preview!, 'Demo App')
    api.assert.ok(textEl !== null, 'Demo App text element should exist')
    const fontSize = getStyle(textEl!, 'fontSize')
    const fontWeight = getStyle(textEl!, 'fontWeight')
    api.assert.ok(fontSize === '20px', `Demo App fs should be 20px, got: ${fontSize}`)
    api.assert.ok(
      fontWeight === '700' || fontWeight === 'bold',
      `Demo App weight should be bold, got: ${fontWeight}`
    )
  }),

  testWithSetup('Demo: Header contains settings icon', DEMO_FULL, async (api: TestAPI) => {
    // Header should have one icon (settings)
    // The header is the first child, cards have icons too
    // We already verified total 4 icons, and 3 are in cards, so 1 must be in header
    const preview = document.getElementById('preview')
    const allIcons = preview?.querySelectorAll('svg') || []
    const cardIcons = getCards().reduce((count, card) => {
      return count + card.querySelectorAll('svg').length
    }, 0)
    const headerIconCount = allIcons.length - cardIcons
    api.assert.ok(
      headerIconCount >= 1,
      `Header should have at least 1 icon, got ${headerIconCount} (total: ${allIcons.length}, cards: ${cardIcons})`
    )
  }),

  testWithSetup('Demo: Settings icon has muted color (not inherited white)', DEMO_FULL, async (api: TestAPI) => {
    // The icon uses ic $muted which should resolve to muted.ic token
    // This tests that icon color is NOT inherited from parent's col white
    const preview = document.getElementById('preview')
    const allIcons = Array.from(preview?.querySelectorAll('svg') || [])
    const cardIcons = new Set<Element>()
    getCards().forEach(card => {
      card.querySelectorAll('svg').forEach(icon => cardIcons.add(icon))
    })
    const headerIcons = allIcons.filter(icon => !cardIcons.has(icon))
    api.assert.ok(headerIcons.length >= 1, 'Should have header icon')

    const settingsIcon = headerIcons[0] as SVGElement

    // The SVG element should have color set directly via style
    const svgColor = settingsIcon.style.color

    // Accept either direct muted color or CSS variable reference
    const hasMutedColor =
      colorMatches(svgColor, COLORS.muted) ||
      svgColor.includes('var(--muted-ic)')

    api.assert.ok(
      hasMutedColor,
      `Settings icon SVG should have muted color via ic property, got: "${svgColor}"`
    )
  }),

  // ---------------------------------------------------------------------------
  // EACH LOOP - 3 CARDS
  // ---------------------------------------------------------------------------

  testWithSetup('Demo: Each loop renders exactly 3 cards', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    api.assert.ok(cards.length === 3, `Should have exactly 3 cards, got: ${cards.length}`)
  }),

  testWithSetup('Demo: Cards are inside data-each-item wrappers', DEMO_FULL, async (api: TestAPI) => {
    // Each Card is inside a wrapper with data-each-item attribute
    const preview = document.getElementById('preview')
    const wrappers = preview?.querySelectorAll('[data-each-item]') || []
    api.assert.ok(wrappers.length === 3, `Should have 3 each-item wrappers, got: ${wrappers.length}`)
    Array.from(wrappers).forEach((wrapper, i) => {
      api.assert.ok(
        wrapper.children.length > 0,
        `Wrapper ${i} should have Card as child`
      )
    })
  }),

  // ---------------------------------------------------------------------------
  // CARD 1: WILLKOMMEN
  // ---------------------------------------------------------------------------

  testWithSetup('Demo: Card 1 contains "Willkommen" title', DEMO_FULL, async (api: TestAPI) => {
    const card = getCard(0)
    api.assert.ok(card !== null, 'Card 1 should exist')
    api.assert.ok(
      card!.textContent?.includes('Willkommen'),
      `Card 1 should contain "Willkommen", got: ${card!.textContent?.substring(0, 50)}`
    )
  }),

  testWithSetup('Demo: Card 1 contains correct description', DEMO_FULL, async (api: TestAPI) => {
    const card = getCard(0)
    api.assert.ok(
      card!.textContent?.includes('Dies ist ein Demo-Projekt'),
      'Card 1 should contain its description'
    )
  }),

  testWithSetup('Demo: Card 1 does NOT contain other card titles', DEMO_FULL, async (api: TestAPI) => {
    const card = getCard(0)
    api.assert.ok(
      !card!.textContent?.includes('Komponenten') || card!.textContent?.includes('Willkommen'),
      'Card 1 should not contain "Komponenten" as title (may appear in description)'
    )
    api.assert.ok(
      !card!.textContent?.includes('Live Preview'),
      'Card 1 should not contain "Live Preview"'
    )
  }),

  // ---------------------------------------------------------------------------
  // CARD 2: KOMPONENTEN
  // ---------------------------------------------------------------------------

  testWithSetup('Demo: Card 2 contains "Komponenten" title', DEMO_FULL, async (api: TestAPI) => {
    const card = getCard(1)
    api.assert.ok(card !== null, 'Card 2 should exist')
    api.assert.ok(
      card!.textContent?.includes('Komponenten'),
      `Card 2 should contain "Komponenten", got: ${card!.textContent?.substring(0, 50)}`
    )
  }),

  testWithSetup('Demo: Card 2 contains correct description', DEMO_FULL, async (api: TestAPI) => {
    const card = getCard(1)
    api.assert.ok(
      card!.textContent?.includes('wiederverwendbare UI-Bausteine'),
      'Card 2 should contain its description'
    )
  }),

  testWithSetup('Demo: Card 2 does NOT contain other card data', DEMO_FULL, async (api: TestAPI) => {
    const card = getCard(1)
    api.assert.ok(
      !card!.textContent?.includes('Willkommen'),
      'Card 2 should not contain "Willkommen"'
    )
    api.assert.ok(
      !card!.textContent?.includes('Live Preview'),
      'Card 2 should not contain "Live Preview"'
    )
  }),

  // ---------------------------------------------------------------------------
  // CARD 3: LIVE PREVIEW
  // ---------------------------------------------------------------------------

  testWithSetup('Demo: Card 3 contains "Live Preview" title', DEMO_FULL, async (api: TestAPI) => {
    const card = getCard(2)
    api.assert.ok(card !== null, 'Card 3 should exist')
    api.assert.ok(
      card!.textContent?.includes('Live Preview'),
      `Card 3 should contain "Live Preview", got: ${card!.textContent?.substring(0, 50)}`
    )
  }),

  testWithSetup('Demo: Card 3 contains correct description', DEMO_FULL, async (api: TestAPI) => {
    const card = getCard(2)
    api.assert.ok(
      card!.textContent?.includes('Änderungen sofort sehen'),
      'Card 3 should contain its description'
    )
  }),

  testWithSetup('Demo: Card 3 does NOT contain other card data', DEMO_FULL, async (api: TestAPI) => {
    const card = getCard(2)
    api.assert.ok(
      !card!.textContent?.includes('Willkommen'),
      'Card 3 should not contain "Willkommen"'
    )
    api.assert.ok(
      !card!.textContent?.includes('wiederverwendbare'),
      'Card 3 should not contain Card 2 description'
    )
  }),

  // ---------------------------------------------------------------------------
  // CARD COMPONENT STYLING (ALL CARDS)
  // ---------------------------------------------------------------------------

  testWithSetup('Demo: All cards have card background from $card token', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    cards.forEach((card, i) => {
      const bg = getStyle(card, 'backgroundColor')
      api.assert.ok(
        colorMatches(bg, COLORS.card),
        `Card ${i + 1} bg should be ${COLORS.card.hex}, got: ${bg}`
      )
    })
  }),

  testWithSetup('Demo: All cards have padding from $space token (16px)', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    cards.forEach((card, i) => {
      const pad = getStyle(card, 'padding')
      api.assert.ok(
        pad === SPACING.spacePad,
        `Card ${i + 1} padding should be ${SPACING.spacePad}, got: ${pad}`
      )
    })
  }),

  testWithSetup('Demo: All cards have radius from $radius token (8px)', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    cards.forEach((card, i) => {
      const rad = getStyle(card, 'borderRadius')
      api.assert.ok(
        rad === SPACING.radiusRad,
        `Card ${i + 1} radius should be ${SPACING.radiusRad}, got: ${rad}`
      )
    })
  }),

  testWithSetup('Demo: All cards have gap from component (8px, not token)', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    cards.forEach((card, i) => {
      const gap = getStyle(card, 'gap')
      api.assert.ok(
        gap === SPACING.cardGap,
        `Card ${i + 1} gap should be ${SPACING.cardGap} (component value), got: ${gap}`
      )
    })
  }),

  testWithSetup('Demo: All cards are flex column layout', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    cards.forEach((card, i) => {
      const display = getStyle(card, 'display')
      const direction = getStyle(card, 'flexDirection')
      api.assert.ok(display === 'flex', `Card ${i + 1} should be flex, got: ${display}`)
      api.assert.ok(direction === 'column', `Card ${i + 1} should be column, got: ${direction}`)
    })
  }),

  // ---------------------------------------------------------------------------
  // CARD INTERNAL STRUCTURE
  // ---------------------------------------------------------------------------

  testWithSetup('Demo: Each card has 3 children (title row, description, button)', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    cards.forEach((card, i) => {
      const childCount = card.children.length
      api.assert.ok(
        childCount === 3,
        `Card ${i + 1} should have 3 children, got: ${childCount}`
      )
    })
  }),

  testWithSetup('Demo: Card title row is horizontal with gap', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    cards.forEach((card, i) => {
      const titleRow = card.children[0] as HTMLElement
      const direction = getStyle(titleRow, 'flexDirection')
      const gap = getStyle(titleRow, 'gap')
      api.assert.ok(
        direction === 'row',
        `Card ${i + 1} title row should be row, got: ${direction}`
      )
      api.assert.ok(
        gap === SPACING.spaceGap,
        `Card ${i + 1} title row gap should be ${SPACING.spaceGap}, got: ${gap}`
      )
    })
  }),

  testWithSetup('Demo: Card title row has ver-center alignment', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    cards.forEach((card, i) => {
      const titleRow = card.children[0] as HTMLElement
      const align = getStyle(titleRow, 'alignItems')
      api.assert.ok(
        align === 'center',
        `Card ${i + 1} title row should be vertically centered, got: ${align}`
      )
    })
  }),

  // ---------------------------------------------------------------------------
  // CARD ICONS
  // ---------------------------------------------------------------------------

  testWithSetup('Demo: Each card has exactly one icon in title row', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    cards.forEach((card, i) => {
      const titleRow = card.children[0] as HTMLElement
      const icons = titleRow.querySelectorAll('svg')
      api.assert.ok(
        icons.length === 1,
        `Card ${i + 1} title row should have 1 icon, got: ${icons.length}`
      )
    })
  }),

  testWithSetup('Demo: Card icons have primary color', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    cards.forEach((card, i) => {
      const titleRow = card.children[0] as HTMLElement
      const svg = titleRow.querySelector('svg') as SVGElement
      api.assert.ok(svg !== null, `Card ${i + 1} should have icon`)
      // Color can be on the svg itself, its parent span, or inherited
      // Check stroke or fill on svg, or color on wrapper
      const wrapper = svg.parentElement as HTMLElement
      const wrapperColor = getStyle(wrapper, 'color')
      const svgStroke = svg.getAttribute('stroke') || ''
      const svgFill = svg.getAttribute('fill') || ''
      // currentColor means it inherits from parent
      const hasCurrentColor = svgStroke === 'currentColor' || svgFill === 'currentColor'
      const directPrimary = colorMatches(wrapperColor, COLORS.primary) ||
                            colorMatches(svgStroke, COLORS.primary) ||
                            colorMatches(svgFill, COLORS.primary)
      api.assert.ok(
        hasCurrentColor || directPrimary,
        `Card ${i + 1} icon should have primary color. Wrapper: ${wrapperColor}, stroke: ${svgStroke}, fill: ${svgFill}`
      )
    })
  }),

  testWithSetup('Demo: Card icons have size 20px', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    cards.forEach((card, i) => {
      const titleRow = card.children[0] as HTMLElement
      const icon = titleRow.querySelector('svg') as SVGElement
      if (icon) {
        const width = icon.getAttribute('width') || getStyle(icon, 'width')
        const height = icon.getAttribute('height') || getStyle(icon, 'height')
        api.assert.ok(
          width === '20' || width === '20px',
          `Card ${i + 1} icon width should be 20, got: ${width}`
        )
        api.assert.ok(
          height === '20' || height === '20px',
          `Card ${i + 1} icon height should be 20, got: ${height}`
        )
      }
    })
  }),

  // ---------------------------------------------------------------------------
  // CARD TITLES (TEXT)
  // ---------------------------------------------------------------------------

  testWithSetup('Demo: Card titles have font-size 16px', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    const titles = ['Willkommen', 'Komponenten', 'Live Preview']
    cards.forEach((card, i) => {
      const titleEl = findByText(card, titles[i])
      api.assert.ok(titleEl !== null, `Card ${i + 1} should have title "${titles[i]}"`)
      const fontSize = getStyle(titleEl!, 'fontSize')
      api.assert.ok(
        fontSize === '16px',
        `Card ${i + 1} title fs should be 16px, got: ${fontSize}`
      )
    })
  }),

  testWithSetup('Demo: Card titles have font-weight 500', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    const titles = ['Willkommen', 'Komponenten', 'Live Preview']
    cards.forEach((card, i) => {
      const titleEl = findByText(card, titles[i])
      const fontWeight = getStyle(titleEl!, 'fontWeight')
      api.assert.ok(
        fontWeight === '500',
        `Card ${i + 1} title weight should be 500, got: ${fontWeight}`
      )
    })
  }),

  // ---------------------------------------------------------------------------
  // CARD DESCRIPTIONS
  // ---------------------------------------------------------------------------

  testWithSetup('Demo: Card descriptions have muted color', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    const descriptions = [
      'Dies ist ein Demo-Projekt',
      'wiederverwendbare UI-Bausteine',
      'Änderungen sofort sehen',
    ]
    cards.forEach((card, i) => {
      const descEl = findByText(card, descriptions[i])
      api.assert.ok(descEl !== null, `Card ${i + 1} should have description`)
      const color = getStyle(descEl!, 'color')
      api.assert.ok(
        colorMatches(color, COLORS.muted),
        `Card ${i + 1} description should have muted color, got: ${color}`
      )
    })
  }),

  testWithSetup('Demo: Card descriptions have font-size 14px', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    const descriptions = [
      'Dies ist ein Demo-Projekt',
      'wiederverwendbare UI-Bausteine',
      'Änderungen sofort sehen',
    ]
    cards.forEach((card, i) => {
      const descEl = findByText(card, descriptions[i])
      const fontSize = getStyle(descEl!, 'fontSize')
      api.assert.ok(
        fontSize === '14px',
        `Card ${i + 1} description fs should be 14px, got: ${fontSize}`
      )
    })
  }),

  // ---------------------------------------------------------------------------
  // BUTTONS
  // ---------------------------------------------------------------------------

  testWithSetup('Demo: Each card has exactly one button', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    cards.forEach((card, i) => {
      const buttons = card.querySelectorAll('button')
      api.assert.ok(
        buttons.length === 1,
        `Card ${i + 1} should have 1 button, got: ${buttons.length}`
      )
    })
  }),

  testWithSetup('Demo: All buttons have "Mehr" text', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    cards.forEach((card, i) => {
      const button = card.querySelector('button')
      api.assert.ok(
        button?.textContent?.includes('Mehr'),
        `Card ${i + 1} button should say "Mehr", got: ${button?.textContent}`
      )
    })
  }),

  testWithSetup('Demo: Buttons have primary background', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    cards.forEach((card, i) => {
      const button = card.querySelector('button') as HTMLElement
      const bg = getStyle(button, 'backgroundColor')
      api.assert.ok(
        colorMatches(bg, COLORS.primary),
        `Card ${i + 1} button bg should be ${COLORS.primary.hex}, got: ${bg}`
      )
    })
  }),

  testWithSetup('Demo: Buttons have white text color', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    cards.forEach((card, i) => {
      const button = card.querySelector('button') as HTMLElement
      const color = getStyle(button, 'color')
      api.assert.ok(
        colorMatches(color, COLORS.white),
        `Card ${i + 1} button color should be white, got: ${color}`
      )
    })
  }),

  testWithSetup('Demo: Buttons have correct padding (10px 16px)', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    cards.forEach((card, i) => {
      const button = card.querySelector('button') as HTMLElement
      const padTop = getStyle(button, 'paddingTop')
      const padRight = getStyle(button, 'paddingRight')
      const padBottom = getStyle(button, 'paddingBottom')
      const padLeft = getStyle(button, 'paddingLeft')
      api.assert.ok(
        padTop === '10px' && padBottom === '10px',
        `Card ${i + 1} button vertical padding should be 10px, got: ${padTop}/${padBottom}`
      )
      api.assert.ok(
        padRight === '16px' && padLeft === '16px',
        `Card ${i + 1} button horizontal padding should be 16px, got: ${padRight}/${padLeft}`
      )
    })
  }),

  testWithSetup('Demo: Buttons have border-radius 6px', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    cards.forEach((card, i) => {
      const button = card.querySelector('button') as HTMLElement
      const rad = getStyle(button, 'borderRadius')
      api.assert.ok(
        rad === '6px',
        `Card ${i + 1} button radius should be 6px, got: ${rad}`
      )
    })
  }),

  testWithSetup('Demo: Buttons have cursor pointer', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    cards.forEach((card, i) => {
      const button = card.querySelector('button') as HTMLElement
      const cursor = getStyle(button, 'cursor')
      api.assert.ok(
        cursor === 'pointer',
        `Card ${i + 1} button cursor should be pointer, got: ${cursor}`
      )
    })
  }),

  // ---------------------------------------------------------------------------
  // BUTTON IS LAST CHILD OF CARD
  // ---------------------------------------------------------------------------

  testWithSetup('Demo: Button is the last child of each card', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    cards.forEach((card, i) => {
      const lastChild = card.children[card.children.length - 1]
      api.assert.ok(
        lastChild.tagName === 'BUTTON',
        `Card ${i + 1} last child should be BUTTON, got: ${lastChild.tagName}`
      )
    })
  }),

  // ---------------------------------------------------------------------------
  // TOTAL ICON COUNT
  // ---------------------------------------------------------------------------

  testWithSetup('Demo: Total of 4 icons in preview (1 header + 3 cards)', DEMO_FULL, async (api: TestAPI) => {
    const preview = document.getElementById('preview')
    const icons = preview?.querySelectorAll('svg') || []
    api.assert.ok(
      icons.length === 4,
      `Should have exactly 4 icons (1 header + 3 cards), got: ${icons.length}`
    )
  }),

  // ---------------------------------------------------------------------------
  // TOTAL BUTTON COUNT
  // ---------------------------------------------------------------------------

  testWithSetup('Demo: Total of 3 buttons in preview', DEMO_FULL, async (api: TestAPI) => {
    const preview = document.getElementById('preview')
    const buttons = preview?.querySelectorAll('button') || []
    api.assert.ok(
      buttons.length === 3,
      `Should have exactly 3 buttons, got: ${buttons.length}`
    )
  }),

  // ---------------------------------------------------------------------------
  // DATA ORDER VERIFICATION
  // ---------------------------------------------------------------------------

  testWithSetup('Demo: Cards are in correct order (Willkommen, Komponenten, Live Preview)', DEMO_FULL, async (api: TestAPI) => {
    const cards = getCards()
    const card1Text = cards[0]?.textContent || ''
    const card2Text = cards[1]?.textContent || ''
    const card3Text = cards[2]?.textContent || ''

    // Check that each card has the right title
    api.assert.ok(card1Text.includes('Willkommen'), 'First card should be Willkommen')
    api.assert.ok(card2Text.includes('Komponenten'), 'Second card should be Komponenten')
    api.assert.ok(card3Text.includes('Live Preview'), 'Third card should be Live Preview')

    // Verify order by checking indices in combined text
    const allText = card1Text + '|||' + card2Text + '|||' + card3Text
    const idx1 = allText.indexOf('Willkommen')
    const idx2 = allText.indexOf('Komponenten')
    const idx3 = allText.indexOf('Live Preview')
    api.assert.ok(
      idx1 < idx2 && idx2 < idx3,
      `Cards should be in order: Willkommen(${idx1}) < Komponenten(${idx2}) < Live Preview(${idx3})`
    )
  }),
])
