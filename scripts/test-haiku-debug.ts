/**
 * Haiku Debug Test - Shows actual output
 */

import { ReactToMirrorConverter } from '../src/__tests__/llm/react-to-mirror'
import * as fs from 'fs'

const API_KEY = (() => {
  try {
    const envContent = fs.readFileSync('/Users/toni.steimle/Documents/Dev/Mirror/archive/v1-react-app/.env.local', 'utf-8')
    return envContent.match(/VITE_OPENROUTER_API_KEY=(.+)/)?.[1]?.trim()
  } catch { return null }
})()

const SYSTEM_PROMPT = `Generate React/JSX with semantic component names.

CRITICAL - ROOT ELEMENT:
The FIRST/ROOT element MUST be a semantic custom component, NOT <div>.
- For sidebar → <Sidebar>
- For dashboard → <Dashboard>
- For list → <TaskList> or <List>
- For navigation → <Nav>
- For card → <Card>

CHILDREN: Also semantic - NavItem, StatCard, ListItem, Logo, Title, Value

NO JAVASCRIPT:
- NO map(), filter(), conditionals
- NO template literals \`\${}\`
- NO object definitions
- NO hooks
- NO event handlers

Return ONLY the JSX function. Hardcode all text content.

EXAMPLE - Sidebar:
\`\`\`jsx
function Component() {
  return (
    <Sidebar style={{ width: 240, backgroundColor: '#1A1A23' }}>
      <Logo>MyApp</Logo>
      <NavItem>Dashboard</NavItem>
      <NavItem>Settings</NavItem>
    </Sidebar>
  )
}
\`\`\`

EXAMPLE - Dashboard:
\`\`\`jsx
function Component() {
  return (
    <Dashboard style={{ padding: 24 }}>
      <Header>Analytics</Header>
      <StatCard>
        <Label>Users</Label>
        <Value>1234</Value>
      </StatCard>
    </Dashboard>
  )
}
\`\`\``

// Test cases with expected names
const TESTS = [
  {
    id: 'list',
    prompt: 'Create a task list with 3 items',
    expected: ['List', 'ListItem'],
  },
  {
    id: 'sidebar',
    prompt: 'Create a sidebar navigation with: Logo, 4 nav items (Dashboard, Projects, Team, Settings)',
    expected: ['Sidebar', 'Logo', 'NavItem'],
  },
  {
    id: 'dashboard',
    prompt: 'Create a dashboard with header "Analytics" and 2 stat cards showing "Users: 1234" and "Revenue: $5678"',
    expected: ['Dashboard', 'Header', 'StatCard'],
  },
]

async function callHaiku(prompt: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://mirror-studio.local',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-haiku-4.5',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 1500,
    })
  })

  const data = await response.json()
  if (data.error) throw new Error(data.error.message)

  let code = data.choices?.[0]?.message?.content || ''
  const match = code.match(/```(?:jsx?|tsx?)?\s*\n?([\s\S]*?)```/)
  return match ? match[1].trim() : code
}

async function main() {
  if (!API_KEY) { console.error('No API key'); process.exit(1) }

  const converter = new ReactToMirrorConverter()

  for (const test of TESTS) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`TEST: ${test.id}`)
    console.log(`Expected: ${test.expected.join(', ')}`)
    console.log('='.repeat(60))

    const react = await callHaiku(test.prompt)
    console.log('\n📦 REACT:')
    console.log(react)

    const result = converter.convert(react)
    console.log('\n🪞 MIRROR:')
    console.log(result.mirror || '(empty)')

    // Check expected (flexible matching: List matches TaskList, UserList, etc.)
    const found: string[] = []
    const missing: string[] = []
    for (const exp of test.expected) {
      const code = result.mirror || ''
      const directMatch = new RegExp(`^\\s*${exp}\\b`, 'im').test(code)
      const suffixMatch = new RegExp(`^\\s*\\w+${exp}\\b`, 'im').test(code)
      const prefixMatch = new RegExp(`^\\s*${exp}\\w+\\b`, 'im').test(code)
      if (directMatch || suffixMatch || prefixMatch) {
        found.push(exp)
      } else {
        missing.push(exp)
      }
    }

    console.log(`\n✅ Found: ${found.join(', ') || 'none'}`)
    console.log(`❌ Missing: ${missing.join(', ') || 'none'}`)
  }
}

main().catch(console.error)
