/**
 * Property Panel Components Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  Section,
  PropRow,
  ToggleGroup,
  ColorInput,
  AlignGrid,
  Select,
  Input,
  IconButton,
  Slider,
  PP,
  ICONS,
} from '../../studio/components/index'

describe('Section', () => {
  it('creates a section with label', () => {
    const section = new Section({ label: 'Layout' })
    const el = section.getElement()

    expect(el.classList.contains('section')).toBe(true)
    expect(el.textContent).toContain('Layout')
  })

  it('starts expanded by default', () => {
    const section = new Section({ label: 'Test' })
    expect(section.isCollapsed()).toBe(false)
    expect(section.getElement().classList.contains('expanded')).toBe(true)
  })

  it('can start collapsed', () => {
    const section = new Section({ label: 'Test', collapsed: true })
    expect(section.isCollapsed()).toBe(true)
  })

  it('toggles collapsed state', () => {
    const onToggle = vi.fn()
    const section = new Section({ label: 'Test', onToggle })

    section.toggle()
    expect(section.isCollapsed()).toBe(true)
    expect(onToggle).toHaveBeenCalledWith(true)

    section.toggle()
    expect(section.isCollapsed()).toBe(false)
    expect(onToggle).toHaveBeenCalledWith(false)
  })

  it('appends children to content', () => {
    const section = new Section({ label: 'Test' })
    const child = document.createElement('div')
    child.textContent = 'Child'

    section.append(child)
    expect(section.getContent().contains(child)).toBe(true)
  })
})

describe('PropRow', () => {
  it('creates a row with label', () => {
    const row = new PropRow({ label: 'Width' })
    const el = row.getElement()

    expect(el.classList.contains('prop-row')).toBe(true)
    expect(el.querySelector('.prop-label')?.textContent).toBe('Width')
  })

  it('sets tooltip on label', () => {
    const row = new PropRow({ label: 'Width', tooltip: 'Element width' })
    const label = row.getElement().querySelector('.prop-label')

    expect(label?.getAttribute('title')).toBe('Element width')
  })

  it('appends content', () => {
    const row = new PropRow({ label: 'Test' })
    const input = document.createElement('input')

    row.append(input)
    expect(row.getContent().contains(input)).toBe(true)
  })
})

describe('ToggleGroup', () => {
  it('creates toggle buttons for each option', () => {
    const onChange = vi.fn()
    const group = new ToggleGroup({
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ],
      value: 'a',
      onChange,
    })

    const buttons = group.getElement().querySelectorAll('.toggle-btn')
    expect(buttons.length).toBe(2)
  })

  it('marks selected option as active', () => {
    const group = new ToggleGroup({
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ],
      value: 'b',
      onChange: vi.fn(),
    })

    const buttons = group.getElement().querySelectorAll('.toggle-btn')
    expect(buttons[0].classList.contains('active')).toBe(false)
    expect(buttons[1].classList.contains('active')).toBe(true)
  })

  it('calls onChange on click', () => {
    const onChange = vi.fn()
    const group = new ToggleGroup({
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ],
      value: 'a',
      onChange,
    })

    const buttons = group.getElement().querySelectorAll('.toggle-btn')
    ;(buttons[1] as HTMLButtonElement).click()

    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('supports icons', () => {
    const group = new ToggleGroup({
      options: [
        { value: 'hor', icon: '<svg></svg>' },
        { value: 'ver', icon: '<svg></svg>' },
      ],
      value: 'hor',
      onChange: vi.fn(),
    })

    const buttons = group.getElement().querySelectorAll('.toggle-btn')
    expect(buttons[0].querySelector('svg')).not.toBeNull()
  })
})

describe('ColorInput', () => {
  it('creates color input with preview', () => {
    const input = new ColorInput({
      value: '#FF0000',
      onChange: vi.fn(),
    })

    const el = input.getElement()
    expect(el.querySelector('.color-preview')).not.toBeNull()
    expect(el.querySelector('input')).not.toBeNull()
  })

  it('updates preview when value changes', () => {
    const input = new ColorInput({
      value: '#FF0000',
      onChange: vi.fn(),
    })

    input.setValue('#00FF00')
    expect(input.getValue()).toBe('#00FF00')
  })

  it('validates hex colors', () => {
    const onChange = vi.fn()
    const input = new ColorInput({
      value: '#FF0000',
      onChange,
    })

    // Valid color
    input.setValue('#00FF00')
    expect(input.getValue()).toBe('#00FF00')
  })
})

describe('AlignGrid', () => {
  it('creates 9 cells for full grid', () => {
    const grid = new AlignGrid({
      value: null,
      onChange: vi.fn(),
    })

    const cells = grid.getElement().querySelectorAll('.align-cell')
    expect(cells.length).toBe(9)
  })

  it('creates 4 cells for corners-only', () => {
    const grid = new AlignGrid({
      value: null,
      onChange: vi.fn(),
      cornersOnly: true,
    })

    const cells = grid.getElement().querySelectorAll('.align-cell')
    expect(cells.length).toBe(4)
  })

  it('marks selected position as active', () => {
    const grid = new AlignGrid({
      value: 'middle-center',
      onChange: vi.fn(),
    })

    const activeCell = grid.getElement().querySelector('.align-cell.active')
    expect(activeCell?.getAttribute('data-position')).toBe('middle-center')
  })

  it('calls onChange on click', () => {
    const onChange = vi.fn()
    const grid = new AlignGrid({
      value: null,
      onChange,
    })

    const cell = grid.getElement().querySelector('[data-position="top-left"]') as HTMLButtonElement
    cell.click()

    expect(onChange).toHaveBeenCalledWith('top-left')
  })
})

describe('Select', () => {
  it('creates select with options', () => {
    const select = new Select({
      options: [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
      ],
      value: 'a',
      onChange: vi.fn(),
    })

    const el = select.getElement()
    expect(el.tagName).toBe('SELECT')
    expect(el.options.length).toBe(2)
  })

  it('selects correct value', () => {
    const select = new Select({
      options: [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
      ],
      value: 'b',
      onChange: vi.fn(),
    })

    expect(select.getValue()).toBe('b')
  })

  it('supports placeholder', () => {
    const select = new Select({
      options: [{ value: 'a', label: 'Option A' }],
      value: null,
      onChange: vi.fn(),
      placeholder: 'Select...',
    })

    const el = select.getElement()
    expect(el.options[0].textContent).toBe('Select...')
  })
})

describe('Input', () => {
  it('creates text input', () => {
    const input = new Input({
      value: 'test',
      onChange: vi.fn(),
    })

    const el = input.getElement()
    expect(el.tagName).toBe('INPUT')
    expect((el as HTMLInputElement).value).toBe('test')
  })

  it('supports placeholder', () => {
    const input = new Input({
      value: '',
      onChange: vi.fn(),
      placeholder: 'Enter text...',
    })

    expect(input.getInputElement().placeholder).toBe('Enter text...')
  })

  it('sets invalid state', () => {
    const input = new Input({
      value: '',
      onChange: vi.fn(),
    })

    input.setInvalid(true)
    expect(input.getInputElement().classList.contains('invalid')).toBe(true)

    input.setInvalid(false)
    expect(input.getInputElement().classList.contains('invalid')).toBe(false)
  })
})

describe('IconButton', () => {
  it('creates button with icon', () => {
    const btn = new IconButton({
      icon: '<svg></svg>',
      title: 'Test',
      onClick: vi.fn(),
    })

    const el = btn.getElement()
    expect(el.tagName).toBe('BUTTON')
    expect(el.querySelector('svg')).not.toBeNull()
  })

  it('calls onClick', () => {
    const onClick = vi.fn()
    const btn = new IconButton({
      icon: '<svg></svg>',
      title: 'Test',
      onClick,
    })

    btn.getElement().click()
    expect(onClick).toHaveBeenCalled()
  })

  it('toggles active state', () => {
    const btn = new IconButton({
      icon: '<svg></svg>',
      title: 'Test',
      onClick: vi.fn(),
    })

    expect(btn.isActive()).toBe(false)

    btn.setActive(true)
    expect(btn.isActive()).toBe(true)
    expect(btn.getElement().classList.contains('active')).toBe(true)
  })
})

describe('Slider', () => {
  it('creates range slider', () => {
    const slider = new Slider({
      value: 50,
      min: 0,
      max: 100,
      onChange: vi.fn(),
    })

    const input = slider.getElement().querySelector('input[type="range"]') as HTMLInputElement
    expect(input).not.toBeNull()
    expect(input.value).toBe('50')
    expect(input.min).toBe('0')
    expect(input.max).toBe('100')
  })

  it('shows value display by default', () => {
    const slider = new Slider({
      value: 50,
      min: 0,
      max: 100,
      onChange: vi.fn(),
    })

    const display = slider.getElement().querySelector('.slider-value')
    expect(display).not.toBeNull()
    expect(display?.textContent).toBe('50')
  })

  it('updates on setValue', () => {
    const slider = new Slider({
      value: 50,
      min: 0,
      max: 100,
      onChange: vi.fn(),
    })

    slider.setValue(75)
    expect(slider.getValue()).toBe(75)
  })
})

describe('PP Factory', () => {
  it('creates section', () => {
    const section = PP.section('Layout', 'layout')
    expect(section).toBeInstanceOf(Section)
  })

  it('creates row', () => {
    const row = PP.row('Width')
    expect(row).toBeInstanceOf(PropRow)
  })

  it('creates toggle group with icons', () => {
    const group = PP.toggleIcons(
      [
        { value: 'a', icon: 'horizontal' },
        { value: 'b', icon: 'vertical' },
      ],
      'a',
      vi.fn()
    )
    expect(group).toBeInstanceOf(ToggleGroup)
  })

  it('creates color input', () => {
    const input = PP.color('#FF0000', vi.fn())
    expect(input).toBeInstanceOf(ColorInput)
  })

  it('creates align grid', () => {
    const grid = PP.align('middle-center', vi.fn())
    expect(grid).toBeInstanceOf(AlignGrid)
  })
})
