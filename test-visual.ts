import { chromium } from 'playwright'
import { jsonToMirror } from './src/converter/json-to-mirror'

const testCases = [
  {
    name: "notification-card",
    json: {
      nodes: [{
        type: "component" as const,
        name: "Box",
        id: "1",
        modifiers: [],
        properties: { hor: true, gap: 12, pad: 16, bg: "#1E293B", rad: 12, "ver-cen": true },
        children: [
          { type: "component" as const, name: "Icon", id: "2", modifiers: [], properties: { icon: "bell", size: 24, col: "#F59E0B" }, children: [] },
          {
            type: "component" as const,
            name: "Box",
            id: "3",
            modifiers: [],
            properties: { ver: true, gap: 4 },
            children: [
              { type: "component" as const, name: "Text", id: "4", modifiers: [], properties: { size: 14, weight: 600, col: "#FFFFFF" }, content: "Neue Nachricht", children: [] },
              { type: "component" as const, name: "Text", id: "5", modifiers: [], properties: { size: 12, col: "#94A3B8" }, content: "Sie haben 3 ungelesene Nachrichten", children: [] }
            ]
          }
        ]
      }]
    }
  },
  {
    name: "login-form",
    json: {
      nodes: [{
        type: "component" as const,
        name: "Box",
        id: "1",
        modifiers: [],
        properties: { ver: true, gap: 16, pad: 24, bg: "#1F2937", rad: 12 },
        children: [
          { type: "component" as const, name: "Text", id: "2", modifiers: [], properties: { size: 24, weight: 700, col: "#FFFFFF" }, content: "Login", children: [] },
          { type: "component" as const, name: "Input", id: "3", modifiers: [], instanceName: "Email", properties: { placeholder: "Email", h: 40, pad: 12, bg: "#374151", rad: 6, col: "#FFFFFF" }, children: [] },
          { type: "component" as const, name: "Input", id: "4", modifiers: [], instanceName: "Password", properties: { placeholder: "Password", type: "password", h: 40, pad: 12, bg: "#374151", rad: 6, col: "#FFFFFF" }, children: [] },
          { type: "component" as const, name: "Button", id: "5", modifiers: [], properties: { bg: "#3B82F6", col: "#FFFFFF", h: 44, rad: 8, "hor-cen": true, "ver-cen": true }, content: "Sign In", children: [] }
        ]
      }]
    }
  },
  {
    name: "product-card",
    json: {
      nodes: [{
        type: "component" as const,
        name: "Box",
        id: "1",
        modifiers: [],
        properties: { ver: true, w: 280, bg: "#1F2937", rad: 12 },
        children: [
          { type: "component" as const, name: "Box", id: "2", modifiers: [], properties: { h: 160, bg: "#374151", "rad-t": 12 }, children: [] },
          {
            type: "component" as const,
            name: "Box",
            id: "3",
            modifiers: [],
            properties: { ver: true, pad: 16, gap: 8 },
            children: [
              { type: "component" as const, name: "Text", id: "4", modifiers: [], properties: { size: 18, weight: 600, col: "#FFFFFF" }, content: "MacBook Pro", children: [] },
              { type: "component" as const, name: "Text", id: "5", modifiers: [], properties: { size: 14, col: "#9CA3AF" }, content: "Apple M3 Chip, 16GB RAM", children: [] },
              { type: "component" as const, name: "Text", id: "6", modifiers: [], properties: { size: 24, weight: 700, col: "#10B981" }, content: "$1,999", children: [] }
            ]
          }
        ]
      }]
    }
  },
  {
    name: "sidebar-nav",
    json: {
      nodes: [{
        type: "component" as const,
        name: "Box",
        id: "1",
        modifiers: [],
        properties: { ver: true, w: 220, bg: "#111827", pad: 12, gap: 4 },
        children: [
          {
            type: "component" as const,
            name: "Box",
            id: "2",
            modifiers: [],
            properties: { hor: true, gap: 12, pad: 12, rad: 8, "ver-cen": true, bg: "#3B82F6" },
            children: [
              { type: "component" as const, name: "Icon", id: "3", modifiers: [], properties: { icon: "home", size: 18, col: "#FFFFFF" }, children: [] },
              { type: "component" as const, name: "Text", id: "4", modifiers: [], properties: { size: 14, col: "#FFFFFF" }, content: "Dashboard", children: [] }
            ]
          },
          {
            type: "component" as const,
            name: "Box",
            id: "5",
            modifiers: [],
            properties: { hor: true, gap: 12, pad: 12, rad: 8, "ver-cen": true },
            children: [
              { type: "component" as const, name: "Icon", id: "6", modifiers: [], properties: { icon: "users", size: 18, col: "#9CA3AF" }, children: [] },
              { type: "component" as const, name: "Text", id: "7", modifiers: [], properties: { size: 14, col: "#9CA3AF" }, content: "Team", children: [] }
            ]
          },
          {
            type: "component" as const,
            name: "Box",
            id: "8",
            modifiers: [],
            properties: { hor: true, gap: 12, pad: 12, rad: 8, "ver-cen": true },
            children: [
              { type: "component" as const, name: "Icon", id: "9", modifiers: [], properties: { icon: "settings", size: 18, col: "#9CA3AF" }, children: [] },
              { type: "component" as const, name: "Text", id: "10", modifiers: [], properties: { size: 14, col: "#9CA3AF" }, content: "Settings", children: [] }
            ]
          }
        ]
      }]
    }
  }
]

async function run() {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto('http://localhost:5173')
  await page.waitForTimeout(1000)

  // Clear localStorage
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForTimeout(500)

  for (const tc of testCases) {
    console.log(`\nTesting: ${tc.name}`)

    const mirrorCode = jsonToMirror(tc.json)
    console.log("Mirror Code:")
    console.log(mirrorCode)

    // Set content via localStorage project structure and reload
    await page.evaluate((code) => {
      const projectData = {
        version: 1,
        pages: [{
          id: 'test-page',
          name: 'Test',
          layoutCode: code
        }],
        currentPageId: 'test-page',
        componentsCode: '',
        tokensCode: ''
      }
      localStorage.setItem('mirror-project', JSON.stringify(projectData))
    }, mirrorCode)

    await page.reload()
    await page.waitForTimeout(1000)

    // Take screenshot
    await page.screenshot({ path: `screenshots/${tc.name}.png`, fullPage: true })
    console.log(`Screenshot saved: screenshots/${tc.name}.png`)
  }

  await browser.close()
}

run().catch(console.error)
