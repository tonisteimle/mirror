import { parse } from '../../compiler/parser'
import { generateFramework } from '../../compiler/backends/framework'
import * as fs from 'node:fs'

// Probe Framework with all real examples for warning signs in props
const files: string[] = []
function walk(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${entry.name}`
    if (entry.isDirectory()) walk(p)
    else if (entry.name.endsWith('.mirror') || entry.name.endsWith('.mir')) files.push(p)
  }
}
walk('examples')

const totals = {
  size: 0,
  unknownProps: 0,
}

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8')
  const fw = generateFramework(parse(src))
  totals.size += fw.length
  // Look for any literal prop key that is unusual / suspicious
  const props = fw.match(/'[a-z-]+':/g) ?? []
  const counts = new Map<string, number>()
  for (const p of props) {
    counts.set(p, (counts.get(p) ?? 0) + 1)
  }
  // Show props that occur more than 5 times in this file
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  console.log(`${f}: top props =`, top.map(([k, v]) => `${k} (${v})`).join(', '))
}

console.log('\nTotal Framework output size:', totals.size, 'bytes')
