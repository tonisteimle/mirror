/**
 * E2E Tests for Expert System
 *
 * Tests the complete flow:
 * 1. Schema → Builder → Mirror Code
 * 2. Mirror Code → Parser → Valid AST
 * 3. AST → React Generator → Rendered Output
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../test-utils';

/**
 * Filter out warnings from the errors array.
 * The parser puts both errors and warnings in the errors array for backwards compatibility.
 */
function getActualErrors(errors: string[]): string[] {
  return errors.filter(e => !e.startsWith('Warning:'));
}

// Experts
import { generateSidebarNavigationFromSchema } from '../../services/generation/experts/sidebar-navigation';
import { generateFormFromSchema } from '../../services/generation/experts/form';

// Schemas
import type { SidebarNavigationInput } from '../../services/generation/schemas/sidebar-navigation';
import type { FormInput } from '../../services/generation/schemas/form';

// =============================================================================
// SIDEBAR NAVIGATION E2E
// =============================================================================

describe('E2E: SidebarNavigation Expert', () => {
  const testCases: Array<{ name: string; input: SidebarNavigationInput }> = [
    {
      name: 'minimal flat navigation',
      input: {
        items: [
          { icon: 'home', label: 'Home', active: true },
          { icon: 'settings', label: 'Settings' },
        ],
      },
    },
    {
      name: 'grouped navigation',
      input: {
        structure: 'grouped',
        groups: [
          {
            label: 'Main',
            items: [
              { icon: 'home', label: 'Dashboard', active: true },
              { icon: 'folder', label: 'Projects' },
            ],
          },
          {
            label: 'Admin',
            items: [
              { icon: 'users', label: 'Users' },
              { icon: 'settings', label: 'Settings' },
            ],
          },
        ],
      },
    },
    {
      name: 'collapsible navigation with badges',
      input: {
        visibility: 'collapsible',
        badges: 'count',
        items: [
          { icon: 'inbox', label: 'Inbox', badge: '12', active: true },
          { icon: 'send', label: 'Sent' },
          { icon: 'trash', label: 'Trash', badge: '3' },
        ],
      },
    },
  ];

  it.each(testCases)('$name: generates valid Mirror code', ({ input }) => {
    const result = generateSidebarNavigationFromSchema(input);

    expect(result.success).toBe(true);
    expect(result.code).toBeDefined();

    // Parse the generated code
    const parsed = parse(result.code!);
    const actualErrors = getActualErrors(parsed.errors);
    expect(actualErrors).toHaveLength(0);
  });

  it.each(testCases)('$name: code contains expected components', ({ input }) => {
    const result = generateSidebarNavigationFromSchema(input);
    const code = result.code!;

    // All navigations should have NavItem and Nav
    expect(code).toContain('NavItem:');
    expect(code).toContain('Nav');

    // Should have tokens
    expect(code).toContain('$bg:');
    expect(code).toContain('$text:');

    // Should have hover state
    expect(code).toContain('hover');
    expect(code).toContain('bg $hover');

    // Should have active state
    expect(code).toContain('state active');
  });

  it('grouped navigation has NavSection', () => {
    const input: SidebarNavigationInput = {
      structure: 'grouped',
      groups: [
        { label: 'Group 1', items: [{ icon: 'home', label: 'Home' }] },
      ],
    };

    const result = generateSidebarNavigationFromSchema(input);
    expect(result.code).toContain('NavSection:');
  });

  it('collapsible navigation has toggle', () => {
    const input: SidebarNavigationInput = {
      visibility: 'collapsible',
      items: [{ icon: 'home', label: 'Home' }],
    };

    const result = generateSidebarNavigationFromSchema(input);
    expect(result.code).toContain('ToggleNav:');
    expect(result.code).toContain('state expanded');
    expect(result.code).toContain('state collapsed');
  });
});

// =============================================================================
// FORM E2E
// =============================================================================

describe('E2E: Form Expert', () => {
  const testCases: Array<{ name: string; input: FormInput }> = [
    {
      name: 'minimal login form',
      input: {
        fields: [
          { type: 'email', name: 'email', label: 'Email', required: true },
          { type: 'password', name: 'password', label: 'Password', required: true },
        ],
        submit: { label: 'Sign In' },
      },
    },
    {
      name: 'contact form with textarea',
      input: {
        fields: [
          { type: 'text', name: 'name', label: 'Name', required: true },
          { type: 'email', name: 'email', label: 'Email', required: true },
          { type: 'textarea', name: 'message', label: 'Message', required: true, rows: 5 },
        ],
        submit: { label: 'Send' },
      },
    },
    {
      name: 'signup form with password toggle',
      input: {
        fields: [
          { type: 'text', name: 'username', label: 'Username', required: true },
          { type: 'email', name: 'email', label: 'Email', required: true },
          { type: 'password', name: 'password', label: 'Password', required: true, showToggle: true },
        ],
        submit: { label: 'Create Account' },
      },
    },
    {
      name: 'compact density form',
      input: {
        density: 'compact',
        fields: [
          { type: 'text', name: 'search', label: 'Search' },
        ],
        submit: { label: 'Go' },
      },
    },
  ];

  it.each(testCases)('$name: generates valid Mirror code', ({ name, input }) => {
    const result = generateFormFromSchema(input);

    expect(result.success).toBe(true);
    expect(result.code).toBeDefined();

    // Parse the generated code
    const parsed = parse(result.code!);
    const actualErrors = getActualErrors(parsed.errors);

    if (actualErrors.length > 0) {
      console.log(`\n=== ${name} - ERRORS ===`);
      console.log(result.code);
      console.log('\nErrors:', actualErrors);
    }

    expect(actualErrors).toHaveLength(0);
  });

  it.each(testCases)('$name: code contains expected components', ({ input }) => {
    const result = generateFormFromSchema(input);
    const code = result.code!;

    // All forms should have core components
    expect(code).toContain('Form ver');
    expect(code).toContain('Label:');

    // Should have tokens
    expect(code).toContain('$bg:');
    expect(code).toContain('$text:');
    expect(code).toContain('$primary:');

    // Should have focus state
    expect(code).toContain('focus');

    // Should have invalid state
    expect(code).toContain('state invalid');
  });

  it('required fields use FieldRequired', () => {
    const input: FormInput = {
      fields: [
        { type: 'text', name: 'name', label: 'Name', required: true },
      ],
      submit: { label: 'Save' },
    };

    const result = generateFormFromSchema(input);
    expect(result.code).toContain('FieldRequired');
    expect(result.code).toContain('Asterisk');
  });

  it('password with toggle has visibility control', () => {
    const input: FormInput = {
      fields: [
        { type: 'password', name: 'pw', label: 'Password', showToggle: true },
      ],
      submit: { label: 'Submit' },
    };

    const result = generateFormFromSchema(input);
    expect(result.code).toContain('PasswordField');
    expect(result.code).toContain('Toggle');
    // Uses named Icon for proper state coupling
    expect(result.code).toContain('Icon named EyeIcon, "eye"');
  });

  it('textarea fields use TextareaInput', () => {
    const input: FormInput = {
      fields: [
        { type: 'textarea', name: 'bio', label: 'Bio', rows: 4 },
      ],
      submit: { label: 'Save' },
    };

    const result = generateFormFromSchema(input);
    expect(result.code).toContain('TextareaInput');
    expect(result.code).toContain('minh');
  });
});

// =============================================================================
// CROSS-EXPERT CONSISTENCY
// =============================================================================

describe('E2E: Cross-Expert Consistency', () => {
  it('both experts use same token naming conventions', () => {
    const navResult = generateSidebarNavigationFromSchema({
      items: [{ icon: 'home', label: 'Home' }],
    });

    const formResult = generateFormFromSchema({
      fields: [{ type: 'text', name: 'x', label: 'X' }],
      submit: { label: 'Go' },
    });

    // Both should define $bg, $text
    expect(navResult.code).toContain('$bg:');
    expect(formResult.code).toContain('$bg:');
    expect(navResult.code).toContain('$text:');
    expect(formResult.code).toContain('$text:');
  });

  it('both experts generate hover states', () => {
    const navResult = generateSidebarNavigationFromSchema({
      items: [{ icon: 'home', label: 'Home' }],
    });

    const formResult = generateFormFromSchema({
      fields: [{ type: 'text', name: 'x', label: 'X' }],
      submit: { label: 'Go' },
    });

    expect(navResult.code).toContain('hover');
    expect(formResult.code).toContain('hover');
  });

  it('both experts produce parseable code simultaneously', () => {
    const navResult = generateSidebarNavigationFromSchema({
      items: [
        { icon: 'home', label: 'Dashboard', active: true },
        { icon: 'settings', label: 'Settings' },
      ],
    });

    const formResult = generateFormFromSchema({
      fields: [
        { type: 'email', name: 'email', label: 'Email' },
        { type: 'password', name: 'password', label: 'Password' },
      ],
      submit: { label: 'Login' },
    });

    // Parse both
    const navParsed = parse(navResult.code!);
    const formParsed = parse(formResult.code!);

    expect(getActualErrors(navParsed.errors)).toHaveLength(0);
    expect(getActualErrors(formParsed.errors)).toHaveLength(0);

    // Log for visual inspection
    console.log('\n=== Generated Navigation ===');
    console.log(navResult.code);
    console.log('\n=== Generated Form ===');
    console.log(formResult.code);
  });
});
