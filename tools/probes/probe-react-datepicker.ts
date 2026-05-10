import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'

const out = generateReact(parse(`DatePicker placeholder "Datum wählen"`))
console.log(out)
