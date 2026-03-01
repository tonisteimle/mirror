/**
 * Architecture Consistency Tests
 *
 * Ensures all primitives, patterns, and experts follow the architecture rules:
 * - Use central density system
 * - Generate valid Mirror code
 * - Define all used tokens
 * - Use semantic color roles (no hardcoded colors in definitions)
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../test-utils';

// Primitives
import { buildButtons, type ButtonConfig } from '../../services/generation/primitives/button';
import { buildInputs, type InputConfig } from '../../services/generation/primitives/input';
import { buildLabels, type LabelConfig } from '../../services/generation/primitives/label';

// Patterns
import { buildFields, type FieldConfig } from '../../services/generation/patterns/field';

// Dimensions
import { DENSITY, type Density } from '../../services/generation/dimensions';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Filter out warnings from the errors array.
 * The parser puts both errors and warnings in the errors array for backwards compatibility.
 */
function getActualErrors(errors: string[]): string[] {
  return errors.filter(e => !e.startsWith('Warning:'));
}

/**
 * Extract all hex colors from code (e.g., #3B82F6)
 */
function extractHexColors(code: string): string[] {
  const matches = code.match(/#[0-9A-Fa-f]{6}\b/g) || [];
  return [...new Set(matches)];
}

/**
 * Extract all token references from code (e.g., $primary, $text)
 */
function extractTokenRefs(code: string): string[] {
  // Match $name but not in token definitions (lines with :)
  const lines = code.split('\n');
  const refs: string[] = [];

  for (const line of lines) {
    // Skip token definition lines
    if (line.includes(':') && line.trim().startsWith('$')) continue;

    const matches = line.match(/\$[a-zA-Z][a-zA-Z0-9-]*/g) || [];
    refs.push(...matches);
  }

  return [...new Set(refs)];
}

/**
 * Extract defined tokens from code
 */
function extractDefinedTokens(code: string): string[] {
  const lines = code.split('\n');
  const tokens: string[] = [];

  for (const line of lines) {
    const match = line.match(/^(\$[a-zA-Z][a-zA-Z0-9-]*):/);
    if (match) {
      tokens.push(match[1]);
    }
  }

  return tokens;
}

/**
 * Convert result to code string
 */
function resultToCode(result: { tokens: Map<string, string>; definitions: string[] }): string {
  const tokenLines: string[] = [];
  for (const [name, value] of result.tokens) {
    tokenLines.push(`${name}: ${value}`);
  }
  return [...tokenLines, '', ...result.definitions].join('\n');
}

// =============================================================================
// PRIMITIVE TESTS
// =============================================================================

describe('Architecture: Primitives', () => {
  const densities: Density[] = ['compact', 'default', 'spacious'];

  describe('Button Primitive', () => {
    const variants = ['primary', 'secondary', 'ghost', 'danger'] as const;

    it.each(densities)('supports %s density', (density) => {
      const config: ButtonConfig = {
        variants: ['primary'],
        density,
      };
      const result = buildButtons(config);

      expect(result.definitions.length).toBeGreaterThan(0);
      expect(result.tokens.size).toBeGreaterThan(0);
    });

    it('generates valid Mirror code', () => {
      const config: ButtonConfig = {
        variants: ['primary', 'secondary'],
        density: 'default',
      };
      const result = buildButtons(config);
      const code = resultToCode(result);

      // Should parse without errors
      const parsed = parse(code);
      expect(getActualErrors(parsed.errors)).toHaveLength(0);
    });

    it('defines all used tokens', () => {
      const config: ButtonConfig = {
        variants: ['primary', 'secondary', 'ghost', 'danger'],
        density: 'default',
      };
      const result = buildButtons(config);
      const code = resultToCode(result);

      const definedTokens = Array.from(result.tokens.keys());
      const usedTokens = extractTokenRefs(code);

      for (const token of usedTokens) {
        expect(definedTokens).toContain(token);
      }
    });

    it('uses consistent density values across variants', () => {
      const compactResult = buildButtons({ variants: ['primary'], density: 'compact' });
      const spaciousResult = buildButtons({ variants: ['primary'], density: 'spacious' });

      const compactCode = compactResult.definitions.join('\n');
      const spaciousCode = spaciousResult.definitions.join('\n');

      // Compact should have smaller height
      expect(compactCode).toContain(`h ${DENSITY.compact.button.height}`);
      expect(spaciousCode).toContain(`h ${DENSITY.spacious.button.height}`);
    });

    it('has no hardcoded colors in definitions (only in tokens)', () => {
      const config: ButtonConfig = {
        variants: ['primary'],
        density: 'default',
      };
      const result = buildButtons(config);

      // Get token values (these ARE hardcoded colors, that's OK)
      const tokenValues = Array.from(result.tokens.values());

      // Get colors in definitions
      const defCode = result.definitions.join('\n');
      const colorsInDefs = extractHexColors(defCode);

      // All colors in definitions should be in token values
      for (const color of colorsInDefs) {
        expect(tokenValues).toContain(color);
      }
    });
  });

  describe('Input Primitive', () => {
    it.each(densities)('supports %s density', (density) => {
      const config: InputConfig = {
        types: ['text'],
        density,
      };
      const result = buildInputs(config);

      expect(result.definitions.length).toBeGreaterThan(0);
    });

    it('generates valid Mirror code', () => {
      const config: InputConfig = {
        types: ['text', 'password', 'textarea'],
        density: 'default',
        withPasswordToggle: true,
      };
      const result = buildInputs(config);
      const code = resultToCode(result);

      const parsed = parse(code);
      if (parsed.errors.length > 0) {
        console.log('CODE:', code);
        console.log('ERRORS:', parsed.errors);
      }
      expect(getActualErrors(parsed.errors)).toHaveLength(0);
    });

    it('defines all used tokens', () => {
      const config: InputConfig = {
        types: ['text', 'password', 'textarea', 'select'],
        density: 'default',
        withPasswordToggle: true,
      };
      const result = buildInputs(config);
      const code = resultToCode(result);

      const definedTokens = Array.from(result.tokens.keys());
      const usedTokens = extractTokenRefs(code);

      for (const token of usedTokens) {
        expect(definedTokens).toContain(token);
      }
    });

    it('uses consistent density values', () => {
      const compactResult = buildInputs({ types: ['text'], density: 'compact' });
      const spaciousResult = buildInputs({ types: ['text'], density: 'spacious' });

      const compactCode = compactResult.definitions.join('\n');
      const spaciousCode = spaciousResult.definitions.join('\n');

      // Compact should have smaller padding
      expect(compactCode).toContain(`pad ${DENSITY.compact.input.paddingVertical} ${DENSITY.compact.input.paddingHorizontal}`);
      expect(spaciousCode).toContain(`pad ${DENSITY.spacious.input.paddingVertical} ${DENSITY.spacious.input.paddingHorizontal}`);
    });
  });

  describe('Label Primitive', () => {
    it.each(densities)('supports %s density', (density) => {
      const config: LabelConfig = {
        requiredStyle: 'asterisk',
        density,
      };
      const result = buildLabels(config);

      expect(result.definitions.length).toBeGreaterThan(0);
    });

    it('generates valid Mirror code', () => {
      const config: LabelConfig = {
        requiredStyle: 'asterisk',
        density: 'default',
      };
      const result = buildLabels(config);
      const code = resultToCode(result);

      const parsed = parse(code);
      expect(getActualErrors(parsed.errors)).toHaveLength(0);
    });

    it('uses consistent density values', () => {
      const compactResult = buildLabels({ requiredStyle: 'asterisk', density: 'compact' });
      const spaciousResult = buildLabels({ requiredStyle: 'asterisk', density: 'spacious' });

      const compactCode = compactResult.definitions.join('\n');
      const spaciousCode = spaciousResult.definitions.join('\n');

      // Compact should have smaller font size
      expect(compactCode).toContain(`fs ${DENSITY.compact.label.fontSize}`);
      expect(spaciousCode).toContain(`fs ${DENSITY.spacious.label.fontSize}`);
    });
  });
});

// =============================================================================
// PATTERN TESTS
// =============================================================================

describe('Architecture: Patterns', () => {
  const densities: Density[] = ['compact', 'default', 'spacious'];

  describe('Field Pattern', () => {
    it.each(densities)('supports %s density', (density) => {
      const config: FieldConfig = {
        inputTypes: ['text'],
        requiredStyle: 'asterisk',
        density,
      };
      const result = buildFields(config);

      expect(result.definitions.length).toBeGreaterThan(0);
    });

    it('generates valid Mirror code', () => {
      const config: FieldConfig = {
        inputTypes: ['text', 'password', 'textarea'],
        requiredStyle: 'asterisk',
        density: 'default',
        withPasswordToggle: true,
      };
      const result = buildFields(config);
      const code = resultToCode(result);

      const parsed = parse(code);
      expect(getActualErrors(parsed.errors)).toHaveLength(0);
    });

    it('defines all used tokens', () => {
      const config: FieldConfig = {
        inputTypes: ['text', 'password'],
        requiredStyle: 'asterisk',
        density: 'default',
        withPasswordToggle: true,
      };
      const result = buildFields(config);
      const code = resultToCode(result);

      const definedTokens = Array.from(result.tokens.keys());
      const usedTokens = extractTokenRefs(code);

      for (const token of usedTokens) {
        expect(definedTokens).toContain(token);
      }
    });

    it('includes primitive definitions', () => {
      const config: FieldConfig = {
        inputTypes: ['text'],
        requiredStyle: 'asterisk',
        density: 'default',
      };
      const result = buildFields(config);
      const code = result.definitions.join('\n');

      // Should include Label, InputWrapper, TextInput (inherits), and Field definitions
      expect(code).toContain('Label:');
      expect(code).toContain('InputWrapper:');
      expect(code).toContain('TextInput from InputWrapper');
      expect(code).toContain('Field:');
    });
  });
});

// =============================================================================
// DENSITY SYSTEM TESTS
// =============================================================================

describe('Architecture: Density System', () => {
  it('has consistent values across density levels', () => {
    // Compact < Default < Spacious for all size-related values
    expect(DENSITY.compact.button.height).toBeLessThan(DENSITY.default.button.height);
    expect(DENSITY.default.button.height).toBeLessThan(DENSITY.spacious.button.height);

    expect(DENSITY.compact.fontSize).toBeLessThan(DENSITY.default.fontSize);
    expect(DENSITY.default.fontSize).toBeLessThan(DENSITY.spacious.fontSize);

    expect(DENSITY.compact.gap).toBeLessThan(DENSITY.default.gap);
    expect(DENSITY.default.gap).toBeLessThan(DENSITY.spacious.gap);

    expect(DENSITY.compact.radius).toBeLessThan(DENSITY.default.radius);
    expect(DENSITY.default.radius).toBeLessThan(DENSITY.spacious.radius);
  });

  it('has all required properties for each density', () => {
    for (const density of ['compact', 'default', 'spacious'] as const) {
      const d = DENSITY[density];

      // General
      expect(d.gap).toBeDefined();
      expect(d.fontSize).toBeDefined();
      expect(d.iconSize).toBeDefined();
      expect(d.radius).toBeDefined();

      // Button
      expect(d.button.height).toBeDefined();
      expect(d.button.paddingHorizontal).toBeDefined();

      // Input
      expect(d.input.paddingVertical).toBeDefined();
      expect(d.input.paddingHorizontal).toBeDefined();
      expect(d.input.minHeight).toBeDefined();

      // Label
      expect(d.label.fontSize).toBeDefined();
      expect(d.label.gap).toBeDefined();
    }
  });

  it('button height matches input height (visual alignment)', () => {
    // Button height should approximately match input height
    // Input height = paddingVertical * 2 + lineHeight (approx fontSize * 1.4)
    for (const density of ['compact', 'default', 'spacious'] as const) {
      const d = DENSITY[density];
      const inputHeight = d.input.paddingVertical * 2 + Math.ceil(d.fontSize * 1.4);

      // Button height should be close to input height (within 5px tolerance)
      expect(Math.abs(d.button.height - inputHeight)).toBeLessThanOrEqual(5);
    }
  });
});

// =============================================================================
// CROSS-PRIMITIVE CONSISTENCY TESTS
// =============================================================================

describe('Architecture: Cross-Primitive Consistency', () => {
  it('all primitives use same radius for same density', () => {
    const density: Density = 'default';

    const buttonResult = buildButtons({ variants: ['primary'], density });
    const inputResult = buildInputs({ types: ['text'], density });

    const buttonCode = buttonResult.definitions.join('\n');
    const inputCode = inputResult.definitions.join('\n');

    // Both should use the same radius
    const expectedRadius = DENSITY[density].radius;
    expect(buttonCode).toContain(`rad ${expectedRadius}`);
    expect(inputCode).toContain(`rad ${expectedRadius}`);
  });

  it('tokens are consistent across primitives', () => {
    const density: Density = 'default';

    const buttonResult = buildButtons({ variants: ['secondary'], density });
    const inputResult = buildInputs({ types: ['text'], density });

    // $text token should have same value in both
    if (buttonResult.tokens.has('$text') && inputResult.tokens.has('$text')) {
      expect(buttonResult.tokens.get('$text')).toBe(inputResult.tokens.get('$text'));
    }
  });
});
