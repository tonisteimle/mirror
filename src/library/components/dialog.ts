import type { LibraryComponent } from '../types'

export const DialogComponent: LibraryComponent = {
  name: 'Dialog',
  category: 'overlays',
  description: 'A modal dialog with overlay, focus management, and accessibility features.',
  slots: [
    {
      name: 'Trigger',
      required: true,
      multiple: false,
      defaultProps: {
        hor: true,
        'align_cross': 'cen',
        gap: 8,
        pad: 12,
        bg: '$primary',
        rad: 6
      }
    },
    {
      name: 'Backdrop',
      required: false,
      multiple: false,
      defaultProps: {
        bg: '$overlay'
      }
    },
    {
      name: 'Content',
      required: true,
      multiple: false,
      defaultProps: {
        ver: true,
        bg: '$surface',
        rad: 12,
        pad: 24,
        w: 400,
        gap: 16
      }
    },
    {
      name: 'Title',
      required: false,
      multiple: false,
      defaultProps: {
        size: 18,
        weight: 600,
        col: '$text'
      }
    },
    {
      name: 'Description',
      required: false,
      multiple: false,
      defaultProps: {
        size: 14,
        col: '$text-dim'
      }
    },
    {
      name: 'Close',
      required: false,
      multiple: false,
      defaultProps: {
        hor: true,
        'align_cross': 'cen',
        gap: 8,
        pad: 8,
        bg: '$border',
        rad: 6
      }
    }
  ],
  defaultStates: ['closed', 'open'],
  actions: ['open', 'close', 'toggle'],
  definitions: `// Dialog Components
DialogTrigger: pad 12 bg $primary rad 6 hover-bg $primary-hover
DialogBackdrop: bg $overlay
DialogContent: ver bg $surface rad 12 pad 24 w 400 gap 16 bor 1 boc $border
DialogTitle: size 18 weight 600
DialogDescription: size 14 col $text-dim
DialogClose: pad 8 12 bg $border rad 6 hover-bg $border-hover`,
  layoutExample: `Dialog
  state closed
  DialogTrigger
    onclick open
    "Open Dialog"
  DialogBackdrop
    if open
    onclick close
  DialogContent
    if open
    DialogTitle "Settings"
    DialogDescription "Configure your preferences"
    DialogClose
      onclick close
      "Close"`
}
