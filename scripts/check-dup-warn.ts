import { validate } from '../compiler/validator'

const src = `PositionRow: Frame hor, gap 12
  Info: Frame gap 2
    Name: col #fff, fs 14, weight 600
    Type: col #888, fs 12
`
const r = validate(src)
console.log(JSON.stringify(r, null, 2))
