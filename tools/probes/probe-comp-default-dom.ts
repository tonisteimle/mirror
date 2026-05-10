import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const src = `LikeBtn: bg #333, col #888, pad 12 20, rad 6
  Text "Like"

LikeBtn`

console.log('=== DOM ===')
const dom = generateDOM(parse(src))
console.log('len:', dom.length)
console.log(dom)
console.log('\n=== React ===')
console.log(generateReact(parse(src)))
console.log('\n=== Framework ===')
console.log(generateFramework(parse(src)).slice(0, 800))
