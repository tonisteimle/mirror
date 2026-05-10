/**
 * Replay Loader — turn a recorded user session into a Step-Runner Scenario.
 *
 * The browser-side `replayRecorder` (studio/test-api/replay-recorder.ts)
 * captures clicks, keydowns, and editor snapshots into a `RecordedSession`
 * JSON dump. This loader reads that dump and produces a Scenario the
 * Step-Runner can execute on the next test run.
 *
 * Translation rules:
 *   click  → `{ do: 'click', nodeId: <Selector> }` using the most stable
 *            handle the recorder captured (byTestId > byMirrorId > byText > byTag)
 *   key    → `{ do: 'pressKey', key, …modifiers }` for non-printable keys.
 *            Plain printable typing arrives as an editorSet snapshot — the
 *            recorder elides redundant per-character `key` events that just
 *            mutated the editor (the editorSet covers the result).
 *   editorSet → `{ do: 'editorSet', code }`
 *
 * Because the Step-Runner's Selector union accepts any of the recorder's
 * captured handles, no further translation is needed — the recorded
 * selector goes in verbatim.
 */

import * as fs from 'fs'

// Mirror of studio/test-api/replay-recorder.ts wire types. Kept inlined
// rather than imported to keep the Node-side loader free of browser type
// dependencies.
export interface ReplaySelector {
  byTestId?: string
  byMirrorId?: string
  byText?: string
  byTextNth?: number
  byTag?: string
  byTagNth?: number
}

export interface RecordedClick {
  type: 'click'
  t: number
  target: ReplaySelector
  modifiers?: { shift?: boolean; alt?: boolean; meta?: boolean; ctrl?: boolean }
}

export interface RecordedKey {
  type: 'key'
  t: number
  key: string
  modifiers?: { shift?: boolean; alt?: boolean; meta?: boolean; ctrl?: boolean }
}

export interface RecordedEditorSet {
  type: 'editorSet'
  t: number
  code: string
}

export type RecordedEvent = RecordedClick | RecordedKey | RecordedEditorSet

export interface RecordedSession {
  startedAt: string
  initialCode: string
  events: RecordedEvent[]
}

// =============================================================================
// Public Step-Runner shape — mirror of studio/test-api/step-runner/types.ts
// (re-declared so this module has zero browser deps).
// =============================================================================

export type StepRunnerSelector =
  | string
  | { byId: string }
  | { byText: string | RegExp; nth?: number }
  | { byTag: string; nth?: number }
  | { byTestId: string }

export type ReplayStep =
  | { do: 'click'; nodeId: StepRunnerSelector }
  | { do: 'pressKey'; key: string; shift?: boolean; alt?: boolean; meta?: boolean; ctrl?: boolean }
  | { do: 'editorSet'; code: string }

export interface ReplayScenario {
  name: string
  setup: string
  steps: ReplayStep[]
}

// =============================================================================
// Selector translation
// =============================================================================

/**
 * Translate a recorded selector to the most stable Step-Runner form.
 * Preference order matches the recorder's:
 *   byTestId  — explicit, set by the developer for stable handles
 *   byText    — user-visible content; survives renumbering
 *   byMirrorId — last-resort because ids renumber across IR rebuilds
 *   byTag     — coarsest fallback
 */
export function translateSelector(sel: ReplaySelector): StepRunnerSelector {
  if (sel.byTestId !== undefined) return { byTestId: sel.byTestId }
  if (sel.byText !== undefined) {
    const out: { byText: string; nth?: number } = { byText: sel.byText }
    if (sel.byTextNth !== undefined) out.nth = sel.byTextNth
    return out
  }
  if (sel.byMirrorId !== undefined) return { byId: sel.byMirrorId }
  if (sel.byTag !== undefined) {
    const out: { byTag: string; nth?: number } = { byTag: sel.byTag }
    if (sel.byTagNth !== undefined) out.nth = sel.byTagNth
    return out
  }
  // Recorder always sets at least byTag — but stay defensive.
  throw new Error(`Replay selector has no recognised handle: ${JSON.stringify(sel)}`)
}

// =============================================================================
// Event filtering — drop redundant per-character key events
// =============================================================================

/**
 * Some keys mutate the editor (printable letters, Backspace, Enter inside
 * the editor). Those mutations are captured by the next editorSet snapshot,
 * so the per-character `key` event is redundant — replaying it would
 * produce the wrong cursor position. Keep keys that don't mutate the
 * editor (Escape, F2, Cmd+Z, arrows, …) so shortcuts still fire.
 */
function shouldKeepKey(evt: RecordedKey): boolean {
  // Modified shortcuts (Cmd+S, Ctrl+Z) always replay.
  if (evt.modifiers?.meta || evt.modifiers?.ctrl) return true
  // Single printable characters → editor mutation handles it via editorSet.
  if (evt.key.length === 1) return false
  // Editor-mutating named keys → editorSet handles it.
  if (evt.key === 'Backspace' || evt.key === 'Delete' || evt.key === 'Enter') return false
  // Everything else (Escape, ArrowDown, F2, Tab, …) plays back.
  return true
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Translate a recorded session into a Scenario shape compatible with the
 * Step-Runner. Caller is responsible for choosing a `name` that explains
 * the scenario in test-suite output.
 */
export function sessionToScenario(session: RecordedSession, name: string): ReplayScenario {
  const steps: ReplayStep[] = []

  for (const evt of session.events) {
    if (evt.type === 'click') {
      steps.push({ do: 'click', nodeId: translateSelector(evt.target) })
      continue
    }
    if (evt.type === 'editorSet') {
      // Skip the very first editorSet if it equals the initial setup code —
      // Scenario.setup already covers it.
      if (steps.length === 0 && evt.code === session.initialCode) continue
      steps.push({ do: 'editorSet', code: evt.code })
      continue
    }
    if (evt.type === 'key') {
      if (!shouldKeepKey(evt)) continue
      const step: ReplayStep = { do: 'pressKey', key: evt.key }
      if (evt.modifiers?.shift) step.shift = true
      if (evt.modifiers?.alt) step.alt = true
      if (evt.modifiers?.meta) step.meta = true
      if (evt.modifiers?.ctrl) step.ctrl = true
      steps.push(step)
    }
  }

  return { name, setup: session.initialCode, steps }
}

/** Read a JSON session dump from disk and return the raw shape. */
export function loadSession(path: string): RecordedSession {
  const raw = fs.readFileSync(path, 'utf8')
  const data = JSON.parse(raw) as Partial<RecordedSession>
  if (typeof data.startedAt !== 'string' || !Array.isArray(data.events)) {
    throw new Error(`Replay file at ${path} is not a valid RecordedSession`)
  }
  return data as RecordedSession
}

/** Read a session and translate to a Scenario in one go. */
export function scenarioFromFile(path: string, name?: string): ReplayScenario {
  const session = loadSession(path)
  const scenarioName = name ?? `Replay: ${session.startedAt}`
  return sessionToScenario(session, scenarioName)
}
