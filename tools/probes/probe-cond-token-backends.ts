import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'
import { generateDOM } from '../../compiler/backends/dom'
import { generateFramework } from '../../compiler/backends/framework'

const cases = [
  `Text $on ? "Yes" : "No"`,
  `Text $count > 0 ? "Has" : "Empty"`,
  `Text $status == "online" ? "On" : "Off"`,
  `Text $user.role == "admin" ? "Admin" : "User"`,
  `Frame bg $on ? #10b981 : #ef4444`,
]

for (const src of cases) {
  console.log('===', src, '===')
  const ast = parse(src)
  const r = generateReact(ast)
  const d = generateDOM(ast)
  const fw = generateFramework(ast)
  // Find the conditional rendering
  const rLine = r
    .split('\n')
    .find(
      l =>
        /Text|Frame/.test(l) &&
        (l.includes('?') ||
          l.includes('Yes') ||
          l.includes('Has') ||
          l.includes('On') ||
          l.includes('Admin') ||
          l.includes('10b981'))
    )
  console.log('  React:', rLine?.trim().slice(0, 200))
  // For Text content
  const rContent = r.match(/<span[^>]+>[\s\S]*?<\/span>/)
  if (rContent) console.log('  React content:', rContent[0].slice(0, 200))
  const fwLine = fw
    .split('\n')
    .find(
      l =>
        l.includes('content:') ||
        l.includes('Yes') ||
        l.includes('Has') ||
        l.includes('On') ||
        l.includes('Admin') ||
        l.includes('10b981')
    )
  console.log('  Framework:', fwLine?.trim().slice(0, 200))
  // DOM has condition strings/templates
  const dCond = d.match(/__conditional[^"',]+/g)?.[0]
  console.log('  DOM cond marker:', dCond?.slice(0, 200))
  console.log()
}
