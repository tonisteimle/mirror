import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'
import * as fs from 'node:fs'

const src = fs.readFileSync('examples/hotel-checkin.mirror', 'utf8')
const react = generateReact(parse(src))
const lines = react.split('\n')
for (let i = 0; i < lines.length; i++) {
  if (/'\$[a-z]/.test(lines[i])) {
    console.log(`L${i + 1}:`, lines[i].trim().slice(0, 240))
  }
}
