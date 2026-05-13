import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

const SRC = `Frame abs, x 10, y 20
  compact:
    bg red`

console.log(generateDOM(parse(SRC)))
