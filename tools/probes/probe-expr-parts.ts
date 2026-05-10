// Probe: AST shape for `Text "$x.y" + "/" + "$x.z"` — what do parts/operators look like?
import { parse } from '../../compiler/parser'

const cases = [
  'Text "$project.completedCount" + "/" + "$project.tasksCount" + " Tasks"',
  'Text "$x" + " items"',
  'Text "$x.y%"',
  'Frame w $project.progress + "%"',
]

for (const src of cases) {
  console.log('===', src, '===')
  const ast = parse(src)
  // walk to find the first Text/Frame instance with text/properties
  const json = JSON.stringify(ast, null, 2)
  // print the relevant slice
  const m = json.match(/("text":[\s\S]+?(?=\n\s*"))|("properties":[\s\S]+?(?=\n\s*"children"))/)
  console.log(m ? m[0].slice(0, 800) : json.slice(0, 600))
  console.log()
}
