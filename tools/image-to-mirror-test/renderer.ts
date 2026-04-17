/**
 * Mirror Code Renderer
 *
 * Compiles Mirror code and renders it to PNG via headless browser.
 */

import * as fs from 'fs'
import * as path from 'path'
import type { CDPSession } from '../test-runner/types'
import type { RenderedImage, TestConfig } from './types'
import { defaultConfig } from './types'

// =============================================================================
// Renderer Class
// =============================================================================

export class MirrorRenderer {
  private cdp: CDPSession
  private config: TestConfig
  private outputDir: string

  constructor(cdp: CDPSession, config: Partial<TestConfig> = {}) {
    this.cdp = cdp
    this.config = { ...defaultConfig, ...config }
    this.outputDir = this.config.outputDir
    this.ensureOutputDir()
  }

  /**
   * Render Mirror code to PNG
   */
  async render(mirrorCode: string, testId: string): Promise<RenderedImage> {
    // 1. Generate standalone HTML with compiled Mirror code
    const html = await this.generateHTML(mirrorCode)

    // 2. Load HTML in browser
    await this.loadHTML(html)

    // 3. Wait for rendering to complete
    await this.waitForRender()

    // 4. Get viewport dimensions
    const dimensions = await this.getViewportDimensions()

    // 5. Capture screenshot
    const base64 = await this.captureScreenshot()
    const buffer = Buffer.from(base64, 'base64')

    // 6. Save to disk if configured
    let filePath: string | undefined
    if (this.config.saveScreenshots) {
      filePath = path.join(this.outputDir, `${testId}.png`)
      fs.writeFileSync(filePath, buffer)
    }

    return {
      base64,
      buffer,
      width: dimensions.width,
      height: dimensions.height,
      filePath,
    }
  }

  /**
   * Generate standalone HTML with embedded Mirror code
   */
  private async generateHTML(mirrorCode: string): Promise<string> {
    // Import compiler dynamically to avoid circular dependencies
    const { parse } = await import('../../compiler/parser')
    const { generateDOM } = await import('../../compiler/backends/dom')

    // Parse Mirror code
    const ast = parse(mirrorCode)

    // Generate JavaScript (includes runtime automatically)
    const jsCode = generateDOM(ast)

    // Create standalone HTML
    // The generated code exports createUI(), we need to call it and mount
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mirror Render Test</title>
  <style>
    /* Reset styles for consistent rendering */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100%;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      background: #ffffff;
      color: #000000;
    }
    #root {
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    ${jsCode}

    // Mount the UI (createUI returns the root element directly)
    const ui = createUI();
    document.getElementById('root').appendChild(ui);
  </script>
</body>
</html>`
  }

  /**
   * Load HTML content in browser
   * Writes to temp file and navigates (needed for ES modules to work)
   */
  private async loadHTML(html: string): Promise<void> {
    // Write HTML to temp file (use absolute path)
    const tempFile = path.resolve(this.outputDir, '_temp_render.html')
    fs.writeFileSync(tempFile, html)

    // Navigate to the file (file:// needs absolute path)
    const fileUrl = `file://${tempFile}`
    await this.cdp.send('Page.navigate', { url: fileUrl })

    // Wait for page load
    await new Promise<void>(resolve => {
      const handler = () => {
        this.cdp.off('Page.loadEventFired', handler)
        resolve()
      }
      this.cdp.on('Page.loadEventFired', handler)
    })
  }

  /**
   * Wait for Mirror rendering to complete
   */
  private async waitForRender(timeout = 5000): Promise<void> {
    const start = Date.now()

    while (Date.now() - start < timeout) {
      // Check if the root element has children (meaning UI was mounted)
      const result = await this.cdp.send<{ result: { value: number } }>('Runtime.evaluate', {
        expression: `
          (function() {
            const root = document.getElementById('root');
            return root ? root.children.length : 0;
          })()
        `,
        returnByValue: true,
      })

      if (result.result.value > 0) {
        // Extra delay for CSS animations/transitions to settle
        await this.sleep(100)
        return
      }

      await this.sleep(50)
    }

    throw new Error('Render timeout')
  }

  /**
   * Get viewport dimensions
   */
  private async getViewportDimensions(): Promise<{ width: number; height: number }> {
    const result = await this.cdp.send<{
      result: { value: { width: number; height: number } }
    }>('Runtime.evaluate', {
      expression: `({
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight
      })`,
      returnByValue: true,
    })

    return result.result.value
  }

  /**
   * Capture screenshot as base64
   */
  private async captureScreenshot(): Promise<string> {
    const result = await this.cdp.send<{ data: string }>('Page.captureScreenshot', {
      format: 'png',
      quality: 100,
    })

    return result.data
  }

  /**
   * Set viewport size
   */
  async setViewport(width: number, height: number): Promise<void> {
    await this.cdp.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    })
  }

  /**
   * Ensure output directory exists
   */
  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// =============================================================================
// Standalone Render Function
// =============================================================================

/**
 * Compile Mirror code to standalone HTML
 * (Can be used without browser for pre-rendering)
 */
export async function compileToHTML(mirrorCode: string): Promise<string> {
  const { parse } = await import('../../compiler/parser')
  const { generateDOM } = await import('../../compiler/backends/dom')

  const ast = parse(mirrorCode)
  const jsCode = generateDOM(ast)

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #root { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    ${jsCode}
    const ui = createUI();
    document.getElementById('root').appendChild(ui);
  </script>
</body>
</html>`
}
