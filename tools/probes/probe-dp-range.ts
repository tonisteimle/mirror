import { parse } from '../../compiler/parser'

const ast = parse(`DatePicker selectionMode range`) as any
console.log(JSON.stringify(ast.instances[0], null, 2))
