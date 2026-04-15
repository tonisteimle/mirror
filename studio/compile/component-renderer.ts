/**
 * Component Renderer
 *
 * Renders component preview for .com files.
 * Each function is focused and < 10 lines.
 */

import type { Component, AST, MirrorLangAPI } from './types'

// ============================================
// TYPES
// ============================================

export interface ComponentRenderDeps {
  preview: HTMLElement
  MirrorLang: MirrorLangAPI
  getTokensSource: () => string
  getCurrentFileSource: () => string
}

interface ComponentSection {
  name: string
  components: Component[]
  lineStart: number
  lineEnd: number
}

// ============================================
// CONSTANTS
// ============================================

const BEHAVIOR_STATES = [
  'hover',
  'active',
  'focus',
  'disabled',
  'selected',
  'highlighted',
  'expanded',
  'collapsed',
  'on',
  'off',
  'valid',
  'invalid',
]

// ============================================
// MAIN EXPORT
// ============================================

export class ComponentRenderer {
  private tokensHash = ''

  constructor(private deps: ComponentRenderDeps) {}

  render(ast: AST): void {
    const components = ast.components || []
    if (components.length === 0) {
      this.renderEmpty()
      return
    }
    this.renderComponents(components, ast)
  }

  private renderEmpty(): void {
    this.deps.preview.innerHTML = this.createEmptyMessage()
  }

  private createEmptyMessage(): string {
    return `
      <div style="color: #71717a; padding: 32px; text-align: center;">
        <p style="font-size: 16px; margin-bottom: 8px;">Keine Komponenten definiert</p>
        <p style="font-size: 13px; opacity: 0.7;">
          Komponenten definieren mit:<br>
          <code style="background: #18181b; padding: 2px 6px; border-radius: 4px;">Button: pad 12, bg #5BA8F5</code>
        </p>
      </div>
    `
  }

  private renderComponents(components: Component[], ast: AST): void {
    const sections = this.extractSections(components)
    const html = this.buildHTML(sections, ast)
    this.deps.preview.innerHTML = html
    this.renderAllStates(sections, ast)
  }

  // ============================================
  // SECTION EXTRACTION
  // ============================================

  private extractSections(components: Component[]): ComponentSection[] {
    const source = this.deps.getCurrentFileSource()
    const lines = source.split('\n')
    const headers = this.extractSectionHeaders(lines)

    if (headers.length === 0) {
      return [{ name: '', components, lineStart: 0, lineEnd: lines.length }]
    }
    return this.groupComponentsBySections(components, headers)
  }

  private extractSectionHeaders(lines: string[]): ComponentSection[] {
    const headers: ComponentSection[] = []
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].trim().match(/^---\s*(.+?)\s*---$/)
      if (match) {
        this.addSectionHeader(headers, match[1], i + 1, lines.length)
      }
    }
    return headers
  }

  private addSectionHeader(
    headers: ComponentSection[],
    name: string,
    line: number,
    totalLines: number
  ): void {
    if (headers.length > 0) {
      headers[headers.length - 1].lineEnd = line - 1
    }
    headers.push({ name, components: [], lineStart: line, lineEnd: totalLines })
  }

  private groupComponentsBySections(
    components: Component[],
    headers: ComponentSection[]
  ): ComponentSection[] {
    const sections = headers.map(h => ({ ...h, components: [] as Component[] }))
    const unsorted: Component[] = []

    for (const comp of components) {
      if (!this.assignToSection(comp, sections, headers)) {
        unsorted.push(comp)
      }
    }

    return this.finalizesSections(sections, unsorted)
  }

  private assignToSection(
    comp: Component,
    sections: ComponentSection[],
    headers: ComponentSection[]
  ): boolean {
    if (headers.some(h => h.name === comp.name)) return true // Skip section-named components

    const line = (comp as any).line || 0
    for (const section of sections) {
      if (line >= section.lineStart && line <= section.lineEnd) {
        section.components.push(comp)
        return true
      }
    }
    return false
  }

  private finalizesSections(
    sections: ComponentSection[],
    unsorted: Component[]
  ): ComponentSection[] {
    if (unsorted.length > 0) {
      sections[0].components = [...unsorted, ...sections[0].components]
    }
    return sections.filter(s => s.components.length > 0)
  }

  // ============================================
  // HTML GENERATION
  // ============================================

  private buildHTML(sections: ComponentSection[], ast: AST): string {
    return sections.map(s => this.renderSection(s, ast)).join('')
  }

  private renderSection(section: ComponentSection, ast: AST): string {
    if (section.components.length === 0) return ''

    const header = section.name
      ? `<div class="components-preview-section-header">${section.name}</div>`
      : ''

    const components = section.components.map(c => this.renderComponentWithStates(c, ast)).join('')

    return `
      <div class="components-preview-section">
        ${header}
        <div class="components-preview-list">${components}</div>
      </div>
    `
  }

  private renderComponentWithStates(comp: Component, ast: AST): string {
    const states = this.getComponentStates(comp)
    const rows = states.map((s, i) => this.renderStateRow(comp, s, i === 0)).join('')
    return `<div class="components-preview-component">${rows}</div>`
  }

  private renderStateRow(comp: Component, state: string, showName: boolean): string {
    const name = showName ? comp.name : ''
    return `
      <div class="components-preview-row">
        <div class="components-preview-name">${name}</div>
        <div class="components-preview-state">${state}</div>
        <div class="components-preview-render" id="comp-render-${comp.name}-${state}"></div>
      </div>
    `
  }

  // ============================================
  // STATE EXTRACTION
  // ============================================

  private getComponentStates(comp: Component): string[] {
    const states = new Set<string>()
    this.collectStates(comp, states)
    this.collectChildStates((comp as any).children || [], states)
    return ['default', ...Array.from(states)]
  }

  private collectStates(comp: Component, states: Set<string>): void {
    const compStates = (comp as any).states || []
    for (const state of compStates) {
      if (BEHAVIOR_STATES.includes(state.name)) {
        states.add(state.name)
      }
    }
  }

  private collectChildStates(children: any[], states: Set<string>): void {
    for (const child of children) {
      this.collectStates(child, states)
      if (child.children) {
        this.collectChildStates(child.children, states)
      }
    }
  }

  // ============================================
  // STATE RENDERING
  // ============================================

  private renderAllStates(sections: ComponentSection[], ast: AST): void {
    for (const section of sections) {
      for (const comp of section.components) {
        this.renderComponentStates(comp, ast)
      }
    }
  }

  private renderComponentStates(comp: Component, ast: AST): void {
    const states = this.getComponentStates(comp)
    for (const state of states) {
      this.renderState(comp, state, ast)
    }
  }

  private renderState(comp: Component, state: string, ast: AST): void {
    const container = document.getElementById(`comp-render-${comp.name}-${state}`)
    if (!container) return

    container.innerHTML = ''
    this.injectPreviewStyles()

    try {
      this.renderStateContent(comp, state, container)
    } catch (e) {
      container.innerHTML = this.createErrorMessage(e as Error)
    }
  }

  private renderStateContent(comp: Component, state: string, container: HTMLElement): void {
    const code = this.buildStateCode(comp)
    const ui = this.executeCode(code)
    const element = this.extractElement(ui, state)
    if (element) {
      container.appendChild(this.wrapElement(element))
    }
  }

  private buildStateCode(comp: Component): string {
    const tokens = this.deps.getTokensSource()
    const current = this.deps.getCurrentFileSource()
    return tokens + '\n' + current + '\n' + comp.name
  }

  private executeCode(code: string): any {
    const ast = this.deps.MirrorLang.parse(code)
    const js = this.deps.MirrorLang.generateDOM(ast).replace(
      'export function createUI',
      'function createUI'
    )
    const fn = new Function(js + '\nreturn createUI ? createUI() : null;')
    return fn()
  }

  private extractElement(ui: any, state: string): HTMLElement | null {
    const root = ui?.root || (ui instanceof Element ? ui : null)
    if (!root || root.children.length === 0) return null

    const element = root.children[root.children.length - 1] as HTMLElement
    if (state !== 'default') {
      element.classList.add(`state-${state}`)
      element.setAttribute('data-state', state)
    }
    return element
  }

  private wrapElement(element: HTMLElement): HTMLElement {
    const wrapper = document.createElement('div')
    wrapper.className = 'components-preview-wrapper'
    wrapper.appendChild(element.cloneNode(true))
    return wrapper
  }

  private createErrorMessage(e: Error): string {
    return `<span style="color: #52525b; font-size: 11px;">Error: ${e.message}</span>`
  }

  // ============================================
  // CSS INJECTION
  // ============================================

  private injectPreviewStyles(): void {
    const source = this.deps.getTokensSource()
    const hash = source.length + ':' + source.slice(0, 100)
    if (hash === this.tokensHash) return
    this.tokensHash = hash

    if (!source.trim()) return
    this.injectTokenStyles(source)
  }

  private injectTokenStyles(source: string): void {
    try {
      const ast = this.deps.MirrorLang.parse(source)
      if (!ast.tokens || ast.tokens.length === 0) return
      const css = this.buildTokenCSS(ast.tokens)
      this.injectStyle(css)
    } catch (e) {
      console.warn('Failed to inject component preview styles:', e)
    }
  }

  private buildTokenCSS(tokens: any[]): string {
    const tokenMap = new Map<string, string>()
    for (const t of tokens) {
      tokenMap.set(t.name, t.value)
    }

    let css = ':root {\n'
    for (const token of tokens) {
      const varName = this.toVarName(token.name)
      const value = this.resolveValue(token.value, tokenMap)
      css += `  --${varName}: ${value};\n`
    }
    return css + '}\n'
  }

  private toVarName(name: string): string {
    const stripped = name.startsWith('$') ? name.slice(1) : name
    return stripped.replace(/\./g, '-')
  }

  private resolveValue(value: any, tokenMap: Map<string, string>): any {
    if (typeof value === 'string' && value.startsWith('$')) {
      const resolved = tokenMap.get(value)
      if (resolved) return this.resolveValue(resolved, tokenMap)
    }
    return value
  }

  private injectStyle(css: string): void {
    const oldStyle = document.getElementById('component-preview-tokens')
    if (oldStyle) oldStyle.remove()

    const style = document.createElement('style')
    style.id = 'component-preview-tokens'
    style.textContent = css
    document.head.appendChild(style)
  }
}
