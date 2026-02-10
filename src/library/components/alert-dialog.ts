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
      name: 'Overlay',
      required: false,
      multiple: false,
      defaultProps: {
        bg: '#00000080'
      }
    },
    {
      name: 'Content',
      required: true,
      multiple: false,
      defaultProps: {
        ver: true,
        bg: '#1E1E1E',
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
        col: '#FFFFFF'
      }
    },
    {
      name: 'Description',
      required: false,
      multiple: false,
      defaultProps: {
        size: 14,
        col: '#A0A0A0'
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
        bg: '#333',
        col: '#FFF',
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
        bg: '#EF4444',
        col: '#FFF',
        rad: 6
      }
    }
  ],
  defaultStates: ['closed', 'open'],
  actions: ['open', 'close', 'toggle'],
  definitions: `// AlertDialog
AlertDialogTrigger: pad 8 12 bg #EF4444 col #FFF rad 6 hover-bg #DC2626
AlertDialogOverlay: bg #00000080
AlertDialogContent: ver bg #1E1E1E rad 12 pad 24 w 400 gap 16 bor 1 boc #333
AlertDialogTitle: size 18 weight 600
AlertDialogDescription: size 14 col #A0A0A0
AlertDialogActions: hor gap 12 hor-r
AlertDialogCancel: pad 8 16 bg #333 rad 6 hover-bg #444
AlertDialogAction: pad 8 16 bg #EF4444 col #FFF rad 6 hover-bg #DC2626`,
  layoutExample: `AlertDialog
  state closed
  AlertDialogTrigger
    onclick open
    "Delete Account"
  AlertDialogOverlay
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
