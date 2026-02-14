import { describe, it, expect } from 'vitest'
import { parse } from '../parser/parser'

describe('Dropdown Debug', () => {
  it('debug parse structure', () => {
    const dropdownCode = `
Dropdown: ver w 200
  onclick toggle
  onkeydown escape close self
  onkeydown arrow-down highlight next
  onkeydown arrow-up highlight prev
  onkeydown enter select highlighted

  Trigger: pad 12 16 bg #333 rad 8 cursor pointer
    hover
      bg #444

  Content: hidden ver bg #1E1E2E rad 8 shadow md
    show fade slide-down 200
    hide fade 100

    Item: pad 10 14 cursor pointer
      highlight
        bg #3B82F6
      select
        bg #2563EB
        col white

Dropdown
  Trigger "Select option"
  Content
    - "Dashboard"
    - "Profile"
`
    const result = parse(dropdownCode)

    console.log('=== Registry keys ===')
    for (const [key, value] of result.registry) {
      console.log(`${key}: children=${value.children?.length || 0}, events=${value.eventHandlers?.length || 0}, states=${value.states?.length || 0}`)
    }

    console.log('\n=== AST nodes ===')
    console.log('Node count:', result.nodes.length)
    result.nodes.forEach((node, i) => {
      console.log(`Node ${i}: ${node.name}, children=${node.children.length}`)
    })

    console.log('\n=== Dropdown template ===')
    const dd = result.registry.get('Dropdown')
    console.log('Dropdown eventHandlers:', dd?.eventHandlers?.length || 0)
    dd?.eventHandlers?.forEach((h, i) => {
      console.log(`  ${i}: ${h.event} ${h.modifier || ''} -> ${h.actions[0]?.type}`)
    })
    console.log('Dropdown children:', dd?.children?.map(c => c.name).join(', '))

    console.log('\n=== Dropdown.Content template ===')
    const content = result.registry.get('Dropdown.Content')
    console.log('Content children:', content?.children?.map(c => c.name).join(', '))
    console.log('Content showAnimation:', content?.showAnimation)
    console.log('Content hideAnimation:', content?.hideAnimation)
    content?.children?.forEach((c, i) => {
      console.log(`  Child ${i}: ${c.name}, type=${c.type}, content="${c.content || ''}"`)
    })

    // Also check the Dropdown template's Content child
    console.log('\n=== Dropdown child Content ===')
    const ddTemplate = result.registry.get('Dropdown')
    const contentChild = ddTemplate?.children?.find(c => c.name === 'Content')
    console.log('Content child showAnimation:', contentChild?.showAnimation)
    console.log('Content child hideAnimation:', contentChild?.hideAnimation)
    console.log('Content child children:', contentChild?.children?.map(c => c.name).join(', '))

    // Check the rendered Dropdown instance
    console.log('\n=== Dropdown INSTANCE ===')
    const dropdown = result.nodes[0]
    console.log('Dropdown children:', dropdown?.children?.map(c => `${c.name}(content="${c.content || ''}")`).join(', '))
    const triggerInstance = dropdown?.children?.find(c => c.name === 'Trigger')
    console.log('Trigger content:', triggerInstance?.content)
    console.log('Trigger children:', triggerInstance?.children?.map(c => `${c.name}(${c.content || ''})`).join(', '))

    // Check Content instance
    const contentInstance = dropdown?.children?.find(c => c.name === 'Content')
    console.log('\n=== Content INSTANCE ===')
    console.log('Content instance children count:', contentInstance?.children?.length)
    contentInstance?.children?.forEach((c, i) => {
      console.log(`  Child ${i}: name=${c.name}, content="${c.content || ''}", _isListItem=${c._isListItem || false}`)
    })
  })
})
