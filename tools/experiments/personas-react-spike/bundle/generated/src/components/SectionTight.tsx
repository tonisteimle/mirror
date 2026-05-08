import type { ReactNode } from 'react'

export default function SectionTight({ children }: { children?: ReactNode }) {
  return <section className="w-full pt-8 px-6 pb-6">{children}</section>
}
