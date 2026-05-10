import { parse } from '../../compiler/parser'

const src = `LikeBtn: bg #333, col #888, pad 12 20, rad 6
  Text "Like"
  on:
    bg #ef4444
    col white
    Text "Liked!"

LikeBtn`

const ast = parse(src) as any
console.log('=== Component def ===')
console.log(JSON.stringify(ast.components[0], null, 2))
console.log('\n=== Instance ===')
console.log(JSON.stringify(ast.instances[0], null, 2))
