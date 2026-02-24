/**
 * @module converter/react-pivot/pipeline/generation-strategies
 * @description Multiple generation strategies for improved success rate
 *
 * When one approach fails, we can try alternative strategies:
 * 1. Component-First: Generate component definition first, then instances
 * 2. Example-Guided: Provide similar examples from codebase
 * 3. Step-by-Step: Break complex prompts into smaller parts
 * 4. Template-Based: Use predefined templates for common patterns
 */

import type { LLMContext } from '../types'

// =============================================================================
// Types
// =============================================================================

export type GenerationStrategy =
  | 'default'           // Standard single-pass generation
  | 'component-first'   // Define components before instances
  | 'example-guided'    // Include similar examples in prompt
  | 'step-by-step'      // Break into smaller steps
  | 'template-based'    // Use pattern templates

export interface StrategyConfig {
  name: GenerationStrategy
  description: string
  /** Prompt modification function */
  modifyPrompt: (originalPrompt: string, context: LLMContext) => string
  /** When to use this strategy (higher = more likely) */
  priority: number
  /** Keywords that suggest this strategy */
  triggerKeywords: string[]
}

export interface StrategySelection {
  strategy: GenerationStrategy
  modifiedPrompt: string
  reason: string
}

// =============================================================================
// Strategy Definitions
// =============================================================================

const STRATEGIES: StrategyConfig[] = [
  // Default strategy
  {
    name: 'default',
    description: 'Standard single-pass generation',
    modifyPrompt: (prompt) => prompt,
    priority: 0,
    triggerKeywords: [],
  },

  // Component-First Strategy
  {
    name: 'component-first',
    description: 'Generate component definitions first, then create instances',
    modifyPrompt: (prompt, context) => {
      return `## GENERATION APPROACH: Component-First

Please follow these steps:

1. FIRST, analyze what reusable components are needed
2. THEN, define each component with mirror() - include base styles and states
3. FINALLY, create instances with the defined components

${prompt}

### Output Structure:
\`\`\`jsx
// Step 1: Component Definitions
const Card = mirror({ ... })
const Button = mirror({ ... })

// Step 2: Layout with Instances
const Layout = () => (
  <Col>
    <Card>...</Card>
    <Button>...</Button>
  </Col>
)
\`\`\`

Remember: Define components BEFORE using them!`
    },
    priority: 10,
    triggerKeywords: [
      'formular', 'form', 'dashboard', 'liste', 'list',
      'mehrere', 'multiple', 'wiederverwendbar', 'reusable',
      'komponente', 'component', 'button', 'card', 'input'
    ],
  },

  // Example-Guided Strategy
  {
    name: 'example-guided',
    description: 'Include similar examples to guide generation',
    modifyPrompt: (prompt, context) => {
      // Include context examples if available
      const exampleSection = context.components
        ? `## EXISTING EXAMPLES (Follow this style!)
${context.components}
`
        : ''

      return `${exampleSection}
## GENERATE SIMILAR TO ABOVE

Create new code that follows the same patterns and style as the examples above.

Request: ${prompt}

Important:
- Match the coding style of the examples
- Use the same token naming conventions
- Follow the same component structure`
    },
    priority: 8,
    triggerKeywords: [
      'ähnlich', 'similar', 'wie', 'like',
      'gleichen stil', 'same style', 'passend', 'matching'
    ],
  },

  // Step-by-Step Strategy
  {
    name: 'step-by-step',
    description: 'Break complex prompts into sequential steps',
    modifyPrompt: (prompt) => {
      return `## STEP-BY-STEP GENERATION

You will generate code in stages. Think through each step.

### Step 1: Identify Required Elements
What UI elements are needed? List them.

### Step 2: Plan the Structure
How should these elements be organized? (vertical, horizontal, grid)

### Step 3: Define Tokens Needed
What colors, spacing, and radius tokens will you use?

### Step 4: Generate Code
Now generate the complete code.

---

Original Request: ${prompt}

---

Begin with Step 1, then proceed through all steps.
Output ONLY the final code after thinking through all steps.`
    },
    priority: 7,
    triggerKeywords: [
      'komplex', 'complex', 'vollständig', 'complete',
      'umfangreich', 'comprehensive', 'viele', 'many',
      'dashboard', 'page', 'seite', 'vollbild', 'fullscreen'
    ],
  },

  // Template-Based Strategy
  {
    name: 'template-based',
    description: 'Use predefined templates for common patterns',
    modifyPrompt: (prompt, context) => {
      const template = selectTemplate(prompt)
      if (!template) return prompt

      return `## TEMPLATE-GUIDED GENERATION

Use this pattern as a starting point:

\`\`\`jsx
${template.code}
\`\`\`

Now adapt this template for the following request:
${prompt}

Important:
- Keep the same structure
- Modify text, colors, and specific details
- Use tokens from context: ${context.tokens.substring(0, 200)}...`
    },
    priority: 6,
    triggerKeywords: [
      'login', 'anmeldung', 'formular', 'form',
      'modal', 'dialog', 'dropdown', 'menu',
      'navigation', 'sidebar', 'header', 'footer'
    ],
  },
]

// =============================================================================
// Template Library
// =============================================================================

interface Template {
  name: string
  keywords: string[]
  code: string
}

const TEMPLATES: Template[] = [
  {
    name: 'login-form',
    keywords: ['login', 'anmeldung', 'signin', 'anmelden'],
    code: `const LoginForm = mirror({
  tag: 'form',
  base: {
    direction: 'vertical',
    gap: '$md.gap',
    padding: '$lg.pad',
    background: '$surface.bg',
    borderRadius: '$lg.rad',
    width: 320,
  }
})

const FormField = mirror({
  tag: 'div',
  base: { direction: 'vertical', gap: '$sm.gap' }
})

const Label = mirror({
  tag: 'label',
  base: { fontSize: '$sm.font.size', color: '$muted.col' }
})

const StyledInput = mirror({
  tag: 'input',
  base: {
    padding: '$md.pad',
    background: '$input.bg',
    borderRadius: '$md.rad',
    border: 1,
    borderColor: '$default.col',
  },
  states: {
    focus: { borderColor: '$primary.col' }
  }
})

const SubmitButton = mirror({
  tag: 'button',
  base: {
    padding: ['$sm.pad', '$lg.pad'],
    background: '$primary.bg',
    color: '$on-primary.col',
    borderRadius: '$md.rad',
    cursor: 'pointer',
  },
  states: {
    hover: { background: '$primary.hover.bg' }
  }
})

const Form = () => (
  <LoginForm>
    <FormField>
      <Label>Email</Label>
      <StyledInput type="email" placeholder="you@example.com" />
    </FormField>
    <FormField>
      <Label>Password</Label>
      <StyledInput type="password" placeholder="••••••••" />
    </FormField>
    <SubmitButton>Sign In</SubmitButton>
  </LoginForm>
)`,
  },

  {
    name: 'card',
    keywords: ['card', 'karte', 'panel', 'box'],
    code: `const Card = mirror({
  tag: 'div',
  base: {
    direction: 'vertical',
    gap: '$md.gap',
    padding: '$lg.pad',
    background: '$surface.bg',
    borderRadius: '$lg.rad',
  }
})

const CardTitle = mirror({
  tag: 'h3',
  base: {
    fontSize: '$heading.font.size',
    fontWeight: 600,
    color: '$heading.col',
  }
})

const CardContent = mirror({
  tag: 'div',
  base: {
    color: '$default.col',
  }
})`,
  },

  {
    name: 'button-group',
    keywords: ['button', 'buttons', 'actions', 'aktionen'],
    code: `const Button = mirror({
  tag: 'button',
  base: {
    direction: 'horizontal',
    alignItems: 'center',
    gap: '$sm.gap',
    padding: ['$sm.pad', '$lg.pad'],
    borderRadius: '$md.rad',
    cursor: 'pointer',
  }
})

const PrimaryButton = Button.extend({
  base: {
    background: '$primary.bg',
    color: '$on-primary.col',
  },
  states: {
    hover: { background: '$primary.hover.bg' }
  }
})

const SecondaryButton = Button.extend({
  base: {
    background: '$surface.bg',
    color: '$default.col',
  },
  states: {
    hover: { background: '$hover.bg' }
  }
})`,
  },

  {
    name: 'navigation',
    keywords: ['navigation', 'nav', 'menu', 'menü', 'sidebar'],
    code: `const NavItem = mirror({
  tag: 'div',
  base: {
    direction: 'horizontal',
    alignItems: 'center',
    gap: '$md.gap',
    padding: '$md.pad',
    borderRadius: '$md.rad',
    cursor: 'pointer',
    color: '$default.col',
  },
  states: {
    hover: { background: '$hover.bg' },
    active: {
      background: '$primary.bg',
      color: '$on-primary.col',
    }
  }
})

const Nav = () => (
  <Col style={{ gap: '$sm.gap' }}>
    <NavItem onClick={{ action: 'activate', target: 'self' }}>
      <Icon>home</Icon>
      <Text>Dashboard</Text>
    </NavItem>
    <NavItem onClick={{ action: 'activate', target: 'self' }}>
      <Icon>settings</Icon>
      <Text>Settings</Text>
    </NavItem>
  </Col>
)`,
  },
]

function selectTemplate(prompt: string): Template | null {
  const promptLower = prompt.toLowerCase()

  for (const template of TEMPLATES) {
    if (template.keywords.some(kw => promptLower.includes(kw))) {
      return template
    }
  }

  return null
}

// =============================================================================
// Strategy Selection
// =============================================================================

/**
 * Select the best generation strategy based on the prompt and context
 */
export function selectStrategy(
  prompt: string,
  context: LLMContext,
  previousFailures: GenerationStrategy[] = []
): StrategySelection {
  const promptLower = prompt.toLowerCase()

  // Filter out previously failed strategies
  const availableStrategies = STRATEGIES.filter(
    s => !previousFailures.includes(s.name)
  )

  if (availableStrategies.length === 0) {
    return {
      strategy: 'default',
      modifiedPrompt: prompt,
      reason: 'All strategies exhausted, using default',
    }
  }

  // Score each strategy
  const scored = availableStrategies.map(strategy => {
    let score = strategy.priority

    // Check trigger keywords
    const keywordMatches = strategy.triggerKeywords.filter(
      kw => promptLower.includes(kw)
    ).length

    score += keywordMatches * 5

    // Bonus for having context when using example-guided
    if (strategy.name === 'example-guided' && context.components) {
      score += 10
    }

    // Bonus for template-based when template exists
    if (strategy.name === 'template-based' && selectTemplate(prompt)) {
      score += 15
    }

    // Bonus for component-first when prompt mentions reusability
    if (strategy.name === 'component-first') {
      if (promptLower.includes('wiederverwendbar') || promptLower.includes('reusable')) {
        score += 10
      }
    }

    return { strategy, score }
  })

  // Sort by score and select best
  scored.sort((a, b) => b.score - a.score)
  const selected = scored[0].strategy

  // Generate modified prompt
  const modifiedPrompt = selected.modifyPrompt(prompt, context)

  return {
    strategy: selected.name,
    modifiedPrompt,
    reason: `Selected ${selected.name}: ${selected.description}`,
  }
}

/**
 * Get the next strategy to try after a failure
 */
export function getNextStrategy(
  prompt: string,
  context: LLMContext,
  failedStrategies: GenerationStrategy[]
): StrategySelection | null {
  // Check if we have more strategies to try
  const remaining = STRATEGIES.filter(s => !failedStrategies.includes(s.name))

  if (remaining.length === 0) {
    return null
  }

  return selectStrategy(prompt, context, failedStrategies)
}

/**
 * Get all available strategies for a prompt
 */
export function getAvailableStrategies(prompt: string): GenerationStrategy[] {
  return STRATEGIES.map(s => s.name)
}

export default selectStrategy
