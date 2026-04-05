/**
 * LLM Integration for Mirror Studio
 *
 * Handles the workflow: User Prompt → LLM (React) → Mirror → Editor
 */

// =============================================================================
// Types (inline definitions - originally from __tests__/llm/types)
// =============================================================================

export interface EditorContext {
  cursorLine: number
  cursorColumn?: number
  selectedNodeId?: string
  selectedNodeName?: string
  ancestors?: string[]
  insideComponent?: string
  surroundingCode?: {
    before: string
    after: string
  }
}

/**
 * Build context prompt for the editor state
 */
function buildEditorContextPrompt(context: EditorContext): string {
  let prompt = ''
  if (context.insideComponent) {
    prompt += `Currently inside component: ${context.insideComponent}\n`
  }
  if (context.selectedNodeName) {
    prompt += `Selected element: ${context.selectedNodeName}\n`
  }
  if (context.surroundingCode?.before) {
    prompt += `Code before cursor:\n${context.surroundingCode.before}\n`
  }
  return prompt
}

/**
 * Simple React to Mirror converter (placeholder implementation)
 * TODO: Import from proper converter module when available
 */
class ReactToMirrorConverter {
  convert(reactCode: string): { mirror?: string; errors?: string[] } {
    // Basic conversion - strip JSX syntax
    // This is a placeholder; the real implementation should be more sophisticated
    try {
      // Remove function wrapper
      let code = reactCode
        .replace(/function\s+\w+\s*\(\)\s*\{/, '')
        .replace(/return\s*\(/, '')
        .replace(/\)\s*\}\s*$/, '')
        .trim()

      // Very basic JSX to Mirror conversion
      code = code
        .replace(/<div/g, 'Frame')
        .replace(/<span/g, 'Text')
        .replace(/<button/g, 'Button')
        .replace(/<\/\w+>/g, '')
        .replace(/>/g, '')
        .replace(/style=\{\{([^}]+)\}\}/g, (_, styles) => {
          // Convert inline styles
          return styles
            .replace(/['"](\w+)['"]/g, '$1')
            .replace(/,\s*/g, ', ')
        })

      return { mirror: code }
    } catch (error) {
      return { errors: [(error as Error).message] }
    }
  }
}

// =============================================================================
// Types
// =============================================================================

export interface StudioContext {
  // Current Mirror code in editor
  source: string

  // Extracted tokens from code
  tokens: Array<{ name: string; value: string }>

  // Extracted component definitions
  components: Array<{ name: string; base: string; properties: string[] }>

  // Editor cursor/selection info
  editor: EditorContext
}

export interface GenerationResult {
  success: boolean
  mirror?: string
  react?: string
  error?: string
  insertPosition?: {
    line: number
    column: number
  }
}

export interface LLMConfig {
  apiKey: string
  model?: string
  baseUrl?: string
}

// =============================================================================
// System Prompt for React Generation
// =============================================================================

const REACT_SYSTEM_PROMPT = `You are a UI developer. Generate React/JSX code for the requested UI.

IMPORTANT RULES:
1. Return ONLY JSX code inside a functional component
2. Use inline styles with camelCase properties
3. Use semantic HTML elements (div, button, span, nav, header, etc.)
4. Keep the code clean and minimal
5. Do NOT include imports or exports
6. Do NOT include explanations - just the code

EXAMPLE OUTPUT:
\`\`\`jsx
function Component() {
  return (
    <div style={{ padding: '16px', backgroundColor: '#1A1A23', borderRadius: '8px' }}>
      <span style={{ color: '#E4E4E7' }}>Hello World</span>
    </div>
  )
}
\`\`\`

STYLE GUIDELINES:
- Use hex colors (e.g., '#3B82F6')
- Use pixel values for spacing (e.g., '16px', '12px 24px')
- Common properties: padding, backgroundColor, color, borderRadius, display, flexDirection, gap, alignItems, justifyContent
`

// =============================================================================
// Build System Prompt
// =============================================================================

export function buildReactSystemPrompt(context: StudioContext): string {
  let prompt = REACT_SYSTEM_PROMPT

  // Add context about existing tokens
  if (context.tokens.length > 0) {
    prompt += `\n\nAVAILABLE DESIGN TOKENS (use as CSS variables):\n`
    for (const token of context.tokens.slice(0, 20)) {
      prompt += `- var(--${token.name}): ${token.value}\n`
    }
  }

  // Add context about existing components (for reference)
  if (context.components.length > 0) {
    prompt += `\n\nEXISTING COMPONENTS (for style consistency):\n`
    for (const comp of context.components.slice(0, 10)) {
      prompt += `- ${comp.name}: ${comp.properties.slice(0, 5).join(', ')}\n`
    }
  }

  // Add editor context if available
  if (context.editor) {
    prompt += '\n' + buildEditorContextPrompt(context.editor)
  }

  return prompt
}

// =============================================================================
// Extract Context from Editor
// =============================================================================

export function extractStudioContext(
  source: string,
  cursorLine: number,
  cursorColumn: number,
  selectedNodeId?: string,
  selectedNodeName?: string,
  ancestors?: string[]
): StudioContext {
  const lines = source.split('\n')

  const tokens: StudioContext['tokens'] = []
  const components: StudioContext['components'] = []

  let inTokenBlock = false
  let tokenBlockPrefix = ''
  let currentComponent: StudioContext['components'][0] | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    const indent = line.length - line.trimStart().length

    if (!trimmed || trimmed.startsWith('//')) continue

    // Token: $name: value or name: #hex
    const tokenMatch = trimmed.match(/^\$?([a-zA-Z0-9._-]+)\s*:\s*(#[a-fA-F0-9]{3,8}|\d+)$/)
    if (tokenMatch && indent === 0) {
      tokens.push({ name: tokenMatch[1], value: tokenMatch[2] })
      continue
    }

    // Token block: $name:
    const tokenBlockMatch = trimmed.match(/^\$([a-zA-Z0-9._-]+)\s*:\s*$/)
    if (tokenBlockMatch) {
      inTokenBlock = true
      tokenBlockPrefix = tokenBlockMatch[1]
      continue
    }

    // Token in block
    if (inTokenBlock && indent > 0) {
      const blockTokenMatch = trimmed.match(/^([a-zA-Z0-9._-]+)\s+(.+)$/)
      if (blockTokenMatch) {
        tokens.push({
          name: `${tokenBlockPrefix}.${blockTokenMatch[1]}`,
          value: blockTokenMatch[2]
        })
      }
      continue
    }

    if (indent === 0) {
      inTokenBlock = false
    }

    // Component definition: Name as primitive:
    const componentMatch = trimmed.match(/^([A-Z][a-zA-Z0-9]*)\s+as\s+(\w+)\s*:/)
    if (componentMatch) {
      if (currentComponent) {
        components.push(currentComponent)
      }
      currentComponent = {
        name: componentMatch[1],
        base: componentMatch[2],
        properties: []
      }
      continue
    }

    // Component properties
    if (currentComponent && indent > 0) {
      const props = trimmed.split(',').map(p => p.trim().split(' ')[0])
      currentComponent.properties.push(...props.filter(p => p && !p.startsWith('//')))
    }

    // End of component
    if (currentComponent && indent === 0 && !trimmed.match(/^[A-Z]/)) {
      components.push(currentComponent)
      currentComponent = null
    }
  }

  if (currentComponent) {
    components.push(currentComponent)
  }

  // Build surrounding code context
  const contextLines = 5
  const beforeLines = lines.slice(Math.max(0, cursorLine - contextLines), cursorLine)
  const afterLines = lines.slice(cursorLine + 1, cursorLine + 1 + contextLines)

  // Determine which component the cursor is inside
  let insideComponent: string | undefined
  for (let i = cursorLine; i >= 0; i--) {
    const line = lines[i]
    const indent = line.length - line.trimStart().length
    if (indent === 0 && line.trim()) {
      const match = line.trim().match(/^([A-Z][a-zA-Z0-9]*)/)
      if (match) {
        insideComponent = match[1]
        break
      }
    }
  }

  return {
    source,
    tokens,
    components,
    editor: {
      cursorLine,
      cursorColumn,
      selectedNodeId,
      selectedNodeName,
      ancestors,
      insideComponent,
      surroundingCode: {
        before: beforeLines.join('\n'),
        after: afterLines.join('\n')
      }
    }
  }
}

// =============================================================================
// LLM API Call
// =============================================================================

export async function callLLM(
  prompt: string,
  systemPrompt: string,
  config: LLMConfig
): Promise<string> {
  const baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1'

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://mirror-studio.local',
    },
    body: JSON.stringify({
      model: config.model || 'anthropic/claude-sonnet-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 4000
    })
  })

  const data = await response.json()

  if (data.error) {
    throw new Error(data.error.message || 'API Error')
  }

  return data.choices[0].message.content
}

// =============================================================================
// Extract React from LLM Response
// =============================================================================

export function extractReactFromResponse(response: string): string {
  // Try to extract from code block
  const codeBlockMatch = response.match(/```(?:jsx?|tsx?|javascript|typescript)?\s*\n?([\s\S]*?)```/)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }

  // If no code block, return trimmed content
  return response.trim()
}

// =============================================================================
// Main Generation Function
// =============================================================================

export async function generateFromPrompt(
  userPrompt: string,
  context: StudioContext,
  config: LLMConfig
): Promise<GenerationResult> {
  try {
    // Step 1: Build system prompt
    const systemPrompt = buildReactSystemPrompt(context)

    // Step 2: Call LLM to generate React
    const llmResponse = await callLLM(userPrompt, systemPrompt, config)

    // Step 3: Extract React code from response
    const reactCode = extractReactFromResponse(llmResponse)

    if (!reactCode) {
      return {
        success: false,
        error: 'No code generated'
      }
    }

    // Step 4: Convert React to Mirror
    const converter = new ReactToMirrorConverter()
    const conversionResult = converter.convert(reactCode)

    if (conversionResult.errors && conversionResult.errors.length > 0) {
      return {
        success: false,
        react: reactCode,
        error: `Conversion error: ${conversionResult.errors.join(', ')}`
      }
    }

    if (!conversionResult.mirror) {
      return {
        success: false,
        react: reactCode,
        error: 'Conversion produced empty result'
      }
    }

    // Step 5: Determine insert position
    const insertPosition = {
      line: context.editor.cursorLine,
      column: context.editor.cursorColumn || 0
    }

    return {
      success: true,
      mirror: conversionResult.mirror,
      react: reactCode,
      insertPosition
    }

  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    }
  }
}

// =============================================================================
// Prepare Mirror Code for Insertion
// =============================================================================

export function prepareCodeForInsertion(
  mirrorCode: string,
  context: StudioContext,
  insertMode: 'append' | 'insert' | 'replace' = 'insert'
): string {
  const lines = mirrorCode.split('\n')

  // If inserting inside a component, add proper indentation
  if (context.editor.insideComponent && insertMode === 'insert') {
    // Detect current indentation level from surrounding code
    const surroundingLines = context.editor.surroundingCode?.before.split('\n') || []
    let baseIndent = 0

    for (const line of surroundingLines.reverse()) {
      if (line.trim()) {
        baseIndent = line.length - line.trimStart().length
        break
      }
    }

    // Add one level of indentation for child elements
    const childIndent = baseIndent + 2
    const indentedLines = lines.map(line => {
      if (line.trim()) {
        return ' '.repeat(childIndent) + line.trim()
      }
      return line
    })

    return '\n' + indentedLines.join('\n')
  }

  // Default: add newlines for separation
  return '\n\n' + mirrorCode
}

// =============================================================================
// Export for use in studio.html
// =============================================================================

// Extend Window for global MirrorLLM
declare global {
  interface Window {
    MirrorLLM?: {
      extractStudioContext: typeof extractStudioContext
      buildReactSystemPrompt: typeof buildReactSystemPrompt
      generateFromPrompt: typeof generateFromPrompt
      prepareCodeForInsertion: typeof prepareCodeForInsertion
      callLLM: typeof callLLM
      extractReactFromResponse: typeof extractReactFromResponse
    }
  }
}

// Make available globally for non-module usage
if (typeof window !== 'undefined') {
  window.MirrorLLM = {
    extractStudioContext,
    buildReactSystemPrompt,
    generateFromPrompt,
    prepareCodeForInsertion,
    callLLM,
    extractReactFromResponse
  }
}
