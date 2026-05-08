import type { ReactNode } from 'react'

export default function PersonaTitleStack({ children }: { children?: ReactNode }) {
  return <div className="grow flex flex-col gap-[6px]">{children}</div>
}
