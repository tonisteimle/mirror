/**
 * Replay loader tests
 *
 * Verifies the Node-side translation:
 *   - selector preference order maps correctly
 *   - keys that mutate the editor are filtered out
 *   - shortcut keys (Cmd+Z, Escape) survive
 *   - first editorSet equal to initialCode is dropped
 */

import { describe, it, expect } from 'vitest'
import {
  sessionToScenario,
  translateSelector,
  type RecordedSession,
} from '../../tools/test-runner/replay-loader'

describe('translateSelector', () => {
  it('prefers byTestId over everything', () => {
    expect(translateSelector({ byTestId: 'a', byText: 'b', byMirrorId: 'n-1' })).toEqual({
      byTestId: 'a',
    })
  })

  it('falls back to byText with optional nth', () => {
    expect(translateSelector({ byText: 'Save' })).toEqual({ byText: 'Save' })
    expect(translateSelector({ byText: 'Save', byTextNth: 2 })).toEqual({ byText: 'Save', nth: 2 })
  })

  it('falls back to byMirrorId as byId', () => {
    expect(translateSelector({ byMirrorId: 'node-7' })).toEqual({ byId: 'node-7' })
  })

  it('falls back to byTag with optional nth', () => {
    expect(translateSelector({ byTag: 'button' })).toEqual({ byTag: 'button' })
    expect(translateSelector({ byTag: 'div', byTagNth: 3 })).toEqual({ byTag: 'div', nth: 3 })
  })

  it('throws when no recognised handle is set', () => {
    expect(() => translateSelector({})).toThrow(/no recognised handle/)
  })
})

describe('sessionToScenario', () => {
  it('translates clicks via the most stable selector', () => {
    const session: RecordedSession = {
      startedAt: '2026-01-01T00:00:00Z',
      initialCode: '',
      events: [{ type: 'click', t: 0, target: { byTestId: 'btn', byMirrorId: 'node-1' } }],
    }
    const scenario = sessionToScenario(session, 'test')
    expect(scenario.steps).toEqual([{ do: 'click', nodeId: { byTestId: 'btn' } }])
  })

  it('drops printable single-character keys (editor-mutating)', () => {
    const session: RecordedSession = {
      startedAt: 't',
      initialCode: '',
      events: [
        { type: 'key', t: 0, key: 'a' },
        { type: 'key', t: 1, key: 'b' },
        { type: 'editorSet', t: 2, code: 'ab' },
      ],
    }
    const scenario = sessionToScenario(session, 'test')
    expect(scenario.steps).toEqual([{ do: 'editorSet', code: 'ab' }])
  })

  it('keeps Cmd-modified keys (shortcuts)', () => {
    const session: RecordedSession = {
      startedAt: 't',
      initialCode: '',
      events: [{ type: 'key', t: 0, key: 'z', modifiers: { meta: true } }],
    }
    const scenario = sessionToScenario(session, 'test')
    expect(scenario.steps).toEqual([{ do: 'pressKey', key: 'z', meta: true }])
  })

  it('keeps named non-mutating keys', () => {
    const session: RecordedSession = {
      startedAt: 't',
      initialCode: '',
      events: [
        { type: 'key', t: 0, key: 'Escape' },
        { type: 'key', t: 1, key: 'ArrowDown' },
        { type: 'key', t: 2, key: 'F2' },
      ],
    }
    const scenario = sessionToScenario(session, 'test')
    expect(scenario.steps).toEqual([
      { do: 'pressKey', key: 'Escape' },
      { do: 'pressKey', key: 'ArrowDown' },
      { do: 'pressKey', key: 'F2' },
    ])
  })

  it('drops Backspace / Delete / Enter (editor-mutating named keys)', () => {
    const session: RecordedSession = {
      startedAt: 't',
      initialCode: '',
      events: [
        { type: 'key', t: 0, key: 'Backspace' },
        { type: 'key', t: 1, key: 'Delete' },
        { type: 'key', t: 2, key: 'Enter' },
        { type: 'editorSet', t: 3, code: 'after' },
      ],
    }
    const scenario = sessionToScenario(session, 'test')
    expect(scenario.steps).toEqual([{ do: 'editorSet', code: 'after' }])
  })

  it('drops the leading editorSet when it equals initialCode', () => {
    const session: RecordedSession = {
      startedAt: 't',
      initialCode: 'X',
      events: [
        { type: 'editorSet', t: 0, code: 'X' },
        { type: 'editorSet', t: 1, code: 'XY' },
      ],
    }
    const scenario = sessionToScenario(session, 'test')
    expect(scenario.steps).toEqual([{ do: 'editorSet', code: 'XY' }])
  })

  it('preserves an editorSet equal to initial code if not the leading event', () => {
    // Round-trip case: user types XY then deletes back to X; X should be replayed.
    const session: RecordedSession = {
      startedAt: 't',
      initialCode: 'X',
      events: [
        { type: 'editorSet', t: 0, code: 'XY' },
        { type: 'editorSet', t: 1, code: 'X' },
      ],
    }
    const scenario = sessionToScenario(session, 'test')
    expect(scenario.steps).toEqual([
      { do: 'editorSet', code: 'XY' },
      { do: 'editorSet', code: 'X' },
    ])
  })

  it('uses the recorded initialCode as setup', () => {
    const session: RecordedSession = {
      startedAt: 't',
      initialCode: 'Frame\n  Text "hi"',
      events: [],
    }
    const scenario = sessionToScenario(session, 'replay test')
    expect(scenario.setup).toBe('Frame\n  Text "hi"')
    expect(scenario.name).toBe('replay test')
  })
})
