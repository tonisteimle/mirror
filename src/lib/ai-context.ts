/**
 * Mirror Code Intelligence
 *
 * AST-basierte Analyse für kontextbewusste Code-Generierung.
 * Analysiert bestehenden Code und findet relevanten Kontext für LLM-Prompts.
 */

import { parse } from '../parser/parser'
import type { ParseResult, ComponentTemplate, TokenValue } from '../parser/types'

// =============================================================================
// Types
// =============================================================================

export interface CursorContext {
  line: number
  column: number
  indent: number
  /** Parent component at cursor position */
  parent?: {
    name: string
    properties: string[]
    line: number
  }
  /** What comes before/after cursor */
  surroundings: {
    linesBefore: string[]
    linesAfter: string[]
    currentLine: string
  }
}

export interface ComponentInfo {
  name: string
  definition: string
  properties: string[]
  slots: string[]
  usageCount: number
  /** Lines where this component is used */
  usageLines: number[]
}

export interface TokenInfo {
  name: string
  value: string
  type: 'color' | 'number' | 'string' | 'unknown'
  /** Components that use this token */
  usedBy: string[]
}

export interface GenerationContext {
  /** User's original prompt */
  prompt: string
  /** Where to insert (null = append at end) */
  insertion: CursorContext | null
  /** Relevant components to reuse */
  relevantComponents: ComponentInfo[]
  /** Relevant tokens to use */
  relevantTokens: TokenInfo[]
  /** Suggested approach */
  suggestion: GenerationSuggestion
}

export interface GenerationSuggestion {
  action: 'reuse' | 'extend' | 'create'
  /** If reuse: which component */
  component?: string
  /** If extend: base component */
  baseComponent?: string
  /** Recommended indent */
  indent: number
  /** Brief explanation */
  reason: string
}

// =============================================================================
// Code Intelligence Class
// =============================================================================

export class MirrorCodeIntelligence {
  private parseResult: ParseResult
  private sourceCode: string
  private lines: string[]
  // Cache for expensive operations
  private _componentsCache: ComponentInfo[] | null = null
  private _tokensCache: TokenInfo[] | null = null

  constructor(sourceCode: string) {
    this.sourceCode = sourceCode
    this.lines = sourceCode.split('\n')
    this.parseResult = parse(sourceCode)
  }

  // ---------------------------------------------------------------------------
  // Component Analysis
  // ---------------------------------------------------------------------------

  /**
   * Get all defined components with their usage info (cached)
   */
  getComponents(): ComponentInfo[] {
    if (this._componentsCache) return this._componentsCache

    const components: ComponentInfo[] = []

    for (const [name, template] of this.parseResult.registry) {
      const properties = this.extractProperties(template)
      const slots = this.extractSlots(template)
      const usage = this.findComponentUsage(name)

      components.push({
        name,
        definition: this.reconstructDefinition(template),
        properties,
        slots,
        usageCount: usage.length,
        usageLines: usage,
      })
    }

    this._componentsCache = components
    return components
  }

  /**
   * Find components similar to a query (by name or purpose)
   */
  findSimilarComponents(query: string): ComponentInfo[] {
    const queryLower = query.toLowerCase()
    const components = this.getComponents()

    // Score each component
    const scored = components.map(comp => {
      let score = 0
      const nameLower = comp.name.toLowerCase()

      // Exact match
      if (nameLower === queryLower) score += 100
      // Name contains query
      if (nameLower.includes(queryLower)) score += 50
      // Query contains name
      if (queryLower.includes(nameLower)) score += 30
      // Semantic matches
      if (this.semanticMatch(queryLower, nameLower)) score += 40
      // Higher usage = more relevant
      score += Math.min(comp.usageCount * 5, 25)

      return { comp, score }
    })

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(s => s.comp)
  }

  // ---------------------------------------------------------------------------
  // Token Analysis
  // ---------------------------------------------------------------------------

  /**
   * Get all defined tokens with usage info (cached)
   */
  getTokens(): TokenInfo[] {
    if (this._tokensCache) return this._tokensCache

    const tokens: TokenInfo[] = []

    for (const [name, value] of this.parseResult.tokens) {
      const stringValue = this.tokenValueToString(value)
      tokens.push({
        name: `$${name}`,
        value: stringValue,
        type: this.inferTokenType(stringValue),
        usedBy: this.findTokenUsage(name),
      })
    }

    this._tokensCache = tokens
    return tokens
  }

  /**
   * Find tokens relevant to a context
   */
  findRelevantTokens(context: string): TokenInfo[] {
    const contextLower = context.toLowerCase()
    const tokens = this.getTokens()

    // Keywords that suggest certain token types
    const colorKeywords = ['button', 'background', 'text', 'color', 'bg', 'primary', 'accent']
    const spacingKeywords = ['padding', 'margin', 'gap', 'space', 'size']

    const wantsColor = colorKeywords.some(k => contextLower.includes(k))
    const wantsSpacing = spacingKeywords.some(k => contextLower.includes(k))

    return tokens.filter(token => {
      // Always include if token name matches context
      if (contextLower.includes(token.name.replace('$', '').toLowerCase())) {
        return true
      }
      // Include color tokens if context suggests colors
      if (wantsColor && token.type === 'color') {
        return true
      }
      // Include number tokens if context suggests spacing
      if (wantsSpacing && token.type === 'number') {
        return true
      }
      // Include highly-used tokens
      if (token.usedBy.length >= 3) {
        return true
      }
      return false
    })
  }

  // ---------------------------------------------------------------------------
  // Cursor Context Analysis
  // ---------------------------------------------------------------------------

  /**
   * Analyze the context at a cursor position
   */
  analyzeCursorContext(line: number, column: number): CursorContext {
    const currentLine = this.lines[line] || ''
    const indent = this.getIndent(currentLine)

    // Find parent component
    const parent = this.findParentComponent(line)

    // Get surrounding lines
    const surroundings = {
      linesBefore: this.lines.slice(Math.max(0, line - 5), line),
      linesAfter: this.lines.slice(line + 1, line + 6),
      currentLine,
    }

    return {
      line,
      column,
      indent,
      parent,
      surroundings,
    }
  }

  /**
   * Find the parent component that contains a given line
   */
  private findParentComponent(line: number): CursorContext['parent'] | undefined {
    const currentIndent = this.getIndent(this.lines[line] || '')

    // Walk backwards to find a less-indented component definition
    for (let i = line - 1; i >= 0; i--) {
      const checkLine = this.lines[i]
      const checkIndent = this.getIndent(checkLine)

      // Found a less-indented line
      if (checkIndent < currentIndent) {
        // Check if it's a component definition or instance
        const match = checkLine.match(/^\s*(\w+)(?:\s+|:)/)
        if (match) {
          return {
            name: match[1],
            properties: this.extractPropertiesFromLine(checkLine),
            line: i,
          }
        }
      }
    }

    return undefined
  }

  // ---------------------------------------------------------------------------
  // Generation Context Builder
  // ---------------------------------------------------------------------------

  /**
   * Build complete context for LLM generation
   */
  buildGenerationContext(
    prompt: string,
    cursorLine?: number,
    cursorColumn?: number
  ): GenerationContext {
    // Analyze cursor if provided
    const insertion = cursorLine !== undefined
      ? this.analyzeCursorContext(cursorLine, cursorColumn || 0)
      : null

    // Find relevant components
    const relevantComponents = this.findSimilarComponents(prompt).slice(0, 3)

    // Find relevant tokens
    const relevantTokens = this.findRelevantTokens(prompt).slice(0, 5)

    // Suggest approach
    const suggestion = this.suggestApproach(prompt, relevantComponents, insertion)

    return {
      prompt,
      insertion,
      relevantComponents,
      relevantTokens,
      suggestion,
    }
  }

  /**
   * Suggest the best approach for generation
   */
  private suggestApproach(
    prompt: string,
    components: ComponentInfo[],
    insertion: CursorContext | null
  ): GenerationSuggestion {
    const indent = insertion?.indent ?? 0
    const promptLower = prompt.toLowerCase()

    // Check if user wants to create something similar to existing component
    if (components.length > 0) {
      const bestMatch = components[0]

      // High usage = proven pattern, suggest reuse
      if (bestMatch.usageCount >= 2) {
        return {
          action: 'reuse',
          component: bestMatch.name,
          indent,
          reason: `"${bestMatch.name}" existiert bereits und wird ${bestMatch.usageCount}x verwendet`,
        }
      }

      // Component exists but low usage, suggest extend
      if (promptLower.includes('ähnlich') || promptLower.includes('wie')) {
        return {
          action: 'extend',
          baseComponent: bestMatch.name,
          indent,
          reason: `Basierend auf "${bestMatch.name}" erweitern`,
        }
      }
    }

    // Default: create new
    return {
      action: 'create',
      indent,
      reason: 'Neue Komponente erstellen',
    }
  }

  // ---------------------------------------------------------------------------
  // Format Context for LLM
  // ---------------------------------------------------------------------------

  /**
   * Format the context as a string for the LLM prompt
   */
  formatContextForLLM(context: GenerationContext): string {
    const parts: string[] = []

    // Insertion context
    if (context.insertion) {
      const { parent, indent } = context.insertion
      parts.push('## Einfüge-Position')
      if (parent) {
        parts.push(`- In: ${parent.name}`)
        parts.push(`- Parent-Properties: ${parent.properties.join(', ') || 'keine'}`)
      }
      parts.push(`- Einrückung: ${indent} Spaces`)
    }

    // Available components
    if (context.relevantComponents.length > 0) {
      parts.push('\n## Verfügbare Komponenten')
      for (const comp of context.relevantComponents) {
        parts.push(`- ${comp.name}: ${comp.definition}`)
        if (comp.slots.length > 0) {
          parts.push(`  Slots: ${comp.slots.join(', ')}`)
        }
      }
    }

    // Available tokens
    if (context.relevantTokens.length > 0) {
      parts.push('\n## Verfügbare Tokens')
      for (const token of context.relevantTokens) {
        parts.push(`- ${token.name}: ${token.value}`)
      }
    }

    // Suggestion
    parts.push('\n## Empfehlung')
    const { suggestion } = context
    if (suggestion.action === 'reuse' && suggestion.component) {
      parts.push(`Nutze die existierende "${suggestion.component}" Komponente.`)
    } else if (suggestion.action === 'extend' && suggestion.baseComponent) {
      parts.push(`Erweitere "${suggestion.baseComponent}" mit zusätzlichen Properties.`)
    } else {
      parts.push('Erstelle eine neue Komponente/Instanz.')
    }

    return parts.join('\n')
  }

  // ---------------------------------------------------------------------------
  // Helper Methods
  // ---------------------------------------------------------------------------

  private getIndent(line: string): number {
    const match = line.match(/^(\s*)/)
    return match ? match[1].length : 0
  }

  private extractProperties(template: ComponentTemplate): string[] {
    // Extract property names from template
    const props: string[] = []
    if (template.properties && typeof template.properties === 'object') {
      for (const key of Object.keys(template.properties)) {
        props.push(key)
      }
    }
    return props
  }

  private extractSlots(template: ComponentTemplate): string[] {
    // Extract slot names from template children
    const slots: string[] = []
    if (template.children) {
      for (const child of template.children) {
        if (child.name) {
          slots.push(child.name)
        }
      }
    }
    return slots
  }

  private reconstructDefinition(template: ComponentTemplate): string {
    // Reconstruct a brief definition string
    const props: string[] = []
    if (template.properties && typeof template.properties === 'object') {
      for (const [key, value] of Object.entries(template.properties)) {
        if (value === undefined || value === null) continue
        if (typeof value === 'string' || typeof value === 'number') {
          props.push(`${key} ${value}`)
        } else if (typeof value === 'boolean' && value) {
          props.push(key)
        } else {
          props.push(key)
        }
      }
    }
    return props.slice(0, 5).join(' ') + (props.length > 5 ? ' ...' : '')
  }

  private findComponentUsage(name: string): number[] {
    const lines: number[] = []
    const pattern = new RegExp(`^\\s*${name}\\b`, 'i')

    for (let i = 0; i < this.lines.length; i++) {
      if (pattern.test(this.lines[i]) && !this.lines[i].includes(':')) {
        lines.push(i)
      }
    }

    return lines
  }

  private findTokenUsage(tokenName: string): string[] {
    const users: Set<string> = new Set()
    const pattern = new RegExp(`\\$${tokenName}\\b`)

    for (const line of this.lines) {
      if (pattern.test(line)) {
        const match = line.match(/^\s*(\w+)/)
        if (match) {
          users.add(match[1])
        }
      }
    }

    return Array.from(users)
  }

  private tokenValueToString(value: TokenValue): string {
    if (typeof value === 'string') return value
    if (typeof value === 'number') return String(value)
    if (value && typeof value === 'object' && 'value' in value) {
      return String(value.value)
    }
    return String(value)
  }

  private inferTokenType(value: string): TokenInfo['type'] {
    if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return 'color'
    if (/^\d+(\.\d+)?$/.test(value)) return 'number'
    if (/^".*"$/.test(value)) return 'string'
    return 'unknown'
  }

  private extractPropertiesFromLine(line: string): string[] {
    // Simple extraction of property-like words
    const props: string[] = []
    const words = line.trim().split(/\s+/)

    for (let i = 1; i < words.length; i++) {
      const word = words[i]
      if (word && !word.startsWith('"') && !word.startsWith('#') && !word.startsWith('$')) {
        if (/^[a-z]/.test(word)) {
          props.push(word)
        }
      }
    }

    return props.slice(0, 5)
  }

  private semanticMatch(query: string, name: string): boolean {
    const synonyms: Record<string, string[]> = {
      button: ['btn', 'action', 'submit', 'click'],
      card: ['panel', 'box', 'container', 'tile'],
      input: ['field', 'textfield', 'form'],
      header: ['nav', 'navbar', 'top'],
      text: ['label', 'title', 'heading', 'paragraph'],
      list: ['menu', 'items', 'stack'],
    }

    for (const [key, values] of Object.entries(synonyms)) {
      if ((query.includes(key) || values.some(v => query.includes(v))) &&
          (name.includes(key) || values.some(v => name.includes(v)))) {
        return true
      }
    }

    return false
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Quick analysis of code for generation context
 */
export function analyzeCodeForGeneration(
  sourceCode: string,
  prompt: string,
  cursorLine?: number,
  cursorColumn?: number
): GenerationContext {
  const intelligence = new MirrorCodeIntelligence(sourceCode)
  return intelligence.buildGenerationContext(prompt, cursorLine, cursorColumn)
}

/**
 * Format context as LLM prompt section
 */
export function formatContextForPrompt(
  sourceCode: string,
  prompt: string,
  cursorLine?: number,
  cursorColumn?: number
): string {
  const intelligence = new MirrorCodeIntelligence(sourceCode)
  const context = intelligence.buildGenerationContext(prompt, cursorLine, cursorColumn)
  return intelligence.formatContextForLLM(context)
}
