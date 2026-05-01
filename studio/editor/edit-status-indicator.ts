/**
 * Status-Indicator für den LLM-Edit-Flow.
 *
 * Singleton DOM-Element, das oberhalb des Editors floatet und drei
 * Zustände visualisiert:
 *   - `thinking` — LLM-Call läuft (Spinner + "denkt…")
 *   - `ready`    — Diff-Ghost steht, User soll Tab/Esc drücken
 *   - `error`    — Fehler, mit Message
 *   - `idle`     — Indicator wird ausgeblendet
 *
 * Eine Custom-Message kann pro Aufruf mitgegeben werden (überschreibt
 * den Default-Text). Bei `error` ist die Message Pflicht — sie kommt
 * aus dem `EditResult.error`.
 *
 * Position wird vom Caller über CSS gesteuert; das Modul rendert nur
 * den Inhalt und appended ans `document.body`.
 *
 * Siehe: docs/concepts/llm-edit-flow.md (Status-Feedback),
 *        docs/concepts/llm-edit-flow-plan.md (T3.4)
 */

export type EditStatus = 'idle' | 'thinking' | 'ready' | 'error'

const DEFAULT_MESSAGES: Record<Exclude<EditStatus, 'idle'>, string> = {
  thinking: 'AI denkt nach…',
  ready: 'Tab akzeptieren · Esc verwerfen',
  error: 'Fehler beim Edit-Flow',
}

const STATE_CLASSES: Record<Exclude<EditStatus, 'idle'>, string> = {
  thinking: 'cm-llm-status-thinking',
  ready: 'cm-llm-status-ready',
  error: 'cm-llm-status-error',
}

let element: HTMLElement | null = null

export function setEditStatus(status: EditStatus, message?: string): void {
  if (status === 'idle') {
    hideEditStatus()
    return
  }

  if (!element) {
    element = createElement()
    document.body.appendChild(element)
  }

  // Reset state classes; apply only the active one.
  for (const cls of Object.values(STATE_CLASSES)) {
    element.classList.remove(cls)
  }
  element.classList.add(STATE_CLASSES[status])

  element.textContent = message ?? DEFAULT_MESSAGES[status]

  element.setAttribute('aria-live', status === 'error' ? 'assertive' : 'polite')
}

export function hideEditStatus(): void {
  if (!element) return
  element.remove()
  element = null
}

export function getEditStatusElement(): HTMLElement | null {
  return element
}

function createElement(): HTMLElement {
  const el = document.createElement('div')
  el.className = 'cm-llm-status'
  el.setAttribute('role', 'status')
  el.setAttribute('aria-live', 'polite')
  return el
}
