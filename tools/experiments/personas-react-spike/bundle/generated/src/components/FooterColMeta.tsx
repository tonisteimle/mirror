import type { ReactNode } from 'react'

export default function FooterColMeta({ children }: { children?: ReactNode }) {
  return <div className="flex flex-col gap-[14px]">{children}</div>
}
