/**
 * Status-Indicator für den LLM-Edit-Flow.
 *
 * Singleton DOM-Element, das oberhalb des Editors floatet und den
 * aktuellen Zustand des LLM-Calls visualisiert:
 *   - `thinking` — LLM-Call läuft (Spinner + "denkt…" + elapsed-counter)
 *   - `ready`    — Diff-Ghost steht, User soll Tab/Esc drücken
 *   - `error`    — Fehler, mit Message
 *   - `warning`  — Quality-Issues nach Edit, oder Validator-Warnung nach Pipeline
 *   - `idle`     — Indicator wird ausgeblendet
 *
 * Während `thinking` tickt eine Sekunden-Anzeige neben der Message
 * (z.B. "AI denkt nach… (8s)"). Damit weiss der User, ob das Modell
 * gerade 2 Sekunden oder 30 braucht — ein wichtiger mentaler Anker.
 *
 * Eine Custom-Message kann pro Aufruf mitgegeben werden (überschreibt
 * den Default-Text). Bei `error` ist die Message Pflicht — sie kommt
 * aus dem `EditResult.error`.
 *
 * Position wird vom Caller über CSS gesteuert; das Modul rendert nur
 * den Inhalt und appended ans `document.body`.
 *
 * Siehe: docs/archive/concepts/llm-edit-flow.md (Status-Feedback),
 *        docs/archive/concepts/llm-edit-flow-plan.md (T3.4)
 */

export type EditStatus = 'idle' | 'thinking' | 'ready' | 'error' | 'warning'

const DEFAULT_MESSAGES: Record<Exclude<EditStatus, 'idle'>, string> = {
  thinking: 'AI denkt nach…',
  ready: 'Tab akzeptieren · Esc verwerfen',
  error: 'Fehler beim Edit-Flow',
  warning: 'Quality-Issues — vom AI nicht behoben',
}

const STATE_CLASSES: Record<Exclude<EditStatus, 'idle'>, string> = {
  thinking: 'cm-llm-status-thinking',
  ready: 'cm-llm-status-ready',
  error: 'cm-llm-status-error',
  warning: 'cm-llm-status-warning',
}

let element: HTMLElement | null = null
let messageEl: HTMLSpanElement | null = null
let elapsedEl: HTMLSpanElement | null = null
let elapsedTimer: ReturnType<typeof setInterval> | null = null
let elapsedStart: number | null = null
let currentStatus: EditStatus = 'idle'

export function setEditStatus(status: EditStatus, message?: string): void {
  if (status === 'idle') {
    hideEditStatus()
    return
  }

  if (!element) {
    element = createElement()
    document.body.appendChild(element)
    messageEl = element.querySelector('.cm-llm-status-message') as HTMLSpanElement
    elapsedEl = element.querySelector('.cm-llm-status-elapsed') as HTMLSpanElement
  }

  // Reset state classes; apply only the active one.
  for (const cls of Object.values(STATE_CLASSES)) {
    element.classList.remove(cls)
  }
  element.classList.add(STATE_CLASSES[status])

  if (messageEl) messageEl.textContent = message ?? DEFAULT_MESSAGES[status]

  element.setAttribute('aria-live', status === 'error' ? 'assertive' : 'polite')

  // Elapsed-counter is only shown while we're actively waiting on the LLM.
  // Entering `thinking` (re)starts the counter; any other state resets it.
  // Status transitions WITHIN thinking (phase updates) keep the counter
  // ticking — caller can change the message but not lose the elapsed time.
  const wasThinking = currentStatus === 'thinking'
  currentStatus = status

  if (status === 'thinking') {
    if (!wasThinking) startElapsedCounter()
    // else: keep ticking — only the message changed
    if (elapsedEl) elapsedEl.style.display = ''
  } else {
    stopElapsedCounter()
    if (elapsedEl) {
      elapsedEl.textContent = ''
      elapsedEl.style.display = 'none'
    }
  }
}

export function hideEditStatus(): void {
  stopElapsedCounter()
  currentStatus = 'idle'
  if (!element) return
  element.remove()
  element = null
  messageEl = null
  elapsedEl = null
}

export function getEditStatusElement(): HTMLElement | null {
  return element
}

/**
 * Test-only: read the current elapsed-seconds value as it would be
 * rendered. Returns null when the counter isn't running.
 */
export function getEditStatusElapsedSeconds(): number | null {
  if (elapsedStart === null) return null
  return Math.floor((Date.now() - elapsedStart) / 1000)
}

function startElapsedCounter(): void {
  stopElapsedCounter()
  elapsedStart = Date.now()
  renderElapsed()
  elapsedTimer = setInterval(renderElapsed, 1000)
}

function stopElapsedCounter(): void {
  if (elapsedTimer !== null) {
    clearInterval(elapsedTimer)
    elapsedTimer = null
  }
  elapsedStart = null
}

function renderElapsed(): void {
  if (!elapsedEl || elapsedStart === null) return
  const seconds = Math.floor((Date.now() - elapsedStart) / 1000)
  // Only show the counter from the second tick onwards. A "0s" flicker
  // for sub-1s calls would be more noise than information.
  elapsedEl.textContent = seconds >= 1 ? ` (${seconds}s)` : ''
}

function createElement(): HTMLElement {
  const el = document.createElement('div')
  el.className = 'cm-llm-status'
  el.setAttribute('role', 'status')
  el.setAttribute('aria-live', 'polite')

  const message = document.createElement('span')
  message.className = 'cm-llm-status-message'
  el.appendChild(message)

  const elapsed = document.createElement('span')
  elapsed.className = 'cm-llm-status-elapsed'
  elapsed.style.display = 'none'
  el.appendChild(elapsed)

  return el
}
