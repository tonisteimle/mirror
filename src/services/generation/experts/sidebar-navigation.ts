/**
 * Sidebar Navigation Expert
 *
 * Combines:
 * 1. LLM prompt for decision-making
 * 2. Schema validation
 * 3. Deterministic code generation
 */

import {
  SIDEBAR_NAVIGATION_SYSTEM_PROMPT,
  createSidebarNavigationPrompt,
  parseLLMResponse
} from '../prompts/sidebar-navigation';
import type { SidebarNavigationInput } from '../schemas/sidebar-navigation';
import {
  SidebarNavigationInputSchema,
  validateSidebarNavigationInput,
  parseSidebarNavigation
} from '../schemas/sidebar-navigation';
import { buildSidebarNavigation } from '../builders/sidebar-navigation';
import type { ExpertManifest } from '../types';

// =============================================================================
// MANIFEST
// =============================================================================

export const manifest: ExpertManifest = {
  // Identity
  name: 'sidebar-navigation',
  description: 'Generates sidebar navigation components with items, groups, and tree structures',
  category: 'navigation',
  version: '2.0.0',

  // Dependencies
  primitives: ['icon'],
  patterns: ['item'],
  composableWith: ['form', 'dialog'],

  // Dimensions
  dimensions: {
    shared: {
      density: true,
      background: true,
      radius: true,
    },
    custom: {
      visibility: {
        options: ['permanent', 'collapsible', 'drawer'],
        default: 'permanent',
        phase: 'mvp',
        description: 'How the navigation is shown/hidden',
      },
      structure: {
        options: ['flat', 'grouped', 'tree'],
        default: 'flat',
        phase: 'mvp',
        description: 'How items are organized',
      },
      itemDisplay: {
        options: ['icon-text', 'icon-only', 'text-only'],
        default: 'icon-text',
        phase: 'phase2',
        description: 'What to show in each item',
      },
      badges: {
        options: ['none', 'count', 'status'],
        default: 'none',
        phase: 'phase2',
        description: 'Badge/counter support',
      },
    },
  },

  // Schemas
  inputSchema: SidebarNavigationInputSchema,

  // Contracts
  guarantees: [
    'Generates valid Mirror code',
    'All items have icon and label slots',
    'Hover and active states are always defined',
    'Uses semantic color roles (no hardcoded colors)',
  ],

  limitations: [
    'Tree structure limited to 3 levels deep',
    'Maximum 50 items total',
    'No drag-and-drop support',
    'No search/filter built-in',
  ],

  // Detection
  detectionPatterns: [
    /\b(sidebar|seitenleiste|navigation|nav|menü|menu)\b/i,
    /\b(nav.*(item|punkt|eintrag))/i,
    /\b(links|left).*(navigation|menu|menü)/i,
    /\b(hauptmenü|hauptmenu|main.?menu)/i,
  ],

  examplePrompts: [
    'Eine Navigation für eine Projektmanagement-App',
    'Sidebar with Dashboard, Projects, Team, and Settings',
    'Navigation für Admin-Dashboard mit Gruppen',
    'Collapsible sidebar navigation',
    'Tree navigation for file explorer',
  ],
};

export interface SidebarNavigationResult {
  success: boolean;
  code?: string;
  schema?: SidebarNavigationInput;
  error?: string;
}

/**
 * Generate sidebar navigation from natural language request
 *
 * @param request - Natural language description (e.g., "Navigation for a project management app")
 * @param llmCall - Function to call the LLM
 */
export async function generateSidebarNavigation(
  request: string,
  llmCall: (systemPrompt: string, userPrompt: string) => Promise<string>
): Promise<SidebarNavigationResult> {
  try {
    // Step 1: Call LLM to get JSON decisions
    const userPrompt = createSidebarNavigationPrompt(request);
    const llmResponse = await llmCall(SIDEBAR_NAVIGATION_SYSTEM_PROMPT, userPrompt);

    // Step 2: Parse JSON from response
    let parsedJson: unknown;
    try {
      parsedJson = parseLLMResponse(llmResponse);
    } catch (e) {
      return {
        success: false,
        error: `Failed to parse LLM response: ${e instanceof Error ? e.message : 'Unknown error'}`
      };
    }

    // Step 3: Validate against schema
    const validation = validateSidebarNavigationInput(parsedJson);
    if (!validation.success) {
      return {
        success: false,
        error: `Invalid schema: ${validation.error}`
      };
    }

    // Step 4: Generate Mirror code
    const schema = parsedJson as SidebarNavigationInput;
    const code = buildSidebarNavigation(schema);

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
 * Generate sidebar navigation from pre-defined schema (no LLM)
 * Useful for testing or when schema is already known
 */
export function generateSidebarNavigationFromSchema(
  schema: SidebarNavigationInput
): SidebarNavigationResult {
  const validation = validateSidebarNavigationInput(schema);

  if (!validation.success) {
    return {
      success: false,
      error: `Invalid schema: ${validation.error}`
    };
  }

  const code = buildSidebarNavigation(schema);

  return {
    success: true,
    code,
    schema
  };
}

/**
 * Get the system prompt for the sidebar navigation expert
 * Useful for debugging or testing
 */
export function getSystemPrompt(): string {
  return SIDEBAR_NAVIGATION_SYSTEM_PROMPT;
}

/**
 * Get the user prompt for a request
 * Useful for debugging or testing
 */
export function getUserPrompt(request: string): string {
  return createSidebarNavigationPrompt(request);
}
