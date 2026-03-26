/**
 * Memory Store for Mirror Agent
 *
 * Persists preferences, patterns, and learned behaviors to server.
 */

import { getUserSettings } from '../storage/user-settings'

// ============================================
// TYPES
// ============================================

export interface MemoryEntry {
  id: string
  type: 'preference' | 'pattern' | 'correction' | 'snippet'
  key: string
  value: any
  confidence: number
  usageCount: number
  lastUsed: Date
  createdAt: Date
}

export interface Preference {
  category: 'color' | 'spacing' | 'layout' | 'typography' | 'component'
  key: string
  value: string
  confidence: number
}

export interface Pattern {
  trigger: string
  action: PatternAction
  successCount: number
  failureCount: number
}

export interface PatternAction {
  type: 'set_property' | 'add_component' | 'apply_pattern' | 'batch_edit'
  params: Record<string, any>
}

export interface Correction {
  originalRequest: string
  originalAction: any
  correctedAction: any
  timestamp: Date
}

export interface Snippet {
  name: string
  description: string
  code: string
  tags: string[]
  usageCount: number
}

export interface Interaction {
  userMessage: string
  agentActions: any[]
  accepted: boolean
  correction?: string
  timestamp: Date
}

// ============================================
// MEMORY STORE
// ============================================

export class MemoryStore {
  // Memory is in-memory only (per session)
  private entries: MemoryEntry[] = []
  private preferences: Map<string, Preference> = new Map()
  private patterns: Map<string, Pattern> = new Map()
  private corrections: Correction[] = []
  private snippets: Map<string, Snippet> = new Map()
  private recentInteractions: Interaction[] = []

  constructor() {
    this.load()
  }

  // ============================================
  // PREFERENCES
  // ============================================

  /**
   * Learn a preference from user behavior
   */
  learnPreference(category: Preference['category'], key: string, value: string): void {
    const prefKey = `${category}:${key}`
    const existing = this.preferences.get(prefKey)

    if (existing) {
      // Increase confidence if same value, decrease if different
      if (existing.value === value) {
        existing.confidence = Math.min(1, existing.confidence + 0.1)
      } else {
        existing.confidence = Math.max(0, existing.confidence - 0.2)
        if (existing.confidence < 0.3) {
          existing.value = value
          existing.confidence = 0.5
        }
      }
    } else {
      this.preferences.set(prefKey, {
        category,
        key,
        value,
        confidence: 0.5
      })
    }

    this.save()
  }

  /**
   * Get preference value if confident enough
   */
  getPreference(category: Preference['category'], key: string, minConfidence = 0.6): string | null {
    const pref = this.preferences.get(`${category}:${key}`)
    if (pref && pref.confidence >= minConfidence) {
      return pref.value
    }
    return null
  }

  /**
   * Get all preferences for a category
   */
  getPreferencesByCategory(category: Preference['category']): Preference[] {
    return Array.from(this.preferences.values())
      .filter(p => p.category === category && p.confidence >= 0.5)
      .sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Get all high-confidence preferences
   */
  getAllPreferences(minConfidence = 0.6): Preference[] {
    return Array.from(this.preferences.values())
      .filter(p => p.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
  }

  // ============================================
  // PATTERNS
  // ============================================

  /**
   * Learn a successful pattern
   */
  learnPattern(trigger: string, action: PatternAction): void {
    const key = this.normalizeText(trigger)
    const existing = this.patterns.get(key)

    if (existing) {
      existing.successCount++
      existing.action = action // Update to latest successful action
    } else {
      this.patterns.set(key, {
        trigger: key,
        action,
        successCount: 1,
        failureCount: 0
      })
    }

    this.save()
  }

  /**
   * Record a pattern failure
   */
  recordPatternFailure(trigger: string): void {
    const key = this.normalizeText(trigger)
    const existing = this.patterns.get(key)

    if (existing) {
      existing.failureCount++
      // Remove pattern if too many failures
      if (existing.failureCount > existing.successCount * 2) {
        this.patterns.delete(key)
      }
    }

    this.save()
  }

  /**
   * Find similar patterns
   */
  findSimilarPatterns(query: string, limit = 3): Pattern[] {
    const normalized = this.normalizeText(query)
    const words = normalized.split(/\s+/)

    return Array.from(this.patterns.values())
      .map(pattern => ({
        pattern,
        score: this.calculateSimilarity(pattern.trigger, normalized, words)
      }))
      .filter(({ score }) => score > 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ pattern }) => pattern)
  }

  /**
   * Get a pattern's success rate
   */
  getPatternSuccessRate(trigger: string): number {
    const pattern = this.patterns.get(this.normalizeText(trigger))
    if (!pattern) return 0
    const total = pattern.successCount + pattern.failureCount
    return total > 0 ? pattern.successCount / total : 0
  }

  // ============================================
  // CORRECTIONS
  // ============================================

  /**
   * Learn from a user correction
   */
  learnCorrection(originalRequest: string, originalAction: any, correctedAction: any): void {
    this.corrections.push({
      originalRequest,
      originalAction,
      correctedAction,
      timestamp: new Date()
    })

    // Keep only recent corrections
    if (this.corrections.length > 100) {
      this.corrections = this.corrections.slice(-100)
    }

    this.save()
  }

  /**
   * Find relevant corrections for a request
   */
  findCorrections(request: string): Correction[] {
    const normalized = this.normalizeText(request)
    return this.corrections.filter(c =>
      this.calculateSimilarity(this.normalizeText(c.originalRequest), normalized) > 0.7
    )
  }

  // ============================================
  // SNIPPETS
  // ============================================

  /**
   * Save a code snippet
   */
  saveSnippet(name: string, description: string, code: string, tags: string[] = []): void {
    this.snippets.set(name, {
      name,
      description,
      code,
      tags,
      usageCount: 0
    })
    this.save()
  }

  /**
   * Get a snippet by name
   */
  getSnippet(name: string): Snippet | null {
    const snippet = this.snippets.get(name)
    if (snippet) {
      snippet.usageCount++
      this.save()
    }
    return snippet || null
  }

  /**
   * Find snippets by tag or description
   */
  findSnippets(query: string): Snippet[] {
    const normalized = this.normalizeText(query)
    return Array.from(this.snippets.values())
      .filter(s =>
        s.tags.some(t => t.includes(normalized)) ||
        this.normalizeText(s.description).includes(normalized) ||
        this.normalizeText(s.name).includes(normalized)
      )
      .sort((a, b) => b.usageCount - a.usageCount)
  }

  // ============================================
  // INTERACTIONS
  // ============================================

  /**
   * Record an interaction
   */
  recordInteraction(interaction: Interaction): void {
    this.recentInteractions.push(interaction)

    // Keep only recent interactions
    if (this.recentInteractions.length > 50) {
      this.recentInteractions = this.recentInteractions.slice(-50)
    }

    // Learn from the interaction
    if (interaction.accepted) {
      for (const action of interaction.agentActions) {
        if (action.type && action.params) {
          this.learnPattern(interaction.userMessage, {
            type: action.type,
            params: action.params
          })
        }
      }
    } else if (interaction.correction) {
      for (const action of interaction.agentActions) {
        this.learnCorrection(
          interaction.userMessage,
          action,
          interaction.correction
        )
      }
      this.recordPatternFailure(interaction.userMessage)
    }

    this.save()
  }

  /**
   * Get recent interactions
   */
  getRecentInteractions(limit = 10): Interaction[] {
    return this.recentInteractions.slice(-limit)
  }

  // ============================================
  // CONTEXT FOR PROMPTS
  // ============================================

  /**
   * Get context to add to system prompt
   */
  getContextForPrompt(): string {
    const sections: string[] = []

    // Add preferences
    const prefs = this.getAllPreferences(0.7)
    if (prefs.length > 0) {
      const prefLines = prefs.slice(0, 10).map(p =>
        `- ${p.category}/${p.key}: ${p.value} (${Math.round(p.confidence * 100)}% confident)`
      )
      sections.push(`## Learned Preferences\n${prefLines.join('\n')}`)
    }

    // Add successful patterns
    const patterns = Array.from(this.patterns.values())
      .filter(p => p.successCount > 2 && this.getPatternSuccessRate(p.trigger) > 0.7)
      .slice(0, 5)

    if (patterns.length > 0) {
      const patternLines = patterns.map(p =>
        `- "${p.trigger}" → ${p.action.type} (${p.successCount} successes)`
      )
      sections.push(`## Successful Patterns\n${patternLines.join('\n')}`)
    }

    // Add recent corrections to avoid
    const recentCorrections = this.corrections.slice(-3)
    if (recentCorrections.length > 0) {
      const corrLines = recentCorrections.map(c =>
        `- Avoid: "${c.originalRequest}" → ${JSON.stringify(c.originalAction).slice(0, 50)}...`
      )
      sections.push(`## Recent Corrections\n${corrLines.join('\n')}`)
    }

    return sections.join('\n\n')
  }

  // ============================================
  // PERSISTENCE
  // ============================================

  private save(): void {
    // Save to server via UserSettings
    getUserSettings().setAgentMemory({
      preferences: Array.from(this.preferences.entries()),
      patterns: Array.from(this.patterns.entries()),
      corrections: this.corrections.map(c => ({
        ...c,
        timestamp: c.timestamp.toISOString(),
      })),
      snippets: Array.from(this.snippets.entries()),
    })
  }

  private load(): void {
    // Load from server via UserSettings
    const data = getUserSettings().getAgentMemory()
    if (data) {
      try {
        if (data.preferences) this.preferences = new Map(data.preferences)
        if (data.patterns) this.patterns = new Map(data.patterns)
        if (data.corrections) {
          this.corrections = data.corrections.map(c => ({
            ...c,
            timestamp: new Date(c.timestamp),
          }))
        }
        if (data.snippets) this.snippets = new Map(data.snippets)
        console.log('[MemoryStore] Loaded from server')
      } catch (e) {
        console.error('[MemoryStore] Failed to load:', e)
      }
    }
  }

  /**
   * Clear all memory
   */
  clear(): void {
    this.preferences.clear()
    this.patterns.clear()
    this.corrections = []
    this.snippets.clear()
    this.recentInteractions = []
    getUserSettings().clearAgentMemory()
  }

  /**
   * Export memory as JSON
   */
  export(): string {
    return JSON.stringify({
      preferences: Array.from(this.preferences.entries()),
      patterns: Array.from(this.patterns.entries()),
      corrections: this.corrections,
      snippets: Array.from(this.snippets.entries())
    }, null, 2)
  }

  /**
   * Import memory from JSON
   */
  import(json: string): void {
    try {
      const data = JSON.parse(json)
      if (data.preferences) this.preferences = new Map(data.preferences)
      if (data.patterns) this.patterns = new Map(data.patterns)
      if (data.corrections) this.corrections = data.corrections
      if (data.snippets) this.snippets = new Map(data.snippets)
      this.save()
    } catch (e) {
      console.error('Failed to import memory:', e)
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  private normalizeText(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, ' ')
  }

  private calculateSimilarity(a: string, b: string, bWords?: string[]): number {
    const wordsA = a.split(/\s+/)
    const wordsB = bWords || b.split(/\s+/)

    let matches = 0
    for (const word of wordsA) {
      if (wordsB.includes(word)) matches++
    }

    const maxLen = Math.max(wordsA.length, wordsB.length)
    return maxLen > 0 ? matches / maxLen : 0
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let instance: MemoryStore | null = null

export function getMemoryStore(): MemoryStore {
  if (!instance) {
    instance = new MemoryStore()
  }
  return instance
}

export function createMemoryStore(): MemoryStore {
  return new MemoryStore()
}
