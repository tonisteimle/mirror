/**
 * Replay Recorder — browser-side capture of a real user session.
 *
 * Listens for clicks, keydowns, and editor changes on the document. Each
 * captured event becomes a `RecordedEvent` with:
 *   - timestamp (ms relative to recording start)
 *   - type (click, key, editText, editorSet)
 *   - target — a structural selector that points to the same element
 *     in the next session (byTestId > data-mirror-id > byText > byTag)
 *   - payload (key+modifiers, value, source code, …)
 *
 * The Node-side loader (`tools/test-runner/replay-loader.ts`) replays
 * the JSON dump into a Step-Runner Scenario so a recorded session
 * becomes a regression test on the next run. The two halves share the
 * `RecordedSession` shape — the wire format is the contract.
 *
 * Public API exposed at `window.__replayRecorder`:
 *   start()   — begin capturing (clears any prior recording)
 *   stop()    — halt and freeze the recording
 *   getSession() — return the snapshot for download / log
 *   isRecording() — boolean state
 *
 * Calling `start()` while already recording silently restarts. The
 * recorder is intentionally permissive — capturing too much beats
 * dropping events the test will need.
 */

// =============================================================================
// Wire-protocol types — replay-loader on the Node side imports these
// =============================================================================

export interface ReplaySelector {
  /** Preferred (most stable) — set via data-test-id on Mirror elements. */
  byTestId?: string
  /** Live mirror-id — survives within one compile, but renumbers across edits. */
  byMirrorId?: string
  /** Fallback — element's text content. nth disambiguates multi-match. */
  byText?: string
  byTextNth?: number
  /** Last-resort: tag name + nth. */
  byTag?: string
  byTagNth?: number
}

export interface RecordedEventBase {
  /** ms since recording start. */
  t: number
}

export interface RecordedClick extends RecordedEventBase {
  type: 'click'
  target: ReplaySelector
  modifiers?: { shift?: boolean; alt?: boolean; meta?: boolean; ctrl?: boolean }
}

export interface RecordedKey extends RecordedEventBase {
  type: 'key'
  key: string
  modifiers?: { shift?: boolean; alt?: boolean; meta?: boolean; ctrl?: boolean }
}

/** Editor-side full-source replacement (debounced — one event per quiet period). */
export interface RecordedEditorSet extends RecordedEventBase {
  type: 'editorSet'
  code: string
}

export type RecordedEvent = RecordedClick | RecordedKey | RecordedEditorSet

export interface RecordedSession {
  /** ISO-8601 of recording start. */
  startedAt: string
  /** Initial editor source captured at start, used as Scenario.setup. */
  initialCode: string
  events: RecordedEvent[]
}

// =============================================================================
// Selector synthesis — pick the most stable selector for an element
// =============================================================================

function buildSelector(el: HTMLElement): ReplaySelector | null {
  // 1. data-test-id is the recommended stable handle
  const testId = el.getAttribute('data-test-id')
  if (testId) return { byTestId: testId }

  // 2. data-mirror-id is stable within one compile pass and the most common
  //    way Mirror tags its preview nodes — capture so the loader can try it
  //    first, but also a fallback selector since ids renumber.
  const mid = el.getAttribute('data-mirror-id')
  const text = (el.textContent ?? '').trim()

  if (mid) {
    const sel: ReplaySelector = { byMirrorId: mid }
    if (text && text.length > 0 && text.length <= 80) {
      sel.byText = text
      // Disambiguate with nth-of-text-match.
      const all = Array.from(document.querySelectorAll('#preview [data-mirror-id]')).filter(
        e => (e.textContent ?? '').trim() === text
      )
      const idx = all.indexOf(el)
      if (idx > 0) sel.byTextNth = idx
    }
    return sel
  }

  // 3. Element is outside the preview tree (panel, toolbar). Fall back to
  //    text/tag selectors — useful for capturing sidebar/menu interactions.
  if (text && text.length > 0 && text.length <= 80) {
    return { byText: text }
  }
  return { byTag: el.tagName.toLowerCase() }
}

function modifiersFromEvent(
  e: MouseEvent | KeyboardEvent
): { shift?: boolean; alt?: boolean; meta?: boolean; ctrl?: boolean } | undefined {
  const mods: { shift?: boolean; alt?: boolean; meta?: boolean; ctrl?: boolean } = {}
  if (e.shiftKey) mods.shift = true
  if (e.altKey) mods.alt = true
  if (e.metaKey) mods.meta = true
  if (e.ctrlKey) mods.ctrl = true
  return Object.keys(mods).length > 0 ? mods : undefined
}

// =============================================================================
// Recorder state machine
// =============================================================================

interface RecorderState {
  recording: boolean
  startedAt: string | null
  startTimeMs: number
  initialCode: string
  events: RecordedEvent[]
  /** Debounce timer id for editor changes — coalesce keystrokes into one event. */
  editorDebounceId: ReturnType<typeof setTimeout> | null
  /** Last-known editor source so we can detect actual changes. */
  lastEditorCode: string
  /** Detach functions registered by start(). */
  cleanup: Array<() => void>
}

const state: RecorderState = {
  recording: false,
  startedAt: null,
  startTimeMs: 0,
  initialCode: '',
  events: [],
  editorDebounceId: null,
  lastEditorCode: '',
  cleanup: [],
}

function readEditorCode(): string {
  const w = window as unknown as { editor?: { state?: { doc?: { toString(): string } } } }
  return w.editor?.state?.doc?.toString() ?? ''
}

function elapsed(): number {
  return performance.now() - state.startTimeMs
}

function pushEditorSnapshot(): void {
  if (!state.recording) return
  const code = readEditorCode()
  if (code === state.lastEditorCode) return
  state.lastEditorCode = code
  state.events.push({ t: elapsed(), type: 'editorSet', code })
}

function onClick(e: MouseEvent): void {
  if (!state.recording) return
  const target = e.target instanceof HTMLElement ? e.target : null
  if (!target) return
  const selector = buildSelector(target)
  if (!selector) return
  const evt: RecordedClick = { t: elapsed(), type: 'click', target: selector }
  const mods = modifiersFromEvent(e)
  if (mods) evt.modifiers = mods
  state.events.push(evt)
}

function onKeyDown(e: KeyboardEvent): void {
  if (!state.recording) return
  // Skip pure modifier presses (the next non-modifier keydown carries them).
  if (e.key === 'Shift' || e.key === 'Alt' || e.key === 'Meta' || e.key === 'Control') return
  const evt: RecordedKey = { t: elapsed(), type: 'key', key: e.key }
  const mods = modifiersFromEvent(e)
  if (mods) evt.modifiers = mods
  state.events.push(evt)
  // Editor mutations show up after the keydown bubbles; debounce a snapshot.
  scheduleEditorSnapshot()
}

function scheduleEditorSnapshot(): void {
  if (state.editorDebounceId !== null) clearTimeout(state.editorDebounceId)
  state.editorDebounceId = setTimeout(() => {
    state.editorDebounceId = null
    pushEditorSnapshot()
  }, 120)
}

// =============================================================================
// Public API
// =============================================================================

export interface ReplayRecorderAPI {
  start(): void
  stop(): RecordedSession | null
  getSession(): RecordedSession | null
  isRecording(): boolean
  /** Discard any pending recording without producing a session. */
  reset(): void
}

export const replayRecorder: ReplayRecorderAPI = {
  start(): void {
    if (state.recording) {
      // Restart-on-start is intentional — caller meant to begin a fresh
      // recording, not append to a stale one.
      replayRecorder.stop()
    }
    state.events = []
    state.startedAt = new Date().toISOString()
    state.startTimeMs = performance.now()
    state.initialCode = readEditorCode()
    state.lastEditorCode = state.initialCode
    state.recording = true

    const click = (e: Event): void => onClick(e as MouseEvent)
    const keydown = (e: Event): void => onKeyDown(e as KeyboardEvent)
    document.addEventListener('click', click, true)
    document.addEventListener('keydown', keydown, true)
    state.cleanup = [
      () => document.removeEventListener('click', click, true),
      () => document.removeEventListener('keydown', keydown, true),
    ]
  },

  stop(): RecordedSession | null {
    if (!state.recording) return null
    // Flush BEFORE flipping recording=false — pushEditorSnapshot's recording
    // guard would otherwise drop a final snapshot from the last debounce window.
    if (state.editorDebounceId !== null) {
      clearTimeout(state.editorDebounceId)
      state.editorDebounceId = null
    }
    pushEditorSnapshot()
    state.recording = false
    for (const fn of state.cleanup) {
      try {
        fn()
      } catch {
        /* detach is best-effort */
      }
    }
    state.cleanup = []

    return replayRecorder.getSession()
  },

  getSession(): RecordedSession | null {
    if (!state.startedAt) return null
    return {
      startedAt: state.startedAt,
      initialCode: state.initialCode,
      events: [...state.events],
    }
  },

  isRecording(): boolean {
    return state.recording
  },

  reset(): void {
    if (state.recording) replayRecorder.stop()
    state.startedAt = null
    state.events = []
    state.initialCode = ''
    state.lastEditorCode = ''
  },
}

/** Install at `window.__replayRecorder` for in-DevTools / runner access. */
export function installReplayRecorder(): void {
  ;(window as unknown as { __replayRecorder?: ReplayRecorderAPI }).__replayRecorder = replayRecorder
}
