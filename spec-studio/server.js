/**
 * Spec Studio Server
 *
 * 1. Nimmt User-Input entgegen (sauber/ungefähr/Gedanken)
 * 2. Ruft Claude CLI auf
 * 3. Gibt zurück: Saubere Mirror-Spec + Laufende App
 */

import http from 'http'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = 3333

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

// Output-Verzeichnis
const OUTPUT_DIR = path.join(__dirname, 'generated')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'index.html')
const FRAMEWORK_DIR = path.join(__dirname, 'framework')

// Sicherstellen dass Verzeichnisse existieren
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

// Mirror Sprachdefinition laden
function getMirrorLanguageDefinition() {
  const claudeMdPath = path.join(__dirname, '..', 'CLAUDE.md')
  if (fs.existsSync(claudeMdPath)) {
    return fs.readFileSync(claudeMdPath, 'utf-8')
  }
  return ''
}

/**
 * Claude CLI aufrufen
 */
async function callClaude(userInput) {
  return new Promise((resolve, reject) => {
    const languageDefinition = getMirrorLanguageDefinition()

    const prompt = `Du bist Spec Studio - ein Tool das ungefähre Mirror-Spezifikationen zu sauberem, vollständigem Mirror-Code vervollständigt.

## Deine Aufgabe

Der User schreibt Mirror-Code - oft unvollständig oder mit ungefährer Syntax:
- Hierarchie stimmt, aber Properties fehlen
- Komponenten-Namen sind korrekt, aber Styling fehlt
- Grobe Struktur ist da, Details fehlen

Du gibst **NUR sauberen Mirror-Code** zurück. Das Studio kompiliert diesen dann automatisch.

## Dein Baukasten (Zag-Komponenten)

Verwende diese fertigen Komponenten - sie haben bereits Accessibility & Keyboard-Navigation eingebaut:

### Navigation
- \`Tabs\` mit \`Tab "Label", value "id"\` - Tab-Navigation
- \`Accordion\` mit \`AccordionItem "Label"\` - Aufklappbare Sektionen
- \`Collapsible\` mit \`Trigger:\` und \`Content:\` - Einzelner Toggle

### Formulare
- \`Switch\` mit \`Track\`, \`Thumb\`, \`Label\` - Toggle-Switch
- \`Checkbox\` mit \`Root\`, \`Control\`, \`Label\` - Checkbox
- \`RadioGroup\` mit \`Item\`, \`ItemControl\`, \`ItemText\` - Radio-Buttons
- \`Slider\` mit \`Track\`, \`Range\`, \`Thumb\` - Schieberegler
- \`Select\` mit \`Trigger\`, \`Content\`, \`Item\` - Dropdown

### Overlays
- \`Dialog\` mit \`Trigger:\`, \`Content:\`, \`Backdrop:\` - Modal
- \`Tooltip\` mit \`Trigger:\`, \`Content:\` - Hover-Tooltip
- \`Popover\` mit \`Trigger:\`, \`Content:\` - Klick-Popover

### Primitives
Frame, Text, Button, Input, Textarea, Icon, Image, Link, Divider, H1-H6

### Properties (Kurzform)
- Layout: \`hor\`, \`ver\`, \`gap N\`, \`center\`, \`spread\`, \`wrap\`
- Größe: \`w N\`, \`h N\`, \`full\`, \`hug\`
- Spacing: \`pad N\` oder \`pad Y X\`, \`margin N\`
- Farbe: \`bg #hex\`, \`col #hex\`, \`boc #hex\`
- Border: \`bor N\`, \`rad N\`
- Text: \`fs N\`, \`weight bold/500\`, \`italic\`, \`underline\`
- Icons: \`Icon "name", ic #hex, is N\`

### Tokens
\`$name.suffix: value\` - z.B. \`$primary.bg: #2563eb\`, \`$card.rad: 8\`

## Mirror Sprachreferenz

${languageDefinition}

## User Input

\`\`\`
${userInput}
\`\`\`

## Dein Output

Antworte NUR mit dem sauberen Mirror-Code, keine Erklärungen:

\`\`\`mirror
// Tokens
$primary.bg: #2563eb
...

// Komponenten (falls sinnvoll)
ComponentName: properties
  ...

// Verwendung
Frame ...
  ...
\`\`\`

## Regeln

1. **Tokens hinzufügen** wenn sinnvoll (dark theme = dunkle Farben)
2. **Zag-Komponenten nutzen** - Tabs, Switch, Accordion, Slider, Dialog etc.
3. **Properties vervollständigen** - gap, pad, rad, bg, col etc.
4. **Hierarchie beibehalten** - die User-Struktur ist die Basis
5. **Valide Mirror-Syntax** - Einrückung mit 2 Spaces, Kommas zwischen Properties`

    console.log('→ Calling Claude CLI...')
    console.log('→ Prompt length:', prompt.length, 'chars')

    // Use --print for non-interactive mode and pass prompt via stdin
    const claude = spawn('claude', [
      '--print',
      '--output-format', 'text'
    ], {
      cwd: __dirname,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe']
    })

    // Write prompt to stdin
    claude.stdin.write(prompt)
    claude.stdin.end()

    let output = ''
    let error = ''

    claude.stdout.on('data', (data) => {
      const text = data.toString()
      output += text
      process.stdout.write(text)
    })

    claude.stderr.on('data', (data) => {
      const text = data.toString()
      error += text
      // Also log stderr for debugging
      if (!text.includes('Thinking') && !text.includes('Using')) {
        console.error('stderr:', text)
      }
    })

    claude.on('close', (code) => {
      if (code === 0) {
        // Parse den Mirror-Code Block
        const mirrorMatch = output.match(/```mirror\n([\s\S]*?)```/)

        if (mirrorMatch) {
          const cleanSpec = mirrorMatch[1].trim()
          console.log('← Generated: clean Mirror spec')
          resolve({ success: true, cleanSpec })
        } else {
          // Fallback: Vielleicht ohne Code-Block
          const cleanOutput = output.trim()
          if (cleanOutput.includes('$') || cleanOutput.includes('Frame') || cleanOutput.includes('Tabs')) {
            console.log('← Generated: Mirror spec (no code block)')
            resolve({ success: true, cleanSpec: cleanOutput })
          } else {
            reject(new Error('Konnte Mirror-Code nicht parsen'))
          }
        }
      } else {
        reject(new Error(error || `Claude exited with code ${code}`))
      }
    })

    claude.on('error', (err) => {
      reject(err)
    })
  })
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // API: Generate
  if (req.method === 'POST' && url.pathname === '/api/generate') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', async () => {
      try {
        const { mirrorCode } = JSON.parse(body)
        console.log('\n→ Generate request')
        console.log('→ Input length:', mirrorCode.length)

        const result = await callClaude(mirrorCode)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          success: true,
          cleanSpec: result.cleanSpec
        }))
      } catch (e) {
        console.error('Error:', e.message)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: e.message }))
      }
    })
    return
  }

  // Static files
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname

  if (filePath.startsWith('/generated/')) {
    filePath = path.join(OUTPUT_DIR, filePath.replace('/generated/', ''))
  } else if (filePath.startsWith('/framework/')) {
    filePath = path.join(FRAMEWORK_DIR, filePath.replace('/framework/', ''))
  } else {
    filePath = path.join(__dirname, filePath)
  }

  const ext = path.extname(filePath)
  const contentType = MIME_TYPES[ext] || 'text/plain'

  try {
    const content = fs.readFileSync(filePath)
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(content)
  } catch (e) {
    // Fallback: Parent directory
    try {
      const parentPath = path.join(__dirname, '..', url.pathname)
      const content = fs.readFileSync(parentPath)
      res.writeHead(200, { 'Content-Type': contentType })
      res.end(content)
    } catch (e2) {
      res.writeHead(404)
      res.end('Not found: ' + url.pathname)
    }
  }
})

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║         SPEC STUDIO                    ║
║                                        ║
║   http://localhost:${PORT}               ║
║                                        ║
║   Input → LLM → Spec + App             ║
╚════════════════════════════════════════╝
`)
})
