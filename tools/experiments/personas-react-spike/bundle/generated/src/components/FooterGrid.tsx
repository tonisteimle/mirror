import type { ReactNode } from 'react'

export default function FooterGrid({ children }: { children?: ReactNode }) {
  // grid 3, gap 32 — visual reference: 1col mobile, 2fr/1fr two-col on md+
  return <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8 mt-16 mb-12">{children}</div>
}
