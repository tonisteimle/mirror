/**
 * Core Components
 *
 * Built-in component templates that are always available in the language.
 * These are pre-registered in the parser context before user code is parsed.
 *
 * Architecture:
 * - Primitives (HTML): Box, Text, Icon, Input, etc. → Special rendering
 * - Core Components: Nav, NavItem, Field, etc. → Composed templates
 * - User Components: myNav, myField, etc. → User's customizations
 *
 * Core Components are invisible to the user (like types in a programming language).
 * They provide stable, tested structures that users can instantiate with `as`
 * or extend with `from`.
 */

import type { ComponentTemplate, ASTNode, StateDefinition } from './types'

// =============================================================================
// TOKEN DEFINITIONS
// =============================================================================

/**
 * Default tokens for core components.
 * Users can override these to theme the components.
 */
export const CORE_TOKENS: Record<string, string | number> = {
  // Navigation
  '$nav.bg': '#18181B',
  '$nav.hover': '#27272A',
  '$nav.active': '#3F3F46',
  '$nav.text': '#D4D4D8',
  '$nav.muted': '#71717A',
  '$nav.badge': '#3F3F46',

  // Forms
  '$form.bg': '#18181B',
  '$form.input': '#27272A',
  '$form.border': '#3F3F46',
  '$form.focus': '#3B82F6',
  '$form.error': '#EF4444',
  '$form.success': '#22C55E',
  '$form.text': '#D4D4D8',
  '$form.muted': '#71717A',
  '$form.label': '#A1A1AA',
  '$form.placeholder': '#52525B',

  // Buttons
  '$primary.bg': '#3B82F6',
  '$primary.hover': '#2563EB',
  '$primary.text': '#FFFFFF',
  '$secondary.bg': '#27272A',
  '$secondary.hover': '#3F3F46',
  '$danger.bg': '#EF4444',
  '$danger.hover': '#DC2626',
}

// =============================================================================
// HELPER: CREATE AST NODE
// =============================================================================

function createNode(
  name: string,
  properties: Record<string, unknown> = {},
  children: ASTNode[] = [],
  extras: Partial<Omit<ASTNode, 'type'>> = {}
): ASTNode {
  return {
    type: 'component',
    id: '',
    name,
    properties,
    children,
    content: extras.content,
    states: extras.states,
    eventHandlers: extras.eventHandlers,
    ...extras,
  }
}

/**
 * Create a state definition with proper structure
 */
function createState(
  name: string,
  properties: Record<string, unknown> = {},
  children: ASTNode[] = [],
  category?: string
): StateDefinition {
  return {
    name,
    category,
    properties,
    children,
  }
}

function createTemplate(
  node: ASTNode,
  extras: Partial<ComponentTemplate> = {}
): ComponentTemplate {
  return {
    properties: node.properties,
    children: node.children,
    content: node.content,
    states: node.states,
    eventHandlers: node.eventHandlers,
    showAnimation: node.showAnimation,
    hideAnimation: node.hideAnimation,
    continuousAnimation: node.continuousAnimation,
    ...extras,
  }
}

// =============================================================================
// NAVIGATION COMPONENTS
// =============================================================================

/**
 * NavItem - Basic navigation item with Icon and Label
 *
 * Usage:
 *   NavItem Icon "home"; Label "Dashboard"
 *   NavItem active, Icon "settings"; Label "Settings"
 *
 * Slots:
 *   - Icon: Navigation icon
 *   - Label: Navigation label text
 *
 * States:
 *   - hover: Background change
 *   - active: Highlighted as current
 */
function createNavItem(): ComponentTemplate {
  const node = createNode('NavItem', {
    _layout: 'horizontal',
    _align: 'ver-center',
    gap: 12,
    'padding-vertical': 8,
    'padding-horizontal': 16,
    radius: 4,
    cursor: 'pointer',
  }, [
    createNode('Icon', {
      content: '',
      color: '$nav.muted',
      'icon-size': 20,
      'min-width': 20,
    }),
    createNode('Label', {
      content: '',
      color: '$nav.text',
      truncate: true,
    }),
  ], {
    states: [
      createState('hover', { background: '$nav.hover' }),
      createState('active', { background: '$nav.active' }),
    ],
  })

  return createTemplate(node)
}

/**
 * NavItemBadge - Navigation item with badge counter
 *
 * Usage:
 *   NavItemBadge Icon "inbox"; Label "Messages"; Badge "12"
 */
function createNavItemBadge(): ComponentTemplate {
  const node = createNode('NavItemBadge', {
    _layout: 'horizontal',
    _align: 'ver-center',
    gap: 12,
    'padding-vertical': 8,
    'padding-horizontal': 16,
    radius: 4,
    cursor: 'pointer',
  }, [
    createNode('Icon', {
      content: '',
      color: '$nav.muted',
      'icon-size': 20,
      'min-width': 20,
    }),
    createNode('Label', {
      content: '',
      color: '$nav.text',
      width: 'full',
      truncate: true,
    }),
    createNode('Badge', {
      content: '',
      _layout: 'horizontal',
      _align: 'center',
      'min-width': 20,
      height: 18,
      radius: 999,
      background: '$nav.badge',
      color: '$nav.text',
      'font-size': 11,
    }),
  ], {
    states: [
      createState('hover', { background: '$nav.hover' }),
      createState('active', { background: '$nav.active' }),
    ],
  })

  return createTemplate(node)
}

/**
 * NavSection - Group header for navigation sections
 *
 * Usage:
 *   NavSection Label "Admin"
 */
function createNavSection(): ComponentTemplate {
  const node = createNode('NavSection', {}, [
    createNode('Label', {
      content: '',
      color: '$nav.muted',
      'font-size': 11,
      uppercase: true,
      'padding-vertical': 8,
      'padding-horizontal': 16,
    }),
  ])

  return createTemplate(node)
}

/**
 * ToggleNav - Collapse/expand toggle button for navigation
 *
 * Usage:
 *   ToggleNav expanded
 *   ToggleNav collapsed
 */
function createToggleNav(): ComponentTemplate {
  const node = createNode('ToggleNav', {
    _layout: 'horizontal',
    _align: 'right',
    width: 'full',
    'padding-vertical': 8,
    'padding-horizontal': 16,
    cursor: 'pointer',
  }, [
    createNode('Arrow', {
      _primitiveType: 'Icon',
      content: 'chevron-left',
      color: '$nav.muted',
      'icon-size': 18,
    }),
  ], {
    states: [
      // State children are ASTNodes that override matching children
      createState('expanded', {}, [
        createNode('Arrow', { content: 'chevron-left' }),
      ]),
      createState('collapsed', {}, [
        createNode('Arrow', { content: 'chevron-right' }),
      ]),
    ],
    eventHandlers: [
      {
        event: 'onclick',
        actions: [{ type: 'toggle-state', target: 'self' }],
      },
    ],
  })

  return createTemplate(node)
}

/**
 * Nav - Navigation container
 *
 * Usage:
 *   Nav
 *     NavItem Icon "home"; Label "Home"
 *     NavItem Icon "settings"; Label "Settings"
 */
function createNav(): ComponentTemplate {
  const node = createNode('Nav', {
    width: 240,
    _layout: 'vertical',
    gap: 4,
    padding: 8,
    background: '$nav.bg',
  }, [], {
    states: [
      createState('expanded', { width: 240 }),
      createState('collapsed', { width: 64 }),
    ],
  })

  return createTemplate(node)
}

/**
 * TreeItem - Expandable tree navigation item
 */
function createTreeItem(): ComponentTemplate {
  const node = createNode('TreeItem', {
    _layout: 'vertical',
  }, [
    createNode('TreeHeader', {
      _layout: 'horizontal',
      _align: 'ver-center',
      gap: 8,
      'padding-vertical': 8,
      'padding-horizontal': 16,
      radius: 4,
      cursor: 'pointer',
    }, [
      createNode('Chevron', {
        _primitiveType: 'Icon',
        content: 'chevron-right',
        'icon-size': 14,
        color: '$nav.muted',
      }),
      createNode('Icon', {
        content: '',
        color: '$nav.muted',
        'icon-size': 20,
      }),
      createNode('Label', {
        content: '',
        color: '$nav.text',
      }),
    ]),
    createNode('TreeChildren', {
      _layout: 'vertical',
      'padding-left': 16,
      hidden: true,
    }),
  ], {
    states: [
      createState('expanded', {}, [
        createNode('Chevron', { rotate: 90 }),
        createNode('TreeChildren', { hidden: false, visible: true }),
      ]),
      createState('active', {}, [
        createNode('TreeHeader', { background: '$nav.active' }),
      ]),
    ],
    eventHandlers: [
      {
        event: 'onclick',
        actions: [{ type: 'toggle-state', target: 'self' }],
      },
    ],
  })

  return createTemplate(node)
}

/**
 * TreeLeaf - Non-expandable tree navigation item
 */
function createTreeLeaf(): ComponentTemplate {
  const node = createNode('TreeLeaf', {
    _layout: 'horizontal',
    _align: 'ver-center',
    gap: 8,
    'padding-vertical': 8,
    'padding-horizontal': 16,
    'padding-left': 30,
    radius: 4,
    cursor: 'pointer',
  }, [
    createNode('Icon', {
      content: '',
      color: '$nav.muted',
      'icon-size': 20,
    }),
    createNode('Label', {
      content: '',
      color: '$nav.text',
    }),
  ], {
    states: [
      createState('hover', { background: '$nav.hover' }),
      createState('active', { background: '$nav.active' }),
    ],
  })

  return createTemplate(node)
}

/**
 * DrawerBackdrop - Overlay backdrop for drawer navigation
 */
function createDrawerBackdrop(): ComponentTemplate {
  const node = createNode('DrawerBackdrop', {
    position: 'fixed',
    inset: 0,
    background: '#00000080',
    z: 100,
    hidden: true,
  }, [], {
    showAnimation: { type: 'show', animations: ['fade'], duration: 150 },
    hideAnimation: { type: 'hide', animations: ['fade'], duration: 100 },
    eventHandlers: [
      {
        event: 'onclick',
        actions: [
          { type: 'hide', target: 'DrawerNav' },
          { type: 'hide', target: 'self' },
        ],
      },
    ],
  })

  return createTemplate(node)
}

/**
 * DrawerNav - Mobile drawer navigation container
 */
function createDrawerNav(): ComponentTemplate {
  const node = createNode('DrawerNav', {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    width: 240,
    background: '$nav.bg',
    shadow: 'lg',
    z: 101,
    hidden: true,
  }, [], {
    showAnimation: { type: 'show', animations: ['slide-right'], duration: 200 },
    hideAnimation: { type: 'hide', animations: ['slide-left'], duration: 150 },
  })

  return createTemplate(node)
}

/**
 * MenuButton - Hamburger menu button to open drawer
 */
function createMenuButton(): ComponentTemplate {
  const node = createNode('MenuButton', {}, [
    createNode('Icon', {
      _primitiveType: 'Icon',
      content: 'menu',
      padding: 8,
      color: '$nav.text',
      cursor: 'pointer',
    }),
  ], {
    eventHandlers: [
      {
        event: 'onclick',
        actions: [
          { type: 'show', target: 'DrawerNav' },
          { type: 'show', target: 'DrawerBackdrop' },
        ],
      },
    ],
  })

  return createTemplate(node)
}

// =============================================================================
// FORM COMPONENTS
// =============================================================================

/**
 * Field - Form field container with Label, Input, Helper, and Error slots
 *
 * Usage:
 *   Field Label "E-Mail"; Input placeholder "name@example.com"
 *   Field Label "Passwort"; Input type password; Helper "Min. 8 Zeichen"
 *   Field invalid, Label "Name"; Error "Pflichtfeld"
 *
 * Slots:
 *   - Label: Field label text
 *   - Input: Input element (default TextInput)
 *   - Helper: Help text (hidden by default, visible when content provided)
 *   - Error: Error message (visible in invalid state)
 *
 * States:
 *   - focused: Input border changes to focus color
 *   - invalid: Input border changes to error color, Error visible
 *   - disabled: Reduced opacity, non-interactive
 */
function createField(): ComponentTemplate {
  const node = createNode('Field', {
    _layout: 'vertical',
    gap: 4,
  }, [
    createNode('Label', {
      content: '',
      color: '$form.label',
      'font-size': 13,
    }),
    createNode('Input', {
      _primitiveType: 'Input',
      height: 36,
      'padding-horizontal': 12,
      background: '$form.input',
      'border-width': 1,
      'border-color': '$form.border',
      radius: 4,
      color: '$form.text',
      width: 'full',
    }),
    createNode('Helper', {
      content: '',
      color: '$form.muted',
      'font-size': 12,
      hidden: true,
    }),
    createNode('Error', {
      content: '',
      color: '$form.error',
      'font-size': 12,
      hidden: true,
    }),
  ], {
    states: [
      createState('focused', {}, [
        createNode('Input', { 'border-color': '$form.focus' }),
      ]),
      createState('invalid', {}, [
        createNode('Input', { 'border-color': '$form.error' }),
        createNode('Error', { hidden: false, visible: true }),
      ]),
      createState('disabled', {
        opacity: 0.5,
        'pointer-events': 'none',
      }),
    ],
  })

  return createTemplate(node)
}

/**
 * TextInput - Basic text input field
 *
 * Usage:
 *   TextInput placeholder "Enter text..."
 *   TextInput "Default value"
 *
 * States:
 *   - hover: Border color changes
 *   - focused: Border color changes to focus
 */
function createTextInput(): ComponentTemplate {
  const node = createNode('TextInput', {
    _primitiveType: 'Input',
    height: 36,
    'padding-horizontal': 12,
    background: '$form.input',
    'border-width': 1,
    'border-color': '$form.border',
    radius: 4,
    color: '$form.text',
  }, [], {
    states: [
      createState('hover', { 'border-color': '$form.muted' }),
      createState('focus', { 'border-color': '$form.focus' }),
    ],
  })

  return createTemplate(node)
}

/**
 * IconInput - Text input with leading icon
 *
 * Usage:
 *   IconInput Icon "search"; Input placeholder "Search..."
 *   IconInput Icon "mail"; Input placeholder "Email"
 *
 * Slots:
 *   - Icon: Leading icon
 *   - Input: Text input field
 */
function createIconInput(): ComponentTemplate {
  const node = createNode('IconInput', {
    _layout: 'horizontal',
    _align: 'ver-center',
    height: 36,
    'padding-horizontal': 12,
    gap: 8,
    background: '$form.input',
    'border-width': 1,
    'border-color': '$form.border',
    radius: 4,
  }, [
    createNode('Icon', {
      content: '',
      color: '$form.muted',
      'icon-size': 18,
    }),
    createNode('Input', {
      _primitiveType: 'Input',
      background: 'transparent',
      border: 'none',
      color: '$form.text',
      width: 'full',
    }),
  ], {
    states: [
      createState('hover', { 'border-color': '$form.muted' }),
      createState('focus', { 'border-color': '$form.focus' }),
    ],
  })

  return createTemplate(node)
}

/**
 * PasswordInput - Password input with visibility toggle
 *
 * Usage:
 *   PasswordInput placeholder "Enter password..."
 *
 * Slots:
 *   - Input: Password input field
 *   - Toggle: Visibility toggle icon
 *
 * States:
 *   - visible: Shows password (eye icon)
 *   - hidden: Hides password (eye-off icon) - default
 */
function createPasswordInput(): ComponentTemplate {
  const node = createNode('PasswordInput', {
    _layout: 'horizontal',
    _align: 'ver-center',
    height: 36,
    'padding-horizontal': 12,
    gap: 8,
    background: '$form.input',
    'border-width': 1,
    'border-color': '$form.border',
    radius: 4,
  }, [
    createNode('Input', {
      _primitiveType: 'Input',
      inputType: 'password',
      background: 'transparent',
      border: 'none',
      color: '$form.text',
      width: 'full',
    }),
    createNode('Toggle', {
      _primitiveType: 'Icon',
      content: 'eye-off',
      color: '$form.muted',
      'icon-size': 18,
      cursor: 'pointer',
    }),
  ], {
    states: [
      createState('visible', {}, [
        createNode('Input', { inputType: 'text' }),
        createNode('Toggle', { content: 'eye' }),
      ]),
      createState('hidden', {}, [
        createNode('Input', { inputType: 'password' }),
        createNode('Toggle', { content: 'eye-off' }),
      ]),
      createState('hover', { 'border-color': '$form.muted' }),
      createState('focus', { 'border-color': '$form.focus' }),
    ],
    eventHandlers: [
      {
        event: 'onclick',
        actions: [{ type: 'toggle-state', target: 'self' }],
      },
    ],
  })

  return createTemplate(node)
}

/**
 * TextareaInput - Multi-line text input
 *
 * Usage:
 *   TextareaInput placeholder "Enter description..."
 *   TextareaInput rows 5, placeholder "Message"
 */
function createTextareaInput(): ComponentTemplate {
  const node = createNode('TextareaInput', {
    _primitiveType: 'Textarea',
    'min-height': 80,
    padding: 12,
    background: '$form.input',
    'border-width': 1,
    'border-color': '$form.border',
    radius: 4,
    color: '$form.text',
  }, [], {
    states: [
      createState('hover', { 'border-color': '$form.muted' }),
      createState('focus', { 'border-color': '$form.focus' }),
    ],
  })

  return createTemplate(node)
}

/**
 * SelectInput - Dropdown select field
 *
 * Usage:
 *   SelectInput Value "Select option..."
 *
 * Slots:
 *   - Value: Currently selected value display
 *   - Chevron: Dropdown indicator
 *
 * States:
 *   - expanded: Dropdown is open, chevron rotates
 */
function createSelectInput(): ComponentTemplate {
  const node = createNode('SelectInput', {
    _layout: 'horizontal',
    _align: 'ver-center',
    _justify: 'space-between',
    height: 36,
    'padding-horizontal': 12,
    background: '$form.input',
    'border-width': 1,
    'border-color': '$form.border',
    radius: 4,
    cursor: 'pointer',
  }, [
    createNode('Value', {
      content: '',
      color: '$form.text',
    }),
    createNode('Chevron', {
      _primitiveType: 'Icon',
      content: 'chevron-down',
      color: '$form.muted',
      'icon-size': 18,
    }),
  ], {
    states: [
      createState('expanded', {}, [
        createNode('Chevron', { rotate: 180 }),
      ]),
      createState('hover', { 'border-color': '$form.muted' }),
    ],
    eventHandlers: [
      {
        event: 'onclick',
        actions: [{ type: 'toggle-state', target: 'self' }],
      },
    ],
  })

  return createTemplate(node)
}

// =============================================================================
// BUTTON COMPONENTS
// =============================================================================

/**
 * PrimaryButton - Main call-to-action button
 *
 * Usage:
 *   PrimaryButton "Save"
 *   PrimaryButton Icon "save"; "Save Changes"
 */
function createPrimaryButton(): ComponentTemplate {
  const node = createNode('PrimaryButton', {
    _layout: 'horizontal',
    _align: 'center',
    gap: 8,
    height: 36,
    'padding-horizontal': 16,
    radius: 4,
    background: '$primary.bg',
    color: '$primary.text',
    cursor: 'pointer',
  }, [], {
    states: [
      createState('hover', { background: '$primary.hover' }),
      createState('active', { transform: 'scale(0.98)' }),
      createState('disabled', {
        opacity: 0.5,
        cursor: 'not-allowed',
        'pointer-events': 'none',
      }),
    ],
  })

  return createTemplate(node)
}

/**
 * SecondaryButton - Secondary action button
 *
 * Usage:
 *   SecondaryButton "Cancel"
 */
function createSecondaryButton(): ComponentTemplate {
  const node = createNode('SecondaryButton', {
    _layout: 'horizontal',
    _align: 'center',
    gap: 8,
    height: 36,
    'padding-horizontal': 16,
    radius: 4,
    background: '$secondary.bg',
    color: '$form.text',
    cursor: 'pointer',
  }, [], {
    states: [
      createState('hover', { background: '$secondary.hover' }),
      createState('active', { transform: 'scale(0.98)' }),
      createState('disabled', {
        opacity: 0.5,
        cursor: 'not-allowed',
        'pointer-events': 'none',
      }),
    ],
  })

  return createTemplate(node)
}

/**
 * GhostButton - Transparent button with border
 *
 * Usage:
 *   GhostButton "Learn More"
 */
function createGhostButton(): ComponentTemplate {
  const node = createNode('GhostButton', {
    _layout: 'horizontal',
    _align: 'center',
    gap: 8,
    height: 36,
    'padding-horizontal': 16,
    radius: 4,
    background: 'transparent',
    'border-width': 1,
    'border-color': '$form.border',
    color: '$form.text',
    cursor: 'pointer',
  }, [], {
    states: [
      createState('hover', { background: '$form.input' }),
      createState('active', { transform: 'scale(0.98)' }),
      createState('disabled', {
        opacity: 0.5,
        cursor: 'not-allowed',
        'pointer-events': 'none',
      }),
    ],
  })

  return createTemplate(node)
}

/**
 * DangerButton - Destructive action button
 *
 * Usage:
 *   DangerButton "Delete"
 */
function createDangerButton(): ComponentTemplate {
  const node = createNode('DangerButton', {
    _layout: 'horizontal',
    _align: 'center',
    gap: 8,
    height: 36,
    'padding-horizontal': 16,
    radius: 4,
    background: '$danger.bg',
    color: '#FFFFFF',
    cursor: 'pointer',
  }, [], {
    states: [
      createState('hover', { background: '$danger.hover' }),
      createState('active', { transform: 'scale(0.98)' }),
      createState('disabled', {
        opacity: 0.5,
        cursor: 'not-allowed',
        'pointer-events': 'none',
      }),
    ],
  })

  return createTemplate(node)
}

// =============================================================================
// CHECKBOX / RADIO / SWITCH COMPONENTS
// =============================================================================

/**
 * CheckboxInput - Checkbox with checked/unchecked state
 *
 * Usage:
 *   CheckboxInput
 *   CheckboxInput checked
 */
function createCheckboxInput(): ComponentTemplate {
  const node = createNode('CheckboxInput', {
    _layout: 'horizontal',
    _align: 'center',
    width: 18,
    height: 18,
    radius: 4,
    background: '$form.input',
    'border-width': 1,
    'border-color': '$form.border',
    cursor: 'pointer',
  }, [
    createNode('Checkmark', {
      _primitiveType: 'Icon',
      content: 'check',
      color: 'white',
      'icon-size': 14,
      hidden: true,
    }),
  ], {
    states: [
      createState('checked', {
        background: '$primary.bg',
        'border-color': '$primary.bg',
      }, [
        createNode('Checkmark', { hidden: false, visible: true }),
      ]),
      createState('hover', { 'border-color': '$form.muted' }),
      createState('disabled', {
        opacity: 0.5,
        cursor: 'not-allowed',
      }),
    ],
    eventHandlers: [
      {
        event: 'onclick',
        actions: [{ type: 'toggle-state', target: 'self' }],
      },
    ],
  })

  return createTemplate(node)
}

/**
 * RadioInput - Radio button for single selection in groups
 *
 * Usage:
 *   RadioInput
 *   RadioInput checked
 */
function createRadioInput(): ComponentTemplate {
  const node = createNode('RadioInput', {
    _layout: 'horizontal',
    _align: 'center',
    width: 18,
    height: 18,
    radius: 9,
    background: '$form.input',
    'border-width': 1,
    'border-color': '$form.border',
    cursor: 'pointer',
  }, [
    createNode('Dot', {
      width: 8,
      height: 8,
      radius: 4,
      background: 'white',
      hidden: true,
    }),
  ], {
    states: [
      createState('checked', {
        background: '$primary.bg',
        'border-color': '$primary.bg',
      }, [
        createNode('Dot', { hidden: false, visible: true }),
      ]),
      createState('hover', { 'border-color': '$form.muted' }),
      createState('disabled', {
        opacity: 0.5,
        cursor: 'not-allowed',
      }),
    ],
    eventHandlers: [
      {
        event: 'onclick',
        actions: [
          { type: 'activate', target: 'self' },
          { type: 'deactivate-siblings' },
        ],
      },
    ],
  })

  return createTemplate(node)
}

/**
 * SwitchInput - Toggle switch for on/off settings
 *
 * Usage:
 *   SwitchInput
 *   SwitchInput on
 */
function createSwitchInput(): ComponentTemplate {
  const node = createNode('SwitchInput', {
    _layout: 'horizontal',
    _align: 'center',
    width: 40,
    height: 22,
    radius: 11,
    background: '$form.border',
    cursor: 'pointer',
    padding: 2,
  }, [
    createNode('Thumb', {
      width: 18,
      height: 18,
      radius: 9,
      background: 'white',
    }),
  ], {
    states: [
      createState('on', {
        background: '$primary.bg',
      }, [
        createNode('Thumb', { 'margin-left': 18 }),
      ]),
      createState('off', {
        background: '$form.border',
      }, [
        createNode('Thumb', { 'margin-left': 0 }),
      ]),
      createState('hover', { opacity: 0.9 }),
      createState('disabled', {
        opacity: 0.5,
        cursor: 'not-allowed',
      }),
    ],
    eventHandlers: [
      {
        event: 'onclick',
        actions: [{ type: 'toggle-state', target: 'self' }],
      },
    ],
  })

  return createTemplate(node)
}

// =============================================================================
// REGISTRY BUILDER
// =============================================================================

/**
 * Build the complete core component registry.
 * Call this once at parser initialization.
 */
export function buildCoreComponentRegistry(): Map<string, ComponentTemplate> {
  const registry = new Map<string, ComponentTemplate>()

  // Navigation
  registry.set('Nav', createNav())
  registry.set('NavItem', createNavItem())
  registry.set('NavItemBadge', createNavItemBadge())
  registry.set('NavSection', createNavSection())
  registry.set('ToggleNav', createToggleNav())
  registry.set('TreeItem', createTreeItem())
  registry.set('TreeLeaf', createTreeLeaf())
  registry.set('DrawerNav', createDrawerNav())
  registry.set('DrawerBackdrop', createDrawerBackdrop())
  registry.set('MenuButton', createMenuButton())

  // Forms
  registry.set('Field', createField())
  registry.set('TextInput', createTextInput())
  registry.set('IconInput', createIconInput())
  registry.set('PasswordInput', createPasswordInput())
  registry.set('TextareaInput', createTextareaInput())
  registry.set('SelectInput', createSelectInput())

  // Buttons
  registry.set('PrimaryButton', createPrimaryButton())
  registry.set('SecondaryButton', createSecondaryButton())
  registry.set('GhostButton', createGhostButton())
  registry.set('DangerButton', createDangerButton())

  // Checkbox / Radio / Switch
  registry.set('CheckboxInput', createCheckboxInput())
  registry.set('RadioInput', createRadioInput())
  registry.set('SwitchInput', createSwitchInput())

  return registry
}

/**
 * List of all core component names.
 * Used for validation and autocomplete.
 */
export const CORE_COMPONENT_NAMES = [
  // Navigation
  'Nav',
  'NavItem',
  'NavItemBadge',
  'NavSection',
  'ToggleNav',
  'TreeItem',
  'TreeLeaf',
  'DrawerNav',
  'DrawerBackdrop',
  'MenuButton',

  // Forms
  'Field',
  'TextInput',
  'IconInput',
  'PasswordInput',
  'TextareaInput',
  'SelectInput',

  // Buttons
  'PrimaryButton',
  'SecondaryButton',
  'GhostButton',
  'DangerButton',

  // Checkbox / Radio / Switch
  'CheckboxInput',
  'RadioInput',
  'SwitchInput',
] as const

export type CoreComponentName = typeof CORE_COMPONENT_NAMES[number]
