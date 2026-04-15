/**
 * Token Renderer
 *
 * Renders token preview for .tok files.
 * Each function is focused and < 10 lines.
 */

import type { Token, AST } from './types'

// ============================================
// TYPES
// ============================================

export interface TokenRenderDeps {
  preview: HTMLElement
  getAllProjectSource: () => string
}

type TokenMap = Map<string, string>
type TokenType = 'color' | 'spacing' | 'other'

interface TokenSection {
  name: string
  tokens: Token[]
}

// ============================================
// MAIN EXPORT
// ============================================

export class TokenRenderer {
  constructor(private deps: TokenRenderDeps) {}

  render(ast: AST): void {
    const tokens = ast.tokens || []
    if (tokens.length === 0) {
      this.renderEmpty()
      return
    }
    this.renderTokens(tokens)
  }

  private renderEmpty(): void {
    this.deps.preview.innerHTML = this.createEmptyMessage()
  }

  private createEmptyMessage(): string {
    return '<div style="color: #71717a; padding: 20px;">Keine Tokens definiert</div>'
  }

  private renderTokens(tokens: Token[]): void {
    const tokenMap = this.buildTokenMap(tokens)
    const html = this.buildHTML(tokens, tokenMap)
    this.deps.preview.innerHTML = html
  }

  // ============================================
  // TOKEN MAP
  // ============================================

  private buildTokenMap(tokens: Token[]): TokenMap {
    const map = new Map<string, string>()
    for (const t of tokens) {
      map.set(t.name, t.value)
    }
    return map
  }

  // ============================================
  // HTML GENERATION
  // ============================================

  private buildHTML(tokens: Token[], tokenMap: TokenMap): string {
    const hasSections = tokens.some(t => (t as any).section)
    return hasSections
      ? this.buildSectionedHTML(tokens, tokenMap)
      : this.buildCategorizedHTML(tokens, tokenMap)
  }

  private buildSectionedHTML(tokens: Token[], tokenMap: TokenMap): string {
    const sections = this.groupBySections(tokens)
    return sections.map(s => this.renderSection(s, tokenMap)).join('')
  }

  private buildCategorizedHTML(tokens: Token[], tokenMap: TokenMap): string {
    const categories = this.categorizeTokens(tokens, tokenMap)
    return this.renderCategories(categories, tokenMap)
  }

  // ============================================
  // SECTION GROUPING
  // ============================================

  private groupBySections(tokens: Token[]): TokenSection[] {
    const sections = new Map<string, Token[]>()
    const noSection: Token[] = []

    for (const t of tokens) {
      const section = (t as any).section
      if (section) {
        this.addToSection(sections, section, t)
      } else {
        noSection.push(t)
      }
    }

    return this.buildSectionList(sections, noSection)
  }

  private addToSection(sections: Map<string, Token[]>, name: string, token: Token): void {
    if (!sections.has(name)) {
      sections.set(name, [])
    }
    sections.get(name)!.push(token)
  }

  private buildSectionList(sections: Map<string, Token[]>, noSection: Token[]): TokenSection[] {
    const result: TokenSection[] = []
    for (const [name, tokens] of sections) {
      result.push({ name, tokens })
    }
    if (noSection.length > 0) {
      result.push({ name: 'Weitere', tokens: noSection })
    }
    return result
  }

  // ============================================
  // TOKEN CATEGORIZATION
  // ============================================

  private categorizeTokens(tokens: Token[], tokenMap: TokenMap): Record<string, Token[]> {
    return {
      colors: tokens.filter(t => this.isColorToken(t, tokenMap)),
      spacing: tokens.filter(t => this.isSpacingToken(t)),
      radius: tokens.filter(t => this.isRadiusToken(t)),
      other: tokens.filter(t => this.isOtherToken(t, tokenMap)),
    }
  }

  private isColorToken(t: Token, tokenMap: TokenMap): boolean {
    if (this.hasColorSuffix(t.name)) return true
    const resolved = this.resolveValue(t.value, tokenMap)
    return this.isDirectColor(resolved)
  }

  private hasColorSuffix(name: string): boolean {
    return name.includes('.bg') || name.includes('.col') || name.includes('.color')
  }

  private isSpacingToken(t: Token): boolean {
    const n = t.name
    return n.includes('.pad') || n.includes('.gap') || n.includes('.margin')
  }

  private isRadiusToken(t: Token): boolean {
    return t.name.includes('.rad')
  }

  private isOtherToken(t: Token, tokenMap: TokenMap): boolean {
    return !this.isColorToken(t, tokenMap) && !this.isSpacingToken(t) && !this.isRadiusToken(t)
  }

  // ============================================
  // CATEGORY RENDERING
  // ============================================

  private renderCategories(categories: Record<string, Token[]>, tokenMap: TokenMap): string {
    const sections: [string, Token[], string][] = [
      ['Farben', categories.colors, 'color'],
      ['Abstände', categories.spacing, 'spacing'],
      ['Radien', categories.radius, 'spacing'],
      ['Weitere', categories.other, 'other'],
    ]
    return sections
      .filter(([, tokens]) => tokens.length > 0)
      .map(([title, tokens, type]) => this.renderSectionHTML(title, tokens, type, tokenMap))
      .join('')
  }

  private renderSection(section: TokenSection, tokenMap: TokenMap): string {
    return this.renderSectionHTML(section.name, section.tokens, 'mixed', tokenMap)
  }

  private renderSectionHTML(
    title: string,
    tokens: Token[],
    type: string,
    tokenMap: TokenMap
  ): string {
    const rows = tokens.map(t => this.renderTokenRow(t, type, tokenMap)).join('')
    return this.wrapInSection(title, rows)
  }

  private wrapInSection(title: string, rows: string): string {
    return `
      <div class="tokens-preview-section">
        <div class="tokens-preview-section-header">${title}</div>
        <table class="tokens-preview-table">${rows}</table>
      </div>
    `
  }

  // ============================================
  // TOKEN ROW RENDERING
  // ============================================

  private renderTokenRow(token: Token, type: string, tokenMap: TokenMap): string {
    const resolvedValue = this.resolveValue(token.value, tokenMap)
    const tokenType = type === 'mixed' ? this.inferType(token, tokenMap) : type
    const visualCell = this.createVisualCell(tokenType, resolvedValue)
    const valueClass = this.getValueTypeClass(token.value)

    return this.createRowHTML(visualCell, token.name, token.value, valueClass)
  }

  private createRowHTML(visual: string, name: string, value: string, valueClass: string): string {
    return `
      <tr class="tokens-preview-row">
        <td class="tokens-preview-cell" style="width: 48px;">${visual}</td>
        <td class="tokens-preview-cell"><span class="tokens-preview-name">${name}</span></td>
        <td class="tokens-preview-cell"><span class="tokens-preview-value ${valueClass}">${value}</span></td>
      </tr>
    `
  }

  private createVisualCell(type: string, value: string): string {
    if (type === 'color') {
      return `<div class="tokens-preview-swatch" style="background: ${value}"></div>`
    }
    if (type === 'spacing') {
      return this.createSpacingVisual(value)
    }
    return ''
  }

  private createSpacingVisual(value: string): string {
    const size = parseInt(value) || 8
    const w = Math.min(size, 48)
    const h = Math.min(size, 24)
    return `<div class="tokens-preview-spacing" style="width: ${w}px; height: ${h}px;"></div>`
  }

  // ============================================
  // TYPE INFERENCE
  // ============================================

  private inferType(token: Token, tokenMap: TokenMap): TokenType {
    if (this.isColorToken(token, tokenMap)) return 'color'
    if (this.isSpacingToken(token) || this.isRadiusToken(token)) return 'spacing'
    return 'other'
  }

  private getValueTypeClass(value: string): string {
    if (typeof value !== 'string') return ''
    if (value.startsWith('#')) return 'hex'
    if (value.startsWith('$')) return 'token-ref'
    if (/^\d/.test(value)) return 'number'
    return ''
  }

  // ============================================
  // VALUE RESOLUTION
  // ============================================

  private resolveValue(value: string, tokenMap: TokenMap, visited = new Set<string>()): string {
    if (typeof value !== 'string') return value
    if (!value.startsWith('$')) return value
    if (visited.has(value)) return value
    visited.add(value)

    const resolved = tokenMap.get(value)
    if (resolved) {
      return this.resolveValue(resolved, tokenMap, visited)
    }
    return this.resolveFromSource(value)
  }

  private resolveFromSource(value: string): string {
    if (!value.startsWith('$')) return value
    const allSource = this.deps.getAllProjectSource()
    return this.findTokenValue(value, allSource)
  }

  private findTokenValue(tokenName: string, source: string): string {
    const escaped = tokenName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`^${escaped}:\\s*([^\\n]+)`, 'm')
    const match = source.match(regex)
    return match ? this.resolveFromSource(match[1].trim()) : tokenName
  }

  private isDirectColor(value: string): boolean {
    if (typeof value !== 'string') return false
    return value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')
  }
}
