// `HeroBar as Frame: w 1140, h 14, bg $yellow`
// In the visual reference, the bar spans 93.75 % of available width and
// sits at the bottom of the hero. We approximate with explicit width.
export default function HeroBar() {
  return <div className="w-[1140px] max-w-[93.75%] h-[14px] bg-yellow" />
}
