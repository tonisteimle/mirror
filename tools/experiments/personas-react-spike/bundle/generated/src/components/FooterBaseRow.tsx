import type { ReactNode } from 'react'

export default function FooterBaseRow({ children }: { children?: ReactNode }) {
  return <div className="flex flex-row flex-wrap gap-y-3 gap-x-6 mt-10">{children}</div>
}
