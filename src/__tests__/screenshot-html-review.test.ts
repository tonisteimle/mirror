/**
 * Detailed HTML Review Test
 */
import { describe, it } from 'vitest'
import { parse } from '../parser/parser'
import { generateReactElement } from '../generator/react-generator'
import { renderToStaticMarkup } from 'react-dom/server'

const tokensCode = `// Farben
$bg-dark: #0F0F14
$bg-card: #1A1A23
$primary: #3B82F6
$success: #10B981
$text: #FFFFFF
$text-muted: #71717A`

// Fixed: Remove col from Icons (they get color from stroke automatically)
// Fixed: Use Text inside Buttons to get correct text color behavior
const layoutCode = `App ver gap 24 pad 24 col $bg-dark

  Header hor between ver-cen
    Title size 24 weight 700 col $text "Dashboard"
    Badge pad 4 8 col $primary textCol white rad 6 size 11 weight 600 "Pro"

  Stats hor gap 16
    Card ver grow pad 24 gap 16 col $bg-card rad 12
      Label size 12 col $text-muted uppercase "Umsatz"
      Title size 28 weight 700 col $text "€12,540"
      Trend hor ver-cen gap 4
        Icon icon "trending-up" size 16
        Text size 13 col $success "+12.5%"

    Card ver grow pad 24 gap 16 col $bg-card rad 12
      Label size 12 col $text-muted uppercase "Nutzer"
      Title size 28 weight 700 col $text "2,847"
      Trend hor ver-cen gap 4
        Icon icon "users" size 16
        Text size 13 col $success "+8.2%"

    Card ver grow pad 24 gap 16 col $bg-card rad 12
      Label size 12 col $text-muted uppercase "Projekte"
      Title size 28 weight 700 col $text "143"
      Trend hor ver-cen gap 4
        Icon icon "folder" size 16
        Text size 13 col $primary "Aktiv"

  Actions hor gap 8
    PrimaryBtn hor cen pad 12 24 col $primary rad 8 weight 500
      Text col white "Neues Projekt"
    SecondaryBtn hor cen pad 12 24 col #252530 rad 8 weight 500
      Text col $text "Exportieren"`

describe('HTML Review', () => {
  it('outputs full formatted HTML for review', () => {
    const fullCode = tokensCode + '\n\n' + layoutCode
    const result = parse(fullCode)
    const elements = generateReactElement(result.nodes, {
      tokens: result.tokens,
      registry: result.registry
    })

    const html = renderToStaticMarkup(elements as React.ReactElement)

    // Format HTML for readability
    let indent = 0
    const formatted = html
      .replace(/></g, '>\n<')
      .split('\n')
      .map(line => {
        if (line.startsWith('</')) indent--
        const result = '  '.repeat(Math.max(0, indent)) + line
        if (line.startsWith('<') && !line.startsWith('</') && !line.startsWith('<span') && !line.includes('/>')) indent++
        if (line.includes('</') && !line.startsWith('</')) indent--
        return result
      })
      .join('\n')

    console.log('\n========================================')
    console.log('FULL HTML OUTPUT FOR DETAILED REVIEW')
    console.log('========================================\n')
    console.log(formatted)
    console.log('\n========================================\n')
  })
})
