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
  /** "WxH" — overrides default sizing (1920x1080 headless, maximized headed). */
  windowSize?: string
}

export async function launchChrome(options: LaunchOptions = {}): Promise<ChromeInstance> {
  const chromePath = findChromePath()
  const userDataDir = options.userDataDir || createTempDir()

  // Seed Chrome Preferences to fully disable the translate bubble. The
  // command-line flags `--disable-features=Translate,…` aren't enough on
  // macOS: Chrome still shows the bubble for English content when the
  // accept-lang differs. Writing translate.enabled=false at user-data-dir
  // creation time stops that bubble cold.
  seedNoTranslatePreferences(userDataDir)

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

function seedNoTranslatePreferences(userDataDir: string): void {
  const profileDir = path.join(userDataDir, 'Default')
  fs.mkdirSync(profileDir, { recursive: true })
  const prefs = {
    translate: { enabled: false },
    translate_blocked_languages: ['en', 'de', 'fr', 'es', 'it'],
    translate_site_blacklist: [],
    intl: { accept_languages: 'en-US,en', selected_languages: 'en-US,en' },
    profile: { default_content_setting_values: { popups: 1 } },
  }
  try {
    fs.writeFileSync(path.join(profileDir, 'Preferences'), JSON.stringify(prefs))
  } catch {
    // Best-effort; if this fails the flag-based suppression is still in place.
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
    // Aggressively kill the translate infobar; the German accept-lang
    // combined with English UI text used to trigger Chrome's
    // "Translate this page?" omnibox bubble in tutorial recordings.
    '--disable-features=Translate,TranslateUI,TranslateSubFrames,LanguageDetectionAPI',
    '--lang=en-US',
    '--accept-lang=en-US,en',
    '--metrics-recording-only',
    '--safebrowsing-disable-auto-update',
    '--disable-extensions',
    '--disable-popup-blocking',
    '--disable-infobars',
    '--disable-notifications',
  ]

  // Window-size override applies in BOTH headed and headless. When set,
  // it suppresses the default `--start-maximized` / `--window-size=1920,1080`
  // so tutorial recordings get a predictable, frame-able viewport.
  if (options.windowSize) {
    const [w, h] = options.windowSize.split('x').map(s => s.trim())
    if (options.headless !== false) {
      args.push('--headless=new')
    }
    args.push(`--window-size=${w},${h}`)
    args.push(`--window-position=0,0`)
  } else if (options.headless !== false) {
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

  // When `--window-size` is set we treat the run as a tutorial-recording
  // launch and strip Chrome's UI (omnibox, tabs, translate bubble) by
  // booting straight into app-mode. The runtime still navigates the
  // target to studio via CDP, so `about:blank` is fine as the seed page.
  if (options.windowSize) {
    args.push('--app=about:blank')
  } else {
    args.push('about:blank')
  }

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
