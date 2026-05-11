/**
 * Probe: who actually moves the OS cursor during a CDP test run?
 *
 * Parks the macOS cursor at (10, 10), then spawns the test runner with
 * --headed + (optional) --os-mouse. The recording can then be inspected
 * to see whether the cursor stayed parked (CDP alone doesn't move it)
 * or jumped to the test's action coords (CDP+Chrome syncs OS cursor).
 *
 * Usage:
 *   npx tsx tools/probes/probe-cursor-source.ts            # without --os-mouse
 *   npx tsx tools/probes/probe-cursor-source.ts --os-mouse
 */

import { spawn } from 'child_process'
import { mouse, Point } from '@nut-tree-fork/nut-js'

async function main() {
  const useOsMouse = process.argv.includes('--os-mouse')
  const outputName = useOsMouse ? 'probe-with-osmouse.webm' : 'probe-no-osmouse.webm'

  console.log(`[probe] parking cursor at (10, 10) before test`)
  await mouse.setPosition(new Point(10, 10))

  console.log(`[probe] spawning test runner (os-mouse=${useOsMouse})`)
  const args = [
    'tools/test.ts',
    '--test=Drag Text from palette into existing Frame appends a Text child',
    '--headed',
    `--record=demos/${outputName}`,
    '--record-fps=30',
  ]
  if (useOsMouse) args.push('--os-mouse')

  const child = spawn('npx', ['tsx', ...args], { stdio: 'inherit' })
  await new Promise<void>((resolve, reject) => {
    child.on('close', code => (code === 0 ? resolve() : reject(new Error(`runner exited ${code}`))))
  })
  console.log(`[probe] done → demos/${outputName}`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
