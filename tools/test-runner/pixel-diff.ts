/**
 * Pixel diff via pngjs + pixelmatch.
 *
 * Extracted from `demo/runner.ts` so the Step-Runner can use the same
 * comparison rules (Phase 7). Demo runner re-exports through here.
 *
 * Both deps are loaded lazily (`await import`) so callers that never
 * compare snapshots don't pay the resolve cost. `pngjs` and
 * `pixelmatch` ship without TypeScript declarations; we narrow with
 * locally-defined interfaces and silence the missing-types per usage.
 */

import * as fs from 'fs'

export interface PixelDiffResult {
  match: boolean
  diffPixels: number
  totalPixels: number
  /** Encoded PNG of the diff highlight (only set on mismatch). */
  diffPng?: Buffer
  /**
   * Set when baseline and current have different dimensions — pixelmatch
   * can't run on mismatched sizes, so we report the whole image as
   * differing and skip the diff PNG.
   */
  sizeMismatch?: boolean
}

interface PngImage {
  width: number
  height: number
  data: Buffer
}

interface PngStaticAPI {
  sync: { read: (buf: Buffer) => PngImage; write: (img: PngImage) => Buffer }
  new (opts: { width: number; height: number }): PngImage
}

type PixelmatchFn = (
  imgA: Buffer,
  imgB: Buffer,
  output: Buffer,
  width: number,
  height: number,
  options: { threshold: number }
) => number

let pngLib: PngStaticAPI | null = null
let pixelmatchFn: PixelmatchFn | null = null

async function loadDeps(): Promise<{ PNG: PngStaticAPI; pixelmatch: PixelmatchFn }> {
  if (!pngLib) {
    // @ts-expect-error — pngjs ships no types
    const mod = await import('pngjs')
    pngLib = (mod.PNG as PngStaticAPI) ?? (mod.default as PngStaticAPI)
  }
  if (!pixelmatchFn) {
    // @ts-expect-error — pixelmatch ships no types
    const mod = await import('pixelmatch')
    pixelmatchFn = (mod.default as PixelmatchFn) ?? (mod as unknown as PixelmatchFn)
  }
  return { PNG: pngLib, pixelmatch: pixelmatchFn }
}

/**
 * Compare two PNG files. Returns match=true when zero pixels differ
 * (within the per-pixel `threshold`); match=false otherwise. On
 * mismatch, `diffPng` carries an encoded buffer that visualises the
 * differing pixels (red on transparent), suitable for writing to disk
 * for human review.
 */
export async function comparePngFiles(
  baselinePath: string,
  currentPath: string,
  threshold: number
): Promise<PixelDiffResult> {
  const { PNG, pixelmatch } = await loadDeps()

  const a = PNG.sync.read(fs.readFileSync(baselinePath))
  const b = PNG.sync.read(fs.readFileSync(currentPath))

  if (a.width !== b.width || a.height !== b.height) {
    const total = Math.max(a.width * a.height, b.width * b.height)
    return { match: false, diffPixels: total, totalPixels: total, sizeMismatch: true }
  }

  const diff = new PNG({ width: a.width, height: a.height })
  const diffPixels = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold })
  const totalPixels = a.width * a.height
  if (diffPixels === 0) return { match: true, diffPixels: 0, totalPixels }
  return { match: false, diffPixels, totalPixels, diffPng: PNG.sync.write(diff) }
}

/**
 * Compare two raw PNG buffers (avoids the disk round-trip when the
 * caller already has the bytes in memory — e.g. fresh from
 * Page.captureScreenshot).
 */
export async function comparePngBuffers(
  baseline: Buffer,
  current: Buffer,
  threshold: number
): Promise<PixelDiffResult> {
  const { PNG, pixelmatch } = await loadDeps()
  const a = PNG.sync.read(baseline)
  const b = PNG.sync.read(current)

  if (a.width !== b.width || a.height !== b.height) {
    const total = Math.max(a.width * a.height, b.width * b.height)
    return { match: false, diffPixels: total, totalPixels: total, sizeMismatch: true }
  }

  const diff = new PNG({ width: a.width, height: a.height })
  const diffPixels = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold })
  const totalPixels = a.width * a.height
  if (diffPixels === 0) return { match: true, diffPixels: 0, totalPixels }
  return { match: false, diffPixels, totalPixels, diffPng: PNG.sync.write(diff) }
}
