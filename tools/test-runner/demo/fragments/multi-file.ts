/**
 * Multi-file project fragments — robust reset, file management.
 *
 * The single-file resetCanvas() only sets the editor content; for demos that
 * need additional files (tokens.tok, components.com, ...) we have to clear the
 * whole project and re-establish a known baseline.
 *
 * Why a separate path: desktopFiles.deleteItem() shows a confirmation dialog
 * (waits for user click) and hangs the demo. Going through storage.deleteFile
 * (the underlying service) bypasses the UI confirmation, which is what we
 * want in an automated demo.
 */

import type { DemoAction } from '../types'

export interface ResetMultiFileProjectOptions {
  /** Initial content for index.mir (default: empty centered Frame). */
  baseCode?: string
  /** Settle delay after the reset (default 600ms). */
  settleMs?: number
  /** Comment shown in the demo log. */
  comment?: string
}

const DEFAULT_BASE = 'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center'

/**
 * Wipe all files except index.mir, set index.mir to a known baseline. Uses
 * the underlying storage service directly (via dynamic import) so the UI
 * confirm-delete dialog never fires.
 *
 * Usage:
 *   ...resetMultiFileProject(),
 *   { action: 'createFile', path: 'tokens.tok', content: '...' },
 */
export function resetMultiFileProject(opts: ResetMultiFileProjectOptions = {}): DemoAction[] {
  const baseCode = opts.baseCode ?? DEFAULT_BASE
  const settleMs = opts.settleMs ?? 600
  const comment = opts.comment ?? 'Reset multi-file project'

  return [
    {
      action: 'execute',
      code: `
        (async function() {
          // 1. Bypass the confirm-delete UI dialog by going through storage
          //    directly. storage is exported by dist/index.js (the studio
          //    bundle) and lives module-internally — we re-import to access it.
          const { storage } = await import('./dist/index.js');

          // 2. Drop every file except index.mir.
          if (window.desktopFiles && typeof window.desktopFiles.getFiles === 'function') {
            const files = window.desktopFiles.getFiles();
            for (const path of Object.keys(files)) {
              if (path !== 'index.mir') {
                try {
                  await storage.deleteFile(path);
                } catch (e) { /* ignore — file may already be gone */ }
              }
            }
          }

          // 3. Persist the baseline to storage *before* switching files —
          //    otherwise switchFile re-reads the previous (default) content
          //    when the editor returns to index.mir later.
          await storage.writeFile('index.mir', ${JSON.stringify(baseCode)});
          await new Promise(r => setTimeout(r, 200));

          // 4. Make sure index.mir is the active file.
          if (window.desktopFiles && typeof window.desktopFiles.selectFile === 'function') {
            await window.desktopFiles.selectFile('index.mir');
            await new Promise(r => setTimeout(r, 200));
          }

          // 5. Editor mirror — set the document directly so node-IDs are
          //    consistent for any drops that follow without an explicit reload.
          await window.__dragTest.setTestCode(${JSON.stringify(baseCode)});
          await new Promise(r => setTimeout(r, 250));
        })();
      `,
      comment,
    },
    { action: 'wait', duration: settleMs },
    {
      action: 'expectCode',
      comment: 'multi-file reset baseline',
      code: baseCode,
    },
  ]
}
