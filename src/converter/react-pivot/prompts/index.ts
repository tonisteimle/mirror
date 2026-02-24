/**
 * @module converter/react-pivot/prompts
 * @description Prompts for the React-Pivot transformation pipeline
 */

export { REACT_SYSTEM_PROMPT } from './system'
export {
  generateCorrectionPrompt,
  generateColorCorrectionPrompt,
  type ErrorCategory,
  type CorrectionError,
} from './correction'
