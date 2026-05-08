import type { ReactNode } from 'react'

export default function PersonaHeaderRow({ children }: { children?: ReactNode }) {
  // hor, gap 56, align bottom — at narrow viewports stacks vertically.
  return (
    <div className="flex flex-col md:flex-row gap-7 md:gap-14 items-stretch md:items-end">
      {children}
    </div>
  )
}
