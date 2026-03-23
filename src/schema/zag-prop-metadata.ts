/**
 * Zag Property Metadata
 *
 * Defines metadata for Zag component behavior properties.
 * Used by PropertyExtractor and UIRenderer to display
 * editable behavior controls in the Property Panel.
 */

export type ZagPropType = 'boolean' | 'string' | 'number' | 'enum'

export interface ZagPropMeta {
  type: ZagPropType
  label: string
  description: string
  options?: string[] // for enum
  default?: string | number | boolean
  min?: number // for number
  max?: number // for number
  step?: number // for number
}

/**
 * Metadata registry for all Zag component behavior properties
 */
export const ZAG_PROP_METADATA: Record<string, Record<string, ZagPropMeta>> = {
  // ===========================================================================
  // SELECTION & DROPDOWNS
  // ===========================================================================
  Select: {
    multiple: {
      type: 'boolean',
      label: 'Multiple',
      description: 'Allow multiple selections',
    },
    searchable: {
      type: 'boolean',
      label: 'Searchable',
      description: 'Enable search filtering',
    },
    clearable: {
      type: 'boolean',
      label: 'Clearable',
      description: 'Show clear button',
    },
    closeOnSelect: {
      type: 'boolean',
      label: 'Close on Select',
      description: 'Close after selection',
      default: true,
    },
    placeholder: {
      type: 'string',
      label: 'Placeholder',
      description: 'Placeholder text',
    },
    invalid: {
      type: 'boolean',
      label: 'Invalid',
      description: 'Mark as invalid state',
    },
    readOnly: {
      type: 'boolean',
      label: 'Read Only',
      description: 'Prevent changes',
    },
    required: {
      type: 'boolean',
      label: 'Required',
      description: 'Mark as required field',
    },
    name: {
      type: 'string',
      label: 'Name',
      description: 'Form field name',
    },
    loopFocus: {
      type: 'boolean',
      label: 'Loop Focus',
      description: 'Loop keyboard navigation',
      default: true,
    },
    deselectable: {
      type: 'boolean',
      label: 'Deselectable',
      description: 'Allow clearing by clicking selected item',
    },
    positioning: {
      type: 'enum',
      label: 'Position',
      description: 'Dropdown placement',
      options: ['bottom', 'bottom-start', 'bottom-end', 'top', 'top-start', 'top-end'],
      default: 'bottom-start',
    },
    typeahead: {
      type: 'boolean',
      label: 'Typeahead',
      description: 'Focus item by typing letters',
      default: true,
    },
  },

  Combobox: {
    allowCustomValue: {
      type: 'boolean',
      label: 'Custom Value',
      description: 'Allow entering custom values',
    },
    autoFocus: {
      type: 'boolean',
      label: 'Auto Focus',
      description: 'Focus input on mount',
    },
    openOnChange: {
      type: 'boolean',
      label: 'Open on Change',
      description: 'Open on input change',
      default: true,
    },
    placeholder: {
      type: 'string',
      label: 'Placeholder',
      description: 'Placeholder text',
    },
    invalid: {
      type: 'boolean',
      label: 'Invalid',
      description: 'Mark as invalid state',
    },
    readOnly: {
      type: 'boolean',
      label: 'Read Only',
      description: 'Prevent changes',
    },
    required: {
      type: 'boolean',
      label: 'Required',
      description: 'Mark as required field',
    },
    name: {
      type: 'string',
      label: 'Name',
      description: 'Form field name',
    },
    loopFocus: {
      type: 'boolean',
      label: 'Loop Focus',
      description: 'Loop keyboard navigation',
      default: true,
    },
    positioning: {
      type: 'enum',
      label: 'Position',
      description: 'Dropdown placement',
      options: ['bottom', 'bottom-start', 'bottom-end', 'top', 'top-start', 'top-end'],
      default: 'bottom-start',
    },
  },

  Listbox: {
    multiple: {
      type: 'boolean',
      label: 'Multiple',
      description: 'Allow multiple selections',
    },
    orientation: {
      type: 'enum',
      label: 'Direction',
      description: 'List orientation',
      options: ['vertical', 'horizontal'],
      default: 'vertical',
    },
    invalid: {
      type: 'boolean',
      label: 'Invalid',
      description: 'Mark as invalid state',
    },
    readOnly: {
      type: 'boolean',
      label: 'Read Only',
      description: 'Prevent changes',
    },
    required: {
      type: 'boolean',
      label: 'Required',
      description: 'Mark as required field',
    },
    name: {
      type: 'string',
      label: 'Name',
      description: 'Form field name',
    },
    loopFocus: {
      type: 'boolean',
      label: 'Loop Focus',
      description: 'Loop keyboard navigation',
      default: true,
    },
  },

  // ===========================================================================
  // MENUS
  // ===========================================================================
  Menu: {
    closeOnSelect: {
      type: 'boolean',
      label: 'Close on Select',
      description: 'Close after item selection',
      default: true,
    },
    loopFocus: {
      type: 'boolean',
      label: 'Loop Focus',
      description: 'Loop keyboard navigation',
      default: true,
    },
    positioning: {
      type: 'enum',
      label: 'Position',
      description: 'Menu placement',
      options: ['bottom', 'bottom-start', 'bottom-end', 'top', 'top-start', 'top-end', 'left', 'right'],
      default: 'bottom-start',
    },
    typeahead: {
      type: 'boolean',
      label: 'Typeahead',
      description: 'Focus item by typing letters',
      default: true,
    },
  },

  ContextMenu: {
    closeOnSelect: {
      type: 'boolean',
      label: 'Close on Select',
      description: 'Close after item selection',
      default: true,
    },
    loopFocus: {
      type: 'boolean',
      label: 'Loop Focus',
      description: 'Loop keyboard navigation',
      default: true,
    },
    positioning: {
      type: 'enum',
      label: 'Position',
      description: 'Menu placement',
      options: ['bottom', 'bottom-start', 'bottom-end', 'top', 'top-start', 'top-end', 'left', 'right'],
      default: 'bottom-start',
    },
    typeahead: {
      type: 'boolean',
      label: 'Typeahead',
      description: 'Focus item by typing letters',
      default: true,
    },
  },

  NestedMenu: {
    closeOnSelect: {
      type: 'boolean',
      label: 'Close on Select',
      description: 'Close after item selection',
      default: true,
    },
    loopFocus: {
      type: 'boolean',
      label: 'Loop Focus',
      description: 'Loop keyboard navigation',
      default: true,
    },
    positioning: {
      type: 'enum',
      label: 'Position',
      description: 'Menu placement',
      options: ['bottom', 'bottom-start', 'bottom-end', 'top', 'top-start', 'top-end', 'left', 'right'],
      default: 'bottom-start',
    },
    typeahead: {
      type: 'boolean',
      label: 'Typeahead',
      description: 'Focus item by typing letters',
      default: true,
    },
  },

  NavigationMenu: {
    orientation: {
      type: 'enum',
      label: 'Direction',
      description: 'Menu orientation',
      options: ['horizontal', 'vertical'],
      default: 'horizontal',
    },
  },

  // ===========================================================================
  // FORM CONTROLS
  // ===========================================================================
  Checkbox: {
    indeterminate: {
      type: 'boolean',
      label: 'Indeterminate',
      description: 'Show indeterminate state',
    },
    invalid: {
      type: 'boolean',
      label: 'Invalid',
      description: 'Mark as invalid state',
    },
    readOnly: {
      type: 'boolean',
      label: 'Read Only',
      description: 'Prevent changes',
    },
  },

  Switch: {
    checked: {
      type: 'boolean',
      label: 'Checked',
      description: 'Initial checked state',
    },
    invalid: {
      type: 'boolean',
      label: 'Invalid',
      description: 'Mark as invalid state',
    },
    readOnly: {
      type: 'boolean',
      label: 'Read Only',
      description: 'Prevent changes',
    },
  },

  RadioGroup: {
    orientation: {
      type: 'enum',
      label: 'Direction',
      description: 'Radio group orientation',
      options: ['vertical', 'horizontal'],
      default: 'vertical',
    },
    invalid: {
      type: 'boolean',
      label: 'Invalid',
      description: 'Mark as invalid state',
    },
    readOnly: {
      type: 'boolean',
      label: 'Read Only',
      description: 'Prevent changes',
    },
    required: {
      type: 'boolean',
      label: 'Required',
      description: 'Mark as required field',
    },
  },

  SegmentedControl: {
    orientation: {
      type: 'enum',
      label: 'Direction',
      description: 'Control orientation',
      options: ['horizontal', 'vertical'],
      default: 'horizontal',
    },
  },

  Slider: {
    min: {
      type: 'number',
      label: 'Min',
      description: 'Minimum value',
      default: 0,
    },
    max: {
      type: 'number',
      label: 'Max',
      description: 'Maximum value',
      default: 100,
    },
    step: {
      type: 'number',
      label: 'Step',
      description: 'Step increment',
      default: 1,
      min: 0.1,
    },
    orientation: {
      type: 'enum',
      label: 'Direction',
      description: 'Slider orientation',
      options: ['horizontal', 'vertical'],
      default: 'horizontal',
    },
    invalid: {
      type: 'boolean',
      label: 'Invalid',
      description: 'Mark as invalid state',
    },
    readOnly: {
      type: 'boolean',
      label: 'Read Only',
      description: 'Prevent changes',
    },
    name: {
      type: 'string',
      label: 'Name',
      description: 'Form field name',
    },
    origin: {
      type: 'enum',
      label: 'Origin',
      description: 'Track fill origin point',
      options: ['start', 'center'],
      default: 'start',
    },
  },

  RangeSlider: {
    min: {
      type: 'number',
      label: 'Min',
      description: 'Minimum value',
      default: 0,
    },
    max: {
      type: 'number',
      label: 'Max',
      description: 'Maximum value',
      default: 100,
    },
    step: {
      type: 'number',
      label: 'Step',
      description: 'Step increment',
      default: 1,
      min: 0.1,
    },
    minStepsBetweenThumbs: {
      type: 'number',
      label: 'Min Steps Between',
      description: 'Minimum steps between thumbs',
      default: 0,
      min: 0,
    },
    invalid: {
      type: 'boolean',
      label: 'Invalid',
      description: 'Mark as invalid state',
    },
    readOnly: {
      type: 'boolean',
      label: 'Read Only',
      description: 'Prevent changes',
    },
    name: {
      type: 'string',
      label: 'Name',
      description: 'Form field name',
    },
    origin: {
      type: 'enum',
      label: 'Origin',
      description: 'Track fill origin point',
      options: ['start', 'center'],
      default: 'start',
    },
  },

  AngleSlider: {
    step: {
      type: 'number',
      label: 'Step',
      description: 'Step increment in degrees',
      default: 1,
      min: 1,
      max: 45,
    },
  },

  NumberInput: {
    min: {
      type: 'number',
      label: 'Min',
      description: 'Minimum value',
    },
    max: {
      type: 'number',
      label: 'Max',
      description: 'Maximum value',
    },
    step: {
      type: 'number',
      label: 'Step',
      description: 'Step increment',
      default: 1,
    },
    allowMouseWheel: {
      type: 'boolean',
      label: 'Mouse Wheel',
      description: 'Allow mouse wheel changes',
      default: true,
    },
    clampValueOnBlur: {
      type: 'boolean',
      label: 'Clamp on Blur',
      description: 'Clamp value on blur',
      default: true,
    },
    invalid: {
      type: 'boolean',
      label: 'Invalid',
      description: 'Mark as invalid state',
    },
    readOnly: {
      type: 'boolean',
      label: 'Read Only',
      description: 'Prevent changes',
    },
    required: {
      type: 'boolean',
      label: 'Required',
      description: 'Mark as required field',
    },
    name: {
      type: 'string',
      label: 'Name',
      description: 'Form field name',
    },
  },

  PinInput: {
    length: {
      type: 'number',
      label: 'Length',
      description: 'Number of input fields',
      default: 4,
      min: 1,
      max: 10,
    },
    mask: {
      type: 'boolean',
      label: 'Mask',
      description: 'Mask input values',
    },
    otp: {
      type: 'boolean',
      label: 'OTP Mode',
      description: 'Enable OTP autocomplete',
    },
    placeholder: {
      type: 'string',
      label: 'Placeholder',
      description: 'Placeholder character',
      default: '○',
    },
    invalid: {
      type: 'boolean',
      label: 'Invalid',
      description: 'Mark as invalid state',
    },
    readOnly: {
      type: 'boolean',
      label: 'Read Only',
      description: 'Prevent changes',
    },
    required: {
      type: 'boolean',
      label: 'Required',
      description: 'Mark as required field',
    },
    name: {
      type: 'string',
      label: 'Name',
      description: 'Form field name',
    },
  },

  TagsInput: {
    addOnPaste: {
      type: 'boolean',
      label: 'Add on Paste',
      description: 'Add tags from pasted text',
      default: true,
    },
    addOnBlur: {
      type: 'boolean',
      label: 'Add on Blur',
      description: 'Add tag on input blur',
    },
    allowDuplicate: {
      type: 'boolean',
      label: 'Allow Duplicates',
      description: 'Allow duplicate tags',
    },
    maxTags: {
      type: 'number',
      label: 'Max Tags',
      description: 'Maximum number of tags',
      min: 1,
    },
    invalid: {
      type: 'boolean',
      label: 'Invalid',
      description: 'Mark as invalid state',
    },
    readOnly: {
      type: 'boolean',
      label: 'Read Only',
      description: 'Prevent changes',
    },
    required: {
      type: 'boolean',
      label: 'Required',
      description: 'Mark as required field',
    },
    name: {
      type: 'string',
      label: 'Name',
      description: 'Form field name',
    },
  },

  PasswordInput: {
    visible: {
      type: 'boolean',
      label: 'Visible',
      description: 'Show password by default',
    },
  },

  Editable: {
    selectOnFocus: {
      type: 'boolean',
      label: 'Select on Focus',
      description: 'Select all text on focus',
      default: true,
    },
    submitMode: {
      type: 'enum',
      label: 'Submit Mode',
      description: 'How to submit edits',
      options: ['blur', 'enter', 'both', 'none'],
      default: 'both',
    },
    placeholder: {
      type: 'string',
      label: 'Placeholder',
      description: 'Placeholder text',
    },
    invalid: {
      type: 'boolean',
      label: 'Invalid',
      description: 'Mark as invalid state',
    },
    required: {
      type: 'boolean',
      label: 'Required',
      description: 'Mark as required field',
    },
    name: {
      type: 'string',
      label: 'Name',
      description: 'Form field name',
    },
  },

  RatingGroup: {
    count: {
      type: 'number',
      label: 'Count',
      description: 'Number of rating items',
      default: 5,
      min: 1,
      max: 10,
    },
    allowHalf: {
      type: 'boolean',
      label: 'Allow Half',
      description: 'Allow half-star ratings',
    },
    readOnly: {
      type: 'boolean',
      label: 'Read Only',
      description: 'Prevent interaction',
    },
    invalid: {
      type: 'boolean',
      label: 'Invalid',
      description: 'Mark as invalid state',
    },
    required: {
      type: 'boolean',
      label: 'Required',
      description: 'Mark as required field',
    },
    name: {
      type: 'string',
      label: 'Name',
      description: 'Form field name',
    },
  },

  ToggleGroup: {
    multiple: {
      type: 'boolean',
      label: 'Multiple',
      description: 'Allow multiple selections',
    },
    loopFocus: {
      type: 'boolean',
      label: 'Loop Focus',
      description: 'Loop keyboard navigation',
      default: true,
    },
    orientation: {
      type: 'enum',
      label: 'Direction',
      description: 'Toggle group orientation',
      options: ['horizontal', 'vertical'],
      default: 'horizontal',
    },
  },

  // ===========================================================================
  // DATE & TIME
  // ===========================================================================
  DatePicker: {
    selectionMode: {
      type: 'enum',
      label: 'Mode',
      description: 'Selection mode',
      options: ['single', 'multiple', 'range'],
      default: 'single',
    },
    fixedWeeks: {
      type: 'boolean',
      label: 'Fixed Weeks',
      description: 'Always show 6 weeks',
    },
    closeOnSelect: {
      type: 'boolean',
      label: 'Close on Select',
      description: 'Close after selection',
      default: true,
    },
    startOfWeek: {
      type: 'number',
      label: 'Start of Week',
      description: 'First day of week (0=Sun)',
      default: 0,
      min: 0,
      max: 6,
    },
    positioning: {
      type: 'enum',
      label: 'Position',
      description: 'Calendar dropdown placement',
      options: ['bottom', 'bottom-start', 'bottom-end', 'top', 'top-start', 'top-end'],
      default: 'bottom-start',
    },
  },

  DateInput: {
    locale: {
      type: 'string',
      label: 'Locale',
      description: 'Date locale (e.g., en-US)',
      default: 'en-US',
    },
    readOnly: {
      type: 'boolean',
      label: 'Read Only',
      description: 'Prevent editing',
    },
  },

  Timer: {
    autoStart: {
      type: 'boolean',
      label: 'Auto Start',
      description: 'Start timer automatically',
    },
    countdown: {
      type: 'boolean',
      label: 'Countdown',
      description: 'Count down instead of up',
    },
    interval: {
      type: 'number',
      label: 'Interval',
      description: 'Tick interval in ms',
      default: 250,
      min: 10,
      max: 1000,
      step: 10,
    },
  },

  // ===========================================================================
  // OVERLAYS & MODALS
  // ===========================================================================
  Dialog: {
    modal: {
      type: 'boolean',
      label: 'Modal',
      description: 'Block background interaction',
      default: true,
    },
    closeOnEscape: {
      type: 'boolean',
      label: 'Esc to Close',
      description: 'Close on Escape key',
      default: true,
    },
    closeOnOutsideClick: {
      type: 'boolean',
      label: 'Click Outside',
      description: 'Close on outside click',
      default: true,
    },
    preventScroll: {
      type: 'boolean',
      label: 'Lock Scroll',
      description: 'Prevent body scroll',
      default: true,
    },
    trapFocus: {
      type: 'boolean',
      label: 'Trap Focus',
      description: 'Keep focus within dialog',
      default: true,
    },
    restoreFocus: {
      type: 'boolean',
      label: 'Restore Focus',
      description: 'Restore focus on close',
      default: true,
    },
  },

  Tooltip: {
    openDelay: {
      type: 'number',
      label: 'Open Delay',
      description: 'Delay before open (ms)',
      default: 0,
      min: 0,
      max: 2000,
      step: 100,
    },
    closeDelay: {
      type: 'number',
      label: 'Close Delay',
      description: 'Delay before close (ms)',
      default: 0,
      min: 0,
      max: 2000,
      step: 100,
    },
    placement: {
      type: 'enum',
      label: 'Position',
      description: 'Tooltip placement',
      options: ['top', 'bottom', 'left', 'right'],
      default: 'top',
    },
    positioning: {
      type: 'enum',
      label: 'Alignment',
      description: 'Detailed tooltip positioning',
      options: ['top', 'top-start', 'top-end', 'bottom', 'bottom-start', 'bottom-end', 'left', 'left-start', 'left-end', 'right', 'right-start', 'right-end'],
      default: 'top',
    },
    closeOnClick: {
      type: 'boolean',
      label: 'Close on Click',
      description: 'Close on click',
      default: true,
    },
    interactive: {
      type: 'boolean',
      label: 'Interactive',
      description: 'Keep open when hovering tooltip',
    },
    closeOnScroll: {
      type: 'boolean',
      label: 'Close on Scroll',
      description: 'Close when scrolling',
      default: true,
    },
  },

  Popover: {
    placement: {
      type: 'enum',
      label: 'Position',
      description: 'Popover placement',
      options: ['top', 'bottom', 'left', 'right'],
      default: 'bottom',
    },
    positioning: {
      type: 'enum',
      label: 'Alignment',
      description: 'Detailed popover positioning',
      options: ['top', 'top-start', 'top-end', 'bottom', 'bottom-start', 'bottom-end', 'left', 'left-start', 'left-end', 'right', 'right-start', 'right-end'],
      default: 'bottom',
    },
    modal: {
      type: 'boolean',
      label: 'Modal',
      description: 'Block background interaction',
    },
    closeOnEscape: {
      type: 'boolean',
      label: 'Esc to Close',
      description: 'Close on Escape key',
      default: true,
    },
    closeOnOutsideClick: {
      type: 'boolean',
      label: 'Click Outside',
      description: 'Close on outside click',
      default: true,
    },
    autoFocus: {
      type: 'boolean',
      label: 'Auto Focus',
      description: 'Focus first element',
      default: true,
    },
    trapFocus: {
      type: 'boolean',
      label: 'Trap Focus',
      description: 'Keep focus within popover',
    },
    restoreFocus: {
      type: 'boolean',
      label: 'Restore Focus',
      description: 'Restore focus on close',
      default: true,
    },
  },

  HoverCard: {
    openDelay: {
      type: 'number',
      label: 'Open Delay',
      description: 'Delay before open (ms)',
      default: 700,
      min: 0,
      max: 2000,
      step: 100,
    },
    closeDelay: {
      type: 'number',
      label: 'Close Delay',
      description: 'Delay before close (ms)',
      default: 300,
      min: 0,
      max: 2000,
      step: 100,
    },
    placement: {
      type: 'enum',
      label: 'Position',
      description: 'Card placement',
      options: ['top', 'bottom', 'left', 'right'],
      default: 'bottom',
    },
    positioning: {
      type: 'enum',
      label: 'Alignment',
      description: 'Detailed card positioning',
      options: ['top', 'top-start', 'top-end', 'bottom', 'bottom-start', 'bottom-end', 'left', 'left-start', 'left-end', 'right', 'right-start', 'right-end'],
      default: 'bottom',
    },
  },

  FloatingPanel: {
    resizable: {
      type: 'boolean',
      label: 'Resizable',
      description: 'Allow panel resizing',
      default: true,
    },
    draggable: {
      type: 'boolean',
      label: 'Draggable',
      description: 'Allow panel dragging',
      default: true,
    },
    lockAspectRatio: {
      type: 'boolean',
      label: 'Lock Aspect',
      description: 'Lock aspect ratio when resizing',
    },
  },

  Tour: {
    closeOnOutsideClick: {
      type: 'boolean',
      label: 'Click Outside',
      description: 'Close on outside click',
      default: true,
    },
    closeOnEscape: {
      type: 'boolean',
      label: 'Esc to Close',
      description: 'Close on Escape key',
      default: true,
    },
    preventInteraction: {
      type: 'boolean',
      label: 'Prevent Interaction',
      description: 'Block interaction with page',
      default: true,
    },
    spotlightOffset: {
      type: 'number',
      label: 'Spotlight Offset',
      description: 'Spotlight padding (px)',
      default: 10,
      min: 0,
      max: 50,
    },
    spotlightRadius: {
      type: 'number',
      label: 'Spotlight Radius',
      description: 'Spotlight border radius (px)',
      default: 4,
      min: 0,
      max: 20,
    },
  },

  Presence: {
    lazyMount: {
      type: 'boolean',
      label: 'Lazy Mount',
      description: 'Mount only when present',
      default: true,
    },
    unmountOnExit: {
      type: 'boolean',
      label: 'Unmount on Exit',
      description: 'Unmount when not present',
      default: true,
    },
  },

  // ===========================================================================
  // NAVIGATION
  // ===========================================================================
  Tabs: {
    orientation: {
      type: 'enum',
      label: 'Direction',
      description: 'Tab orientation',
      options: ['horizontal', 'vertical'],
      default: 'horizontal',
    },
    activationMode: {
      type: 'enum',
      label: 'Activation',
      description: 'When to activate tab',
      options: ['automatic', 'manual'],
      default: 'automatic',
    },
    loopFocus: {
      type: 'boolean',
      label: 'Loop Focus',
      description: 'Loop keyboard navigation',
      default: true,
    },
    deselectable: {
      type: 'boolean',
      label: 'Deselectable',
      description: 'Allow deselecting active tab',
    },
  },

  Accordion: {
    multiple: {
      type: 'boolean',
      label: 'Multiple',
      description: 'Allow multiple open',
    },
    collapsible: {
      type: 'boolean',
      label: 'Collapsible',
      description: 'Allow all closed',
      default: true,
    },
    orientation: {
      type: 'enum',
      label: 'Direction',
      description: 'Accordion orientation',
      options: ['vertical', 'horizontal'],
      default: 'vertical',
    },
  },

  Collapsible: {
    open: {
      type: 'boolean',
      label: 'Open',
      description: 'Initially open',
    },
  },

  Steps: {
    linear: {
      type: 'boolean',
      label: 'Linear',
      description: 'Require sequential completion',
      default: true,
    },
    orientation: {
      type: 'enum',
      label: 'Direction',
      description: 'Steps orientation',
      options: ['horizontal', 'vertical'],
      default: 'horizontal',
    },
  },

  Pagination: {
    pageSize: {
      type: 'number',
      label: 'Page Size',
      description: 'Items per page',
      default: 10,
      min: 1,
    },
    siblingCount: {
      type: 'number',
      label: 'Siblings',
      description: 'Pages shown around current',
      default: 1,
      min: 0,
      max: 3,
    },
  },

  TreeView: {
    multiple: {
      type: 'boolean',
      label: 'Multiple',
      description: 'Allow multiple selections',
    },
    selectionMode: {
      type: 'enum',
      label: 'Selection',
      description: 'Selection behavior',
      options: ['single', 'multiple'],
      default: 'single',
    },
  },

  // ===========================================================================
  // MEDIA & FILES
  // ===========================================================================
  Avatar: {
    name: {
      type: 'string',
      label: 'Name',
      description: 'Name for fallback initials',
    },
  },

  ImageCropper: {
    aspectRatio: {
      type: 'number',
      label: 'Aspect Ratio',
      description: 'Crop aspect ratio (e.g., 1.5)',
      default: 1,
      min: 0.1,
      max: 3,
      step: 0.1,
    },
    minZoom: {
      type: 'number',
      label: 'Min Zoom',
      description: 'Minimum zoom level',
      default: 1,
      min: 0.1,
      max: 1,
      step: 0.1,
    },
    maxZoom: {
      type: 'number',
      label: 'Max Zoom',
      description: 'Maximum zoom level',
      default: 3,
      min: 1,
      max: 10,
    },
  },

  SignaturePad: {
    readOnly: {
      type: 'boolean',
      label: 'Read Only',
      description: 'Prevent drawing',
    },
  },

  FileUpload: {
    multiple: {
      type: 'boolean',
      label: 'Multiple',
      description: 'Allow multiple files',
    },
    maxFiles: {
      type: 'number',
      label: 'Max Files',
      description: 'Maximum number of files',
      min: 1,
    },
    allowDrop: {
      type: 'boolean',
      label: 'Allow Drop',
      description: 'Allow drag & drop',
      default: true,
    },
    directory: {
      type: 'boolean',
      label: 'Directory',
      description: 'Allow folder upload',
    },
  },

  Carousel: {
    loop: {
      type: 'boolean',
      label: 'Loop',
      description: 'Enable infinite loop',
      default: true,
    },
    slidesPerView: {
      type: 'number',
      label: 'Slides/View',
      description: 'Visible slides',
      default: 1,
      min: 1,
      max: 5,
    },
    autoplay: {
      type: 'boolean',
      label: 'Autoplay',
      description: 'Auto-advance slides',
    },
    autoplayInterval: {
      type: 'number',
      label: 'Interval',
      description: 'Autoplay interval (ms)',
      default: 4000,
      min: 1000,
      max: 10000,
      step: 500,
    },
    orientation: {
      type: 'enum',
      label: 'Direction',
      description: 'Carousel direction',
      options: ['horizontal', 'vertical'],
      default: 'horizontal',
    },
  },

  // ===========================================================================
  // FEEDBACK & STATUS
  // ===========================================================================
  Progress: {
    min: {
      type: 'number',
      label: 'Min',
      description: 'Minimum value',
      default: 0,
    },
    max: {
      type: 'number',
      label: 'Max',
      description: 'Maximum value',
      default: 100,
    },
  },

  CircularProgress: {
    min: {
      type: 'number',
      label: 'Min',
      description: 'Minimum value',
      default: 0,
    },
    max: {
      type: 'number',
      label: 'Max',
      description: 'Maximum value',
      default: 100,
    },
  },

  QRCode: {
    encoding: {
      type: 'enum',
      label: 'Encoding',
      description: 'QR code encoding mode',
      options: ['byte', 'numeric', 'alphanumeric', 'kanji'],
      default: 'byte',
    },
    errorCorrection: {
      type: 'enum',
      label: 'Error Correction',
      description: 'Error correction level',
      options: ['L', 'M', 'Q', 'H'],
      default: 'M',
    },
  },

  Toast: {
    duration: {
      type: 'number',
      label: 'Duration',
      description: 'Auto-dismiss time (ms)',
      default: 5000,
      min: 1000,
      max: 30000,
      step: 1000,
    },
    placement: {
      type: 'enum',
      label: 'Position',
      description: 'Toast placement',
      options: ['top', 'top-start', 'top-end', 'bottom', 'bottom-start', 'bottom-end'],
      default: 'bottom',
    },
  },

  Marquee: {
    speed: {
      type: 'number',
      label: 'Speed',
      description: 'Animation speed',
      default: 1,
      min: 0.1,
      max: 5,
      step: 0.1,
    },
    pauseOnHover: {
      type: 'boolean',
      label: 'Pause on Hover',
      description: 'Pause on mouse hover',
      default: true,
    },
    gap: {
      type: 'number',
      label: 'Gap',
      description: 'Space between items',
      default: 24,
      min: 0,
      max: 100,
    },
  },

  // ===========================================================================
  // UTILITY
  // ===========================================================================
  Clipboard: {
    timeout: {
      type: 'number',
      label: 'Timeout',
      description: 'Reset indicator time (ms)',
      default: 3000,
      min: 500,
      max: 10000,
      step: 500,
    },
  },

  Splitter: {
    orientation: {
      type: 'enum',
      label: 'Direction',
      description: 'Split direction',
      options: ['horizontal', 'vertical'],
      default: 'horizontal',
    },
  },

  ScrollArea: {
    orientation: {
      type: 'enum',
      label: 'Direction',
      description: 'Scroll direction',
      options: ['vertical', 'horizontal', 'both'],
      default: 'vertical',
    },
    scrollHideDelay: {
      type: 'number',
      label: 'Hide Delay',
      description: 'Scrollbar hide delay (ms)',
      default: 600,
      min: 0,
      max: 2000,
      step: 100,
    },
  },
}

/**
 * Get Zag prop metadata for a component
 */
export function getZagPropMetadata(
  componentName: string
): Record<string, ZagPropMeta> | undefined {
  return ZAG_PROP_METADATA[componentName]
}

/**
 * Check if a component has Zag prop metadata
 */
export function hasZagPropMetadata(componentName: string): boolean {
  return componentName in ZAG_PROP_METADATA
}
