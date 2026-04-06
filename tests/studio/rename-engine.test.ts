/**
 * Rename Engine Tests
 *
 * Tests for IDE-style "Rename Symbol" (F2) functionality.
 */

import { describe, it, expect } from 'vitest'
import { RenameEngine, createRenameEngine } from '../../studio/rename/rename-engine'

describe('RenameEngine', () => {
  describe('getSymbolAtPosition', () => {
    it('should find component definition', () => {
      const engine = createRenameEngine()
      const source = `Btn: bg #2563eb, col white`

      const symbol = engine.getSymbolAtPosition(source, 1, 2)

      expect(symbol).not.toBeNull()
      expect(symbol?.name).toBe('Btn')
      expect(symbol?.type).toBe('component')
    })

    it('should find component instance', () => {
      const engine = createRenameEngine()
      const source = `Frame gap 12
  Btn "Click me"`

      const symbol = engine.getSymbolAtPosition(source, 2, 4)

      expect(symbol).not.toBeNull()
      expect(symbol?.name).toBe('Btn')
      expect(symbol?.type).toBe('component')
    })

    it('should find inherited component base', () => {
      const engine = createRenameEngine()
      const source = `PrimaryBtn as Btn: bg #2563eb`

      // Cursor on "Btn" (the base)
      const symbol = engine.getSymbolAtPosition(source, 1, 17)

      expect(symbol).not.toBeNull()
      expect(symbol?.name).toBe('Btn')
      expect(symbol?.type).toBe('component')
    })

    it('should find token definition', () => {
      const engine = createRenameEngine()
      const source = `$primary.bg: #2563eb`

      const symbol = engine.getSymbolAtPosition(source, 1, 5)

      expect(symbol).not.toBeNull()
      expect(symbol?.name).toBe('$primary')
      expect(symbol?.type).toBe('token')
    })

    it('should find token reference', () => {
      const engine = createRenameEngine()
      const source = `Btn: bg $primary, col white`

      const symbol = engine.getSymbolAtPosition(source, 1, 12)

      expect(symbol).not.toBeNull()
      expect(symbol?.name).toBe('$primary')
      expect(symbol?.type).toBe('token')
    })

    it('should return null for non-symbol position', () => {
      const engine = createRenameEngine()
      const source = `Frame gap 12`

      // Cursor on "gap" (property, not symbol)
      const symbol = engine.getSymbolAtPosition(source, 1, 8)

      // "gap" is not a component (starts lowercase)
      expect(symbol).toBeNull()
    })
  })

  describe('findReferencesInFile', () => {
    it('should find all component references', () => {
      const engine = createRenameEngine()
      const source = `Btn: bg #2563eb, col white

Frame gap 12
  Btn "Click"
  Btn "Submit"`

      const locations = engine.findReferencesInFile(source, 'test.mir', 'Btn', 'component')

      expect(locations.length).toBe(3)
      expect(locations[0].type).toBe('definition')
      expect(locations[0].line).toBe(1)
      expect(locations[1].type).toBe('reference')
      expect(locations[1].line).toBe(4)
      expect(locations[2].type).toBe('reference')
      expect(locations[2].line).toBe(5)
    })

    it('should find inheritance references', () => {
      const engine = createRenameEngine()
      const source = `Btn: bg #333, col white

PrimaryBtn as Btn: bg #2563eb
DangerBtn as Btn: bg #ef4444`

      const locations = engine.findReferencesInFile(source, 'test.mir', 'Btn', 'component')

      expect(locations.length).toBe(3)
      expect(locations[0].type).toBe('definition')
      expect(locations[1].type).toBe('inheritance')
      expect(locations[2].type).toBe('inheritance')
    })

    it('should find all token references', () => {
      const engine = createRenameEngine()
      const source = `$primary.bg: #2563eb
$primary.col: white

Btn: bg $primary, col $primary`

      const locations = engine.findReferencesInFile(source, 'test.mir', '$primary', 'token')

      expect(locations.length).toBe(4)
      expect(locations[0].type).toBe('definition')
      expect(locations[0].line).toBe(1)
      expect(locations[1].type).toBe('definition')
      expect(locations[1].line).toBe(2)
      expect(locations[2].type).toBe('reference')
      expect(locations[3].type).toBe('reference')
    })
  })

  describe('findAllReferences', () => {
    it('should find references across multiple files', () => {
      const engine = createRenameEngine()
      const files = [
        {
          name: 'components.com',
          content: `Btn: bg #333, col white`,
        },
        {
          name: 'index.mir',
          content: `use components

Frame gap 12
  Btn "Submit"`,
        },
      ]

      const result = engine.findAllReferences(files, 'Btn', 'component')

      expect(result.locations.length).toBe(2)
      expect(result.locations[0].file).toBe('components.com')
      expect(result.locations[0].type).toBe('definition')
      expect(result.locations[1].file).toBe('index.mir')
      expect(result.locations[1].type).toBe('reference')
    })
  })

  describe('applyRename', () => {
    it('should rename component in source', () => {
      const engine = createRenameEngine()
      const source = `Btn: bg #333, col white

Btn "Click"`

      const locations = engine.findReferencesInFile(source, 'test.mir', 'Btn', 'component')
      const newSource = engine.applyRename(source, locations, 'Button')

      expect(newSource).toBe(`Button: bg #333, col white

Button "Click"`)
    })

    it('should rename token in source', () => {
      const engine = createRenameEngine()
      const source = `$primary.bg: #2563eb

Btn: bg $primary`

      const locations = engine.findReferencesInFile(source, 'test.mir', '$primary', 'token')
      const newSource = engine.applyRename(source, locations, '$accent')

      expect(newSource).toBe(`$accent.bg: #2563eb

Btn: bg $accent`)
    })
  })

  describe('validateName', () => {
    it('should accept valid component names', () => {
      const engine = createRenameEngine()

      expect(engine.validateName('Btn', 'component').valid).toBe(true)
      expect(engine.validateName('PrimaryButton', 'component').valid).toBe(true)
      expect(engine.validateName('Card2', 'component').valid).toBe(true)
    })

    it('should reject invalid component names', () => {
      const engine = createRenameEngine()

      expect(engine.validateName('btn', 'component').valid).toBe(false) // lowercase
      expect(engine.validateName('', 'component').valid).toBe(false) // empty
      expect(engine.validateName('My Button', 'component').valid).toBe(false) // space
      expect(engine.validateName('Frame', 'component').valid).toBe(false) // reserved
    })

    it('should accept valid token names', () => {
      const engine = createRenameEngine()

      expect(engine.validateName('$primary', 'token').valid).toBe(true)
      expect(engine.validateName('$btn-bg', 'token').valid).toBe(true)
      expect(engine.validateName('$card2', 'token').valid).toBe(true)
    })

    it('should reject invalid token names', () => {
      const engine = createRenameEngine()

      expect(engine.validateName('primary', 'token').valid).toBe(false) // no $
      expect(engine.validateName('', 'token').valid).toBe(false) // empty
      expect(engine.validateName('$my token', 'token').valid).toBe(false) // space
    })
  })
})
