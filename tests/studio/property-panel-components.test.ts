/**
 * Property Panel Components Tests
 *
 * Tests for reusable UI components: TokenInput, ToggleGroup, AlignGrid, ColorSwatch.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  renderTokenInput,
  spacingTokensToOptions,
  createTokenClickHandler,
  createInputChangeHandler,
  type TokenOption
} from '../../studio/panels/property/components/token-input'
import {
  renderToggleGroup,
  renderSingleToggle,
  createToggleHandler,
  TOGGLE_ICONS
} from '../../studio/panels/property/components/toggle-group'
import {
  renderAlignGrid,
  parseAlignmentState,
  createAlignmentHandler,
  getAlignmentChanges,
  ALIGN_TO_PROPERTY,
  type AlignmentState
} from '../../studio/panels/property/components/align-grid'
import {
  renderColorSwatch,
  renderColorRow,
  createColorSwatchHandler,
  createColorTokenHandler
} from '../../studio/panels/property/components/color-swatch'

// =============================================================================
// TOKEN INPUT
// =============================================================================

describe('TokenInput', () => {
  describe('renderTokenInput', () => {
    const defaultTokens: TokenOption[] = [
      { label: 'sm', value: '4', tokenRef: '$sm.pad' },
      { label: 'md', value: '8', tokenRef: '$md.pad' },
      { label: 'lg', value: '16', tokenRef: '$lg.pad' }
    ]

    it('should render token buttons', () => {
      const html = renderTokenInput({
        property: 'gap',
        value: '8',
        tokens: defaultTokens,
        dataAttrPrefix: 'gap'
      })

      expect(html).toContain('pp-token-btn')
      expect(html).toContain('sm')
      expect(html).toContain('md')
      expect(html).toContain('lg')
    })

    it('should mark active token by value', () => {
      const html = renderTokenInput({
        property: 'gap',
        value: '8',
        tokens: defaultTokens,
        dataAttrPrefix: 'gap'
      })

      // md has value '8'
      expect(html).toContain('pp-token-btn active')
    })

    it('should mark active token by token reference', () => {
      const html = renderTokenInput({
        property: 'gap',
        value: '$sm.pad',
        tokens: defaultTokens,
        dataAttrPrefix: 'gap'
      })

      // Should mark sm as active (matches tokenRef)
      const container = document.createElement('div')
      container.innerHTML = html
      const smBtn = Array.from(container.querySelectorAll('.pp-token-btn'))
        .find(btn => btn.textContent?.trim() === 'sm')
      expect(smBtn?.classList.contains('active')).toBe(true)
    })

    it('should render input field with value', () => {
      const html = renderTokenInput({
        property: 'gap',
        value: '12',
        tokens: defaultTokens,
        dataAttrPrefix: 'gap'
      })

      expect(html).toContain('pp-input')
      expect(html).toContain('value="12"')
      expect(html).toContain('data-prop="gap"')
    })

    it('should use custom placeholder', () => {
      const html = renderTokenInput({
        property: 'gap',
        value: '',
        tokens: [],
        dataAttrPrefix: 'gap',
        placeholder: 'auto'
      })

      expect(html).toContain('placeholder="auto"')
    })

    it('should hide input when showInput is false', () => {
      const html = renderTokenInput({
        property: 'gap',
        value: '8',
        tokens: defaultTokens,
        dataAttrPrefix: 'gap',
        showInput: false
      })

      expect(html).not.toContain('pp-input')
      expect(html).toContain('pp-token-btn')
    })

    it('should include data attributes on input', () => {
      const html = renderTokenInput({
        property: 'gap',
        value: '8',
        tokens: defaultTokens,
        dataAttrPrefix: 'gap',
        inputDataAttrs: { 'custom': 'value' }
      })

      expect(html).toContain('data-custom="value"')
    })

    it('should include token-ref data attribute', () => {
      const html = renderTokenInput({
        property: 'gap',
        value: '',
        tokens: defaultTokens,
        dataAttrPrefix: 'gap'
      })

      expect(html).toContain('data-token-ref="$sm.pad"')
    })

    it('should escape HTML in values', () => {
      const html = renderTokenInput({
        property: 'gap',
        value: '<script>',
        tokens: [{ label: '<b>', value: '<script>' }],
        dataAttrPrefix: 'gap'
      })

      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
    })
  })

  describe('spacingTokensToOptions', () => {
    it('should convert SpacingTokens to TokenOptions', () => {
      const tokens = [
        { name: 'sm', fullName: 'sm.pad', value: '4' },
        { name: 'md', fullName: 'md.pad', value: '8' }
      ]

      const options = spacingTokensToOptions(tokens)

      expect(options).toHaveLength(2)
      expect(options[0]).toEqual({
        label: 'sm',
        value: '4',
        tokenRef: '$sm.pad',
        title: '$sm.pad: 4'
      })
    })
  })

  describe('createTokenClickHandler', () => {
    it('should create handler that calls onSelect with token ref', () => {
      const onSelect = vi.fn()
      const handlers = createTokenClickHandler('[data-gap-token]', 'gap-token', onSelect)

      const mockTarget = document.createElement('button')
      mockTarget.setAttribute('data-gap-token', '8')
      mockTarget.setAttribute('data-token-ref', '$md.pad')

      const event = new MouseEvent('click')
      handlers['[data-gap-token]'].click(event, mockTarget)

      expect(onSelect).toHaveBeenCalledWith('$md.pad', true)
    })

    it('should call onSelect with value if no token ref', () => {
      const onSelect = vi.fn()
      const handlers = createTokenClickHandler('[data-gap-token]', 'gap-token', onSelect)

      const mockTarget = document.createElement('button')
      mockTarget.setAttribute('data-gap-token', '8')
      // No data-token-ref

      const event = new MouseEvent('click')
      handlers['[data-gap-token]'].click(event, mockTarget)

      expect(onSelect).toHaveBeenCalledWith('8', false)
    })
  })

  describe('createInputChangeHandler', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('should debounce input changes', () => {
      const onChange = vi.fn()
      const { handlers, cleanup } = createInputChangeHandler('input', onChange, 300)

      const mockInput = document.createElement('input')
      mockInput.setAttribute('data-prop', 'gap')
      mockInput.value = '16'

      const event = new Event('input')
      handlers['input'].input(event, mockInput)

      // Should not be called immediately
      expect(onChange).not.toHaveBeenCalled()

      // Advance timers
      vi.advanceTimersByTime(300)

      expect(onChange).toHaveBeenCalledWith('gap', '16')

      cleanup()
      vi.useRealTimers()
    })

    it('should cancel previous debounce on new input', () => {
      const onChange = vi.fn()
      const { handlers, cleanup } = createInputChangeHandler('input', onChange, 300)

      const mockInput = document.createElement('input')
      mockInput.setAttribute('data-prop', 'gap')

      // First input
      mockInput.value = '10'
      handlers['input'].input(new Event('input'), mockInput)

      // Advance partially
      vi.advanceTimersByTime(150)

      // Second input
      mockInput.value = '20'
      handlers['input'].input(new Event('input'), mockInput)

      // Advance to where first would have fired
      vi.advanceTimersByTime(200)
      expect(onChange).not.toHaveBeenCalled()

      // Advance for second
      vi.advanceTimersByTime(100)
      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith('gap', '20')

      cleanup()
      vi.useRealTimers()
    })
  })
})

// =============================================================================
// TOGGLE GROUP
// =============================================================================

describe('ToggleGroup', () => {
  describe('renderToggleGroup', () => {
    const options = [
      { value: 'hor', label: 'Horizontal' },
      { value: 'ver', label: 'Vertical' }
    ]

    it('should render toggle buttons', () => {
      const html = renderToggleGroup({
        selected: 'hor',
        options,
        dataAttrName: 'layout'
      })

      expect(html).toContain('toggle-group')
      expect(html).toContain('toggle-btn')
      expect(html).toContain('Horizontal')
      expect(html).toContain('Vertical')
    })

    it('should mark selected button as active', () => {
      const html = renderToggleGroup({
        selected: 'ver',
        options,
        dataAttrName: 'layout'
      })

      const container = document.createElement('div')
      container.innerHTML = html
      const verBtn = Array.from(container.querySelectorAll('.toggle-btn'))
        .find(btn => btn.getAttribute('data-layout') === 'ver')
      expect(verBtn?.classList.contains('active')).toBe(true)
    })

    it('should use icons when provided', () => {
      const optionsWithIcons = [
        { value: 'left', icon: '<svg>left</svg>' },
        { value: 'right', icon: '<svg>right</svg>' }
      ]

      const html = renderToggleGroup({
        selected: 'left',
        options: optionsWithIcons,
        dataAttrName: 'align'
      })

      expect(html).toContain('<svg>left</svg>')
      expect(html).toContain('<svg>right</svg>')
    })

    it('should include title attribute when provided', () => {
      const optionsWithTitles = [
        { value: 'hor', label: 'H', title: 'Horizontal layout' }
      ]

      const html = renderToggleGroup({
        selected: '',
        options: optionsWithTitles,
        dataAttrName: 'layout'
      })

      expect(html).toContain('title="Horizontal layout"')
    })

    it('should add custom className', () => {
      const html = renderToggleGroup({
        selected: '',
        options,
        dataAttrName: 'layout',
        className: 'custom-class'
      })

      expect(html).toContain('toggle-group custom-class')
    })

    it('should render single toggle without wrapper', () => {
      const html = renderToggleGroup({
        selected: 'wrap',
        options: [{ value: 'wrap', label: 'Wrap' }],
        dataAttrName: 'wrap',
        single: true
      })

      expect(html).not.toContain('toggle-group')
      expect(html).toContain('toggle-btn single')
    })
  })

  describe('renderSingleToggle', () => {
    it('should render a single toggle button', () => {
      const html = renderSingleToggle({
        active: true,
        icon: '<svg>icon</svg>',
        dataAttrs: { wrap: 'true' },
        title: 'Toggle wrap'
      })

      expect(html).toContain('pp-toggle-btn single active')
      expect(html).toContain('<svg>icon</svg>')
      expect(html).toContain('data-wrap="true"')
      expect(html).toContain('title="Toggle wrap"')
    })

    it('should not have active class when inactive', () => {
      const html = renderSingleToggle({
        active: false,
        icon: '<svg/>',
        dataAttrs: {}
      })

      expect(html).toContain('pp-toggle-btn single')
      expect(html).not.toContain('active')
    })
  })

  describe('createToggleHandler', () => {
    it('should create handler that calls onToggle', () => {
      const onToggle = vi.fn()
      const handlers = createToggleHandler('[data-layout]', 'layout', onToggle)

      const mockBtn = document.createElement('button')
      mockBtn.setAttribute('data-layout', 'hor')

      handlers['[data-layout]'].click(new MouseEvent('click'), mockBtn)

      expect(onToggle).toHaveBeenCalledWith('hor', mockBtn)
    })

    it('should not call onToggle if no value', () => {
      const onToggle = vi.fn()
      const handlers = createToggleHandler('[data-layout]', 'layout', onToggle)

      const mockBtn = document.createElement('button')
      // No data-layout attribute

      handlers['[data-layout]'].click(new MouseEvent('click'), mockBtn)

      expect(onToggle).not.toHaveBeenCalled()
    })
  })

  describe('TOGGLE_ICONS', () => {
    it('should contain common icons', () => {
      expect(TOGGLE_ICONS.wrap).toBeDefined()
      expect(TOGGLE_ICONS.italic).toBeDefined()
      expect(TOGGLE_ICONS.underline).toBeDefined()
      expect(TOGGLE_ICONS.alignLeft).toBeDefined()
      expect(TOGGLE_ICONS.alignCenter).toBeDefined()
      expect(TOGGLE_ICONS.alignRight).toBeDefined()
    })

    it('should contain valid SVG', () => {
      expect(TOGGLE_ICONS.wrap).toContain('<svg')
      expect(TOGGLE_ICONS.wrap).toContain('</svg>')
    })
  })
})

// =============================================================================
// ALIGN GRID
// =============================================================================

describe('AlignGrid', () => {
  describe('renderAlignGrid', () => {
    it('should render 9 cells', () => {
      const state: AlignmentState = {
        vertical: null,
        horizontal: null,
        isCenter: false
      }

      const html = renderAlignGrid(state)
      const container = document.createElement('div')
      container.innerHTML = html

      expect(container.querySelectorAll('.pp-align-cell')).toHaveLength(9)
    })

    it('should mark center cell active when isCenter', () => {
      const state: AlignmentState = {
        vertical: null,
        horizontal: null,
        isCenter: true
      }

      const html = renderAlignGrid(state)
      const container = document.createElement('div')
      container.innerHTML = html

      const centerCell = container.querySelector('[data-align="middle-center"]')
      expect(centerCell?.classList.contains('active')).toBe(true)
    })

    it('should mark top-left active when vertical=top and horizontal=left', () => {
      const state: AlignmentState = {
        vertical: 'top',
        horizontal: 'left',
        isCenter: false
      }

      const html = renderAlignGrid(state)
      const container = document.createElement('div')
      container.innerHTML = html

      const tlCell = container.querySelector('[data-align="top-left"]')
      expect(tlCell?.classList.contains('active')).toBe(true)
    })

    it('should have proper data-align attributes', () => {
      const state: AlignmentState = { vertical: null, horizontal: null, isCenter: false }
      const html = renderAlignGrid(state)
      const container = document.createElement('div')
      container.innerHTML = html

      const positions = ['top-left', 'top-center', 'top-right',
                         'middle-left', 'middle-center', 'middle-right',
                         'bottom-left', 'bottom-center', 'bottom-right']

      positions.forEach(pos => {
        expect(container.querySelector(`[data-align="${pos}"]`)).toBeTruthy()
      })
    })
  })

  describe('parseAlignmentState', () => {
    it('should detect top alignment', () => {
      const isActive = (name: string) => name === 'top'
      const state = parseAlignmentState(isActive)
      expect(state.vertical).toBe('top')
    })

    it('should detect bottom alignment', () => {
      const isActive = (name: string) => name === 'bottom'
      const state = parseAlignmentState(isActive)
      expect(state.vertical).toBe('bottom')
    })

    it('should detect ver-center alignment', () => {
      const isActive = (name: string) => name === 'ver-center'
      const state = parseAlignmentState(isActive)
      expect(state.vertical).toBe('middle')
    })

    it('should detect left alignment', () => {
      const isActive = (name: string) => name === 'left'
      const state = parseAlignmentState(isActive)
      expect(state.horizontal).toBe('left')
    })

    it('should detect right alignment', () => {
      const isActive = (name: string) => name === 'right'
      const state = parseAlignmentState(isActive)
      expect(state.horizontal).toBe('right')
    })

    it('should detect hor-center alignment', () => {
      const isActive = (name: string) => name === 'hor-center'
      const state = parseAlignmentState(isActive)
      expect(state.horizontal).toBe('center')
    })

    it('should detect center (both axes)', () => {
      const isActive = (name: string) => name === 'center'
      const state = parseAlignmentState(isActive)
      expect(state.isCenter).toBe(true)
    })

    it('should detect combination', () => {
      const isActive = (name: string) => name === 'top' || name === 'right'
      const state = parseAlignmentState(isActive)
      expect(state.vertical).toBe('top')
      expect(state.horizontal).toBe('right')
    })
  })

  describe('createAlignmentHandler', () => {
    it('should call onAlign with position', () => {
      const onAlign = vi.fn()
      const handlers = createAlignmentHandler(onAlign)

      const mockCell = document.createElement('button')
      mockCell.setAttribute('data-align', 'top-left')

      handlers['.pp-align-cell'].click(new MouseEvent('click'), mockCell)

      expect(onAlign).toHaveBeenCalledWith('top-left')
    })
  })

  describe('getAlignmentChanges', () => {
    it('should return properties to add for top-left', () => {
      const state: AlignmentState = { vertical: null, horizontal: null, isCenter: false }
      const changes = getAlignmentChanges('top-left', state)

      expect(changes.add).toContain('top')
      expect(changes.add).toContain('left')
    })

    it('should return center for middle-center', () => {
      const state: AlignmentState = { vertical: null, horizontal: null, isCenter: false }
      const changes = getAlignmentChanges('middle-center', state)

      expect(changes.add).toContain('center')
    })

    it('should toggle off when clicking active cell', () => {
      const state: AlignmentState = { vertical: 'top', horizontal: 'left', isCenter: false }
      const changes = getAlignmentChanges('top-left', state)

      expect(changes.add).toHaveLength(0)
      expect(changes.remove.length).toBeGreaterThan(0)
    })

    it('should remove conflicting properties', () => {
      const state: AlignmentState = { vertical: 'bottom', horizontal: 'right', isCenter: false }
      const changes = getAlignmentChanges('top-left', state)

      expect(changes.remove).toContain('bottom')
      expect(changes.remove).toContain('right')
    })
  })

  describe('ALIGN_TO_PROPERTY', () => {
    it('should map all 9 positions', () => {
      expect(ALIGN_TO_PROPERTY['top-left']).toEqual(['top', 'left'])
      expect(ALIGN_TO_PROPERTY['top-center']).toEqual(['top', 'hor-center'])
      expect(ALIGN_TO_PROPERTY['top-right']).toEqual(['top', 'right'])
      expect(ALIGN_TO_PROPERTY['middle-left']).toEqual(['ver-center', 'left'])
      expect(ALIGN_TO_PROPERTY['middle-center']).toEqual(['center'])
      expect(ALIGN_TO_PROPERTY['middle-right']).toEqual(['ver-center', 'right'])
      expect(ALIGN_TO_PROPERTY['bottom-left']).toEqual(['bottom', 'left'])
      expect(ALIGN_TO_PROPERTY['bottom-center']).toEqual(['bottom', 'hor-center'])
      expect(ALIGN_TO_PROPERTY['bottom-right']).toEqual(['bottom', 'right'])
    })
  })
})

// =============================================================================
// COLOR SWATCH
// =============================================================================

describe('ColorSwatch', () => {
  describe('renderColorSwatch', () => {
    it('should render color swatch with background', () => {
      const html = renderColorSwatch({
        property: 'bg',
        value: '#2563eb'
      })

      expect(html).toContain('color-swatch')
      expect(html).toContain('background-color: #2563eb')
    })

    it('should show token indicator for token values', () => {
      const html = renderColorSwatch({
        property: 'bg',
        value: '$primary'
      })

      expect(html).toContain('color-token-indicator')
      expect(html).toContain('$primary')
    })

    it('should use gray background for tokens', () => {
      const html = renderColorSwatch({
        property: 'bg',
        value: '$primary'
      })

      expect(html).toContain('background-color: #888')
    })

    it('should add light-color class for light colors', () => {
      const html = renderColorSwatch({
        property: 'bg',
        value: '#ffffff'
      })

      expect(html).toContain('light-color')
    })

    it('should not add light-color class for dark colors', () => {
      const html = renderColorSwatch({
        property: 'bg',
        value: '#000000'
      })

      expect(html).not.toContain('light-color')
    })

    it('should include data-color-prop attribute', () => {
      const html = renderColorSwatch({
        property: 'col',
        value: '#fff'
      })

      expect(html).toContain('data-color-prop="col"')
    })

    it('should include title with property and value', () => {
      const html = renderColorSwatch({
        property: 'bg',
        value: '#2563eb',
        label: 'Background'
      })

      expect(html).toContain('title="Background: #2563eb"')
    })

    it('should handle empty value', () => {
      const html = renderColorSwatch({
        property: 'bg',
        value: ''
      })

      expect(html).toContain('background-color: transparent')
    })

    it('should apply size classes', () => {
      const small = renderColorSwatch({ property: 'bg', value: '#fff', size: 'small' })
      const large = renderColorSwatch({ property: 'bg', value: '#fff', size: 'large' })

      expect(small).toContain('color-swatch-sm')
      expect(large).toContain('color-swatch-lg')
    })
  })

  describe('renderColorRow', () => {
    it('should render complete color row', () => {
      const html = renderColorRow({
        property: 'bg',
        value: '#2563eb',
        label: 'Background'
      })

      expect(html).toContain('pp-row')
      expect(html).toContain('pp-row-label')
      expect(html).toContain('Background')
      expect(html).toContain('color-swatch')
    })

    it('should render token buttons', () => {
      const html = renderColorRow({
        property: 'bg',
        value: '',
        label: 'Background',
        tokens: [
          { name: 'primary', value: '#2563eb' },
          { name: 'danger', value: '#ef4444' }
        ]
      })

      expect(html).toContain('color-tokens')
      expect(html).toContain('color-token-btn')
      expect(html).toContain('data-token-name="primary"')
    })

    it('should mark active token', () => {
      const html = renderColorRow({
        property: 'bg',
        value: '$primary',
        label: 'Background',
        tokens: [{ name: 'primary', value: '#2563eb' }]
      })

      expect(html).toContain('color-token-btn active')
    })

    it('should render input field', () => {
      const html = renderColorRow({
        property: 'bg',
        value: '#2563eb',
        label: 'Background',
        showInput: true
      })

      expect(html).toContain('pp-input')
      expect(html).toContain('data-color-input')
      expect(html).toContain('value="#2563eb"')
    })

    it('should hide input when showInput is false', () => {
      const html = renderColorRow({
        property: 'bg',
        value: '#fff',
        label: 'Background',
        showInput: false
      })

      expect(html).not.toContain('pp-input')
    })

    it('should limit tokens to 6', () => {
      const tokens = Array.from({ length: 10 }, (_, i) => ({
        name: `color${i}`,
        value: `#${i}${i}${i}`
      }))

      const html = renderColorRow({
        property: 'bg',
        value: '',
        label: 'Background',
        tokens
      })

      const container = document.createElement('div')
      container.innerHTML = html
      expect(container.querySelectorAll('.color-token-btn')).toHaveLength(6)
    })
  })

  describe('createColorSwatchHandler', () => {
    it('should call onSwatchClick with property and value', () => {
      const onSwatchClick = vi.fn()
      const handlers = createColorSwatchHandler(onSwatchClick)

      const mockSwatch = document.createElement('button')
      mockSwatch.setAttribute('data-color-prop', 'bg')
      mockSwatch.style.backgroundColor = 'rgb(37, 99, 235)'

      handlers['.color-swatch'].click(new MouseEvent('click'), mockSwatch)

      expect(onSwatchClick).toHaveBeenCalledWith(
        'bg',
        'rgb(37, 99, 235)',
        expect.any(MouseEvent)
      )
    })
  })

  describe('createColorTokenHandler', () => {
    it('should call onTokenSelect with property, value, and name', () => {
      const onTokenSelect = vi.fn()
      const handlers = createColorTokenHandler(onTokenSelect)

      const mockBtn = document.createElement('button')
      mockBtn.setAttribute('data-color-prop', 'bg')
      mockBtn.setAttribute('data-color-token', '#2563eb')
      mockBtn.setAttribute('data-token-name', 'primary')

      handlers['.color-token-btn'].click(new MouseEvent('click'), mockBtn)

      expect(onTokenSelect).toHaveBeenCalledWith('bg', '#2563eb', 'primary')
    })

    it('should handle missing token name', () => {
      const onTokenSelect = vi.fn()
      const handlers = createColorTokenHandler(onTokenSelect)

      const mockBtn = document.createElement('button')
      mockBtn.setAttribute('data-color-prop', 'bg')
      mockBtn.setAttribute('data-color-token', '#2563eb')
      // No data-token-name

      handlers['.color-token-btn'].click(new MouseEvent('click'), mockBtn)

      expect(onTokenSelect).toHaveBeenCalledWith('bg', '#2563eb', '')
    })
  })
})
