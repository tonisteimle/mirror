import type { ReactNode } from 'react'

export default function PersonaHeaderBand({ children }: { children?: ReactNode }) {
  // bg yellow, top padding 72, bottom padding 64, side padding 24, mar-b 80
  // Negative side margin used in CSS to break out of parent's inner padding —
  // we replicate by giving the band its own full-bleed via negative margins.
  return (
    <header className="bg-yellow w-auto -mx-6 px-6 pt-[72px] pb-16 mb-20 flex flex-col gap-[18px]">
      {children}
    </header>
  )
}
