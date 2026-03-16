/**
 * Layout Structure Inference Prototype
 *
 * Tests the concept: Given element positions after user manipulation,
 * can an LLM infer the correct layout structure?
 *
 * Usage: npx tsx scripts/test-layout-inference.ts
 */

import * as fs from 'fs'

const API_KEY = process.env.OPENROUTER_API_KEY || (() => {
  try {
    const envContent = fs.readFileSync('/Users/toni.steimle/Documents/Dev/Mirror/archive/v1-react-app/.env.local', 'utf-8')
    const match = envContent.match(/VITE_OPENROUTER_API_KEY=(.+)/)
    return match?.[1]?.trim()
  } catch {
    return null
  }
})()

const SYSTEM_PROMPT = `# Layout Structure Inference

Du bist eine Layout-Engine. Deine Aufgabe: Gegeben eine bestehende Struktur
und neue visuelle Positionen von Elementen, generiere eine neue Struktur
die diese Positionen mit Standard-Layout-Containern ermöglicht.

## Layout-Primitives

- \`Box ver\` - Vertikaler Container, Kinder untereinander
- \`Box hor\` - Horizontaler Container, Kinder nebeneinander
- \`gap N\` - Abstand zwischen Kindern (in Pixeln)
- Verschachtelung ist erlaubt und oft nötig

## Regeln

1. Analysiere die Positionen: Welche Elemente teilen Y-Koordinate? (→ horizontal gruppieren)
2. Welche Elemente sind vertikal gestapelt? (→ vertikal gruppieren)
3. Erkenne Abstände (gaps) aus den Koordinaten
4. Generiere die MINIMALE Struktur die die Anordnung ermöglicht
5. Behalte die Element-Reihenfolge bei wo sinnvoll

## Output Format

Gib NUR die neue Struktur aus, gefolgt von einer kurzen Erklärung.
Verwende das Mirror DSL Format:

\`\`\`mirror
Box ver gap 16
  Text "Titel"
  Box hor gap 8
    Text "A"
    Text "B"
\`\`\`

Erklärung: [Was du erkannt und transformiert hast]`

interface Scenario {
  name: string
  before: string
  positions: string
  expected?: string
}

const scenarios: Scenario[] = [
  {
    name: "Datum neben Autor ziehen",
    before: `Box ver
  Text "Titel"
  Text "Datum"
  Text "Autor"
  Text "Untertitel"`,
    positions: `Element       X      Y      W      H
─────────────────────────────────────
Titel         0      0      400    32
Datum         0      50     100    20
Autor         116    50     120    20
Untertitel    0      90     400    24`,
    expected: `Box ver
  Text "Titel"
  Box hor gap 16
    Text "Datum"
    Text "Autor"
  Text "Untertitel"`
  },
  {
    name: "Element nach rechts schieben (Platz für neues Element)",
    before: `Box ver
  Text "Titel"
  Text "Content"`,
    positions: `Element       X      Y      W      H
─────────────────────────────────────
Titel         0      0      400    32
Content       200    50     200    100`,
    expected: `Box ver
  Text "Titel"
  Box hor
    Slot w 184
    Text "Content"`
  },
  {
    name: "Drei Elemente zu horizontaler Gruppe",
    before: `Box ver
  Text "A"
  Text "B"
  Text "C"
  Text "D"`,
    positions: `Element   X      Y      W      H
─────────────────────────────────
A         0      0      80     24
B         96     0      80     24
C         192    0      80     24
D         0      40     200    24`,
    expected: `Box ver gap 16
  Box hor gap 16
    Text "A"
    Text "B"
    Text "C"
  Text "D"`
  },
  {
    name: "Grid-artige Anordnung erkennen",
    before: `Box ver
  Text "1"
  Text "2"
  Text "3"
  Text "4"`,
    positions: `Element   X      Y      W      H
─────────────────────────────────
1         0      0      100    50
2         116    0      100    50
3         0      66     100    50
4         116    66     100    50`,
    expected: `Box ver gap 16
  Box hor gap 16
    Text "1"
    Text "2"
  Box hor gap 16
    Text "3"
    Text "4"`
  },
  {
    name: "Navigation links, Content rechts",
    before: `Text "Content"`,
    positions: `Element       X      Y      W      H
─────────────────────────────────────
Content       220    0      380    400

(Hinweis: User hat Content nach rechts geschoben,
links ist jetzt Platz 0-200 frei für Navigation)`,
    expected: `Box hor gap 20
  Slot w 200
  Text "Content"`
  }
]

async function callHaiku(userPrompt: string): Promise<{ response: string; latencyMs: number }> {
  const start = Date.now()

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
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 1000,
    })
  })

  const data = await response.json()
  const latencyMs = Date.now() - start

  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error))
  }

  return {
    response: data.choices?.[0]?.message?.content || '',
    latencyMs
  }
}

function buildUserPrompt(scenario: Scenario): string {
  return `### Aktuelle Struktur:
\`\`\`
${scenario.before}
\`\`\`

### Neue Positionen (nach User-Manipulation):
\`\`\`
${scenario.positions}
\`\`\`

Generiere die neue Struktur.`
}

async function runScenario(scenario: Scenario): Promise<void> {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`📐 ${scenario.name}`)
  console.log('═'.repeat(60))

  console.log('\n📥 VORHER:')
  console.log(scenario.before.split('\n').map(l => '   ' + l).join('\n'))

  console.log('\n📍 POSITIONEN:')
  console.log(scenario.positions.split('\n').map(l => '   ' + l).join('\n'))

  const prompt = buildUserPrompt(scenario)

  try {
    const { response, latencyMs } = await callHaiku(prompt)

    console.log(`\n🤖 LLM ANTWORT (${latencyMs}ms):`)
    console.log(response.split('\n').map(l => '   ' + l).join('\n'))

    if (scenario.expected) {
      console.log('\n✅ ERWARTET:')
      console.log(scenario.expected.split('\n').map(l => '   ' + l).join('\n'))
    }
  } catch (error) {
    console.log(`\n❌ ERROR: ${(error as Error).message}`)
  }
}

async function main() {
  if (!API_KEY) {
    console.error('❌ No API key found. Set OPENROUTER_API_KEY')
    process.exit(1)
  }

  console.log('🚀 Layout Structure Inference Prototype')
  console.log(`   Testing ${scenarios.length} scenarios with Claude 3.5 Haiku`)

  for (const scenario of scenarios) {
    await runScenario(scenario)
    // Small delay between requests
    await new Promise(r => setTimeout(r, 500))
  }

  console.log('\n' + '═'.repeat(60))
  console.log('✨ Done!')
}

main().catch(console.error)
