/**
 * Primitives Module Index
 *
 * Barrel export for all primitive-related functions and components.
 */

// Primitive type checkers
export {
  isInputPrimitive,
  isTextareaPrimitive,
  isLinkPrimitive,
  isIconComponent,
  isImageComponent,
  isHeadingPrimitive,
  isHeadingComponent,
  isSegmentComponent,
  isSegmentPrimitive,
  getHeadingLevel
} from './primitive-checkers'

// Render functions
export {
  renderInput,
  renderTextarea,
  renderLink,
  renderIcon,
  renderImageElement,
  renderHeading,
  getImageSrc
} from './primitive-renderers'

// Segment primitives
export { SegmentInput, SegmentContainer } from './segment-primitive'
