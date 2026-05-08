import type { ReactNode } from 'react'

export default function SectionWide({ children, id }: { children?: ReactNode; id?: string }) {
  return (
    <section id={id} className="w-full px-6 py-28">
      {children}
    </section>
  )
}
