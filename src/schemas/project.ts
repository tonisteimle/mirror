/**
 * Zod schemas for project import/export validation.
 * Ensures imported projects have valid structure.
 */

import { z } from 'zod'

// Schema for a single page
export const PageSchema = z.object({
  id: z.string().min(1, 'Page ID is required'),
  name: z.string().min(1, 'Page name is required'),
  layoutCode: z.string(),
})

// Schema for the full project
export const ProjectSchema = z.object({
  version: z.number().min(1).max(1).optional().default(1),
  pages: z.array(PageSchema).min(1, 'At least one page is required'),
  currentPageId: z.string().min(1, 'Current page ID is required'),
  componentsCode: z.string().optional().default(''),
  tokensCode: z.string().optional().default(''),
})

// Inferred types from schemas
export type Page = z.infer<typeof PageSchema>
export type Project = z.infer<typeof ProjectSchema>

/**
 * Validates project data and returns parsed result.
 * Throws ZodError if validation fails.
 */
export function validateProject(data: unknown): Project {
  return ProjectSchema.parse(data)
}

/**
 * Safely validates project data without throwing.
 * Returns success/error result object.
 */
export function safeValidateProject(data: unknown) {
  return ProjectSchema.safeParse(data)
}

/**
 * Type guard to check if data is a valid project.
 */
export function isValidProject(data: unknown): data is Project {
  return ProjectSchema.safeParse(data).success
}

/**
 * Formats Zod validation errors into user-friendly messages.
 */
export function formatValidationErrors(error: z.ZodError): string {
  return error.issues
    .map((issue: z.ZodIssue) => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
      return `${path}${issue.message}`
    })
    .join('\n')
}
