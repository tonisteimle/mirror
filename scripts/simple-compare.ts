/**
 * Simple Comparison: React vs Direct Mirror
 *
 * Two identical requests, different approaches.
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

if (!OPENROUTER_API_KEY) {
  console.error('Missing OPENROUTER_API_KEY')
  process.exit(1)
}

const USER_PROMPT = `Erstelle eine Master-Detail Aufgabenverwaltung im Darkmodus mit flächigem, zurückhaltendem Design.

Links eine Liste von Aufgaben, rechts die Details der ausgewählten Aufgabe.`

// ============================================================================
// REACT PROMPT (mit Beispiel)
// ============================================================================

const REACT_SYSTEM_PROMPT = `Du bist ein UI-Designer. Generiere einen STATISCHEN UI-Prototypen in JSX.

WICHTIG - NUR STATISCHES UI:
1. KEIN useState, KEINE Hooks
2. KEINE Event-Handler (onClick, onChange, etc.)
3. KEINE JavaScript-Logik, KEINE Variablen
4. NUR statisches JSX mit Inline-Styles
5. Beispieldaten direkt als Text einsetzen
6. Fokus auf visuelle Struktur und Styling

BEISPIEL:
\`\`\`jsx
function TaskApp() {
  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0F0F12' }}>
      <nav style={{ width: '280px', backgroundColor: '#18181B', padding: '16px' }}>
        <h2 style={{ color: '#FAFAFA', fontSize: '18px', marginBottom: '16px' }}>Aufgaben</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ padding: '12px', backgroundColor: '#3B82F6', borderRadius: '6px' }}>
            <span style={{ color: '#FFFFFF', fontWeight: '500' }}>API Integration</span>
            <span style={{ color: '#93C5FD', fontSize: '12px', display: 'block', marginTop: '4px' }}>Fällig: Heute</span>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#27272A', borderRadius: '6px' }}>
            <span style={{ color: '#E4E4E7' }}>Design Review</span>
            <span style={{ color: '#71717A', fontSize: '12px', display: 'block', marginTop: '4px' }}>Fällig: Morgen</span>
          </div>
        </div>
      </nav>
      <main style={{ flex: 1, padding: '24px' }}>
        <h1 style={{ color: '#FAFAFA', fontSize: '24px' }}>API Integration</h1>
        <p style={{ color: '#A1A1AA', marginTop: '8px' }}>REST-API Anbindung für Dashboard</p>
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ color: '#E4E4E7', fontSize: '14px' }}>Teilaufgaben</h3>
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#71717A' }}>✓ Endpunkte dokumentieren</span>
            <span style={{ color: '#E4E4E7' }}>○ Fehlerbehandlung</span>
          </div>
        </div>
      </main>
    </div>
  )
}
\`\`\`

Generiere einen ähnlichen STATISCHEN Prototypen. Keine Logik, nur UI-Struktur.`

// ============================================================================
// DIRECT MIRROR PROMPT (mit Beispiel)
// ============================================================================

const MIRROR_SYSTEM_PROMPT = `Du schreibst UI-Code in Mirror DSL. Antworte NUR mit validem Mirror-Code.

SYNTAX:
- Komponente definieren: Name: properties
- Komponente verwenden: Name "content"
- Kinder: eingerückt
- States: hover bg #color
- Layout: hor (horizontal), ver (vertical), gap, pad, bg, col, rad

BEISPIEL:
\`\`\`mirror
// Tokens
$bg.app: #0F0F12
$bg.surface: #18181B
$bg.card: #27272A
$bg.hover: #3F3F46

$col.heading: #FAFAFA
$col.text: #E4E4E7
$col.muted: #A1A1AA

$pad.sm: 8
$pad.md: 12
$pad.lg: 16
$pad.xl: 24

$gap.sm: 8
$gap.md: 12

$rad.sm: 4
$rad.md: 6

// Components
Heading: col $col.heading, weight bold, font-size 18
Body: col $col.text, font-size 13
Muted: col $col.muted, font-size 12

TaskItem: pad $pad.md, bg $bg.card, rad $rad.md, cursor pointer
  Title: col $col.text
  Due: col $col.muted, font-size 11
  hover bg $bg.hover
  state selected bg #2563EB

// App
App hor, w full, h full, bg $bg.app

  Sidebar w 280, h full, bg $bg.surface, pad $pad.lg, gap $gap.md
    Heading "Aufgaben"
    TaskList ver, gap $gap.sm
      TaskItem Title "Design Review"; Due "Heute"
      TaskItem Title "Code Review"; Due "Morgen"
      TaskItem Title "Meeting"; Due "Fr, 14:00"

  Main w full, h full, pad $pad.xl, gap $gap.md
    Heading "Design Review"
    Body "Überprüfung der neuen Komponenten"
    Muted "Erstellt: 5. März 2024"
\`\`\`

Generiere ähnlichen Code für die Anfrage. Nur Mirror-Code, keine Erklärungen.`

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

async function main() {
  console.log('=' .repeat(70))
  console.log('VERGLEICH: React-Umweg vs Direct Mirror')
  console.log('=' .repeat(70))
  console.log(`\nPrompt: "${USER_PROMPT}"\n`)

  // React Approach
  console.log('=' .repeat(70))
  console.log('1. REACT APPROACH - LLM Output')
  console.log('=' .repeat(70))

  const startReact = Date.now()
  const reactOutput = await callLLM(REACT_SYSTEM_PROMPT, USER_PROMPT)
  const durationReact = ((Date.now() - startReact) / 1000).toFixed(1)

  console.log(`\n[${durationReact}s]\n`)
  console.log(reactOutput)

  await new Promise(r => setTimeout(r, 2000))

  // Direct Mirror Approach
  console.log('\n')
  console.log('=' .repeat(70))
  console.log('2. DIRECT MIRROR APPROACH - LLM Output')
  console.log('=' .repeat(70))

  const startMirror = Date.now()
  const mirrorOutput = await callLLM(MIRROR_SYSTEM_PROMPT, USER_PROMPT)
  const durationMirror = ((Date.now() - startMirror) / 1000).toFixed(1)

  console.log(`\n[${durationMirror}s]\n`)
  console.log(mirrorOutput)
}

main().catch(console.error)
