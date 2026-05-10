import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'

const out = generateReact(
  parse(`loggedIn: false\n\nFrame visible-when loggedIn\n  Text "Protected"`)
)
console.log(out)
