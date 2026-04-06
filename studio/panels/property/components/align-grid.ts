/**
 * AlignGrid - 9-Position Alignment Grid
 *
 * A 3x3 grid for selecting element alignment positions.
 * Used for alignment (tl, tc, tr, cl, center, cr, bl, bc, br).
 */

import type { EventHandlerMap, AlignPosition } from '../types'
import { escapeHtml } from '../utils'

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
 * Human-readable labels for alignment positions
 */
const ALIGN_LABELS: Record<string, string> = {
  'top-left': 'Top Left',
  'top-center': 'Top Center',
  'top-right': 'Top Right',
  'middle-left': 'Middle Left',
  'middle-center': 'Center',
  'middle-right': 'Middle Right',
  'bottom-left': 'Bottom Left',
  'bottom-center': 'Bottom Center',
  'bottom-right': 'Bottom Right'
}

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
      const label = ALIGN_LABELS[cell] || cell

      return `<button
        class="pp-align-cell ${active ? 'active' : ''}"
        data-align="${cell}"
        title="Align: ${escapeHtml(label)}"
        aria-label="${escapeHtml(label)}"
        tabindex="0"
      ></button>`
    }).join('')
  }).join('')

  return `<div class="pp-align-grid">${cells}</div>`
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
 * Create alignment grid click handler with keyboard navigation
 */
export function createAlignmentHandler(
  onAlign: (position: AlignPosition) => void
): EventHandlerMap {
  return {
    '.pp-align-cell': {
      click: (e: Event, target: HTMLElement) => {
        const position = target.getAttribute('data-align') as AlignPosition
        if (position) {
          onAlign(position)
        }
      },
      keydown: (e: Event, target: HTMLElement) => {
        const key = (e as KeyboardEvent).key

        // Handle Enter/Space - activate the cell
        if (key === 'Enter' || key === ' ') {
          e.preventDefault()
          target.click()
          return
        }

        // Handle arrow keys - navigate the 3x3 grid
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
          e.preventDefault()
          const grid = target.closest('.pp-align-grid')
          if (!grid) return

          const cells = Array.from(grid.querySelectorAll('.pp-align-cell')) as HTMLElement[]
          const currentIndex = cells.indexOf(target)
          if (currentIndex === -1) return

          // Grid is 3x3: indices 0-2 = row 0, 3-5 = row 1, 6-8 = row 2
          const row = Math.floor(currentIndex / 3)
          const col = currentIndex % 3

          let newRow = row
          let newCol = col

          switch (key) {
            case 'ArrowUp':
              newRow = row > 0 ? row - 1 : 2
              break
            case 'ArrowDown':
              newRow = row < 2 ? row + 1 : 0
              break
            case 'ArrowLeft':
              newCol = col > 0 ? col - 1 : 2
              break
            case 'ArrowRight':
              newCol = col < 2 ? col + 1 : 0
              break
          }

          const newIndex = newRow * 3 + newCol
          cells[newIndex]?.focus()
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
