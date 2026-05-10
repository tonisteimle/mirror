import { parse } from '../../compiler/parser'
import { generateFramework } from '../../compiler/backends/framework'
import * as fs from 'node:fs'

const src = fs.readFileSync('examples/portfolio-advisor.mirror', 'utf8')
const fw = generateFramework(parse(src))
const lines = fw.split('\n')
for (let i = 0; i < lines.length; i++) {
  if (/'\$[a-z]/.test(lines[i])) {
    const idx = lines[i].search(/'\$[a-z]/)
    console.log(`L${i + 1}:`, lines[i].slice(Math.max(0, idx - 50), idx + 80))
  }
}
console.log('---')
console.log('total:', lines.length)
