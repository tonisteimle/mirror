/**
 * Fixed Screenshot Example Test
 *
 * Uses inline styles only to avoid component definition issues.
 */
import { describe, it, expect } from 'vitest'
import { parse } from '../parser/parser'
import { generateReactElement } from '../generator/react-generator'
import { renderToStaticMarkup } from 'react-dom/server'

// Simplified example without component definitions - inline styles only
const tokensCode = `// Farben
$bg-dark: #0F0F14
$bg-card: #1A1A23
$primary: #3B82F6
$success: #10B981
$text: #FFFFFF
$text-muted: #71717A`

// Use Title/Text/Label for text elements to get correct color behavior
const layoutCode = `App ver gap 24 pad 24 bg $bg-dark

  Header hor between ver-cen
    Title size 24 weight 700 col $text "Dashboard"
    Badge pad 4 8 bg $primary col white rad 6 size 11 weight 600 "Pro"

  Stats hor gap 16
    Card ver grow pad 24 gap 16 bg $bg-card rad 12
      Label size 12 col $text-muted uppercase "Umsatz"
      Title size 28 weight 700 col $text "€12,540"
      Trend hor ver-cen gap 4
        Icon icon "trending-up" size 16 col $success
        Text size 13 col $success "+12.5%"

    Card ver grow pad 24 gap 16 bg $bg-card rad 12
      Label size 12 col $text-muted uppercase "Nutzer"
      Title size 28 weight 700 col $text "2,847"
      Trend hor ver-cen gap 4
        Icon icon "users" size 16 col $success
        Text size 13 col $success "+8.2%"

    Card ver grow pad 24 gap 16 bg $bg-card rad 12
      Label size 12 col $text-muted uppercase "Projekte"
      Title size 28 weight 700 col $text "143"
      Trend hor ver-cen gap 4
        Icon icon "folder" size 16 col $primary
        Text size 13 col $primary "Aktiv"

  Actions hor gap 8
    Button hor cen pad 12 24 bg $primary col white rad 8 weight 500 "Neues Projekt"
    Button hor cen pad 12 24 bg #252530 col $text rad 8 weight 500 "Exportieren"`

describe('Fixed Screenshot Example', () => {
  const fullCode = tokensCode + '\n\n' + layoutCode

  it('parses without errors', () => {
    const result = parse(fullCode)
    const errors = result.errors.filter(e => !e.startsWith('Warning:'))
    console.log('Errors:', errors)
    expect(errors).toHaveLength(0)
  })

  it('renders to HTML with all expected content', () => {
    const result = parse(fullCode)
    const elements = generateReactElement(result.nodes, {
      tokens: result.tokens,
      registry: result.registry
    })

    const html = renderToStaticMarkup(elements as React.ReactElement)

    console.log('=== GENERATED HTML ===')
    // Pretty print for readability
    const formatted = html
      .replace(/></g, '>\n<')
      .replace(/style="/g, '\n  style="')

    console.log(formatted.slice(0, 3000))
    console.log('...')

    // Check text content
    expect(html).toContain('Dashboard')
    expect(html).toContain('Pro')
    expect(html).toContain('Umsatz')
    expect(html).toContain('€12,540')
    expect(html).toContain('+12.5%')
    expect(html).toContain('Nutzer')
    expect(html).toContain('2,847')
    expect(html).toContain('Projekte')
    expect(html).toContain('143')
    expect(html).toContain('Neues Projekt')
    expect(html).toContain('Exportieren')
  })

  it('has correct background colors', () => {
    const result = parse(fullCode)
    const elements = generateReactElement(result.nodes, {
      tokens: result.tokens,
      registry: result.registry
    })

    const html = renderToStaticMarkup(elements as React.ReactElement)

    // Check that colors are resolved
    expect(html).toContain('#0F0F14') // bg-dark (App background)
    expect(html).toContain('#1A1A23') // bg-card (Card backgrounds)
    expect(html).toContain('#3B82F6') // primary (Badge, Button)

    // Count card backgrounds
    const cardBgMatches = (html.match(/background-color:#1A1A23/g) || []).length
    console.log('Card backgrounds found:', cardBgMatches)
    expect(cardBgMatches).toBe(3)
  })

  it('has icons rendered correctly', () => {
    const result = parse(fullCode)
    const elements = generateReactElement(result.nodes, {
      tokens: result.tokens,
      registry: result.registry
    })

    const html = renderToStaticMarkup(elements as React.ReactElement)

    // Check for SVG icons
    expect(html).toContain('<svg')
    expect(html).toContain('trending-up')
    expect(html).toContain('users')
    expect(html).toContain('folder')
  })

  it('has no unresolved tokens', () => {
    const result = parse(fullCode)
    const elements = generateReactElement(result.nodes, {
      tokens: result.tokens,
      registry: result.registry
    })

    const html = renderToStaticMarkup(elements as React.ReactElement)

    // No $ tokens should remain in the output
    const tokenMatches = html.match(/\$[a-z-]+/g)
    if (tokenMatches) {
      console.log('Unresolved tokens:', tokenMatches)
    }
    expect(tokenMatches).toBeNull()
  })
})
