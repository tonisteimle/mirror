/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { mountMirror, readStyle } from './mirror-mount'

describe('mountMirror', () => {
  it('mounts a single Frame and exposes node-1', () => {
    const m = mountMirror('Frame bg #2271C1, pad 16')
    try {
      expect(m.getNodeIds()).toContain('node-1')
      const info = m.inspect('node-1')
      expect(info).not.toBeNull()
      expect(info?.tagName).toBe('div')
    } finally {
      m.unmount()
    }
  })

  it('reads inline styles', () => {
    const m = mountMirror('Frame bg #2271C1, pad 16, rad 8')
    try {
      const el = m.byId('node-1')!
      expect(readStyle(el, 'backgroundColor')).toBe('rgb(34, 113, 193)')
      expect(readStyle(el, 'paddingTop')).toBe('16px')
      expect(readStyle(el, 'borderRadius')).toBe('8px')
    } finally {
      m.unmount()
    }
  })

  it('walks children', () => {
    const m = mountMirror('Frame gap 8\n  Text "Hello"\n  Button "OK"')
    try {
      expect(m.getNodeIds()).toEqual(['node-1', 'node-2', 'node-3'])
      const root = m.inspect('node-1')!
      expect(root.children).toEqual(['node-2', 'node-3'])
      expect(root.childInfos[0].tagName).toBe('span')
      expect(root.childInfos[1].tagName).toBe('button')
    } finally {
      m.unmount()
    }
  })

  it('captures text content', () => {
    const m = mountMirror('Text "Hallo Welt", col white')
    try {
      const info = m.inspect('node-1')
      expect(info?.textContent).toBe('Hallo Welt')
    } finally {
      m.unmount()
    }
  })

  it('exposes computed styles map', () => {
    const m = mountMirror('Frame bg #2271C1, pad 16, rad 8')
    try {
      const info = m.inspect('node-1')!
      expect(info.styles.backgroundColor).toBe('rgb(34, 113, 193)')
      expect(info.styles.paddingTop).toBe('16px')
      expect(info.styles.borderRadius).toBe('8px')
    } finally {
      m.unmount()
    }
  })

  it('exposes data attributes', () => {
    const m = mountMirror('Frame bg #2271C1')
    try {
      const info = m.inspect('node-1')!
      expect(info.dataAttributes['data-mirror-id']).toBe('node-1')
    } finally {
      m.unmount()
    }
  })
})
