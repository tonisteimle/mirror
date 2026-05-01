/**
 * Shared helper for stacked-drag tests — verify x/y position from code.
 */

export function verifyPosition(
  code: string,
  expectedX: number,
  expectedY: number,
  tolerance = 20
): { ok: boolean; actualX: number | null; actualY: number | null } {
  const xMatch = code.match(/\bx\s+(\d+)/i)
  const yMatch = code.match(/\by\s+(\d+)/i)

  const actualX = xMatch ? parseInt(xMatch[1], 10) : null
  const actualY = yMatch ? parseInt(yMatch[1], 10) : null

  const xOk = actualX !== null && Math.abs(actualX - expectedX) <= tolerance
  const yOk = actualY !== null && Math.abs(actualY - expectedY) <= tolerance

  return { ok: xOk && yOk, actualX, actualY }
}
