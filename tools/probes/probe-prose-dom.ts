import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

const src = `Article as Frame: gap 18, prose

Article
  Bare paragraph text, **bold** and *italic* work.`

const dom = generateDOM(parse(src))
console.log(dom.match(/innerHTML.*Bare|Bare paragraph|formatInline.*Bare/g))
