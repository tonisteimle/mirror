import { parse } from '../../compiler/parser'

const ast = parse(`DatePicker placeholder "Datum wählen"`) as any
console.log(JSON.stringify(ast.instances[0], null, 2))
