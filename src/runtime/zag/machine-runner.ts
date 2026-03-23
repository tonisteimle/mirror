/**
 * Zag Machine Runner
 *
 * Manages the lifecycle of Zag state machines for Mirror components.
 * Handles creation, starting, stopping, and API access for machines.
 */

// Import all Zag machines
import * as accordion from '@zag-js/accordion'
import * as angleSlider from '@zag-js/angle-slider'
import * as avatar from '@zag-js/avatar'
import * as carousel from '@zag-js/carousel'
import * as checkbox from '@zag-js/checkbox'
import * as clipboard from '@zag-js/clipboard'
import * as collapsible from '@zag-js/collapsible'
import * as combobox from '@zag-js/combobox'
import * as datePicker from '@zag-js/date-picker'
import * as dialog from '@zag-js/dialog'
import * as editable from '@zag-js/editable'
import * as fileUpload from '@zag-js/file-upload'
import * as floatingPanel from '@zag-js/floating-panel'
import * as hoverCard from '@zag-js/hover-card'
import * as menu from '@zag-js/menu'
import * as numberInput from '@zag-js/number-input'
import * as pagination from '@zag-js/pagination'
import * as pinInput from '@zag-js/pin-input'
import * as popover from '@zag-js/popover'
import * as presence from '@zag-js/presence'
import * as progress from '@zag-js/progress'
import * as qrCode from '@zag-js/qr-code'
import * as radioGroup from '@zag-js/radio-group'
import * as ratingGroup from '@zag-js/rating-group'
import * as scrollArea from '@zag-js/scroll-area'
import * as select from '@zag-js/select'
import * as signaturePad from '@zag-js/signature-pad'
import * as slider from '@zag-js/slider'
import * as splitter from '@zag-js/splitter'
import * as steps from '@zag-js/steps'
import * as switchMachine from '@zag-js/switch'
import * as tabs from '@zag-js/tabs'
import * as tagsInput from '@zag-js/tags-input'
import * as timer from '@zag-js/timer'
import * as toast from '@zag-js/toast'
import * as toggleGroup from '@zag-js/toggle-group'
import * as tooltip from '@zag-js/tooltip'
import * as tour from '@zag-js/tour'
import * as treeView from '@zag-js/tree-view'

import type { IRItem } from '../../ir/types'

// Machine types supported by the runner
export const MACHINES = {
  accordion,
  'angle-slider': angleSlider,
  avatar,
  carousel,
  checkbox,
  clipboard,
  collapsible,
  combobox,
  'date-picker': datePicker,
  dialog,
  editable,
  'file-upload': fileUpload,
  'floating-panel': floatingPanel,
  'hover-card': hoverCard,
  menu,
  'number-input': numberInput,
  pagination,
  'pin-input': pinInput,
  popover,
  presence,
  progress,
  'qr-code': qrCode,
  'radio-group': radioGroup,
  'rating-group': ratingGroup,
  'scroll-area': scrollArea,
  select,
  'signature-pad': signaturePad,
  slider,
  splitter,
  steps,
  switch: switchMachine,
  tabs,
  'tags-input': tagsInput,
  timer,
  toast,
  'toggle-group': toggleGroup,
  tooltip,
  tour,
  'tree-view': treeView,
  // Aliases for convenience
  'context-menu': menu,
  'nested-menu': menu,
  'navigation-menu': menu,
  listbox: select,
  'range-slider': slider,
  'circular-progress': progress,
  'password-input': pinInput,
  'date-input': datePicker,
  marquee: progress,
  'segmented-control': toggleGroup,
} as const

export type MachineType = keyof typeof MACHINES

/**
 * Configuration for creating a Zag machine
 */
export interface MachineConfig {
  id: string
  // Common props
  disabled?: boolean
  readOnly?: boolean
  // Form validation props
  invalid?: boolean
  required?: boolean
  name?: string
  // Select/Combobox props
  placeholder?: string
  multiple?: boolean
  searchable?: boolean
  clearable?: boolean
  value?: string | string[]
  defaultValue?: string | string[]
  items?: IRItem[]
  loopFocus?: boolean
  deselectable?: boolean
  // Slider props
  min?: number
  max?: number
  step?: number
  origin?: 'start' | 'center'
  // Progress props
  // Accordion/Collapsible props
  collapsible?: boolean
  // Tabs props
  orientation?: 'horizontal' | 'vertical'
  activationMode?: 'automatic' | 'manual'
  // Dialog/Popover props
  modal?: boolean
  closeOnOutsideClick?: boolean
  closeOnEscape?: boolean
  trapFocus?: boolean
  restoreFocus?: boolean
  preventScroll?: boolean
  // Tooltip props
  interactive?: boolean
  closeOnScroll?: boolean
  closeOnClick?: boolean
  openDelay?: number
  closeDelay?: number
  // Toast props
  duration?: number
  placement?: string
  // Tour props
  steps?: any[]
  // Carousel props
  loop?: boolean
  autoplay?: boolean | number
  slidesPerView?: number
  // File upload props
  accept?: string
  maxFiles?: number
  // Timer props
  autoStart?: boolean
  countdown?: boolean
  startMs?: number
  // QR Code props
  encoding?: string
  // Callbacks
  onValueChange?: (details: any) => void
  onOpenChange?: (details: { open: boolean }) => void
  onStepChange?: (details: any) => void
  onChange?: (details: any) => void
}

/**
 * Subscription callback for machine state changes
 */
export type MachineSubscriber = (api: any) => void

/**
 * Machine instance tracking
 */
interface MachineInstance {
  type: MachineType
  config: MachineConfig
  service: any
  api: any
  cleanup?: () => void
}

/**
 * Manages Zag machine instances
 */
export class MachineRunner {
  private instances = new Map<string, MachineInstance>()
  private subscribers = new Map<string, Set<MachineSubscriber>>()

  /**
   * Create a new machine instance
   *
   * @param type Machine type (e.g., 'select', 'accordion')
   * @param config Machine configuration
   * @returns The machine instance or null
   */
  create(type: MachineType, config: MachineConfig): MachineInstance | null {
    // Clean up existing machine with same ID to prevent state leaks
    if (this.instances.has(config.id)) {
      this.stop(config.id)
    }

    const machine = MACHINES[type]
    if (!machine) {
      console.warn(`Unknown machine type: ${type}`)
      return null
    }

    // Create machine-specific props
    const props = this.createMachineProps(type, config)

    // Create instance tracking
    const instance: MachineInstance = {
      type,
      config,
      service: null,
      api: null,
    }

    this.instances.set(config.id, instance)

    return instance
  }

  /**
   * Create machine-specific props based on type
   */
  private createMachineProps(type: MachineType, config: MachineConfig): any {
    const baseProps: any = {
      id: config.id,
      disabled: config.disabled,
      readOnly: config.readOnly,
      invalid: config.invalid,
      required: config.required,
      name: config.name,
    }

    switch (type) {
      case 'select':
      case 'combobox':
      case 'listbox': {
        const items = config.items ?? []
        const collectionItems = items.map((item) => ({
          value: item.value,
          label: item.label,
          disabled: item.disabled,
        }))

        const itemCollection = select.collection({
          items: collectionItems,
          itemToString: (item) => item.label,
          itemToValue: (item) => item.value,
        })

        return {
          ...baseProps,
          collection: itemCollection,
          loopFocus: config.loopFocus,
          deselectable: config.deselectable,
          onValueChange: config.onValueChange,
          onOpenChange: config.onOpenChange,
        }
      }

      case 'menu':
      case 'context-menu':
      case 'nested-menu':
      case 'navigation-menu':
        return {
          ...baseProps,
          loopFocus: config.loopFocus,
          onOpenChange: config.onOpenChange,
        }

      case 'accordion':
        return {
          ...baseProps,
          collapsible: config.collapsible ?? true,
          multiple: config.multiple,
          onValueChange: config.onValueChange,
        }

      case 'tabs':
        return {
          ...baseProps,
          orientation: config.orientation,
          activationMode: config.activationMode,
          loopFocus: config.loopFocus,
          deselectable: config.deselectable,
          onValueChange: config.onValueChange,
        }

      case 'slider':
      case 'range-slider':
        return {
          ...baseProps,
          min: config.min ?? 0,
          max: config.max ?? 100,
          step: config.step ?? 1,
          origin: config.origin,
          onValueChange: config.onValueChange,
        }

      case 'angle-slider':
        return {
          ...baseProps,
          step: config.step ?? 1,
          onValueChange: config.onValueChange,
        }

      case 'checkbox':
      case 'switch':
        return {
          ...baseProps,
          onCheckedChange: config.onValueChange,
        }

      case 'radio-group':
        return {
          ...baseProps,
          orientation: config.orientation,
          onValueChange: config.onValueChange,
        }

      case 'toggle-group':
      case 'segmented-control':
        return {
          ...baseProps,
          loopFocus: config.loopFocus,
          orientation: config.orientation,
          onValueChange: config.onValueChange,
        }

      case 'dialog':
        return {
          ...baseProps,
          modal: config.modal ?? true,
          closeOnOutsideClick: config.closeOnOutsideClick ?? true,
          closeOnEscape: config.closeOnEscape ?? true,
          trapFocus: config.trapFocus ?? true,
          restoreFocus: config.restoreFocus ?? true,
          preventScroll: config.preventScroll ?? true,
          onOpenChange: config.onOpenChange,
        }

      case 'popover':
        return {
          ...baseProps,
          modal: config.modal,
          closeOnOutsideClick: config.closeOnOutsideClick ?? true,
          closeOnEscape: config.closeOnEscape ?? true,
          trapFocus: config.trapFocus,
          restoreFocus: config.restoreFocus ?? true,
          onOpenChange: config.onOpenChange,
        }

      case 'tooltip':
        return {
          ...baseProps,
          openDelay: config.openDelay,
          closeDelay: config.closeDelay,
          closeOnClick: config.closeOnClick ?? true,
          interactive: config.interactive,
          closeOnScroll: config.closeOnScroll ?? true,
          onOpenChange: config.onOpenChange,
        }

      case 'hover-card':
        return {
          ...baseProps,
          openDelay: config.openDelay ?? 700,
          closeDelay: config.closeDelay ?? 300,
          onOpenChange: config.onOpenChange,
        }

      case 'collapsible':
        return {
          ...baseProps,
          onOpenChange: config.onOpenChange,
        }

      case 'progress':
      case 'circular-progress':
        return {
          ...baseProps,
          value: config.value ?? 0,
          max: config.max ?? 100,
        }

      case 'number-input':
        return {
          ...baseProps,
          min: config.min,
          max: config.max,
          step: config.step ?? 1,
          onValueChange: config.onValueChange,
        }

      case 'pin-input':
      case 'password-input':
        return {
          ...baseProps,
          onValueChange: config.onValueChange,
        }

      case 'tags-input':
        return {
          ...baseProps,
          onValueChange: config.onValueChange,
        }

      case 'rating-group':
        return {
          ...baseProps,
          count: config.max ?? 5,
          onValueChange: config.onValueChange,
        }

      case 'date-picker':
      case 'date-input':
        return {
          ...baseProps,
          onValueChange: config.onValueChange,
        }

      case 'carousel':
        return {
          ...baseProps,
          loop: config.loop,
          slidesPerView: config.slidesPerView ?? 1,
          onIndexChange: config.onValueChange,
        }

      case 'steps':
        return {
          ...baseProps,
          onStepChange: config.onStepChange,
        }

      case 'pagination':
        return {
          ...baseProps,
          count: config.max ?? 100,
          pageSize: config.step ?? 10,
          onPageChange: config.onValueChange,
        }

      case 'tree-view':
        return {
          ...baseProps,
          onSelectionChange: config.onValueChange,
        }

      case 'tour':
        return {
          ...baseProps,
          steps: config.steps ?? [],
          onStepChange: config.onStepChange,
        }

      case 'timer':
        return {
          ...baseProps,
          autoStart: config.autoStart,
          countdown: config.countdown,
          startMs: config.startMs,
        }

      case 'file-upload':
        return {
          ...baseProps,
          accept: config.accept,
          maxFiles: config.maxFiles,
          onFileChange: config.onValueChange,
        }

      case 'clipboard':
        return {
          ...baseProps,
          value: config.value,
          onStatusChange: config.onChange,
        }

      case 'qr-code':
        return {
          ...baseProps,
          value: config.value ?? '',
          encoding: config.encoding,
        }

      case 'splitter':
        return {
          ...baseProps,
          orientation: config.orientation ?? 'horizontal',
          onSizeChange: config.onValueChange,
        }

      case 'floating-panel':
        return {
          ...baseProps,
          onOpenChange: config.onOpenChange,
        }

      case 'editable':
        return {
          ...baseProps,
          onValueChange: config.onValueChange,
        }

      case 'signature-pad':
        return {
          ...baseProps,
          onDrawEnd: config.onChange,
        }

      case 'avatar':
        return {
          ...baseProps,
        }

      case 'presence':
        return {
          ...baseProps,
          present: true,
        }

      case 'toast':
        return {
          ...baseProps,
          duration: config.duration ?? 5000,
          placement: config.placement ?? 'bottom-end',
        }

      case 'scroll-area':
        return {
          ...baseProps,
        }

      default:
        return baseProps
    }
  }

  /**
   * Start a machine
   *
   * @param id Machine ID
   */
  start(id: string): void {
    const instance = this.instances.get(id)
    if (!instance) {
      console.warn(`Machine not found: ${id}`)
      return
    }

    // Create mock API for rendering
    instance.api = this.createMockApi(instance)

    // Notify subscribers
    this.notifySubscribers(id, instance.api)
  }

  /**
   * Notify all subscribers of state change
   */
  private notifySubscribers(id: string, api: any): void {
    const subs = this.subscribers.get(id)
    if (!subs) return

    for (const callback of [...subs]) {
      try {
        callback(api)
      } catch (e) {
        console.warn(`Subscriber error for machine ${id}:`, e)
      }
    }
  }

  /**
   * Create a mock API for development
   *
   * This allows the UI to render while we finalize the Zag integration.
   */
  private createMockApi(instance: MachineInstance): any {
    const id = instance.config.id
    const type = instance.type
    const items = instance.config.items ?? []

    // Common props generator
    const createProps = (part: string, extra: Record<string, any> = {}) => ({
      id: `${id}-${part}`,
      'data-scope': type,
      'data-part': part,
      ...extra,
    })

    // Base API with common methods
    const baseApi = {
      getRootProps: () => createProps('root'),
      getLabelProps: () => createProps('label'),
      getControlProps: () => createProps('control'),
      getInputProps: () => createProps('input'),
      getTriggerProps: () => createProps('trigger', {
        'aria-haspopup': 'true',
        'aria-expanded': false,
      }),
      getContentProps: () => createProps('content', { hidden: true }),
      getItemProps: (opts: { item?: { value: string }, value?: string }) => {
        const value = opts.item?.value ?? opts.value ?? ''
        return createProps('item', { 'data-value': value })
      },
      getIndicatorProps: () => createProps('indicator'),
    }

    // Type-specific API extensions
    switch (type) {
      case 'select':
      case 'combobox':
      case 'listbox':
        return {
          ...baseApi,
          open: false,
          value: [],
          highlightedValue: null,
          getItemTextProps: (opts: any) => createProps('item-text'),
          getItemIndicatorProps: (opts: any) => createProps('item-indicator'),
          getClearTriggerProps: () => createProps('clear-trigger'),
        }

      case 'menu':
      case 'context-menu':
      case 'nested-menu':
        return {
          ...baseApi,
          open: false,
          getContextTriggerProps: () => createProps('context-trigger'),
          getSeparatorProps: () => createProps('separator'),
          getArrowProps: () => createProps('arrow'),
        }

      case 'accordion':
        return {
          ...baseApi,
          value: [],
          getItemProps: (opts: { value: string }) => createProps('item', { 'data-value': opts.value }),
          getItemTriggerProps: (opts: { value: string }) => createProps('item-trigger', { 'data-value': opts.value }),
          getItemContentProps: (opts: { value: string }) => createProps('item-content', { 'data-value': opts.value, hidden: true }),
          getItemIndicatorProps: (opts: { value: string }) => createProps('item-indicator'),
        }

      case 'tabs':
        return {
          ...baseApi,
          value: null,
          getListProps: () => createProps('list', { role: 'tablist' }),
          getTriggerProps: (opts: { value: string }) => createProps('trigger', {
            'data-value': opts.value,
            role: 'tab',
            'aria-selected': false,
          }),
          getContentProps: (opts: { value: string }) => createProps('content', {
            'data-value': opts.value,
            role: 'tabpanel',
            hidden: true,
          }),
        }

      case 'slider':
      case 'range-slider':
        return {
          ...baseApi,
          value: [50],
          getTrackProps: () => createProps('track'),
          getRangeProps: () => createProps('range'),
          getThumbProps: (opts?: { index?: number }) => createProps('thumb', { 'data-index': opts?.index ?? 0 }),
          getValueTextProps: () => createProps('value-text'),
        }

      case 'checkbox':
        return {
          ...baseApi,
          checked: false,
          getHiddenInputProps: () => createProps('hidden-input', { type: 'checkbox' }),
        }

      case 'switch':
        return {
          ...baseApi,
          checked: false,
          getTrackProps: () => createProps('track'),
          getThumbProps: () => createProps('thumb'),
          getHiddenInputProps: () => createProps('hidden-input', { type: 'checkbox' }),
        }

      case 'radio-group':
        return {
          ...baseApi,
          value: null,
          getItemProps: (opts: { value: string }) => createProps('item', { 'data-value': opts.value }),
          getItemTextProps: (opts: { value: string }) => createProps('item-text'),
          getItemControlProps: (opts: { value: string }) => createProps('item-control'),
          getItemHiddenInputProps: (opts: { value: string }) => createProps('item-hidden-input', { type: 'radio' }),
        }

      case 'dialog':
        return {
          ...baseApi,
          open: false,
          getBackdropProps: () => createProps('backdrop'),
          getTitleProps: () => createProps('title'),
          getDescriptionProps: () => createProps('description'),
          getCloseTriggerProps: () => createProps('close-trigger'),
          getPositionerProps: () => createProps('positioner'),
        }

      case 'tooltip':
      case 'popover':
      case 'hover-card':
        return {
          ...baseApi,
          open: false,
          getPositionerProps: () => createProps('positioner'),
          getArrowProps: () => createProps('arrow'),
          getArrowTipProps: () => createProps('arrow-tip'),
        }

      case 'progress':
      case 'circular-progress':
        return {
          ...baseApi,
          value: 0,
          percent: 0,
          getTrackProps: () => createProps('track'),
          getRangeProps: () => createProps('range'),
          getCircleProps: () => createProps('circle'),
          getCircleTrackProps: () => createProps('circle-track'),
          getCircleRangeProps: () => createProps('circle-range'),
          getValueTextProps: () => createProps('value-text'),
        }

      case 'collapsible':
        return {
          ...baseApi,
          open: false,
        }

      case 'steps':
        return {
          ...baseApi,
          value: 0,
          getListProps: () => createProps('list'),
          getItemProps: (opts: { index: number }) => createProps('item', { 'data-index': opts.index }),
          getSeparatorProps: (opts: { index: number }) => createProps('separator'),
          getPrevTriggerProps: () => createProps('prev-trigger'),
          getNextTriggerProps: () => createProps('next-trigger'),
          getProgressProps: () => createProps('progress'),
        }

      case 'pagination':
        return {
          ...baseApi,
          page: 1,
          totalPages: 10,
          getPrevTriggerProps: () => createProps('prev-trigger'),
          getNextTriggerProps: () => createProps('next-trigger'),
          getItemProps: (opts: { value: number }) => createProps('item', { 'data-value': opts.value }),
          getEllipsisProps: () => createProps('ellipsis'),
        }

      case 'tree-view':
        return {
          ...baseApi,
          getBranchProps: (opts: { value: string }) => createProps('branch', { 'data-value': opts.value }),
          getBranchTriggerProps: (opts: { value: string }) => createProps('branch-trigger'),
          getBranchContentProps: (opts: { value: string }) => createProps('branch-content'),
          getBranchIndicatorProps: (opts: { value: string }) => createProps('branch-indicator'),
          getItemTextProps: (opts: { value: string }) => createProps('item-text'),
        }

      case 'carousel':
        return {
          ...baseApi,
          index: 0,
          getItemGroupProps: () => createProps('item-group'),
          getItemProps: (opts: { index: number }) => createProps('item', { 'data-index': opts.index }),
          getPrevTriggerProps: () => createProps('prev-trigger'),
          getNextTriggerProps: () => createProps('next-trigger'),
          getIndicatorGroupProps: () => createProps('indicator-group'),
          getIndicatorProps: (opts: { index: number }) => createProps('indicator', { 'data-index': opts.index }),
        }

      case 'number-input':
        return {
          ...baseApi,
          value: 0,
          getIncrementTriggerProps: () => createProps('increment-trigger'),
          getDecrementTriggerProps: () => createProps('decrement-trigger'),
          getScrubberProps: () => createProps('scrubber'),
        }

      case 'pin-input':
        return {
          ...baseApi,
          value: [],
          getInputProps: (opts: { index: number }) => createProps('input', { 'data-index': opts.index }),
          getHiddenInputProps: () => createProps('hidden-input'),
        }

      case 'tags-input':
        return {
          ...baseApi,
          value: [],
          getTagProps: (opts: { value: string; index: number }) => createProps('tag', { 'data-value': opts.value }),
          getTagTextProps: (opts: { value: string }) => createProps('tag-text'),
          getTagDeleteTriggerProps: (opts: { value: string }) => createProps('tag-delete-trigger'),
          getClearTriggerProps: () => createProps('clear-trigger'),
        }

      case 'rating-group':
        return {
          ...baseApi,
          value: 0,
          getItemProps: (opts: { index: number }) => createProps('item', { 'data-index': opts.index }),
          getHiddenInputProps: () => createProps('hidden-input'),
        }

      case 'toggle-group':
      case 'segmented-control':
        return {
          ...baseApi,
          value: [],
          getItemProps: (opts: { value: string }) => createProps('item', { 'data-value': opts.value }),
          getItemTextProps: (opts: { value: string }) => createProps('item-text'),
          getItemHiddenInputProps: (opts: { value: string }) => createProps('item-hidden-input'),
        }

      case 'date-picker':
        return {
          ...baseApi,
          value: null,
          getPositionerProps: () => createProps('positioner'),
          getViewControlProps: () => createProps('view-control'),
          getPrevTriggerProps: () => createProps('prev-trigger'),
          getNextTriggerProps: () => createProps('next-trigger'),
          getViewTriggerProps: () => createProps('view-trigger'),
          getTableProps: () => createProps('table'),
          getTableHeadProps: () => createProps('table-head'),
          getTableBodyProps: () => createProps('table-body'),
          getTableRowProps: () => createProps('table-row'),
          getTableHeaderProps: () => createProps('table-header'),
          getTableCellProps: (opts: { value: any }) => createProps('table-cell'),
          getTableCellTriggerProps: (opts: { value: any }) => createProps('table-cell-trigger'),
          getClearTriggerProps: () => createProps('clear-trigger'),
        }

      case 'timer':
        return {
          ...baseApi,
          time: { hours: 0, minutes: 0, seconds: 0 },
          getSegmentProps: (opts: { type: string }) => createProps('segment', { 'data-type': opts.type }),
          getSeparatorProps: () => createProps('separator'),
          getActionTriggerProps: (opts: { action: string }) => createProps('action-trigger', { 'data-action': opts.action }),
        }

      case 'file-upload':
        return {
          ...baseApi,
          files: [],
          getDropzoneProps: () => createProps('dropzone'),
          getItemGroupProps: () => createProps('item-group'),
          getItemProps: (opts: { file: File }) => createProps('item'),
          getItemNameProps: (opts: { file: File }) => createProps('item-name'),
          getItemSizeProps: (opts: { file: File }) => createProps('item-size'),
          getItemDeleteTriggerProps: (opts: { file: File }) => createProps('item-delete-trigger'),
          getHiddenInputProps: () => createProps('hidden-input', { type: 'file' }),
        }

      case 'clipboard':
        return {
          ...baseApi,
          copied: false,
        }

      case 'qr-code':
        return {
          ...baseApi,
          getFrameProps: () => createProps('frame'),
          getPatternProps: () => createProps('pattern'),
          getOverlayProps: () => createProps('overlay'),
        }

      case 'splitter':
        return {
          ...baseApi,
          getPanelProps: (opts: { id: string }) => createProps('panel', { 'data-panel-id': opts.id }),
          getResizeTriggerProps: (opts: { id: string }) => createProps('resize-trigger'),
        }

      case 'floating-panel':
        return {
          ...baseApi,
          open: false,
          getHeaderProps: () => createProps('header'),
          getBodyProps: () => createProps('body'),
          getDragTriggerProps: () => createProps('drag-trigger'),
          getResizeTriggerProps: () => createProps('resize-trigger'),
          getCloseTriggerProps: () => createProps('close-trigger'),
        }

      case 'tour':
        return {
          ...baseApi,
          step: 0,
          getBackdropProps: () => createProps('backdrop'),
          getSpotlightProps: () => createProps('spotlight'),
          getPositionerProps: () => createProps('positioner'),
          getTitleProps: () => createProps('title'),
          getDescriptionProps: () => createProps('description'),
          getArrowProps: () => createProps('arrow'),
          getPrevTriggerProps: () => createProps('prev-trigger'),
          getNextTriggerProps: () => createProps('next-trigger'),
          getCloseTriggerProps: () => createProps('close-trigger'),
          getProgressTextProps: () => createProps('progress-text'),
        }

      case 'editable':
        return {
          ...baseApi,
          editing: false,
          value: '',
          getAreaProps: () => createProps('area'),
          getPreviewProps: () => createProps('preview'),
          getEditTriggerProps: () => createProps('edit-trigger'),
          getSubmitTriggerProps: () => createProps('submit-trigger'),
          getCancelTriggerProps: () => createProps('cancel-trigger'),
        }

      case 'signature-pad':
        return {
          ...baseApi,
          isEmpty: true,
          getSegmentProps: () => createProps('segment'),
          getSegmentPathProps: () => createProps('segment-path'),
          getGuideProps: () => createProps('guide'),
          getClearTriggerProps: () => createProps('clear-trigger'),
          getHiddenInputProps: () => createProps('hidden-input'),
        }

      case 'avatar':
        return {
          ...baseApi,
          getImageProps: () => createProps('image'),
          getFallbackProps: () => createProps('fallback'),
        }

      case 'presence':
        return {
          ...baseApi,
          present: true,
        }

      case 'toast':
        return {
          ...baseApi,
          getTitleProps: () => createProps('title'),
          getDescriptionProps: () => createProps('description'),
          getCloseTriggerProps: () => createProps('close-trigger'),
          getActionTriggerProps: () => createProps('action-trigger'),
        }

      case 'scroll-area':
        return {
          ...baseApi,
          getViewportProps: () => createProps('viewport'),
          getScrollbarProps: (opts: { orientation: string }) => createProps('scrollbar', { 'data-orientation': opts.orientation }),
          getThumbProps: (opts: { orientation: string }) => createProps('thumb'),
        }

      case 'angle-slider':
        return {
          ...baseApi,
          value: 0,
          getThumbProps: () => createProps('thumb'),
          getValueTextProps: () => createProps('value-text'),
          getMarkerGroupProps: () => createProps('marker-group'),
          getMarkerProps: (opts: { value: number }) => createProps('marker', { 'data-value': opts.value }),
        }

      default:
        return baseApi
    }
  }

  /**
   * Stop a machine
   */
  stop(id: string): void {
    const instance = this.instances.get(id)
    if (instance?.cleanup) {
      instance.cleanup()
    }

    this.instances.delete(id)
    this.subscribers.delete(id)
  }

  /**
   * Get the API for a machine
   */
  getApi(id: string): any | undefined {
    return this.instances.get(id)?.api
  }

  /**
   * Subscribe to machine state changes
   */
  subscribe(id: string, callback: MachineSubscriber): () => void {
    if (!this.subscribers.has(id)) {
      this.subscribers.set(id, new Set())
    }

    this.subscribers.get(id)!.add(callback)

    // Immediately call with current API if available
    const instance = this.instances.get(id)
    if (instance?.api) {
      callback(instance.api)
    }

    return () => {
      this.subscribers.get(id)?.delete(callback)
    }
  }

  /**
   * Stop all machines
   */
  stopAll(): void {
    for (const id of this.instances.keys()) {
      this.stop(id)
    }
  }

  /**
   * Check if a machine is running
   */
  isRunning(id: string): boolean {
    return this.instances.has(id)
  }
}

/**
 * Create a new MachineRunner instance
 */
export function createMachineRunner(): MachineRunner {
  return new MachineRunner()
}
