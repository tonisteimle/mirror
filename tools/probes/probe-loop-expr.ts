import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'

const cases: [string, string][] = [
  ['loop arithmetic', `tasks:\n  t1:\n    pri: 5\n\neach t in $tasks\n  Text "P" + t.pri`],
  ['loop arithmetic with $', `tasks:\n  t1:\n    pri: 5\n\neach t in $tasks\n  Text $t.pri + "%"`],
]

for (const [label, src] of cases) {
  console.log('===', label, '===')
  const out = generateReact(parse(src))
  console.log(out)
}
