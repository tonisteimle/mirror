import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'

describe('Dropdown Pattern', () => {
  it('should parse complete dropdown with highlight states', () => {
    // Use custom name to avoid conflict with library component
    const input = `MyDropdown: ver w 200 bg #1E1E2E rad 8
  Item: pad 8 12
    state highlight
      bg #333

MyDropdown
  - Item "Profile"
  - Item "Settings"
  - Item "Logout"`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const dropdown = result.registry.get('MyDropdown')
    expect(dropdown).toBeDefined()

    const item = result.registry.get('MyDropdown.Item')
    expect(item).toBeDefined()
    expect(item?.states).toHaveLength(1)
    expect(item?.states![0].name).toBe('highlight')
  })

  it('should parse dropdown with keyboard navigation events', () => {
    // Use custom name to avoid conflict with library component
    const input = `MyDropdown: ver w 200 bg #1E1E2E rad 8
  onkeydown arrow-down highlight next
  onkeydown arrow-up highlight prev
  onkeydown escape close self
  onkeydown enter select highlighted`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const dropdown = result.registry.get('MyDropdown')
    expect(dropdown?.eventHandlers).toHaveLength(4)
    expect(dropdown?.eventHandlers![0].modifier).toBe('arrow-down')
    expect(dropdown?.eventHandlers![1].modifier).toBe('arrow-up')
    expect(dropdown?.eventHandlers![2].modifier).toBe('escape')
    expect(dropdown?.eventHandlers![3].modifier).toBe('enter')
  })

  it('should parse item with highlight and select states', () => {
    const input = `Item: pad 8 12
  state highlight
    bg #333
  state select
    bg #3B82F6
  onhover highlight self
  onclick select self`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const item = result.registry.get('Item')
    expect(item?.states).toHaveLength(2)
    expect(item?.states![0].name).toBe('highlight')
    expect(item?.states![1].name).toBe('select')
    expect(item?.eventHandlers).toHaveLength(2)
  })

  it('should parse dropdown with trigger button and animations', () => {
    const input = `Trigger: pad 8 12 bg #333 rad 4 "Select Option"
  onclick toggle OptionsPanel

OptionsPanel: ver w 200 bg #1E1E2E rad 8 hidden
  show fade slide-down 200
  hide fade 150`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)

    // Trigger opens panel
    const trigger = result.registry.get('Trigger')
    expect(trigger?.eventHandlers).toHaveLength(1)
    expect(trigger?.eventHandlers![0].actions[0]).toHaveProperty('type', 'toggle')
    expect(trigger?.eventHandlers![0].actions[0]).toHaveProperty('target', 'OptionsPanel')

    // Panel has animations
    const panel = result.registry.get('OptionsPanel')
    expect(panel?.showAnimation).toBeDefined()
    expect(panel?.showAnimation?.animations).toContain('fade')
    expect(panel?.showAnimation?.animations).toContain('slide-down')
    expect(panel?.hideAnimation).toBeDefined()
  })

  it('should parse centralized events for dropdown', () => {
    const input = `Trigger: pad 8 12 bg #333 "Select"
OptionsMenu: ver w 200 bg #1E1E2E hidden
  Item: pad 8 12

Trigger
OptionsMenu
  - Item named Option1 "Option A"
  - Item named Option2 "Option B"

events
  Trigger onclick
    toggle OptionsMenu
  OptionsMenu onkeydown arrow-down
    highlight next
  OptionsMenu onkeydown arrow-up
    highlight prev
  OptionsMenu onkeydown escape
    close self
  Option1 onclick
    select self
    close OptionsMenu
  Option2 onclick
    select self
    close OptionsMenu`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    expect(result.centralizedEvents).toHaveLength(6)

    // Check Trigger onclick
    const triggerEvent = result.centralizedEvents.find(e => e.targetInstance === 'Trigger')
    expect(triggerEvent?.actions[0]).toHaveProperty('type', 'toggle')

    // Check keyboard events
    const arrowDownEvent = result.centralizedEvents.find(
      e => e.targetInstance === 'OptionsMenu' && e.modifier === 'arrow-down'
    )
    expect(arrowDownEvent?.actions[0]).toHaveProperty('type', 'highlight')
    expect(arrowDownEvent?.actions[0]).toHaveProperty('target', 'next')
  })
})
