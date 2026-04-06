/**
 * AlignGrid - 9-Position Alignment Grid
 *
 * A 3x3 grid for selecting element alignment positions.
 * Used for alignment (tl, tc, tr, cl, center, cr, bl, bc, br).
 */

import type { EventHandlerMap, AlignPosition } from '../types'

/**
 * Alignment state for the grid
 */
export interface AlignmentState {
  /** Vertical alignment: top, middle, bottom, or null */
  vertical: 'top' | 'middle' | 'bottom' | null
  /** Horizontal alignment: left, center, right, or null */
  horizontal: 'left' | 'center' | 'right' | null
  /** Whether center (both axes) is active */
  isCenter: boolean
}

/**
 * Map of cell positions to their alignment values
 */
const CELL_POSITIONS = [
  ['top-left', 'top-center', 'top-right'],
  ['middle-left', 'middle-center', 'middle-right'],
  ['bottom-left', 'bottom-center', 'bottom-right']
] as const

/**
 * Map alignment position to DSL property
 */
export const ALIGN_TO_PROPERTY: Record<AlignPosition, string[]> = {
  'top-left': ['top', 'left'],
  'top-center': ['top', 'hor-center'],
  'top-right': ['top', 'right'],
  'middle-left': ['ver-center', 'left'],
  'middle-center': ['center'],
  'middle-right': ['ver-center', 'right'],
  'bottom-left': ['bottom', 'left'],
  'bottom-center': ['bottom', 'hor-center'],
  'bottom-right': ['bottom', 'right']
}

/**
 * Escape HTML characters
 */
function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }
  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char)
}

/**
 * Check if a cell should be active based on alignment state
 */
function isCellActive(
  vPos: 'top' | 'middle' | 'bottom',
  hPos: 'left' | 'center' | 'right',
  state: AlignmentState
): boolean {
  // Center is special - it activates middle-center
  if (vPos === 'middle' && hPos === 'center' && state.isCenter) {
    return true
  }

  // Check individual axis matches
  const vMatch = (vPos === 'top' && state.vertical === 'top') ||
                 (vPos === 'middle' && state.vertical === 'middle') ||
                 (vPos === 'bottom' && state.vertical === 'bottom')
  const hMatch = (hPos === 'left' && state.horizontal === 'left') ||
                 (hPos === 'center' && state.horizontal === 'center') ||
                 (hPos === 'right' && state.horizontal === 'right')

  return vMatch && hMatch
}

/**
 * Render the alignment grid
 */
export function renderAlignGrid(state: AlignmentState): string {
  const verticalNames = ['top', 'middle', 'bottom'] as const
  const horizontalNames = ['left', 'center', 'right'] as const

  const cells = CELL_POSITIONS.map((row, vIdx) => {
    const vName = verticalNames[vIdx]
    return row.map((cell, hIdx) => {
      const hName = horizontalNames[hIdx]
      const active = isCellActive(vName, hName, state)
      const title = cell.replace('-', ' ')

      return `<button
        class="align-cell ${active ? 'active' : ''}"
        data-align="${cell}"
        title="${escapeHtml(title)}"
      ></button>`
    }).join('')
  }).join('')

  return `<div class="align-grid">${cells}</div>`
}

/**
 * Parse alignment properties into AlignmentState
 */
export function parseAlignmentState(
  isPropertyActive: (name: string) => boolean
): AlignmentState {
  // Determine vertical alignment
  let vertical: AlignmentState['vertical'] = null
  if (isPropertyActive('top')) vertical = 'top'
  else if (isPropertyActive('bottom')) vertical = 'bottom'
  else if (isPropertyActive('ver-center')) vertical = 'middle'

  // Determine horizontal alignment
  let horizontal: AlignmentState['horizontal'] = null
  if (isPropertyActive('left')) horizontal = 'left'
  else if (isPropertyActive('right')) horizontal = 'right'
  else if (isPropertyActive('hor-center')) horizontal = 'center'

  // Check for combined center
  const isCenter = isPropertyActive('center')

  return { vertical, horizontal, isCenter }
}

/**
 * Create alignment grid click handler
 */
export function createAlignmentHandler(
  onAlign: (position: AlignPosition) => void
): EventHandlerMap {
  return {
    '.align-cell': {
      click: (e: Event, target: HTMLElement) => {
        const position = target.getAttribute('data-align') as AlignPosition
        if (position) {
          onAlign(position)
        }
      }
    }
  }
}

/**
 * Get the DSL properties to set for an alignment position
 *
 * Returns the properties to add and to remove
 */
export function getAlignmentChanges(
  position: AlignPosition,
  currentState: AlignmentState
): { add: string[]; remove: string[] } {
  const propsToAdd = ALIGN_TO_PROPERTY[position]
  const propsToRemove: string[] = []

  // All alignment properties that might need to be removed
  const allAlignProps = [
    'top', 'bottom', 'ver-center',
    'left', 'right', 'hor-center',
    'center'
  ]

  // If clicking on already active cell, toggle off
  const [vPos, hPos] = position.split('-') as ['top' | 'middle' | 'bottom', 'left' | 'center' | 'right']
  const isCurrentlyActive = isCellActive(vPos, hPos, currentState)

  if (isCurrentlyActive) {
    // Toggle off - remove all
    return { add: [], remove: allAlignProps }
  }

  // Toggle on - remove conflicting, add new
  for (const prop of allAlignProps) {
    if (!propsToAdd.includes(prop)) {
      propsToRemove.push(prop)
    }
  }

  return { add: propsToAdd, remove: propsToRemove }
}
