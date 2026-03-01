/**
 * Live Expert System Tests
 *
 * Tests the FULL pipeline: User Prompt → LLM → Schema → Builder → Mirror Code
 *
 * Run with: VITE_OPENROUTER_API_KEY=your-key npx vitest run src/__tests__/generation/live-expert.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setApiKey, hasApiKey } from '../../lib/ai';
import { callLLM } from '../../lib/llm-call';
import { disableRateLimiting, enableRateLimiting } from '../../lib/feature-flags';
import { parse } from '../test-utils';

// Expert imports
import { generateSidebarNavigation } from '../../services/generation/experts/sidebar-navigation';
import {
  SIDEBAR_NAVIGATION_SYSTEM_PROMPT,
  createSidebarNavigationPrompt,
} from '../../services/generation/prompts/sidebar-navigation';
import { generateForm } from '../../services/generation/experts/form';
import {
  FORM_SYSTEM_PROMPT,
  createFormPrompt,
} from '../../services/generation/prompts/form';

// Get API key from environment
const API_KEY = process.env.VITE_OPENROUTER_API_KEY || '';

/**
 * Wrapper to use callLLM with expert functions
 */
async function llmCall(systemPrompt: string, userPrompt: string): Promise<string> {
  const result = await callLLM({
    systemPrompt,
    userPrompt,
    maxTokens: 2048,
  });

  if (result.error) {
    throw new Error(result.error);
  }

  return result.content;
}

/**
 * Filter out warnings from errors
 */
function getActualErrors(errors: string[]): string[] {
  return errors.filter(e => !e.startsWith('Warning:'));
}

describe('Live Expert System', () => {
  beforeAll(() => {
    disableRateLimiting();
    if (API_KEY) {
      setApiKey(API_KEY);
    }
  });

  afterAll(() => {
    enableRateLimiting();
  });

  // ==========================================================================
  // SIDEBAR NAVIGATION
  // ==========================================================================

  describe.skipIf(!API_KEY)('SidebarNavigation Expert - Full Pipeline', () => {
    it('generates navigation from German prompt', async () => {
      const userRequest = 'Navigation für eine Projektmanagement-App mit Dashboard, Projekte, Team und Einstellungen';

      console.log('\n📝 User Request:', userRequest);
      console.log('⏳ Calling LLM...\n');

      const result = await generateSidebarNavigation(userRequest, llmCall);

      console.log('📊 Schema received:');
      console.log(JSON.stringify(result.schema, null, 2));
      console.log('\n📤 Generated Mirror Code:');
      console.log('─'.repeat(60));
      console.log(result.code);
      console.log('─'.repeat(60));

      // Validations
      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
      expect(result.schema).toBeDefined();

      // Schema should have items
      expect(result.schema!.items?.length || result.schema!.groups?.length).toBeGreaterThan(0);

      // Parse the generated code
      const parsed = parse(result.code!);
      const actualErrors = getActualErrors(parsed.errors);

      console.log('\n✅ Parse result:', actualErrors.length === 0 ? 'Valid' : `${actualErrors.length} errors`);

      if (actualErrors.length > 0) {
        console.log('❌ Errors:', actualErrors);
      }

      expect(actualErrors).toHaveLength(0);
      console.log('\n✨ Full pipeline successful!');
    }, 30000);

    it('generates collapsible navigation', async () => {
      const userRequest = 'Eine einklappbare Sidebar für einen Code-Editor mit File Explorer, Search, Git und Extensions';

      console.log('\n📝 User Request:', userRequest);
      console.log('⏳ Calling LLM...\n');

      const result = await generateSidebarNavigation(userRequest, llmCall);

      console.log('📊 Schema received:');
      console.log(JSON.stringify(result.schema, null, 2));
      console.log('\n📤 Generated Mirror Code:');
      console.log('─'.repeat(60));
      console.log(result.code);
      console.log('─'.repeat(60));

      expect(result.success).toBe(true);

      // Should have collapsible visibility
      expect(result.schema!.visibility).toBe('collapsible');

      // Should have toggle in code
      expect(result.code).toContain('ToggleNav');
      expect(result.code).toContain('state expanded');
      expect(result.code).toContain('state collapsed');

      // Parse validation
      const parsed = parse(result.code!);
      const actualErrors = getActualErrors(parsed.errors);
      expect(actualErrors).toHaveLength(0);

      console.log('\n✨ Collapsible navigation generated!');
    }, 30000);

    it('generates grouped navigation', async () => {
      const userRequest = 'Admin Dashboard mit gruppierter Navigation: Haupt (Dashboard, Analytics), Content (Posts, Media), System (Users, Settings)';

      console.log('\n📝 User Request:', userRequest);
      console.log('⏳ Calling LLM...\n');

      const result = await generateSidebarNavigation(userRequest, llmCall);

      console.log('📊 Schema received:');
      console.log(JSON.stringify(result.schema, null, 2));

      expect(result.success).toBe(true);

      // Should have grouped structure
      expect(result.schema!.structure).toBe('grouped');
      expect(result.schema!.groups).toBeDefined();
      expect(result.schema!.groups!.length).toBeGreaterThanOrEqual(2);

      // Code should have NavSection
      expect(result.code).toContain('NavSection');

      console.log('\n✨ Grouped navigation generated!');
    }, 30000);

    it('generates navigation with badges', async () => {
      const userRequest = 'Email client sidebar with Inbox (show unread count), Sent, Drafts, Trash';

      console.log('\n📝 User Request:', userRequest);
      console.log('⏳ Calling LLM...\n');

      const result = await generateSidebarNavigation(userRequest, llmCall);

      console.log('📊 Schema received:');
      console.log(JSON.stringify(result.schema, null, 2));

      expect(result.success).toBe(true);

      // Should have badges
      const hasItemsWithBadge = result.schema!.items?.some(item => item.badge !== undefined);
      expect(hasItemsWithBadge).toBe(true);

      // Code should have Badge component
      expect(result.code).toContain('Badge');

      console.log('\n✨ Navigation with badges generated!');
    }, 30000);
  });

  // ==========================================================================
  // FORM EXPERT
  // ==========================================================================

  describe.skipIf(!API_KEY)('Form Expert - Full Pipeline', () => {
    it('generates login form from prompt', async () => {
      const userRequest = 'Login-Formular mit Email und Passwort, Passwort mit Sichtbarkeits-Toggle';

      console.log('\n📝 User Request:', userRequest);
      console.log('⏳ Calling LLM...\n');

      const result = await generateForm(userRequest, llmCall);

      console.log('📊 Schema received:');
      console.log(JSON.stringify(result.schema, null, 2));
      console.log('\n📤 Generated Mirror Code:');
      console.log('─'.repeat(60));
      console.log(result.code);
      console.log('─'.repeat(60));

      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();

      // Schema should have email and password fields
      const hasEmail = result.schema!.fields?.some(f => f.type === 'email');
      const hasPassword = result.schema!.fields?.some(f => f.type === 'password');
      expect(hasEmail).toBe(true);
      expect(hasPassword).toBe(true);

      // Password should have toggle
      const passwordField = result.schema!.fields?.find(f => f.type === 'password');
      expect(passwordField?.showToggle).toBe(true);

      // Parse validation
      const parsed = parse(result.code!);
      const actualErrors = getActualErrors(parsed.errors);
      expect(actualErrors).toHaveLength(0);

      console.log('\n✨ Login form generated!');
    }, 30000);

    it('generates contact form', async () => {
      const userRequest = 'Contact form with name, email, subject dropdown, and message textarea';

      console.log('\n📝 User Request:', userRequest);
      console.log('⏳ Calling LLM...\n');

      const result = await generateForm(userRequest, llmCall);

      console.log('📊 Schema received:');
      console.log(JSON.stringify(result.schema, null, 2));

      expect(result.success).toBe(true);

      // Should have text, email, and textarea fields
      const fieldTypes = result.schema!.fields?.map(f => f.type) || [];
      expect(fieldTypes).toContain('text');
      expect(fieldTypes).toContain('email');
      expect(fieldTypes).toContain('textarea');

      console.log('\n✨ Contact form generated!');
    }, 30000);

    it('generates compact filter form', async () => {
      const userRequest = 'Kompaktes Filter-Formular für eine Tabelle: Status-Dropdown, Datumsfeld, Suchfeld. Keine Labels, nur Placeholders.';

      console.log('\n📝 User Request:', userRequest);
      console.log('⏳ Calling LLM...\n');

      const result = await generateForm(userRequest, llmCall);

      console.log('📊 Schema received:');
      console.log(JSON.stringify(result.schema, null, 2));

      expect(result.success).toBe(true);

      // Should have compact density
      expect(result.schema!.density).toBe('compact');

      // Labels should be hidden
      expect(result.schema!.labelPosition).toBe('hidden');

      console.log('\n✨ Compact filter form generated!');
    }, 30000);
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  describe.skipIf(!API_KEY)('Error Handling', () => {
    it('handles invalid LLM response gracefully', async () => {
      // Create a mock that returns invalid JSON
      const badLlmCall = async () => 'This is not JSON at all!';

      const result = await generateSidebarNavigation('test', badLlmCall);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse');
    });

    it('handles empty schema gracefully', async () => {
      // Create a mock that returns empty object
      const emptyLlmCall = async () => '{}';

      const result = await generateSidebarNavigation('test', emptyLlmCall);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid schema');
    });
  });
});

// ==========================================================================
// SHOW PROMPTS (for debugging)
// ==========================================================================

describe('Expert Prompts (Reference)', () => {
  it('shows sidebar navigation system prompt', () => {
    console.log('\n📜 SIDEBAR NAVIGATION SYSTEM PROMPT:');
    console.log('═'.repeat(60));
    console.log(SIDEBAR_NAVIGATION_SYSTEM_PROMPT);
    console.log('═'.repeat(60));
  });

  it('shows form system prompt', () => {
    console.log('\n📜 FORM SYSTEM PROMPT:');
    console.log('═'.repeat(60));
    console.log(FORM_SYSTEM_PROMPT);
    console.log('═'.repeat(60));
  });

  it('shows example user prompts', () => {
    const navPrompt = createSidebarNavigationPrompt('Navigation für eine Todo-App');
    const formPrompt = createFormPrompt('Login Formular');

    console.log('\n📝 EXAMPLE NAV USER PROMPT:');
    console.log(navPrompt);
    console.log('\n📝 EXAMPLE FORM USER PROMPT:');
    console.log(formPrompt);
  });
});
