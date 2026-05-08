import LogoMarkN from './LogoMarkN'
import LogoMarkW from './LogoMarkW'
import LogoBar from './LogoBar'
import LogoTextSmall from './LogoTextSmall'
import LogoTextBold from './LogoTextBold'

export default function Logo() {
  return (
    <a href="#top" className="flex flex-row items-center gap-[14px] no-underline">
      <span className="flex flex-row items-baseline">
        <LogoMarkN text="n" />
        <LogoBar />
        <LogoMarkW text="w" />
      </span>
      <span className="flex flex-col gap-[2px]">
        <LogoTextSmall text="Fachhochschule Nordwestschweiz" />
        <LogoTextBold text="Hochschule für Informatik" />
      </span>
    </a>
  )
}
