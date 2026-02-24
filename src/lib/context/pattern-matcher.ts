/**
 * Pattern Matcher
 *
 * Detects common UI patterns in Mirror DSL code.
 * Part of Enhanced Context Provider (Increment 8).
 */

import type { CodeContext } from '../analysis/context-analyzer'

/**
 * Detected UI pattern
 */
export interface DetectedPattern {
  type: PatternType
  confidence: number       // 0-1 confidence score
  components: string[]     // Components involved in the pattern
  location?: string        // Where in the code (component name)
  suggestions: string[]    // How to extend this pattern
}

/**
 * Known pattern types
 */
export type PatternType =
  | 'form'
  | 'card-list'
  | 'navigation'
  | 'modal'
  | 'tabs'
  | 'accordion'
  | 'data-table'
  | 'dashboard'
  | 'sidebar-layout'
  | 'header-footer'
  | 'search-filter'
  | 'authentication'
  | 'settings-panel'

/**
 * Pattern detection result
 */
export interface PatternAnalysis {
  patterns: DetectedPattern[]
  primaryPattern: PatternType | null
  recommendations: PatternRecommendation[]
}

export interface PatternRecommendation {
  pattern: PatternType
  reason: string
  priority: 'high' | 'medium' | 'low'
}

// Pattern indicators - keywords and component names that suggest patterns
const PATTERN_INDICATORS: Record<PatternType, {
  names: RegExp[]
  properties: string[]
  childPatterns: string[]
}> = {
  'form': {
    names: [/form/i, /login/i, /register/i, /signup/i, /contact/i, /checkout/i],
    properties: ['validation', 'oninput', 'onchange', 'onsubmit'],
    childPatterns: ['Input', 'Textarea', 'Button', 'Label', 'Field', 'Error']
  },
  'card-list': {
    names: [/card/i, /tile/i, /item/i, /product/i, /article/i],
    properties: ['grid', 'gap'],
    childPatterns: ['Card', 'Tile', 'Item', 'each']
  },
  'navigation': {
    names: [/nav/i, /menu/i, /sidebar/i, /toolbar/i, /breadcrumb/i],
    properties: ['horizontal', 'onclick'],
    childPatterns: ['Link', 'Item', 'MenuItem', 'NavItem']
  },
  'modal': {
    names: [/modal/i, /dialog/i, /popup/i, /overlay/i, /drawer/i],
    properties: ['stacked', 'hidden', 'z'],
    childPatterns: ['Header', 'Body', 'Footer', 'Close', 'Backdrop']
  },
  'tabs': {
    names: [/tab/i, /tabbar/i, /tabpanel/i],
    properties: ['onclick', 'state'],
    childPatterns: ['Tab', 'Panel', 'Content']
  },
  'accordion': {
    names: [/accordion/i, /collapse/i, /expand/i, /section/i],
    properties: ['toggle', 'expanded', 'collapsed'],
    childPatterns: ['Header', 'Content', 'Panel', 'Section']
  },
  'data-table': {
    names: [/table/i, /grid/i, /list/i, /data/i],
    properties: ['grid', 'each'],
    childPatterns: ['Row', 'Cell', 'Header', 'Column']
  },
  'dashboard': {
    names: [/dashboard/i, /overview/i, /analytics/i, /admin/i],
    properties: ['horizontal', 'grid'],
    childPatterns: ['Panel', 'Card', 'Widget', 'Chart', 'Stats']
  },
  'sidebar-layout': {
    names: [/sidebar/i, /aside/i, /drawer/i],
    properties: ['horizontal', 'width'],
    childPatterns: ['Sidebar', 'Main', 'Content']
  },
  'header-footer': {
    names: [/header/i, /footer/i, /page/i, /layout/i],
    properties: ['vertical'],
    childPatterns: ['Header', 'Content', 'Footer', 'Main']
  },
  'search-filter': {
    names: [/search/i, /filter/i, /query/i],
    properties: ['oninput', 'filter'],
    childPatterns: ['Input', 'Results', 'Filter', 'Clear']
  },
  'authentication': {
    names: [/auth/i, /login/i, /signup/i, /password/i, /forgot/i],
    properties: ['validation'],
    childPatterns: ['Input', 'Button', 'Link', 'Error', 'Form']
  },
  'settings-panel': {
    names: [/setting/i, /config/i, /preference/i, /option/i],
    properties: ['toggle', 'onchange'],
    childPatterns: ['Toggle', 'Switch', 'Select', 'Input', 'Label']
  }
}

/**
 * Detects patterns in the code context
 */
export function detectPatterns(context: CodeContext): PatternAnalysis {
  const patterns: DetectedPattern[] = []

  // Check each pattern type
  for (const [patternType, indicators] of Object.entries(PATTERN_INDICATORS)) {
    const result = checkPattern(
      patternType as PatternType,
      indicators,
      context
    )
    if (result) {
      patterns.push(result)
    }
  }

  // Sort by confidence
  patterns.sort((a, b) => b.confidence - a.confidence)

  // Determine primary pattern
  const primaryPattern = patterns.length > 0 && patterns[0].confidence > 0.5
    ? patterns[0].type
    : null

  // Generate recommendations
  const recommendations = generatePatternRecommendations(patterns, context)

  return {
    patterns,
    primaryPattern,
    recommendations
  }
}

/**
 * Checks if a specific pattern is present
 */
function checkPattern(
  type: PatternType,
  indicators: typeof PATTERN_INDICATORS[PatternType],
  context: CodeContext
): DetectedPattern | null {
  let confidence = 0
  const matchedComponents: string[] = []
  let location: string | undefined

  // Check component names
  const allComponentNames = [
    ...context.components.definitionNames,
    ...(context.layout.analysis.root ? [context.layout.analysis.root.name] : []),
    ...context.layout.sections
  ]

  for (const name of allComponentNames) {
    for (const pattern of indicators.names) {
      if (pattern.test(name)) {
        confidence += 0.3
        matchedComponents.push(name)
        if (!location) location = name
      }
    }
  }

  // Check for child patterns in slots
  for (const childPattern of indicators.childPatterns) {
    const lower = childPattern.toLowerCase()
    const hasSlot = context.components.slotNames.some(s =>
      s.toLowerCase().includes(lower)
    )
    const hasDef = context.components.definitionNames.some(d =>
      d.toLowerCase().includes(lower)
    )

    if (hasSlot || hasDef) {
      confidence += 0.15
      if (hasDef) {
        matchedComponents.push(childPattern)
      }
    }
  }

  // Check layout properties
  if (context.layout.rootLayout) {
    if (indicators.properties.includes(context.layout.rootLayout)) {
      confidence += 0.1
    }
  }

  // Cap confidence at 1.0
  confidence = Math.min(1.0, confidence)

  // Only return if confidence is significant
  if (confidence >= 0.2) {
    return {
      type,
      confidence,
      components: [...new Set(matchedComponents)],
      location,
      suggestions: getPatternSuggestions(type)
    }
  }

  return null
}

/**
 * Gets suggestions for extending a pattern
 */
function getPatternSuggestions(type: PatternType): string[] {
  const suggestions: Record<PatternType, string[]> = {
    'form': [
      'Füge Validierung für Pflichtfelder hinzu',
      'Ergänze Error-Messages unter Inputs',
      'Füge Loading-State für Submit hinzu'
    ],
    'card-list': [
      'Füge Hover-States für Cards hinzu',
      'Ergänze Empty-State für leere Liste',
      'Füge Pagination oder Load-More hinzu'
    ],
    'navigation': [
      'Füge Active-State für aktiven Menüpunkt hinzu',
      'Ergänze Icons für bessere Orientierung',
      'Füge Keyboard-Navigation hinzu'
    ],
    'modal': [
      'Füge Close-Button hinzu',
      'Ergänze Backdrop-Click zum Schließen',
      'Füge Escape-Taste zum Schließen hinzu'
    ],
    'tabs': [
      'Füge Active-State für aktiven Tab hinzu',
      'Ergänze Keyboard-Navigation',
      'Füge Übergangsanimation hinzu'
    ],
    'accordion': [
      'Füge Expand/Collapse-Icons hinzu',
      'Ermögliche mehrere offene Sektionen',
      'Füge Animation für Öffnen/Schließen hinzu'
    ],
    'data-table': [
      'Füge Sortierung für Spalten hinzu',
      'Ergänze Filter-Funktion',
      'Füge Pagination hinzu'
    ],
    'dashboard': [
      'Füge Refresh-Funktion für Widgets hinzu',
      'Ermögliche Layout-Anpassung',
      'Füge Date-Range-Filter hinzu'
    ],
    'sidebar-layout': [
      'Füge Toggle für Sidebar hinzu',
      'Ergänze Responsive-Verhalten',
      'Füge minimierte Sidebar-Variante hinzu'
    ],
    'header-footer': [
      'Füge Sticky-Header hinzu',
      'Ergänze Breadcrumb-Navigation',
      'Füge Back-to-Top Button hinzu'
    ],
    'search-filter': [
      'Füge Debounce für Suche hinzu',
      'Ergänze Clear-Button',
      'Füge Suchvorschläge hinzu'
    ],
    'authentication': [
      'Füge Password-Visibility-Toggle hinzu',
      'Ergänze "Passwort vergessen" Link',
      'Füge Loading-State hinzu'
    ],
    'settings-panel': [
      'Füge Save-Button hinzu',
      'Ergänze Reset-Funktion',
      'Füge Unsaved-Changes-Warnung hinzu'
    ]
  }

  return suggestions[type] || []
}

/**
 * Generates recommendations based on detected patterns
 */
function generatePatternRecommendations(
  patterns: DetectedPattern[],
  context: CodeContext
): PatternRecommendation[] {
  const recommendations: PatternRecommendation[] = []

  // If we have forms, recommend validation
  if (patterns.some(p => p.type === 'form')) {
    if (!hasValidation(context)) {
      recommendations.push({
        pattern: 'form',
        reason: 'Formular ohne Validierung erkannt',
        priority: 'high'
      })
    }
  }

  // If we have navigation, recommend active states
  if (patterns.some(p => p.type === 'navigation')) {
    recommendations.push({
      pattern: 'navigation',
      reason: 'Navigation könnte Active-States benötigen',
      priority: 'medium'
    })
  }

  // If we have card-list without empty state
  if (patterns.some(p => p.type === 'card-list')) {
    recommendations.push({
      pattern: 'card-list',
      reason: 'Liste sollte Empty-State haben',
      priority: 'medium'
    })
  }

  // If we have modal, recommend escape handling
  if (patterns.some(p => p.type === 'modal')) {
    recommendations.push({
      pattern: 'modal',
      reason: 'Modal sollte mit Escape schließbar sein',
      priority: 'medium'
    })
  }

  // If no clear pattern, suggest structure
  if (patterns.length === 0 || !patterns.some(p => p.confidence > 0.5)) {
    recommendations.push({
      pattern: 'dashboard',
      reason: 'Kein klares Pattern erkannt - Struktur empfohlen',
      priority: 'low'
    })
  }

  return recommendations
}

/**
 * Checks if code has validation indicators
 */
function hasValidation(context: CodeContext): boolean {
  // This would need access to raw code, but we can check naming
  return context.components.definitionNames.some(n =>
    /valid|error|message/i.test(n)
  ) || context.components.slotNames.some(s =>
    /error|valid|message/i.test(s)
  )
}

/**
 * Finds patterns that match a user request
 */
export function findMatchingPatterns(
  request: string,
  availablePatterns: DetectedPattern[]
): DetectedPattern[] {
  const requestLower = request.toLowerCase()

  // Keywords that suggest patterns
  const keywords: Record<string, PatternType[]> = {
    'formular': ['form', 'authentication'],
    'form': ['form', 'authentication'],
    'login': ['authentication', 'form'],
    'karte': ['card-list'],
    'card': ['card-list'],
    'liste': ['card-list', 'data-table'],
    'list': ['card-list', 'data-table'],
    'navigation': ['navigation', 'tabs'],
    'menu': ['navigation'],
    'tab': ['tabs'],
    'modal': ['modal'],
    'dialog': ['modal'],
    'popup': ['modal'],
    'tabelle': ['data-table'],
    'table': ['data-table'],
    'dashboard': ['dashboard'],
    'sidebar': ['sidebar-layout'],
    'suche': ['search-filter'],
    'search': ['search-filter'],
    'filter': ['search-filter'],
    'einstellungen': ['settings-panel'],
    'settings': ['settings-panel'],
    'accordion': ['accordion']
  }

  const matchingTypes = new Set<PatternType>()

  for (const [keyword, patterns] of Object.entries(keywords)) {
    if (requestLower.includes(keyword)) {
      patterns.forEach(p => matchingTypes.add(p))
    }
  }

  return availablePatterns.filter(p => matchingTypes.has(p.type))
}

/**
 * Gets pattern-specific context for LLM
 */
export function getPatternContext(pattern: DetectedPattern): string {
  const lines: string[] = [
    `Pattern: ${pattern.type}`,
    `Konfidenz: ${Math.round(pattern.confidence * 100)}%`,
  ]

  if (pattern.components.length > 0) {
    lines.push(`Komponenten: ${pattern.components.join(', ')}`)
  }

  if (pattern.location) {
    lines.push(`Ort: ${pattern.location}`)
  }

  lines.push('')
  lines.push('Empfehlungen:')
  pattern.suggestions.slice(0, 3).forEach(s => {
    lines.push(`- ${s}`)
  })

  return lines.join('\n')
}

/**
 * Suggests a pattern for new component creation
 */
export function suggestPatternForComponent(
  componentType: string,
  context: CodeContext
): PatternType | null {
  const lower = componentType.toLowerCase()

  // Direct mappings
  if (/form|login|register|signup/i.test(lower)) return 'form'
  if (/card|tile|item/i.test(lower)) return 'card-list'
  if (/nav|menu/i.test(lower)) return 'navigation'
  if (/modal|dialog|popup/i.test(lower)) return 'modal'
  if (/tab/i.test(lower)) return 'tabs'
  if (/accordion|collapse/i.test(lower)) return 'accordion'
  if (/table|grid/i.test(lower) && /data/i.test(lower)) return 'data-table'
  if (/dashboard/i.test(lower)) return 'dashboard'
  if (/search|filter/i.test(lower)) return 'search-filter'
  if (/setting|config/i.test(lower)) return 'settings-panel'

  // Check existing patterns
  const analysis = detectPatterns(context)
  return analysis.primaryPattern
}
