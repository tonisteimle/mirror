/**
 * Primitives Module Index
 *
 * Barrel export for all primitive-related functions and components.
 */

// Primitive type checkers
export {
  isButtonPrimitive,
  isInputPrimitive,
  isTextareaPrimitive,
  isLinkPrimitive,
  isIconComponent,
  isImageComponent,
  isHeadingPrimitive,
  isHeadingComponent,
  isSegmentComponent,
  isSegmentPrimitive,
  isSelectComponent,
  isSelectPrimitive,
  isOptionPrimitive,
  getHeadingLevel
} from './primitive-checkers'

// Render functions
export {
  renderButton,
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

// Native select primitives
export { renderNativeSelect, generateSelectCSS } from './native-select-renderer'
