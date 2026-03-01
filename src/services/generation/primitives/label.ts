/**
 * Label Primitive
 *
 * Generates label component definitions with required indicator variants.
 * Used by: Field pattern
 *
 * Variants:
 * - Label: Simple label
 * - LabelRequired: Label with required indicator (asterisk/text/dot)
 */

import { resolveForeground } from '../design-defaults';
import { getLabelDensity, type Density } from '../dimensions';

// =============================================================================
// TYPES
// =============================================================================

export type RequiredStyle = 'asterisk' | 'text' | 'dot' | 'none';
export type { Density };

export interface LabelConfig {
  requiredStyle: RequiredStyle;
  density: Density;
}

export interface LabelResult {
  tokens: Map<string, string>;
  definitions: string[];
}

// =============================================================================
// TOKEN BUILDER
// =============================================================================

function buildLabelTokens(requiredStyle: RequiredStyle): Map<string, string> {
  const tokens = new Map<string, string>();

  tokens.set('$muted', resolveForeground('muted'));

  if (requiredStyle !== 'none') {
    tokens.set('$error', resolveForeground('danger'));
  }

  return tokens;
}

// =============================================================================
// DEFINITION BUILDERS
// =============================================================================

function buildBaseLabel(density: Density): string[] {
  const d = getLabelDensity(density);
  return [
    'Label:',
    `  fs ${d.fontSize}, col $muted`,
  ];
}

function buildLabelRequiredAsterisk(density: Density): string[] {
  const d = getLabelDensity(density);
  return [
    'LabelRequired:',
    '  hor, gap 0',
    `  Text "", fs ${d.fontSize}, col $muted`,
    `  Asterisk " *", fs ${d.fontSize}, col $muted`,
  ];
}

function buildLabelRequiredText(density: Density): string[] {
  const d = getLabelDensity(density);
  return [
    'LabelRequired:',
    `  hor, gap ${d.gap}`,
    `  Text "", fs ${d.fontSize}, col $muted`,
    `  Required "(required)", col $muted, fs ${d.fontSize - 1}`,
  ];
}

function buildLabelRequiredDot(density: Density): string[] {
  const d = getLabelDensity(density);
  return [
    'LabelRequired:',
    `  hor, ver-center, gap ${d.gap}`,
    '  Dot 6, 6, rad 999, bg $error',
    `  Text "", fs ${d.fontSize}, col $muted`,
  ];
}

// =============================================================================
// MAIN BUILDER
// =============================================================================

export function buildLabels(config: LabelConfig): LabelResult {
  const tokens = buildLabelTokens(config.requiredStyle);
  const definitions: string[] = [];

  // Always include base label
  definitions.push(...buildBaseLabel(config.density));

  // Add required variant if needed
  if (config.requiredStyle !== 'none') {
    definitions.push('');

    switch (config.requiredStyle) {
      case 'asterisk':
        definitions.push(...buildLabelRequiredAsterisk(config.density));
        break;
      case 'text':
        definitions.push(...buildLabelRequiredText(config.density));
        break;
      case 'dot':
        definitions.push(...buildLabelRequiredDot(config.density));
        break;
    }
  }

  return { tokens, definitions };
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export function getLabelDefinitions(config: LabelConfig): string {
  const result = buildLabels(config);
  return result.definitions.join('\n');
}

export function getLabelTokens(config: LabelConfig): string {
  const result = buildLabels(config);
  const lines: string[] = [];

  for (const [name, value] of result.tokens) {
    lines.push(`${name}: ${value}`);
  }

  return lines.join('\n');
}

// getLabelDensity is imported from '../dimensions' and used internally
// It's also available via the dimensions module directly
