import type { LibraryComponent } from '../types'

export const AlertDialogComponent: LibraryComponent = {
  name: 'AlertDialog',
  category: 'overlays',
  description: 'A modal confirmation dialog that interrupts the user with important content.',
  slots: [
    {
      name: 'Trigger',
      required: true,
      multiple: false,
      defaultProps: {}
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
      name: 'Cancel',
      required: false,
      multiple: false,
      defaultProps: {
        pad: 8,
        pad_l: 16,
        pad_r: 16,
        bg: '$border',
        rad: 6
      }
    },
    {
      name: 'Action',
      required: false,
      multiple: false,
      defaultProps: {
        pad: 8,
        pad_l: 16,
        pad_r: 16,
        bg: '$error',
        rad: 6
      }
    }
  ],
  defaultStates: ['closed', 'open'],
  actions: ['open', 'close', 'toggle'],
  definitions: `// AlertDialog
AlertDialogTrigger: pad 8 12 bg $error rad 6 hover-bg $error-hover
AlertDialogBackdrop: bg $overlay
AlertDialogContent: ver bg $surface rad 12 pad 24 w 400 gap 16 bor 1 boc $border
AlertDialogTitle: size 18 weight 600
AlertDialogDescription: size 14 col $text-dim
AlertDialogActions: hor gap 12 hor-r
AlertDialogCancel: pad 8 16 bg $border rad 6 hover-bg $border-hover
AlertDialogAction: pad 8 16 bg $error rad 6 hover-bg $error-hover`,
  layoutExample: `AlertDialog
  state closed
  AlertDialogTrigger
    onclick open
    "Delete Account"
  AlertDialogBackdrop
    if open
    onclick close
  AlertDialogContent
    if open
    AlertDialogTitle "Are you sure?"
    AlertDialogDescription "This action cannot be undone."
    AlertDialogActions
      AlertDialogCancel
        onclick close
        "Cancel"
      AlertDialogAction "Delete"`
}
