/**
 * @module validation/pipeline
 * @description Unified validation pipeline
 *
 * This is the main entry point for all validation in Mirror DSL.
 */

export {
  validate,
  isValid,
  getFirstError,
  validateAndCorrect,
  type ValidationMode,
  type ValidationOptions,
} from './validate'
