#!/usr/bin/env npx tsx
/**
 * Demo Form Preview
 *
 * Shows all new form controls in a single demo.
 */

import { chromium } from 'playwright'

const demoCode = `
// Demo: Form Controls (Minimal)
Form ver, gap 24, pad 24, bg #1A1A1A, rad 12, width 500

  // INPUTS MIT ICONS
  Box ver, gap 12
    Label "Eingabefelder", weight 600
    SearchField
    PasswordField
    CurrencyField
    DateField

  // TOGGLE CONTROLS
  Box ver, gap 12
    Label "Segmented Control", weight 600
    SegmentedControl
      Segment "Option A"
      Segment "Option B"
      Segment "Option C"

  // CHIPS
  Box ver, gap 12
    Label "Chip Toggles", weight 600
    ChipToggleGroup
      ChipToggle "React"
      ChipToggle "Vue"
      ChipToggle "Svelte"

  // STEPPER
  Box ver, gap 12
    Label "Stepper", weight 600
    Stepper
      StepperMinus
      StepperValue "5"
      StepperPlus

  // RATING
  Box ver, gap 12
    Label "Rating", weight 600
    RatingStars
      RatingStarItem
      RatingStarItem
      RatingStarItem
      RatingStarItem
      RatingStarItem

  // BUTTONS
  Box hor, gap 12, right, pad top 16
    GhostButton "Abbrechen"
    PrimaryButton "Speichern"
`

async function main() {
  // Check if server is running
  try {
    await fetch('http://localhost:5173/mirror/app/')
  } catch {
    console.log('⚠ Dev server nicht gestartet. Bitte erst: npm run dev')
    console.log('\nGenerierter Code:')
    console.log(demoCode)
    process.exit(0)
  }

  // Open browser with preview
  const encodedCode = Buffer.from(demoCode).toString('base64')
  const url = `http://localhost:5173/mirror/app/preview?code=${encodedCode}&showCode=1`

  console.log('○ Öffne Browser mit Demo-Formular...')

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox'],
  })

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  })

  const page = await context.newPage()
  await page.goto(url)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)

  // Screenshot
  await page.screenshot({ path: '.playwright-mcp/form-demo.png' })
  console.log('✓ Screenshot: .playwright-mcp/form-demo.png')
  console.log('✓ Browser offen - Ctrl+C zum Beenden')

  browser.on('disconnected', () => {
    console.log('○ Browser geschlossen')
    process.exit(0)
  })

  await new Promise(() => {})
}

main().catch(console.error)
