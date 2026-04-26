import { describe, it } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { writeFileSync } from 'fs'
describe('p', () => {
  it('two each loops same collection', () => {
    const src = `tasks:
  t1:
    title: "A"

each task in $tasks
  Text task.title

each task in $tasks
  Text task.title`
    const code = generateDOM(parse(src))
    const lines = code.split('\n').filter(l => l.includes('tasksData'))
    console.log('OCCURRENCES:', lines.length)
    lines.slice(0, 6).forEach(l => console.log('  ', l))
  })
})
