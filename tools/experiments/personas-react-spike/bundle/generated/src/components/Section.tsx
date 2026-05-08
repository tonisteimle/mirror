import type { ReactNode } from 'react'

export default function Section({ children, id }: { children?: ReactNode; id?: string }) {
  return (
    <section id={id} className="w-full px-6 py-24">
      {children}
    </section>
  )
}
