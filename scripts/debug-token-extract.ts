/**
 * Debug-script: simulates the token-extract test scenario in CDP and
 * dumps every browser console message + the editor's doc state at each
 * step. Used to diagnose why the `::` extraction trigger doesn't write
 * `bg $primary` back to app.mir.
 */
import { launchChrome } from '../tools/test-runner/chrome'
import { connectCDP, getPageTarget } from '../tools/test-runner/cdp'
import { ConsoleCollector } from '../tools/test-runner/console-collector'

const URL = 'http://localhost:5173/studio/'

async function evalIn<T>(session: any, expr: string): Promise<T> {
  const r = await session.send<{ result: { value: T; type: string; description?: string } }>(
    'Runtime.evaluate',
    {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    }
  )
  return r.result.value
}

async function main(): Promise<void> {
  const chrome = await launchChrome({ headless: true })
  const m = chrome.wsEndpoint.match(/:(\d+)\//)
  if (!m) throw new Error('no debug port')
  const ws = await getPageTarget(parseInt(m[1], 10))
  const session = await connectCDP(ws)
  await session.send('Runtime.enable')
  await session.send('Page.enable')
  const collector = new ConsoleCollector()
  collector.attach(session as any)
  collector.onMessage(msg => {
    if (
      msg.text.includes('TokenExtract DEBUG') ||
      msg.text.includes('[DISPATCH]') ||
      msg.type === 'error'
    ) {
      console.log(`[browser ${msg.type}] ${msg.text}`)
    }
  })

  const loadDone = new Promise<void>(resolve => session.on('Page.loadEventFired', () => resolve()))
  await session.send('Page.navigate', { url: URL })
  await Promise.race([loadDone, new Promise<void>(r => setTimeout(r, 8000))])

  // Wait for studio to mount + test API to register
  for (let i = 0; i < 80; i++) {
    const ok = await evalIn<boolean>(session, '!!window.editor && !!window.files')
    if (ok) break
    await new Promise(r => setTimeout(r, 100))
  }

  console.log('--- Studio loaded ---')
  console.log('hasEditor:', await evalIn<boolean>(session, '!!window.editor'))
  console.log('files:', await evalIn<unknown>(session, 'Object.keys(window.files || {})'))
  console.log(
    'currentFile:',
    await evalIn<string>(session, 'window.studio?.state?.get?.()?.currentFile || "?"')
  )

  // Monkey-patch editor.dispatch to log every call with stacktrace
  await evalIn(
    session,
    `
    (() => {
      const ed = window.editor
      const origDispatch = ed.dispatch.bind(ed)
      ed.dispatch = function(...args) {
        const tx = args[0]
        const inserted = []
        if (tx && tx.changes) {
          if (Array.isArray(tx.changes)) {
            for (const c of tx.changes) inserted.push(c.insert ? String(c.insert).slice(0, 60) : '')
          } else {
            inserted.push(tx.changes.insert ? String(tx.changes.insert).slice(0, 60) : '')
          }
        }
        try { throw new Error('stacktrace') } catch (e) {
          const stack = e.stack.split('\\n').slice(2, 8).map(s => s.trim()).join(' | ')
          console.warn('[DISPATCH]', JSON.stringify(inserted), 'STACK:', stack)
        }
        return origDispatch(...args)
      }
    })()
  `
  )
  console.log('--- editor.dispatch instrumented ---')

  // Set up test code
  await evalIn(
    session,
    `
    (() => {
      const ed = window.editor
      ed.dispatch({changes: {from: 0, to: ed.state.doc.length, insert: 'Frame pad 16\\n  Frame bg #333, w 100, h 50'}})
    })()
  `
  )
  await new Promise(r => setTimeout(r, 400))

  console.log('--- Initial code set ---')
  console.log(await evalIn<string>(session, 'window.editor.state.doc.toString()'))

  // Step 1: replace 'bg #333' with 'bg primary:#333'
  await evalIn(
    session,
    `
    (() => {
      const ed = window.editor
      const code = ed.state.doc.toString()
      const pos = code.indexOf('bg #333')
      ed.dispatch({changes: {from: pos, to: pos + 7, insert: 'bg primary:#333'}, selection: {anchor: pos + 'bg primary:#333'.length}})
    })()
  `
  )
  await new Promise(r => setTimeout(r, 100))
  console.log('--- After step 1 (bg primary:#333) ---')
  console.log(await evalIn<string>(session, 'window.editor.state.doc.toString()'))

  // Step 2: insert single ':' to make '::'
  await evalIn(
    session,
    `
    (() => {
      const ed = window.editor
      const code = ed.state.doc.toString()
      const pos = code.indexOf('bg primary:') + 'bg primary:'.length
      ed.dispatch({changes: {from: pos, to: pos, insert: ':'}, selection: {anchor: pos + 1}})
    })()
  `
  )
  await new Promise(r => setTimeout(r, 50))
  console.log('--- Just after inserting second : ---')
  console.log(await evalIn<string>(session, 'window.editor.state.doc.toString()'))

  await new Promise(r => setTimeout(r, 800))
  console.log('--- 800ms after insert ---')
  console.log('editor doc:', await evalIn<string>(session, 'window.editor.state.doc.toString()'))
  console.log(
    'currentFile:',
    await evalIn<string>(session, 'window.studio?.state?.get?.()?.currentFile || "?"')
  )
  console.log('files keys:', await evalIn<unknown>(session, 'Object.keys(window.files || {})'))
  console.log('files content:', await evalIn<unknown>(session, 'window.files'))

  session.close()
  chrome.kill()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
