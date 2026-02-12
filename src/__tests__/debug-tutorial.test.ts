import { describe, it, expect } from 'vitest'
import { parse } from '../parser/parser'
import { generateReactElement } from '../generator/react-generator'
import { renderToStaticMarkup } from 'react-dom/server'

describe('Debug Tutorial HTML', () => {
  it('should output the generated HTML for inspection', () => {
    const code = `Dashboard ver col #0f0f14 pad 24 gap 24
  Header hor fill
    Logo "Acme Inc" #fff size 20 weight bold
    Nav hor gap 16
      Link "Dashboard" #fff
      Link "Projects" #888
      Link "Team" #888
  Content grid 2 gap 16
    Tile ver col #1a1a23 pad 20 rad 12 gap 8
      Value "2.7 Mio" #fff size 28 weight bold
      Label "Revenue" #888 size 12
    Tile
      Value "16"
      Label "Employees"
    Tile
      Value "40"
      Label "Customers"
    Tile
      Value "89%"
      Label "Satisfaction"
  Footer
    Text "© 2025 Acme Inc" #888 size 12`

    const result = parse(code)
    console.log('=== PARSE ERRORS ===')
    console.log(result.errors)

    const elements = generateReactElement(result.nodes, {
      tokens: result.tokens,
      registry: result.registry
    })

    const html = renderToStaticMarkup(elements as any)

    console.log('\n=== GENERATED HTML ===')
    // Format for readability
    const formatted = html
      .replace(/><div/g, '>\n<div')
      .replace(/><span/g, '>\n<span')
      .replace(/><a/g, '>\n<a')
      .replace(/<\/div>/g, '</div>\n')

    console.log(formatted)

    // Basic check
    expect(html).toContain('Dashboard')
  })
})
