/**
 * Fair Comparison: React-Umweg vs Direct Mirror
 *
 * Both approaches get the SAME best-practice example,
 * just in different formats (React vs Mirror).
 */

import { parse, generateReact } from '../src/index'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

if (!OPENROUTER_API_KEY) {
  console.error('Missing OPENROUTER_API_KEY')
  process.exit(1)
}

// ============================================================================
// BEST PRACTICE EXAMPLE (Mirror)
// ============================================================================

const BEST_PRACTICE_MIRROR = `// Tokens - Palette
$grey-950: #09090B
$grey-900: #18181B
$grey-800: #27272A
$grey-700: #3F3F46
$grey-500: #71717A
$grey-300: #D4D4D8
$grey-100: #F4F4F5

$blue-500: #3B82F6
$blue-600: #2563EB

// Tokens - Semantic
$app.bg: $grey-950
$surface.bg: $grey-900
$card.bg: $grey-800
$hover.bg: $grey-700

$heading.col: $grey-100
$text.col: $grey-300
$muted.col: $grey-500

$primary.bg: $blue-500
$primary.hover.bg: $blue-600

$sm.pad: 8
$md.pad: 12
$lg.pad: 16

$sm.gap: 8
$md.gap: 12

$sm.rad: 4
$md.rad: 6

// Components
Heading: col $heading.col, weight bold, font-size 18
Body: col $text.col, font-size 13
Muted: col $muted.col, font-size 12

Button: pad $sm.pad $md.pad, bg $primary.bg, col white, rad $sm.rad, cursor pointer
  hover bg $primary.hover.bg

Card: pad $lg.pad, bg $card.bg, rad $md.rad, gap $md.gap

NavItem: hor, gap $sm.gap, pad $sm.pad $md.pad, rad $sm.rad, cursor pointer
  Icon: is 18, col $muted.col
  Label: col $text.col
  hover bg $hover.bg

// App
App hor, w full, h full, bg $app.bg

  Sidebar w 220, h full, bg $surface.bg, pad $md.pad, gap $md.gap
    Heading "App Name", font-size 15
    Nav gap 4
      NavItem Icon "home"; Label "Home"
      NavItem Icon "settings"; Label "Settings"

  Main w full, pad $lg.pad, gap $lg.pad
    Heading "Welcome"
    Card
      Body "Your content here."`

// Generate React version of the example
const exampleAST = parse(BEST_PRACTICE_MIRROR)
const BEST_PRACTICE_REACT = generateReact(exampleAST)

// ============================================================================
// PROMPTS
// ============================================================================

const USER_PROMPT = `Erstelle eine Master-Detail Aufgabenverwaltung im Darkmodus mit flächigem, zurückhaltendem Design.

Links eine Liste von Aufgaben (mit Priorität, Titel, Fälligkeitsdatum).
Rechts die Details der ausgewählten Aufgabe (Titel, Beschreibung, Teilaufgaben, Kommentare).`

const REACT_SYSTEM_PROMPT = `Du bist ein UI-Designer. Generiere einen STATISCHEN UI-Prototypen in JSX.

WICHTIG:
1. KEIN useState, KEINE Hooks, KEINE Event-Handler
2. NUR statisches JSX mit Inline-Styles
3. Beispieldaten direkt als Text einsetzen
4. Folge dem Stil des Beispiels

BEISPIEL (generiert aus unserem Design-System):
\`\`\`jsx
${BEST_PRACTICE_REACT}
\`\`\`

Generiere ähnlichen Code. Keine Erklärungen, nur JSX.`

const MIRROR_SYSTEM_PROMPT = `Du schreibst UI-Code in Mirror DSL. Antworte NUR mit validem Mirror-Code.

SYNTAX:
- Tokens: $name: value
- Komponente definieren: Name: properties
- Komponente verwenden: Name "content"
- Kinder: eingerückt
- States: hover bg #color

BEISPIEL:
\`\`\`mirror
${BEST_PRACTICE_MIRROR}
\`\`\`

Generiere ähnlichen Code. Keine Erklärungen, nur Mirror-Code.`

// ============================================================================
// REACT TO MIRROR CONVERTER (simplified)
// ============================================================================

const STYLE_TO_MIRROR: Record<string, string> = {
  'padding': 'pad',
  'backgroundColor': 'bg',
  'color': 'col',
  'borderRadius': 'rad',
  'width': 'w',
  'height': 'h',
  'gap': 'gap',
  'fontSize': 'font-size',
  'fontWeight': 'weight',
  'display': '_display',
  'flexDirection': '_flexDirection',
  'alignItems': '_alignItems',
  'justifyContent': '_justifyContent',
  'cursor': 'cursor',
  'opacity': 'opacity',
}

function convertReactToMirror(reactCode: string): string {
  // Extract JSX from code block
  const jsxMatch = reactCode.match(/```(?:jsx?)?\s*\n?([\s\S]*?)```/)
  const jsx = jsxMatch ? jsxMatch[1].trim() : reactCode.trim()

  // Remove function wrapper
  const returnMatch = jsx.match(/return\s*\(\s*([\s\S]*?)\s*\)\s*\}?\s*$/)
  const content = returnMatch ? returnMatch[1].trim() : jsx

  const lines: string[] = []

  function parseElement(str: string, indent: number): void {
    const tagMatch = str.match(/<(\w+)([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/)
    if (!tagMatch) return

    const [, tag, propsStr, children] = tagMatch
    const indentStr = '  '.repeat(indent)

    // Parse style
    const styleMatch = propsStr.match(/style=\{\{([^}]+)\}\}/)
    const props: string[] = []

    if (styleMatch) {
      const styleStr = styleMatch[1]
      const pairs = styleStr.split(',').map(s => s.trim())

      let isHorizontal = false
      for (const pair of pairs) {
        const colonIdx = pair.indexOf(':')
        if (colonIdx === -1) continue
        const key = pair.slice(0, colonIdx).trim().replace(/['"]/g, '')
        let value = pair.slice(colonIdx + 1).trim().replace(/['"]/g, '').replace(/,\s*$/, '')

        if (key === 'display' && value === 'flex') continue
        if (key === 'flexDirection' && value === 'row') { isHorizontal = true; continue }
        if (key === 'flexDirection' && value === 'column') continue
        if (key === 'alignItems' && value === 'center') { props.push('ver-center'); continue }
        if (key === 'justifyContent' && value === 'center') { props.push('hor-center'); continue }
        if (key === 'justifyContent' && value === 'space-between') { props.push('spread'); continue }

        const mirrorKey = STYLE_TO_MIRROR[key]
        if (!mirrorKey || mirrorKey.startsWith('_')) continue

        value = value.replace(/px$/, '')
        if (value === '100%') value = 'full'

        props.push(`${mirrorKey} ${value}`)
      }

      if (isHorizontal) props.unshift('hor')
    }

    // Get component name
    const name = tag.charAt(0).toUpperCase() + tag.slice(1)
    const propsLine = props.length > 0 ? props.join(', ') : ''

    // Check for text content
    const textContent = children?.trim().match(/^"([^"]+)"$|^([^<]+)$/)?.[0]?.replace(/"/g, '')

    let line = `${indentStr}${name}`
    if (propsLine) line += ` ${propsLine}`
    if (textContent && !textContent.includes('<')) line += ` "${textContent.trim()}"`

    lines.push(line)

    // Parse children
    if (children && children.includes('<')) {
      const childMatches = children.matchAll(/<(\w+)[^>]*(?:\/>|>[\s\S]*?<\/\1>)/g)
      for (const match of childMatches) {
        parseElement(match[0], indent + 1)
      }
    }
  }

  parseElement(content, 0)
  return lines.join('\n')
}

// ============================================================================
// LLM Call
// ============================================================================

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://mirror-studio.local',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4.6',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 8000
    })
  })

  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  return data.choices[0].message.content
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('=' .repeat(70))
  console.log('FAIRER VERGLEICH: React-Umweg vs Direct Mirror')
  console.log('=' .repeat(70))
  console.log(`\nBeide Ansätze bekommen das GLEICHE Best-Practice-Beispiel.\n`)
  console.log(`Prompt: "${USER_PROMPT.slice(0, 60)}..."\n`)

  // Show generated React example (first 20 lines)
  console.log('--- React-Beispiel (generiert aus Mirror) ---')
  console.log(BEST_PRACTICE_REACT.split('\n').slice(0, 25).join('\n'))
  console.log('...\n')

  // Approach A: React-Umweg
  console.log('=' .repeat(70))
  console.log('ANSATZ A: React-Umweg')
  console.log('=' .repeat(70))

  const startReact = Date.now()
  const reactOutput = await callLLM(REACT_SYSTEM_PROMPT, USER_PROMPT)
  const durationReact = ((Date.now() - startReact) / 1000).toFixed(1)

  console.log(`\n[LLM: ${durationReact}s]`)

  // Convert React to Mirror
  const convertedMirror = convertReactToMirror(reactOutput)

  console.log('\n--- LLM React Output (Auszug) ---')
  console.log(reactOutput.slice(0, 1500))
  console.log('...\n')

  console.log('--- Konvertiert zu Mirror ---')
  console.log(convertedMirror.slice(0, 1000))
  console.log('...\n')

  await new Promise(r => setTimeout(r, 2000))

  // Approach B: Direct Mirror
  console.log('=' .repeat(70))
  console.log('ANSATZ B: Direct Mirror')
  console.log('=' .repeat(70))

  const startMirror = Date.now()
  const mirrorOutput = await callLLM(MIRROR_SYSTEM_PROMPT, USER_PROMPT)
  const durationMirror = ((Date.now() - startMirror) / 1000).toFixed(1)

  console.log(`\n[LLM: ${durationMirror}s]`)

  // Extract Mirror code
  const mirrorMatch = mirrorOutput.match(/```(?:mirror)?\s*\n?([\s\S]*?)```/)
  const mirrorCode = mirrorMatch ? mirrorMatch[1].trim() : mirrorOutput.trim()

  console.log('\n--- LLM Mirror Output ---')
  console.log(mirrorCode.slice(0, 2000))
  console.log('...\n')

  // Summary
  console.log('=' .repeat(70))
  console.log('ZUSAMMENFASSUNG')
  console.log('=' .repeat(70))
  console.log(`
  | Aspekt              | React-Umweg     | Direct Mirror   |
  |---------------------|-----------------|-----------------|
  | LLM-Dauer           | ${durationReact.padStart(6)}s         | ${durationMirror.padStart(6)}s         |
  | Output-Zeilen       | ${String(reactOutput.split('\n').length).padStart(6)}          | ${String(mirrorCode.split('\n').length).padStart(6)}          |
  | Konvertiert-Zeilen  | ${String(convertedMirror.split('\n').length).padStart(6)}          | n/a             |
  `)
}

main().catch(console.error)
