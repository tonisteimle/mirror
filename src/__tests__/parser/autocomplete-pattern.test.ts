import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'

describe('Autocomplete Pattern', () => {
  it('should parse debounce modifier on oninput event', () => {
    const input = `SearchInput: pad 8
  oninput debounce 300 filter Results`
    const result = parse(input)

    if (result.errors.length > 0) {
      console.log('Errors:', result.errors)
    }
    expect(result.errors).toHaveLength(0)
    const searchInput = result.registry.get('SearchInput')
    expect(searchInput?.eventHandlers).toHaveLength(1)
    expect(searchInput?.eventHandlers![0].event).toBe('oninput')
    expect(searchInput?.eventHandlers![0].debounce).toBe(300)
    expect(searchInput?.eventHandlers![0].actions[0]).toHaveProperty('type', 'filter')
  })

  it('should parse debounce with keyboard modifier', () => {
    const input = `SearchInput: pad 8
  onkeydown escape debounce 100 close Results`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const searchInput = result.registry.get('SearchInput')
    expect(searchInput?.eventHandlers![0].modifier).toBe('escape')
    expect(searchInput?.eventHandlers![0].debounce).toBe(100)
    expect(searchInput?.eventHandlers![0].actions[0]).toHaveProperty('type', 'close')
  })

  it('should parse complete autocomplete pattern', () => {
    const input = `Option: pad 8 12
  state highlight
    bg #333
  onhover highlight self
  onclick select self

Results: ver bg #1E1E2E rad 8 hidden
  onkeydown arrow-down highlight next
  onkeydown arrow-up highlight prev
  onkeydown enter select highlighted
  onclick-outside close

SearchInput: pad 8 placeholder "Search..."
  oninput debounce 300 filter Results
  onfocus show Results`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)

    const option = result.registry.get('Option')
    expect(option?.states).toHaveLength(1)
    expect(option?.eventHandlers).toHaveLength(2)

    const results = result.registry.get('Results')
    expect(results?.eventHandlers).toHaveLength(4)

    const searchInput = result.registry.get('SearchInput')
    expect(searchInput?.eventHandlers).toHaveLength(2)
    expect(searchInput?.eventHandlers![0].debounce).toBe(300)
  })

  it('should parse filter action', () => {
    const input = `Input: pad 8
  oninput filter Dropdown`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const inp = result.registry.get('Input')
    expect(inp?.eventHandlers![0].actions[0]).toHaveProperty('type', 'filter')
    expect(inp?.eventHandlers![0].actions[0]).toHaveProperty('target', 'Dropdown')
  })

  it('should parse delay modifier on onblur event', () => {
    const input = `SearchInput: pad 8
  onblur delay 200 hide Results`
    const result = parse(input)

    if (result.errors.length > 0) {
      console.log('Errors:', result.errors)
    }
    expect(result.errors).toHaveLength(0)
    const searchInput = result.registry.get('SearchInput')
    expect(searchInput?.eventHandlers).toHaveLength(1)
    expect(searchInput?.eventHandlers![0].event).toBe('onblur')
    expect(searchInput?.eventHandlers![0].delay).toBe(200)
    expect(searchInput?.eventHandlers![0].actions[0]).toHaveProperty('type', 'hide')
  })

  it('should parse both debounce and delay in same component', () => {
    const input = `SearchInput: pad 8
  oninput debounce 300 filter Results
  onblur delay 200 hide Results`
    const result = parse(input)

    expect(result.errors).toHaveLength(0)
    const searchInput = result.registry.get('SearchInput')
    expect(searchInput?.eventHandlers).toHaveLength(2)

    const inputHandler = searchInput?.eventHandlers!.find(h => h.event === 'oninput')
    expect(inputHandler?.debounce).toBe(300)

    const blurHandler = searchInput?.eventHandlers!.find(h => h.event === 'onblur')
    expect(blurHandler?.delay).toBe(200)
  })
})
