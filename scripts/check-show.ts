import { parse } from '../compiler/parser'
const src = `canvas mobile
Frame name DashboardView
  show DashboardScreen from screens/dashboard
`
const ast = parse(src)
console.log(JSON.stringify(ast.instances, null, 2))
