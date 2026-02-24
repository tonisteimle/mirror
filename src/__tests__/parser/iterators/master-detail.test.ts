/**
 * Parser Tests: Master-Detail Pattern
 *
 * Tests for the master-detail UI pattern:
 * - $selected: null
 * - onclick assign $selected to $item
 * - Detail if $selected
 *
 * NOTE: The assign action and null tokens are NOT fully implemented.
 * These tests document expected future behavior.
 */

import { describe, it, expect } from 'vitest'
import { parse, getToken, getAction } from '../../test-utils'

describe('Selected Variable', () => {
  it('parses $selected: null without errors', () => {
    const result = parse('$selected: null')
    expect(result.errors).toHaveLength(0)
    // null token is parsed but value is undefined (falsy)
  })

  it('parses $currentItem: null without errors', () => {
    const result = parse('$currentItem: null')
    expect(result.errors).toHaveLength(0)
  })
})

describe('Assign to Item Pattern', () => {
  it('parses assign $selected to $item', () => {
    const result = parse(`$selected: null

List data Items
  - Item onclick assign $selected to $item
      Text $item.title`)

    expect(result.errors).toHaveLength(0)
    const list = result.nodes[0]
    const item = list.children[0]
    const action = getAction(item, 'onclick')
    expect(action?.type).toBe('assign')
    // Target is stored without $ prefix
    expect(action?.target).toBe('selected')
    // Value is a variable expression
    expect(action?.value).toEqual({ type: 'variable', name: 'item' })
  })
})

describe('Detail Conditional', () => {
  it('parses if $selected detail view', () => {
    const result = parse(`$selected: #333

if $selected
  Detail
    Title $selected.title
    Text $selected.description`)

    expect(result.errors).toHaveLength(0)
  })

  it('parses if $selected with else', () => {
    const result = parse(`$selected: #333

if $selected
  Detail $selected.title
else
  Text "Select an item"`)

    expect(result.errors).toHaveLength(0)
  })
})

describe('Full Master-Detail Pattern', () => {
  it('parses complete master-detail layout', () => {
    const result = parse(`$selected: null

Box hor, h full
  // Master
  List w 300, data Items
    - Item onclick assign $selected to $item
        Text $item.name

  // Detail
  if $selected
    Panel w full, pad 24
      Title $selected.name
      Text $selected.description
      Button onclick call saveItem, "Save"
  else
    Panel w full, cen
      Text "Select an item to view details"`)

    expect(result.errors).toHaveLength(0)
  })
})

describe('Multiple Selection Patterns', () => {
  it('tabs with selected content', () => {
    const result = parse(`$activeTab: "overview"

TabBar
  - Tab onclick toggle "overview", "Overview"
  - Tab onclick toggle "details", "Details"
  - Tab onclick toggle "settings", "Settings"

if $activeTab == "overview"
  OverviewContent
if $activeTab == "details"
  DetailsContent
if $activeTab == "settings"
  SettingsContent`)

    expect(result.errors).toHaveLength(0)
  })
})
