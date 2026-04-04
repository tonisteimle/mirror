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

    const prompt = `Du bist Spec Studio - ein Tool das Mirror-Spezifikationen in laufende Apps verwandelt.

## Deine Aufgabe

Der User schreibt Mirror-Code als Spezifikation - oft unvollständig oder ungefähr.
Du erzeugst ZWEI Outputs:
1. **Saubere Mirror-Spec** - die bereinigte, vollständige Spezifikation
2. **Laufende App** - funktionierendes HTML/CSS/JS

## Mirror Sprachreferenz

${languageDefinition}

## User Input (Spezifikation)

\`\`\`
${userInput}
\`\`\`

## Dein Output

Antworte mit BEIDEN Teilen, getrennt durch Marker:

===MIRROR===
\`\`\`mirror
// Saubere, vollständige Mirror-Spezifikation
// Tokens, Komponenten, Verwendung
\`\`\`

===HTML===
\`\`\`html
<!DOCTYPE html>
<html>
<!-- Vollständige, laufende App -->
<!-- CSS im <style>, JS im <script> -->
</html>
\`\`\`

## Regeln für die Mirror-Spec

1. **Tokens definieren** - Farben, Abstände, Radien als $name.suffix
2. **Hierarchie beibehalten** - die User-Struktur ist die Basis
3. **Properties vervollständigen** - gap, pad, rad, bg, col etc.
4. **Valide Syntax** - 2 Spaces Einrückung, Kommas zwischen Properties

## Regeln für die HTML-App

1. **Vollständig lauffähig** - alles in einer Datei (HTML + CSS + JS)
2. **Interaktiv** - Tabs wechseln, Switches togglen, Accordions auf/zu
3. **Exakt wie spezifiziert** - alle Elemente aus der Spec müssen vorhanden sein
4. **Modernes CSS** - Flexbox, Grid, CSS Variables
5. **Vanilla JS** - keine Frameworks, einfaches DOM-Handling`

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
        // Parse beide Teile
        const mirrorMatch = output.match(/===MIRROR===[\s\S]*?```mirror\n([\s\S]*?)```/)
        const htmlMatch = output.match(/===HTML===[\s\S]*?```html\n([\s\S]*?)```/)

        if (mirrorMatch && htmlMatch) {
          const cleanSpec = mirrorMatch[1].trim()
          const htmlApp = htmlMatch[1].trim()

          // HTML-App in Datei schreiben
          fs.writeFileSync(OUTPUT_FILE, htmlApp)
          console.log('← Generated: Mirror spec + HTML app')
          console.log('← Written to:', OUTPUT_FILE)

          resolve({ success: true, cleanSpec, htmlApp })
        } else if (mirrorMatch) {
          // Nur Mirror-Spec gefunden
          const cleanSpec = mirrorMatch[1].trim()
          console.log('← Generated: Mirror spec only (no HTML)')
          resolve({ success: true, cleanSpec })
        } else {
          // Fallback: Vielleicht ohne Marker
          const fallbackMirror = output.match(/```mirror\n([\s\S]*?)```/)
          const fallbackHtml = output.match(/```html\n([\s\S]*?)```/)

          if (fallbackMirror) {
            const cleanSpec = fallbackMirror[1].trim()
            if (fallbackHtml) {
              const htmlApp = fallbackHtml[1].trim()
              fs.writeFileSync(OUTPUT_FILE, htmlApp)
              console.log('← Generated: Mirror spec + HTML app (no markers)')
              resolve({ success: true, cleanSpec, htmlApp })
            } else {
              console.log('← Generated: Mirror spec only (no markers)')
              resolve({ success: true, cleanSpec })
            }
          } else {
            reject(new Error('Konnte Output nicht parsen'))
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
          cleanSpec: result.cleanSpec,
          htmlApp: result.htmlApp || null
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
