import { parse } from '../../compiler/parser'

const src = `tasks:\n  t1:\n    title: "A"\n  t2:\n    title: "B"\n\neach task,i in $tasks\n  Text "$i: $task.title"`
const ast = parse(src) as any
// Find Each node
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
console.log(JSON.stringify(each, null, 2))
