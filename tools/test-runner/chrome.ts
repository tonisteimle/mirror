/**
 * Chrome Launcher
 *
 * Handles Chrome process lifecycle.
 * Single responsibility: launch and manage Chrome.
 */

import { spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { ChromeInstance } from './types'

// =============================================================================
// Chrome Path Discovery
// =============================================================================

const CHROME_PATHS: Record<string, string[]> = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  ],
  linux: ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium'],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ],
}

function findChromePath(): string {
  const platform = os.platform()
  const candidates = CHROME_PATHS[platform] || []

  for (const chromePath of candidates) {
    if (fs.existsSync(chromePath)) {
      return chromePath
    }
  }

  throw new Error(`Chrome not found. Searched:\n${candidates.map(p => `  - ${p}`).join('\n')}`)
}

// =============================================================================
// Chrome Launcher
// =============================================================================

export interface LaunchOptions {
  headless?: boolean
  userDataDir?: string
  args?: string[]
}

export async function launchChrome(options: LaunchOptions = {}): Promise<ChromeInstance> {
  const chromePath = findChromePath()
  const userDataDir = options.userDataDir || createTempDir()

  const args = buildChromeArgs(userDataDir, options)
  const process = spawn(chromePath, args, { stdio: ['pipe', 'pipe', 'pipe'] })

  const wsEndpoint = await waitForDevToolsEndpoint(process)

  return {
    wsEndpoint,
    kill: () => {
      process.kill()
      cleanupTempDir(userDataDir)
    },
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-test-'))
}

function cleanupTempDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true })
  } catch {
    // Ignore cleanup errors
  }
}

function buildChromeArgs(userDataDir: string, options: LaunchOptions): string[] {
  const args = [
    `--user-data-dir=${userDataDir}`,
    '--remote-debugging-port=0',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-translate',
    '--disable-features=Translate,TranslateUI',
    '--lang=de-DE',
    '--accept-lang=de-DE,de',
    '--metrics-recording-only',
    '--safebrowsing-disable-auto-update',
    '--disable-extensions',
    '--disable-popup-blocking',
    '--disable-infobars',
    '--disable-notifications',
  ]

  if (options.headless !== false) {
    args.push('--headless=new')
    // Large viewport for headless mode (similar to maximized)
    args.push('--window-size=1920,1080')
  } else {
    // In headed mode, start maximized for better visibility
    args.push('--start-maximized')
  }

  if (options.args) {
    args.push(...options.args)
  }

  args.push('about:blank')

  return args
}

function waitForDevToolsEndpoint(process: ChildProcess): Promise<string> {
  return new Promise((resolve, reject) => {
    const TIMEOUT_MS = 30000
    const timeout = setTimeout(() => {
      reject(new Error('Chrome launch timeout'))
    }, TIMEOUT_MS)

    const handleStderr = (data: Buffer) => {
      const output = data.toString()
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/)
      if (match) {
        clearTimeout(timeout)
        resolve(match[1])
      }
    }

    const handleError = (err: Error) => {
      clearTimeout(timeout)
      reject(err)
    }

    const handleExit = (code: number | null) => {
      clearTimeout(timeout)
      reject(new Error(`Chrome exited with code ${code}`))
    }

    process.stderr?.on('data', handleStderr)
    process.on('error', handleError)
    process.on('exit', handleExit)
  })
}
