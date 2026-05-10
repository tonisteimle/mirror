import { parse, generateFramework } from '../../compiler'

for (const src of [
  `Frame grid 12\n  Frame w 6, bg #1a1a1a`,
  `Frame grid 12\n  Frame x 1, y 1, w 12, h 2, bg blue`,
]) {
  console.log('---', src.replace(/\n/g, ' \\n '))
  console.log(generateFramework(parse(src), { skipPrelude: true } as any))
}
