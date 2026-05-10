import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'
import * as fs from 'node:fs'
import { transformSync } from 'esbuild'

const files: string[] = []
function walk(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${entry.name}`
    if (entry.isDirectory()) walk(p)
    else if (entry.name.endsWith('.mirror') || entry.name.endsWith('.mir')) files.push(p)
  }
}
walk('examples')

const issues: string[] = []
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8')
  let react: string
  try {
    react = generateReact(parse(src))
  } catch (e) {
    issues.push(`compile: ${f} — ${(e as Error).message}`)
    continue
  }
  try {
    transformSync(react, { loader: 'tsx' })
  } catch (e) {
    issues.push(`jsx: ${f} — ${(e as Error).message.slice(0, 240)}`)
  }
}

console.log('Files:', files.length)
console.log('Issues:', issues.length)
for (const i of issues) console.log(' ', i)
