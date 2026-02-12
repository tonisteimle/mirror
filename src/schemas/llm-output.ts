/**
 * Zod Schemas for LLM Output Validation
 *
 * Validates JSON AST output from LLMs before processing.
 * Provides helpful error messages for debugging AI output issues.
 */

import { z } from 'zod'

/**
 * Schema for a single AST node from LLM output
 */
export const LLMNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    type: z.literal('component').optional().default('component'),
    name: z.string().min(1, 'Node name is required'),
    properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().default({}),
    content: z.string().optional(),
    children: z.array(LLMNodeSchema).optional().default([]),
    instanceName: z.string().optional(),
  }).passthrough()  // Allow additional properties for forward compatibility
)

/**
 * Schema for the complete LLM AST output
 */
export const LLMASTSchema = z.object({
  nodes: z.array(LLMNodeSchema).min(1, 'At least one node is required'),
}).strict()

/**
 * Inferred type from schema
 */
export type LLMNode = z.infer<typeof LLMNodeSchema>
export type LLMAST = z.infer<typeof LLMASTSchema>

/**
 * Validate LLM JSON output with detailed error messages
 */
export function validateLLMOutput(data: unknown): LLMAST {
  try {
    return LLMASTSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => {
        const path = issue.path.join('.')
        return `  - ${path}: ${issue.message}`
      }).join('\n')
      throw new Error(`LLM Output Validation fehlgeschlagen:\n${issues}`)
    }
    throw error
  }
}

/**
 * Safely validate LLM output, returning null on failure
 */
export function safeParseLLMOutput(data: unknown): LLMAST | null {
  const result = LLMASTSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Format validation errors for display
 */
export function formatLLMValidationErrors(error: z.ZodError): string {
  return error.issues.map(issue => {
    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
    return `${path}${issue.message}`
  }).join('\n')
}
