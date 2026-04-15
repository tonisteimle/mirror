/**
 * Screenshot Capture
 *
 * Captures screenshots via CDP.
 * Single responsibility: screenshot management.
 */

import * as fs from 'fs'
import * as path from 'path'
import type { CDPSession } from './types'

// =============================================================================
// Screenshot Capture
// =============================================================================

export class ScreenshotCapture {
  private cdp: CDPSession
  private outputDir: string

  constructor(cdp: CDPSession, outputDir: string) {
    this.cdp = cdp
    this.outputDir = outputDir
    this.ensureDir()
  }

  /**
   * Capture full page screenshot
   */
  async capturePage(filename: string): Promise<string> {
    const data = await this.captureRaw({ fullPage: true })
    return this.saveScreenshot(filename, data)
  }

  /**
   * Capture viewport only
   */
  async captureViewport(filename: string): Promise<string> {
    const data = await this.captureRaw({ fullPage: false })
    return this.saveScreenshot(filename, data)
  }

  /**
   * Capture specific element by selector
   */
  async captureElement(filename: string, selector: string): Promise<string> {
    const clip = await this.getElementBounds(selector)
    if (!clip) {
      throw new Error(`Element not found: ${selector}`)
    }

    const data = await this.captureRaw({ clip })
    return this.saveScreenshot(filename, data)
  }

  /**
   * Capture for a failed test (with sanitized name)
   */
  async captureFailure(testName: string): Promise<string> {
    const sanitized = this.sanitizeFilename(testName)
    const timestamp = Date.now()
    const filename = `failure-${sanitized}-${timestamp}.png`
    return this.capturePage(filename)
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private async captureRaw(options: {
    fullPage?: boolean
    clip?: { x: number; y: number; width: number; height: number; scale: number }
  }): Promise<string> {
    const params: Record<string, unknown> = {
      format: 'png',
      quality: 100,
    }

    if (options.fullPage) {
      params.captureBeyondViewport = true
    }

    if (options.clip) {
      params.clip = options.clip
    }

    const result = await this.cdp.send<{ data: string }>('Page.captureScreenshot', params)
    return result.data
  }

  private async getElementBounds(
    selector: string
  ): Promise<{ x: number; y: number; width: number; height: number; scale: number } | null> {
    const result = await this.cdp.send<{
      result: { value: { x: number; y: number; width: number; height: number } | null }
    }>('Runtime.evaluate', {
      expression: `
        (() => {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        })()
      `,
      returnByValue: true,
    })

    if (!result.result.value) return null

    return { ...result.result.value, scale: 1 }
  }

  private saveScreenshot(filename: string, base64Data: string): string {
    const filepath = path.join(this.outputDir, filename)
    fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'))
    return filepath
  }

  private sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50)
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
    }
  }
}
