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
        bg: '#3B82F6',
        col: '#FFFFFF',
        rad: 6
      }
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
      name: 'Close',
      required: false,
      multiple: false,
      defaultProps: {
        hor: true,
        'align_cross': 'cen',
        gap: 8,
        pad: 8,
        bg: '#333',
        col: '#FFFFFF',
        rad: 6
      }
    }
  ],
  defaultStates: ['closed', 'open'],
  actions: ['open', 'close', 'toggle'],
  definitions: `// Dialog Components
DialogTrigger: pad 12 bg #3B82F6 col #FFF rad 6 hover-bg #2563EB
DialogOverlay: bg #00000080
DialogContent: ver bg #1E1E1E rad 12 pad 24 w 400 gap 16 bor 1 boc #333
DialogTitle: size 18 weight 600
DialogDescription: size 14 col #A0A0A0
DialogClose: pad 8 12 bg #333 rad 6 hover-bg #444`,
  layoutExample: `Dialog
  state closed
  DialogTrigger
    onclick open
    "Open Dialog"
  DialogOverlay
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
