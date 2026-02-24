/**
 * @module converter/react-pivot/validation/react-linter
 * @description Validates LLM-generated React code against the constrained subset
 *
 * This linter ensures the React code can be deterministically transformed to Mirror DSL.
 * It checks for:
 * - Only allowed components
 * - Only mapped style properties
 * - No hardcoded colors (must use $tokens)
 * - No className (must use style={{}})
 * - No spread operators
 * - No custom hooks
 */

import type { ValidationIssue, ValidationResult, ValidationIssueType } from '../types'
import {
  ALLOWED_COMPONENTS,
  REACT_TO_MIRROR_PROPERTIES,
  REACT_TO_MIRROR_EVENTS,
  REACT_TO_MIRROR_ACTIONS,
  REACT_TO_MIRROR_STATES,
  isAllowedComponent,
  isValidReactProperty,
  isValidReactEvent,
  isValidAction,
  isValidState,
} from '../spec'

// =============================================================================
// Main Validation Function
// =============================================================================

export function validateReactCode(code: string): ValidationResult {
  const issues: ValidationIssue[] = []

  // Run all validation checks
  issues.push(...checkUnknownComponents(code))
  issues.push(...checkHardcodedColors(code))
  issues.push(...checkNamedColors(code))        // NEW
  issues.push(...checkClassNameUsage(code))
  issues.push(...checkSpreadOperators(code))
  issues.push(...checkCustomHooks(code))
  issues.push(...checkUnsupportedProperties(code))
  issues.push(...checkInvalidTokenFormat(code)) // NEW
  issues.push(...checkTemplateLiterals(code))   // NEW
  issues.push(...checkRawHTMLElements(code))    // NEW

  // Determine if all issues are fixable
  const valid = issues.every(issue => issue.fixable)

  return {
    valid,
    issues,
    fixedCode: valid ? applyAutoFixes(code, issues) : undefined,
  }
}

/**
 * Quick pre-validation check - returns true if code looks valid enough to process
 * Used to fail fast on obviously invalid input
 */
export function quickValidate(code: string): { valid: boolean; reason?: string } {
  // Check for critical blockers
  if (/#[0-9A-Fa-f]{3,8}\b/.test(code)) {
    return { valid: false, reason: 'Contains hardcoded hex colors' }
  }

  if (/className\s*=/.test(code)) {
    return { valid: false, reason: 'Contains className (use style={{}})' }
  }

  if (/\buse[A-Z]\w*\s*\(/.test(code)) {
    return { valid: false, reason: 'Contains React hooks' }
  }

  // Check for named colors in style props
  const namedColorInStyle = /style\s*=\s*\{\{[^}]*(?:color|background|borderColor)\s*:\s*['"]?(white|black|red|blue|green|gray|grey|yellow|orange|purple|pink|brown|transparent|inherit)['"]?/i
  if (namedColorInStyle.test(code)) {
    return { valid: false, reason: 'Contains named colors in styles' }
  }

  return { valid: true }
}

// =============================================================================
// Component Validation
// =============================================================================

function checkUnknownComponents(code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Match JSX opening tags: <ComponentName or <component-name
  const tagRegex = /<([A-Z][A-Za-z0-9]*)/g
  let match

  while ((match = tagRegex.exec(code)) !== null) {
    const componentName = match[1]

    if (!isAllowedComponent(componentName)) {
      // Try to find a similar allowed component
      const suggestion = findClosestComponent(componentName)

      issues.push({
        type: 'INVALID_COMPONENT',
        message: `Unknown component "${componentName}"`,
        code: match[0],
        fixable: true,
        suggestion: suggestion
          ? `Use "${suggestion}" instead`
          : `Replace with an allowed component: Box, Text, Card, etc.`,
      })
    }
  }

  return issues
}

function findClosestComponent(name: string): string | null {
  const nameLower = name.toLowerCase()

  // Common mappings
  const mappings: Record<string, string> = {
    div: 'Box',
    span: 'Text',
    p: 'Text',
    h1: 'Title',
    h2: 'Title',
    h3: 'Title',
    h4: 'Title',
    h5: 'Title',
    h6: 'Title',
    a: 'Link',
    img: 'Image',
    ul: 'List',
    ol: 'List',
    li: 'Item',
    nav: 'Nav',
    header: 'Header',
    footer: 'Footer',
    main: 'Main',
    section: 'Section',
    article: 'Card',
    aside: 'Sidebar',
    form: 'Form',
    fieldset: 'FormField',
    table: 'Table',
    tr: 'TableRow',
    th: 'TableHeader',
    td: 'Text',
    svg: 'Icon',
    flex: 'Row',
    flexbox: 'Row',
    container: 'Box',
    wrapper: 'Box',
    view: 'Box',
  }

  if (mappings[nameLower]) {
    return mappings[nameLower]
  }

  // Find closest match by Levenshtein distance
  let closest: string | null = null
  let minDistance = Infinity

  for (const allowed of ALLOWED_COMPONENTS) {
    const distance = levenshteinDistance(nameLower, allowed.toLowerCase())
    if (distance < minDistance && distance <= 3) {
      minDistance = distance
      closest = allowed
    }
  }

  return closest
}

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

// =============================================================================
// Color Validation
// =============================================================================

function checkHardcodedColors(code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Match hex colors: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
  const hexRegex = /#([0-9A-Fa-f]{3,8})\b/g
  let match

  while ((match = hexRegex.exec(code)) !== null) {
    // Skip if it's inside a token definition (const $name = '#color')
    const before = code.substring(Math.max(0, match.index - 50), match.index)
    if (/const\s+\$[\w-]+\s*=\s*['"]?$/.test(before)) {
      continue
    }

    issues.push({
      type: 'HARDCODED_COLOR',
      message: `Hardcoded color "${match[0]}" - use $token instead`,
      code: match[0],
      fixable: false, // Requires retry with correction prompt
      suggestion: 'Replace with a semantic token like $primary.bg or $surface.bg',
    })
  }

  // Match rgb/rgba colors
  const rgbRegex = /rgba?\s*\([^)]+\)/gi
  while ((match = rgbRegex.exec(code)) !== null) {
    issues.push({
      type: 'HARDCODED_COLOR',
      message: `Hardcoded color "${match[0]}" - use $token instead`,
      code: match[0],
      fixable: false,
      suggestion: 'Replace with a semantic token like $primary.bg or $surface.bg',
    })
  }

  return issues
}

// =============================================================================
// className Validation
// =============================================================================

function checkClassNameUsage(code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Match className= prop
  const classNameRegex = /className\s*=\s*["'{]/g
  let match

  while ((match = classNameRegex.exec(code)) !== null) {
    issues.push({
      type: 'CLASSNAME_USED',
      message: 'className is not supported - use style={{}} instead',
      code: match[0],
      fixable: false, // Would need to parse and convert Tailwind/CSS classes
      suggestion: 'Convert className to style={{}} with supported properties',
    })
  }

  return issues
}

// =============================================================================
// Spread Operator Validation
// =============================================================================

function checkSpreadOperators(code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Match {...props} or {...rest}
  const spreadRegex = /\{\s*\.\.\.(\w+)\s*\}/g
  let match

  while ((match = spreadRegex.exec(code)) !== null) {
    issues.push({
      type: 'SPREAD_OPERATOR',
      message: `Spread operator {...${match[1]}} is not supported`,
      code: match[0],
      fixable: true, // Can remove
      suggestion: 'Remove spread operator and use explicit props',
    })
  }

  return issues
}

// =============================================================================
// Custom Hook Validation
// =============================================================================

function checkCustomHooks(code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Match useState, useEffect, useMemo, useCallback, useRef, useContext, etc.
  const hookRegex = /\buse[A-Z]\w*\s*\(/g
  let match

  while ((match = hookRegex.exec(code)) !== null) {
    const hookName = match[0].replace(/\s*\($/, '')

    issues.push({
      type: 'CUSTOM_HOOK',
      message: `React hook "${hookName}" is not supported in this context`,
      code: match[0],
      fixable: false,
      suggestion: 'Use Mirror DSL state management (states, events, actions) instead',
    })
  }

  return issues
}

// =============================================================================
// Property Validation
// =============================================================================

function checkUnsupportedProperties(code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Match style={{ property: value }} patterns
  const styleBlockRegex = /style\s*=\s*\{\{([^}]+)\}\}/g
  let match

  while ((match = styleBlockRegex.exec(code)) !== null) {
    const styleContent = match[1]

    // Parse property names
    const propRegex = /(\w+)\s*:/g
    let propMatch

    while ((propMatch = propRegex.exec(styleContent)) !== null) {
      const propName = propMatch[1]

      // Skip known valid properties
      if (isValidReactProperty(propName)) continue

      // Check for common CSS properties that aren't mapped
      const suggestion = suggestPropertyMapping(propName)

      issues.push({
        type: 'UNSUPPORTED_PROP',
        message: `Style property "${propName}" is not supported`,
        code: `${propName}:`,
        fixable: suggestion !== null,
        suggestion: suggestion ?? 'Remove this property or use a supported alternative',
      })
    }
  }

  return issues
}

function suggestPropertyMapping(propName: string): string | null {
  const mappings: Record<string, string> = {
    // Layout
    display: 'Use direction (horizontal/vertical) or hidden',
    flexDirection: 'Use direction: "horizontal" or "vertical"',
    alignContent: 'Use alignItems instead',

    // Sizing
    flex: 'Use grow: true or width/height with values',
    flexBasis: 'Use width or height instead',

    // Spacing
    paddingX: 'Use padding: [vertical, horizontal]',
    paddingY: 'Use padding: [vertical, horizontal]',
    px: 'Use padding: [vertical, horizontal]',
    py: 'Use padding: [vertical, horizontal]',
    marginX: 'Use margin: [vertical, horizontal]',
    marginY: 'Use margin: [vertical, horizontal]',
    mx: 'Use margin: [vertical, horizontal]',
    my: 'Use margin: [vertical, horizontal]',

    // Typography
    textColor: 'Use color instead',
    letterSpacing: 'Not supported - remove',
    textIndent: 'Not supported - remove',

    // Borders
    borderTop: 'Use border with direction',
    borderRight: 'Use border with direction',
    borderBottom: 'Use border with direction',
    borderLeft: 'Use border with direction',
    outline: 'Use border instead',

    // Visual
    filter: 'Not supported - remove',
    backdropFilter: 'Not supported - remove',
    mixBlendMode: 'Not supported - remove',

    // Animation
    transition: 'Use show/hide animations in component definition',
    animation: 'Use animate: { type, duration } in component definition',
  }

  return mappings[propName] ?? null
}

// =============================================================================
// Named Color Validation (NEW)
// =============================================================================

function checkNamedColors(code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // List of CSS named colors that should be replaced with tokens
  const namedColors = [
    'white', 'black', 'red', 'blue', 'green', 'gray', 'grey',
    'yellow', 'orange', 'purple', 'pink', 'brown', 'cyan', 'magenta',
    'lime', 'maroon', 'navy', 'olive', 'silver', 'teal', 'transparent',
    'inherit', 'currentColor', 'initial'
  ]

  // Match color property values
  const colorPropRegex = /(?:color|background|backgroundColor|borderColor)\s*:\s*['"]?(\w+)['"]?/gi
  let match

  while ((match = colorPropRegex.exec(code)) !== null) {
    const colorValue = match[1].toLowerCase()

    // Skip if it's a token (starts with $)
    if (colorValue.startsWith('$')) continue

    if (namedColors.includes(colorValue)) {
      issues.push({
        type: 'HARDCODED_COLOR',
        message: `Named color "${match[1]}" - use $token instead`,
        code: match[0],
        fixable: false,
        suggestion: getSuggestedToken(colorValue),
      })
    }
  }

  return issues
}

function getSuggestedToken(color: string): string {
  const suggestions: Record<string, string> = {
    white: 'Use $on-primary.col or $heading.col for white text',
    black: 'Use $app.bg for dark backgrounds',
    red: 'Use $danger.bg or $danger.col for red',
    blue: 'Use $primary.bg or $primary.col for blue',
    green: 'Use $success.bg or $success.col for green',
    gray: 'Use $surface.bg, $muted.col, or $default.col for gray',
    grey: 'Use $surface.bg, $muted.col, or $default.col for grey',
    yellow: 'Use $warning.bg or $warning.col for yellow',
    transparent: 'Use opacity: 0 or simply remove the background',
  }

  return suggestions[color.toLowerCase()] ?? 'Replace with a semantic $token'
}

// =============================================================================
// Invalid Token Format Validation (NEW)
// =============================================================================

function checkInvalidTokenFormat(code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Match things that look like tokens but aren't in the correct format
  // Valid: $name.property (e.g., $primary.bg, $md.pad)
  // Invalid: $name (missing property), $name-property (wrong separator)

  // Check for tokens without property suffix
  const missingPropertyRegex = /\$(\w+)(?![.\w])\s*[,})\]]/g
  let match

  while ((match = missingPropertyRegex.exec(code)) !== null) {
    const tokenName = match[1]

    // Skip if it's a valid special token like $item, $selected, etc.
    if (['item', 'selected', 'index', 'event', 'this', 'self'].includes(tokenName)) {
      continue
    }

    issues.push({
      type: 'INVALID_TOKEN',
      message: `Token "$${tokenName}" is missing property suffix`,
      code: `$${tokenName}`,
      fixable: false,
      suggestion: `Use format $name.property (e.g., $${tokenName}.bg, $${tokenName}.col, $${tokenName}.pad)`,
    })
  }

  return issues
}

// =============================================================================
// Template Literal Validation (NEW)
// =============================================================================

function checkTemplateLiterals(code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Match template literals: `text ${expression}`
  const templateRegex = /`[^`]*\$\{[^}]+\}[^`]*`/g
  let match

  while ((match = templateRegex.exec(code)) !== null) {
    issues.push({
      type: 'TEMPLATE_LITERAL',
      message: 'Template literals are not supported in this context',
      code: match[0].substring(0, 30) + (match[0].length > 30 ? '...' : ''),
      fixable: false,
      suggestion: 'Use string concatenation or variable bindings instead',
    })
  }

  return issues
}

// =============================================================================
// Raw HTML Element Validation (NEW)
// =============================================================================

function checkRawHTMLElements(code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Match lowercase HTML elements that should be replaced
  const htmlElements = [
    'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th',
    'form', 'label', 'button', 'input', 'textarea', 'select', 'option',
    'nav', 'header', 'footer', 'main', 'section', 'article', 'aside',
    'svg', 'path', 'rect', 'circle'
  ]

  for (const element of htmlElements) {
    // Match opening tags: <div, <span, etc.
    const regex = new RegExp(`<${element}(?=[\\s>])`, 'gi')
    let match

    while ((match = regex.exec(code)) !== null) {
      const suggestion = findClosestComponent(element)

      issues.push({
        type: 'INVALID_COMPONENT',
        message: `HTML element "${element}" - use allowed component instead`,
        code: match[0],
        fixable: true,
        suggestion: suggestion ? `Use <${suggestion}> instead` : 'Use an allowed component',
      })
    }
  }

  return issues
}

// =============================================================================
// Auto-Fix Application
// =============================================================================

function applyAutoFixes(code: string, issues: ValidationIssue[]): string {
  let fixedCode = code

  for (const issue of issues) {
    if (!issue.fixable || !issue.code) continue

    switch (issue.type) {
      case 'INVALID_COMPONENT': {
        // Replace unknown component with suggested alternative
        const suggestion = issue.suggestion?.match(/Use "(\w+)"/)?.[1]
        if (suggestion) {
          // Replace opening and closing tags
          const componentName = issue.code.replace('<', '')
          const openTagRegex = new RegExp(`<${componentName}(?=[\\s>/])`, 'g')
          const closeTagRegex = new RegExp(`</${componentName}>`, 'g')
          fixedCode = fixedCode.replace(openTagRegex, `<${suggestion}`)
          fixedCode = fixedCode.replace(closeTagRegex, `</${suggestion}>`)
        }
        break
      }

      case 'SPREAD_OPERATOR': {
        // Remove spread operators
        fixedCode = fixedCode.replace(issue.code, '')
        break
      }
    }
  }

  return fixedCode
}

// =============================================================================
// Export
// =============================================================================

export default validateReactCode
