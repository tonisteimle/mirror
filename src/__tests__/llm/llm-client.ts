/**
 * LLM Client for Testing
 *
 * Handles communication with LLM APIs (Claude, OpenAI, etc.)
 * Can use mock responses for deterministic testing
 */

import type { TestScenario, LLMResponse, EditorContext } from './types'
import { SYSTEM_PROMPTS, buildEditorContextPrompt } from './types'

export interface LLMClientConfig {
  provider: 'claude' | 'openai' | 'mock'
  apiKey?: string
  model?: string
  mockResponses?: Map<string, string>
}

export class LLMClient {
  private config: LLMClientConfig

  constructor(config: LLMClientConfig) {
    this.config = config
  }

  /**
   * Generate React code for a scenario
   */
  async generate(scenario: TestScenario): Promise<LLMResponse> {
    const systemPrompt = this.buildSystemPrompt(scenario)
    const userPrompt = this.buildUserPrompt(scenario)

    if (this.config.provider === 'mock') {
      return this.getMockResponse(scenario)
    }

    if (this.config.provider === 'claude') {
      return this.callClaude(systemPrompt, userPrompt)
    }

    if (this.config.provider === 'openai') {
      return this.callOpenAI(systemPrompt, userPrompt)
    }

    throw new Error(`Unknown provider: ${this.config.provider}`)
  }

  /**
   * Build the system prompt based on scenario context
   */
  private buildSystemPrompt(scenario: TestScenario): string {
    let prompt = SYSTEM_PROMPTS.base

    if (scenario.context === 'with-components') {
      prompt = SYSTEM_PROMPTS.withComponents
    } else if (scenario.context === 'mixed') {
      prompt = SYSTEM_PROMPTS.mixed
    }

    // Add editor context if present
    if (scenario.editorContext) {
      prompt += '\n\n' + buildEditorContextPrompt(scenario.editorContext)
    }

    if (scenario.systemPromptAdditions) {
      prompt += '\n\n' + scenario.systemPromptAdditions
    }

    // Add output format instructions
    prompt += `

OUTPUT FORMAT:
Return ONLY the JSX code, no explanations.
Use functional component syntax.
Example:
\`\`\`jsx
function MyComponent() {
  return (
    <div style={{ padding: 16 }}>
      <span>Hello</span>
    </div>
  )
}
\`\`\`
`

    return prompt
  }

  /**
   * Build the user prompt with context
   */
  private buildUserPrompt(scenario: TestScenario): string {
    let prompt = scenario.userPrompt

    if (scenario.existingCode) {
      prompt = `EXISTING COMPONENTS AND TOKENS:
\`\`\`mirror
${scenario.existingCode}
\`\`\`

USER REQUEST:
${scenario.userPrompt}`
    }

    return prompt
  }

  /**
   * Mock response for deterministic testing
   */
  private getMockResponse(scenario: TestScenario): LLMResponse {
    // Check for predefined mock
    if (this.config.mockResponses?.has(scenario.id)) {
      return {
        react: this.config.mockResponses.get(scenario.id)!,
        reasoning: 'Mock response',
      }
    }

    // Generate deterministic mock based on scenario
    return {
      react: this.generateMockReact(scenario),
      reasoning: 'Auto-generated mock for testing',
    }
  }

  /**
   * Generate mock React code based on scenario
   */
  private generateMockReact(scenario: TestScenario): string {
    switch (scenario.id) {
      case 'simple-button-empty':
        return `function Button() {
  return (
    <button style={{
      padding: '12px 24px',
      backgroundColor: '#3B82F6',
      color: 'white',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer'
    }}>
      Click me
    </button>
  )
}`

      case 'simple-button-with-tokens':
        return `function Button() {
  return (
    <button style={{
      padding: 12,
      backgroundColor: 'var(--$primary)',
      color: 'white',
      borderRadius: 8,
      border: 'none'
    }}>
      Submit
    </button>
  )
}`

      case 'simple-button-reuse':
        return `// Reusing existing Button component
function App() {
  return <Button>Cancel</Button>
}`

      case 'medium-list-empty':
        return `function TaskList() {
  const tasks = ['Buy groceries', 'Walk the dog', 'Read a book']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {tasks.map((task, i) => (
        <div key={i} style={{
          padding: '12px',
          backgroundColor: '#27272A',
          borderRadius: '8px',
          color: '#E4E4E7'
        }}>
          {task}
        </div>
      ))}
    </div>
  )
}`

      case 'medium-list-with-components':
        return `// Reusing List and ListItem components
function TaskList() {
  return (
    <List>
      <ListItem>
        <input type="checkbox" />
        <span>Email client</span>
      </ListItem>
      <ListItem>
        <input type="checkbox" />
        <span>Meeting notes</span>
      </ListItem>
      <ListItem>
        <input type="checkbox" />
        <span>Code review</span>
      </ListItem>
    </List>
  )
}`

      case 'hard-nav-empty':
        return `function Sidebar() {
  const items = [
    { icon: 'dashboard', label: 'Dashboard', active: true },
    { icon: 'folder', label: 'Projects', active: false },
    { icon: 'users', label: 'Team', active: false },
    { icon: 'settings', label: 'Settings', active: false },
  ]

  return (
    <nav style={{
      width: '240px',
      height: '100vh',
      backgroundColor: '#1A1A23',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ padding: '16px', fontWeight: 'bold', color: 'white' }}>
        Logo
      </div>
      {items.map((item, i) => (
        <div key={i} style={{
          padding: '12px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: item.active ? '#3B82F6' : 'transparent',
          color: item.active ? 'white' : '#71717A',
          cursor: 'pointer'
        }}>
          <span>[{item.icon}]</span>
          <span>{item.label}</span>
        </div>
      ))}
    </nav>
  )
}`

      case 'complex-dashboard-empty':
        return `function Dashboard() {
  const stats = [
    { label: 'Users', value: '1,234', trend: '+12%' },
    { label: 'Revenue', value: '$12,345', trend: '+8%' },
    { label: 'Orders', value: '567', trend: '+15%' },
    { label: 'Conversion', value: '12.3%', trend: '-2%' },
  ]

  return (
    <div style={{ padding: '24px', backgroundColor: '#0A0A0A', minHeight: '100vh' }}>
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between' }}>
        <h1 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>Analytics</h1>
        <select style={{ padding: '8px', backgroundColor: '#27272A', color: 'white', borderRadius: '8px' }}>
          <option>Last 7 days</option>
        </select>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {stats.map((stat, i) => (
          <div key={i} style={{
            padding: '20px',
            backgroundColor: '#1A1A23',
            borderRadius: '12px'
          }}>
            <div style={{ color: '#71717A', fontSize: '14px' }}>{stat.label}</div>
            <div style={{ color: 'white', fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>
              {stat.value}
            </div>
            <div style={{ color: stat.trend.startsWith('+') ? '#22C55E' : '#EF4444', fontSize: '14px', marginTop: '4px' }}>
              {stat.trend}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}`

      // =================================================================
      // CONTEXTUAL SCENARIOS - Editor Context Tests
      // =================================================================

      case 'context-add-inside-card':
        return `function CardWithButton() {
  return (
    <div style={{ padding: '16px', backgroundColor: '#1A1A23', borderRadius: '8px' }}>
      <span>Welcome</span>
      <button style={{ padding: '12px 24px', backgroundColor: '#3B82F6', color: 'white', borderRadius: '8px' }}>
        Click me
      </button>
    </div>
  )
}`

      case 'context-modify-selected':
        return `function ListItem() {
  return (
    <div style={{ padding: '16px', borderRadius: '8px' }}>
      <span>Item 1</span>
    </div>
  )
}`

      case 'context-add-after':
        return `function Navigation() {
  return (
    <nav style={{ display: 'flex', gap: '16px', padding: '12px' }}>
      <a href="#" style={{ color: '#E4E4E7' }}>Home</a>
      <a href="#" style={{ color: '#71717A' }}>About</a>
      <a href="#" style={{ color: '#71717A' }}>Contact</a>
    </nav>
  )
}`

      case 'context-change-color':
        return `function RedButton() {
  return (
    <button style={{ padding: '12px 24px', backgroundColor: '#EF4444', color: 'white', borderRadius: '8px' }}>
      Save
    </button>
  )
}`

      case 'context-wrap-element':
        return `function CardWrapper() {
  return (
    <div style={{ padding: '16px', backgroundColor: '#1A1A23', borderRadius: '8px' }}>
      <button style={{ padding: '12px 24px', backgroundColor: '#3B82F6', color: 'white' }}>
        Click me
      </button>
    </div>
  )
}`

      case 'context-add-list-items':
        return `function ListItems() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ padding: '8px' }}>Settings</div>
      <div style={{ padding: '8px' }}>Profile</div>
    </div>
  )
}`

      case 'context-preview-selection':
        return `function RoundedImage() {
  return (
    <img src="/hero.jpg" style={{ width: '300px', height: '200px', borderRadius: '12px' }} />
  )
}`

      case 'context-deep-nesting':
        return `function NavItemWithIcon() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '16px' }}>[icon]</span>
      <span>Home</span>
    </div>
  )
}`

      default:
        // Generic fallback
        return `function Component() {
  return (
    <div style={{ padding: '16px', backgroundColor: '#1A1A23', borderRadius: '8px' }}>
      <span style={{ color: '#E4E4E7' }}>Generated for: ${scenario.name}</span>
    </div>
  )
}`
    }
  }

  /**
   * Call Claude API
   */
  private async callClaude(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    if (!this.config.apiKey) {
      throw new Error('Claude API key required')
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`Claude API error: ${JSON.stringify(data)}`)
    }

    const content = data.content[0].text
    const react = this.extractCode(content)

    return { react, reasoning: content }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key required')
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${JSON.stringify(data)}`)
    }

    const content = data.choices[0].message.content
    const react = this.extractCode(content)

    return { react, reasoning: content }
  }

  /**
   * Extract code from markdown code blocks
   */
  private extractCode(content: string): string {
    // Try to extract from code block
    const codeBlockMatch = content.match(/```(?:jsx?|tsx?|javascript|typescript)?\n([\s\S]*?)```/)
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim()
    }

    // If no code block, return trimmed content
    return content.trim()
  }
}

/**
 * Create a mock LLM client for testing
 */
export function createMockClient(customResponses?: Map<string, string>): LLMClient {
  return new LLMClient({
    provider: 'mock',
    mockResponses: customResponses,
  })
}

/**
 * Create a Claude client
 */
export function createClaudeClient(apiKey: string, model?: string): LLMClient {
  return new LLMClient({
    provider: 'claude',
    apiKey,
    model,
  })
}

/**
 * Create an OpenAI client
 */
export function createOpenAIClient(apiKey: string, model?: string): LLMClient {
  return new LLMClient({
    provider: 'openai',
    apiKey,
    model,
  })
}
