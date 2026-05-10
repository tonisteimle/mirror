import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'
import * as fs from 'node:fs'

// Walk all .mirror examples and project dirs, look for issues
const files: string[] = []
function walk(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${entry.name}`
    if (entry.isDirectory()) walk(p)
    else if (entry.name.endsWith('.mirror') || entry.name.endsWith('.mir')) files.push(p)
  }
}
walk('examples')

const issues: Record<string, number> = {}
const tally = (k: string) => (issues[k] = (issues[k] ?? 0) + 1)

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8')
  try {
    const react = generateReact(parse(src))
    const fw = generateFramework(parse(src))
    if (react.includes('[object Object]')) tally(`react/object-leak::${f}`)
    if (react.match(/'[a-z][a-zA-Z0-9_-]+':\s*undefined/)) tally(`react/undefined::${f}`)
    if (react.match(/style=\{\{\s*\}\}/)) tally(`react/empty-style::${f}`)
    if (fw.includes('[object Object]')) tally(`fw/object-leak::${f}`)
    if (fw.match(/:\s*undefined/)) tally(`fw/undefined::${f}`)
    // Check for invalid double-quoted props (rare)
    if (react.match(/style=\{\{\s*[a-z]+:\s*'[a-z]+\s+[a-z]/)) {
      // multi-word value not in quotes — usually fine but flag for inspection
    }
  } catch (e) {
    tally(`parse-error::${f}`)
  }
}

console.log('Files probed:', files.length)
console.log('Issues:', JSON.stringify(issues, null, 2))
