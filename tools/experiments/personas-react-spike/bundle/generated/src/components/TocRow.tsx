import type { ReactNode } from 'react'

export default function TocRow({ href, children }: { href?: string; children?: ReactNode }) {
  return (
    <li>
      <a
        href={href}
        className="toc-row grid grid-cols-[80px_1fr_auto] gap-14 items-baseline px-2 py-4 no-underline transition-colors duration-100"
      >
        {children}
      </a>
    </li>
  )
}
