import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'

const cases = [
  // Simplified reproduction of task-app/app.mirror line 348
  `Text $member.status == "online" ? "Online" : "Offline"`,
  `Text $x == "a" ? "A" : $x == "b" ? "B" : "C"`,
  // Make sure plain conditional Text works:
  `Text done ? "Yes" : "No"`,
  `Text "Hi", col $muted`,
]

for (const src of cases) {
  console.log('===', src, '===')
  console.log('--- AST (first instance) ---')
  const ast = parse(src)
  const items = (ast as any).items ?? (ast as any).children ?? []
  console.log(JSON.stringify(items, null, 2).slice(0, 1200))
  console.log('--- React ---')
  console.log(generateReact(ast).slice(0, 600))
  console.log()
}
