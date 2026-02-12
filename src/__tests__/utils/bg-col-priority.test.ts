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
    it('should use bg for background color on any component', () => {
      const style = propertiesToStyle({ bg: '#FF0000' }, false, 'Box')
      expect(style.backgroundColor).toBe('#FF0000')
      expect(style.color).toBeUndefined()
    })

    it('should use bg for background color on Button', () => {
      const style = propertiesToStyle({ bg: '#5C33CF' }, false, 'Button')
      expect(style.backgroundColor).toBe('#5C33CF')
      expect(style.color).toBeUndefined()
    })

    it('should use bg for background color on Card', () => {
      const style = propertiesToStyle({ bg: '#FFFFFF' }, false, 'Card')
      expect(style.backgroundColor).toBe('#FFFFFF')
      expect(style.color).toBeUndefined()
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

  describe('no auto-contrast (explicit colors only)', () => {
    it('should not set auto-contrast text color when only bg is set', () => {
      const style = propertiesToStyle({ bg: '#000000' }, false, 'Button')
      expect(style.backgroundColor).toBe('#000000')
      expect(style.color).toBeUndefined() // No auto-contrast
    })

    it('should not set auto-contrast for light backgrounds', () => {
      const style = propertiesToStyle({ bg: '#FFFFFF' }, false, 'Card')
      expect(style.backgroundColor).toBe('#FFFFFF')
      expect(style.color).toBeUndefined() // No auto-contrast
    })
  })
})
