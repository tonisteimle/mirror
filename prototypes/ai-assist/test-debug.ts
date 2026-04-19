import { launchChrome } from '../../tools/test-runner/chrome'
import { connectCDP, getPageTarget } from '../../tools/test-runner/cdp'
import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const extractPort = (ws: string) => parseInt(ws.match(/:(\d+)\//)?.[1] || '0')

// File server
const fileServer = http
  .createServer((req, res) => {
    const filePath = path.join(__dirname, req.url || '/')
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404)
        res.end('Not found: ' + req.url)
        return
      }
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(data)
    })
  })
  .listen(8765)

// Mock AI
const aiServer = http
  .createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }
    let body = ''
    req.on('data', c => (body += c))
    req.on('end', () => {
      const { code } = JSON.parse(body)
      let validated = code.trim()
      if (validated.includes('bg #') && !validated.includes('col ')) {
        validated = validated + ', col white'
      }
      if (!validated.includes('rad ')) {
        validated = validated + ', rad 8'
      }
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, code: validated }))
      }, 200)
    })
  })
  .listen(3456)

async function main() {
  console.log('Starting...')

  const chrome = await launchChrome({ headless: false })
  const browserCdp = await connectCDP(chrome.wsEndpoint)
  await browserCdp.send('Target.createTarget', {
    url: 'http://localhost:8765/variants/codemirror-poc.html',
  })
  await sleep(2000)

  const pageWsUrl = await getPageTarget(extractPort(chrome.wsEndpoint))
  const cdp = await connectCDP(pageWsUrl)
  await cdp.send('Runtime.enable')
  await cdp.send('Page.enable')

  console.log('\n=== Step 1: Type and wait for validation ===')
  await cdp.send('Input.insertText', { text: 'Frame bg #1a1a1a' })
  await sleep(2500)

  console.log('\n=== Step 2: Type second line ===')
  await cdp.send('Input.insertText', { text: '\n  Text "Hello"' })
  await sleep(500)

  // Check DOM for draft-line class
  const result = await cdp.send('Runtime.evaluate', {
    expression: `
      const lines = document.querySelectorAll('.cm-line');
      Array.from(lines).map((line, i) => ({
        line: i + 1,
        text: line.textContent.substring(0, 30),
        hasDraftClass: line.classList.contains('draft-line'),
        classes: line.className
      }))
    `,
    returnByValue: true,
  })

  console.log('\n=== DOM Check ===')
  console.log(JSON.stringify(result.result.value, null, 2))

  // Screenshot
  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('/tmp/cm-debug.png', Buffer.from(screenshot.data, 'base64'))
  console.log('\nScreenshot: /tmp/cm-debug.png')

  await sleep(3000)
  await chrome.kill()
  fileServer.close()
  aiServer.close()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
