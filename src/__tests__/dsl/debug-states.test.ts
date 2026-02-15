import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'

describe('Debug state parsing', () => {
  it('shows states on nested component', () => {
    const dsl = `
NavSection: vertical gap 4
  NavItem: horizontal gap 12 padding 12 radius 8 cursor pointer color #999
    state active
      background #222 color white
    state hover
      background #1a1a1a
    NavIcon: icon "home" size 18
    NavText: size 14
`
    const result = parse(dsl)
    console.log('=== Errors ===')
    console.log(result.errors)
    
    const navSection = result.registry.get('NavSection')
    console.log('\n=== NavSection children ===')
    navSection?.children.forEach(c => {
      console.log(`  ${c.name}: states=${JSON.stringify(c.states?.map(s => s.name))}`)
    })
    
    const navItem = result.registry.get('NavItem')
    console.log('\n=== NavItem (direct from registry) ===')
    console.log('  states:', navItem?.states?.map(s => s.name))
    
    expect(true).toBe(true)
  })
  
  it('shows list items parsing', () => {
    const dsl = `
Menu: vertical
  Item: padding 8

Menu
  - Item "One"
  - Item "Two"
  - Item "Three"
`
    const result = parse(dsl)
    console.log('=== Errors ===')
    console.log(result.errors)
    
    const menu = result.registry.get('Menu')
    console.log('\n=== Menu children ===')
    menu?.children.forEach((c, i) => {
      console.log(`  [${i}] ${c.name}`)
    })
    
    // Check nodes
    console.log('\n=== Nodes (rendered) ===')
    result.nodes.forEach((n, i) => {
      console.log(`  [${i}] ${n.name}, children: ${n.children?.map(c => c.name).join(', ')}`)
    })
    
    expect(true).toBe(true)
  })
})
