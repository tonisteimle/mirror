/**
 * Autocomplete Completeness Test
 *
 * Verifies that all DSL schema entries are available in autocomplete.
 * This prevents schema additions from being forgotten in autocomplete.
 */

import { describe, it, expect } from 'vitest'
import { DSL, SCHEMA, ZAG_PRIMITIVES } from '../../compiler/schema/dsl'
import { SCHEMA_COMPLETIONS } from '../../studio/autocomplete/schema-completions'

describe('Autocomplete Completeness', () => {
  describe('Primitives', () => {
    it('should include all DSL primitives', () => {
      const primitiveNames = Object.keys(DSL.primitives)
      const completionLabels = SCHEMA_COMPLETIONS.primitives.map(c => c.label)

      for (const name of primitiveNames) {
        expect(completionLabels, `Missing primitive: ${name}`).toContain(name)
      }
    })

    it('should include all primitive aliases', () => {
      const completionLabels = SCHEMA_COMPLETIONS.primitives.map(c => c.label)

      for (const [name, def] of Object.entries(DSL.primitives)) {
        if (def.aliases) {
          for (const alias of def.aliases) {
            expect(completionLabels, `Missing alias "${alias}" for ${name}`).toContain(alias)
          }
        }
      }
    })
  })

  describe('Zag Components', () => {
    it('should include all Zag components', () => {
      const zagNames = Object.keys(ZAG_PRIMITIVES)
      const completionLabels = SCHEMA_COMPLETIONS.zagComponents.map(c => c.label)

      for (const name of zagNames) {
        expect(completionLabels, `Missing Zag component: ${name}`).toContain(name)
      }
    })

    it('should include all Zag slots', () => {
      for (const [componentName, def] of Object.entries(ZAG_PRIMITIVES)) {
        if (def.slots) {
          const slotCompletions = SCHEMA_COMPLETIONS.zagSlots[componentName] || []
          const slotLabels = slotCompletions.map(c => c.label)

          for (const slotName of def.slots) {
            expect(slotLabels, `Missing slot "${slotName}" for ${componentName}`).toContain(slotName)
          }
        }
      }
    })
  })

  describe('Properties', () => {
    it('should include all SCHEMA properties', () => {
      const propertyNames = Object.keys(SCHEMA)
      const completionLabels = SCHEMA_COMPLETIONS.properties.map(c => c.label)

      for (const name of propertyNames) {
        expect(completionLabels, `Missing property: ${name}`).toContain(name)
      }
    })

    it('should include all property aliases', () => {
      const completionLabels = SCHEMA_COMPLETIONS.properties.map(c => c.label)

      for (const [name, def] of Object.entries(SCHEMA)) {
        if (def.aliases) {
          for (const alias of def.aliases) {
            expect(completionLabels, `Missing alias "${alias}" for property ${name}`).toContain(alias)
          }
        }
      }
    })

    it('should include property value keywords', () => {
      for (const [propName, def] of Object.entries(SCHEMA)) {
        if (def.keywords && def.keywords.length > 0) {
          const valueCompletions = SCHEMA_COMPLETIONS.propertyValues[propName] || []
          const valueLabels = valueCompletions.map(c => c.label)

          for (const keyword of def.keywords) {
            expect(valueLabels, `Missing keyword "${keyword}" for property ${propName}`).toContain(keyword)
          }
        }
      }
    })
  })

  describe('Events', () => {
    it('should include all DSL events', () => {
      const eventNames = Object.keys(DSL.events)
      const completionLabels = SCHEMA_COMPLETIONS.events.map(c => c.label)

      for (const name of eventNames) {
        expect(completionLabels, `Missing event: ${name}`).toContain(name)
      }
    })
  })

  describe('Actions', () => {
    it('should include all DSL actions', () => {
      const actionNames = Object.keys(DSL.actions)
      const completionLabels = SCHEMA_COMPLETIONS.actions.map(c => c.label)

      for (const name of actionNames) {
        expect(completionLabels, `Missing action: ${name}`).toContain(name)
      }
    })

    it('should include all action targets', () => {
      const allTargets = new Set<string>()
      for (const def of Object.values(DSL.actions)) {
        if (def.targets) {
          for (const target of def.targets) {
            allTargets.add(target)
          }
        }
      }

      const targetLabels = SCHEMA_COMPLETIONS.actionTargets.map(c => c.label)

      for (const target of allTargets) {
        expect(targetLabels, `Missing action target: ${target}`).toContain(target)
      }
    })
  })

  describe('States', () => {
    it('should include all system states', () => {
      // DSL.states is an object with state names as keys
      const systemStates = Object.entries(DSL.states)
        .filter(([_, def]) => def.system)
        .map(([name]) => name)
      const completionLabels = SCHEMA_COMPLETIONS.systemStates.map(c => c.label)

      for (const state of systemStates) {
        expect(completionLabels, `Missing system state: ${state}`).toContain(state)
      }
    })

    it('should include custom state examples', () => {
      // DSL.states is an object with state names as keys
      const customStates = Object.entries(DSL.states)
        .filter(([_, def]) => !def.system)
        .map(([name]) => name)
      const completionLabels = SCHEMA_COMPLETIONS.customStates.map(c => c.label)

      for (const state of customStates) {
        expect(completionLabels, `Missing custom state: ${state}`).toContain(state)
      }
    })
  })

  describe('Keywords', () => {
    it('should include all reserved keywords', () => {
      const keywords = DSL.keywords.reserved
      const completionLabels = SCHEMA_COMPLETIONS.keywords.map(c => c.label)

      for (const keyword of keywords) {
        expect(completionLabels, `Missing keyword: ${keyword}`).toContain(keyword)
      }
    })
  })

  describe('Keyboard Keys', () => {
    it('should include all keyboard keys', () => {
      const keys = DSL.keys
      const completionLabels = SCHEMA_COMPLETIONS.keys.map(c => c.label)

      for (const key of keys) {
        expect(completionLabels, `Missing key: ${key}`).toContain(key)
      }
    })
  })

  describe('Durations and Easings', () => {
    it('should include all durations from schema', () => {
      const durations = DSL.durations.map(d => d.value)
      const completionLabels = SCHEMA_COMPLETIONS.durations.map(c => c.label)

      for (const duration of durations) {
        expect(completionLabels, `Missing duration: ${duration}`).toContain(duration)
      }
    })

    it('should include all easing functions from schema', () => {
      const easings = DSL.easingFunctions.map(e => e.value)
      const completionLabels = SCHEMA_COMPLETIONS.easings.map(c => c.label)

      for (const easing of easings) {
        expect(completionLabels, `Missing easing: ${easing}`).toContain(easing)
      }
    })

    it('should include all animation presets from schema', () => {
      const presets = DSL.animationPresets
      const completionLabels = SCHEMA_COMPLETIONS.animationPresets.map(c => c.label)

      for (const preset of presets) {
        expect(completionLabels, `Missing animation preset: ${preset}`).toContain(preset)
      }
    })
  })

  describe('Coverage Summary', () => {
    it('should report coverage statistics', () => {
      const systemStates = Object.entries(DSL.states).filter(([_, def]) => def.system).length
      const customStates = Object.entries(DSL.states).filter(([_, def]) => !def.system).length

      const stats = {
        primitives: Object.keys(DSL.primitives).length,
        zagComponents: Object.keys(ZAG_PRIMITIVES).length,
        properties: Object.keys(SCHEMA).length,
        events: Object.keys(DSL.events).length,
        actions: Object.keys(DSL.actions).length,
        systemStates,
        customStates,
        keywords: DSL.keywords.reserved.length,
        keys: DSL.keys.length,
        durations: DSL.durations.length,
        easings: DSL.easingFunctions.length,
        animationPresets: DSL.animationPresets.length,
      }

      console.log('\n📊 Autocomplete Coverage:')
      console.log(`   Primitives:        ${stats.primitives}`)
      console.log(`   Zag Components:    ${stats.zagComponents}`)
      console.log(`   Properties:        ${stats.properties}`)
      console.log(`   Events:            ${stats.events}`)
      console.log(`   Actions:           ${stats.actions}`)
      console.log(`   System States:     ${stats.systemStates}`)
      console.log(`   Custom States:     ${stats.customStates}`)
      console.log(`   Keywords:          ${stats.keywords}`)
      console.log(`   Keyboard Keys:     ${stats.keys}`)
      console.log(`   Durations:         ${stats.durations}`)
      console.log(`   Easings:           ${stats.easings}`)
      console.log(`   Animation Presets: ${stats.animationPresets}`)

      // This test always passes - it's just for reporting
      expect(true).toBe(true)
    })
  })
})
