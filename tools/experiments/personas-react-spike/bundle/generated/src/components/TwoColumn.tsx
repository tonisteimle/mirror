import type { ReactNode } from 'react'

// `hor, gap 64, align top` — at narrower viewports the visual reference
// uses a 1fr grid (single column); we replicate that with a media-query
// fallback via Tailwind.
export default function TwoColumn({ children }: { children?: ReactNode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 lg:gap-16 items-start">
      {children}
    </div>
  )
}
