/**
 * Preview Renderer
 *
 * Renders compiled output to the preview DOM based on file type.
 */

import type { AST, FileType, CompileResult, MirrorLangAPI } from './types'
import { TokenRenderer } from './token-renderer'
import { ComponentRenderer } from './component-renderer'

export interface RendererDeps {
  preview: HTMLElement
  generatedCode: HTMLElement | null
  MirrorLang: MirrorLangAPI
  generateYAMLDataInjection: () => string
  makePreviewElementsDraggable: () => void
  getAllProjectSource: () => string
  getTokensSource: () => string
  getCurrentFileSource: () => string
}

export interface RenderResult {
  ui: UIElement | null
  augmentedResult?: CompileResult
}

interface UIElement {
  root?: HTMLElement
}

export class PreviewRenderer {
  private tokenRenderer: TokenRenderer
  private componentRenderer: ComponentRenderer

  constructor(private deps: RendererDeps) {
    this.tokenRenderer = new TokenRenderer({
      preview: deps.preview,
      getAllProjectSource: deps.getAllProjectSource,
    })
    this.componentRenderer = new ComponentRenderer({
      preview: deps.preview,
      MirrorLang: deps.MirrorLang,
      getTokensSource: deps.getTokensSource,
      getCurrentFileSource: deps.getCurrentFileSource,
    })
  }

  render(result: CompileResult, fileType: FileType, originalCode: string): RenderResult {
    this.clearPreview()
    this.showGeneratedCode(result.jsCode)

    switch (fileType) {
      case 'tokens':
        return this.renderTokens(result)
      case 'component':
        return this.renderComponents(result)
      default:
        return this.renderLayout(result, originalCode)
    }
  }

  private clearPreview(): void {
    this.deps.preview.innerHTML = ''
    this.deps.preview.className = ''
  }

  private showGeneratedCode(jsCode: string): void {
    if (this.deps.generatedCode) {
      this.deps.generatedCode.textContent = jsCode
    }
  }

  // === Token Preview ===

  private renderTokens(result: CompileResult): RenderResult {
    this.deps.preview.className = 'tokens-preview'
    this.tokenRenderer.render(result.ast)
    return { ui: null }
  }

  // === Components Preview ===

  private renderComponents(result: CompileResult): RenderResult {
    this.deps.preview.className = 'components-preview'
    this.componentRenderer.render(result.ast)
    return { ui: null }
  }

  // === Layout Preview ===

  private renderLayout(result: CompileResult, originalCode: string): RenderResult {
    const augmented = this.augmentWithLocalComponents(result, originalCode)
    const ui = this.executeCode(augmented.jsCode)
    this.appendToPreview(ui)
    return { ui, augmentedResult: augmented }
  }

  private augmentWithLocalComponents(result: CompileResult, originalCode: string): CompileResult {
    const localAst = this.deps.MirrorLang.parse(originalCode)
    const uninstanced = this.findUninstancedComponents(result.ast, localAst)

    if (uninstanced.length === 0) {
      return result
    }

    return this.recompileWithComponents(result, uninstanced)
  }

  private findUninstancedComponents(fullAst: AST, localAst: AST): string[] {
    const localNames = (localAst.components || []).map(c => c.name)
    const instanced = new Set((fullAst.instances || []).map(i => i.component))
    return localNames.filter(name => !instanced.has(name))
  }

  private recompileWithComponents(result: CompileResult, components: string[]): CompileResult {
    const augmentedCode = result.resolvedCode + '\n\n// Auto-preview\n' + components.join('\n')
    const augmentedAst = this.deps.MirrorLang.parse(augmentedCode)
    const augmentedIR = this.deps.MirrorLang.toIR(augmentedAst, true)
    const augmentedJS = this.deps.MirrorLang.generateDOM(augmentedAst)

    return {
      ...result,
      ast: augmentedAst,
      ir: augmentedIR.ir,
      sourceMap: augmentedIR.sourceMap,
      jsCode: augmentedJS,
    }
  }

  private executeCode(jsCode: string): UIElement | null {
    const preparedCode = this.prepareForExecution(jsCode)
    const fn = new Function(preparedCode + '\nreturn createUI ? createUI() : _ui;')
    return fn() as UIElement
  }

  private prepareForExecution(jsCode: string): string {
    let code = jsCode.replace('export function createUI', 'function createUI')
    code = code.replace('document.body.appendChild(_ui.root)', '')
    code = this.injectYAMLData(code)
    return code
  }

  private injectYAMLData(code: string): string {
    const injection = this.deps.generateYAMLDataInjection()
    if (!injection) return code

    return code.replace(/(__mirrorData = \{[\s\S]*?\n\})/, match => match + injection)
  }

  private appendToPreview(ui: UIElement | null): void {
    const rootEl = this.extractRootElement(ui)
    if (!rootEl) return

    this.deps.preview.appendChild(rootEl)
    this.deps.makePreviewElementsDraggable()
  }

  private extractRootElement(ui: UIElement | null): HTMLElement | null {
    if (!ui) return null
    if (ui.root) return ui.root
    if (ui instanceof Element) return ui as HTMLElement
    return null
  }
}
