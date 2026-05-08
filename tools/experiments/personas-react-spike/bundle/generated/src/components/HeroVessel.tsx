import type { ReactNode } from 'react'

export default function HeroVessel({ children }: { children?: ReactNode }) {
  return (
    <div className="bg-yellow pt-14 pr-14 pb-10 pl-14 w-fit max-w-[820px] self-end">{children}</div>
  )
}
