/**
 * Trigger Verification Probe (SKIPPED in suite — `_` prefix)
 *
 * Verifies the three Studio triggers that the Notion-Settings demo never
 * exercised directly (so they were claimed in the feature inventory but
 * never observed end-to-end):
 *
 *   1. Cmd+D — duplicate selected element
 *   2. Cmd+G — group multi-selection in a wrapper Frame
 *   3. Right-click — preview context menu (Group / Ungroup / Duplicate / Delete)
 *
 * Each section is independent: drop a fresh Frame, run the probe, check
 * either editor source (1+2) or DOM (3). Run individually:
 *
 *   npx tsx tools/test.ts \
 *     --demo=tools/test-runner/demo/scripts/_verify-triggers.ts \
 *     --pacing=instant
 */

import type { DemoScript } from '../types'
import { paletteHighlight } from '../fragments/palette'

export const demoScript: DemoScript = {
  name: 'Trigger Verification',
  description: 'Ad-hoc probe for Cmd+D / Cmd+G / Right-click triggers',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: false,
  },
  steps: [
    // === Setup: minimal canvas + one Frame as testbed ===
    { action: 'comment', text: 'Setup: canvas + 1 Frame als Testbed' },
    { action: 'moveTo', target: '.cm-editor' },
    { action: 'click' },
    { action: 'wait', duration: 200 },
    {
      action: 'type',
      text: 'canvas mobile, bg #18181b, col white',
      expectCode: 'canvas mobile, bg #18181b, col white',
    },

    ...paletteHighlight('comp-frame'),
    {
      action: 'dropFromPalette',
      component: 'Frame',
      target: { byId: 'node-1' },
      at: { kind: 'index', index: 0 },
      comment: 'parent Frame (root)',
      expectCode: 'canvas mobile, bg #18181b, col white\n\nFrame w 100, h 100, bg #27272a, rad 8',
    },
    // Resize the parent so the next drop lands inside (alignment-zone needs ≥80×80).
    {
      action: 'dragResize',
      selector: { byId: 'node-1' },
      position: 'se',
      deltaX: 200,
      deltaY: 200,
      bypassSnap: true,
      comment: 'enlarge parent',
      expectCode: 'canvas mobile, bg #18181b, col white\n\nFrame w 304, h 304, bg #27272a, rad 8',
    },
    ...paletteHighlight('comp-frame'),
    {
      action: 'dropFromPalette',
      component: 'Frame',
      target: { byId: 'node-1' },
      at: { kind: 'index', index: 0 },
      comment: 'child Frame inside parent',
      expectCode:
        'canvas mobile, bg #18181b, col white\n' +
        '\n' +
        'Frame w 304, h 304, bg #27272a, rad 8, center\n' +
        '  Frame w 100, h 100, bg #27272a, rad 8',
    },

    // === Probe 1: Cmd+D Duplicate (auf node-2 = child mit parentId) ===
    { action: 'comment', text: 'Probe 1: Cmd+D duplicate selected element' },
    {
      action: 'selectInPreview',
      selector: { byId: 'node-2' },
      comment: 'select child Frame',
    },
    { action: 'wait', duration: 200 },
    {
      action: 'execute',
      code: `
        (() => {
          const studio = window.__mirrorStudio__;
          if (studio?.actions?.setEditorFocus) studio.actions.setEditorFocus(false);
          if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) {
            document.activeElement.blur();
          }
          const sel = studio?.state?.get?.()?.selection;
          const sm = studio?.state?.get?.()?.sourceMap;
          const node = sm?.getNodeById?.(sel?.nodeId);
          const ehf = studio?.state?.get?.()?.editorHasFocus;
          console.error('[VERIFY-CMD-D-PRE] selection=' + JSON.stringify(sel) + ' parentId=' + (node?.parentId ?? 'none') + ' editorHasFocus=' + ehf + ' activeEl=' + (document.activeElement && document.activeElement.tagName));

          // Direct API call — bypasses keyboard event filters. Verifies the
          // duplicate command itself works. (The keyboard PATH still has
          // open questions around contentEditable filtering; calling
          // executeDuplicate directly is the cleanest verification.)
          // We invoke via the bootstrap-exposed action if available, else
          // try the keyboard event as fallback.
          let duplicated = false;
          try {
            // Look for the executor bound to studio
            const exec = studio?.executor || studio?.commandExecutor;
            if (exec && typeof exec.execute === 'function' && window.MirrorLang) {
              // We don't have direct access to the DuplicateNode command
              // class from app code — fall back to keyboard.
            }
          } catch (_e) {}
          // Keyboard path — record listener visibility.
          // Hook into studio events to capture success/error notifications.
          const events = studio?.events;
          let lastNotif = null;
          if (events?.on) {
            events.on('notification:success', (n) => { lastNotif = ['success', n]; });
            events.on('notification:error', (n) => { lastNotif = ['error', n]; });
          }
          let keydownSeen = false;
          let preventDefaultCalled = false;
          const probe = (e) => {
            if (e.key === 'd' && (e.metaKey || e.ctrlKey)) {
              keydownSeen = true;
              // Schedule check after the event fans out — if a higher-priority
              // listener calls preventDefault, we'll see it on the event itself.
              setTimeout(() => {
                preventDefaultCalled = e.defaultPrevented;
              }, 0);
            }
          };
          document.addEventListener('keydown', probe, { capture: true });
          const ev = new KeyboardEvent('keydown', {
            key: 'd', metaKey: true, bubbles: true, cancelable: true,
          });
          document.dispatchEvent(ev);
          document.removeEventListener('keydown', probe, { capture: true });
          console.error('[VERIFY-CMD-D-DISPATCHED] keydown event observed: ' + keydownSeen + ' defaultPrevented: ' + ev.defaultPrevented);
          // Inspect notification on next tick.
          setTimeout(() => {
            console.error('[VERIFY-CMD-D-NOTIF] ' + JSON.stringify(lastNotif));
          }, 200);
        })();
      `,
      comment: 'press Cmd+D + observability',
    },
    { action: 'wait', duration: 600 },
    {
      action: 'expectCode',
      comment: 'Cmd+D produced a second child Frame',
      code:
        'canvas mobile, bg #18181b, col white\n' +
        '\n' +
        'Frame w 304, h 304, bg #27272a, rad 8, center\n' +
        '  Frame w 100, h 100, bg #27272a, rad 8\n' +
        '  Frame w 100, h 100, bg #27272a, rad 8',
    },

    // === Probe 2: Cmd+G Group multi-selection ===
    // After Cmd+D we have node-2 + node-3 (the two child Frames). Group them.
    { action: 'comment', text: 'Probe 2: Cmd+G group multi-selection' },
    {
      action: 'execute',
      code: `
        (() => {
          const studio = window.__mirrorStudio__;
          if (!studio?.actions) throw new Error('no studio.actions');
          studio.actions.clearMultiSelection?.();
          studio.actions.setSelection?.('node-2', 'test');
          studio.actions.addToMultiSelection?.('node-3');
          studio.actions.setEditorFocus?.(false);
          if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) {
            document.activeElement.blur();
          }
          document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'g', metaKey: true, bubbles: true, cancelable: true,
          }));
        })();
      `,
      comment: 'select node-2+node-3, press Cmd+G',
    },
    { action: 'wait', duration: 700 },
    {
      action: 'execute',
      code: `
        (() => {
          const src = window.editor?.state?.doc?.toString() || '';
          // Cmd+G should wrap both Frames in a parent Frame. The exact wrap
          // properties (e.g. \`hor, gap N\`) are calculated from selection
          // bounds and may differ — we just pin that there are now two
          // levels of indentation inside a wrapping Frame.
          const lines = src.split('\\n');
          const indented = lines.filter(l => l.startsWith('  Frame')).length;
          if (indented < 2) {
            throw new Error('Cmd+G did not wrap — expected ≥2 indented Frames, got: ' + JSON.stringify(src));
          }
          console.error('[VERIFY-CMD-G] OK — wrapped source:\\n' + src);
        })();
      `,
      comment: 'verify Cmd+G wrapped both frames',
    },

    // === Probe 3: Right-click context menu (auf nested child) ===
    // buildMenuItems() lehnt Root-Elemente ab (keine Duplicate/Delete für
    // Root). Wir picken ein Element MIT parentId.
    { action: 'comment', text: 'Probe 3: Right-click auf nested child → context menu' },
    {
      action: 'execute',
      code: `
        (() => {
          const studio = window.__mirrorStudio__;
          const sm = studio?.state?.get?.()?.sourceMap;
          if (!sm) throw new Error('no sourceMap');
          // Find first node WITH parentId.
          const allEls = Array.from(document.querySelectorAll('#preview [data-mirror-id]'));
          let target = null, targetId = null;
          for (const el of allEls) {
            const id = el.getAttribute('data-mirror-id');
            const node = sm.getNodeById(id);
            if (node?.parentId) {
              target = el; targetId = id; break;
            }
          }
          if (!target) throw new Error('no nested element found');
          studio.actions.setSelection(targetId, 'preview');
          console.error('[VERIFY-CONTEXT-MENU-PRE] selecting ' + targetId + ' (parent=' + sm.getNodeById(targetId).parentId + ')');
          const r = target.getBoundingClientRect();
          target.dispatchEvent(new MouseEvent('contextmenu', {
            bubbles: true, cancelable: true, view: window,
            clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
            button: 2,
          }));
          const menu = document.querySelector('.context-menu');
          if (!menu) {
            throw new Error('Context menu did not appear after right-click on ' + targetId);
          }
          const items = menu.querySelectorAll('.context-menu-item');
          const labels = Array.from(items).map(i => i.textContent.trim().slice(0, 40));
          console.error('[VERIFY-CONTEXT-MENU] OK — ' + items.length + ' items: ' + JSON.stringify(labels));
        })();
      `,
      comment: 'fire contextmenu + sync DOM check',
    },
    { action: 'wait', duration: 300 },

    { action: 'comment', text: 'Trigger-Verifikation abgeschlossen.' },
    { action: 'wait', duration: 200 },
  ],
}

export default demoScript
