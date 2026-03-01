#!/usr/bin/env npx tsx
/**
 * Visual Test - Zeigt alle Form Controls auf einer Seite
 */

import { chromium } from 'playwright'

const allComponentsCode = `
// Visual Test: Alle Form Controls
Box ver, gap 24, pad 32, bg #0a0a0a, width 500

  // INPUTS
  Box ver, gap 8
    "Inputs", weight 600, col #FFF
    SearchField
    PasswordField
    CurrencyField
    DateField

  // CHECKBOX & RADIO
  Box ver, gap 8
    "Checkbox & Radio", weight 600, col #FFF
    Box hor, gap 24
      Checkbox
      Radio

  // SWITCH
  Box ver, gap 8
    "Switch", weight 600, col #FFF
    Switch
      SwitchThumb

  // TOGGLES
  Box ver, gap 8
    "Toggles", weight 600, col #FFF
    Box hor, gap 8
      ChipToggle "React"
      ChipToggle "Vue"
      ChipToggle "Svelte"
    Box hor, gap 8
      ToggleButton "Option A"
      ToggleButton "Option B"

  // SEGMENTS
  Box ver, gap 8
    "Segmented Control", weight 600, col #FFF
    SegmentedControl
      Segment "Tab 1"
      Segment "Tab 2"
      Segment "Tab 3"

  // STEPPER
  Box ver, gap 8
    "Stepper", weight 600, col #FFF
    Stepper
      StepperMinus
      StepperValue "5"
      StepperPlus

  // RATING
  Box ver, gap 8
    "Rating", weight 600, col #FFF
    RatingStars
      RatingStarItem
      RatingStarItem
      RatingStarItem
      RatingStarItem
      RatingStarItem

  // ICONS (direct test)
  Box ver, gap 8
    "Icons Direct", weight 600, col #FFF
    Box hor, gap 16
      Icon "search", is 20, col #666
      Icon "star", is 20, col #F59E0B
      Icon "plus", is 20, col #3B82F6
`

async function main() {
  try {
    await fetch('http://localhost:5173/mirror/app/')
  } catch {
    console.log('⚠ Dev server not running')
    process.exit(1)
  }

  console.log('○ Starting visual test...')

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({ viewport: { width: 700, height: 1200 } })
  const page = await context.newPage()

  const encoded = Buffer.from(allComponentsCode).toString('base64')
  await page.goto(`http://localhost:5173/mirror/app/preview?code=${encoded}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)

  await page.screenshot({ path: '.playwright-mcp/visual-test-all.png', fullPage: true })
  console.log('✓ Screenshot: .playwright-mcp/visual-test-all.png')
  console.log('✓ Browser bleibt offen - Ctrl+C zum Beenden')

  // Keep browser open for manual inspection
  await new Promise(() => {})
}

main().catch(console.error)
