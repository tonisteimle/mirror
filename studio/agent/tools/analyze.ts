/**
 * Analyze Tools for Mirror Agent
 *
 * Tools for code analysis, explanation, and suggestions.
 */

import type { Tool, ToolContext, ToolResult } from '../types'

// ============================================
// INTERNAL TYPES
// ============================================

interface ParsedElement {
  type: string
  line: number
  depth: number
  hasText: boolean
  hasEvents: number
}

interface CodeAnalysis {
  totalLines: number
  elementCount: number
  maxNestingDepth: number
  componentTypes: Record<string, number>
  tokenCount: number
  eventCount: number
  uniqueEvents: string[]
}

interface PropertyDifference {
  property: string
  element1: string
  element2: string
}

interface PropertySimilarity {
  property: string
  value: string
}

interface ElementComparison {
  element1: { type: string; line: number }
  element2: { type: string; line: number }
  sameType: boolean
  differenceCount: number
  differences: PropertyDifference[]
  similarities: PropertySimilarity[]
}

interface CodeStats {
  totalLines: number
  elementCount: number
  tokenCount: number
  commentCount: number
  emptyLines: number
  codeLines: number
  componentTypes: Record<string, number>
  mostUsedComponent: string
}

// ============================================
// EXPLAIN TOOL
// ============================================

export const explainTool: Tool = {
  name: 'explain',
  description: `Analyzes and explains Mirror DSL code structure.

Returns a structured analysis of the code including:
- Component hierarchy
- Layout structure
- Styling overview
- Interaction handlers`,
  parameters: {
    selector: {
      type: 'string',
      description: 'Element selector to explain (or omit for full code)',
      required: false
    }
  },
  execute: async ({ selector }, ctx: ToolContext): Promise<ToolResult> => {
    const code = ctx.getCode()
    const lines = code.split('\n')

    const analysis = analyzeCode(lines, selector)

    return {
      success: true,
      data: analysis
    }
  }
}

// ============================================
// FIND ISSUES TOOL
// ============================================

export const findIssuesTool: Tool = {
  name: 'find_issues',
  description: `Scans code for potential issues and improvements.

Checks for:
- Accessibility issues (missing labels, contrast)
- Consistency issues (spacing, colors)
- Best practice violations
- Performance concerns`,
  parameters: {
    category: {
      type: 'string',
      description: 'Issue category: "all", "accessibility", "consistency", "performance"',
      required: false,
      enum: ['all', 'accessibility', 'consistency', 'performance']
    }
  },
  execute: async ({ category = 'all' }, ctx: ToolContext): Promise<ToolResult> => {
    const code = ctx.getCode()
    const issues: Issue[] = []

    if (category === 'all' || category === 'accessibility') {
      issues.push(...findAccessibilityIssues(code))
    }

    if (category === 'all' || category === 'consistency') {
      issues.push(...findConsistencyIssues(code))
    }

    if (category === 'all' || category === 'performance') {
      issues.push(...findPerformanceIssues(code))
    }

    return {
      success: true,
      data: {
        issueCount: issues.length,
        issues: issues.slice(0, 10), // Limit to 10 issues
        summary: generateIssueSummary(issues)
      }
    }
  }
}

// ============================================
// SUGGEST TOOL
// ============================================

export const suggestTool: Tool = {
  name: 'suggest',
  description: `Provides suggestions for improving the code.

Can suggest:
- Layout improvements
- Visual enhancements
- Accessibility improvements
- Code organization`,
  parameters: {
    focus: {
      type: 'string',
      description: 'Focus area: "layout", "visual", "accessibility", "organization"',
      required: false
    },
    selector: {
      type: 'string',
      description: 'Element to focus suggestions on',
      required: false
    }
  },
  execute: async ({ focus, selector }, ctx: ToolContext): Promise<ToolResult> => {
    const code = ctx.getCode()
    const suggestions: Suggestion[] = []

    if (!focus || focus === 'layout') {
      suggestions.push(...getLayoutSuggestions(code, selector))
    }

    if (!focus || focus === 'visual') {
      suggestions.push(...getVisualSuggestions(code, selector))
    }

    if (!focus || focus === 'accessibility') {
      suggestions.push(...getAccessibilitySuggestions(code, selector))
    }

    if (!focus || focus === 'organization') {
      suggestions.push(...getOrganizationSuggestions(code))
    }

    return {
      success: true,
      data: {
        suggestionCount: suggestions.length,
        suggestions: suggestions.slice(0, 5)
      }
    }
  }
}

// ============================================
// COMPARE TOOL
// ============================================

export const compareTool: Tool = {
  name: 'compare_elements',
  description: `Compares two elements to find differences.

Useful for:
- Finding why elements look different
- Identifying missing properties
- Consistency checks`,
  parameters: {
    element1: {
      type: 'string',
      description: 'First element selector',
      required: true
    },
    element2: {
      type: 'string',
      description: 'Second element selector',
      required: true
    }
  },
  execute: async ({ element1, element2 }, ctx: ToolContext): Promise<ToolResult> => {
    const code = ctx.getCode()
    const lines = code.split('\n')

    const el1 = findElementBySelector(element1, lines)
    const el2 = findElementBySelector(element2, lines)

    if (!el1) {
      return { success: false, error: `Element not found: ${element1}` }
    }
    if (!el2) {
      return { success: false, error: `Element not found: ${element2}` }
    }

    const comparison = compareElements(el1, el2)

    return {
      success: true,
      data: comparison
    }
  }
}

// ============================================
// STATS TOOL
// ============================================

export const statsTool: Tool = {
  name: 'code_stats',
  description: 'Returns statistics about the current code.',
  parameters: {},
  execute: async (_, ctx: ToolContext): Promise<ToolResult> => {
    const code = ctx.getCode()
    const lines = code.split('\n')

    const stats = calculateStats(lines)

    return {
      success: true,
      data: stats
    }
  }
}

// ============================================
// TYPES
// ============================================

interface Issue {
  severity: 'error' | 'warning' | 'info'
  category: string
  message: string
  line?: number
  fix?: string
}

interface Suggestion {
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  action?: string
}

interface ElementInfo {
  type: string
  line: number
  endLine: number
  properties: Record<string, string>
  code: string
}

// ============================================
// ANALYSIS HELPERS
// ============================================

function analyzeCode(lines: string[], selector?: string): CodeAnalysis {
  const elements: ParsedElement[] = []
  const tokens: string[] = []
  const events: string[] = []
  let depth = 0
  let maxDepth = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) continue

    // Token definitions (legacy with $ or new without $)
    // e.g., "$primary.bg: #2271C1" or "primary.bg: #2271C1"
    if (trimmed.startsWith('$') || /^[a-z][a-zA-Z0-9_-]*\.[a-z]+\s*:/.test(trimmed)) {
      tokens.push(trimmed.split(':')[0])
      continue
    }

    // Components
    if (/^[A-Z]/.test(trimmed)) {
      const indent = line.match(/^(\s*)/)?.[1].length || 0
      depth = Math.floor(indent / 2)
      maxDepth = Math.max(maxDepth, depth)

      const type = trimmed.match(/^([A-Z][a-zA-Z0-9]*)/)?.[1] || 'Unknown'

      // Find events
      const eventMatches = trimmed.match(/on\w+/g)
      if (eventMatches) {
        events.push(...eventMatches)
      }

      elements.push({
        type,
        line: i + 1,
        depth,
        hasText: trimmed.includes('"'),
        hasEvents: eventMatches?.length || 0
      })
    }
  }

  // Count component types
  const componentCounts: Record<string, number> = {}
  for (const el of elements) {
    componentCounts[el.type] = (componentCounts[el.type] || 0) + 1
  }

  return {
    totalLines: lines.length,
    elementCount: elements.length,
    maxNestingDepth: maxDepth,
    componentTypes: componentCounts,
    tokenCount: tokens.length,
    eventCount: events.length,
    uniqueEvents: [...new Set(events)]
  }
}

function findAccessibilityIssues(code: string): Issue[] {
  const issues: Issue[] = []
  const lines = code.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Buttons without text
    if (trimmed.startsWith('Button') && !trimmed.includes('"') && !trimmed.includes('Text')) {
      // Check if next line has Text
      const nextLine = lines[i + 1]?.trim()
      if (!nextLine?.startsWith('Text') && !nextLine?.includes('Icon')) {
        issues.push({
          severity: 'warning',
          category: 'accessibility',
          message: 'Button may be missing accessible text',
          line: i + 1,
          fix: 'Add text content or aria-label'
        })
      }
    }

    // Images without alt
    if (trimmed.startsWith('Image') && !trimmed.includes('alt')) {
      issues.push({
        severity: 'warning',
        category: 'accessibility',
        message: 'Image missing alt text',
        line: i + 1,
        fix: 'Add alt "description" property'
      })
    }

    // Low contrast colors
    if (trimmed.includes('col #fff') && trimmed.includes('bg #fff')) {
      issues.push({
        severity: 'error',
        category: 'accessibility',
        message: 'White text on white background - no contrast',
        line: i + 1
      })
    }
  }

  return issues
}

function findConsistencyIssues(code: string): Issue[] {
  const issues: Issue[] = []

  // Find all gap values
  const gaps = code.match(/gap \d+/g) || []
  const uniqueGaps = [...new Set(gaps)]
  if (uniqueGaps.length > 3) {
    issues.push({
      severity: 'info',
      category: 'consistency',
      message: `${uniqueGaps.length} different gap values used. Consider standardizing.`,
      fix: 'Use consistent gap values: 4, 8, 16, 24, 32'
    })
  }

  // Find hardcoded colors
  const colors = code.match(/#[0-9a-fA-F]{3,6}/g) || []
  const uniqueColors = [...new Set(colors)]
  if (uniqueColors.length > 5) {
    issues.push({
      severity: 'info',
      category: 'consistency',
      message: `${uniqueColors.length} hardcoded colors found. Consider using tokens.`,
      fix: 'Extract colors as $tokens'
    })
  }

  // Find all padding values
  const pads = code.match(/pad \d+/g) || []
  const uniquePads = [...new Set(pads)]
  if (uniquePads.length > 4) {
    issues.push({
      severity: 'info',
      category: 'consistency',
      message: `${uniquePads.length} different padding values. Consider a spacing scale.`,
      fix: 'Use consistent padding: 4, 8, 12, 16, 24'
    })
  }

  return issues
}

function findPerformanceIssues(code: string): Issue[] {
  const issues: Issue[] = []
  const lines = code.split('\n')

  // Deep nesting
  let maxIndent = 0
  for (const line of lines) {
    const indent = line.match(/^(\s*)/)?.[1].length || 0
    maxIndent = Math.max(maxIndent, indent)
  }
  if (maxIndent > 16) { // 8 levels
    issues.push({
      severity: 'warning',
      category: 'performance',
      message: `Deep nesting detected (${Math.floor(maxIndent / 2)} levels). Consider flattening.`
    })
  }

  // Too many elements
  const elementCount = lines.filter(l => /^\s*[A-Z]/.test(l)).length
  if (elementCount > 100) {
    issues.push({
      severity: 'warning',
      category: 'performance',
      message: `Large component (${elementCount} elements). Consider splitting.`
    })
  }

  return issues
}

function generateIssueSummary(issues: Issue[]): string {
  const errors = issues.filter(i => i.severity === 'error').length
  const warnings = issues.filter(i => i.severity === 'warning').length
  const infos = issues.filter(i => i.severity === 'info').length

  if (issues.length === 0) {
    return 'No issues found!'
  }

  return `Found ${issues.length} issue(s): ${errors} error(s), ${warnings} warning(s), ${infos} suggestion(s)`
}

function getLayoutSuggestions(code: string, selector?: string): Suggestion[] {
  const suggestions: Suggestion[] = []

  // Check for missing gap
  if (code.includes('hor') && !code.includes('gap')) {
    suggestions.push({
      title: 'Add gap to horizontal layouts',
      description: 'Horizontal layouts often need gap for spacing between children.',
      impact: 'medium',
      action: 'Add gap 8 or gap 16 to hor elements'
    })
  }

  // Check for missing center
  if (code.includes('Button') && !code.includes('center')) {
    suggestions.push({
      title: 'Center button content',
      description: 'Buttons typically look better with centered content.',
      impact: 'low',
      action: 'Add center property to Button elements'
    })
  }

  return suggestions
}

function getVisualSuggestions(code: string, selector?: string): Suggestion[] {
  const suggestions: Suggestion[] = []

  // No shadows
  if (!code.includes('shadow')) {
    suggestions.push({
      title: 'Add depth with shadows',
      description: 'Cards and modals benefit from subtle shadows.',
      impact: 'low',
      action: 'Add shadow sm to card-like elements'
    })
  }

  // No radius
  if (!code.includes('rad')) {
    suggestions.push({
      title: 'Round corners',
      description: 'Rounded corners create a softer, modern look.',
      impact: 'low',
      action: 'Add rad 4 or rad 8 to boxes and buttons'
    })
  }

  return suggestions
}

function getAccessibilitySuggestions(code: string, selector?: string): Suggestion[] {
  const suggestions: Suggestion[] = []

  if (code.includes('Icon') && !code.includes('aria-label')) {
    suggestions.push({
      title: 'Add labels to icon-only buttons',
      description: 'Icon-only buttons need aria-label for screen readers.',
      impact: 'high',
      action: 'Add aria-label to buttons with only icons'
    })
  }

  return suggestions
}

function getOrganizationSuggestions(code: string): Suggestion[] {
  const suggestions: Suggestion[] = []

  const lines = code.split('\n')
  // Count token lines (legacy with $ or new syntax name.suffix:)
  const tokenLines = lines.filter(l => {
    const trimmed = l.trim()
    return trimmed.startsWith('$') || /^[a-z][a-zA-Z0-9_-]*\.[a-z]+\s*:/.test(trimmed)
  }).length

  if (tokenLines === 0 && code.match(/#[0-9a-fA-F]{3,6}/g)?.length || 0 > 3) {
    suggestions.push({
      title: 'Extract design tokens',
      description: 'Define colors, spacing, and other values as tokens for consistency.',
      impact: 'high',
      action: 'Add accent.bg: #007bff and similar tokens at the top'
    })
  }

  return suggestions
}

function findElementBySelector(selector: string, lines: string[]): ElementInfo | null {
  if (selector.startsWith('@')) {
    const lineNum = parseInt(selector.slice(1), 10)
    if (lineNum < 1 || lineNum > lines.length) return null
    const line = lines[lineNum - 1]
    const trimmed = line.trim()
    if (!trimmed || !/^[A-Z]/.test(trimmed)) return null
    const type = trimmed.match(/^([A-Z][a-zA-Z0-9]*)/)?.[1] || ''
    return { type, line: lineNum, endLine: lineNum, properties: {}, code: trimmed }
  }

  // Type selector
  const typeMatch = selector.match(/^([A-Z][a-zA-Z0-9]*)(?::(\d+))?$/)
  if (typeMatch) {
    const typeName = typeMatch[1]
    const index = typeMatch[2] ? parseInt(typeMatch[2], 10) : 1
    let count = 0
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.startsWith(typeName + ' ') || line === typeName) {
        count++
        if (count === index) {
          return { type: typeName, line: i + 1, endLine: i + 1, properties: {}, code: line }
        }
      }
    }
  }

  return null
}

function compareElements(el1: ElementInfo, el2: ElementInfo): ElementComparison {
  const props1 = parsePropsFromCode(el1.code)
  const props2 = parsePropsFromCode(el2.code)

  const allKeys = [...new Set([...Object.keys(props1), ...Object.keys(props2)])]

  const differences: PropertyDifference[] = []
  const similarities: PropertySimilarity[] = []

  for (const key of allKeys) {
    if (props1[key] === props2[key]) {
      similarities.push({ property: key, value: props1[key] })
    } else {
      differences.push({
        property: key,
        element1: props1[key] || '(not set)',
        element2: props2[key] || '(not set)'
      })
    }
  }

  return {
    element1: { type: el1.type, line: el1.line },
    element2: { type: el2.type, line: el2.line },
    sameType: el1.type === el2.type,
    differenceCount: differences.length,
    differences,
    similarities
  }
}

function parsePropsFromCode(code: string): Record<string, string> {
  const props: Record<string, string> = {}
  const match = code.match(/^[A-Z][a-zA-Z0-9]*\s*(.*)$/)
  if (!match) return props

  let rest = match[1]
  // Remove text content
  rest = rest.replace(/"[^"]*"/g, '')

  const parts = rest.split(',').map(p => p.trim()).filter(Boolean)
  for (const part of parts) {
    const tokens = part.split(/\s+/)
    if (tokens.length >= 1 && tokens[0]) {
      props[tokens[0]] = tokens.slice(1).join(' ') || 'true'
    }
  }

  return props
}

function calculateStats(lines: string[]): CodeStats {
  let elementCount = 0
  let tokenCount = 0
  let commentCount = 0
  let emptyLines = 0
  const componentTypes: Record<string, number> = {}

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      emptyLines++
      continue
    }

    if (trimmed.startsWith('//')) {
      commentCount++
      continue
    }

    // Token definitions (legacy with $ or new syntax name.suffix:)
    if (trimmed.startsWith('$') || /^[a-z][a-zA-Z0-9_-]*\.[a-z]+\s*:/.test(trimmed)) {
      tokenCount++
      continue
    }

    if (/^[A-Z]/.test(trimmed)) {
      elementCount++
      const type = trimmed.match(/^([A-Z][a-zA-Z0-9]*)/)?.[1]
      if (type) {
        componentTypes[type] = (componentTypes[type] || 0) + 1
      }
    }
  }

  return {
    totalLines: lines.length,
    elementCount,
    tokenCount,
    commentCount,
    emptyLines,
    codeLines: lines.length - emptyLines - commentCount,
    componentTypes,
    mostUsedComponent: Object.entries(componentTypes)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none'
  }
}

// ============================================
// EXPORT ALL TOOLS
// ============================================

export const analyzeTools: Tool[] = [
  explainTool,
  findIssuesTool,
  suggestTool,
  compareTool,
  statsTool
]
