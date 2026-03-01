#!/usr/bin/env npx tsx
/**
 * Mirror Preview Script
 *
 * Generates Mirror code and opens it in the /preview route.
 * Browser stays open by default for inspection.
 *
 * Usage:
 *   npm run preview                              # Default navigation
 *   npm run preview -- --type form               # Form preview
 *   npm run preview -- --schema '{"items":[...]}'  # Custom schema
 *   npm run preview -- --close                   # Close browser after screenshot
 *   npm run preview -- --no-screenshot           # Skip screenshot
 *   npm run preview -- --code-only               # Only generate code, no browser
 *   npm run preview -- --show-code               # Show code panel in preview
 */

import { chromium, type Browser, type Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'
import { generateSidebarNavigationFromSchema, generateFormFromSchema } from '../src/services/generation'
import type { SidebarNavigationInput, FormInput } from '../src/services/generation'

type ExpertType = 'navigation' | 'form'

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
  screenshotDir: '.screenshots',
  serverBase: 'http://localhost:5174/mirror/app/',
  previewPath: 'preview',
  viewport: { width: 1200, height: 800 },
  renderWait: 1000,
  serverTimeout: 3000,
}

// =============================================================================
// CLI Options
// =============================================================================

interface Options {
  close: boolean
  screenshot: boolean
  codeOnly: boolean
  showCode: boolean
  type: ExpertType
  schema?: SidebarNavigationInput | FormInput
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    close: false,
    screenshot: true,
    codeOnly: false,
    showCode: false,
    type: 'navigation',
  }

  let i = 0
  while (i < args.length) {
    const arg = args[i]
    switch (arg) {
      case '--close':
        options.close = true
        break
      case '--no-screenshot':
        options.screenshot = false
        break
      case '--code-only':
        options.codeOnly = true
        break
      case '--show-code':
        options.showCode = true
        break
      case '--type':
        if (args[i + 1]) {
          const t = args[i + 1].toLowerCase()
          if (t === 'form' || t === 'navigation' || t === 'nav') {
            options.type = t === 'nav' ? 'navigation' : t as ExpertType
          }
          i++
        }
        break
      case '--schema':
        if (args[i + 1]) {
          options.schema = JSON.parse(args[i + 1])
          i++
        }
        break
    }
    i++
  }

  return options
}

// =============================================================================
// Server Check
// =============================================================================

async function isServerRunning(): Promise<boolean> {
  const maxAttempts = Math.ceil(CONFIG.serverTimeout / 300)
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(CONFIG.serverBase)
      if (response.ok || response.status === 302) return true
    } catch {
      // Server not ready
    }
    await new Promise(r => setTimeout(r, 300))
  }
  return false
}

// =============================================================================
// Code Generation
// =============================================================================

function getDefaultNavigationSchema(): SidebarNavigationInput {
  return {
    items: [
      { icon: 'layout-dashboard', label: 'Dashboard', active: true },
      { icon: 'folder', label: 'Projekte' },
      { icon: 'check-square', label: 'Aufgaben' },
      { icon: 'users', label: 'Team' },
      { icon: 'bar-chart', label: 'Berichte' },
      { icon: 'settings', label: 'Einstellungen' },
    ],
  }
}

function getDefaultFormSchema(): FormInput {
  return {
    fields: [
      { type: 'email', name: 'email', label: 'Email', placeholder: 'you@example.com', required: true },
      { type: 'password', name: 'password', label: 'Password', placeholder: 'Enter password', required: true, showToggle: true },
    ],
    submit: { label: 'Sign In' },
  }
}

function getDefaultSchema(type: ExpertType): SidebarNavigationInput | FormInput {
  return type === 'form' ? getDefaultFormSchema() : getDefaultNavigationSchema()
}

function generateCode(schema: SidebarNavigationInput | FormInput, type: ExpertType): string {
  if (type === 'form') {
    const result = generateFormFromSchema(schema as FormInput)
    if (!result.success) {
      console.error('✗ Form generation failed:', result.error)
      process.exit(1)
    }
    return result.code!
  } else {
    const result = generateSidebarNavigationFromSchema(schema as SidebarNavigationInput)
    if (!result.success) {
      console.error('✗ Navigation generation failed:', result.error)
      process.exit(1)
    }
    return result.code!
  }
}

// =============================================================================
// Browser Management
// =============================================================================

async function openPreview(
  code: string,
  options: Options
): Promise<{ browser: Browser; page: Page; screenshotPath?: string }> {
  // Ensure screenshot directory exists
  if (options.screenshot && !fs.existsSync(CONFIG.screenshotDir)) {
    fs.mkdirSync(CONFIG.screenshotDir, { recursive: true })
  }

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox'],
  })

  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    storageState: { cookies: [], origins: [] },
  })

  const page = await context.newPage()

  // Log errors
  page.on('pageerror', err => console.error('Page Error:', err.message))

  // Build URL
  const encodedCode = Buffer.from(code).toString('base64')
  const showCodeParam = options.showCode ? '&showCode=1' : ''
  const previewUrl = `${CONFIG.serverBase}${CONFIG.previewPath}?code=${encodedCode}${showCodeParam}`

  // Navigate
  await page.goto(previewUrl)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(CONFIG.renderWait)

  // Screenshot
  let screenshotPath: string | undefined
  if (options.screenshot) {
    const timestamp = Date.now()
    screenshotPath = path.join(CONFIG.screenshotDir, `preview-${timestamp}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: false })
  }

  return { browser, page, screenshotPath }
}

// =============================================================================
// Output Formatting
// =============================================================================

function printCode(code: string): void {
  const lines = code.split('\n')
  const width = Math.max(50, ...lines.map(l => l.length)) + 4

  console.log()
  console.log('┌' + '─'.repeat(width - 2) + '┐')
  for (const line of lines) {
    console.log('│ ' + line.padEnd(width - 4) + ' │')
  }
  console.log('└' + '─'.repeat(width - 2) + '┘')
  console.log()
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const args = process.argv.slice(2)

  // Help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Mirror Preview - Generate and preview Mirror code

Usage:
  npm run preview                    Default navigation preview
  npm run preview -- --type form     Form preview
  npm run preview -- [options]       With options

Options:
  --type <type>       Expert type: navigation (default), form
  --schema '{...}'    Custom JSON schema for generation
  --close             Close browser after screenshot
  --no-screenshot     Skip taking screenshot
  --code-only         Only generate code, don't open browser
  --show-code         Show code panel in preview (for debugging)
  --help, -h          Show this help

Examples:
  npm run preview -- --type form
  npm run preview -- --type form --schema '{"fields":[{"type":"text","name":"name","label":"Name"}],"submit":{"label":"Save"}}'
`)
    process.exit(0)
  }

  const options = parseArgs(args)
  const schema = options.schema || getDefaultSchema(options.type)

  // Generate code
  console.log(`○ Generating ${options.type} Mirror code...`)
  const code = generateCode(schema, options.type)
  printCode(code)

  // Code-only mode
  if (options.codeOnly) {
    console.log('✓ Code generated (--code-only mode)')
    process.exit(0)
  }

  // Check server
  console.log('○ Checking dev server...')
  const serverRunning = await isServerRunning()
  if (!serverRunning) {
    console.log('⚠ Dev server not running. Start with: npm run dev')
    console.log('  Code generated above - paste manually into editor')
    process.exit(0)
  }

  // Open preview
  console.log('○ Opening browser...')
  const { browser, screenshotPath } = await openPreview(code, options)

  if (screenshotPath) {
    console.log(`✓ Screenshot: ${screenshotPath}`)
  }

  if (options.close) {
    console.log('○ Closing browser (--close)')
    await browser.close()
    process.exit(0)
  }

  // Keep browser open until manually closed
  console.log('✓ Browser open - Ctrl+C to exit')

  // Handle browser disconnect (user closes browser window)
  browser.on('disconnected', () => {
    console.log('○ Browser closed')
    process.exit(0)
  })

  // Keep process alive
  await new Promise(() => {})
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
