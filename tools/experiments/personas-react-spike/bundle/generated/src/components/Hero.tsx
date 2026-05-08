import type { ReactNode } from 'react'

// `Hero: pad 96 24 96 24, w full, gap 80`
// Visual reference uses a 3-row grid with the eyebrow on top, vessel middle,
// and hero-bar pinned to the bottom. We replicate via grid-template-rows.
export default function Hero({ children }: { children?: ReactNode }) {
  return (
    <section className="hero relative w-full px-6 py-24 grid gap-20 min-h-[60vh] grid-rows-[auto_1fr_auto]">
      {children}
    </section>
  )
}
