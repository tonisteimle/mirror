import { z } from 'zod';

/**
 * Schema for Sidebar Navigation
 *
 * MVP Scope:
 * - Permanent visibility (always visible)
 * - Fixed width
 * - Flat list (1 level, no groups)
 * - Icon + Text items
 * - Active state + Hover
 *
 * Phase 2 Scope:
 * - Collapsible visibility (expanded ↔ rail)
 * - Grouped structure (sections with headers)
 * - Badges (counters, status indicators)
 *
 * Phase 3 Scope:
 * - Drawer visibility (mobile overlay)
 * - Tree structure (hierarchical with expand/collapse)
 */

// Visibility modes
export const VisibilityMode = z.enum(['permanent', 'collapsible', 'drawer']);
export type VisibilityModeType = z.infer<typeof VisibilityMode>;

// Structure modes
export const StructureMode = z.enum(['flat', 'grouped', 'tree']);
export type StructureModeType = z.infer<typeof StructureMode>;

// Semantic spacing roles
export const SpacingRole = z.enum(['xs', 'sm', 'smd', 'md', 'lg', 'xl']);
export type SpacingRoleType = z.infer<typeof SpacingRole>;

// Semantic background roles
export const BackgroundRole = z.enum([
  'app',
  'surface',
  'elevated',
  'hover',
  'active',
  'transparent'
]);
export type BackgroundRoleType = z.infer<typeof BackgroundRole>;

// Semantic foreground roles
export const ForegroundRole = z.enum([
  'default',
  'muted',
  'heading'
]);
export type ForegroundRoleType = z.infer<typeof ForegroundRole>;

// Semantic radius roles
export const RadiusRole = z.enum(['none', 'sm', 'md', 'lg']);
export type RadiusRoleType = z.infer<typeof RadiusRole>;

// Item display modes
export const ItemDisplayMode = z.enum(['icon-text', 'icon-only', 'text-only']);
export type ItemDisplayModeType = z.infer<typeof ItemDisplayMode>;

// Single navigation item
export const NavItemSchema = z.object({
  icon: z.string(),
  label: z.string(),
  active: z.boolean().optional(),
  badge: z.union([z.number(), z.string()]).optional()  // Phase 2: Counter or status
});

// Navigation group (for grouped structure)
export const NavGroupSchema = z.object({
  label: z.string(),
  items: z.array(NavItemSchema).min(1)
});

// Tree item (for tree structure) - recursive
export interface TreeItemInput {
  icon: string;
  label: string;
  expanded?: boolean;
  active?: boolean;
  children?: TreeItemInput[];
}

export const TreeItemSchema: z.ZodType<TreeItemInput> = z.lazy(() =>
  z.object({
    icon: z.string(),
    label: z.string(),
    expanded: z.boolean().optional(),
    active: z.boolean().optional(),
    children: z.array(TreeItemSchema).optional()
  })
);

export type NavItem = z.infer<typeof NavItemSchema>;
export type NavGroup = z.infer<typeof NavGroupSchema>;
export type TreeItem = TreeItemInput;

// Default values
export const CONTAINER_DEFAULTS = {
  width: 240,
  railWidth: 64,  // Phase 2: Width in collapsed/rail mode
  background: 'surface' as const,
  padding: 'sm' as const,
  gap: 'xs' as const
};

// Phase 2 defaults
export const VISIBILITY_DEFAULT = 'permanent' as const;
export const STRUCTURE_DEFAULT = 'flat' as const;

export const ITEM_STYLE_DEFAULTS = {
  display: 'icon-text' as const,  // icon-text, icon-only, text-only
  paddingVertical: 'sm' as const,
  paddingHorizontal: 'md' as const,
  gap: 'smd' as const,  // 12px - comfortable icon-text spacing
  radius: 'sm' as const,
  background: 'transparent' as const,
  hoverBackground: 'hover' as const,
  activeBackground: 'active' as const,
  color: 'default' as const,
  activeColor: 'default' as const  // was 'heading' (#FAFAFA) - too bright
};

export const ICON_STYLE_DEFAULTS = {
  size: 20,
  color: 'muted' as const
};

// Container configuration
export const ContainerSchema = z.object({
  width: z.number().optional(),
  railWidth: z.number().optional(),  // Phase 2: Width in collapsed mode
  background: BackgroundRole.optional(),
  padding: SpacingRole.optional(),
  gap: SpacingRole.optional()
});

// Item styling configuration
export const ItemStyleSchema = z.object({
  display: ItemDisplayMode.optional(),  // icon-text (default), icon-only, text-only
  paddingVertical: SpacingRole.optional(),
  paddingHorizontal: SpacingRole.optional(),
  gap: SpacingRole.optional(),
  radius: RadiusRole.optional(),
  background: BackgroundRole.optional(),
  hoverBackground: BackgroundRole.optional(),
  activeBackground: BackgroundRole.optional(),
  color: ForegroundRole.optional(),
  activeColor: ForegroundRole.optional()
});

// Icon configuration
export const IconStyleSchema = z.object({
  size: z.number().optional(),
  color: ForegroundRole.optional()
});

// Complete sidebar navigation schema (input)
// Supports flat (items), grouped (groups), and tree structure
export const SidebarNavigationInputSchema = z.object({
  // Visibility mode
  visibility: VisibilityMode.optional(),

  // Structure mode (inferred from presence of items vs groups vs tree)
  structure: StructureMode.optional(),

  // Flat structure: direct items array
  items: z.array(NavItemSchema).optional(),

  // Grouped structure: array of groups with items
  groups: z.array(NavGroupSchema).optional(),

  // Tree structure: hierarchical items with children
  tree: z.array(TreeItemSchema).optional(),

  container: ContainerSchema.optional(),
  itemStyle: ItemStyleSchema.optional(),
  iconStyle: IconStyleSchema.optional()
}).refine(
  // Either items, groups, or tree must be present
  (data) => {
    const hasItems = data.items && data.items.length > 0;
    const hasGroups = data.groups && data.groups.length > 0;
    const hasTree = data.tree && data.tree.length > 0;
    return hasItems || hasGroups || hasTree;
  },
  { message: 'Either items, groups, or tree must be provided' }
).refine(
  // If groups is provided, structure should be 'grouped' or omitted
  (data) => {
    if (data.groups && data.groups.length > 0) {
      return data.structure === undefined || data.structure === 'grouped';
    }
    return true;
  },
  { message: 'When groups is provided, structure must be "grouped" or omitted' }
).refine(
  // If tree is provided, structure should be 'tree' or omitted
  (data) => {
    if (data.tree && data.tree.length > 0) {
      return data.structure === undefined || data.structure === 'tree';
    }
    return true;
  },
  { message: 'When tree is provided, structure must be "tree" or omitted' }
);

// Type for validated + defaults applied
export interface SidebarNavigationItem {
  icon: string;
  label: string;
  active: boolean;
  badge?: number | string;
}

export interface SidebarNavigationGroup {
  label: string;
  items: SidebarNavigationItem[];
}

// Normalized tree item (with defaults applied)
export interface SidebarNavigationTreeItem {
  icon: string;
  label: string;
  expanded: boolean;
  active: boolean;
  children: SidebarNavigationTreeItem[];
}

export interface SidebarNavigation {
  // Visibility and structure modes
  visibility: 'permanent' | 'collapsible' | 'drawer';
  structure: 'flat' | 'grouped' | 'tree';

  // Flat structure items (when structure is 'flat')
  items: SidebarNavigationItem[];

  // Grouped structure (when structure is 'grouped')
  groups: SidebarNavigationGroup[];

  // Tree structure (when structure is 'tree')
  tree: SidebarNavigationTreeItem[];

  container: Required<z.infer<typeof ContainerSchema>>;
  itemStyle: Required<z.infer<typeof ItemStyleSchema>>;
  iconStyle: Required<z.infer<typeof IconStyleSchema>>;
}

// Input type (what LLM provides)
export type SidebarNavigationInput = z.infer<typeof SidebarNavigationInputSchema>;

/**
 * Normalize a nav item with defaults
 */
function normalizeItem(item: NavItem): SidebarNavigationItem {
  return {
    icon: item.icon,
    label: item.label,
    active: item.active ?? false,
    badge: item.badge
  };
}

/**
 * Normalize a tree item recursively
 */
function normalizeTreeItem(item: TreeItemInput): SidebarNavigationTreeItem {
  return {
    icon: item.icon,
    label: item.label,
    expanded: item.expanded ?? false,
    active: item.active ?? false,
    children: (item.children ?? []).map(normalizeTreeItem)
  };
}

/**
 * Parse input and apply defaults
 */
export function parseSidebarNavigation(input: unknown): SidebarNavigation {
  const parsed = SidebarNavigationInputSchema.parse(input);

  // Determine structure from input
  const hasGroups = parsed.groups && parsed.groups.length > 0;
  const hasTree = parsed.tree && parsed.tree.length > 0;
  const structure: 'flat' | 'grouped' | 'tree' = hasTree ? 'tree' : hasGroups ? 'grouped' : 'flat';

  // Normalize items based on structure
  let items: SidebarNavigationItem[] = [];
  let groups: SidebarNavigationGroup[] = [];
  let tree: SidebarNavigationTreeItem[] = [];

  if (hasTree) {
    // Tree structure
    tree = parsed.tree!.map(normalizeTreeItem);
    items = [];
    groups = [];
  } else if (hasGroups) {
    // Grouped structure
    groups = parsed.groups!.map(group => ({
      label: group.label,
      items: group.items.map(normalizeItem)
    }));
    // Flatten groups into items for convenience
    items = groups.flatMap(g => g.items);
    tree = [];
  } else {
    // Flat structure
    items = (parsed.items ?? []).map(normalizeItem);
    groups = [];
    tree = [];
  }

  return {
    visibility: parsed.visibility ?? VISIBILITY_DEFAULT,
    structure,
    items,
    groups,
    tree,
    container: {
      ...CONTAINER_DEFAULTS,
      ...parsed.container
    },
    itemStyle: {
      ...ITEM_STYLE_DEFAULTS,
      ...parsed.itemStyle
    },
    iconStyle: {
      ...ICON_STYLE_DEFAULTS,
      ...parsed.iconStyle
    }
  };
}

/**
 * Validate input without parsing
 */
export function validateSidebarNavigationInput(input: unknown): {
  success: boolean;
  error?: string;
} {
  const result = SidebarNavigationInputSchema.safeParse(input);

  if (result.success) {
    return { success: true };
  } else {
    return {
      success: false,
      error: result.error.issues.map(i => i.message).join(', ')
    };
  }
}
