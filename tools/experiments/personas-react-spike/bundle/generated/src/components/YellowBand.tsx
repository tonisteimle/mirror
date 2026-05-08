import type { ReactNode } from 'react'

export default function YellowBand({ children }: { children?: ReactNode }) {
  return <div className="bg-yellow w-full pt-[72px] px-6 pb-16">{children}</div>
}
