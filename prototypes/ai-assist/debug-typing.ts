/**
 * Debug Typing - Mit Screenshots
 */

import { launchChrome } from '../../tools/test-runner/chrome'
import { connectCDP, getPageTarget } from '../../tools/test-runner/cdp'
import * as fs from 'fs'

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function extractPortFromWsUrl(wsUrl: string): number {
  const match = wsUrl.match(/:(\d+)\//)
  if (!match) throw new Error('Could not extract port from: ' + wsUrl)
  return parseInt(match[1], 10)
}

async function takeScreenshot(cdp: any, filename: string): Promise<void> {
  const result = await cdp.send('Page.captureScreenshot', { format: 'png' })
  const buffer = Buffer.from(result.data, 'base64')
  fs.writeFileSync(filename, buffer)
  console.log(`📸 Screenshot: ${filename}`)
}

async function main() {
  console.log('=== Debug Typing ===\n')

  // Launch Chrome
  console.log('1. Starte Chrome...')
  const chrome = await launchChrome({
    headless: false,
    args: ['--window-size=1200,800', '--window-position=100,100'],
  })
  const debugPort = extractPortFromWsUrl(chrome.wsEndpoint)

  // Create page
  const browserCdp = await connectCDP(chrome.wsEndpoint)
  await browserCdp.send('Target.createTarget', {
    url: 'http://localhost:8765/variants/inline-diff.html',
  })
  await sleep(2000)

  // Connect to page
  const pageWsUrl = await getPageTarget(debugPort)
  const cdp = await connectCDP(pageWsUrl)
  await cdp.send('Runtime.enable')
  await cdp.send('Page.enable')

  console.log('2. Seite geladen')
  await sleep(1000)

  // Screenshot 1: Initial state
  await takeScreenshot(cdp, '/tmp/debug-1-initial.png')

  // Click editor
  console.log('3. Klicke auf Editor...')
  await cdp.send('Runtime.evaluate', {
    expression: `
      const editor = document.getElementById('editor');
      editor.click();
      editor.focus();
      'clicked'
    `,
  })
  await sleep(500)
  await takeScreenshot(cdp, '/tmp/debug-2-after-click.png')

  // Try typing with execCommand
  console.log('4. Versuche execCommand...')
  const result1 = await cdp.send('Runtime.evaluate', {
    expression: `
      const editor = document.getElementById('editor');
      const success = document.execCommand('insertText', false, 'TEST');
      'execCommand returned: ' + success + ', content: ' + editor.innerText
    `,
  })
  console.log('   Result:', result1.result?.value)
  await takeScreenshot(cdp, '/tmp/debug-3-after-execCommand.png')

  // Try direct innerHTML
  console.log('5. Versuche innerHTML...')
  await cdp.send('Runtime.evaluate', {
    expression: `
      const editor = document.getElementById('editor');
      editor.innerHTML = 'DIRECT TEXT';
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      'set innerHTML'
    `,
  })
  await sleep(500)
  await takeScreenshot(cdp, '/tmp/debug-4-after-innerHTML.png')

  // Try CDP Input.insertText
  console.log('6. Versuche CDP Input.insertText...')
  await cdp.send('Runtime.evaluate', {
    expression: `document.getElementById('editor').focus()`,
  })
  await cdp.send('Runtime.evaluate', {
    expression: `
      const editor = document.getElementById('editor');
      editor.innerHTML = '';
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    `,
  })

  try {
    await cdp.send('Input.insertText', { text: 'CDP INPUT' })
    console.log('   Input.insertText succeeded')
  } catch (e: any) {
    console.log('   Input.insertText failed:', e.message)
  }
  await takeScreenshot(cdp, '/tmp/debug-5-after-cdp-input.png')

  // Try dispatchEvent with KeyboardEvent
  console.log('7. Versuche KeyboardEvent...')
  await cdp.send('Runtime.evaluate', {
    expression: `
      const editor = document.getElementById('editor');
      editor.innerHTML = '';
      editor.focus();

      // Type 'A'
      const keyDown = new KeyboardEvent('keydown', { key: 'A', code: 'KeyA', bubbles: true });
      const keyPress = new KeyboardEvent('keypress', { key: 'A', code: 'KeyA', bubbles: true });
      const keyUp = new KeyboardEvent('keyup', { key: 'A', code: 'KeyA', bubbles: true });

      editor.dispatchEvent(keyDown);
      editor.dispatchEvent(keyPress);
      editor.dispatchEvent(keyUp);

      'dispatched keyboard events, content: ' + editor.innerText
    `,
  })
  await takeScreenshot(cdp, '/tmp/debug-6-after-keyboard.png')

  // Final state
  const content = await cdp.send('Runtime.evaluate', {
    expression: `document.getElementById('editor')?.innerText || 'EMPTY'`,
  })
  console.log('\n8. Editor Inhalt:', content.result?.value)

  console.log('\n✅ Screenshots in /tmp/debug-*.png')
  console.log('\nBrowser bleibt 15s offen...')
  await sleep(15000)

  await chrome.kill()
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
