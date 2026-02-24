/**
 * Typo Fixes Tests
 *
 * Tests for Phase 3 (Typo) fixes.
 */

import { describe, it, expect } from 'vitest'
import {
  fixEventTypos,
  fixActionTypos,
  fixUnsupportedStates,
  fixComponentTypos,
  fixPropertyTypos,
} from '../../lib/self-healing/fixes/typo-fixes'

describe('Typo Fixes (Phase 3)', () => {
  describe('fixEventTypos', () => {
    it('fixes onclick typos', () => {
      expect(fixEventTypos('Button onlick toggle')).toBe('Button onclick toggle')
      expect(fixEventTypos('Button onclck toggle')).toBe('Button onclick toggle')
      expect(fixEventTypos('Button onclik toggle')).toBe('Button onclick toggle')
    })

    it('fixes onhover typos', () => {
      expect(fixEventTypos('Box onhver show Tooltip')).toBe('Box onhover show Tooltip')
      expect(fixEventTypos('Box onhovr show Tooltip')).toBe('Box onhover show Tooltip')
    })

    it('fixes onchange typos', () => {
      expect(fixEventTypos('Input onchage validate')).toBe('Input onchange validate')
      expect(fixEventTypos('Input onchnge validate')).toBe('Input onchange validate')
    })

    it('fixes onfocus typos', () => {
      expect(fixEventTypos('Input onfoucs highlight')).toBe('Input onfocus highlight')
    })

    it('fixes onkeydown typos', () => {
      expect(fixEventTypos('Input onkeydonw submit')).toBe('Input onkeydown submit')
      expect(fixEventTypos('Input onkeydwn submit')).toBe('Input onkeydown submit')
    })
  })

  describe('fixActionTypos', () => {
    it('fixes toggle typos', () => {
      expect(fixActionTypos('onclick toogle')).toBe('onclick toggle')
      expect(fixActionTypos('onclick togle')).toBe('onclick toggle')
    })

    it('fixes show/hide typos', () => {
      expect(fixActionTypos('onclick shwo Modal')).toBe('onclick show Modal')
      expect(fixActionTypos('onclick hdie Modal')).toBe('onclick hide Modal')
      expect(fixActionTypos('onclick hidde Modal')).toBe('onclick hide Modal')
    })

    it('fixes open/close typos', () => {
      expect(fixActionTypos('onclick opne Dropdown')).toBe('onclick open Dropdown')
      expect(fixActionTypos('onclick clsoe Dropdown')).toBe('onclick close Dropdown')
    })

    it('fixes assign typos', () => {
      expect(fixActionTypos('onclick asign $x')).toBe('onclick assign $x')
      expect(fixActionTypos('onclick assgin $x')).toBe('onclick assign $x')
    })
  })

  describe('fixUnsupportedStates', () => {
    it('converts CSS pseudo-states to Mirror states', () => {
      expect(fixUnsupportedStates('state focus-within\n  bg #F00'))
        .toBe('state focus\n  bg #F00')
      expect(fixUnsupportedStates('state focus-visible\n  bor 1'))
        .toBe('state focus\n  bor 1')
    })

    it('converts checked to active', () => {
      expect(fixUnsupportedStates('state checked\n  bg #0F0'))
        .toBe('state active\n  bg #0F0')
    })

    it('converts enabled to active', () => {
      expect(fixUnsupportedStates('state enabled\n  opa 1'))
        .toBe('state active\n  opa 1')
    })

    it('converts child pseudo-classes to default', () => {
      expect(fixUnsupportedStates('state first-child\n  mar 0'))
        .toBe('state default\n  mar 0')
      expect(fixUnsupportedStates('state last-child\n  mar 0'))
        .toBe('state default\n  mar 0')
    })
  })

  // =========================================================================
  // Additional Typo Fixes Tests
  // =========================================================================

  describe('fixComponentTypos', () => {
    it('fixes Button typos', () => {
      expect(fixComponentTypos('Buttn "Click"')).toBe('Button "Click"')
      expect(fixComponentTypos('Buton pad 16')).toBe('Button pad 16')
    })

    it('fixes Card typos', () => {
      expect(fixComponentTypos('Crad bg #333')).toBe('Card bg #333')
      expect(fixComponentTypos('Cardd pad 16')).toBe('Card pad 16')
    })

    it('fixes Input typos', () => {
      expect(fixComponentTypos('Inputt "Email"')).toBe('Input "Email"')
      expect(fixComponentTypos('Imput placeholder')).toBe('Input placeholder')
    })

    it('fixes Icon typos', () => {
      expect(fixComponentTypos('Iccon "search"')).toBe('Icon "search"')
      expect(fixComponentTypos('Iocn "home"')).toBe('Icon "home"')
    })

    it('capitalizes lowercase components', () => {
      expect(fixComponentTypos('button "Click"')).toBe('Button "Click"')
      expect(fixComponentTypos('card pad 16')).toBe('Card pad 16')
      expect(fixComponentTypos('input "Email"')).toBe('Input "Email"')
    })

    it('converts HTML to Mirror', () => {
      expect(fixComponentTypos('Div bg #333')).toBe('Box bg #333')
      expect(fixComponentTypos('Span "Hello"')).toBe('Text "Hello"')
      expect(fixComponentTypos('Img "url"')).toBe('Image "url"')
    })
  })

  describe('fixPropertyTypos', () => {
    it('fixes background typos', () => {
      expect(fixPropertyTypos('Box backgrund #333')).toBe('Box bg #333')
      expect(fixPropertyTypos('Box backgorund #F00')).toBe('Box bg #F00')
      expect(fixPropertyTypos('Box bakground #0F0')).toBe('Box bg #0F0')
    })

    it('fixes padding typos', () => {
      expect(fixPropertyTypos('Box paddng 16')).toBe('Box pad 16')
      expect(fixPropertyTypos('Box paddin 8')).toBe('Box pad 8')
    })

    it('fixes radius typos', () => {
      expect(fixPropertyTypos('Card raduis 8')).toBe('Card rad 8')
      expect(fixPropertyTypos('Button radiuss 4')).toBe('Button rad 4')
    })

    it('fixes color typos', () => {
      expect(fixPropertyTypos('Text colr #333')).toBe('Text col #333')
      expect(fixPropertyTypos('Text colour #F00')).toBe('Text col #F00')
    })

    it('fixes border typos', () => {
      expect(fixPropertyTypos('Box bordr 1 #333')).toBe('Box bor 1 #333')
      expect(fixPropertyTypos('Card boreder 2')).toBe('Card bor 2')
    })

    it('fixes German property names', () => {
      expect(fixPropertyTypos('Box hintergrund #333')).toBe('Box bg #333')
    })
  })
})
