import { describe, it, expect } from 'vitest'
import { propertiesToStyle } from '../../utils/style-converter'

describe('col and bg property behavior', () => {
  describe('col property (always text color)', () => {
    it('should use col for text color on any component', () => {
      const style = propertiesToStyle({ col: '#FF0000' }, false, 'Box')
      expect(style.color).toBe('#FF0000')
      expect(style.backgroundColor).toBeUndefined()
    })

    it('should use col for text color on Text component', () => {
      const style = propertiesToStyle({ col: '#00FF00' }, false, 'Text')
      expect(style.color).toBe('#00FF00')
      expect(style.backgroundColor).toBeUndefined()
    })

    it('should use col for text color on Button', () => {
      const style = propertiesToStyle({ col: '#0000FF' }, false, 'Button')
      expect(style.color).toBe('#0000FF')
      expect(style.backgroundColor).toBeUndefined()
    })
  })

  describe('bg property (always background color)', () => {
    it('should use bg for background color with auto-contrast on Box', () => {
      const style = propertiesToStyle({ bg: '#FF0000' }, false, 'Box')
      expect(style.backgroundColor).toBe('#FF0000')
      // Box gets auto-contrast (white text on red background)
      expect(style.color).toBe('#fff')
    })

    it('should use bg for background color on Button with auto-contrast', () => {
      const style = propertiesToStyle({ bg: '#5C33CF' }, false, 'Button')
      expect(style.backgroundColor).toBe('#5C33CF')
      // Button gets auto-contrast text color (white on dark background)
      expect(style.color).toBe('#fff')
    })

    it('should use bg for background color on Card with auto-contrast', () => {
      const style = propertiesToStyle({ bg: '#1F2937' }, false, 'Card')
      expect(style.backgroundColor).toBe('#1F2937')
      // Card gets auto-contrast text color (white on dark background)
      expect(style.color).toBe('#fff')
    })
  })

  describe('combined col and bg', () => {
    it('should set both text color and background color independently', () => {
      const style = propertiesToStyle({ col: '#FFFFFF', bg: '#000000' }, false, 'Button')
      expect(style.color).toBe('#FFFFFF')
      expect(style.backgroundColor).toBe('#000000')
    })

    it('should allow different colors for text and background', () => {
      const style = propertiesToStyle({ col: '#FF0000', bg: '#00FF00' }, false, 'Box')
      expect(style.color).toBe('#FF0000')
      expect(style.backgroundColor).toBe('#00FF00')
    })
  })

  describe('auto-contrast for interactive components', () => {
    it('should set auto-contrast text color for Button with dark bg', () => {
      const style = propertiesToStyle({ bg: '#000000' }, false, 'Button')
      expect(style.backgroundColor).toBe('#000000')
      expect(style.color).toBe('#fff') // White text on dark background
    })

    it('should set auto-contrast text color for Button with light bg', () => {
      const style = propertiesToStyle({ bg: '#FFFFFF' }, false, 'Button')
      expect(style.backgroundColor).toBe('#FFFFFF')
      expect(style.color).toBe('#000') // Black text on light background
    })

    it('should not set auto-contrast for unknown custom components', () => {
      // Custom components not in the AUTO_CONTRAST list don't get auto-contrast
      const style = propertiesToStyle({ bg: '#000000' }, false, 'MyCustomWidget')
      expect(style.backgroundColor).toBe('#000000')
      expect(style.color).toBeUndefined()
    })

    it('should not override explicit col when bg is set', () => {
      const style = propertiesToStyle({ bg: '#000000', col: '#FF0000' }, false, 'Button')
      expect(style.backgroundColor).toBe('#000000')
      expect(style.color).toBe('#FF0000') // Explicit col is preserved
    })

    it('should set auto-contrast for Tile container', () => {
      const style = propertiesToStyle({ bg: '#3281d1' }, false, 'Tile')
      expect(style.backgroundColor).toBe('#3281d1')
      // Tile gets white text on blue background, inherited by children
      expect(style.color).toBe('#fff')
    })

    it('should set auto-contrast for Box container', () => {
      const style = propertiesToStyle({ bg: '#1F2937' }, false, 'Box')
      expect(style.backgroundColor).toBe('#1F2937')
      expect(style.color).toBe('#fff')
    })
  })
})
