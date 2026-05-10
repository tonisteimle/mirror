import { parse } from '../../compiler/parser'

const src = `tasks:\n  t1:\n    pri: 2\n  t2:\n    pri: 1\n\neach t in $tasks by pri\n  Text "$t.pri"`
const ast = parse(src) as any
function findEach(n: any): any {
  if (!n) return null
  if (n.type === 'Each') return n
  for (const k of Object.keys(n)) {
    const v = n[k]
    if (Array.isArray(v)) {
      for (const c of v) {
        const e = findEach(c)
        if (e) return e
      }
    } else if (typeof v === 'object' && v !== null) {
      const e = findEach(v)
      if (e) return e
    }
  }
  return null
}
const each = findEach(ast)
console.log(Object.keys(each))
console.log(JSON.stringify(each, null, 2).slice(0, 800))
