import { describe, it, expect } from 'vitest';
import {
  generateSidebarNavigation,
  generateSidebarNavigationFromSchema,
  getSidebarNavigationSystemPrompt,
  getSidebarNavigationUserPrompt
} from '../../services/generation';

describe('SidebarNavigation Expert', () => {
  describe('generateSidebarNavigationFromSchema', () => {
    it('generates code from valid schema', () => {
      const result = generateSidebarNavigationFromSchema({
        items: [
          { icon: 'home', label: 'Dashboard', active: true },
          { icon: 'users', label: 'Users' },
          { icon: 'settings', label: 'Settings' }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.code).toContain('NavItem:');
      expect(result.code).toContain('Nav 240');
      expect(result.code).toContain('Icon "home"');
      expect(result.code).toContain('Label "Dashboard"');
    });

    it('returns error for invalid schema', () => {
      const result = generateSidebarNavigationFromSchema({
        items: []  // Empty not allowed
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('generateSidebarNavigation with mock LLM', () => {
    it('processes valid LLM response', async () => {
      const mockLLMCall = async () => JSON.stringify({
        items: [
          { icon: 'home', label: 'Home', active: true },
          { icon: 'star', label: 'Favorites' }
        ]
      });

      const result = await generateSidebarNavigation('Simple app', mockLLMCall);

      expect(result.success).toBe(true);
      expect(result.code).toContain('NavItem:');
      expect(result.code).toContain('Icon "home"');
    });

    it('handles LLM response with markdown wrapper', async () => {
      const mockLLMCall = async () => `
Here is the navigation:

\`\`\`json
{
  "items": [
    { "icon": "folder", "label": "Projects", "active": true },
    { "icon": "settings", "label": "Settings" }
  ]
}
\`\`\`
      `;

      const result = await generateSidebarNavigation('Project app', mockLLMCall);

      expect(result.success).toBe(true);
      expect(result.code).toContain('Icon "folder"');
    });

    it('returns error for invalid JSON response', async () => {
      const mockLLMCall = async () => 'This is not JSON';

      const result = await generateSidebarNavigation('Test', mockLLMCall);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No JSON found');
    });

    it('returns error for schema validation failure', async () => {
      const mockLLMCall = async () => JSON.stringify({
        items: [{ wrongField: 'value' }]
      });

      const result = await generateSidebarNavigation('Test', mockLLMCall);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid schema');
    });
  });

  describe('Prompt generation', () => {
    it('system prompt contains patterns', () => {
      const prompt = getSidebarNavigationSystemPrompt();

      expect(prompt).toContain('SIMPLE_APP');
      expect(prompt).toContain('ADMIN_DASHBOARD');
      expect(prompt).toContain('COMPACT_TOOL');
    });

    it('system prompt contains icon examples', () => {
      const prompt = getSidebarNavigationSystemPrompt();

      expect(prompt).toContain('home');
      expect(prompt).toContain('settings');
      expect(prompt).toContain('users');
    });

    it('user prompt includes request', () => {
      const prompt = getSidebarNavigationUserPrompt('Eine Projektmanagement-App');

      expect(prompt).toContain('Projektmanagement-App');
    });
  });

  describe('End-to-end scenarios', () => {
    it('generates realistic project management nav', () => {
      const result = generateSidebarNavigationFromSchema({
        items: [
          { icon: 'layout-dashboard', label: 'Dashboard', active: true },
          { icon: 'folder', label: 'Projekte' },
          { icon: 'check-square', label: 'Aufgaben' },
          { icon: 'users', label: 'Team' },
          { icon: 'bar-chart', label: 'Berichte' },
          { icon: 'settings', label: 'Einstellungen' }
        ]
      });

      expect(result.success).toBe(true);

      // Verify structure
      const code = result.code!;
      expect(code).toContain('NavItem:');
      expect(code).toContain('hover');
      expect(code).toContain('state active');

      // Verify all items present
      expect(code).toContain('Dashboard');
      expect(code).toContain('Projekte');
      expect(code).toContain('Aufgaben');
      expect(code).toContain('Team');
      expect(code).toContain('Berichte');
      expect(code).toContain('Einstellungen');

      // Log for inspection
      console.log('Project Management Navigation:');
      console.log(code);
    });

    it('generates email client nav', () => {
      const result = generateSidebarNavigationFromSchema({
        items: [
          { icon: 'inbox', label: 'Posteingang', active: true },
          { icon: 'send', label: 'Gesendet' },
          { icon: 'file-edit', label: 'Entwürfe' },
          { icon: 'trash', label: 'Papierkorb' },
          { icon: 'archive', label: 'Archiv' }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.code).toContain('Posteingang');
      expect(result.code).toContain('Papierkorb');
    });
  });
});
