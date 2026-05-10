import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

const src = `query: ""\n\nInput bind query, onenter toast("Searched: " + $query)`
const dom = generateDOM(parse(src))
console.log(dom.match(/_runtime\.toast.*$|toast\(.*$/gm))
