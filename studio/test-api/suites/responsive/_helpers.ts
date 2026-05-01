/**
 * Shared helpers for responsive tests — set sizes, read computed styles.
 */

export function setContainerSize(el: HTMLElement, width: number, height?: number): void {
  el.style.width = `${width}px`
  if (height) el.style.height = `${height}px`
  void el.offsetHeight
}

export function getStyle(el: HTMLElement, prop: string): string {
  return window.getComputedStyle(el).getPropertyValue(prop)
}
