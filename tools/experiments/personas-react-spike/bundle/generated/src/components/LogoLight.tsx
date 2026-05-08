import LogoMarkNLight from './LogoMarkNLight'
import LogoMarkWLight from './LogoMarkWLight'
import LogoBarLight from './LogoBarLight'
import LogoTextSmall from './LogoTextSmall'
import LogoTextBold from './LogoTextBold'

export default function LogoLight() {
  return (
    <span className="flex flex-row items-center gap-[14px]">
      <span className="flex flex-row items-baseline">
        <LogoMarkNLight text="n" />
        <LogoBarLight />
        <LogoMarkWLight text="w" />
      </span>
      <span className="flex flex-col gap-[2px]">
        <LogoTextSmall text="Fachhochschule Nordwestschweiz" light />
        <LogoTextBold text="Hochschule für Informatik" light />
      </span>
    </span>
  )
}
