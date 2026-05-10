// Compile task-app project to DOM and find the syntax error
import { generateDOM } from '../../compiler/backends/dom'
import { parse } from '../../compiler/parser'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

function readAll(dir: string): string {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const s = statSync(full)
    if (s.isDirectory()) out.push(readAll(full))
    else if (full.endsWith('.mirror') || full.endsWith('.mir')) out.push(readFileSync(full, 'utf8'))
  }
  return out.join('\n\n')
}

const src = readAll('examples/task-app')
const out = generateDOM(parse(src))

// Try parsing it as a Function
try {
  const stripped = out.replace(/^export\s+/gm, '').replace(/^import\s+.+$/gm, '')
  new Function(stripped + '\nreturn createUI();')
  console.log('OK: parses')
} catch (e) {
  console.log('FAIL:', (e as Error).message)
  // Try eval to get a position
  const stripped = out.replace(/^export\s+/gm, '').replace(/^import\s+.+$/gm, '')
  // Find where __conditional: appears literally
  const lines = stripped.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('__conditional:') && !lines[i].includes("'") && !lines[i].includes('"')) {
      console.log('possibly bad line:', i + 1, lines[i].slice(0, 200))
    }
  }
  // Search for unquoted ?
  for (let i = 0; i < lines.length; i++) {
    // suspicious: bare conditional inside JS
    if (/\?\s*"[^"]*"\s*:\s*"[^"]*"/.test(lines[i]) && /^\s*[a-z_]+:/.test(lines[i])) {
      console.log('L' + (i + 1), ':', lines[i].slice(0, 200))
    }
  }
  // alternative: use vm to find position
}
