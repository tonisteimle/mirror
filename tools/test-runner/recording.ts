/**
 * CDP-Screencast → ffmpeg-Pipe → WebM
 *
 * Captures viewport frames via Chrome DevTools Protocol's
 * `Page.startScreencast`, streams the JPEGs to a long-running ffmpeg
 * subprocess, encodes to VP9 WebM. Designed for tutorial-recording:
 * file-on-disk at the end of a Demo-Run, no live preview.
 *
 * Usage:
 *   const rec = await startRecording(cdp, { outputPath: 'demo.webm' })
 *   // ... run demo
 *   await rec.stop()
 *
 * Why VP9 WebM: native browser playback (Chrome/Firefox/Safari 14+),
 * smaller than equivalent-quality H.264, no licensing pitfalls.
 *
 * Why fixed-fps re-encode (`-r OUT_FPS`): CDP sends frames at variable
 * rate (cadence depends on viewport changes). We let ffmpeg duplicate
 * stationary frames so the output has a steady cadence — important
 * for HTML <video> auto-play loops where stutter is jarring.
 */

import { spawn, type ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import type { CDPSession } from './types'

export interface RecordingOptions {
  outputPath: string
  /** Output frame rate (default 24). */
  fps?: number
  /** JPEG quality of the screencast frames 1-100 (default 90). */
  quality?: number
}

export interface RecordingHandle {
  /** Frames captured so far. */
  framesCaptured: () => number
  /**
   * Begin a cut zone. Frames captured between this call and the matching
   * `markCutEnd` are dropped from the output. Useful for compressing dead
   * waits (e.g. LLM thinking) without losing surrounding context.
   */
  markCutStart: () => void
  /**
   * End a cut zone. Frames since `markCutStart` are dropped; instead the
   * last pre-cut frame is held for `holdSeconds` (default 0). When the
   * hold is non-zero the user sees a brief still on the moment-of-action
   * before time jumps forward. holdSeconds=0 = hard cut.
   */
  markCutEnd: (holdSeconds?: number) => void
  /** Stop screencast, flush ffmpeg, resolve when file is written. */
  stop: () => Promise<void>
}

export async function startRecording(
  cdp: CDPSession,
  options: RecordingOptions
): Promise<RecordingHandle> {
  const { outputPath, fps = 24, quality = 90 } = options

  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true })

  const ffmpeg = spawnFfmpeg(outputPath, fps)
  let frames = 0
  let stopped = false
  let cutting = false
  // Last frame seen BEFORE the active cut began — what we hold during the
  // optional hold-seconds at cut-end. We keep the raw JPEG buffer so we
  // can write it N times into ffmpeg without re-encoding.
  let lastPreCutFrame: Buffer | null = null

  // Forward screencast frames to ffmpeg as a concatenated MJPEG stream.
  // Ack the frame back to CDP so the next one arrives — without an ack
  // the screencast pipeline stalls after ~5 frames (Chrome flow control).
  cdp.on('Page.screencastFrame', (params: unknown) => {
    if (stopped) return
    const frame = params as { data: string; sessionId: number }
    const buf = Buffer.from(frame.data, 'base64')
    if (!cutting && !ffmpeg.stdin.destroyed) {
      ffmpeg.stdin.write(buf)
      frames++
      lastPreCutFrame = buf
    }
    void cdp.send('Page.screencastFrameAck', { sessionId: frame.sessionId }).catch(() => {})
  })

  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality,
    everyNthFrame: 1,
  })

  return {
    framesCaptured: () => frames,
    markCutStart: () => {
      cutting = true
    },
    markCutEnd: (holdSeconds = 0) => {
      cutting = false
      if (holdSeconds > 0 && lastPreCutFrame && !ffmpeg.stdin.destroyed) {
        // Repeat the pre-cut frame for `holdSeconds * fps` more frames.
        // The viewer sees a brief still on the moment-of-action before
        // time jumps forward — much smoother than a hard splice.
        const repeats = Math.round(holdSeconds * fps)
        for (let i = 0; i < repeats; i++) {
          ffmpeg.stdin.write(lastPreCutFrame)
          frames++
        }
      }
    },
    stop: async () => {
      if (stopped) return
      stopped = true
      try {
        await cdp.send('Page.stopScreencast', {})
      } catch {
        // CDP may already be torn down — non-fatal
      }
      // Close ffmpeg stdin so the encoder finalizes the file.
      if (!ffmpeg.stdin.destroyed) ffmpeg.stdin.end()
      await new Promise<void>((resolve, reject) => {
        ffmpeg.on('close', code => {
          if (code === 0) resolve()
          else reject(new Error(`ffmpeg exited with code ${code}`))
        })
        ffmpeg.on('error', reject)
      })
    },
  }
}

function spawnFfmpeg(outputPath: string, fps: number): ChildProcess {
  // Input: MJPEG stream from stdin (concatenated JPEGs, one per frame).
  // CDP doesn't tag frames with PTS, so we tell ffmpeg the input is at
  // `fps` already; output gets an explicit -r so the WebM has a fixed
  // cadence regardless of any input drift. Looping `<video>` benefits
  // from steady-cadence — variable PTS makes Chrome stutter on wrap.
  const args = [
    '-y',
    '-loglevel',
    'error',
    '-f',
    'image2pipe',
    '-vcodec',
    'mjpeg',
    '-r',
    String(fps),
    '-i',
    '-',
    '-c:v',
    'libvpx-vp9',
    '-crf',
    '30',
    '-b:v',
    '0',
    '-pix_fmt',
    'yuv420p',
    '-r',
    String(fps),
    outputPath,
  ]
  const child = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] })
  // Surface stderr only on error — keeps demo logs clean.
  let lastErr = ''
  child.stderr.on('data', chunk => {
    lastErr += chunk.toString()
  })
  child.on('exit', code => {
    if (code !== 0 && code !== null && lastErr) {
      console.error(`[recording] ffmpeg failed (${code}):\n${lastErr}`)
    }
  })
  return child
}
