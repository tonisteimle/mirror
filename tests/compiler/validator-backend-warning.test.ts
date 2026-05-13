/**
 * Validator backend-support warnings (Hebel 3 follow-up).
 *
 * The schema's `PropertyDef.backends?: BackendTarget[]` declares which
 * compile targets actually emit a property. The validator reads it at
 * validate-time when a `target` option is set, and emits W130
 * (BACKEND_UNSUPPORTED) for any property whose declared backends don't
 * include the configured target.
 *
 * Without `target` set the check is silent — preserves the pre-Hebel-3
 * behavior for callers that don't care.
 */

import { describe, it, expect } from 'vitest'
import { validate } from '../../compiler/validator'

describe('Validator — backend-support warnings (W130)', () => {
  describe('disabled (no target)', () => {
    it('does not warn about DOM-only properties when no target is set', () => {
      const src = 'Input mask "###-####", placeholder "phone"'
      const result = validate(src)
      expect(result.warnings.find(w => w.code === 'W130')).toBeUndefined()
    })
  })

  describe('target=dom (DOM-only properties supported)', () => {
    it('does not warn for `mask` when target is dom', () => {
      const src = 'Input mask "###-####"'
      const result = validate(src, { target: 'dom' })
      expect(result.warnings.find(w => w.code === 'W130')).toBeUndefined()
    })
  })

  describe('target=react (DOM-only properties warn)', () => {
    it('warns for `mask` (DOM-only) when target is react', () => {
      const src = 'Input mask "###-####"'
      const result = validate(src, { target: 'react' })
      const w130 = result.warnings.find(w => w.code === 'W130')
      expect(w130).toBeDefined()
      expect(w130!.message).toContain('mask')
      expect(w130!.message).toContain('react')
      expect(w130!.message).toContain('dom')
    })

    it('warns for `keyboard-nav` (DOM-only) when target is react', () => {
      const src = 'Frame keyboard-nav\n  Input'
      const result = validate(src, { target: 'react' })
      expect(result.warnings.some(w => w.code === 'W130')).toBe(true)
    })

    it('warns for `loop-focus` (DOM-only) when target is react', () => {
      const src = 'Frame loop-focus\n  Item'
      const result = validate(src, { target: 'react' })
      expect(result.warnings.some(w => w.code === 'W130')).toBe(true)
    })

    it('warns for `typeahead` (DOM-only) when target is react', () => {
      const src = 'Frame typeahead\n  Item'
      const result = validate(src, { target: 'react' })
      expect(result.warnings.some(w => w.code === 'W130')).toBe(true)
    })

    it('warns for `trigger-text` (DOM-only) when target is react', () => {
      const src = 'Frame trigger-text\n  Item'
      const result = validate(src, { target: 'react' })
      expect(result.warnings.some(w => w.code === 'W130')).toBe(true)
    })

    it('does NOT warn for `bg` (cross-backend) when target is react', () => {
      const src = 'Frame bg #2271C1'
      const result = validate(src, { target: 'react' })
      expect(result.warnings.find(w => w.code === 'W130')).toBeUndefined()
    })
  })

  describe('target=vue / svelte / vanilla (export-pipeline targets)', () => {
    it('warns for `mask` when target is vue', () => {
      const src = 'Input mask "###-####"'
      const result = validate(src, { target: 'vue' })
      const w130 = result.warnings.find(w => w.code === 'W130')
      expect(w130).toBeDefined()
      expect(w130!.message).toContain('vue')
    })

    it('warns for `mask` when target is svelte', () => {
      const src = 'Input mask "###-####"'
      const result = validate(src, { target: 'svelte' })
      expect(result.warnings.some(w => w.code === 'W130')).toBe(true)
    })

    it('warns for `mask` when target is vanilla', () => {
      const src = 'Input mask "###-####"'
      const result = validate(src, { target: 'vanilla' })
      expect(result.warnings.some(w => w.code === 'W130')).toBe(true)
    })
  })

  describe('warning content', () => {
    it('includes property name, target, and supported-backends list', () => {
      const src = 'Input mask "###-####"'
      const result = validate(src, { target: 'react' })
      const w130 = result.warnings.find(w => w.code === 'W130')
      expect(w130).toBeDefined()
      // The message must reach a designer-readable form.
      expect(w130!.message).toMatch(/mask/)
      expect(w130!.message).toMatch(/react/)
      expect(w130!.message).toMatch(/silently dropped/)
    })

    it('records line + column from the property usage', () => {
      const src = 'Frame\n  Input mask "###-####"'
      const result = validate(src, { target: 'react' })
      const w130 = result.warnings.find(w => w.code === 'W130')
      expect(w130).toBeDefined()
      // Property `mask` is on line 2 (1-indexed in validator output).
      expect(w130!.line).toBe(2)
      expect(w130!.column).toBeGreaterThan(0)
    })

    it('multiple DOM-only properties produce multiple warnings', () => {
      const src = 'Input mask "###-####"\n\nFrame typeahead\n  Item'
      const result = validate(src, { target: 'react' })
      const w130s = result.warnings.filter(w => w.code === 'W130')
      expect(w130s.length).toBeGreaterThanOrEqual(2)
    })
  })
})
