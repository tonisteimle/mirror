/**
 * Extended Property Panel Section Tests
 *
 * Tests for: BehaviorSection, InteractionsSection, ActionsSection, VisualSection, EventsSection
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================
// Section Imports
// ============================================

import { BehaviorSection, createBehaviorSection } from '../../studio/panels/property/sections/behavior-section'
import { InteractionsSection, createInteractionsSection } from '../../studio/panels/property/sections/interactions-section'
import { ActionsSection, createActionsSection } from '../../studio/panels/property/sections/actions-section'
import { VisualSection, createVisualSection } from '../../studio/panels/property/sections/visual-section'
import { EventsSection, createEventsSection } from '../../studio/panels/property/sections/events-section'

import type { SectionDependencies } from '../../studio/panels/property/base/section'
import type { SectionData, ExtractedProperty, ExtractedInteraction, ExtractedEvent, ExtractedAction } from '../../studio/panels/property/types'

// ============================================
// Mock Factories
// ============================================

function createMockDependencies(): SectionDependencies {
  return {
    onPropertyChange: vi.fn(),
    escapeHtml: (str: string) => str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)),
    getSpacingTokens: vi.fn().mockReturnValue([]),
    getColorTokens: vi.fn().mockReturnValue([])
  }
}

function createMockProperty(overrides: Partial<ExtractedProperty>): ExtractedProperty {
  return {
    name: 'testProp',
    value: '',
    hasValue: false,
    source: 'default',
    ...overrides
  }
}

function createMockSectionData(overrides: Partial<SectionData> = {}): SectionData {
  return {
    category: {
      name: 'test',
      label: 'Test',
      properties: []
    },
    ...overrides
  }
}

function createMockInteraction(overrides: Partial<ExtractedInteraction> = {}): ExtractedInteraction {
  return {
    name: 'toggle',
    args: [],
    ...overrides
  }
}

function createMockEvent(overrides: Partial<ExtractedEvent> = {}): ExtractedEvent {
  return {
    name: 'onclick',
    key: undefined,
    actions: [{ name: 'toggle', isFunctionCall: false }],
    ...overrides
  }
}

function createMockAction(overrides: Partial<ExtractedAction> = {}): ExtractedAction {
  return {
    name: 'toggle',
    isFunctionCall: false,
    ...overrides
  }
}

// ============================================
// BehaviorSection Tests
// ============================================

describe('BehaviorSection', () => {
  let deps: SectionDependencies
  let section: BehaviorSection

  beforeEach(() => {
    deps = createMockDependencies()
    section = createBehaviorSection(deps)
  })

  describe('render', () => {
    it('should return empty string when no category', () => {
      const result = section.render({ category: undefined })
      expect(result).toBe('')
    })

    it('should return empty string when no properties', () => {
      const data = createMockSectionData({
        category: { name: 'behavior', label: 'Behavior', properties: [] }
      })
      const result = section.render(data)
      expect(result).toBe('')
    })

    it('should render boolean properties as toggle buttons', () => {
      const data = createMockSectionData({
        category: {
          name: 'behavior',
          label: 'Behavior',
          properties: [
            createMockProperty({ name: 'loop', value: 'true', type: 'boolean' })
          ]
        }
      })
      const result = section.render(data)
      expect(result).toContain('data-behavior-toggle="loop"')
      expect(result).toContain('active')
    })

    it('should render inactive boolean property', () => {
      const data = createMockSectionData({
        category: {
          name: 'behavior',
          label: 'Behavior',
          properties: [
            createMockProperty({ name: 'loop', value: 'false', type: 'boolean' })
          ]
        }
      })
      const result = section.render(data)
      expect(result).toContain('data-behavior-toggle="loop"')
      expect(result).not.toContain('class="pp-toggle-btn single active"')
    })

    it('should render select properties as dropdowns', () => {
      const data = createMockSectionData({
        category: {
          name: 'behavior',
          label: 'Behavior',
          properties: [
            createMockProperty({
              name: 'orientation',
              value: 'horizontal',
              type: 'select',
              options: ['horizontal', 'vertical']
            })
          ]
        }
      })
      const result = section.render(data)
      expect(result).toContain('data-behavior-select="orientation"')
      expect(result).toContain('<option value="horizontal" selected>')
      expect(result).toContain('<option value="vertical" ')
    })

    it('should render text/number properties as inputs', () => {
      const data = createMockSectionData({
        category: {
          name: 'behavior',
          label: 'Behavior',
          properties: [
            createMockProperty({ name: 'delay', value: '500', type: 'number' })
          ]
        }
      })
      const result = section.render(data)
      expect(result).toContain('data-behavior-input="delay"')
      expect(result).toContain('value="500"')
    })

    it('should exclude certain properties', () => {
      const data = createMockSectionData({
        category: {
          name: 'behavior',
          label: 'Behavior',
          properties: [
            createMockProperty({ name: 'clearable', value: 'true', type: 'boolean' }),
            createMockProperty({ name: 'disabled', value: 'true', type: 'boolean' }),
            createMockProperty({ name: 'required', value: 'true', type: 'boolean' }),
            createMockProperty({ name: 'loop', value: 'true', type: 'boolean' })
          ]
        }
      })
      const result = section.render(data)
      expect(result).not.toContain('clearable')
      expect(result).not.toContain('disabled')
      expect(result).not.toContain('required')
      expect(result).toContain('loop')
    })

    it('should use label if provided', () => {
      const data = createMockSectionData({
        category: {
          name: 'behavior',
          label: 'Behavior',
          properties: [
            createMockProperty({ name: 'loop', label: 'Enable Loop', type: 'boolean' })
          ]
        }
      })
      const result = section.render(data)
      expect(result).toContain('Enable Loop')
    })

    it('should show description in title', () => {
      const data = createMockSectionData({
        category: {
          name: 'behavior',
          label: 'Behavior',
          properties: [
            createMockProperty({
              name: 'loop',
              type: 'boolean',
              description: 'Enable looping'
            })
          ]
        }
      })
      const result = section.render(data)
      expect(result).toContain('title="Enable looping"')
    })
  })

  describe('getHandlers', () => {
    it('should have boolean toggle handler', () => {
      const handlers = section.getHandlers()
      expect(handlers['[data-behavior-toggle]']).toBeDefined()
      expect(handlers['[data-behavior-toggle]'].click).toBeDefined()
    })

    it('should have select change handler', () => {
      const handlers = section.getHandlers()
      expect(handlers['[data-behavior-select]']).toBeDefined()
      expect(handlers['[data-behavior-select]'].change).toBeDefined()
    })

    it('should have input handler', () => {
      const handlers = section.getHandlers()
      expect(handlers['[data-behavior-input]']).toBeDefined()
      expect(handlers['[data-behavior-input]'].input).toBeDefined()
    })

    it('should call onPropertyChange with __BEHAVIOR_TOGGLE__ for boolean toggle', () => {
      const handlers = section.getHandlers()
      const mockTarget = document.createElement('button')
      mockTarget.setAttribute('data-behavior-toggle', 'loop')

      handlers['[data-behavior-toggle]'].click(new Event('click'), mockTarget)

      expect(deps.onPropertyChange).toHaveBeenCalledWith('__BEHAVIOR_TOGGLE__', 'loop', 'toggle')
    })

    it('should call onPropertyChange with property name for select', () => {
      const handlers = section.getHandlers()
      const mockSelect = document.createElement('select')
      // Add options to select for value to work
      const opt1 = document.createElement('option')
      opt1.value = 'horizontal'
      const opt2 = document.createElement('option')
      opt2.value = 'vertical'
      mockSelect.appendChild(opt1)
      mockSelect.appendChild(opt2)
      mockSelect.setAttribute('data-behavior-select', 'orientation')
      mockSelect.value = 'vertical'

      handlers['[data-behavior-select]'].change(new Event('change'), mockSelect)

      expect(deps.onPropertyChange).toHaveBeenCalledWith('orientation', 'vertical', 'input')
    })

    it('should call onPropertyChange with property name for input', () => {
      const handlers = section.getHandlers()
      const mockInput = document.createElement('input')
      mockInput.setAttribute('data-behavior-input', 'delay')
      mockInput.value = '1000'

      handlers['[data-behavior-input]'].input(new Event('input'), mockInput)

      expect(deps.onPropertyChange).toHaveBeenCalledWith('delay', '1000', 'input')
    })
  })

  describe('factory function', () => {
    it('should create instance with createBehaviorSection', () => {
      const instance = createBehaviorSection(deps)
      expect(instance).toBeInstanceOf(BehaviorSection)
    })
  })
})

// ============================================
// InteractionsSection Tests
// ============================================

describe('InteractionsSection', () => {
  let deps: SectionDependencies
  let section: InteractionsSection

  beforeEach(() => {
    deps = createMockDependencies()
    section = createInteractionsSection(deps)
  })

  describe('render', () => {
    it('should render all interaction modes', () => {
      const data = createMockSectionData({ interactions: [] })
      const result = section.render(data)

      expect(result).toContain('data-interaction="toggle"')
      expect(result).toContain('data-interaction="exclusive"')
      expect(result).toContain('data-interaction="select"')
    })

    it('should mark active interaction as active', () => {
      const data = createMockSectionData({
        interactions: [createMockInteraction({ name: 'toggle' })]
      })
      const result = section.render(data)

      expect(result).toContain('data-interaction="toggle"')
      // The toggle button should have 'active' class
      expect(result).toMatch(/data-interaction="toggle"[\s\S]*?active/)
    })

    it('should mark exclusive as active when set', () => {
      const data = createMockSectionData({
        interactions: [createMockInteraction({ name: 'exclusive' })]
      })
      const result = section.render(data)

      expect(result).toMatch(/class="pp-interaction-btn active"[\s\S]*?data-interaction="exclusive"/)
    })

    it('should show descriptions in titles', () => {
      const data = createMockSectionData({ interactions: [] })
      const result = section.render(data)

      expect(result).toContain('title="Toggle between states on click"')
      expect(result).toContain('title="Only one can be active (radio behavior)"')
      expect(result).toContain('title="Selection behavior for lists"')
    })

    it('should have no active button when no interactions', () => {
      const data = createMockSectionData({ interactions: [] })
      const result = section.render(data)

      // Count occurrences of 'active' class
      const activeMatches = result.match(/class="pp-interaction-btn active"/g)
      expect(activeMatches).toBeNull()
    })
  })

  describe('getHandlers', () => {
    it('should have interaction button handler', () => {
      const handlers = section.getHandlers()
      expect(handlers['[data-interaction]']).toBeDefined()
      expect(handlers['[data-interaction]'].click).toBeDefined()
    })

    it('should call onPropertyChange with __INTERACTION__ signal', () => {
      const handlers = section.getHandlers()
      const mockTarget = document.createElement('button')
      mockTarget.setAttribute('data-interaction', 'exclusive')

      handlers['[data-interaction]'].click(new Event('click'), mockTarget)

      expect(deps.onPropertyChange).toHaveBeenCalledWith('__INTERACTION__', 'exclusive', 'toggle')
    })

    it('should not call onPropertyChange if attribute is missing', () => {
      const handlers = section.getHandlers()
      const mockTarget = document.createElement('button')
      // No data-interaction attribute

      handlers['[data-interaction]'].click(new Event('click'), mockTarget)

      expect(deps.onPropertyChange).not.toHaveBeenCalled()
    })
  })

  describe('factory function', () => {
    it('should create instance with createInteractionsSection', () => {
      const instance = createInteractionsSection(deps)
      expect(instance).toBeInstanceOf(InteractionsSection)
    })
  })
})

// ============================================
// ActionsSection Tests
// ============================================

describe('ActionsSection', () => {
  let deps: SectionDependencies
  let section: ActionsSection

  beforeEach(() => {
    deps = createMockDependencies()
    section = createActionsSection(deps)
  })

  describe('render', () => {
    it('should return empty string when no actions', () => {
      const data = createMockSectionData({ actions: [] })
      const result = section.render(data)
      expect(result).toBe('')
    })

    it('should return empty string when actions is undefined', () => {
      const data = createMockSectionData({ actions: undefined })
      const result = section.render(data)
      expect(result).toBe('')
    })

    it('should render actions list', () => {
      const data = createMockSectionData({
        actions: [
          createMockAction({ name: 'toggle', isFunctionCall: false }),
          createMockAction({ name: 'show', target: 'Menu', isFunctionCall: false })
        ]
      })
      const result = section.render(data)

      expect(result).toContain('toggle')
      expect(result).toContain('show')
      expect(result).toContain('(Menu)')
    })

    it('should show function call with parentheses', () => {
      const data = createMockSectionData({
        actions: [createMockAction({ name: 'saveData', isFunctionCall: true })]
      })
      const result = section.render(data)

      expect(result).toContain('saveData()')
    })

    it('should render add action button', () => {
      const data = createMockSectionData({
        actions: [createMockAction({ name: 'toggle' })]
      })
      const result = section.render(data)

      expect(result).toContain('pp-add-action-btn')
      expect(result).toContain('Add action')
    })

    it('should include action index in data attribute', () => {
      const data = createMockSectionData({
        actions: [
          createMockAction({ name: 'action1' }),
          createMockAction({ name: 'action2' })
        ]
      })
      const result = section.render(data)

      expect(result).toContain('data-action-index="0"')
      expect(result).toContain('data-action-index="1"')
    })
  })

  describe('getHandlers', () => {
    it('should have add action button handler', () => {
      const handlers = section.getHandlers()
      expect(handlers['.pp-add-action-btn']).toBeDefined()
      expect(handlers['.pp-add-action-btn'].click).toBeDefined()
    })

    it('should have action row click handler', () => {
      const handlers = section.getHandlers()
      expect(handlers['.pp-action-row']).toBeDefined()
      expect(handlers['.pp-action-row'].click).toBeDefined()
    })

    it('should call onPropertyChange with __ADD_ACTION__ on add click', () => {
      const handlers = section.getHandlers()
      const mockTarget = document.createElement('button')

      handlers['.pp-add-action-btn'].click(new Event('click'), mockTarget)

      expect(deps.onPropertyChange).toHaveBeenCalledWith('__ADD_ACTION__', '', 'toggle')
    })

    it('should call onPropertyChange with __EDIT_ACTION__ on row click', () => {
      const handlers = section.getHandlers()
      const mockTarget = document.createElement('div')
      mockTarget.setAttribute('data-action-index', '2')

      handlers['.pp-action-row'].click(new Event('click'), mockTarget)

      expect(deps.onPropertyChange).toHaveBeenCalledWith('__EDIT_ACTION__', '2', 'toggle')
    })
  })

  describe('factory function', () => {
    it('should create instance with createActionsSection', () => {
      const instance = createActionsSection(deps)
      expect(instance).toBeInstanceOf(ActionsSection)
    })
  })
})

// ============================================
// VisualSection Tests
// ============================================

describe('VisualSection', () => {
  let deps: SectionDependencies
  let section: VisualSection

  beforeEach(() => {
    deps = createMockDependencies()
    section = createVisualSection(deps)
  })

  describe('render', () => {
    it('should return empty string when no category', () => {
      const result = section.render({ category: undefined })
      expect(result).toBe('')
    })

    it('should render shadow presets', () => {
      const data = createMockSectionData({
        category: {
          name: 'visual',
          label: 'Visual',
          properties: [createMockProperty({ name: 'shadow', value: 'md' })]
        }
      })
      const result = section.render(data)

      expect(result).toContain('data-shadow="none"')
      expect(result).toContain('data-shadow="sm"')
      expect(result).toContain('data-shadow="md"')
      expect(result).toContain('data-shadow="lg"')
    })

    it('should mark active shadow preset', () => {
      const data = createMockSectionData({
        category: {
          name: 'visual',
          label: 'Visual',
          properties: [createMockProperty({ name: 'shadow', value: 'lg' })]
        }
      })
      const result = section.render(data)

      // The lg button should be active
      expect(result).toMatch(/data-shadow="lg"[\s\S]*?active|active[\s\S]*?data-shadow="lg"/)
    })

    it('should mark none as active when no shadow', () => {
      const data = createMockSectionData({
        category: {
          name: 'visual',
          label: 'Visual',
          properties: [createMockProperty({ name: 'shadow', value: '' })]
        }
      })
      const result = section.render(data)

      expect(result).toMatch(/class="pp-toggle-btn active" data-shadow="none"/)
    })

    it('should render opacity presets and input', () => {
      const data = createMockSectionData({
        category: {
          name: 'visual',
          label: 'Visual',
          properties: [createMockProperty({ name: 'opacity', value: '0.5' })]
        }
      })
      const result = section.render(data)

      expect(result).toContain('data-opacity="0"')
      expect(result).toContain('data-opacity="0.5"')
      expect(result).toContain('data-opacity="1"')
      expect(result).toContain('data-prop="opacity"')
      expect(result).toContain('value="0.5"')
    })

    it('should render cursor dropdown', () => {
      const data = createMockSectionData({
        category: {
          name: 'visual',
          label: 'Visual',
          properties: [createMockProperty({ name: 'cursor', value: 'pointer' })]
        }
      })
      const result = section.render(data)

      expect(result).toContain('data-prop="cursor"')
      expect(result).toContain('<option value="pointer" selected>')
      expect(result).toContain('<option value="grab"')
    })

    it('should render z-index input', () => {
      const data = createMockSectionData({
        category: {
          name: 'visual',
          label: 'Visual',
          properties: [createMockProperty({ name: 'z', value: '10' })]
        }
      })
      const result = section.render(data)

      expect(result).toContain('data-prop="z"')
      expect(result).toContain('value="10"')
    })

    it('should render overflow toggles', () => {
      const data = createMockSectionData({
        category: {
          name: 'visual',
          label: 'Visual',
          properties: [
            createMockProperty({ name: 'scroll', value: 'true', hasValue: true }),
            createMockProperty({ name: 'clip', value: '', hasValue: true })
          ]
        }
      })
      const result = section.render(data)

      expect(result).toContain('data-overflow="scroll"')
      expect(result).toContain('data-overflow="scroll-hor"')
      expect(result).toContain('data-overflow="clip"')
    })

    it('should mark scroll as active when enabled', () => {
      const data = createMockSectionData({
        category: {
          name: 'visual',
          label: 'Visual',
          properties: [createMockProperty({ name: 'scroll', value: 'true', hasValue: true })]
        }
      })
      const result = section.render(data)

      expect(result).toMatch(/class="pp-toggle-btn active" data-overflow="scroll"/)
    })

    it('should render visibility toggles', () => {
      const data = createMockSectionData({
        category: {
          name: 'visual',
          label: 'Visual',
          properties: [createMockProperty({ name: 'hidden', value: 'true', hasValue: true })]
        }
      })
      const result = section.render(data)

      expect(result).toContain('data-visibility="hidden"')
      expect(result).toContain('data-visibility="visible"')
      expect(result).toContain('data-visibility="disabled"')
    })
  })

  describe('getHandlers', () => {
    it('should have shadow toggle handler', () => {
      const handlers = section.getHandlers()
      expect(handlers['[data-shadow]']).toBeDefined()
      expect(handlers['[data-shadow]'].click).toBeDefined()
    })

    it('should have opacity preset handler', () => {
      const handlers = section.getHandlers()
      expect(handlers['[data-opacity]']).toBeDefined()
      expect(handlers['[data-opacity]'].click).toBeDefined()
    })

    it('should have opacity input handler', () => {
      const handlers = section.getHandlers()
      expect(handlers['input[data-prop="opacity"]']).toBeDefined()
      expect(handlers['input[data-prop="opacity"]'].input).toBeDefined()
    })

    it('should have cursor select handler', () => {
      const handlers = section.getHandlers()
      expect(handlers['select[data-prop="cursor"]']).toBeDefined()
      expect(handlers['select[data-prop="cursor"]'].change).toBeDefined()
    })

    it('should have z-index input handler', () => {
      const handlers = section.getHandlers()
      expect(handlers['input[data-prop="z"]']).toBeDefined()
      expect(handlers['input[data-prop="z"]'].input).toBeDefined()
    })

    it('should have overflow toggle handler', () => {
      const handlers = section.getHandlers()
      expect(handlers['[data-overflow]']).toBeDefined()
      expect(handlers['[data-overflow]'].click).toBeDefined()
    })

    it('should have visibility toggle handler', () => {
      const handlers = section.getHandlers()
      expect(handlers['[data-visibility]']).toBeDefined()
      expect(handlers['[data-visibility]'].click).toBeDefined()
    })

    it('should convert "none" shadow to empty string', () => {
      const handlers = section.getHandlers()
      const mockTarget = document.createElement('button')
      mockTarget.setAttribute('data-shadow', 'none')

      handlers['[data-shadow]'].click(new Event('click'), mockTarget)

      expect(deps.onPropertyChange).toHaveBeenCalledWith('shadow', '', 'toggle')
    })

    it('should pass shadow value directly for other presets', () => {
      const handlers = section.getHandlers()
      const mockTarget = document.createElement('button')
      mockTarget.setAttribute('data-shadow', 'lg')

      handlers['[data-shadow]'].click(new Event('click'), mockTarget)

      expect(deps.onPropertyChange).toHaveBeenCalledWith('shadow', 'lg', 'toggle')
    })

    it('should call onPropertyChange for opacity preset', () => {
      const handlers = section.getHandlers()
      const mockTarget = document.createElement('button')
      mockTarget.setAttribute('data-opacity', '0.75')

      handlers['[data-opacity]'].click(new Event('click'), mockTarget)

      expect(deps.onPropertyChange).toHaveBeenCalledWith('opacity', '0.75', 'token')
    })

    it('should call onPropertyChange with __OVERFLOW__ signal', () => {
      const handlers = section.getHandlers()
      const mockTarget = document.createElement('button')
      mockTarget.setAttribute('data-overflow', 'scroll-hor')

      handlers['[data-overflow]'].click(new Event('click'), mockTarget)

      expect(deps.onPropertyChange).toHaveBeenCalledWith('__OVERFLOW__', 'scroll-hor', 'toggle')
    })

    it('should call onPropertyChange with __VISIBILITY__ signal', () => {
      const handlers = section.getHandlers()
      const mockTarget = document.createElement('button')
      mockTarget.setAttribute('data-visibility', 'disabled')

      handlers['[data-visibility]'].click(new Event('click'), mockTarget)

      expect(deps.onPropertyChange).toHaveBeenCalledWith('__VISIBILITY__', 'disabled', 'toggle')
    })
  })

  describe('factory function', () => {
    it('should create instance with createVisualSection', () => {
      const instance = createVisualSection(deps)
      expect(instance).toBeInstanceOf(VisualSection)
    })
  })
})

// ============================================
// EventsSection Tests
// ============================================

describe('EventsSection', () => {
  let deps: SectionDependencies
  let section: EventsSection

  beforeEach(() => {
    deps = createMockDependencies()
    section = createEventsSection(deps)
  })

  describe('render', () => {
    it('should render events list when events exist', () => {
      const data = createMockSectionData({
        events: [createMockEvent({ name: 'onclick', actions: [{ name: 'toggle', isFunctionCall: false }] })]
      })
      const result = section.render(data)

      expect(result).toContain('onclick')
      expect(result).toContain('toggle')
    })

    it('should show "No events defined" when empty', () => {
      const data = createMockSectionData({ events: [] })
      const result = section.render(data)

      expect(result).toContain('No events defined')
      expect(result).toContain('pp-events-empty')
    })

    it('should render add event button', () => {
      const data = createMockSectionData({ events: [] })
      const result = section.render(data)

      expect(result).toContain('pp-add-event-btn')
      expect(result).toContain('Add event')
    })

    it('should render event with key modifier', () => {
      const data = createMockSectionData({
        events: [createMockEvent({ name: 'onkeydown', key: 'enter' })]
      })
      const result = section.render(data)

      expect(result).toContain('onkeydown enter')
    })

    it('should render action with target', () => {
      const data = createMockSectionData({
        events: [
          createMockEvent({
            name: 'onclick',
            actions: [{ name: 'show', target: 'Menu', isFunctionCall: false }]
          })
        ]
      })
      const result = section.render(data)

      expect(result).toContain('show(Menu)')
    })

    it('should render function call with parentheses', () => {
      const data = createMockSectionData({
        events: [
          createMockEvent({
            name: 'onclick',
            actions: [{ name: 'handleClick', isFunctionCall: true }]
          })
        ]
      })
      const result = section.render(data)

      expect(result).toContain('handleClick()')
    })

    it('should render multiple actions', () => {
      const data = createMockSectionData({
        events: [
          createMockEvent({
            name: 'onclick',
            actions: [
              { name: 'toggle', isFunctionCall: false },
              { name: 'save', isFunctionCall: true }
            ]
          })
        ]
      })
      const result = section.render(data)

      expect(result).toContain('toggle, save()')
      expect(result).toContain('has-multiple-actions')
      expect(result).toContain('×2')
    })

    it('should include edit and delete buttons', () => {
      const data = createMockSectionData({
        events: [createMockEvent({ name: 'onclick' })]
      })
      const result = section.render(data)

      expect(result).toContain('pp-event-edit')
      expect(result).toContain('pp-event-delete')
    })

    it('should include event index in data attributes', () => {
      const data = createMockSectionData({
        events: [
          createMockEvent({ name: 'onclick' }),
          createMockEvent({ name: 'onhover' })
        ]
      })
      const result = section.render(data)

      expect(result).toContain('data-event-index="0"')
      expect(result).toContain('data-event-index="1"')
    })

    it('should show arrow between event and action', () => {
      const data = createMockSectionData({
        events: [createMockEvent({ name: 'onclick', actions: [{ name: 'toggle', isFunctionCall: false }] })]
      })
      const result = section.render(data)

      expect(result).toContain('→')
    })
  })

  describe('getHandlers', () => {
    it('should have add event button handler', () => {
      const handlers = section.getHandlers()
      expect(handlers['.pp-add-event-btn']).toBeDefined()
      expect(handlers['.pp-add-event-btn'].click).toBeDefined()
    })

    it('should have edit event button handler', () => {
      const handlers = section.getHandlers()
      expect(handlers['.pp-event-edit']).toBeDefined()
      expect(handlers['.pp-event-edit'].click).toBeDefined()
    })

    it('should have delete event button handler', () => {
      const handlers = section.getHandlers()
      expect(handlers['.pp-event-delete']).toBeDefined()
      expect(handlers['.pp-event-delete'].click).toBeDefined()
    })

    it('should call onPropertyChange with __ADD_EVENT__ on add click', () => {
      const handlers = section.getHandlers()
      const mockTarget = document.createElement('button')

      handlers['.pp-add-event-btn'].click(new Event('click'), mockTarget)

      expect(deps.onPropertyChange).toHaveBeenCalledWith('__ADD_EVENT__', '', 'toggle')
    })

    it('should call onPropertyChange with __EDIT_EVENT__ on edit click', () => {
      const handlers = section.getHandlers()
      const mockTarget = document.createElement('button')
      mockTarget.setAttribute('data-event-index', '1')

      handlers['.pp-event-edit'].click(new Event('click'), mockTarget)

      expect(deps.onPropertyChange).toHaveBeenCalledWith('__EDIT_EVENT__', '1', 'toggle')
    })

    it('should call onPropertyChange with __DELETE_EVENT__ on delete click', () => {
      const handlers = section.getHandlers()
      const mockTarget = document.createElement('button')
      mockTarget.setAttribute('data-event-index', '0')

      handlers['.pp-event-delete'].click(new Event('click'), mockTarget)

      expect(deps.onPropertyChange).toHaveBeenCalledWith('__DELETE_EVENT__', '0', 'toggle')
    })

    it('should not call onPropertyChange if index is missing', () => {
      const handlers = section.getHandlers()
      const mockTarget = document.createElement('button')
      // No data-event-index attribute

      handlers['.pp-event-edit'].click(new Event('click'), mockTarget)
      handlers['.pp-event-delete'].click(new Event('click'), mockTarget)

      expect(deps.onPropertyChange).not.toHaveBeenCalled()
    })
  })

  describe('factory function', () => {
    it('should create instance with createEventsSection', () => {
      const instance = createEventsSection(deps)
      expect(instance).toBeInstanceOf(EventsSection)
    })
  })
})

// ============================================
// BaseSection Tests (via concrete implementations)
// ============================================

describe('BaseSection functionality', () => {
  let deps: SectionDependencies

  beforeEach(() => {
    deps = createMockDependencies()
  })

  describe('attach/detach', () => {
    it('should attach to container and render', () => {
      const section = createVisualSection(deps)
      const container = document.createElement('div')
      const data = createMockSectionData({
        category: {
          name: 'visual',
          label: 'Visual',
          properties: [createMockProperty({ name: 'shadow', value: 'md' })]
        }
      })

      section.render(data) // Store data
      section.attach(container)

      expect(container.innerHTML).toContain('Shadow')
    })

    it('should detach from container', () => {
      const section = createVisualSection(deps)
      const container = document.createElement('div')

      section.attach(container)
      section.detach()

      // After detach, update should not throw
      expect(() => section.update(createMockSectionData())).not.toThrow()
    })
  })

  describe('update', () => {
    it('should update container innerHTML on update', () => {
      const section = createVisualSection(deps)
      const container = document.createElement('div')

      section.attach(container)
      section.update(createMockSectionData({
        category: {
          name: 'visual',
          label: 'Visual',
          properties: [createMockProperty({ name: 'shadow', value: 'lg' })]
        }
      }))

      expect(container.innerHTML).toContain('Shadow')
    })
  })

  describe('getData', () => {
    it('should return current data', () => {
      const section = createVisualSection(deps)
      const data = createMockSectionData({
        category: { name: 'visual', label: 'Visual', properties: [] }
      })

      section.render(data)

      expect(section.getData()).toEqual(data)
    })

    it('should return null if no data set', () => {
      const section = createVisualSection(deps)
      expect(section.getData()).toBeNull()
    })
  })

  describe('getConfig', () => {
    it('should return section config', () => {
      const section = createVisualSection(deps)
      const config = section.getConfig()

      expect(config.label).toBe('Visual')
    })
  })
})
