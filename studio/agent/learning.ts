/**
 * Learning Module for Mirror Agent
 *
 * Connects memory, suggestions, and agent interactions.
 */

import { getMemoryStore, type MemoryStore, type Interaction } from './memory'
import { getSuggestionEngine, type SuggestionEngine, type Suggestion, type SuggestionContext } from './suggestions'
import type { AgentEvent, LLMCommand } from './types'

// ============================================
// TYPES
// ============================================

export interface LearningConfig {
  /** Enable learning from interactions */
  enabled?: boolean
  /** Minimum confidence to apply learned patterns */
  minConfidence?: number
  /** Maximum suggestions to show */
  maxSuggestions?: number
  /** Auto-apply high-confidence patterns */
  autoApply?: boolean
}

export interface FeedbackData {
  messageId: string
  accepted: boolean
  correction?: string
  rating?: 1 | 2 | 3 | 4 | 5
}

// ============================================
// LEARNING MANAGER
// ============================================

export class LearningManager {
  private memory: MemoryStore
  private suggestions: SuggestionEngine
  private config: Required<LearningConfig>
  private pendingInteraction: Partial<Interaction> | null = null
  private codeBeforeChange: string = ''

  constructor(config: LearningConfig = {}) {
    this.memory = getMemoryStore()
    this.suggestions = getSuggestionEngine()
    this.config = {
      enabled: config.enabled ?? true,
      minConfidence: config.minConfidence ?? 0.6,
      maxSuggestions: config.maxSuggestions ?? 5,
      autoApply: config.autoApply ?? false
    }
  }

  // ============================================
  // INTERACTION TRACKING
  // ============================================

  /**
   * Start tracking an interaction
   */
  startInteraction(userMessage: string, code: string): void {
    if (!this.config.enabled) return

    this.codeBeforeChange = code
    this.pendingInteraction = {
      userMessage,
      agentActions: [],
      timestamp: new Date()
    }
  }

  /**
   * Track an agent event during interaction
   */
  trackEvent(event: AgentEvent): void {
    if (!this.config.enabled || !this.pendingInteraction) return

    if (event.type === 'command' && event.command) {
      this.pendingInteraction.agentActions?.push(event.command)
    }

    if (event.type === 'tool_end' && event.result?.commands) {
      for (const cmd of event.result.commands) {
        this.pendingInteraction.agentActions?.push(cmd)
      }
    }
  }

  /**
   * Complete interaction with feedback
   */
  completeInteraction(feedback: FeedbackData): void {
    if (!this.config.enabled || !this.pendingInteraction) return

    const interaction: Interaction = {
      userMessage: this.pendingInteraction.userMessage || '',
      agentActions: this.pendingInteraction.agentActions || [],
      accepted: feedback.accepted,
      correction: feedback.correction,
      timestamp: this.pendingInteraction.timestamp || new Date()
    }

    this.memory.recordInteraction(interaction)

    // Learn from commands
    if (feedback.accepted) {
      this.learnFromAcceptedCommands(interaction)
    }

    // Reset
    this.pendingInteraction = null
    this.codeBeforeChange = ''
  }

  /**
   * Auto-complete interaction (user didn't explicitly reject)
   */
  autoComplete(): void {
    if (!this.pendingInteraction) return

    // If there were commands and user didn't reject, assume accepted
    const hasCommands = (this.pendingInteraction.agentActions?.length || 0) > 0
    if (hasCommands) {
      this.completeInteraction({ messageId: '', accepted: true })
    } else {
      this.pendingInteraction = null
    }
  }

  // ============================================
  // LEARNING FROM COMMANDS
  // ============================================

  private learnFromAcceptedCommands(interaction: Interaction): void {
    for (const action of interaction.agentActions) {
      const cmd = action as LLMCommand

      // Learn color preferences
      if (cmd.type === 'SET_PROPERTY') {
        if (cmd.property === 'bg' || cmd.property === 'background') {
          this.memory.learnPreference('color', 'background', String(cmd.value))
        }
        if (cmd.property === 'col' || cmd.property === 'color') {
          this.memory.learnPreference('color', 'text', String(cmd.value))
        }
        if (cmd.property === 'pad' || cmd.property === 'padding') {
          this.memory.learnPreference('spacing', 'padding', String(cmd.value))
        }
        if (cmd.property === 'gap') {
          this.memory.learnPreference('spacing', 'gap', String(cmd.value))
        }
        if (cmd.property === 'rad' || cmd.property === 'radius') {
          this.memory.learnPreference('spacing', 'radius', String(cmd.value))
        }
      }
    }
  }

  // ============================================
  // SUGGESTIONS
  // ============================================

  /**
   * Get suggestions for current context
   */
  getSuggestions(context: SuggestionContext): Suggestion[] {
    if (!this.config.enabled) return []

    const suggestions = this.suggestions.generateSuggestions(context)

    // Filter by confidence if learned
    return suggestions
      .filter(s => !s.confidence || s.confidence >= this.config.minConfidence)
      .slice(0, this.config.maxSuggestions)
  }

  /**
   * Get inline suggestions for autocomplete
   */
  getInlineSuggestions(context: SuggestionContext, prefix: string): Suggestion[] {
    if (!this.config.enabled) return []
    return this.suggestions.getInlineSuggestions(context, prefix)
  }

  /**
   * Apply a suggestion
   */
  applySuggestion(suggestion: Suggestion): SuggestionAction | null {
    if (!suggestion.action) return null

    // Track that this suggestion was used
    if (suggestion.type === 'learned' || suggestion.type === 'pattern') {
      // Increase confidence for learned patterns
      const trigger = suggestion.title.replace('Apply: ', '')
      const patterns = this.memory.findSimilarPatterns(trigger)
      if (patterns[0]) {
        this.memory.learnPattern(patterns[0].trigger, patterns[0].action)
      }
    }

    return suggestion.action
  }

  // ============================================
  // DYNAMIC PROMPT CONTEXT
  // ============================================

  /**
   * Get additional context for system prompt
   */
  getPromptContext(): string {
    if (!this.config.enabled) return ''
    return this.memory.getContextForPrompt()
  }

  /**
   * Enhance user prompt with learned context
   */
  enhancePrompt(userPrompt: string): string {
    if (!this.config.enabled) return userPrompt

    const similarPatterns = this.memory.findSimilarPatterns(userPrompt)

    if (similarPatterns.length > 0 && this.memory.getPatternSuccessRate(similarPatterns[0].trigger) > 0.8) {
      // Add hint about successful pattern
      return `${userPrompt}

[Note: A similar request "${similarPatterns[0].trigger}" has been successful before using ${similarPatterns[0].action.type}]`
    }

    // Check for corrections to avoid
    const corrections = this.memory.findCorrections(userPrompt)
    if (corrections.length > 0) {
      const recent = corrections[corrections.length - 1]
      return `${userPrompt}

[Note: Avoid the approach used previously for "${recent.originalRequest}" which was corrected]`
    }

    return userPrompt
  }

  // ============================================
  // CODE SNIPPETS
  // ============================================

  /**
   * Save current code as a snippet
   */
  saveSnippet(name: string, description: string, code: string, tags: string[] = []): void {
    this.memory.saveSnippet(name, description, code, tags)
  }

  /**
   * Find snippets
   */
  findSnippets(query: string): Array<{ name: string; description: string; code: string }> {
    return this.memory.findSnippets(query)
  }

  // ============================================
  // SETTINGS
  // ============================================

  /**
   * Update learning config
   */
  updateConfig(config: Partial<LearningConfig>): void {
    Object.assign(this.config, config)
  }

  /**
   * Clear all learned data
   */
  clearMemory(): void {
    this.memory.clear()
  }

  /**
   * Export learned data
   */
  exportMemory(): string {
    return this.memory.export()
  }

  /**
   * Import learned data
   */
  importMemory(json: string): void {
    this.memory.import(json)
  }

  // ============================================
  // STATS
  // ============================================

  /**
   * Get learning stats
   */
  getStats(): LearningStats {
    const prefs = this.memory.getAllPreferences(0)
    const interactions = this.memory.getRecentInteractions(50)

    const accepted = interactions.filter(i => i.accepted).length
    const total = interactions.length

    return {
      preferencesLearned: prefs.length,
      interactionsRecorded: total,
      acceptanceRate: total > 0 ? accepted / total : 0,
      topPreferences: prefs.slice(0, 5).map(p => ({
        key: `${p.category}/${p.key}`,
        value: p.value,
        confidence: p.confidence
      }))
    }
  }
}

export interface LearningStats {
  preferencesLearned: number
  interactionsRecorded: number
  acceptanceRate: number
  topPreferences: Array<{ key: string; value: string; confidence: number }>
}

interface SuggestionAction {
  type: string
  prompt?: string
  command?: unknown
  params?: Record<string, unknown>
}

// ============================================
// SINGLETON
// ============================================

let instance: LearningManager | null = null

export function getLearningManager(): LearningManager {
  if (!instance) {
    instance = new LearningManager()
  }
  return instance
}

export function createLearningManager(config?: LearningConfig): LearningManager {
  return new LearningManager(config)
}
