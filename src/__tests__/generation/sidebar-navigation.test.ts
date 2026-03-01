import { describe, it, expect } from 'vitest';
import {
  buildSidebarNavigation,
  validateSidebarNavigation
} from '../../services/generation/builders/sidebar-navigation';
import {
  SidebarNavigationInput,
  parseSidebarNavigation,
  TreeItemInput
} from '../../services/generation/schemas/sidebar-navigation';

describe('SidebarNavigation Builder', () => {
  describe('MVP: Simple flat navigation', () => {
    it('generates correct Mirror code for minimal input', () => {
      const input: SidebarNavigationInput = {
        items: [
          { icon: 'home', label: 'Dashboard', active: true },
          { icon: 'users', label: 'Users' },
          { icon: 'settings', label: 'Settings' }
        ]
      };

      const result = buildSidebarNavigation(input);

      // Should contain token definitions
      expect(result).toContain('$bg: #18181B');
      expect(result).toContain('$hover: #3F3F46');
      expect(result).toContain('$active: #3F3F46');

      // Should contain NavItem definition
      expect(result).toContain('NavItem:');
      expect(result).toContain('hor');
      expect(result).toContain('Icon ""');
      expect(result).toContain('Label ""');

      // Should contain hover state using token
      expect(result).toContain('hover');
      expect(result).toContain('bg $hover');

      // Should contain active state
      expect(result).toContain('state active');
      expect(result).toContain('bg $active');

      // Should contain Nav container using token
      expect(result).toContain('Nav 240');
      expect(result).toContain('ver');
      expect(result).toContain('bg $bg');

      // Should contain item instances
      expect(result).toContain('NavItem active, Icon "home"; Label "Dashboard"');
      expect(result).toContain('NavItem Icon "users"; Label "Users"');
      expect(result).toContain('NavItem Icon "settings"; Label "Settings"');
    });

    it('generates valid Mirror code structure', () => {
      const input: SidebarNavigationInput = {
        items: [
          { icon: 'home', label: 'Home' },
          { icon: 'star', label: 'Favorites' }
        ]
      };

      const result = buildSidebarNavigation(input);
      const lines = result.split('\n');

      // First line should be token definition (tokens come first)
      expect(lines[0]).toBe('$bg: #18181B');

      // Should contain NavItem definition
      expect(result).toContain('NavItem:');

      // Should have proper indentation
      const indentedLines = lines.filter(l => l.startsWith('  '));
      expect(indentedLines.length).toBeGreaterThan(0);

      // Nav container should not be indented
      const navLine = lines.find(l => l.startsWith('Nav '));
      expect(navLine).toBeDefined();
    });

    it('applies default styling values', () => {
      const input: SidebarNavigationInput = {
        items: [{ icon: 'home', label: 'Home' }]
      };

      const result = buildSidebarNavigation(input);

      // Default container: width 240, surface background, sm padding, xs gap
      expect(result).toContain('Nav 240');
      expect(result).toContain('pad 8');       // sm = 8
      expect(result).toContain('gap 4');       // xs = 4

      // Default item: sm padding vertical, md horizontal, sm gap, sm radius
      expect(result).toContain('pad 8 16');    // sm=8, md=16
      expect(result).toContain('rad 4');       // sm = 4
    });

    it('marks active item correctly', () => {
      const input: SidebarNavigationInput = {
        items: [
          { icon: 'home', label: 'Home' },
          { icon: 'star', label: 'Favorites', active: true },
          { icon: 'settings', label: 'Settings' }
        ]
      };

      const result = buildSidebarNavigation(input);

      // Only Favorites should be active
      expect(result).not.toContain('NavItem active, Icon "home"; Label "Home"');
      expect(result).toContain('NavItem active, Icon "star"; Label "Favorites"');
      expect(result).not.toContain('NavItem active, Icon "settings"; Label "Settings"');
    });
  });

  describe('Validation', () => {
    it('validates correct input', () => {
      const input = {
        items: [{ icon: 'home', label: 'Home' }]
      };

      const result = validateSidebarNavigation(input);
      expect(result.success).toBe(true);
    });

    it('rejects empty items array', () => {
      const input = {
        items: []
      };

      const result = validateSidebarNavigation(input);
      expect(result.success).toBe(false);
    });

    it('rejects missing icon', () => {
      const input = {
        items: [{ label: 'Home' }]
      };

      const result = validateSidebarNavigation(input);
      expect(result.success).toBe(false);
    });

    it('rejects missing label', () => {
      const input = {
        items: [{ icon: 'home' }]
      };

      const result = validateSidebarNavigation(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Custom styling', () => {
    it('allows custom container width', () => {
      const input: SidebarNavigationInput = {
        items: [{ icon: 'home', label: 'Home' }],
        container: { width: 300 }
      };

      const result = buildSidebarNavigation(input);
      expect(result).toContain('Nav 300');
    });

    it('allows custom background', () => {
      const input: SidebarNavigationInput = {
        items: [{ icon: 'home', label: 'Home' }],
        container: { background: 'elevated' }
      };

      const result = buildSidebarNavigation(input);
      // elevated = #27272A, now using tokens
      expect(result).toContain('$bg: #27272A');
      expect(result).toContain('bg $bg');
    });

    it('allows custom item radius', () => {
      const input: SidebarNavigationInput = {
        items: [{ icon: 'home', label: 'Home' }],
        itemStyle: { radius: 'md' }
      };

      const result = buildSidebarNavigation(input);
      expect(result).toContain('rad 8'); // md = 8
    });
  });

  describe('Output format', () => {
    it('produces parseable Mirror code', () => {
      const input: SidebarNavigationInput = {
        items: [
          { icon: 'home', label: 'Dashboard', active: true },
          { icon: 'folder', label: 'Projects' },
          { icon: 'users', label: 'Team' },
          { icon: 'bar-chart', label: 'Reports' },
          { icon: 'settings', label: 'Settings' }
        ]
      };

      const result = buildSidebarNavigation(input);

      // Log for manual inspection
      console.log('Generated Mirror code:');
      console.log(result);

      // Basic structure checks
      expect(result).toContain('NavItem:');
      expect(result).toContain('Nav 240');
      expect(result.split('\n').length).toBeGreaterThan(10);
    });
  });

  // ===========================================
  // PHASE 2: Badges, Grouped, Collapsible
  // ===========================================

  describe('Phase 2: Badges', () => {
    it('generates Badge slot when items have badges', () => {
      const input: SidebarNavigationInput = {
        items: [
          { icon: 'inbox', label: 'Inbox', badge: 12, active: true },
          { icon: 'send', label: 'Sent' }
        ]
      };

      const result = buildSidebarNavigation(input);

      // Should contain Badge definition (separate component to avoid bleeding bug)
      expect(result).toContain('Badge:');
      expect(result).toContain('rad 999');  // pill shape
      expect(result).toContain('$badge-bg');

      // Should contain Badge instance with value
      expect(result).toContain('Badge "12"');

      // Label should have width full to push badge right
      expect(result).toContain('Label "", col $text, width full');
    });

    it('handles numeric badges', () => {
      const input: SidebarNavigationInput = {
        items: [
          { icon: 'inbox', label: 'Inbox', badge: 42 }
        ]
      };

      const result = buildSidebarNavigation(input);
      expect(result).toContain('Badge "42"');
    });

    it('handles string badges', () => {
      const input: SidebarNavigationInput = {
        items: [
          { icon: 'star', label: 'New', badge: 'NEW' }
        ]
      };

      const result = buildSidebarNavigation(input);
      expect(result).toContain('Badge "NEW"');
    });

    it('does not add Badge when no items have badges', () => {
      const input: SidebarNavigationInput = {
        items: [
          { icon: 'home', label: 'Home' },
          { icon: 'settings', label: 'Settings' }
        ]
      };

      const result = buildSidebarNavigation(input);
      expect(result).not.toContain('Badge');
      expect(result).not.toContain('$badge-bg');
    });

    it('only adds badge token when needed', () => {
      const withBadge: SidebarNavigationInput = {
        items: [{ icon: 'inbox', label: 'Inbox', badge: 5 }]
      };
      const withoutBadge: SidebarNavigationInput = {
        items: [{ icon: 'home', label: 'Home' }]
      };

      const resultWith = buildSidebarNavigation(withBadge);
      const resultWithout = buildSidebarNavigation(withoutBadge);

      expect(resultWith).toContain('$badge-bg');
      expect(resultWithout).not.toContain('$badge-bg');
    });
  });

  describe('Phase 2: Grouped structure', () => {
    it('generates NavSection for grouped structure', () => {
      const input: SidebarNavigationInput = {
        structure: 'grouped',
        groups: [
          {
            label: 'Main',
            items: [
              { icon: 'home', label: 'Dashboard', active: true }
            ]
          },
          {
            label: 'System',
            items: [
              { icon: 'settings', label: 'Settings' }
            ]
          }
        ]
      };

      const result = buildSidebarNavigation(input);

      // Should contain NavSection definition
      expect(result).toContain('NavSection:');
      expect(result).toContain('uppercase');
      expect(result).toContain('fs 11');

      // Should contain section instances
      expect(result).toContain('NavSection Label "Main"');
      expect(result).toContain('NavSection Label "System"');

      // Should contain items
      expect(result).toContain('NavItem active, Icon "home"; Label "Dashboard"');
      expect(result).toContain('NavItem Icon "settings"; Label "Settings"');
    });

    it('infers grouped structure from groups array', () => {
      const input: SidebarNavigationInput = {
        groups: [
          {
            label: 'Menu',
            items: [{ icon: 'home', label: 'Home' }]
          }
        ]
      };

      const parsed = parseSidebarNavigation(input);
      expect(parsed.structure).toBe('grouped');
    });

    it('maintains flat structure with items array', () => {
      const input: SidebarNavigationInput = {
        items: [{ icon: 'home', label: 'Home' }]
      };

      const parsed = parseSidebarNavigation(input);
      expect(parsed.structure).toBe('flat');
    });

    it('handles multiple groups with multiple items', () => {
      const input: SidebarNavigationInput = {
        groups: [
          {
            label: 'Overview',
            items: [
              { icon: 'layout-dashboard', label: 'Dashboard', active: true },
              { icon: 'bar-chart', label: 'Analytics' }
            ]
          },
          {
            label: 'Content',
            items: [
              { icon: 'file-text', label: 'Pages' },
              { icon: 'image', label: 'Media' }
            ]
          }
        ]
      };

      const result = buildSidebarNavigation(input);

      expect(result).toContain('NavSection Label "Overview"');
      expect(result).toContain('NavSection Label "Content"');
      expect(result).toContain('Label "Dashboard"');
      expect(result).toContain('Label "Analytics"');
      expect(result).toContain('Label "Pages"');
      expect(result).toContain('Label "Media"');
    });
  });

  describe('Phase 2: Collapsible mode', () => {
    it('generates ToggleNav for collapsible mode', () => {
      const input: SidebarNavigationInput = {
        visibility: 'collapsible',
        items: [
          { icon: 'home', label: 'Dashboard', active: true }
        ]
      };

      const result = buildSidebarNavigation(input);

      // Should contain ToggleNav definition with icon swap
      expect(result).toContain('ToggleNav:');
      expect(result).toContain('Icon named Arrow, "chevron-left"');
      expect(result).toContain('state expanded');
      expect(result).toContain('Arrow "chevron-left"');
      expect(result).toContain('state collapsed');
      expect(result).toContain('Arrow "chevron-right"');
      expect(result).toContain('onclick toggle-state');

      // Instance should start in expanded state
      expect(result).toContain('ToggleNav expanded');
    });

    it('generates expanded/collapsed states', () => {
      const input: SidebarNavigationInput = {
        visibility: 'collapsible',
        items: [{ icon: 'home', label: 'Home' }]
      };

      const result = buildSidebarNavigation(input);

      // Should have expanded state with full width
      expect(result).toContain('state expanded');
      expect(result).toContain('width 240');

      // Should have collapsed state with rail width
      expect(result).toContain('state collapsed');
      expect(result).toContain('width 64');

      // Should have clip to hide overflow when collapsed
      expect(result).toContain('clip');
    });

    it('uses custom railWidth when provided', () => {
      const input: SidebarNavigationInput = {
        visibility: 'collapsible',
        container: { railWidth: 56 },
        items: [{ icon: 'home', label: 'Home' }]
      };

      const result = buildSidebarNavigation(input);
      expect(result).toContain('width 56');
    });

    it('starts in expanded state', () => {
      const input: SidebarNavigationInput = {
        visibility: 'collapsible',
        items: [{ icon: 'home', label: 'Home' }]
      };

      const result = buildSidebarNavigation(input);
      // Nav should have expanded as initial state
      expect(result).toMatch(/Nav.*expanded/);
    });

    it('defaults to permanent visibility', () => {
      const input: SidebarNavigationInput = {
        items: [{ icon: 'home', label: 'Home' }]
      };

      const parsed = parseSidebarNavigation(input);
      expect(parsed.visibility).toBe('permanent');

      const result = buildSidebarNavigation(input);
      expect(result).not.toContain('ToggleNav');
      expect(result).not.toContain('state expanded');
    });
  });

  describe('Phase 2: Combined features', () => {
    it('handles badges in grouped structure', () => {
      const input: SidebarNavigationInput = {
        groups: [
          {
            label: 'Messages',
            items: [
              { icon: 'inbox', label: 'Inbox', badge: 5 },
              { icon: 'send', label: 'Sent' }
            ]
          }
        ]
      };

      const result = buildSidebarNavigation(input);

      expect(result).toContain('NavSection:');
      expect(result).toContain('Badge "5"');
      expect(result).toContain('$badge-bg');
    });

    it('handles collapsible with grouped structure', () => {
      const input: SidebarNavigationInput = {
        visibility: 'collapsible',
        groups: [
          {
            label: 'Main',
            items: [{ icon: 'home', label: 'Home' }]
          }
        ]
      };

      const result = buildSidebarNavigation(input);

      expect(result).toContain('ToggleNav:');
      expect(result).toContain('NavSection:');
      expect(result).toContain('state collapsed');
    });

    it('handles all features combined', () => {
      const input: SidebarNavigationInput = {
        visibility: 'collapsible',
        groups: [
          {
            label: 'Inbox',
            items: [
              { icon: 'inbox', label: 'Unread', badge: 12, active: true },
              { icon: 'mail', label: 'All' }
            ]
          },
          {
            label: 'System',
            items: [
              { icon: 'settings', label: 'Settings' }
            ]
          }
        ]
      };

      const result = buildSidebarNavigation(input);

      // All features should be present
      expect(result).toContain('ToggleNav:');
      expect(result).toContain('NavSection:');
      expect(result).toContain('Badge "');
      expect(result).toContain('state collapsed');
      expect(result).toContain('NavSection Label "Inbox"');
      expect(result).toContain('NavSection Label "System"');

      console.log('Combined features output:');
      console.log(result);
    });
  });

  describe('Phase 2: Backward compatibility', () => {
    it('MVP input still works unchanged', () => {
      const mvpInput: SidebarNavigationInput = {
        items: [
          { icon: 'home', label: 'Dashboard', active: true },
          { icon: 'settings', label: 'Settings' }
        ]
      };

      const result = buildSidebarNavigation(mvpInput);

      // Should work exactly as before
      expect(result).toContain('NavItem:');
      expect(result).toContain('Nav 240');
      expect(result).toContain('NavItem active, Icon "home"; Label "Dashboard"');

      // Should NOT have Phase 2 features
      expect(result).not.toContain('ToggleNav');
      expect(result).not.toContain('NavSection');
      expect(result).not.toContain('Badge');
    });

    it('validates MVP schema correctly', () => {
      const mvpInput = {
        items: [{ icon: 'home', label: 'Home' }]
      };

      const result = validateSidebarNavigation(mvpInput);
      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // PHASE 3: Tree and Drawer
  // ===========================================

  describe('Phase 3: Tree structure', () => {
    it('generates TreeItem and TreeLeaf definitions', () => {
      const input: SidebarNavigationInput = {
        tree: [
          {
            icon: 'folder',
            label: 'src',
            expanded: true,
            children: [
              { icon: 'file', label: 'index.ts' },
              {
                icon: 'folder',
                label: 'components',
                children: [
                  { icon: 'file', label: 'Button.tsx', active: true }
                ]
              }
            ]
          }
        ]
      };

      const result = buildSidebarNavigation(input);

      // Should contain TreeItem definition
      expect(result).toContain('TreeItem:');
      expect(result).toContain('TreeHeader');
      expect(result).toContain('Chevron');
      expect(result).toContain('TreeChildren');

      // Should contain TreeLeaf definition
      expect(result).toContain('TreeLeaf:');

      // Should contain expand/collapse state
      expect(result).toContain('state expanded');
      expect(result).toContain('Chevron rot 90');

      console.log('Tree structure output:');
      console.log(result);
    });

    it('renders tree items recursively', () => {
      const input: SidebarNavigationInput = {
        tree: [
          {
            icon: 'folder',
            label: 'root',
            expanded: true,
            children: [
              { icon: 'file', label: 'file1.ts' },
              {
                icon: 'folder',
                label: 'nested',
                children: [
                  { icon: 'file', label: 'file2.ts' }
                ]
              }
            ]
          }
        ]
      };

      const result = buildSidebarNavigation(input);

      // Should contain all labels
      expect(result).toContain('Label "root"');
      expect(result).toContain('Label "file1.ts"');
      expect(result).toContain('Label "nested"');
      expect(result).toContain('Label "file2.ts"');

      // Leaf nodes should use TreeLeaf
      expect(result).toContain('TreeLeaf');
    });

    it('handles active state in tree', () => {
      const input: SidebarNavigationInput = {
        tree: [
          {
            icon: 'folder',
            label: 'src',
            children: [
              { icon: 'file', label: 'index.ts', active: true }
            ]
          }
        ]
      };

      const result = buildSidebarNavigation(input);
      expect(result).toContain('TreeLeaf active');
    });

    it('handles expanded state', () => {
      const input: SidebarNavigationInput = {
        tree: [
          {
            icon: 'folder',
            label: 'src',
            expanded: true,
            children: [
              { icon: 'file', label: 'index.ts' }
            ]
          }
        ]
      };

      const result = buildSidebarNavigation(input);
      expect(result).toContain('TreeItem expanded');
    });

    it('infers tree structure from tree array', () => {
      const input: SidebarNavigationInput = {
        tree: [{ icon: 'folder', label: 'root' }]
      };

      const parsed = parseSidebarNavigation(input);
      expect(parsed.structure).toBe('tree');
    });
  });

  describe('Phase 3: Drawer (mobile)', () => {
    it('generates drawer components', () => {
      const input: SidebarNavigationInput = {
        visibility: 'drawer',
        items: [
          { icon: 'home', label: 'Home', active: true },
          { icon: 'settings', label: 'Settings' }
        ]
      };

      const result = buildSidebarNavigation(input);

      // Should contain DrawerBackdrop definition
      expect(result).toContain('DrawerBackdrop:');
      expect(result).toContain('position fixed');
      expect(result).toContain('bg #00000080');

      // Should contain MenuButton definition
      expect(result).toContain('MenuButton:');
      expect(result).toContain('Icon "menu"');

      // Should contain DrawerNav definition
      expect(result).toContain('DrawerNav:');
      expect(result).toContain('shadow lg');

      // Should contain show/hide animations
      expect(result).toContain('show slide-right');
      expect(result).toContain('hide slide-left');
      expect(result).toContain('show fade');
      expect(result).toContain('hide fade');

      // Should contain instances
      expect(result).toContain('DrawerBackdrop');
      expect(result).toContain('MenuButton');

      console.log('Drawer output:');
      console.log(result);
    });

    it('drawer contains nav items', () => {
      const input: SidebarNavigationInput = {
        visibility: 'drawer',
        items: [
          { icon: 'home', label: 'Home' },
          { icon: 'settings', label: 'Settings' }
        ]
      };

      const result = buildSidebarNavigation(input);

      expect(result).toContain('NavItem');
      expect(result).toContain('Label "Home"');
      expect(result).toContain('Label "Settings"');
    });

    it('drawer with grouped structure', () => {
      const input: SidebarNavigationInput = {
        visibility: 'drawer',
        groups: [
          {
            label: 'Main',
            items: [{ icon: 'home', label: 'Home' }]
          }
        ]
      };

      const result = buildSidebarNavigation(input);

      expect(result).toContain('DrawerNav');
      expect(result).toContain('NavSection');
      expect(result).toContain('Label "Main"');
    });
  });

  describe('Phase 3: Schema validation', () => {
    it('validates tree input', () => {
      const input = {
        tree: [
          {
            icon: 'folder',
            label: 'src',
            children: [
              { icon: 'file', label: 'index.ts' }
            ]
          }
        ]
      };

      const result = validateSidebarNavigation(input);
      expect(result.success).toBe(true);
    });

    it('validates drawer input', () => {
      const input = {
        visibility: 'drawer',
        items: [{ icon: 'home', label: 'Home' }]
      };

      const result = validateSidebarNavigation(input);
      expect(result.success).toBe(true);
    });

    it('rejects invalid tree structure', () => {
      const input = {
        tree: [{ label: 'missing icon' }]  // missing icon
      };

      const result = validateSidebarNavigation(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Phase 3: Display modes (icon-only, text-only)', () => {
    it('generates icon-only navigation without Label slots', () => {
      const input: SidebarNavigationInput = {
        items: [
          { icon: 'home', label: 'Dashboard' },
          { icon: 'settings', label: 'Settings' }
        ],
        itemStyle: { display: 'icon-only' }
      };

      const result = buildSidebarNavigation(input);

      // NavItem definition should have Icon but no Label
      expect(result).toContain('NavItem:');
      expect(result).toContain('Icon ""');
      expect(result).not.toMatch(/NavItem:[\s\S]*?Label ""/);

      // Instances should only have Icon
      expect(result).toContain('NavItem Icon "home"');
      expect(result).toContain('NavItem Icon "settings"');
      // Should not have Label in instances
      expect(result).not.toContain('Label "Dashboard"');
      expect(result).not.toContain('Label "Settings"');
    });

    it('generates text-only navigation without Icon slots', () => {
      const input: SidebarNavigationInput = {
        items: [
          { icon: 'home', label: 'Dashboard' },
          { icon: 'settings', label: 'Settings' }
        ],
        itemStyle: { display: 'text-only' }
      };

      const result = buildSidebarNavigation(input);

      // NavItem definition should have Label but no Icon
      expect(result).toContain('NavItem:');
      expect(result).toContain('Label ""');
      expect(result).not.toMatch(/NavItem:[\s\S]*?Icon ""/);

      // Instances should only have Label
      expect(result).toContain('NavItem Label "Dashboard"');
      expect(result).toContain('NavItem Label "Settings"');
      // Should not have Icon in instances
      expect(result).not.toContain('Icon "home"');
      expect(result).not.toContain('Icon "settings"');
    });

    it('icon-text (default) includes both Icon and Label', () => {
      const input: SidebarNavigationInput = {
        items: [
          { icon: 'home', label: 'Dashboard' }
        ],
        itemStyle: { display: 'icon-text' }
      };

      const result = buildSidebarNavigation(input);

      // Should have both slots
      expect(result).toContain('Icon ""');
      expect(result).toContain('Label ""');
      expect(result).toContain('Icon "home"; Label "Dashboard"');
    });

    it('icon-only mode omits gap property', () => {
      const input: SidebarNavigationInput = {
        items: [{ icon: 'home', label: 'Dashboard' }],
        itemStyle: { display: 'icon-only' }
      };

      const result = buildSidebarNavigation(input);

      // NavItem should not have gap when only one element
      const navItemLine = result.split('\n').find(line => line.startsWith('  hor,'));
      expect(navItemLine).toBeDefined();
      expect(navItemLine).not.toContain('gap');
    });

    it('tree structure supports icon-only mode', () => {
      const input: SidebarNavigationInput = {
        tree: [
          {
            icon: 'folder',
            label: 'src',
            children: [
              { icon: 'file', label: 'index.ts' }
            ]
          }
        ],
        itemStyle: { display: 'icon-only' }
      };

      const result = buildSidebarNavigation(input);

      // TreeItem definition should have Icon but no Label
      expect(result).toContain('TreeItem:');
      expect(result).not.toMatch(/TreeItem:[\s\S]*?Label ""/);

      // Instances should only have Icon
      expect(result).toContain('Icon "folder"');
      expect(result).not.toContain('Label "src"');
    });

    it('tree structure supports text-only mode', () => {
      const input: SidebarNavigationInput = {
        tree: [
          {
            icon: 'folder',
            label: 'src',
            children: [
              { icon: 'file', label: 'index.ts' }
            ]
          }
        ],
        itemStyle: { display: 'text-only' }
      };

      const result = buildSidebarNavigation(input);

      // TreeItem definition should have Label but no Icon
      expect(result).toContain('TreeItem:');
      expect(result).toContain('Label ""');
      // Should still have chevron icon (not the item icon)
      expect(result).toContain('Chevron Icon');

      // Instances should only have Label
      expect(result).toContain('Label "src"');
      expect(result).not.toContain('Icon "folder"');
    });

    it('validates display mode in schema', () => {
      const input = {
        items: [{ icon: 'home', label: 'Home' }],
        itemStyle: { display: 'icon-only' }
      };

      const result = validateSidebarNavigation(input);
      expect(result.success).toBe(true);
    });

    it('badges work with icon-only mode', () => {
      const input: SidebarNavigationInput = {
        items: [
          { icon: 'inbox', label: 'Inbox', badge: 5 }
        ],
        itemStyle: { display: 'icon-only' }
      };

      const result = buildSidebarNavigation(input);

      // Should have badge but no label
      expect(result).toContain('NavItemBadge:');
      expect(result).toContain('Badge ""');
      expect(result).toContain('Icon ""');
      expect(result).not.toMatch(/NavItemBadge:[\s\S]*?Label ""/);
    });
  });
});
