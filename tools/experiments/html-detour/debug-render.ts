/**
 * Debug-Helper: lädt einen einzelnen Mirror-File im Headless-Chrome
 * und dumpt alle Elemente mit Bounding-Rect + Computed-Style-Auszug.
 *
 * Usage: npx tsx debug-render.ts <relative-or-absolute-mir-path>
 */
import { launchChrome } from '../../test-runner/chrome'
import { connectCDP, getPageTarget } from '../../test-runner/cdp'

const file = process.argv[2]
if (!file) {
  console.error('Usage: debug-render.ts <mir-file>')
  process.exit(1)
}

const SERVER = 'http://localhost:5173'
const url = `${SERVER}/tools/experiments/html-detour/render/viewer?file=/${encodeURI(file)}`

;(async () => {
  const chrome = await launchChrome({ headless: true })
  const port = new URL(chrome.wsEndpoint).port
  const pageWs = await getPageTarget(parseInt(port))
  const cdp = await connectCDP(pageWs)

  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  })

  await cdp.send('Page.navigate', { url })
  await new Promise(r => setTimeout(r, 2500))

  const result: any = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const root = document.querySelector('[data-mirror-root]') || document.getElementById('app');
      const lines = [];
      function walk(el, depth) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const tag = el.tagName.toLowerCase();
        const cls = (el.className || '').toString().slice(0, 30);
        const dataMirror = el.dataset.mirrorName || el.dataset.mirrorId || '';
        const text = (el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild.textContent : '').trim().slice(0, 30);
        const sizing = \`\${Math.round(r.width)}×\${Math.round(r.height)}\`;
        const cssDims = \`\${cs.width}/\${cs.height}\`;
        const display = cs.display;
        const position = cs.position;
        const flex = cs.flex !== '0 1 auto' ? cs.flex : '';
        lines.push(\`\${'  '.repeat(depth)}\${tag} [\${dataMirror}] \${sizing} (css \${cssDims}) display:\${display} pos:\${position} \${flex} \${text ? '"' + text + '"' : ''}\`);
        for (const c of el.children) walk(c, depth + 1);
      }
      walk(root, 0);
      return lines.join('\\n');
    })()`,
    returnByValue: true,
  })

  console.log(result.result?.value || 'no result')

  chrome.kill()
})().catch(e => {
  console.error(e)
  process.exit(1)
})
