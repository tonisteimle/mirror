/**
 * Tests for studio/editor/prompt-field.ts
 *
 * Inline-Floating-Widget für Mode-3 (Cmd+Shift+Enter mit User-Instruction).
 * Tests laufen in jsdom; visuelle Position-Verifikation erfolgt in T3.5
 * manuell im running Studio.
 *
 * Siehe: docs/archive/concepts/llm-edit-flow-test-concept.md § 3.1 (prompt-field)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import {
  openPromptField,
  isPromptFieldOpen,
  closePromptField,
  type PromptFieldHandle,
} from '../../studio/editor/prompt-field'

let view: EditorView
let parent: HTMLElement

beforeEach(() => {
  // Clean up any leftover widgets from previous tests.
  document.body.innerHTML = ''
  parent = document.createElement('div')
  document.body.appendChild(parent)
  const state = EditorState.create({ doc: 'Frame gap 12\n  Text "Hello"' })
  view = new EditorView({ state, parent })
})

function lastWidget(): HTMLElement | null {
  return document.querySelector('.cm-llm-prompt-field')
}

describe('PromptField — open / close lifecycle', () => {
  it('returns a handle when opened', () => {
    const handle = openPromptField(view, { onSubmit: () => {}, onCancel: () => {} })
    expect(handle).toBeTruthy()
    expect(isPromptFieldOpen()).toBe(true)
  })

  it('renders the widget in the DOM under the editor parent', () => {
    openPromptField(view, { onSubmit: () => {}, onCancel: () => {} })
    expect(lastWidget()).not.toBeNull()
  })

  it('contains an <input> element with auto-focus', () => {
    openPromptField(view, { onSubmit: () => {}, onCancel: () => {} })
    const input = lastWidget()?.querySelector('input')
    expect(input).not.toBeNull()
    expect(document.activeElement).toBe(input)
  })

  it('closes via the returned handle', () => {
    const handle = openPromptField(view, { onSubmit: () => {}, onCancel: () => {} })
    handle.close()
    expect(isPromptFieldOpen()).toBe(false)
    expect(lastWidget()).toBeNull()
  })

  it('closes via closePromptField()', () => {
    openPromptField(view, { onSubmit: () => {}, onCancel: () => {} })
    closePromptField()
    expect(isPromptFieldOpen()).toBe(false)
  })

  it('replaces the existing widget when openPromptField is called twice', () => {
    openPromptField(view, { onSubmit: () => {}, onCancel: () => {} })
    openPromptField(view, { onSubmit: () => {}, onCancel: () => {} })
    expect(document.querySelectorAll('.cm-llm-prompt-field').length).toBe(1)
  })
})

describe('PromptField — submit', () => {
  it('calls onSubmit with the input text on Enter', () => {
    const onSubmit = vi.fn()
    const handle = openPromptField(view, { onSubmit, onCancel: () => {} })
    typeText(handle, 'mach das responsive')
    pressEnter(handle)
    expect(onSubmit).toHaveBeenCalledWith('mach das responsive')
  })

  it('closes the widget after submit', () => {
    const handle = openPromptField(view, { onSubmit: () => {}, onCancel: () => {} })
    typeText(handle, 'X')
    pressEnter(handle)
    expect(isPromptFieldOpen()).toBe(false)
  })

  it('does not call onSubmit when the input is empty', () => {
    const onSubmit = vi.fn()
    const handle = openPromptField(view, { onSubmit, onCancel: () => {} })
    pressEnter(handle)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(isPromptFieldOpen()).toBe(true)
  })

  it('trims whitespace-only input as empty', () => {
    const onSubmit = vi.fn()
    const handle = openPromptField(view, { onSubmit, onCancel: () => {} })
    typeText(handle, '   ')
    pressEnter(handle)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('passes trimmed text to onSubmit', () => {
    const onSubmit = vi.fn()
    const handle = openPromptField(view, { onSubmit, onCancel: () => {} })
    typeText(handle, '  hi  ')
    pressEnter(handle)
    expect(onSubmit).toHaveBeenCalledWith('hi')
  })
})

describe('PromptField — cancel', () => {
  it('calls onCancel on Escape', () => {
    const onCancel = vi.fn()
    const handle = openPromptField(view, { onSubmit: () => {}, onCancel })
    pressEscape(handle)
    expect(onCancel).toHaveBeenCalled()
  })

  it('closes the widget after Escape', () => {
    const handle = openPromptField(view, { onSubmit: () => {}, onCancel: () => {} })
    pressEscape(handle)
    expect(isPromptFieldOpen()).toBe(false)
  })

  it('calls onCancel when explicit close() is invoked', () => {
    const onCancel = vi.fn()
    const handle = openPromptField(view, { onSubmit: () => {}, onCancel })
    handle.close()
    expect(onCancel).toHaveBeenCalled()
  })
})

describe('PromptField — initial value', () => {
  it('pre-fills the input when initialValue is provided', () => {
    const handle = openPromptField(view, {
      onSubmit: () => {},
      onCancel: () => {},
      initialValue: 'previous text',
    })
    const input = handle.element.querySelector('input') as HTMLInputElement
    expect(input.value).toBe('previous text')
  })
})

describe('PromptField — keyboard edge cases', () => {
  it('ignores other keys (does not submit or cancel on a letter key)', () => {
    const onSubmit = vi.fn()
    const onCancel = vi.fn()
    const handle = openPromptField(view, { onSubmit, onCancel })
    typeText(handle, 'X')
    pressKey(handle, 'a')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onCancel).not.toHaveBeenCalled()
    expect(isPromptFieldOpen()).toBe(true)
  })

  it('close() is idempotent (calling twice does not double-fire onCancel)', () => {
    const onCancel = vi.fn()
    const handle = openPromptField(view, { onSubmit: () => {}, onCancel })
    handle.close()
    handle.close()
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

describe('PromptField — placeholder', () => {
  it('uses the custom placeholder when provided', () => {
    const handle = openPromptField(view, {
      onSubmit: () => {},
      onCancel: () => {},
      placeholder: 'custom prompt',
    })
    const input = handle.element.querySelector('input') as HTMLInputElement
    expect(input.placeholder).toBe('custom prompt')
  })
})

describe('PromptField — positioning', () => {
  it('uses cursor coords when coordsAtPos returns a value', () => {
    // Mock coordsAtPos so the happy-path branch in positionAtCursor runs.
    const original = view.coordsAtPos.bind(view)
    view.coordsAtPos = (() => ({
      left: 100,
      right: 100,
      top: 50,
      bottom: 70,
    })) as typeof view.coordsAtPos
    try {
      const handle = openPromptField(view, { onSubmit: () => {}, onCancel: () => {} })
      expect(handle.element.style.left).toBe('100px')
      expect(handle.element.style.top).toBe('74px')
    } finally {
      view.coordsAtPos = original
    }
  })
})

describe('PromptField — A11y', () => {
  it('has an aria-label on the input', () => {
    const handle = openPromptField(view, { onSubmit: () => {}, onCancel: () => {} })
    const input = handle.element.querySelector('input') as HTMLInputElement
    expect(input.getAttribute('aria-label')).toBeTruthy()
  })

  it('has role="dialog" on the wrapper', () => {
    const handle = openPromptField(view, { onSubmit: () => {}, onCancel: () => {} })
    expect(handle.element.getAttribute('role')).toBe('dialog')
  })
})

// ============================================================
// Helpers
// ============================================================

function typeText(handle: PromptFieldHandle, text: string) {
  const input = handle.element.querySelector('input') as HTMLInputElement
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function pressKey(handle: PromptFieldHandle, key: string) {
  const input = handle.element.querySelector('input') as HTMLInputElement
  input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

function pressEnter(handle: PromptFieldHandle) {
  pressKey(handle, 'Enter')
}

function pressEscape(handle: PromptFieldHandle) {
  pressKey(handle, 'Escape')
}
