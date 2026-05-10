/**
 * Replay recorder tests
 *
 * Verifies the browser-side capture:
 *   - selector synthesis prefers data-test-id > data-mirror-id > byText > byTag
 *   - clicks/keys are captured with modifiers
 *   - editor changes are debounced into one editorSet event
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { replayRecorder } from '../../studio/test-api/replay-recorder'

interface EditorGlobal {
  editor?: { state: { doc: { toString(): string } } }
}
const w = window as unknown as EditorGlobal

function setEditor(code: string): void {
  w.editor = { state: { doc: { toString: () => code } } }
}

function dispatchClick(
  target: Element,
  modifiers: { shiftKey?: boolean; metaKey?: boolean } = {}
): void {
  const evt = new MouseEvent('click', { bubbles: true, cancelable: true, ...modifiers })
  target.dispatchEvent(evt)
}

function dispatchKey(key: string, modifiers: { shiftKey?: boolean; metaKey?: boolean } = {}): void {
  const evt = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers })
  document.dispatchEvent(evt)
}

describe('replayRecorder', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setEditor('start')
    replayRecorder.reset()
  })

  afterEach(() => {
    replayRecorder.reset()
    delete w.editor
  })

  it('captures the initial editor source as setup', () => {
    setEditor('Hello\nWorld')
    replayRecorder.start()
    const session = replayRecorder.stop()
    expect(session?.initialCode).toBe('Hello\nWorld')
  })

  it('records clicks with byMirrorId selector when present', () => {
    document.body.innerHTML =
      '<div id="preview"><button data-mirror-id="node-1">Save</button></div>'
    replayRecorder.start()
    const btn = document.querySelector('[data-mirror-id="node-1"]')!
    dispatchClick(btn)
    const session = replayRecorder.stop()
    expect(session?.events).toHaveLength(1)
    const evt = session!.events[0]
    expect(evt.type).toBe('click')
    if (evt.type !== 'click') return
    expect(evt.target.byMirrorId).toBe('node-1')
    expect(evt.target.byText).toBe('Save')
  })

  it('prefers byTestId when set', () => {
    document.body.innerHTML =
      '<div id="preview"><button data-mirror-id="node-1" data-test-id="primary">X</button></div>'
    replayRecorder.start()
    dispatchClick(document.querySelector('[data-test-id="primary"]')!)
    const session = replayRecorder.stop()
    const evt = session!.events[0]
    if (evt.type !== 'click') throw new Error('expected click')
    expect(evt.target.byTestId).toBe('primary')
    expect(evt.target.byMirrorId).toBeUndefined()
  })

  it('captures click modifiers', () => {
    document.body.innerHTML = '<div id="preview"><button data-mirror-id="n">X</button></div>'
    replayRecorder.start()
    dispatchClick(document.querySelector('[data-mirror-id="n"]')!, { shiftKey: true })
    const session = replayRecorder.stop()
    const evt = session!.events[0]
    if (evt.type !== 'click') throw new Error('expected click')
    expect(evt.modifiers).toEqual({ shift: true })
  })

  it('skips pure modifier keypresses', () => {
    replayRecorder.start()
    dispatchKey('Shift', { shiftKey: true })
    dispatchKey('Meta', { metaKey: true })
    const session = replayRecorder.stop()
    const keys = session?.events.filter(e => e.type === 'key') ?? []
    expect(keys).toHaveLength(0)
  })

  it('records non-modifier keys with their modifier state', () => {
    replayRecorder.start()
    dispatchKey('Escape')
    dispatchKey('z', { metaKey: true })
    const session = replayRecorder.stop()
    const keys = session!.events.filter(e => e.type === 'key')
    expect(keys).toHaveLength(2)
    if (keys[0].type !== 'key') throw new Error('expected key')
    expect(keys[0].key).toBe('Escape')
    if (keys[1].type !== 'key') throw new Error('expected key')
    expect(keys[1].key).toBe('z')
    expect(keys[1].modifiers).toEqual({ meta: true })
  })

  it('isRecording reflects state machine', () => {
    expect(replayRecorder.isRecording()).toBe(false)
    replayRecorder.start()
    expect(replayRecorder.isRecording()).toBe(true)
    replayRecorder.stop()
    expect(replayRecorder.isRecording()).toBe(false)
  })

  it('start while recording resets the session', () => {
    replayRecorder.start()
    document.body.innerHTML = '<div id="preview"><button data-mirror-id="a">A</button></div>'
    dispatchClick(document.querySelector('[data-mirror-id="a"]')!)
    setEditor('SECOND')
    replayRecorder.start()
    const session = replayRecorder.stop()
    expect(session?.events).toHaveLength(0)
    expect(session?.initialCode).toBe('SECOND')
  })

  it('stop returns null when never started', () => {
    expect(replayRecorder.stop()).toBe(null)
  })

  it('flushes a final editor snapshot at stop', async () => {
    setEditor('A')
    replayRecorder.start()
    setEditor('AB')
    dispatchKey('B')
    // Stop before debounce fires; pushEditorSnapshot in stop() flushes.
    const session = replayRecorder.stop()
    const editorSets = session!.events.filter(e => e.type === 'editorSet')
    expect(editorSets).toHaveLength(1)
    if (editorSets[0].type !== 'editorSet') throw new Error('expected editorSet')
    expect(editorSets[0].code).toBe('AB')
  })
})
