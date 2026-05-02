/**
 * studio/visual/snapping-service
 *
 * Token + grid snapping for handle drags. Two stores feed it
 * (handleSnapSettings, gridSettings) — we reset both before each case
 * so module-globals don't leak.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SnappingService, shouldBypassSnapping } from '../../studio/visual/snapping-service'
import { handleSnapSettings, gridSettings } from '../../studio/core/settings'

beforeEach(() => {
  handleSnapSettings.set({
    enabled: true,
    gridSize: 8,
    customPoints: [],
    threshold: 4,
    maxValue: 200,
    tokenSnapping: true,
  })
  gridSettings.set({
    enabled: true,
    size: 8,
    showVisual: false,
    color: '#5BA8F5',
  })
})

describe('SnappingService — token parsing', () => {
  it('extracts spacing tokens from source for pad/mar/gap', () => {
    const source = 's.pad: 4\nm.mar: 8\nl.gap: 16\n'
    const svc = new SnappingService(() => source)
    expect(svc.getSpacingTokens('pad')).toEqual([
      { name: 's', fullName: 's.pad', value: 4, suffix: 'pad' },
    ])
    expect(svc.getSpacingTokens('mar')).toEqual([
      { name: 'm', fullName: 'm.mar', value: 8, suffix: 'mar' },
    ])
    expect(svc.getSpacingTokens('gap')).toEqual([
      { name: 'l', fullName: 'l.gap', value: 16, suffix: 'gap' },
    ])
  })

  it('also recognises tokens with leading $ prefix and indentation', () => {
    const source = '  $s.pad: 4\n  $m.pad: 8\n'
    const svc = new SnappingService(() => source)
    const pads = svc.getSpacingTokens('pad')
    expect(pads.map(t => t.name).sort()).toEqual(['m', 's'])
  })

  it('sorts tokens by value', () => {
    const source = 'l.pad: 24\ns.pad: 4\nm.pad: 12\n'
    const svc = new SnappingService(() => source)
    const pads = svc.getSpacingTokens('pad')
    expect(pads.map(t => t.value)).toEqual([4, 12, 24])
  })

  it('returns all tokens when propertyType omitted', () => {
    const source = 's.pad: 4\nm.mar: 8\n'
    const svc = new SnappingService(() => source)
    expect(svc.getSpacingTokens()).toHaveLength(2)
  })

  it('caches by source hash and re-parses when source changes', () => {
    let source = 's.pad: 4\n'
    const svc = new SnappingService(() => source)
    expect(svc.getSpacingTokens('pad')).toHaveLength(1)
    source = 's.pad: 4\nm.pad: 8\n'
    expect(svc.getSpacingTokens('pad')).toHaveLength(2)
  })
})

describe('SnappingService — token snap', () => {
  it('snaps within threshold to closest token', () => {
    const svc = new SnappingService(() => 's.pad: 4\nm.pad: 8\nl.pad: 16\n')
    const result = svc.snapToToken(9, 'pad') // 9 → m=8 (delta 1) wins over l=16 (delta 7)
    expect(result.snapped).toBe(true)
    expect(result.value).toBe(8)
    expect(result.tokenName).toBe('$m')
  })

  it('returns unchanged when no token within threshold', () => {
    const svc = new SnappingService(() => 's.pad: 4\nl.pad: 64\n')
    const result = svc.snapToToken(20, 'pad')
    expect(result.snapped).toBe(false)
    expect(result.value).toBe(20)
  })

  it('returns unchanged when token snapping disabled', () => {
    handleSnapSettings.set({ tokenSnapping: false })
    const svc = new SnappingService(() => 's.pad: 4\n')
    const result = svc.snapToToken(5, 'pad')
    expect(result.snapped).toBe(false)
    expect(result.value).toBe(5)
  })

  it('returns unchanged when overall snapping disabled', () => {
    handleSnapSettings.set({ enabled: false })
    const svc = new SnappingService(() => 's.pad: 4\n')
    const result = svc.snapToToken(5, 'pad')
    expect(result.snapped).toBe(false)
  })
})

describe('SnappingService — grid snap', () => {
  it('rounds value to grid size', () => {
    const svc = new SnappingService(() => '')
    const result = svc.snapToGrid(13)
    expect(result.value).toBe(16) // 13 → nearest 8 = 16
    expect(result.snapped).toBe(true)
    expect(result.gridSnapped).toBe(true)
  })

  it('does nothing when grid disabled', () => {
    gridSettings.set({ enabled: false })
    const svc = new SnappingService(() => '')
    const result = svc.snapToGrid(13)
    expect(result.value).toBe(13)
    expect(result.snapped).toBe(false)
  })

  it('reports unsnapped when value already on grid', () => {
    const svc = new SnappingService(() => '')
    const result = svc.snapToGrid(16)
    expect(result.value).toBe(16)
    expect(result.snapped).toBe(false)
  })

  it('snaps width and height together', () => {
    const svc = new SnappingService(() => '')
    const { width, height } = svc.snapSizeToGrid(13, 17)
    expect(width.value).toBe(16)
    expect(height.value).toBe(16)
  })
})

describe('SnappingService — combined snapSpacing', () => {
  it('snaps to token when tokens exist for property type', () => {
    const svc = new SnappingService(() => 's.pad: 4\nm.pad: 12\n')
    const result = svc.snapSpacing(13, 'pad') // closest token = 12
    expect(result.snapped).toBe(true)
    expect(result.value).toBe(12)
    expect(result.tokenName).toBe('$m')
  })

  it('falls back to grid snapping when no tokens for type', () => {
    // Tokens defined for `mar` but not `pad`
    const svc = new SnappingService(() => 's.mar: 4\n')
    const result = svc.snapSpacing(13, 'pad')
    expect(result.snapped).toBe(true)
    expect(result.value).toBe(16) // grid snap to 16
    expect(result.gridSnapped).toBe(true)
    expect(result.tokenName).toBeUndefined()
  })

  it('returns unchanged when no tokens AND grid disabled', () => {
    handleSnapSettings.set({ enabled: false })
    const svc = new SnappingService(() => '')
    const result = svc.snapSpacing(13, 'pad')
    expect(result.snapped).toBe(false)
    expect(result.value).toBe(13)
  })

  it('does NOT fall through to grid when tokens exist but value is far from any token', () => {
    // Single token at 4, value 40 — no fallthrough to grid
    const svc = new SnappingService(() => 's.pad: 4\n')
    const result = svc.snapSpacing(40, 'pad')
    expect(result.snapped).toBe(false)
    expect(result.value).toBe(40)
  })
})

describe('shouldBypassSnapping', () => {
  it('returns true on Cmd (metaKey)', () => {
    expect(shouldBypassSnapping({ metaKey: true, ctrlKey: false } as MouseEvent)).toBe(true)
  })

  it('returns true on Ctrl', () => {
    expect(shouldBypassSnapping({ metaKey: false, ctrlKey: true } as MouseEvent)).toBe(true)
  })

  it('returns false otherwise', () => {
    expect(shouldBypassSnapping({ metaKey: false, ctrlKey: false } as MouseEvent)).toBe(false)
  })
})
