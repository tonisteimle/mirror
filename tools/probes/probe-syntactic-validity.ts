import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'
import * as fs from 'node:fs'

// Run all examples through the React + Framework backends and try to
// parse the output as JS / JSX. This catches syntax errors that the
// compiler produces.
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
  let react: string, fw: string
  try {
    react = generateReact(parse(src))
    fw = generateFramework(parse(src))
  } catch (e) {
    issues.push(`compile error: ${f} — ${(e as Error).message}`)
    continue
  }
  // Try to parse Framework as plain JS via Function constructor (no JSX
  // here — straight `M(...)` calls). Strip out import/export.
  try {
    const stripped = fw.replace(/^export\s+/gm, '').replace(/^import\s.+from\s.+$/gm, '')
    new Function('M', stripped + '\nreturn ui')
  } catch (e) {
    issues.push(`fw syntax: ${f} — ${(e as Error).message.slice(0, 200)}`)
  }
  // React has JSX so we can't easily eval. Just count `<...>` balance.
  const opens = (react.match(/<\w/g) ?? []).length
  const closes = (react.match(/<\/\w/g) ?? []).length
  const selfClose = (react.match(/\/>/g) ?? []).length
  // open should equal close + selfClose
  if (opens !== closes + selfClose) {
    issues.push(`react tag balance: ${f} — opens=${opens} closes=${closes} self=${selfClose}`)
  }
}

console.log('Files:', files.length)
console.log('Issues:', issues.length)
for (const i of issues.slice(0, 20)) console.log(' ', i)
