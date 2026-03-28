/**
 * Mock EditorView for Testing
 *
 * Simulates CodeMirror EditorView with a simple text buffer.
 * Tracks all dispatched changes for assertions.
 */

import type { FixerResponse } from '../../studio/agent/types'

// ============================================
// TYPES
// ============================================

export interface MockEditorState {
  content: string
  cursorLine: number
  cursorColumn: number
  selection: { from: number; to: number; text: string } | null
}

export interface DispatchedChange {
  type: 'change' | 'effect'
  from?: number
  to?: number
  insert?: string
  effectType?: string
  effectValue?: unknown
}

// ============================================
// MOCK EDITOR VIEW
// ============================================

export class MockEditorView {
  private content: string
  private cursorOffset: number = 0
  private selection: { from: number; to: number } | null = null
  private destroyed: boolean = false

  // Track all dispatched changes for assertions
  public dispatchedChanges: DispatchedChange[] = []

  // Simulated DOM element
  public dom: { isConnected: boolean } = { isConnected: true }

  // State field values (simulated)
  private fieldValues: Map<unknown, unknown> = new Map()

  constructor(initialContent: string = '', cursorLine: number = 1) {
    this.content = initialContent
    this.setCursorToLine(cursorLine)
  }

  // ============================================
  // STATE ACCESS
  // ============================================

  get state() {
    const self = this
    return {
      get doc() {
        return {
          get length() {
            return self.content.length
          },
          get lines() {
            return self.content.split('\n').length
          },
          toString() {
            return self.content
          },
          line(n: number) {
            const lines = self.content.split('\n')
            if (n < 1 || n > lines.length) {
              throw new Error(`Line ${n} out of range`)
            }

            let from = 0
            for (let i = 0; i < n - 1; i++) {
              from += lines[i].length + 1 // +1 for newline
            }
            const text = lines[n - 1]
            const to = from + text.length

            return { number: n, from, to, text }
          },
          lineAt(pos: number) {
            const lines = self.content.split('\n')
            let currentPos = 0

            for (let i = 0; i < lines.length; i++) {
              const lineEnd = currentPos + lines[i].length
              if (pos <= lineEnd || i === lines.length - 1) {
                return {
                  number: i + 1,
                  from: currentPos,
                  to: lineEnd,
                  text: lines[i]
                }
              }
              currentPos = lineEnd + 1 // +1 for newline
            }

            // Fallback
            return { number: 1, from: 0, to: 0, text: '' }
          }
        }
      },
      get selection() {
        return {
          main: {
            from: self.cursorOffset,
            to: self.selection?.to ?? self.cursorOffset
          }
        }
      },
      field<T>(field: unknown): T {
        return self.fieldValues.get(field) as T
      }
    }
  }

  // ============================================
  // DISPATCH
  // ============================================

  dispatch(transaction: {
    changes?: { from: number; to: number; insert: string }
    effects?: { is: (type: unknown) => boolean; value: unknown }[] | { is: (type: unknown) => boolean; value: unknown }
  }) {
    if (this.destroyed) {
      throw new Error('Cannot dispatch to destroyed view')
    }

    // Handle changes
    if (transaction.changes) {
      const { from, to, insert } = transaction.changes
      this.content =
        this.content.slice(0, from) +
        insert +
        this.content.slice(to)

      this.dispatchedChanges.push({
        type: 'change',
        from,
        to,
        insert
      })
    }

    // Handle effects
    if (transaction.effects) {
      const effects = Array.isArray(transaction.effects)
        ? transaction.effects
        : [transaction.effects]

      for (const effect of effects) {
        this.dispatchedChanges.push({
          type: 'effect',
          effectValue: effect.value
        })

        // Store field value (simplified - in real CM this is more complex)
        // We use a convention: effects that set prompt state
        if (effect.value === null || (effect.value && typeof effect.value === 'object')) {
          // Assume this is a prompt state effect
          this.fieldValues.set('promptState', effect.value)
        }
      }
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  setCursorToLine(line: number) {
    const lines = this.content.split('\n')
    let offset = 0
    for (let i = 0; i < Math.min(line - 1, lines.length); i++) {
      offset += lines[i].length + 1
    }
    this.cursorOffset = offset
  }

  setContent(content: string) {
    this.content = content
  }

  getContent(): string {
    return this.content
  }

  destroy() {
    this.destroyed = true
    this.dom.isConnected = false
  }

  isDestroyed(): boolean {
    return this.destroyed
  }

  // Set a field value directly (for testing)
  setFieldValue(field: unknown, value: unknown) {
    this.fieldValues.set(field, value)
  }

  // Get cursor position
  getCursor(): { line: number; column: number; offset: number } {
    const lines = this.content.split('\n')
    let remaining = this.cursorOffset

    for (let i = 0; i < lines.length; i++) {
      if (remaining <= lines[i].length) {
        return {
          line: i + 1,
          column: remaining + 1,
          offset: this.cursorOffset
        }
      }
      remaining -= lines[i].length + 1
    }

    return { line: 1, column: 1, offset: 0 }
  }

  // Get selection
  getSelection(): { from: number; to: number; text: string } | null {
    if (!this.selection) return null
    return {
      ...this.selection,
      text: this.content.slice(this.selection.from, this.selection.to)
    }
  }

  // Clear tracked changes
  clearDispatchedChanges() {
    this.dispatchedChanges = []
  }
}

// ============================================
// FACTORY
// ============================================

export function createMockEditor(
  content: string = '',
  cursorLine: number = 1
): MockEditorView {
  return new MockEditorView(content, cursorLine)
}
