import type { ReactNode } from 'react'

export default function PersonaBlock({ id, children }: { id?: string; children?: ReactNode }) {
  // `w full, pad 0 24 80 24` — the persona article. Top padding 0 because
  // the yellow header band brings its own top padding.
  return (
    <article id={id} className="w-full px-6 pb-20 pt-0">
      {children}
    </article>
  )
}
