import { chromium } from 'playwright'

async function testMoonLibrary() {
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  const page = await context.newPage()

  console.log('🌐 Opening Mirror app...')
  await page.goto('http://ux-strategy.ch/mirror/app/')
  await page.waitForTimeout(1000)

  // Clear localStorage to get fresh defaults
  console.log('🗑️ Clearing localStorage for fresh defaults...')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForTimeout(2000)

  // Take screenshot of initial state with fresh defaults
  await page.screenshot({ path: 'screenshot-1-fresh-start.png' })
  console.log('📸 Screenshot 1: Fresh start with Moon defaults')

  // Check Components tab - should show Moon components now
  console.log('📋 Checking Components tab...')
  await page.click('text=Components')
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'screenshot-2-components.png' })
  console.log('📸 Screenshot 2: Components tab with Moon definitions')

  // Check Tokens tab
  console.log('📋 Checking Tokens tab...')
  await page.click('text=Tokens')
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'screenshot-3-tokens.png' })
  console.log('📸 Screenshot 3: Tokens tab')

  // Go to Page and test the components
  console.log('📋 Testing Page with Moon components...')
  await page.click('text=Page')
  await page.waitForTimeout(500)

  const editor = page.locator('.cm-content')
  await editor.click()
  await page.waitForTimeout(300)

  // Type a layout using Moon components
  const testLayout = `Page
  Header
    H3 "Moon Demo"
    Nav
      NavItem "Home"
      NavItem "About"

  Section
    Card
      H2 "Welcome"
      TextMuted "Moon Design System Demo"
      Text "This should look styled now!"
      Row
        Button "Primary"
        ButtonSecondary "Secondary"

  Footer
    TextSmall "© 2024"`

  await page.keyboard.type(testLayout, { delay: 3 })
  await page.waitForTimeout(1500)

  await page.screenshot({ path: 'screenshot-4-styled-layout.png' })
  console.log('📸 Screenshot 4: Layout with Moon styling')

  console.log('\n✅ Test completed!')
  console.log('Browser will stay open for 20 seconds...')
  await page.waitForTimeout(20000)

  await browser.close()
}

testMoonLibrary().catch(console.error)
