/**
 * Form Navigation Module
 *
 * Keyboard navigation for forms.
 * Extracted from dom-runtime.ts for Clean Code.
 */

import type { MirrorElement } from './types'

// ============================================
// FOCUSABLE SELECTORS
// ============================================

const FOCUSABLE_SELECTORS = [
  'input:not([type="hidden"]):not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(', ')

// ============================================
// PUBLIC API
// ============================================

export function focusNextInput(current: HTMLElement): boolean {
  const container = findFormContainer(current)
  const focusables = getFormFocusables(container)
  const currentIndex = focusables.indexOf(current)

  if (canFocusNext(currentIndex, focusables.length)) {
    focusables[currentIndex + 1].focus()
    return true
  }
  return false
}

export function focusPrevInput(current: HTMLElement): boolean {
  const container = findFormContainer(current)
  const focusables = getFormFocusables(container)
  const currentIndex = focusables.indexOf(current)

  if (currentIndex > 0) {
    focusables[currentIndex - 1].focus()
    return true
  }
  return false
}

export function setupFormNavigation(form: HTMLElement): void {
  form.dataset.mirrorForm = 'true'
  form.addEventListener('keydown', (e: KeyboardEvent) => handleFormKeydown(e, form))
}

export function setupAutoSelect(input: HTMLInputElement | HTMLTextAreaElement): void {
  removeExistingHandler(input)
  const handler = createAutoSelectHandler(input)
  storeHandler(input, handler)
  input.addEventListener('focus', handler)
}

// ============================================
// INTERNAL HELPERS
// ============================================

function findFormContainer(element: HTMLElement): HTMLElement {
  return (element.closest('form') ||
    element.closest('[data-mirror-form]') ||
    document.body) as HTMLElement
}

function getFormFocusables(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS))
  return elements.filter(isElementVisible).sort(sortByTabIndex)
}

function isElementVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el)
  return style.display !== 'none' && style.visibility !== 'hidden'
}

function sortByTabIndex(a: HTMLElement, b: HTMLElement): number {
  const tabA = parseInt(a.getAttribute('tabindex') || '0', 10)
  const tabB = parseInt(b.getAttribute('tabindex') || '0', 10)
  if (tabA === tabB) return 0
  if (tabA === 0) return 1
  if (tabB === 0) return -1
  return tabA - tabB
}

function canFocusNext(currentIndex: number, length: number): boolean {
  return currentIndex >= 0 && currentIndex < length - 1
}

function handleFormKeydown(e: KeyboardEvent, form: HTMLElement): void {
  const target = e.target as HTMLElement
  const tagName = target.tagName.toLowerCase()

  if (e.key === 'Enter' && !e.shiftKey) {
    handleEnterKey(e, target, tagName, form)
  }

  if (e.key === 'Escape') {
    handleEscapeKey(target, tagName)
  }
}

function handleEnterKey(
  e: KeyboardEvent,
  target: HTMLElement,
  tagName: string,
  form: HTMLElement
): void {
  if (shouldSkipEnterKey(target, tagName)) return

  if (tagName === 'input') {
    processInputEnter(e, target, form)
  }
}

function shouldSkipEnterKey(target: HTMLElement, tagName: string): boolean {
  if (tagName === 'textarea') return true
  if (tagName === 'button' && (target as HTMLButtonElement).type === 'submit') return true
  return false
}

function processInputEnter(e: KeyboardEvent, target: HTMLElement, form: HTMLElement): void {
  const inputType = (target as HTMLInputElement).type
  if (inputType === 'submit' || inputType === 'button') return
  e.preventDefault()
  const focusables = getFormFocusables(form)
  const isLast = focusables.indexOf(target) === focusables.length - 1
  isLast ? submitForm(form) : focusNextInput(target)
}

function submitForm(form: HTMLElement): void {
  const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement

  if (submitBtn) {
    submitBtn.click()
  } else if (form.tagName.toLowerCase() === 'form') {
    ;(form as HTMLFormElement).requestSubmit()
  }
}

function handleEscapeKey(target: HTMLElement, tagName: string): void {
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    target.blur()
  }
}

function removeExistingHandler(input: HTMLInputElement | HTMLTextAreaElement): void {
  const existing = (input as MirrorElement)._autoSelectHandler
  if (existing) {
    input.removeEventListener('focus', existing)
  }
}

function createAutoSelectHandler(input: HTMLInputElement | HTMLTextAreaElement): () => void {
  return () => {
    requestAnimationFrame(() => {
      if (input.isConnected) {
        input.select()
      }
    })
  }
}

function storeHandler(input: HTMLInputElement | HTMLTextAreaElement, handler: () => void): void {
  ;(input as MirrorElement)._autoSelectHandler = handler
}
