import type { ReactNode } from 'react'

type RitualVariantFrameProps = {
  summary: ReactNode
  primary: ReactNode
  secondary: ReactNode
  footer: ReactNode
}

const PANEL = 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm'

function RitualVariantFrame({ summary, primary, secondary, footer }: RitualVariantFrameProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr]">
      <div className={`${PANEL} lg:sticky lg:top-4 lg:self-start`}>{summary}</div>
      <div className="flex flex-col gap-4">
        <div className={PANEL}>{primary}</div>
        <div className={PANEL}>{secondary}</div>
        <div className={PANEL}>{footer}</div>
      </div>
    </div>
  )
}

export default RitualVariantFrame
