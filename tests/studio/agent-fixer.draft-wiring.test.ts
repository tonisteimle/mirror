/**
 * Draft-Mode Production Wiring Test
 *
 * Mirrors the bootstrap.ts wiring: subscribe to `draft:submit`, call
 * `fixer.generateDraftCode`, emit `draft:ai-response`. This is the loop
 * the DraftModeManager waits on in production. Without this listener,
 * the editor's `??` trigger times out after 60s.
 *
 * If this test breaks, the live `??` feature is broken.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { createMockTauriBridge, MockTauriBridge } from '../helpers/mock-tauri-bridge'
import { createFixer, FixerService } from '../../studio/agent/fixer'
import { events } from '../../studio/core/events'
import type { DraftSubmitEvent } from '../../studio/editor/draft-mode'

function makeDraftEvent(partial: Partial<DraftSubmitEvent> = {}): DraftSubmitEvent {
  return {
    prompt: 'add a button',
    startLine: 2,
    endLine: 3,
    indent: 0,
    content: '',
    fullSource: 'Frame\n??\n??',
    abortController: new AbortController(),
    ...partial,
  }
}

function setupFixer(): { fixer: FixerService; bridge: MockTauriBridge; cleanup: () => void } {
  const bridge = createMockTauriBridge({ useRealCli: false, responseDelay: 5 })
  ;(globalThis as any).window = (globalThis as any).window || {}
  ;(globalThis as any).window.TauriBridge = bridge

  const files = { 'app.mir': 'Frame' }
  const fixer = createFixer({
    getFiles: () => Object.entries(files).map(([name, code]) => ({ name, type: 'layout', code })),
    getCurrentFile: () => 'app.mir',
    getEditorContent: () => files['app.mir'],
    getCursor: () => ({ line: 1, column: 1, offset: 0 }),
    getSelection: () => null,
    getFileContent: f => files[f as keyof typeof files] ?? null,
    saveFile: async (f, c) => {
      ;(files as any)[f] = c
    },
    createFile: async (f, c) => {
      ;(files as any)[f] = c
    },
    updateEditor: c => {
      files['app.mir'] = c
    },
    refreshFileTree: () => {},
  })

  return {
    fixer,
    bridge,
    cleanup: () => {
      delete (globalThis as any).window.TauriBridge
    },
  }
}

/**
 * Replicates the bootstrap.ts listener verbatim. If you change the
 * production wiring in bootstrap.ts, update this helper too.
 */
function installProductionWiring(fixer: FixerService): () => void {
  return events.on('draft:submit', async event => {
    try {
      const code = await fixer.generateDraftCode(event.prompt, event.content, event.fullSource)
      events.emit('draft:ai-response', { code })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter AI-Fehler'
      events.emit('draft:ai-response', { code: '', error: message })
    }
  })
}

function waitForResponse(timeoutMs = 1000): Promise<{ code: string; error?: string }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe()
      reject(new Error('draft:ai-response timeout'))
    }, timeoutMs)
    const unsubscribe = events.once('draft:ai-response', payload => {
      clearTimeout(timeout)
      resolve(payload)
    })
  })
}

describe('Draft-Mode Production Wiring (bootstrap parity)', () => {
  let fixer: FixerService
  let bridge: MockTauriBridge
  let cleanup: () => void
  let unsubscribeWiring: () => void

  beforeEach(() => {
    ;({ fixer, bridge, cleanup } = setupFixer())
    unsubscribeWiring = installProductionWiring(fixer)
  })

  afterEach(() => {
    unsubscribeWiring()
    cleanup()
  })

  test('happy path: draft:submit → fixer → draft:ai-response with code', async () => {
    bridge.setMockRawOutput('```mirror\nButton "Speichern", bg #2271C1\n```')

    const responsePromise = waitForResponse()
    events.emit('draft:submit', makeDraftEvent({ prompt: 'speichern button' }))
    const response = await responsePromise

    expect(response.error).toBeUndefined()
    expect(response.code).toBe('Button "Speichern", bg #2271C1')
  })

  test('error path: AI failure surfaces as error in draft:ai-response (not silent timeout)', async () => {
    bridge.setMockError('rate limit exceeded')

    const responsePromise = waitForResponse()
    events.emit('draft:submit', makeDraftEvent())
    const response = await responsePromise

    expect(response.code).toBe('')
    expect(response.error).toMatch(/rate limit/)
  })

  test('error path: prose response (no code block) surfaces as error', async () => {
    bridge.setMockRawOutput('Sorry, I cannot do that.')

    const responsePromise = waitForResponse()
    events.emit('draft:submit', makeDraftEvent())
    const response = await responsePromise

    expect(response.code).toBe('')
    expect(response.error).toMatch(/Keine Code-Antwort/)
  })

  test('multi-line code generation preserves newlines', async () => {
    bridge.setMockRawOutput(
      '```mirror\nFrame hor, gap 12\n  Button "A"\n  Button "B"\n  Button "C"\n```'
    )

    const responsePromise = waitForResponse()
    events.emit('draft:submit', makeDraftEvent({ prompt: 'three buttons' }))
    const response = await responsePromise

    expect(response.code.split('\n')).toEqual([
      'Frame hor, gap 12',
      '  Button "A"',
      '  Button "B"',
      '  Button "C"',
    ])
  })

  test('empty draft block (pure generation) still flows through', async () => {
    bridge.setMockRawOutput('```mirror\nText "Generated"\n```')

    const responsePromise = waitForResponse()
    events.emit('draft:submit', makeDraftEvent({ prompt: 'generate something', content: '' }))
    const response = await responsePromise

    expect(response.code).toBe('Text "Generated"')
  })

  test('draft block with existing content (correction) flows through', async () => {
    bridge.setMockRawOutput('```mirror\nButton "Fixed", bg #2271C1\n```')

    const responsePromise = waitForResponse()
    events.emit(
      'draft:submit',
      makeDraftEvent({
        prompt: null, // no explicit prompt — just fix the code
        content: 'Btn bg blue',
        fullSource: 'Frame\n??\nBtn bg blue\n??',
      })
    )
    const response = await responsePromise

    expect(response.code).toBe('Button "Fixed", bg #2271C1')
  })
})
