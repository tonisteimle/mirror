import type { ReactNode } from 'react'

export default function FooterStatusList({ children }: { children?: ReactNode }) {
  return <ul className="flex flex-col gap-[6px] list-none p-0">{children}</ul>
}
