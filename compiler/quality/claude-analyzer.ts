/**
 * Claude Analyzer
 *
 * Uses Claude CLI to analyze code quality based on static analysis.
 */

import { spawn } from 'child_process'
import type {
  StaticAnalysis,
  QualityReport,
  QualityIssue,
  CategoryScore,
  QualityConfig,
  DEFAULT_CONFIG,
} from './types'

// =============================================================================
// Claude CLI Interface
// =============================================================================

async function callClaude(prompt: string, timeoutMs = 60000): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ['-p', prompt, '--output-format', 'text']

    const claude = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let killed = false

    // Set timeout
    const timeout = setTimeout(() => {
      killed = true
      claude.kill('SIGTERM')
      reject(new Error(`Claude CLI timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    claude.stdout.on('data', data => {
      stdout += data.toString()
    })

    claude.stderr.on('data', data => {
      stderr += data.toString()
    })

    claude.on('close', code => {
      clearTimeout(timeout)
      if (killed) return // Already rejected
      if (code === 0) {
        resolve(stdout)
      } else {
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`))
      }
    })

    claude.on('error', err => {
      clearTimeout(timeout)
      reject(new Error(`Failed to spawn Claude CLI: ${err.message}`))
    })
  })
}

// =============================================================================
// Prompt Building
// =============================================================================

function buildAnalysisPrompt(code: string, analysis: StaticAnalysis): string {
  // Build a compact analysis summary
  const unusedTokens = analysis.definedTokens.filter(t => t.usageCount === 0)
  const hardcodedColors = analysis.colors.filter(c => !c.isToken)
  const repeatedPatterns = analysis.patterns.filter(p => p.count >= 2)

  return `Analyze this Mirror DSL code for design system quality. Return ONLY a JSON object.

STATIC ANALYSIS:
- ${analysis.uniqueColors} unique colors (${hardcodedColors.length} hardcoded)
- ${analysis.uniqueSpacings} unique spacings
- ${analysis.definedTokens.length} tokens defined (${unusedTokens.length} unused)
- ${analysis.definedComponents.length} components defined
- ${repeatedPatterns.length} repeated patterns that could be components
- ${analysis.propertiesInLayout.length} inline properties in layout

UNUSED TOKENS:
${
  unusedTokens
    .slice(0, 10)
    .map(t => `$${t.name}: ${t.value}`)
    .join('\n') || '(none)'
}

HARDCODED VALUES:
${
  hardcodedColors
    .slice(0, 10)
    .map(c => `${c.value} used ${c.count}x (lines: ${c.lines.slice(0, 3).join(', ')})`)
    .join('\n') || '(none)'
}

REPEATED PATTERNS:
${
  repeatedPatterns
    .slice(0, 5)
    .map(p => `"${p.sample}" (${p.count}x)`)
    .join('\n') || '(none)'
}

Return this exact JSON structure:
\`\`\`json
{
  "scores": {
    "tokenCoverage": 0-100,
    "componentAbstraction": 0-100,
    "consistency": 0-100,
    "designVariance": 0-100,
    "layoutCleanliness": 0-100
  },
  "issues": [
    {
      "category": "token-coverage|component-abstraction|consistency|design-variance|layout-cleanliness",
      "severity": "error|warning|info",
      "message": "short description",
      "lines": [1, 2, 3],
      "current": "current code",
      "suggestion": "fix suggestion",
      "reason": "why this is an issue"
    }
  ],
  "summary": "2-3 sentence summary"
}
\`\`\`

Score criteria:
- tokenCoverage: Are tokens used consistently? Hardcoded values that should be tokens?
- componentAbstraction: Are repeated patterns abstracted as components?
- consistency: Are similar elements styled consistently?
- designVariance: Too many colors/fonts/spacings? (max 12 colors, 8 spacings, 3 fonts = 100)
- layoutCleanliness: Properties on components instead of inline?`
}

// =============================================================================
// Response Parsing
// =============================================================================

interface ClaudeResponse {
  scores: {
    tokenCoverage: number
    componentAbstraction: number
    consistency: number
    designVariance: number
    layoutCleanliness: number
  }
  issues: QualityIssue[]
  summary: string
}

function parseClaudeResponse(response: string): ClaudeResponse {
  // Try to extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response')
  }

  try {
    return JSON.parse(jsonMatch[0])
  } catch (e) {
    throw new Error(`Failed to parse Claude response: ${e}`)
  }
}

// =============================================================================
// Report Building
// =============================================================================

function buildReport(response: ClaudeResponse, analysis: StaticAnalysis): QualityReport {
  const { scores, issues, summary } = response

  // Group issues by category
  const issuesByCategory = new Map<string, QualityIssue[]>()
  for (const issue of issues) {
    const existing = issuesByCategory.get(issue.category) || []
    existing.push(issue)
    issuesByCategory.set(issue.category, existing)
  }

  // Build category scores
  const categories = {
    tokenCoverage: {
      score: scores.tokenCoverage,
      issues: issuesByCategory.get('token-coverage') || [],
    },
    componentAbstraction: {
      score: scores.componentAbstraction,
      issues: issuesByCategory.get('component-abstraction') || [],
    },
    consistency: {
      score: scores.consistency,
      issues: issuesByCategory.get('consistency') || [],
    },
    designVariance: {
      score: scores.designVariance,
      issues: issuesByCategory.get('design-variance') || [],
    },
    layoutCleanliness: {
      score: scores.layoutCleanliness,
      issues: issuesByCategory.get('layout-cleanliness') || [],
    },
  }

  // Calculate overall score (weighted average)
  const weights = {
    tokenCoverage: 0.25,
    componentAbstraction: 0.25,
    consistency: 0.2,
    designVariance: 0.15,
    layoutCleanliness: 0.15,
  }

  const overallScore = Math.round(
    scores.tokenCoverage * weights.tokenCoverage +
      scores.componentAbstraction * weights.componentAbstraction +
      scores.consistency * weights.consistency +
      scores.designVariance * weights.designVariance +
      scores.layoutCleanliness * weights.layoutCleanliness
  )

  // Sort issues by severity
  const sortedIssues = [...issues].sort((a, b) => {
    const severityOrder = { error: 0, warning: 1, info: 2 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })

  return {
    overallScore,
    categories,
    issues: sortedIssues,
    summary,
    analysis,
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Analyze code quality using Claude
 */
export async function analyzeWithClaude(
  code: string,
  analysis: StaticAnalysis,
  _config?: QualityConfig
): Promise<QualityReport> {
  const prompt = buildAnalysisPrompt(code, analysis)
  try {
    return buildReport(parseClaudeResponse(await callClaude(prompt)), analysis)
  } catch (error) {
    console.error('Claude analysis failed:', error)
    return buildFallbackReport(analysis, error as Error)
  }
}

function buildFallbackReport(analysis: StaticAnalysis, error: Error): QualityReport {
  // Use heuristics to calculate scores when Claude fails
  const heuristicScores = calculateHeuristicScores(analysis)
  const heuristicIssues = generateHeuristicIssues(analysis)

  const overallScore = Math.round(
    heuristicScores.tokenCoverage * 0.25 +
      heuristicScores.componentAbstraction * 0.25 +
      heuristicScores.consistency * 0.2 +
      heuristicScores.designVariance * 0.15 +
      heuristicScores.layoutCleanliness * 0.15
  )

  return {
    overallScore,
    categories: {
      tokenCoverage: {
        score: heuristicScores.tokenCoverage,
        issues: heuristicIssues.filter(i => i.category === 'token-coverage'),
      },
      componentAbstraction: {
        score: heuristicScores.componentAbstraction,
        issues: heuristicIssues.filter(i => i.category === 'component-abstraction'),
      },
      consistency: {
        score: heuristicScores.consistency,
        issues: heuristicIssues.filter(i => i.category === 'consistency'),
      },
      designVariance: {
        score: heuristicScores.designVariance,
        issues: heuristicIssues.filter(i => i.category === 'design-variance'),
      },
      layoutCleanliness: {
        score: heuristicScores.layoutCleanliness,
        issues: heuristicIssues.filter(i => i.category === 'layout-cleanliness'),
      },
    },
    issues: heuristicIssues,
    summary: `Heuristic analysis (Claude unavailable): ${error.message}`,
    analysis,
  }
}

function calculateHeuristicScores(analysis: StaticAnalysis) {
  // Token Coverage: % of tokens actually used
  const tokenUsageRate =
    analysis.definedTokens.length > 0
      ? analysis.definedTokens.filter(t => t.usageCount > 0).length / analysis.definedTokens.length
      : 0.5
  const tokenCoverage = Math.round(tokenUsageRate * 100)

  // Component Abstraction: fewer patterns = better
  const patternPenalty = Math.min(analysis.patterns.length * 10, 50)
  const componentAbstraction = Math.max(100 - patternPenalty, 0)

  // Consistency: based on variance in similar properties
  const consistency = 70 // Default moderate score

  // Design Variance: penalize for too many unique values
  const colorPenalty = Math.max(0, (analysis.uniqueColors - 12) * 5)
  const spacingPenalty = Math.max(0, (analysis.uniqueSpacings - 8) * 5)
  const designVariance = Math.max(100 - colorPenalty - spacingPenalty, 0)

  // Layout Cleanliness: fewer inline properties = better
  const inlinePenalty = Math.min(analysis.propertiesInLayout.length * 2, 50)
  const layoutCleanliness = Math.max(100 - inlinePenalty, 0)

  return { tokenCoverage, componentAbstraction, consistency, designVariance, layoutCleanliness }
}

function generateHeuristicIssues(analysis: StaticAnalysis): QualityIssue[] {
  const issues: QualityIssue[] = []

  // Unused tokens
  const unusedTokens = analysis.definedTokens.filter(t => t.usageCount === 0)
  if (unusedTokens.length > 0) {
    issues.push({
      category: 'token-coverage',
      severity: 'warning',
      message: `${unusedTokens.length} tokens defined but never used`,
      lines: unusedTokens.map(t => t.line),
      current: unusedTokens
        .slice(0, 3)
        .map(t => `$${t.name}`)
        .join(', '),
      suggestion: 'Use these tokens or remove them',
      reason: 'Unused tokens add maintenance burden',
    })
  }

  // Too many colors
  if (analysis.uniqueColors > 12) {
    issues.push({
      category: 'design-variance',
      severity: 'warning',
      message: `${analysis.uniqueColors} unique colors (recommended max: 12)`,
      lines: [],
      suggestion: 'Consolidate similar colors into tokens',
      reason: 'Too many colors creates visual inconsistency',
    })
  }

  // Repeated patterns
  if (analysis.patterns.length > 0) {
    const topPatterns = analysis.patterns.slice(0, 3)
    for (const pattern of topPatterns) {
      issues.push({
        category: 'component-abstraction',
        severity: 'info',
        message: `Pattern repeated ${pattern.count}x could be a component`,
        lines: pattern.lines,
        current: pattern.sample,
        suggestion: 'Extract to a reusable component',
        reason: 'Repeated patterns should be components for maintainability',
      })
    }
  }

  // Inline properties
  if (analysis.propertiesInLayout.length > 10) {
    issues.push({
      category: 'layout-cleanliness',
      severity: 'info',
      message: `${analysis.propertiesInLayout.length} elements have inline styling properties`,
      lines: analysis.propertiesInLayout.slice(0, 5).map(p => p.line),
      suggestion: 'Move styling properties to component definitions',
      reason: 'Inline properties make layouts harder to maintain',
    })
  }

  return issues
}
