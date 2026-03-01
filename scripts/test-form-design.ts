#!/usr/bin/env npx tsx
/**
 * Test Form Design - Screenshots für Analyse
 */

import { chromium } from 'playwright'

const testCases = [
  {
    name: 'inputs',
    code: `
// Test: Input Fields
Box ver, gap 12, pad 24, bg #1A1A1A, width 400

  Label "Search Field"
  SearchField

  Label "Password Field"
  PasswordField

  Label "Currency Field"
  CurrencyField

  Label "Date Field"
  DateField

  Label "Select Field"
  SelectField
`
  },
  {
    name: 'toggles',
    code: `
// Test: Toggle Controls
Box ver, gap 12, pad 24, bg #1A1A1A, width 400

  Label "Segmented Control"
  SegmentedControl
    Segment "Option A"
    Segment "Option B"
    Segment "Option C"

  Label "Toggle Group"
  ToggleGroup
    ToggleGroupItem "Eins"
    ToggleGroupItem "Zwei"
    ToggleGroupItem "Drei"

  Label "Chip Toggles"
  ChipToggleGroup
    ChipToggle "React"
    ChipToggle "Vue"
    ChipToggle "Svelte"
`
  },
  {
    name: 'stepper-rating',
    code: `
// Test: Stepper & Rating
Box ver, gap 16, pad 24, bg #1A1A1A, width 400

  Label "Stepper"
  Stepper
    StepperMinus
    StepperValue "5"
    StepperPlus

  Label "Rating Stars"
  RatingStars
    RatingStarItem
    RatingStarItem
    RatingStarItem
    RatingStarItem
    RatingStarItem
`
  },
  {
    name: 'checkboxes',
    code: `
// Test: Checkboxes
Box ver, gap 12, pad 24, bg #1A1A1A, width 400

  Label "Checkbox Options"
  Box ver, gap 6
    CheckboxOption Label "Option 1"
    CheckboxOption Label "Option 2"
    CheckboxOption Label "Option 3"

  Label "Basic Checkbox"
  Checkbox
`
  },
  {
    name: 'radios',
    code: `
// Test: Radio Buttons
Box ver, gap 12, pad 24, bg #1A1A1A, width 400

  Label "Radio Options"
  Box ver, gap 6
    RadioOption Label "Choice A"
    RadioOption Label "Choice B"
    RadioOption Label "Choice C"

  Label "Basic Radio"
  Radio
`
  },
  {
    name: 'switches',
    code: `
// Test: Switches
Box ver, gap 12, pad 24, bg #1A1A1A, width 400

  Label "Switch Options"
  Box ver, gap 6
    SwitchOption Label "Dark Mode"
    SwitchOption Label "Notifications"
    SwitchOption Label "Auto-Save"

  Label "Basic Switch"
  Switch
    SwitchThumb
`
  },
  {
    name: 'buttons',
    code: `
// Test: Buttons
Box ver, gap 12, pad 24, bg #1A1A1A, width 400

  Label "Toggle Buttons"
  Box hor, gap 8
    ToggleButton "Toggle 1"
    ToggleButton "Toggle 2"

  Label "Toggle Icon Buttons"
  Box hor, gap 8
    ToggleIconButton Icon "bold"
    ToggleIconButton Icon "italic"
    ToggleIconButton Icon "underline"

  Label "Standard Buttons"
  Box hor, gap 8
    GhostButton "Cancel"
    PrimaryButton "Save"
`
  }
]

async function main() {
  // Check server
  try {
    await fetch('http://localhost:5173/mirror/app/')
  } catch {
    console.log('⚠ Dev server not running. Start with: npm run dev')
    process.exit(1)
  }

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 800, height: 600 } })

  for (const test of testCases) {
    console.log(`○ Testing: ${test.name}...`)

    const page = await context.newPage()
    const encoded = Buffer.from(test.code).toString('base64')
    const url = `http://localhost:5173/mirror/app/preview?code=${encoded}`

    await page.goto(url)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await page.screenshot({
      path: `.playwright-mcp/form-test-${test.name}.png`,
      fullPage: true
    })

    console.log(`  ✓ Screenshot: form-test-${test.name}.png`)
    await page.close()
  }

  await browser.close()
  console.log('\n✓ Alle Screenshots erstellt')
}

main().catch(console.error)
