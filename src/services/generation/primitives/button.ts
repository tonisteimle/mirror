/**
 * Button Primitive
 *
 * Composition-based button system.
 *
 * Architecture:
 * - Base Button: Layout + States (hover placeholder, disabled, loading)
 * - Variants: Inherit from Base, add colors only
 * - Content: NOT defined here - Experts add Icon/Label via composition
 *
 * Usage by Experts:
 *   PrimaryButton Icon "check"; Label "Save"
 *   PrimaryButton loading, Spinner; Label "Saving..."
 *   GhostButton Icon "x", iconOnly
 */

import { DESIGN_DEFAULTS } from '../design-defaults';
import { getDensity, getButtonDensity, type Density } from '../dimensions';

// =============================================================================
// TYPES
// =============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonStyle = 'solid' | 'outline';

export interface ButtonConfig {
  /** Which variants to generate */
  variants: ButtonVariant[];
  /** Density level */
  density: Density;
  /** Solid (filled) or outline style */
  style?: ButtonStyle;
  /** Generate IconButton variant (square, icon-only) */
  withIconButton?: boolean;
}

export interface ButtonResult {
  /** Required tokens */
  tokens: Map<string, string>;
  /** Component definitions (Base + Variants) */
  definitions: string[];
}

// =============================================================================
// TOKEN BUILDER
// =============================================================================

function buildButtonTokens(
  variants: ButtonVariant[],
  style: ButtonStyle
): Map<string, string> {
  const tokens = new Map<string, string>();

  // Always needed
  tokens.set('$text', DESIGN_DEFAULTS.foreground.default);
  tokens.set('$disabled-opacity', '0.5');

  if (variants.includes('primary')) {
    tokens.set('$primary', DESIGN_DEFAULTS.background.primary);
    tokens.set('$primary-hover', '#2563EB');
    if (style === 'outline') {
      tokens.set('$primary-text', DESIGN_DEFAULTS.foreground.primary);
    }
  }

  if (variants.includes('secondary') || variants.includes('ghost')) {
    tokens.set('$surface', DESIGN_DEFAULTS.background.elevated);
    tokens.set('$surface-hover', DESIGN_DEFAULTS.background.hover);
  }

  if (variants.includes('danger')) {
    tokens.set('$danger', DESIGN_DEFAULTS.background.danger);
    tokens.set('$danger-hover', '#DC2626');
    if (style === 'outline') {
      tokens.set('$danger-text', DESIGN_DEFAULTS.foreground.danger);
    }
  }

  return tokens;
}

// =============================================================================
// BASE BUTTON BUILDER
// =============================================================================

/**
 * Builds the base Button component.
 *
 * Layout: horizontal, vertically centered, with gap for icon+text
 * States: disabled (opacity), loading (cursor)
 * Hover: empty - variants fill this
 *
 * Content is NOT defined here - experts add Icon/Label as children.
 */
function buildBaseButton(density: Density): string[] {
  const d = getButtonDensity(density);
  const general = getDensity(density);

  const lines: string[] = [];

  // Base Button definition
  // - hor: horizontal layout for icon + text
  // - ver-center: vertically center content
  // - gap: space between icon and text
  // - hug, h: width=content, fixed height
  // - pad: only horizontal (vertical centering via h + ver-center)
  // - rad: border radius
  // - cursor pointer: clickable
  // - line 1: line-height 1 for vertical centering
  lines.push('Button:');
  lines.push(`  hor, ver-center, gap ${general.gap}, hug, h ${d.height}, pad 0 ${d.paddingHorizontal}, rad ${general.radius}, cursor pointer, line 1`);

  // Disabled state
  lines.push('  state disabled');
  lines.push('    opacity $disabled-opacity, cursor not-allowed');

  // Loading state
  lines.push('  state loading');
  lines.push('    cursor wait');

  return lines;
}

/**
 * Builds IconButton variant - square button for icon-only use.
 */
function buildIconButton(density: Density): string[] {
  const d = getButtonDensity(density);

  const lines: string[] = [];

  // IconButton is square: same width as height, centered
  lines.push('');
  lines.push('IconButton from Button:');
  lines.push(`  w ${d.height}, pad 0, center`);

  return lines;
}

// =============================================================================
// VARIANT BUILDERS
// =============================================================================

interface VariantColors {
  bg: string;
  col: string;
  hoverBg: string;
  border?: string;
}

function buildVariant(
  name: string,
  colors: VariantColors,
  style: ButtonStyle
): string[] {
  const lines: string[] = [];

  if (style === 'solid') {
    lines.push(`${name}Button from Button: bg ${colors.bg}, col ${colors.col}`);
    lines.push('  hover');
    lines.push(`    bg ${colors.hoverBg}`);
  } else {
    // Outline style
    lines.push(`${name}Button from Button: bg transparent, col ${colors.col}, bor 1 ${colors.border || colors.bg}`);
    lines.push('  hover');
    lines.push(`    bg ${colors.hoverBg}`);
  }

  return lines;
}

function buildPrimaryVariant(style: ButtonStyle): string[] {
  if (style === 'solid') {
    return buildVariant('Primary', {
      bg: '$primary',
      col: 'white',
      hoverBg: '$primary-hover',
    }, style);
  } else {
    return buildVariant('Primary', {
      bg: '$primary',
      col: '$primary-text',
      hoverBg: '$surface',
      border: '$primary',
    }, style);
  }
}

function buildSecondaryVariant(style: ButtonStyle): string[] {
  return buildVariant('Secondary', {
    bg: style === 'solid' ? '$surface' : 'transparent',
    col: '$text',
    hoverBg: '$surface-hover',
    border: '$surface',
  }, style);
}

function buildGhostVariant(): string[] {
  // Ghost is always "outline-ish" - transparent bg, text color
  const lines: string[] = [];
  lines.push('GhostButton from Button: bg transparent, col $text');
  lines.push('  hover');
  lines.push('    bg $surface-hover');
  return lines;
}

function buildDangerVariant(style: ButtonStyle): string[] {
  if (style === 'solid') {
    return buildVariant('Danger', {
      bg: '$danger',
      col: 'white',
      hoverBg: '$danger-hover',
    }, style);
  } else {
    return buildVariant('Danger', {
      bg: '$danger',
      col: '$danger-text',
      hoverBg: '$surface',
      border: '$danger',
    }, style);
  }
}

// =============================================================================
// MAIN BUILDER
// =============================================================================

/**
 * Build button primitives.
 *
 * @example
 * // Minimal
 * buildButtons({ variants: ['primary'], density: 'default' })
 *
 * // Full
 * buildButtons({
 *   variants: ['primary', 'secondary', 'ghost', 'danger'],
 *   density: 'default',
 *   style: 'solid',
 *   withIconButton: true,
 * })
 */
export function buildButtons(config: ButtonConfig): ButtonResult {
  const style = config.style ?? 'solid';
  const tokens = buildButtonTokens(config.variants, style);
  const definitions: string[] = [];

  // 1. Base Button (always)
  definitions.push(...buildBaseButton(config.density));

  // 2. IconButton (optional)
  if (config.withIconButton) {
    definitions.push(...buildIconButton(config.density));
  }

  // 3. Variants
  for (const variant of config.variants) {
    definitions.push('');

    switch (variant) {
      case 'primary':
        definitions.push(...buildPrimaryVariant(style));
        break;
      case 'secondary':
        definitions.push(...buildSecondaryVariant(style));
        break;
      case 'ghost':
        definitions.push(...buildGhostVariant());
        break;
      case 'danger':
        definitions.push(...buildDangerVariant(style));
        break;
    }
  }

  return { tokens, definitions };
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Get button definitions as string.
 */
export function getButtonDefinitions(config: ButtonConfig): string {
  const result = buildButtons(config);
  return result.definitions.join('\n');
}

/**
 * Get button tokens as string lines.
 */
export function getButtonTokens(config: ButtonConfig): string {
  const result = buildButtons(config);
  const lines: string[] = [];

  for (const [name, value] of result.tokens) {
    lines.push(`${name}: ${value}`);
  }

  return lines.join('\n');
}

/**
 * Get complete button code (tokens + definitions).
 */
export function getButtonCode(config: ButtonConfig): string {
  const result = buildButtons(config);

  const tokenLines: string[] = [];
  for (const [name, value] of result.tokens) {
    tokenLines.push(`${name}: ${value}`);
  }

  return [...tokenLines, '', ...result.definitions].join('\n');
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

export type { Density };
