/**
 * Layout Assertions
 *
 * Verifiziert dass gerenderte Layouts den Erwartungen entsprechen.
 * Verwendet echte DOM-Messungen (getBoundingClientRect, getComputedStyle).
 */

// =============================================================================
// Types
// =============================================================================

export interface BoundingRect {
  x: number
  y: number
  width: number
  height: number
  top: number
  left: number
  right: number
  bottom: number
}

export interface LayoutInfo {
  nodeId: string
  bounds: BoundingRect
  children: LayoutInfo[]
  computedStyle: {
    display: string
    flexDirection: string
    justifyContent: string
    alignItems: string
    gap: string
    width: string
    height: string
    paddingTop: string
    paddingRight: string
    paddingBottom: string
    paddingLeft: string
  }
  /** Content bounds (excluding padding) */
  contentBounds: BoundingRect
}

export type Direction = 'horizontal' | 'vertical'
export type Alignment = 'start' | 'center' | 'end' | 'space-between'

export interface LayoutExpectation {
  direction?: Direction
  alignment?: { main?: Alignment; cross?: Alignment }
  gap?: number
  children?: ChildExpectation[]
}

export interface ChildExpectation {
  index: number
  width?: number | 'hug' | 'full' | 'grow'
  height?: number | 'hug' | 'full' | 'grow'
  minWidth?: number
  maxWidth?: number
}

export interface AssertionResult {
  passed: boolean
  message: string
  expected?: any
  actual?: any
  details?: string[]
}

// =============================================================================
// Helper Functions
// =============================================================================

function parsePixelValue(value: string): number {
  const num = parseFloat(value)
  return isNaN(num) ? 0 : num
}

function getPadding(style: LayoutInfo['computedStyle']): {
  top: number
  right: number
  bottom: number
  left: number
  horizontal: number
  vertical: number
} {
  const top = parsePixelValue(style.paddingTop)
  const right = parsePixelValue(style.paddingRight)
  const bottom = parsePixelValue(style.paddingBottom)
  const left = parsePixelValue(style.paddingLeft)
  return {
    top,
    right,
    bottom,
    left,
    horizontal: left + right,
    vertical: top + bottom,
  }
}

// =============================================================================
// Layout Info Extraction
// =============================================================================

/**
 * Extrahiert Layout-Informationen für einen Node und seine Kinder.
 */
export function getLayoutInfo(nodeId: string): LayoutInfo | null {
  const preview = document.getElementById('preview')
  if (!preview) return null

  const element = preview.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
  if (!element) return null

  const rect = element.getBoundingClientRect()
  const previewRect = preview.getBoundingClientRect()
  const style = window.getComputedStyle(element)

  // Relative to preview container
  const bounds: BoundingRect = {
    x: rect.x - previewRect.x,
    y: rect.y - previewRect.y,
    width: rect.width,
    height: rect.height,
    top: rect.top - previewRect.top,
    left: rect.left - previewRect.left,
    right: rect.right - previewRect.left,
    bottom: rect.bottom - previewRect.top,
  }

  // Parse padding
  const paddingTop = parsePixelValue(style.paddingTop)
  const paddingRight = parsePixelValue(style.paddingRight)
  const paddingBottom = parsePixelValue(style.paddingBottom)
  const paddingLeft = parsePixelValue(style.paddingLeft)

  // Content bounds (excluding padding)
  const contentBounds: BoundingRect = {
    x: bounds.x + paddingLeft,
    y: bounds.y + paddingTop,
    width: bounds.width - paddingLeft - paddingRight,
    height: bounds.height - paddingTop - paddingBottom,
    top: bounds.top + paddingTop,
    left: bounds.left + paddingLeft,
    right: bounds.right - paddingRight,
    bottom: bounds.bottom - paddingBottom,
  }

  // Get children
  const children: LayoutInfo[] = []
  const childElements = element.querySelectorAll(':scope > [data-mirror-id]')
  childElements.forEach(child => {
    const childId = child.getAttribute('data-mirror-id')
    if (childId) {
      const childInfo = getLayoutInfo(childId)
      if (childInfo) {
        children.push(childInfo)
      }
    }
  })

  return {
    nodeId,
    bounds,
    contentBounds,
    children,
    computedStyle: {
      display: style.display,
      flexDirection: style.flexDirection,
      justifyContent: style.justifyContent,
      alignItems: style.alignItems,
      gap: style.gap,
      width: style.width,
      height: style.height,
      paddingTop: style.paddingTop,
      paddingRight: style.paddingRight,
      paddingBottom: style.paddingBottom,
      paddingLeft: style.paddingLeft,
    },
  }
}

// =============================================================================
// Direction Assertions
// =============================================================================

/**
 * Prüft ob Kinder horizontal oder vertikal angeordnet sind.
 * Verifiziert sowohl CSS als auch tatsächliche Positionen.
 */
export function assertDirection(info: LayoutInfo, expected: Direction): AssertionResult {
  const details: string[] = []

  // Check CSS property first
  const cssDirection = info.computedStyle.flexDirection
  const cssIsHorizontal = cssDirection === 'row' || cssDirection === 'row-reverse'
  const cssIsVertical = cssDirection === 'column' || cssDirection === 'column-reverse'
  details.push(`CSS flexDirection: ${cssDirection}`)

  if (info.children.length < 2) {
    // Can't verify positions with < 2 children, rely on CSS
    const cssMatches =
      (expected === 'horizontal' && cssIsHorizontal) || (expected === 'vertical' && cssIsVertical)

    return {
      passed: cssMatches,
      message: cssMatches
        ? `Direction is ${expected} (verified via CSS, only ${info.children.length} child)`
        : `Expected ${expected}, but CSS flexDirection is ${cssDirection}`,
      expected,
      actual: cssIsHorizontal ? 'horizontal' : 'vertical',
      details,
    }
  }

  const tolerance = 2 // px tolerance for floating point

  // Verify actual positions
  const firstChild = info.children[0]
  let positionIsHorizontal = true
  let positionIsVertical = true
  const positionDetails: string[] = []

  for (let i = 1; i < info.children.length; i++) {
    const child = info.children[i]
    const prevChild = info.children[i - 1]

    // Horizontal: children should have similar Y, increasing X
    const yDiff = Math.abs(child.bounds.y - firstChild.bounds.y)
    const xIncreasing = child.bounds.x > prevChild.bounds.x

    if (yDiff > tolerance) {
      positionIsHorizontal = false
      positionDetails.push(`Child ${i}: Y differs by ${yDiff.toFixed(1)}px from first child`)
    }
    if (!xIncreasing) {
      positionIsHorizontal = false
      positionDetails.push(
        `Child ${i}: X (${child.bounds.x}) not after previous (${prevChild.bounds.x})`
      )
    }

    // Vertical: children should have similar X, increasing Y
    const xDiff = Math.abs(child.bounds.x - firstChild.bounds.x)
    const yIncreasing = child.bounds.y > prevChild.bounds.y

    if (xDiff > tolerance) {
      positionIsVertical = false
    }
    if (!yIncreasing) {
      positionIsVertical = false
    }
  }

  const actualDirection: Direction = positionIsHorizontal
    ? 'horizontal'
    : positionIsVertical
      ? 'vertical'
      : 'horizontal'
  const passed = actualDirection === expected

  // Also check CSS matches
  const cssMatchesExpected =
    (expected === 'horizontal' && cssIsHorizontal) || (expected === 'vertical' && cssIsVertical)

  if (!cssMatchesExpected) {
    details.push(
      `⚠️ CSS says ${cssIsHorizontal ? 'horizontal' : 'vertical'} but expected ${expected}`
    )
  }

  details.push(...positionDetails)

  return {
    passed,
    message: passed
      ? `Direction is ${expected} (CSS: ${cssDirection}, positions verified)`
      : `Expected ${expected}, but children are arranged ${actualDirection}`,
    expected,
    actual: actualDirection,
    details,
  }
}

// =============================================================================
// Size Assertions
// =============================================================================

/**
 * Prüft die Größe eines Elements.
 */
export function assertSize(
  info: LayoutInfo,
  dimension: 'width' | 'height',
  expected: number | 'hug' | 'full',
  parentInfo?: LayoutInfo
): AssertionResult {
  const actual = info.bounds[dimension]
  const tolerance = 2
  const details: string[] = [`Actual ${dimension}: ${actual.toFixed(1)}px`]

  if (typeof expected === 'number') {
    // Fixed size - must be exact (within tolerance)
    const diff = Math.abs(actual - expected)
    const passed = diff <= tolerance

    details.push(`Expected: ${expected}px, Difference: ${diff.toFixed(1)}px`)

    return {
      passed,
      message: passed
        ? `${dimension} is ${expected}px as expected`
        : `Expected ${dimension} ${expected}px, got ${actual.toFixed(1)}px (diff: ${diff.toFixed(1)}px)`,
      expected,
      actual,
      details,
    }
  }

  if (expected === 'full') {
    if (!parentInfo) {
      return {
        passed: false,
        message: `Cannot verify 'full' without parent info`,
        expected: 'full',
        actual,
        details: ['Parent info is required to verify full sizing'],
      }
    }

    // Get parent's content area (excluding padding)
    const padding = getPadding(parentInfo.computedStyle)
    const parentContentSize =
      dimension === 'width'
        ? parentInfo.bounds.width - padding.horizontal
        : parentInfo.bounds.height - padding.vertical

    details.push(`Parent ${dimension}: ${parentInfo.bounds[dimension].toFixed(1)}px`)
    details.push(
      `Parent padding: ${dimension === 'width' ? padding.horizontal : padding.vertical}px`
    )
    details.push(`Parent content area: ${parentContentSize.toFixed(1)}px`)

    // Account for siblings and gap
    const siblingCount = parentInfo.children.length
    const gapValue = parsePixelValue(parentInfo.computedStyle.gap)
    const totalGap = siblingCount > 1 ? gapValue * (siblingCount - 1) : 0

    details.push(`Siblings: ${siblingCount}, Gap: ${gapValue}px, Total gap: ${totalGap}px`)

    const availableSize = parentContentSize - totalGap

    // Calculate expected size based on siblings
    let expectedMinSize: number
    let expectedDescription: string

    if (siblingCount === 1) {
      // Only child with full: should fill ~100% of content area
      expectedMinSize = availableSize - tolerance
      expectedDescription = `Should fill parent content area (${availableSize.toFixed(1)}px)`
    } else {
      // Multiple children: full means take fair share or more
      const fairShare = availableSize / siblingCount
      expectedMinSize = fairShare * 0.9 // At least 90% of fair share
      expectedDescription = `Should take at least fair share (${fairShare.toFixed(1)}px)`
    }

    details.push(expectedDescription)

    const passed = actual >= expectedMinSize
    const percentage = ((actual / availableSize) * 100).toFixed(0)

    return {
      passed,
      message: passed
        ? `${dimension} fills container (${actual.toFixed(1)}px = ${percentage}% of available ${availableSize.toFixed(1)}px)`
        : `Expected ${dimension} to fill container (>=${expectedMinSize.toFixed(1)}px), got ${actual.toFixed(1)}px (${percentage}%)`,
      expected: 'full',
      actual,
      details,
    }
  }

  if (expected === 'hug') {
    // Hug means: size is determined by content, not stretched
    // We verify by checking:
    // 1. Element has size > 0
    // 2. Element is smaller than parent content area (if parent exists)
    // 3. CSS width/height is not a fixed percentage or 100%

    const cssValue = info.computedStyle[dimension]
    details.push(`CSS ${dimension}: ${cssValue}`)

    if (actual <= 0) {
      return {
        passed: false,
        message: `${dimension} is ${actual}px - element has no size`,
        expected: 'hug',
        actual,
        details,
      }
    }

    // Check if CSS suggests stretching
    const isStretchedByCSS =
      cssValue === '100%' ||
      cssValue.endsWith('00%') || // 100%, 200%, etc
      (parentInfo && parsePixelValue(cssValue) >= parentInfo.bounds[dimension] * 0.95)

    if (isStretchedByCSS) {
      details.push(`⚠️ CSS suggests element is stretched (${cssValue})`)
    }

    // If we have parent, verify element is smaller than parent content area
    if (parentInfo) {
      const padding = getPadding(parentInfo.computedStyle)
      const parentContentSize =
        dimension === 'width'
          ? parentInfo.bounds.width - padding.horizontal
          : parentInfo.bounds.height - padding.vertical

      details.push(`Parent content ${dimension}: ${parentContentSize.toFixed(1)}px`)

      // For hug, element should be noticeably smaller than parent (unless content fills it)
      const fillsParent = actual >= parentContentSize * 0.95

      if (fillsParent && parentInfo.children.length === 1) {
        // Single child that fills parent might still be "hug" if content is large
        // Check if there's content to measure
        details.push(
          `Element fills ${((actual / parentContentSize) * 100).toFixed(0)}% of parent - may be large content`
        )
      }

      return {
        passed: actual > 0,
        message: `${dimension} hugs content at ${actual.toFixed(1)}px (${((actual / parentContentSize) * 100).toFixed(0)}% of parent)`,
        expected: 'hug',
        actual,
        details,
      }
    }

    return {
      passed: actual > 0,
      message: `${dimension} hugs content at ${actual.toFixed(1)}px`,
      expected: 'hug',
      actual,
      details,
    }
  }

  return {
    passed: false,
    message: `Invalid expectation: ${expected}`,
    expected,
    actual,
    details,
  }
}

// =============================================================================
// Alignment Assertions
// =============================================================================

/**
 * Prüft die Ausrichtung der Kinder im Container.
 */
export function assertAlignment(
  info: LayoutInfo,
  expected: { main?: Alignment; cross?: Alignment }
): AssertionResult {
  const details: string[] = []

  if (info.children.length === 0) {
    return {
      passed: true,
      message: 'No children to verify alignment',
      expected,
      actual: null,
      details: ['Container has no children'],
    }
  }

  const tolerance = 3
  const isHorizontal =
    info.computedStyle.flexDirection === 'row' || info.computedStyle.flexDirection === 'row-reverse'
  details.push(
    `Flex direction: ${info.computedStyle.flexDirection} (${isHorizontal ? 'horizontal' : 'vertical'})`
  )

  // Get actual padding
  const padding = getPadding(info.computedStyle)
  details.push(`Padding: T${padding.top} R${padding.right} B${padding.bottom} L${padding.left}`)

  // Calculate the bounding box of all children
  const childrenBounds = {
    left: Math.min(...info.children.map(c => c.bounds.left)),
    right: Math.max(...info.children.map(c => c.bounds.right)),
    top: Math.min(...info.children.map(c => c.bounds.top)),
    bottom: Math.max(...info.children.map(c => c.bounds.bottom)),
  }

  const contentWidth = childrenBounds.right - childrenBounds.left
  const contentHeight = childrenBounds.bottom - childrenBounds.top

  // Container content area
  const containerContent = {
    left: info.bounds.left + padding.left,
    right: info.bounds.right - padding.right,
    top: info.bounds.top + padding.top,
    bottom: info.bounds.bottom - padding.bottom,
    width: info.bounds.width - padding.horizontal,
    height: info.bounds.height - padding.vertical,
  }

  details.push(
    `Content area: ${containerContent.width.toFixed(0)}x${containerContent.height.toFixed(0)}`
  )
  details.push(`Children bounds: ${contentWidth.toFixed(0)}x${contentHeight.toFixed(0)}`)

  const results: { axis: string; passed: boolean; message: string }[] = []

  // Main axis alignment
  if (expected.main) {
    const mainSize = isHorizontal ? contentWidth : contentHeight
    const availableSize = isHorizontal ? containerContent.width : containerContent.height
    const startPos = isHorizontal
      ? childrenBounds.left - containerContent.left
      : childrenBounds.top - containerContent.top
    const endPos = isHorizontal
      ? containerContent.right - childrenBounds.right
      : containerContent.bottom - childrenBounds.bottom

    details.push(`Main axis: start=${startPos.toFixed(1)}px, end=${endPos.toFixed(1)}px`)

    let mainPassed = false
    let mainMessage = ''

    switch (expected.main) {
      case 'start':
        mainPassed = startPos <= tolerance
        mainMessage = mainPassed
          ? `Main axis at start (offset: ${startPos.toFixed(1)}px)`
          : `Expected start, but offset is ${startPos.toFixed(1)}px`
        break

      case 'center':
        const centerOffset = Math.abs(startPos - endPos)
        mainPassed = centerOffset <= tolerance * 2
        mainMessage = mainPassed
          ? `Main axis centered (diff: ${centerOffset.toFixed(1)}px)`
          : `Expected center, but start=${startPos.toFixed(1)}px, end=${endPos.toFixed(1)}px (diff: ${centerOffset.toFixed(1)}px)`
        break

      case 'end':
        mainPassed = endPos <= tolerance
        mainMessage = mainPassed
          ? `Main axis at end (offset: ${endPos.toFixed(1)}px)`
          : `Expected end, but offset is ${endPos.toFixed(1)}px from end`
        break

      case 'space-between':
        if (info.children.length < 2) {
          mainPassed = true
          mainMessage = 'Space-between with single child (trivially true)'
        } else {
          const firstAtStart = startPos <= tolerance
          const lastAtEnd = endPos <= tolerance
          mainPassed = firstAtStart && lastAtEnd
          mainMessage = mainPassed
            ? `Space-between: first at start, last at end`
            : `Expected space-between: first offset=${startPos.toFixed(1)}px, last offset=${endPos.toFixed(1)}px`
        }
        break
    }

    results.push({ axis: 'main', passed: mainPassed, message: mainMessage })
  }

  // Cross axis alignment
  if (expected.cross) {
    const crossSize = isHorizontal ? contentHeight : contentWidth
    const availableCrossSize = isHorizontal ? containerContent.height : containerContent.width

    // For cross-axis, check each child's position
    let crossPassed = true
    const crossDetails: string[] = []

    for (let i = 0; i < info.children.length; i++) {
      const child = info.children[i]
      const childCrossStart = isHorizontal
        ? child.bounds.top - containerContent.top
        : child.bounds.left - containerContent.left
      const childCrossEnd = isHorizontal
        ? containerContent.bottom - child.bounds.bottom
        : containerContent.right - child.bounds.right
      const childCrossSize = isHorizontal ? child.bounds.height : child.bounds.width

      switch (expected.cross) {
        case 'start':
          if (childCrossStart > tolerance) {
            crossPassed = false
            crossDetails.push(`Child ${i}: offset ${childCrossStart.toFixed(1)}px from start`)
          }
          break

        case 'center':
          const centerDiff = Math.abs(childCrossStart - childCrossEnd)
          if (centerDiff > tolerance * 2) {
            crossPassed = false
            crossDetails.push(`Child ${i}: not centered (diff: ${centerDiff.toFixed(1)}px)`)
          }
          break

        case 'end':
          if (childCrossEnd > tolerance) {
            crossPassed = false
            crossDetails.push(`Child ${i}: offset ${childCrossEnd.toFixed(1)}px from end`)
          }
          break

        case 'space-between':
          // Space-between on cross axis doesn't make sense for single items
          // Skip validation
          break
      }
    }

    const crossMessage = crossPassed
      ? `Cross axis: ${expected.cross}`
      : `Cross axis: expected ${expected.cross}, issues found`

    results.push({ axis: 'cross', passed: crossPassed, message: crossMessage })
    if (crossDetails.length > 0) {
      details.push(...crossDetails)
    }
  }

  const allPassed = results.every(r => r.passed)

  return {
    passed: allPassed,
    message: results.map(r => `${r.passed ? '✓' : '✗'} ${r.message}`).join('; '),
    expected,
    actual: {
      justifyContent: info.computedStyle.justifyContent,
      alignItems: info.computedStyle.alignItems,
    },
    details,
  }
}

// =============================================================================
// Gap Assertions
// =============================================================================

/**
 * Prüft den Abstand zwischen Kindern.
 */
export function assertGap(info: LayoutInfo, expected: number): AssertionResult {
  const details: string[] = []
  details.push(`CSS gap: ${info.computedStyle.gap}`)

  if (info.children.length < 2) {
    return {
      passed: true,
      message: `Cannot verify gap with ${info.children.length} child(ren)`,
      expected,
      actual: null,
      details: ['Need at least 2 children to measure gap'],
    }
  }

  const tolerance = 2
  const isHorizontal =
    info.computedStyle.flexDirection === 'row' || info.computedStyle.flexDirection === 'row-reverse'
  details.push(`Direction: ${isHorizontal ? 'horizontal' : 'vertical'}`)

  const gaps: number[] = []

  for (let i = 1; i < info.children.length; i++) {
    const prev = info.children[i - 1]
    const curr = info.children[i]
    const gap = isHorizontal
      ? curr.bounds.left - prev.bounds.right
      : curr.bounds.top - prev.bounds.bottom
    gaps.push(gap)
    details.push(`Gap ${i - 1}→${i}: ${gap.toFixed(1)}px`)
  }

  const minGap = Math.min(...gaps)
  const maxGap = Math.max(...gaps)
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length

  details.push(`Gap range: ${minGap.toFixed(1)}px - ${maxGap.toFixed(1)}px`)
  details.push(`Gap average: ${avgGap.toFixed(1)}px`)

  // Check if all gaps are consistent
  const gapVariation = maxGap - minGap
  if (gapVariation > tolerance) {
    details.push(`⚠️ Gap variation: ${gapVariation.toFixed(1)}px (inconsistent)`)
  }

  // Primary check: average gap matches expected
  const passed = Math.abs(avgGap - expected) <= tolerance

  // Secondary check: all gaps are close to expected
  const allGapsMatch = gaps.every(g => Math.abs(g - expected) <= tolerance)

  return {
    passed,
    message: passed
      ? allGapsMatch
        ? `Gap is ${expected}px as expected (all ${gaps.length} gaps match)`
        : `Gap averages ${avgGap.toFixed(1)}px ≈ ${expected}px (some variation)`
      : `Expected gap ${expected}px, got average ${avgGap.toFixed(1)}px (range: ${minGap.toFixed(1)}-${maxGap.toFixed(1)}px)`,
    expected,
    actual: { average: avgGap, min: minGap, max: maxGap, gaps },
    details,
  }
}

// =============================================================================
// Composite Layout Assertion
// =============================================================================

/**
 * Führt alle Layout-Assertions für einen Container durch.
 */
export function assertLayout(nodeId: string, expectations: LayoutExpectation): AssertionResult[] {
  const info = getLayoutInfo(nodeId)
  if (!info) {
    return [
      {
        passed: false,
        message: `Node ${nodeId} not found`,
        details: ['Element with data-mirror-id not found in preview'],
      },
    ]
  }

  const results: AssertionResult[] = []

  if (expectations.direction) {
    results.push(assertDirection(info, expectations.direction))
  }

  if (expectations.alignment) {
    results.push(assertAlignment(info, expectations.alignment))
  }

  if (expectations.gap !== undefined) {
    results.push(assertGap(info, expectations.gap))
  }

  if (expectations.children) {
    for (const childExp of expectations.children) {
      const child = info.children[childExp.index]
      if (!child) {
        results.push({
          passed: false,
          message: `Child at index ${childExp.index} not found`,
          details: [
            `Container has ${info.children.length} children, requested index ${childExp.index}`,
          ],
        })
        continue
      }

      if (childExp.width !== undefined) {
        results.push(assertSize(child, 'width', childExp.width as any, info))
      }
      if (childExp.height !== undefined) {
        results.push(assertSize(child, 'height', childExp.height as any, info))
      }
    }
  }

  return results
}

// =============================================================================
// Pixel-Accurate Layout Assertions
// =============================================================================

/**
 * Prüft den tatsächlichen Pixel-Abstand zwischen Kindern mittels DOM-Messung.
 * Im Gegensatz zu assertGap (das CSS prüft) misst diese Funktion echte Positionen.
 */
export function assertActualGap(
  parentId: string,
  expectedGap: number,
  tolerance: number = 2
): AssertionResult {
  const preview = document.getElementById('preview')
  if (!preview) {
    return { passed: false, message: 'Preview container not found' }
  }

  const container = preview.querySelector(`[data-mirror-id="${parentId}"]`) as HTMLElement
  if (!container) {
    return { passed: false, message: `Parent ${parentId} not found` }
  }

  const children = Array.from(container.children).filter(el =>
    el.hasAttribute('data-mirror-id')
  ) as HTMLElement[]

  if (children.length < 2) {
    return {
      passed: false,
      message: 'Need at least 2 children to measure gap',
      details: [`Found ${children.length} children with data-mirror-id`],
    }
  }

  const style = getComputedStyle(container)
  const isHorizontal = style.flexDirection === 'row' || style.flexDirection === 'row-reverse'

  const gaps: number[] = []
  for (let i = 0; i < children.length - 1; i++) {
    const rect1 = children[i].getBoundingClientRect()
    const rect2 = children[i + 1].getBoundingClientRect()

    const gap = isHorizontal ? rect2.left - rect1.right : rect2.top - rect1.bottom
    gaps.push(gap)
  }

  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
  const minGap = Math.min(...gaps)
  const maxGap = Math.max(...gaps)
  const passed = Math.abs(avgGap - expectedGap) <= tolerance

  return {
    passed,
    message: passed
      ? `Actual gap is ${avgGap.toFixed(1)}px (expected ${expectedGap}px)`
      : `Gap mismatch: expected ${expectedGap}px, got ${avgGap.toFixed(1)}px`,
    expected: expectedGap,
    actual: avgGap,
    details: [
      `Direction: ${isHorizontal ? 'horizontal' : 'vertical'}`,
      `Individual gaps: ${gaps.map(g => g.toFixed(1)).join(', ')}px`,
      `Range: ${minGap.toFixed(1)}px - ${maxGap.toFixed(1)}px`,
    ],
  }
}

/**
 * Prüft ob ein Element tatsächlich den verfügbaren Platz füllt (grow behavior).
 */
export function assertFillsSpace(
  nodeId: string,
  dimension: 'width' | 'height',
  tolerance: number = 5
): AssertionResult {
  const preview = document.getElementById('preview')
  if (!preview) {
    return { passed: false, message: 'Preview container not found' }
  }

  const element = preview.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
  if (!element) {
    return { passed: false, message: `Element ${nodeId} not found` }
  }

  const parent = element.parentElement
  if (!parent) {
    return { passed: false, message: 'Parent element not found' }
  }

  const elementRect = element.getBoundingClientRect()
  const parentRect = parent.getBoundingClientRect()
  const parentStyle = getComputedStyle(parent)

  // Calculate parent's content area (excluding padding)
  const paddingLeft = parseFloat(parentStyle.paddingLeft) || 0
  const paddingRight = parseFloat(parentStyle.paddingRight) || 0
  const paddingTop = parseFloat(parentStyle.paddingTop) || 0
  const paddingBottom = parseFloat(parentStyle.paddingBottom) || 0

  const parentContentWidth = parentRect.width - paddingLeft - paddingRight
  const parentContentHeight = parentRect.height - paddingTop - paddingBottom

  const parentContentSize = dimension === 'width' ? parentContentWidth : parentContentHeight
  const elementSize = dimension === 'width' ? elementRect.width : elementRect.height

  // Account for siblings
  const siblings = Array.from(parent.children).filter(el =>
    el.hasAttribute('data-mirror-id')
  ) as HTMLElement[]
  const siblingCount = siblings.length

  // Calculate total gap space
  const gapStr = parentStyle.gap || '0px'
  const gap = parseFloat(gapStr) || 0
  const totalGap = siblingCount > 1 ? gap * (siblingCount - 1) : 0

  // Calculate space taken by other siblings
  let siblingSpace = 0
  for (const sibling of siblings) {
    if (sibling !== element) {
      const siblingRect = sibling.getBoundingClientRect()
      siblingSpace += dimension === 'width' ? siblingRect.width : siblingRect.height
    }
  }

  const availableSpace = parentContentSize - totalGap - siblingSpace
  const fillPercentage = (elementSize / availableSpace) * 100
  const passed = fillPercentage >= 100 - tolerance

  return {
    passed,
    message: passed
      ? `Element fills ${fillPercentage.toFixed(0)}% of available ${dimension}`
      : `Element only fills ${fillPercentage.toFixed(0)}% of available ${dimension} (expected ~100%)`,
    expected: 'fills available space',
    actual: `${elementSize.toFixed(1)}px of ${availableSpace.toFixed(1)}px available`,
    details: [
      `Parent content ${dimension}: ${parentContentSize.toFixed(1)}px`,
      `Sibling space: ${siblingSpace.toFixed(1)}px`,
      `Gap space: ${totalGap.toFixed(1)}px`,
      `Available: ${availableSpace.toFixed(1)}px`,
      `Element size: ${elementSize.toFixed(1)}px`,
    ],
  }
}

/**
 * Prüft die relative Position zweier Elemente zueinander.
 */
export function assertRelativePosition(
  nodeA: string,
  nodeB: string,
  relation: 'above' | 'below' | 'left-of' | 'right-of',
  minGap?: number
): AssertionResult {
  const preview = document.getElementById('preview')
  if (!preview) {
    return { passed: false, message: 'Preview container not found' }
  }

  const elementA = preview.querySelector(`[data-mirror-id="${nodeA}"]`) as HTMLElement
  const elementB = preview.querySelector(`[data-mirror-id="${nodeB}"]`) as HTMLElement

  if (!elementA) {
    return { passed: false, message: `Element ${nodeA} not found` }
  }
  if (!elementB) {
    return { passed: false, message: `Element ${nodeB} not found` }
  }

  const rectA = elementA.getBoundingClientRect()
  const rectB = elementB.getBoundingClientRect()

  let passed = false
  let actualGap = 0
  let message = ''

  switch (relation) {
    case 'above':
      // A is above B: A's bottom <= B's top
      actualGap = rectB.top - rectA.bottom
      passed = rectA.bottom <= rectB.top
      message = passed
        ? `${nodeA} is above ${nodeB} (gap: ${actualGap.toFixed(1)}px)`
        : `${nodeA} is NOT above ${nodeB} (A bottom: ${rectA.bottom.toFixed(1)}, B top: ${rectB.top.toFixed(1)})`
      break

    case 'below':
      // A is below B: A's top >= B's bottom
      actualGap = rectA.top - rectB.bottom
      passed = rectA.top >= rectB.bottom
      message = passed
        ? `${nodeA} is below ${nodeB} (gap: ${actualGap.toFixed(1)}px)`
        : `${nodeA} is NOT below ${nodeB} (A top: ${rectA.top.toFixed(1)}, B bottom: ${rectB.bottom.toFixed(1)})`
      break

    case 'left-of':
      // A is left of B: A's right <= B's left
      actualGap = rectB.left - rectA.right
      passed = rectA.right <= rectB.left
      message = passed
        ? `${nodeA} is left of ${nodeB} (gap: ${actualGap.toFixed(1)}px)`
        : `${nodeA} is NOT left of ${nodeB} (A right: ${rectA.right.toFixed(1)}, B left: ${rectB.left.toFixed(1)})`
      break

    case 'right-of':
      // A is right of B: A's left >= B's right
      actualGap = rectA.left - rectB.right
      passed = rectA.left >= rectB.right
      message = passed
        ? `${nodeA} is right of ${nodeB} (gap: ${actualGap.toFixed(1)}px)`
        : `${nodeA} is NOT right of ${nodeB} (A left: ${rectA.left.toFixed(1)}, B right: ${rectB.right.toFixed(1)})`
      break
  }

  // Check minimum gap if specified
  if (passed && minGap !== undefined && actualGap < minGap) {
    passed = false
    message = `${nodeA} is ${relation} ${nodeB} but gap (${actualGap.toFixed(1)}px) is less than required (${minGap}px)`
  }

  return {
    passed,
    message,
    expected: minGap !== undefined ? `${relation} with >= ${minGap}px gap` : relation,
    actual: `gap: ${actualGap.toFixed(1)}px`,
    details: [
      `A bounds: left=${rectA.left.toFixed(1)}, right=${rectA.right.toFixed(1)}, top=${rectA.top.toFixed(1)}, bottom=${rectA.bottom.toFixed(1)}`,
      `B bounds: left=${rectB.left.toFixed(1)}, right=${rectB.right.toFixed(1)}, top=${rectB.top.toFixed(1)}, bottom=${rectB.bottom.toFixed(1)}`,
    ],
  }
}

/**
 * Prüft die exakte Größe eines Elements in Pixeln.
 */
export function assertExactSize(
  nodeId: string,
  width: number,
  height: number,
  tolerance: number = 2
): AssertionResult {
  const preview = document.getElementById('preview')
  if (!preview) {
    return { passed: false, message: 'Preview container not found' }
  }

  const element = preview.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
  if (!element) {
    return { passed: false, message: `Element ${nodeId} not found` }
  }

  const rect = element.getBoundingClientRect()
  const actualWidth = rect.width
  const actualHeight = rect.height

  const widthOk = Math.abs(actualWidth - width) <= tolerance
  const heightOk = Math.abs(actualHeight - height) <= tolerance
  const passed = widthOk && heightOk

  const issues: string[] = []
  if (!widthOk) {
    issues.push(`width: expected ${width}px, got ${actualWidth.toFixed(1)}px`)
  }
  if (!heightOk) {
    issues.push(`height: expected ${height}px, got ${actualHeight.toFixed(1)}px`)
  }

  return {
    passed,
    message: passed
      ? `Element ${nodeId} is ${width}x${height}px as expected`
      : `Size mismatch: ${issues.join('; ')}`,
    expected: { width, height },
    actual: { width: actualWidth, height: actualHeight },
    details: [
      `Expected: ${width}px x ${height}px`,
      `Actual: ${actualWidth.toFixed(1)}px x ${actualHeight.toFixed(1)}px`,
      `Tolerance: ${tolerance}px`,
    ],
  }
}

/**
 * Prüft ob ein Element innerhalb seines Parents zentriert ist.
 */
export function assertCentered(
  nodeId: string,
  axis: 'horizontal' | 'vertical' | 'both',
  tolerance: number = 3
): AssertionResult {
  const preview = document.getElementById('preview')
  if (!preview) {
    return { passed: false, message: 'Preview container not found' }
  }

  const element = preview.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
  if (!element) {
    return { passed: false, message: `Element ${nodeId} not found` }
  }

  const parent = element.parentElement
  if (!parent) {
    return { passed: false, message: 'Parent element not found' }
  }

  const elementRect = element.getBoundingClientRect()
  const parentRect = parent.getBoundingClientRect()
  const parentStyle = getComputedStyle(parent)

  // Calculate parent's content area
  const paddingLeft = parseFloat(parentStyle.paddingLeft) || 0
  const paddingRight = parseFloat(parentStyle.paddingRight) || 0
  const paddingTop = parseFloat(parentStyle.paddingTop) || 0
  const paddingBottom = parseFloat(parentStyle.paddingBottom) || 0

  const parentContentLeft = parentRect.left + paddingLeft
  const parentContentRight = parentRect.right - paddingRight
  const parentContentTop = parentRect.top + paddingTop
  const parentContentBottom = parentRect.bottom - paddingBottom

  const issues: string[] = []
  let horizontalOk = true
  let verticalOk = true

  if (axis === 'horizontal' || axis === 'both') {
    const leftSpace = elementRect.left - parentContentLeft
    const rightSpace = parentContentRight - elementRect.right
    const diff = Math.abs(leftSpace - rightSpace)
    horizontalOk = diff <= tolerance
    if (!horizontalOk) {
      issues.push(
        `horizontal: left space ${leftSpace.toFixed(1)}px, right space ${rightSpace.toFixed(1)}px (diff: ${diff.toFixed(1)}px)`
      )
    }
  }

  if (axis === 'vertical' || axis === 'both') {
    const topSpace = elementRect.top - parentContentTop
    const bottomSpace = parentContentBottom - elementRect.bottom
    const diff = Math.abs(topSpace - bottomSpace)
    verticalOk = diff <= tolerance
    if (!verticalOk) {
      issues.push(
        `vertical: top space ${topSpace.toFixed(1)}px, bottom space ${bottomSpace.toFixed(1)}px (diff: ${diff.toFixed(1)}px)`
      )
    }
  }

  const passed = horizontalOk && verticalOk

  return {
    passed,
    message: passed
      ? `Element ${nodeId} is centered ${axis === 'both' ? 'horizontally and vertically' : axis + 'ly'}`
      : `Element ${nodeId} is NOT centered: ${issues.join('; ')}`,
    expected: `centered ${axis}`,
    actual: issues.length > 0 ? issues.join('; ') : 'centered',
    details: issues,
  }
}

// =============================================================================
// Export for Test API
// =============================================================================

export const layoutAssertions = {
  getLayoutInfo,
  assertDirection,
  assertSize,
  assertAlignment,
  assertGap,
  assertLayout,
  // New pixel-accurate assertions
  assertActualGap,
  assertFillsSpace,
  assertRelativePosition,
  assertExactSize,
  assertCentered,
}
