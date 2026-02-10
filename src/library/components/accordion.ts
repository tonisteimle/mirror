import type { LibraryComponent } from '../types'

export const AccordionComponent: LibraryComponent = {
  name: 'Accordion',
  category: 'navigation',
  description: 'A vertically stacked set of interactive headings that reveal content sections.',
  slots: [
    {
      name: 'Item',
      required: true,
      multiple: true,
      defaultProps: {
        ver: true,
        bor_d: 1,
        boc: '#333'
      }
    },
    {
      name: 'Trigger',
      required: true,
      multiple: false,
      defaultProps: {
        hor: true,
        'align_main': 'between',
        'align_cross': 'cen',
        pad: 16,
        'hover-bg': '#252525'
      }
    },
    {
      name: 'Content',
      required: true,
      multiple: false,
      defaultProps: {
        pad: 16,
        pad_u: 0
      }
    }
  ],
  defaultStates: ['collapsed', 'expanded'],
  actions: ['open', 'close', 'toggle'],
  definitions: `// Accordion
AccordionItem: ver bor d 1 boc #333
AccordionTrigger: hor between ver-cen pad 16 hover-bg #252525
AccordionContent: pad 16`,
  layoutExample: `Accordion
  AccordionItem
    state closed
    AccordionTrigger
      onclick toggle
      "Question 1?"
      icon "chevron-down"
    AccordionContent
      if open
      "Answer to question 1"
  AccordionItem
    state closed
    AccordionTrigger
      onclick toggle
      "Question 2?"
      icon "chevron-down"
    AccordionContent
      if open
      "Answer to question 2"`
}
