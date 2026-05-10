import { parse } from '../../compiler/parser'
import { generateFramework } from '../../compiler/backends/framework'
import * as fs from 'node:fs'

// Probe Framework output for things that look round-trip-suspicious
const files = [
  'examples/hotel-checkin.mirror',
  'examples/portfolio-advisor.mirror',
  'examples/address-manager.mirror',
  'examples/time-tracking.mirror',
  'examples/hospital-dashboard/dashboard.mirror',
]

for (const f of files) {
  if (!fs.existsSync(f)) continue
  const src = fs.readFileSync(f, 'utf8')
  console.log(`\n========== ${f} ==========`)
  try {
    const fw = generateFramework(parse(src))
    const lines = fw.split('\n')
    const flags = {
      NaN: 0,
      undefined: 0,
      null: 0,
      'unknown-prop': 0,
      'duplicate-keys': 0,
    }
    for (const l of lines) {
      if (l.includes('NaN')) flags.NaN++
      if (l.match(/:\s*undefined/)) flags.undefined++
      if (l.includes(': null')) flags.null++
    }
    console.log(`size: ${fw.length}`)
    console.log(`flags:`, flags)
  } catch (e) {
    console.log('ERROR:', (e as Error).message)
  }
}
