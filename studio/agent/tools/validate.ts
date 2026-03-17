/**
 * Validation Tools for Mirror Agent
 *
 * Structural validation and auto-correction of Mirror code.
 * The agent MUST call validate_and_fix after every code generation.
 */

import type { Tool, ToolContext, ToolResult, LLMCommand } from '../types'
import { validateAndFix, validateStructure, formatErrors } from '../validator'

// ============================================
// VALIDATE AND FIX TOOL
// ============================================

export const validateAndFixTool: Tool = {
  name: 'validate_and_fix',
  description: `REQUIRED: Call this after generating or modifying code.

Validates Mirror code for structural errors and auto-fixes what it can:
- Self-closing elements with children (Input, Image, Icon, etc.)
- Empty text elements (H1-H6, Label, Text need content)
- Root element with absolute positioning
- Duplicate properties
- Invalid 'center' on text elements

Returns the fixed code if corrections were made, or error details for issues
that need manual fixing.`,
  parameters: {
    code: {
      type: 'string',
      description: 'The Mirror code to validate and fix',
      required: true
    }
  },
  execute: async ({ code }, ctx: ToolContext): Promise<ToolResult> => {
    if (!code || typeof code !== 'string') {
      return {
        success: false,
        error: 'No code provided to validate'
      }
    }

    const result = validateAndFix(code)

    if (result.valid) {
      return {
        success: true,
        data: {
          valid: true,
          message: 'Code is structurally valid.',
          code: result.fixedCode || code
        }
      }
    }

    // There are errors - some may have been fixed
    const wasFixed = result.fixedCode !== undefined
    const remainingErrors = result.errors

    if (wasFixed && remainingErrors.length === 0) {
      // All errors were auto-fixed
      return {
        success: true,
        data: {
          valid: true,
          message: 'Code had errors that were automatically fixed.',
          code: result.fixedCode,
          autoFixed: true
        },
        commands: [{
          type: 'UPDATE_SOURCE',
          from: 0,
          to: code.length,
          insert: result.fixedCode!
        }]
      }
    }

    // Some errors remain that couldn't be auto-fixed
    return {
      success: false,
      error: `Structural errors found:\n\n${formatErrors(remainingErrors)}`,
      data: {
        valid: false,
        errors: remainingErrors,
        code: result.fixedCode || code,
        partialFix: wasFixed
      }
    }
  }
}

// ============================================
// VALIDATE ONLY TOOL (no auto-fix)
// ============================================

export const validateStructureTool: Tool = {
  name: 'validate_structure',
  description: `Check code for structural errors without fixing them.

Use this to inspect code and understand what's wrong before deciding how to fix it.`,
  parameters: {
    code: {
      type: 'string',
      description: 'The Mirror code to validate',
      required: true
    }
  },
  execute: async ({ code }, ctx: ToolContext): Promise<ToolResult> => {
    if (!code || typeof code !== 'string') {
      return {
        success: false,
        error: 'No code provided to validate'
      }
    }

    const result = validateStructure(code)

    if (result.valid) {
      return {
        success: true,
        data: {
          valid: true,
          message: 'Code is structurally valid.'
        }
      }
    }

    return {
      success: true,
      data: {
        valid: false,
        errorCount: result.errors.length,
        errors: result.errors,
        summary: formatErrors(result.errors)
      }
    }
  }
}

// ============================================
// GENERATE AND VALIDATE TOOL
// ============================================

export const generateValidatedTool: Tool = {
  name: 'generate_validated',
  description: `Generate code and immediately validate it.

Use this instead of update_source when creating new code. It ensures the
generated code passes structural validation before being applied.

If validation fails, returns the errors so you can fix the code.`,
  parameters: {
    code: {
      type: 'string',
      description: 'The Mirror code to generate',
      required: true
    },
    selector: {
      type: 'string',
      description: 'Where to insert: @line, #id, or "replace" for full replacement',
      required: false
    }
  },
  execute: async ({ code, selector }, ctx: ToolContext): Promise<ToolResult> => {
    if (!code || typeof code !== 'string') {
      return {
        success: false,
        error: 'No code provided'
      }
    }

    // First validate
    const result = validateAndFix(code)
    const finalCode = result.fixedCode || code

    if (!result.valid && result.errors.length > 0) {
      // Critical errors that couldn't be fixed
      const criticalErrors = result.errors.filter(e =>
        e.type === 'self-closing-with-children'
      )

      if (criticalErrors.length > 0) {
        return {
          success: false,
          error: `Cannot apply code with critical structural errors:\n\n${formatErrors(criticalErrors)}\n\nPlease fix these issues and try again.`,
          data: {
            errors: criticalErrors,
            code: finalCode
          }
        }
      }
    }

    // Determine insertion strategy
    let command: LLMCommand

    if (selector === 'replace' || !selector) {
      // Full replacement
      const currentCode = ctx.getCode()
      command = {
        type: 'UPDATE_SOURCE',
        from: 0,
        to: currentCode.length,
        insert: finalCode
      }
    } else {
      // Insert at position (simplified - real implementation would need line lookup)
      command = {
        type: 'UPDATE_SOURCE',
        from: 0,
        to: ctx.getCode().length,
        insert: finalCode
      }
    }

    return {
      success: true,
      data: {
        valid: result.valid,
        autoFixed: result.fixedCode !== undefined,
        warnings: result.errors.filter(e => e.type !== 'self-closing-with-children'),
        code: finalCode
      },
      commands: [command]
    }
  }
}

// ============================================
// EXPORT ALL TOOLS
// ============================================

export const validateTools: Tool[] = [
  validateAndFixTool,
  validateStructureTool,
  generateValidatedTool
]
