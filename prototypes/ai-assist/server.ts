/**
 * AI Assist Prototype Server
 *
 * Calls Claude CLI to complete/correct Mirror code.
 */

import { execSync } from 'child_process'
import { createServer } from 'http'

const PORT = 3456

// =============================================================================
// Claude CLI
// =============================================================================

function callClaude(prompt: string): string {
  console.log('[Claude] Calling...')
  const startTime = Date.now()

  try {
    // Write prompt to temp file to avoid shell escaping issues
    const fs = require('fs')
    const tmpFile = '/tmp/claude-prompt.txt'
    fs.writeFileSync(tmpFile, prompt)

    const claudePath = process.env.HOME + '/.local/bin/claude'
    const result = execSync(`cat ${tmpFile} | ${claudePath} -p - --output-format text`, {
      encoding: 'utf8',
      timeout: 60000,
      maxBuffer: 1024 * 1024,
    })

    const elapsed = Date.now() - startTime
    console.log(`[Claude] Response in ${elapsed}ms`)

    return result
  } catch (error: any) {
    console.error('[Claude] Error:', error.message)
    throw error
  }
}

// =============================================================================
// System Prompt
// =============================================================================

const SYSTEM_PROMPT = `Mirror DSL Assistent. Vervollständige/korrigiere Code.

Syntax: Frame, Text, Button, Input, Icon | bg #hex, col #hex, pad N, rad N, gap N, hor, ver

Beispiel: Button "Save", bg #2271C1, col white, pad 12 24, rad 6

Regeln:
- Ergänze fehlende Properties (col white bei dunklem bg)
- Korrigiere Syntax (fehlende Kommas)
- Behalte User-Intention
- NUR Code zurückgeben, KEINE Erklärungen`

// =============================================================================
// HTTP Server
// =============================================================================

const server = createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'POST' && req.url === '/complete') {
    let body = ''
    req.on('data', chunk => (body += chunk))
    req.on('end', async () => {
      try {
        const { code } = JSON.parse(body)

        const prompt = `${SYSTEM_PROMPT}

Code:
${code}

Vervollständige. NUR Code zurückgeben:`

        const result = callClaude(prompt)

        // Clean up response - remove markdown code blocks if present
        let cleaned = result.trim()
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:mirror)?\n?/, '').replace(/\n?```$/, '')
        }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            success: true,
            code: cleaned.trim(),
          })
        )
      } catch (error: any) {
        console.error('[Error]', error.message)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            success: false,
            error: error.message,
          })
        )
      }
    })
    return
  }

  res.writeHead(404)
  res.end('Not Found')
})

server.listen(PORT, () => {
  console.log(`[AI Assist Server] Running on http://localhost:${PORT}`)
})
