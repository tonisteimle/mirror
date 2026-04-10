/**
 * React Code Validator for Mirror Conversion
 *
 * Validates that React code follows the guidelines
 * required for clean Mirror conversion.
 *
 * ALLOWED:
 * - useState for hover/selected states
 * - Event handlers (onClick, onMouseEnter, etc.)
 * - Inline style objects
 * - Arrow function components with destructured props
 *
 * NOT ALLOWED:
 * - useEffect, useContext, useReducer (side effects)
 * - className (must use inline styles)
 * - CSS strings in style attribute
 * - External CSS imports
 */

import { parse as babelParse } from '@babel/parser'
import _traverse, { NodePath } from '@babel/traverse'
import * as t from '@babel/types'

// Handle ESM/CJS interop - Babel exports differ based on bundler
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const traverse = (_traverse as { default?: typeof _traverse }).default || _traverse

// ============================================================================
// Types
// ============================================================================

export interface ValidationError {
  rule: string
  message: string
  line?: number
  column?: number
  suggestion?: string
  severity: 'error' | 'warning'
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

// ============================================================================
// Validation Rules
// ============================================================================

// These hooks are forbidden (side effects, complex state)
const FORBIDDEN_HOOKS = [
  'useEffect', 'useContext', 'useReducer',
  'useCallback', 'useMemo', 'useRef', 'useLayoutEffect',
  'useImperativeHandle', 'useDebugValue'
]

// useState is ALLOWED for hover/selected states

// These are allowed event handlers
const ALLOWED_EVENTS = [
  'onClick', 'onMouseEnter', 'onMouseLeave',
  'onFocus', 'onBlur', 'onChange', 'onInput',
  'onKeyDown', 'onKeyUp', 'onKeyPress'
]

// ============================================================================
// Validator
// ============================================================================

export function validateReactCode(code: string): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  try {
    const ast = babelParse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    })

    let hasTokensBlock = false
    let hasAppComponent = false
    const componentDefinitions: string[] = []

    traverse(ast, {
      // Check for forbidden hooks
      CallExpression(path: NodePath<t.CallExpression>) {
        const callee = path.node.callee
        if (t.isIdentifier(callee)) {
          if (FORBIDDEN_HOOKS.includes(callee.name)) {
            errors.push({
              rule: 'no-side-effect-hooks',
              message: `Hook "${callee.name}" ist nicht erlaubt. Nur useState für einfache Zustände.`,
              line: path.node.loc?.start.line,
              column: path.node.loc?.start.column,
              suggestion: 'Entferne den Hook. Für Hover-States nutze useState mit onMouseEnter/onMouseLeave.',
              severity: 'error'
            })
          }
        }
      },

      // Check for tokens block
      VariableDeclarator(path: NodePath<t.VariableDeclarator>) {
        if (t.isIdentifier(path.node.id) && path.node.id.name === 'tokens') {
          hasTokensBlock = true

          // Verify it's an object
          if (!t.isObjectExpression(path.node.init)) {
            warnings.push({
              rule: 'tokens-format',
              message: 'tokens sollte ein Objekt-Literal sein.',
              line: path.node.loc?.start.line,
              suggestion: 'const tokens = { \'$primary\': \'#5BA8F5\', ... }',
              severity: 'warning'
            })
          }
        }

        // Check component definition format
        if (t.isIdentifier(path.node.id)) {
          const name = path.node.id.name
          const init = path.node.init

          // Check if it's an arrow function component
          if (t.isArrowFunctionExpression(init) || t.isFunctionExpression(init)) {
            const params = init.params

            // Should have destructured props: { children, style, ...props }
            if (params.length === 1 && t.isObjectPattern(params[0])) {
              const objPattern = params[0]
              const propNames = objPattern.properties
                .filter((p): p is t.ObjectProperty => t.isObjectProperty(p))
                .map(p => t.isIdentifier(p.key) ? p.key.name : null)
                .filter(Boolean)

              // Check for recommended props (warning, not error)
              if (!propNames.includes('children')) {
                warnings.push({
                  rule: 'component-format',
                  message: `Komponente "${name}" sollte "children" als Prop haben.`,
                  line: path.node.loc?.start.line,
                  suggestion: `const ${name} = ({ children, style, ...props }) => (...)`,
                  severity: 'warning'
                })
              }
              if (!propNames.includes('style')) {
                warnings.push({
                  rule: 'component-format',
                  message: `Komponente "${name}" sollte "style" als Prop haben für Override-Styles.`,
                  line: path.node.loc?.start.line,
                  suggestion: `const ${name} = ({ children, style, ...props }) => (...)`,
                  severity: 'warning'
                })
              }

              componentDefinitions.push(name)
            } else if (params.length === 1 && t.isIdentifier(params[0])) {
              // Has a single identifier param like (props) - should destructure
              warnings.push({
                rule: 'component-format',
                message: `Komponente "${name}" sollte Props destrukturieren.`,
                line: path.node.loc?.start.line,
                suggestion: `const ${name} = ({ children, style, ...props }) => (...)`,
                severity: 'warning'
              })
            }
          }
        }
      },

      // Check for App component
      FunctionDeclaration(path: NodePath<t.FunctionDeclaration>) {
        if (path.node.id?.name === 'App') {
          hasAppComponent = true
        }
      },

      ExportDefaultDeclaration(path: NodePath<t.ExportDefaultDeclaration>) {
        if (t.isFunctionDeclaration(path.node.declaration)) {
          if (path.node.declaration.id?.name === 'App') {
            hasAppComponent = true
          }
        }
        // Also check for export default function App
        if (t.isIdentifier(path.node.declaration) && path.node.declaration.name === 'App') {
          hasAppComponent = true
        }
      },

      // Check JSX attributes
      JSXAttribute(path: NodePath<t.JSXAttribute>) {
        if (!t.isJSXIdentifier(path.node.name)) return
        const attrName = path.node.name.name

        // Check style attribute format
        if (attrName === 'style') {
          const value = path.node.value
          if (t.isJSXExpressionContainer(value)) {
            const expr = value.expression
            // Allow object expressions and identifiers (dynamicStyle)
            if (!t.isObjectExpression(expr) && !t.isIdentifier(expr)) {
              errors.push({
                rule: 'style-format',
                message: 'Style muss ein Objekt-Literal oder Variable sein: style={{ ... }} oder style={dynamicStyle}',
                line: path.node.loc?.start.line,
                suggestion: 'Verwende: style={{ property: value }} oder style={dynamicStyle}',
                severity: 'error'
              })
            }
          } else if (t.isStringLiteral(value)) {
            errors.push({
              rule: 'style-format',
              message: 'Verwende kein CSS-String. Nutze Objekt-Syntax: style={{ ... }}',
              line: path.node.loc?.start.line,
              suggestion: 'Ändere style="..." zu style={{ ... }}',
              severity: 'error'
            })
          }
        }

        // Check for className (should use style instead)
        if (attrName === 'className') {
          errors.push({
            rule: 'no-classname',
            message: 'Verwende "style={{ }}" statt "className". Inline-Styles sind erforderlich.',
            line: path.node.loc?.start.line,
            suggestion: 'Ersetze className durch style={{ ... }}',
            severity: 'error'
          })
        }
      },

      // Check for CSS imports
      ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
        const source = path.node.source.value
        if (source.endsWith('.css') || source.endsWith('.scss') || source.endsWith('.less')) {
          errors.push({
            rule: 'no-css-imports',
            message: `CSS-Import "${source}" ist nicht erlaubt. Nutze Inline-Styles.`,
            line: path.node.loc?.start.line,
            suggestion: 'Entferne den CSS-Import und nutze style={{ ... }}',
            severity: 'error'
          })
        }
      }
    })

    // Check for tokens block
    if (!hasTokensBlock) {
      errors.push({
        rule: 'tokens-required',
        message: 'Ein "const tokens = { ... }" Block mit Farbdefinitionen fehlt.',
        suggestion: 'Füge hinzu: const tokens = { \'$primary\': \'#5BA8F5\', \'$bg.app\': \'#09090B\', ... }',
        severity: 'error'
      })
    }

    // Check for App component
    if (!hasAppComponent) {
      errors.push({
        rule: 'app-required',
        message: 'Eine "export default function App()" Komponente fehlt.',
        suggestion: 'Füge hinzu: export default function App() { return (...) }',
        severity: 'error'
      })
    }

  } catch (e) {
    errors.push({
      rule: 'parse-error',
      message: `Syntax-Fehler: ${e instanceof Error ? e.message : String(e)}`,
      suggestion: 'Überprüfe die JSX-Syntax auf Fehler.',
      severity: 'error'
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

// ============================================================================
// Format Errors for LLM
// ============================================================================

export function formatValidationErrors(result: ValidationResult): string {
  if (result.valid && result.warnings.length === 0) return ''

  const lines: string[] = []

  if (result.errors.length > 0) {
    lines.push('FEHLER (müssen behoben werden):\n')
    for (const error of result.errors) {
      let msg = `- ${error.message}`
      if (error.line) msg += ` (Zeile ${error.line})`
      if (error.suggestion) msg += `\n  → ${error.suggestion}`
      lines.push(msg)
    }
  }

  if (result.warnings.length > 0) {
    if (lines.length > 0) lines.push('')
    lines.push('WARNUNGEN (sollten behoben werden):\n')
    for (const warning of result.warnings) {
      let msg = `- ${warning.message}`
      if (warning.line) msg += ` (Zeile ${warning.line})`
      if (warning.suggestion) msg += `\n  → ${warning.suggestion}`
      lines.push(msg)
    }
  }

  return lines.join('\n')
}

// ============================================================================
// Guidelines for LLM
// ============================================================================

export const REACT_GUIDELINES = `
## React Code Guidelines for Mirror Conversion

### Required Structure:
1. Import React: \`import React, { useState } from 'react'\`
2. Define tokens: \`const tokens = { '$primary': '#5BA8F5', '$bg.app': '#09090B', ... }\`
3. Define components as arrow functions with destructured props
4. Export App component: \`export default function App() { ... }\`

### Component Pattern:
\`\`\`jsx
const ComponentName = ({ children, style, ...props }) => (
  <div style={{ /* base styles */, ...style }} {...props}>
    {children}
  </div>
)
\`\`\`

### For Interactive Components with Hover:
\`\`\`jsx
const InteractiveComponent = ({ children, style, isSelected, ...props }) => {
  const [isHovered, setIsHovered] = useState(false)

  const dynamicStyle = {
    /* base styles */,
    ...(isHovered ? { backgroundColor: '#333' } : {}),
    ...(isSelected ? { backgroundColor: '#5BA8F5' } : {}),
    ...style
  }

  return (
    <div
      style={dynamicStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {children}
    </div>
  )
}
\`\`\`

### Rules:
- ✅ Use inline styles: \`style={{ color: '#fff' }}\`
- ✅ Use useState for hover/selected states
- ✅ Use onClick, onMouseEnter, onMouseLeave for interactions
- ❌ No className - use inline styles
- ❌ No CSS imports
- ❌ No useEffect, useContext, useReducer
- ❌ No external state management

### Token Naming:
- Colors: \`$primary\`, \`$bg.app\`, \`$bg.surface\`, \`$col.text\`
- Use tokens object for all colors
`
