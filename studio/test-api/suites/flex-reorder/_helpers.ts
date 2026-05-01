/**
 * Shared helpers for flex-reorder tests — order verification by code position.
 */

export function findComponentPos(code: string, component: string): number {
  const regex = new RegExp(`\\b${component}(?:\\s|"|$)`)
  const match = regex.exec(code)
  return match ? match.index : -1
}

export function verifyCodeOrder(
  code: string,
  expectedOrder: string[]
): { ok: boolean; actual: string[] } {
  const positions = expectedOrder.map(item => ({
    item,
    pos: findComponentPos(code, item),
  }))

  const notFound = positions.filter(p => p.pos === -1)
  if (notFound.length > 0) {
    return { ok: false, actual: notFound.map(p => `${p.item}:NOT_FOUND`) }
  }

  const sorted = [...positions].sort((a, b) => a.pos - b.pos)
  const actualOrder = sorted.map(p => p.item)

  const isCorrectOrder = expectedOrder.every((item, i) => actualOrder[i] === item)
  return { ok: isCorrectOrder, actual: actualOrder }
}
