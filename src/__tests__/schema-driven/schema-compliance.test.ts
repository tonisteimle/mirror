/**
 * @module __tests__/schema-driven/schema-compliance.test.ts
 * @description Schema-driven parser compliance tests.
 *
 * This test suite automatically generates tests from parser-expectations.ts
 * to verify that the parser and style converter produce correct outputs
 * for all DSL elements defined in the master schema.
 *
 * Test Categories:
 * - Properties: DSL → parsed property → CSS
 * - Events: Event handler parsing
 * - States: State definition parsing
 * - Actions: Action parsing
 * - Animations: Animation parsing
 */

import { describe, it, expect } from 'vitest'
import {
  props,
  style,
  parseOne,
  getState,
  getAction,
  getActions,
  getHandler,
  getAnimation,
} from '../test-utils'
import {
  PROPERTY_EXPECTATIONS,
  EVENT_EXPECTATIONS,
  STATE_EXPECTATIONS,
  ACTION_EXPECTATIONS,
  ANIMATION_EXPECTATIONS,
  type PropertyExpectation,
  type EventExpectation,
  type StateExpectation,
  type ActionExpectation,
  type AnimationExpectation,
} from '../../dsl/parser-expectations'

// =============================================================================
// PROPERTY TESTS
// =============================================================================

describe('Schema-Driven Parser Compliance', () => {
  describe('Properties', () => {
    // Iterate through all property categories
    Object.entries(PROPERTY_EXPECTATIONS).forEach(([category, properties]) => {
      describe(category, () => {
        // Iterate through all properties in category
        Object.entries(properties).forEach(([propName, expectations]) => {
          describe(propName, () => {
            (expectations as PropertyExpectation[]).forEach(({ input, property, css, note }) => {
              // Test property parsing
              if (property) {
                it(`parses: ${input}`, () => {
                  const parsed = props(input)
                  expect(parsed).toMatchObject(property)
                })
              }

              // Test CSS generation
              if (css) {
                it(`CSS: ${input}`, () => {
                  const generated = style(input)
                  expect(generated).toMatchObject(css)
                })
              }
            })
          })
        })
      })
    })
  })

  // =============================================================================
  // EVENT TESTS
  // =============================================================================

  describe('Events', () => {
    Object.entries(EVENT_EXPECTATIONS).forEach(([eventName, expectations]) => {
      describe(eventName, () => {
        (expectations as EventExpectation[]).forEach(({ input, event, key, actionType, target, debounce, delay }) => {
          it(`parses: ${input.replace(/\n/g, '\\n')}`, () => {
            const node = parseOne(input)

            // Find the handler
            const handler = getHandler(node, event)
            expect(handler).toBeDefined()

            // Check key modifier for keyboard events
            if (key) {
              expect(handler?.key).toBe(key)
            }

            // Check first action
            if (actionType) {
              const action = getAction(node, event)
              expect(action?.type).toBe(actionType)

              if (target) {
                expect(action?.target).toBe(target)
              }
            }

            // Check timing modifiers
            if (debounce !== undefined) {
              expect(handler?.debounce).toBe(debounce)
            }
            if (delay !== undefined) {
              expect(handler?.delay).toBe(delay)
            }
          })
        })
      })
    })
  })

  // =============================================================================
  // STATE TESTS
  // =============================================================================

  describe('States', () => {
    Object.entries(STATE_EXPECTATIONS).forEach(([stateName, expectations]) => {
      describe(stateName, () => {
        (expectations as StateExpectation[]).forEach(({ input, stateName: expectedName, stateProperties, type }) => {
          it(`parses state: ${expectedName}`, () => {
            const node = parseOne(input)
            const state = getState(node, expectedName)

            expect(state).toBeDefined()
            expect(state?.name).toBe(expectedName)

            // Check state properties
            if (stateProperties) {
              expect(state?.properties).toMatchObject(stateProperties)
            }

            // Check state type if specified
            if (type) {
              // System states are hover, focus, active, disabled
              const systemStates = ['hover', 'focus', 'active', 'disabled']
              const isSystem = systemStates.includes(expectedName)
              expect(isSystem).toBe(type === 'system')
            }
          })
        })
      })
    })
  })

  // =============================================================================
  // ACTION TESTS
  // =============================================================================

  describe('Actions', () => {
    Object.entries(ACTION_EXPECTATIONS).forEach(([actionName, expectations]) => {
      describe(actionName, () => {
        (expectations as ActionExpectation[]).forEach(({ input, event, actions }) => {
          it(`parses: ${input.replace(/\n/g, '\\n')}`, () => {
            const node = parseOne(input)
            const handler = getHandler(node, event)

            expect(handler).toBeDefined()

            const parsedActions = getActions(node, event)

            // Check each expected action
            actions.forEach((expectedAction, index) => {
              const actualAction = parsedActions[index]
              expect(actualAction).toBeDefined()
              expect(actualAction?.type).toBe(expectedAction.type)

              if (expectedAction.target) {
                expect(actualAction?.target).toBe(expectedAction.target)
              }
              if (expectedAction.animation) {
                expect(actualAction?.animation).toBe(expectedAction.animation)
              }
              if (expectedAction.position) {
                expect(actualAction?.position).toBe(expectedAction.position)
              }
            })
          })
        })
      })
    })
  })

  // =============================================================================
  // ANIMATION TESTS
  // =============================================================================

  describe('Animations', () => {
    Object.entries(ANIMATION_EXPECTATIONS).forEach(([animName, expectations]) => {
      describe(animName, () => {
        (expectations as AnimationExpectation[]).forEach(({ input, type, animations, duration }) => {
          it(`parses: ${input.replace(/\n/g, '\\n')}`, () => {
            const node = parseOne(input)
            const anim = getAnimation(node, type)

            expect(anim).toBeDefined()

            // Check animation names
            if (animations) {
              expect(anim?.animations).toEqual(expect.arrayContaining(animations))
            }

            // Check duration
            if (duration !== undefined) {
              expect(anim?.duration).toBe(duration)
            }
          })
        })
      })
    })
  })
})

// =============================================================================
// COVERAGE REPORT
// =============================================================================

describe('Schema Coverage', () => {
  it('has property expectations for all categories', () => {
    const categories = Object.keys(PROPERTY_EXPECTATIONS)
    expect(categories).toContain('layout')
    expect(categories).toContain('alignment')
    expect(categories).toContain('sizing')
    expect(categories).toContain('spacing')
    expect(categories).toContain('color')
    expect(categories).toContain('border')
    expect(categories).toContain('typography')
    expect(categories).toContain('icon')
    expect(categories).toContain('visual')
    expect(categories).toContain('scroll')
    expect(categories).toContain('hover')
    expect(categories).toContain('form')
    expect(categories).toContain('image')
    expect(categories).toContain('link')
  })

  it('has event expectations for all event types', () => {
    const events = Object.keys(EVENT_EXPECTATIONS)
    expect(events).toContain('onclick')
    expect(events).toContain('onhover')
    expect(events).toContain('onfocus')
    expect(events).toContain('onblur')
    expect(events).toContain('onchange')
    expect(events).toContain('oninput')
    expect(events).toContain('onkeydown-escape')
    expect(events).toContain('onkeydown-enter')
    expect(events).toContain('onkeydown-arrow-down')
  })

  it('has state expectations for system and behavior states', () => {
    const states = Object.keys(STATE_EXPECTATIONS)
    // System states
    expect(states).toContain('hover')
    expect(states).toContain('focus')
    expect(states).toContain('active')
    expect(states).toContain('disabled')
    // Behavior states
    expect(states).toContain('highlighted')
    expect(states).toContain('selected')
    expect(states).toContain('expanded')
    expect(states).toContain('collapsed')
    expect(states).toContain('on')
    expect(states).toContain('off')
  })

  it('has action expectations for all action types', () => {
    const actions = Object.keys(ACTION_EXPECTATIONS)
    // Visibility
    expect(actions).toContain('toggle')
    expect(actions).toContain('show')
    expect(actions).toContain('hide')
    expect(actions).toContain('open')
    expect(actions).toContain('close')
    // State
    expect(actions).toContain('activate')
    expect(actions).toContain('deactivate')
    // Selection
    expect(actions).toContain('highlight')
    expect(actions).toContain('select')
    // Forms
    expect(actions).toContain('validate')
    expect(actions).toContain('reset')
    expect(actions).toContain('focus')
  })

  it('has animation expectations for all animation types', () => {
    const animations = Object.keys(ANIMATION_EXPECTATIONS)
    // Transitions
    expect(animations).toContain('fade')
    expect(animations).toContain('scale')
    expect(animations).toContain('slide-up')
    expect(animations).toContain('slide-down')
    // Continuous
    expect(animations).toContain('spin')
    expect(animations).toContain('pulse')
    expect(animations).toContain('bounce')
  })
})

// =============================================================================
// STATISTICS
// =============================================================================

describe('Test Statistics', () => {
  it('counts total expectations', () => {
    let propertyCount = 0
    for (const category of Object.values(PROPERTY_EXPECTATIONS)) {
      for (const props of Object.values(category)) {
        propertyCount += (props as PropertyExpectation[]).length
      }
    }

    let eventCount = 0
    for (const expectations of Object.values(EVENT_EXPECTATIONS)) {
      eventCount += expectations.length
    }

    let stateCount = 0
    for (const expectations of Object.values(STATE_EXPECTATIONS)) {
      stateCount += expectations.length
    }

    let actionCount = 0
    for (const expectations of Object.values(ACTION_EXPECTATIONS)) {
      actionCount += expectations.length
    }

    let animationCount = 0
    for (const expectations of Object.values(ANIMATION_EXPECTATIONS)) {
      animationCount += expectations.length
    }

    const total = propertyCount + eventCount + stateCount + actionCount + animationCount

    // Log statistics
    console.log('\n=== Schema Compliance Test Statistics ===')
    console.log(`Property expectations: ${propertyCount}`)
    console.log(`Event expectations: ${eventCount}`)
    console.log(`State expectations: ${stateCount}`)
    console.log(`Action expectations: ${actionCount}`)
    console.log(`Animation expectations: ${animationCount}`)
    console.log(`Total expectations: ${total}`)
    console.log('==========================================\n')

    // Verify we have substantial coverage
    expect(propertyCount).toBeGreaterThan(100) // Should have 100+ property tests
    expect(eventCount).toBeGreaterThan(10) // Should have 10+ event tests
    expect(stateCount).toBeGreaterThan(5) // Should have 5+ state tests
    expect(actionCount).toBeGreaterThan(15) // Should have 15+ action tests
    expect(animationCount).toBeGreaterThan(10) // Should have 10+ animation tests
  })
})
