/**
 * Expert Manifest Types
 *
 * Formal definition of what an Expert is and what it can do.
 * Every Expert MUST declare a manifest that conforms to this schema.
 */

import { z } from 'zod';

// =============================================================================
// PRIMITIVE & PATTERN NAMES
// =============================================================================

export type PrimitiveName = 'button' | 'input' | 'label' | 'icon' | 'badge';
export type PatternName = 'field' | 'container' | 'action-bar' | 'item' | 'section';
export type ExpertName = 'sidebar-navigation' | 'form' | 'tabs' | 'dialog' | 'card' | 'table' | 'dropdown';
export type ExpertCategory = 'navigation' | 'input' | 'content' | 'feedback' | 'layout' | 'data';

// =============================================================================
// DIMENSION TYPES
// =============================================================================

export interface DimensionOption {
  options: string[];
  default: string;
  phase: 'mvp' | 'phase2' | 'phase3' | 'future';
  description: string;
}

export interface SharedDimensions {
  /** All experts MUST support density */
  density: true;
  /** Optional: background role support */
  background?: true;
  /** Optional: radius role support */
  radius?: true;
}

// =============================================================================
// EXPERT MANIFEST
// =============================================================================

export interface ExpertManifest {
  // =========================================================================
  // IDENTITY
  // =========================================================================

  /** Unique name (kebab-case) */
  name: ExpertName;

  /** Short description (1 sentence) */
  description: string;

  /** UI domain */
  category: ExpertCategory;

  /** Version for schema compatibility */
  version: string;

  // =========================================================================
  // DEPENDENCIES
  // =========================================================================

  /** Required primitives */
  primitives: PrimitiveName[];

  /** Required patterns */
  patterns: PatternName[];

  /** Can be composed with these experts */
  composableWith: ExpertName[];

  // =========================================================================
  // DIMENSIONS
  // =========================================================================

  dimensions: {
    /** Shared dimensions (MUST be supported) */
    shared: SharedDimensions;

    /** Expert-specific dimensions */
    custom: Record<string, DimensionOption>;
  };

  // =========================================================================
  // SCHEMAS
  // =========================================================================

  /** Zod schema for LLM input */
  inputSchema: z.ZodSchema;

  // =========================================================================
  // CONTRACTS
  // =========================================================================

  /** What this expert GUARANTEES */
  guarantees: string[];

  /** What this expert CANNOT do */
  limitations: string[];

  // =========================================================================
  // DETECTION
  // =========================================================================

  /** Regex patterns for prompt detection */
  detectionPatterns: RegExp[];

  /** Example prompts for testing */
  examplePrompts: string[];
}

// =============================================================================
// EXPERT RESULT
// =============================================================================

export interface ExpertResult {
  /** Whether generation was successful */
  success: boolean;

  /** Generated Mirror code */
  code?: string;

  /** Parsed schema (for debugging) */
  schema?: unknown;

  /** Error message if failed */
  error?: string;

  /** Tokens used in the generated code */
  tokens?: Map<string, string>;

  /** Component definitions */
  definitions?: string[];

  /** Component instances */
  instances?: string[];
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate that an expert manifest is complete
 */
export function validateManifest(manifest: ExpertManifest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!manifest.name) errors.push('name is required');
  if (!manifest.description) errors.push('description is required');
  if (!manifest.version) errors.push('version is required');
  if (!manifest.version.match(/^\d+\.\d+\.\d+$/)) {
    errors.push('version must be semver format (e.g., "1.0.0")');
  }

  // Check dimensions
  if (!manifest.dimensions.shared.density) {
    errors.push('density dimension is required');
  }

  // Check contracts
  if (manifest.guarantees.length === 0) {
    errors.push('at least one guarantee is required');
  }

  // Check detection
  if (manifest.detectionPatterns.length === 0) {
    errors.push('at least one detection pattern is required');
  }

  if (manifest.examplePrompts.length === 0) {
    errors.push('at least one example prompt is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
