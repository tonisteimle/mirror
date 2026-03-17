/**
 * Suggestion Engine for Mirror Agent
 *
 * Generates proactive suggestions based on code analysis and learned patterns.
 */

import { getMemoryStore, type MemoryStore } from './memory'

// ============================================
// TYPES
// ============================================

export interface Suggestion {
  id: string
  type: 'improvement' | 'fix' | 'pattern' | 'learned' | 'quick-action'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action?: SuggestionAction
  category?: string
  confidence?: number
}

export interface SuggestionAction {
  type: string
  prompt?: string
  command?: any
  params?: Record<string, any>
}

export interface SuggestionContext {
  code: string
  selectedElement?: {
    type: string
    line: number
    properties: Record<string, string>
  }
  cursorLine?: number
  recentChanges?: string[]
  tokens?: Record<string, string>
}

// ============================================
// SUGGESTION ENGINE
// ============================================

export class SuggestionEngine {
  private memory: MemoryStore

  constructor(memory?: MemoryStore) {
    this.memory = memory || getMemoryStore()
  }

  // ============================================
  // MAIN API
  // ============================================

  /**
   * Generate suggestions for the current context
   */
  generateSuggestions(context: SuggestionContext): Suggestion[] {
    const suggestions: Suggestion[] = []

    // 1. Code analysis suggestions
    suggestions.push(...this.analyzeCode(context))

    // 2. Selection-based suggestions
    if (context.selectedElement) {
      suggestions.push(...this.suggestForElement(context.selectedElement, context))
    }

    // 3. Pattern-based suggestions from memory
    suggestions.push(...this.getLearnedSuggestions(context))

    // 4. Quick actions
    suggestions.push(...this.getQuickActions(context))

    // Sort by priority and limit
    return this.prioritize(suggestions).slice(0, 8)
  }

  /**
   * Get inline suggestions for autocomplete
   */
  getInlineSuggestions(context: SuggestionContext, prefix: string): Suggestion[] {
    const suggestions: Suggestion[] = []

    // Property suggestions based on element type
    if (context.selectedElement) {
      suggestions.push(...this.getPropertySuggestions(
        context.selectedElement.type,
        prefix,
        context
      ))
    }

    // Value suggestions based on preferences
    suggestions.push(...this.getValueSuggestions(prefix))

    return suggestions.slice(0, 5)
  }

  // ============================================
  // CODE ANALYSIS
  // ============================================

  private analyzeCode(context: SuggestionContext): Suggestion[] {
    const suggestions: Suggestion[] = []
    const { code, tokens } = context

    // Check for hardcoded colors
    const hardcodedColors = this.findHardcodedColors(code)
    if (hardcodedColors.length > 3) {
      suggestions.push({
        id: 'extract-colors',
        type: 'improvement',
        priority: 'medium',
        title: 'Extract color tokens',
        description: `Found ${hardcodedColors.length} hardcoded colors. Extract them as tokens for consistency.`,
        action: {
          type: 'prompt',
          prompt: 'Extract all hardcoded colors as design tokens'
        },
        category: 'consistency'
      })
    }

    // Check for inconsistent spacing
    const spacingValues = this.findSpacingValues(code)
    if (spacingValues.unique > 4) {
      suggestions.push({
        id: 'standardize-spacing',
        type: 'improvement',
        priority: 'low',
        title: 'Standardize spacing',
        description: `Using ${spacingValues.unique} different spacing values. Consider using a consistent scale (4, 8, 16, 24, 32).`,
        action: {
          type: 'prompt',
          prompt: 'Standardize all spacing to use values from the scale: 4, 8, 16, 24, 32'
        },
        category: 'consistency'
      })
    }

    // Check for missing accessibility
    const a11yIssues = this.findAccessibilityIssues(code)
    if (a11yIssues.length > 0) {
      suggestions.push({
        id: 'fix-accessibility',
        type: 'fix',
        priority: 'high',
        title: 'Fix accessibility issues',
        description: `Found ${a11yIssues.length} potential accessibility issue(s): ${a11yIssues[0]}`,
        action: {
          type: 'prompt',
          prompt: 'Find and fix accessibility issues in this code'
        },
        category: 'accessibility'
      })
    }

    // Check for unused tokens
    if (tokens && Object.keys(tokens).length > 0) {
      const unusedTokens = this.findUnusedTokens(code, tokens)
      if (unusedTokens.length > 0 && unusedTokens.length < Object.keys(tokens).length) {
        // Some tokens are used, some aren't
        const usedCount = Object.keys(tokens).length - unusedTokens.length
        if (usedCount > 0) {
          suggestions.push({
            id: 'use-tokens',
            type: 'improvement',
            priority: 'low',
            title: 'Use available tokens',
            description: `${unusedTokens.length} defined tokens are not used. Consider using them for consistency.`,
            action: {
              type: 'prompt',
              prompt: 'Replace hardcoded values with available tokens where appropriate'
            },
            category: 'consistency'
          })
        }
      }
    }

    // Check for deep nesting
    const maxNesting = this.findMaxNesting(code)
    if (maxNesting > 6) {
      suggestions.push({
        id: 'reduce-nesting',
        type: 'improvement',
        priority: 'medium',
        title: 'Reduce nesting depth',
        description: `Code has ${maxNesting} levels of nesting. Consider extracting components.`,
        action: {
          type: 'prompt',
          prompt: 'Refactor deeply nested elements into separate components'
        },
        category: 'structure'
      })
    }

    return suggestions
  }

  // ============================================
  // ELEMENT-SPECIFIC SUGGESTIONS
  // ============================================

  private suggestForElement(
    element: NonNullable<SuggestionContext['selectedElement']>,
    context: SuggestionContext
  ): Suggestion[] {
    const suggestions: Suggestion[] = []
    const { type, properties } = element

    // Button without styling
    if (type === 'Button' && !properties['bg'] && !properties['background']) {
      suggestions.push({
        id: 'style-button',
        type: 'improvement',
        priority: 'low',
        title: 'Style this button',
        description: 'Add background color and padding for a polished look.',
        action: {
          type: 'prompt',
          prompt: `Style the selected Button with appropriate colors and padding`
        }
      })
    }

    // Image without dimensions
    if (type === 'Image' && !properties['w'] && !properties['h']) {
      suggestions.push({
        id: 'size-image',
        type: 'fix',
        priority: 'medium',
        title: 'Set image dimensions',
        description: 'Images should have explicit dimensions to prevent layout shift.',
        action: {
          type: 'prompt',
          prompt: 'Set appropriate width and height for the selected Image'
        }
      })
    }

    // Container without layout
    if ((type === 'Box' || type === 'Frame') && !properties['hor'] && !properties['ver'] && !properties['grid']) {
      suggestions.push({
        id: 'add-layout',
        type: 'improvement',
        priority: 'low',
        title: 'Define layout direction',
        description: 'Add hor (horizontal) or ver (vertical) for explicit layout.',
        action: {
          type: 'command',
          command: {
            type: 'SET_PROPERTY',
            property: 'ver',
            value: 'true'
          }
        }
      })
    }

    // Interactive element without cursor
    if ((type === 'Button' || type === 'Link') && !properties['cursor']) {
      // This is usually auto, so low priority
    }

    return suggestions
  }

  // ============================================
  // LEARNED SUGGESTIONS
  // ============================================

  private getLearnedSuggestions(context: SuggestionContext): Suggestion[] {
    const suggestions: Suggestion[] = []

    // Get relevant patterns from memory
    if (context.selectedElement) {
      const patterns = this.memory.findSimilarPatterns(
        `${context.selectedElement.type} style improve`
      )

      for (const pattern of patterns.slice(0, 2)) {
        if (this.memory.getPatternSuccessRate(pattern.trigger) > 0.7) {
          suggestions.push({
            id: `pattern-${pattern.trigger.slice(0, 20)}`,
            type: 'learned',
            priority: 'medium',
            title: `Apply: ${pattern.trigger}`,
            description: `Previously successful (${pattern.successCount} times)`,
            action: {
              type: pattern.action.type,
              params: pattern.action.params
            },
            confidence: this.memory.getPatternSuccessRate(pattern.trigger)
          })
        }
      }
    }

    // Get preference-based suggestions
    const colorPref = this.memory.getPreference('color', 'primary')
    if (colorPref && context.selectedElement?.type === 'Button') {
      const currentBg = context.selectedElement.properties['bg']
      if (!currentBg || currentBg !== colorPref) {
        suggestions.push({
          id: 'apply-color-pref',
          type: 'learned',
          priority: 'low',
          title: 'Use preferred primary color',
          description: `You typically use ${colorPref} for primary buttons.`,
          action: {
            type: 'command',
            command: {
              type: 'SET_PROPERTY',
              property: 'bg',
              value: colorPref
            }
          }
        })
      }
    }

    return suggestions
  }

  // ============================================
  // QUICK ACTIONS
  // ============================================

  private getQuickActions(context: SuggestionContext): Suggestion[] {
    const actions: Suggestion[] = []

    // Always available quick actions
    actions.push({
      id: 'qa-validate',
      type: 'quick-action',
      priority: 'low',
      title: 'Validate code',
      description: 'Check for syntax errors and issues.',
      action: { type: 'tool', params: { tool: 'validate' } }
    })

    // Context-specific quick actions
    if (context.selectedElement) {
      actions.push({
        id: 'qa-improve',
        type: 'quick-action',
        priority: 'medium',
        title: 'Improve element',
        description: `Suggest improvements for this ${context.selectedElement.type}.`,
        action: { type: 'prompt', prompt: `Improve the selected ${context.selectedElement.type}` }
      })

      actions.push({
        id: 'qa-duplicate',
        type: 'quick-action',
        priority: 'low',
        title: 'Duplicate element',
        description: 'Create a copy of the selected element.',
        action: {
          type: 'tool',
          params: { tool: 'duplicate_element', selector: `@${context.selectedElement.line}` }
        }
      })
    }

    return actions
  }

  // ============================================
  // PROPERTY SUGGESTIONS
  // ============================================

  private getPropertySuggestions(
    elementType: string,
    prefix: string,
    context: SuggestionContext
  ): Suggestion[] {
    const suggestions: Suggestion[] = []

    // Common properties by element type
    const typeProperties: Record<string, string[]> = {
      Box: ['hor', 'ver', 'gap', 'pad', 'bg', 'rad', 'shadow', 'center', 'spread', 'wrap'],
      Button: ['bg', 'col', 'pad', 'rad', 'shadow', 'onclick', 'disabled'],
      Text: ['fs', 'weight', 'col', 'line', 'truncate'],
      Image: ['w', 'h', 'rad', 'shadow', 'alt'],
      Input: ['pad', 'bor', 'boc', 'rad', 'type', 'placeholder'],
      Link: ['col', 'href', 'underline']
    }

    const props = typeProperties[elementType] || typeProperties['Box']

    for (const prop of props) {
      if (prop.startsWith(prefix.toLowerCase())) {
        suggestions.push({
          id: `prop-${prop}`,
          type: 'quick-action',
          priority: 'medium',
          title: prop,
          description: this.getPropertyDescription(prop),
          action: {
            type: 'insert',
            params: { text: prop }
          }
        })
      }
    }

    return suggestions
  }

  private getValueSuggestions(prefix: string): Suggestion[] {
    const suggestions: Suggestion[] = []

    // Get value preferences
    const prefs = this.memory.getAllPreferences(0.5)
    for (const pref of prefs.slice(0, 5)) {
      if (pref.value.toLowerCase().startsWith(prefix.toLowerCase())) {
        suggestions.push({
          id: `value-${pref.key}`,
          type: 'learned',
          priority: 'low',
          title: pref.value,
          description: `Preferred ${pref.category} value`,
          action: {
            type: 'insert',
            params: { text: pref.value }
          },
          confidence: pref.confidence
        })
      }
    }

    return suggestions
  }

  // ============================================
  // HELPERS
  // ============================================

  private findHardcodedColors(code: string): string[] {
    const matches = code.match(/#[0-9a-fA-F]{3,6}/g) || []
    return [...new Set(matches)]
  }

  private findSpacingValues(code: string): { values: number[]; unique: number } {
    const values: number[] = []
    const patterns = [/gap\s+(\d+)/g, /pad\s+(\d+)/g, /margin\s+(\d+)/g]

    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(code)) !== null) {
        values.push(parseInt(match[1]))
      }
    }

    return {
      values,
      unique: new Set(values).size
    }
  }

  private findAccessibilityIssues(code: string): string[] {
    const issues: string[] = []

    // Buttons without text indicators
    const buttonCount = (code.match(/Button/g) || []).length
    const buttonTextCount = (code.match(/Button[^]*?Text/g) || []).length
    if (buttonCount > buttonTextCount) {
      issues.push('Some buttons may lack text labels')
    }

    // Images without alt
    const imageCount = (code.match(/Image/g) || []).length
    const imageAltCount = (code.match(/Image[^,\n]*alt/g) || []).length
    if (imageCount > imageAltCount) {
      issues.push('Some images are missing alt text')
    }

    return issues
  }

  private findUnusedTokens(code: string, tokens: Record<string, string>): string[] {
    const unused: string[] = []
    for (const token of Object.keys(tokens)) {
      if (!code.includes(token)) {
        unused.push(token)
      }
    }
    return unused
  }

  private findMaxNesting(code: string): number {
    let maxIndent = 0
    for (const line of code.split('\n')) {
      const indent = line.match(/^(\s*)/)?.[1].length || 0
      maxIndent = Math.max(maxIndent, indent)
    }
    return Math.floor(maxIndent / 2)
  }

  private getPropertyDescription(prop: string): string {
    const descriptions: Record<string, string> = {
      hor: 'Horizontal flex layout',
      ver: 'Vertical flex layout',
      gap: 'Gap between children (px)',
      pad: 'Padding (px)',
      bg: 'Background color',
      col: 'Text color',
      rad: 'Border radius (px)',
      shadow: 'Box shadow (sm, md, lg)',
      center: 'Center children',
      spread: 'Space between children',
      wrap: 'Allow flex wrap',
      w: 'Width (px, full, hug)',
      h: 'Height (px, full, hug)',
      fs: 'Font size (px)',
      weight: 'Font weight',
      line: 'Line height',
      bor: 'Border width (px)',
      boc: 'Border color',
      truncate: 'Truncate with ellipsis'
    }
    return descriptions[prop] || ''
  }

  private prioritize(suggestions: Suggestion[]): Suggestion[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return suggestions.sort((a, b) => {
      // First by priority
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (pDiff !== 0) return pDiff

      // Then by type (fix > improvement > learned > quick-action)
      const typeOrder = { fix: 0, improvement: 1, learned: 2, pattern: 3, 'quick-action': 4 }
      return (typeOrder[a.type] || 5) - (typeOrder[b.type] || 5)
    })
  }
}

// ============================================
// SINGLETON
// ============================================

let instance: SuggestionEngine | null = null

export function getSuggestionEngine(): SuggestionEngine {
  if (!instance) {
    instance = new SuggestionEngine()
  }
  return instance
}

export function createSuggestionEngine(memory?: MemoryStore): SuggestionEngine {
  return new SuggestionEngine(memory)
}
