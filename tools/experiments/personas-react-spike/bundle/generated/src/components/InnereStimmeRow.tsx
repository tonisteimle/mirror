import type { ReactNode } from 'react'

export default function InnereStimmeRow({ children }: { children?: ReactNode }) {
  // hor, gap 64, align top — 280px column on the left, grow on the right.
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 lg:gap-16 items-start">
      {children}
    </div>
  )
}
