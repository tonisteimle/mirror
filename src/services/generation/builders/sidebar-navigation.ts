/**
 * Sidebar Navigation Builder
 *
 * Transforms a validated SidebarNavigationSchema into Mirror code.
 * This is deterministic - same input always produces same output.
 *
 * Phase 2 Features:
 * - Badges: Counter/status indicators on items
 * - Grouped: Sections with headers
 * - Collapsible: expanded ↔ rail mode
 *
 * Phase 3 Features:
 * - Tree: Hierarchical navigation with expand/collapse
 * - Drawer: Mobile overlay navigation
 */

import type {
  SidebarNavigation,
  SidebarNavigationInput,
  SidebarNavigationItem,
  SidebarNavigationGroup,
  SidebarNavigationTreeItem,
} from '../schemas/sidebar-navigation';
import {
  parseSidebarNavigation,
  validateSidebarNavigationInput
} from '../schemas/sidebar-navigation';
import {
  resolveBackground,
  resolveForeground,
  resolveSpacing,
  resolveRadius
} from '../design-defaults';

/**
 * Check if any item has a badge
 */
function hasBadges(config: SidebarNavigation): boolean {
  return config.items.some(item => item.badge !== undefined);
}

/**
 * Build Mirror code from sidebar navigation input
 */
export function buildSidebarNavigation(input: SidebarNavigationInput): string {
  // Validate and apply defaults
  const config = parseSidebarNavigation(input);

  const lines: string[] = [];

  // Build tokens first
  lines.push(...buildTokens(config));
  lines.push('');

  // Phase 3: Drawer definitions
  if (config.visibility === 'drawer') {
    lines.push(...buildDrawerBackdropDefinition());
    lines.push('');
    lines.push(...buildMenuButtonDefinition());
    lines.push('');
    lines.push(...buildDrawerDefinition(config));
    lines.push('');
  }

  // Build NavSection definition if grouped structure
  if (config.structure === 'grouped') {
    lines.push(...buildNavSectionDefinition());
    lines.push('');
  }

  // Phase 3: Tree definitions
  if (config.structure === 'tree') {
    lines.push(...buildTreeItemDefinition(config));
    lines.push('');
    lines.push(...buildTreeLeafDefinition(config));
    lines.push('');
  }

  // Build ToggleNav for collapsible mode
  if (config.visibility === 'collapsible') {
    lines.push(...buildToggleNavDefinition());
    lines.push('');
  }

  // Build NavItemBadge definition if any item has badges (only for non-tree)
  if (config.structure !== 'tree' && hasBadges(config)) {
    lines.push(...buildNavItemBadgeDefinition(config));
    lines.push('');
  }

  // Build NavItem definition (only for non-tree)
  if (config.structure !== 'tree') {
    lines.push(...buildNavItemDefinition(config));
    lines.push('');
  }

  // Build Nav container with instances
  lines.push(...buildNavContainer(config));

  return lines.join('\n');
}

/**
 * Build semantic color tokens
 */
function buildTokens(config: SidebarNavigation): string[] {
  const { itemStyle, iconStyle, container } = config;

  const tokens = [
    `$bg: ${resolveBackground(container.background)}`,
    `$hover: ${resolveBackground(itemStyle.hoverBackground)}`,
    `$active: ${resolveBackground(itemStyle.activeBackground)}`,
    `$text: ${resolveForeground(itemStyle.color)}`,
    `$muted: ${resolveForeground(iconStyle.color)}`,
  ];

  // Add badge token if any item has a badge
  if (hasBadges(config)) {
    tokens.push(`$badge-bg: ${resolveBackground('elevated')}`);
  }

  return tokens;
}

/**
 * Build NavSection definition for grouped structure
 */
function buildNavSectionDefinition(): string[] {
  return [
    'NavSection:',
    '  Label "", col $muted, fs 11, uppercase, pad 8 16'
  ];
}

// Name for the Nav container when collapsible
const COLLAPSIBLE_NAV_NAME = 'MainNav';

/**
 * Build ToggleNav definition for collapsible mode
 * References the parent Nav by name to toggle its state
 *
 * Positioned on the right side using width full + right alignment
 * Icon swaps between chevron-left (expanded) and chevron-right (collapsed)
 * - chevron-left: "click to collapse" (pointing towards the content that will hide)
 * - chevron-right: "click to expand" (pointing towards the content that will appear)
 */
function buildToggleNavDefinition(): string[] {
  return [
    'ToggleNav:',
    '  hor, right, width full, pad 8 16 8 8, cursor pointer',
    '  Icon named Arrow, "chevron-left", col $muted, is 18',
    '  state expanded',
    '    Arrow "chevron-left"',
    '  state collapsed',
    '    Arrow "chevron-right"',
    `  onclick toggle-state ${COLLAPSIBLE_NAV_NAME}`
  ];
}

/**
 * Build NavItemBadge component definition
 * Separate component from NavItem to avoid parser's child-bleeding bug.
 * When adding children to a template instance, they "bleed" to subsequent instances.
 *
 * Icon has minw to prevent shrinking, Label has truncate for proper clipping
 */
function buildNavItemBadgeDefinition(config: SidebarNavigation): string[] {
  const { itemStyle, iconStyle } = config;
  const display = itemStyle.display;
  const showIcon = display !== 'text-only';
  const showLabel = display !== 'icon-only';

  const itemProps: string[] = [
    'hor',
    'ver-center',
  ];

  // Only add gap if both icon and label are shown
  if (showIcon && showLabel) {
    itemProps.push(`gap ${resolveSpacing(itemStyle.gap)}`);
  }

  itemProps.push(`pad ${resolveSpacing(itemStyle.paddingVertical)} ${resolveSpacing(itemStyle.paddingHorizontal)}`);
  itemProps.push(`rad ${resolveRadius(itemStyle.radius)}`);

  if (itemStyle.background !== 'transparent') {
    itemProps.push(`bg ${resolveBackground(itemStyle.background)}`);
  }

  const lines: string[] = [
    'NavItemBadge:',
    `  ${itemProps.join(', ')}`
  ];

  // Icon with minw to prevent shrinking when Nav collapses
  if (showIcon) {
    const iconProps: string[] = [`minw ${iconStyle.size}`, 'col $muted'];
    if (iconStyle.size !== 20) {
      iconProps.push(`is ${iconStyle.size}`);
    }
    lines.push(`  Icon "", ${iconProps.join(', ')}`);
  }

  // Label with truncate to prevent wrapping, hidden when clipped
  if (showLabel) {
    lines.push(`  Label "", col $text, width full, truncate`);
  }

  lines.push(`  Badge "", hor, center, minw 20, h 18, rad 999, bg $badge-bg, col $text, fs 11`);
  lines.push(`  hover`);
  lines.push(`    bg $hover`);
  lines.push(`  state active`);
  lines.push(`    bg $active`);

  return lines;
}

/**
 * Build the NavItem component definition
 */
function buildNavItemDefinition(config: SidebarNavigation): string[] {
  const { itemStyle, iconStyle } = config;
  const showBadges = hasBadges(config);
  const display = itemStyle.display;
  const showIcon = display !== 'text-only';
  const showLabel = display !== 'icon-only';

  const lines: string[] = [];

  // NavItem definition
  const itemProps: string[] = [
    'hor',
    'ver-center',  // align icon and text vertically
  ];

  // Only add gap if both icon and label are shown
  if (showIcon && showLabel) {
    itemProps.push(`gap ${resolveSpacing(itemStyle.gap)}`);
  }

  itemProps.push(`pad ${resolveSpacing(itemStyle.paddingVertical)} ${resolveSpacing(itemStyle.paddingHorizontal)}`);
  itemProps.push(`rad ${resolveRadius(itemStyle.radius)}`);

  // Only add background if not transparent
  if (itemStyle.background !== 'transparent') {
    itemProps.push(`bg ${resolveBackground(itemStyle.background)}`);
  }

  lines.push(`NavItem:`);
  lines.push(`  ${itemProps.join(', ')}`);

  // Icon slot - minw prevents shrinking when Nav collapses
  if (showIcon) {
    const iconProps: string[] = [`minw ${iconStyle.size}`, 'col $muted'];
    if (iconStyle.size !== 20) {
      iconProps.push(`is ${iconStyle.size}`);
    }
    lines.push(`  Icon "", ${iconProps.join(', ')}`);
  }

  // Label slot - truncate for proper clipping when Nav collapses
  if (showLabel) {
    if (showBadges) {
      lines.push(`  Label "", col $text, width full, truncate`);
    } else {
      lines.push(`  Label "", col $text, truncate`);
    }
  }

  // Note: Badge is NOT defined as a slot in the template due to a parser bug where
  // semicolon-syntax child overrides "bleed" to subsequent instances.
  // Instead, Badge is defined separately and only included in instances that have badges.

  // Hover state - use $hover token
  lines.push(`  hover`);
  lines.push(`    bg $hover`);

  // Active state - use $active token
  lines.push(`  state active`);
  lines.push(`    bg $active`);
  if (itemStyle.activeColor !== itemStyle.color) {
    lines.push(`    col ${resolveForeground(itemStyle.activeColor)}`);
  }

  return lines;
}

// =============================================================================
// PHASE 3: TREE STRUCTURE
// =============================================================================

/**
 * Build TreeItem component definition
 * Handles expand/collapse with chevron rotation
 */
function buildTreeItemDefinition(config: SidebarNavigation): string[] {
  const { itemStyle, iconStyle } = config;
  const display = itemStyle.display;
  const showIcon = display !== 'text-only';
  const showLabel = display !== 'icon-only';

  const lines: string[] = [
    'TreeItem:',
    '  ver',
    `  TreeHeader hor, ver-center, gap ${resolveSpacing(itemStyle.gap)}, pad ${resolveSpacing(itemStyle.paddingVertical)} ${resolveSpacing(itemStyle.paddingHorizontal)}, rad ${resolveRadius(itemStyle.radius)}, cursor pointer`,
    '    Chevron Icon "chevron-right", is 14, col $muted',
  ];

  if (showIcon) {
    lines.push(`    Icon "", col $muted${iconStyle.size !== 20 ? `, is ${iconStyle.size}` : ''}`);
  }

  if (showLabel) {
    lines.push('    Label "", col $text');
  }

  lines.push('    hover');
  lines.push('      bg $hover');
  lines.push('    state active');
  lines.push('      bg $active');
  lines.push('    state expanded');
  lines.push('      Chevron rot 90');
  lines.push('  TreeChildren ver, pad-left 16, hidden');
  lines.push('    state expanded');
  lines.push('      visible');
  lines.push('  onclick toggle-state');

  return lines;
}

/**
 * Build TreeLeaf component definition (no children, no chevron)
 */
function buildTreeLeafDefinition(config: SidebarNavigation): string[] {
  const { itemStyle, iconStyle } = config;
  const display = itemStyle.display;
  const showIcon = display !== 'text-only';
  const showLabel = display !== 'icon-only';

  const lines: string[] = [
    'TreeLeaf:',
    `  hor, ver-center, gap ${resolveSpacing(itemStyle.gap)}, pad ${resolveSpacing(itemStyle.paddingVertical)} ${resolveSpacing(itemStyle.paddingHorizontal)}, pad-left 30, rad ${resolveRadius(itemStyle.radius)}, cursor pointer`,
  ];

  if (showIcon) {
    lines.push(`  Icon "", col $muted${iconStyle.size !== 20 ? `, is ${iconStyle.size}` : ''}`);
  }

  if (showLabel) {
    lines.push('  Label "", col $text');
  }

  lines.push('  hover');
  lines.push('    bg $hover');
  lines.push('  state active');
  lines.push('    bg $active');

  return lines;
}

/**
 * Build tree item instances recursively
 */
function buildTreeItemInstance(
  item: SidebarNavigationTreeItem,
  indent: string,
  config: SidebarNavigation
): string[] {
  const { itemStyle } = config;
  const display = itemStyle.display;
  const showIcon = display !== 'text-only';
  const showLabel = display !== 'icon-only';

  const lines: string[] = [];
  const hasChildren = item.children.length > 0;

  // Build instance parts based on display mode
  const instanceParts: string[] = [];
  if (showIcon) {
    instanceParts.push(`Icon "${item.icon}"`);
  }
  if (showLabel) {
    instanceParts.push(`Label "${item.label}"`);
  }

  if (hasChildren) {
    // TreeItem with children
    const states: string[] = [];
    if (item.active) states.push('active');
    if (item.expanded) states.push('expanded');
    const stateStr = states.length > 0 ? ` ${states.join(', ')},` : '';

    lines.push(`${indent}TreeItem${stateStr} TreeHeader ${instanceParts.join('; ')}`);
    lines.push(`${indent}  TreeChildren`);
    for (const child of item.children) {
      lines.push(...buildTreeItemInstance(child, `${indent}    `, config));
    }
  } else {
    // TreeLeaf (no children)
    const activeStr = item.active ? ' active,' : '';
    lines.push(`${indent}TreeLeaf${activeStr} ${instanceParts.join('; ')}`);
  }

  return lines;
}

// =============================================================================
// PHASE 3: DRAWER (MOBILE)
// =============================================================================

const DRAWER_NAV_NAME = 'DrawerNav';

/**
 * Build drawer backdrop (closes drawer on click)
 */
function buildDrawerBackdropDefinition(): string[] {
  return [
    'DrawerBackdrop:',
    '  position fixed, inset 0, bg #00000080, z 100, hidden',
    '  show fade 150',
    '  hide fade 100',
    `  onclick hide ${DRAWER_NAV_NAME}, hide self`
  ];
}

/**
 * Build drawer container
 */
function buildDrawerDefinition(config: SidebarNavigation): string[] {
  const { container } = config;

  return [
    `${DRAWER_NAV_NAME}:`,
    `  position fixed, left 0, top 0, bottom 0, width ${container.width}, bg $bg, shadow lg, z 101, hidden`,
    '  show slide-right 200',
    '  hide slide-left 150'
  ];
}

/**
 * Build menu button to open drawer
 */
function buildMenuButtonDefinition(): string[] {
  return [
    'MenuButton:',
    '  Icon "menu", pad 8, col $text, cursor pointer',
    `  onclick show ${DRAWER_NAV_NAME}, show DrawerBackdrop`
  ];
}

// =============================================================================
// NAV ITEM INSTANCE BUILDER
// =============================================================================

/**
 * Build NavItem instance line
 *
 * For items WITHOUT badge: uses NavItem
 *   NavItem Icon "home"; Label "Dashboard"
 *
 * For items WITH badge: uses NavItemBadge (separate component to avoid bleeding bug)
 *   NavItemBadge Icon "inbox"; Label "Unread"; Badge "12"
 */
function buildNavItemInstance(
  item: SidebarNavigationItem,
  showBadges: boolean,
  indent: string,
  config: SidebarNavigation
): string[] {
  const { itemStyle } = config;
  const display = itemStyle.display;
  const showIcon = display !== 'text-only';
  const showLabel = display !== 'icon-only';

  const instanceParts: string[] = [];

  if (showIcon) {
    instanceParts.push(`Icon "${item.icon}"`);
  }

  if (showLabel) {
    instanceParts.push(`Label "${item.label}"`);
  }

  // Use NavItemBadge for items with badges, NavItem for others
  const hasBadge = showBadges && item.badge !== undefined;
  if (hasBadge) {
    instanceParts.push(`Badge "${item.badge}"`);
  }

  const componentName = hasBadge ? 'NavItemBadge' : 'NavItem';
  const instanceStr = item.active
    ? `${componentName} active, ${instanceParts.join('; ')}`
    : `${componentName} ${instanceParts.join('; ')}`;

  return [`${indent}${instanceStr}`];
}

/**
 * Build the Nav container with item instances
 */
function buildNavContainer(config: SidebarNavigation): string[] {
  const { container, visibility, structure, items, groups, tree } = config;
  const showBadges = hasBadges(config);
  const isCollapsible = visibility === 'collapsible';
  const isDrawer = visibility === 'drawer';
  const isGrouped = structure === 'grouped';
  const isTree = structure === 'tree';

  const lines: string[] = [];

  // Nav definition with properties - use $bg token
  const navProps: string[] = [
    `${container.width}`,
    'ver',
    `gap ${resolveSpacing(container.gap)}`,
    `pad ${resolveSpacing(container.padding)}`,
    `bg $bg`
  ];

  // Add expanded state and clip for collapsible mode
  if (isCollapsible) {
    navProps.push('clip');  // Hide overflow when collapsed
    navProps.push('expanded');
  }

  // Drawer mode: content goes inside DrawerNav instance
  if (isDrawer) {
    lines.push(`${DRAWER_NAV_NAME}`);
  } else if (isCollapsible) {
    // Name the Nav when collapsible so ToggleNav can reference it
    lines.push(`Nav named ${COLLAPSIBLE_NAV_NAME}, ${navProps.join(', ')}`);
  } else {
    lines.push(`Nav ${navProps.join(', ')}`);
  }

  // Add collapsed/expanded states for collapsible mode
  if (isCollapsible) {
    lines.push(`  state expanded`);
    lines.push(`    width ${container.width}`);
    lines.push(`  state collapsed`);
    lines.push(`    width ${container.railWidth}`);
    // Note: Labels hidden via clip property when width reduces to railWidth

    // Add toggle button - starts expanded to match Nav's initial state
    lines.push(`  ToggleNav expanded`);
  }

  // Build content based on structure
  if (isTree && tree.length > 0) {
    // Tree structure: render tree items recursively
    for (const item of tree) {
      lines.push(...buildTreeItemInstance(item, '  ', config));
    }
  } else if (isGrouped && groups.length > 0) {
    // Grouped structure: render sections with their items
    for (const group of groups) {
      lines.push(`  NavSection Label "${group.label}"`);
      for (const item of group.items) {
        lines.push(...buildNavItemInstance(item, showBadges, '  ', config));
      }
    }
  } else {
    // Flat structure: render items directly
    for (const item of items) {
      lines.push(...buildNavItemInstance(item, showBadges, '  ', config));
    }
  }

  // For drawer mode, add backdrop and menu button instances
  if (isDrawer) {
    lines.push('');
    lines.push('DrawerBackdrop');
    lines.push('MenuButton');
  }

  return lines;
}

/**
 * Validate input without building
 */
export function validateSidebarNavigation(input: unknown): {
  success: boolean;
  error?: string;
  data?: SidebarNavigation;
} {
  const validationResult = validateSidebarNavigationInput(input);

  if (!validationResult.success) {
    return {
      success: false,
      error: validationResult.error
    };
  }

  try {
    const data = parseSidebarNavigation(input);
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}
