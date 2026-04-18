/**
 * Studio API - Test interface for Studio-level operations
 *
 * Provides programmatic access to:
 * - Project management (new, load example)
 * - Compilation (force compile, get generated code)
 * - UI state (theme, panels, viewport)
 * - History (undo stack access)
 */

import type { StudioAPI, HistoryAPI, ViewportAPI, StudioStateSnapshot } from './types'

// =============================================================================
// History API
// =============================================================================

class HistoryAPIImpl implements HistoryAPI {
  private get executor(): any {
    return (window as any).__mirrorStudio__?.executor
  }

  private get cmController(): any {
    return (window as any).__mirrorStudio__?.cmController
  }

  private get editorView(): any {
    return this.cmController?.editor
  }

  canUndo(): boolean {
    // Check both executor (structural changes) and CodeMirror (text changes)
    const executorCanUndo = this.executor?.canUndo() ?? false
    // Check CodeMirror's undo depth using exposed API
    const cm = (window as any).__codemirror
    const cmCanUndo = cm?.undoDepth ? cm.undoDepth() > 0 : false
    return executorCanUndo || cmCanUndo
  }

  canRedo(): boolean {
    // Check both executor (structural changes) and CodeMirror (text changes)
    const executorCanRedo = this.executor?.canRedo() ?? false
    // Check CodeMirror's redo depth using exposed API
    const cm = (window as any).__codemirror
    const cmCanRedo = cm?.redoDepth ? cm.redoDepth() > 0 : false
    return executorCanRedo || cmCanRedo
  }

  getUndoStackSize(): number {
    // Try executor first, then estimate from CM
    const executorSize = this.executor?.undoStack?.length ?? 0
    // Note: CodeMirror 6 doesn't expose stack size directly, so we approximate
    return executorSize
  }

  getRedoStackSize(): number {
    return this.executor?.redoStack?.length ?? 0
  }

  getLastCommand(): string | null {
    const stack = this.executor?.undoStack
    if (!stack || stack.length === 0) return null
    const last = stack[stack.length - 1]
    return last?.constructor?.name || last?.type || null
  }

  async undo(): Promise<boolean> {
    // Try CodeMirror undo first (for text changes)
    // Uses window-exposed CodeMirror commands
    const cm = (window as any).__codemirror
    if (cm?.undo) {
      cm.undo()
      await new Promise(resolve => setTimeout(resolve, 100))
      return true
    }

    // Then try executor undo
    if (this.executor?.canUndo()) {
      this.executor.undo()
      await new Promise(resolve => setTimeout(resolve, 100))
      return true
    }
    return false
  }

  async redo(): Promise<boolean> {
    // Try CodeMirror redo first (for text changes)
    // Uses window-exposed CodeMirror commands
    const cm = (window as any).__codemirror
    if (cm?.redo) {
      cm.redo()
      await new Promise(resolve => setTimeout(resolve, 100))
      return true
    }

    // Then try executor redo
    if (this.executor?.canRedo()) {
      this.executor.redo()
      await new Promise(resolve => setTimeout(resolve, 100))
      return true
    }
    return false
  }

  clear(): void {
    if (this.executor) {
      this.executor.undoStack = []
      this.executor.redoStack = []
    }
  }
}

// =============================================================================
// Viewport API
// =============================================================================

class ViewportAPIImpl implements ViewportAPI {
  private get previewContainer(): HTMLElement | null {
    return document.getElementById('preview')
  }

  getSize(): { width: number; height: number } {
    const container = this.previewContainer
    if (!container) return { width: 0, height: 0 }

    const rect = container.getBoundingClientRect()
    return { width: rect.width, height: rect.height }
  }

  async setSize(width: number, height: number): Promise<void> {
    const container = this.previewContainer
    if (!container) return

    container.style.width = `${width}px`
    container.style.height = `${height}px`

    // Trigger resize event for responsive components
    window.dispatchEvent(new Event('resize'))
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  getZoom(): number {
    const container = this.previewContainer
    if (!container) return 1

    const transform = container.style.transform
    const match = transform?.match(/scale\(([\d.]+)\)/)
    return match ? parseFloat(match[1]) : 1
  }

  async setZoom(zoom: number): Promise<void> {
    const container = this.previewContainer
    if (!container) return

    container.style.transform = `scale(${zoom})`
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  async scrollTo(x: number, y: number): Promise<void> {
    const container = this.previewContainer?.parentElement
    if (!container) return

    container.scrollLeft = x
    container.scrollTop = y
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  getScroll(): { x: number; y: number } {
    const container = this.previewContainer?.parentElement
    if (!container) return { x: 0, y: 0 }

    return { x: container.scrollLeft, y: container.scrollTop }
  }
}

// =============================================================================
// Studio API Implementation
// =============================================================================

export class StudioAPIImpl implements StudioAPI {
  readonly history: HistoryAPI
  readonly viewport: ViewportAPI

  constructor() {
    this.history = new HistoryAPIImpl()
    this.viewport = new ViewportAPIImpl()
  }

  private get studio(): any {
    return (window as any).__mirrorStudio__
  }

  private get state(): any {
    return this.studio?.state
  }

  private get events(): any {
    return this.studio?.events
  }

  private get actions(): any {
    return this.studio?.actions
  }

  // ===========================================================================
  // Test Isolation
  // ===========================================================================

  async reset(): Promise<void> {
    // Clear editor
    const editor = (window as any).editor
    if (editor) {
      const doc = editor.state.doc
      editor.dispatch({
        changes: { from: 0, to: doc.length, insert: '' },
      })
    }

    // Clear history
    this.history.clear()

    // Clear selection
    this.resetSelection()

    // Clear preview
    const preview = document.getElementById('preview')
    if (preview) {
      const content = preview.querySelector('.preview-content') || preview
      content.innerHTML = ''
    }

    // Clear any open overlays/dialogs
    document.querySelectorAll('[data-scope]').forEach(el => {
      if (el.classList.contains('open') || el.getAttribute('data-state') === 'open') {
        el.remove()
      }
    })

    // Wait a tick for cleanup
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  resetSelection(): void {
    if (this.studio?.sync) {
      this.studio.sync.clearSelection('test')
    } else if (this.actions?.setSelection) {
      this.actions.setSelection(null, 'test')
    }
  }

  getStateSnapshot(): StudioStateSnapshot {
    const editor = (window as any).editor
    const preview = document.getElementById('preview')

    return {
      code: editor?.state?.doc?.toString() ?? '',
      selection: this.getSelection(),
      nodeIds: Array.from(preview?.querySelectorAll('[data-mirror-id]') ?? []).map(
        el => el.getAttribute('data-mirror-id') || ''
      ),
      undoStackSize: this.history.getUndoStackSize(),
      redoStackSize: this.history.getRedoStackSize(),
      compileErrors: this.getCompileErrors(),
    }
  }

  // ===========================================================================
  // Project Management
  // ===========================================================================

  async newProject(): Promise<void> {
    const files = (window as any).files
    if (files) {
      // Clear all files
      for (const key of Object.keys(files)) {
        delete files[key]
      }
      // Create default file
      files['index.mir'] = 'Frame\n  Text "Hello Mirror"'
    }

    // Set editor content
    const editor = (window as any).editor
    if (editor) {
      const doc = editor.state.doc
      editor.dispatch({
        changes: { from: 0, to: doc.length, insert: 'Frame\n  Text "Hello Mirror"' },
      })
    }

    // Clear history
    this.history.clear()

    await this.compile()
  }

  async loadExample(name: string): Promise<boolean> {
    // Try to find example in window.examples
    const examples = (window as any).examples
    if (!examples || !examples[name]) {
      return false
    }

    const exampleCode = examples[name]
    const editor = (window as any).editor
    if (editor) {
      const doc = editor.state.doc
      editor.dispatch({
        changes: { from: 0, to: doc.length, insert: exampleCode },
      })
    }

    await this.compile()
    return true
  }

  // ===========================================================================
  // Compilation
  // ===========================================================================

  async compile(): Promise<void> {
    // Trigger compile via events
    if (this.events) {
      this.events.emit('compile:requested', {})
    } else {
      // Fallback: use global compile function
      const compileTestCode = (window as any).__compileTestCode
      if (compileTestCode) {
        const editor = (window as any).editor
        compileTestCode(editor?.state?.doc?.toString() || '')
      }
    }

    // Wait for compile to finish
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  getAST(): unknown {
    return this.state?.get()?.ast ?? null
  }

  getIR(): unknown {
    return this.state?.get()?.ir ?? null
  }

  getSourceMap(): unknown {
    return this.state?.get()?.sourceMap ?? null
  }

  getCompileErrors(): string[] {
    const errors = this.state?.get()?.errors || []
    return errors.map((e: any) => e.message || String(e))
  }

  getGeneratedCode(): string {
    // Access the rendered HTML from preview
    const preview = document.getElementById('preview')
    if (!preview) return ''

    // Get the inner HTML of the preview content
    const content = preview.querySelector('.preview-content') || preview
    return content.innerHTML
  }

  // ===========================================================================
  // UI State
  // ===========================================================================

  getTheme(): 'light' | 'dark' {
    return document.body.classList.contains('light-theme') ? 'light' : 'dark'
  }

  setTheme(theme: 'light' | 'dark'): void {
    document.body.classList.remove('light-theme', 'dark-theme')
    document.body.classList.add(`${theme}-theme`)
  }

  isPanelVisible(panel: string): boolean {
    const visibility = this.state?.get()?.panelVisibility
    return visibility?.[panel] ?? false
  }

  setPanelVisible(panel: string, visible: boolean): void {
    if (this.actions?.setPanelVisibility) {
      this.actions.setPanelVisibility(panel, visible)
    }
  }

  // ===========================================================================
  // Selection
  // ===========================================================================

  getSelection(): string | null {
    return this.state?.get()?.selection?.nodeId ?? null
  }

  async setSelection(nodeId: string | null): Promise<void> {
    // Try actions.setSelection first
    if (this.actions?.setSelection) {
      this.actions.setSelection(nodeId, 'test')
    } else if (this.studio?.sync?.setSelection) {
      // Try sync.setSelection
      this.studio.sync.setSelection(nodeId, 'test')
    } else if (this.state?.set) {
      // Try direct state update
      this.state.set({ selection: { nodeId, origin: 'test' } })
    }
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  clearSelection(): void {
    // First try actions.clearSelection (handles deduplication correctly)
    if (this.actions?.clearSelection) {
      this.actions.clearSelection('test')
      return
    }

    // Try sync.clearSelection
    if (this.studio?.sync?.clearSelection) {
      this.studio.sync.clearSelection('test')
      return
    }

    // Try actions.setSelection with null
    if (this.actions?.setSelection) {
      this.actions.setSelection(null, 'test')
      return
    }

    // Try direct state update and emit event
    if (this.state?.set) {
      this.state.set({ selection: { nodeId: null, origin: 'test' } })
      // Emit event manually since direct state.set doesn't
      this.studio?.events?.emit?.('selection:changed', { nodeId: null, origin: 'test' })
    }
  }

  getMultiSelection(): string[] {
    return this.state?.get()?.multiSelection ?? []
  }

  clearMultiSelection(): void {
    if (this.actions?.clearMultiSelection) {
      this.actions.clearMultiSelection()
      return
    }

    if (this.state?.set) {
      this.state.set({ multiSelection: [] })
      this.studio?.events?.emit?.('multiselection:changed', { nodeIds: [] })
    }
  }

  // ===========================================================================
  // Notifications
  // ===========================================================================

  async toast(message: string, type: 'success' | 'error' | 'info' = 'info'): Promise<void> {
    if (this.events) {
      this.events.emit(`notification:${type}`, { message })
    }
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  // ===========================================================================
  // Wait Helpers
  // ===========================================================================

  async waitForCompile(timeout = 2000): Promise<void> {
    const startTime = Date.now()

    return new Promise((resolve, reject) => {
      const check = () => {
        const preview = document.getElementById('preview')
        const hasNodes = preview?.querySelectorAll('[data-mirror-id]').length ?? 0

        if (hasNodes > 0) {
          setTimeout(resolve, 100)
          return
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error('Compile timeout'))
          return
        }

        setTimeout(check, 50)
      }

      setTimeout(check, 50)
    })
  }

  async waitForSelection(timeout = 2000): Promise<string> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const selection = this.getSelection()
      if (selection) return selection
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    throw new Error('Selection timeout')
  }
}

export function createStudioAPI(): StudioAPI {
  return new StudioAPIImpl()
}
