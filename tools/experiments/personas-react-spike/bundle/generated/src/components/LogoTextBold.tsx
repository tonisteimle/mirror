export default function LogoTextBold({ text, light }: { text: string; light?: boolean }) {
  return (
    <span className={`text-[11px] font-bold leading-[1.25] ${light ? 'text-white' : ''}`.trim()}>
      {text}
    </span>
  )
}
