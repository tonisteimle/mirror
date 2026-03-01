#!/usr/bin/env npx tsx
/**
 * Validate Form Design - Prüft tatsächliche Größen und Styles
 */

import { chromium } from 'playwright'

interface ValidationResult {
  name: string
  expected: { height?: number; bg?: string; hasIcon?: boolean }
  actual: { width: number; height: number; bg: string; children: number; html: string }
  pass: boolean
  issues: string[]
}

const tests = [
  {
    name: 'SearchField',
    code: 'SearchField',
    expect: { height: 36, bg: 'rgb(37, 37, 37)', hasIcon: true }
  },
  {
    name: 'Checkbox',
    code: 'Checkbox',
    expect: { height: 16, bg: 'rgb(51, 51, 51)' }
  },
  {
    name: 'Switch + SwitchThumb',
    code: 'Switch\n  SwitchThumb',
    expect: { height: 18, bg: 'rgb(51, 51, 51)' }
  },
  {
    name: 'ChipToggle',
    code: 'ChipToggle "Test"',
    expect: { height: 28, bg: 'rgb(37, 37, 37)' }
  },
  {
    name: 'ToggleButton',
    code: 'ToggleButton "Toggle"',
    expect: { height: 36, bg: 'rgb(37, 37, 37)' }
  },
  {
    name: 'Segment',
    code: 'Segment "Option"',
    expect: { height: 36 }
  },
  {
    name: 'Stepper',
    code: 'Stepper\n  StepperMinus\n  StepperValue "5"\n  StepperPlus',
    expect: { height: 36, bg: 'rgb(37, 37, 37)', hasIcon: true }
  },
  {
    name: 'RatingStarItem',
    code: 'RatingStarItem',
    expect: { height: 28, hasIcon: true }
  },
  {
    name: 'Icon (direct)',
    code: 'Icon "search", is 20, col #FFF',
    expect: { hasIcon: true }
  }
]

async function main() {
  try {
    await fetch('http://localhost:5173/mirror/app/')
  } catch {
    console.log('⚠ Dev server not running')
    process.exit(1)
  }

  const browser = await chromium.launch({ headless: true })
  const results: ValidationResult[] = []

  for (const test of tests) {
    const context = await browser.newContext({ viewport: { width: 600, height: 400 } })
    const page = await context.newPage()

    const wrappedCode = `Box pad 40, bg #1A1A1A, center\n  ${test.code.split('\n').join('\n  ')}`
    const encoded = Buffer.from(wrappedCode).toString('base64')

    await page.goto(`http://localhost:5173/mirror/app/preview?code=${encoded}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // Get rendered element info
    const info = await page.evaluate(() => {
      // Find the preview container
      const previewArea = document.querySelector('div[style*="padding: 24px"]') ||
                          document.querySelector('div[style*="overflow: auto"]')?.firstElementChild

      if (!previewArea) return null

      // Find the Box container (our wrapper)
      const box = previewArea.querySelector('div') as HTMLElement
      if (!box) return null

      // Find the actual component (first child of our Box)
      const component = box.firstElementChild as HTMLElement
      if (!component) return { found: false, reason: 'no component child' }

      const rect = component.getBoundingClientRect()
      const styles = window.getComputedStyle(component)

      // Check for SVG icons
      const hasSvg = component.querySelector('svg') !== null

      return {
        found: true,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        bg: styles.backgroundColor,
        children: component.children.length,
        hasSvg,
        html: component.innerHTML.substring(0, 300)
      }
    })

    const issues: string[] = []

    if (!info || !info.found) {
      issues.push('Component not rendered')
    } else {
      if (test.expect.height && Math.abs(info.height - test.expect.height) > 2) {
        issues.push(`Height: expected ${test.expect.height}px, got ${info.height}px`)
      }
      if (test.expect.bg && info.bg !== test.expect.bg && info.bg !== 'rgba(0, 0, 0, 0)') {
        issues.push(`BG: expected ${test.expect.bg}, got ${info.bg}`)
      }
      if (test.expect.hasIcon && !info.hasSvg) {
        issues.push('Icon SVG not found')
      }
    }

    results.push({
      name: test.name,
      expected: test.expect,
      actual: info ? {
        width: info.width || 0,
        height: info.height || 0,
        bg: info.bg || 'none',
        children: info.children || 0,
        html: info.html || ''
      } : { width: 0, height: 0, bg: 'none', children: 0, html: '' },
      pass: issues.length === 0,
      issues
    })

    // Screenshot
    await page.screenshot({ path: `.playwright-mcp/validate-${test.name.toLowerCase().replace(/\s+/g, '-')}.png` })

    await context.close()
  }

  await browser.close()

  // Print results
  console.log('\n=== VALIDATION RESULTS ===\n')

  for (const r of results) {
    const status = r.pass ? '✅' : '❌'
    console.log(`${status} ${r.name}`)
    console.log(`   Size: ${r.actual.width}x${r.actual.height}px`)
    console.log(`   BG: ${r.actual.bg}`)
    console.log(`   Children: ${r.actual.children}`)
    if (r.issues.length > 0) {
      console.log(`   Issues: ${r.issues.join(', ')}`)
    }
    console.log()
  }

  const passed = results.filter(r => r.pass).length
  console.log(`\n=== ${passed}/${results.length} PASSED ===`)
}

main().catch(console.error)
