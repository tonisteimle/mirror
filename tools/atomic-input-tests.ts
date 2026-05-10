#!/usr/bin/env tsx
/**
 * Atomic CDP Input Tests
 *
 * Tiny end-to-end checks that prove the CDP `Input.*` pipeline really
 * delivers trusted user input to the page. No fake cursors, no fake
 * highlights — just: dispatch a primitive, observe what the DOM did.
 *
 * Run:
 *   npx tsx tools/atomic-input-tests.ts            # headless
 *   npx tsx tools/atomic-input-tests.ts --headed   # see Chrome
 *   npx tsx tools/atomic-input-tests.ts --studio   # also studio tests (5,6)
 *
 * Each test owns its DOM fixture (about:blank + scripted innerHTML) and
 * asserts directly on observable state — listener fired? value updated?
 * isTrusted? — instead of relying on screenshots or synthetic overlays.
 */
import { launchChrome } from './test-runner/chrome'
import { connectCDP, getPageTarget } from './test-runner/cdp'
import { installCdpInputBridge } from './test-runner/cdp-input-bridge'
import type { CDPSession } from './test-runner/types'

// =============================================================================
// Tiny test framework — no deps
// =============================================================================

interface AtomicResult {
  name: string
  ok: boolean
  details: string
  durationMs: number
}

async function runTest(
  name: string,
  body: () => Promise<{ ok: boolean; details: string }>
): Promise<AtomicResult> {
  const start = Date.now()
  try {
    const r = await body()
    return { name, ok: r.ok, details: r.details, durationMs: Date.now() - start }
  } catch (e) {
    return {
      name,
      ok: false,
      details: `threw: ${e instanceof Error ? e.message : String(e)}`,
      durationMs: Date.now() - start,
    }
  }
}

// =============================================================================
// CDP plumbing helpers
// =============================================================================

async function evaluate<T>(cdp: CDPSession, expression: string): Promise<T> {
  const result = await cdp.send<{
    result: { value: T }
    exceptionDetails?: { text: string; exception?: { description?: string } }
  }>('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
  }
  return result.result.value
}

async function navigate(cdp: CDPSession, url: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const onLoad = () => {
      cdp.off('Page.loadEventFired', onLoad)
      resolve()
    }
    cdp.on('Page.loadEventFired', onLoad)
    cdp.send('Page.navigate', { url }).then(
      () => {
        // Belt-and-braces: data:/about:blank loads can race the listener.
        setTimeout(() => {
          cdp.off('Page.loadEventFired', onLoad)
          resolve()
        }, 1500)
      },
      e => reject(e)
    )
  })
}

async function setupBlankPage(cdp: CDPSession, html: string): Promise<void> {
  await navigate(cdp, 'about:blank')
  // Inject the fixture HTML + a tiny event-recording sink we read back later.
  await evaluate(
    cdp,
    `(() => {
      document.documentElement.innerHTML = ${JSON.stringify(`<head><meta charset="utf-8"></head><body style="margin:0">${html}</body>`)};
      window.__events = [];
      window.__rec = (label, ev) => {
        window.__events.push({
          label,
          type: ev.type,
          isTrusted: ev.isTrusted,
          target: ev.target instanceof Element ? ev.target.id || ev.target.tagName : null,
          x: 'clientX' in ev ? ev.clientX : null,
          y: 'clientY' in ev ? ev.clientY : null,
          key: 'key' in ev ? ev.key : null,
          value: ev.target && 'value' in ev.target ? ev.target.value : null,
        });
      };
    })()`
  )
}

async function getRect(
  cdp: CDPSession,
  selector: string
): Promise<{ x: number; y: number; w: number; h: number }> {
  return evaluate(
    cdp,
    `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) throw new Error('selector not found: ${selector}');
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    })()`
  )
}

function center(r: { x: number; y: number; w: number; h: number }): { x: number; y: number } {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 }
}

async function dispatch(
  cdp: CDPSession,
  type: 'mousePressed' | 'mouseReleased' | 'mouseMoved',
  x: number,
  y: number,
  opts: { buttons?: number; clickCount?: number } = {}
): Promise<void> {
  await cdp.send('Input.dispatchMouseEvent', {
    type,
    x,
    y,
    button: type === 'mouseMoved' && (opts.buttons ?? 0) === 0 ? 'none' : 'left',
    buttons: opts.buttons ?? (type === 'mouseMoved' ? 0 : 1),
    clickCount: opts.clickCount ?? (type === 'mouseMoved' ? 0 : 1),
  })
}

// =============================================================================
// Atomic tests 1-4 (about:blank fixtures)
// =============================================================================

async function test1_click(cdp: CDPSession): Promise<{ ok: boolean; details: string }> {
  await setupBlankPage(
    cdp,
    `<button id="b" style="position:absolute;left:80px;top:60px;width:120px;height:40px">Click</button>`
  )
  await evaluate(
    cdp,
    `document.getElementById('b').addEventListener('click', e => __rec('click', e))`
  )
  const r = await getRect(cdp, '#b')
  const c = center(r)
  await dispatch(cdp, 'mousePressed', c.x, c.y)
  await dispatch(cdp, 'mouseReleased', c.x, c.y)

  const events = await evaluate<
    Array<{ label: string; type: string; isTrusted: boolean; target: string | null }>
  >(cdp, `window.__events`)
  const hit = events.find(e => e.label === 'click')
  if (!hit) return { ok: false, details: `no click event fired (got ${events.length} events)` }
  if (!hit.isTrusted) return { ok: false, details: `click fired but isTrusted=false` }
  if (hit.target !== 'b') return { ok: false, details: `click target=${hit.target}, expected 'b'` }
  return { ok: true, details: `click@(${c.x.toFixed(0)},${c.y.toFixed(0)}) → #b, isTrusted=true` }
}

async function test2_mouseMove(cdp: CDPSession): Promise<{ ok: boolean; details: string }> {
  await setupBlankPage(
    cdp,
    `<div id="d" style="position:absolute;left:50px;top:50px;width:200px;height:100px;background:#eee"></div>`
  )
  await evaluate(
    cdp,
    `(() => {
       const d = document.getElementById('d');
       d.addEventListener('mouseenter', e => __rec('enter', e));
       d.addEventListener('mousemove', e => __rec('move', e));
     })()`
  )
  // Park outside, then sweep across.
  await dispatch(cdp, 'mouseMoved', 5, 5)
  const r = await getRect(cdp, '#d')
  const steps = 6
  for (let i = 1; i <= steps; i++) {
    const x = r.x + (r.w * i) / steps - r.w / steps / 2
    const y = r.y + r.h / 2
    await dispatch(cdp, 'mouseMoved', x, y)
  }

  const events = await evaluate<Array<{ label: string; isTrusted: boolean }>>(
    cdp,
    `window.__events`
  )
  const enter = events.find(e => e.label === 'enter')
  const moves = events.filter(e => e.label === 'move')
  if (!enter) return { ok: false, details: `mouseenter never fired` }
  if (!enter.isTrusted) return { ok: false, details: `mouseenter isTrusted=false` }
  if (moves.length === 0) return { ok: false, details: `no mousemove events` }
  return {
    ok: true,
    details: `mouseenter (trusted) + ${moves.length} mousemove events`,
  }
}

async function test3_typing(cdp: CDPSession): Promise<{ ok: boolean; details: string }> {
  await setupBlankPage(
    cdp,
    `<input id="i" style="position:absolute;left:40px;top:40px;width:200px;height:30px;font:14px sans">`
  )
  await evaluate(
    cdp,
    `(() => {
       const i = document.getElementById('i');
       i.addEventListener('input', e => __rec('input', e));
       i.addEventListener('focus', e => __rec('focus', e));
     })()`
  )
  // Click to focus.
  const r = await getRect(cdp, '#i')
  const c = center(r)
  await dispatch(cdp, 'mousePressed', c.x, c.y)
  await dispatch(cdp, 'mouseReleased', c.x, c.y)

  const text = 'hello'
  for (const ch of text) {
    await cdp.send('Input.insertText', { text: ch })
  }

  const value = await evaluate<string>(cdp, `document.getElementById('i').value`)
  const events = await evaluate<Array<{ label: string; isTrusted: boolean; value: string | null }>>(
    cdp,
    `window.__events`
  )
  const focused = events.some(e => e.label === 'focus')
  const inputs = events.filter(e => e.label === 'input')
  const activeIsInput = await evaluate<boolean>(
    cdp,
    `document.activeElement && document.activeElement.id === 'i'`
  )

  if (!focused) return { ok: false, details: `focus event never fired` }
  if (!activeIsInput) return { ok: false, details: `document.activeElement is not #i` }
  if (value !== text) return { ok: false, details: `input.value = "${value}", expected "${text}"` }
  if (inputs.length !== text.length)
    return {
      ok: false,
      details: `${inputs.length} input events, expected ${text.length}`,
    }
  return { ok: true, details: `value="${value}" via ${inputs.length} input events, focused=true` }
}

async function test4_html5Drag(cdp: CDPSession): Promise<{ ok: boolean; details: string }> {
  await setupBlankPage(
    cdp,
    `<div id="src" draggable="true" style="position:absolute;left:30px;top:30px;width:80px;height:60px;background:#bdf">SRC</div>
     <div id="dst" style="position:absolute;left:300px;top:200px;width:160px;height:120px;background:#fbd"></div>`
  )
  await evaluate(
    cdp,
    `(() => {
       const src = document.getElementById('src');
       const dst = document.getElementById('dst');
       src.addEventListener('dragstart', e => {
         e.dataTransfer.setData('text/plain', 'payload');
         __rec('dragstart', e);
       });
       dst.addEventListener('dragenter', e => { e.preventDefault(); __rec('dragenter', e); });
       dst.addEventListener('dragover', e => { e.preventDefault(); __rec('dragover', e); });
       dst.addEventListener('drop', e => {
         e.preventDefault();
         const data = e.dataTransfer.getData('text/plain');
         window.__droppedPayload = data;
         __rec('drop', e);
       });
     })()`
  )
  const sr = await getRect(cdp, '#src')
  const dr = await getRect(cdp, '#dst')
  const sc = center(sr)
  const dc = center(dr)

  // Native HTML5 drag needs a real press, an initial move (Chrome only
  // arms dragstart after the cursor leaves a small slop), and the
  // buttons=1 mask carried through every move.
  await dispatch(cdp, 'mousePressed', sc.x, sc.y)
  await dispatch(cdp, 'mouseMoved', sc.x + 12, sc.y + 12, { buttons: 1 })
  await new Promise(r => setTimeout(r, 30))

  const steps = 12
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const x = sc.x + (dc.x - sc.x) * t
    const y = sc.y + (dc.y - sc.y) * t
    await dispatch(cdp, 'mouseMoved', x, y, { buttons: 1 })
    await new Promise(r => setTimeout(r, 12))
  }
  await new Promise(r => setTimeout(r, 60))
  await dispatch(cdp, 'mouseReleased', dc.x, dc.y)

  await new Promise(r => setTimeout(r, 80))
  const events = await evaluate<Array<{ label: string }>>(cdp, `window.__events`)
  const labels = events.map(e => e.label)
  const dragstart = labels.includes('dragstart')
  const dragenter = labels.includes('dragenter')
  const dragover = labels.includes('dragover')
  const drop = labels.includes('drop')
  const payload = await evaluate<string | undefined>(cdp, `window.__droppedPayload`)

  if (!dragstart)
    return { ok: false, details: `dragstart never fired (events: ${labels.join(',')})` }
  if (!dragenter)
    return { ok: false, details: `dragenter never fired (events: ${labels.join(',')})` }
  if (!dragover) return { ok: false, details: `dragover never fired (events: ${labels.join(',')})` }
  if (!drop) return { ok: false, details: `drop never fired (events: ${labels.join(',')})` }
  if (payload !== 'payload') return { ok: false, details: `drop fired but payload="${payload}"` }
  return {
    ok: true,
    details: `dragstart→dragenter→dragover×N→drop, payload="${payload}"`,
  }
}

// =============================================================================
// Studio-aware tests (5, 6) — only if --studio
// =============================================================================

async function ensureStudioReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'GET' })
    return res.ok
  } catch {
    return false
  }
}

async function navigateAndWaitForStudio(cdp: CDPSession, url: string): Promise<void> {
  await navigate(cdp, url)
  // Wait for the *real* studio runtime — `__mirrorStudio__` is set by
  // bootstrap unconditionally; `__mirrorTest` only when the test bundle
  // also loads, which the user-facing studio doesn't ship by default.
  const start = Date.now()
  while (Date.now() - start < 30000) {
    const ready = await evaluate<boolean>(
      cdp,
      `typeof window.__mirrorStudio__ !== 'undefined'`
    ).catch(() => false)
    if (ready) return
    await new Promise(r => setTimeout(r, 200))
  }
  throw new Error('studio __mirrorStudio__ did not appear within 30s')
}

// Studio exposes the CodeMirror EditorView as `window.editor` (studio/app.ts:2418).
async function setStudioCode(cdp: CDPSession, code: string): Promise<void> {
  await evaluate(
    cdp,
    `(async () => {
       const view = window.editor;
       if (!view || !view.dispatch) throw new Error('window.editor not available');
       view.dispatch({
         changes: { from: 0, to: view.state.doc.length, insert: ${JSON.stringify(code)} },
       });
     })()`
  )
  await new Promise(r => setTimeout(r, 400))
}

async function getStudioCode(cdp: CDPSession): Promise<string> {
  return evaluate<string>(cdp, `(() => window.editor?.state?.doc?.toString() ?? '')()`)
}

async function getSelectedNodeId(cdp: CDPSession): Promise<string | null> {
  return evaluate<string | null>(
    cdp,
    `(() => {
       const s = window.__mirrorStudio__?.state;
       const v = s?.get?.() ?? s;
       return v?.selectedNodeId ?? v?.selection?.nodeId ?? null;
     })()`
  )
}

async function test5_studioSelect(cdp: CDPSession): Promise<{ ok: boolean; details: string }> {
  await setStudioCode(cdp, 'Frame bg #2271C1, w 200, h 120')
  // Find the rendered preview Frame's bbox.
  const rect = await evaluate<{ x: number; y: number; w: number; h: number } | null>(
    cdp,
    `(() => {
       const el = document.querySelector('#preview [data-mirror-id]');
       if (!el) return null;
       const r = el.getBoundingClientRect();
       return { x: r.x, y: r.y, w: r.width, h: r.height };
     })()`
  )
  if (!rect) return { ok: false, details: 'no element with [data-mirror-id] in #preview' }
  const c = center(rect)
  await dispatch(cdp, 'mousePressed', c.x, c.y)
  await dispatch(cdp, 'mouseReleased', c.x, c.y)
  await new Promise(r => setTimeout(r, 200))
  const sel = await getSelectedNodeId(cdp)
  if (!sel) return { ok: false, details: 'no selectedNodeId after click' }
  return { ok: true, details: `selectedNodeId=${sel}` }
}

async function test6_studioPaletteDrop(cdp: CDPSession): Promise<{ ok: boolean; details: string }> {
  await setStudioCode(cdp, '')
  // Find palette Frame item and preview canvas.
  const palette = await evaluate<{ x: number; y: number; w: number; h: number } | null>(
    cdp,
    `(() => {
       const items = Array.from(document.querySelectorAll('.component-panel-item'));
       // Palette IDs are namespaced: "comp-frame", "layout-row", etc.
       // Match by exact id first, then by visible name.
       const el = items.find(e => e.dataset?.id === 'comp-frame')
                || items.find(e => /^Frame$/i.test((e.textContent || '').trim()));
       if (!el) return null;
       const r = el.getBoundingClientRect();
       return { x: r.x, y: r.y, w: r.width, h: r.height };
     })()`
  )
  if (!palette) return { ok: false, details: 'no palette Frame item found' }
  const preview = await evaluate<{ x: number; y: number; w: number; h: number } | null>(
    cdp,
    `(() => {
       const p = document.querySelector('#preview');
       if (!p) return null;
       const r = p.getBoundingClientRect();
       return { x: r.x, y: r.y, w: r.width, h: r.height };
     })()`
  )
  if (!preview) return { ok: false, details: '#preview not found' }
  const sc = center(palette)
  const dc = center(preview)

  await dispatch(cdp, 'mousePressed', sc.x, sc.y)
  await dispatch(cdp, 'mouseMoved', sc.x + 10, sc.y + 10, { buttons: 1 })
  await new Promise(r => setTimeout(r, 30))
  const steps = 14
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    await dispatch(cdp, 'mouseMoved', sc.x + (dc.x - sc.x) * t, sc.y + (dc.y - sc.y) * t, {
      buttons: 1,
    })
    await new Promise(r => setTimeout(r, 14))
  }
  await new Promise(r => setTimeout(r, 80))
  await dispatch(cdp, 'mouseReleased', dc.x, dc.y)
  await new Promise(r => setTimeout(r, 400))

  const code = await getStudioCode(cdp)
  if (!/Frame/.test(code))
    return {
      ok: false,
      details: `editor code does not contain Frame: ${JSON.stringify(code).slice(0, 80)}`,
    }
  return { ok: true, details: `editor code now contains Frame (${code.length} chars)` }
}

async function test7_propertyEditor(cdp: CDPSession): Promise<{ ok: boolean; details: string }> {
  // Start with a Frame that has a width, click it to select, then edit
  // the `width` input in the property panel and verify the editor source
  // reflects the change. (We use `width` because it's a real text input;
  // `bg` is a color-swatch trigger, not a typeable field.)
  await setStudioCode(cdp, 'Frame bg #2271C1, w 200, h 120')
  await new Promise(r => setTimeout(r, 250))
  // The preview wraps the Frame in a canvas/root container that ALSO
  // has [data-mirror-id]. Pick the deepest (last) match so we click
  // the user's Frame, not the wrapper.
  const previewRect = await evaluate<{ x: number; y: number; w: number; h: number } | null>(
    cdp,
    `(() => {
       const els = Array.from(document.querySelectorAll('#preview [data-mirror-id]'));
       if (els.length === 0) return null;
       const el = els[els.length - 1];
       const r = el.getBoundingClientRect();
       return { x: r.x, y: r.y, w: r.width, h: r.height };
     })()`
  )
  if (!previewRect) return { ok: false, details: 'preview Frame not rendered' }
  const c = center(previewRect)
  await dispatch(cdp, 'mousePressed', c.x, c.y)
  await dispatch(cdp, 'mouseReleased', c.x, c.y)
  await new Promise(r => setTimeout(r, 300))

  // Wait for the property panel to render the width input (async after selection).
  let wRect: { x: number; y: number; w: number; h: number } | null = null
  for (let attempt = 0; attempt < 20; attempt++) {
    wRect = await evaluate<{ x: number; y: number; w: number; h: number } | null>(
      cdp,
      `(() => {
         const el = document.querySelector('#property-panel input[data-prop="width"]');
         if (!el || el.offsetParent === null) return null;
         const r = el.getBoundingClientRect();
         return { x: r.x, y: r.y, w: r.width, h: r.height };
       })()`
    )
    if (wRect) break
    await new Promise(r => setTimeout(r, 100))
  }
  if (!wRect) return { ok: false, details: 'property-panel width input did not appear within 2s' }

  const ic = center(wRect)
  // Click → focus.
  await dispatch(cdp, 'mousePressed', ic.x, ic.y)
  await dispatch(cdp, 'mouseReleased', ic.x, ic.y)
  await new Promise(r => setTimeout(r, 100))

  // Select all text in the focused input. `el.select()` is a state
  // mutation, not a synthetic event — `Input.insertText` will then
  // replace the selected range exactly like real OS typing does.
  await evaluate(
    cdp,
    `(() => {
       const el = document.activeElement;
       if (el && 'select' in el) el.select();
     })()`
  )
  await cdp.send('Input.insertText', { text: '321' })
  // Commit by blurring (Tab leaves the input → triggers final compile).
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab' })
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab' })
  await new Promise(r => setTimeout(r, 500))

  const code = await getStudioCode(cdp)
  if (!/\bw\s*321\b|width\s*321/.test(code))
    return {
      ok: false,
      details: `editor source missing w 321: ${JSON.stringify(code).slice(0, 120)}`,
    }
  return {
    ok: true,
    details: `width edited via panel → editor: ${JSON.stringify(code).slice(0, 80)}`,
  }
}

async function test8_codeEditor(cdp: CDPSession): Promise<{ ok: boolean; details: string }> {
  // Click into CodeMirror, type Mirror code, verify view.state.doc reflects it.
  await setStudioCode(cdp, '')
  const cmRect = await evaluate<{ x: number; y: number; w: number; h: number } | null>(
    cdp,
    `(() => {
       const el = document.querySelector('.cm-editor .cm-content') || document.querySelector('.cm-editor');
       if (!el) return null;
       const r = el.getBoundingClientRect();
       return { x: r.x, y: r.y, w: r.width, h: r.height };
     })()`
  )
  if (!cmRect) return { ok: false, details: '.cm-editor not found' }
  // Click near the top-left of the editor surface.
  const fx = cmRect.x + 8
  const fy = cmRect.y + 12
  await dispatch(cdp, 'mousePressed', fx, fy)
  await dispatch(cdp, 'mouseReleased', fx, fy)
  await new Promise(r => setTimeout(r, 80))

  // Type a snippet.
  const snippet = 'Frame bg #112233'
  await cdp.send('Input.insertText', { text: snippet })
  await new Promise(r => setTimeout(r, 250))

  const code = await getStudioCode(cdp)
  if (!code.includes(snippet))
    return {
      ok: false,
      details: `CodeMirror doc missing snippet: ${JSON.stringify(code).slice(0, 100)}`,
    }
  return { ok: true, details: `typed "${snippet}" into CodeMirror` }
}

// =============================================================================
// Driver
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const headed = args.includes('--headed')
  const includeStudio = args.includes('--studio')
  const studioUrl = 'http://localhost:5173/studio/'

  if (includeStudio) {
    const ok = await ensureStudioReachable(studioUrl)
    if (!ok) {
      console.error(`✗ studio not reachable at ${studioUrl} — start with 'npm run studio'`)
      process.exit(2)
    }
  }

  console.log(
    `Atomic input tests (headed=${headed}, studio=${includeStudio})\n` +
      `─────────────────────────────────────────────────────────`
  )

  const chrome = await launchChrome({ headless: !headed })
  let cdp: CDPSession | undefined
  const results: AtomicResult[] = []
  try {
    const port = new URL(chrome.wsEndpoint).port
    const wsUrl = await getPageTarget(parseInt(port))
    cdp = await connectCDP(wsUrl)
    await cdp.send('Runtime.enable')
    await cdp.send('Page.enable')
    await installCdpInputBridge(cdp)

    results.push(await runTest('1. mouse click hits coordinate', () => test1_click(cdp!)))
    results.push(await runTest('2. mouse move triggers mouseenter', () => test2_mouseMove(cdp!)))
    results.push(await runTest('3. typing into focused input', () => test3_typing(cdp!)))
    results.push(await runTest('4. native HTML5 drag', () => test4_html5Drag(cdp!)))

    if (includeStudio) {
      await navigateAndWaitForStudio(cdp, studioUrl)
      results.push(
        await runTest('5. studio click selects mirror node', () => test5_studioSelect(cdp!))
      )
      results.push(
        await runTest('6. studio palette → preview drop', () => test6_studioPaletteDrop(cdp!))
      )
      results.push(await runTest('7. property editor input edit', () => test7_propertyEditor(cdp!)))
      results.push(await runTest('8. code editor type text', () => test8_codeEditor(cdp!)))
    }
  } finally {
    if (cdp) cdp.close()
    chrome.kill()
  }

  let pass = 0
  let fail = 0
  for (const r of results) {
    const tag = r.ok ? '✓' : '✗'
    if (r.ok) pass++
    else fail++
    console.log(`${tag} ${r.name} (${r.durationMs}ms)`)
    console.log(`    ${r.details}`)
  }
  console.log(
    `─────────────────────────────────────────────────────────\n` +
      `${pass}/${results.length} passed${fail ? `, ${fail} failed` : ''}`
  )
  process.exit(fail === 0 ? 0 : 1)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
