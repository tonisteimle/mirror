import { parse, generateFramework } from '../../compiler'

const src = `cols.grid: 12
Frame grid $cols
  Frame w 6, bg #1a1a1a`

console.log(generateFramework(parse(src)))
