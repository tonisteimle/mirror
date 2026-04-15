/**
 * Compile Service
 *
 * Orchestrates the compilation pipeline.
 * Each step is delegated to a focused module.
 */

import type { FileType, CompileResult, CompileDependencies } from './types'
import { PreludeBuilder } from './prelude-builder'
import { CodeGenerator } from './code-generator'
import { PreviewRenderer } from './preview-renderer'
import { StudioUpdater } from './studio-updater'
import { PerfLogger } from './perf-logger'

export class CompileService {
  private preludeBuilder: PreludeBuilder
  private generator: CodeGenerator
  private renderer: PreviewRenderer
  private updater: StudioUpdater

  constructor(private deps: CompileDependencies) {
    this.preludeBuilder = new PreludeBuilder({
      getPreludeCode: deps.getPreludeCode,
      currentFile: deps.currentFile,
    })
    this.generator = new CodeGenerator({ MirrorLang: deps.MirrorLang })
    this.renderer = new PreviewRenderer({
      preview: document.getElementById('preview')!,
      generatedCode: document.getElementById('generated-code'),
      MirrorLang: deps.MirrorLang,
      generateYAMLDataInjection: deps.generateYAMLDataInjection,
      makePreviewElementsDraggable: deps.makePreviewElementsDraggable,
      getAllProjectSource: deps.getAllProjectSource,
      getTokensSource: deps.getTokensSource,
      getCurrentFileSource: deps.getCurrentFileSource,
    })
    this.updater = new StudioUpdater({
      studio: deps.studio,
      updateStudio: deps.updateStudio,
      setIconTriggerPrimitives: () => {}, // Will be set in compile
    })
  }

  compile(code: string): void {
    const perf = new PerfLogger()

    if (this.shouldSkipCompile()) return
    this.updateFileCache(code)

    if (this.isEmpty(code)) {
      this.handleEmptyCode()
      return
    }

    this.deps.studioActions.setCompiling(true)
    const fileType = this.deps.getFileType(this.deps.currentFile)

    try {
      this.executeCompile(code, fileType, perf)
    } catch (err) {
      this.handleError(err as Error)
    }
  }

  private shouldSkipCompile(): boolean {
    const preview = document.getElementById('preview')
    return preview?.dataset.generatedMode === 'true'
  }

  private updateFileCache(code: string): void {
    this.deps.files[this.deps.currentFile] = code
  }

  private isEmpty(code: string): boolean {
    return !code.trim()
  }

  private handleEmptyCode(): void {
    this.renderEmptyPreview()
    this.updater.handleEmptyCode()
    this.clearUserComponents()
  }

  private renderEmptyPreview(): void {
    const preview = document.getElementById('preview')!
    preview.innerHTML = this.createEmptyAppHTML()
    preview.className = ''
  }

  private createEmptyAppHTML(): string {
    return `<div class="mirror-root" style="width: 100%; height: 100%;">
      <div data-mirror-id="node-1" data-mirror-root="true"
           data-mirror-name="App" data-component="App"
           style="display: flex; flex-direction: column;
                  width: 100%; height: 100%; min-height: 200px;">
      </div>
    </div>`
  }

  private clearUserComponents(): void {
    const list = document.querySelector('.user-components-list')
    if (list) list.innerHTML = ''
  }

  private executeCompile(code: string, fileType: FileType, perf: PerfLogger): void {
    this.deps.autoCreateReferencedFiles(code)
    const prelude = this.resolvePrelude(code, fileType)
    perf.markPreludeEnd()
    this.updater.updateState(prelude.resolvedCode, prelude.preludeOffset)
    const result = this.generate(prelude.resolvedCode, prelude.preludeOffset, perf)
    this.updatePrimitives(result.ast)
    const renderResult = this.render(result, fileType, code, perf)
    this.finalizeCompile(renderResult.augmentedResult || result, renderResult.ui, perf)
  }

  private resolvePrelude(code: string, fileType: FileType) {
    return this.preludeBuilder.resolve(code, fileType)
  }

  private generate(code: string, offset: number, perf: PerfLogger): CompileResult {
    const result = this.generator.compile(code, offset)
    perf.markParseEnd()
    perf.markIREnd()
    perf.markCodegenEnd()
    return result
  }

  private updatePrimitives(ast: CompileResult['ast']): void {
    this.updater.updateComponentPrimitives(ast)
  }

  private render(result: CompileResult, fileType: FileType, code: string, perf: PerfLogger) {
    perf.markPrepExecStart()
    const renderResult = this.renderer.render(result, fileType, code)
    perf.markExecEnd()
    return renderResult
  }

  private finalizeCompile(result: CompileResult, ui: unknown, perf: PerfLogger): void {
    this.updater.updateAfterCompile(result.ast, result.ir, result.sourceMap, result.resolvedCode)
    perf.markUpdateStudioEnd()
    if (ui) {
      perf.markDomAppendEnd()
      perf.markDraggablesEnd()
      this.updater.refreshPreview()
      perf.markRefreshEnd()
      this.updater.triggerSync()
      perf.markSyncEnd()
    }
    this.updateStatus(result.ast)
    perf.logIfSlow()
  }

  private updateStatus(ast: CompileResult['ast']): void {
    const status = document.getElementById('status')
    if (!status) return

    status.textContent = `OK - ${ast.components.length} components, ${ast.instances.length} instances`
    status.className = 'status ok'
  }

  private handleError(err: Error): void {
    this.deps.studioActions.setCompiling(false)
    this.showError(err.message)
  }

  private showError(message: string): void {
    const status = document.getElementById('status')
    const preview = document.getElementById('preview')!
    const generatedCode = document.getElementById('generated-code')

    if (status) {
      status.textContent = 'Error'
      status.className = 'status error'
    }

    preview.innerHTML = `
      <div class="error-box">
        <h3>Parse/Compile Error</h3>
        <pre>${message}</pre>
      </div>
    `

    if (generatedCode) {
      generatedCode.textContent = `// Error: ${message}`
    }
  }
}
