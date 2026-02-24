/**
 * Stepwise Generator
 *
 * Generates Mirror code step-by-step based on a component plan.
 * Reports progress via callback for UI updates.
 */

import { generateMirrorCodeWithOptions } from './ai'
import { logger } from '../services/logger'
import type { ComponentPlan, GenerationPlan } from './plan-generator'

export interface StepProgress {
  currentStep: number
  totalSteps: number
  currentComponent: string
}

export type ProgressCallback = (progress: StepProgress) => void

interface GenerationContext {
  tokensCode?: string
  componentsCode?: string
  layoutCode?: string
}

/**
 * Generate a single component with context from parent
 */
async function generateComponent(
  component: ComponentPlan,
  parentContext: string,
  context: GenerationContext
): Promise<string> {
  const prompt = parentContext
    ? `PARENT-KONTEXT:
\`\`\`
${parentContext}
\`\`\`

Generiere jetzt die Komponente "${component.name}":
${component.description}

WICHTIG: Generiere NUR diese Komponente, nicht den Parent. Die Komponente wird später in den Parent eingefügt.`
    : `Generiere die Root-Komponente "${component.name}":
${component.description}

${component.children?.length ? `Diese Komponente hat Unterkomponenten die später eingefügt werden. Erstelle Platzhalter-Slots oder leere Bereiche für: ${component.children.map(c => c.name).join(', ')}` : ''}`

  const result = await generateMirrorCodeWithOptions(prompt, context)
  return result.code || ''
}

/**
 * Recursively generate components and merge them
 */
async function generateRecursive(
  components: ComponentPlan[],
  parentCode: string,
  context: GenerationContext,
  onProgress: ProgressCallback,
  state: { current: number; total: number }
): Promise<string> {
  let result = parentCode

  for (const component of components) {
    // Update progress
    state.current += 1
    onProgress({
      currentStep: state.current,
      totalSteps: state.total,
      currentComponent: component.name,
    })

    // Generate this component
    const componentCode = await generateComponent(component, parentCode, context)

    if (!componentCode) {
      logger.ai.warn('Empty component generated', { name: component.name })
      continue
    }

    // If this is the first component (root), use it as base
    if (!result) {
      result = componentCode
    } else {
      // Merge into parent - find placeholder and replace
      result = mergeComponent(result, component.name, componentCode)
    }

    // Generate children recursively
    if (component.children?.length) {
      result = await generateRecursive(
        component.children,
        componentCode,
        context,
        onProgress,
        state
      )
    }
  }

  return result
}

/**
 * Merge a child component into parent code
 * Tries to find a placeholder or appends to the parent
 */
function mergeComponent(parentCode: string, componentName: string, componentCode: string): string {
  // Try to find a placeholder comment
  const placeholderPattern = new RegExp(
    `//\\s*${componentName}|/\\*\\s*${componentName}\\s*\\*/|{\\s*${componentName}\\s*}`,
    'i'
  )

  if (placeholderPattern.test(parentCode)) {
    return parentCode.replace(placeholderPattern, componentCode)
  }

  // Try to find an empty slot with the component name
  const slotPattern = new RegExp(`${componentName}\\s*\\{\\s*\\}`, 'i')
  if (slotPattern.test(parentCode)) {
    return parentCode.replace(slotPattern, componentCode)
  }

  // Fallback: append after the parent
  // Find the last closing brace and insert before it
  const lastBraceIndex = parentCode.lastIndexOf('}')
  if (lastBraceIndex > 0) {
    const indent = '  '
    return (
      parentCode.slice(0, lastBraceIndex) +
      '\n' + indent + componentCode.split('\n').join('\n' + indent) +
      '\n' + parentCode.slice(lastBraceIndex)
    )
  }

  // Last resort: just append
  return parentCode + '\n\n' + componentCode
}

/**
 * Generate code stepwise based on a plan
 */
export async function generateStepwise(
  plan: GenerationPlan,
  context: GenerationContext,
  onProgress: ProgressCallback
): Promise<string> {
  const state = { current: 0, total: plan.totalSteps }

  logger.ai.debug('Starting stepwise generation', { totalSteps: plan.totalSteps })

  try {
    const code = await generateRecursive(
      plan.components,
      '',
      context,
      onProgress,
      state
    )

    logger.ai.debug('Stepwise generation complete')
    return code
  } catch (err) {
    logger.ai.error('Stepwise generation failed', err)
    throw err
  }
}
