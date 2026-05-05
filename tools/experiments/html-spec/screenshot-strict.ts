/**
 * Screenshot the 6 strict-spec HTML samples for inspection.
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { launchChrome } from '../../test-runner/chrome'
import { connectCDP, getPageTarget } from '../../test-runner/cdp'

const ROOT = path.resolve(
  '/Users/toni.steimle@fhnw.ch/Library/Mobile Documents/com~apple~CloudDocs/Documents/Dev/Mirror'
)
const OUTDIR = path.join(ROOT, 'tools/experiments/html-spec/screenshots')
fs.mkdirSync(OUTDIR, { recursive: true })

const sizes: Record<string, { w: number; h: number }> = {
  'brief-1': { w: 1200, h: 800 },
  'brief-2': { w: 375, h: 812 },
  'brief-3': { w: 480, h: 720 },
}

;(async () => {
  const chrome = await launchChrome({ headless: true })
  const port = new URL(chrome.wsEndpoint).port
  const pageWs = await getPageTarget(parseInt(port))
  const cdp = await connectCDP(pageWs)
  await cdp.send('Page.enable')

  for (const brief of ['brief-1', 'brief-2', 'brief-3']) {
    for (const sample of [1, 2]) {
      const url = `http://localhost:5173/tools/experiments/html-spec/outputs/${brief}/strict-sample-${sample}`
      const sz = sizes[brief]
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: sz.w,
        height: sz.h,
        deviceScaleFactor: 1,
        mobile: false,
      })
      await cdp.send('Page.navigate', { url })
      await new Promise(r => setTimeout(r, 1500))
      const shot: any = await cdp.send('Page.captureScreenshot', { format: 'png' })
      const out = path.join(OUTDIR, `${brief}-strict-s${sample}.png`)
      fs.writeFileSync(out, Buffer.from(shot.data, 'base64'))
      console.log(`✓ ${out}`)
    }
  }
  chrome.kill()
})().catch(e => {
  console.error(e)
  process.exit(1)
})
