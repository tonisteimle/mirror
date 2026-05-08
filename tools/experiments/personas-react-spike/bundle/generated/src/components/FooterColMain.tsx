import type { ReactNode } from 'react'

export default function FooterColMain({ children }: { children?: ReactNode }) {
  return <div className="flex flex-col gap-[14px]">{children}</div>
}
