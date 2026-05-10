/**
 * Mirror Actions API tests
 *
 * The studio bundle installs `window.__mirrorActions` so the demo runner
 * can skip its inline-eval'd MIRROR_ACTIONS_API string. These tests pin
 * the install contract: idempotent, exposes the legacy keys, and
 * `resolveSelector` matches the legacy resolution rules in jsdom.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  installMirrorActions,
  getMirrorActions,
  isMirrorActionsInstalled,
  type MirrorActionsAPI,
} from '../../studio/test-api/mirror-actions'

interface ActionsGlobal {
  __mirrorActions?: MirrorActionsAPI
}

const g = globalThis as ActionsGlobal

describe('MirrorActionsAPI bundled module', () => {
  beforeEach(() => {
    delete g.__mirrorActions
    document.body.innerHTML = '<div id="preview"></div>'
  })

  afterEach(() => {
    delete g.__mirrorActions
    document.body.innerHTML = ''
  })

  it('installs at window.__mirrorActions and is idempotent', () => {
    expect(getMirrorActions()).toBeNull()
    expect(isMirrorActionsInstalled()).toBe(false)
    const a = installMirrorActions()
    const b = installMirrorActions()
    expect(a).toBe(b)
    expect(g.__mirrorActions).toBe(a)
    expect(isMirrorActionsInstalled()).toBe(true)
  })

  it('exposes the legacy action keys', () => {
    const api = installMirrorActions()
    const keys = [
      'resolveSelector',
      'dropChildIndexPoint',
      'snapshotElement',
      'snapshotAllByPreviewOrder',
      'dropFromPalette',
      'drawInGrid',
      'moveElement',
      'dragResize',
      'dragPadding',
      'dragMargin',
      'inlineEdit',
      'selectInPreview',
      'setProperty',
      'pickColor',
      'aiPrompt',
      'installAiMockListener',
    ] as const
    for (const k of keys) {
      expect(typeof (api as unknown as Record<string, unknown>)[k]).toBe('function')
    }
  })

  it('resolveSelector returns the data-mirror-id for byId selectors', () => {
    const preview = document.getElementById('preview')!
    const div = document.createElement('div')
    div.setAttribute('data-mirror-id', 'node-7')
    preview.appendChild(div)
    const api = installMirrorActions()
    expect(api.resolveSelector({ byId: 'node-7' })).toBe('node-7')
  })

  it('resolveSelector throws on missing selector', () => {
    const api = installMirrorActions()
    expect(() => api.resolveSelector({ byId: 'node-missing' })).toThrow(/matched 0 elements/)
  })

  it('resolveSelector finds unique byText match', () => {
    const preview = document.getElementById('preview')!
    const a = document.createElement('span')
    a.setAttribute('data-mirror-id', 'node-1')
    a.textContent = 'Save'
    const b = document.createElement('span')
    b.setAttribute('data-mirror-id', 'node-2')
    b.textContent = 'Cancel'
    preview.appendChild(a)
    preview.appendChild(b)
    const api = installMirrorActions()
    expect(api.resolveSelector({ byText: 'Save' })).toBe('node-1')
    expect(api.resolveSelector({ byText: 'Cancel' })).toBe('node-2')
  })

  it('resolveSelector requires nth when multiple matches', () => {
    const preview = document.getElementById('preview')!
    const a = document.createElement('span')
    a.setAttribute('data-mirror-id', 'node-1')
    a.textContent = 'Item'
    const b = document.createElement('span')
    b.setAttribute('data-mirror-id', 'node-2')
    b.textContent = 'Item'
    preview.appendChild(a)
    preview.appendChild(b)
    const api = installMirrorActions()
    expect(() => api.resolveSelector({ byText: 'Item' })).toThrow(/specify nth/)
    expect(api.resolveSelector({ byText: 'Item', nth: 1 })).toBe('node-2')
  })

  it('aiPrompt rejects with the rewire-pending stub', async () => {
    const api = installMirrorActions()
    await expect(api.aiPrompt('hi')).rejects.toThrow(/pending rewire to LLM-Edit-Flow/)
  })
})
