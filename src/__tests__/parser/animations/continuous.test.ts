/**
 * Parser Tests: Continuous Animations
 *
 * Tests for continuous animations:
 * - animate spin
 * - animate pulse
 * - animate bounce
 */

import { describe, it, expect } from 'vitest'
import { parseOne } from '../../test-utils'

describe('Spin Animation', () => {
  it('parses animate spin', () => {
    const node = parseOne('Icon animate spin "refresh"')
    expect(node.continuousAnimation).toBeDefined()
    expect(node.continuousAnimation?.type).toBe('animate')
    expect(node.continuousAnimation?.animations).toContain('spin')
  })

  it('parses animate spin with duration', () => {
    const node = parseOne('Icon animate spin 1000 "loading"')
    expect(node.continuousAnimation?.animations).toContain('spin')
    expect(node.continuousAnimation?.duration).toBe(1000)
  })
})

describe('Pulse Animation', () => {
  it('parses animate pulse', () => {
    const node = parseOne('Box animate pulse')
    expect(node.continuousAnimation?.type).toBe('animate')
    expect(node.continuousAnimation?.animations).toContain('pulse')
  })

  it('parses animate pulse with duration', () => {
    const node = parseOne('Box animate pulse 800')
    expect(node.continuousAnimation?.animations).toContain('pulse')
    expect(node.continuousAnimation?.duration).toBe(800)
  })
})

describe('Bounce Animation', () => {
  it('parses animate bounce', () => {
    const node = parseOne('Icon animate bounce "arrow-down"')
    expect(node.continuousAnimation?.type).toBe('animate')
    expect(node.continuousAnimation?.animations).toContain('bounce')
  })

  it('parses animate bounce with duration', () => {
    const node = parseOne('Box animate bounce 500')
    expect(node.continuousAnimation?.animations).toContain('bounce')
    expect(node.continuousAnimation?.duration).toBe(500)
  })
})

describe('Animation with Other Properties', () => {
  it('animate with size', () => {
    const node = parseOne('Icon animate spin 1000, size 24, "loading"')
    expect(node.continuousAnimation).toBeDefined()
    expect(node.properties['icon-size']).toBe(24)
  })

  it('animate with color', () => {
    const node = parseOne('Icon animate pulse, col #3B82F6, "star"')
    expect(node.continuousAnimation).toBeDefined()
    expect(node.properties.col).toBe('#3B82F6')
  })
})
