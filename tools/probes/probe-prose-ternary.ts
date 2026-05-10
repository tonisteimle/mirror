import { parse } from '../../compiler/parser'

const src = `Article as Frame: prose

Article
  - **Status-Frage**: FH vs. Uni — wie wird das gesehen?`

const ast = parse(src) as any
function findConditional(n: any): any {
  if (!n) return null
  if (n.kind === 'conditional') return n
  for (const k of Object.keys(n)) {
    const v = n[k]
    if (Array.isArray(v)) {
      for (const c of v) {
        const e = findConditional(c)
        if (e) return e
      }
    } else if (typeof v === 'object' && v !== null) {
      const e = findConditional(v)
      if (e) return e
    }
  }
  return null
}
const cond = findConditional(ast)
console.log('Conditional:', JSON.stringify(cond, null, 2))
// Walk content
function walkContent(n: any) {
  if (!n) return
  if (n.name === 'content' || n.name === 'textContent') {
    console.log('content prop:', JSON.stringify(n, null, 2))
  }
  if (n.type === 'Text') console.log('Text node:', JSON.stringify(n, null, 2))
  for (const k of Object.keys(n)) {
    const v = n[k]
    if (Array.isArray(v)) for (const c of v) walkContent(c)
    else if (typeof v === 'object' && v !== null) walkContent(v)
  }
}
walkContent(ast)
