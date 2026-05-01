/**
 * MCP Prompts - Pre-defined prompts for common tasks
 */

export interface PromptDefinition {
  name: string
  description: string
  arguments?: Array<{
    name: string
    description: string
    required?: boolean
  }>
}

export const PROMPTS: PromptDefinition[] = [
  {
    name: 'explain-element',
    description: 'Explain what a Mirror element does and how it works',
    arguments: [
      {
        name: 'line',
        description: 'Line number of the element to explain',
        required: true,
      },
    ],
  },
  {
    name: 'improve-component',
    description: 'Suggest improvements for a component (accessibility, best practices)',
    arguments: [
      {
        name: 'component',
        description: 'Name of the component to improve',
        required: true,
      },
    ],
  },
  {
    name: 'create-variant',
    description: 'Create a variant of an existing component',
    arguments: [
      {
        name: 'component',
        description: 'Base component name',
        required: true,
      },
      {
        name: 'variant',
        description: 'Variant name (e.g., "Primary", "Danger", "Ghost")',
        required: true,
      },
    ],
  },
  {
    name: 'add-interactivity',
    description: 'Add states and interactions to a static component',
    arguments: [
      {
        name: 'component',
        description: 'Component to make interactive',
        required: true,
      },
    ],
  },
  {
    name: 'extract-tokens',
    description: 'Extract hardcoded values into design tokens',
  },
  {
    name: 'review-code',
    description: 'Review Mirror code for issues and suggest improvements',
  },
  {
    name: 'convert-to-component',
    description: 'Convert an element into a reusable component',
    arguments: [
      {
        name: 'line',
        description: 'Line number of the element to convert',
        required: true,
      },
      {
        name: 'name',
        description: 'Name for the new component',
        required: true,
      },
    ],
  },
  {
    name: 'add-responsive',
    description: 'Add responsive behavior to a layout',
    arguments: [
      {
        name: 'line',
        description: 'Line number of the layout element',
        required: true,
      },
    ],
  },
]

/**
 * Get prompt content
 */
export function getPromptContent(
  name: string,
  args: Record<string, string>,
  fileContent: string
): { messages: Array<{ role: string; content: string }> } {
  switch (name) {
    case 'explain-element': {
      const line = parseInt(args.line, 10)
      const lines = fileContent.split('\n')
      const elementLine = lines[line - 1] || ''

      return {
        messages: [
          {
            role: 'user',
            content: `Explain this Mirror element on line ${line}:

\`\`\`mirror
${elementLine}
\`\`\`

Context (surrounding lines):
\`\`\`mirror
${lines.slice(Math.max(0, line - 3), line + 2).join('\n')}
\`\`\`

Please explain:
1. What element type is this?
2. What do the properties do?
3. How does it fit in the layout hierarchy?
4. Any states or interactions?`,
          },
        ],
      }
    }

    case 'improve-component': {
      return {
        messages: [
          {
            role: 'user',
            content: `Review the component "${args.component}" and suggest improvements:

Current file:
\`\`\`mirror
${fileContent}
\`\`\`

Please analyze:
1. Accessibility (keyboard navigation, ARIA if needed)
2. Consistent spacing and sizing
3. Token usage (are there hardcoded values that should be tokens?)
4. State handling (hover, focus, active, disabled)
5. Best practices for Mirror DSL`,
          },
        ],
      }
    }

    case 'create-variant': {
      return {
        messages: [
          {
            role: 'user',
            content: `Create a "${args.variant}" variant of the "${args.component}" component.

Current file:
\`\`\`mirror
${fileContent}
\`\`\`

Use the \`as\` keyword for inheritance. The variant should:
1. Inherit base properties from ${args.component}
2. Override only what's necessary for the "${args.variant}" style
3. Keep the same structure and slots`,
          },
        ],
      }
    }

    case 'add-interactivity': {
      return {
        messages: [
          {
            role: 'user',
            content: `Add interactivity to the "${args.component}" component.

Current file:
\`\`\`mirror
${fileContent}
\`\`\`

Add appropriate:
1. hover: state with visual feedback
2. focus: state for keyboard users
3. active: state for click feedback
4. Any relevant functions (toggle(), exclusive(), etc.)
5. Cursor styles`,
          },
        ],
      }
    }

    case 'extract-tokens': {
      return {
        messages: [
          {
            role: 'user',
            content: `Extract hardcoded values into design tokens.

Current file:
\`\`\`mirror
${fileContent}
\`\`\`

Please:
1. Identify repeated colors, spacing, radii, etc.
2. Create semantic token names ($primary.bg, $card.rad, etc.)
3. Replace hardcoded values with tokens
4. Group related tokens together`,
          },
        ],
      }
    }

    case 'review-code': {
      return {
        messages: [
          {
            role: 'user',
            content: `Review this Mirror code:

\`\`\`mirror
${fileContent}
\`\`\`

Check for:
1. Syntax issues (missing commas, colons)
2. Layout problems (inconsistent spacing, alignment)
3. Naming conventions (PascalCase components, semantic names)
4. Token usage (hardcoded values that should be tokens)
5. State handling (missing hover/focus states)
6. Accessibility concerns
7. Code organization (tokens at top, components, then instances)`,
          },
        ],
      }
    }

    case 'convert-to-component': {
      const line = parseInt(args.line, 10)
      const lines = fileContent.split('\n')

      // Get the element and its children (based on indent)
      const elementLine = lines[line - 1]
      const elementIndent = elementLine.length - elementLine.trimStart().length
      let endLine = line

      for (let i = line; i < lines.length; i++) {
        const lineContent = lines[i]
        const lineIndent = lineContent.length - lineContent.trimStart().length
        if (lineContent.trim() && lineIndent <= elementIndent && i > line - 1) {
          break
        }
        endLine = i + 1
      }

      const elementCode = lines.slice(line - 1, endLine).join('\n')

      return {
        messages: [
          {
            role: 'user',
            content: `Convert this element into a reusable component named "${args.name}":

\`\`\`mirror
${elementCode}
\`\`\`

Please:
1. Create a component definition with ${args.name}:
2. Identify parts that should be slots (customizable content)
3. Extract variable parts as properties
4. Keep hardcoded design values as defaults
5. Show an example usage of the new component`,
          },
        ],
      }
    }

    case 'add-responsive': {
      const line = parseInt(args.line, 10)
      const lines = fileContent.split('\n')
      const elementLine = lines[line - 1] || ''

      return {
        messages: [
          {
            role: 'user',
            content: `Add responsive behavior to this layout element:

\`\`\`mirror
${elementLine}
\`\`\`

Suggest how to:
1. Make it stack vertically on narrow screens (hor → ver)
2. Adjust spacing for different sizes
3. Use wrap for overflow
4. Consider w full / w hug patterns`,
          },
        ],
      }
    }

    default:
      return {
        messages: [
          {
            role: 'user',
            content: `Unknown prompt: ${name}`,
          },
        ],
      }
  }
}
