/**
 * Tutorial — mirror-build CLI (videos/export-cli.webm)
 * Embedded in: docs/tutorial/27-export.html
 *
 * The CLI runs in a separate terminal; this demo narrates the input
 * (.mir file content) that the CLI consumes — the produced HTML is the
 * same Studio Preview rendered self-contained.
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

const SOURCE = `canvas bg #0a0a0a, col white, font sans

Frame center, w full, pad 32, gap 16
  Text "Mirror Build", fs 32, weight 700
  Text "Eine HTML-Datei zum Hochladen.", col #888
  Button "Download", bg #2271C1, col white, pad 12 24, rad 6`

export const exportCli: TestCase[] = describe('demos.tutorial', [
  testWithSetup('export: mirror-build self-contained html', SOURCE, async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    await sleep(900)

    const editor = querySafe('.cm-content')
    await osMouse.moveTo(centerOf(editor))
    await sleep(1500)

    // Preview should show the rendered page (Text + Button).
    const nodes = document.querySelectorAll('#preview [data-mirror-id]')
    api.assert.ok(nodes.length >= 3, 'preview shows Frame + 2 Texts + Button')

    // Park near the preview to suggest "this is what mirror-build emits".
    const preview = querySafe('#preview')
    await osMouse.moveTo(centerOf(preview))
    await sleep(1500)

    await osMouse.park()
  }),
])
