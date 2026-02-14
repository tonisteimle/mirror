import { describe, it, expect } from 'vitest'
import { parse } from '../parser/parser'

describe('Complete Dropdown Component', () => {
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
    - "Settings"
    - "Logout"
`

  it('parses Dropdown definition correctly', () => {
    const result = parse(dropdownCode)

    const template = result.registry.get('Dropdown')
    expect(template).toBeDefined()

    // Check event handlers
    expect(template?.eventHandlers).toHaveLength(5)

    // Check children slots
    expect(template?.children).toHaveLength(2)
    expect(template?.children?.[0].name).toBe('Trigger')
    expect(template?.children?.[1].name).toBe('Content')
  })

  it('parses Trigger with hover state', () => {
    const result = parse(dropdownCode)

    const trigger = result.registry.get('Dropdown.Trigger')
    expect(trigger).toBeDefined()
    expect(trigger?.properties.pad_u).toBe(12)
    expect(trigger?.properties.bg).toBe('#333')

    // Check hover state
    expect(trigger?.states).toHaveLength(1)
    expect(trigger?.states?.[0].name).toBe('hover')
    expect(trigger?.states?.[0].properties.bg).toBe('#444')
  })

  it('parses Content with animations', () => {
    const result = parse(dropdownCode)

    const content = result.registry.get('Dropdown.Content')
    expect(content).toBeDefined()
    expect(content?.properties.hidden).toBe(true)

    // Check Item slot inside Content
    expect(content?.children).toHaveLength(1)
    expect(content?.children?.[0].name).toBe('Item')
  })

  it('parses Item with highlight and select states', () => {
    const result = parse(dropdownCode)

    // Item is nested: Dropdown.Content.Item
    const contentTemplate = result.registry.get('Dropdown.Content')
    const itemInContent = contentTemplate?.children?.[0]

    expect(itemInContent).toBeDefined()
    expect(itemInContent?.name).toBe('Item')
    expect(itemInContent?.states).toHaveLength(2)

    const highlightState = itemInContent?.states?.find(s => s.name === 'highlight')
    expect(highlightState).toBeDefined()
    expect(highlightState?.properties.bg).toBe('#3B82F6')

    const selectState = itemInContent?.states?.find(s => s.name === 'select')
    expect(selectState).toBeDefined()
    expect(selectState?.properties.bg).toBe('#2563EB')
    expect(selectState?.properties.col).toBe('#FFFFFF') // CSS color 'white' is normalized to hex
  })

  it('renders Dropdown instance with all items', () => {
    const result = parse(dropdownCode)

    expect(result.nodes).toHaveLength(1)
    const dropdown = result.nodes[0]

    expect(dropdown.name).toBe('Dropdown')
    expect(dropdown.eventHandlers).toHaveLength(5)

    // Find Trigger and Content
    const trigger = dropdown.children.find(c => c.name === 'Trigger')
    const content = dropdown.children.find(c => c.name === 'Content')

    expect(trigger).toBeDefined()
    // Trigger's text is stored as a _text child, not as content property
    const triggerText = trigger?.children?.find(c => c.name === '_text')
    expect(triggerText?.content).toBe('Select option')

    expect(content).toBeDefined()

    // Content should have items
    const items = content?.children.filter(c => c.name === 'Item') || []
    expect(items).toHaveLength(5) // 1 template + 4 bare strings

    // Check that items have states
    items.forEach(item => {
      const highlight = item.states?.find(s => s.name === 'highlight')
      const select = item.states?.find(s => s.name === 'select')
      expect(highlight).toBeDefined()
      expect(select).toBeDefined()
    })
  })

  it('parses keyboard event handlers correctly', () => {
    const result = parse(dropdownCode)
    const dropdown = result.nodes[0]

    const handlers = dropdown.eventHandlers || []

    // onclick toggle
    const clickHandler = handlers.find(h => h.event === 'onclick')
    expect(clickHandler?.actions[0]).toMatchObject({ type: 'toggle' })

    // onkeydown escape close self
    const escapeHandler = handlers.find(h => h.event === 'onkeydown' && h.modifier === 'escape')
    expect(escapeHandler?.actions[0]).toMatchObject({ type: 'close', target: 'self' })

    // onkeydown arrow-down highlight next
    const downHandler = handlers.find(h => h.event === 'onkeydown' && h.modifier === 'arrow-down')
    expect(downHandler?.actions[0]).toMatchObject({ type: 'highlight', target: 'next' })

    // onkeydown arrow-up highlight prev
    const upHandler = handlers.find(h => h.event === 'onkeydown' && h.modifier === 'arrow-up')
    expect(upHandler?.actions[0]).toMatchObject({ type: 'highlight', target: 'prev' })

    // onkeydown enter select highlighted
    const enterHandler = handlers.find(h => h.event === 'onkeydown' && h.modifier === 'enter')
    expect(enterHandler?.actions[0]).toMatchObject({ type: 'select', target: 'highlighted' })
  })
})
