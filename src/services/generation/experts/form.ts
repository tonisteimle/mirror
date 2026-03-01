/**
 * Form Expert
 *
 * Combines:
 * 1. LLM prompt for decision-making
 * 2. Schema validation
 * 3. Deterministic code generation
 */

import {
  FORM_SYSTEM_PROMPT,
  createFormPrompt,
  parseFormLLMResponse
} from '../prompts/form';
import type { FormInput } from '../schemas/form';
import {
  FormInputSchema,
  validateFormInput,
  parseForm
} from '../schemas/form';
import { buildForm } from '../builders/form';
import type { ExpertManifest } from '../types';

// =============================================================================
// MANIFEST
// =============================================================================

export const manifest: ExpertManifest = {
  // Identity
  name: 'form',
  description: 'Generates form components with fields, validation, and actions',
  category: 'input',
  version: '1.0.0',

  // Dependencies
  primitives: ['button', 'input', 'label', 'icon'],
  patterns: ['field', 'action-bar'],
  composableWith: ['dialog', 'card'],

  // Dimensions
  dimensions: {
    shared: {
      density: true,
      background: true,
      radius: true,
    },
    custom: {
      layout: {
        options: ['vertical', 'horizontal', 'inline', 'grid'],
        default: 'vertical',
        phase: 'mvp',
        description: 'Form layout direction',
      },
      labelPosition: {
        options: ['top', 'left', 'floating', 'hidden'],
        default: 'top',
        phase: 'mvp',
        description: 'Where labels appear relative to inputs',
      },
      requiredStyle: {
        options: ['asterisk', 'text', 'dot', 'none'],
        default: 'asterisk',
        phase: 'mvp',
        description: 'How required fields are marked',
      },
      errorDisplay: {
        options: ['below', 'inline', 'tooltip', 'summary'],
        default: 'below',
        phase: 'mvp',
        description: 'How validation errors are shown',
      },
      submitPosition: {
        options: ['bottom', 'inline', 'sticky', 'none'],
        default: 'bottom',
        phase: 'mvp',
        description: 'Where submit button appears',
      },
    },
  },

  // Schemas
  inputSchema: FormInputSchema,

  // Contracts
  guarantees: [
    'Generates valid Mirror code',
    'All fields have Label, Input, and Error slots',
    'Focus and invalid states are always defined',
    'Uses semantic color roles (no hardcoded colors)',
    'Password fields support show/hide toggle',
  ],

  limitations: [
    'Maximum 20 fields per form',
    'Grid layout limited to 4 columns',
    'No multi-step wizard support (MVP)',
    'No file upload support (MVP)',
    'No async validation',
  ],

  // Detection
  detectionPatterns: [
    /\b(form|formular|eingabe|input)\b/i,
    /\b(login|anmelden|registr|signup|sign.?up)\b/i,
    /\b(kontakt|contact|anfrage)\b/i,
    /\b(einstellungen|settings|profile|profil)\b/i,
    /\b(passwort|password|email|e-mail)\b/i,
  ],

  examplePrompts: [
    'Login-Formular mit Email und Passwort',
    'Signup form with name, email, and password confirmation',
    'Kontaktformular mit Name, Email, und Nachricht',
    'Settings form with notification preferences',
    'Compact inline search form',
  ],
};

export interface FormResult {
  success: boolean;
  code?: string;
  schema?: FormInput;
  error?: string;
}

/**
 * Generate form from natural language request
 *
 * @param request - Natural language description (e.g., "Login form with email and password")
 * @param llmCall - Function to call the LLM
 */
export async function generateForm(
  request: string,
  llmCall: (systemPrompt: string, userPrompt: string) => Promise<string>
): Promise<FormResult> {
  try {
    // Step 1: Call LLM to get JSON decisions
    const userPrompt = createFormPrompt(request);
    const llmResponse = await llmCall(FORM_SYSTEM_PROMPT, userPrompt);

    // Step 2: Parse JSON from response
    let parsedJson: unknown;
    try {
      parsedJson = parseFormLLMResponse(llmResponse);
    } catch (e) {
      return {
        success: false,
        error: `Failed to parse LLM response: ${e instanceof Error ? e.message : 'Unknown error'}`
      };
    }

    // Step 3: Validate against schema
    const validation = validateFormInput(parsedJson);
    if (!validation.success) {
      return {
        success: false,
        error: `Invalid schema: ${validation.error}`
      };
    }

    // Step 4: Generate Mirror code
    const schema = parsedJson as FormInput;
    const code = buildForm(schema);

    return {
      success: true,
      code,
      schema
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}

/**
 * Generate form from pre-defined schema (no LLM)
 * Useful for testing or when schema is already known
 */
export function generateFormFromSchema(
  schema: FormInput
): FormResult {
  const validation = validateFormInput(schema);

  if (!validation.success) {
    return {
      success: false,
      error: `Invalid schema: ${validation.error}`
    };
  }

  const code = buildForm(schema);

  return {
    success: true,
    code,
    schema
  };
}

/**
 * Get the system prompt for the form expert
 * Useful for debugging or testing
 */
export function getFormSystemPrompt(): string {
  return FORM_SYSTEM_PROMPT;
}

/**
 * Get the user prompt for a request
 * Useful for debugging or testing
 */
export function getFormUserPrompt(request: string): string {
  return createFormPrompt(request);
}
