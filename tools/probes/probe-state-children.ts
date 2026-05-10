import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'
import { generateDOM } from '../../compiler/backends/dom'

// State with children-swap (variant pattern)
const src = `LikeBtn: bg #333, col #888, pad 12 20, rad 6, toggle()
  Text "Like"
  on:
    bg #ef4444
    col white
    Text "Liked!"

LikeBtn, on`

console.log('=== React ===')
console.log(generateReact(parse(src)))
console.log('\n=== DOM (Like search) ===')
const dom = generateDOM(parse(src))
const m = dom.match(/innerHTML.*Like|Liked|formatInline.*Like/g)
console.log(m)
