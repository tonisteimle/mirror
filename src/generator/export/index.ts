/**
 * React CSS Exporter
 *
 * Public API for exporting Mirror DSL to React + CSS.
 *
 * @example
 * import { exportReact } from './generator/export'
 *
 * const result = exportReact('Box 300 pad 16 "Hello"')
 * console.log(result.tsx) // App.tsx content
 * console.log(result.css) // styles.css content
 */

import { parse } from '../../parser/parser'
import type { ASTNode, ComponentTemplate, TokenValue } from '../../parser/types'
import { createClassNameContext, generateClassName } from './class-name-generator'
import { generateAppTsx } from './ast-to-jsx'
import { generateCss } from './ast-to-css'
import { analyzeInteractivity, type InteractivityAnalysis } from './analyze-interactivity'
import type { ExportResult, ExportContext } from './types'

/**
 * Create an export context that tracks class names and interactivity
 */
function createExportContext(
  interactivity: InteractivityAnalysis,
  registry: Map<string, ComponentTemplate>
): ExportContext {
  const classNameCtx = createClassNameContext()
  const nodeClassNames = new Map<string, string>()

  return {
    getClassName(node: ASTNode): string {
      // Return cached class name if already generated
      if (nodeClassNames.has(node.id)) {
        return nodeClassNames.get(node.id)!
      }

      // Generate new class name
      const className = generateClassName(node.name, classNameCtx)
      nodeClassNames.set(node.id, className)
      return className
    },

    isDefinedComponent(name: string): boolean {
      return interactivity.definedComponents.has(name)
    },

    getVisibilityState(name: string) {
      const vs = interactivity.visibilityStates.find((v) => v.elementName === name)
      if (vs) {
        return { stateName: vs.stateName, setterName: vs.setterName }
      }
      return undefined
    },

    getComponentState(name: string) {
      const cs = interactivity.componentStates.find((c) => c.componentName === name)
      if (cs) {
        return { stateName: cs.stateName, states: cs.states }
      }
      return undefined
    },

    isConditionallyRendered(name: string): boolean {
      return interactivity.visibilityStates.some((v) => v.elementName === name)
    },

    interactivity,
    registry,
  }
}

/**
 * Export Mirror DSL code to React + CSS
 *
 * @param dsl - Mirror DSL source code
 * @returns Object containing tsx and css file contents
 */
export function exportReact(dsl: string): ExportResult {
  // Parse the DSL
  const parseResult = parse(dsl)

  // Filter out internal nodes (like _conditional, _iterator)
  const nodes = parseResult.nodes.filter((n) => !n.name.startsWith('_'))

  // Analyze interactivity
  const interactivity = analyzeInteractivity(parseResult)

  // Create shared context
  const ctx = createExportContext(interactivity, parseResult.registry)

  // First pass: generate CSS (this assigns all class names)
  const css = generateCss(nodes, ctx)

  // Second pass: generate JSX (uses assigned class names)
  const tsx = generateAppTsx(nodes, ctx)

  return { tsx, css }
}

/**
 * Export parsed AST nodes to React + CSS
 * (For when you already have parsed nodes)
 */
export function exportReactFromNodes(
  nodes: ASTNode[],
  registry: Map<string, ComponentTemplate>,
  tokens: Map<string, TokenValue>
): ExportResult {
  const filteredNodes = nodes.filter((n) => !n.name.startsWith('_'))

  // Create a minimal parse result for analysis
  const parseResult = {
    nodes: filteredNodes,
    errors: [],
    diagnostics: [],
    parseIssues: [],
    registry,
    tokens,
    styles: new Map(),
    commands: [],
    centralizedEvents: [],
    themes: new Map(),
    activeTheme: null,
  }

  const interactivity = analyzeInteractivity(parseResult)
  const ctx = createExportContext(interactivity, registry)
  const css = generateCss(filteredNodes, ctx)
  const tsx = generateAppTsx(filteredNodes, ctx)

  return { tsx, css }
}

// Re-export types
export type { ExportResult, ExportContext } from './types'
export type { InteractivityAnalysis } from './analyze-interactivity'
