#!/usr/bin/env npx tsx
/**
 * Test jedes einzelne Form Element
 */

import { chromium } from 'playwright'

const elements = [
  // Inputs
  { name: '01-searchfield', code: `SearchField` },
  { name: '02-passwordfield', code: `PasswordField` },
  { name: '03-currencyfield', code: `CurrencyField` },
  { name: '04-datefield', code: `DateField` },
  { name: '05-selectfield', code: `SelectField` },
  { name: '06-input-wrapper', code: `InputWrapper\n  Input placeholder "Test"` },

  // Checkboxes
  { name: '10-checkbox', code: `Checkbox` },
  { name: '11-checkbox-option', code: `CheckboxOption Label "Newsletter"` },

  // Radios
  { name: '20-radio', code: `Radio` },
  { name: '21-radio-option', code: `RadioOption Label "Option A"` },

  // Switches
  { name: '30-switch', code: `Switch\n  SwitchThumb` },
  { name: '31-switch-option', code: `SwitchOption Label "Dark Mode"` },

  // Toggles
  { name: '40-toggle-button', code: `ToggleButton "Toggle"` },
  { name: '41-toggle-icon-button', code: `ToggleIconButton Icon "bold"` },
  { name: '42-segment', code: `Segment "Option"` },
  { name: '43-segmented-control', code: `SegmentedControl\n  Segment "A"\n  Segment "B"\n  Segment "C"` },
  { name: '44-chip-toggle', code: `ChipToggle "Tag"` },
  { name: '45-toggle-group', code: `ToggleGroup\n  ToggleGroupItem "Eins"\n  ToggleGroupItem "Zwei"` },

  // Stepper & Rating
  { name: '50-stepper', code: `Stepper\n  StepperMinus\n  StepperValue "5"\n  StepperPlus` },
  { name: '51-stepper-minus', code: `StepperMinus` },
  { name: '52-stepper-plus', code: `StepperPlus` },
  { name: '53-rating-stars', code: `RatingStars\n  RatingStarItem\n  RatingStarItem\n  RatingStarItem` },
  { name: '54-rating-star-item', code: `RatingStarItem` },

  // Basic Icons test
  { name: '90-icon-search', code: `Icon "search", is 16` },
  { name: '91-icon-star', code: `Icon "star", is 18` },
  { name: '92-icon-plus', code: `Icon "plus", is 16` },
]

async function main() {
  try {
    await fetch('http://localhost:5173/mirror/app/')
  } catch {
    console.log('⚠ Dev server not running')
    process.exit(1)
  }

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 600, height: 400 } })

  for (const el of elements) {
    const page = await context.newPage()

    // Wrap in a container with padding for visibility
    const wrappedCode = `Box pad 24, bg #1A1A1A, center\n  ${el.code.split('\n').join('\n  ')}`
    const encoded = Buffer.from(wrappedCode).toString('base64')

    await page.goto(`http://localhost:5173/mirror/app/preview?code=${encoded}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300)

    // Get element info
    const info = await page.evaluate(() => {
      const preview = document.querySelector('[class*="preview"]') as HTMLElement
      if (!preview) return null

      // Find the first rendered element (skip the wrapper)
      const wrapper = preview.querySelector('div > div') as HTMLElement
      if (!wrapper) return null

      const firstChild = wrapper.firstElementChild as HTMLElement
      if (!firstChild) return { found: false }

      const rect = firstChild.getBoundingClientRect()
      const styles = window.getComputedStyle(firstChild)

      return {
        found: true,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        bg: styles.backgroundColor,
        hasChildren: firstChild.children.length,
        innerHTML: firstChild.innerHTML.substring(0, 200)
      }
    })

    await page.screenshot({ path: `.playwright-mcp/el-${el.name}.png` })

    console.log(`${el.name}:`)
    if (info?.found) {
      console.log(`  Size: ${info.width}x${info.height}px`)
      console.log(`  BG: ${info.bg}`)
      console.log(`  Children: ${info.hasChildren}`)
    } else {
      console.log(`  ⚠ Not found or not rendered`)
    }

    await page.close()
  }

  await browser.close()
  console.log('\n✓ Done')
}

main().catch(console.error)
