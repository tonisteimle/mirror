/**
 * Spec Studio Quality Tests
 *
 * Tests that the LLM generates apps that match the Mirror specification.
 *
 * Two aspects:
 * 1. Code Quality: Is the generated HTML valid and functional?
 * 2. Spec Compliance: Does the app contain all specified elements?
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3333'

// Test cases: Mirror spec -> expected elements in generated HTML
const TEST_CASES = [
  {
    name: 'Simple Button',
    input: `Button "Save", bg #2563eb`,
    expectedInHtml: ['<button', 'Save', '#2563eb'],
    expectedInSpec: ['Button', '"Save"', 'bg']
  },
  {
    name: 'Tabs with content',
    input: `Tabs
  Tab "Home"
    Text "Welcome"
  Tab "Settings"
    Text "Options"`,
    expectedInHtml: ['Home', 'Settings', 'Welcome', 'Options', 'tab'],
    expectedInSpec: ['Tabs', 'Tab', '"Home"', '"Settings"']
  },
  {
    name: 'Switch toggle',
    input: `Frame
  Text "Dark Mode"
  Switch`,
    expectedInHtml: ['Dark Mode', 'switch'],
    expectedInSpec: ['Switch', '"Dark Mode"']
  },
  {
    name: 'Accordion sections',
    input: `Accordion
  AccordionItem "Section 1"
    Text "Content 1"
  AccordionItem "Section 2"
    Text "Content 2"`,
    expectedInHtml: ['Section 1', 'Section 2', 'Content 1', 'Content 2'],
    expectedInSpec: ['Accordion', 'AccordionItem', '"Section 1"', '"Section 2"']
  },
  {
    name: 'Form with inputs',
    input: `Frame gap 16
  Label "Name"
  Input placeholder "Enter name"
  Label "Email"
  Input placeholder "Enter email", type email
  Button "Submit"`,
    expectedInHtml: ['Name', 'Email', 'Enter name', 'Enter email', 'Submit', '<input', '<button'],
    expectedInSpec: ['Label', 'Input', 'placeholder', 'Button', '"Submit"']
  },
  {
    name: 'Dark theme settings page',
    input: `// Settings - dark theme
SettingsPage
  H1 "Settings"
  Tabs
    Tab "Profile"
      Input "Name"
      Switch "Newsletter"
    Tab "Notifications"
      Switch "Push"
      Switch "Email"`,
    expectedInHtml: ['Settings', 'Profile', 'Notifications', 'Name', 'Newsletter', 'Push', 'Email'],
    expectedInSpec: ['$', 'Tabs', 'Tab', 'Switch', 'Input']
  }
]

test.describe('Spec Studio Quality', () => {

  test.beforeAll(async () => {
    // Check if server is running
    try {
      const response = await fetch(BASE_URL)
      if (!response.ok) {
        throw new Error('Server not running')
      }
    } catch {
      console.log('Start server with: cd spec-studio && node server.js')
      test.skip()
    }
  })

  for (const testCase of TEST_CASES) {
    test(`generates correct output for: ${testCase.name}`, async ({ request }) => {
      // Skip in CI - requires Claude CLI
      test.skip(!!process.env.CI, 'Requires Claude CLI')
      test.setTimeout(180000) // 3 min for Claude

      console.log(`\n=== Testing: ${testCase.name} ===`)
      console.log('Input:', testCase.input.substring(0, 100) + '...')

      const response = await request.post(`${BASE_URL}/api/generate`, {
        headers: { 'Content-Type': 'application/json' },
        data: { mirrorCode: testCase.input },
        timeout: 180000
      })

      expect(response.ok()).toBe(true)

      const result = await response.json()
      expect(result.success).toBe(true)

      // 1. Check Mirror Spec was generated
      expect(result.cleanSpec).toBeTruthy()
      console.log('Mirror Spec length:', result.cleanSpec.length)

      for (const expected of testCase.expectedInSpec) {
        expect(result.cleanSpec).toContain(expected)
      }

      // 2. Check HTML App was generated
      expect(result.htmlApp).toBeTruthy()
      console.log('HTML App length:', result.htmlApp.length)

      // HTML should be valid
      expect(result.htmlApp).toContain('<!DOCTYPE html>')
      expect(result.htmlApp).toContain('<html')
      expect(result.htmlApp).toContain('</html>')

      // 3. Check HTML contains expected elements from spec
      const htmlLower = result.htmlApp.toLowerCase()
      for (const expected of testCase.expectedInHtml) {
        const expectedLower = expected.toLowerCase()
        expect(htmlLower).toContain(expectedLower)
      }

      console.log(`✓ ${testCase.name} passed`)
    })
  }

  test('generated app is interactive', async ({ page, request }) => {
    test.skip(!!process.env.CI, 'Requires Claude CLI')
    test.setTimeout(180000)

    // Generate a tabs component
    const response = await request.post(`${BASE_URL}/api/generate`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        mirrorCode: `Tabs
  Tab "Tab 1"
    Text "Content 1"
  Tab "Tab 2"
    Text "Content 2"`
      },
      timeout: 180000
    })

    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.htmlApp).toBeTruthy()

    // Load the generated app
    await page.goto(`${BASE_URL}/generated/index.html`)

    // Check Tab 1 is visible
    await expect(page.getByText('Content 1')).toBeVisible()

    // Click Tab 2
    await page.getByText('Tab 2').click()

    // Check Content 2 is now visible
    await expect(page.getByText('Content 2')).toBeVisible()
  })

  test('generated app has correct styling', async ({ page, request }) => {
    test.skip(!!process.env.CI, 'Requires Claude CLI')
    test.setTimeout(180000)

    // Generate with specific colors
    const response = await request.post(`${BASE_URL}/api/generate`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        mirrorCode: `// Dark theme
Frame bg #1a1a1a, pad 20
  Button "Primary", bg #2563eb, col white`
      },
      timeout: 180000
    })

    const result = await response.json()
    expect(result.success).toBe(true)

    // Load the generated app
    await page.goto(`${BASE_URL}/generated/index.html`)

    // Find the button
    const button = page.getByRole('button', { name: 'Primary' })
    await expect(button).toBeVisible()

    // Check button has blue background
    const bgColor = await button.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    )

    // Should be blue (#2563eb = rgb(37, 99, 235))
    expect(bgColor).toMatch(/rgb\(37,\s*99,\s*235\)|#2563eb/i)
  })

})

test.describe('Spec Studio Completeness', () => {

  test('all specified elements appear in generated app', async ({ request }) => {
    test.skip(!!process.env.CI, 'Requires Claude CLI')
    test.setTimeout(180000)

    const spec = `// Complete settings page
SettingsPage
  H1 "Einstellungen"

  Tabs
    Tab "Profil"
      Frame gap 16
        Label "Name"
        Input placeholder "Dein Name"
        Label "Email"
        Input placeholder "deine@email.de"
        Frame hor, spread
          Text "Newsletter"
          Switch

    Tab "Benachrichtigungen"
      Frame gap 12
        Frame hor, spread
          Text "Push"
          Switch
        Frame hor, spread
          Text "Email"
          Switch
        Frame hor, spread
          Text "Sound"
          Switch

    Tab "Erweitert"
      Accordion
        AccordionItem "Datenschutz"
          Text "Tracking-Einstellungen"
        AccordionItem "Audio"
          Slider "Lautstärke"`

    const response = await request.post(`${BASE_URL}/api/generate`, {
      headers: { 'Content-Type': 'application/json' },
      data: { mirrorCode: spec },
      timeout: 180000
    })

    const result = await response.json()
    expect(result.success).toBe(true)

    const html = result.htmlApp.toLowerCase()

    // All text content should be present
    const requiredContent = [
      'einstellungen',
      'profil',
      'benachrichtigungen',
      'erweitert',
      'name',
      'email',
      'newsletter',
      'push',
      'sound',
      'datenschutz',
      'audio',
      'lautstärke'
    ]

    const missing = requiredContent.filter(text => !html.includes(text))

    if (missing.length > 0) {
      console.log('Missing elements:', missing)
    }

    expect(missing).toHaveLength(0)
  })

})
