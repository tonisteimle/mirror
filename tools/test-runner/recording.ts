/**
 * Screen-Capture → ffmpeg-avfoundation → WebM
 *
 * Captures the macOS screen via ffmpeg's `avfoundation` input with
 * `-capture_cursor 1` so the real OS cursor (driven by `--os-mouse`) lands
 * in the recording. The captured stream is cropped to the Chrome
 * inner viewport — only the Studio web content is in the final video,
 * no Chrome toolbar, no desktop noise.
 *
 * Why this instead of CDP `Page.startScreencast`: the screencast captures
 * the renderer's surface BEFORE the OS compositor draws the cursor on
 * top. The cursor is real on screen but invisible in the file. avfoundation
 * captures whatever the display actually shows, cursor included.
 *
 * Requires Screen Recording permission (System Settings → Privacy &
 * Security → Screen Recording) for the process that spawns ffmpeg —
 * typically the terminal app that runs the test runner.
 *
 * Usage (unchanged):
 *   const rec = await startRecording(cdp, { outputPath: 'demo.webm' })
 *   // ... run demo
 *   await rec.stop()
 */

import { spawn, type ChildProcess, execFileSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import type { CDPSession } from './types'

export interface RecordingOptions {
  outputPath: string
  /** Output frame rate (default 30). */
  fps?: number
  /**
   * avfoundation screen device override. If omitted, the recorder probes
   * ffmpeg's device list for "Capture screen 0".
   */
  screenIndex?: number
}

export interface RecordingHandle {
  framesCaptured: () => number
  /** Legacy stub — frame-cutting needs the old MJPEG pipeline. No-op. */
  markCutStart: () => void
  /** Legacy stub — see markCutStart. No-op. */
  markCutEnd: (holdSeconds?: number) => void
  /** Stop ffmpeg cleanly, await flush, resolve when file is written. */
  stop: () => Promise<void>
}

interface ViewportBounds {
  /** Inner viewport top-left in physical pixels relative to display origin. */
  x: number
  y: number
  w: number
  h: number
  dpr: number
}

export async function startRecording(
  cdp: CDPSession,
  options: RecordingOptions
): Promise<RecordingHandle> {
  const { outputPath, fps = 30 } = options
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true })

  // Bring the test-runner Chrome to the foreground BEFORE measuring the
  // viewport bounds. If another window sits on top of it the recording
  // will capture pixels from that window — we crop by screen coords,
  // and the OS compositor draws whatever's frontmost there. Page.bringToFront
  // makes the CDP target's tab and window foremost.
  try {
    await cdp.send('Page.bringToFront')
  } catch {
    // Older CDP servers / non-Page targets don't support this — skip.
  }
  // Brief settle so the OS compositor swaps the front window before
  // ffmpeg starts capturing the crop area.
  await new Promise(r => setTimeout(r, 250))

  const screenIndex = options.screenIndex ?? findScreenDevice()
  const bounds = await readViewportBounds(cdp)
  // ffmpeg's crop filter rejects non-integer or odd dimensions for some
  // codecs. Round down and force-even.
  const cw = Math.floor(bounds.w / 2) * 2
  const ch = Math.floor(bounds.h / 2) * 2
  const cx = Math.floor(bounds.x)
  const cy = Math.floor(bounds.y)

  const ffmpeg = spawnFfmpeg({
    outputPath,
    fps,
    screenIndex,
    crop: { x: cx, y: cy, w: cw, h: ch },
  })

  // Resolve "ffmpeg actually started" before returning — otherwise the
  // first input event might land before any frame is captured. We probe
  // by waiting briefly and checking the process is still alive.
  await new Promise(r => setTimeout(r, 600))
  if (ffmpeg.exitCode !== null) {
    throw new Error(
      `ffmpeg exited immediately (code ${ffmpeg.exitCode}). ` +
        'Check Screen Recording permission for your terminal.'
    )
  }

  let stopped = false

  return {
    framesCaptured: () => -1, // ffmpeg-side counter; not surfaced from stderr
    markCutStart: () => {
      /* no-op in screen-capture mode */
    },
    markCutEnd: () => {
      /* no-op in screen-capture mode */
    },
    stop: async () => {
      if (stopped) return
      stopped = true
      // SIGINT lets ffmpeg flush + close the container cleanly.
      // SIGTERM/SIGKILL would truncate the output.
      ffmpeg.kill('SIGINT')
      await new Promise<void>((resolve, reject) => {
        let settled = false
        ffmpeg.on('close', code => {
          if (settled) return
          settled = true
          // ffmpeg returns 255 when interrupted via SIGINT after writing
          // a valid container — treat that as success.
          if (code === 0 || code === 255 || code === null) resolve()
          else reject(new Error(`ffmpeg exited with code ${code}`))
        })
        ffmpeg.on('error', e => {
          if (settled) return
          settled = true
          reject(e)
        })
        // Hard timeout in case ffmpeg ignores SIGINT (rare on macOS).
        setTimeout(() => {
          if (settled) return
          settled = true
          try {
            ffmpeg.kill('SIGKILL')
          } catch {
            /* already dead */
          }
          resolve()
        }, 5000)
      })
    },
  }
}

async function readViewportBounds(cdp: CDPSession): Promise<ViewportBounds> {
  type EvalResult = {
    result: {
      type: string
      value?: {
        sx: number
        sy: number
        iw: number
        ih: number
        ow: number
        oh: number
        dpr: number
      }
    }
  }
  const expr = `
    (() => {
      const chromeOffsetX = window.outerWidth - window.innerWidth
      const chromeOffsetY = window.outerHeight - window.innerHeight
      return {
        sx: window.screenX + chromeOffsetX,
        sy: window.screenY + chromeOffsetY,
        iw: window.innerWidth,
        ih: window.innerHeight,
        ow: window.outerWidth,
        oh: window.outerHeight,
        dpr: window.devicePixelRatio || 1,
      }
    })()
  `
  const evalResult = await cdp.send<EvalResult>('Runtime.evaluate', {
    expression: expr,
    returnByValue: true,
  })
  const v = evalResult.result.value
  if (!v) throw new Error('readViewportBounds: empty Runtime.evaluate result')
  return {
    x: v.sx * v.dpr,
    y: v.sy * v.dpr,
    w: v.iw * v.dpr,
    h: v.ih * v.dpr,
    dpr: v.dpr,
  }
}

/**
 * Probe ffmpeg for the device index of "Capture screen 0". macOS
 * numbers avfoundation devices [cameras…, screens…], so the screen
 * index drifts when external cameras come and go.
 */
function findScreenDevice(): number {
  let output = ''
  try {
    execFileSync('ffmpeg', ['-f', 'avfoundation', '-list_devices', 'true', '-i', ''], {
      stdio: ['ignore', 'ignore', 'pipe'],
    })
  } catch (e) {
    // `-list_devices` exits non-zero — stderr contains the device list.
    output = (e as { stderr?: Buffer | string }).stderr?.toString() ?? ''
  }
  // Match "[N] Capture screen 0" but only after the video-devices header
  // so we don't pick up an audio device by mistake.
  const videoSection = output.split('AVFoundation audio devices')[0] ?? output
  const m = videoSection.match(/\[(\d+)\]\s+Capture screen 0/)
  if (!m) {
    throw new Error(
      'ffmpeg avfoundation: "Capture screen 0" not found. ' +
        'Check Screen Recording permission and ffmpeg build.'
    )
  }
  return parseInt(m[1], 10)
}

function spawnFfmpeg(args: {
  outputPath: string
  fps: number
  screenIndex: number
  crop: { x: number; y: number; w: number; h: number }
}): ChildProcess {
  const { outputPath, fps, screenIndex, crop } = args
  const cliArgs = [
    '-y',
    '-loglevel',
    'error',
    '-f',
    'avfoundation',
    '-framerate',
    String(fps),
    '-capture_cursor',
    '1',
    '-i',
    `${screenIndex}:none`,
    '-vf',
    `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}`,
    '-c:v',
    'libvpx-vp9',
    // libvpx-vp9 default is excruciatingly slow at retina resolutions.
    // cpu-used=5 + deadline=realtime + row-mt=1 trades a small quality
    // bump for ~10x encode speed — fine for tutorial demos.
    '-cpu-used',
    '5',
    '-deadline',
    'realtime',
    '-row-mt',
    '1',
    '-crf',
    '32',
    '-b:v',
    '0',
    '-pix_fmt',
    'yuv420p',
    '-r',
    String(fps),
    outputPath,
  ]
  const child = spawn('ffmpeg', cliArgs, { stdio: ['ignore', 'ignore', 'pipe'] })
  let lastErr = ''
  child.stderr.on('data', chunk => {
    lastErr += chunk.toString()
  })
  child.on('exit', code => {
    // Suppress noise for clean exits (0) and SIGINT-flush (255).
    if (code !== 0 && code !== 255 && code !== null && lastErr) {
      console.error(`[recording] ffmpeg failed (${code}):\n${lastErr}`)
    }
  })
  return child
}
