/**
 * Preview Renderer Module
 *
 * Orchestrates rendering for different preview modes.
 */

import type { AST, TokenDefinition, ComponentDefinition } from '../../src/parser/ast'

export type PreviewMode = 'tokens' | 'component' | 'layout'

export interface PreviewData {
  mode: PreviewMode
  ast?: AST
  jsCode?: string
  runtime?: string
}

export interface RendererConfig {
  container: HTMLElement
  nodeIdAttribute?: string
}

export abstract class BaseRenderer {
  protected container: HTMLElement
  protected nodeIdAttribute: string

  constructor(config: RendererConfig) {
    this.container = config.container
    this.nodeIdAttribute = config.nodeIdAttribute ?? 'data-mirror-id'
  }

  abstract render(data: unknown): void
  abstract clear(): void
}

export class PreviewRenderer {
  private container: HTMLElement
  private nodeIdAttribute: string
  private currentMode: PreviewMode = 'tokens'

  constructor(config: RendererConfig) {
    this.container = config.container
    this.nodeIdAttribute = config.nodeIdAttribute ?? 'data-mirror-id'
  }

  render(data: PreviewData): void {
    this.currentMode = data.mode
    this.clear()

    switch (data.mode) {
      case 'tokens':
        if (data.ast) this.renderTokens(data.ast.tokens)
        break
      case 'component':
        if (data.ast) this.renderComponents(data.ast.components)
        break
      case 'layout':
        if (data.jsCode) this.renderLayout(data.jsCode, data.runtime)
        break
    }
  }

  clear(): void {
    // Clean up global createUI function from previous renders
    if (typeof (window as any).createUI === 'function') {
      delete (window as any).createUI
    }
    this.container.innerHTML = ''
  }

  getMode(): PreviewMode {
    return this.currentMode
  }

  private renderTokens(tokens: TokenDefinition[]): void {
    const fragment = document.createDocumentFragment()

    // Group by section
    const sections = new Map<string, TokenDefinition[]>()
    for (const token of tokens) {
      const section = token.section || 'Tokens'
      if (!sections.has(section)) sections.set(section, [])
      sections.get(section)!.push(token)
    }

    for (const [sectionName, sectionTokens] of sections) {
      const section = document.createElement('div')
      section.className = 'preview-token-section'

      const header = document.createElement('h3')
      header.className = 'preview-section-header'
      header.textContent = sectionName
      section.appendChild(header)

      const grid = document.createElement('div')
      grid.className = 'preview-token-grid'

      for (const token of sectionTokens) {
        grid.appendChild(this.renderToken(token))
      }

      section.appendChild(grid)
      fragment.appendChild(section)
    }

    this.container.appendChild(fragment)
  }

  private renderToken(token: TokenDefinition): HTMLElement {
    const item = document.createElement('div')
    item.className = `preview-token-item ${token.tokenType || ''}`
    item.setAttribute(this.nodeIdAttribute, token.nodeId || `token_${token.name}`)

    const preview = document.createElement('div')
    preview.className = 'preview-token-preview'

    if (token.tokenType === 'color' || this.isColor(String(token.value))) {
      preview.style.backgroundColor = String(token.value)
    } else if (token.tokenType === 'icon') {
      preview.innerHTML = `<span class="icon">${token.value}</span>`
    } else {
      preview.textContent = String(token.value)
    }
    item.appendChild(preview)

    const name = document.createElement('div')
    name.className = 'preview-token-name'
    name.textContent = `$${token.name}`
    item.appendChild(name)

    const value = document.createElement('div')
    value.className = 'preview-token-value'
    value.textContent = String(token.value)
    item.appendChild(value)

    return item
  }

  private renderComponents(components: ComponentDefinition[]): void {
    const fragment = document.createDocumentFragment()

    for (const comp of components) {
      fragment.appendChild(this.renderComponentCard(comp))
    }

    this.container.appendChild(fragment)
  }

  private renderComponentCard(comp: ComponentDefinition): HTMLElement {
    const card = document.createElement('div')
    card.className = 'preview-component-card'
    card.setAttribute(this.nodeIdAttribute, comp.nodeId || `comp_${comp.name}`)

    const header = document.createElement('div')
    header.className = 'preview-component-header'

    const name = document.createElement('span')
    name.className = 'preview-component-name'
    name.textContent = comp.name
    header.appendChild(name)

    if (comp.extends || comp.primitive) {
      const type = document.createElement('span')
      type.className = 'preview-component-type'
      type.textContent = comp.extends || comp.primitive || ''
      header.appendChild(type)
    }
    card.appendChild(header)

    // Properties summary
    if (comp.properties.length > 0) {
      const props = document.createElement('div')
      props.className = 'preview-component-props'
      props.textContent = comp.properties.map(p => p.name).join(', ')
      card.appendChild(props)
    }

    // Children count
    if (comp.children.length > 0) {
      const children = document.createElement('div')
      children.className = 'preview-component-children'
      children.textContent = `${comp.children.length} child${comp.children.length > 1 ? 'ren' : ''}`
      card.appendChild(children)
    }

    return card
  }

  private renderLayout(jsCode: string, runtime?: string): void {
    // Create a sandboxed container for layout preview
    const sandbox = document.createElement('div')
    sandbox.className = 'preview-layout-sandbox'

    // Inject runtime if provided
    if (runtime) {
      const script = document.createElement('script')
      script.textContent = runtime
      sandbox.appendChild(script)
    }

    // Execute layout code
    try {
      const layoutScript = document.createElement('script')
      layoutScript.textContent = `
        (function() {
          ${jsCode}
          if (typeof createUI === 'function') {
            const root = document.querySelector('.preview-layout-sandbox');
            if (root) createUI(root);
          }
        })();
      `
      this.container.appendChild(sandbox)
      this.container.appendChild(layoutScript)
    } catch (error) {
      const errorEl = document.createElement('div')
      errorEl.className = 'preview-error'
      errorEl.textContent = `Preview error: ${(error as Error).message}`
      this.container.appendChild(errorEl)
    }
  }

  private isColor(value: string): boolean {
    return /^#[0-9a-fA-F]{3,8}$/.test(value) ||
           /^(rgb|hsl)a?\(/.test(value)
  }
}

export function createPreviewRenderer(config: RendererConfig): PreviewRenderer {
  return new PreviewRenderer(config)
}
