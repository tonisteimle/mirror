import type { ReactNode } from 'react'

export default function DimGrid({ children }: { children?: ReactNode }) {
  // grid 4, gap 32 64 — visual reference: 1col on mobile, 2col on md, 4col on xl.
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-y-12 gap-x-16">
      {children}
    </div>
  )
}
