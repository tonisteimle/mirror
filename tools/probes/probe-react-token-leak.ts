// Probe: locate the literal "$x.y" leaks in React output for task-app
import { readFileSync } from 'fs'
import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'

const files = ['examples/task-app/app.mirror', 'examples/task-app/simple.mirror']

for (const f of files) {
  const ast = parse(readFileSync(f, 'utf8'))
  const out = generateReact(ast)
  const lines = out.split('\n')
  console.log('===', f, '===')
  for (let i = 0; i < lines.length; i++) {
    if (/['"]\$[a-zA-Z_][\w.-]+['"]/.test(lines[i])) {
      const matches = lines[i].match(/['"]\$[a-zA-Z_][\w.-]+['"]/g)
      if (matches) {
        console.log(`L${i + 1}: ${lines[i].trim().slice(0, 200)}`)
      }
    }
  }
  console.log()
}
