/**
 * Zag Primitives Schema
 *
 * Defines Zag-based behavior components that provide complex interactions
 * like Select, Accordion, Dialog, etc. using Zag.js state machines.
 *
 * These primitives extend the base Mirror DSL with behavior-driven components
 * that automatically handle accessibility, keyboard navigation, and state management.
 */

/**
 * Definition of a Zag primitive component
 */
export interface ZagPrimitiveDef {
  /** Zag machine name (e.g., 'select', 'accordion') */
  machine: string
  /** Available slots for composition (e.g., ['Trigger', 'Content', 'Item']) */
  slots: string[]
  /** Component-specific props (e.g., ['placeholder', 'multiple']) */
  props: string[]
  /** Component-specific events (e.g., ['onchange', 'onopen']) */
  events?: string[]
  /** Description for documentation */
  description?: string
  /** Pattern type for syntax handling */
  pattern?: 'slots-only' | 'simple-items' | 'content-items' | 'repeating-items' | 'complex-nested'
  /** Item keywords for this component (e.g., ['Tab'] for Tabs, ['Step'] for Steps). Default is ['Item'] */
  itemKeywords?: string[]
}

/**
 * Slot definition for Zag components
 */
export interface ZagSlotDef {
  /** API method to get props (e.g., 'getTriggerProps') */
  api: string
  /** Default HTML element (e.g., 'button', 'div') */
  element: string
  /** Whether this slot should be portaled */
  portal?: boolean
  /** Whether this slot is bound to an item (for lists) */
  itemBound?: boolean
}

/**
 * Registry of all Zag primitive components
 */
export const ZAG_PRIMITIVES: Record<string, ZagPrimitiveDef> = {
  // ===========================================================================
  // SELECTION & DROPDOWNS
  // ===========================================================================
  Select: {
    machine: 'select',
    slots: ['Trigger', 'Content', 'Item', 'ItemIndicator', 'Group', 'GroupLabel', 'Input', 'Empty', 'Pill', 'PillRemove', 'ClearButton'],
    props: ['placeholder', 'multiple', 'searchable', 'clearable', 'disabled', 'value', 'defaultValue', 'invalid', 'readOnly', 'required', 'name', 'loopFocus', 'deselectable', 'open', 'defaultOpen', 'positioning', 'typeahead'],
    events: ['onchange', 'onopen', 'onclose'],
    description: 'Dropdown select with keyboard navigation',
    pattern: 'simple-items',
  },

  Combobox: {
    machine: 'combobox',
    slots: ['Root', 'Label', 'Control', 'Input', 'Trigger', 'Positioner', 'Content', 'Item', 'ItemText', 'ItemIndicator', 'Empty', 'ClearTrigger'],
    props: ['placeholder', 'allowCustomValue', 'autoFocus', 'disabled', 'inputBehavior', 'openOnChange', 'openOnKeyPress', 'value', 'defaultValue', 'invalid', 'readOnly', 'required', 'name', 'loopFocus', 'positioning'],
    events: ['onchange', 'onopen', 'onclose', 'oninputchange'],
    description: 'Autocomplete combobox with filtering',
    pattern: 'simple-items',
  },

  Listbox: {
    machine: 'listbox',
    slots: ['Root', 'Label', 'Content', 'Item', 'ItemText', 'ItemIndicator', 'ItemGroup', 'ItemGroupLabel'],
    props: ['multiple', 'disabled', 'value', 'defaultValue', 'orientation', 'invalid', 'readOnly', 'required', 'name', 'loopFocus'],
    events: ['onchange'],
    description: 'Listbox selection',
    pattern: 'simple-items',
  },

  // ===========================================================================
  // MENUS
  // ===========================================================================
  Menu: {
    machine: 'menu',
    slots: ['Trigger', 'Positioner', 'Content', 'Item', 'ItemGroup', 'ItemGroupLabel', 'Separator', 'Arrow'],
    props: ['disabled', 'closeOnSelect', 'loopFocus', 'positioning', 'typeahead'],
    events: ['onselect', 'onopen', 'onclose'],
    description: 'Dropdown menu with keyboard navigation',
    pattern: 'simple-items',
  },

  ContextMenu: {
    machine: 'menu',
    slots: ['Trigger', 'Positioner', 'Content', 'Item', 'ItemGroup', 'ItemGroupLabel', 'Separator'],
    props: ['disabled', 'closeOnSelect', 'loopFocus', 'positioning', 'typeahead'],
    events: ['onselect', 'onopen', 'onclose'],
    description: 'Right-click context menu',
    pattern: 'simple-items',
  },

  NestedMenu: {
    machine: 'menu',
    slots: ['Trigger', 'Positioner', 'Content', 'Item', 'Submenu', 'SubmenuTrigger', 'SubmenuContent', 'Separator'],
    props: ['disabled', 'closeOnSelect', 'loopFocus', 'positioning', 'typeahead'],
    events: ['onselect', 'onopen', 'onclose'],
    description: 'Nested submenu structure',
    pattern: 'complex-nested',
  },

  NavigationMenu: {
    machine: 'navigation-menu',
    slots: ['Root', 'List', 'Item', 'Trigger', 'Content', 'Indicator', 'Arrow', 'Viewport'],
    props: ['value', 'defaultValue', 'orientation'],
    events: ['onchange'],
    description: 'Navigation menu with submenus',
    pattern: 'content-items',
  },

  // ===========================================================================
  // FORM CONTROLS
  // ===========================================================================
  Checkbox: {
    machine: 'checkbox',
    slots: ['Root', 'Control', 'Label', 'Indicator', 'HiddenInput'],
    props: ['checked', 'defaultChecked', 'disabled', 'required', 'name', 'value', 'indeterminate', 'invalid', 'readOnly'],
    events: ['onchange'],
    description: 'Checkbox with label',
    pattern: 'slots-only',
  },

  Switch: {
    machine: 'switch',
    slots: ['Root', 'Track', 'Thumb', 'Label', 'HiddenInput'],
    props: ['checked', 'defaultChecked', 'disabled', 'required', 'name', 'invalid', 'readOnly'],
    events: ['onchange'],
    description: 'Toggle switch',
    pattern: 'slots-only',
  },

  RadioGroup: {
    machine: 'radio-group',
    slots: ['Root', 'Item', 'ItemControl', 'ItemText', 'ItemHiddenInput', 'Label', 'Indicator'],
    props: ['value', 'defaultValue', 'disabled', 'name', 'orientation', 'invalid', 'readOnly', 'required'],
    events: ['onchange'],
    description: 'Radio button group',
    pattern: 'repeating-items',
  },

  Slider: {
    machine: 'slider',
    slots: ['Root', 'Track', 'Range', 'Thumb', 'Label', 'ValueText', 'MarkerGroup', 'Marker', 'HiddenInput'],
    props: ['value', 'defaultValue', 'min', 'max', 'step', 'disabled', 'orientation', 'minStepsBetweenThumbs', 'invalid', 'readOnly', 'name', 'origin'],
    events: ['onchange', 'onchangeend'],
    description: 'Range slider',
    pattern: 'slots-only',
  },

  RangeSlider: {
    machine: 'slider',
    slots: ['Root', 'Track', 'Range', 'Thumb', 'Label', 'ValueText', 'MarkerGroup', 'Marker', 'HiddenInput'],
    props: ['value', 'defaultValue', 'min', 'max', 'step', 'disabled', 'orientation', 'minStepsBetweenThumbs', 'invalid', 'readOnly', 'name', 'origin'],
    events: ['onchange', 'onchangeend'],
    description: 'Range slider with two thumbs',
    pattern: 'slots-only',
  },

  AngleSlider: {
    machine: 'angle-slider',
    slots: ['Root', 'Control', 'Thumb', 'ValueText', 'MarkerGroup', 'Marker', 'HiddenInput'],
    props: ['value', 'defaultValue', 'disabled', 'step'],
    events: ['onchange', 'onchangeend'],
    description: 'Circular angle slider',
    pattern: 'slots-only',
  },

  NumberInput: {
    machine: 'number-input',
    slots: ['Root', 'Label', 'Control', 'Input', 'IncrementTrigger', 'DecrementTrigger', 'ScrubberCursor'],
    props: ['value', 'defaultValue', 'min', 'max', 'step', 'disabled', 'allowMouseWheel', 'clampValueOnBlur', 'formatOptions', 'invalid', 'readOnly', 'required', 'name'],
    events: ['onchange'],
    description: 'Number input with increment/decrement',
    pattern: 'slots-only',
  },

  PinInput: {
    machine: 'pin-input',
    slots: ['Root', 'Label', 'Control', 'Input', 'HiddenInput'],
    props: ['value', 'defaultValue', 'length', 'mask', 'otp', 'type', 'disabled', 'placeholder', 'invalid', 'readOnly', 'required', 'name'],
    events: ['onchange', 'oncomplete'],
    description: 'PIN/OTP input',
    pattern: 'repeating-items',
  },

  PasswordInput: {
    machine: 'password-input',
    slots: ['Root', 'Label', 'Control', 'Input', 'VisibilityTrigger'],
    props: ['visible', 'defaultVisible', 'disabled'],
    events: ['onvisibilitychange'],
    description: 'Password input with visibility toggle',
    pattern: 'slots-only',
  },

  TagsInput: {
    machine: 'tags-input',
    slots: ['Root', 'Label', 'Control', 'Tag', 'TagText', 'TagDeleteTrigger', 'Input', 'ClearTrigger', 'HiddenInput'],
    props: ['value', 'defaultValue', 'addOnPaste', 'addOnBlur', 'allowDuplicate', 'disabled', 'maxTags', 'delimiter', 'invalid', 'readOnly', 'required', 'name'],
    events: ['onchange', 'onadd', 'onremove'],
    description: 'Tags/chips input',
    pattern: 'repeating-items',
  },

  Editable: {
    machine: 'editable',
    slots: ['Root', 'Area', 'Preview', 'Input', 'Control', 'EditTrigger', 'SubmitTrigger', 'CancelTrigger'],
    props: ['value', 'defaultValue', 'disabled', 'readOnly', 'selectOnFocus', 'submitMode', 'placeholder', 'invalid', 'required', 'name'],
    events: ['onchange', 'onsubmit', 'oncancel', 'onedit'],
    description: 'Inline editable text',
    pattern: 'slots-only',
  },

  RatingGroup: {
    machine: 'rating-group',
    slots: ['Root', 'Label', 'Control', 'Item', 'HiddenInput'],
    props: ['value', 'defaultValue', 'count', 'disabled', 'allowHalf', 'readOnly', 'invalid', 'required', 'name'],
    events: ['onchange', 'onhover'],
    description: 'Star rating input',
    pattern: 'repeating-items',
  },

  SegmentedControl: {
    machine: 'radio-group',
    slots: ['Root', 'Item', 'ItemText', 'ItemHiddenInput', 'Indicator'],
    props: ['value', 'defaultValue', 'disabled', 'name', 'orientation'],
    events: ['onchange'],
    description: 'Segmented control / button group',
    pattern: 'simple-items',
  },

  ToggleGroup: {
    machine: 'toggle-group',
    slots: ['Root', 'Item'],
    props: ['value', 'defaultValue', 'multiple', 'disabled', 'orientation', 'loopFocus'],
    events: ['onchange'],
    description: 'Toggle button group',
    pattern: 'simple-items',
  },

  // ===========================================================================
  // DATE & TIME
  // ===========================================================================
  DatePicker: {
    machine: 'date-picker',
    slots: ['Root', 'Label', 'Control', 'Input', 'Trigger', 'Positioner', 'Content', 'ViewControl', 'PrevTrigger', 'NextTrigger', 'ViewTrigger', 'RangeText', 'Table', 'TableHead', 'TableRow', 'TableHeader', 'TableBody', 'TableCell', 'TableCellTrigger', 'MonthSelect', 'YearSelect', 'ClearTrigger', 'PresetTrigger'],
    props: ['value', 'defaultValue', 'disabled', 'readOnly', 'min', 'max', 'locale', 'selectionMode', 'fixedWeeks', 'startOfWeek', 'closeOnSelect', 'positioning'],
    events: ['onchange', 'onopen', 'onclose', 'onviewchange'],
    description: 'Date picker calendar',
    pattern: 'complex-nested',
  },

  DateInput: {
    machine: 'date-input',
    slots: ['Root', 'Label', 'Control', 'Segment', 'Separator'],
    props: ['value', 'defaultValue', 'disabled', 'readOnly', 'locale'],
    events: ['onchange'],
    description: 'Segmented date input',
    pattern: 'slots-only',
  },

  Timer: {
    machine: 'timer',
    slots: ['Root', 'Area', 'Control', 'Segment', 'Separator', 'ActionTrigger'],
    props: ['defaultValue', 'autoStart', 'countdown', 'interval', 'startMs'],
    events: ['ontick', 'oncomplete'],
    description: 'Timer/stopwatch',
    pattern: 'slots-only',
  },

  // ===========================================================================
  // OVERLAYS & MODALS
  // ===========================================================================
  Dialog: {
    machine: 'dialog',
    slots: ['Trigger', 'Backdrop', 'Positioner', 'Content', 'Title', 'Description', 'CloseTrigger'],
    props: ['open', 'defaultOpen', 'modal', 'preventScroll', 'closeOnOutsideClick', 'closeOnEscape', 'role', 'trapFocus', 'restoreFocus'],
    events: ['onopen', 'onclose'],
    description: 'Modal dialog',
    pattern: 'slots-only',
  },

  Tooltip: {
    machine: 'tooltip',
    slots: ['Trigger', 'Positioner', 'Content', 'Arrow'],
    props: ['open', 'defaultOpen', 'openDelay', 'closeDelay', 'placement', 'disabled', 'closeOnClick', 'closeOnPointerDown', 'interactive', 'closeOnScroll', 'positioning'],
    events: ['onopen', 'onclose'],
    description: 'Hover tooltip',
    pattern: 'slots-only',
  },

  Popover: {
    machine: 'popover',
    slots: ['Trigger', 'Positioner', 'Content', 'Title', 'Description', 'CloseTrigger', 'Arrow', 'Anchor'],
    props: ['open', 'defaultOpen', 'placement', 'modal', 'closeOnOutsideClick', 'closeOnEscape', 'autoFocus', 'trapFocus', 'restoreFocus', 'positioning'],
    events: ['onopen', 'onclose'],
    description: 'Click popover',
    pattern: 'slots-only',
  },

  HoverCard: {
    machine: 'hover-card',
    slots: ['Trigger', 'Positioner', 'Content', 'Arrow'],
    props: ['open', 'defaultOpen', 'openDelay', 'closeDelay', 'placement', 'positioning'],
    events: ['onopen', 'onclose'],
    description: 'Hover card preview',
    pattern: 'slots-only',
  },

  FloatingPanel: {
    machine: 'floating-panel',
    slots: ['Trigger', 'Positioner', 'Content', 'Header', 'DragTrigger', 'CloseTrigger', 'Body', 'ResizeTrigger'],
    props: ['open', 'defaultOpen', 'position', 'defaultPosition', 'size', 'defaultSize', 'minSize', 'maxSize', 'resizable', 'draggable', 'lockAspectRatio'],
    events: ['onopen', 'onclose', 'onpositionchange', 'onsizechange', 'ondragstart', 'ondragend'],
    description: 'Draggable floating panel',
    pattern: 'slots-only',
  },

  Tour: {
    machine: 'tour',
    slots: ['Backdrop', 'Spotlight', 'Positioner', 'Content', 'Title', 'Description', 'CloseTrigger', 'PrevTrigger', 'NextTrigger', 'Arrow', 'ProgressText', 'Actions'],
    props: ['step', 'defaultStep', 'steps', 'closeOnOutsideClick', 'closeOnEscape', 'preventInteraction', 'spotlightOffset', 'spotlightRadius'],
    events: ['onstepchange', 'oncomplete', 'onskip'],
    description: 'Guided tour/walkthrough',
    pattern: 'content-items',
    itemKeywords: ['TourStep', 'Step', 'Item'],
  },

  Presence: {
    machine: 'presence',
    slots: ['Root'],
    props: ['present', 'lazyMount', 'unmountOnExit'],
    events: ['onexitcomplete'],
    description: 'Presence animation utility',
    pattern: 'slots-only',
  },

  // ===========================================================================
  // NAVIGATION
  // ===========================================================================
  Tabs: {
    machine: 'tabs',
    slots: ['Root', 'List', 'Trigger', 'Content', 'Indicator'],
    props: ['value', 'defaultValue', 'orientation', 'activationMode', 'loopFocus', 'deselectable'],
    events: ['onchange'],
    description: 'Tabbed navigation',
    pattern: 'content-items',
    itemKeywords: ['Tab', 'Item'],
  },

  Accordion: {
    machine: 'accordion',
    slots: ['Root', 'Item', 'ItemTrigger', 'ItemContent', 'ItemIndicator'],
    props: ['value', 'defaultValue', 'multiple', 'collapsible', 'disabled', 'orientation'],
    events: ['onchange'],
    description: 'Collapsible accordion',
    pattern: 'content-items',
  },

  Collapsible: {
    machine: 'collapsible',
    slots: ['Root', 'Trigger', 'Content'],
    props: ['open', 'defaultOpen', 'disabled'],
    events: ['onopen', 'onclose'],
    description: 'Collapsible section',
    pattern: 'slots-only',
  },

  Steps: {
    machine: 'steps',
    slots: ['Root', 'List', 'Item', 'Trigger', 'Indicator', 'Separator', 'Content', 'PrevTrigger', 'NextTrigger', 'Progress'],
    props: ['step', 'defaultStep', 'count', 'linear', 'orientation'],
    events: ['onstepchange', 'oncomplete'],
    description: 'Step wizard/stepper',
    pattern: 'content-items',
    itemKeywords: ['Step', 'Item'],
  },

  Pagination: {
    machine: 'pagination',
    slots: ['Root', 'PrevTrigger', 'NextTrigger', 'Item', 'Ellipsis'],
    props: ['page', 'defaultPage', 'count', 'pageSize', 'siblingCount'],
    events: ['onpagechange'],
    description: 'Pagination controls',
    pattern: 'repeating-items',
  },

  TreeView: {
    machine: 'tree-view',
    slots: ['Root', 'Tree', 'Branch', 'BranchTrigger', 'BranchContent', 'BranchIndicator', 'Item', 'ItemText'],
    props: ['value', 'defaultValue', 'multiple', 'selectionMode', 'expandedKeys', 'defaultExpandedKeys'],
    events: ['onchange', 'onexpand', 'oncollapse'],
    description: 'Tree view navigation',
    pattern: 'complex-nested',
  },

  // ===========================================================================
  // MEDIA & FILES
  // ===========================================================================
  Avatar: {
    machine: 'avatar',
    slots: ['Root', 'Image', 'Fallback'],
    props: ['src', 'name'],
    events: ['onload', 'onerror'],
    description: 'Avatar with fallback',
    pattern: 'slots-only',
  },

  FileUpload: {
    machine: 'file-upload',
    slots: ['Root', 'Dropzone', 'Trigger', 'HiddenInput', 'ItemGroup', 'Item', 'ItemName', 'ItemSizeText', 'ItemPreview', 'ItemPreviewImage', 'ItemDeleteTrigger'],
    props: ['accept', 'multiple', 'maxFiles', 'maxFileSize', 'minFileSize', 'disabled', 'allowDrop', 'directory'],
    events: ['onchange', 'onaccept', 'onreject'],
    description: 'File upload with drag & drop',
    pattern: 'repeating-items',
  },

  ImageCropper: {
    machine: 'image-cropper',
    slots: ['Root', 'Image', 'Overlay', 'Cropper', 'CropperBackground', 'CropperForeground', 'Guide', 'ZoomSlider', 'ZoomInTrigger', 'ZoomOutTrigger', 'RotateTrigger', 'CenterTrigger'],
    props: ['src', 'aspectRatio', 'disabled', 'zoom', 'defaultZoom', 'minZoom', 'maxZoom', 'rotation', 'defaultRotation'],
    events: ['onzoomchange', 'onrotationchange', 'oncrop'],
    description: 'Image cropping tool',
    pattern: 'slots-only',
  },

  Carousel: {
    machine: 'carousel',
    slots: ['Root', 'ItemGroup', 'Item', 'Control', 'PrevTrigger', 'NextTrigger', 'IndicatorGroup', 'Indicator', 'AutoplayTrigger'],
    props: ['index', 'defaultIndex', 'loop', 'align', 'slidesPerView', 'spacing', 'orientation', 'autoplay', 'autoplayInterval'],
    events: ['onindexchange', 'ondragstart', 'ondragend'],
    description: 'Carousel/slider',
    pattern: 'content-items',
    itemKeywords: ['Slide', 'Item'],
  },

  SignaturePad: {
    machine: 'signature-pad',
    slots: ['Root', 'Control', 'Segment', 'SegmentPath', 'Guide', 'ClearTrigger', 'HiddenInput'],
    props: ['disabled', 'readOnly', 'drawing'],
    events: ['ondraw', 'ondrawend'],
    description: 'Signature drawing pad',
    pattern: 'slots-only',
  },

  // ===========================================================================
  // FEEDBACK & STATUS
  // ===========================================================================
  Progress: {
    machine: 'progress',
    slots: ['Root', 'Track', 'Range', 'Label', 'ValueText', 'Circle', 'CircleTrack', 'CircleRange'],
    props: ['value', 'min', 'max'],
    description: 'Linear progress bar',
    pattern: 'slots-only',
  },

  CircularProgress: {
    machine: 'progress',
    slots: ['Root', 'Circle', 'CircleTrack', 'CircleRange', 'Label', 'ValueText'],
    props: ['value', 'min', 'max'],
    description: 'Circular progress indicator',
    pattern: 'slots-only',
  },

  Toast: {
    machine: 'toast',
    slots: ['Root', 'Title', 'Description', 'CloseTrigger', 'ActionTrigger'],
    props: ['type', 'duration', 'placement', 'removeDelay'],
    events: ['onclose', 'onstatuschange'],
    description: 'Toast notification',
    pattern: 'slots-only',
  },

  Marquee: {
    machine: 'marquee',
    slots: ['Root', 'Content'],
    props: ['speed', 'direction', 'pauseOnHover', 'gap'],
    description: 'Scrolling marquee',
    pattern: 'slots-only',
  },

  // ===========================================================================
  // UTILITY
  // ===========================================================================
  Clipboard: {
    machine: 'clipboard',
    slots: ['Root', 'Label', 'Control', 'Input', 'Trigger', 'Indicator'],
    props: ['value', 'timeout'],
    events: ['oncopy'],
    description: 'Clipboard copy utility',
    pattern: 'slots-only',
  },

  QRCode: {
    machine: 'qr-code',
    slots: ['Root', 'Frame', 'Pattern', 'Overlay'],
    props: ['value', 'encoding', 'errorCorrection'],
    description: 'QR code generator',
    pattern: 'slots-only',
  },

  ScrollArea: {
    machine: 'scroll-area',
    slots: ['Root', 'Viewport', 'Content', 'Scrollbar', 'Thumb', 'Corner'],
    props: ['orientation', 'scrollHideDelay'],
    events: ['onscroll'],
    description: 'Custom scrollbar area',
    pattern: 'slots-only',
  },

  Splitter: {
    machine: 'splitter',
    slots: ['Root', 'Panel', 'ResizeTrigger'],
    props: ['orientation', 'size', 'defaultSize', 'minSize', 'maxSize'],
    events: ['onsizechange', 'onsizechangestart', 'onsizechangeend'],
    description: 'Resizable split panels',
    pattern: 'slots-only',
  },
}

/**
 * Slot mappings for Zag components
 * Maps slot names to their Zag API methods and element types
 */
export const SLOT_MAPPINGS: Record<string, Record<string, ZagSlotDef>> = {
  // ===========================================================================
  // SELECTION & DROPDOWNS
  // ===========================================================================
  Select: {
    Trigger: { api: 'getTriggerProps', element: 'button' },
    Content: { api: 'getContentProps', element: 'div', portal: true },
    Item: { api: 'getItemProps', element: 'div', itemBound: true },
    ItemIndicator: { api: 'getItemIndicatorProps', element: 'span', itemBound: true },
    Group: { api: 'getGroupProps', element: 'div' },
    GroupLabel: { api: 'getLabelProps', element: 'span' },
    Input: { api: 'getInputProps', element: 'input' },
    Empty: { api: 'getEmptyProps', element: 'div' },
    Pill: { api: 'getPillProps', element: 'span', itemBound: true },
    PillRemove: { api: 'getPillRemoveProps', element: 'button', itemBound: true },
    ClearButton: { api: 'getClearButtonProps', element: 'button' },
  },

  Combobox: {
    Root: { api: 'getRootProps', element: 'div' },
    Label: { api: 'getLabelProps', element: 'label' },
    Control: { api: 'getControlProps', element: 'div' },
    Input: { api: 'getInputProps', element: 'input' },
    Trigger: { api: 'getTriggerProps', element: 'button' },
    Positioner: { api: 'getPositionerProps', element: 'div', portal: true },
    Content: { api: 'getContentProps', element: 'div' },
    Item: { api: 'getItemProps', element: 'div', itemBound: true },
    ItemText: { api: 'getItemTextProps', element: 'span', itemBound: true },
    ItemIndicator: { api: 'getItemIndicatorProps', element: 'span', itemBound: true },
    Empty: { api: 'getEmptyProps', element: 'div' },
    ClearTrigger: { api: 'getClearTriggerProps', element: 'button' },
  },

  Listbox: {
    Root: { api: 'getRootProps', element: 'div' },
    Label: { api: 'getLabelProps', element: 'label' },
    Content: { api: 'getContentProps', element: 'div' },
    Item: { api: 'getItemProps', element: 'div', itemBound: true },
    ItemText: { api: 'getItemTextProps', element: 'span', itemBound: true },
    ItemIndicator: { api: 'getItemIndicatorProps', element: 'span', itemBound: true },
    ItemGroup: { api: 'getItemGroupProps', element: 'div' },
    ItemGroupLabel: { api: 'getItemGroupLabelProps', element: 'span' },
  },

  // ===========================================================================
  // MENUS
  // ===========================================================================
  Menu: {
    Trigger: { api: 'getTriggerProps', element: 'button' },
    Positioner: { api: 'getPositionerProps', element: 'div', portal: true },
    Content: { api: 'getContentProps', element: 'div' },
    Item: { api: 'getItemProps', element: 'div', itemBound: true },
    ItemGroup: { api: 'getItemGroupProps', element: 'div' },
    ItemGroupLabel: { api: 'getItemGroupLabelProps', element: 'span' },
    Separator: { api: 'getSeparatorProps', element: 'hr' },
    Arrow: { api: 'getArrowProps', element: 'div' },
  },

  ContextMenu: {
    Trigger: { api: 'getContextTriggerProps', element: 'div' },
    Positioner: { api: 'getPositionerProps', element: 'div', portal: true },
    Content: { api: 'getContentProps', element: 'div' },
    Item: { api: 'getItemProps', element: 'div', itemBound: true },
    ItemGroup: { api: 'getItemGroupProps', element: 'div' },
    ItemGroupLabel: { api: 'getItemGroupLabelProps', element: 'span' },
    Separator: { api: 'getSeparatorProps', element: 'hr' },
  },

  NestedMenu: {
    Trigger: { api: 'getTriggerProps', element: 'button' },
    Positioner: { api: 'getPositionerProps', element: 'div', portal: true },
    Content: { api: 'getContentProps', element: 'div' },
    Item: { api: 'getItemProps', element: 'div', itemBound: true },
    Submenu: { api: 'getSubmenuProps', element: 'div' },
    SubmenuTrigger: { api: 'getSubmenuTriggerProps', element: 'div', itemBound: true },
    SubmenuContent: { api: 'getSubmenuContentProps', element: 'div', portal: true },
    Separator: { api: 'getSeparatorProps', element: 'hr' },
  },

  NavigationMenu: {
    Root: { api: 'getRootProps', element: 'nav' },
    List: { api: 'getListProps', element: 'ul' },
    Item: { api: 'getItemProps', element: 'li', itemBound: true },
    Trigger: { api: 'getTriggerProps', element: 'button', itemBound: true },
    Content: { api: 'getContentProps', element: 'div', itemBound: true },
    Indicator: { api: 'getIndicatorProps', element: 'div' },
    Arrow: { api: 'getArrowProps', element: 'div' },
    Viewport: { api: 'getViewportProps', element: 'div' },
  },

  // ===========================================================================
  // FORM CONTROLS
  // ===========================================================================
  Checkbox: {
    Root: { api: 'getRootProps', element: 'label' },
    Control: { api: 'getControlProps', element: 'div' },
    Label: { api: 'getLabelProps', element: 'span' },
    Indicator: { api: 'getIndicatorProps', element: 'span' },
    HiddenInput: { api: 'getHiddenInputProps', element: 'input' },
  },

  Switch: {
    Root: { api: 'getRootProps', element: 'label' },
    Track: { api: 'getTrackProps', element: 'span' },
    Thumb: { api: 'getThumbProps', element: 'span' },
    Label: { api: 'getLabelProps', element: 'span' },
    HiddenInput: { api: 'getHiddenInputProps', element: 'input' },
  },

  RadioGroup: {
    Root: { api: 'getRootProps', element: 'div' },
    Item: { api: 'getItemProps', element: 'label', itemBound: true },
    ItemControl: { api: 'getItemControlProps', element: 'div', itemBound: true },
    ItemText: { api: 'getItemTextProps', element: 'span', itemBound: true },
    ItemHiddenInput: { api: 'getItemHiddenInputProps', element: 'input', itemBound: true },
    Label: { api: 'getLabelProps', element: 'span' },
    Indicator: { api: 'getIndicatorProps', element: 'span' },
  },

  Slider: {
    Root: { api: 'getRootProps', element: 'div' },
    Track: { api: 'getTrackProps', element: 'div' },
    Range: { api: 'getRangeProps', element: 'div' },
    Thumb: { api: 'getThumbProps', element: 'div', itemBound: true },
    Label: { api: 'getLabelProps', element: 'label' },
    ValueText: { api: 'getValueTextProps', element: 'span' },
    MarkerGroup: { api: 'getMarkerGroupProps', element: 'div' },
    Marker: { api: 'getMarkerProps', element: 'span', itemBound: true },
    HiddenInput: { api: 'getHiddenInputProps', element: 'input' },
  },

  RangeSlider: {
    Root: { api: 'getRootProps', element: 'div' },
    Track: { api: 'getTrackProps', element: 'div' },
    Range: { api: 'getRangeProps', element: 'div' },
    Thumb: { api: 'getThumbProps', element: 'div', itemBound: true },
    Label: { api: 'getLabelProps', element: 'label' },
    ValueText: { api: 'getValueTextProps', element: 'span' },
    MarkerGroup: { api: 'getMarkerGroupProps', element: 'div' },
    Marker: { api: 'getMarkerProps', element: 'span', itemBound: true },
    HiddenInput: { api: 'getHiddenInputProps', element: 'input' },
  },

  AngleSlider: {
    Root: { api: 'getRootProps', element: 'div' },
    Control: { api: 'getControlProps', element: 'div' },
    Thumb: { api: 'getThumbProps', element: 'div' },
    ValueText: { api: 'getValueTextProps', element: 'span' },
    MarkerGroup: { api: 'getMarkerGroupProps', element: 'div' },
    Marker: { api: 'getMarkerProps', element: 'span', itemBound: true },
    HiddenInput: { api: 'getHiddenInputProps', element: 'input' },
  },

  NumberInput: {
    Root: { api: 'getRootProps', element: 'div' },
    Label: { api: 'getLabelProps', element: 'label' },
    Control: { api: 'getControlProps', element: 'div' },
    Input: { api: 'getInputProps', element: 'input' },
    IncrementTrigger: { api: 'getIncrementTriggerProps', element: 'button' },
    DecrementTrigger: { api: 'getDecrementTriggerProps', element: 'button' },
    ScrubberCursor: { api: 'getScrubberCursorProps', element: 'div' },
  },

  PinInput: {
    Root: { api: 'getRootProps', element: 'div' },
    Label: { api: 'getLabelProps', element: 'label' },
    Control: { api: 'getControlProps', element: 'div' },
    Input: { api: 'getInputProps', element: 'input', itemBound: true },
    HiddenInput: { api: 'getHiddenInputProps', element: 'input' },
  },

  PasswordInput: {
    Root: { api: 'getRootProps', element: 'div' },
    Label: { api: 'getLabelProps', element: 'label' },
    Control: { api: 'getControlProps', element: 'div' },
    Input: { api: 'getInputProps', element: 'input' },
    VisibilityTrigger: { api: 'getVisibilityTriggerProps', element: 'button' },
  },

  TagsInput: {
    Root: { api: 'getRootProps', element: 'div' },
    Label: { api: 'getLabelProps', element: 'label' },
    Control: { api: 'getControlProps', element: 'div' },
    Tag: { api: 'getTagProps', element: 'span', itemBound: true },
    TagText: { api: 'getTagTextProps', element: 'span', itemBound: true },
    TagDeleteTrigger: { api: 'getTagDeleteTriggerProps', element: 'button', itemBound: true },
    Input: { api: 'getInputProps', element: 'input' },
    ClearTrigger: { api: 'getClearTriggerProps', element: 'button' },
    HiddenInput: { api: 'getHiddenInputProps', element: 'input' },
  },

  Editable: {
    Root: { api: 'getRootProps', element: 'div' },
    Area: { api: 'getAreaProps', element: 'div' },
    Preview: { api: 'getPreviewProps', element: 'span' },
    Input: { api: 'getInputProps', element: 'input' },
    Control: { api: 'getControlProps', element: 'div' },
    EditTrigger: { api: 'getEditTriggerProps', element: 'button' },
    SubmitTrigger: { api: 'getSubmitTriggerProps', element: 'button' },
    CancelTrigger: { api: 'getCancelTriggerProps', element: 'button' },
  },

  RatingGroup: {
    Root: { api: 'getRootProps', element: 'div' },
    Label: { api: 'getLabelProps', element: 'label' },
    Control: { api: 'getControlProps', element: 'div' },
    Item: { api: 'getItemProps', element: 'span', itemBound: true },
    HiddenInput: { api: 'getHiddenInputProps', element: 'input' },
  },

  SegmentedControl: {
    Root: { api: 'getRootProps', element: 'div' },
    Item: { api: 'getItemProps', element: 'label', itemBound: true },
    ItemText: { api: 'getItemTextProps', element: 'span', itemBound: true },
    ItemHiddenInput: { api: 'getItemHiddenInputProps', element: 'input', itemBound: true },
    Indicator: { api: 'getIndicatorProps', element: 'div' },
  },

  ToggleGroup: {
    Root: { api: 'getRootProps', element: 'div' },
    Item: { api: 'getItemProps', element: 'button', itemBound: true },
  },

  // ===========================================================================
  // DATE & TIME
  // ===========================================================================
  DatePicker: {
    Root: { api: 'getRootProps', element: 'div' },
    Label: { api: 'getLabelProps', element: 'label' },
    Control: { api: 'getControlProps', element: 'div' },
    Input: { api: 'getInputProps', element: 'input' },
    Trigger: { api: 'getTriggerProps', element: 'button' },
    Positioner: { api: 'getPositionerProps', element: 'div', portal: true },
    Content: { api: 'getContentProps', element: 'div' },
    ViewControl: { api: 'getViewControlProps', element: 'div' },
    PrevTrigger: { api: 'getPrevTriggerProps', element: 'button' },
    NextTrigger: { api: 'getNextTriggerProps', element: 'button' },
    ViewTrigger: { api: 'getViewTriggerProps', element: 'button' },
    RangeText: { api: 'getRangeTextProps', element: 'span' },
    Table: { api: 'getTableProps', element: 'table' },
    TableHead: { api: 'getTableHeadProps', element: 'thead' },
    TableRow: { api: 'getTableRowProps', element: 'tr' },
    TableHeader: { api: 'getTableHeaderProps', element: 'th' },
    TableBody: { api: 'getTableBodyProps', element: 'tbody' },
    TableCell: { api: 'getTableCellProps', element: 'td', itemBound: true },
    TableCellTrigger: { api: 'getTableCellTriggerProps', element: 'button', itemBound: true },
    MonthSelect: { api: 'getMonthSelectProps', element: 'select' },
    YearSelect: { api: 'getYearSelectProps', element: 'select' },
    ClearTrigger: { api: 'getClearTriggerProps', element: 'button' },
    PresetTrigger: { api: 'getPresetTriggerProps', element: 'button', itemBound: true },
  },

  DateInput: {
    Root: { api: 'getRootProps', element: 'div' },
    Label: { api: 'getLabelProps', element: 'label' },
    Control: { api: 'getControlProps', element: 'div' },
    Segment: { api: 'getSegmentProps', element: 'span', itemBound: true },
    Separator: { api: 'getSeparatorProps', element: 'span' },
  },

  Timer: {
    Root: { api: 'getRootProps', element: 'div' },
    Area: { api: 'getAreaProps', element: 'div' },
    Control: { api: 'getControlProps', element: 'div' },
    Segment: { api: 'getSegmentProps', element: 'span', itemBound: true },
    Separator: { api: 'getSeparatorProps', element: 'span' },
    ActionTrigger: { api: 'getActionTriggerProps', element: 'button', itemBound: true },
  },

  // ===========================================================================
  // OVERLAYS & MODALS
  // ===========================================================================
  Dialog: {
    Trigger: { api: 'getTriggerProps', element: 'button' },
    Backdrop: { api: 'getBackdropProps', element: 'div', portal: true },
    Positioner: { api: 'getPositionerProps', element: 'div', portal: true },
    Content: { api: 'getContentProps', element: 'div' },
    Title: { api: 'getTitleProps', element: 'h2' },
    Description: { api: 'getDescriptionProps', element: 'p' },
    CloseTrigger: { api: 'getCloseTriggerProps', element: 'button' },
  },

  Tooltip: {
    Trigger: { api: 'getTriggerProps', element: 'button' },
    Positioner: { api: 'getPositionerProps', element: 'div', portal: true },
    Content: { api: 'getContentProps', element: 'div' },
    Arrow: { api: 'getArrowProps', element: 'div' },
  },

  Popover: {
    Trigger: { api: 'getTriggerProps', element: 'button' },
    Positioner: { api: 'getPositionerProps', element: 'div', portal: true },
    Content: { api: 'getContentProps', element: 'div' },
    Title: { api: 'getTitleProps', element: 'h2' },
    Description: { api: 'getDescriptionProps', element: 'p' },
    CloseTrigger: { api: 'getCloseTriggerProps', element: 'button' },
    Arrow: { api: 'getArrowProps', element: 'div' },
    Anchor: { api: 'getAnchorProps', element: 'div' },
  },

  HoverCard: {
    Trigger: { api: 'getTriggerProps', element: 'a' },
    Positioner: { api: 'getPositionerProps', element: 'div', portal: true },
    Content: { api: 'getContentProps', element: 'div' },
    Arrow: { api: 'getArrowProps', element: 'div' },
  },

  FloatingPanel: {
    Trigger: { api: 'getTriggerProps', element: 'button' },
    Positioner: { api: 'getPositionerProps', element: 'div', portal: true },
    Content: { api: 'getContentProps', element: 'div' },
    Header: { api: 'getHeaderProps', element: 'div' },
    DragTrigger: { api: 'getDragTriggerProps', element: 'div' },
    CloseTrigger: { api: 'getCloseTriggerProps', element: 'button' },
    Body: { api: 'getBodyProps', element: 'div' },
    ResizeTrigger: { api: 'getResizeTriggerProps', element: 'div' },
  },

  Tour: {
    Backdrop: { api: 'getBackdropProps', element: 'div', portal: true },
    Spotlight: { api: 'getSpotlightProps', element: 'div', portal: true },
    Positioner: { api: 'getPositionerProps', element: 'div', portal: true },
    Content: { api: 'getContentProps', element: 'div' },
    Title: { api: 'getTitleProps', element: 'h2' },
    Description: { api: 'getDescriptionProps', element: 'p' },
    CloseTrigger: { api: 'getCloseTriggerProps', element: 'button' },
    PrevTrigger: { api: 'getPrevTriggerProps', element: 'button' },
    NextTrigger: { api: 'getNextTriggerProps', element: 'button' },
    Arrow: { api: 'getArrowProps', element: 'div' },
    ProgressText: { api: 'getProgressTextProps', element: 'span' },
    Actions: { api: 'getActionsProps', element: 'div' },
  },

  Presence: {
    Root: { api: 'getRootProps', element: 'div' },
  },

  // ===========================================================================
  // NAVIGATION
  // ===========================================================================
  Tabs: {
    Root: { api: 'getRootProps', element: 'div' },
    List: { api: 'getListProps', element: 'div' },
    Trigger: { api: 'getTriggerProps', element: 'button', itemBound: true },
    Content: { api: 'getContentProps', element: 'div', itemBound: true },
    Indicator: { api: 'getIndicatorProps', element: 'div' },
  },

  Accordion: {
    Root: { api: 'getRootProps', element: 'div' },
    Item: { api: 'getItemProps', element: 'div', itemBound: true },
    ItemTrigger: { api: 'getItemTriggerProps', element: 'button', itemBound: true },
    ItemContent: { api: 'getItemContentProps', element: 'div', itemBound: true },
    ItemIndicator: { api: 'getItemIndicatorProps', element: 'span', itemBound: true },
  },

  Collapsible: {
    Root: { api: 'getRootProps', element: 'div' },
    Trigger: { api: 'getTriggerProps', element: 'button' },
    Content: { api: 'getContentProps', element: 'div' },
  },

  Steps: {
    Root: { api: 'getRootProps', element: 'div' },
    List: { api: 'getListProps', element: 'div' },
    Item: { api: 'getItemProps', element: 'div', itemBound: true },
    Trigger: { api: 'getTriggerProps', element: 'button', itemBound: true },
    Indicator: { api: 'getIndicatorProps', element: 'div', itemBound: true },
    Separator: { api: 'getSeparatorProps', element: 'div', itemBound: true },
    Content: { api: 'getContentProps', element: 'div', itemBound: true },
    PrevTrigger: { api: 'getPrevTriggerProps', element: 'button' },
    NextTrigger: { api: 'getNextTriggerProps', element: 'button' },
    Progress: { api: 'getProgressProps', element: 'div' },
  },

  Pagination: {
    Root: { api: 'getRootProps', element: 'nav' },
    PrevTrigger: { api: 'getPrevTriggerProps', element: 'button' },
    NextTrigger: { api: 'getNextTriggerProps', element: 'button' },
    Item: { api: 'getItemProps', element: 'button', itemBound: true },
    Ellipsis: { api: 'getEllipsisProps', element: 'span' },
  },

  TreeView: {
    Root: { api: 'getRootProps', element: 'div' },
    Tree: { api: 'getTreeProps', element: 'ul' },
    Branch: { api: 'getBranchProps', element: 'li', itemBound: true },
    BranchTrigger: { api: 'getBranchTriggerProps', element: 'div', itemBound: true },
    BranchContent: { api: 'getBranchContentProps', element: 'ul', itemBound: true },
    BranchIndicator: { api: 'getBranchIndicatorProps', element: 'span', itemBound: true },
    Item: { api: 'getItemProps', element: 'li', itemBound: true },
    ItemText: { api: 'getItemTextProps', element: 'span', itemBound: true },
  },

  // ===========================================================================
  // MEDIA & FILES
  // ===========================================================================
  Avatar: {
    Root: { api: 'getRootProps', element: 'div' },
    Image: { api: 'getImageProps', element: 'img' },
    Fallback: { api: 'getFallbackProps', element: 'span' },
  },

  FileUpload: {
    Root: { api: 'getRootProps', element: 'div' },
    Dropzone: { api: 'getDropzoneProps', element: 'div' },
    Trigger: { api: 'getTriggerProps', element: 'button' },
    HiddenInput: { api: 'getHiddenInputProps', element: 'input' },
    ItemGroup: { api: 'getItemGroupProps', element: 'ul' },
    Item: { api: 'getItemProps', element: 'li', itemBound: true },
    ItemName: { api: 'getItemNameProps', element: 'span', itemBound: true },
    ItemSizeText: { api: 'getItemSizeTextProps', element: 'span', itemBound: true },
    ItemPreview: { api: 'getItemPreviewProps', element: 'div', itemBound: true },
    ItemPreviewImage: { api: 'getItemPreviewImageProps', element: 'img', itemBound: true },
    ItemDeleteTrigger: { api: 'getItemDeleteTriggerProps', element: 'button', itemBound: true },
  },

  ImageCropper: {
    Root: { api: 'getRootProps', element: 'div' },
    Image: { api: 'getImageProps', element: 'img' },
    Overlay: { api: 'getOverlayProps', element: 'div' },
    Cropper: { api: 'getCropperProps', element: 'div' },
    CropperBackground: { api: 'getCropperBackgroundProps', element: 'div' },
    CropperForeground: { api: 'getCropperForegroundProps', element: 'div' },
    Guide: { api: 'getGuideProps', element: 'div' },
    ZoomSlider: { api: 'getZoomSliderProps', element: 'input' },
    ZoomInTrigger: { api: 'getZoomInTriggerProps', element: 'button' },
    ZoomOutTrigger: { api: 'getZoomOutTriggerProps', element: 'button' },
    RotateTrigger: { api: 'getRotateTriggerProps', element: 'button' },
    CenterTrigger: { api: 'getCenterTriggerProps', element: 'button' },
  },

  Carousel: {
    Root: { api: 'getRootProps', element: 'div' },
    ItemGroup: { api: 'getItemGroupProps', element: 'div' },
    Item: { api: 'getItemProps', element: 'div', itemBound: true },
    Control: { api: 'getControlProps', element: 'div' },
    PrevTrigger: { api: 'getPrevTriggerProps', element: 'button' },
    NextTrigger: { api: 'getNextTriggerProps', element: 'button' },
    IndicatorGroup: { api: 'getIndicatorGroupProps', element: 'div' },
    Indicator: { api: 'getIndicatorProps', element: 'button', itemBound: true },
    AutoplayTrigger: { api: 'getAutoplayTriggerProps', element: 'button' },
  },

  SignaturePad: {
    Root: { api: 'getRootProps', element: 'div' },
    Control: { api: 'getControlProps', element: 'div' },
    Segment: { api: 'getSegmentProps', element: 'svg' },
    SegmentPath: { api: 'getSegmentPathProps', element: 'path' },
    Guide: { api: 'getGuideProps', element: 'div' },
    ClearTrigger: { api: 'getClearTriggerProps', element: 'button' },
    HiddenInput: { api: 'getHiddenInputProps', element: 'input' },
  },

  // ===========================================================================
  // FEEDBACK & STATUS
  // ===========================================================================
  Progress: {
    Root: { api: 'getRootProps', element: 'div' },
    Track: { api: 'getTrackProps', element: 'div' },
    Range: { api: 'getRangeProps', element: 'div' },
    Label: { api: 'getLabelProps', element: 'label' },
    ValueText: { api: 'getValueTextProps', element: 'span' },
    Circle: { api: 'getCircleProps', element: 'svg' },
    CircleTrack: { api: 'getCircleTrackProps', element: 'circle' },
    CircleRange: { api: 'getCircleRangeProps', element: 'circle' },
  },

  CircularProgress: {
    Root: { api: 'getRootProps', element: 'div' },
    Circle: { api: 'getCircleProps', element: 'svg' },
    CircleTrack: { api: 'getCircleTrackProps', element: 'circle' },
    CircleRange: { api: 'getCircleRangeProps', element: 'circle' },
    Label: { api: 'getLabelProps', element: 'label' },
    ValueText: { api: 'getValueTextProps', element: 'span' },
  },

  Toast: {
    Root: { api: 'getRootProps', element: 'div' },
    Title: { api: 'getTitleProps', element: 'h3' },
    Description: { api: 'getDescriptionProps', element: 'p' },
    CloseTrigger: { api: 'getCloseTriggerProps', element: 'button' },
    ActionTrigger: { api: 'getActionTriggerProps', element: 'button' },
  },

  Marquee: {
    Root: { api: 'getRootProps', element: 'div' },
    Content: { api: 'getContentProps', element: 'div' },
  },

  // ===========================================================================
  // UTILITY
  // ===========================================================================
  Clipboard: {
    Root: { api: 'getRootProps', element: 'div' },
    Label: { api: 'getLabelProps', element: 'label' },
    Control: { api: 'getControlProps', element: 'div' },
    Input: { api: 'getInputProps', element: 'input' },
    Trigger: { api: 'getTriggerProps', element: 'button' },
    Indicator: { api: 'getIndicatorProps', element: 'span' },
  },

  QRCode: {
    Root: { api: 'getRootProps', element: 'div' },
    Frame: { api: 'getFrameProps', element: 'svg' },
    Pattern: { api: 'getPatternProps', element: 'path' },
    Overlay: { api: 'getOverlayProps', element: 'div' },
  },

  ScrollArea: {
    Root: { api: 'getRootProps', element: 'div' },
    Viewport: { api: 'getViewportProps', element: 'div' },
    Content: { api: 'getContentProps', element: 'div' },
    Scrollbar: { api: 'getScrollbarProps', element: 'div' },
    Thumb: { api: 'getThumbProps', element: 'div' },
    Corner: { api: 'getCornerProps', element: 'div' },
  },

  Splitter: {
    Root: { api: 'getRootProps', element: 'div' },
    Panel: { api: 'getPanelProps', element: 'div', itemBound: true },
    ResizeTrigger: { api: 'getResizeTriggerProps', element: 'div', itemBound: true },
  },
}

/**
 * State mappings from Mirror state syntax to Zag data attributes
 *
 * These map Mirror's state syntax (e.g., hover:, selected:) to
 * Zag's data attribute selectors for CSS styling
 */
export const STATE_MAPPINGS: Record<string, string> = {
  // Selection states
  'hover:': '[data-highlighted]',
  'selected:': '[data-state="checked"]',
  'highlighted:': '[data-highlighted]',
  'checked:': '[data-state="checked"]',
  'unchecked:': '[data-state="unchecked"]',

  // Interactive states
  'disabled:': '[data-disabled]',
  'focus:': '[data-focus]',
  'focus-visible:': '[data-focus-visible]',
  'active:': '[data-active]',
  'pressed:': '[data-pressed]',
  'readonly:': '[data-readonly]',
  'dragging:': '[data-dragging]',

  // Open/close states
  'open:': '[data-state="open"]',
  'closed:': '[data-state="closed"]',
  'expanded:': '[data-state="open"]',
  'collapsed:': '[data-state="closed"]',

  // Validity states
  'valid:': '[data-valid]',
  'invalid:': '[data-invalid]',

  // Loading states
  'loading:': '[data-loading]',

  // Progress states
  'complete:': '[data-complete]',
  'incomplete:': '[data-incomplete]',
  'current:': '[data-current]',
  'indeterminate:': '[data-state="indeterminate"]',

  // Placement states (for positioned elements)
  'top:': '[data-placement^="top"]',
  'bottom:': '[data-placement^="bottom"]',
  'left:': '[data-placement^="left"]',
  'right:': '[data-placement^="right"]',

  // Carousel states
  'inview:': '[data-inview]',
  'autoplay:': '[data-autoplay]',

  // File states
  'dragging-over:': '[data-dragging]',
  'accepted:': '[data-accepted]',
  'rejected:': '[data-rejected]',

  // Rating states
  'half:': '[data-half]',

  // Timer states
  'running:': '[data-state="running"]',
  'paused:': '[data-state="paused"]',
}

/**
 * Check if a component name is a Zag primitive
 */
export function isZagPrimitive(name: string): boolean {
  return name in ZAG_PRIMITIVES
}

/**
 * Get Zag primitive definition
 */
export function getZagPrimitive(name: string): ZagPrimitiveDef | undefined {
  return ZAG_PRIMITIVES[name]
}

/**
 * Get slot mappings for a Zag primitive
 */
export function getSlotMappings(primitiveName: string): Record<string, ZagSlotDef> | undefined {
  return SLOT_MAPPINGS[primitiveName]
}

/**
 * Get slot definition for a specific slot
 */
export function getSlotDef(primitiveName: string, slotName: string): ZagSlotDef | undefined {
  return SLOT_MAPPINGS[primitiveName]?.[slotName]
}

/**
 * Check if a name is a valid slot for a Zag primitive
 */
export function isZagSlot(primitiveName: string, slotName: string): boolean {
  const primitive = ZAG_PRIMITIVES[primitiveName]
  return primitive?.slots.includes(slotName) ?? false
}

/**
 * Get CSS selector for a Mirror state
 */
export function getStateSelector(mirrorState: string): string | undefined {
  return STATE_MAPPINGS[mirrorState]
}

/**
 * Get all Zag primitive names
 */
export function getAllZagPrimitives(): string[] {
  return Object.keys(ZAG_PRIMITIVES)
}

/**
 * Get Zag primitives by pattern type
 */
export function getZagPrimitivesByPattern(pattern: ZagPrimitiveDef['pattern']): string[] {
  return Object.entries(ZAG_PRIMITIVES)
    .filter(([_, def]) => def.pattern === pattern)
    .map(([name]) => name)
}

/**
 * Get valid item keywords for a Zag component
 * Returns the component's itemKeywords or ['Item'] as default
 */
export function getItemKeywords(primitiveName: string): string[] {
  const primitive = ZAG_PRIMITIVES[primitiveName]
  return primitive?.itemKeywords ?? ['Item']
}

/**
 * Check if a keyword is a valid item keyword for a Zag component
 */
export function isZagItemKeyword(primitiveName: string, keyword: string): boolean {
  const keywords = getItemKeywords(primitiveName)
  return keywords.includes(keyword)
}
