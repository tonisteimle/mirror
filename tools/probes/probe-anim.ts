import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const cases: [string, string][] = [
  ['anim spin', `Icon "loader", anim spin, is 24`],
  ['anim pulse', `Frame anim pulse, w 100, h 100, bg red`],
  ['anim bounce', `Frame anim bounce, w 50, h 50, bg blue`],
  ['anim shake', `Frame anim shake, bg yellow`],
  ['anim slide-up', `Frame anim slide-up, w 200, h 100`],
  ['hover with timing', `Btn: bg #333\n  hover 0.2s:\n    bg #555\n\nBtn "X"`],
  ['hover ease-out', `Btn: bg #333\n  hover 0.3s ease-out:\n    bg #555\n\nBtn "X"`],
  ['multi anim', `Frame anim fade-in, w 100\nFrame anim slide-in, w 100`],
]

for (const [label, src] of cases) {
  console.log('===', label, '===')
  const react = generateReact(parse(src))
  const fw = generateFramework(parse(src))
  // Look for animation-related output
  const reactAnim = react.match(/animation:.+?,/g) ?? []
  const reactKeyframe = react.match(/@keyframes mirror-\w+/g) ?? []
  const fwAnim = fw.match(/anim:.*$/gm) ?? []
  console.log('  React anim:', reactAnim.slice(0, 2))
  console.log('  React keyframes:', reactKeyframe.slice(0, 2))
  console.log('  FW:', fwAnim.slice(0, 2))
}
