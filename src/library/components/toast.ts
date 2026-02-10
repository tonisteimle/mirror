import type { LibraryComponent } from '../types'

export const ToastComponent: LibraryComponent = {
  name: 'Toast',
  category: 'feedback',
  description: 'A brief notification that appears temporarily.',
  slots: [
    {
      name: 'Title',
      required: false,
      multiple: false,
      defaultProps: {
        weight: 600,
        size: 14
      }
    },
    {
      name: 'Description',
      required: false,
      multiple: false,
      defaultProps: {
        size: 13,
        col: '#A0A0A0'
      }
    },
    {
      name: 'Action',
      required: false,
      multiple: false,
      defaultProps: {
        pad: 4,
        pad_l: 8,
        pad_r: 8,
        bg: '#333',
        rad: 4,
        size: 12
      }
    },
    {
      name: 'Close',
      required: false,
      multiple: false,
      defaultProps: {}
    }
  ],
  defaultStates: ['hidden', 'visible'],
  actions: ['show', 'hide'],
  definitions: `// Toast
Toast: hor bg #1E1E1E rad 8 pad 16 gap 16 ver-cen between w 360 bor 1 boc #333
ToastContent: ver gap 4
ToastTitle: weight 600 size 14
ToastDescription: size 13 col #A0A0A0
ToastAction: pad 4 8 bg #333 rad 4 size 12 hover-bg #444
ToastClose: pad 4 hover-bg #333 rad 4`,
  layoutExample: `Toast
  state hidden
  if visible
  ToastContent
    ToastTitle "Success!"
    ToastDescription "Your changes have been saved."
  ToastAction "Undo"
  ToastClose
    onclick hide
    icon "x" col #888`
}
