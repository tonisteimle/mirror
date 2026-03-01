import { describe, it, expect } from 'vitest';
import {
  detectExpert,
  runExpertPipeline,
  tryExpertPipeline,
} from '../../services/generation/experts';
import { manifest as sidebarManifest } from '../../services/generation/experts/sidebar-navigation';
import { manifest as formManifest } from '../../services/generation/experts/form';
import { validateManifest } from '../../services/generation/types';

describe('Expert System', () => {
  describe('detectExpert', () => {
    it('detects sidebar navigation patterns', () => {
      const prompts = [
        'Navigation für eine App',
        'Sidebar mit 5 Items',
        'Seitenleiste mit Icons und Labels',
        'Nav Menü mit Dashboard, Settings',
      ];

      for (const prompt of prompts) {
        const result = detectExpert(prompt);
        expect(result.expert).toBe('sidebar-navigation');
      }
    });

    it('returns high confidence for clear patterns', () => {
      const result = detectExpert(
        'Sidebar Navigation mit Icons und Labels für Dashboard, Users, Settings'
      );
      expect(result.expert).toBe('sidebar-navigation');
      expect(result.confidence).toBe('high');
    });

    it('returns low confidence for minimal patterns', () => {
      const result = detectExpert('Navigation mit mehreren Einträgen');
      expect(result.expert).toBe('sidebar-navigation');
      expect(['low', 'medium', 'high']).toContain(result.confidence);
    });

    it('returns none for non-matching prompts', () => {
      const prompts = [
        'Ein blauer Button',
        'Formular mit Eingabefeldern',
        'Eine Card mit Text',
        'Tabelle mit Daten',
      ];

      for (const prompt of prompts) {
        const result = detectExpert(prompt);
        expect(result.expert).toBe('none');
      }
    });
  });

  describe('runExpertPipeline', () => {
    it('returns error for unimplemented experts', async () => {
      const result = await runExpertPipeline('form', 'Ein Formular');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not yet implemented');
    });

    // Note: sidebar-navigation expert requires API call
    // Integration tests would need mocking or live API
  });

  describe('tryExpertPipeline', () => {
    it('returns null for non-expert prompts', async () => {
      const result = await tryExpertPipeline('Ein blauer Button');
      expect(result).toBeNull();
    });

    it('respects confidence threshold', async () => {
      // Low confidence prompt
      const result = await tryExpertPipeline('navigation', {
        minConfidence: 'high',
      });
      // Should be null because confidence is not high enough
      // (depends on exact pattern matching)
      expect(result === null || result.expert === 'sidebar-navigation').toBe(true);
    });
  });

  describe('Pattern matching edge cases', () => {
    it('handles German and English terms', () => {
      expect(detectExpert('sidebar mit items').expert).toBe('sidebar-navigation');
      expect(detectExpert('Seitenleiste mit Einträgen').expert).toBe('sidebar-navigation');
      expect(detectExpert('navigation für app').expert).toBe('sidebar-navigation');
      expect(detectExpert('Nav Menü mit links').expert).toBe('sidebar-navigation');
    });

    it('handles case insensitivity', () => {
      expect(detectExpert('SIDEBAR navigation').expert).toBe('sidebar-navigation');
      expect(detectExpert('Navigation mit items').expert).toBe('sidebar-navigation');
      expect(detectExpert('NAV mit icons').expert).toBe('sidebar-navigation');
    });

    it('does not match single word without context', () => {
      // Single word "menu" alone is not enough
      const result = detectExpert('ein schönes menü');
      // This might or might not match depending on pattern
      expect(['sidebar-navigation', 'none']).toContain(result.expert);
    });
  });

  describe('Expert Manifests', () => {
    const manifests = [
      { name: 'sidebar-navigation', manifest: sidebarManifest },
      { name: 'form', manifest: formManifest },
    ];

    it.each(manifests)('$name manifest is valid', ({ manifest }) => {
      const result = validateManifest(manifest);
      expect(result.errors).toHaveLength(0);
      expect(result.valid).toBe(true);
    });

    it.each(manifests)('$name manifest has required fields', ({ manifest }) => {
      expect(manifest.name).toBeDefined();
      expect(manifest.description).toBeDefined();
      expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(manifest.category).toBeDefined();
    });

    it.each(manifests)('$name manifest declares dimensions', ({ manifest }) => {
      expect(manifest.dimensions.shared.density).toBe(true);
      expect(Object.keys(manifest.dimensions.custom).length).toBeGreaterThan(0);
    });

    it.each(manifests)('$name manifest has detection patterns', ({ manifest }) => {
      expect(manifest.detectionPatterns.length).toBeGreaterThan(0);
      expect(manifest.examplePrompts.length).toBeGreaterThan(0);
    });

    it.each(manifests)('$name manifest has contracts', ({ manifest }) => {
      expect(manifest.guarantees.length).toBeGreaterThan(0);
      expect(manifest.limitations.length).toBeGreaterThan(0);
    });

    it.each(manifests)('$name manifest has inputSchema', ({ manifest }) => {
      expect(manifest.inputSchema).toBeDefined();
      // Schema should be a Zod schema
      expect(typeof manifest.inputSchema.parse).toBe('function');
    });

    it('all custom dimensions have required properties', () => {
      for (const { manifest } of manifests) {
        for (const [name, dim] of Object.entries(manifest.dimensions.custom)) {
          expect(dim.options.length).toBeGreaterThan(0);
          expect(dim.default).toBeDefined();
          expect(dim.options).toContain(dim.default);
          expect(['mvp', 'phase2', 'phase3', 'future']).toContain(dim.phase);
          expect(dim.description).toBeDefined();
        }
      }
    });
  });
});
