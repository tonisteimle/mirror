/**
 * Segment Primitive Module
 *
 * Renders Segment components for masked input patterns (PIN, OTP, Phone, Credit Card).
 * Features:
 * - Character length constraints
 * - Character type filtering (digits, alpha, alphanumeric)
 * - Auto-focus next segment on fill
 * - Auto-focus previous segment on empty backspace
 * - Custom events: onfill, onempty, oncomplete
 */

import React, { useRef, useEffect, useCallback, useState } from 'react'
import type { ASTNode, EventHandler, ActionStatement, Conditional } from '../../parser/parser'

export interface SegmentProps {
  node: ASTNode
  style: React.CSSProperties
  index: number
  totalSegments: number
  onFill?: () => void
  onEmpty?: () => void
  onComplete?: () => void
  onFocusNext?: () => void
  onFocusPrev?: () => void
  registerRef?: (index: number, ref: HTMLInputElement | null) => void
  executeActions?: (actions: (ActionStatement | Conditional)[]) => void
}

// Character type filters
const TYPE_PATTERNS: Record<string, RegExp> = {
  digits: /^[0-9]$/,
  alpha: /^[a-zA-Z]$/,
  alphanumeric: /^[a-zA-Z0-9]$/,
}

/**
 * Get the event handler for a specific event.
 */
function getEventHandler(node: ASTNode, eventName: string): EventHandler | undefined {
  return node.eventHandlers?.find(h => h.event === eventName)
}

/**
 * Segment Input Component
 */
export function SegmentInput({
  node,
  style,
  index,
  totalSegments,
  onFill,
  onEmpty,
  onComplete,
  onFocusNext,
  onFocusPrev,
  registerRef,
  executeActions,
}: SegmentProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')

  // Extract segment properties
  const maxLength = (node.properties.length as number) || 1
  const segmentType = (node.properties.type as string) || 'alphanumeric'
  const pattern = node.properties.pattern as string | undefined
  const isMasked = node.properties.mask === true

  // Register ref with parent
  useEffect(() => {
    registerRef?.(index, inputRef.current)
    return () => registerRef?.(index, null)
  }, [index, registerRef])

  // Validate character against type
  const isValidChar = useCallback((char: string): boolean => {
    // Custom pattern takes precedence
    if (pattern) {
      try {
        return new RegExp(pattern).test(char)
      } catch {
        return true
      }
    }

    // Use type-based pattern
    const typePattern = TYPE_PATTERNS[segmentType]
    return typePattern ? typePattern.test(char) : true
  }, [pattern, segmentType])

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value

    // Filter invalid characters
    const filteredValue = newValue
      .split('')
      .filter(char => isValidChar(char))
      .slice(0, maxLength)
      .join('')

    // Transform if needed
    const transformedValue = node.properties.uppercase
      ? filteredValue.toUpperCase()
      : filteredValue

    setValue(transformedValue)

    // Check if segment is now filled
    if (transformedValue.length >= maxLength) {
      onFill?.()

      // Execute onfill actions
      const onfillHandler = getEventHandler(node, 'onfill')
      if (onfillHandler && executeActions) {
        executeActions(onfillHandler.actions)
      }

      // Auto-focus next segment
      onFocusNext?.()
    }

    // Trigger onchange if handler exists
    const onchangeHandler = getEventHandler(node, 'onchange')
    if (onchangeHandler && executeActions) {
      executeActions(onchangeHandler.actions)
    }
  }, [isValidChar, maxLength, node, onFill, onFocusNext, executeActions])

  // Handle keydown for backspace navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && value.length === 0) {
      // Segment is empty and backspace pressed - go to previous
      onEmpty?.()

      // Execute onempty actions
      const onemptyHandler = getEventHandler(node, 'onempty')
      if (onemptyHandler && executeActions) {
        executeActions(onemptyHandler.actions)
      }

      // Auto-focus previous segment
      onFocusPrev?.()
    }

    // Handle arrow keys for navigation
    if (e.key === 'ArrowLeft' && inputRef.current?.selectionStart === 0) {
      onFocusPrev?.()
    }
    if (e.key === 'ArrowRight' && inputRef.current?.selectionStart === value.length) {
      onFocusNext?.()
    }
  }, [value, node, onEmpty, onFocusPrev, onFocusNext, executeActions])

  // Handle paste
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')

    // Filter and limit pasted text
    const filteredText = pastedText
      .split('')
      .filter(char => isValidChar(char))
      .slice(0, maxLength)
      .join('')

    const transformedText = node.properties.uppercase
      ? filteredText.toUpperCase()
      : filteredText

    setValue(transformedText)

    if (transformedText.length >= maxLength) {
      onFill?.()
      onFocusNext?.()
    }
  }, [isValidChar, maxLength, node.properties.uppercase, onFill, onFocusNext])

  // Determine input type
  const inputType = isMasked ? 'password' : 'text'

  // Merge styles
  const segmentStyle: React.CSSProperties = {
    textAlign: 'center',
    caretColor: 'currentColor',
    ...style,
  }

  return (
    <input
      ref={inputRef}
      type={inputType}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      maxLength={maxLength}
      data-id={node.id}
      data-segment-index={index}
      className={node.name}
      style={segmentStyle}
      autoComplete="off"
      inputMode={segmentType === 'digits' ? 'numeric' : 'text'}
    />
  )
}

/**
 * Segment Container - Manages multiple segments
 */
export interface SegmentContainerProps {
  children: React.ReactNode
  onComplete?: () => void
  executeActions?: (actions: (ActionStatement | Conditional)[]) => void
  node?: ASTNode
}

export function SegmentContainer({
  children,
  onComplete,
  executeActions,
  node,
}: SegmentContainerProps): React.JSX.Element {
  const segmentRefs = useRef<Map<number, HTMLInputElement | null>>(new Map())
  const [filledSegments, setFilledSegments] = useState<Set<number>>(new Set())

  const totalSegments = React.Children.count(children)

  const registerRef = useCallback((index: number, ref: HTMLInputElement | null) => {
    if (ref) {
      segmentRefs.current.set(index, ref)
    } else {
      segmentRefs.current.delete(index)
    }
  }, [])

  const focusSegment = useCallback((index: number) => {
    const ref = segmentRefs.current.get(index)
    if (ref) {
      ref.focus()
      // Move cursor to end
      const length = ref.value.length
      ref.setSelectionRange(length, length)
    }
  }, [])

  const focusNext = useCallback((currentIndex: number) => {
    if (currentIndex < totalSegments - 1) {
      focusSegment(currentIndex + 1)
    }
  }, [totalSegments, focusSegment])

  const focusPrev = useCallback((currentIndex: number) => {
    if (currentIndex > 0) {
      focusSegment(currentIndex - 1)
    }
  }, [focusSegment])

  const focusFirstEmpty = useCallback(() => {
    for (let i = 0; i < totalSegments; i++) {
      const ref = segmentRefs.current.get(i)
      if (ref && !ref.value) {
        ref.focus()
        return
      }
    }
  }, [totalSegments])

  const handleSegmentFill = useCallback((index: number) => {
    setFilledSegments(prev => {
      const next = new Set(prev)
      next.add(index)

      // Check if all segments are filled
      if (next.size === totalSegments) {
        onComplete?.()

        // Execute oncomplete actions
        if (node) {
          const oncompleteHandler = node.eventHandlers?.find(h => h.event === 'oncomplete')
          if (oncompleteHandler && executeActions) {
            executeActions(oncompleteHandler.actions)
          }
        }
      }

      return next
    })
  }, [totalSegments, onComplete, node, executeActions])

  const handleSegmentEmpty = useCallback((index: number) => {
    setFilledSegments(prev => {
      const next = new Set(prev)
      next.delete(index)
      return next
    })
  }, [])

  // Clone children with additional props
  const enhancedChildren = React.Children.map(children, (child, index) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<SegmentProps>, {
        index,
        totalSegments,
        onFill: () => handleSegmentFill(index),
        onEmpty: () => handleSegmentEmpty(index),
        onFocusNext: () => focusNext(index),
        onFocusPrev: () => focusPrev(index),
        registerRef,
        executeActions,
      })
    }
    return child
  })

  return <>{enhancedChildren}</>
}
