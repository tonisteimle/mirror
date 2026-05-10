import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'

const src = `Text "Hello **bold** world"`
console.log('=== DOM ===')
const dom = generateDOM(parse(src))
console.log(dom.match(/innerHTML.*Hello|formatInline.*Hello/g))
console.log('\n=== React ===')
console.log(generateReact(parse(src)))
