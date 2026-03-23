#!/usr/bin/env npx ts-node
/**
 * Interactive Fixer Test
 *
 * Für manuelles Testen und Inspizieren der Claude-Antworten.
 *
 * Usage:
 *   npx ts-node studio/agent/__tests__/interactive-test.ts "dein prompt"
 *   npx ts-node studio/agent/__tests__/interactive-test.ts --file test.mir "dein prompt"
 */

import { spawn } from 'child_process'
import * as fs from 'fs'
import * as readline from 'readline'

// ============================================
// COLORS
// ============================================

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

// ============================================
// STATE
// ============================================

let files: Record<string, string> = {
  'app.mir': '',
  'tokens.tok': '',
  'components.com': ''
}

let currentFile = 'app.mir'

// ============================================
// PROMPT BUILDER
// ============================================

function buildPrompt(userPrompt: string): string {
  return `Du bist ein Mirror DSL Code-Generator.

Mirror ist eine DSL für UI-Prototyping. Wichtige Syntax:

PRIMITIVES: Box, Text, Button, Input, Image, Icon, Link, H1-H6, Header, Nav, Main, Section, Footer
LAYOUT: hor (horizontal), ver (vertical), gap N, center, spread, wrap, grid N, stacked
SIZE: w/h full/hug/N, minw, maxw, minh, maxh, pad N, margin N
STYLE: bg #hex, col #hex, rad N, bor N #hex, shadow sm/md/lg, opa N
FONT: fs N, weight bold/normal, italic, underline
STATES: hover:, active:, disabled:, focus:
CUSTOM STATES: state selected/on/off, selected:, on:, off:
EVENTS: onclick:, onhover:, onfocus:, onblur:, onkeydown key:
ACTIONS: show, hide, toggle, open, close, select, highlight, page, call

Komponenten definieren:
  Name as Primitive:
    properties
    children

Tokens definieren (in .tok Datei):
  $name: value
  $color.primary: #3b82f6

Tokens verwenden:
  Button bg $color.primary

WICHTIG: Antworte NUR mit einem JSON-Objekt:
{
  "explanation": "Kurze Erklärung was du gemacht hast",
  "changes": [
    {
      "file": "dateiname.mir",
      "action": "replace",
      "code": "Der komplette neue Dateiinhalt"
    }
  ]
}

Actions:
- "replace": Ersetzt den kompletten Dateiinhalt
- "create": Erstellt eine neue Datei
- "append": Fügt Code am Ende hinzu
- "insert": Fügt Code an bestimmter Stelle ein (braucht position.line)

AKTUELLE DATEIEN:
${Object.entries(files)
  .map(([name, content]) => `--- ${name} ---\n${content || '(leer)'}`)
  .join('\n\n')}

AKTUELLE DATEI: ${currentFile}

AUFGABE: ${userPrompt}

Antworte NUR mit dem JSON-Objekt, kein Markdown, keine zusätzlichen Erklärungen.`
}

// ============================================
// CLI RUNNER
// ============================================

async function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = ''
    let error = ''

    console.log(`${c.dim}Sende an Claude...${c.reset}`)

    const proc = spawn('claude', ['-p', prompt], {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']
    })

    proc.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString()
      output += chunk
      process.stdout.write(c.dim + '.' + c.reset)
    })

    proc.stderr.on('data', (data: Buffer) => {
      error += data.toString()
    })

    proc.on('close', (code) => {
      console.log('')
      if (code !== 0) {
        reject(new Error(error || `Exit code ${code}`))
      } else {
        resolve(output)
      }
    })

    proc.on('error', reject)
  })
}

// ============================================
// RESPONSE PARSER
// ============================================

function parseResponse(output: string): any {
  // Try to extract JSON
  const patterns = [
    /^\s*(\{[\s\S]*\})\s*$/,
    /```(?:json)?\s*(\{[\s\S]*?\})\s*```/,
    /(\{[\s\S]*"changes"[\s\S]*\})/
  ]

  for (const pattern of patterns) {
    const match = output.match(pattern)
    if (match) {
      try {
        const parsed = JSON.parse(match[1])
        if (parsed.changes) return parsed
      } catch (e) {
        continue
      }
    }
  }

  throw new Error('Kein valides JSON in der Antwort')
}

// ============================================
// APPLY CHANGES
// ============================================

function applyChanges(response: any): void {
  for (const change of response.changes || []) {
    const { file, action, code } = change

    switch (action) {
      case 'replace':
      case 'create':
        files[file] = code
        break
      case 'append':
        files[file] = (files[file] || '') + '\n\n' + code
        break
      case 'insert':
        // Simplified: just prepend for now
        files[file] = code + '\n' + (files[file] || '')
        break
    }

    console.log(`${c.green}✓${c.reset} ${action} ${file}`)
  }
}

// ============================================
// DISPLAY
// ============================================

function showFiles(): void {
  console.log(`\n${c.bold}Aktuelle Dateien:${c.reset}`)

  for (const [name, content] of Object.entries(files)) {
    const isCurrent = name === currentFile
    const marker = isCurrent ? `${c.cyan}▶${c.reset}` : ' '
    const lines = (content || '').split('\n').length
    const isEmpty = !content || content.trim() === ''

    console.log(`${marker} ${c.bold}${name}${c.reset} ${c.dim}(${isEmpty ? 'leer' : lines + ' Zeilen'})${c.reset}`)

    if (content && content.trim()) {
      const preview = content.split('\n').slice(0, 8)
      for (const line of preview) {
        console.log(`    ${c.dim}${line}${c.reset}`)
      }
      if (content.split('\n').length > 8) {
        console.log(`    ${c.dim}...${c.reset}`)
      }
    }
  }
  console.log('')
}

function showHelp(): void {
  console.log(`
${c.bold}Befehle:${c.reset}
  ${c.cyan}/file <name>${c.reset}      Wechsle zu Datei (z.B. /file tokens.tok)
  ${c.cyan}/show${c.reset}             Zeige alle Dateien
  ${c.cyan}/clear${c.reset}            Leere alle Dateien
  ${c.cyan}/set <content>${c.reset}    Setze Inhalt der aktuellen Datei
  ${c.cyan}/help${c.reset}             Diese Hilfe
  ${c.cyan}/quit${c.reset}             Beenden

${c.bold}Prompts:${c.reset}
  Einfach eintippen, z.B.:
  ${c.yellow}> Erstelle einen blauen Button${c.reset}
  ${c.yellow}> Füge eine Card Komponente hinzu${c.reset}
  ${c.yellow}> Mache den Hintergrund dunkler${c.reset}
`)
}

// ============================================
// MAIN LOOP
// ============================================

async function processInput(input: string): Promise<boolean> {
  const trimmed = input.trim()

  if (!trimmed) return true

  // Commands
  if (trimmed.startsWith('/')) {
    const [cmd, ...args] = trimmed.slice(1).split(' ')

    switch (cmd) {
      case 'quit':
      case 'exit':
      case 'q':
        return false

      case 'help':
      case 'h':
      case '?':
        showHelp()
        break

      case 'show':
      case 's':
        showFiles()
        break

      case 'file':
      case 'f':
        const fileName = args.join(' ')
        if (fileName in files) {
          currentFile = fileName
          console.log(`${c.green}✓${c.reset} Gewechselt zu ${fileName}`)
        } else {
          // Create new file
          files[fileName] = ''
          currentFile = fileName
          console.log(`${c.green}✓${c.reset} Neue Datei: ${fileName}`)
        }
        break

      case 'clear':
        files = {
          'app.mir': '',
          'tokens.tok': '',
          'components.com': ''
        }
        console.log(`${c.green}✓${c.reset} Alle Dateien geleert`)
        break

      case 'set':
        files[currentFile] = args.join(' ')
        console.log(`${c.green}✓${c.reset} Inhalt gesetzt`)
        break

      default:
        console.log(`${c.red}Unbekannter Befehl: ${cmd}${c.reset}`)
        console.log(`Tippe ${c.cyan}/help${c.reset} für Hilfe`)
    }

    return true
  }

  // Regular prompt - send to Claude
  try {
    const prompt = buildPrompt(trimmed)
    const startTime = Date.now()

    const output = await runClaude(prompt)
    const duration = Date.now() - startTime

    console.log(`${c.dim}(${duration}ms)${c.reset}\n`)

    const response = parseResponse(output)

    // Show explanation
    if (response.explanation) {
      console.log(`${c.magenta}📝 ${response.explanation}${c.reset}\n`)
    }

    // Apply changes
    applyChanges(response)

    // Show result
    console.log('')
    showFiles()

  } catch (error: any) {
    console.log(`${c.red}✗ Fehler: ${error.message}${c.reset}`)

    if (error.message.includes('JSON')) {
      console.log(`${c.dim}Die Antwort war kein valides JSON. Claude hat möglicherweise anders geantwortet.${c.reset}`)
    }
  }

  return true
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  // Load initial file
  const fileArg = args.indexOf('--file')
  if (fileArg >= 0 && args[fileArg + 1]) {
    const filePath = args[fileArg + 1]
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const fileName = filePath.split('/').pop() || 'app.mir'
      files[fileName] = content
      currentFile = fileName
      args.splice(fileArg, 2)
    }
  }

  // Direct prompt from command line
  const directPrompt = args.filter(a => !a.startsWith('--')).join(' ')

  console.log(`
${c.cyan}╔═══════════════════════════════════════════════════════════╗
║         Mirror Fixer - Interaktiver Test                  ║
╚═══════════════════════════════════════════════════════════╝${c.reset}

Tippe ${c.cyan}/help${c.reset} für Befehle oder direkt einen Prompt.
`)

  showFiles()

  // If direct prompt provided, run it
  if (directPrompt) {
    console.log(`${c.yellow}> ${directPrompt}${c.reset}\n`)
    await processInput(directPrompt)
  }

  // Interactive mode
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const promptUser = (): void => {
    rl.question(`${c.yellow}> ${c.reset}`, async (input) => {
      const shouldContinue = await processInput(input)

      if (shouldContinue) {
        promptUser()
      } else {
        console.log(`${c.dim}Auf Wiedersehen!${c.reset}`)
        rl.close()
        process.exit(0)
      }
    })
  }

  promptUser()
}

main().catch(err => {
  console.error(`${c.red}Fatal error:${c.reset}`, err)
  process.exit(1)
})
