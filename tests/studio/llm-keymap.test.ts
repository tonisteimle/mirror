/**
 * Tests for studio/editor/llm-keymap.ts
 *
 * Verifiziert die Keymap-Resolver-Bindings (Mod-Enter / Mod-Shift-Enter)
 * mit gemockten Handlern. Echtes Wiring an `edit-handler.ts` läuft erst
 * in T3.5 (Phase 3 Schritt B) — dieser Test isoliert die Keymap-Logik.
 *
 * Siehe: docs/concepts/llm-edit-flow-test-concept.md § 3.1 (llm-keymap)
 */

import { describe, it, expect, vi } from 'vitest'
import type { EditorView } from '@codemirror/view'
import { llmEditKeymap, isGhostActiveSelector } from '../../studio/editor/llm-keymap'
import { ghostDiffField, setGhostDiffEffect } from '../../studio/editor/ghost-diff'
import { EditorState } from '@codemirror/state'

const fakeView = (extra: Partial<EditorView> = {}): EditorView =>
  ({
    state: EditorState.create({ doc: '', extensions: [ghostDiffField] }),
    dispatch: vi.fn(),
    ...extra,
  }) as unknown as EditorView

describe('llmEditKeymap — bindings', () => {
  it('returns an array with Mod-Enter and Mod-Shift-Enter bindings', () => {
    const keymap = llmEditKeymap({
      handleEditFlow: () => true,
      openPromptField: () => true,
      acceptGhost: () => true,
      dismissGhost: () => true,
    })
    const keys = keymap.map(b => b.key)
    expect(keys).toContain('Mod-Enter')
    expect(keys).toContain('Mod-Shift-Enter')
  })

  it('Mod-Enter binding calls handleEditFlow with the view', () => {
    const handleEditFlow = vi.fn(() => true)
    const keymap = llmEditKeymap({
      handleEditFlow,
      openPromptField: () => true,
      acceptGhost: () => true,
      dismissGhost: () => true,
    })
    const view = fakeView()
    const binding = keymap.find(b => b.key === 'Mod-Enter')
    const result = binding?.run?.(view)
    expect(result).toBe(true)
    expect(handleEditFlow).toHaveBeenCalledWith(view)
  })

  it('Mod-Shift-Enter binding calls openPromptField with the view', () => {
    const openPromptField = vi.fn(() => true)
    const keymap = llmEditKeymap({
      handleEditFlow: () => true,
      openPromptField,
      acceptGhost: () => true,
      dismissGhost: () => true,
    })
    const view = fakeView()
    const binding = keymap.find(b => b.key === 'Mod-Shift-Enter')
    binding?.run?.(view)
    expect(openPromptField).toHaveBeenCalledWith(view)
  })

  it('returns false from handleEditFlow → keymap binding returns false', () => {
    const keymap = llmEditKeymap({
      handleEditFlow: () => false,
      openPromptField: () => true,
      acceptGhost: () => true,
      dismissGhost: () => true,
    })
    const view = fakeView()
    const binding = keymap.find(b => b.key === 'Mod-Enter')
    expect(binding?.run?.(view)).toBe(false)
  })
})

describe('llmEditKeymap — Tab / Escape (ghost gating)', () => {
  it('Tab calls acceptGhost only when ghostDiffField.active', () => {
    const acceptGhost = vi.fn(() => true)
    const keymap = llmEditKeymap({
      handleEditFlow: () => true,
      openPromptField: () => true,
      acceptGhost,
      dismissGhost: () => true,
    })

    // Inactive: binding returns false (passes Tab through to default).
    const inactiveView = fakeView()
    const tabBinding = keymap.find(b => b.key === 'Tab')
    expect(tabBinding?.run?.(inactiveView)).toBe(false)
    expect(acceptGhost).not.toHaveBeenCalled()

    // Active: dispatch effect, then re-evaluate.
    const activeState = EditorState.create({
      doc: 'A',
      extensions: [ghostDiffField],
    }).update({
      effects: setGhostDiffEffect.of({ baseSource: 'A', newSource: 'B' }),
    }).state
    const activeView = fakeView({ state: activeState })
    expect(tabBinding?.run?.(activeView)).toBe(true)
    expect(acceptGhost).toHaveBeenCalledWith(activeView)
  })

  it('Escape always delegates to dismissGhost; the handler decides whether to consume', () => {
    // Escape is intentionally NOT keymap-gated — dismissGhost self-gates
    // for ghost-active OR in-flight, and returns false otherwise so
    // CodeMirror's default Escape behavior (autocomplete close, etc.)
    // can run.
    const dismissGhost = vi.fn((_view: EditorView) => false)
    const keymap = llmEditKeymap({
      handleEditFlow: () => true,
      openPromptField: () => true,
      acceptGhost: () => true,
      dismissGhost,
    })
    const escBinding = keymap.find(b => b.key === 'Escape')

    // Idle: dismissGhost returns false → keymap binding returns false.
    const idleView = fakeView()
    expect(escBinding?.run?.(idleView)).toBe(false)
    expect(dismissGhost).toHaveBeenCalledWith(idleView)

    // In-flight or ghost-active: dismissGhost returns true →
    // keymap consumes Escape so CodeMirror defaults don't fire.
    dismissGhost.mockReturnValueOnce(true)
    const ghostState = EditorState.create({
      doc: 'A',
      extensions: [ghostDiffField],
    }).update({
      effects: setGhostDiffEffect.of({ baseSource: 'A', newSource: 'B' }),
    }).state
    const ghostView = fakeView({ state: ghostState })
    expect(escBinding?.run?.(ghostView)).toBe(true)
    expect(dismissGhost).toHaveBeenCalledWith(ghostView)
  })
})

describe('isGhostActiveSelector', () => {
  it('returns false when ghostDiffField is missing or inactive', () => {
    const state = EditorState.create({ doc: '', extensions: [ghostDiffField] })
    expect(isGhostActiveSelector(state)).toBe(false)
  })

  it('returns false when the ghostDiffField extension is not installed', () => {
    // No ghostDiffField in the extensions array → state.field(...) throws.
    // The selector must swallow that and report inactive.
    const state = EditorState.create({ doc: 'A' })
    expect(isGhostActiveSelector(state)).toBe(false)
  })

  it('returns true when ghostDiffField is active', () => {
    const state = EditorState.create({
      doc: 'A',
      extensions: [ghostDiffField],
    }).update({
      effects: setGhostDiffEffect.of({ baseSource: 'A', newSource: 'B' }),
    }).state
    expect(isGhostActiveSelector(state)).toBe(true)
  })
})
