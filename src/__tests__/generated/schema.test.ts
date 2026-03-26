/**
 * Schema Validation Tests
 *
 * Auto-generated aus src/schema/dsl.ts – nicht manuell editieren!
 * Diese Tests validieren, dass die Schema-Definition korrekt ist.
 */

import { describe, it, expect } from 'vitest'
import {
  DSL,
  SCHEMA,
  findProperty,
  getKeywordsForProperty,
  isReservedKeyword,
  isPrimitive,
  getAllPropertyNames,
  getAllEvents,
  getAllActions,
  getAllStates,
} from '../../schema/dsl'

describe('DSL Schema', () => {

  describe('Schema Structure', () => {
    it('has required properties', () => {
      expect(SCHEMA.width).toBeDefined()
      expect(SCHEMA.height).toBeDefined()
      expect(SCHEMA.background).toBeDefined()
      expect(SCHEMA.padding).toBeDefined()
    })

    it('all properties have name and category', () => {
      for (const [key, prop] of Object.entries(SCHEMA)) {
        expect(prop.name, `${key} should have name`).toBeDefined()
        expect(prop.category, `${key} should have category`).toBeDefined()
      }
    })
  })

  describe('Keywords', () => {
    it('has reserved keywords', () => {
      expect(DSL.keywords.reserved.length).toBeGreaterThan(0)
    })

    it('isReservedKeyword works', () => {
      expect(isReservedKeyword('as')).toBe(true)
      expect(isReservedKeyword('extends')).toBe(true)
      expect(isReservedKeyword('notakeyword')).toBe(false)
    })
  })

  describe('Primitives', () => {
    it('has required primitives', () => {
      expect(DSL.primitives.Box).toBeDefined()
      expect(DSL.primitives.Text).toBeDefined()
      expect(DSL.primitives.Button).toBeDefined()
    })

    it('isPrimitive works', () => {
      expect(isPrimitive('Box')).toBe(true)
      expect(isPrimitive('box')).toBe(true)
      expect(isPrimitive('NotAPrimitive')).toBe(false)
    })
  })

  describe('Property Aliases', () => {
    it('w resolves to width', () => {
      expect(findProperty('w')?.name).toBe('width')
    })

    it('h resolves to height', () => {
      expect(findProperty('h')?.name).toBe('height')
    })

    it('minw resolves to min-width', () => {
      expect(findProperty('minw')?.name).toBe('min-width')
    })

    it('maxw resolves to max-width', () => {
      expect(findProperty('maxw')?.name).toBe('max-width')
    })

    it('minh resolves to min-height', () => {
      expect(findProperty('minh')?.name).toBe('min-height')
    })

    it('maxh resolves to max-height', () => {
      expect(findProperty('maxh')?.name).toBe('max-height')
    })

    it('hor resolves to horizontal', () => {
      expect(findProperty('hor')?.name).toBe('horizontal')
    })

    it('ver resolves to vertical', () => {
      expect(findProperty('ver')?.name).toBe('vertical')
    })

    it('g resolves to gap', () => {
      expect(findProperty('g')?.name).toBe('gap')
    })

    it('cen resolves to center', () => {
      expect(findProperty('cen')?.name).toBe('center')
    })

    it('tl resolves to top-left', () => {
      expect(findProperty('tl')?.name).toBe('top-left')
    })

    it('tc resolves to top-center', () => {
      expect(findProperty('tc')?.name).toBe('top-center')
    })

    it('tr resolves to top-right', () => {
      expect(findProperty('tr')?.name).toBe('top-right')
    })

    it('cl resolves to center-left', () => {
      expect(findProperty('cl')?.name).toBe('center-left')
    })

    it('cr resolves to center-right', () => {
      expect(findProperty('cr')?.name).toBe('center-right')
    })

    it('bl resolves to bottom-left', () => {
      expect(findProperty('bl')?.name).toBe('bottom-left')
    })

    it('bc resolves to bottom-center', () => {
      expect(findProperty('bc')?.name).toBe('bottom-center')
    })

    it('br resolves to bottom-right', () => {
      expect(findProperty('br')?.name).toBe('bottom-right')
    })

    it('positioned resolves to pos', () => {
      expect(findProperty('positioned')?.name).toBe('pos')
    })

    it('pad resolves to padding', () => {
      expect(findProperty('pad')?.name).toBe('padding')
    })

    it('p resolves to padding', () => {
      expect(findProperty('p')?.name).toBe('padding')
    })

    it('m resolves to margin', () => {
      expect(findProperty('m')?.name).toBe('margin')
    })

    it('bg resolves to background', () => {
      expect(findProperty('bg')?.name).toBe('background')
    })

    it('col resolves to color', () => {
      expect(findProperty('col')?.name).toBe('color')
    })

    it('c resolves to color', () => {
      expect(findProperty('c')?.name).toBe('color')
    })

    it('boc resolves to border-color', () => {
      expect(findProperty('boc')?.name).toBe('border-color')
    })

    it('bor resolves to border', () => {
      expect(findProperty('bor')?.name).toBe('border')
    })

    it('rad resolves to radius', () => {
      expect(findProperty('rad')?.name).toBe('radius')
    })

    it('fs resolves to font-size', () => {
      expect(findProperty('fs')?.name).toBe('font-size')
    })

    it('pl resolves to pin-left', () => {
      expect(findProperty('pl')?.name).toBe('pin-left')
    })

    it('pr resolves to pin-right', () => {
      expect(findProperty('pr')?.name).toBe('pin-right')
    })

    it('pt resolves to pin-top', () => {
      expect(findProperty('pt')?.name).toBe('pin-top')
    })

    it('pb resolves to pin-bottom', () => {
      expect(findProperty('pb')?.name).toBe('pin-bottom')
    })

    it('pcx resolves to pin-center-x', () => {
      expect(findProperty('pcx')?.name).toBe('pin-center-x')
    })

    it('pcy resolves to pin-center-y', () => {
      expect(findProperty('pcy')?.name).toBe('pin-center-y')
    })

    it('pc resolves to pin-center', () => {
      expect(findProperty('pc')?.name).toBe('pin-center')
    })

    it('abs resolves to absolute', () => {
      expect(findProperty('abs')?.name).toBe('absolute')
    })

    it('rot resolves to rotate', () => {
      expect(findProperty('rot')?.name).toBe('rotate')
    })

    it('o resolves to opacity', () => {
      expect(findProperty('o')?.name).toBe('opacity')
    })

    it('opa resolves to opacity', () => {
      expect(findProperty('opa')?.name).toBe('opacity')
    })

    it('blur-bg resolves to backdrop-blur', () => {
      expect(findProperty('blur-bg')?.name).toBe('backdrop-blur')
    })

    it('scroll-ver resolves to scroll', () => {
      expect(findProperty('scroll-ver')?.name).toBe('scroll')
    })

  })

  describe('Property Keywords', () => {
    it('width has keywords: full, hug', () => {
      const keywords = getKeywordsForProperty('width')
      expect(keywords).toContain('full')
      expect(keywords).toContain('hug')
    })

    it('height has keywords: full, hug', () => {
      const keywords = getKeywordsForProperty('height')
      expect(keywords).toContain('full')
      expect(keywords).toContain('hug')
    })

    it('size has keywords: full, hug', () => {
      const keywords = getKeywordsForProperty('size')
      expect(keywords).toContain('full')
      expect(keywords).toContain('hug')
    })

    it('aspect has keywords: square, video', () => {
      const keywords = getKeywordsForProperty('aspect')
      expect(keywords).toContain('square')
      expect(keywords).toContain('video')
    })

    it('grid has keywords: auto', () => {
      const keywords = getKeywordsForProperty('grid')
      expect(keywords).toContain('auto')
    })

    it('align has keywords: top, bottom, left, right, center', () => {
      const keywords = getKeywordsForProperty('align')
      expect(keywords).toContain('top')
      expect(keywords).toContain('bottom')
      expect(keywords).toContain('left')
      expect(keywords).toContain('right')
      expect(keywords).toContain('center')
    })

    it('weight has keywords: thin, light, normal, medium, semibold, bold, black', () => {
      const keywords = getKeywordsForProperty('weight')
      expect(keywords).toContain('thin')
      expect(keywords).toContain('light')
      expect(keywords).toContain('normal')
      expect(keywords).toContain('medium')
      expect(keywords).toContain('semibold')
      expect(keywords).toContain('bold')
      expect(keywords).toContain('black')
    })

    it('font has keywords: sans, serif, mono, roboto', () => {
      const keywords = getKeywordsForProperty('font')
      expect(keywords).toContain('sans')
      expect(keywords).toContain('serif')
      expect(keywords).toContain('mono')
      expect(keywords).toContain('roboto')
    })

    it('text-align has keywords: left, center, right, justify', () => {
      const keywords = getKeywordsForProperty('text-align')
      expect(keywords).toContain('left')
      expect(keywords).toContain('center')
      expect(keywords).toContain('right')
      expect(keywords).toContain('justify')
    })

    it('shadow has keywords: sm, md, lg', () => {
      const keywords = getKeywordsForProperty('shadow')
      expect(keywords).toContain('sm')
      expect(keywords).toContain('md')
      expect(keywords).toContain('lg')
    })

    it('cursor has keywords: pointer, grab, move, text, wait, not-allowed', () => {
      const keywords = getKeywordsForProperty('cursor')
      expect(keywords).toContain('pointer')
      expect(keywords).toContain('grab')
      expect(keywords).toContain('move')
      expect(keywords).toContain('text')
      expect(keywords).toContain('wait')
      expect(keywords).toContain('not-allowed')
    })

  })

  describe('Events', () => {
    it('has required events', () => {
      const events = getAllEvents()
      expect(events).toContain('onclick')
      expect(events).toContain('onhover')
      expect(events).toContain('onkeydown')
    })
  })

  describe('Actions', () => {
    it('has required actions', () => {
      const actions = getAllActions()
      expect(actions).toContain('show')
      expect(actions).toContain('hide')
      expect(actions).toContain('toggle')
    })
  })

  describe('States', () => {
    it('has system states', () => {
      const states = getAllStates()
      expect(states).toContain('hover')
      expect(states).toContain('focus')
      expect(states).toContain('active')
    })

    it('has custom states', () => {
      const states = getAllStates()
      expect(states).toContain('selected')
      expect(states).toContain('open')
    })
  })
})