/**
 * Inline-Floating-Widget für Mode-3 (Cmd+Shift+Enter).
 *
 * Erscheint am Cursor, fragt eine User-Anweisung ab, schliesst sich nach
 * Enter (Submit) oder Esc (Cancel). Ein Widget ist global aktiv (Singleton);
 * ein zweites `openPromptField()` ersetzt das alte.
 *
 * Position: relativ zur Cursor-Koordinate via `view.coordsAtPos(head)`.
 * Das Widget wird absolut positioniert in `document.body`, damit es nicht
 * vom Editor-Overflow geclipped wird.
 *
 * Siehe: docs/concepts/llm-edit-flow.md (Modus 3),
 *        docs/concepts/llm-edit-flow-plan.md (T3.3)
 */

import type { EditorView } from '@codemirror/view'

export interface PromptFieldOptions {
  /** Called with the trimmed text when the user presses Enter. */
  onSubmit: (text: string) => void
  /** Called when the user presses Esc or `close()` is invoked. */
  onCancel: () => void
  /** Optional initial value for the input. */
  initialValue?: string
  /** Optional placeholder text. */
  placeholder?: string
}

export interface PromptFieldHandle {
  /** The widget's root DOM element. */
  element: HTMLElement
  /** Close the widget (calls onCancel). Idempotent. */
  close: () => void
}

let activeHandle: PromptFieldHandle | null = null

export function openPromptField(view: EditorView, options: PromptFieldOptions): PromptFieldHandle {
  // Replace any existing widget — only one can be active at a time.
  if (activeHandle) {
    activeHandle.close()
  }

  const wrapper = document.createElement('div')
  wrapper.className = 'cm-llm-prompt-field'
  wrapper.setAttribute('role', 'dialog')
  wrapper.setAttribute('aria-modal', 'true')

  const input = document.createElement('input')
  input.type = 'text'
  input.className = 'cm-llm-prompt-input'
  input.setAttribute('aria-label', 'Prompt für AI-Edit')
  input.placeholder =
    options.placeholder ?? 'Was soll geändert werden? (Enter zum Senden, Esc zum Abbrechen)'
  if (options.initialValue) input.value = options.initialValue
  wrapper.appendChild(input)

  positionAtCursor(wrapper, view)
  document.body.appendChild(wrapper)

  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    input.removeEventListener('keydown', onKeyDown)
    wrapper.remove()
    activeHandle = null
    options.onCancel()
  }

  const submit = () => {
    if (closed) return
    const text = input.value.trim()
    if (text === '') return
    closed = true
    input.removeEventListener('keydown', onKeyDown)
    wrapper.remove()
    activeHandle = null
    options.onSubmit(text)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }
  input.addEventListener('keydown', onKeyDown)

  // Auto-focus on next microtask so DOM is fully attached.
  queueMicrotask(() => input.focus())
  // jsdom doesn't always honor microtask focus reliably in tests; do it eagerly too.
  input.focus()

  const handle: PromptFieldHandle = {
    element: wrapper,
    close,
  }
  activeHandle = handle
  return handle
}

export function closePromptField(): void {
  activeHandle?.close()
}

export function isPromptFieldOpen(): boolean {
  return activeHandle !== null
}

function positionAtCursor(wrapper: HTMLElement, view: EditorView): void {
  wrapper.style.position = 'absolute'
  wrapper.style.zIndex = '10000'

  // jsdom doesn't fully implement getClientRects; coordsAtPos can throw
  // there. Real browsers reach the happy path. The fallback below is good
  // enough for unit tests that don't care about exact pixels.
  let coords: { left: number; bottom: number } | null
  try {
    const head = view.state.selection.main.head
    coords = view.coordsAtPos(head)
  } catch {
    coords = null
  }

  if (coords) {
    wrapper.style.left = `${coords.left}px`
    // Place below the cursor line; `bottom` is the y of the line bottom.
    wrapper.style.top = `${coords.bottom + 4}px`
  } else {
    // Fallback: center over the editor.
    const rect = view.dom.getBoundingClientRect()
    wrapper.style.left = `${rect.left + rect.width / 2 - 150}px`
    wrapper.style.top = `${rect.top + 40}px`
  }
}
