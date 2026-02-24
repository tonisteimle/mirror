/**
 * @module validation/pipeline/validate
 * @description Unified validation entry point
 *
 * This is the SINGLE entry point for all validation in the Mirror DSL.
 * It supports different modes for different use cases:
 * - 'ast': Validate parsed AST (for parser output)
 * - 'llm': Validate and correct LLM-generated code (with auto-correction)
 * - 'live': Real-time editor validation (optimized for speed)
 *
 * Features incremental validation with caching for optimal editor performance.
 */

import type { ValidationResult, Diagnostic, DiagnosticCategory } from '../core'
import { ValidationResultBuilder, hasErrors, sortDiagnostics } from '../core'
import type { ParseResult } from '../../parser/types'
import { VALID_PROPERTIES, COLOR_PROPERTIES, NUMBER_PROPERTIES, isValidProperty, VALUE_CONSTRAINTS } from '../schema/property-schema.generated'
import { VALID_EVENTS, VALID_ACTIONS, VALID_ANIMATIONS, isValidEvent, isValidAction } from '../schema/event-schema.generated'
import { BUILT_IN_COMPONENTS } from '../../parser/component-parser/constants'
import { findClosestMatch } from '../../utils/fuzzy-search'
import { applyAllFixes } from '../../lib/self-healing/fix-pipeline'

// ============================================
// Validation Cache for Incremental Validation
// ============================================

interface CacheEntry {
  lineHash: string
  diagnostics: Diagnostic[]
  timestamp: number
}

interface ValidationCache {
  lines: Map<number, CacheEntry>
  globalContext: {
    definedTokens: Set<string>
    definedComponents: Set<string>
    lastFullHash: string
  }
  lastCode: string
}

const validationCache: ValidationCache = {
  lines: new Map(),
  globalContext: {
    definedTokens: new Set(),
    definedComponents: new Set(),
    lastFullHash: ''
  },
  lastCode: ''
}

// Cache expiry time (5 minutes)
const CACHE_EXPIRY_MS = 5 * 60 * 1000

/**
 * Simple string hash for cache key generation
 */
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

/**
 * Clear the validation cache
 */
export function clearValidationCache(): void {
  validationCache.lines.clear()
  validationCache.globalContext.definedTokens.clear()
  validationCache.globalContext.definedComponents.clear()
  validationCache.globalContext.lastFullHash = ''
  validationCache.lastCode = ''
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): { cachedLines: number; hitRate?: number } {
  return {
    cachedLines: validationCache.lines.size
  }
}

// ============================================
// Validation Options
// ============================================

export type ValidationMode = 'ast' | 'llm' | 'live'

export interface ValidationOptions {
  /** Validation mode */
  mode?: ValidationMode
  /** Enable auto-correction (mainly for LLM mode) */
  autoCorrect?: boolean
  /** Treat warnings as errors */
  strictMode?: boolean
  /** Skip certain validation categories */
  skip?: DiagnosticCategory[]
  /** Maximum number of diagnostics to return */
  maxDiagnostics?: number
  /** Include info-level diagnostics */
  includeInfo?: boolean
}

const DEFAULT_OPTIONS: Required<ValidationOptions> = {
  mode: 'ast',
  autoCorrect: false,
  strictMode: false,
  skip: [],
  maxDiagnostics: 100,
  includeInfo: false,
}

// ============================================
// Correction Maps for Auto-Correction
// ============================================

const CSS_TO_DSL: Record<string, string> = {
  'flex-wrap': 'wrap',
  'flex-grow': 'grow',
  'background-color': 'background',
  'border-radius': 'radius',
  'font-size': 'size',
  'font-weight': 'weight',
  'font-family': 'font',
  'space-between': 'between',
}

const COMMON_TYPOS: Record<string, string> = {
  'horizonal': 'horizontal',
  'verticle': 'vertical',
  'centre': 'center',
  'centered': 'center',
  'padd': 'padding',
  'marg': 'margin',
  'backgrnd': 'background',
  'colour': 'color',
  'radi': 'radius',
  'rounded': 'radius',
  'bord': 'border',
  'sz': 'size',
  'wgt': 'weight',
  'widt': 'width',
  'heigh': 'height',
  'gp': 'gap',
  'spacing': 'gap',
  'opac': 'opacity',
}

// ============================================
// Main Validation Function
// ============================================

/**
 * Unified validation function
 *
 * @param input - Either source code string or parsed AST
 * @param options - Validation options
 * @returns Validation result with diagnostics
 */
export function validate(
  input: string | ParseResult,
  options?: ValidationOptions
): ValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Route to appropriate validator based on mode
  switch (opts.mode) {
    case 'ast':
      return validateAST(input, opts)
    case 'llm':
      return validateLLM(input, opts)
    case 'live':
      return validateLive(input, opts)
    default:
      return validateAST(input, opts)
  }
}

// ============================================
// AST Validation
// ============================================

/**
 * Validates a parsed AST
 */
function validateAST(
  input: string | ParseResult,
  options: Required<ValidationOptions>
): ValidationResult {
  const builder = new ValidationResultBuilder()

  // If input is a string, we need to parse it first
  if (typeof input === 'string') {
    // Run live validation on raw string
    const liveResult = validateLive(input, options)
    return liveResult
  }

  // Process parse result diagnostics
  const parseResult = input as ParseResult

  // Convert parse diagnostics to unified diagnostics
  if (parseResult.diagnostics && parseResult.diagnostics.length > 0) {
    for (const error of parseResult.diagnostics) {
      const category = inferCategoryFromCode(error.code)
      if (options.skip.includes(category)) continue

      builder.add({
        severity: error.severity,
        code: error.code,
        category,
        message: error.message,
        location: error.location,
        source: error.source,
        suggestions: error.hint ? [{
          label: error.hint,
          replacement: ''
        }] : undefined
      })
    }
  }

  let result = builder.build()
  result = applyOptions(result, options)

  return result
}

// ============================================
// LLM Output Validation
// ============================================

/**
 * Validates LLM-generated code with optional auto-correction
 *
 * This mode first applies deterministic self-healing fixes,
 * then validates the result for any remaining issues.
 */
function validateLLM(
  input: string | ParseResult,
  options: Required<ValidationOptions>
): ValidationResult {
  const builder = new ValidationResultBuilder()

  let code = typeof input === 'string' ? input : ''
  if (!code) {
    return builder.build()
  }

  // Step 1: Apply deterministic self-healing fixes first
  // This handles common LLM errors like px suffix, rgba colors, token fixes, etc.
  const fixedCode = applyAllFixes(code)

  // Step 2: Run validation on the fixed code
  const { diagnostics, correctedCode } = validateAndCorrectCode(fixedCode, options.autoCorrect)
  builder.addAll(diagnostics)

  let result = builder.build()

  // Add corrected code if changes were made
  const finalCode = correctedCode !== fixedCode ? correctedCode : fixedCode
  if (finalCode !== code) {
    result = { ...result, correctedCode: finalCode }
  }

  result = applyOptions(result, options)
  return result
}

// ============================================
// Live Editor Validation (with Incremental Caching)
// ============================================

/**
 * Fast validation for live editor use with incremental caching
 */
function validateLive(
  input: string | ParseResult,
  options: Required<ValidationOptions>
): ValidationResult {
  const builder = new ValidationResultBuilder()

  const code = typeof input === 'string' ? input : ''
  if (!code) {
    clearValidationCache()
    return builder.build()
  }

  // Use incremental validation
  const diagnostics = validateIncremental(code)
  builder.addAll(diagnostics)

  let result = builder.build()
  result = applyOptions(result, options)

  return result
}

/**
 * Incremental validation with line-level caching
 */
function validateIncremental(code: string): Diagnostic[] {
  const lines = code.split('\n')
  const now = Date.now()
  const codeHash = hashString(code)

  // If code hasn't changed, return cached result
  if (codeHash === validationCache.globalContext.lastFullHash) {
    const cachedDiagnostics: Diagnostic[] = []
    for (const entry of validationCache.lines.values()) {
      cachedDiagnostics.push(...entry.diagnostics)
    }
    return cachedDiagnostics
  }

  // Find changed lines
  const oldLines = validationCache.lastCode.split('\n')
  const changedLineNums = new Set<number>()
  const contextChanged = detectContextChanges(code, lines)

  // Detect which lines changed
  for (let i = 0; i < Math.max(lines.length, oldLines.length); i++) {
    const lineNum = i + 1
    const newLine = lines[i] || ''
    const oldLine = oldLines[i] || ''

    if (newLine !== oldLine) {
      changedLineNums.add(lineNum)
      // Also mark adjacent lines as changed (for context-dependent validation)
      if (i > 0) changedLineNums.add(lineNum - 1)
      if (i < lines.length - 1) changedLineNums.add(lineNum + 1)
    }
  }

  // If line count changed significantly or context changed, invalidate all
  if (Math.abs(lines.length - oldLines.length) > 5 || contextChanged) {
    clearValidationCache()
    changedLineNums.clear()
    for (let i = 1; i <= lines.length; i++) {
      changedLineNums.add(i)
    }
  }

  // Update global context (tokens and components)
  updateGlobalContext(code, lines)

  // Collect diagnostics
  const allDiagnostics: Diagnostic[] = []

  // Structural validation always runs on full code (brace counting needs context)
  const structuralIssues = validateStructure(code)
  allDiagnostics.push(...structuralIssues)

  // For changed lines, run line-specific validation
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1
    const line = lines[i]
    const lineHash = hashString(line)

    // Check cache for this line
    const cached = validationCache.lines.get(lineNum)
    if (cached && cached.lineHash === lineHash && !changedLineNums.has(lineNum)) {
      // Use cached diagnostics (adjust line numbers if needed)
      if (now - cached.timestamp < CACHE_EXPIRY_MS) {
        allDiagnostics.push(...cached.diagnostics)
        continue
      }
    }

    // Validate this line
    const lineDiagnostics = validateLine(line, lineNum, lines, code)

    // Cache the result
    validationCache.lines.set(lineNum, {
      lineHash,
      diagnostics: lineDiagnostics,
      timestamp: now
    })

    allDiagnostics.push(...lineDiagnostics)
  }

  // Clean up cache entries for deleted lines
  for (const lineNum of validationCache.lines.keys()) {
    if (lineNum > lines.length) {
      validationCache.lines.delete(lineNum)
    }
  }

  // Update cache state
  validationCache.lastCode = code
  validationCache.globalContext.lastFullHash = codeHash

  return allDiagnostics
}

/**
 * Detect if global context (tokens/components) changed
 */
function detectContextChanges(code: string, lines: string[]): boolean {
  const oldTokens = validationCache.globalContext.definedTokens
  const oldComponents = validationCache.globalContext.definedComponents

  const newTokens = new Set<string>()
  const newComponents = new Set<string>()

  for (const line of lines) {
    const tokenMatch = line.match(/^\s*(\$[\w-]+)\s*:/)
    if (tokenMatch) newTokens.add(tokenMatch[1])

    const compMatch = line.match(/^\s*([A-Z][A-Za-z0-9]*):\s*/)
    if (compMatch) newComponents.add(compMatch[1])
  }

  // Check if sets differ
  if (newTokens.size !== oldTokens.size || newComponents.size !== oldComponents.size) {
    return true
  }

  for (const t of newTokens) {
    if (!oldTokens.has(t)) return true
  }
  for (const c of newComponents) {
    if (!oldComponents.has(c)) return true
  }

  return false
}

/**
 * Update global context with current tokens and components
 */
function updateGlobalContext(code: string, lines: string[]): void {
  validationCache.globalContext.definedTokens.clear()
  validationCache.globalContext.definedComponents.clear()

  for (const line of lines) {
    const tokenMatch = line.match(/^\s*(\$[\w-]+)\s*:/)
    if (tokenMatch) {
      validationCache.globalContext.definedTokens.add(tokenMatch[1])
    }

    const compMatch = line.match(/^\s*([A-Z][A-Za-z0-9]*):\s*/)
    if (compMatch) {
      validationCache.globalContext.definedComponents.add(compMatch[1])
    }
  }
}

/**
 * Validate a single line
 */
function validateLine(line: string, lineNum: number, allLines: string[], fullCode: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  const trimmed = line.trim()

  // Skip empty lines and comments
  if (!trimmed || trimmed.startsWith('//')) {
    return diagnostics
  }

  // Property validation
  if (/^[A-Z]/.test(trimmed) || /^\$/.test(trimmed)) {
    const afterComponent = trimmed.replace(/^[A-Z][A-Za-z0-9]*:?\s*/, '')
    validateLineProperties(afterComponent, lineNum, diagnostics)
  } else if (/^\s+[a-z]/.test(line)) {
    validateLineProperties(trimmed, lineNum, diagnostics)
  }

  // Reference validation for this line
  validateLineReferences(line, lineNum, diagnostics)

  // Value validation for this line
  validateLineValues(line, lineNum, diagnostics)

  return diagnostics
}

/**
 * Validate references in a single line
 */
function validateLineReferences(line: string, lineNum: number, diagnostics: Diagnostic[]): void {
  const definedTokens = validationCache.globalContext.definedTokens
  const definedComponents = validationCache.globalContext.definedComponents
  // Skip token definition lines
  if (/^\s*\$[\w-]+\s*:/.test(line)) return

  // Check token references
  const tokenRefPattern = /(\$[\w-]+)(?!\s*:)/g
  let match
  while ((match = tokenRefPattern.exec(line)) !== null) {
    const tokenRef = match[1]
    if (!definedTokens.has(tokenRef)) {
      diagnostics.push({
        severity: 'warning',
        code: 'R001',
        category: 'reference',
        message: `Undefined token "${tokenRef}"`,
        location: { line: lineNum, column: match.index + 1 },
        source: tokenRef,
        suggestions: [{
          label: `Define token: ${tokenRef}: #3B82F6`,
          replacement: `${tokenRef}: #3B82F6`,
          confidence: 0.7
        }]
      })
    }
  }

  // Check component references
  const trimmed = line.trim()
  if (/^\s*[A-Z][A-Za-z0-9]*:/.test(trimmed)) return // Skip definitions

  const instanceMatch = trimmed.match(/^([A-Z][A-Za-z0-9]*)(?:\s|$)/)
  if (instanceMatch) {
    const componentName = instanceMatch[1]
    if (!definedComponents.has(componentName) && !BUILT_IN_COMPONENTS.has(componentName)) {
      const allComponents = [...definedComponents, ...BUILT_IN_COMPONENTS]
      const { match: closest, distance } = findClosestMatch(componentName, allComponents, 3)

      if (closest && distance <= 3) {
        diagnostics.push({
          severity: 'warning',
          code: 'R002',
          category: 'reference',
          message: `Undefined component "${componentName}" - did you mean "${closest}"?`,
          location: { line: lineNum, column: 1 },
          source: componentName,
          suggestions: [{
            label: `Replace with "${closest}"`,
            replacement: closest,
            confidence: 0.7
          }]
        })
      }
    }
  }
}

/**
 * Validate values in a single line
 */
function validateLineValues(line: string, lineNum: number, diagnostics: Diagnostic[]): void {
  // Check for px suffix
  const pxMatch = line.match(/\b(\d+)px\b/)
  if (pxMatch) {
    diagnostics.push({
      severity: 'warning',
      code: 'C001',
      category: 'correction',
      message: 'Remove "px" suffix - numbers are already in pixels',
      location: { line: lineNum, column: line.indexOf(pxMatch[0]) + 1 },
      source: pxMatch[0],
      suggestions: [{
        label: `Replace with ${pxMatch[1]}`,
        replacement: pxMatch[1],
        confidence: 1.0
      }]
    })
  }

  // Check for property: value syntax
  const colonMatch = line.match(/\b(pad|margin|border|radius|width|height|gap|bg|color|opacity)\s*:\s*(\S+)/)
  if (colonMatch && !line.match(/^\s*[A-Z][A-Za-z0-9]*:/) && !line.match(/^\s*\$[\w-]+:/)) {
    diagnostics.push({
      severity: 'warning',
      code: 'C002',
      category: 'correction',
      message: 'Remove colon after property - use space instead',
      location: { line: lineNum, column: line.indexOf(colonMatch[0]) + 1 },
      source: colonMatch[0],
      suggestions: [{
        label: `Replace with "${colonMatch[1]} ${colonMatch[2]}"`,
        replacement: `${colonMatch[1]} ${colonMatch[2]}`,
        confidence: 1.0
      }]
    })
  }

  // Check for opacity values > 1
  const opacityMatch = line.match(/\b(?:opacity|opa|o)\s+(\d+(?:\.\d+)?)\b/)
  if (opacityMatch) {
    const value = parseFloat(opacityMatch[1])
    if (value > 1) {
      const corrected = Math.min(1, value / 100)
      diagnostics.push({
        severity: 'warning',
        code: 'C003',
        category: 'correction',
        message: `Opacity should be 0-1, not ${value}`,
        location: { line: lineNum, column: line.indexOf(opacityMatch[0]) + 1 },
        source: opacityMatch[0],
        suggestions: [{
          label: `Use ${corrected.toFixed(2)} instead`,
          replacement: opacityMatch[0].replace(opacityMatch[1], corrected.toFixed(2)),
          confidence: 0.9
        }]
      })
    }
  }

  // Check for markdown code blocks
  if (line.trim().startsWith('```')) {
    diagnostics.push({
      severity: 'error',
      code: 'C007',
      category: 'correction',
      message: 'Remove markdown code block markers',
      location: { line: lineNum, column: 1 },
      source: line.trim(),
      suggestions: [{
        label: 'Remove line',
        replacement: '',
        confidence: 1.0
      }]
    })
  }

  // Check for invalid hex colors
  const hexMatch = line.match(/#([0-9A-Fa-f]+)\b/)
  if (hexMatch) {
    const hex = hexMatch[1]
    if (![3, 6, 8].includes(hex.length)) {
      const corrected = hex.length < 6
        ? hex.padEnd(6, hex.charAt(hex.length - 1))
        : hex.substring(0, 6)
      diagnostics.push({
        severity: 'warning',
        code: 'C004',
        category: 'correction',
        message: `Invalid hex color length (${hex.length} chars) - should be 3, 6, or 8`,
        location: { line: lineNum, column: line.indexOf(hexMatch[0]) + 1 },
        source: hexMatch[0],
        suggestions: [{
          label: `Use #${corrected}`,
          replacement: `#${corrected}`,
          confidence: 0.8
        }]
      })
    }
  }
}

// ============================================
// Structural Validation (Braces, Strings)
// ============================================

function validateStructure(code: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  const lines = code.split('\n')

  let braceDepth = 0
  let lastOpenBraceLine = 0

  lines.forEach((line, index) => {
    const lineNum = index + 1
    const trimmed = line.trim()

    // Count braces
    for (const char of trimmed) {
      if (char === '{') {
        braceDepth++
        lastOpenBraceLine = lineNum
      } else if (char === '}') {
        braceDepth--
        if (braceDepth < 0) {
          diagnostics.push({
            severity: 'error',
            code: 'P001',
            category: 'parser',
            message: 'Unexpected closing brace',
            location: { line: lineNum, column: trimmed.indexOf('}') + 1 }
          })
          braceDepth = 0
        }
      }
    }

    // Check for unclosed string
    const quoteCount = (trimmed.match(/"/g) || []).length
    if (quoteCount % 2 !== 0) {
      diagnostics.push({
        severity: 'error',
        code: 'L001',
        category: 'lexer',
        message: 'Unclosed string',
        location: { line: lineNum, column: trimmed.lastIndexOf('"') + 1 }
      })
    }
  })

  // Check for unclosed braces at end
  if (braceDepth > 0) {
    diagnostics.push({
      severity: 'error',
      code: 'P004',
      category: 'parser',
      message: `Unclosed brace (opened on line ${lastOpenBraceLine})`,
      location: { line: lines.length, column: 1 }
    })
  }

  return diagnostics
}

// ============================================
// Property Validation with Fuzzy Matching
// ============================================

function validateProperties(code: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  const lines = code.split('\n')

  // Regex to match property-like tokens (lowercase words followed by value)
  const propertyPattern = /\b([a-z][a-z0-9-]*)\s+(?:#[0-9A-Fa-f]+|\$\w+|\d+|"[^"]*"|[a-z]+)/gi

  lines.forEach((line, index) => {
    const lineNum = index + 1
    const trimmed = line.trim()

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('//')) return

    // Skip lines that start with component names (uppercase) or tokens ($)
    if (/^[A-Z]/.test(trimmed) || /^\$/.test(trimmed)) {
      // Find properties on this line after the component name
      const afterComponent = trimmed.replace(/^[A-Z][A-Za-z0-9]*:?\s*/, '')
      validateLineProperties(afterComponent, lineNum, diagnostics)
    } else if (/^\s+[a-z]/.test(line)) {
      // Indented property line
      validateLineProperties(trimmed, lineNum, diagnostics)
    }
  })

  return diagnostics
}

function validateLineProperties(lineContent: string, lineNum: number, diagnostics: Diagnostic[]): void {
  // Split by comma to get individual property-value pairs
  const parts = lineContent.split(',').map(p => p.trim()).filter(Boolean)

  for (const part of parts) {
    // Skip strings
    if (part.startsWith('"')) continue

    // Extract first word as potential property name
    const match = part.match(/^([a-z][a-z0-9-]*)/i)
    if (!match) continue

    const propName = match[1].toLowerCase()

    // Skip known component names and keywords
    if (/^[A-Z]/.test(match[1])) continue
    if (['if', 'else', 'then', 'each', 'in', 'state', 'hover', 'focus', 'active', 'disabled', 'events', 'onclick', 'onhover', 'show', 'hide', 'animate', 'named', 'as', 'from', 'toggle', 'where', 'and', 'or', 'not', 'to', 'true', 'false'].includes(propName)) continue

    // Check if valid property
    if (!isValidProperty(propName)) {
      // Check for CSS-to-DSL mapping
      if (CSS_TO_DSL[propName]) {
        diagnostics.push({
          severity: 'warning',
          code: 'V001',
          category: 'property',
          message: `CSS property "${propName}" - use "${CSS_TO_DSL[propName]}" instead`,
          location: { line: lineNum, column: 1 },
          source: propName,
          suggestions: [{
            label: `Replace with "${CSS_TO_DSL[propName]}"`,
            replacement: CSS_TO_DSL[propName],
            confidence: 1.0
          }]
        })
        continue
      }

      // Check for common typos
      if (COMMON_TYPOS[propName]) {
        diagnostics.push({
          severity: 'warning',
          code: 'V002',
          category: 'property',
          message: `Typo in property "${propName}" - did you mean "${COMMON_TYPOS[propName]}"?`,
          location: { line: lineNum, column: 1 },
          source: propName,
          suggestions: [{
            label: `Replace with "${COMMON_TYPOS[propName]}"`,
            replacement: COMMON_TYPOS[propName],
            confidence: 0.95
          }]
        })
        continue
      }

      // Try fuzzy matching
      const { match: closestMatch, distance } = findClosestMatch(propName, VALID_PROPERTIES, 2)
      if (closestMatch && distance <= 2) {
        diagnostics.push({
          severity: 'warning',
          code: 'V003',
          category: 'property',
          message: `Unknown property "${propName}" - did you mean "${closestMatch}"?`,
          location: { line: lineNum, column: 1 },
          source: propName,
          suggestions: [{
            label: `Replace with "${closestMatch}"`,
            replacement: closestMatch,
            confidence: 0.8 - (distance * 0.1)
          }]
        })
      } else {
        // Unknown property without suggestion
        diagnostics.push({
          severity: 'error',
          code: 'V004',
          category: 'property',
          message: `Unknown property "${propName}"`,
          location: { line: lineNum, column: 1 },
          source: propName
        })
      }
    }
  }
}

// ============================================
// Reference Validation (Tokens, Components)
// ============================================

function validateReferences(code: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  const lines = code.split('\n')

  // Collect defined tokens
  const definedTokens = new Set<string>()
  const tokenPattern = /^\s*(\$[\w-]+)\s*:/
  for (const line of lines) {
    const match = line.match(tokenPattern)
    if (match) {
      definedTokens.add(match[1])
    }
  }

  // Collect defined components
  const definedComponents = new Set<string>()
  const componentDefPattern = /^\s*([A-Z][A-Za-z0-9]*):/
  for (const line of lines) {
    const match = line.match(componentDefPattern)
    if (match) {
      definedComponents.add(match[1])
    }
  }

  // Check for undefined token references
  const tokenRefPattern = /(\$[\w-]+)(?!\s*:)/g
  lines.forEach((line, index) => {
    const lineNum = index + 1

    // Skip token definition lines
    if (tokenPattern.test(line)) return

    let match
    while ((match = tokenRefPattern.exec(line)) !== null) {
      const tokenRef = match[1]
      if (!definedTokens.has(tokenRef)) {
        diagnostics.push({
          severity: 'warning',
          code: 'R001',
          category: 'reference',
          message: `Undefined token "${tokenRef}"`,
          location: { line: lineNum, column: match.index + 1 },
          source: tokenRef,
          suggestions: [{
            label: `Define token: ${tokenRef}: #3B82F6`,
            replacement: `${tokenRef}: #3B82F6`,
            confidence: 0.7
          }]
        })
      }
    }
  })

  // Check for undefined component references (only instances, not definitions)
  lines.forEach((line, index) => {
    const lineNum = index + 1
    const trimmed = line.trim()

    // Skip definitions
    if (componentDefPattern.test(trimmed)) return
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('//')) return

    // Check for component instances
    const instanceMatch = trimmed.match(/^([A-Z][A-Za-z0-9]*)(?:\s|$)/)
    if (instanceMatch) {
      const componentName = instanceMatch[1]
      if (!definedComponents.has(componentName) && !BUILT_IN_COMPONENTS.has(componentName)) {
        // Find similar component names
        const allComponents = [...definedComponents, ...BUILT_IN_COMPONENTS]
        const { match: closest, distance } = findClosestMatch(componentName, allComponents, 3)

        if (closest && distance <= 3) {
          diagnostics.push({
            severity: 'warning',
            code: 'R002',
            category: 'reference',
            message: `Undefined component "${componentName}" - did you mean "${closest}"?`,
            location: { line: lineNum, column: 1 },
            source: componentName,
            suggestions: [{
              label: `Replace with "${closest}"`,
              replacement: closest,
              confidence: 0.7
            }]
          })
        } else {
          diagnostics.push({
            severity: 'info',
            code: 'R003',
            category: 'reference',
            message: `Component "${componentName}" is not defined - will use default Box styling`,
            location: { line: lineNum, column: 1 },
            source: componentName
          })
        }
      }
    }
  })

  return diagnostics
}

// ============================================
// Value Validation
// ============================================

function validateValues(code: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  const lines = code.split('\n')

  lines.forEach((line, index) => {
    const lineNum = index + 1

    // Check for px suffix
    const pxMatch = line.match(/\b(\d+)px\b/)
    if (pxMatch) {
      diagnostics.push({
        severity: 'warning',
        code: 'C001',
        category: 'correction',
        message: 'Remove "px" suffix - numbers are already in pixels',
        location: { line: lineNum, column: line.indexOf(pxMatch[0]) + 1 },
        source: pxMatch[0],
        suggestions: [{
          label: `Replace with ${pxMatch[1]}`,
          replacement: pxMatch[1],
          confidence: 1.0
        }]
      })
    }

    // Check for property: value syntax (should be property value)
    const colonMatch = line.match(/\b(pad|margin|border|radius|width|height|gap|bg|color|opacity)\s*:\s*(\S+)/)
    if (colonMatch && !line.match(/^\s*[A-Z][A-Za-z0-9]*:/) && !line.match(/^\s*\$[\w-]+:/)) {
      diagnostics.push({
        severity: 'warning',
        code: 'C002',
        category: 'correction',
        message: 'Remove colon after property - use space instead',
        location: { line: lineNum, column: line.indexOf(colonMatch[0]) + 1 },
        source: colonMatch[0],
        suggestions: [{
          label: `Replace with "${colonMatch[1]} ${colonMatch[2]}"`,
          replacement: `${colonMatch[1]} ${colonMatch[2]}`,
          confidence: 1.0
        }]
      })
    }

    // Check for opacity values > 1
    const opacityMatch = line.match(/\b(?:opacity|opa|o)\s+(\d+(?:\.\d+)?)\b/)
    if (opacityMatch) {
      const value = parseFloat(opacityMatch[1])
      if (value > 1) {
        const corrected = Math.min(1, value / 100)
        diagnostics.push({
          severity: 'warning',
          code: 'C003',
          category: 'correction',
          message: `Opacity should be 0-1, not ${value}`,
          location: { line: lineNum, column: line.indexOf(opacityMatch[0]) + 1 },
          source: opacityMatch[0],
          suggestions: [{
            label: `Use ${corrected.toFixed(2)} instead`,
            replacement: opacityMatch[0].replace(opacityMatch[1], corrected.toFixed(2)),
            confidence: 0.9
          }]
        })
      }
    }

    // Check for markdown code blocks
    if (line.trim().startsWith('```')) {
      diagnostics.push({
        severity: 'error',
        code: 'C007',
        category: 'correction',
        message: 'Remove markdown code block markers',
        location: { line: lineNum, column: 1 },
        source: line.trim(),
        suggestions: [{
          label: 'Remove line',
          replacement: '',
          confidence: 1.0
        }]
      })
    }

    // Check for invalid hex colors
    const hexMatch = line.match(/#([0-9A-Fa-f]+)\b/)
    if (hexMatch) {
      const hex = hexMatch[1]
      if (![3, 6, 8].includes(hex.length)) {
        const corrected = hex.length < 6
          ? hex.padEnd(6, hex.charAt(hex.length - 1))
          : hex.substring(0, 6)
        diagnostics.push({
          severity: 'warning',
          code: 'C004',
          category: 'correction',
          message: `Invalid hex color length (${hex.length} chars) - should be 3, 6, or 8`,
          location: { line: lineNum, column: line.indexOf(hexMatch[0]) + 1 },
          source: hexMatch[0],
          suggestions: [{
            label: `Use #${corrected}`,
            replacement: `#${corrected}`,
            confidence: 0.8
          }]
        })
      }
    }
  })

  return diagnostics
}

// ============================================
// Auto-Correction
// ============================================

function validateAndCorrectCode(code: string, autoCorrect: boolean): { diagnostics: Diagnostic[], correctedCode: string } {
  const diagnostics: Diagnostic[] = []
  let correctedCode = code

  // Run all validations
  const structuralIssues = validateStructure(code)
  const propertyIssues = validateProperties(code)
  const referenceIssues = validateReferences(code)
  const valueIssues = validateValues(code)

  diagnostics.push(...structuralIssues, ...propertyIssues, ...referenceIssues, ...valueIssues)

  // Apply auto-corrections if enabled
  if (autoCorrect) {
    const corrections: Array<{ line: number; from: string; to: string }> = []

    for (const diag of diagnostics) {
      if (diag.suggestions && diag.suggestions.length > 0) {
        const suggestion = diag.suggestions[0]
        if (suggestion.confidence && suggestion.confidence >= 0.9 && diag.source) {
          corrections.push({
            line: diag.location.line,
            from: diag.source,
            to: suggestion.replacement
          })
        }
      }
    }

    // Apply corrections (in reverse order to maintain line positions)
    if (corrections.length > 0) {
      const lines = correctedCode.split('\n')

      // Group corrections by line
      const byLine = new Map<number, Array<{ from: string; to: string }>>()
      for (const c of corrections) {
        if (!byLine.has(c.line)) {
          byLine.set(c.line, [])
        }
        byLine.get(c.line)!.push({ from: c.from, to: c.to })
      }

      // Apply corrections line by line
      for (const [lineNum, lineCorrections] of byLine) {
        let line = lines[lineNum - 1]
        for (const { from, to } of lineCorrections) {
          if (to === '') {
            // Remove entire line
            lines[lineNum - 1] = ''
          } else {
            line = line.replace(from, to)
            lines[lineNum - 1] = line
          }
        }
      }

      // Remove empty lines created by removals
      correctedCode = lines.filter(l => l !== '').join('\n')
    }
  }

  return { diagnostics, correctedCode }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Apply validation options to result
 */
function applyOptions(
  result: ValidationResult,
  options: Required<ValidationOptions>
): ValidationResult {
  let diagnostics = result.diagnostics

  // Filter by skip categories
  if (options.skip.length > 0) {
    diagnostics = diagnostics.filter(d => !options.skip.includes(d.category))
  }

  // Filter info if not included
  if (!options.includeInfo) {
    diagnostics = diagnostics.filter(d => d.severity !== 'info')
  }

  // Apply max diagnostics limit
  if (diagnostics.length > options.maxDiagnostics) {
    diagnostics = diagnostics.slice(0, options.maxDiagnostics)
  }

  // Apply strict mode
  let valid = !hasErrors(diagnostics)
  if (options.strictMode) {
    valid = diagnostics.length === 0
  }

  return {
    valid,
    diagnostics: sortDiagnostics(diagnostics),
    correctedCode: result.correctedCode,
    metadata: result.metadata
  }
}

/**
 * Infer category from error code
 */
function inferCategoryFromCode(code: string): DiagnosticCategory {
  const prefix = code.charAt(0)
  switch (prefix) {
    case 'L': return 'lexer'
    case 'P': return 'parser'
    case 'S': return 'semantic'
    case 'V': {
      const num = parseInt(code.slice(1), 10)
      if (num < 10) return 'property'
      if (num < 20) return 'library'
      if (num < 30) return 'reference'
      if (num < 40) return 'event'
      if (num < 50) return 'action'
      if (num < 60) return 'type'
      if (num < 70) return 'state'
      return 'animation'
    }
    case 'C': return 'correction'
    case 'R': return 'reference'
    case 'W': return 'semantic'
    default: return 'parser'
  }
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Quick check if code is valid
 */
export function isValid(input: string | ParseResult, options?: ValidationOptions): boolean {
  return validate(input, options).valid
}

/**
 * Get first error from validation
 */
export function getFirstError(
  input: string | ParseResult,
  options?: ValidationOptions
): Diagnostic | undefined {
  const result = validate(input, { ...options, maxDiagnostics: 1 })
  return result.diagnostics.find(d => d.severity === 'error')
}

/**
 * Validate with LLM mode and auto-correction
 */
export function validateAndCorrect(code: string): ValidationResult {
  return validate(code, { mode: 'llm', autoCorrect: true })
}
